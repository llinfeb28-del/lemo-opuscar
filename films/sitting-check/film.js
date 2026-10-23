// 久坐族自测 — a 48.5 s vertical film in the Mid-century Cartoon style (1080 × 1920, 24 fps, 120 BPM).
// One timeline drives the picture, the sound events (window.EV) and the reading-time check (window.TEXTS).
import { PAL, setClock, shape, ink, plane, text, ellipse, rrect, rect, spline, move, xform, star, sparkle, rays, arrow, dashed,
  paperFinish, clamp, lerp, seg, ss, eo, eio, back, twos, hash, TAU, starPts } from './engine/toon.js';
import { drawPerson, skeleton, SEAT, STAND } from './engine/person.js';
import { drawChair, drawDesk, drawLamp, drawClock, drawSpider, icon } from './engine/props.js';
import { P, blend, DESK_X } from './engine/poses.js';

export const W = 1080, H = 1920, BPM = 120, BEAT = 60 / BPM;
export const SECS = [
  { id: 'hook', t0: 0, t1: 3 },
  { id: 'title', t0: 3, t1: 7 },
  { id: 's1', t0: 7, t1: 10.5, i: 0 }, { id: 's2', t0: 10.5, t1: 14, i: 1 }, { id: 's3', t0: 14, t1: 17, i: 2 },
  { id: 's4', t0: 17, t1: 20, i: 3 }, { id: 's5', t0: 20, t1: 23.5, i: 4 },
  { id: 'stand', t0: 23.5, t1: 30 },
  { id: 'm1', t0: 30, t1: 34.5, i: 0 }, { id: 'm2', t0: 34.5, t1: 39, i: 1 }, { id: 'm3', t0: 39, t1: 43.5, i: 2 },
  { id: 'sum', t0: 43.5, t1: 48.5 },
];
export const DUR = 48.5;
const S = id => SECS.find(s => s.id === id);
const T_IRIS = [6.75, 7.25], T_RISE = 26.5, T_WIPE = 0.3;

const SIG = [
  { text: '一天坐够 8 小时', label: '8小时', icon: 'clock', ground: PAL.sand },
  { text: '一坐就忘了起身', label: '忘起身', icon: 'chair', ground: PAL.mustard },
  { text: '颈肩僵硬', label: '颈肩', icon: 'neck', ground: PAL.olive },
  { text: '腰背发酸', label: '腰背', icon: 'back', ground: PAL.blue },
  { text: '傍晚脚踝发胀', label: '脚踝', icon: 'ankle', ground: PAL.plum, dark: true },
];
const MOVES = [
  { title: '收下巴', how: '头向后平移', reps: '停 3 秒 × 10 次', icon: 'tuck', ground: PAL.olive },
  { title: '夹肩胛', how: '肩膀下沉后夹', reps: '停 3 秒 × 10 次', icon: 'squeeze', ground: PAL.mustard },
  { title: '踮脚尖', how: '扶桌慢慢踮起', reps: '× 15 次', icon: 'raise', ground: PAL.blue },
];
const ZQ = px => `400 ${px}px ZQ`, SERIF = px => `900 ${px}px NSerif`, ZK = px => `400 ${px}px ZK`, NS = (px, w = 700) => `${w} ${px}px NS`;

// ------------------------------------------------------------------ helpers
const hx = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, k) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
const shade = (c, k) => mix(c, PAL.ink, k), tint = (c, k) => mix(c, '#FFFFFF', k);
const pop = (t, t0, d = 0.24) => back(seg(t, t0, t0 + d), 1.9);
const B = (s, b) => s.t0 + b * BEAT;
const sectionAt = t => SECS.find(s => t >= s.t0 && t < s.t1) || SECS[SECS.length - 1];

// camera: world (floor y = 0, seated hip x = 0) -> screen
const OFFICE = { cx: 168, cy: -432, z: 1.25 };
function applyCam(ctx, c) { ctx.translate(W / 2, H / 2); ctx.scale(c.z, c.z); ctx.translate(-c.cx, -c.cy); }
const w2s = (p, c) => [W / 2 + c.z * (p[0] - c.cx), H / 2 + c.z * (p[1] - c.cy)];

// text with reading-time registration (window.TEXTS): only fully drawn, unscaled-in texts are reported
let REC = null, MUTE = 0;
function T(ctx, id, str, x, y, o = {}, full = true) {
  text(ctx, str, x, y, o);
  if (!REC || MUTE || !full || (o.alpha ?? 1) < 0.98) return;
  ctx.save(); ctx.font = o.font; if (o.track) ctx.letterSpacing = o.track + 'px'; const w = ctx.measureText(str).width; ctx.restore();
  const px = parseFloat(/(\d+)px/.exec(o.font)[1]);
  const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  const m = ctx.getTransform(), a = m.transformPoint({ x: x0, y: y - px * 0.88 }), b = m.transformPoint({ x: x0 + w, y: y + px * 0.2 });
  REC.push({ id, text: str, x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y) });
}

