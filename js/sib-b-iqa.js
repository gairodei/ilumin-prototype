/* ============================================================
   SIB-FINAL B — IQA client feedback (3 Nov 2026; PD-SIB-B-01…). Loads after sib-a-sysadmin.js.
   IQA-03 Root cause: the IQA workspace listed learners only through marked records (Assessment Records, Portfolios), so a batch
          whose work isn't marked yet — the whole client demo — showed no learner at all, and Portfolios said only "No marked
          work". New "Learners" screen: every learner on a live NVQ batch (the same batch rosters and sign-ups the Academic Admin
          sees), with their programme and version, batch, the marked work available to sample (counted from the records), sets,
          findings and whether the IQA's independence rule applies. A learner with nothing marked is listed truthfully ("No
          marked work yet") and their portfolio opens with their own curriculum and no evidence. Nothing is created for them.
          Who may open it is unchanged (an IQA or the Super Administrator, PD-F-09).
   IQA-01 The approved model has no per-batch IQA allocation: an IQA is a staff account holding the IQA role (Staff & Users —
          Super Administrator or a System Administrator), sampling across the Academy; independence is the existing conflict rule
          (no sampling a batch they teach, assess or coordinate — G6.9 / CH-17). Explained on the IQA's Learners screen and on the
          batch staff panel. Whether IQAs should be allocated to batches is a client decision; nothing is assigned automatically.
   IQA-02 Sample sets: the workflow (create → choose evidence → review → findings → corrections → close / finalise / export), the
          filters, the counts, a per-set review summary and empty states that say why. No sampling size or percentage.
   IQA-04 Portfolio: what it is for and what it contains; a submission's files now show in the IQA record (W0 kept them but the
          IQA view never listed them); the Assessor's published final outcomes are listed. IQA never changes a Pass / Fail.
   ============================================================ */
'use strict';

/* ---------- The learners in the IQA's scope ---------- */
const sibqShort = t => (ADMIN.courses || []).some(c => c.title === t);
const sibqBatchOf = code => (ADMIN.batches || []).find(x => x.code === code || x.label === code) || null;
function sibqVersion(lid) {
  const w = typeof chWorldByLid === 'function' ? chWorldByLid(lid) : null; if (w && w.nvq) return w.nvq.progVersion ? 'Version ' + w.nvq.progVersion : (w.nvq.version || '');
  const L = learnerById(lid), e = L && (L._enr || []).find(x => x.version); return e ? String(e.version).replace(/^v?/i, 'Version ') : '';
}
function sibqScope() {
  const m = new Map(), recs = allIqaRecords();
  (typeof chEnrolRows === 'function' ? chEnrolRows() : []).forEach(r => { if (!r || !r.lid || !r.b || sibqShort(r.course)) return; m.set(r.lid, { lid: r.lid, name: r.name, programme: r.course, batch: r.b.code, blabel: r.b.label, b: r.b }); });
  recs.forEach(r => { if (!m.has(r.lid)) { const b = sibqBatchOf(r.batch); m.set(r.lid, { lid: r.lid, name: r.learner, programme: r.programme, batch: b ? b.code : r.batch, blabel: b ? b.label : r.batch, b }); } });
  return [...m.values()].map(x => { const rs = recs.filter(r => r.lid === x.lid), sets = new Set(rs.flatMap(r => recSets(r).map(s => s.id))), fs = rs.reduce((n, r) => n + recFindings(r).length, 0);
    return { ...x, ver: sibqVersion(x.lid), recs: rs, subs: rs.filter(r => r.kind === 'sub').length, obs: rs.filter(r => r.kind === 'obs').length, pd: rs.filter(r => r.kind === 'pd').length, sets: sets.size, findings: fs, status: rs.length ? 'Marked work to sample' : 'No marked work yet', conflict: iqaConflict({ assessor: '', batch: x.batch }) || '' }; });
}
const sibqHas = lid => sibqScope().some(x => x.lid === lid);
// Portfolios: the learners with records plus the in-scope learners without any (f-demo.js fPortfolio calls this)
function sibqPortLearners(seen) { const m = new Map(seen); sibqScope().forEach(x => { if (!m.has(x.lid)) m.set(x.lid, x.name); }); return [...m.entries()]; }

