/* ============================================================
   TA-1 — Teacher and Assessor client feedback (2 Nov 2026; PD-TA1-* in PROVISIONAL-DECISIONS.md). Loads last.
   1/2 Caseload from the current allocations: a Teacher / Assessor's batches are read from the batches themselves (Teacher list,
       assignment / PD / observation assessor, a learner override) every time — never from a copy kept on the staff identity, which
       was not saved with the demo and went stale after a refresh, or after an allocation change made outside the batch Staff tab.
       The dashboard counts the same learners as My Students; Staff Allocations shows each person's real caseload and marking.
   3   Direct publication: the learner's allocated assignment assessor publishes criterion judgements, written feedback and exits to
       the learner at once (supersedes G6.3's Coordinator release for new marking). The final Pass / Fail stays the Assessor's own
       separate declaration (R3 / AR); Coordinator feedback stays separately attributed. Items already in the Release queue stay there.
   4   One identity, two responsibilities: someone holding both roles gets the teaching screens only while they hold a Teacher
       allocation and the assessment screens only while they hold an Assessor allocation. A "My responsibilities" card names each.
   5   Client demo: Omar Siddiqui (his existing Teacher + Assessor staff record) co-teaches the demo batch and is Sam Deposit's PD
       assessor (override); a "Teacher + Assessor" demo identity signs in as him. Not Sarah Okonkwo: she is legacy-only (PD-DR-01).
   ============================================================ */
'use strict';

/* ---------- 1/2. Batches and learners from the live allocations ---------- */
const TA1_SEED = {}; // each identity's original batch order (display order only)
const ta1Ready = () => typeof ADMIN !== 'undefined' && ADMIN && Array.isArray(ADMIN.batches) && typeof STORE !== 'undefined' && STORE && STORE.worlds;
const ta1Holds = (b, name) => !!b && !b.short && (acHolds(b, name) || acOvLids(b, name).length > 0);
function ta1Codes(u) {
  const seed = TA1_SEED[u.key] || [];
  if (!ta1Ready()) return seed.slice();
  const rank = c => { const i = seed.indexOf(c); return i < 0 ? 1e4 + ADMIN.batches.findIndex(b => b.code === c) : i; };
  return ADMIN.batches.filter(b => ta1Holds(b, u.name)).map(b => b.code).sort((x, y) => rank(x) - rank(y));
}
// Omar Siddiqui's staff record (ST-014, Teacher + Assessor) gets its staff-portal identity — one person, one record
if (!TAS_USERS.O) TAS_USERS.O = { key: 'O', name: 'Omar Siddiqui', first: 'Omar', email: 'omar.siddiqui@illumin-academy.example', roles: ['Teacher', 'Assessor'], label: 'O · Teacher + Assessor (allocated separately)', batches: [], quals: 'TAQA (CAVA)', reg: 'ASR-51230' };
// The identity's `batches` stays a plain list, but only as a mirror: it is rebuilt from the batches every time it is read here
// (tasBatches), whenever allocations are synced, and after load, Reset and a restored refresh — older code that writes it is overruled
Object.values(TAS_USERS).forEach(u => { TA1_SEED[u.key] = Array.isArray(u.batches) ? u.batches.slice() : []; });
function ta1Sync(u) { if (!u || typeof u !== 'object' || !ta1Ready()) return; if (!(u.key in TA1_SEED)) TA1_SEED[u.key] = Array.isArray(u.batches) ? u.batches.slice() : []; u.batches = ta1Codes(u); }
const ta1SyncAll = () => Object.values(TAS_USERS).forEach(ta1Sync);
const _tbTA1 = tasBatches;
tasBatches = function () { ta1Sync(TME()); return _tbTA1.apply(this, arguments); };
const _stbTA1 = syncTasBatches;
syncTasBatches = function () { const r = _stbTA1.apply(this, arguments); ta1SyncAll(); return r; };
const _flTA1 = fxLoadLegacy;
fxLoadLegacy = function () { const r = _flTA1.apply(this, arguments); ta1SyncAll(); return r; };
const _baTA1 = buildAdmin;
buildAdmin = function () { const r = _baTA1.apply(this, arguments); try { ta1SyncAll(); } catch (e) { console.error(e); } return r; };
const _bootTA1 = App.boot;
App.boot = function () { const r = _bootTA1.apply(this, arguments); ta1SyncAll(); return r; };

