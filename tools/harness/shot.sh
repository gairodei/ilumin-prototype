#!/bin/bash
# Screenshot one prepared screen for a visual review (not part of the regression).
#   bash tools/harness/shot.sh <name> <viewport width> <height> <setup.js> [desktop|mobile]
# setup.js runs after App.boot() and leaves the screen to capture (it may open a dialog). "mobile" uses the prototype's phone frame.
# The page is shown in an iframe of exactly <viewport width>, so media queries see a real phone / tablet width
# (a headless browser window can't be made narrower than its minimum width).
# Output: tools/harness/out/shot-<name>.png
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
N="shot-$1"; W="$2"; HT="$3"; JS="$(cd "$(dirname "$4")" && pwd -W 2>/dev/null || pwd)/$(basename "$4")"; F="${5:-desktop}"
page "$N" "<script>window.__FRAME='$F';</script><script src=\"file:///$JS\"></script>"
printf '<!doctype html><html><body style="margin:0;background:#fff"><iframe src="file:///%s/%s.html" style="border:0;width:%spx;height:%spx;display:block"></iframe></body></html>' "$OUTW" "$N" "$W" "$HT" > "$OUT/$N-view.html"
prof="$OUT/profile-$N"; rm -rf "$prof" 2>/dev/null
WW=$(( W < 800 ? 800 : W ))
timeout 120 "$EDGE" --headless=new --disable-gpu --no-first-run --no-default-browser-check --hide-scrollbars \
  --user-data-dir="$OUTW/profile-$N" --allow-file-access-from-files --window-size="$WW,$HT" --virtual-time-budget=8000 \
  --screenshot="$OUTW/$N.png" "file:///$OUTW/$N-view.html" >/dev/null 2>&1
rm -rf "$prof" 2>/dev/null; ls -l "$OUT/$N.png" 2>/dev/null | awk '{print $5, $9}'
