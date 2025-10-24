import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const supabase = supabaseServer();
  const { error } = await supabase.from("generations").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  const { tags } = await req.json().catch(() => ({}));
  if (!Array.isArray(tags)) return NextResponse.json({ error: "tags must be an array of strings" }, { status: 400 });

  const cleaned = tags
    .map((t: unknown) => (typeof t === "string" ? t.trim() : ""))
    .filter((t: string) => t.length > 0);

  const supabase = supabaseServer();
  const { error } = await supabase.from("generations").update({ tags: cleaned }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, tags: cleaned });
}
