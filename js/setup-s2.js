/* ============================================================
   Setup fixes S2 — assignments (S2-01 … S2-08).
   Every assignment has a saved definition (programme, unit/module, title, brief versions, deadline, questions with
   attachments allowed or not, criteria mapping, batches, status). Publishing copies it to the learners with full data
   in its batches (worlds C and D and any newly signed-up learner) — their assignment list, calendar and the
   assessor's marking; other batches show it in the admin and Coordinator views only. Unpublish (no submissions),
   retire (keeps submissions), Edit brief (new version for learners who haven't submitted), and real cohort
   extensions. Seeded from today's assignments, so the existing demo behaves as before. Loads after setup-s1.js.
   ============================================================ */
'use strict';

const S2_LIVE = ['Completed', 'Archived', 'Cancelled'];
function s2Defs() { // the Academic Admin's drafts (seeded with the academic data) join the list whenever they appear
  const L = STORE.s2Defs = STORE.s2Defs || s2Seed();
  ((STORE.aca && STORE.aca.drafts) || []).forEach(d => { if (!L.some(x => x.id === d.id)) L.push(s2FromDraft(d)); });
  return L;
}
const s2Def = id => s2Defs().find(d => d.id === id);
const s2Log = (d, action, before, after, r) => logA('Assignments', d.title, action, before, after, r || '');
const s2Can = () => isSA() || (typeof isSys === 'function' && isSys()) || (typeof isAca === 'function' && isAca());
const s2Html = t => '<p>' + esc(t).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
const s2Text = h => String(h || '').replace(/<\/p>\s*<p>/g, '\n\n').replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

/* ---------- Seed: today's assignments become definitions ---------- */
function s2Seed() {
  const C = STORE.worlds.C, L3 = 'Level 3 Diploma in Adult Care (England)', L2 = 'Level 2 Diploma in Care (England)';
  const fromLive = a => ({ id: a.id, title: a.title, programme: L3, unit: a.unit, due: a.due, status: 'Published', version: a.briefUpdated ? 2 : 1, marker: a.assessor || 'Sarah Okonkwo', brief: a.brief || '', briefV: a.briefV || (a.briefUpdated ? 2 : 1), files: 'PDF, DOCX, JPG, PNG · 10 MB · 5 files', resubMax: a.resubMax || 2, window: 10, qs: a.qs.map(q => ({ id: q.id, text: q.text, crit: q.crit ? [q.crit] : [], attach: true, status: 'Active' })), batches: ['L3AC-JAN26'], copies: [{ v: 'C', id: a.id }], seeded: true });
  const out = C.assignments.map(fromLive);
  out.push({ id: 'a8', title: 'Assignment 8 — Safeguarding legislation', programme: L3, unit: 'U306 · Module 2', due: D(40, '21:59'), status: 'Draft', version: 1, marker: 'Sarah Okonkwo', brief: '<p>Answer each question using examples from your workplace.</p>', briefV: 1, files: 'PDF, DOCX, JPG, PNG · 10 MB · 5 files', resubMax: 2, window: 10, qs: [{ id: 'q1', text: 'Explain the main pieces of safeguarding legislation that apply in England.', crit: [], attach: true, status: 'Active' }], batches: [], copies: [] });
  out.push({ id: 'l2a1', title: 'L2 Assignment 1 — Communication', programme: L2, unit: 'U201 · Module 1', due: D(-120), status: 'Published', version: 1, marker: 'James Pryce', brief: '<p>Answer each question about communication in your workplace.</p>', briefV: 1, files: 'PDF, DOCX, JPG, PNG · 10 MB · 5 files', resubMax: 2, window: 10, qs: ['Why do people communicate?', 'How does communication affect relationships?', 'What barriers to communication have you seen?', 'How do you keep information confidential?'].map((t, i) => ({ id: 'q' + (i + 1), text: t, crit: ['201 1.' + (i + 1)], attach: true, status: 'Active' })), batches: ['L2DC-MAR26'], copies: [], seeded: true });
  return out;
}
function s2FromDraft(d) {
  const L3 = 'Level 3 Diploma in Adult Care (England)', k308 = withW('C', () => allCrit()).filter(c => c.type === 'Knowledge' && c.code.startsWith('308 ')).slice(0, 3);
  return ({ id: d.id, title: d.title, programme: d.programme || L3, unit: d.unit, due: d.due, status: 'Draft', version: d.version || 1, marker: d.marker || 'Sarah Okonkwo', brief: '<p>Answer each question with examples from your workplace.</p>', briefV: 1, files: 'PDF, DOCX, JPG, PNG · 10 MB · 5 files', resubMax: 2, window: 10, qs: ['Describe the safe handling of medicines in your setting.', 'Explain what to do if a medication error happens.', 'Describe how you record medicines given.'].map((t, i) => ({ id: 'q' + (i + 1), text: t, crit: k308[i] ? [k308[i].code] : [['308 1.1', '308 1.2', '308 2.1'][i]], attach: true, status: 'Active' })), batches: [], copies: [] });
}
const _isS2 = initStore; initStore = function () { STORE.s2Defs = null; STORE.s2Ext = {}; return _isS2.apply(this, arguments); };

