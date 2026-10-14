/* ============================================================
   Setup fixes S1 — short courses, end to end (S1-01 … S1-08).
   Every short course now has its own saved data (details, price, custom fields, content items, modules with their
   own quiz questions, completion rules, certificate template, validity and reminders), and the learner side reads it:
   Browse Courses lists the published courses from Short Courses, buying uses the course's content, modules, quiz
   questions and settings, and completion and the certificate follow the course's rules. Seeded from today's fixed
   values, so the existing demo behaves as before. Loads after ch-b8.js.
   ============================================================ */
'use strict';

const S1_CAT0 = CATALOGUE.filter(c => c.kind === 'short').map(c => ({ ...c })); // today's Browse entries (ids, prices, text)
const S1_RULES = [['docs', 'Open all documents'], ['video', 'Watch all videos to at least 90%'], ['scorm', 'Complete the interactive SCORM module'], ['quiz', 'Pass every module quiz']];
const S1_CERT_FIELDS = ['Learner name', 'Course', 'Completion date', 'Issue date', 'Expiry', 'Certificate number', 'QR code'];
const S1_LAYOUTS = ['Landscape — classic border', 'Portrait — minimal'];
const S1_KINDS = [['doc', 'Document'], ['video', 'Vimeo video'], ['scorm', 'SCORM package'], ['link', 'Link']];
const S1_VALID = ['6 months', '12 months', '24 months', '36 months', 'No expiry'];
const s1Can = () => isSA() || (typeof isSys === 'function' && isSys()) || (typeof isAca === 'function' && isAca());
const s1Row = id => (ADMIN.courses || []).find(c => c.id === id);
const s1Keep = c => { (STORE.sRows = STORE.sRows || {})[c.id] = c; return c; }; // edited rows survive admin rebuilds
const s1Months = v => /No expiry/i.test(v || '') ? 0 : /(\d+)\s*year/i.test(v || '') ? 12 * +RegExp.$1 : /(\d+)\s*month/i.test(v || '') ? +RegExp.$1 : 12;
const s1Log = (c, action, before, after, r) => logA('Short Courses', `${c.title} (${c.id})`, action, before, after, r || '');

/* ---------- S1-07: one course list — the Browse-only courses join the admin list ---------- */
function s1SeedRows() {
  if (typeof ADMIN === 'undefined' || !ADMIN || !ADMIN.courses) return;
  const add = (id, title, cat, gbp, validity) => { if (!ADMIN.courses.some(c => c.id === id)) ADMIN.courses.push({ id, title, cat, status: 'Published', gbp, validity, access: 90, enrol: 0, comp: 0, version: 1 }); };
  add('SC-10', 'Mental Capacity Act and DoLS', 'Person-centred care', 39, '12 months');
  add('SC-11', 'End of Life Care', 'Person-centred care', 35, '24 months');
  add('SC-12', 'Food Hygiene Level 2', 'Health and safety', 20, 'No expiry');
  const oral = ADMIN.courses.find(c => c.id === 'SC-08'); if (oral && !(STORE.sRows || {})['SC-08']) oral.status = 'Published'; // already on sale
  Object.values(STORE.sRows || {}).forEach(r => { const k = ADMIN.courses.findIndex(c => c.id === r.id); if (k >= 0) ADMIN.courses[k] = r; else ADMIN.courses.push(r); });
}
const _baS1 = buildAdmin;
buildAdmin = function () { const r = _baS1.apply(this, arguments); s1SeedRows(); s1Sync(); return r; };
const _isS1 = initStore;
initStore = function () { STORE.sRows = {}; STORE.sSpec = {}; const r = _isS1.apply(this, arguments); s1SeedRows(); s1Sync(); return r; };

/* ---------- Per-course data (seeded from today's fixed values) ---------- */
function s1Spec(c) {
  const S_ = STORE.sSpec = STORE.sSpec || {};
  if (!S_[c.id]) {
    const cat = S1_CAT0.find(x => x.title === c.title), topic = cat ? cat.topic : (CH_TOPIC[c.title] || '');
    S_[c.id] = { desc: cat ? cat.desc : 'Practical, law-based training for care workers.', dur: cat ? cat.dur : '3 hours', topic, fields: [], items: shortContent(topic).map(it => ({ ...it, status: 'Active' })), rules: { docs: true, video: true, scorm: false, quiz: true }, cert: { layout: S1_LAYOUTS[0], fields: S1_CERT_FIELDS.slice(), logo: '' }, remind: '30, 15, 7' };
  }
  return S_[c.id];
}
// Each module quiz has its own questions; existing modules start with today's shared bank
const s1QOf = (q, i) => ({ id: 'q' + (i + 1), text: q[0], opts: q[1].slice(), correct: q[2], status: 'Active' });
function s1Mods(c) { const mods = chCourseMods(c); mods.forEach(m => { if (!m.quiz.qs) m.quiz.qs = QUIZ_BANK.map(s1QOf); }); return mods; }
const s1ActQs = m => (m.quiz.qs || []).filter(q => q.status === 'Active');
// The learner's quiz: the module's own questions (enrolments made before S1 use today's bank)
const s1Qs = m => ((m && m.quiz && m.quiz.qs) || QUIZ_BANK).slice(0, Math.max(1, (m && m.quiz && m.quiz.q) || 10));
function S1Q() { const Q = W.quiz, e = Q && enrolById(Q.e), m = e && (shModOf(e, Q.m) || shCurMod(e)); return m ? s1Qs(m) : QUIZ_BANK; }

/* ---------- Browse Courses = the published courses (S1-07) ---------- */
function s1Sync() {
  if (typeof ADMIN === 'undefined' || !ADMIN || !ADMIN.courses || !STORE.worlds) return;
  const pub = ADMIN.courses.filter(c => c.status === 'Published');
  const keyOf = c => (S1_CAT0.find(x => x.title === c.title) || {}).id || 'k-' + c.id;
  const rank = c => { const k = S1_CAT0.findIndex(x => x.title === c.title); return k < 0 ? 100 + ADMIN.courses.indexOf(c) : k; };
  const shorts = pub.slice().sort((a, b) => rank(a) - rank(b)).map(c => { const sp = s1Spec(c); return { id: keyOf(c), kind: 'short', title: c.title, dur: sp.dur, price: c.gbp, validity: c.validity, desc: sp.desc, topic: sp.topic, course: c.id }; });
  const rest = CATALOGUE.filter(x => x.kind !== 'short');
  CATALOGUE.splice(0, CATALOGUE.length, ...shorts, ...rest);
}
const _browseS1 = SCREENS.browse; SCREENS.browse = p => { s1Sync(); return _browseS1(p); };
const _bqS1 = INP.browseQ; INP.browseQ = el => { s1Sync(); return _bqS1(el); };

