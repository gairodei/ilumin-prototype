/* ============================================================
   Batch MR-R — record linkage and workflow consistency (2 Nov 2026; PD-MRR-* in PROVISIONAL-DECISIONS.md). Loads last.
   Multi-role audit defects MR-02, 14, 15, 17, 18, 22, 23, 24, 26, 27, 29, 30, 32, 35, 36, 40, 44, 46 and the Coordinator parts of
   MR-41. Small in-place fixes sit in the files they correct (admin-a.js lrnKey / raiseDC / dashboard, ac3-academic.js ac3DcReady,
   sysadmin.js correction cue, admin-data.js AQ-1004, setup-r3.js and coord.js drafts, coord.js / staff.js notification lists,
   core.js / screens-c.js overdue wording, iqa.js demo control). This file holds the rest:
   - Learner records: a client-demo learner row (ADMIN.learners, no world key) is linked to the learner's record by learner ID
     (lrnKey, the FI-2 fiWorldKey). Data Corrections update the record and the admin row; Learner 360 shows the record in every tab.
   - Release: a failed release is reported as one; marking that can't be released after the Assessor was replaced is shown as
     such to the Coordinator, the Academic Admin and the Super Administrator (whether it may still be released is P-06).
   - IQA: records show the declared (published) outcome or "No final outcome", never a status-derived "Passed".
   - Notifications: every Coordinator and staff notice names its recipient(s); each person sees their own.
   - Sign-in: a deactivated (or suspended) account can't sign in, by email or from the demo chooser.
   - Coordinator timeline: kept within the batch dates; the notice claim matches what happened. Replacing a batch Teacher lists
     the sessions still assigned to the previous Teacher (no automatic move — P-09).
   A prototype can only enforce this in the browser. Existing guards are reused (w0Deny, ac3No/ac3OnConfirm, ac3SaNotify).
   ============================================================ */
'use strict';

/* ---------- 1. The learner's record by learner ID (MR-02, MR-14) ---------- */
const mrRowOf = lid => (ADMIN.learners || []).find(l => l.id === lid) || null;
const mrLidOfItem = i => (i && i.data && i.data.lid) || ((/^a-learners?\.(.+)$/.exec(((i && i.related) || [])[1] || '') || [])[1]) || (i && i.data && i.data.v && STORE.worlds[i.data.v] ? STORE.worlds[i.data.v].me.id : null);

// Learner 360: every tab reads the learner's record (the Payments tab already did, FI-2 — it is left as it is)
const _al360MR = SCREENS['a-learner'];
SCREENS['a-learner'] = function (p) {
  const L = p && p.id && learnerById(p.id), k = L && !L.v && lrnKey(L);
  if (!k || p.tab === 'payments') return _al360MR.apply(this, arguments);
  const lb = learnerById; learnerById = id => { const x = lb(id); return x && x.id === L.id && !x.v ? { ...x, v: k } : x; };
  try { return _al360MR.apply(this, arguments); } finally { learnerById = lb; }
};

// Date of birth corrections: a real date, in the past, different from the current one (MR-36)
const mrDay = t => Math.floor(t / DAY);
function dcDobWhy(pv, cur) {
  const t = Date.parse(String(pv || '').trim()); if (!pv || isNaN(t)) return 'Enter the date of birth as a date, for example 14 Mar 1992.';
  if (t > now().getTime()) return 'A date of birth can\'t be in the future.';
  if (new Date(t).getFullYear() < 1900) return 'Enter a date of birth after 1900.';
  const c = Date.parse(String(cur || '')); if (!isNaN(c) && Math.abs(mrDay(c) - mrDay(t)) < 1) return 'That is the current date of birth — nothing would change.';
  return '';
}

