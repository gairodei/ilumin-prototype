/* AA-1 — Academic Admin integrity fixes (2 Nov 2026; PD-AA1-* in PROVISIONAL-DECISIONS.md). Loads last.
   D1  Short-course access ends when its access period ends: an Active short enrolment past its end date becomes Expired-Incomplete
       (the existing state, with Request more time / Re-purchase), checked before every render and inside the learner's content,
       SCORM, video and quiz actions. Completed enrolments, completion records and certificates are never touched. No course timer.
   D2  A question mapped to several criteria: each criterion is judged on its own (Assessor marking panel per criterion, Coordinator
       panel per criterion, its own judgement record, lock and criterion state). The first criterion keeps the question's existing
       record shape (q.crit, d.items[qid]); the others use q.crits and d.items[qid].cj[code]. Nothing decides the final Pass / Fail.
   D3  Short-course changes (create, details, content, modules, quizzes, custom fields, questions, certificate, publish, retire,
       restore) are refused inside the action unless the actor may change short courses (s1Can — PD-W0-02), re-checked on confirm.
   D9  Add learner lists every eligible learner, with a search box (staff.js / academic.js keep every eligibility rule).
   D10/D11  A bank-transfer (invoice) bundle purchase is credited and VAT-stamped when Finance records the payment — not when an
       agency screen is next read. Crediting stays once per invoice (bundleId), and only for a paid invoice. */
'use strict';

/* ---------- D1: access period ---------- */
// The audit entry is the system's (logA's wrappers would name whoever is signed in): the same record shape, written directly
const aa1SysLog = (entity, reason) => ADMIN.audit.unshift({ id: 'AU-' + (9100 + ADMIN.audit.length), actor: 'System (access period)', role: 'System', at: now().toISOString(), module: 'Short Courses', entity, action: 'Access period ended', before: 'Active', after: 'Expired-Incomplete', reason, ip: '—' });
function aa1Expire() {
  if (!STORE || !STORE.worlds) return 0;
  const t = now().getTime(); let n = 0;
  Object.keys(STORE.worlds).forEach(v => {
    const w = STORE.worlds[v]; (w && w.enrolments || []).forEach(e => {
      if (!e || e.kind !== 'short' || e.status !== 'Active' || !e.end || new Date(e.end).getTime() > t) return;
      e.status = 'Expired-Incomplete'; e.expiredAt = now().toISOString(); n++;
      const as = e.agyAssign && STORE.agy && (STORE.agy.assign || []).find(x => x.id === e.agyAssign); if (as && as.status === 'Active') as.status = 'Expired-Incomplete';
      aa1SysLog(`${typeof VNAME === 'function' ? VNAME(v) : v} · ${e.title}`, 'Access ended ' + fd(e.end));
    });
  });
  return n;
}
const _renderAA1 = render;
render = function () { try { aa1Expire(); } catch (e) { /* never block a render */ } return _renderAA1.apply(this, arguments); };
// The learner's own short-course actions: the enrolment they act on is checked first (after the expiry sweep)
const aa1EnrOf = (k, el) => { const d = (el && el.dataset) || {}; return k === 'vidPlay' ? enrolById((ui('vidCur') || [])[0]) : k === 'startQuiz' ? enrolById(d.id) : enrolById(d.e || d.id); };
function aa1AccessWhy(e) { aa1Expire(); return e && e.kind === 'short' && e.status === 'Expired-Incomplete' ? `Your access to ${e.title} ended on ${fd(e.end)}. Ask for more time or buy the course again.` : ''; }
['openItem', 'scormFinish', 'vidPlay', 'startQuiz'].forEach(k => {
  const f = ACT[k]; if (!f) return;
  ACT[k] = function (el) {
    if (S.portal !== 'learner') return f.apply(this, arguments);
    const e = aa1EnrOf(k, el), why = aa1AccessWhy(e);
    if (why) { logA('Short Courses', `${chFullName(W)} · ${e.title}`, 'Blocked: ' + ({ openItem: 'open course content', scormFinish: 'record SCORM completion', vidPlay: 'play course video', startQuiz: 'start module quiz' })[k] + ' (access ended)', '—', '—', 'Access ended ' + fd(e.end)); closeModal(); toast(why, 'err'); return false; }
    return f.apply(this, arguments);
  };
});
const _finishAA1 = finishQuiz;
finishQuiz = function () {
  const Q = W && W.quiz, e = Q && !Q.result && enrolById(Q.e), why = S.portal === 'learner' && aa1AccessWhy(e);
  if (why) { W.quiz = null; clearTimer('quiz'); logA('Short Courses', `${chFullName(W)} · ${e.title}`, 'Blocked: submit module quiz (access ended)', '—', '—', 'Access ended ' + fd(e.end)); toast(why, 'err'); go('course', { id: e.id }); return; }
  return _finishAA1.apply(this, arguments);
};

