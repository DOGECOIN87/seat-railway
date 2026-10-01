import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createRailInterior } from '../dist-test/railInterior.js';

// Geometry checks need no GPU; only procedural textures need a canvas stub.
const previousDocument = globalThis.document;
globalThis.document = {
  createElement: () => ({ getContext: () => new Proxy({}, {
    get: (object, name) => object[name] ?? (String(name).includes('Gradient') ? (() => ({ addColorStop() {} })) : (() => {})),
    set: (object, name, value) => { object[name] = value; return true; },
  }) }),
};
const interior = createRailInterior('coach');
const pose = (id) => ({ id, row: Number(id.replace(/\D/g, '')), seatIndex: 0, yaw: 0 });
const visible = (object) => {
  for (let node = object; node; node = node.parent) if (!node.visible) return false;
  return true;
};
const ray = new THREE.Raycaster();
const hitFrom = (eye, direction) => {
  interior.group.updateMatrixWorld(true);
  ray.set(eye.clone(), direction);
  return ray.intersectObject(interior.group, true).find((hit) => visible(hit.object));
};
try {
  for (const id of ['1A', '1D', '2A', '2D']) {
    const p = pose(id);
    const side = id.endsWith('A') ? -1 : 1;
    interior.setSuiteDoor(false);
    const eye = interior.eye(p).clone();
    const closed = hitFrom(eye, new THREE.Vector3(-side, 0, 0));
    assert(closed && closed.distance < 0.7, `${id} must be enclosed by its own door`);
    interior.setSuiteDoor(true);
    interior.eye(p);
    const open = hitFrom(eye, new THREE.Vector3(-side, 0, 0));
    assert(!open || open.distance > 1.2, `${id}'s door must clear the corridor opening`);
    assert.equal(hitFrom(eye, new THREE.Vector3(side, 0, 0)), undefined, `${id}'s panoramic window must be unobstructed`);
    const screen = hitFrom(eye, new THREE.Vector3(0, 0, -1));
    assert(screen?.object.material.isMeshBasicMaterial, `${id}'s personal screen must face its passenger`);
  }
  const p = pose('2D'); interior.eye(p);
  const attitude = { pitch: 0, bank: 0, speed: 30, alt: 163000, vs: 0, heading: 0, roll: 0 };
  const ceiling = interior.group.children.filter((child) => child.isPointLight);
  interior.setSuiteLighting(0.55); interior.update(attitude, 30, 1, 1000);
  const cozy = ceiling.map((light) => light.intensity);
  interior.setSuiteLighting(1); interior.update(attitude, 30, 1, 2000);
  assert(ceiling.every((light, index) => light.intensity > cozy[index]), 'Bright mode must illuminate the room more than Cozy');
  assert(ceiling.every((light) => light.position.x > 0 && Math.abs(light.position.z - 4) <= 2.8), 'Ceiling lights must follow the selected right-hand room');
  interior.eye(pose('8A')); interior.update(attitude, 30, 1, 3000);
  assert(ceiling.every((light) => light.position.x === 0 && light.intensity === 18), 'Standard carriage lighting must recover after leaving a suite');
  interior.eye(pose('1A')); interior.setSuiteDoor(false); interior.eye(pose('1A'));
  assert(hitFrom(interior.eye(pose('1A')), new THREE.Vector3(1, 0, 0)).distance < 0.7, 'Rebuilt suites must keep their door geometry');
  console.log('Private room enclosure, door clearance, windows, screens and lighting passed.');
} finally {
  interior.dispose();
  if (previousDocument === undefined) delete globalThis.document;
  else globalThis.document = previousDocument;
}
