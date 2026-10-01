/**
 * The line's levels: what the train runs through at each market cap.
 *
 * Under a million the train is on the ground, and the ground changes as the
 * market grows: open country first, then a market town with shops beside the
 * line, then the city — glass towers, lit at night, and a river bridge. From a
 * million it climbs onto the viaduct above the clouds, then space, the moon
 * and Mars (see `bandFor` in flightModel).
 *
 * A tier is entered at its threshold and left only once the market has
 * fallen a little below it, so a market cap sitting on a line does not flick
 * the whole country back and forth.
 */

export type GroundTier = 'country' | 'town' | 'city';
export type RailTier = GroundTier | 'clouds' | 'space' | 'moon' | 'mars';

export interface TierInfo {
  key: RailTier;
  name: string;
  /** Market cap the tier starts at, dollars. */
  from: number;
  /** What it looks like, for the docs and the route strip. */
  blurb: string;
}

export const TIERS: readonly TierInfo[] = [
  { key: 'country', name: 'Countryside', from: 0, blurb: 'Meadows, forest, mountains, desert and coast.' },
  { key: 'town', name: 'Market Town', from: 100_000, blurb: 'Paved streets, houses and shopfronts, signs on the rooftops.' },
  { key: 'city', name: 'The City', from: 400_000, blurb: 'Glass towers that light up at night, and the river bridge.' },
  { key: 'clouds', name: 'Above the clouds', from: 1_000_000, blurb: 'A viaduct over the cloud deck.' },
  { key: 'space', name: 'Space', from: 10_000_000, blurb: 'A track of light past the planet.' },
  { key: 'moon', name: 'The moon', from: 50_000_000, blurb: 'Grey dust and craters.' },
  { key: 'mars', name: 'Mars', from: 100_000_000, blurb: 'Red canyons and two small moons.' },
];

/** How far under a tier's threshold the market must fall before the train leaves it. */
export const TIER_HYSTERESIS = 0.08;

const GROUND: readonly GroundTier[] = ['country', 'town', 'city'];
const groundFrom = (t: GroundTier) => TIERS.find((x) => x.key === t)!.from;

/** The ground tier for a market cap under a million, given the one the train is in now. */
export function groundTierFor(marketCap: number, current: GroundTier = 'country'): GroundTier {
  let pick: GroundTier = 'country';
  for (const t of GROUND) if (marketCap >= groundFrom(t)) pick = t;
  // Falling back: stay put until it is clearly under the current tier's line.
  if (GROUND.indexOf(pick) < GROUND.indexOf(current) && marketCap >= groundFrom(current) * (1 - TIER_HYSTERESIS)) return current;
  return pick;
}

export const tierInfo = (key: RailTier): TierInfo => TIERS.find((t) => t.key === key)!;

/** The next tier up from this one, or null at the top. */
export function nextTier(key: RailTier): TierInfo | null {
  const i = TIERS.findIndex((t) => t.key === key);
  return TIERS[i + 1] ?? null;
}
