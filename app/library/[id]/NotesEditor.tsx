"use client";
import { useState } from "react";

export default function NotesEditor({ id, initial }: { id: string; initial: string | null }) {
  const [v, setV] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function save() {
    setSaving(true); setErr(null);
    try {
      const r = await fetch(`/api/generations/${id}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: v }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.error) throw new Error(data.error || "Save failed");
    } catch (e:any) {
      setErr(e.message || "Unknown error");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Notes</h2>
        <button onClick={save} disabled={saving} className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50">
          {saving ? "Saving…" : "Save notes"}
        </button>
      </div>
      <textarea
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Add notes about this generation…"
        className="w-full min-h-[120px] p-3 rounded-2xl bg-neutral-900 outline-none"
      />
      {err && <div className="text-red-400 text-sm">{err}</div>}
    </section>
  );
}
