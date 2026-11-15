/* ============================================================
   Point 2 — criterion-level "Add to PD" after marking (Welfare Academy email, point 2; 13 Nov 2026; PD-2-* in
   PROVISIONAL-DECISIONS.md). Loads after n1b-shortcourse.js.

   Before: a criterion reached the Professional Discussion only when the Assessor, while marking, set an answer's exit to
   "Added to PD" and ticked its criteria (PDS); a criterion published as Not Met could only be resubmitted.
   Now: after the marking is published, the learner's allocated assignment Assessor or their Academic Coordinator can add ONE
   criterion that is currently Not Met (status Action Required, not locked, no open PD item, its marking published, no final
   Pass / Fail declared) to the learner's existing PD checklist — the same PD item record PDS creates (w.pd.items, or
   STORE.tas.pd for a learner without a learner record), with who, when, the role, the assignment, question and criterion.
   Only that criterion's status changes (Action Required → Added to PD); the assignment, its answers, feedback, rounds, other
   criteria, deadlines and final outcome are untouched. The criterion isn't verified and nothing is passed: only the PD
   assessor's recorded outcome changes it, and only the allocated Assessor declares the final Pass / Fail (both unchanged).
   Checked inside the action (and again on confirm): Assessor — the TA-1 publication rights (Assessor portal, marking rights, an
   Active account, the allocated assignment assessor, not the batch's Coordinator, not Discontinued); Coordinator — R3's
   Coordinator rights (Coordinator portal, their batch, not read-only, not Discontinued). Anyone else is refused and logged.
   A prototype only. PRODUCTION MUST ENFORCE THIS ON THE SERVER.
   ============================================================ */
'use strict';

const N2_RULE = 'PD-INIT-1';
// The submission the actor may act on, by portal (null if it isn't in their scope)
const n2Sub = key => (S.portal === 'staff' ? tasSubs(true) : S.portal === 'coord' ? mySubmissions(true) : []).find(x => x.key === key) || null;
const n2Asg = s => (S.portal === 'staff' ? tasAsg(s) : synthAsg(s));
// Who may initiate: '' = allowed, else why not
function n2WhoWhy(key) {
  if (S.portal === 'staff') {
    if (!hasRole('Assessor') || CAN('mark') !== 'yes') return 'Only the learner\'s allocated assignment assessor or their Academic Coordinator can add a criterion to the PD.';
    const me = ta1Me(), acc = ADMIN.staff.filter(x => x.name === me);
    if (acc.length === 1 && acc[0].status !== 'Active') return `${me}'s account is ${String(acc[0].status).toLowerCase()}.`;
    const s = n2Sub(key); if (!s) return 'This submission isn\'t in your marking.';
    if (s.L.short) return 'Short courses have no Professional Discussion.';
    if (chEff(s.L.lid, 'asg', s.L.batch) !== me) return `Only the allocated assignment assessor (${chEff(s.L.lid, 'asg', s.L.batch)}) or the learner's Academic Coordinator can add a criterion to the PD.`;
    if (s.L.batch && s.L.batch.coord === me) return 'The batch\'s Academic Coordinator acts from the Coordinator portal (P-33).';
    if (s.L.status === 'Discontinued') return 'This learner\'s enrolment is Discontinued — read-only.';
    return '';
  }
  if (S.portal === 'coord') {
    const w = r3CooWhy(key); if (w) return w === R3_NOSUB ? 'Nothing has been submitted for this assignment.' : w;
    // A learner-specific action: the learner's designated Coordinator in the batch (MC), not every Coordinator of the batch
    const s = n2Sub(key); if (s && typeof mcMineL === 'function' && !mcMineL(s.L)) return `Only ${s.L.name}'s Academic Coordinator (${(typeof mcOf === 'function' && mcOf(s.L.lid, s.L.batch)) || 'their designated Coordinator'}) can add a criterion to their PD.`;
    return '';
  }
  return 'Only the learner\'s allocated assignment assessor or their Academic Coordinator can add a criterion to the PD.';
}
// The assignment's criteria in order, each with the questions that map it
function n2Crits(a) {
  const out = [];
  a.qs.forEach((q, k) => qCrits(q).forEach(code => { const o = out.find(x => x.code === code); if (o) o.qs.push(k + 1); else out.push({ code, qs: [k + 1] }); }));
  (a.acrit || []).forEach(code => { if (!out.some(x => x.code === code)) out.push({ code, qs: [] }); });
  return out;
}
/* PD-2-10: for a learner with staff-side records only, the PD outcome decides a criterion referred to the PD — as the PD outcome sets a
   portal learner's criterion (staff.js pdOutcome: Met → Achieved and locked, Not Met → Action Required). Derived from the PD record,
   nothing stored changes. Any open item → Added to PD; a PD Met (item Achieved) → Achieved, whatever marking says; the latest item
   Returned to Action Required (PD Not Met) → Action Required, unless marking of the criterion was published after that outcome (a new
   assessment — a portal learner's resubmission and re-marking moves the criterion on the same way). null = no PD referral: the
   marking-derived state applies. markAt = when this criterion's latest published marking was published. */
