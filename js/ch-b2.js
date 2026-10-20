/* ============================================================
   Client decisions — Batch 2: the NVQ sign-up flow and the offer letter (CH-07, CH-08, CH-09, CH-10, CH-11 learner side).
   Sign-up, in order: 1 Personal details + intake → 2 Documents (uploaded, not approved) → 3 Offer letter (typed signature +
   declaration) → 4 Payment (deposit only if the intake starts in 28+ days, else the first instalment; card or bank transfer)
   → 5 Start. Agency-sponsored learners (F4): details → documents → offer letter → start, with no payment step.
   The admission review runs after sign-up, while the learner learns. Loads after ch-b1.js.
   ============================================================ */
'use strict';

/* ---------- Constants and helpers ---------- */
const CH_DEP = 300, CH_INST_N = 6, CH_HOLD_DAYS = 28, CH_ACADEMY_MAIL = 'info@welfarehs.co.uk';
const CH_DECL = 'I hereby certify that the information and any documents provided are true, accurate and authentic. I have read and agree to the Terms & Conditions of Welfare Academy.';
const chW = v => STORE.worlds[v];
// S4-06 / S4-07: fee, deposit, instalments and hold days come from these (setup-s4a.js reads the programme's plan and the configuration)
let chProgFeeOf = w => NVQ_FEES[w.nvq.title] || 2400, chDepOf = w => CH_DEP, chInstNOf = w => CH_INST_N, chHoldDays = () => CH_HOLD_DAYS;
const chFee = w => chProgFeeOf(w);
const chBatch = code => ((typeof ADMIN !== 'undefined' && ADMIN && ADMIN.batches) || []).find(b => b.code === code);
const chBatchLbl = b => b ? `${b.label} — ${b.code}` : '—';
const chSponsored = w => !!w.flags.sponsored;
const chSteps = w => chSponsored(w) ? [['details', 'Personal details'], ['documents', 'Documents'], ['letter', 'Offer letter'], ['start', 'Start']] : [['details', 'Personal details'], ['documents', 'Documents'], ['letter', 'Offer letter'], ['payment', 'Payment'], ['start', 'Start']];
const chStepKey = w => (chSteps(w)[w.signup.step - 1] || [])[0];
// Intakes the learner can choose: open or planned batches of their programme that haven't started and have a place
const chIntakes = w => ADMIN.batches.filter(b => b.course === w.nvq.title && ['Open', 'Planned'].includes(b.status) && new Date(b.start) > now());
const chHasPlace = b => b && b.enrolled < b.cap;
// CH-10: a deposit is offered only when the batch starts in 28 days or more (fixed). The configurable hold (chHoldDays) is how long the seat is then held.
const chDepositOk = b => !!b && daysTo(b.start) >= CH_HOLD_DAYS;
const chMandUploaded = w => w.docs.filter(d => d.mand && d.status !== 'Pending');
const chMandMissing = w => w.docs.filter(d => d.mand && d.status === 'Pending');
const chFullName = w => (w.me.first + ' ' + w.me.last).trim();
const chNorm = s => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
const chIp = w => regionOf(w.me.country) === 'UAE' ? '94.204.18.44' : '86.12.44.201';
// Used by batch cancellation (admin-b.js, academic.js): learner v holds a seat on this intake once signed up
const chSignedUpOn = (code, v) => { const w = STORE.worlds[v]; return !!(w && w.signup && w.signup.done && w.signup.batch === code); };

/* ---------- CH-08 Offer letters: one per NVQ course, versioned ---------- */
const CH_LETTER_TEXT = [
  'We are pleased to offer you a place on the {{programme}} with Welfare Academy.',
  'Your place is confirmed when you sign this letter and pay your deposit or first instalment. You can start learning straight away — the Academy reviews your application and documents while you learn, usually within 7 days.',
  'Your fees, your payment plan and the Academy\'s Terms & Conditions are in your learner portal. If anything in this letter is not right, please contact the Academy before you sign.',
];
function chLetterSeed() {
  const L = {};
  [['NV-L2', 'Level 2 Diploma in Care (England)'], ['NV-L3', 'Level 3 Diploma in Adult Care (England)'], ['NV-L4', 'Level 4 Diploma in Adult Care (England)'], ['NV-L5', 'Level 5 Diploma in Leadership and Management for Adult Care']].forEach(([id, t]) => {
    L[id] = [{ v: 1, file: `${id} offer letter v1.docx`, at: D(-120, '10:00'), by: 'Rachel Hughes', note: 'First version (client template)', programme: t, text: CH_LETTER_TEXT.slice() }];
  });
  return L;
}
const chProgOf = w => (ADMIN.programmes || []).find(p => p.title === w.nvq.title) || { id: 'NV-L3', title: w.nvq.title };
const chLetters = id => (STORE.chLetters = STORE.chLetters || chLetterSeed())[id] || [];
const chLetterCur = id => { const l = chLetters(id); return l[l.length - 1]; };
// The version the learner signs: the one current when they started their sign-up (a new version is for new applicants)
const chLetterFor = w => { const id = chProgOf(w).id, l = chLetters(id); return l.find(x => x.v === (w.signup.letterV || (w.signup.letterV = (chLetterCur(id) || {}).v))) || chLetterCur(id); };
const chMerge = (s, name, sid) => esc(s).replace(/\{\{full_name\}\}/g, name).replace(/\{\{student_id\}\}/g, sid);
function chLetterHtml(letter, { name, sid, raw } = {}) {
  if (!letter) return '<p class="small muted">No offer letter has been uploaded for this course.</p>';
  const f = k => raw ? `<span class="ch-merge">{{${k}}}</span>` : `<strong>${esc(k === 'full_name' ? name : sid)}</strong>`;
  const para = s => raw ? esc(s).replace(/\{\{programme\}\}/g, esc(letter.programme)) : chMerge(s.replace(/\{\{programme\}\}/g, letter.programme), esc(name), esc(sid));
  return `<article class="ch-letter" aria-label="Offer letter"><div class="ch-wm" aria-hidden="true">Welfare Academy</div>
    <header class="ch-lh"><strong>Welfare Academy</strong><span class="xs muted">Offer of a place · letter version ${letter.v}</span></header>
    <p class="small">Student Name: ${f('full_name')}<br>Student ID: ${f('student_id')}<br>Programme: ${esc(letter.programme)}</p>
    <p>Dear ${f('full_name')},</p>${letter.text.map(t => `<p>${para(t)}</p>`).join('')}
    <p>Yours sincerely,<br><strong>Jenson Thomas</strong><br><span class="small">Admissions, Welfare Academy</span></p></article>`;
}
const chSigBlock = s => `<div class="ch-sigblock"><strong>Signed electronically</strong> by ${esc(s.name)} · ${fdt(s.at)} · IP ${esc(s.ip)} (mock) · offer letter version ${s.v}</div>`;
ACT.chSignedPdf = el => {
  const w = chW(el.dataset.v), s = w.signup.sig; if (!s) return;
  const L = chLetters(chProgOf(w).id).find(x => x.v === s.v) || chLetterFor(w);
  openModal({ title: 'Signed offer letter', sub: `${esc(chFullName(w))} · ${w.me.id} · PDF (mock)`, size: 'lg', body: `<div class="ch-pdf">${chLetterHtml(L, { name: chFullName(w), sid: w.me.id })}${chSigBlock(s)}</div><p class="xs muted">${esc(chSignedFile(w))} · the letter, the filled-in fields and the signature block.</p>`, actions: [{ label: 'Close' }, { label: `${ic('download', 15)} Download PDF`, cls: 'btn-primary', fn: () => { toast(`${chSignedFile(w)} downloaded (mock).`); } }] });
};
const chSignedFile = w => `Offer letter — signed — ${w.me.id}.pdf`;

