/* ============================================================
   Gap fix — create a new NVQ programme (Super Admin, System Admin, Academic Admin).
   "New NVQ programme" opens a setup wizard: Details → Structure (units → modules → Learning Outcomes → criteria,
   optional answer key per module) → Offer letter → Document checklist → Payment plan (Finance / Super Admin edit) →
   Review. The programme starts as Draft (Version 1); Publish (blocked until every Learning Outcome has a type and an
   offer letter is uploaded) makes it available for batches and sign-up. Assignments, resources and batches are then
   added through the existing screens. Every change is audited. Loads after ch-b7c.js.
   ============================================================ */
'use strict';

const CH8_LEVELS = ['Level 2', 'Level 3', 'Level 4', 'Level 5'];
const CH8_DOCS = [['Passport or photo ID', true], ['Right to work', true], ['Proof of address (last 3 months)', true], ['Enhanced DBS certificate (or police clearance)', true], ['Highest qualification certificate', true], ['CV', true], ['Employer reference letter', false]];
const CH8_STEPS = [['details', 'Details'], ['structure', 'Structure'], ['letter', 'Offer letter'], ['docs', 'Document checklist'], ['plan', 'Payment plan'], ['review', 'Review']];
const v8 = sel => (document.querySelector('#modal-root ' + sel) || document.querySelector(sel) || {}).value || ''; // dialog first, then the page
const ch8Can = () => isSA() || (typeof isSys === 'function' && isSys()) || (typeof isAca === 'function' && isAca());
const ch8Pr = id => (ADMIN.programmes || []).find(p => p.id === id);
const ch8Tree = id => ((STORE.chProgTree = STORE.chProgTree || {})[id] = (STORE.chProgTree[id] || []));
const ch8Docs = id => ((STORE.chProgDocs = STORE.chProgDocs || {})[id] = STORE.chProgDocs[id] || CH8_DOCS.filter(d => d[1]).map(d => d[0]));
const ch8Los = id => ch8Tree(id).flatMap(u => u.mods.flatMap(m => m.los.map(lo => ({ u, m, lo }))));
const ch8Log = (pr, action, before, after, r) => logA('NVQ Programmes', `${pr.title} (${pr.id})`, action, before, after, r || '');
// Programmes created here survive admin rebuilds (kept in the store and added back)
// A reset removes them
const _isCh8 = initStore;
initStore = function () { (STORE.chNewProgs || []).forEach(p => { delete NVQ_FEES[p.title]; const k = CATALOGUE.findIndex(c => c.id === 'k-' + p.id); if (k >= 0) CATALOGUE.splice(k, 1); }); STORE.chNewProgs = []; STORE.chProgTree = {}; STORE.chProgDocs = {}; const r = _isCh8.apply(this, arguments); ch8Seed(); return r; };
const _baCh8 = buildAdmin;
buildAdmin = function () { const r = _baCh8.apply(this, arguments); (STORE.chNewProgs || []).forEach(p => { if (!ADMIN.programmes.some(x => x.id === p.id)) ADMIN.programmes.push(p); }); ch8SeedBatch(); return r; };

/* ---------- Review: what's missing ---------- */
function ch8Check(pr) {
  const block = [], warn = [], los = ch8Los(pr.id), crit = los.flatMap(x => x.lo.crit.map(c => ({ ...x, c })));
  if (!ch8Tree(pr.id).length) block.push('Add at least one unit');
  else if (!los.length) block.push('Add at least one Learning Outcome');
  los.filter(x => !x.lo.type).forEach(x => block.push(`Learning Outcome without a type: ${x.u.code} ${x.m.code} ${x.lo.code} — ${x.lo.title}`));
  if (!chLetterCur(pr.id)) block.push('No offer letter uploaded');
  los.filter(x => !x.lo.crit.length).forEach(x => warn.push(`${x.u.code} ${x.m.code} ${x.lo.code} has no criteria yet`));
  const unc = crit.filter(x => critKind(x.lo.type) === 'Knowledge'); if (unc.length) warn.push(`${unc.length} knowledge ${unc.length === 1 ? 'criterion is' : 'criteria are'} not yet covered by assignments (${unc.slice(0, 4).map(x => x.c.code).join(', ')}${unc.length > 4 ? '…' : ''}) — add assignments after publishing`);
  if (!ch8Docs(pr.id).length) warn.push('No required documents chosen');
  return { block, warn };
}