function n2PdSt(t, code, markAt) {
  const its = t && t.items ? t.items.filter(i => i[0] === code) : []; if (!its.length) return null;
  if (its.some(i => i[3] === 'Open')) return 'Added to PD';
  if (its.some(i => i[3] === 'Achieved')) return 'Achieved';
  if (its[its.length - 1][3] !== 'Returned to Action Required') return null;
  const o = t.outcomes && t.outcomes[code], oAt = o && o.at ? Date.parse(o.at) : NaN, mAt = markAt ? Date.parse(markAt) : NaN;
  return !isNaN(oAt) && !isNaN(mAt) && mAt > oAt ? null : 'Action Required';
}
// The learner's current record of a criterion: status, lock, open PD item; and whether this assignment's marking of it is published
function n2State(s, a, code) {
  const L = s.L, w = L.v && STORE.worlds[L.v];
  if (w && w.tree) {
    let c = null; w.tree.forEach(u => u.mods.forEach(m => m.los.forEach(lo => lo.crit.forEach(x => { if (!c && x.code === code) c = x; }))));
    const qs = a.qs.filter(q => qCrits(q).includes(code)), wa = (w.assignments || []).find(x => x.id === a.id) || a;
    const pub = (wa.qs || []).some(q => qCrits(q).includes(code) && (q.fb || []).length) || ((a.acrit || []).includes(code) && !!STORE.tas.rel[s.key]);
    return { live: true, w, c, st: c ? c.st : null, lock: c ? c.lock : null, open: !!(w.pd && w.pd.items.some(i => i.ref === code && i.status === 'Open')), pd: !!w.pd, pub, qs };
  }
  // A learner with staff-side records only: the authoritative facts are this assignment's published release record (by the learner's own
  // copy of the assignment), the staff locks and the PD record — not the competency summary, which maps by the base definitions
  const t = STORE.tas.pd.find(x => x.lid === L.lid), dup = STORE.tas.pd.filter(x => x.lid === L.lid).length > 1, rel = STORE.tas.rel[s.key], lock = STORE.tas.locks[L.lid + '|' + code] || null;
  const its = rel && rel.items ? a.qs.filter(q => qCrits(q).includes(code)).map(q => rel.items[q.id]).filter(Boolean) : [];
  const pub = its.length > 0 || (!!rel && (a.acrit || []).includes(code));
  const open = !!(t && t.items.some(i => i[0] === code && i[3] === 'Open')), j = n2Judg(s.key, code);
  const markAt = its.map(x => x.at || rel.at).filter(Boolean).sort().slice(-1)[0] || (rel && rel.at) || null, ps = n2PdSt(t, code, markAt); // PD-2-10
  const st = lock ? 'Achieved' : ps || (its.some(x => x.exit === 'resub') || (j && j.value === 'Not Met') ? 'Action Required' : pub ? 'In Progress' : null);
  return { live: false, t, dup, st, lock, open, pd: !!t, pub };
}
/* PD-2-09: a learner with staff-side records only and no PD record yet. The marking-time PD routes (CO-1 publication, CMA whole-assessment
   exit) create that learner's STORE.tas.pd record when a criterion first goes to the PD; Add to PD now does the same on confirmation —
   but only when the learner, enrolment and programme are unambiguous, since the record is kept per learner. '' = mapping is sound. */