/* ---------- Emails: the learner's demo inbox and the Academy inbox (demo) ---------- */
function chMailSigned(w) {
  const s = w.signup.sig, at = s.at, n = chFullName(w), att = `<p class="small">${ic('clip', 14)} <span class="mono">${esc(chSignedFile(w))}</span></p>`;
  STORE.agy.lmails.unshift({ id: 'LM-OL' + w.me.id.slice(-5) + Date.now().toString(36), kind: 'offer', name: n, email: w.me.email, agency: 'Illumin Academy', by: 'Illumin Academy', sent: at, subj: 'Your signed offer letter — ' + w.nvq.title, html: `<p>Hello ${esc(w.me.first)},</p><p>Thank you for signing your offer letter for the ${esc(w.nvq.title)}. Your signed copy is attached — keep it for your records.</p>${att}` });
  STORE.agy.lmails.unshift({ id: 'LM-OA' + w.me.id.slice(-5) + Date.now().toString(36), kind: 'offer', academy: true, name: 'Welfare Academy admissions', email: CH_ACADEMY_MAIL, agency: 'Illumin Academy', by: 'Illumin Academy (system)', sent: at, subj: `Offer letter signed — ${n} (${w.me.id})`, html: `<p>${esc(n)} (${w.me.id}) signed the offer letter for the ${esc(w.nvq.title)} on ${fdt(at)} (letter version ${s.v}, IP ${esc(s.ip)}).</p><p>The signed copy is attached.</p>${att}` });
}
const _liCh = learnerInbox;
learnerInbox = function (p) {
  p = p || {}; const all = STORE.agy.lmails, sel = p.id && all.find(m => m.id === p.id);
  const academy = p.tab === 'academy' || !!(sel && sel.academy);
  STORE.agy.lmails = all.filter(m => !!m.academy === academy);
  try {
    const h = _liCh(p); if (!academy) return h;
    return h.replace('<b>Learner inbox</b><span>Demo — emails sent by the prototype (set-password links, sign-in and verification codes)</span>', `<b>Academy inbox</b><span>Demo — emails the prototype sends to the Academy (${CH_ACADEMY_MAIL})</span>`)
      .replace('<h1>Learner inbox (demo)</h1><p class="sub">Open a message and use its button to try the first-time set-password screen as that learner.</p>', `<h1>Academy inbox (demo)</h1><p class="sub">Copies of signed offer letters, sent to ${CH_ACADEMY_MAIL}.</p>`);
  } finally { STORE.agy.lmails = all; }
};
const _rshCh = roleSwitchHtml;
roleSwitchHtml = function () {
  const ac = S.route === 'm-inbox' && (S.params || {}).tab === 'academy';
  return _rshCh().replace(`<button aria-pressed="${S.route === 'm-inbox'}" data-act="switchRole" data-r="linbox">Learner inbox (demo)</button>`, `<button aria-pressed="${S.route === 'm-inbox' && !ac}" data-act="switchRole" data-r="linbox">Learner inbox (demo)</button><button aria-pressed="${ac}" data-act="switchRole" data-r="ainbox">Academy inbox (demo)</button>`);
};
const _srCh = ACT.switchRole;
ACT.switchRole = el => { if (el.dataset.r === 'ainbox') { go('m-inbox', { tab: 'academy' }); return; } if (el.dataset.r === 'linbox') { go('m-inbox'); return; } return _srCh(el); };

