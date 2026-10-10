#!/bin/bash
# Crawl cost: another version against the working copy, plus the working copy without js/ds.js (1440px only).
#   bash tools/harness/profile.sh [git-ref | folder]      default ref: pre-ux-pass (the prototype before P0)
# Prints, per version: wall time, summed in-page render time, average DOM nodes per page, and the 8 slowest routes.
# Then the routes whose render time grew most compared with the first version.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
REF="${1:-pre-ux-pass}"; P="$OUT/prof"; rm -rf "$P"; mkdir -p "$P/ref" "$P/nods"
if [ -d "$REF" ]; then cp -r "$REF"/. "$P/ref/"; else git -C "$ROOT" archive "$REF" | tar -x -C "$P/ref" || { echo "Unknown ref or folder: $REF"; exit 2; }; fi
# Working copy without ds.js
(cd "$ROOT" && cp -r index.html styles.css js "$P/nods/") && sed -i '/js\/ds\.js/d' "$P/nods/index.html"
run() { local label="$1" dir="$2" s; s=$(date +%s); PROTO="$dir" WIDTHS="1440:desktop:1440" bash "$H/crawl.sh" "prof-$label" > "$P/$label.txt" 2>&1; echo "$(( $(date +%s) - s ))" > "$P/$label.wall"; }
run ref "$P/ref"; run now "$ROOT"; run nods "$P/nods"
node - "$OUT" "$REF" <<'EOF'
const fs = require('fs'), [out, ref] = process.argv.slice(2);
const load = l => { try { return JSON.parse(fs.readFileSync(`${out}/crawl-prof-${l}-1440.json`, 'utf8')).snaps; } catch (e) { return null; } };
const wall = l => (fs.readFileSync(`${out}/prof/${l}.wall`, 'utf8') || '').trim();
const V = [['ref', `${ref}`], ['now', 'working copy'], ['nods', 'working copy without ds.js']];
const data = {};
V.forEach(([l, name]) => {
  const s = load(l); data[l] = s;
  if (!s) { console.log(`${name}: NO OUTPUT — see tools/harness/out/prof/${l}.txt`); return; }
  const ms = s.reduce((a, x) => a + (x.ms || 0), 0), nodes = s.reduce((a, x) => a + (x.nodes || 0), 0) / s.length;
  console.log(`${name.padEnd(28)} wall ${wall(l).padStart(4)}s · render ${(ms / 1000).toFixed(1).padStart(6)}s over ${s.length} pages · ${nodes.toFixed(0)} DOM nodes/page`);
  s.slice().sort((a, b) => (b.ms || 0) - (a.ms || 0)).slice(0, 8).forEach(x => console.log(`      ${String(x.ms).padStart(8)} ms  ${x.role} · ${x.tok}`));
});
if (data.ref && data.now) {
  const key = x => x.role + '|' + x.tok, r = new Map(data.ref.map(x => [key(x), x]));
  const grew = data.now.filter(x => r.has(key(x))).map(x => ({ x, d: (x.ms || 0) - (r.get(key(x)).ms || 0), n: (x.nodes || 0) - (r.get(key(x)).nodes || 0) })).sort((a, b) => b.d - a.d).slice(0, 12);
  console.log('Biggest increases (working copy vs ' + ref + '):');
  grew.forEach(g => console.log(`      +${g.d.toFixed(1).padStart(7)} ms  ${(g.n >= 0 ? '+' : '') + g.n} nodes  ${g.x.role} · ${g.x.tok}`));
}
if (data.ref && data.ref.every(x => !x.ms)) console.log('Note: in-page times are 0 — Edge\'s virtual time froze performance.now(); compare wall times and DOM nodes instead.');
EOF
