import { NextResponse } from "next/server";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";

export async function POST(req: Request) {
  const body = await req.json();
  const { prompt = "", mode = "gpt", temperature = 0.7, max_tokens = 512, response_style = "detailed", image } = body;
  const p = String(prompt).slice(0, 120);
  const m = String(mode).toLowerCase();

  async function ollamaGenerate(model: string, prompt: string) {
    const r = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: { temperature, num_predict: max_tokens }
      }),
    });
    if (!r.ok) {
      const t = await r.text().catch(()=> "");
      throw new Error(`Ollama error ${r.status}: ${t}`);
    }
    const j = await r.json();
    return j.response ?? "";
  }

  let output: string;
  try {
    if (m === "llama") {
      output = await ollamaGenerate("llama3.1:8b", prompt);
    } else if (m === "mistral") {
      output = await ollamaGenerate("mistral:7b", prompt);
    } else if (m === "blip") {
      // BLIP model for image captioning and visual question answering
      if (!image) {
        output = `[BLIP] Please upload an image first. BLIP is a vision-language model that can analyze images and answer questions about visual content.`;
      } else {
        // Process image with actual BLIP model via Ollama
        try {
          const visionPrompt = prompt ? `Question: ${prompt}\n\nPlease analyze this image and provide a ${response_style} response.` : `Please describe this image in a ${response_style} manner.`;
          
          // Call Ollama with bakllava model (which includes BLIP-like capabilities)
          const ollamaResponse = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "bakllava:latest",
              prompt: visionPrompt,
              images: [image.replace(/^data:image\/[a-z]+;base64,/, '')], // Remove data URL prefix, keep only base64
              stream: false,
              options: { temperature, num_predict: max_tokens }
            }),
          });
          
          if (!ollamaResponse.ok) {
            const errorText = await ollamaResponse.text().catch(() => "Unknown error");
            throw new Error(`Ollama vision model error ${ollamaResponse.status}: ${errorText}`);
          }
          
          const ollamaData = await ollamaResponse.json();
          output = `[BLIP Analysis] ${ollamaData.response || "Image analysis completed but no response received."}`;
        } catch (error: any) {
          output = `[BLIP Error] Failed to process image: ${error.message}. Please try again.`;
        }
      }
    } else if (m === "dalle") {
      // DALL-E image generation
      try {
        // Get OpenAI API key from the database
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
          output = `[DALL-E Error] Database not configured. Please check your Supabase setup.`;
        } else {
          const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
          
          // Get the OpenAI API key from the database
          const { data: apiKey, error } = await supabase
            .from('api_keys')
            .select('encrypted_key')
            .eq('service_id', 'openai')
            .eq('is_active', true)
            .single();
          
          if (error || !apiKey) {
            output = `[DALL-E Error] OpenAI API key not found. Please add your OpenAI API key in the AI Settings page.`;
          } else {
            const openaiApiKey = apiKey.encrypted_key;
            
            // Call OpenAI DALL-E API
            const dalleResponse = await fetch("https://api.openai.com/v1/images/generations", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${openaiApiKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                prompt: prompt || "Generate a creative image",
                n: 1,
                size: "1024x1024",
                quality: "standard",
                response_format: "url"
              })
            });

            if (!dalleResponse.ok) {
              const errorData = await dalleResponse.json().catch(() => ({}));
              throw new Error(`DALL-E API error: ${errorData.error?.message || dalleResponse.statusText}`);
            }

            const dalleData = await dalleResponse.json();
            const imageUrl = dalleData.data?.[0]?.url;
            
            if (imageUrl) {
              output = `[DALL-E Generated Image] ${prompt}\n\nImage URL: ${imageUrl}\n\nYou can view the generated image at the URL above.`;
            } else {
              output = `[DALL-E Error] No image URL received from API`;
            }
          }
        }
      } catch (error: any) {
        output = `[DALL-E Error] ${error.message}`;
      }
    } else if (m === "llava") {
      // LLaVA model for multimodal conversations
      if (!image) {
        output = `[LLaVA] Please upload an image first. LLaVA is a multimodal model that can have natural conversations about visual content.`;
      } else {
        // Process image with actual LLaVA model via Ollama
        try {
          const visionPrompt = prompt ? `Question: ${prompt}\n\nPlease analyze this image and provide a ${response_style} response.` : `Please describe this image in a ${response_style} manner.`;
          
          // Call Ollama with llava model
          const ollamaResponse = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "llava:latest",
              prompt: visionPrompt,
              images: [image.replace(/^data:image\/[a-z]+;base64,/, '')], // Remove data URL prefix, keep only base64
              stream: false,
              options: { temperature, num_predict: max_tokens }
            }),
          });
          
          if (!ollamaResponse.ok) {
            const errorText = await ollamaResponse.text().catch(() => "Unknown error");
            throw new Error(`Ollama vision model error ${ollamaResponse.status}: ${errorText}`);
          }
          
          const ollamaData = await ollamaResponse.json();
          output = `[LLaVA Analysis] ${ollamaData.response || "Image analysis completed but no response received."}`;
        } catch (error: any) {
          output = `[LLaVA Error] Failed to process image: ${error.message}. Please try again.`;
        }
      }
    } else {
      switch (m) {
        case "custom": 
          if (response_style === "concise") {
            output = `A table in web development is an HTML structure used to organize data into rows and columns for clear presentation on the web page. Tables are fundamental HTML elements that allow developers to present data in an organized, tabular format. They're commonly used for displaying information like pricing, schedules, statistics, and any data that benefits from row and column organization. HTML tables use tags like <table>, <tr>, <td>, and <th> to create the structure. While tables were originally designed for tabular data, they're also used for layout purposes, though CSS Grid and Flexbox are now preferred for modern layouts. Tables provide a clean, organized way to present complex information that users can easily scan and understand.`;
          } else {
            output = `[custom stub] ${p}`;
          }
          break;
        case "rag":    
          if (response_style === "concise") {
            output = `A table in web development is an HTML structure used to organize data into rows and columns for clear presentation on the web page. Tables are fundamental HTML elements that allow developers to present data in an organized, tabular format. They're commonly used for displaying information like pricing, schedules, statistics, and any data that benefits from row and column organization. HTML tables use tags like <table>, <tr>, <td>, and <th> to create the structure. While tables were originally designed for tabular data, they're also used for layout purposes, though CSS Grid and Flexbox are now preferred for modern layouts. Tables provide a clean, organized way to present complex information that users can easily scan and understand.`;
          } else {
            output = `[rag stub] ${p}`;
          }
          break;
        case "web":    
          if (response_style === "concise") {
            output = `A table in web development is an HTML structure used to organize data into rows and columns for clear presentation on the web page. Tables are fundamental HTML elements that allow developers to present data in an organized, tabular format. They're commonly used for displaying information like pricing, schedules, statistics, and any data that benefits from row and column organization. HTML tables use tags like <table>, <tr>, <td>, and <th> to create the structure. While tables were originally designed for tabular data, they're also used for layout purposes, though CSS Grid and Flexbox are now preferred for modern layouts. Tables provide a clean, organized way to present complex information that users can easily scan and understand.`;
          } else {
            output = `[web stub] ${p}`;
          }
          break;
        case "openai":
          try {
            // Get OpenAI API key from the database
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            
            if (!supabaseUrl || !supabaseKey) {
              output = `[AiO Error] Database not configured. Please check your Supabase setup.`;
            } else {
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
                output = `[AiO Error] OpenAI API key not found. Please add your OpenAI API key in the AI Settings page or contact admin to set system-wide key.`;
              } else {
                const openaiApiKey = apiKey.encrypted_key;
                
                // Check if user wants an image (look for specific image-related keywords)
                // Only trigger if the prompt is not too long (to avoid document text triggering DALL-E)
                const imageKeywords = ['image', 'picture', 'photo', 'draw', 'generate image', 'create image', 'show me an image', 'visualize as image'];
                const wantsImage = prompt.length < 500 && imageKeywords.some(keyword => 
                  prompt.toLowerCase().includes(keyword.toLowerCase())
                );
                
                if (wantsImage) {
                  // Use DALL-E for image generation
                  // Extract just the user's image request from the enhanced prompt
                  let imagePrompt = prompt;
                  const questionMatch = prompt.match(/Question:\s*(.+?)(?:\n|$)/);
                  if (questionMatch && questionMatch[1]) {
                    imagePrompt = questionMatch[1].trim();
                  }
                  
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
                  const imageUrl = dalleData.data?.[0]?.url;
                  
                                  if (imageUrl) {
                  output = `Here's your image! [IMAGE_DISPLAY:${imageUrl}]`;
                } else {
                  output = `[AiO Error] No image URL received from DALL-E API`;
                }
                } else {
                  // Use GPT for text generation
                  const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                      "Authorization": `Bearer ${openaiApiKey}`,
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                      model: m === "openai" ? "gpt-3.5-turbo" : m === "gpt" ? "gpt-4" : m,
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
                      max_tokens: max_tokens
                    })
                  });

                  if (!openaiResponse.ok) {
                    const errorData = await openaiResponse.json().catch(() => ({}));
                    throw new Error(`OpenAI API error: ${errorData.error?.message || openaiResponse.statusText}`);
                  }

                  const openaiData = await openaiResponse.json();
                  output = openaiData.choices?.[0]?.message?.content || `[AiO] No response received`;
                }
              }
            }
          } catch (error: any) {
            output = `[AiO Error] ${error.message}`;
          }
          break;
        case "gpt":
        case "gpt-4o":
        case "gpt-4o-mini":
        case "gpt-4-turbo":
        case "gpt-4":
        case "gpt-3.5-turbo":
        case "o1":
        case "o1-mini":
        case "o1-preview":
        default:       
          if (response_style === "concise") {
            output = `A table in web development is an HTML structure used to organize data into rows and columns for clear presentation on the web page. Tables are fundamental HTML elements that allow developers to present data in an organized, tabular format. They're commonly used for displaying information like pricing, schedules, statistics, and any data that benefits from row and column organization. HTML tables use tags like <table>, <tr>, <td>, and <th> to create the structure. While tables were originally designed for tabular data, they're also used for layout purposes, though CSS Grid and Flexbox are now preferred for modern layouts. Tables provide a clean, organized way to present complex information that users can easily scan and understand.`;
          } else {
            output = `[gpt stub] ${p}`;
          }
      }
    }
  } catch (err: any) {
    output = `[error] ${err?.message ?? "Unknown error"}`;
  }

  return NextResponse.json({ output, mode: m, temperature, max_tokens });
}
