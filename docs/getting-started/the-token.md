---
description: The contract address, where to get it, and what the train reads from its market.
---

# The token

## Contract address

The token is on **Solana**:

```
AWJCyg9PrMtYju9yaQmdQLcwrGobHMTv9JU3mo4upump
```

It trades on pump.fun: [pump.fun/coin/AWJCyg9PrMtYju9yaQmdQLcwrGobHMTv9JU3mo4upump](https://pump.fun/coin/AWJCyg9PrMtYju9yaQmdQLcwrGobHMTv9JU3mo4upump).

<!-- interim-token -->
{% hint style="info" %}
**Seat Railway will have its own token.** Until it launches, the address above is the **Seat Airlines** token, so the train has a live market to run on. The train, the seat ladder, the wall and the directory are all built to read whichever Solana token they are pointed at, and switching is one command (below).
{% endhint %}
<!-- /interim-token -->

{% hint style="warning" %}
Always check the **whole** address, not just the first and last few characters. The strip marked **CA** across the top of the site shows the address the train is actually reading, and its **Copy** button copies it exactly. If this page and the site ever disagree, trust the site.
{% endhint %}

## Switching tokens

One command switches every place the address is printed (the page, the Worker, `index.html` and these docs):

```bash
npm run token:update -- <new CA>
```

It checks on-chain that the address really is a token mint, writes it everywhere, runs the tests and a build, and pushes. Anybody seated under the old token is never seated under the new one: the page clears what it remembered about the old mint. See [Deploying](../for-developers/deploying.md).

The Worker reads balances and the holder list through its own RPC endpoint, which should be a Helius key of the railway's own. See [Configuration](../for-developers/configuration.md#helius).

## What the train reads

Three numbers from the market, and one from the chain:

| From | The number | What it becomes |
| --- | --- | --- |
| Market | Market cap | **Length**: a carriage at every 1-2-5 step from $10K, and which world the line runs through |
| Market | Price change over the last **five minutes** | **Grade** — uphill when it rises, downhill when it falls — and **speed** |
| Market | Holder count | How many holders ride **below the cutoff**, in the freight car |
| Chain | Every holder's balance | The **seat ladder**: who sits where |

See [One number runs the train](../how-it-runs/one-number-runs-the-train.md) for exactly how each one moves the train.

## Where the numbers come from

* **The market** is read from Jupiter's public token API, in your browser, every 20 seconds. If Jupiter rate-limits the request, the page waits 90 seconds before asking again.
* **Balances** are read from Solana by the server (the Cloudflare Worker), which caches the holder list for 60 seconds and a single balance for 20 seconds. The page re-reads the holder list every 90 seconds and your own balance every 2 minutes, and polling pauses while the tab is in the background.
* **Program accounts are not passengers.** A pump.fun bonding curve or a liquidity pool holds tokens, but it is a program, not a person, so it is never seated. Only ordinary wallets are.

{% hint style="info" %}
If the market cannot be reached, the train **holds its last reading** rather than dropping to zero. When the page first opens, it shows a $163K train on level track for the moment before the first reading arrives.
{% endhint %}
