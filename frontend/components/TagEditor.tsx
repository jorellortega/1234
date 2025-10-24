"use client";
import { useEffect, useState } from "react";

export default function TagEditor({ id, initial }: { id: string; initial?: string[] }) {
  const [tags, setTags] = useState<string[]>(initial ?? []);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { setTags(initial ?? []); }, [initial]);

  function addTag(t: string) {
    const v = t.trim();
    if (!v) return;
    if (tags.includes(v)) return;
    setTags([...tags, v]);
    setInput("");
  }
  function removeTag(t: string) {
    setTags(tags.filter(x => x !== t));
  }

  async function save() {
    setSaving(true); setErr(null);
    try {
      const r = await fetch(`/api/generations/${id}/tags`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.error) throw new Error(data.error || "Save failed");
    } catch (e: any) {
      setErr(e.message || "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); addTag(input); }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map(t => (
          <span key={t} className="inline-flex items-center gap-2 px-2 py-1 rounded-xl bg-neutral-800 text-sm">
            #{t}
            <button className="opacity-70 hover:opacity-100" onClick={() => removeTag(t)} aria-label={`remove ${t}`}>✕</button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="add tag…"
          className="px-2 py-1 rounded-xl bg-neutral-900 text-sm outline-none"
        />
        <button
          onClick={() => addTag(input)}
          className="px-2 py-1 rounded-xl bg-neutral-800 text-sm"
        >
          Add
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="px-2 py-1 rounded-xl bg-cyan-600 text-sm disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save tags"}
        </button>
      </div>
      {err && <div className="text-xs text-red-400">{err}</div>}
    </div>
  );
}
