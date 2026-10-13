/* ============================================================
   Client decisions — Batch 4 (CH-15, CH-16, CH-18; CH-26 / CH-28 follow-ups).
   CH-16 a quiz in every module of a short course (no course quiz) — learner screens and data are changed at source;
   this file adds the admin "Modules" tab of the short-course editor.
   CH-15 awarding-body code on every NVQ module (editable in the structure builder).
   CH-18 "Answer key" resources, uploaded per NVQ module by the Academic Admin; learners download them before they start.
   Loads after ch-b3.js.
   ============================================================ */
'use strict';

/* ---------- CH-18 answer keys (per NVQ module; latest version first) ---------- */
const CH_ANS_SEED = () => ({
  'U302 M1': [{ file: 'AC M12 Ways of Working in Adult Care — Knowledge Answer Key.pdf', at: D(-30, '10:00'), by: 'Rachel Hughes' }],
  'U305 M1': [{ file: 'U305 Duty of Care — Knowledge Answer Key.pdf', at: D(-21, '11:30'), by: 'Rachel Hughes' }],
  'U306 M1': [{ file: 'U306 Safeguarding and Protection — Knowledge Answer Key.pdf', at: D(-14, '09:15'), by: 'Joanne Lister' }],
});
const chAnsKeys = () => (STORE.chAnsKeys = STORE.chAnsKeys || CH_ANS_SEED());
const chAnsFor = key => (chAnsKeys()[key] || [])[0];
// Resources: an "Answer key" item in the module's group (a group is added when the module has none yet)
function chSyncAnsKeys(w) {
  if (!w || !w.flags || !w.flags.nvq || !w.tree || !w.resources) return;
  Object.entries(chAnsKeys()).forEach(([key, list]) => {
    const [uc, mc] = key.split(' '), u = w.tree.find(x => x.code === uc), m = u && u.mods.find(x => x.code === mc); if (!m) return;
    const k = u.mods.indexOf(m) + 1;
    let g = w.resources.find(x => { const r = nvqModOf(w.tree, x.unit); return r && r.key === key; });
    if (!g) { g = { course: w.nvq.title, unit: `${uc} ${u.title.split(' ').slice(0, 3).join(' ')} · Module ${k}`, items: [] }; w.resources.push(g); }
    const id = 'ak-' + key.replace(' ', '-'), f = list[0], it = g.items.find(x => x.id === id), desc = `Guidance for ${modLabel(m)}. Read it before you start; you still answer in your own words.`;
    if (it) Object.assign(it, { title: f.file.replace(/\.pdf$/, ''), desc }); else g.items.unshift({ id, kind: 'key', title: f.file.replace(/\.pdf$/, ''), desc, tags: ['Answer key', uc], state: 'New', dl: true });
  });
}
const chSyncAll = () => Object.values(STORE.worlds || {}).forEach(chSyncAnsKeys);
const _openResCh4 = ACT.openRes;
ACT.openRes = el => { const i = W.resources.flatMap(g => g.items).find(x => x.id === el.dataset.id); if (i && i.kind === 'key') { if (i.state === 'New') i.state = 'Opened'; render(); toast(`${i.title}.pdf downloaded (mock).`); return; } return _openResCh4(el); };
// Resources: each NVQ module group shows the module's title and awarding-body code (CH-15)
const _resCh4 = SCREENS.resources;
SCREENS.resources = p => { let h = _resCh4(p); (W.resources || []).forEach(g => { const x = nvqModOf(W.tree, g.unit); if (x) h = h.replace(`>${esc(g.unit)}</h3>`, `>${esc(g.unit)} <span class="small muted ch-modlbl">${esc(modLabel(x.m))}</span></h3>`); }); return h; };
// Assignment page: "Answer key (guidance)" next to "Download criteria (PDF)"
const _asgCh4 = SCREENS.assignment;
SCREENS.assignment = p => {
  const h = _asgCh4(p), a = asgById(p.id), r = a && nvqModOf(W.tree, a.unit), f = r && chAnsFor(r.key); if (!f) return h;
  const anchor = `${ic('download', 14)}Download criteria (PDF)</button>`;
  return h.replace(anchor, anchor + `<button class="btn btn-sm" data-act="chAnsDl" data-k="${r.key}">${ic('download', 14)}Answer key (guidance)</button>`);
};
ACT.chAnsDl = el => { const f = chAnsFor(el.dataset.k); if (f) toast(`${f.file} downloaded (mock).`); };

