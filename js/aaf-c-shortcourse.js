/* AA-FINAL Workstream C — short courses and content (3 Nov 2026). Loads after aa1-integrity.js; keeps AA-1's D1 access expiry and
   D3 handler guards (AA1_S1). Every new admin action here is refused inside the action unless s1Can() (w0Deny, logged), and any dialog
   it opens is re-checked on confirm (w0OnConfirm).
   AA-08 Categories: a managed list (STORE.aafc.cats: id, name, Active/Retired) — add, rename, retire/restore, audited, admin roles
         (s1Can) only, from "Categories" on Short Courses or "Manage categories" on Details. Details picks from the list. Existing
         free-text categories join the list by exact name the first time it is read; no course is changed. A course keeps its stored
         label (c.cat, plus c.catId); a rename updates the label of the courses in that category from then on, in one audited entry
         that lists them — earlier audit and version records keep the old name.
   AA-09 Duration: a number and a unit (minutes, hours, days, weeks), validated on Save (sp.durV + the formatted sp.dur learners see).
         A stored free-text duration is shown as written until the course is saved again; it is never reinterpreted silently.
   AA-10 Price: an Academic Admin (no canPrice) requests a price ("Short-course price" in the Approvals Queue); the Super
         Administrator or a System Administrator (canPrice holders) approves it — then the price is set, as a new course version,
         audited. Nobody else can set it. Publishing stays blocked until a price exists, and the message names the pending request.
         The truncated Academic Admin banner (academic.js) is fixed in place.
   AA-11 SCORM: a chosen .zip is checked in the browser without running anything — the zip directory is read, imsmanifest.xml is
         inflated (DecompressionStream) and parsed as XML data only; SCORM 1.2 / 2004, the title and the SCOs are read from it, and
         an invalid package is refused. The package itself is not kept. The learner's player says plainly that SCORM content is not
         executed in this prototype and records completion without a score (the fixed 92% / 85% scores are gone). The sample-file
         path stays, labelled as a prototype sample whose version is chosen by hand.
   AA-12 Modules: each module card has "Add content" (the item dialog with that module chosen) and "Add existing content" (items not
         in it; an item belongs to one module, so it moves). "Add module" asks for a module title in a title field. A new module
         starts with no questions (g3 Low: the 10 phantom bank questions shown after Add module).
   AA-16 Clarity: a five-step bar (Details → Modules & content → Completion & access → Certificate → Price & publish) with each step's
         status, a guidance line, required markers and hints (Access period vs Certificate validity), optional custom fields folded
         away, a "Price & publish" view, and draft wording ("Save draft" — no "creates Version 2" on a draft nobody can buy).
   D5    Version history from the recorded saves (Short Courses audit entries for this course) — no invented rows. Content, module and
         quiz changes don't create a version (listed separately: they apply to new enrolments). New enrolments record the course
         version they were made on (e.courseV).
   AA-22 Access: Details, Completion and the learner's Overview show the access period (days from enrolment) apart from each module
         quiz's countdown and attempts. No course-wide timer (client decision). */
'use strict';

const AAFC_PRICE_T = 'Short-course price';
const aafcData = () => (STORE.aafc = STORE.aafc || { cats: null, reqs: [] });
const _isAAFC = initStore; initStore = function () { STORE.aafc = null; return _isAAFC.apply(this, arguments); };
const aafcReq = '<span class="aafc-req" aria-hidden="true">*</span><span class="sr"> (required)</span>';
// A new admin action: refused inside the action for roles that can't change short courses; any dialog it opens is re-checked on confirm
const aafcG = (what, f, confirm = true) => function (el) {
  if (!s1Can()) return w0Deny('Short Courses', aa1S1Ent(el), what, AA1_S1_WHY);
  const m0 = MODAL, r = f.apply(this, arguments);
  if (confirm && MODAL && MODAL !== m0) w0OnConfirm(() => !s1Can() && (w0Deny('Short Courses', aa1S1Ent(el), what, AA1_S1_WHY), true));
  return r;
};

/* ---------- AA-08: categories ---------- */
function aafcCats() {
  const A = aafcData(); A.cats = A.cats || [];
  (ADMIN.courses || []).forEach(c => { const n = String(c.cat || '').trim(); if (n && !A.cats.some(x => x.name.toLowerCase() === n.toLowerCase())) A.cats.push({ id: aafcCatId(), name: n, status: 'Active', from: 'Category already used by a course' }); });
  return A.cats;
}
function aafcCatId() { const L = aafcData().cats || []; let n = L.length + 1; while (L.some(x => x.id === 'CAT-' + String(n).padStart(2, '0'))) n++; return 'CAT-' + String(n).padStart(2, '0'); }
const aafcCatOf = c => { const L = aafcCats(); return L.find(x => x.id === c.catId) || L.find(x => x.name.toLowerCase() === String(c.cat || '').trim().toLowerCase()) || null; };
const aafcCatUse = k => (ADMIN.courses || []).filter(c => aafcCatOf(c) === k);
function aafcCatsBody() {
  const L = aafcCats();
  return `<p class="small muted">Courses choose their category from this list (Details). A retired category stays on the courses that already use it but can't be chosen for another course. A new name shows from then on; the audit history keeps the old one.</p>
    <div class="tbl-wrap"><table class="tbl dense aafc-cats"><thead><tr><th>Category</th><th>Courses</th><th>Status</th><th><span class="sr">Actions</span></th></tr></thead><tbody>${L.map(k => `<tr><td>${esc(k.name)}</td><td class="num">${aafcCatUse(k).length}</td><td>${chip(k.status, k.status === 'Active' ? 'green' : 'grey')}</td><td class="nowrap"><button class="btn btn-sm" data-act="aafcCatRename" data-k="${k.id}">Rename</button> <button class="btn btn-sm" data-act="aafcCatRetire" data-k="${k.id}">${k.status === 'Active' ? 'Retire' : 'Restore'}</button></td></tr>`).join('')}</tbody></table></div>
    <div class="field"><label for="aafc-cn">New category</label><div class="row aafc-cadd"><input class="input" id="aafc-cn" maxlength="60" autocomplete="off"><button class="btn btn-sm btn-primary" data-act="aafcCatAdd">${ic('plus', 14)}Add category</button></div></div>`;
}
const aafcCatsModal = () => openModal({ title: 'Short-course categories', size: 'lg', body: aafcCatsBody(), actions: [{ label: 'Close', cls: 'btn-primary', fn: () => { render(); } }] });
const aafcCatLog = (k, action, before, after, r) => logA('Short Courses', `Category ${k.id}`, action, before, after, r || 'Manage categories');
const aafcCatName = (v, self) => { const n = String(v || '').trim().replace(/\s+/g, ' '); if (!n) return ['', 'Enter a category name']; if (n.length > 60) return ['', 'Use 60 characters or fewer']; const d = aafcCats().find(x => x !== self && x.name.toLowerCase() === n.toLowerCase()); return d ? ['', d.status === 'Retired' ? `"${d.name}" already exists (retired) — restore it instead` : `"${d.name}" already exists`] : [n, '']; };
ACT.aafcCats = aafcG('manage short-course categories', () => aafcCatsModal(), false);
ACT.aafcCatAdd = aafcG('add a short-course category', () => {
  const [n, why] = aafcCatName(($('#aafc-cn') || {}).value); if (why) { fieldErr('#aafc-cn', why); return false; }
  const k = { id: aafcCatId(), name: n, status: 'Active', from: 'Added by ' + ADMIN.me.name, at: now().toISOString() }; aafcData().cats.push(k);
  aafcCatLog(k, 'Category added', '—', n); aafcCatsModal(); toast(`Category "${n}" added.`); return true;
}, false);
ACT.aafcCatRename = aafcG('rename a short-course category', el => {
  const k = aafcCats().find(x => x.id === el.dataset.k); if (!k) return false;
  reasonDlg({ title: 'Rename category — ' + esc(k.name), ok: 'Rename', label: 'Reason (required)', extra: `<div class="field"><label for="aafc-rn">New name</label><input class="input" id="aafc-rn" maxlength="60" value="${esc(k.name)}"></div><p class="small muted">${plural(aafcCatUse(k).length, 'course')} use it and show the new name from now on. Their recorded history keeps "${esc(k.name)}".</p>`,
    onOk: r => {
      const [n, why] = aafcCatName(mval('#aafc-rn'), k); if (why) { fieldErr('#aafc-rn', why); return false; } if (n === k.name) { fieldErr('#aafc-rn', 'Nothing has changed'); return false; }
      const was = k.name, used = aafcCatUse(k); k.name = n; used.forEach(c => { c.cat = n; c.catId = k.id; s1Keep(c); });
      aafcCatLog(k, 'Category renamed', was, n, `${r} — courses now showing it: ${used.map(c => c.id).join(', ') || 'none'}`); s1Sync(); aafcCatsModal(); toast(`Renamed to "${n}".`); return true;
    } });
});
ACT.aafcCatRetire = aafcG('retire or restore a short-course category', el => {
  const k = aafcCats().find(x => x.id === el.dataset.k); if (!k) return false; const to = k.status === 'Active' ? 'Retired' : 'Active';
  if (to === 'Retired' && aafcCats().filter(x => x.status === 'Active').length < 2) { toast('Keep at least one active category.', 'err'); return false; }
  reasonDlg({ title: `${to === 'Retired' ? 'Retire' : 'Restore'} category — ${esc(k.name)}`, ok: to === 'Retired' ? 'Retire category' : 'Restore category', body: `<p class="small">${to === 'Retired' ? `The ${plural(aafcCatUse(k).length, 'course')} using it keep it; no other course can choose it.` : 'Courses can choose it again.'}</p>`,
    onOk: r => { k.status = to; aafcCatLog(k, to === 'Retired' ? 'Category retired' : 'Category restored', to === 'Retired' ? 'Active' : 'Retired', to, r); aafcCatsModal(); return true; } });
});
// New courses start in an active category (the base's "Health and safety" while it is active)
const _newAAFC = ACT.newCourse;
ACT.newCourse = function () {
  const n = (ADMIN.courses || []).length, r = _newAAFC.apply(this, arguments), c = (ADMIN.courses || [])[n];
  if (c && c.id && s1Can()) { const L = aafcCats().filter(x => x.status === 'Active'), k = L.find(x => x.name === c.cat) || L[0]; if (k) { c.cat = k.name; c.catId = k.id; s1Keep(c); } }
  return r;
};

