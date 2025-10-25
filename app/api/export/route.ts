import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

const HEADERS = ["id","created_at","prompt","output","model","temperature","top_k","tags","notes"] as const;
type Row = Record<(typeof HEADERS)[number], any>;

function toCSV(rows: Row[]) {
  const esc = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/\r?\n/g, "\\n");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [HEADERS.join(","), ...rows.map(r => HEADERS.map(h => {
    let v;
    if (h === "tags") {
      v = Array.isArray(r.tags) ? r.tags.join(" ") : "";
    } else if (h === "notes") {
      v = r.notes ?? "";
    } else {
      v = r[h];
    }
    const s = String(v ?? "").replace(/\r?\n/g, "\\n");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(","))].join("\n");
}

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q     = url.searchParams.get("q") ?? "";
  const model = url.searchParams.get("model") ?? "";
  const tmin  = url.searchParams.get("tmin");
  const tmax  = url.searchParams.get("tmax");
  const kmin  = url.searchParams.get("kmin");
  const kmax  = url.searchParams.get("kmax");
  const from  = url.searchParams.get("from"); // ISO date
  const to    = url.searchParams.get("to");   // ISO date
  const tag   = url.searchParams.get("tag") ?? "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "1000", 10) || 1000, 5000);

  const sb = supabaseServer();
  
  // Get current user session
  const { data: { user }, error: authError } = await sb.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let qy = sb
    .from("generations")
    .select("id, created_at, prompt, output, model, temperature, top_k, tags, notes")
    .eq("user_id", user.id)  // Filter by current user
    .order("created_at", { ascending: false })
    .limit(limit);

  // server-side date filtering
  if (from) qy = qy.gte("created_at", from);
  if (to)   qy = qy.lte("created_at", to);

  // server-side model filter
  if (model) qy = qy.ilike("model", `%${model}%`);

  // fetch
  const { data, error } = await qy;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // client-side text/number/tag filters (Supabase doesn't support OR across two columns easily)
  const rows = (data ?? []).filter((r) => {
    const text = `${r.prompt ?? ""} ${r.output ?? ""}`.toLowerCase();
    if (q && !text.includes(q.toLowerCase())) return false;

    const t = typeof r.temperature === "number" ? r.temperature : undefined;
    const k = typeof r.top_k === "number" ? r.top_k : undefined;

    if (tmin && (t === undefined || t < parseFloat(tmin))) return false;
    if (tmax && (t === undefined || t > parseFloat(tmax))) return false;
    if (kmin && (k === undefined || k < parseInt(kmin))) return false;
    if (kmax && (k === undefined || k > parseInt(kmax))) return false;

    if (tag) {
      const arr = Array.isArray(r.tags) ? r.tags : [];
      if (!arr.includes(tag)) return false;
    }

    return true;
  });

  const csv = toCSV(rows as Row[]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="generations.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