/* ---------- Structure builder: module code (CH-15) and answer key upload (CH-18) ---------- */
function chModAdmin(u, m) {
  const key = u.code + ' ' + m.code, f = chAnsFor(key);
  return `<div class="ch-modrow"><label class="small ch-abc">Awarding-body code <input class="input mono" value="${esc(m.ab || '')}" data-onchange="chModCode" data-k="${key}" aria-label="Awarding-body code for ${u.code} ${m.code}"></label>
    <span class="small">${ic('key', 13)} Answer key: ${f ? `<span class="mono">${esc(f.file)}</span> <span class="xs muted">· ${esc(f.by)}, ${fd(f.at)}</span>` : '<span class="muted">none</span>'}</span><button type="button" class="btn btn-sm" data-act="chAnsUp" data-k="${key}">${ic('upload', 13)}${f ? 'Replace answer key' : 'Upload answer key'}</button></div>`;
}
const chModsByKey = key => { const [uc, mc] = key.split(' '); return Object.values(STORE.worlds).flatMap(w => (w.tree || []).filter(u => u.code === uc).flatMap(u => u.mods.filter(x => x.code === mc))); };
INP.chModCode = el => {
  const v = el.value.trim(), key = el.dataset.k, mods = chModsByKey(key), old = (mods[0] || {}).ab || '—';
  if (!/^[A-Z]\/\d{3}\/\d{4}$/.test(v)) { toast('Use the awarding-body format, for example T/652/0001.', 'err'); el.value = old === '—' ? '' : old; return; }
  mods.forEach(m => { m.ab = v; }); logA('NVQ Programmes', key, 'Module awarding-body code changed', old, v, 'Structure builder'); render(); toast(`${key}: code saved (${v}).`);
};
INP.chAnsFile = el => { const f = el.files[0]; setUi('chAnsFile', f ? f.name : ''); const s = $('#ak-fname'); if (s) s.textContent = f ? f.name : 'No file chosen'; };
ACT.chAnsSample = () => { setUi('chAnsFile', 'Knowledge Answer Key (updated).pdf'); const s = $('#ak-fname'); if (s) s.textContent = 'Knowledge Answer Key (updated).pdf'; };
ACT.chAnsUp = el => {
  const key = el.dataset.k; setUi('chAnsFile', '');
  reasonDlg({ title: 'Answer key — ' + esc(key), ok: 'Upload answer key', label: 'Note (required)', extra: `<div class="field"><label for="ak-f">Answer key (PDF or DOCX)</label><input class="input" type="file" id="ak-f" accept=".pdf,.docx" data-onchange="chAnsFile"><span class="hint">Learners see it in Resources under this module and on its assignments. <span id="ak-fname">No file chosen</span></span><button type="button" class="linklike small" data-act="chAnsSample">Prototype: use a sample PDF</button></div>`,
    onOk: r => { const f = ui('chAnsFile', ''); if (!f) { fieldErr('#ak-f', 'Choose a PDF or DOCX file'); return false; } if (!/\.(pdf|docx)$/i.test(f)) { fieldErr('#ak-f', 'Upload a PDF or DOCX file'); return false; }
      const list = chAnsKeys()[key] = chAnsKeys()[key] || [], prev = list[0]; list.unshift({ file: /\.pdf$/i.test(f) ? f : f, at: now().toISOString(), by: ADMIN.me.name }); chSyncAll();
      logA('NVQ Programmes', key, 'Answer key uploaded', prev ? prev.file : '—', f, r); render(); toast('Answer key uploaded. Learners see it in Resources and on the module\'s assignments.'); } });
};

