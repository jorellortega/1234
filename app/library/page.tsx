"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import LibraryControls from "./LibraryControls";
import Link from "next/link";
import { Settings, Home, BookUser, BrainCircuit, User, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

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

export default function LibraryPage() {
  const [data, setData] = useState<Row[]>([]);
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

        // Fetch only user's generations
        const { data: generations, error: fetchError } = await supabase
          .from("generations")
          .select("id, created_at, prompt, output, model, temperature, top_k, tags, notes")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(200);

        if (fetchError) {
          setError(fetchError.message);
        } else {
          setData(generations || []);
        }
      } catch (err) {
        setError("Failed to load library data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="relative min-h-screen w-full">
        <div className="aztec-background" />
        <div className="animated-grid" />
        <div className="relative z-10 flex flex-col min-h-screen p-4 md:p-6 lg:p-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
              <p className="text-cyan-400">Loading your generations...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen w-full">
        <div className="aztec-background" />
        <div className="animated-grid" />
        <div className="relative z-10 flex flex-col min-h-screen p-4 md:p-6 lg:p-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <p className="text-red-400 text-lg">Error: {error}</p>
              <Link href="/" className="text-cyan-400 hover:underline mt-4 block">← Back to Home</Link>
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
        <header className="flex flex-row justify-between items-start gap-2 sm:gap-4 mb-6 sm:mb-8">
          {/* Navigation */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <Link href="/" className="flex items-center gap-1 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10">
              <Home className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline text-sm">Home</span>
            </Link>
            <Link
              href="/memory-core"
              className="flex items-center gap-1 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10"
            >
              <BrainCircuit className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline text-sm">Memory Core</span>
            </Link>
            <Link
              href="/ai-settings"
              className="flex items-center gap-1 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10"
            >
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline text-sm">AI Settings</span>
            </Link>
          </div>

          {/* User Actions */}
          {user ? (
            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/profile"
                className="flex items-center gap-1 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Profile</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/login"
                className="flex items-center gap-1 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10"
              >
                <span className="text-xs sm:text-sm">Sign In</span>
              </Link>
              <Link
                href="/signup"
                className="flex items-center gap-1 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10"
              >
                <span className="text-xs sm:text-sm">Sign Up</span>
              </Link>
            </div>
          )}
        </header>

        {/* Main Content */}
        <main className="flex-1 space-y-4 sm:space-y-6">
          <div className="text-center mb-4 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 sm:mb-4">
              <span className="text-cyan-400">Library</span>
            </h1>
            <p className="text-gray-300 text-sm sm:text-base md:text-lg">
              Your AI generation archive
            </p>
          </div>

          <div className="max-w-7xl mx-auto">
            <LibraryControls initial={data} />
          </div>
        </main>
      </div>
    </div>
  );
}
