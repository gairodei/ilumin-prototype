/* ============================================================
   Batch E-B — Access control, batch eligibility and integration (22 Oct 2026; PD-E-10…18 in PROVISIONAL-DECISIONS.md).
   Each rule is enforced in the action itself (direct calls included) and every refusal is logged:
   - IQA: only an IQA (in the admin portal) records, edits or closes findings and builds sample sets; nobody samples or decides on
     work in a batch where they hold an allocation (the existing conflict rule, now also when adding to a set and closing);
     a finding is edited only by its author and never after it is closed. IQA records now include every enrolled learner's
     marked work and completed observations (before: the seeded learners C and D only).
   - Agency: identity-correction requests, set-password resends and seat removals only for learners on the agency's own roster;
     seats only from the agency's own bundles, only to learners on its roster.
   - Batch eligibility (Add learner, waitlist offers): the programme must be Active; a learner who signed up must have completed
     their sign-up for that same programme; a learner with an NVQ enrolment on another programme can't join; the fee-option rule
     (W1) is unchanged.
   - G4: reject, return / request changes and decline join approve in the self-decision guard (nobody decides an item they
     raised); refusals before the dialog opens are logged too.
   - Stale links: a link to a record that no longer exists opens that screen's own list with a note — never another record and
     never a bare 404. Permission pages are unchanged.
   Loads last.
   ============================================================ */
'use strict';

const eDeny = (module, ent, what, why, msg) => { const who = S.portal === 'agency' && S.agy ? `Agency ${AGN()}` : ADMIN && ADMIN.me ? `${(ADMIN.me.roles || [])[0] || 'User'} ${ADMIN.me.name}` : 'User';
  if (ADMIN && ADMIN.security) ADMIN.security.unshift({ id: 'SE-E-' + (ADMIN.security.length + 1) + '-' + Date.now().toString(36), sev: 'High', at: now().toISOString(), type: 'Out-of-scope action', detail: `${who} attempted: ${what} — ${why}`, reviewed: false });
  logA(module, ent, 'Blocked: ' + what, '—', '—', why); toast((msg || why) + ' Attempt logged.', 'err'); return false; };

/* ---------- IQA ---------- */
const eIqaWhy = () => (isIqa() ? '' : 'Only an Internal Quality Assurer can do this, in the IQA workspace.');
['qRecord', 'qEditF', 'qClose', 'qAddOne', 'qNewSet', 'qFinalise', 'qRemove', 'qExport', 'qDupSet', 'qUseSet'].forEach(k => {
  const f = ACT[k]; if (typeof f !== 'function') return;
  ACT[k] = el => { const w = eIqaWhy(); if (w) return eDeny('IQA', (el && el.dataset && el.dataset.id) || '—', k, w); return f(el); };
});
const _editFE = ACT.qEditF;
ACT.qEditF = el => {
  const f = ADMIN.iqa.find(x => x.id === (el && el.dataset && el.dataset.id)); if (!f) return;
  if (f.by !== ADMIN.me.name) return eDeny('IQA Findings', f.id, 'edit an IQA finding', `Only the author (${f.by}) edits a finding`);
  if (f.status === 'Closed') return eDeny('IQA Findings', f.id, 'edit an IQA finding', 'The finding is closed');
  return _editFE(el);
};
const _closeFE = ACT.qClose;
ACT.qClose = el => {
  const f = ADMIN.iqa.find(x => x.id === (el && el.dataset && el.dataset.id)); if (!f) return;
  if (f.status === 'Closed') return eDeny('IQA Findings', f.id, 'close an IQA finding', 'Already closed');
  const cf = iqaConflict(fRec(f)); if (cf) return eDeny('IQA Findings', f.id, 'close an IQA finding', `${cf} — another IQA closes it`);
  return _closeFE(el);
};
const _addSetE = qAddToSet;
qAddToSet = function (ids) {
  const bad = (ids || []).map(recById).filter(r => r && iqaConflict(r));
  if (bad.length) return eDeny('IQA', bad.map(r => r.id).join(', '), 'add to a sample set', `${iqaConflict(bad[0])} (${bad[0].id}) — it can't be in your sample`);
  return _addSetE.apply(this, arguments);
};
// Every enrolled learner's marked work and completed observations (shape as for the seeded learners)
const _liveE = liveRecords;
liveRecords = function () {
  const out = _liveE.apply(this, arguments), have = new Set(out.map(r => r.id));
  Object.keys(STORE.worlds || {}).forEach(v => {
    if (v === 'C' || v === 'D') return; const w = STORE.worlds[v]; if (!w || !w.nvq || !w.signup || !w.signup.done) return;
    const pr = chProgOf(w), pk = pr && pr.level ? 'L' + String(pr.level).replace(/\D/g, '') : '—', batch = w.signup.batch || '—';
    (w.assignments || []).filter(a => ['Completed', 'Feedback Received', 'Resubmission Required'].includes(a.status) || a.qs.some(q => q.fb.length)).forEach(a => {
      const id = 'L-' + v + '-' + a.id; if (have.has(id)) return; const fbq = a.qs.filter(q => q.fb.length);
      out.push({ id, kind: 'sub', live: true, v, key: w.me.id + '~' + a.id, lid: w.me.id, learner: VNAME(v), programme: w.nvq.title, pk, batch, unit: (a.unit || '').split(' · ')[0], module: (a.unit || '').split(' · ')[1] || '', aid: a.id, title: a.title, assessor: a.assessor || (fbq[0] && fbq[0].fb[fbq[0].fb.length - 1].by) || '—', round: a.round, markedAt: D(0), exit: a.limit ? 'Limit reached' : a.qs.some(q => q.state === 'pd') ? 'Added to PD' : a.status === 'Resubmission Required' ? 'Resubmission requested' : 'Passed', met: a.qs.filter(q => q.state === 'met').length, notMet: a.qs.filter(q => ['rework', 'limit'].includes(q.state)).length, verified: a.qs.some(q => q.state === 'met'), type: 'Knowledge', crit: a.qs.map(q => q.crit), discontinued: w.nvq.status === 'Discontinued' });
    });
    (w.observations || []).filter(o => o.status === 'Completed' && o.report).forEach(o => {
      const id = 'L-' + v + '-' + o.id; if (have.has(id)) return;
      out.push({ id, kind: 'obs', live: true, v, oid: o.id, locType: o.locType, key: w.me.id + '~' + o.id, lid: w.me.id, learner: VNAME(v), programme: w.nvq.title, pk, batch, unit: String(o.scope || '').split(' ')[0], module: '', title: (o.dEvName || 'Workplace observation') + ' — ' + fd(o.at), assessor: o.signedBy || o.assessor, round: '—', markedAt: o.signed || o.at, exit: o.report.nvq.every(r => r[2] && r[3]) ? 'Passed' : 'Resubmission requested', met: o.report.nvq.filter(r => r[3]).length, notMet: o.report.nvq.filter(r => !r[3]).length, verified: true, type: 'Observation', crit: o.report.nvq.map(r => r[0]), postEntered: !!o.postEntered });
    });
  });
  return out;
};

