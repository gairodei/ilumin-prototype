/* ============================================================
   AA-FOLLOWUP — two client decisions on top of AA-FINAL (3 Nov 2026; PD-AAFU-01…06). Loads after aaf-e-bundles.js.
   1. Course codes ("We only want the awarding-body course code"): fixed in place — the Academy course code path is removed
      from cb-details.js (field, validation, save, read-only row), with the CR patches that hid it (cr-config.js), the Review &
      Publish row (cb-review.js) and the builder header (cb-builder.js). The awarding body course code (pr.ref) is the one code
      entered, with the client's guidance (aaf-a-curriculum.js AAFA_REF_WHY, m-modes.js); still required as before (PD-AAF-A-01).
      The internal programme ID (pr.id) is unchanged and automatic. A code recorded earlier (pr.code) is never deleted: it is
      shown read-only as "Former Academy course code" on the form and the details. Lists and the learner's Overview say
      "Awarding body course code" (academic.js, admin-b.js, screens-a.js) — display only, no stored value changes.
   2. SCORM — Option C, demonstration only. The AA-11 package check stays (zip directory + imsmanifest.xml read as data;
      SCORM 1.2 / 2004 detected; invalid packages refused) and now also runs on Learning Resources. Every SCORM view, admin
      and learner, carries the client's notice and shows the package name, detected version and check result. Nothing marks a
      learner complete, passed or scored from SCORM: "Record completion" and "Complete scenario" are gone and their handlers
      refuse direct calls (logged); opening a preview doesn't change the item's state; the "Complete the interactive SCORM
      module" rule can't be chosen and isn't counted for completion, progress, quiz unlocking or certificates. Stored rules,
      packages, release rules and learners' records are not rewritten: a SCORM state or score recorded earlier stays as it is,
      labelled as a seeded demo record; completed enrolments and their certificates are untouched.
   ============================================================ */
'use strict';

const AAFU_SC = 'SCORM demonstration only. Package execution, persistent storage, progress tracking and completion reporting are not implemented in this prototype.';
const AAFU_SC_LRN = 'This is a preview of a feature planned for the full LMS, not a learning activity. Opening it doesn\'t count towards your progress, completion or certificate, and nothing is scored.';
const AAFU_SC_ADM = 'Only the package\'s imsmanifest.xml is read, in this browser. The package isn\'t stored or run, and learners can\'t complete it or be scored on it.';
const aafuNote = more => `<div class="note b-amber aafu-sc-note" role="note">${ic('info')}<div class="small"><strong>${esc(AAFU_SC)}</strong>${more ? ` ${esc(more)}` : ''}</div></div>`;
const aafuScRule = r => /^Complete the interactive SCORM/.test(String(r || ''));
// After the page heading (the note sits above the page's content)
function aafuAfterHead(h, x) {
  const i = h.indexOf('<div class="page-h">'); if (i < 0) return x + h;
  let d = 0; const re = /<div\b|<\/div>/g; re.lastIndex = i;
  for (let m; (m = re.exec(h));) { d += m[0] === '</div>' ? -1 : 1; if (!d) return h.slice(0, re.lastIndex) + x + h.slice(re.lastIndex); }
  return x + h;
}

/* ---------- The package, as recorded: name, detected version, check result (the same words for admin and learner) ---------- */
function aafuPkg(x) {
  const P = (x && x.pkg) || {}, name = P.file || (x && (x.src || x.ref)) || '';
  const ver = P.sample ? (x.scorm ? `${x.scorm} — chosen by hand (sample, not detected)` : 'Not detected (sample)') : P.version || (x && x.scorm) ? `${P.version || x.scorm}${P.version ? ' — detected from imsmanifest.xml' : ' — not detected'}` : 'Not recorded';
  const res = !x || !x.pkg ? 'Not checked — no package was checked for this item' : P.sample ? 'Not checked — prototype sample, not a real package'
    : `Valid — imsmanifest.xml declares ${P.version}${P.scos ? ` with ${plural(P.scos, 'SCO')}` : ''}`;
  return { name: name || 'No package file recorded', title: P.title || '', ver, res };
}
const aafuPkgDl = x => { const p = aafuPkg(x); return `<dl class="kv aafu-pkg"><dt>Package</dt><dd class="mono">${esc(p.name)}</dd>${p.title ? `<dt>Title in manifest</dt><dd>${esc(p.title)}</dd>` : ''}<dt>SCORM version</dt><dd>${esc(p.ver)}</dd><dt>Validation</dt><dd>${esc(p.res)}</dd></dl>`; };

