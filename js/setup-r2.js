/* R2 — Mixed-mode Level 3 batches and session audiences (client clarification, Oct 2026).
   A Level 3 batch can hold Self-Paced and Fully Assisted learners. The learner's own delivery mode comes from the fee option they
   chose (R1); learners on the legacy "Standard programme fee" option, and roster learners without a recorded option, keep their
   batch's mode — what applied before (PD-R2-01). The batch's delivery mode (N2) is now the batch's default: it still sets the default
   class pattern and the lock once learners are enrolled, but no longer decides an individual learner's mode.
   A Level 3 session can be targeted at fee-option groups and / or delivery modes. One eligibility rule (r2LidOk) is used for the
   learner's calendar and dashboard, Zoom access, invitations and change / cancellation notices, the attendance register (N4: who is
   listed, imported, marked absent or recorded) and class-plan counts. Changing a session's audience removes the session from the
   calendars of learners who are no longer in it and they lose Zoom access; their earlier attendance is kept read-only and they are
   never marked absent. Sessions without targeting — every session that existed before R2 — remain all-participant sessions.
   Scheduling: one-off sessions and weekly recurring classes (several plans per batch) use one audience selector — the fee options
   ticked (r2AudBox / r2ReadAud) — and one Schedule area (r2SchedSection). Weekly classes saved before audiences existed keep their
   original rule (the batch's Fully Assisted learners) until edited; the Self-Paced limited plan counts classes its Self-Paced
   learners can attend. Loads after R1. */
'use strict';

const R2_TOK = m => 'mode:' + m;
const R2_TOKS = R1_MODES.map(R2_TOK);
// A batch's programme decides: every Level 3 programme has fee options (R1); groups never cross programmes
const r2Pid = b => (b ? s4PidOfTitle(b.course) : null);
// CR (PD-CR-05): a Level 2, 4 or 5 batch is mixed-mode only when it was created with an accepted list; older batches keep one mode
const r2IsL3B = b => { const pid = b && r2Pid(b), pr = pid && s3Pr(pid); return !!(pr && r1IsL3Pid(pid) && (pr.level === 'Level 3' || Array.isArray(b.w1opts))); };
const r2Batch = code => ADMIN.batches.find(x => x.code === code) || null;
// A learner's fee-option group and delivery mode, as a member of a batch
function r2LidInfo(lid, code) {
  const b = r2Batch(code), w = typeof n4World === 'function' ? n4World(lid) : null, o = w && r1OptOfW(w);
  if (o) return { group: o.id, mode: o.mode || (b && b.dmode) || null, src: o.legacy ? 'legacy' : 'option' };
  const x = b && b.r2 && b.r2[lid];
  if (x) { const xo = r1Opt(x.opt); return { group: x.opt, mode: (xo && xo.mode) || (b && b.dmode) || null, src: 'roster' }; }
  return { group: r1StdOf(r2Pid(b)), mode: (b && b.dmode) || null, src: 'legacy' };
}
const r2ModeOfW = w => r1ModeOfW(w) || ((typeof n2BatchOfW === 'function' && n2BatchOfW(w)) || {}).dmode || null;
// The session's audience: an explicit list of tokens (option IDs, "mode:…"), null = explicitly everyone, undefined = not targeted
let R2_NEW = null; // the session being created right now (its audience applies to the first sync and invitation)
let R2_WPLAN = null; // the weekly plan being saved: { code, key, aud } — its generated classes use that audience during the save
const r2AudOf = s => {
  if (!s) return undefined; if (s.aud !== undefined) return s.aud; if (R2_NEW && R2_NEW.id === s.id) return R2_NEW.aud;
  if (R2_WPLAN && R2_WPLAN.aud !== undefined && s.n3 === R2_WPLAN.code) { const p = N3().plans[R2_WPLAN.key]; if (p && Object.values(p.occ || {}).includes(s.id)) return R2_WPLAN.aud; }
  return undefined;
};
function r2InfoOk(s, code, inf) {
  const b = r2Batch(code); if (!r2IsL3B(b)) return true;
  const aud = r2AudOf(s);
  if (Array.isArray(aud)) return aud.includes(inf.group) || (!!inf.mode && aud.includes(R2_TOK(inf.mode)));
  if (aud === undefined && s.gen && s.n3 === code) return inf.mode !== 'Self-Paced'; // a class from the weekly (Fully Assisted) plan
  return true;
}
// The one eligibility rule (used by N4 through n4Eligible, and below)
function r2LidOk(s, lid, code) { return r2InfoOk(s, code, r2LidInfo(lid, code)); }
const r2WOk = (s, w) => { const code = s4bBatchOfW(w); return !code || !s4bCodesOf(s).includes(code) || r2LidOk(s, w.me.id, code); };
const r2Targeted = s => Array.isArray(r2AudOf(s)) || (r2AudOf(s) === undefined && !!s.gen);
function r2AudTxt(s) {
  const aud = r2AudOf(s);
  if (Array.isArray(aud)) return aud.map(t => t.startsWith('mode:') ? 'every ' + t.slice(5) + ' learner' : (r1Opt(t) ? r2OptName(r1Opt(t)) : t)).join(', ');
  if (aud === undefined && s.gen) return `Fully Assisted learners of ${s.n3} (weekly class plan)${(s.with || []).length ? ' and every learner of ' + s.with.join(', ') : ''}`;
  return 'All learners';
}

