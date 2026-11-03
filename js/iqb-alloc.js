/* ============================================================
   IQA — batch-level IQA allocation (client confirmation, 3 Nov 2026; PD-IQB-01…). Loads after sib-c-business.js.
   Supersedes PD-SIB-B-02 ("no per-batch allocation"): an IQA is now allocated to batches, and sees only them.
   1 Allocation  An Academic Admin, a System Administrator or the Super Administrator (PD-IQB-09) assigns an active IQA to one or more NVQ batches from the batch's
                 Staff tab, reassigns or removes them; a reason is required, the impact is shown first, every change is audited and
                 the IQA is notified. Records live in STORE.iqaAlloc (saved with the demo); an ended allocation is kept as history.
                 Independence: an IQA can't be allocated to a batch they teach, assess or coordinate, and nobody allocated as a
                 batch's IQA can be made its Teacher, Assessor or Coordinator.
   2 Scope       Signed in as an IQA, every IQA record, learner, portfolio, finding and sample-set item outside the IQA's batches
                 is removed at the source (allIqaRecords, the learner scope) and every q- screen and IQA action refuses an
                 out-of-scope id (logged). The Super Administrator keeps oversight of every batch; no other role gains IQA access.
   3 Learners    One row per learner per assigned batch — the batch roster as well as anyone with marked work — so a learner with
                 nothing marked is listed truthfully. A batch filter (All assigned batches / one batch) on Learners, Assessment
                 Records and Portfolios.
   4 Sample sets The existing workflow; only records from assigned batches can be added; a set keeps items from a batch the IQA
                 was removed from (hidden from them, not deleted) and can't be exported while it holds them. No automatic
                 sampling and no minimum percentage.
   ============================================================ */
'use strict';

/* ---------- Allocation store ---------- */
const iqbS = () => { if (!STORE.iqaAlloc) STORE.iqaAlloc = { rows: [], seq: 0 }; return STORE.iqaAlloc; };
const iqbBatch = code => (ADMIN.batches || []).find(b => b.code === code) || null;
const iqbNvq = b => !!b && !b.short && !sibqShort(b.course);
const iqbOpen = b => iqbNvq(b) && b.status !== 'Cancelled';
const iqbRows = code => iqbS().rows.filter(r => !r.end && (!code || r.batch === code));
const iqbNamesOn = code => iqbRows(code).map(r => r.name);
const iqbCodesOf = name => [...new Set(iqbRows().filter(r => r.name === name).map(r => r.batch))];
const iqbStaff = () => ADMIN.staff.filter(s => (s.roles || []).includes('IQA') && s.status === 'Active');
function iqbAdd(code, name, by, reason, at) { const S_ = iqbS(), s = ADMIN.staff.find(x => x.name === name) || {}; const r = { id: 'IQB-' + String(++S_.seq).padStart(3, '0'), batch: code, sid: s.id || '', name, at: at || now().toISOString(), by, reason, end: null }; S_.rows.push(r); return r; }
// Starting allocations. Legacy: both IQAs on the three batches the earlier records, sets and findings belong to; James Pryce
// (variant C, IQA + Assessor) only on the Level 5 batch, where he holds no role. Client demo: IQA A on the demo NVQ batch.
function iqbSeed(client) {
  const S_ = iqbS(); S_.rows = []; S_.seq = 0;
  if (client) { if (iqbBatch(CD_B)) iqbAdd(CD_B, IQA_A, 'Demo setup', 'Client demo starting allocation', D(-20, '09:00')); return; }
  ['L3AC-JAN26', 'L2DC-MAR26', 'L5LM-JAN25'].forEach(c => { iqbAdd(c, IQA_A, 'Demo setup', 'Starting allocation', D(-200, '09:00')); iqbAdd(c, IQA_B, 'Demo setup', 'Starting allocation', D(-200, '09:00')); });
  iqbAdd('L5LM-JAN25', 'James Pryce', 'Demo setup', 'Starting allocation (variant C)', D(-200, '09:00'));
}
const _isIQB = initStore; initStore = function () { _isIQB.apply(this, arguments); STORE.iqaAlloc = { rows: [], seq: 0 }; iqbSeed(false); };
const _fxcIQB = fxLoadClient; fxLoadClient = function () { const r = _fxcIQB.apply(this, arguments); iqbSeed(true); return r; };
if (typeof STORE !== 'undefined' && STORE.worlds && !STORE.iqaAlloc) iqbSeed(fxClient());

/* ---------- Independence (G6.9 / CH-17, now enforced at allocation) ---------- */
const iqbCoords = b => (typeof mcList === 'function' ? mcList(b) : []).concat(b.coord ? [b.coord] : []);
function iqbIndepWhy(b, name) {
  if (!b || !name) return '';
  const role = (b.teachers || []).includes(name) ? 'a Teacher' : chRoleOn(b, name) ? 'the ' + chRoleOn(b, name) : (b.assessors || []).includes(name) ? 'an Assessor' : iqbCoords(b).includes(name) ? 'an Academic Coordinator' : '';
  return role ? `${name} is ${role} on ${b.code}, so they can't be its IQA (independence rule).` : '';
}
// The reverse: a batch's IQA can't be given a Teacher, Assessor or Coordinator responsibility on it
const iqbHeldWhy = (b, name, as) => b && name && iqbNamesOn(b.code).includes(name) ? `${name} is the IQA allocated to ${b.code}, so they can't also be its ${as} (independence rule). Remove the IQA allocation first.` : '';

