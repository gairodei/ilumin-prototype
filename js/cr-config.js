/* ============================================================
   CR — Course and batch configuration revisions (23 Oct 2026; PD-CR-* in PROVISIONAL-DECISIONS.md). User-confirmed requirements.
   1. Delivery modes by course. DM (26 Oct 2026, PD-DM-*) supersedes the separate setting described here: a course's modes now come
      from its fee options (section 1 below); STORE.crDm is kept only as a legacy value with its history.
      As built in CR: Course Details recorded the modes a course offers (Self-Paced, Fully Assisted or both), for every
      level: STORE.crDm[pid] (with its history). Create batch shows only those modes, as checkboxes. A course with mode-specific
      fee options (Level 3, and any Level 2, 4 or 5 course once Finance approves such options for it) keeps W1/M's fee-option
      checkboxes: the accepted fee options stay the batch's record and each learner's mode comes from their option. A course
      without them takes one mode per batch (b.dmode, as before); offering both is possible once each mode has an approved fee
      option (Section 5 — Fees & Payments, Finance approval), so each learner's mode is fixed with their terms. Fee options must
      use a mode the course offers. Courses with no configuration keep working exactly as before (Level 3: the modes of its
      fee options; others: one mode chosen per batch) until an administrator configures them ("Configure delivery modes",
      audited, for future batches only). No fee option, batch or learner record is created or changed.
   2. Course Details no longer asks for the Academy's course code. Values already recorded are kept (shown as historical).
   3. Add unit no longer asks for a unit code: a stable internal reference (U + three digits, never reused within the programme's
      versions) is assigned. Criterion codes, mappings, evidence and existing units are unchanged.
   4. Assignment deadlines belong to the batch: STORE.crd[batchCode][assignmentId]. Definitions no longer carry a deadline
      (older definitions keep theirs as a legacy course-level date, used for a batch until that batch sets its own). A batch
      without a deadline doesn't issue the assignment until one is set. Changing a batch deadline updates only its learners who
      haven't submitted; submitted, marked and completed work, resubmission deadlines and individual extensions are kept.
   5. Awarding body batch code (b.abCode): optional, separate from the Academy's batch code, never used as an identifier; set at
      creation, in Edit batch details or with "Record", audited with history.
   Loads last.
   ============================================================ */
'use strict';

const _isCR = initStore; initStore = function () { STORE.crDm = null; STORE.crd = null; return _isCR.apply(this, arguments); };
const crEntB = b => `${b.label} (${b.code})`;
const crNo = (module, entity, what, why) => { logA(module, entity, 'Blocked: ' + what, '—', '—', why); toast(why, 'err'); return false; };

/* ================= 1. Delivery modes offered by a course — derived from its fee options (DM, 26 Oct 2026; PD-DM-*) =================
   A course offers exactly the modes of its configured fee options (each option has one mode; several options may share a mode),
   for every level. "Configured" means an active, mode-specific option in force (R1 store) or in the course's working financial
   package (Section 5 — Fees & Payments, the same records Course Details lists, with the same IDs), including one awaiting Finance.
   Finance approval never hides a mode: it is shown per mode and gates enrolment only. There is no separate "Delivery modes offered"
   setting any more. A course with no mode-specific fee option keeps working as before: a value recorded by CR's former setting
   (STORE.crDm, kept with its history) still applies until fee options are configured; otherwise Level 3 learners on the Standard
   programme fee follow their batch's mode, and other levels have one programme price and one mode per batch. */
const CRDM = () => (STORE.crDm = STORE.crDm || {});
const CRFO = () => (STORE.crFo = STORE.crFo || {}); // non-Level 3 courses an administrator moved to fee options by delivery mode
const _isFoCR = initStore; initStore = function () { STORE.crFo = null; return _isFoCR.apply(this, arguments); };
const crLegacyCfg = pr => { const c = pr && CRDM()[pr.id]; return c && c.modes.length ? c : null; };
// modes of the programme's active, mode-specific fee options in force (the legacy Standard programme fee has none)
const crOptModes = pid => M_MODES.filter(m => r1Opts(pid).some(o => o.status === 'Active' && !o.legacy && o.mode === m));
// …and of the options configured in its working package (read raw: cb8Work derives through cb8L3, which reads this), or in a
// package Finance approved for a draft version, held until that version is published (DM-L, PD-DM-13)
const crWorkOpts = pr => { if (!pr || typeof CB8 !== 'function') return []; const w = CB8().work[pr.id]; if (w && !w.derived) return w.opts; const wf = CB8().wf[pr.id]; return wf && wf.held && wf.held.pkg ? wf.held.pkg.opts : []; };
const crFoModes = pr => !pr ? [] : M_MODES.filter(m => crOptModes(pr.id).includes(m) || crWorkOpts(pr).some(o => o.status === 'Active' && !o.legacy && o.mode === m));
const crCfg = pr => { const ms = crFoModes(pr); if (ms.length) return { modes: ms, src: 'fee options' }; const c = crLegacyCfg(pr); return c ? { modes: M_MODES.filter(m => c.modes.includes(m)), src: 'legacy', by: c.by, at: c.at } : null; };
// What a course offers new batches (nothing is invented when no fee option has a mode)
function crModes(pr) {
  const c = crCfg(pr); if (c) return { modes: c.modes, src: c.src };
  return pr && r1IsL3Pid(pr.id) ? { modes: [], src: 'fee options' } : { modes: [], src: 'none' };
}
// Fee options with modes (Section 5): Level 3, any course holding or configuring them, one moved to them, or a former two-mode setting
const crMultiFee = pr => !!pr && (pr.level === 'Level 3' || r1IsL3Pid(pr.id) || !!CRFO()[pr.id] || crWorkOpts(pr).some(o => o.status === 'Active' && !o.legacy && o.mode) || ((crLegacyCfg(pr) || {}).modes || []).length > 1);

// An option's Finance state: in force before packages ('force'), approved in the package in force, waiting for Finance, or not yet sent
function crFoSt(pr, o) {
  if (typeof cb8Managed !== 'function' || !cb8Managed(pr)) return o.status === 'Active' ? 'force' : 'retired';
  const cur = cb8Cur(pr.id), x = cur && cur.opts.find(y => y.id === o.id && y.status === 'Active');
  if (x && x.mode === o.mode && x.fee === o.fee && x.label === o.label) return 'approved';
  const wf = cb8Wf(pr), h = wf && wf.status === 'Approved' && wf.held && wf.held.pkg.opts.find(y => y.id === o.id && y.status === 'Active');
  if (h && h.mode === o.mode && h.fee === o.fee && h.label === o.label) return 'held';
  return wf && wf.status === 'Pending' ? 'pending' : 'draft';
}
const CR_FOST = { force: ['In force', 'green'], approved: ['Approved by Finance', 'green'], held: ['Approved by Finance — in force when the draft version is published', 'blue'], pending: ['Waiting for Finance review', 'amber'], draft: ['Finance approval required', 'amber'], retired: ['Retired', 'grey'] };
// The course's fee options, one list for Course Details (the working package when there is one, else the options in force)
const crFoOpts = pr => ((typeof cb8Managed === 'function' && cb8Managed(pr)) ? cb8Work(pr).opts : r1Opts(pr.id)).filter(o => o.status === 'Active');
const crModeSt = (pr, m) => { const st = crFoOpts(pr).filter(o => !o.legacy && o.mode === m).map(o => crFoSt(pr, o)); return st.some(s => s === 'approved' || s === 'force') ? 'approved' : st.includes('held') ? 'held' : st.includes('pending') ? 'pending' : 'draft'; };
const crFeesGo = pr => `<button class="btn btn-sm" data-go="a-programmes" data-id="${pr.id}" data-tab="payments">Section 5 — Fees &amp; Payments</button>`;
function crFoList(pr) {
  const os = crFoOpts(pr); if (!os.length) return '<p class="small muted cr-fo-none">No fee options yet.</p>';
  return `<ul class="list small cr-fo-l">${os.map(o => { const [t, c] = CR_FOST[crFoSt(pr, o)]; return `<li class="li cr-fo" data-o="${esc(o.id)}"><span class="code">${esc(o.id)}</span> <strong>${esc(o.label || 'Unnamed fee option')}</strong> · ${esc(o.legacy ? R1_LEGACY_MODE : o.mode || 'No delivery mode')} · ${o.fee > 0 || o.legacy ? money(o.legacy ? r1FeeOf(o) : o.fee, 'GBP') : '<span class="muted">fee not set</span>'} ${chip(t, c)}</li>`; }).join('')}</ul>`;
}
const crModesHtml = pr => {
  const m = crModes(pr), c = crCfg(pr), hist = (CRDM()[pr.id] || {}).hist ? ` <button class="btn btn-sm btn-ghost" data-act="crDmHist" data-id="${pr.id}">Former setting</button>` : '';
  if (m.src === 'fee options' && m.modes.length) return `<span class="cr-dm-v">${m.modes.map(x => { const [t, k] = CR_FOST[crModeSt(pr, x)]; return `<span class="cr-dm-m" data-m="${x}">${chip(x, x === 'Self-Paced' ? 'blue' : 'grey')} ${chip(t, k)}</span>`; }).join(' ')}</span> <span class="xs muted">From the course's fee options — each fee option has one delivery mode. New batches can use a mode once Finance has approved its fee options and the version is published.</span>${hist}`;
  if (m.src === 'legacy') return `<span class="cr-dm-v">${esc(mTxt(m.modes))}</span> <span class="xs muted">Recorded by ${esc(c.by)} on ${fd(c.at)}, before delivery modes came from fee options (kept). Fee options with a delivery mode replace it once they are configured.</span>${hist}`;
  const est = crEstMode(pr), run = `${est ? ` Its existing batches and learners run as ${est} on this price and stay as they are.` : ' Its existing batches and learners stay as they are.'} It can't take new batches until a version with Finance-approved fee options by delivery mode is published.`;
  return `<span class="muted cr-dm-v cr-nc-ro">${CR_NC_T}</span> <span class="xs muted">${m.src === 'fee options' ? 'Only the Standard programme fee from before fee options, with no delivery mode.' : `One programme price${crNcFee(pr) ? ` (${money(crNcFee(pr), 'GBP')})` : ''}, with no delivery mode.`}${run} To offer Self-Paced and Fully Assisted, configure fee options by delivery mode in Section 5 — Fees &amp; Payments; Finance approves them.</span>`;
};
/* ---------- DM-L (26 Oct 2026; PD-DM-11…14) and DM-P: a course whose delivery modes aren't configured ----------
   A course with no mode-specific fee option (one programme price, or only the Level 3 Standard programme fee) offers no delivery
   mode and takes no new batches (DM-P). Its established mode — the one mode all its batches have, or with no batches the support type
   recorded for it — is what its existing batches and learners keep. The upgrade path is Course Builder: a new version, Section 5
   (record the duration for a pre-builder course, start a financial package, fee options by delivery mode), Finance, publication. */
const CR_NC_T = 'Delivery modes not configured for this course';
function crEstMode(pr) {
  if (!pr) return null;
  const ms = [...new Set((ADMIN.batches || []).filter(b => b.course === pr.title && N2_MODES.includes(b.dmode)).map(b => b.dmode))];
  if (ms.length) return ms.length === 1 ? ms[0] : null;
  const s = chSupports()[pr.id]; return s === 'Self-paced' ? 'Self-Paced' : s === 'Fully assisted' ? 'Fully Assisted' : null; // recorded, never a default
}
// The one price such a course has: the Standard programme fee (Level 3) or the programme fee in force
const crNcFee = pr => { const s = r1StdOf(pr.id), o = s && r1Opt(s); if (o) return r1FeeOf(o); const p = s4PlanCur(pr.id); return p ? p.fee : (NVQ_FEES[pr.title] || null); };
const crNcPrice = pr => `${r1StdOf(pr.id) ? 'Standard programme fee' : 'programme price'}${crNcFee(pr) ? ` (${money(crNcFee(pr), 'GBP')})` : ''}`;

