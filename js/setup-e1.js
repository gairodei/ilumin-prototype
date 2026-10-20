/* E1 — NVQ programme duration and payment configuration (post-R1–R5 enhancement, Oct 2026; PD-E1-* in PROVISIONAL-DECISIONS.md).
   CONFIRMED (20 Oct 2026): Finance Admin approval is required for payment terms proposed by an Academic Admin or System Admin when
   creating a new NVQ programme. Everything else here (routing details, durations, methods) stays provisional.
   A. Duration is a whole number and a unit (days, weeks, months, years), wherever a programme's duration is entered or shown. Older
      free-text values are read as structured only when they are exactly "<number> <unit>"; anything else is kept as written and
      flagged for an admin to choose a number and unit (it is never reinterpreted).
   B. The programme payment plan says how learners pay: one payment, instalments, or both (the learner chooses). It belongs to the plan,
      so every Level 3 fee option inherits it. Instalments keep the existing rule: 2–24, and each fee must split into them to the penny.
      Deposit eligibility, seat holds, plan versions, pinned sign-up terms and learners' payment records are unchanged.
   C. Payment terms of a new programme go to Finance: the creator (Academic Admin or System Admin) proposes them, a Finance Admin
      approves them or asks for changes (only an Active Finance Admin decides — always, however long the item waits; it never
      escalates to the Super Administrator), through the existing Approvals Queue. A Draft programme can't be published until its terms are approved; publishing stays with its existing roles.
      Finance Admins and the Super Administrator remain the plan's owners (G5.2): their own saves are approved terms, and the Super
      Administrator's own terms need no approval (D8). Plans in force before E1 stay in force.
   Loads after setup-r5.js; the queue decision is wired in e1-apply.js (before guard.js). */
'use strict';

/* ---------- A. Structured duration ---------- */
const E1_UNITS = [['days', 'Days'], ['weeks', 'Weeks'], ['months', 'Months'], ['years', 'Years']];
const E1_DUR_MAX = 999;
const e1DurFmt = v => (v ? `${v.n} ${v.n === 1 ? v.unit.slice(0, -1) : v.unit}` : '');
// "12 months", "1 Year", "90days" → structured; "12–18 months", "1.5 years", "Flexible" → null (kept as written, flagged)
function e1DurParse(s) {
  const m = String(s == null ? '' : s).trim().match(/^(\d{1,3})\s*(day|week|month|year)s?$/i), n = m ? +m[1] : 0;
  return m && n >= 1 && n <= E1_DUR_MAX ? { n, unit: m[2].toLowerCase() + 's' } : null;
}
const e1DurOf = pr => (pr && pr.durV) || null;
const e1DurOdd = pr => !!(pr && !pr.durV && String(pr.dur || '').trim());
const e1DurTxt = pr => (e1DurOf(pr) ? e1DurFmt(e1DurOf(pr)) : (pr && pr.dur) || '—');
const e1DurHtml = pr => (e1DurOf(pr) ? esc(e1DurFmt(e1DurOf(pr))) : e1DurOdd(pr) ? `${esc(pr.dur)} <span class="e1-durchk" title="Entered as free text before durations had a number and unit — choose them in Details">${chip('Check duration', 'amber')}</span>` : '—');
// One-off, non-destructive migration of the wizard programmes' free-text durations (the text itself is never changed)
function e1DurMigrate() { (STORE.chNewProgs || []).forEach(pr => { if (pr.durV === undefined) pr.durV = e1DurParse(pr.dur); }); }

