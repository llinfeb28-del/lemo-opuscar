// Props for the office: a shell chair, a tapered desk, a laptop, a mug, a boom lamp, the sunburst wall clock,
// a small spider, and the icons used on the check-list medallions. All drawn with the style engine.
import { PAL, shape, ink, ellipse, spline, xform, move, rrect, rect, TAU, clamp, lerp, starPts, arrow } from './toon.js';

// ------------------------------------------------ chair (floor y = 0; the seated hip sits at (0, -262))
export function drawChair(ctx, x = 0, y = 0, s = 1, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const leg = (a, b, w, col, seed) => { ink(ctx, [a, b], w, { seed, taper: false, wob: 0.05 }); ink(ctx, move([a, b], 2, 2), w - 7, { seed: seed + 1, taper: false, color: col }); };
  leg([-30, -204], [-58, 0], 16, PAL.woodD, 600); leg([62, -204], [84, 0], 16, PAL.woodD, 602);
  leg([-48, -204], [-88, 0], 18, PAL.wood, 604); leg([44, -204], [58, 0], 18, PAL.wood, 606);
  const shell = move(spline([[-100, -478], [-84, -480], [-74, -300], [-54, -250], [76, -246], [90, -236], [84, -220], [-50, -214], [-88, -246], [-104, -330]], true, 5), 0, 18);
  shape(ctx, shell, { fill: o.fill || PAL.white, line: 4, seed: 608, grain: 0.25, breaks: 0.15,
    shade: [{ pts: [[-120, -482], [-92, -482], [-80, -212], [-120, -212]], color: PAL.paperD, alpha: 0.9 }] });
  ctx.restore();
}

// ------------------------------------------------ desk with a laptop and a mug (front edge at x0)
export function drawDesk(ctx, x0 = 240, y = 0, o = {}) {
  ctx.save(); ctx.translate(x0, y);
  const L = o.len ?? 620;
  const leg = (a, b, seed) => { ink(ctx, [a, b], 20, { seed, taper: false, wob: 0.04 }); ink(ctx, move([a, b], 2, 2), 12, { seed: seed + 1, taper: false, color: PAL.woodD }); };
  leg([40, -416], [56, 0], 620); leg([L - 50, -416], [L - 66, 0], 622);
  shape(ctx, rect(14, -416, L - 28, 34), { fill: PAL.woodD, line: 3.4, seed: 624, grain: 0.3, breaks: 0.2 });
  shape(ctx, rect(0, -440, L, 26), { fill: PAL.woodL, line: 4, seed: 626, grain: 0.3, breaks: 0.12,
    shade: [{ pts: rect(0, -422, L, 10), color: PAL.wood, alpha: 0.8 }] });
  if (o.laptop !== false) {
    shape(ctx, rect(22, -452, 170, 12), { fill: PAL.chrome, line: 3.4, seed: 628, grain: 0.15, breaks: 0.1 });
    shape(ctx, [[176, -450], [192, -452], [232, -650], [216, -652]], { fill: PAL.chromeD, line: 3.4, seed: 630, grain: 0.15, breaks: 0.1 });
    if (o.glow) shape(ctx, [[150, -456], [174, -456], [212, -640], [196, -642]], { fill: PAL.blueL, line: 0, seed: 631, grain: 0, alpha: 0.6 * o.glow, off: [0, 0] });
  }
  if (o.mug !== false) {
    const mx = 330;
    ink(ctx, ellipse(mx + 46, -484, 16, 18, 20, -1.4, 1.4), 7, { seed: 632, taper: false });
    shape(ctx, spline([[mx - 30, -530], [mx + 34, -530], [mx + 30, -444], [mx - 26, -444]], true, 2), { fill: PAL.mustard, line: 4, seed: 634, grain: 0.3, breaks: 0.15,
      shade: [{ pts: rect(mx + 10, -540, 30, 100), color: PAL.mustardD, alpha: 0.5 }] });
    if (o.steam) for (let i = 0; i < 2; i++) ink(ctx, spline([[mx - 8 + i * 18, -546], [mx + 2 + i * 18, -572], [mx - 10 + i * 18, -600], [mx + i * 18, -626]], false, 5), 3, { seed: 636 + i, alpha: 0.5, upto: o.steam });
  }
  ctx.restore();
}

