/* ============================================================
   Learner portal corrections (LP, 31 Oct 2026; PD-LP-01… in PROVISIONAL-DECISIONS.md).
   Found by the learner-portal audit; each one reads the record the staff portals already use instead of a copy:
   - "Your people" (programme page) is resolved from the learner's batch at the moment it is drawn: their designated Academic
     Coordinator (the batch allocation), the batch's Teacher(s), and their assignment / PD / observation assessors (the batch
     allocation and any per-learner override). One card per person, every role they hold on it. It used to list a copy of names
     written onto the learner's record at seeding — a learner who joined through sign-up had only their Coordinator, and a seeded
     learner could be shown (and message) a Teacher who does not teach their batch.
   - Messaging (G3.7): a learner messages their course's Teacher(s), Assessor(s) and designated Coordinator, resolved from the
     batch records, plus an Academic Admin. A change of allocation changes who can be written to next; earlier conversations are
     kept as they were (read-only when the person is no longer assigned).
   - Personal details confirmed at sign-up (date of birth, address, postcode) are kept on the learner's profile and learner record
     when those were blank (they were dropped). Filled-in details are not overwritten — changes go through "Request change".
   - Certificates: with no certificate at all the page says so (it said "No certificates with this status").
   Loads last.
   ============================================================ */
'use strict';

// The learner's batch, for an NVQ learner placed in one (sign-up, admission or seeded cohort)
const lpBatch = w => (w && w.me && w.flags && w.flags.nvq && w.nvq && typeof chBatchOfLid === 'function' && chBatchOfLid(w.me.id)) || null;
const LP_ASR = [['asg', 'Assessor (assignments)'], ['pd', 'Assessor (PD)'], ['obs', 'Assessor (observations)']];
// [{ name, roles: [...] }] — from the batch's records; without a batch, the learner's record (unchanged behaviour)
function lpPeople(w) {
  const st = (w && w.nvq && w.nvq.people) || [], b = lpBatch(w), out = new Map();
  const add = (name, role) => { if (!name) return; const p = out.get(name) || { name, roles: [] }; if (!p.roles.includes(role)) p.roles.push(role); out.set(name, p); };
  if (!b) { st.forEach(([r, n]) => add(n, r)); return [...out.values()]; }
  const lid = w.me.id, coords = b.coords || (b.coord ? [b.coord] : []), stC = (st.find(([r]) => r === 'Academic Coordinator') || [])[1];
  add((typeof mcOf === 'function' && mcOf(lid, b)) || (coords.length === 1 ? coords[0] : coords.includes(stC) ? stC : null), 'Academic Coordinator');
  (b.teachers || []).forEach(t => add(t, 'Teacher'));
  LP_ASR.forEach(([k, r]) => add(chEff(lid, k, b), r));
  return [...out.values()];
}
// G3.7 (PD-LP-06): the learner messages their course's Teacher(s) and Assessor(s) and their designated Coordinator — the people the
// batch records hold now (lpPeople), never a copied name. A learner without a batch keeps their record's list (unchanged).
function lpRecipients(w) {
  const st = (w && w.nvq && w.nvq.people) || [], fmt = (n, r) => `${n} (${r})`;
  if (!lpBatch(w)) return st.filter(([r]) => /Teacher|Assessor|Coordinator/.test(r)).map(([r, n]) => fmt(n, r));
  return [...new Set(lpPeople(w).flatMap(p => p.roles.map(r => fmt(p.name, r))))];
}
const lpLabel = roles => { const a = roles.filter(r => /^Assessor/.test(r)).map(r => (r.match(/\((.*)\)/) || [])[1]).filter(Boolean);
  return roles.filter(r => !/^Assessor/.test(r)).concat(a.length ? [`Assessor (${a.join(', ')})`] : roles.includes('Assessor') ? ['Assessor'] : []).join(' · '); };
