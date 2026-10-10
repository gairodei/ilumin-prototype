#!/bin/bash
# Crawl every role's screens (sidebar routes, tabs, first detail page, every Demo Scenario step) at three widths.
#   bash tools/harness/crawl.sh [label]
# 1440 and 1024 are desktop windows; "390" is the prototype's phone frame (S.frame = 'mobile'), as in every earlier run.
# Prints one line per width. Full JSON: tools/harness/out/crawl-<label>-<width>.json
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
L="${1:-run}"; BAD=0
for spec in ${WIDTHS:-1440:desktop:1440 1024:desktop:1024 1440:mobile:390}; do
  IFS=: read -r W F TAG <<< "$spec"
  n="crawl-$L-$TAG"; s=$(date +%s)
  page "$n" "<script>window.__FRAME='$F';</script><script src=\"file:///$HW/regress.js\"></script>"
  rc=$(edge "$n" "$W" 60000 600)
  pre "$OUT/$n.dom.html" crawl-out > "$OUT/$n.json"
  if [ ! -s "$OUT/$n.json" ]; then echo "$L-$TAG: NO OUTPUT (edge exit $rc$([ "$rc" = 124 ] && echo ' = timed out'), dom $(wc -c < "$OUT/$n.dom.html") bytes, $(( $(date +%s) - s ))s)"; BAD=1; continue; fi
  node -e 'const o=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")),s=o.snaps,c=k=>s.filter(k).length;const bad=c(x=>x.err)+c(x=>x.cerr.length)+c(x=>x.over)+c(x=>x.dead.length)+c(x=>x.redirected)+c(x=>x.floor)+c(x=>x.h1n!==undefined&&x.h1n!==1)+c(x=>x.notip&&x.notip.length)+o.errors.length;console.log(process.argv[2],"snaps",s.length,"err",c(x=>x.err),"cerr",c(x=>x.cerr.length),"overflow",c(x=>x.over),"dead",c(x=>x.dead.length),"redir",c(x=>x.redirected),"floor",c(x=>x.floor),"tpl",c(x=>x.h1n!==undefined&&x.h1n!==1),"notip",c(x=>x.notip&&x.notip.length),"enterErr",o.errors.length,"("+process.argv[3]+"s)");s.filter(x=>x.err||x.cerr.length||x.over||x.dead.length||x.redirected||x.floor||(x.h1n!==undefined&&x.h1n!==1)||(x.notip&&x.notip.length)).slice(0,15).forEach(x=>console.log("    ",x.role,x.tok,x.err||"",x.cerr.join(" | "),x.over?"overflow "+x.over+(x.wide&&x.wide.length?" ← "+x.wide.join(" | "):""):"",x.dead.length?"dead "+x.dead.join(","):"",x.redirected?"redirected to "+x.redirected:"",x.floor?"contains \"floor\"":"",x.h1n!==undefined&&x.h1n!==1?"headings "+x.h1n+" (want 1)":"",x.notip&&x.notip.length?"disabled without reason: "+x.notip.join(","):""));o.errors.forEach(e=>console.log("     enter error:",e));process.exit(bad?1:0)' "$OUT/$n.json" "$L-$TAG" "$(( $(date +%s) - s ))" || BAD=1
done
exit $BAD