// Responsibilities of the signed-in identity, read from the batches
const ta1Me = () => (TME() || {}).name;
const ta1Teaches = () => tasBatches().some(b => (b.teachers || []).includes(ta1Me()));
const ta1Assesses = () => tasBatches().some(b => !b.short && (CH_AROLES.some(([k]) => chAllocOf(b)[k] === ta1Me()) || acOvLids(b, ta1Me()).length > 0));
const ta1Dual = () => !!TME() && hasRole('Teacher') && hasRole('Assessor');
function ta1Resp(b, name) {
  const out = [], a = chAllocOf(b);
  if ((b.teachers || []).includes(name)) out.push(['Teacher', 'all learners in the batch']);
  CH_AROLES.forEach(([k, l]) => { if (a[k] === name) out.push([l, 'all learners in the batch']); });
  chCohLids(b).forEach(lid => ['pd', 'obs'].forEach(k => { const o = chOvOf(lid, k); if (o && o.name === name) out.push([chAName(k), ((allLearners().find(x => x.id === lid) || {}).name || lid) + ' only (override)']); }));
  return out;
}

/* ---------- 4. Capabilities follow the allocations for an identity that holds both roles ---------- */
const TA1_ASSESS = ['mark', 'verify', 'recommend', 'observations', 'pd', 'portfolio', 'iqa', 'approvals', 'progress', 'reports'];
const TA1_TEACH = ['briefs', 'attendance'];
const _canTA1 = CAN;
CAN = function (cap) {
  const r = _canTA1.apply(this, arguments);
  if (r !== 'yes' || !ta1Dual() || S.tas.edge === 'noAlloc') return r;
  if (TA1_ASSESS.includes(cap) && !ta1Assesses()) return 'no';
  if (TA1_TEACH.includes(cap) && !ta1Teaches()) return 'no';
  return r;
};
// The "not part of your role" page names the missing allocation (a person with both roles)
const _tpTA1 = tasPage;
tasPage = function () {
  const h = _tpTA1.apply(this, arguments);
  if (!ta1Dual() || typeof h !== 'string' || !h.includes('<h1>Not part of your role</h1>')) return h;
  const teach = TA1_TEACH.includes(T_ROUTE_CAP[S.route] || (TNAV.find(n => n[0] === S.route) || [])[3]);
  return h.replace(/<p class="muted">[\s\S]*?<\/p>/, `<p class="muted">${teach ? 'You hold the Teacher role, but you are not currently allocated as a Teacher on any batch.' : 'You hold the Assessor role, but you are not currently allocated as an Assessor for any learner.'} Your other responsibilities are unchanged — see My responsibilities on your dashboard.</p>`);
};

function ta1RespCard() {
  const me = ta1Me(), bs = tasBatches().filter(b => !b.short), short = tasBatches().filter(b => b.short);
  const rows = bs.map(b => [b, ta1Resp(b, me)]).filter(x => x[1].length);
  const t = ta1Teaches(), a = ta1Assesses();
  return `<section class="card ta1-resp"><h2>${ic('users')}My responsibilities</h2><p class="small muted">From your current allocations. Teaching and assessment are allocated separately — holding the Teacher or Assessor role alone gives no access.</p>
    <div class="row" style="gap:6px;flex-wrap:wrap">${chip(t ? 'Teaching: allocated' : 'Teaching: not allocated', t ? 'green' : 'grey')} ${chip(a ? 'Assessing: allocated' : 'Assessing: not allocated', a ? 'green' : 'grey')}</div>
    ${rows.length || short.length ? `<ul class="list small">${rows.map(([b, r]) => `<li class="li"><div class="li-b"><strong>${esc(b.label)} <span class="mono xs">${esc(b.code)}</span></strong><span class="xs muted">${r.map(([l, w]) => `${esc(l)} — ${esc(w)}`).join(' · ')}</span></div></li>`).join('')}${short.map(b => `<li class="li"><div class="li-b"><strong>${esc(b.label)}</strong><span class="xs muted">Teacher — short course</span></div></li>`).join('')}</ul>` : '<p class="small muted">No current allocations.</p>'}
    <div class="row" style="gap:6px;flex-wrap:wrap">${t && CAN('attendance') === 'yes' ? `<button class="btn btn-sm" data-go="t-sessions">${ic('checksq', 14)}Teaching: sessions</button>` : ''}${a && CAN('mark') === 'yes' ? `<button class="btn btn-sm" data-go="t-queue">${ic('edit', 14)}Assessing: marking</button>` : ''}${a && CAN('pd') === 'yes' ? `<button class="btn btn-sm" data-go="t-pd">${ic('users', 14)}Assessing: PD</button>` : ''}</div></section>`;
}

