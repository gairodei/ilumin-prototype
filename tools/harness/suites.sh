#!/bin/bash
# Run the test suites, one after another.
#   bash tools/harness/suites.sh              → every suite in tools/harness/suites/
#   bash tools/harness/suites.sh ft-scen.js   → one or more named suites
# Prints one summary line per suite, then every FAIL line. Full output: tools/harness/out/<suite>.txt
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
LIST=("$@"); [ ${#LIST[@]} -eq 0 ] && LIST=(ft-boot.js ftest0.js ftest0b.js ft-g2.js ft-g14.js ft-g58.js ft-g912.js ft-rec.js ft-scen.js ft-fu.js ft-tc.js ft-defects.js ft-phase2.js ft-phase3.js ft-phase4.js ft-phase5.js ft-phase5b.js ft-clientsheet.js ft-ch.js ft-setup.js ft-r.js ft-e1.js ft-e2.js ft-n5a.js ft-w0.js ft-w1.js ft-nav.js ft-cb.js ft-cb2.js ft-cb3.js ft-cb4.js ft-cb5.js ft-cb6.js ft-cb7.js ft-cb8.js ft-cb9.js ft-cb10.js ft-cb11.js ft-cb12.js ft-cbf.js ft-d1.js ft-d2.js ft-d1f.js ft-ea.js ft-eb.js ft-f.js ft-m.js ft-mc.js)
TOTAL_FAIL=0
for t in "${LIST[@]}"; do
  [ -f "$H/suites/$t" ] || { echo "$t: suite file not found"; TOTAL_FAIL=1; continue; }
  n="ft-${t%.js}"; s=$(date +%s)
  page "$n" "<script src=\"file:///$HW/suites/$t\"></script>"
  rc=$(edge "$n" 1440 180000 600)
  pre "$OUT/$n.dom.html" ft-out > "$OUT/${t%.js}.txt"
  if [ ! -s "$OUT/${t%.js}.txt" ]; then echo "$t: NO OUTPUT (edge exit $rc$([ "$rc" = 124 ] && echo ' = timed out'), dom $(wc -c < "$OUT/$n.dom.html") bytes, $(( $(date +%s) - s ))s)"; TOTAL_FAIL=1; continue; fi
  p=$(grep -c '^PASS' "$OUT/${t%.js}.txt"); f=$(grep -c '^FAIL' "$OUT/${t%.js}.txt")
  echo "$t: $p pass / $f fail ($(( $(date +%s) - s ))s)"
  grep '^FAIL' "$OUT/${t%.js}.txt" | sed 's/^/    /'
  [ "$f" -gt 0 ] && TOTAL_FAIL=1
done
exit $TOTAL_FAIL
