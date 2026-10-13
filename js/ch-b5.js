/* ============================================================
   Client decisions — Batch 5: separate assessors for assignments, PD and observations (CH-17).
   Batch level: Assignment / PD / Observation assessor (one, two or three people) — the Coordinator edits their own
   batch, the Academic Admin and Super Admin any batch. Per learner: PD and Observation assessor can be overridden
   (with a reason); the Assignment assessor can't. Only the allocated assessor marks, runs PD or observes; other
   assessors don't see those items, and direct URL or action calls are refused and logged (as the Teacher-only lockout).
   Completed records keep the name they were done under. Loads after ch-b4.js.
   ============================================================ */
'use strict';

const CH_AROLES = [['asg', 'Assignment assessor'], ['pd', 'PD assessor'], ['obs', 'Observation assessor']];
const chAName = k => CH_AROLES.find(r => r[0] === k)[1];
const chAllocs = () => (STORE.chAlloc = STORE.chAlloc || {});
const chOvs = () => (STORE.chAssessOv = STORE.chAssessOv || {});
// The batch's allocation (kept in the store so it survives admin-data rebuilds); default from its assessors
const chAllocOf = b => { if (!b) return {}; const S_ = chAllocs(); if (!S_[b.code]) { const a = b.assessors || []; S_[b.code] = { asg: a[0] || null, pd: a[0] || null, obs: a[a.length - 1] || null }; } return (b.alloc = S_[b.code]); };
const chCohLids = b => (b.coh || []).map(e => e.lid || (e.v && STORE.worlds[e.v] && STORE.worlds[e.v].me.id)).filter(Boolean);
// The learner's current batch: their own world's programme batch, else the live batch whose cohort has them
const chBatchOfLid = lid => {
  const w = Object.values(STORE.worlds || {}).find(x => x.me && x.me.id === lid && x.nvq);
  if (w) { const c = (w.nvq.batch || '').split(' — ')[1], b = ADMIN.batches.find(x => x.code === c); if (b) return b; }
  return ADMIN.batches.find(b => ['In Progress', 'Open', 'Planned'].includes(b.status) && chCohLids(b).includes(lid)) || ADMIN.batches.find(b => chCohLids(b).includes(lid));
};
const chOvOf = (lid, k) => k !== 'asg' && (chOvs()[lid] || {})[k];
function chEff(lid, k, b) { const o = chOvOf(lid, k); if (o) return o.name; b = b && !b.short ? b : chBatchOfLid(lid); return b ? chAllocOf(b)[k] : null; }
// The roles a person holds on a batch (batch allocation or a learner override) — used by the IQA conflict rule
function chRoleOn(b, name) {
  const a = chAllocOf(b), roles = CH_AROLES.filter(([k]) => a[k] === name).map(([, l]) => 'the ' + l.replace(/^PD/, 'PD').replace(/^(Assignment|Observation)/, m => m.toLowerCase()));
  chCohLids(b).forEach(l => ['pd', 'obs'].forEach(k => { const o = chOvOf(l, k), r = 'the ' + chAName(k).replace(/^Observation/, 'observation') + ' for one learner'; if (o && o.name === name && !roles.includes(r)) roles.push(r); }));
  return roles.length ? roles.join(' and ').replace(/^the /, '') : '';
}
// Batch assessors = everyone holding an allocation there; their workspace gets the batch
function chSyncAssessors(b) {
  const a = chAllocOf(b), ov = chCohLids(b).flatMap(l => ['pd', 'obs'].map(k => (chOvOf(l, k) || {}).name)).filter(Boolean);
  b.assessors = [...new Set([a.asg, a.pd, a.obs].concat(ov).filter(Boolean))];
  Object.values(TAS_USERS).forEach(u => { if (b.assessors.includes(u.name) && !u.batches.includes(b.code)) u.batches.push(b.code); });
}
const chAssessorNames = () => [...new Set((typeof activeStaff === 'function' ? activeStaff('Assessor') : []).concat(Object.values(TAS_USERS).filter(u => u.roles.includes('Assessor')).map(u => u.name)))].sort();

