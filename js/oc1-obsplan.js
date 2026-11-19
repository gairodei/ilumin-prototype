/* ============================================================
   OC1 — Observation configuration, curriculum mapping and multiple visits (18 Nov 2026; PD-OC1-* in PROVISIONAL-DECISIONS.md).
   Loads last. Reuses the existing model end to end — no second criterion model, no new store:
     Curriculum (Unit → Module → Learning Outcome → criteria; a criterion inherits its LO's assessment type)
     → the version's observation configuration (N5a) with its Required Observations (CB6/CBC2) — these ARE the reusable
       observation plans: a name, the permitted locations, any NVQ observation criteria from any unit/module, the evidence types
     → per learner: the Coordinator's location choice (D1) → workplace permission / Academy-office approval (CH-37)
     → visits proposed by the observation assessor → the Observation Book / record → sign-off (lock) → competency record.
   What OC1 adds:
   - Builder: an NVQ observation-coverage map grouped Unit → Module → LO (every criterion and the plans that cover it); the plan
     dialog groups its criteria the same way and can narrow the plan's Academy observation categories (workplace visits); each plan
     row previews its coverage. Academy categories keep their Category → criteria hierarchy.
   - Academy office = NVQ criteria only (FR-ADM-20-07, OC1_OFFICE_NVQ_ONLY): Academy-defined criteria are excluded from Academy-office
     visits without being removed from the plan or from any published snapshot.
   - Visits: each visit has its own scope (chosen in the proposal dialog from the learner's own version, checked in the handler), and
     a Completed observation with outstanding criteria offers a follow-up visit limited to those criteria. Earlier signed visits are
     never changed; a criterion already Achieved (locked) is never downgraded by a later visit; each result is kept in the criterion's
     visit history.
   - Observation Book and record: criteria grouped Unit → Module → LO, Academy criteria grouped by category; visits numbered with
     their record ID and follow-up link.
   - Demo controls → "Load observation planning examples".
   ============================================================ */
'use strict';

// PD-OC1-08: Academy-office observations assess NVQ criteria only — accepted SRS requirement FR-ADM-20-07, confirmed 7 Oct 2026
// (REF-14). It supersedes the conflicting OBS-1 behaviour (office library criteria) for visits proposed with a visit scope; signed
// records and published snapshots are not rewritten. Kept as one named constant so every place the rule applies is easy to find.
const OC1_OFFICE_NVQ_ONLY = true;
const OC1_FROM = '18 Nov 2026';
const oc1J = JSON.stringify;
const oc1Uniq = a => Array.from(new Set(a));
const oc1CatCode = id => { const c = typeof ol1Cat === 'function' ? ol1Cat(id) : null; return c ? c.code : String(id); };

/* ---------- Hierarchy: Unit → Module → Learning Outcome → criterion (tree order) ---------- */
function oc1Groups(tree, codes) {
  const want = new Set(codes), seen = new Set(), out = [];
  (tree || []).forEach(u => (u.mods || []).forEach(m => (m.los || []).forEach(lo => {
    const cs = (lo.crit || []).filter(c => want.has(c.code) && !seen.has(c.code)); cs.forEach(c => seen.add(c.code));
    if (cs.length) out.push({ u, m, lo, crit: cs });
  })));
  const rest = codes.filter(c => !seen.has(c)); if (rest.length) out.push({ u: null, m: null, lo: null, crit: rest.map(code => ({ code, d: '' })) });
  return out;
}
function oc1Nest(groups) {
  const us = [];
  groups.forEach(g => { let U = us.find(x => x.u === g.u); if (!U) us.push(U = { u: g.u, ms: [] }); let M = U.ms.find(x => x.m === g.m); if (!M) U.ms.push(M = { m: g.m, los: [] }); M.los.push({ lo: g.lo, crit: g.crit }); });
  return us;
}
// row(c, lo, m, u) → the markup of one criterion; list: the element that holds the rows ('ul' by default)
function oc1GroupHtml(groups, row, list) {
  const L = list || 'ul';
  return oc1Nest(groups).map(U => `<div class="oc1-u" data-u="${esc(U.u ? U.u.code : '')}"><div class="oc1-uh">${U.u ? `Unit ${esc(U.u.code)} — ${esc(U.u.title || '')}` : 'Other criteria'}</div>${U.ms.map(M => `<div class="oc1-m" data-m="${esc(M.m ? M.m.code : '')}">${M.m ? `<div class="oc1-mh">Module ${esc(M.m.code)} — ${esc(M.m.title || '')}</div>` : ''}${M.los.map(Lo => `<div class="oc1-lo" data-lo="${esc(Lo.lo ? Lo.lo.code : '')}">${Lo.lo ? `<div class="oc1-loh">${esc(Lo.lo.code)} — ${esc(Lo.lo.title || '')} <span class="xs muted">(${esc(Lo.lo.type || '—')})</span></div>` : ''}<${L} class="oc1-cl">${Lo.crit.map(c => row(c, Lo.lo, M.m, U.u)).join('')}</${L}></div>`).join('')}</div>`).join('')}</div>`).join('');
}
// "U001 › M1: 001 2.1, 001 2.2 · U002 › M1: 002 1.1" — a compact line for lists
const oc1ScopeTxt = (tree, codes) => oc1Nest(oc1Groups(tree, codes)).map(U => U.ms.map(M => `${U.u ? U.u.code : '—'}${M.m ? ' › ' + M.m.code : ''}: ${M.los.flatMap(l => l.crit.map(c => c.code)).join(', ')}`).join(' · ')).join(' · ');
const oc1Flat = tree => { const m = {}; (tree || []).forEach(u => (u.mods || []).forEach(md => (md.los || []).forEach(lo => (lo.crit || []).forEach(c => { m[c.code] = c; })))); return m; };
// The structure a configuration belongs to: the draft's while editing, the published version's otherwise
const oc1CfgTree = (pr, d) => (!d ? [] : d.state === 'Draft' ? n5DraftTree(pr) : (s3PubTree(pr, d.v) || []));

/* ---------- Academy categories (library) of a configuration and of a plan ---------- */
const oc1WpItems = d => (!d ? [] : d.state === 'Draft' ? ((typeof ol1Resolve === 'function' ? ol1Resolve(d, 'wp').items : []) || []) : ((d.ol1snap && d.ol1snap.wp) || []));
function oc1ByCat(items) {
  const out = []; (items || []).forEach(i => { let g = out.find(x => x.cat === i.cat); if (!g) out.push(g = { cat: i.cat, catCode: i.catCode, catName: i.catName, catV: i.catV, items: [] }); g.items.push(i); });
  return out;
}
// The categories a plan uses on workplace visits: its own choice when it made one, otherwise every workplace category (PD-OBS1-12)
const oc1PlanCats = (items, e) => { const all = oc1Uniq((items || []).map(i => i.cat)); return Array.isArray(e && e.acad) ? e.acad.filter(c => all.includes(c)) : all; };
const oc1PlanCatTxt = (items, e) => (Array.isArray(e.acad) ? (e.acad.length ? e.acad.map(oc1CatCode).join(', ') : 'none') : (oc1ByCat(items).length ? 'all workplace categories (' + oc1ByCat(items).map(g => g.catCode).join(', ') + ')' : 'none selected for workplace observations'));

/* ============================================================ BUILDER ============================================================ */
/* ---------- 1. The plan (Required Observation) dialog: grouped criteria, Academy categories ---------- */
const _evOC1 = ACT.cbObsEv;
ACT.cbObsEv = el => {
  const m0 = MODAL, r = _evOC1(el); if (!MODAL || MODAL === m0 || !/Required Observation/.test(MODAL.title || '')) return r;
  const pr = s3Pr(el.dataset.p) || (typeof cbPr === 'function' ? cbPr(el.dataset.p) : null), d = pr && N5().draft[pr.id]; if (!pr || !d) return r;
  const evs = cbEvOf(d), e0 = el.dataset.e ? evs.find(x => x.id === el.dataset.e) : null, cur = new Set(e0 ? e0.crit : []), tree = n5DraftTree(pr), nvq = n5NvqOk(pr, d);
  // the qualification criteria, grouped by unit → module → learning outcome (the same .ev-c boxes and values)
  const box = c => `<li><label class="check"><input type="checkbox" class="ev-c" value="${esc(c.code)}" ${cur.has(c.code) ? 'checked' : ''}><span><span class="code">${esc(c.code)}</span> ${esc(c.d || '')}</span></label></li>`;
  const qual = nvq.length ? `<fieldset class="field n5-fs oc1-evq"><legend class="lbl">Qualification criteria</legend><p class="xs muted">Observation / Competency criteria of this version, from any unit or module. One plan may cover several modules; a visit may also combine plans.</p>${oc1GroupHtml(oc1Groups(tree, nvq.map(c => c.code)), box)}</fieldset>` : null;
  let body = MODAL.body;
  if (qual) body = body.replace(/<fieldset class="field n5-fs"><legend class="lbl">Qualification criteria<\/legend>[\s\S]*?<\/fieldset>/, qual);
  const items = oc1WpItems(d), groups = oc1ByCat(items);
  if (groups.length) {
    const on = new Set(oc1PlanCats(items, e0 || {}));
    const cats = `<fieldset class="field n5-fs oc1-evcats"><legend class="lbl">Academy observation categories (workplace visits)</legend>${groups.map(g => `<div class="oc1-cat" data-k="${esc(g.cat)}"><label class="check"><input type="checkbox" class="oc1-ev-cat" value="${esc(g.cat)}" ${on.has(g.cat) ? 'checked' : ''}><span><strong><span class="code">${esc(g.catCode)}</span> ${esc(g.catName || '')}</strong></span></label><ul class="oc1-catl xs">${g.items.map(i => `<li data-code="${esc(i.code)}"><span class="code">${esc(i.code)}</span> ${esc(i.title)}</li>`).join('')}</ul></div>`).join('')}<span class="hint">From the categories selected for Workplace Observation. Academy-office visits assess NVQ criteria only — these categories stay in the plan for its workplace visits.</span></fieldset>`;
    body = body.replace('<fieldset class="field n5-fs"><legend class="lbl">Permitted evidence</legend>', cats + '<fieldset class="field n5-fs"><legend class="lbl">Permitted evidence</legend>');
  }
  if (body !== MODAL.body) { MODAL.body = body; renderModal(); }
  const a = MODAL.actions.find(x => /primary/.test(x.cls || '')); if (!a || a._oc1) return r; const f = a.fn; a._oc1 = true;
  a.fn = (...x) => {
    const pick = c => $$('#modal-root .' + c + ':checked').map(i => i.value), locs = pick('ev-l'), cats = pick('oc1-ev-cat'), allC = groups.map(g => g.cat);
    // all categories ticked = "every workplace category" (kept as before: the plan follows the workplace selection). A plan with no
    // workplace visits uses no Academy categories, whatever is ticked (nothing to choose: they are workplace-only)
    const acad = !groups.length || !locs.includes('workplace') ? undefined : (cats.length === allC.length ? undefined : cats);
    const nx = { name: mval('#ev-n'), loc: locs, crit: pick('ev-c'), ev: pick('ev-e') };
    if (e0 && oc1J(nx) === oc1J({ name: e0.name, loc: e0.loc, crit: e0.crit, ev: e0.ev }) && oc1J(e0.acad) !== oc1J(acad)) {
      if (!n5CanEdit() || n5DraftV(pr) !== d.v) return n5Lost({ pr, d });
      const was = oc1PlanCatTxt(items, e0); if (acad === undefined) delete e0.acad; else e0.acad = acad;
      n5Log(pr, 'Required Observation Academy categories changed', `${e0.name}: ${was}`, `${e0.name}: ${oc1PlanCatTxt(items, e0)}`, `Version ${d.v} (draft)`); render(); toast('Saved.'); return undefined;
    }
    const n0 = evs.length, res = f(...x); if (res === false) return res;
    const tgt = e0 || (evs.length > n0 ? evs[evs.length - 1] : null);
    if (tgt && oc1J(tgt.acad) !== oc1J(acad)) { const was = e0 ? oc1PlanCatTxt(items, tgt) : '—'; if (acad === undefined) delete tgt.acad; else tgt.acad = acad; n5Log(pr, 'Required Observation Academy categories set', was, `${tgt.name}: ${oc1PlanCatTxt(items, tgt)}`, `Version ${d.v} (draft)`); render(); }
    return res;
  };
  return r;
};