/* ---------- Agency: own roster, own bundles ---------- */
['agCorrect', 'agResendPw', 'agUnassign'].forEach(k => {
  const f = ACT[k]; if (typeof f !== 'function') return;
  ACT[k] = el => { const id = el && el.dataset && (el.dataset.id || el.dataset.l); if (S.portal !== 'agency' || !S.agy || !id || !inRoster(id)) return eDeny('Agency', S.agy ? AGN() : '—', k + ' · ' + (id || '—'), 'This learner isn\'t on your agency\'s roster'); return f(el); };
});
const _assignEB = agyDoAssign;
agyDoAssign = function (b, course, ids) {
  if (!b || !agyBundles().some(x => x.id === b.id)) { eDeny('Agency seats', S.agy ? AGN() : '—', 'assign seats', `Bundle ${b ? b.id : '—'} isn't this agency's`); return 0; }
  const out = (ids || []).filter(id => !inRoster(id)); if (out.length) { eDeny('Agency seats', AGN(), 'assign seats', `Not on the agency's roster: ${out.join(', ')}`); return 0; }
  return _assignEB.apply(this, arguments);
};

/* ---------- Batch eligibility (Add learner, waitlist offers) ---------- */
function eEligWhy(b, lid) {
  if (!b) return 'Batch not found';
  const pr = (ADMIN.programmes || []).find(p => p.title === b.course);
  if (pr && pr.status !== 'Active') return `${pr.title} is ${pr.status} — it isn't taking new learners`;
  if (!lid) return '';
  const k = chWorldKey(lid), w = k ? STORE.worlds[k] : null;
  if (w && w.nvq && w.signup) {
    const own = chProgOf(w); if (pr && own && own.id && own.id !== pr.id) return `${chFullName(w)} signed up for ${own.title}, not ${pr.title}`;
    if (!w.signup.done) return `${chFullName(w)} hasn't completed their sign-up yet — they join a batch when it is completed`;
    return '';
  }
  const L = typeof learnerById === 'function' ? learnerById(lid) : null, titles = (ADMIN.programmes || []).map(p => p.title);
  const nvq = ((L && L._enr) || []).filter(e => titles.includes(e.title) && !['Withdrawn', 'Discontinued', 'Completed'].includes(e.status)).map(e => e.title);
  if (nvq.length && !nvq.includes(b.course)) return `${L.name} is enrolled on ${nvq[0]}, not ${b.course}`;
  return '';
}
const eWrapPrimary = (check) => { const a = MODAL && MODAL.actions && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); if (!a || !a.fn || a._e) return; const f = a.fn; a._e = true; a.fn = (...x) => { const w = check(); if (w) return w; return f(...x); }; };
const _addE = ACT.addToBatch;
ACT.addToBatch = (el, e) => {
  const b = (ADMIN.batches || []).find(x => x.code === (el && el.dataset && el.dataset.id)), r = _addE(el, e); if (!b || !MODAL || !/^Add learner/.test(MODAL.title || '')) return r;
  eWrapPrimary(() => { const lid = mval('#ab-l'), why = eEligWhy(b, lid); if (!why) return null; logA('Batches', `${b.label} (${b.code})`, 'Blocked: add a learner (not eligible)', '—', lid, why); fieldErr('#ab-l', why); return false; });
  return r;
};
const _offerE = ACT.kOffer;
ACT.kOffer = el => {
  const d = (el && el.dataset) || {}, b = (ADMIN.batches || []).find(x => x.code === d.id), ent = d.w1 && b && (b.w1wait || []).find(x => x.id === d.w1), why = b && ent ? eEligWhy(b, ent.lid) : b ? eEligWhy(b, null) : '';
  if (why) return eDeny('Batches', b ? `${b.label} (${b.code})` : '—', 'offer a waitlist place', why);
  return _offerE(el);
};

