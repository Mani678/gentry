"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { fetchEvents, routePrompt } from "@/lib/api";
import { GentryEvent } from "@/lib/types";

const ROUTE_COLOR: Record<string, string> = {
  small: "var(--sage)",
  medium: "var(--amber)",
  large: "var(--rose)",
};

function routeLabel(e: GentryEvent): string {
  if (e.cache_result?.startsWith("hit")) return "cache";
  if (e.selected_model) return e.selected_model;
  return e.final_route || e.rule_matched;
}

function routeColor(e: GentryEvent): string {
  if (e.cache_result?.startsWith("hit")) return "var(--sky)";
  if (e.selected_model && ROUTE_COLOR[e.selected_model]) return ROUTE_COLOR[e.selected_model];
  return "var(--muted)";
}

function formatCost(cost: number): string {
  if (cost === 0) return "$0.00000";
  return `$${cost.toFixed(5)}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour12: false });
}

function ExamplePrompts({ onPick }: { onPick: (p: string) => void }) {
  const examples = [
    "What is 15 x 26?",
    "What is the capital of Ghana?",
    "Summarize this document for me",
    "Fix this bug in my auth function ```function login() {}```",
    "Explain the tradeoffs of microservices vs monoliths and also discuss database sharding and also caching strategies",
  ];
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {examples.map((ex) => (
        <button
          key={ex}
          onClick={() => onPick(ex)}
          className="text-xs px-3 py-1.5 rounded-full border border-panel-border text-muted hover:text-off-white hover:border-amber-dim transition-colors font-mono-data cursor-pointer"
        >
          {ex.length > 40 ? ex.slice(0, 40) + "…" : ex}
        </button>
      ))}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="border border-panel-border bg-panel rounded-lg px-5 py-4 flex-1 min-w-[140px]">
      <div className="text-[11px] uppercase tracking-widest text-muted mb-1.5">{label}</div>
      <div
        className="text-2xl font-mono-data font-medium"
        style={{ color: accent || "var(--off-white)" }}
      >
        {value}
      </div>
    </div>
  );
}

function BoardRow({
  event,
  isNew,
  expanded,
  onToggle,
}: {
  event: GentryEvent;
  isNew: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const stages = event.stages || [];
  const classifiedStage = stages.find((s) => s.stage === "classified");
  const routingStage = stages.find((s) => s.stage === "routing_decision");
  const cacheStage = stages.find((s) => s.stage === "cache_check");
  const color = routeColor(event);

  return (
    <div
      className={`border-b border-panel-border last:border-b-0 ${isNew ? "board-row-enter" : ""}`}
    >
      <button
        onClick={onToggle}
        className="w-full grid grid-cols-[70px_1fr_90px_90px_80px_70px] gap-3 items-center px-4 py-3 text-left hover:bg-panel/60 transition-colors cursor-pointer"
      >
        <span className="font-mono-data text-xs text-muted-dim">{formatTime(event.timestamp)}</span>
        <span className="font-mono-data text-sm text-off-white truncate">
          {event.prompt_preview || "—"}
        </span>
        <span
          className="font-mono-data text-xs font-medium px-2 py-1 rounded text-center uppercase tracking-wide"
          style={{ color, backgroundColor: `${color}1a`, border: `1px solid ${color}44` }}
        >
          {routeLabel(event)}
        </span>
        <span className="font-mono-data text-xs text-muted text-right">
          {formatCost(event.actual_cost)}
        </span>
        <span className="font-mono-data text-xs text-muted text-right">
          {event.actual_latency_s.toFixed(3)}s
        </span>
        <span className="font-mono-data text-xs text-muted-dim text-right">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 bg-charcoal/40">
          {event.response && (
            <div className="mb-4">
              <div className="text-[11px] uppercase tracking-widest text-muted mb-2">Response</div>
              <p className="text-sm text-off-white font-mono-data leading-relaxed whitespace-pre-wrap bg-panel/60 border border-panel-border rounded-md px-3 py-2.5">
                {event.response}
              </p>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted mb-2">Reasoning</div>
              <p className="text-sm text-off-white/90 font-mono-data leading-relaxed">
                {routingStage?.reason || "Served from cache — no routing decision needed."}
              </p>
              {cacheStage && (
                <p className="text-xs text-muted mt-2 font-mono-data">
                  Cache: {cacheStage.result === "hit" ? "hit" : "miss"}
                  {typeof cacheStage.closest_match_similarity === "number" &&
                    ` (closest match ${(cacheStage.closest_match_similarity * 100).toFixed(0)}%)`}
                </p>
              )}
              {classifiedStage?.signals && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {Object.entries(classifiedStage.signals)
                    .filter(([, v]) => v === true)
                    .map(([k]) => (
                      <span
                        key={k}
                        className="text-[10px] font-mono-data px-2 py-0.5 rounded-full border border-panel-border text-muted"
                      >
                        {k.replace(/^is_|^has_/, "").replace(/_/g, " ")}
                      </span>
                    ))}
                </div>
              )}
            </div>

            {routingStage?.counterfactuals && routingStage.counterfactuals.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-widest text-muted mb-2">
                  What if a different model had been used?
                </div>
                <table className="w-full text-xs font-mono-data">
                  <thead>
                    <tr className="text-muted-dim border-b border-panel-border">
                      <th className="text-left font-normal pb-1.5">Model</th>
                      <th className="text-right font-normal pb-1.5">Cost</th>
                      <th className="text-right font-normal pb-1.5">Latency</th>
                      <th className="text-left font-normal pb-1.5 pl-3">Why not</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routingStage.counterfactuals.map((cf) => {
                      const selected = cf.model === event.selected_model;
                      return (
                        <tr
                          key={cf.model}
                          className={selected ? "text-off-white" : "text-muted"}
                        >
                          <td className="py-1.5 uppercase" style={{ color: selected ? ROUTE_COLOR[cf.model] : undefined }}>
                            {cf.model} {selected && "←"}
                          </td>
                          <td className="text-right py-1.5">${cf.estimated_cost.toFixed(3)}</td>
                          <td className="text-right py-1.5">{cf.estimated_latency_s.toFixed(1)}s</td>
                          <td className="py-1.5 pl-3 text-[11px]">{cf.why_not || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [events, setEvents] = useState<GentryEvent[]>([]);
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const knownIds = useRef<Set<string>>(new Set());

  const poll = useCallback(async () => {
    try {
      const fresh = await fetchEvents(30);
      const incomingNew = fresh.filter((e) => !knownIds.current.has(e.request_id));
      if (incomingNew.length > 0) {
        setNewIds(new Set(incomingNew.map((e) => e.request_id)));
        setTimeout(() => setNewIds(new Set()), 500);
      }
      fresh.forEach((e) => knownIds.current.add(e.request_id));
      setEvents(fresh);
      setError(null);
    } catch {
      setError("Can't reach the Gentry backend right now.");
    }
  }, []);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [poll]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await routePrompt(prompt.trim());
      setPrompt("");
      await poll();
      setExpandedId(result.event.request_id);
    } catch {
      setError("Request failed — the backend may be waking up. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalRequests = events.length;
  const cacheHits = events.filter((e) => e.cache_result?.startsWith("hit")).length;
  const totalActualCost = events.reduce((sum, e) => sum + (e.actual_cost || 0), 0);
  const totalBaselineCost = events.reduce((sum, e) => {
    const routingStage = e.stages?.find((s) => s.stage === "routing_decision");
    const largeCf = routingStage?.counterfactuals?.find((cf) => cf.model === "large");
    return sum + (largeCf ? largeCf.estimated_cost : 0.03);
  }, 0);
  const savings = totalBaselineCost - totalActualCost;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-panel-border px-6 py-6 md:px-10">
        <div className="max-w-5xl mx-auto flex items-baseline justify-between flex-wrap gap-2">
          <div>
            <h1 className="font-serif-display italic text-3xl md:text-4xl text-off-white tracking-tight">
              Gentry
            </h1>
            <p className="text-sm text-muted mt-1 font-mono-data">
              live routing console — BTL Runtime Optimizer
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted font-mono-data">
            <span className="w-2 h-2 rounded-full bg-sage live-dot" />
            connected to api.zndra.xyz
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 md:px-10 py-8">
        <div className="max-w-5xl mx-auto flex flex-col gap-8">
          <section>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                value={prompt}
                onChange={(ev) => setPrompt(ev.target.value)}
                placeholder="Ask anything — Gentry decides how to handle it…"
                className="flex-1 bg-panel border border-panel-border rounded-lg px-4 py-3 text-sm font-mono-data text-off-white placeholder:text-muted-dim focus:outline-none focus:border-amber-dim focus-visible:ring-2 focus-visible:ring-amber-dim/40"
              />
              <button
                type="submit"
                disabled={submitting || !prompt.trim()}
                className="px-5 py-3 rounded-lg bg-amber text-charcoal text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all cursor-pointer"
              >
                {submitting ? "Routing…" : "Dispatch"}
              </button>
            </form>
            <ExamplePrompts onPick={setPrompt} />
            {error && <p className="text-xs text-rose mt-3 font-mono-data">{error}</p>}
          </section>

          <section className="flex gap-3 flex-wrap">
            <StatCard label="Requests" value={String(totalRequests)} />
            <StatCard label="Cache hits" value={String(cacheHits)} accent="var(--sky)" />
            <StatCard label="Actual spend" value={formatCost(totalActualCost)} />
            <StatCard
              label="Saved vs. always-large"
              value={savings >= 0 ? `+${formatCost(savings)}` : formatCost(savings)}
              accent="var(--sage)"
            />
          </section>

          <section>
            <div className="text-[11px] uppercase tracking-widest text-muted mb-2 px-1">
              Departures — live routing decisions
            </div>
            <div className="border border-panel-border rounded-lg bg-panel/40 overflow-hidden">
              <div className="grid grid-cols-[70px_1fr_90px_90px_80px_70px] gap-3 px-4 py-2.5 border-b border-panel-border text-[10px] uppercase tracking-widest text-muted-dim">
                <span>Time</span>
                <span>Request</span>
                <span className="text-center">Route</span>
                <span className="text-right">Cost</span>
                <span className="text-right">Latency</span>
                <span></span>
              </div>
              {events.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted font-mono-data">
                  No requests yet — dispatch one above to see it routed live.
                </div>
              ) : (
                events.map((e) => (
                  <BoardRow
                    key={e.request_id}
                    event={e}
                    isNew={newIds.has(e.request_id)}
                    expanded={expandedId === e.request_id}
                    onToggle={() =>
                      setExpandedId(expandedId === e.request_id ? null : e.request_id)
                    }
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-panel-border px-6 md:px-10 py-5">
        <div className="max-w-5xl mx-auto text-xs text-muted-dim font-mono-data">
          Built for the BTL Runtime Hackathon · every request classified, routed, and explained in real time
        </div>
      </footer>
    </div>
  );
}
