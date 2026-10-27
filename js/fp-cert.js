/* ============================================================
   Batch FP — Part B: optional digital certificate per short course (27 Oct 2026).
   Before: every short course issued a certificate when its completion rules were met (shComplete, with the S1 template,
   validity and reminders; the agency "simulate completion" did the same). There was no way to turn it off.
   Now each short course says "Certificate on completion": Yes (the existing certificate, only when every completion rule
   is met — nothing is issued early) or No (the course is completed, no certificate is issued).
   - Default: Yes for every existing and new short course, so no promised certificate is withdrawn.
   - Versioned like the rest of the course (S1): a change is a new course version, audited with a reason, and applies to
     NEW enrolments only. An enrolment follows the setting in force when the learner enrolled (pinned at purchase;
     older enrolments resolve from the setting history by their enrolment date, i.e. Yes).
   - Certificates already issued and completion records are never touched. NVQ certificates are out of scope (no change).
   Loads after fp-pay.js, before fx-fixtures.js.
   ============================================================ */
'use strict';

// The course's current setting (no flag = Yes: the behaviour before FP) and its history of changes
const fcOn = sp => !(sp && sp.certOn === false);
const fcRowOf = e => (e && e.courseId && s1Row(e.courseId)) || (ADMIN.courses || []).find(c => c.title === (e && (e.base || String(e.title || '').replace(/ — \d{4}$/, ''))));
const fcRowByTitle = t => (ADMIN.courses || []).find(c => c.title === t);
// The setting in force at a moment (an enrolment date): the last change on or before it, else what applied before any change
function fcOnAt(row, at) {
  if (!row) return true; const sp = s1Spec(row), h = sp.certHist || [];
  const t = at ? new Date(at).getTime() : Infinity, last = h.filter(x => new Date(x.at).getTime() <= t).slice(-1)[0];
  return last ? last.on : h.length ? h[0].was : fcOn(sp);
}
// An enrolment's own answer: pinned at purchase, else by its enrolment date
const fcOnE = e => (!e || e.kind !== 'short' ? true : typeof e.certOn === 'boolean' ? e.certOn : fcOnAt(fcRowOf(e), e.enrolled));
const fcTxt = on => (on ? 'Yes — a digital certificate is issued when every completion requirement is met' : 'No — no certificate is issued for this course');
const fcLbl = on => (on ? 'Yes' : 'No');

/* ---------- Pinned at purchase ---------- */
const _enrolFC = s1Enrol;
s1Enrol = function (c, row) {
  const r = _enrolFC.apply(this, arguments), e = W.enrolments.find(x => x.courseId === row.id);
  if (e && typeof e.certOn !== 'boolean') Object.assign(e, { certOn: fcOn(s1Spec(row)), certV: row.version });
  return r;
};

/* ---------- Completion: a "No" course completes without a certificate; "Yes" is the existing rule unchanged ---------- */
const _shCompFC = shComplete;
shComplete = function (e) {
  if (!e || e.kind !== 'short' || e.status === 'Completed' || !e.reqs || !e.reqs.length || !e.reqs.every(([, ok]) => ok) || fcOnE(e)) return _shCompFC.apply(this, arguments);
  const at = now().toISOString(); Object.assign(e, { status: 'Completed', progress: 100, completedAt: at, noCert: true });
  W.notifs.unshift({ id: 'nc' + Date.now(), cat: 'Courses', title: 'Course completed', body: `You completed ${e.title}. This course doesn't issue a certificate.`, at, go: `course.${e.id}`, unread: true });
};
// Agency "simulate completion": the same rule for the seat's course
const _simFC = ACT.agySimComplete;
ACT.agySimComplete = () => {
  const name = S.portal === 'agency' ? AGN() : 'CarePlus Recruitment (demo)';
  const a = agyAssign(name).filter(x => x.status === 'Active' && x.kind === 'short').sort((x, y) => (learnerById(y.lid).v ? 1 : 0) - (learnerById(x.lid).v ? 1 : 0))[0];
  if (!a) return _simFC();
  const L = learnerById(a.lid), w = L.v && STORE.worlds[L.v], e = w && a.enrolId ? w.enrolments.find(x => x.id === a.enrolId) : null;
  if (e ? fcOnE(e) : fcOnAt(fcRowByTitle(a.course), a.at)) return _simFC();
  const at = agNow().toISOString(); Object.assign(a, { status: 'Completed', progress: 100, quiz: { used: 1, max: 3, result: 'Pass' }, noCert: true });
  if (e) { Object.assign(e, { status: 'Completed', progress: 100, completedAt: at, noCert: true }); notifyLearner(L.v, 'Courses', 'Course completed', `You completed ${e.title}. This course doesn't issue a certificate.`, 'courses'); }
  agyNotify('Learner completed a course', `${a.learner} completed ${a.course} (no certificate for this course).`, 'g-learner.' + a.lid, 'Courses & certificates', a.agency);
  render(); toast(`Demo only: ${a.learner} completed ${a.course}. This course doesn't issue a certificate.`, 'info');
};

