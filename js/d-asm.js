/* ============================================================
   Batch D2 — assessment feedback completion (22 Oct 2026; PD-D-10…15 in PROVISIONAL-DECISIONS.md).
   Built on R3 (Coordinator criterion judgements, the Assessor-only final outcome, the judgement log):
   - The learner's allocated assignment assessor can override a Coordinator's published criterion judgement, with a required
     reason. The override is a new Assessor judgement (the Coordinator's record is never changed); it records what it overrides
     and why, sets the Assessor's marking for that criterion, and reaches the learner with the Assessor's released marking.
   - The final Pass / Fail (allocated Active Assessor only — never the Teacher role, unchanged) now carries overall feedback
     for the learner. It still doesn't derive from criterion judgements and changes no status (PD-R3-07).
   - The learner sees the final outcome and overall feedback once that round's marking has been released by the existing
     release step (provisional, reversible: D_OUT_LEARNER). Agencies don't see it.
   - No late submissions (the stated rule): submitting after the deadline — the extended deadline when an extension was
     granted, or the resubmission deadline — is refused in the action itself, logged. Before, a direct call submitted.
   Submissions, References, attachments and resubmission rounds are unchanged. Loads last.
   ============================================================ */
'use strict';

const D_OUT_LEARNER = true; // PD-D-13: show the released outcome and overall feedback to the learner (set false to hide)