/* ---------- Seed (mock data) ---------- */
function chAssessSeed() {
  const S_ = chAllocs(), set = (code, asg, pd, obs) => { if (!S_[code]) S_[code] = { asg, pd, obs }; };
  set('L3AC-JAN26', 'Sarah Okonkwo', 'Sarah Okonkwo', 'Sarah Okonkwo'); // one person holds all three roles
  set('L2DC-MAR26', 'James Pryce', 'Sarah Okonkwo', 'Michael Osei'); // three different assessors
  const O = chOvs(), at = D(-12, '10:00');
  if (!O['IA-L-33107']) O['IA-L-33107'] = { pd: { name: 'Michael Osei', reason: 'Continuity: Michael ran her PD at her previous employer.', by: 'Michael Osei', at } }; // Olivia Shaw (Croydon Cohort 4) — PD override
  if (!O['IA-L-30755']) O['IA-L-30755'] = { obs: { name: 'James Pryce', reason: 'James is the Academy\'s assessor nearest to Ben\'s workplace.', by: 'Dr Helen Carter', at } }; // Ben Carter (Leicester Cohort 7) — observation override
  ADMIN.batches.forEach(b => { chAllocOf(b); chSyncAssessors(b); });
  STORE.chAsgSeed = STORE.chAsgSeed || Object.fromEntries(ADMIN.batches.map(b => [b.code, chAllocOf(b).asg]));
  // an upcoming observation in Croydon Cohort 4, with that batch's observation assessor (Scenario #21)
  const lid = 'IA-L-33100', L = allLearners().find(l => l.id === lid);
  if (STORE.tas && STORE.tas.obs && L && !STORE.tas.obs.some(o => o.id === 'TO-9')) STORE.tas.obs.push({ id: 'TO-9', lid, learner: L.name, home: 'Addington Court Nursing Home', addr: '118 Addington Road, Croydon CR0 2BX', at: D(4, '10:00'), scope: '301 2.1, 301 2.2', nvqN: 2, iaN: 4, status: 'Confirmed', resp: 'Workplace contact', perm: 'Granted', assessor: 'Michael Osei' });
  // learners see who their assessors are; upcoming observations name the observation assessor (completed ones keep theirs)
  ['C', 'D'].forEach(v => { const w = STORE.worlds[v]; if (!w || !w.nvq) return; const b = chBatchOfLid(w.me.id); if (!b) return;
    w.nvq.people = w.nvq.people.filter(([r]) => !/^Assessor/.test(r)).concat(CH_AROLES.map(([k, l]) => [l.replace(' assessor', '') === 'Assignment' ? 'Assessor (assignments)' : k === 'pd' ? 'Assessor (PD)' : 'Assessor (observations)', chEff(w.me.id, k, b)]));
    (w.observations || []).filter(o => o.status !== 'Completed').forEach(o => { o.assessor = chEff(w.me.id, 'obs', b); }); });
}
const _isCh5 = initStore; initStore = function () { _isCh5(); STORE.chAlloc = {}; STORE.chAssessOv = {}; STORE.chAsgSeed = null; chAssessSeed(); };
const _baCh5 = buildAdmin; buildAdmin = function () { const r = _baCh5.apply(this, arguments); if (typeof STORE !== 'undefined' && STORE.worlds && ADMIN && ADMIN.batches) ADMIN.batches.forEach(b => { chAllocOf(b); chSyncAssessors(b); }); return r; };
if (typeof STORE !== 'undefined' && STORE.worlds && ADMIN) chAssessSeed();

