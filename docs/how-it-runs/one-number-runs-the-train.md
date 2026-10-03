---
description: Market cap is the length of the train and the five-minute move is the grade. Here is exactly how.
---

# One number runs the train

Nothing on the train is driven by hand or scripted. Everything you see reads the token's market, so the train you are looking at is the chart.

## Length — market cap

The train couples on a **carriage at every step of the 1-2-5 series** from $10K. Each step is a round number, so each carriage is a milestone, and the train roughly doubles in length every time the market cap goes up tenfold.

| Market cap | Carriages behind the cab |
| --- | --- |
| under $10K | none — the cab runs alone |
| $10K · $20K · $50K | 1 · 2 · 3 |
| $100K · $200K · $500K | 4 · 5 · 6 |
| $1M · $2M · $5M | 7 · 8 · 9 |
| $10M · $20M · $50M | 10 · 11 · 12 |
| $100M · $200M | 13 · 14 — full length |

When the market reaches a new step, the next carriage **rolls up from behind and couples on**, and the horn sounds. When it falls back under one, the last carriage is **uncoupled**: it rolls on, slows and is left behind on the line, and the crossing bell rings.

The cab's destination display shows the market cap itself, and the readout under the view says how many carriages the train has and where the next one is coupled on. The steps are in [`src/lib/consist.ts`](../../src/lib/consist.ts).

The same number also decides which world the line runs through — see [The line's tiers](the-line.md).

## Grade — the five-minute move

The price change over the last five minutes sets the **grade the line is laid at**: uphill when the price is rising, downhill when it is falling. The line ahead is laid as the train approaches it, at whatever grade the market is at then, so **the track behind the train is the chart**. Look back along it and you can read the last few minutes of the market in the hills.

The curve is logarithmic, so a quiet ±2% still tilts the line while a huge move levels off, and a rise and a fall of the same size are graded the same.

| Five-minute move | Grade | Speed |
| --- | --- | --- |
| ±1% | 0.2° | 160 km/h |
| ±5% | 0.7° | 165 km/h |
| ±12% | 1.3° | 175 km/h |
| ±25% | 2.0° | 190 km/h |
| ±50% | 2.8° | 225 km/h |
| ±100% | 3.7° | 295 km/h |
| +300% or more | 4.5° (the limit) | 340 km/h (the limit) |

Stations are always laid level, whatever the market is doing.

## Speed — conviction

The train runs at about **160 km/h** when the market is flat and faster with the size of the move, in either direction, to a limit of about 340 km/h.

## The signals

A signal stands beside the line every half-kilometre or so. Its lamp is the five-minute move:

| Five-minute move | Signal |
| --- | --- |
| above +2% | **green** |
| between −2% and +2% | **amber** |
| below −2% | **red** |

## What the driver would say

The readout under the view names what the train is doing:

| Five-minute move | Reads |
| --- | --- |
| above +40% | **FULL POWER** |
| above +8%, up to +40% | **UPHILL** |
| above −6%, up to +8% | **CRUISING** |
| above −22%, down to −6% | **DOWNHILL** |
| −22% or lower | **BRAKING** |

## Lit carriages — the holders

The carriages light up front first, in proportion to how many of the 118 seats are taken. At night that is the clearest sign of how full the train is.

## Smooth, but never invented

The market is read every 20 seconds; the train eases towards each new reading at the screen's frame rate. If you have asked your device for **reduced motion**, the camera drifts half as far and the readings ease in more slowly and gently.

{% hint style="info" %}
The crew can occasionally take the controls for show — the camera, the time of day or the weather — and every visitor sees it at once. They cannot change the length of the train or the grade: those always come from the market.
{% endhint %}
