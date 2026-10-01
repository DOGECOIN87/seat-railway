import { useEffect, useRef, useState } from 'react';
import { createRailWorld, type RailHandles } from '../three/RailWorld';
import type { ViewPose } from '../three/WorldScene';
import type { FlightFeed } from '../lib/flightFeed';
import type { BandState } from '../lib/flightModel';
import type { SkyState } from '../lib/sky';
import { useAttitude } from '../lib/useAttitude';
import { HANDS_OFF, type ManualControls } from '../lib/manualControls';
import RailInteriorFallback from './RailInteriorFallback';

export default function CargoHold3D({ feed, sky, band, belowCutoff, controls = HANDS_OFF }: {
  feed: FlightFeed; sky: SkyState; band: BandState; belowCutoff: number; controls?: ManualControls;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<RailHandles | null>(null);
  const pose = useRef<ViewPose>({ seatIndex: 0, row: 30, id: 'FREIGHT', yaw: 0 });
  const latest = useRef({ sky, band }); latest.current = { sky, band };
  const drag = useRef({ on: false, x: 0, y: 0 });
  const [noGl, setNoGl] = useState(false);
  useEffect(() => {
    if (!canvas.current) return;
    let handles: RailHandles;
    try { handles = createRailWorld(canvas.current, { interior: 'freight' }); }
    catch { setNoGl(true); return; }
    world.current = handles;
    const resize = () => {
      const rect = canvas.current!.getBoundingClientRect();
      handles.resize(Math.max(1, rect.width), Math.max(1, rect.height));
    };
    const observer = new ResizeObserver(resize); observer.observe(canvas.current); resize();
    return () => { observer.disconnect(); handles.dispose(); world.current = null; };
  }, []);
  useAttitude(feed, (a, tick) => {
    if (tick) world.current?.setMarket(tick.marketCap, tick.change5m);
    world.current?.render(a, latest.current.sky, latest.current.band, pose.current);
  }, controls);
  return (
    <div className="sd-view sd-frame relative w-full overflow-hidden cursor-grab active:cursor-grabbing" role="img"
      aria-label={`SR350 freight carriage, ${belowCutoff} passengers below the seat cutoff. Drag to look around.`}
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => { drag.current = { on: true, x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerMove={(e) => {
        if (!drag.current.on) return;
        pose.current.yaw = Math.max(-80, Math.min(80, pose.current.yaw - (e.clientX - drag.current.x) * 0.25));
        pose.current.pitch = Math.max(-25, Math.min(25, (pose.current.pitch ?? 0) - (e.clientY - drag.current.y) * 0.2));
        drag.current.x = e.clientX; drag.current.y = e.clientY;
      }}
      onPointerUp={() => { drag.current.on = false; }} onPointerCancel={() => { drag.current.on = false; }}>
      <canvas ref={canvas} className="block h-full w-full" />
      {noGl && <RailInteriorFallback mode="freight" />}
      <p className="pointer-events-none absolute bottom-3 left-3 bg-black/75 px-3 py-2 font-mono text-xs text-white">FREIGHT · {belowCutoff} below the cutoff</p>
    </div>
  );
}