/* ---------- Scope: what the signed-in IQA may see ---------- */
let IQB_RAW = 0, IQB_PICK = 0;
const iqbUnscoped = f => { IQB_RAW++; try { return f(); } finally { IQB_RAW--; } };
// null = no batch restriction (the Super Administrator's oversight); otherwise the IQA's assigned batch codes
const iqbScope = () => (IQB_RAW || !isIqa() ? null : iqbCodesOf(ADMIN.me.name));
const iqbRecBatch = r => { const b = sibqBatchOf(r.batch); return b ? b.code : r.batch; };
const iqbPick = () => { const c = (S.iqa && S.iqa.batch) || 'all', sc = iqbScope(); return c === 'all' || (sc && !sc.includes(c)) ? null : c; };
const _airIQB = allIqaRecords;
allIqaRecords = function () {
  const all = _airIQB.apply(this, arguments), sc = iqbScope(), pk = IQB_PICK && !IQB_RAW ? iqbPick() : null;
  return sc || pk ? all.filter(r => (!sc || sc.includes(iqbRecBatch(r))) && (!pk || iqbRecBatch(r) === pk)) : all;
};
let IQB_MEMO = null; // raw records by id, for the length of one admin render
const iqbRawIndex = () => new Map(iqbUnscoped(() => allIqaRecords()).map(r => [r.id, r]));
const iqbRawRec = id => (IQB_MEMO || iqbRawIndex()).get(id);
const iqbSeesRec = r => { const sc = iqbScope(); return !sc || (!!r && sc.includes(iqbRecBatch(r))); };
const iqbSeesF = f => { const r = iqbUnscoped(() => fRec(f)); return r ? iqbSeesRec(r) : (!iqbScope() || f.by === ADMIN.me.name); };
const iqbHidden = s => s.items.filter(id => { const r = iqbRawRec(id); return r && !iqbSeesRec(r); });
const iqbSeesSet = s => !iqbScope() || s.by === ADMIN.me.name || s.items.some(id => iqbSeesRec(iqbRawRec(id)));
// Learners: one row per learner per batch — the batch roster and sign-ups, and anyone with an IQA record there
function sibqScope() {
  const sc = iqbScope(), recs = allIqaRecords(), m = new Map();
  const add = (lid, name, programme, b, code) => { if (!lid || !code || (sc && !sc.includes(code))) return; const k = lid + '~' + code; if (!m.has(k)) m.set(k, { key: k, lid, name, programme, batch: code, blabel: b ? b.label : code, b }); };
  Object.values(STORE.worlds || {}).forEach(w => { const b = w.nvq && w.signup && w.signup.done && chBatch(w.signup.batch); if (iqbNvq(b)) add(w.me.id, chFullName(w), w.nvq.title, b, b.code); });
  (ADMIN.batches || []).filter(iqbNvq).forEach(b => { if (sc && !sc.includes(b.code)) return; chCohLids(b).forEach(l => add(l, chLidName(l), b.course, b, b.code)); });
  recs.forEach(r => { const b = sibqBatchOf(r.batch); add(r.lid, r.learner, r.programme, b, b ? b.code : r.batch); });
  return [...m.values()].map(x => { const w = chWorldByLid(x.lid), rs = recs.filter(r => r.lid === x.lid && iqbRecBatch(r) === x.batch), sets = new Set(rs.flatMap(r => recSets(r).map(s => s.id))), fs = rs.reduce((n, r) => n + recFindings(r).length, 0);
    const wait = w && chBatchCodeOfW(w) === x.batch ? (w.assignments || []).filter(a => /^(Submitted|Resubmitted)$/.test(a.status)).length : 0;
    return { ...x, ver: sibqVersion(x.lid), recs: rs, subs: rs.filter(r => r.kind === 'sub').length, obs: rs.filter(r => r.kind === 'obs').length, pd: rs.filter(r => r.kind === 'pd').length, wait, sets: sets.size, findings: fs, status: rs.length ? 'Marked work to sample' : 'No marked work yet', conflict: iqaConflict({ assessor: '', batch: x.batch }) || '' }; });
}
const iqbInScopeLid = lid => sibqScope().some(x => x.lid === lid);
const iqbKnownLid = lid => iqbUnscoped(() => sibqScope().some(x => x.lid === lid));

