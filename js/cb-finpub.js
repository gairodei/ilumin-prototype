/* ============================================================
   Course builder acceptance correction — financial approval precedes publication (21 Oct 2026; PD-CB-85…89).
   Root cause: for a published programme, CB8 built, froze and checked its financial package against the observation
   configuration IN FORCE (n5PubCur). A draft version's observation answer or permitted locations were invisible to Fees &
   Payments and Finance, so the version published under the old approval and the approval was withdrawn only afterwards
   (and CB11 merely warned — PD-CB-76, now withdrawn).
   Correction:
   - The basis of a package is the configuration being published: a draft version's own observation configuration while one
     exists. The creator edits and submits the package against it; Finance reviews that exact configuration (its staleness
     check uses the same basis).
   - A package approved for a draft version whose basis differs from the version in force is held, not put in force: learners
     signing up now keep the plan in force. Publishing that version puts the held package in force (a new plan version).
   - Publishing a package programme's draft version needs an Approved package whose basis matches the draft — checked in
     Review & Publish, when the publish action is called (direct calls included) and again when the publish is confirmed.
     Unrelated changes (curriculum, assessments, letters, a version that keeps the same observation answer) don't invalidate.
   - While Finance reviews, the draft version's observation answer and settings are locked, as they already were for a Draft
     programme. Super Administrator D8 and Finance's separation of duties are unchanged (the same actions are used).
   - Fees & Payments: no "Submit to Finance" on approved terms; the queue reference is shown once.
   Legacy programmes (no financial package) keep their existing rules. Loads last.
   ============================================================ */
'use strict';

/* ---------- The configuration in force, and the one being published ---------- */
const cbFpLiveCfg = pr => { try { return pr.status === 'Draft' ? n5Shown(pr) : (n5PubCur(pr) || n5Shown(pr)); } catch (e) { return null; } };
const cbFpDv = pr => (pr && pr.status !== 'Draft' && !cbRetired(pr) && typeof n5DraftV === 'function' ? n5DraftV(pr) : null); // a draft version of a published programme
// (reads the draft's record only — never creates one: a version whose observations haven't been touched is still undecided)
cb8Cfg = function (pr) { try { const dv = cbFpDv(pr); if (!dv) return cbFpLiveCfg(pr); const d = N5().draft[pr.id]; return d && d.v === dv ? d : { required: null }; } catch (e) { return null; } };
function cbFpBasisOf(pr, cfg) {
  const c = cfg || {}, req = c.required === true ? true : c.required === false ? false : null;
  return { level: pr.level, dur: pr.durV ? { n: pr.durV.n, unit: pr.durV.unit } : null, req, wp: req === true && c.workplace === 'Permitted', off: req === true && c.office === 'Available' };
}
const cbFpLive = pr => cbFpBasisOf(pr, cbFpLiveCfg(pr));
// A draft version whose observation answer hasn't been given yet: nothing is decided, so nothing is invalidated (N5a blocks it)
const cbFpUndecided = pr => !!cbFpDv(pr) && cb8Basis(pr).req === null;

/* ---------- Invalidation before publication (never after) ---------- */
const _bcFP = cb8BasisCheck;
cb8BasisCheck = function (pr) {
  if (!pr || cbFpUndecided(pr)) return;
  const r = _bcFP.apply(this, arguments), wf = CB8().wf[pr.id];
  if (wf && wf.held && wf.status !== 'Approved') delete wf.held; // a held package is no longer the approved terms
  return r;
};
// While Finance reviews a draft version's package, its basis is locked (as for a Draft programme — CB8)
const _obsSetFP = cbObsSet;
cbObsSet = function (pr, val) { if (pr && cbFpDv(pr) && cb8Locked(pr) && cbObsOf(pr) !== val) { cb8LockMsg(pr, 'change whether the course has observations'); return false; } return _obsSetFP.apply(this, arguments); };
const _n5SetFP = ACT.n5Settings;
ACT.n5Settings = el => { const pr = cbPr(el && el.dataset && el.dataset.p); if (pr && cbFpDv(pr) && cb8Locked(pr) && n5CanEdit()) return cb8LockMsg(pr, 'change the observation settings'); return _n5SetFP(el); };