/* ---------- 1. Dashboard: the same learners as My Students; both responsibilities when held ---------- */
const ta1NotDisc = l => l.status !== 'Discontinued';
const _tdTA1 = SCREENS['t-dashboard'];
SCREENS['t-dashboard'] = p => {
  const tl = tasLearners, all = tl(), hid = all.filter(l => !ta1NotDisc(l)).length;
  tasLearners = function (x) { const r = tl.apply(this, arguments); return x ? r : r.filter(ta1NotDisc); }; // My Students' default (C15)
  let h; try { h = _tdTA1(p); } finally { tasLearners = tl; }
  if (typeof h !== 'string') return h;
  const n = all.length - hid, mk = CAN('mark') !== 'no';
  const line = `<p class="small ta1-count">${ic('users', 13)} <a href="#t-students" data-go="t-students"><strong>${plural(n, 'learner')} allocated to you</strong></a>${hid ? ` <span class="muted">· ${hid} discontinued not counted (shown in My Students with "Show discontinued")</span>` : ''}</p>`;
  let out = h.replace('<div class="grid-2">', line + '<div class="grid-2">');
  if (mk && ta1Dual() && ta1Teaches()) { // a Teacher + Assessor with both allocations: the teaching card too
    const ls = tl().filter(ta1NotDisc), evs = tasBatches().filter(b => !b.short).flatMap(b => batchEvents(b)).filter(e => e.type === 'class' && new Date(e.start) > new Date(now().getTime() - 3600e3) && new Date(e.start) < new Date(now().getTime() + 7 * DAY));
    const card = `<section class="card ta1-teach"><div class="card-h"><h2>${ic('book')}Teaching</h2><button class="btn btn-sm" data-go="t-assign">Assignments &amp; resources</button></div><div class="kpis">${kpi('Learners', ls.length, '', 't-students')}${kpi('Classes this week', evs.length, '', 't-calendar')}</div></section>`;
    out = out.replace(line + '<div class="grid-2">', line + '<div class="grid-2">' + card);
  }
  if (ta1Dual()) out = out.replace(line, line + ta1RespCard());
  return out;
};
const _tprTA1 = SCREENS['t-profile'];
if (_tprTA1) SCREENS['t-profile'] = p => { const h = _tprTA1(p); return typeof h === 'string' && TME() ? h + ta1RespCard() : h; };

/* ---------- 1. Staff Allocations: real caseload and marking (was a stored figure, 0 for every demo member of staff) ---------- */
const ta1Key = name => (Object.values(TAS_USERS).find(u => u.name === name) || {}).key;
function ta1Load(name) {
  const k = ta1Key(name);
  if (k) return s5dWithTas(k, () => ({ caseload: tasLearners(true).filter(l => !l.short && ta1NotDisc(l)).length, pending: tasSubs(true).filter(s => s.toMark).length }));
  const lids = new Set(); (ADMIN.batches || []).forEach(b => { if (acHolds(b, name)) chCohLids(b).forEach(l => lids.add(l)); else acOvLids(b, name).forEach(l => lids.add(l)); });
  return { caseload: lids.size, pending: null };
}
const _slTA1 = staffLoad;
staffLoad = function (s) {
  const r = _slTA1.apply(this, arguments), x = ta1Load(s.name);
  return { ...r, caseload: x.caseload, pending: x.pending != null ? x.pending : fxClient() ? 0 : r.pending };
};