/* ---------- Learner: the sign-up stepper (Admission & Documents until the sign-up is done) ---------- */
const _admCh = SCREENS.admission;
SCREENS.admission = p => {
  const w = W; if (!w.signup || w.signup.done || w.admission.status === 'Withdrawn') return _admCh(p) + (w.signup && w.signup.done ? chSignupSummary(w, 'learner') : '');
  const st = chSteps(w), cur = w.signup.step;
  const head = pageHead('Admission & Documents', 'Sign up for the ' + esc(w.nvq.title), `<button class="btn" data-act="withdrawApp">Withdraw application</button>`);
  const stepper = `<section class="card"><div class="row-b"><h2>Your sign-up</h2>${chip('Sign-up in progress', 'amber')}</div>
    <ol class="stepper ch-su" aria-label="Sign-up steps">${st.map(([k, l], i) => `<li class="step ${i + 1 < cur ? 'done' : i + 1 === cur ? 'cur' : ''}" ${i + 1 === cur ? 'aria-current="step"' : ''}><span class="dot">${i + 1 < cur ? '✓' : i + 1}</span><span class="s-l">${l}</span><span class="s-d">${i + 1 < cur ? 'Done' : i + 1 === cur ? 'Now' : 'Not yet'}</span></li>`).join('')}</ol>
    <p class="xs muted">Do the steps in order. ${chSponsored(w) ? `Your fees are covered by ${esc(w.me.sponsor)}, so there is no payment step.` : 'You start learning as soon as you\'ve paid.'} The Academy reviews your application while you learn.</p></section>`;
  const body = { details: chStepDetails, documents: chStepDocs, letter: chStepLetter, payment: chStepPay, start: chStepStart }[chStepKey(w)](w);
  return head + edgeNotices('admission') + stepper + body;
};
const chNav = (w, next) => `<div class="row ch-nav">${w.signup.step > 1 ? '<button class="btn" data-act="suBack">Back</button>' : ''}${next}</div>`;
function chStepDetails(w) {
  const me = w.me, d = w.signup.details || {}, ins = chIntakes(w), open = ins.filter(chHasPlace), pick = ui('suBatch', w.signup.batch);
  return `<section class="card"><h2>1. Personal details</h2><p class="small muted">Check your details. Your name, email and country come from your account.</p>
    <div class="form-grid"><div class="field"><label for="su-n">Full name</label><input class="input" id="su-n" value="${esc(chFullName(w))}" readonly></div><div class="field"><label for="su-e">Email</label><input class="input" id="su-e" value="${esc(me.email)}" readonly></div>
    <div class="field"><label for="su-c">Country</label><input class="input" id="su-c" value="${esc(me.country)} (set at registration)" readonly></div><div class="field"><label for="su-dob">Date of birth</label><input class="input" id="su-dob" value="${esc(d.dob || me.dob)}"></div>
    <div class="field full"><label for="su-ad">Address</label><input class="input" id="su-ad" value="${esc(d.address || me.address)}"></div><div class="field"><label for="su-pc">Postcode</label><input class="input" id="su-pc" value="${esc(d.postcode || me.postcode)}"></div></div>
    <fieldset class="stack ch-intakes"><legend class="lbl">Choose your intake</legend>${open.length ? open.map(b => { const n = daysTo(b.start); return `<label class="check ch-intake"><input type="radio" name="su-batch" value="${b.code}" ${pick === b.code ? 'checked' : ''} data-onchange="suBatch"><span><strong>${esc(b.label)}</strong> <span class="mono xs">${b.code}</span><br><span class="small">Starts ${fd(b.start)} (in ${n} days) · ${esc(b.mode)} · ${b.cap - b.enrolled} ${b.cap - b.enrolled === 1 ? 'place' : 'places'} left</span><br><span class="xs muted">${chDepositOk(b) ? 'A deposit can hold your seat.' : 'Starts in under 28 days — you pay the first instalment, no deposit.'}</span></span></label>`; }).join('') : '<p class="small">No intake has a place right now. Message the Academy and we\'ll tell you when the next one opens.</p>'}
    <p class="xs muted">Only intakes with a place are listed (P-30: the intake is chosen at sign-up so a deposit can hold a seat).</p></fieldset>
    ${chNav(w, `<button class="btn btn-primary" data-act="suNext">Save and continue</button>`)}</section>`;
}
function chStepDocs(w) {
  const mand = w.docs.filter(d => d.mand), up = chMandUploaded(w), miss = chMandMissing(w), why = miss.length ? `Upload ${plural(miss.length, 'more mandatory document')} first: ${miss.map(d => d.name).join(', ')}.` : '';
  return `<section class="card"><div class="row-b"><h2>2. Documents</h2><span class="strong num">${up.length} of ${mand.length} mandatory documents uploaded</span></div>${bar(Math.round(up.length / mand.length * 100), 'Mandatory documents uploaded')}
    <p class="small">Upload every mandatory document. You can continue as soon as they're all uploaded — the Academy doesn't need to approve them first. A reviewer may ask you to replace one later.</p>
    ${chNav(w, `<button class="btn btn-primary" data-act="suNext" ${miss.length ? `disabled title="${esc(why)}"` : ''}>Continue</button>`)}${why ? `<p class="small muted ch-why">${esc(why)}</p>` : ''}</section>
    <section class="stack"><h2>Required documents</h2><div class="grid">${w.docs.map(d => docCard(d, false)).join('')}</div></section>`;
}
const chSigWhy = w => { const sig = ui('suSig', ''), ok1 = chNorm(sig) === chNorm(chFullName(w)), ok2 = !!ui('suDecl', false); return !sig.trim() ? 'Type your full name and tick the declaration to continue.' : !ok1 ? `Type your full name exactly as registered: ${chFullName(w)}.` : !ok2 ? 'Tick the declaration to continue.' : ''; };
function chStepLetter(w) {
  const L = chLetterFor(w), why = chSigWhy(w);
  return `<section class="card"><h2>3. Offer letter</h2><p class="small muted">Read your offer letter. To accept it, type your full name as your digital signature and tick the declaration.</p>
    ${chLetterHtml(L, { name: chFullName(w), sid: w.me.id })}
    <div class="field"><label for="su-sig">Digital signature — type your full name</label><input class="input ch-sig" id="su-sig" autocomplete="off" value="${esc(ui('suSig', ''))}" data-oninput="suSig"><span class="hint">As registered: ${esc(chFullName(w))}</span></div>
    <label class="check small"><input type="checkbox" id="su-decl" ${ui('suDecl', false) ? 'checked' : ''} data-onchange="suDecl"> <span>${esc(CH_DECL)}</span></label>
    ${chNav(w, `<button class="btn btn-primary" id="su-sign" data-act="suSign" ${why ? `disabled title="${esc(why)}"` : ''}>Sign and continue</button>`)}<p class="small muted ch-why" id="su-why" ${why ? '' : 'hidden'}>${esc(why)}</p></section>`;
}
const chRefOf = (w, opt) => `IA-${w.me.id.slice(-5)}-${opt === 'deposit' ? 'DEP' : 'INS1'}`;
function chStepPay(w) {
  const b = chBatch(w.signup.batch), fee = chFee(w), depOk = chDepositOk(b), inst = e1First(fee, chInstNOf(w));
  if (!chHasPlace(b)) return `<section class="card"><h2>4. Payment</h2><div class="note b-amber" role="alert">${ic('alert')}<div><strong>${esc(b ? b.label : 'Your intake')} is now full.</strong> Its last place went before you paid. Choose another intake — your documents and signed offer letter are kept.<div class="b-act"><button class="btn btn-sm btn-primary" data-act="suGo" data-s="1">Choose another intake</button></div></div></div>${chNav(w, '')}</section>`;
  let opt = ui('suOpt', depOk ? 'deposit' : 'instalment'); if (opt === 'deposit' && !depOk) opt = 'instalment';
  const method = ui('suMethod', 'card');
  const amount = opt === 'deposit' ? chDepOf(w) : inst;
  return `<section class="card"><h2>4. Payment</h2><dl class="kv"><dt>Intake</dt><dd>${esc(chBatchLbl(b))} · starts ${fd(b.start)} (in ${daysTo(b.start)} days)</dd><dt>Programme fee</dt><dd class="num">${money(fee, 'GBP')}</dd></dl>
    <fieldset class="stack"><legend class="lbl">How do you want to pay?</legend>
    ${depOk ? `<label class="check"><input type="radio" name="su-opt" value="deposit" ${opt === 'deposit' ? 'checked' : ''} data-onchange="suOpt"><span><strong>Deposit (holds your seat) — ${money(chDepOf(w), 'GBP')} now</strong><br><span class="small muted">Then pay the ${money(fee - chDepOf(w), 'GBP')} balance within ${chHoldDays()} days, in one go or in parts.</span></span></label>` : `<div class="note b-grey ch-nodep">${ic('info')}<div class="small"><strong>No deposit for this intake.</strong> ${esc(b.label)} starts in ${daysTo(b.start)} days. A deposit can only hold a seat when the intake starts in ${CH_HOLD_DAYS} days or more, so you pay the first instalment.</div></div>`}
    <label class="check"><input type="radio" name="su-opt" value="instalment" ${opt === 'instalment' ? 'checked' : ''} data-onchange="suOpt"><span><strong>Instalments — ${chInstNOf(w)} monthly payments${e1InstTxt(fee, chInstNOf(w))}</strong><br><span class="small muted">Pay the first instalment (${money(inst, 'GBP')}) now.</span></span></label></fieldset>
    <fieldset class="stack"><legend class="lbl">Payment method</legend>
    <label class="check"><input type="radio" name="su-m" value="card" ${method === 'card' ? 'checked' : ''} data-onchange="suMethod"><span><strong>Card</strong> <span class="small muted">— pay now on our secure Stripe page</span></span></label>
    <label class="check"><input type="radio" name="su-m" value="bank" ${method === 'bank' ? 'checked' : ''} data-onchange="suMethod"><span><strong>Bank transfer</strong> <span class="small muted">— you start now; Finance confirms your payment</span></span></label></fieldset>
    ${method === 'bank' ? `<div class="note b-blue">${ic('info')}<div class="small"><strong>Pay ${money(amount, 'GBP')} by bank transfer.</strong><br>Pay to: ${chBankHtml() /* CH-35 */}<br>Reference: <span class="mono">${chRefOf(w, opt)}</span><br>After you continue, your payment shows as <strong>Awaiting confirmation by Finance</strong>. You can start learning straight away.</div></div>` : ''}
    ${chNav(w, method === 'card' ? `<button class="btn btn-primary" data-act="suPay">Pay ${money(amount, 'GBP')} by card</button>` : `<button class="btn btn-primary" data-act="suPay">I've made the transfer — start now</button>`)}</section>`;
}
function chStepStart(w) { // agency-sponsored learners only (paying learners start from the payment step)
  return `<section class="card"><h2>4. Start</h2><p>Your fees are covered by ${esc(w.me.sponsor)} — there's nothing to pay. Start learning now; the Academy reviews your application while you learn.</p>${chNav(w, '<button class="btn btn-primary" data-act="suStart">Start learning</button>')}</section>`;
}