function room(ctx, c, ground, floorY = 0) {
  ctx.fillStyle = ground; ctx.fillRect(-6000, -6000, 12000, 12000);
  plane(ctx, rect(-3000, floorY, 6000, 2000), shade(ground, 0.16));
  ink(ctx, [[-3000, floorY], [3000, floorY]], 4 / c.z, { seed: 801, breaks: 0.3, taper: false });
}
// headline: slab-type stamp, ink on light grounds, paper on dark ones
function headline(ctx, t, t0, str, dark, y = 530, px = 98, id = 'head') {
  const k = pop(t, t0, 0.22); if (k <= 0) return;
  ctx.save(); ctx.translate(W / 2, y - px * 0.35); ctx.scale(k, k); ctx.rotate((1 - k) * -0.05); ctx.translate(-W / 2, -(y - px * 0.35));
  T(ctx, id, str, W / 2, y, { font: SERIF(px), fill: dark ? PAL.white : PAL.ink, plate: dark ? PAL.ink : PAL.white, off: [5, 5], align: 'center' }, k > 0.98);
  ctx.restore();
}
// round call-out: a frame-in-frame close-up with a dashed leader to its subject (screen space)
function callout(ctx, t, t0, cx, cy, r, bg, inner, leader) {
  const k = back(seg(t, t0, t0 + 0.3), 1.5); if (k <= 0) return;
  const R = r * k;
  if (leader) { const a = Math.atan2(leader[1] - cy, leader[0] - cx);
    dashed(ctx, [[cx + Math.cos(a) * (R + 14), cy + Math.sin(a) * (R + 14)], leader], 4, 14, 10, -t * 40, PAL.ink, clamp(k));
    shape(ctx, ellipse(leader[0], leader[1], 9, 9, 12), { fill: PAL.ink, line: 0, off: [0, 0], grain: 0 }); }
  shape(ctx, ellipse(cx, cy, R + 16, R + 16, 72), { fill: PAL.paper, line: 4.5, seed: 720, grain: 0.15, breaks: 0.05 });
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
  ctx.fillStyle = bg; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  ctx.translate(cx, cy); ctx.scale(k, k); MUTE++; inner(ctx); MUTE--; ctx.restore();
  ink(ctx, ellipse(cx, cy, R, R, 72), 4, { closed: true, seed: 721, breaks: 0.1 });
}
// detail tag: a paper card with a turning star bullet (Noto Sans in the Jost role)
function tag(ctx, t, t0, str, x, y, o = {}) {
  const k = pop(t, t0); if (k <= 0) return null;
  const px = o.px || 46, font = NS(px, o.w || 700);
  ctx.save(); ctx.font = font; const tw = ctx.measureText(str).width; ctx.restore();
  const w = tw + 104, h = px + 44, X = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
  ctx.save(); ctx.translate(X + w / 2, y + h / 2); ctx.scale(k, k); ctx.translate(-(X + w / 2), -(y + h / 2));
  shape(ctx, rrect(X, y, w, h, 16), { fill: o.fill || PAL.paper, line: 3.6, seed: 710, grain: 0.15, off: [6, 5] });
  star(ctx, X + 40, y + h / 2, 18, { n: 8, inner: 0.42, fill: o.star || PAL.tomato, off: [0, 0], rot: twos(t) * 0.8 });
  T(ctx, o.id || 'tag', str, X + 70, y + h / 2 + px * 0.36, { font, fill: PAL.ink }, k > 0.98);
  ctx.restore();
  return { x: X, y, w, h };
}

// ------------------------------------------------------------------ the check-list strip (UI)
const SLOT = i => [140 + i * 200, 250];
function stripState(t) {
  // returns { y, r, gap, alpha, x0 } ; top at 250, centre row during the verdict, flies out on the rise
  const down = eio(seg(t, 23.6, 24.1)), out = eio(seg(t, T_RISE - 0.05, T_RISE + 0.12));
  return { y: lerp(250, 712, down) + out * 160, r: lerp(58, 74, down), alpha: 1 - out, label: lerp(36, 40, down), card: 1 - down };
}
function drawStrip(ctx, t) {
  if (t < 4.0 || t > T_RISE + 0.12) return;
  const st = stripState(t);
  ctx.save(); ctx.globalAlpha *= st.alpha;
  if (st.card > 0) {           // the check-list card behind the strip
    const k = eo(seg(t, 4.0, 4.3)) * st.card;
    if (k > 0) shape(ctx, rrect(40, 172 + (1 - k) * -220, W - 80, 214, 26), { fill: PAL.paper, line: 4, seed: 840, grain: 0.15, off: [7, 6], alpha: k });
  }
  for (let i = 0; i < 5; i++) {
    const x = 140 + i * 200, y = st.y, r = st.r;
    const tEmpty = 4.0 + i * BEAT, tFill = SECS[2 + i].t0 + (i === 0 ? 0.25 : 0);
    const ke = pop(t, tEmpty, 0.24); if (ke <= 0) continue;
    const kf = pop(t, tFill, 0.26);
    const cur = sectionAt(t).i === i && sectionAt(t).id[0] === 's' && t < 23.5;
    ctx.save(); ctx.translate(x, y);
    if (kf <= 0) {                                                 // empty slot: dotted ring and a numeral
      ctx.scale(ke, ke);
      dashed(ctx, ellipse(0, 0, r, r, 60), 4, 10, 9, 0, PAL.ink);
      text(ctx, String(i + 1), 0, r * 0.36, { font: `${Math.round(r)}px Slab`, fill: PAL.paperDD, align: 'center' });
    } else {
      ctx.scale(kf, kf); ctx.rotate((1 - kf) * 0.5);
      if (cur) star(ctx, 0, 0, r * 1.32, { n: 14, inner: 0.78, fill: PAL.tomato, off: [0, 0], rot: twos(t) * 0.5 });
      shape(ctx, ellipse(0, 0, r, r, 56), { fill: SIG[i].ground, line: 4.5, seed: 850 + i, grain: 0.25 });
      icon(ctx, SIG[i].icon, 0, 0, r * 0.62);
      // the tick lands half a beat after the stamp
      const kt = pop(t, tFill + BEAT * 0.5, 0.2);
      if (kt > 0) { ctx.save(); ctx.translate(r * 0.62, -r * 0.6); ctx.scale(kt, kt);
        shape(ctx, ellipse(0, 0, r * 0.36, r * 0.36, 24), { fill: PAL.tomato, line: 3, seed: 860 + i, grain: 0 });
        ink(ctx, [[-r * 0.16, 0], [-r * 0.03, r * 0.13], [r * 0.18, -r * 0.14]], 5, { seed: 865 + i, taper: false, color: PAL.white });
        ctx.restore(); }
    }
    ctx.restore();
    if (kf > 0.98) T(ctx, 'label' + i, SIG[i].label, x, y + r + st.label + 6, { font: NS(st.label, 900), fill: PAL.ink, align: 'center' }, st.alpha > 0.98);
  }
  ctx.restore();
}

// ------------------------------------------------------------------ figure helpers
// typing hands: small hops on twos while the body holds
function typing(pose, t, on = true) {
  if (!on) return pose;
  const f = Math.floor(t * 12), a = hash(f, 3) - 0.5, b = hash(f, 7) - 0.5;
  const o = { ...pose };
  if (o.armF?.to) o.armF = { ...o.armF, to: [o.armF.to[0] + a * 14, o.armF.to[1] - Math.abs(a) * 10] };
  if (o.armB?.to) o.armB = { ...o.armB, to: [o.armB.to[0] + b * 14, o.armB.to[1] - Math.abs(b) * 10] };
  return o;
}
const blinkAt = (t, ts) => ts.some(b => t > b && t < b + 0.13) ? 1 : 0;
// pose change with one in-between: anticipation dip, fast move, settle (on twos)
function act(a, b, t, t0, d = 0.2) { const u = seg(twos(t), t0, t0 + d); return blend(a, b, u < 0.5 ? ss(u * 2) * 0.5 : 0.5 + eo((u - 0.5) * 2) * 0.5); }

