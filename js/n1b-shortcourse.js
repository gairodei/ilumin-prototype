/* ============================================================
   1B — Short-course purchase, registration, access and repurchase (Welfare Academy email, point 1B; 13 Nov 2026;
   PD-1B-* in PROVISIONAL-DECISIONS.md). Loads after n1a-commence.js, so its wrappers are outermost.

   A. Course details before payment. Browse → Course details (route course-info) → Continue to purchase → the course's own
      enrolment questions (existing S1-02 step, only when the course has active ones) → checkout → access. Every fact on the page
      comes from the course's configuration (Short Courses: details, modules and content, completion rules, certificate, validity,
      access period, price). Facts the configuration doesn't hold (separate learning outcomes, prerequisites) are said to be not
      stated — never invented. A course missing an essential fact (description, price, access period, content, certificate
      validity when it issues one) shows what is missing and can't be bought. Visitors who aren't signed in can browse the short
      courses and their details from the sign-in page; buying needs an account (existing registration + simulated verification),
      after which they return to the same course.
   B. Existing learners (NVQ or not) buy on the same account; nothing about their NVQ enrolment, batch, documents, offer letter or
      fees is touched, and NVQ access keeps its own gates (1A).
   D. Payment: the existing simulated checkout, labelled as simulated (no card charged, no email sent). One success = one
      enrolment: the confirmation runs once per purchase intent and is refused while a live enrolment of the course exists. The
      enrolment records its transaction reference, purchase intent and access period, and the purchase is audited. Failed or
      cancelled payments create nothing; a Payment Pending enrolment opens no content.
   E. Expired / repurchase: Re-purchase and Renew open the course details; the purchase makes a new enrolment from the course's
      current configuration (its price, access period, content, modules, completion rules and certificate validity). The earlier
      enrolment, its progress, attempts, completion, certificates, payments and audit stay as they were (the old re-purchase
      copied the earlier enrolment — its certificate link, answers and settings — into the new one, with a fixed 90 days).
   F. Request more time stays: learner request → Academic Admin grants, refuses or requires re-purchase (unchanged).
   A prototype only. PRODUCTION MUST ENFORCE PURCHASE, PAYMENT AND ACCESS ON THE SERVER.
   ============================================================ */
'use strict';

/* ---------- The course's configured facts ---------- */
const n1bCat = id => { if (typeof s1Sync === 'function') s1Sync(); return CATALOGUE.find(c => c.kind === 'short' && c.id === id) || null; };
const n1bCatOfEnrol = e => { if (!e) return null; if (typeof s1Sync === 'function') s1Sync(); return CATALOGUE.find(c => c.kind === 'short' && ((e.courseId && c.course === e.courseId) || c.title === e.base)) || null; };
const N1B_KIND = { doc: ['Document', 'Documents'], video: ['Video', 'Videos'], scorm: ['Interactive module', 'Interactive modules'], link: ['Link', 'Links'] };
function n1bFacts(c) {
  const row = c && c.course ? s1Row(c.course) : null, sp = row ? s1Spec(row) : null;
  const items = sp ? sp.items.filter(i => i.status === 'Active') : [];
  const mods = row ? s1Mods(row).filter(m => m.status === 'Active').map(m => ({ title: m.title, items: m.items.map(id => items.find(i => i.id === id)).filter(Boolean), quiz: { n: Math.min(m.quiz.q || 0, s1ActQs(m).length) || s1ActQs(m).length, pass: m.quiz.pass, attempts: m.quiz.max, limit: m.quiz.limit } })) : [];
  const certOn = sp ? (typeof fcOn === 'function' ? fcOn(sp) : true) : false;
  const rules = sp ? S1_RULES.filter(([k]) => sp.rules[k]).map(([, l]) => l) : [];
  const f = { c, row, sp, title: c.title, desc: (sp && sp.desc) || '', dur: (sp && sp.dur) || '', price: row ? row.gbp : c.price, access: row ? +row.access : NaN, validity: row ? row.validity : c.validity, certOn, items, mods, rules, fields: sp ? sp.fields.filter(x => x.status === 'Active') : [] };
  const miss = [];
  if (!row) miss.push('the course record');
  if (!f.desc.trim()) miss.push('a description');
  if (!(f.price > 0)) miss.push('a price');
  if (!(f.access > 0)) miss.push('an access period');
  if (!items.length) miss.push('course content');
  if (certOn && !f.validity) miss.push('the certificate validity');
  f.missing = miss; return f;
}
const n1bLive = c => (typeof cfDupOf === 'function' ? cfDupOf(cfCat(c)) : null);
const n1bPast = c => ((W && W.enrolments) || []).filter(e => e.kind === 'short' && ((c.course && e.courseId === c.course) || e.base === c.title) && !['Active', 'Payment Pending'].includes(e.status));