/* ---------- IQA-01: how IQAs are assigned ---------- */
const SIBQ_HOW = `<section class="card sib-how sib-q-how"><h2>How IQA is assigned</h2><ul class="small sib-list">
  <li><strong>Who is an IQA</strong> — a staff account holding the IQA role. The Super Administrator or a System Administrator gives the role in Staff & Users.</li>
  <li><strong>Scope</strong> — an IQA samples marked work across every NVQ batch. Batches don't have an IQA allocation, and nobody is assigned automatically.</li>
  <li><strong>Independence</strong> — you can't sample, record findings on or close findings for a batch where you are its Teacher, Assessor or Coordinator, or work you marked. Another IQA does that. Those learners are flagged below.</li></ul>
  <p class="xs muted">Whether IQAs should instead be allocated to particular batches or programmes is a client decision; the approved requirements don't include one.</p></section>`;
const SIBQ_NOTE_BATCH = `<div class="note b-grey sib-q-batch">${ic('shield')}<div class="small"><strong>IQA isn't allocated per batch.</strong> Any active IQA samples this batch's marked work, except an IQA who teaches, assesses or coordinates it (independence rule). The IQA role is given in Staff & Users.</div></div>`;
const _apSIBQ = chAssessPanel;
chAssessPanel = function (b) { const h = _apSIBQ.apply(this, arguments); if (typeof h !== 'string' || !h) return h; const k = h.lastIndexOf('</section>'); return k >= 0 ? h.slice(0, k) + SIBQ_NOTE_BATCH + h.slice(k) : h + SIBQ_NOTE_BATCH; };