/* ---------- Refusals: every q- screen and IQA action checks the batch ---------- */
const IQB_DENY = `<div class="lockpage iqb-deny"><div class="lock-ic">${ic('lock', 30)}</div><h1>This batch isn't assigned to you — logged</h1><p class="muted">You see the learners, evidence, findings and sample-set items of the batches an Academic Admin has assigned you to. The attempt has been recorded in the security log.</p><button class="btn btn-primary" data-go="q-learners">Go to my learners</button></div>`;
function iqbDenyPage(route, id, why) { ADMIN.security.unshift({ id: 'SE-IQB-' + (ADMIN.security.length + 1), sev: 'Medium', at: now().toISOString(), type: 'Out-of-scope access', detail: `IQA ${ADMIN.me.name} opened ${route} · ${id} — ${why}`, reviewed: false }); logA('IQA', `${route} · ${id}`, 'Blocked: outside assigned batches', '—', '—', why); return IQB_DENY; }
const iqbOutWhy = (route, p) => {
  const id = p && p.id; if (!iqbScope() || !id) return '';
  if (route === 'q-record') { const r = iqbRawRec(id); return r && !iqbSeesRec(r) ? `Record in ${iqbRecBatch(r)}` : ''; }
  if (route === 'q-finding') { const f = ADMIN.iqa.find(x => x.id === id); return f && !iqbSeesF(f) ? 'Finding on a record outside the assigned batches' : ''; }
  if (route === 'q-set') { const s = STORE.iqa.sets.find(x => x.id === id); return s && !iqbSeesSet(s) ? 'Sample set with no item in the assigned batches' : ''; }
  if (route === 'q-portfolios') return iqbKnownLid(id) && !iqbInScopeLid(id) ? 'Learner outside the assigned batches' : '';
  return '';
};
// While an IQA's screen is drawn, the findings and sample sets it reads are the ones in their batches
Object.keys(SCREENS).filter(r => /^q-/.test(r)).forEach(r => { const f = SCREENS[r]; SCREENS[r] = p => {
  if (S.portal !== 'admin' || !iqbScope()) return f(p);
  const why = iqbOutWhy(r, p); if (why) return iqbDenyPage(r, p.id, why);
  const F = ADMIN.iqa, Ss = STORE.iqa.sets; ADMIN.iqa = F.filter(iqbSeesF); STORE.iqa.sets = Ss.filter(iqbSeesSet);
  try { return f(p); } finally { ADMIN.iqa = F; STORE.iqa.sets = Ss; }
}; });
// The header bell and Notifications list only the notices about the IQA's own batches
const _arIQB = adminRender;
adminRender = function () {
  if (!ADMIN || !ADMIN.iqaRole || S.portal !== 'admin' || !STORE.iqa) return _arIQB.apply(this, arguments);
  const N = STORE.iqa.notifs; IQB_MEMO = iqbRawIndex(); STORE.iqa.notifs = N.filter(n => { const [r, id] = String(n.go || '').split('.'); return !id || !iqbOutWhy(r, { id }); });
  try { return _arIQB.apply(this, arguments); } finally { STORE.iqa.notifs = N; IQB_MEMO = null; }
};
const iqbDeny = (what, id, why) => eDeny('IQA', id || '—', what, why, `${why} — outside the batches assigned to you.`);
[['qRecord', 'id', 'rec', 'record a finding'], ['qArch', 'id', 'rec', 'open an archived record'], ['qEditF', 'id', 'f', 'edit an IQA finding'], ['qClose', 'id', 'f', 'close an IQA finding'],
  ['qFinalise', 'id', 's', 'finalise a sample set'], ['qUseSet', 'id', 's', 'use a sample set'], ['qRemove', 's', 's', 'remove a sample-set item'], ['qDupSet', 'id', 's', 'duplicate a sample set'], ['qExport', 'id', 's', 'export a sample set'], ['sibqRecs', 'id', 'l', 'open a learner\'s records']].forEach(([a, k, t, what]) => {
  const f = ACT[a]; if (!f) return;
  ACT[a] = (el, e) => {
    const id = el && el.dataset && el.dataset[k]; if (!iqbScope() || !id) return f(el, e);
    if (t === 'rec') { const r = iqbRawRec(id); if (!r || !iqbSeesRec(r)) return iqbDeny(what, id, r ? `Record ${id} is in ${iqbRecBatch(r)}` : `No record ${id}`); }
    if (t === 'f') { const x = ADMIN.iqa.find(y => y.id === id); if (!x || !iqbSeesF(x)) return iqbDeny(what, id, `Finding ${id}`); }
    if (t === 's') { const s = STORE.iqa.sets.find(y => y.id === id); if (!s || !iqbSeesSet(s)) return iqbDeny(what, id, `Sample set ${id}`); const h = iqbHidden(s);
      if (a === 'qExport' && h.length) return iqbDeny(what, id, `${s.name} holds ${plural(h.length, 'item')} from a batch you are no longer assigned to`);
      if (a === 'qDupSet') { const keep = s.items; s.items = keep.filter(i => !h.includes(i)); try { return f(el, e); } finally { s.items = keep; } } }
    if (t === 'l' && !iqbInScopeLid(id)) return iqbDeny(what, id, `Learner ${id}`);
    return f(el, e);
  };
});
// Adding to a sample set: only marked records in an assigned batch (the conflict check of e-sec.js still follows)
const iqbAddWhy = ids => { const bad = (ids || []).filter(id => { const r = iqbRawRec(id); return !r || !iqbSeesRec(r); }); return bad.length ? `${bad.join(', ')} ${bad.length === 1 ? 'isn\'t a marked record' : 'aren\'t marked records'} in your assigned batches` : ''; };
const _addIQB = qAddToSet;
qAddToSet = function (ids) { const why = iqbScope() && iqbAddWhy(ids); if (why) return iqbDeny('add to a sample set', (ids || []).join(', '), why); return _addIQB.apply(this, arguments); };
const _newSetIQB = ACT.qNewSet;
ACT.qNewSet = el => { const pend = el && el.dataset && el.dataset.pend, why = pend && iqbScope() && iqbAddWhy(pend.split(',').filter(Boolean)); if (why) return iqbDeny('create a sample set with items', pend, why); return _newSetIQB(el); };
// Header search: nav.js replaced the IQA search with the register-wide admin search (every learner, queue item and transaction).
// An IQA searches only the records and learners of their batches (the iqa.js search, scoped); others are unchanged.
const _srIQB = searchResults;
searchResults = function (q) {
  if (!isIqa()) return _srIQB.apply(this, arguments);
  q = String(q || '').toLowerCase(); const r = [], recs = allIqaRecords();
  recs.forEach(x => { if (x.id.toLowerCase().includes(q)) r.push(['Record', x.id + ' · ' + x.learner, 'q-record.' + x.id]); });
  [...new Map(sibqScope().map(x => [x.lid, x.name])).entries()].forEach(([id, n]) => { if ((n + id).toLowerCase().includes(q)) r.push(['Learner', n + ' · ' + id, 'q-portfolios.' + id]); });
  [...new Set(recs.map(x => x.assessor))].forEach(a => { if (a.toLowerCase().includes(q)) r.push(['Assessor', a, 'q-records']); });
  [...new Set(recs.map(x => x.title))].forEach(t => { if (t.toLowerCase().includes(q)) r.push(['Assignment', t, 'q-records']); });
  return `<div class="dd adm-sr" style="left:0;right:auto;top:42px;width:min(520px,90vw)"><ul class="dd-list">${r.slice(0, 10).map(x => `<li><button class="dd-item" data-act="qSearchGo" data-t="${x[2]}" data-q="${esc(x[0] === 'Assessor' ? 'as:' + x[1] : x[0] === 'Assignment' ? 'ti:' + x[1] : '')}"><span class="typebadge">${x[0]}</span><span class="small">${esc(x[1])}</span></button></li>`).join('') || '<li class="dd-item small muted">No matches in your assigned batches</li>'}</ul></div>`;
};
// The conflict demo opens work James Pryce marked in a batch he is allocated to as IQA
const _edgeIQB = ACT.qEdge;
ACT.qEdge = el => { if (el && el.dataset && el.dataset.e === 'conflict') { iqaEnter('QC'); const r = allIqaRecords().find(x => x.assessor === 'James Pryce'); if (r) { go('q-record', { id: r.id }); return; } } return _edgeIQB(el); };

