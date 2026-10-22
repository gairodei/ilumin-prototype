/* ============================================================
   Batch E-A — Programme lifecycle: archive (22 Oct 2026; PD-E-01…09 in PROVISIONAL-DECISIONS.md).
   A new, distinct lifecycle state. "Archived" is not Suspended (whose rules are still to be agreed) and not Retired (a closed
   historical record): an Archived programme stops taking anyone new, while everyone already on it carries on.
   - Archive: an Active programme only; the Super Administrator, an Academic Admin or a System Administrator (the programme
     administrators who publish), in the admin portal; a reason is required; the impact is shown first; audited, with history.
   - While Archived, refused in the action itself (logged), whatever the route: new sign-ups (Browse, a direct call, the
     sign-up payment of a sign-up not yet completed), new batches, adding a learner to a batch, waitlist offers and moves to
     the next intake, agency purchases of a bundle that includes it and agency seat assignment to it. The catalogue doesn't
     list it. The builder is read-only (no new versions, packages, letters, checklists or structure changes).
   - Unchanged for people already on it: batches, sessions, assignments and marking, observations, payments and reminders,
     certificates, signed letters, pinned terms, versions and financial history. Nothing is deleted or rewritten.
   - Reactivate: the Super Administrator only, with a reason, and only if the programme is still valid to sell — a published
     version, payment terms in force (an approved financial package for a package programme) and a current offer letter.
   Loads after d-wpc.js.
   ============================================================ */
'use strict';

const eArch = pr => !!pr && pr.status === 'Archived';
const eProgByTitle = t => (ADMIN.programmes || []).find(p => p.title === t) || null;
const eArchTitle = t => eArch(eProgByTitle(t));
const eCanArchive = () => S.portal === 'admin' && !!S.signedIn && typeof cbAdmin === 'function' && cbAdmin();
const eCanReactivate = () => S.portal === 'admin' && !!S.signedIn && isSA();
const eEnt = pr => `${pr.title} (${pr.id})`;
const eNo = (module, ent, what, why, msg) => { logA(module, ent, 'Blocked: ' + what, '—', '—', why); toast(msg || why, 'err'); return false; };
const eArchMsg = pr => `${pr.title} is archived — it isn't taking new enrolments.`;

/* ---------- Impact of archiving: who carries on, what stops ---------- */
function eImpact(pr) {
  const bs = (ADMIN.batches || []).filter(b => b.course === pr.title && !['Cancelled', 'Completed', 'Archived'].includes(b.status));
  const ws = Object.values(STORE.worlds || {}).filter(w => w && w.nvq && w.signup && chProgOf(w).id === pr.id);
  const roster = bs.reduce((n, b) => n + (b.roster || []).length + (b.coh || []).length, 0);
  return { batches: bs, learners: roster, done: ws.filter(w => w.signup.done).length, inProg: ws.filter(w => !w.signup.done), wait: bs.reduce((n, b) => n + (+b.wait || 0), 0),
    bundles: ((STORE.biz && STORE.biz.products) || []).filter(p => p.status === 'Published' && (p.courses || []).includes(pr.title)) };
}
// Reactivation needs the programme to be valid to sell again
function eReactWhy(pr) {
  const out = [];
  if (!(pr.archived && pr.archived.prev === 'Active') || !(pr.version >= 1)) out.push('it has no published version');
  if (typeof cb8Managed === 'function' && cb8Managed(pr) ? !cb8Cur(pr.id) : !s4PlanCur(pr.id)) out.push(cb8Managed(pr) ? 'no approved financial package is in force' : 'no payment terms are in force (Finance → Payment Plans)');
  if (!chLetterCur(pr.id)) out.push('there is no current offer letter');
  return out;
}

