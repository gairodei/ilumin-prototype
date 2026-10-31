/* ============================================================
   Batch CF — client feedback (31 Oct 2026; PD-CF-* in PROVISIONAL-DECISIONS.md). Loads last.
   A  Assignment page: status and deadline at the top, the brief as the main content (criteria in a disclosure), one References
      box after the questions (PD-CB-37, unchanged), then "Evidence and submission" (the files attached under each question,
      Save draft, Review & Submit). Coordinators see the submitted references beside the answers, as Assessors already did.
   B  Client demo only: the demo programme's checklist marks Right to work, Enhanced DBS and Highest qualification Optional,
      through the checklist editor (a versioned, audited change) before the demo learners sign up. The product default
      checklist, every other programme and the required-document rules are unchanged.
   C  Start learning / Continue learning: one primary action on the dashboard card, the NVQ programme page, the short course's
      Overview and Browse, routed to the first or next eligible activity. No action while a gate (sign-up, paused) applies.
   D  No second active enrolment or charge for the same short course: Buy now, Re-purchase and Renew refuse (logged) while an
      Active or Payment Pending enrolment exists, and Pay rechecks. Re-enrolment after completion or expiry keeps its own ID.
      Browse shows Continue learning / Continue sign-up for the learner's own NVQ programme.
   E  A module quiz opens when the module's required content is complete (the course's completion rules say which kinds are
      required; links and kinds the course doesn't require never block). A quiz-only module is open. Enforced in startQuiz,
      its confirmation, the quiz screen and finishQuiz.
   F  Learning Resources: available resources first, then "Not available yet" (locked or scheduled) per course; an empty state;
      direct opening or downloading of anything not released to the learner is refused and logged.
   G  Progress & Gap Analysis: an Overview (programme progress, what to do next, academic work, units) and detail tabs
      (criteria and evidence, assessment feedback, gaps, PD, portfolio). No projection unless the record holds one; no outcome.
   Final review: the dashboard's "On track" / "Behind schedule" (today + 84 days) give way to a neutral status; the client demo gets
   two synthetic resources (one available, one scheduled); renewal stays a new enrolment, refused only while the course is active.
   The admission entitlement rules (learn while Admissions reviews) are not changed.
   ============================================================ */
'use strict';

const cfTpl = h => { const t = document.createElement('template'); t.innerHTML = h; return t; };
const cfLearner = () => S.portal === 'learner' && !!(W && W.me);
const cfWho = () => (W && W.me ? `${W.me.first} ${W.me.last} (${W.me.id})` : '—');
const cfTxt = h => String(h || '').replace(/<[^>]+>|&nbsp;/g, '').trim();

/* ---------- A. Assignment page ---------- */
const cfSavedKey = a => 'cfsaved.' + a.id;
// The files attached so far under each open answer box
function cfAttList(a, resub) {
  return (resub ? a.qs.filter(q => q.state === 'rework') : a.qs).map(q => [q, W.drafts['att.' + a.id + '.' + q.id + '.' + (resub ? q.rounds.length : 0)] || []]).filter(([, l]) => l.length);
}
function cfSubmitBox(a, resub) {
  const at = cfAttList(a, resub), sv = W.drafts[cfSavedKey(a)];
  return `<section class="card cf-submit" aria-labelledby="cf-sub-h"><h3 id="cf-sub-h">Evidence and submission</h3>
    ${at.length ? `<ul class="list small cf-att">${at.map(([q, l]) => `<li class="li"><span class="strong">Q${a.qs.indexOf(q) + 1}</span><div class="row">${l.map(f => `<span class="attach">${ic('doc', 13)}${esc(f)}</span>`).join('')}</div></li>`).join('')}</ul>` : '<p class="small muted cf-noatt">No evidence files attached yet. Attach each file under the question it supports.</p>'}
    <div class="row cf-sub-act"><span class="xs muted cf-saved" role="status" aria-live="polite">${sv ? 'Draft saved ' + fdt(sv) : ''}</span><button class="btn" data-act="cfSaveDraft" data-id="${a.id}">Save draft</button><button class="btn btn-primary" data-act="reviewSubmit" data-id="${a.id}">Review &amp; Submit</button></div></section>`;
}
// The closing Review & Submit row becomes the evidence-and-submission step (after the References box, PD-CB-37)
const CF_END = '<div class="row" style="justify-content:flex-end">';
const cfEndSwap = (h, a, resub) => { const k = h.lastIndexOf(CF_END); if (k < 0) return h; const e = h.indexOf('</div>', k) + 6; return h.slice(0, k) + cfSubmitBox(a, resub) + h.slice(e); };
const _sheetCF = answerSheet;
answerSheet = function (a) { const h = _sheetCF.apply(this, arguments); return cfLearner() ? cfEndSwap(h, a, false) : h; };
const _resubCF = resubView;
resubView = function (a) { const h = _resubCF.apply(this, arguments); return cfLearner() ? cfEndSwap(h, a, true) : h; };
ACT.cfSaveDraft = el => {
  const a = asgById(el && el.dataset && el.dataset.id); if (!a || !cfLearner()) return false;
  if (!['Not Started', 'Resubmission Required'].includes(a.status) || a.closed || (W.nvq && W.nvq.status === 'Discontinued')) { toast('This assignment isn\'t open for editing.', 'err'); return false; }
  $$('#main .rte-body[data-key]').forEach(b => { if (b.dataset.key.startsWith(a.id + '.') && b.getAttribute('contenteditable') === 'true') W.drafts[b.dataset.key] = b.innerHTML; });
  W.drafts[cfSavedKey(a)] = now().toISOString(); DIRTY = false; clearTimeout(SAVE_T); setSave('ok');
  const s = $('#main .cf-saved'); if (s) s.textContent = 'Draft saved ' + fdt(W.drafts[cfSavedKey(a)]);
  toast('Draft saved. Your answers and references are kept until you submit.');
};
// Top of the page: one status-and-deadline card, then the brief; the criteria list and the submission rules are disclosures
function cfAsgTop(c, a) {
  const sec = n => [...c.querySelectorAll('section.card')].find(s => { const x = s.querySelector(':scope > h2'); return x && x.textContent.trim() === n; });
  const brief = sec('Brief'), dl = sec('Deadline'); if (!brief || !dl || brief.parentElement !== dl.parentElement) return false;
  const kids = [...dl.children], at = t => kids.findIndex(x => x.tagName === 'H3' && x.textContent.trim() === t), iR = at('Submission rules'), iS = at('Status');
  if (iR < 0 || iS < 0) return false;
  const html = l => l.map(x => x.outerHTML).join('');
  const open = ['Not Started', 'Resubmission Required'].includes(a.status);
  const due = open || !a.submittedAt ? html(kids.slice(1, iR)) : `<p class="strong">${fdt(a.submittedAt)}</p><p class="xs muted">Deadline ${fdt(a.resubDue || a.due)}</p>`, rules = html(kids.slice(iR + 1, iS)), hist = (a.timeline || []).length ? html(kids.slice(iS + 1)) : '';
  const rs = a.resubMax > 0 && (a.resubUsed > 0 || a.status !== 'Not Started') ? `<div class="cf-st"><span class="eyebrow">Resubmissions</span><p class="small">${a.resubUsed} of ${a.resubMax} used</p></div>` : '';
  const top = `<section class="card cf-asg-top" aria-label="Status and deadline"><div class="cf-st-row"><div class="cf-st"><span class="eyebrow">Status</span><div>${chip(a.status)}</div></div><div class="cf-st cf-due"><span class="eyebrow">${!open && a.submittedAt ? 'Submitted' : a.resubDue ? 'Resubmission deadline' : 'Deadline'}</span>${due}</div>${rs}</div>
    <details class="cf-more"><summary class="small strong">Submission rules${hist ? ' and history' : ''}</summary><div class="stack" style="gap:6px">${rules}${hist ? '<h3>History</h3>' + hist : ''}</div></details></section>`;
  // Brief: the template note goes when there is no template; Linked criteria becomes a disclosure
  const bk = [...brief.children], iC = bk.findIndex(x => x.tagName === 'H3' && x.textContent.trim() === 'Linked criteria');
  if (iC >= 0 && bk[iC + 1]) { const d = document.createElement('details'); d.className = 'cf-crit'; d.innerHTML = `<summary class="small strong">Criteria this assignment covers (${a.crit.length})</summary>`; d.appendChild(bk[iC + 1]); bk[iC].replaceWith(d); }
  const nt = brief.querySelector('.cb-notpl'); if (nt) { const h3 = nt.previousElementSibling; if (h3 && h3.tagName === 'H3') h3.remove(); nt.remove(); }
  brief.classList.add('cf-brief');
  const box = cfTpl(top).content; dl.parentElement.replaceWith(box, brief);
  return true;
}
const _asgCF = SCREENS.assignment;
SCREENS.assignment = p => {
  const h = _asgCF(p), a = p && p.id && W && (W.assignments || []).find(x => x.id === p.id); if (!a || !cfLearner()) return h;
  const t = cfTpl(h), c = t.content; if (!cfAsgTop(c, a)) return h;
  // The round code and resubmission count are in the status card (when they mean something)
  const ph = c.querySelector('.page-h'); if (ph) [...ph.querySelectorAll('span')].forEach(s => { if ((s.classList.contains('code') && s.textContent.trim() === roundLbl(a)) || (s.classList.contains('muted') && /^\d+ of \d+ resubmissions? used$/.test(s.textContent.trim())) || (s.classList.contains('chip') && s.textContent.trim() === a.status)) s.remove(); });
  return t.innerHTML;
};
// Coordinators see the submitted references with the answers, as the Assessor does (CB5)
const _cSubCF = SCREENS['c-sub'];
SCREENS['c-sub'] = p => {
  const h = _cSubCF(p), s = typeof mySubmissions === 'function' ? mySubmissions(true).find(x => x.key === (p && p.id)) : null; if (!s || /cb-refs-done/.test(h)) return h;
  const w = typeof chWorldByLid === 'function' && s.L && s.L.lid ? chWorldByLid(s.L.lid) : null, a = w && (w.assignments || []).find(x => x.id === (s.a ? s.a.id : s.aid));
  return a && a.refsOn ? h + cbRefsDone(a) : h;
};