/* ---------- AA-09: duration as a number and a unit ---------- */
const AAFC_UNITS = [['minutes', 'Minutes'], ['hours', 'Hours'], ['days', 'Days'], ['weeks', 'Weeks']];
const aafcDurFmt = v => (v ? `${v.n} ${v.n === 1 ? v.unit.slice(0, -1) : v.unit}` : '');
function aafcDurParse(s) {
  const m = String(s == null ? '' : s).trim().match(/^(\d{1,3}(?:\.\d{1,2})?)\s*(minutes?|mins?|hours?|hrs?|days?|weeks?|wks?)?$/i); if (!m) return null;
  const n = +m[1], u = m[2] ? ({ m: 'minutes', h: 'hours', d: 'days', w: 'weeks' })[m[2][0].toLowerCase()] : null;
  return n > 0 && n <= 999 ? { n, unit: u } : null;
}
function aafcDurField(sp) {
  const v = sp.durV || (sp.dur ? aafcDurParse(sp.dur) : null), legacy = !sp.durV && String(sp.dur || '').trim(), ok = v && v.unit;
  return `<fieldset class="field aafc-dur"><legend class="lbl">Duration ${aafcReq}</legend><div class="aafc-dur-row"><label class="sr" for="cd-du">Duration — number</label><input class="input num" id="cd-du" inputmode="decimal" autocomplete="off" placeholder="e.g. 3" value="${ok ? v.n : ''}">
    <label class="sr" for="cd-duu">Duration — unit</label><select class="select" id="cd-duu">${AAFC_UNITS.map(([k, l]) => `<option value="${k}" ${(ok ? v.unit : 'hours') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <span class="hint">How long the course takes to study, shown on Browse Courses. Not the access period.</span>${legacy ? `<span class="hint aafc-dur-legacy">Saved before durations had a unit: learners see "${esc(sp.dur)}" until you save.${ok ? '' : ' It isn\'t converted automatically — enter a number and choose a unit.'}</span>` : ''}</fieldset>`;
}
// The number box, or a number typed with its unit ("3.5 hours")
function aafcDurRead() {
  const raw = String(($('#cd-du') || {}).value || '').trim(), p = aafcDurParse(raw);
  if (!p) return { why: raw ? 'Enter the duration as a number, e.g. 3 or 1.5' : 'Enter the duration' };
  const unit = p.unit || ($('#cd-duu') || {}).value; if (!AAFC_UNITS.some(u => u[0] === unit)) return { why: 'Choose minutes, hours, days or weeks' };
  const v = { n: p.n, unit }; if ((unit === 'minutes' && v.n < 1) || (v.n * 100) % 1) return { why: 'Enter a whole number of minutes' };
  return { v };
}

/* ---------- AA-10: the price request ---------- */
const aafcReqs = () => aafcData().reqs = aafcData().reqs || [];
const aafcReqOf = c => aafcReqs().filter(i => i.data && i.data.course === c.id);
const aafcPending = c => aafcReqOf(c).find(isOpen);
function aafcQueueSync() { if (typeof ADMIN === 'undefined' || !ADMIN || !ADMIN.queue || !STORE.aafc) return; aafcReqs().forEach(i => { if (!ADMIN.queue.includes(i)) { ADMIN.queue = ADMIN.queue.filter(x => x.id !== i.id); ADMIN.queue.unshift(i); } }); }
const _baAAFC = buildAdmin; buildAdmin = function () { const r = _baAAFC.apply(this, arguments); aafcQueueSync(); return r; };
const aafcReqId = () => { const used = new Set(ADMIN.queue.map(i => i.id).concat(aafcReqs().map(i => i.id))); let n = 6500 + aafcReqs().length; while (used.has('AQ-' + n)) n++; return 'AQ-' + n; };
const AAFC_PRICERS = 'the Super Administrator or a System Administrator';
function aafcPriceMsg(c) {
  const p = aafcPending(c);
  if (p) return `Price awaiting approval — ${p.id}: ${money(p.data.proposed, 'GBP')} requested by ${p.raisedBy}. ${AAFC_PRICERS.charAt(0).toUpperCase() + AAFC_PRICERS.slice(1)} decides it in the Approvals Queue.`;
  return canPrice() ? 'Set a price in GBP (Details)' : `No price yet — request one (Price & publish → Request a price); ${AAFC_PRICERS} approves it`;
}
ACT.aafcPriceReq = aafcG('request a short-course price', el => {
  const c = s1Row(el.dataset.id); if (!c) return false;
  if (canPrice()) { toast('You can set the price yourself on Details.', 'info'); return false; }
  const p = aafcPending(c); if (p) { toast(`${p.id} is already waiting for a decision.`, 'info'); return false; }
  reasonDlg({ title: 'Request a price — ' + esc(c.title), ok: 'Send request', label: 'Why this price (required)',
    body: `<p class="small">${AAFC_PRICERS.charAt(0).toUpperCase() + AAFC_PRICERS.slice(1)} approves short-course prices. Nothing changes until it's approved; then the price is set as a new course version and applies to new purchases only.</p>`,
    extra: `<div class="field"><label for="aafc-pp">Proposed price (GBP) ${aafcReq}</label><input class="input num" id="aafc-pp" type="number" min="0.01" max="100000" step="0.01" value="${c.gbp > 0 ? c.gbp : ''}"></div>`,
    onOk: r => {
      const v = Number(mval('#aafc-pp')); if (!(v > 0) || v > 100000 || Math.round(v * 100) !== v * 100) { fieldErr('#aafc-pp', 'Enter a price in GBP above £0, with at most 2 decimal places'); return false; }
      if (aafcPending(c)) { toast('A request is already waiting for a decision.', 'err'); return false; }
      const at = now().toISOString(), i = { id: aafcReqId(), type: AAFC_PRICE_T, raisedBy: ADMIN.me.name, raised: at, status: 'Pending', first: 'Super Administrator or System Administrator', related: [`${c.title} (${c.id})`, `a-courses.${c.id}.publish`], reason: r, notes: [], history: [[ADMIN.me.name, at, 'Raised', r]], data: { course: c.id, title: c.title, current: c.gbp, proposed: v } };
      aafcReqs().unshift(i); ADMIN.queue.unshift(i);
      logA('Approvals Queue', i.id, 'Short-course price requested', money(c.gbp, 'GBP'), money(v, 'GBP'), r); s1Log(c, `Price requested (${i.id})`, money(c.gbp, 'GBP'), money(v, 'GBP'), r);
      render(); toast(`${i.id} sent. The price is set when ${AAFC_PRICERS} approves it.`); return true;
    } });
});
// Who decides: canPrice holders, never the person who raised it (System Administrators may open the decision: sysadmin.js qDo)
if (typeof SYS_TYPES !== 'undefined' && !SYS_TYPES.includes(AAFC_PRICE_T)) SYS_TYPES.push(AAFC_PRICE_T);
const _awAAFC = awaitingMe; awaitingMe = function (i) { return i && i.type === AAFC_PRICE_T ? isOpen(i) && canPrice() && !isMine(i) : _awAAFC.apply(this, arguments); };
const _sbAAFC = selfBlocked; selfBlocked = function (i) { return i && i.type === AAFC_PRICE_T ? isMine(i) : _sbAAFC.apply(this, arguments); };
const _aqAAFC = allQueue; allQueue = function () { const q = _aqAAFC.apply(this, arguments); return isAca() ? q.concat(aafcReqs().filter(i => isMine(i) && !q.includes(i))) : q; };
const _adAAFC = applyDecision;
applyDecision = function (i, a, r, o) {
  if (!i || i.type !== AAFC_PRICE_T || a === 'note') return _adAAFC.apply(this, arguments);
  if (!canPrice()) return w0Deny('Approvals Queue', i.id, 'decide a short-course price request', `Short-course prices are approved by ${AAFC_PRICERS}.`);
  if (!isOpen(i) || i.data.applied) { logA('Approvals Queue', i.id, 'Blocked: decision repeated', i.status, '—', 'Already decided'); toast(`${i.id} is already ${String(i.status).toLowerCase()}.`, 'info'); return false; }
  const c = s1Row(i.data.course); if (a === 'approve' && !c) return w0Deny('Approvals Queue', i.id, 'approve a short-course price', 'The course no longer exists, so approving would change nothing.');
  const out = _adAAFC.apply(this, arguments);
  if (out === false) return out;
  if (a === 'approve' && i.status === 'Approved' && c && !i.data.applied) {
    const was = c.gbp; c.gbp = i.data.proposed; c.version++; i.data.applied = c.version; s1Keep(c);
    s1Log(c, `Price approved (${i.id}) — version ${c.version}`, money(was, 'GBP'), money(c.gbp, 'GBP'), `${r} — requested by ${i.raisedBy}: ${i.reason}`); s1Sync();
  }
  return out;
};
const _qScrAAFC = SCREENS['a-queue'];
SCREENS['a-queue'] = function (p) {
  const h = _qScrAAFC.apply(this, arguments), i = p && p.id && typeof h === 'string' ? qItem(p.id) : null; if (!i || i.type !== AAFC_PRICE_T) return h;
  const c = s1Row(i.data.course);
  return h.replace('<dt>First approver</dt>', `<dt>Course</dt><dd>${esc(c ? c.title : i.data.title)} <span class="mono xs">${esc(i.data.course)}</span>${c ? ` · ${chip(c.status, c.status === 'Published' ? 'green' : 'amber')}` : ''}</dd><dt>Price now → proposed</dt><dd>${money(c ? c.gbp : i.data.current, 'GBP')} → <strong>${money(i.data.proposed, 'GBP')}</strong></dd><dt>Applies to</dt><dd>New purchases only; approving sets it as a new course version${i.data.applied ? ` (set as version ${i.data.applied})` : ''}</dd><dt>First approver</dt>`);
};
const _qRoutAAFC = ACT.qRouting;
// The confirmed routing table (G4 "Who approves what", client-confirmed) is left unchanged; this provisional type is named below it
if (_qRoutAAFC) ACT.qRouting = function () { const r = _qRoutAAFC.apply(this, arguments); if (MODAL && /<\/table>/.test(MODAL.body)) { const k = MODAL.body.lastIndexOf('</table>') + 8; MODAL.body = MODAL.body.slice(0, k) + `<p class="xs muted aafc-route">${ic('info', 12)} Provisional, pending client confirmation (AA-10): <strong>${AAFC_PRICE_T}</strong> — raised by an Academic Admin, decided by the Super Administrator or a System Administrator. Not part of the confirmed table above.</p>` + MODAL.body.slice(k); renderModal(); } return r; };