/* ---------- Approval for a draft version: held until that version is published ---------- */
const _applyFP = cb8Apply;
cb8Apply = function (pr, pkg0, meta) {
  const dv = cbFpDv(pr);
  if (!dv || cb8Key(pkg0.basis) === cb8Key(cbFpLive(pr))) return _applyFP.apply(this, arguments); // same basis as the version in force: in force now (unchanged)
  const at = now().toISOString(), wf = cb8Wf(pr) || (CB8().wf[pr.id] = { hist: [] });
  const pkg = e1Freeze({ ...JSON.parse(JSON.stringify(pkg0)), approved: { by: meta.by, at, qid: meta.qid || null, how: meta.how || '', note: meta.r || '' } });
  Object.assign(wf, { status: 'Approved', sub: null, changes: null, held: { v: dv, pkg, meta: { ...meta } }, approved: { by: meta.by, at, qid: meta.qid || null, how: meta.how || '', v: null, forV: dv, basis: pkg.basis } });
  CB8().work[pr.id] = null; // the working copy is now the held package (cb8Derive)
  const cur = s4PlanCur(pr.id);
  cb8Hist(pr, `${meta.qid ? `Approved by Finance (${meta.qid})` : `Approved — ${meta.how}`} for Version ${dv} (draft)`, `${cb8Txt(pkg)} — in force when Version ${dv} is published${meta.r ? ' — ' + meta.r : ''}`);
  logA('NVQ Programmes', cb8Ent(pr), `Payment terms approved for Version ${dv} (draft)`, cur ? `Plan v${cur.v} in force` : '—', `Held until Version ${dv} is published`, meta.r || '');
  return '';
};
// The working copy of a programme with a held package starts from that package (not the one in force)
const _deriveFP = cb8Derive;
cb8Derive = function (pr) {
  const wf = CB8().wf[pr.id], h = wf && wf.held && wf.held.pkg; if (!h) return _deriveFP.apply(this, arguments);
  const cur = cb8Cur(pr.id), inF = id => !!(cur && cur.opts.some(o => o.id === id));
  return { pid: pr.id, derived: true, dep: { mode: h.dep.mode, amount: h.dep.amount }, partial: h.partial,
    opts: h.opts.map(o => ({ id: o.id, label: o.label, mode: o.mode, fee: o.fee, legacy: !!o.legacy, status: o.status, inForce: inF(o.id), obsWp: o.keptWp != null ? o.keptWp : o.obsWp, obsOff: o.keptOff != null ? o.keptOff : o.obsOff, pay: o.pay.map(x => ({ id: x.id, k: x.k })) })) };
};
// Publishing the version puts its held package in force (a new plan version for new learners; earlier learners keep theirs)
function cbFpPutInForce(pr) {
  const wf = CB8().wf[pr.id], h = wf && wf.held; if (!h || wf.status !== 'Approved' || h.v !== pr.version || cbFpDv(pr)) return;
  if (cb8Key(h.pkg.basis) !== cb8Key(cbFpLive(pr))) return; // never put terms in force for a configuration that isn't the one published
  delete wf.held;
  const why = _applyFP(pr, h.pkg, { ...h.meta, r: `${h.meta.r || ''} — put in force when Version ${pr.version} was published`.replace(/^ — /, '') });
  if (why) { wf.held = h; logA('Payment Plans', cb8Ent(pr), 'Held package not put in force', '—', '—', why); }
}