/* ---------- B. Client demo: the demo programme's document checklist ---------- */
// Right to work, Enhanced DBS and Highest qualification were mandatory only because the new-programme defaults tick them; the
// client hasn't confirmed them. The demo marks them Optional (still listed, still configurable) through the checklist editor.
const CF_DEMO_OPT = ['Right to work', 'Enhanced DBS certificate (or police clearance)', 'Highest qualification certificate'];
const CF_DEMO_WHY = 'Client demo: optional until the client confirms whether this document is required';
function cfDemoChecklist() {
  const pr = typeof cdPr === 'function' && cdPr(); if (!pr || typeof s4List !== 'function') return;
  const L = s4List(pr.id); if (!L.items.some(it => CF_DEMO_OPT.includes(it.name) && it.mand && it.status === 'Active')) return;
  setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; // a published programme's checklist is the Super Admin's (s4CanCk)
  L.items.forEach((it, i) => {
    if (!CF_DEMO_OPT.includes(it.name) || !it.mand || it.status !== 'Active') return;
    ACT.s4CkEdit({ dataset: { p: pr.id, i: String(i) } }); const m = $('#ck-m'), r = $('#rsn'); if (!m || !r) return closeModal();
    m.value = '0'; r.value = CF_DEMO_WHY; cdPress(); closeModal();
  });
}
// Two synthetic learning resources on the demo programme's first module, added and published by the Academic Admin through the
// resource workflow (Draft → Published, audited): one released now, one released on the batch's start date (locked until then).
const CF_DEMO_RES = [['Sample handout: person-centred care (client demo)', 'Synthetic demonstration handout — not course material.', 'now'],
  ['Sample slides: agreeing a care plan (client demo)', 'Synthetic demonstration slides — released when your batch starts.', 'start']];
const CF_DEMO_RWHY = 'Client demo: synthetic resource for the Learning Resources demonstration';
function cfDemoResources() {
  const pr = typeof cdPr === 'function' && cdPr(), b = typeof cdBatch === 'function' && cdBatch(); if (!pr || !b || typeof s4bMods !== 'function') return;
  const mk = (s4bMods(pr.id)[0] || {}).key; if (!mk) return;
  acaEnter('KA'); S.signedIn = true;
  CF_DEMO_RES.forEach(([t, d, rel]) => {
    if (S4B().res.some(r => r.title === t)) return;
    ACT.aUpload(); if (!$('#rs-t')) return closeModal();
    $('#rs-t').value = t; $('#rs-d').value = d; $('#rs-p').value = pr.id; $('#rs-m').innerHTML = s4bModOpts(pr.id); $('#rs-m').value = mk;
    $('#rs-y').value = rel === 'now' ? 'PDF' : 'PPT'; ACT.s4bSample();
    if (rel === 'start') { $('input[name="rs-k"][value="date"]').checked = true; $('#rs-dt').value = String(b.start).slice(0, 10); }
    cdPress(); closeModal();
    const r = S4B().res.find(x => x.title === t); if (!r) return;
    ACT.s4bPub({ dataset: { id: r.id } }); const rs = $('#rsn'); if (rs) rs.value = CF_DEMO_RWHY; cdPress(); closeModal();
  });
}
if (typeof cdLearners === 'function') { const _cdLCF = cdLearners; cdLearners = function () { if (typeof cdBatch === 'function' && cdBatch()) { cfDemoChecklist(); cfDemoResources(); } return _cdLCF.apply(this, arguments); }; }

