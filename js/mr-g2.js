/* ============================================================
   MR-G2 — Staff portal and observations (multi-role audit, 2 Nov 2026)
   MR-03  every staff-portal mutation runs only inside the Teacher / Assessor portal (never from the learner, agency,
          Coordinator or admin portals while a staff persona happens to be loaded)
   MR-04  observation, PD, portfolio-note and recommendation actions need the Assessor capability (CAN) and the current
          allocation; Teacher-only users are refused (the CH-17 action guards now apply to every staff persona: chActScoped)
   MR-05  signed-off (Completed) observations are locked: only Proposed or Confirmed observations can be cancelled or
          rescheduled, and only a Confirmed one signed off (PD-AC-11)
   MR-16  rescheduling never breaks the learner's Observations page: the rescheduled record gets newAt when the new
          proposal is sent; until then the learner sees "new date to be proposed" (screens-b.js). No fee effect (CH-40).
   MR-19  a register is adjusted / reviewed / matched only by staff who teach the session's batch
   MR-28  assessor notes, IQA advisory notes and recommendations only for learners the Assessor is allocated to
   MR-39  staff portfolio of a roster-only learner uses the PD-F-06 programme resolver (staff.js, in place)
   One gate (portal + capability + allocation), checked when the dialog opens AND when it is confirmed, the r3MarkWhy
   pattern; a refusal changes nothing and is logged through w0Deny.
   A prototype can only enforce this in the browser. PRODUCTION MUST ENFORCE IT ON THE SERVER.
   ============================================================ */
'use strict';

const G2_CAP_WHY = {
  observations: 'Observations are run by the learner\'s observation assessor — Teachers don\'t propose, cancel, reschedule or sign off observations (G6.1).',
  pd: 'Professional Discussions are run by the learner\'s PD assessor (G6.1).',
  portfolio: 'Only Assessors write portfolio notes (G6.1).',
  mark: 'Only Assessors mark and add advisory notes to marked work (G6.1).',
  recommend: 'Only Assessors add recommended actions to an improvement plan (G6.1).',
  attendance: 'Your role can\'t change attendance.'
};
// 1. portal + capability
function g2StaffWhy(cap) {
  if (S.portal !== 'staff') return 'This is done in the Teacher / Assessor portal by the member of staff responsible.';
  if (typeof TME !== 'function' || !TME()) return 'No member of staff is signed in.';
  if (CAN(cap) !== 'yes') return G2_CAP_WHY[cap] || 'Your role can\'t do this.';
  return '';
}
// 2. allocation — a learner in the actor's batches, and the actor is the learner's current assessor of the given kind(s)
const g2L = lid => (lid && chRaw(() => tasLearners(true)).find(l => l.lid === lid)) || null;
const G2_KIND = { asg: 'assignment assessor', pd: 'PD assessor', obs: 'observation assessor' };
// delegate: when the dialog opens, a wrong-allocation refusal is left to the CH-17 guard underneath (ch-b5.js, now applied to
// every staff persona), which refuses and logs "Blocked: not the … assessor" exactly as before; the confirm step re-checks here
function g2LidWhy(cap, lid, kinds, delegate) {
  const w = g2StaffWhy(cap); if (w) return w;
  const L = g2L(lid); if (!L || L.short) return delegate ? '' : 'This learner isn\'t one of your allocated learners.';
  if (kinds.some(k => chEff(L.lid, k, L.batch) === chMe())) return '';
  if (delegate) return '';
  return `Only ${L.name}'s ${kinds.map(k => `${G2_KIND[k]} (${chEff(L.lid, k, L.batch) || '—'})`).join(' or ')} can do this.`;
}
const G2_ANY = ['asg', 'pd', 'obs'];
// 3. observations — allocation, plus the status lock (PD-AC-11)
const g2Obs = id => (id && chRaw(() => tasObs().find(o => o.id === id))) || null;
const g2Rec = o => o ? (o.src || STORE.tas.obs.find(x => x.id === o.id) || null) : null;
function g2ObsWhy(id, lock, delegate) {
  const w = g2StaffWhy('observations'); if (w) return w;
  const o = g2Obs(id); if (!o || o.blocked) return 'This observation isn\'t one of your learners\'.';
  const h = chEff(o.lid, 'obs'); if (h !== chMe()) return delegate ? '' : `Only ${o.learner}'s observation assessor (${h || '—'}) can do this.`;
  const st = (g2Rec(o) || o).status;
  if (lock === 'change' && !['Proposed', 'Confirmed'].includes(st)) return st === 'Completed' ? 'This observation is signed off and locked — it can\'t be cancelled or rescheduled. Corrections go through a Data Correction (PD-AC-11).' : `This observation is already ${st.toLowerCase()} — only a proposed or confirmed observation can be cancelled or rescheduled.`;
  if (lock === 'sign' && st !== 'Confirmed') return st === 'Completed' ? 'This observation is already signed off and locked (PD-AC-11).' : 'Only a confirmed observation can be recorded and signed off.';
  return '';
}
// 4. registers — only the sessions of the batches the actor teaches (the "My sessions" rule of t-sessions)
const g2MySess = s => !!s && (tasBatches().some(b => String(s.batch || '').startsWith(b.label)) || !!(TME().short && String(s.batch || '').includes('Moving and Handling')));
function g2SessWhy(sid) {
  const w = g2StaffWhy('attendance'); if (w) return w;
  const s = ADMIN.sessions.find(x => x.id === sid); if (!s) return 'This session doesn\'t exist.';
  return g2MySess(s) ? '' : `Only the staff teaching ${s.batch} can change this register.`;
}

