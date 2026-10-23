"""Foley + room tone -> out/mix.wav (no music, no voice: the user adds their own music).
Run from the library root: .venv/bin/python films/sitting-check/mix.py   (needs events.json from core/render/events.mjs)
Layers: ambience (warm room tone, a quiet mantel tick on the 120 BPM grid in the calm sections) and foley by material
(rubber stamps, paper, wood ticks, a shell chair on the floor, cloth, cartoon springs and whistles).
One true silence: 26.0-26.5 s, everything off, so the chair scrape and the stamp of the rise are the first sounds after it."""
import sys, os, json, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, '../..')))
from core.audio.sfx import SR, t_, env_exp, bp, lp, hp, norm, brown, clack, whoosh, creak, thump, ding, pop, add, limit

E = json.load(open(os.path.join(HERE, 'events.json')))
DUR = E['dur']; N = int(round(DUR * SR)); EV = E['ev']
BEAT = 0.5
rng = np.random.default_rng(1948)
def nz(d): return rng.standard_normal(len(t_(d)))
def sine(f, d): return np.sin(2 * np.pi * np.cumsum(np.broadcast_to(f, len(t_(d))).astype(float)) / SR)
def env_ad(d, a=.004, tau=.1):
    x = env_exp(d, tau); n = int(a * SR)
    if n: x[:n] *= np.linspace(0, 1, n)
    return x
def M(*xs):
    n = max(len(x) for x in xs); return sum(np.pad(x, (0, n - len(x))) for x in xs)
def semis(p): return 2 ** (p / 12)

# ---------------- foley by material ----------------
def key(n):                        # laptop key: a short plastic tick with a little body
    d = .05; f = 2400 * (0.9 + 0.2 * ((n * 37) % 7) / 7)
    return norm(hp(nz(d), 2500) * env_exp(d, .003) + sine(f, d) * env_exp(d, .006) * .4 + sine(260, d) * env_exp(d, .008) * .3)
def tick(p=1.0): return norm(clack(1.5 * p, 1)[:int(.08 * SR)])
def pen(d):                        # the marker line writing the hook question
    x = bp(nz(d), 2200, 7500) * (0.5 + .5 * np.abs(np.sin(2 * np.pi * 13 * t_(d)))); return norm(x) * np.sin(np.pi * t_(d) / d)
def stamp(p=0):                    # rubber stamp: thick, damped, a paper smack on top
    d = .3; tt = t_(d)
    return norm(sine(140 * semis(p) * (1 - .4 * tt), d) * env_exp(d, .035) + lp(nz(d), 1800) * env_exp(d, .012) * .9)
def iris(d): tt = t_(d); return norm(bp(nz(d), 1000, 6000) * np.linspace(1, .2, len(tt))) * np.sin(np.pi * tt / d)
def tickmark(p=0):                 # the check mark: two quick bell pips, a fifth apart
    d = .35; f = 1568 * semis(p * 2)
    a = sine(f, d) * env_ad(d, .002, .07); b = np.pad(sine(f * 1.5, d) * env_ad(d, .002, .09), (int(.06 * SR), 0))[:len(a)]
    return norm(a * .7 + b)
def paper_swish(d=.3): return norm(bp(nz(d), 1800, 8000)) * np.sin(np.pi * t_(d) / d) ** 2
def clockpip(n): return norm(M(clack(1.0 + n * 0.08, 1)[:int(.09 * SR)], sine(880 * semis(n), .09) * env_exp(.09, .02) * .5))
def slide_whistle(up=True, d=.32, lo=700, hi=1500):
    f = np.linspace(lo, hi, len(t_(d))) if up else np.linspace(hi, lo, len(t_(d)))
    return norm(sine(f * (1 + .012 * np.sin(2 * np.pi * 6 * t_(d))), d) + .08 * bp(nz(d), 1000, 3000)) * np.sin(np.pi * t_(d) / d) ** .6
def boing():                       # a little spring: pitch wobble that settles
    d = .45; tt = t_(d); f = 260 * (1 + .35 * np.sin(2 * np.pi * 11 * tt) * np.exp(-tt / .12)) * (1 + .4 * np.exp(-tt / .05))
    return norm(sine(f, d) * env_ad(d, .003, .16))
def cloth(d=.4): x = bp(nz(d), 500, 3200) * (0.4 + .6 * np.abs(np.sin(2 * np.pi * 7 * t_(d)))); return norm(x) * np.sin(np.pi * t_(d) / d) ** .7
def twang(p=0):                    # an ache mark springing out: a plucked rubber band
    d = .35; tt = t_(d); f = 196 * semis(p) * (1 + .5 * np.exp(-tt / .02))
    x = sine(f, d) * env_exp(d, .09) + sine(f * 2.01, d) * env_exp(d, .05) * .4 + hp(nz(d), 3000) * env_exp(d, .003) * .3
    return norm(np.tanh(x * 1.6))
def puff(n):                       # the ankle swelling one notch: a squeaky little inflate
    d = .28; tt = t_(d); f = (380 + 260 * tt / d) * semis(n * 2)
    return norm(sine(f, d) * env_ad(d, .02, .12) * .8 + bp(nz(d), 800, 3000) * env_ad(d, .01, .06) * .4)
def scrape(d=.5):                  # the shell chair pushed back on a wooden floor
    x = bp(nz(d), 220, 1800) * (0.55 + .45 * np.abs(np.sin(2 * np.pi * 27 * t_(d))))
    return norm(x) * np.sin(np.pi * t_(d) / d) ** .7
