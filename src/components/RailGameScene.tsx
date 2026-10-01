import { useEffect, useRef } from 'react';
import { createRailWorld, type RailHandles } from '../three/RailWorld';
import type { ViewPose } from '../three/WorldScene';
import type { FlightFeed } from '../lib/flightFeed';
import type { BandState } from '../lib/flightModel';
import type { SkyState } from '../lib/sky';
import { useAttitude } from '../lib/useAttitude';
import { stepRailGame, STOP_DISTANCE, type RailGame } from '../lib/railGame';

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
    try { handles = createRailWorld(canvas.current, { interior: 'cab', stopAt: STOP_DISTANCE + 6.35 }); }
    catch { onFail(); return; }
    world.current = handles;
    const resize = () => { const rect = canvas.current!.getBoundingClientRect(); handles.resize(rect.width, rect.height); };
    const observer = new ResizeObserver(resize); observer.observe(canvas.current); resize();
    return () => { observer.disconnect(); handles.dispose(); world.current = null; };
  }, [onFail]);
  useAttitude(feed, (a, tick) => {
    const now = performance.now();
    stepRailGame(game.current, last.current ? (now - last.current) / 1000 : 0); last.current = now;
    pose.current.speed = game.current.speed;
    pose.current.railDistance = game.current.distance;
    pose.current.freeze = game.current.phase !== 'driving';
    if (tick) world.current?.setMarket(tick.marketCap, tick.change5m);
    world.current?.render({ ...a, pitch: 0 }, latest.current.sky, { ...latest.current.band, band: 'atmosphere' }, pose.current);
    latest.current.onUpdate(game.current);
  });
  return <canvas ref={canvas} className="block h-full w-full" aria-label="SR350 driver view for the station stop challenge" />;
}
