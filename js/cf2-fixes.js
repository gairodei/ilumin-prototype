/* ============================================================
   Client Feedback 2.0 — approved fixes (15 Nov 2026; PD-CF2-* in PROVISIONAL-DECISIONS.md). Loads after n5-overdue.js.
   A1 (Assessor Portfolio) is corrected in staff.js itself (t-portfolio reads co1Rec; no hashed states or invented verifiers).
   A2  Document requirements: the programme's own versioned checklist (S4a, S4().lists) is the one source.
       - Agency NVQ seats: the admission application copies the programme's active checklist for the applicant's region with each
         item's own mandatory flag, formats, maximum size, guidance and expiry, and records the checklist version (as a direct
         sign-up does with signup.checklistV). Was: the legacy global list (empty in the client demo) or six hard-coded documents,
         every one forced mandatory. A programme with no active items keeps the old fallback, unchanged.
       - Short courses: an optional "Admission documents" list per course (default: none), edited with the S4a checklist fields and
         validation. Learners see it on the course details page before buying; a purchase copies the list (with its version) onto the
         enrolment, and the learner uploads from the course page. Uploading never gates access: purchase and access are unchanged.
   A3  Bundle validity: a whole number of days, 1 or more (365, 600, 730, 1095…). Zero, negative, decimal, non-numeric or empty input
       is refused with a message, never replaced by 365, and a stored invalid validity can't be published. Pricing is unchanged.
   F1  Bulk CSV: the disabled "Bulk CSV (not available)" roster button and the "Bulk (CSV) — not available" intake option are no longer
       shown (client request). The refusals behind them stay, and the learner-account import (Learners → Bulk import) is unchanged.
   E1  Observation Criteria: one menu entry, two tabs — Criteria Library (k-ocl, unchanged) and Legacy Criteria (k-obslib). The legacy
       list is read-only in normal operation; its existing maintenance actions stay available to the Super Administrator only, behind
       "Historical corrections", for versions configured before OBS-1 that still read it. No data is migrated, merged or renumbered.
   ============================================================ */
'use strict';

const CF2 = () => (STORE.cf2 = STORE.cf2 || { scDocs: {}, sched: null, asgDisp: {}, obsFb: {}, obsDraftLog: {} });
const _isCF2 = initStore; initStore = function () { STORE.cf2 = null; return _isCF2.apply(this, arguments); };
const cf2Me = () => (S.portal === 'admin' && ADMIN && ADMIN.me ? ADMIN.me.name : S.portal === 'staff' && typeof TME === 'function' ? TME().name : S.portal === 'coord' && typeof CME === 'function' ? CME().name : '—');
const cf2Admin = () => S.portal === 'admin' && (isSA() || (typeof isAca === 'function' && isAca()) || (typeof isSys === 'function' && isSys()));

/* ---------- A2. Agency NVQ admission: the programme's own checklist ---------- */
// The application's documents for a programme title and applicant country; null when the programme has no active checklist items
function cf2DocsForApp(title, country) {
  const pid = typeof s4PidOfTitle === 'function' ? s4PidOfTitle(title) : null; if (!pid) return null;
  const L = s4List(pid), items = s4ItemsFor(pid, country); if (!items.length) return null;
  return { pid, v: L.v, region: regionOf(country), docs: s4DocsFor(pid, country).map((d, k) => ({ ...d, id: 'sd' + k, file: null, uploaded: null, expires: null })) };
}
const _ag1NvqAppCF2 = ag1NvqApp;
ag1NvqApp = function (a, L, b, seeded) {
  const old = (ADMIN.apps || []).find(x => x.agySeat === a.id); if (old) return _ag1NvqAppCF2.apply(this, arguments);
  const ap = _ag1NvqAppCF2.apply(this, arguments); if (!ap || ap.cf2Ck) return ap;
  const country = (L && L.country) || (L && typeof agyWorldKey === 'function' && agyWorldKey(L) && STORE.worlds[agyWorldKey(L)] ? STORE.worlds[agyWorldKey(L)].me.country : null) || 'United Kingdom';
  const c = cf2DocsForApp(ap.programme, country); if (!c) return ap; // no programme checklist: the earlier fallback is kept
  ap.docs = c.docs; ap.docsAll = c.docs.length; ap.docsOk = 0; ap.cf2Ck = { pid: c.pid, v: c.v, region: c.region, country };
  return ap;
};
// The application page says which checklist version it holds (as a direct sign-up's does)
const _apScrCF2 = SCREENS['a-admissions'];
SCREENS['a-admissions'] = p => {
  const h = _apScrCF2(p), ap = p && p.id && (ADMIN.apps || []).find(x => x.id === p.id && x.cf2Ck); if (!ap || typeof h !== 'string') return h;
  const pr = s3Pr(ap.cf2Ck.pid), note = `<div class="note b-blue cf2-appck">${ic('info')}<div class="small">Documents from the programme's own checklist${pr ? ' (' + esc(pr.title) + ')' : ''}, version ${ap.cf2Ck.v} — ${esc(ap.cf2Ck.region)} items. Mandatory and optional as configured there: ${ap.docs.filter(d => d.mand).length} mandatory, ${ap.docs.filter(d => !d.mand).length} optional.</div></div>`;
  const i = h.indexOf('<section'); return i >= 0 ? h.slice(0, i) + note + h.slice(i) : note + h;
};