/* ---------- CH-16 admin: short-course editor → "Modules" tab (add, reorder, retire, assign content, configure each quiz) ---------- */
const CH_TOPIC = { 'Moving and Handling People': 'mh', 'Basic Life Support and Anaphylaxis': 'bls', 'Infection Prevention and Control': 'ipc', 'The Care Certificate (15 Standards)': 'cc' };
const chCourseTopic = c => CH_TOPIC[c.title] || '';
const chCourseItems = c => shortContent(chCourseTopic(c));
const chCourseMods = c => { const S_ = STORE.chCourseMods = STORE.chCourseMods || {}; return S_[c.id] = S_[c.id] || shModDefs(chCourseTopic(c)).map(([id, title, items]) => ({ id, title, items: items.slice(), status: 'Active', quiz: { q: 10, limit: 20, pass: 80, max: 3 } })); };
function chModulesTab(c) {
  const mods = chCourseMods(c), items = chCourseItems(c), live = mods.filter(m => m.status === 'Active');
  return `<section class="card"><div class="row-b"><h2>Modules</h2><button class="btn btn-sm btn-primary" data-act="chModAdd" data-c="${c.id}">${ic('plus', 14)}Add module</button></div>
    <p class="small muted">A short course is split into modules. Each module has its own content and its own quiz; learners complete the course by passing every module quiz. There is no course-level quiz. Changes apply to new enrolments and new attempts only. Retired modules are kept in the record.</p></section>
    ${mods.map((m, k) => { const n = live.indexOf(m); return `<section class="card ch-cmod ${m.status === 'Retired' ? 'ch-retired' : ''}"><div class="row-b"><div class="stack" style="gap:2px"><span class="eyebrow">${m.status === 'Retired' ? 'Retired' : `Module ${n + 1} of ${live.length}`}</span><h3>${esc(m.title)}</h3></div>
      <div class="row" style="gap:4px"><button class="btn btn-sm" data-act="chModMove" data-c="${c.id}" data-m="${m.id}" data-d="-1" ${k === 0 ? 'disabled title="Already the first module"' : ''}>Move up</button><button class="btn btn-sm" data-act="chModMove" data-c="${c.id}" data-m="${m.id}" data-d="1" ${k === mods.length - 1 ? 'disabled title="Already the last module"' : ''}>Move down</button><button class="btn btn-sm" data-act="chModRetire" data-c="${c.id}" data-m="${m.id}" ${m.status === 'Active' && live.length < 2 ? 'disabled title="A course needs at least one module"' : ''}>${m.status === 'Retired' ? 'Restore' : 'Retire'}</button></div></div>
      <fieldset class="stack ch-items"><legend class="lbl">Content in this module</legend>${items.map(it => `<label class="check small"><input type="checkbox" data-onchange="chModItem" data-c="${c.id}" data-m="${m.id}" data-i="${it.id}" ${m.items.includes(it.id) ? 'checked' : ''} ${m.status === 'Retired' ? 'disabled title="Restore the module to change it"' : ''}>${esc(it.title)}</label>`).join('')}</fieldset>
      <h4 class="small">Module quiz — "What is this module about?"</h4><div class="form-grid">${[['q', 'Questions shown'], ['limit', 'Time limit (minutes)'], ['pass', 'Pass mark (%)'], ['max', 'Allowed attempts']].map(([f, l]) => `<div class="field"><label for="mq-${m.id}-${f}">${l}</label><input class="input num" type="number" id="mq-${m.id}-${f}" value="${m.quiz[f]}" data-onchange="chModQuiz" data-c="${c.id}" data-m="${m.id}" data-f="${f}" ${m.status === 'Retired' ? 'disabled title="Restore the module to change it"' : ''}></div>`).join('')}</div></section>`; }).join('')}
    <section class="card"><h3>Question bank used by the module quizzes (${QUIZ_BANK.length})</h3><ol class="small">${QUIZ_BANK.map(q => `<li style="margin-bottom:6px">${esc(q[0])}<br><span class="muted">Correct: ${esc(q[1][q[2]])}</span></li>`).join('')}</ol><button class="btn btn-sm" data-act="addQ">${ic('plus', 14)}Add question</button></section>`;
}
const chCM = el => { const c = ADMIN.courses.find(x => x.id === el.dataset.c); return [c, chCourseMods(c)]; };
ACT.chModAdd = el => { const [c, mods] = chCM(el); reasonDlg({ title: 'Add module — ' + esc(c.title), ok: 'Add module', label: 'Module title (required)', onOk: t => { const id = 'm' + (mods.length + 1); mods.push({ id, title: t, items: [], status: 'Active', quiz: { q: 10, limit: 20, pass: 80, max: 3 } }); logA('Short Courses', c.title, 'Module added', '—', t, 'Modules tab'); render(); toast(`Module "${t}" added with its own quiz.`); } }); };
ACT.chModMove = el => { const [c, mods] = chCM(el), k = mods.findIndex(m => m.id === el.dataset.m), j = k + +el.dataset.d; if (j < 0 || j >= mods.length) return; [mods[k], mods[j]] = [mods[j], mods[k]]; logA('Short Courses', c.title, 'Modules reordered', '—', mods.map(m => m.title).join(' → '), 'Modules tab'); render(); };
ACT.chModRetire = el => { const [c, mods] = chCM(el), m = mods.find(x => x.id === el.dataset.m), to = m.status === 'Retired' ? 'Active' : 'Retired';
  if (to === 'Retired' && mods.filter(x => x.status === 'Active').length < 2) { toast('A course needs at least one module.', 'err'); return; }
  reasonDlg({ title: (to === 'Retired' ? 'Retire' : 'Restore') + ' module — ' + esc(m.title), ok: to === 'Retired' ? 'Retire module' : 'Restore module', onOk: r => { m.status = to; logA('Short Courses', c.title, to === 'Retired' ? 'Module retired' : 'Module restored', m.title, to, r); render(); } }); };
