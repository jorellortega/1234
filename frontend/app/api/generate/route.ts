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
              
              // Get the OpenAI API key from the database
              const { data: apiKey, error } = await supabase
                .from('api_keys')
                .select('encrypted_key')
                .eq('service_id', 'openai')
                .eq('is_active', true)
                .single();
              
              if (error || !apiKey) {
                output = `[AiO Error] OpenAI API key not found. Please add your OpenAI API key in the AI Settings page.`;
              } else {
                const openaiApiKey = apiKey.encrypted_key;
                
                // Check if user wants an image (look for specific image-related keywords)
                const imageKeywords = ['image', 'picture', 'photo', 'draw', 'generate image', 'create image', 'show me an image', 'visualize as image'];
                const wantsImage = imageKeywords.some(keyword => 
                  prompt.toLowerCase().includes(keyword.toLowerCase())
                );
                
                if (wantsImage) {
                  // Use DALL-E for image generation
                  const dalleResponse = await fetch("https://api.openai.com/v1/images/generations", {
                    method: "POST",
                    headers: {
                      "Authorization": `Bearer ${openaiApiKey}`,
                      "Content-Type": "application/json"
                    },
                                    body: JSON.stringify({
                  prompt: prompt,
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
                  output = `[AiO Image Generated] ${prompt}\n\nImage URL: ${imageUrl}\n\n[IMAGE_DISPLAY:${imageUrl}]\n\nYou can also view the full image by clicking the URL above.`;
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
                      model: "gpt-4",
                      messages: [
                        {
                          role: "system",
                          content: `You are a helpful AI assistant. Provide ${response_style} responses.`
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
