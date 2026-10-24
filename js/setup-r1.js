/* R1 — Level 3 configurable fee options (client clarification, Oct 2026; extended to every Level 3 programme in the final review).
   Every NVQ Level 3 programme — the seeded Level 3 Diploma, its 2027 draft and any Level 3 programme created with the wizard — has
   its own fee options, kept under the programme's stable ID. Each option has a stable ID, a label, a GBP fee, a delivery mode
   (Self-Paced / Fully Assisted) and an Active / Retired status. Finance Admins and the Super Administrator — the existing owners of
   programme payment plans — add, edit and retire options. Changing an existing option's fee stays with the Super Administrator, as
   for the programme fee (S4a). At sign-up the learner chooses one of their programme's eligible options; the option, its mode and the
   fee are frozen into the learner's pinned terms (w.signup.plan), so a later change never reprices an enrolment. Deposit, seat hold
   and instalment count still come from that programme's payment plan (S4a) — no option-specific payment rules (PD-R1-03).
   Learners who were on Level 3 before options existed keep their exact fee, deposit and payments: they reference the programme's
   legacy option "Standard programme fee" (L3-FO-STD for the Level 3 Diploma), whose fee is the payment plan's fee and whose delivery
   mode is the learner's batch's mode — exactly the behaviour before options existed (PD-R1-01, PD-R1-02). Level 2, 4 and 5 keep
   their single price. Loads after setup-s5e.js. */
'use strict';

const R1_PID = 'NV-L3';                 // the seeded Level 3 Diploma (its IDs keep the short "L3-FO-" form)
const R1_MODES = ['Fully Assisted', 'Self-Paced'];
const R1_STD = 'L3-FO-STD';             // the Level 3 Diploma's legacy option
const R1_FEE_MAX = 100000;
const r1Pfx = pid => (pid === R1_PID ? 'L3' : pid) + '-FO-';
const r1StdId = pid => r1Pfx(pid) + 'STD';
const r1Legacy = pid => ({ id: r1StdId(pid), pid, label: 'Standard programme fee', fee: null, mode: null, status: 'Active', legacy: true, v: 1, at: null, by: null, hist: [] });
const r1Seed = () => ({ opts: { [R1_PID]: [r1Legacy(R1_PID)] }, n: {} });
const R1 = () => { const s = STORE.r1 = STORE.r1 || r1Seed(); if (typeof s.n !== 'object') s.n = { [R1_PID]: +s.n || 0 }; return s; };
const r1Pr = (pid = R1_PID) => s3Pr(pid);
// Every Level 3 programme that isn't retired has fee options (the programme's level, not one programme's ID)
// CR (PD-CR-04): also a Level 2, 4 or 5 programme once Finance has approved mode-specific fee options for it (the name is kept)
const r1IsL3Pid = pid => { const pr = pid && s3Pr(pid); return !!(pr && pr.status !== 'Retired' && (pr.level === 'Level 3' || ((STORE.r1 && STORE.r1.opts[pid]) || []).some(o => !o.legacy && o.mode))); };
const r1L3Progs = () => s3Progs().filter(p => r1IsL3Pid(p.id));
const r1Opts = (pid = R1_PID) => R1().opts[pid] || [];
const r1Opt = id => { const o = R1().opts; for (const k of Object.keys(o)) { const x = o[k].find(y => y.id === id); if (x) return x; } return null; };
const r1PidOf = o => (o && o.pid) || R1_PID;
const r1StdOf = pid => { const o = r1Opts(pid).find(x => x.legacy); return o ? o.id : null; };
// The legacy option's fee is the programme payment plan's fee (it is the fee every learner paid before options existed)
const r1PlanFee = (pid = R1_PID) => { const p = s4PlanCur(pid) || s4PlanLast(pid); return p ? p.fee : null; };
const r1FeeOf = o => (o.fee == null ? r1PlanFee(r1PidOf(o)) : o.fee);
// The terms an applicant choosing this option is offered: the option's fee with the programme plan's deposit and instalments
function r1TermsOf(o) {
  const pid = r1PidOf(o), base = s4TermsOf(pid), p = s4PlanCur(pid), fee = r1FeeOf(o);
  const opt = { id: o.id, pid, label: o.label, mode: o.mode, fee, v: o.v, legacy: !!o.legacy };
  if (!p) return { ...base, fee, opt };
  const issue = o.status !== 'Active' ? 'This fee option is retired.' : s4PlanIssue({ ...p, fee });
  return { pid, v: p.v, fee, deposit: s4EffDep(p), own: p.deposit != null, ...(p.depOff ? { depOff: true } : {}), inst: p.inst, partial: p.partial, issue, opt };
}
const r1Eligible = (pid = R1_PID) => r1Opts(pid).filter(o => o.status === 'Active' && !r1TermsOf(o).issue);
// The learner's frozen option and mode (null for learners who are not on a Level 3 programme)
const r1IsL3W = w => !!(w && w.nvq && r1IsL3Pid(s4PidOfW(w)));
const r1OptOfW = w => (w && w.signup && w.signup.plan && w.signup.plan.opt) || null;
const r1ModeOfW = w => { const o = r1OptOfW(w); return o ? o.mode : null; };
const R1_LEGACY_MODE = 'Delivery mode of the batch (legacy)';
const r1ModeTxt = o => o.mode || R1_LEGACY_MODE;
const r1OptTxt = o => `${o.label} · ${r1ModeTxt(o)} · ${money(r1FeeOf(o), 'GBP')}`;