/* ---------- Batch composition: learners by delivery mode and fee-option group ---------- */
function r2Mix(b) {
  const out = { 'Fully Assisted': 0, 'Self-Paced': 0, groups: {} }; if (!r2IsL3B(b)) return out;
  // (a learner listed both in the cohort and by their own record counts once)
  Array.from(new Set(n4BatchLids(b.code))).forEach(l => { const i = r2LidInfo(l, b.code); if (i.mode) out[i.mode] = (out[i.mode] || 0) + 1; out.groups[i.group] = (out.groups[i.group] || 0) + 1; });
  return out;
}
const r2IsMixed = b => { const m = r2Mix(b); return m['Fully Assisted'] > 0 && m['Self-Paced'] > 0; };
const r2MixTxt = b => { const m = r2Mix(b); return `Fully Assisted ${m['Fully Assisted']} · Self-Paced ${m['Self-Paced']}`; };
// N3 patterns of a Level 3 batch: its default plus every mode its learners have
const _n3KindsR2 = n3Kinds;
// (standard-fee learners follow the batch's mode, so a Self-Paced batch keeps its limited plan)
n3Kinds = b => { const base = _n3KindsR2(b); if (!r2IsL3B(b)) return base; const m = r2Mix(b), sp = m['Self-Paced'] > 0 || n2ModeOf(b) === 'Self-Paced' || r1Opts(r2Pid(b)).some(o => o.mode === 'Self-Paced' && o.status === 'Active'); return sp ? ['weekly', 'limited'] : ['weekly']; };
// The Self-Paced plan counts the classes its Self-Paced learners can attend (not the weekly Fully Assisted classes of a mixed batch)
const _n3SpR2 = n3SpClasses;
n3SpClasses = code => { const b = r2Batch(code), pid = r2Pid(b), std = r1StdOf(pid), groups = r1Opts(pid).filter(o => o.mode === 'Self-Paced').map(o => o.id).concat(std && n2ModeOf(b) === 'Self-Paced' ? [std] : []); return _n3SpR2(code).filter(s => r2InfoOk(s, code, { group: '\u0000', mode: 'Self-Paced' }) || groups.some(g => r2InfoOk(s, code, { group: g, mode: 'Self-Paced' }))); };
// In a mixed batch, "Add a class" on the Self-Paced card proposes the Self-Paced audience
const _n3CardOfR2 = n3CardOf;
n3CardOf = function (b, k) {
  if (!r2IsL3B(b)) return _n3CardOfR2.apply(this, arguments);
  if (k === 'weekly') return r2WeeklyCard(b);
  const h = _n3CardOfR2.apply(this, arguments), spIds = r1Opts(r2Pid(b)).filter(o => o.mode === 'Self-Paced' && o.status === 'Active').map(o => o.id).join(',');
  return h.replace(`data-act="addSession" data-b="${b.code}"`, `data-act="addSession" data-b="${b.code}" data-aud="${spIds}"`).replace('<h2>Class plan — Self-Paced (limited classes)</h2>', '<h2>Limited classes (Self-Paced)</h2>');
};

/* ---------- Calendars and Zoom access: only learners in the audience ---------- */
function r2Strip(w) {
  if (!w || !w.events) return; const code = s4bBatchOfW(w); if (!code) return;
  s4bSessFor(code).forEach(s => { if (!r2WOk(s, w)) w.events = w.events.filter(e => e.id !== s.id && e.id !== 'bs-' + s.id); });
}
const _syncR2 = s4bSyncWEv;
s4bSyncWEv = function (w) { const r = _syncR2.apply(this, arguments); r2Strip(w); return r; };
const r2SessOfEv = id => s4bSessById(String(id || '').replace(/^bs-/, ''));
const _joinBtnR2 = joinBtn;
joinBtn = function (ev) { if (ev && ev.cancelled) return `<span class="small muted r2-cx">${ic('x', 13)} Cancelled — no meeting</span>`; return _joinBtnR2.apply(this, arguments); };
const _joinZoomR2 = ACT.joinZoom;
ACT.joinZoom = el => {
  const id = el && el.dataset && el.dataset.id, ev = (W.events || []).find(e => e.id === id), s = r2SessOfEv(id);
  if (!ev || ev.cancelled || (s && (s.status === 'Cancelled' || !r2WOk(s, W)))) { toast(!ev || (s && !r2WOk(s, W)) ? 'This session isn\'t on your timetable, so there is no meeting link for you.' : 'This session was cancelled — there is no meeting to join.', 'err'); return; }
  return _joinZoomR2(el);
};

/* ---------- Invitations and change / cancellation notices: the audience only ---------- */
s4bNotifySess = function (x, t, body, notifyLearners) {
  const bs = s4bCodesOf(x).map(s4bBatch).filter(Boolean), coords = new Set(bs.map(b => b.coord).filter(Boolean)), tch = new Set(bs.flatMap(b => b.teachers || []).concat(x.teacher ? [x.teacher] : [])), ws = new Map();
  if (notifyLearners) bs.forEach(b => s4bWorldsOf(b.code).forEach(w => { if (r2WOk(x, w)) ws.set(w.v, w); }));
  coords.forEach(c => chCooNotify(c, t, body, 'c-timeline')); tch.forEach(n => tasNotify(t, n + ': ' + body, 't-calendar', 'Sessions')); ws.forEach(w => notifyLearner(w.v, 'Schedule', t, body, 'calendar'));
};

/* ---------- Audience in every Level 3 scheduling dialog: every fee option of the programme, grouped by delivery mode ----------
   The person ticks individual fee options (stable option IDs underneath); the Self-Paced / Fully Assisted headings only group them.
   Counts are distinct learners across every batch taking part. A new session or plan starts with every active option ticked;
   an edit that changes nothing keeps the stored audience exactly. */