/* ---------- Criteria and units of the assignment's programme ---------- */
function s2Tree(prog) {
  const pr = (ADMIN.programmes || []).find(p => p.title === prog);
  if (pr && pr.chNew) return ch8Tree(pr.id).map(u => ({ code: u.code, title: u.title, mods: u.mods.map(m => ({ code: m.code, title: m.title, crit: m.los.flatMap(lo => lo.crit.map(c => ({ code: c.code, d: c.d, type: lo.type || 'Knowledge' }))) })) }));
  const v = /Level 2/.test(prog) ? 'D' : 'C', crit = withW(v, () => allCrit());
  return (STORE.worlds[v].tree || []).map(u => ({ code: u.code, title: u.title, mods: u.mods.map(m => ({ code: m.code, title: m.title })), crit: crit.filter(c => c.code.startsWith(u.code.replace(/^U/, '') + ' ')) }));
}
const s2UnitCode = unit => (/^(U\d+)/.exec(unit || '') || [])[1];
function s2Crit(d) {
  const t = s2Tree(d.programme), uc = s2UnitCode(d.unit), u = t.find(x => x.code === uc);
  if (!u) return Array.from(new Set(d.qs.flatMap(q => q.crit))).map(code => ({ code, d: code, type: 'Knowledge' })); // unit not in the tree: the criteria already mapped
  return u.crit || u.mods.flatMap(m => m.crit || []);
}
const s2UnitOpts = (prog, cur) => s2Tree(prog).flatMap(u => u.mods.map((m, k) => `${u.code} · Module ${k + 1}`).map(v => `<option ${v === cur ? 'selected' : ''}>${esc(v)} — ${esc(u.title)}</option>`)).join('');

/* ---------- The admin list reads the definitions ---------- */
adminAssignments = function () {
  return s2Defs().filter(d => d.status !== 'Deleted').map(d => { const copy = d.copies[0] && STORE.worlds[d.copies[0].v] ? STORE.worlds[d.copies[0].v].assignments.find(x => x.id === d.copies[0].id) : null; const act = d.qs.filter(q => q.status === 'Active');
    return { id: d.id, title: d.title, programme: d.programme, unit: d.unit, due: copy && d.seeded ? copy.due : d.due, status: d.status, version: d.version, mapped: d.seeded && copy ? copy.crit.length : new Set(act.flatMap(q => q.crit)).size, marker: d.marker, a: copy || undefined, def: d }; });
};

/* ---------- S2-01 New assignment ---------- */
ACT.newAsg = () => {
  if (!s2Can()) { toast('Assignments are set up by the Academic Admin, System Admin or Super Admin.', 'err'); return; }
  const progs = (ADMIN.programmes || []).filter(p => p.status === 'Active'), p0 = progs[0] ? progs.find(p => p.id === 'NV-L3') || progs[0] : null;
  openModal({ title: 'New assignment', size: 'lg', body: `<div class="form-grid"><div class="field full"><label for="na-p">Programme</label><select class="select" id="na-p" data-onchange="s2NaProg">${progs.map(p => `<option ${p === p0 ? 'selected' : ''}>${esc(p.title)}</option>`).join('')}</select></div><div class="field full"><label for="na-u">Unit / module</label><select class="select" id="na-u">${p0 ? s2UnitOpts(p0.title) : ''}</select></div><div class="field full"><label for="na-t">Title</label><input class="input" id="na-t" placeholder="e.g. Assignment 10 — Record keeping"></div><div class="field"><label for="na-d">Deadline</label><input class="input" type="datetime-local" id="na-d" value="${D(30, '21:59').slice(0, 16)}"></div></div><p class="xs muted">It starts as a Draft. Add questions and map them to criteria, then publish.</p>`,
    actions: [{ label: 'Cancel' }, { label: 'Create draft', cls: 'btn-primary', fn: () => { const t = mval('#na-t'), dd = mval('#na-d'), prog = mval('#na-p'), unit = mval('#na-u').split(' — ')[0]; if (!t) return fieldErr('#na-t', 'Enter a title'), false; if (s2Defs().some(x => x.title.toLowerCase() === t.toLowerCase())) return fieldErr('#na-t', 'An assignment with this title already exists'), false; if (!unit) return fieldErr('#na-u', 'Choose a unit / module'), false; if (!dd) return fieldErr('#na-d', 'Choose a deadline'), false;
      let n = 10, id; while (s2Defs().some(x => x.id === (id = 'a' + n))) n++;
      const d = { id, title: t, programme: prog, unit, due: new Date(dd + ':00Z').toISOString(), status: 'Draft', version: 1, marker: 'Sarah Okonkwo', brief: '<p>Answer each question using examples from your workplace.</p>', briefV: 1, files: 'PDF, DOCX, JPG, PNG · 10 MB · 5 files', resubMax: 2, window: 10, qs: [], batches: [], copies: [] };
      s2Defs().push(d); s2Log(d, 'Assignment created (Draft)', '—', `${prog} · ${unit} · due ${fdt(d.due)}`); closeModal(); go('a-assignments', { id, tab: 'questions' }); toast('Draft created — add the questions next.'); return false; } }] });
};
INP.s2NaProg = el => { $('#na-u').innerHTML = s2UnitOpts(el.value); };

