"use client";
import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, Trash2, Edit, X, Play, Pause } from "lucide-react";
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
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

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

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      setPlayingAudioUrl(null);
      setIsPaused(false);
    };
  }, []);

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
    const audioMatch = previewItem.output?.match(/\[AUDIO_DISPLAY:(.*?)\]/);
    
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
      } else if (audioMatch) {
        const response = await fetch(audioMatch[1]);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Infinito Audio.mp3`;
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
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <input
          placeholder="Search prompt/output…"
          className="px-3 py-2 rounded-xl bg-neutral-900 outline-none sm:col-span-2 lg:col-span-3 text-white"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Export Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="text-xs sm:text-sm opacity-80">
          Showing {rows.length} rows • Selected {selectedIds.length}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              const next: Record<string, boolean> = {};
              const allSelected = filteredIds.every(id => selected[id]);
              if (!allSelected) filteredIds.forEach(id => (next[id] = true));
              setSelected(allSelected ? {} : next);
            }}
            className="px-2 sm:px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs sm:text-sm whitespace-nowrap"
          >
            {filteredIds.every(id => selected[id]) ? "Clear" : "Select all"}
          </button>
          <button
            onClick={bulkDelete}
            disabled={selectedIds.length === 0}
            className="px-2 sm:px-3 py-1 rounded-lg bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-xs sm:text-sm whitespace-nowrap"
          >
            Delete selected
          </button>
          <a
            href={exportHref}
            className="px-2 sm:px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs sm:text-sm whitespace-nowrap"
          >
            Export CSV
          </a>
          <a
            href={exportJsonHref}
            className="px-2 sm:px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs sm:text-sm whitespace-nowrap"
          >
            Export JSON
          </a>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-neutral-800 -mx-4 sm:mx-0">
        <table className="w-full text-xs sm:text-sm">
          <thead className="bg-neutral-900">
            <tr>
              <th className="text-left p-2 sm:p-3">
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
              <th className="text-left p-2 sm:p-3">Output</th>
              <th className="text-left p-2 sm:p-3">Time</th>
              <th className="text-left p-2 sm:p-3">Prompt</th>
              <th className="text-left p-2 sm:p-3 hidden md:table-cell">Tags</th>
              <th className="text-left p-2 sm:p-3 hidden lg:table-cell">Notes</th>
              <th className="text-left p-2 sm:p-3 hidden lg:table-cell">Model</th>
              <th className="text-left p-2 sm:p-3 hidden lg:table-cell">Temp</th>
              <th className="text-left p-2 sm:p-3 hidden lg:table-cell">Top-K</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-neutral-800 align-top hover:bg-neutral-900/50">
                <td className="p-2 sm:p-3">
                  <input
                    type="checkbox"
                    checked={!!selected[r.id]}
                    onChange={() => toggle(r.id)}
                    aria-label={`select ${r.id}`}
                  />
                </td>
                <td className="p-2 sm:p-3 max-w-[300px] sm:max-w-[500px] text-neutral-300">
                  {(() => {
                    // Check if output contains media display tags
                    const imageMatch = r.output?.match(/\[IMAGE_DISPLAY:(.*?)\]/);
                    const videoMatch = r.output?.match(/\[VIDEO_DISPLAY:(.*?)\]/);
                    const audioMatch = r.output?.match(/\[AUDIO_DISPLAY:(.*?)\]/);
                    
                    if (imageMatch) {
                      const imageUrl = imageMatch[1];
                      return (
                        <button 
                          onClick={() => handlePreview(r)}
                          className="flex items-center gap-2 sm:gap-3 hover:opacity-80 cursor-pointer"
                        >
                          <img 
                            src={imageUrl} 
                            alt="Generated" 
                            className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded border border-cyan-500/30"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                          <span className="text-cyan-400 text-sm">🖼️</span>
                        </button>
                      );
                    } else if (videoMatch) {
                      const videoUrl = videoMatch[1];
                      return (
                        <button 
                          onClick={() => handlePreview(r)}
                          className="flex items-center gap-2 sm:gap-3 hover:opacity-80 cursor-pointer"
                        >
                          <video 
                            src={videoUrl} 
                            className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded border border-pink-500/30"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                          <span className="text-pink-400 text-sm">🎬</span>
                        </button>
                      );
                    } else if (audioMatch) {
                      const audioUrl = audioMatch[1];
                      return (
                        <div className="flex items-center gap-2 sm:gap-3">
                          <button 
                            onClick={() => handlePreview(r)}
                            className="hover:opacity-80 cursor-pointer"
                          >
                            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-green-500/20 rounded border border-green-500/30 flex items-center justify-center">
                              <span className="text-green-400 text-2xl">🎵</span>
                            </div>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // If the same audio is playing, toggle play/pause
                              if (playingAudioUrl === audioUrl && currentAudioRef.current) {
                                if (isPaused) {
                                  currentAudioRef.current.play().catch(console.error);
                                  setIsPaused(false);
                                } else {
                                  currentAudioRef.current.pause();
                                  setIsPaused(true);
                                }
                                return;
                              }
                              
                              // Stop any currently playing audio
                              if (currentAudioRef.current) {
                                currentAudioRef.current.pause();
                                currentAudioRef.current.currentTime = 0;
                                currentAudioRef.current = null;
                              }
                              
                              // Create and play new audio
                              const audio = new Audio(audioUrl);
                              currentAudioRef.current = audio;
                              setPlayingAudioUrl(audioUrl);
                              setIsPaused(false);
                              audio.play().catch(console.error);
                              
                              // Clean up when audio ends
                              audio.onended = () => {
                                currentAudioRef.current = null;
                                setPlayingAudioUrl(null);
                                setIsPaused(false);
                              };
                            }}
                            className="w-8 h-8 sm:w-10 sm:h-10 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center transition-colors"
                            title={playingAudioUrl === audioUrl && !isPaused ? "Pause audio" : "Play audio"}
                          >
                            {playingAudioUrl === audioUrl && !isPaused ? (
                              <Pause className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            ) : (
                              <Play className="w-4 h-4 sm:w-5 sm:h-5 text-white ml-0.5" />
                            )}
                          </button>
                        </div>
                      );
                    } else {
                      return t(r.output, 200);
                    }
                  })()}
                </td>
                <td className="p-2 sm:p-3 whitespace-nowrap text-xs sm:text-sm">
                  <button 
                    onClick={() => handlePreview(r)}
                    className="text-cyan-400 hover:underline cursor-pointer"
                  >
                    {new Date(r.created_at).toLocaleString(undefined, { 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </button>
                </td>
                <td className="p-2 sm:p-3 max-w-[200px] sm:max-w-[320px]">{t(r.prompt, 120)}</td>
                <td className="p-2 sm:p-3 max-w-[220px] hidden md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {(r.tags ?? []).map(t => (
                      <span key={t} className="px-2 py-0.5 rounded-lg bg-neutral-800 text-xs">#{t}</span>
                    ))}
                  </div>
                </td>
                <td className="p-2 sm:p-3 max-w-[220px] hidden lg:table-cell">
                  {r.notes ? <span className="px-2 py-0.5 rounded-lg bg-neutral-800 text-xs">📝 notes</span> : ""}
                </td>
                <td className="p-2 sm:p-3 hidden lg:table-cell">{r.model ?? "mini_llm"}</td>
                <td className="p-2 sm:p-3 hidden lg:table-cell">{r.temperature ?? ""}</td>
                <td className="p-2 sm:p-3 hidden lg:table-cell">{r.top_k ?? ""}</td>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4"
          onClick={handleClosePreview}
        >
          <div 
            className="relative bg-neutral-900 rounded-2xl border border-cyan-500/30 max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-neutral-900 border-b border-cyan-500/30 p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-0">
              <div className="flex-1 w-full sm:w-auto">
                {isRenaming ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      value={newPrompt}
                      onChange={(e) => setNewPrompt(e.target.value)}
                      className="flex-1 px-3 py-2 bg-neutral-800 border border-cyan-500/30 rounded text-white text-sm"
                      placeholder="Enter new prompt..."
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleRename}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white flex-1 sm:flex-initial"
                        size="sm"
                      >
                        Save
                      </Button>
                      <Button
                        onClick={() => setIsRenaming(false)}
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-initial"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-xl font-semibold text-white break-words">{previewItem.prompt || 'Untitled'}</h2>
                    <Button
                      onClick={() => setIsRenaming(true)}
                      variant="ghost"
                      size="sm"
                      className="text-cyan-400 hover:text-white flex-shrink-0"
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
                className="text-gray-400 hover:text-white self-end sm:self-auto"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6">
              {(() => {
                const imageMatch = previewItem.output?.match(/\[IMAGE_DISPLAY:(.*?)\]/);
                const videoMatch = previewItem.output?.match(/\[VIDEO_DISPLAY:(.*?)\]/);
                const audioMatch = previewItem.output?.match(/\[AUDIO_DISPLAY:(.*?)\]/);
                
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
                } else if (audioMatch) {
                  return (
                    <div className="w-full flex flex-col items-center justify-center py-8 bg-green-500/10 rounded-lg border border-green-500/30">
                      <div className="text-green-400 text-6xl mb-4">🎵</div>
                      <audio 
                        src={audioMatch[1]} 
                        controls
                        className="w-full max-w-md"
                      >
                        Your browser does not support the audio tag.
                      </audio>
                      <p className="text-gray-400 text-sm mt-2">Click play to listen to the generated audio</p>
                    </div>
                  );
                } else {
                  return (
                    <pre className="text-gray-300 whitespace-pre-wrap">{previewItem.output}</pre>
                  );
                }
              })()}

              {/* Metadata */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm">
                <div>
                  <div className="text-cyan-400 text-xs">Date</div>
                  <div className="text-white text-xs sm:text-sm">{new Date(previewItem.created_at).toLocaleString()}</div>
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
            <div className="sticky bottom-0 bg-neutral-900 border-t border-cyan-500/30 p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 sm:gap-3">
              <Button
                onClick={handleDownload}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={handleDelete}
                variant="outline"
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Link href={`/library/${previewItem.id}`} className="w-full sm:w-auto">
                <Button variant="outline" className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 w-full" size="sm">
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