const r2Codes = () => { const org = ($('#modal-root #se-b') || {}).value; if (org) return [org].concat($$('#modal-root .se-w:checked').map(x => x.value)); const box = $('#modal-root .r2-aud'); try { return box ? JSON.parse(box.dataset.codes || '[]') : []; } catch (e) { return []; } };
// Learners of each fee option (distinct learner IDs) across the batches taking part
function r2OptLids(codes) {
  const by = {}; codes.forEach(c => Array.from(new Set(n4BatchLids(c))).forEach(l => { const g = r2LidInfo(l, c).group; if (g) (by[g] = by[g] || new Set()).add(l); }));
  return by;
}
const r2AudGroups = b => (b ? r1Opts(r2Pid(b)) : []).filter(o => o.status === 'Active' || Object.values(STORE.worlds || {}).some(w => (r1OptOfW(w) || {}).id === o.id) || ADMIN.batches.some(x => x.r2 && Object.values(x.r2).some(y => y.opt === o.id)));
// A stored list may hold whole-mode entries made earlier in the prototype: shown as the options of that mode (plus the standard fee when a batch's default is that mode)
function r2Expand(list, b, codes) {
  if (!Array.isArray(list)) return null; const pid = r2Pid(b), out = new Set();
  list.forEach(t => { if (!t.startsWith('mode:')) return out.add(t); const md = t.slice(5); r1Opts(pid).filter(o => o.mode === md).forEach(o => out.add(o.id)); const std = r1StdOf(pid); if (std && codes.some(c => (r2Batch(c) || {}).dmode === md)) out.add(std); });
  return [...out];
}
const r2OptName = o => `${money(r1FeeOf(o), 'GBP')} — ${o.legacy ? 'Standard programme fee' : o.label}`;
/* The one audience selector of every Level 3 scheduling dialog — Add session, Edit session, weekly class plan (new and edit), the
   limited Self-Paced "Add a class" and shared classes. No radio choice: the fee options ticked are the audience.
   cur: undefined for something new (every active option ticked, or "pre" — a preset list), else { aud, codes } of what is edited.
   gen: what is edited is a weekly-plan class / plan saved before audiences existed (its rule: the batch's Fully Assisted learners).
   An existing all-participants audience (null, or none stored) is shown with every option ticked; it stays dynamic until the
   ticks are changed (r2ReadAud keeps it on an unchanged save). */