// The final approval: the correction is applied to the record (world) and the admin row; refused when there is no record to apply to
const MR_DC_REC = ['Full name', 'Date of birth', 'Referral attribution'];
const _adMR = applyDecision;
applyDecision = function (i, a, r, o) {
  const dc = i && i.type === 'Data correction' && a === 'approveFinal' && isOpen(i) && i.data && MR_DC_REC.includes(i.data.field || 'Full name');
  if (!dc) return _adMR.apply(this, arguments);
  const lid = mrLidOfItem(i), row = lid ? mrRowOf(lid) : null;
  if (!i.data.v && lid) { const k = lrnKey(learnerById(lid) || { id: lid }); if (k) i.data.v = k; }
  const w = i.data.v ? STORE.worlds[i.data.v] : null;
  if (!w && !row) return w0Deny('Approvals Queue', i.id, 'give a Data Correction\'s final approval', 'The learner record this correction is for can\'t be found, so approving it would change nothing.');
  if (w && !i.data.cert && (i.data.field || 'Full name') !== 'Referral attribution') { const c = (w.certs || []).find(x => x.status === 'Valid'); if (c) i.data.cert = c.id; }
  const out = _adMR.apply(this, arguments);
  if (out === false || !(i.status === 'Approved' || i._sa)) return out;
  const f = i.data.field || 'Full name', pv = i.data.proposed;
  if (f === 'Referral attribution') { const was = (w && w.me.referral) || (row && row.referral) || '—'; if (w) w.me.referral = pv; if (row) row.referral = pv; logA('Learners', lid || '—', 'Data correction (final)', was, pv, r); }
  if (row && f === 'Full name') row.name = pv;
  if (row && f === 'Date of birth') row.dob = pv;
  if (!w && row && f === 'Full name') logA('Learners', lid, 'Data correction (final)', i.data.current || '—', pv, r); // admin-only row: the row is the record
  if (!w && row && f === 'Date of birth') logA('Learners', lid, 'Data correction (final)', i.data.current || '—', pv, r);
  return out;
};

// The Super Administrator is told when a correction is forwarded for the final approval (MR-35)
const _qDoMR = ACT.qDo;
ACT.qDo = el => {
  const id = el && el.dataset && el.dataset.id, a = el && el.dataset && el.dataset.a, i = id && acFind(id), was = i && i.stage, m0 = MODAL;
  const r = _qDoMR(el);
  if (a === 'forward' && i && i.type === 'Data correction' && MODAL && MODAL !== m0) {
    const act = MODAL.actions.find(x => /primary|danger/.test(x.cls || '')); if (act && act.fn && !act._mrr) { const g = act.fn; act._mrr = true; act.fn = (...x) => { const out = g(...x); if (was !== 'final' && i.stage === 'final') ac3SaNotify({ t: 'Data correction awaiting your final approval', b: `${i.id} · ${i.related[0]} — first review by ${i.forwardedBy || ADMIN.me.name}`, at: now().toISOString(), unread: true, go: 'a-queue.' + i.id }); return out; }; }
  }
  return r;
};

