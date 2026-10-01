---
description: The brakes are gone. Switch tracks, dodge what is coming, and see how far you get.
---

# Runaway

On the way in there is a short game: **Runaway**. Press **Runaway** on the front page, under **All aboard**, to play.

You are in the driver's cab of a train with no brakes, on a line of **three parallel tracks**. The train can't stop. The only control you have is the points: switching left or right onto the next track.

## Controls

| On | Switch left | Switch right |
| --- | --- | --- |
| Keyboard | **←** or **A** | **→** or **D** |
| Touch | tap the left half of the screen, or swipe left | tap the right half, or swipe right |

**Esc** leaves the game at any time. On the end screen, **Enter** or **Space** plays again.

## What comes down the line

Hazards arrive a wave at a time. Each wave closes one or two tracks and **always leaves at least one way through** that you can reach in time.

| Hazard | How to spot it |
| --- | --- |
| **Oncoming train** | Headlamps blazing, getting bigger fast. It sounds its horn when it is close. It's on its own track and coming towards you, so switch off that track before you meet it, and stay off until it has gone past. |
| **Standing wagons** | A rake of box wagons left on the line, with a red tail lamp. |
| **Rockfall** | A pile of boulders across a track. |
| **Buffer stop** | Striped red and white, with a red lamp: the end of that track. |

**Tokens** (gold coins) lie along the rails between hazards. Usually they mark a clear way through, but sometimes they lead right up to something in the way.

## The twist

About twenty seconds in, an alarm sounds: **BRAKES GONE — RUNAWAY!** From then on the train gathers speed every second until something stops it. It starts at about 86 km/h and tops out near 260 km/h. The waves come closer together as you go, and two-track closures get more common.

For a train left alone, the run is over in well under a minute. A good run lasts a minute or two.

## Scoring

* **1 point for every metre** the train covers.
* **25 points for every token** picked up.

The score, your speed and your tokens are along the top of the screen. The three bars show which track you are on. Your best is kept in this browser.

When you hit something, the cab shakes, the screen flashes and goes red, and **WASTED** comes down over it. The end screen says what you hit and how fast you were going, for example _Head-on with an oncoming train at 187 km/h · 2.41 km · 12 tokens · 54 s_.

## The leaderboard

On the end screen, **Sign & post** puts your score on the **Top drivers** board with any Solana wallet (Phantom, Solflare, Backpack, Nightly). The wallet signs a short message naming the score. It's a message, not a transaction, so it moves nothing and approves nothing. Each wallet keeps its best. **Scores** on the front page, and in the tab bar once you are inside, opens the board.

The server times every run from the moment it starts, and each run can be posted once. It refuses a score that the time could not have earned: the metres must fit between the slowest and fastest the train could have gone in that many seconds, and the tokens must fit what the line could have held. That stops a made-up number. It can't stop someone patient enough to wait out the time their made-up number needs, so the board is for bragging rights, not prizes.

{% hint style="info" %}
**For developers:** the game is pure state and numbers in `src/lib/railGame.ts`, with no three.js in it, and is seeded so a run can be replayed. The test suite drives it with an autopilot that survives 150 seconds on six seeds at 30, 60 and 120 frames a second, which shows every wave really does leave a way through.
{% endhint %}
