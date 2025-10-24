"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Row = {
  id: string;
  created_at: string;
  prompt: string | null;
  output: string | null;
  model: string | null;
  temperature: number | null;
  top_k: number | null;
  tags?: string[] | null;
  notes?: string | null;
};

function t(s?: string | null, n = 140) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export default function LibraryControls({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [model, setModel] = useState("");
  const [tmin, setTmin] = useState("");
  const [tmax, setTmax] = useState("");
  const [kmin, setKmin] = useState("");
  const [kmax, setKmax] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tag, setTag] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const rows = useMemo(() => {
    return initial.filter((r) => {
      const s = (r.prompt ?? "") + " " + (r.output ?? "");
      if (q && !s.toLowerCase().includes(q.toLowerCase())) return false;
      if (model && (r.model ?? "").toLowerCase().indexOf(model.toLowerCase()) === -1) return false;

      const t = typeof r.temperature === "number" ? r.temperature : undefined;
      const k = typeof r.top_k === "number" ? r.top_k : undefined;

      if (tmin !== "" && (t === undefined || t < parseFloat(tmin))) return false;
      if (tmax !== "" && (t === undefined || t > parseFloat(tmax))) return false;
      if (kmin !== "" && (k === undefined || k < parseInt(kmin))) return false;
      if (kmax !== "" && (k === undefined || k > parseInt(kmax))) return false;

      if (tag && !(r.tags && Array.isArray(r.tags) && r.tags.includes(tag))) return false;

      return true;
    });
  }, [initial, q, model, tmin, tmax, kmin, kmax, from, to, tag]);

  // helper functions
  function toggle(id: string, val?: boolean) {
    setSelected((prev) => ({ ...prev, [id]: val ?? !prev[id] }));
  }
  function clearSelection() {
    setSelected({});
  }
  const filteredIds = rows.map(r => r.id);
  const selectedIds = filteredIds.filter(id => selected[id]);

  async function bulkDelete() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} selected item(s)? This cannot be undone.`)) return;
    try {
      const r = await fetch("/api/generations/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.error) throw new Error(data.error || "Delete failed");
      clearSelection();
      router.refresh();
    } catch (e) {
      alert((e as Error).message || "Unknown error");
    }
  }

  // build export href with all current filters
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (model) params.set("model", model);
  if (tmin) params.set("tmin", tmin);
  if (tmax) params.set("tmax", tmax);
  if (kmin) params.set("kmin", kmin);
  if (kmax) params.set("kmax", kmax);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (tag) params.set("tag", tag);

  const exportHref = `/api/export?${params.toString()}`;
  const exportJsonHref = `/api/generations?${params.toString()}`;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="grid gap-3 sm:grid-cols-9">
        <input
          placeholder="Search prompt/output…"
          className="px-3 py-2 rounded-xl bg-neutral-900 outline-none sm:col-span-3"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <input
          placeholder="Model"
          className="px-3 py-2 rounded-xl bg-neutral-900 outline-none"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
        <input
          placeholder="Temp min"
          className="px-3 py-2 rounded-xl bg-neutral-900 outline-none"
          value={tmin}
          onChange={(e) => setTmin(e.target.value)}
        />
        <input
          placeholder="Temp max"
          className="px-3 py-2 rounded-xl bg-neutral-900 outline-none"
          value={tmax}
          onChange={(e) => setTmax(e.target.value)}
        />
        <input
          placeholder="TopK min"
          className="px-3 py-2 rounded-xl bg-neutral-900 outline-none"
          value={kmin}
          onChange={(e) => setKmin(e.target.value)}
        />
        <input
          placeholder="TopK max"
          className="px-3 py-2 rounded-xl bg-neutral-900 outline-none"
          value={kmax}
          onChange={(e) => setKmax(e.target.value)}
        />
        <input
          type="date"
          className="px-3 py-2 rounded-xl bg-neutral-900 outline-none"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          placeholder="From date"
        />
        <input
          type="date"
          className="px-3 py-2 rounded-xl bg-neutral-900 outline-none"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="To date"
        />
        <input
          placeholder="Tag (exact)"
          className="px-3 py-2 rounded-xl bg-neutral-900 outline-none"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        />
      </div>

      {/* Export Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm opacity-80">
          Showing {rows.length} rows • Selected {selectedIds.length}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const next: Record<string, boolean> = {};
              const allSelected = filteredIds.every(id => selected[id]);
              if (!allSelected) filteredIds.forEach(id => (next[id] = true));
              setSelected(allSelected ? {} : next);
            }}
            className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm"
          >
            {filteredIds.every(id => selected[id]) ? "Clear selection" : "Select all (filtered)"}
          </button>
          <button
            onClick={bulkDelete}
            disabled={selectedIds.length === 0}
            className="px-3 py-1 rounded-lg bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-sm"
          >
            Delete selected
          </button>
          <a
            href={exportHref}
            className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm"
          >
            Export CSV
          </a>
          <a
            href={exportJsonHref}
            className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm"
          >
            Export JSON
          </a>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900">
            <tr>
              <th className="text-left p-3">
                <input
                  type="checkbox"
                  aria-label="select all"
                  checked={filteredIds.length > 0 && filteredIds.every(id => selected[id])}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const next: Record<string, boolean> = {};
                    if (checked) filteredIds.forEach(id => (next[id] = true));
                    setSelected(checked ? next : {});
                  }}
                />
              </th>
              <th className="text-left p-3">Time</th>
              <th className="text-left p-3">Prompt</th>
              <th className="text-left p-3">Output</th>
              <th className="text-left p-3">Tags</th>
              <th className="text-left p-3">Notes</th>
              <th className="text-left p-3">Model</th>
              <th className="text-left p-3">Temp</th>
              <th className="text-left p-3">Top-K</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-neutral-800 align-top">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={!!selected[r.id]}
                    onChange={() => toggle(r.id)}
                    aria-label={`select ${r.id}`}
                  />
                </td>
                <td className="p-3 whitespace-nowrap">
                  <Link href={`/library/${r.id}`} className="text-cyan-400 hover:underline">
                    {new Date(r.created_at).toLocaleString()}
                  </Link>
                </td>
                <td className="p-3 max-w-[420px]">{t(r.prompt, 160)}</td>
                <td className="p-3 max-w-[520px] text-neutral-300">{t(r.output, 240)}</td>
                <td className="p-3 max-w-[220px]">
                  <div className="flex flex-wrap gap-1">
                    {(r.tags ?? []).map(t => (
                      <span key={t} className="px-2 py-0.5 rounded-lg bg-neutral-800 text-xs">#{t}</span>
                    ))}
                  </div>
                </td>
                <td className="p-3 max-w-[220px]">
                  {r.notes ? <span className="px-2 py-0.5 rounded-lg bg-neutral-800 text-xs">📝 notes</span> : ""}
                </td>
                <td className="p-3">{r.model ?? "mini_llm"}</td>
                <td className="p-3">{r.temperature ?? ""}</td>
                <td className="p-3">{r.top_k ?? ""}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="p-4" colSpan={9}>No results.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
