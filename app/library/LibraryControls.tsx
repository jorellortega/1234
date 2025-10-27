"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, Trash2, Edit, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase-client";

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
  const [previewItem, setPreviewItem] = useState<Row | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newPrompt, setNewPrompt] = useState("");

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

  const handlePreview = (row: Row) => {
    setPreviewItem(row);
    setNewPrompt(row.prompt || "");
    setIsRenaming(false);
  };

  const handleClosePreview = () => {
    setPreviewItem(null);
    setIsRenaming(false);
  };

  const handleDownload = async () => {
    if (!previewItem) return;
    
    const imageMatch = previewItem.output?.match(/\[IMAGE_DISPLAY:(.*?)\]/);
    const videoMatch = previewItem.output?.match(/\[VIDEO_DISPLAY:(.*?)\]/);
    
    try {
      if (imageMatch) {
        window.open(`/api/download-image?url=${encodeURIComponent(imageMatch[1])}`, '_blank');
      } else if (videoMatch) {
        const response = await fetch(videoMatch[1]);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `infinito-video-${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download media');
    }
  };

  const handleDelete = async () => {
    if (!previewItem || !confirm('Are you sure you want to delete this generation?')) return;
    
    try {
      const response = await fetch(`/api/generations/${previewItem.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete');
      
      handleClosePreview();
      router.refresh();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete generation');
    }
  };

  const handleRename = async () => {
    if (!previewItem || !newPrompt.trim()) return;
    
    try {
      const { error } = await supabase
        .from('generations')
        .update({ prompt: newPrompt })
        .eq('id', previewItem.id);
      
      if (error) throw error;
      
      setPreviewItem({ ...previewItem, prompt: newPrompt });
      setIsRenaming(false);
      router.refresh();
    } catch (error) {
      console.error('Rename failed:', error);
      alert('Failed to rename');
    }
  };

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
                  <button 
                    onClick={() => handlePreview(r)}
                    className="text-cyan-400 hover:underline cursor-pointer"
                  >
                    {new Date(r.created_at).toLocaleString()}
                  </button>
                </td>
                <td className="p-3 max-w-[420px]">{t(r.prompt, 160)}</td>
                <td className="p-3 max-w-[520px] text-neutral-300">
                  {(() => {
                    // Check if output contains media display tags
                    const imageMatch = r.output?.match(/\[IMAGE_DISPLAY:(.*?)\]/);
                    const videoMatch = r.output?.match(/\[VIDEO_DISPLAY:(.*?)\]/);
                    
                    if (imageMatch) {
                      const imageUrl = imageMatch[1];
                      return (
                        <button 
                          onClick={() => handlePreview(r)}
                          className="flex items-center gap-2 hover:opacity-80 cursor-pointer"
                        >
                          <img 
                            src={imageUrl} 
                            alt="Generated" 
                            className="w-16 h-16 object-cover rounded border border-cyan-500/30"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                          <span className="text-cyan-400 text-xs">🖼️ Image</span>
                        </button>
                      );
                    } else if (videoMatch) {
                      const videoUrl = videoMatch[1];
                      return (
                        <button 
                          onClick={() => handlePreview(r)}
                          className="flex items-center gap-2 hover:opacity-80 cursor-pointer"
                        >
                          <video 
                            src={videoUrl} 
                            className="w-16 h-16 object-cover rounded border border-pink-500/30"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                          <span className="text-pink-400 text-xs">🎬 Video</span>
                        </button>
                      );
                    } else {
                      return t(r.output, 240);
                    }
                  })()}
                </td>
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

      {/* Preview Modal */}
      {previewItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={handleClosePreview}
        >
          <div 
            className="relative bg-neutral-900 rounded-2xl border border-cyan-500/30 max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-neutral-900 border-b border-cyan-500/30 p-4 flex items-center justify-between">
              <div className="flex-1">
                {isRenaming ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newPrompt}
                      onChange={(e) => setNewPrompt(e.target.value)}
                      className="flex-1 px-3 py-2 bg-neutral-800 border border-cyan-500/30 rounded text-white"
                      placeholder="Enter new prompt..."
                      autoFocus
                    />
                    <Button
                      onClick={handleRename}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white"
                      size="sm"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={() => setIsRenaming(false)}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-white">{previewItem.prompt || 'Untitled'}</h2>
                    <Button
                      onClick={() => setIsRenaming(true)}
                      variant="ghost"
                      size="sm"
                      className="text-cyan-400 hover:text-white"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <Button
                onClick={handleClosePreview}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6">
              {(() => {
                const imageMatch = previewItem.output?.match(/\[IMAGE_DISPLAY:(.*?)\]/);
                const videoMatch = previewItem.output?.match(/\[VIDEO_DISPLAY:(.*?)\]/);
                
                if (imageMatch) {
                  return (
                    <img 
                      src={imageMatch[1]} 
                      alt="Generated" 
                      className="w-full max-h-[60vh] object-contain rounded-lg border border-cyan-500/30"
                    />
                  );
                } else if (videoMatch) {
                  return (
                    <video 
                      src={videoMatch[1]} 
                      controls
                      autoPlay
                      loop
                      className="w-full max-h-[60vh] rounded-lg border border-pink-500/30"
                    >
                      Your browser does not support the video tag.
                    </video>
                  );
                } else {
                  return (
                    <pre className="text-gray-300 whitespace-pre-wrap">{previewItem.output}</pre>
                  );
                }
              })()}

              {/* Metadata */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-cyan-400 text-xs">Model</div>
                  <div className="text-white">{previewItem.model || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-cyan-400 text-xs">Date</div>
                  <div className="text-white">{new Date(previewItem.created_at).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-cyan-400 text-xs">Temperature</div>
                  <div className="text-white">{previewItem.temperature || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-cyan-400 text-xs">Top-K</div>
                  <div className="text-white">{previewItem.top_k || 'N/A'}</div>
                </div>
              </div>

              {/* Tags */}
              {previewItem.tags && previewItem.tags.length > 0 && (
                <div className="mt-4">
                  <div className="text-cyan-400 text-xs mb-2">Tags</div>
                  <div className="flex flex-wrap gap-2">
                    {previewItem.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-neutral-800 rounded text-xs text-gray-300">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 bg-neutral-900 border-t border-cyan-500/30 p-4 flex items-center justify-end gap-3">
              <Button
                onClick={handleDownload}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={handleDelete}
                variant="outline"
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Link href={`/library/${previewItem.id}`}>
                <Button variant="outline" className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10">
                  View Details
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