/* ---------- Publishing checks ---------- */
const _missAAFC = s1Missing;
s1Missing = function (c) {
  const out = _missAAFC.apply(this, arguments).map(m => (/^Set a price in GBP/.test(m) ? aafcPriceMsg(c) : m)), sp = s1Spec(c);
  if (!String(c.cat || '').trim()) out.push('Choose a category (Details)');
  if (!String(sp.dur || '').trim()) out.push('Set the duration — a number and a unit (Details)');
  return out;
};

/* ---------- Details (AA-08, AA-09, AA-10, AA-16, AA-22) ---------- */
const _detAAFC = s1Details;
s1Details = function (c, sp) {
  let h = _detAAFC.apply(this, arguments); const k = aafcCatOf(c), L = aafcCats().filter(x => x.status === 'Active' || x === k);
  h = h.replace('<label for="cd-t">Title</label>', `<label for="cd-t">Title ${aafcReq}</label>`)
    .replace('<label for="cd-d">Description</label>', '<label for="cd-d">Description</label><span class="hint">Shown to learners on Browse Courses and the course overview.</span>')
    .replace(/<div class="field"><label for="cd-c">Category<\/label><input class="input" id="cd-c" value="[^"]*"><\/div>/, `<div class="field aafc-catf"><label for="cd-c">Category ${aafcReq}</label><select class="select" id="cd-c">${k ? '' : '<option value="">Choose a category</option>'}${L.map(x => `<option value="${esc(x.name)}" ${x === k ? 'selected' : ''}>${esc(x.name)}${x.status === 'Retired' ? ' (retired)' : ''}</option>`).join('')}</select>${s1Can() ? '<button type="button" class="linklike small" data-act="aafcCats">Manage categories</button>' : ''}</div>`)
    .replace(/<div class="field"><label for="cd-du">Duration<\/label><input class="input" id="cd-du" value="[^"]*"><\/div>/, aafcDurField(sp))
    .replace(/(<div class="field"><label for="cd-ap">)Access period \(days\)(<\/label><input [^>]*>)<\/div>/, `$1Access period (days) ${aafcReq}$2<span class="hint">Days the learner can study, counted from their enrolment. When it ends, content and quizzes lock. Not the certificate validity.</span></div>`);
  if (!canPrice()) {
    const p = aafcPending(c);
    h = h.replace(/<p class="xs muted full">[^]*?read-only for you\.<\/p>/, `<div class="note b-grey full aafc-pnote">${ic('lock')}<div class="small">Prices are set by ${AAFC_PRICERS}. ${p ? `<strong>${p.id}: ${money(p.data.proposed, 'GBP')} requested — waiting for a decision.</strong> <button class="linklike" data-go="a-queue" data-id="${p.id}">Open the request</button>` : `${c.gbp > 0 ? 'To change it, request' : 'Request'} a price and they approve it. ${s1Can() ? `<button type="button" class="btn btn-sm" data-act="aafcPriceReq" data-id="${c.id}">Request a price…</button>` : ''}`}</div></div>`);
  }
  // Optional custom fields: folded away unless the course has some (progressive disclosure)
  return h.replace(/<section class="card s1-fields">([^]*)<\/section>$/, (m, x) => `<details class="card s1-fields aafc-more" ${sp.fields.length ? 'open' : ''}><summary class="strong">Optional: questions asked at enrolment (${sp.fields.filter(f => f.status === 'Active').length})</summary>${x}</details>`);
};
// Save: the category must be an active one (or the course's own), the duration a number and a unit
const _saveAAFC = ACT.s1Save;
ACT.s1Save = function (el) {
  const d = (el && el.dataset) || {}, c = s1Row(d.id);
  if (!c || d.t !== 'details' || !s1Can() || !$('#cd-du')) return aafcDraftDlg(c, () => _saveAAFC.apply(this, arguments));
  const sel = ($('#cd-c') || {}).value || '', k = aafcCats().find(x => x.name === sel);
  if (!k) return fieldErr('#cd-c', 'Choose a category');
  if (k.status !== 'Active' && k !== aafcCatOf(c)) return fieldErr('#cd-c', `"${k.name}" is retired — choose an active category`);
  const D_ = aafcDurRead(); if (D_.why) return fieldErr('#cd-du', D_.why);
  const box = $('#cd-du'), typed = box.value, sp = s1Spec(c); box.value = aafcDurFmt(D_.v);
  try {
    return aafcDraftDlg(c, () => fcWrapDlg(o => ({ ...o, onOk: r => { const x = o.onOk(r); if (x !== false && sp.dur === aafcDurFmt(D_.v)) { sp.durV = D_.v; c.catId = k.id; s1Keep(c); } return x; } }), () => _saveAAFC.apply(this, arguments)));
  } finally { if (box.isConnected) box.value = typed; }
};
// AA-16: a draft's save dialog says what it is (no "new version effective from today" for a course nobody can buy)
function aafcDraftDlg(c, fn) {
  if (!c || c.status !== 'Draft') return fn();
  return fcWrapDlg(o => ({ ...o, body: String(o.body || '').replace('This creates a new version effective from today. Existing enrolments stay on their version.', `This course is a draft: nobody can buy it yet. The save is recorded as version ${c.version + 1} in its Version history.`) }), fn);
}

