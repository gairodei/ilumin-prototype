/* ============================================================
   SA-FINAL B — data protection and archive (SA-09), integration settings (SA-10). PD-SAF-B-* in PROVISIONAL-DECISIONS.md.
   Defects #3 (archive eligibility by list index), #11 (retention Save discarded), #17 (archive / restore / deactivate /
   reactivate audit "before"), #18 (simulated export told as emailed), #19 (intTest without a role check), and the unguarded
   cfgSaved / logDsr (g5).
   - Eligibility is computed from the learner's own records (enrolments, NVQ admission, balance, open approval items, open data
     requests, bank transfers awaiting confirmation). Anything that can't be checked counts as NOT eligible (fail closed) and
     the reason is shown. No inactivity rule: the grace period is undecided (client question). Single (lAct) and bulk archive
     both re-check it in the handler, again when the dialog is confirmed.
   - Retention is display-only and labelled "Not enforced"; no compliance or hosting claims; the data export is a simulated record.
   - Integrations: audited Edit of non-secret fields only (SMS Sender ID; Email sender name / address), Super Administrator and
     System Administrators (the intReveal rule); secrets are never shown or edited and never enter the saved demo copy.
   A prototype can only enforce this in the browser. PRODUCTION MUST ENFORCE IT ON THE SERVER.
   Loads after every earlier batch (mr-g1.js guards are inner), so each wrapper here is the outermost one.
   ============================================================ */
'use strict';

/* ---------- Shared ---------- */
const SAB_MOD = 'Data Protection & Archive';
const SAB_TERM = ['Completed', 'Expired-Incomplete', 'Discontinued']; // enrolment statuses that are finished
const SAB_NVQ_TERM = ['Completed', 'Discontinued', 'Seat released'];
const sabRoleWhy = () => g1SaSys() ? '' : G1_WHY.learner; // P-07 provisional (PD-MR-G1-02): Super Administrator / System Administrators
// Wrap the primary / danger action of the dialog just opened: pre() before it (return { stop: true } to refuse), post(ctx) after a success
const sabOnConfirm = (m0, pre, post) => {
  if (!MODAL || MODAL === m0) return;
  (MODAL.actions || []).forEach(x => { if (x.fn && x.cls && /primary|danger/.test(x.cls)) { const g = x.fn; x.fn = (...z) => { const c = pre ? pre() || {} : {}; if (c.stop) return false; const r = g(...z); if (r !== false && post) post(c); return r; }; } });
};
const sabSave = () => { if (typeof fcpSave === 'function') fcpSave(); };