/* ---------- IQA-03: Learners ---------- */
QNAV[0][1].splice(1, 0, ['q-learners', 'Learners', 'users']); IQA_ROUTES.add('q-learners');
ROUTE_PURPOSE['q-learners'] = 'Every learner on an NVQ batch, with the marked work you can sample.';
SCREENS['q-learners'] = () => {
  if (S.portal !== 'admin') { logA('IQA', 'q-learners', 'Blocked: open IQA workspace', '—', '—', `Outside the admin portal (${S.portal || 'signed out'})`); return `<div class="lockpage f-iqa-deny"><div class="lock-ic">${ic('lock', 30)}</div><h1>You don't have permission — logged</h1><p class="muted">IQA records, sample sets, findings and portfolios are for Internal Quality Assurers and the Super Administrator.</p></div>`; }
  const rows = sibqScope(), none = !rows.some(x => x.recs.length);
  return `${pageA('Learners', 'Every learner on an NVQ batch, with the marked work you can sample. Read-only.')}${SIBQ_HOW}
  ${none && rows.length ? `<div class="note b-blue sib-q-none" role="status">${ic('info')}<div class="small"><strong>No work has been marked yet</strong> for ${plural(rows.length, 'learner')} in scope. Their submissions, observations and Professional Discussion outcomes become records to sample as soon as an Assessor marks them. Nothing is created for sampling.</div></div>` : ''}
  ${dt({ id: 'sibq-l', name: 'Learners in IQA scope', rows, rid: x => x.lid, pageSize: 25, search: x => x.name + ' ' + x.lid + ' ' + x.batch + ' ' + x.programme, filters: [{ k: 'p', l: 'Programme', get: x => x.programme }, { k: 'b', l: 'Batch', get: x => x.batch }, { k: 's', l: 'Status', get: x => x.status, opts: ['Marked work to sample', 'No marked work yet'] }, { k: 'c', l: 'Your independence', get: x => x.conflict ? 'Conflict — another IQA samples' : 'You can sample', opts: ['You can sample', 'Conflict — another IQA samples'] }],
    cols: [{ k: 'name', l: 'Learner', h: x => `<strong>${esc(x.name)}</strong><div class="xs mono muted">${esc(x.lid)}</div>`, v: x => x.name }, { k: 'programme', l: 'Programme', h: x => `<span class="small">${esc(x.programme)}</span>${x.ver ? `<div class="xs muted">${esc(x.ver)}</div>` : ''}`, v: x => x.programme }, { k: 'batch', l: 'Batch', h: x => `<span class="mono small">${esc(x.batch)}</span>${x.blabel && x.blabel !== x.batch ? `<div class="xs muted">${esc(x.blabel)}</div>` : ''}`, v: x => x.batch },
      { k: 'work', l: 'Marked work', h: x => x.recs.length ? `<span class="small">${x.subs} submission${x.subs === 1 ? '' : 's'} · ${x.obs} observation${x.obs === 1 ? '' : 's'} · ${x.pd} PD</span>` : '<span class="small muted">None yet</span>', s: x => x.recs.length, v: x => String(x.recs.length) }, { k: 'sets', l: 'In sample sets', r: 1, v: x => String(x.sets), s: x => x.sets }, { k: 'findings', l: 'Findings', r: 1, v: x => String(x.findings), s: x => x.findings },
      { k: 'status', l: 'Status', h: x => chip(x.status, x.recs.length ? 'blue' : 'grey'), v: x => x.status }, { k: 'conflict', l: 'Independence', h: x => x.conflict ? `<span class="small" style="color:var(--amber)">${ic('lock', 12)} ${esc(x.conflict)}</span>` : '<span class="small muted">—</span>', v: x => x.conflict || '' }],
    act: x => `${x.recs.length ? `<button class="btn btn-sm" data-act="sibqRecs" data-id="${esc(x.lid)}">Records (${x.recs.length})</button> ` : ''}<button class="btn btn-sm" data-go="q-portfolios" data-id="${esc(x.lid)}">Portfolio</button>`,
    empty: 'No learners are on an NVQ batch yet' })}
  <p class="xs muted">Learners come from the batch rosters and sign-ups; counts come from the marked records. A learner's work appears here only once it has been marked.</p>`;
};
ACT.sibqRecs = el => { const x = sibqScope().find(y => y.lid === (el && el.dataset && el.dataset.id)); if (!x) return; setUi('qrT', 'all'); S.ui['dt-qrec'] = { q: '', f: { le: x.name }, sort: null, page: 0, hide: [], sel: [], owner: dtOwner(), ps: 25, dr: { k: null, p: 'all', from: '', to: '' } }; go('q-records'); };
const SIBQ_NOREC = n => `<div class="note b-blue sib-q-norec" role="status">${ic('info')}<div class="small"><strong>Nothing has been marked yet, so there is nothing to sample.</strong> ${n ? `${plural(n, 'learner')} ${n === 1 ? 'is' : 'are'} in scope — see <button class="linklike" data-go="q-learners">Learners</button>.` : 'No learner is on an NVQ batch yet.'} Records appear here as soon as an Assessor marks a submission, signs off an observation or records a Professional Discussion outcome.</div></div>`;
const _qrSIBQ = SCREENS['q-records'];
SCREENS['q-records'] = p => { const h = _qrSIBQ(p); return S.portal === 'admin' && !allIqaRecords().length ? eAfterHead(h, SIBQ_NOREC(sibqScope().length)) : h; };