INP.chModItem = el => { const [, mods] = chCM(el), m = mods.find(x => x.id === el.dataset.m), id = el.dataset.i; if (el.checked) { mods.forEach(x => { x.items = x.items.filter(i => i !== id); }); m.items.push(id); } else m.items = m.items.filter(i => i !== id); render(); };
INP.chModQuiz = el => { const [c, mods] = chCM(el), m = mods.find(x => x.id === el.dataset.m), f = el.dataset.f, v = +el.value; const ok = { q: v >= 1 && v <= QUIZ_BANK.length, limit: v >= 1, pass: v >= 1 && v <= 100, max: v >= 1 }[f]; if (!ok) { fieldErr('#' + el.id, f === 'q' ? `Between 1 and ${QUIZ_BANK.length} (the bank size)` : f === 'pass' ? 'Between 1 and 100' : 'At least 1'); return; } const old = m.quiz[f]; m.quiz[f] = v; logA('Short Courses', `${c.title} · ${m.title}`, 'Module quiz setting changed', `${f} ${old}`, `${f} ${v}`, 'Modules tab'); };

/* ---------- Store ---------- */
const _isCh4 = initStore; initStore = function () { _isCh4(); STORE.chAnsKeys = CH_ANS_SEED(); STORE.chCourseMods = {}; chSyncAll(); };
if (typeof STORE !== 'undefined' && STORE.worlds) chSyncAll();

/* ---------- Demo Scenario #20 "Module quizzes" ---------- */
// Demo start: Daniel Okafor's Moving and Handling 2026 — content done, module quizzes not yet taken
ACT.chSc20Start = () => {
  S.edge = 'none'; S.variant = 'A'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true;
  const e = W.enrolments.find(x => x.id === 'mh26'); e.content.forEach(c => { c.state = 'Completed'; c.watch = 100; }); e.modules = shModules({ topic: e.topic }); e.status = 'Active';
  W.requests = W.requests.filter(r => !(r.type === 'Extra quiz attempts' && r.target === e.title)); recalcShort(e); setUi('shMod-mh26', 'm1');
  go('course', { id: 'mh26', tab: 'quiz' }); toast('Demo: all content done — three module quizzes to pass.', 'info');
};
const _scListCh4 = SC_LIST;
SC_LIST = function () {
  const s = (text, r, t, act) => ({ text, r, t, act });
  return _scListCh4().concat([['20', 'Module quizzes', 'CH-16', [
    s('Daniel Okafor has done all the content of Moving and Handling People 2026; it has three modules, each with its own quiz.', '', '', 'chSc20Start'),
    s('He passes the Module 1 quiz ("What is this module about?").', 'learner:A', 'course.mh26.quiz'),
    s('He fails the Module 2 quiz three times — attempts are exhausted for that module only.', 'learner:A', 'course.mh26.quiz'),
    s('He requests extra attempts for the Module 2 quiz (My Requests shows the module).', 'learner:A', 'requests'),
    s('The Academic Admin grants them in the Approvals Queue.', 'acaA', 'a-queue'),
    s('He passes Modules 2 and 3 — the course is Completed and one certificate is issued.', 'learner:A', 'certificates')]]]);
};
CDL_SCEN.push(['20', 'Module quizzes', 'Client-defined (CH-16)']);

