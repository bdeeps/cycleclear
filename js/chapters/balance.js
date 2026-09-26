// Chapter 4: why a moving bicycle stays up. A small lean model: gravity tips
// the bike over; the front wheel steers into the lean, and at speed the turn
// swings the bike back upright.
import { THREE, M, canvasTexture, clamp } from '../kit.js';
import { makeBike } from '../bike.js';

const G = 9.81, H = 1.0, L = 1.0;      // centre of mass height and wheelbase (m)
const V_CRIT = 4.2;                    // self-stable above about 15 km/h, like many real bikes

export default {
  id: 'balance',
  short: 'Balance',
  title: 'Why a moving bike stays up',
  subtitle: 'At speed, the front wheel steers into every fall and catches it.',
  view: { pos: [-5.5, 2.4, 6.5], target: [0.3, 1.1, 0] },
  learn: `<p>A bicycle standing still falls over: its two wheels touch the ground in a line, and gravity tips it sideways. So how does a moving bike stay up, even with no rider?</p>
    <p>When a bike starts to lean, its <b>front wheel steers into the lean</b>, thanks to the tilted steering axis, the front wheel's weight, and a little help from its spinning. Steering into a fall moves the wheels back under the bike and the turn swings it upright, just like balancing a broom on your hand.</p>
    <p>Below a certain speed the correction comes too late and the bike wobbles and falls. Above it, a well-designed bike is <b>self-stable</b>: it catches every wobble on its own. Lock the handlebars and no speed will save it.</p>
    <p class="tip"><b>Try it:</b> slow down until it falls, speed up until it rides itself, then lock the handlebars.</p>`,
  terms: [
    { t: 'Self-stability', d: 'A moving bike’s ability to correct a lean without a rider.' },
    { t: 'Trail', d: 'How far behind the steering axis the front tyre touches the ground. It helps the wheel steer into a lean.' },
    { t: 'Capsize', d: 'A slow fall to one side that a bike can’t correct.' },
  ],
  defaults: { speed: 20, locked: false },
  controls: [
    { key: 'speed', type: 'range', label: 'Speed', min: 0, max: 35, step: 0.5, ends: ['stopped', 'fast'], fmt: (v) => v.toFixed(0) + ' km/h' },
    { key: 'locked', type: 'toggle', label: 'Lock the handlebars' },
    { key: 'push', type: 'buttons', label: 'Nudge it', items: [{ label: 'Push sideways', act: (s, inst) => inst.nudge() }] },
  ],
  quiz: [
    { q: 'What keeps a moving bicycle from falling over?', options: ['Only the spinning wheels acting like a gyroscope', 'The front wheel steering into the lean', 'Air pressure in the tyres', 'Nothing; it’s luck'], answer: 1, why: 'Steering into a lean brings the wheels back under the bike. Several design features make the front wheel do this.' },
    { q: 'What happens if you lock the handlebars?', options: ['It balances better', 'It falls over at any speed', 'It goes faster', 'Nothing changes'], answer: 1, why: 'Without steering, nothing can move the wheels under the bike.' },
    { q: 'Why do bikes wobble when very slow?', options: ['The steering correction comes too late', 'The tyres are too soft', 'The chain slips', 'Gravity is stronger'], answer: 0, why: 'At low speed, steering into the lean doesn’t create enough turn to swing the bike upright.' },
  ],
  reel: [
    { ms: 4600, caption: 'Too slow, and a bicycle wobbles and falls over.', set: { speed: 6, locked: false }, act: (s, inst) => { inst.reset(); inst.nudge(); }, spin: 0 },
    { ms: 5200, caption: 'At speed, the front wheel steers into every fall and catches it. The bike balances itself.', set: { speed: 24, locked: false }, act: (s, inst) => { inst.reset(); inst.nudge(); }, spin: 0.25 },
  ],

  build({ stage }) {
    const ground = canvasTexture(512, 512, (g, w, h) => {
      g.fillStyle = '#2a2e38'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f5d547'; g.fillRect(0, h / 2 - 6, w, 12);
      g.fillStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i < 2500; i++) g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
      g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2; for (let x = 0; x < w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    });
    ground.tex.wrapS = ground.tex.wrapT = THREE.RepeatWrapping; ground.tex.repeat.set(4, 2);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(40, 8), M.matte(0xffffff, { map: ground.tex }));
    road.rotation.x = -Math.PI / 2; road.position.y = 0.005; road.receiveShadow = true; stage.root.add(road);
    const holder = new THREE.Group(); stage.root.add(holder);       // rolls (leans) around the ground contact line
    const b = makeBike({ color: 0x8ef0ff }); holder.add(b.group);
    // A trace of the lean over the last few seconds, drawn above the bike.
    const hist = new Float32Array(120);
    const trace = canvasTexture(512, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(7,8,12,.6)'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
      g.strokeStyle = '#8ef0ff'; g.lineWidth = 4; g.beginPath();
      for (let i = 0; i < hist.length; i++) { const y = h / 2 - clamp(hist[i] / 1.2, -1, 1) * (h / 2 - 6); i ? g.lineTo((i / (hist.length - 1)) * w, y) : g.moveTo(0, y); }
      g.stroke();
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: trace.tex, transparent: true }));
    board.position.set(0, 3.9, 0); stage.root.add(board);
    stage.label('Lean over time', [0, 4.45, 0], stage.root);

    let phi = 0.05, dphi = 0, delta = 0, fallen = 0, scroll = 0, wheel = 0, sinceNudge = 0, crank = 0;
    const api = {
      nudge: () => { dphi += 0.55; fallen = 0; sinceNudge = 0; },
      reset: () => { phi = 0.02; dphi = 0; delta = 0; fallen = 0; hist.fill(0); },
    };
    const state = { mode: 'ok' };
    return {
      ...api,
      update(dt, s) {
        const v = s.speed / 3.6;
        const ks = s.locked ? 0 : (G * L) / (V_CRIT * V_CRIT);   // how strongly the front steers into a lean
        const kd = s.locked ? 0 : 0.14;
        const sub = 4, h = dt / sub;
        for (let i = 0; i < sub; i++) {
          if (fallen > 0) break;
          delta = clamp(ks * phi + kd * dphi, -0.6, 0.6);
          const ddphi = (G / H) * phi - ((v * v) / (H * L)) * delta - 0.25 * dphi;
          dphi += ddphi * h; phi += dphi * h;
          if (Math.abs(phi) > 0.95) fallen = 0.001;
        }
        if (fallen > 0) {
          fallen += dt;
          phi += Math.sign(phi) * dt * 2.2; phi = clamp(phi, -1.4, 1.4);
          if (fallen > 1.8) { api.reset(); if (s.speed > 0) api.nudge(); }
        }
        sinceNudge += dt;
        if (sinceNudge > 3.6 && fallen === 0) api.nudge();
        holder.rotation.x = -phi;
        b.setSteer(fallen > 0 ? 0 : delta);
        scroll += v * dt * 0.34; ground.tex.offset.x = scroll / 10;
        wheel -= (v / 0.34) * dt; b.setWheels(wheel);
        crank -= (v / 0.34 / 2.6) * dt; b.setCrank(crank);
        hist.copyWithin(0, 1); hist[hist.length - 1] = phi; trace.redraw();
        state.mode = fallen > 0 ? 'fall' : Math.abs(phi) > 0.25 || Math.abs(dphi) > 0.8 ? 'wobble' : 'ok';
      },
      readout: (s) => {
        const m = state.mode;
        const title = m === 'fall' ? '<span class="no">Falling over</span>' : m === 'wobble' ? 'Wobbling…' : '<span class="ok">Balancing itself</span>';
        const why = s.locked ? 'With the handlebars locked, nothing can catch a lean.' : s.speed / 3.6 < V_CRIT ? `Below about ${Math.round(V_CRIT * 3.6)} km/h the steering correction comes too late.` : 'The front wheel steers into each lean and swings the bike upright.';
        return `<div class="big">${title}</div>${why}`;
      },
    };
  },
};