/* ---------- Buying: an "About you for this course" step when the course has custom fields (S1-02) ---------- */
const _buyS1 = ACT.buyCourse;
ACT.buyCourse = el => {
  s1Sync(); const c = CATALOGUE.find(x => x.id === el.dataset.id), row = c && c.course && s1Row(c.course); if (!row) return _buyS1(el);
  const fields = s1Spec(row).fields.filter(f => f.status === 'Active');
  const pay = ans => checkout({ title: c.title, amount: W.amt(c.price), onSuccess: () => s1Enrol(c, row, ans) });
  if (!fields.length) return pay(null);
  openModal({ title: 'About you for this course', sub: esc(c.title), body: `<p class="small muted">The Academy needs these details for your enrolment.</p>${fields.map(f => `<div class="field"><label for="sf-${f.id}">${esc(f.label)}${f.req ? '' : ' (optional)'}</label>${f.type === 'date' ? `<input class="input" type="date" id="sf-${f.id}">` : f.type === 'long' ? `<textarea class="textarea" id="sf-${f.id}"></textarea>` : `<input class="input" id="sf-${f.id}">`}</div>`).join('')}`,
    actions: [{ label: 'Cancel' }, { label: 'Continue to payment', cls: 'btn-primary', fn: () => { const ans = []; for (const f of fields) { const v = mval('#sf-' + f.id); if (f.req && !v) { fieldErr('#sf-' + f.id, 'Enter ' + f.label.toLowerCase()); return false; } ans.push([f.label, v]); } pay(ans); return false; } }] });
};
function s1Enrol(c, row, ans) {
  const sp = s1Spec(row), items = sp.items.filter(i => i.status === 'Active'), at = now().toISOString();
  const content = items.map(it => ({ id: it.id, kind: it.kind, title: it.title, dur: it.dur || '', state: it.state || 'Not opened', dl: it.dl !== undefined ? it.dl : it.kind === 'doc', watch: it.watch || 0, resume: it.resume || '0:00', score: it.score || 0, src: it.src || '' }));
  const modules = s1Mods(row).filter(m => m.status === 'Active').map(m => { const qs = s1ActQs(m).map(q => [q.text, q.opts.slice(), q.correct]); return { id: m.id, title: m.title, items: m.items.filter(id => content.some(x => x.id === id)), quiz: { q: Math.min(m.quiz.q, qs.length) || qs.length, limit: m.quiz.limit, pass: m.quiz.pass, max: m.quiz.max, attempts: [], qs } }; });
  const pass = modules.length ? Math.min(...modules.map(m => m.quiz.pass)) : 80;
  const reqs = S1_RULES.filter(([k]) => sp.rules[k]).map(([k, l]) => [k === 'quiz' ? `${l} with ${pass}% or more` : l, false]);
  W.enrolments.unshift({ id: 'b' + c.id, kind: 'short', type: 'Short course', title: c.title + ' — ' + new Date(now()).getFullYear(), base: c.title, status: 'Active', enrolled: at, start: at, end: D(row.access || 90), progress: 0, price: W.amt(c.price), topic: sp.topic, desc: sp.desc, reqs, content, modules, validity: row.validity, courseId: row.id, fields: ans || null, certTpl: { ...sp.cert, fields: sp.cert.fields.slice() }, remind: sp.remind });
  W.plans.push({ e: 'b' + c.id, title: c.title, plan: 'One-time', total: W.amt(c.price), rows: [{ n: 1, amount: W.amt(c.price), due: at, status: 'Paid', paid: W.amt(c.price), receipt: 'RCP-28' + Math.floor(Math.random() * 900 + 100) }] });
  row.enrol = (row.enrol || 0) + 1;
}
// Completion follows the course's rules (any pass mark, SCORM rule), and the certificate its validity, template and reminders
const _recalcS1 = recalcShort;
recalcShort = function (e) {
  _recalcS1.apply(this, arguments); const mods = shMods(e);
  e.reqs = e.reqs.map(([r, ok]) => [r, /^Pass every module quiz/.test(r) ? mods.length > 0 && mods.every(shPassed) : /^Complete the interactive SCORM/.test(r) ? e.content.filter(c => c.kind === 'scorm').every(c => c.state === 'Completed') : ok]);
};
const _shCompS1 = shComplete;
shComplete = function (e) {
  const before = e.status; _shCompS1.apply(this, arguments);
  if (before === 'Completed' || e.status !== 'Completed' || !e.courseId) return;
  const cert = W.certs.find(x => x.id === e.certId); if (!cert) return;
  const mo = s1Months(e.validity); cert.expires = mo ? new Date(new Date(cert.issued).getTime() + mo * 30.44 * DAY).toISOString() : null;
  cert.tpl = e.certTpl; cert.remind = String(e.remind || '30, 15, 7').split(',').map(x => +x.trim()).filter(x => x > 0);
};
// Link items: open the address, count as completed
const _openS1 = ACT.openItem;
ACT.openItem = el => {
  const e = enrolById(el.dataset.e), c = e && e.content.find(x => x.id === el.dataset.id); if (!c || c.kind !== 'link') return _openS1(el);
  c.state = 'Completed'; recalcShort(e); shComplete(e);
  openModal({ title: esc(c.title), sub: 'Link', body: `<p class="small">This item opens an external page:</p><p><a href="${esc(c.src)}" target="_blank" rel="noopener">${esc(c.src)}</a></p><p class="xs muted">Marked as completed when opened.</p>`, actions: [{ label: 'Close', cls: 'btn-primary', fn: () => { render(); } }] });
};

