// Chapter 5: the tension-spoked wheel. Under load, the spokes at the bottom
// lose tension; the rest barely change.
import { THREE, M, torus, rod, arrow, approach, clamp } from '../kit.js';

const T0 = 1000;          // typical spoke tension, newtons (about 100 kgf)

// Tension drop for a spoke at angle a from straight down, sharing load W between the bottom spokes.
function tensions(n, W, rot) {
  const out = new Array(n), f = new Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const a = ((i / n) * Math.PI * 2 + rot) % (Math.PI * 2);        // 0 = pointing down
    const d = Math.min(a, Math.PI * 2 - a);
    f[i] = d < 0.75 ? Math.cos((d / 0.75) * (Math.PI / 2)) ** 2 : 0;
    sum += f[i] * Math.cos(d);
  }
  for (let i = 0; i < n; i++) out[i] = T0 - (sum > 0 ? (W * f[i]) / sum : 0);
  return out;
}

export default {
  id: 'wheel',
  short: 'Spoked wheels',
  title: 'A wheel of thin wires',
  subtitle: 'Spokes can only pull, yet the wheel carries your weight.',
  view: { pos: [0.4, 1.6, 6.8], target: [0, 1.2, 0] },
  learn: `<p>A spoke is a thin steel wire. It can't be pushed without bending, so how can 32 of them hold up a rider?</p>
    <p>The trick is <b>pre-tension</b>. Every spoke is tightened to about 1,000 newtons, pulling the rim inward from all sides. The rim, squeezed evenly all round, stays perfectly round.</p>
    <p>Sit on the bike and your weight pushes the hub down. Only the few spokes at the <b>bottom</b> change: they <b>lose</b> some tension, while the rest stay almost the same. As the wheel turns, each spoke loses tension as it passes the bottom and regains it after, hundreds of times a minute. That's why spokes eventually fail from fatigue.</p>
    <p class="tip"><b>Try it:</b> add weight and watch the colours, then spin the wheel and follow the highlighted spoke.</p>`,
  terms: [
    { t: 'Pre-tension', d: 'The pull built into every spoke before the wheel carries any load.' },
    { t: 'Hub', d: 'The centre of the wheel, where the spokes start and the axle runs.' },
    { t: 'Fatigue', d: 'Metal weakening from being loaded and unloaded over and over.' },
  ],
  defaults: { load: 90, spokes: 32, spin: true },
  controls: [
    { key: 'load', type: 'range', label: 'Rider and bike', min: 0, max: 150, step: 1, ends: ['empty', 'heavy'], fmt: (v) => Math.round(v) + ' kg' },
    { key: 'spokes', type: 'seg', label: 'Spokes', options: [{ v: 20, label: '20' }, { v: 32, label: '32' }, { v: 36, label: '36' }] },
    { key: 'spin', type: 'toggle', label: 'Roll the wheel' },
  ],
  quiz: [
    { q: 'When you sit on a bike, what happens to the spokes at the bottom of the wheel?', options: ['They get tighter', 'They lose tension', 'They bend', 'Nothing'], answer: 1, why: 'The hub pushes down on them, so they lose some of their pre-tension.' },
    { q: 'Why are spokes tightened before use?', options: ['To make them shiny', 'So the rim is pulled evenly and they never go slack under load', 'To make the wheel heavier', 'It’s not needed'], answer: 1, why: 'Pre-tension lets thin wires hold weight by losing tension instead of being pushed.' },
    { q: 'With fewer spokes, each one near the bottom…', options: ['Loses more tension', 'Loses less tension', 'Stays the same', 'Gets tighter'], answer: 0, why: 'The same weight is shared between fewer spokes.' },
  ],
  reel: [
    { ms: 5000, caption: 'Sit on a bike and only the spokes at the bottom change: they lose tension.', set: { spin: true, spokes: 32 }, anim: { load: [0, 120] }, spin: 0.15 },
  ],

  build({ stage }) {
    const g = new THREE.Group(); g.position.y = 1.35; stage.root.add(g);
    const R = 1.2;
    g.add(torus(R, 0.08, M.matte(0x1b1d22, { roughness: 0.9 }), 96), torus(R - 0.1, 0.035, M.metal(0xc9ced8), 96));
    const hub = rod(-0.15, 0.15, 0.08, 0.08, M.metal(0xb7bfcc)); hub.rotation.y = Math.PI / 2; g.add(hub);
    const ground = new THREE.Mesh(new THREE.BoxGeometry(6, 0.1, 2), M.matte(0x3a3f4a)); ground.position.y = -0.05; ground.receiveShadow = true; stage.root.add(ground);
    const weight = arrow(0xffb547, 1, 0.25, 0.05); weight.rotation.z = Math.PI; stage.root.add(weight);
    stage.label('Your weight', [0.35, 2.9, 0], stage.root, 'hot');
    const tracked = stage.label('', [0, 0, 0], g);

    let spokes = [], n = 0, rot = 0, sag = 0;
    const cold = new THREE.Color(0x8ef0ff), slack = new THREE.Color(0xff6b6b), tmp = new THREE.Color();
    const build = (count) => {
      spokes.forEach((m) => { g.remove(m); m.geometry.dispose(); });
      spokes = [];
      for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6), new THREE.MeshStandardMaterial({ color: 0x8ef0ff, metalness: 0.6, roughness: 0.3 }));
        g.add(m); spokes.push(m);
      }
      n = count;
    };
    const hubPos = new THREE.Vector3(), rimPos = new THREE.Vector3(), mid = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const state = { t: T0, low: T0 };
    return {
      update(dt, s) {
        if (s.spokes !== n) build(s.spokes);
        if (s.spin) rot = (rot + dt * 1.1) % (Math.PI * 2);
        const W = s.load * 9.81 * 0.6;                  // the rear wheel carries about 60%
        const T = tensions(n, W, rot);
        sag = approach(sag, W / 9000, 5, dt);           // exaggerated hub drop so you can see it
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + rot, side = i % 2 ? 0.07 : -0.07;
          hubPos.set(0, -sag, side);
          rimPos.set(Math.sin(a) * (R - 0.12), -Math.cos(a) * (R - 0.12), 0);
          const m = spokes[i];
          mid.copy(hubPos).add(rimPos).multiplyScalar(0.5); m.position.copy(mid);
          m.scale.y = hubPos.distanceTo(rimPos);
          m.quaternion.setFromUnitVectors(up, rimPos.clone().sub(hubPos).normalize());
          const k = clamp((T0 - T[i]) / 450, 0, 1);
          tmp.copy(cold).lerp(slack, k);
          m.material.color.copy(tmp);
          m.material.emissive = m.material.emissive || new THREE.Color();
          m.material.emissive.copy(i === 0 ? new THREE.Color(0xffffff) : tmp).multiplyScalar(i === 0 ? 0.5 : 0.15);
        }
        hub.position.y = -sag;
        state.t = T[0]; state.low = Math.min(...T);
        const a0 = rot;
        tracked.position.set(Math.sin(a0) * (R + 0.25), -Math.cos(a0) * (R + 0.25), 0);
        tracked.element.textContent = `This spoke: ${Math.round(T[0])} N`;
        weight.position.set(0, 1.35 + 1.5, 0.4); weight.set(0.3 + s.load / 120);
      },
      readout: (s) => `<div class="row"><span>Normal spoke tension</span><b>${T0} N</b></div>
        <div class="row"><span>Weight on this wheel</span><b>${Math.round(s.load * 9.81 * 0.6)} N</b></div>
        <div class="row"><span>Bottom spoke drops to</span><b>${Math.round(state.low)} N</b></div>
        <div class="row"><span>Highlighted spoke now</span><b>${Math.round(state.t)} N</b></div>`,
    };
  },
};
