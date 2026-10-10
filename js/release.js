/* ============================================================
   Final decisions G6.3 — only the Academic Coordinator releases feedback
   Assessor: "Send to Coordinator for release" (all marking validations unchanged) → the submission is
   "Awaiting Coordinator release" and read-only for the assessor. Nothing changes for the learner.
   Coordinator: Release queue (list + read-only marking view), "Release to learner" and "Release selected".
   On release every learner-visible effect happens together (feedback boxes, status, resubmission boxes
   with the deadline counted from the release date, Added to PD, gap analysis, notification).
   No auto-release and no escalation; Academic Admin and Super Admin dashboards show "Awaiting release"
   counts per batch; the Super Admin can release with a reason. Loads after every portal file.
   ============================================================ */
'use strict';

const relStore = () => (STORE.tas.pending = STORE.tas.pending || {});
const relPending = () => Object.values(relStore());
const relKeyOfWorld = (v, aid) => STORE.worlds[v].me.id + '~' + aid;

/* ---------- Assessor: send for release ---------- */
function sendForRelease(s, a, d) {
  const at = now(), its = markable(a), offs = {};
  its.forEach(q => { const x = d.items[q.id]; if (x.exit === 'resub') offs[q.id] = Math.round(+x.days); }); // the assessor's resubmission window in days, counted from the release date
  relStore()[s.key] = { key: s.key, draft: JSON.parse(JSON.stringify(d)), by: TME().name, tasV: S.tas.v, sentAt: at.toISOString(), offs, learner: s.L.name, lid: s.L.lid, v: s.L.v || null, batch: s.L.batch.code, batchLabel: s.L.batch.label, aid: a.id, title: a.title, round: s.round, live: !!s.live };
  delete STORE.tas.drafts[s.key]; S.tas.dirty = false;
  tasLog('Assessment', `${s.L.name} · ${a.title}`, 'Sent to Coordinator for release', s.status, 'Awaiting Coordinator release', d.overall || '');
  if (STORE.coo) STORE.coo.notifs.unshift({ id: 'cn' + Date.now(), t: 'Release queue: feedback waiting', b: `${s.L.name} · ${a.title} — sent by ${TME().name}`, at: at.toISOString(), go: 'c-release', unread: true });
  render(); toast('Sent to the Coordinator for release. The learner sees nothing new until it is released.');
}
ACT.mkRelease = (_old => el => {
  const s = tasSubs(true).find(x => x.key === el.dataset.k); _old(el);
  if (!MODAL || !/Release feedback/.test(MODAL.title)) return; // blocked by validation — keep the existing message
  const a = tasAsg(s), d = dft(s.key);
  MODAL.title = 'Send to Coordinator for release?';
  MODAL.body = MODAL.body.replace(' will receive:', ' will receive, once the Coordinator releases it:').replace('The learner is notified and verified outcomes update competency straight away.', 'Nothing changes for the learner until the Coordinator releases it. The resubmission deadline is counted from the release date.') + `<div class="note b-amber">${ic('lock')}<div class="small"><strong>You won\'t be able to edit this marking after you send it.</strong> It stays read-only until the Coordinator releases it.</div></div>`;
  MODAL.actions = [{ label: 'Cancel' }, { label: 'Send to Coordinator for release', cls: 'btn-primary', fn: () => sendForRelease(s, a, d) }];
  renderModal();
})(ACT.mkRelease);