function office(ctx, t, c, ground, pose, o = {}) {
  ctx.save(); applyCam(ctx, c);
  room(ctx, c, ground);
  if (o.lamp) drawLamp(ctx, 560, -440, o.lamp);
  drawChair(ctx, o.chairX || 0, 0, 1);
  if (o.desk !== false) drawDesk(ctx, DESK_X, 0, { glow: o.glow ?? 0.8, steam: o.steam, mug: true });
  const K = drawPerson(ctx, { x: 0, y: 0, s: 1, ...pose }, t);
  if (o.after) o.after(ctx);
  ctx.restore();
  return K;
}

// ------------------------------------------------------------------ scenes
function sceneHook(ctx, t) {
  const s = S('hook');
  const step = Math.min(5, Math.floor(t / BEAT));                  // the body slumps one notch per beat
  const k0 = step / 5, k1 = Math.min(1, (step + 1) / 5);
  const pose = typing(blend(P.sitSlump(k0), P.sitSlump(k1), ss(seg(twos(t) % BEAT, 0, 0.12) )), t, t < 2.75);
  const z = lerp(1.18, 1.3, ss(t / 3));
  const c = { cx: lerp(160, 150, ss(t / 3)), cy: lerp(-430, -420, ss(t / 3)), z };
  office(ctx, t, c, PAL.blue, { ...pose, face: step >= 4 ? 'tired' : 'neutral', blink: blinkAt(t, [1.2]) }, { glow: 1, steam: 1 });
  // the wall clock whizzes from 9:00 to 18:00, faster and faster
  const hrs = 9 + 9 * Math.pow(seg(t, 0.1, 2.95), 2.2);
  callout(ctx, t, 0, 790, 330, 150, tint(PAL.blue, 0.45), g => drawClock(g, 0, 0, 92, hrs, { ball: PAL.tomato }), null);
  const kk = pop(t, 2.95, 0.2);
  if (kk > 0) { ctx.save(); ctx.translate(790, 520); ctx.scale(kk, kk); shape(ctx, rrect(-92, -40, 184, 74, 18), { fill: PAL.tomato, line: 3.5, seed: 880, off: [5, 4] });
    text(ctx, '18:00', 0, 20, { font: '52px Slab', fill: PAL.white, align: 'center' }); ctx.restore(); }
}

// the question rides across the cut from the hook into the title card
function hookLine(ctx, t) {
  if (t > T_IRIS[0] + 0.01) return;
  const u = seg(t, 0.05, 0.4);
  if (u <= 0) return;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 120 + u * 860, H); ctx.clip();
  T(ctx, 'hook', '坐了一整天？', W / 2, 660, { font: ZK(118), fill: PAL.ink, plate: PAL.mustard, off: [6, 6], align: 'center' }, u >= 1);
  ctx.restore();
}

function sceneTitle(ctx, t) {
  const s = S('title');
  ctx.fillStyle = PAL.paper; ctx.fillRect(0, 0, W, H);
  rays(ctx, W / 2, 1240, 30, 1500, PAL.mustardL, { rot: twos(t) * 0.05, alpha: 0.55 });
  // the cover figure: slumped in the chair on a small stage
  const c = { cx: 120, cy: -330, z: 0.85 };
  ctx.save(); ctx.translate(0, 310); applyCam(ctx, c);
  plane(ctx, rect(-3000, 0, 6000, 2000), PAL.paperDD);
  ink(ctx, [[-3000, 0], [3000, 0]], 4, { seed: 802, breaks: 0.3, taper: false });
  drawChair(ctx, 0, 0, 1); drawDesk(ctx, DESK_X, 0, { glow: 0.8, mug: true });
  drawPerson(ctx, { x: 0, y: 0, s: 1, ...P.sitSlump(1), blink: blinkAt(t, [4.6, 6.2]) }, t);
  ctx.restore();
  const k = pop(t, s.t0, 0.24);
  if (k > 0) { ctx.save(); ctx.translate(W / 2, 860); ctx.scale(k, k); ctx.rotate((1 - k) * -0.08);
    T(ctx, 'title', '久坐族自测', 0, 0, { font: ZQ(176), fill: PAL.ink, plate: PAL.tomato, off: [8, 8], align: 'center' }, k > 0.98); ctx.restore(); }
  const k2 = pop(t, s.t0 + 0.05, 0.22);
  if (k2 > 0) { ctx.save(); ctx.translate(W / 2, 985); ctx.scale(k2, k2);
    shape(ctx, rrect(-400, -62, 800, 90, 45), { fill: PAL.ink, line: 0, seed: 881, off: [0, 0], grain: 0.1 });
    T(ctx, 'sub', '5 个信号 · 你中了几个？', 0, 0, { font: NS(54, 900), fill: PAL.white, align: 'center' }, k2 > 0.98); ctx.restore(); }
}

