/* PDS — Professional Discussion: the Assessor chooses which eligible criteria go to the PD (7 Nov 2026; PD-PDS-* in PROVISIONAL-DECISIONS.md).
   When an answer's exit is "Added to PD", the Assessor ticks one or more criteria (per question: that question's mapped criteria; whole
   assessment: the assessment's criteria, chosen once in "Whole-assessment criteria"). Eligible: mapped by the assessment's own (versioned)
   copy, not already achieved and locked, and not verified Met in this marking. A Coordinator's published feedback decides nothing here.
   The choice (stable criterion codes, who, when) is kept on the marking draft and checked again when the marking is published, released
   from the queue and applied: a missing or no-longer-eligible choice blocks with what to change — it is never changed silently.
   On release only the chosen criteria are referred (one open PD item per learner, assignment and criterion — several questions referring
   the same criterion share it); the others get the Assessor's judgement as usual (verified Met → Achieved and locked). Released records,
   PD items and outcomes from before are not rewritten; an unreleased draft without a choice must make one. Loads after cma-mapping.js. */
'use strict';
const PDS_Q = '__asg';
const pdsWhole = a => !!a && a.mapMode === 'assessment';
const pdsPdQs = (a, d) => markable(a).filter(q => ((d && d.items || {})[q.id] || {}).exit === 'pd');
const pdsN = (a, q) => 'Q' + (a.qs.indexOf(q) + 1);
// Verified Met in the marking draft (the allocated Assessor's own decision) — for any question or the whole assessment
function pdsVerified(a, d, c) {
  return Object.entries((d && d.items) || {}).some(([qid, x]) => {
    if (!x) return false; const y = (x.cj || {})[c]; if (y && y.met === 'Met' && y.verified) return true;
    const q = qid === PDS_Q ? null : a.qs.find(z => z.id === qid); return !!q && q.crit === c && x.met === 'Met' && !!x.verified;
  });
}
// The criteria the Assessor may refer, each with why it is excluded ('' = eligible)
// A chosen code is a stable reference only inside the learner's own snapshot: the criteria their copy of the assessment maps (fixed at
// publication) and their pinned programme version's curriculum (copied at enrolment — later curriculum edits never reach it). It must be
// mapped there and name exactly one criterion; otherwise it is refused, never redirected. A learner record without a curriculum (a recorded
// learner) is checked against the copy's mapping only.
const pdsPin = s => { const w = s && s.live && s.L && s.L.v && STORE.worlds[s.L.v]; return w && w.nvq ? (w.nvq.progVersion || null) : null; };
function pdsRefWhy(s, a, c) {
  if (!(a.crit || []).some(z => z[0] === c) && !(a.acrit || []).includes(c) && !a.qs.some(q => qCrits(q).includes(c))) return 'not mapped to this assessment';
  const w = s && s.live && s.L && s.L.v && STORE.worlds[s.L.v]; if (!w || !w.tree) return '';
  const n = w.tree.reduce((k, u) => k + u.mods.reduce((j, m) => j + m.los.reduce((i, lo) => i + lo.crit.filter(x => x.code === c).length, 0), 0), 0);
  return !n ? "not in the learner's programme version" : n > 1 ? "ambiguous in the learner's programme version (code used twice)" : '';
}
const pdsElig = (s, a, d, q) => (q ? qCrits(q) : (a.acrit || [])).map(c => ({ c, why: pdsRefWhy(s, a, c) || (critLock(s, c) ? 'already achieved and locked' : pdsVerified(a, d, c) ? 'verified Met in this marking' : '') }));
const pdsOk = (s, a, d, q) => pdsElig(s, a, d, q).filter(x => !x.why).map(x => x.c);
// What stops the marking being published / released / applied
function pdsProblems(s, a, d) {
  const out = [], qs = pdsPdQs(a, d); if (!qs.length) return out;
  const pin = pdsPin(s), chk = (label, sel, ok, x) => {
    if (!Array.isArray(sel) || !sel.length) { out.push(`${label}: choose at least one criterion for the Professional Discussion`); return; }
    if (x && x.pdV != null && pin != null && x.pdV !== pin) { out.push(`${label}: the learner's programme version changed since the PD criteria were chosen (Version ${x.pdV} → Version ${pin}) — choose them again`); return; }
    const bad = sel.filter(c => !ok.includes(c)), why = c => (pdsRefWhy(s, a, c) || (critLock(s, c) ? 'already achieved and locked' : pdsVerified(a, d, c) ? 'verified Met in this marking' : 'not eligible'));
    if (bad.length) out.push(`${label}: ${bad.map(c => `${c} (${why(c)})`).join(', ')} ${bad.length === 1 ? 'is' : 'are'} no longer eligible — untick ${bad.length === 1 ? 'it' : 'them'} under "Criteria for the Professional Discussion"`);
  };
  if (pdsWhole(a)) chk(`Whole assessment (${qs.map(q => pdsN(a, q)).join(', ')} added to PD)`, ((d.items || {})[PDS_Q] || {}).pdCrit, pdsOk(s, a, d, null), (d.items || {})[PDS_Q]);
  else qs.forEach(q => chk(pdsN(a, q), d.items[q.id].pdCrit, pdsOk(s, a, d, q), d.items[q.id]));
  return out;
}