/* ---------- 2. Publishing checks for plans' Academy categories ---------- */
const _probOC1 = cbEvProblems;
cbEvProblems = function (pr, d) {
  const r = _probOC1.apply(this, arguments); if (!d || d.state !== 'Draft' || d.required !== true) return r;
  const items = oc1WpItems(d), all = oc1Uniq(items.map(i => i.cat));
  cbEvOf(d).forEach(e => {
    if (!Array.isArray(e.acad)) return;
    const gone = e.acad.filter(c => !all.includes(c)); if (gone.length) r.block.push(`Observations: "${e.name}" uses Academy categories that aren't selected for Workplace Observation: ${gone.map(oc1CatCode).join(', ')}`);
    if (e.acad.length && !(e.loc || []).includes('workplace')) r.block.push(`Observations: "${e.name}" has Academy categories but no workplace visits (Academy categories are used at the workplace only)`);
  });
  const evs = cbEvOf(d), used = new Set(evs.flatMap(e => oc1PlanCats(items, e).filter(() => (e.loc || []).includes('workplace'))));
  const unused = all.filter(c => !used.has(c)); if (evs.length && unused.length) r.warn.push(`Observations: Academy categories selected for Workplace Observation but not used by any Required Observation: ${unused.map(oc1CatCode).join(', ')}`);
  return r;
};
// Office selections are no longer used on visits (PD-OC1-08): their problems can't block publication any more (kept as warnings)
if (OC1_OFFICE_NVQ_ONLY && typeof ol1Problems === 'function') {
  const _olpOC1 = ol1Problems;
  ol1Problems = function () { const r = _olpOC1.apply(this, arguments), off = m => /Academy Observation Criteria —|Academy Observation Criteria were set/.test(m); r.warn.push(...r.block.filter(off).map(m => m + ' (not used: Academy-office visits assess NVQ criteria only)')); r.block = r.block.filter(m => !off(m)); return r; };
}

/* ---------- 3. Step 4: the NVQ coverage map, the Academy categories heading, the office column, plan previews ---------- */
function oc1Coverage(pr, d) {
  const nvq = n5NvqOk(pr, d); if (!nvq.length) return '';
  const evs = cbEvOf(d), tree = oc1CfgTree(pr, d), plans = code => evs.filter(e => e.crit.includes(code));
  const n = nvq.filter(c => plans(c.code).length).length, all = n === nvq.length;
  const row = c => { const p = plans(c.code); return `<li class="oc1-cov" data-code="${esc(c.code)}" data-n="${p.length}"><span><span class="code">${esc(c.code)}</span> ${esc(c.d || '')}</span><span class="oc1-covp">${p.length ? p.map(e => chip(e.name, 'blue')).join(' ') : chip('Not in any Required Observation', 'red')}</span></li>`; };
  return `<section class="card oc1-covs" data-p="${esc(pr.id)}"><div class="row-b"><h3>NVQ observation coverage</h3>${chip(`${n} of ${nvq.length} covered`, all ? 'green' : 'red')}</div>
    <p class="xs muted">The Observation / Competency criteria of Version ${d.v}, grouped by unit, module and learning outcome, and the Required Observations (observation plans) that cover each. Change the criteria in Curriculum &amp; Outcomes; change the plans below.${all ? '' : ' Every criterion must be in a Required Observation before publishing.'}</p>
    ${oc1GroupHtml(oc1Groups(tree, nvq.map(c => c.code)), row)}</section>`;
}
const _obsOC1 = cbr2Obs;
cbr2Obs = function (pr) {
  let h = _obsOC1.apply(this, arguments); const d = n5CanView() ? n5Shown(pr) : null; if (!d || d.required !== true || typeof h !== 'string') return h;
  h = h.replace('<section class="card cbr-obs cbr2-obs-s">', `<section class="card cbr-obs cbr2-obs-s"><div class="oc1-ach"><h3>Academy observation categories</h3><p class="xs muted">Academy-defined criteria from the Observation Criteria Library, kept under their categories. They are separate from the qualification's NVQ criteria and are assessed on workplace visits only.</p></div>`);
  const cov = oc1Coverage(pr, d), k = h.indexOf('<details class="cbr-fold cbr2-qual"'), k2 = h.indexOf('<div id="cbr-events">');
  const at = k >= 0 ? k : k2; return at >= 0 && cov ? h.slice(0, at) + cov + h.slice(at) : h;
};
const _colOC1 = cbr2ObsCol;
cbr2ObsCol = function (pr, d, loc) {
  let h = _colOC1.apply(this, arguments); if (typeof h !== 'string') return h;
  // a published version's criteria are shown under their categories too (C1: never a flat list); same rows, same classes
  if (d.state !== 'Draft') h = h.replace(/<ul class="cbr2-critro cbr-critl">([\s\S]*?)<\/ul>/, (all, rows) => {
    const items = ol1Resolve(d, loc).items, li = {}; (rows.match(/<li data-c="[^"]*">[\s\S]*?<\/li>/g) || []).forEach(x => { li[(/data-c="([^"]*)"/.exec(x) || [])[1]] = x; });
    const gs = oc1ByCat(items); if (!gs.length || items.some(i => !li[i.id])) return all;
    return gs.map(g => `<div class="cbr2-cat oc1-cat" data-k="${esc(g.cat)}"><strong class="small">Category — ${esc(g.catName || '')} <span class="xs muted"><span class="code">${esc(g.catCode)}</span> v${g.catV}</span></strong><ul class="cbr2-critro cbr-critl">${g.items.map(i => li[i.id]).join('')}</ul></div>`).join('');
  });
  if (loc !== 'off' || !OC1_OFFICE_NVQ_ONLY || d.office !== 'Available') return h;
  const note = `<p class="small oc1-offnote" role="note">${ic('info', 13)} Academy-office visits assess NVQ criteria only — Academy observation categories are not used at the Academy office. A plan's categories stay in the plan for its workplace visits.</p>`;
  if (d.state !== 'Draft') return h.replace('<h4>Categories &amp; Criteria</h4>', note + `<h4>Categories &amp; Criteria</h4><p class="xs muted oc1-offpub">Recorded with Version ${d.v}; not used on Academy-office visits proposed from ${OC1_FROM}.</p>`);
  const a = h.indexOf('<h4>Categories'), g = h.indexOf('<div class="field cbr2-guide">'); if (a < 0 || g < 0) return h;
  const o = ol1Cfg(d), kept = (o.off.add || []).length + (o.off.excl || []).length;
  return h.slice(0, a) + note + (kept ? `<p class="xs muted oc1-offkept">${plural(kept, 'earlier Academy-office selection is', 'earlier Academy-office selections are')} kept with the draft for history and not used.</p>` : '') + h.slice(g);
};
const _reqOC1 = cbr2ReqObs;
cbr2ReqObs = function (pr, d) {
  let h = _reqOC1.apply(this, arguments); if (typeof h !== 'string') return h;
  const tree = oc1CfgTree(pr, d), items = oc1WpItems(d), nvq = new Set(n5NvqOk(pr, d).map(c => c.code));
  cbEvOf(d).forEach(e => {
    const key = `data-e="${esc(e.id)}"><div class="cbr2-ro-b">`, k = h.indexOf(key); if (k < 0) return; const z = h.indexOf('</div>', k + key.length); if (z < 0) return;
    const codes = e.crit.filter(c => nvq.has(c)), wp = (e.loc || []).includes('workplace'), cats = wp ? oc1PlanCats(items, e) : [];
    const prev = `<details class="oc1-roprev"><summary class="xs">Preview coverage</summary><div class="oc1-roprev-b"><div class="xs strong">NVQ criteria</div>${codes.length ? oc1GroupHtml(oc1Groups(tree, codes), c => `<li data-code="${esc(c.code)}"><span class="code">${esc(c.code)}</span> ${esc(c.d || '')}</li>`) : '<p class="xs muted">None.</p>'}<div class="xs strong">Academy categories — workplace visits</div>${cats.length ? oc1ByCat(items.filter(i => cats.includes(i.cat))).map(g => `<div class="oc1-cat" data-k="${esc(g.cat)}"><strong class="xs"><span class="code">${esc(g.catCode)}</span> ${esc(g.catName || '')}</strong><ul class="oc1-catl xs">${g.items.map(i => `<li data-code="${esc(i.code)}"><span class="code">${esc(i.code)}</span> ${esc(i.title)}</li>`).join('')}</ul></div>`).join('') : `<p class="xs muted">${wp ? 'None.' : 'Not at the workplace — none.'}</p>`}${(e.loc || []).includes('office') ? '<p class="xs muted">Academy-office visits of this plan: NVQ criteria only.</p>' : ''}</div></details>`;
    const line = `<span class="xs oc1-ro-sc">${esc(oc1ScopeTxt(tree, codes) || 'No NVQ criteria')} · Academy: ${esc(wp ? oc1PlanCatTxt(items, e) : 'none (not at the workplace)')}</span>`;
    h = h.slice(0, z) + line + prev + h.slice(z);
  });
  return h;
};