/* ---------- A2. Short courses: optional admission documents ---------- */
const cf2ScKey = id => 'SC:' + id;
// The course's list (kept in the same checklist store as the programmes, under its own key); default: no items
function cf2ScList(id) { const S_ = S4(); return S_.lists[cf2ScKey(id)] || (S_.lists[cf2ScKey(id)] = { v: 1, items: [], sc: id }); }
const cf2ScActive = id => cf2ScList(id).items.filter(i => i.status === 'Active');
const cf2ScCan = () => cf2Admin();
function cf2ScCard(c) {
  const L = cf2ScList(c.id), can = cf2ScCan(), a = (act, i) => `data-act="${act}" data-id="${c.id}" data-i="${i}"`;
  const rows = L.items.map((r, k) => `<tr class="${r.status === 'Retired' ? 'muted' : ''}" data-ck="${esc(r.name)}"><td>${esc(r.name)}</td><td>${r.mand ? 'Mandatory' : 'Optional'}</td><td class="small">${esc(r.formats)}</td><td>${esc(r.max)}</td><td>${r.expiry ? 'Yes' : 'No'}</td><td class="small">${esc(r.guide || '—')}</td><td>${chip(r.status, r.status === 'Active' ? 'green' : 'grey')}</td><td class="nowrap">${can ? (r.status === 'Active' ? `<button class="btn btn-sm" ${a('cf2ScEdit', k)}>Edit</button> <button class="btn btn-sm" ${a('cf2ScRetire', k)}>Retire</button>` : `<button class="btn btn-sm" ${a('cf2ScRestore', k)}>Restore</button>`) : ''}</td></tr>`).join('');
  const subs = cf2ScSubs(c.id);
  return `<section class="card cf2-scdocs"><div class="row-b"><h2>Admission documents (optional)</h2>${can ? `<button class="btn btn-sm btn-primary" data-act="cf2ScAdd" data-id="${c.id}">${ic('plus', 14)}Add document</button>` : `<span class="xs muted">${ic('lock', 12)} Read-only for you</span>`}</div>
    <p class="small muted">Version ${L.v}. By default a short course asks for no documents. Documents added here are shown to learners on the course details page before they buy, and requested on their course page after purchase. They never delay access: the course opens as soon as payment is confirmed. Changes apply to new purchases only.</p>
    ${L.items.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Document</th><th>Mandatory</th><th>Formats</th><th>Max size</th><th>Has expiry</th><th>Guidance</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="small cf2-scnone">No documents required for this course.</p>'}</section>
    <section class="card cf2-scsubs"><h3>Learners' documents</h3>${subs.length ? `<ul class="list small">${subs.map(([w, e, d]) => `<li class="li"><div class="li-b"><strong>${esc(chFullName(w))}</strong><span class="xs muted">${esc(e.title)} · ${esc(d.name)} (${d.mand ? 'mandatory' : 'optional'}) · checklist version ${e.cf2Docs.v}</span></div>${d.file ? chip('Uploaded ' + fd(d.uploaded), 'blue') : chip('Not uploaded', 'grey')}</li>`).join('')}</ul>` : '<p class="small muted">No learner has been asked for documents on this course yet.</p>'}<p class="xs muted">Read-only. Uploads are simulated in the prototype (the file name and size are recorded; no file is stored).</p></section>`;
}
const cf2ScSubs = id => { const out = []; Object.values(STORE.worlds || {}).forEach(w => (w && w.enrolments || []).forEach(e => { if (e.kind === 'short' && e.cf2Docs && e.cf2Docs.sc === id) e.cf2Docs.items.forEach(d => out.push([w, e, d])); })); return out; };
const cf2ScRow = id => (typeof s1Row === 'function' ? s1Row(id) : null);
const cf2ScGuard = c => { if (!c) { toast('Course not found.', 'err'); return false; } if (!cf2ScCan()) { logA('Short Courses', `${c.title} (${c.id})`, 'Blocked: change admission documents', '—', '—', 'Role can\'t change a course\'s admission documents'); toast('You can\'t change this course\'s admission documents.', 'err'); return false; } return true; };
function cf2ScChanged(c, action, before, after, r) { const L = cf2ScList(c.id); L.v++; logA('Short Courses', `${c.title} (${c.id}) — admission documents`, action, before, after, r || ''); }
// The S4a checklist dialog fields and validation, reused (the region choice doesn't apply to short courses)
const cf2ScFields = r => s4CkFields(r).replace(/<div class="field"><label for="ck-a">Applies to<\/label><select class="select" id="ck-a">[\s\S]*?<\/select><\/div>/, '<input type="hidden" id="ck-a" value="All">');
ACT.cf2ScAdd = el => { const c = cf2ScRow(el.dataset.id); if (!cf2ScGuard(c)) return; cf2ScList(c.id);
  reasonDlg({ title: 'Add admission document — ' + esc(c.title), ok: 'Add document', label: 'Reason (required)', extra: cf2ScFields(null), onOk: r => { const f = s4CkRead(cf2ScKey(c.id), null); if (!f) return false; const L = cf2ScList(c.id); L.items.push({ id: 'sck' + (L.items.length + 1), ...f, applies: 'All', status: 'Active' }); cf2ScChanged(c, 'Admission document added', '—', s4CkTxt(f), r); render(); toast(`Added — version ${L.v}, for new purchases.`); } }); };