const R2_NOTE_ALL = 'Currently for every learner in the batches taking part, including anyone who joins later on any fee option. Saving with every option still ticked keeps that; changing the ticks fixes the audience to the options ticked.';
const R2_NOTE_GEN = 'Made before classes had their own audience: for the batch\'s Fully Assisted learners (and everyone in a batch that joined the class). Saving the same ticks keeps that.';
function r2AudBox(b, cur, pre, gen, o = {}) {
  if (!b) return '<div class="field full r2-audf"></div>';
  const isNew = !cur, codes = [b.code].concat(cur && cur.codes ? cur.codes : []), aud = cur ? cur.aud : undefined, lids = r2OptLids(codes), pid = r2Pid(b), base = r2AudGroups(b), ids = base.map(x => x.id);
  const dyn = !isNew && (aud === null || (aud === undefined && !gen));
  const sel = isNew ? (pre ? String(pre).split(',').filter(Boolean) : base.filter(x => x.status === 'Active').map(x => x.id)) : Array.isArray(aud) ? r2Expand(aud, b, codes) : dyn ? ids : r2Expand([R2_TOK('Fully Assisted')], b, codes);
  // an option stored on the audience is always listed (even retired), so an unchanged save can't drop it
  const opts = base.concat(sel.map(r1Opt).filter(x => x && r1PidOf(x) === pid && !ids.includes(x.id)));
  const note = o.note !== undefined ? o.note : dyn ? R2_NOTE_ALL : !isNew && aud === undefined ? R2_NOTE_GEN : '';
  const row = o => `<label class="check r2-opt"><input type="checkbox" class="r2-g" value="${o.id}" ${sel.includes(o.id) ? 'checked' : ''}><span><strong>${esc(r2OptName(o))}</strong>${o.status === 'Retired' ? ' <span class="xs muted">(retired)</span>' : ''} <span class="xs muted r2-n" data-o="${o.id}">· ${plural((lids[o.id] || new Set()).size, 'learner')}</span></span></label>`;
  const grp = (h, list, note) => list.length ? `<div class="r2-grp"><div class="r2-gh">${h}</div>${note ? `<div class="xs muted">${note}</div>` : ''}${list.map(row).join('')}</div>` : '';
  const sp = opts.filter(o => o.mode === 'Self-Paced'), fa = opts.filter(o => o.mode === 'Fully Assisted'), std = opts.filter(o => !o.mode);
  return `<div class="field full r2-audf"><fieldset class="stack r2-aud" style="border:0;padding:0" data-codes="${esc(JSON.stringify(codes))}" data-init="${esc(JSON.stringify({ sel }))}"><legend class="lbl">Who should attend?</legend>
    ${note ? `<p class="xs muted r2-wnote">${esc(note)}</p>` : ''}
    ${opts.length ? `<div class="r2-groups">${grp('Self-Paced', sp)}${grp('Fully Assisted', fa)}${grp('Standard fee (legacy)', std, 'Learners on the programme\'s standard fee from before fee options. Their delivery mode follows their batch.')}</div>
    <div class="row r2-audbar"><span class="small r2-sum" aria-live="polite"></span><span class="spacer"></span><button type="button" class="btn btn-sm btn-ghost" data-act="r2AudAll">Select all</button><button type="button" class="btn btn-sm btn-ghost" data-act="r2AudNone">Clear selection</button></div>`
      : `<p class="small muted r2-noopts">This programme has no fee options yet — add them under Finance → Instalment plans. Until then, every learner in the batch attends.</p>`}
    <span class="hint">Saved as the fee options ticked: a fee option added later isn't included unless it's ticked here. Learners not selected don't see the class, get no Zoom link and are never marked absent.</span></fieldset></div>`;
}
// Selected options and distinct learners, kept up to date as boxes, batches taking part or the batch change
function r2AudRefresh() {
  const box = $('#modal-root .r2-aud'); if (!box) return; const codes = r2Codes(); if (!codes.length) return;
  const lids = r2OptLids(codes), ticked = $$('#modal-root .r2-g:checked').map(x => x.value), all = new Set();
  $$('#modal-root .r2-n').forEach(n => { n.textContent = '· ' + plural((lids[n.dataset.o] || new Set()).size, 'learner'); });
  ticked.forEach(id => (lids[id] || []).forEach(l => all.add(l)));
  const s = $('#modal-root .r2-sum'); if (!s) return;
  s.textContent = !ticked.length ? 'No fee option selected' : `${plural(ticked.length, 'fee option')} selected · ${plural(all.size, 'learner')}${all.size ? '' : ' now — learners who join later on these options are included'}`;
}
document.addEventListener('change', e => {
  const t = e.target; if (!t || !t.closest || !t.closest('#modal-root')) return;
  if (t.id === 'se-b' && $('#modal-root .r2-audf')) { const b = r2Batch(t.value); $('#modal-root .r2-audf').outerHTML = r2IsL3B(b) ? r2AudBox(b) : '<div class="field full r2-audf"></div>'; }
  if (t.classList.contains('r2-g') || t.classList.contains('se-w') || t.id === 'se-b') r2AudRefresh();
});
ACT.r2AudAll = () => { $$('#modal-root .r2-g').forEach(x => { x.checked = true; }); r2AudRefresh(); };
ACT.r2AudNone = () => { $$('#modal-root .r2-g').forEach(x => { x.checked = false; }); r2AudRefresh(); };
// Read the audience: undefined (not Level 3, or no fee options — no targeting) or the list of option IDs ticked; false when invalid.
// "orig" is the stored audience of what is edited: an unchanged form keeps it exactly (all-participants stays dynamic, a legacy rule stays).
function r2ReadAud(b, orig) {
  const box = $('#modal-root .r2-aud'); if (!r2IsL3B(b) || !box || !$('#modal-root .r2-g')) return arguments.length > 1 ? orig : undefined;
  const t = $$('#modal-root .r2-g:checked').map(x => x.value);
  let init = null; try { init = JSON.parse(box.dataset.init || 'null'); } catch (e) { init = null; }
  if (arguments.length > 1 && init && r2Same(init.sel, t)) return orig;
  const pid = r2Pid(b), alien = t.filter(x => r1PidOf(r1Opt(x)) !== pid || !r1Opt(x));
  if (alien.length) { fieldErr('#modal-root .r2-g', `These fee options don't belong to ${b.code}'s programme`); return false; }
  if (!t.length) { fieldErr('#modal-root .r2-g', 'Tick at least one fee option'); return false; }
  return t;
}
const r2Same = (a, b) => JSON.stringify(Array.isArray(a) ? a.slice().sort() : a == null ? null : a) === JSON.stringify(Array.isArray(b) ? b.slice().sort() : b == null ? null : b);
// Insert the box into the open modal (before the conflict note) and return its primary action
function r2Inject(b, cur, pre, gen) { if (!MODAL || !r2IsL3B(b)) return null; MODAL.body = MODAL.body.replace('<div id="se-c"></div>', r2AudBox(b, cur, pre, gen) + '<div id="se-c"></div>'); renderModal(); r2AudRefresh(); return MODAL.actions.find(x => x.cls && /primary/.test(x.cls)); }
const _addSessR2 = ACT.addSession;
ACT.addSession = el => {
  const r = _addSessR2(el); if (!MODAL || MODAL.title !== 'Add session') return r;
  const code = (el && el.dataset && el.dataset.b) || ($('#se-b') || {}).value, a = r2Inject(r2Batch(code), undefined, el && el.dataset && el.dataset.aud);
  if (!a) { // the batch list can change to a Level 3 batch: an empty slot is kept for the box
    if (!$('#se-b') || !$$('#se-b option').some(o => r2IsL3B(r2Batch(o.value)))) return r;
    MODAL.body = MODAL.body.replace('<div id="se-c"></div>', '<div class="field full r2-audf"></div><div id="se-c"></div>'); renderModal();
  }
  const act = MODAL.actions.find(x => x.cls && /primary/.test(x.cls)), f = act.fn;
  act.fn = () => {
    const b = r2Batch(($('#se-b') || {}).value), aud = r2ReadAud(b); if (aud === false) return false;
    const id = 'ss-' + S4B().n; R2_NEW = aud === undefined ? null : { id, aud };
    try {
      const res = f(), s = s4bSessById(id);
      // the audience is part of the session's creation: recorded on its "added" history row and audit entry
      if (s && res !== false && Array.isArray(aud)) { s.aud = aud; const txt = ' · for: ' + r2AudTxt(s), hr = s.hist[s.hist.length - 1], au = ADMIN.audit.find(a => a.module === 'Scheduling' && a.action === 'Session added' && a.entity === `${s.title} (${s.batch})`); if (hr) hr[4] = (hr[4] || '') + txt; if (au) au.after = (au.after || '') + txt; }
      return res;
    } finally { R2_NEW = null; }
  };
  return r;
};
const _editSessR2 = ACT.s4bSessEdit;
ACT.s4bSessEdit = el => {
  const s = s4bSessById(el && el.dataset && el.dataset.id), r = _editSessR2(el); if (!s || !MODAL || MODAL.title !== 'Edit session') return r;
  const orig = r2AudOf(s), a = r2Inject(r2Batch(s.batch), { aud: orig, codes: s.with || [] }, null, orig === undefined && !!s.gen); if (!a) return r;
  const f = a.fn;
  a.fn = () => {
    const aud = r2ReadAud(r2Batch(s.batch), orig); if (aud === false) return false;
    const had = 'aud' in s, prev = s.aud, prevTxt = r2AudTxt(s), changed = aud !== orig && !r2Same(orig, aud);
    // nothing changed at all (time, length, teacher, sharing, audience): no history, audit or notices — the session stays as it was
    const dv = ($('#se-d') || {}).value, m2 = +($('#se-m') || {}).value, sw = typeof s4bReadShare === 'function' ? s4bReadShare() : (s.with || []);
    if (!changed && dv && new Date(dv + ':00Z').getTime() === new Date(s.start).getTime() && m2 * 6e4 === new Date(s.end) - new Date(s.start) && ($('#se-t') || {}).value === s.teacher && sw.slice().sort().join() === (s.with || []).slice().sort().join()) { toast('Nothing changed — the session is as it was.', 'info'); return; }
    const codes0 = s4bCodesOf(s), before = new Map(); codes0.forEach(c => s4bWorldsOf(c).forEach(w => { if (r2WOk(s, w)) before.set(w.v, w); }));
    if (aud === undefined) delete s.aud; else s.aud = aud;
    const res = f();
    if (res === false) { if (had) s.aud = prev; else delete s.aud; return res; }
    if (changed) {
      const reason = (s.hist[0] || [])[5] || '';
      s.hist.unshift([now().toISOString(), ADMIN.me.name, 'Audience changed', prevTxt, r2AudTxt(s), reason]);
      logA('Scheduling', `${s.title} (${s.batch})`, 'Session audience changed', prevTxt, r2AudTxt(s), reason);
      // learners who are no longer in it: off their calendar, no Zoom link, told once (their attendance so far stays, read-only)
      before.forEach(w => { if (!r2WOk(s, w)) { r2Strip(w); notifyLearner(w.v, 'Schedule', 'Session removed from your timetable', `${s.title} · ${fdt(s.start)} — it's no longer for your group.`, 'calendar'); } });
      s4bSyncSess(s);
    }
    return res;
  };
  return r;
};



