import { GentryEvent, RouteResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.zndra.xyz";

export async function routePrompt(prompt: string): Promise<RouteResponse> {
  const res = await fetch(`${API_URL}/route`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    throw new Error(`Route request failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchEvents(limit: number = 30): Promise<GentryEvent[]> {
  const res = await fetch(`${API_URL}/events?limit=${limit}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Events fetch failed: ${res.status}`);
  }
  const raw = await res.json();
  // stages_json comes back as a string from SQLite - parse it into `stages`
  return raw.map((e: GentryEvent) => ({
    ...e,
    stages: e.stages_json ? JSON.parse(e.stages_json) : [],
  }));
}
