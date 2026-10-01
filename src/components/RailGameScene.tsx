import { useEffect, useRef } from 'react';
import { createRailWorld, type RailHandles } from '../three/RailWorld';
import type { ViewPose } from '../three/WorldScene';
import type { FlightFeed } from '../lib/flightFeed';
import type { BandState } from '../lib/flightModel';
import type { SkyState } from '../lib/sky';
import { useAttitude } from '../lib/useAttitude';
import { laneX, stepRailGame, type RailGame } from '../lib/railGame';

/** Runaway, from the driver's seat: the game moves the train, this draws it. */
export default function RailGameScene({ feed, sky, band, game, onUpdate, onFail }: {
  feed: FlightFeed; sky: SkyState; band: BandState;
  game: React.RefObject<RailGame>; onUpdate: (game: RailGame) => void; onFail: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<RailHandles | null>(null);
  const last = useRef(0);
  const pose = useRef<ViewPose>({ seatIndex: null, row: 1, id: 'DRV', yaw: 0, speed: 0 });
  const latest = useRef({ sky, band, onUpdate }); latest.current = { sky, band, onUpdate };
  useEffect(() => {
    if (!canvas.current) return;
    let handles: RailHandles;
    try { handles = createRailWorld(canvas.current, { interior: 'cab', runaway: () => game.current }); }
    catch { onFail(); return; }
    world.current = handles;
    const resize = () => { const rect = canvas.current!.getBoundingClientRect(); handles.resize(rect.width, rect.height); };
    const observer = new ResizeObserver(resize); observer.observe(canvas.current); resize();
    return () => { observer.disconnect(); handles.dispose(); world.current = null; };
  }, [onFail, game]);
  useAttitude(feed, (a, tick) => {
    const now = performance.now();
    const g = game.current;
    stepRailGame(g, last.current ? (now - last.current) / 1000 : 0); last.current = now;
    const p = pose.current;
    p.speed = g.speed;
    p.railDistance = g.distance;
    p.lateral = g.x;
    // The cab swings toward the track it is crossing to.
    p.yaw = Math.max(-7, Math.min(7, (laneX(g.lane) - g.x) * 1.5));
    p.shake = g.phase === 'crashed' ? Math.max(0, 1 - g.sinceCrash / 1.4) : 0;
    p.freeze = g.phase !== 'driving';
    if (tick) world.current?.setMarket(tick.marketCap, tick.change5m);
    world.current?.render({ ...a, pitch: 0 }, latest.current.sky, { ...latest.current.band, band: 'atmosphere' }, p);
    latest.current.onUpdate(g);
  });
  return <canvas ref={canvas} className="block h-full w-full" aria-label="Runaway: the view from the cab of a train with no brakes" />;
}