/* ---------- IQA-02: sample sets ---------- */
const SIBQ_SETS = `<section class="card sib-how sib-q-sets-how"><h2>How sample sets work</h2><ol class="sib-flow small">
  <li><strong>Create a set</strong> — "New sample set": a name and a purpose (internal QA, awarding body / EQA visit, standardisation). It becomes your current set.</li>
  <li><strong>Choose the evidence</strong> — in Assessment Records, filter by programme, unit, criterion, assessor (former ones included), batch, learner, round, outcome, RAG, type, verified, advisory note, already sampled or has a finding; tick records and choose "Add to sample set". A portfolio's "Add to sample set" works too. The Coverage helper counts what is sampled by assessor, unit and round.</li>
  <li><strong>Review</strong> — open each item: the learner's work and files, the Assessor's decisions, feedback and published final outcome, read-only.</li>
  <li><strong>Findings and corrections</strong> — record a finding with a category and a required action. The marking Assessor acknowledges it; a correction to a mark or outcome goes through Data Correction. IQA never changes a mark or a Pass / Fail.</li>
  <li><strong>Close</strong> — close each acknowledged finding; finalise the set to lock its item list; export it (logged).</li></ol>
  <p class="xs muted">Set statuses: Open → Finalised → Exported. You choose every item — the system sets no sample size or percentage (whether a minimum is required is a client decision). Items in a batch you teach, assess or coordinate can't be added.</p></section>`;
const _qsSIBQ = SCREENS['q-sets'];
SCREENS['q-sets'] = p => { let h = eAfterHead(_qsSIBQ(p), SIBQ_SETS); if (S.portal === 'admin' && !allIqaRecords().length) h = eAfterHead(h, SIBQ_NOREC(sibqScope().length)); return h; };
const _qsetSIBQ = SCREENS['q-set'];
SCREENS['q-set'] = p => {
  const h = _qsetSIBQ(p), s = STORE.iqa.sets.find(x => x.id === (p && p.id)); if (!s || S.portal !== 'admin') return h;
  const recs = s.items.map(recById).filter(Boolean), fs = recs.flatMap(recFindings), st = k => fs.filter(f => (f.status || 'Open') === k).length, withF = recs.filter(r => recFindings(r).length).length, dc = recs.filter(r => recCorrPending(r)).length, gone = s.items.length - recs.length;
  const next = s.status === 'Open' ? (s.items.length ? 'Next: review each item and record findings, then finalise the set to lock it.' : 'Next: add items from Assessment Records, Learners or a portfolio.') : s.status === 'Finalised' ? 'The item list is locked. Export it when you need to share it; findings can still be closed.' : 'Exported. The item list is locked; each export is logged below.';
  return eAfterHead(h, `<section class="card sib-q-sum" aria-label="Review summary"><h2 class="small">Review summary</h2><div class="kpis">${kpi('Items', s.items.length)}${kpi('Items with a finding', withF)}${kpi('Open findings', st('Open'))}${kpi('Acknowledged', st('Acknowledged'))}${kpi('Closed', st('Closed'))}${kpi('Data Corrections pending', dc)}</div>${gone ? `<p class="xs muted">${plural(gone, 'item')} no longer resolve to a record in this demo and are left out of the counts.</p>` : ''}<p class="small">${esc(next)}</p><p class="xs muted">Counts come from the findings recorded on the set's items. "Items with a finding" is not a completed-review count: the system doesn't record a review without a finding.</p></section>`);
};
const _omSIBQ = openModal;
openModal = function (m) {
  if (m && m.title === 'Create sample set' && typeof m.body === 'string' && !m.body.includes('sib-q-new')) m.body = `<div class="note b-blue sib-q-new">${ic('info')}<div class="small">A sample set is a list of marked records you choose by hand. After creating it, add records from Assessment Records (filters and "Add to sample set"), Learners or a portfolio. No item is added automatically.</div></div>` + m.body;
  return _omSIBQ.apply(this, arguments);
};

