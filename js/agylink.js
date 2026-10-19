/* ============================================================
   Final decisions G9 — Agencies (loads after every portal file)
   G9.2 Linking an existing learner needs the learner's consent: consent email (learner demo inbox)
        + dashboard prompt; expires after 7 days without a response (agency notified).
        New course → consent alone completes the link (no queue item).
        Already-enrolled course → after consent, a queue item goes to the Business Admin.
        Agency statuses: Awaiting learner consent → Awaiting Academy approval (enrolled case only)
        → Linked / Declined / Expired.
   G9.3 A learner can belong to two agencies for different courses; the same course can't be
        sponsored by a second agency (the other agency is never named to the agency).
   G9.5 A rejected NVQ admission returns the agency seat ("Returned — admission rejected").
   G9.6 Bundle expiry notifies the agency, the Business Admin and the Super Admin.
   ============================================================ */
'use strict';

const CONSENT_DAYS = 7;
const SAME_COURSE_MSG = 'This learner is already sponsored for this course by another agency.';
const C_TONE = { 'Awaiting learner consent': 'amber', 'Awaiting Academy approval': 'blue', Linked: 'green', Declined: 'red', Expired: 'grey' };
const sameCourse = (a, b) => !!a && !!b && (a === b || a.startsWith(b) || b.startsWith(a));
const consentEnds = c => new Date(new Date(c.sent).getTime() + CONSENT_DAYS * DAY).toISOString();

/* ---------- G9.3 ---------- */
function agyOtherSponsor(L, course, ag = AGN()) {
  if (!L || !course) return false;
  if (STORE.agy.assign.some(x => x.lid === L.id && x.agency !== ag && sameCourse(x.course, course) && !['Unassigned', 'Rejected — seat returned'].includes(x.status))) return true;
  if (L.agency && L.agency !== ag && !L.v && (L.courses || []).some(c => sameCourse(c, course))) return true;
  return !!(L.v && STORE.worlds[L.v].enrolments.some(e => e.sponsor && e.sponsor !== ag && sameCourse(e.base || e.title, course) && e.status !== 'Unassigned'));
}
function agyEnrolledOn(L, course) {
  if (!L) return false;
  if (L.v) return STORE.worlds[L.v].enrolments.some(e => sameCourse(e.base || e.title, course) && !['Unassigned', 'Cancelled', 'Payment Pending'].includes(e.status));
  return (L.courses || []).some(c => sameCourse(c, course));
}