/* ---------- Classes of a Level 3 batch's generated timetable: the same audience selector ----------
   These are real classes (learners' calendars, Zoom link, reschedule, cancel) without a record of their own, so they are for everyone
   in the batch — a dynamic all-participants audience. Their Edit shows the shared selector with every option ticked. Saving the same
   ticks keeps the existing edit (date, teacher) unchanged; a save that changes nothing records nothing. Changing the ticks gives that
   one class a session record with the same ID (s.tt), which replaces the timetable entry (batchEvents), so calendars, Zoom, the
   register and notices follow the one eligibility rule; it is then edited as a session. Other levels keep the existing edit. */
function r2TtRecord(b, e, aud, reason) {
  const who = ADMIN.me.name, at = now().toISOString(), before = new Map();
  s4bWorldsOf(b.code).forEach(w => before.set(w.v, w)); // everyone in the batch had it
  const s = { id: e.id, batch: b.code, title: e.title, start: e.start, end: new Date(s4bEndOf(e)).toISOString(), teacher: e.teacher, link: e.link || null, loc: e.loc || null, status: 'Scheduled', with: [], tt: true, aud,
    hist: [[at, who, 'Created from the batch timetable', '—', fdt(e.start), reason]] };
  s.hist.unshift([at, who, 'Audience changed', 'All learners', r2AudTxt(s), reason]);
  s4bSess(b.code).push(s);
  logA('Scheduling', `${s.title} (${b.code})`, 'Session audience changed', 'All learners (batch timetable)', r2AudTxt(s), reason);
  STORE.aca.schedLog.unshift({ at, who, what: `Session — ${s.title} (${b.code})`, before: 'All learners', after: r2AudTxt(s), reason });
  before.forEach(w => { if (!r2WOk(s, w)) { r2Strip(w); notifyLearner(w.v, 'Schedule', 'Session removed from your timetable', `${s.title} · ${fdt(s.start)} — it's no longer for your group.`, 'calendar'); } });
  s4bSyncSess(s); return s;
}
const _kEditEvR2 = ACT.kEditEv;
ACT.kEditEv = el => {
  const code = el && el.dataset && el.dataset.b, b = r2Batch(code), r = _kEditEvR2(el);
  const e = b && (batchEvents(b).find(x => x.id === el.dataset.id) || null);
  if (!r2IsL3B(b) || !e || e.type !== 'class' || e.s4 || !MODAL || !$('#ke-n')) return r;
  MODAL.body = MODAL.body.replace('<div id="ke-c"></div>', r2AudBox(b, { aud: undefined, codes: [] }, null, false) + '<div id="ke-c"></div>'); renderModal(); r2AudRefresh();
  const act = MODAL.actions.find(x => x.cls && /primary/.test(x.cls)), f = act.fn;
  act.fn = () => {
    const aud = r2ReadAud(b, undefined); if (aud === false) return false;
    const nv = ($('#ke-n') || {}).value, moved = !!nv && new Date(nv + ':00Z').getTime() !== new Date(e.start).getTime(), nt = $('#ke-t') ? $('#ke-t').value : e.teacher, swapped = nt !== e.teacher;
    if (aud === undefined && !moved && !swapped) { toast('Nothing changed — the class is as it was.', 'info'); return; }
    if (aud === undefined) return f(); // date / teacher only: the existing edit
    const reason = mval('#ke-r'); if (!reason) { fieldErr('#ke-r', 'Enter a reason'); return false; }
    if (moved || swapped) { const res = f(); if (res === false) return false; }
    r2TtRecord(b, batchEvents(b).find(x => x.id === e.id) || e, aud, reason); render(); toast('Saved. The class now has its own audience.');
  };
  return r;
};

/* ---------- Weekly class plans of a Level 3 batch: several plans, each for the fee options it names ----------
   A batch's first plan is the one N3 always kept (stored under the batch code); more are added as "<code>#2", "#3"… with the same
   generator, preview, conflict check and no-duplicate rules (N3_SLOT). Each plan stores its audience — a list of fee-option IDs —
   and its generated classes carry it (s.aud) together with the plan they came from (s.n3w). A plan saved before this existed has no
   audience of its own and keeps its original rule (the batch's Fully Assisted learners) until someone edits it. */