def chime():                       # the cheer: three bell notes up and a shimmer
    d = 1.2; x = np.zeros(len(t_(d)))
    for i, f in enumerate([1046.5, 1318.5, 1568]):
        o = int(i * .07 * SR); s = sine(f, d - i * .07) * env_ad(d - i * .07, .002, .35) + sine(f * 2, d - i * .07) * env_exp(d - i * .07, .12) * .3
        x[o:o + len(s)] += s[:len(x) - o]
    x += hp(nz(d), 6000) * env_ad(d, .05, .25) * .08
    return norm(x)
def tap(): return norm(M(clack(1.8, 1)[:int(.06 * SR)] * .6, lp(nz(.06), 2000) * env_exp(.06, .006)))
def stretch(): return norm(M(cloth(.35), creak(1)[:int(.35 * SR)] * .5))
def blub():                        # the calf pump: a bubble rising
    d = .16; f = np.linspace(300, 900, len(t_(d)))
    return norm(sine(f, d) * env_ad(d, .005, .05))

fx = np.zeros((N, 2)); amb = np.zeros((N, 2))
silences = []
for e in EV:
    t, ty, gn, pan = e['t'], e['type'], e.get('gain', 1.0), e.get('pan', 0.0)
    if ty == 'key': add(fx, key(e.get('n', 0)), t, .12, .35)
    elif ty == 'tick': add(fx, tick(), t, .28 * gn, .5)
    elif ty == 'pen': add(fx, pen(e.get('dur', .35)), t, .14, -.1)
    elif ty == 'pop': add(fx, pop(1), t, .22 * gn, .2)
    elif ty == 'ding': add(fx, ding(1), t, .3 * gn, .4)
    elif ty == 'stamp': add(fx, stamp(e.get('pitch', 0)), t, .7 * gn)
    elif ty == 'iris': add(fx, iris(e.get('dur', .5)), t, .25, -.3)
    elif ty == 'tickmark': add(fx, tickmark(e.get('pitch', 0)), t, .16, .2)
    elif ty == 'cut': add(fx, paper_swish(.14), t - .04, .18, .3)
    elif ty == 'clockpip': add(fx, clockpip(e.get('n', 0)), t, .3, -.6 + .15 * e.get('n', 0))
    elif ty == 'stamp8': add(fx, stamp(-3), t, .9); add(fx, pop(1), t + .02, .2)
    elif ty == 'spider': add(fx, slide_whistle(False, e.get('dur', 1.0), 900, 1700), t, .12, -.2)
    elif ty == 'boing': add(fx, boing(), t, .3, -.2)
    elif ty == 'cloth': add(fx, cloth(e.get('dur', .4)), t, .22 * gn, -.1)
    elif ty == 'twang': add(fx, twang(e.get('pitch', 0)), t, .3, -.3)
    elif ty == 'creak': add(fx, creak(1), t, .3, -.4)
    elif ty == 'puff': add(fx, puff(e.get('n', 0)), t, .26, 0)
    elif ty == 'swish': add(fx, paper_swish(e.get('dur', .3)), t, .3 * gn, .4)
    elif ty == 'whoosh': add(fx, whoosh(e.get('dur', .35), 1), t, .25 * gn)
    elif ty == 'silence': silences.append((t, e['until']))
    elif ty == 'scrape': add(fx, scrape(e.get('dur', .5)), t, .5, -.3)
    elif ty == 'thump': add(fx, thump(.8, 75), t, .5)
    elif ty == 'chime': add(fx, chime(), t, .32, .1)
    elif ty == 'slide': add(fx, paper_swish(.22), t, .16, -.4)
    elif ty == 'whistle': add(fx, slide_whistle(e.get('up', 0) == 1, .3), t, .14 * gn, .3)
    elif ty == 'tap': add(fx, tap(), t, .35 * gn, .2)
    elif ty == 'stretch': add(fx, stretch(), t, .3, -.2)
    elif ty == 'blub': add(fx, blub(), t, .18, .3)

# ---------------- ambience ----------------
room = lp(brown(DUR), 800) * .016
amb += np.stack([room, np.roll(room, 311)], 1)
for k in range(int(DUR / BEAT)):            # a mantel tick on the beat, only where the picture rests
    t = k * BEAT
    if 3.0 < t < 6.75 or 23.5 < t < 26.0 or 43.5 < t < 48.5: add(amb, tick(0.8), t, .045, -.6)

# ---------------- silence before the rise ----------------
def gate(buf, a, b, fade=.03):
    s, e = int(a * SR), int(b * SR); f = int(fade * SR)
    m = np.ones(N); m[s:e] = 0
    m[max(0, s - f):s] = np.linspace(1, 0, min(f, s)); m[e:e + f] = np.linspace(0, 1, len(m[e:e + f]))
    buf *= m[:, None]
for a, b in silences:
    gate(amb, a, b - 0.09); gate(fx, a, b - 0.09)      # the scrape (J-cut, 2 frames early) is the first sound back

mix = fx * .9 + amb
# sparse foley has a very high peak-to-loudness ratio: lift it ~9 dB into a look-ahead limiter so that the
# -14 LUFS master keeps its true peak under -1.2 dB (transients lose a little edge, nothing audible as pumping)
mix = mix * 10 ** (9 / 20)
mix = np.stack([limit(mix[:, 0], .6, .003), limit(mix[:, 1], .6, .003)], 1)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
# 12 s of digital silence after the end: mux.sh cuts audio at the picture's end anyway, and the padding keeps its
# decode check happy on ffmpeg 6.1, whose loudnorm progress report stops ~3 s (its look-ahead) before the real end.
mix = np.concatenate([mix, np.zeros((12 * SR, 2))])
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR)
print('mix.wav', mix.shape, 'peak', round(float(np.abs(mix).max()), 3))