// one signal scene: the shared office with its own acting, call-out and ground
function sceneSignal(ctx, t, s) {
  const i = s.i, sg = SIG[i], c = { ...OFFICE };
  let pose = P.sitSlump(1), opt = {}, after = null;
  if (i === 0) {
    pose = typing(P.sitSlump(1), t);
  } else if (i === 1) {
    pose = { ...P.sitSlump(1), blink: blinkAt(t, [13.0, 13.6]), look: t > 12.6 ? [0, -3] : [0, 0] };
    const tip = [40, -712];
    opt.lamp = tip;
    after = g => { const y1 = lerp(tip[1] + 14, -628, eo(seg(t, 11.5, 12.5))) + Math.sin(t * 6) * 3 * seg(t, 12.5, 13);
      if (t > 11.4) drawSpider(g, tip[0] - 4, tip[1] + 12, y1, t, 1.1); };
  } else if (i === 2) {
    const a = P.sitSlump(1), b = P.rubNeck();
    pose = act(typing(a, t, t < 14.35), b, t, 14.4, 0.25);
    if (t > 15.4) { const r = Math.sin((t - 15.4) * TAU * 2) * 8; pose = { ...pose, armF: { ...pose.armF, to: [pose.armF.to[0] + r, pose.armF.to[1]] } }; }
    if (t > 14.55) pose.face = 'wince';
  } else if (i === 3) {
    pose = act(P.rubNeck(), P.handBack(), t, 17.4, 0.3);
    c.cy = lerp(-432, -392, eio(seg(t, 17.4, 17.9)));                 // the hand leads the frame down
    if (t > 18.6) pose = { ...pose, lean: lerp(pose.lean, -0.12, eio(seg(t, 18.6, 19.0))) };
  } else {
    pose = { ...P.sitSlump(0.7), face: 'tired', blink: blinkAt(t, [21.8]) };
    pose.armF = { to: [150, -300] }; pose.armB = { to: [140, -306] }; pose.handF = 'rest'; pose.handB = 'rest'; pose.handAngF = 0.2; pose.handAngB = 0.2;
  }
  const K = office(ctx, t, c, sg.ground, pose, { ...opt, after, glow: i === 4 ? 0.3 : 0.8 });
  const toS = p => w2s(p, c);
  // per-signal details
  if (i === 0) {
    for (let k = 0; k < 8; k++) {                                     // eight hours, one clock per half beat
      const kk = pop(t, 7.5 + k * BEAT * 0.5, 0.2); if (kk <= 0) continue;
      const x = 120 + k * 120, y = 650;
      ctx.save(); ctx.translate(x, y); ctx.scale(kk, kk);
      shape(ctx, ellipse(0, 0, 46, 46, 30), { fill: PAL.paper, line: 3.6, seed: 870 + k, grain: 0.1 });
      drawClock(ctx, 0, 0, 26, 9 + k + 1, { ball: PAL.mustard });
      ctx.restore();
    }
    const k8 = pop(t, 9.5, 0.24);
    if (k8 > 0) { ctx.save(); ctx.translate(850, 830); ctx.scale(k8, k8); ctx.rotate(-0.08);
      star(ctx, 0, 0, 96, { n: 16, inner: 0.72, fill: PAL.tomato, off: [6, 5] });
      text(ctx, '8h', 0, 26, { font: '78px Slab', fill: PAL.white, plate: PAL.ink, off: [4, 4], align: 'center' }); ctx.restore(); }
  } else if (i === 1) {
    callout(ctx, t, 10.75, 860, 820, 112, tint(PAL.mustard, 0.5), g => drawClock(g, 0, 0, 66, 10 + (t - 10.5) * 3.2, { ball: PAL.tomato }), null);
  } else if (i === 2) {
    const nape = toS(add2(K.neck, [-30, -10]));
    callout(ctx, t, 14.75, 820, 800, 150, tint(PAL.olive, 0.5), g => neckClose(g, t), nape);
    zigzags(ctx, t, toS(add2(K.S, [-40, 6])), 15.0, [-1, -0.3]);
  } else if (i === 3) {
    zigzags(ctx, t, toS(add2(K.hip, [-60, -80])), 17.9, [-1, 0]);
    zigzags(ctx, t, toS(add2(K.hip, [-62, -150])), 18.4, [-1, -0.2]);
  } else {
    const ank = toS(K.ankle);
    callout(ctx, t, 20.5, 800, 900, 172, tint(PAL.plum, 0.55), g => ankleClose(g, t), [ank[0] + 30, ank[1] - 20]);
  }
  headline(ctx, t, s.t0, sg.text, sg.dark);
}
const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
// ache marks: zigzags that spring out on the beat
function zigzags(ctx, t, p, t0, dir) {
  for (let k = 0; k < 3; k++) {
    const kk = pop(t, t0 + k * 0.08, 0.2); if (kk <= 0) continue;
    const a = Math.atan2(dir[1], dir[0]) + (k - 1) * 0.55, d0 = 30, d1 = 30 + 54 * kk;
    const pts = []; for (let j = 0; j <= 4; j++) { const d = lerp(d0, d1, j / 4), sd = (j % 2 ? 1 : -1) * 8; pts.push([p[0] + Math.cos(a) * d - Math.sin(a) * sd, p[1] + Math.sin(a) * d + Math.cos(a) * sd]); }
    ink(ctx, pts, 6, { seed: 890 + k, taper: false, color: PAL.tomatoD });
  }
}
// close-ups drawn at native line weight inside the call-outs
function neckClose(g, t) {
  // the back of the head, the nape and a shoulder seen from behind; a hand presses the nape, ache marks pulse on the beat
  shape(g, spline([[-170, 170], [-150, 60], [-60, 10], [60, 10], [150, 60], [170, 170]], true, 6), { fill: PAL.tomato, line: 4, seed: 900, grain: 0.3,
    shade: [{ pts: [[-170, 120], [170, 120], [170, 180], [-170, 180]], color: PAL.tomatoD, alpha: 0.4 }] });
  shape(g, spline([[-50, 30], [-56, -70], [48, -74], [52, 30]], true, 6), { fill: PAL.skin, line: 4, seed: 901, grain: 0.1 });
  shape(g, ellipse(0, -150, 98, 84, 40), { fill: PAL.skin, line: 4, seed: 902, grain: 0.1 });
  shape(g, spline([[-98, -140], [-80, -210], [0, -236], [80, -210], [98, -140], [70, -96], [0, -88], [-70, -96]], true, 6), { fill: PAL.hair, line: 0, seed: 903, grain: 0.3 });
  shape(g, ellipse(-100, -128, 14, 22, 16), { fill: PAL.skin, line: 3.4, seed: 904, grain: 0 });
  shape(g, ellipse(100, -128, 14, 22, 16), { fill: PAL.skin, line: 3.4, seed: 905, grain: 0 });
  const b = Math.floor((t - 14) / BEAT) % 2;
  for (const [x, y, a] of [[-70, -40, Math.PI + 0.3], [72, -36, -0.3], [-120, 40, Math.PI + 0.9], [120, 44, -0.9]]) {
    const L = b ? 54 : 40, pts = []; for (let j = 0; j <= 4; j++) { const d = L * j / 4, sd = (j % 2 ? 1 : -1) * 9; pts.push([x + Math.cos(a) * d - Math.sin(a) * sd, y + Math.sin(a) * d + Math.cos(a) * sd]); }
    ink(g, pts, 6, { seed: 906 + Math.round(x), taper: false, color: PAL.tomatoD });
  }
  const r = Math.sin((t - 14.9) * TAU * 2) * 6;
  ink(g, spline([[150, 190], [100, 60], [40, -20]], false, 6), 40, { seed: 907, taper: false });
  ink(g, move(spline([[150, 190], [100, 60], [40, -20]], false, 6), 2, 2), 30, { seed: 908, taper: false, color: PAL.skin });
  g.save(); g.translate(30 + r, -34); g.rotate(-2.3); drawHandBig(g); g.restore();
}
function drawHandBig(g) {
  const parts = [ellipse(0, 0, 26, 24, 18), ...[-18, 0, 18].map(dy => ellipse(44, dy, 24, 9, 18)), ellipse(10, -30, 18, 9, 18, 0, TAU, -0.9)];
  g.save(); g.strokeStyle = PAL.ink; g.lineWidth = 6; g.lineJoin = 'round';
  for (const p of parts) { g.beginPath(); p.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.stroke(); }
  g.fillStyle = PAL.skin; for (const p of parts) { g.beginPath(); p.forEach(([x, y], i) => i ? g.lineTo(x + 2, y + 2) : g.moveTo(x + 2, y + 2)); g.closePath(); g.fill(); }
  g.restore();
}
function ankleClose(g, t) {
  // side view: trouser hem, ankle, a sock whose band bites in, a loafer; the ankle puffs out one notch per beat
  const n = Math.min(4, Math.max(0, Math.floor((t - 21.0) / BEAT) + 1));
  const sw = (n - 1 + eo(seg((t - 21.0) % BEAT, 0, 0.15))) * 8 * (n > 0 ? 1 : 0) + (n === 4 ? 0 : 0);
  shape(g, spline([[-150, 120], [-120, 70], [40, 70], [120, 90], [170, 110], [176, 150], [-150, 150]], true, 4), { fill: PAL.brown, line: 4, seed: 914, grain: 0.2 });
  shape(g, rect(-110 - sw * 0.5, 30, 140 + sw, 52), { fill: PAL.white, line: 3.5, seed: 912, grain: 0.1 });
  const ank = spline([[-96, -110], [6, -110], [16 + sw * 0.6, -30], [26 + sw, 28], [-112 - sw, 28], [-100 - sw * 0.6, -30]], true, 6);
  shape(g, ank, { fill: PAL.skin, line: 4, seed: 911, grain: 0.1 });
  ink(g, spline([[-60, -10], [-40, -24], [-20, -10]], false, 4), 3.4, { seed: 916 });          // the ankle bone
  ink(g, [[-112 - sw, 36], [26 + sw, 36]], 6, { seed: 913, color: PAL.tomatoD, taper: false });  // the band biting in
  shape(g, [[-120, -230], [30, -230], [26, -100], [-116, -100]], { fill: PAL.slate, line: 4, seed: 910, grain: 0.3 });
  ink(g, [[-116, -112], [26, -112]], 3, { seed: 917, color: PAL.slateD, taper: false });
  if (n > 0) for (const sd of [-1, 1]) for (let j = 0; j < 2; j++) {
    const x = sd > 0 ? 50 + sw : -136 - sw, y = -30 + j * 40;
    ink(g, [[x, y], [x + sd * 28, y - 10]], 5, { seed: 918 + j + (sd > 0 ? 2 : 0), taper: false });
  }
}

