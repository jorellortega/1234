import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";

export async function POST(req: Request) {
  const body = await req.json();
  const { prompt = "", mode = "gpt", temperature = 0.7, max_tokens = 512, response_style = "detailed", image } = body;
  const m = String(mode).toLowerCase();

  // Handle vision models with Ollama, other non-Ollama modes → simple SSE stub
  if (m === "blip" || m === "llava") {
    // Vision models - call Ollama directly
    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        const send = (s: string) => controller.enqueue(enc.encode(`data: ${s}\n\n`));
        
        try {
          if (!image) {
            const errorMsg = m === "blip" 
              ? "[BLIP] Please upload an image first. BLIP is a vision-language model that can analyze images and answer questions about visual content."
              : "[LLaVA] Please upload an image first. LLaVA is a multimodal model that can have natural conversations about visual content.";
            send(errorMsg);
            controller.close();
            return;
          }
          
          const visionPrompt = prompt ? `Question: ${prompt}\n\nPlease analyze this image and provide a ${response_style} response.` : `Please describe this image in a ${response_style} manner.`;
          const modelName = m === "blip" ? "bakllava:latest" : "llava:latest";
          
          // Call Ollama with vision model
          const ollamaResponse = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: modelName,
              prompt: visionPrompt,
              images: [image.replace(/^data:image\/[a-z]+;base64,/, '')], // Remove data URL prefix, keep only base64
              stream: true,
              options: { temperature, num_predict: max_tokens }
            }),
          });
          
          if (!ollamaResponse.ok || !ollamaResponse.body) {
            throw new Error(`Ollama vision model error ${ollamaResponse.status}`);
          }
          
          const reader = ollamaResponse.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          const hb = setInterval(() => controller.enqueue(enc.encode(":hb\n\n")), 15000);
          
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n"); buf = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const j = JSON.parse(line);
                if (j?.response) send(j.response);
                if (j?.done) { clearInterval(hb); controller.close(); return; }
              } catch { /* ignore partials */ }
            }
          }
          controller.close();
        } catch (error: any) {
          const errorMsg = `[${m.toUpperCase()} Error] Failed to process image: ${error.message}. Please try again.`;
          send(errorMsg);
          controller.close();
        }
      },
    });
    
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store",
        "Connection": "keep-alive",
      },
    });
  } else if (m === "openai") {
    // OpenAI streaming
    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        const send = (s: string) => controller.enqueue(enc.encode(`data: ${s}\n\n`));
        
        try {
          // Get OpenAI API key from the database
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseUrl = process.env.SUPABASE_URL;
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          
          if (!supabaseUrl || !supabaseKey) {
            send(`[AiO Error] Database not configured. Please check your Supabase setup.`);
            controller.close();
            return;
          }
          
          const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
          
          // Get OpenAI API key - first try system-wide key, then user-specific key
          let apiKey = null;
          
          // First, try to get system-wide key
          const { data: systemApiKey, error: systemError } = await supabase
            .from('api_keys')
            .select('encrypted_key')
            .is('user_id', null)
            .eq('service_id', 'openai')
            .eq('is_active', true)
            .maybeSingle();

          if (systemApiKey && !systemError) {
            apiKey = systemApiKey;
          } else {
            // If no system key, try user-specific key (if user is authenticated)
            const authHeader = req.headers.get('authorization');
            if (authHeader) {
              const token = authHeader.replace('Bearer ', '');
              const { createClient: createAnonClient } = await import('@supabase/supabase-js');
              const supabaseAnon = createAnonClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
              );
              
              const { data: { user } } = await supabaseAnon.auth.getUser(token);
              if (user) {
                const { data: userApiKey, error: userError } = await supabase
                  .from('api_keys')
                  .select('encrypted_key')
                  .eq('user_id', user.id)
                  .eq('service_id', 'openai')
                  .eq('is_active', true)
                  .maybeSingle();

                if (userApiKey && !userError) {
                  apiKey = userApiKey;
                }
              }
            }
          }
          
          if (!apiKey) {
            send(`[AiO Error] OpenAI API key not found. Please add your OpenAI API key in the AI Settings page or contact admin to set system-wide key.`);
            controller.close();
            return;
          }
          
          const openaiApiKey = apiKey.encrypted_key;
          
                          // Check if user wants an image (look for specific image-related keywords)
                // Only trigger if the prompt is not too long (to avoid document text triggering DALL-E)
                const imageKeywords = ['image', 'picture', 'photo', 'draw', 'generate image', 'create image', 'show me an image', 'visualize as image'];
                const wantsImage = prompt.length < 500 && imageKeywords.some(keyword => 
                  prompt.toLowerCase().includes(keyword.toLowerCase())
                );
          
          if (wantsImage) {
            // Use DALL-E for image generation (non-streaming response)
            try {
              // Extract just the user's image request from the enhanced prompt
              // Look for "Question: <image request>" pattern and extract the question part
              let imagePrompt = prompt;
              const questionMatch = prompt.match(/Question:\s*(.+?)(?:\n|$)/);
              if (questionMatch && questionMatch[1]) {
                imagePrompt = questionMatch[1].trim();
              }
              
              console.log('Sending to DALL-E (cleaned):', imagePrompt);
              const dalleResponse = await fetch("https://api.openai.com/v1/images/generations", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${openaiApiKey}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  prompt: imagePrompt,
                  n: 1,
                  size: "1024x1024",
                  response_format: "url"
                })
              });

              if (!dalleResponse.ok) {
                const errorData = await dalleResponse.json().catch(() => ({}));
                throw new Error(`DALL-E API error: ${errorData.error?.message || dalleResponse.statusText}`);
              }

              const dalleData = await dalleResponse.json();
              console.log('DALL-E API Response:', dalleData); // Debug log
              const imageUrl = dalleData.data?.[0]?.url;
              console.log('Extracted Image URL:', imageUrl); // Debug log
              
              if (imageUrl) {
                const imageResponse = `Here's your image! [IMAGE_DISPLAY:${imageUrl}]`;
                console.log('Sending Image Response:', imageResponse); // Debug log
                // Send the complete response as one piece to avoid breaking the image marker
                send(imageResponse);
              } else {
                send(`[AiO Error] No image URL received from DALL-E API`);
              }
            } catch (error: any) {
              send(`[AiO Error] ${error.message}`);
            }
            controller.close();
            return;
          }

          // Call OpenAI API with streaming
          const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openaiApiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "gpt-3.5-turbo",
              messages: [
                {
                  role: "system",
                  content: response_style === 'concise' 
                    ? `You are INFINITO, a helpful AI assistant. Provide ONLY 1-2 direct sentences answering the question. Be concise and to the point. Do NOT provide examples, code, or detailed explanations.`
                    : `You are INFINITO, a helpful AI assistant. Provide detailed, comprehensive responses with 3-4 well-structured paragraphs. Focus on clear explanations with relevant examples. Only include code if the question specifically asks for programming help. Keep responses natural and conversational.`
                },
                {
                  role: "user",
                  content: prompt
                }
              ],
              temperature: temperature,
              max_tokens: max_tokens,
              stream: true
            })
          });

          if (!openaiResponse.ok || !openaiResponse.body) {
            const errorData = await openaiResponse.json().catch(() => ({}));
            throw new Error(`OpenAI API error: ${errorData.error?.message || openaiResponse.statusText}`);
          }

          const reader = openaiResponse.body.getReader();
          const decoder = new TextDecoder();
          const hb = setInterval(() => controller.enqueue(enc.encode(":hb\n\n")), 15000);

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  clearInterval(hb);
                  controller.close();
                  return;
                }
                
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    send(content);
                  }
                } catch (e) {
                  // Ignore parsing errors for partial chunks
                }
              }
            }
          }
          
          clearInterval(hb);
          controller.close();
        } catch (error: any) {
          send(`[AiO Error] ${error.message}`);
          controller.close();
        }
      },
    });
    
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store",
        "Connection": "keep-alive",
      },
    });
  } else if (m !== "llama" && m !== "mistral") {
    const stream = new ReadableStream({
      start(controller) {
        let stubResponse = "";
        
        // Special handling for vision models
        if (m === "blip") {
          if (!image) {
            stubResponse = `[BLIP] Please upload an image first. BLIP is a vision-language model that can analyze images and answer questions about visual content.`;
          } else {
            stubResponse = `[BLIP Analysis] I can see the uploaded image. ${prompt ? `Regarding your question: "${prompt}" - ` : ''}This appears to be an image that I can analyze. Please provide more specific details about what you'd like me to focus on.`;
          }
        } else if (m === "llava") {
          if (!image) {
            stubResponse = `[LLaVA] Please upload an image first. LLaVA is a multimodal model that can have natural conversations about visual content.`;
          } else {
            stubResponse = `[LLaVA] I can see the uploaded image. ${prompt ? `Your question: "${prompt}" - ` : ''}I'm ready to have a conversation about what I observe. What would you like to discuss?`;
          }
        } else {
          // Default stub for other models
          stubResponse = `[${m} stream stub] ${String(prompt).slice(0,120)}`;
          
          // Apply response style filtering for stub responses
          if (response_style === "concise") {
            stubResponse = stubResponse.replace(/\[.*?stub\]\s*/, "").trim();
            if (stubResponse.length > 80) {
              stubResponse = stubResponse.substring(0, 80) + "...";
            }
          }
        }
        
        controller.enqueue(new TextEncoder().encode(`data: ${stubResponse}\n\n`));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store",
        "Connection": "keep-alive",
      },
    });
  }

  const model = m === "llama" ? "llama3.1:8b" : "mistral:7b";
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (s: string) => controller.enqueue(enc.encode(`data: ${s}\n\n`));
      try {
        const r = await fetch(`${OLLAMA_URL}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            prompt,
            stream: true,
            options: { temperature, num_predict: max_tokens },
          }),
        });
        if (!r.ok || !r.body) throw new Error(`Ollama ${r.status}`);

        const reader = r.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        const hb = setInterval(() => controller.enqueue(enc.encode(":hb\n\n")), 15000);

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n"); buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const j = JSON.parse(line);
              if (j?.response) send(j.response);
              if (j?.done) { clearInterval(hb); controller.close(); return; }
            } catch { /* ignore partials */ }
          }
        }
        controller.close();
      } catch (err: any) {
        const prefix = m === "llama" ? "[llama error → gpt stub]" : "[mistral error → gpt stub]";
        send(`${prefix} ${String(err?.message ?? "Unknown error")}`);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      "Connection": "keep-alive",
    },
  });
}
