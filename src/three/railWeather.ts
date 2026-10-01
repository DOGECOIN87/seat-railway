/**
 * The weather outside the train: rain, snow, lightning and mist.
 *
 * Rain is drawn as streaks, each drop stretched along the way it is moving
 * past the camera, so at a standstill it falls straight and at speed it rakes
 * across the view the way it does past a real train window. Snow is soft
 * flakes that flutter. Both fill a box that travels with the camera but whose
 * contents stay put in the world, so the train runs through the weather
 * rather than carrying it along.
 *
 * Storms throw forked lightning: a bolt drawn from the cloud base to the
 * ground somewhere off the line, a flash that flickers twice, and the light it
 * gives the scene for a moment (`flash`, for the world to add to its own).
 *
 * The world owns the clock and the camera; this only needs telling where the
 * camera is, how it is moving and what the sky is doing.
 */
import * as THREE from 'three';

const BOX = 90;

export interface WeatherFrame {
  /** Seconds, running. */
  time: number;
  dt: number;
  camera: THREE.Camera;
  /** The camera's position in the scene, and the same point on the world's own grid (for the drops' wrap). */
  camScene: THREE.Vector3;
  camWorld: THREE.Vector3;
  /** The train's velocity over the ground, m/s, in scene axes. */
  trainVel: THREE.Vector3;
  rain: number;
  snow: number;
  storm: boolean;
  fog: number;
  /** 0 by day to 1 at night: rain catches less light after dark. */
  night: number;
  /** The horizon's colour, for the mist and the drops. */
  horizon: THREE.Color;
  /** The ground at a point, scene coordinates: where a bolt strikes. */
  groundAt: (x: number, z: number) => number;
  lowPower: boolean;
}

