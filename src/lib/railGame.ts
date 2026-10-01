/**
 * Runaway: the landing page's minute at the controls.
 *
 * The train runs on three parallel tracks and nobody can stop it. Left and
 * right throw the points and take it across to the next track; that is the
 * whole of the controls. Ahead come oncoming trains, wagons left standing,
 * rockfalls and buffer stops, a wave at a time, and every wave leaves at least
 * one track clear. Tokens lie along the rails for anybody who dares to fetch
 * them.
 *
 * About twenty seconds in, the brakes go. From then on the train gathers speed
 * until something stops it, which for the best drivers is about a minute
 * later. The score is the metres covered plus the tokens picked up.
 *
 * Like the flight on Seat Airlines' landing, this is pure state and numbers:
 * no three.js, so the page holds it before the scene has loaded and the tests
 * can drive it without a screen.
 */

export const LANES = 3;
/** Metres between neighbouring tracks' centrelines. */
export const LANE_GAP = 4.6;
/** Metres from the train's datum (where the world puts the cab) to its nose. */
export const NOSE = 9;
/** How much of the front of the train counts for a collision, metres. */
const FRONT = 8;
/** Clearance between the train and something on a track, metres, centre to centre. */
const CLEAR = 2.9;
/** Seconds to cross to the next track. */
export const SWITCH_SECONDS = 0.38;
export const START_SPEED = 24;
export const MAX_SPEED = 72;
/** m/s² before and after the brakes go. */
const CREEP = 0.45;
const RUNAWAY = 1.0;
export const COIN_POINTS = 25;
/** Metres between tokens in a run of them. */
const COIN_GAP = 7;
/** No run outlasts this; the server holds every post to it. */
export const MAX_RUN_SECONDS = 600;
/** How far ahead the line is laid out. */
const SPAWN_AHEAD = 950;

export type HazardKind = 'oncoming' | 'wagons' | 'rocks' | 'buffer';

export interface Hazard {
  id: number;
  kind: HazardKind;
  lane: number;
  /** The end nearest the train, metres along the line. */
  u: number;
  len: number;
  /** m/s toward the train: oncoming trains only. */
  speed: number;
  /** For the scene: picks a livery, a pile of rocks, a run of wagons. */
  look: number;
}

export interface Token {
  id: number;
  lane: number;
  u: number;
  taken: boolean;
}

export type RailEvent = 'switch' | 'coin' | 'runaway' | 'horn' | 'crash';

export interface RailGame {
  phase: 'ready' | 'driving' | 'crashed';
  /** The random stream's state: every run is laid out from its own seed. */
  rand: number;
  /** Metres covered, at the train's datum. */
  distance: number;
  speed: number;
  seconds: number;
  /** The track asked for, 0 left to 2 right, and where the train is across them, metres. */
  lane: number;
  x: number;
  score: number;
  coins: number;
  hazards: Hazard[];
  tokens: Token[];
  /** Where the next wave goes, metres along the line. */
  nextWave: number;
  /** The tracks the last wave left clear. */
  open: number[];
  /** Where the last wave stops closing any track, metres along the line. */
  clearFrom: number;
  runawayAt: number;
  runaway: boolean;
  /** Seconds since the crash, for the scene's shake and the page's verdict. */
  sinceCrash: number;
  crashSpeed: number;
  hitKind: HazardKind | null;
  /** What happened since the page last looked: drained by the page, for sounds and words. */
  events: RailEvent[];
  nextId: number;
}

export const laneX = (lane: number) => (lane - (LANES - 1) / 2) * LANE_GAP;

