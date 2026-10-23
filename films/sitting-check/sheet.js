// Model sheet (?test=sheet): key poses, expressions, props, palette and type, drawn with the real engine.
import { PAL, setClock, plane, text, rrect, shape, paperFinish, ellipse } from './engine/toon.js';
import { drawPerson } from './engine/person.js';
import { drawChair, drawDesk, drawClock, drawSpider, drawLamp, icon } from './engine/props.js';
import { P, DESK_X } from './engine/poses.js';

export function drawSheet(g, t) {
  setClock(t);
  const W = 1080, H = 1920;
  plane(g, [[0, 0], [W, 0], [W, H], [0, H]], PAL.paper);
  text(g, 'MODEL SHEET · 久坐族自测', 40, 70, { font: '600 30px Jost', fill: PAL.ink, track: 4 });
  // row 1: office set, slumped typing, rub neck, hand on back
  const cell = (x, y, s, pose, bg, desk = true) => {
    g.save(); g.beginPath(); g.rect(x, y - 520, 350, 540); g.clip();
    plane(g, [[x, y - 520], [x + 350, y - 520], [x + 350, y + 20], [x, y + 20]], bg);
    plane(g, [[x, y - 40], [x + 350, y - 40], [x + 350, y + 20], [x, y + 20]], PAL.paperDD);
    g.translate(x + 110, y - 30); g.scale(s, s);
    if (desk === 'chair' || desk === true) drawChair(g, 0, 0, 1);
    if (desk === true) drawDesk(g, DESK_X, 0, { mug: true });
    drawPerson(g, { x: 0, y: 0, s: 1, ...pose }, t);
    g.restore();
  };
  cell(10, 640, 0.66, P.sitUp(), PAL.blue);
  cell(365, 640, 0.66, P.sitSlump(1), PAL.mustard);
  cell(720, 640, 0.66, P.rubNeck(), PAL.olive);
  cell(10, 1200, 0.66, P.handBack(), PAL.blue);
  cell(365, 1200, 0.6, { ...P.cheer(), x: -80 }, PAL.teal, false);
  cell(720, 1200, 0.6, { ...P.squeeze(1), x: -80 }, PAL.mustard, false);
  // row 3: tuck, rise, props
  g.save(); g.beginPath(); g.rect(10, 1240, 520, 540); g.clip();
  plane(g, [[10, 1240], [530, 1240], [530, 1780], [10, 1780]], PAL.teal);
  g.translate(60, 1750); g.scale(0.6, 0.6);
  drawPerson(g, { x: 0, y: 0, s: 1, ...P.tuck(0) }, t);
  drawPerson(g, { x: 400, y: 0, s: 1, ...P.tuck(1) }, t);
  g.restore();
  g.save(); g.beginPath(); g.rect(545, 1240, 525, 540); g.clip();
  plane(g, [[545, 1240], [1070, 1240], [1070, 1780], [545, 1780]], PAL.plum);
  g.translate(560, 1750); g.scale(0.6, 0.6);
  drawDesk(g, 268, 0, { laptop: false, mug: true });
  drawPerson(g, { x: 0, y: 0, s: 1, ...P.rise(1) }, t);
  drawClock(g, 620, -650, 90, 10.2);
  drawSpider(g, 640, -900, -820, t);
  g.restore();
  // icons + palette + type
  const ic = ['clock', 'chair', 'neck', 'back', 'ankle', 'tuck', 'squeeze', 'raise'];
  ic.forEach((n, i) => { shape(g, ellipse(60 + i * 130, 1840, 52, 52, 40), { fill: PAL.sand, line: 4, seed: 900 + i }); icon(g, n, 60 + i * 130, 1840, 34); });
  text(g, '久坐族自测', 560, 160, { font: '400 96px ZQ', fill: PAL.ink, plate: PAL.tomato, off: [5, 5] });
  text(g, '坐了一整天？', 40, 160, { font: '400 72px ZK', fill: PAL.ink, plate: PAL.mustard, off: [4, 4] });
  text(g, '一天坐够 8 小时', 40, 240, { font: '400 60px ZQ', fill: PAL.ink, plate: PAL.white, off: [4, 4] });
  text(g, '你中了几个？评论区打数字', 520, 240, { font: '900 40px NS', fill: PAL.ink });
  text(g, 'Quick check!', 40, 310, { font: '700 54px Oleo', fill: PAL.tomato });
  text(g, 'STEP 1 OF 3', 380, 305, { font: '600 26px Jost', fill: PAL.ink, track: 6 });
  text(g, '8', 650, 320, { font: '90px Slab', fill: PAL.ink, plate: PAL.mustard, off: [5, 5] });
  ['paper', 'ink', 'tomato', 'olive', 'blue', 'mustard', 'teal', 'sand', 'plum', 'slate', 'skin', 'hair'].forEach((k, i) => shape(g, rrect(740 + (i % 6) * 54, 270 + Math.floor(i / 6) * 54, 46, 46, 8), { fill: PAL[k], line: 2.5, seed: 950 + i }));
  paperFinish(g, W, H, 1);
}