/* ---------- G4: every deciding verb is self-blocked; refusals are logged wherever they happen ---------- */
// The raiser can't reject, return or decline their own item either (approve-type verbs keep the existing guard and each
// module's routing rules, e.g. any Active Finance Admin decides payment terms — E1)
const E_SELF_VERBS = ['reject', 'return', 'decline'];
const eSelfVerb = (i, a) => !!(i && E_SELF_VERBS.includes(a) && !i._sa && isOpen(i) && i.type !== 'Super Admin own action' && isMine(i));
const _applyEB = applyDecision;
applyDecision = function (i, a) {
  if (eSelfVerb(i, a)) { logA('Approvals Queue', i.id, 'Blocked: self-approval', i.status, i.status, `${a} refused for ${ADMIN.me.name} (raised it)`); toast(refuseMsg(i), 'err'); return false; }
  return _applyEB.apply(this, arguments);
};
['qDo', 'e1Decide'].forEach(k => {
  const f = ACT[k]; if (typeof f !== 'function') return;
  ACT[k] = el => { const i = qItem(el && el.dataset && el.dataset.id), a = el && el.dataset && el.dataset.a;
    if (i && (decisionBlocked(i, a) || eSelfVerb(i, a))) { logA('Approvals Queue', i.id, 'Blocked: self-approval', i.status, i.status, `${a} refused for ${ADMIN.me.name}`); if (eSelfVerb(i, a)) { toast(refuseMsg(i), 'err'); return; } }
    return f(el); };
});

/* ---------- Stale links: the screen's own list, with a note — never another record, never a bare 404 ---------- */
const E_404 = /<p class="eyebrow">Error 404<\/p><h1>We can't find that page<\/h1>/;
const eGoneNote = (id) => `<div class="note b-blue e-gone" role="status" data-gone="${esc(id)}">${ic('info')}<div class="small"><strong>That record isn't available.</strong> The link was for ${esc(id)}, which isn't in this demo — records created in the demo are kept only until the page is reloaded. Nothing else has been opened in its place.</div></div>`;
Object.keys(SCREENS).forEach(route => {
  const f = SCREENS[route]; if (typeof f !== 'function' || route === 'a-programmes') return;
  SCREENS[route] = p => {
    const h = f(p); if (!(p && p.id) || !E_404.test(h)) return h;
    // the screen's own list, or (for a detail-only route such as a-learner) its list route a-learners
    let base = null, to = route;
    for (const r of [route, route + 's']) { const g = r === route ? f : SCREENS[r]; if (typeof g !== 'function') continue; try { const x = g({}); if (x && !E_404.test(x)) { base = x; to = r; break; } } catch (e) { /* try the next */ } }
    if (!base) return h;
    const id = p.id; S.params = {}; if (to !== route) S.route = to; try { history.replaceState(null, '', '#' + to); } catch (e) { /* sandboxed */ }
    return eAfterHead(base, eGoneNote(id));
  };
});

/* ---------- Records ---------- */
UXC.push(['E-B', 'Access control, batch eligibility and integration (22 Oct 2026)', [
  'IQA: only an IQA records, edits or closes findings and builds sample sets; nobody samples, records on or closes findings for work in a batch where they hold an allocation; a finding is edited only by its author and not once closed. Every enrolled learner\'s marked work and completed observations now reach the IQA records.',
  'Agency: correction requests, set-password resends, seat removals and seat assignments only for learners on the agency\'s own roster, from its own bundles.',
  'Batch eligibility: Add learner and waitlist offers need an Active programme; a learner who signed up joins only a batch of their own programme once their sign-up is complete; a learner enrolled on another programme can\'t join. Refusals are logged.',
  'G4: rejecting, returning or declining an item you raised is refused like approving it (each module routing rule is unchanged); refusals are logged even before the dialog opens.',
  'Stale links to records that no longer exist open that screen\'s list with a note instead of a 404 — never another record.']]);