// ------------------------------------------------ a boom lamp standing on the desk; returns the shade tip
export function drawLamp(ctx, bx, by, tip, o = {}) {
  const j = [bx - 30, by - 300];
  ink(ctx, [[bx, by], j], 9, { seed: 640, taper: false });
  ink(ctx, spline([j, [lerp(j[0], tip[0], 0.5), j[1] - 40], [tip[0] + 30, tip[1] - 24]], false, 8), 9, { seed: 642, taper: false });
  shape(ctx, ellipse(bx, by - 6, 46, 12, 24), { fill: PAL.ink, line: 0, grain: 0, off: [0, 0] });
  shape(ctx, [[tip[0] - 52, tip[1] + 8], [tip[0] + 52, tip[1] + 8], [tip[0] + 22, tip[1] - 46], [tip[0] - 14, tip[1] - 46]], { fill: PAL.tomato, line: 4, seed: 644, grain: 0.3, breaks: 0.1,
    shade: [{ pts: [[tip[0] + 10, tip[1] + 10], [tip[0] + 60, tip[1] + 10], [tip[0] + 30, tip[1] - 50]], color: PAL.tomatoD, alpha: 0.5 }] });
  shape(ctx, ellipse(tip[0], tip[1] + 10, 50, 9, 24), { fill: PAL.mustardL, line: 3, seed: 646, grain: 0, breaks: 0.2 });
  shape(ctx, ellipse(j[0], j[1], 9, 9, 12), { fill: PAL.ink, line: 0, off: [0, 0], grain: 0 });
}

// ------------------------------------------------ sunburst wall clock; hours = 0..24 (float)
export function drawClock(ctx, cx, cy, R, hours, o = {}) {
  const spikes = 12;
  for (let i = 0; i < spikes; i++) {
    const a = i * TAU / spikes, r1 = R * (i % 3 === 0 ? 1.62 : 1.38);
    ink(ctx, [[cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]], R * 0.06, { seed: 650 + i, taper: false, color: PAL.ink });
    shape(ctx, ellipse(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, R * 0.09, R * 0.09, 12), { fill: i % 3 === 0 ? (o.ball || PAL.mustard) : PAL.ink, line: i % 3 === 0 ? 2.5 : 0, seed: 670 + i, grain: 0 });
  }
  shape(ctx, ellipse(cx, cy, R, R, 60), { fill: o.face || PAL.white, line: Math.max(3, R * 0.05), seed: 690, grain: 0.15, breaks: 0.05 });
  for (let i = 0; i < 12; i++) {
    const a = i * TAU / 12, r0 = R * (i % 3 === 0 ? 0.7 : 0.8);
    ink(ctx, [[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * R * 0.88, cy + Math.sin(a) * R * 0.88]], i % 3 === 0 ? R * 0.06 : R * 0.03, { seed: 700 + i, taper: false });
  }
  const ha = (hours % 12) / 12 * TAU - Math.PI / 2, ma = (hours % 1) * TAU - Math.PI / 2;
  ink(ctx, [[cx, cy], [cx + Math.cos(ha) * R * 0.5, cy + Math.sin(ha) * R * 0.5]], R * 0.085, { seed: 720, taper: false });
  ink(ctx, [[cx, cy], [cx + Math.cos(ma) * R * 0.76, cy + Math.sin(ma) * R * 0.76]], R * 0.05, { seed: 721, taper: false, color: o.hand || PAL.tomato });
  shape(ctx, ellipse(cx, cy, R * 0.07, R * 0.07, 12), { fill: PAL.ink, line: 0, grain: 0, off: [0, 0] });
}

// ------------------------------------------------ a small spider hanging from (x, y0) down to (x, y1)
export function drawSpider(ctx, x, y0, y1, t, s = 1) {
  ink(ctx, [[x, y0], [x, y1]], 1.6, { seed: 730, taper: false, color: PAL.ink, alpha: 0.8 });
  ctx.save(); ctx.translate(x, y1 + 12 * s); ctx.scale(s, s);
  const wig = Math.sin(t * 12.566) * 0.12;
  for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) {
    const a0 = sd * (0.35 + i * 0.32) + wig * sd;
    ink(ctx, [[0, 0], [sd * 16, -8 + i * 6], [sd * (26 + i * 2), 4 + i * 8]], 2.6, { seed: 731 + i * 2 + (sd > 0), taper: false });
  }
  shape(ctx, ellipse(0, 0, 13, 15, 16), { fill: PAL.ink, line: 0, grain: 0, off: [0, 0] });
  shape(ctx, ellipse(-5, -3, 4, 5, 10), { fill: PAL.white, line: 0, grain: 0, off: [0, 0] });
  shape(ctx, ellipse(5, -3, 4, 5, 10), { fill: PAL.white, line: 0, grain: 0, off: [0, 0] });
  shape(ctx, ellipse(-4, -2, 1.8, 2.2, 8), { fill: PAL.ink, line: 0, grain: 0, off: [0, 0] });
  shape(ctx, ellipse(6, -2, 1.8, 2.2, 8), { fill: PAL.ink, line: 0, grain: 0, off: [0, 0] });
  ctx.restore();
}

