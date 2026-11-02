/* ============================================================
   CO-1 — Competency map and PD in assignment evaluation (2 Nov 2026; PD-CO1-* in PROVISIONAL-DECISIONS.md). Loads last.
   1 Cohort Competency Map (Coordinator Progress & Competency and a learner's Progress tab, the Assessor's Progress & Gap Analysis
     and a learner's Competency map tab) reads each learner's own programme and criterion record. One table per programme and batch,
     with that programme's criteria as columns. A learner with a learner record shows its five states. A learner without one shows
     only what was really published for them (Assessor marking, verified locks) and "—" everywhere else: no states are invented.
     Readiness, the unit bars, the cells and the cell details are all read from the same record. A submission or resubmission puts
     the submitted questions' unlocked criteria (Not Started / Action Required) In Progress, never Achieved. Coordinator judgements
     and the final Pass / Fail are shown beside the status but never change it (PD-R3-02 / -03, R3).
   2 Professional Discussion: an Assessor's PD list is the learners they hold the PD allocation for (batch allocation, then any
     per-learner override), whatever the programme. PD items show before a session is scheduled, with who added them and the PD
     assessor. The Coordinator's assignment review and the Assessor's marking view get a read-only PD panel. The PD outcome needs an
     explicit Met / Not Met per item (nothing preselected), and its notes, author and date are kept for both. Adding or scheduling a
     PD never verifies a criterion or decides the final Pass / Fail.
   3 Learners without a learner record (legacy data): the Coordinator's view of a submission shows the Assessor's published marking
     when it is stored under that same learner, assignment and batch key (STORE.tas.rel); anything else stays as it was.
   ============================================================ */
'use strict';

