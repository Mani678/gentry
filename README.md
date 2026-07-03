# Gentry — AI Runtime Optimizer Dashboard

A live routing console for the BTL Runtime Optimizer. Every request gets
classified, routed, cached, and explained in real time — shown as a
split-flap departure board.

## Local development

```bash
npm install
npm run dev
```

Visit http://localhost:3000. It talks to the live backend at
`https://api.zndra.xyz` by default (set in `.env.local`).

## Deploying to Vercel

1. Push this project to a GitHub repo.
2. In Vercel: **New Project** -> import that repo.
3. Add environment variable in Vercel project settings:
   - `NEXT_PUBLIC_API_URL` = `https://api.zndra.xyz`
4. Deploy.
5. Once deployed, go to **Settings -> Domains** and add `gentry.zndra.xyz`.
   Vercel will show you a DNS record (CNAME or A record) to add at your
   domain registrar (Namecheap -> Advanced DNS tab).

## Backend CORS

The backend (`api.py` on the Lightsail server) only allows requests from:
- `https://gentry.zndra.xyz`
- `http://localhost:3000` (for local dev)

If you deploy to a different Vercel URL (e.g. a preview deployment like
`gentry-abc123.vercel.app`) before the custom domain is attached, add that
URL to the `allow_origins` list in `api.py` on the server temporarily, or
just test against the custom domain once DNS is live.

## What's built
- Live polling of `GET /events` every 2 seconds
- Prompt submission via `POST /route`
- Split-flap board showing time, request, route (color-coded by tier),
  cost, and latency
- Expandable rows showing full reasoning, matched signals, and the
  counterfactual "what if a different model had been used" table
- Live stats: total requests, cache hits, actual spend, estimated savings
  vs. a naive always-use-large-model baseline

## Design notes
- Palette: charcoal background, amber for routing/medium tier, sage for
  small-tier/cache hits, rose for large-tier (highest cost)
- Type: Fraunces (serif, italic) for the "Gentry" wordmark only, Inter for
  UI text, IBM Plex Mono for all data (costs, latencies, technical labels)
- Signature interaction: new rows "flip" in like a physical departure
  board when a fresh request comes through
