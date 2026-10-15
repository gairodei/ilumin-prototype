#!/bin/bash
# UI check: clickable R1–R5 journeys at real viewport widths (phone 390, tablet 768 and 1024, desktop 1440), with open dialogs.
#   bash tools/harness/uicheck.sh
# Each width runs the prototype in an iframe of exactly that width (a headless window can't be made narrower than its minimum).
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
page ui-run "<script src=\"file:///$HW/uicheck.js\"></script>"
WIDTHS=(390 768 1024 1440)
{ printf '<!doctype html><html><body style="margin:0">'
  for w in "${WIDTHS[@]}"; do printf '<iframe src="file:///%s/ui-run.html" style="border:0;width:%spx;height:900px;display:block"></iframe>' "$OUTW" "$w"; done
  printf '<script>const R=[];let n=0;addEventListener("message",e=>{if(!e.data||!e.data.uicheck)return;R.push(...e.data.uicheck);if(++n===%s){const p=document.createElement("pre");p.id="ui-out";p.textContent=R.join("\\n");document.body.appendChild(p);}});</script></body></html>' "${#WIDTHS[@]}"; } > "$OUT/ui-check.html"
s=$(date +%s); prof="$OUT/profile-ui"; rm -rf "$prof" 2>/dev/null
timeout 300 "$EDGE" --headless=new --disable-gpu --no-first-run --no-default-browser-check --user-data-dir="$OUTW/profile-ui" --allow-file-access-from-files \
  --window-size=1500,900 --virtual-time-budget=120000 --dump-dom "file:///$OUTW/ui-check.html" 2>/dev/null > "$OUT/ui-check.dom.html"
rm -rf "$prof" 2>/dev/null
pre "$OUT/ui-check.dom.html" ui-out > "$OUT/uicheck.txt"
if [ ! -s "$OUT/uicheck.txt" ]; then echo "uicheck: NO OUTPUT ($(( $(date +%s) - s ))s)"; exit 1; fi
p=$(grep -c '^PASS' "$OUT/uicheck.txt"); f=$(grep -c '^FAIL' "$OUT/uicheck.txt")
echo "uicheck (390 / 768 / 1024 / 1440, dialogs open): $p pass / $f fail ($(( $(date +%s) - s ))s)"; grep '^FAIL' "$OUT/uicheck.txt" | sed 's/^/    /'
[ "$f" -eq 0 ]