/* ---------- Step actions ---------- */
INP.suBatch = el => { setUi('suBatch', el.value); };
INP.suOpt = el => { setUi('suOpt', el.value); render(); };
INP.suMethod = el => { setUi('suMethod', el.value); render(); };
const chSigRefresh = () => { const why = chSigWhy(W), b = $('#su-sign'), p = $('#su-why'); if (b) { b.disabled = !!why; if (why) b.title = why; else b.removeAttribute('title'); } if (p) { p.textContent = why; p.hidden = !why; } };
INP.suSig = el => { setUi('suSig', el.value); chSigRefresh(); };
INP.suDecl = el => { setUi('suDecl', el.checked); chSigRefresh(); };
ACT.suBack = () => { const s = W.signup; if (s.step > 1) s.step--; render(); };
ACT.suGo = el => { const n = +el.dataset.s; if (n < W.signup.step) { W.signup.step = n; render(); } };
ACT.suNext = () => {
  const w = W, s = w.signup, k = chStepKey(w);
  if (k === 'details') {
    const code = ui('suBatch', s.batch), b = chBatch(code), dob = $('#su-dob').value.trim(), ad = $('#su-ad').value.trim();
    if (!dob) return fieldErr('#su-dob', 'Enter your date of birth');
    if (!ad) return fieldErr('#su-ad', 'Enter your address');
    if (!b || !chHasPlace(b)) { toast('Choose an intake with a place.', 'err'); return; }
    s.details = { dob, address: ad, postcode: $('#su-pc').value.trim() }; s.batch = code;
    w.nvq.batch = w.admission.batch = chBatchLbl(b); w.nvq.batchStart = w.admission.batchStart = w.nvq.start = b.start; w.nvq.end = w.nvq.batchEnd = b.end;
    w.admission.history.push(['Details and intake confirmed', now().toISOString()]);
  }
  if (k === 'documents' && chMandMissing(w).length) { toast('Upload every mandatory document first.', 'err'); return; }
  s.step++; window.scrollTo && window.scrollTo(0, 0); render();
};
ACT.suSign = () => {
  const w = W, why = chSigWhy(w); if (why) { toast(why, 'err'); return; }
  const L = chLetterFor(w), at = now().toISOString();
  w.signup.sig = { name: ui('suSig', '').trim().replace(/\s+/g, ' '), at, ip: chIp(w), v: L.v };
  w.admission.history.push(['Offer letter signed', at]);
  chMailSigned(w);
  logA('Admissions', `${chFullName(w)} (${w.me.id})`, 'Offer letter signed', '—', `Version ${L.v} · ${fdt(at)} · IP ${w.signup.sig.ip}`, 'Typed signature + declaration');
  setUi('suSig', ''); setUi('suDecl', false); w.signup.step++; render();
  toast('Offer letter signed. A copy is in your inbox and with the Academy.');
};
ACT.suPay = () => {
  const w = W, b = chBatch(w.signup.batch), depOk = chDepositOk(b), opt0 = ui('suOpt', depOk ? 'deposit' : 'instalment'), opt = opt0 === 'deposit' && !depOk ? 'instalment' : opt0, method = ui('suMethod', 'card');
  if (!chHasPlace(b)) { render(); return; }
  const amount = opt === 'deposit' ? chDepOf(w) : e1First(chFee(w), chInstNOf(w));
  if (method === 'bank') { chComplete(w, { opt, method, amount, ref: chRefOf(w, opt) }); return; }
  checkout({ title: opt === 'deposit' ? 'NVQ deposit — ' + w.nvq.title : `NVQ instalment 1 of ${chInstNOf(w)} — ` + w.nvq.title, amount, onSuccess: (paid, ref) => chComplete(w, { opt, method, amount, ref }, true) });
};
ACT.suStart = () => chComplete(W, { opt: null, method: null });