const r2PlanKeys = code => { const p = N3().plans, extra = Object.keys(p).filter(k => k.startsWith(code + '#') && p[k] && p[k].weekly).sort((x, y) => +x.split('#')[1] - +y.split('#')[1]); return (p[code] && p[code].weekly ? [code] : []).concat(extra); };
const r2SlotOf = key => (key.includes('#') ? key.split('#')[1] : '');
const r2NextSlot = code => { const p = N3().plans; if (!(p[code] && p[code].weekly)) return ''; let n = 2; while (p[code + '#' + n]) n++; return String(n); };
const r2PlanAudTxt = (p, code) => Array.isArray(p.aud) ? p.aud.map(id => r1Opt(id) ? r2OptName(r1Opt(id)) : id).join(', ') : p.aud === null ? 'All learners' : `Fully Assisted learners of ${code} (original plan)`;
// The batch's weekly plans, each with its timetable, status and audience
function r2WeeklyList(b) {
  const cfg = n3CanConfig(), keys = r2PlanKeys(b.code);
  const li = key => { const p = N3().plans[key], w = p.weekly, live = Object.values(p.occ || {}).map(s4bSessById).filter(s => s && n3Live(s)).length, slot = r2SlotOf(key);
    return `<li class="li r2-wplan" data-plan="${esc(key)}"><div class="li-b"><strong>${esc(w.title)} <span class="xs muted">· weekly plan ${slot || '1'}</span></strong><span class="small">${esc(w.weekday)}s at ${esc(w.time)} · ${w.mins} min · ${esc(w.teacher)} · ${w.where === 'room' ? 'classroom' : 'Zoom'} · ${fd(w.from + 'T09:00:00Z')} – ${fd(w.to + 'T09:00:00Z')} · ${plural(live, 'class', 'classes')}</span><span class="small r2-wfor">For: ${esc(r2PlanAudTxt(p, b.code))}</span></div>${chip(p.weeklyStatus === 'Saved' ? 'Scheduled' : 'Draft — not scheduled', p.weeklyStatus === 'Saved' ? 'green' : 'amber')}${cfg ? `<button class="btn btn-sm" data-act="n3Weekly" data-b="${b.code}" data-w="${slot}">Edit plan</button>` : ''}</li>`; };
  return keys.length ? `<ul class="list r2-wlist">${keys.map(li).join('')}</ul>` : `<p class="small n3-none">${ic('info', 14)} No weekly recurring classes yet.</p>`;
}
function r2WeeklyCard(b) {
  const cfg = n3CanConfig(), sch = n3CanSchedule();
  return `<section class="card n3-plan r2-wplans"><div class="row-b"><h2>Weekly recurring classes</h2>${cfg ? `<button class="btn btn-sm btn-primary" data-act="n3Weekly" data-b="${b.code}" data-w="new">Add weekly recurring classes</button>` : ''}</div>
    ${r2WeeklyList(b)}${cfg && !sch ? '<p class="xs muted">You can configure plans; generating or cancelling sessions needs the Super Admin or Academic Admin.</p>' : ''}</section>`;
}
// A session's audience in a few words (schedule table): an explicit list naming every current active option reads "All fee options"
function r2AudShort(s) {
  const aud = r2AudOf(s), b = r2Batch(s.batch);
  if (Array.isArray(aud) && b) { const ids = r2Expand(aud, b, s4bCodesOf(s)), cur = r2AudGroups(b).filter(o => o.status === 'Active').map(o => o.id); if (cur.length && cur.every(id => ids.includes(id))) return 'All fee options'; }
  return r2AudTxt(s);
}
// One Schedule area for a Level 3 batch: one-off and weekly recurring classes together, every session with its kind and audience
function r2SchedSection(b) {
  const can = s4bSched() && S4B_LIVE(b), cfg = n3CanConfig(), sch = n3CanSchedule();
  const evs = batchEvents(b).sort((x, y) => new Date(x.start) - new Date(y.start));
  const nAll = new Set(n4BatchLids(b.code)).size;
  const row = e => { const r = s4bEvRow(b, e, can); if (e.type !== 'class') return r; const s = e.s4 && s4bSessById(e.id);
    // a class of the batch's own generated timetable (before sessions had records) is for everyone in the batch — no audience of its own
    const kind = !s || s.tt ? 'Batch timetable' : s.batch !== b.code ? 'Shared class' : s.gen ? 'Weekly plan ' + (s.n3w || '1') : 'One-off session', who = s ? `${r2AudShort(s)} · ${plural(n4Eligible(s).length, 'learner')}` : `All learners in the batch · ${plural(nAll, 'learner')}`;
    return r.replace(`${EVLBL[e.type]}</span></span>`, `${EVLBL[e.type]}</span></span><div class="xs muted r2-kind">${kind}</div>`)
      .replace('</td><td class="small">', `<div class="xs r2-for">For: ${esc(who)}</div></td><td class="small">`); };
  return `<section class="card r2-sched"><div class="row-b"><h2>Schedule</h2><div class="row r2-sched-acts">${can ? `<button class="btn btn-sm btn-primary" data-act="addSession" data-b="${b.code}">Add one session</button>` : ''}${cfg ? `<button class="btn btn-sm btn-primary" data-act="n3Weekly" data-b="${b.code}" data-w="new">Add weekly recurring classes</button>` : ''}</div></div>
    <p class="xs muted">One session: one date and time. Weekly recurring classes: a weekday, time and date range — each class becomes its own session. Both ask who should attend, by fee option.</p>
    <h3>Weekly recurring classes</h3>${r2WeeklyList(b)}${cfg && !sch ? '<p class="xs muted">You can configure plans; generating or cancelling sessions needs the Super Admin or Academic Admin.</p>' : ''}
    <h3>Sessions and timetable</h3>${evs.length ? `<div class="tbl-wrap"><table class="tbl dense s4b-sched"><thead><tr><th>When</th><th>Type</th><th>Item</th><th>Teacher</th><th>Meeting</th><th></th></tr></thead><tbody>${evs.map(row).join('')}</tbody></table></div>` : '<p class="small muted">No items yet.</p>'}
    <button class="btn btn-sm" data-go="a-scheduling">Open scheduling console</button></section>`;
}
// Weekly-plan notices go to the plan's audience
const _n3NotifyR2 = n3Notify;
n3Notify = function (codes, t, body, learners, extra) {
  if (!R2_WPLAN || !learners) return _n3NotifyR2.apply(this, arguments);
  _n3NotifyR2.call(this, codes, t, body, false, extra);
  const pseudo = { batch: R2_WPLAN.code, n3: R2_WPLAN.code, gen: {}, aud: R2_WPLAN.aud, with: [] };
  codes.forEach(c => s4bWorldsOf(c).filter(w => c !== R2_WPLAN.code || r2WOk(pseudo, w)).forEach(w => notifyLearner(w.v, 'Schedule', t, body, 'calendar')));
};
const _n3WeeklyR2 = ACT.n3Weekly;
ACT.n3Weekly = el => {
  const code = el && el.dataset && el.dataset.b, b = r2Batch(code); if (!r2IsL3B(b)) return _n3WeeklyR2(el);
  const slot = el.dataset.w === 'new' ? r2NextSlot(code) : (el.dataset.w || ''), key = slot ? code + '#' + slot : code, plan0 = N3().plans[key], isNew = !(plan0 && plan0.weekly);
  const orig = isNew ? 'new' : plan0.aud; // undefined = an original plan without an audience of its own
  const run = f => { const was = N3_SLOT; N3_SLOT = slot || null; try { return f(); } finally { N3_SLOT = was; } };
  run(() => _n3WeeklyR2(el)); if (!MODAL || !/^Weekly class plan/.test(MODAL.title || '')) return;
  MODAL.title = `Weekly class plan${slot ? ' ' + slot : ''} — ${code}`;
  // the same selector as Add session: new → every active option ticked; an original plan → its rule shown, kept on an unchanged save
  MODAL.body = MODAL.body.replace('<div id="n3-pv"></div>', r2AudBox(b, isNew ? undefined : { aud: orig, codes: [] }, null, true) + '<div id="n3-pv"></div>');
  renderModal(); r2AudRefresh();
  const act = MODAL.actions.find(x => x.cls && /primary/.test(x.cls)), f = act.fn;
  act.fn = () => {
    let aud = orig === 'new' ? r2ReadAud(b) : r2ReadAud(b, orig); if (aud === false) return false;
    const before = new Map(); Object.values((N3().plans[key] || {}).occ || {}).map(s4bSessById).filter(s => s && n3Live(s) && !n3Held(s)).forEach(s => s4bCodesOf(s).forEach(c => s4bWorldsOf(c).forEach(w => { if (r2WOk(s, w)) before.set(w.v + '|' + s.id, w); })));
    const prevWP = R2_WPLAN; R2_WPLAN = { code, key, aud };
    let res; try { res = run(() => f()); } finally { R2_WPLAN = prevWP; }
    const p = N3().plans[key]; if (res === false || !p || !p.weekly || (MODAL && /^Weekly class plan/.test(MODAL.title || ''))) return res;
    const changed = orig === 'new' || !r2Same(orig, aud);
    if (aud !== undefined) p.aud = aud;
    // every generated class of this plan that is still to come carries the plan and its audience; held classes keep theirs (history)
    Object.values(p.occ || {}).map(s4bSessById).filter(Boolean).forEach(s => { s.n3w = slot || '1'; if (aud !== undefined && n3Live(s) && !n3Held(s)) s.aud = aud; });
    if (changed) {
      logA('Scheduling', `${b.label} (${b.code})`, isNew ? 'Weekly plan audience set' : 'Weekly plan audience changed', isNew ? '—' : r2PlanAudTxt({ aud: orig }, code), r2PlanAudTxt(p, code), 'Weekly plan' + (slot ? ' ' + slot : ''));
      s4bSyncBatch(code);
      const told = new Set(); before.forEach((w, k) => { const s = s4bSessById(k.split('|')[1]); if (s && !r2WOk(s, w) && !told.has(w.v)) { told.add(w.v); r2Strip(w); notifyLearner(w.v, 'Schedule', 'Weekly classes removed from your timetable', `${p.weekly.title} (${b.label}) is no longer for your group.`, 'calendar'); } });
    }
    return res;
  };
};


