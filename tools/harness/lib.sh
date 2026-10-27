#!/bin/bash
# Shared helpers for the regression harness (Git Bash on Windows, headless Microsoft Edge).
# Paths are resolved from this folder, so the harness works wherever the project lives.
H="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
winpath() { (cd "$1" && (pwd -W 2>/dev/null || cygpath -m "$(pwd)" 2>/dev/null || pwd)); }
HW="$(winpath "$H")"                 # C:/…/tools/harness
ROOT="${PROTO:-$(cd "$H/../.." && pwd)}"   # PROTO=<folder> loads another copy of the prototype (profile.sh)
ROOTW="$(winpath "$ROOT")"           # C:/…/ilum
OUT="$H/out"; OUTW="$HW/out"; mkdir -p "$OUT"
EDGE="${EDGE:-/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe}"
[ -x "$EDGE" ] || { echo "Edge not found at: $EDGE  (set EDGE=/path/to/msedge.exe)"; exit 2; }

# page <name> <html injected after App.boot()>  → out/<name>.html (the prototype, loaded from the project, plus the test script)
# FX: the suites run on the full legacy test data (window.ILM_FIXTURE = 'legacy', set before App.boot); FIXTURE=client boots the
# client demo dataset instead, as a fresh browser does.
page() {
  sed -e "s#href=\"styles.css\"#href=\"file:///$ROOTW/styles.css\"#" \
      -e "s#src=\"js/#src=\"file:///$ROOTW/js/#" \
      -e "s#<script>App.boot();</script>#<script>window.ILM_FIXTURE='${FIXTURE:-legacy}';</script><script>App.boot();</script>$2#" \
      "$ROOT/index.html" > "$OUT/$1.html"
}

# edge <name> <window width> <virtual-time budget ms> <timeout s>  → out/<name>.dom.html; prints Edge's exit code
# Each run gets its own throw-away profile, so a lingering Edge process from the previous run can't swallow this launch.
edge() {
  local prof="$OUT/profile-$1"; rm -rf "$prof" 2>/dev/null
  timeout "$4" "$EDGE" --headless=new --disable-gpu --no-first-run --no-default-browser-check \
    --user-data-dir="$OUTW/profile-$1" --allow-file-access-from-files \
    --window-size="$2",900 --virtual-time-budget="$3" \
    --dump-dom "file:///$OUTW/$1.html" 2>/dev/null > "$OUT/$1.dom.html"
  local rc=$?; rm -rf "$prof" 2>/dev/null; echo "$rc"
}

# pre <dom file> <pre id>  → prints the unescaped text of <pre id="…"> (empty if missing)
pre() {
  node -e 'const fs=require("fs");const h=fs.readFileSync(process.argv[1],"utf8");const m=h.match(new RegExp("<pre id=\""+process.argv[2]+"\">([\\s\\S]*?)</pre>"));if(m)process.stdout.write(m[1].replace(/&quot;/g,"\"").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&"))' "$1" "$2"
}
