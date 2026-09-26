// A bicycle model shared by CycleClear's chapters. Side view in the XY plane,
// +x is forward, the drive side faces +z. 1 unit ≈ 34 cm (a wheel's radius).
import { THREE, M, beam, torus, box, rod } from './kit.js';

export const R = 1;                        // wheel radius
export const REAR = [-1.5, R], FRONT = [1.52, R];
const BB = [-0.42, 0.78];                  // bottom bracket
const SEAT_TOP = [-0.95, 2.52], HEAD_TOP = [1.02, 2.38], HEAD_BOT = [1.16, 1.98];
export const HEAD_TILT = Math.atan2(HEAD_TOP[0] - HEAD_BOT[0], HEAD_TOP[1] - HEAD_BOT[1]); // lean of the steering axis

export function makeWheel({ spokes = 32, tyre = 0x1b1d22, rim = 0xc9ced8 } = {}) {
  const g = new THREE.Group();
  g.add(torus(R - 0.05, 0.07, M.matte(tyre, { roughness: 0.9 }), 72));
  g.add(torus(R - 0.13, 0.03, M.metal(rim), 72));
  const hub = rod(-0.12, 0.12, 0.06, 0.06, M.metal(0xb7bfcc)); hub.rotation.y = Math.PI / 2; g.add(hub);
  const pts = [];
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2, side = i % 2 ? 0.05 : -0.05;
    pts.push(0, 0, side, Math.cos(a) * (R - 0.14), Math.sin(a) * (R - 0.14), 0);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xaab2c0 })));
  return g;
}

export function sprocket(teeth, color = 0x9aa3b2, z = 0) {
  const r = teethRadius(teeth);
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.55, r, 48), M.metal(color, { side: THREE.DoubleSide }));
  g.add(ring);
  const tooth = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, 0.05, 0.02), M.metal(color), teeth);
  const o = new THREE.Object3D();
  for (let i = 0; i < teeth; i++) { const a = (i / teeth) * Math.PI * 2; o.position.set(Math.cos(a) * (r + 0.02), Math.sin(a) * (r + 0.02), 0); o.rotation.z = a; o.updateMatrix(); tooth.setMatrixAt(i, o.matrix); }
  g.add(tooth);
  g.position.z = z;
  return g;
}
// Pitch radius of a sprocket in scene units (chain pitch 12.7 mm, 1 unit = 340 mm).
export const teethRadius = (n) => (12.7 / (2 * Math.sin(Math.PI / n))) / 340;

