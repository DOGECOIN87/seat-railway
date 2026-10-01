import assert from 'node:assert/strict';
import { FULL_CABIN, SEAT_ORDER, seatHolders } from '../dist-test/seating.js';
import { coachForRow, coachRows, railRowZ, railSeatX } from '../dist-test/railLayout.js';
import { newRailGame, stepRailGame, railStopScore, STOP_DISTANCE } from '../dist-test/railGame.js';
import { implausibleRail } from '../dist-test/railLeaderboard.js';

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

// A full-power run misses, while braking by stopping distance can land precisely.
for (const hz of [30,60,120]) {
  const game = {...newRailGame(),phase:'driving',power:1};
  while(game.phase==='driving') stepRailGame(game,1/hz);
  assert.equal(game.phase,'missed');
  assert.equal(game.score,0);
  const driven = {...newRailGame(),phase:'driving'};
  while(driven.phase==='driving') {
    driven.power = STOP_DISTANCE-driven.distance < driven.speed**2/(2*2.545)+1 ? -1 : 1;
    stepRailGame(driven,1/hz);
  }
  assert.equal(driven.phase,'complete');
  assert(Math.abs(driven.error)<2);
  assert.equal(driven.score,railStopScore(driven.error,driven.seconds));
  const post={score:driven.score,survived:driven.seconds,climb:Math.abs(driven.error)};
  assert.equal(implausibleRail(post,0,(driven.seconds+1)*1000),null);
  assert(implausibleRail({...post,score:10000},0,(driven.seconds+1)*1000));
  assert(implausibleRail({...post,survived:1},0,(driven.seconds+1)*1000));
}
const braking = {...newRailGame(),phase:'driving',speed:10,power:-1};
for(let i=0;i<1000;i++) stepRailGame(braking,1/60);
assert.equal(braking.speed,0);
assert(braking.distance>0 && braking.distance<25);
console.log('Railway layout, holder ranking, stopping physics and server score validation passed.');
