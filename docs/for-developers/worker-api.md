---
description: Every public route on the Worker, what it takes and what it answers.
---

# Worker API

Base URL in production: `https://seat-railway-banners.trashmarket.workers.dev`. Every route answers JSON, and errors come back as `{ "error": "<a sentence you can show a person>" }`.

## Public routes

| Route | Answers |
| --- | --- |
| `GET /health` | `{ ok, service, storage, directory, sections, configured, seated, cabin }` — never cached |
| `GET /holders` | `{ holders: [{ address, balance }], supply }` — who is aboard, as the page seats them |
| `GET /holding?address=<wallet>` | `{ balance, supply, share }` for one wallet |
| `GET /banners` | The published wall: `{ "<wallet>": { image, alt, href? } }` |
| `POST /banner` | Publish an advert — see below |
| `DELETE /banner` | Take your own advert down — see below |
| `GET /images/<key>` | Advert artwork, when it is stored in KV rather than R2 |
| `GET /flight` | The operator's current manual controls for the train (the route keeps the airline's name) |
| `GET /rail-scores` | The **Runaway** board: the top drivers, best score per wallet |
| `POST /rail-runs` | Start a Runaway run: returns its id, and the server's clock starts |
| `POST /rail-scores` | Post a run's score, signed — see [Runaway](../the-game/runaway.md#the-leaderboard) |

`GET /holding` answers **503** when the chain cannot be asked, never a zero balance: a holder told they hold nothing would be moved to the hold and shut out of the directory.

### Reading `/health`

| Field | Answers |
| --- | --- |
| `storage` | `"r2"` or `"kv"` — where artwork is kept |
| `directory` | Whether the D1 database is bound |
| `sections` | Whether the coaches (the API calls them cabins) can be told apart **right now**. False means no card shows contact details and no introduction sends. |
| `configured` | Whether a `TOKEN_MINT` or `HOLDERS_URL` was ever set — separates "nobody configured it" from "the endpoint refused" |
| `seated` / `cabin` | How many of the seats actually filled. A cabin stuck at 20 of 118 means the RPC refused the full holder scan. |

### Posting a Runaway score

`POST /rail-scores` takes `{ address, run, score, survived, climb, issued, signature }`. Here `survived` is the run's seconds, `climb` is the tokens picked up, and `signature` is the wallet's signature over the message in [Wallet safety](../safety/wallet-safety.md). The server refuses the post if:

* the run is not one it started, or has already been posted;
* the seconds are longer than its own clock allows;
* the tokens are more than the line could have held in that time;
* the metres (the score less 25 a token) fall outside what the train could have covered between its starting speed and its full acceleration.

The checks are in `worker/src/railLeaderboard.ts`, and use the same constants as the game, imported from `src/lib/railGame.ts`. Runaway's board is kept in its own `rail_runaway_*` tables.

## Publishing an advert

`POST /banner` with:

```json
{
  "owner": "<wallet address>",
  "image": "data:image/webp;base64,…",
  "alt": "What the advert says",
  "href": "https://example.com",
  "issued": "2026-09-23T12:00:00.000Z",
  "signature": "<base58 ed25519 signature>"
}
```

The signature is over this exact text, where the fingerprint is the SHA-256 of the image bytes, in hex:

```
SEAT RAILWAY
Publish this advert on my seat.

wallet: <owner>
image:  sha256:<fingerprint>
issued: <issued>
```

It answers `{ "image": "<url of the stored artwork>" }`, or:

| Status | Why |
| --- | --- |
| 400 | Not JSON, a missing field, an undecodable image, or a signature older than five minutes |
| 401 | The signature does not match the wallet |
| 403 | The wallet does not hold the token |
| 413 | The image is over 512 KB |
| 415 | The image is not a real JPEG, PNG or WebP |
| 429 | Another publish from this wallet inside the last minute |

## Taking an advert down

`DELETE /banner` with `{ owner, key, issued, signature }`, where `key` is the stored name of the advert's artwork — the `banners/…` path its image URL ends in. The signature is over:

```
SEAT RAILWAY
Take the advert off my seat.

wallet: <owner>
advert: <key>
issued: <issued>
```

It answers `{ "ok": true }` and removes the advert from the wall, or:

| Status | Why |
| --- | --- |
| 400 | Not JSON, a missing field, or a signature older than five minutes |
| 401 | The signature does not match the wallet |
| 404 | There is no advert up for this wallet. The body carries `"gone": true`, and the page treats this as done |
| 409 | The advert up now is not the one the signature names |

There is no holder check and no cooldown, and the artwork itself is left in place, since another wallet may be showing the same picture.

## The directory

Every directory route needs a session: send `Authorization: Bearer <token>`.

| Route | Does |
| --- | --- |
| `POST /session` | Sign in with `{ address, issued, signature }`, signed over the sign-in message in [Wallet safety](../safety/wallet-safety.md). Answers `{ token, address, expires }`, good for 24 hours. |
| `DELETE /session` | Sign out, revoking the token |
| `GET /directory` | The cards of every seated holder, plus your own. Contact fields are included only where your seat can read them. |
| `PUT /profile` | Publish or amend your card: `{ displayName, role, email, website, linkedin, links }`, where `links` maps `x`, `telegram`, `discord`, `linktree`, `instagram`, `tiktok`, `youtube` and `github` to a handle (a profile link is read down to one). Stored in `profile_links`, which the Worker makes on first use |
| `GET /messages` | `{ inbox, sent, overheard, channels, announcements }` — your own cabin's room only; `overheard` is always empty and kept for older pages |
| `POST /messages` | `{ to, body }`, where `to` is a wallet, `section:<cabin>`, or `announcement` |

The coaches are `deck` (the driver's cab), `first`, `business`, `exit` and `economy` (Standard) — the API keeps the airline's names for them. The rules in [Your seat is which room you are in](../section-network/how-far-you-can-see.md) are enforced here, before any row is written or read.

## CORS

The API routes answer only the origins in `ALLOWED_ORIGINS`. The `/images/` route answers any origin, because the seat-back screens and the trackside billboards load artwork as WebGL textures.
