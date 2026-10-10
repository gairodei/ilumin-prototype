/* ============================================================
   Final decisions G2 — learner self-registration (prototype only)
   Sign-in → "Create an account" → Register → Verify (6-digit code by email or SMS) → Welcome → Dashboard.
   A learner who signs in before verifying lands on the verify screen. Emails and codes go to the
   Learner inbox (demo). Cross-view: the new learner appears in Learners (country, data region, currency)
   and a referral code adds to that code's registration count. Loads after every portal file.
   ============================================================ */
'use strict';

const REG_COUNTRIES = [['United Kingdom', 'GBP', 'UK', '+44'], ['United Arab Emirates', 'AED', 'UAE', '+971'], ['India', 'INR', null, '+91'], ['Ireland', 'EUR', null, '+353'], ['Nigeria', 'NGN', null, '+234'], ['Pakistan', 'PKR', null, '+92'], ['Philippines', 'PHP', null, '+63'], ['South Africa', 'ZAR', null, '+27']];
const regCountry = n => REG_COUNTRIES.find(c => c[0] === n);
const REG_CODE_MIN = 15;

/* ---------- Referral code check (valid / expired / not found) ---------- */
function regRefState(code) {
  const c = (code || '').trim().toUpperCase(); if (!c) return null;
  const r = (ADMIN.referrals || []).find(x => x.code.toUpperCase() === c);
  if (!r) return { st: 'notfound', msg: 'Code not found — you can register without it.' };
  if (r.status !== 'Active' || (r.valid && new Date(r.valid) < now())) return { st: 'expired', r, msg: 'This code has expired — you can register without it.' };
  return { st: 'valid', r, msg: `Valid code — ${r.type}: ${r.owner.replace(/ \(learner\)$/, '')}` };
}