function n2MapWhy(s) {
  const L = s && s.L, lid = L && L.lid;
  if (!lid) return 'This submission has no learner ID, so no PD record can be created for it.';
  const recs = (ADMIN.learners || []).filter(x => x.id === lid);
  if (!recs.length) return `No learner record exists for ${lid}, so no PD record can be created.`;
  if (recs.length > 1) return `More than one learner record has the ID ${lid}, so the PD record can't be matched to one learner.`;
  if (Object.keys(STORE.worlds || {}).some(k => STORE.worlds[k] && STORE.worlds[k].me && STORE.worlds[k].me.id === lid)) return `${lid} also has a learner portal record, so it isn't clear which record the PD belongs to.`;
  const b = L.batch && (ADMIN.batches || []).find(x => x.code === L.batch.code);
  if (!b || b.short || !chCohLids(b).includes(lid)) return `${L.name || lid} isn't enrolled in ${L.batch ? L.batch.code : 'a batch'} for this programme, so no PD record can be created.`;
  if (typeof acProgsOf === 'function' && acProgsOf(lid).size !== 1) return `${L.name || lid} is enrolled on more than one programme and the PD record is kept per learner, so it isn't clear which programme's PD this belongs to.`;
  return '';
}
// The marking-time routes' record shape (co1-competency.js, cma-mapping.js); created once, only from a confirmed, authorised action
function n2PdRecord(L) {
  const have = STORE.tas.pd.find(x => x.lid === L.lid); if (have) return have;
  const t = { lid: L.lid, name: L.name, items: [], session: null, history: [] }; STORE.tas.pd.push(t); return t;
}
// The latest published Assessor judgement of the criterion on this submission
const n2Judg = (key, code) => (r3Judg(key) || []).filter(x => x.role === 'Assessor' && x.published && (x.crit === code)).slice(-1)[0] || null;
// '' = this criterion may be added now, else why not
function n2EligWhy(s, a, code) {
  if (!n2Crits(a).some(x => x.code === code)) return `${code} isn't mapped to this assignment.`;
  const o = r3Out(s.key); if (o && o.result) return `The final outcome (${o.result}) has been declared for this assignment — its decisions are locked.`;
  const x = n2State(s, a, code);
  if (x.dup) return 'This learner has more than one Professional Discussion record, so the criterion can\'t be matched to one. Ask an administrator to check the records.';
  if (!x.pd) { if (x.live) return 'This learner has no Professional Discussion record.'; const m = n2MapWhy(s); if (m) return m; } // staff-side: created on confirmation (PD-2-09)
  if (!x.pub) return `${code} hasn't been judged in published marking for this assignment yet.`;
  if (x.open || x.st === 'Added to PD') return `${code} is already in the Professional Discussion checklist.`;
  if (x.lock || x.st === 'Achieved') return `${code} is Met — only a criterion that is Not Met can be added to the PD.`;
  if (x.st !== 'Action Required') return `${code} isn't currently Not Met (${x.st || 'no record'}).`;
  // The formal judgement decides "Not Met" (a Partially Met criterion also needs rework, but isn't Not Met — Amber is pending the client)
  const j = n2Judg(s.key, code); if (!j) return `${code} has no published Assessor judgement for this assignment.`;
  if (j.value !== 'Not Met') return `${code} was judged ${j.value}, not Not Met.`;
  return '';
}
const n2Role = () => (S.portal === 'coord' ? 'Academic Coordinator' : 'Assessor');
const n2Me = () => (S.portal === 'coord' ? (CME() || {}).name || 'Academic Coordinator' : ta1Me());
function n2Deny(key, code, why) { tasLog('PD', `${String(key || '—')} · ${code || '—'}`, 'Blocked: add criterion to PD', '—', 'No change', why); if (MODAL) closeModal(); toast(why, 'err'); return false; }