/* ---------- Archive / reactivate ---------- */
ACT.eArchive = el => {
  const pr = cbPr(el && el.dataset && el.dataset.id); if (!pr) return;
  if (!eCanArchive()) { s3Refuse('archive the programme', eEnt(pr)); return false; }
  if (pr.status !== 'Active') return eNo('NVQ Programmes', eEnt(pr), 'archive the programme', `Only an Active programme can be archived (this one is ${pr.status})`, `Only an Active programme can be archived — this one is ${pr.status}.`);
  const x = eImpact(pr);
  reasonDlg({ title: 'Archive ' + esc(pr.title), ok: 'Archive programme', danger: true, label: 'Reason (required)', body: `<div class="note b-amber">${ic('archive')}<div class="small"><strong>New enrolments stop. Everyone already on it carries on.</strong> No new sign-ups, batches, waitlist offers, agency purchases or seat assignments. Batches, sessions, assignments, observations, payments, certificates, signed letters and financial records continue unchanged. It can be reactivated later by the Super Administrator.</div></div>
    <dl class="kv e-impact"><dt>Active batches</dt><dd>${x.batches.length}${x.batches.length ? ` (${esc(x.batches.map(b => b.code).join(', '))})` : ''} — they continue</dd><dt>Learners on it</dt><dd>${x.learners + x.done} — they continue</dd><dt>Sign-ups not yet completed</dt><dd>${x.inProg.length}${x.inProg.length ? ' — they can\'t complete while archived; they are kept and can complete if it is reactivated' : ''}</dd><dt>Waitlisted</dt><dd>${x.wait}${x.wait ? ' — no places can be offered while archived' : ''}</dd><dt>Agency bundles that include it</dt><dd>${x.bundles.length}${x.bundles.length ? ' — not sold while archived' : ''}</dd></dl>`,
    onOk: r => {
      if (!eCanArchive() || pr.status !== 'Active') return false;
      const at = now().toISOString(), by = ADMIN.me.name;
      pr.archived = { at, by, reason: r, prev: pr.status, hist: ((pr.archived && pr.archived.hist) || []).concat([[at, by, 'Archived', r]]) };
      pr.status = 'Archived';
      logA('NVQ Programmes', eEnt(pr), 'Programme archived', 'Active', 'Archived', `${r} — ${x.batches.length} active batch(es), ${x.learners + x.done} learner(s) continue; ${x.inProg.length} sign-up(s) in progress paused`);
      x.inProg.forEach(w => { const v = Object.keys(STORE.worlds).find(k => STORE.worlds[k] === w); if (v) notifyLearner(v, 'Admissions', 'Programme not taking new enrolments', `${pr.title} has been archived, so your sign-up can't be completed for now. Nothing you have done is lost.`, 'admission'); });
      render(); toast('Archived. New enrolments stop; everyone already on it carries on.');
    } });
};
ACT.eReactivate = el => {
  const pr = cbPr(el && el.dataset && el.dataset.id); if (!pr) return;
  if (!eCanReactivate()) return eNo('NVQ Programmes', eEnt(pr), 'reactivate the programme', 'Only the Super Administrator reactivates an archived programme', 'Only the Super Administrator can reactivate an archived programme.');
  if (!eArch(pr)) return eNo('NVQ Programmes', eEnt(pr), 'reactivate the programme', `Not archived (${pr.status})`, 'This programme isn\'t archived.');
  const why = eReactWhy(pr);
  if (why.length) return eNo('NVQ Programmes', eEnt(pr), 'reactivate the programme', 'Not valid to sell: ' + why.join('; '), `Can't reactivate: ${why.join('; ')}.`);
  reasonDlg({ title: 'Reactivate ' + esc(pr.title), ok: 'Reactivate', label: 'Reason (required)', body: `<p class="small">It becomes Active again: open for sign-ups, batches, waitlist offers and agency purchases, on Version ${pr.version} and the terms in force.</p>`,
    onOk: r => {
      if (!eCanReactivate() || !eArch(pr) || eReactWhy(pr).length) return false;
      const at = now().toISOString(); pr.status = 'Active'; pr.archived.hist.push([at, ADMIN.me.name, 'Reactivated', r]); pr.archived.reactivated = { at, by: ADMIN.me.name, reason: r };
      logA('NVQ Programmes', eEnt(pr), 'Programme reactivated', 'Archived', 'Active', r); render(); toast('Reactivated — taking new enrolments again.');
    } });
};
[['eArchive'], ['eReactivate']].forEach(([n]) => { if (!CB_WRITE.includes(n)) CB_WRITE.push(n); }); // a retired programme refuses both (CB1)