/* ---------- AA-12: modules and their content ---------- */
ACT.chModAdd = function (el) {
  if (!s1Can()) return w0Deny('Short Courses', aa1S1Ent(el), AA1_S1.chModAdd, AA1_S1_WHY);
  const c = s1Row(el && el.dataset && el.dataset.c); if (!c) return false;
  // The title field keeps the id the dialog's text box had (#rsn), so existing scripted steps still type into it
  openModal({ title: 'Add module', sub: esc(c.title), body: `<div class="field"><label for="rsn">Module title ${aafcReq}</label><input class="input" id="rsn" maxlength="120" autocomplete="off"><span class="hint">Learners see this as the module's name. You can rename it later.</span></div><div class="field"><label for="aafc-mn">Note for the audit history (optional)</label><input class="input" id="aafc-mn" maxlength="200"></div><p class="xs muted">The module starts empty: add its content and quiz questions on its card.</p>`,
    actions: [{ label: 'Cancel' }, { label: 'Add module', cls: 'btn-primary', fn: () => {
      const t = mval('#rsn').replace(/\s+/g, ' '), mods = s1Mods(c); if (!t) return fieldErr('#rsn', 'Enter a module title'), false;
      if (mods.some(m => m.status === 'Active' && m.title.toLowerCase() === t.toLowerCase())) return fieldErr('#rsn', 'Another module in this course has this title'), false;
      let n = mods.length + 1; while (mods.some(m => m.id === 'm' + n)) n++;
      mods.push({ id: 'm' + n, title: t, items: [], status: 'Active', quiz: { q: 10, limit: 20, pass: 80, max: 3, qs: [] } }); // no bank questions (g3 Low)
      s1Keep(c); s1Log(c, 'Module added', '—', t, mval('#aafc-mn') || 'Modules tab'); render(); toast(`Module "${t}" added. Add its content and quiz questions on its card.`);
    } }] });
  w0OnConfirm(() => !s1Can() && (w0Deny('Short Courses', aa1S1Ent(el), AA1_S1.chModAdd, AA1_S1_WHY), true));
};
// "Add content" on a module card: the item dialog with that module chosen
const _itemAddAAFC = ACT.s1ItemAdd;
ACT.s1ItemAdd = function (el) {
  const d = (el && el.dataset) || {}; setUi('s1Mod', d.m || ''); setUi('aafcPkg', null);
  const m0 = MODAL, r = _itemAddAAFC.apply(this, arguments), c = s1Row(d.id), m = d.m && c && s1Mods(c).find(x => x.id === d.m);
  if (m && MODAL && MODAL !== m0) { MODAL.title = 'Add content to ' + esc(m.title); renderModal(); }
  return r;
};
const _itemEditAAFC = ACT.s1ItemEdit; ACT.s1ItemEdit = function () { setUi('aafcPkg', null); return _itemEditAAFC.apply(this, arguments); };
ACT.aafcModPick = aafcG('add existing content to a module', el => {
  const c = s1Row(el.dataset.c), mods = c && s1Mods(c), m = mods && mods.find(x => x.id === el.dataset.m); if (!m || m.status !== 'Active') return false;
  const other = s1Spec(c).items.filter(i => i.status === 'Active' && !m.items.includes(i.id)), where = id => mods.find(x => x.items.includes(id));
  openModal({ title: 'Add existing content to ' + esc(m.title), sub: esc(c.title), body: other.length ? `<p class="small muted">Each item belongs to one module: an item in another module moves here. Learners already enrolled keep what they have.</p><fieldset class="stack" style="border:0;padding:0"><legend class="lbl">Content not in this module</legend>${other.map(i => { const w = where(i.id); return `<label class="check small"><input type="checkbox" class="aafc-ex" value="${i.id}">${esc(i.title)} <span class="xs muted">${w ? '— now in ' + esc(w.title) + ' (moves here)' : '— not in a module'}</span></label>`; }).join('')}</fieldset>` : '<p class="small">Every content item is already in this module. Use Add content to create a new one.</p>',
    actions: other.length ? [{ label: 'Cancel' }, { label: 'Add to module', cls: 'btn-primary', fn: () => {
      const ids = $$('#modal-root .aafc-ex:checked').map(x => x.value).filter(id => other.some(i => i.id === id)); if (!ids.length) { toast('Tick at least one item.', 'err'); return false; }
      ids.forEach(id => { mods.forEach(x => { x.items = x.items.filter(i => i !== id); }); m.items.push(id); });
      s1Keep(c); s1Log(c, 'Content added to module', '—', `${m.title}: ${ids.map(id => s1Spec(c).items.find(i => i.id === id).title).join(', ')}`, 'Modules tab'); render(); toast(`${plural(ids.length, 'item')} added to ${m.title}.`);
    } }] : [{ label: 'Close', cls: 'btn-primary' }] });
});
const _modsAAFC = chModulesTab;
chModulesTab = function (c) {
  const h = _modsAAFC.apply(this, arguments); if (!s1Row(c.id)) return h;
  // One part per module card, in the order the cards are drawn
  const SEP = '<section class="card ch-cmod', parts = h.split(SEP), mods = s1Mods(c); if (parts.length !== mods.length + 1) return h;
  return parts[0] + mods.map((m, k) => {
    const live = m.status === 'Active', btns = live ? `<div class="row aafc-madd"><button class="btn btn-sm btn-primary" data-act="s1ItemAdd" data-id="${c.id}" data-m="${m.id}">${ic('plus', 14)}Add content</button><button class="btn btn-sm" data-act="aafcModPick" data-c="${c.id}" data-m="${m.id}">Add existing content</button></div>` : '';
    const lim = live ? '<p class="xs muted aafc-qlim">Time limit: a countdown of this many minutes starts when the learner starts this quiz. Allowed attempts: how many times they may take it.</p>' : '';
    return SEP + parts[k + 1].replace('<p class="xs muted">No content yet — add items on the Content tab.</p>', '<p class="xs muted">No content in the course yet.</p>').replace('</fieldset>', '</fieldset>' + btns).replace('<div class="row-b s1-qh">', lim + '<div class="row-b s1-qh">');
  }).join('');
};
// The g3 Low: Add module showed the bank's 10 questions until the next render — new modules now start with qs = [] (above)