/* ---------- The action: one criterion, checked here and again on confirm ---------- */
ACT.n2AddPd = el => {
  const key = el && el.dataset && el.dataset.k, code = el && el.dataset && el.dataset.c;
  const chk = () => { const w = n2WhoWhy(key); if (w) return { why: w }; const s = n2Sub(key), a = s && n2Asg(s); if (!a) return { why: 'This submission isn\'t available.' }; const e = n2EligWhy(s, a, code); return e ? { why: e } : { s, a }; };
  const c0 = chk(); if (c0.why) return n2Deny(key, code, c0.why);
  const qs = n2Crits(c0.a).find(x => x.code === code).qs;
  reasonDlg({ title: `Add ${esc(code)} to the Professional Discussion`, ok: 'Add to PD', label: 'Reason (required — shown to the PD assessor and the learner)',
    body: `<p class="small">Only <span class="code">${esc(code)}</span> moves to ${esc(c0.s.L.name)}'s PD checklist${qs.length ? ` (from ${esc(c0.a.title.split(' —')[0])} · ${qs.map(n => 'Q' + n).join(', ')})` : ''}. The assignment, its answers, feedback, deadlines, other criteria and final outcome don't change. The criterion isn't verified: the PD assessor records the outcome.</p>`,
    onOk: r => { const c1 = chk(); if (c1.why) return n2Deny(key, code, c1.why); n2Apply(c1.s, c1.a, code, r); } });
  return true;
};
function n2Apply(s, a, code, reason) {
  const me = n2Me(), role = n2Role(), at = now().toISOString(), x = n2State(s, a, code), tag = a.title.split(' —')[0];
  const qs = n2Crits(a).find(z => z.code === code).qs, from = `${tag} · ${qs.length ? qs.map(n => 'Q' + n).join(', ') : 'whole assessment'}`;
  const init = Object.freeze({ rule: N2_RULE, role, by: me, at, crit: code, aid: a.id, key: s.key, from });
  if (x.live) {
    const w = x.w;
    w.tree.forEach(u => u.mods.forEach(m => m.los.forEach(lo => lo.crit.forEach(c => { if (c.code === code && !c.lock && c.st === 'Action Required') c.st = 'Added to PD'; }))));
    w.pd.items.unshift({ ref: code, unit: 'U' + code.split(' ')[0], from, reason, status: 'Open', go: 'assignment.' + a.id, by: me, at, aid: a.id, pv: typeof pdsPin === 'function' ? pdsPin(s) : null, init });
    notifyLearner(s.L.v, 'Assignments', 'Added to your Professional Discussion', `${me} added ${code} (${tag}) to your Professional Discussion. It will be discussed there; your assignment and its feedback are unchanged.`, 'progress..pd');
  } else {
    const made = !x.t, t = n2PdRecord(s.L); t.items.push([code, from, reason, 'Open']); t.meta = t.meta || {}; t.meta[code] = { by: me, at, aid: a.id, init };
    // A learner with staff-side records only has no learner inbox: as on the marking-time routes, nothing is sent; the change is audited
    if (made) tasLog('PD', `${s.L.name} (${s.L.lid})`, 'PD record created', 'No PD record', 'PD record (no session scheduled)', `${role} ${me} — created to add ${code} from ${from} (PD-2-09)`);
  }
  tasLog('PD', `${s.L.name} · ${a.title}`, 'Criterion added to PD', `${code}: Action Required (Not Met)`, `${code}: Added to PD`, `${role} ${me} — ${reason}`);
  render(); toast(`${code} added to ${s.L.name}'s Professional Discussion checklist.`);
  return true;
}
// A learner without a learner record: the PD record decides a criterion referred to the PD (their published marking is unchanged) —
// open → Added to PD whatever a later marking says; PD Met → Achieved; PD Not Met → Action Required unless marked again since (PD-2-10)
const _pubN2 = co1Published;
co1Published = function (L, codes) {
  const r = _pubN2.apply(this, arguments), t = L && STORE.tas.pd.find(x => x.lid === L.lid);
  if (t) [...new Set(t.items.map(i => i[0]))].forEach(code => {
    if (!r.st[code] || (r.src[code] && r.src[code].lock)) return; // no published record shown for it, or verified (locked)
    const ps = n2PdSt(t, code, r.src[code] && r.src[code].at); if (ps) r.st[code] = ps;
  });
  return r;
};