/* ---------- SA-09 #3: archive eligibility from the learner's records ---------- */
// Open approval items that name the learner (by ID, name, world key or refund payer)
const sabQ = (L, k) => (ADMIN.queue || []).filter(i => {
  if (!isOpen(i)) return false; const d = i.data || {}, rel = (i.related || []).map(String);
  return rel.some(s => s.includes(L.id) || s === L.name || s.startsWith(L.name + ' ·')) || d.lid === L.id || i.lid === L.id || (!!k && d.v === k) || (i.type === 'Refund' && typeof fiPayerOf === 'function' && fiPayerOf(i) === L.name);
});
function sabElig(L) {
  if (!L) return { ok: false, why: ['The learner record was not found.'] };
  const why = [], k = typeof lrnKey === 'function' ? lrnKey(L) : L.v, w = k ? STORE.worlds[k] : null;
  if (L.rec !== 'Active') why.push('The record is already archived.');
  if (w) {
    const enr = w.enrolments || [], live = enr.filter(e => !SAB_TERM.includes(e.status));
    if (live.length) why.push('Enrolment not finished: ' + live.map(e => `${e.title} (${e.status || 'status not recorded'})`).join('; ') + '.');
    if (w.nvq && w.flags && w.flags.admitted && !SAB_NVQ_TERM.includes(w.nvq.status) && !enr.some(e => e.title === w.nvq.title)) why.push(`NVQ programme not finished: ${w.nvq.title} (${w.nvq.status || 'in progress'}).`);
    if (w.admission && !(w.flags && w.flags.admitted) && !['Rejected', 'Withdrawn'].includes(w.admission.status)) why.push(`Admission application open (${w.admission.status || 'status not recorded'}).`);
    if ((STORE.chBank || []).some(x => x.v === k && x.status === 'Awaiting confirmation')) why.push('A bank transfer is awaiting Finance confirmation.');
    if (L.v && STORE.acct[L.v] === 'Deactivated') why.push('The account is deactivated; in this prototype archiving would overwrite that state.');
  } else if ((L.courses || []).length) why.push('Enrolment status isn\'t recorded for this learner (course names only), so it can\'t be confirmed that every enrolment has finished.');
  let f = null; try { f = typeof finLearner === 'function' ? finLearner(L) : null; } catch (e) { f = null; }
  if (!f || !(f.out >= 0)) why.push('The account balance couldn\'t be checked.');
  else if (f.out > 0) why.push(`Outstanding balance ${money(f.out, 'GBP')}.`);
  else if (f.overdue) why.push('A payment is overdue.');
  const q = sabQ(L, k); if (q.length) why.push('Open approval item: ' + q.map(i => `${i.id} (${i.type})`).join('; ') + '.');
  const d = (ADMIN.dsr || []).filter(x => x.status !== 'Completed' && (x.lid === L.id || (!x.lid && x.who === L.name)));
  if (d.length) why.push('Open data request: ' + d.map(x => x.id).join(', ') + ' (handled in Data requests).');
  return { ok: !why.length, why };
}
// A refusal on the record's state (not an authorisation breach): audit row under the real actor
const sabRefuse = (id, L, why) => g1StLog('Learners', id, 'Archive refused: not eligible', L ? L.rec : '—', 'Not archived', why.join(' '));
const sabSetArch = L => { if (L.v) STORE.acct[L.v] = 'Archived'; else { const row = ADMIN.learners.find(x => x.id === L.id); if (row) row.rec = 'Archived'; } };
const SAB_ARCH_TXT = 'Archiving makes the record read-only and keeps it. Nothing is deleted, and it can be restored to Active. Every later staff access needs a stated purpose and is logged.';

// Bulk archive (the eligibility tab; also callable directly): role, then eligibility of each learner, again on confirm
ACT.saArchive = el => {
  const ids = String(g1Ds(el).ids || g1Ds(el).id || '').split(',').map(s => s.trim()).filter(Boolean);
  if (g1No(SAB_MOD, ids.join(', ') || '—', 'archive learner records', sabRoleWhy())) return false;
  if (!ids.length) { toast('Select at least one learner.', 'err'); return false; }
  const chk = () => ids.map(id => { const L = learnerById(id); return { id, L, e: sabElig(L) }; });
  const rows = chk(), yes = rows.filter(x => x.e.ok), no = rows.filter(x => !x.e.ok);
  no.forEach(x => sabRefuse(x.id, x.L, x.e.why));
  if (!yes.length) { toast(`Not archived: ${no.length === 1 ? (no[0].L ? no[0].L.name : no[0].id) + ' — ' + no[0].e.why[0] : no.length + ' learners are not eligible (reasons in the audit log and on the Not eligible list).'}`, 'err'); render(); return false; }
  reasonDlg({ title: `Archive ${yes.length} record${yes.length > 1 ? 's' : ''}`, ok: 'Archive', danger: true,
    body: `<p class="small">${SAB_ARCH_TXT}</p><p class="small">${yes.map(x => esc(x.L.name)).join(', ')}</p>${no.length ? `<p class="small">${no.length} selected learner${no.length > 1 ? 's are' : ' is'} not eligible and won't be archived (recorded in the audit log).</p>` : ''}`,
    onOk: r => {
      if (g1No(SAB_MOD, ids.join(', '), 'archive learner records', sabRoleWhy())) { closeModal(); return false; }
      let n = 0;
      yes.forEach(x => { const L = learnerById(x.id), e = sabElig(L); if (!e.ok) { sabRefuse(x.id, L, e.why); return; } sabSetArch(L); logA('Learners', L.id, 'Archive record', 'Active', 'Archived', r); n++; });
      const s = dts('elig'); if (s) s.sel = [];
      render(); toast(n ? `${n} record${n > 1 ? 's' : ''} archived. Nothing was deleted; they can be restored.` : 'Nothing was archived: the selected learners are no longer eligible.', n ? 'ok' : 'err');
    } });
};