/* ---------- Course Details form: no separate modes field; fee options for every level (a one-price course stays as before) ---------- */
// DM-P (PD-DM-18): fee options by delivery mode are the default; "One programme price" stays only for the established single-price draft
// and Finance-terms workflow (E1/E2) — such a course can't be published until each fee has a delivery mode (Section 5)
const CR_PM_HINT = 'Fee options by delivery mode: each option has one mode, and the course offers the modes its options use — one batch can take both. One programme price: the draft and its payment terms can be prepared, but the course cannot be published until each fee has a delivery mode (Section 5 — Use fee options by delivery mode).';
const crPmField = pm => `<fieldset class="field full cr-pm" style="border:0;padding:0"><legend class="lbl">How is this course priced?</legend><div class="row">${[['opts', 'Fee options by delivery mode'], ['price', 'One programme price (draft only until fee options are added)']].map(([v, l]) => `<label class="check"><input type="radio" name="cr-pm" id="cr-pm-${v}" value="${v}" data-onchange="crPm" ${pm === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div><span class="hint">${esc(CR_PM_HINT)}</span></fieldset>`;
const _snapCR = cbSnap; cbSnap = function (form) { const s = _snapCR.apply(this, arguments); const p = form.querySelector('input[name="cr-pm"]:checked'); if (p) s.pm = p.value; return s; };
const _cbFormCR = cbForm;
cbForm = function (pr, key) {
  let h = _cbFormCR.apply(this, arguments); const c = CB_CACHE[key];
  h = h.replace(/<div class="field"><label for="np-code">[\s\S]*?<\/div>/, '')                 // 2. no Academy course code
    .replace('<label for="np-t">Title</label>', '<label for="np-t">Course name</label>')
    .replace('Separate from the Academy&#39;s course code.', 'Separate from the Academy&#39;s own records.').replace("Separate from the Academy's course code.", "Separate from the Academy's own records.")
    .replace(/<fieldset class="field full r1-np-sup"[^>]*>/, '<fieldset class="field full r1-np-sup" style="border:0;padding:0" hidden="">'); // modes come from the fee options
  // an existing course: its fee options (the Section 5 records, with their Finance state) and the modes they give
  h = h.replace(/<div class="field full r1-np-opts"><span class="lbl">Fee options<\/span><ul class="list small">[\s\S]*?<\/ul><span class="hint">[^<]*<\/span><\/div>/, () => `<div class="field full r1-np-opts cr-fo-f"><span class="lbl">Fee options</span>${crFoList(pr)}<span class="hint">Managed in Section 5 — Fees &amp; Payments. These are the same records: they are changed there and approved by Finance. Delivery modes offered: <strong class="cr-fo-m">${esc(mTxt(crModes(pr).modes))}</strong>.</span></div>`);
  if (pr && pr.id && pr.level !== 'Level 3' && crFoOpts(pr).some(o => !o.legacy && o.mode)) h = h.replace(/<div class="r1-np-l3 field full" hidden/, '<div class="r1-np-l3 field full"');
  // a new course of another level: choose fee options by delivery mode or one programme price (the default, as before)
  if (h.includes('class="r1-np-list"')) { const pm = (c && c.pm) || 'opts', i = h.indexOf('<div class="field r1-np-price"'); if (i >= 0) h = h.slice(0, i) + crPmField(pm) + h.slice(i); }
  return h;
};
// 2. The Academy's course code isn't entered any more: a programme keeps the code it has (never cleared, never invented)
cbCodeRead = function (pr) { return pr && pr.code ? pr.code : null; };
const crPmOf = () => ($(`${r1Sc()} input[name="cr-pm"]:checked`) || {}).value || 'opts';
function crPmSync() {
  const sc = r1Sc(), lv = $(`${sc} #np-l`); if (!lv || !$(`${sc} .cr-pm`)) return; const l3 = lv.value === 'Level 3', opts = !l3 && crPmOf() === 'opts';
  $$(`${sc} .cr-pm`).forEach(x => { x.hidden = l3; });
  if (!l3) { $$(`${sc} .r1-np-l3`).forEach(x => { x.hidden = !opts; }); $$(`${sc} .r1-np-price`).forEach(x => { x.hidden = opts; }); }
}
const _lvCR = INP.r1NpLevel; INP.r1NpLevel = el => { const r = _lvCR(el); $$('main .cb-det-form .r1-np-sup').forEach(x => { x.hidden = true; }); crPmSync(); return r; };
INP.crPm = () => crPmSync();
const _rnPmCR = render; render = function () { const r = _rnPmCR.apply(this, arguments); try { crPmSync(); } catch (e) { /* no details form */ } return r; };
// Another level with fee options by delivery mode: the rows are read as for Level 3 (the single price isn't used)
const crPmNew = pr => !pr && v8('#np-l') !== 'Level 3' && crPmOf() === 'opts' && !!$(`${r1Sc()} .r1-np-list`);
const _readPmCR = ch8ReadDetails;
ch8ReadDetails = function (pr) {
  if (!crPmNew(pr)) return _readPmCR.apply(this, arguments);
  const P = $('#np-p'), keep = P.value; P.value = '1'; let d; try { d = _readPmCR.apply(this, arguments); } finally { P.value = keep; } if (!d) return null;
  const opts = r1NpRead(); if (!opts) return null;
  d.price = Math.min(...opts.map(o => o.fee)); d.r1opts = opts; return d;
};
const _createPmCR = ch8Create;
ch8Create = function (d) {
  const pr = _createPmCR.apply(this, arguments);
  if (pr && d && d.r1opts && pr.level !== 'Level 3' && !r1Opts(pr.id).length) {
    CRFO()[pr.id] = { at: now().toISOString(), by: ADMIN.me.name, r: 'Set when the course was created' }; R1().opts[pr.id] = [];
    d.r1opts.forEach(o => r1AddOpt(pr.id, { label: o.label, fee: o.fee, mode: o.mode }, 'Set when the programme was created', 'Added (new programme)'));
  }
  return pr;
};