// verdict + the rise: one continuous scene so its text survives the ground wipe
function sceneStand(ctx, t) {
  const s = S('stand');
  const rise = seg(t, T_RISE, T_RISE + 0.6);
  // ground wipe: the floor band rises with the hips (bottom -> top)
  const wipeY = H * (1 - eio(seg(t, T_RISE + 0.1, T_RISE + 0.5)));
  const zoom = lerp(1.1, 0.98, eio(seg(t, T_RISE + 0.1, T_RISE + 0.9)));
  const c = { cx: lerp(150, 230, eio(seg(t, T_RISE, T_RISE + 0.9))), cy: lerp(-560, -540, eio(seg(t, T_RISE, T_RISE + 0.9))), z: zoom };
  let pose;
  if (t < T_RISE) {
    pose = { ...P.sitSlump(0.8), face: t > 24.3 ? 'wow' : 'tired', look: t > 24.2 ? [2, -5] : [0, 0], blink: blinkAt(t, [25.2]) };
    pose.armF = { to: [150, -300] }; pose.armB = { to: [140, -306] }; pose.handF = 'rest'; pose.handB = 'rest'; pose.handAngF = 0.2; pose.handAngB = 0.2;
  } else {
    // anticipation: lean in, hands to the knees; rise; settle; then the cheer (one in-between)
    const seat = { ...P.sitSlump(0.2), armF: { to: [150, -300] }, armB: { to: [140, -306] }, handF: 'flat', handB: 'flat', face: 'focus' };
    const lean = { ...seat, lean: 0.55, slump: 0, headFwd: 10, face: 'focus' };
    const up = { ...P.stand(), face: 'happy' };
    const u = twos(t);
    if (u < T_RISE + 0.2) pose = blend(seat, lean, ss(seg(u, T_RISE, T_RISE + 0.2)));
    else if (u < T_RISE + 0.55) {
      const k = eo(seg(u, T_RISE + 0.2, T_RISE + 0.55));
      pose = blend(lean, up, k);
      pose.hip = [lerp(lean.hip[0] + 40, up.hip[0], k), lerp(SEAT.hip[1], up.hip[1] - 10 * Math.sin(Math.PI * k), k)];
    } else pose = act(up, P.cheer(), t, T_RISE + 0.75, 0.2);
  }
  const chairX = -80 * eo(seg(t, T_RISE + 0.35, T_RISE + 0.7));
  ctx.save(); applyCam(ctx, c);
  room(ctx, c, PAL.paper);
  ctx.restore();
  if (wipeY < H) {                                                      // the new ground arrives from below
    ctx.save(); ctx.beginPath(); ctx.rect(0, wipeY, W, H); ctx.clip();
    ctx.save(); applyCam(ctx, c); room(ctx, c, PAL.teal); ctx.restore();
    if (t > T_RISE + 0.5) rays(ctx, 380, 760, 30, 1400, PAL.tealL, { rot: twos(t) * 0.12, alpha: 0.5 * ss(seg(t, T_RISE + 0.5, T_RISE + 0.9)) });
    ctx.restore();
    ink(ctx, [[-10, wipeY], [W + 10, wipeY]], 6, { seed: 963, taper: false });
  }
  ctx.save(); applyCam(ctx, c);
  drawChair(ctx, chairX, 0, 1); drawDesk(ctx, DESK_X, 0, { glow: 0.5, mug: true });
  const K = drawPerson(ctx, { x: 0, y: 0, s: 1, ...pose }, t);
  ctx.restore();
  if (t > T_RISE + 0.7) for (let k = 0; k < 4; k++) {                 // sparkles on the cheer
    const kk = pop(t, T_RISE + 0.75 + k * 0.08, 0.25), p = w2s(add2(K.head, [[-150, 130, 160, -120][k], [-130, -170, 40, 60][k]]), c);
    if (kk > 0) sparkle(ctx, p[0], p[1], 34 * kk, { fill: PAL.white, rot: twos(t) * 0.6 });
  }
  headline(ctx, t, 24.0, '只要中了 1 个', false, 520, 100, 'verdict');
  headline(ctx, t, T_RISE + 0.05, '就该起来动一动！', false, 640, 96, 'rise');
}