/* ---------- 4. Learning Outcome type changes: warned and listed for review (version safety, PD-OC1-02) ---------- */
function oc1TypeChanges(pr) {
  const dv = n5DraftV(pr); if (!dv || !pr.version || dv <= pr.version) return [];
  const pub = s3PubTree(pr, pr.version), draft = n5DraftTree(pr); if (!pub || !draft) return [];
  const out = [];
  draft.forEach(u => (u.mods || []).forEach(m => (m.los || []).forEach(lo => {
    const pu = pub.find(x => x.code === u.code), pm = pu && (pu.mods || []).find(x => x.code === m.code), pl = pm && (pm.los || []).find(x => x.code === lo.code);
    if (pl && pl.type && lo.type && pl.type !== lo.type) out.push({ u: u.code, m: m.code, lo: lo.code, from: pl.type, to: lo.type, crit: (lo.crit || []).filter(c => c.status !== 'Retired').map(c => c.code) });
  })));
  return out;
}
const oc1Pinned = pr => Object.values(STORE.worlds || {}).filter(w => w && w.nvq && w.nvq.progVersion && w.signup && w.signup.prog === pr.id).length;
const _chkOC1 = n5Check;
n5Check = function (pr) {
  const r = _chkOC1.apply(this, arguments); if (!pr) return r;
  oc1TypeChanges(pr).forEach(t => r.review.push(`Review (D5): ${t.u} ${t.m} ${t.lo} changed from ${t.from} to ${t.to} since Version ${pr.version} (criteria ${t.crit.join(', ') || 'none'}). Learners on Version ${pr.version} and earlier keep their version and recorded evidence — nothing is remapped (${plural(oc1Pinned(pr), 'learner')} pinned to a published version). ${critKind(t.to) === 'Observation' ? 'Its criteria must now be in a Required Observation and can no longer be mapped to written assignments.' : 'Its criteria leave observation and must be assessed another way (for example an assignment).'}`));
  return r;
};
const _ltOC1 = INP.ch8LoType;
INP.ch8LoType = el => {
  const pr = ch8Pr(el && el.dataset && el.dataset.id), before = pr ? oc1J(oc1TypeChanges(pr)) : null, res = _ltOC1(el), ch = pr ? oc1TypeChanges(pr) : [];
  if (pr && ch.length && oc1J(ch) !== before) {
    const last = ch.find(x => x.to === el.value) || ch[ch.length - 1];
    logA('NVQ Programmes', `${pr.title} (${pr.id})`, 'Assessment type change flagged for review', `${last.u} ${last.m} ${last.lo}: ${last.from}`, last.to, `Version ${n5DraftV(pr)} (draft) — learners on Version ${pr.version} keep their version and evidence`);
    toast(`${last.u} ${last.m} ${last.lo} now differs from Version ${pr.version} (${last.from} → ${last.to}). Learners on Version ${pr.version} keep it; nothing is remapped. Listed for review before publishing.`, 'info');
  }
  return res;
};

/* ---------- 5. Written assessments never take an Observation / Competency criterion (PD-OC1-13) ----------
   The mapping list offers Knowledge criteria only and whole-assessment mapping already refuses others (CMA), but a per-question
   mapping call accepted an Observation criterion. It is now refused in the handler (logged); unmapping is always allowed. */
const _mapOC1 = INP.mapChange;
INP.mapChange = function (el) {
  const ds = (el && el.dataset) || {}, d = ds.id ? s2Def(ds.id) : null, cr = d && el.checked ? s2Crit(d).find(x => x.code === ds.c) : null;
  if (cr && critKind(cr.typeName || cr.type) === 'Observation') {
    el.checked = false; s2Log(d, 'Blocked: map an observation criterion to a written assessment', '—', ds.c, 'Observation / Competency criteria are assessed through practical observation');
    toast(`${ds.c} is an Observation / Competency criterion — it is assessed through practical observation, not written assignments.`, 'err'); render(); return false;
  }
  return _mapOC1.apply(this, arguments);
};