/* ---------- Admin: the setting on the Certificate tab; shown on Details, Completion rules, Validity and when publishing ---------- */
const fcField = sp => `<section class="card fc-set"><fieldset class="stack" style="border:0;padding:0"><legend class="lbl">Certificate on completion</legend>${[true, false].map(on => `<label class="check"><input type="radio" name="fc-on" value="${on ? 'yes' : 'no'}" ${fcOn(sp) === on ? 'checked' : ''}><span><strong>${fcLbl(on)}</strong><br><span class="small muted">${on ? 'A digital certificate is available when the learner has met every completion requirement — never earlier.' : 'Learners complete the course, but no certificate is issued.'}</span></span></label>`).join('')}</fieldset><p class="xs muted">Saving creates a new course version. It applies to new enrolments; learners already enrolled keep the setting in force when they enrolled, and certificates already issued are never changed.</p></section>`;
const fcNote = (sp, extra = '') => `<div class="note ${fcOn(sp) ? 'b-blue' : 'b-grey'} fc-note">${ic('award')}<div class="small"><strong>Certificate on completion: ${fcLbl(fcOn(sp))}.</strong> ${fcOn(sp) ? 'A digital certificate is issued when every completion requirement is met.' : 'No certificate is issued for this course.'}${extra}</div></div>`;
const _ceFC = courseEditor;
courseEditor = function (id, t) {
  let h = _ceFC.apply(this, arguments); const c = s1Row(id); if (!c) return h; const sp = s1Spec(c), st = subtabs(S1_TABS, t || 'details', 'a-courses', c.id), k = h.indexOf(st);
  h = h.replace(`<span class="chip`, `${chip('Certificate: ' + fcLbl(fcOn(sp)), fcOn(sp) ? 'blue' : 'grey')} <span class="chip`);
  if (k < 0) return h; const at = h.indexOf(st) + st.length;
  const add = { certificate: fcField(sp) + (fcOn(sp) ? '' : `<div class="note b-amber fc-unused">${ic('info')}<div class="small">The template below isn't used while this course issues no certificate. It is kept for when the setting is Yes again.</div></div>`),
    details: fcNote(sp, ' Change it on the Certificate tab.'), completion: fcNote(sp, fcOn(sp) ? ' Issued only when every rule ticked below is met.' : ' Meeting these rules completes the course.'),
    validity: fcOn(sp) ? '' : fcNote(sp, ' Validity and expiry reminders apply only to courses that issue a certificate.') }[t || 'details'] || '';
  return h.slice(0, at) + add + h.slice(at);
};
// Completion rules: the line about the certificate follows the setting
const _s1CompFC = s1Completion; s1Completion = function (c, sp) { const h = _s1CompFC.apply(this, arguments); return fcOn(sp) ? h : h.replace('; the certificate is then issued.', '. No certificate is issued for this course.'); };
// Saving the Certificate tab saves the setting too (same version, reason and audit as the rest of the tab); refused for roles that can't edit courses
const fcWrapDlg = (wrap, fn) => { const _rd = reasonDlg; reasonDlg = o => _rd(wrap(o)); try { return fn(); } finally { reasonDlg = _rd; } };
const _s1SaveFC = ACT.s1Save;
ACT.s1Save = el => {
  if (el.dataset.t !== 'certificate') return _s1SaveFC(el);
  const c = s1Row(el.dataset.id); if (!c) return; const sp = s1Spec(c);
  if (!s1Can()) { s1Log(c, 'Blocked: certificate setting', fcLbl(fcOn(sp)), '—', 'Only the Super Administrator, a System Admin or an Academic Admin can change a short course'); toast('Only the Super Administrator, a System Admin or an Academic Admin can change a short course.', 'err'); return; }
  const pick = document.querySelector('input[name="fc-on"]:checked'); if (!pick) { toast('Choose whether this course issues a certificate on completion.', 'err'); return; }
  const was = fcOn(sp), on = pick.value === 'yes';
  return fcWrapDlg(o => ({ ...o, body: o.body + (on !== was ? `<p class="small fc-chg"><strong>Certificate on completion: ${fcLbl(was)} → ${fcLbl(on)}.</strong> ${on ? 'New enrolments get a certificate when they complete.' : 'New enrolments complete without a certificate.'} Learners already enrolled keep ${was ? 'their certificate eligibility' : 'the setting they enrolled with'}; issued certificates don't change.</p>` : ''),
    onOk: r => { o.onOk(r); if (on === was) return; const at = now().toISOString(); sp.certOn = on; (sp.certHist = sp.certHist || []).push({ at, was, on, v: c.version, by: ADMIN.me.name }); s1Keep(c); s1Log(c, `Certificate on completion changed — version ${c.version}`, fcLbl(was), fcLbl(on), r); s1Sync(); render(); } }), () => _s1SaveFC(el));
};
// Publishing (the review step) states the choice
const _pubFC = ACT.pubCourse;
ACT.pubCourse = el => { const c = s1Row(el && el.dataset && el.dataset.id); if (!c) return _pubFC(el); const sp = s1Spec(c); return fcWrapDlg(o => ({ ...o, body: (o.body || '') + `<p class="small fc-pub">Certificate on completion: <strong>${esc(fcTxt(fcOn(sp)))}</strong>.</p>` }), () => _pubFC(el)); };
// New courses start with the default written down (Yes), so the choice is explicit from the first version
const _newFC = ACT.newCourse;
ACT.newCourse = el => { const n = ADMIN.courses.length, r = _newFC(el), c = ADMIN.courses[n]; if (c && c.id) { const sp = s1Spec(c); if (sp.certOn == null) sp.certOn = true; } return r; };

