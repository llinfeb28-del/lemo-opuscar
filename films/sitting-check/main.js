// Page contract: window.READY, window.render(t), window.DUR, window.EV, window.TEXTS
import { textures } from './engine/toon.js';
const Q = new URLSearchParams(location.search);
const cv = document.getElementById('c'), g = cv.getContext('2d');
cv.width = innerWidth; cv.height = innerHeight;   // 1080 × 1920 (--size 1080x1920)
await Promise.all(['400 80px ZQ', '400 80px ZK', '500 40px NS', '700 40px NS', '900 40px NS', '900 80px NSerif', '700 80px Oleo', '80px Slab', '600 40px Jost'].map(f => document.fonts.load(f)));
textures();
if (Q.get('test') === 'sheet') {
  const { drawSheet } = await import('./sheet.js');
  window.DUR = 1; window.EV = []; window.render = t => { g.setTransform(1, 0, 0, 1, 0, 0); drawSheet(g, t); };
} else {
  const film = await import('./film.js');
  window.DUR = film.DUR; window.EV = film.events(); window.TEXTS = t => film.texts(t);
  window.render = t => { g.setTransform(1, 0, 0, 1, 0, 0); film.renderFilm(g, t, Q); };
}
window.READY = true;