// ------------------------------------------------ medallion icons (drawn centred, size ≈ r)
export function icon(ctx, name, cx, cy, r, o = {}) {
  const main = o.main || PAL.white, dark = o.dark || PAL.ink;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(r / 50, r / 50);
  if (name === 'clock') { drawClock(ctx, 0, 0, 26, o.hours ?? 8, { face: main }); }
  else if (name === 'chair') {
    shape(ctx, spline([[-26, -40], [-18, -40], [-14, 0], [24, 2], [26, 10], [-24, 12], [-30, -6]], true, 4), { fill: main, line: 3.5, seed: 750, grain: 0.1 });
    ink(ctx, [[-16, 12], [-26, 40]], 5, { seed: 751, taper: false }); ink(ctx, [[18, 12], [26, 40]], 5, { seed: 752, taper: false });
    ink(ctx, spline([[20, -40], [30, -30], [20, -20]], false, 4), 3, { seed: 753 }); // a "z"-ish idle curl
  } else if (name === 'neck') {
    shape(ctx, spline([[-20, 34], [-22, -4], [-10, -34], [16, -38], [30, -18], [34, -2], [26, 6], [24, 20], [10, 22], [8, 34]], true, 5), { fill: PAL.skin, line: 3.5, seed: 754, grain: 0.1 });
    ink(ctx, [[-34, -10], [-26, -16], [-34, -22], [-26, -28]], 4, { seed: 755, taper: false, color: PAL.tomatoD });
    ink(ctx, [[-30, 16], [-22, 10], [-30, 4], [-22, -2]], 4, { seed: 756, taper: false, color: PAL.tomatoD });
  } else if (name === 'back') {
    shape(ctx, spline([[-6, -42], [20, -40], [26, -4], [20, 40], [-16, 40], [-26, 10], [-24, -22]], true, 5), { fill: PAL.tomato, line: 3.5, seed: 757, grain: 0.1 });
    shape(ctx, ellipse(10, -46, 16, 14, 16), { fill: PAL.skin, line: 3.5, seed: 758, grain: 0.1 });
    ink(ctx, [[-44, 4], [-34, 12], [-44, 20], [-34, 28]], 4.5, { seed: 759, taper: false, color: PAL.tomatoD });
    shape(ctx, starPts(-22, 22, 12, 6, 0.45), { fill: PAL.mustard, line: 2.5, seed: 760, grain: 0 });
  } else if (name === 'ankle') {
    shape(ctx, spline([[-12, -40], [10, -40], [12, 4], [36, 16], [38, 30], [-22, 30], [-20, 8]], true, 4), { fill: PAL.skin, line: 3.5, seed: 759, grain: 0.1 });
    ink(ctx, [[-14, -6], [12, -6]], 4, { seed: 760, taper: false, color: PAL.tomatoD });
    for (const sd of [-1, 1]) ink(ctx, [[sd * 30 + (sd < 0 ? -4 : 12), -6], [sd * 38 + (sd < 0 ? -4 : 12), -12]], 3.5, { seed: 761 + (sd > 0), taper: false });
  } else if (name === 'tuck') {
    shape(ctx, spline([[-24, 30], [-26, -10], [-10, -34], [14, -34], [26, -16], [30, 0], [24, 8], [22, 22], [8, 26], [6, 34]], true, 5), { fill: PAL.skin, line: 3.5, seed: 762, grain: 0.1 });
    arrow(ctx, [44, -2], [8, -2], { w: 4, head: 16, bend: 0, fill: o.accent || PAL.tomato, seed: 763 });
  } else if (name === 'squeeze') {
    for (const sd of [-1, 1]) shape(ctx, xform(spline([[0, -26], [16, -20], [18, 18], [4, 26], [-4, 0]], true, 4), sd * 22, 0, 0, sd, 1), { fill: main, line: 3.5, seed: 764 + (sd > 0), grain: 0.1 });
    arrow(ctx, [-50, -30], [-16, -30], { w: 4, head: 14, bend: 0, fill: o.accent || PAL.tomato, seed: 766 });
    arrow(ctx, [50, -30], [16, -30], { w: 4, head: 14, bend: 0, fill: o.accent || PAL.tomato, seed: 767 });
  } else if (name === 'raise') {
    shape(ctx, spline([[-14, -40], [8, -40], [12, 0], [34, 30], [28, 36], [-8, 14], [-16, -4]], true, 4), { fill: PAL.skin, line: 3.5, seed: 768, grain: 0.1 });
    arrow(ctx, [-34, 30], [-34, -30], { w: 4, head: 14, bend: 0, fill: o.accent || PAL.tomato, seed: 769 });
  }
  ctx.restore();
}