/* ---------- Store lifecycle: the demo reset re-seeds; an admin rebuild keeps the options (STORE is not rebuilt) ---------- */
const _isR1 = initStore; initStore = function () { STORE.r1 = null; const r = _isR1.apply(this, arguments); r1Init(); return r; };
const _baR1 = buildAdmin; buildAdmin = function () { const r = _baR1.apply(this, arguments); if (STORE.worlds) r1Init(); return r; };
// Learners already on a Level 3 programme (enrolled or with a sign-up started) keep their pinned fee and reference its legacy option.
// Their delivery mode stays their batch's mode, as before options existed (the legacy option has no mode of its own).
function r1PinLegacy() {
  Object.values(STORE.worlds || {}).forEach(w => {
    if (!r1IsL3W(w) || !w.signup || !w.signup.plan || w.signup.plan.opt) return;
    const pid = s4PidOfW(w), std = r1StdOf(pid); if (!std) return;
    const t = w.signup.plan;
    w.signup.plan = Object.freeze({ ...t, opt: Object.freeze({ id: std, pid, label: 'Standard programme fee', mode: null, fee: t.fee, v: 1, legacy: true }) });
    w.nvq.feeOpt = std;
  });
}
function r1Init() { if (!STORE.worlds || !s3Progs().length || !r1Pr()) return; R1(); r1PinLegacy(); r1L3Progs().forEach(p => r1CatSync(p.id)); }

/* ---------- Browse shows "From £…" — the programme's lowest eligible option ---------- */
function r1CatSync(pid = R1_PID) {
  const el = r1Eligible(pid), pr = r1Pr(pid); if (!el.length || !pr) return; const min = Math.min(...el.map(r1FeeOf));
  CATALOGUE.filter(c => c.kind === 'nvq' && c.title === pr.title).forEach(c => { c.price = min; });
}
const _s4PlanSaveR1 = s4PlanSave;
s4PlanSave = function (pr) { const r = _s4PlanSaveR1.apply(this, arguments); if (!r && pr && r1IsL3Pid(pr.id)) r1CatSync(pr.id); return r; };