/* ---------- IQA-04: the portfolio, its purpose, files and outcomes ---------- */
const SIBQ_PORT = `<details class="card sib-how sib-q-port-how" open><summary class="strong">What the IQA portfolio is for</summary><div class="small">
  <p>The learner's whole qualification in one place, so you can check that the Assessor's decisions are consistent and supported by evidence across units — not only the items in a sample set. It is built from the existing records; there is no separate portfolio to fill in.</p>
  <ul class="sib-list"><li><strong>Shown:</strong> the curriculum of the programme version the learner is enrolled on, and against each criterion the marked evidence — assignment submissions (every round, with their files), observations (with location, evidence and sign-off) and Professional Discussion outcomes; the Assessor's decisions, feedback and published final outcome; IQA findings and advisory notes.</li>
  <li><strong>Not shown:</strong> unmarked drafts and submissions still waiting to be marked, admission and personal documents, and payments.</li>
  <li><strong>Read-only.</strong> IQA never replaces the Assessor's final Pass / Fail; a correction goes through Data Correction.</li></ul>
  <p class="xs muted">The approved requirements don't define an IQA portfolio sign-off or extra mandatory portfolio contents. If the client needs one (for example an IQA "portfolio verified" step), that is a client decision.</p></div></details>`;
function sibqOutcomes(lid) {
  const rs = allIqaRecords().filter(r => r.lid === lid && r.kind === 'sub' && r.live);
  if (!rs.length) return '';
  return `<section class="card sib-q-out"><h2 class="small">Final assignment outcomes (published by the Assessor)</h2><ul class="list small">${rs.map(r => `<li class="li"><span style="flex:1">${esc(r.title)} <span class="xs muted">· ${esc(r.round || '')}</span></span>${r.outcome ? `${chip(r.outcome.result, r.outcome.result === 'Pass' ? 'green' : 'red')} <span class="xs muted">${esc(r.outcome.by)} · ${fd(r.outcome.at)}</span>` : '<span class="xs muted">No final outcome declared</span>'}</li>`).join('')}</ul></section>`;
}
const _qpSIBQ = SCREENS['q-portfolios'];
SCREENS['q-portfolios'] = p => {
  p = p || {}; if (S.portal !== 'admin') return _qpSIBQ(p);
  const recsNow = allIqaRecords(), scope = sibqScope(), noRec = p.id && !recsNow.some(r => r.lid === p.id) && scope.some(x => x.lid === p.id);
  const h = noRec ? fPortfolio(p) : _qpSIBQ(p), id = p.id || ((h.match(/<option value="([^"]+)" selected>/) || [])[1]);
  if (!scope.length && !recsNow.length) return h;
  const mine = id && !recsNow.some(r => r.lid === id) ? `<div class="note b-grey sib-q-port-none" role="status">${ic('info')}<div class="small"><strong>No marked work yet.</strong> The learner's criteria are listed with no evidence. Evidence appears here once an Assessor marks it.</div></div>` : '';
  return eAfterHead(h, SIBQ_PORT + mine + (id ? sibqOutcomes(id) : ''));
};
// The record view lists the files submitted with each round (the IQA may open them — PD-W0-07; opening is audited)
const _qrecSIBQ = SCREENS['q-record'];
SCREENS['q-record'] = p => {
  let h = _qrecSIBQ(p); const r = p && p.id && S.portal === 'admin' ? recById(p.id) : null; if (typeof h !== 'string' || !r || r.kind !== 'sub') return h;
  let pos = h.indexOf('<h2>Learner\'s work</h2>'); if (pos < 0) return h;
  if (!r.live || !r.v) return h.replace('<h2>Learner\'s work</h2>', '<h2>Learner\'s work</h2><p class="xs muted sib-q-att">Earlier sample record — no files are stored with it.</p>');
  const a = recAsg(r); if (!a || !a.qs) return h;
  a.qs.forEach(q => (q.rounds || []).forEach(rd => {
    const mark = '<div class="r-ans">' + rd.html + '</div>', k = h.indexOf(mark, pos); if (k < 0) return;
    const files = Array.isArray(rd.att) ? (rd.att.length ? `<div class="row w0-att sib-q-att" aria-label="Files submitted with this round">${rd.att.map(x => w0Chip(x.id)).join('')}</div>` : '<span class="xs muted w0-att sib-q-att">No files attached</span>') : '<span class="xs muted sib-q-att">No file is stored for this round (submitted before files were kept with submissions).</span>';
    h = h.slice(0, k + mark.length) + files + h.slice(k + mark.length); pos = k + mark.length + files.length;
  }));
  return h;
};
