"use client";
import { useEffect, useState } from "react";
import { ProgressiveResponse } from "./ProgressiveResponse";

export default function ModelConsole() {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [temperature, setTemperature] = useState(0.7);
  const [topK, setTopK] = useState(20);
  const [maxTokens, setMaxTokens] = useState(40);
  const [responseStyle, setResponseStyle] = useState<"concise" | "detailed">("concise");

  // NEW:
  const [stream, setStream] = useState(true);
  const [parentId, setParentId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const p = url.searchParams.get("prompt");
      if (p) setPrompt(p);
      const pid = url.searchParams.get("parent_id");
      if (pid) setParentId(pid);
    } catch {}
  }, []);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setLoading(true); setError(null); setOutput("");

    const payload = JSON.stringify({
      prompt,
      max_tokens: maxTokens,
      temperature,
      top_k: topK,
      response_style: responseStyle,
    });

    try {
      if (!stream) {
        // existing non-streaming path
        const r = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
        const data = await r.json();
        if (!r.ok || data.error) throw new Error(data.error || "Request failed");
        const text = String(data.output ?? "");
        setOutput(text);
        // fire-and-forget log
        fetch("/api/save-generation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, output: text, model: "mini_llm", temperature, top_k: topK, parent_id: parentId }),
        }).catch(() => {});
      } else {
        // streaming with SSE
        const r = await fetch("/api/generate-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
        if (!r.ok || !r.body) throw new Error("Stream failed to start");
        const reader = r.body.getReader();
        const dec = new TextDecoder();

        let finalText = "";
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += dec.decode(value, { stream: true });

          // parse SSE lines
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          for (const chunk of parts) {
            // lines like: "data: {...}" or "event: done"
            if (chunk.startsWith("event: done")) {
              // done event
              continue;
            }
            const line = chunk.split("\n").find(l => l.startsWith("data: "));
            if (!line) continue;
            try {
              const json = JSON.parse(line.slice(6).trim());
              if (typeof json.delta === "string") {
                finalText += json.delta;
                setOutput(prev => (prev ? prev + json.delta : json.delta));
              }
            } catch { /* ignore parse errors */ }
          }
        }

        // finished: log
        const text = finalText || output;
        if (text) {
          fetch("/api/save-generation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, output: text, model: "mini_llm", temperature, top_k: topK, parent_id: parentId }),
          }).catch(() => {});
        }
      }
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <h2 className="text-xl font-semibold">Mini LLM Console</h2>

      <textarea
        className="w-full min-h-[100px] p-3 rounded-xl bg-neutral-900 text-neutral-100 outline-none"
        placeholder="Type a prompt…"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      {/* NEW: controls */}
      <div className="grid grid-cols-3 gap-3 text-sm">
        <label className="space-y-1">
          <div className="opacity-80">Temperature: {temperature.toFixed(2)}</div>
          <input
            type="range" min={0.1} max={1.5} step={0.05}
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full"
          />
        </label>
        <label className="space-y-1">
          <div className="opacity-80">Top-K: {topK}</div>
          <input
            type="range" min={0} max={200} step={5}
            value={topK}
            onChange={(e) => setTopK(parseInt(e.target.value))}
            className="w-full"
          />
        </label>
        <label className="space-y-1">
          <div className="opacity-80">Max tokens: {maxTokens}</div>
          <input
            type="range" min={10} max={256} step={5}
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
            className="w-full"
          />
        </label>
      </div>

      {/* NEW: stream toggle */}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={stream} onChange={(e) => setStream(e.target.checked)} />
        <span>Stream tokens</span>
      </label>

      {/* Response style selector */}
      <div className="flex items-center gap-2 text-sm">
        <span>Response:</span>
        <select
          value={responseStyle}
          onChange={(e) => setResponseStyle(e.target.value)}
          className="rounded bg-neutral-800 text-neutral-100 px-2 py-1 text-xs"
        >
          <option value="concise">Concise</option>
          <option value="detailed">Detailed</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-4 py-2 rounded-2xl bg-cyan-600 disabled:opacity-50"
        >
          {loading ? (stream ? "Streaming…" : "Generating…") : "Generate"}
        </button>
      </div>

      {error && <div className="text-red-400">{error}</div>}

      {output ? (
        <ProgressiveResponse 
          content={output} 
          responseStyle={responseStyle}
          onShowMore={async (topic: string) => {
            // Make a follow-up API call asking for more details
            const followUpPrompt = `Can you explain more about "${topic}"? Please provide a detailed explanation with examples, code snippets, and best practices. 

IMPORTANT: Format your response with clear paragraphs. Each paragraph should be separated by a blank line (double line break). For example:

Paragraph 1 content here.

Paragraph 2 content here.

Paragraph 3 content here.

Make sure to use proper spacing between paragraphs for readability.`
            
            const payload = JSON.stringify({
              prompt: followUpPrompt,
              max_tokens: maxTokens,
              temperature,
              top_k: topK,
              response_style: "detailed",
            })

            try {
              if (stream) {
                // For streaming, collect the response
                let detailedResponse = ""
                const r = await fetch("/api/generate-stream", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: payload,
                })
                if (!r.ok || !r.body) throw new Error("Stream failed to start")
                const reader = r.body.getReader()
                const dec = new TextDecoder()

                while (true) {
                  const { value, done } = await reader.read()
                  if (done) break
                  const chunk = dec.decode(value, { stream: true })
                  detailedResponse += chunk
                }
                return detailedResponse
              } else {
                // For non-streaming
                const r = await fetch("/api/generate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: payload,
                })
                const data = await r.json()
                if (!r.ok || data.error) throw new Error(data.error || "Request failed")
                return String(data.output ?? "")
              }
            } catch (error) {
              console.error('Follow-up API call failed:', error)
              throw error
            }
          }}
        />
      ) : (
        <div className="rounded-2xl bg-black/60 p-4 whitespace-pre-wrap min-h-[120px]">
          <span className="opacity-50">Output will appear here…</span>
        </div>
      )}
    </div>
  );
}