/* ---------- Academic Admin: short-course content ---------- */
const _srcAAFU = s1SrcField;
s1SrcField = function (k) { const h = _srcAAFU.apply(this, arguments); return k === 'scorm' ? h + aafuNote(AAFU_SC_ADM) : h; };
const _pkShowAAFU = aafcPkgShow;
aafcPkgShow = function () {
  const r = _pkShowAAFU.apply(this, arguments), P = ui('aafcPkg', null), box = $('#aafc-pk');
  if (box && P && P.status === 'ok' && !P.sample) box.textContent = `Valid SCORM package: ${P.file} · ${P.version} detected${P.title ? ` · "${P.title}"` : ''} · ${plural(P.scos, 'SCO')}. Only imsmanifest.xml was read — nothing was run and the package isn't stored.`;
  if (box && P && P.status === 'bad') box.textContent = `Not accepted${ui('s1File', '') ? ` (${ui('s1File', '')})` : ''}: ${P.why}`;
  return r;
};
const _contAAFU = s1Content;
s1Content = function (c, sp) {
  let h = _contAAFU.apply(this, arguments); const sc = sp.items.filter(i => i.kind === 'scorm' && i.status === 'Active');
  if (!sc.length) return h;
  sp.items.filter(i => i.kind === 'scorm').forEach(i => { h = h.replace(new RegExp(`(SCORM package${i.scorm ? ' ' + i.scorm : ''}${i.src ? ' · ' + esc(i.src).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : ''} · (?:checked: [^<·]*|prototype sample \\(not checked\\)|not checked \\(added before package checks\\)))`), '$1 · demonstration only'); });
  return h.replace('<section class="card"><div class="row-b s1-ch">', () => aafuNote(AAFU_SC_ADM) + '<section class="card"><div class="row-b s1-ch">');
};
// Completion rules: the SCORM rule can't be chosen (its stored value is shown and kept, but never counted)
const _compAAFU = s1Completion;
s1Completion = function (c, sp) {
  const h = _compAAFU.apply(this, arguments);
  return h.replace(/<input type="checkbox" class="s1-rule" value="scorm"([^>]*)>([^<]*)<\/label>/, (m, a, l) => `<input type="checkbox" class="s1-rule" value="scorm"${a} disabled aria-describedby="aafu-sc-rule">${l}</label><span class="xs muted aafu-sc-rule" id="aafu-sc-rule">Not available — SCORM is a demonstration in this prototype, so it isn't tracked or counted towards completion.${sp.rules && sp.rules.scorm ? ' Ticked earlier; kept on the course but not applied.' : ''}</span>`);
};