/* ---------- 2. Release after the Assessor was replaced (MR-15 — release vs re-mark is client question P-06) ---------- */
const mrRelOk = P => { try { return !!withRelV(P, () => tasSubs(true).find(x => x.key === P.key)); } catch (e) { return false; } };
const mrRelWhy = P => `The Assessor who sent it (${P.by}) no longer assesses this learner, so it can't be released here. Whether it is released as sent or re-marked by the new Assessor is a client decision (P-06) — the Academic Admin keeps it in view.`;
const _relConfirmMR = relConfirm;
relConfirm = function (keys) {
  const m0 = MODAL, r = _relConfirmMR.apply(this, arguments); if (!MODAL || MODAL === m0) return r;
  const list = (keys || []).map(k => relStore()[k]).filter(Boolean), act = MODAL.actions.find(x => /primary/.test(x.cls || ''));
  if (act) act.fn = () => {
    let n = 0; const fail = []; list.forEach(P => { if (relStore()[P.key] && releaseNow(P.key)) n++; else if (relStore()[P.key]) fail.push(P); });
    const st = dts('crel'); if (st) st.sel = [];
    setTimeout(() => { go('c-release'); toast(fail.length ? `${n} of ${list.length} released${n ? ' — those learners have been notified' : ''}. Not released: ${fail.map(P => `${P.learner} · ${P.title}`).join('; ')} — ${mrRelWhy(fail[0])}` : `${n} item${n === 1 ? '' : 's'} released. Learners have been notified.`, fail.length ? 'err' : undefined); }, 0);
  };
  return r;
};
const _relSuperMR = ACT.relSuper;
ACT.relSuper = el => {
  const P = relStore()[el && el.dataset && el.dataset.k]; if (!P) return toast('Already released.', 'info');
  if (!mrRelOk(P)) return toast(mrRelWhy(P), 'err');
  const m0 = MODAL, r = _relSuperMR(el);
  if (MODAL && MODAL !== m0) { const act = MODAL.actions.find(x => /primary|danger/.test(x.cls || '')); if (act && act.fn) { const g = act.fn; act.fn = (...x) => (mrRelOk(P) ? g(...x) : (toast(mrRelWhy(P), 'err'), false)); } }
  return r;
};
const mrStrandHtml = list => list.length ? `<div class="note b-amber mr-strand" role="status">${ic('alert')}<div class="small"><strong>${list.length} item${list.length === 1 ? '' : 's'} can't be released yet:</strong><ul>${list.map(P => `<li>${esc(P.learner)} · ${esc(P.title)} · ${esc(P.round)} — sent by ${esc(P.by)} on ${fd(P.sentAt)}</li>`).join('')}</ul>The Assessor who sent ${list.length === 1 ? 'it' : 'them'} no longer assesses ${list.length === 1 ? 'this learner' : 'these learners'}. Whether ${list.length === 1 ? 'it is' : 'they are'} released as sent or re-marked by the new Assessor is a client decision (P-06); nothing is changed meanwhile.</div></div>` : '';
const _cRelMR = SCREENS['c-release'];
SCREENS['c-release'] = function (p) {
  const h = _cRelMR.apply(this, arguments); if (typeof h !== 'string' || S.portal !== 'coord') return h;
  if (p && p.id) { const P = relStore()[p.id]; return P && !mrRelOk(P) && myRel().some(x => x.key === p.id) ? h.replace('<div class="note b-grey">', mrStrandHtml([P]) + '<div class="note b-grey">') : h; }
  const st = myRel().filter(P => !mrRelOk(P)); const k = h.indexOf('<div class="note b-grey">'); return st.length && k >= 0 ? h.slice(0, k) + mrStrandHtml(st) + h.slice(k) : h;
};
const _relCardMR = relCard;
relCard = function () { const h = _relCardMR.apply(this, arguments), st = relPending().filter(P => !mrRelOk(P)); return st.length ? h.replace('</section>', mrStrandHtml(st) + '</section>') : h; };

