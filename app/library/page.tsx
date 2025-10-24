import { supabaseServer } from "@/lib/supabase-server";
import LibraryControls from "./LibraryControls";
import Link from "next/link";
import { Settings } from "lucide-react";
export const dynamic = "force-dynamic";
const cut = (s: string, n = 140) =>
  s ? (s.length > n ? s.slice(0, n - 1) + "…" : s) : "";

export default async function LibraryPage() {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("generations")
    .select("id, created_at, prompt, output, model, temperature, top_k, tags, notes")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold">Library</h1>
        <p className="text-red-400 mt-4">Error: {error.message}</p>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Library</h1>
        <div className="flex items-center gap-4">
          <Link 
            href="/ai-settings" 
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm transition-colors"
          >
            <Settings className="h-4 w-4" />
            AI Settings
          </Link>
        </div>
      </div>
      <LibraryControls initial={data ?? []} />
    </main>
  );
}