/* ---------- Dashboard status: no predictive status without a recorded projection ---------- */
// C7's "On track" and its "Behind schedule" reason compared today + 84 days (csProjected's fallback) with the programme end — not a
// calculation from the learner's records. The schedule reason now applies only to a recorded projection; the other reasons (overdue
// assignments, a resubmission due within 3 days, an overdue payment, an expiring certificate) are unchanged. With none, the badge
// says so neutrally ("Nothing overdue") instead of predicting "On track".
const cfProj = () => (W && W.nvq && W.nvq.projected) || null;
csReasons = function () {
  if (!csIsNvq()) return [];
  const out = [];
  if (csOverdueAsg().length) out.push('assignments');
  if (W.assignments.some(a => a.status === 'Resubmission Required' && a.resubDue && daysTo(a.resubDue) >= 0 && daysTo(a.resubDue) <= 3)) out.push('resubmission');
  if (W.payOverdue || (W.plans || []).some(pl => pl.rows.some(r => r.status === 'Overdue'))) out.push('payment');
  if (cfProj() && W.nvq.end && new Date(cfProj()) > new Date(W.nvq.end)) out.push('schedule');
  if (csExpiring().length) out.push('certificate');
  return out;
};
const _aiCF = actionItems;
actionItems = function () { const out = _aiCF.apply(this, arguments); return cfProj() ? out : out.filter(x => x.cs !== 'schedule'); };
csStatusBadge = function () {
  const on = csReasons().length > 0, l = on ? 'Needs attention' : 'Nothing overdue';
  return `<button class="cs-status chip t-${on ? 'amber' : 'grey'}" data-act="csToActions" data-s="${on ? 'attn' : 'none'}" aria-label="${l} — go to Action needed"><span class="chip-i" aria-hidden="true">${on ? '!' : '✓'}</span>${l}</button>`;
};

/* ---------- E. Short-course module quiz prerequisites ---------- */
// The content kinds the course requires, read from its completion requirements (S1 rules / the enrolment's requirements).
function cfReqKinds(e) {
  const k = new Set();
  (e.reqs || []).forEach(([t]) => {
    if (/^Open all documents/.test(t)) k.add('doc'); else if (/^Watch all videos/.test(t)) k.add('video');
    else if (/^Complete all/.test(t)) ['doc', 'video', 'scorm'].forEach(x => k.add(x)); else if (/SCORM|^Complete the /.test(t)) k.add('scorm');
  });
  return k;
}
// The completion signals the course already records (opening a document, 90% of a video, a finished SCORM package)
const cfDone = c => c.state === 'Completed' || (c.kind === 'doc' && c.state !== 'Not opened') || (c.kind === 'video' && c.watch >= 90);
const cfPrereqs = (e, m) => { const k = cfReqKinds(e); return (m.items || []).map(id => (e.content || []).find(c => c.id === id)).filter(c => c && k.has(c.kind)); };
const cfTodo = (e, m) => cfPrereqs(e, m).filter(c => !cfDone(c));
const cfQuizLocked = (e, m) => !!(e && m && e.kind === 'short' && !shPassed(m) && cfTodo(e, m).length);
const cfHow = c => (c.kind === 'video' ? 'Watch at least 90%' : c.kind === 'scorm' ? 'Complete the interactive module' : 'Open the document');
const cfOpenLbl = c => (c.kind === 'video' ? 'Watch' : c.kind === 'scorm' ? 'Launch' : 'Open');
const cfLockNote = (e, m) => `<div class="note b-amber cf-qlocked" role="status">${ic('lock')}<div class="stack" style="gap:6px"><strong>This module's quiz opens when you've completed its content.</strong><ul class="list small">${cfTodo(e, m).map(c => `<li class="li"><div class="li-b"><span>${esc(c.title)}</span><span class="xs muted">${cfHow(c)}</span></div><button class="btn btn-sm" data-act="openItem" data-e="${e.id}" data-id="${c.id}">${cfOpenLbl(c)}</button></li>`).join('')}</ul></div></div>`;
function cfQuizRefuse(e, m) {
  const t = cfTodo(e, m);
  logA('Short Courses', `${cfWho()} · ${e.title} · ${m.title}`, 'Blocked: start module quiz (required content not complete)', '—', '—', t.map(c => c.title).join('; '));
  toast(`Complete this module's content first: ${t.map(c => c.title).join(', ')}.`, 'err'); return false;
}
const _startCF = ACT.startQuiz;
ACT.startQuiz = el => {
  const e = enrolById(el && el.dataset && el.dataset.id), m = e && e.kind === 'short' && (shModOf(e, el.dataset.m) || shCurMod(e));
  if (e && e.kind === 'short' && e.status !== 'Active') { logA('Short Courses', `${cfWho()} · ${e.title}`, 'Blocked: start module quiz (enrolment not active)', '—', '—', e.status); toast('This course isn\'t active, so its quizzes can\'t be started.', 'err'); return false; }
  if (cfQuizLocked(e, m)) return cfQuizRefuse(e, m);
  const r = _startCF(el), a = MODAL && /Start the quiz/.test(MODAL.title || '') && MODAL.actions.find(x => /primary/.test(x.cls || ''));
  if (a && a.fn && m) { const g = a.fn; a.fn = (...x) => (cfQuizLocked(e, m) ? (closeModal(), cfQuizRefuse(e, m)) : g(...x)); }
  return r;
};
const _finishCF = finishQuiz;
finishQuiz = function () {
  const Q = W.quiz, e = Q && enrolById(Q.e), m = e && (shModOf(e, Q.m) || shCurMod(e));
  if (Q && !Q.result && cfQuizLocked(e, m)) { W.quiz = null; clearTimer('quiz'); cfQuizRefuse(e, m); go('course', { id: e.id, tab: 'quiz' }); return; }
  return _finishCF.apply(this, arguments);
};
const _quizScrCF = SCREENS.quiz;
SCREENS.quiz = p => {
  const e = enrolById(p && p.id), Q = W.quiz, m = e && Q && Q.e === e.id && !Q.result ? shModOf(e, Q.m) || shCurMod(e) : null;
  if (m && cfQuizLocked(e, m)) { W.quiz = null; clearTimer('quiz'); return `${pageHead('Quiz', esc(e.title))}<section class="card">${cfLockNote(e, m)}<button class="btn" data-go="course" data-id="${e.id}" data-tab="quiz">Back to the course</button></section>`; }
  return _quizScrCF(p);
};