/* ---------- SA-09 #3 / #17: single archive, restore, deactivate, reactivate (lAct) ---------- */
const SAB_LBL = { deactivate: 'Deactivate account', reactivate: 'Reactivate account', archive: 'Archive record', restore: 'Restore to Active' };
const _lActSAB = ACT.lAct;
ACT.lAct = function (el) {
  const d = g1Ds(el), a = d.a;
  if (!SAB_LBL[a] || !g1SaSys()) return _lActSAB.apply(this, arguments); // other actions and unauthorised callers: the MR-G1 guard decides
  const L0 = learnerById(d.id); if (!L0) { toast('That learner is not available.', 'err'); return false; }
  const no = L => { const e = sabElig(L); if (e.ok) return false; sabRefuse(d.id, L, e.why); toast(`Not archived: ${e.why[0]} Archiving is only for learners whose records show nothing still active or open.`, 'err'); return true; };
  if (a === 'archive' && no(L0)) return false;
  const field = ['deactivate', 'reactivate'].includes(a) ? 'acct' : 'rec', m0 = MODAL, r = _lActSAB.apply(this, arguments);
  // #17: the "before" is the state read before the change (lAct mutated an admin row before logging it)
  sabOnConfirm(m0, () => { if (!g1SaSys()) return {}; const L = learnerById(d.id); if (a === 'archive' && no(L)) { closeModal(); return { stop: true }; } return { before: L ? L[field] : '—', n: ADMIN.audit.length }; },
    c => { if (!c.before) return; for (let k = 0; k < ADMIN.audit.length - c.n; k++) { const x = ADMIN.audit[k]; if (x.entity === d.id && x.action === SAB_LBL[a]) { x.before = c.before; break; } } sabSave(); });
  return r;
};
// Learner 360: the Archive button is offered only when the learner is eligible; otherwise the reason is shown
const _lOvSAB = lOverview;
lOverview = function (L) {
  const h = _lOvSAB.apply(this, arguments); if (!L || L.rec !== 'Active') return h;
  const e = sabElig(L); if (e.ok) return h;
  return h.replace(new RegExp(`<button class="btn" data-act="lAct" data-id="${L.id}" data-a="archive">Archive record</button>`), `<button class="btn" disabled aria-disabled="true">Archive record</button><p class="xs muted sab-why1">Not eligible for archiving: ${esc(e.why[0])} See Data Protection → Archive eligibility.</p>`);
};

/* ---------- SA-09: the screen (purpose, eligibility, data requests, retention, residency) ---------- */
const sabGrace = () => { const c = (ADMIN.config || []).find(x => x.name === 'Archive grace period'); return c ? c.value : null; };
const sabPurpose = () => `<div class="note b-grey sab-purpose">${ic('shield')}<div class="small"><strong>What this module is for.</strong>
  <ul class="sab-defs"><li><strong>Archive</strong> — the learner's record becomes read-only and is kept. Nothing is deleted, and it can be restored to Active. The learner can still sign in read-only.</li>
  <li><strong>Restricted access</strong> — staff opening an archived record must state a purpose; each access is logged (Audit &amp; Security → Access to archived records).</li>
  <li><strong>Deletion</strong> — not available in this prototype. No learner data is ever deleted here. Whether archiving is an acceptable response to an erasure request is a client and legal decision, not decided by the prototype.</li></ul></div></div>`;