/* ---------- 3. IQA: the declared outcome (MR-17) ---------- */
const mrOutLbl = o => (o ? o.result : 'No final outcome');
const _liveMR = liveRecords;
liveRecords = function () {
  const out = _liveMR.apply(this, arguments), have = new Set(out.map(r => r.key));
  out.forEach(r => { if (r.kind !== 'sub') return; const o = r3Out(r.key); r.outcome = o || null; if (o) r.exit = o.result; else if (r.exit === 'Passed') r.exit = 'No final outcome'; });
  // A declared outcome whose marking hasn't been released yet (awaiting the Coordinator) is a record too
  learnerAccounts().forEach(v => {
    const w = STORE.worlds[v]; if (!w || !w.nvq || !(w.flags.admitted || (w.signup && w.signup.done))) return;
    (w.assignments || []).forEach(a => {
      const key = w.me.id + '~' + a.id, o = r3Out(key); if (!o || have.has(key)) return;
      const pr = typeof chProgOf === 'function' ? chProgOf(w) : null;
      out.push({ id: 'L-' + v + '-' + a.id, kind: 'sub', live: true, v, key, lid: w.me.id, learner: VNAME(v), programme: w.nvq.title, pk: pr && pr.level ? 'L' + String(pr.level).replace(/\D/g, '') : '—', batch: (typeof chBatchCodeOfW === 'function' && chBatchCodeOfW(w)) || (w.signup && w.signup.batch) || '—', unit: (a.unit || '').split(' · ')[0], module: (a.unit || '').split(' · ')[1] || '', aid: a.id, title: a.title, assessor: o.by, round: a.round || o.round, markedAt: o.at, exit: o.result, outcome: o, met: a.qs.filter(q => q.state === 'met').length, notMet: a.qs.filter(q => ['rework', 'limit'].includes(q.state)).length, verified: a.qs.some(q => q.state === 'met'), type: 'Knowledge', crit: a.qs.map(q => q.crit), discontinued: w.nvq.status === 'Discontinued', unreleased: true });
    });
  });
  return out;
};
const _qRecMR = SCREENS['q-record'];
SCREENS['q-record'] = function (p) {
  const h = _qRecMR.apply(this, arguments), r = p && p.id && typeof recById === 'function' ? recById(p.id) : null; if (typeof h !== 'string' || !r || r.kind !== 'sub' || !r.live) return h;
  const o = r.outcome, line = `<div class="note b-${o ? (o.result === 'Pass' ? 'green' : 'red') : 'grey'} mr-out" role="status">${ic('shield')}<div class="small"><strong>Final assignment outcome: ${esc(mrOutLbl(o))}</strong>${o ? ` — declared by ${esc(o.by)} (Assessor) on ${fdt(o.at)} for ${esc(o.round)}${o.corrected ? ' · corrected through a Data Correction' : ''}.` : ' — the Assessor hasn\'t declared one. Nothing is assumed from the status.'}${r.unreleased ? ' The marking is awaiting the Coordinator\'s release.' : ''}</div></div>`;
  return h.includes('<section class="card"><h2>Assessment decision</h2>') ? h.replace('<section class="card"><h2>Assessment decision</h2>', line + '<section class="card"><h2>Assessment decision</h2>') : line + h;
};