/* ---------- Completing the sign-up (CH-07 step 5, CH-11: the learner starts straight away, card or bank transfer) ---------- */
function chComplete(w, { opt, method, amount, ref }, fromCheckout, quiet) {
  const s = w.signup, b = chBatch(s.batch), at = quiet || now().toISOString(), fee = chFee(w), bank = method === 'bank';
  const status = bank ? 'Awaiting confirmation by Finance' : 'Paid', holdDays = chHoldDays(), hold = new Date(new Date(at).getTime() + holdDays * DAY).toISOString(), dep = chDepOf(w), n = chInstNOf(w);
  s.pay = opt ? { opt, method, amount, at, status, ref } : null; s.done = true; s.step = chSteps(w).length;
  if (b) b.enrolled++;
  Object.assign(w.nvq, { batch: chBatchLbl(b), batchStart: b ? b.start : w.nvq.batchStart, start: b ? b.start : w.nvq.start, end: b ? b.end : w.nvq.end, status: 'Active', enrolled: at });
  w.flags.admitted = true; if (!w.enrolments.includes(w.nvq)) w.enrolments.unshift(w.nvq);
  const ad = w.admission; Object.assign(ad, { status: 'Awaiting review', batch: w.nvq.batch, batchStart: w.nvq.batchStart }); ad.history.push(['Sign-up complete', at]);
  if (opt === 'deposit') Object.assign(ad.deposit, { min: dep, paid: !bank, paidAt: at, holdUntil: hold, holdDays, balance: fee - dep, awaiting: bank });
  if (opt) {
    const sch = opt === 'deposit' ? null : e1Sched(fee, n); // E1 rounding: the shared schedule, totalling the fee exactly
    const rows = opt === 'deposit' ? [{ n: 1, amount: fee - dep, due: hold, status: 'Pending', paid: 0 }]
      : sch.map((amt, i) => ({ n: i + 1, amount: amt, due: new Date(new Date(at).getTime() + i * 30 * DAY).toISOString(), status: i ? 'Pending' : status, paid: i || bank ? 0 : amt, receipt: i || bank ? undefined : 'RCP-' + (27000 + +w.me.id.slice(-3)) }));
    w.plans = w.plans.filter(p => p.e !== 'nvq');
    w.plans.unshift({ e: 'nvq', title: w.nvq.title, plan: opt === 'deposit' ? 'Deposit and balance' : 'Instalments', total: fee, partial: true, cur: 'GBP', deposit: opt === 'deposit' ? { amount: dep, status, paidAt: at, hold } : null, rows });
    if (bank) (STORE.chBank = STORE.chBank || []).push({ v: w.v, name: chFullName(w), lid: w.me.id, ref, amount, at, opt, status: 'Awaiting confirmation' });
  }
  if (quiet) return;
  notifyLearner(w.v, 'Admission', 'Sign-up complete — start learning', `Your programme is open. The Academy reviews your application while you learn, usually within 7 days.${bank ? ' Your bank transfer shows as awaiting confirmation by Finance.' : ''}`, 'admission');
  if (typeof acaNotify === 'function') acaNotify('New sign-up to review', `${chFullName(w)} · ${w.nvq.title} · ${b ? b.code : ''}`, 'a-admissions.APP-' + w.v);
  logA('Admissions', `${chFullName(w)} (${w.me.id})`, 'Sign-up complete', 'Sign-up in progress', 'Awaiting review · ' + (b ? b.code : ''), opt ? `${opt === 'deposit' ? 'Deposit' : 'First instalment'} ${money(amount, 'GBP')} by ${bank ? 'bank transfer (awaiting confirmation)' : 'card'}` : 'Agency-sponsored (no payment)');
  const msg = `You're in — your programme is open.${bank ? ' Your bank transfer is awaiting confirmation by Finance.' : ''}`;
  if (fromCheckout) { closeModal(); }
  go('dashboard'); toast(msg);
}

/* ---------- After sign-up: what the learner (and the admin) see ---------- */
function chPaySummary() { // learner's payment card when no deposit was paid by card (instalments, or a bank transfer awaiting confirmation)
  const p = W.signup && W.signup.pay; if (!p) return '';
  return `<section class="card"><div class="row-b"><h2>Payment</h2>${chip(p.status, p.status === 'Paid' ? 'green' : 'amber')}</div><dl class="kv"><dt>${p.opt === 'deposit' ? 'Deposit' : 'First instalment'}</dt><dd>${money(p.amount, 'GBP')} by ${p.method === 'bank' ? 'bank transfer' : 'card'} on ${fd(p.at)}</dd><dt>Reference</dt><dd class="mono">${esc(p.ref)}</dd></dl><button class="btn btn-sm" data-go="payments">Go to Payments</button></section>`;
}
function chSignupSummary(w, who) {
  const s = w.signup; if (!s) return '';
  const steps = chSteps(w), b = chBatch(s.batch);
  const sig = s.sig ? `${esc(s.sig.name)} · ${fdt(s.sig.at)} · IP ${esc(s.sig.ip)} · version ${s.sig.v} <button class="linklike small" data-act="chSignedPdf" data-v="${w.v}">View signed PDF</button>` : 'Not signed yet';
  const pay = chSponsored(w) ? `Covered by ${esc(w.me.sponsor)} — no payment step` : s.pay ? `${s.pay.opt === 'deposit' ? 'Deposit' : 'First instalment'} ${money(s.pay.amount, 'GBP')} by ${s.pay.method === 'bank' ? 'bank transfer' : 'card'} · ${chip(s.pay.status, s.pay.status === 'Paid' ? 'green' : 'amber')}` : 'Not paid yet';
  return `<section class="card ch-sus"><div class="row-b"><h2>Sign-up</h2>${s.done ? chip('Complete', 'green') : chip(`Step ${s.step} of ${steps.length}: ${steps[s.step - 1][1]}`, 'amber')}</div>
    <dl class="kv"><dt>Intake</dt><dd>${esc(chBatchLbl(b))}${b ? ` · starts ${fd(b.start)}` : ''}</dd><dt>Offer letter</dt><dd>${sig}</dd><dt>Payment</dt><dd>${pay}</dd></dl>
    ${who === 'admin' && !s.done ? '<p class="small muted">The application is reviewed once the sign-up is complete (documents, offer letter and payment).</p>' : ''}</section>`;
}
const _appDetailCh = appDetail;
appDetail = function (id) {
  let h = _appDetailCh(id); const a = allApplications().find(x => x.id === id); if (!a || !a.v) return h;
  const w = chW(a.v), card = chSignupSummary(w, 'admin'), k = h.indexOf('<section class="card"><div class="row-b"><h2>Checklist</h2>');
  return k < 0 ? h + card : h.slice(0, k) + card + h.slice(k);
};
const _lAdmCh = lAdm;
lAdm = function (L, w) { return w && w.signup ? chSignupSummary(w, 'admin') + _lAdmCh(L, w) : _lAdmCh(L, w); };
// Plan card label for a deposit plan: the balance is due within the seat-hold period
const _planCardCh = planCard;
planCard = function (pl) { const h = _planCardCh(pl); return pl.plan === 'Deposit and balance' && pl.rows[0] ? h.replace('One-time payment', `Deposit, then the balance by ${fd(pl.rows[0].due)} (seat-hold period)`) : h; };

/* ---------- Content lock: sign-up in progress, withdrawn, or seat released ---------- */
const _lockCh = lockFor;
lockFor = function (r) {
  const f = W.flags;
  if (f.nvq && W.signup && W.admission && !B_OPEN.includes(r) && !(typeof DOC_ROUTES !== 'undefined' && DOC_ROUTES.includes(r))) {
    if (W.admission.status === 'Withdrawn' && !W.signup.done) return { title: 'Application withdrawn', msg: 'You withdrew your sign-up, so there is no programme content to open. To study with us again, sign up from Browse Courses.', cta: ['browse', 'Browse Courses'] };
    if (W.admission.deposit && W.admission.deposit.released) return { title: 'Your seat was released', msg: 'Your seat hold ended before the balance was paid, so your place on this intake has gone. Message the Academy and we\'ll help you join a later one.', cta: ['messages', 'Message the Academy'] };
  }
  return _lockCh(r);
};

/* ---------- Dashboard: one "Continue your sign-up" item ---------- */
function chSignupItem() {
  const w = W, steps = chSteps(w), [k, l] = steps[w.signup.step - 1], miss = chMandMissing(w);
  const d = k === 'documents' && miss.length ? `Upload ${plural(miss.length, 'more mandatory document')}: ${miss.map(x => x.name).join(', ')}.` : k === 'letter' ? 'Read and sign your offer letter.' : k === 'payment' ? 'Pay your deposit or first instalment — you start straight away.' : k === 'details' ? 'Check your details and choose your intake.' : 'Start learning.';
  return { sev: 'blue', t: `Finish your sign-up — step ${w.signup.step} of ${steps.length}: ${l}`, d: esc(d), btn: 'Continue sign-up', go: 'admission' };
}