/* ---------- The course details page (signed-in learners and visitors) ---------- */
function n1bDetails(f) {
  const kinds = Object.entries(f.items.reduce((a, i) => { a[i.kind] = (a[i.kind] || 0) + 1; return a; }, {})).map(([k, n]) => `${n} ${(N1B_KIND[k] || [k, k])[n === 1 ? 0 : 1].toLowerCase()}`);
  const delivery = `Online, in the learner portal${kinds.length ? ': ' + kinds.join(', ') : ''}${f.mods.some(m => m.quiz.n) ? ', with a quiz at the end of each module' : ''}.`;
  const valid = !f.validity ? 'Not stated' : /No expiry/i.test(f.validity) ? 'No expiry' : `Valid for ${esc(f.validity)} from the date it is issued`;
  const modsHtml = f.mods.length ? `<ol class="stack n1b-mods">${f.mods.map((m, i) => `<li><strong>Module ${i + 1}: ${esc(m.title)}</strong><ul class="small">${m.items.map(it => `<li>${esc((N1B_KIND[it.kind] || [it.kind])[0])}: ${esc(it.title)}${it.dur ? ` <span class="muted">(${esc(it.dur)})</span>` : ''}</li>`).join('')}${m.quiz.n ? `<li>Module quiz: ${m.quiz.n} question${m.quiz.n === 1 ? '' : 's'}, pass mark ${m.quiz.pass}%${m.quiz.attempts ? `, ${m.quiz.attempts} attempt${m.quiz.attempts === 1 ? '' : 's'}` : ''}${m.quiz.limit ? `, ${m.quiz.limit}-minute time limit` : ''}</li>` : ''}</ul></li>`).join('')}</ol>`
    : f.items.length ? `<ul class="small">${f.items.map(it => `<li>${esc((N1B_KIND[it.kind] || [it.kind])[0])}: ${esc(it.title)}</li>`).join('')}</ul>` : '<p class="small muted">The Academy hasn\'t added the course content yet.</p>';
  return `<div class="grid-2 n1b-info">
    <section class="card"><h2>About this course</h2>${f.desc ? `<p>${esc(f.desc)}</p>` : '<p class="small muted">No description has been provided.</p>'}
      <h3>What you'll learn</h3>${modsHtml}
      <h3>Learning outcomes</h3><p class="small muted">The Academy hasn't listed separate learning outcomes for this course; the modules above show what it covers.</p></section>
    <section class="card"><h2>Course facts</h2><dl class="kv">
      <dt>Price</dt><dd class="strong num">${f.price > 0 ? money(f.price, 'GBP') : 'Not set'}</dd>
      <dt>Study time</dt><dd>${f.dur ? esc(f.dur) : 'Not stated'}</dd>
      <dt>Delivery</dt><dd>${delivery}</dd>
      <dt>Prerequisites</dt><dd>None stated by the Academy</dd>
      <dt>Access period</dt><dd>${f.access > 0 ? `${f.access} days from the day your payment is confirmed` : 'Not set'}</dd>
      <dt>To complete</dt><dd>${f.rules.length ? f.rules.map(esc).join('; ') : 'Not stated'}</dd>
      <dt>Certificate</dt><dd>${f.certOn ? `Issued automatically when you complete the course. ${valid}.` : 'This course doesn\'t issue a certificate.'}</dd>
      <dt>Before you pay</dt><dd>${f.fields.length ? `You'll be asked: ${f.fields.map(x => `${esc(x.label)}${x.req ? '' : ' (optional)'}`).join(', ')}.` : 'Nothing else is needed for this course.'}</dd></dl>
      <p class="xs muted">All prices are in GBP; your card provider may show the amount in your local currency. You can't study the course before your payment is confirmed.</p></section></div>`;
}
SCREENS['course-info'] = p => {
  const c = n1bCat(p.id);
  if (!c) return `${pageHead('Course details', '')}<div class="card"><div class="empty">${ic('search', 36)}<h2>This course isn't available</h2><p>It may no longer be on sale.</p><button class="btn" data-go="browse">Browse Courses</button></div></div>`;
  const f = n1bFacts(c), live = n1bLive(c), past = n1bPast(c);
  let act;
  if (live) act = live.status === 'Payment Pending' ? `<div class="note b-amber n1b-have" role="status">${ic('clock')}<div><strong>Your payment for this course is being confirmed.</strong> You don't need to pay again.<div class="b-act"><button class="btn btn-sm" data-go="course" data-id="${esc(live.id)}">View the enrolment</button></div></div></div>`
    : `<div class="note b-green n1b-have" role="status">${ic('check')}<div><strong>You already have access to this course.</strong> Your access runs until ${fd(live.end)}.<div class="b-act"><button class="btn btn-sm btn-primary" data-go="course" data-id="${esc(live.id)}">Continue learning</button></div></div></div>`;
  else if (f.missing.length) act = `<div class="note b-amber n1b-missing" role="status">${ic('alert')}<div><strong>This course can't be bought yet.</strong> The Academy hasn't set ${f.missing.join(', ')}. Contact the Academy: ${academyContact()}</div></div>`;
  else act = `<div class="row n1b-buy"><button class="btn btn-primary" data-act="n1bBuy" data-id="${esc(c.id)}">Continue to purchase</button><span class="small muted">${money(f.price, 'GBP')} · ${f.access} days' access</span></div>`;
  const prev = past.length ? `<div class="note b-grey n1b-prev">${ic('info')}<div class="small"><strong>You studied this course before</strong> (${past.map(e => `${esc(e.title)}: ${esc(e.status)}`).join('; ')}). A new purchase starts a new enrolment with its own access period and progress; your earlier records and certificates are kept.${past.some(e => e.status === 'Expired-Incomplete') ? ` To carry on with your earlier progress instead, <button class="linklike" data-act="reqTime" data-id="${esc(past.find(e => e.status === 'Expired-Incomplete').id)}">request more time</button>.` : ''}</div></div>` : '';
  const sp = W.flags && W.flags.sponsored ? `<div class="note b-blue">${ic('info')}<div class="small">Anything you buy here is paid by you, not by ${esc(W.me.sponsor || 'your agency')}.</div></div>` : '';
  return `${pageHead(esc(c.title), 'Short course · course details', '<button class="btn" data-go="browse">Back to Browse Courses</button>')}${sp}${prev}${n1bDetails(f)}${act}`;
};
// Same treatment as Browse in the learner lock chain (open before NVQ commencement, during an NVQ sign-up; the archive still applies)
const _lfN1B = lockFor;
lockFor = function (r) { return _lfN1B.call(this, r === 'course-info' ? 'browse' : r); };