/* ---------- 4. Notification recipients (MR-27) ---------- */
// Coordinator notices (STORE.coo.notifs) carry `to` (a Coordinator's name — the MC routing then narrows it to the learner's
// Coordinator or widens it to every Coordinator of a shared batch); staff notices (STORE.tas.notifs) carry `to` as a list of names.
// A notice raised without one is addressed when it is raised: the context of the action that raised it, else the person, batch or
// learner it names, else the person raising it. The demo's seeded lists were the first persona's (Coordinator A, staff A).
let MR_TO = null;
const mrWith = (to, f) => { const p = MR_TO; MR_TO = to; try { return f(); } finally { MR_TO = p; } };
const mrBatchesIn = s => (ADMIN.batches || []).filter(b => s.includes('(' + b.code + ')') || s.startsWith(b.code + ':') || s.startsWith(b.code + ' ') || s.includes(' ' + b.code + ' ') || s.includes(b.code + ' —') || s.endsWith(' ' + b.code) || (b.label && s.includes(b.label)));
const mrLearnerIn = s => allLearners().find(l => l.name && s.includes(l.name)) || null;
const mrCooOf = (lid, b) => { b = b || (typeof chBatchOfLid === 'function' && chBatchOfLid(lid)); if (!b) return null; return (typeof mcLast === 'function' && mcLast(lid, b)) || b.coord || null; };
function mrCooTo(n, seed) {
  if (MR_TO && MR_TO.coo) return MR_TO.coo;
  const go = String(n.go || ''), txt = `${n.t || ''} ${n.b || ''}`;
  const lm = /^c-(?:learner\.([^.~]+)|sub\.([^~]+)~)/.exec(go); if (lm) { const c = mrCooOf(lm[1] || lm[2]); if (c) return c; }
  const bm = /^c-batches\.(.+)$/.exec(go), bs = bm ? (ADMIN.batches || []).filter(b => b.code === bm[1]) : mrBatchesIn(txt);
  if (bs.length && bs[0].coord) return bs[0].coord;
  const L = mrLearnerIn(txt); if (L) { const c = mrCooOf(L.id); if (c) return c; }
  if (!seed && S.portal === 'coord' && typeof CME === 'function') return CME().name;
  return seed ? COO_USERS.A.name : (ADMIN.staff || []).filter(s => s.roles.includes('Academic Coordinator') && s.status === 'Active').map(s => s.name);
}
const mrStaffNames = () => [...new Set(Object.values(TAS_USERS).map(u => u.name).concat((ADMIN.staff || []).filter(s => s.roles.some(r => ['Teacher', 'Assessor'].includes(r))).map(s => s.name)))];
const mrBatchStaff = b => [...new Set((b.teachers || []).concat(b.assessors || []).concat(Object.values(typeof chAllocOf === 'function' ? chAllocOf(b) : {}).filter(Boolean)))];
function mrTasTo(n, seed) {
  if (MR_TO && MR_TO.tas) return [].concat(MR_TO.tas);
  const body = String(n.b || ''), txt = `${n.t || ''} ${body}`, go = String(n.go || '');
  const pre = /^([^:]{3,60}):\s/.exec(body), names = mrStaffNames(); if (pre && names.includes(pre[1])) return [pre[1]];
  const fm = /^(IQA-\d+)/.exec(body), f = fm && (ADMIN.iqa || []).find(x => x.id === fm[1]); if (f && f.assessor) return [f.assessor];
  const qm = /^(AQ-[\w-]+)/.exec(body), qi = qm && allQueue().find(x => x.id === qm[1]); if (qi) return [...new Set([qi.raisedBy, qi.data && qi.data.recBy].filter(Boolean))];
  const am = /^t-assign\.(.+)$/.exec(go), d = am && typeof s2Defs === 'function' && s2Defs().find(x => x.id === am[1]);
  if (d) { const st = (d.batches || []).map(c => (ADMIN.batches || []).find(b => b.code === c)).filter(Boolean).flatMap(mrBatchStaff); if (st.length) return [...new Set(st)]; }
  const L = mrLearnerIn(txt);
  if (L && typeof chEff === 'function') { const ks = n.cat === 'Observations' ? ['obs'] : ['asg', 'pd', 'obs'], st = [...new Set(ks.map(k => chEff(L.id, k)).filter(Boolean))]; if (st.length) return st; }
  const bs = mrBatchesIn(txt); if (bs.length) return [...new Set(bs.flatMap(mrBatchStaff))];
  const se = typeof s4bAllSess === 'function' && s4bAllSess().find(x => x.title && body.startsWith(x.title + ' ')); if (se) { const b = (ADMIN.batches || []).find(x => x.code === se.batch); if (/moved to you/.test(n.t || '')) return [se.teacher || (b && b.teachers[0])].filter(Boolean); if (b) return mrBatchStaff(b); }
  if (!seed && S.portal === 'staff' && typeof TME === 'function') return [TME().name];
  return seed ? [TAS_USERS.A.name] : names;
}
// A seeded list (created without recipients) was the first persona's own list: Coordinator A's, staff persona A's
const mrAddr = (n, kind, seed) => { if (n && !n.to) n.to = seed ? (kind === 'coo' ? COO_USERS.A.name : [TAS_USERS.A.name]) : kind === 'coo' ? mrCooTo(n) : mrTasTo(n); return n; };
function mrHook(arr, kind, pre) {
  if (!Array.isArray(arr)) return; if (arr._mrr) return;
  if (pre) pre(); const u = arr.unshift;
  Object.defineProperty(arr, '_mrr', { value: true });
  arr.unshift = function (...items) { items.forEach(n => mrAddr(n, kind)); return u.apply(this, items); };
}
function mrInstall(seed) {
  if (typeof STORE === 'undefined') return;
  if (STORE.coo && STORE.coo.notifs) { if (!STORE.coo.notifs._mrr) STORE.coo.notifs.forEach(n => mrAddr(n, 'coo', seed)); mrHook(STORE.coo.notifs, 'coo', typeof mcNotifHook === 'function' ? mcNotifHook : null); }
  if (STORE.tas && STORE.tas.notifs) { if (!STORE.tas.notifs._mrr) STORE.tas.notifs.forEach(n => mrAddr(n, 'tas', seed)); mrHook(STORE.tas.notifs, 'tas'); }
}
// Whether notice n is for `me` (read by cooNotifs / tasNotifs)
function mrFor(n, me, kind) {
  mrInstall(true); mrAddr(n, kind, true);
  const to = n.to; return Array.isArray(to) ? to.includes(me) : to === me || to === 'all';
}
const _isMRR = initStore; initStore = function () { const r = _isMRR.apply(this, arguments); mrInstall(true); return r; };
const _prMRR = fxPrune; fxPrune = function () { const r = _prMRR.apply(this, arguments); mrInstall(true); return r; };
// Context of the actions whose notices name nobody: the release notice goes to the learner's Coordinator; a raiser's notice to the raiser
const _sfrMR = sendForRelease;
sendForRelease = function (s) { const c = s && s.L ? mrCooOf(s.L.lid, s.L.batch && ADMIN.batches.find(b => b.code === s.L.batch.code)) : null; return mrWith(c ? { coo: c } : null, () => _sfrMR.apply(this, arguments)); };
const _nrMR = notifyRaiser;
notifyRaiser = function (i) { return mrWith(i && i.raisedBy ? { tas: [i.raisedBy] } : null, () => _nrMR.apply(this, arguments)); };
if (typeof STORE !== 'undefined' && STORE) mrInstall(true);

