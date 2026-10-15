#!/bin/bash
# Full regression: every suite (the Demo Scenarios step by step are in ft-scen.js), the crawl at 1440 / 1024 / 390, then the UI check
# (clickable R1–R5 journeys with dialogs open, in real 390 / 768 / 1024 / 1440 viewports).
#   bash tools/harness/regress.sh [label]
D="$(dirname "${BASH_SOURCE[0]}")"
echo "== Suites"; bash "$D/suites.sh"; a=$?
echo "== Crawl";  bash "$D/crawl.sh" "${1:-run}"; b=$?
echo "== UI check"; bash "$D/uicheck.sh"; c=$?
[ $a -eq 0 ] && [ $b -eq 0 ] && [ $c -eq 0 ] && echo "== ALL PASSED" || echo "== FAILURES ABOVE"