/* ---------- Read-only Course Details: the fee options and the modes they give; the course code only as history ---------- */
const crCanCfg = pr => cbAdmin() && !cbRetired(pr);
const _viewCR = cbDetailsView;
cbDetailsView = function (pr) {
  let h = _viewCR.apply(this, arguments);
  h = h.replace(/<dt>Course code<\/dt><dd>[\s\S]*?<\/dd>/, () => pr.code ? `<dt>Former Academy course code</dt><dd><span class="mono">${esc(pr.code)}</span> <span class="xs muted">Kept for history — no longer entered.</span></dd>` : '');
  const fo = crFoOpts(pr).length && crMultiFee(pr) ? `<dt>Fee options</dt><dd class="cr-fo-ro">${crFoList(pr)}</dd>` : '';
  const go8 = crCanCfg(pr) && !h.includes('cb-feelink'); // the page's own "Open Fees & Payments" link (CB-F), where it has one
  return h.replace(/<dt>Delivery mode<\/dt><dd>[\s\S]*?<\/dd>/, () => `${fo}<dt>Delivery modes offered</dt><dd class="cr-dm-ro">${crModesHtml(pr)}${go8 ? ` ${crFeesGo(pr)}` : ''}</dd>`);
};
// The former setting (CR) is no longer edited: a direct call is refused and points to the fee options
ACT.crDmEdit = el => { const pr = cbPr(el && el.dataset && el.dataset.id); if (!pr) return; return crNo('NVQ Programmes', cbEnt(pr), 'set delivery modes separately', 'A course\'s delivery modes come from its fee options — configure them in Section 5 — Fees & Payments.'); };
ACT.crDmHist = el => { const c = CRDM()[el.dataset.id]; if (!c) return; openModal({ title: 'Former delivery-mode setting — history', body: `<p class="small muted">Recorded before delivery modes came from fee options. Kept for history; fee options with a delivery mode replace it.</p><ul class="list">${c.hist.slice().reverse().map(h => `<li class="li"><div class="li-b"><strong>${esc(h[3])}</strong><span class="small">Was: ${esc(h[2])}</span><span class="xs muted">${fdt(h[0])} · ${esc(h[1])} · ${esc(h[4])}</span></div></li>`).join('')}</ul>`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); };

/* ---------- Section 5: another level's single programme fee can become fee options by delivery mode (explicit, audited) ----------
   Nothing is invented: the existing programme fee stays in the draft package, without a mode until the administrator gives it one
   (or removes it); Finance approves the package as before. Learners, batches and the terms in force don't change until then. */
ACT.crFoStart = el => {
  const g = cb8Guard(el, 'use fee options by delivery mode'); if (!g) return; const { pr } = g;
  if (crMultiFee(pr)) return toast('This course already uses fee options by delivery mode.', 'info');
  reasonDlg({ title: 'Use fee options by delivery mode — ' + esc(pr.title), ok: 'Use fee options', body: `<p class="small">Each fee option will have one delivery mode, and the course will offer the modes its options use. The current programme fee stays in the draft package: give it a delivery mode, or remove it, and add other options. Nothing changes for learners or batches until Finance approves the package.</p>`, onOk: r => {
    if (!cb8Guard(el, 'use fee options by delivery mode')) return false;
    cb8Mut(pr); CRFO()[pr.id] = { at: now().toISOString(), by: ADMIN.me.name, r }; // the working copy is made first, so the programme fee is kept
    cb8Touch(pr, 'Fee options by delivery mode', 'One programme fee', 'Fee options by delivery mode', r); render(); toast('Fee options by delivery mode are on. Give each option a delivery mode, then submit to Finance.');
  } });
};
CB_WRITE.push('crFoStart');
const _panelCR = cb8Panel;
cb8Panel = function (pr) {
  const h = _panelCR.apply(this, arguments); if (crMultiFee(pr)) return h;
  const wf = cb8Wf(pr), ed = cbAdmin() && !cbRetired(pr) && !(wf && wf.status === 'Pending');
  return h.replace(/<p class="xs muted">[^<]*: one programme fee \(multiple fee options are a Level 3 feature — Q-CB-10\)\.[^<]*<\/p>/, () => `<div class="note b-grey cr-fo-one">${ic('info')}<div class="small"><strong>${CR_NC_T}.</strong> ${esc(pr.level)}: one programme price, with no delivery mode${crEstMode(pr) ? ` — its batches run as ${crEstMode(pr)}` : ''}. To offer Self-Paced and Fully Assisted with their own fees (several options per mode are allowed), use fee options by delivery mode.${ed ? ` <button class="btn btn-sm" data-act="crFoStart" data-p="${pr.id}">Use fee options by delivery mode</button>` : ''}</div></div>`);
};
/* DM-L (PD-DM-12): a course from before the builder has no structured duration, so no financial package could start and its delivery
   modes could never be configured. An authorized administrator records the duration (audited); nothing else changes. */
const crDurNo = (pr, why, msg) => { logA('Payment Plans', pr ? cb8Ent(pr) : '—', 'Blocked: record the course duration', '—', '—', why); toast(msg, 'err'); return false; };
const crDurWhy = pr => (!pr ? ['Programme not found', 'Programme not found.'] : !cbAdmin() ? ['Role can\'t change financial terms', 'Only the Super Admin, Academic Admin or System Admin change fees and payment options. Finance approves them.'] : cbRetired(pr) ? ['Programme retired', 'This programme is retired, so it is read-only.'] : null);
ACT.crDurRec = el => {
  const pr = cbPr(el && el.dataset && (el.dataset.p || el.dataset.id)), no = crDurWhy(pr); if (no) return crDurNo(pr, ...no);
  if (pr.durV) return toast('The duration is already recorded.', 'info');
  reasonDlg({ title: 'Record the course duration — ' + esc(pr.title), ok: 'Record duration', body: `<p class="small">Payment dates in a financial package are worked out from the course duration, so a package needs it. Recording it changes nothing for learners, batches or the payment terms in force.</p>`,
    extra: `<fieldset class="field e1-dur" style="border:0;padding:0"><legend class="lbl">Duration</legend><div class="e1-dur-row"><label class="sr" for="cr-du-n">Duration — number</label><input class="input num" type="number" min="1" max="${E1_DUR_MAX}" step="1" inputmode="numeric" id="cr-du-n" value=""><label class="sr" for="cr-du-u">Duration — unit</label><select class="select" id="cr-du-u">${E1_UNITS.map(([k, l]) => `<option value="${k}" ${k === 'months' ? 'selected' : ''}>${l}</option>`).join('')}</select></div></fieldset>`,
    onOk: r => {
      const again = crDurWhy(pr); if (again) { closeModal(); return crDurNo(pr, ...again); }
      const raw = mval('#cr-du-n').trim(), u = mval('#cr-du-u'), n = Number(raw);
      if (!/^\d+$/.test(raw) || !(n >= 1 && n <= E1_DUR_MAX)) { fieldErr('#cr-du-n', `Enter the duration as a whole number from 1 to ${E1_DUR_MAX}`); return false; }
      if (!E1_UNITS.some(x => x[0] === u)) { fieldErr('#cr-du-u', 'Choose days, weeks, months or years'); return false; }
      pr.durV = { n, unit: u }; const was = pr.dur || '—'; pr.dur = e1DurFmt(pr.durV);
      logA('NVQ Programmes', cbEnt(pr), 'Course duration recorded', was, pr.dur, r); render(); toast('Duration recorded. You can now start a financial package.');
    } });
};
CB_WRITE.push('crDurRec');
const _startCardCR = cb8StartCard;
cb8StartCard = function (pr) {
  const h = _startCardCR.apply(this, arguments); if (!h || pr.durV || crCfg(pr)) return h;
  return h.replace(/(<p class="small cb8-nodur">[\s\S]*?)(<\/p>)/, (x, a, b) => `${a}${b}<div class="note b-amber cr-nc-dur">${ic('info')}<div class="small"><strong>${CR_NC_T}.</strong> To give it fee options by delivery mode, record its duration first, then start a financial package. <button class="btn btn-sm" data-act="crDurRec" data-p="${pr.id}">Record the course duration</button></div></div>`);
};

// Builder header and Review & Publish: no Academy course code; the modes offered instead of the old default
const _pageCR = cbPage; cbPage = function (pr) { return _pageCR.apply(this, arguments).replace(/ · Course code <span class="mono cb-code">[^<]*<\/span>/, ''); };
const _rvSumCR = cbRvSummary;
cbRvSummary = function (pr, k) {
  const h = _rvSumCR.apply(this, arguments); if (k !== 'details') return h;
  return h.replace(/<dt>Course code<\/dt><dd>[\s\S]*?<\/dd>/, '').replace(/<dt>Default delivery mode for new batches<\/dt><dd>[\s\S]*?<\/dd>/, () => `<dt>Delivery modes offered</dt><dd>${crModesHtml(pr)}</dd>`);
};
const _rvWhereCR = cbRvWhere; cbRvWhere = function (pr, m) { return /delivery modes this course offers|Delivery modes offered/i.test(String(m)) ? ['details', 'details'] : _rvWhereCR.apply(this, arguments); };
const _rvChecksCR = cbRvChecks;
cbRvChecks = function (pr) {
  const out = _rvChecksCR.apply(this, arguments); if (!cbRvKind(pr)) return out;
  const tag = m => { const [sec, tab] = cbRvWhere(pr, m); return { msg: m, sec, tab }; }, c = crCfg(pr);
  if (c && c.src === 'fee options' && pr.status !== 'Draft') { const miss = c.modes.filter(m => !crOptModes(pr.id).includes(m)); if (miss.length) out.warn.push(tag(`Finance approval required for ${mTxt(miss)}: a fee option with ${miss.length > 1 ? 'these modes' : 'this mode'} is configured but not yet approved — no new batch can use it until Finance approves it and the version is published (Section 5 — Fees & Payments)`)); } // PD-CR-14: a warning, not a blocker (a Draft is already blocked on its package)
  crFoBlocks(pr).forEach(m => { if (!out.block.some(x => x.msg === m)) out.block.push({ msg: m, sec: 'payments', tab: 'fees' }); }); // DM-P (PD-DM-15)
  return out;
};
/* DM-P (PD-DM-15): publishing a new programme or version needs fee options by delivery mode — at least one, every active option with a
   mode (the Standard programme fee or a one-price "Programme fee" has none: give it a mode or retire it), in a financial package that
   Finance approves (cbFinGate, unchanged). Checked in Review & Publish and on every publish action, direct calls included. */
function crFoBlocks(pr) {
  if (!pr || cbRetired(pr) || !cbRvKind(pr)) return [];
  const pkg = typeof cb8Managed === 'function' && cb8Managed(pr), os = (pkg ? cb8Work(pr).opts : r1Opts(pr.id)).filter(o => o.status === 'Active'), out = [];
  if (!os.some(o => !o.legacy && M_MODES.includes(o.mode))) out.push('Fee options: add at least one fee option with a delivery mode (Self-Paced or Fully Assisted) in Section 5 — Fees & Payments');
  os.filter(o => o.legacy || !M_MODES.includes(o.mode)).forEach(o => out.push(`Fee option "${o.label || o.id}": choose its delivery mode (Self-Paced or Fully Assisted), or retire it, in Section 5 — Fees & Payments`));
  if (!pkg) out.push('Fee options: start a financial package in Section 5 — Fees & Payments, so Finance approves the fee options for this version');
  return out;
}
const _finGateCR = cbFinGate;
cbFinGate = function (pr) { const b = cbRvKind(pr) === 'draftVer' ? crFoBlocks(pr) : []; return b.length ? b[0] : _finGateCR.apply(this, arguments); }; // a new version (direct publish calls included)
// a new programme: its own publish check lists them with the other missing items ("Blocked: publish (items missing)")
const _ch8CheckCR = ch8Check;
ch8Check = function (pr) { const r = _ch8CheckCR.apply(this, arguments); crFoBlocks(pr).forEach(m => { if (!r.block.includes(m)) r.block.push(m); }); return r; };

// DM (PD-DM-01): fee options are the source of the modes, so no mode check against a separate setting (CR's checks removed)
// the options card is titled for any level that has options
const _r1CardCR = r1Card; r1Card = function (pid) { const h = _r1CardCR.apply(this, arguments), pr = r1Pr(pid); return pr && pr.level !== 'Level 3' ? h.replace('Level 3 fee options — ', 'Fee options — ') : h; };

/* ---------- Create batch (CR, DM; DM-P below): the delivery modes a new batch accepts ---------- */
let CR_NBM = null; // { code, course, modes, … } recorded at step 1, applied when the batch is created
const _nbNewCR = ACT.newBatch; ACT.newBatch = function () { CR_NBM = null; CR_ABC = null; return _nbNewCR.apply(this, arguments); };
const CR_FIN = 'Finance approval required';
/* ---------- DM-P (26 Oct 2026; PD-DM-15…21): only fully configured, published courses take NEW batches ----------
   Supersedes DM-L's Create-batch panel and established-mode tick (PD-DM-09/10), PD-CR-14's "configure a mode before Finance approves"
   and the Standard programme fee in new batches. A course is eligible for a new batch only when it is Active (published; not a draft,
   suspended, archived or retired) and its published version has Finance-approved fee options with a delivery mode in force. Create
   batch lists only those courses; its modes are the modes of those options, as checkboxes (one, the other or both); the Standard
   programme fee and any option without a mode are never offered to a new batch. Existing batches, learners and their terms are kept. */
const crApprOpts = pid => r1Opts(pid).filter(o => o.status === 'Active' && !o.legacy && M_MODES.includes(o.mode));
function crEligWhy(pr) {
  if (!pr) return 'Course not found';
  if (cbRetired(pr) || pr.status !== 'Active') return `${pr.title} is ${pr.status === 'Draft' ? 'a draft' : String(pr.status || 'not active').toLowerCase()} — only active, published courses take new batches`;
  if (!crApprOpts(pr.id).length) return `${pr.title} has no published, Finance-approved fee options with a delivery mode — publish a compliant version through Course Builder (Section 5 — Fees & Payments, then Review & Publish)`;
  return '';
}
const crElig = pr => !crEligWhy(pr);
const crEligTitles = () => s3Progs().filter(crElig).map(p => p.title);
function crNbBox() {
  const co = $('#modal-root #nb-co'); if (!co) return; ['#cr-nb', '.cr-nb-note', '.cr-src', '.cr-miss', '.cr-pend-sum', '.cr-nc-f'].forEach(s => $$('#modal-root ' + s).forEach(x => x.remove()));
  $$('#modal-root .m-l245').forEach(x => { x.style.display = 'none'; });
  const dm = $('#modal-root #nb-dm'), f = dm && dm.tagName === 'SELECT' && dm.closest('.field'); if (f) f.classList.add('cr-nc-hid'); // no single-select mode for a new batch
  const pid = s4PidOfTitle(co.value), pr = pid && s3Pr(pid), fs = $('#modal-root #w1-nb-acc'); if (!pr || !fs || !crElig(pr)) return;
  fs.querySelector('legend').textContent = 'Delivery modes accepted';
  fs.querySelector('legend').insertAdjacentHTML('afterend', `<p class="xs muted cr-src">This course offers: <strong>${esc(mTxt(crOptModes(pid)))}</strong> (from its published, Finance-approved fee options).</p>`);
}
// M's step-1 fieldset, built from the course's approved, mode-specific options only (W1 / M rendering, same IDs and defaults)
w1NbAcc = function () {
  const co = $('#modal-root #nb-co'), box = $('#modal-root #w1-nb-acc'); if (!co) return;
  const pid = s4PidOfTitle(co.value), pr = pid && s3Pr(pid), dm = $('#modal-root #nb-dm'), f = dm && dm.closest('.field');
  if (!pr || !crElig(pr)) { if (box) box.remove(); try { crNbBox(); } catch (e) { /* no batch form open */ } return; }
  const list = crApprOpts(pid), keep = W1_NB && W1_NB.course === co.value ? W1_NB.opts.filter(id => list.some(o => o.id === id)) : null;
  const html = `<fieldset class="field full w1-nb m-fs" id="w1-nb-acc" data-pid="${pid}" style="border:0;padding:0"><legend class="lbl">Delivery modes this batch accepts</legend>${mBlock({ pid, list, sel: keep || list.map(o => o.id), held: [], cls: 'w1-nb-o' })}</fieldset>`;
  if (box) box.outerHTML = html; else if (f) f.insertAdjacentHTML('afterend', html); else co.closest('.field').insertAdjacentHTML('afterend', html);
  INP.w1NbStd(); mSync($('#modal-root #w1-nb-acc')); try { crNbBox(); } catch (e) { /* no batch form open */ }
};
INP.w1NbStd = () => { const dm = $('#modal-root #nb-dm'), f = dm && dm.closest('.field'); if (f) f.classList.add('cr-nc-hid'); };
// The course list: eligible courses only (a note when none is)
function crNbCourses(body) {
  const ok = crEligTitles();
  return body.replace(/(<select class="select" id="nb-co"[^>]*>)([\s\S]*?)(<\/select>)/, (x, o, inner, cl) => {
    const kept = inner.replace(/<option([^>]*)>([^<]*)<\/option>/g, (y, at, t) => (ok.includes(unesc(t)) ? y : ''));
    const sel = /selected/.test(kept) ? kept : kept.replace('<option ', '<option selected ');
    return o + sel + cl + `<span class="hint cr-nb-elig">${ok.length ? 'Only active courses whose published version has Finance-approved fee options with a delivery mode are listed.' : 'No course is ready for new batches: a course needs a published version with Finance-approved fee options by delivery mode (Course Builder → Section 5 — Fees &amp; Payments, then Review &amp; Publish).'}</span>`;
  });
}
const unesc = s => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const crNbNo = (co, why) => { logA('Batches', co || '—', 'Blocked: create a batch — course not eligible', '—', '—', why); toast(why + '.', 'err'); return false; };

// The modes a batch is configured for: the modes it records and the modes of the fee options it accepts
const crBModes = b => { if (!b) return []; const own = Array.isArray(b.crModes) ? b.crModes : [], acc = w1L3(b) ? mModesOf(b) : (b.dmode ? [b.dmode] : []); return M_MODES.filter(m => own.includes(m) || acc.includes(m) || m === b.crBase); };
// One mode's readiness in a batch: 'ready' (open for enrolment), 'accept' (Finance approved an option; the batch hasn't enabled it), 'finance'.
// A single-mode batch from before keeps its own mode on the programme fee (b.crBase once another mode has been added to it).
function crReady(b, m) {
  const pr = b && s3Pr(r2Pid(b)); if (!pr) return 'ready';
  if (!crMultiFee(pr)) return 'ready';                                                     // one programme fee
  if (pr.level !== 'Level 3' && !Array.isArray(b.w1opts) && m === b.dmode) return 'ready'; // a single-mode batch from before: its own mode, unchanged
  if (pr.level !== 'Level 3' && b.crBase === m) return 'ready';                            // …its own mode, after another mode was added to it
  if (w1L3(b) && w1Accepted(b).some(o => o.status === 'Active' && (o.mode === m || (o.legacy && b.dmode === m)))) return 'ready';
  return crOptModes(pr.id).includes(m) ? 'accept' : 'finance';
}
const crReadyAny = b => crBModes(b).some(m => crReady(b, m) === 'ready');
const CR_RDY = { ready: ['Ready for enrolment', 'green'], accept: ['Approved by Finance — not enabled for this batch', 'blue'], finance: [CR_FIN, 'amber'] };
const crShowReady = b => !!b && (Array.isArray(b.crModes) || w1L3(b) || !!b.crBase);
// Who approved each mode's fee options, and when (the option's own history: the Finance approval of the package that added it)
function crApprovedTxt(pid, m) {
  return r1Opts(pid).filter(o => o.status === 'Active' && !o.legacy && o.mode === m).map(o => { const h = (o.hist || []).find(x => /financial package|Added/.test(x[2])); const q = h && (/\(([A-Z]{1,4}-[^)]+)\)/.exec(h[5] || '') || [])[1];
    return `${o.label}${h ? ` — approved ${fd(h[0])}${q ? ` (${q})` : ''}` : ''}`; }).join('; ');
}
function crReadyHtml(b, act) {
  const ms = crBModes(b); if (!ms.length) return '';
  const pid = r2Pid(b), row = m => { const k = crReady(b, m), [t, c] = CR_RDY[k], ap = k === 'finance' || crReady(b, m) === 'ready' && !crMultiFee(s3Pr(pid)) ? '' : crApprovedTxt(pid, m);
    return `<li class="cr-rdy-r" data-m="${m}" data-k="${k}"><span class="cr-rdy-m">${m}</span> ${chip(t, c)}${ap ? ` <span class="xs muted cr-rdy-ap">${esc(ap)}</span>` : ''}${k === 'accept' && act ? ` <button class="btn btn-sm" data-act="w1Opts" data-id="${b.code}">Enable fee options</button>` : ''}</li>`; };
  const more = act && crAddable(b).some(m => !ms.includes(m)) ? ` <button class="linklike small" data-act="w1Opts" data-id="${b.code}">Add a delivery mode</button>` : '';
  return `<div class="cr-rdy"><p class="small"><strong>Mode configured:</strong> ${esc(mTxt(ms))}. <strong>Ready for enrolment:</strong> ${esc(mTxt(ms.filter(m => crReady(b, m) === 'ready')))}.${more}</p><ul class="cr-rdy-l">${ms.map(row).join('')}</ul></div>`;
}

/* ---------- Adding or removing a delivery mode on an existing batch (Change and Edit batch details; the same rules as Create) ----------
   The configurable modes are the course's offered modes that the batch doesn't already have through an accepted fee option (or, for a
   single-mode batch from before, its own mode). Ticking one records it in b.crModes only: it shows "Finance approval required" (or
   "Approved — not enabled") and takes no one until an approved option of that mode is enabled for the batch. A mode with learners
   (enrolled or waitlisted) can't be removed; nor can a mode given by an accepted fee option (untick the options instead). */