/* ---------- Attendance register: the audience is shown; excluded learners' earlier records stay read-only ---------- */
const _regR2 = n4RegisterHtml;
n4RegisterHtml = function (s) {
  let h = _regR2.apply(this, arguments); if (!s4bCodesOf(s).some(c => r2IsL3B(r2Batch(c)))) return h;
  h = h.replace('<h3>History — learners no longer taking part</h3><p class="xs muted">Their batch was removed from the session; their attendance is kept, read-only.</p>', '<h3>History — learners no longer taking part</h3><p class="xs muted">Their batch was removed from the session, or the session\'s audience no longer includes their group. Their attendance is kept, read-only; they are never marked absent.</p>');
  return h.replace(/(<section class="card n4-reg">[\s\S]*?<\/p>)/, `$1<p class="small r2-regaud">Audience: <strong>${esc(r2AudTxt(s))}</strong></p>`);
};

/* ---------- Batch screens: composition, audiences; learner overview shows the learner's own mode ---------- */
const _bdR2 = batchDetail;
batchDetail = function (code, t) {
  let h = _bdR2.apply(this, arguments); const b = r2Batch(code); if (!r2IsL3B(b)) return h;
  const mixed = r2IsMixed(b);
  h = h.replace('<p class="small s4b-bdates">', `<p class="small r2-mix">Learners by delivery mode: <strong>${r2MixTxt(b)}</strong>${mixed ? ' — ' + chip('Mixed batch', 'blue') : ''} <span class="xs muted">— each learner's mode comes from their fee option</span></p><p class="small s4b-bdates">`).replace('<p class="small n2-mode">Delivery mode: ', '<p class="small n2-mode">Default delivery mode (class pattern): ');
  // header: every weekly plan, not only the first
  const nw = r2PlanKeys(code).length; // every weekly plan, in order
  h = h.replace(/(<p class="small n3-sum">Class plan: <strong>)[\s\S]*?(<\/strong>)/, (m, a, z) => `${a}${esc(nw ? 'Weekly: ' + r2PlanKeys(code).map(k => { const p = N3().plans[k]; return `${p.weekly.weekday}s ${p.weekly.time}${p.weeklyStatus === 'Saved' ? '' : ' (draft)'}`; }).join(', ') : 'No weekly recurring classes')}${n3Kinds(b).includes('limited') ? ' · Limited classes: ' + esc(n3SpState(b).label) : ''}${z}`);
  if (t === 'schedule') { // one Schedule area first; the limited Self-Paced count below it, its counted classes folded (they are in the table)
    let lim = ''; h = h.replace(/<section class="card n3-plan r2-wplans">[\s\S]*?<\/section>/, '').replace(/<section class="card n3-plan">[\s\S]*?<\/section>/, m => { lim = m.replace(/(<ul class="list small n3-cls">[\s\S]*?<\/ul>)/, (u, l) => `<details class="r2-limd"><summary class="small">Classes counted (${n3SpClasses(code).length})</summary>${l}</details>`); return ''; });
    h = h.replace(/<section class="card"><div class="row-b"><h2>Schedule<\/h2>[\s\S]*?data-go="a-scheduling">Open scheduling console<\/button><\/section>/, () => r2SchedSection(b) + lim);
  }
  return h;
};
const _dtR2 = dt;
dt = function (cfg) {
  // (this wrapper runs before N2's, which adds the column only when it is missing — so the column is added here, with "Mixed")
  if (cfg && (cfg.id === 'batches' || cfg.id === 'kbatches' || String(cfg.id).startsWith('cbatches-')) && Array.isArray(cfg.cols) && !cfg.cols.some(c => c.k === 'dmode')) {
    const cols = cfg.cols.slice(), i = cols.findIndex(c => c.k === 'course');
    cols.splice(i >= 0 ? i + 1 : 1, 0, { k: 'dmode', l: 'Delivery mode', h: b => (n2ModeOf(b) ? chip(n2ModeOf(b), n2ModeOf(b) === 'Self-Paced' ? 'blue' : 'grey') : '—') + (r2IsL3B(b) && r2IsMixed(b) ? ' ' + chip('Mixed', 'blue') : ''), v: b => (n2ModeOf(b) || '') + (r2IsL3B(b) && r2IsMixed(b) ? ' Mixed' : '') });
    cfg = { ...cfg, cols };
  }
  return _dtR2.call(this, cfg);
};
const _cBatchR2 = SCREENS['c-batches'];
SCREENS['c-batches'] = p => { const h = _cBatchR2(p), b = p && p.id && r2Batch(p.id); if (!r2IsL3B(b)) return h; return h.replace('<dt>Delivery mode</dt><dd class="n2-mode"', '<dt>Default delivery mode (class pattern)</dt><dd class="n2-mode"').replace('</dl>', `<dt>Learners by delivery mode</dt><dd class="r2-mix">${r2MixTxt(b)}${r2IsMixed(b) ? ' (mixed batch)' : ''}</dd></dl>`); };
const _hubR2 = nvqHub;
nvqHub = function (e) {
  const h = _hubR2.apply(this, arguments), own = r1ModeOfW(W); if (!own || !r1IsL3W(W)) return h;
  return h.replace(/<dd class="n2-mode">[\s\S]*?<\/dd>/, `<dd class="n2-mode">${esc(own)}${own === 'Self-Paced' ? `<div class="xs muted">${esc(N2_SP_SUPPORT)}</div>` : ''}<div class="xs muted r2-own">Your own delivery mode, from your fee option.</div></dd>`);
};