/* ---------- D2: one judgement per mapped criterion ---------- */
// Further criteria of a question (its first criterion is the question's own, as before)
const aa1More = q => qCrits(q).filter(c => c !== q.crit);
function aa1CritWhy(el) {
  const d = (el && el.dataset) || {}; if (!d.c) return '';
  const s = r3StaffSub(d.k), a = s && tasAsg(s), q = a && a.qs.find(x => x.id === d.q); if (!s) return ''; // not the marking assessor: the action's own check refuses and logs it
  if (!q || !aa1More(q).includes(d.c)) return 'That criterion isn\'t mapped to this question.';
  if (critLock(s, d.c)) return `${d.c} is already achieved and verified — corrections only via Data Correction.`;
  return '';
}
['mkMet', 'mkVerify'].forEach(k => { const f = ACT[k]; ACT[k] = function (el) { const w = aa1CritWhy(el); if (w) { toast(w, 'err'); return false; } if (k === 'mkVerify' && el.dataset.c && itmC(el.dataset.k, el.dataset.q, el.dataset.c).met !== 'Met') { toast('Only a Met judgement can be verified.', 'err'); return false; } return f.apply(this, arguments); }; });
{ const f = INP.mkField; INP.mkField = function (el) { const w = aa1CritWhy(el); if (w) { toast(w, 'err'); return false; } return f.apply(this, arguments); }; }
// The Assessor's marking: a panel for each further criterion of the current question, after the first criterion's decision
function aa1XPanel(s, a, q, c, n, ro) {
  const y = (dft(s.key).items[q.id] || {}).cj || {}, x = y[c] || {}, lock = critLock(s, c), co = withW(s.L.v || 'C', () => allCrit()).find(z => z.code === c) || {};
  const ac = (a.crit || []).find(z => z[0] === c) || [c, '', ''], j = r3Latest(s.key, c, 'Academic Coordinator', true), ov = j && dOvOf(s.key, j.id).slice(-1)[0], dis = ro ? 'disabled' : '';
  const btn = v => `<button aria-pressed="${x.met === v}" data-act="mkMet" data-k="${s.key}" data-q="${q.id}" data-c="${esc(c)}" data-v="${v}" ${dis}>${v}</button>`;
  return `<div class="aa1-xc" data-crit="${esc(c)}"><h3>Criterion decision — <span class="code">${esc(c)}</span></h3>
    <p class="small">${esc(co.d || ac[1])}${co.lo ? ` <span class="xs muted">(Learning Outcome ${esc(co.unit || '')} ${esc(co.lo)})</span>` : ''}</p>${co.evReq || co.ev ? `<p class="xs muted">Evidence requirement: ${esc(co.evReq || co.ev)}.</p>` : ''}
    ${j ? `<div class="r3-pub r3-cooj"><span class="xs strong">Coordinator's published judgement</span>${r3PubRow(j)}</div>${ov ? `<p class="xs d-ov-note">${ic('edit', 12)} Overridden by ${esc(ov.by)} (Assessor) on ${fdt(ov.at)}: ${chip(ov.value, r3Tone(ov.value))}${ov.published ? '' : ' · not yet released to the learner'}</p>` : ''}${!r3MarkWhy(s.key) && !lock ? `<button class="btn btn-sm d-ov-btn" data-act="dOverride" data-k="${s.key}" data-q="${q.id}--c${n}">${ov ? 'Override again…' : 'Override the Coordinator\'s judgement…'}</button>` : ''}` : ''}
    ${lock ? `<div class="note b-green">${ic('lock')}<div class="small"><strong>Achieved — verified by ${esc(lock.by)} on ${fdt(lock.at)}.</strong> Locked; corrections only via Data Correction.</div></div>` : `<div class="met-pick" role="group" aria-label="Met, Partially Met or Not Met for ${esc(c)}">${R3_VALS.map(btn).join('')}</div>
    <div class="field"><label for="mk-note-${n}">Note on ${esc(c)}</label><input class="input" id="mk-note-${n}" value="${esc(x.note || '')}" data-oninput="mkField" data-k="${s.key}" data-q="${q.id}" data-c="${esc(c)}" data-f="note" ${dis}></div>
    ${x.met === 'Met' && CAN('verify') !== 'no' ? (x.verified ? `<p class="small" style="color:var(--green)">${ic('lock', 13)} Verified by ${esc(x.vby)} on ${fdt(x.vat)}</p>` : `<button class="btn btn-sm" data-act="mkVerify" data-k="${s.key}" data-q="${q.id}" data-c="${esc(c)}" ${dis}>${ic('lock', 14)}Verify — I confirm this evidence satisfies ${esc(c)}</button>`) : ''}`}</div>`;
}
const _tMarkAA1 = SCREENS['t-mark'];
SCREENS['t-mark'] = p => {
  let h = _tMarkAA1(p); const s = p && p.id && typeof h === 'string' ? r3StaffSub(p.id) : null; if (!s) return h;
  const a = tasAsg(s), q = a.qs[Math.min(S.tas.qi, a.qs.length - 1)], more = q ? aa1More(q) : []; if (!more.length || q.state !== 'open') return h;
  const ro = s.L.status === 'Discontinued' || !s.toMark, cs = qCrits(q);
  const k = h.indexOf('<h3>Feedback beside the answer</h3>'); if (k < 0) return h;
  h = h.slice(0, k) + more.map(c => aa1XPanel(s, a, q, c, cs.indexOf(c), ro)).join('') + h.slice(k);
  return h.replace('<h3>Criterion decision</h3>', `<p class="small aa1-qn">${ic('info', 13)} This question is assessed against ${cs.length} criteria (${cs.map(esc).join(', ')}). Judge each one; the answer's feedback and exit apply to the question.</p><h3>Criterion decision — <span class="code">${esc(q.crit)}</span></h3>`);
};
// The Coordinator's review: one criterion panel per mapped criterion (each with its own draft, publication and history)
const _cpAA1 = r3CritPanel;
r3CritPanel = function (s, a, q, why) {
  const cs = qCrits(q); if (cs.length < 2 || q.baseId) return _cpAA1.apply(this, arguments);
  return _cpAA1.call(this, s, a, q, why) + cs.map((c, n) => c === q.crit ? '' : _cpAA1.call(this, s, a, aqById(a, q.id + '--c' + n), why)).join('');
};

