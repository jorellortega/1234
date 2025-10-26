import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { prompt, output, model, temperature, top_k, parent_id } = await req.json();

    // Require both prompt and output for complete conversations
    if (!prompt || !output) {
      return NextResponse.json({ error: "prompt and output required" }, { status: 400 });
    }

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

    const { error } = await supabase.from("generations").insert([{
      prompt: prompt || '',
      output: output || '',
      model: model ?? "mini_llm",
      temperature: typeof temperature === "number" ? temperature : null,
      top_k: typeof top_k === "number" ? top_k : null,
      parent_id: typeof parent_id === "string" ? parent_id : null,
      user_id: user.id
    }]);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