/* ---------- Store (seeded mocks; 7-day expiry applied on read) ---------- */
function agyLinkTo(ag, L, at) { (STORE.agy.linked[ag] = STORE.agy.linked[ag] || []).includes(L.id) || STORE.agy.linked[ag].push(L.id); STORE.agy.meta[L.id] = STORE.agy.meta[L.id] || { added: at, staffRef: '—' }; STORE.agy.meta[L.id].how = 'Linked'; }
function agyConsents() {
  const G = STORE.agy;
  if (!G.consents) {
    const CP = 'CarePlus Recruitment (demo)', byN = n => allLearners().find(l => l.name === n), A = STORE.worlds.A;
    const mk = (id, agency, n, course, sent, status, extra = {}) => { const L = typeof n === 'string' ? byN(n) : n; return L ? { id, agency, lid: L.id, learner: L.name, email: L.email, course, sent, status, note: '', ...extra } : null; };
    const aNew = (ADMIN.courses || []).filter(c => c.status === 'Published').map(c => c.title).find(t => !agyEnrolledOn(byN(VNAME('A')) || { v: 'A' }, t)) || 'Fire Safety Awareness';
    G.consents = [
      mk('CON-01', CP, 'Jack Thompson', 'Fire Safety Awareness', D(-2, '10:00'), 'Awaiting learner consent'),
      mk('CON-02', CP, 'Harry Walsh', 'Dementia Awareness', D(-12, '09:30'), 'Linked', { answered: D(-11, '18:40') }),
      mk('CON-03', CP, 'Ruby Clarke', 'Medication Awareness', D(-9, '11:00'), 'Declined', { answered: D(-8, '20:10'), by: 'learner' }),
      mk('CON-04', CP, 'Megan Roberts', 'Moving and Handling People', D(-14, '09:00'), 'Expired', { answered: D(-7, '09:00') }),
      mk('CON-05', CP, 'Sunil Menon', 'Dementia Awareness', D(-20, '12:00'), 'Linked', { answered: D(-19, '08:15'), note: 'Works nights for us as well as for Gulf Care.' }),
      mk('CON-06', 'Hartwell Home Care (demo)', { id: A.me.id, name: VNAME('A'), email: A.me.email }, aNew, D(-1, '14:00'), 'Awaiting learner consent', { v: 'A' }),
    ].filter(Boolean);
    ADMIN.queue.filter(i => i.type === 'Link existing learner to agency' && i.data && i.data.consentId).forEach(i => G.consents.push({ id: i.data.consentId, agency: i.data.agency, lid: i.data.lid, learner: i.related[0].split(' → ')[0], email: i.data.email, course: i.data.course, sent: new Date(new Date(i.data.consentAt).getTime() - DAY).toISOString(), answered: i.data.consentAt, status: isOpen(i) ? 'Awaiting Academy approval' : i.status === 'Approved' ? 'Linked' : 'Declined', qid: i.id }));
    G.consents.filter(c => c.status === 'Linked').forEach(c => { const L = learnerById(c.lid); if (L) agyLinkTo(c.agency, L, c.answered); });
    G.consents.filter(c => c.status === 'Awaiting learner consent').forEach(consentMail);
    G.notifs.push({ id: 'GN-K1', agency: CP, t: 'Link request expired', b: `${(G.consents.find(c => c.id === 'CON-04') || {}).email} · Moving and Handling People — no response in ${CONSENT_DAYS} days`, at: D(-7, '09:00'), go: 'g-learners', unread: false, cat: 'Learners' });
  }
  G.consents.forEach(c => { if (c.status === 'Awaiting learner consent' && agNow() - new Date(c.sent) >= CONSENT_DAYS * DAY) { c.status = 'Expired'; c.answered = consentEnds(c); STORE.agy.lmails.filter(m => m.cid === c.id).forEach(m => { m.used = true; m.btn = ''; }); agyNotify('Link request expired', `${c.email} · ${c.course} — no response in ${CONSENT_DAYS} days`, 'g-learners', 'Learners', c.agency); } });
  return G.consents;
}

/* ---------- Agency raises a request → consent email + learner notification ---------- */
function consentMail(c) {
  STORE.agy.lmails.unshift({ id: 'LM-K' + c.id, kind: 'consent', cid: c.id, lid: c.lid, name: c.learner, email: c.email, agency: c.agency, by: 'Illumin Academy', sent: c.sent, used: false,
    subj: `${c.agency} wants to sponsor you for ${c.course}`,
    html: `<p>Dear ${esc(c.learner.split(' ')[0])},</p><p><strong>${esc(c.agency)}</strong> wants to sponsor you for <strong>${esc(c.course)}</strong>. Approve or decline below.</p><p>If you approve, ${esc(c.agency)} will see your progress, Pass / Fail result and certificate (with expiry date) for courses it sponsors — never your self-paid courses.</p><p class="small">This request expires on ${fd(consentEnds(c))}.</p>`,
    btn: `<button class="btn btn-primary" data-act="consentDo" data-id="${c.id}" data-y="1">Approve</button> <button class="btn" data-act="consentDo" data-id="${c.id}" data-y="0">Decline</button>` });
}
function agyRequestConsent(L, key, course, note, ag = AGN()) {
  if (L && agyOtherSponsor(L, course, ag)) return { err: SAME_COURSE_MSG };
  if (agyConsents().some(c => c.agency === ag && c.lid && L && c.lid === L.id && sameCourse(c.course, course) && ['Awaiting learner consent', 'Awaiting Academy approval'].includes(c.status))) return { err: 'A request for this learner and course is already open.' };
  const c = { id: 'CON-' + (10 + STORE.agy.consents.length), agency: ag, lid: L ? L.id : null, learner: L ? L.name : key, email: L ? L.email : key, course, sent: agNow().toISOString(), status: 'Awaiting learner consent', note: note || '', v: L && L.v };
  STORE.agy.consents.unshift(c); consentMail(c);
  if (L && L.v) notifyLearner(L.v, 'Account', `${ag} wants to sponsor you`, `${ag} wants to sponsor you for ${course}. Approve or decline on your dashboard.`, 'dashboard');
  ADMIN.audit.unshift({ id: 'AU-' + (9960 + ADMIN.audit.length), actor: S.portal === 'agency' ? AG_CONTACT() : ag, role: 'Agency Administrator', at: now().toISOString(), module: 'Agency learners', entity: c.id, action: 'Link consent requested', before: '—', after: course, reason: note || '—', ip: '86.12.44.10' });
  agyNotify('Consent request sent', `${c.email} · ${course} — the learner has ${CONSENT_DAYS} days to respond`, 'g-learners', 'Learners', ag);
  return c;
}

