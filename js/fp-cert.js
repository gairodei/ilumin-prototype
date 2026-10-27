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
   Correction (27 Oct 2026, PD-FP-11..15): with No, the Certificate tab shows only the setting and a short explanation — the
   template designer, logo, layout, fields and preview are hidden (kept, not deleted) and nothing about them is required to
   save or publish; the Validity tab's controls (all certificate-specific) are hidden too. With Yes, the template must be
   complete (a layout, the default or an uploaded logo, the learner's name and the course) to save or publish, with inline
   errors. Choosing Yes / No on screen changes nothing until the course is saved.
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
const fcField = (sp, c) => `<section class="card fc-set"><fieldset class="stack" style="border:0;padding:0"><legend class="lbl">Certificate on completion</legend>${[true, false].map(on => `<label class="check"><input type="radio" name="fc-on" value="${on ? 'yes' : 'no'}" data-onchange="fcPick" data-id="${c.id}" ${fcOn(sp) === on ? 'checked' : ''}><span><strong>${fcLbl(on)}</strong><br><span class="small muted">${on ? 'A digital certificate is available when the learner has met every completion requirement — never earlier.' : 'Learners complete the course, but no certificate is issued.'}</span></span></label>`).join('')}</fieldset><p class="small fc-dirty" role="status" hidden>${ic('info', 14)} Not saved yet. Save to make this change; it creates a new course version.</p><p class="xs muted">Saving creates a new course version. It applies to new enrolments; learners already enrolled keep the setting in force when they enrolled, and certificates already issued are never changed.</p></section>`;
const fcOffNote = on => `<div class="note b-grey fc-off" ${on ? 'hidden' : ''}>${ic('info')}<div class="small"><strong>This course doesn't issue a certificate, so there is no certificate to design.</strong> Learners who meet the completion rules complete the course. Any certificate design saved earlier is kept, not deleted, and comes back if you choose Yes.</div></div>`;
const fcNote = (sp, extra = '') => `<div class="note ${fcOn(sp) ? 'b-blue' : 'b-grey'} fc-note">${ic('award')}<div class="small"><strong>Certificate on completion: ${fcLbl(fcOn(sp))}.</strong> ${fcOn(sp) ? 'A digital certificate is issued when every completion requirement is met.' : 'No certificate is issued for this course.'}${extra}</div></div>`;
const _ceFC = courseEditor;
courseEditor = function (id, t) {
  let h = _ceFC.apply(this, arguments); const c = s1Row(id); if (!c) return h; const sp = s1Spec(c), st = subtabs(S1_TABS, t || 'details', 'a-courses', c.id), k = h.indexOf(st);
  h = h.replace(`<span class="chip`, `${chip('Certificate: ' + fcLbl(fcOn(sp)), fcOn(sp) ? 'blue' : 'grey')} <span class="chip`);
  if (k < 0) return h; const at = h.indexOf(st) + st.length;
  // A No course has no certificate validity to save (the controls are replaced by a summary, s1Validity below)
  if (t === 'validity' && !fcOn(sp)) h = h.replace(/<button class="btn btn-primary" data-act="s1Save" data-id="[^"]*" data-t="validity">[^<]*<\/button>/, '');
  const add = { certificate: fcField(sp, c) + fcOffNote(fcOn(sp)),
    details: fcNote(sp, ' Change it on the Certificate tab.'), completion: fcNote(sp, fcOn(sp) ? ' Issued only when every rule ticked below is met.' : ' Meeting these rules completes the course.') }[t || 'details'] || '';
  return h.slice(0, at) + add + h.slice(at);
};

/* ---------- The template: shown and required only when the course issues a certificate ---------- */
const FC_REQ = ['Learner name', 'Course'];
// The template as saved, or as it stands on screen (own = an own logo rather than the default "Welfare" mark)
const fcSaved = sp => ({ on: fcOn(sp), layout: sp.cert.layout, fields: sp.cert.fields || [], own: !!sp.cert.logo, logo: sp.cert.logo || '', file: '' });
function fcForm(sp) {
  const pick = $('main input[name="fc-on"]:checked'), l = $('main #ct-l'), f = $('main #ct-logo'), file = (f && f.files && f.files[0] || {}).name || '';
  const own = ($('main input[name="fc-logo"]:checked') || {}).value === 'own';
  return { on: pick ? pick.value === 'yes' : fcOn(sp), layout: l ? l.value : sp.cert.layout, fields: $$('main .s1-cf:checked').map(x => x.value), own, logo: own ? file || sp.cert.logo || '' : '', file };
}
// What a template still needs: [message, the control to mark]
const fcErrs = t => [
  ...(S1_LAYOUTS.includes(t.layout) ? [] : [['Choose a certificate layout', '#ct-l']]),
  ...(t.own && !t.logo ? [['Upload your logo, or choose the default "Welfare" mark', '#ct-logo']] : []),
  ...(FC_REQ.every(x => t.fields.includes(x)) ? [] : [[`Put ${FC_REQ.filter(x => !t.fields.includes(x)).map(x => x === 'Course' ? 'the course' : "the learner's name").join(' and ')} on the certificate (required)`, '.s1-cf']])];
const fcSame = (a, b) => a.length === b.length && a.every(x => b.includes(x));
const fcDirty = (sp, F) => F.on !== fcOn(sp) || (F.on && (F.layout !== sp.cert.layout || !fcSame(F.fields, sp.cert.fields || []) || F.own !== !!sp.cert.logo || !!F.file));
// Inline errors above the template (and on each control); cleared when the template changes
function fcShow(list, head = 'Fix the certificate before saving or publishing:') {
  const box = $('main .fc-errs'); if (!box) return;
  $$('main .fc-tpl .err').forEach(x => x.remove()); $$('main .fc-tpl [aria-invalid]').forEach(x => x.removeAttribute('aria-invalid'));
  box.innerHTML = list.length ? `<div class="note b-red">${ic('alert')}<div class="small"><strong>${head}</strong><ul>${list.map(([m]) => `<li>${esc(m)}</li>`).join('')}</ul></div></div>` : '';
  list.slice().reverse().forEach(([m, sel]) => { if (sel) fieldErr('main .fc-tpl ' + sel, m); });
}
const fcPrev = (c, t) => `<div class="cert-doc" style="padding:24px">${t.own && t.logo ? `<span class="xs muted fc-logo-n">Logo: ${esc(t.logo)}</span>` : ''}<span class="w-brand">Welfare</span><h3>Certificate of completion</h3>${t.fields.includes('Learner name') ? '<span class="nm">Learner Name</span>' : ''}${t.fields.includes('Course') ? `<p>${esc(c.title)}</p>` : ''}<div class="meta"><span>Issued ${fd(now().toISOString())}${t.fields.includes('Expiry') ? `<br>${c.validity === 'No expiry' ? 'No expiry' : 'Valid ' + esc(c.validity)}` : ''}</span>${t.fields.includes('QR code') ? qr('preview', 50) : ''}<span>${t.fields.includes('Certificate number') ? 'WEL-2026-0000' : ''}</span></div></div><p class="xs muted">${esc(S1_LAYOUTS.includes(t.layout) ? t.layout : 'No layout chosen')}</p>`;
s1Certificate = function (c, sp) {
  const t = fcSaved(sp), bad = !S1_LAYOUTS.includes(t.layout);
  return `<div class="fc-tpl" data-onchange="fcTpl" data-id="${c.id}" ${t.on ? '' : 'hidden'}><div class="fc-errs" role="alert"></div><div class="grid-2"><section class="card"><h3>Template designer</h3>
    <fieldset class="field fc-logo" style="border:0;padding:0"><legend class="lbl">Logo</legend><label class="check small"><input type="radio" name="fc-logo" value="def" ${t.own ? '' : 'checked'}>Default "Welfare" mark</label><label class="check small"><input type="radio" name="fc-logo" value="own" ${t.own ? 'checked' : ''}>Our own logo</label><label class="small" for="ct-logo">Logo file</label><input class="input" type="file" id="ct-logo" accept="image/*"><span class="hint">${t.own ? 'Current: ' + esc(t.logo) : 'Needed only for your own logo'}</span></fieldset>
    <div class="field"><label for="ct-l">Layout</label><select class="select" id="ct-l">${bad ? '<option value="" selected>Choose a layout</option>' : ''}${S1_LAYOUTS.map(l => `<option ${l === t.layout ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="field fc-fields"><fieldset class="stack" style="border:0;padding:0"><legend class="lbl">Fields</legend>${S1_CERT_FIELDS.map(f => `<label class="check small"><input type="checkbox" class="s1-cf" value="${f}" ${t.fields.includes(f) ? 'checked' : ''}>${f}${FC_REQ.includes(f) ? ' <span class="xs muted">(required)</span>' : ''}</label>`).join('')}</fieldset></div><p class="small">Issuing-entity branding: "Welfare" (certificates only — the verification page and everything else use Illumin Academy)</p></section>
    <section class="card"><h3>Live preview</h3><div class="fc-prev">${fcPrev(c, t)}</div></section></div></div>`;
};
// Choosing Yes / No on screen only shows or hides the template; the course changes when it is saved
INP.fcPick = el => {
  const c = s1Row(el.dataset.id); if (!c) return; const sp = s1Spec(c), on = el.value === 'yes', tpl = $('main .fc-tpl'), off = $('main .fc-off'), d = $('main .fc-dirty');
  if (tpl) tpl.hidden = !on; if (off) off.hidden = on; if (d) d.hidden = !fcDirty(sp, fcForm(sp)); fcShow([]);
};
INP.fcTpl = el => {
  const c = s1Row(el.dataset.id); if (!c) return; const sp = s1Spec(c), F = fcForm(sp), p = $('main .fc-prev'), d = $('main .fc-dirty');
  if (p) p.innerHTML = fcPrev(c, F); if (d) d.hidden = !fcDirty(sp, F); fcShow([]);
};
// Validity: every control on the tab is about the certificate (validity, custom months, expiry reminders) — a No course has none
const _s1ValFC = s1Validity;
s1Validity = function (c, sp) {
  if (fcOn(sp)) return _s1ValFC.apply(this, arguments);
  return fcNote(sp, ' Validity and expiry reminders apply only to courses that issue a certificate.') + `<section class="card fc-val-off"><h3>Certificate validity</h3><p class="small muted">Not applicable — this course doesn't issue a certificate. There is nothing to set here, and nothing here is needed to save or publish the course. The access period is on the Details tab.</p><dl class="kv small"><dt>Kept for if certificates are turned on again</dt><dd>${esc(c.validity === 'No expiry' ? 'No expiry' : c.validity)} · reminders ${esc(sp.remind)} days before expiry</dd></dl></section>`;
};
// Short course lists: a No course's validity is not applicable (read without creating course data)
const fcRowOn = c => fcOn((STORE.sSpec || {})[c.id]);
const _dtFC = dt;
dt = function (o) {
  if (o && (o.id === 'courses' || o.id === 'kcourses') && Array.isArray(o.cols)) o = { ...o, cols: o.cols.map(k => k.k === 'validity' ? { ...k, h: c => fcRowOn(c) ? esc(c.validity) : '<span class="muted fc-na">Not applicable (no certificate)</span>', v: c => fcRowOn(c) ? c.validity : 'Not applicable (no certificate)' } : k) };
  return _dtFC.call(this, o);
};
// Publishing: a course that issues a certificate needs a complete saved template; a No course needs none
const _missFC = s1Missing;
s1Missing = function (c) { const out = _missFC.apply(this, arguments), sp = s1Spec(c); if (fcOn(sp)) fcErrs(fcSaved(sp)).forEach(([m]) => out.push(`Certificate: ${m} (Certificate)`)); return out; };
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
  const was = fcOn(sp), on = pick.value === 'yes', F = fcForm(sp);
  const chg = on !== was ? `<p class="small fc-chg"><strong>Certificate on completion: ${fcLbl(was)} → ${fcLbl(on)}.</strong> ${on ? 'New enrolments get a certificate when they complete.' : 'New enrolments complete without a certificate.'} Learners already enrolled keep ${was ? 'their certificate eligibility' : 'the setting they enrolled with'}; issued certificates don't change.</p>` : '';
  const setOn = r => { const at = now().toISOString(); sp.certOn = on; (sp.certHist = sp.certHist || []).push({ at, was, on, v: c.version, by: ADMIN.me.name }); s1Keep(c); s1Log(c, `Certificate on completion changed — version ${c.version}`, fcLbl(was), fcLbl(on), r); s1Sync(); render(); };
  // No: only the setting is saved — nothing about the template is checked or changed (the saved design is kept)
  if (!on) {
    if (!was) { toast('Nothing to save — this course already issues no certificate.', 'info'); return; }
    return reasonDlg({ title: 'Save as a new version?', ok: 'Save new version', label: 'Change summary (required)', body: `<div class="note b-blue">${ic('info')}<div class="small">This creates a new version effective from today. Existing enrolments stay on their version.</div></div>${chg}<p class="small fc-kept">The certificate design is kept as it is, for if the setting is Yes again.</p>`,
      onOk: r => { c.version++; setOn(r); toast('Saved. New version effective from today — existing enrolments unaffected.'); } });
  }
  // Yes: the template on screen must be complete
  const errs = fcErrs(F); if (errs.length) { fcShow(errs, 'Complete the certificate before saving:'); return; }
  return fcWrapDlg(o => ({ ...o, body: o.body + chg,
    onOk: r => { o.onOk(r); if (!F.own && sp.cert.logo) { sp.cert.logo = ''; render(); } if (on !== was) setOn(r); } }), () => _s1SaveFC(el));
};
// A No course has no certificate validity to save
const _s1SaveVFC = ACT.s1Save;
ACT.s1Save = el => { const c = el.dataset.t === 'validity' && s1Row(el.dataset.id); if (c && !fcOn(s1Spec(c))) { toast('This course doesn\'t issue a certificate, so it has no certificate validity to save.', 'err'); return; } return _s1SaveVFC(el); };
// Publishing (the review step) states the choice. From the Certificate tab, what is on screen must be saved — and, for Yes, complete — first
const _pubFC = ACT.pubCourse;
ACT.pubCourse = el => {
  const c = s1Row(el && el.dataset && el.dataset.id); if (!c) return _pubFC(el); const sp = s1Spec(c);
  if (c.status === 'Draft' && $(`main .fc-tpl[data-id="${c.id}"]`)) {
    const F = fcForm(sp), errs = F.on ? fcErrs(F) : [];
    if (errs.length) { s1Log(c, 'Blocked: publish (certificate incomplete)', 'Draft', 'Draft', errs.map(x => x[0]).join('; ')); fcShow(errs, 'Complete the certificate before publishing:'); toast('Complete the certificate before publishing.', 'err'); return; }
    if (fcDirty(sp, F)) { fcShow([['Save your certificate changes first — publishing uses the saved course version.']], 'Not published:'); toast('Save your certificate changes first.', 'err'); return; }
  }
  return fcWrapDlg(o => ({ ...o, body: (o.body || '') + `<p class="small fc-pub">Certificate on completion: <strong>${esc(fcTxt(fcOn(sp)))}</strong>.</p>` }), () => _pubFC(el));
};
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
UXC.push(['FP-C', 'Certificate tab follows the setting (27 Oct 2026)', [
  'Short Courses → a course → Certificate: with No, only the setting and a short explanation are shown — the template designer, logo, layout, fields and live preview are hidden. Choosing Yes shows them again with the saved (or unsaved on-screen) design; choosing on screen changes nothing until Save.',
  'No: saving needs nothing about the template, and the saved design is kept, not deleted. Validity: every control there is certificate-specific, so a No course shows "Not applicable" with the kept values and no Save; the course lists show "Not applicable (no certificate)".',
  'Yes: the template must have a layout, the default "Welfare" mark or an uploaded logo, and the learner\'s name and the course. Saving or publishing an incomplete template is blocked with inline errors; publishing from the Certificate tab with unsaved certificate changes asks to save first.']]);