/* ---------- C. Start learning / Continue learning ---------- */
// The next eligible activity of a short course: the first incomplete required item of the first unpassed module, else its quiz
function cfShortNext(e) {
  if (!e || e.kind !== 'short' || e.status !== 'Active' || (e.end && new Date(e.end) < now())) return null;
  for (const m of shMods(e)) { if (shPassed(m)) continue; const t = cfTodo(e, m); return t.length ? { k: 'item', m, c: t[0] } : { k: 'quiz', m }; }
  const k = cfReqKinds(e), c = (e.content || []).find(x => k.has(x.kind) && !cfDone(x)); return c ? { k: 'item', c } : null;
}
const cfShortStarted = e => (e.content || []).some(c => c.state !== 'Not opened') || shMods(e).some(m => m.quiz.attempts.length);
// The next NVQ activity: the earliest resubmission, else the earliest assignment not started, that can still be submitted
function cfNvqNext() {
  if (!W.flags.nvq || !W.nvq || W.nvq.status === 'Discontinued' || lockFor('assignment')) return null;
  const open = (W.assignments || []).filter(a => !a.closed && !(typeof dLate === 'function' && dLate(a)) && !(typeof fLateOpen === 'function' && fLateOpen(a))), by = a => new Date(a.resubDue || a.due);
  const pick = st => open.filter(a => a.status === st).sort((x, y) => by(x) - by(y))[0];
  return pick('Resubmission Required') || pick('Not Started') || null;
}
const cfHasDraft = a => Object.keys(W.drafts || {}).some(k => k.startsWith(a.id + '.') && cfTxt(W.drafts[k]));
const cfNvqStarted = () => (W.assignments || []).some(a => a.status !== 'Not Started' || cfHasDraft(a)) || allCrit().some(c => c.st !== 'Not Started');
function cfNext(e) {
  if (!cfLearner() || !e || e.status !== 'Active') return null;
  if (e.kind === 'nvq') { const a = cfNvqNext(); return a ? { label: cfNvqStarted() ? 'Continue learning' : 'Start learning', what: `${a.status === 'Resubmission Required' ? 'Resubmit' : cfHasDraft(a) ? 'Finish' : 'Start'} ${a.title}`, when: `Due ${fdt(a.resubDue || a.due)}` } : null; }
  if (lockFor('course')) return null;
  const n = cfShortNext(e); if (!n) return null;
  return { label: cfShortStarted(e) ? 'Continue learning' : 'Start learning', what: n.k === 'quiz' ? `Module quiz — ${n.m.title}` : n.c.title, when: n.m ? `Module ${shModNo(e, n.m)} of ${shMods(e).length}` : '' };
}
const cfBtn = (e, n, cls = '') => `<button class="btn btn-primary cf-learn ${cls}" data-act="cfLearn" data-id="${esc(e.id)}">${n.label}</button>`;
ACT.cfLearn = el => {
  const e = enrolById(el && el.dataset && el.dataset.id); if (!e) return;
  if (e.kind === 'nvq') { const a = cfNvqNext(); return a ? go('assignment', { id: a.id }) : go('course', { id: e.id }); }
  const n = !lockFor('course') && cfShortNext(e); if (!n) return go('course', { id: e.id });
  if (n.k === 'quiz') return ACT.shModPick({ dataset: { e: e.id, m: n.m.id } });
  go('course', { id: e.id, tab: 'content' }); ACT.openItem({ dataset: { e: e.id, id: n.c.id } });
};
// Dashboard card: the primary action replaces "Open" (the course title still opens the course)
const _enrolCardCF = enrolCard;
enrolCard = function (e) {
  let h = _enrolCardCF.apply(this, arguments); const n = cfNext(e);
  // One competency legend on the NVQ card: its own chips (with the counts) become the five-state legend, so clarity.js's generic
  // legend (added where a five-state bar has none, without counts) is no longer appended below the card as a second copy
  if (e && e.kind === 'nvq') { const c = countStates(allCrit()); h = h.replace(`<div class="chip-row">${FIVE.map(([k]) => chip(`${k} ${c[k]}`, TONE[k])).join('')}</div>`, fiveLegend(c)); }
  if (!n) return h;
  return h.replace(`<div><button class="btn btn-sm" data-go="course" data-id="${e.id}">Open ${ic('chev', 14)}</button></div>`, `<div class="cf-cta"><span class="xs muted cf-nextw">Next: ${esc(n.what)}</span>${cfBtn(e, n, 'btn-sm')}</div>`);
};
// Short-course dashboard Tasks card: the next step instead of "Go to quiz" (which ignored the module's content)
if (typeof csShortCards === 'function') { const _cscCF = csShortCards; csShortCards = function () {
  const h = _cscCF.apply(this, arguments), e = (W.enrolments || []).find(x => x.kind === 'short' && cfNext(x)), n = e && cfNext(e);
  return h.replace(/<div><button class="btn btn-sm btn-primary" data-go="course" data-id="[^"]*" data-tab="(?:quiz|content)">(?:Go to quiz|Continue course)<\/button><\/div>/, n ? `<div>${cfBtn(e, n, 'btn-sm')}</div>` : '');
}; }
const cfNextCard = (e, n) => `<section class="card cf-nextcard"><div class="row-b"><div class="stack" style="gap:2px"><span class="eyebrow">Your next step</span><span class="strong">${esc(n.what)}</span>${n.when ? `<span class="xs muted">${esc(n.when)}</span>` : ''}</div>${cfBtn(e, n)}</div></section>`;
const _courseCF = SCREENS.course;
SCREENS.course = p => {
  let h = _courseCF(p); const e = p && enrolById(p.id); if (!e || !cfLearner()) return h;
  const n = cfNext(e);
  if (e.kind === 'nvq') { const k = h.indexOf('<div class="grid-2"><section class="card"><h2>Overview</h2>'); return n && k >= 0 ? h.slice(0, k) + cfNextCard(e, n) + h.slice(k) : h; }
  if (e.kind !== 'short') return h;
  const t = (p && p.tab) || 'overview';
  if (t === 'overview') h = h.replace(`<button class="btn btn-primary" data-go="course" data-id="${e.id}" data-tab="content">Continue learning</button>`, n ? cfBtn(e, n) : '');
  if (t === 'content') shMods(e).forEach(m => { if (cfQuizLocked(e, m)) h = h.replace(new RegExp(`<button class="btn btn-sm"[^>]*data-act="shModPick" data-e="${e.id}" data-m="${m.id}"[^>]*>Go to the quiz</button>`), `<span class="xs muted cf-qlock">${ic('lock', 12)} Opens when this module's content is complete</span>`); });
  if (t === 'quiz' && e.status === 'Active') {
    const T = cfTpl(h), c = T.content, cur = shCurMod(e);
    shMods(e).forEach(m => { if (!cfQuizLocked(e, m)) return; const b = c.querySelector(`li [data-act="shModPick"][data-m="${m.id}"]`), li = b && b.closest('li'), lb = li && li.querySelector('.li-b'); if (lb) lb.insertAdjacentHTML('beforeend', `<span class="xs muted cf-qlock">${ic('lock', 12)} Opens when this module's content is complete</span>`); });
    const sb = cur && cfQuizLocked(e, cur) && c.querySelector(`[data-act="startQuiz"][data-m="${cur.id}"]`); if (sb) sb.parentElement.replaceWith(cfTpl(cfLockNote(e, cur)).content);
    h = T.innerHTML;
  }
  return h;
};