/* ============================================================ VISITS ============================================================ */
const oc1Ach = (w, code) => { const c = oc1Flat(w.tree)[code]; return !!(c && c.st === 'Achieved'); };
// The criteria still outstanding for one plan, after its signed visits: NVQ criteria of the plan (or assessed on it) not yet Achieved;
// programme Academy criteria and Criteria Library items whose latest result on this plan isn't Observed + Competent / Met
function oc1Outstanding(w, ctx, e) {
  const recs = dRecs(w, ctx, e).filter(o => o.status === 'Completed' && o.report).sort((x, y) => new Date(x.signed || x.at || 0) - new Date(y.signed || y.at || 0)); if (!recs.length) return [];
  const ok = new Set(n5NvqOk(ctx.pr, ctx.cfg).map(c => c.code)), c = dEvCrit(ctx, e), out = [];
  oc1Uniq(c.nvq.concat(recs.flatMap(r => (r.report.nvq || []).map(x => x[0])))).filter(code => ok.has(code) && !oc1Ach(w, code)).forEach(code => out.push({ set: 'nvq', code }));
  const ia = {}; recs.forEach(r => (r.report.ia || []).forEach(x => { ia[x[0]] = x; })); Object.values(ia).forEach(x => { if (!(x[2] && x[3])) out.push({ set: 'ia', code: x[0] }); });
  const lib = {}; recs.forEach(r => (r.report.ol1 || []).forEach(x => { lib[x.id] = x; })); Object.values(lib).forEach(x => { if (x.out !== 'Met') out.push({ set: 'lib', code: x.code, id: x.id, cat: x.cat }); });
  return out;
}
// Is the plan's chosen location still ready for another visit (workplace permission / an approved Academy-office request)?
function oc1LocReady(w, ctx, e) {
  const s = dSel(w, e.id); if (!s) return false;
  if (s.loc === 'workplace') return dPerm(w) === 'Granted';
  const r = dReq(w, e); return !!r && ['Approved', 'Booked'].includes(r.status);
}
// A follow-up can be proposed: the plan is Completed with outstanding criteria that can be observed at its location
function oc1FuReady(w, ctx, e, st) {
  st = st || dState(w, ctx, e); if (!st || st.k !== 'done' || !(st.fu || []).length || !oc1LocReady(w, ctx, e)) return false;
  const office = (dSel(w, e.id) || {}).loc === 'office'; return st.fu.some(x => x.set === 'nvq' || !office);
}
const oc1Snap = ctx => (ctx && ctx.cfg && ctx.cfg.ol1snap) || null;
// The visit scope offered in the proposal dialog
function oc1ScopeDefault(w, ctx, e, loc, fu) {
  const office = loc === 'office', c = dEvCrit(ctx, e), snap = oc1Snap(ctx), wpItems = snap ? snap.wp || [] : [];
  if (fu) { const o = oc1Outstanding(w, ctx, e); return { nvq: o.filter(x => x.set === 'nvq').map(x => x.code), ia: office ? [] : o.filter(x => x.set === 'ia').map(x => x.code), cats: [], lib: office ? [] : o.filter(x => x.set === 'lib').map(x => x.id) }; }
  return { nvq: c.nvq.filter(code => !oc1Ach(w, code)), ia: office ? [] : c.ia.slice(), cats: office && OC1_OFFICE_NVQ_ONLY ? [] : oc1PlanCats(wpItems, e), lib: null };
}
function oc1ScopeHtml(w, ctx, e, loc, fu) {
  const office = loc === 'office', def = oc1ScopeDefault(w, ctx, e, loc, fu), plan = dEvCrit(ctx, e), tree = w.tree || [], flat = oc1Flat(tree);
  const nvqAll = n5NvqOk(ctx.pr, ctx.cfg).map(c => c.code), offer = fu ? def.nvq : nvqAll, dn = new Set(def.nvq);
  const nb = c => { const ach = flat[c.code] && flat[c.code].st === 'Achieved'; return `<li><label class="check"><input type="checkbox" class="oc1-sc-n" value="${esc(c.code)}" ${dn.has(c.code) ? 'checked' : ''}><span><span class="code">${esc(c.code)}</span> ${esc(c.d || '')} ${plan.nvq.includes(c.code) ? '<span class="xs muted">in this plan</span>' : '<span class="xs muted">another plan</span>'}${ach ? ' ' + chip('Achieved', 'green') : flat[c.code] && flat[c.code].st && flat[c.code].st !== 'Not Started' ? ' ' + chip(flat[c.code].st, 'amber') : ''}</span></label></li>`; };
  const nvqH = offer.length ? oc1GroupHtml(oc1Groups(tree, offer), nb) : '<p class="xs muted">No NVQ criteria.</p>';
  let acad = '';
  if (office) acad = `<p class="small oc1-scoff">${ic('info', 13)} Academy office: NVQ criteria only. ${(() => { const n = plan.ia.length + oc1PlanCats((oc1Snap(ctx) || {}).wp || [], e).length; return n ? `This plan's Academy criteria stay in the plan for its workplace visits; they aren't assessed here.` : ''; })()}</p>`;
  else {
    const ia = (ctx.cfg.ia || []).filter(c => c.status === 'Active' && (!fu || def.ia.includes(c.code))), di = new Set(def.ia);
    const iaH = ia.length ? `<div class="oc1-iag"><div class="xs strong">Programme Academy criteria</div><ul class="oc1-cl">${ia.map(c => `<li><label class="check"><input type="checkbox" class="oc1-sc-i" value="${esc(c.code)}" ${di.has(c.code) ? 'checked' : ''}><span><span class="code">${esc(c.code)}</span> ${esc(c.title)} <span class="xs muted">${esc(c.cat || '')}</span></span></label></li>`).join('')}</ul></div>` : '';
    const items = ((oc1Snap(ctx) || {}).wp || []);
    const libH = fu ? (def.lib.length ? `<div class="oc1-libg"><div class="xs strong">Academy observation criteria (outstanding)</div>${oc1ByCat(items.filter(i => def.lib.includes(i.id))).map(g => `<div class="oc1-cat" data-k="${esc(g.cat)}"><strong class="xs"><span class="code">${esc(g.catCode)}</span> ${esc(g.catName || '')}</strong><ul class="oc1-cl">${g.items.map(i => `<li><label class="check"><input type="checkbox" class="oc1-sc-l" value="${esc(i.id)}" checked><span><span class="code">${esc(i.code)}</span> ${esc(i.title)}</span></label></li>`).join('')}</ul></div>`).join('')}</div>` : '')
      : oc1ByCat(items).length ? `<div class="oc1-libg"><div class="xs strong">Academy observation categories</div>${oc1ByCat(items).map(g => `<div class="oc1-cat" data-k="${esc(g.cat)}"><label class="check"><input type="checkbox" class="oc1-sc-c" value="${esc(g.cat)}" ${def.cats.includes(g.cat) ? 'checked' : ''}><span><strong><span class="code">${esc(g.catCode)}</span> ${esc(g.catName || '')}</strong></span></label><ul class="oc1-catl xs">${g.items.map(i => `<li data-code="${esc(i.code)}"><span class="code">${esc(i.code)}</span> ${esc(i.title)}</li>`).join('')}</ul></div>`).join('')}</div>` : '';
    acad = iaH + libH;
  }
  return `<fieldset class="field n5-fs oc1-scope" id="oc1-scope" data-fu="${fu ? 1 : 0}"><legend class="lbl">${fu ? 'Follow-up scope — outstanding criteria' : 'Visit scope'}</legend><p class="xs muted">${fu ? 'Only the criteria still outstanding on this plan. The earlier signed visit is kept unchanged.' : 'The plan\'s criteria are ticked. Untick any not observed on this visit, or add eligible criteria from another plan of the learner\'s version.'}</p><div class="xs strong">NVQ criteria</div>${nvqH}${acad}</fieldset>`;
}
// Reads and checks the scope chosen in the dialog (the handler's own check: a crafted value is refused, not trusted)
function oc1ScopeRead(w, ctx, e, loc, fu) {
  const box = document.querySelector('#modal-root #oc1-scope'), office = loc === 'office', def = oc1ScopeDefault(w, ctx, e, loc, fu);
  const tk = c => (box ? [...box.querySelectorAll('.' + c + ':checked')].map(i => i.value) : null);
  const sc = box ? { nvq: tk('oc1-sc-n'), ia: tk('oc1-sc-i'), cats: tk('oc1-sc-c'), lib: fu ? tk('oc1-sc-l') : null } : def;
  const dup = ['nvq', 'ia', 'cats'].concat(fu ? ['lib'] : []).find(k => new Set(sc[k] || []).size !== (sc[k] || []).length);
  if (dup) return { why: 'A criterion appears twice in this visit — each criterion is recorded once per visit.' };
  const nvqOk = new Set(n5NvqOk(ctx.pr, ctx.cfg).map(c => c.code)), bad = sc.nvq.filter(c => !nvqOk.has(c));
  if (bad.length) return { why: `${bad.join(', ')} can't be observed on this visit: only the Observation / Competency criteria of the learner's own programme version (Version ${ctx.v}) can be chosen. Knowledge criteria are assessed through assignments.` };
  const iaOk = new Set((ctx.cfg.ia || []).filter(c => c.status === 'Active').map(c => c.code)), wpItems = (oc1Snap(ctx) || {}).wp || [];
  if ((office && (sc.ia.length || sc.cats.length || (sc.lib || []).length))) return { why: 'Academy-defined criteria aren\'t assessed at the Academy office — choose NVQ criteria only.' };
  if (sc.ia.some(c => !iaOk.has(c)) || sc.cats.some(c => !wpItems.some(i => i.cat === c)) || (sc.lib || []).some(id => !wpItems.some(i => i.id === id))) return { why: 'An Academy criterion that isn\'t part of the learner\'s programme version was chosen.' };
  if (fu) { const o = oc1Outstanding(w, ctx, e), has = (set, v) => o.some(x => x.set === set && (set === 'lib' ? x.id === v : x.code === v));
    if (sc.nvq.some(c => !has('nvq', c)) || sc.ia.some(c => !has('ia', c)) || (sc.lib || []).some(id => !has('lib', id)) || sc.cats.length) return { why: 'A follow-up visit targets only the criteria still outstanding on this plan.' }; }
  if (!sc.nvq.length && !sc.ia.length && !sc.cats.length && !(sc.lib || []).length) return { why: 'Choose at least one criterion for this visit.' };
  const order = Object.keys(oc1Flat(w.tree)); sc.nvq.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return { nvq: sc.nvq, ia: office ? [] : sc.ia, cats: office ? [] : sc.cats, lib: office ? null : sc.lib, why: '' };
}
// The proposal dialog: the follow-up option and the scope picker; the library line names the visit's own Academy criteria
const _pickOC1 = INP.dEvPick;
INP.dEvPick = el => {
  const v = (el && el.value) || '', fu = /^FU:/.test(v), id = fu ? v.slice(3) : v, r = _pickOC1(fu ? { value: id } : el);
  const lid = mval('#op-l'), w = dW(lid), ctx = dCtx(w), e = ctx && ctx.evs.find(x => x.id === id), s = e && dSel(w, e.id), info = document.getElementById('d-ev-info');
  if (!e || !s || !info) return r;
  const def = oc1ScopeDefault(w, ctx, e, s.loc, fu), items = ((oc1Snap(ctx) || {}).wp || []).filter(i => (def.lib ? def.lib.includes(i.id) : def.cats.includes(i.cat)));
  const pc = info.querySelector('.ol1-propc'); if (pc) pc.textContent = items.map(i => i.code).join(', ') || '—';
  const kv = info.querySelector('.d-evkv'); if (kv) kv.insertAdjacentHTML('afterbegin', `<dt>Observation plan</dt><dd>${esc(e.name)}${fu ? ' — follow-up' : ''}</dd>`);
  info.insertAdjacentHTML('beforeend', oc1ScopeHtml(w, ctx, e, s.loc, fu));
  return r;
};
// The record's library criteria: the visit's own Academy scope (none at the Academy office); earlier records unchanged
const _recItemsOC1 = ol1RecItems;
ol1RecItems = function (o) {
  const sc = o && o.src && o.src.dScope; if (!sc) return _recItemsOC1.apply(this, arguments);
  const s = ol1SnapOf(o.src.dPid, o.src.dV); if (!s) return [];
  if (o.src.dLoc === 'office') return OC1_OFFICE_NVQ_ONLY ? [] : (s.off || []);
  return (s.wp || []).filter(i => (Array.isArray(sc.lib) ? sc.lib.includes(i.id) : (sc.cats || []).includes(i.cat)));
};
// "What will be observed" (Coordinator, learner): each plan's own categories at its location, grouped by category
ol1EvRows = function (w, ctx, viewer) {
  const s0 = ctx.cfg.ol1snap; if (!s0) return '';
  return ctx.evs.map(e => {
    const s = dSel(w, e.id); if (!s) return `<li class="li" data-e="${e.id}"><div class="li-b"><strong>${esc(e.name)}</strong><span class="small muted">Location not chosen yet — the criteria for the chosen location appear here.</span></div></li>`;
    const office = s.loc === 'office', items = office ? (OC1_OFFICE_NVQ_ONLY ? [] : s0.off || []) : (s0.wp || []).filter(i => oc1PlanCats(s0.wp, e).includes(i.cat));
    const last = {}; dRecs(w, ctx, e).filter(o => o.status === 'Completed' && o.report && o.report.ol1).sort((x, y) => new Date(x.signed || 0) - new Date(y.signed || 0)).forEach(o => o.report.ol1.forEach(x => { last[x.id] = x; }));
    const body = items.length ? oc1ByCat(items).map(g => `<div class="oc1-cat" data-k="${esc(g.cat)}"><div class="xs strong"><span class="code">${esc(g.catCode)}</span> ${esc(g.catName || '')}</div><ul class="list small ol1-items">${g.items.map(i => { const x = last[i.id]; return `<li class="li" data-code="${esc(i.code)}"><div class="li-b"><span><span class="code">${esc(i.code)}</span> <strong>${esc(i.title)}</strong></span><span class="xs muted">${esc(i.instr)}</span><span class="xs">Evidence: ${esc(ol1EvTxt(i))}${viewer === 'coord' && x ? ` · ${plural(Object.values(x.evidence || {}).reduce((a, y) => a + y.length, 0), 'evidence item')} recorded` : ''}</span></div>${x ? chip(x.out, x.out === 'Met' ? 'green' : 'amber') : chip('Not yet assessed', 'grey')}</li>`; }).join('')}</ul></div>`).join('')
      : `<span class="small muted">${office && OC1_OFFICE_NVQ_ONLY ? 'Academy office: the qualification\'s NVQ criteria only — Academy observation criteria aren\'t assessed there.' : `No Academy observation criteria for this observation at the ${esc(dTxtLoc(s.loc).toLowerCase())}.`}</span>`;
    return `<li class="li ol1-ev" data-e="${e.id}" data-loc="${s.loc}"><div class="li-b"><strong>${esc(e.name)} — ${esc(dTxtLoc(s.loc))}</strong>${body}</div></li>`;
  }).join('');
};
// The record screen: NVQ criteria grouped by unit → module → learning outcome (the same recording rows)
function oc1RecNvq(o, cl, dr) {
  const items = cl.items.filter(i => i.set === 'nvq'); if (!items.length) return '<p class="small muted">None in this observation.</p>';
  const w = STORE.worlds[o.v] || {}, by = {}, flat = oc1Flat(w.tree); items.forEach(i => { by[i.code] = i; });
  return `<div class="oc1-recg">${oc1GroupHtml(oc1Groups(w.tree, items.map(i => i.code)), c => { const i = by[c.code], ach = flat[c.code] && flat[c.code].st === 'Achieved' && flat[c.code].lock; return dCritRow('nvq', i.code, i.d, 'Observation / Competency' + (ach ? ' · already achieved (locked) — this result is added to its history; the achievement stays' : ''), i.req, i.types, dr.nvq[i.code] || {}); }, 'div')}</div>`;
}
// A completed D1 record whose criteria are still outstanding: "Follow-up" opens the proposal on the plan's follow-up
const _fuOC1 = ACT.obFollow;
ACT.obFollow = el => {
  const o = el && el.dataset ? obById(el.dataset.id) : null; if (!o || !o.src || !o.src.dEv) return _fuOC1(el);
  const w = dW(o.lid), ctx = dCtx(w), e = ctx && ctx.evs.find(x => x.id === o.src.dEv);
  if (!e || !oc1FuReady(w, ctx, e)) { toast(e ? `${e.name}: no follow-up can be proposed now (nothing outstanding, or the location isn't ready).` : 'Observation not found.', 'err'); return; }
  ACT.obPropose({ dataset: { l: o.lid } }); const sel = document.querySelector('#modal-root #d-ev-s'); if (sel) { sel.value = 'FU:' + e.id; INP.dEvPick(sel); }
};