/* ---------- The editor ---------- */
const s2HasSubs = d => d.copies.some(c => { const a = s2Copy(c); return a && a.qs.some(q => q.rounds.length); });
const s2Copy = c => STORE.worlds[c.v] && STORE.worlds[c.v].assignments.find(x => x.id === c.id);
const s2Reach = d => d.copies.filter(s2Copy).length;
function s2Details(d) {
  const pub = d.status === 'Published', staff = ADMIN.staff.filter(s => s.roles.includes('Assessor'));
  return `<form class="card form-grid" onsubmit="return false"><div class="field full"><label for="ae-t">Title</label><input class="input" id="ae-t" value="${esc(d.title)}"></div>
    <div class="field full"><label for="ae-b">Brief</label>${pub ? `<div class="card flat small">${d.brief}</div><span class="hint">Brief version ${d.briefV}. Change it with "Edit brief (new version)".</span>` : `<textarea class="textarea" id="ae-b" rows="5">${esc(s2Text(d.brief))}</textarea>`}</div>
    <div class="field"><label for="ae-u">Target unit / module</label><select class="select" id="ae-u" ${pub ? 'disabled title="Unpublish to change the unit"' : ''}>${s2UnitOpts(d.programme, d.unit)}</select></div><div class="field"><label for="ae-m">Assigned marker</label><select class="select" id="ae-m">${staff.map(s => `<option ${s.name === d.marker ? 'selected' : ''}>${s.name}</option>`).join('')}</select><span class="hint">Marking follows the batch's assignment assessor (CH-17).</span></div>
    <div class="field"><label for="ae-d">Deadline</label><input class="input" type="datetime-local" id="ae-d" value="${d.due.slice(0, 16)}"></div><div class="field"><label for="ae-f">File rules</label><input class="input" id="ae-f" value="${esc(d.files)}"></div><div class="field"><label for="ae-rs">Resubmissions allowed</label><input class="input num" type="number" min="0" id="ae-rs" value="${d.resubMax}"></div><div class="field"><label for="ae-rw">Resubmission window (days)</label><input class="input num" type="number" min="1" id="ae-rw" value="${d.window}"></div>
    ${pub ? `<label class="check full"><input type="checkbox" id="ae-n" checked>Notify learners of a deadline change</label>` : ''}</form>`;
}
function s2Questions(d) {
  const act = d.qs.filter(q => q.status === 'Active'), locked = d.status === 'Published' || d.status === 'Retired', why = 'title="Unpublish to change the questions (only while no one has submitted)"';
  return `<section class="card"><div class="row-b s2-qh"><h2>Questions</h2><button class="btn btn-sm btn-primary" data-act="s2QAdd" data-id="${d.id}" ${locked ? 'disabled ' + why : ''}>${ic('plus', 14)}Add question</button></div><p class="small muted">Written answers, marked against the mapped criteria. Retired questions are kept in the record.</p>
    ${d.qs.length ? `<ol class="list">${d.qs.map(q => { const k = act.indexOf(q); return `<li class="li ${q.status === 'Retired' ? 'ch-retired' : ''}"><span class="q-n">${q.status === 'Active' ? 'Q' + (k + 1) : '—'}</span><div class="li-b"><span>${esc(q.text)}</span><span class="xs muted">${q.attach ? 'Attachments allowed' : 'No attachments'} · ${q.crit.length ? 'Mapped: ' + q.crit.join(', ') : 'Not mapped yet'}${q.status === 'Retired' ? ' · Retired' : ''}</span></div>${q.status === 'Active' ? `<button class="icon-btn" data-act="s2QMove" data-id="${d.id}" data-q="${q.id}" data-d="-1" aria-label="Move up" ${locked ? 'disabled ' + why : k === 0 ? 'disabled title="Already the first question"' : ''}>↑</button><button class="icon-btn" data-act="s2QMove" data-id="${d.id}" data-q="${q.id}" data-d="1" aria-label="Move down" ${locked ? 'disabled ' + why : k === act.length - 1 ? 'disabled title="Already the last question"' : ''}>↓</button><button class="btn btn-sm" data-act="s2QEdit" data-id="${d.id}" data-q="${q.id}" ${locked ? 'disabled ' + why : ''}>Edit</button>` : ''}<button class="btn btn-sm" data-act="s2QRetire" data-id="${d.id}" data-q="${q.id}" ${locked ? 'disabled ' + why : ''}>${q.status === 'Retired' ? 'Restore' : 'Retire'}</button></li>`; }).join('')}</ol>` : '<div class="empty"><p class="small">No questions yet. Add the first question.</p></div>'}</section>`;
}
function s2Mapping(d) {
  const all = s2Crit(d), know = all.filter(c => c.type === 'Knowledge'), obs = all.filter(c => c.type !== 'Knowledge'), act = d.qs.filter(q => q.status === 'Active'), subs = s2HasSubs(d), locked = d.status === 'Retired';
  return `${subs ? `<div class="note b-amber">${ic('alert')}<div class="small"><strong>Submissions already exist.</strong> Changing the mapping is restricted and audited. Existing judgements stay against their original criteria.</div></div>` : ''}
    <section class="card"><p class="small muted">Map every question to at least one knowledge criterion of ${esc(s2UnitCode(d.unit) || 'the unit')}.</p>${act.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Question</th>${know.map(c => `<th class="mono" title="${esc(c.d)}">${c.code}</th>`).join('')}${obs.map(c => `<th class="mono muted" title="Observation criteria are assessed only by observation, never through assignments.">${ic('lock', 12)} ${c.code}</th>`).join('')}</tr></thead><tbody>${act.map((q, k) => `<tr><td class="small">Q${k + 1}. ${esc(q.text.length > 60 ? q.text.slice(0, 60) + '…' : q.text)}</td>${know.map(c => `<td><input type="checkbox" aria-label="Map Q${k + 1} to ${c.code}" ${q.crit.includes(c.code) ? 'checked' : ''} data-onchange="mapChange" data-id="${d.id}" data-q="${q.id}" data-c="${c.code}" data-subs="${subs ? 1 : 0}" ${locked ? 'disabled title="Retired assignment"' : ''}></td>`).join('')}${obs.map(c => `<td><input type="checkbox" disabled title="Observation criteria are assessed only by observation, never through assignments." aria-label="${c.code} is an observation criterion and can't be mapped to Q${k + 1}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="small muted">Add questions first.</p>'}${obs.length ? `<p class="xs muted">${ic('lock', 12)} Observation criteria are assessed only by observation, never through assignments.</p>` : ''}</section>`;
}
function s2Extensions(d) {
  if (d.status !== 'Published') return `<section class="card"><h2>Deadline extensions</h2><p class="small muted">Extensions are available once the assignment is published.</p></section>`;
  const bs = d.batches.map(c => ADMIN.batches.find(b => b.code === c)).filter(Boolean), b0 = bs[0];
  return `<section class="card"><h2>Deadline extensions</h2>${b0 ? `<form class="form-grid" data-submit="asgExtend" data-id="${d.id}"><div class="field"><label for="ex-b">Batch</label><select class="select" id="ex-b" data-onchange="s2ExB">${bs.map(b => `<option value="${b.code}">${esc(b.label)} (${b.code})</option>`).join('')}</select></div><div class="field"><label for="ex-w">Apply to</label><select class="select" id="ex-w">${s2ExOpts(b0)}</select></div><div class="field"><label for="ex-d">New deadline</label><input class="input" type="date" id="ex-d" value="${D(7).slice(0, 10)}"></div><div class="field full"><label for="ex-r">Reason (required)</label><textarea class="textarea" id="ex-r"></textarea></div><div class="full"><button class="btn btn-primary" type="submit">Grant extension</button><span class="xs muted"> Calendars and notifications update automatically.</span></div></form>` : '<p class="small muted">Not published to any batch.</p>'}</section>`;
}
const s2BatchLids = b => (typeof chCohLids === 'function' ? chCohLids(b) : []);
function s2ExOpts(b) { const lids = s2BatchLids(b); return `<option value="cohort">Whole cohort: ${esc(b.label)} (${lids.length} learners)</option>${lids.map(l => `<option value="${l}">Learner: ${esc(chLidName(l))}</option>`).join('')}`; }
INP.s2ExB = el => { const b = ADMIN.batches.find(x => x.code === el.value); $('#ex-w').innerHTML = s2ExOpts(b); };
asgEditor = function (id, t) {
  const d = s2Def(id); if (!d) return notFound();
  const k = ['details', 'questions', 'mapping', 'extensions'].includes(t) ? t : 'details', act = d.qs.filter(q => q.status === 'Active'), unmapped = act.filter(q => !q.crit.length).length;
  const reach = s2Reach(d), bl = d.batches.map(c => (ADMIN.batches.find(b => b.code === c) || { label: c }).label).join(', ');
  const notes = [d.status === 'Published' ? `<div class="note b-blue s2-reach">${ic('info')}<div class="small"><strong>Published to ${esc(bl || '—')}.</strong> It reached ${plural(reach, 'learner')} with full data in this prototype (worlds C and D and newly signed-up learners) and the assessor's marking. Other batches show it in the admin and Coordinator views only — this is a prototype limit, not a fault.</div></div>` : '',
    d.status === 'Retired' ? `<div class="note b-grey">${ic('archive')}<div class="small"><strong>Retired.</strong> No new submissions. Existing submissions are kept.</div></div>` : '',
    d.status === 'Draft' && (!act.length || unmapped) ? `<div class="note b-red">${ic('alert')}<div class="small"><strong>Publishing blocked:</strong> ${!act.length ? 'add at least one question' : `${plural(unmapped, 'question')} not mapped to a criterion yet`}.</div></div>` : ''].join('');
  const body = { details: s2Details(d), questions: s2Questions(d), mapping: s2Mapping(d), extensions: s2Extensions(d) }[k];
  const btns = `<div class="row">${['details'].includes(k) && d.status !== 'Retired' ? `<button class="btn btn-primary" data-act="s2Save" data-id="${d.id}">Save</button>` : ''}${d.status === 'Draft' ? `<button class="btn" data-act="pubAsg" data-id="${d.id}">Publish</button>` : ''}${d.status === 'Published' ? `<button class="btn" data-act="kEditBrief" data-id="${d.id}">${ic('edit', 15)}Edit brief (new version)</button><span class="xs muted">Brief version ${d.briefV}</span><button class="btn" data-act="s2Unpublish" data-id="${d.id}" ${s2HasSubs(d) ? 'disabled title="Learners have submitted — retire it instead"' : ''}>Unpublish</button><button class="btn btn-danger" data-act="s2Retire" data-id="${d.id}">Retire</button>` : ''}</div>`;
  return `${pageA(esc(d.title), `${esc(d.programme)} · ${esc(d.unit)}`, `${chip(d.status, d.status === 'Published' ? 'green' : d.status === 'Draft' ? 'amber' : 'grey')}<span class="typebadge">Version ${d.version}</span>`, [['Assignments & Criteria Mapping', 'a-assignments'], [d.title]])}${notes}
  ${subtabs([['details', 'Details'], ['questions', 'Questions'], ['mapping', 'Criteria mapping'], ['extensions', 'Deadline extensions']], k, 'a-assignments', d.id)}${body}${btns}`;
};

/* ---------- S2-02 Details save (deadline reaches the learner, calendar and assessor) ---------- */
ACT.s2Save = el => {
  const d = s2Def(el.dataset.id); if (!d) return; const pub = d.status === 'Published';
  const v = { title: $('#ae-t').value.trim(), unit: pub ? d.unit : $('#ae-u').value.split(' — ')[0], marker: $('#ae-m').value, due: $('#ae-d').value ? new Date($('#ae-d').value + ':00Z').toISOString() : '', files: $('#ae-f').value.trim(), resubMax: +$('#ae-rs').value, window: +$('#ae-rw').value, brief: pub ? d.brief : s2Html($('#ae-b').value.trim()) };
  if (!v.title) return fieldErr('#ae-t', 'Enter a title'); if (s2Defs().some(x => x !== d && x.title.toLowerCase() === v.title.toLowerCase())) return fieldErr('#ae-t', 'Another assignment has this title'); if (!v.due) return fieldErr('#ae-d', 'Choose a deadline'); if (!(v.resubMax >= 0)) return fieldErr('#ae-rs', '0 or more'); if (!(v.window >= 1)) return fieldErr('#ae-rw', 'At least 1 day');
  const notify = pub && $('#ae-n') && $('#ae-n').checked, before = `${d.title} · due ${fdt(d.due)} · ${d.marker}`;
  reasonDlg({ title: pub ? 'Save as a new version?' : 'Save assignment', ok: 'Save', label: 'Change summary (required)', body: pub ? `<div class="note b-blue">${ic('layers')}<div class="small">Edits after publishing create Version ${d.version + 1}. A new deadline reaches learners, their calendars and the assessor.</div></div>` : '', onOk: r => {
    const dueChanged = v.due !== d.due; Object.assign(d, v); if (pub) d.version++;
    d.copies.forEach(c => { const w = STORE.worlds[c.v], a = s2Copy(c); if (!a) return; a.title = d.title; a.resubMax = d.resubMax; if (dueChanged && a.status !== 'Completed') { if (a.status === 'Resubmission Required') a.resubDue = d.due; else { a.originalDue = a.originalDue || a.due; a.due = d.due; } a.closed = false; const ev = w.events.find(e => e.id === 'ed' + a.id); if (ev) { ev.start = ev.end = d.due; ev.title = d.title.split('—')[0].trim() + ' due'; } if (notify) notifyLearner(c.v, 'Assignments', 'Deadline changed', `${d.title} is now due ${fdt(d.due)}.`, 'assignment.' + a.id); } });
    if (dueChanged && pub) tasNotify('Deadline changed', `${d.title} — due ${fdt(d.due)}`, 't-assign.' + d.id, 'Caseload');
    s2Log(d, pub ? `Saved — version ${d.version}` : 'Saved (Draft)', before, `${d.title} · due ${fdt(d.due)} · ${d.marker}`, r); render(); toast(pub ? `Saved as version ${d.version}.${dueChanged ? ' The new deadline reaches learners, calendars and the assessor.' : ''}` : 'Saved.'); } });
};

/* ---------- S2-03 Questions ---------- */
const s2QLock = d => { if (d.status === 'Published' || d.status === 'Retired') { toast('Unpublish to change the questions (only while no one has submitted).', 'err'); return true; } return false; };
function s2QDlg(d, q) {
  openModal({ title: q ? 'Edit question' : 'Add question', sub: esc(d.title), size: 'lg', body: `<div class="field"><label for="aq-t">Question</label><textarea class="textarea" id="aq-t" rows="4">${esc(q ? q.text : '')}</textarea><span class="hint">A written-answer question. Map it to criteria on the Criteria mapping tab.</span></div><label class="check"><input type="checkbox" id="aq-a" ${!q || q.attach ? 'checked' : ''}>Allow attachments on this question</label>`,
    actions: [{ label: 'Cancel' }, { label: q ? 'Save question' : 'Add question', cls: 'btn-primary', fn: () => { const t = mval('#aq-t'); if (!t) return fieldErr('#aq-t', 'Enter the question'), false; const att = $('#aq-a').checked;
      if (q) { const was = q.text; Object.assign(q, { text: t, attach: att }); s2Log(d, 'Question changed', was, t); } else { let n = d.qs.length + 1; while (d.qs.some(x => x.id === 'q' + n)) n++; d.qs.push({ id: 'q' + n, text: t, crit: [], attach: att, status: 'Active' }); s2Log(d, 'Question added', '—', t); } render(); } }] });
}
ACT.s2QAdd = el => { const d = s2Def(el.dataset.id); if (!s2QLock(d)) s2QDlg(d, null); };
ACT.s2QEdit = el => { const d = s2Def(el.dataset.id); if (!s2QLock(d)) s2QDlg(d, d.qs.find(q => q.id === el.dataset.q)); };
ACT.s2QMove = el => { const d = s2Def(el.dataset.id); if (s2QLock(d)) return; const act = d.qs.filter(q => q.status === 'Active'), q = act.find(x => x.id === el.dataset.q), to = act[act.indexOf(q) + +el.dataset.d]; if (!to) return; const a = d.qs.indexOf(q), b = d.qs.indexOf(to); [d.qs[a], d.qs[b]] = [d.qs[b], d.qs[a]]; s2Log(d, 'Questions reordered', '—', d.qs.filter(x => x.status === 'Active').map(x => x.id).join(', ')); render(); };
ACT.s2QRetire = el => { const d = s2Def(el.dataset.id); if (s2QLock(d)) return; const q = d.qs.find(x => x.id === el.dataset.q), to = q.status === 'Retired' ? 'Active' : 'Retired'; q.status = to; s2Log(d, to === 'Retired' ? 'Question retired' : 'Question restored', q.text, to); render(); };
// The wrong (quiz) dialog is no longer used for assignments
ACT.addQ = el => { toast('Short-course quiz questions are added per module on the course\'s Modules tab.', 'info'); };

/* ---------- S2-04 Criteria mapping (saved) ---------- */
INP.mapChange = el => {
  const d = s2Def(el.dataset.id); if (!d) return; const q = d.qs.find(x => x.id === el.dataset.q), c = el.dataset.c, on = el.checked;
  const apply = r => { q.crit = on ? Array.from(new Set(q.crit.concat(c))) : q.crit.filter(x => x !== c); d.copies.forEach(cp => { const a = s2Copy(cp); if (!a) return; const aq = a.qs.find(x => x.id === q.id); if (aq && !aq.rounds.length) { aq.crit = q.crit[0] || ''; aq.crits = q.crit.slice(); } }); s2Log(d, r ? 'Mapping changed after submissions' : 'Mapping changed', `${q.id}: ${on ? '—' : c}`, `${q.id}: ${on ? c : 'removed'}`, r || ''); render(); };
  if (el.dataset.subs === '1') { el.checked = !on; reasonDlg({ title: 'Change mapping after submissions?', ok: 'Change mapping', danger: true, body: '<p class="small">Restricted and audited. Existing judgements stay against their original criteria.</p>', onOk: r => apply(r) }); return; }
  apply('');
};

/* ---------- S2-05 Publish (its own questions), unpublish, retire ---------- */
const s2BatchCodeOf = w => (w.signup && w.signup.done && w.signup.batch) || ((w.nvq && w.nvq.batch) || '').split(' — ')[1] || '';
function s2Targets(d, codes) { return Object.keys(STORE.worlds || {}).filter(v => { const w = STORE.worlds[v]; return w && w.nvq && w.flags && w.flags.admitted && w.nvq.title === d.programme && codes.includes(s2BatchCodeOf(w)); }); }
function s2CopyTo(v, d) {
  const w = STORE.worlds[v], crit = s2Crit(d), act = d.qs.filter(q => q.status === 'Active'), used = Array.from(new Set(act.flatMap(q => q.crit)));
  if (w.assignments.some(x => x.id === d.id)) return null;
  const a = { id: d.id, title: d.title, unit: d.unit, due: d.due, status: 'Not Started', round: 'Sub 1', resubUsed: 0, resubMax: d.resubMax, brief: d.brief, briefV: d.briefV, resources: [['Assignment template (DOCX)']], timeline: [], crit: used.map(code => { const c = crit.find(x => x.code === code) || { d: code }; return [code, c.d, 'Knowledge']; }), qs: act.map(q => ({ id: q.id, text: q.text, crit: q.crit[0] || '', crits: q.crit.slice(), attach: q.attach, rounds: [], fb: [], state: 'open' })), s2: true };
  w.assignments.push(a); w.events.push({ id: 'ed' + d.id, type: 'deadline', title: d.title.split('—')[0].trim() + ' due', start: d.due, end: d.due, course: w.nvq.title, go: 'assignment.' + d.id });
  notifyLearner(v, 'Assignments', 'New assignment', `${d.title} is open — due ${fdt(d.due)}.`, 'assignment.' + d.id);
  return { v, id: d.id };
}
ACT.pubAsg = el => {
  const d = s2Def(el.dataset.id); if (!d || d.status !== 'Draft') return;
  const act = d.qs.filter(q => q.status === 'Active'), un = act.filter(q => !q.crit.length);
  if (!act.length || un.length) { s2Log(d, 'Blocked: publish', 'Draft', 'Draft', !act.length ? 'No questions' : un.map(q => q.id).join(', ') + ' not mapped'); openModal({ title: 'Can\'t publish yet', body: `<div class="note b-red">${ic('alert')}<div>${!act.length ? 'Add at least one question.' : `Map every question to at least one criterion. Not mapped: ${un.map(q => 'Q' + (act.indexOf(q) + 1)).join(', ')}.`}</div></div>`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); return; }
  const bs = ADMIN.batches.filter(b => b.course === d.programme && !S2_LIVE.includes(b.status));
  reasonDlg({ title: 'Publish assignment — ' + esc(d.title), ok: 'Publish', label: 'Publish note (required)', body: `<fieldset class="stack" style="border:0;padding:0"><legend class="lbl">Batches</legend>${bs.length ? bs.map(b => `<label class="check small"><input type="checkbox" class="s2-pb" value="${b.code}" checked>${esc(b.label)} (${b.code})${s2Targets(d, [b.code]).length ? ` · ${plural(s2Targets(d, [b.code]).length, 'learner')} with full data` : ''}</label>`).join('') : '<p class="small muted">No active batch of this programme.</p>'}</fieldset><div class="note b-blue">${ic('info')}<div class="small">Learners with full data in these batches see it with its deadline on their calendars and are notified; the assessor marks their submissions. Other batches show it in the admin and Coordinator views only (prototype limit).</div></div>`,
    onOk: r => { const codes = $$('.s2-pb:checked').map(x => x.value); if (!codes.length && bs.length) { toast('Choose at least one batch.', 'err'); return false; }
      d.batches = codes; d.copies = d.copies.concat(s2Targets(d, codes).map(v => s2CopyTo(v, d)).filter(Boolean)); d.status = 'Published';
      tasNotify('New assignment published', `${d.title} — due ${fdt(d.due)}`, 't-assign.' + d.id, 'Caseload'); s2Log(d, 'Published', 'Draft', `Published · ${codes.join(', ')} · ${d.copies.length} learner(s)`, r); go('a-assignments', { id: d.id }); toast(`Published. ${plural(d.copies.length, 'learner')} with full data can see it.`); } });
};
const s2Pull = d => { d.copies = d.copies.filter(c => { const w = STORE.worlds[c.v], a = s2Copy(c); if (!a) return false; if (a.qs.some(q => q.rounds.length)) return true; w.assignments = w.assignments.filter(x => x !== a); w.events = w.events.filter(e => e.id !== 'ed' + a.id); notifyLearner(c.v, 'Assignments', 'Assignment withdrawn', `${d.title} has been withdrawn by the Academy.`, 'assignments'); return false; }); };
ACT.s2Unpublish = el => { const d = s2Def(el.dataset.id); if (!d || d.status !== 'Published') return; if (s2HasSubs(d)) { s2Log(d, 'Blocked: unpublish (submissions exist)', 'Published', 'Published', ''); toast('Learners have submitted — retire it instead.', 'err'); return; } reasonDlg({ title: 'Unpublish ' + esc(d.title), ok: 'Unpublish', body: '<p class="small">Learners no longer see it and it goes back to Draft. No one has submitted, so nothing is lost.</p>', onOk: r => { s2Pull(d); d.status = 'Draft'; d.batches = []; s2Log(d, 'Unpublished', 'Published', 'Draft', r); render(); toast('Unpublished — back to Draft.'); } }); };
ACT.s2Retire = el => { const d = s2Def(el.dataset.id); if (!d || d.status !== 'Published') return; reasonDlg({ title: 'Retire ' + esc(d.title), ok: 'Retire', danger: true, body: '<p class="small">No new submissions. Learners who have submitted keep their work, feedback and marking. Learners who haven\'t started no longer see it.</p>', onOk: r => { s2Pull(d); d.status = 'Retired'; s2Log(d, 'Retired', 'Published', 'Retired', r); render(); toast('Retired. Existing submissions are kept.'); } }); };

/* ---------- S2-06 Edit brief (new version for learners who haven't submitted) ---------- */
ACT.kEditBrief = el => {
  const d = s2Def(el.dataset.id); if (!d) return; const v = d.briefV + 1;
  openModal({ title: 'Edit brief — ' + esc(d.title), size: 'lg', body: `<div class="note b-blue">${ic('layers')}<div class="small">Saving creates <strong>brief version ${v}</strong>. Learners who haven't submitted see it; work already submitted stays against the version it was written for.</div></div><div class="field"><label for="eb-t">Brief</label><textarea class="textarea" id="eb-t" rows="6">${esc(s2Text(d.brief))}</textarea></div><label class="tgl"><input type="checkbox" id="eb-n" checked><span>Notify learners of a material change</span></label><div class="field"><label for="eb-r">Reason (required)</label><textarea class="textarea" id="eb-r"></textarea></div>`,
    actions: [{ label: 'Cancel' }, { label: 'Save brief version ' + v, cls: 'btn-primary', fn: () => { const t = mval('#eb-t'), r = mval('#eb-r'), nt = $('#eb-n').checked; if (!t) return fieldErr('#eb-t', 'Enter the brief'), false; if (!r) return fieldErr('#eb-r', 'Enter a reason'), false; if (s2Html(t) === d.brief) return fieldErr('#eb-t', 'The brief hasn\'t changed'), false;
      const was = d.briefV; d.briefs = (d.briefs || [{ v: was, html: d.brief }]).concat([{ v, html: s2Html(t), at: now().toISOString(), by: ADMIN.me.name }]); d.brief = s2Html(t); d.briefV = v; let n = 0;
      d.copies.forEach(c => { const a = s2Copy(c); if (!a) return; if (a.qs.some(q => q.rounds.length)) { a.briefAnswered = a.briefAnswered || a.briefV || was; return; } a.brief = d.brief; a.briefV = v; a.briefUpdated = now().toISOString(); a.briefChanges = [r]; n++; if (nt) notifyLearner(c.v, 'Assignments', 'Brief updated', `${d.title}: the brief has been updated (version ${v}).`, 'assignment.' + a.id); });
      tasNotify('Brief updated', `${d.title} — brief version ${v}`, 't-assign.' + d.id, 'Caseload'); s2Log(d, 'Brief edited (new version)', 'v' + was, 'v' + v, r); render(); toast(`Brief version ${v} saved. ${plural(n, 'learner')} who hadn't submitted now see it.`); } }] });
};

/* ---------- S2-07 Extensions: one learner or the whole cohort (true count); never on drafts ---------- */
SUBMIT.asgExtend = f => {
  const d = s2Def(f.dataset.id); if (!d || d.status !== 'Published') { toast('Extensions are available once the assignment is published.', 'err'); return; }
  const r = $('#ex-r').value.trim(); if (!r) return fieldErr('#ex-r', 'Enter a reason');
  const iso = new Date($('#ex-d').value + 'T20:59:00Z').toISOString(), b = ADMIN.batches.find(x => x.code === $('#ex-b').value), who = $('#ex-w').value;
  const lids = who === 'cohort' ? s2BatchLids(b) : [who], worldOf = lid => Object.keys(STORE.worlds).find(v => STORE.worlds[v].me && STORE.worlds[v].me.id === lid);
  let n = 0; lids.forEach(lid => { const v = worldOf(lid); if (v && STORE.worlds[v].assignments.some(a => a.id === d.id)) { extendAssignment(v, d.id, iso, r); n++; } else { (STORE.s2Ext = STORE.s2Ext || {})[lid + '|' + d.id] = iso; n++; } });
  if (who === 'cohort') logA('Assignments', `${b.label} · ${d.title}`, 'Deadline extension (whole cohort)', fdt(d.due), fdt(iso), `${r} · ${n} learners`);
  render(); toast(who === 'cohort' ? `Extension applied to ${plural(n, 'learner')} in ${b.label}.` : `Extended to ${fdt(iso)} for ${chLidName(who)}.`);
};

/* ---------- Coordinator: the assignments published to the batch ---------- */
const _cBatchS2 = SCREENS['c-batches'];
SCREENS['c-batches'] = p => { const h = _cBatchS2(p), b = p && p.id && ADMIN.batches.find(x => x.code === p.id); if (!b || (p.tab && p.tab !== 'overview')) return h; const ds = s2Defs().filter(d => d.status === 'Published' && d.batches.includes(b.code) && !d.seeded); if (!ds.length) return h; return h + `<section class="card s2-cb"><h2>Assignments published to this batch</h2><ul class="list small">${ds.map(d => `<li class="li"><div class="li-b"><strong>${esc(d.title)}</strong><span class="xs muted">${esc(d.unit)} · due ${fdt(d.due)} · reached ${plural(d.copies.filter(c => s2BatchCodeOf(STORE.worlds[c.v]) === b.code).length, 'learner')} with full data (prototype limit)</span></div></li>`).join('')}</ul></section>`; };

/* ---------- Demo Scenario #27 "Create and publish an assignment" ---------- */
const S2_DEMO = 'a27';
function s2DemoDef() {
  let d = s2Def(S2_DEMO); if (d) return d;
  const k = withW('C', () => allCrit()).filter(c => c.type === 'Knowledge' && c.code.startsWith('304 ')).slice(0, 2);
  d = { id: S2_DEMO, title: 'Assignment 27 — Reflective practice', programme: 'Level 3 Diploma in Adult Care (England)', unit: 'U304 · Module 1', due: D(21, '21:59'), status: 'Draft', version: 1, marker: 'Sarah Okonkwo', brief: '<p>Reflect on a recent shift and answer both questions with examples.</p>', briefV: 1, files: 'PDF, DOCX, JPG, PNG · 10 MB · 5 files', resubMax: 2, window: 10, qs: [{ id: 'q1', text: 'Describe a situation at work you have reflected on.', crit: [], attach: true, status: 'Active' }, { id: 'q2', text: 'Explain what you would do differently and why.', crit: [], attach: false, status: 'Active' }], batches: [], copies: [], demo: k.map(c => c.code) };
  s2Defs().push(d); s2Log(d, 'Assignment created (Draft) — demo', '—', 'Draft'); return d;
}
const s2AsSA = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; };
ACT.s2Sc27Start = () => { s2AsSA(); go('a-assignments'); ACT.newAsg(); };
ACT.s2Sc27Q = () => { s2AsSA(); const d = s2DemoDef(); go('a-assignments', { id: d.id, tab: 'questions' }); };
ACT.s2Sc27Map = () => { s2AsSA(); const d = s2DemoDef(); d.qs.forEach((q, i) => { if (!q.crit.length && d.demo[i]) q.crit = [d.demo[i]]; }); go('a-assignments', { id: d.id, tab: 'mapping' }); toast('Demo: each question mapped to a Unit 304 criterion.', 'info'); };
ACT.s2Sc27Pub = () => { ACT.s2Sc27Map(); const d = s2DemoDef(); go('a-assignments', { id: d.id }); if (d.status === 'Draft') ACT.pubAsg({ dataset: { id: d.id } }); };
ACT.s2Sc27Learner = () => { S.variant = 'C'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; const d = s2DemoDef(); go(STORE.worlds.C.assignments.some(a => a.id === d.id) ? 'assignment' : 'assignments', { id: d.id }); };
ACT.s2Sc27Mark = () => { S.tas.v = 'A'; tasEnter(); S.signedIn = true; go('t-queue'); toast('Viewing as Sarah Okonkwo — Leicester Cohort 7\'s assignment assessor.', 'info'); };
ACT.s2Sc27Release = () => { S.coo.v = 'A'; cooEnter(); S.signedIn = true; go('c-release'); toast('Viewing as Dr Helen Carter — release the marked work.', 'info'); };
const _scListS2 = SC_LIST;
SC_LIST = function () {
  const x = (text, r, t, act) => ({ text, r, t, act });
  return _scListS2().concat([['27', 'Create and publish an assignment', 'Setup S2', [
    x('The Super Admin chooses "New assignment": programme, unit / module, title and deadline.', 'admin', 'a-assignments', 's2Sc27Start'),
    x('Questions: add the questions (written answers; attachments allowed or not).', 'admin', 'a-assignments.a8.questions', 's2Sc27Q'),
    x('Criteria mapping: map every question to a knowledge criterion.', 'admin', 'a-assignments.a8.mapping', 's2Sc27Map'),
    x('Publish to Leicester Cohort 7 — the assignment\'s own questions.', '', '', 's2Sc27Pub'),
    x('Aisha Rahman sees it with its deadline on her calendar and submits it.', '', '', 's2Sc27Learner'),
    x('Her assignment assessor marks it from the Marking Queue.', 'staff', 't-queue', 's2Sc27Mark'),
    x('The Coordinator releases the feedback.', 'coord', 'c-release', 's2Sc27Release')]]]);
};
CDL_SCEN.push(['27', 'Create and publish an assignment', 'Setup fixes (S2)']);
['Twenty-seven'].forEach(w => { if (!CH_NUMW.includes(w)) CH_NUMW.push(w); });

/* ---------- Records ---------- */
UXC.push(['Setup S2', 'Setup fixes — assignments (S2-01 … S2-08)', [
  'S2-01: "New assignment" creates a real Draft (programme, unit / module, title, deadline) — no longer the fixed "Assignment 8".',
  'S2-02: Details save (title, brief, unit, marker, deadline, file rules, resubmissions). After publishing a save is a new version; a new deadline reaches the learner\'s assignment and calendar and the assessor.',
  'S2-03: a proper assignment-question dialog (question text, allow attachments) replaces the quiz dialog. Questions are added, edited, reordered and retired while the assignment is a Draft.',
  'S2-04: the criteria mapping is saved (knowledge criteria of the unit only; observation criteria locked). Publishing is blocked until every question is mapped. After submissions a change needs a reason and is audited.',
  'S2-05: Publish copies the assignment\'s own questions to the learners with full data in the chosen batches (calendar deadline, notification) and the assessor\'s marking; the published page states the prototype limit (other batches: admin and Coordinator views only). Unpublish (no submissions) and Retire (keeps submissions), each with a reason.',
  'S2-06: "Edit brief (new version)" saves the new text; learners who haven\'t submitted see it, submitted work keeps the version it answered.',
  'S2-07: extensions for one learner or the whole cohort change every learner in it and report the true count; not offered for drafts. Demo Scenario #27 "Create and publish an assignment" (S2-08).']]);
const _aIdxS2 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxS2(p).replace(/(<section class="card idx-sec"><h2>Setup fixes<\/h2><ul class="idx-list">)/, `$1${[
  chIdxLi('Assignment → Questions (assignment questions)', { act: 'aJump', t: 'a-assignments.a8.questions' }, 'S2-03 — written-answer questions with attachments allowed or not.'),
  chIdxLi('Assignment → Criteria mapping (saved)', { act: 'aJump', t: 'a-assignments.a8.mapping' }, 'S2-04 — map each question; publishing waits until all are mapped.')].join('')}`);