// a step: header, figure, the move on the beat, detail tags
function stepHeader(ctx, t, s, m) {
  const k = eo(seg(twos(t), s.t0 + T_WIPE, s.t0 + T_WIPE + 0.3)); if (k <= 0) return;
  ctx.save(); ctx.translate(-(1 - k) * 700, 0);
  shape(ctx, ellipse(116, 262, 62, 62, 40), { fill: PAL.ink, line: 0, seed: 700, grain: 0.1, off: [0, 0] });
  text(ctx, String(s.i + 1), 116, 290, { font: '78px Slab', fill: PAL.paper, align: 'center' });
  T(ctx, 'stepn' + s.i, `STEP ${s.i + 1} OF 3`, 204, 222, { font: '600 28px Jost', fill: PAL.ink, track: 7 }, k > 0.98);
  T(ctx, 'stept' + s.i, m.title, 200, 318, { font: SERIF(92), fill: PAL.ink, plate: PAL.white, off: [5, 5] }, k > 0.98);
  ctx.restore();
}
function sceneMove(ctx, t, s) {
  const m = MOVES[s.i], b = x => B(s, x);
  let c, pose, after = null;
  const twoReps = (on1, off1, on2) => { const u = twos(t);
    const k1 = eo(seg(u, on1 - 0.1, on1 + 0.15)) - eo(seg(u, off1, off1 + 0.2)); const k2 = eo(seg(u, on2 - 0.1, on2 + 0.15)); return clamp(Math.max(k1, k2)); };
  if (s.i === 0) {
    const k = twoReps(b(2), b(5), b(6));
    pose = { ...P.tuck(k), blink: blinkAt(t, [b(1.3)]) };
    const K = skeleton(pose);
    c = { cx: 300, cy: -640, z: 1.55 };
    ctx.save(); applyCam(ctx, c); room(ctx, c, m.ground);
    // a ghost of the forward head, where it started
    if (k > 0.3) { ctx.save(); ctx.globalAlpha = 0.28 * k; drawPerson(ctx, { x: 0, y: 0, s: 1, ...P.tuck(0), hideF: true, hideB: true, shadow: false }, t); ctx.restore(); }
    drawPerson(ctx, { x: 0, y: 0, s: 1, ...pose }, t); ctx.restore();
    const chin = w2s(add2(K.head, [140, 70]), c);
    if (t > b(1.5)) arrow(ctx, [chin[0] + 150, chin[1]], [chin[0] + 10, chin[1]], { u: eo(seg(t, b(1.5), b(2))), bob: (t / BEAT) % 1, bend: 0, w: 8, head: 40, fill: PAL.tomato, seed: 930 });
  } else if (s.i === 1) {
    const k = twoReps(b(2), b(5), b(6));
    pose = { ...P.squeeze(k), blink: blinkAt(t, [b(1.3)]) };
    const K = skeleton(pose);
    c = { cx: 250, cy: -560, z: 1.32 };
    ctx.save(); applyCam(ctx, c); room(ctx, c, m.ground); drawPerson(ctx, { x: 0, y: 0, s: 1, ...pose }, t); ctx.restore();
    const sh = w2s(K.sh, c), elb = w2s(K.F.el, c);
    if (t > b(1.5)) {            // white arrows outside the silhouette: shoulders go back and down, elbows back
      arrow(ctx, [sh[0] + 30, sh[1] - 150], [sh[0] - 130, sh[1] - 40], { u: eo(seg(t, b(1.5), b(2))), bob: (t / BEAT) % 1, bend: 0.35, w: 7, head: 36, fill: PAL.white, seed: 931 });
      arrow(ctx, [elb[0] + 40, elb[1] + 95], [elb[0] - 130, elb[1] + 95], { u: eo(seg(t, b(1.7), b(2.2))), bob: (t / BEAT) % 1, bend: 0, w: 7, head: 36, fill: PAL.white, seed: 932 });
    }
  } else {
    const u = twos(t); let k = 0;
    for (const on of [b(1), b(3.5), b(6)]) k = Math.max(k, eio(seg(u, on, on + 0.5)) - eio(seg(u, on + 1.0, on + 1.5)));
    pose = { ...P.rise(k), blink: blinkAt(t, [b(2.8)]) };
    c = { cx: 330, cy: -470, z: 1.02 };
    ctx.save(); applyCam(ctx, c); room(ctx, c, m.ground); drawDesk(ctx, 262, 0, { laptop: false, mug: true });
    const K = drawPerson(ctx, { x: 0, y: 0, s: 1, ...pose }, t); ctx.restore();
    const calf = w2s([K.knee[0] - 6, lerp(K.knee[1], K.ankle[1], 0.45)], c);
    callout(ctx, t, b(2), 790, 1010, 150, tint(PAL.blue, 0.5), g => calfClose(g, t, k), calf);
    const kl = pop(t, b(2.5), 0.24);
    if (kl > 0) { ctx.save(); ctx.translate(790, 1236); ctx.scale(kl, kl); T(ctx, 'pump', '小腿肌肉泵', 0, 0, { font: NS(40, 900), fill: PAL.ink, align: 'center' }, kl > 0.98); ctx.restore(); }
  }
  stepHeader(ctx, t, s, m);
  tag(ctx, t, s.t0 + 0.75, m.how, s.i === 2 ? 70 : 520, s.i === 2 ? 420 : 1010, { id: 'how' + s.i });
  tag(ctx, t, s.t0 + 1.25, m.reps, s.i === 2 ? 70 : 520, s.i === 2 ? 536 : 1126, { id: 'reps' + s.i, star: PAL.mustard });
}
function calfClose(g, t, k) {
  // the calf as a pump: arrows climb the shin while the heel is up
  shape(g, spline([[-60, -200], [40, -200], [56, -60], [30, 60], [10, 200], [-50, 200], [-56, 40], [-80, -80]], true, 6), { fill: PAL.slate, line: 4, seed: 920, grain: 0.3 });
  shape(g, spline([[-46, -110], [20, -120], [30, -30], [0, 60], [-40, 50], [-56, -40]], true, 6), { fill: PAL.tomatoL, line: 3.5, seed: 921, grain: 0.1, alpha: 0.35 + 0.65 * k });
  for (let j = 0; j < 3; j++) {
    const ph = ((t * 2 + j / 3) % 1), y0 = 150 - ph * 300;
    if (k > 0.2) arrow(g, [-12, y0 + 40], [-12, y0 - 30], { u: 1, w: 6, head: 26, bend: 0, fill: PAL.mustard, seed: 922 + j });
  }
}