/* ---------- Admin: the course editor reads and saves the course's own data ---------- */
const S1_TABS = [['details', 'Details'], ['content', 'Content'], ['modules', 'Modules'], ['completion', 'Completion rules'], ['certificate', 'Certificate'], ['validity', 'Validity'], ['versions', 'Version history']];
function s1Details(c, sp) {
  const fields = sp.fields;
  return `<form class="card form-grid" onsubmit="return false"><div class="field full"><label for="cd-t">Title</label><input class="input" id="cd-t" value="${esc(c.title)}"></div><div class="field full"><label for="cd-d">Description</label><textarea class="textarea" id="cd-d">${esc(sp.desc)}</textarea></div><div class="field"><label for="cd-c">Category</label><input class="input" id="cd-c" value="${esc(c.cat)}"></div><div class="field"><label for="cd-du">Duration</label><input class="input" id="cd-du" value="${esc(sp.dur)}"></div><div class="field"><label for="cd-g">Price (GBP)</label><input class="input num" type="number" min="0" step="0.01" id="cd-g" value="${c.gbp}" ${canPrice() ? '' : 'readonly'}></div>${canPrice() ? '<p class="xs muted full">A new price applies to new purchases only — existing enrolments keep their price.</p>' : `<p class="xs muted full">${ic('lock', 12)} Prices are set by the Super Administrator or System Administrator — read-only for you.</p>`}<div class="field"><label for="cd-ap">Access period (days)</label><input class="input num" id="cd-ap" type="number" min="1" value="${c.access}"></div></form>
    <section class="card s1-fields"><div class="row-b"><h3>Enrolment-step custom fields</h3><button class="btn btn-sm" data-act="s1FieldAdd" data-id="${c.id}">${ic('plus', 14)}Add field</button></div><p class="small muted">Asked in "About you for this course" before checkout. A course with no fields goes straight to checkout.</p>
      ${fields.length ? `<ul class="list small">${fields.map(f => `<li class="li ${f.status === 'Retired' ? 'ch-retired' : ''}"><div class="li-b"><strong>${esc(f.label)}</strong><span class="xs muted">${{ text: 'Short text', long: 'Long text', date: 'Date' }[f.type]} · ${f.req ? 'Required' : 'Optional'}${f.status === 'Retired' ? ' · Retired' : ''}</span></div><button class="btn btn-sm" data-act="s1FieldEdit" data-id="${c.id}" data-f="${f.id}" ${f.status === 'Retired' ? 'disabled title="Restore the field to change it"' : ''}>Edit</button><button class="btn btn-sm" data-act="s1FieldRetire" data-id="${c.id}" data-f="${f.id}">${f.status === 'Retired' ? 'Restore' : 'Retire'}</button></li>`).join('')}</ul>` : '<p class="small muted">No custom fields.</p>'}</section>`;
}
function s1Content(c, sp) {
  const mods = s1Mods(c), modOf = id => mods.find(m => m.items.includes(id)), act = sp.items.filter(i => i.status === 'Active');
  const ico = k => ic(k === 'scorm' ? 'pkg' : k === 'link' ? 'link' : k);
  return `<section class="card"><div class="row-b s1-ch"><h2>Content</h2><button class="btn btn-sm btn-primary s1-add" data-act="s1ItemAdd" data-id="${c.id}">${ic('plus', 14)}Add item (document / Vimeo / SCORM 1.2 or 2004 / link)</button></div><p class="small muted">This course's own content. Each item belongs to a module; learners see it under that module. Changes apply to new enrolments.</p>
    ${sp.items.length ? `<ol class="list">${sp.items.map(it => { const k = act.indexOf(it), m = modOf(it.id); return `<li class="li ${it.status === 'Retired' ? 'ch-retired' : ''}"><div class="li-icon">${ico(it.kind)}</div><div class="li-b"><span class="strong">${it.status === 'Active' ? (k + 1) + '. ' : ''}${esc(it.title)}</span><span class="xs muted">${(S1_KINDS.find(x => x[0] === it.kind) || [, it.kind])[1]}${it.scorm ? ' ' + it.scorm : ''}${it.src ? ' · ' + esc(it.src) : ''} · ${m ? 'Module: ' + esc(m.title) : 'Not in a module'}${it.status === 'Retired' ? ' · Retired' : ''}</span></div>${it.status === 'Active' ? `<button class="icon-btn" data-act="s1ItemMove" data-id="${c.id}" data-i="${it.id}" data-d="-1" aria-label="Move up" ${k === 0 ? 'disabled title="Already the first item"' : ''}>↑</button><button class="icon-btn" data-act="s1ItemMove" data-id="${c.id}" data-i="${it.id}" data-d="1" aria-label="Move down" ${k === act.length - 1 ? 'disabled title="Already the last item"' : ''}>↓</button><button class="btn btn-sm" data-act="s1ItemEdit" data-id="${c.id}" data-i="${it.id}">Edit</button>` : ''}<button class="btn btn-sm" data-act="s1ItemRetire" data-id="${c.id}" data-i="${it.id}">${it.status === 'Retired' ? 'Restore' : 'Retire'}</button></li>`; }).join('')}</ol>` : '<div class="empty"><p class="small">No content yet. Add the first item.</p></div>'}</section>`;
}
function s1Completion(c, sp) {
  return `<section class="card"><h3>Completion rules</h3><p class="small muted">The course is completed when every rule ticked here is met; the certificate is then issued.</p><ul class="list">${S1_RULES.map(([k, l]) => `<li class="li"><label class="check"><input type="checkbox" class="s1-rule" value="${k}" ${sp.rules[k] ? 'checked' : ''}>${k === 'quiz' ? 'Every module quiz passed (each module\'s pass mark)' : l}</label></li>`).join('')}</ul></section>`;
}
function s1Certificate(c, sp) {
  const t = sp.cert;
  return `<div class="grid-2"><section class="card"><h3>Template designer</h3><div class="field"><label for="ct-logo">Logo</label><input class="input" type="file" id="ct-logo" accept="image/*"><span class="hint">${t.logo ? 'Current: ' + esc(t.logo) : 'Default "Welfare" mark'}</span></div><div class="field"><label for="ct-l">Layout</label><select class="select" id="ct-l">${S1_LAYOUTS.map(l => `<option ${l === t.layout ? 'selected' : ''}>${l}</option>`).join('')}</select></div><fieldset class="stack" style="border:0;padding:0"><legend class="lbl">Fields</legend>${S1_CERT_FIELDS.map(f => `<label class="check small"><input type="checkbox" class="s1-cf" value="${f}" ${t.fields.includes(f) ? 'checked' : ''}>${f}</label>`).join('')}</fieldset><p class="small">Issuing-entity branding: "Welfare" (certificates only — the verification page and everything else use Illumin Academy)</p></section>
    <section class="card"><h3>Live preview</h3><div class="cert-doc" style="padding:24px"><span class="w-brand">Welfare</span><h3>Certificate of completion</h3><span class="nm">Learner Name</span><p>${esc(c.title)}</p><div class="meta"><span>Issued ${fd(now().toISOString())}${t.fields.includes('Expiry') ? `<br>${c.validity === 'No expiry' ? 'No expiry' : 'Valid ' + esc(c.validity)}` : ''}</span>${t.fields.includes('QR code') ? qr('preview', 50) : ''}<span>${t.fields.includes('Certificate number') ? 'WEL-2026-0000' : ''}</span></div></div><p class="xs muted">${esc(t.layout)}</p></section></div>`;
}
function s1Validity(c, sp) {
  const cur = c.validity, custom = !S1_VALID.includes(cur);
  return `<section class="card"><fieldset class="stack" style="border:0;padding:0"><legend class="lbl">Certificate validity</legend>${S1_VALID.map(v => `<label class="check"><input type="radio" name="val" value="${v}" ${v === cur ? 'checked' : ''}>${v === '12 months' ? '1 year (12 months)' : v}</label>`).join('')}<label class="check"><input type="radio" name="val" value="custom" ${custom ? 'checked' : ''}>Custom (N months)</label></fieldset><div class="field" style="max-width:220px"><label for="val-n">Custom months</label><input class="input num" type="number" min="1" id="val-n" value="${custom ? s1Months(cur) : ''}"></div><div class="field"><label for="rem">Reminder offsets (days before expiry)</label><input class="input" id="rem" value="${esc(sp.remind)}"></div><p class="small muted">Used for certificates issued from now on. Bundle or agency-level validity overrides this default.</p></section>`;
}
const _ceS1 = courseEditor;
courseEditor = function (id, t) {
  const c = s1Row(id); if (!c) return _ceS1.apply(this, arguments);
  const h = _ceS1.apply(this, arguments); if (t === 'versions') return h;
  const sp = s1Spec(c), st = subtabs(S1_TABS, t, 'a-courses', c.id), k = h.indexOf(st); if (k < 0) return h;
  const body = { details: s1Details(c, sp), content: s1Content(c, sp), modules: chModulesTab(c), completion: s1Completion(c, sp), certificate: s1Certificate(c, sp), validity: s1Validity(c, sp) }[t] || '';
  const saveable = ['details', 'completion', 'certificate', 'validity'].includes(t);
  const row = `<div class="row">${saveable ? `<button class="btn btn-primary" data-act="s1Save" data-id="${c.id}" data-t="${t}">Save (creates Version ${c.version + 1})</button>` : ''}${c.status === 'Draft' ? `<button class="btn" data-act="pubCourse" data-id="${c.id}">Publish</button>` : c.status === 'Published' ? `<button class="btn" data-act="retireCourse" data-id="${c.id}">Retire</button>` : `<button class="btn" data-act="s1Unretire" data-id="${c.id}">Un-retire</button>`}</div>`;
  return h.slice(0, k + st.length) + body + row;
};
ACT.s1Save = el => {
  const c = s1Row(el.dataset.id), t = el.dataset.t, sp = s1Spec(c); if (!c) return;
  let apply, before, after;
  if (t === 'details') {
    const d = { title: $('#cd-t').value.trim(), desc: $('#cd-d').value.trim(), cat: $('#cd-c').value.trim(), dur: $('#cd-du').value.trim(), gbp: +$('#cd-g').value, access: +$('#cd-ap').value };
    if (!d.title) return fieldErr('#cd-t', 'Enter a title'); if (ADMIN.courses.some(x => x !== c && x.title.toLowerCase() === d.title.toLowerCase())) return fieldErr('#cd-t', 'Another course has this title');
    if (!d.cat) return fieldErr('#cd-c', 'Enter a category'); if (!(d.access >= 1)) return fieldErr('#cd-ap', 'Enter at least 1 day');
    if (canPrice() && !(d.gbp >= 0)) return fieldErr('#cd-g', 'Enter a price in GBP');
    before = `${c.title} · ${c.cat} · ${sp.dur} · ${money(c.gbp, 'GBP')} · ${c.access} days`;
    apply = () => { Object.assign(c, { title: d.title, cat: d.cat, access: d.access }); if (canPrice()) c.gbp = d.gbp; Object.assign(sp, { desc: d.desc, dur: d.dur }); return `${c.title} · ${c.cat} · ${sp.dur} · ${money(c.gbp, 'GBP')} · ${c.access} days`; };
  } else if (t === 'completion') {
    const on = $$('.s1-rule:checked').map(x => x.value); if (!on.length) { toast('Tick at least one completion rule.', 'err'); return; }
    before = Object.keys(sp.rules).filter(k => sp.rules[k]).join(', '); apply = () => { S1_RULES.forEach(([k]) => { sp.rules[k] = on.includes(k); }); return on.join(', '); };
  } else if (t === 'certificate') {
    const f = $$('.s1-cf:checked').map(x => x.value), logo = ($('#ct-logo').files[0] || {}).name; if (!f.includes('Learner name') || !f.includes('Course')) { toast('The learner name and the course must be on the certificate.', 'err'); return; }
    before = `${sp.cert.layout} · ${sp.cert.fields.length} fields`; apply = () => { sp.cert = { layout: $('#ct-l').value, fields: f, logo: logo || sp.cert.logo }; return `${sp.cert.layout} · ${f.length} fields`; };
  } else if (t === 'validity') {
    const v = ($('input[name="val"]:checked') || {}).value, n = +$('#val-n').value, rem = $('#rem').value.split(',').map(x => x.trim()).filter(Boolean);
    if (v === 'custom' && !(n >= 1)) return fieldErr('#val-n', 'Enter the number of months'); if (rem.some(x => !(+x > 0))) return fieldErr('#rem', 'Use whole days separated by commas, e.g. 30, 15, 7');
    const val = v === 'custom' ? n + ' months' : v; before = `${c.validity} · reminders ${sp.remind}`; apply = () => { c.validity = val; sp.remind = rem.join(', '); return `${val} · reminders ${sp.remind}`; };
  }
  reasonDlg({ title: 'Save as a new version?', ok: 'Save new version', body: `<div class="note b-blue">${ic('info')}<div class="small">This creates a new version effective from today. Existing enrolments stay on their version.${t === 'details' && canPrice() && +$('#cd-g').value !== c.gbp ? ' <strong>Applies to new purchases only — existing enrolments keep their price.</strong>' : ''}</div></div>`, label: 'Change summary (required)',
    onOk: r => { after = apply(); c.version++; s1Keep(c); s1Log(c, `Saved (${t}) — version ${c.version}`, before, after, r); s1Sync(); render(); toast('Saved. New version effective from today — existing enrolments unaffected.'); } });
};
// Custom fields (S1-02)
const s1FieldDlg = (c, f) => openModal({ title: f ? 'Edit field' : 'Add field', sub: esc(c.title), body: `<div class="field"><label for="cf-l">Label</label><input class="input" id="cf-l" value="${esc(f ? f.label : '')}"></div><div class="field"><label for="cf-t">Type</label><select class="select" id="cf-t">${[['text', 'Short text'], ['long', 'Long text'], ['date', 'Date']].map(([v, l]) => `<option value="${v}" ${f && f.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div><label class="check"><input type="checkbox" id="cf-r" ${!f || f.req ? 'checked' : ''}>Required</label>`,
  actions: [{ label: 'Cancel' }, { label: f ? 'Save field' : 'Add field', cls: 'btn-primary', fn: () => { const l = mval('#cf-l'); if (!l) return fieldErr('#cf-l', 'Enter a label'), false; const sp = s1Spec(c), v = { label: l, type: mval('#cf-t'), req: $('#cf-r').checked }; if (f) { const was = `${f.label} (${f.type}, ${f.req ? 'required' : 'optional'})`; Object.assign(f, v); s1Log(c, 'Custom field changed', was, `${l} (${v.type}, ${v.req ? 'required' : 'optional'})`); } else { sp.fields.push({ id: 'f' + (sp.fields.length + 1), ...v, status: 'Active' }); s1Log(c, 'Custom field added', '—', `${l} (${v.type}, ${v.req ? 'required' : 'optional'})`); } s1Keep(c); render(); } }] });
ACT.s1FieldAdd = el => s1FieldDlg(s1Row(el.dataset.id), null);
ACT.s1FieldEdit = el => { const c = s1Row(el.dataset.id); s1FieldDlg(c, s1Spec(c).fields.find(f => f.id === el.dataset.f)); };
ACT.s1FieldRetire = el => { const c = s1Row(el.dataset.id), f = s1Spec(c).fields.find(x => x.id === el.dataset.f), to = f.status === 'Retired' ? 'Active' : 'Retired'; reasonDlg({ title: (to === 'Retired' ? 'Retire' : 'Restore') + ' field — ' + esc(f.label), ok: to === 'Retired' ? 'Retire field' : 'Restore field', onOk: r => { f.status = to; s1Log(c, to === 'Retired' ? 'Custom field retired' : 'Custom field restored', f.label, to, r); render(); } }); };
// Content items (S1-03)
function s1ItemDlg(c, it) {
  const mods = s1Mods(c).filter(m => m.status === 'Active'), cur = it && mods.find(m => m.items.includes(it.id)), k = it ? it.kind : ui('s1Kind', 'doc');
  openModal({ title: it ? 'Edit content item' : 'Add content item', sub: esc(c.title), size: 'lg', body: `<div class="form-grid"><div class="field"><label for="ci-k">Type</label><select class="select" id="ci-k" data-onchange="s1Kind" ${it ? 'disabled title="The type of an existing item can\'t change"' : ''}>${S1_KINDS.map(([v, l]) => `<option value="${v}" ${v === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div><div class="field"><label for="ci-t">Title</label><input class="input" id="ci-t" value="${esc(it ? it.title : '')}"></div>
    <div class="field full" id="ci-src">${s1SrcField(k, it)}</div><div class="field"><label for="ci-d">Duration or length (optional)</label><input class="input" id="ci-d" value="${esc(it ? it.dur : '')}" placeholder="e.g. 12:30 or 8 pages"></div><div class="field"><label for="ci-m">Module</label><select class="select" id="ci-m"><option value="">Not in a module yet</option>${mods.map(m => `<option value="${m.id}" ${(cur ? cur.id : ui('s1Mod', '')) === m.id ? 'selected' : ''}>${esc(m.title)}</option>`).join('')}</select></div></div>`,
    actions: [{ label: 'Cancel' }, { label: it ? 'Save item' : 'Add item', cls: 'btn-primary', fn: () => s1ItemSave(c, it) }] });
}
function s1SrcField(k, it) {
  const v = esc(it ? it.src : '');
  if (k === 'video') return `<label for="ci-s">Vimeo video ID</label><input class="input mono" id="ci-s" value="${v}" placeholder="e.g. 824804225">`;
  if (k === 'link') return `<label for="ci-s">Web address (URL)</label><input class="input" id="ci-s" value="${v}" placeholder="https://">`;
  return `<label for="ci-f">${k === 'scorm' ? 'SCORM package (.zip)' : 'File (PDF, DOCX or PPTX)'}</label><input class="input" type="file" id="ci-f" accept="${k === 'scorm' ? '.zip' : '.pdf,.docx,.pptx'}" data-onchange="s1File"><span class="hint"><span id="ci-fn">${v || 'No file chosen'}</span> · <button type="button" class="linklike" data-act="s1SampleFile">Use a sample file</button></span>${k === 'scorm' ? `<label for="ci-sv" style="margin-top:8px">SCORM version</label><select class="select" id="ci-sv">${['SCORM 1.2', 'SCORM 2004'].map(x => `<option ${it && it.scorm === x ? 'selected' : ''}>${x}</option>`).join('')}</select>` : ''}`;
}
INP.s1Kind = el => { setUi('s1Kind', el.value); setUi('s1File', ''); $('#ci-src').innerHTML = s1SrcField(el.value, null); };
INP.s1File = el => { const f = el.files[0]; setUi('s1File', f ? f.name : ''); $('#ci-fn').textContent = f ? f.name : 'No file chosen'; };
ACT.s1SampleFile = () => { const k = $('#ci-k').value, n = k === 'scorm' ? 'scorm-package.zip' : 'course-handout.pdf'; setUi('s1File', n); $('#ci-fn').textContent = n; };
function s1ItemSave(c, it) {
  const sp = s1Spec(c), k = it ? it.kind : $('#ci-k').value, title = mval('#ci-t'), mid = $('#ci-m').value, dur = mval('#ci-d');
  if (!title) return fieldErr('#ci-t', 'Enter a title'), false;
  let src = '', scorm = '';
  if (k === 'video') { src = mval('#ci-s'); if (!/^\d{6,}$/.test(src)) return fieldErr('#ci-s', 'Enter the numeric Vimeo ID'), false; }
  else if (k === 'link') { src = mval('#ci-s'); if (!/^https?:\/\/\S+\.\S+/.test(src)) return fieldErr('#ci-s', 'Enter a full web address starting with https://'), false; }
  else { src = ui('s1File', '') || (it ? it.src : ''); if (!src) return fieldErr('#ci-f', 'Choose a file'), false; if (k === 'scorm' && !/\.zip$/i.test(src)) return fieldErr('#ci-f', 'Upload a SCORM .zip package'), false; scorm = k === 'scorm' ? $('#ci-sv').value : ''; }
  const mods = s1Mods(c);
  if (it) { const was = `${it.title} · ${it.src}`; Object.assign(it, { title, src, dur, scorm: scorm || it.scorm }); mods.forEach(m => { m.items = m.items.filter(i => i !== it.id); }); if (mid) mods.find(m => m.id === mid).items.push(it.id); s1Log(c, 'Content item changed', was, `${title} · ${src}`); }
  else { const n = Math.max(0, ...sp.items.map(x => +String(x.id).replace(/\D/g, '') || 0)) + 1, id = 'c' + n; sp.items.push({ id, kind: k, title, src, dur: dur || (k === 'doc' ? '1 page' : ''), scorm, state: 'Not opened', dl: k === 'doc', watch: 0, resume: '0:00', score: 0, status: 'Active' }); if (mid) mods.find(m => m.id === mid).items.push(id); s1Log(c, 'Content item added', '—', `${S1_KINDS.find(x => x[0] === k)[1]}: ${title}`); }
  setUi('s1File', ''); s1Keep(c); closeModal(); render(); toast(it ? 'Item saved.' : 'Item added to the course.');
}
ACT.s1ItemAdd = el => { setUi('s1Kind', 'doc'); setUi('s1File', ''); s1ItemDlg(s1Row(el.dataset.id), null); };
ACT.s1ItemEdit = el => { const c = s1Row(el.dataset.id); setUi('s1File', ''); s1ItemDlg(c, s1Spec(c).items.find(i => i.id === el.dataset.i)); };
ACT.s1ItemMove = el => { const c = s1Row(el.dataset.id), sp = s1Spec(c), act = sp.items.filter(i => i.status === 'Active'), it = act.find(i => i.id === el.dataset.i), k = act.indexOf(it), to = act[k + +el.dataset.d]; if (!to) return; const a = sp.items.indexOf(it), b = sp.items.indexOf(to); [sp.items[a], sp.items[b]] = [sp.items[b], sp.items[a]]; s1Log(c, 'Content reordered', '—', sp.items.filter(i => i.status === 'Active').map(i => i.title).join(' → ')); render(); };
ACT.s1ItemRetire = el => { const c = s1Row(el.dataset.id), it = s1Spec(c).items.find(i => i.id === el.dataset.i), to = it.status === 'Retired' ? 'Active' : 'Retired'; reasonDlg({ title: (to === 'Retired' ? 'Retire' : 'Restore') + ' item — ' + esc(it.title), ok: to === 'Retired' ? 'Retire item' : 'Restore item', body: '<p class="small">Learners already enrolled keep what they have. Nothing is deleted.</p>', onOk: r => { it.status = to; if (to === 'Retired') s1Mods(c).forEach(m => { m.items = m.items.filter(i => i !== it.id); }); s1Log(c, to === 'Retired' ? 'Content item retired' : 'Content item restored', it.title, to, r); render(); } }); };

/* ---------- Modules tab: rename, the module's own questions (S1-04, S1-05) ---------- */
chModulesTab = function (c) {
  const mods = s1Mods(c), items = s1Spec(c).items.filter(i => i.status === 'Active'), live = mods.filter(m => m.status === 'Active');
  const note = `<div class="note b-grey">${ic('info')}<div class="small"><span class="tbd" title="${TBD_TIP}">Pending client: short-course module lists (P-34)</span> The module lists are prototype examples until the client supplies each course's list.</div></div>`;
  return note + `<section class="card"><div class="row-b"><h2>Modules</h2><button class="btn btn-sm btn-primary" data-act="chModAdd" data-c="${c.id}">${ic('plus', 14)}Add module</button></div>
    <p class="small muted">A short course is split into modules. Each module has its own content and its own quiz with its own questions; learners complete the course by passing every module quiz. There is no course-level quiz. Changes apply to new enrolments and new attempts only. Retired modules are kept in the record.</p></section>
    ${mods.map((m, k) => { const n = live.indexOf(m), qs = m.quiz.qs || [], aq = s1ActQs(m), dis = m.status === 'Retired' ? 'disabled title="Restore the module to change it"' : ''; return `<section class="card ch-cmod ${m.status === 'Retired' ? 'ch-retired' : ''}"><div class="row-b"><div class="stack" style="gap:2px"><span class="eyebrow">${m.status === 'Retired' ? 'Retired' : `Module ${n + 1} of ${live.length}`}</span><h3>${esc(m.title)}</h3></div>
      <div class="row" style="gap:4px"><button class="btn btn-sm" data-act="s1ModRename" data-c="${c.id}" data-m="${m.id}" ${dis}>Rename</button><button class="btn btn-sm" data-act="chModMove" data-c="${c.id}" data-m="${m.id}" data-d="-1" ${k === 0 ? 'disabled title="Already the first module"' : ''}>Move up</button><button class="btn btn-sm" data-act="chModMove" data-c="${c.id}" data-m="${m.id}" data-d="1" ${k === mods.length - 1 ? 'disabled title="Already the last module"' : ''}>Move down</button><button class="btn btn-sm" data-act="chModRetire" data-c="${c.id}" data-m="${m.id}" ${m.status === 'Active' && live.length < 2 ? 'disabled title="A course needs at least one module"' : ''}>${m.status === 'Retired' ? 'Restore' : 'Retire'}</button></div></div>
      <fieldset class="stack ch-items"><legend class="lbl">Content in this module</legend>${items.length ? items.map(it => `<label class="check small"><input type="checkbox" data-onchange="chModItem" data-c="${c.id}" data-m="${m.id}" data-i="${it.id}" ${m.items.includes(it.id) ? 'checked' : ''} ${dis}>${esc(it.title)}</label>`).join('') : '<p class="xs muted">No content yet — add items on the Content tab.</p>'}</fieldset>
      <h4 class="small">Module quiz — "What is this module about?"</h4><div class="form-grid">${[['q', 'Questions shown'], ['limit', 'Time limit (minutes)'], ['pass', 'Pass mark (%)'], ['max', 'Allowed attempts']].map(([f, l]) => `<div class="field"><label for="mq-${m.id}-${f}">${l}</label><input class="input num" type="number" id="mq-${m.id}-${f}" value="${m.quiz[f]}" data-onchange="chModQuiz" data-c="${c.id}" data-m="${m.id}" data-f="${f}" ${dis}></div>`).join('')}</div>
      <div class="row-b s1-qh"><h4 class="small">Questions (${aq.length} active)</h4><button class="btn btn-sm" data-act="s1QAdd" data-c="${c.id}" data-m="${m.id}" ${dis}>${ic('plus', 14)}Add question</button></div>
      ${qs.length ? `<ol class="small s1-qs">${qs.map(q => `<li class="${q.status === 'Retired' ? 'ch-retired' : ''}"><span>${esc(q.text)}</span><br><span class="muted">Correct: ${esc(q.opts[q.correct])}${q.status === 'Retired' ? ' · Retired' : ''}</span> <button class="linklike small" data-act="s1QEdit" data-c="${c.id}" data-m="${m.id}" data-q="${q.id}" ${q.status === 'Retired' ? 'disabled title="Restore the question to change it"' : ''}>Edit</button> · <button class="linklike small" data-act="s1QRetire" data-c="${c.id}" data-m="${m.id}" data-q="${q.id}">${q.status === 'Retired' ? 'Restore' : 'Retire'}</button></li>`).join('')}</ol>` : '<p class="xs muted">No questions yet.</p>'}</section>`; }).join('')}`;
};
const _modAddS1 = ACT.chModAdd;
ACT.chModAdd = el => { const c = s1Row(el.dataset.c), mods = s1Mods(c), n = mods.length; _modAddS1(el); const a = MODAL && MODAL.actions.find(x => /primary/.test(x.cls || '')); if (a) { const f = a.fn; a.fn = (...x) => { const r = f(...x); if (mods.length > n) { mods[mods.length - 1].quiz.qs = []; s1Keep(c); } return r; }; } };
ACT.s1ModRename = el => { const c = s1Row(el.dataset.c), m = s1Mods(c).find(x => x.id === el.dataset.m); openModal({ title: 'Rename module', sub: esc(c.title), body: `<div class="field"><label for="mr-t">Module title</label><input class="input" id="mr-t" value="${esc(m.title)}"></div>`, actions: [{ label: 'Cancel' }, { label: 'Rename', cls: 'btn-primary', fn: () => { const t = mval('#mr-t'); if (!t) return fieldErr('#mr-t', 'Enter a title'), false; if (t === m.title) return fieldErr('#mr-t', 'Nothing has changed'), false; const was = m.title; m.title = t; s1Log(c, 'Module renamed', was, t); render(); } }] }); };
function s1QDlg(c, m, q) {
  openModal({ title: q ? 'Edit question' : 'Add question', sub: `${esc(c.title)} · ${esc(m.title)}`, size: 'lg', body: `<div class="field"><label for="nq">Question</label><textarea class="textarea" id="nq">${esc(q ? q.text : '')}</textarea></div><fieldset class="stack" style="border:0;padding:0"><legend class="lbl">Options — select the correct answer</legend>${[0, 1, 2, 3].map(k => `<div class="row"><input type="radio" name="corr" value="${k}" aria-label="Option ${k + 1} is correct" ${(q ? q.correct : 0) === k ? 'checked' : ''}><label class="sr" for="nq-o${k}">Option ${k + 1}</label><input class="input" id="nq-o${k}" placeholder="Option ${k + 1}" value="${esc(q ? q.opts[k] : '')}"></div>`).join('')}</fieldset>`,
    actions: [{ label: 'Cancel' }, { label: q ? 'Save question' : 'Add question', cls: 'btn-primary', fn: () => { const t = mval('#nq'), o = [0, 1, 2, 3].map(k => mval('#nq-o' + k)), corr = +(($('input[name="corr"]:checked') || {}).value || 0); if (!t) return fieldErr('#nq', 'Enter the question'), false; const miss = o.findIndex(x => !x); if (miss >= 0) return fieldErr('#nq-o' + miss, 'Enter all four options'), false; if (new Set(o.map(x => x.toLowerCase())).size < 4) return fieldErr('#nq-o0', 'The four options must be different'), false;
      if (q) { const was = q.text; Object.assign(q, { text: t, opts: o, correct: corr }); s1Log(c, 'Quiz question changed', `${m.title}: ${was}`, t); } else { m.quiz.qs.push({ id: 'q' + (m.quiz.qs.length + 1), text: t, opts: o, correct: corr, status: 'Active' }); s1Log(c, 'Quiz question added', '—', `${m.title}: ${t}`); } s1Keep(c); render(); } }] });
}
ACT.s1QAdd = el => { const c = s1Row(el.dataset.c); s1QDlg(c, s1Mods(c).find(m => m.id === el.dataset.m), null); };
ACT.s1QEdit = el => { const c = s1Row(el.dataset.c), m = s1Mods(c).find(x => x.id === el.dataset.m); s1QDlg(c, m, m.quiz.qs.find(q => q.id === el.dataset.q)); };
ACT.s1QRetire = el => { const c = s1Row(el.dataset.c), m = s1Mods(c).find(x => x.id === el.dataset.m), q = m.quiz.qs.find(x => x.id === el.dataset.q), to = q.status === 'Retired' ? 'Active' : 'Retired';
  if (to === 'Retired' && s1ActQs(m).length <= 1) { toast('A module quiz needs at least one question.', 'err'); return; }
  q.status = to; if (to === 'Retired' && m.quiz.q > s1ActQs(m).length) m.quiz.q = s1ActQs(m).length; s1Log(c, to === 'Retired' ? 'Quiz question retired' : 'Quiz question restored', `${m.title}: ${q.text}`, to); render(); };
// Quiz settings: questions shown can't exceed the module's active questions
INP.chModQuiz = el => { const c = s1Row(el.dataset.c), m = s1Mods(c).find(x => x.id === el.dataset.m), f = el.dataset.f, v = +el.value, n = s1ActQs(m).length; const ok = { q: v >= 1 && v <= n, limit: v >= 1, pass: v >= 1 && v <= 100, max: v >= 1 }[f]; if (!ok) { fieldErr('#' + el.id, f === 'q' ? `Between 1 and ${n} (this module's active questions)` : f === 'pass' ? 'Between 1 and 100' : 'At least 1'); return; } const old = m.quiz[f]; m.quiz[f] = v; s1Keep(c); logA('Short Courses', `${c.title} · ${m.title}`, 'Module quiz setting changed', `${f} ${old}`, `${f} ${v}`, 'Modules tab'); };

/* ---------- New course, publish, retire, un-retire (S1-07) ---------- */
ACT.newCourse = () => { let n = 1; while (ADMIN.courses.some(c => c.id === 'SC-' + String(12 + n).padStart(2, '0'))) n++; const id = 'SC-' + String(12 + n).padStart(2, '0'); const c = s1Keep({ id, title: 'Untitled course', cat: 'Health and safety', status: 'Draft', gbp: 0, validity: '12 months', access: 90, enrol: 0, comp: 0, version: 1 }); ADMIN.courses.push(c); STORE.chCourseMods = STORE.chCourseMods || {}; STORE.chCourseMods[id] = []; (STORE.sSpec = STORE.sSpec || {})[id] = { desc: '', dur: '', topic: '', fields: [], items: [], rules: { docs: true, video: true, scorm: false, quiz: true }, cert: { layout: S1_LAYOUTS[0], fields: S1_CERT_FIELDS.slice(), logo: '' }, remind: '30, 15, 7' }; s1Log(c, 'Course created (Draft)', '—', 'Draft'); go('a-courses', { id }); };
function s1Missing(c) {
  const sp = s1Spec(c), mods = s1Mods(c).filter(m => m.status === 'Active'), out = [];
  if (!c.title || c.title === 'Untitled course') out.push('Give the course a title (Details)');
  if (!(c.gbp > 0)) out.push('Set a price in GBP (Details — Super Admin or System Admin)');
  if (!mods.length) out.push('Add at least one module (Modules)');
  if (!sp.items.some(i => i.status === 'Active')) out.push('Add content (Content)');
  mods.filter(m => !m.items.length).forEach(m => out.push(`Module "${m.title}" has no content`));
  mods.filter(m => !s1ActQs(m).length).forEach(m => out.push(`Module "${m.title}" has no quiz questions`));
  return out;
}
ACT.pubCourse = el => {
  const c = s1Row(el.dataset.id); if (!c || c.status !== 'Draft') return;
  const miss = s1Missing(c);
  if (miss.length) { s1Log(c, 'Blocked: publish (items missing)', 'Draft', 'Draft', miss.join('; ')); openModal({ title: 'Can\'t publish yet', body: `<div class="note b-red">${ic('alert')}<div><strong>Fix these before publishing:</strong><ul class="small">${miss.map(m => `<li>${esc(m)}</li>`).join('')}</ul></div></div>`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); return; }
  reasonDlg({ title: 'Publish ' + esc(c.title), ok: 'Publish', body: `<p class="small">The course appears in Browse Courses at ${money(c.gbp, 'GBP')} and can be bought.</p>`, onOk: r => { c.status = 'Published'; s1Keep(c); s1Log(c, 'Published', 'Draft', 'Published', r); s1Sync(); render(); toast('Published — the course is now in Browse Courses.'); } });
};
ACT.retireCourse = el => { const c = s1Row(el.dataset.id); reasonDlg({ title: 'Retire course', ok: 'Retire', body: '<p class="small">It leaves Browse Courses. Existing enrolments and certificates stay valid.</p>', onOk: r => { c.status = 'Retired'; s1Keep(c); s1Log(c, 'Retired', 'Published', 'Retired', r); s1Sync(); render(); toast('Retired — removed from Browse Courses.'); } }); };
ACT.s1Unretire = el => { const c = s1Row(el.dataset.id); if (!c || c.status !== 'Retired') return; reasonDlg({ title: 'Un-retire ' + esc(c.title), ok: 'Un-retire', body: '<p class="small">The course is published again and goes back into Browse Courses.</p>', onOk: r => { c.status = 'Published'; s1Keep(c); s1Log(c, 'Un-retired', 'Retired', 'Published', r); s1Sync(); render(); toast('Un-retired — back in Browse Courses.'); } }); };

/* ---------- Learner 360: answers to the course's custom fields ---------- */
const _aLS1 = SCREENS['a-learner'];
SCREENS['a-learner'] = p => {
  const h = _aLS1(p); if (!p || p.tab !== 'enrolments') return h;
  const w = Object.values(STORE.worlds || {}).find(x => x.me && x.me.id === p.id), es = w ? w.enrolments.filter(e => e.fields && e.fields.length) : [];
  if (!es.length) return h;
  return h + `<section class="card s1-ans"><h2>Enrolment details from the learner</h2>${es.map(e => `<h3 class="small">${esc(e.title)}</h3><dl class="kv">${e.fields.map(([l, v]) => `<dt>${esc(l)}</dt><dd>${esc(v || '—')}</dd>`).join('')}</dl>`).join('')}</section>`;
};

/* ---------- Demo Scenario #26 "Create and sell a short course" ---------- */
const S1_DEMO = 'SC-26';
function s1DemoCourse() {
  let c = s1Row(S1_DEMO); if (c) return c;
  STORE.sSpec = STORE.sSpec || {}; STORE.chCourseMods = STORE.chCourseMods || {};
  c = s1Keep({ id: S1_DEMO, title: 'Safeguarding Adults Awareness', cat: 'Safeguarding', status: 'Draft', gbp: 32, validity: '24 months', access: 60, enrol: 0, comp: 0, version: 1 }); ADMIN.courses.push(c);
  STORE.sSpec[S1_DEMO] = { desc: 'Recognising abuse and neglect, and what to do about it.', dur: '2 hours', topic: '', fields: [{ id: 'f1', label: 'Employer name', type: 'text', req: true, status: 'Active' }], rules: { docs: true, video: true, scorm: false, quiz: true }, cert: { layout: 'Portrait — minimal', fields: ['Learner name', 'Course', 'Issue date', 'Expiry', 'Certificate number', 'QR code'], logo: '' }, remind: '30, 7',
    items: [{ id: 'c1', kind: 'doc', title: 'What safeguarding means', src: 'safeguarding-guide.pdf', dur: '6 pages', state: 'Not opened', dl: true, watch: 0, resume: '0:00', score: 0, status: 'Active' }, { id: 'c2', kind: 'video', title: 'Spotting the signs of abuse', src: '824804225', dur: '08:40', state: 'Not opened', dl: false, watch: 0, resume: '0:00', score: 0, status: 'Active' }, { id: 'c3', kind: 'link', title: 'Care Act 2014 — statutory guidance', src: 'https://www.gov.uk/government/publications/care-act-statutory-guidance', dur: '', state: 'Not opened', dl: false, watch: 0, resume: '0:00', score: 0, status: 'Active' }] };
  const q = (t, o, k) => ({ text: t, opts: o, correct: k, status: 'Active' });
  STORE.chCourseMods[S1_DEMO] = [{ id: 'm1', title: 'What safeguarding means', items: ['c1'], status: 'Active', quiz: { q: 2, limit: 10, pass: 50, max: 3, qs: [q('Who is responsible for safeguarding?', ['Everyone', 'Only managers', 'Only the police', 'Only social workers'], 0), q('What should you do first if you suspect abuse?', ['Ignore it', 'Report it following your policy', 'Confront the person', 'Post about it'], 1)].map((x, i) => ({ id: 'q' + (i + 1), ...x })) } },
    { id: 'm2', title: 'Signs of abuse and the law', items: ['c2', 'c3'], status: 'Active', quiz: { q: 2, limit: 10, pass: 50, max: 3, qs: [q('Which is a possible sign of neglect?', ['Clean clothes', 'Weight loss and poor hygiene', 'Regular visitors', 'Good appetite'], 1), q('Which law sets out adult safeguarding duties in England?', ['Care Act 2014', 'Road Traffic Act', 'Data Protection Act only', 'None'], 0)].map((x, i) => ({ id: 'q' + (i + 1), ...x })) } }];
  s1Log(c, 'Course created (Draft) — demo', '—', 'Draft'); return c;
}
const s1AsSA = () => { setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; };
ACT.s1Sc26Start = () => { s1AsSA(); go('a-courses'); ACT.newCourse(); toast('A new Draft course. Fill in the details and price — or use the next steps to add the demo course.', 'info'); };
const s1Sc = tab => () => { s1AsSA(); const c = s1DemoCourse(); go('a-courses', { id: c.id, tab }); };
ACT.s1Sc26Details = s1Sc('details'); ACT.s1Sc26Content = s1Sc('content'); ACT.s1Sc26Quiz = s1Sc('modules'); ACT.s1Sc26Cert = s1Sc('certificate');
ACT.s1Sc26Publish = () => { s1AsSA(); const c = s1DemoCourse(); go('a-courses', { id: c.id, tab: 'details' }); if (c.status === 'Draft') ACT.pubCourse({ dataset: { id: c.id } }); };
ACT.s1Sc26Buy = () => { const c = s1DemoCourse(); if (c.status !== 'Published') { c.status = 'Published'; s1Log(c, 'Published (demo)', 'Draft', 'Published'); } s1Sync(); S.variant = 'A'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('browse'); toast('Viewing as Daniel Okafor — buy Safeguarding Adults Awareness.', 'info'); };
ACT.s1Sc26Learn = () => { S.variant = 'A'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; const e = W.enrolments.find(x => x.courseId === S1_DEMO); if (!e) { ACT.s1Sc26Buy(); return; } e.content.forEach(x => { x.state = 'Completed'; x.watch = 100; }); recalcShort(e); go('course', { id: e.id, tab: 'quiz' }); toast('Demo: content completed — take the two module quizzes.', 'info'); };
ACT.s1Sc26Cert = () => { S.variant = 'A'; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; go('certificates'); };
const _scListS1 = SC_LIST;
SC_LIST = function () {
  const x = (text, r, t, act) => ({ text, r, t, act });
  return _scListS1().concat([['26', 'Create and sell a short course', 'Setup S1', [
    x('The Super Admin chooses "New course" in Short Courses.', 'admin', 'a-courses', 's1Sc26Start'),
    x('Details and price: title, description, category, duration, access period, price (GBP) and a custom field ("Employer name").', 'admin', 'a-courses.SC-01.details', 's1Sc26Details'),
    x('Content: add a document, a Vimeo video and a link, each in one of two modules.', 'admin', 'a-courses.SC-01.content', 's1Sc26Content'),
    x('Quiz questions: each module quiz gets its own questions, pass mark, time and attempts.', 'admin', 'a-courses.SC-01.modules', 's1Sc26Quiz'),
    x('Certificate and validity: template fields and layout; validity and reminders.', 'admin', 'a-courses.SC-01.certificate', 's1Sc26Cert'),
    x('Publish: the checks pass and the course goes into Browse Courses.', '', '', 's1Sc26Publish'),
    x('A learner buys it: "About you for this course", then checkout.', 'learner:A', 'browse', 's1Sc26Buy'),
    x('The learner completes the content and passes the module quizzes (the course\'s own questions and pass mark).', '', '', 's1Sc26Learn'),
    x('The certificate is issued with the course\'s validity and template.', 'learner:A', 'certificates', 's1Sc26Cert')]]]);
};
CDL_SCEN.push(['26', 'Create and sell a short course', 'Setup fixes (S1)']);
['Twenty-six'].forEach(w => { if (!CH_NUMW.includes(w)) CH_NUMW.push(w); });

/* ---------- Records ---------- */
UXC.push(['Setup S1', 'Setup fixes — short courses end to end (S1-01 … S1-08)', [
  'S1-01: Short Courses → course → Details saves the title, description, category, duration and access period (and the price, Super Admin / System Admin only); they show in the list, Browse Courses and new enrolments. Each Save is a new version.',
  'S1-02: "Add field" adds a real enrolment field (label, type, required) that can be edited and retired. A course with fields asks "About you for this course" before checkout; the answers are kept on the enrolment and shown on the learner\'s record (Learner 360 → Enrolments). Courses without fields go straight to checkout.',
  'S1-03: Content → "Add item" (Document, Vimeo video, SCORM 1.2 / 2004 or Link; title; file, Vimeo ID or web address; module). Items can be edited, reordered and retired. Each course has its own content; the old shared list is now only the seeded content.',
  'S1-04 / S1-05: modules can be renamed. Each module quiz has its own questions (add, edit, retire; multiple choice, 4 options, one correct), seeded from the old shared bank. Questions shown, time, pass mark and attempts are used by the learner\'s quiz.',
  'S1-06: Completion rules, Certificate template (layout, fields, logo) and Validity & reminders save and are used for that course\'s completion, certificate expiry, certificate layout and reminder dots.',
  'S1-07: Publish checks the course (title, price, a module, content, quiz questions) — the "Mark as fixed (prototype)" workaround is gone. Browse Courses lists the published courses from Short Courses (one source): Mental Capacity Act and DoLS, End of Life Care and Food Hygiene Level 2 joined the admin list, Oral Health in Care Homes is Published, and Basic Life Support, Infection Prevention, Fire Safety, Medication Awareness, Dementia Awareness and the Care Certificate now appear in Browse at their admin prices. Retire removes a course from Browse; "Un-retire" (with a reason) brings it back.',
  'S1-08: Demo Scenario #26 "Create and sell a short course".']]);
const _aIdxS1 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxS1(p) + `<section class="card idx-sec"><h2>Setup fixes</h2><ul class="idx-list">${[
  chIdxLi('Short course → Content (add items)', { act: 'aJump', t: 'a-courses.SC-01.content' }, 'S1-03 — add documents, Vimeo videos, SCORM packages and links to a module.'),
  chIdxLi('Short course → Modules (questions per module)', { act: 'aJump', t: 'a-courses.SC-01.modules' }, 'S1-05 — each module quiz has its own questions and settings.'),
  chIdxLi('Short course → Validity and reminders', { act: 'aJump', t: 'a-courses.SC-01.validity' }, 'S1-06 — certificate validity and reminder offsets used at completion.')].join('')}</ul></section>`;

if (typeof ADMIN !== 'undefined' && ADMIN && STORE.worlds) { s1SeedRows(); s1Sync(); }
