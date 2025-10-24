import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  const { notes } = await req.json().catch(() => ({}));
  if (typeof notes !== "string" && notes !== null) {
    return NextResponse.json({ error: "notes must be a string (or null)" }, { status: 400 });
  }
  const sb = supabaseServer();
  const { error } = await sb.from("generations").update({ notes: notes ?? null }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