function sceneSum(ctx, t) {
  const s = S('sum');
  ctx.fillStyle = PAL.paper; ctx.fillRect(0, 0, W, H);
  rays(ctx, 260, 1300, 30, 1300, PAL.tealL, { rot: 0.2, alpha: 0.35 });
  headline(ctx, t, s.t0 + T_WIPE, '坐久了，就起来做一遍', false, 330, 86, 'sum');
  for (let i = 0; i < 3; i++) {
    const x = 210 + i * 330, y = 590, k = pop(t, s.t0 + 0.45 + i * 0.12, 0.24); if (k <= 0) continue;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    star(ctx, 0, 0, 132, { n: 16, inner: 0.84, fill: PAL.white, off: [0, 0], rot: i * 0.2 });
    shape(ctx, ellipse(0, 0, 108, 108, 60), { fill: MOVES[i].ground, line: 5, seed: 980 + i, grain: 0.3 });
    icon(ctx, MOVES[i].icon, 0, 0, 66);
    const kt = pop(t, 44.5 + i * BEAT, 0.2);                       // the list ticks itself, one per beat
    if (kt > 0) { ctx.save(); ctx.translate(74, -74); ctx.scale(kt, kt);
      shape(ctx, ellipse(0, 0, 36, 36, 24), { fill: PAL.tomato, line: 3.5, seed: 985 + i, grain: 0 });
      ink(ctx, [[-16, 0], [-3, 13], [18, -14]], 7, { seed: 988 + i, taper: false, color: PAL.white }); ctx.restore(); }
    ctx.restore();
    if (k > 0.98) T(ctx, 'ml' + i, MOVES[i].title, x, y + 172, { font: NS(48, 900), fill: PAL.ink, align: 'center' });
  }
  // the presenter, standing easy
  const c = { cx: 250, cy: -560, z: 0.78 };
  ctx.save(); ctx.translate(-260, 0); applyCam(ctx, c);
  drawPerson(ctx, { x: 0, y: 0, s: 1, ...P.stand(), face: 'happy', blink: blinkAt(t, [46.3, 47.9]) }, t);
  ctx.restore();
  // call to comment, pointing at the comment button
  const kc = pop(t, s.t0 + 0.75, 0.26);
  if (kc > 0) { ctx.save(); ctx.translate(690, 1040); ctx.scale(kc, kc); ctx.rotate((1 - kc) * 0.1);
    shape(ctx, rrect(-250, -120, 500, 240, 34), { fill: PAL.tomato, line: 4.5, seed: 990, grain: 0.2, off: [8, 7] });
    T(ctx, 'cta1', '你中了几个？', 0, -22, { font: NS(70, 900), fill: PAL.white, align: 'center' }, kc > 0.98);
    T(ctx, 'cta2', '评论区打数字', 0, 74, { font: NS(56, 900), fill: PAL.paper, align: 'center' }, kc > 0.98);
    ctx.restore(); }
  const kh = pop(t, s.t0 + 1.0, 0.24);
  if (kh > 0) { const bob = Math.abs(Math.sin(twos(t) * Math.PI / BEAT)) * 14;
    ctx.save(); ctx.translate(880 + bob, 1250); ctx.scale(kh * 2.6, kh * 2.6); drawPointer(ctx); ctx.restore(); }
  const kd = pop(t, s.t0 + 0.75, 0.24);
  if (kd > 0) { ctx.save(); ctx.globalAlpha *= clamp(kd); T(ctx, 'disc', '科普内容，不替代医嘱', 690, 1452, { font: NS(36, 500), fill: PAL.inkSoft, align: 'center' }, kd > 0.98); ctx.restore(); }
}
function drawPointer(ctx) {   // a glove pointing down-right
  ctx.save(); ctx.rotate(0.55);
  const parts = [ellipse(0, 0, 15, 13.5, 18), ellipse(26, -5, 19, 4.8, 18), ellipse(13, 5, 7, 6, 18), ellipse(8, 11, 6, 5.5, 18), ellipse(-4, -14, 8.5, 5, 18, 0, TAU, -1.0)];
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 5; ctx.lineJoin = 'round';
  for (const p of parts) { ctx.beginPath(); p.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.stroke(); }
  ctx.fillStyle = PAL.white; for (const p of parts) { ctx.beginPath(); p.forEach(([x, y], i) => i ? ctx.lineTo(x + 1.5, y + 1.5) : ctx.moveTo(x + 1.5, y + 1.5)); ctx.closePath(); ctx.fill(); }
  ink(ctx, [[-14, -6], [-14, 8]], 3, { seed: 995, taper: false });
  ctx.restore();
}

function drawSection(ctx, t, s) {
  ctx.save();
  if (s.id === 'hook') sceneHook(ctx, t);
  else if (s.id === 'title') sceneTitle(ctx, t);
  else if (s.id[0] === 's' && s.id !== 'stand' && s.id !== 'sum') sceneSignal(ctx, t, s);
  else if (s.id === 'stand') sceneStand(ctx, t);
  else if (s.id[0] === 'm') sceneMove(ctx, t, s);
  else sceneSum(ctx, t);
  ctx.restore();
}

// footer during the moves: drawn above the page turns
function footer(ctx, t) {
  const k = eo(seg(t, 30.3, 30.6)) * (1 - eo(seg(t, 43.5, 43.8))); if (k <= 0) return;
  ctx.save(); ctx.globalAlpha *= k;
  shape(ctx, rrect(W / 2 - 230, 1418, 460, 72, 36), { fill: PAL.paper, line: 3, seed: 999, off: [5, 4], grain: 0.1 });
  T(ctx, 'foot', '动作以不痛为度', W / 2, 1468, { font: NS(38, 700), fill: PAL.ink, align: 'center' }, k > 0.98);
  ctx.restore();
}