/* ---------- IQA portal: assigned batches, batch filter, learners ---------- */
const iqbMyBatches = () => { const sc = iqbScope(); return (ADMIN.batches || []).filter(b => iqbNvq(b) && (!sc || sc.includes(b.code))); };
function iqbPicker(scr) {
  const bs = iqbMyBatches(), cur = iqbPick() || 'all'; if (!bs.length) return '';
  return `<div class="row iqb-pick"><label class="small strong" for="iqb-b">Batch</label><select class="select" style="width:auto" id="iqb-b" data-onchange="iqbPick" data-s="${scr}"><option value="all" ${cur === 'all' ? 'selected' : ''}>${iqbScope() ? 'All assigned batches' : 'All batches'} (${bs.length})</option>${bs.map(b => `<option value="${esc(b.code)}" ${cur === b.code ? 'selected' : ''}>${esc(b.code)} — ${esc(b.label || b.course)}</option>`).join('')}</select></div>`;
}
INP.iqbPick = el => { S.iqa.batch = el.value; if (el.dataset.s === 'q-portfolios') { S.params = {}; go('q-portfolios'); return; } render(); };
const IQB_NONE = `<div class="note b-amber iqb-none" role="status">${ic('info')}<div class="small"><strong>You aren't assigned to any batch yet.</strong> An Academic Admin, a System Administrator or the Super Administrator assigns IQAs to batches (Batches → a batch → Staff). Until then there are no learners, records or evidence for you to sample.</div></div>`;
const IQB_SA = `<div class="note b-grey iqb-sa">${ic('shield')}<div class="small"><strong>Super Administrator oversight</strong> — every NVQ batch is shown. IQAs see only the batches they are assigned to.</div></div>`;
function iqbBatchCard() {
  const sc = iqbScope(); if (!sc) return IQB_SA; if (!sc.length) return IQB_NONE;
  const L = sibqScope(), me = ADMIN.me.name, row = b => { const a = iqbRows(b.code).find(r => r.name === me), ls = L.filter(x => x.batch === b.code), n = ls.reduce((k, x) => k + x.recs.length, 0);
    return `<tr><td><span class="mono small strong">${esc(b.code)}</span><div class="xs muted">${esc(b.label || '')}</div></td><td class="small">${esc(b.course)}</td><td>${chip(b.status)}</td><td class="r">${ls.length}</td><td class="r">${n}</td><td class="xs muted">${a ? fd(a.at) + ' · ' + esc(a.by) : '—'}</td></tr>`; };
  return `<section class="card iqb-mine"><h2 class="small">Your assigned batches (${sc.length})</h2><div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Batch</th><th>Programme</th><th>Status</th><th class="r">Learners</th><th class="r">Marked records</th><th>Assigned</th></tr></thead><tbody>${iqbMyBatches().map(row).join('')}</tbody></table></div><p class="xs muted">Assigned by an Academic Admin, a System Administrator or the Super Administrator. You can't sample a batch you teach, assess or coordinate, so you are never assigned to one.</p></section>`;
}
const IQB_HOW = `<section class="card sib-how iqb-how"><h2>How IQA is assigned</h2><ul class="small sib-list">
  <li><strong>By batch</strong> — an Academic Admin, a System Administrator or the Super Administrator assigns an IQA to one or more batches in the batch's Staff tab. You see every learner in your batches, including those with nothing marked yet, and no other batch.</li>
  <li><strong>Independence</strong> — you are never assigned to a batch you teach, assess or coordinate, and you can't record findings on work you marked; another IQA does that.</li>
  <li><strong>Changes</strong> — if you are removed from a batch you lose access to it straight away; your findings, sample sets and exports are kept in the audit history.</li></ul></section>`;