const LP_DOES = { Teacher: 'Teaches your batch', 'Assessor (assignments)': 'Marks your assignments and decides Pass / Fail', 'Assessor (PD)': 'Leads your Professional Discussion', 'Assessor (observations)': 'Carries out your observations' };
function lpPeopleCard(w) {
  const ppl = lpPeople(w), rc = recipients();
  const li = p => { const to = rc.find(x => x.startsWith(p.name + ' (')), does = p.roles.map(r => LP_DOES[r]).filter(Boolean).join(' · '), co = p.roles.includes('Academic Coordinator'), em = co && typeof mcStaffEmail === 'function' ? mcStaffEmail(p.name) : '';
    return `<li class="li lp-person" data-name="${esc(p.name)}"><span class="avatar" style="background:var(--surface-2);color:var(--fg)">${p.name.split(' ').slice(-2).map(x => x[0]).join('')}</span><div class="li-b"><span class="strong">${esc(p.name)}</span><span class="small muted lp-role">${esc(lpLabel(p.roles))}</span>${does ? `<span class="xs muted">${esc(does)}</span>` : ''}${em ? `<a class="xs mc-contact" href="mailto:${esc(em)}">${esc(em)}</a>` : ''}</div>${to ? `<button class="btn btn-sm" data-act="compose" data-to="${esc(to)}">${ic('msg', 14)}Message</button>` : ''}</li>`; };
  const info = ppl.some(p => !rc.some(x => x.startsWith(p.name + ' (')));
  return `<section class="card lp-people"><h2>Your people</h2>${ppl.length ? `<ul class="list">${ppl.map(li).join('')}</ul>` : `<p class="small muted">No staff are assigned to your batch yet.</p>`}${info ? '<p class="xs muted lp-info">Staff without a Message button are shown for information — they can\'t be messaged from the learner portal.</p>' : ''}</section>`;
}
const _hubLP = nvqHub;
nvqHub = function (e) { const h = _hubLP.apply(this, arguments); return W ? h.replace(/<section class="card"><h2>Your people<\/h2>[\s\S]*?<\/ul><\/section>/, () => lpPeopleCard(W)) : h; };
const _rgLP = recipientGroups;
recipientGroups = function () {
  const g = _rgLP.apply(this, arguments); if (!W || !W.nvq || !lpBatch(W)) return g;
  return g.map(x => (x[0] === W.nvq.title ? [x[0], lpRecipients(W)] : x));
};
// The compose dialog's hint described Teachers and Assessors to everyone; it now describes the list it shows
const _compLP = ACT.compose;
ACT.compose = function () { const r = _compLP.apply(this, arguments); const h = MODAL && S.portal === 'learner' && document.querySelector('#modal-root #m-to + .hint'); if (h) h.textContent = 'The people you can message for your course, or an Academic Admin. Questions about fees? Message an Academic Admin.'; return r; };

/* ---------- Sign-up details reach the profile and the learner record (blank fields only) ---------- */
const lpDob = v => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? fd(v + 'T12:00:00Z') : v);
const _suNextLP = ACT.suNext;
ACT.suNext = function () {
  const w = W, before = w && w.signup && w.signup.step, key = w && w.signup && chStepKey(w);
  const r = _suNextLP.apply(this, arguments);
  if (key !== 'details' || !w.signup || w.signup.step === before || !w.signup.details) return r;
  const d = w.signup.details, v = { dob: lpDob(d.dob || ''), address: d.address || '', postcode: d.postcode || '' }, L = (ADMIN.learners || []).find(x => x.id === w.me.id), set = [];
  Object.entries(v).forEach(([k, x]) => { if (!x) return; if (!w.me[k]) { w.me[k] = x; set.push(k); } if (L && !L[k]) L[k] = x; });
  if (set.length) logA('Learners', `${chFullName(w)} (${w.me.id})`, 'Personal details recorded at sign-up', '—', set.map(k => ({ dob: 'Date of birth', address: 'Address', postcode: 'Postcode' }[k])).join(', '), 'Entered by the learner in sign-up step 1 (blank fields only)');
  return r;
};