/* ---------- Academic Admin: Learning Resources (the same package check; the note; no completion) ---------- */
const aafuRPk = () => ui('aafuRPk', null);
const aafuRSample = n => /\(sample\)\.zip$/.test(String(n || ''));
function aafuRShow() {
  const box = $('#aafu-rpk'); if (!box) return; const P = aafuRPk(), y = ($('#rs-y') || {}).value;
  box.className = 'hint aafu-rpk' + (P && P.status === 'bad' ? ' aafc-bad' : '');
  box.textContent = y !== 'SCORM' ? '' : aafuRSample(ui('s4bFile', '')) ? 'Prototype sample — not a real package, so it isn\'t checked and no version is detected.'
    : !P ? 'A SCORM .zip is checked in your browser when you choose it.' : P.status === 'checking' ? 'Checking the package…'
    : P.status === 'bad' ? `Not accepted (${P.name}): ${P.why}` : `Valid SCORM package: ${P.file} · ${P.version} detected${P.title ? ` · "${P.title}"` : ''} · ${plural(P.scos, 'SCO')}. Only imsmanifest.xml was read — nothing was run and the package isn't stored.`;
}
const _rFileAAFU = INP.s4bFile;
INP.s4bFile = function (el) {
  const r = _rFileAAFU.apply(this, arguments), f = el && el.files && el.files[0];
  if (!f || !/\.zip$/i.test(f.name)) { setUi('aafuRPk', null); aafuRShow(); return r; }
  const tok = {}; setUi('aafuRPk', { status: 'checking', name: f.name, tok }); aafuRShow();
  AAFC.pending = aafcZipManifest(f).catch(() => ({ ok: false, why: 'The package couldn\'t be read.' })).then(x => { const P = aafuRPk(); if (!P || P.tok !== tok) return x; setUi('aafuRPk', x.ok ? { status: 'ok', name: f.name, ...x } : { status: 'bad', name: f.name, why: x.why }); aafuRShow(); return x; });
  return r;
};
const _rSampleAAFU = ACT.s4bSample; ACT.s4bSample = function () { const r = _rSampleAAFU.apply(this, arguments); setUi('aafuRPk', null); aafuRShow(); return r; };
// A SCORM file is accepted only once its manifest has been checked; returns the package details, or false (field marked)
function aafuRCheck() {
  if (($('#rs-y') || {}).value !== 'SCORM') return null; const f = ui('s4bFile', ''), P = aafuRPk();
  if (!f || !/\.zip$/i.test(f)) return null; // the existing "Choose a file" / "Use a SCORM .zip file" checks answer
  if (aafuRSample(f)) return { sample: true, file: f };
  if (!P || P.name !== f) return fieldErr('#rs-f', 'Choose the package again so it can be checked'), false;
  if (P.status === 'checking') return fieldErr('#rs-f', 'Still checking the package — try again in a moment'), false;
  if (P.status === 'bad') return fieldErr('#rs-f', P.why), false;
  return { file: P.file, size: P.size, title: P.title, version: P.version, scos: P.scos, launch: P.launch, checked: now().toISOString(), by: ADMIN.me.name };
}
// The resource dialogs: the note and the check's status under the file field; the save waits for a valid package
function aafuRDlg(m0, after) {
  if (!MODAL || MODAL === m0 || typeof MODAL.body !== 'string') return;
  const add = h => (h && h.includes('id="rs-f"') && !h.includes('aafu-rpk') ? h.replace(/(<input class="input" type="file" id="rs-f"[^>]*>)/, '$1<span class="hint aafu-rpk" id="aafu-rpk" role="status"></span>') + aafuNote(AAFU_SC_ADM) : h);
  MODAL.body = add(MODAL.body);
  const a = MODAL.actions && MODAL.actions.find(x => x.cls && /primary/.test(x.cls)); if (a && a.fn) { const g = a.fn; a.fn = (...x) => { const pk = aafuRCheck(); if (pk === false) return false; const r = g(...x); if (r !== false && pk) after(pk); return r; }; }
  renderModal(); aafuRShow();
}
const _rAddAAFU = ACT.aUpload;
ACT.aUpload = function () { setUi('aafuRPk', null); const m0 = MODAL, r = _rAddAAFU.apply(this, arguments); const n0 = S4B().res.length; aafuRDlg(m0, pk => { if (S4B().res.length > n0) S4B().res[0].pkg = pk; }); return r; };
const _rVerAAFU = ACT.s4bVer;
ACT.s4bVer = function (el) { setUi('aafuRPk', null); const m0 = MODAL, r = _rVerAAFU.apply(this, arguments), res = s4bRes(el && el.dataset && el.dataset.id), v0 = res && res.version; aafuRDlg(m0, pk => { if (res && res.version > v0) res.pkg = pk; }); return r; };
// The list and the previews
const _resScrAAFU = SCREENS['a-resources'];
SCREENS['a-resources'] = function () { const h = _resScrAAFU.apply(this, arguments).split(AAFU_SEED_DESC).join(AAFU_SEED_DEMO); return S4B().res.some(r => r.kind === 'scorm' && r.status !== 'Retired') ? aafuAfterHead(h, aafuNote(AAFU_SC_ADM)) : h; };
const AAFU_PREV = '<h3>SCORM preview</h3><p>Preview mode — no tracking recorded.</p>';
const aafuPrevBody = x => `<h3>SCORM package</h3>${aafuNote()}${aafuPkgDl(x)}`;
const _prevAAFU = ACT.s4bPrev;
ACT.s4bPrev = function (el) { const m0 = MODAL, r = _prevAAFU.apply(this, arguments), x = s4bRes(el && el.dataset && el.dataset.id); if (MODAL && MODAL !== m0 && x && x.kind === 'scorm') { MODAL.body = MODAL.body.replace(AAFU_PREV, () => aafuPrevBody(x)); renderModal(); } return r; };
const _cooResAAFU = ACT.cooRes;
ACT.cooRes = function (el) { const m0 = MODAL, r = _cooResAAFU.apply(this, arguments), x = (ADMIN.resources || []).find(y => y.id === (el && el.dataset && el.dataset.id)); if (MODAL && MODAL !== m0 && x && x.type === 'SCORM') { const s = S4B().res.find(y => y.id === x.id) || x; MODAL.body = MODAL.body.replace(AAFU_PREV, () => aafuPrevBody(s)); renderModal(); } return r; };

