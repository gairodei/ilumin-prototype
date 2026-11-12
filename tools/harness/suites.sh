#!/bin/bash
# Run the test suites, one after another.
#   bash tools/harness/suites.sh              → every suite in tools/harness/suites/
#   bash tools/harness/suites.sh ft-scen.js   → one or more named suites
# Prints one summary line per suite, then every FAIL line. Full output: tools/harness/out/<suite>.txt
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
LIST=("$@"); [ ${#LIST[@]} -eq 0 ] && LIST=(ft-boot.js ftest0.js ftest0b.js ft-g2.js ft-g14.js ft-g58.js ft-g912.js ft-rec.js ft-scen.js ft-fu.js ft-tc.js ft-defects.js ft-phase2.js ft-phase3.js ft-phase4.js ft-phase5.js ft-phase5b.js ft-clientsheet.js ft-ch.js ft-setup.js ft-r.js ft-e1.js ft-e2.js ft-n5a.js ft-w0.js ft-w1.js ft-nav.js ft-cb.js ft-cb2.js ft-cb3.js ft-cb4.js ft-cb5.js ft-cb6.js ft-cb7.js ft-cb8.js ft-cb9.js ft-cb10.js ft-cb11.js ft-cb12.js ft-cbf.js ft-d1.js ft-d2.js ft-d1f.js ft-ea.js ft-eb.js ft-f.js ft-m.js ft-mc.js ft-cr.js ft-dm.js ft-dml.js ft-cd.js ft-fx.js ft-fp.js ft-dr.js ft-lp.js ft-dp.js ft-cf.js ft-ar.js ft-av.js ft-fi.js ft-fi2.js ft-ac1.js ft-fc.js ft-fcd.js ft-fcp.js ft-fd.js ft-ac2.js ft-ac2p.js ft-ac3.js ft-mrg1.js ft-mrg2.js ft-mrg3.js ft-mrr.js ft-ta1.js ft-co1.js ft-ag1.js ft-obs1.js ft-obs1b.js ft-cbx.js ft-aa1.js ft-aaf-a.js ft-aaf-b.js ft-aaf-c.js ft-aaf-d.js ft-aaf-e.js ft-aafu.js ft-sa-a.js ft-sa-b.js ft-sa-c.js ft-sa-d.js ft-sa-e.js ft-sa-safety.js ft-sib-a.js ft-sib-b.js ft-sib-c.js ft-iqb.js ft-iqbc.js ft-iqbs.js ft-nb1.js ft-cbr.js ft-cbr2.js ft-cbr-save.js ft-cbc1.js ft-cbc1c.js ft-sec1.js ft-sec1c.js ft-cbc2.js ft-cbc2c.js ft-cbc3.js ft-cbc3c.js ft-cbc4.js ft-cbc4c.js ft-cma.js ft-cmac.js ft-cmad.js ft-nosub.js ft-nosubc.js ft-pds.js ft-pdsc.js ft-pdsi.js ft-l3a.js ft-l3b.js ft-l3c.js ft-l3c2.js ft-l3d.js ft-l3t.js ft-fb1.js ft-fb1c.js ft-fb2.js ft-fb2c.js ft-p1.js ft-p1c.js ft-p2.js ft-p2c.js ft-p3.js ft-p3c.js ft-p4.js ft-p4c.js ft-p5.js ft-p5c.js ft-p6.js ft-p6c.js ft-p7.js ft-p7c.js ft-p8.js ft-p8c.js ft-p8r.js ft-p9.js ft-p9c.js)
TOTAL_FAIL=0
for t in "${LIST[@]}"; do
  [ -f "$H/suites/$t" ] || { echo "$t: suite file not found"; TOTAL_FAIL=1; continue; }
  n="ft-${t%.js}"; s=$(date +%s)
  FIXTURE=legacy; case "$t" in ft-fx.js|ft-dr.js|ft-lp.js|ft-dp.js|ft-cf.js|ft-ar.js|ft-fi.js|ft-fi2.js|ft-ac1.js|ft-fc.js|ft-fcd.js|ft-fcp.js|ft-fd.js|ft-ac2.js|ft-ac2p.js|ft-ac3.js|ft-mrg1.js|ft-mrg2.js|ft-mrg3.js|ft-mrr.js|ft-ta1.js|ft-co1.js|ft-ag1.js|ft-obs1.js|ft-obs1b.js|ft-aa1.js|ft-aaf-a.js|ft-aaf-b.js|ft-aaf-c.js|ft-aaf-d.js|ft-aaf-e.js|ft-aafu.js|ft-sa-a.js|ft-sa-b.js|ft-sa-c.js|ft-sa-d.js|ft-sa-e.js|ft-sa-safety.js|ft-sib-a.js|ft-sib-b.js|ft-sib-c.js|ft-iqb.js|ft-iqbc.js|ft-iqbs.js|ft-nb1.js|ft-cbr-save.js|ft-cbc1c.js|ft-sec1c.js|ft-cbc2c.js|ft-cbc3c.js|ft-cbc4c.js|ft-cmac.js|ft-cmad.js|ft-nosubc.js|ft-pdsc.js|ft-pdsi.js|ft-l3a.js|ft-l3b.js|ft-l3c.js|ft-l3c2.js|ft-l3d.js|ft-l3t.js|ft-fb1c.js|ft-fb2c.js|ft-p1c.js|ft-p2c.js|ft-p3c.js|ft-p4c.js|ft-p5c.js|ft-p6c.js|ft-p7c.js|ft-p8c.js|ft-p8r.js|ft-p9c.js) FIXTURE=client;; esac # FX, DR, LP: these suites boot the client demo dataset, as a fresh browser does
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