const sabEligTab = () => {
  const rows = allLearners().filter(l => l.rec === 'Active').map(l => ({ ...l, _e: sabElig(l) })), yes = rows.filter(r => r._e.ok), no = rows.filter(r => !r._e.ok), g = sabGrace();
  return `<section class="card sab-rule"><h2>When a learner can be archived</h2><p class="small">Checked from each learner's records every time this list is shown and again when you archive. A learner is eligible only when all of these are true:</p>
  <ul class="small"><li>their record is Active (not already archived);</li><li>every enrolment is Completed, Expired-Incomplete or Discontinued (or they have none), and no NVQ admission application is open;</li><li>nothing is outstanding or overdue on their account, and no bank transfer is awaiting confirmation;</li><li>no open approval item (refund, data correction, discontinuation, extension, etc.) and no open data request names them.</li></ul>
  <p class="small">If any of this can't be checked (for example, a record that lists course names without enrolment statuses), the learner is <strong>not eligible</strong> and the reason is shown.</p>
  <p class="small muted">No inactivity rule is applied: the client hasn't decided the grace period${g ? ` (the "Archive grace period" setting in System Configuration, "${esc(g)}", is not used)` : ''}. Last activity is shown for information only.</p></section>
  <h2 class="sab-h">Eligible (${yes.length})</h2>${dt({ id: 'elig', name: 'Archive eligibility', rows: yes, search: l => l.name + l.id, empty: 'No learner is eligible: every active record still has an enrolment, a balance or an open process, or its status can\'t be confirmed.',
    bulk: [{ l: 'Archive selected', fn: ids => ACT.saArchive({ dataset: { ids: ids.join(',') } }) }],
    cols: [{ k: 'name', l: 'Learner' }, { k: 'id', l: 'ID', h: l => `<span class="mono small">${l.id}</span>` }, { k: 'why', l: 'Checked', h: () => '<span class="small">No unfinished enrolment, balance or open process</span>', v: () => 'Eligible' }, { k: 'last', l: 'Last activity (information only)', h: l => l.last ? fd(l.last) : '—', v: l => l.last || '' }] })}
  <h2 class="sab-h">Not eligible (${no.length})</h2>${dt({ id: 'elig-no', name: 'Not eligible for archiving', rows: no, search: l => l.name + l.id + l._e.why.join(' '), empty: 'Every active learner is eligible.',
    cols: [{ k: 'name', l: 'Learner' }, { k: 'id', l: 'ID', h: l => `<span class="mono small">${l.id}</span>` }, { k: 'why', l: 'Why not', h: l => `<ul class="sab-why small">${l._e.why.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`, v: l => l._e.why.join(' '), nosort: 1 }, { k: 'last', l: 'Last activity (information only)', h: l => l.last ? fd(l.last) : '—', v: l => l.last || '' }] })}`;
};
const SAB_RET = [['Finance records', '6 years'], ['Assessment evidence', 'Awarding-body horizon'], ['Communications', '24 months'], ['Operational logs', '12 months']];
const sabRetTab = () => `<section class="card sab-ret"><div class="row-b"><h2>Retention settings</h2>${chip('Not enforced', 'amber')}</div>
  <p class="small">These periods are placeholder text from the demo data. The prototype does not apply them: nothing is archived or deleted automatically, and they have no legal sign-off. They can't be edited here. The client is to confirm a period for each category.</p>
  <div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Data category</th><th>Placeholder period</th><th>Status</th></tr></thead><tbody>${SAB_RET.map(r => `<tr><td>${r[0]}</td><td>${esc(r[1])}</td><td>${chip('Not enforced', 'amber')}</td></tr>`).join('')}</tbody></table></div></section>`;
const sabResTab = () => `<section class="card"><h2>Data region</h2><p class="small">Intended data region — a production hosting requirement, not implemented in this prototype (the demo keeps its data in this browser): learners in the UAE are stored in the UAE; learners in the UK and every other country are stored in the UK. The country is set at registration and never changes.</p><p>Data region UK: <strong>${allLearners().filter(l => regionOf(l.country) === 'UK').length}</strong> · Data region UAE: <strong>${allLearners().filter(l => regionOf(l.country) === 'UAE').length}</strong></p></section>`;
const sabDsrTab = () => `<section class="card"><div class="row-b"><h2>Data requests</h2><button class="btn btn-sm btn-primary" data-act="logDsr">Log request</button></div><p class="small muted">Learners ask through an Academic Admin, who logs the request from the message thread. The prototype tracks a deadline of one month from the date logged. Only System and Super Administrators act on requests. An access request creates a simulated export record — no file is generated or sent. Nothing is ever deleted.</p>${dt({ id: 'dsr', name: 'Data requests', rows: ADMIN.dsr, noExport: true, rid: d => d.id, cols: [{ k: 'id', l: 'ID', h: d => `<span class="mono">${d.id}</span>` }, { k: 'who', l: 'Learner' }, { k: 'type', l: 'Type' }, { k: 'at', l: 'Date logged', h: d => fd(d.at), v: d => d.at }, { k: 'by', l: 'Logged by', v: d => d.loggedBy || '—' }, { k: 'due', l: 'Deadline (tracked)', h: d => fd(dsrDue(d)), v: d => dsrDue(d) }, { k: 'left', l: 'Days remaining', h: d => d.status === 'Completed' ? '—' : (n => chip(n < 0 ? `${-n} days overdue` : `${n} days`, n < 0 ? 'red' : n <= 7 ? 'amber' : 'grey'))(dsrLeft(d)), s: d => dsrLeft(d), v: d => String(dsrLeft(d)) }, { k: 'status', l: 'Status', h: d => chip(d.status, d.status === 'Open' ? 'amber' : 'green'), v: d => d.status }, { k: 'decision', l: 'Outcome', h: d => `<span class="small">${esc(d.decision || '—')}</span>`, v: d => d.decision || '' }],
  act: d => d.status !== 'Open' || !g1SaSys() ? '' : d.type === 'Access' ? (d.exported ? `<button class="btn btn-sm btn-primary" data-act="dsrDone" data-id="${d.id}">Mark completed</button>` : `<button class="btn btn-sm btn-primary" data-act="dsrExport" data-id="${d.id}">Record simulated export</button>`) : (d.archived ? `<button class="btn btn-sm btn-primary" data-act="dsrDone" data-id="${d.id}">Mark completed</button>` : `<button class="btn btn-sm btn-danger" data-act="dsrArchive" data-id="${d.id}">Archive learner</button>`) })}</section>`;
SCREENS['a-dataprotection'] = (p) => {
  const t = (p && p.tab) || 'archived';
  const st = subtabs([['archived', 'Archived records'], ['eligible', 'Archive eligibility'], ['dsr', 'Data requests'], ['retention', 'Retention settings'], ['residency', 'Data residency']], t, 'a-dataprotection');
  const body = {
    archived: dt({ id: 'arch', name: 'Archived learners', rows: allLearners().filter(l => l.rec === 'Archived'), search: l => l.name + l.id, cols: [{ k: 'name', l: 'Learner' }, { k: 'id', l: 'ID', h: l => `<span class="mono small">${l.id}</span>` }, { k: 'last', l: 'Last activity', h: l => fd(l.last) }], act: l => `<button class="btn btn-sm" data-go="a-learner" data-id="${l.id}">Open (purpose required)</button> <button class="btn btn-sm" data-act="lAct" data-id="${l.id}" data-a="restore">Restore to Active</button>`, empty: 'No archived records' }),
    eligible: sabEligTab(), dsr: sabDsrTab(), retention: sabRetTab(), residency: sabResTab(),
  }[t] || '';
  return pageA('Data Protection & Archive') + sabPurpose() + st + body;
};

/* ---------- SA-09 #11: Retention "Save" — nothing to save (display-only); guarded ---------- */
ACT.cfgSaved = () => {
  if (g1No('System Configuration', S.route || '—', 'save settings', g1SaSys() ? '' : 'These settings are managed by the Super Administrator and System Administrators.')) return false;
  toast('Nothing was saved: these settings are display-only and not enforced in the prototype.', 'info'); return false;
};

/* ---------- SA-09: data requests — who logs them; the export is a simulated record (#18) ---------- */
const sabDsrLogWhy = () => g1SaSys() || (g1Adm() && typeof isAca === 'function' && isAca()) ? '' : 'Data requests are logged by the Super Administrator, System Administrators and Academic Admins.';
const _logDsrSAB = ACT.logDsr;
ACT.logDsr = function () {
  if (g1No(SAB_MOD, '—', 'log a data request', sabDsrLogWhy())) return false;
  const m0 = MODAL, r = _logDsrSAB.apply(this, arguments); g1OnConfirm(m0, () => g1No(SAB_MOD, '—', 'log a data request', sabDsrLogWhy())); return r;
};
ACT.dsrExport = el => {
  const id = g1Ds(el).id; if (g1No(SAB_MOD, id || '—', 'export a learner\'s data', g1SaSys() ? '' : G1_WHY.dsr)) return false;
  const d = (ADMIN.dsr || []).find(x => x.id === id); if (!d) { toast('That data request is not available.', 'err'); return false; }
  if (d.type !== 'Access' || d.status !== 'Open') { toast(`${d.id} has no export to record.`, 'err'); return false; }
  if (d.exported) { toast(`A simulated export record already exists for ${d.id}.`, 'info'); return false; }
  const at = now().toISOString(); d.exported = at;
  ADMIN.exportsLog.unshift({ who: ADMIN.me.name, what: `Simulated data export record — ${d.who} (${d.id}); no file generated`, at });
  logA(SAB_MOD, d.id, 'Data export recorded (simulated)', '—', 'Simulated export record — no file generated or sent', 'Access request');
  render(); toast('A simulated export record was created. The prototype generates no file and sends nothing.', 'info');
};
const SAB_DONE_TXT = 'Your data request has been completed. (Prototype: a simulated export record was created — no copy of your data was generated or sent.)';
const _nlSAB = notifyLearner;
notifyLearner = function (v, cat, title, body) { if (body === 'Your copy of your data has been sent to your email.') arguments[3] = SAB_DONE_TXT; return _nlSAB.apply(this, arguments); };
const _dsrDoneSAB = ACT.dsrDone;
ACT.dsrDone = function (el) {
  const m0 = MODAL, r = _dsrDoneSAB.apply(this, arguments), d = (ADMIN.dsr || []).find(x => x.id === g1Ds(el).id);
  sabOnConfirm(m0, null, () => { if (d && d.decision === 'Full data export sent') { d.decision = 'Simulated export record (no file generated or sent)'; sabSave(); } });
  return r;
};
const _decDsrSAB = ACT.decideDsr;
ACT.decideDsr = function (el) {
  const m0 = MODAL, r = _decDsrSAB.apply(this, arguments), d = (ADMIN.dsr || []).find(x => x.id === g1Ds(el).id);
  sabOnConfirm(m0, null, () => { if (d && /encrypted ZIP/.test(d.decision || '')) { d.decision = 'Simulated export record (no file generated)'; sabSave(); } });
  return r;
};
// The learner-side request dialog (no control renders it; kept honest for direct calls)
ACT.dataReq = () => confirmDlg({ title: 'Request a copy of your data?', ok: 'Send request', body: '<p>Your request goes to the Academy, which tracks a deadline of one month from the date it is logged. We may ask you to confirm your identity.</p><p class="small muted">Prototype: nothing is sent.</p>', onOk: () => toast('Request noted (prototype: nothing is sent).', 'info') });

/* ---------- SA-09: no hosting claim on the learner lists ---------- */
const SAB_REG_OLD = 'Data region: learners in the UAE are stored in the UAE;', SAB_REG_NEW = 'Data region (a production hosting rule, not implemented in this prototype): learners in the UAE are stored in the UAE;';
['a-learners', 'a-learner'].forEach(k => { const f = SCREENS[k]; if (typeof f === 'function') SCREENS[k] = function () { const h = f.apply(this, arguments); return typeof h === 'string' ? h.split(SAB_REG_OLD).join(SAB_REG_NEW) : h; }; });

/* ---------- SA-09: Finance views mark an archived learner ---------- */
const sabArchived = () => allLearners().filter(l => l.rec === 'Archived');
const _flSAB = SCREENS['f-learners'];
SCREENS['f-learners'] = function () {
  let h = _flSAB.apply(this, arguments); if (typeof h !== 'string') return h;
  sabArchived().forEach(l => { h = h.replace(new RegExp(`(<a [^>]*data-go="f-learner" data-id="${l.id}"[^>]*>[^<]*</a>)`, 'g'), `$1 <span class="sab-arch">${chip('Archived', 'grey')}</span>`); });
  return h;
};
const _f1SAB = SCREENS['f-learner'];
SCREENS['f-learner'] = function (p) {
  const h = _f1SAB.apply(this, arguments), L = p && learnerById(p.id); if (typeof h !== 'string' || !L || L.rec !== 'Archived') return h;
  return `<div class="note b-grey sab-arch-note">${ic('lock')}<div class="small"><strong>Archived record.</strong> The learner's record is archived (read-only). Their finance history is kept in full; nothing was deleted.</div></div>` + h;
};

/* ---------- SA-10: integrations ---------- */
const SAB_SECRET = /key|secret|token|password|passcode|credential|client id|account id/i; // set on the server in production; never shown, edited or saved
const SAB_EDIT = { sms: ['Sender ID'], email: ['Sender name', 'Sender address'] }; // the non-secret fields the prototype can change
const SAB_INT = 'Integration settings are changed by the Super Administrator and System Administrators.';
const sabIntWhy = () => g1SaSys() ? '' : SAB_INT;
const sabIntOf = id => (ADMIN.integrations || []).find(x => x.id === id);
const sabFail = i => (ADMIN.edge === 'zoomDown' && i.id === 'zoom') || (ADMIN.edge === 'emailDown' && i.id === 'email') || (ADMIN.edge === 'payDown' && i.id === 'pay') ? 'Failing' : i.status;
const sabFieldWhy = (f, v) => f === 'Sender ID' ? (/^[A-Za-z0-9]{3,11}$/.test(v) ? '' : 'Use 3–11 letters or digits, with no spaces.') : f === 'Sender address' ? (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Enter an email address.') : (v.length >= 2 && v.length <= 60 ? '' : 'Enter 2–60 characters.');
const sabIntHist = i => (ADMIN.audit || []).filter(a => a.module === 'Integrations' && (a.entity === i.name || a.entity === i.id || String(a.entity).startsWith(i.name + ' — ')));
SCREENS['a-integrations'] = () => { const can = g1SaSys(); return `${pageA('Integrations', 'Prototype: no integration contacts a real provider.')}
  <div class="note b-amber sab-int-note">${ic('alert', 15)}<div class="small"><strong>What can be changed here.</strong> SMS: Sender ID. Email: sender name and sender address. These are saved in this browser's demo copy, audited, and put back by Reset demo; only the Super Administrator and System Administrators can change them. Statuses are demo data and tests are simulated — nothing is sent. Keys, tokens and secrets are <strong>set on the server in production</strong>: the browser never shows, edits or stores them.</div></div>
  <div class="grid">${ADMIN.integrations.map(i => { const st = sabFail(i), ed = SAB_EDIT[i.id] || []; return `<article class="card sab-int" data-int="${i.id}"><div class="row-b"><h3>${esc(i.name)}</h3>${chip(st, { Connected: 'green', Failing: 'red', 'Not configured': 'grey' }[st])}</div><p class="xs muted">Simulated status (demo data)</p>${st === 'Failing' ? `<div class="note b-red small">${ic('alert', 15)}<div>${esc(i.error || 'Sustained failures in the last hour.')}</div></div>` : ''}<p class="small">Last success: ${i.last ? fdt(i.last) : 'Never'}</p>
    <dl class="kv small">${i.fields.map(f => `<dt>${esc(f[0])}</dt>${SAB_SECRET.test(f[0]) ? `<dd class="small sab-srv" id="if-${i.id}-${f[0].replace(/\W/g, '')}">${ic('lock', 12)} Set on the server in production</dd>` : `<dd class="mono" id="if-${i.id}-${f[0].replace(/\W/g, '')}">${esc(f[1])}${ed.includes(f[0]) ? ' <span class="xs muted sab-ed">(editable)</span>' : ''}</dd>`}`).join('')}</dl>
    ${i.id === 'zoom' ? '<p class="xs muted">Simulated: no Zoom account is connected to the prototype.</p>' : ''}
    <div class="row">${ed.length && can ? `<button class="btn btn-sm btn-primary" data-act="saIntEdit" data-id="${i.id}">Edit settings</button>` : ''}<button class="btn btn-sm" data-act="intTest" data-id="${i.id}">Simulated test</button><button class="btn btn-sm" data-act="intReveal" data-id="${i.id}">Reveal credentials</button><button class="btn btn-sm btn-ghost" data-act="intHist" data-id="${i.id}">Change history</button></div></article>`; }).join('')}</div>`; };
ACT.saIntEdit = el => {
  const id = g1Ds(el).id, i = sabIntOf(id);
  if (g1No('Integrations', i ? i.name : (id || '—'), 'change integration settings', sabIntWhy())) return false;
  if (!i || !SAB_EDIT[i.id]) { toast('This integration has no settings that can be changed in the prototype.', 'err'); return false; }
  const ed = SAB_EDIT[i.id], val = f => (i.fields.find(x => x[0] === f) || [])[1] || '', sec = i.fields.filter(f => SAB_SECRET.test(f[0])).map(f => f[0]);
  reasonDlg({ title: 'Edit settings — ' + esc(i.name), ok: 'Save',
    body: `<p class="small">Prototype setting only: saving changes what this demo shows and records an audit entry. No provider is contacted.</p>${sec.length ? `<p class="small muted">${esc(sec.join(', '))}: set on the server in production — not shown or editable in the browser.</p>` : ''}`,
    extra: ed.map((f, k) => `<div class="field"><label for="sab-f${k}">${esc(f)}</label><input class="input" id="sab-f${k}" value="${esc(val(f))}" autocomplete="off"></div>`).join(''),
    onOk: r => {
      if (g1No('Integrations', i.name, 'change integration settings', sabIntWhy())) { closeModal(); return false; }
      const ch = [];
      for (let k = 0; k < ed.length; k++) { const f = ed[k], nv = mval('#sab-f' + k), bad = sabFieldWhy(f, nv); if (bad) { fieldErr('#sab-f' + k, bad); return false; } const row = i.fields.find(x => x[0] === f); if (row && row[1] !== nv) ch.push([row, f, row[1], nv]); }
      if (!ch.length) { toast('Nothing changed, so nothing was saved.', 'info'); return; }
      ch.forEach(([row, f, from, to]) => { row[1] = to; logA('Integrations', `${i.name} — ${f}`, 'Setting changed', from, to, r); });
      render(); toast(`Saved and audited (${ch.length} change${ch.length > 1 ? 's' : ''}). Prototype setting only — no provider is contacted.`);
    } });
};
// #19: a simulated test, role-checked; nothing is sent
ACT.intTest = el => {
  const id = g1Ds(el).id, i = sabIntOf(id);
  if (g1No('Integrations', i ? i.name : (id || '—'), 'run an integration test', g1SaSys() ? '' : 'Integration tests are run by the Super Administrator and System Administrators.')) return false;
  if (!i) { toast('That integration is not available.', 'err'); return false; }
  const st = sabFail(i);
  logA('Integrations', i.name, 'Simulated test (nothing sent)', '—', 'No message sent', '');
  toast(`${i.name}: simulated test only — no message was sent and no provider was contacted. The status shown (${st}) is demo data.`, 'info');
};
// Reveal: nothing to reveal — the prototype holds no credentials (the dialog and the refusal record are kept)
const _revSAB = ACT.intReveal;
ACT.intReveal = function (el) {
  if (!g1SaSys()) return _revSAB.apply(this, arguments);
  const id = g1Ds(el).id;
  reasonDlg({ title: 'Reveal credentials', ok: 'Record request', body: '<p class="small"><strong>Nothing can be revealed.</strong> The prototype holds no real credentials. In production, keys and secrets are set on the server and are never sent to the browser.</p>',
    onOk: r => { if (g1No('Integrations', id || '—', 'reveal credentials', g1SaSys() ? '' : SAB_INT)) { closeModal(); return false; } logA('Integrations', id || '—', 'Credentials reveal requested — nothing revealed', 'Not held in the browser', 'Not revealed', r); toast('Nothing was revealed: the prototype holds no credentials.', 'info'); } });
};
ACT.intHist = el => {
  const id = g1Ds(el).id, i = sabIntOf(id);
  if (g1No('Integrations', i ? i.name : (id || '—'), 'view integration change history', g1SaSys() ? '' : SAB_INT)) return false;
  if (!i) return false; const rows = sabIntHist(i);
  openModal({ title: 'Change history — ' + esc(i.name), body: rows.length ? `<ul class="list small sab-hist">${rows.map(a => `<li class="li">${esc(a.actor)} · ${fdt(a.at)} · ${esc(a.action)}${a.before !== '—' || a.after !== '—' ? ` · <span class="strike">${esc(a.before)}</span> → ${esc(a.after)}` : ''}${a.reason ? ` · ${esc(a.reason)}` : ''}</li>`).join('')}</ul>` : '<p class="small muted">No changes or tests recorded for this integration in this demo.</p>', actions: [{ label: 'Close', cls: 'btn-primary' }] });
};
// The saved demo copy never holds a credential value (field names matched by SAB_SECRET are written empty)
if (typeof fcpEncode === 'function') {
  const _encSAB = fcpEncode;
  fcpEncode = function (roots) {
    const A = roots && roots.ADMIN, keep = A && A.integrations; if (!Array.isArray(keep)) return _encSAB.apply(this, arguments);
    A.integrations = keep.map(i => i && Array.isArray(i.fields) ? { ...i, fields: i.fields.map(f => Array.isArray(f) && SAB_SECRET.test(f[0]) ? [f[0], ''] : f) } : i);
    try { return _encSAB.apply(this, arguments); } finally { A.integrations = keep; }
  };
}