/* ---------- D. No duplicate active short-course enrolment or charge ---------- */
const cfLive = e => e.status === 'Payment Pending' || (e.status === 'Active' && (!e.end || new Date(e.end) > now()));
// The same course: its course ID, its title (an enrolment's base or dated title) or its content topic
const cfSame = (e, k) => (k.course && e.courseId === k.course) || (k.title && (e.base === k.title || e.title === k.title || String(e.title || '').startsWith(k.title + ' — '))) || (k.topic && e.topic === k.topic);
const cfDupOf = k => (W.enrolments || []).find(e => e.kind === 'short' && cfLive(e) && cfSame(e, k));
function cfDupRefuse(e, what) {
  logA('Short Courses', `${cfWho()} · ${e.base || e.title}`, `Blocked: ${what} (already enrolled)`, '—', '—', `Enrolment ${e.id} is ${e.status}${e.end ? ' until ' + fd(e.end) : ''}`);
  toast(e.status === 'Payment Pending' ? `Your payment for ${e.base || e.title} is being confirmed — you don't need to pay again.` : `You're already enrolled on ${e.base || e.title} until ${fd(e.end)}. Continue from My Courses — you haven't been charged.`, 'info');
  return false;
}
const cfCat = c => (c && c.kind === 'short' ? { course: c.course || null, title: c.title, topic: c.topic || null } : null);
const _buyCF = ACT.buyCourse;
ACT.buyCourse = el => {
  const c = CATALOGUE.find(x => x.id === (el && el.dataset && el.dataset.id)), k = cfCat(c), e = k && cfDupOf(k);
  if (e) { cfDupRefuse(e, 'buy course'); go('course', { id: e.id }); return false; }
  return _buyCF(el);
};
const _repCF = ACT.repurchase;
ACT.repurchase = el => { const x = enrolById(el && el.dataset && el.dataset.id), e = x && cfDupOf({ course: x.courseId, title: x.base, topic: x.topic }); if (e) return cfDupRefuse(e, 're-purchase course'); return _repCF(el); };
const _renewCF = ACT.renewCert;
ACT.renewCert = el => {
  const ct = (W.certs || []).find(x => x.id === (el && el.dataset && el.dataset.id)), c = ct && CATALOGUE.find(x => x.kind === 'short' && ct.course.startsWith(x.title)), e = c && cfDupOf(cfCat(c));
  if (e) return cfDupRefuse(e, 'renew certificate');
  return _renewCF(el);
};
// The course a checkout pays for (Buy now, re-purchase, renewal); Pay rechecks, and a re-enrolment never reuses an ID
const cfPaidCourse = t => CATALOGUE.find(c => c.kind === 'short' && (t === c.title || String(t || '').startsWith(c.title + ' — ')));
function cfIdFix(np) {
  const E = W.enrolments, e = E[0]; if (!e || E.filter(x => x.id === e.id).length < 2) return;
  const old = e.id; let k = 2; while (E.some(x => x.id === old + '-' + k)) k++; e.id = old + '-' + k;
  (W.plans || []).slice(np).forEach(p => { if (p.e === old) p.e = e.id; });
}
const _checkoutCF = checkout;
checkout = function (o) {
  const c = o && cfPaidCourse(o.title); if (!c || !cfLearner()) return _checkoutCF.apply(this, arguments);
  const np = (W.plans || []).length, ok = o.onSuccess;
  const r = _checkoutCF.call(this, { ...o, onSuccess: ok ? (...x) => { const res = ok(...x); cfIdFix(np); return res; } : ok });
  const a = MODAL && MODAL.actions.find(x => /primary/.test(x.cls || ''));
  if (a && a.fn) { const g = a.fn; a.fn = (...x) => { const e = cfDupOf(cfCat(c)); if (e) { closeModal(); cfDupRefuse(e, 'pay for course'); render(); return; } return g(...x); }; }
  return r;
};
// Expiring-certificate cards: while the same course is already active, the card continues that enrolment (Renew would be a second one)
const cfRenewDup = ct => { const c = ct && CATALOGUE.find(x => x.kind === 'short' && ct.course.startsWith(x.title)); return c ? cfDupOf(cfCat(c)) : null; };
if (typeof csExpiryCards === 'function') { const _cseCF = csExpiryCards; csExpiryCards = function () {
  let h = _cseCF.apply(this, arguments); if (!h || !cfLearner()) return h;
  (W.certs || []).forEach(ct => { const e = cfRenewDup(ct); if (e) h = h.replace(`<button class="btn btn-sm btn-gold" data-act="renewCert" data-id="${ct.id}">Renew</button>`, `<button class="btn btn-sm cf-renew-cont" data-go="course" data-id="${esc(e.id)}" title="Completing your current enrolment renews this certificate">Continue your enrolment</button>`); });
  return h;
}; }
// Browse: the learner's own NVQ programme is continued, not applied for again (a released seat keeps "Sign up again", P-32)
const _catCF = catCard;
catCard = function (c) {
  let h = _catCF.apply(this, arguments); if (!h || !c || !cfLearner()) return h;
  if (c.kind === 'short') {
    const e = lpActiveShort(c), d = !e && cfDupOf(cfCat(c)), buy = `<button class="btn btn-sm" data-act="buyCourse" data-id="${c.id}">Buy now</button>`;
    if (d) return h.replace(buy, `<button class="btn btn-sm btn-primary cf-cont lp-continue" data-go="course" data-id="${esc(d.id)}" data-cat="${c.id}">${d.status === 'Payment Pending' ? 'Payment being confirmed' : (cfNext(d) || {}).label || 'Continue learning'}</button>`);
    const n = e && cfNext(e); return n ? h.replace('>Continue learning</button>', `>${n.label}</button>`) : h;
  }
  if (c.kind !== 'nvq' || !W.nvq || W.nvq.title !== c.title || W.nvq.status === 'Discontinued' || (typeof chReleased === 'function' && chReleased(W))) return h;
  const btn = `<button class="btn btn-sm" data-act="applyNvq" data-id="${c.id}">Apply</button>`, ne = (W.enrolments || []).find(x => x.kind === 'nvq');
  if (W.signup && !W.signup.done) return h.replace(btn, `<button class="btn btn-sm btn-primary cf-cont" data-go="admission" data-cat="${c.id}">Continue sign-up</button>`);
  return ne ? h.replace(btn, `<button class="btn btn-sm btn-primary cf-cont" data-go="course" data-id="${esc(ne.id)}" data-cat="${c.id}">Continue learning</button>`) : h;
};