/* ---------- Learner: short-course content ---------- */
const aafuSeeded = c => c.state === 'Completed' && !c.manualAt; // a state recorded before SCORM became a demonstration
const aafuChip = c => (c.state === 'Completed' ? chip(aafuSeeded(c) ? 'Completed (seeded demo record)' : 'Completed (recorded earlier)', 'grey') : chip('Demonstration only', 'grey'));
// A SCORM row's button reads "Preview" (never primary) and its status chip says what it is — edited on the markup, whatever made it
function aafuRows(h, sel, chipOf) {
  const t = document.createElement('template'); t.innerHTML = h; let n = 0;
  t.content.querySelectorAll(sel).forEach(b => {
    const [x, html] = chipOf(b) || []; if (!x) return; n++;
    b.textContent = 'Preview'; b.classList.remove('btn-primary'); b.setAttribute('aria-label', 'Preview SCORM demonstration: ' + x.title);
    const c = b.previousElementSibling; if (c && c.classList.contains('chip')) c.outerHTML = html; else b.insertAdjacentHTML('beforebegin', html);
  });
  return n ? t.innerHTML : h;
}
const _ctAAFU = shortContent_;
shortContent_ = function (e) {
  const h = _ctAAFU.apply(this, arguments), sc = (e.content || []).filter(c => c.kind === 'scorm'); if (!sc.length) return h;
  return aafuNote(AAFU_SC_LRN) + aafuRows(h, `[data-act="openItem"][data-e="${CSS.escape(e.id)}"]`, b => { const c = sc.find(x => x.id === b.dataset.id); return c ? [c, aafuChip(c)] : null; });
};
const aafuScBody = (e, c) => `${aafuNote(AAFU_SC_LRN)}${aafuPkgDl(c)}<dl class="kv"><dt>Your progress</dt><dd>${c.state === 'Completed' ? `${esc(aafuSeeded(c) ? 'Completed (seeded demo record) — kept as recorded' : 'Completed (recorded earlier) — kept as recorded')}` : 'Not tracked — SCORM is a demonstration in this prototype'}</dd></dl>`;
const _openAAFU = ACT.openItem;
ACT.openItem = function (el) {
  const d = (el && el.dataset) || {}, e = enrolById(d.e), c = e && (e.content || []).find(x => x.id === d.id);
  if (!c || c.kind !== 'scorm') return _openAAFU.apply(this, arguments);
  const st = c.state, m0 = MODAL, r = _openAAFU.apply(this, arguments); c.state = st; // a preview isn't progress
  if (r !== false && MODAL && MODAL !== m0) { MODAL.title = esc(c.title); MODAL.sub = 'SCORM demonstration'; MODAL.body = aafuScBody(e, c); MODAL.actions = [{ label: 'Close', cls: 'btn-primary' }]; renderModal(); }
  return r;
};
// The old completion action is refused, also when called directly (an ended access is still refused first, by AA-1)
const aafuNo = (ent, what) => { logA('Short Courses', ent, `Blocked: ${what} (SCORM is a demonstration only)`, '—', '—', S.portal === 'learner' ? chFullName(W) : (ADMIN.me || {}).name || '—'); closeModal(); toast('SCORM is a demonstration in this prototype: it can\'t be completed or scored.', 'err'); return false; };
const _finAAFU = ACT.scormFinish;
ACT.scormFinish = function (el) {
  const d = (el && el.dataset) || {}, e = enrolById(d.e);
  if (e && S.portal === 'learner' && aa1AccessWhy(e)) return _finAAFU.apply(this, arguments);
  return aafuNo(e ? `${chFullName(W)} · ${e.title}` : '—', 'record SCORM completion');
};
// Completion, progress and the next step leave SCORM out; what was recorded stays as it is
const _recAAFU = recalcShort;
recalcShort = function (e) {
  const was = (e.reqs || []).map(([r, ok]) => ok), r = _recAAFU.apply(this, arguments);
  e.reqs = e.reqs.map(([q, ok], i) => [q, aafuScRule(q) && i < was.length ? was[i] : ok]);
  const cs = (e.content || []).filter(c => c.kind !== 'scorm'), mods = shMods(e);
  if (e.status !== 'Completed' && cs.length < (e.content || []).length && cs.length + mods.length) e.progress = Math.round((cs.filter(c => c.state === 'Completed').length + mods.filter(shPassed).length) / (cs.length + mods.length) * 100);
  return r;
};
const _compShAAFU = shComplete;
shComplete = function (e) {
  if (!e || !e.reqs || !e.reqs.some(([q]) => aafuScRule(q))) return _compShAAFU.apply(this, arguments);
  const all = e.reqs; e.reqs = all.filter(([q]) => !aafuScRule(q));
  try { return _compShAAFU.apply(this, arguments); } finally { e.reqs = all; }
};
const _reqKAAFU = cfReqKinds;
cfReqKinds = function () { const k = _reqKAAFU.apply(this, arguments); k.delete('scorm'); return k; };
const _ovAAFU = shortOverview;
shortOverview = function (e) {
  let h = _ovAAFU.apply(this, arguments); if (e.status === 'Completed') return h; // completed under the rules of the time: shown as recorded
  (e.reqs || []).filter(([q]) => aafuScRule(q)).forEach(([q, ok]) => { h = h.replace(`<span>${esc(q)}</span></div>${chip(ok ? 'Done' : 'To do')}`, () => `<span>${esc(q)}</span><span class="xs muted aafu-sc-req">Not counted — SCORM is a demonstration in this prototype.</span></div>${chip('Not counted', 'grey')}`); });
  return h;
};

