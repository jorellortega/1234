import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q     = url.searchParams.get("q") ?? "";
  const model = url.searchParams.get("model") ?? "";
  const tag   = url.searchParams.get("tag") ?? "";
  const tmin  = url.searchParams.get("tmin");
  const tmax  = url.searchParams.get("tmax");
  const kmin  = url.searchParams.get("kmin");
  const kmax  = url.searchParams.get("kmax");
  const from  = url.searchParams.get("from");
  const to    = url.searchParams.get("to");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "1000", 10) || 1000, 5000);

  const sb = supabaseServer();
  let qy = sb
    .from("generations")
    .select("id, created_at, prompt, output, model, temperature, top_k, tags, notes")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (from) qy = qy.gte("created_at", from);
  if (to)   qy = qy.lte("created_at", to);
  if (model) qy = qy.ilike("model", `%${model}%`);

  const { data, error } = await qy;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []).filter((r) => {
    const text = `${r.prompt ?? ""} ${r.output ?? ""}`.toLowerCase();
    if (q && !text.includes(q.toLowerCase())) return false;
    if (tag) {
      const arr = Array.isArray(r.tags) ? r.tags : [];
      if (!arr.includes(tag)) return false;
    }
    const t = typeof r.temperature === "number" ? r.temperature : undefined;
    const k = typeof r.top_k === "number" ? r.top_k : undefined;
    if (tmin && (t === undefined || t < parseFloat(tmin))) return false;
    if (tmax && (t === undefined || t > parseFloat(tmax))) return false;
    if (kmin && (k === undefined || k < parseInt(kmin))) return false;
    if (kmax && (k === undefined || k > parseInt(kmax))) return false;
    return true;
  });

  return NextResponse.json({ count: rows.length, items: rows }, { headers: { "Cache-Control": "no-store" } });
}
