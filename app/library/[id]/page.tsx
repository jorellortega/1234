"use client";
import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase-client";
import Link from "next/link";
import TagEditor from "@/components/TagEditor";
import NotesEditor from "./NotesEditor";
import { ProgressiveResponse } from "@/components/ProgressiveResponse";
import { useRouter } from "next/navigation";
import { Home, BookUser, BrainCircuit, User, LogOut, Settings } from "lucide-react";

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

type Child = {
  id: string;
  created_at: string;
};

export default function GenerationDetail({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params Promise using React.use()
  const { id } = use(params);
  
  const [row, setRow] = useState<Row | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user session
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          router.push("/login");
          return;
        }

        setUser(user);

        // Fetch the generation
        const { data: generation, error: fetchError } = await supabase
          .from("generations")
          .select("id, created_at, prompt, output, model, temperature, top_k, tags, notes")
          .eq("id", id)
          .eq("user_id", user.id)
          .single();

        if (fetchError) {
          setError(fetchError.message);
          return;
        }

        setRow(generation);

        // Fetch children
        const { data: childrenData } = await supabase
          .from("generations")
          .select("id, created_at")
          .eq("parent_id", id)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        setChildren(childrenData || []);
      } catch (err) {
        setError("Failed to load generation data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  if (loading) {
    return (
      <div className="relative min-h-screen w-full">
        <div className="aztec-background" />
        <div className="animated-grid" />
        <div className="relative z-10 flex flex-col min-h-screen p-4 md:p-6 lg:p-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
              <p className="text-cyan-400">Loading generation...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !row) {
    return (
      <div className="relative min-h-screen w-full">
        <div className="aztec-background" />
        <div className="animated-grid" />
        <div className="relative z-10 flex flex-col min-h-screen p-4 md:p-6 lg:p-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <p className="text-red-400 text-lg">Error: {error || "Generation not found"}</p>
              <Link href="/library" className="text-cyan-400 hover:underline mt-4 block">← Back to Library</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full">
      <div className="aztec-background" />
      <div className="animated-grid" />

      <div className="relative z-10 flex flex-col min-h-screen p-4 md:p-6 lg:p-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          {/* Navigation */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <Link href="/" className="flex items-center gap-1 sm:gap-2 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10">
              <Home className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline text-sm">Home</span>
            </Link>
            <Link href="/library" className="flex items-center gap-1 sm:gap-2 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10">
              <BookUser className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline text-sm">Library</span>
            </Link>
            <Link
              href="/memory-core"
              className="flex items-center gap-1 sm:gap-2 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10"
            >
              <BrainCircuit className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline text-sm">Memory Core</span>
            </Link>
            <Link
              href="/ai-settings"
              className="flex items-center gap-1 sm:gap-2 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10"
            >
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline text-sm">AI Settings</span>
            </Link>
          </div>

          {/* User Actions */}
          {user ? (
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <Link
                href="/profile"
                className="flex items-center gap-1 sm:gap-2 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Profile</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1 sm:gap-2 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <Link
                href="/login"
                className="flex items-center gap-1 sm:gap-2 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10"
              >
                <span className="text-sm">Sign In</span>
              </Link>
              <Link
                href="/signup"
                className="flex items-center gap-1 sm:gap-2 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10"
              >
                <span className="text-sm">Sign Up</span>
              </Link>
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className="flex-1 space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              <span className="text-cyan-400">Generation</span>
            </h1>
            <p className="text-gray-300 text-lg">
              AI generation details
            </p>
          </div>

          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Link
                  href={`/test-console?prompt=${encodeURIComponent(row.prompt ?? "")}&parent_id=${row.id}`}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white transition-colors"
                >
                  Re-run in Console
                </Link>
              </div>
              <Link href="/library" className="text-cyan-400 hover:underline">← Back to Library</Link>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-3 bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
              <div><div className="opacity-70 text-cyan-400">ID</div><div className="break-all text-white">{row.id}</div></div>
              <div><div className="opacity-70 text-cyan-400">Time</div><div className="text-white">{new Date(row.created_at).toLocaleString()}</div></div>
              <div><div className="opacity-70 text-cyan-400">Model</div><div className="text-white">{row.model ?? "mini_llm"}</div></div>
              <div><div className="opacity-70 text-cyan-400">Temperature</div><div className="text-white">{row.temperature ?? ""}</div></div>
              <div><div className="opacity-70 text-cyan-400">Top-K</div><div className="text-white">{row.top_k ?? ""}</div></div>
              <div><div className="opacity-70 text-cyan-400">Tags</div><div className="text-white">{(row.tags ?? []).map((t: string) => `#${t}`).join(" ")}</div></div>
            </div>

            <section className="space-y-4 bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Prompt</h2>
                <button
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white transition-colors"
                  onClick={async () => { await navigator.clipboard.writeText(row.prompt ?? ""); }}
                >
                  Copy
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-neutral-800 whitespace-pre-wrap text-gray-300 border border-neutral-700">{row.prompt}</pre>
            </section>

            <section className="space-y-4 bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
              <h2 className="text-xl font-semibold text-white">Output</h2>
              <div className="bg-neutral-800 p-4 rounded-xl border border-neutral-700">
                <ProgressiveResponse content={row.output ?? ""} responseStyle="detailed" />
              </div>
            </section>

            <div className="bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
              <NotesEditor id={row.id} initial={row.notes ?? null} />
            </div>

            <div className="bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-white">Tags</h2>
                <TagEditor id={row.id} initial={row.tags ?? []} />
              </section>
            </div>

            {children && children.length > 0 && (
              <section className="space-y-4 bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
                <h2 className="text-xl font-semibold text-white">Re-runs ({children.length})</h2>
                <ul className="list-disc ml-5 space-y-2">
                  {children.map((c) => (
                    <li key={c.id} className="text-gray-300">
                      <Link href={`/library/${c.id}`} className="text-cyan-400 hover:underline">
                        {new Date(c.created_at).toLocaleString()}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