/* ---------- AA-11: SCORM package check (data only — nothing in the package runs) ---------- */
const AAFC_ZIP_MAX = 300 * 1024 * 1024, AAFC_MAN_MAX = 2 * 1024 * 1024;
const AAFC = { pending: null };
async function aafcZipManifest(file) {
  const bad = why => ({ ok: false, why });
  if (!file || !/\.zip$/i.test(file.name || '')) return bad('Choose a SCORM package — a .zip file.');
  if (file.size > AAFC_ZIP_MAX) return bad('The package is larger than 300 MB, which this prototype doesn\'t check.');
  if (file.size < 22) return bad('This file isn\'t a valid .zip package.');
  const tl = Math.min(file.size, 65557), tail = new DataView(await file.slice(file.size - tl).arrayBuffer());
  let e = -1; for (let i = tl - 22; i >= 0; i--) if (tail.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) return bad('This file isn\'t a valid .zip package (no zip directory found).');
  const n = tail.getUint16(e + 10, true), size = tail.getUint32(e + 12, true), off = tail.getUint32(e + 16, true);
  if (n === 0xffff || off === 0xffffffff || size === 0xffffffff) return bad('ZIP64 packages aren\'t supported in this prototype.');
  if (!n) return bad('The .zip file is empty.'); if (off + size > file.size) return bad('This .zip file is damaged (its directory points outside the file).');
  const cd = new DataView(await file.slice(off, off + size).arrayBuffer()), dec = new TextDecoder('utf-8'); let p = 0, man = null;
  for (let k = 0; k < n; k++) {
    if (p + 46 > cd.byteLength || cd.getUint32(p, true) !== 0x02014b50) return bad('This .zip file is damaged (unreadable directory).');
    const fl = cd.getUint16(p + 28, true), xl = cd.getUint16(p + 30, true), cl = cd.getUint16(p + 32, true);
    if (p + 46 + fl > cd.byteLength) return bad('This .zip file is damaged (unreadable directory).');
    const name = dec.decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, fl));
    if (name === 'imsmanifest.xml') man = { flags: cd.getUint16(p + 8, true), method: cd.getUint16(p + 10, true), csize: cd.getUint32(p + 20, true), usize: cd.getUint32(p + 24, true), lho: cd.getUint32(p + 42, true) };
    p += 46 + fl + xl + cl;
  }
  if (!man) return bad('No imsmanifest.xml at the top level of the package, so it isn\'t a SCORM package.');
  if (man.flags & 1) return bad('The package is encrypted, so it can\'t be checked.');
  if (man.usize > AAFC_MAN_MAX || man.csize > AAFC_MAN_MAX) return bad('imsmanifest.xml is too large to check (over 2 MB).');
  const lh = new DataView(await file.slice(man.lho, man.lho + 30).arrayBuffer());
  if (lh.byteLength < 30 || lh.getUint32(0, true) !== 0x04034b50) return bad('This .zip file is damaged (imsmanifest.xml can\'t be read).');
  const st = man.lho + 30 + lh.getUint16(26, true) + lh.getUint16(28, true), raw = await file.slice(st, st + man.csize).arrayBuffer();
  let bytes;
  if (man.method === 0) bytes = raw;
  else if (man.method === 8) {
    if (typeof DecompressionStream === 'undefined') return bad('This browser can\'t read compressed packages.');
    try { const s = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw')); bytes = await new Response(s).arrayBuffer(); } catch (x) { return bad('imsmanifest.xml couldn\'t be decompressed — the package may be damaged.'); }
  } else return bad('imsmanifest.xml uses a compression this prototype can\'t read.');
  if (bytes.byteLength > AAFC_MAN_MAX) return bad('imsmanifest.xml is too large to check (over 2 MB).');
  // Parsed as XML data: an XML document is never rendered, and no script in it runs
  const doc = new DOMParser().parseFromString(dec.decode(bytes), 'application/xml'), root = doc.documentElement;
  if (!root || doc.getElementsByTagName('parsererror').length || root.localName !== 'manifest') return bad('imsmanifest.xml isn\'t a valid manifest (it doesn\'t parse as XML with a <manifest> root).');
  const all = tag => [...doc.getElementsByTagNameNS('*', tag)], txt = x => String((x && x.textContent) || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  const sv = txt(all('schemaversion')[0]), ns = [...root.attributes].map(a => a.value).join(' ');
  const version = /^1\.2$/.test(sv) || (!sv && /adlcp_rootv1p2/i.test(ns)) ? 'SCORM 1.2' : /2004|CAM 1\.3/i.test(sv) || (!sv && /adlcp_v1p3/i.test(ns)) ? 'SCORM 2004' : '';
  if (!version) return bad(`The manifest doesn't declare SCORM 1.2 or SCORM 2004${sv ? ` (schema version "${sv}")` : ''}.`);
  const orgs = all('organizations')[0], dflt = orgs && orgs.getAttribute('default'), org = all('organization').find(o => o.getAttribute('identifier') === dflt) || all('organization')[0];
  const title = txt(org && [...org.children].find(x => x.localName === 'title')) || txt(all('title')[0]) || '';
  const scos = all('resource').filter(r => [...r.attributes].some(a => a.localName.toLowerCase() === 'scormtype' && a.value.toLowerCase() === 'sco'));
  if (!scos.length) return bad('The manifest has no SCO (a launchable SCORM resource).');
  return { ok: true, version, title, scos: scos.length, launch: String(scos[0].getAttribute('href') || '').slice(0, 200), file: String(file.name).slice(0, 120), size: file.size, files: n };
}
const aafcPkgTxt = P => (P.sample ? 'Prototype sample — not a real package; its version is chosen below.' : `Checked: ${P.title ? `"${P.title}" · ` : ''}${P.version} · ${plural(P.scos, 'SCO')} · read from imsmanifest.xml. Nothing in the package was run.`);
function aafcPkgShow() {
  const P = ui('aafcPkg', null), box = $('#aafc-pk'), sv = $('#ci-sv'); if (!box) return;
  box.className = 'hint aafc-pkst' + (P && P.status === 'bad' ? ' aafc-bad' : '');
  box.textContent = !P ? 'The package is checked in your browser when you choose it.' : P.status === 'checking' ? 'Checking the package…' : P.status === 'bad' ? 'Not accepted: ' + P.why : aafcPkgTxt(P);
  if (sv) { const real = P && P.status === 'ok' && !P.sample; if (real) sv.value = P.version; sv.disabled = !!real; }
}
const _srcAAFC = s1SrcField;
s1SrcField = function (k) {
  const h = _srcAAFC.apply(this, arguments); if (k !== 'scorm') return h;
  return h.replace('>Use a sample file</button>', '>Prototype: use a sample file (not a real package)</button>')
    .replace('<label for="ci-sv" style="margin-top:8px">SCORM version</label>', '<label for="ci-sv" style="margin-top:8px">SCORM version <span class="xs muted">(read from a real package; chosen by hand only for the prototype sample)</span></label>')
    + `<span class="hint aafc-pkst" id="aafc-pk" role="status"></span><p class="xs muted">The package must contain imsmanifest.xml declaring SCORM 1.2 or SCORM 2004. Only the manifest is read; the package's content is not run or kept in this prototype.</p>`;
};
const _kindAAFC = INP.s1Kind; INP.s1Kind = function () { setUi('aafcPkg', null); const r = _kindAAFC.apply(this, arguments); aafcPkgShow(); return r; };
const _fileAAFC = INP.s1File;
INP.s1File = function (el) {
  const r = _fileAAFC.apply(this, arguments), f = el && el.files && el.files[0], k = ($('#ci-k') || {}).value;
  if (k !== 'scorm') return r;
  if (!f) { setUi('aafcPkg', null); aafcPkgShow(); return r; }
  const tok = {}; setUi('aafcPkg', { status: 'checking', tok }); aafcPkgShow();
  AAFC.pending = aafcZipManifest(f).catch(() => ({ ok: false, why: 'The package couldn\'t be read.' })).then(x => { const P = ui('aafcPkg', null); if (!P || P.tok !== tok) return x; setUi('aafcPkg', x.ok ? { status: 'ok', ...x } : { status: 'bad', why: x.why }); aafcPkgShow(); return x; });
  return r;
};
const _sampleAAFC = ACT.s1SampleFile; ACT.s1SampleFile = function () { const r = _sampleAAFC.apply(this, arguments); if (($('#ci-k') || {}).value === 'scorm') { setUi('aafcPkg', { status: 'ok', sample: true }); aafcPkgShow(); } return r; };
const _itemSaveAAFC = s1ItemSave;
s1ItemSave = function (c, it) {
  const k = it ? it.kind : ($('#ci-k') || {}).value; if (k !== 'scorm') return _itemSaveAAFC.apply(this, arguments);
  const P = ui('aafcPkg', null), sp = s1Spec(c), n0 = sp.items.length;
  if (P && P.status === 'checking') return fieldErr('#ci-f', 'Still checking the package — try again in a moment'), false;
  if (P && P.status === 'bad') return fieldErr('#ci-f', P.why), false;
  if (!P && ui('s1File', '')) return fieldErr('#ci-f', 'Choose the package again so it can be checked'), false;
  const out = _itemSaveAAFC.apply(this, arguments); if (out === false || !P) return out;
  const x = it || (sp.items.length > n0 ? sp.items[sp.items.length - 1] : null); if (!x) return out;
  x.pkg = P.sample ? { sample: true, file: x.src } : { file: P.file, size: P.size, title: P.title, version: P.version, scos: P.scos, launch: P.launch, checked: now().toISOString(), by: ADMIN.me.name };
  if (!P.sample) x.scorm = P.version; setUi('aafcPkg', null); s1Keep(c); return out;
};
const _contAAFC = s1Content;
s1Content = function (c, sp) {
  let h = _contAAFC.apply(this, arguments);
  sp.items.filter(i => i.kind === 'scorm').forEach(i => { const lbl = `SCORM package${i.scorm ? ' ' + i.scorm : ''}${i.src ? ' · ' + esc(i.src) : ''}`; h = h.replace(lbl, lbl + (i.pkg ? (i.pkg.sample ? ' · prototype sample (not checked)' : ` · checked: ${plural(i.pkg.scos, 'SCO')}`) : ' · not checked (added before package checks)')); });
  return h.replace('<p class="small muted">This course\'s own content. Each item belongs to a module; learners see it under that module. Changes apply to new enrolments.</p>', '<p class="small muted">Every item in this course, across its modules. To put new content in a module, use Add content on the module\'s card (Modules). Changes apply to new enrolments.</p>');
};