/* ---------- Records ---------- */
CH_APPLIED[4] = '13 Oct 2026';
CH_LOG.find(r => r[0] === 'CH-26')[3] = 'Applied earlier (C11/C12); Tasks counts module quizzes (Batch 4)';
CH_LOG.find(r => r[0] === 'CH-28')[3] = 'Applied earlier (C14); "What is this module about?" (Batch 4)';
UXC.push(['CH batch 4', 'Client decisions — Batch 4 (CH-15, CH-16, CH-18; CH-26, CH-28)', [
  'CH-16: short courses are split into 2–4 modules, each with its own content and its own quiz (pass mark, time limit, attempts). Learner course page: Content lists the modules with their progress and quiz; Quiz lists the module quizzes, and each opens with "What is this module about?" and the same instructions line. The course is Completed when every module quiz is passed and the other rules are met; there is no final course quiz, and one certificate is issued per course. "Attempts exhausted" and extra-attempt requests are per module quiz (route unchanged: Academic Admin, then the Super Admin); My Requests and the Approvals Queue show the module. "One quiz per course" is removed from the course editor, mock data and tests: the short-course editor has a Modules tab (add, reorder, retire, assign content, configure each module\'s quiz). NVQ programmes have no module quizzes. Mock: existing course attempts moved to Module 1; completed courses have every module quiz passed.',
  'CH-26: the short-course dashboard Tasks card counts module quizzes to complete.',
  'CH-28: the quiz heading reads "What is this module about?".',
  'CH-15: every NVQ module shows its awarding-body code, e.g. "Person-centred values (T/652/0001)" — editable in the structure builder, and shown in Resources, on assignment headers and on the learner\'s progress tree.',
  'CH-18: new resource type "Answer key". The Academic Admin uploads one per NVQ module (structure builder); learners see it before they start — in Resources under its module (Download) and on the module\'s assignments as "Answer key (guidance)" next to "Download criteria (PDF)". How learners submit is unchanged (per-criterion answer boxes; no upload template, no references box). Mock: "AC M12 Ways of Working in Adult Care — Knowledge Answer Key" (U302 Module 1), plus U305 and U306 answer keys.',
  'Demo Scenario #20 "Module quizzes".']]);
const _cdLogCh4 = SCREENS['cd-log'];
SCREENS['cd-log'] = p => _cdLogCh4(p).replace('Built: 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 14, 15. Held pending client: 6 (observation fee — P-27), 13 (module quizzes — CH-16, Batch 4).', 'Built: 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15. Held pending client: 6 (observation fee — P-27).')
  .replace('2 held</span>', '1 held</span>').replace('item 13 follows in Batch 4 (CH-16)', 'item 13 is built (CH-16, Batch 4)');

/* ---------- Screen index (with purpose lines) ---------- */
const _idxCh4 = SCREENS.index;
SCREENS.index = p => _idxCh4(p).replace(/(<section class="card idx-sec"><h2>Client decisions \(CH\)<\/h2><ul class="idx-list">)/, `$1${[
  chIdxLi('Short course — modules with their progress and quiz', { act: 'jump', v: 'A', r: 'course.mh26.content' }, 'CH-16 — each module\'s content, progress and quiz.'),
  chIdxLi('Module quiz — attempts exhausted for one module', { act: 'jump', v: 'A', r: 'course.bls.quiz' }, 'CH-16 — request extra attempts for that module\'s quiz.'),
  chIdxLi('Resources — answer key under its module', { act: 'jump', v: 'C', r: 'resources' }, 'CH-18 — download the answer key before you start.'),
  chIdxLi('Assignment — "Answer key (guidance)"', { act: 'jump', v: 'C', r: 'assignment.a3' }, 'CH-18 — next to "Download criteria (PDF)".'),
  chIdxLi('Progress tree — module awarding-body codes', { act: 'jump', v: 'C', r: 'progress' }, 'CH-15 — each module with its code.')].join('')}`);
const _aIdxCh4 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxCh4(p).replace(/(<section class="card idx-sec"><h2>Client decisions \(CH\)<\/h2><ul class="idx-list">)/, `$1${[
  chIdxLi('Short-course editor — Modules tab', { act: 'aJump', t: 'a-courses.SC-01.modules' }, 'CH-16 — add, reorder and retire modules, assign content, set each module quiz.'),
  chIdxLi('Structure builder — module codes and answer keys', { act: 'aJump', t: 'a-programmes.NV-L3.tree' }, 'CH-15, CH-18 — edit a module\'s code; upload its answer key.')].join('')}`);