/* ---------- Batch staff: further Teachers are listed — kept while ticked, removed (audited, notified) when unticked ---------- */
const _bsTA1 = ACT.batchStaff;
ACT.batchStaff = el => {
  const b = ADMIN.batches.find(x => x.code === (el && el.dataset && el.dataset.id)), m0 = MODAL, r = _bsTA1(el);
  if (!b || !MODAL || MODAL === m0 || (b.teachers || []).length < 2) return r;
  const more = b.teachers.slice(1);
  MODAL.body = (MODAL.body || '').replace('<p class="xs muted">Previous staff', `<fieldset class="stack ta1-more" style="border:0;padding:0"><legend class="lbl">Also teaching this batch</legend>${more.map(n => `<label class="check"><input type="checkbox" class="ta1-keep" value="${esc(n)}" checked> ${esc(n)}</label>`).join('')}<span class="hint">Untick to remove that Teacher from the batch.</span></fieldset><p class="xs muted">Previous staff`); renderModal();
  const act = MODAL.actions.find(x => /primary/.test(x.cls || '')); if (act && act.fn) { const g = act.fn; act.fn = (...x) => {
    const t = ($('#bs-t') || {}).value, ticked = $$('#modal-root .ta1-keep:checked').map(i => i.value), rsn = mval('#rsn'), was = b.teachers.slice();
    const keep = more.filter(n => ticked.includes(n) && n !== t), drop = more.filter(n => !ticked.includes(n) && n !== t);
    b.teachers = b.teachers.slice(0, 1); let out;
    try { out = g(...x); } finally { if (out === false) b.teachers = was; else b.teachers = [...new Set(b.teachers.concat(keep))]; }
    if (out !== false && rsn) drop.forEach(n => { (b.staffHist = b.staffHist || []).push(['Teacher ' + n + ' removed', now().toISOString(), rsn]); logA('Batches', `${b.label} (${b.code})`, 'Teacher removed', 'Teacher: ' + n, '—', rsn); tasNotify('Batch removed from you', `${n}: ${b.code} — no longer teaching (history kept)`, 't-dashboard', 'Caseload'); });
    return out;
  }; }
  return r;
};