/* ---------- Override a Coordinator judgement (allocated assignment assessor only) ---------- */
const dCooJ = (key, crit) => r3Latest(key, crit, 'Academic Coordinator', true);
const dOvOf = (key, jid) => r3Judg(key).filter(j => j.override && j.override.of === jid);
ACT.dOverride = el => {
  const key = el && el.dataset && el.dataset.k, why = r3MarkWhy(key); if (why) return r3Deny(String(key || '—'), 'override a Coordinator judgement', why, tasLog);
  const s = r3StaffSub(key), a = tasAsg(s), q = a && a.qs.find(x => x.id === el.dataset.q), j = q && dCooJ(key, q.crit);
  if (!q || !j) return toast('There is no published Coordinator judgement for this criterion.', 'err');
  const round = a.round || 'Sub 1';
  reasonDlg({ title: `Override the Coordinator's judgement — ${esc(q.crit)}`, ok: 'Record override', label: 'Reason (required — the learner sees it with your released marking)',
    extra: `<p class="small">The Coordinator (${esc(j.by)}) judged <strong>${esc(j.value)}</strong> on ${fdt(j.pubAt || j.at)}. Their judgement stays in the record; yours is recorded beside it as the Assessor's judgement.</p><fieldset class="stack" style="border:0;padding:0" id="d-ov-v"><legend class="lbl">Your judgement</legend>${R3_VALS.filter(v => v !== j.value).map(v => `<label class="opt"><input type="radio" name="d-ov" value="${v}"> ${v}</label>`).join('')}</fieldset>`,
    onOk: r => {
      const w = r3MarkWhy(key); if (w) { r3Deny(String(key), 'override a Coordinator judgement', w, tasLog); return false; }
      const v = ($('input[name="d-ov"]:checked') || {}).value; if (!R3_VALS.includes(v) || v === j.value) { fieldErr('#d-ov-v', 'Choose a judgement different from the Coordinator\'s'); return false; }
      const me = TME().name, rec = r3Add(key, { aid: a.id, title: a.title, qid: q.id, crit: q.crit, value: v, text: `Overrides the Coordinator's "${j.value}" (${j.by}): ${r}`, by: me, role: 'Assessor', round, published: false, override: { of: j.id, from: j.value, coord: j.by, reason: r } });
      const d = dft(key); d.items[q.id] = { ...(d.items[q.id] || {}), met: v }; // the Assessor's marking for this criterion (applied when the marking is released)
      tasLog('Assessment', `${s.L.name} · ${a.title}`, 'Coordinator judgement overridden', `${q.crit}: ${j.value} (${j.by})`, `${q.crit}: ${v} (${me})`, r);
      if (s.L.batch && s.L.batch.coord) chCooNotify(s.L.batch.coord, 'Criterion judgement overridden by the Assessor', `${s.L.name} · ${a.title} · ${q.crit}: ${j.value} → ${v} — ${r}`, 'c-sub.' + key);
      render(); toast(`Override recorded (${rec.id}). The learner sees it when your marking is released.`);
    } });
};
// The Assessor workspace: the Coordinator's published judgement gets "Override…" (for the allocated assessor) and shows any override
const _tMarkD = SCREENS['t-mark'];
SCREENS['t-mark'] = p => {
  const h = _tMarkD(p), s = p && p.id ? r3StaffSub(p.id) : null; if (!s) return h;
  const a = tasAsg(s), q = a.qs[Math.min(S.tas.qi, a.qs.length - 1)], j = q && dCooJ(s.key, q.crit); if (!j) return h;
  const ov = dOvOf(s.key, j.id).slice(-1)[0], can = !r3MarkWhy(s.key);
  const add = `${ov ? `<p class="xs d-ov-note">${ic('edit', 12)} Overridden by ${esc(ov.by)} (Assessor) on ${fdt(ov.at)}: ${chip(ov.value, r3Tone(ov.value))} — ${esc(ov.override.reason)}${ov.published ? '' : ' · not yet released to the learner'}</p>` : ''}${can ? `<button class="btn btn-sm d-ov-btn" data-act="dOverride" data-k="${s.key}" data-q="${q.id}">${ov ? 'Override again…' : 'Override the Coordinator\'s judgement…'}</button>` : ''}`;
  return h.replace(/(<div class="r3-pub r3-cooj">[\s\S]*?<\/div>)(<\/div>)?(<h3>Criterion decision<\/h3>)/, (m, x, y, z) => `${x}${y || ''}${add}${z}`);
};
// Coordinator's review: an overridden judgement says so (staff only)
const _critPanelD = r3CritPanel;
r3CritPanel = function (s, a, q) {
  const h = _critPanelD.apply(this, arguments), j = dCooJ(s.key, q.crit), ov = j && dOvOf(s.key, j.id).slice(-1)[0]; if (!ov) return h;
  return h.replace('<div class="r3-pub"><span class="xs strong">Published to the learner</span>', `<p class="xs d-ov-note">${ic('edit', 12)} Your ${esc(j.value)} was overridden by ${esc(ov.by)} (Assessor): ${chip(ov.value, r3Tone(ov.value))} — ${esc(ov.override.reason)}${ov.published ? '' : ' · not yet released to the learner'}</p><div class="r3-pub"><span class="xs strong">Published to the learner</span>`);
};

/* ---------- Final outcome: overall feedback with the declaration ---------- */
const _declD = ACT.r3Declare;
ACT.r3Declare = el => {
  const key = el && el.dataset && el.dataset.k, r = _declD(el); if (!MODAL || !/^Final outcome/.test(MODAL.title || '')) return r;
  MODAL.body = (MODAL.body || '').replace('<p class="xs muted">A declared outcome', '<div class="field"><label for="d-ofb">Overall feedback for the learner (required)</label><textarea class="textarea" id="d-ofb" rows="4"></textarea><span class="hint">Shown to the learner with the outcome once this round\'s marking is released.</span></div><p class="xs muted">A declared outcome'); renderModal();
  const act = MODAL.actions.find(x => x.cls && /primary/.test(x.cls)), f = act && act.fn; if (!f) return r;
  act.fn = (...x) => { const fb = (($('#d-ofb') || {}).value || '').trim(); if (!fb) { fieldErr('#d-ofb', 'Write the overall feedback for the learner'); return false; } const before = r3Out(key), res = f(...x), o = r3Out(key); if (res !== false && o && o !== before) { o.feedback = fb; o.hist[o.hist.length - 1].push(fb); } return res; };
  return r;
};
const _outCardD = r3OutCard;
r3OutCard = function (s) {
  const h = _outCardD.apply(this, arguments), o = r3Out(s.key); if (!o || !o.feedback) return h.replace('the learner doesn\'t see it yet.', 'the learner sees it, with your overall feedback, once this round\'s marking is released.');
  return h.replace('the learner doesn\'t see it yet.', 'the learner sees it, with your overall feedback, once this round\'s marking is released.').replace(/(<span class="xs muted">[^<]*<\/span><\/p>)/, `$1<div class="d-ofb"><span class="xs strong">Overall feedback</span><p class="small">${esc(o.feedback)}</p><p class="xs muted">${dOutSeen(s.key) ? 'Released to the learner.' : 'Not yet released to the learner.'}</p></div>`);
};