/* ---------- Browse: "View details" instead of buying from the card ---------- */
const _catN1B = catCard;
catCard = function (c) {
  const h = _catN1B.apply(this, arguments); if (!h || !c || c.kind !== 'short') return h;
  const det = `<button class="btn btn-sm btn-primary n1b-view" data-go="course-info" data-id="${esc(c.id)}">View details</button>`;
  if (h.includes(`data-act="buyCourse" data-id="${c.id}"`)) return h.replace(`<button class="btn btn-sm" data-act="buyCourse" data-id="${c.id}">Buy now</button>`, det);
  return h.replace('</article>', `<button class="linklike small n1b-view" data-go="course-info" data-id="${esc(c.id)}">Course details</button></article>`);
};

/* ---------- Continue to purchase: checked again, then the existing enrolment-questions step and checkout ---------- */
ACT.n1bBuy = el => {
  const c = n1bCat(el && el.dataset && el.dataset.id), who = W && W.me ? `${chFullName(W)} (${W.me.id})` : '—';
  if (S.portal !== 'learner' || !S.signedIn) { toast('Sign in to buy this course.', 'err'); return false; }
  if (!c) { logA('Short Courses', `${who} · ${(el && el.dataset && el.dataset.id) || '—'}`, 'Blocked: buy course (not on sale)', '—', '—', 'No published course with this ID'); toast('This course isn\'t on sale.', 'err'); return false; }
  const f = n1bFacts(c); if (f.missing.length) { logA('Short Courses', `${who} · ${c.title}`, 'Blocked: buy course (incomplete course details)', '—', '—', 'Missing: ' + f.missing.join(', ')); toast(`This course can't be bought yet: the Academy hasn't set ${f.missing.join(', ')}.`, 'err'); render(); return false; }
  return ACT.buyCourse({ dataset: { id: c.id } });
};