const crFixed = b => { const pr = s3Pr(r2Pid(b)), acc = w1L3(b) ? mModesOf(b) : []; const base = b.crBase || (pr && pr.level !== 'Level 3' && !Array.isArray(b.w1opts) ? b.dmode : null); return M_MODES.filter(m => acc.includes(m) || m === base); };
// DM-P (PD-DM-19): only modes with published, Finance-approved fee options can be added (was: any mode configured in Course Builder)
const crAddable = b => { const pr = s3Pr(r2Pid(b)); if (!pr || !crElig(pr)) return []; const fx = crFixed(b); return crOptModes(pr.id).filter(m => !fx.includes(m)); };
// …and a fee option newly added to a batch must be an approved option with a delivery mode (the Standard programme fee stays only where a batch has it)
const _mCheckCR = mCheck;
mCheck = function (b, pick) {
  const r = _mCheckCR.apply(this, arguments); if (r !== '') return r;
  const bad = pick.filter(id => !w1Accepts(b, id) && !crApprOpts(r2Pid(b)).some(o => o.id === id));
  return bad.length ? w1Deny(b, 'add a fee option without a published delivery mode', `${bad.map(w1OptName).join(', ')} can't be added: a batch can newly accept only published, Finance-approved fee options with a delivery mode.`) : '';
};
function crBmBlock(b) {
  const ad = crAddable(b); if (!ad.length) return '';
  return `<fieldset class="field full cr-bm-fs" id="cr-bm-fs" style="border:0;padding:0"><legend class="lbl">Delivery modes configured for this batch</legend>
    <div class="cr-bm-l">${ad.map((m, k) => { const on = crBModes(b).includes(m), rd = crReady(b, m); return `<label class="check"><input type="checkbox" class="cr-bm" id="cr-bm-${k}" value="${m}" ${on ? 'checked' : ''}><span>${m} ${chip(CR_RDY[rd][0], CR_RDY[rd][1])}</span></label>`; }).join('')}</div>
    <span class="hint">Adding a mode changes only the batch's configured modes. No one can enrol in it until Finance has approved a fee option of that mode and it is enabled for this batch. Learners, their modes, fees and payment schedules don't change.</span></fieldset>`;
}
const crBmTicked = () => $$('#modal-root .cr-bm:checked').map(x => x.value).filter(m => M_MODES.includes(m));
const crBmNext = (b, t) => M_MODES.filter(m => crFixed(b).includes(m) || t.includes(m));
const crBmChanged = (b, t) => !!$('#modal-root #cr-bm-fs') && !mSame(crBmNext(b, t), crBModes(b));
// Why the change can't be saved ('' when it can)
function crBmWhy(b, t) {
  const c = crCfg(s3Pr(r2Pid(b))), bad = t.filter(m => !c || !c.modes.includes(m));
  if (bad.length) return `${mTxt(bad)} isn't offered by ${b.course}`;
  const gone = crBModes(b).filter(m => !crBmNext(b, t).includes(m)), mix = r2Mix(b), held = gone.filter(m => (mix[m] || 0) > 0 || (b.w1wait || []).some(x => w1ModeOfOpt(x.opt, b) === m));
  if (held.length) return `${mTxt(held)}: learners in this batch or on its waitlist have this mode — it can't be removed`;
  return '';
}
function crBmApply(b, t, r) {
  const was = crBModes(b), pr = s3Pr(r2Pid(b));
  if (pr && pr.level !== 'Level 3' && crMultiFee(pr) && !Array.isArray(b.w1opts)) { if (b.dmode) b.crBase = b.dmode; b.w1opts = []; } // a single-mode batch from before: its own mode stays on the programme fee
  b.crModes = crBmNext(b, t);
  logA('Batches', crEntB(b), 'Delivery modes configured changed', mTxt(was), `${mTxt(b.crModes)} · ready for enrolment: ${mTxt(b.crModes.filter(m => crReady(b, m) === 'ready'))}`, r);
  if (b.coord) chCooNotify(b.coord, 'Batch delivery modes', `${b.code}: ${mTxt(b.crModes)}`, 'c-batches.' + b.code);
}
// Change (batch detail): M's fee-option dialog with the configurable modes added; a batch without fee options gets the modes alone
const _w1OptsCR = ACT.w1Opts;
ACT.w1Opts = el => {
  const b = w1Batch(el && el.dataset && el.dataset.id); if (!b) return;
  const deny = () => w1Deny(b, 'change the delivery modes a batch accepts', w1AdminWhy(b));
  if (!w1L3(b)) {
    if (!crAddable(b).length) return _w1OptsCR(el);
    if (w1AdminWhy(b)) return deny();
    return reasonDlg({ title: 'Delivery modes — ' + b.code, ok: 'Save', body: crReadyHtml(b, false), extra: crBmBlock(b), onOk: r => {
      if (w1AdminWhy(b)) { closeModal(); return deny(); }
      const t = crBmTicked(); if (!crBmChanged(b, t)) { fieldErr('#cr-bm-0', 'Nothing has changed'); return false; }
      const why = crBmWhy(b, t); if (why) { fieldErr('#cr-bm-0', why); return false; }
      crBmApply(b, t, r); render(); toast('Delivery modes saved and audited. No one can enrol in a mode until it is ready.');
    } });
  }
  const r = _w1OptsCR(el); if (!MODAL || !/^Delivery modes accepted — /.test(MODAL.title || '')) return r;
  const blk = crBmBlock(b); if (!blk) return r;
  MODAL.body = MODAL.body.replace('<div class="field"><label for="rsn">', () => blk + '<div class="field"><label for="rsn">'); renderModal();
  const a = MODAL.actions.find(x => /primary/.test(x.cls || '')); if (!a || !a.fn) return r;
  const g = a.fn;
  a.fn = (...x) => {
    const t = crBmTicked(); if (!crBmChanged(b, t)) return g(...x);
    if (w1AdminWhy(b)) { closeModal(); return deny(); }
    const rsn = mval('#rsn'); if (!rsn) { fieldErr('#rsn', 'Enter a reason'); return false; }
    const why = crBmWhy(b, t); if (why) { fieldErr('#cr-bm-0', why); return false; }
    const res = g(...x);
    if (res === false) { const e = $$('#modal-root .err').find(y => /Nothing has changed/.test(y.textContent)); if (!e) return false; e.remove(); crBmApply(b, t, rsn); closeModal(); render(); toast('Delivery modes saved and audited.'); return; }
    crBmApply(b, t, rsn); render(); return res;
  };
  return r;
};