/* ---------- The learner sees the released outcome ---------- */
// Released = an Assessor judgement of the outcome's round was published by the release step
const dOutSeen = key => { const o = r3Out(key); return !!(D_OUT_LEARNER && o && r3Judg(key).some(j => j.role === 'Assessor' && j.published && j.round === o.round)); };
const _fbTopD = feedbackTop;
feedbackTop = function (a) {
  const h = _fbTopD.apply(this, arguments), key = (!S.portal || S.portal === 'learner') && W && W.me ? W.me.id + '~' + a.id : '', o = key && r3Out(key);
  if (!o || !dOutSeen(key)) return h;
  return h + `<section class="card d-lout" aria-label="Final outcome"><div class="row-b"><h2>Final outcome</h2>${chip(o.result, r3Tone(o.result))}</div><p class="small">${esc(o.round)} — declared by ${esc(o.by)} (your Assessor) on ${fd(o.at)}.</p>${o.feedback ? `<h3>Overall feedback</h3><p class="small">${esc(o.feedback)}</p>` : ''}<p class="xs muted">The outcome is your Assessor's decision for the whole assignment; it isn't worked out from the individual criteria.</p></section>`;
};

/* ---------- No late submissions (the stated rule), in the action itself ---------- */
const dDue = a => a.resubDue || a.due;
const dLate = a => !!a && (a.closed || (dDue(a) && new Date(dDue(a)) < now()));
const dLateRefuse = (a, what) => { logA('Assessment', `${W.me.first} ${W.me.last} (${W.me.id}) · ${a.title}`, 'Blocked: ' + what + ' after the deadline', '—', '—', `Deadline ${fdt(dDue(a))}${a.originalDue ? ' (extended)' : ''} — no late submissions`); toast('The deadline has passed, so this can\'t be submitted. If you need more time, ask your assessor for an extension.', 'err'); return false; };
const _revD = ACT.reviewSubmit;
// (a released seat keeps its own refusal first — P-32)
const dSeatReleased = () => typeof chReleased === 'function' && chReleased(W) && !(W.signup && W.signup.again && W.signup.done);
ACT.reviewSubmit = el => { const a = asgById(el && el.dataset && el.dataset.id); if (!dSeatReleased() && dLate(a)) return dLateRefuse(a, 'submit'); return _revD(el); };
const _undoD = startUndo;
startUndo = function (a) { if (dLate(a)) { closeModal(); return dLateRefuse(a, 'submit'); } return _undoD.apply(this, arguments); };

/* ---------- Records ---------- */
UXC.push(['D2', 'Assessments — feedback completion (22 Oct 2026)', [
  'The learner\'s allocated assignment assessor can override a Coordinator\'s published criterion judgement ("Override the Coordinator\'s judgement…" in the marking workspace), with a required reason. The Coordinator\'s judgement stays in the record; the override is the Assessor\'s judgement, says what it overrides and why, and reaches the learner with the released marking. The Coordinator is told.',
  'Declaring the final Pass / Fail (allocated Assessor only) now needs overall feedback for the learner. The learner sees the outcome and the overall feedback once that round\'s marking is released; it isn\'t worked out from the criteria, and agencies don\'t see it.',
  'No late submissions: submitting after the deadline (or the extended or resubmission deadline) is refused and logged, also when called directly.']]);