/* ---------- D3: short-course changes, inside the action ---------- */
const AA1_S1 = { newCourse: 'create a short course', s1Save: 'save short-course settings', pubCourse: 'publish a short course', retireCourse: 'retire a short course', s1Unretire: 'restore a short course',
  s1FieldAdd: 'add a course field', s1FieldEdit: 'edit a course field', s1FieldRetire: 'retire a course field', s1ItemAdd: 'add course content', s1ItemEdit: 'edit course content', s1ItemMove: 'reorder course content', s1ItemRetire: 'retire course content',
  s1ModRename: 'rename a module', s1QAdd: 'add a quiz question', s1QEdit: 'edit a quiz question', s1QRetire: 'retire a quiz question', chModAdd: 'add a module', chModMove: 'reorder modules', chModRetire: 'retire a module' };
const AA1_S1_INP = { chModQuiz: 'change module quiz settings', chModItem: 'change module content', fcPick: 'change the certificate template', fcTpl: 'change the certificate template' };
const AA1_S1_WHY = 'Short courses are changed by the Super Administrator, System Administrators and Academic Admins.';
const aa1S1Ent = el => { const d = (el && el.dataset) || {}, id = d.c || d.id || d.course, c = id && (ADMIN.courses || []).find(x => x.id === id); return c ? `${c.title} (${c.id})` : String(id || '—'); };
Object.keys(AA1_S1).forEach(k => { const f = ACT[k]; if (!f) return; ACT[k] = function (el) {
  if (k === 's1Save' && el && el.dataset && el.dataset.t === 'certificate') return f.apply(this, arguments); // FP-C's own refusal (s1Can, 'Blocked: certificate setting') already guards this tab
  if (!s1Can()) return w0Deny('Short Courses', aa1S1Ent(el), AA1_S1[k], AA1_S1_WHY);
  const m0 = MODAL, r = f.apply(this, arguments); if (MODAL && MODAL !== m0) w0OnConfirm(() => !s1Can() && (w0Deny('Short Courses', aa1S1Ent(el), AA1_S1[k], AA1_S1_WHY), true)); return r;
}; });
Object.keys(AA1_S1_INP).forEach(k => { const f = INP[k]; if (!f) return; INP[k] = function (el) { if (!s1Can()) { w0Deny('Short Courses', aa1S1Ent(el), AA1_S1_INP[k], AA1_S1_WHY); if (S.portal === 'admin') render(); return false; } return f.apply(this, arguments); }; });

