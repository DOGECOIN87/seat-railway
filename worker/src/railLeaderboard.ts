import { COIN_POINTS, MAX_RUN_SECONDS, maxRunCoins, maxRunDistance, START_SPEED } from '../../src/lib/railGame';
import type { ScorePost } from './leaderboard';

/**
 * Whether a Runaway score could not have been driven.
 *
 * The shared leaderboard columns carry the run's seconds (`survived`) and the
 * tokens picked up (`climb`). The score is the metres covered plus the tokens'
 * points, and the train never runs slower than it starts or faster than it
 * can accelerate to, so the metres are boxed in by the seconds.
 */
export function implausibleRail(post: ScorePost, startedAt: number, now: number): string | null {
  const elapsed = (now - startedAt) / 1000;
  if (elapsed < 0 || post.survived > elapsed + 3) return 'That run lasted longer than the server clock.';
  if (!(post.survived >= 1) || post.survived > MAX_RUN_SECONDS + 1) return 'No run lasts that long.';
  if (!Number.isInteger(post.climb) || post.climb < 0 || post.climb > maxRunCoins(post.survived)) return 'There were never that many tokens on the line.';
  const metres = post.score - post.climb * COIN_POINTS;
  if (!Number.isInteger(post.score) || metres < Math.floor(START_SPEED * post.survived) - 2 || metres > maxRunDistance(post.survived) + 2) {
    return 'That score does not match the run.';
  }
  return null;
}
