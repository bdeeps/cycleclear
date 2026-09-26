// Chapter 6: disc brakes turn motion into heat. Stopping distance and disc temperature from energy.
import { THREE, M, box, torus, rod, approach, clamp } from '../kit.js';
import { makeWheel } from '../bike.js';

const MASS = 85, ROTOR_KG = 0.12, STEEL_C = 460, FRONT_SHARE = 0.7;

export default {
  id: 'brakes',
  short: 'Brakes',
  title: 'Stopping: brakes make heat',
  subtitle: 'Your speed has to go somewhere. Brakes turn it into heat.',
  view: { pos: [1.6, 1.8, 5.2], target: [0, 1.1, 0] },
  learn: `<p>A moving bike and rider carry <b>kinetic energy</b>: ½ × mass × speed². To stop, that energy has to go somewhere. Brakes squeeze pads against a spinning disc (or the rim), and <b>friction</b> turns the energy into heat.</p>
    <p>Energy grows with the <b>square</b> of speed: at 40 km/h you carry four times the energy you had at 20 km/h, so you need four times the distance to stop with the same braking force.</p>
    <p>Most braking is done by the <b>front</b> brake, because stopping shifts your weight forward onto the front wheel. Brake too hard and you could tip over the handlebars, which limits a bike to roughly 0.6 g of deceleration. On a wet road, friction drops and so does the best stopping force.</p>
    <p class="tip"><b>Try it:</b> pick a speed, press Brake, and watch the disc heat up.</p>`,
  terms: [
    { t: 'Kinetic energy', d: 'The energy of motion: ½ × mass × speed².' },
    { t: 'Friction', d: 'The force that resists two surfaces sliding. In brakes it turns motion into heat.' },
    { t: 'Deceleration', d: 'How quickly you slow down, often measured in g (9.81 m/s² each).' },
  ],
  defaults: { speed: 30, strength: 0.8, wet: false },
  controls: [
    { key: 'speed', type: 'range', label: 'Speed before braking', min: 5, max: 60, step: 1, fmt: (v) => Math.round(v) + ' km/h' },
    { key: 'strength', type: 'range', label: 'How hard you brake', min: 0.2, max: 1, step: 0.01, ends: ['gently', 'as hard as safe'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'wet', type: 'toggle', label: 'Wet road' },
    { key: 'go', type: 'buttons', label: 'Brake', items: [{ label: 'Brake!', act: (s, inst) => inst.brake(s) }, { label: 'Ride again', act: (s, inst) => inst.ride(s) }] },
  ],
  quiz: [
    { q: 'You double your speed. How much further does it take to stop?', options: ['The same', 'Twice as far', 'Four times as far', 'Half as far'], answer: 2, why: 'Energy and stopping distance grow with the square of speed.' },
    { q: 'Where does the energy go when you brake?', options: ['It disappears', 'Into heat in the pads and disc', 'Into the battery', 'Into the chain'], answer: 1, why: 'Friction turns kinetic energy into heat.' },
    { q: 'Why does the front brake do most of the stopping?', options: ['It’s bigger', 'Braking shifts your weight onto the front wheel', 'The rear brake is only for show', 'The chain helps it'], answer: 1, why: 'More weight on the front tyre means more grip for braking.' },
  ],
  reel: [
    { ms: 5400, caption: 'Brakes turn motion into heat: stopping from 40 km/h can heat the disc by over 60 °C.', set: { speed: 40, strength: 0.9, wet: false }, act: (s, inst) => { inst.ride(s); inst.brakeAfter(s, 0.8); }, spin: 0.2 },
  ],

  build({ stage }) {
    const g = new THREE.Group(); g.position.y = 1.15; stage.root.add(g);
    const wheel = makeWheel(); wheel.scale.setScalar(1.1); wheel.position.z = -0.2; g.add(wheel);
    // Rotor: a steel ring with holes, spinning with the wheel.
    const rotor = new THREE.Group(); rotor.position.z = 0.12; g.add(rotor);
    const rotorMat = new THREE.MeshStandardMaterial({ color: 0xb7bfcc, metalness: 0.9, roughness: 0.3, emissive: 0x000000, side: THREE.DoubleSide });
    rotor.add(new THREE.Mesh(new THREE.RingGeometry(0.28, 0.52, 64), rotorMat));
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const hole = new THREE.Mesh(new THREE.CircleGeometry(0.035, 12), M.glow(0x0b0d12)); hole.position.set(Math.cos(a) * 0.43, Math.sin(a) * 0.43, 0.002); rotor.add(hole); }
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const arm = box(0.3, 0.04, 0.02, M.metal(0x9aa3b2)); arm.position.set(Math.cos(a) * 0.17, Math.sin(a) * 0.17, 0); arm.rotation.z = a; rotor.add(arm); }
    // Caliper with two pads, at the back of the disc.
    const caliper = new THREE.Group(); caliper.position.set(-0.3, 0.3, 0.12); caliper.rotation.z = 0.8; g.add(caliper);
    caliper.add(box(0.32, 0.22, 0.12, M.plastic(0x2a2e37)));
    const padA = box(0.2, 0.14, 0.03, M.matte(0x6b5a44)), padB = box(0.2, 0.14, 0.03, M.matte(0x6b5a44));
    caliper.add(padA, padB); const caliperBody = caliper.children[0]; caliperBody.position.set(0, 0.14, 0);
    const ground = new THREE.Mesh(new THREE.BoxGeometry(6, 0.1, 2), M.matte(0x3a3f4a)); ground.position.y = -0.05; ground.receiveShadow = true; stage.root.add(ground);
    stage.label('Disc (rotor)', [0.55, -0.5, 0.2], g);
    stage.label('Caliper squeezes the pads', [-0.8, 0.8, 0.2], g, 'hot');

    let v = 0, braking = false, heat = 0, angle = 0, travelled = 0, timer = -1, v0 = 0;
    const api = {
      ride: (s) => { v = s.speed / 3.6; braking = false; travelled = 0; },
      brake: (s) => { if (v <= 0.05) v = s.speed / 3.6; v0 = v; braking = true; travelled = 0; },
      brakeAfter: (s, t) => { timer = t; },
    };
    const decel = (s) => s.strength * (s.wet ? 0.33 : 0.62) * 9.81;
    const out = { dist: 0, rise: 0 };
    return {
      ...api,
      update(dt, s) {
        if (timer >= 0) { timer -= dt; if (timer < 0) api.brake(s); }
        if (!braking && v === 0 && timer < 0) v = s.speed / 3.6;
        if (braking && v > 0) {
          const a = decel(s), dv = Math.min(v, a * dt);
          const e = 0.5 * MASS * (v * v - (v - dv) ** 2) * FRONT_SHARE;   // joules into the front disc
          heat += e / (ROTOR_KG * STEEL_C);
          travelled += (v - dv / 2) * dt; v -= dv;
          if (v <= 0) v = 0;
        }
        heat = Math.max(0, heat - dt * heat * 0.05);                      // slowly cools
        angle -= (v / 0.34) * dt; wheel.rotation.z = angle; rotor.rotation.z = angle;
        const squeeze = braking && v > 0 ? 1 : 0;
        padA.position.set(0, 0, 0.045 - squeeze * 0.02); padB.position.set(0, 0, -0.045 + squeeze * 0.02);
        const glow = clamp(heat / 120, 0, 1);
        rotorMat.emissive.setRGB(glow * 1.0, glow * 0.32, glow * 0.05);
        rotorMat.color.setRGB(0.72 + glow * 0.2, 0.75 - glow * 0.3, 0.8 - glow * 0.5);
        out.dist = (s.speed / 3.6) ** 2 / (2 * decel(s));
        out.rise = (0.5 * MASS * (s.speed / 3.6) ** 2 * FRONT_SHARE) / (ROTOR_KG * STEEL_C);
      },
      readout: (s) => `<div class="big">${(v * 3.6).toFixed(0)} km/h</div>
        <div class="row"><span>Stopping distance</span><b>${out.dist.toFixed(1)} m</b></div>
        <div class="row"><span>Energy to get rid of</span><b>${((0.5 * MASS * (s.speed / 3.6) ** 2) / 1000).toFixed(1)} kJ</b></div>
        <div class="row"><span>Front disc warms by about</span><b>${Math.round(out.rise)} °C</b></div>
        <div class="row"><span>Disc now</span><b>+${Math.round(heat)} °C</b></div>`,
    };
  },
};
