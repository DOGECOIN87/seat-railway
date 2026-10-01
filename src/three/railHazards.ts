/**
 * What Runaway puts on the line: oncoming trains, wagons left standing,
 * rockfalls, buffer stops and the tokens between them.
 *
 * Built once into small pools and handed out each frame to whatever the game
 * has within sight, so a long run makes no garbage. The world says where a
 * point on the line is (`place`); this only decides what stands there.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { laneX, NOSE, type Hazard, type RailGame } from '../lib/railGame';

/** Puts `out` at a point beside the line, `x` metres right of the centre track, at rail height. */
export type Place = (u: number, x: number, out: THREE.Vector3) => THREE.Vector3;

const SIGHT = 1500;
const CAR = 20.5;
const WAGON = 13.6;

const glowTexture = () => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,244,214,0.85)');
  grad.addColorStop(0.5, 'rgba(255,214,150,0.18)');
  grad.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

export function createRailHazards() {
  const group = new THREE.Group();
  group.name = 'runaway-hazards';
  const owned: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(d: T): T => { owned.push(d); return d; };
  const std = (color: number, roughness = 0.6, metalness = 0.2) => keep(new THREE.MeshStandardMaterial({ color, roughness, metalness }));

  const box = keep(new THREE.BoxGeometry(1, 1, 1));
  const soft = keep(new RoundedBoxGeometry(1, 1, 1, 3, 0.12));
  const wheel = keep(new THREE.CylinderGeometry(0.46, 0.46, 0.18, 14).rotateZ(Math.PI / 2));
  const rockGeo = keep(new THREE.DodecahedronGeometry(1, 1));
  const coinGeo = keep(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 28).rotateX(Math.PI / 2));
  const lampGeo = keep(new THREE.SphereGeometry(0.17, 12, 8));

  const ink = std(0x16181d, 0.5, 0.4);
  const glass = keep(new THREE.MeshStandardMaterial({ color: 0x0c1720, roughness: 0.08, metalness: 0.9 }));
  const yellow = std(0xf2c230, 0.5, 0.1);
  const steel = std(0x5d636b, 0.4, 0.8);
  const roofGrey = std(0x9aa1a8, 0.55, 0.5);
  const headMat = keep(new THREE.MeshBasicMaterial({ color: 0xfff6e0, toneMapped: false }));
  const redLamp = keep(new THREE.MeshBasicMaterial({ color: 0xff2a1a, toneMapped: false }));
  const glowMap = keep(glowTexture());
  const glowMat = keep(new THREE.SpriteMaterial({ map: glowMap, color: 0xfff1d0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  const redGlowMat = keep(new THREE.SpriteMaterial({ map: glowMap, color: 0xff3a22, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  const LIVERY = [0xc0392b, 0x1f5fa8, 0xe07a1f, 0x2f8f5b].map((c) => std(c, 0.45, 0.35));
  const WAGON_COL = [0x7b3b26, 0x2f6f73, 0x6a6f75, 0x8a6a2c, 0x3c4f7a].map((c) => std(c, 0.75, 0.2));
  const ROCK_COL = [0x7c756c, 0x6b6259, 0x8d8579].map((c) => std(c, 0.95, 0.05));
  const stripe = (() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const g = c.getContext('2d')!;
    for (let i = -2; i < 10; i++) {
      g.fillStyle = i % 2 ? '#d8281c' : '#f4f1ea';
      g.beginPath(); g.moveTo(i * 32, 64); g.lineTo(i * 32 + 32, 64); g.lineTo(i * 32 + 64, 0); g.lineTo(i * 32 + 32, 0); g.fill();
    }
    const t = keep(new THREE.CanvasTexture(c));
    t.colorSpace = THREE.SRGBColorSpace;
    return keep(new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }));
  })();

  const part = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, size: number[], at: number[]) => {
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(size[0], size[1], size[2]);
    m.position.set(at[0], at[1], at[2]);
    m.castShadow = true;
    parent.add(m);
    return m;
  };

  /* An oncoming train: up to three cars, the leading one's nose toward the viewer (+Z). */
  interface Oncoming { root: THREE.Group; cars: THREE.Group[]; bodies: THREE.Mesh[] }
  const makeOncoming = (): Oncoming => {
    const root = new THREE.Group();
    const cars: THREE.Group[] = [];
    const bodies: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const car = new THREE.Group();
      car.position.z = -i * (CAR + 0.5);
      const body = part(car, soft, LIVERY[0], [3.0, 3.25, CAR - 0.6], [0, 2.35, 0]);
      bodies.push(body);
      part(car, box, roofGrey, [2.6, 0.18, CAR - 1.2], [0, 4.05, 0]);
      part(car, box, glass, [3.04, 0.62, CAR - 3], [0, 2.85, 0]);
      part(car, box, ink, [2.6, 0.55, CAR - 3], [0, 0.62, 0]);
      for (const z of [-CAR / 2 + 3, CAR / 2 - 3]) {
        part(car, box, steel, [2.2, 0.5, 2.6], [0, 0.55, z]);
        for (const side of [-1, 1]) for (const dz of [-0.85, 0.85]) part(car, wheel, steel, [1, 1, 1], [side * 0.72, 0.46, z + dz]);
      }
      if (i === 0) {
        const nose = CAR / 2 - 0.3;
        part(car, soft, yellow, [3.02, 2.0, 0.9], [0, 1.85, nose]);
        part(car, box, glass, [2.5, 0.9, 0.2], [0, 3.15, nose + 0.05]);
        part(car, box, ink, [3.0, 0.3, 0.6], [0, 0.9, nose + 0.2]);
        for (const side of [-1, 1]) {
          part(car, lampGeo, headMat, [1, 1, 1], [side * 0.95, 1.55, nose + 0.48]);
          const glow = new THREE.Sprite(glowMat);
          glow.scale.set(5, 5, 1);
          glow.position.set(side * 0.95, 1.55, nose + 0.7);
          car.add(glow);
        }
        part(car, lampGeo, headMat, [0.8, 0.8, 0.8], [0, 3.75, nose + 0.4]);
        const top = new THREE.Sprite(glowMat);
        top.scale.set(3.4, 3.4, 1);
        top.position.set(0, 3.75, nose + 0.6);
        car.add(top);
      }
      root.add(car);
      cars.push(car);
    }
    group.add(root);
    return { root, cars, bodies };
  };

  /* A rake of box wagons left on the line, its end toward the viewer. */
  interface Wagons { root: THREE.Group; cars: THREE.Group[]; bodies: THREE.Mesh[] }
  const makeWagons = (): Wagons => {
    const root = new THREE.Group();
    const cars: THREE.Group[] = [];
    const bodies: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const car = new THREE.Group();
      car.position.z = -i * (WAGON + 0.4);
      bodies.push(part(car, box, WAGON_COL[0], [2.9, 2.75, WAGON - 0.4], [0, 2.45, 0]));
      part(car, box, roofGrey, [3.0, 0.14, WAGON - 0.2], [0, 3.88, 0]);
      for (let r = -2; r <= 2; r++) part(car, box, ink, [2.96, 2.4, 0.08], [0, 2.45, r * (WAGON / 5.2)]);
      part(car, box, ink, [2.4, 0.4, WAGON - 1], [0, 0.85, 0]);
      for (const z of [-WAGON / 2 + 2.2, WAGON / 2 - 2.2]) {
        for (const side of [-1, 1]) for (const dz of [-0.8, 0.8]) part(car, wheel, steel, [1, 1, 1], [side * 0.72, 0.46, z + dz]);
      }
      for (const side of [-1, 1]) part(car, wheel, steel, [0.7, 0.7, 2.2], [side * 0.9, 1.05, WAGON / 2 + 0.1]);
      root.add(car);
      cars.push(car);
    }
    // A red tail lamp, so the end of a rake reads at a distance and at night.
    part(cars[0], lampGeo, redLamp, [1, 1, 1], [0.95, 1.4, WAGON / 2]);
    const tail = new THREE.Sprite(redGlowMat);
    tail.scale.set(2.6, 2.6, 1);
    tail.position.set(0.95, 1.4, WAGON / 2 + 0.2);
    cars[0].add(tail);
    group.add(root);
    return { root, cars, bodies };
  };

  /* A rockfall across a track. */
  interface Rocks { root: THREE.Group; stones: THREE.Mesh[] }
  const makeRocks = (): Rocks => {
    const root = new THREE.Group();
    const stones: THREE.Mesh[] = [];
    for (let i = 0; i < 7; i++) stones.push(part(root, rockGeo, ROCK_COL[i % ROCK_COL.length], [1, 1, 1], [0, 0, 0]));
    group.add(root);
    return { root, stones };
  };

  /* A buffer stop: the end of the line, struck on a running track. */
  const makeBuffer = () => {
    const root = new THREE.Group();
    part(root, box, stripe, [3.4, 0.7, 0.4], [0, 1.15, 0]);
    for (const side of [-1, 1]) {
      part(root, box, ink, [0.3, 1.4, 1.6], [side * 1.35, 0.7, -0.6]);
      part(root, wheel, steel, [2.2, 2.2, 1.8], [side * 0.85, 1.15, 0.35]);
    }
    part(root, box, ink, [0.12, 1.5, 0.12], [0, 2.1, -0.1]);
    part(root, lampGeo, redLamp, [1.3, 1.3, 1.3], [0, 2.95, 0]);
    const glow = new THREE.Sprite(redGlowMat);
    glow.scale.set(4, 4, 1);
    glow.position.set(0, 2.95, 0.3);
    root.add(glow);
    group.add(root);
    return { root };
  };

  const pools = {
    oncoming: Array.from({ length: 4 }, makeOncoming),
    wagons: Array.from({ length: 6 }, makeWagons),
    rocks: Array.from({ length: 6 }, makeRocks),
    buffer: Array.from({ length: 4 }, makeBuffer),
  };

  const coinMat = keep(new THREE.MeshStandardMaterial({ color: 0xf7c843, emissive: 0x6b4a00, emissiveIntensity: 0.6, roughness: 0.25, metalness: 0.95 }));
  const COINS = 48;
  const coins = new THREE.InstancedMesh(coinGeo, coinMat, COINS);
  coins.count = 0;
  coins.frustumCulled = false;
  group.add(coins);

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s1 = new THREE.Vector3(1, 1, 1);

  /** Stands `root` along the line from `near` to `far` metres, `x` across, its +Z end toward `near`. */
  const stand = (root: THREE.Object3D, place: Place, near: number, far: number, x: number) => {
    place(near, x, a);
    place(far, x, b);
    root.position.copy(a).add(b).multiplyScalar(0.5);
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    root.rotation.set(Math.atan2(dy, Math.hypot(dx, dz)), Math.atan2(-dx, -dz), 0, 'YXZ');
  };

  const update = (game: RailGame, place: Place, time: number) => {
    const nose = game.distance + NOSE;
    const used = { oncoming: 0, wagons: 0, rocks: 0, buffer: 0 };
    for (const h of game.hazards) {
      if (h.u - nose > SIGHT || h.u + h.len < game.distance - 40) continue;
      const pool = pools[h.kind];
      const i = used[h.kind]++;
      if (i >= pool.length) continue;
      const x = laneX(h.lane);
      if (h.kind === 'oncoming') {
        const v = pool[i] as Oncoming;
        const n = Math.max(1, Math.round(h.len / 21));
        stand(v.root, place, h.u, h.u + n * (CAR + 0.5), x);
        // The rake is built nose-first from its middle car's place: shift so the nose sits at `near`.
        v.cars.forEach((car, k) => {
          car.visible = k < n;
          car.position.z = (n * (CAR + 0.5)) / 2 - CAR / 2 - k * (CAR + 0.5);
          v.bodies[k].material = LIVERY[Math.floor(h.look * LIVERY.length) % LIVERY.length];
        });
      } else if (h.kind === 'wagons') {
        const v = pool[i] as Wagons;
        const n = Math.max(1, Math.round(h.len / 14));
        stand(v.root, place, h.u, h.u + n * (WAGON + 0.4), x);
        v.cars.forEach((car, k) => {
          car.visible = k < n;
          car.position.z = (n * (WAGON + 0.4)) / 2 - WAGON / 2 - k * (WAGON + 0.4);
          v.bodies[k].material = WAGON_COL[Math.floor((h.look * 7 + k * 0.37) * WAGON_COL.length) % WAGON_COL.length];
        });
      } else if (h.kind === 'rocks') {
        const v = pool[i] as Rocks;
        stand(v.root, place, h.u, h.u + h.len, x);
        v.stones.forEach((st, k) => {
          const r = fract(h.look * 97.3 + k * 0.618);
          const size = 0.7 + r * 1.1;
          st.scale.set(size * (1 + fract(r * 7) * 0.5), size * 0.75, size);
          st.position.set((fract(r * 13) - 0.5) * 3.2, size * 0.45, (fract(r * 29) - 0.5) * h.len);
          st.rotation.set(r * 6, r * 11, r * 3);
        });
      } else {
        const v = pool[i] as { root: THREE.Group };
        stand(v.root, place, h.u, h.u + 1, x);
      }
      (pool[i] as { root: THREE.Group }).root.visible = true;
    }
    for (const kind of Object.keys(pools) as Hazard['kind'][]) {
      const pool = pools[kind] as { root: THREE.Group }[];
      for (let i = used[kind]; i < pool.length; i++) pool[i].root.visible = false;
    }

    let n = 0;
    const spin = time * 0.004;
    for (const c of game.tokens) {
      if (c.taken || n >= COINS || c.u - nose > SIGHT * 0.6 || c.u < nose - 10) continue;
      place(c.u, laneX(c.lane), a);
      a.y += 1.55 + Math.sin(spin * 0.8 + c.id) * 0.12;
      q.setFromEuler(e.set(0, spin + c.id, 0));
      m4.compose(a, q, s1);
      coins.setMatrixAt(n++, m4);
    }
    coins.count = n;
    coins.instanceMatrix.needsUpdate = true;
  };

  return {
    group,
    update,
    dispose() {
      for (const d of owned) d.dispose();
      coins.dispose();
    },
  };
}

const fract = (v: number) => v - Math.floor(v);