/* ---------- Release (Coordinator, or Super Admin with a reason) ---------- */
function releaseNow(key, how) {
  const P = relStore()[key]; if (!P) return false;
  const keepV = S.tas.v, keepRoute = S.route, keepParams = S.params, keepPortal = S.portal, rel = now();
  try {
    S.tas.v = P.tasV;
    const s = tasSubs(true).find(x => x.key === key); if (!s) return false;
    const a = tasAsg(s), d = P.draft;
    const rel0 = Date.parse(rel.toISOString().slice(0, 10)); markable(a).forEach(q => { const x = d.items[q.id]; if (x && x.exit === 'resub') x.deadline = new Date(rel0 + P.offs[q.id] * DAY).toISOString().slice(0, 10); });
    delete relStore()[key];
    const _r = render, _t = toast; render = () => {}; toast = () => {};
    try { releaseFeedback(s, a, d); } finally { render = _r; toast = _t; }
  } finally { S.tas.v = keepV; S.route = keepRoute; S.params = keepParams; S.portal = keepPortal; }
  const line = `${P.learner} · ${P.title}`;
  if (how && how.super) logA('Assessment Records', line, 'Feedback released (Super Admin override)', 'Awaiting Coordinator release', 'Released', how.reason);
  else cooLog('Release queue', line, 'Feedback released to learner', 'Awaiting Coordinator release', 'Released', '');
  return true;
}
// The learner notification on release reads "Feedback released"
const _nlRel = notifyLearner;
notifyLearner = function (v, cat, title, body, go) { if (cat === 'Assignments' && (title === 'Feedback returned' || title === 'Resubmission requested') && /returned feedback on/.test(body)) { title = title === 'Resubmission requested' ? 'Feedback released — resubmission requested' : 'Feedback released'; body = body.replace('returned feedback on', 'feedback is ready on'); } return _nlRel(v, cat, title, body, go); };

/* ---------- Assessor views: "Awaiting Coordinator release", read-only ---------- */
const _decRel = decorate;
decorate = function (r) { r = _decRel(r); if (relStore()[r.key]) { r.relPending = relStore()[r.key]; r.toMark = false; r.staffStatus = 'Awaiting Coordinator release'; } return r; };
const _tMarkRel = SCREENS['t-mark'];
SCREENS['t-mark'] = p => { const h = _tMarkRel(p), P = relStore()[p.id]; return P ? `<div class="note b-blue" role="status">${ic('send')}<div><strong>Awaiting Coordinator release</strong> — sent ${fdt(P.sentAt)}. Your marking is read-only. The learner sees nothing new until the Coordinator releases it.</div></div>` + h : h; };