/* ---------- the guard: refuse on open; re-check when the dialog is confirmed ---------- */
const g2Deny = (module, entity, act, why) => { w0Deny(module, entity || '—', act, why); return false; };
function g2OnConfirm(m0, labels, check, module, entity, act) {
  if (!MODAL || MODAL === m0) return;
  MODAL.actions.filter(a => a.fn && labels.includes(a.label) && !a._g2).forEach(a => {
    const f = a.fn; a._g2 = true;
    a.fn = (...x) => { const w = check(); if (w) { closeModal(); g2Deny(module, typeof entity === 'function' ? entity() : entity, act, w); render(); return false; } return f(...x); };
  });
}
const g2Ds = el => (el && el.dataset) || {};
const g2LName = lid => { const L = g2L(lid) || (typeof allLearners === 'function' ? allLearners().find(x => x.id === lid) : null); return L ? `${L.name} (${lid})` : String(lid || '—'); };

/* ---------- Observations ---------- */
// Propose (also the reschedule follow-on and follow-ups): capability + the learner's observation assessor; links a pending reschedule
const _obPropG2 = ACT.obPropose;
ACT.obPropose = el => {
  const l = g2Ds(el).l, w = l ? g2LidWhy('observations', l, ['obs'], true) : g2StaffWhy('observations');
  if (w) return g2Deny('Observations', l ? g2LName(l) : '—', 'Propose observation', w);
  const m0 = MODAL, r = _obPropG2(el); if (!MODAL || MODAL === m0) return r;
  const sel = document.querySelector('#modal-root #op-l');
  if (sel) { [...sel.options].forEach(o => { if (g2LidWhy('observations', o.value, ['obs'])) o.remove(); }); if (!sel.options.length) { closeModal(); toast('You are not the observation assessor for any of your learners.', 'info'); return r; } }
  const a = MODAL.actions.find(x => x.label === 'Send proposal'); if (!a || a._g2) return r;
  const f = a.fn; a._g2 = true;
  a.fn = (...x) => {
    const lid = mval('#op-l'), why = g2LidWhy('observations', lid, ['obs']);
    if (why) { closeModal(); g2Deny('Observations', g2LName(lid), 'Propose observation', why); render(); return false; }
    const L = g2L(lid), wd = L && L.v ? STORE.worlds[L.v] : null, list = wd ? wd.observations : STORE.tas.obs, before = new Set(list);
    const res = f(...x); if (res === false) return res;
    // MR-16: the rescheduled record of this learner now points at the new proposal
    const nu = (wd ? wd.observations : STORE.tas.obs).find(o => !before.has(o) && (wd || o.lid === lid));
    if (nu) (wd ? wd.observations : STORE.tas.obs).filter(o => o.mrAwaitNew && o.status === 'Rescheduled' && !o.newAt && (wd || o.lid === lid)).forEach(o => { o.newAt = nu.at; delete o.mrAwaitNew; });
    return res;
  };
  return r;
};
// Cancel / reschedule: only Proposed or Confirmed (PD-AC-11)
const _obCancelG2 = ACT.obCancel;
ACT.obCancel = el => {
  const id = g2Ds(el).id, o = g2Obs(id), w = g2ObsWhy(id, 'change', true), ent = o ? o.learner : String(id || '—');
  if (w) return g2Deny('Observations', ent, 'Cancel or reschedule observation', w);
  const m0 = MODAL, r = _obCancelG2(el); if (!MODAL || MODAL === m0) return r;
  g2OnConfirm(m0, ['Cancel observation'], () => g2ObsWhy(id, 'change'), 'Observations', ent, 'Cancel observation');
  const a = MODAL.actions.find(x => x.label === 'Reschedule (new proposal)');
  if (a && a.fn && !a._g2) { const f = a.fn; a._g2 = true; a.fn = (...x) => { const why = g2ObsWhy(id, 'change'); if (why) { closeModal(); g2Deny('Observations', ent, 'Reschedule observation', why); render(); return false; } const res = f(...x); const rec = g2Rec(o); if (res !== false && rec && rec.status === 'Rescheduled' && !rec.newAt) rec.mrAwaitNew = true; return res; }; }
  return r;
};
// Post-observation record: only a Confirmed observation of one's own learner
const _obPostG2 = ACT.obPost;
ACT.obPost = el => {
  const w = g2StaffWhy('observations'); if (w) return g2Deny('Observations', '—', 'Enter post-observation record', w);
  const m0 = MODAL, r = _obPostG2(el); if (!MODAL || MODAL === m0) return r;
  const sel = document.querySelector('#modal-root #pe-o'); if (sel) [...sel.options].forEach(o => { if (g2ObsWhy(o.value, 'sign')) o.remove(); });
  g2OnConfirm(m0, ['Continue'], () => g2ObsWhy(mval('#pe-o'), 'sign'), 'Observations', () => mval('#pe-o') || '—', 'Enter post-observation record');
  return r;
};
// Sign-off: a Confirmed observation, by its observation assessor (the d-obs event path included)
const _orSignG2 = ACT.orSign;
ACT.orSign = el => {
  const id = g2Ds(el).id || (S.params || {}).id, o = g2Obs(id), w = g2ObsWhy(id, 'sign', true), ent = o ? o.learner : String(id || '—');
  if (w) return g2Deny('Observations', ent, 'Sign off observation', w);
  const m0 = MODAL, r = _orSignG2(el); g2OnConfirm(m0, ['Sign off and lock'], () => g2ObsWhy(id, 'sign'), 'Observations', ent, 'Sign off observation'); return r;
};
const _obFollowG2 = ACT.obFollow;
ACT.obFollow = el => { const id = g2Ds(el).id, w = g2ObsWhy(id, '', true); if (w) return g2Deny('Observations', id, 'Schedule follow-up observation', w); return _obFollowG2(el); };
// The record draft (ticks, notes, attachments) belongs to the observation assessor too
const g2DraftWhy = () => g2ObsWhy((S.params || {}).id);
['orT', 'orAttRm'].forEach(k => { const f = ACT[k]; if (!f) return; ACT[k] = (el, e) => { const w = g2DraftWhy(); if (w) return g2Deny('Observations', (S.params || {}).id, 'Edit observation record', w); return f(el, e); }; });
['orM', 'orF', 'orAtt'].forEach(k => { const f = INP[k]; if (!f) return; INP[k] = (el, e) => { const w = g2DraftWhy(); if (w) return g2Deny('Observations', (S.params || {}).id, 'Edit observation record', w); return f(el, e); }; });