ACT.cf2ScEdit = el => { const c = cf2ScRow(el.dataset.id); if (!cf2ScGuard(c)) return; const it = cf2ScList(c.id).items[+el.dataset.i]; if (!it) return;
  reasonDlg({ title: 'Edit admission document', ok: 'Save', label: 'Reason (required)', extra: cf2ScFields(it), onOk: r => { const f = s4CkRead(cf2ScKey(c.id), it); if (!f) return false; const was = s4CkTxt(it); if (was === s4CkTxt({ ...f, applies: 'All' }) && f.guide === it.guide) { fieldErr('#ck-n', 'Nothing has changed'); return false; } Object.assign(it, f, { applies: 'All' }); cf2ScChanged(c, 'Admission document changed', was, s4CkTxt(it), r); render(); toast('Saved — new purchases get the change.'); } }); };
ACT.cf2ScRetire = el => { const c = cf2ScRow(el.dataset.id); if (!cf2ScGuard(c)) return; const it = cf2ScList(c.id).items[+el.dataset.i]; if (!it) return;
  reasonDlg({ title: 'Retire ' + esc(it.name), ok: 'Retire', danger: true, body: '<p class="small">New purchases won\'t be asked for it. Learners who already bought the course keep their list and uploads.</p>', onOk: r => { it.status = 'Retired'; cf2ScChanged(c, 'Admission document retired', it.name, 'Retired', r); render(); } }); };
ACT.cf2ScRestore = el => { const c = cf2ScRow(el.dataset.id); if (!cf2ScGuard(c)) return; const it = cf2ScList(c.id).items[+el.dataset.i]; if (!it) return;
  reasonDlg({ title: 'Restore ' + esc(it.name), ok: 'Restore', onOk: r => { it.status = 'Active'; cf2ScChanged(c, 'Admission document restored', 'Retired', it.name, r); render(); } }); };