/* ---------- Certificates: an accurate empty state ---------- */
const _certLP = SCREENS.certificates;
SCREENS.certificates = function () {
  const h = _certLP.apply(this, arguments); if ((W.certs || []).length) return h;
  const nvq = W.flags && W.flags.nvq, sh = (W.enrolments || []).some(e => e.kind === 'short');
  const why = nvq && sh ? 'Your NVQ certificate is issued when you complete the programme; a short course\'s certificate, when the course offers one and you complete it.' : nvq ? 'Your certificate is issued when you complete your programme.' : sh ? 'A short course\'s certificate is issued when you complete the course, if the course offers one.' : 'Certificates appear here when you complete a course that offers one.';
  const k = h.lastIndexOf('<div class="card">'); if (k < 0 || !h.slice(k).includes('No certificates with this status')) return h;
  return h.slice(0, k) + `<div class="card lp-nocert">${emptyState({ icon: 'award', title: 'No certificates yet', why })}</div>`;
};

/* ============================================================
   LP final (PD-LP-06…12): replies rechecked, session Teachers, real deadlines on the staff timeline, template classes with
   attendance registers, unit filters from the curriculum. (Staff footers name the zone they use — admin-core.js, coord.js,
   staff.js; the learner's batch is read from the sign-up's batch code, not the label — chBatchCodeOfW in ch-b2.js.)
   ============================================================ */