/* ---------- 5. Sign-in: deactivated accounts (MR-24) ---------- */
// The account's state as the admin console set it: a learner with a world key in STORE.acct; a client-demo learner on their admin
// row (lAct's own result — lAct itself is unchanged); a staff member on their staff record.
const mrLearnerState = k => { const w = STORE.worlds[k], row = w && w.me ? mrRowOf(w.me.id) : null; if (STORE.acct[k] === 'Deactivated' || (row && row.acct === 'Deactivated')) return 'Deactivated'; if (STORE.acct[k] === 'Archived' || (row && row.rec === 'Archived')) return 'Archived'; return null; };
const mrStaffState = name => { const s = (ADMIN.staff || []).find(x => x.name === name); return s && ['Deactivated', 'Suspended'].includes(s.status) ? s.status : null; };
const mrRefuse = (who, st, html) => {
  ADMIN.security.unshift({ id: 'SE-MRR-' + (ADMIN.security.length + 1) + '-' + Date.now().toString(36), sev: 'Medium', at: now().toISOString(), type: 'Sign-in refused', detail: `${who}: account ${st.toLowerCase()} — sign-in refused`, reviewed: false });
  closeModal(); S.demoOpen = false; if (S.signedIn) signOut(); S.signedIn = false; S.auth = 'signin'; S.authMsg = { html }; render(); return true;
};
const MR_STAFF_OFF = '<strong>Your staff account is suspended or deactivated.</strong> Contact the System Administrator.';
const mrLearnerOff = () => '<strong>Your account is inactive — contact the Academy.</strong> ' + (typeof academyContact === 'function' ? academyContact() : '');
const _lgMR = learnerGate;
learnerGate = function () {
  const em = String(S.authEmail || '').toLowerCase(), ek = em && learnerAccounts().find(x => (STORE.worlds[x].me.email || '').toLowerCase() === em);
  if (ek && ek !== S.variant && mrLearnerState(ek) === 'Deactivated') return mrRefuse(`Learner ${STORE.worlds[ek].me.id}`, 'Deactivated', mrLearnerOff()); // the account typed (the legacy form doesn't switch persona)
  const k = S.variant, st = mrLearnerState(k);
  if (st === 'Deactivated') return mrRefuse(`Learner ${W && W.me ? W.me.id : k}`, st, mrLearnerOff());
  if (st === 'Archived' && STORE.acct[k] !== 'Archived') { S.edge = 'archived'; logA('Learners', W.me.id + ' · ' + W.me.first + ' ' + W.me.last, 'Archived learner login', 'Archived', 'Archived (read-only session)', 'Learner signed in to an archived account'); return false; }
  return _lgMR.apply(this, arguments);
};
const _dliMR = drLearnerIn;
drLearnerIn = function (k) {
  const st = drLearnerW(k) ? mrLearnerState(k) : null;
  if (st === 'Deactivated') return mrRefuse(`Learner ${drLearnerW(k).me.id}`, st, mrLearnerOff());
  const r = _dliMR.apply(this, arguments);
  if (st === 'Archived' && S.signedIn && S.portal === 'learner') { S.edge = 'archived'; logA('Learners', W.me.id + ' · ' + W.me.first + ' ' + W.me.last, 'Archived learner login', 'Archived', 'Archived (read-only session)', 'Learner signed in to an archived account'); render(); }
  return r;
};
const _drAsMR = ACT.drAs;
ACT.drAs = el => {
  const p = typeof drFind === 'function' && drFind(el && el.dataset && el.dataset.p);
  if (p && p[1] !== 'Learners' && p[0] !== 'agency') { const name = p[3](), st = mrStaffState(name); if (st) return mrRefuse(name, st, MR_STAFF_OFF); }
  return _drAsMR(el);
};
const _ssMR = staffSignin;
staffSignin = function (e) {
  const em = String(e || '').toLowerCase(), s = (ADMIN.staff || []).find(x => (x.email || '').toLowerCase() === em) || [...Object.values(COO_USERS), ...Object.values(TAS_USERS)].find(u => (u.email || '').toLowerCase() === em);
  const st = s && mrStaffState(s.name); if (st) return mrRefuse(s.name, st, MR_STAFF_OFF);
  return _ssMR.apply(this, arguments);
};