/* ---------- Learner: the SCORM player is labelled; completion is recorded without a score ---------- */
const aafcScormBody = (e, c) => {
  const P = c.pkg || {}, ver = c.scorm || P.version;
  return `<div class="note b-amber aafc-proto">${ic('info')}<div class="small"><strong>Prototype: SCORM content is not executed; completion is recorded manually.</strong> No score is recorded.</div></div>
    <dl class="kv"><dt>Package</dt><dd>${esc(P.title || c.title)}</dd><dt>SCORM version</dt><dd>${ver ? esc(ver) + (P.sample ? ' (prototype sample)' : '') : 'Not recorded'}</dd><dt>Status</dt><dd>${chip(c.state)}</dd></dl>
    ${c.state === 'Completed' ? `<p class="small">${c.manualAt ? `Completion recorded ${fdt(c.manualAt)}.` : 'Completed.'}</p>` : `<button class="btn btn-primary" data-act="scormFinish" data-e="${e.id}" data-id="${c.id}">Record completion</button>`}`;
};
const _openAAFC = ACT.openItem;
ACT.openItem = function (el) {
  const m0 = MODAL, r = _openAAFC.apply(this, arguments), d = (el && el.dataset) || {}, e = r !== false && enrolById(d.e), c = e && (e.content || []).find(x => x.id === d.id);
  if (c && c.kind === 'scorm' && MODAL && MODAL !== m0) { MODAL.body = aafcScormBody(e, c); MODAL.sub = `SCORM package${c.scorm ? ' · ' + esc(c.scorm) : ''}`; renderModal(); }
  return r;
};
// The fixed score is gone: completion only. AA-1's access check (and its refusal) still runs first.
const aafcQuiet = (re, fn) => { const t0 = toast; toast = function (m) { if (re.test(String(m))) return; return t0.apply(this, arguments); }; try { return fn(); } finally { toast = t0; } };
const _scormAAFC = ACT.scormFinish;
ACT.scormFinish = function (el) {
  const d = (el && el.dataset) || {}, e = enrolById(d.e), c = e && (e.content || []).find(x => x.id === d.id); if (!c) return _scormAAFC.apply(this, arguments);
  const was = c.score, r = aafcQuiet(/score 92% recorded/, () => _scormAAFC.apply(this, arguments));
  if (r === false || c.state !== 'Completed') return r;
  c.score = was || null; c.manualAt = c.manualAt || now().toISOString(); recalcShort(e); render();
  toast('Completion recorded. No score — SCORM content isn\'t run in this prototype.'); return r;
};
const _resOpenAAFC = ACT.openRes;
ACT.openRes = function (el) {
  const m0 = MODAL, r = _resOpenAAFC.apply(this, arguments);
  if (MODAL && MODAL !== m0 && /SCORM launcher/.test(MODAL.body || '')) { MODAL.body = MODAL.body.replace(/SCORM launcher · tracks completion and score/, 'SCORM resource').replace(/<p>Branching scenario: choose how to respond at each step\.<\/p>/, '<div class="note b-amber aafc-proto"><div class="small"><strong>Prototype: SCORM content is not executed; completion is recorded manually.</strong> No score is recorded.</div></div>').replace('>Complete scenario<', '>Record completion<'); renderModal(); }
  return r;
};
const _resScAAFC = ACT.resScorm; ACT.resScorm = function () { const r = aafcQuiet(/score 85% recorded/, () => _resScAAFC.apply(this, arguments)); if (r !== false && !MODAL) toast('Completion recorded. No score — SCORM content isn\'t run in this prototype.'); return r; };
// Seeded demo scores (from before this check) are labelled as such
const _shContAAFC = shortContent_;
shortContent_ = function (e) { return _shContAAFC.apply(this, arguments).replace(/<span class="xs muted">Score (\d+)%<\/span>/g, '<span class="xs muted">Score $1% (seeded demo record)</span>'); };

/* ---------- Enrolments record their course version and the package details (D5, AA-11) ---------- */
function aafcStamp(e, row) {
  if (!e || !row) return; if (e.courseV == null) e.courseV = row.version;
  const sp = s1Spec(row); (e.content || []).forEach(x => { if (x.kind !== 'scorm') return; const it = sp.items.find(i => i.id === x.id); if (it) { x.scorm = x.scorm || it.scorm || ''; if (it.pkg) x.pkg = { title: it.pkg.title || '', version: it.pkg.version || it.scorm || '', sample: !!it.pkg.sample }; } });
}
const _enrolAAFC = s1Enrol;
s1Enrol = function (c, row) { const r = _enrolAAFC.apply(this, arguments); aafcStamp(W && W.enrolments.find(x => x.courseId === (row && row.id)), row); return r; };
const _agEnrolAAFC = ag1ShortEnrol;
ag1ShortEnrol = function () { const e = _agEnrolAAFC.apply(this, arguments); if (e && e.courseId) aafcStamp(e, s1Row(e.courseId)); return e; };