// The course editor: an "Admission documents" tab next to the others
const _ceCF2 = courseEditor;
courseEditor = function (id, t) {
  const c = cf2ScRow(id); if (!c) return _ceCF2.apply(this, arguments);
  const docs = t === 'docs', h = _ceCF2.call(this, id, docs ? 'details' : t); if (typeof h !== 'string') return h;
  const pub = 'data-tab="publish">Price &amp; publish</button>', k = h.indexOf(pub); if (k < 0) return h;
  const btn = `<button class="tab cf2-sctab" role="tab" aria-selected="${docs}" data-go="a-courses" data-id="${c.id}" data-tab="docs">Admission documents</button>`;
  const bStart = h.lastIndexOf('<button', k), end = h.indexOf('</div>', k) + 6, tabsStart = h.lastIndexOf('<div class="subtabs"', bStart); if (tabsStart < 0) return h;
  let bar = h.slice(tabsStart, bStart); if (docs) bar = bar.replace(/aria-selected="true"/g, 'aria-selected="false"');
  return h.slice(0, tabsStart) + bar + btn + h.slice(bStart, end) + (docs ? cf2ScCard(c) : h.slice(end));
};
// Before buying: the course details page lists the documents the Academy will ask for
const _ciCF2 = SCREENS['course-info'];
SCREENS['course-info'] = p => {
  const h = _ciCF2(p), c = p && typeof n1bCat === 'function' ? n1bCat(p.id) : null, row = c && cf2ScRow(c.course || c.id); if (!row || typeof h !== 'string') return h;
  const its = cf2ScActive(row.id); if (!its.length) return h;
  const card = `<section class="card cf2-scinfo"><h2>Documents the Academy will ask for</h2><p class="small muted">After you buy, you'll be asked to upload these on your course page. Your access starts as soon as your payment is confirmed — it doesn't wait for the documents.</p><ul class="list small">${its.map(i => `<li class="li"><div class="li-b"><strong>${esc(i.name)}</strong><span class="xs muted">${i.mand ? 'Mandatory' : 'Optional'} · ${esc(i.formats)} · up to ${esc(i.max)}${i.expiry ? ' · must not be expired' : ''}</span>${i.guide ? `<span class="xs">${esc(i.guide)}</span>` : ''}</div></li>`).join('')}</ul></section>`;
  const k = h.lastIndexOf('<div class="row n1b-buy">'); return k >= 0 ? h.slice(0, k) + card + h.slice(k) : h + card;
};
// The purchase copies the course's list (with its version) onto the enrolment; later changes don't reach it
function cf2ScSnap(e, row) {
  if (!e || e.kind !== 'short' || e.cf2Docs || !row) return; const its = cf2ScActive(row.id); if (!its.length) return;
  e.cf2Docs = { sc: row.id, v: cf2ScList(row.id).v, at: now().toISOString(), items: its.map((i, k) => ({ id: 'scd' + (k + 1), name: i.name, mand: i.mand, formats: i.formats, max: i.max, expiry: !!i.expiry, guide: i.guide || '', file: null, uploaded: null, versions: [] })) };
}
const _enrolCF2 = s1Enrol;
s1Enrol = function (c, row) { const n0 = W.enrolments.length, r = _enrolCF2.apply(this, arguments); if (W.enrolments.length > n0) cf2ScSnap(W.enrolments[0], row); return r; };
if (typeof ag1ShortEnrol === 'function') { const _agShCF2 = ag1ShortEnrol; ag1ShortEnrol = function (k, a, b) { const e = _agShCF2.apply(this, arguments); if (e && e.courseId) cf2ScSnap(e, cf2ScRow(e.courseId)); return e; }; }
// The learner's course page: the requested documents, with simulated uploads (format and size checked); never a gate
const cf2Ext = n => { const m = /\.([a-z0-9]+)$/i.exec(n || ''); const x = m ? m[1].toUpperCase() : ''; return x === 'JPEG' ? 'JPG' : x; };
function cf2ScLearnerCard(e) {
  const d = e.cf2Docs; if (!d) return '';
  return `<section class="card cf2-scup"><h2>Documents requested by the Academy</h2><p class="small muted">Your course is open — these don't change your access. Mandatory documents are needed for the Academy's records.</p><ul class="list">${d.items.map(i => `<li class="li" data-d="${i.id}"><div class="li-b"><strong>${esc(i.name)}</strong> <span class="xs muted">${i.mand ? 'Mandatory' : 'Optional'} · ${esc(i.formats)} · up to ${esc(i.max)}${i.expiry ? ' · must not be expired' : ''}</span>${i.guide ? `<span class="xs">${esc(i.guide)}</span>` : ''}${i.file ? `<span class="small">${ic('clip', 13)} ${esc(i.file)} — uploaded ${fdt(i.uploaded)}${i.versions.length > 1 ? ` (${i.versions.length} versions kept)` : ''}</span>` : ''}</div><label class="btn btn-sm" for="cf2-up-${i.id}">${i.file ? 'Replace' : 'Upload'}</label><input class="sr" type="file" id="cf2-up-${i.id}" data-onchange="cf2ScUp" data-e="${esc(e.id)}" data-d="${i.id}"></li>`).join('')}</ul><p class="xs muted">Prototype: uploads are simulated — the file name and size are recorded; no file is stored.</p></section>`;
}
INP.cf2ScUp = el => {
  const e = typeof enrolById === 'function' ? enrolById(el.dataset.e) : null, i = e && e.cf2Docs && e.cf2Docs.items.find(x => x.id === el.dataset.d), f = el.files && el.files[0];
  if (S.portal !== 'learner' || !i || !f) return;
  const ext = cf2Ext(f.name), ok = (i.formats.toUpperCase().match(/PDF|JPG|PNG|DOCX/g) || []), mb = parseFloat(i.max) || 5;
  if (!ok.includes(ext)) { toast(`${f.name}: ${i.name} accepts ${i.formats} only.`, 'err'); el.value = ''; return; }
  if ((f.size || 0) > mb * 1048576) { toast(`${f.name} is larger than ${i.max}.`, 'err'); el.value = ''; return; }
  const at = now().toISOString(); i.versions.push({ name: f.name, size: f.size || 0, at }); i.file = f.name; i.uploaded = at;
  logA('Short Courses', `${chFullName(W)} (${W.me.id}) · ${e.title}`, 'Admission document uploaded', '—', `${i.name}: ${f.name}`, `Checklist version ${e.cf2Docs.v}`); render(); toast(`${i.name} uploaded.`);
};
const _courseCF2 = SCREENS.course;
SCREENS.course = p => { const h = _courseCF2(p), e = p && typeof enrolById === 'function' ? enrolById(p.id) : null; if (!e || e.kind !== 'short' || !e.cf2Docs || typeof h !== 'string' || /lockpage/.test(h)) return h; return h + cf2ScLearnerCard(e); };