/* ---------- 6. Coordinator timeline (MR-29, MR-40) ---------- */
const _ceeMR = ACT.cooEditEv;
ACT.cooEditEv = (el, ev) => {
  const b = ADMIN.batches.find(x => x.code === (el && el.dataset && el.dataset.b)), id = el && el.dataset && el.dataset.id, m0 = MODAL, r = _ceeMR(el, ev);
  if (!b || !MODAL || MODAL === m0 || !$('#modal-root #ee-n')) return r;
  // MR-29 (PD-AC3-08): within the batch's end date, as for the Academic Admin's session edits
  ac3OnConfirm(() => { const v = $('#ee-n').value; if (!v || !ac3Out(b, new Date(v + ':00Z').toISOString())) return true; fieldErr('#ee-n', ac3InWhy(b)); return false; });
  // MR-40: the learners of a batch without a seeded calendar were never told although the toast said so — they are now notified
  // (the "Notify affected learners" choice), and the toast says how many
  const act = MODAL.actions.find(x => /primary/.test(x.cls || '')); if (act && act.fn && !act._mrr) {
    const g = act.fn; act._mrr = true;
    act.fn = (...x) => {
      const notify = !!($('#ee-notify') || {}).checked, seeded = typeof BATCH_WORLD !== 'undefined' && !!BATCH_WORLD[b.code], e0 = batchEvents(b).find(e => e.id === id), was = e0 && e0.start;
      if (seeded || !notify) return g(...x);
      let msg = null; const t0 = toast; toast = (m, k) => { msg = [m, k]; };
      let out; try { out = g(...x); } finally { toast = t0; }
      const e1 = batchEvents(b).find(e => e.id === id);
      if (out === false || !e1 || e1.start === was) { if (msg) toast(...msg); return out; }
      const ws = learnerAccounts().filter(k => { const w = STORE.worlds[k], bb = w && w.me && typeof chBatchOfLid === 'function' && chBatchOfLid(w.me.id); return bb && bb.code === b.code; });
      ws.forEach(k => notifyLearner(k, 'Schedule', 'Schedule changed', `${e1.title} moved to ${fdt(e1.start)}.`, 'calendar'));
      toast(`Saved as a new version. ${ws.length ? plural(ws.length, 'learner') + ' notified.' : 'No learner accounts in this batch to notify.'}`);
      return out;
    };
  }
  return r;
};

