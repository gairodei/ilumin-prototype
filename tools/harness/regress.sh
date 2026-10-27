#!/bin/bash
# Full regression: every suite (the Demo Scenarios step by step are in ft-scen.js), the crawl at 1440 / 1024 / 390, then the UI check
# (clickable R1–R5 journeys with dialogs open, in real 390 / 768 / 1024 / 1440 viewports).
# FX: the suites, the first crawl and the UI check run on the full legacy test data (the harness pins it); the second crawl boots the
# client demo dataset, as a fresh browser does (FIXTURE=client), and ft-fx.js checks that dataset.
#   bash tools/harness/regress.sh [label]
D="$(dirname "${BASH_SOURCE[0]}")"
echo "== Suites"; bash "$D/suites.sh"; a=$?
echo "== Crawl (legacy test data)";  bash "$D/crawl.sh" "${1:-run}"; b=$?
echo "== Crawl (client demo data)";  FIXTURE=client bash "$D/crawl.sh" "${1:-run}-client"; d=$?
echo "== UI check"; bash "$D/uicheck.sh"; c=$?
[ $a -eq 0 ] && [ $b -eq 0 ] && [ $c -eq 0 ] && [ $d -eq 0 ] && echo "== ALL PASSED" || echo "== FAILURES ABOVE"