/* ---------- "New NVQ programme" (Details) ---------- */
function ch8DetailsFields(d) {
  const sup = d.support || 'Fully assisted';
  return `<div class="form-grid"><div class="field full"><label for="np-t">Title</label><input class="input" id="np-t" value="${esc(d.title || '')}"></div>
    <div class="field"><label for="np-l">Level</label><select class="select" id="np-l">${CH8_LEVELS.map(l => `<option ${l === (d.level || 'Level 3') ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="field"><label for="np-r">Awarding-body reference</label><input class="input mono" id="np-r" value="${esc(d.ref || '')}" placeholder="QN 603/0000/0"></div>
    <div class="field"><label for="np-d">Duration</label><input class="input" id="np-d" value="${esc(d.dur || '12 months')}"></div>
    <div class="field"><label for="np-p">Price (GBP)</label><input class="input num" type="number" min="1" id="np-p" value="${esc(d.price || '')}"></div>
    <div class="field full"><label for="np-ds">Description</label><textarea class="textarea" id="np-ds">${esc(d.desc || '')}</textarea></div>
    <fieldset class="field full" style="border:0;padding:0"><legend class="lbl">Support type</legend><div class="row">${CH_SUPPORT.map(s => `<label class="check"><input type="radio" name="np-s" value="${s}" ${s === sup ? 'checked' : ''}>${s}</label>`).join('')}</div><span class="small">${CH_P31}</span></fieldset></div>`;
}
function ch8ReadDetails(pr) {
  const d = { title: v8('#np-t').trim(), level: v8('#np-l'), ref: v8('#np-r').trim(), dur: v8('#np-d').trim(), price: +v8('#np-p'), desc: v8('#np-ds').trim(), support: ($('input[name="np-s"]:checked') || {}).value || 'Fully assisted' };
  if (!d.title) return fieldErr('#np-t', 'Enter a title'), null;
  if ((ADMIN.programmes || []).some(p => p.title.toLowerCase() === d.title.toLowerCase() && (!pr || p.id !== pr.id))) return fieldErr('#np-t', 'A programme with this title already exists'), null;
  if (!d.ref) return fieldErr('#np-r', 'Enter the awarding-body reference'), null;
  if (!d.dur) return fieldErr('#np-d', 'Enter the duration'), null;
  if (!(d.price > 0)) return fieldErr('#np-p', 'Enter the price in GBP'), null;
  return d;
}
ACT.chProgNew = () => {
  if (!ch8Can()) { logA('NVQ Programmes', '—', 'Blocked: create programme', '—', '—', ADMIN.me.name); toast('Only the Super Admin, System Admin or Academic Admin can create a programme.', 'err'); return; }
  openModal({ title: 'New NVQ programme', sub: 'Step 1 of 6 — Details', size: 'lg', body: ch8DetailsFields({}) + `<p class="xs muted">The programme starts as a Draft (Version 1). You add the structure, offer letter, documents and payment plan next.</p>`,
    actions: [{ label: 'Cancel' }, { label: 'Create draft', cls: 'btn-primary', fn: () => { const d = ch8ReadDetails(null); if (!d) return false; const pr = ch8Create(d); closeModal(); go('a-programmes', { id: pr.id, tab: 'structure' }); toast('Draft created — Version 1. Add the structure next.'); } }] });
};
function ch8Create(d) {
  STORE.chNewProgs = STORE.chNewProgs || [];
  let n = 1; while (ADMIN.programmes.some(p => p.id === 'NV-N' + n)) n++; const id = 'NV-N' + n; // FX: the first programme of an empty list gets NV-N1 (the id was set inside the callback, which never ran)
  const pr = { id, title: d.title, level: d.level, ref: d.ref, dur: d.dur, desc: d.desc, price: d.price, version: 1, status: 'Draft', batches: 0, learners: 0, chNew: true, plan: { deposit: CH_DEP, inst: CH_INST_N }, created: now().toISOString(), by: ADMIN.me.name };
  ADMIN.programmes.push(pr); STORE.chNewProgs.push(pr); chSupports()[id] = d.support; ch8Docs(id); ch8Tree(id); chLetters(id); STORE.chLetters[id] = STORE.chLetters[id] || [];
  ch8Log(pr, 'Programme created (Draft, Version 1)', '—', `${d.level} · ${d.ref} · ${money(d.price, 'GBP')} · ${d.support}`, d.desc);
  return pr;
}
ACT.ch8SaveDetails = el => { const pr = ch8Pr(el.dataset.id); if (!pr || pr.status !== 'Draft') return; const d = ch8ReadDetails(pr); if (!d) return; const before = `${pr.title} · ${pr.ref} · ${money(pr.price, 'GBP')} · ${chSupportOf(pr.id)}`; Object.assign(pr, { title: d.title, level: d.level, ref: d.ref, dur: d.dur, desc: d.desc, price: d.price }); chSupports()[pr.id] = d.support; ch8Log(pr, 'Details changed', before, `${d.title} · ${d.ref} · ${money(d.price, 'GBP')} · ${d.support}`); render(); toast('Saved and audited.'); };

/* ---------- Structure: units → modules → Learning Outcomes → criteria; answer key per module ---------- */
const ch8Dlg = (title, fields, onSave) => openModal({ title, size: 'lg', body: fields, actions: [{ label: 'Cancel' }, { label: 'Add', cls: 'btn-primary', fn: () => onSave() }] });
const ch8Find = (pr, ui_, mi, li) => { const u = ch8Tree(pr.id)[ui_], m = u && mi != null ? u.mods[mi] : null, lo = m && li != null ? m.los[li] : null; return { u, m, lo }; };
// S3-03: a published programme with a new draft version (pr.nextDraft) is edited like a Draft
const ch8Draft = pr => { if (pr && (pr.status === 'Draft' || pr.nextDraft)) return true; toast('Published programmes change through a new version.', 'err'); return false; };
ACT.ch8AddUnit = el => { const pr = ch8Pr(el.dataset.id); if (!ch8Draft(pr)) return; ch8Dlg('Add unit', `<div class="form-grid"><div class="field"><label for="u-c">Unit code</label><input class="input mono" id="u-c" placeholder="e.g. U401"></div><div class="field full"><label for="u-t">Unit title</label><input class="input" id="u-t"></div></div>`, () => { const c = mval('#u-c').trim().toUpperCase(), t = mval('#u-t').trim(); if (!c) return fieldErr('#u-c', 'Enter a unit code'), false; if (ch8Tree(pr.id).some(u => u.code === c)) return fieldErr('#u-c', 'This code is already used'), false; if (!t) return fieldErr('#u-t', 'Enter a title'), false; ch8Tree(pr.id).push({ code: c, title: t, mods: [] }); ch8Log(pr, 'Unit added', '—', `${c} ${t}`); closeModal(); render(); }); };
ACT.ch8AddMod = el => { const pr = ch8Pr(el.dataset.id); if (!ch8Draft(pr)) return; const { u } = ch8Find(pr, +el.dataset.u); ch8Dlg('Add module — ' + esc(u.code), `<div class="form-grid"><div class="field full"><label for="m-t">Module name</label><input class="input" id="m-t"></div><div class="field"><label for="m-ab">Awarding-body code</label><input class="input mono" id="m-ab" placeholder="e.g. T/650/0001"></div></div>`, () => { const t = mval('#m-t').trim(), ab = mval('#m-ab').trim(); if (!t) return fieldErr('#m-t', 'Enter a module name'), false; if (!ab) return fieldErr('#m-ab', 'Enter the awarding-body code'), false; const code = 'M' + (u.mods.length + 1); u.mods.push({ code, title: t, ab, los: [], key: null }); ch8Log(pr, 'Module added', '—', `${u.code} ${code} ${t} (${ab})`); closeModal(); render(); }); };
const ch8TypeSel = (id, v) => `<select class="select" id="${id}"><option value="" ${!v ? 'selected' : ''}>Choose a type…</option>${critTypeNames(v).map(t => `<option value="${esc(t)}" ${t === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`; // S3 correction B: the governed type list
ACT.ch8AddLo = el => { const pr = ch8Pr(el.dataset.id); if (!ch8Draft(pr)) return; const { u, m } = ch8Find(pr, +el.dataset.u, +el.dataset.m); ch8Dlg('Add Learning Outcome — ' + esc(u.code + ' ' + m.code), `<div class="form-grid"><div class="field full"><label for="lo-t">Learning Outcome</label><input class="input" id="lo-t" placeholder="e.g. Understand person-centred approaches"></div><div class="field"><label for="lo-y">Assessment type (required before publishing)</label>${ch8TypeSel('lo-y', '')}<span class="hint">Knowledge — assessed through assignments. Observation — assessed by an assessor at work.</span></div></div>`, () => { const t = mval('#lo-t').trim(); if (!t) return fieldErr('#lo-t', 'Enter the Learning Outcome'), false; const code = 'LO' + (m.los.length + 1); m.los.push({ code, title: t, type: mval('#lo-y') || null, crit: [] }); ch8Log(pr, 'Learning Outcome added', '—', `${u.code} ${m.code} ${code} ${t} · ${mval('#lo-y') || 'no type yet'}`); closeModal(); render(); }); };
INP.ch8LoType = el => { const pr = ch8Pr(el.dataset.id); if (!ch8Draft(pr)) return; const { u, m, lo } = ch8Find(pr, +el.dataset.u, +el.dataset.m, +el.dataset.l); const was = lo.type; lo.type = el.value || null; ch8Log(pr, 'Learning Outcome type set', was || 'none', lo.type || 'none', `${u.code} ${m.code} ${lo.code}`); render(); };
ACT.ch8AddCrit = el => { const pr = ch8Pr(el.dataset.id); if (!ch8Draft(pr)) return; const { u, m, lo } = ch8Find(pr, +el.dataset.u, +el.dataset.m, +el.dataset.l); ch8Dlg('Add criterion — ' + esc(`${u.code} ${m.code} ${lo.code}`), `<div class="field"><label for="c-d">Descriptor</label><input class="input" id="c-d"></div><div class="field"><label for="c-e">Evidence requirements</label><textarea class="textarea" id="c-e"></textarea></div>`, () => { const d = mval('#c-d').trim(), ev = mval('#c-e').trim(); if (!d) return fieldErr('#c-d', 'Enter the descriptor'), false; if (!ev) return fieldErr('#c-e', 'Enter the evidence requirements'), false; const code = `${lo.code.slice(2)}.${lo.crit.length + 1}`; lo.crit.push({ code: `${u.code.replace(/^U/, '')} ${code}`, d, ev }); ch8Log(pr, 'Criterion added', '—', `${u.code} ${m.code} ${lo.code} ${code} ${d}`); closeModal(); render(); }); };
ACT.ch8Key = el => { const pr = ch8Pr(el.dataset.id); if (!ch8Draft(pr)) return; const { u, m } = ch8Find(pr, +el.dataset.u, +el.dataset.m); setUi('ch8Key', '');
  openModal({ title: 'Answer key (optional) — ' + esc(m.title), body: `<div class="field"><label for="k-f">Answer key (PDF or DOCX)</label><input class="input" type="file" id="k-f" accept=".pdf,.docx" data-onchange="ch8KeyFile"><span class="hint"><span id="k-fn">No file chosen</span> · <button class="linklike" data-act="ch8KeySample">Use a sample file</button></span></div><p class="xs muted">Shown to assessors as guidance for this module's assignments (as for existing modules).</p>`,
    actions: [{ label: 'Cancel' }, { label: 'Attach answer key', cls: 'btn-primary', fn: () => { const f = ui('ch8Key', ''); if (!f) return fieldErr('#k-f', 'Choose a PDF or DOCX file'), false; m.key = { file: f, at: now().toISOString(), by: ADMIN.me.name }; ch8Log(pr, 'Answer key attached', '—', `${u.code} ${m.code} ${f}`); closeModal(); render(); } }] }); };
INP.ch8KeyFile = el => { const f = el.files[0]; setUi('ch8Key', f ? f.name : ''); $('#k-fn').textContent = f ? f.name : 'No file chosen'; };
ACT.ch8KeySample = () => { setUi('ch8Key', 'answer key (sample).pdf'); $('#k-fn').textContent = 'answer key (sample).pdf'; };
function ch8StructureStep(pr) {
  const t = ch8Tree(pr.id), ed = pr.status === 'Draft', d = (k, v) => `data-id="${pr.id}" ${Object.entries(v).map(([a, b]) => `data-${a}="${b}"`).join(' ')}`;
  return `<section class="card"><div class="row-b"><h2>Structure</h2>${ed ? `<button class="btn btn-sm btn-primary" data-act="ch8AddUnit" data-id="${pr.id}">${ic('plus', 14)}Add unit</button>` : ''}</div>
    <p class="small muted">Programme → Unit → Module (awarding-body code) → Learning Outcome (Knowledge or Observation — required before publishing) → Assessment Criterion (descriptor and evidence requirements). An answer key per module is optional.</p>
    ${t.length ? `<div class="tree ch8-tree">${t.map((u, ui_) => `<details class="lvl-1" open><summary><span class="caret">${ic('chev', 16)}</span><span class="tw"><span class="strong"><span class="code">${esc(u.code)}</span> ${esc(u.title)}</span></span>${ed ? `<button class="btn btn-sm" data-act="ch8AddMod" ${d(0, { u: ui_ })}>${ic('plus', 13)}Module</button>` : ''}</summary><div class="kids">${u.mods.map((m, mi) => `<details open><summary><span class="caret">${ic('chev', 16)}</span><span class="tw small strong"><span class="code">${m.code}</span> ${esc(m.title)} <span class="mono xs muted">(${esc(m.ab)})</span></span>${m.key ? chip('Answer key', 'blue') : ''}${ed ? `<button class="btn btn-sm btn-ghost" data-act="ch8Key" ${d(0, { u: ui_, m: mi })}>${m.key ? 'Replace answer key' : 'Answer key (optional)'}</button><button class="btn btn-sm" data-act="ch8AddLo" ${d(0, { u: ui_, m: mi })}>${ic('plus', 13)}Learning Outcome</button>` : ''}</summary><div class="kids">${m.los.map((lo, li) => `<div class="ch8-lo"><div class="row-b"><span class="small"><span class="code">${lo.code}</span> ${esc(lo.title)}</span><span class="row" style="gap:6px">${ed ? `<label class="sr" for="lt-${ui_}-${mi}-${li}">Assessment type for ${lo.code}</label><select class="select" id="lt-${ui_}-${mi}-${li}" data-onchange="ch8LoType" ${d(0, { u: ui_, m: mi, l: li })}><option value="" ${!lo.type ? 'selected' : ''}>No type yet</option>${['Knowledge', 'Observation'].map(x => `<option ${x === lo.type ? 'selected' : ''}>${x}</option>`).join('')}</select>` : chip(lo.type || 'No type', lo.type ? 'blue' : 'red')}${!lo.type ? chip('Type required', 'red') : ''}${ed ? `<button class="btn btn-sm btn-ghost" data-act="ch8AddCrit" ${d(0, { u: ui_, m: mi, l: li })}>${ic('plus', 13)}Criterion</button>` : ''}</span></div>
      ${lo.crit.length ? `<ul class="list small">${lo.crit.map(c => `<li class="li"><span class="code">${esc(c.code)}</span><div class="li-b">${esc(c.d)}<span class="xs muted">Evidence: ${esc(c.ev)}</span></div></li>`).join('')}</ul>` : '<p class="xs muted">No criteria yet.</p>'}</div>`).join('') || '<p class="xs muted">No Learning Outcomes yet.</p>'}</div></details>`).join('') || '<p class="xs muted">No modules yet.</p>'}</div></details>`).join('')}</div>` : '<div class="empty"><p class="small">No units yet. Add the first unit.</p></div>'}</section>`;
}

/* ---------- Document checklist and payment plan ---------- */
function ch8DocsStep(pr) {
  const cur = ch8Docs(pr.id), ed = pr.status === 'Draft' || isSA();
  return `<section class="card"><h2>Document checklist</h2><p class="small muted">The documents applicants upload in step 2 of their sign-up.</p><fieldset class="stack" style="border:0;padding:0"><legend class="lbl">Required documents</legend>${CH8_DOCS.map(([n]) => `<label class="check"><input type="checkbox" class="ch8-doc" value="${esc(n)}" ${cur.includes(n) ? 'checked' : ''} ${ed ? '' : 'disabled'}>${esc(n)}</label>`).join('')}</fieldset>${ed ? `<button class="btn btn-sm btn-primary" data-act="ch8SaveDocs" data-id="${pr.id}">Save checklist</button>` : ''}</section>`;
}
ACT.ch8SaveDocs = el => { const pr = ch8Pr(el.dataset.id), sel = $$('.ch8-doc:checked').map(x => x.value); if (!sel.length) { toast('Choose at least one required document.', 'err'); return; } const was = ch8Docs(pr.id).join(', '); STORE.chProgDocs[pr.id] = sel; ch8Log(pr, 'Document checklist saved', was, sel.join(', ')); render(); toast('Saved and audited.'); };
function ch8PlanStep(pr) {
  const p = pr.plan, ed = finOwner();
  return `<section class="card"><h2>Payment plan</h2><p class="small muted">All amounts in GBP. The deposit is offered only when the learner's batch starts in ${CH_HOLD_DAYS} days or more; otherwise the learner pays the first instalment.</p>
    ${ed ? `<div class="form-grid"><div class="field"><label for="pp-d">Deposit (GBP)</label><input class="input num" type="number" min="0" id="pp-d" value="${p.deposit}"></div><div class="field"><label for="pp-n">Monthly instalments</label><input class="input num" type="number" min="1" max="24" id="pp-n" value="${p.inst}"></div></div><button class="btn btn-sm btn-primary" data-act="ch8SavePlan" data-id="${pr.id}">Save payment plan</button>`
      : `<dl class="kv"><dt>Deposit</dt><dd>${money(p.deposit, 'GBP')}</dd><dt>Instalments</dt><dd>${p.inst} monthly</dd></dl><p class="xs muted">${ic('lock', 12)} Set by Finance or the Super Admin.</p>`}
    <p class="small">Price ${money(pr.price, 'GBP')} · ${p.inst} instalments${e1InstTxt(pr.price, p.inst)} · deposit ${money(p.deposit, 'GBP')} then the balance of ${money(pr.price - p.deposit, 'GBP')}.</p></section>`;
}
ACT.ch8SavePlan = el => { const pr = ch8Pr(el.dataset.id); if (!finOwner()) { logA('NVQ Programmes', pr.title, 'Blocked: payment plan', '—', '—', ADMIN.me.name); toast('The payment plan is set by Finance or the Super Admin.', 'err'); return; } const dep = +v8('#pp-d'), n = +v8('#pp-n'); if (!(dep >= 0) || dep >= pr.price) return fieldErr('#pp-d', 'Enter a deposit below the price'); if (!(n >= 1 && n <= 24)) return fieldErr('#pp-n', 'Enter 1 to 24 instalments'); const was = `${money(pr.plan.deposit, 'GBP')} · ${pr.plan.inst}`; pr.plan = { deposit: dep, inst: n }; ch8Log(pr, 'Payment plan saved', was, `${money(dep, 'GBP')} · ${n}`); render(); toast('Saved and audited.'); };
// Finance edits the plan from Finance → Payment Plans
const _fPlansCh8 = SCREENS['f-plans'];
SCREENS['f-plans'] = p => { const h = _fPlansCh8(p), ps = (STORE.chNewProgs || []); if (!ps.length) return h; return h + `<section class="card ch8-plans"><h2>New NVQ programmes — payment plans</h2><ul class="list">${ps.map(pr => `<li class="li"><div class="li-b"><strong>${esc(pr.title)}</strong><span class="small muted">${chip(pr.status)} · ${money(pr.price, 'GBP')} · deposit ${money(pr.plan.deposit, 'GBP')} · ${pr.plan.inst} instalments</span></div><button class="btn btn-sm" data-go="a-programmes" data-id="${pr.id}" data-tab="plan">Edit plan</button></li>`).join('')}</ul></section>`; };

/* ---------- Review and publish ---------- */
function ch8ReviewStep(pr) {
  const { block, warn } = ch8Check(pr), los = ch8Los(pr.id);
  return `<section class="card"><h2>Review</h2><dl class="kv"><dt>Programme</dt><dd>${esc(pr.title)} · ${esc(pr.level)} · <span class="mono">${esc(pr.ref)}</span></dd><dt>Duration · price</dt><dd>${esc(pr.dur)} · ${money(pr.price, 'GBP')}</dd><dt>Support type</dt><dd>${esc(chSupportOf(pr.id))} ${CH_P31}</dd><dt>Structure</dt><dd>${ch8Tree(pr.id).length} units · ${ch8Tree(pr.id).reduce((s, u) => s + u.mods.length, 0)} modules · ${los.length} Learning Outcomes · ${los.reduce((s, x) => s + x.lo.crit.length, 0)} criteria</dd><dt>Offer letter</dt><dd>${chLetterCur(pr.id) ? `Version ${chLetterCur(pr.id).v} · ${esc(chLetterCur(pr.id).file)}` : '—'}</dd><dt>Documents</dt><dd class="small">${ch8Docs(pr.id).map(esc).join('; ')}</dd><dt>Payment plan</dt><dd>deposit ${money(pr.plan.deposit, 'GBP')} · ${pr.plan.inst} instalments</dd></dl>
    <h3>Before publishing</h3><ul class="list small ch8-review">${block.map(b => `<li class="li">${chip('Blocking', 'red')} ${esc(b)}</li>`).join('')}${warn.map(w => `<li class="li">${chip('Warning', 'amber')} ${esc(w)}</li>`).join('')}${!block.length && !warn.length ? `<li class="li">${chip('OK', 'green')} Nothing missing</li>` : ''}</ul>
    ${pr.status === 'Draft' ? `<div class="row"><button class="btn btn-primary" data-act="ch8Publish" data-id="${pr.id}" ${block.length ? `disabled title="${esc(block.length + ' blocking item' + (block.length === 1 ? '' : 's') + ' to fix first')}"` : ''}>Publish programme</button>${block.length ? `<span class="small" style="color:var(--red)">Fix the blocking items to publish.</span>` : ''}</div>` : ''}</section>`;
}
ACT.ch8Publish = el => {
  const pr = ch8Pr(el.dataset.id); if (!pr || pr.status !== 'Draft') return;
  if (!ch8Can()) { ch8Log(pr, 'Blocked: publish', '—', '—', ADMIN.me.name); toast('You can\'t publish programmes.', 'err'); return; }
  const { block, warn } = ch8Check(pr);
  if (block.length) { ch8Log(pr, 'Blocked: publish (items missing)', 'Draft', 'Draft', block.join('; ')); openModal({ title: 'Can\'t publish this programme', body: `<div class="note b-red">${ic('alert')}<div class="small"><strong>Fix these first:</strong><ul>${block.map(b => `<li>${esc(b)}</li>`).join('')}</ul></div></div>`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); return; }
  reasonDlg({ title: 'Publish ' + esc(pr.title), ok: 'Publish Version 1', body: `<div class="note b-blue">${ic('info')}<div class="small">Version 1 becomes available for batches and sign-up. Assignments, resources and batches are then added through the existing screens.</div></div>${warn.length ? `<div class="note b-amber">${ic('alert')}<div class="small">${warn.map(esc).join('<br>')}</div></div>` : ''}`,
    onOk: r => { pr.status = 'Active'; pr.published = now().toISOString(); NVQ_FEES[pr.title] = pr.price; if (!CATALOGUE.some(c => c.title === pr.title)) CATALOGUE.push({ id: 'k-' + pr.id, kind: 'nvq', title: pr.title, dur: pr.dur, price: pr.price, desc: pr.desc || pr.level + ' NVQ programme.' }); ch8Log(pr, 'Programme published (Version 1)', 'Draft', 'Active', r); render(); toast('Published — available for batches and sign-up.'); } });
};

/* ---------- The setup page (the wizard, one step per tab) ---------- */
function ch8Setup(pr, t) {
  const k = CH8_STEPS.some(s => s[0] === t) ? t : 'details', i = CH8_STEPS.findIndex(s => s[0] === k), { block } = ch8Check(pr);
  const done = { details: true, structure: ch8Los(pr.id).length > 0 && ch8Los(pr.id).every(x => x.lo.type), letter: !!chLetterCur(pr.id), docs: ch8Docs(pr.id).length > 0, plan: true, review: pr.status !== 'Draft' };
  const stepper = `<ol class="stepper ch8-steps">${CH8_STEPS.map(([s, l], n) => `<li class="step ${s === k ? 'cur' : done[s] ? 'done' : ''}"><button class="linklike" data-go="a-programmes" data-id="${pr.id}" data-tab="${s}"><span class="dot">${n + 1}</span><span class="s-l">${l}</span></button></li>`).join('')}</ol>`;
  const body = { details: pr.status === 'Draft' ? `<section class="card"><h2>Details</h2>${ch8DetailsFields({ ...pr, support: chSupportOf(pr.id) })}<button class="btn btn-sm btn-primary" data-act="ch8SaveDetails" data-id="${pr.id}">Save details</button></section>` : `<section class="card"><h2>Details</h2><dl class="kv"><dt>Title</dt><dd>${esc(pr.title)}</dd><dt>Level</dt><dd>${esc(pr.level)}</dd><dt>Reference</dt><dd class="mono">${esc(pr.ref)}</dd><dt>Duration</dt><dd>${esc(pr.dur)}</dd><dt>Price</dt><dd>${money(pr.price, 'GBP')}</dd><dt>Support type</dt><dd>${esc(chSupportOf(pr.id))} ${CH_P31}</dd></dl></section>`,
    structure: ch8StructureStep(pr), letter: chLetterTab(pr), docs: ch8DocsStep(pr), plan: ch8PlanStep(pr), review: ch8ReviewStep(pr) }[k];
  const nav = i < CH8_STEPS.length - 1 ? `<div class="row ch-nav"><button class="btn btn-primary" data-go="a-programmes" data-id="${pr.id}" data-tab="${CH8_STEPS[i + 1][0]}">Next: ${CH8_STEPS[i + 1][1]}</button></div>` : '';
  const after = pr.status === 'Active' ? `<div class="note b-green" role="status">${ic('check')}<div class="small"><strong>Published (Version 1).</strong> Add assignments, resources and batches through the existing screens. <div class="row" style="margin-top:6px"><button class="btn btn-sm" data-go="a-assignments">Assignments</button><button class="btn btn-sm" data-go="a-batches">Batches</button><button class="btn btn-sm btn-primary" data-act="newBatch">Create batch</button></div></div></div>` : `<div class="note b-amber">${ic('info')}<div class="small"><strong>Draft — Version 1.</strong> ${block.length ? `${block.length} blocking item${block.length === 1 ? '' : 's'} before it can be published (see Review).` : 'Ready to publish (see Review).'}</div></div>`;
  return `${pageA(esc(pr.title), `${esc(pr.level)} · ${esc(pr.ref)}`, `${chip(pr.status, pr.status === 'Active' ? 'green' : 'amber')}<span class="typebadge">Version ${pr.version}</span>`, [['NVQ Programmes', 'a-programmes'], [pr.title]])}${after}${stepper}${body}${nav}${auditPanel(a => a.module === 'NVQ Programmes' && a.entity.includes(pr.id))}`;
}
const _pbCh8 = progBuilder;
progBuilder = function (id, t) { const pr = ch8Pr(id); return pr && pr.chNew ? ch8Setup(pr, t) : _pbCh8.apply(this, arguments); };
// The list: "New NVQ programme"
const _progsCh8 = SCREENS['a-programmes'];
SCREENS['a-programmes'] = p => { const h = _progsCh8(p); if (p && p.id) return h; const b = ch8Can() ? `<div class="row"><button class="btn btn-primary" data-act="chProgNew">${ic('plus', 15)}New NVQ programme</button></div>` : ''; const k = h.indexOf('<section class="dt">'); return k < 0 ? h + b : h.slice(0, k) + b + h.slice(k); };

/* ---------- Demo Scenario #25 ---------- */
const CH8_SAMPLE = { title: 'Level 4 Diploma in Adult Care (England) — 2027', level: 'Level 4', ref: 'QN 610/5120/8', dur: '15 months', price: 2900, desc: 'For senior care workers moving into lead practitioner roles.', support: 'Fully assisted' };
const ch8Sample = () => (STORE.chNewProgs || []).find(p => p.title === CH8_SAMPLE.title);
ACT.chSc25Start = () => { acaEnter('KA'); S.signedIn = true; go('a-programmes'); ACT.chProgNew(); toast('Viewing as the Academic Admin. Fill in the details, or use the next step to add the sample.', 'info'); };
ACT.chSc25Structure = () => { acaEnter('KA'); S.signedIn = true; const pr = ch8Sample() || ch8Create(CH8_SAMPLE); if (!ch8Tree(pr.id).length) { ch8Tree(pr.id).push({ code: 'U401', title: 'Lead person-centred practice', mods: [{ code: 'M1', title: 'Promote person-centred care', ab: 'K/651/2201', key: null, los: [{ code: 'LO1', title: 'Understand person-centred approaches', type: 'Knowledge', crit: [{ code: '401 1.1', d: 'Explain the principles of person-centred practice', ev: 'Written account (assignment)' }] }, { code: 'LO2', title: 'Lead person-centred practice', type: null, crit: [{ code: '401 2.1', d: 'Support others to work in a person-centred way', ev: 'Observation in the workplace' }] }] }] }); ch8Log(pr, 'Structure added (demo sample)', '—', 'U401 · M1 · LO1, LO2'); } go('a-programmes', { id: pr.id, tab: 'structure' }); toast('One Learning Outcome has no type yet — set it to Observation.', 'info'); };
const ch8Go = (tab, sa) => { const pr = ch8Sample(); if (!pr) { ACT.chSc25Structure(); return; } if (sa) { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; } else { acaEnter('KA'); S.signedIn = true; } go('a-programmes', { id: pr.id, tab }); };
ACT.chSc25Letter = () => ch8Go('letter'); ACT.chSc25Docs = () => ch8Go('docs'); ACT.chSc25Plan = () => ch8Go('plan', true); ACT.chSc25Review = () => ch8Go('review');
ACT.chSc25Batch = () => { acaEnter('KA'); S.signedIn = true; go('a-batches'); ACT.newBatch(); toast('Choose the new programme, a Coordinator and the assessors.', 'info'); };
const _scListCh8 = SC_LIST;
SC_LIST = function () {
  const x = (text, r, t, act) => ({ text, r, t, act });
  return _scListCh8().concat([['25', 'Create a new NVQ programme', 'Gap fix', [
    x('The Academic Admin chooses "New NVQ programme" and enters the details: title, level, awarding-body reference, duration, description, price (GBP) and Support type.', 'acaA', 'a-programmes.NV-N1.details', 'chSc25Start'),
    x('Structure: a unit, a module with its awarding-body code, Learning Outcomes and criteria (descriptor and evidence requirements); an answer key is optional. One Learning Outcome has no type yet — Review blocks publishing until it\'s set.', 'acaA', 'a-programmes.NV-N1.structure', 'chSc25Structure'),
    x('Offer letter: upload the letter, check the merge fields and preview it.', 'acaA', 'a-programmes.NV-N1.letter', 'chSc25Letter'),
    x('Document checklist: choose the documents applicants upload.', 'acaA', 'a-programmes.NV-N1.docs', 'chSc25Docs'),
    x('Payment plan: the Super Admin (or Finance) sets the deposit and instalments in GBP.', 'admin', 'a-programmes.NV-N1.plan', 'chSc25Plan'),
    x('Review and publish: blocking items and warnings (criteria not yet covered by assignments); publish Version 1.', 'acaA', 'a-programmes.NV-N1.review', 'chSc25Review'),
    x('Create a batch of the new programme with a Coordinator and assessors (existing Create batch wizard).', 'acaA', 'a-programmes.NV-N2', 'chSc25Batch'),
    x('A learner (Daniel Okafor, UK) signs up from Browse Courses: the nearest batch of the new programme is assigned, and its document checklist, offer letter and payment plan are used.', 'learner:A', 'browse', 'chSc25SignUp')]]]);
};
CDL_SCEN.push(['25', 'Create a new NVQ programme', 'Gap fix (new NVQ programme)']);
['Twenty-five'].forEach(w => { if (!CH_NUMW.includes(w)) CH_NUMW.push(w); });

/* ---------- Records ---------- */
UXC.push(['Gap fix', 'New NVQ programme (setup wizard)', [
  'NVQ Programmes → "New NVQ programme" (Super Admin, System Admin, Academic Admin) creates a Draft (Version 1) and opens a six-step setup: Details (title, level, awarding-body reference, duration, description, price in GBP, Support type — Pending client P-31), Structure (units → modules with awarding-body codes → Learning Outcomes, Knowledge or Observation → criteria with descriptor and evidence requirements; optional answer key per module), Offer letter (upload, merge fields, preview — the existing offer-letter tab), Document checklist, Payment plan (deposit and instalments in GBP; editable by Finance or the Super Admin, also from Finance → Payment Plans) and Review.',
  'Review lists blocking items (no units or Learning Outcomes, a Learning Outcome without a type, no offer letter) and warnings (criteria not yet covered by assignments, Learning Outcomes without criteria). Publish is blocked until the blocking items are fixed; publishing makes Version 1 available for batches (Create batch) and sign-up (Browse Courses). Assignments, resources and batches are then added through the existing screens. Every step is audited (NVQ Programmes).',
  'Sign-up to a programme made with the wizard uses its own document checklist, offer letter and payment plan (deposit and instalments); its batches take part in the nearest-batch rule. The existing demo programmes are unchanged. Mock: "Level 4 Diploma in Adult Care (England) — 2027" (NV-N1, Draft, one Learning Outcome without a type) and "Level 2 Certificate in Preparing to Work in Adult Social Care (England)" (NV-N2, published; £900, deposit £150 or 3 instalments; batch Online Cohort 1 (Preparing to Work)).',
  'Demo Scenario #25 "Create a new NVQ programme" — ends with a learner signing up to the new programme.']]);
const _aIdxCh8 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxCh8(p).replace(/(<section class="card idx-sec"><h2>Client decisions \(CH\)<\/h2><ul class="idx-list">)/, `$1${[
  chIdxLi('NVQ Programmes — New NVQ programme (setup wizard)', { act: 'aJump', t: 'a-programmes' }, 'Gap fix — create a Draft programme: details, structure, offer letter, documents, plan, review.'),
  chIdxLi('New programme — sample draft (Structure)', { act: 'chSc25Structure' }, 'Gap fix — a sample draft with a Learning Outcome that still needs a type.')].join('')}`);

/* ---------- Mock: two programmes made with the wizard — NV-N1 Draft (the Scenario #25 sample), NV-N2 published with a batch ---------- */
const CH8_PUB = { id: 'NV-N2', title: 'Level 2 Certificate in Preparing to Work in Adult Social Care (England)', level: 'Level 2', ref: 'QN 603/7024/4', dur: '6 months', price: 900, desc: 'For people starting their first job in adult social care.', plan: { deposit: 150, inst: 3 } };
function ch8SeedBatch() {
  if (!ADMIN || !ADMIN.batches || !(STORE.chNewProgs || []).some(p => p.id === 'NV-N2') || ADMIN.batches.some(b => b.code === 'L2PW-DEC26-ONL')) return;
  ADMIN.batches.push({ code: 'L2PW-DEC26-ONL', label: 'Online Cohort 1 (Preparing to Work)', course: CH8_PUB.title, start: D(40), end: D(220), cap: 20, enrolled: 2, mode: 'Online', coord: 'Laura Kemp', teachers: ['Marcus Bell'], assessors: ['Sarah Okonkwo'], status: 'Open', wait: 0, roster: [], coh: [] });
}
function ch8Seed() {
  if (!ADMIN || !ADMIN.programmes || (STORE.chNewProgs || []).length) return;
  STORE.chNewProgs = [];
  const mk = (d, extra) => { const pr = { id: d.id, title: d.title, level: d.level, ref: d.ref, dur: d.dur, desc: d.desc, price: d.price, version: 1, status: 'Draft', batches: 0, learners: 0, chNew: true, seed: true, plan: d.plan || { deposit: CH_DEP, inst: CH_INST_N }, created: D(-12, '10:00'), by: 'Rachel Hughes', ...extra }; ADMIN.programmes.push(pr); STORE.chNewProgs.push(pr); chSupports()[pr.id] = 'Fully assisted'; STORE.chLetters = STORE.chLetters || {}; STORE.chLetters[pr.id] = STORE.chLetters[pr.id] || []; return pr; };
  mk({ id: 'NV-N1', ...CH8_SAMPLE });
  ch8Tree('NV-N1').push({ code: 'U401', title: 'Lead person-centred practice', mods: [{ code: 'M1', title: 'Promote person-centred care', ab: 'K/651/2201', key: null, los: [{ code: 'LO1', title: 'Understand person-centred approaches', type: 'Knowledge', crit: [{ code: '401 1.1', d: 'Explain the principles of person-centred practice', ev: 'Written account (assignment)' }] }, { code: 'LO2', title: 'Lead person-centred practice', type: null, crit: [{ code: '401 2.1', d: 'Support others to work in a person-centred way', ev: 'Observation in the workplace' }] }] }] });
  const p2 = mk(CH8_PUB, { status: 'Active', published: D(-5, '15:00'), batches: 1 });
  ch8Tree('NV-N2').push({ code: 'U201', title: 'Starting work in care', mods: [{ code: 'M1', title: 'Your role in adult social care', ab: 'J/650/3011', key: { file: 'U201 M1 answer key.pdf', at: D(-6), by: 'Rachel Hughes' }, los: [{ code: 'LO1', title: 'Understand your role', type: 'Knowledge', crit: [{ code: '201 1.1', d: 'Describe the main duties of a care worker', ev: 'Written account (assignment)' }] }, { code: 'LO2', title: 'Work safely', type: 'Observation', crit: [{ code: '201 2.1', d: 'Follow the employer\'s safe working practices', ev: 'Observation in the workplace' }] }] }] });
  STORE.chProgDocs['NV-N2'] = ['Passport or photo ID', 'Right to work', 'Proof of address (last 3 months)', 'CV'];
  STORE.chLetters['NV-N2'] = [{ v: 1, file: 'NV-N2 offer letter v1.docx', at: D(-6, '11:00'), by: 'Rachel Hughes', note: 'First version', programme: p2.title, text: CH_LETTER_TEXT.slice() }];
  NVQ_FEES[p2.title] = p2.price; if (!CATALOGUE.some(c => c.id === 'k-NV-N2')) CATALOGUE.push({ id: 'k-NV-N2', kind: 'nvq', title: p2.title, dur: p2.dur, price: p2.price, desc: p2.desc });
  ch8SeedBatch();
}
if (typeof ADMIN !== 'undefined' && ADMIN && STORE.worlds) ch8Seed();

/* ---------- Sign-up to a programme made with the wizard: its checklist, offer letter and payment plan ---------- */
const ch8ProgOfW = w => { const pr = w && w.nvq && w.signup && w.signup.prog ? ch8Pr(w.signup.prog) : null; return pr && typeof s4ProgView === 'function' ? s4ProgView(w, pr) : pr; }; // S4-06: plan pinned at sign-up start
const CH8_GUIDE = { 'Passport or photo ID': 'The photo page, all four corners visible.', 'Right to work': 'Your share code letter or visa.', 'Proof of address (last 3 months)': 'Utility bill, council tax or bank statement dated within the last 3 months.', 'Enhanced DBS certificate (or police clearance)': 'All pages, issued within the last 12 months.', 'Highest qualification certificate': 'For example GCSE English or a Level 2 certificate.', CV: 'Include any care experience.', 'Employer reference letter': 'From your current or most recent employer.' };
function ch8StartSignup(w, pr) {
  const keepW = W, keepV = S.variant, t = makeWorld('B'), at = now().toISOString(), cur = chLetterCur(pr.id); W = keepW; S.variant = keepV; // makeWorld switches the current learner
  ['tree', 'assignments', 'pd', 'plan', 'workplace', 'iaCriteria'].forEach(k => { if (!w[k]) w[k] = t[k]; });
  w.observations = w.observations || [];
  w.flags.nvq = true; w.flags.admitted = false;
  w.nvq = { ...t.nvq, title: pr.title, level: pr.level, ab: 'Awarding body ref. ' + pr.ref, batch: '', batchStart: null, batchEnd: null, start: null, end: null, status: 'Payment Pending', version: 'Version 1', desc: pr.desc || t.nvq.desc, people: [], sponsor: null };
  w.signup = { step: 1, done: false, batch: null, letterV: cur ? cur.v : 1, prog: pr.id };
  w.admission = { status: 'Sign-up in progress', reviewer: t.admission.reviewer, history: [['Sign-up started', at]], deposit: { min: pr.plan.deposit, paid: false, paidAt: null, holdUntil: null, balance: pr.price - pr.plan.deposit }, batch: '', batchStart: null };
  w.docs = ch8Docs(pr.id).map((n, i) => ({ id: 'n' + (i + 1), name: n, mand: true, status: 'Pending', formats: 'PDF, JPG or PNG', max: '5 MB', guide: CH8_GUIDE[n] || '', versions: [] }));
  logA('Admissions', `${chFullName(w)} (${w.me.id})`, 'Sign-up started', '—', pr.title, 'Programme created with the wizard');
}
const _applyNvqCh8 = ACT.applyNvq;
ACT.applyNvq = el => {
  const c = CATALOGUE.find(x => x.id === el.dataset.id), pr = c && (STORE.chNewProgs || []).find(p => 'k-' + p.id === c.id);
  if (!pr) return _applyNvqCh8(el);
  if (W.admission || W.nvq) { toast('You already have an NVQ sign-up or programme. Continue it from Admission & Documents.', 'info'); go('admission'); return; }
  confirmDlg({ title: 'Sign up for ' + esc(pr.title) + '?', ok: 'Start sign-up', body: `<p>Signing up takes five steps: your details (we assign your batch), your documents, your offer letter, your payment, then you start.</p><p class="small muted">Price ${money(pr.price, 'GBP')} — ${e2DepOr(s4TermsOf(pr.id))}${pr.plan.inst} monthly instalments.</p>`, onOk: () => { ch8StartSignup(W, pr); go('admission'); toast('Sign-up started.'); } });
};
// Payment step and completion use the programme's deposit and instalments
const ch8PayAmount = (pr, opt) => opt === 'deposit' ? pr.plan.deposit : e1First(pr.price, pr.plan.inst);
const _stepPayCh8 = chStepPay;
chStepPay = function (w) {
  const pr = ch8ProgOfW(w), base = _stepPayCh8.apply(this, arguments); if (!pr) return base;
  if (/no other batch has a place/.test(base)) return base;
  const s = w.signup, b = chBatch(s.batch), fee = pr.price, depOk = chDepositOk(b) && !s.noDeposit, inst = e1First(fee, pr.plan.inst);
  let opt = ui('suOpt', depOk ? 'deposit' : 'instalment'); if (opt === 'deposit' && !depOk) opt = 'instalment';
  const method = ui('suMethod', 'card'), amount = ch8PayAmount(pr, opt), ref = chRefOf(w, opt);
  return `<section class="card"><h2>4. Payment</h2>${s.moved ? `<div class="note b-blue" role="status">${ic('info')}<div class="small"><strong>Your batch has changed.</strong> ${esc(s.moved.from)} filled before you paid, so you've been assigned <strong>${esc(s.moved.to)}</strong>.</div></div>` : ''}<dl class="kv"><dt>Batch</dt><dd>${esc(chBatchLbl(b))} · starts ${fd(b.start)} (in ${daysTo(b.start)} days)</dd><dt>Programme fee</dt><dd class="num">${money(fee, 'GBP')}</dd></dl>
    <fieldset class="stack"><legend class="lbl">How do you want to pay?</legend>
    ${depOk ? `<label class="check"><input type="radio" name="su-opt" value="deposit" ${opt === 'deposit' ? 'checked' : ''} data-onchange="suOpt"><span><strong>Deposit (holds your seat) — ${money(pr.plan.deposit, 'GBP')} now</strong><br><span class="small muted">Then pay the ${money(fee - pr.plan.deposit, 'GBP')} balance within ${chHoldDays()} days.</span></span></label>` : `<div class="note b-grey ch-nodep">${ic('info')}<div class="small"><strong>${s.noDeposit ? 'Instalments only.' : 'No deposit for this batch.'}</strong> ${s.noDeposit ? 'The deposit option isn\'t offered again for this course.' : `A deposit can only hold a seat when the batch starts in ${CH_HOLD_DAYS} days or more.`}</div></div>`}
    <label class="check"><input type="radio" name="su-opt" value="instalment" ${opt === 'instalment' ? 'checked' : ''} data-onchange="suOpt"><span><strong>Instalments — ${pr.plan.inst} monthly payments${e1InstTxt(fee, pr.plan.inst)}</strong><br><span class="small muted">Pay the first instalment (${money(inst, 'GBP')}) now.</span></span></label></fieldset>
    <fieldset class="stack"><legend class="lbl">Payment method</legend><label class="check"><input type="radio" name="su-m" value="card" ${method === 'card' ? 'checked' : ''} data-onchange="suMethod"><span><strong>Card</strong></span></label><label class="check"><input type="radio" name="su-m" value="bank" ${method === 'bank' ? 'checked' : ''} data-onchange="suMethod"><span><strong>Bank transfer</strong> <span class="small muted">— you start now; Finance confirms your payment</span></span></label></fieldset>
    ${method === 'bank' ? `<div class="note b-blue">${ic('info')}<div class="small"><strong>Pay ${money(amount, 'GBP')} by bank transfer.</strong><br>Pay to: ${chBankHtml(ref)}<br>Your payment shows as <strong>Awaiting confirmation by Finance</strong>.</div></div>` : ''}
    ${chNav(w, `<button class="btn btn-primary" data-act="suPay">${method === 'card' ? `Pay ${money(amount, 'GBP')} by card` : 'I\'ve made the transfer — start now'}</button>`)}</section>`;
};
const _suPayCh8 = ACT.suPay;
ACT.suPay = el => {
  const w = W, pr = ch8ProgOfW(w); if (!pr) return _suPayCh8(el);
  const s = w.signup, b = chBatch(s.batch); if (!chHasPlace(b)) { render(); return; }
  const depOk = chDepositOk(b) && !s.noDeposit; let opt = ui('suOpt', depOk ? 'deposit' : 'instalment'); if (opt === 'deposit' && !depOk) opt = 'instalment';
  const method = ui('suMethod', 'card'), amount = ch8PayAmount(pr, opt);
  if (method === 'bank') { chComplete(w, { opt, method, amount, ref: chRefOf(w, opt) }); return; }
  checkout({ title: (opt === 'deposit' ? 'NVQ deposit — ' : `NVQ instalment 1 of ${pr.plan.inst} — `) + pr.title, amount, cur: 'GBP', onSuccess: (paid, ref) => chComplete(w, { opt, method, amount, ref }, true) });
};
const _ccCh8 = chComplete;
chComplete = function (w, o) {
  const r = _ccCh8.apply(this, arguments), pr = ch8ProgOfW(w); if (!pr || !w.signup.done || !o || !o.opt) return r;
  const fee = pr.price, dep = pr.plan.deposit, n = pr.plan.inst, pl = w.plans.find(p => p.e === 'nvq'), at = w.signup.pay ? w.signup.pay.at : now().toISOString(), bank = o.method === 'bank', st = bank ? 'Awaiting confirmation by Finance' : 'Paid';
  if (o.opt === 'deposit') { Object.assign(w.admission.deposit, { min: dep, balance: fee - dep }); if (pl) { pl.deposit = { ...pl.deposit, amount: dep }; pl.rows = [{ n: 1, amount: fee - dep, due: pl.rows[0] ? pl.rows[0].due : at, status: 'Pending', paid: 0 }]; } }
  else if (pl) pl.rows = e1Sched(fee, n).map((amt, i) => ({ n: i + 1, amount: amt, due: new Date(new Date(at).getTime() + i * 30 * DAY).toISOString(), status: i ? 'Pending' : st, paid: i || bank ? 0 : amt, receipt: i || bank ? undefined : 'RCP-' + (27500 + +w.me.id.slice(-3)) }));
  if (pl) pl.total = fee;
  return r;
};
ACT.chSc25SignUp = () => {
  const pr = (STORE.chNewProgs || []).find(p => p.id !== 'NV-N2' && p.status === 'Active') || ch8Pr('NV-N2');
  S.variant = 'A'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('browse');
  toast(`Viewing as Daniel Okafor. Apply for ${pr.title}.`, 'info');
};
const _idxCh8b = SCREENS['a-index'];
SCREENS['a-index'] = p => _idxCh8b(p).replace(/(<section class="card idx-sec"><h2>Client decisions \(CH\)<\/h2><ul class="idx-list">)/, `$1${chIdxLi('New programme — published (Preparing to Work), with its batch', { act: 'aJump', t: 'a-programmes.NV-N2' }, 'Gap fix — a programme made with the wizard, open for batches and sign-up.')}`);
