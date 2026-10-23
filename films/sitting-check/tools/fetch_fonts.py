"""Subset the Chinese fonts to the characters this film uses (Google Fonts CSS API, &text=), save them in fonts/.
Run: python3 tools/fetch_fonts.py   (scans every .js file of the film for non-ASCII characters)"""
import os, re, glob, urllib.request, urllib.parse

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(HERE, 'fonts')
FAMILIES = [  # (css family, weight, local name)
    ('ZCOOL QingKe HuangYou', 400, 'ZQ'),
    ('Noto Sans SC', 500, 'NS'), ('Noto Sans SC', 700, 'NS'), ('Noto Sans SC', 900, 'NS'),
    ('ZCOOL KuaiLe', 400, 'ZK'),
    ('Noto Serif SC', 900, 'NSerif'),
]

chars = set('0123456789/×·:：，。！？、 ')
for f in glob.glob(os.path.join(HERE, '**', '*.js'), recursive=True):
    if '/node_modules/' in f: continue
    chars |= {c for c in open(f, encoding='utf-8').read() if ord(c) > 127}
text = ''.join(sorted(chars))
css = []
for fam, w, name in FAMILIES:
    q = urllib.parse.urlencode({'family': f'{fam}:wght@{w}', 'text': text})
    req = urllib.request.Request('https://fonts.googleapis.com/css2?' + q, headers={'User-Agent': 'Mozilla/5.0'})
    body = urllib.request.urlopen(req, timeout=60).read().decode()
    url = re.search(r'url\((https://[^)]+)\)', body).group(1)
    ext = 'woff2' if 'woff2' in body else 'ttf'
    out = f'{name}-{w}.{ext}'
    urllib.request.urlretrieve(url, os.path.join(FONTS, out))
    css.append(f"@font-face {{ font-family: '{name}'; src: url({out}); font-weight: {w}; font-display: block; }}")
    print(out, os.path.getsize(os.path.join(FONTS, out)), 'bytes')
css += [
    "@font-face { font-family: 'Oleo'; src: url(OleoScript-Regular.ttf) format('truetype'); font-weight: 400; font-display: block; }",
    "@font-face { font-family: 'Oleo'; src: url(OleoScript-Bold.ttf) format('truetype'); font-weight: 700; font-display: block; }",
    "@font-face { font-family: 'Slab'; src: url(AlfaSlabOne-Regular.ttf) format('truetype'); font-display: block; }",
    "@font-face { font-family: 'Jost'; src: url(Jost.ttf) format('truetype'); font-weight: 100 900; font-display: block; }",
]
open(os.path.join(FONTS, 'fonts.css'), 'w').write('\n'.join(css) + '\n')
print(len(text), 'characters')