/* ---------- Learner responds (email button or dashboard prompt) ---------- */
ACT.consentDo = el => {
  const c = agyConsents().find(x => x.id === el.dataset.id);
  if (!c || c.status !== 'Awaiting learner consent') { toast('This request is no longer open.', 'info'); return; }
  const yes = el.dataset.y === '1', L = c.lid ? learnerById(c.lid) : null, at = now().toISOString(); c.answered = at;
  STORE.agy.lmails.filter(m => m.cid === c.id).forEach(m => { m.used = true; m.btn = ''; m.html += `<p class="small"><strong>You ${yes ? 'approved' : 'declined'} this request on ${fdt(at)}.</strong></p>`; });
  if (!yes) { c.status = 'Declined'; c.by = 'learner'; agyNotify('Link request declined', `${c.email} declined sponsorship for ${c.course}.`, 'g-learners', 'Learners', c.agency); }
  else if (L && agyEnrolledOn(L, c.course)) {
    c.status = 'Awaiting Academy approval'; const id = 'AQ-' + (5200 + ADMIN.queue.length); c.qid = id;
    ADMIN.queue.unshift({ id, type: 'Link existing learner to agency', raisedBy: c.agency, raised: at, status: 'Pending', first: 'Sophie Turner', related: [`${c.learner} → ${c.agency}`, 'a-learner.' + c.lid], notes: [], history: [[c.agency, c.sent, 'Raised', c.note || 'Consent requested'], [c.learner, at, 'Learner consented', c.course]], reason: c.note || 'Learner consented to sponsorship', data: { lid: c.lid, agency: c.agency, email: c.email, course: c.course, consentAt: at, consentId: c.id } });
    if (typeof bizNotify === 'function') bizNotify('Agency link awaiting approval', `${id} · ${c.learner} → ${c.agency} (${c.course}) — learner consented`, 'a-queue.' + id, 'Approvals');
    agyNotify('Learner consented — awaiting Academy approval', `${c.email} · ${c.course}`, 'g-learners', 'Learners', c.agency);
  } else {
    c.status = 'Linked'; if (L) agyLinkTo(c.agency, L, at);
    agyNotify('Learner linked', `${c.email} approved sponsorship for ${c.course}.`, 'g-learners', 'Learners', c.agency);
  }
  logA('Agencies', c.id, yes ? 'Learner consented to agency link' : 'Learner declined agency link', 'Awaiting learner consent', c.status, c.course);
  render(); toast(!yes ? `Declined. ${c.agency} has been told.` : c.status === 'Linked' ? `You're now linked to ${c.agency} for ${c.course}.` : `Thanks — the Academy will confirm the link with ${c.agency}.`);
};
const _dashK = SCREENS.dashboard;
SCREENS.dashboard = p => {
  const h = _dashK(p); if (!STORE.agy || !W || !W.me) return h;
  const mine = agyConsents().filter(c => c.status === 'Awaiting learner consent' && c.lid === W.me.id);
  return mine.map(c => `<div class="note b-blue" role="status">${ic('users')}<div><strong>${esc(c.agency)} wants to sponsor you for ${esc(c.course)}.</strong> <span class="small">If you approve, they'll see your progress, Pass / Fail result and certificate for courses they sponsor — never your self-paid courses. Respond by ${fd(consentEnds(c))}.</span><div class="row" style="margin-top:8px"><button class="btn btn-sm btn-primary" data-act="consentDo" data-id="${c.id}" data-y="1">Approve</button><button class="btn btn-sm" data-act="consentDo" data-id="${c.id}" data-y="0">Decline</button></div></div></div>`).join('') + h;
};