/* ---------- Professional Discussions ---------- */
[['pdPropose', 'Propose PD session', ['Send proposal']], ['pdPostpone', 'Postpone PD session', ['Postpone']], ['pdOutcome', 'Record PD outcome', ['Save outcomes and sign off']]].forEach(([k, act, labels]) => {
  const f = ACT[k]; if (!f) return;
  const why = (lid, delegate) => { const w = g2LidWhy('pd', lid, ['pd'], delegate); if (w || k !== 'pdPostpone' || chEff(lid, 'pd') !== chMe()) return w; const p = pdOf(lid), s = p && p.session; return s && ['Proposed', 'Confirmed'].includes(s.status) ? '' : 'Only a proposed or confirmed PD session can be postponed.'; };
  ACT[k] = (el, e) => {
    const lid = g2Ds(el).l, w = why(lid, true); if (w) return g2Deny('PD', g2LName(lid), act, w);
    const m0 = MODAL, r = f(el, e); g2OnConfirm(m0, labels, () => why(lid), 'PD', g2LName(lid), act); return r;
  };
});

/* ---------- Portfolio notes, IQA advisory notes, recommendations (MR-28) ---------- */
const _pfNoteG2 = ACT.pfNote;
ACT.pfNote = el => {
  const lid = g2Ds(el).l, why = () => g2LidWhy('portfolio', lid, G2_ANY), w = why(); if (w) return g2Deny('Portfolio', g2LName(lid), 'Add assessor note', w);
  const m0 = MODAL, r = _pfNoteG2(el); g2OnConfirm(m0, ['Add note'], why, 'Portfolio', g2LName(lid), 'Add assessor note'); return r;
};
// key "<lid>~portfolio" → any of the learner's assessors; "<lid>~<assignment>" → the submission must be in the actor's marking
const g2AdvWhy = key => {
  const k = String(key || ''), lid = k.split('~')[0];
  if (/~portfolio$/.test(k)) return g2LidWhy('portfolio', lid, G2_ANY);
  const w = g2StaffWhy('mark'); if (w) return w;
  return tasSubs(true).some(s => s.key === k) ? '' : 'Only the learner\'s assignment assessor can add an advisory note to this work.';
};
const _tasAdvG2 = ACT.tasAdvisory;
ACT.tasAdvisory = el => {
  const k = g2Ds(el).k, w = g2AdvWhy(k); if (w) return g2Deny('Assessment', k, 'Add IQA advisory note', w);
  const m0 = MODAL, r = _tasAdvG2(el); g2OnConfirm(m0, ['Save note'], () => g2AdvWhy(k), 'Assessment', k, 'Add IQA advisory note'); return r;
};
const _tasRecG2 = ACT.tasRec;
ACT.tasRec = el => {
  const l = g2Ds(el).l, w = l ? g2LidWhy('recommend', l, G2_ANY) : g2StaffWhy('recommend'); if (w) return g2Deny('Progress', l ? g2LName(l) : '—', 'Add recommended action', w);
  const m0 = MODAL, r = _tasRecG2(el); if (!MODAL || MODAL === m0) return r;
  const sel = document.querySelector('#modal-root #ra-l'); if (sel) { [...sel.options].forEach(o => { if (g2LidWhy('recommend', o.value, G2_ANY)) o.remove(); }); if (!sel.options.length) { closeModal(); toast('None of your learners are allocated to you as their Assessor.', 'info'); return r; } }
  g2OnConfirm(m0, ['Add to improvement plan'], () => g2LidWhy('recommend', mval('#ra-l'), G2_ANY), 'Progress', () => g2LName(mval('#ra-l')), 'Add recommended action');
  return r;
};