export function createWeather(scene: THREE.Scene) {
  const owned: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(d: T): T => { owned.push(d); return d; };

  /* ── Drops and flakes: one quad each, instanced ── */
  const MAX = 16000;
  const quad = new THREE.InstancedBufferGeometry();
  quad.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3));
  quad.setIndex([0, 1, 2, 0, 2, 3]);
  const offsets = new Float32Array(MAX * 3);
  const rands = new Float32Array(MAX);
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < MAX; i++) {
    offsets[i * 3] = rand() * BOX;
    offsets[i * 3 + 1] = rand() * BOX;
    offsets[i * 3 + 2] = rand() * BOX;
    rands[i] = rand();
  }
  quad.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
  quad.setAttribute('aRand', new THREE.InstancedBufferAttribute(rands, 1));
  quad.instanceCount = 0;
  keep(quad);

  const dropUniforms = {
    uShift: { value: new THREE.Vector3() },
    uCamScene: { value: new THREE.Vector3() },
    uCamWrap: { value: new THREE.Vector3() },
    uRel: { value: new THREE.Vector3(0, -9, 0) },
    uSnow: { value: 0 },
    uTime: { value: 0 },
    uColor: { value: new THREE.Color() },
    uOpacity: { value: 0.5 },
  };
  const dropMat = keep(new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: dropUniforms,
    vertexShader: /* glsl */ `
      attribute vec3 aOffset;
      attribute float aRand;
      uniform vec3 uShift, uCamScene, uCamWrap, uRel;
      uniform float uSnow, uTime;
      varying vec2 vQuad;
      varying float vFade;
      #include <common>
      #include <logdepthbuf_pars_vertex>
      void main() {
        const float BOX = ${BOX.toFixed(1)};
        // Where this drop is: fixed in the world, wrapped into a box round the camera.
        vec3 p = mod(aOffset + uShift * (0.8 + aRand * 0.4) - uCamWrap, BOX) - BOX * 0.5;
        // Snow drifts and turns as it falls.
        p.x += uSnow * sin(uTime * (0.6 + aRand) + aRand * 40.0) * 0.9;
        p.z += uSnow * cos(uTime * (0.5 + aRand * 0.8) + aRand * 17.0) * 0.9;
        vec3 world = uCamScene + p;
        vec4 mv = viewMatrix * vec4(world, 1.0);
        // A streak along the way it moves past the camera; a flake is a small round sprite.
        vec3 dir = normalize((viewMatrix * vec4(uRel, 0.0)).xyz + vec3(0.0, 1e-4, 0.0));
        float len = mix(clamp(length(uRel) * 0.03, 0.35, 3.2), 0.07 + aRand * 0.05, uSnow);
        float wide = mix(0.012 + aRand * 0.008, 0.07 + aRand * 0.05, uSnow);
        vec3 side = normalize(cross(dir, vec3(0.0, 0.0, 1.0)) + vec3(1e-4, 0.0, 0.0));
        vec3 up = mix(dir, vec3(0.0, 1.0, 0.0), uSnow);
        vec3 across = mix(side, vec3(1.0, 0.0, 0.0), uSnow);
        mv.xyz += up * (position.y - 0.5) * mix(len, wide, uSnow) + across * position.x * wide;
        gl_Position = projectionMatrix * mv;
        vQuad = position.xy;
        // Thin out at the edges of the box, so its walls never show.
        vFade = 1.0 - smoothstep(0.32, 0.5, max(abs(p.x), max(abs(p.y), abs(p.z))) / BOX);
        vFade *= smoothstep(0.4, 2.5, -mv.z);
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity, uSnow;
      varying vec2 vQuad;
      varying float vFade;
      #include <common>
      #include <logdepthbuf_pars_fragment>
      void main() {
        #include <logdepthbuf_fragment>
        float across = 1.0 - abs(vQuad.x) * 2.0;
        float along = sin(vQuad.y * 3.14159);
        float streak = across * along;
        vec2 c = vec2(vQuad.x, vQuad.y - 0.5);
        float flake = 1.0 - smoothstep(0.25, 0.5, length(c));
        float a = mix(streak, flake, uSnow) * uOpacity * vFade;
        if (a < 0.01) discard;
        gl_FragColor = vec4(uColor, a);
      }`,
  }));
  const drops = new THREE.Mesh(quad, dropMat);
  drops.frustumCulled = false;
  drops.renderOrder = 5;
  scene.add(drops);

  /* ── Lightning ── */
  const BOLT_POINTS = 64;
  const boltGeo = keep(new THREE.BufferGeometry());
  const boltPos = new Float32Array(BOLT_POINTS * 2 * 3);
  boltGeo.setAttribute('position', new THREE.BufferAttribute(boltPos, 3));
  const boltMat = keep(new THREE.LineBasicMaterial({ color: 0xeef2ff, transparent: true, opacity: 0, fog: false, blending: THREE.AdditiveBlending, depthWrite: false }));
  const bolt = new THREE.LineSegments(boltGeo, boltMat);
  bolt.frustumCulled = false;
  bolt.visible = false;
  scene.add(bolt);
  const glowMat = keep(new THREE.LineBasicMaterial({ color: 0x9fb6ff, transparent: true, opacity: 0, fog: false, blending: THREE.AdditiveBlending, depthWrite: false }));
  const glow = new THREE.LineSegments(boltGeo, glowMat);
  glow.frustumCulled = false;
  glow.scale.set(1.004, 1, 1.004);
  glow.visible = false;
  scene.add(glow);
  let nextStrike = 4;
  let strikeAt = -10;
  let segments = 0;

  const strike = (f: WeatherFrame) => {
    // Somewhere ahead and off to one side, far enough to be a sight and not a hit.
    const ang = (rand() - 0.5) * 2.4;
    const dist = 300 + rand() * 1300;
    const fwd = f.trainVel.lengthSq() > 1 ? f.trainVel.clone().setY(0).normalize() : new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const gx = f.camScene.x + (fwd.x * Math.cos(ang) + right.x * Math.sin(ang)) * dist;
    const gz = f.camScene.z + (fwd.z * Math.cos(ang) + right.z * Math.sin(ang)) * dist;
    const gy = f.groundAt(gx, gz);
    const top = gy + 650 + rand() * 300;
    segments = 0;
    const put = (a: THREE.Vector3, b: THREE.Vector3) => {
      if (segments >= BOLT_POINTS) return;
      a.toArray(boltPos, segments * 6);
      b.toArray(boltPos, segments * 6 + 3);
      segments++;
    };
    // The main channel, jagged, then a few forks off it.
    const main: THREE.Vector3[] = [];
    const steps = 22;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const wander = i === 0 || i === steps ? 0 : 1;
      main.push(new THREE.Vector3(gx + (rand() - 0.5) * 70 * wander + Math.sin(t * 5 + ang) * 30 * wander, top + (gy - top) * t, gz + (rand() - 0.5) * 70 * wander));
    }
    for (let i = 0; i < steps; i++) put(main[i], main[i + 1]);
    for (let k = 0; k < 4; k++) {
      let p = main[2 + Math.floor(rand() * (steps - 8))].clone();
      const dx = (rand() - 0.5) * 90, dz = (rand() - 0.5) * 90;
      for (let i = 0; i < 6; i++) {
        const q = p.clone().add(new THREE.Vector3(dx * (0.5 + rand()), -(25 + rand() * 30), dz * (0.5 + rand())));
        put(p, q);
        p = q;
      }
    }
    (boltGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    boltGeo.setDrawRange(0, segments * 2);
    strikeAt = f.time;
  };

  /** How bright the lightning is now, 0–1: two quick flickers and a fade. */
  const flashAt = (t: number) => {
    const s = t - strikeAt;
    if (s < 0 || s > 0.9) return 0;
    const first = Math.exp(-s * 18);
    const second = s > 0.12 ? Math.exp(-(s - 0.12) * 9) * 0.85 : 0;
    const third = s > 0.32 ? Math.exp(-(s - 0.32) * 14) * 0.45 : 0;
    return Math.min(1, first + second + third);
  };

  /* ── Mist: soft sheets low over the ground in fog and after rain ── */
  const mistTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    return keep(t);
  })();
  const MISTS = 36;
  const mistMat = keep(new THREE.SpriteMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0 }));
  const mists: { sprite: THREE.Sprite; x: number; z: number; s: number }[] = [];
  for (let i = 0; i < MISTS; i++) {
    const sprite = new THREE.Sprite(mistMat);
    sprite.visible = false;
    scene.add(sprite);
    mists.push({ sprite, x: (rand() - 0.5) * 900, z: (rand() - 0.5) * 900, s: 60 + rand() * 90 });
  }

  const shift = new THREE.Vector3();
  const fall = new THREE.Vector3();

  return {
    /** Moves the weather on a frame; returns the lightning's light, 0–1, for the world's own lamps and sky. */
    update(f: WeatherFrame): number {
      const amount = Math.max(f.rain, f.snow);
      const snowing = f.snow > f.rain;
      // How the drops fall in the world: rain fast and blown a little, snow slow.
      fall.set(snowing ? 0.6 : 2.2, snowing ? -1.6 : -11, snowing ? 0.3 : 0.8);
      shift.copy(fall).multiplyScalar(f.time).set(((shift.x % BOX) + BOX) % BOX, ((shift.y % BOX) + BOX) % BOX, ((shift.z % BOX) + BOX) % BOX);
      dropUniforms.uShift.value.copy(shift);
      dropUniforms.uCamScene.value.copy(f.camScene);
      dropUniforms.uCamWrap.value.set(((f.camWorld.x % BOX) + BOX) % BOX, ((f.camWorld.y % BOX) + BOX) % BOX, ((f.camWorld.z % BOX) + BOX) % BOX);
      dropUniforms.uRel.value.copy(fall).sub(f.trainVel);
      dropUniforms.uSnow.value = snowing ? 1 : 0;
      dropUniforms.uTime.value = f.time;
      dropUniforms.uColor.value.copy(f.horizon).lerp(new THREE.Color(snowing ? 0xffffff : 0xc9d6e2), 0.6).multiplyScalar(snowing ? 1 : 1 - f.night * 0.45);
      dropUniforms.uOpacity.value = snowing ? 0.9 : 0.32 + (f.storm ? 0.12 : 0);
      const cap = f.lowPower ? MAX / 2.5 : MAX;
      quad.instanceCount = Math.round(cap * Math.min(1, amount) * (snowing ? 0.55 : f.storm ? 1 : 0.7));
      drops.visible = quad.instanceCount > 0;

      // Lightning, in a storm, every few seconds.
      if (f.storm && f.time > nextStrike) {
        strike(f);
        nextStrike = f.time + 3 + rand() * 7;
      }
      if (!f.storm) nextStrike = Math.max(nextStrike, f.time + 2);
      const flash = flashAt(f.time);
      const showBolt = f.time - strikeAt < 0.42 && segments > 0;
      bolt.visible = glow.visible = showBolt;
      boltMat.opacity = showBolt ? Math.min(1, flash * 1.4 + 0.25) : 0;
      glowMat.opacity = boltMat.opacity * 0.5;

      // Mist: in fog, after rain, and in the snow; it drifts and parts round the camera.
      const mist = Math.min(1, f.fog + f.rain * 0.35 + f.snow * 0.25);
      mistMat.opacity = mist * 0.22;
      mistMat.color.copy(f.horizon).lerp(new THREE.Color(0xffffff), 0.25);
      for (const m of mists) {
        m.sprite.visible = mist > 0.02;
        if (!m.sprite.visible) continue;
        m.x += 1.6 * f.dt;
        let dx = ((m.x - f.camWorld.x) % 900 + 1350) % 900 - 450;
        let dz = ((m.z - f.camWorld.z) % 900 + 1350) % 900 - 450;
        if (Math.hypot(dx, dz) < 25) { dx *= 1.8; dz *= 1.8; }
        const x = f.camScene.x + dx, z = f.camScene.z + dz;
        m.sprite.position.set(x, f.groundAt(x, z) + m.s * 0.12, z);
        m.sprite.scale.set(m.s * 2.2, m.s * 0.5, 1);
      }
      return flash;
    },
    dispose() {
      for (const d of owned) d.dispose();
      scene.remove(drops, bolt, glow);
      for (const m of mists) scene.remove(m.sprite);
    },
  };
}