/* ---------- The programme page: state, controls, read-only builder ---------- */
const _vbE = cbVerBar;
cbVerBar = function (pr, sec) {
  if (eArch(pr)) {
    const a = pr.archived || {};
    return `<div class="note b-grey cb-vb e-arch" role="status">${ic('archive')}<div class="small cb-vb-t"><strong>Archived — not taking new enrolments.</strong> Archived by ${esc(a.by || '—')} on ${a.at ? fd(a.at) : '—'}: ${esc(a.reason || '')}. Learners already on it carry on (Version ${pr.version}). The programme is read-only.</div>${eCanReactivate() ? `<div class="cb-vb-a"><button class="btn btn-sm" data-act="eReactivate" data-id="${pr.id}">Reactivate…</button></div>` : ''}</div>`;
  }
  const h = _vbE.apply(this, arguments);
  return pr.status === 'Active' && eCanArchive() && !cbRvKind(pr) ? h.replace(/(<div class="cb-vb-a">[\s\S]*?)(<\/div><\/div>)$/, `$1<button class="btn btn-sm btn-ghost" data-act="eArchive" data-id="${pr.id}">Archive…</button>$2`) : h;
};
const _panelsE = cbPanels;
cbPanels = function (pr) {
  const r = _panelsE.apply(this, arguments); if (!eArch(pr)) return r;
  return r.map(([k, l, f]) => [k, l, () => { const d = document.createElement('div'); d.innerHTML = f(); return cbReadOnly(d).innerHTML; }]);
};
// Every programme write action refuses an archived programme (the retired guard's list; logged)
CB_WRITE.filter(n => !['eArchive', 'eReactivate'].includes(n)).forEach(name => {
  const f = ACT[name]; if (typeof f !== 'function') return;
  ACT[name] = function (el) { const pr = cbPr(cbPidOf(name, el)); if (eArch(pr)) return eNo('NVQ Programmes', eEnt(pr), name + ' (programme archived)', 'Programme archived — read-only', 'This programme is archived, so it is read-only.'); return f.apply(this, arguments); };
});

/* ---------- New enrolments stop: catalogue, sign-up, batches, waitlist, agency ---------- */
const _catE = catCard;
catCard = function (c) { return c && c.kind === 'nvq' && eArchTitle(c.title) ? '' : _catE.apply(this, arguments); };
const _applyE = ACT.applyNvq;
ACT.applyNvq = el => {
  const c = CATALOGUE.find(x => x.id === (el && el.dataset && el.dataset.id)), pr = c && eProgByTitle(c.title);
  if (eArch(pr)) return eNo('Admissions', W && W.me ? `${chFullName(W)} (${W.me.id})` : '—', 'start sign-up', `${eEnt(pr)} is archived`, eArchMsg(pr));
  return _applyE(el);
};
// A sign-up not yet completed can't be paid / completed while its programme is archived
const eSuProg = w => (w && w.signup && !w.signup.done && w.nvq ? chProgOf(w) : null);
const _suPayE = ACT.suPay;
ACT.suPay = el => { const pr = eSuProg(W); if (eArch(pr)) return eNo('Admissions', `${chFullName(W)} (${W.me.id})`, 'complete sign-up', `${eEnt(pr)} is archived`, eArchMsg(pr) + ' Your sign-up is kept.'); return _suPayE(el); };
const _ccE = chComplete;
chComplete = function (w) { const pr = eSuProg(w); if (eArch(pr)) { eNo('Admissions', `${chFullName(w)} (${w.me.id})`, 'complete sign-up', `${eEnt(pr)} is archived`, eArchMsg(pr)); return false; } return _ccE.apply(this, arguments); };
// Batches: Create batch (the final step), Add learner, waitlist offers and moves
const _omE = openModal;
openModal = function (o) {
  if (o && /^Create batch — step 5 of 5/.test(o.title || '') && Array.isArray(o.actions)) {
    const a = o.actions.find(x => x.cls && /primary/.test(x.cls)), m = /<dt>Course<\/dt><dd>([\s\S]*?)<\/dd>/.exec(o.body || ''), pr = m && (ADMIN.programmes || []).find(p => esc(p.title) === m[1]);
    if (a && a.fn && pr) { const f = a.fn; a.fn = function () { if (eArch(pr)) { eNo('Batches', eEnt(pr), 'create batch', `${eEnt(pr)} is archived`, eArchMsg(pr) + ' No new batches.'); return false; } return f.apply(this, arguments); }; }
  }
  return _omE.apply(this, arguments);
};
const eBatch = el => (ADMIN.batches || []).find(x => x.code === (el && el.dataset && el.dataset.id)) || null;
['addToBatch', 'kOffer', 'kNextIntake'].forEach(k => {
  const f = ACT[k]; if (typeof f !== 'function') return;
  ACT[k] = (el, e) => { const b = eBatch(el), pr = b && eProgByTitle(b.course); if (eArch(pr)) return eNo('Batches', `${b.label} (${b.code})`, { addToBatch: 'add a learner', kOffer: 'offer a waitlist place', kNextIntake: 'move a waitlisted learner to the next intake' }[k], `${eEnt(pr)} is archived`, eArchMsg(pr)); return f(el, e); };
});
// Agency: bundles that include an archived programme aren't sold; seats aren't assigned to it
const eBundleArch = c => (c && c.courses || []).map(eProgByTitle).find(eArch) || null;
['agBuyDraw', 'agCheckout', 'agInvoiceForm'].forEach(n => {
  const f = window[n]; if (typeof f !== 'function') return;
  window[n] = function () { const pr = eBundleArch(S.agy && S.agy.buy && S.agy.buy.c); if (pr) { closeModal(); S.agy.buy = null; return eNo('Agency purchases', AGN(), 'buy a bundle', `Includes ${eEnt(pr)}, which is archived`, `This bundle includes ${pr.title}, which isn't taking new enrolments.`); } return f.apply(this, arguments); };
});
['agBuy', 'agBuyMore'].forEach(n => { const f = ACT[n]; if (typeof f !== 'function') return; ACT[n] = el => {
  const d = (el && el.dataset) || {}, prod = ((STORE.biz && STORE.biz.products) || []).find(p => p.id === (n === 'agBuy' ? d.id : ((ADMIN.bundles || []).find(b => b.id === d.b) || {}).cat)) || ((ADMIN.bundles || []).find(b => b.id === d.b) || null), pr = eBundleArch(prod);
  if (pr) return eNo('Agency purchases', AGN(), 'buy a bundle', `Includes ${eEnt(pr)}, which is archived`, `This bundle includes ${pr.title}, which isn't taking new enrolments.`);
  if (n === 'agBuy' && !AGY_CATALOGUE().some(c => c.id === d.id)) return eNo('Agency purchases', AGN(), 'buy a bundle', `Bundle ${d.id || '—'} isn't offered to this agency`, 'This bundle is not available.');
  return f(el); }; });