/* ---------- Learner: Learning Resources ---------- */
// The seeded SCORM resource's description promised scoring: shown as a demonstration (the stored text is unchanged)
const AAFU_SEED_DESC = 'Interactive branching scenario with scoring.', AAFU_SEED_DEMO = 'Interactive branching scenario — SCORM demonstration, not scored.';
const aafuResItems = () => (W.resources || []).flatMap(g => g.items || []);
const aafuResOf = i => (typeof S4B === 'function' && i.s4id && S4B().res.find(r => r.id === i.s4id)) || i;
const _lResAAFU = SCREENS.resources;
SCREENS.resources = function () {
  let h = _lResAAFU.apply(this, arguments); const sc = aafuResItems().filter(i => i.kind === 'scorm'); if (!sc.length) return h;
  h = aafuRows(h, '[data-act="openRes"]', b => { const i = sc.find(x => x.id === b.dataset.id); return i ? [i, chip(i.state === 'Completed' ? 'Completed (seeded demo record)' : 'Demonstration only', 'grey')] : null; });
  h = h.split(AAFU_SEED_DESC).join(AAFU_SEED_DEMO);
  return h.includes('aafu-sc-note') ? h : aafuAfterHead(h, aafuNote(AAFU_SC_LRN));
};
const _oResAAFU = ACT.openRes;
ACT.openRes = function (el) {
  const i = aafuResItems().find(x => x.id === (el && el.dataset && el.dataset.id));
  if (!i || i.kind !== 'scorm') return _oResAAFU.apply(this, arguments);
  const st = i.state, m0 = MODAL, r = _oResAAFU.apply(this, arguments); if (r !== false && i.state !== 'Locked') i.state = st; // a preview isn't progress
  if (r !== false && MODAL && MODAL !== m0) { MODAL.body = `${aafuNote(AAFU_SC_LRN)}${aafuPkgDl(aafuResOf(i))}`; MODAL.actions = [{ label: 'Close', cls: 'btn-primary' }]; renderModal(); }
  return r;
};
ACT.resScorm = el => { const i = aafuResItems().find(x => x.id === (el && el.dataset && el.dataset.id)); return aafuNo(i ? `${S.portal === 'learner' ? chFullName(W) + ' · ' : ''}${i.title}` : '—', 'complete a SCORM resource'); };