/* ---------- F. Learning Resources ---------- */
const cfMyItems = () => (W.resources || []).filter(g => !g.expired).flatMap(g => g.items);
function cfResRefuse(what, id) { logA('Learning Resources', cfWho(), 'Blocked: ' + what + ' (not released to this learner)', '—', '—', String(id || '')); toast('This resource isn\'t available to you.', 'err'); return false; }
['openRes', 'resPlay', 'resScorm'].forEach(n => { const f = ACT[n]; ACT[n] = el => { if (!cfLearner()) return f(el); const id = el && el.dataset && el.dataset.id, it = cfMyItems().find(x => x.id === id); if (!it) return cfResRefuse('open resource', id); return f(el); }; });
// Course content opens only from an enrolment that shows it (active or completed) and while no access gate applies
const _openItemCF = ACT.openItem;
ACT.openItem = el => {
  if (!cfLearner()) return _openItemCF(el);
  const e = enrolById(el && el.dataset && el.dataset.e), c = e && (e.content || []).find(x => x.id === el.dataset.id);
  if (!c || !['Active', 'Completed'].includes(e.status) || lockFor('course')) { logA('Short Courses', cfWho(), 'Blocked: open course content (not available)', '—', '—', `${(e && e.title) || '—'} · ${(el && el.dataset && el.dataset.id) || '—'}`); toast('This course content isn\'t available to you.', 'err'); return false; }
  return _openItemCF(el);
};
// A download names a file; a protected resource (a programme resource, a course's content) downloads only when it is the learner's own
const cfNorm = s => String(s || '').toLowerCase().replace(/\.(pdf|docx|pptx?|zip)$/, '').trim();
function cfProtected(f) {
  const n = cfNorm(f); if (!n) return false;
  const res = (typeof S4B === 'function' ? S4B().res : []).some(r => cfNorm(r.title) === n || cfNorm(r.ref) === n);
  const course = ['mh', 'bls', 'ipc', 'cc', ''].some(t => shortContent(t).some(c => cfNorm(c.title) === n));
  const s1 = Object.values((STORE && STORE.sSpec) || {}).some(sp => (sp.items || []).some(i => cfNorm(i.title) === n || cfNorm(i.src) === n));
  const own = Object.values((STORE && STORE.worlds) || {}).some(w => (w.resources || []).some(g => g.items.some(i => cfNorm(i.title) === n || cfNorm(i.ref) === n)));
  return res || course || s1 || own;
}
function cfMine(f) {
  const n = cfNorm(f);
  const res = cfMyItems().some(i => i.state !== 'Locked' && i.dl && (cfNorm(i.title) === n || cfNorm(i.ref) === n));
  const course = (W.enrolments || []).some(e => e.kind === 'short' && ['Active', 'Completed'].includes(e.status) && (e.content || []).some(c => c.dl && cfNorm(c.title) === n));
  return res || course;
}
const _dlCF = ACT.fakeDl;
ACT.fakeDl = el => { const f = el && el.dataset && el.dataset.f; if (cfLearner() && cfProtected(f) && !cfMine(f)) return cfResRefuse('download', f); return _dlCF(el); };
// Available resources first; locked or scheduled ones together under "Not available yet"; an empty state
const _resCF = SCREENS.resources;
SCREENS.resources = p => {
  const h = _resCF(p); if (!cfLearner()) return h;
  const T = cfTpl(h), c = T.content, secs = [...c.querySelectorAll('section.stack')].filter(s => s.querySelector(':scope > h2'));
  let avail = 0, later = 0;
  secs.forEach(s => {
    const lk = [...s.querySelectorAll('li.li')].filter(li => { const a = li.querySelector('.li-a'); return a && !a.querySelector('button') && /Locked/.test(a.textContent); });
    avail += s.querySelectorAll('.card.pad0 li.li').length - lk.length; later += lk.length;
    if (!lk.length) return;
    const box = cfTpl(`<section class="card cf-later" aria-label="Not available yet"><h3>${ic('lock', 14)} Not available yet (${lk.length})</h3><p class="xs muted">These open on the date or after the step shown. You can't open them until then.</p><ul class="list"></ul></section>`).content.firstElementChild, ul = box.querySelector('ul');
    lk.forEach(li => { const card = li.closest('.card'), u = card && card.querySelector('h3, .cs-modhead h3'), l2 = li.cloneNode(true); if (u) l2.querySelector('.li-b') && l2.querySelector('.li-b').insertAdjacentHTML('afterbegin', `<span class="xs muted cf-from">${esc(u.textContent.trim())}</span>`); ul.appendChild(l2); li.remove(); });
    s.querySelectorAll('.card.pad0').forEach(cd => { if (!cd.querySelector('li.li')) cd.remove(); });
    s.appendChild(box);
  });
  const ph = c.querySelector('.page-h');
  if (!(W.resources || []).some(g => g.items.length || g.expired)) { const e = cfTpl(`<section class="card cf-res-empty">${emptyState({ icon: 'layers', title: 'No learning resources yet', why: 'The Academy adds resources for your courses as they run. They appear here when they are released to you.' })}</section>`).content; c.appendChild(e); }
  else if (ph && later) ph.insertAdjacentHTML('afterend', `<p class="small muted cf-res-sum">${plural(avail, 'resource')} available to you · ${later} not available yet (listed under each course)</p>`);
  return T.innerHTML;
};