/* ---------- Choosing (the allocated Assessor, a submitted round, in the action itself) ---------- */
INP.pdsPick = el => {
  const key = el && el.dataset && el.dataset.k, w = r3MarkWhy(key); if (w) { r3Deny(String(key || '—'), 'choose PD criteria', w, tasLog); render(); return false; }
  const s = r3StaffSub(key), a = tasAsg(s), d = dft(key), qid = el.dataset.q, c = el.dataset.c, on = !!el.checked;
  const no = m => { tasLog('PD', `${s.L.name} · ${a.title}`, 'Blocked: choose PD criteria', '—', c || '—', m); toast(m, 'err'); render(); return false; };
  if (!s.toMark || s.L.status === 'Discontinued') return no('This submission is read-only.');
  let q = null;
  if (qid === PDS_Q) { if (!pdsWhole(a)) return no('This assignment is mapped per question — choose the PD criteria on the answer.'); if (!pdsPdQs(a, d).length) return no('Choose "Added to PD" for an answer first.'); }
  else { if (pdsWhole(a)) return no('This assignment is mapped as a whole — choose the PD criteria under "Whole-assessment criteria".'); q = markable(a).find(x => x.id === qid); if (!q || (d.items[qid] || {}).exit !== 'pd') return no('Choose "Added to PD" for this answer first.'); }
  const el2 = pdsElig(s, a, d, q), e = el2.find(x => x.c === c); if (!e) return no(`${c || 'That criterion'} isn't mapped to this ${q ? 'question' : 'assessment'}.`);
  if (on && e.why) return no(`${c} can't go to the Professional Discussion: ${e.why}.`);
  const x = qid === PDS_Q ? (d.items[PDS_Q] = d.items[PDS_Q] || { cj: {} }) : d.items[qid], was = x.pdCrit || [];
  if (on === was.includes(c)) { render(); return; }
  const nu = on ? was.concat(c) : was.filter(z => z !== c);
  x.pdCrit = el2.map(z => z.c).filter(z => nu.includes(z)); x.pdBy = TME().name; x.pdAt = now().toISOString(); x.pdV = pdsPin(s); // the learner's pinned version the codes refer to
  mkSaved(d); render();
};
function pdsBox(s, a, d, q, qid, ro) {
  const el = pdsElig(s, a, d, q), sel = ((d.items || {})[qid] || {}).pdCrit || [], n = sel.length, x = (d.items || {})[qid] || {};
  return `<fieldset class="field pds-pick" data-q="${esc(qid)}"><legend class="lbl">Criteria for the Professional Discussion — select one or more</legend>
    <span class="xs ${n ? 'muted' : 'cbr-warn'} pds-n">${n ? plural(n, 'criterion', 'criteria') + ' selected' : 'None selected — choose at least one'}${n && x.pdBy ? ` · chosen by ${esc(x.pdBy)}, ${fdt(x.pdAt)}` : ''}</span>
    ${el.map(z => `<label class="check"><input type="checkbox" data-onchange="pdsPick" data-k="${s.key}" data-q="${esc(qid)}" data-c="${esc(z.c)}" ${sel.includes(z.c) ? 'checked' : ''} ${ro || (z.why && !sel.includes(z.c)) ? 'disabled' : ''}><span><span class="code">${esc(z.c)}</span> ${esc(cmaCritRow(s.L.v, z.c).d || '')}${z.why ? ` <span class="xs muted">— ${esc(z.why)}</span>` : ''}${z.why && sel.includes(z.c) ? ' <span class="xs cbr-warn">no longer eligible — untick it</span>' : ''}</span></label>`).join('') || '<p class="xs muted">No criteria are mapped here.</p>'}
    <p class="xs muted">Only the ticked criteria join the PD checklist. The others keep your judgement. The Coordinator's feedback doesn't decide this.</p></fieldset>`;
}
const _tMarkPDS = SCREENS['t-mark'];
SCREENS['t-mark'] = p => {
  const h = _tMarkPDS(p), s = typeof h === 'string' && S.portal === 'staff' && p && p.id ? r3StaffSub(p.id) : null; if (!s || r3NoSub(s)) return h;
  if (relStore()[s.key]) return pdsQueuedNote(s, h); // queued for the Coordinator: read-only (recall below when the PD choice is missing)
  const a = tasAsg(s), d = dft(s.key), ro = !s.toMark || s.L.status === 'Discontinued' || !!r3MarkWhy(s.key);
  if (pdsWhole(a)) {
    if (!pdsPdQs(a, d).length) return h; const k = h.indexOf('<section class="card cma-mk">'), e = k < 0 ? -1 : h.indexOf('</section>', k); if (e < 0) return h;
    return h.slice(0, e) + `<div class="pds-whole"><h3>Professional Discussion (${pdsPdQs(a, d).map(q => pdsN(a, q)).join(', ')} added to PD)</h3>${pdsBox(s, a, d, null, PDS_Q, ro)}</div>` + h.slice(e);
  }
  const q = a.qs[Math.min(S.tas.qi, a.qs.length - 1)]; if (!q || q.state !== 'open' || (d.items[q.id] || {}).exit !== 'pd') return h;
  const m = '<p class="xs muted">Learner will NOT rework this item', k = h.indexOf(m); return k < 0 ? h : h.slice(0, k) + pdsBox(s, a, d, q, q.id, ro) + h.slice(k);
};