/* ============================================================ OBSERVATION BOOK ============================================================ */
const oc1Visits = (w, ctx) => (w.observations || []).filter(o => o.dEv && o.dV === ctx.v && !['Cancelled', 'Rescheduled'].includes(o.status)).sort((x, y) => new Date(x.at || 0) - new Date(y.at || 0));
function oc1ResTable(w, r) {
  const tree = w.tree || [], nvq = r.nvq || [], ia = r.ia || [], lib = r.ol1 || [], by = {}; nvq.forEach(x => { by[x[0]] = x; });
  const oc = x => `${chip(x[2] ? 'Observed' : 'Not Yet Observed')} ${chip(x[3] ? 'Competent' : 'Not Yet Competent')}`;
  const gr = t => `<tr class="oc1-gr"><th colspan="4">${t}</th></tr>`;
  let rows = '';
  oc1Groups(tree, nvq.map(x => x[0])).forEach(g => { rows += gr(g.u ? `Unit ${esc(g.u.code)} › Module ${esc(g.m.code)} › ${esc(g.lo.code)} — ${esc(g.lo.title || '')}` : 'NVQ criteria'); g.crit.forEach(c => { const x = by[c.code]; rows += `<tr data-code="${esc(x[0])}"><td><span class="code">${esc(x[0])}</span><div class="xs muted">${esc(x[1])}</div></td><td>NVQ</td><td>${oc(x)}${(r.kept || []).includes(x[0]) ? `<div class="xs muted">Already achieved — kept</div>` : ''}</td><td class="small">${cf2CritNotes(r, 'nvq', x[0], x[4])}</td></tr>`; }); });
  const iaCats = {}; ia.forEach(x => { const c = ((dCtx(w) || { cfg: { ia: [] } }).cfg.ia || []).find(i => i.code === x[0]) || {}; (iaCats[c.cat || 'Academy (programme)'] = iaCats[c.cat || 'Academy (programme)'] || []).push(x); });
  Object.entries(iaCats).forEach(([k, xs]) => { rows += gr(`Academy (programme) — ${esc(k)}`); xs.forEach(x => { rows += `<tr data-code="${esc(x[0])}"><td><span class="code">${esc(x[0])}</span><div class="xs muted">${esc(x[1])}</div></td><td>Academy (programme)</td><td>${oc(x)}</td><td class="small">${cf2CritNotes(r, 'ia', x[0], x[4])}</td></tr>`; }); });
  oc1ByCat(lib).forEach(g => { rows += gr(`Academy (Criteria Library) — ${esc(g.catCode)} ${esc(g.catName || '')}`); g.items.forEach(x => { rows += `<tr data-code="${esc(x.code)}"><td><span class="code">${esc(x.code)}</span><div class="xs muted">${esc(x.title)}</div></td><td>Academy (Criteria Library)</td><td>${chip(x.out, x.out === 'Met' ? 'green' : 'amber')}</td><td class="small">${(x.ev || []).map(t => ((x.evidence || {})[t] || []).map(y => esc(y.t || y.name) + ` <span class="xs muted">(${esc(y.by)})</span>`).join('; ')).filter(Boolean).join(' · ') || '—'}</td></tr>`; }); });
  return `<div class="tbl-wrap"><table class="tbl dense cf2-res oc1-res"><thead><tr><th>Criterion</th><th>Set</th><th>Outcome (Assessor)</th><th>Remarks, performance and evidence</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
const _rowOC1 = cf2RecRow;
cf2RecRow = function (w, o, who, ctx) {
  let h = _rowOC1.apply(this, arguments); if (!ctx || !o.dEv || typeof h !== 'string') return h;
  const vs = oc1Visits(w, ctx), n = vs.indexOf(o) + 1, of = o.dFu && o.dFu.of ? vs.find(x => x.id === o.dFu.of) : null, tree = w.tree || [];
  const sc = o.dScope ? `<span class="xs oc1-vsc">Scope: ${esc(oc1ScopeTxt(tree, o.dScope.nvq) || 'no NVQ criteria')}${o.dLoc === 'office' ? ' · Academy office: NVQ criteria only' : (o.dScope.ia || []).length || (o.dScope.cats || []).length || (o.dScope.lib || []).length ? ` · Academy: ${esc((o.dScope.ia || []).concat(Array.isArray(o.dScope.lib) ? ol1RecItems({ src: o }).map(i => i.code) : (o.dScope.cats || []).map(oc1CatCode)).join(', '))}` : ''}</span>` : '';
  const lab = `<span class="oc1-vis xs" data-n="${n}"><strong>Visit ${n || '—'}</strong> · record ${esc(o.id)}${o.dFu ? ` · ${chip('Follow-up', 'blue')}${of ? ' to visit ' + (vs.indexOf(of) + 1) + ' (' + fd(of.at) + ')' : ''}` : ''}</span>`;
  h = h.replace('<div class="li-b">', '<div class="li-b">' + lab).replace('<span class="xs muted">Observation assessor', sc + '<span class="xs muted">Observation assessor');
  if (o.report) h = h.replace(/<div class="tbl-wrap"><table class="tbl dense cf2-res">[\s\S]*?<\/table><\/div>/, oc1ResTable(w, o.report));
  // the follow-up flag follows the plan (the criteria still outstanding now), not this one record
  const fuS = `<span>${chip('Follow-up needed', 'amber')} <span class="xs muted">Criteria not yet observed, competent or met go to a follow-up observation (FR-TA-05-06).</span></span>`;
  if (o.status === 'Completed' && h.includes(fuS)) { const e = ctx.evs.find(x => x.id === o.dEv), out = e ? oc1Outstanding(w, ctx, e) : []; if (!out.length) h = h.replace(fuS, `<span class="xs muted oc1-fudone">Followed up — no criteria outstanding on this plan.</span>`); }
  return h;
};
function oc1BookEv(w, ctx, e, who) {
  const st = dState(w, ctx, e), s = dSel(w, e.id), c = dEvCrit(ctx, e), office = s && s.loc === 'office', tree = w.tree || [], flat = oc1Flat(tree), snap = oc1Snap(ctx);
  const nrow = cc => { const t = flat[cc.code] || {}; return `<li class="li" data-code="${esc(cc.code)}"><div class="li-b"><span><span class="code">${esc(cc.code)}</span> ${esc(t.d || cc.d || '')}</span>${t.evReq || t.ev ? `<span class="xs muted">Evidence: ${esc(t.evReq || t.ev)}</span>` : ''}${(t.obsH || []).length ? `<span class="xs muted oc1-hist">${plural(t.obsH.length, 'observation result')}: ${t.obsH.map(hh => `${fd(hh.at)} ${hh.o ? 'Observed' : 'Not Yet Observed'} / ${hh.c ? 'Competent' : 'Not Yet Competent'}${hh.fu ? ' (follow-up)' : ''}`).join(' · ')}</span>` : ''}</div>${chip(t.st || 'Not Started', t.st === 'Achieved' ? 'green' : t.st && t.st !== 'Not Started' ? 'amber' : 'grey')}</li>`; };
  const nvqL = c.nvq.length ? oc1GroupHtml(oc1Groups(tree, c.nvq), nrow) : '<ul class="list small"><li class="li small muted">None in this observation.</li></ul>';
  const iaL = office ? [] : c.ia.map(code => (ctx.cfg.ia || []).find(i => i.code === code) || { code, title: '' }), iaG = {}; iaL.forEach(x => { (iaG[x.cat || 'Programme Academy criteria'] = iaG[x.cat || 'Programme Academy criteria'] || []).push(x); });
  const lib = !s || !snap ? [] : office ? (OC1_OFFICE_NVQ_ONLY ? [] : snap.off || []) : (snap.wp || []).filter(i => oc1PlanCats(snap.wp, e).includes(i.cat));
  const acad = Object.entries(iaG).map(([k, xs]) => `<div class="oc1-cat"><div class="xs strong">${esc(k)} <span class="muted">(programme)</span></div><ul class="list small">${xs.map(x => `<li class="li" data-code="${esc(x.code)}"><div class="li-b"><span><span class="code">${esc(x.code)}</span> ${esc(x.title || x.d || '')}</span><span class="xs muted">Programme Academy standard</span></div></li>`).join('')}</ul></div>`).join('')
    + oc1ByCat(lib).map(g => `<div class="oc1-cat" data-k="${esc(g.cat)}"><div class="xs strong"><span class="code">${esc(g.catCode)}</span> ${esc(g.catName || '')}</div><ul class="list small">${g.items.map(i => `<li class="li" data-code="${esc(i.code)}"><div class="li-b"><span><span class="code">${esc(i.code)}</span> ${esc(i.title)}</span><span class="xs muted">${esc(i.instr)}</span><span class="xs">Evidence: ${esc((i.ev || []).map(OL1_EVL).join(', '))}${(i.req || []).length ? ' · required: ' + esc(i.req.map(OL1_EVL).join(', ')) : ''}</span></div></li>`).join('')}</ul></div>`).join('');
  const out = st.k === 'done' ? (st.fu || []) : [];
  const outH = out.length ? `<div class="note b-amber oc1-out">${ic('alert')}<div class="small"><strong>Outstanding after the signed visits:</strong> ${out.map(x => `<span class="code">${esc(x.code)}</span>`).join(', ')}. ${oc1FuReady(w, ctx, e, st) ? 'The observation assessor can propose a follow-up visit for them (Observations → Propose observation → "Follow-up").' : 'A follow-up needs the location to be ready (workplace permission or an approved Academy-office request).'}</div></div>` : '';
  const recs = dRecs(w, ctx, e).slice().sort((x, y) => new Date(y.at || 0) - new Date(x.at || 0));
  return `<section class="card cf2-obe oc1-obe" data-e="${esc(e.id)}"><div class="row-b"><h2>${esc(e.name)}</h2>${chip(st.t, st.tone)}</div>
    <p class="small">${s ? `Location: <strong>${esc(dTxtLoc(s.loc))}</strong> (chosen by ${esc(s.by)})` : 'Location not chosen yet — the learner\'s Academic Coordinator chooses it.'} · Permitted: ${esc(dLocs(ctx, e).map(dTxtLoc).join(', '))} · Evidence permitted: ${esc(n5EvTxt({ types: e.ev }))}</p>
    <div class="grid-2 cf2-sets"><div class="cf2-set" data-set="nvq"><h3>NVQ assessment criteria</h3><p class="xs muted">Qualification competency — Version ${ctx.v}, by unit, module and learning outcome.</p>${nvqL}</div>
    <div class="cf2-set" data-set="academy"><h3>Academy observation criteria</h3><p class="xs muted">Internal quality standards, by category — not qualification competency.${office ? ' Academy office: NVQ criteria only — this plan\'s Academy criteria aren\'t assessed there.' : ''}</p>${acad || `<ul class="list small"><li class="li small muted">${s ? (office ? 'Not assessed at the Academy office.' : 'None for this plan.') : 'Shown once the location is chosen.'}</li></ul>`}</div></div>
    ${outH}<h3>Visits</h3>${recs.length ? `<ul class="list">${recs.map(o => cf2RecRow(w, o, who, ctx)).join('')}</ul>` : '<p class="small muted">No observation proposed yet. The observation assessor proposes a date once the location is ready.</p>'}</section>`;
}
const _bookOC1 = cf2BookHtml;
cf2BookHtml = function (lid, who) {
  const h = _bookOC1.apply(this, arguments), w = who && who.w, ctx = dCtx(w); if (!ctx || typeof h !== 'string') return h;
  const k = h.indexOf('<section class="card cf2-obe"'), head = k < 0 ? h : h.slice(0, k), flat = oc1Flat(w.tree), nvq = n5NvqOk(ctx.pr, ctx.cfg).map(c => c.code), vs = oc1Visits(w, ctx);
  const ach = nvq.filter(c => flat[c] && flat[c].st === 'Achieved').length, signed = vs.filter(o => o.status === 'Completed').length, open = vs.filter(o => ['Proposed', 'Confirmed'].includes(o.status)).length;
  const sum = `<section class="card oc1-bsum"><div class="row-b"><h2>Observation plan</h2>${chip(`${ach} of ${nvq.length} NVQ observation criteria achieved`, ach === nvq.length && nvq.length ? 'green' : 'blue')}</div><p class="small">${plural(ctx.evs.length, 'required observation')} in Version ${ctx.v} · ${plural(vs.length, 'visit')} (${signed} signed off, ${open} open)${vs.some(o => o.dFu) ? ` · ${plural(vs.filter(o => o.dFu).length, 'follow-up')}` : ''}. Each visit is a separate record; signed visits are locked and later visits never change them.</p></section>`;
  return head + sum + ctx.evs.map(e => oc1BookEv(w, ctx, e, who)).join('');
};

/* ============================================================ DEMO ============================================================ */
const OC1_B = 'DEMO-L3-OBS27', OC1_KEY = 'CD6', OC1_NAME = 'Nia Ward (demo)';
const OC1 = () => (STORE.oc1 = STORE.oc1 || { examples: false, demoErr: [] });
const oc1ExOn = () => !!(STORE.oc1 && STORE.oc1.examples);
const _isOC1 = initStore; initStore = function () { [OC1_KEY].forEach(k => { delete VARIANT_INFO[k]; delete PERSONAS[k]; delete VARIANTS[k]; }); if (S.variant === OC1_KEY) S.variant = 'C'; const r = _isOC1.apply(this, arguments); STORE.oc1 = null; return r; };
function oc1DemoBuild() {
  const errs = (OC1().demoErr = []); let stop = false;
  const step = (n, f) => { if (stop) return; try { f(); } catch (e) { errs.push(n + ': ' + e.message); stop = true; } closeModal(); };
  const put = o => Object.entries(o).forEach(([k, v]) => { const e = $(k); if (!e) throw new Error('Missing field ' + k); e.value = v; });
  const ok1 = r => { const a = MODAL && MODAL.actions.find(x => /primary|danger/.test(x.cls || '')); if (!a || !a.fn) throw new Error('No dialog to confirm'); if (r !== undefined) { const t = $('#rsn'); if (t) t.value = r; } let res = a.fn(), g = 0; while (res === false && MODAL && g++ < 3) res = a.fn(); if (res === false) throw new Error((MODAL && MODAL.title) + ': ' + ($$('#modal-root .err').map(e => e.textContent).join(' ') || 'refused')); if (MODAL) closeModal(); return res; };
  const tick = (sel, vals) => $$('#modal-root ' + sel).forEach(x => { if (!x.disabled) x.checked = vals.includes(x.value); });
  const aca = () => { acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const pr = cdPr(); if (!pr || !cdBatch()) { errs.push('The client demo is not loaded'); return; }
  const id = pr.id; let saf = null, abs = null;
  // 1. A second Academy observation category in the library (ABS already exists): SAF with two criteria, published
  step('Library category SAF', () => {
    aca(); abs = OL1().cats.find(c => c.code === 'ABS'); if (!abs) throw new Error('ABS not in the library');
    go('k-ocl'); ACT.ol1CatNew(); put({ '#ol1-code': 'SAF', '#ol1-name': 'Safety practices (client demo)', '#ol1-desc': 'How the learner keeps themselves and others safe during practice.' }); ok1();
    saf = OL1().cats.find(c => c.code === 'SAF'); if (!saf) throw new Error('SAF not created');
    [['Uses appropriate protective equipment', 'Observe the selection, use and disposal of protective equipment for the task.', ['notes', 'photos'], ['notes']],
      ['Follows infection-control procedures', 'Observe hand hygiene, cleaning and waste handling against the workplace procedure.', ['notes', 'docs'], ['notes']]].forEach(([t, i, ev, req]) => {
      go('k-ocl', { id: saf.id }); ACT.ol1CritEdit({ dataset: { k: saf.id, c: '' } }); put({ '#ol1-ct': t, '#ol1-ci': i }); tick('.ol1-ev', ev); tick('.ol1-rq', req); ok1(); });
    ACT.ol1CatPub({ dataset: { k: saf.id } }); ok1('Client demo — observation planning examples');
  });
  // 2. Version 2 of the demo programme: a second observed outcome in Unit 1 and a second unit; SAF for workplace; three plans
  step('Version 2 curriculum', () => {
    aca(); go('a-programmes', { id, tab: 'details' }); ACT.s3WizVersion({ dataset: { id } }); ok1('Client demo — observation planning (multi-module)');
    go('a-programmes', { id, tab: 'details' }); const y = $('main #cbr2-obs-yes'); if (y) { y.checked = true; INP.cbr2Obs(y); if (MODAL) ok1(); }
    go('a-programmes', { id, tab: 'structure' });
    ACT.ch8AddLo({ dataset: { id, u: 0, m: 0 } }); put({ '#lo-t': 'Work safely in a care setting', '#lo-y': 'Observation' }); ok1();
    ACT.ch8AddCrit({ dataset: { id, u: 0, m: 0, l: 2 } }); put({ '#c-d': 'Demonstrate correct hand hygiene', '#c-e': 'Direct observation in the workplace' }); ok1();
    ACT.ch8AddCrit({ dataset: { id, u: 0, m: 0, l: 2 } }); put({ '#c-d': 'Demonstrate safe equipment handling', '#c-e': 'Direct observation in the workplace' }); ok1();
    ACT.ch8AddUnit({ dataset: { id } }); put({ '#u-t': 'Delivering care' }); const uc = $('#modal-root #u-c'); if (uc && !uc.value) uc.value = 'U002'; ok1();
    ACT.ch8AddMod({ dataset: { id, u: 1 } }); put({ '#m-t': 'Person-centred support', '#m-ab': 'D/650/0002' }); ok1();
    ACT.ch8AddLo({ dataset: { id, u: 1, m: 0 } }); put({ '#lo-t': 'Demonstrate person-centred support', '#lo-y': 'Observation' }); ok1();
    ACT.ch8AddCrit({ dataset: { id, u: 1, m: 0, l: 0 } }); put({ '#c-d': 'Respect individual preferences', '#c-e': 'Direct observation in the workplace' }); ok1();
    ACT.ch8AddCrit({ dataset: { id, u: 1, m: 0, l: 0 } }); put({ '#c-d': 'Support a person with daily activities', '#c-e': 'Direct observation in the workplace' }); ok1();
  });
  step('Version 2 observations', () => {
    aca(); go('a-programmes', { id, tab: 'observations' }); const d = n5Draft(pr); if (!d) throw new Error('No draft configuration');
    n5NvqOk(pr, d).forEach(c => { if (!(d.nvq[c.code] && d.nvq[c.code].types.length)) { ACT.n5NvqEv({ dataset: { p: id, c: c.code } }); tick('.n5-ev', ['notes', 'photos']); ok1(); } });
    ACT.ol1Sel({ dataset: { p: id, loc: 'wp', k: saf.id } }); tick('.ol1-all', ['all']); ok1();
    const plan = (e, name, loc, crit, cats) => { ACT.cbObsEv({ dataset: { p: id, e } }); put({ '#ev-n': name }); tick('.ev-l', loc); tick('.ev-c', crit); tick('.ev-e', ['notes', 'photos']); tick('.oc1-ev-cat', cats); ok1(); };
    plan('EV-1', 'Combined practice observation', ['workplace', 'office'], ['001 2.1', '002 1.2'], [abs.id]);
    plan('', 'Workplace safety', ['workplace'], ['001 3.1', '001 3.2'], [saf.id]);
    plan('', 'Person-centred support', ['workplace', 'office'], ['002 1.1', '002 1.2'], [abs.id]);
    const why = cbRvChecks(pr).block.map(x => x.msg); if (why.length) throw new Error('Review & Publish: ' + why.join('; '));
    go('a-programmes', { id, tab: 'review' }); ACT.cbPublish({ dataset: { id } }); ok1('Client demo — Version 2: observation plans across two units');
    if (pr.version !== 2 || !n5ConfigFor(id, 2)) throw new Error('Version 2 not published');
  });
  // 3. A batch on Version 2 (batches record the version they are created on; learners on DEMO-L3-JAN27 stay on Version 1)
  step('Batch ' + OC1_B, () => {
    aca(); go('a-batches'); ACT.newBatch(); put({ '#nb-c': OC1_B }); const co = $('#modal-root #nb-co'); co.value = CD_T; INP.n2NbCourse(co); $('#modal-root #nb-m').value = 'Blended';
    $$('#modal-root .m-m').forEach(x => { x.checked = x.value === 'Fully Assisted'; INP.mModeTick(x); });
    const nx = () => MODAL.actions.find(x => /primary/.test(x.cls)).fn(); if (nx() === false) throw new Error('Create batch step 1: ' + $('#modal-root').textContent.slice(0, 160));
    $('#modal-root #nb-ac').value = 'Dr Helen Carter'; $$('#modal-root .nb-t').forEach(i => { i.checked = i.value === CD_TEACHER; }); $$('#modal-root .nb-a').forEach(i => { i.checked = i.value === CD_ASSESSOR; });
    CF2_PRESET = { tpl: 'TPL-3' }; try { nx(); nx(); nx(); nx(); } finally { CF2_PRESET = null; } closeModal();
    const b = ADMIN.batches.find(x => x.code === OC1_B); if (!b) throw new Error('Not created'); if (b.progVersion !== 2) throw new Error('Batch recorded Version ' + b.progVersion);
    go('a-batches', { id: OC1_B }); const life = $('main [data-act="batchLife"]'); if (life) { ACT.batchLife(life); if (MODAL) ok1('Client demo — open for enrolment'); }
  });
  // 4. A learner who enrols on it (Add learner, activation, sign-up, documents, offer letter, first instalment, admission)
  step('Learner ' + OC1_NAME, () => {
    aca(); go('a-learners'); ACT.addLearner(); put({ '#nl-name': OC1_NAME, '#nl-email': 'demo.learner6@demo.example', '#nl-mob': '+44 7700 900116' }); ok1();
    const L = ADMIN.learners.find(x => x.name === OC1_NAME); if (!L) throw new Error('Add learner');
    if (L.acct === 'Pending Verification') { L.acct = 'Active'; logA('Learners', L.id, 'Account activated', 'Pending Verification', 'Active', 'Demo step: the learner used the activation link (client demo)'); }
    // built like the client demo's own learners (a demo-state build — N1A's n1aSeedWrap): no commencement rule on the sign-up, so
    // the examples can show visits before DEMO-L3-OBS27's start date, as Dev's do on DEMO-L3-JAN27 (PD-OC1-14)
    const seeded = typeof n1aSeedWrap === 'function' ? n1aSeedWrap(f => f()) : (f => f());
    seeded(() => fxFast(ff => {
      cdWorld(OC1_KEY, L, 'Fully Assisted'); const w = STORE.worlds[OC1_KEY]; cdAs(OC1_KEY); go('browse');
      const c = CATALOGUE.find(x => x.kind === 'nvq' && x.title === CD_T), opt = r1Opts(id).find(o => o.status === 'Active' && o.mode === 'Fully Assisted'); if (!c || !opt) throw new Error('Browse: no Fully Assisted option');
      ACT.applyNvq({ dataset: { id: c.id } }); const r = $(`#modal-root input[name="r1-opt"][value="${opt.id}"]`); if (r) r.checked = true; if (cdPress() === false) throw cdErr(w, 'Sign-up'); closeModal();
      go('admission'); $('#su-dob').value = '1993-04-18'; $('#su-ad').value = '15 Demo Avenue, Nottingham'; cdPick(w, OC1_B); ACT.suNext(); if (w.signup.step !== 2) throw cdErr(w, 'Sign-up details');
      w.docs.filter(dd => dd.mand).forEach(dd => ACT.sampleUpload({ dataset: { id: dd.id } })); ff(3000);
      ACT.suNext(); setUi('suSig', w.me.first + ' ' + w.me.last); setUi('suDecl', true); ACT.suSign(); if (!w.signup.sig) throw cdErr(w, 'Offer letter');
      setUi('suOpt', 'instalment'); setUi('suMethod', 'card'); render(); ACT.suPay(); if (cdPress() !== false) throw cdErr(w, 'Checkout'); ff(3000); closeModal();
      if (!w.signup.done || w.signup.batch !== OC1_B) throw cdErr(w, 'Payment');
    }));
    cdAdmit(OC1_KEY); if (typeof mcSync === 'function') mcSync(ADMIN.batches.find(x => x.code === OC1_B));
    const w = STORE.worlds[OC1_KEY]; if (w.nvq.progVersion !== 2 || !dCtx(w) || dCtx(w).evs.length !== 3) throw new Error('Not on Version 2 with three plans');
  });
  const w = () => STORE.worlds[OC1_KEY], lid = () => w().me.id;
  const asCoord = () => { const coo = Object.keys(COO_USERS).find(k => COO_USERS[k].name === mcOf(lid())); if (!coo) throw new Error('No Coordinator'); S.coo.v = coo; cooEnter(); S.signedIn = true; S.ui = {}; };
  const asAssessor = () => { const tk = Object.keys(TAS_USERS).find(t => TAS_USERS[t].name === chEff(lid(), 'obs')); if (!tk) throw new Error('No observation assessor'); S.tas.v = tk; S.tas.batch = 'all'; tasEnter(); S.signedIn = true; S.ui = {}; };
  const propose = (ev, days) => {
    asAssessor(); go('t-obs'); ACT.obPropose({ dataset: { l: lid() } }); if (!MODAL) throw new Error('Propose refused');
    const lf = $('#modal-root #op-l'); if (lf) { lf.value = lid(); INP.obPerm(lf); } const s = $('#modal-root #d-ev-s'); if (!s) throw new Error('No plan list'); s.value = ev; INP.dEvPick(s);
    if (($('#modal-root input[name="op-lt"]:checked') || {}).value === 'office' && !$('#op-office')) INP.obLt();
    put({ '#op-d': D(days, '10:00').slice(0, 16) }); const a = MODAL.actions.find(x => x.label === 'Send proposal'); if (!a || a.fn() === false) throw new Error('Proposal refused: ' + ($('#toast-root') || {}).textContent); closeModal();
    const o = w().observations[0]; if (!o || o.status !== 'Proposed') throw new Error('Not proposed');
    cdAs(OC1_KEY); go('observations'); ACT.obsAccept({ dataset: { id: o.id } }); ok1(); if (o.status !== 'Confirmed') throw new Error('Not confirmed'); return o;
  };
  const record = (o, res, lib) => {
    asAssessor(); const rid = OC1_KEY + '-' + o.id; go('t-obsrec', { id: rid });
    Object.entries(res).forEach(([code, [ob, cp, m]]) => { ACT.orT({ dataset: { s: 'nvq', c: code, k: 'o', v: String(ob) } }); ACT.orT({ dataset: { s: 'nvq', c: code, k: 'c', v: String(cp) } }); INP.orM({ dataset: { s: 'nvq', c: code }, value: m }); });
    ol1RecItems(obById(rid)).forEach(i => { const out = lib[i.code] || 'Met'; (i.req || []).forEach(t => { if (['notes', 'refs'].includes(t)) ACT.ol1EvAdd({ dataset: { id: rid, c: i.id, t, text: 'Observed during the morning routine (no names recorded).' } }); else INP.ol1File({ dataset: { id: rid, c: i.id, t }, files: [{ name: 'evidence-' + i.code + '.pdf', size: 1024 }] }); }); ACT.ol1Out({ dataset: { id: rid, c: i.id, v: out } }); });
    INP.orF({ dataset: { f: 'ctx' }, value: 'Morning personal-care routine (client demo).' }); INP.orF({ dataset: { f: 'notes' }, value: 'Client demo — observation recorded through the Observation Book.' }); render();
    $$('main .d-evt').forEach(x => { x.checked = x.value === 'notes'; }); INP.dEvt(); ACT.orSave();
    ACT.orSign({ dataset: { id: rid } }); const sa = MODAL && MODAL.actions.find(x => x.label === 'Sign off and lock'); if (!sa) throw new Error('Sign-off refused: ' + ($('#toast-root') || {}).textContent); sa.fn(); closeModal();
    if (o.status !== 'Completed') throw new Error('Not signed off');
  };
  // 5. Workplace permission (the one simulated external action), the Coordinator's locations, and the Academy-office approval
  step('Workplace and locations', () => {
    cdAs(OC1_KEY); setUi('wpEdit', true); go('observations', { tab: 'workplace' });
    Object.entries({ '#wp-name': 'Willow Court Care Home (demo)', '#wp-addr': '3 Example Street, Nottingham', '#wp-pc': 'NG1 0ZZ', '#wp-cn': 'Mr Tomasz Nowak', '#wp-ce': 't.nowak@willowcourt.example', '#wp-cp': '0115 496 0456', '#wp-role': 'Care assistant', '#wp-shift': 'Days' }).forEach(([s, v]) => { const e = $(s); if (e) e.value = v; }); SUBMIT.wpSave();
    wpcSync(); const l = STORE.wpc.links.find(x => x.v === OC1_KEY && x.kind === 'perm' && x.status === 'Active'); if (!l) throw new Error('No permission link');
    STORE.wpc.drafts[l.token] = { name: 'Mr Tomasz Nowak', title: 'Manager', titleOther: '', home: 'Willow Court Care Home (demo)', auth: true, agree: true, sig: 'Tomasz Nowak', cond: '' }; SUBMIT.wpcGrant({ dataset: { t: l.token } });
    if (w().workplace.perm !== 'Granted') throw new Error('Permission not granted');
    logA('Observations', `${chFullName(w())} (${lid()})`, 'Demo step: workplace permission granted through the secure link', 'Pending', 'Granted', 'Client demo — the workplace contact\'s decision is simulated');
    asCoord(); [['EV-2', 'workplace'], ['EV-3', 'workplace'], ['EV-1', 'office']].forEach(([e, loc]) => { go('c-learner', { id: lid(), tab: 'observations' }); const sel = $('#d-loc-' + e); if (!sel) throw new Error('No location choice for ' + e); sel.value = loc; ACT.dObsLoc({ dataset: { l: lid(), e } }); });
    const rq = dReq(w(), dCtx(w()).evs.find(e => e.id === 'EV-1')); if (!rq) throw new Error('No Academy-office request');
    cdAs(OC1_KEY); go('observations'); ACT.chOrConsent({ dataset: { id: rq.id, a: 'accept' } }); if (MODAL) ok1();
    aca(); ACT.qDo({ dataset: { id: rq.qid, a: 'approve' } }); if (MODAL) ok1('Client demo — practical room available for the combined observation');
    if (rq.status !== 'Approved') throw new Error('Academy-office request not approved (' + rq.status + ')');
  });
  // 6. Visit 1 (Unit 1 · Module 1): signed off with one criterion Not Yet Competent and one Academy criterion Not yet met
  step('Visit 1 — Workplace safety', () => { const o = propose('EV-2', 14); const saf2 = 'SAF-02';
    record(o, { '001 3.1': [1, 1, 'Correct technique throughout.'], '001 3.2': [1, 0, 'Did not check the hoist sling before use.'] }, { [saf2]: 'Not yet met' }); });
  // 7. The follow-up: only the outstanding criteria (001 3.2, SAF-02); signed off — 001 3.2 is now Achieved, Visit 1 unchanged
  step('Follow-up — Workplace safety', () => { const o = propose('FU:EV-2', 28); if (!o.dFu) throw new Error('Not a follow-up');
    record(o, { '001 3.2': [1, 1, 'Checked the sling and the hoist before use; safe transfer.'] }, {}); });
  // 8. Visit 2 (Unit 2 · Module 1) at the workplace and the combined visit (two units) at the Academy office: confirmed, not recorded
  step('Visit 2 — Person-centred support', () => { propose('EV-3', 42); });
  step('Combined visit — Academy office', () => { propose('EV-1', 56); });
  closeModal(); S.ui = {};
}
if (typeof drPanel === 'function') { const _drPanelOC1 = drPanel; drPanel = function () {
  const h = _drPanelOC1.apply(this, arguments); if (typeof drOn === 'function' && !drOn()) return h;
  const ctl = `<div class="dr-ctl oc1-ex">${oc1ExOn() ? `<p class="small">${chip('Observation planning examples loaded', 'green')}</p>` : `<button class="btn" data-act="oc1Examples">${ic('plus', 15)} Load observation planning examples</button>`}<p class="xs muted">Version 2 of the demo programme with observation plans across two units, two Academy categories, and ${esc(OC1_NAME)} on batch ${OC1_B} with a signed visit, a signed follow-up and two confirmed visits (one at the Academy office).</p></div>`;
  return h.replace('<div class="dr-ctl dr-devl">', ctl + '<div class="dr-ctl dr-devl">'); }; }
