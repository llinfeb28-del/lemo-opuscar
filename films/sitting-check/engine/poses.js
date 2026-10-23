// Key poses for the presenter, as plain parameter sets. Scenes blend two poses with blend(a, b, k):
// numbers interpolate, points interpolate, the hand shape and face switch at the middle (one in-between).
import { lerp } from './toon.js';
import { SEAT, STAND, skeleton } from './person.js';

export const DESK_X = 180;                         // desk front edge in the office scenes
const KEY = [DESK_X + 40, -460];                   // hands on the keyboard

export const P = {
  sitUp: () => ({ hip: SEAT.hip, ankle: SEAT.ankle, lean: 0.12, slump: 0, headFwd: 0, armF: { to: [KEY[0] + 30, KEY[1]] }, armB: { to: [KEY[0] + 10, KEY[1] - 4] }, handF: 'rest', handB: 'rest', handAngF: 0.12, handAngB: 0.12, face: 'neutral' }),
  sitSlump: (k = 1) => ({ hip: SEAT.hip, ankle: SEAT.ankle, lean: 0.12 + 0.16 * k, slump: k, headFwd: 10 * k, armF: { to: [KEY[0] + 30, KEY[1] + 2] }, armB: { to: [KEY[0] + 10, KEY[1] - 2] }, handF: 'rest', handB: 'rest', handAngF: 0.12, handAngB: 0.12, face: k > 0.6 ? 'tired' : 'neutral' }),
  rubNeck: () => withHand({ hip: SEAT.hip, ankle: SEAT.ankle, lean: 0.06, slump: 0.4, headFwd: 4, headRot: -0.12, armB: { to: [KEY[0] + 10, KEY[1] - 2] }, handB: 'rest', handAngB: 0.12, handF: 'flat', face: 'wince' }, 'F', K => [K.head[0] - 46, K.head[1] + 46], -1, -2.2),
  handBack: () => withHand({ hip: SEAT.hip, ankle: SEAT.ankle, lean: -0.04, slump: 0.2, headFwd: 0, headRot: -0.08, armB: { to: [KEY[0] + 10, KEY[1] - 2] }, handB: 'rest', handAngB: 0.12, handF: 'flat', face: 'wince' }, 'F', K => [K.hip[0] - 34, K.hip[1] - 70], 1, 1.9),
  stand: () => ({ hip: STAND.hip, ankle: STAND.ankle, lean: 0, slump: 0, headFwd: 0, armF: { a1: 1.62, a2: 1.5 }, armB: { a1: 1.7, a2: 1.6 }, handF: 'open', handB: 'open', face: 'happy' }),
  // the turn: standing tall, the near arm up with a pointing finger, the far hand on the hip
  cheer: () => ({ hip: STAND.hip, ankle: STAND.ankle, lean: -0.04, slump: 0, headFwd: -2, headRot: -0.12, armF: { a1: -0.75, a2: -1.2 }, armB: { to: [STAND.hip[0] - 40, STAND.hip[1] - 10], bend: -1 }, handF: 'point', handB: 'grip', handAngF: -1.45, face: 'happy' }),
  tuck: (k = 0) => ({ hip: STAND.hip, ankle: STAND.ankle, lean: 0, slump: 0, headFwd: lerp(8, -26, k), headRot: lerp(0.02, 0.1, k), doubleChin: k, armF: { a1: 1.62, a2: 1.52 }, armB: { a1: 1.7, a2: 1.6 }, handF: 'open', handB: 'open', face: k > 0.5 ? 'focus' : 'neutral' }),
  squeeze: (k = 0) => ({ hip: STAND.hip, ankle: STAND.ankle, lean: 0, slump: 0, shBack: k, headFwd: lerp(4, -6, k), armF: { a1: lerp(1.55, 2.1, k), a2: lerp(0.15, 0.3, k) }, armB: { a1: lerp(1.6, 2.15, k), a2: lerp(0.2, 0.35, k) }, handF: 'grip', handB: 'grip', face: k > 0.5 ? 'focus' : 'neutral' }),
  // hand resting on a desk whose front edge is at deskX (standing)
  rise: (k = 0, deskX = 262) => ({ hip: [STAND.hip[0], STAND.hip[1] - k * 40], ankle: STAND.ankle, heel: k, lean: 0.04, slump: 0, headFwd: 0, armF: { to: [deskX + 18, -450 - 0], bend: 1 }, armB: { a1: 1.7, a2: 1.6 }, handF: 'flat', handB: 'open', handAngF: 0.05, face: k > 0.5 ? 'happy' : 'focus' }),
};
// place one hand at a point computed from the skeleton of the pose (e.g. the back of the neck)
function withHand(pose, which, where, bend, ang) {
  const K = skeleton(pose); pose['arm' + which] = { to: where(K), bend }; pose['handAng' + which] = ang; return pose;
}

const lp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
const armOf = (pose, w) => { const a = pose['arm' + w]; if (a && a.to) return a; const K = skeleton(pose), J = K[w]; return { to: J.ha, bend: a?.bend ?? 1, el: J.el }; };
export function blend(a, b, k) {
  if (k <= 0) return a; if (k >= 1) return b;
  const o = { ...(k < 0.5 ? a : b) };
  for (const key of ['lean', 'slump', 'headFwd', 'headRot', 'shBack', 'heel', 'doubleChin', 'handAngF', 'handAngB']) {
    const va = a[key] ?? 0, vb = b[key] ?? 0; o[key] = lerp(va, vb, k);
  }
  o.hip = lp2(a.hip, b.hip, k); o.ankle = lp2(a.ankle, b.ankle, k);
  for (const w of ['F', 'B']) {
    const A = a['arm' + w], B = b['arm' + w];
    if (A && B && A.a1 !== undefined && B.a1 !== undefined) o['arm' + w] = { a1: lerp(A.a1, B.a1, k), a2: lerp(A.a2, B.a2, k) };
    else { const aa = armOf(a, w), bb = armOf(b, w); o['arm' + w] = { to: lp2(aa.to, bb.to, k), bend: k < 0.5 ? aa.bend ?? 1 : bb.bend ?? 1 }; }
  }
  return o;
}
