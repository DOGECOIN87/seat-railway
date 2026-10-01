export const STOP_DISTANCE = 14.7748 * 11 * 8;
export const MAX_RUN_SECONDS = 180;
export const MAX_RAIL_SPEED = 45;
export type RailGame = {
  phase: 'ready' | 'driving' | 'complete' | 'missed';
  distance: number; speed: number; seconds: number; power: number; held: number;
  score: number; error: number;
};
export const newRailGame = (): RailGame => ({ phase: 'ready', distance: 0, speed: 0, seconds: 0, power: 0, held: 0, score: 0, error: 0 });

export function railStopScore(error: number, seconds: number): number {
  if (!Number.isFinite(error) || !Number.isFinite(seconds) || Math.abs(error) > 15 || seconds < 0) return 0;
  const accuracy = Math.max(0, 1 - Math.abs(error) / 15);
  const timetable = Math.max(0, Math.min(1, (120 - seconds) / 70));
  return Math.round(1000 * accuracy + 500 * timetable);
}

export function stepRailGame(game: RailGame, dt: number): void {
  if (game.phase !== 'driving') return;
  const t = Math.max(0, Math.min(0.1, dt));
  const power = Math.max(-1, Math.min(1, game.power));
  const acceleration = power >= 0 ? power * 0.95 - 0.045 : power * 2.5 - 0.045;
  const next = Math.max(0, Math.min(MAX_RAIL_SPEED, game.speed + acceleration * t));
  game.distance += (game.speed + next) * 0.5 * t;
  game.speed = next; game.seconds += t;
  const error = STOP_DISTANCE - game.distance;
  if (Math.abs(error) <= 15 && game.speed < 0.25) game.held += t;
  else game.held = 0;
  if (game.held >= 0.8) {
    game.phase = 'complete'; game.error = error; game.speed = 0;
    game.score = railStopScore(error, game.seconds);
  } else if (error < -20 || game.seconds > MAX_RUN_SECONDS) {
    game.phase = 'missed'; game.error = error; game.speed = 0;
  }
}