/* ---------- G. Progress & Gap Analysis ---------- */
const CF_PTABS = [['overview', 'Overview'], ['tree', 'Criteria & evidence'], ['feedback', 'Assessment feedback'], ['plan', 'Gaps & improvement plan'], ['pd', 'PD checklist'], ['portfolio', 'My Portfolio']];
const cfGo = (route, id, label, tab) => `<button class="btn btn-sm" data-go="${route}"${id ? ` data-id="${esc(id)}"` : ''}${tab ? ` data-tab="${tab}"` : ''}>${label}</button>`;
const cfOpenAsg = a => !a.closed && !(typeof dLate === 'function' && dLate(a));
function cfNextActions() {
  const L = [], A = (W.assignments || []).filter(cfOpenAsg), by = a => new Date(a.resubDue || a.due);
  A.filter(a => a.status === 'Resubmission Required').sort((x, y) => by(x) - by(y)).forEach(a => L.push([`Resubmit ${a.title}`, `Rework the answers your assessor marked · due ${fdt(a.resubDue || a.due)}`, cfGo('assignment', a.id, 'Open')]));
  A.filter(a => a.status === 'Not Started').sort((x, y) => by(x) - by(y)).forEach(a => L.push([`${cfHasDraft(a) ? 'Finish' : 'Start'} ${a.title}`, `Due ${fdt(a.due)}`, cfGo('assignment', a.id, 'Open')]));
  (W.observations || []).filter(o => o.status === 'Proposed').forEach(o => L.push(['Confirm your observation', `${fdt(o.at)}${o.assessor ? ' with ' + o.assessor : ''}`, cfGo('observations', '', 'Open')]));
  const s = W.pd && W.pd.session; if (s && s.status === 'Proposed') L.push(['Confirm your Professional Discussion', fdt(s.at), cfGo('progress', '', 'Open', 'pd')]);
  return L;
}
const CF_WAIT = a => !['Not Started', 'Resubmission Required', 'Completed', 'Feedback Received'].includes(a.status);
function cfProgOverview() {
  const all = allCrit(), c = countStates(all), pct = all.length ? pctOf(all) : 0, pj = W.nvq.projected, late = pj && new Date(pj) > new Date(W.nvq.end);
  const sum = `<section class="card cf-psum" aria-labelledby="cf-ps-h"><div class="cf-psum-h"><div class="stack" style="gap:2px;min-width:150px"><span class="eyebrow" id="cf-ps-h">Programme progress</span><span class="big-num">${pct}%</span><span class="small muted">${c.Achieved} of ${all.length} assessment criteria achieved</span></div>
    <div class="stack" style="flex:1;min-width:min(100%,240px);gap:8px">${fiveBar(c)}${fiveLegend(c)}${pj ? `<p class="small">Projected completion: <strong>${fd(pj)}</strong> vs programme end <strong>${fd(W.nvq.end)}</strong> — ${late ? 'behind schedule' : 'on track'}</p>` : ''}</div></div></section>`;
  const acts = cfNextActions(), A = W.assignments || [];
  const next = `<section class="card cf-pnext" aria-labelledby="cf-pn-h"><h2 id="cf-pn-h">What to do next</h2>${acts.length ? `<ol class="list">${acts.slice(0, 5).map(([t, d, b]) => `<li class="li"><div class="li-b"><span class="strong">${esc(t)}</span><span class="xs muted">${esc(d)}</span></div><div class="li-a">${b}</div></li>`).join('')}</ol>${acts.length > 5 ? `<p class="xs muted">And ${acts.length - 5} more on the Assignments page.</p>` : ''}` : `<p class="small muted">${A.some(CF_WAIT) ? 'Nothing to do right now — your submitted work is with your assessor. You\'ll be told when feedback is ready.' : 'Nothing is due yet. New work appears here when it is published to you.'}</p>`}</section>`;
  const col = (h, l, empty) => `<div class="stack cf-wcol"><h3 class="small">${h} (${l.length})</h3>${l.length ? `<ul class="list small">${l.map(a => `<li class="li"><div class="li-b"><button class="linklike" data-go="assignment" data-id="${a.id}">${esc(a.title)}</button><span class="xs muted">${a.status === 'Not Started' || a.status === 'Resubmission Required' ? (cfOpenAsg(a) ? 'Due ' : 'Deadline passed ') + fdt(a.resubDue || a.due) : a.submittedAt ? 'Submitted ' + fd(a.submittedAt) : ''}</span></div>${chip(a.status)}</li>`).join('')}</ul>` : `<p class="xs muted">${empty}</p>`}</div>`;
  const ob = W.observations || [], obUp = ob.filter(o => ['Proposed', 'Confirmed'].includes(o.status)).length, obDone = ob.filter(o => o.status === 'Completed').length;
  const work = `<section class="card cf-pwork" aria-labelledby="cf-pw-h"><h2 id="cf-pw-h">Your academic work</h2><div class="cf-wgrid">${col('To do', A.filter(a => ['Not Started', 'Resubmission Required'].includes(a.status)), 'Nothing outstanding.')}${col('With your assessor', A.filter(CF_WAIT), 'Nothing waiting for marking.')}${col('Feedback received or completed', A.filter(a => ['Feedback Received', 'Completed'].includes(a.status)), 'No marked work yet.')}</div>
    <p class="small cf-pobs"><span>Observations: ${obDone} completed · ${obUp} upcoming</span>${cfGo('observations', '', 'Open observations')}</p></section>`;
  const units = `<section class="card cf-units" aria-labelledby="cf-pu-h"><h2 id="cf-pu-h">Units</h2><ul class="list">${W.tree.map(u => { const cr = critOf(u), n = cr.filter(x => x.st === 'Achieved').length, ar = cr.filter(x => x.st === 'Action Required').length;
    return `<li class="li cf-unit" data-u="${esc(u.code)}"><div class="li-b"><span class="strong"><span class="code">${esc(u.code)}</span> ${esc(u.title)}</span><span class="xs muted">${n} of ${cr.length} criteria achieved${ar ? ` · ${ar} need${ar === 1 ? 's' : ''} action` : ''}</span>${bar(cr.length ? pctOf(cr) : 0, u.code + ' progress')}</div><div class="li-a"><button class="btn btn-sm" data-act="cfUnit" data-u="${esc(u.code)}">View criteria</button></div></li>`; }).join('')}</ul></section>`;
  return sum + `<div class="grid-2">${next}${work}</div>` + units;
}
ACT.cfUnit = el => { setUi('cfUnit', el.dataset.u); go('progress', { tab: 'tree' }); };
// Assessment feedback: what the learner already sees on each assignment page, together (released feedback only; no outcome)
function cfFbAsg(a, open) {
  const J = typeof r3Judg === 'function' && W.me ? r3Judg(W.me.id + '~' + a.id).filter(j => j.published) : [];
  const files = a.qs.reduce((n, q) => n + q.rounds.reduce((m, r) => m + (Array.isArray(r.att) ? r.att.length : 0), 0), 0), sub = a.qs.filter(q => q.rounds.length).length;
  const qs = a.qs.map((q, k) => { const fb = (q.fb || []).map((f, n) => (f ? `<div class="cf-fbr">${rag(f.rag)} <span class="xs muted">${ROUNDNAME(n)} · ${esc(f.by)} · ${fdt(f.at)}</span><p class="small">${esc(f.text)}</p></div>` : '')).join('');
    return `<li class="li cf-fbq"><div class="li-b"><span class="small"><strong>Q${k + 1}</strong> <span class="code">${esc(q.crit || '')}</span> ${esc(q.text)}</span>${fb || `<span class="xs muted">${q.rounds.length ? 'No feedback released on this answer yet' : 'Not submitted yet'}</span>`}${q.state === 'rework' ? '<span class="xs strong cf-gap">Needs further evidence — resubmit this answer</span>' : q.state === 'pd' ? '<span class="xs strong">Added to your Professional Discussion</span>' : ''}</div></li>`; }).join('');
  const crit = J.length ? `<h4 class="small">Feedback on each criterion</h4><div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Criterion</th><th>Judgement</th><th>By</th><th>Round</th><th>When</th></tr></thead><tbody>${J.slice().reverse().map(j => `<tr><td><span class="code">${esc(j.crit)}</span></td><td>${chip(j.value, r3Tone(j.value))}${j.text ? `<div class="xs">${esc(j.text)}</div>` : ''}</td><td class="small">${esc(j.by)}<div class="xs muted">${j.role === 'Assessor' ? 'Assessor' : 'Coordinator'}</div></td><td class="small">${esc(j.round)}</td><td class="small nowrap">${fdt(j.pubAt || j.at)}</td></tr>`).join('')}</tbody></table></div>` : '';
  const co = (a.coordAll || (a.coord ? [a.coord] : [])).map(c => `<div class="coord"><div class="c-h">${ic('users')}Coordinator feedback</div><p class="small">${esc(c.text)}</p><p class="xs muted">${esc(c.by)} · ${fdt(c.at)}</p></div>`).join('');
  return `<details class="card cf-fba" data-a="${a.id}" ${open ? 'open' : ''}><summary><span class="strong">${esc(a.title)}</span> ${chip(a.status)} <span class="xs muted">${sub} of ${a.qs.length} answers submitted · ${plural(files, 'evidence file')}${(a.refRounds || []).length ? ' · references given' : ''}</span></summary>
    <div class="stack" style="gap:8px;margin-top:8px">${a.overall ? `<p class="small"><strong>Overall comment:</strong> ${esc(a.overall)}</p>` : ''}${co}<ul class="list">${qs}</ul>${crit}<p class="xs muted">Feedback on individual criteria doesn't by itself decide whether the assignment is passed.</p><div>${cfGo('assignment', a.id, 'Open the assignment')}</div></div></details>`;
}
function cfFeedback() {
  const A = (W.assignments || []).filter(a => a.status !== 'Not Started' || a.qs.some(q => q.rounds.length));
  if (!A.length) return `<section class="card">${emptyState({ icon: 'edit', title: 'No assessment feedback yet', why: 'Feedback on your answers and on each criterion appears here once your assessor\'s marking is released to you.' })}</section>`;
  return `<p class="small muted">Released feedback on each assignment, newest round last. Open an assignment for your full answers.</p>` + A.map((a, i) => cfFbAsg(a, i === 0)).join('');
}
const _progCF = SCREENS.progress;
SCREENS.progress = p => {
  p = p || {}; if (!cfLearner() || !W.nvq || !W.tree) return _progCF(p);
  const t = CF_PTABS.some(x => x[0] === p.tab) ? p.tab : 'overview', own = t === 'overview' || t === 'feedback';
  const T = cfTpl(_progCF({ ...p, tab: own ? 'tree' : t })), c = T.content;
  const sum = [...c.querySelectorAll('section.card')].find(s => s.querySelector('.big-num')), tabs = c.querySelector('.subtabs');
  if (!tabs) return T.innerHTML;
  if (sum) sum.remove();
  if (own) { let x = tabs.nextElementSibling; while (x) { const n = x.nextElementSibling; x.remove(); x = n; } }
  tabs.replaceWith(cfTpl(subtabs(CF_PTABS, t, 'progress') + (t === 'overview' ? cfProgOverview() : t === 'feedback' ? cfFeedback() : '')).content);
  // "View criteria" on a unit opens that unit in the tree
  const u = ui('cfUnit', ''); if (t === 'tree' && u) c.querySelectorAll('details.lvl-1').forEach(d => { const s = d.querySelector(':scope > summary .code'); if (s && s.textContent.trim() === u) d.setAttribute('open', ''); else d.removeAttribute('open'); });
  return T.innerHTML;
};
AFTER.push(() => { if (S.route !== 'progress' || !ui('cfUnit', '')) return; const d = [...$$('#main details.lvl-1[open]')][0]; setUi('cfUnit', ''); if (d && d.scrollIntoView) d.scrollIntoView({ block: 'start' }); });

