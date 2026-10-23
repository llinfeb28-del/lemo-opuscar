// The presenter: an office worker in profile (facing +x), horn-rim glasses, tomato polo, slate trousers.
// Limited animation: the body is a held drawing per pose; the scene blends poses with one in-between
// (or eases a single parameter), hands and face carry the acting.
// Local units: floor at y = 0, +x = the way the figure faces. Seated head top ≈ -630, standing ≈ -815.
import { PAL, shape, ink, ellipse, spline, xform, move, rrect, TAU, clamp, lerp, reg, path } from './toon.js';

export const THIGH = 165, SHIN = 212, ANKLE_Y = -34, FOOT = 64, TORSO = 215, UA = 126, FA = 118, HS = 1.2;
export const SEAT = { hip: [0, -244], ankle: [160, ANKLE_Y] };
export const STAND = { hip: [156, ANKLE_Y - 372], ankle: [162, ANKLE_Y] };

const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = v => Math.hypot(v[0], v[1]);
// two-bone IK: joint between A and B; bend = +1 / -1 picks the side
export function ik2(A, B, L1, L2, bend = 1) {
  const D = sub(B, A); let d = len(D); const dmax = L1 + L2 - 0.5;
  const u = [D[0] / (d || 1), D[1] / (d || 1)]; if (d > dmax) { d = dmax; B = add(A, u, d); }
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const P = add(A, u, a), n = [-u[1], u[0]];
  return { J: add(P, n, h * bend), B };
}