/* ---------- Add learner to a Level 3 batch: their fee-option group is recorded with the batch ---------- */
const _addToBatchR2 = ACT.addToBatch;
ACT.addToBatch = (el, e) => {
  const b = r2Batch(el && el.dataset && el.dataset.id), roster0 = b ? b.roster.map(x => x[1]) : [], r = _addToBatchR2(el, e);
  if (!r2IsL3B(b) || !MODAL || !/^Add learner/.test(MODAL.title || '')) return r;
  const opts = r1Opts(r2Pid(b)).filter(o => o.status === 'Active'), std = r1StdOf(r2Pid(b));
  MODAL.body = MODAL.body.replace('<div class="field"><label for="ab-l">Learner</label>', `<div class="field"><label for="r2-ab-o">Fee-option group</label><select class="select" id="r2-ab-o">${opts.map((o, k) => `<option value="${o.id}" ${(std ? o.id === std : !k) ? 'selected' : ''}>${esc(o.label)} — ${esc(r1ModeTxt(o))}</option>`).join('')}</select><span class="hint">Decides which targeted sessions the learner gets. No fee or payment is created here.</span></div><div class="field"><label for="ab-l">Learner</label>`); renderModal();
  const a = MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)), f = a.fn;
  a.fn = (...x) => {
    const opt = ($('#r2-ab-o') || {}).value || std, res = f(...x), add = b.roster.map(y => y[1]).filter(l => !roster0.includes(l));
    add.forEach(l => { b.r2 = b.r2 || {}; b.r2[l] = { opt, by: ADMIN.me.name, at: now().toISOString() }; logA('Batches', `${b.label} (${b.code})`, 'Fee-option group recorded', '—', `${l} → ${opt}`, 'Added to a Level 3 batch'); });
    return res;
  };
  return r;
};

if (typeof ADMIN !== 'undefined' && ADMIN && STORE.worlds) Object.values(STORE.worlds).forEach(w => { try { r2Strip(w); } catch (x) { /* before the admin view exists */ } });

/* ---------- Create batch: for a Level 3 programme the mode field is the batch's default class pattern ---------- */
function r2NbLabel() {
  const sel = $('#modal-root select#nb-dm'), co = $('#modal-root #nb-co'); if (!sel) return;
  const l3 = co ? r1IsL3Pid(s4PidOfTitle(co.value)) : false, lab = $('#modal-root label[for="nb-dm"]'), hint = $('#modal-root #nb-dmh');
  if (lab) lab.textContent = l3 ? 'Default delivery mode (class pattern)' : 'Delivery mode';
  if (hint && l3) hint.textContent = 'Learners\' modes come from their fee options, so the batch can hold both. This sets its default class pattern.';
}
const _rmR2 = renderModal; renderModal = function () { const r = _rmR2.apply(this, arguments); try { r2NbLabel(); } catch (e) { /* no batch form open */ } return r; };
const _nbCourseR2 = INP.n2NbCourse; INP.n2NbCourse = el => { const r = _nbCourseR2(el); r2NbLabel(); return r; };