/* ---------- A criterion pending PD keeps its PD routing when later marking is published (PD-2-06) ----------
   Publishing marking re-applied each marked criterion's status (resubmission → Action Required; verified Met → Achieved and locked),
   which replaced "Added to PD" on a criterion whose PD item was still open — and could verify it without the PD assessor. Now a
   criterion with an open PD item keeps its status, date, lock and source; the new marking's judgements, answers and feedback are
   recorded as published (history unchanged), and the criterion's outcome stays with the PD assessor. No PD cancellation exists, so
   none is offered: the conflicting change is refused for that criterion only, logged and explained. */
const n2OpenCodes = s => {
  const w = s && s.live && s.L && STORE.worlds[s.L.v];
  if (w && w.pd) return new Set(w.pd.items.filter(i => i.status === 'Open').map(i => i.ref));
  const t = s && s.L && STORE.tas.pd.find(x => x.lid === s.L.lid); return new Set(t ? t.items.filter(i => i[3] === 'Open').map(i => i[0]) : []);
};
const _relN2 = releaseFeedback;
releaseFeedback = function (s, a) {
  if (!s || !a || !s.L) return _relN2.apply(this, arguments);
  const open = n2OpenCodes(s), mine = new Set(n2Crits(a).map(x => x.code)), codes = [...open].filter(c => mine.has(c));
  if (!codes.length) return _relN2.apply(this, arguments);
  const w = s.live && STORE.worlds[s.L.v], snap = [], locks = {};
  if (w && w.tree) w.tree.forEach(u => u.mods.forEach(m => m.los.forEach(lo => lo.crit.forEach(c => { if (codes.includes(c.code)) snap.push([c, { st: c.st, date: c.date, lock: c.lock, src: c.src }]); }))));
  else codes.forEach(c => { locks[c] = STORE.tas.locks[s.L.lid + '|' + c]; });
  const r = _relN2.apply(this, arguments); if (r === false) return r;
  const kept = [];
  snap.forEach(([c, o]) => { if (c.st !== o.st || c.lock !== o.lock) { kept.push(c.code); } ['st', 'date', 'lock', 'src'].forEach(k => { if (o[k] === undefined) delete c[k]; else c[k] = o[k]; }); });
  if (!w) codes.forEach(c => { const k = s.L.lid + '|' + c; if (locks[c] === undefined && STORE.tas.locks[k]) { delete STORE.tas.locks[k]; kept.push(c); } });
  const all = [...new Set(kept.concat(codes))];
  tasLog('PD', `${s.L.name} · ${a.title}`, 'Criteria kept in PD (marking published)', all.join(', '), 'Added to PD — outcome by the PD assessor', 'Their PD items are open: this marking is recorded, but it doesn\'t change these criteria');
  return r;
};
// Resubmitting an answer set its criteria to In Progress (CO-1), which also replaced "Added to PD" on a criterion whose PD item is open
const _subN2 = co1Submitted;
co1Submitted = function (w, codes) {
  const open = w && w.pd ? new Set(w.pd.items.filter(i => i.status === 'Open').map(i => i.ref)) : new Set();
  return _subN2.call(this, w, (codes || []).filter(c => !open.has(c)));
};
// The marking view says so before publication
const _cardN2 = n2Card;
n2Card = function (s, a) {
  const h = _cardN2.apply(this, arguments), codes = [...n2OpenCodes(s)].filter(c => n2Crits(a).some(x => x.code === c)); if (!codes.length) return h;
  const note = `<div class="note b-blue n2-keep" role="status">${ic('info')}<div class="small"><strong>${codes.map(esc).join(', ')} ${codes.length === 1 ? 'is' : 'are'} in the Professional Discussion.</strong> Marking you publish is recorded, but it doesn't change ${codes.length === 1 ? 'this criterion' : 'these criteria'}: the PD assessor records the outcome.</div></div>`;
  return h ? h.replace('<div class="tbl-wrap">', note + '<div class="tbl-wrap">') : '';
};