/* ---------- Awarding body batch code: checks ---------- */
let CR_ABC = null; // { code, abc } from step 1 of Create batch
const CR_ABC_RE = /^[A-Za-z0-9][A-Za-z0-9 /.\-_()&#:]*$/;
const crAbcNorm = v => String(v || '').trim().replace(/\s+/g, ' ');
const crAbcWhy = v => (!v ? '' : v.length > 40 ? 'Use at most 40 characters' : !CR_ABC_RE.test(v) ? 'Use letters, digits, spaces and / - . _ ( ) & # : only, starting with a letter or digit' : '');
const crAbcField = (id, v) => `<div class="field cr-abc-f"><label for="${id}">Awarding body batch code <span class="xs muted">(optional)</span></label><input class="input mono" id="${id}" maxlength="40" autocomplete="off" value="${esc(v || '')}" placeholder="As issued by the awarding body"><span class="hint">The awarding body's own reference for this cohort. Separate from the Academy's batch code and never used to identify the batch here.</span></div>`;

const _omCR = openModal;
openModal = function (m) {
  if (m && m.title === 'Create batch — step 1 of 5' && typeof m.body === 'string') {
    m.body = crNbCourses(m.body); // DM-P (PD-DM-16)
    m.body = m.body.replace('<span class="hint">Unique within the course.</span>', '<span class="hint">The Academy\'s own identifier. Unique.</span>')
      .replace('<div class="field"><label for="nb-co">', () => crAbcField('nb-abc', CR_ABC && CR_ABC.abc) + '<div class="field"><label for="nb-co">');
  }
  if (m && m.title === 'Create batch — step 5 of 5' && typeof m.body === 'string') m.body = m.body.replace(/(<dt>Code<\/dt><dd class="mono">[^<]*<\/dd>)/, (x) => `<dt>Batch code</dt>${x.slice(13)}<dt>Awarding body batch code</dt><dd class="cr-abc-rev">${CR_ABC && CR_ABC.abc ? `<span class="mono">${esc(CR_ABC.abc)}</span>` : '<span class="muted">Not recorded</span>'}</dd>`);
  if (m && m.title === 'Create batch — step 5 of 5' && typeof m.body === 'string' && CR_NBM && CR_NBM.modes.length) m.body = m.body.replace(/(<dt>Academic Coordinator<\/dt>)/, () => `<dt>Mode configured</dt><dd class="cr-rev-m">${esc(mTxt(CR_NBM.modes))}</dd><dt>Ready for enrolment</dt><dd class="cr-rev-r">${esc(mTxt(CR_NBM.rdy))}${CR_NBM.modes.some(x => !CR_NBM.rdy.includes(x)) ? ` ${chip(CR_FIN + ': ' + mTxt(CR_NBM.modes.filter(x => !CR_NBM.rdy.includes(x))), 'amber')}` : ''}</dd><dt>Academic Coordinator</dt>`);
  const r = _omCR.apply(this, arguments);
  // DM: the review lists every mode ticked (M's row counted only modes with approved options); "Ready for enrolment" says which can take learners
  if (m && m.title === 'Create batch — step 5 of 5' && MODAL && CR_NBM && CR_NBM.modes.length && typeof MODAL.body === 'string' && MODAL.body.includes('m-nb-rev')) {
    MODAL.body = MODAL.body.replace(/<dd class="m-nb-rev">[^<]*<\/dd>/, () => `<dd class="m-nb-rev">${esc(mTxt(CR_NBM.modes))}</dd>`).replace(/<dt>Mode configured<\/dt><dd class="cr-rev-m">[^<]*<\/dd>/, ''); renderModal();
  }
  if (m && m.title === 'Create batch — step 1 of 5' && MODAL) (MODAL.actions || []).forEach(a => { if (a.fn && a.cls && /primary/.test(a.cls)) { const g = a.fn; a.fn = (...x) => {
    const abc = crAbcNorm(mval('#nb-abc')), why = crAbcWhy(abc); if (why) { fieldErr('#nb-abc', why); return false; }
    const co = mval('#nb-co'), pr = s3Pr(s4PidOfTitle(co)), ew = !co ? 'No course is ready for new batches' : crEligWhy(pr); // DM-P (PD-DM-16): eligible courses only, also on a direct call
    if (ew) return crNbNo(co, ew);
    const box = $('#modal-root #w1-nb-acc'), ap = pr ? crApprOpts(pr.id).map(o => o.id) : [], ids = box && pr && box.dataset.pid === pr.id ? $$('#modal-root .w1-nb-o:checked').map(i => i.value) : [];
    if (pr) {
      const off = ids.filter(id => !ap.includes(id)); // another course's option, the Standard programme fee or an option without a mode
      if (off.length) { logA('Batches', co, 'Blocked: accept a fee option that is not an approved option of this course', '—', off.map(w1OptName).join(', '), 'Approved options: ' + (ap.join(', ') || 'none')); fieldErr('#w1-nb-acc', `${off.map(w1OptName).join(', ')} can't be accepted by a new batch of this course`); return false; }
      if (!ids.length) { fieldErr('#w1-nb-acc', 'Choose at least one delivery mode — Self-Paced, Fully Assisted or both (with at least one fee option)'); return false; }
    }
    const code = (mval('#nb-c') || '').toUpperCase(), modes = pr ? M_MODES.filter(m => ids.some(id => (r1Opt(id) || {}).mode === m)) : [];
    const res = g(...x); if (res !== false) { CR_ABC = { code, abc }; CR_NBM = pr ? { code, course: co, modes, pend: [], std: false, rdy: modes } : null; } return res; }; } });
  // DM-P: the course is checked again when the batch is created (it may have changed since step 1)
  if (m && m.title === 'Create batch — step 5 of 5' && MODAL) (MODAL.actions || []).forEach(a => { if (a.fn && a.cls && /primary/.test(a.cls)) { const g = a.fn; a.fn = (...x) => {
    const co = CR_NBM ? CR_NBM.course : null, pr = co && s3Pr(s4PidOfTitle(co)), why = co ? crEligWhy(pr) : ''; if (why) { closeModal(); return crNbNo(co, why); }
    return g(...x); }; } });
  return r;
};
// The batch is created: the awarding body batch code is recorded with it
const _syncCR = syncTasBatches;
syncTasBatches = function () {
  const x = CR_ABC, r = _syncCR.apply(this, arguments);
  const nm = CR_NBM, bm = nm && (ADMIN.batches || []).find(y => y.code === nm.code && y.course === nm.course && y.created && !Array.isArray(y.crModes));
  if (bm) { CR_NBM = null; const pr = s3Pr(r2Pid(bm)); bm.crModes = nm.modes.slice();
    if (pr && crMultiFee(pr)) { if (!Array.isArray(bm.w1opts)) bm.w1opts = []; if (!nm.std && !r1StdOf(pr.id)) { delete bm.dmode; delete bm.dmodeSrc; } }
    logA('Batches', crEntB(bm), 'Delivery modes configured', '—', `${mTxt(bm.crModes)} · ready for enrolment: ${mTxt(bm.crModes.filter(m => crReady(bm, m) === 'ready'))}`, 'Batch created'); }
  if (x && x.code) { const b = (ADMIN.batches || []).find(y => y.code === x.code && y.created && !('abCode' in y)); if (b) { CR_ABC = null; b.abCode = x.abc || null; if (x.abc) { b.abcHist = [[now().toISOString(), ADMIN.me.name, null, x.abc, 'Batch created']]; logA('Batches', crEntB(b), 'Awarding body batch code recorded', '—', x.abc, 'Batch created'); } } }
  return r;
};

/* ---------- Edit batch details: the same modes for a course without fee options; the awarding body batch code ---------- */
const _canModeCR = n2CanChangeMode;
n2CanChangeMode = function (b, to) {
  const pr = b && s3Pr(r2Pid(b)), c = crCfg(pr);
  if (c && to && !c.modes.includes(to) && to !== b.dmode && n2CanCreate()) { n2Refuse(b, 'change delivery mode', `${to} isn't offered by ${b.course} (Course Details: ${mTxt(c.modes)}).`); return false; }
  if (pr && !c && to && to !== b.dmode && n2CanCreate()) { n2Refuse(b, 'change delivery mode', `${CR_NC_T}: ${b.course} has no price for ${to}. Configure fee options by delivery mode in Section 5 — Fees & Payments first.`); return false; } // DM-L (PD-DM-11)
  return _canModeCR.apply(this, arguments);
};
function crAbcSave(b, v, r) { const was = b.abCode || null; if ((v || null) === was) return false; b.abCode = v || null; (b.abcHist = b.abcHist || []).push([now().toISOString(), ADMIN.me.name, was, v || null, r]); logA('Batches', crEntB(b), was ? (v ? 'Awarding body batch code changed' : 'Awarding body batch code removed') : 'Awarding body batch code recorded', was || '—', v || '—', r); if (b.coord) chCooNotify(b.coord, 'Awarding body batch code', `${b.code}: ${v || 'removed'}`, 'c-batches.' + b.code); return true; }
const _beCR = ACT.s4bBatchEdit;
ACT.s4bBatchEdit = el => {
  const r = _beCR(el), b = chBatch(el && el.dataset && el.dataset.id);
  if (!b || !MODAL || MODAL.title !== 'Edit batch details — ' + b.code) return r;
  const pr = s3Pr(r2Pid(b)), c = crCfg(pr);
  MODAL.body = MODAL.body.replace('<div class="field full"><label for="bd-d">', () => `<div class="field cr-bc-f"><span class="lbl">Batch code</span><p class="mono cr-bc">${esc(b.code)}</p><span class="hint">The Academy's identifier — fixed.</span></div>${crAbcField('bd-abc', b.abCode)}<div class="field full"><label for="bd-d">`);
  if (Array.isArray(b.crModes) && (!b.dmode || b.crBase)) MODAL.body = MODAL.body.replace(/<div class="field"><label for="bd-dm">[\s\S]*?<\/span><\/div>/, ''); // configured by modes and fee options: no single stored mode to edit
  if (c && !r1IsL3Pid(pr.id)) MODAL.body = MODAL.body.replace(/(<select class="select" id="bd-dm"[^>]*>)([\s\S]*?)(<\/select>)/, (x, o, inner, cl) => o + inner.replace(/<option[^>]*>([^<]*)<\/option>/g, (y, m) => (c.modes.includes(m) || m === b.dmode ? y : '')) + cl);
  // DM-L (PD-DM-11): not configured — the batch keeps its own mode; no other mode is listed
  if (pr && !c) MODAL.body = MODAL.body.replace(/(<select class="select" id="bd-dm"[^>]*>)([\s\S]*?)(<\/select>)([\s\S]*?)(<\/div>)/, (x, o, inner, cl, mid, end) => o + inner.replace(/<option[^>]*>([^<]*)<\/option>/g, (y, m) => (m === b.dmode ? y : '')) + cl + mid + `<span class="hint cr-nc-bd">${CR_NC_T}: ${esc(b.course)} has one ${esc(crNcPrice(pr))}, so this batch stays ${esc(b.dmode || '—')}. To offer another mode, configure fee options by delivery mode in Section 5 — Fees &amp; Payments.</span>` + end);
  const blk = crBmBlock(b); if (blk) MODAL.body = MODAL.body.replace('<div class="field cr-bc-f">', () => blk + '<div class="field cr-bc-f">'); // the same configurable modes as the Change dialog
  renderModal();
  const a = MODAL.actions.find(x => x.cls && /primary/.test(x.cls)); if (!a || !a.fn) return r;
  const g = a.fn;
  a.fn = (...x) => {
    const v = crAbcNorm(mval('#bd-abc')), ch = (v || null) !== (b.abCode || null), t = crBmTicked(), mch = crBmChanged(b, t); if (!ch && !mch) return g(...x);
    if (mch && w1AdminWhy(b)) { closeModal(); return w1Deny(b, 'change the delivery modes a batch accepts', w1AdminWhy(b)); }
    const why = ch ? crAbcWhy(v) : ''; if (why) { fieldErr('#bd-abc', why); return false; }
    const mwhy = mch ? crBmWhy(b, t) : ''; if (mwhy) { fieldErr('#cr-bm-0', mwhy); return false; }
    const rsn = mval('#bd-r'); if (!rsn) { fieldErr('#bd-r', 'Enter a reason'); return false; }
    const save = () => { if (ch) crAbcSave(b, v, rsn); if (mch) crBmApply(b, t, rsn); };
    // nothing else on the form changed (compared as the person sees it): save these on their own, without the impact review
    const f = s => $('#modal-root ' + s), started = s4bStarted(b), acc = w1Accepted(b).map(o => o.id), eo = $$('#modal-root .m-eo').filter(i => i.checked || i.disabled).map(i => i.value);
    const others = (!started && ((f('#bd-s') && f('#bd-s').value !== b.start.slice(0, 10)) || (f('#bd-e') && f('#bd-e').value !== b.end.slice(0, 10)) || (f('#bd-m') && f('#bd-m').value !== b.mode)))
      || (f('#bd-c') && +f('#bd-c').value !== b.cap) || (f('#bd-d') && f('#bd-d').value.trim() !== (b.desc || '')) || (f('#bd-dm') && !f('#bd-dm').disabled && f('#bd-dm').value !== b.dmode) || ($('#modal-root .m-eo') && !mSame(eo, acc));
    if (!others) { save(); closeModal(); render(); toast(mch ? 'Delivery modes saved and audited.' : 'Awarding body batch code saved and audited.'); return; }
    const res = g(...x);
    if (res === false) { // only these changed: the form says "Nothing has changed" — save them on their own
      const e = $$('#modal-root .err').find(y => /Nothing has changed/.test(y.textContent)); if (!e) return false;
      e.remove(); $$('#modal-root [aria-invalid="true"]').forEach(y => y.removeAttribute('aria-invalid')); save(); closeModal(); render(); toast(mch ? 'Delivery modes saved and audited.' : 'Awarding body batch code saved and audited.'); return;
    }
    save(); render(); return res;
  };
  return r;
};
ACT.crAbcEdit = el => {
  const b = chBatch(el && el.dataset && el.dataset.id); if (!b) return;
  if (!s4bCanBatch()) return crNo('Batches', crEntB(b), 'record the awarding body batch code', 'Batch settings are changed by the Super Administrator, Academic Admins and System Administrators.');
  if (b.status === 'Cancelled') return crNo('Batches', crEntB(b), 'record the awarding body batch code (batch cancelled)', `${b.code} is cancelled — its settings can't change.`);
  reasonDlg({ title: 'Awarding body batch code — ' + b.code, ok: 'Save', body: `<p class="small">Batch code <span class="mono">${esc(b.code)}</span> stays the Academy's identifier. The awarding body batch code is recorded alongside it.</p>`, extra: crAbcField('ab-abc', b.abCode),
    onOk: r => {
      if (!s4bCanBatch()) { closeModal(); return crNo('Batches', crEntB(b), 'record the awarding body batch code', 'Batch settings are changed by the Super Administrator, Academic Admins and System Administrators.'); }
      const v = crAbcNorm(mval('#ab-abc')), why = crAbcWhy(v); if (why) { fieldErr('#ab-abc', why); return false; }
      if (!crAbcSave(b, v, r)) { fieldErr('#ab-abc', 'Nothing has changed'); return false; }
      render(); toast('Awarding body batch code saved and audited.');
    } });
};
ACT.crAbcHist = el => { const b = chBatch(el.dataset.id); if (!b || !b.abcHist) return; openModal({ title: 'Awarding body batch code — history', body: `<ul class="list">${b.abcHist.slice().reverse().map(h => `<li class="li"><div class="li-b"><strong>${esc(h[3] || 'Removed')}</strong><span class="small">Was: ${esc(h[2] || '—')}</span><span class="xs muted">${fdt(h[0])} · ${esc(h[1])} · ${esc(h[4])}</span></div></li>`).join('')}</ul>`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); };
const crAbcLine = (b, act) => `<p class="small cr-abc">Batch code <span class="mono">${esc(b.code)}</span> · Awarding body batch code: ${b.abCode ? `<strong class="mono cr-abc-v">${esc(b.abCode)}</strong>` : '<span class="muted cr-abc-v">Not recorded</span>'}${act ? ` <button class="linklike small" data-act="crAbcEdit" data-id="${b.code}">${b.abCode ? 'Change' : 'Record'}</button>` : ''}${b.abcHist && b.abcHist.length ? ` <button class="linklike small" data-act="crAbcHist" data-id="${b.code}">History</button>` : ''}</p>`;

/* ================= 4. Assignment deadlines per batch ================= */
const CRD = () => (STORE.crd = STORE.crd || {});
const crDl = (code, id) => ((CRD()[code] || {})[id]) || null;
const crDue = (d, code) => { const x = d && code ? crDl(code, d.id) : null; return x ? x.due : null; };
// The batch's deadline; else an older definition's course-level date, only for a batch it was published to (never for a new batch)
// (only a publication from before batch deadlines: anything published since records d.crPub, and its held batches stay held)
const crLegacy = (d, code) => !!(d && d.due && !d.crPub && code && (d.batches || []).includes(code));
const crEffDue = (d, code) => crDue(d, code) || (crLegacy(d, code) ? d.due : null);
const crWorlds = code => Object.keys(STORE.worlds || {}).filter(v => { const w = STORE.worlds[v]; return w && w.nvq && w.me && s2BatchCodeOf(w) === code; });
const crCanDl = () => cbAsgCan();
// Assignments of the batch's course that apply to it (drafts too, so deadlines can be set before publication)
function crAsgOf(b) {
  const pid = r2Pid(b);
  return s2Defs().filter(d => !['Deleted', 'Retired'].includes(d.status) && (cbAsgPid(d) ? cbAsgPid(d) === pid : d.programme === b.course) && (d.status !== 'Published' || fAsgScope(d) === 'all' || (d.batches || []).includes(b.code)));
}
const crSubmitted = a => !['Not Started', 'In Progress'].includes(a.status) || (a.qs || []).some(q => (q.rounds || []).length);
const crExtended = a => !!a.originalDue && a.due !== a.batchDue; // an extension granted to this learner (or their cohort)
const crIsoLocal = iso => (iso ? String(iso).slice(0, 16) : '');

// Set a batch's deadline; learners who hold it and haven't submitted move with it (extensions are never shortened)
function crSetDue(d, b, iso, r, o = {}) {
  const S_ = CRD()[b.code] = CRD()[b.code] || {}, x = S_[d.id], was = x ? x.due : null; if (was === iso) return null;
  const at = now().toISOString(), by = ADMIN.me.name;
  S_[d.id] = { due: iso, at, by, hist: ((x && x.hist) || []).concat([[at, by, was, iso, r]]) };
  logA('Assignments', `${crEntB(b)} · ${d.title}`, was ? 'Batch deadline changed' : 'Batch deadline set', was ? fdt(was) : crLegacy(d, b.code) ? `Course-level date ${fdt(d.due)} (legacy)` : 'Not set', fdt(iso), r);
  const res = { moved: 0, submitted: 0, extended: 0, issued: 0 };
  crWorlds(b.code).forEach(v => {
    const w = STORE.worlds[v], a = w.assignments.find(y => y.id === d.id); if (!a) return;
    if (crSubmitted(a)) { res.submitted++; return; }
    const ext = crExtended(a); a.batchDue = iso;
    if (ext && new Date(a.due) >= new Date(iso)) { res.extended++; return; }
    a.due = iso; if (!ext) delete a.originalDue; res.moved++;
    const ev = w.events.find(e => e.id === 'ed' + d.id); if (ev) { ev.start = ev.end = iso; }
    if (!o.quiet) notifyLearner(v, 'Assignments', 'Deadline changed', `${d.title}: now due ${fdt(iso)}.`, 'assignment.' + d.id);
  });
  if (d.status === 'Published') crWorlds(b.code).forEach(v => { res.issued += fAsgReconcile(STORE.worlds[v], `Batch deadline set (${b.code})`).length; });
  if (!o.quiet) { if (b.coord) chCooNotify(b.coord, 'Assignment deadline', `${b.code} · ${d.title}: due ${fdt(iso)}`, 'c-batches.' + b.code); if (d.status === 'Published') tasNotify('Deadline changed', `${d.title} — ${b.code}: due ${fdt(iso)}`, 't-assign.' + d.id, 'Caseload'); }
  return res;
}

// Every copy issued to a learner carries their batch's deadline; none is issued while the batch has no deadline
const _copyCR = s2CopyTo;
s2CopyTo = function (v, d) {
  const w = STORE.worlds[v], code = w && s2BatchCodeOf(w), due = crEffDue(d, code); if (!due) return null;
  const keep = d.due; d.due = due;
  try { const r = _copyCR.apply(this, arguments); const a = r && w.assignments.find(x => x.id === d.id); if (a) { a.batchDue = due; a.dueSrc = crDue(d, code) ? 'batch' : 'course (legacy)'; } return r; } finally { d.due = keep; }
};
const _appliesCR = fAsgApplies; fAsgApplies = function (d, w) { return _appliesCR.apply(this, arguments) && !!crEffDue(d, s2BatchCodeOf(w)); };
// F's late-join reconciliation, with the learner's own (batch) deadline in its notices
fAsgReconcile = function (w, why) {
  const v = fWKey(w); if (!v) return [];
  const code = s2BatchCodeOf(w), b = chBatch(code), out = [];
  s2Defs().filter(d => fAsgApplies(d, w) && !w.assignments.some(a => a.id === d.id)).forEach(d => {
    const c = s2CopyTo(v, d); if (!c) return; d.copies.push(c); out.push(d.id);
    const a = w.assignments.find(x => x.id === d.id), ext = STORE.s2Ext && STORE.s2Ext[w.me.id + '|' + d.id];
    if (ext) extendAssignment(v, d.id, ext, 'Extension recorded before the learner received the assignment');
    const late = new Date(a.due) < now();
    if (late) {
      a.lateJoin = { at: now().toISOString(), due: a.due };
      const n = w.notifs.find(x => x.go === 'assignment.' + d.id && x.title === 'New assignment');
      if (n) n.body = `${d.title} is now in your assignments. Its deadline for your batch (${fdt(a.due)}) passed before you joined: your Coordinator will decide whether to extend it.`;
      if (b) chCooNotify(b.coord, 'Extension decision needed', `${chFullName(w)} joined ${b.code} after the deadline of ${d.title} (${fdt(a.due)}). The deadline hasn't been changed.`, 'c-learner.' + w.me.id);
    }
    s2Log(d, 'Issued to a learner who joined after publication', '—', `${chFullName(w)} (${w.me.id}) · ${code} · due ${fdt(a.due)}${late ? ' · deadline already passed — extension decision needed' : ''}`, why);
  });
  return out;
};

// Publish: a deadline for each batch chosen (pre-filled when the batch already has one), saved with the publish note
let CR_PUB = null;
const _tasCR = tasNotify;
tasNotify = function (t, b, go, cat) { if (CR_PUB && t === 'New assignment published') { const d = CR_PUB; b = `${d.title} — deadlines: ${(d.batches || []).map(c => `${c} ${crDue(d, c) ? fdt(crDue(d, c)) : 'not set'}`).join(' · ') || 'set per batch'}`; } return _tasCR.call(this, t, b, go, cat); };
const _pubCR = ACT.pubAsg;
ACT.pubAsg = function (el) {
  const d = el && el.dataset && s2Def(el.dataset.id), r = _pubCR.apply(this, arguments);
  if (!d || d.status !== 'Draft' || !MODAL || !/^Publish assignment/.test(MODAL.title || '')) return r;
  MODAL.body = MODAL.body.replace(/<label class="check small"><input type="checkbox" class="s2-pb" value="([^"]+)"[^>]*>[\s\S]*?<\/label>/g, (m, code) => `<div class="cr-pb">${m}<div class="field cr-pd-l"><label class="xs muted" for="cr-pd-${code}">Deadline for ${esc(code)}</label><input class="input cr-pd" type="datetime-local" id="cr-pd-${code}" data-b="${code}" value="${crIsoLocal(crEffDue(d, code) || d.due)}">${!crEffDue(d, code) && d.due ? '<span class="hint cr-pd-sug">Suggested from this assignment\'s original date — confirm or change it. It is saved for this batch only when you publish.</span>' : ''}</div><label class="check xs cr-pd-hold-l"><input type="checkbox" class="cr-pd-hold" id="cr-ph-${code}" data-b="${code}"><span>Release later — deadline required</span></label></div>`)
    .replace('see it with its deadline on their calendars', 'see it with their batch\'s deadline on their calendars');
  MODAL.body += '<p class="xs muted cr-pub-note">Each batch has its own deadline. A batch added later gets the assignment once its deadline is set (Batches → batch → Assignment deadlines).</p>';
  renderModal();
  const a = MODAL.actions.find(x => /primary/.test(x.cls || '')); if (!a || !a.fn) return r;
  const g = a.fn;
  a.fn = (...x) => {
    const picks = $$('#modal-root .s2-pb:checked').map(i => i.value), set = [];
    for (const code of picks) {
      const v = mval('#cr-pd-' + CSS.escape(code)), hold = !!($('#modal-root #cr-ph-' + CSS.escape(code)) || {}).checked, iso = v ? new Date(v + ':00Z') : null;
      if (!v && hold) continue; // published to the batch, held: "Deadline required — not released" until a deadline is set
      if (!iso || isNaN(iso)) { fieldErr('#cr-pd-' + CSS.escape(code), `Set the deadline for ${code}, or choose "Release later"`); return false; } set.push([code, iso.toISOString()]); }
    const note = mval('#rsn'), keep = CRD() && JSON.stringify(CRD());
    set.forEach(([code, iso]) => { const b = chBatch(code); if (b) crSetDue(d, b, iso, note || 'Set when the assignment was published', { quiet: true }); });
    CR_PUB = d; let res; try { res = g(...x); } finally { CR_PUB = null; }
    if (res === false || d.status !== 'Published') STORE.crd = JSON.parse(keep); // not published: nothing is kept
    else d.crPub = true;
    return res;
  };
  return r;
};

// Assignment details: no deadline field — the batches' deadlines instead
function crAsgBatches(d) {
  const pid = cbAsgPid(d), bs = (ADMIN.batches || []).filter(b => !['Cancelled', 'Archived'].includes(b.status) && (pid ? r2Pid(b) === pid : b.course === d.programme) && crAsgOf(b).includes(d));
  const row = b => { const x = crDl(b.code, d.id); return `<tr data-b="${b.code}"><td class="nowrap"><span class="mono">${esc(b.code)}</span></td><td>${x ? `<strong class="cr-due">${fdt(x.due)}</strong>` : crLegacy(d, b.code) ? `${fdt(d.due)} <span class="xs muted">course-level date (legacy)</span>` : `${chip('Deadline required', 'amber')}${d.status === 'Published' ? ' <span class="xs muted">Not released</span>' : ''}`}</td><td class="nowrap">${crCanDl() ? `<button class="btn btn-sm" data-act="crDlEdit" data-b="${b.code}" data-id="${d.id}">${x ? 'Change' : 'Set'}</button>` : ''}</td></tr>`; };
  return `<div class="field full cr-asg-dl"><span class="lbl">Deadlines</span><p class="xs muted">Set by each batch — the same assignment can have a different deadline in each batch. ${d.due ? `This assignment was created with a course-level date (${fdt(d.due)}); the batches it was published to use it until they set their own; any other batch needs its own deadline.` : ''}</p>${bs.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Batch</th><th>Deadline</th><th></th></tr></thead><tbody>${bs.map(row).join('')}</tbody></table></div>` : '<p class="small muted">No current batch of this programme.</p>'}</div>`;
}
const _detCR = s2Details;
s2Details = function (d) {
  const keep = d.due; if (!d.due) d.due = ''; let h; try { h = _detCR.apply(this, arguments); } finally { d.due = keep; }
  return h.replace(/<div class="field"><label for="ae-d">Deadline<\/label><input[^>]*><\/div>/, () => crAsgBatches(d)).replace(/<label class="check full"><input type="checkbox" id="ae-n" checked>Notify learners of a deadline change<\/label>/, '');
};
// Details save (S2-02 and CB5's role check), without a deadline: deadlines are changed per batch
ACT.s2Save = el => {
  if (!cbAsgCan()) return cbAsgRefuse('save an assignment', el);
  const d = s2Def(el.dataset.id); if (!d) return; const pub = d.status === 'Published';
  const v = { title: $('#ae-t').value.trim(), unit: pub ? d.unit : $('#ae-u').value.split(' — ')[0], files: $('#ae-f').value.trim(), resubMax: +$('#ae-rs').value, window: +$('#ae-rw').value, brief: pub ? d.brief : s2Html($('#ae-b').value.trim()) };
  if (!v.title) return fieldErr('#ae-t', 'Enter a title'); if (s2Defs().some(x => x !== d && x.title.toLowerCase() === v.title.toLowerCase())) return fieldErr('#ae-t', 'Another assignment has this title'); if (!(v.resubMax >= 0)) return fieldErr('#ae-rs', '0 or more'); if (!(v.window >= 1)) return fieldErr('#ae-rw', 'At least 1 day');
  const before = `${d.title} · ${d.unit}`;
  reasonDlg({ title: pub ? 'Save as a new version?' : 'Save assignment', ok: 'Save', label: 'Change summary (required)', body: pub ? `<div class="note b-blue">${ic('layers')}<div class="small">Edits after publishing create Version ${d.version + 1}. Deadlines aren't changed here — each batch sets its own.</div></div>` : '', onOk: r => {
    if (!cbAsgCan()) { closeModal(); return cbAsgRefuse('save an assignment', el); }
    Object.assign(d, v); if (pub) d.version++;
    d.copies.forEach(c => { const a = s2Copy(c); if (!a) return; a.title = d.title; a.resubMax = d.resubMax; });
    s2Log(d, pub ? `Saved — version ${d.version}` : 'Saved (Draft)', before, `${d.title} · ${d.unit}`, r); render(); toast(pub ? `Saved as version ${d.version}.` : 'Saved.');
  } });
};
// New assignment (Assignments screen): no deadline
const _naCR = ACT.newAsg;
ACT.newAsg = function () {
  const r = _naCR.apply(this, arguments); if (!MODAL || !/^New assignment$/.test(MODAL.title || '')) return r;
  MODAL.body = MODAL.body.replace(/<div class="field"><label for="na-d">Deadline<\/label><input[^>]*><\/div>/, '').replace('It starts as a Draft.', 'It starts as a Draft. Each batch sets its own deadline.');
  renderModal();
  const a = MODAL.actions.find(x => /primary/.test(x.cls || '')); if (!a) return r;
  a.fn = () => {
    if (!cbAsgCan()) { closeModal(); return cbAsgRefuse('create an assignment'); }
    const t = mval('#na-t'), prog = mval('#na-p'), unit = mval('#na-u').split(' — ')[0], pr = s3Progs().find(p => p.title === prog);
    if (typeof eArch === 'function' && eArch(pr)) { eNo('Assignments', eEnt(pr), 'create an assignment (programme archived)', 'Programme archived — no new assessment definitions', `${pr.title} is archived: new assignments can't be created. Existing assignments can still be published and taught.`); return false; }
    if (!t) return fieldErr('#na-t', 'Enter a title'), false; if (s2Defs().some(x => x.title.toLowerCase() === t.toLowerCase())) return fieldErr('#na-t', 'An assignment with this title already exists'), false; if (!unit) return fieldErr('#na-u', 'Choose a unit / module'), false;
    let n = 10, id = 'a' + n; while (s2Defs().some(x => x.id === (id = 'a' + n))) n++;
    const d = { id, title: t, programme: prog, unit, due: null, status: 'Draft', version: 1, marker: 'Sarah Okonkwo', brief: '<p>Answer each question using examples from your workplace.</p>', briefV: 1, files: 'PDF, DOCX, JPG, PNG · 10 MB · 5 files', resubMax: 2, window: 10, qs: [], batches: [], copies: [] };
    cbAsgStamp(d, pr); s2Defs().push(d); s2Log(d, 'Assignment created (Draft)', '—', `${prog} · ${unit} · deadlines set per batch`); closeModal(); go('a-assignments', { id, tab: 'questions' }); toast('Draft created — add the questions next.'); return false;
  };
  return r;
};
// Course builder, Section 3: no deadline
cbAsgCreate = function (pr, v) {
  let n = 10, id = 'a' + n; while (s2Defs().some(x => x.id === (id = 'a' + n))) n++;
  const d = { id, title: v.title, programme: pr.title, unit: v.unit, due: null, status: 'Draft', version: 1, marker: 'Sarah Okonkwo', brief: s2Html(v.brief || 'Answer each question using examples from your workplace.'), briefV: 1, files: 'PDF, DOCX, JPG, PNG · 10 MB · 5 files', resubMax: 2, window: 10, qs: [], batches: [], copies: [] };
  cbAsgStamp(d, pr); s2Defs().push(d);
  s2Log(d, 'Assignment created (Draft)', '—', `${pr.title} (${pr.id}) · Version ${d.pv} · ${v.unit} · deadlines set per batch`, 'Course builder — Assessments'); return d;
};
const _cbNewCR = ACT.cbAsgNew;
ACT.cbAsgNew = el => {
  const r = _cbNewCR(el); if (!MODAL || !/^New assignment — /.test(MODAL.title || '')) return r;
  MODAL.body = MODAL.body.replace(/<div class="field"><label for="cna-d">Deadline<\/label><input[^>]*><\/div>/, '').replace('<p class="xs muted">Learners answer', '<p class="xs muted">No deadline is set here: each batch sets its own (Batches → batch → Assignment deadlines, or when publishing). Learners answer');
  renderModal();
  const a = MODAL.actions.find(x => /primary/.test(x.cls || '')); if (!a) return r;
  const pr = cbPr(el && el.dataset && el.dataset.p);
  a.fn = () => {
    if (!cbAsgCan()) { closeModal(); return cbAsgRefuse('create an assignment'); }
    const v = { title: mval('#cna-t'), unit: mval('#cna-u'), brief: mval('#cna-b') };
    if (!v.title) return fieldErr('#cna-t', 'Enter a title'), false; if (s2Defs().some(x => x.title.toLowerCase() === v.title.toLowerCase())) return fieldErr('#cna-t', 'An assignment with this title already exists'), false;
    const d = cbAsgCreate(pr, v); setUi('cbAsg.' + pr.id, d.id); setUi('cbAsgT.' + pr.id, 'questions'); closeModal(); render(); toast('Draft created — add the questions next.');
  };
  return r;
};
// Extensions keep their audit "before" value meaningful (the batch's deadline)
const _extCR = SUBMIT.asgExtend;
SUBMIT.asgExtend = f => { const d = s2Def(f && f.dataset && f.dataset.id), b = $('#ex-b'); if (!d) return _extCR(f); const keep = d.due; d.due = crEffDue(d, b && b.value) || keep || now().toISOString(); try { return _extCR(f); } finally { d.due = keep; } };
// The list: one deadline per batch
const _dtCR = dt;
dt = function (cfg) {
  if (cfg && cfg.id === 'asgs' && Array.isArray(cfg.cols)) cfg = { ...cfg, cols: cfg.cols.map(c => c.k !== 'due' ? c : { ...c, l: 'Deadlines', h: a => { const d = a.def; if (!d) return fdt(a.due); const n = Object.values(CRD()).filter(x => x[d.id]).length; return n ? `Per batch <span class="xs muted">${plural(n, 'batch', 'batches')} set</span>` : a.due ? `${fdt(a.due)} <span class="xs muted">course-level (legacy)</span>` : '<span class="muted">Set per batch</span>'; }, s: a => a.due || '' }) };
  return _dtCR.call(this, cfg);
};