/* ---------- The publication gate: an approved package for exactly the configuration being published ---------- */
function cbFinGate(pr) {
  if (!pr || cbRetired(pr) || !cb8Managed(pr)) return ''; // legacy programmes keep their existing rules
  const kind = cbRvKind(pr); if (!kind) return '';
  const b = cb8Basis(pr); if (kind === 'draftVer' && b.req === null) return ''; // N5a: the observation answer is chosen first
  const wf = cb8Wf(pr), dv = cbDraftV(pr), q = wf && wf.qid ? ` (${wf.qid})` : '', where = kind === 'draftProg' ? 'this programme' : `Version ${dv}`;
  if (kind === 'draftVer') {
    if (!wf) return `Payment terms: no approved financial package for Version ${dv} — submit one to Finance from Fees & Payments`;
    if (wf.status === 'Pending') return `Payment terms waiting for Finance review${q} — Version ${dv} can be published once Finance approves them`;
    if (wf.status === 'Changes') return `Payment terms: Finance requested changes${q} — update them in Fees & Payments and submit again`;
    if (wf.status !== 'Approved') return `Payment terms not approved for Version ${dv} — submit them to Finance from Fees & Payments`;
  }
  if (!wf || wf.status !== 'Approved') return ''; // a Draft programme: E1's own blocker (unchanged)
  const ab = (wf.approved && wf.approved.basis) || wf.cb8basis || (cb8Cur(pr.id) || {}).basis;
  if (ab && cb8Key(ab) !== cb8Key(b)) return `Payment terms: the approved package is for ${cb8BasisTxt(ab)}, but ${where} is ${cb8BasisTxt(b)} — submit a revised package to Finance from Fees & Payments`;
  return '';
}
cbRvFinWarn = () => ''; // PD-CB-76 (warn after the fact) is withdrawn: the gate blocks before publication
const _checksFP = cbRvChecks;
cbRvChecks = function (pr) {
  const r = _checksFP.apply(this, arguments), why = cbFinGate(pr);
  if (why && !r.block.some(x => x.msg === why)) r.block.push({ msg: why, sec: 'payments', tab: 'fees' });
  return r;
};
function cbFinRefuse(pr, why) {
  logA('NVQ Programmes', cbEnt(pr), 'Blocked: publish (payment terms not approved for this version)', '—', '—', why);
  openModal({ title: "Can't publish yet — payment terms", body: `<div class="note b-red cb-fin-gate">${ic('alert')}<div class="small"><strong>Finance approval is needed first.</strong> ${esc(why)}.</div></div><p class="small">Finance reviews the payment terms for exactly this configuration. Nothing is published until they approve them.</p>`,
    actions: [{ label: 'Close' }, { label: 'Open Fees & Payments', cls: 'btn-primary', fn: () => { go('a-programmes', { id: pr.id, tab: 'fees' }); } }] });
  return false;
}
// Every publish action: refused before it opens, rechecked when it is confirmed; a held package goes into force with the version
['kPubProg', 's3WizPublish', 'ch8Publish'].forEach(n => {
  const f = ACT[n]; if (typeof f !== 'function') return;
  ACT[n] = function (el) {
    const pr = cbPr(el && el.dataset && (el.dataset.id || el.dataset.p));
    if (pr && cbAdmin()) { const why = cbFinGate(pr); if (why) return cbFinRefuse(pr, why); } // other roles get the action's own refusal
    const r = f.apply(this, arguments), m = MODAL && MODAL.actions && MODAL.actions.find(x => /primary|danger/.test(x.cls || ''));
    if (pr && m && m.fn && /^Publish/.test(MODAL.title || '')) {
      const g = m.fn; m.fn = function () { const why = cbFinGate(pr); if (why) { closeModal(); cbFinRefuse(pr, why); return false; } const x = g.apply(this, arguments); cbFpPutInForce(pr); return x; };
    }
    return r;
  };
});