export function renderFilm(ctx, t, Q) {
  setClock(t);
  const s = sectionAt(t), idx = SECS.indexOf(s), pv = SECS[idx - 1];
  ctx.save();
  if (t >= T_IRIS[0] && t < T_IRIS[1]) {
    // iris through check-list slot 1: the empty ring opens into the first signal
    const k = eio(seg(t, T_IRIS[0], T_IRIS[1])), [sx, sy] = SLOT(0);
    MUTE++; drawSection(ctx, Math.min(t, 6.999), S('title'));
    const cx = lerp(sx, W / 2, k), cy = lerp(sy, H / 2, k), r = lerp(58, 2300, k * k);
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip(); drawSection(ctx, Math.max(t, 7.0), S('s1')); ctx.restore(); MUTE--;
    ink(ctx, ellipse(cx, cy, r, r, 90), 7, { closed: true, seed: 960 });
  } else if (pv && ['stand', 'm1', 'm2', 'm3', 'sum'].includes(s.id) && t < s.t0 + T_WIPE) {
    // page turns: side wipes between scenes, bottom-up into the summary
    const k = eio(seg(t, s.t0, s.t0 + T_WIPE)), up = s.id === 'sum';
    MUTE++; drawSection(ctx, pv.t1 - 1e-3, pv);
    ctx.save(); ctx.beginPath();
    if (up) ctx.rect(0, H * (1 - k), W, H); else ctx.rect(W * (1 - k), 0, W, H);
    ctx.clip(); drawSection(ctx, t, s); ctx.restore(); MUTE--;
    if (up) ink(ctx, [[-10, H * (1 - k)], [W + 10, H * (1 - k)]], 7, { seed: 962, taper: false });
    else ink(ctx, [[W * (1 - k), -10], [W * (1 - k), H + 10]], 7, { seed: 961, taper: false });
  } else drawSection(ctx, t, s);
  ctx.restore();
  drawStrip(ctx, t);
  hookLine(ctx, t);
  footer(ctx, t);
  paperFinish(ctx, W, H, 0.9);
}

// ------------------------------------------------------------------ reading-time report
let OFF = null;
export function texts(t) {
  if (!OFF) OFF = new OffscreenCanvas(W, H).getContext('2d');
  REC = []; OFF.setTransform(1, 0, 0, 1, 0, 0); renderFilm(OFF, t, null); const r = REC; REC = null; return r;
}

// ------------------------------------------------------------------ sound events (the same times drive the pictures)
export function events() {
  const E = [], ev = (t, type, o = {}) => E.push({ t: +t.toFixed(4), type, ...o });
  // hook: typing, a clock that runs away, the 18:00 ding
  for (let x = 0.05; x < 2.7; x += 1 / 12) if (hash(Math.floor(x * 12), 3) > 0.35) ev(x, 'key', { n: Math.floor(x * 12) });
  let tk = 0.1, gap = 0.5; while (tk < 2.95) { ev(tk, 'tick', { gain: 0.5 + 0.5 * tk / 3 }); tk += gap; gap = Math.max(0.055, gap * 0.8); }
  ev(0.05, 'pen', { dur: 0.35 }); ev(2.95, 'pop', { gain: 0.7 });
  ev(2.95, 'ding', { gain: 1 }); ev(3.0, 'stamp', { gain: 1.1 }); ev(3.05, 'pop', {});
  for (let i = 0; i < 5; i++) ev(4.0 + i * BEAT, 'stamp', { gain: 0.55, pitch: i });
  ev(T_IRIS[0], 'iris', { dur: 0.5 });
  SECS.filter(s => s.id[0] === 's' && s.i !== undefined).forEach(s => {
    ev(s.t0 + (s.i === 0 ? 0.25 : 0), 'stamp', { gain: 0.9 }); ev(s.t0 + (s.i === 0 ? 0.25 : 0) + BEAT * 0.5, 'tickmark', {});
    if (s.i > 0) ev(s.t0, 'cut', {});
  });
  for (let k = 0; k < 8; k++) ev(7.5 + k * BEAT * 0.5, 'clockpip', { n: k });
  ev(9.5, 'stamp8', {});
  ev(10.75, 'pop', { gain: 0.6 }); ev(11.5, 'spider', { dur: 1.0 }); ev(12.5, 'boing', {});
  ev(14.4, 'cloth', { dur: 0.3 }); ev(14.75, 'pop', { gain: 0.6 }); ev(15.0, 'twang', {}); ev(15.4, 'cloth', { dur: 0.9, gain: 0.6 });
  ev(17.4, 'cloth', { dur: 0.4 }); ev(17.9, 'twang', {}); ev(18.4, 'twang', { pitch: -2 }); ev(18.6, 'creak', {});
  ev(20.5, 'pop', { gain: 0.6 }); for (let k = 0; k < 4; k++) ev(21.0 + k * BEAT, 'puff', { n: k });
  ev(23.5, 'swish', {}); ev(23.6, 'whoosh', { dur: 0.5 }); ev(24.0, 'stamp', { gain: 0.8 }); ev(24.3, 'pop', { gain: 0.5 });
  ev(26.0, 'silence', { until: T_RISE });
  ev(T_RISE - 2 / 24, 'scrape', { dur: 0.5 }); ev(T_RISE + 0.05, 'stamp', { gain: 0.9 }); ev(T_RISE + 0.1, 'swish', { dur: 0.45, gain: 1.2 });
  ev(T_RISE + 0.55, 'thump', {}); ev(T_RISE + 0.75, 'chime', {});
  for (const s of SECS.filter(s => s.id[0] === 'm')) {
    const b = x => B(s, x);
    ev(s.t0, 'swish', {}); ev(s.t0 + T_WIPE, 'slide', {}); ev(s.t0 + 0.75, 'pop', { gain: 0.7 }); ev(s.t0 + 1.25, 'pop', { gain: 0.7 });
    if (s.i === 0) { ev(b(1.5), 'whistle', { up: 0 }); ev(b(2), 'tap', {}); ev(b(5), 'whistle', { up: 1, gain: 0.5 }); ev(b(6), 'tap', {}); }
    if (s.i === 1) { ev(b(1.5), 'whistle', { up: 0 }); ev(b(2), 'stretch', {}); ev(b(5), 'cloth', { dur: 0.3, gain: 0.5 }); ev(b(6), 'stretch', {}); }
    if (s.i === 2) { ev(b(2), 'pop', { gain: 0.6 }); for (const on of [b(1), b(3.5), b(6)]) { ev(on, 'whistle', { up: 1, gain: 0.6 }); ev(on + 1.0, 'tap', { gain: 0.6 }); ev(on + 0.25, 'blub', {}); } ev(b(2.5), 'pop', { gain: 0.5 }); }
  }
  ev(43.5, 'swish', {}); ev(43.8, 'stamp', { gain: 0.8 });
  for (let i = 0; i < 3; i++) { ev(43.95 + i * 0.12, 'pop', { gain: 0.5 }); ev(44.5 + i * BEAT, 'tickmark', { pitch: i }); }
  ev(44.25, 'stamp', { gain: 0.7 }); ev(44.5, 'pop', { gain: 0.5 });
  ev(48.0, 'ding', { gain: 0.8 });
  return E.sort((a, b) => a.t - b.t);
}