/* ---------- A3. Bundle validity: whole days, 1 or more; never replaced by 365 ---------- */
const CF2_VAL_MSG = 'Validity: enter a whole number of days, 1 or more (for example 365, 600, 730 or 1095).';
const cf2DaysOk = v => /^\d+$/.test(String(v == null ? '' : v).trim()) && +String(v).trim() >= 1;
const _bpReadCF2 = bpRead;
bpRead = function (st) {
  const raw = $('#bp-v') ? mval('#bp-v') : null, keep = st && st.d ? st.d.days : undefined, d = _bpReadCF2.apply(this, arguments);
  if (raw != null && st && st.d) { st.d._vin = raw; st.d.days = cf2DaysOk(raw) ? +String(raw).trim() : keep; }
  return d;
};
const _whyCF2 = sibBpWhy;
sibBpWhy = function (d) {
  if (d && d._vin != null && !cf2DaysOk(d._vin)) return { f: '#bp-v', msg: CF2_VAL_MSG };
  if (d && d._vin == null && d.days != null && !cf2DaysOk(d.days)) return { f: '#bp-v', msg: CF2_VAL_MSG };
  return _whyCF2.apply(this, arguments);
};
const _bpOutCF2 = bpOut;
bpOut = function (d) { const h = _bpOutCF2.apply(this, arguments); return d && d._vin != null && !cf2DaysOk(d._vin) && typeof h === 'string' ? h.replace('<strong>Price not worked out.</strong>', '<strong>Bundle not saved.</strong>') : h; };
// The stored bundle: a saved bundle never keeps the raw input
const _saveCF2 = saveProduct;
saveProduct = function (st, how) { const r = _saveCF2.apply(this, arguments); (STORE.biz.products || []).forEach(p => { delete p._vin; }); return r; };
const _pubCF2 = ACT.bPublish;
ACT.bPublish = el => {
  const p = STORE.biz.products.find(x => x.id === (el && el.dataset && el.dataset.id));
  if (p && !cf2DaysOk(p.days)) { logA('Bundles & Licences', `${p.id} · ${p.name}`, 'Blocked: publish bundle (invalid validity)', p.status, '—', `Validity ${p.days} days`); toast('This bundle can\'t be published: ' + CF2_VAL_MSG + ' Edit the bundle first.', 'err'); return false; }
  return _pubCF2(el);
};
// The field itself says what it accepts
const _omCF2 = openModal;
openModal = function (o) {
  if (o && /^(Create bundle|Edit bundle)/.test(o.title || '') && typeof o.body === 'string') o = { ...o, body: o.body.replace(/<input class="input num" type="number" id="bp-v" value="([^"]*)">/, '<input class="input num" type="number" min="1" step="1" id="bp-v" value="$1" data-oninput="bpCalc"><span class="hint">Whole days, 1 or more. Price is set separately.</span>') };
  return _omCF2.apply(this, [o].concat([].slice.call(arguments, 1)));
};