/* ---------- 3. The allocated Assessor publishes feedback to the learner (no Coordinator release) ---------- */
function ta1PubWhy(key) {
  if (S.portal !== 'staff') return 'Feedback is published by the learner\'s allocated assignment assessor, in the Assessor portal.';
  if (CAN('mark') !== 'yes') return 'Only the learner\'s allocated assignment assessor publishes feedback.';
  const me = ta1Me(), acc = ADMIN.staff.filter(x => x.name === me);
  if (acc.length === 1 && acc[0].status !== 'Active') return `${me}'s account is ${String(acc[0].status).toLowerCase()} — only an Active Assessor publishes feedback.`;
  const s = tasSubs(true).find(x => x.key === key);
  if (!s) { const raw = chRaw(() => tasSubs(true).find(x => x.key === key)); return raw ? `Only the allocated assignment assessor (${chEff(raw.L.lid, 'asg', raw.L.batch)}) can publish feedback on this submission.` : 'This submission isn\'t in your marking.'; }
  if (!s.L.short && chEff(s.L.lid, 'asg', s.L.batch) !== me) return `Only the allocated assignment assessor (${chEff(s.L.lid, 'asg', s.L.batch)}) can publish feedback on this submission.`;
  if (s.L.batch && s.L.batch.coord === me) return 'The batch\'s Academic Coordinator can\'t publish assessment feedback for it (P-33).';
  if (s.L.status === 'Discontinued') return 'This learner\'s enrolment is Discontinued — read-only.';
  if (relStore()[key]) return 'This marking was sent to the Coordinator for release before direct publication — it is released from the Release queue.';
  if (s.status !== 'Submitted') return 'Only a submitted round can be published — this one has no new submission.';
  return '';
}
function ta1Publish(key) {
  const why = ta1PubWhy(key); if (why) { tasLog('Assessment', key, 'Blocked: publish feedback', '—', 'No change', why); toast(why, 'err'); return false; }
  const s = tasSubs(true).find(x => x.key === key), a = tasAsg(s), d = dft(key), today = Date.parse(now().toISOString().slice(0, 10));
  markable(a).forEach(q => { const x = d.items[q.id]; if (x && x.exit === 'resub') x.deadline = new Date(today + Math.round(+x.days) * DAY).toISOString().slice(0, 10); }); // window counted from publication
  const _r = render, _t = toast; render = () => {}; toast = () => {};
  try { releaseFeedback(s, a, d); } finally { render = _r; toast = _t; }
  tasLog('Assessment', `${s.L.name} · ${a.title}`, 'Feedback published to learner', s.status, 'Published (no Coordinator release — TA-1)', d.overall || '');
  closeModal(); render(); toast(`Feedback published to ${s.L.name}. They can see it now and have been notified.`);
  return true;
}
const _mkrTA1 = ACT.mkRelease;
ACT.mkRelease = el => {
  const key = el && el.dataset && el.dataset.k, why = key ? ta1PubWhy(key) : 'No submission.';
  if (why) { tasLog('Assessment', String(key || '—'), 'Blocked: publish feedback', '—', 'No change', why); toast(why, 'err'); return; }
  const m0 = MODAL, r = _mkrTA1(el);
  if (!MODAL || MODAL === m0 || !/Send to Coordinator for release/.test(MODAL.title || '')) return r; // a validation message stays as it is
  MODAL.title = 'Publish feedback to the learner?';
  MODAL.body = MODAL.body.replace(' will receive, once the Coordinator releases it:', ' will see now:')
    .replace(/due (\d+) days after the Coordinator releases it/g, 'due $1 days from today')
    .replace(/Status the learner will see once it is released: (<strong>[^<]*<\/strong>)\. You will see <strong>Awaiting Coordinator release<\/strong> until then\./, 'Status the learner will see: $1.')
    .replace('Nothing changes for the learner until the Coordinator releases it. The resubmission deadline is counted from the release date.', 'The learner sees your criterion judgements and feedback at once and is notified. Resubmission deadlines are counted from today. No Coordinator release is needed. The final Pass / Fail is published separately, from the Final outcome card.')
    .replace(/<strong>You won\\?'t be able to edit this marking after you send it\.<\/strong> It stays read-only until the Coordinator releases it\./, '<strong>Published feedback can\'t be edited here.</strong> A correction goes through a Data Correction Request.');
  MODAL.actions = [{ label: 'Cancel' }, { label: 'Publish to learner', cls: 'btn-primary', fn: () => ta1Publish(key) }];
  renderModal(); return r;
};
// The workspace button says what it does; a sent-for-release item keeps its Release-queue note
const _tmTA1 = SCREENS['t-mark'];
SCREENS['t-mark'] = p => { const h = _tmTA1(p); return typeof h === 'string' ? h.replace('>Send to Coordinator for release</button>', '>Publish feedback to learner</button>') : h; };
const _qdTA1 = typeof R3_MK !== 'undefined' ? R3_MK : null; if (_qdTA1) _qdTA1.mkRelease = 'publish feedback to the learner';

