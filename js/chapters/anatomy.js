// Chapter 1: the parts of a bicycle, and why the frame is two triangles.
import { THREE, M, exploder } from '../kit.js';
import { makeBike } from '../bike.js';

export default {
  id: 'anatomy',
  short: 'Anatomy',
  title: 'Anatomy of a bicycle',
  subtitle: 'Two triangles, two wheels, a chain and a way to steer.',
  view: { pos: [2.5, 2.6, 7.5], target: [0, 1.4, 0] },
  learn: `<p>A bicycle turns the push of your legs into forward motion, while letting you steer and balance. Its parts group into a few systems:</p>
    <p>The <b>frame</b> holds everything together. Most frames are a <b>diamond</b>: two triangles sharing the seat tube. A triangle can't change shape unless one of its sides changes length, so a frame of thin tubes is both light and stiff.</p>
    <p>The <b>drivetrain</b> (pedals, cranks, chainring, chain and rear cogs) carries your effort to the back wheel. The <b>steering</b> (handlebars, stem, fork and front wheel) turns on bearings in the head tube. The <b>wheels</b> are a rim held in shape by tensioned spokes.</p>
    <p class="tip"><b>Try it:</b> take the bike apart, and switch on the triangles.</p>`,
  terms: [
    { t: 'Diamond frame', d: 'The classic frame shape: a front and a rear triangle sharing the seat tube.' },
    { t: 'Drivetrain', d: 'Everything that carries pedalling effort to the rear wheel.' },
    { t: 'Head tube', d: 'The short tube at the front that the fork turns inside.' },
    { t: 'Bottom bracket', d: 'The bearing the cranks turn on, at the bottom of the seat tube.' },
  ],
  defaults: { explode: 0, triangles: false, spin: true },
  controls: [
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'exploded'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'triangles', type: 'toggle', label: 'Show the two triangles' },
    { key: 'spin', type: 'toggle', label: 'Pedal' },
  ],
  quiz: [
    { q: 'Why are bike frames made of triangles?', options: ['They look fast', 'A triangle can’t change shape unless a side changes length, so it’s stiff', 'Triangles are cheaper', 'To hold water bottles'], answer: 1, why: 'Triangles are rigid, so thin, light tubes make a stiff frame.' },
    { q: 'Which parts make up the drivetrain?', options: ['Saddle and seatpost', 'Pedals, cranks, chainring, chain and rear cogs', 'Fork and handlebars', 'Tyres and rims'], answer: 1, why: 'The drivetrain carries effort from your feet to the rear wheel.' },
    { q: 'What does the fork turn inside?', options: ['The bottom bracket', 'The head tube', 'The hub', 'The seat tube'], answer: 1, why: 'Bearings in the head tube let the fork, front wheel and handlebars steer.' },
  ],
  reel: [
    { ms: 5200, caption: 'A bicycle is two triangles, two wheels, a chain and a way to steer.', set: { spin: true, triangles: false }, anim: { explode: [0, 1] }, spin: 0.7 },
    { ms: 3800, caption: 'Triangles can’t change shape, so thin tubes make a light, stiff frame.', set: { explode: 0, triangles: true, spin: true }, spin: 0.4 },
  ],

  build({ stage }) {
    const b = makeBike();
    stage.root.add(b.group);
    const setExplode = exploder([
      { obj: b.steerPivot, off: [1.1, 0.5, 0] },
      { obj: b.rearWheel, off: [-1.3, 0, 0] },
      { obj: b.saddle, off: [-0.2, 0.9, 0] },
      { obj: b.drive, off: [0, -0.4, 1.3] },
      { obj: b.cassette, off: [-1.3, 0, 1.1] },
      { obj: b.chain, off: [0, -0.2, 0.8] },
    ]);
    // The two triangles, drawn over the frame.
    const tri = (pts, color) => {
      const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
      const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), M.ghost(color, 0.28));
      m.position.z = 0.01; b.group.add(m); return m;
    };
    const front = tri([[-0.42, 0.78], [-0.95, 2.52], [1.02, 2.38], [1.16, 1.98]], 0xff7a59);
    const rear = tri([[-0.42, 0.78], [-0.95, 2.52], [-1.5, 1]], 0x8ef0ff);
    const L = (t, obj, p) => stage.label(t, p, obj);
    L('Frame', b.frame, [0.1, 2.75, 0]);
    L('Handlebars and fork', b.steerPivot, [0.1, 0.9, 0]);
    L('Saddle', b.saddle, [-1.1, 3.15, 0]);
    L('Cranks and chainring', b.drive, [0.2, -0.55, 0.3]);
    L('Rear cogs (cassette)', b.cassette, [0, -0.45, 0.2]);
    L('Chain', b.chain, [-0.9, 0.55, 0.2]);
    L('Wheel: rim, spokes, hub', b.rearWheel, [0, -1.25, 0]);
    let a = 0;
    return {
      update(dt, s) {
        setExplode(s.explode);
        front.visible = rear.visible = s.triangles;
        if (s.spin) { a -= dt * 2.2; b.setCrank(a); b.setWheels(a * 2.4); }
      },
      readout: (s) => (s.triangles ? '<div class="big">Two triangles</div>Front triangle (orange) and rear triangle (blue) share the seat tube.' : '<div class="big">About 30 main parts</div>in five systems: frame, drivetrain, steering, wheels and brakes.'),
    };
  },
};