export function makeBike({ color = 0xff7a59 } = {}) {
  const bike = new THREE.Group();
  const frameMat = M.plastic(color, { roughness: 0.35, metalness: 0.2 });
  const frame = new THREE.Group();
  const tube = (a, b, r = 0.045) => frame.add(beam([...a, 0], [...b, 0], r, frameMat));
  tube(BB, SEAT_TOP, 0.045); tube(SEAT_TOP, HEAD_TOP, 0.042); tube(BB, HEAD_BOT, 0.05); tube(HEAD_BOT, HEAD_TOP, 0.06);
  frame.add(beam([...BB, 0.07], [...REAR, 0.08], 0.03, frameMat), beam([...BB, -0.07], [...REAR, -0.08], 0.03, frameMat));
  frame.add(beam([...SEAT_TOP, 0.04], [...REAR, 0.08], 0.025, frameMat), beam([...SEAT_TOP, -0.04], [...REAR, -0.08], 0.025, frameMat));
  bike.add(frame);

  const saddle = new THREE.Group();
  saddle.add(beam([...SEAT_TOP, 0], [SEAT_TOP[0] - 0.08, SEAT_TOP[1] + 0.35, 0], 0.025, M.metal(0xb7bfcc)));
  const seat = box(0.55, 0.08, 0.22, M.matte(0x1b1d22)); seat.position.set(SEAT_TOP[0] - 0.12, SEAT_TOP[1] + 0.4, 0); saddle.add(seat);
  bike.add(saddle);

  // Steering: everything that turns with the handlebars pivots on the head tube axis.
  const steerPivot = new THREE.Group(); steerPivot.position.set(...HEAD_BOT, 0); steerPivot.rotation.z = HEAD_TILT;
  const steer = new THREE.Group(); steerPivot.add(steer); bike.add(steerPivot);
  const toLocal = (x, y) => { const dx = x - HEAD_BOT[0], dy = y - HEAD_BOT[1], c = Math.cos(HEAD_TILT), s = Math.sin(HEAD_TILT); return [dx * c + dy * s, -dx * s + dy * c]; };
  const axleL = toLocal(...FRONT);
  const forkMat = M.plastic(color, { roughness: 0.35, metalness: 0.2 });
  steer.add(beam([0, 0, 0.09], [axleL[0], axleL[1], 0.09], 0.028, forkMat), beam([0, 0, -0.09], [axleL[0], axleL[1], -0.09], 0.028, forkMat));
  const stemTop = toLocal(HEAD_TOP[0] - 0.05, HEAD_TOP[1] + 0.22);
  const bars = new THREE.Group();
  bars.add(beam([0, 0.45, 0], [stemTop[0] + 0.25, stemTop[1], 0], 0.03, M.metal(0x2a2e37)));
  bars.add(beam([stemTop[0] + 0.25, stemTop[1], -0.42], [stemTop[0] + 0.25, stemTop[1], 0.42], 0.028, M.metal(0x2a2e37)));
  steer.add(bars);
  const frontWheel = makeWheel(); frontWheel.position.set(axleL[0], axleL[1], 0); frontWheel.rotation.z = -HEAD_TILT;
  const frontSpin = new THREE.Group(); frontSpin.add(frontWheel);
  steer.add(frontSpin);

  const rearWheel = makeWheel(); rearWheel.position.set(...REAR, 0); bike.add(rearWheel);
  const cassette = new THREE.Group(); cassette.position.set(...REAR, 0.14);
  [0.6, 0.72, 0.86, 1].forEach((k, i) => { const c = sprocket(Math.round(28 * k * 0.85), 0xb7bfcc, i * 0.012); cassette.add(c); });
  bike.add(cassette);

  const drive = new THREE.Group(); drive.position.set(...BB, 0); bike.add(drive);
  const ring = sprocket(42, 0x9aa3b2, 0.14); drive.add(ring);
  const cranks = new THREE.Group(); drive.add(cranks);
  const armMat = M.metal(0x2a2e37);
  const armA = box(0.08, 0.5, 0.04, armMat); armA.position.set(0, -0.25, 0.2);
  const armB = box(0.08, 0.5, 0.04, armMat); armB.position.set(0, 0.25, -0.2);
  const pedA = box(0.28, 0.05, 0.16, M.matte(0x1b1d22)); pedA.position.set(0, -0.5, 0.3);
  const pedB = box(0.28, 0.05, 0.16, M.matte(0x1b1d22)); pedB.position.set(0, 0.5, -0.3);
  cranks.add(armA, armB, pedA, pedB);

  // Chain as a thin loop between chainring and the middle cog.
  const rr = teethRadius(42), rc = teethRadius(20);
  const chainPts = beltPath([BB[0], BB[1]], rr, [REAR[0], REAR[1]], rc, 64).map(([x, y]) => new THREE.Vector3(x, y, 0.15));
  const chain = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(chainPts, true), 200, 0.012, 6, true), M.metal(0x7a8394));
  bike.add(chain);

  return {
    group: bike, frame, saddle, steerPivot, steer, bars, frontWheel, rearWheel, cassette, drive, cranks, chain, pedA, pedB,
    setWheels(angle) { rearWheel.rotation.z = angle; frontWheel.rotation.z = -HEAD_TILT + angle; cassette.rotation.z = angle; },
    setCrank(angle) { cranks.rotation.z = angle; ring.rotation.z = angle; },
    setSteer(delta) { steer.rotation.y = delta; },
    pedalWorld(target) { return pedA.getWorldPosition(target); },
  };
}

// The loop a chain or belt makes around two sprockets (c1 in front, c2 behind).
export function beltPath(c1, r1, c2, r2, n = 48) {
  const d = Math.hypot(c2[0] - c1[0], c2[1] - c1[1]);
  const base = Math.atan2(c2[1] - c1[1], c2[0] - c1[0]);   // direction from c1 to c2
  const th = Math.acos((r1 - r2) / d);                        // tangent normal relative to base
  const pts = [];
  // Around the front sprocket on the far side from c2, then along the top, around c2, along the bottom.
  for (let i = 0; i <= n; i++) { const a = base + th + ((2 * Math.PI - 2 * th) * i) / n; pts.push([c1[0] + r1 * Math.cos(a), c1[1] + r1 * Math.sin(a)]); }
  for (let i = 0; i <= n / 2; i++) { const a = base - th + ((2 * th) * i) / (n / 2); pts.push([c2[0] + r2 * Math.cos(a), c2[1] + r2 * Math.sin(a)]); }
  return pts;
}