/* ---------- 5. Client demo: one identity with both responsibilities ---------- */
const TA1_DUAL = 'Omar Siddiqui';
function ta1Seed() {
  const b = typeof cdBatch === 'function' && cdBatch(); if (!b) return;
  const sam = STORE.worlds.CD4 && STORE.worlds.CD4.me.id;
  if (!(b.teachers || []).includes(TA1_DUAL)) (b.teachers = b.teachers || []).push(TA1_DUAL);
  if (sam && chCohLids(b).includes(sam) && !chOvOf(sam, 'pd')) (chOvs()[sam] = chOvs()[sam] || {}).pd = { name: TA1_DUAL, reason: 'Demo: one person with teaching and assessment responsibilities (TA-1).', by: 'Rachel Hughes', at: D(-30, '09:00') };
  chSyncAssessors(b);
}
const _fxlcTA1 = fxLoadClient;
fxLoadClient = function () { const r = _fxlcTA1.apply(this, arguments); try { ta1Seed(); ta1SyncAll(); } catch (e) { console.error(e); } return r; };
if (typeof FX !== 'undefined' && fxClient() && ta1Ready()) ta1Seed(); // a page already booted on the client demo
// The chooser: "Teacher + Assessor" after the Assessor
const _dpTA1 = drPersonas;
drPersonas = function () {
  const l = _dpTA1.apply(this, arguments), k = l.findIndex(p => p[0] === 'assessor'); if (k < 0 || l.some(p => p[0] === 'dual')) return l;
  const b = drB(), u = TAS_USERS.O;
  l.splice(k + 1, 0, ['dual', 'Academic staff', 'Teacher + Assessor', () => u.name, () => { const r = b ? ta1Resp(b, u.name) : []; return r.length ? `${b.code} · ${r.map(([x, w]) => x + (/only/.test(w) ? ' (' + w.replace(' only (override)', '') + ')' : '')).join(', ')}` : '(no batch)'; },
    () => ACT.demoSignInAsTas({ dataset: { v: 'O' } }), () => S.portal === 'staff' && S.tas.v === 'O']);
  return l;
};

/* ---------- Demo Scenario #1: the Assessor publishes; nothing waits for the Coordinator ---------- */
const _scTA1 = SC_LIST;
SC_LIST = function () {
  const l = _scTA1.apply(this, arguments), sc = l.find(x => x[0] === '1'); if (!sc) return l;
  const st = sc[3], re = (k, text) => { if (st[k]) st[k] = { ...st[k], text }; };
  sc[2] = sc[2] + ', TA-1';
  re(1, 'Assessor marks it (Met / Partially Met / Not Met, feedback, resubmission window in days) and chooses "Publish feedback to learner" — no Coordinator release (TA-1).');
  re(2, 'Academic Coordinator: nothing waits in the Release queue — it only holds marking sent before TA-1.');
  re(3, 'Learner sees the feedback, status and resubmission date — all at once, from the Assessor\'s publication.');
  return l;
};

/* ---------- Records ---------- */
// Final decisions: G6.3 (Coordinator release) is superseded for new marking by the confirmed client decision (PD-TA1-03)
{ const g = typeof FD_ROWS !== 'undefined' && FD_ROWS.find(r => r[0] === 'G6.3'); if (g && !/TA-1/.test(g[5] || '')) g[5] = (g[5] ? g[5] + ' ' : '') + 'Superseded by TA-1 (2 Nov 2026, confirmed client decision): the learner\x27s allocated assignment assessor publishes feedback straight to the learner — no Coordinator release. The Release queue only holds marking sent before TA-1, released by the batch\x27s Coordinator as before (PD-TA1-03).'; }
UXC.push(['TA-1', 'Teacher and Assessor client feedback (2 Nov 2026)', [
  'My Students, the dashboard and Staff Allocations read each person\'s batches from the batches themselves (Teacher, assignment / PD / observation assessor, learner override), so an allocation shows at once and survives a refresh; removal takes effect at once. The dashboard counts the same learners as My Students.',
  'The learner\'s allocated assignment assessor publishes criterion judgements, feedback and exits straight to the learner ("Publish feedback to learner"); no Coordinator release. The final Pass / Fail is still declared separately by that Assessor. Items already in the Release queue are released from there.',
  'One identity can teach and assess: teaching screens need a current Teacher allocation and assessment screens a current Assessor allocation. A "My responsibilities" card on the dashboard and profile lists each one.',
  'Client demo: Omar Siddiqui (Teacher + Assessor, his existing staff record) co-teaches DEMO-L3-JAN27 and is Sam Deposit\'s PD assessor (override); a "Teacher + Assessor" demo identity signs in as him.']]);