/* ---------- Agency portal card + Business Admin decision ---------- */
function consentCard(list) {
  return `<section class="card"><h2>Link requests</h2><ul class="list">${list.map(c => `<li class="li"><div class="li-b"><strong class="small">${esc(c.email || c.learner)}</strong><span class="xs muted">${esc(c.course)} · requested ${fd(c.sent)}${c.status === 'Awaiting learner consent' ? ' · expires ' + fd(consentEnds(c)) : c.answered ? ' · ' + fd(c.answered) : ''}${c.status === 'Declined' && c.by ? ` · declined by ${c.by === 'Academy' ? 'the Academy' : 'the learner'}` : ''}</span></div>${chip(c.status, C_TONE[c.status])}</li>`).join('')}</ul><p class="xs muted">Awaiting learner consent → Awaiting Academy approval (only when the learner is already enrolled on the course) → Linked, Declined or Expired (no response in ${CONSENT_DAYS} days).</p></section>`;
}
const _applyLK = applyDecision;
applyDecision = function (i, a, r, o) {
  _applyLK(i, a, r, o);
  if (i.type === 'Link existing learner to agency' && i.data && i.data.consentId && ['approve', 'reject'].includes(a) && STORE.agy) { const c = agyConsents().find(x => x.id === i.data.consentId); if (c) { c.status = a === 'approve' ? 'Linked' : 'Declined'; if (a === 'reject') c.by = 'Academy'; c.answered = now().toISOString(); } }
  if (i.type === 'Admission application' && a === 'reject') agyAdmSync();
};

/* ---------- G9.5 real admission rejection → seat returned ---------- */
function agySeatReturn(a) {
  const b = ADMIN.bundles.find(x => x.id === a.bundle); if (!b) return;
  a.status = 'Rejected — seat returned'; b.used = Math.max(0, b.used - 1);
  STORE.agy.ledger.push({ bundle: b.id, agency: b.agency, at: agNow().toISOString(), type: 'Returned', qty: 1, learner: a.learner, ref: 'Returned — admission rejected' });
  ADMIN.ledger.unshift({ agency: b.agency, bundle: b.id, at: now().toISOString(), kind: 'Credit', qty: 1, note: `Seat returned — NVQ admission rejected (${a.learner})` });
  agyNotify('NVQ admission rejected — seat returned', `${a.learner}: 1 seat returned to ${b.name}.`, 'g-bundle.' + b.id, 'Courses & certificates', a.agency);
}
// Each agency NVQ seat waiting on admission has a matching application in Admissions
const _allAppsK = allApplications;
allApplications = function () {
  const out = _allAppsK();
  if (STORE.agy && ADMIN.apps && !ADMIN._agyApps) { ADMIN._agyApps = true; const tpl = ADMIN.apps.find(x => x.status === 'Under Review'); STORE.agy.assign.filter(x => x.kind === 'nvq' && ['Admission pending', 'Under review'].includes(x.status)).forEach((x, k) => { if (!tpl) return; const ap = JSON.parse(JSON.stringify(tpl)); Object.assign(ap, { id: 'APP-23' + (10 + k), name: x.learner, programme: x.course, ref: 'Agency — ' + x.agency, applied: x.at, status: x.status === 'Under review' ? 'Under Review' : 'Pending — Documents Required', days: 2 + k, escalated: false, agySeat: x.id }); ADMIN.apps.push(ap); out.push(ap); }); }
  return out;
};
function agyAdmSync() { (ADMIN.apps || []).filter(ap => ap.agySeat && ap.status === 'Rejected').forEach(ap => { const s = STORE.agy.assign.find(x => x.id === ap.agySeat); if (s && ['Admission pending', 'Under review'].includes(s.status)) agySeatReturn(s); }); }
ACT.appReject = (_ar => el => { _ar(el); const m = MODAL, act = m && m.actions.find(x => x.fn && x.cls && /danger|primary/.test(x.cls)); if (act) { const f = act.fn; act.fn = (...x) => { const r = f(...x); agyAdmSync(); return r; }; } })(ACT.appReject);
ACT.agySimReject = () => { const ap = allApplications().find(x => x.agySeat && x.status !== 'Rejected' && (STORE.agy.assign.find(s => s.id === x.agySeat) || {}).agency === (S.portal === 'agency' ? AGN() : 'CarePlus Recruitment (demo)')); if (!ap) { toast('No NVQ admission in progress.', 'info'); return; } ap.status = 'Rejected'; logA('Admissions', ap.id, 'Application rejected', 'Under Review', 'Rejected', 'Demo'); agyAdmSync(); render(); toast(`Demo only: ${ap.name}'s admission (${ap.id}) was rejected in Admissions. The seat returned to the bundle.`, 'info'); };