SCREENS['q-learners'] = () => {
  if (S.portal !== 'admin') { logA('IQA', 'q-learners', 'Blocked: open IQA workspace', '—', '—', `Outside the admin portal (${S.portal || 'signed out'})`); return `<div class="lockpage f-iqa-deny"><div class="lock-ic">${ic('lock', 30)}</div><h1>You don't have permission — logged</h1><p class="muted">IQA records, sample sets, findings and portfolios are for Internal Quality Assurers and the Super Administrator.</p></div>`; }
  const pk = iqbPick(), all = sibqScope(), rows = pk ? all.filter(x => x.batch === pk) : all, none = rows.length && !rows.some(x => x.recs.length), sc = iqbScope();
  return `${pageA('Learners', sc ? 'Every learner in the batches you are assigned to, with the marked work you can sample. Read-only.' : 'Every learner on an NVQ batch, with the marked work an IQA can sample. Read-only.')}${iqbBatchCard()}${sc && !sc.length ? '' : iqbPicker('q-learners')}
  ${none ? `<div class="note b-blue sib-q-none" role="status">${ic('info')}<div class="small"><strong>No work has been marked yet</strong> for ${plural(rows.length, 'learner')} ${pk ? 'in ' + esc(pk) : 'in scope'}. Their submissions, observations and Professional Discussion outcomes become records to sample as soon as an Assessor marks them. Nothing is created for sampling.</div></div>` : ''}
  ${sc && !sc.length ? '' : dt({ id: 'sibq-l', name: 'Learners in IQA scope', rows, rid: x => x.key, pageSize: 25, search: x => x.name + ' ' + x.lid + ' ' + x.batch + ' ' + x.programme, filters: [{ k: 'p', l: 'Programme', get: x => x.programme }, { k: 'b', l: 'Batch', get: x => x.batch }, { k: 's', l: 'Status', get: x => x.status, opts: ['Marked work to sample', 'No marked work yet'] }, { k: 'c', l: 'Your independence', get: x => x.conflict ? 'Conflict — another IQA samples' : 'You can sample', opts: ['You can sample', 'Conflict — another IQA samples'] }],
    cols: [{ k: 'name', l: 'Learner', h: x => `<strong>${esc(x.name)}</strong><div class="xs mono muted">${esc(x.lid)}</div>`, v: x => x.name }, { k: 'programme', l: 'Programme', h: x => `<span class="small">${esc(x.programme)}</span>${x.ver ? `<div class="xs muted">${esc(x.ver)}</div>` : ''}`, v: x => x.programme }, { k: 'batch', l: 'Batch', h: x => `<span class="mono small">${esc(x.batch)}</span>${x.blabel && x.blabel !== x.batch ? `<div class="xs muted">${esc(x.blabel)}</div>` : ''}`, v: x => x.batch },
      { k: 'work', l: 'Marked work', h: x => (x.recs.length ? `<span class="small">${x.subs} submission${x.subs === 1 ? '' : 's'} · ${x.obs} observation${x.obs === 1 ? '' : 's'} · ${x.pd} PD</span>` : '<span class="small muted">None yet</span>') + (x.wait ? `<div class="xs muted iqb-wait">${plural(x.wait, 'submission')} awaiting marking — not yet available to sample</div>` : ''), s: x => x.recs.length, v: x => String(x.recs.length) },
      { k: 'port', l: 'Portfolio', h: x => `<span class="small">${x.recs.length ? 'Evidence against the criteria' : 'Curriculum only — no evidence yet'}</span>`, v: x => x.recs.length ? 'Evidence' : 'Curriculum only' }, { k: 'sets', l: 'In sample sets', r: 1, v: x => String(x.sets), s: x => x.sets }, { k: 'findings', l: 'Findings', r: 1, v: x => String(x.findings), s: x => x.findings },
      { k: 'status', l: 'Status', h: x => chip(x.status, x.recs.length ? 'blue' : 'grey'), v: x => x.status }, { k: 'conflict', l: 'Independence', h: x => x.conflict ? `<span class="small" style="color:var(--amber)">${ic('lock', 12)} ${esc(x.conflict)}</span>` : '<span class="small muted">—</span>', v: x => x.conflict || '' }],
    act: x => `${x.recs.length ? `<button class="btn btn-sm" data-act="sibqRecs" data-id="${esc(x.lid)}">Records (${x.recs.length})</button> ` : ''}<button class="btn btn-sm" data-go="q-portfolios" data-id="${esc(x.lid)}">Portfolio</button>`,
    empty: sc ? 'No learners in your assigned batches yet' : 'No learners are on an NVQ batch yet' })}${IQB_HOW}
  <p class="xs muted">Learners come from the batch rosters and sign-ups; counts come from the marked records. A learner's work appears here only once it has been marked.</p>`;
};
// Assessment Records, Sample Sets, Portfolios: the assigned-batch note and the batch filter
const iqbNoBatchFix = h => h.replace(/<div class="note b-blue sib-q-norec"[\s\S]*?<\/div><\/div>/, '');
const _qrIQB = SCREENS['q-records'];
SCREENS['q-records'] = p => { if (S.portal !== 'admin') return _qrIQB(p); const sc = iqbScope(); if (sc && !sc.length) return eAfterHead(iqbNoBatchFix(_qrIQB(p)), IQB_NONE); IQB_PICK++; let h; try { h = _qrIQB(p); } finally { IQB_PICK--; } return eAfterHead(h, iqbPicker('q-records')); };
const _qoIQB = ACT.qOpen; ACT.qOpen = el => { IQB_PICK++; try { return _qoIQB(el); } finally { IQB_PICK--; } };
const _qsIQB = SCREENS['q-sets'];
SCREENS['q-sets'] = p => { const h = _qsIQB(p); if (S.portal !== 'admin' || !iqbScope()) return h; const sc = iqbScope(); return sc.length ? h.replace('Items in a batch you teach, assess or coordinate can\'t be added.', 'Only marked records from your assigned batches can be added.') : eAfterHead(iqbNoBatchFix(h), IQB_NONE); };
const _qsetIQB = SCREENS['q-set'];
SCREENS['q-set'] = p => {
  const h = _qsetIQB(p), s = p && p.id && STORE.iqa.sets.find(x => x.id === p.id); if (S.portal !== 'admin' || !s || !iqbScope()) return h; const n = iqbHidden(s).length; if (!n) return h;
  const note = `<div class="note b-amber iqb-hidden" role="status">${ic('lock')}<div class="small"><strong>${plural(n, 'item')} from a batch you are no longer assigned to ${n === 1 ? 'is' : 'are'} hidden.</strong> ${n === 1 ? 'It stays' : 'They stay'} in the set with ${n === 1 ? 'its' : 'their'} findings and history; the set can't be exported while it holds ${n === 1 ? 'it' : 'them'}.</div></div>`;
  return eAfterHead(h.replace(/<p class="xs muted">[^<]*no longer resolve to a record in this demo[^<]*<\/p>/, ''), note);
};
const _qpIQB = SCREENS['q-portfolios'];
SCREENS['q-portfolios'] = p => { if (S.portal !== 'admin') return _qpIQB(p); const sc = iqbScope(); if (sc && !sc.length) return `${pageA('Portfolios')}${IQB_NONE}`; IQB_PICK++; let h; try { h = _qpIQB(p); } finally { IQB_PICK--; } return eAfterHead(h, iqbPicker('q-portfolios')); };
// Portfolios list the learners of the chosen batch (sib-b-iqa.js / f-demo.js call this)
const _plIQB = sibqPortLearners; sibqPortLearners = function (seen) { const keep = new Set(sibqScope().filter(x => !IQB_PICK || !iqbPick() || x.batch === iqbPick()).map(x => x.lid)); return _plIQB.apply(this, arguments).filter(([l]) => !iqbScope() || keep.has(l)); };
const _meIQB = SCREENS['a-me'];
SCREENS['a-me'] = p => { const h = _meIQB(p); if (!isIqa() || (p && p.tab && p.tab !== 'profile')) return h; const cs = iqbCodesOf(ADMIN.me.name); return h.replace('<dt>Roles</dt>', `<dt>Assigned batches</dt><dd class="iqb-me">${cs.length ? cs.map(c => `<span class="mono small">${esc(c)}</span>`).join(', ') : '<span class="small muted">None yet</span>'}</dd><dt>Roles</dt>`); };