/* ---------- Who can act (Teacher / Assessor portal) ---------- */
const chMe = () => TME().name;
const chScoped = () => hasRole('Assessor') && !S.chRaw;
const chRaw = f => { S.chRaw = true; try { return f(); } finally { S.chRaw = false; } };
// Marking: only the learner's assignment assessor sees and marks their submissions (resubmissions included)
const _tsCh5 = tasSubs;
tasSubs = function (all) { const out = _tsCh5(all); return chScoped() ? out.filter(r => r.L.short || chEff(r.L.lid, 'asg', r.L.batch) === chMe()) : out; };
// Attribution: a completed record keeps the marker it was done under, whatever the allocation is now
const _decCh5 = decorate;
decorate = function (r) { _decCh5(r); if (r.status !== 'Submitted' && !r.L.formerBy) { const rel = STORE.tas.rel[r.key]; r.markerName = (rel && rel.by) || (r.live && r.live.assessor) || (STORE.chAsgSeed || {})[r.L.batch.code] || r.markerName; } return r; };
const chRefuse = (module, what, holder, kind) => { tasLog(module, what, `Blocked: not the ${kind}`, '—', '—', `${chAName(kind === 'assignment assessor' ? 'asg' : kind === 'PD assessor' ? 'pd' : 'obs')}: ${holder || '—'}`); };
const _tmCh5 = SCREENS['t-mark'];
SCREENS['t-mark'] = p => {
  if (chScoped() && p && p.id && !tasSubs(true).some(x => x.key === p.id)) { const raw = chRaw(() => tasSubs(true).find(x => x.key === p.id)); if (raw) { chRefuse('Marking', `${raw.L.name} · ${raw.a.title}`, chEff(raw.L.lid, 'asg', raw.L.batch), 'assignment assessor'); return tasDenied(`submission ${raw.L.name} · ${raw.a.title} (assignment assessor: ${chEff(raw.L.lid, 'asg', raw.L.batch)})`); } }
  return _tmCh5(p);
};
// PD: only the learner's PD assessor proposes, records and postpones
const _pdlCh5 = tasPdList;
tasPdList = function () { const l = _pdlCh5(); return chScoped() ? l.filter(p => chEff(p.lid, 'pd') === chMe()) : l; };
['pdPropose', 'pdPostpone', 'pdOutcome'].forEach(a => { const f = ACT[a]; ACT[a] = el => { const lid = el && el.dataset && el.dataset.l; if (chScoped() && lid && chEff(lid, 'pd') !== chMe()) { const L = allLearners().find(x => x.id === lid); chRefuse('PD', `${a} · ${L ? L.name : lid}`, chEff(lid, 'pd'), 'PD assessor'); toast(`Only ${L ? L.name + '\'s' : 'the learner\'s'} PD assessor (${chEff(lid, 'pd') || '—'}) can do this.`, 'err'); return; } return f(el); }; });
// Observations: only the learner's observation assessor proposes, records and signs off
const _obsCh5 = tasObs;
tasObs = function () { const l = _obsCh5(); return chScoped() ? l.filter(o => chEff(o.lid, 'obs') === chMe()) : l; };
const _obPropCh5 = ACT.obPropose;
ACT.obPropose = el => {
  if (chScoped() && el && el.dataset && el.dataset.l && chEff(el.dataset.l, 'obs') !== chMe()) { chRefuse('Observations', 'obPropose · ' + el.dataset.l, chEff(el.dataset.l, 'obs'), 'observation assessor'); toast(`Only the learner's observation assessor (${chEff(el.dataset.l, 'obs')}) can propose observations.`, 'err'); return; }
  _obPropCh5(el); const sel = $('#op-l'); if (!sel || !chScoped()) return;
  [...sel.options].forEach(o => { if (chEff(o.value, 'obs') !== chMe()) o.remove(); });
  if (!sel.options.length) { closeModal(); toast('You are not the observation assessor for any of your learners.', 'info'); return; }
  INP.obPerm && INP.obPerm(sel);
};
['orSign', 'obCancel', 'obFollow'].forEach(a => { const f = ACT[a]; ACT[a] = el => { const id = (el && el.dataset && el.dataset.id) || (S.params || {}).id; if (chScoped() && id && !tasObs().some(o => o.id === id)) { const raw = chRaw(() => tasObs().find(o => o.id === id)); if (raw) { chRefuse('Observations', `${a} · ${raw.learner}`, chEff(raw.lid, 'obs'), 'observation assessor'); toast(`Only ${raw.learner}'s observation assessor (${chEff(raw.lid, 'obs')}) can do this.`, 'err'); return; } } return f(el); }; });
const _orCh5 = SCREENS['t-obsrec'];
SCREENS['t-obsrec'] = p => { if (chScoped() && p && p.id && !tasObs().some(o => o.id === p.id)) { const raw = chRaw(() => tasObs().find(o => o.id === p.id)); if (raw) chRefuse('Observations', 't-obsrec · ' + raw.learner, chEff(raw.lid, 'obs'), 'observation assessor'); } return _orCh5(p); };

