#!/bin/bash
# Full regression: every suite (the 17 Demo Scenarios step by step are in ft-scen.js), then the crawl at 1440 / 1024 / 390.
#   bash tools/harness/regress.sh [label]
D="$(dirname "${BASH_SOURCE[0]}")"
echo "== Suites"; bash "$D/suites.sh"; a=$?
echo "== Crawl";  bash "$D/crawl.sh" "${1:-run}"; b=$?
[ $a -eq 0 ] && [ $b -eq 0 ] && echo "== ALL PASSED" || echo "== FAILURES ABOVE"