/* ---------- Learner: Browse, the course overview, the Certificate tab and the quiz result ---------- */
const _syncFC = s1Sync;
s1Sync = function () { const r = _syncFC.apply(this, arguments); CATALOGUE.forEach(x => { const row = x.kind === 'short' && x.course && s1Row(x.course); if (row) x.cert = fcOn(s1Spec(row)); }); return r; };
const _catFC = catCard;
catCard = function (c) { const h = _catFC.apply(this, arguments); return c && c.kind === 'short' && c.cert === false ? h.replace(/<span class="xs muted">Certificate validity: [^<]*<\/span>/, '<span class="xs muted fc-cat">No certificate on completion</span>') : c && c.kind === 'short' && c.cert ? h.replace(/(<span class="xs muted">)(Certificate validity: [^<]*)(<\/span>)/, '$1Certificate on completion · $2$3') : h; };
const _ovFC = shortOverview;
shortOverview = function (e) {
  const h = _ovFC.apply(this, arguments); if (fcOnE(e)) return h;
  return h.replace(/<dt>Certificate validity<\/dt><dd>[^<]*<\/dd>/, '<dt>Certificate</dt><dd>Not issued for this course</dd>').replace('<h3>Completion requirements</h3>', '<h3>Completion requirements</h3><p class="small muted fc-ov">Meeting these completes the course. This course doesn\'t issue a certificate.</p>');
};
const _certTabFC = certTab;
certTab = function (e) {
  if (fcOnE(e) || (e && e.certId && W.certs.some(x => x.id === e.certId))) return _certTabFC.apply(this, arguments); // an issued certificate is always shown
  return `<div class="card fc-none"><div class="empty">${ic('award', 38)}<h2>No certificate for this course</h2><p>${e.status === 'Completed' ? `You completed this course on ${fd(e.completedAt)}. ` : ''}This course doesn't issue a certificate${e.status === 'Completed' ? '' : ' when you complete it'}.</p><button class="btn" data-go="course" data-id="${e.id}" data-tab="overview">${e.status === 'Completed' ? 'Back to the course' : 'See requirements'}</button></div></div>`;
};
const _qrFC = quizResult;
quizResult = function (e) { const h = _qrFC.apply(this, arguments); return fcOnE(e) ? h : h.replace('completed the course. Your certificate is ready.', 'completed the course. This course doesn\'t issue a certificate.').replace('Your certificate is generated automatically once all requirements are complete.', 'The course is completed once all requirements are met.'); };

/* ---------- Records ---------- */
UXC.push(['FP-B', 'Optional certificate per short course (27 Oct 2026)', [
  'Short Courses → a course → Certificate: "Certificate on completion" — Yes (a digital certificate when every completion requirement is met) or No (no certificate). Saved with the tab: a new course version, a reason, and an audit entry "Certificate on completion changed". Only the Super Administrator, System Admins and Academic Admins can change it; others are refused and logged.',
  'The choice is shown on the course header, Details, Completion rules, Validity (when No) and in the publish confirmation. Default Yes for every existing and new course.',
  'Learners: Browse shows "Certificate on completion" or "No certificate on completion"; the course overview, Certificate tab, quiz result and completion notification follow the setting. Completing a No course marks it Completed with no certificate; Yes uses the existing rule unchanged (never before every requirement is met).',
  'Each enrolment follows the setting in force when the learner enrolled (pinned at purchase); certificates already issued and completion records are never changed. NVQ certificates are unchanged.']]);