/* ---------- Fees & Payments: the state note and the approved state ---------- */
const _noteFP = cb8StateNote;
cb8StateNote = function (pr, wf) {
  let h = _noteFP.apply(this, arguments);
  if (wf && wf.status === 'Approved') h = h.replace(/(<strong>Payment terms: Approved) — <(a|span)[^>]*>AQ-\d+<\/\2>\./, '$1.'); // the queue item is named once, in the approval line
  if (wf && wf.held) h = h.replace(/ · plan version \d+(?: \(legacy terms\))?\./, '.').replace('</div></div>', ` <strong>Approved for Version ${wf.held.v} (draft):</strong> these terms go into force when Version ${wf.held.v} is published. Until then learners keep plan version ${(s4PlanCur(pr.id) || {}).v || '—'}.</div></div>`);
  return h;
};
const _panelFP = cb8Panel;
cb8Panel = function (pr) {
  const h = _panelFP.apply(this, arguments), wf = cb8Wf(pr); if (!wf || wf.status !== 'Approved') return h;
  if (cb8Issues(pr, cb8Work(pr)).length) return h; // approved terms that still have items to fix keep the list and the way to resubmit
  const i = h.indexOf('<div class="cb8-submit">'); if (i < 0) return h;
  const j = h.indexOf('<div class="row">', i), k = j < 0 ? -1 : h.indexOf('</div></div>', j); if (k < 0) return h;
  const held = wf.held ? ` for Version ${wf.held.v} (draft) — in force when it is published` : ' — the terms in force';
  const msg = `<div class="cb8-submit cb8-approved"><p class="small">${ic('check', 14)} <strong>Approved${held}.</strong> To change them, edit a fee option, a payment option or the deposit above. The change is saved as a draft and ${isSA() ? 'you approve it as Super Administrator (D8)' : 'is submitted to Finance for approval'}; nothing changes for learners until it is approved.</p></div>`;
  return h.slice(0, i) + msg + h.slice(k + '</div></div>'.length);
};
// Review & Publish: a held package is the one shown for the draft version
const _feesFP = cbRvFees;
cbRvFees = function (pr) {
  const h = _feesFP.apply(this, arguments), wf = cb8Managed(pr) ? cb8Wf(pr) : null; if (!wf || !wf.held) return h;
  return h.replace(/ · plan version \d+ · terms locked/, ` · for Version ${wf.held.v} (draft) — in force when published`);
};

// Finance's queue item says when a package for a draft version takes effect (approved now, in force at publication)
const _qdFP = queueDetail;
queueDetail = function (id) {
  const h = _qdFP.apply(this, arguments), i = qItem(id); if (!i || !i.data || !i.data.cb8) return h;
  const pr = cbPr(i.data.pid), dv = pr && cbFpDv(pr); if (!dv || cb8Key(i.data.pkg.basis) === cb8Key(cbFpLive(pr))) return h;
  return h.replace(/<dt>On approval<\/dt><dd class="small">A new plan version is saved with exactly this package for new learners\./, `<dt>On approval</dt><dd class="small"><strong>These terms are for Version ${dv} (draft), which isn't published yet.</strong> On approval they are held, and saved as a new plan version for new learners when Version ${dv} is published; until then the terms in force don't change.`);
};

/* ---------- Records ---------- */
UXC.push(['CB12-F', 'Financial approval precedes publication (21 Oct 2026)', [
  'When a published programme has a draft version, Fees & Payments works on that version\'s configuration: the observation answer and permitted locations of the draft decide which observation fees apply, and the package is submitted and approved for exactly that configuration. While Finance reviews it, the draft\'s observation answer and settings are locked.',
  'A package approved for a draft version that changes the observation basis is held: learners signing up now keep the plan in force. Publishing the version puts the held package in force as a new plan version.',
  'Review & Publish blocks a draft version while its package is not approved, waiting for Finance, returned with changes, or approved for a different configuration, with "Fix in Section 5 — Fees & Payments"; the publish actions refuse the same (logged), also when called directly or when the state changes before the publish is confirmed. A version that keeps the same observation answer and locations publishes under the approved package.',
  'Fees & Payments: approved terms no longer offer "Submit to Finance for review" — they say they are approved and how to change them; the queue reference is shown once.']]);