/* ---------- Checked again where the marking is published, released and applied ---------- */
const pdsMsg = p => 'Can\'t publish yet — ' + p.join('; ') + '.';
const _pubWhyPDS = ta1PubWhy;
ta1PubWhy = function (key) {
  const w = _pubWhyPDS.apply(this, arguments); if (w) return w;
  const s = tasSubs(true).find(x => x.key === key); if (!s) return w; const p = pdsProblems(s, tasAsg(s), dft(key)); return p.length ? pdsMsg(p) : '';
};
// The Coordinator's release queue (marking sent before direct publication): the PD criteria are the Assessor's choice, so it waits
const _relNowPDS = releaseNow;
releaseNow = function (key) {
  const P = relStore()[key]; let p = [];
  if (P) { const v0 = S.tas.v; try { S.tas.v = P.tasV; const s = tasSubs(true).find(x => x.key === key); if (s) p = pdsProblems(s, tasAsg(s), P.draft); } finally { S.tas.v = v0; } }
  if (p.length) { (S.portal === 'coord' ? cooLog : logA)('Release queue', `${P.learner} · ${P.title}`, 'Blocked: release (PD criteria)', 'Awaiting Coordinator release', 'No change', p.join('; ')); toast(`Can't release ${P.learner} · ${P.title}: ${p.join('; ')}. The PD criteria are chosen by the Assessor — they can recall it to their draft to choose them; the marking stays in the queue unchanged until then.`, 'err'); return false; }
  return _relNowPDS.apply(this, arguments);
};
// Applying the marking: only the chosen criteria are referred; the others get the Assessor's judgement; no duplicate open item
const PDS_ST = (c, y, me, at, src) => { if (y.exit === 'resub') c.st = 'Action Required'; else if (y.exit === 'pd') c.st = 'Added to PD'; else if (y.met === 'Met' && y.verified) { c.st = 'Achieved'; c.date = at; c.lock = { by: me, at: y.vat || at }; c.src = src; } else if (y.met === 'Not Met') c.st = 'Action Required'; else c.st = 'In Progress'; };
const _relPDS = releaseFeedback;
releaseFeedback = function (s, a, d) {
  const p = s && a && d ? pdsProblems(s, a, d) : [];
  if (p.length) { tasLog('PD', `${s.L.name} · ${a.title}`, 'Blocked: release (PD criteria)', s.status, 'No change', p.join('; ')); toast(pdsMsg(p), 'err'); return false; }
  if (!s || !a || !d || pdsWhole(a)) return _relPDS.apply(this, arguments); // whole assessment: cma-mapping.js refers the chosen criteria
  const pq = pdsPdQs(a, d).map(q => ({ q, x: d.items[q.id], sel: d.items[q.id].pdCrit.slice() })); if (!pq.length) return _relPDS.apply(this, arguments);
  const its = markable(a).map(q => ({ q, x: JSON.parse(JSON.stringify(d.items[q.id] || {})) })), touched = new Set(pq.flatMap(z => qCrits(z.q)));
  const w = s.live && STORE.worlds[s.L.v], n0 = w && w.pd ? w.pd.items.length : 0, snap = {};
  if (w) w.tree.forEach(u => u.mods.forEach(m => m.los.forEach(lo => lo.crit.forEach(c => { if (touched.has(c.code)) snap[c.code + '|' + u.code] = { st: c.st, date: c.date, lock: c.lock, src: c.src }; }))));
  const t0 = !s.live && STORE.tas.pd.find(x => x.lid === s.L.lid), tn0 = t0 ? t0.items.length : 0;
  const r = _relPDS.apply(this, arguments);
  const me = TME().name, at = STORE.tas.marked[s.key] || now().toISOString(), tag = a.title.split(' —')[0], go = 'assignment.' + a.id, made = {}, why = z => z.x.pdReason || '';
  if (w && w.pd) {
    const fresh = w.pd.items.splice(0, Math.max(0, w.pd.items.length - n0)); // this release's items (newest first) — rebuilt from the choice
    pq.forEach(z => z.sel.forEach(code => {
      if (w.pd.items.some(i => i.ref === code && i.go === go && i.status === 'Open')) return; // already open from an earlier referral
      if (made[code]) { made[code].from += ', ' + pdsN(a, z.q); if (why(z) && !made[code].reason.includes(why(z))) made[code].reason += ' ' + why(z); return; }
      const b = fresh.find(i => i.ref === code) || {};
      made[code] = { ...b, ref: code, unit: b.unit || 'U' + code.split(' ')[0], from: `${tag} · ${pdsN(a, z.q)}`, reason: why(z), status: 'Open', go, by: b.by || me, at: b.at || at, aid: a.id, pv: pdsPin(s) };
    }));
    Object.values(made).forEach(i => w.pd.items.unshift(i));
    // criterion status: as the release decided it, except that an unchosen criterion of a referred answer keeps the Assessor's judgement
    w.tree.forEach(u => u.mods.forEach(m => m.los.forEach(lo => lo.crit.forEach(c => { const o = snap[c.code + '|' + u.code]; if (!o) return; c.st = o.st; c.date = o.date; c.lock = o.lock; c.src = o.src; }))));
    its.forEach(({ q, x }) => { const z = pq.find(y => y.q === q); qCrits(q).forEach(code => { if (!touched.has(code)) return;
      let y = code === q.crit ? x : { exit: x.exit, ...((x.cj || {})[code] || {}) }; if (x.exit === 'pd' && !(z && z.sel.includes(code))) y = { ...y, exit: 'judged' };
      if (y.exit === 'pd' && y.met === 'Met' && y.verified) y = { ...y, exit: 'judged' }; // never turn a verified Met into "Added to PD"
      w.tree.forEach(u => u.mods.forEach(m => m.los.forEach(lo => lo.crit.forEach(c => { if (c.code === code && !c.lock) PDS_ST(c, y, me, at, `${tag} · ${pdsN(a, q)}`); })))); }); });
    pq.forEach(z => { z.q.pdCrit = z.sel.slice(); });
  } else if (!s.live) {
    const t = STORE.tas.pd.find(x => x.lid === s.L.lid);
    if (t) { t.items.splice(t0 ? tn0 : 0); t.meta = t.meta || {}; // CO-1 added one item per referred answer (its first criterion) — rebuilt from the choice
      pq.forEach(z => z.sel.forEach(code => { const it = t.items.find(i => i[0] === code && i[3] === 'Open');
        if (it) { if (made[code]) { it[1] += ', ' + pdsN(a, z.q); } return; }
        t.items.push([code, `${tag} · ${pdsN(a, z.q)}`, why(z), 'Open']); t.meta[code] = { by: me, at, aid: a.id }; made[code] = true; })); }
    const rel = STORE.tas.rel[s.key]; if (rel && rel.items) pq.forEach(z => { if (rel.items[z.q.id]) rel.items[z.q.id].pdCrit = z.sel.slice(); });
  }
  const added = Object.keys(made); pq.forEach(z => { const left = qCrits(z.q).filter(c => !z.sel.includes(c)); tasLog('PD', `${s.L.name} · ${a.title}`, 'Criteria added to PD', `${pdsN(a, z.q)}: ${qCrits(z.q).join(', ')}`, `${z.sel.join(', ')}${left.length ? ` (kept the Assessor's judgement: ${left.join(', ')})` : ''}`, why(z)); });
  if (!added.length) tasLog('PD', `${s.L.name} · ${a.title}`, 'No new PD item', '—', 'already open for this assignment', pq.map(z => z.sel.join(', ')).join('; '));
  render(); return r;
};
// The PD panel (Coordinator, Assessor): an answer referred with a choice lists only the chosen criteria, once each
const _pdRowsPDS = co1PdRows;
co1PdRows = function (L, a, key) {
  let rows = _pdRowsPDS.apply(this, arguments); if (!a || pdsWhole(a)) return rows;
  const rel = !(L.v && STORE.worlds[L.v]) && STORE.tas.rel[key], t = rel && STORE.tas.pd.find(x => x.lid === L.lid);
  rows = rows.filter(r => { const q = a.qs[(r.q || 0) - 1], sel = q && (Array.isArray(q.pdCrit) ? q.pdCrit : rel && rel.items && rel.items[q.id] && rel.items[q.id].pdCrit); return !(Array.isArray(sel) && !sel.includes(r.crit)); });
  if (rel && t) a.qs.forEach((q, k) => { const x = rel.items[q.id]; if (!x || x.exit !== 'pd' || !Array.isArray(x.pdCrit)) return;
    x.pdCrit.filter(c => !rows.some(r => r.crit === c)).forEach(c => { const ti = t.items.find(i => i[0] === c), m = (t.meta || {})[c] || {}; rows.push({ q: k + 1, crit: c, from: ti ? ti[1] : `${a.title.split(' —')[0]} · Q${k + 1}`, reason: x.pdReason || (ti && ti[2]) || '', by: m.by || x.by || rel.by || '', at: m.at || x.at || rel.at, status: ti ? ti[3] : '', outcome: t.outcomes && t.outcomes[c], session: t.session, who: co1PdWho(L.lid, t.session, L.batch), signOff: t.signOff }); }); });
  const seen = new Set(); return rows.filter(r => { const k = r.crit + '|' + r.from + '|' + r.status; if (seen.has(k)) return false; seen.add(k); return true; });
};

/* ---------- Recall to draft: marking queued for Coordinator release (before direct publication) whose PD criteria weren't chosen ----------
   The existing states are reused: the queued marking (release queue entry) goes back to the Assessor's marking draft, unchanged — RAG,
   feedback, exits, criterion judgements, notes, verification and the PD reasons — and the queue entry is removed. Nothing published
   (Coordinator feedback, earlier releases) is touched; judgement records and the audit history stay. Only the allocated Assessor, in the
   Assessor portal, only while it is still queued (never once released) and only when its PD choice is missing or no longer valid.
   Afterwards it is published the current way (TA-1), which requires a valid PD choice (ta1PubWhy above). */
function pdsRecallWhy(key) {
  if (S.portal !== 'staff') return { deny: 'Queued marking is recalled by the learner\'s allocated Assessor, in the Assessor portal.' };
  if (CAN('mark') !== 'yes') return { deny: 'Only the learner\'s allocated Assessor can recall marking.' };
  const s = r3StaffSub(key); if (!s) return { deny: 'This submission isn\'t in your marking.' };
  const P = relStore()[key];
  if (!P) return { msg: STORE.tas.marked[key] ? 'This marking has been released — it can\'t be recalled. A correction goes through a Data Correction Request.' : 'Nothing of yours is waiting for release on this submission.' };
  if (s.L.status === 'Discontinued') return { msg: 'This learner\'s enrolment is Discontinued — read-only.' };
  const p = pdsProblems(s, tasAsg(s), P.draft);
  if (!p.length) return { msg: 'This marking has valid PD criteria — the Coordinator releases it from the queue.' };
  const d = STORE.tas.drafts[key]; if (d && (Object.keys(d.items || {}).length || d.overall)) return { msg: 'A newer draft already exists for this submission — it can\'t be replaced by the queued marking.' };
  return { s, P, p };
}
const pdsRecallGate = (key, what) => { const g = pdsRecallWhy(key); if (g.deny) { r3Deny(String(key || '—'), what, g.deny, S.portal === 'staff' ? tasLog : S.portal === 'coord' ? cooLog : logA); return null; } if (g.msg) { tasLog('Assessment', String(key || '—'), 'Blocked: ' + what, '—', 'No change', g.msg); toast(g.msg, 'err'); return null; } return g; };
ACT.pdsRecall = el => {
  const key = el && el.dataset && el.dataset.k, g = pdsRecallGate(key, 'recall marking to draft'); if (!g) return false;
  reasonDlg({ title: 'Recall to your draft — ' + esc(g.P.title), ok: 'Recall to draft', label: 'Reason (required)', extra: `<p class="small">${esc(g.P.learner)}: this marking is waiting for Coordinator release, but ${esc(g.p.join('; '))}.</p><p class="small">It comes back to your marking draft exactly as you sent it (feedback, exits, criterion judgements, verification and PD reasons) and leaves the release queue. Coordinator feedback and anything already published stay as they are. Choose the PD criteria, then publish it.</p>`,
    onOk: r => {
      const h = pdsRecallGate(key, 'recall marking to draft'); if (!h) return false;
      STORE.tas.drafts[key] = JSON.parse(JSON.stringify(h.P.draft)); delete relStore()[key]; S.tas.dirty = false;
      tasLog('Assessment', `${h.s.L.name} · ${h.P.title}`, 'Recalled to draft (PD criteria needed)', 'Awaiting Coordinator release', 'Marking draft — with the Assessor', `${r} · ${h.p.join('; ')}`);
      if (STORE.coo) STORE.coo.notifs.unshift({ id: 'cn' + Date.now(), t: 'Release queue: marking recalled', b: `${h.s.L.name} · ${h.P.title} — recalled by ${TME().name} to choose the PD criteria`, at: now().toISOString(), go: 'c-release', unread: true });
      render(); toast('Recalled to your draft — choose the PD criteria, then publish.');
    } });
};
function pdsQueuedNote(s, h) {
  const P = relStore()[s.key], g = pdsRecallWhy(s.key); if (!g.P) return h;
  const note = `<div class="note b-amber pds-recall" role="status">${ic('alert')}<div class="small"><strong>This queued marking can't be released yet:</strong> ${esc(g.p.join('; '))}. Recall it to your draft to choose the PD criteria — your feedback, judgements and evidence come back unchanged. <button class="btn btn-sm" data-act="pdsRecall" data-k="${s.key}">Recall to draft</button></div></div>`;
  const k = h.indexOf('</div></div>'); return P && k >= 0 ? h.slice(0, k + 12) + note + h.slice(k + 12) : note + h;
}

/* ---------- IQA: a PD outcome record for each enrolled learner with completed PD outcomes ----------
   The same read-only record as the seeded learner's ("Professional Discussion outcome", PD outcomes tab), built from what is stored: each
   completed item (not Open) with its criterion, assignment / question, reason and, where recorded, the outcome (result, PD assessor, date,
   notes), the session and its sign-off. A learner with no dated outcome gets no record (nothing is invented). Batch allocation scope
   (iqb-alloc.js) and the sampling / findings model apply unchanged; IQA gets no marking or approval action. */
const pdsDone = i => i && i.status && i.status !== 'Open';
const _livePDS = liveRecords;
liveRecords = function () {
  const out = _livePDS.apply(this, arguments), have = new Set(out.map(r => r.id));
  Object.keys(STORE.worlds || {}).forEach(v => {
    const id = 'L-' + v + '-pd'; if (have.has(id) || (v === 'C' && have.has('L-C-pd'))) return;
    const w = STORE.worlds[v]; if (!w || !w.nvq || !w.me || !w.pd || !Array.isArray(w.pd.items)) return;
    if (!(w.flags && w.flags.admitted) && !(w.signup && w.signup.done)) return;
    const ss = w.pd.session || {}, done = w.pd.items.filter(pdsDone), dated = done.map(i => (i.outcome && i.outcome.at) || null).filter(Boolean).concat(ss.signedAt ? [ss.signedAt] : []).sort();
    if (!done.length || !dated.length) return;
    const last = done.map(i => i.outcome).filter(Boolean).sort((x, y) => (x.at < y.at ? 1 : -1))[0], pr = typeof chProgOf === 'function' ? chProgOf(w) : null;
    const ok_ = i => /Achieved|Met/.test(i.status) && !/Not|Returned/.test(i.status);
    out.push({ id, kind: 'pd', live: true, v, key: w.me.id + '~pd', lid: w.me.id, learner: VNAME(v), programme: w.nvq.title, pv: w.nvq.progVersion || null, pk: pr && pr.level ? 'L' + String(pr.level).replace(/\D/g, '') : '—',
      batch: (typeof chBatchCodeOfW === 'function' && chBatchCodeOfW(w)) || (w.signup && w.signup.batch) || '—', unit: 'PD', module: 'Professional Discussion', title: 'Professional Discussion outcome',
      assessor: (last && last.by) || ss.signedBy || ss.with || '—', round: '—', markedAt: dated[dated.length - 1], exit: done.every(ok_) ? 'Met' : 'Not met', met: done.filter(ok_).length, notMet: done.filter(i => !ok_(i)).length, verified: false, type: 'Knowledge', crit: done.map(i => i.ref),
      pdRows: done.map(i => ({ ref: i.ref, from: i.from || '', reason: i.reason || '', status: i.status, outcome: i.outcome || null, by: i.by || '', at: i.at || null, pv: i.pv || null })), session: { status: ss.status || '', at: ss.at || null, signedBy: ss.signedBy || '', signedAt: ss.signedAt || null, with: ss.with || '' } });
  });
  return out;
};
// The record page: the evidence and history the record holds (read-only)
const _qRecPDS = SCREENS['q-record'];
SCREENS['q-record'] = p => {
  const h = _qRecPDS(p), r = typeof h === 'string' && p && p.id ? recById(p.id) : null; if (!r || r.kind !== 'pd' || !r.pdRows) return h;
  const who = typeof chEff === 'function' ? chEff(r.lid, 'pd') : '', s = r.session || {};
  const card = `<section class="card pds-iqa" aria-labelledby="pds-iqa-h"><h2 id="pds-iqa-h">PD evidence and history</h2>
    <dl class="kv small"><dt>Learner</dt><dd>${esc(r.learner)} · ${esc(r.batch)}</dd><dt>Programme</dt><dd>${esc(r.programme)}${r.pv ? ' · Version ' + esc(r.pv) : ''}</dd><dt>Allocated PD assessor</dt><dd>${esc(who || '—')}</dd>
      <dt>PD session</dt><dd>${s.status ? esc(s.status) + (s.at ? ' · ' + fdt(s.at) : '') : 'Not recorded'}${s.signedBy ? ` · signed off by ${esc(s.signedBy)}${s.signedAt ? ', ' + fdt(s.signedAt) : ''}` : ''}</dd></dl>
    <div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Criterion</th><th>From</th><th>Referred</th><th>Outcome</th></tr></thead><tbody>${r.pdRows.map(x => `<tr data-crit="${esc(x.ref)}"><td><span class="code">${esc(x.ref)}</span></td><td class="small">${esc(x.from || '—')}${x.reason ? `<div class="xs muted">${esc(x.reason)}</div>` : ''}</td><td class="small">${esc(x.by || '—')}${x.at ? '<div class="xs muted">' + fdt(x.at) + '</div>' : ''}</td><td class="small">${chip(x.status, /Achieved/.test(x.status) ? 'green' : 'amber')}${x.outcome ? `<div class="xs">${esc(x.outcome.result)} · ${esc(x.outcome.by)} · ${fdt(x.outcome.at)}${x.outcome.notes ? ' — ' + esc(x.outcome.notes) : ''}</div>` : '<div class="xs muted">Recorded before outcome details were kept</div>'}</td></tr>`).join('')}</tbody></table></div>
    <p class="xs muted">Read-only. IQA samples and records findings here; marking and PD outcomes stay with the Assessor.</p></section>`;
  const k = h.indexOf('<aside class="card q-panel"'); return k < 0 ? h + card : h.slice(0, k) + card + h.slice(k);
};

UXC.push(['PDS','Professional Discussion — the Assessor chooses the criteria (7 Nov 2026)', [
  'When an answer is "Added to PD", the Assessor ticks one or more criteria for the Professional Discussion: the question\'s mapped criteria, or (whole-assessment mapping) the assessment\'s, chosen once under "Whole-assessment criteria". Criteria already achieved and locked, or verified Met in this marking, can\'t be chosen. The Coordinator\'s feedback decides nothing here.',
  'The choice is required and is checked again when the marking is published or released — a choice that is no longer eligible blocks with what to untick; nothing is changed silently. Older unreleased drafts make the choice before publishing.',
  'On release only the chosen criteria join the PD checklist, once per learner, assignment and criterion (several answers referring one criterion share its item); the others keep the Assessor\'s judgement (verified Met → Achieved and locked). Earlier PD items and outcomes are unchanged.',
  'IQA: each learner with completed PD outcomes has a read-only "Professional Discussion outcome" record (version, PD assessor, outcome, session, history), within the IQA\'s batch allocation. Marking queued for Coordinator release without a valid PD choice can be recalled to the Assessor\'s draft (unchanged) and then published. A chosen criterion is bound to the learner\'s pinned version; a missing, ambiguous or re-pinned reference is refused.']]);