/* ---------- Batch level: the "Assessors" panel ---------- */
const chIsCoordOf = b => S.portal === 'coord' && typeof myBatches === 'function' && myBatches().some(x => x.code === b.code) && !(typeof roBatch === 'function' && roBatch(b));
const chCanBatch = b => chIsCoordOf(b) || (S.portal === 'admin' && ((typeof isAca === 'function' && isAca()) || isSA()));
const chAudit = (...a) => { if (S.portal !== 'coord') return logA(...a); const me = ADMIN.me; ADMIN.me = { ...me, name: CME().name, roles: ['Academic Coordinator'] }; try { return logA(...a); } finally { ADMIN.me = me; } };
const chActor = () => S.portal === 'coord' ? { name: CME().name, role: 'Academic Coordinator' } : { name: ADMIN.me.name, role: isSA() ? 'Super Administrator' : 'Academic Admin' };
function chAssessPanel(b) {
  const a = chAllocOf(b), can = chCanBatch(b), names = chAssessorNames(), ovs = chCohLids(b).flatMap(l => ['pd', 'obs'].map(k => [l, k, chOvOf(l, k)])).filter(x => x[2]);
  const field = ([k, l]) => can ? `<div class="field"><label for="ch-as-${k}">${l}</label><select class="select" id="ch-as-${k}">${names.map(n => `<option ${n === a[k] ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>` : `<dt>${l}</dt><dd>${esc(a[k] || '—')}</dd>`;
  return `<section class="card ch-assess"><div class="row-b"><h2>Assessors</h2>${can ? `<button class="btn btn-sm btn-primary" data-act="chAssessSave" data-b="${b.code}">Save assessors</button>` : ''}</div>
    <p class="small muted">Defaults for every learner in ${esc(b.label || b.code)}. Choose one, two or three different people. Only the assignment assessor marks submissions (resubmissions included); only the PD assessor runs PD; only the observation assessor observes. PD and observation assessors can be changed for one learner from the learner's record.</p>
    ${can ? `<div class="form-grid">${CH_AROLES.map(field).join('')}</div>` : `<dl class="kv">${CH_AROLES.map(field).join('')}</dl>`}
    ${ovs.length ? `<h3 class="small">Learner overrides</h3><ul class="list small">${ovs.map(([l, k, o]) => `<li class="li"><div class="li-b"><span><strong>${esc((allLearners().find(x => x.id === l) || {}).name || l)}</strong> — ${chAName(k)}: ${esc(o.name)} ${chip('override', 'blue')}</span><span class="xs muted">${esc(o.reason)} · ${esc(o.by)}, ${fd(o.at)}</span></div></li>`).join('')}</ul>` : ''}</section>`;
}
function chNotifyAlloc(b, msgs, lid) {
  const at = now().toISOString(), go = lid ? 't-students.' + lid : 't-dashboard';
  msgs.forEach(([who, text]) => { if (who && typeof tasNotify === 'function') tasNotify('Assessor allocation changed', `${who}: ${text}`, go, 'Caseload'); });
  if (STORE.coo && b.coord) STORE.coo.notifs.unshift({ id: 'cn' + Date.now() + Math.random().toString(36).slice(2, 5), t: 'Assessor allocation changed', b: `${b.code}: ${msgs.map(m => m[1]).join(' · ')}`, at, go: lid ? 'c-learner.' + lid : 'c-batches.' + b.code, unread: true, to: b.coord });
}
ACT.chAssessSave = el => {
  const b = ADMIN.batches.find(x => x.code === el.dataset.b); if (!b) return;
  if (!chCanBatch(b)) { chAudit('Batches', `${b.label} (${b.code})`, 'Blocked: change assessors', '—', '—', 'Not allowed for ' + chActor().name); toast('Only the batch\'s Coordinator, the Academic Admin or the Super Admin can change its assessors.', 'err'); return; }
  const a = chAllocOf(b), next = Object.fromEntries(CH_AROLES.map(([k]) => [k, ($('#ch-as-' + k) || {}).value || a[k]])), changed = CH_AROLES.filter(([k]) => next[k] !== a[k]);
  if (!changed.length) { toast('No change to save.', 'info'); return; }
  reasonDlg({ title: 'Change assessors — ' + esc(b.code), ok: 'Save assessors', body: `<ul class="small">${changed.map(([k, l]) => `<li>${l}: ${esc(a[k] || '—')} → <strong>${esc(next[k])}</strong></li>`).join('')}</ul><p class="xs muted">Records already completed keep the name they were done under.</p>`,
    onOk: r => { const who = chActor(), old = { ...a }; changed.forEach(([k]) => { a[k] = next[k]; }); chSyncAssessors(b);
      changed.forEach(([k, l]) => chAudit('Batches', `${b.label} (${b.code})`, `${l} changed`, old[k] || '—', a[k], r));
      (b.staffHist = b.staffHist || []).push([changed.map(([k, l]) => `${l} ${old[k] || '—'} → ${a[k]}`).join('; '), now().toISOString(), r]);
      chNotifyAlloc(b, changed.flatMap(([k, l]) => [[a[k], `you are now the ${l.toLowerCase()} for ${b.code}`], [old[k], `you are no longer the ${l.toLowerCase()} for ${b.code}`]]).filter(([n]) => n));
      if (typeof syncTasBatches === 'function') syncTasBatches(); render(); toast(`Assessors saved by ${who.name}. The assessors and the Coordinator have been notified.`); } });
};

/* ---------- Learner level: PD / observation override ---------- */
function chOvCard(lid) {
  const b = chBatchOfLid(lid); if (!b) return '';
  const a = chAllocOf(b), can = S.portal === 'coord' ? chIsCoordOf(b) : (S.portal === 'admin' && ((typeof isAca === 'function' && isAca()) || isSA()));
  const row = ([k, l]) => { const o = chOvOf(lid, k); return `<dt>${l}</dt><dd><strong>${esc(chEff(lid, k, b) || '—')}</strong> ${o ? chip('override', 'blue') + ` <span class="xs muted">${esc(o.reason)} · ${esc(o.by)}, ${fd(o.at)}</span>` : '<span class="xs muted">batch default</span>'}${k === 'asg' ? '<div class="xs muted">The assignment assessor is set for the whole batch — it can\'t be changed for one learner.</div>' : can ? `<div class="row" style="gap:4px;margin-top:4px"><button class="btn btn-sm" data-act="chOvSet" data-l="${lid}" data-k="${k}">Change</button>${o ? `<button class="btn btn-sm" data-act="chOvReset" data-l="${lid}" data-k="${k}">Reset to batch default</button>` : ''}</div>` : ''}</dd>`; };
  return `<section class="card ch-ovcard"><h2>Assessors for this learner</h2><p class="small muted">${esc(b.label || b.code)} defaults: assignments ${esc(a.asg || '—')}, PD ${esc(a.pd || '—')}, observations ${esc(a.obs || '—')}.</p><dl class="kv">${CH_AROLES.map(row).join('')}</dl></section>`;
}
const chCanOv = b => S.portal === 'coord' ? chIsCoordOf(b) : (S.portal === 'admin' && ((typeof isAca === 'function' && isAca()) || isSA()));
ACT.chOvSet = el => {
  const lid = el.dataset.l, k = el.dataset.k, b = chBatchOfLid(lid), L = allLearners().find(x => x.id === lid);
  if (k === 'asg' || !b || !chCanOv(b)) { chAudit('Batches', `${L ? L.name : lid}`, 'Blocked: assessor override', '—', '—', k === 'asg' ? 'Assignment assessor is batch-level' : 'Not allowed for ' + chActor().name); toast(k === 'asg' ? 'The assignment assessor can\'t be changed for one learner.' : 'You can\'t change this learner\'s assessors.', 'err'); return; }
  const cur = chEff(lid, k, b);
  reasonDlg({ title: `${chAName(k)} for ${esc(L ? L.name : lid)}`, ok: 'Save override', extra: `<div class="field"><label for="ch-ov-n">${chAName(k)}</label><select class="select" id="ch-ov-n">${chAssessorNames().map(n => `<option ${n === cur ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select><span class="hint">Batch default: ${esc(chAllocOf(b)[k] || '—')}</span></div>`,
    onOk: r => { const n = $('#ch-ov-n').value; if (n === cur) { fieldErr('#ch-ov-n', 'Choose a different assessor'); return false; } const who = chActor();
      (chOvs()[lid] = chOvs()[lid] || {})[k] = { name: n, reason: r, by: who.name, at: now().toISOString() }; chSyncAssessors(b);
      chAudit('Batches', `${L ? L.name : lid} · ${b.code}`, `${chAName(k)} override`, cur || '—', n, r);
      chNotifyAlloc(b, [[n, `you are now ${L ? L.name : lid}'s ${chAName(k).toLowerCase()}`], [cur, `you are no longer ${L ? L.name : lid}'s ${chAName(k).toLowerCase()}`]], lid);
      if (typeof syncTasBatches === 'function') syncTasBatches(); render(); toast(`${chAName(k)} for ${L ? L.name : lid}: ${n} (override).`); } });
};
ACT.chOvReset = el => {
  const lid = el.dataset.l, k = el.dataset.k, b = chBatchOfLid(lid), L = allLearners().find(x => x.id === lid), o = chOvOf(lid, k);
  if (!o || !b || !chCanOv(b)) { toast('Nothing to reset.', 'err'); return; }
  reasonDlg({ title: 'Reset to batch default — ' + esc(L ? L.name : lid), ok: 'Reset to batch default', body: `<p class="small">${chAName(k)}: ${esc(o.name)} → <strong>${esc(chAllocOf(b)[k] || '—')}</strong> (batch default).</p>`,
    onOk: r => { delete chOvs()[lid][k]; chSyncAssessors(b); chAudit('Batches', `${L ? L.name : lid} · ${b.code}`, `${chAName(k)} reset to batch default`, o.name, chAllocOf(b)[k] || '—', r);
      chNotifyAlloc(b, [[chAllocOf(b)[k], `you are now ${L ? L.name : lid}'s ${chAName(k).toLowerCase()} again`], [o.name, `you are no longer ${L ? L.name : lid}'s ${chAName(k).toLowerCase()}`]], lid); render(); toast('Reset to the batch default.'); } });
};

/* ---------- Where the panel and the card appear ---------- */
const _cBatchCh5 = SCREENS['c-batches'];
SCREENS['c-batches'] = p => { const h = _cBatchCh5(p), b = p && p.id && ADMIN.batches.find(x => x.code === p.id); if (!b || (p.tab && p.tab !== 'overview')) return h; const k = h.indexOf('<div class="grid-2"><section class="card"><dl class="kv"><dt>Programme</dt>'); return k < 0 ? h : h.slice(0, k) + chAssessPanel(b) + h.slice(k); };
const _aBatchCh5 = SCREENS['a-batches'];
SCREENS['a-batches'] = p => { const h = _aBatchCh5(p), b = p && p.id && ADMIN.batches.find(x => x.code === p.id); if (!b || p.tab !== 'staff') return h; const m = /(<dt>Assessors<\/dt>[\s\S]*?<\/section>)/.exec(h); return m ? h.replace(m[1], m[1] + chAssessPanel(b)) : h + chAssessPanel(b); };
const _cLearnerCh5 = SCREENS['c-learner'];
SCREENS['c-learner'] = p => { const h = _cLearnerCh5(p); if (p.tab && p.tab !== 'summary') return h; const k = h.indexOf('<section class="card"><dl class="kv"><dt>Learner ID</dt>'); return k < 0 ? h : h.slice(0, k) + chOvCard(p.id) + h.slice(k); };
const _aLearnerCh5 = SCREENS['a-learner'];
SCREENS['a-learner'] = p => { const h = _aLearnerCh5(p); if ((p.tab && p.tab !== 'overview') || !p.id || !chBatchOfLid(p.id)) return h; const k = h.indexOf('<div class="grid-2">'); return k < 0 ? h : h.slice(0, k) + chOvCard(p.id) + h.slice(k); };

/* ---------- Demo Scenario #21 "Separate assessors" ---------- */
const chTas = v => { S.tas.v = v; tasEnter(); S.signedIn = true; };
const chCoordB = (route, id) => { S.coo.v = 'B'; cooEnter(); S.signedIn = true; go(route, { id }); toast('Viewing as Michael Osei — Croydon Cohort 4\'s Academic Coordinator.', 'info'); };
ACT.chSc21Batch = () => chCoordB('c-batches', 'L2DC-MAR26');
ACT.chSc21Learner = () => chCoordB('c-learner', 'IA-L-33100');
ACT.chSc21James = () => { chTas('S'); go('t-queue'); toast('Viewing as James Pryce — Croydon Cohort 4\'s assignment assessor.', 'info'); };
ACT.chSc21Michael = () => { chTas('M'); go('t-obs'); toast('Viewing as Michael Osei — Croydon Cohort 4\'s observation assessor.', 'info'); };
ACT.chSc21Sarah = () => { chTas('A'); go('t-obsrec', { id: 'TO-9' }); toast('Viewing as Sarah Okonkwo — now this learner\'s observation assessor.', 'info'); };
const _scListCh5 = SC_LIST;
SC_LIST = function () {
  const s = (text, r, t, act) => ({ text, r, t, act });
  return _scListCh5().concat([['21', 'Separate assessors', 'CH-17', [
    s('The Coordinator sets three assessors for Croydon Cohort 4: James Pryce (assignments), Sarah Okonkwo (PD), Michael Osei (observations).', '', '', 'chSc21Batch'),
    s('James, the assignment assessor, marks the batch\'s submissions — nobody else sees them in their Marking Queue.', '', '', 'chSc21James'),
    s('Sarah, the PD assessor, runs Professional Discussions for the batch.', 'staff', 't-pd'),
    s('Michael, the observation assessor, has the batch\'s observations.', '', '', 'chSc21Michael'),
    s('The Coordinator changes one learner\'s observation assessor to Sarah, with a reason (shown as an override).', '', '', 'chSc21Learner'),
    s('Only Sarah can now record that observation; Michael\'s attempt is refused and logged.', '', '', 'chSc21Sarah')]]]);
};
CDL_SCEN.push(['21', 'Separate assessors', 'Client-defined (CH-17)']);

/* ---------- Records ---------- */
CH_APPLIED[5] = '13 Oct 2026';
UXC.push(['CH batch 5', 'Client decisions — Batch 5 (CH-17)', [
  'CH-17: Coordinator → batch detail → new "Assessors" panel with three dropdowns — Assignment assessor, PD assessor, Observation assessor (one, two or three different people). The Coordinator edits their own batch; the Academic Admin and Super Admin any batch (Admin → batch → Staff). Changes need a reason, are audited, and notify the affected assessors and the Coordinator. "Edit staff" keeps teachers only.',
  'CH-17: per learner (Coordinator → learner record; Academic Admin → Learner 360), the PD and Observation assessors can be changed with a reason — shown with an "override" chip and "Reset to batch default". The Assignment assessor can\'t be changed per learner.',
  'CH-17: only the learner\'s assignment assessor sees and marks their submissions (resubmissions included); only the PD assessor proposes, records and postpones PD; only the observation assessor proposes, records and signs off observations. Other assessors don\'t see those items; direct URLs and action calls are refused and logged, as with the Teacher-only lockout.',
  'CH-17: changing an allocation never changes the name on records already completed. IQA conflict rule: an IQA can\'t sample a batch where they hold any of the three allocations (or a learner override), or teach it.',
  'Mock: Croydon Cohort 4 — three different assessors (James Pryce, Sarah Okonkwo, Michael Osei); Leicester Cohort 7 — Sarah Okonkwo holds all three; Olivia Shaw (Croydon Cohort 4) — PD override (Michael Osei); Ben Carter (Leicester Cohort 7) — observation override (James Pryce); observation TO-9 in Croydon Cohort 4 (Rhys Morgan). Learners see their three assessors under "Your people". Demo Scenario #21 "Separate assessors".']]);

/* ---------- Screen index (with purpose lines) ---------- */
const _aIdxCh5 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxCh5(p).replace(/(<section class="card idx-sec"><h2>Client decisions \(CH\)<\/h2><ul class="idx-list">)/, `$1${[
  chIdxLi('Batch → Staff — Assessors panel', { act: 'aJump', t: 'a-batches.L2DC-MAR26.staff' }, 'CH-17 — assignment, PD and observation assessors for the batch.'),
  chIdxLi('Learner 360 — assessors for this learner (override)', { act: 'aJump', t: 'a-learner.IA-L-33107' }, 'CH-17 — a PD override with its reason; reset to the batch default.')].join('')}`);
const _cIdxCh5 = SCREENS['c-index'];
SCREENS['c-index'] = p => _cIdxCh5(p) + `<section class="card idx-sec"><h2>Client decisions (CH)</h2><ul class="idx-list">${[
  chIdxLi('Batch detail — Assessors panel', { act: 'goTok', t: 'c-batches.L3AC-JAN26' }, 'CH-17 — set the three assessors for your batch.'),
  chIdxLi('Learner record — assessors for this learner', { act: 'goTok', t: 'c-learner.IA-L-30755' }, 'CH-17 — an observation override; change or reset to the batch default.')].join('')}</ul></section>`;