/* ---------- Checkout: labelled simulation; one enrolment per purchase; references kept ---------- */
const N1B_SIM = `<div class="note b-purple n1b-sim">${ic('info')}<div class="small"><strong>Prototype — simulated payment.</strong> No card is charged and no bank or card provider is contacted. Choosing "simulate a declined payment" shows a failed payment.</div></div>`;
let N1B_SEQ = 0;
// The payment confirmation of one purchase intent: runs once; refused while a live enrolment of the course exists
function n1bOnce(c, ok) {
  const w = W, intent = 'PI-' + w.me.id.slice(-5) + '-' + (++N1B_SEQ), np = (w.plans || []).length; let done = false;
  const who = () => `${chFullName(w)} (${w.me.id})`;
  return (...x) => {
    if (done) { logA('Short Courses', `${who()} · ${c.title}`, 'Blocked: duplicate payment confirmation', '—', '—', `Purchase ${intent} was already confirmed`); return; }
    done = true;
    const live = n1bLive(c); if (live) { logA('Short Courses', `${who()} · ${c.title}`, 'Blocked: second enrolment (already enrolled)', '—', '—', `Enrolment ${live.id} is ${live.status}; ${x[1] || 'the payment'} needs a refund review`); return; }
    const n0 = w.enrolments.length, r = ok(...x);
    const e = w.enrolments.length > n0 ? w.enrolments[0] : null;
    if (e && e.kind === 'short') {
      if (typeof cfIdFix === 'function') cfIdFix(np);
      const pl = (w.plans || []).find(p => p.e === e.id);
      e.n1b = Object.freeze({ intent, txRef: x[1] || null, at: now().toISOString(), accessDays: Math.round((Date.parse(e.end) - Date.parse(e.start)) / DAY), price: x[0] });
      if (pl && pl.rows && pl.rows[0]) pl.rows[0].txRef = x[1] || null;
      logA('Finance', `${who()} · ${e.title}`, 'Short course purchased (simulated payment)', '—', `${e.id} · Active until ${fd(e.end)}`, `${intent} · ${x[1] || '—'} · ${money(x[0], 'GBP')}`);
    }
    return r;
  };
}
const _coN1B = checkout;
checkout = function (o) {
  const c = o && typeof cfPaidCourse === 'function' ? cfPaidCourse(o.title) : null;
  let args = arguments;
  if (c && W && W.me && S.portal === 'learner' && o.onSuccess) args = [{ ...o, onSuccess: n1bOnce(c, o.onSuccess) }];
  const r = _coN1B.apply(this, args);
  if (MODAL && /Pay now/.test(MODAL.title || '') && typeof MODAL.body === 'string' && !/cd-sim|n1b-sim/.test(MODAL.body)) { MODAL.body = N1B_SIM + MODAL.body; renderModal(); }
  return r;
};
// The success dialog doesn't claim an email was sent
const _omN1B = openModal;
openModal = function (o) {
  if (o && o.title === 'Payment successful' && typeof o.body === 'string') o = { ...o, body: o.body.replace(/Thank you — your receipt has been emailed to [^<]*\./, 'Thank you. Your receipt is in Payments (prototype — no email is sent).') };
  return _omN1B.call(this, o);
};