/* ---------- Records ---------- */
UXC.push(['AA-FOLLOWUP', 'Course codes simplified; SCORM a labelled demonstration (3 Nov 2026)', [
  'Course codes: NVQ Course Details has one code field, "Awarding body course code" — "Enter the course code provided by NCFE or the relevant awarding body." It stays required, as before. The Academy course code is no longer entered, checked or saved anywhere (form, Review & Publish, builder header). The internal programme ID is automatic and read-only. A code recorded earlier is kept and shown read-only as "Former Academy course code". Programme lists and the learner\'s Overview say "Awarding body course code".',
  'SCORM (client Option C): every SCORM view says "' + AAFU_SC + '" Choosing a .zip still checks imsmanifest.xml (SCORM 1.2 or 2004 detected; invalid packages refused) — now also for Learning Resources — and shows the package name, detected version and result. Learners see a preview with the same details and a Close button; nothing is completed, passed or scored, and opening it doesn\'t change progress. The "Complete the interactive SCORM module" rule can\'t be chosen and isn\'t counted. States and scores recorded earlier are kept and labelled.',
]]);
const _aIdxAAFU = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxAAFU(p) + `<section class="card idx-sec"><h2>AA-FOLLOWUP — Course codes and SCORM demonstration</h2><ul class="idx-list">${[
  chIdxLi('New NVQ programme — Awarding body course code', { act: 'aJump', t: 'a-programmes.new.details' }, 'AA-FOLLOWUP — the one course code; the internal ID is automatic.'),
  chIdxLi('Short course → Content (SCORM demonstration)', { act: 'aJump', t: 'a-courses.SC-01.content' }, 'AA-FOLLOWUP — package check; demonstration notice; no completion from SCORM.')].join('')}</ul></section>`;
