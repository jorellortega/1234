import { supabaseServer } from "@/lib/supabase-server";
import Link from "next/link";
import TagEditor from "@/components/TagEditor";
import NotesEditor from "./NotesEditor";
import { ProgressiveResponse } from "@/components/ProgressiveResponse";

export const dynamic = "force-dynamic";

async function getRow(id: string) {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("generations")
    .select("id, created_at, prompt, output, model, temperature, top_k, tags, notes")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export default async function GenerationDetail({ params }: { params: { id: string } }) {
  const row = await getRow(params.id);
  
  const supabase = supabaseServer();
  const { data: children } = await supabase
    .from("generations")
    .select("id, created_at")
    .eq("parent_id", params.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Generation</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/test-console?prompt=${encodeURIComponent(row.prompt ?? "")}&parent_id=${row.id}`}
            className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700"
          >
            Re-run in Console
          </Link>
          <Link href="/library" className="text-cyan-400 hover:underline">← Back to Library</Link>
        </div>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <div><div className="opacity-70">ID</div><div className="break-all">{row.id}</div></div>
        <div><div className="opacity-70">Time</div><div>{new Date(row.created_at).toLocaleString()}</div></div>
        <div><div className="opacity-70">Model</div><div>{row.model ?? "mini_llm"}</div></div>
        <div><div className="opacity-70">Temperature</div><div>{row.temperature ?? ""}</div></div>
        <div><div className="opacity-70">Top-K</div><div>{row.top_k ?? ""}</div></div>
        <div><div className="opacity-70">Tags</div><div>{(row.tags ?? []).map((t: string) => `#${t}`).join(" ")}</div></div>
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Prompt</h2>
          <button
            className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700"
            onClick={async () => { await navigator.clipboard.writeText(row.prompt ?? ""); }}
          >
            Copy
          </button>
        </div>
        <pre className="p-4 rounded-2xl bg-neutral-900 whitespace-pre-wrap">{row.prompt}</pre>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Output</h2>
        <ProgressiveResponse content={row.output ?? ""} responseStyle="detailed" />
      </section>

      <NotesEditor id={row.id} initial={row.notes ?? null} />

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Tags</h2>
        <TagEditor id={row.id} initial={row.tags ?? []} />
      </section>

      {children && children.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-medium">Re-runs ({children.length})</h2>
          <ul className="list-disc ml-5">
            {children.map((c) => (
              <li key={c.id}>
                <Link href={`/library/${c.id}`} className="text-cyan-400 hover:underline">
                  {new Date(c.created_at).toLocaleString()}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