function e1DurField(d) {
  const v = d.durV !== undefined ? d.durV : d.dur ? e1DurParse(d.dur) : { n: 12, unit: 'months' }, odd = !v && String(d.dur || '').trim();
  return `<fieldset class="field e1-dur" style="border:0;padding:0"><legend class="lbl">Duration</legend><div class="e1-dur-row">
    <label class="sr" for="np-d">Duration — number</label><input class="input num" type="number" min="1" max="${E1_DUR_MAX}" step="1" inputmode="numeric" id="np-d" value="${v ? v.n : ''}">
    <label class="sr" for="np-du">Duration — unit</label><select class="select" id="np-du">${E1_UNITS.map(([k, l]) => `<option value="${k}" ${(v ? v.unit : 'months') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    ${odd ? `<span class="hint e1-dur-legacy">Previously entered as "${esc(d.dur)}". It isn't converted automatically — enter a number and choose a unit.</span>` : ''}</fieldset>`;
}
const _fieldsE1 = ch8DetailsFields;
ch8DetailsFields = function (d) { d = d || {}; return _fieldsE1.apply(this, arguments).replace(/<div class="field"><label for="np-d">Duration<\/label><input class="input" id="np-d" value="[^"]*"><\/div>/, e1DurField(d)); };
let E1_READ = null; // the details last read successfully (the save wrapper takes the structured duration from it)
const _readE1 = ch8ReadDetails;
ch8ReadDetails = function () {
  E1_READ = null; const d = _readE1.apply(this, arguments); if (!d) return null;
  const raw = v8('#np-d').trim(), unit = v8('#np-du'), n = Number(raw);
  if (!/^\d+$/.test(raw) || !(n >= 1 && n <= E1_DUR_MAX)) return fieldErr('#np-d', `Enter the duration as a whole number from 1 to ${E1_DUR_MAX}`), null;
  if (!E1_UNITS.some(u => u[0] === unit)) return fieldErr('#np-du', 'Choose days, weeks, months or years'), null;
  d.durV = { n, unit }; d.dur = e1DurFmt(d.durV); E1_READ = d; return d;
};

/* ---------- B. Payment methods on the programme plan ---------- */
const E1_METH = {
  'one-time': ['One payment', 'The learner pays the full fee at sign-up.'],
  instalments: ['Instalments', 'The learner pays in equal monthly instalments; the first is due at sign-up.'],
  both: ['Both — the learner chooses', 'The learner chooses at sign-up: the full fee in one payment, or monthly instalments.']
};
const E1_N_MIN = 2, E1_N_MAX = 24;
const e1MethOf = p => (p && E1_METH[p.meth] ? p.meth : 'instalments'); // a plan saved before E1 offers instalments, as it always did
const e1MethLbl = p => E1_METH[e1MethOf(p)][0];
// "How learners pay" for one fee
function e1PayHow(fee, p) {
  const m = e1MethOf(p), n = p.inst, per = fee / n;
  if (m === 'one-time') return `${money(fee, 'GBP')} in one payment`;
  const inst = `${n} monthly instalments of ${money(per, 'GBP')}`;
  return m === 'both' ? `${money(fee, 'GBP')} in one payment, or ${inst}` : inst;
}
const e1MethShort = p => (p ? (e1MethOf(p) === 'one-time' ? 'One payment' : e1MethOf(p) === 'both' ? `In full, or ${p.inst} monthly` : `${p.inst} monthly`) : '—');
// The plan carries its method: a save keeps the method it was given, otherwise the current one (so no editor drops it)
let E1_METH_SAVE = null;
const _issueE1 = s4PlanIssue;
s4PlanIssue = function (p) {
  const why = _issueE1.apply(this, arguments); if (why || !p || !p.meth) return why;
  if (p.meth === 'one-time' && p.inst !== 1) return 'A one-payment plan has no instalments.';
  if (p.meth !== 'one-time' && p.inst < E1_N_MIN) return `Offer at least ${E1_N_MIN} instalments, or choose "One payment".`;
  return '';
};
const _planSaveE1 = s4PlanSave;
s4PlanSave = function (pr, f, note, opts = {}) {
  const prev = s4PlanCur(pr.id) || s4PlanLast(pr.id), meth = E1_METH_SAVE || (f && f.meth) || (prev && prev.meth) || null;
  const why = meth ? s4PlanIssue({ ...f, meth, status: 'Active' }) : ''; if (why) return why;
  const r = _planSaveE1.apply(this, arguments); if (r) return r;
  const last = s4PlanLast(pr.id); if (meth) last.meth = meth;
  const a = ADMIN.audit[0];
  if (!opts.noLog && a && a.module === 'Payment Plans' && a.after === `v${last.v} · ${s4PlanTxt(last)}`) { a.after += ` · ${e1MethLbl(last)}`; if (prev) a.before += ` · ${e1MethLbl(prev)}`; }
  return '';
};
// Every sign-up's pinned terms carry the method (terms pinned before E1 have none: instalments, as agreed)
const _termsE1 = s4TermsOf;
s4TermsOf = function (pid) { const t = _termsE1.apply(this, arguments), p = s4PlanCur(pid); return p && p.meth ? { ...t, meth: p.meth } : t; };
const _r1TermsE1 = r1TermsOf;
r1TermsOf = function (o) { const t = _r1TermsE1.apply(this, arguments), p = s4PlanCur(r1PidOf(o)); return p && p.meth ? { ...t, meth: p.meth } : t; };
ACT.s4PlanHist = el => { const pr = s4Pr(el.dataset.p); openModal({ title: 'Payment plan history — ' + esc(pr.title), size: 'lg', body: `<ul class="list">${s4Plans(pr.id).slice().reverse().map(p => `<li class="li"><div class="li-b"><strong>Version ${p.v}</strong><span class="small">${esc(s4PlanTxt(p))} · ${esc(e1MethLbl(p))}</span><span class="xs muted">${p.fixture ? 'Configuration in use before plans were versioned (no recorded date or author)' : `${fdt(p.at)} · ${esc(p.by)} · ${esc(p.note)}`}</span></div>${chip(p.status, p.status === 'Active' ? 'green' : 'grey')}</li>`).join('')}</ul>`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); };

// The fees a plan has to fit: a Level 3 programme's active fee options, otherwise the programme fee
const e1Fees = pr => r1IsL3Pid(pr.id) && r1Opts(pr.id).some(o => o.status === 'Active')
  ? r1Opts(pr.id).filter(o => o.status === 'Active').map(o => ({ id: o.id, label: o.label, mode: r1ModeTxt(o), fee: r1FeeOf(o) }))
  : [{ id: null, label: 'Programme fee', mode: null, fee: (s4PlanCur(pr.id) || s4PlanLast(pr.id) || {}).fee || pr.price }];
// Terms checked against every fee; returns '' or the reason
function e1TermsIssue(pr, t) {
  if (t.meth !== 'one-time' && !(Number.isInteger(t.inst) && t.inst >= E1_N_MIN && t.inst <= E1_N_MAX)) return `Enter ${E1_N_MIN} to ${E1_N_MAX} monthly instalments`;
  for (const f of e1Fees(pr)) { if (!(f.fee > 0)) continue; const why = s4PlanIssue({ fee: f.fee, deposit: t.dep, inst: t.inst, meth: t.meth, partial: true, status: 'Active' }); if (why) return (f.id ? `${f.label}: ` : '') + why; }
  return '';
}
// The form: how learners pay, the instalment count, the deposit. "pp" = Finance's own plan form, "e1" = the creator's proposal
function e1Form(px, t) {
  const own = t.dep != null, dv = own ? t.dep : S4().cfg.deposit, many = t.meth !== 'one-time';
  return `<div class="e1-form">
    <fieldset class="stack e1-meth" style="border:0;padding:0"><legend class="lbl">How can learners pay?</legend>${Object.entries(E1_METH).map(([k, [l, h]]) => `<label class="check e1-mopt"><input type="radio" name="${px}-meth" value="${k}" ${t.meth === k ? 'checked' : ''} data-onchange="e1Meth" data-px="${px}"><span><strong>${l}</strong><br><span class="small muted">${h}</span></span></label>`).join('')}</fieldset>
    <div class="form-grid"><div class="field e1-n-${px}" ${many ? '' : 'hidden'}><label for="${px}-n">Number of monthly instalments</label><input class="input num" type="number" min="${E1_N_MIN}" max="${E1_N_MAX}" step="1" id="${px}-n" value="${many ? t.inst : CH_INST_N}" data-oninput="e1Live" data-px="${px}"><span class="hint">${E1_N_MIN} to ${E1_N_MAX}. Each fee must split evenly into them, to the penny (current rule — PD-R1-03).</span></div>
    <fieldset class="stack full s4-wdm" style="border:0;padding:0"><legend class="lbl">Deposit</legend><label class="check"><input type="radio" name="${px}-wdm" value="default" ${own ? '' : 'checked'} data-onchange="e1Live" data-px="${px}"> Use the default deposit (${money(S4().cfg.deposit, 'GBP')})</label><label class="check"><input type="radio" name="${px}-wdm" value="own" ${own ? 'checked' : ''} data-onchange="e1Live" data-px="${px}"> Own deposit for this programme</label></fieldset>
    <div class="field"><label for="${px}-d">Deposit (GBP)</label><input class="input num" type="number" min="0" id="${px}-d" value="${dv}" data-oninput="e1Live" data-px="${px}"></div></div></div>`;
}
INP.e1Meth = el => { const px = el.dataset.px; $$(`.e1-n-${px}`).forEach(x => { x.hidden = el.value === 'one-time'; }); const n = $(`#${px}-n`); if (n && el.value !== 'one-time' && !(+n.value >= E1_N_MIN)) n.value = CH_INST_N; INP.e1Live(el); };
// The payment summary follows the form as it is edited (nothing is saved until Save / Submit)
INP.e1Live = el => {
  const px = el.dataset.px, sec = el.closest('.e1-plan'), pr = sec && ch8Pr(sec.dataset.pid), box = sec && sec.querySelector('.e1-sumbox'); if (!pr || !box) return;
  const meth = ($(`input[name="${px}-meth"]:checked`) || {}).value, inst = meth === 'one-time' ? 1 : Number(($(`#${px}-n`) || {}).value), dep = Number(($(`#${px}-d`) || {}).value), dm = ($(`input[name="${px}-wdm"]:checked`) || {}).value;
  if (!E1_METH[meth] || !(Number.isInteger(inst) && inst >= 1 && inst <= E1_N_MAX) || !(dep >= 0)) return;
  box.innerHTML = e1Summary(pr, { meth, inst, dep: dm !== 'own' && dep === S4().cfg.deposit ? null : dep });
};
// Read the form; returns the terms or null (with the field marked)
function e1ReadForm(px, pr) {
  const meth = ($(`input[name="${px}-meth"]:checked`) || {}).value, nS = String(($(`#${px}-n`) || {}).value || '').trim(), dm = ($(`input[name="${px}-wdm"]:checked`) || {}).value, dS = String(($(`#${px}-d`) || {}).value || '').trim();
  if (!E1_METH[meth]) return fieldErr(`input[name="${px}-meth"]`, 'Choose how learners can pay'), null;
  const inst = meth === 'one-time' ? 1 : Number(nS);
  if (meth !== 'one-time' && !(/^\d+$/.test(nS) && inst >= E1_N_MIN && inst <= E1_N_MAX)) return fieldErr(`#${px}-n`, `Enter ${E1_N_MIN} to ${E1_N_MAX} monthly instalments (a whole number)`), null;
  const dep = Number(dS), inherit = dm !== 'own' && dep === S4().cfg.deposit;
  if (dS === '' || !(dep >= 0)) return fieldErr(`#${px}-d`, 'Enter the deposit in GBP'), null;
  const t = { meth, inst, dep: inherit ? null : dep }, why = e1TermsIssue(pr, t);
  if (why) return fieldErr(/instalments|divide/.test(why) && meth !== 'one-time' ? `#${px}-n` : `#${px}-d`, why), null;
  return t;
}
const e1TermsOfPlan = p => ({ meth: e1MethOf(p), inst: p ? p.inst : CH_INST_N, dep: p ? p.deposit : null });
const e1EffDep = t => (t.dep == null ? S4().cfg.deposit : t.dep);
const e1TermsTxt = t => `${E1_METH[t.meth][0]}${t.meth !== 'one-time' ? ` · ${t.inst} monthly instalments` : ''} · deposit ${money(e1EffDep(t), 'GBP')} ${t.dep == null ? '(default)' : '(own)'}`;
// Payment summary: every fee (each Level 3 option) with how its learners pay and the deposit route
function e1Summary(pr, t) {
  const p = { meth: t.meth, inst: t.inst }, dep = e1EffDep(t), l3 = r1IsL3Pid(pr.id), fees = e1Fees(pr);
  return `<div class="tbl-wrap e1-sum"><table class="tbl dense"><thead><tr><th>${l3 ? 'Fee option' : 'Applies to'}</th>${l3 ? '<th>Delivery mode</th>' : ''}<th class="r">Fee</th><th>How learners pay</th><th>With a deposit</th></tr></thead><tbody>${fees.map(f => { const why = f.fee > 0 ? s4PlanIssue({ fee: f.fee, deposit: t.dep, inst: t.inst, meth: t.meth, partial: true, status: 'Active' }) : 'No fee set';
    return `<tr><td>${esc(f.label)}</td>${l3 ? `<td class="small">${esc(f.mode)}</td>` : ''}<td class="r num">${f.fee > 0 ? money(f.fee, 'GBP') : '—'}</td><td class="small">${f.fee > 0 ? esc(e1PayHow(f.fee, p)) : '—'}${why ? `<div class="xs" style="color:var(--red)">${esc(why)}</div>` : ''}</td><td class="small">${f.fee > dep ? `${money(dep, 'GBP')}, then ${money(f.fee - dep, 'GBP')} within ${chHoldDays()} days` : '—'}</td></tr>`; }).join('')}</tbody></table></div>
    <p class="xs muted">The deposit route is offered only when the learner's batch starts in ${CH_HOLD_DAYS} days or more (CH-10); it holds the seat for ${chHoldDays()} days. ${l3 ? 'Every fee option uses these terms.' : ''}</p>`;
}

/* ---------- C. Finance review of a new programme's payment terms ---------- */
const E1_T = 'Programme payment terms';
QTYPES.push(E1_T); FIN_TYPES.push(E1_T); QLBL[E1_T] = 'Programme payment terms';
const e1Store = () => (STORE.e1 = STORE.e1 || { terms: {} });
const e1T = pid => e1Store().terms[pid] || null;  // no record: terms in force before E1 (or a programme not made with the wizard)
const E1_ST = {
  legacy: ['In force', 'green', 'These terms were set before Finance review was introduced and stay in force.'],
  Draft: ['Draft — not yet submitted', 'grey', 'Not yet sent to Finance. The programme can\'t be published until Finance approves its payment terms.'],
  Pending: ['Waiting for Finance review', 'amber', 'Finance is reviewing these terms. They can\'t be changed until Finance decides.'],
  Changes: ['Changes requested', 'red', 'Finance asked for changes. Update the terms and submit them again.'],
  Approved: ['Approved', 'green', 'Approved payment terms — the payment plan in force.']
};
const e1Key = pr => { const T = e1T(pr.id); return T ? T.status : 'legacy'; };
const e1Ok = pr => ['legacy', 'Approved'].includes(e1Key(pr));
const e1Chip = pr => chip(E1_ST[e1Key(pr)][0], E1_ST[e1Key(pr)][1]);
const e1IsCreator = () => ch8Can() && !finOwner(); // Academic Admin / System Admin: propose; Finance Admin / Super Admin: own the plan (G5.2)
function e1Approver() { const fins = ADMIN.staff.filter(s => s.roles.includes('Finance Admin') && s.status === 'Active').map(s => s.name); return fins.includes(FIN_A) ? FIN_A : fins.find(n => n !== ADMIN.me.name) || 'Super Administrator'; }
// Who may decide a payment-terms item (confirmed): only an authorized, Active Finance Admin — before and after 7 days. The item never
// escalates, so the Super Administrator gains no authority over it by time passing (their own plan actions stay immediate, D8).
// The raiser never decides (G4 guard, guard.js).
const e1ActiveFin = () => typeof isFin === 'function' && isFin() && (ADMIN.staff || []).some(s => s.name === ADMIN.me.name && s.roles.includes('Finance Admin') && s.status === 'Active');
const e1CanDecide = i => !!i && e1ActiveFin();
const e1WhyNot = () => 'Only an Active Finance Admin can approve payment terms or request changes.';
// The shared queue escalates a Pending item to the Super Administrator after 7 days (G4). That transfer of authority isn't confirmed
// for this item type, so it is kept out of it: the item stays Pending with its Finance approver and is only marked overdue
// (informational; no reminder or other notice is sent — reminder policy is provisional). Every other item type escalates as before.
const E1_OVERDUE = 7;
const e1Overdue = i => !!i && i.type === E1_T && isOpen(i) && Math.max(0, -daysTo(i.raised)) >= E1_OVERDUE;
const _allQE1 = allQueue;
allQueue = function () {
  const items = _allQE1.apply(this, arguments);
  ADMIN.queue.forEach(i => { if (i.type === E1_T && i.status === 'Escalated') { i.status = 'Pending'; delete i.escalated; } if (i.type === E1_T) i.overdue = e1Overdue(i); });
  return items;
};
// One notification per event: the key makes a repeated call (re-render, rebuild, retry) a no-op
function e1Notify(n) { const F = STORE.fin; if (!F || F.notifs.some(x => x.key === n.key)) return; F.notifs.unshift({ ...n, at: now().toISOString(), unread: true }); }
function e1Hist(pr, what, detail) { const T = e1T(pr.id); if (T) T.hist.push([now().toISOString(), ADMIN.me.name, what, detail || '']); }

// New programmes: the Super Administrator's terms are approved at once (D8); anyone else's start as a Draft proposal
const _createE1 = ch8Create;
ch8Create = function (d) {
  const pr = _createE1.apply(this, arguments); if (!pr) return pr;
  if (d && d.durV) pr.durV = { ...d.durV };
  const cur = s4PlanCur(pr.id) || s4PlanLast(pr.id), sa = isSA(), at = now().toISOString();
  e1Store().terms[pr.id] = { status: sa ? 'Approved' : 'Draft', prop: e1TermsOfPlan(cur), qid: null, hist: [[at, ADMIN.me.name, sa ? `Approved — ${SA_TAG}` : 'Draft terms created with the programme', cur ? e1TermsTxt(e1TermsOfPlan(cur)) : '']], approved: sa ? { by: ADMIN.me.name, at, how: SA_TAG, v: cur ? cur.v : null } : null };
  return pr;
};
// Details: the duration is saved with its number and unit; the fee can't change while Finance is reviewing it,
// and a changed fee after approval needs approval again (the creator's change; the plan owners' changes are their own)
const _saveDetE1 = ACT.ch8SaveDetails;
ACT.ch8SaveDetails = el => {
  const pr = ch8Pr(el.dataset.id); if (!pr || pr.status !== 'Draft') return _saveDetE1(el);
  const T = e1T(pr.id), lv = v8('#np-l'), price = +v8('#np-p');
  if (T && T.status === 'Pending' && (lv !== pr.level || (!r1IsL3Pid(pr.id) && price && price !== pr.price))) { fieldErr(lv !== pr.level ? '#np-l' : '#np-p', `The fee is with Finance for review (${T.qid}). Change it after Finance decides.`); return; }
  const was = { dur: e1DurTxt(pr), price: pr.price }; E1_READ = null; _saveDetE1(el); const d = E1_READ; if (!d) return;
  pr.durV = { ...d.durV };
  const a = ADMIN.audit[0]; if (was.dur !== e1DurTxt(pr) && a && a.action === 'Details changed') { a.before += ` · ${was.dur}`; a.after += ` · ${e1DurTxt(pr)}`; }
  if (T && T.status === 'Approved' && pr.price !== was.price && !finOwner()) { T.status = 'Draft'; T.approved = null; e1Hist(pr, 'Approval withdrawn — the fee changed', `${money(was.price, 'GBP')} → ${money(pr.price, 'GBP')}`); ch8Log(pr, 'Payment terms need Finance approval again', 'Approved', 'Draft', 'The programme fee changed in Details'); render(); toast('Saved. The fee changed, so the payment terms need Finance approval again.', 'info'); }
};

// The plan step (programmes made with the wizard): status, the terms, the payment summary, and what this person can do
function e1PlanStep(pr) {
  const T = e1T(pr.id), key = e1Key(pr), st = E1_ST[key], cur = s4PlanCur(pr.id) || s4PlanLast(pr.id), draft = pr.status === 'Draft', fo = finOwner(), q = T && T.qid ? qItem(T.qid) : null;
  const shown = T && !['Approved'].includes(T.status) && draft ? T.prop : e1TermsOfPlan(cur), issue = s4TermsOf(pr.id).issue;
  const qlink = q ? ` <a href="#a-queue.${q.id}" data-act="goTok" data-t="a-queue.${q.id}" class="mono">${q.id}</a>` : T && T.qid ? ` <span class="mono">${T.qid}</span>` : ''; // creators don't see Finance's queue
  const ret = T && T.status === 'Changes' && T.changes ? `<div class="small e1-ask"><strong>Finance's request:</strong> ${esc(T.changes.reason)} <span class="xs muted">— ${esc(T.changes.by)}, ${fdt(T.changes.at)}</span></div>` : '';
  const appr = T && T.status === 'Approved' && T.approved ? `<div class="small">Approved by ${esc(T.approved.by)} on ${fd(T.approved.at)}${T.approved.qid ? ` (${T.approved.qid})` : T.approved.how ? ` — ${esc(T.approved.how)}` : ''}.</div>` : '';
  const head = `<div class="row-b"><h2>Payment plan</h2>${draft || T ? e1Chip(pr) : ''}</div><p class="small muted">All amounts in GBP. The deposit is offered only when the learner's batch starts in ${CH_HOLD_DAYS} days or more; otherwise the learner pays in full or the first instalment.</p>
    ${draft || T ? `<div class="note b-${{ green: 'green', grey: 'grey', amber: 'amber', red: 'red' }[st[1]]} e1-state" role="status">${ic(key === 'Pending' ? 'clock' : key === 'Changes' ? 'alert' : 'info')}<div class="small"><strong>${st[0]}${key === 'Pending' || key === 'Changes' ? qlink : ''}.</strong> ${st[2]}${ret}${appr}</div></div>` : ''}`;
  let body;
  if (fo && key === 'Pending') body = `<h3>Proposed terms</h3><p class="small">${esc(e1TermsTxt(shown))}</p>${q && e1Overdue(q) ? `<p class="small e1-overdue">${chip('Overdue', 'amber')} Waiting ${Math.max(0, -daysTo(q.raised))} days — it stays with Finance (no escalation).</p>` : ''}${q && e1CanDecide(q) ? `<div class="row"><button class="btn btn-primary" data-act="e1Decide" data-id="${q.id}" data-a="approve">Approve payment terms</button><button class="btn" data-act="e1Decide" data-id="${q.id}" data-a="return">Request changes</button></div>` : ''}${q ? `<div class="row"><button class="btn btn-ghost" data-act="goTok" data-t="a-queue.${q.id}">Open in Approvals Queue</button></div>` : ''}<p class="xs muted">${ic('lock', 12)} A Finance Admin approves these terms or requests changes. The plan can't be edited while they are waiting.</p>`;
  else if (fo) body = `${e1Form('pp', e1TermsOfPlan(cur))}<button class="btn btn-sm btn-primary" data-act="ch8SavePlan" data-id="${pr.id}">Save payment plan</button><p class="xs muted">${ic('lock', 12)} Set by Finance or the Super Admin — your saved plan is the approved plan.</p>`;
  else if (draft && e1IsCreator() && T && ['Draft', 'Changes'].includes(T.status)) body = `${e1Form('e1', shown)}<div class="row"><button class="btn btn-primary" data-act="e1Submit" data-id="${pr.id}">Submit to Finance for review</button><button class="btn" data-act="e1Draft" data-id="${pr.id}">Save draft</button></div><p class="xs muted">${ic('lock', 12)} Set by Finance or the Super Admin — you propose the terms here and a Finance Admin approves them or asks for changes.</p>`;
  else body = `<dl class="kv"><dt>How learners pay</dt><dd>${esc(E1_METH[shown.meth][0])}</dd><dt>Instalments</dt><dd>${shown.meth === 'one-time' ? 'None' : shown.inst + ' monthly'}</dd><dt>Deposit</dt><dd>${money(e1EffDep(shown), 'GBP')} ${shown.dep == null ? '(default)' : '(own)'}</dd></dl><p class="xs muted">${ic('lock', 12)} Set by Finance or the Super Admin.</p>`;
  return `<section class="card e1-plan" data-pid="${pr.id}">${head}${body}<h3>Payment summary${T && !['Approved'].includes(T.status) && draft ? ' (proposed)' : ''}</h3><div class="e1-sumbox" aria-live="polite">${e1Summary(pr, shown)}</div>${issue && e1Ok(pr) ? `<div class="note b-red s4-planerr">${ic('alert')}<div class="small"><strong>Needs configuration.</strong> ${esc(issue)}</div></div>` : ''}${T && T.hist.length ? `<details class="e1-hist"><summary class="small">Payment terms history (${T.hist.length})</summary><ul class="list small">${T.hist.slice().reverse().map(h => `<li class="li"><div class="li-b"><strong>${esc(h[2])}</strong>${h[3] ? `<span>${esc(h[3])}</span>` : ''}<span class="xs muted">${fdt(h[0])} · ${esc(h[1])}</span></div></li>`).join('')}</ul></details>` : ''}</section>`;
}
const _planStepE1 = ch8PlanStep;
ch8PlanStep = function (pr) { return pr && pr.chNew ? e1PlanStep(pr) : _planStepE1.apply(this, arguments); };

// Finance / Super Admin save: the method goes with the plan; while a proposal waits, Finance decides it first
const _savePlanE1 = ACT.ch8SavePlan;
ACT.ch8SavePlan = el => {
  const pr = ch8Pr(el.dataset.id); if (!pr || !finOwner() || !$('input[name="pp-meth"]')) return _savePlanE1(el); // refusals stay S4a's (logged)
  const T = e1T(pr.id); if (T && T.status === 'Pending') { toast(`These terms are waiting for Finance review (${T.qid}) — approve them or request changes first.`, 'err'); return; }
  const t = e1ReadForm('pp', pr); if (!t) return;
  const n0 = s4Plans(pr.id).length, prevM = e1MethLbl(s4PlanCur(pr.id) || s4PlanLast(pr.id)); $('#pp-n').value = String(t.inst);
  E1_METH_SAVE = t.meth; try { _savePlanE1(el); } finally { E1_METH_SAVE = null; }
  if (s4Plans(pr.id).length === n0) return;
  const a = ADMIN.audit[0]; if (a && a.action === 'Payment plan saved') { a.before += ` · ${prevM}`; a.after += ` · ${E1_METH[t.meth][0]}`; }
  if (T || pr.status === 'Draft') { const R = e1Store().terms[pr.id] = T || { hist: [] }; const v = s4PlanLast(pr.id).v; Object.assign(R, { status: 'Approved', prop: t, approved: { by: ADMIN.me.name, at: now().toISOString(), how: isSA() ? SA_TAG : 'Saved by Finance', v } }); R.hist.push([now().toISOString(), ADMIN.me.name, `Plan saved (v${v}) — ${isSA() ? 'Super Administrator' : 'Finance'}`, e1TermsTxt(t)]); render(); }
};
// Creator: save the proposal, or submit it to Finance
const e1CreatorGuard = (pr, what) => {
  const T = pr && e1T(pr.id);
  if (pr && pr.status === 'Draft' && e1IsCreator() && T && ['Draft', 'Changes'].includes(T.status)) return true;
  if (pr) ch8Log(pr, 'Blocked: ' + what, T ? T.status : '—', T ? T.status : '—', T && T.status === 'Pending' ? 'Already waiting for Finance review' : 'Not allowed for ' + ADMIN.me.name);
  toast(T && T.status === 'Pending' ? `These terms are already waiting for Finance review (${T.qid}).` : 'Only the programme\'s creators propose payment terms, while the programme is a Draft.', 'err'); return false;
};
ACT.e1Draft = el => {
  const pr = ch8Pr(el.dataset.id); if (!e1CreatorGuard(pr, 'save payment terms')) return; const t = e1ReadForm('e1', pr); if (!t) return; const T = e1T(pr.id);
  if (e1TermsTxt(t) === e1TermsTxt(T.prop)) { toast('Nothing has changed.', 'info'); return; }
  const was = e1TermsTxt(T.prop); T.prop = t; e1Hist(pr, 'Draft terms saved', e1TermsTxt(t)); ch8Log(pr, 'Payment terms draft saved', was, e1TermsTxt(t)); render(); toast('Draft saved — not yet sent to Finance.');
};
ACT.e1Submit = el => {
  const pr = ch8Pr(el.dataset.id); if (!e1CreatorGuard(pr, 'submit payment terms')) return; const t = e1ReadForm('e1', pr); if (!t) return;
  confirmDlg({ title: 'Submit payment terms to Finance?', ok: 'Submit for review', body: `<p class="small">${esc(e1TermsTxt(t))}</p>${e1Summary(pr, t)}<p class="small">A Finance Admin approves the terms or asks for changes. You can't change them, or the fee, while they're being reviewed.</p>`, onOk: () => { if (e1CreatorGuard(pr, 'submit payment terms')) e1SubmitNow(pr, t); } });
};
function e1SubmitNow(pr, t) {
  const T = e1T(pr.id), at = now().toISOString(), first = e1Approver(), fees = e1Fees(pr);
  let n = 7600 + ADMIN.queue.length, id; while (ADMIN.queue.some(i => i.id === (id = 'AQ-' + n))) n++;
  const txt = e1TermsTxt(t), i = { id, type: E1_T, raisedBy: ADMIN.me.name, raised: at, status: 'Pending', first, related: [`${pr.title} · ${pr.id}`, 'f-plans..templates'] /* Finance's own page: its Payment Plans (Finance can't open NVQ Programmes) */, notes: [], amount: Math.min(...fees.map(f => f.fee || Infinity)), cur: 'GBP', reason: `Payment terms for the new programme: ${txt}`, history: [[ADMIN.me.name, at, 'Raised', txt]], data: { pid: pr.id, prop: { ...t }, fees: fees.map(f => ({ ...f })), role: typeof isSys === 'function' && isSys() ? 'sys' : 'aca' } };
  ADMIN.queue.unshift(i); T.status = 'Pending'; T.qid = id; T.prop = { ...t };
  e1Hist(pr, `Submitted to Finance (${id})`, txt); ch8Log(pr, 'Payment terms submitted for Finance review', 'Draft', 'Waiting for Finance review', `${id} · ${txt}`);
  if (first !== 'Super Administrator') e1Notify({ key: 'e1-sub-' + id, to: first, t: 'Programme payment terms to review', b: `${id} · ${pr.title}: ${txt}`, go: 'a-queue.' + id });
  render(); toast(`Sent to Finance for review (${id}). You'll be told when they decide.`);
}
// The decision, called from e1-apply.js inside the self-approval guard. Only an authorized Finance Admin decides (e1CanDecide) —
// never the creator, and it gives no academic or publishing rights; only "approve" and "request changes" (with a reason) are offered.
function e1Decide(i, a, r, base) {
  if (a === 'note') return base();
  const pr = ch8Pr(i.data && i.data.pid), T = pr && e1T(pr.id), refuse = (why, msg) => { logA('Approvals Queue', i.id, 'Blocked: decide payment terms', i.status, i.status, why); toast(msg, 'err'); return false; };
  if (!e1CanDecide(i)) return refuse('Only an Active Finance Admin decides payment terms', e1WhyNot(i));
  if (!['approve', 'return'].includes(a)) return refuse('Use Approve or Request changes', 'Approve the payment terms, or request changes with a reason.');
  if (!String(r || '').trim()) return refuse('No reason given', a === 'return' ? 'Say what needs to change.' : 'Enter a note for the record.');
  if (!isOpen(i) || !T || T.qid !== i.id || T.status !== 'Pending') return refuse('Not waiting for review', 'This proposal is no longer waiting for review.');
  const t = i.data.prop; if (a === 'approve') { const why = e1TermsIssue(pr, t); if (why) return refuse(why, 'Can\'t approve: ' + why + ' — request changes instead.'); }
  if (base() === false) return false;
  const at = now().toISOString(), txt = e1TermsTxt(t), go = `a-programmes.${pr.id}.plan`;
  if (a === 'approve') {
    const cur = s4PlanCur(pr.id) || s4PlanLast(pr.id), same = cur && cur.status === 'Active' && e1MethOf(cur) === t.meth && cur.inst === t.inst && cur.deposit === t.dep;
    if (!same) { E1_METH_SAVE = t.meth; try { s4PlanSave(pr, { fee: cur ? cur.fee : pr.price, deposit: t.dep, inst: t.inst, partial: cur ? cur.partial : true }, `Approved by Finance (${i.id}): ${r}`); } finally { E1_METH_SAVE = null; } }
    Object.assign(T, { status: 'Approved', approved: { by: ADMIN.me.name, at, qid: i.id, v: (s4PlanCur(pr.id) || {}).v } });
    e1Hist(pr, `Approved by Finance (${i.id})`, `${txt} — ${r}`); ch8Log(pr, 'Payment terms approved', 'Waiting for Finance review', 'Approved', `${i.id} · ${r}`);
  } else { T.status = 'Changes'; T.changes = { by: ADMIN.me.name, at, reason: r, qid: i.id }; e1Hist(pr, `Changes requested by Finance (${i.id})`, r); ch8Log(pr, 'Payment terms: changes requested', 'Waiting for Finance review', 'Changes requested', `${i.id} · ${r}`); }
  const tt = a === 'approve' ? 'Payment terms approved' : 'Payment terms — changes requested', bb = `${i.id} · ${pr.title}: ${a === 'approve' ? txt + '. The programme can be published once nothing else is blocking.' : r}`;
  if (!i._e1Told) { i._e1Told = true; if (i.data.role === 'sys' && typeof sysNotify === 'function') sysNotify(tt, bb, go, i.raisedBy); else if (typeof acaNotify === 'function') acaNotify(tt, bb, go, i.raisedBy); }
}
// Approve / Request changes, from the plan step or the queue item (the guard is checked before the dialog opens)
ACT.e1Decide = el => {
  const i = qItem(el.dataset.id), a = el.dataset.a; if (!i) return;
  if (typeof decisionBlocked === 'function' && decisionBlocked(i, a)) { toast(refuseMsg(i), 'err'); return; }
  if (!e1CanDecide(i)) { logA('Approvals Queue', i.id, 'Blocked: decide payment terms', i.status, i.status, 'Only an Active Finance Admin decides payment terms'); toast(e1WhyNot(i), 'err'); return; }
  reasonDlg({ title: (a === 'approve' ? 'Approve payment terms — ' : 'Request changes — ') + i.id, ok: a === 'approve' ? 'Approve terms' : 'Request changes', label: a === 'approve' ? 'Note for the record (required)' : 'What needs to change? (required)',
    body: a === 'approve' ? `<p class="small">A new payment-plan version is saved with these terms. The programme's creator can then publish it. Learners who already signed up keep their terms.</p>` : '<p class="small">The creator is told what to change and can submit the terms again.</p>',
    onOk: r => { if (applyDecision(i, a, r) === false) return false; render(); } });
};
// The queue item: what is proposed, against what is in force; only Approve / Request changes (no reject, no override)
const _qdE1 = queueDetail;
queueDetail = function (id) {
  let h = _qdE1.apply(this, arguments); const i = qItem(id); if (!i || i.type !== E1_T) return h;
  const d = i.data || {}, pr = ch8Pr(d.pid), t = d.prop, cur = pr && (s4PlanCur(pr.id) || s4PlanLast(pr.id));
  const panel = `<section class="card e1-q"><h2>Programme payment terms</h2><dl class="kv"><dt>Programme</dt><dd>${pr ? `${isFin() ? `<strong>${esc(pr.title)}</strong>` : `<a href="#a-programmes.${pr.id}.plan" data-act="goTok" data-t="a-programmes.${pr.id}.plan">${esc(pr.title)}</a>`} <span class="xs muted">${pr.id} · ${esc(pr.level)} · ${esc(pr.status)}</span>` : '—'}</dd><dt>How learners pay</dt><dd><strong>${esc(E1_METH[t.meth][0])}</strong> — ${esc(E1_METH[t.meth][1])}</dd><dt>Instalments</dt><dd>${t.meth === 'one-time' ? 'None' : t.inst + ' monthly'}</dd><dt>Deposit</dt><dd>${money(e1EffDep(t), 'GBP')} ${t.dep == null ? '(default)' : '(own)'}</dd><dt>In force now</dt><dd class="small">${cur ? `v${cur.v} · ${esc(s4PlanTxt(cur))} · ${esc(e1MethLbl(cur))}` : 'No plan yet'}</dd><dt>On approval</dt><dd class="small">A new plan version is saved with these terms and the creator can publish the programme. Finance doesn't publish it. Existing learners keep their terms.</dd><dt>Requirement</dt><dd class="small">Confirmed (20 Oct 2026): a Finance Admin approves payment terms proposed for a new programme. Finance approves the financial terms only — not academic content or publication.</dd><dt>Route</dt><dd class="small">Routed to ${esc(i.first)}; any Active Finance Admin may decide (reviewer routing — provisional). This item doesn't escalate: after ${E1_OVERDUE} days it is marked overdue, for information only, and stays with Finance.</dd>${e1Overdue(i) ? `<dt>Overdue</dt><dd class="small e1-overdue">${chip('Overdue', 'amber')} Waiting ${i.days} days. Still decided by a Finance Admin; nothing is approved or rejected automatically.</dd>` : ''}</dl>${pr ? `<h3>Payment summary</h3>${e1Summary(pr, t)}` : ''}</section>`;
  const k = [h.indexOf('<div class="q3">'), h.indexOf('<div class="grid-2"><div class="stack-lg">')].find(x => x >= 0) ?? -1; if (k >= 0) h = h.slice(0, k) + `<div class="grid-2 k-panels">${panel}</div>` + h.slice(k);
  const who = esc(i.raisedBy), opt = (btn, c) => `<div class="q-opt">${btn}<p class="xs q-conseq">→ ${c}</p></div>`;
  const card = `<section class="card q-decide"><h2>Decision</h2><div class="q-opts">${opt(`<button class="btn btn-primary" data-act="e1Decide" data-id="${i.id}" data-a="approve" ${selfBlocked(i) ? `disabled title="${esc(refuseMsg(i))}"` : !e1CanDecide(i) ? `disabled title="${esc(e1WhyNot(i))}"` : ''}>Approve payment terms</button>`, `A new payment-plan version is saved with these terms. ${who} is told and can then publish the programme.`)}${opt(`<button class="btn" data-act="e1Decide" data-id="${i.id}" data-a="return" ${!e1CanDecide(i) ? `disabled title="${esc(e1WhyNot(i))}"` : ''}>Request changes</button>`, `Goes back to ${who} with your reason, to change and submit again. Nothing is applied.`)}</div>
    <details class="q-more"><summary class="small">Other options</summary>${opt(`<button class="btn btn-ghost" data-act="qDo" data-id="${i.id}" data-a="note">Add note</button>`, 'Adds an internal note to the history. The status doesn\'t change.')}</details></section>`;
  h = isOpen(i) ? h.replace(/<section class="card q-decide">[\s\S]*?<\/section>/, card) : h;
  return h.replace(/<button class="btn" data-act="qOverride"[^>]*>[\s\S]*?<\/button>/g, '');
};
const _qOvE1 = ACT.qOverride;
ACT.qOverride = el => { const i = qItem(el.dataset.id); if (i && i.type === E1_T) { toast('Payment-terms decisions aren\'t overridden here — the creator submits the terms again.', 'err'); return; } return _qOvE1(el); };
// (Finance's queue list shows each item's own type: finQLbl in finance.js)
// The confirmed routing table (G4, "Who approves what") is not changed: this route is provisional and is stated on the item itself

// Publishing: a Draft programme needs approved payment terms (the other requirements are unchanged)
const E1_BLOCK = { Draft: 'not yet sent to Finance — submit them from the Payment plan step', Pending: 'waiting for Finance review', Changes: 'Finance requested changes — update them in the Payment plan step and submit again' };
const _checkE1 = ch8Check;
ch8Check = function (pr) {
  const r = _checkE1.apply(this, arguments); if (!pr) return r; const T = e1T(pr.id);
  if (pr.status === 'Draft' && T && E1_BLOCK[T.status]) r.block.push(`Payment terms ${E1_BLOCK[T.status]}${T.qid && T.status !== 'Draft' ? ` (${T.qid})` : ''}`);
  if (pr.status === 'Draft' && e1DurOdd(pr)) r.warn.push(`Duration "${pr.dur}" was entered as free text — choose a number and unit in Details`);
  return r;
};
// Detail and review pages: the structured duration, the plan step's real state, and the terms in the review
const _setupE1 = ch8Setup;
ch8Setup = function (pr) {
  let h = _setupE1.apply(this, arguments);
  h = h.replace(`<dt>Duration</dt><dd>${esc(pr.dur)}</dd>`, `<dt>Duration</dt><dd>${e1DurHtml(pr)}</dd>`);
  if (!e1Ok(pr)) h = h.replace(`<li class="step done"><button class="linklike" data-go="a-programmes" data-id="${pr.id}" data-tab="plan">`, `<li class="step"><button class="linklike" data-go="a-programmes" data-id="${pr.id}" data-tab="plan">`);
  return h;
};
const _reviewE1 = ch8ReviewStep;
ch8ReviewStep = function (pr) {
  let h = _reviewE1.apply(this, arguments); if (!pr) return h; const T = e1T(pr.id), cur = s4PlanCur(pr.id) || s4PlanLast(pr.id), t = T && T.status !== 'Approved' && pr.status === 'Draft' ? T.prop : e1TermsOfPlan(cur);
  h = h.replace(`<dd>${esc(pr.dur)} · `, `<dd>${e1DurHtml(pr)} · `);
  return h.replace(/<dt>Payment plan<\/dt><dd>[^<]*<\/dd>/, `<dt>Payment plan</dt><dd>${esc(e1TermsTxt(t))} ${e1Chip(pr)}</dd><dt>How each fee is paid</dt><dd>${e1Summary(pr, t)}</dd>`);
};
// Finance → Payment Plans: each wizard programme's terms state and method
const _fPlansE1 = SCREENS['f-plans'];
SCREENS['f-plans'] = p => {
  let h = _fPlansE1(p);
  (STORE.chNewProgs || []).forEach(pr => {
    const head = `<strong>${esc(pr.title)}</strong><span class="small muted">${chip(pr.status)}`, s = h.indexOf(head), tail = ` · ${pr.plan.inst} instalments</span>`, e = s < 0 ? -1 : h.indexOf(tail, s); if (e < 0) return;
    h = h.slice(0, s) + head + ' ' + e1Chip(pr) + h.slice(s + head.length, e) + ` · ${esc(e1MethShort(s4PlanCur(pr.id) || s4PlanLast(pr.id)))}</span>` + h.slice(e + tail.length);
  });
  // Finance Admins can't open NVQ Programmes, so "Edit plan" opens Finance's own plan editor (a new version, audited — G5.2);
  // while a proposal waits, the button goes to its review item instead
  if (typeof isFin === 'function' && isFin()) (STORE.chNewProgs || []).forEach(pr => {
    const T = e1T(pr.id), old = `<button class="btn btn-sm" data-go="a-programmes" data-id="${pr.id}" data-tab="plan">Edit plan</button>`;
    h = h.split(old).join(T && T.status === 'Pending' ? `<button class="btn btn-sm btn-primary" data-go="a-queue" data-id="${T.qid}">Review terms (${T.qid})</button>` : `<button class="btn btn-sm" data-act="s4PlanEdit" data-p="${pr.id}">Edit plan</button>`);
  });
  return h;
};
const _plansCardE1 = s4PlansCard;
s4PlansCard = function () {
  let h = _plansCardE1.apply(this, arguments);
  s4PlanProgs().forEach(pr => { const x = s4PlanCur(pr.id) || s4PlanLast(pr.id); if (!x || !x.meth) return; h = h.replace(new RegExp(`(<tr data-pid="${pr.id}">(?:<td[^>]*>[\\s\\S]*?</td>){3})<td>[^<]*</td>`), `$1<td>${esc(e1MethShort(x))}</td>`); });
  return h;
};
// Level 3 fee options: the plan's method is stated where the options are managed
const _r1FormE1 = r1Form;
r1Form = function (o, pid) { const h = _r1FormE1.apply(this, arguments), p = s4PlanCur(pid); if (!p || !p.meth) return h; return h.replace(/Deposit [^<]*? and \d+ monthly instalments come from this programme's payment plan\./, `Deposit ${money(s4EffDep(p), 'GBP')} and how learners pay (${esc(e1MethShort(p).toLowerCase())}) come from this programme's payment plan.`); };

/* ---------- Finance's plan editor (Finance → Payment Plans, Super Admin → Finance): the same "how learners pay" ---------- */
ACT.s4PlanEdit = el => {
  if (!s4FinGuard('change payment plans')) return;
  const tpl = el.dataset.t ? STORE.fin.templates.find(x => x.id === el.dataset.t) : null, fixed = el.dataset.p ? s4Pr(el.dataset.p) : null, ps = s4PlanProgs();
  const pick = fixed || ps.find(p => p.id === 'NV-L3'), cur = s4PlanCur(pick.id) || s4PlanLast(pick.id);
  const fee = cur ? cur.fee : NVQ_FEES[pick.title] || '', own = tpl ? (tpl.depG ? tpl.depG : null) : cur ? cur.deposit : null, n = tpl ? tpl.n : cur ? cur.inst : CH_INST_N, part = tpl ? tpl.partial === 'Yes' : cur ? cur.partial : true, meth = tpl ? 'instalments' : e1MethOf(cur);
  reasonDlg({ title: fixed ? 'Payment plan — ' + esc(fixed.title) : 'Payment plan from a template', ok: 'Save new version', label: 'Reason (required)', extra: `${tpl ? `<div class="note b-amber">${ic('info')}<div class="small">Starting point: legacy template "${esc(tpl.course)}" (${money(tpl.gbp, 'GBP')} × ${tpl.n}${tpl.depG ? ', deposit ' + money(tpl.depG, 'GBP') : ''}). Its instalment count, deposit and part-payment setting are filled in; the fee stays the programme's. Nothing is saved until you choose "Save new version".</div></div>` : ''}
    <div class="form-grid">${fixed ? '' : `<div class="field full"><label for="pp-p">Programme</label><select class="select" id="pp-p" data-onchange="s4PpProg">${ps.map(p => `<option value="${p.id}" ${p.id === pick.id ? 'selected' : ''}>${esc(p.title)}</option>`).join('')}</select></div>`}
    <div class="field"><label for="pp-f">Programme fee (GBP)</label><input class="input num" type="number" min="1" step="0.01" id="pp-f" value="${fee}" ${fee && !isSA() ? 'readonly' : ''}>${fee && !isSA() ? '<span class="hint">The programme\'s price — only the Super Administrator changes it.</span>' : ''}</div>
    <fieldset class="stack full e1-meth" style="border:0;padding:0"><legend class="lbl">How can learners pay?</legend>${Object.entries(E1_METH).map(([k, [l, hh]]) => `<label class="check e1-mopt"><input type="radio" name="pp-meth" value="${k}" ${meth === k ? 'checked' : ''} data-onchange="e1Meth" data-px="pe"><span><strong>${l}</strong><br><span class="small muted">${hh}</span></span></label>`).join('')}</fieldset>
    <div class="field e1-n-pe" ${meth === 'one-time' ? 'hidden' : ''}><label for="pp-n">Monthly instalments</label><input class="input num" type="number" min="${E1_N_MIN}" max="${E1_N_MAX}" id="pp-n" value="${meth === 'one-time' ? CH_INST_N : n}"><span class="hint">${E1_N_MIN} to ${E1_N_MAX}; the fee must split evenly into them, to the penny.</span></div>
    <fieldset class="stack full" style="border:0;padding:0"><legend class="lbl">Deposit</legend><label class="check"><input type="radio" name="pp-dm" value="default" ${own == null ? 'checked' : ''}> Use the default deposit (${money(S4().cfg.deposit, 'GBP')})</label><label class="check"><input type="radio" name="pp-dm" value="own" ${own != null ? 'checked' : ''}> Own deposit for this programme</label><div class="field"><label for="pp-dv">Own deposit (GBP)</label><input class="input num" type="number" min="0" step="0.01" id="pp-dv" value="${own != null ? own : ''}"></div></fieldset>
    <label class="check full"><input type="checkbox" id="pp-pa" ${part ? 'checked' : ''}> Part payments allowed (the balance can be paid in parts)</label>
    <p class="small full">First instalment: <strong>due at sign-up</strong> (CH-10 — can't be postponed here; Finance can adjust an enrolled learner's schedule).</p></div>`,
    onOk: r => {
      const pr = fixed || s4Pr($('#pp-p').value), dm = ($('input[name="pp-dm"]:checked') || {}).value, m = ($('input[name="pp-meth"]:checked') || {}).value || 'instalments', nS = $('#pp-n').value.trim();
      const f = { fee: +$('#pp-f').value, inst: m === 'one-time' ? 1 : +nS, deposit: dm === 'own' ? +$('#pp-dv').value : null, partial: $('#pp-pa').checked, meth: m };
      if (dm === 'own' && $('#pp-dv').value === '') { fieldErr('#pp-dv', 'Enter the deposit'); return false; }
      if (m !== 'one-time' && !(/^\d+$/.test(nS) && f.inst >= E1_N_MIN && f.inst <= E1_N_MAX)) { fieldErr('#pp-n', `Enter ${E1_N_MIN} to ${E1_N_MAX} monthly instalments`); return false; }
      const fee0 = (s4PlanCur(pr.id) || s4PlanLast(pr.id) || {}).fee || NVQ_FEES[pr.title]; if (fee0 && f.fee !== fee0 && !isSA()) { logA('Payment Plans', `${pr.title} (${pr.id})`, 'Blocked: change the programme fee', money(fee0, 'GBP'), money(f.fee, 'GBP'), 'Only the Super Administrator changes a programme\'s price'); fieldErr('#pp-f', 'Only the Super Administrator changes the programme\'s price'); return false; }
      const issue = s4PlanIssue(f); if (issue) { fieldErr(/fee is set|divide/.test(issue) ? '#pp-f' : /instalments/.test(issue) ? '#pp-n' : '#pp-dv', issue); return false; }
      const T = e1T(pr.id); if (T && T.status === 'Pending') { fieldErr('#pp-f', `A proposal for this programme is waiting for Finance review (${T.qid}) — decide it first`); return false; }
      const why3 = r1IsL3Pid(pr.id) ? e1TermsIssue(pr, { meth: m, inst: f.inst, dep: f.deposit }) : ''; if (why3 && f.fee === fee0) { fieldErr('#pp-n', why3); return false; }
      const p0 = s4PlanCur(pr.id); if (p0 && p0.fee === f.fee && p0.inst === f.inst && p0.deposit === f.deposit && p0.partial === f.partial && e1MethOf(p0) === m) { fieldErr('#pp-f', 'Nothing has changed'); return false; }
      s4PlanSave(pr, f, (tpl ? `From legacy template "${tpl.course}": ` : '') + r);
      if (T && pr.status === 'Draft') { Object.assign(T, { status: 'Approved', prop: { meth: m, inst: f.inst, dep: f.deposit }, approved: { by: ADMIN.me.name, at: now().toISOString(), how: isSA() ? SA_TAG : 'Saved by Finance', v: s4PlanLast(pr.id).v } }); e1Hist(pr, `Plan saved (v${s4PlanLast(pr.id).v}) — ${isSA() ? 'Super Administrator' : 'Finance'}`, e1TermsTxt(T.prop)); }
      render(); toast(`${pr.title}: plan version ${s4PlanLast(pr.id).v} saved — new sign-ups use it.`);
    } });
};

/* ---------- Learner sign-up: one payment, instalments, or the learner's choice ---------- */
let E1_N = null; // the instalment count while the payment step is drawn for the learner's current choice
// The count in force for this learner: 1 when they pay in full (a one-payment plan, or they chose it); otherwise their pinned count
function e1EffN(w, base) { if (E1_N != null) return E1_N; const t = w && w.signup && w.signup.plan, m = t ? e1MethOf(t) : 'instalments'; return m === 'one-time' || (m === 'both' && w.signup.payIn === 'full') ? 1 : base; }
const _instNE1 = chInstNOf; chInstNOf = w => e1EffN(w, _instNE1(w));
const _progViewE1 = s4ProgView;
s4ProgView = function (w, pr) { const v = _progViewE1.apply(this, arguments), n = e1EffN(w, v.plan.inst); return n === v.plan.inst ? v : Object.create(pr, { plan: { value: { ...v.plan, inst: n } }, price: { value: v.price } }); };
const e1PayMeth = w => (w && w.signup && w.signup.plan && !w.signup.plan.issue ? e1MethOf(w.signup.plan) : 'instalments');
function e1Choice(w, depOk) { const m = e1PayMeth(w); let c = ui('suOpt', depOk ? 'deposit' : m === 'one-time' ? 'full' : 'instalment'); if (c === 'deposit' && !depOk) c = 'instalment'; if (m === 'one-time' && c === 'instalment') c = 'full'; if (m === 'instalments' && c === 'full') c = 'instalment'; return c; }
const _stepPayE1 = chStepPay;
chStepPay = function (w) {
  const m = e1PayMeth(w); if (m === 'instalments' || chSponsored(w)) return _stepPayE1.apply(this, arguments);
  const b = chBatch(w.signup.batch), depOk = chDepositOk(b) && !w.signup.noDeposit, c = e1Choice(w, depOk), n = w.signup.plan.inst, fee = chFee(w), keep = ui('suOpt', undefined);
  setUi('suOpt', c); E1_N = c === 'full' ? 1 : n;
  let h; try { h = _stepPayE1.apply(this, arguments); } finally { E1_N = null; setUi('suOpt', keep); }
  const full = `<label class="check e1-full"><input type="radio" name="su-opt" value="full" ${c === 'full' ? 'checked' : ''} data-onchange="suOpt"><span><strong>Pay in full — ${money(fee, 'GBP')} now</strong><br><span class="small muted">One payment. Nothing more to pay for this programme.</span></span></label>`;
  const inst = m === 'both' ? `<label class="check"><input type="radio" name="su-opt" value="instalment" ${c === 'instalment' ? 'checked' : ''} data-onchange="suOpt"><span><strong>Instalments — ${n} monthly payments of ${money(fee / n, 'GBP')}</strong><br><span class="small muted">Pay the first instalment (${money(fee / n, 'GBP')}) now.</span></span></label>` : '';
  return h.replace(/<label class="check"><input type="radio" name="su-opt" value="instalment"[\s\S]*?<\/span><\/span><\/label>/, full + inst).replace('so you pay the first instalment.', m === 'one-time' ? 'so you pay the full fee now.' : 'so you pay in full or by instalments.');
};
const _suPayE1 = ACT.suPay;
ACT.suPay = el => {
  const w = W, m = e1PayMeth(w); if (!w || !w.signup || m === 'instalments') return _suPayE1(el);
  const depOk = chDepositOk(chBatch(w.signup.batch)) && !w.signup.noDeposit, c = e1Choice(w, depOk);
  w.signup.payIn = c; setUi('suOpt', c); return _suPayE1(el);
};
const _checkoutE1 = checkout;
checkout = function (o) { if (o && W && W.signup && !W.signup.done && W.signup.payIn === 'full' && /^NVQ instalment 1 of 1 — /.test(o.title || '')) o = { ...o, title: o.title.replace(/^NVQ instalment 1 of 1 — /, 'NVQ fee, paid in full — ') }; return _checkoutE1.call(this, o); };
const _ccE1 = chComplete;
chComplete = function (w, o) {
  const full = !!(w && w.signup && o && o.opt && o.opt !== 'deposit' && e1EffN(w, 0) === 1 && e1PayMeth(w) !== 'instalments'), n0 = ADMIN && ADMIN.audit ? ADMIN.audit.length : 0, r = _ccE1.apply(this, arguments);
  if (full && w.signup.done) { const pl = (w.plans || []).find(p => p.e === 'nvq'); if (pl) pl.plan = 'One-time payment'; if (w.signup.pay) w.signup.pay.full = true; const a = ADMIN && ADMIN.audit && ADMIN.audit.slice(0, ADMIN.audit.length - n0).find(x => x.action === 'Sign-up complete'); if (a) a.reason = String(a.reason || '').replace(/^First instalment/, 'Payment in full'); }
  return r;
};
const e1PaidTxt = (h, w) => (w && w.signup && w.signup.pay && w.signup.pay.full ? h.replace('First instalment', 'Paid in full') : h);
const _paySumE1 = chPaySummary; chPaySummary = function () { return e1PaidTxt(_paySumE1.apply(this, arguments), W); };
const _suSumE1 = chSignupSummary; chSignupSummary = function (w) { return e1PaidTxt(_suSumE1.apply(this, arguments), w); };
// The sign-up dialogs state the programme's methods (Level 3: on each fee option)
const _applyNvqE1 = ACT.applyNvq;
ACT.applyNvq = el => {
  const r = _applyNvqE1(el), c = CATALOGUE.find(x => x.id === (el && el.dataset && el.dataset.id)), pr = c && c.kind === 'nvq' ? s3Progs().find(p => p.title === c.title) : null, p = pr && s4PlanCur(pr.id);
  if (!MODAL || !p || !p.meth || p.meth === 'instalments') return r;
  MODAL.body = MODAL.body.replace(/or (\d+) monthly instalments((?: of £[\d,]+\.\d\d)?)((?:, the first one now)?)\./g, (x, n, amt, first) => p.meth === 'one-time' ? 'or the full fee in one payment now.' : `or the full fee in one payment now, or ${n} monthly instalments${amt}${first}.`);
  renderModal(); return r;
};

/* ---------- Store lifecycle ---------- */
const _isE1 = initStore; initStore = function () { STORE.e1 = null; const r = _isE1.apply(this, arguments); e1Store(); e1DurMigrate(); return r; };
const _baE1 = buildAdmin; buildAdmin = function () { const r = _baE1.apply(this, arguments); if (STORE.worlds) e1DurMigrate(); return r; };

/* ---------- Records ---------- */
UXC.push(['E1', 'NVQ programme duration and payment configuration (Oct 2026; Finance approval of new-programme terms confirmed 20 Oct 2026)', [
  'Duration: the New NVQ programme wizard, the programme Details step, the published Details and the Review show the duration as a whole number (1–999) and a unit (days, weeks, months or years), e.g. "12 months", "1 week". Durations entered before as free text are read as structured only when they are exactly "<number> <unit>"; anything else (e.g. "12–18 months") is kept as written, marked "Check duration", raises a Review warning and must be chosen again in Details — it is never converted. A changed duration is recorded on the "Details changed" audit entry.',
  'How learners pay: the programme payment plan (wizard Payment plan step; Finance → Payment Plans editor) offers One payment, Instalments, or Both (the learner chooses at sign-up). Instalments: 2–24 monthly, and every fee must split into them to the penny (the existing rule, PD-R1-03 — no adjusted final instalment). The method belongs to the plan: every Level 3 fee option uses it; the Payment summary lists each fee (each option, its mode) with how its learners pay and the deposit route. Deposit eligibility (28 days, CH-10), the seat hold, plan versions, pinned sign-up terms and existing learners\' payments are unchanged; a plan saved before E1 keeps offering instalments.',
  'Learner sign-up: one payment → "Pay in full" (or the deposit, when eligible); both → "Pay in full" or "Instalments" (or the deposit). Paying in full creates one paid row and a "One-time payment" plan; bank transfer and Finance confirmation work as before.',
  'Finance review (CONFIRMED 20 Oct 2026 for new programmes; routing details provisional): a programme created by an Academic Admin or System Admin starts with Draft payment terms. The creator proposes the terms in the Payment plan step (Save draft / Submit to Finance for review). Submitting raises one "Programme payment terms" item in the Approvals Queue (first approver Finance Admin, escalates to the Super Admin after 7 days) and one in-app notification to that Finance Admin. An Active Finance Admin approves (a new plan version is saved) or requests changes with a reason; the creator is told once. The item never escalates: after 7 days it is marked overdue (informational) and stays with Finance — the Super Administrator gains no authority over it. Finance → Payment Plans "Edit plan" opens Finance\'s own plan editor (Finance can\'t open NVQ Programmes), or the waiting review item. The terms and the fee are locked while Finance reviews; a fee changed after approval needs approval again. A Draft programme can\'t be published until its terms are approved; publishing stays with the Super Admin, System Admin and Academic Admin. Finance Admins and the Super Administrator still own the plan (G5.2): their own saves are approved terms; the Super Administrator\'s own terms need no approval (D8). Programmes and plans that existed before E1 stay in force.']]);
const _aIdxE1 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxE1(p) + `<section class="card idx-sec"><h2>Enhancement E1</h2><ul class="idx-list">${[
  chIdxLi('New programme → Payment plan step (terms and Finance review)', { act: 'aJump', t: 'a-programmes.NV-N1.plan' }, 'E1 — how learners pay, instalments, deposit; propose, review, approve.'),
  chIdxLi('New programme → Details (structured duration)', { act: 'aJump', t: 'a-programmes.NV-N1.details' }, 'E1 — a number and a unit: days, weeks, months or years.'),
  chIdxLi('Approvals Queue — programme payment terms', { act: 'aJump', t: 'a-queue' }, 'E1 — Finance approves the terms or requests changes (confirmed for new programmes).'),
  chIdxLi('Finance → Payment Plans — Edit plan (Finance\'s own editor)', { act: 'aJump', t: 'f-plans' }, 'E1 — Finance edits a new programme\'s plan without opening NVQ Programmes.')].join('')}</ul></section>`;

if (typeof ADMIN !== 'undefined' && ADMIN && STORE.worlds) { e1Store(); e1DurMigrate(); }