// UPA four-finger glove (three fingers + thumb), lifted from the style engine.
// kind: 'open' | 'flat' | 'point' | 'grip' | 'rest' (fingers curled loosely on a surface)
export function drawHand(ctx, x, y, a, kind = 'open', side = 1, k = 1, skin = PAL.skin) {
  const parts = [], seps = [];
  const E = (cx, cy, rx, ry, rot = 0) => parts.push(ellipse(cx, cy, rx, ry, 18, 0, TAU, rot));
  E(12, 0, 15, 13.5);
  if (kind === 'open') {
    [-0.62, 0, 0.62].forEach(r => E(12 + Math.cos(r) * 25, Math.sin(r) * 25, 12, 5, r));
    E(4, -15 * side, 10, 5, -1.35 * side);
  } else if (kind === 'flat' || kind === 'rest') {
    [-10, 0, 10].forEach((dy, i) => E(34 + (i === 1 ? 3 : 0), dy, 13, 4.8));
    E(10, -15 * side, 9, 5, -0.9 * side);
    seps.push([[24, -5], [40, -5]], [[24, 5], [40, 5]]);
  } else if (kind === 'point') {
    E(38, -5 * side, 19, 4.8); E(25, 5 * side, 7, 6); E(20, 11 * side, 6, 5.5); E(8, -14 * side, 8.5, 5, -1.0 * side);
  } else { E(26, -8, 6.5, 6.5); E(28, 1, 6.5, 6.5); E(25, 10, 6, 6); E(12, -14 * side, 9, 5.5, -0.4 * side); seps.push([[22, -3.5], [30, -3.5]], [[22, 5.5], [29, 5.5]]); }
  const P = parts.map(p => xform(p, x, y, a, k));
  ctx.save(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 6 * k; ctx.lineJoin = 'round';
  for (const p of P) { path(ctx, p); ctx.stroke(); }
  const o = reg(77, 0.6); ctx.fillStyle = skin;
  for (const p of P) { path(ctx, move(p, o[0] * 0.5, o[1] * 0.5)); ctx.fill(); }
  ctx.lineWidth = 2.4 * k; ctx.lineCap = 'round';
  for (const s2 of seps) { const q = xform(s2, x, y, a, k); ctx.beginPath(); ctx.moveTo(...q[0]); ctx.lineTo(...q[1]); ctx.stroke(); }
  ctx.restore();
}

// a limb as a thick ink ribbon with a colour ribbon printed off-register on top
function limb(ctx, P, w, col, seed) {
  ink(ctx, P, w, { seed, taper: false, wob: 0.06 });
  const o = reg(seed, 1);
  ink(ctx, move(P, o[0] * 0.6, o[1] * 0.6), w - 9, { seed: seed + 1, taper: false, wob: 0.04, color: col });
}

// ---------------------------------------------------------------- skeleton
// pose: { x, y, s, hip:[x,y], ankle:[x,y], heel 0..1, lean (rad, + forward), slump 0..1, shBack 0..1,
//         headFwd (px), headRot (rad, + chin down), armF/armB: { to:[x,y], bend } | { a1, a2 },
//         handF/handB kind, handAngF/handAngB, face, blink, look:[dx,dy], doubleChin 0..1, mouth }
export function skeleton(pose) {
  const hip = pose.hip || SEAT.hip, heel = pose.heel || 0;
  const ankle = add(pose.ankle || SEAT.ankle, [0, -heel * 40]);
  const lean = pose.lean || 0, slump = pose.slump || 0, shBack = pose.shBack || 0;
  const dir = [Math.sin(lean), -Math.cos(lean)], fw = [Math.cos(lean), Math.sin(lean)];
  // shoulders round forward and drop when slumped
  const S = add(add(hip, dir, TORSO - slump * 18), fw, slump * 34 - shBack * 10);
  const C = add(add(hip, dir, TORSO * 0.55), fw, -slump * 40 - 4);     // spine control: hump backward
  const spine = []; for (let i = 0; i <= 12; i++) { const k = i / 12, a = (1 - k) * (1 - k), b = 2 * k * (1 - k), c = k * k;
    spine.push([a * hip[0] + b * C[0] + c * S[0], a * hip[1] + b * C[1] + c * S[1]]); }
  const sh = add(add(S, fw, -6 - shBack * 16), dir, -16);
  const neck = add(add(S, dir, 8), fw, 10 + slump * 8);
  const hr = pose.headRot ?? slump * 0.28;
  const head = add(add(neck, dir, 78), fw, 14 + (pose.headFwd || 0) + slump * 30);
  const knee = ik2(hip, ankle, THIGH, SHIN, -1).J;
  const hipB = add(hip, [-12, -6]), ankleB = add(ankle, [-16, 0]);
  const kneeB = ik2(hipB, ankleB, THIGH, SHIN, -1).J;
  const arm = (which) => {
    const a = pose[which === 'F' ? 'armF' : 'armB'] || { a1: 1.45, a2: 1.62 };
    const s0 = which === 'F' ? sh : add(sh, [-10, -4]);
    let el, ha;
    if (a.to) { const r = ik2(s0, a.to, UA, FA, a.bend ?? 1); el = r.J; ha = r.B; }
    else { el = add(s0, [Math.cos(a.a1), Math.sin(a.a1)], UA); ha = add(el, [Math.cos(a.a2), Math.sin(a.a2)], FA); }
    return { sh: s0, el, ha, a2: Math.atan2(ha[1] - el[1], ha[0] - el[0]) };
  };
  return { hip, ankle, knee, hipB, ankleB, kneeB, S, spine, dir, fw, sh, neck, head, hr, lean, slump, shBack, heel, F: arm('F'), B: arm('B') };
}
export function toScreen(pose, p) { const s = pose.s ?? 1; return [pose.x + p[0] * s, pose.y + p[1] * s]; }

// ---------------------------------------------------------------- drawing
export function drawPerson(ctx, pose, t = 0) {
  const K = skeleton(pose);
  ctx.save(); ctx.translate(pose.x, pose.y); ctx.scale(pose.s ?? 1, pose.s ?? 1);
  if (pose.shadow !== false) { ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = PAL.ink; ctx.beginPath(); ctx.ellipse(K.ankle[0] + 10, 2, 120 - (pose.heel || 0) * 20, 12, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  // far side first: leg, arm
  drawLeg(ctx, K.hipB, K.kneeB, K.ankleB, K.heel, PAL.slateD, 300);
  if (!pose.hideB) drawArm(ctx, K.B, pose.handB || 'open', pose.handAngB, 1, 320, PAL.tomatoD);
  drawTorso(ctx, K, pose);
  drawLeg(ctx, K.hip, K.knee, K.ankle, K.heel, PAL.slate, 340);
  drawHead(ctx, K, pose, t);
  if (!pose.hideF) drawArm(ctx, K.F, pose.handF || 'open', pose.handAngF, -1, 360, PAL.tomato);
  ctx.restore();
  return K;
}

function drawLeg(ctx, hip, knee, ankle, heel, col, seed) {
  limb(ctx, spline([hip, knee, ankle], false, 6), 66, col, seed);
  // sock + loafer: the foot pivots on the toe when the heel rises
  const fa = -heel * 0.62;                                 // foot angle (toe down when heel up)
  const toe = [ankle[0] + Math.cos(fa) * FOOT + 4, ankle[1] + 26 + Math.sin(-fa) * FOOT * 0.62];
  shape(ctx, xform([[-10, -4], [10, -4], [10, 16], [-10, 16]], ankle[0], ankle[1], fa), { fill: PAL.white, line: 3, seed: seed + 3, grain: 0.1, breaks: 0.2 });
  const shoe = xform(spline([[-22, 14], [8, 6], [46, 12], [70, 26], [66, 36], [-22, 36]], true, 4), ankle[0], ankle[1], fa);
  shape(ctx, shoe, { fill: PAL.brown, line: 3.4, seed: seed + 4, grain: 0.2, breaks: 0.15 });
  return toe;
}

function drawTorso(ctx, K, pose) {
  const { spine, fw, dir, slump, shBack } = K, n = spine.length;
  const back = [], front = [];
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1), a = spine[Math.max(0, i - 1)], b = spine[Math.min(n - 1, i + 1)];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, f = [(b[1] - a[1]) / L * -1, (b[0] - a[0]) / L];
    // f points to the figure's front for an upward spine
    const wb = 50 + slump * 10 * Math.sin(Math.PI * k) + (k < 0.2 ? (0.2 - k) * 60 : 0);
    const wf = 52 - 6 * k + shBack * 12 * Math.exp(-((k - 0.78) ** 2) / 0.02) - slump * 6 * k;
    back.push([spine[i][0] - f[0] * wb, spine[i][1] - f[1] * wb]); front.push([spine[i][0] + f[0] * wf, spine[i][1] + f[1] * wf]);
  }
  const top = [add(spine[n - 1], dir, 16)];
  const bottom = [add(add(spine[0], dir, -26), fw, 6)];
  const outline = spline([...front, ...top, ...back.slice().reverse(), ...bottom], true, 3);
  // one flat shade plane along the back
  const band = [...back.map(p => add(p, fw, -20)), ...back.slice().reverse().map(p => add(p, fw, 24))];
  shape(ctx, outline, { fill: PAL.tomato, line: 4.2, seed: 50, grain: 0.35, breaks: 0.18, shade: [{ pts: band, color: PAL.tomatoD, alpha: 0.45 }] });
  // polo collar and placket
  const nb = add(K.neck, dir, -14);
  shape(ctx, [add(nb, fw, -26), add(add(nb, fw, 30), dir, -6), add(add(nb, fw, 6), dir, -30)], { fill: PAL.white, line: 3, seed: 51, grain: 0.1, breaks: 0.1 });
  ink(ctx, [add(add(nb, fw, 26), dir, -18), add(add(nb, fw, 30), dir, -62)], 2.6, { seed: 52, taper: false, color: PAL.tomatoD });
  // belt
  const b0 = add(spine[1], dir, -4);
  ink(ctx, [add(b0, fw, -44), add(b0, fw, 48)], 12, { seed: 53, taper: false, color: PAL.ink, wob: 0.05 });
}

function drawArm(ctx, J, kind, angOverride, side, seed, sleeveCol) {
  // short sleeve over the upper arm, bare forearm
  const mid = [lerp(J.sh[0], J.el[0], 0.62), lerp(J.sh[1], J.el[1], 0.62)];
  limb(ctx, spline([mid, J.el, J.ha], false, 6), 30, PAL.skin, seed);
  limb(ctx, [J.sh, mid], 42, sleeveCol, seed + 2);
  drawHand(ctx, J.ha[0], J.ha[1], angOverride ?? J.a2, kind, side, 1.15);
}

// one outline from the back of the skull over the crown, down the forehead, out to the nose tip and back
function drawHead(ctx, K, pose, t) {
  const face = pose.face || 'neutral', blink = pose.blink || 0, look = pose.look || [0, 0];
  const [hx, hy] = K.head, rot = K.hr;
  const X = pts => xform(pts, hx, hy, rot, HS);
  // neck
  const nk = K.neck;
  ink(ctx, [add(nk, K.dir, -10), add(K.head, [-6, 46])], 48, { seed: 400, taper: false });
  ink(ctx, move([add(nk, K.dir, -10), add(K.head, [-6, 46])], 2, 2), 36, { seed: 401, taper: false, color: PAL.skin });
  // ear (behind the head outline)
  const skull = spline([[-60, 0], [-56, -42], [-30, -70], [10, -74], [44, -58], [56, -30]], false, 6);
  const faceL = spline([[56, -30], [60, -10], [64, 6], [88, 18], [64, 24], [62, 34], [56, 44], [58, 56], [40, 70], [6, 70], [-30, 56], [-56, 30], [-60, 0]], false, 6);
  shape(ctx, X([...skull, ...faceL]), { fill: PAL.skin, line: 4, seed: 402, grain: 0.15, breaks: 0.1 });
  if (pose.doubleChin) ink(ctx, X(spline([[8, 76], [30, 80 + 6 * pose.doubleChin], [50, 70]], false, 5)), 3.4, { seed: 403, alpha: clamp(pose.doubleChin * 1.5) });
  shape(ctx, X(ellipse(-16, 8, 12, 16, 16)), { fill: PAL.skin, line: 3.4, seed: 404, grain: 0.1, breaks: 0.15 });
  ink(ctx, X(spline([[-20, 0], [-12, 6], [-18, 14]], false, 4)), 2.6, { seed: 405 });
  // hair: short, side part, a soft quiff over the forehead
  shape(ctx, X(spline([[-64, 4], [-66, -36], [-46, -70], [-6, -86], [36, -84], [60, -64], [62, -44], [40, -50], [18, -46], [-10, -46], [-30, -30], [-34, -6], [-46, 8]], true, 6)),
    { fill: PAL.hair, line: 0, seed: 406, grain: 0.3 });
  // cheek, eye, brow, glasses
  shape(ctx, X(ellipse(26, 26, 13, 8, 14)), { fill: PAL.pink, line: 0, grain: 0, seed: 407, alpha: 0.85 });
  const E = [36 + look[0], -6 + look[1]];
  eye(ctx, X, E, face, blink);
  // horn-rim glasses: a round lens, a bridge to the nose, a temple to the ear
  ink(ctx, X(ellipse(38, -6, 17, 16, 28)), 5, { closed: true, seed: 408, color: PAL.ink, breaks: 0.05 });
  ink(ctx, X([[21, -10], [-10, -4]]), 4, { seed: 409, taper: false });
  mouth(ctx, X, face, pose.mouth);
}
function eye(ctx, X, [x, y], face, blink) {
  const brow = face === 'wince' ? [[x - 12, y - 18], [x + 8, y - 26]] : face === 'tired' ? [[x - 12, y - 25], [x + 10, y - 22]]
    : face === 'wow' ? [[x - 10, y - 32], [x + 10, y - 34]] : face === 'focus' ? [[x - 12, y - 26], [x + 10, y - 21]] : [[x - 11, y - 27], [x + 10, y - 29]];
  ink(ctx, X(brow), 4, { seed: 410 });
  if (face === 'wince') { ink(ctx, X([[x - 8, y - 6], [x + 4, y], [x - 8, y + 6]]), 3.6, { seed: 411, taper: false }); return; }
  if (face === 'happy' || face === 'calm' || blink > 0.5) {
    const up = face === 'happy';
    ink(ctx, X(up ? [[x - 8, y + 3], [x, y - 5], [x + 8, y + 3]] : face === 'calm' ? [[x - 8, y - 1], [x, y + 4], [x + 8, y - 1]] : [[x - 8, y], [x + 8, y]]), 3.8, { seed: 412, taper: false });
    return;
  }
  const r = face === 'wow' ? 8 : 6.4;
  shape(ctx, X(ellipse(x, y, r * 0.8, r * 1.25, 14)), { fill: PAL.ink, line: 0, grain: 0, off: [0, 0] });
  shape(ctx, X(ellipse(x + 1.5, y - 3.5, 2, 2.4, 8)), { fill: PAL.white, line: 0, grain: 0, off: [0, 0] });
  if (face === 'tired') shape(ctx, X([[x - 10, y - 12], [x + 10, y - 12], [x + 10, y - 1], [x - 10, y - 1]]), { fill: PAL.skin, line: 0, grain: 0, off: [0, 0] }),
    ink(ctx, X([[x - 9, y - 1], [x + 9, y - 1]]), 3.4, { seed: 413, taper: false });
}
function mouth(ctx, X, face, m) {
  const k = m || face;
  if (k === 'happy') shape(ctx, X(spline([[30, 36], [56, 34], [48, 52], [34, 50]], true, 6)), { fill: PAL.tomatoD, line: 3.2, seed: 420, grain: 0, breaks: 0 });
  else if (k === 'wow') shape(ctx, X(ellipse(46, 42, 7, 9, 16)), { fill: PAL.tomatoD, line: 3.2, seed: 421, grain: 0, breaks: 0 });
  else if (k === 'wince') ink(ctx, X(spline([[30, 42], [36, 38], [42, 44], [48, 38], [54, 42]], false, 4)), 3.4, { seed: 422 });
  else if (k === 'tired') ink(ctx, X([[34, 44], [54, 42]]), 3.4, { seed: 423 });
  else if (k === 'calm') ink(ctx, X(spline([[34, 40], [44, 45], [54, 40]], false, 5)), 3.4, { seed: 424 });
  else ink(ctx, X(spline([[32, 40], [44, 46], [55, 39]], false, 5)), 3.4, { seed: 425 });
}