/* ---------- Records ---------- */
UXC.push(['CF', 'Client feedback — learner journeys (31 Oct 2026)', [
  'Assignment page: status and deadline at the top (rules and history in a disclosure), the brief as the main content (criteria covered in a disclosure), each question\'s answer box, one References box, then "Evidence and submission" (files attached so far, Save draft, Review & Submit). Download criteria (PDF) is unchanged; no template button unless the assignment offers one. Coordinators now see submitted references.',
  'Client demo: Right to work, Enhanced DBS and Highest qualification are Optional on the demo programme\'s checklist (a versioned, audited change made by the demo build) until the client confirms them. The default checklist and every other programme are unchanged.',
  'Start learning / Continue learning on the dashboard, the NVQ programme page, the short course\'s Overview and Browse, routed to the next eligible activity (an assignment, a module\'s next content item or its quiz). Not shown while a sign-up or paused-access gate applies.',
  'A second active enrolment or charge for the same short course is refused (Buy now, Re-purchase, Renew and Pay itself — logged); re-enrolment after completion or expiry is kept and gets its own enrolment ID. Browse shows Continue learning / Continue sign-up for the learner\'s own NVQ programme.',
  'Module quizzes open when the module\'s required content is complete (the course\'s completion rules decide which kinds are required; a quiz-only module is open). Enforced in the handlers; attempts and scores are unchanged.',
  'Learning Resources: available resources first, locked or scheduled ones under "Not available yet" per course, an empty state; opening or downloading anything not released to the learner is refused and logged, as is opening course content of an inactive enrolment.',
  'Dashboard status (final review): "Nothing overdue" (neutral) replaces "On track", and "Behind schedule" appears only for a recorded projection — both came from today + 84 days. Genuine reasons (overdue work, a resubmission due soon, an overdue payment, an expiring certificate) still show "Needs attention".',
  'Client demo (final review): two synthetic resources on the demo programme — one available, one released on the batch start — added and published through Learning Resources; Reset restores them.',
  'Renewal (final review): renewal stays a new enrolment (the approved workflow); while the course is already active the expiring-certificate card offers "Continue your enrolment" and Renew is refused with nothing charged.',
  'NVQ dashboard card (acceptance): one competency legend, with the counts (the generic legend was a second copy).',
  'Progress & Gap Analysis: Overview (programme progress from the criteria, what to do next, academic work, units with "View criteria") and detail tabs (Criteria & evidence, Assessment feedback, Gaps & improvement plan, PD checklist, My Portfolio). The projected-completion line shows only when the learner\'s record holds a projection; no outcome is derived or shown here.']]);