/* ---------- F1. Bulk CSV: not shown ---------- */
const _aBatchCF2 = SCREENS['a-batches'];
SCREENS['a-batches'] = p => { const h = _aBatchCF2(p); return typeof h === 'string' ? h.replace(/<button class="btn btn-sm" data-act="s5cBatchCsv"[^>]*>Bulk CSV \(not available\)<\/button>/g, '') : h; };
const _omF1 = openModal;
openModal = function (o) {
  if (o && o.title === 'Create batch — step 4 of 5' && typeof o.body === 'string') o = { ...o, body: o.body.replace(/<label class="check"><input type="radio" name="nb-in" value="Bulk \(CSV\)"[^>]*>[\s\S]*?<\/label>/, '') };
  return _omF1.apply(this, [o].concat([].slice.call(arguments, 1)));
};

/* ---------- E1. Observation Criteria: one menu entry, two tabs ---------- */
[typeof KNAV !== 'undefined' ? KNAV : null, typeof ANAV !== 'undefined' ? ANAV : null].forEach(N => {
  if (!Array.isArray(N)) return; N.forEach(g => { const i = g[1].findIndex(y => y[0] === 'k-ocl'); if (i >= 0) g[1][i] = ['k-ocl', 'Observation Criteria', g[1][i][2]]; const j = g[1].findIndex(y => y[0] === 'k-obslib'); if (j >= 0 && i >= 0) g[1].splice(j, 1); });
});
const cf2CritTabs = cur => `<div class="subtabs cf2-octabs" role="tablist" aria-label="Observation Criteria"><button class="tab" role="tab" aria-selected="${cur === 'lib'}" data-go="k-ocl">Criteria Library</button><button class="tab" role="tab" aria-selected="${cur === 'legacy'}" data-go="k-obslib">Legacy Criteria</button></div>`;
const cf2AfterHead = (h, x) => { const k = h.indexOf('</div>', h.indexOf('<div class="page-h"')); if (k < 0) return x + h; let d = 1, i = h.indexOf('<div class="page-h"') + 1; // the page head's own closing tag
  const re = /<\/?div\b/g; re.lastIndex = i; let m; while ((m = re.exec(h))) { d += m[0] === '<div' ? 1 : -1; if (!d) { const e = m.index + 6; return h.slice(0, e) + x + h.slice(e); } } return x + h; };
