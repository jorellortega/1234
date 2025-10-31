import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

// GET /api/generations/thread?parent_id=xxx or GET /api/generations/thread?id=xxx
// Returns the root generation and all its children (thread)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const parentId = url.searchParams.get("parent_id");
    const generationId = url.searchParams.get("id");

    // Get the authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const supabase = supabaseServer();
    
    // Set the session from the authorization header
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // If we have a generation_id, first find the root (parent_id is null) or the generation itself
    let rootId = parentId || generationId;
    
    if (generationId && !parentId) {
      // Find the root generation by traversing up the parent chain
      let currentId = generationId;
      let foundRoot = false;
      
      // Traverse up to find root (max 10 levels to prevent infinite loops)
      for (let i = 0; i < 10; i++) {
        const { data: gen } = await supabase
          .from("generations")
          .select("id, parent_id")
          .eq("id", currentId)
          .eq("user_id", user.id)
          .single();
        
        if (!gen) break;
        
        if (!gen.parent_id) {
          rootId = gen.id;
          foundRoot = true;
          break;
        }
        
        currentId = gen.parent_id;
      }
      
      // If we couldn't find root, use the generation_id as root
      if (!foundRoot) {
        rootId = generationId;
      }
    }

    if (!rootId) {
      return NextResponse.json(
        { error: 'parent_id or id parameter required' },
        { status: 400 }
      )
    }

    // Fetch the root generation
    const { data: root, error: rootError } = await supabase
      .from("generations")
      .select("id, created_at, prompt, output, model, temperature, top_k, parent_id")
      .eq("id", rootId)
      .eq("user_id", user.id)
      .single();

    if (rootError || !root) {
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      )
    }

    // Fetch all children (generations with parent_id = rootId)
    const { data: children, error: childrenError } = await supabase
      .from("generations")
      .select("id, created_at, prompt, output, model, temperature, top_k, parent_id")
      .eq("parent_id", rootId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (childrenError) {
      return NextResponse.json(
        { error: childrenError.message },
        { status: 500 }
      )
    }

    // Combine root and children into a thread
    const thread = [root, ...(children || [])].map((gen, index) => ({
      id: gen.id,
      created_at: gen.created_at,
      prompt: gen.prompt,
      output: gen.output,
      model: gen.model,
      temperature: gen.temperature,
      top_k: gen.top_k,
      parent_id: gen.parent_id,
      is_root: index === 0,
      thread_position: index
    }));

    return NextResponse.json({ 
      ok: true, 
      thread,
      root_id: rootId
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