/* ---------- Registers (MR-19) ---------- */
const _tasAdjG2 = ACT.tasAdj;
ACT.tasAdj = el => {
  const d = g2Ds(el), sid = d.s, why = () => g2SessWhy(sid) || ((ADMIN.reg[sid] || [])[+d.i] ? '' : 'This register row doesn\'t exist.'), w = why();
  if (w) return g2Deny('Attendance', `${sid || '—'} · row ${d.i}`, 'Adjust attendance', w);
  const m0 = MODAL, r = _tasAdjG2(el); g2OnConfirm(m0, ['Save adjustment'], why, 'Attendance', `${sid} · row ${d.i}`, 'Adjust attendance'); return r;
};
const _tasRevG2 = ACT.tasReviewed;
ACT.tasReviewed = el => {
  const sid = g2Ds(el).s, w = g2SessWhy(sid); if (w) return g2Deny('Attendance', sid || '—', 'Mark register reviewed', w);
  const m0 = MODAL, r = _tasRevG2(el); g2OnConfirm(m0, ['Mark reviewed'], () => g2SessWhy(sid), 'Attendance', sid, 'Mark register reviewed'); return r;
};
['tumMatch', 'tumNon'].forEach(k => { const f = ACT[k]; if (!f) return; ACT[k] = (el, e) => {
  const u = ADMIN.unmatched.find(x => x.id === g2Ds(el).id), w = u ? g2SessWhy(u.session) : 'This participant isn\'t waiting to be matched.';
  if (w) return g2Deny('Attendance', u ? u.name : g2Ds(el).id || '—', k === 'tumMatch' ? 'Match participant' : 'Mark participant as non-learner', w);
  return f(el, e);
}; });

/* ---------- Records ---------- */
UXC.push(['MR-G2', 'Staff portal and observations (2 Nov 2026)', [
  'Staff observation, PD, note, recommendation and register actions work only in the Teacher / Assessor portal, for the member of staff responsible — checked when the dialog opens and again when it is confirmed. A refused attempt changes nothing and is logged.',
  'Observations, PD, assessor notes and recommendations need the Assessor role and the learner\'s current allocation; Teacher-only users are refused. A register is changed only by the staff who teach the session\'s batch.',
  'A signed-off observation is locked: only proposed or confirmed observations can be cancelled or rescheduled. After a reschedule the learner sees "new date to be proposed" until the new proposal is sent; rescheduling has no fee effect.',
  'A roster-only learner\'s staff portfolio shows their own programme\'s curriculum (or "Curriculum unavailable"), never another programme\'s criteria.']]);