ACT.oc1Examples = () => {
  if (typeof drOn === 'function' && !drOn()) { toast('Load the client demo first (Reset demo).', 'err'); return false; }
  if (oc1ExOn()) { toast('The examples are already loaded.', 'info'); return; }
  confirmDlg({ title: 'Load the observation planning examples?', ok: 'Load examples', body: `<p class="small">Runs, through the normal screens and as their roles: the Academic Admin adds the library category SAF and publishes Version 2 of the demo programme (a second observed outcome in Unit 1, a second unit, three observation plans); batch ${OC1_B} is created on Version 2 and ${esc(OC1_NAME)} enrols on it; her workplace gives permission (simulated, audited); her Coordinator chooses the locations (one Academy office, approved); James Pryce records and signs off a visit and its follow-up, and confirms two more visits. Learners on Version 1 are unchanged. Reset demo removes it all.</p>`,
    onOk: () => { const run = () => oc1DemoBuild(); if (typeof fxQuiet === 'function') fxQuiet(run); else run(); OC1().examples = true; S.demoOpen = false; signOut();
      const e = OC1().demoErr || []; toast(e.length ? 'Examples loaded with problems: ' + e.join('; ') : 'Observation planning examples loaded. Choose a demo identity to continue.', e.length ? 'err' : 'info'); } });
};

