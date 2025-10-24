import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { prompt, output, model, temperature, top_k, parent_id } = await req.json();

    if (!prompt || !output) {
      return NextResponse.json({ error: "prompt and output required" }, { status: 400 });
    }

    const supabase = supabaseServer();
    const { error } = await supabase.from("generations").insert([{
      prompt,
      output,
      model: model ?? "mini_llm",
      temperature: typeof temperature === "number" ? temperature : null,
      top_k: typeof top_k === "number" ? top_k : null,
      parent_id: typeof parent_id === "string" ? parent_id : null,
    }]);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