/* ---------- Screens ---------- */
function regForm() {
  const d = S.reg = S.reg || { country: '', dial: '+44', ref: '', refLocked: false };
  const rs = regRefState(d.ref), m = S.authMsg;
  return authShell(`<button class="linklike small" data-act="authGo" data-a="signin">← Back to sign in</button><div class="stack" style="gap:6px"><h1>Create your learner account</h1><p class="muted">Takes about a minute. We'll send you a code to confirm your email or mobile.</p></div>
    ${m ? `<div class="note b-${m.tone || 'red'}" role="alert">${ic('alert')}<div>${m.html}</div></div>` : ''}
    <form class="stack" data-submit="regSubmit" novalidate>
      <div class="field"><label for="rg-name">Full name</label><input class="input" id="rg-name" autocomplete="name" value="${esc(d.name || '')}"></div>
      <div class="field"><label for="rg-email">Email</label><input class="input" id="rg-email" type="email" autocomplete="email" value="${esc(d.email || '')}"></div>
      <div class="field"><label for="rg-mob">Mobile</label><div class="row" style="gap:6px;flex-wrap:nowrap"><label class="sr" for="rg-dial">Country code</label><select class="select" id="rg-dial" style="width:auto">${[...new Set(REG_COUNTRIES.map(c => c[3]))].map(c => `<option ${c === d.dial ? 'selected' : ''}>${c}</option>`).join('')}</select><input class="input" id="rg-mob" type="tel" autocomplete="tel-national" value="${esc(d.mob || '')}" placeholder="7700 900123"></div></div>
      <div class="field"><label for="rg-country">Country</label><select class="select" id="rg-country" data-onchange="regCountry"><option value="">Choose your country</option>${REG_COUNTRIES.map((c, i) => `${i === 2 ? '<option disabled>──────────</option>' : ''}<option ${d.country === c[0] ? 'selected' : ''}>${c[0]}</option>`).join('')}</select><span class="hint">Your country sets the money you pay in (for example £ GBP in the UK, AED in the UAE). It also sets where your data is kept. To change it later, ask the Academy.</span></div>
      ${pwField('rg-pw', 'Password', 'new')}${pwField('rg-pw2', 'Confirm password', 'confirm')}${pwPolicy('rg-pol')}
      <div class="field"><label for="rg-ref">Referral / Agent Code <span class="muted small">(optional)</span></label><input class="input mono" id="rg-ref" value="${esc(d.ref)}" ${d.refLocked ? 'readonly' : ''} data-oninput="regRef" autocomplete="off">${d.refLocked ? `<span class="hint">${ic('lock', 12)} Added from your referral link.</span>` : ''}<span id="rg-ref-st" class="small" role="status">${rs ? regRefMsg(rs) : ''}</span></div>
      <label class="check small"><input type="checkbox" id="rg-terms" ${d.terms ? 'checked' : ''}> <span>I agree to the <button type="button" class="linklike" data-act="regDoc" data-d="Terms &amp; Conditions">Terms &amp; Conditions</button></span></label>
      <label class="check small"><input type="checkbox" id="rg-priv" ${d.priv ? 'checked' : ''}> <span>I consent to Illumin Academy processing my data as described in the <button type="button" class="linklike" data-act="regDoc" data-d="Privacy notice">Privacy notice</button></span></label>
      <button class="btn btn-primary btn-block" type="submit">Create account</button>
    </form>
    <div class="demo-hint"><strong>Prototype:</strong> use an email already in the system (e.g. <code>aisha.rahman@gmail.com</code>) to see the duplicate block. Referral codes to try: <code>WB-FATIMA07</code> (valid), <code>EHHS-AGENT-02</code> (expired), <code>XYZ-000</code> (not found).</div>`);
}
const regRefMsg = rs => `<span style="color:var(${rs.st === 'valid' ? '--green' : '--amber'})">${rs.st === 'valid' ? '✓' : '!'} ${esc(rs.msg)}</span>`;
function regVerifyView() {
  const d = S.reg || {}, v = S.regV || {}, m = S.authMsg, left = Math.max(0, Math.ceil(((v.expires || 0) - Date.now()) / 1000)), cool = Math.max(0, Math.ceil(((v.resendAt || 0) - Date.now()) / 1000));
  if (v.locked) return authShell(`<div class="lock-ic" style="background:var(--red-bg);color:var(--red)">${ic('lock', 28)}</div><h1>Too many attempts</h1><p>For your security we've stopped accepting codes for this one. Request a new code to try again.</p><button class="btn btn-primary btn-block" data-act="regResend" data-force="1">Send a new code</button><button class="btn" data-act="authGo" data-a="signin">Back to sign in</button>`);
  const to = v.via === 'sms' ? (d.dial + ' ' + d.mob) : d.email;
  return authShell(`<p class="eyebrow">${v.pending ? 'Pending verification' : 'Step 2 of 2'}</p><h1>Verify your account</h1><p class="muted">${v.pending ? 'Your account isn\'t verified yet. ' : ''}We sent a 6-digit code by ${v.via === 'sms' ? 'SMS' : 'email'} to <strong>${esc(to)}</strong>.</p>
    ${m ? `<div class="note b-${m.tone || 'red'}" role="alert">${ic('alert')}<div>${m.html}</div></div>` : ''}
    <form class="stack" data-submit="regCode">${codeBoxes()}<p class="small ${left ? 'muted' : ''}" id="reg-left" role="timer">${left ? `Code expires in <span class="countdown">${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</span>` : '<strong>This code has expired.</strong> Send a new one.'}</p><button class="btn btn-primary btn-block" type="submit">Verify</button></form>
    <div class="row-b small"><button class="linklike" data-act="regResend" ${cool ? 'disabled' : ''}>${cool ? `Resend code in ${cool}s` : 'Resend code'}</button><button class="linklike" data-act="regVia">${v.via === 'sms' ? 'Send by email instead' : 'Send by SMS instead'}</button></div>
    <button class="btn btn-sm" data-act="lmOpen">${ic('inbox', 14)}Open the Learner inbox (demo)</button>
    <div class="demo-hint"><strong>Prototype:</strong> the code is in the Learner inbox (demo) · <code>123456</code> works · <code>000000</code> = expired · 3 wrong codes need a new code.</div>`);
}
const _authR = authView;
authView = function () {
  if (S.portal === 'learner' || !S.portal) {
    if (S.auth === 'register') return regForm();
    if (S.auth === 'regVerify') return regVerifyView();
    if (S.auth === 'verify') { const m = W.me; S.reg = { name: m.first + ' ' + m.last, email: S.authEmail || m.email, dial: '', mob: m.mobile }; S.regV = { via: 'email', expires: Date.now() + REG_CODE_MIN * 60000, resendAt: Date.now() + 30000, tries: 0, pending: true, existing: true }; regSendCode(); S.auth = 'regVerify'; setTimeout(regTick, 0); return regVerifyView(); }
  }
  return _authR();
};

/* ---------- Actions ---------- */
ACT.regStart = () => { S.reg = { country: '', dial: '+44', ref: '', refLocked: false }; S.authMsg = null; S.auth = 'register'; S.portal = 'learner'; S.signedIn = false; S.route = 'signin'; render(); };
ACT.regLink = () => { if (typeof signOut === 'function' && S.signedIn) signOut(); S.portal = 'learner'; S.signedIn = false; S.route = 'signin'; S.reg = { country: '', dial: '+44', ref: 'WB-FATIMA07', refLocked: true }; S.authMsg = { tone: 'blue', html: 'You opened a referral link from <strong>Fatima Al Mansoori</strong> (Welfare Buddy). The code is already added.' }; S.auth = 'register'; render(); };
ACT.regDoc = el => openModal({ title: el.dataset.d, body: `<p class="small">Prototype placeholder for the ${esc(el.dataset.d)}. The version you accept is stored with the date and time.</p>`, actions: [{ label: 'Close', cls: 'btn-primary' }] });
INP.regRef = el => { const rs = regRefState(el.value); S.reg.ref = el.value; $('#rg-ref-st').innerHTML = rs ? regRefMsg(rs) : ''; };
INP.regCountry = el => { const c = regCountry(el.value); if (c && $('#rg-dial')) $('#rg-dial').value = c[3]; };
const regKeep = () => { const d = S.reg; Object.assign(d, { name: $('#rg-name').value.trim(), email: $('#rg-email').value.trim(), dial: $('#rg-dial').value, mob: $('#rg-mob').value.trim(), country: $('#rg-country').value, ref: $('#rg-ref').value.trim(), terms: $('#rg-terms').checked, priv: $('#rg-priv').checked }); return d; };
SUBMIT.regSubmit = () => {
  const d = regKeep(), pw = $('#rg-pw').value, pw2 = $('#rg-pw2').value;
  const err = !d.name ? ['#rg-name', 'Enter your full name'] : !/^\S+@\S+\.\S+$/.test(d.email) ? ['#rg-email', 'Enter a valid email address'] : !/^[\d ]{6,}$/.test(d.mob) ? ['#rg-mob', 'Enter your mobile number'] : !d.country ? ['#rg-country', 'Choose your country'] : !PW_RULES.len(pw) || !PW_RULES.up(pw) || !PW_RULES.lo(pw) || !PW_RULES.num(pw) || !PW_RULES.sym(pw) ? ['#rg-pw', 'Your password doesn\'t meet every rule below'] : pw !== pw2 ? ['#rg-pw2', 'Passwords don\'t match'] : !d.terms ? ['#rg-terms', 'Accept the Terms & Conditions to continue'] : !d.priv ? ['#rg-priv', 'Give privacy consent to continue'] : null;
  if (err) { if (/terms|priv/.test(err[0])) { S.authMsg = { html: err[1] + '.' }; render(); } else fieldErr(err[0], err[1]); return; }
  const mob = (d.dial + d.mob).replace(/\D/g, ''), dup = allLearners().find(l => l.email.toLowerCase() === d.email.toLowerCase() || (l.mobile || '').replace(/\D/g, '') === mob) || (STORE.regs || []).find(r => r.email.toLowerCase() === d.email.toLowerCase());
  if (dup) { S.authMsg = { html: '<strong>An account already exists</strong> with this email or mobile. <button class="linklike" data-act="authGo" data-a="signin">Sign in</button> / <button class="linklike" data-act="authGo" data-a="forgot">Reset password</button>' }; render(); return; }
  const rs = regRefState(d.ref), at = now().toISOString();
  d.consents = [['Terms & Conditions', 'v3.2', at], ['Privacy consent', 'v4.0', at]]; d.refOk = rs && rs.st === 'valid' ? rs.r.code : null;
  (STORE.regs = STORE.regs || []).push({ email: d.email, name: d.name, at, verified: false });
  S.regV = { via: 'email', expires: Date.now() + REG_CODE_MIN * 60000, resendAt: Date.now() + 30000, tries: 0 };
  regSendCode(); S.authMsg = rs && rs.st !== 'valid' ? { tone: 'amber', html: 'Registered without the referral code (' + esc(rs.st === 'expired' ? 'expired' : 'not found') + ').' } : null; S.auth = 'regVerify'; render(); regTick();
};
function regSendCode() {
  const d = S.reg, v = S.regV, sms = v.via === 'sms';
  STORE.agy.lmails.unshift({ id: 'LM-R' + Date.now() + Math.random().toString(36).slice(2, 4), kind: 'code', name: d.name, email: sms ? d.dial + ' ' + d.mob + ' (SMS)' : d.email, agency: 'Illumin Academy', by: sms ? 'SMS (demo)' : 'Illumin Academy', subj: sms ? 'SMS: your Illumin Academy code' : 'Confirm your Illumin Academy account', html: `<p>${sms ? '' : `Hello ${esc(d.name.split(' ')[0])},</p><p>`}Your verification code is:</p><p class="mono" style="font-size:1.6rem;letter-spacing:.2em">123456</p><p class="small">It expires in ${REG_CODE_MIN} minutes. If you didn't create an account, ignore this message.</p>`, sent: now().toISOString(), used: false });
}
function regTick() { timer('regtick', () => { if (S.auth !== 'regVerify') return clearTimer('regtick'); const el = $('#reg-left'), v = S.regV, left = Math.max(0, Math.ceil((v.expires - Date.now()) / 1000)); if (el && left) el.innerHTML = `Code expires in <span class="countdown">${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</span>`; else render(); const rb = $('[data-act="regResend"]'); if (rb && Date.now() > v.resendAt && rb.disabled) render(); }, 1000); }
ACT.regResend = el => { const v = S.regV; if (!el.dataset.force && Date.now() < v.resendAt) return; Object.assign(v, { expires: Date.now() + REG_CODE_MIN * 60000, resendAt: Date.now() + 30000, tries: 0, locked: false }); regSendCode(); S.authMsg = { tone: 'blue', html: 'New code sent. It expires in ' + REG_CODE_MIN + ' minutes.' }; render(); regTick(); };
ACT.regVia = () => { const v = S.regV; v.via = v.via === 'sms' ? 'email' : 'sms'; Object.assign(v, { expires: Date.now() + REG_CODE_MIN * 60000, resendAt: Date.now() + 30000 }); regSendCode(); S.authMsg = { tone: 'blue', html: `Code sent by ${v.via === 'sms' ? 'SMS' : 'email'}.` }; render(); };
SUBMIT.regCode = () => {
  const v = S.regV, c = otpVal();
  if (c.length < 6) { S.authMsg = { html: 'Enter all 6 digits.' }; render(); return; }
  if (c === '000000' || Date.now() > v.expires) { S.authMsg = { html: '<strong>This code has expired.</strong> Send a new one.' }; render(); return; }
  if (c !== '123456') { v.tries++; if (v.tries >= 3) { v.locked = true; S.authMsg = null; } else S.authMsg = { html: `<strong>That code is incorrect.</strong> ${3 - v.tries} attempt${3 - v.tries === 1 ? '' : 's'} left.` }; render(); return; }
  clearTimer('regtick'); S.authMsg = null;
  if (v.existing) { S.edge = 'none'; S.portal = 'learner'; S.signedIn = true; S.auth = 'signin'; go('dashboard'); toast('Account verified — welcome back.'); return; }
  regCreate(); S.auth = 'welcome'; render();
};
/* Pending Verification: signing in before verifying lands on the verify screen */
const _siR = SUBMIT.signin;
SUBMIT.signin = form => {
  const e = ($('#si-email').value || '').trim().toLowerCase(), p = (STORE.regs || []).find(r => r.email.toLowerCase() === e && !r.verified);
  if (p && $('#si-pw').value) { S.reg = S.reg && S.reg.email && S.reg.email.toLowerCase() === e ? S.reg : { name: p.name, email: p.email, dial: '+44', mob: '' }; S.regV = { via: 'email', expires: Date.now() + REG_CODE_MIN * 60000, resendAt: Date.now() + 30000, tries: 0, pending: true }; regSendCode(); S.authMsg = null; S.auth = 'regVerify'; render(); regTick(); return; }
  return _siR(form);
};

/* ---------- Create the learner (world G) and the cross-view records ---------- */
function regCreate() {
  const d = S.reg, c = regCountry(d.country) || REG_COUNTRIES[0], [first, ...rest] = d.name.split(' '), id = 'IA-L-' + (40100 + (STORE.regs || []).length);
  const refTxt = d.refOk ? `${(ADMIN.referrals.find(r => r.code === d.refOk) || {}).type || 'Referral'} referral (code ${d.refOk})` : 'Self-registration';
  PERSONAS.G = { id, first, last: rest.join(' ') || '', email: d.email, mobile: d.dial + ' ' + d.mob, dob: '—', address: '—', postcode: '—', country: c[0], tz: c[0] === 'United Arab Emirates' ? 'Asia/Dubai' : c[0] === 'India' ? 'Asia/Kolkata' : 'Europe/London', cur: c[1], joined: fd(now().toISOString()), referral: refTxt, sponsor: null };
  VARIANTS.G = { nvq: false, fresh: true };
  const w = STORE.worlds.G = makeWorld('G');
  Object.assign(w, { enrolments: [], certs: [], tx: [], plans: [], threads: [], requests: [], attendance: [], resources: [], events: [], payOverdue: null, referral: null, consents: d.consents.concat([['Marketing emails', 'Declined', d.consents[0][2]]]) });
  w.notifs = [{ id: 'ntw', cat: 'Account', title: 'Welcome to Illumin Academy', body: 'Your account is verified. Browse courses to get started.', at: now().toISOString(), unread: true, go: 'browse' }];
  const r = STORE.regs.find(x => x.email === d.email); if (r) r.verified = true;
  STORE.acct.G = 'Active';
  if (d.refOk) { const ref = ADMIN.referrals.find(x => x.code === d.refOk); if (ref) ref.regs = (ref.regs || 0) + 1; }
  logA('Learners', id, 'Self-registration', '—', `Verified · ${c[0]} · ${c[1]}${d.refOk ? ' · code ' + d.refOk : ''}`, 'Consents: Terms v3.2, Privacy v4.0 at ' + fdt(d.consents[0][2]));
  S.variant = 'G'; W = w; S.edge = 'none'; S.portal = 'learner';
}
// The registered learner joins the demo-learner list so admin views show them (country, data region, currency)
const _demoLR = demoLearners;
demoLearners = function () { const list = _demoLR(); const w = STORE.worlds && STORE.worlds.G; if (!w) return list; const m = w.me, c = regCountry(m.country) || []; return list.concat([{ id: m.id, v: 'G', name: (m.first + ' ' + m.last).trim(), email: m.email, mobile: m.mobile, agency: null, courses: w.enrolments.map(e => e.title), acct: 'Active', rec: 'Active', region: c[2] || null, last: now().toISOString(), flags: [], dob: m.dob, address: m.address, postcode: m.postcode, country: m.country, joined: m.joined, referral: m.referral, cur: m.cur, demo: true }]); };
// Learner demo panel + sign-in hint: open a referral link
const _rdR = renderDemo;
renderDemo = function () { _rdR(); const fs = $('#demo-root .demo-panel'); if (fs && (S.portal === 'learner' || !S.signedIn) && !fs.querySelector('[data-act="regLink"]')) fs.insertAdjacentHTML('beforeend', '<fieldset><legend>Registration — demo only</legend><div class="btns"><button class="btn btn-sm" data-act="regLink">Open referral link (demo)</button><button class="btn btn-sm" data-act="regStart">Create an account</button></div></fieldset>'); };
AFTER.push(() => { const d = $('.demo-hint .row'); if (d && !S.signedIn && S.auth === 'signin' && !d.querySelector('[data-act="regLink"]')) d.insertAdjacentHTML('beforeend', '<button type="button" class="btn btn-sm" data-act="regLink">Open referral link (demo)</button>'); });
