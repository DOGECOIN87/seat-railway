<div align="center">

<img src="public/seat-railway-logo.svg" alt="Seat Railway" width="112" height="112">

# SEAT RAILWAY

**One train. Everyone's on it. Your bag is your seat.**

A train run by one number: its length, the line it runs on and the world it runs through are read live from its token's market,<br>
so the train on your screen *is* the chart — and its 118 seats go to the biggest holders, in order.

[![Ride now](https://img.shields.io/badge/ride%20now-seat--railway.space-00C9F1?style=for-the-badge&logo=googlechrome&logoColor=white)](https://seat-railway.space/)
[![Read the docs](https://img.shields.io/badge/read%20the%20docs-docs%2F-0E2E5E?style=for-the-badge&logo=gitbook&logoColor=white)](docs/README.md)

[![Deploy to GitHub Pages](https://github.com/DOGECOIN87/seat-railway/actions/workflows/deploy.yml/badge.svg)](https://github.com/DOGECOIN87/seat-railway/actions/workflows/deploy.yml)
[![MIT licence](https://img.shields.io/badge/licence-MIT-0E2E5E)](LICENSE)

<img src="docs/.gitbook/assets/exterior.jpg" alt="The Seat Railway train running through farmland" width="100%">

<sub>Train **SR350** · Express · rendered live in the browser</sub>

</div>

---

## Contents

- [The premise](#the-premise)
- [How the train shows the market cap](#how-the-train-shows-the-market-cap)
- [The line's tiers](#the-lines-tiers)
- [Runaway](#runaway)
- [Weather](#weather)
- [On board](#on-board)
- [The token](#the-token)
- [Explore the documentation](#explore-the-documentation)
- [For developers](#for-developers) — [architecture](#architecture) · [quick start](#quick-start) · [project structure](#project-structure) · [configuration](#configuration) · [deploying](#deploying)
- [Licence](#licence)

## The premise

| | |
| :-- | :-- |
| **Market cap is the length of the train** | A carriage is coupled on at every 1-2-5 step from $10K — $10K, $20K, $50K, $100K … — up to fourteen at $200M. Fall back under a milestone and a carriage is left behind on the line. |
| **Market cap is where the line goes** | Open country, then a market town at $100K and the city at $400K; a viaduct above the clouds at $1M, space at $10M, the moon at $50M, Mars at $100M. |
| **The five-minute move is the grade** | A rising market lays the line ahead uphill, a falling one downhill, so the track behind the train is the chart. |
| **Your bag is your seat** | The 118 biggest holders are seated by rank, driver's cab first. Everyone else rides in the freight car. |
| **Seats are finite** | Out-hold the holder in front of you and you take their seat — and the PA tells the whole train. |
| **Every seat is a billboard** | A seated holder can put a square image on their seat. It moves with them, and goes up on the billboards beside the line. |
| **Your seat is which room you are in** | In the directory you see and reach your own coach, and nobody else's. |

> [!IMPORTANT]
> Seat Railway never asks your wallet to approve a transaction. Every signature it requests is a plain-text message, and [Wallet safety](docs/safety/wallet-safety.md) prints each one word for word.

## How the train shows the market cap

| The market's… | …becomes |
| :-- | :-- |
| Market cap | **Length**: a carriage per milestone, coupling on from behind and uncoupled when lost |
| Market cap | **The cab's display**, and **the tier** the line runs through |
| Five-minute change | **The grade** of the line ahead, the **speed**, and the **signals** (green, amber, red) |
| Holder count | **Lit carriages**, front first, and **passengers** on board |
| Milestones | The **horn** when a carriage couples on, the **crossing bell** when one is left behind |

→ [One number runs the train](docs/how-it-runs/one-number-runs-the-train.md) · [How the train shows the market cap](docs/the-railway/market-cap-on-the-train.md)

## The line's tiers

Seven tiers, one number. Under $1M the ground itself changes with the market; from $1M the line leaves the ground. A tier is entered at its line and left 8% under it, so a market sitting on a line never flicks the world back and forth.

| Market cap | Tier | The line runs through |
| :-- | :-- | :-- |
| under $100K | **Countryside** | Farmland, forest, mountains, desert and coast, never repeating; buoys rocking off the coast |
| $100K | **Market Town** | A street grid with lane markings, lawns and houses, and shop buildings on the line with rooftop signs that light at night |
| $400K | **The City** | Glass towers on a wider grid, windows cut to scale and lit after dark, and a river crossed on a suspension bridge between stations |
| $1M | **Above the clouds** | A viaduct over the cloud deck |
| $10M | **Space** | A glowing guideway, a planet below |
| $50M | **The moon** | Craters and boulders under a black sky |
| $100M | **Mars** | Red plains and two small moons |

→ [The line's tiers](docs/how-it-runs/the-line.md)

<table>
<tr>
<td width="50%" valign="top">
<img src="docs/.gitbook/assets/levels/1-country.jpg" alt="The train running through farmland">

**Countryside** · under $100K<br>
<sub>Farmland, forest, snowy mountains, desert and coast, blending one into the next and never repeating. A station every couple of kilometres, billboards in between, and your own sky and weather. Then the town at $100K, and the city at $400K.</sub>
</td>
<td width="50%" valign="top">
<img src="docs/.gitbook/assets/levels/2-clouds.jpg" alt="The train on a viaduct above the clouds">

**Above the clouds** · $1M<br>
<sub>The line climbs onto a viaduct, its piers dropping away into a sea of cloud.</sub>
</td>
</tr>
<tr>
<td width="50%" valign="top">
<img src="docs/.gitbook/assets/levels/3-space.jpg" alt="The train on a guideway through space">

**Space** · $10M<br>
<sub>A guideway through the dark, rails glowing cyan, a planet far below.</sub>
</td>
<td width="50%" valign="top">
<img src="docs/.gitbook/assets/levels/4-moon.jpg" alt="The train crossing the moon">

**The moon** · $50M<br>
<sub>Craters, boulders and a black sky, with Earth hanging over the horizon.</sub>
</td>
</tr>
<tr>
<td colspan="2" valign="top">
<img src="docs/.gitbook/assets/levels/5-mars.jpg" alt="The train crossing the red plains of Mars">

**Mars** · $100M — the furthest out, so far<br>
<sub>Red plains and boulders under a butterscotch sky, with two small moons — and by now thirteen carriages behind the cab.</sub>
</td>
</tr>
</table>

## Runaway

The game on the way in. **The brakes are gone.** You drive a train on three parallel tracks and switch tracks to dodge what's coming:

* **Controls:** **←** / **→** (or A / D, or a tap or swipe).
* **Hazards:** oncoming trains, standing wagons, rockfalls and buffer stops, a wave at a time. Every wave leaves a way through.
* **Tokens:** gold tokens on the rails, 25 points each.
* **The twist:** about twenty seconds in, an alarm goes off and the train starts gathering speed until something stops it.

You score a metre a point and 25 a token. When you crash it ends on **WASTED**, and you can post your score to the **Top drivers** board with a signed message, never a transaction.

→ [Runaway](docs/the-game/runaway.md)

## Weather

The sky is the visitor's own (time of day, and live weather from Open-Meteo), drawn the way it looks from a train:

| | |
| :-- | :-- |
| **Rain** | Streaks stretched along each drop's motion past the camera, falling straight at a standstill and raking across the view at speed. The ground darkens, and the streets and rails turn glossy, then dry. |
| **Snow** | Flakes that flutter down, then settle on everything facing up, and melt away after. |
| **Storms** | Forked lightning off the line, a double-flicker flash lighting the sky and clouds. |
| **Fog** | Drifting ground mist. |
| **The sea** | Four swells per pixel, white-capped in a storm, with channel buoys rocking and flashing. |
| **On the glass** | Drops run back along the coach windows, and the cab's windscreen has working wipers. |

→ [The sky outside](docs/how-it-runs/the-sky.md)

## On board

<table>
<tr>
<td width="50%" valign="top">

### A real train, in 3D

The site opens on the train **full screen**, running through the country, in the Seat Railway livery — gloss black with a cyan line, the mark and **SEAT RAILWAY** in white on its flanks and the market cap on the cab's display. Press **Enter** to go in. Inside, the page opens **outside, on the whole train**; drag to walk round it. Step inside to a seat, or walk the train from the driver's cab to the freight car.

The train, the track, the station and the billboards are 3D models, converted for the web in [`public/models`](public/models/README.md).

→ [Views and controls](docs/the-train/views-and-controls.md)

</td>
<td width="50%" valign="top">

### The seat ladder

118 seats across five sections — **driver's cab, first class, business, exit row, standard** — filled strictly by rank. First Class has four private window suites, each with its own door, reclining chair, desk and reading light. Business and Standard use 2+2 seating around a central aisle. Your seat is your placement on the wall, the size of your tile, and which section's directory and room you belong to.

Check in with **Phantom, Solflare, Backpack or Nightly** and your ticket is issued on the spot.

→ [The seat ladder](docs/the-train/seat-ladder.md) · [Coaches and seats](docs/the-train/coaches-and-seats.md)

</td>
</tr>
<tr>
<td width="50%" valign="top">

### The wall, and the line

Every seat is a square, so every held seat is a billboard. Holders put a 1:1 image on the seat they hold, best placements at the front — and the same adverts go up on the billboards beside the line.

→ [Every seat is a billboard](docs/the-wall/every-seat-is-a-billboard.md) · [Proposal: buy trackside ad space with the token](docs/the-railway/billboards-for-the-token.md)

</td>
<td width="50%" valign="top">

### Section network

A holder directory with the train's own manners: publish a card, read your own coach's cards, introduce yourself, talk in your coach's room — and from the driver's cab, one PA announcement a day that the whole train hears.

→ [Your seat is which room you are in](docs/section-network/how-far-you-can-see.md)

</td>
</tr>
</table>

<div align="center">
<img src="docs/.gitbook/assets/departure-board.png" alt="The split-flap departure board the site opens on" width="560">
<br><sub>The site opens on a split-flap departure board, flap by flap — <a href="docs/for-developers/departure-board.md">how it works</a></sub>
</div>

> [!NOTE]
> Seat Railway began as a copy of [Seat Airlines](https://github.com/DOGECOIN87/Seat-Airlines). It now has its own interiors, its own game, and its own Worker and Helius key.<!-- interim-token --> It will have its own token too.<!-- /interim-token --> What changed: [What's new](docs/help/whats-new.md).

## The token

The train runs on one Solana token:

```
XXXXXXXXXXXXXXXXXXXXX
```

<!-- interim-token -->
**Seat Railway's own token hasn't launched yet.** Until it does, the site is connected to no token: the CA bar shows a placeholder, the train holds a steady opening reading of $163K (the Market Town tier), and nobody is seated.
<!-- /interim-token -->

Switching tokens is one command:

```bash
npm run token:update -- <new CA>
```

It checks on-chain that the address is a token mint, writes it to the page, the Worker, `index.html` and the docs, runs the tests and a build, and pushes. → [The token](docs/getting-started/the-token.md)

## Explore the documentation

The full guide is the [`docs/`](docs/README.md) folder of this repository, laid out for GitBook (`gitbook-docs.yaml`) whenever it is connected.

<table>
<tr>
<td width="25%" valign="top">

**Getting started**

- [Quick start](docs/getting-started/quick-start.md)
- [The token](docs/getting-started/the-token.md)
- [Connecting a wallet](docs/getting-started/connecting-a-wallet.md)

</td>
<td width="25%" valign="top">

**How it runs**

- [One number runs the train](docs/how-it-runs/one-number-runs-the-train.md)
- [The line's tiers](docs/how-it-runs/the-line.md)
- [The lamps and the PA](docs/how-it-runs/lamps-and-the-pa.md)
- [The sky outside](docs/how-it-runs/the-sky.md)

</td>
<td width="25%" valign="top">

**The train**

- [The seat ladder](docs/the-train/seat-ladder.md)
- [Coaches and seats](docs/the-train/coaches-and-seats.md)
- [Views and controls](docs/the-train/views-and-controls.md)
- [Your ticket](docs/the-train/your-ticket.md)

</td>
<td width="25%" valign="top">

**The railway & the wall**

- [How the train shows the market cap](docs/the-railway/market-cap-on-the-train.md)
- [Buy trackside ad space (proposal)](docs/the-railway/billboards-for-the-token.md)
- [Every seat is a billboard](docs/the-wall/every-seat-is-a-billboard.md)
- [Put an advert on your seat](docs/the-wall/put-an-advert-on-your-seat.md)
- [Runaway](docs/the-game/runaway.md)

</td>
</tr>
<tr>
<td valign="top">

**Section network**

- [Your seat is which room you are in](docs/section-network/how-far-you-can-see.md)
- [Cards and sign-in](docs/section-network/cards-and-sign-in.md)
- [Introductions, rooms and the PA](docs/section-network/introductions-rooms-and-the-pa.md)

</td>
<td valign="top">

**Safety & help**

- [Wallet safety](docs/safety/wallet-safety.md)
- [FAQ](docs/help/faq.md)
- [What's new](docs/help/whats-new.md)

</td>
<td colspan="2" valign="top">

**For developers**

- [How it is built](docs/for-developers/how-it-is-built.md) · [Engineering notes](docs/for-developers/engineering-notes.md)
- [Run it locally](docs/for-developers/run-it-locally.md) · [Configuration](docs/for-developers/configuration.md)
- [Worker API](docs/for-developers/worker-api.md) · [Deploying](docs/for-developers/deploying.md)
- [The departure board](docs/for-developers/departure-board.md)

</td>
</tr>
</table>

---

## For developers

<p>
<img alt="React 19" src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white">
<img alt="three.js" src="https://img.shields.io/badge/three.js-r185-000000?logo=threedotjs&logoColor=white">
<img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white">
<img alt="Vite" src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white">
<img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?logo=tailwindcss&logoColor=white">
<img alt="Cloudflare Workers" src="https://img.shields.io/badge/Cloudflare-Workers%20%C2%B7%20KV%20%C2%B7%20R2%20%C2%B7%20D1-F38020?logo=cloudflare&logoColor=white">
<img alt="Solana" src="https://img.shields.io/badge/Solana-mainnet-9945FF?logo=solana&logoColor=white">
</p>

### Architecture

The page is a static single-page app on GitHub Pages. Anything that has to be shared between visitors — adverts, the directory, the holder list — lives in one Cloudflare Worker, which holds the RPC key so no browser ever has to.

```mermaid
flowchart LR
    subgraph Browser["seat-railway.space · GitHub Pages"]
        UI["React 19 + Tailwind 4<br/>the page, the seat map, the directory"]
        GL["three.js<br/>the train, the line, its tiers, the weather"]
        UI --- GL
    end
    JUP[("Jupiter<br/>market data")] -->|"market cap · 5m move · holders"| UI
    OM[("Open-Meteo<br/>weather")] -->|"live sky"| UI
    UI <-->|"adverts · directory · holder list"| W["Cloudflare Worker"]
    W --- KV[("KV<br/>records")]
    W --- R2[("R2<br/>artwork")]
    W --- D1[("D1<br/>cards · messages")]
    W -->|"holder list, cached a minute"| RPC[("Helius RPC<br/>the railway's own key")]
```

The train is built in [`src/three/RailWorld.ts`](src/three/RailWorld.ts) and sized by the pure functions in [`src/lib/consist.ts`](src/lib/consist.ts). The seat ladder lives in [`src/lib/seating.ts`](src/lib/seating.ts) — no browser and no Cloudflare in it — and the page and the Worker import the same file, so they cannot disagree about who sits where. → [How it is built](docs/for-developers/how-it-is-built.md) · [Engineering notes](docs/for-developers/engineering-notes.md)

> [!NOTE]
> The railway has its **own Worker**, `seat-railway-banners`, with its own storage — it shares nothing with Seat Airlines. Deploying it needs the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets, and the railway's own Helius key as `HELIUS_API_KEY` (or a whole `RPC_URL`). → [Deploying](docs/for-developers/deploying.md)

### Quick start

Requires **Node 22**.

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # the page's unit suites
npm run build        # typecheck, then bundle to dist/
```

To run the Worker locally too — Miniflare, with simulated KV, R2 and D1 — see [Run it locally](docs/for-developers/run-it-locally.md) and the [Worker's README](worker/README.md).

### Project structure

```
├── src/
│   ├── App.tsx              the landing, then the page: the view, its section panels
│   ├── components/          views, the seat map, the directory, the departure board
│   ├── three/               RailWorld.ts (the train, the line, the tiers), railInterior, railWeather, railHazards
│   ├── lib/                 consist, tiers, railGame (Runaway), market feed, seating, wallet, directory client
│   └── content/cabin.ts     the coaches' layout and copy
├── public/
│   ├── models/              the train, track, station, billboard, town shops and city bridge (GLB)
│   ├── textures/            the town's and the city's paving
│   └── rail/                the track loop, horns and crossing bell
├── worker/                  the Cloudflare Worker: adverts, directory, holders
├── docs/                    the documentation (GitBook-ready)
├── scripts/models/          how the models were converted
├── test/                    unit suites for the page
└── gitbook-docs.yaml        the GitBook site contract
```

### Configuration

Every setting is optional, and every `VITE_` value is **public** — Vite writes it into the bundle — so they are repository *variables*, never secrets.

| Variable | What it does |
| :-- | :-- |
| `VITE_TOKEN_MINT` | The token the train reads; overrides the committed address |
| `VITE_BANNERS_API` | The Worker: the advert wall, and by default everything else |
| `VITE_HOLDERS_URL` | An indexer for the holder list, if you have one |
| `VITE_DOCS_URL` | Where the **Docs** link goes (today: the `docs/` folder on GitHub) |

> [!WARNING]
> Leave `VITE_RPC_URL` unset in production. Its URL — key and all — would ship to every visitor. The Worker holds the RPC endpoint as a secret instead.

The full list, and the Worker's bindings and secrets: [Configuration](docs/for-developers/configuration.md).

### Deploying

| What | How |
| :-- | :-- |
| **The page** | Every push to `main` runs the tests, builds and publishes to GitHub Pages at [seat-railway.space](https://seat-railway.space/) — once Pages is turned on (**Settings → Pages → Source: GitHub Actions**). |
| **The Worker** | Pushes that touch `worker/` type-check, test and deploy `seat-railway-banners` — when the repository has the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets. |
| **Helius** | Add the railway's own Helius key as the `HELIUS_API_KEY` secret and run **Set the Worker's RPC secret**: it checks the key answers, then writes it to the Worker. → [Configuration → Helius](docs/for-developers/configuration.md#helius) |
| **A new token** | `npm run token:update -- <new CA>`: checks on-chain that it is a token mint, writes it everywhere it is printed (page, Worker, `index.html`, docs), runs the tests and a build, and pushes. `--no-push` stops before committing. |

Step by step, including a custom domain: [Deploying](docs/for-developers/deploying.md).

## Licence

[MIT](LICENSE) © 2026 Matt Mobley

<div align="center">
<br>
<sub><b>SEAT RAILWAY</b> · Train SR350 · Express · <i>Hold more. Ride longer.</i></sub>
</div>