/* ---------- The IQA allocation control on the batch's Staff tab ---------- */
// The same right as the batch's other staff (PD-IQB-09): the Super Administrator, Academic Admins and System Administrators
const IQB_WHO = 'IQAs are assigned to batches by the Super Administrator, Academic Admins and System Administrators.';
const iqbCan = () => S.portal === 'admin' && !w0BatchAdminWhy();
const iqbCanWhy = () => iqbCan() ? '' : IQB_WHO;
const iqbEnt = b => `${b.label || b.code} (${b.code})`;
function iqbImpact(b, name) {
  const recs = iqbUnscoped(() => allIqaRecords()).filter(r => iqbRecBatch(r) === b.code), ids = new Set(recs.map(r => r.id)), learners = iqbUnscoped(() => sibqScope()).filter(x => x.batch === b.code).length;
  const fs = ADMIN.iqa.filter(f => f.by === name && ids.has(f.rec)).length, sets = STORE.iqa.sets.filter(s => s.by === name && s.items.some(i => ids.has(i))), items = sets.reduce((n, s) => n + s.items.filter(i => ids.has(i)).length, 0), open = sets.filter(s => s.status === 'Open').length;
  const others = iqbNamesOn(b.code).filter(n => n !== name);
  return `<div class="note b-amber iqb-impact">${ic('alert')}<div class="small"><strong>${esc(name)} loses access to ${esc(b.code)} straight away:</strong> ${plural(learners, 'learner')}, their portfolios and evidence (${plural(recs.length, 'marked record')}), ${plural(fs, 'finding')} they recorded here and ${plural(items, 'item')} in their sample sets${open ? ` (${plural(open, 'open set')})` : ''}.<br>Nothing is deleted: their findings, sample sets, exports and this allocation stay in the history, and access returns if they are assigned again.${others.length ? '' : `<br><strong>${esc(b.code)} will have no IQA</strong> until another is assigned.`}</div></div>`;
}
function iqbAssign(code, name, reason) {
  const b = iqbBatch(code), why = iqbCanWhy() || (!iqbOpen(b) ? `${code} isn't an NVQ batch an IQA can be assigned to.` : !iqbStaff().some(s => s.name === name) ? `${name || 'That person'} isn't an active IQA.` : iqbNamesOn(code).includes(name) ? `${name} is already the IQA of ${code}.` : iqbIndepWhy(b, name) || (!String(reason || '').trim() ? 'A reason is required.' : ''));
  if (why) return eDeny('Batches', b ? iqbEnt(b) : code, 'assign an IQA', why, why);
  iqbAdd(code, name, ADMIN.me.name, reason); logA('Batches', iqbEnt(b), 'IQA assigned', '—', name, reason); (b.staffHist = b.staffHist || []).push(['IQA ' + name + ' assigned', now().toISOString(), reason]);
  iqaNotify('Batch assigned to you', `${code} — you can now see its learners and sample its marked work`, 'q-learners', name); return true;
}
function iqbEnd(code, name, reason, to) {
  const b = iqbBatch(code), r = iqbRows(code).find(x => x.name === name), why = iqbCanWhy() || (!b ? `No batch ${code}.` : !r ? `${name} isn't the IQA of ${code}.` : !String(reason || '').trim() ? 'A reason is required.' : '');
  if (why) return eDeny('Batches', b ? iqbEnt(b) : code, to ? 'reassign an IQA' : 'remove an IQA', why, why);
  if (to) { const w = !iqbStaff().some(s => s.name === to) ? `${to || 'That person'} isn't an active IQA.` : to === name || iqbNamesOn(code).includes(to) ? `${to} is already the IQA of ${code}.` : iqbIndepWhy(b, to); if (w) return eDeny('Batches', iqbEnt(b), 'reassign an IQA', w, w); }
  r.end = { at: now().toISOString(), by: ADMIN.me.name, reason, kind: to ? 'Reassigned' : 'Removed', to: to || null };
  if (to) iqbAdd(code, to, ADMIN.me.name, reason);
  logA('Batches', iqbEnt(b), to ? 'IQA reassigned' : 'IQA removed', name, to || '—', reason); (b.staffHist = b.staffHist || []).push([to ? `IQA ${name} → ${to}` : `IQA ${name} removed`, now().toISOString(), reason]);
  iqaNotify('Batch removed from you', `${code} — you no longer have access to it (your findings and sample sets are kept)`, 'q-learners', name);
  if (to) iqaNotify('Batch assigned to you', `${code} — you can now see its learners and sample its marked work`, 'q-learners', to);
  if (S.iqa && S.iqa.batch === code && isIqa() && ADMIN.me.name === name) S.iqa.batch = 'all'; return true;
}
function iqbPanel(b) {
  if (!iqbNvq(b)) return '';
  const can = iqbCan(), rows = iqbRows(b.code), hist = iqbS().rows.filter(r => r.batch === b.code && r.end).slice(-8).reverse();
  return `<section class="card iqb-panel"><div class="row-b"><h2>Internal Quality Assurer (IQA)</h2>${can && iqbOpen(b) ? `<button class="btn btn-sm" data-act="iqbAssignDlg" data-b="${esc(b.code)}">${ic('plus', 14)}Assign IQA</button>` : ''}</div>
    <p class="small muted">An IQA assigned here sees every learner in ${esc(b.code)} and samples its marked work; one IQA can be assigned to several batches. They can't be this batch's Teacher, Assessor or Academic Coordinator (independence rule). Nobody is assigned automatically.</p>
    ${rows.length ? `<div class="tbl-wrap"><table class="tbl dense iqb-cur"><thead><tr><th>IQA</th><th>Assigned</th><th>Reason</th><th class="r"><span class="sr">Actions</span></th></tr></thead><tbody>${rows.map(r => `<tr><td><strong>${esc(r.name)}</strong>${iqbStaff().some(s => s.name === r.name) ? '' : ' <span class="typebadge">Not an active IQA</span>'}</td><td class="xs">${fd(r.at)} · ${esc(r.by)}</td><td class="xs muted">${esc(r.reason || '—')}</td><td class="r">${can ? `<button class="btn btn-sm" data-act="iqbMoveDlg" data-b="${esc(b.code)}" data-n="${esc(r.name)}">Reassign</button> <button class="btn btn-sm" data-act="iqbRemoveDlg" data-b="${esc(b.code)}" data-n="${esc(r.name)}">Remove</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : `<p class="small iqb-empty">${chip('No IQA assigned', 'amber')} <span class="xs muted">No IQA can see this batch's learners until one is assigned. The Super Administrator keeps oversight.</span></p>`}
    ${hist.length ? `<h3 class="small">IQA allocation history</h3><ul class="list small iqb-hist">${hist.map(r => `<li class="li"><div class="li-b"><span>${esc(r.name)} — ${esc(r.end.kind)}${r.end.to ? ' → <strong>' + esc(r.end.to) + '</strong>' : ''}</span><span class="xs muted">assigned ${fd(r.at)} · ended ${fdt(r.end.at)} by ${esc(r.end.by)} · ${esc(r.end.reason)}</span></div></li>`).join('')}</ul>` : ''}</section>`;
}
const iqbOpts = (b, skip = []) => iqbStaff().filter(s => !skip.includes(s.name)).map(s => { const w = iqbNamesOn(b.code).includes(s.name) ? 'already assigned' : iqbIndepWhy(b, s.name) ? 'holds a role on this batch' : ''; return `<option value="${esc(s.name)}" ${w ? 'disabled' : ''}>${esc(s.name)}${w ? ' — ' + w : ''}</option>`; }).join('');
ACT.iqbAssignDlg = el => {
  const b = iqbBatch(el && el.dataset && el.dataset.b), why = !b ? 'Batch not found.' : iqbCanWhy(); if (why) return eDeny('Batches', b ? iqbEnt(b) : '—', 'assign an IQA', why, why);
  const others = (ADMIN.batches || []).filter(x => iqbOpen(x) && x.code !== b.code);
  reasonDlg({ title: 'Assign an IQA — ' + esc(b.code), ok: 'Assign IQA', extra: `<div class="field"><label for="iqb-n">IQA</label><select class="select" id="iqb-n">${iqbOpts(b)}</select><span class="hint">Active staff with the IQA role. Someone who teaches, assesses or coordinates the batch can't be chosen.</span></div>
    <fieldset class="stack iqb-more" style="border:0;padding:0"><legend class="lbl">Batches</legend><label class="check"><input type="checkbox" class="iqb-c" value="${esc(b.code)}" checked disabled> ${esc(b.code)} — ${esc(b.label || b.course)}</label>${others.map(x => `<label class="check"><input type="checkbox" class="iqb-c" value="${esc(x.code)}"> ${esc(x.code)} — ${esc(x.label || x.course)} <span class="xs muted">${esc(x.status)}</span></label>`).join('')}<span class="hint">Tick other batches to assign the same IQA to them too. Each is checked against the independence rule; nothing is saved if one fails.</span></fieldset>`,
    onOk: r => { const n = mval('#iqb-n'), codes = [b.code].concat($$('#modal-root .iqb-c:checked').map(i => i.value).filter(c => c !== b.code));
      if (!n) { fieldErr('#iqb-n', 'Choose an IQA'); return false; }
      const bad = codes.map(c => iqbNamesOn(c).includes(n) ? `${n} is already the IQA of ${c}.` : iqbIndepWhy(iqbBatch(c), n)).filter(Boolean); if (bad.length) { fieldErr('#iqb-n', bad.join(' ')); return false; }
      if (codes.some(c => iqbAssign(c, n, r) !== true)) return false; render(); toast(`${n} assigned as IQA to ${codes.join(', ')}. They have been notified.`); } });
};
ACT.iqbRemoveDlg = el => {
  const b = iqbBatch(el && el.dataset && el.dataset.b), n = el && el.dataset && el.dataset.n, why = !b ? 'Batch not found.' : iqbCanWhy(); if (why) return eDeny('Batches', b ? iqbEnt(b) : '—', 'remove an IQA', why, why);
  reasonDlg({ title: `Remove ${esc(n)} as IQA — ${esc(b.code)}`, ok: 'Remove IQA', danger: true, body: iqbImpact(b, n), onOk: r => { if (iqbEnd(b.code, n, r) !== true) return false; render(); toast(`${n} removed as IQA of ${b.code}. Their history is kept.`); } });
};
ACT.iqbMoveDlg = el => {
  const b = iqbBatch(el && el.dataset && el.dataset.b), n = el && el.dataset && el.dataset.n, why = !b ? 'Batch not found.' : iqbCanWhy(); if (why) return eDeny('Batches', b ? iqbEnt(b) : '—', 'reassign an IQA', why, why);
  reasonDlg({ title: `Reassign IQA — ${esc(b.code)}`, ok: 'Reassign IQA', body: iqbImpact(b, n).replace(/<br><strong>[^<]*will have no IQA<\/strong>[^<]*/, ''), extra: `<div class="field"><label for="iqb-to">New IQA</label><select class="select" id="iqb-to">${iqbOpts(b, [n])}</select></div>`,
    onOk: r => { const to = mval('#iqb-to'); if (!to) { fieldErr('#iqb-to', 'Choose an IQA'); return false; } const w = iqbIndepWhy(b, to); if (w) { fieldErr('#iqb-to', w); return false; } if (iqbEnd(b.code, n, r, to) !== true) return false; render(); toast(`${b.code}: IQA ${n} → ${to}. Both have been notified.`); } });
};
// The panel follows the Assessors panel; the SIB note that IQA isn't allocated per batch is withdrawn
const _apIQB = chAssessPanel;
chAssessPanel = function (b) { const h = _apIQB.apply(this, arguments); return typeof h === 'string' ? h.replace(SIBQ_NOTE_BATCH, '') + iqbPanel(b) : h; };

/* ---------- Independence, the other way: no Teacher / Assessor / Coordinator role for the batch's IQA ---------- */
const iqbHeldDeny = (b, why) => eDeny('Batches', iqbEnt(b), 'give the batch\'s IQA another role', why, why);
const _saIQB = ACT.chAssessSave;
ACT.chAssessSave = el => { const b = iqbBatch(el && el.dataset && el.dataset.b), n = b && CH_AROLES.map(([k]) => ($('#ch-as-' + k) || {}).value).find(x => iqbHeldWhy(b, x, 'Assessor')); if (n) return iqbHeldDeny(b, iqbHeldWhy(b, n, 'Assessor')); return _saIQB(el); };
const _ovIQB = ACT.chOvSet;
ACT.chOvSet = (el, e) => { const r = _ovIQB(el, e), lid = el && el.dataset && el.dataset.l, b = lid && chBatchOfLid(lid); if (b) w0OnConfirm(() => { const w = iqbHeldWhy(b, mval('#ch-ov-n'), 'Assessor'); if (w) { iqbHeldDeny(b, w); fieldErr('#ch-ov-n', w); return true; } return false; }); return r; };
const _bsIQB = ACT.batchStaff;
ACT.batchStaff = (el, e) => { const r = _bsIQB(el, e), b = iqbBatch(el && el.dataset && el.dataset.id); if (b) w0OnConfirm(() => { const t = mval('#bs-t'), c = mval('#bs-c'), w = iqbHeldWhy(b, t, 'Teacher') || iqbHeldWhy(b, c, 'Academic Coordinator'); if (w) { iqbHeldDeny(b, w); fieldErr(iqbHeldWhy(b, t, 'Teacher') ? '#bs-t' : '#bs-c', w); return true; } return false; }); return r; };
const _kaIQB = ACT.kAlloc;
ACT.kAlloc = (el, e) => { const r = _kaIQB(el, e); w0OnConfirm(() => { if (mval('#ka-k') !== 'Batch') return false; const b = iqbBatch(String(mval('#ka-w') || '').split(' · ')[0]), w = iqbHeldWhy(b, mval('#ka-s'), 'Teacher or Assessor'); if (w) { iqbHeldDeny(b, w); fieldErr('#ka-s', w); return true; } return false; }); return r; };
const _ccIQB = changeCoordinator;
changeCoordinator = function (code, to) { const b = iqbBatch(code), w = iqbHeldWhy(b, to, 'Academic Coordinator'); if (w) return iqbHeldDeny(b, w); return _ccIQB.apply(this, arguments); };
const _mcaIQB = mcAddCoord;
mcAddCoord = function (b, name) { const w = iqbHeldWhy(b, name, 'Academic Coordinator'); if (w) return iqbHeldDeny(b, w); return _mcaIQB.apply(this, arguments); };