/* ---------- AA-22: access period and quiz time limits, shown apart ---------- */
const aafcQuizLi = m => `<li><strong>${esc(m.title)}</strong> — ${m.quiz.limit ? `${m.quiz.limit}-minute countdown once started` : 'no time limit'} · ${plural(m.quiz.max, 'attempt')} allowed</li>`;
const aafcLimitsAdmin = c => { const mods = s1Mods(c).filter(m => m.status === 'Active'); return `<section class="card aafc-limits"><h3>Access and time limits</h3><dl class="kv"><dt>Access period</dt><dd>${c.access} days from the learner's enrolment; content and quizzes lock when it ends. <button class="linklike" data-go="a-courses" data-id="${c.id}" data-tab="details">Change on Details</button></dd><dt>Module quizzes</dt><dd>${mods.length ? `<ul class="small aafc-ql">${mods.map(aafcQuizLi).join('')}</ul><button class="linklike" data-go="a-courses" data-id="${c.id}" data-tab="modules">Change on Modules</button>` : 'No modules yet.'}</dd><dt>Course timer</dt><dd>None. Only each module quiz has a countdown.</dd></dl></section>`; };
const _ovAAFC = shortOverview;
shortOverview = function (e) {
  const h = _ovAAFC.apply(this, arguments); if (!e || e.kind !== 'short' || !e.end) return h;
  const days = e.start ? Math.round((new Date(e.end) - new Date(e.start)) / DAY) : null, mods = shMods(e);
  return h + `<section class="card aafc-limits"><h2>Time limits</h2><dl class="kv"><dt>Access period</dt><dd>${days ? `${days} days from your enrolment — ` : ''}until ${fd(e.end)}. You can study any time until then.</dd>${mods.length ? `<dt>Module quizzes</dt><dd><ul class="small aafc-ql">${mods.map(aafcQuizLi).join('')}</ul><span class="xs muted">A quiz's countdown starts only when you start that quiz.</span></dd>` : ''}<dt>Course timer</dt><dd>None — there's no overall time limit on the course.</dd></dl></section>`;
};

/* ---------- AA-16 / D5: steps, guidance, Price & publish, truthful versions ---------- */
function aafcSteps(c) {
  const sp = s1Spec(c), mods = s1Mods(c).filter(m => m.status === 'Active'), p = aafcPending(c);
  const det = c.title && c.title !== 'Untitled course' && String(c.cat || '').trim() && String(sp.dur || '').trim() && c.access >= 1;
  const mc = mods.length && mods.every(m => m.items.length && s1ActQs(m).length);
  const cert = !fcOn(sp) || !fcErrs(fcSaved(sp)).length, pub = c.status !== 'Draft';
  return [['details', 'Details', det ? 'Done' : 'To do', det ? '' : 'Title, category, duration and access period'],
    ['modules', 'Modules & content', mc ? 'Done' : 'To do', mods.length ? (mc ? '' : 'Every module needs content and quiz questions') : 'Add a module'],
    ['completion', 'Completion & access', Object.values(sp.rules || {}).some(Boolean) ? 'Done' : 'To do', ''],
    ['certificate', 'Certificate', cert ? 'Done' : 'To do', cert ? (fcOn(sp) ? '' : 'No certificate') : 'Template incomplete'],
    ['publish', 'Price & publish', pub ? 'Done' : p ? 'Waiting' : 'To do', pub ? c.status : p ? 'Price awaiting approval' : c.gbp > 0 ? 'Ready when the steps are done' : 'Needs a price']];
}
const AAFC_STEP_OF = { details: 0, content: 1, modules: 1, completion: 2, certificate: 3, validity: 3, publish: 4 };
const AAFC_GUIDE = {
  details: 'Required: title, category, duration and access period. The description is shown to learners.',
  modules: 'Add a module, then use Add content on its card for documents, Vimeo videos, SCORM packages or links, and add its quiz questions.',
  content: 'Every item in the course, across modules. To put new content in a module, use Add content on the module\'s card (Modules).',
  completion: 'Choose what the learner must do to complete the course. The access period and each quiz\'s time limit and attempts are summarised below.',
  certificate: 'Choose whether a certificate is issued, and design it. How long it stays valid is on Validity.',
  validity: 'Certificate validity is how long an issued certificate stays valid — not how long the learner can study (the access period on Details).',
  publish: 'Check the price and anything still missing, then publish. Learners can buy the course once it is published.' };
function aafcStepBar(c, t) {
  const st = aafcSteps(c), cur = AAFC_STEP_OF[t], tone = { Done: 'green', Waiting: 'blue', 'To do': 'amber' };
  return `<nav class="aafc-steps" aria-label="Short-course setup steps"><ol>${st.map(([k, l, s, why], i) => `<li class="${i === cur ? 'aafc-cur' : ''}"><button class="aafc-step" data-go="a-courses" data-id="${c.id}" data-tab="${k}" ${i === cur ? 'aria-current="step"' : ''}><span class="xs muted">Step ${i + 1} of 5</span><span class="strong">${l}</span>${chip(s, tone[s])}${why ? `<span class="xs muted">${esc(why)}</span>` : ''}</button></li>`).join('')}</ol></nav>${AAFC_GUIDE[t] ? `<p class="small aafc-guide">${ic('info', 14)} ${AAFC_GUIDE[t]}</p>` : ''}`;
}
function aafcPublishView(c) {
  const sp = s1Spec(c), miss = c.status === 'Draft' ? s1Missing(c) : [], reqs = aafcReqOf(c), p = aafcPending(c);
  const price = `<section class="card aafc-price"><h2>Price</h2><dl class="kv"><dt>Price</dt><dd>${c.gbp > 0 ? `<strong>${money(c.gbp, 'GBP')}</strong> — new purchases only; existing enrolments keep what they paid` : 'Not set'}</dd><dt>Set by</dt><dd>${AAFC_PRICERS.charAt(0).toUpperCase() + AAFC_PRICERS.slice(1)}</dd></dl>
    ${p ? `<div class="note b-blue">${ic('clock')}<div class="small"><strong>${p.id}: ${money(p.data.proposed, 'GBP')} requested by ${esc(p.raisedBy)} on ${fd(p.raised)} — waiting for a decision.</strong> <button class="linklike" data-go="a-queue" data-id="${p.id}">Open the request</button></div></div>`
      : canPrice() ? `<p class="small">You set the price on Details. <button class="linklike" data-go="a-courses" data-id="${c.id}" data-tab="details">Go to Details</button></p>` : s1Can() ? `<button class="btn btn-primary" data-act="aafcPriceReq" data-id="${c.id}">${ic('plus', 14)}Request a price…</button>` : ''}
    ${reqs.length ? `<h3 class="small">Price requests</h3><ul class="list small">${reqs.map(i => `<li class="li"><div class="li-b"><span><button class="linklike mono" data-go="a-queue" data-id="${i.id}">${i.id}</button> · ${money(i.data.proposed, 'GBP')} · ${esc(i.raisedBy)} · ${fd(i.raised)}</span>${i.decision ? `<span class="xs muted">${esc(i.decision)}${i.decidedBy ? ' — ' + esc(i.decidedBy) : ''}</span>` : ''}</div>${qchip(i.status)}</li>`).join('')}</ul>` : ''}</section>`;
  const check = c.status === 'Draft' ? `<section class="card"><h2>Before publishing</h2>${miss.length ? `<ul class="small aafc-miss">${miss.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : `<p class="small">${ic('check', 14)} Everything needed is in place. Publishing puts the course in Browse Courses at ${money(c.gbp, 'GBP')}.</p>`}<p class="xs muted">Certificate on completion: ${fcOn(sp) ? 'Yes' : 'No'}.</p></section>` : `<section class="card"><h2>Status</h2><p class="small">This course is ${esc(c.status)}${c.status === 'Published' ? ' and on sale in Browse Courses' : ''}.</p></section>`;
  return price + check;
}
const aafcAud = c => (ADMIN.audit || []).filter(a => a.module === 'Short Courses' && (new RegExp(`\\(${c.id}\\)$`).test(a.entity || '') || a.entity === c.title || String(a.entity || '').startsWith(c.title + ' · ')));
function aafcVersions(c) {
  const rows = aafcAud(c), ver = [], other = [];
  rows.forEach(a => { const m = String(a.action).match(/version (\d+)/i); if (m) ver.push({ v: +m[1], a }); else if (/^Course created/.test(a.action)) ver.push({ v: 1, a }); else if (/^(Published|Retired|Un-retired)/.test(a.action)) ver.push({ v: null, a }); else if (!/^Blocked|^Price requested/.test(a.action)) other.push(a); });
  const seen = ver.filter(x => x.v).map(x => x.v), lo = seen.length ? Math.min(...seen) : null;
  const gap = lo === null ? c.version : lo - 1;
  const counts = {}; Object.values(STORE.worlds || {}).forEach(w => (w && w.enrolments || []).forEach(e => { if (e.courseId === c.id) { const k = e.courseV == null ? 'n' : e.courseV; counts[k] = (counts[k] || 0) + 1; } }));
  const tr = x => `<tr><td class="nowrap">${x.v ? 'Version ' + x.v + (x.v === c.version ? ' <span class="xs muted">(current)</span>' : '') : '<span class="muted">Status</span>'}</td><td class="nowrap">${fdt(x.a.at)}</td><td>${esc(x.a.actor)}</td><td class="small">${esc(x.a.action)}${x.a.before && x.a.before !== '—' || x.a.after && x.a.after !== '—' ? `<div class="xs muted">${esc(x.a.before)} → ${esc(x.a.after)}</div>` : ''}</td><td class="small">${esc(x.a.reason || '—')}</td></tr>`;
  return `<section class="card aafc-ver"><h2>Version history</h2><p class="small muted">From the recorded saves of this course. Saving Details, Completion rules, Certificate or Validity — and an approved price — makes a new version; learners already enrolled stay on the version they enrolled on.</p>
    <div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Version</th><th>When</th><th>By</th><th>What changed</th><th>Reason</th></tr></thead><tbody>${ver.map(tr).join('')}${gap > 0 ? `<tr class="aafc-pre"><td class="nowrap">${gap === 1 ? 'Version 1' : `Versions 1–${gap}`}</td><td colspan="4" class="small muted">Recorded before this prototype's audit trail: no date, author or change details were kept.</td></tr>` : ''}</tbody></table></div>
    <p class="xs muted">Enrolments recorded on a version: ${Object.keys(counts).filter(k => k !== 'n').sort((a, b) => b - a).map(k => `Version ${k}: ${counts[k]}`).join(' · ') || 'none yet'}${counts.n ? ` · ${counts.n} made before versions were recorded on enrolments` : ''}.</p></section>
    <section class="card aafc-ver2"><h2>Changes that don't create a version</h2><p class="small muted">Content, modules, quiz questions and settings, and enrolment questions change the course for new enrolments only. Learners already enrolled keep the content, modules and quiz settings copied when they enrolled.</p>${other.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>When</th><th>By</th><th>Change</th></tr></thead><tbody>${other.map(a => `<tr><td class="nowrap">${fdt(a.at)}</td><td>${esc(a.actor)}</td><td class="small">${esc(a.action)}${a.after && a.after !== '—' ? `<div class="xs muted">${esc(a.before && a.before !== '—' ? a.before + ' → ' : '')}${esc(a.after)}</div>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small">None recorded.</p>'}</section>`;
}
const aafcVerNote = c => c.status === 'Draft'
  ? `<div class="note b-grey aafc-vnote">${ic('layers')}<div class="small"><strong>Draft — not published.</strong> Nobody can buy it yet. Saves are recorded in its Version history (now at version ${c.version}).</div></div>`
  : `<div class="note b-blue aafc-vnote">${ic('layers')}<div class="small"><strong>Version ${c.version} is current.</strong> Existing enrolments stay on the version they enrolled on. Saving creates Version ${c.version + 1}.</div></div>`;
const _ceAAFC = courseEditor;
courseEditor = function (id, t) {
  const c = s1Row(id); if (!c) return _ceAAFC.apply(this, arguments);
  t = t || 'details'; aafcCats();
  let h = _ceAAFC.call(this, id, t);
  const st = subtabs(S1_TABS, t, 'a-courses', c.id), k = h.indexOf(st); if (k < 0) return h;
  const vn = versionNote(c.version); h = h.replace(vn, aafcVerNote(c));
  const st2 = st.slice(0, -6) + `<button class="tab" role="tab" aria-selected="${t === 'publish'}" data-go="a-courses" data-id="${c.id}" data-tab="publish">Price &amp; publish</button></div>`;
  const at = h.indexOf(st), after = h.slice(at + st.length), head = h.slice(0, at) + aafcStepBar(c, t) + st2;
  if (t === 'versions') return head + aafcVersions(c);
  let rest = after;
  if (t === 'publish') rest = aafcPublishView(c) + after;
  if (t === 'completion') rest = rest.replace(/(<\/ul><\/section>)/, `$1${aafcLimitsAdmin(c)}`);
  if (c.status === 'Draft') rest = rest.replace(`>Save (creates Version ${c.version + 1})<`, '>Save draft<');
  return head + rest;
};
// Validity: say what it is (and isn't)
const _valAAFC = s1Validity;
s1Validity = function () { return _valAAFC.apply(this, arguments).replace('<p class="small muted">Used for certificates issued from now on.', '<p class="small muted">How long an issued certificate stays valid — not how long the learner can study (that is the access period on Details). Used for certificates issued from now on.'); };
// Short Courses list: Categories for the roles that manage them
const _listAAFC = SCREENS['a-courses'];
SCREENS['a-courses'] = function (p) {
  const h = _listAAFC.apply(this, arguments); if (p && p.id) return h; aafcCats();
  return s1Can() ? h.replace('<button class="btn btn-primary" data-act="newCourse">', `<button class="btn" data-act="aafcCats">${ic('layers', 15)}Categories</button><button class="btn btn-primary" data-act="newCourse">`) : h;
};

/* ---------- Records ---------- */
UXC.push(['AAF-C', 'Short courses and content (AA-FINAL C, 3 Nov 2026)', [
  'AA-08: Short Courses → Categories (also "Manage categories" on Details): add, rename, retire or restore a category, each with an audit entry; Super Administrator, System Administrators and Academic Admins only. Details chooses from the active categories. Existing categories joined the list by name; no course was changed.',
  'AA-09: Duration is a number and a unit (minutes, hours, days, weeks), checked on Save. A duration saved as free text earlier is shown as written until the course is saved again.',
  'AA-10: an Academic Admin requests a price (Price & publish → Request a price); the Super Administrator or a System Administrator approves it in the Approvals Queue ("Short-course price"), which sets the price as a new version. Publishing names the pending request until then.',
  'AA-11: a SCORM .zip is checked in the browser (imsmanifest.xml; SCORM 1.2 or 2004, title, SCOs) without running it; invalid packages are refused. The learner\'s player says SCORM content isn\'t run in the prototype and records completion without a score.',
  'AA-12: each module card has Add content and Add existing content; Add module asks for a module title. New modules start without questions.',
  'AA-16 / D5: a five-step bar with each step\'s status and guidance, required markers and hints, a Price & publish view, draft wording, and a Version history built from the recorded saves. New enrolments record their course version.',
  'AA-22: the access period (days from enrolment) is shown apart from each module quiz\'s countdown and attempts — on Details, Completion rules and the learner\'s course Overview. There is no course-wide timer.']]);