/* ---------- The access period runs from the purchase, for the configured days ----------
   s1Enrol set the end with D(days), which counts from the demo's fixed date (4 Oct 2026), not from the purchase: bought on any other
   day (Demo controls time travel, or later), the access period was wrong — after 4 Oct + days it ended on purchase. */
const _enrolN1B = s1Enrol;
s1Enrol = function (c, row) {
  const n0 = W.enrolments.length, r = _enrolN1B.apply(this, arguments), e = W.enrolments.length > n0 ? W.enrolments[0] : null;
  if (e && e.kind === 'short' && row && e.courseId === row.id && e.start) { const days = +row.access > 0 ? +row.access : 90; e.end = new Date(Date.parse(e.start) + days * DAY).toISOString(); }
  return r;
};

/* ---------- A Payment Pending enrolment opens nothing ---------- */
const n1bPendE = id => { const e = id && typeof enrolById === 'function' ? enrolById(id) : null; return e && e.kind === 'short' && e.status === 'Payment Pending' ? e : null; };
[['openItem', el => el && el.dataset && el.dataset.e], ['startQuiz', el => el && el.dataset && el.dataset.id], ['vidPlay', () => (ui('vidCur') || [])[0]], ['scormFinish', el => el && el.dataset && el.dataset.e], ['shModPick', el => el && el.dataset && el.dataset.e]].forEach(([n, idOf]) => {
  const g = ACT[n]; if (typeof g !== 'function') return;
  ACT[n] = function (el) {
    const e = n1bPendE(idOf(el));
    if (e) { logA('Short Courses', `${chFullName(W)} (${W.me.id}) · ${e.title}`, 'Blocked: open course content (payment not confirmed)', '—', '—', `Enrolment ${e.id} is Payment Pending`); if (MODAL) closeModal(); toast('Your payment for this course is still being confirmed — the course opens when it is.', 'err'); return false; }
    return g.apply(this, arguments);
  };
});

/* ---------- Re-purchase and renewal: the course details first; a new enrolment from the current configuration ---------- */
repurchasePrice = function (e) { const c = n1bCatOfEnrol(e); return c ? c.price : e.price; };
const _repN1B = ACT.repurchase;
ACT.repurchase = el => {
  const e = el && el.dataset && el.dataset.id && W ? enrolById(el.dataset.id) : null;
  if (!e || e.kind === 'nvq') return _repN1B(el); // refused and logged there (MR-41)
  const c = n1bCatOfEnrol(e);
  if (c && n1bLive(c)) return _repN1B(el); // already enrolled: CF-D refuses and logs it
  if (!c) { logA('Short Courses', `${chFullName(W)} (${W.me.id}) · ${e.base || e.title}`, 'Blocked: re-purchase course (not on sale)', '—', '—', 'The course is not published'); toast(`${e.base || e.title} isn't on sale at the moment. Contact the Academy: ${academyContact()}`, 'err'); return false; }
  go('course-info', { id: c.id }); return true;
};
const _renewN1B = ACT.renewCert;
ACT.renewCert = el => {
  const ct = W && (W.certs || []).find(x => x.id === (el && el.dataset && el.dataset.id));
  if (!ct) return _renewN1B(el);
  if (typeof s1Sync === 'function') s1Sync();
  const c = CATALOGUE.find(x => x.kind === 'short' && (ct.course === x.title || String(ct.course).startsWith(x.title)));
  if (c && n1bLive(c)) return _renewN1B(el); // already enrolled: CF-D refuses and logs it
  if (!c) { logA('Short Courses', `${chFullName(W)} (${W.me.id}) · ${ct.course}`, 'Blocked: renew certificate (course not on sale)', '—', '—', 'The course is not published'); toast(`${ct.course} isn't on sale at the moment. Contact the Academy: ${academyContact()}`, 'err'); return false; }
  go('course-info', { id: c.id }); return true;
};