/* ---------- Demo states (edges) on Priya Raman: the review states come after a completed sign-up ---------- */
function chQuickSignup(w, { opt = 'deposit', method = 'card', at = D(-9, '18:20') } = {}) { // demo only: a completed sign-up with fixed dates
  const s = w.signup; if (!s || s.done) return;
  w.docs.filter(d => d.mand && d.status === 'Pending').forEach(d => { d.status = 'Submitted'; d.file = d.file || (d.id === 'd6' ? 'cv_priya_raman.pdf' : 'document.pdf'); d.uploaded = d.uploaded || D(-10, '20:10'); d.versions.unshift([d.file, d.uploaded, 'Awaiting review']); });
  const L = chLetterFor(w); s.sig = { name: chFullName(w), at: D(-10, '20:30'), ip: chIp(w), v: L.v };
  w.admission.history.push(['Offer letter signed', s.sig.at]);
  chComplete(w, { opt, method, amount: opt === 'deposit' ? chDepOf(w) : e1First(chFee(w), chInstNOf(w)), ref: method === 'bank' ? chRefOf(w, opt) : 'TXN-70888' }, false, at);
}
const _applyEdgeCh = applyEdge;
applyEdge = function () {
  _applyEdgeCh.apply(this, arguments);
  const w = W, e = S.edge; if (!w || !w.signup || w.signup.done || !['underreview', 'rejected', 'seatReleased'].includes(e)) return;
  const edgeStatus = w.admission.status; // set by the edge: Under Review, Rejected, or Approved (seat released)
  chQuickSignup(w, { at: e === 'seatReleased' ? D(-36, '18:20') : D(-9, '18:20') });
  w.admission.status = edgeStatus; w.admission.history.sort((a, b) => new Date(a[1]) - new Date(b[1]));
  if (e === 'seatReleased') { Object.assign(w.admission.deposit, { paid: true, paidAt: D(-36), holdUntil: D(-8), released: true }); w.flags.admitted = false; w.enrolments = w.enrolments.filter(x => x !== w.nvq); w.nvq.status = 'Seat released'; }
};

/* ---------- Agency-sponsored sign-up (F4): no payment step — demo on Grace Mensah (variant D) ---------- */
ACT.chSponsoredSignup = () => {
  S.edge = 'none'; setVariant('D'); const w = W, code = (chIntakes(w).find(chHasPlace) || {}).code || w.signup.batch;
  Object.assign(w.signup, { step: 3, done: false, batch: code, sig: null, pay: null });
  w.flags.admitted = false; w.enrolments = w.enrolments.filter(x => x !== w.nvq);
  const b = chBatch(code); Object.assign(w.admission, { status: 'Sign-up in progress', batch: chBatchLbl(b), batchStart: b ? b.start : w.admission.batchStart, history: [['Sign-up started', D(-3, '09:10')], ['Details and intake confirmed', D(-3, '09:20')]] });
  go('admission'); toast('Demo: Grace Mensah is signing up on her agency seat — no payment step.', 'info');
};

/* ---------- Demo controls for the sign-up ---------- */
ACT.chIntakeFills = () => { const b = chBatch(W.signup.batch); if (b) { b.enrolled = b.cap; render(); toast(`Demo: ${b.label} is now full.`, 'info'); } };
// Scenario #16 (instalment case): a fresh run on the under-28-days intake, signed and ready to pay
ACT.chScInstalment = () => {
  S.edge = 'none'; if (STORE.worlds.B.signup.done) STORE.worlds.B = makeWorld('B'); // a fresh run
  setVariant('B'); const w = W, b = chBatch('L3AC-OCT26-ONL');
  w.docs.filter(d => d.mand && d.status === 'Pending').forEach(d => { d.status = 'Submitted'; d.file = 'cv_priya_raman.pdf'; d.uploaded = D(0, '08:00'); d.versions.unshift([d.file, d.uploaded, 'Awaiting review']); });
  Object.assign(w.signup, { batch: b.code, step: 4, sig: { name: chFullName(w), at: D(0, '08:05'), ip: chIp(w), v: chLetterFor(w).v } });
  w.nvq.batch = w.admission.batch = chBatchLbl(b); w.nvq.batchStart = w.admission.batchStart = w.nvq.start = b.start;
  setUi('suOpt', 'instalment'); setUi('suMethod', 'bank'); go('admission');
  toast(`Demo: ${b.label} starts in ${daysTo(b.start)} days, so there's no deposit option.`, 'info');
};
// Screen-index jumps: show sign-up step n with the earlier steps done
ACT.chStep = el => {
  const n = +el.dataset.s; S.edge = 'none'; if (STORE.worlds.B.signup.done) STORE.worlds.B = makeWorld('B'); // a fresh run
  setVariant('B'); const ww = W;
  if (n >= 3) ww.docs.filter(d => d.mand && d.status === 'Pending').forEach(d => { d.status = 'Submitted'; d.file = 'cv_priya_raman.pdf'; d.uploaded = D(0, '08:00'); d.versions.unshift([d.file, d.uploaded, 'Awaiting review']); });
  if (n >= 4) ww.signup.sig = ww.signup.sig || { name: chFullName(ww), at: D(0, '08:05'), ip: chIp(ww), v: chLetterFor(ww).v };
  if (n === 5) { chQuickSignup(ww, { at: D(0, '08:10') }); go('dashboard'); return; }
  ww.signup.step = n; go('admission');
};
AFTER.push(() => {
  const p = document.querySelector('#demo-root .demo-panel'); if (!p || p.querySelector('[data-act="chIntakeFills"]') || S.portal !== 'learner' || !W.signup || W.signup.done) return;
  p.insertAdjacentHTML('beforeend', '<fieldset><legend>Sign-up — demo only</legend><div class="btns"><button class="btn btn-sm" data-act="chIntakeFills">Chosen intake fills up</button><button class="btn btn-sm" data-act="chScInstalment">Under-28-days intake (instalments)</button><button class="btn btn-sm" data-act="chSponsoredSignup">Agency-sponsored sign-up</button></div></fieldset>');
});

