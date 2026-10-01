import { useEffect, useRef, useState } from 'react';
import { CAPTURE, captureState } from '../capture/flag';
import type { ViewPose } from '../three/WorldScene';
import { createRailWorld, type RailHandles } from '../three/RailWorld';
import type { FlightFeed } from '../lib/flightFeed';
import type { BandState } from '../lib/flightModel';
import type { SkyState } from '../lib/sky';
import { useAttitude } from '../lib/useAttitude';
import { HANDS_OFF, type ManualControls } from '../lib/manualControls';
import type { CabinSeat, CabinZone, Facing } from '../content/cabin';
import RailInteriorFallback from './RailInteriorFallback';

/**
 * The view from a seat, rendered.
 *
 * The camera sits where the seat is, inside cabin geometry, looking at a world
 * that exists — so the window shows what is actually outside it, the seat in
 * front occludes what it really would, and turning your head is a rotation
 * rather than a second drawing. Dragging looks around freely; the head-turn
 * buttons snap to the three positions the page names.
 */

const YAW_FOR: Record<Facing, number> = { left: -64, forward: 0, right: 64 };

/** Seat letter to its place across the railway's 2+2 layout. */
const SEAT_INDEX: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };

interface CabinView3DProps {
  feed: FlightFeed;
  sky: SkyState;
  band: BandState;
  seat: CabinSeat;
  zone: CabinZone;
  facing: Facing;
  taken: ReadonlySet<string>;
  /** Seat id to the image its holder is running, for the seat-back screens. */
  adverts: Readonly<Record<string, string>>;
  /**
   * What the aeroplane is being told to do, if anybody is telling it.
   *
   * Inverted, this is the window: the cabin comes over with the viewer —
   * the seat in front is still in front — and the ground ends up above the
   * sky outside. `WorldScene` decides that from where the camera is; all
   * this has to do is hand the switches over.
   */
  controls?: ManualControls;
}

const CabinView3D = ({ feed, sky, band, seat, zone, facing, taken, adverts, controls = HANDS_OFF }: CabinView3DProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [doorOpen, setDoorOpen] = useState(false);
  const [brightLights, setBrightLights] = useState(false);
  const [noGl, setNoGl] = useState(false);
  const world = useRef<RailHandles | null>(null);
  const pose = useRef<ViewPose>({ seatIndex: 0, row: 1, yaw: 0, id: '1A' });
  /** Free look, added on top of whichever way the buttons are pointing. */
  const drag = useRef({ active: false, x: 0, y: 0, yaw: 0, pitch: 0 });
  const latest = useRef({ sky, band });
  latest.current = { sky, band };

  /* Build the scene once; it lives as long as the view does. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let handles: RailHandles;
    try {
      handles = createRailWorld(canvas, { interior: 'coach' });
    } catch {
      setNoGl(true);
      return;
    }
    world.current = handles;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      handles.resize(Math.max(1, r.width), Math.max(1, r.height));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      ro.disconnect();
      handles.dispose();
      world.current = null;
    };
  }, []);

  useEffect(() => {
    world.current?.setOccupancy(taken);
  }, [taken]);

  useEffect(() => {
    world.current?.setAdverts(adverts);
  }, [adverts]);

  /* Where the seat is, and which way the head is turned. */
  useEffect(() => {
    const letter = seat.id.replace(/\d/g, '');
    pose.current.seatIndex = SEAT_INDEX[letter] ?? 0;
    pose.current.row = seat.row ?? 1;
    pose.current.id = seat.id;
    drag.current.yaw = 0;
    drag.current.pitch = 0;
    setDoorOpen(false);
  }, [seat.id, seat.row]);
  useEffect(() => { world.current?.setSuiteDoor(doorOpen); }, [doorOpen]);
  useEffect(() => { world.current?.setSuiteLighting(brightLights ? 1 : 0.55); }, [brightLights]);

  useEffect(() => {
    drag.current.yaw = 0;
    drag.current.pitch = 0;
  }, [facing]);

  useAttitude(feed, (a, tick) => {
    if (tick) world.current?.setMarket(tick.marketCap, tick.change5m);
    pose.current.yaw = CAPTURE && captureState.yaw !== null ? captureState.yaw : YAW_FOR[facing] + drag.current.yaw;
    pose.current.pitch = drag.current.pitch;
    world.current?.render(a, latest.current.sky, latest.current.band, pose.current);
  }, controls);

  /* Only the flaps are read from this; the roll arrives eased on the
     attitude above. Pushed in on change rather than per frame. */
  useEffect(() => {
    world.current?.setControls(controls);
  }, [controls]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    drag.current.active = true;
    drag.current.x = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    // A quarter of a degree per pixel: enough to look around a cabin without
    // spinning on the spot.
    drag.current.yaw = Math.max(-70, Math.min(70, drag.current.yaw + (e.clientX - drag.current.x) * -0.25));
    drag.current.pitch = Math.max(-45, Math.min(35, drag.current.pitch + (e.clientY - drag.current.y) * 0.2));
    drag.current.x = e.clientX;
    drag.current.y = e.clientY;
  };
  const endDrag = () => {
    drag.current.active = false;
  };

  return (
    <div
      className="sd-view sd-frame relative w-full cursor-grab overflow-hidden active:cursor-grabbing"
      role="group"
      aria-label={noGl ? `Layout of ${zone.key === 'first' ? 'private room' : 'seat'} ${seat.id}.`
        : `The view from ${zone.key === 'first' ? 'private room' : 'seat'} ${seat.id} in ${zone.name}, looking ${facing}. Drag to look around and up or down.`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{ touchAction: 'none' }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
      {noGl && <RailInteriorFallback mode="coach" seat={seat} zone={zone} doorOpen={doorOpen} brightness={brightLights ? 1 : 0.55} />}
      {zone.key === 'first' && <div className="rail-suite-controls" onPointerDown={(e) => e.stopPropagation()}>
        <div role="group" aria-label="Private room lighting">
          <span>Lights</span>
          <button type="button" aria-pressed={!brightLights} onClick={() => setBrightLights(false)}>Cozy</button>
          <button type="button" aria-pressed={brightLights} onClick={() => setBrightLights(true)}>Bright</button>
        </div>
        <button type="button" aria-pressed={doorOpen} onClick={() => setDoorOpen((open) => !open)}>
          {doorOpen ? 'Close room door' : 'Open room door'}
        </button>
      </div>}

      {/* Where you are, and how to look around */}
      <p className="pointer-events-none absolute bottom-3 left-3 border sm:bottom-4 sm:left-4 border-white/12 bg-[#05070F]/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-seat-amber backdrop-blur-sm">
        {zone.key === 'first' ? `ROOM ${seat.id} · FIRST CLASS` : `${seat.id} · ${zone.name}`}
      </p>
      {/* Under 420px it would run into the seat beside it, and dragging is what a thumb does anyway. */}
      {!noGl && <p className="pointer-events-none absolute bottom-3 right-3 hidden text-[11px] uppercase tracking-[0.18em] text-white/45 min-[420px]:block sm:bottom-4 sm:right-4">
        Drag to look
      </p>}
    </div>
  );
};

export default CabinView3D;