/* ---------- Coordinator: Release queue ---------- */
const myRel = () => { const codes = myBatches().map(b => b.code); return relPending().filter(P => codes.includes(P.batch)); };
const relCount = () => (typeof myBatches === 'function' && S.portal === 'coord' ? myRel().length : 0);
if (!CNAV.some(n => n[0] === 'c-release')) CNAV.splice(CNAV.findIndex(n => n[0] === 'c-submissions') + 1, 0, ['c-release', 'Release queue', 'send']);
SCREENS['c-release'] = (p) => {
  if (p.id) return relDetail(p.id);
  // Honour the header "Batch in scope" like every other Coordinator page; the sidebar badge stays the all-batches total
  const scope = scopeBatches().map(b => b.code), all = myRel(), rows = all.filter(P => scope.includes(P.batch));
  return `${pageA('Release queue', 'Marked work waiting for you to release to the learner. You can\'t change marks or feedback; you can add your own plain feedback on the submission.')}
  ${rows.length < all.length ? `<div class="note b-blue" role="status">${ic('filter')}<div class="small">Showing ${rows.length} of ${all.length} for the batch in scope. <button class="linklike" data-act="cooScopeAll">Show all my batches</button></div></div>` : ''}
  <div class="note b-grey">${ic('info')}<div class="small">Learners see nothing new until you release. There is no automatic release. On release the learner gets the feedback, the new status, any resubmission boxes (the deadline is counted from the release date) and a notification, all at once.</div></div>
  ${dt({ id: 'crel', name: 'Release queue', rows, rid: P => P.key, empty: 'Nothing waiting for release', noExport: true, cols: [{ k: 'learner', l: 'Learner', h: P => `<a href="#c-release.${P.key}" data-go="c-release" data-id="${P.key}" class="strong">${esc(P.learner)}</a>`, v: P => P.learner }, { k: 'batch', l: 'Batch', v: P => P.batchLabel }, { k: 'title', l: 'Assignment' }, { k: 'round', l: 'Round', h: P => `<span class="code">${P.round}</span>`, v: P => P.round }, { k: 'by', l: 'Assessor' }, { k: 'sentAt', l: 'Sent', h: P => fdt(P.sentAt), v: P => P.sentAt }, { k: 'wait', l: 'Days waiting', h: P => daysChip(Math.max(0, -daysTo(P.sentAt))), s: P => -daysTo(P.sentAt), v: P => String(Math.max(0, -daysTo(P.sentAt))) }],
    bulk: [{ l: 'Release selected', fn: ids => relConfirm(ids) }], act: P => `<button class="btn btn-sm" data-go="c-release" data-id="${P.key}">View</button> <button class="btn btn-sm btn-primary" data-act="relOne" data-k="${P.key}">Release to learner</button>` })}`;
};
function relSummary(P) {
  const s = withRelV(P, () => tasSubs(true).find(x => x.key === P.key)), a = s ? tasAsg(s) : null; if (!a) return '<p class="small muted">Submission not found.</p>';
  return `${inkLegend()}<div class="paper">${markable(a).map(q => { const x = P.draft.items[q.id] || {}, last = (q.rounds || [])[q.rounds.length - 1], ink = INK(Math.max(0, (q.rounds || []).length - 1)); return `<div class="q"><div class="q-h"><span class="q-n">Q${a.qs.indexOf(q) + 1}</span><div class="q-t">${esc(q.text)} <span class="code">${q.crit}</span></div></div>
    <div class="round ${ink}"><span class="r-lbl">Learner's answer · ${esc(P.round)}</span><div class="r-ans">${last ? last.html : '<p class="small">Answer on file (cohort record).</p>'}</div></div>
    <div class="fb fb-${x.rag || 'N'}"><div class="fb-h">${x.rag ? rag(x.rag) : ''} Assessor feedback · ${esc(P.by)}</div><div>${esc(x.fb || (x.exit === 'resub' ? x.corrections : 'Feedback recorded.'))}</div></div>
    <p class="small"><strong>Exit:</strong> ${x.exit === 'resub' ? `Resubmission — window ${P.offs[q.id]} days from release (due ${fd(new Date(Date.parse(now().toISOString().slice(0, 10)) + P.offs[q.id] * DAY).toISOString())} if released today)` : x.exit === 'pass' ? 'Complete / Passed' : x.exit === 'pd' ? 'Added to PD' : '—'} · <strong>Criterion ${q.crit}:</strong> ${esc(x.met || '—')}${x.verified ? ` ${ic('lock', 12)} verified` : ''}</p></div>`; }).join('')}
    <p class="small"><strong>Overall comment:</strong> ${esc(P.draft.overall || '—')}</p></div>`;
}
const withRelV = (P, f) => { const k = S.tas.v; S.tas.v = P.tasV; try { return f(); } finally { S.tas.v = k; } };
function relDetail(key) {
  const P = relStore()[key]; if (!P) return `<div class="lockpage"><h1>Already released</h1><p class="muted">This feedback has been released to the learner.</p><button class="btn btn-primary" data-go="c-release">Back to the release queue</button></div>`;
  if (!myRel().some(x => x.key === key)) return `<div class="lockpage"><div class="lock-ic">${ic('lock', 30)}</div><h1>Not your batch</h1><p class="muted">Only the Coordinator of this learner's batch can release.</p><button class="btn btn-primary" data-go="c-release">Back to the release queue</button></div>`;
  return `${pageA(esc(P.learner) + ' · ' + esc(P.title), `${esc(P.batchLabel)} · marked by ${esc(P.by)} · sent ${fdt(P.sentAt)}`, `<button class="btn btn-primary" data-act="relOne" data-k="${key}">Release to learner</button>`, [['Release queue', 'c-release'], [P.learner]])}
  <div class="note b-grey">${ic('lock')}<div class="small">Read-only — you can't change marks or feedback. <button class="linklike" data-go="c-sub" data-id="${key}">Add your own coordinator feedback</button></div></div>${relSummary(P)}`;
}
function relConfirm(keys) {
  const list = keys.map(k => relStore()[k]).filter(Boolean); if (!list.length) return;
  openModal({ title: list.length > 1 ? `Release ${list.length} items to learners?` : 'Release to learner?', body: `<p class="small">${list.length > 1 ? 'Each learner' : esc(list[0].learner)} will see the feedback now, all at once: the assessor's feedback on every answer, the new status, any resubmission boxes, any items Added to PD, the updated gap analysis and a notification. ${list.some(P => Object.keys(P.offs).length) ? `Resubmission deadlines start today (${fd(now().toISOString())}).` : ''}</p><div class="note b-amber">${ic('alert')}<div class="small"><strong>This can\'t be undone.</strong> Released feedback stays with the learner.</div></div><ul class="list small">${list.map(P => `<li class="li"><div class="li-b"><strong>${esc(P.learner)}</strong><span class="muted">${esc(P.title)} · ${esc(P.round)} · ${Object.keys(P.offs).length ? Object.keys(P.offs).length + ' resubmission item(s), due ' + Math.max(...Object.values(P.offs)) + ' days after release' : 'no resubmission'}</span></div></li>`).join('')}</ul>`,
    actions: [{ label: 'Cancel' }, { label: list.length > 1 ? `Release ${list.length} items` : 'Release to learner', cls: 'btn-primary', fn: () => { let n = 0; list.forEach(P => { if (releaseNow(P.key)) n++; }); const st = dts('crel'); if (st) st.sel = []; setTimeout(() => { go('c-release'); toast(`${n} item${n === 1 ? '' : 's'} released. Learners have been notified.`); }, 0); } }] });
}
ACT.relOne = el => relConfirm([el.dataset.k]);
// Super Admin: release with a reason (dashboard card)
ACT.relSuper = el => { const P = relStore()[el.dataset.k]; reasonDlg({ title: 'Release feedback — ' + esc(P.learner), ok: 'Release to learner', label: 'Reason (required)', body: '<p class="small">Feedback normally waits for the batch Coordinator. As Super Administrator you can release it; your reason is logged.</p>', onOk: r => { releaseNow(P.key, { super: true, reason: r }); render(); toast('Released. The learner has been notified.'); } }); };
function relCard(superMode) {
  const by = {}; relPending().forEach(P => (by[P.batch] = by[P.batch] || []).push(P)); const keys = Object.keys(by);
  return `<section class="card"><div class="card-h"><h2>${ic('send')}Awaiting release</h2><span class="xs muted">Read-only · released by each batch's Coordinator</span></div>${keys.length ? `<ul class="list small">${keys.map(b => `<li class="li"><div class="li-b"><strong>${esc(by[b][0].batchLabel)} <span class="mono xs">${b}</span></strong><span class="muted">${by[b].length} waiting · oldest ${Math.max(...by[b].map(P => -daysTo(P.sentAt)))} days</span>${superMode ? `<span>${by[b].map(P => `<button class="btn btn-sm" data-act="relSuper" data-k="${P.key}">Release ${esc(P.learner)} (override)</button>`).join(' ')}</span>` : ''}</div>${chip(by[b].length + ' awaiting', 'blue')}</li>`).join('')}</ul>` : '<p class="small muted">Nothing is waiting for release.</p>'}</section>`;
}
['a-dashboard', 'k-dashboard'].forEach(r => { const f = SCREENS[r]; if (f) SCREENS[r] = p => { const h = f(p); if (r === 'a-dashboard' && typeof isSys === 'function' && isSys()) return h; const sup = r === 'a-dashboard' && isSA(); return h.replace(/(<div class="grid-2">)/, relCard(sup) + '$1'); }; });
// Admin Assessment Records: internal status "Awaiting release"
if (typeof allSubmissions === 'function') { const _as = allSubmissions; allSubmissions = function () { return _as().map(s => relStore()[relKeyOfWorld(s.v, s.a.id)] ? { ...s, status: 'Awaiting release' } : s); }; }