/* ---------- Replies are checked again: a person no longer assigned can't be written to; the conversation stays readable ---------- */
const lpStaffOf = x => (x.startsWith('Academic Admin — ') ? x.slice(17) : x.replace(/ \(.*$/, ''));
const lpCanReply = th => { if (!th || S.portal !== 'learner' || !W) return true; const ok = new Set(recipients().map(lpStaffOf)); return (th.with || []).every(x => ok.has(lpStaffOf(x))); };
const lpGone = th => (th.with || []).map(lpStaffOf).join(', ');
const _replyLP = SUBMIT.reply;
SUBMIT.reply = function (f) {
  const th = W && W.threads.find(x => x.id === f.dataset.id);
  if (th && !lpCanReply(th)) { w0Deny('Messages', lpGone(th) || '—', 'Reply to a conversation', 'You can message your own teachers, assessors and Coordinator, or an Academic Admin.'); return false; }
  return _replyLP.apply(this, arguments);
};
const _msgLP = SCREENS.messages;
SCREENS.messages = function (p) {
  const h = _msgLP.apply(this, arguments), th = p && p.id && W && W.threads.find(x => x.id === p.id);
  if (!th || lpCanReply(th)) return h;
  return h.replace(/<form class="chat-f" data-submit="reply"[\s\S]*?<\/form>/, `<div class="note b-grey lp-ro" role="status">${ic('lock')}<div class="small"><strong>${esc(lpGone(th))} isn't one of your assigned staff now.</strong> This conversation is kept for your records. To contact your current staff, use "New message".</div></div>`);
};

/* ---------- Sessions: the Teacher of each class on the learner's calendar (a session-only Teacher isn't added to "Your people") ---------- */
// Read from the batch's session (or timetable) record when the details open — nothing is copied onto the learner's calendar
const lpEvTeacher = (w, id) => { const code = w && s4bBatchOfW(w), b = code && ADMIN.batches.find(x => x.code === code), e = b && batchEvents(b).find(x => x.type === 'class' && (x.id === id || 'bs-' + x.id === id)); return (e && e.teacher) || null; };
const _evPopLP = ACT.evPop;
ACT.evPop = function (el) {
  const r = _evPopLP.apply(this, arguments), e = W && el && el.dataset && W.events.find(x => x.id === el.dataset.id), t = e && e.type === 'class' ? lpEvTeacher(W, e.id) : null, pop = document.querySelector('.pop');
  if (t && pop && !pop.querySelector('.lp-teacher')) { const s = pop.querySelector('strong'); if (s) s.insertAdjacentHTML('afterend', `<span class="small lp-teacher">Teacher: ${esc(t)}</span>`); }
  return r;
};

/* ---------- Staff timeline: published batch deadlines, not the template placeholder ---------- */
// The Create-batch schedule template adds "Assignment 1 due" (a placeholder) to batches without learner-seeded calendars. Once the
// batch has a published assignment deadline (Assignment deadlines, crSetDue), the placeholder is dropped and every published
// deadline is shown at its real date; before then the placeholder is labelled as one. Seeded batches keep their own events.
const lpRealDl = b => (typeof s2Defs === 'function' && typeof crDue === 'function' ? s2Defs() : []).filter(d => d.status === 'Published' && crDue(d, b.code)).map(d => ({ id: 'ed' + d.id, type: 'deadline', title: d.title.split('—')[0].trim() + ' due', start: crDue(d, b.code), end: crDue(d, b.code), course: b.course, real: d.id }));
const _beLP = batchEvents;
batchEvents = function (b) {
  const out = _beLP.apply(this, arguments); if (!b || BATCH_WORLD[b.code]) return out;
  const tpl = e => e.type === 'deadline' && !e.real && !e.s4 && String(e.id).startsWith(b.code), real = lpRealDl(b);
  if (!real.length) return out.map(e => (tpl(e) && !/placeholder/.test(e.title) ? { ...e, title: e.title + ' (template placeholder — not a published deadline)' } : e));
  return out.filter(e => !tpl(e) && !real.some(x => x.id === e.id)).concat(real);
};
// A published deadline is changed where it is set (the batch's Assignment deadlines), not on the timeline
const lpRealEv = el => { const b = el && el.dataset && ADMIN.batches.find(x => x.code === el.dataset.b); return b && lpRealDl(b).some(x => x.id === el.dataset.id) ? b : null; };
['cooEditEv', 'kEditEv'].forEach(k => { const f = ACT[k]; if (!f) return; ACT[k] = function (el) {
  const b = lpRealEv(el); if (!b) return f.apply(this, arguments);
  const e = lpRealDl(b).find(x => x.id === el.dataset.id);
  openModal({ title: esc(e.title), sub: `Published assignment deadline · ${esc(b.code)}`, body: `<dl class="kv"><dt>Due</dt><dd>${fdt(e.start)}</dd></dl><p class="small lp-dl-src">This is the batch's published deadline — the one learners see. It is changed in the batch's Assignment deadlines, which records the reason and moves the learners who haven't submitted.</p>`,
    actions: [{ label: 'Close' }].concat(S.portal === 'admin' ? [{ label: 'Open Assignment deadlines', cls: 'btn-primary', fn: () => { closeModal(); go('a-batches', { id: b.code, tab: 'deadlines' }); } }] : []) });
}; });

/* ---------- Template classes become sessions (one record each, so they have attendance registers) ---------- */
// A batch made with Create batch and a schedule template gets the template's classes as session records with the same IDs (as R2
// does when a timetable class's audience changes): for all learners of the batch, with the template's teacher, date and link. The
// calendars don't change (the record replaces the timetable entry); the Teacher's Sessions & Attendance now lists them. Template
// deadlines, observation windows and milestones are not sessions and get no record. Seeded batches are unchanged.
function lpTplSessions(b) {
  if (!b || b.lpTt || !b.created || !/^Template:/.test(b.sched || '') || BATCH_WORLD[b.code]) return;
  b.lpTt = true; const at = now().toISOString(), have = new Set(s4bSess(b.code).map(s => s.id));
  batchEvents0(b).filter(e => e.type === 'class' && !have.has(e.id)).forEach(e => s4bSess(b.code).push({ id: e.id, batch: b.code, title: e.title, start: e.start, end: new Date(s4bEndOf(e)).toISOString(), teacher: e.teacher || (b.teachers || [])[0] || null, link: e.link || null, loc: e.loc || null, status: 'Scheduled', with: [], tt: true, hist: [[at, ADMIN.me.name, 'Created from the schedule template', '—', fdt(e.start), b.sched]] }));
}
const _stbLP = syncTasBatches;
syncTasBatches = function () { const r = _stbLP.apply(this, arguments); (ADMIN.batches || []).forEach(lpTplSessions); return r; };

/* ---------- Unit filters and the timeline's unit row: the batch programme's own curriculum ---------- */
const lpUnits = b => (b && typeof s2Tree === 'function' ? s2Tree(b.course) : []) || [];
const lpPrNew = title => { const pr = (ADMIN.programmes || []).find(p => p.title === title); return !!(pr && pr.chNew); };
// Built-in programmes keep their seeded values; a Course Builder programme lists its own units, and a learner is "behind" on the units
// of their published assignments that are past due and not submitted
function lpUnitFilter(ls, label, pre) {
  const nm = c => (pre ? pre + String(c).replace(/^U/, '') : c), opts = new Set();
  const get = l => {
    if (!l.batch || !lpPrNew(l.batch.course)) { const v = l.outstanding > 2 ? ['305', '307'] : l.outstanding ? ['307'] : []; return v.length ? v.map(x => nm('U' + x)).join('|') : 'None'; }
    const w = typeof n4World === 'function' ? n4World(l.lid) : null, late = w && w.assignments ? w.assignments.filter(a => ['Not Started', 'Resubmission Required'].includes(a.status) && a.due && new Date(a.due) < now()).map(a => s2UnitCode(a.unit)).filter(Boolean) : [];
    return late.length ? [...new Set(late)].map(nm).join('|') : 'None';
  };
  (ls || []).forEach(l => { if (!l.batch) return; if (lpPrNew(l.batch.course)) lpUnits(l.batch).forEach(u => opts.add(nm(u.code))); else ['305', '307'].forEach(x => opts.add(nm('U' + x))); });
  return { k: 'u', l: label, get, opts: [...opts] };
}

/* ---------- Staff headings: a batch whose label is its code is named once (display only; nothing is renamed) ---------- */
// Batch pages and the timeline head each batch "label <code>"; Create batch stores the code as the label, which read "DEMO-L3-JAN27 DEMO-L3-JAN27"
AFTER.push(() => {
  const same = new Set(((typeof ADMIN !== 'undefined' && ADMIN && ADMIN.batches) || []).filter(b => b.label === b.code).map(b => b.code)); if (!same.size) return;
  document.querySelectorAll('#app h1 > .mono, #app h2 > .mono').forEach(sp => { const c = sp.textContent.trim(), p = sp.previousSibling; if (same.has(c) && p && p.nodeType === 3 && p.textContent.trim() === c) { sp.remove(); p.textContent = p.textContent.replace(/\s+$/, ''); } });
});

/* ---------- Staff side of a reassignment: a Teacher / Assessor no longer assigned can read, not reply (PD-LP-14) ---------- */
// The conversation stays with the people it was addressed to (staff inboxes keep their rules); a reply needs the current relationship
const lpStaffMay = t => { if (!t || !t.lthread || !t.v || S.portal !== 'staff') return true; const w = STORE.worlds[t.v]; return !lpBatch(w) || lpPeople(w).some(p => p.name === TME().name); };
const _tReplyLP = SUBMIT.tasReply;
SUBMIT.tasReply = function (f) {
  const t = tasThreads().find(x => x.id === f.dataset.id);
  if (t && !lpStaffMay(t)) return w0Deny('Messages', t.subject, 'Reply to a learner', `You're no longer one of ${VNAME(t.v)}'s assigned teachers or assessors.`);
  return _tReplyLP.apply(this, arguments);
};
const _tMsgLP = SCREENS['t-messages'];
SCREENS['t-messages'] = function (p) {
  const h = _tMsgLP.apply(this, arguments), t = p && p.id && tasThreads().find(x => x.id === p.id);
  return t && !lpStaffMay(t) ? h.replace(/<form class="chat-f" data-submit="tasReply"[\s\S]*?<\/form>/, `<div class="note b-grey lp-ro" role="status">${ic('lock')}<div class="small"><strong>You're no longer one of this learner's assigned staff.</strong> The conversation is kept for your records.</div></div>`) : h;
};

/* ---------- Browse: an active short-course enrolment is continued, not bought again (PD-LP-15) ---------- */
// Completed or expired enrolments keep "Buy now" (re-enrolment); certificate renewal keeps its own route. Prices and payments unchanged.
const lpActiveShort = c => c && c.kind === 'short' && W && (W.enrolments || []).find(e => e.kind === 'short' && e.status === 'Active' && (!e.end || new Date(e.end) > now()) && ((c.course && e.courseId === c.course) || e.base === c.title));
const _catLP = catCard;
catCard = function (c) {
  const h = _catLP.apply(this, arguments), e = lpActiveShort(c); if (!e || !h) return h;
  return h.replace(`<button class="btn btn-sm" data-act="buyCourse" data-id="${c.id}">Buy now</button>`, `<button class="btn btn-sm btn-primary lp-continue" data-go="course" data-id="${esc(e.id)}" data-cat="${c.id}">Continue learning</button>`).replace('</article>', `<span class="xs muted">You're enrolled until ${fd(e.end)}.</span></article>`);
};

/* ---------- Coordinator batch page: an unknown tab in the address opens Overview, never "undefined" (PD-LP-16) ---------- */
const _cbdLP = cooBatchDetail;
cooBatchDetail = function (code, t) {
  const h = _cbdLP.apply(this, arguments);
  if (typeof h !== 'string' || !/undefined\s*$/.test(h) || t === 'overview') return h;
  return _cbdLP.call(this, code, 'overview').replace(/(<div class="tabs-scroll">)/, `<div class="note b-grey lp-tab" role="status">${ic('info')}<div class="small">That section doesn't exist — showing the batch overview.</div></div>$1`);
};

/* ---------- Attendance with nothing recorded: no "NaN%" and no "Below the minimum" warning ---------- */
const _attLP = SCREENS.attendance;
SCREENS.attendance = function () {
  const h = _attLP.apply(this, arguments); if ((W.attendance || []).length) return h;
  return h.replace(/<span class="big-num" style="color:var\(--redor\)">NaN%<\/span><span class="small">! Below the programme minimum of 80%<\/span>/, '<span class="big-num lp-noatt">—</span><span class="small">No attendance recorded yet</span>');
};

/* ---------- Help → Contact the Academy: delivered to an Academic Admin like "New message" (it was only a toast) ---------- */
SUBMIT.contact = () => {
  const b = $('#ct-msg').value.trim(); if (!b) return fieldErr('#ct-msg', 'Write your message');
  const topic = $('#ct-topic').value, aa = acaAdmins()[0], to = 'Academic Admin — ' + aa, at = now().toISOString(), id = 't' + Date.now(), s = 'Help: ' + topic;
  W.threads.unshift({ id, subject: s, course: 'Academic Admin', with: [to], unread: false, msgs: [{ me: true, from: 'You', at, text: b }] });
  if (typeof ADMIN !== 'undefined' && ADMIN) ADMIN.threads.unshift({ id: 'MT-L' + Date.now(), subject: s, party: `${W.me.first} ${W.me.last} (learner)`, status: 'Open', cat: 'Learner', to: aa, lv: S.variant, lthread: id, msgs: [[`${W.me.first} ${W.me.last}`, at, b]] });
  $('#ct-msg').value = ''; toast(`Message sent to an Academic Admin (${aa}). We reply within 2 working days — the conversation is in Messages.`);
};