/* ---------- Records ---------- */
UXC.push(['OC1', 'Observation configuration, curriculum mapping and multiple visits (18 Nov 2026)', [
  'Course Builder → Observations: an "NVQ observation coverage" map lists the version\'s Observation / Competency criteria by unit → module → learning outcome with the Required Observations (observation plans) that cover each; uncovered criteria are flagged and block publishing (as before). Academy observation categories keep their Category → criteria hierarchy.',
  'A Required Observation (plan) may combine criteria from several units and modules; its dialog groups them by unit → module → learning outcome, and can narrow the Academy categories used on its workplace visits. Each plan previews its coverage.',
  'Academy-office visits assess NVQ criteria only (FR-ADM-20-07): Academy-defined criteria are left out of an office visit but stay in the plan and in published versions.',
  'Proposing a visit: choose the plan (or "Follow-up" for a plan whose signed visit left criteria outstanding), review the grouped scope and untick or add eligible criteria of the learner\'s own version. The handler refuses Knowledge criteria, criteria of another version or programme, Academy criteria at the Academy office and duplicates.',
  'Signed visits are never changed; a later visit adds to each criterion\'s history and never downgrades a criterion already Achieved and locked. One observation fee per learner per course, as before.',
  'The Observation Book groups each plan\'s criteria by unit → module → learning outcome and by Academy category, numbers the visits with their record IDs and follow-up links, and shows what is still outstanding.']]);
const _aIdxOC1 = SCREENS['a-index'];
SCREENS['a-index'] = p => { const pid = typeof fxClient === 'function' && fxClient() && typeof cdPr === 'function' && cdPr() ? cdPr().id : 'NV-L3'; return _aIdxOC1(p) + `<section class="card idx-sec"><h2>OC1 — Observation plans, coverage and visits</h2><ul class="idx-list">${[
  chIdxLi('Programme builder — Observations (coverage map, plans, Academy categories)', { act: 'aJump', t: 'a-programmes.' + pid + '.observations' }, 'OC1 — NVQ coverage by unit → module → outcome; plans across modules; office = NVQ only.'),
  chIdxLi('Observation Criteria Library', { go: 'k-ocl' }, 'OC1 — categories and their nested criteria (Demo controls → observation planning examples add SAF).')].join('')}</ul></section>`; };