/* ---------- G9.6 bundle expiry → Business Admin and Super Admin notified too ---------- */
function agyAdminExpiry(t, b, agency, at) {
  const tt = 'Agency bundle: ' + t.charAt(0).toLowerCase() + t.slice(1), bb = `${agency} · ${b}`;
  if (STORE.biz) STORE.biz.notifs.unshift({ id: 'BN-X' + Date.now() + Math.random().toString(36).slice(2, 5), t: tt, b: bb, at: at || now().toISOString(), go: 'b-licences', unread: true, cat: 'Bundles', to: 'all' });
  const sa = ADMIN._saNotifs || (isSA() ? ADMIN.myNotifs : null); if (sa) sa.unshift({ t: tt, b: bb, at: at || now().toISOString(), unread: true, go: 'a-bundles' });
}
const _agyNotifyK = agyNotify;
agyNotify = function (t, b, go, cat, agency) { _agyNotifyK(t, b, go, cat, agency); if (/^(Bundle expiring|Seats lapsed)/.test(t)) agyAdminExpiry(t, b, agency || AGN()); };
// Seeded: the existing CarePlus expiry notice reached the admins as well
AFTER.unshift(() => { if (!STORE.agy || !ADMIN || ADMIN._agyExpSeed) return; ADMIN._agyExpSeed = true; STORE.agy.notifs.filter(n => /^Bundle expiring/.test(n.t)).forEach(n => agyAdminExpiry(n.t, n.b, n.agency, n.at)); });

/* ---------- G12.5 notifications for the new flows (data request nearing deadline; reactivation decision) ---------- */
AFTER.push(() => {
  if (!ADMIN || !ADMIN.dsr || typeof sysNotify !== 'function') return;
  ADMIN.dsr.filter(d => d.status === 'Open' && !d._near && dsrLeft(d) <= 7).forEach(d => { d._near = true; sysNotify('Data request nearing deadline', `${d.id} · ${d.type} · ${d.who} — due ${fd(dsrDue(d))} (${Math.max(0, dsrLeft(d))} days left)`, 'a-dataprotection..dsr'); const sa = ADMIN._saNotifs || (isSA() ? ADMIN.myNotifs : null); if (sa) sa.unshift({ t: 'Data request nearing deadline', b: `${d.id} · ${d.who} — due ${fd(dsrDue(d))}`, at: now().toISOString(), unread: true, go: 'a-dataprotection..dsr' }); });
});
const _applyR = applyDecision;
applyDecision = function (i, a, r, o) {
  _applyR(i, a, r, o);
  if (i.type === 'Reactivate enrolment — academic' && ['approve', 'reject'].includes(a) && STORE.tas) STORE.tas.notifs.unshift({ id: 'tn' + Date.now() + Math.random().toString(36).slice(2, 5), t: `Reactivation ${a === 'approve' ? 'approved' : 'rejected'}`, b: `${i.id} · ${i.related[0]}${a === 'reject' && r ? ' — ' + r : ''}`, at: now().toISOString(), go: 't-students', unread: true, cat: 'Approvals', to: i.raisedBy });
};
