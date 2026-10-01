---
description: Every setting the page and the Worker read, and which ones are public.
---

# Configuration

## The page: `VITE_` variables

Everything is optional — a build with none of them set runs the committed token against the production Worker. `.env.example` lists them all.

{% hint style="danger" %}
**Every `VITE_` value is public.** Vite writes it into the JavaScript bundle, where anyone can read it. Set them as repository **variables**, not secrets — a secret would hide the value from the repository and from nobody else. Never put an API key in one.
{% endhint %}

| Variable | Default | What it does |
| --- | --- | --- |
| `VITE_TOKEN_MINT` | the address in `src/lib/token.ts` | The token the train reads. Wins over the committed address when set. |
| `VITE_BANNERS_API` | `https://seat-railway-banners.trashmarket.workers.dev` | The Worker: the advert wall, and — unless `VITE_DIRECTORY_API` is set — everything else below. |
| `VITE_DIRECTORY_API` | `VITE_BANNERS_API` | The Worker for the directory, the holder list, balances and the manual controls. |
| `VITE_HOLDERS_URL` | the Worker's `/holders` | An indexer returning `[{ "address": "…", "balance": 123 }, …]`, if you have one. |
| `VITE_BANNERS_URL` | none | A curated, read-only wall: JSON of `{ "<seat>": { "image", "alt", "href" } }`. It overrides every other advert. |
| `VITE_MARKET_URL` | Jupiter's `tokens/v2/search` for the mint | Any JSON endpoint carrying market cap, the five-minute change and the holder count. Fields are found by name, at any depth. |
| `VITE_MANIFEST_SIZE` | 118 — the whole train | How many holders are seated. Must match the Worker's `MANIFEST_SIZE`. |
| `VITE_DOCS_URL` | the `docs/` folder on GitHub | Where the **Docs** link goes. Set it once the docs are published somewhere else, such as GitBook. |
| `VITE_RPC_URL` | none | A Solana RPC the **browser** calls. **Leave it unset in production**: its URL, key and all, ships to every visitor. When set, the page also uses it as a fallback for reading holders. |

A blank variable counts as unset, so passing an empty repository variable through the deploy workflow is harmless.

## The Worker: `worker/wrangler.toml`

**Bindings**

| Binding | Type | Holds |
| --- | --- | --- |
| `BANNERS` | KV | Advert records, the manual controls, and the artwork when R2 is not used |
| `IMAGES` | R2 | The artwork, when `PUBLIC_IMAGE_BASE` is also set |
| `DIRECTORY` | D1 | Cards, messages, sessions — schema in `worker/migrations/` |

**Variables and secrets**

| Name | Kind | What it does |
| --- | --- | --- |
| `TOKEN_MINT` | variable | The mint. Turns on the holder check for adverts and sign-in, and lets the directory tell the coaches apart. |
| `RPC_URL` | **secret** | The Solana RPC endpoint: the railway's own Helius URL (`https://mainnet.helius-rpc.com/?api-key=…`; see [Helius](#helius)) is recommended: the holder list is then read from Helius's `getTokenAccounts` index, far cheaper than a program scan. Unset, the Worker falls back to Solana's public endpoint, which rate-limits real traffic — set it. |
| `ALLOWED_ORIGINS` | variable | Comma-separated origins allowed to call the Worker. Production: `https://seat-railway.space,https://www.seat-railway.space`. Empty echoes any origin — fine locally, careless in production. |
| `HOLDERS_URL` | variable | An indexer, optional. If set, use the same feed as the page's `VITE_HOLDERS_URL`. |
| `MANIFEST_SIZE` | variable | Defaults to 118. Must match `VITE_MANIFEST_SIZE`. |
| `PUBLIC_IMAGE_BASE` | variable | The R2 bucket's public URL. Without it, artwork is kept in KV and served from `/images/…`. |
| `ADMIN_WALLET` | variable or secret | The operator wallet allowed to set the manual controls. |
| `LADDER_CACHE_MS`, `OWNER_CACHE_MS` | variable | Cache tuning: how long the holder list is kept (60 s by default), and how long a wallet is believed to hold the token (45 s). |

## Helius

Seat Railway reads its holders through [Helius](https://www.helius.dev/), as Seat Airlines does, but **with a key of its own**. Keep the railway's key separate from the airline's, so the two sites' traffic and rate limits never mix.

1. In the Helius dashboard, create a project for Seat Railway and copy its **API key**.
2. Under **Access control**, allow requests only from the Worker. The page never calls Helius itself; the Worker does it for everybody.
3. In this repository, **Settings → Secrets and variables → Actions → Secrets**, add **one** of:
   * `HELIUS_API_KEY`: just the key, or
   * `RPC_URL`: the whole endpoint, `https://mainnet.helius-rpc.com/?api-key=<key>`.
4. Run **Actions → Set the Worker's RPC secret**. It asks the endpoint for its health and for one page of Helius's `getTokenAccounts` index before writing anything, so a mistyped key fails there and not on the live site. It then writes the endpoint to the `seat-railway-banners` Worker as its `RPC_URL` secret. This takes effect immediately, with no redeploy.
5. Check `GET /health` on the Worker: `seated` should climb past twenty within a minute or two.

With a Helius endpoint the holder list comes from Helius's DAS index (`getTokenAccounts`, a thousand accounts a page), which is far cheaper than a `getProgramAccounts` scan. Either way the Worker caches the list for `LADDER_CACHE_MS` and shares it between all of its copies through the `DIRECTORY` database, so heavy traffic still costs one read every minute or two.

{% hint style="warning" %}
**Never put the Helius key in a `VITE_` variable.** Vite writes every `VITE_` value into the page, so a key there would be published to every visitor. Leave `VITE_RPC_URL` unset; the page asks the Worker instead.
{% endhint %}

{% hint style="info" %}
`MANIFEST_SIZE` and `VITE_MANIFEST_SIZE` both default to the same constant from the shared seating module, so leaving both unset is the one way they cannot disagree about who is seated at the back.
{% endhint %}
