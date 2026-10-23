#!/bin/sh
# Rebuild 久坐族自测 from source: sh films/sitting-check/build.sh   (run from anywhere)
# Outputs: sitting-check.mp4 (foley, no music), sitting-check_silent.mp4 (no sound), poster.jpg
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../.." && pwd)}          # clone mode: <repo>/films/<name>/
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
cd "$LIB"
SIZE=1080x1920
[ -f "$HERE/fonts/ZQ-400.ttf" ] || python3 "$HERE/tools/fetch_fonts.py"                 # Chinese font subsets
node core/render/events.mjs "$HERE" --size $SIZE                                        # picture events -> events.json
"$LIB/.venv/bin/python" "$HERE/mix.py"                                                  # foley + room tone -> out/mix.wav
node core/render/readcheck.mjs "$HERE" --size $SIZE > "$HERE/out/readcheck.txt"         # every text long enough to read
node core/render/video.mjs "$HERE" --fps 24 --workers ${WORKERS:-4} --size $SIZE --out "$HERE/out/video.mp4"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/sitting-check.mp4" 24 1
# -shortest overshoots by the filters' buffer (here ~2 s of tail): cut the file back to the picture, losslessly
ffmpeg -y -loglevel error -i "$HERE/sitting-check.mp4" -t 48.5 -c copy -movflags +faststart "$HERE/out/trim.mp4" && mv "$HERE/out/trim.mp4" "$HERE/sitting-check.mp4"
# silent version for the user's own music: same picture, a silent AAC track
ffmpeg -y -loglevel error -i "$HERE/sitting-check.mp4" -f lavfi -i anullsrc=r=48000:cl=stereo -map 0:v -map 1:a -c:v copy -c:a aac -b:a 128k -shortest "$HERE/sitting-check_silent.mp4"
node core/render/still.mjs "$HERE" 6.6 --size $SIZE --prefix poster_ --out "$HERE/out"
cp "$HERE/out/poster_6.6.jpg" "$HERE/poster.jpg"