/* ---------- Admin: one options card per Level 3 programme (Finance → Payment Plans → Plan templates; Super Admin → Finance → Instalment plans) ---------- */
const r1Can = () => S.portal === 'admin' && !(typeof s5Ctx === 'function' && s5Ctx()) && finOwner();
const r1Guard = what => r1Can() || s4Refuse('Fee options', 'Level 3 fee options', what);
const r1Users = id => Object.values(STORE.worlds || {}).filter(w => (r1OptOfW(w) || {}).id === id).length;
function r1Card(pid = R1_PID) {
  const can = r1Can(), pr = r1Pr(pid); if (!pr) return '';
  return `<section class="card r1-opts" data-pid="${pid}"><div class="row-b"><h2>Level 3 fee options — ${esc(pr.title)}</h2>${can ? `<button class="btn btn-sm btn-primary" data-act="r1OptAdd" data-p="${pid}">${ic('plus', 14)} Add fee option</button>` : `<span class="xs muted">${ic('lock', 12)} Finance Admin / Super Admin only</span>`}</div>
    <p class="small muted">Learners choose one when they sign up; their fee and delivery mode are then fixed. Deposit and instalments follow this programme's payment plan. Changing an option never changes what earlier learners agreed.</p>
    ${r1Opts(pid).length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Option ID</th><th>Label</th><th>Delivery mode</th><th class="r">Fee (GBP)</th><th>Status</th><th class="r">Learners</th><th></th></tr></thead><tbody>${r1Opts(pid).map(o => { const t = r1TermsOf(o);
      return `<tr data-opt="${o.id}"><td class="nowrap"><span class="code">${o.id}</span></td><td><strong>${esc(o.label)}</strong>${o.legacy ? '<div class="xs muted">Standard fee from before fee options: follows the payment plan; delivery mode follows the batch</div>' : ''}</td><td>${esc(r1ModeTxt(o))}</td><td class="r">${t.fee ? money(t.fee, 'GBP') : '—'}</td><td>${o.status === 'Retired' ? chip('Retired', 'grey') : t.issue ? chip('Needs configuration', 'red') + `<div class="xs" style="color:var(--red)">${esc(t.issue)}</div>` : chip('Active', 'green')}</td><td class="r">${r1Users(o.id)}</td>
        <td class="nowrap">${can && o.status === 'Active' ? `<button class="btn btn-sm" data-act="r1OptEdit" data-id="${o.id}">Edit</button> <button class="btn btn-sm" data-act="r1OptRetire" data-id="${o.id}">Retire</button> ` : ''}<button class="btn btn-sm btn-ghost" data-act="r1OptHist" data-id="${o.id}">History</button></td></tr>`; }).join('')}</tbody></table></div>` : `<p class="small r1-none">${ic('info', 14)} No fee options yet — learners can't sign up and pay until at least one is added.</p>`}</section>`;
}
const r1Cards = () => r1L3Progs().map(p => r1Card(p.id)).join('');
const _fPlansR1 = SCREENS['f-plans'];
SCREENS['f-plans'] = p => { const h = _fPlansR1(p); if ((p.tab || 'schedules') !== 'templates') return h; const k = h.indexOf('<section class="card s4-legacy">'); return k < 0 ? h : h.slice(0, k) + r1Cards() + h.slice(k); };
const _aFinR1 = SCREENS['a-finance'];
SCREENS['a-finance'] = p => { const h = _aFinR1(p); if ((p.tab || 'ledger') !== 'plans') return h; const k = h.indexOf('<section class="card s4-adj">'); return k < 0 ? h : h.slice(0, k) + r1Cards() + h.slice(k); };

// One form for add and edit. A legacy option keeps its fee (the plan's) and its mode (what its learners were taught in).
function r1Form(o, pid) {
  const lock = o && o.legacy, feeRo = o && !lock && !isSA(), p = s4PlanCur(pid);
  return `<div class="form-grid r1-form">
    <div class="field full"><label for="fo-l">Display label</label><input class="input" id="fo-l" maxlength="80" value="${o ? esc(o.label) : ''}"><span class="hint">Shown to learners at sign-up, for example "Self-Paced — standard".</span></div>
    <div class="field"><label for="fo-f">Fee (GBP)</label><input class="input num" type="number" min="1" step="0.01" id="fo-f" value="${o ? (lock ? r1PlanFee(pid) || '' : o.fee) : ''}" ${lock || feeRo ? 'readonly' : ''}>${lock ? '<span class="hint">The programme payment plan\'s fee — change it in the payment plan.</span>' : feeRo ? '<span class="hint">Only the Super Administrator changes an existing option\'s fee.</span>' : ''}</div>
    <div class="field"><label for="fo-m">Delivery mode</label><select class="select" id="fo-m" ${lock ? 'disabled' : ''}>${lock ? `<option value="">${R1_LEGACY_MODE}</option>` : (o ? '' : '<option value="">Choose…</option>') + R1_MODES.map(m => `<option ${o && o.mode === m ? 'selected' : ''}>${m}</option>`).join('')}</select>${lock ? '<span class="hint">Fixed: its learners follow their batch\'s delivery mode, as before fee options.</span>' : ''}</div>
    <p class="small full muted">${p ? `${p.depOff ? 'No deposit' : `Deposit ${money(s4EffDep(p), 'GBP')}`} and ${p.inst} monthly instalments come from this programme's payment plan. Instalments are rounded to the penny, with the final one adjusted so they total the fee exactly.${p.depOff ? '' : ' The fee must be above the deposit.'}` : 'This programme has no active payment plan yet — the option can be saved, and learners can choose it once the plan is set up.'}</p></div>`;
}
// Fee checks shared by the options card and the new-programme wizard; returns '' or the reason
function r1FeeWhy(feeS, pid) {
  const fee = Math.round(+feeS * 100) / 100;
  if (feeS === '' || !(fee > 0) || fee > R1_FEE_MAX || Math.abs(+feeS * 100 - Math.round(+feeS * 100)) > 1e-6) return `Enter a fee from £0.01 to ${money(R1_FEE_MAX, 'GBP')} (pence at most)`;
  const p = pid ? s4PlanCur(pid) : { fee, deposit: null, inst: CH_INST_N, status: 'Active' }; return p ? s4PlanIssue({ ...p, fee }) : '';
}
// Validate the form against the store; returns the values or false (with the field marked)
function r1Read(o, pid) {
  const label = mval('#fo-l').replace(/\s+/g, ' '), mode = o && o.legacy ? o.mode : mval('#fo-m'), feeS = mval('#fo-f'), fee = o && o.legacy ? null : Math.round(+feeS * 100) / 100;
  if (!label) return fieldErr('#fo-l', 'Enter a label'), false;
  if (r1Opts(pid).some(x => x !== o && x.status === 'Active' && x.label.toLowerCase() === label.toLowerCase())) return fieldErr('#fo-l', 'Another active option of this programme already has this label'), false;
  if (!(o && o.legacy) && !R1_MODES.includes(mode)) return fieldErr('#fo-m', 'Choose Self-Paced or Fully Assisted'), false;
  if (!(o && o.legacy)) {
    const why = r1FeeWhy(feeS, pid); if (/^Enter a fee/.test(why)) return fieldErr('#fo-f', why), false;
    if (o && fee !== o.fee && !isSA()) { logA('Fee options', `${o.label} (${o.id})`, 'Blocked: change the option fee', money(o.fee, 'GBP'), money(fee, 'GBP'), 'Only the Super Administrator changes an existing fee'); return fieldErr('#fo-f', 'Only the Super Administrator changes an existing option\'s fee'), false; }
    if (why) return fieldErr('#fo-f', why), false;
  }
  return { label, mode, fee };
}
// Add an option to a programme (the options card and the wizard); IDs are stable and never reused
function r1AddOpt(pid, f, r, how) {
  const s = R1(), n = s.n[pid] = (s.n[pid] || 0) + 1, id = r1Pfx(pid) + String(n).padStart(3, '0'), at = now().toISOString();
  const o = { id, pid, label: f.label, fee: f.fee, mode: f.mode, status: 'Active', v: 1, at, by: ADMIN.me.name, hist: [[at, ADMIN.me.name, how || 'Added', '—', `${f.label} · ${f.mode} · ${money(f.fee, 'GBP')}`, r]] };
  (s.opts[pid] = s.opts[pid] || []).push(o); r1CatSync(pid);
  logA('Fee options', `${o.label} (${id})`, 'Fee option added', '—', `${r1Pr(pid).title}: ${r1OptTxt(o)}`, r);
  return o;
}
ACT.r1OptAdd = el => {
  const pid = (el && el.dataset && el.dataset.p) || R1_PID; if (!r1Guard('add a fee option')) return;
  if (!r1IsL3Pid(pid)) return toast('Fee options are for Level 3 programmes.', 'err');
  reasonDlg({ title: 'Add a fee option — ' + esc(r1Pr(pid).title), ok: 'Add option', extra: r1Form(null, pid), onOk: r => {
    if (!r1Guard('add a fee option')) return false;
    const f = r1Read(null, pid); if (!f) return false;
    const o = r1AddOpt(pid, f, r); render(); toast(`${o.id} added — new sign-ups to this programme can choose it.`);
  } });
};
ACT.r1OptEdit = el => {
  if (!r1Guard('edit a fee option')) return; const o = r1Opt(el.dataset.id); if (!o || o.status !== 'Active') return toast('Only an active option can be edited.', 'err'); const pid = r1PidOf(o);
  reasonDlg({ title: 'Edit fee option ' + o.id, ok: 'Save', extra: r1Form(o, pid) + `<p class="small">${r1Users(o.id)} learner(s) chose this option — they keep the fee and mode they agreed.</p>`, onOk: r => {
    if (!r1Guard('edit a fee option')) return false;
    const f = r1Read(o, pid); if (!f) return false;
    if (f.label === o.label && f.mode === o.mode && f.fee === o.fee) return fieldErr('#fo-l', 'Nothing has changed'), false;
    const was = r1OptTxt(o), at = now().toISOString(); Object.assign(o, { label: f.label, mode: f.mode, fee: f.fee, v: o.v + 1 });
    o.hist.push([at, ADMIN.me.name, 'Edited (v' + o.v + ')', was, r1OptTxt(o), r]); r1CatSync(pid);
    logA('Fee options', `${o.label} (${o.id})`, 'Fee option edited', was, r1OptTxt(o), r); render(); toast('Saved — applies to new sign-ups only.');
  } });
};
ACT.r1OptRetire = el => {
  if (!r1Guard('retire a fee option')) return; const o = r1Opt(el.dataset.id); if (!o || o.status !== 'Active') return;
  reasonDlg({ title: 'Retire fee option ' + o.id, ok: 'Retire option', danger: true, body: `<p class="small">"${esc(o.label)}" stops being offered to new sign-ups. The ${r1Users(o.id)} learner(s) who chose it keep their fee, mode, deposit and payments. A retired option can't be reactivated (add a new option instead).</p>`, onOk: r => {
    if (!r1Guard('retire a fee option')) return false;
    o.status = 'Retired'; o.hist.push([now().toISOString(), ADMIN.me.name, 'Retired', 'Active', 'Retired', r]); r1CatSync(r1PidOf(o));
    logA('Fee options', `${o.label} (${o.id})`, 'Fee option retired', 'Active', 'Retired', r); render(); toast(o.id + ' retired.');
  } });
};
ACT.r1OptHist = el => { const o = r1Opt(el.dataset.id); if (!o) return; openModal({ title: 'Fee option history — ' + o.id, size: 'lg', body: `<ul class="list">${o.hist.slice().reverse().map(h => `<li class="li"><div class="li-b"><strong>${esc(h[2])}</strong><span class="small"><span class="strike">${esc(h[3])}</span> → ${esc(h[4])}</span><span class="xs muted">${fdt(h[0])} · ${esc(h[1])} · ${esc(h[5])}</span></div></li>`).join('') || '<li class="li"><div class="li-b small muted">Seeded legacy option — the fee every learner of this programme agreed before fee options existed (no recorded change).</div></li>'}</ul>`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); };

/* ---------- Learner sign-up (any Level 3 programme): choose one of its options; frozen with the terms ---------- */
let R1_PICK = null; // the option chosen in the sign-up dialog, consumed when the sign-up starts
const r1OptRow = (o, k) => { const t = r1TermsOf(o); return `<label class="opt r1-pick"><input type="radio" name="r1-opt" value="${o.id}" ${k ? 'checked' : ''}> <span><strong>${money(t.fee, 'GBP')} — ${esc(o.legacy ? 'Standard programme fee' : o.label)}</strong><span class="xs muted" style="display:block">${o.mode ? '' : 'Delivery mode: the mode of the batch you are assigned. '}${e2DepOr(t, true)}${t.inst} monthly instalments${e1InstTxt(t.fee, t.inst)}, the first one now.</span></span></label>`; };
const _applyR1 = ACT.applyNvq;
ACT.applyNvq = el => {
  const c = CATALOGUE.find(x => x.id === (el && el.dataset && el.dataset.id)), pr = c && c.kind === 'nvq' ? s3Progs().find(p => p.title === c.title) : null;
  if (!pr || !r1IsL3Pid(pr.id) || W.admission || W.nvq || pr.status !== 'Active') return _applyR1(el);
  const el_ = r1Eligible(pr.id);
  if (!el_.length) { R1_PICK = null; return _applyR1(el); } // no option can be offered: S4a's "needs configuration" sign-up (payment blocked)
  confirmDlg({ title: 'Sign up for ' + esc(pr.title) + '?', ok: 'Start sign-up', body: `<p>Signing up takes five steps: your details (we assign your batch), your documents, your offer letter, your payment, then you start.</p>
    <div class="field r1-pickf"><fieldset class="stack" style="border:0;padding:0" id="r1-opts"><legend class="lbl">Choose your fee option</legend>${el_.map((o, k) => r1OptRow(o, el_.length === 1 && !k)).join('')}</fieldset></div><p class="xs muted">Your fee option sets your delivery mode. Your choice and its fee are fixed when you start — later price changes don't affect you.</p>`,
    onOk: () => {
      const id = ($('input[name="r1-opt"]:checked') || {}).value, o = r1Opt(id);
      if (!o || r1PidOf(o) !== pr.id) { fieldErr('#r1-opts', 'Choose a fee option'); return false; }
      if (!r1Eligible(pr.id).includes(o)) { fieldErr('#r1-opts', 'This option is no longer available — choose another'); return false; }
      R1_PICK = id; try { ch8StartSignup(W, pr); } finally { R1_PICK = null; } go('admission'); toast('Sign-up started.');
    } });
};
// Pin the chosen option over S4a's programme terms. A start that didn't come through the dialog (a scripted demo) gets the only
// eligible option, or the programme's standard one; with several eligible options and no choice it gets the standard option (PD-R1-04).
const _suStartR1 = ch8StartSignup;
ch8StartSignup = function (w, pr) {
  const r = _suStartR1.apply(this, arguments); if (!pr || !r1IsL3Pid(pr.id) || !w.signup) return r;
  const pick = R1_PICK && r1Opt(R1_PICK), el_ = r1Eligible(pr.id), o = (pick && r1PidOf(pick) === pr.id ? pick : null) || (el_.length === 1 ? el_[0] : r1Opt(r1StdOf(pr.id))); if (!o) return r;
  const t = r1TermsOf(o), fr = Object.freeze({ ...t, opt: Object.freeze({ ...t.opt }) });
  w.signup.plan = fr; w.nvq.feeOpt = o.id; if (o.mode) w.nvq.dmode = o.mode;
  Object.assign(w.admission.deposit, t.issue || t.depOff ? { min: null, balance: null } : { min: t.deposit, balance: t.fee - t.deposit });
  logA('Admissions', `${chFullName(w)} (${w.me.id})`, 'Fee option chosen', '—', `${o.id} · ${r1OptTxt(o)} (option v${o.v})`, pr.title);
  return r;
};
// The learner's payment plan carries the option it was made from
const _ccR1 = chComplete;
chComplete = function (w) { const r = _ccR1.apply(this, arguments), o = r1OptOfW(w), pl = o && (w.plans || []).find(p => p.e === 'nvq'); if (pl && !pl.feeOpt) pl.feeOpt = { id: o.id, pid: o.pid, label: o.label, mode: o.mode, fee: o.fee }; return r; };
// Payment step: the agreed option is restated
const _stepPayR1 = chStepPay;
chStepPay = function (w) { const h = _stepPayR1.apply(this, arguments), o = r1OptOfW(w); if (!o || chSponsored(w)) return h; return h.replace(/(<h2>[^<]*<\/h2>)/, `$1<div class="note b-blue r1-agreed">${ic('info')}<div class="small">Your fee option: <strong>${esc(o.label)}</strong> — ${esc(r1ModeTxt(o))} · ${money(o.fee, 'GBP')} (fixed when you started).</div></div>`); };
// Admissions → application: the option is shown with the other fixed versions
const _appDetailR1 = appDetail;
appDetail = function (id) {
  const h = _appDetailR1.apply(this, arguments), w = STORE.worlds[String(id).replace('APP-', '')], o = r1OptOfW(w); if (!o) return h;
  const note = `<div class="note b-blue r1-appopt">${ic('info')}<div class="small">Fee option ${o.id} — ${esc(o.label)} · ${esc(r1ModeTxt(o))} · ${money(o.fee, 'GBP')}${o.legacy ? ' (legacy: agreed before fee options)' : ''}.</div></div>`;
  const k = h.indexOf('<section'); return k < 0 ? h + note : h.slice(0, k) + note + h.slice(k);
};

/* ---------- New NVQ programme wizard: Level 3 programmes are created with fee options ----------
   For Level 3 the single "Price" is replaced by a list of fee options (label, GBP fee, delivery mode; add as many as needed). The
   programme's payment plan keeps its deposit and instalments; its reference fee is the lowest option fee (PD-R1-08). The "default
   delivery mode for new batches" stays only as each new batch's default class pattern — a Level 3 learner's mode comes from their
   fee option and a batch can hold both modes. Other levels keep the single price and the default delivery mode, unchanged. */
const R1_NP_MODE = 'A Level 3 learner\'s delivery mode comes from the fee option they choose, so one batch can hold Self-Paced and Fully Assisted learners together. This setting only pre-selects the class pattern for new batches.';
const r1NpRow = (o = {}) => `<div class="r1-np-row" role="group" aria-label="Fee option"><input class="input r1-np-l" maxlength="80" aria-label="Option label" value="${esc(o.label || '')}" placeholder="e.g. Self-Paced — standard"><input class="input num r1-np-f" type="number" min="1" step="0.01" aria-label="Fee in GBP" placeholder="Fee" value="${o.fee || ''}"><select class="select r1-np-m" aria-label="Delivery mode"><option value="">Mode…</option>${R1_MODES.map(m => `<option ${o.mode === m ? 'selected' : ''}>${m}</option>`).join('')}</select><button type="button" class="btn btn-sm btn-ghost r1-np-del" data-act="r1NpDel" aria-label="Remove this fee option" title="Remove this fee option">${ic('x', 15)}</button></div>`;
const R1_NP_HEAD = '<div class="r1-np-head" aria-hidden="true"><span>Label</span><span>Fee (GBP)</span><span>Delivery mode</span><span></span></div>';
const _npFieldsR1 = ch8DetailsFields;
ch8DetailsFields = function (d) {
  d = d || {}; let h = _npFieldsR1.apply(this, arguments);
  const l3 = (d.level || 'Level 3') === 'Level 3', made = d.id && r1Opts(d.id).length;
  const opts = made ? `<div class="field full r1-np-opts"><span class="lbl">Fee options</span><ul class="list small">${r1Opts(d.id).map(o => `<li class="li"><span class="code">${o.id}</span> ${esc(o.label)} · ${esc(r1ModeTxt(o))} · ${money(r1FeeOf(o), 'GBP')} · ${esc(o.status)}</li>`).join('')}</ul><span class="hint">Managed under Finance → Instalment plans → Level 3 fee options.</span></div>`
    : `<div class="field full r1-np-opts"><span class="lbl">Fee options</span><p class="xs muted">Learners choose one when they sign up. Each fee must split evenly into the payment plan's monthly instalments (${CH_INST_N} unless changed in the plan step) and be above its deposit.</p>${R1_NP_HEAD}<div class="r1-np-list">${r1NpRow()}</div><button type="button" class="btn btn-sm r1-np-add" data-act="r1NpAdd">${ic('plus', 14)} Add fee option</button></div>`;
  h = h.replace(/(<select class="select" id="np-l")/, '$1 data-onchange="r1NpLevel"')
    .replace('<div class="field"><label for="np-p">Price (GBP)</label>', `<div class="field r1-np-price" ${l3 ? 'hidden' : ''}><label for="np-p">Price (GBP)</label>`)
    .replace('<div class="field full"><label for="np-ds">', `<div class="r1-np-l3 field full" ${l3 ? '' : 'hidden'} style="padding:0">${opts}</div><div class="field full"><label for="np-ds">`)
    .replace('<legend class="lbl">Default delivery mode for new batches</legend>', `<legend class="lbl"><span class="r1-np-o3" ${l3 ? 'hidden' : ''}>Default delivery mode for new batches</span><span class="r1-np-m3" ${l3 ? '' : 'hidden'}>Default class pattern for new batches</span></legend>`);
  // the P-31 wording (and its Pending tag) stays for other levels; Level 3 states the confirmed learner-level rule instead
  const P = `<span class="small">${CH_P31}</span>`, i = h.indexOf(P);
  if (i >= 0) { let e = i + P.length; const H = '<span class="hint n2-p31">'; if (h.startsWith(H, e)) e = h.indexOf('</span>', e) + 7;
    h = h.slice(0, i) + `<span class="r1-np-o3" ${l3 ? 'hidden' : ''}>${h.slice(i, e)}</span><span class="small r1-np-m3" ${l3 ? '' : 'hidden'}>${esc(R1_NP_MODE)}</span>` + h.slice(e); }
  return h;
};
// CB2: the creation form is a dialog (older flows) or the Course Details page of a new course; these helpers act on whichever is shown
const r1Sc = () => (MODAL || !document.querySelector('main .cb-new') ? '#modal-root' : 'main .cb-new');
INP.r1NpLevel = el => { const l3 = el.value === 'Level 3'; $$(`${r1Sc()} .r1-np-price, ${r1Sc()} .r1-np-o3`).forEach(x => { x.hidden = l3; }); $$(`${r1Sc()} .r1-np-l3, ${r1Sc()} .r1-np-m3`).forEach(x => { x.hidden = !l3; }); };
ACT.r1NpAdd = () => { const l = $(`${r1Sc()} .r1-np-list`); if (l) l.insertAdjacentHTML('beforeend', r1NpRow()); };
ACT.r1NpDel = el => { const row = el.closest('.r1-np-row'), l = $(`${r1Sc()} .r1-np-list`); if (row && l && l.querySelectorAll('.r1-np-row').length > 1) row.remove(); else toast('A Level 3 programme needs at least one fee option.', 'err'); };
// Read and check the option rows (Level 3 creation only); returns the list or null with the field marked
function r1NpRead() {
  const rows = $$(`${r1Sc()} .r1-np-row`), out = [], seen = new Set();
  for (const r of rows) {
    const L = r.querySelector('.r1-np-l'), F = r.querySelector('.r1-np-f'), M = r.querySelector('.r1-np-m'), label = L.value.trim().replace(/\s+/g, ' ');
    if (!label && !F.value && !M.value && rows.length > 1) continue; // an empty extra row is ignored
    const mark = (el, msg) => { $$(`${r1Sc()} .r1-np-err`).forEach(x => x.remove()); el.setAttribute('aria-invalid', 'true'); r.insertAdjacentHTML('afterend', `<span class="err r1-np-err" role="alert">${ic('alert', 14)}${msg}</span>`); el.focus(); return null; };
    if (!label) return mark(L, 'Enter a label');
    if (seen.has(label.toLowerCase())) return mark(L, 'Each option needs its own label'); seen.add(label.toLowerCase());
    const why = r1FeeWhy(F.value.trim(), null); if (why) return mark(F, why);
    if (!R1_MODES.includes(M.value)) return mark(M, 'Choose Self-Paced or Fully Assisted');
    out.push({ label, fee: Math.round(+F.value * 100) / 100, mode: M.value });
  }
  if (!out.length) { const L = $(`${r1Sc()} .r1-np-l`); if (L) L.focus(); toast('Add at least one fee option.', 'err'); return null; }
  return out;
}
const _npReadR1 = ch8ReadDetails;
ch8ReadDetails = function (pr) {
  const lv = ($('#np-l') || {}).value, l3new = !pr && lv === 'Level 3' && $(`${r1Sc()} .r1-np-list`);
  if (!l3new) return _npReadR1.apply(this, arguments);
  const P = $('#np-p'), keep = P.value; P.value = '1'; // the single price isn't used for Level 3: the other details are checked first
  const d = _npReadR1.apply(this, arguments); P.value = keep; if (!d) return null;
  const opts = r1NpRead(); if (!opts) return null;
  d.price = Math.min(...opts.map(o => o.fee)); d.r1opts = opts; return d;
};
const _ch8CreateR1 = ch8Create;
ch8Create = function (d) {
  const pr = _ch8CreateR1.apply(this, arguments);
  if (pr && d && d.r1opts && r1IsL3Pid(pr.id)) { R1().opts[pr.id] = R1().opts[pr.id] || []; d.r1opts.forEach(o => r1AddOpt(pr.id, { label: o.label, fee: o.fee, mode: o.mode }, 'Set when the programme was created', 'Added (new programme)')); }
  return pr;
};
// The wizard's plan step says what the plan sets for a Level 3 programme
const _ch8PlanR1 = ch8PlanStep;
ch8PlanStep = function (pr) { const h = _ch8PlanR1.apply(this, arguments); if (!pr || !r1IsL3Pid(pr.id)) return h; return h.replace('</h2>', `</h2><div class="note b-blue r1-planl3">${ic('info')}<div class="small">Learners choose one of this programme's fee options (${r1Opts(pr.id).filter(o => o.status === 'Active').map(o => `${esc(o.label)} ${money(r1FeeOf(o), 'GBP')}`).join(' · ') || 'none yet'}). The deposit and instalments set here apply to each of them.</div></div>`); };
// Level 3 programmes made with the wizard: wherever the single price used to show, the fee options show instead
const r1OptsTxt = pid => r1Opts(pid).filter(o => o.status === 'Active').map(o => `${esc(o.label)} ${money(r1FeeOf(o), 'GBP')}`).join(' · ') || 'no fee options yet';
const _ch8PlanR1b = ch8PlanStep;
ch8PlanStep = function (pr) {
  const h = _ch8PlanR1b.apply(this, arguments); if (!pr || !r1IsL3Pid(pr.id)) return h; const p = pr.plan;
  const per = r1Opts(pr.id).filter(o => o.status === 'Active').map(o => { const f = r1FeeOf(o); return `<li>${esc(o.label)} (${esc(r1ModeTxt(o))}) — ${money(f, 'GBP')}: ${p.inst} instalments${e1InstTxt(f, p.inst)}${p.deposit == null ? ' — no deposit' : `, or deposit ${money(p.deposit, 'GBP')} then ${money(f - p.deposit, 'GBP')}`}</li>`; }).join('');
  return h.replace(/<p class="small">Price [\s\S]*?<\/p><\/section>/, `<ul class="small r1-planper">${per || '<li>No fee options yet.</li>'}</ul></section>`);
};
const _ch8ReviewR1 = ch8ReviewStep;
ch8ReviewStep = function (pr) {
  const h = _ch8ReviewR1.apply(this, arguments); if (!pr || !r1IsL3Pid(pr.id)) return h;
  return h.replace(/<dt>Duration · price<\/dt><dd>([^<]*?) · [^<]*<\/dd>/, (m, dur) => `<dt>Duration · fee options</dt><dd>${dur} · ${r1OptsTxt(pr.id)}</dd>`)
    .replace(/<dt>Support type<\/dt><dd>([^<]*?) ?<span class="tbd"[\s\S]*?<\/span><\/dd>/, (m, sup) => `<dt>Default class pattern</dt><dd>${sup.trim()} <span class="xs muted">— learners' modes come from their fee options</span></dd>`);
};
const _fPlansR1b = SCREENS['f-plans'];
SCREENS['f-plans'] = p => { let h = _fPlansR1b(p); (STORE.chNewProgs || []).filter(pr => r1IsL3Pid(pr.id)).forEach(pr => { h = h.replace(`${chip(pr.status)} · ${money(pr.price, 'GBP')} · deposit`, `${chip(pr.status)} · fee options: ${r1OptsTxt(pr.id)} · deposit`); }); return h; };
// Programme payment plans: a Level 3 programme without a standard fee is priced by its options (the plan's fee is only its reference)
const _s4PlansCardR1 = s4PlansCard;
s4PlansCard = function () {
  let h = _s4PlansCardR1.apply(this, arguments);
  r1L3Progs().filter(pr => !r1StdOf(pr.id) && (s4PlanCur(pr.id) || s4PlanLast(pr.id))).forEach(pr => {
    h = h.replace(new RegExp(`(<tr data-pid="${pr.id}">[\\s\\S]*?</td>)<td class="r">[^<]*</td>(<td>[\\s\\S]*?</td>)<td>(\\d+) × [^<]*</td>`), (m, a, dep, n) => `${a}<td class="r small">By fee option</td>${dep}<td>${n} monthly</td>`);
  });
  return h;
};
// The programme's Support tab: for Level 3, the learner-level rule is stated as confirmed; the open P-31 questions stay tagged
const _supTabR1 = chSupportTab;
// (Level 3: the per-course-or-batch question is answered — the learner's fee option; what each mode includes is still open)
const R1_P31_OPEN = '<span class="tbd" title="' + TBD_TIP + '">Pending client: what Fully Assisted and Self-Paced each include (P-31)</span>';
chSupportTab = function (pr) { const h = _supTabR1.apply(this, arguments); if (!pr || !r1IsL3Pid(pr.id)) return h; return h.replace(CH_P31, R1_P31_OPEN).replace(esc(N2_P31), '<strong class="r1-sup3">' + esc(R1_NP_MODE) + '</strong> It never changes an existing batch or its learners. Transitional until N5: observation fees are still worked out from this programme setting.'); };

if (typeof ADMIN !== 'undefined' && ADMIN && STORE.worlds) r1Init();