/* ---------- On the Assessor's marking view and the Coordinator's submission review ---------- */
function n2Card(s, a) {
  if (n2WhoWhy(s.key) || !n2Crits(a).length) return '';
  const rows = n2Crits(a).map(({ code, qs }) => {
    const x = n2State(s, a, code), why = n2EligWhy(s, a, code);
    const st = x.open && x.st !== 'Added to PD' ? 'Added to PD' : x.st;
    return `<tr data-crit="${esc(code)}"><td><span class="code">${esc(code)}</span>${qs.length ? ` <span class="xs muted">${qs.map(n => 'Q' + n).join(', ')}</span>` : ''}</td><td>${st ? chip(st) : '<span class="xs muted">No record</span>'}</td><td>${why ? `<span class="xs muted">${esc(why)}</span>` : `<button class="btn btn-sm" data-act="n2AddPd" data-k="${esc(s.key)}" data-c="${esc(code)}">Add to PD</button>`}</td></tr>`;
  }).join('');
  return `<section class="card n2-pd" aria-labelledby="n2-pd-h"><h2 id="n2-pd-h">Criteria not met — Professional Discussion</h2>
    <p class="xs muted">A criterion that is currently Not Met can be added to the learner's PD checklist, one at a time. Nothing else changes: the PD assessor records its outcome, and the final Pass / Fail stays with the allocated Assessor.</p>
    <div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Criterion</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
const _tMarkN2 = SCREENS['t-mark'];
SCREENS['t-mark'] = p => {
  const h = _tMarkN2(p), s = typeof h === 'string' && S.portal === 'staff' ? tasSubs(true).find(x => x.key === (p && p.id)) : null; if (!s) return h;
  return co1Insert(h, n2Card(s, tasAsg(s)), ['<section class="card co1-pd"', '<section class="card r3-out">']);
};
const _cSubN2 = SCREENS['c-sub'];
SCREENS['c-sub'] = p => {
  const h = _cSubN2(p), s = typeof h === 'string' && S.portal === 'coord' ? mySubmissions(true).find(x => x.key === (p && p.id)) : null; if (!s) return h;
  return co1Insert(h, n2Card(s, synthAsg(s)), ['<section class="card co1-pd"', '<div class="r3-coo">', '<details class="card r3-cold">']);
};

UXC.push(['2', 'Criterion-level Add to PD — Welfare Academy email, point 2 (13 Nov 2026)', [
  'After marking is published, the allocated assignment Assessor or the learner\'s Academic Coordinator can add one criterion that is currently Not Met to the learner\'s existing PD checklist ("Criteria not met — Professional Discussion" on the marking view / submission review). Only that criterion changes (Added to PD); the assignment, answers, feedback, other criteria and final outcome don\'t. Who, when, the role and the source are recorded; the learner is notified.',
  'PD outcomes stay with the PD assessor and the final Pass / Fail with the allocated Assessor. Anyone else, a Met or already-added criterion, unpublished marking or a declared final outcome is refused and logged.']]);
