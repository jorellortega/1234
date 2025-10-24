"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteGenerationButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onDelete() {
    if (!confirm("Delete this generation? This cannot be undone.")) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/generations/${id}`, { method: "DELETE" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.error) throw new Error(data.error || "Delete failed");
      router.push("/library");
      router.refresh();
    } catch (e: any) {
      setErr(e.message || "Unknown error");
    } finally {
      setBusy(false);
    }
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onDelete}
        disabled={busy}
        className="px-3 py-1 rounded-lg bg-red-600/80 hover:bg-red-600 disabled:opacity-50"
      >
        {busy ? "Deleting…" : "Delete"}
      </button>
      {err && <span className="text-xs text-red-400">{err}</span>}
    </div>
  );
}
