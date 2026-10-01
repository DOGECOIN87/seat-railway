import { railStopScore, MAX_RUN_SECONDS, STOP_DISTANCE, MAX_RAIL_SPEED } from '../../src/lib/railGame';
import type { ScorePost } from './leaderboard';

// The shared leaderboard columns carry duration and stopping error for rail runs.
export function implausibleRail(post: ScorePost, startedAt: number, now: number): string | null {
  const elapsed = (now - startedAt) / 1000;
  if (elapsed < 0 || post.survived > elapsed + 3) return 'That run lasted longer than the server clock.';
  if (post.survived < STOP_DISTANCE / MAX_RAIL_SPEED || post.survived > MAX_RUN_SECONDS + 1) return 'That station could not be reached in that time.';
  if (post.climb > 15) return 'That stop was outside the platform marker.';
  if (post.score !== railStopScore(post.climb, post.survived)) return 'That score does not match the station stop.';
  return null;
}