/* ---------- 1. One criterion record per learner ---------- */
const CO1_AB = { 'Not Started': 'NS', 'In Progress': 'IP', 'Action Required': 'AR', 'Added to PD': 'PD', 'Achieved': 'A' };
const CO1_ST = FIVE.map(([k]) => k);
const co1Esc = s => esc(s == null ? '' : String(s));
// The criteria of a curriculum tree, the same shape (and type labels) as allCrit()
const co1CritsOf = tree => { const keep = W; W = { tree }; try { return allCrit(); } finally { W = keep; } };
const co1Prog = L => (L.batch && (L.batch.course || L.batch.label)) || '';
// Published marking for a learner without a learner record: only what is stored under their own learner · assignment · batch key
function co1Published(L, codes) {
  const st = {}, src = {};
  (BASE_ASGS() || []).forEach(a => {
    const r = STORE.tas.rel[acKey(L.lid, a.id, L.batch)]; if (!r || !r.items) return;
    Object.entries(r.items).forEach(([qid, x]) => {
      const k = a.qs.findIndex(q => q.id === qid), q = a.qs[k]; if (!q || !codes.has(q.crit)) return;
      st[q.crit] = x.exit === 'resub' || x.met === 'Not Met' ? 'Action Required' : x.exit === 'pd' ? 'Added to PD' : 'In Progress';
      src[q.crit] = { from: `${a.title.split(' —')[0]} · Q${k + 1}`, by: x.by || r.by, at: x.at || r.at };
    });
  });
  Object.entries(STORE.tas.locks || {}).forEach(([k, v]) => { const i = k.indexOf('|'), lid = k.slice(0, i), code = k.slice(i + 1); if (lid === L.lid && codes.has(code)) { st[code] = 'Achieved'; src[code] = { ...(src[code] || {}), lock: v }; } });
  return { st, src };
}
// { L, live, prog, ver, crits, st: code → state (absent = no record), src, ready, five, why }
function co1Rec(L) {
  if (!L || L.short) return null;
  const w = L.v && STORE.worlds[L.v];
  if (w && w.tree && w.tree.length) {
    const crits = withW(L.v, () => allCrit()), st = {}, src = {};
    crits.forEach(c => { st[c.code] = CO1_ST.includes(c.st) ? c.st : 'Not Started'; src[c.code] = { from: c.src || '', at: c.date || null, lock: c.lock || null }; });
    const n = crits.filter(c => st[c.code] === 'Achieved').length;
    return { L, live: true, prog: (w.nvq && w.nvq.title) || co1Prog(L), ver: w.nvq && w.nvq.progVersion ? 'Version ' + w.nvq.progVersion : '', crits, st, src, ready: crits.length ? Math.round(n / crits.length * 100) : null, five: co1Five(crits, st) };
  }
  const ctx = typeof fPortCtx === 'function' ? fPortCtx(L.lid, [{ programme: co1Prog(L) }]) : { tree: null, prog: co1Prog(L), why: 'The programme curriculum can\'t be resolved.' };
  const crits = ctx.tree ? co1CritsOf(ctx.tree) : [], p = co1Published(L, new Set(crits.map(c => c.code)));
  return { L, live: false, prog: ctx.prog || co1Prog(L), ver: ctx.ver || '', crits, st: p.st, src: p.src, ready: null, five: co1Five(crits, p.st), why: ctx.tree ? '' : (ctx.why || 'The programme curriculum can\'t be resolved.') };
}
function co1Five(crits, st) { const c = {}; CO1_ST.forEach(k => { c[k] = 0; }); crits.forEach(x => { if (st[x.code]) c[st[x.code]]++; }); return c; }
// Learners grouped by batch and programme; each group's columns are its programme's criteria, in curriculum order
function co1Groups(ls) {
  const g = new Map();
  ls.forEach(L => {
    const r = co1Rec(L); if (!r) return;
    const k = (L.batch ? L.batch.code : '—') + '|' + r.prog;
    if (!g.has(k)) g.set(k, { b: L.batch, prog: r.prog, ver: r.ver, rows: [], cols: [] });
    const G = g.get(k); G.rows.push(r); r.crits.forEach(c => { if (!G.cols.some(x => x.code === c.code)) G.cols.push(c); });
  });
  return [...g.values()];
}
const co1Known = r => Object.keys(r.st).length > 0;
const co1Link = L => S.portal === 'staff' ? `<a href="#t-students.${L.lid}" data-go="t-students" data-id="${L.lid}">${co1Esc(L.name)}</a>` : `<a href="#c-learner.${L.lid}" data-go="c-learner" data-id="${L.lid}">${co1Esc(L.name)}</a>`;
function co1Cell(r, c) {
  const st = r.st[c.code], tone = st ? 'f-' + TONE[st] : 'co1-none', t = st || (r.crits.some(x => x.code === c.code) ? 'No criterion record' : 'Not in this learner\'s programme');
  return `<td><button class="hc ${tone}" data-act="hmCell" data-l="${r.L.lid}" data-b="${r.L.batch ? r.L.batch.code : ''}" data-c="${co1Esc(c.code)}" title="${co1Esc(r.L.name)}: ${co1Esc(t)}" aria-label="${co1Esc(c.code)}, ${co1Esc(r.L.name)}: ${co1Esc(t)}">${st ? CO1_AB[st] : '—'}</button></td>`;
}
const co1Legend = () => `<div class="co1-legend five-legend" role="list" aria-label="Key">${FIVE.map(([k, tone, d]) => `<span class="co1-k" role="listitem"><span class="hc f-${tone}" aria-hidden="true">${CO1_AB[k]}</span><span><strong>${k}</strong> <span class="xs muted">${co1Esc(d)}</span></span></span>`).join('')}<span class="co1-k" role="listitem"><span class="hc co1-none" aria-hidden="true">—</span><span><strong>No record</strong> <span class="xs muted">No criterion record for this learner — nothing is assumed</span></span></span></div>`;
function co1Group(G, by) {
  const units = []; G.cols.forEach(c => { if (!units.some(u => u.code === c.unit)) units.push({ code: c.unit, title: c.unitTitle }); });
  const unitBar = u => { const c = {}; CO1_ST.forEach(k => { c[k] = 0; }); G.rows.forEach(r => G.cols.filter(x => x.unit === u.code).forEach(x => { const s = r.st[x.code]; if (s) c[s]++; })); const n = CO1_ST.reduce((a, k) => a + c[k], 0); return `<div class="row" style="gap:10px"><span class="small" style="width:60px"><span class="code" title="${co1Esc(u.title)}">${co1Esc(u.code)}</span></span><div style="flex:1">${n ? fiveBar(c) : '<span class="xs muted">No criterion records</span>'}</div></div>`; };
  const why = G.rows.find(r => r.why);
  const head = by === 'learner' ? `<th>Learner</th>${G.cols.map(c => `<th class="mono xs" title="${co1Esc(c.d)}">${co1Esc(c.code)}</th>`).join('')}<th>Readiness</th>` : `<th>Criterion</th>${G.rows.map(r => `<th class="xs" title="${co1Esc(r.L.name)}">${co1Esc(r.L.name.split(' ')[0])}</th>`).join('')}<th>Achieved</th>`;
  const body = by === 'learner'
    ? G.rows.map(r => { const fl = r.L.flags || []; return `<tr class="${fl.includes('Stalled') || fl.includes('Projected late') ? 'row-esc' : ''}"><td class="nowrap">${co1Link(r.L)}${fl.includes('Projected late') ? ' ' + chip('Projected late', 'red') : ''}</td>${G.cols.map(c => co1Cell(r, c)).join('')}<td class="co1-ready">${r.ready == null ? '<span title="No learner criterion record">—</span>' : r.ready + '%'}</td></tr>`; }).join('')
    : G.cols.map(c => { const known = G.rows.filter(r => r.st[c.code]), a = known.filter(r => r.st[c.code] === 'Achieved').length; return `<tr><td class="nowrap"><span class="code" title="${co1Esc(c.d)}">${co1Esc(c.code)}</span> ${critType(c.typeName || c.type)}</td>${G.rows.map(r => co1Cell(r, c)).join('')}<td>${known.length ? Math.round(a / known.length * 100) + '%' : '—'}</td></tr>`; }).join('');
  return `<section class="co1-grp" data-prog="${co1Esc(G.prog)}" data-batch="${G.b ? co1Esc(G.b.code) : ''}" aria-label="${co1Esc(G.prog)}"><h3 class="co1-gh">${co1Esc(G.prog)}<span class="xs muted"> · ${G.b ? `${co1Esc(G.b.label)} <span class="mono">${co1Esc(G.b.code)}</span>` : '—'}${G.ver ? ' · ' + co1Esc(G.ver) : ''} · ${plural(G.rows.length, 'learner')}</span></h3>
    ${why && !G.cols.length ? `<div class="note b-amber" role="status">${ic('alert')}<div class="small"><strong>Curriculum unavailable.</strong> ${co1Esc(why.why)}</div></div>` : ''}
    ${G.cols.length ? `<div class="co1-units"><span class="xs strong">Criteria by unit</span>${units.map(unitBar).join('')}</div><div class="tbl-wrap"><table class="tbl dense heat"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>` : ''}</section>`;
}
// The map (replaces coord.js heatmap — every caller, Coordinator and Assessor, draws this one)
heatmap = function (ls) {
  ls = (ls || []).filter(l => !l.short && (l.v || l.progress > 0));
  if (!ls.length) return `<div class="card"><div class="empty"><p>No progress yet — this batch hasn't started.</p></div></div>`;
  const by = ui('hmBy', 'learner'), G = co1Groups(ls), rows = G.flatMap(g => g.rows), rd = rows.filter(r => r.ready != null);
  return `<div class="kpis">${kpi('Batch readiness', rd.length ? Math.round(rd.reduce((a, r) => a + r.ready, 0) / rd.length) + '%' : '—')}${kpi('Stalled learners', ls.filter(l => (l.flags || []).includes('Stalled')).length)}${kpi('Projected late', ls.filter(l => (l.flags || []).includes('Projected late')).length)}${kpi('Evidence shortfalls', rows.filter(r => r.five['Action Required'] > 1).length)}</div>
  <section class="card co1-map"><div class="row-b"><h2>Cohort competency map</h2><div class="seg" role="group" aria-label="Rows"><button aria-pressed="${by === 'learner'}" data-act="hmBy" data-b="learner">By learner</button><button aria-pressed="${by === 'criterion'}" data-act="hmBy" data-b="criterion">By criterion</button></div></div>
  <p class="small muted">Each learner's own programme and criterion record. Readiness is the share of that learner's criteria Achieved.</p>${co1Legend()}
  ${G.map(g => co1Group(g, by)).join('')}
  <p class="xs muted">Click a cell to see the evidence. A criterion becomes Achieved only when the Assessor's verified judgement is published or the PD assessor records Met. Coordinator judgements and the final Pass / Fail are shown in the details but don't change the status.</p></section>`;
};
// The cell details: the same record as the cell, judgements by role beside it
const co1JudgOf = (lid, code) => { const j = (STORE.r3 && STORE.r3.judg) || {}; return Object.keys(j).filter(k => k.split('~')[0] === lid).flatMap(k => j[k].filter(x => x.crit === code && x.published)); };
ACT.hmCell = el => {
  const ds = (el && el.dataset) || {}, staff = S.portal === 'staff';
  const L = (staff ? tasLearners(true) : myLearners(true)).find(l => l.lid === ds.l && (!ds.b || !l.batch || l.batch.code === ds.b));
  if (!L) return w0Deny('Progress', String(ds.l || '—'), 'open a learner\'s competency', staff ? 'This learner isn\'t allocated to you.' : 'This learner isn\'t in your batches.');
  const r = co1Rec(L), c = r && r.crits.find(x => x.code === ds.c);
  if (!c) return toast('That criterion isn\'t in this learner\'s programme.', 'err');
  const st = r.st[c.code], s = r.src[c.code] || {}, J = co1JudgOf(L.lid, c.code), last = role => J.filter(x => x.role === role).slice(-1)[0];
  const w = L.v && STORE.worlds[L.v], pi = w && w.pd ? w.pd.items.find(i => i.ref === c.code) : null;
  const jl = (role, lbl) => { const x = last(role); return x ? `<li class="li"><div class="li-b">${chip(x.value, r3Tone(x.value))} <span class="small">${lbl} · ${co1Esc(x.by)} · ${fdt(x.pubAt || x.at)} · ${co1Esc(x.round)}</span></div></li>` : ''; };
  const jh = jl('Assessor', 'Assessor') + jl('Academic Coordinator', 'Coordinator');
  openModal({ title: `${co1Esc(c.code)} — ${co1Esc(L.name)}`, sub: `${co1Esc(r.prog)} · ${L.batch ? co1Esc(L.batch.label) : '—'}`, body: `<p>${co1Esc(c.d)}</p><p class="small">${c.lo ? `<span class="code">${co1Esc(c.lo)}</span> ${co1Esc(c.loTitle || '')} · ` : ''}${critType(c.typeName || c.type)}</p>
    <dl class="kv co1-cell"><dt>Status</dt><dd>${st ? chip(st) : `<span class="chip t-outline">No record</span> <span class="xs muted">${r.live ? '' : 'This learner has no learner criterion record; only published marking is shown.'}</span>`}</dd>
      <dt>Evidence</dt><dd class="small">${co1Esc(s.from || (st && st !== 'Not Started' ? '—' : 'None yet'))}${s.at ? ' · ' + fd(s.at) : ''}</dd>
      ${s.lock ? `<dt>Verified</dt><dd class="small">${ic('lock', 12)} ${co1Esc(s.lock.by)} · ${fdt(s.lock.at)}</dd>` : ''}
      ${pi ? `<dt>PD item</dt><dd class="small">${chip(pi.status)} ${co1Esc(pi.from)}</dd>` : ''}</dl>
    ${jh ? `<h3>Published judgements</h3><ul class="list small">${jh}</ul><p class="xs muted">Shown for information. A Coordinator's judgement doesn't change the criterion status (PD-R3-03); the Assessor's verified Met does.</p>` : ''}
    <p class="small">${lockNote()}</p>`, actions: [{ label: 'Close' }] });
};
// A learner without a learner record: their own programme's tree with only what is recorded for them
synthTreeHtml = function (L) {
  const r = co1Rec(L); if (!r || !r.crits.length) return `<div class="card"><div class="note b-amber" role="status">${ic('alert')}<div class="small"><strong>Curriculum unavailable.</strong> ${co1Esc((r && r.why) || 'The programme curriculum can\'t be resolved.')}</div></div></div>`;
  const units = []; r.crits.forEach(c => { if (!units.some(u => u.code === c.unit)) units.push({ code: c.unit, title: c.unitTitle }); });
  return `<p class="small muted co1-prog"><strong>${co1Esc(r.prog)}</strong>${r.ver ? ' · ' + co1Esc(r.ver) : ''} — no learner criterion record: only published marking is shown, "—" elsewhere.</p><section class="card pad0"><div class="tree">${units.map(u => { const cs = r.crits.filter(c => c.unit === u.code); return `<details class="lvl-1"><summary><span class="caret">${ic('chev', 16)}</span><span class="tw"><span class="strong"><span class="code">${co1Esc(u.code)}</span> ${co1Esc(u.title)}</span></span><span class="tm">${fiveBar(co1Five(cs, r.st), 'sm')}</span></summary><div class="kids">${cs.map(c => { const st = r.st[c.code], s = r.src[c.code] || {}; return `<div class="crit-row"><div><span class="code">${co1Esc(c.code)}</span> ${critType(c.typeName || c.type)} ${st ? chip(st) : '<span class="chip t-outline">—</span>'}<div class="small">${co1Esc(c.d)}</div><div class="xs muted">Evidence: ${st ? co1Esc(s.from || '—') : 'no record'}</div></div></div>`; }).join('')}</div></details>`; }).join('')}</div></section>`;
};
// Assessor Progress & Gap Analysis: the same records; the gap summary counts only criteria with a record
const _tProgCO1 = SCREENS['t-progress'];
SCREENS['t-progress'] = p => {
  const h = _tProgCO1(p), i = typeof h === 'string' ? h.indexOf('<section class="card"><h2>Cohort gap summary') : -1; if (i < 0) return h;
  const j = h.indexOf('</section>', i) + '</section>'.length, G = co1Groups(tasLearners().filter(l => !l.short && (l.v || l.progress > 0)));
  const top = G.flatMap(g => g.cols.map(c => { const known = g.rows.filter(r => r.st[c.code]); return { g, c, n: known.filter(r => r.st[c.code] !== 'Achieved').length, of: known.length }; })).filter(x => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 8);
  const sec = `<section class="card"><h2>Cohort gap summary — most often outstanding</h2>${top.length ? `<table class="tbl dense"><tbody>${top.map(x => `<tr><td><span class="code">${co1Esc(x.c.code)}</span> <span class="small">${co1Esc(x.c.d)}</span><div class="xs muted">${co1Esc(x.g.prog)}</div></td><td class="r">${x.n} of ${plural(x.of, 'learner')} with a record</td><td><button class="btn btn-sm" data-act="tasRec" data-c="${co1Esc(x.c.code)}">Add recommended action</button></td></tr>`).join('')}</tbody></table>` : '<p class="small muted">No outstanding criteria with a record.</p>'}</section>`;
  return h.slice(0, i) + (hasRole('Assessor') ? sec : tasStripRec(sec)) + h.slice(j);
};

/* ---------- Submission and resubmission: the submitted questions' unlocked criteria are In Progress (never Achieved) ---------- */
function co1Submitted(w, codes) {
  if (!w || !w.tree || !codes.length) return;
  w.tree.forEach(u => u.mods.forEach(m => m.los.forEach(lo => lo.crit.forEach(c => { if (codes.includes(c.code) && !c.lock && ['Not Started', 'Action Required'].includes(c.st || 'Not Started')) c.st = 'In Progress'; }))));
}
const _finCO1 = finaliseSubmit;
finaliseSubmit = function (a, resub, at) {
  const w = W, qs = a && a.qs ? (resub ? a.qs.filter(q => q.state === 'rework') : a.qs) : [];
  const r = _finCO1.apply(this, arguments);
  if (a && a.status === 'Submitted' && a.submittedAt === at && w && w.assignments && w.assignments.includes(a)) co1Submitted(w, qs.flatMap(qCrits)); // AA-1 (D2): every mapped criterion
  return r;
};
if (ACT.tasSimResub) { const _simCO1 = ACT.tasSimResub; ACT.tasSimResub = el => { const w = STORE.worlds.C, a = w && w.assignments.find(x => x.id === 'a2'), qs = a ? a.qs.filter(q => q.state === 'rework') : [], n = a ? a.resubUsed : 0; const r = _simCO1(el); if (a && a.resubUsed === n + 1 && a.status === 'Submitted') co1Submitted(w, qs.flatMap(qCrits)); return r; }; }

/* ---------- 3. Published marking under the same learner · assignment · batch key reaches the Coordinator ---------- */
// Ownership: the record is the one the Assessor published for this learner, assignment and batch (acKey); a record whose questions
// don't belong to this assignment is ignored (fail closed) and the row stays as it was.
const co1Rel = row => { if (!row || row.live || !row.a) return null; const r = STORE.tas.rel[row.key]; return r && r.items && Object.keys(r.items).some(q => row.a.qs.some(x => x.id === q)) ? r : null; };
const _subRowCO1 = subRow;
subRow = function () { const r = _subRowCO1.apply(this, arguments), rel = co1Rel(r); if (rel) { r.status = rel.status; r.round = rel.round || r.round; r.waiting = null; r.pd = r.pd || Object.values(rel.items).some(x => x.exit === 'pd'); } return r; };
const _synthCO1 = synthAsg;
synthAsg = function (row) {
  const a = _synthCO1.apply(this, arguments), rel = co1Rel(row); if (!rel) return a;
  return { ...a, status: rel.status, round: rel.round || a.round, overall: rel.overall || a.overall, assessor: rel.by || a.assessor, timeline: [['Submitted', row.at], [rel.status, rel.at]],
    qs: a.qs.map(q => { const R = rel.items[q.id]; return R ? { ...q, fb: [{ rag: R.rag, text: R.text, by: R.by, at: R.at }], state: R.exit === 'resub' ? 'rework' : R.exit === 'pd' ? 'pd' : 'met', pdReason: R.exit === 'pd' ? (R.pdReason || q.pdReason) : q.pdReason } : q; }) };
};

/* ---------- 2. Professional Discussion ---------- */
// Publication: the PD item records who added it and when; for a learner without a learner record the published judgement is kept
// with the marking and the item joins their PD checklist (STORE.tas.pd)
const _relCO1 = releaseFeedback;
releaseFeedback = function (s, a, d) {
  const w = s && s.live && s.L && s.L.v ? STORE.worlds[s.L.v] : null, n0 = w && w.pd ? w.pd.items.length : 0, rel0 = s ? STORE.tas.rel[s.key] : null, me = TME().name;
  const r = _relCO1.apply(this, arguments); if (!s) return r;
  const at = STORE.tas.marked[s.key] || now().toISOString();
  if (w && w.pd) { w.pd.items.slice(0, Math.max(0, w.pd.items.length - n0)).forEach(i => { if (!i.by) Object.assign(i, { by: me, at, aid: a.id }); }); return r; }
  const rel = !s.live && STORE.tas.rel[s.key]; if (!rel || !rel.items || rel === rel0) return r; // nothing new was published
  Object.entries(rel.items).forEach(([qid, x]) => { const it = d && d.items && d.items[qid]; if (it && R3_VALS.includes(it.met)) x.met = it.met; });
  const pds = Object.entries(rel.items).filter(([, x]) => x.exit === 'pd'); if (!pds.length) return r;
  let t = STORE.tas.pd.find(x => x.lid === s.L.lid); if (!t) { t = { lid: s.L.lid, name: s.L.name, items: [], session: null, history: [] }; STORE.tas.pd.push(t); }
  t.meta = t.meta || {};
  pds.forEach(([qid, x]) => { const k = a.qs.findIndex(q => q.id === qid), q = a.qs[k]; if (!q || t.items.some(i => i[0] === q.crit && i[3] === 'Open')) return; t.items.push([q.crit, `${a.title.split(' —')[0]} · Q${k + 1}`, x.pdReason || '', 'Open']); t.meta[q.crit] = { by: me, at, aid: a.id }; });
  return r;
};
// The learner's PD assessor: the session's assessor once proposed, otherwise the allocation (batch, then override)
const co1PdWho = (lid, s, b) => (s && s.with) || (typeof chEff === 'function' ? chEff(lid, 'pd', b) : '') || '';
const co1FbBy = q => { const f = (q.fb || []).slice(-1)[0]; return f && f.by; };
// Assessor PD lists: the learners this person holds the PD allocation for, from the caseload (not named legacy learners)
tasPdList = function () {
  const ls = tasLearners(true).filter(l => !l.short), rank = v => v === 'C' ? 0 : v === 'D' ? 1 : 2, seen = new Set(), out = [];
  ls.filter(l => l.v && STORE.worlds[l.v] && STORE.worlds[l.v].pd).sort((x, y) => rank(x.v) - rank(y.v)).forEach(l => {
    const w = STORE.worlds[l.v]; if (seen.has(w.me.id)) return; seen.add(w.me.id);
    out.push({ lid: w.me.id, name: VNAME(l.v), v: l.v, items: w.pd.items.map(i => [i.ref, i.from, i.reason, i.status, i]), session: w.pd.session, history: w.pd.history || [] });
  });
  const lids = new Set(ls.map(l => l.lid));
  STORE.tas.pd.forEach(p => { if (lids.has(p.lid) && !seen.has(p.lid)) { seen.add(p.lid); out.push(p); } });
  return chScoped() ? out.filter(p => chEff(p.lid, 'pd') === chMe()) : out;
};
// The PD assessor acting on a learner with no PD record: refused with a message instead of an error
['pdPropose', 'pdPostpone', 'pdOutcome'].forEach(k => { const f = ACT[k]; if (!f) return; ACT[k] = (el, e) => {
  const lid = el && el.dataset && el.dataset.l;
  if (lid && S.portal === 'staff' && CAN('pd') !== 'no' && chEff(lid, 'pd') === chMe() && !pdOf(lid)) { tasLog('PD', lid, 'Blocked: no PD record', '—', '—', 'The learner has no Professional Discussion record'); toast('There is no Professional Discussion record for this learner.', 'err'); return false; }
  return f(el, e);
}; });
// Proposing the first session: no history line from an unscheduled session; the learner's calendar gets the PD event
const _pdPropCO1 = ACT.pdPropose;
ACT.pdPropose = (el, e) => {
  const m0 = MODAL, r = _pdPropCO1(el, e), lid = el && el.dataset && el.dataset.l;
  if (!MODAL || MODAL === m0 || MODAL.title !== 'Propose PD session') return r;
  const p = pdOf(lid), w = p && p.v ? STORE.worlds[p.v] : null, send = MODAL.actions.find(a => a.label === 'Send proposal'); if (!w || !send) return r;
  const f0 = send.fn;
  send.fn = (...x) => {
    w.pd.history = w.pd.history || [];
    const blank = !!(w.pd.session && !w.pd.session.at), keep = w.pd.session; if (blank) w.pd.session = null;
    let res; try { res = f0(...x); } finally { if (!w.pd.session) w.pd.session = keep; }
    const s = w.pd.session; if (res === false || !s || !s.at || s === keep) return res;
    if (!w.events.some(v => v.id === 'epd')) { w.events.push({ id: 'epd', type: 'pd', title: 'Professional Discussion (proposed)', start: s.at, end: new Date(new Date(s.at).getTime() + 36e5).toISOString(), course: w.nvq ? w.nvq.title : '', loc: s.loc || null, go: 'progress..pd', ...(s.mode === 'phone_call' ? { mode: 'phone_call', loc: null } : {}) }); render(); }
    return res;
  };
  return r;
};
// Recording the outcome: an explicit Met / Not Met for each item; notes, author and date kept for both
const _pdOutCO1 = ACT.pdOutcome;
ACT.pdOutcome = (el, e) => {
  const m0 = MODAL, r = _pdOutCO1(el, e), lid = el && el.dataset && el.dataset.l;
  if (!MODAL || MODAL === m0 || MODAL.title !== 'Record PD outcome') return r;
  const p = pdOf(lid), act = MODAL.actions.find(a => a.label === 'Save outcomes and sign off'); if (!p || !act) return r;
  const open = p.items.filter(i => i[3] === 'Open');
  MODAL.body = MODAL.body.replace(/(name="pdo-\d+" value="Met") checked/g, '$1').replace(/<label for="pdn-(\d+)">Notes \/ next steps<\/label>/g, '<label for="pdn-$1">Notes / next steps (kept with the outcome)</label>')
    .replace('<label class="check"><input type="checkbox" id="pd-sign">', '<p class="xs muted co1-pd-hint">Choose Met or Not Met for each item — nothing is selected for you. Met verifies and locks the criterion; Not Met returns it to Action Required.</p><label class="check"><input type="checkbox" id="pd-sign">');
  renderModal();
  const f0 = act.fn;
  act.fn = (...x) => {
    const pick = open.map((i, k) => (($(`#modal-root input[name="pdo-${k}"]:checked`) || $(`input[name="pdo-${k}"]:checked`)) || {}).value || '');
    const miss = pick.findIndex(v => !['Met', 'Not Met'].includes(v)); if (miss >= 0) { toast(`Choose Met or Not Met for ${open[miss][0]}.`, 'err'); return false; }
    const notes = open.map((i, k) => (($('#pdn-' + k) || {}).value || '').trim()), live = i => !!(i[4] && typeof i[4] === 'object' && 'ref' in i[4]);
    const before = open.map(i => live(i) ? i[4].status : i[3]);
    const res = f0(...x); if (res === false) return res;
    const me = TME().name, at = now().toISOString(), t = p.v ? null : STORE.tas.pd.find(y => y.lid === lid); let n = 0;
    open.forEach((i, k) => {
      if ((live(i) ? i[4].status : i[3]) === before[k]) return; // not applied
      const rec = { result: pick[k], notes: notes[k], by: me, at }; n++;
      if (live(i)) i[4].outcome = rec; else if (t) { t.outcomes = t.outcomes || {}; t.outcomes[i[0]] = rec; }
      tasLog('PD', `${p.name} · ${i[0]}`, 'PD outcome recorded', 'Open', pick[k] === 'Met' ? 'Achieved' : 'Returned to Action Required', notes[k] || 'No notes');
    });
    if (n) { const s = p.v ? STORE.worlds[p.v].pd.session : t && t.session; if (s) Object.assign(s, { signedBy: me, signedAt: at }); else if (t) t.signOff = { by: me, at }; render(); }
    return res;
  };
  return r;
};
// The checklist: items show before a session is scheduled, with who added them and the PD assessor
function co1PdItemBy(w, i) { if (i.by) return i.by; const a = (i.go || '').startsWith('assignment.') ? w.assignments.find(x => 'assignment.' + x.id === i.go) : null, q = a && a.qs.find(y => y.crit === i.ref); return (q && co1FbBy(q)) || (a && a.assessor) || ''; }
const co1Out = o => o ? `${chip(o.result === 'Met' ? 'Met' : 'Not Met', o.result === 'Met' ? 'green' : 'red')} <span class="xs muted">${co1Esc(o.by)} · ${fdt(o.at)}</span>${o.notes ? `<div class="small">${co1Esc(o.notes)}</div>` : ''}` : '';
function co1PdChecklist(w) {
  const items = w.pd.items || [], who = co1PdWho(w.me.id, w.pd.session);
  return `<section class="card co1-pdl"><h2>PD consolidation checklist</h2><p class="small">PD assessor: <strong>${co1Esc(who || 'not allocated yet')}</strong></p>${items.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Criterion</th><th>From</th><th>Assessor's reason</th><th>Added by</th><th>Status</th></tr></thead><tbody>${items.map(i => `<tr><td><span class="code">${co1Esc(i.ref)}</span><div class="xs muted">${co1Esc(i.unit)}</div></td><td class="small">${i.go ? `<a href="#${i.go}" data-act="goTok" data-t="${i.go}">${co1Esc(i.from)}</a>` : co1Esc(i.from)}</td><td class="small">${co1Esc(i.reason)}</td><td class="small">${co1Esc(co1PdItemBy(w, i) || '—')}${i.at ? `<div class="xs muted">${fd(i.at)}</div>` : ''}</td><td>${chip(i.status)}${i.outcome ? `<div class="co1-pdo">${co1Out(i.outcome)}</div>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">Nothing has been added to your Professional Discussion yet.</p>'}</section>`;
}
const _pdSecCO1 = pdSection;
pdSection = function () {
  const h = _pdSecCO1.apply(this, arguments); if (!W || !W.pd || !W.me) return h;
  let out = h.replace(/<section class="card"><h2>PD consolidation checklist<\/h2>[\s\S]*?<\/section>/, () => co1PdChecklist(W));
  const s = W.pd.session, who = co1PdWho(W.me.id, s);
  if ((W.pd.items || []).length && !out.includes('You do not need to rework these items')) out = `<div class="note b-purple">${ic('users')}<div><strong>You do not need to rework these items.</strong> Your assessor will cover them with you in your Professional Discussion.</div></div>` + out;
  if (s && s.status === 'Not scheduled' && !s.with && who) out = out.replace('Your PD assessor will propose', `${co1Esc(who)}, your PD assessor, will propose`);
  return out;
};
// An unscheduled session (no date) is shown as "Not scheduled", not as a dated session
const _pdCardCO1 = pdCard;
pdCard = function (p) { const s = p && p.session; if (!s || s.at) return _pdCardCO1.apply(this, arguments); return _pdCardCO1({ ...p, session: null }).replace(chip('No session', 'grey'), chip('Not scheduled', 'grey')); };
// The Assessor's PD screen previews the first listed learner's own checklist (it named Aisha's, from the legacy data, for everyone)
const _tPdCO1 = SCREENS['t-pd'];
SCREENS['t-pd'] = p => {
  const h = _tPdCO1(p); if (typeof h !== 'string' || !STORE.worlds.C || !h.includes('<h2>What the learner sees</h2>')) return h;
  const old = `<section class="card"><h2>What the learner sees</h2><p class="small muted">Aisha's PD checklist as shown in the learner portal (preview, not clickable):</p><div inert>${withW('C', () => pdSection())}</div></section>`;
  const first = tasPdList().find(x => x.v && STORE.worlds[x.v]);
  return h.replace(old, () => first ? `<section class="card"><h2>What the learner sees</h2><p class="small muted">${co1Esc(first.name.split(' ')[0])}'s PD checklist as shown in the learner portal (preview, not clickable):</p><div inert>${withW(first.v, () => pdSection())}</div></section>` : '');
};

/* ---------- The read-only PD panel: Coordinator assignment review, Assessor marking view, learner assignment page ---------- */
function co1PdRows(L, a, key) {
  const out = [], tag = a.title.split(' —')[0];
  if (L.v && STORE.worlds[L.v]) {
    const w = STORE.worlds[L.v]; if (!w.pd) return out; const s = w.pd.session;
    a.qs.forEach((q, k) => qCrits(q).forEach(code => { // AA-1 (D2): one row per mapped criterion
      const it = (w.pd.items || []).find(i => i.ref === code && i.go === 'assignment.' + a.id); if (q.state !== 'pd' && !it) return;
      out.push({ q: k + 1, crit: code, from: it ? it.from : `${tag} · Q${k + 1}`, reason: (it && it.reason) || q.pdReason || '', by: (it && co1PdItemBy(w, it)) || co1FbBy(q) || a.assessor || '', at: it && it.at, status: it ? it.status : '', outcome: it && it.outcome, session: s, who: co1PdWho(L.lid, s, L.batch) });
    }));
    return out;
  }
  const rel = STORE.tas.rel[key], t = STORE.tas.pd.find(x => x.lid === L.lid); if (!rel || !rel.items) return out;
  a.qs.forEach((q, k) => {
    const x = rel.items[q.id]; if (!x || x.exit !== 'pd') return; const ti = t && t.items.find(i => i[0] === q.crit), m = (t && t.meta && t.meta[q.crit]) || {};
    out.push({ q: k + 1, crit: q.crit, from: ti ? ti[1] : `${tag} · Q${k + 1}`, reason: x.pdReason || (ti && ti[2]) || '', by: m.by || x.by || rel.by || '', at: m.at || x.at || rel.at, status: ti ? ti[3] : '', outcome: t && t.outcomes && t.outcomes[q.crit], session: t && t.session, who: co1PdWho(L.lid, t && t.session, L.batch), signOff: t && t.signOff });
  });
  return out;
}
function co1PdPanel(rows) {
  if (!rows.length) return '';
  const sess = s => !s || !s.at || s.status === 'Not scheduled' ? chip('Not scheduled', 'grey') : `${chip(s.status)} <span class="small">${fdt(s.at)}</span>`;
  const signed = x => { const o = x.outcome, s = x.session; return o ? `${co1Esc(o.by)} · ${fdt(o.at)}` : s && s.signedBy ? `${co1Esc(s.signedBy)} · ${fdt(s.signedAt)}` : x.signOff ? `${co1Esc(x.signOff.by)} · ${fdt(x.signOff.at)}` : '—'; };
  return `<section class="card co1-pd" aria-labelledby="co1-pd-h"><h2 id="co1-pd-h">Professional Discussion</h2>
    <p class="xs muted">Read-only. Adding an item to the PD, or scheduling the session, doesn't verify the criterion or decide the final Pass / Fail. Only the PD assessor's recorded outcome changes the criterion.</p>
    ${rows.map(x => `<div class="co1-pd-row" data-crit="${co1Esc(x.crit)}"><dl class="kv">
      <dt>Criterion</dt><dd><span class="code">${co1Esc(x.crit)}</span></dd>
      <dt>Assignment / question</dt><dd class="small">${co1Esc(x.from)}</dd>
      <dt>Assessor's reason</dt><dd class="small">${co1Esc(x.reason || '—')}</dd>
      <dt>Added by</dt><dd class="small">${co1Esc(x.by || '—')}${x.at ? ' · ' + fdt(x.at) : ''}</dd>
      <dt>Item status</dt><dd>${x.status ? chip(x.status) : '<span class="small muted">No checklist item recorded</span>'}</dd>
      <dt>PD session</dt><dd>${sess(x.session)}</dd>
      <dt>PD assessor</dt><dd class="small">${co1Esc(x.who || '—')}</dd>
      <dt>Outcome</dt><dd>${x.outcome ? co1Out({ ...x.outcome, notes: '' }) : x.status && x.status !== 'Open' ? `${chip(x.status)} <span class="xs muted">Recorded before outcome details were kept — no notes or sign-off stored.</span>` : '<span class="small muted">Not recorded yet</span>'}</dd>
      <dt>Notes</dt><dd class="small">${x.outcome && x.outcome.notes ? co1Esc(x.outcome.notes) : '—'}</dd>
      <dt>Signed off</dt><dd class="small">${signed(x)}</dd></dl></div>`).join('')}</section>`;
}
const co1Insert = (h, html, anchors) => { if (!html) return h; for (const a of anchors) { const i = h.indexOf(a); if (i >= 0) return h.slice(0, i) + html + h.slice(i); } return h + html; };
const _cSubCO1 = SCREENS['c-sub'];
SCREENS['c-sub'] = p => {
  const h = _cSubCO1(p), s = typeof h === 'string' && S.portal === 'coord' ? mySubmissions(true).find(x => x.key === (p && p.id)) : null; if (!s) return h;
  return co1Insert(h, co1PdPanel(co1PdRows(s.L, synthAsg(s), s.key)), ['<div class="r3-coo">', '<details class="card r3-cold">']);
};
const _tMarkCO1 = SCREENS['t-mark'];
SCREENS['t-mark'] = p => {
  const h = _tMarkCO1(p), s = typeof h === 'string' && S.portal === 'staff' ? tasSubs(true).find(x => x.key === (p && p.id)) : null; if (!s) return h;
  return co1Insert(h, co1PdPanel(co1PdRows(s.L, tasAsg(s), s.key)), ['<section class="card r3-out">']);
};
// The learner's assignment page: the PD items of this assignment with the Assessor who added them (no hardcoded name)
const _asgCO1 = SCREENS.assignment;
SCREENS.assignment = p => {
  let h = _asgCO1(p); if (typeof h !== 'string' || S.portal !== 'learner' || !W || !W.pd || !W.assignments) return h;
  const a = W.assignments.find(x => x.id === (p && p.id)); if (!a || !a.qs) return h;
  const pq = a.qs.filter(q => q.state === 'pd'); if (!pq.length) return h;
  let k = 0; h = h.replace(/<span class="xs">Sarah Okonkwo · /g, m => { const q = pq[k++], it = q && W.pd.items.find(i => i.ref === q.crit && i.go === 'assignment.' + a.id), by = (it && co1PdItemBy(W, it)) || (q && co1FbBy(q)); return by ? `<span class="xs">${co1Esc(by)} · ` : m; });
  if (h.includes('pd-tag')) return h;
  const s = W.pd.session, who = co1PdWho(W.me.id, s);
  const card = `<section class="card co1-pd-l" aria-labelledby="co1-pdl-h"><h2 id="co1-pdl-h">Professional Discussion</h2>${pq.map(q => { const it = W.pd.items.find(i => i.ref === q.crit && i.go === 'assignment.' + a.id), by = (it && co1PdItemBy(W, it)) || co1FbBy(q) || a.assessor || ''; return `<div class="pd-tag">${ic('users', 18)}<div class="stack" style="gap:4px"><strong>Q${a.qs.indexOf(q) + 1} · <span class="code">${co1Esc(q.crit)}</span> — Added to Professional Discussion — no rework needed</strong><span class="small">${co1Esc((it && it.reason) || q.pdReason || '')}</span><span class="xs">${co1Esc(by || '—')}${it && it.at ? ' · ' + fd(it.at) : ''}${it ? ' · ' + co1Esc(it.status) : ''}</span>${it && it.outcome ? `<span class="xs">Outcome: ${co1Esc(it.outcome.result)} · ${co1Esc(it.outcome.by)} · ${fd(it.outcome.at)}${it.outcome.notes ? ' — ' + co1Esc(it.outcome.notes) : ''}</span>` : ''}<span class="xs">PD session: ${!s || !s.at || s.status === 'Not scheduled' ? 'Not scheduled' : `${co1Esc(s.status)} · ${fdt(s.at)}`}${who ? ' · PD assessor ' + co1Esc(who) : ''}</span><a href="#progress..pd" data-go="progress" data-tab="pd" class="small">View PD checklist</a></div></div>`; }).join('')}</section>`;
  return co1Insert(h, card, ['<div class="paper">']);
};