/* ---------- 7. Replaced batch Teacher: the sessions still assigned to them (MR-30 — who takes them is client question P-09) ---------- */
const mrOrphans = b => (typeof s4bSessFor === 'function' ? s4bSessFor(b.code) : []).filter(s => s.teacher && !(b.teachers || []).includes(s.teacher) && s.status !== 'Cancelled' && new Date(s.start) > now() && (!s.batch || s.batch === b.code));
const mrOrphanHtml = (b, l) => `<div class="note b-amber mr-orphan" role="status">${ic('alert')}<div class="small"><strong>${plural(l.length, 'session')} still assigned to a Teacher who no longer teaches this batch:</strong><ul>${l.map(s => `<li>${esc(s.title || 'Session')} · ${fdt(s.start)} · ${esc(s.teacher)}</li>`).join('')}</ul>Nothing was moved. Who takes them is a client decision (P-09); each session can be given a Teacher in Schedule.</div></div>`;
const _bsMR = ACT.batchStaff;
ACT.batchStaff = el => {
  const b = ADMIN.batches.find(x => x.code === (el && el.dataset && el.dataset.id)), m0 = MODAL, r = _bsMR(el);
  if (!b || !MODAL || MODAL === m0) return r;
  const act = MODAL.actions.find(x => /primary/.test(x.cls || '')); if (act && act.fn) { const g = act.fn; act.fn = (...x) => { const out = g(...x); const l = mrOrphans(b); if (out !== false && l.length) setTimeout(() => toast(`${plural(l.length, 'session')} still assigned to ${[...new Set(l.map(s => s.teacher))].join(', ')} — see the batch page. Nothing was moved (P-09).`, 'info'), 0); return out; }; }
  return r;
};
const _abMR = SCREENS['a-batches'];
SCREENS['a-batches'] = function (p) {
  const h = _abMR.apply(this, arguments), b = p && p.id && ADMIN.batches.find(x => x.code === p.id); if (typeof h !== 'string' || !b) return h;
  const l = mrOrphans(b); if (!l.length) return h; const k = h.indexOf('<div class="subtabs"'), k2 = k >= 0 ? k : h.indexOf('<div class="tabs-scroll"');
  return k2 >= 0 ? h.slice(0, k2) + mrOrphanHtml(b, l) + h.slice(k2) : mrOrphanHtml(b, l) + h;
};

/* ---------- 8. Overdue wording on the simulated date (MR-32, PD-FI2-09) ---------- */
// A learner account outside the seeded personas: "N days overdue" on the simulated date; the pay-by date is the Day 30 automatic
// pause where it applies; an agreed (pinned) schedule isn't paused automatically (PD-CB-72, client question), so no date is claimed.
function mrOdText(w) {
  const o = w.payOverdue, head = `<strong>Payment overdue.</strong> ${esc(o.label)} (${money(o.amount)}) was due on ${fd(o.due)}.`;
  const wk = Object.keys(STORE.worlds).find(x => STORE.worlds[x] === w);
  if (typeof FI_LEGACY === 'undefined' || FI_LEGACY.includes(wk) || typeof fiLate !== 'function') return `${head} Pay by ${fd(D(15))} to avoid your access being paused.`;
  const late = fiLate(o.due, w), days = `It is ${plural(Math.max(0, late), 'day')} overdue.`;
  if (fiPinned(w)) return `${head} ${days} Please pay it as soon as you can.`;
  const by = new Date(new Date(o.due).getTime() + 30 * DAY).toISOString();
  return `${head} ${days} ${late < 30 ? `Pay by ${fd(by)} to avoid your access being paused.` : 'Pay now to restore your access.'}`;
}

/* ---------- UX Changelog ---------- */
if (typeof UXC !== 'undefined') UXC.push(['MR-R', 'Record linkage and workflow consistency (2 Nov 2026)', [
  'Client demo: an approved Data Correction changes the learner\'s record and their admin row (name, date of birth, referral attribution); a held certificate is re-issued; Learner 360 shows the learner\'s own records in every tab.',
  'Coordinators keep their own drafts; each Coordinator and staff member sees only the notifications addressed to them; IQA records show the declared outcome or "No final outcome".',
  'A release that fails says so, and marking stranded by an Assessor change is listed (P-06). Deactivated accounts can\'t sign in. Coordinator timeline edits stay within the batch dates.',
]]);