/* ---------- D9: Add learner search ---------- */
INP.abFind = el => {
  const t = String(el.value || '').trim().toLowerCase(), sel = $('#ab-l'); if (!sel) return;
  let n = 0; [...sel.options].forEach(o => { const hit = !t || o.textContent.toLowerCase().includes(t); o.hidden = !hit; o.disabled = !hit; if (hit) n++; });
  if (sel.selectedOptions[0] && sel.selectedOptions[0].hidden) { const f = [...sel.options].find(o => !o.hidden); sel.value = f ? f.value : ''; }
  const h = $('#ab-n'); if (h) h.textContent = t ? (n ? `${plural(n, 'learner')} match "${el.value.trim()}".` : `No learner matches "${el.value.trim()}".`) : `${plural(sel.options.length, 'active learner')}.`;
};

/* ---------- D10/D11: an invoice purchase is credited when it is paid ---------- */
// The agency's own catalogue (customised products are listed only for their agency), whoever is looking
const aa1AsAgency = (name, f) => { const a = (ADMIN.agencies || []).find(x => x.name === name), k = S.agy.id; if (!a) return f(); S.agy.id = a.id; try { return f(); } finally { S.agy.id = k; } };
reconcileInvoices = function () {
  ADMIN.queue.filter(i => i.type === 'Agency invoice (offline) purchase' && i.data && i.stage === 'paid' && !i.data.bundleId && i.data.portal && STORE.agy).forEach(i => {
    const id = 'BN-' + (20 + ADMIN.bundles.length), cat = aa1AsAgency(i.data.agency, () => AGY_CATALOGUE().find(c => c.id === i.data.catId)) || {}, days = cat.days || 365;
    const b = { id, name: i.data.bundle, agency: i.data.agency, courses: i.data.courses || cat.courses || [i.data.bundle], seats: i.data.seats, used: 0, from: now().toISOString(), validity: new Date(now().getTime() + days * DAY).toISOString(), mode: i.data.priceMode || 'Automatic', price: i.amount, cur: i.cur, avail: 'Specific agencies', status: 'Active' };
    ADMIN.bundles.push(b); i.data.bundleId = id; STORE.agy.ledger.push({ bundle: id, agency: b.agency, at: now().toISOString(), type: 'Credited', qty: b.seats, learner: '—', ref: 'Invoice ' + i.id });
    agyNotify('Invoice payment recorded — seats credited', `${i.id} · ${b.seats} seats in ${b.name}`, 'g-bundle.' + id, 'Purchases', b.agency);
  });
};
const _invPaidAA1 = fiInvPaid;
fiInvPaid = function (i) {
  const r = _invPaidAA1.apply(this, arguments);
  if (i && i.stage === 'paid' && i.data && i.data.portal) { reconcileInvoices(); chVatSync(); } // credited once (bundleId), then the payment and bundle carry their VAT split
  return r;
};