/** A small seeded stream (mulberry32), kept in the game so a run can be replayed. */
function random(game: RailGame): number {
  let t = (game.rand = (game.rand + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const newRailGame = (seed = Math.floor(Math.random() * 2 ** 31)): RailGame => ({
  phase: 'ready', rand: seed, distance: 0, speed: START_SPEED, seconds: 0, lane: 1, x: 0,
  score: 0, coins: 0, hazards: [], tokens: [], nextWave: 260, open: [0, 1, 2], clearFrom: 0,
  runawayAt: 18 + (seed % 1000) / 100, runaway: false, sinceCrash: 0, crashSpeed: 0, hitKind: null,
  events: [], nextId: 1,
});

export const startRailGame = (game: RailGame) => { game.phase = 'driving'; };

/** 0 at the start to 1 a minute in. */
const difficulty = (seconds: number) => Math.min(1, seconds / 60);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Ask for the next track over: -1 left, 1 right. */
export function steer(game: RailGame, dir: -1 | 1): void {
  if (game.phase !== 'driving') return;
  const next = Math.max(0, Math.min(LANES - 1, game.lane + dir));
  if (next !== game.lane) { game.lane = next; game.events.push('switch'); }
}

/**
 * How long a hazard keeps its track closed, in metres of the train's own run:
 * a standing wagon for its length, an oncoming train for as long as it takes
 * the two to pass each other.
 */
const closedFor = (h: Hazard, speed: number) => (h.speed > 0 ? h.len * speed / (speed + h.speed) : h.len);

/**
 * When the train will have covered this many more metres, and how fast it
 * will be going then: it is gathering speed the whole time, so an oncoming
 * train timed off today's speed would arrive late and meet it somewhere else.
 */
function ahead(game: RailGame, metres: number): { seconds: number; speed: number } {
  let speed = game.speed, seconds = 0, covered = 0;
  const step = 0.05;
  while (covered < metres && seconds < 120) {
    const accel = game.seconds + seconds >= game.runawayAt ? RUNAWAY : CREEP;
    const next = Math.min(MAX_SPEED, speed + accel * step);
    covered += (speed + next) * 0.5 * step;
    speed = next; seconds += step;
  }
  return { seconds, speed };
}

function layWave(game: RailGame): void {
  const d = difficulty(game.seconds);
  const at = game.nextWave;
  const nose = game.distance + NOSE;
  const arrival = ahead(game, at - nose);
  const speed = arrival.speed;
  // One track closed early on; two as often as not a minute in. Never all three.
  const want = random(game) < lerp(0.18, 0.62, d) ? 2 : 1;
  /* A track an earlier oncoming train has still to come down is left alone:
     it will be through here, and gone, before the train is. */
  const busy = new Set(game.hazards.filter((h) => h.speed > 0 && h.u + h.len > at - 40).map((h) => h.lane));
  const lanes = [0, 1, 2];
  for (let i = lanes.length - 1; i > 0; i--) {
    const j = Math.floor(random(game) * (i + 1));
    [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
  }
  const free = lanes.filter((lane) => !busy.has(lane));
  const shut = free.slice(0, Math.min(want, free.length));
  const open = lanes.filter((lane) => !shut.includes(lane));
  let reach = 0;
  for (const lane of shut) {
    const roll = random(game);
    const pOncoming = lerp(0.18, 0.42, d);
    const kind: HazardKind = roll < pOncoming ? 'oncoming' : roll < pOncoming + 0.34 ? 'wagons' : roll < 0.9 ? 'rocks' : 'buffer';
    const look = random(game);
    const len = kind === 'oncoming' ? 21 * (1 + Math.floor(random(game) * 3)) : kind === 'wagons' ? 14 * (1 + Math.floor(random(game) * 3)) : kind === 'rocks' ? 4 : 2;
    let hazardSpeed = 0, u = at;
    if (kind === 'oncoming') {
      hazardSpeed = lerp(12, 26, d) * (0.8 + random(game) * 0.4);
      // Started far enough off that it meets the train here.
      u = at + hazardSpeed * arrival.seconds;
    }
    const h: Hazard = { id: game.nextId++, kind, lane, u, len, speed: hazardSpeed, look };
    game.hazards.push(h);
    reach = Math.max(reach, closedFor(h, speed));
  }
  // Tokens: usually down the clear way, now and then up to something in the way.
  const bait = random(game) < 0.3;
  const coinLane = bait && shut.length ? shut[0] : open[Math.floor(random(game) * open.length)];
  const run = bait && shut.length ? 3 : 4 + Math.floor(random(game) * 3);
  for (let k = 0; k < run; k++) {
    const u = bait && shut.length ? at - 8 - k * COIN_GAP : at + reach * 0.5 + (k - run / 2) * COIN_GAP;
    if (u > nose + 30 && u > game.clearFrom) game.tokens.push({ id: game.nextId++, lane: coinLane, u, taken: false });
  }
  game.clearFrom = at + reach;
  game.open = open;
  // The next wave leaves time to clear this one and cross two tracks.
  const gapSeconds = lerp(2.3, 1.05, d) * (0.85 + random(game) * 0.3);
  game.nextWave = at + Math.max(reach + FRONT + speed * 1.1, speed * gapSeconds);
}

function crash(game: RailGame, kind: HazardKind): void {
  game.phase = 'crashed';
  game.hitKind = kind;
  game.crashSpeed = game.speed;
  game.sinceCrash = 0;
  game.events.push('crash');
}

function tick(game: RailGame, t: number): void {
  if (game.phase === 'crashed') {
    game.sinceCrash += t;
    const next = Math.max(0, game.speed - 32 * t);
    game.distance += (game.speed + next) * 0.5 * t;
    game.speed = next;
    for (const h of game.hazards) if (h.speed > 0) h.u -= Math.max(0, h.speed - 30 * game.sinceCrash) * t;
    return;
  }
  game.seconds += t;
  if (!game.runaway && game.seconds >= game.runawayAt) { game.runaway = true; game.events.push('runaway'); }
  const accel = game.runaway ? RUNAWAY : CREEP;
  const next = Math.min(MAX_SPEED, game.speed + accel * t);
  game.distance += (game.speed + next) * 0.5 * t;
  game.speed = next;

  // Across the tracks, at a steady rate.
  const want = laneX(game.lane);
  const step = (LANE_GAP / SWITCH_SECONDS) * t;
  game.x = Math.abs(want - game.x) <= step ? want : game.x + Math.sign(want - game.x) * step;

  const nose = game.distance + NOSE;
  while (game.nextWave < nose + SPAWN_AHEAD) layWave(game);

  for (const h of game.hazards) {
    const was = h.u;
    if (h.speed > 0) {
      h.u -= h.speed * t;
      if (was - nose > 260 && h.u - nose <= 260) game.events.push('horn');
    }
    if (Math.abs(game.x - laneX(h.lane)) < CLEAR && nose >= h.u && nose - FRONT <= h.u + h.len) {
      crash(game, h.kind);
      return;
    }
  }
  for (const c of game.tokens) {
    if (c.taken || nose < c.u || nose - FRONT > c.u) continue;
    if (Math.abs(game.x - laneX(c.lane)) < 2.1) { c.taken = true; game.coins++; game.events.push('coin'); }
  }
  game.hazards = game.hazards.filter((h) => h.u + h.len > game.distance - 60);
  game.tokens = game.tokens.filter((c) => c.u > game.distance - 30);
  game.score = Math.floor(game.distance) + game.coins * COIN_POINTS;
  if (game.seconds >= MAX_RUN_SECONDS) crash(game, 'buffer');
}

/** Moves the game on by dt seconds, in small steps so nothing is skipped at speed. */
export function stepRailGame(game: RailGame, dt: number): void {
  if (game.phase === 'ready') return;
  let left = Math.max(0, Math.min(0.1, dt));
  while (left > 1e-6) {
    const t = Math.min(left, 1 / 120);
    tick(game, t);
    left -= t;
  }
}

/** The most metres a run can cover in this many seconds, brakes or no brakes. */
export const maxRunDistance = (seconds: number) =>
  Math.min(MAX_SPEED * seconds, START_SPEED * seconds + 0.5 * RUNAWAY * seconds * seconds);

/** The most tokens there are to pick up over that distance. */
export const maxRunCoins = (seconds: number) => Math.ceil(maxRunDistance(seconds) / COIN_GAP) + 6;