/* ---------- Admin: NVQ course editor → "Offer letter" tab (Academic, System and Super Admin) ---------- */
const CH_PB_TABS = [['tree', 'Hierarchy builder'], ['versions', 'Versions'], ['library', 'Observation-criteria library'], ['types', 'Assessment types']];
const _pbCh = progBuilder;
progBuilder = function (id, t) {
  const letter = t === 'letter', h = _pbCh(id, letter ? 'types' : t), pr = ADMIN.programmes.find(x => x.id === id); if (!pr) return h;
  const old = subtabs(CH_PB_TABS, letter ? 'types' : t, 'a-programmes', id), neu = subtabs(CH_PB_TABS.concat([['letter', 'Offer letter']]), t, 'a-programmes', id), k = h.indexOf(old);
  if (k < 0) return h;
  return h.slice(0, k) + neu + (letter ? chLetterTab(pr) : h.slice(k + old.length));
};
function chLetterTab(pr) {
  const l = chLetters(pr.id), cur = l[l.length - 1];
  if (!cur) return `<section class="card"><h2>Offer letter</h2><p class="small">${pr.status === 'Retired' ? 'Retired programme — it takes no new applicants, so it has no offer letter.' : 'No offer letter uploaded yet.'}</p>${pr.status === 'Retired' ? '' : `<button class="btn btn-primary" data-act="chLetterUp" data-id="${pr.id}">Upload offer letter</button>`}</section>`;
  return `<section class="card"><div class="row-b"><h2>Offer letter</h2><button class="btn btn-sm btn-primary" data-act="chLetterUp" data-id="${pr.id}">${ic('upload', 14)}Upload new version</button></div>
    <p class="small muted">Applicants read and sign this letter in step 3 of their sign-up. Merge fields: <span class="ch-merge">{{full_name}}</span> and <span class="ch-merge">{{student_id}}</span>; everything else, including the signatory, is fixed text. A new version applies to new applicants only — anyone who has already started their sign-up keeps the version they started with.</p>
    <dl class="kv"><dt>Current version</dt><dd>Version ${cur.v} · <span class="mono small">${esc(cur.file)}</span> · uploaded by ${esc(cur.by)} on ${fd(cur.at)}</dd></dl>
    <div class="row"><button class="btn btn-sm" data-act="chLetterPrev" data-id="${pr.id}">Preview with a sample learner</button></div>
    <h3>Template</h3>${chLetterHtml(cur, { raw: true })}</section>
    <section class="card"><h2>Version history</h2><div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Version</th><th>File</th><th>Uploaded</th><th>By</th><th>What changed</th></tr></thead><tbody>${l.slice().reverse().map(x => `<tr><td>${x.v}${x === cur ? ' ' + chip('Current', 'green') : ''}</td><td class="mono small">${esc(x.file)}</td><td>${fd(x.at)}</td><td>${esc(x.by)}</td><td class="small">${esc(x.note)}</td></tr>`).join('')}</tbody></table></div></section>`;
}
ACT.chLetterPrev = el => { const cur = chLetterCur(el.dataset.id); openModal({ title: 'Offer letter preview', sub: 'Sample learner: Aisha Rahman · IA-L-18022', size: 'lg', body: chLetterHtml(cur, { name: 'Aisha Rahman', sid: 'IA-L-18022' }), actions: [{ label: 'Close', cls: 'btn-primary' }] }); };
INP.chLetterFile = el => { const f = el.files[0]; setUi('chLetterFile', f ? f.name : ''); const s = $('#lt-fname'); if (s) s.textContent = f ? f.name : 'No file chosen'; };
ACT.chLetterSample = () => { setUi('chLetterFile', 'offer letter (client template).docx'); const s = $('#lt-fname'); if (s) s.textContent = 'offer letter (client template).docx'; };
ACT.chLetterUp = el => {
  const pr = ADMIN.programmes.find(x => x.id === el.dataset.id); setUi('chLetterFile', '');
  reasonDlg({ title: 'Upload offer letter — ' + esc(pr.title), ok: 'Upload new version', label: 'What changed (required)', extra: `<div class="field"><label for="lt-f">Letter (PDF or DOCX)</label><input class="input" type="file" id="lt-f" accept=".pdf,.docx" data-onchange="chLetterFile"><span class="hint">Use the merge fields {{full_name}} and {{student_id}}. <span id="lt-fname">No file chosen</span></span><button type="button" class="linklike small" data-act="chLetterSample">Prototype: use a sample DOCX</button></div><p class="small muted">The new version applies to new applicants only.</p>`,
    onOk: r => { const f = ui('chLetterFile', ''); if (!f) { fieldErr('#lt-f', 'Choose a PDF or DOCX file'); return false; } if (!/\.(pdf|docx)$/i.test(f)) { fieldErr('#lt-f', 'Upload a PDF or DOCX file'); return false; }
      const l = chLetters(pr.id), prev = l[l.length - 1], v = (prev ? prev.v : 0) + 1;
      l.push({ v, file: f, at: now().toISOString(), by: ADMIN.me.name, note: r, programme: pr.title, text: (prev ? prev.text : CH_LETTER_TEXT).slice() });
      logA('NVQ Programmes', pr.title, 'Offer letter uploaded', prev ? 'Version ' + prev.v : '—', 'Version ' + v, r); render(); toast(`Offer letter version ${v} uploaded. It applies to new applicants.`); } });
};
// Store: offer letters survive admin rebuilds; a reset restores them
// Learners who started their sign-up before today signed (or will sign) version 1; a fresh sign-up takes the current version
const chPinV1 = () => Object.values(STORE.worlds).forEach(w => { if (w.signup && !w.signup.letterV) w.signup.letterV = 1; });
const _isCh2 = initStore; initStore = function () { _isCh2(); STORE.chLetters = chLetterSeed(); STORE.chBank = []; chPinV1(); };
if (typeof STORE !== 'undefined' && STORE.worlds && !STORE.chLetters) { STORE.chLetters = chLetterSeed(); STORE.chBank = []; chPinV1(); }

/* ---------- Demo Scenarios: #2 updated to the new order; #16 replaced ---------- */
const _scListCh2 = SC_LIST;
SC_LIST = function () {
  const s = (text, r, t, act) => ({ text, r, t, act }), L = _scListCh2().map(x => x[0] !== '2' ? x : ['2', 'Admission and deposit', 'G5.1, G8, CH-07', [
    s('Applicant (Priya Raman) finishes her sign-up — documents, offer letter, then a deposit by card — and starts learning straight away.', 'learner:B', 'admission'),
    s('System Admin assigns the reviewer, approves the documents and approves admission — this confirms the intake she chose.', 'sysA', 'a-admissions'),
    s('Learner pays the balance within the 28-day seat hold.', 'learner:B', 'payments')]]);
  L.push(['16', 'New sign-up: documents → offer letter → payment → start', 'CH-07 – CH-11', [
    s('Priya Raman chose Abu Dhabi Cohort 1 (starts more than 28 days away) and is on step 2: she uploads her CV, the last mandatory document.', 'learner:B', 'admission'),
    s('Step 3: her offer letter shows her name and Student ID; she types her full name as her signature and ticks the declaration.', 'learner:B', 'admission'),
    s('Step 4: the intake starts in 28 days or more, so a deposit is offered — she pays £300 by card and lands in the LMS.', 'learner:B', 'admission'),
    s('The signed offer letter is in her inbox and in the Academy inbox (info@welfarehs.co.uk).', 'ainbox', ''),
    s('Academic Admin sees the signing record and the signed PDF on her application, now awaiting review.', 'acaA', 'a-admissions.APP-B'),
    s('Instalment case: a fresh run on Online Cohort 9 (starts in under 28 days) — no deposit; she chooses bank transfer for the first instalment.', '', '', 'chScInstalment'),
    s('She starts straight away; her Payments show the first instalment "Awaiting confirmation by Finance".', 'learner:B', 'payments')]]);
  return L.sort((a, b) => +a[0] - +b[0]);
};
CDL_SCEN.push(['16', 'New sign-up: documents → offer letter → payment → start', 'Client-defined (CH-07 – CH-11)']);
CDL_SCEN.sort((a, b) => +a[0] - +b[0]);