/* ---------- Batch → Assignment deadlines (admin), and the Coordinator's batch overview ---------- */
const CR_BTABS = [['roster', 'Roster'], ['waitlist', 'Waitlist'], ['schedule', 'Schedule'], ['staff', 'Staff'], ['reports', 'Reports'], ['audit', 'Audit']];
function crDlCard(b) {
  const ds = crAsgOf(b), ws = crWorlds(b.code), ed = crCanDl() && !['Cancelled', 'Archived'].includes(b.status);
  const row = d => {
    const x = crDl(b.code, d.id), cs = ws.map(v => STORE.worlds[v].assignments.find(a => a.id === d.id)).filter(Boolean), sub = cs.filter(crSubmitted).length, ext = cs.filter(a => !crSubmitted(a) && crExtended(a)).length;
    const due = x ? `<strong class="cr-due">${fdt(x.due)}</strong><div class="xs muted">Set by ${esc(x.by)} on ${fd(x.at)}</div>` : crLegacy(d, b.code) ? `${fdt(d.due)}<div class="xs muted">Course-level date (legacy) — not yet set for this batch</div>` : `${chip('Deadline required', 'amber')}${d.status === 'Published' ? '<div class="xs muted">Not released — this batch\'s learners receive it once the deadline is set</div>' : ''}`;
    return `<tr data-asg="${d.id}"><td><strong>${esc(d.title)}</strong><div class="xs muted">${esc(d.unit)}</div></td><td>${chip(d.status, d.status === 'Published' ? 'green' : 'amber')}</td><td>${due}</td><td class="small">${d.status === 'Published' ? `${plural(cs.length, 'learner')} issued${sub ? ` · ${sub} submitted (kept)` : ''}${ext ? ` · ${plural(ext, 'extension')} (kept)` : ''}` : '—'}</td>
      <td class="nowrap">${ed ? `<button class="btn btn-sm" data-act="crDlEdit" data-b="${b.code}" data-id="${d.id}">${x ? 'Change' : 'Set'} deadline</button>` : ''}${x && x.hist.length ? ` <button class="btn btn-sm btn-ghost" data-act="crDlHist" data-b="${b.code}" data-id="${d.id}">History</button>` : ''}</td></tr>`;
  };
  return `<section class="card cr-dl"><h2>Assignment deadlines — ${esc(b.code)}</h2><p class="small muted">Each batch sets its own deadline for each assignment of ${esc(b.course)}; another batch can use a different date. Changing a deadline moves it for learners in this batch who haven't submitted. Submitted, marked and completed work, resubmission deadlines and individual extensions are kept.</p>
    ${ds.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Assignment</th><th>Status</th><th>Deadline for this batch</th><th>Learners</th><th></th></tr></thead><tbody>${ds.map(row).join('')}</tbody></table></div>` : '<p class="small muted">No assignments for this course yet.</p>'}</section>`;
}
const _bdCR = batchDetail;
batchDetail = function (code, t) {
  const dl = t === 'deadlines', h = _bdCR.call(this, code, dl ? 'audit' : t), b = chBatch(code); if (!b) return h;
  const old = subtabs(CR_BTABS, dl ? 'audit' : t, 'a-batches', code), neu = subtabs(CR_BTABS.slice(0, 3).concat([['deadlines', 'Assignment deadlines']], CR_BTABS.slice(3)), t, 'a-batches', code), k = h.indexOf(old);
  const miss = dl ? [] : crAsgOf(b).filter(d => d.status === 'Published' && !crEffDue(d, b.code));
  const warn = miss.length ? `<div class="note b-amber cr-dl-miss" role="status">${ic('clock')}<div class="small"><strong>${plural(miss.length, 'published assignment has', 'published assignments have')} no deadline for this batch</strong> (${esc(miss.map(d => d.title).join(', '))}), so its learners don't receive ${miss.length > 1 ? 'them' : 'it'} yet. <button class="btn btn-sm" data-go="a-batches" data-id="${b.code}" data-tab="deadlines">Set deadlines</button></div></div>` : '';
  let out = k < 0 ? h : h.slice(0, k) + warn + neu + (dl ? crDlCard(b) : h.slice(k + old.length));
  out = out.replace(/<p class="small m-modes">Delivery modes accepted: <strong>[^<]*<\/strong><\/p>/, () => `<p class="small m-modes">Delivery modes accepted: <strong>${esc(mTxt(crBModes(b)))}</strong></p>`); // DM: every mode configured, readiness below
  const line = crAbcLine(b, s4bCanBatch() && b.status !== 'Cancelled') + (crShowReady(b) || crAddable(b).length ? crReadyHtml(b, !w1AdminWhy(b)) : ''), i = out.indexOf('<p class="small s4b-bdates">');
  out = i >= 0 ? out.slice(0, i) + line + out.slice(i) : out.replace(/(<div class="row">)/, line + '$1');
  return out;
};
ACT.crDlEdit = el => {
  const b = chBatch(el && el.dataset && el.dataset.b), d = el && el.dataset && s2Def(el.dataset.id); if (!b || !d) return;
  if (!crCanDl()) return crNo('Assignments', `${crEntB(b)} · ${d.title}`, 'change an assignment deadline', 'Assignment deadlines are set by the Super Admin, Academic Admin or System Admin.');
  if (['Cancelled', 'Archived'].includes(b.status)) return crNo('Assignments', `${crEntB(b)} · ${d.title}`, 'change an assignment deadline (batch closed)', `${b.code} is ${b.status.toLowerCase()} — its deadlines can't change.`);
  if (!crAsgOf(b).includes(d)) return crNo('Assignments', `${crEntB(b)} · ${d.title}`, 'set a deadline for an assignment that doesn\'t apply to this batch', `${d.title} doesn't apply to ${b.code}.`);
  const x = crDl(b.code, d.id), cur = crEffDue(d, b.code), ws = crWorlds(b.code), cs = ws.map(v => STORE.worlds[v].assignments.find(a => a.id === d.id)).filter(Boolean);
  reasonDlg({ title: `Assignment deadline — ${esc(d.title)} · ${b.code}`, ok: 'Save deadline',
    body: `<p class="small">Applies to ${esc(b.code)} only. ${cs.length ? `${plural(cs.filter(a => !crSubmitted(a)).length, 'learner')} who haven't submitted move to the new deadline (an individual extension is never shortened). ${plural(cs.filter(crSubmitted).length, 'submission')} and completed work stay as they are.` : d.status === 'Published' ? 'Learners in this batch receive the assignment with this deadline.' : 'Learners receive it with this deadline when it is published.'}</p>`,
    extra: `<div class="field"><label for="cr-dl-d">Deadline for ${esc(b.code)}</label><input class="input" type="datetime-local" id="cr-dl-d" value="${crIsoLocal(cur)}">${!x && crLegacy(d, b.code) ? `<span class="hint">Shown: the course-level date this assignment was created with (legacy).</span>` : ''}</div>`,
    onOk: r => {
      if (!crCanDl()) { closeModal(); return crNo('Assignments', `${crEntB(b)} · ${d.title}`, 'change an assignment deadline', 'Assignment deadlines are set by the Super Admin, Academic Admin or System Admin.'); }
      const v = mval('#cr-dl-d'), dt_ = v ? new Date(v + ':00Z') : null; if (!dt_ || isNaN(dt_)) { fieldErr('#cr-dl-d', 'Choose a date and time'); return false; }
      const iso = dt_.toISOString(); if (x && x.due === iso) { fieldErr('#cr-dl-d', 'Nothing has changed'); return false; }
      const res = crSetDue(d, b, iso, r); render();
      toast(`Deadline for ${b.code}: ${fdt(iso)}.${res && res.moved ? ` ${plural(res.moved, 'learner')} updated.` : ''}${res && res.issued ? ` Issued to ${plural(res.issued, 'learner')}.` : ''}${res && (res.submitted || res.extended) ? ' Submissions and extensions kept.' : ''}`);
    } });
};
ACT.crDlHist = el => { const x = crDl(el.dataset.b, el.dataset.id); if (!x) return; openModal({ title: `Deadline history — ${esc(el.dataset.b)}`, body: `<ul class="list">${x.hist.slice().reverse().map(h => `<li class="li"><div class="li-b"><strong>${fdt(h[3])}</strong><span class="small">Was: ${h[2] ? fdt(h[2]) : 'not set'}</span><span class="xs muted">${fdt(h[0])} · ${esc(h[1])} · ${esc(h[4])}</span></div></li>`).join('')}</ul>`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); };
const _cbCR = SCREENS['c-batches'];
SCREENS['c-batches'] = p => {
  let h = _cbCR(p); const b = p && p.id && chBatch(p.id); if (!b) return h;
  h = h.replace(/<section class="card s2-cb"><h2>Assignments published to this batch<\/h2><ul class="list small">[\s\S]*?<\/ul><\/section>/, () => { const ds = s2Defs().filter(d => d.status === 'Published' && d.batches.includes(b.code) && !d.seeded);
    return `<section class="card s2-cb"><h2>Assignments published to this batch</h2><ul class="list small">${ds.map(d => `<li class="li"><div class="li-b"><strong>${esc(d.title)}</strong><span class="xs muted">${esc(d.unit)} · ${crEffDue(d, b.code) ? `due ${fdt(crEffDue(d, b.code))} (this batch)` : 'deadline not set for this batch — not issued yet'} · reached ${plural(d.copies.filter(c => s2BatchCodeOf(STORE.worlds[c.v]) === b.code).length, 'learner')} with full data (prototype limit)</span></div></li>`).join('')}</ul></section>`; });
  h = h.replace(/<dd class="small m-modes">[^<]*<\/dd>/, () => `<dd class="small m-modes">${esc(mTxt(crBModes(b)))}</dd>`);
  if (crShowReady(b)) h = h.replace(/(<dt>Delivery channel<\/dt>)/, `<dt>Delivery modes</dt><dd class="cr-rdy-c">${crReadyHtml(b, false)}</dd>$1`);
  return h.replace(/(<dt>Delivery channel<\/dt>)/, `<dt>Awarding body batch code</dt><dd class="cr-abc-v">${b.abCode ? `<span class="mono">${esc(b.abCode)}</span>` : '<span class="muted">Not recorded</span>'}</dd>$1`);
};

/* ================= 3. Add unit: no unit code to type ================= */
// The next stable reference: above every U-number in any version of the programme (never reused)
function crNextUnit(pr) {
  const trees = [cbTree(pr)].concat((typeof cbCurVersions === 'function' ? cbCurVersions(pr).list : []).map(v => cbTree(pr, v)));
  if (!pr.chNew && STORE.s3) trees.push(STORE.s3.trees[pr.id], (s3Draft(pr.id) || {}).tree); else trees.push((STORE.chProgTree || {})[pr.id]);
  const ns = trees.filter(Boolean).flatMap(t => t.map(u => +((/^U(\d+)$/.exec(u.code) || [])[1] || 0)));
  return 'U' + String(Math.max(0, pr.unitSeq || 0, ...ns) + 1).padStart(3, '0');
}
const crUnitNote = code => `<p class="xs muted cr-unit-ref">A stable internal unit reference (<span class="mono">${code}</span>) is assigned automatically. Criteria, assignment mappings and learners' evidence link to it.</p>`;
const crUnitDlg = (pr, re) => {
  if (!MODAL || !pr) return; const code = crNextUnit(pr);
  MODAL.body = MODAL.body.replace(re, `<input type="hidden" id="${re === CR_RE_ND ? 'nd-c' : 'u-c'}" value="${code}">`).replace('Codes are unique within the programme. ', '') + crUnitNote(code);
  renderModal();
  const a = MODAL.actions.find(x => /primary/.test(x.cls || '')); if (a && a.fn) { const g = a.fn; a.fn = (...x) => { const c = (mval(re === CR_RE_ND ? '#nd-c' : '#u-c') || '').toUpperCase(), res = g(...x); const n = +((/^U(\d+)$/.exec(c) || [])[1] || 0); if (n > (pr.unitSeq || 0) && (cbTree(pr) || []).some(u => u.code === c)) pr.unitSeq = n; return res; }; }
};
const CR_RE_ND = /<div class="field"><label for="nd-c">Unit code<\/label><input[^>]*><\/div>/, CR_RE_U = /<div class="field"><label for="u-c">Unit code<\/label><input[^>]*><\/div>/;
const _ndAddCR = ACT.nodeAdd;
ACT.nodeAdd = function (el) { const r = _ndAddCR.apply(this, arguments), d = s3Ds(el); if ((d.lvl || 'unit') === 'unit' && MODAL && MODAL.title === 'Add unit') crUnitDlg(s3Pr(d.p || s3Cur), CR_RE_ND); return r; };
const _uAddCR = ACT.ch8AddUnit;
ACT.ch8AddUnit = function (el) { const r = _uAddCR.apply(this, arguments); if (MODAL && MODAL.title === 'Add unit') crUnitDlg(ch8Pr(el.dataset.id), CR_RE_U); return r; };

/* ---------- Transfers: a learner whose mode follows their batch can't join a mixed batch of a Level 2, 4 or 5 course ---------- */
const _moveCR = chDoMove;
chDoMove = function (lid, b, nb) {
  const pr = nb && s3Pr(r2Pid(nb));
  if (pr && pr.level !== 'Level 3' && w1L3(nb) && !w1OptOfLid(lid, b)) { chMoveRefuse(lid, `${nb.code} holds learners by fee option, and this learner has none — their delivery mode follows their batch. Choose a batch with one delivery mode.`); return false; }
  return _moveCR.apply(this, arguments);
};

/* ---------- Enrolment only into a mode that is ready (PD-CR-15) ----------
   Sign-up allocation, Add learner, waitlist offers and transfers skip a batch, or a mode of it, that isn't ready for enrolment;
   a course that offers both modes without any approved fee option doesn't start sign-ups. Refusals are logged. */
const crNotReady = b => `${b.code} isn't open for enrolment yet: ${crBModes(b).map(m => `${m} — ${CR_RDY[crReady(b, m)][0]}`).join('; ') || 'no delivery mode configured'}.`;
const _nearCR = chNearest;
chNearest = function (course, country, exclude) {
  const w = W1_NEAR || W, o = w && w.nvq && w.nvq.title === course ? r1OptOfW(w) : null;
  const no = chUpcoming(course).filter(b => crShowReady(b) && (o && o.mode ? crReady(b, o.mode) !== 'ready' : !crReadyAny(b))).map(b => b.code);
  return _nearCR.call(this, course, country, (exclude || []).concat(no));
};
const _addCR = ACT.addToBatch;
ACT.addToBatch = function (el) { const b = chBatch(el && el.dataset && el.dataset.id); if (b && crShowReady(b) && !crReadyAny(b)) return crNo('Batches', crEntB(b), 'add a learner (no delivery mode ready for enrolment)', crNotReady(b)); return _addCR.apply(this, arguments); };
const _offerCR = ACT.kOffer;
ACT.kOffer = function (el) { const b = chBatch(el && el.dataset && el.dataset.id); if (b && crShowReady(b) && !crReadyAny(b)) return crNo('Batches', crEntB(b), 'offer a waitlist place (no delivery mode ready for enrolment)', crNotReady(b)); return _offerCR.apply(this, arguments); };
const _moveRdyCR = chDoMove;
chDoMove = function (lid, b, nb) {
  if (nb && crShowReady(nb)) { const o = r1Opt(w1OptOfLid(lid, b)), m = (o && o.mode) || null; // a standard-fee learner follows the batch's mode
    if (!crReadyAny(nb) || (m && crBModes(nb).includes(m) && crReady(nb, m) !== 'ready')) { chMoveRefuse(lid, crNotReady(nb)); return false; } }
  return _moveRdyCR.apply(this, arguments);
};
const _applyCR = ACT.applyNvq;
ACT.applyNvq = el => {
  const c = CATALOGUE.find(x => x.id === (el && el.dataset && el.dataset.id)), pr = c && c.kind === 'nvq' ? s3Progs().find(p => p.title === c.title) : null;
  if (pr && pr.level !== 'Level 3' && crMultiFee(pr) && !W.nvq && !crOptModes(pr.id).length) { logA('Admissions', `${W.me.first} ${W.me.last} (${W.me.id})`, 'Blocked: start sign-up (fee options awaiting Finance)', '—', '—', pr.title); toast('Enrolment for this course opens once its fee options are approved. Please check back soon.', 'err'); return false; }
  return _applyCR(el);
};

/* ================= Records ================= */
UXC.push(['CR', 'Course and batch configuration revisions (23 Oct 2026)', [
  'Course Details: "Delivery modes offered" (Self-Paced, Fully Assisted or both) for every level; required for new courses. Create batch shows only the course\'s modes as checkboxes. Level 3 (and any course with Finance-approved mode-specific fee options) keeps the fee-option checkboxes; a mode offered without an option is shown unavailable. Other courses take one mode per batch; both can share a batch once each mode has an approved fee option (Section 5, Finance). Fee options must use an offered mode. Courses without a configuration keep working as before and can be configured with "Configure delivery modes" (audited, future batches only).',
  'Course Details no longer asks for the Academy\'s course code (recorded values are kept and shown as historical). Course name, Awarding body and Awarding body course code remain.',
  'Add unit no longer asks for a unit code: a stable internal reference is assigned. Criterion codes, mappings and evidence are unchanged.',
  'Assignment definitions have no deadline. Each batch sets its own (Batches → batch → Assignment deadlines, the assignment\'s Details, or when publishing). Learners receive their batch\'s deadline; a batch without one doesn\'t issue the assignment until it is set. Changes reach only learners who haven\'t submitted; extensions are never shortened. Older definitions keep their course-level date until a batch sets its own.',
  'Create batch and Edit batch details: Batch code (the Academy\'s) and Awarding body batch code (optional, external) are separate. It can be recorded later ("Record", audited with history) and is shown on the batch and the Coordinator\'s overview.']]);
UXC.push(['CR-F', 'Course and batch configuration — final acceptance corrections (24 Oct 2026)', [
  'Create batch permits any combination of the course\'s modes, also before Finance approves their fee options. Each mode shows "Finance approval required" until it can take learners. Batch review and detail show "Mode configured" and "Ready for enrolment", with each mode\'s state: Ready for enrolment, Approved by Finance — not enabled for this batch (with "Enable fee options"), or Finance approval required.',
  'Enrolment, fee-option choice, payment and learner allocation stay closed for a mode until Finance approves an option of that mode and an administrator enables it for the batch (the Change dialog, audited). Approval never widens a batch on its own. Add learner, waitlist offers, transfers, sign-up allocation and sign-up for a course with no approved option are refused and logged.',
  'Assignments: a batch shows "Deadline required — not released" until it sets its deadline. A new batch never takes another batch\'s deadline or an older course-level date. Publishing needs a deadline for each chosen batch, or an explicit "Release later".']]);
UXC.push(['CR-C', 'Course and batch configuration — final consistency correction (24 Oct 2026)', [
  'A delivery mode can be added to an existing batch from its Change dialog or Edit batch details, using the same rules as Create batch. Until an approved fee option of that mode is enabled for the batch, it shows "Finance approval required" or "Approved by Finance — not enabled". Learners, allocations, fees and schedules don\'t change. A mode or option held by learners can\'t be removed. Changes are audited.',
  'Each mode\'s approval is shown with the fee option, its approval date and the queue item. Approving one mode leaves the other mode\'s records untouched.',
  'Publish: an older draft\'s own date is pre-filled only as an editable suggestion, saved for a batch when you publish. An existing batch deadline wins, and later batches never get it.']]);
UXC.push(['DM', 'Delivery modes from fee options (26 Oct 2026)', [
  'Course Details no longer has a separate "Delivery modes offered" setting. Each fee option has one delivery mode (several options per mode are allowed), and a course offers the modes its fee options use. Course Details lists the fee options from the same records as Section 5 — Fees & Payments, with each option\'s Finance state; a mode waiting for Finance is shown as such, not hidden.',
  'Not only Level 3: a new Level 2, 4 or 5 course chooses "Fee options by delivery mode" or "One programme price" (as before). A one-price course can move to fee options by delivery mode in Section 5 ("Use fee options by delivery mode", audited); its programme fee is kept and needs a mode before Finance approval. Nothing is invented for legacy courses.',
  'Create batch: "Delivery modes accepted" shows a checkbox for each mode the course\'s fee options use; one or both can be ticked, and the ticks survive moving between steps. Review & Create, batch detail and the Coordinator\'s overview list every mode ticked, with readiness for enrolment separately. A course with one programme price, or the Level 3 Diploma\'s Standard programme fee, still has one mode per batch, and the form says why.']]);
const _aIdxCR = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxCR(p) + `<section class="card idx-sec"><h2>CR — Course and batch configuration</h2><ul class="idx-list">${[
  chIdxLi('Course Details — delivery modes offered (Level 3 Diploma)', { act: 'aJump', t: 'a-programmes.NV-L3.details' }, 'DM — derived from the fee options (legacy course: Standard programme fee only).'),
  chIdxLi('Batch → Assignment deadlines', { act: 'aJump', t: 'a-batches.L3AC-JAN26.deadlines' }, 'CR — one deadline per batch for each assignment.')].join('')}</ul></section>`;

/* ---------- DM-P: Demo Scenario #28 publishes Level 3 Version 3 (PD-DM-21) ----------
   Publishing now needs fee options by delivery mode. The demo step takes the authorized Section 5 path first, as the Super
   Administrator (D8), visibly and audited: the course duration (12 months — a demonstration value; the seeded course has none), a
   financial package, fee options by delivery mode, the Standard programme fee replaced by an option in the mode its batches already
   have at the same fee (and the Academy's configured observation-fee rate), approved. It runs just before the publish dialog, after the
   observation decisions the scenario records, so the approved package matches the version. Existing learners keep their terms. */
function crDemoFees(pr, why) {
  const ok1 = () => { const a = MODAL && MODAL.actions.find(x => /primary|danger/.test(x.cls || '')); const r = a && a.fn ? a.fn() : undefined; if (r !== false && MODAL) closeModal(); return r; };
  const put = (k, v) => { const e = $('#modal-root ' + k); if (e && !e.value) e.value = v; }, set = (k, v) => { const e = $('#modal-root ' + k); if (e) e.value = v; }, rsn = () => set('#rsn', why);
  if (!pr.durV) { ACT.crDurRec({ dataset: { p: pr.id } }); set('#cr-du-n', '12'); rsn(); ok1(); }
  if (!cb8Managed(pr)) ACT.cb8Start({ dataset: { p: pr.id } });
  if (!crMultiFee(pr)) { ACT.crFoStart({ dataset: { p: pr.id } }); rsn(); ok1(); }
  const m = crEstMode(pr) || 'Fully Assisted', obs = String(chFeeAmt(m === 'Self-Paced' ? 'Self-paced' : 'Fully assisted'));
  cb8Work(pr).opts.filter(o => o.status === 'Active' && (o.legacy || !M_MODES.includes(o.mode))).map(o => o.id).forEach(id => {
    const o = cb8Work(pr).opts.find(x => x.id === id), ks = o.pay.map(x => x.k);
    ACT.cb8Opt({ dataset: { p: pr.id, o: o.legacy ? '' : id } }); if (o.legacy) { set('#c8-l', m); set('#c8-f', String(o.fee)); } set('#c8-m', m); put('#c8-wp', obs); put('#c8-off', obs); ok1(); closeModal();
    if (o.legacy) { const n = cb8Work(pr).opts.find(x => x.status === 'Active' && !x.legacy && x.mode === m && !x.pay.length); if (n) ks.forEach(k => ACT.cb8PayAdd({ dataset: { p: pr.id, o: n.id, k: String(k) } })); ACT.cb8OptRetire({ dataset: { p: pr.id, o: id } }); rsn(); ok1(); }
  });
  cb8Work(pr).opts.filter(o => o.status === 'Active' && !o.pay.length).forEach(o => ACT.cb8PayAdd({ dataset: { p: pr.id, o: o.id, k: '1' } }));
  if (!(cb8Wf(pr) && cb8Wf(pr).status === 'Approved')) { ACT.cb8SaApprove({ dataset: { p: pr.id } }); rsn(); ok1(); }
  closeModal();
}
const _sc28DMP = ACT.s3Sc28Pub;
ACT.s3Sc28Pub = () => {
  const kp = ACT.kPubProg;
  ACT.kPubProg = el => { ACT.kPubProg = kp; const pr = s3Pr('NV-L3'); if (pr && crFoBlocks(pr).length) { crDemoFees(pr, 'Demo Scenario #28: fee options by delivery mode for Version 3'); toast('Demo: Version 3 now has a Fully Assisted fee option at the existing £2,400 (approved by the Super Administrator) — see Section 5.', 'info'); } return kp(el); };
  try { return _sc28DMP(); } finally { ACT.kPubProg = kp; }
};
