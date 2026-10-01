import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { ALL_SEATS, findSeat } from '../content/cabin';
import { coachForRow, coachRows, RAIL_FLOOR, railRowZ, railSeatX, zoneForRow } from '../lib/railLayout';
import { carriagesFor, gradeFor } from '../lib/consist';
import { formatCap, formatChange } from '../lib/flightModel';
import type { ViewPose } from './WorldScene';
import type { DeckReadout } from './flightDeck';
import type { Attitude } from '../lib/useAttitude';
import { createPassengers } from './passengers';

export type RailInteriorMode = 'coach' | 'cab' | 'freight';

export function createRailInterior(mode: RailInteriorMode) {
  const group = new THREE.Group();
  group.name = `rail-${mode}`;
  const resources: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(item: T): T => { resources.push(item); return item; };
  const material = (color: number, roughness = 0.6, metalness = 0.1) => keep(new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  const wall = material(0xdce1e4, 0.44);
  const trim = material(0x7e8c95, 0.3, 0.8);
  const floor = material(0x343c42, 0.9);
  const charcoal = material(0x141b22, 0.45);
  const cloth = material(0x087e96, 0.85);
  const premium = material(0x174b50, 0.65);
  const suiteWall = material(0xe7e2d8, 0.7);
  const gold = material(0xc8ad75, 0.26, 0.8);
  const carpet = material(0x273639, 1);
  const linen = material(0xf4f1e9, 0.95);
  const lampMat = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e3, emissiveIntensity: 1.4 }));
  const cyan = keep(new THREE.MeshStandardMaterial({ color: 0x00c9f1, emissive: 0x00c9f1, emissiveIntensity: 0.5 }));
  const unitBox = keep(new THREE.BoxGeometry(1, 1, 1));
  const softBox = keep(new RoundedBoxGeometry(1, 1, 1, 2, 0.08));
  const plane = keep(new THREE.PlaneGeometry(1, 1));
  const box = (parent: THREE.Object3D, mat: THREE.Material, size: number[], at: number[]) => {
    const mesh = new THREE.Mesh(mat === cloth || mat === premium || mat === linen ? softBox : unitBox, mat);
    mesh.scale.set(size[0], size[1], size[2]);
    mesh.position.set(at[0], at[1], at[2]);
    mesh.castShadow = false;
    parent.add(mesh);
    return mesh;
  };
  box(group, floor, [3.5, 0.12, 18], [0, RAIL_FLOOR - 0.06, 0]);
  box(group, wall, [3.6, 0.16, 18], [0, 3.55, 0]);
  for (const side of [-1, 1]) {
    box(group, wall, [0.1, 0.9, 18], [side * 1.8, 1.45, 0]);
    box(group, wall, [0.1, 0.35, 18], [side * 1.8, 3.3, 0]);
    box(group, trim, [0.04, 0.06, 18], [side * 1.73, 1.87, 0]);
    box(group, trim, [0.04, 0.06, 18], [side * 1.73, 3.09, 0]);
    for (let z = -8.8; z <= 8.8; z += 2.2) {
      box(group, wall, [0.1, 1.2, 0.2], [side * 1.8, 2.49, z]);
      box(group, trim, [0.06, 1.22, 0.04], [side * 1.73, 2.49, z - 0.12]);
    }
    if (mode === 'coach') {
      box(group, trim, [0.42, 0.07, 17.4], [side * 1.53, 3.05, 0]);
      box(group, charcoal, [0.28, 0.015, 17.4], [side * 1.48, 3.09, 0]);
    }
    box(group, lampMat, [0.07, 0.035, 16.8], [side * 0.65, 3.44, 0]);
  }
  const lights: THREE.PointLight[] = [];
  for (const z of [-6, 0, 6]) {
    const light = new THREE.PointLight(0xfff4e5, 14, 13, 1.5);
    light.position.set(0, 3.25, z);
    group.add(light);
    lights.push(light);
  }
  const fill = new THREE.HemisphereLight(0xf0f5ff, 0x616d78, 1.05);
  group.add(fill);

  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const displayTex = keep(new THREE.CanvasTexture(canvas));
  displayTex.colorSpace = THREE.SRGBColorSpace;
  const displayMat = keep(new THREE.MeshBasicMaterial({ map: displayTex, toneMapped: false }));
  const display = (parent: THREE.Object3D, w: number, h: number, x: number, y: number, z: number) => {
    box(parent, charcoal, [w + 0.08, h + 0.08, 0.07], [x, y, z - 0.02]);
    const mesh = new THREE.Mesh(plane, displayMat);
    mesh.scale.set(w, h, 1); mesh.position.set(x, y, z + 0.025);
    parent.add(mesh);
    return mesh;
  };
  let readout: DeckReadout | null = null;
  let lastPaint = 0;
  let disposed = false;
  const paint = (a: Attitude, speed: number, time: number) => {
    if (time - lastPaint < 150) return;
    lastPaint = time;
    ctx.fillStyle = '#071216'; ctx.fillRect(0, 0, 1024, 512);
    ctx.font = '600 32px monospace'; ctx.fillStyle = '#00c9f1';
    ctx.fillText(mode === 'cab' ? 'SR350 / DRIVER DISPLAY' : mode === 'freight' ? 'SR350 / FREIGHT' : 'SR350 / PASSENGER INFORMATION', 40, 55);
    ctx.fillStyle = '#e8f3f5'; ctx.font = '700 112px monospace';
    ctx.fillText(`${Math.round(speed * 3.6)}`, 40, 190);
    ctx.font = '30px monospace'; ctx.fillText('km/h', 275, 188);
    ctx.fillStyle = '#7fa1ab'; ctx.font = '28px monospace';
    ctx.fillText('MARKET CAP', 520, 115); ctx.fillText('LINE GRADIENT', 520, 265);
    ctx.fillStyle = '#e8f3f5'; ctx.font = '600 60px monospace';
    ctx.fillText(formatCap(readout?.marketCap ?? a.alt), 520, 183);
    const grade = Math.tan(gradeFor(a.pitch) * Math.PI / 180) * 100;
    ctx.fillText(`${grade >= 0 ? '+' : ''}${grade.toFixed(1)}%`, 520, 332);
    ctx.font = '28px monospace'; ctx.fillStyle = '#7fa1ab'; ctx.fillText('CARRIAGES', 40, 265);
    ctx.fillStyle = '#e8f3f5'; ctx.font = '600 60px monospace'; ctx.fillText(String(carriagesFor(readout?.marketCap ?? a.alt)), 40, 332);
    const brake = readout?.lamps.oxygen;
    ctx.fillStyle = brake ? '#ff5b4e' : '#5be86b'; ctx.fillRect(40, 392, 944, 3);
    ctx.font = '600 30px monospace';
    ctx.fillText(brake ? 'EMERGENCY BRAKE / HOLD ON' : `LINE CLEAR / ${formatChange(readout?.change5m ?? 0)} IN 5m`, 40, 458);
    displayTex.needsUpdate = true;
  };

  const chairs = new THREE.Group(); group.add(chairs);
  const suiteDoors = new Map<string, { mesh: THREE.Mesh; z: number }>();
  let suiteDoorOpen = false;
  const chairBacks = new Map<string, THREE.Object3D>();
  const screens = new Map<string, THREE.Mesh>();
  const screenMaps = new Map<string, THREE.Texture>();
  let adverts: Readonly<Record<string, string>> = {};
  let sold: ReadonlySet<string> = new Set();
  let currentCoach = -1;
  let currentSeat = '';
  let activeRows: number[] = [];
  const passengers = mode === 'coach' ? createPassengers({
    rows: 6, seatX: [-1.32, -0.64, 0.64, 1.32], seatLetters: ['A', 'B', 'C', 'D'],
    seatXFor: (row, index) => {
      const seat = findSeat(`${activeRows[row - 1]}${'ABCD'[index]}`);
      return seat ? railSeatX(seat) : 0;
    },
    floorY: RAIL_FLOOR, rowZ: (row) => railRowZ(activeRows[row - 1] ?? 8),
  }) : null;
  if (passengers) group.add(passengers.group);
  const resit = () => {
    if (!passengers) return;
    const seats = new Set<string>();
    for (const id of sold) {
      const seat = findSeat(id);
      if (seat?.row && coachForRow(seat.row) === currentCoach) seats.add(`${activeRows.indexOf(seat.row) + 1}${id.replace(/\d/g, '')}`);
    }
    const viewer = findSeat(currentSeat);
    passengers.place(seats, viewer?.row ? `${activeRows.indexOf(viewer.row) + 1}${currentSeat.replace(/\d/g, '')}` : '');
  };
  const loadAdverts = () => {
    for (const [id, screen] of screens) {
      const url = adverts[id];
      let map = url ? screenMaps.get(url) : undefined;
      if (url && !map) {
        const loader = new THREE.TextureLoader(); loader.setCrossOrigin('anonymous');
        map = loader.load(url, (tex) => {
          if (disposed) { tex.dispose(); return; }
          tex.colorSpace = THREE.SRGBColorSpace;
        }, undefined, () => {
          screenMaps.delete(url);
          for (const face of screens.values()) if ((face.material as THREE.MeshBasicMaterial).map === map) {
            const mat = face.material as THREE.MeshBasicMaterial; mat.map = displayTex; mat.needsUpdate = true;
          }
        });
        screenMaps.set(url, map);
      }
      const mat = screen.material as THREE.MeshBasicMaterial;
      mat.map = map ?? displayTex; mat.needsUpdate = true;
    }
  };
  const buildCoach = (row: number) => {
    chairs.clear(); chairBacks.clear(); suiteDoors.clear();
    activeRows = coachRows(row);
    for (const screen of screens.values()) (screen.material as THREE.Material).dispose();
    screens.clear();
    for (const n of activeRows) {
      const zone = zoneForRow(n);
      for (const seat of ALL_SEATS.filter((s) => s.row === n)) {
        const root = new THREE.Group(); root.position.set(railSeatX(seat), RAIL_FLOOR, railRowZ(n)); chairs.add(root);
        const fabric = zone.key === 'first' || zone.key === 'business' ? premium : cloth;
        const width = seat.bankSize === 1 ? 0.78 : 0.55;
        box(root, trim, [0.07, 0.46, 0.08], [0, 0.23, 0]);
        box(root, fabric, [width, 0.15, 0.53], [0, 0.49, -0.05]);
        const back = new THREE.Group(); root.add(back); chairBacks.set(seat.id, back);
        const shell = box(back, charcoal, [width + 0.02, 0.95, 0.12], [0, 0.92, 0.23]); shell.rotation.x = -0.09;
        const cushion = box(back, fabric, [width - 0.03, 0.89, 0.09], [0, 0.94, 0.15]); cushion.rotation.x = -0.09;
        box(back, fabric, [width - 0.05, 0.18, 0.17], [0, 1.36, 0.19]);
        if (zone.key !== 'first') {
          const face = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: displayTex, toneMapped: false }));
          face.position.set(0, 1.04, 0.32); face.scale.set(width - 0.07, 0.19, 1); back.add(face); screens.set(seat.id, face);
        }
        box(back, trim, [width - 0.03, 0.018, 0.25], [0, 0.63, 0.44]);
        for (const side of [-1, 1]) box(root, charcoal, [0.04, 0.045, 0.43], [side * width / 2, 0.74, 0]);
        if (zone.key === 'first') {
          for (const side of [-1, 1]) {
            box(root, premium, [0.1, 0.25, 0.7], [side * 0.42, 0.62, -0.04]);
            box(root, gold, [0.015, 0.04, 0.62], [side * 0.48, 0.64, -0.04]);
          }
          box(root, premium, [0.68, 0.2, 0.55], [0, 0.38, -0.72]);
          box(root, suiteWall, [0.36, 0.12, 0.1], [0, 1.36, 0.12]);
        }
      }
      if (zone.key === 'first') {
        for (const side of [-1, 1]) {
          const z = railRowZ(n);
          box(chairs, carpet, [1.3, 0.025, 7.7], [side * 1.1, 1.015, z]);
          // A fully enclosed suite, with a central corridor outside its door.
          for (const end of [-1, 1]) box(chairs, suiteWall, [1.36, 2.5, 0.08], [side * 1.1, 2.25, z + end * 3.85]);
          box(chairs, suiteWall, [0.08, 2.5, 2.75], [side * 0.42, 2.25, z - 2.5]);
          box(chairs, suiteWall, [0.08, 2.5, 2.75], [side * 0.42, 2.25, z + 2.5]);
          const door = box(chairs, charcoal, [0.085, 2.35, 2.25], [side * 0.42, 2.18, z]);
          suiteDoors.set(`${n}${side < 0 ? 'A' : 'D'}`, { mesh: door, z });
          box(chairs, gold, [0.035, 0.25, 0.045], [side * 0.48, 1.95, z + 0.65]);
          box(chairs, gold, [0.025, 0.035, 7.65], [side * 0.48, 3.25, z]);
          box(chairs, lampMat, [0.025, 0.02, 7.5], [side * 0.51, 3.26, z]);
          box(chairs, suiteWall, [0.48, 0.075, 1.25], [side * 1.5, 1.75, z - 1.4]);
          box(chairs, gold, [0.5, 0.025, 1.27], [side * 1.5, 1.71, z - 1.4]);
          box(chairs, charcoal, [0.06, 0.7, 0.8], [side * 1.66, 1.35, z - 1.4]);
          box(chairs, premium, [1.05, 0.35, 1.85], [side * 1.1, 1.22, z - 2.78]);
          box(chairs, linen, [1.02, 0.12, 1.8], [side * 1.1, 1.45, z - 2.78]);
          box(chairs, linen, [0.7, 0.12, 0.35], [side * 1.1, 1.57, z - 3.43]);
          box(chairs, gold, [0.03, 0.6, 0.03], [side * 1.65, 2.06, z - 1.9]);
          box(chairs, lampMat, [0.23, 0.16, 0.23], [side * 1.65, 2.4, z - 1.9]);
          const reading = new THREE.PointLight(0xffd8a5, 5, 4, 1.6);
          reading.position.set(side * 1.55, 2.35, z - 1.7); chairs.add(reading);
          const suiteScreen = display(chairs, 0.9, 0.48, side * 1.1, 2.36, z - 3.78);
          const artMat = new THREE.MeshBasicMaterial({ map: displayTex, toneMapped: false });
          suiteScreen.material = artMat; screens.set(`${n}${side < 0 ? 'A' : 'D'}`, suiteScreen);
        }
      }
    }
    currentCoach = coachForRow(row);
    loadAdverts(); resit();
  };

  if (mode === 'cab') {
    box(group, charcoal, [3.45, 0.75, 0.9], [0, 1.72, -7.7]);
    box(group, trim, [3.45, 0.1, 1.2], [0, 2.14, -7.8]);
    display(group, 1.2, 0.6, -0.73, 2.18, -7.63);
    display(group, 0.72, 0.36, 0.75, 2.13, -7.58);
    box(group, charcoal, [3.5, 0.45, 0.12], [0, 1.3, -8.9]);
    box(group, trim, [0.07, 1.8, 0.08], [0, 2.45, -8.9]);
    box(group, wall, [3.5, 2.5, 0.12], [0, 2.25, -4.2]);
    for (const x of [-1.3, -0.85, 0.5, 0.95, 1.3]) {
      box(group, cyan, [0.06, 0.02, 0.06], [x, 2.205, -7.25]);
      box(group, trim, [0.035, 0.2, 0.035], [x, 2.27, -7.22]);
      box(group, charcoal, [0.13, 0.05, 0.07], [x, 2.39, -7.22]);
    }
    box(group, cloth, [0.62, 0.16, 0.65], [0.78, 1.48, -6.1]);
    box(group, charcoal, [0.65, 1.0, 0.16], [0.78, 1.95, -5.78]);
  } else {
    for (const end of [-1, 1]) {
      box(group, wall, [3.5, 2.5, 0.1], [0, 2.25, end * 8.9]);
      box(group, trim, [0.95, 2.15, 0.05], [0, 2.08, end * 8.82]);
      box(group, charcoal, [0.66, 0.8, 0.03], [0, 2.53, end * 8.78]);
      box(group, cyan, [0.045, 0.25, 0.035], [0.35, 1.97, end * 8.73]);
    }
    display(group, 1.2, 0.4, 0, 3.08, -8.78);
    if (mode === 'freight') {
      const crateMat = material(0x64767e, 0.55, 0.6);
      const strap = material(0xd5b64a, 0.75);
      for (let i = 0; i < 12; i++) {
        const side = i % 2 ? 1 : -1, z = -6.5 + Math.floor(i / 2) * 2.2;
        const ht = i % 3 === 0 ? 1.35 : 0.85;
        box(group, crateMat, [1.02, ht, 1.45], [side * 1.13, 1 + ht / 2, z]);
        for (const offset of [-0.38, 0.38]) {
          box(group, strap, [1.04, 0.025, 0.045], [side * 1.13, 1 + ht + 0.014, z + offset]);
          box(group, strap, [0.02, ht, 0.045], [side * 0.61, 1 + ht / 2, z + offset]);
        }
      }
      for (let z = -8.6; z <= 8.6; z += 0.65) box(group, trim, [3.3, 0.045, 0.025], [0, 1.02, z]);
    }
  }

  const eye = new THREE.Vector3();
  return {
    group,
    eye(pose: ViewPose) {
      if (mode === 'cab') return eye.set(-0.65, 2.64, -6.35);
      if (mode === 'freight') return eye.set(0.05, 2.5, 7.5);
      const seat = findSeat(pose.id);
      if (currentCoach !== coachForRow(pose.row)) buildCoach(pose.row);
      if (currentSeat !== pose.id) {
        currentSeat = pose.id;
        for (const [id, back] of chairBacks) back.visible = id !== pose.id;
        resit();
      }
      for (const [id, door] of suiteDoors) door.mesh.position.z = door.z + (id === pose.id && suiteDoorOpen ? 2.35 : 0);
      return eye.set(seat ? railSeatX(seat) : 0, 2.28, railRowZ(pose.row) - 0.06);
    },
    update(a: Attitude, speed: number, night: number, now: number) {
      lights.forEach((light) => { light.intensity = 12 + night * 6; });
      paint(a, speed, now);
    },
    setOccupancy(taken: ReadonlySet<string>) { sold = taken; resit(); },
    setAdverts(bySeat: Readonly<Record<string, string>>) { adverts = bySeat; loadAdverts(); },
    setReadout(value: DeckReadout) { readout = value; },
    setSuiteDoor(open: boolean) { suiteDoorOpen = open; },
    dispose() {
      disposed = true;
      passengers?.dispose();
      for (const screen of screens.values()) (screen.material as THREE.Material).dispose();
      for (const texture of screenMaps.values()) texture.dispose();
      for (const item of resources) item.dispose();
    },
  };
}