const _oclCF2 = SCREENS['k-ocl'];
SCREENS['k-ocl'] = p => { const h = _oclCF2(p); return p && p.id || typeof h !== 'string' || /You can't view the observation criteria library/.test(h) ? h : cf2AfterHead(h, cf2CritTabs('lib')); };
// The legacy list: labelled historical, read-only; the Super Administrator's historical corrections behind an explicit switch
const cf2LegMaint = () => isSA() && !!ui('cf2LegMaint', false);
const CF2_LEG_NOTE = `<div class="note b-grey cf2-legnote">${ic('lock')}<div class="small"><strong>Historical — read-only.</strong> The criteria the Academy used before the Observation Criteria Library. They are kept, with their original codes, for observation records and programme versions configured before OBS-1, which still read them. New observations use the Criteria Library.</div></div>`;
const _legCF2 = SCREENS['k-obslib'];
SCREENS['k-obslib'] = p => {
  let h = _legCF2(p); if (typeof h !== 'string') return h;
  if (!cf2LegMaint()) h = h.replace(/<button class="btn btn-primary" data-act="kLib" data-id="">[\s\S]*?<\/button>/, '').replace(/<button class="btn btn-sm" data-act="(kLib|kLibAttach|s3LibActivate|kLibRetire)"[^>]*>[^<]*<\/button>/g, '');
  const sw = isSA() ? `<div class="row cf2-legmaint"><label class="check small"><input type="checkbox" data-onchange="cf2LegMaint" ${cf2LegMaint() ? 'checked' : ''}> Historical corrections (Super Administrator) — show the maintenance actions</label></div>` : '';
  return cf2AfterHead(h.replace('Observation Criteria Library — legacy shared list</h1>', 'Legacy Criteria — the legacy shared list</h1>'), cf2CritTabs('legacy') + CF2_LEG_NOTE + sw);
};
INP.cf2LegMaint = el => { setUi('cf2LegMaint', !!el.checked); logA('Observation Criteria Library', 'Legacy Criteria', el.checked ? 'Historical corrections shown' : 'Historical corrections hidden', '—', '—', ''); render(); };
// Changes to the legacy list: the Super Administrator only (others are refused and logged; nothing changes)
['kLib', 'kLibAttach', 'kLibRetire', 's3LibActivate'].forEach(k => { const f = ACT[k]; if (typeof f !== 'function') return; ACT[k] = el => {
  if (S.portal === 'admin' && !isSA()) { logA('Observation Criteria Library', (el && el.dataset && el.dataset.id) || 'Legacy Criteria', 'Blocked: change the legacy criteria', '—', '—', 'Legacy Criteria are read-only; historical corrections are made by the Super Administrator'); toast('Legacy Criteria are read-only. Use the Criteria Library; historical corrections are made by the Super Administrator.', 'err'); return false; }
  return f(el); }; });
if (typeof ROUTE_PURPOSE !== 'undefined') { ROUTE_PURPOSE['k-ocl'] = 'Observation Criteria — the Criteria Library (reusable criteria) and, on its second tab, the historical Legacy Criteria.'; ROUTE_PURPOSE['k-obslib'] = 'Legacy Criteria — the historical shared list, kept read-only for records configured before the Criteria Library.'; }

UXC.push(['CF2-A', 'Client Feedback 2.0 — approved fixes (15 Nov 2026)', [
  'Assessor Portfolio: a learner without a learner record is shown from their actual criterion records (published marking, verified locks, PD referrals and outcomes) — "No record" where none exists; "verified by" only from a real verification lock. The unit summary counts achieved criteria from the same records.',
  'Agency NVQ seats: the admission application lists the programme\'s own checklist (mandatory / optional, formats, maximum size, guidance, expiry) and records its version; Enhanced DBS optional on the programme is optional for agency applicants too.',
  'Short courses: an optional "Admission documents" tab (default none). Learners see the list before buying and upload on their course page; access is never held for it.',
  'Bundles: validity must be a whole number of days, 1 or more; invalid input is refused (never replaced by 365) and an invalid bundle can\'t be published. Pricing unchanged.',
  'Batches: the unused Bulk CSV button and intake option are no longer shown.',
  'Observation Criteria: one menu entry with two tabs — Criteria Library and Legacy Criteria (read-only; Super Administrator historical corrections only). No data migrated.']]);
