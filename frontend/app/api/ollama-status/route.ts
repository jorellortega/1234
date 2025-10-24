import { NextResponse } from "next/server";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";

export async function GET() {
  try {
    // try a lightweight endpoint first; fall back to /api/version
    const r = await fetch(`${OLLAMA_URL}/api/version`, { method: "GET" });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return NextResponse.json({ ok: false, error: `status ${r.status}: ${text}` }, { status: 200 });
    }
    const j = await r.json().catch(() => ({}));
    return NextResponse.json({ ok: true, version: j?.version ?? null });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "unknown error" }, { status: 200 });
  }
}
