import assert from 'node:assert/strict';
import { FULL_CABIN, SEAT_ORDER, seatHolders } from '../dist-test/seating.js';
import { coachForRow, coachRows, railRowZ, railSeatX } from '../dist-test/railLayout.js';
import { newRailGame, startRailGame, stepRailGame, steer, laneX, NOSE, LANES, COIN_POINTS, MAX_SPEED } from '../dist-test/railGame.js';
import { implausibleRail } from '../dist-test/railLeaderboard.js';
import { groundTierFor, nextTier, TIERS } from '../dist-test/tiers.js';

assert.equal(FULL_CABIN, 118);
assert.equal(new Set(SEAT_ORDER.map((s) => s.id)).size, FULL_CABIN);
assert.deepEqual(SEAT_ORDER.filter((s) => s.zone === 'first').map((s) => s.id), ['1A', '1D', '2A', '2D']);
assert(SEAT_ORDER.every((s) => s.position !== 'middle'));
for (const seat of SEAT_ORDER.filter((s) => s.row)) {
  assert(coachRows(seat.row).includes(seat.row));
  assert(Math.abs(railSeatX(seat)) < 1.7);
  assert(railRowZ(seat.row) >= -8 && railRowZ(seat.row) <= 8);
}
assert.equal(coachForRow(1), coachForRow(2));
assert.notEqual(coachForRow(2), coachForRow(3));
const people = Array.from({length: 140}, (_,i) => ({address:`holder-${i}`,balance:140-i}));
const manifest = seatHolders(people,1000,true,FULL_CABIN);
assert.equal(manifest.entries.length,118);
assert.equal(manifest.open,0);
assert.equal(manifest.entries[2].seat.id,'1A');

// Runaway. A driver who never steers meets something in the first half-minute.
for (const seed of [1, 2, 3, 4, 5]) {
  const game = newRailGame(seed);
  startRailGame(game);
  while (game.phase === 'driving') stepRailGame(game, 1 / 60);
  assert.equal(game.phase, 'crashed');
  assert(game.seconds < 40, `a train left alone ran ${game.seconds.toFixed(1)} s`);
}

/* An autopilot that looks down each track and takes the one clear furthest:
   if it lasts, every wave left a way through that a driver could take. */
const clearAhead = (game, lane) => {
  const nose = game.distance + NOSE;
  let best = Infinity;
  for (const h of game.hazards) {
    if (h.lane !== lane || h.u + h.len < nose - 8) continue;
    // Where the two meet, in the train's own metres.
    const meet = h.speed > 0 ? (h.u - nose) * game.speed / (game.speed + h.speed) : h.u - nose;
    best = Math.min(best, Math.max(0, meet));
  }
  return best;
};
for (const hz of [30, 60, 120]) {
  for (const seed of [11, 12, 13, 14, 15, 16]) {
    const game = newRailGame(seed);
    startRailGame(game);
    let checked = 0;
    while (game.phase === 'driving' && game.seconds < 150) {
      const here = Math.round(game.x / 4.6) + 1;
      if (Math.abs(game.x - laneX(game.lane)) < 0.01) {
        const scores = Array.from({ length: LANES }, (_, lane) => clearAhead(game, lane) - Math.abs(lane - here) * 12);
        const pick = scores.indexOf(Math.max(...scores));
        const next = here + Math.sign(pick - here);
        if (pick !== here && clearAhead(game, here) < game.speed * 2.2 && clearAhead(game, next) > game.speed * 0.75 + 8) steer(game, pick > here ? 1 : -1);
      }
      stepRailGame(game, 1 / hz);
      game.events.length = 0;
      checked++;
    }
    assert.equal(game.phase, 'driving', `seed ${seed} at ${hz} Hz: the autopilot hit ${game.hitKind} at ${game.seconds.toFixed(1)} s`);
    assert(game.speed <= MAX_SPEED && game.runaway);
    assert.equal(game.score, Math.floor(game.distance) + game.coins * COIN_POINTS);
    // What the board will be sent passes the server's checks; anything bigger does not.
    const post = { score: game.score, survived: game.seconds, climb: game.coins };
    assert.equal(implausibleRail(post, 0, (game.seconds + 1) * 1000), null);
    assert(implausibleRail({ ...post, score: post.score + 20000 }, 0, (game.seconds + 1) * 1000));
    assert(implausibleRail({ ...post, score: 100 }, 0, (game.seconds + 1) * 1000));
    assert(implausibleRail({ ...post, climb: 100000 }, 0, (game.seconds + 1) * 1000));
    assert(implausibleRail(post, 0, game.seconds * 500));
    assert(checked > 0);
  }
}

// The same seed lays the same line.
const a = newRailGame(99), b = newRailGame(99);
startRailGame(a); startRailGame(b);
for (let i = 0; i < 600; i++) { stepRailGame(a, 1 / 60); stepRailGame(b, 1 / 60); }
assert.deepEqual(a.hazards, b.hazards);
// The line's levels: country, town, city, each entered at its line and left only well under it.
assert.equal(groundTierFor(50_000), 'country');
assert.equal(groundTierFor(100_000), 'town');
assert.equal(groundTierFor(399_999), 'town');
assert.equal(groundTierFor(400_000), 'city');
assert.equal(groundTierFor(380_000, 'city'), 'city', 'a dip just under the line kept the city');
assert.equal(groundTierFor(360_000, 'city'), 'town');
assert.equal(groundTierFor(95_000, 'town'), 'town');
assert.equal(groundTierFor(90_000, 'town'), 'country');
assert.equal(groundTierFor(150_000, 'country'), 'town', 'rising is never held back');
assert.deepEqual(TIERS.map((t) => t.from), [...TIERS.map((t) => t.from)].sort((a, b) => a - b));
assert.equal(nextTier('city').key, 'clouds');
assert.equal(nextTier('mars'), null);
console.log('Railway layout, holder ranking, the Runaway game, the line\'s tiers and server score validation passed.');