/* ---------- Records ---------- */
CH_APPLIED[2] = '13 Oct 2026';
UXC.push(['CH batch 2', 'Client decisions — Batch 2 (CH-07, CH-08, CH-09, CH-10, CH-11)', [
  'CH-07: NVQ sign-up is a stepper done in order — 1 Personal details and intake (only intakes with a place; P-30), 2 Documents (every mandatory document uploaded; approval not needed), 3 Offer letter, 4 Payment, 5 Start. The admission review (reviewer, 7-day escalation, Under Review) runs after payment, while the learner learns. Approval confirms the intake chosen at sign-up: the approval-time batch placement, the applicant waitlist ("Accept next intake" / "Stay on the waitlist", the waitlist demo state) and the Academic Admin "Place" action are removed. If the chosen intake fills before payment, the learner is asked to choose another.',
  'CH-08: NVQ course editor → new "Offer letter" tab (Academic, System and Super Admin): upload a PDF/DOCX with {{full_name}} and {{student_id}}, preview with a sample learner, versions (a new version applies to new applicants only). Mock letters for NV-L2, NV-L3, NV-L4 and NV-L5 (Welfare Academy watermark, Student Name, Student ID, signatory Jenson Thomas). Signing stores the typed name, date and time, a mock IP and the letter version; the signed PDF (mock) is in the learner\'s Admission & Documents and in Learner 360 / the application. The signed copy is emailed to the learner (Learner inbox) and to the Academy (new "Academy inbox (demo)" in the demo controls).',
  'CH-09: the declaration tick-box is required with the typed signature; "Sign and continue" stays disabled, with its reason shown, until both are done. There is no decline option.',
  'CH-10: Payment — Deposit (holds your seat) only when the intake starts in 28 days or more, otherwise a note explains why it is hidden; Instalments (6 monthly, first one now); no pay-in-full. Card (mock Stripe) or bank transfer (bank instructions placeholder, a reference, "Awaiting confirmation by Finance"). "Deposit only after all documents are approved" and "Programme content unlocks after admission is approved" are removed: content opens when the sign-up is complete. Deposit rules unchanged (balance within the 28-day hold; seat released if unpaid; refund if the Academy cancels the batch).',
  'CH-11 (learner side): bank-transfer sign-ups start straight away. Finance follow-up comes in Batch 3.',
  'F4 kept: agency-sponsored NVQ learners sign up with details → documents → offer letter → start, with no payment step.',
  'Mock data: intake L3AC-OCT26-ONL "Online Cohort 9" (starts in under 28 days); Priya Raman (variant B) is on step 2 for Abu Dhabi Cohort 1 (starts more than 28 days away); her fee schedule is created when she pays. Started learners (C, D) have a signing record. Demo Scenarios: #2 updated, #16 replaced.']]);

/* ---------- Screen index (with purpose lines) ---------- */
const _idxCh2 = SCREENS.index;
SCREENS.index = p => _idxCh2(p).replace(/(<section class="card idx-sec"><h2>Client decisions \(CH\)<\/h2><ul class="idx-list">)/, `$1${[
  chIdxLi('Sign-up step 1 — Personal details and intake', { act: 'chStep', s: '1' }, 'CH-07 — confirm details and choose an intake that has a place.'),
  chIdxLi('Sign-up step 2 — Documents', { act: 'chStep', s: '2' }, 'CH-07 — upload every mandatory document; approval is not needed to continue.'),
  chIdxLi('Sign-up step 3 — Offer letter, signature and declaration', { act: 'chStep', s: '3' }, 'CH-08, CH-09 — the letter with your name and Student ID; type your name and tick the declaration.'),
  chIdxLi('Sign-up step 4 — Payment (deposit or first instalment)', { act: 'chStep', s: '4' }, 'CH-10 — deposit only for intakes 28+ days away; card or bank transfer.'),
  chIdxLi('Sign-up step 4 — under-28-days intake, bank transfer', { act: 'chScInstalment' }, 'CH-10, CH-11 — no deposit offered; the transfer awaits Finance confirmation.'),
  chIdxLi('Sign-up step 5 — Start (lands in the LMS)', { act: 'chStep', s: '5' }, 'CH-07 — the programme opens as soon as the payment is made.'),
  chIdxLi('Agency-sponsored sign-up — no payment step', { act: 'chSponsoredSignup' }, 'F4 — documents, offer letter, then start.'),
  chIdxLi('Signed offer letter (PDF)', { act: 'chSignedPdf', v: 'C' }, 'CH-08 — the letter, the filled-in fields and the signature block.'),
  chIdxLi('Academy inbox (demo)', { act: 'switchRole', r: 'ainbox' }, 'CH-08 — the copy of each signed offer letter sent to the Academy.')].join('')}`);
const _aIdxCh2 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxCh2(p).replace(/(<section class="card idx-sec"><h2>Client decisions \(CH\)<\/h2><ul class="idx-list">)/, `$1${[
  chIdxLi('NVQ course editor — Offer letter tab', { act: 'aJump', t: 'a-programmes.NV-L3.letter' }, 'CH-08 — upload, preview and version each course\'s offer letter.'),
  chIdxLi('Application — signing record and signed PDF', { act: 'aJump', t: 'a-admissions.APP-C' }, 'CH-08 — who signed, when, the mock IP and the letter version.'),
  chIdxLi('Learner 360 — Admission & Documents with the sign-up', { act: 'aJump', t: 'a-learner.IA-L-31188.admission' }, 'CH-07 — an applicant part-way through the sign-up.')].join('')}`);
// Client suggestion sheet row: item 9 (pay during review / bank transfer) is built by CH-07 – CH-11
const _cdLogCh2 = SCREENS['cd-log'];
SCREENS['cd-log'] = p => _cdLogCh2(p).replace('Built: 1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 14, 15. Held pending client: 6 (observation fee), 9 (pay during review), 13 (module quizzes).', 'Built: 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 14, 15. Held pending client: 6 (observation fee — P-27), 13 (module quizzes — CH-16, Batch 4).')
  .replace('3 held</span>', '2 held</span>').replace('Items 6, 9 and 13 are unchanged until the client decides.', 'Item 9 is built by the client change list (CH-07 – CH-11); item 13 follows in Batch 4 (CH-16); item 6 is pending client (P-27).');