const _payResE = agPayResult;
agPayResult = function () { if (!S.agy || !S.agy.buy) return false; const pr = eBundleArch(S.agy && S.agy.buy && S.agy.buy.c); if (pr) { closeModal(); S.agy.buy = null; return eNo('Agency purchases', AGN(), 'buy a bundle', `Includes ${eEnt(pr)}, which is archived`, `This bundle includes ${pr.title}, which isn't taking new enrolments.`); } return _payResE.apply(this, arguments); };
const _catAgE = AGY_CATALOGUE;
AGY_CATALOGUE = function () { return _catAgE.apply(this, arguments).filter(c => !eBundleArch(c)); };
const _assignE = agyDoAssign;
agyDoAssign = function (b, course) { const pr = eProgByTitle(course); if (eArch(pr)) { eNo('Agency seats', AGN(), 'assign seats', `${eEnt(pr)} is archived`, eArchMsg(pr)); return 0; } return _assignE.apply(this, arguments); };

// Insert a note right after a page's header (DOM-based, so the header's own layout is untouched)
function eAfterHead(html, note) {
  const t = document.createElement('template'); t.innerHTML = html; const h = t.content.querySelector('.page-h');
  if (!h) return note + html; h.insertAdjacentHTML('afterend', note); return t.innerHTML;
}
// The learner whose sign-up is paused is told why, on their Admission page
const _admE = SCREENS.admission;
SCREENS.admission = p => {
  const h = _admE(p), pr = eSuProg(W); if (!eArch(pr)) return h;
  return eAfterHead(h, `<div class="note b-amber e-paused" role="status">${ic('archive')}<div class="small"><strong>${esc(pr.title)} isn't taking new enrolments at the moment.</strong> Your sign-up is kept exactly as it is, but it can't be completed or paid for now. If the programme reopens, you can continue from here. Contact the Academy if you have questions.</div></div>`);
};

/* ---------- Records ---------- */
UXC.push(['E-A', 'Programme lifecycle — archive (22 Oct 2026)', [
  'An Active programme can be archived by the Super Admin, an Academic Admin or a System Admin, with a reason, from the programme page ("Archive…"); the dialog shows what continues and what stops. Archived is its own state — not Suspended, not Retired.',
  'While archived, nothing new starts: it isn\'t in the catalogue; sign-ups can\'t start or be completed; no new batches, Add learner, waitlist offers or moves to the next intake; agency bundles that include it aren\'t sold and seats aren\'t assigned to it. Every refusal is logged, also for direct calls. The programme is read-only.',
  'Everyone already on it carries on: batches, sessions, assignments, observations, payments, reminders, certificates, signed letters, pinned terms and history are unchanged.',
  'Reactivation: the Super Administrator only, with a reason, and only when it is valid to sell again (a published version, payment terms in force, a current offer letter).']]);
