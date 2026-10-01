---
description: A static page, one Worker, and a seating chart both of them share.
---

# How it is built

Seat Railway is two deployments:

| Part | What it is | Where it runs |
| --- | --- | --- |
| **The page** | A static single-page app: React 19, Vite, Tailwind CSS 4 and three.js | GitHub Pages, at `seat-railway.space` |
| **The Worker** | One Cloudflare Worker, `seat-railway-banners` — the railway's own, with its own storage | Cloudflare, with KV, R2 and D1 bound to it |

The page reads three outside services:

| Service | For | From |
| --- | --- | --- |
| Jupiter token API | Market cap, the five-minute move, the holder count | The browser, every 20 s |
| Solana | Balances and the holder list | The Worker, which holds the RPC endpoint as a secret |
| Open-Meteo | Weather along the line | The browser |

## What the Worker does

* **The wall** — stores adverts against the wallet that signed them: records in KV, artwork in R2 (or in KV when R2 has no public URL).
* **The holder list** — reads every holder from the chain, caches it for a minute, and serves it to every visitor, so no RPC key is ever shipped to a browser.
* **The directory** — cards, introductions, rooms and the PA, in a D1 database, behind a signed-in session.
* **The manual controls** — the operator's shared switches (camera, hour, weather), which every open page reads.
* **The Runaway board** — starts each run on the server's clock and checks every posted score against it (`worker/src/railLeaderboard.ts`).

## The train

`src/three/RailWorld.ts` builds the outside view. That covers:

* the line's centreline (curves of its own, grade from the market);
* the country in chunks, recycled from behind the train to ahead of it;
* the detailed track tiled near the camera;
* the stations and billboards;
* the train itself, coupled to the market cap by `src/lib/consist.ts`.

Below $1M the ground changes tier with the market (`src/lib/tiers.ts`): country, then a market town, then the city with its river bridges. The supplied models are in `public/models/` (see its README for where each came from), the town's paving textures in `public/textures/`, and the train's sounds in `public/rail/`.

The weather (`src/three/railWeather.ts`) draws rain, snow, lightning and mist round the camera. The interiors (`src/three/railInterior.ts`) are the train's own coaches, First Class suites, driver's cab and freight car, with rain on their glass. Runaway's hazards and tokens are `src/three/railHazards.ts`, placed on the line by the world from the game's state.

## One seating chart, shared

Who sits where decides who may read whose contact details, so it is a boundary rather than a layout — and a boundary enforced only in the browser is not one. The seat ladder therefore lives in `src/lib/seating.ts`, plain TypeScript with no browser and no Cloudflare in it, and **the page and the Worker import the same file**. So do `src/lib/holderList.ts`, which reads the holder list, and `src/lib/manualControls.ts`, which clamps the manual controls. There is one copy of each rule, not two that could drift.

## Where things are

```
src/
├── App.tsx                  the page
├── index.css                the design system and the animations
├── content/cabin.ts         seat layout, coach copy, chatter, the board's phrases
├── lib/
│   ├── flightModel.ts       bands, lamps, formatting — pure functions
│   ├── tiers.ts             the line's tiers by market cap — pure functions
│   ├── consist.ts           carriages, grade and speed from the market — pure functions
│   ├── railGame.ts          Runaway: the game itself, shared with the Worker's checks
│   ├── marketFeed.ts        the market feed (Jupiter)
│   ├── seating.ts           the seat ladder, shared with the Worker
│   ├── holderList.ts        reading every holder, shared with the Worker
│   ├── banners.ts           the advert wall and the house adverts
│   ├── networkingApi.ts     the directory, over the wire
│   ├── sky.ts               the sun and the weather
│   └── token.ts             the contract address
├── three/                   RailWorld.ts (the train, the line, the tiers), railInterior.ts, railWeather.ts, railHazards.ts
└── components/              the views, the wall, check-in, the hub, the board
worker/
├── src/index.ts             every route
├── src/verify.ts            signature and image checks
├── src/networking.ts        directory rules and limits
├── src/railLeaderboard.ts   Runaway's score checks
└── migrations/              the D1 schema
docs/                        this documentation
```

## Performance, briefly

* Every view animates off refs through **one** `requestAnimationFrame` loop, so the instruments never re-render React at 60 fps.
* Polling pauses in background tabs and aborts superseded requests.
* The 3D scene adapts its pixel ratio to measured render time, and React and three.js ship as separate cached chunks.
* `prefers-reduced-motion` drops the animation loop: values snap, and the view is repainted on a slow cadence.

The repository's own [README](https://github.com/DOGECOIN87/seat-railway#readme) and [`worker/README.md`](https://github.com/DOGECOIN87/seat-railway/blob/main/worker/README.md) go deeper on every decision here.