/* ---------- Visitors: browse the short courses and their details from the sign-in page ---------- */
const n1bPubList = () => { if (typeof s1Sync === 'function') s1Sync(); return CATALOGUE.filter(c => c.kind === 'short'); };
const _avN1B = authView;
authView = function () {
  if ((S.portal === 'learner' || !S.portal) && S.auth === 'catalogue') {
    const id = S.authCourse, c = id && n1bPubList().find(x => x.id === id);
    if (c) {
      const f = n1bFacts(c);
      return `<div class="n1b-pub"><div class="row-b"><button class="linklike small" data-act="n1bPub">← All short courses</button><button class="linklike small" data-act="authGo" data-a="signin">Sign in</button></div>
        <h1>${esc(c.title)}</h1><p class="muted">Short course · course details</p>${n1bDetails(f)}
        ${f.missing.length ? `<div class="note b-amber n1b-missing">${ic('alert')}<div><strong>This course can't be bought yet.</strong> The Academy hasn't set ${f.missing.join(', ')}.</div></div>` : `<div class="note b-blue">${ic('info')}<div><strong>To buy this course you need a learner account.</strong> Create one (we verify your email or mobile with a code) or sign in; you come back to this course to continue.<div class="b-act"><button class="btn btn-sm btn-primary" data-act="n1bPubReg" data-id="${esc(c.id)}">Create an account to buy</button><button class="btn btn-sm" data-act="n1bPubSignin" data-id="${esc(c.id)}">I have an account — sign in</button></div></div></div>`}</div>`;
    }
    return `<div class="n1b-pub"><div class="row-b"><h1>Short courses</h1><button class="linklike small" data-act="authGo" data-a="signin">Sign in</button></div><p class="muted">Look at what each course covers before you create an account.</p>
      <div class="grid">${n1bPubList().map(x => `<article class="card catalogue-card"><div class="row"><span class="typebadge">Short course</span><span class="small muted">${esc(x.dur || '')}</span></div><h3>${esc(x.title)}</h3><p class="small muted">${esc(x.desc || '')}</p><div class="row-b"><span class="strong num">${money(x.price, 'GBP')}</span><button class="btn btn-sm btn-primary" data-act="n1bPub" data-id="${esc(x.id)}">View details</button></div></article>`).join('') || '<p class="muted">No short courses are on sale.</p>'}</div></div>`;
  }
  return _avN1B.apply(this, arguments);
};
ACT.n1bPub = el => { S.portal = 'learner'; S.signedIn = false; S.auth = 'catalogue'; S.authCourse = (el && el.dataset && el.dataset.id) || null; S.authMsg = null; render(); };
ACT.n1bPubReg = el => { S.buyAfter = el.dataset.id; ACT.regStart(); };
ACT.n1bPubSignin = el => { S.returnTo = 'course-info.' + el.dataset.id; S.buyAfter = null; S.auth = 'signin'; S.authMsg = { tone: 'blue', html: 'Sign in to continue to the course you chose.' }; render(); };
AFTER.push(() => { if (S.signedIn || S.auth !== 'signin') return; const f = $('form[data-submit="signin"]'); if (f && !$('.n1b-pub-link')) f.insertAdjacentHTML('afterend', `<p class="small n1b-pub-link"><button type="button" class="linklike" data-act="n1bPub">Browse short courses</button> before you sign in or create an account.</p>`); });
// After registration and verification, the new learner goes back to the course they chose
const _fwN1B = ACT.finishWelcome;
ACT.finishWelcome = function () { const id = S.buyAfter; S.buyAfter = null; const r = _fwN1B.apply(this, arguments); if (id && n1bCat(id)) go('course-info', { id }); return r; };

UXC.push(['1B', 'Short-course purchase, access and repurchase — Welfare Academy email, point 1B (13 Nov 2026)', [
  'Browse → Course details (description, modules and content, study time, delivery, access period, completion and certificate, price, the questions asked) → Continue to purchase → the course\'s own questions (if any) → simulated checkout → access. Visitors can see the same details from the sign-in page; buying needs an account (they return to the course after verifying). A course missing an essential fact can\'t be bought.',
  'One confirmed payment makes one enrolment (transaction reference, purchase reference and access period recorded and audited); a second confirmation or a live enrolment refuses another. Re-purchase and Renew open the details and create a new enrolment from the course\'s current settings; earlier progress, attempts, completion, certificates and payments stay as they were. Request more time is unchanged.']]);
