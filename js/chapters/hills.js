// Chapter 3: hills. How much force your feet need, from real physics.
import { THREE, M, arrow, approach } from '../kit.js';
import { makeBike, R } from '../bike.js';

const MASS = 85, G = 9.81, CRR = 0.005, CDA = 0.4, RHO = 1.2;   // rider + bike, rolling, air
const WHEEL_R = 0.34, CRANK = 0.17, SPEED = 12 / 3.6;             // m, m, m/s (12 km/h)

export function pedalForce(slopePct, front, rear) {
  const th = Math.atan(slopePct / 100);
  const resist = MASS * G * (Math.sin(th) + CRR * Math.cos(th)) + 0.5 * RHO * CDA * SPEED ** 2; // newtons at the tyre
  const torqueWheel = resist * WHEEL_R;
  const torqueCrank = torqueWheel * (front / rear);   // same chain tension on both sprockets
  return torqueCrank / CRANK;                                       // average push on the pedal
}

export default {
  id: 'hills',
  short: 'Hills',
  title: 'Gears on a hill',
  subtitle: 'Why a bigger rear cog makes a climb feel easier.',
  view: { pos: [1.5, 2.8, 8.5], target: [0, 1.6, 0] },
  learn: `<p>Riding uphill, part of gravity pulls you back down the slope. On a 10% hill (up 10 m for every 100 m along), about a tenth of your weight is pulling you backwards. For a rider and bike of 85 kg, that's roughly 83 newtons at the tyre.</p>
    <p>Gears don't reduce that work. They change how it reaches your legs. A bigger rear cog (a <b>lower gear</b>) multiplies the force of your push, so each stroke is easier, but you need more strokes to cover the same ground. It's the same trade as a long lever.</p>
    <p>That's why riders change down before a climb: they keep a comfortable push and a comfortable cadence, instead of grinding a heavy gear slowly.</p>
    <p class="tip"><b>Try it:</b> make the hill steeper, then pick a bigger rear cog and watch the push on the pedal shrink.</p>`,
  terms: [
    { t: 'Gradient', d: 'How steep a road is: 10% means it rises 10 m over 100 m.' },
    { t: 'Torque', d: 'Turning force: force times the length of the lever it acts on.' },
    { t: 'Low gear', d: 'Small chainring and big rear cog. Easy to push, but slow.' },
  ],
  defaults: { slope: 6, front: 34, rear: 17 },
  controls: [
    { key: 'slope', type: 'range', label: 'Hill steepness', min: 0, max: 15, step: 0.5, ends: ['flat', 'very steep'], fmt: (v) => v.toFixed(1) + '%' },
    { key: 'front', type: 'seg', label: 'Front chainring', options: [{ v: 34, label: '34' }, { v: 50, label: '50' }] },
    { key: 'rear', type: 'seg', label: 'Rear cog', options: [11, 15, 19, 24, 28, 32].map((v) => ({ v, label: String(v) })) },
  ],
  quiz: [
    { q: 'On a hill, a lower gear…', options: ['Reduces the total work', 'Reduces the push on each pedal stroke, but you pedal more', 'Makes you faster', 'Does nothing'], answer: 1, why: 'Gears trade force for distance; the work stays the same.' },
    { q: 'Roughly what share of your weight pulls you back on a 10% hill?', options: ['1%', 'About 10%', '50%', '100%'], answer: 1, why: 'The pull is weight × sin(angle), about 10% on a 10% gradient.' },
    { q: 'Which is the lowest (easiest) gear?', options: ['50 front, 11 rear', '34 front, 32 rear', '50 front, 32 rear', '34 front, 11 rear'], answer: 1, why: 'Smallest ring and biggest cog give the lowest ratio.' },
  ],
  reel: [
    { ms: 5000, caption: 'On a hill, part of gravity pulls you back. A bigger rear cog shrinks the push you need.', set: { front: 34, slope: 10 }, anim: { rear: [11, 32] }, spin: 0.3 },
  ],

  build({ stage }) {
    const world = new THREE.Group(); stage.root.add(world);
    const road = new THREE.Mesh(new THREE.BoxGeometry(22, 0.2, 3), M.matte(0x3a3f4a));
    road.position.y = -0.1; road.receiveShadow = true; world.add(road);
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(22, 0.08), M.glow(0xf5d547)); stripe.rotation.x = -Math.PI / 2; stripe.position.y = 0.005; world.add(stripe);
    const b = makeBike({ color: 0xff7a59 }); world.add(b.group);
    const push = arrow(0xffb547, 1, 0.3, 0.05); stage.root.add(push);
    const pull = arrow(0x8ef0ff, 1, 0.3, 0.05); stage.root.add(pull);
    stage.label('Gravity pulling you back', [0, 0, 0], pull, 'hot');
    stage.label('Push on the pedal', [0, 0, 0], push, 'hot');
    const tmp = new THREE.Vector3();
    let angle = 0, crank = 0, shownF = 0;
    return {
      update(dt, s) {
        const th = Math.atan(s.slope / 100);
        angle = approach(angle, th, 4, dt);
        world.rotation.z = angle;
        const F = pedalForce(s.slope, s.front, s.rear);
        shownF = approach(shownF, F, 6, dt);
        const cadence = (SPEED / (2 * Math.PI * WHEEL_R)) * 60 / (s.front / s.rear);
        crank -= (cadence / 60) * Math.PI * 2 * dt;
        b.setCrank(crank); b.setWheels(crank * (s.front / s.rear));
        // Push arrow on the forward pedal, pointing down; pull arrow at the saddle, pointing downhill.
        b.pedalWorld(tmp);
        push.position.copy(tmp).add(new THREE.Vector3(0, 0, 0.35)); push.rotation.set(0, 0, Math.PI);
        push.set(0.3 + shownF / 350);
        const g = MASS * G * Math.sin(angle);
        pull.position.set(Math.cos(angle) * -0.4, Math.sin(angle) * -0.4 + 2.2, 0.4);
        pull.rotation.set(0, 0, Math.PI / 2 + angle);
        pull.set(0.05 + g / 90);
      },
      readout: (s) => {
        const F = pedalForce(s.slope, s.front, s.rear);
        const cadence = (SPEED / (2 * Math.PI * WHEEL_R)) * 60 / (s.front / s.rear);
        return `<div class="big">${Math.round(F)} N on the pedal</div>
          <div class="row"><span>That's like pushing</span><b>${(F / G).toFixed(0)} kg</b></div>
          <div class="row"><span>To ride at 12 km/h, pedal at</span><b>${Math.round(cadence)} rpm</b></div>
          <div class="row"><span>Gear ratio</span><b>${(s.front / s.rear).toFixed(2)}</b></div>`;
      },
    };
  },
};
