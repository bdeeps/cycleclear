// Chapter 2: from pedals to wheel. Gear ratios, cadence and speed with real numbers.
import { THREE, M, swarm, box, approach } from '../kit.js';
import { makeWheel, sprocket, teethRadius, beltPath } from '../bike.js';

const WHEEL_CIRC = 2.1;                          // metres, a typical 700c road tyre
const SCALE = 2.2;                                // this chapter shows the drivetrain bigger
const CHAINSTAY = 410 / 340;                      // 41 cm between the axles, in scene units

function pathLength(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L + Math.hypot(pts[0][0] - pts.at(-1)[0], pts[0][1] - pts.at(-1)[1]); }
function pointAt(pts, cum, s) {
  const L = cum.at(-1); s = ((s % L) + L) % L;
  let i = 1; while (cum[i] < s) i++;
  const a = pts[i - 1], b = pts[i % pts.length], k = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, Math.atan2(b[1] - a[1], b[0] - a[0])];
}

export default {
  id: 'drivetrain',
  short: 'Chain and gears',
  title: 'Pedal to wheel: chain and gears',
  subtitle: 'A chain links two sprockets; their sizes set how far each pedal stroke takes you.',
  view: { pos: [-0.6, 2.4, 6.2], target: [-1.3, 1.6, 0] },
  learn: `<p>Your feet turn the <b>cranks</b>, which turn the front <b>chainring</b>. The <b>chain</b> wraps round it and round a small <b>cog</b> on the rear wheel, so every tooth that passes the front also passes the back.</p>
    <p>That makes the <b>gear ratio</b> simple: front teeth ÷ rear teeth. With 50 teeth in front and 25 behind, the rear wheel turns twice for every turn of the pedals. Multiply by the wheel's circumference (about 2.1 m) and you get how far one pedal stroke takes you.</p>
    <p>A <b>derailleur</b> shifts the chain between cogs. Smaller rear cog: more distance per stroke, but harder to push. Bigger rear cog: easier, but you have to pedal faster.</p>
    <p class="tip"><b>Try it:</b> keep the cadence at 90 and change gears. Watch the speed.</p>`,
  terms: [
    { t: 'Gear ratio', d: 'Front teeth divided by rear teeth: how many times the wheel turns per pedal turn.' },
    { t: 'Cadence', d: 'How fast you pedal, in revolutions per minute (rpm).' },
    { t: 'Development', d: 'How far the bike travels for one full turn of the pedals.' },
    { t: 'Derailleur', d: 'The mechanism that pushes the chain from one cog to another.' },
  ],
  defaults: { cadence: 80, front: 50, rear: 17 },
  controls: [
    { key: 'cadence', type: 'range', label: 'Pedalling speed (cadence)', min: 0, max: 120, step: 1, fmt: (v) => Math.round(v) + ' rpm' },
    { key: 'front', type: 'seg', label: 'Front chainring', options: [{ v: 34, label: '34' }, { v: 50, label: '50' }], fmt: (v) => Math.round(v) + ' teeth' },
    { key: 'rear', type: 'seg', label: 'Rear cog', options: [11, 13, 15, 17, 19, 21, 24, 28].map((v) => ({ v, label: String(v) })), fmt: (v) => Math.round(v) + ' teeth' },
  ],
  quiz: [
    { q: 'Front 50 teeth, rear 25 teeth. How many times does the wheel turn per pedal turn?', options: ['Half a turn', 'Once', 'Twice', 'Four times'], answer: 2, why: '50 ÷ 25 = 2.' },
    { q: 'Which rear cog makes pedalling uphill easier?', options: ['The smallest', 'The biggest', 'It makes no difference', 'None; only the front matters'], answer: 1, why: 'A bigger rear cog lowers the ratio, so each stroke takes less force (and less distance).' },
    { q: 'At the same cadence, a higher gear ratio means…', options: ['Slower riding', 'Faster riding', 'The same speed', 'The chain comes off'], answer: 1, why: 'More wheel turns per pedal turn means more distance per minute.' },
  ],
  reel: [
    { ms: 5400, caption: 'Gears trade effort for speed: a smaller rear cog turns the wheel more per pedal stroke.', set: { cadence: 90, front: 50 }, anim: { rear: [28, 11] }, spin: 0.08 },
  ],

  build({ stage }) {
    const g = new THREE.Group(); g.scale.setScalar(SCALE); stage.root.add(g);
    const C1 = [0, 0.8], C2 = [-CHAINSTAY, 0.8];
    const wheel = makeWheel(); wheel.position.set(C2[0], C2[1], -0.12); wheel.scale.setScalar(0.999); g.add(wheel);
    let ring = null, cog = null, current = { f: 0, r: 0 };
    const cranks = new THREE.Group(); cranks.position.set(...C1, 0.18); g.add(cranks);
    const arm = box(0.08, 0.5, 0.04, M.metal(0x2a2e37)); arm.position.y = -0.25; cranks.add(arm);
    const pedal = box(0.3, 0.05, 0.18, M.matte(0x1b1d22)); pedal.position.set(0, -0.5, 0.08); cranks.add(pedal);
    const links = swarm(160, new THREE.BoxGeometry(0.034, 0.024, 0.045), M.metal(0xc0c7d4));
    g.add(links);
    const derail = new THREE.Group();
    derail.add(box(0.06, 0.34, 0.03, M.metal(0x2a2e37)));
    const pulley1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 20), M.metal(0x2a2e37)); pulley1.rotation.x = Math.PI / 2; pulley1.position.y = -0.17; derail.add(pulley1);
    g.add(derail);

    const lRing = stage.label('Chainring', [0, 0, 0], g);
    const lCog = stage.label('Rear cog', [0, 0, 0], g);
    stage.label('Chain', [-0.6, 1.25, 0.1], g, 'hot');
    stage.label('Derailleur shifts the chain', [-1.1, 0.25, 0.1], g);

    let path = [], cum = [], crank = 0, travel = 0, wheelAngle = 0, shown = { f: 50, r: 17 };
    const rebuild = (f, r) => {
      if (ring) g.remove(ring); if (cog) g.remove(cog);
      ring = sprocket(f, 0x9aa3b2, 0.15); ring.position.set(...C1, 0.15); g.add(ring);
      cog = sprocket(r, 0xc9ced8, 0.15); cog.position.set(...C2, 0.15); g.add(cog);
      path = beltPath(C1, teethRadius(f), C2, teethRadius(r), 120);
      cum = [0]; for (let i = 1; i <= path.length; i++) cum.push(cum[i - 1] + Math.hypot(path[i % path.length][0] - path[i - 1][0], path[i % path.length][1] - path[i - 1][1]));
      lRing.position.set(C1[0], C1[1] + teethRadius(f) + 0.18, 0.2);
      lCog.position.set(C2[0], C2[1] - teethRadius(r) - 0.2, 0.2);
      derail.position.set(C2[0] + 0.02, C2[1] - teethRadius(r) - 0.12, 0.15);
      current = { f, r };
    };
    return {
      update(dt, s) {
        shown.f = approach(shown.f, s.front, 6, dt); shown.r = approach(shown.r, s.rear, 6, dt);
        const f = Math.round(shown.f), r = Math.round(shown.r);
        if (f !== current.f || r !== current.r) rebuild(f, r);
        const w = (s.cadence / 60) * Math.PI * 2;      // crank angular speed, rad/s
        crank -= w * dt; cranks.rotation.z = crank; ring.rotation.z = crank;
        const ratio = f / r;
        wheelAngle -= w * ratio * dt; cog.rotation.z = wheelAngle; wheel.rotation.z = wheelAngle;
        travel += w * teethRadius(f) * dt;               // chain speed = ring pitch radius × ω
        const L = cum.at(-1), pitch = 12.7 / 340, n = Math.min(160, Math.floor(L / pitch));
        for (let i = 0; i < 160; i++) {
          if (i >= n) { links.place(i, [0, -50, 0], null, 0.001); continue; }
          const [x, y, a] = pointAt(path, cum, -travel + i * pitch);
          links.place(i, [x, y, 0.15], [0, 0, a]);
        }
        links.done();
      },
      readout: (s) => {
        const ratio = s.front / s.rear, dev = ratio * WHEEL_CIRC, kmh = (s.cadence * dev * 60) / 1000;
        return `<div class="big">${kmh.toFixed(1)} km/h</div>
          <div class="row"><span>Gear ratio</span><b>${s.front} ÷ ${s.rear} = ${ratio.toFixed(2)}</b></div>
          <div class="row"><span>Each pedal turn goes</span><b>${dev.toFixed(1)} m</b></div>
          <div class="row"><span>Wheel turns</span><b>${Math.round(s.cadence * ratio)} rpm</b></div>`;
      },
    };
  },
};
