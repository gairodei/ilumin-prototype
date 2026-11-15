/* ============================================================
   Client Feedback 2.0 — D1 Workplace Observation Book (15 Nov 2026; PD-CF2-D* in PROVISIONAL-DECISIONS.md). Loads after cf2-asgmode.js.
   One learner-centred page over the existing observation records (no new programme hierarchy, no new outcome model):
     Assessor → My Students → learner → Observations → Observation Book   (t-obsbook)
     Academic Coordinator → learner → Observations → Observation Book      (c-obsbook)
     Academic Admin / Super Admin / System Admin → Learner → Observation Book (a-obsbook, read-only)
   It shows the learner, programme, pinned version, batch, workplace and permission, the allocated observation assessor, and for each
   required observation event of the version: location, date, the NVQ assessment criteria and the Academy observation criteria (kept
   as separate sets), the records with their draft / signed state, earlier records and follow-ups, and Coordinator feedback.
   Recording stays on the existing record screen (D1 / OBS-1, SRS FR-TA-05): Observed / Not Yet Observed and Competent / Not Yet
   Competent for NVQ and programme Academy criteria, Met / Not yet met with per-criterion evidence for the Criteria Library items.
   Added there: per-criterion observed performance and evidence attachments (attributed, removable only by whoever added them before
   sign-off) for the NVQ and Academy rows; "Save draft" now records who saved and when (the draft is reopened from the Book or the
   Observations list); sign-off freezes those notes and attachments into the report. Locks and Data Correction are unchanged.
   Coordinator feedback is stored separately, attributed "Academic Coordinator", and never changes an Assessor outcome.
   Uploads are simulated (file name, size, who and when). No offline-sync engine is added.
   ============================================================ */
'use strict';

const cf2RecId = (w, o) => (w && w.v ? w.v : chWorldKey(w.me.id)) + '-' + o.id;
const cf2Fb = id => (CF2().obsFb[id] = CF2().obsFb[id] || []);
const cf2Safe = s => String(s).replace(/[^A-Za-z0-9_-]/g, '_');
// Who is looking, and what they may do (view / Coordinator feedback); null when the page is refused
function cf2BookWho(lid) {
  const w = dW(lid); if (!w || !w.me) return null;
  if (S.portal === 'staff') { if (!hasRole('Assessor') || CAN('observations') === 'no') return null; const L = tasLearner(lid); if (!L) return null; return { w, role: 'assessor', obsMe: chEff(lid, 'obs') === chMe() }; }
  if (S.portal === 'coord') { if (!chIsMyBatchLid(lid)) return null; const des = typeof mcOf === 'function' ? mcOf(lid) : null; return { w, role: 'coord', fb: !des || des === CME().name, des }; }
  if (S.portal === 'admin' && (isSA() || (typeof isAca === 'function' && isAca()) || (typeof isSys === 'function' && isSys()))) return { w, role: 'admin' };
  return null;
}
const cf2OutTxt = (o, c) => `${o ? 'Observed' : 'Not Yet Observed'} · ${c ? 'Competent' : 'Not Yet Competent'}`;
function cf2RecRow(w, o, who, ctx) {
  const id = cf2RecId(w, o), dr = STORE.tas.obsDraft[id], fb = cf2Fb(id), r = o.report;
  const draft = o.status === 'Confirmed' ? (dr ? `<span class="xs cf2-draft">Draft ${dr.savedAt ? `saved ${fdt(dr.savedAt)} by ${esc(dr.savedBy)}` : 'started ' + fdt(dr.started) + ' (not saved yet)'}</span>` : '<span class="xs muted">No record started</span>') : '';
  const can = who.role === 'assessor' && who.obsMe;
  const act = o.status === 'Confirmed' && can ? `<button class="btn btn-sm btn-primary" data-go="t-obsrec" data-id="${esc(id)}">${dr ? 'Reopen draft' : 'Start record'}</button>`
    : o.status === 'Completed' && who.role === 'assessor' ? `<button class="btn btn-sm" data-go="t-obsrec" data-id="${esc(id)}">View signed record</button>` : '';
  const follow = r && (r.nvq || []).some(x => !x[2] || !x[3]) || r && (r.ol1 || []).some(x => x.out !== 'Met');
  const res = r ? `<div class="tbl-wrap"><table class="tbl dense cf2-res"><thead><tr><th>Criterion</th><th>Set</th><th>Outcome (Assessor)</th><th>Remarks, performance and evidence</th></tr></thead><tbody>${
    (r.nvq || []).map(x => `<tr data-code="${esc(x[0])}"><td><span class="code">${esc(x[0])}</span><div class="xs muted">${esc(x[1])}</div></td><td>NVQ</td><td>${chip(x[2] ? 'Observed' : 'Not Yet Observed')} ${chip(x[3] ? 'Competent' : 'Not Yet Competent')}</td><td class="small">${cf2CritNotes(r, 'nvq', x[0], x[4])}</td></tr>`).join('')
    + (r.ia || []).map(x => `<tr data-code="${esc(x[0])}"><td><span class="code">${esc(x[0])}</span><div class="xs muted">${esc(x[1])}</div></td><td>Academy (programme)</td><td>${chip(x[2] ? 'Observed' : 'Not Yet Observed')} ${chip(x[3] ? 'Competent' : 'Not Yet Competent')}</td><td class="small">${cf2CritNotes(r, 'ia', x[0], x[4])}</td></tr>`).join('')
    + (r.ol1 || []).map(x => `<tr data-code="${esc(x.code)}"><td><span class="code">${esc(x.code)}</span><div class="xs muted">${esc(x.title)}</div></td><td>Academy (Criteria Library)</td><td>${chip(x.out, x.out === 'Met' ? 'green' : 'amber')}</td><td class="small">${(x.ev || []).map(t => ((x.evidence || {})[t] || []).map(y => esc(y.t || y.name) + ` <span class="xs muted">(${esc(y.by)})</span>`).join('; ')).filter(Boolean).join(' · ') || '—'}</td></tr>`).join('')
  }</tbody></table></div><p class="xs muted">Signed off by ${esc(o.signedBy || o.assessor || '—')}${o.signed ? ', ' + fdt(o.signed) : ''} — locked.${(r.evidence || []).length ? ' Record evidence: ' + r.evidence.map(esc).join(', ') + '.' : ''}</p>` : '';
  const fbH = (fb.length ? `<ul class="list small cf2-fbl">${fb.map(f => `<li class="li"><div class="li-b"><span>${esc(f.text)}</span><span class="xs muted">Academic Coordinator feedback — ${esc(f.by)}, ${fdt(f.at)}${f.crit ? ' · on ' + esc(f.crit) : ''} · not an assessment decision</span></div></li>`).join('')}</ul>` : '')
    + (who.role === 'coord' && who.fb && ['Confirmed', 'Completed'].includes(o.status) ? `<div class="cf2-fbf"><label for="cf2-fb-${cf2Safe(id)}">Coordinator feedback (attributed to you; it doesn't change the Assessor's outcomes)</label><textarea class="textarea" id="cf2-fb-${cf2Safe(id)}" rows="2"></textarea><div class="row"><label class="sr" for="cf2-fbc-${cf2Safe(id)}">About criterion</label><select class="select" id="cf2-fbc-${cf2Safe(id)}"><option value="">Whole observation</option>${cf2EvCodes(ctx, o).map(c => `<option>${esc(c)}</option>`).join('')}</select><button class="btn btn-sm" data-act="cf2ObsFb" data-l="${esc(w.me.id)}" data-r="${esc(id)}">Add feedback</button></div></div>` : '');
  return `<li class="li cf2-rec" data-r="${esc(id)}" data-st="${esc(o.status)}"><div class="li-b"><strong>${o.at ? fdt(o.newAt || o.at) : 'No date'} · ${esc(o.loc || dTxtLoc(o.dLoc || 'workplace'))}</strong><span class="xs muted">Observation assessor ${esc(o.assessor || '—')}${o.postEntered ? ' · post-entered' : ''}${o.reason ? ' · ' + esc(o.reason) : ''}</span>${draft}${res}${follow ? `<span>${chip('Follow-up needed', 'amber')} <span class="xs muted">Criteria not yet observed, competent or met go to a follow-up observation (FR-TA-05-06).</span></span>` : ''}${fbH ? `<div class="cf2-fb"><span class="xs strong">Coordinator feedback</span>${fbH}</div>` : ''}</div><div class="row">${chip(o.status)}${act}</div></li>`;
}
function cf2CritNotes(r, set, code, m) {
  const x = r.cf2 || {}, p = ((x.perf || {})[set] || {})[code], ev = ((x.ev || {})[set + '|' + code] || []);
  return [m ? 'Remark: ' + esc(m) : '', p ? 'Performance: ' + esc(p) : '', ev.length ? 'Evidence: ' + ev.map(e => `${ic('clip', 11)} ${esc(e.name)} <span class="xs muted">(${esc(e.by)}, ${fdt(e.at)})</span>`).join(', ') : ''].filter(Boolean).join('<br>') || '—';
}
const cf2EvCodes = (ctx, o) => { if (!ctx || !o.dEv) return []; const e = ctx.evs.find(x => x.id === o.dEv); if (!e) return []; const c = dEvCrit(ctx, e), lib = ctx.cfg.ol1snap ? (ctx.cfg.ol1snap[ol1Loc(o.dLoc)] || []).map(i => i.code) : []; return c.nvq.concat(o.dLoc === 'office' ? [] : c.ia, lib); };
function cf2BookHtml(lid, who) {
  const w = who.w, ctx = dCtx(w), b = chBatchOfLid(lid), wp = w.workplace || {}, coord = typeof mcOf === 'function' ? mcOf(lid) : null;
  const head = `<section class="card cf2-bookh"><dl class="kv"><dt>Learner</dt><dd>${esc(chFullName(w))} <span class="mono xs">${esc(lid)}</span></dd><dt>Programme</dt><dd>${esc((w.nvq && w.nvq.title) || (ctx && ctx.pr.title) || '—')}</dd><dt>Programme version</dt><dd>${ctx ? 'Version ' + ctx.v + ' (pinned at enrolment)' : w.nvq && w.nvq.progVersion ? 'Version ' + w.nvq.progVersion : '—'}</dd><dt>Batch</dt><dd>${b ? esc(b.code) : '—'}</dd><dt>Workplace</dt><dd>${wp.name ? esc(wp.name) + (wp.address ? ', ' + esc(wp.address) : '') : 'Not entered'} · permission ${chip(wp.perm || 'Not entered')}</dd><dt>Observation assessor</dt><dd>${esc(chEff(lid, 'obs') || 'Not allocated')}</dd><dt>Academic Coordinator</dt><dd>${esc(coord || (b && b.coord) || '—')}</dd></dl>
    <div class="note b-amber">${ic('shield')}<div class="small">No service-user names or identifying details in notes or evidence.</div></div></section>`;
  if (!ctx) {
    const list = (w.observations || []).map(o => cf2RecRow(w, o, who, null)).join('');
    return head + `<section class="card"><h2>Observations</h2><p class="small muted">This learner's programme version has no recorded observation events, so observations use the existing observation form.</p>${list ? `<ul class="list">${list}</ul>` : '<p class="small muted">No observations yet.</p>'}</section>`;
  }
  const evs = ctx.evs.map(e => {
    const st = dState(w, ctx, e), s = dSel(w, e.id), c = dEvCrit(ctx, e), office = s && s.loc === 'office', lib = ctx.cfg.ol1snap && s ? ctx.cfg.ol1snap[ol1Loc(s.loc)] || [] : [];
    const tree = (w.tree || []).flatMap(u => u.mods.flatMap(m => m.los.flatMap(l => l.crit))), nv = code => tree.find(x => x.code === code) || { d: '' };
    const recs = dRecs(w, ctx, e).slice().sort((x, y) => new Date(y.at || 0) - new Date(x.at || 0));
    const nvqL = c.nvq.map(code => `<li class="li" data-code="${esc(code)}"><div class="li-b"><span><span class="code">${esc(code)}</span> ${esc(nv(code).d)}</span>${nv(code).evReq || nv(code).ev ? `<span class="xs muted">Evidence: ${esc(nv(code).evReq || nv(code).ev)}</span>` : ''}</div>${chip(nv(code).st || 'Not Started')}</li>`).join('');
    const iaL = (office ? [] : c.ia).map(code => { const x = (ctx.cfg.ia || []).find(i => i.code === code) || {}; return `<li class="li" data-code="${esc(code)}"><div class="li-b"><span><span class="code">${esc(code)}</span> ${esc(x.title || x.d || '')}</span><span class="xs muted">Programme Academy standard</span></div></li>`; }).join('')
      + lib.map(i => `<li class="li" data-code="${esc(i.code)}"><div class="li-b"><span><span class="code">${esc(i.code)}</span> ${esc(i.title)}</span><span class="xs muted">${esc(i.catCode)} — ${esc(i.instr)}</span><span class="xs">Evidence: ${esc((i.ev || []).map(OL1_EVL).join(', '))}${(i.req || []).length ? ' · required: ' + esc(i.req.map(OL1_EVL).join(', ')) : ''}</span></div></li>`).join('');
    return `<section class="card cf2-obe" data-e="${esc(e.id)}"><div class="row-b"><h2>${esc(e.name)}</h2>${chip(st.t, st.tone)}</div>
      <p class="small">${s ? `Location: <strong>${esc(dTxtLoc(s.loc))}</strong> (chosen by ${esc(s.by)})` : 'Location not chosen yet — the learner\'s Academic Coordinator chooses it.'} · Permitted: ${esc(dLocs(ctx, e).map(dTxtLoc).join(', '))} · Evidence permitted: ${esc(n5EvTxt({ types: e.ev }))}</p>
      <div class="grid-2 cf2-sets"><div class="cf2-set" data-set="nvq"><h3>NVQ assessment criteria</h3><p class="xs muted">Qualification competency — from the curriculum of Version ${ctx.v}.</p><ul class="list small">${nvqL || '<li class="li small muted">None in this observation.</li>'}</ul></div>
      <div class="cf2-set" data-set="academy"><h3>Academy observation criteria</h3><p class="xs muted">Internal quality standards — not qualification competency.${office ? ' Academy office: the office\'s Criteria Library items only.' : ''}</p><ul class="list small">${iaL || `<li class="li small muted">${s ? 'None for this location.' : 'Shown once the location is chosen.'}</li>`}</ul></div></div>
      <h3>Records</h3>${recs.length ? `<ul class="list">${recs.map(o => cf2RecRow(w, o, who, ctx)).join('')}</ul>` : '<p class="small muted">No observation proposed yet. The observation assessor proposes a date once the location is ready.</p>'}</section>`;
  }).join('');
  return head + evs;
}
const cf2BookPage = (lid, crumbs) => {
  const who = cf2BookWho(lid);
  if (!who) {
    const who0 = S.portal === 'staff' ? TME().name : S.portal === 'coord' ? CME().name : (ADMIN.me || {}).name;
    logA('Observations', lid || '—', 'Blocked: open Observation Book', '—', '—', `${who0 || '—'} isn't allocated to this learner or their role doesn't include observations`);
    return `${pageA('Observation Book', '')}<div class="lockpage"><div class="lock-ic">${ic('lock', 30)}</div><h2>You can't open this Observation Book</h2><p class="muted">It is open to the learner's Assessor, Academic Coordinator and the Academy's administrators. This attempt has been logged.</p></div>`;
  }
  const ro = who.role === 'admin' ? `<div class="note b-grey">${ic('lock')}<div class="small">Read-only. Observations are recorded and signed off by the learner's observation assessor; administrators inspect the record.</div></div>` : who.role === 'coord' ? `<div class="note b-blue">${ic('info')}<div class="small">You can read the observation records${who.fb ? ' and add attributed Coordinator feedback' : ` (feedback is added by the learner's designated Coordinator, ${esc(who.des)})`}. Only the observation assessor records outcomes and signs off.</div></div>` : who.obsMe ? '' : `<div class="note b-grey">${ic('info')}<div class="small">You can read this book. Observations are recorded by the learner's observation assessor (${esc(chEff(lid, 'obs') || '—')}).</div></div>`;
  return `${pageA('Observation Book — ' + esc(chFullName(who.w)), 'Workplace observation record for this learner', '', crumbs)}${ro}${cf2BookHtml(lid, who)}`;
};
SCREENS['t-obsbook'] = p => cf2BookPage(p && p.id, [['My Students', 't-students'], [esc(chFullName(dW(p && p.id) || { me: { first: '', last: '' } }) || 'Learner'), 't-students', p && p.id], ['Observation Book']]);
SCREENS['c-obsbook'] = p => cf2BookPage(p && p.id, [['Learner', 'c-learner', p && p.id], ['Observation Book']]);
SCREENS['a-obsbook'] = p => cf2BookPage(p && p.id, [['Learners', 'a-learners'], ['Learner', 'a-learner', p && p.id], ['Observation Book']]);
if (typeof T_ROUTE_CAP !== 'undefined') T_ROUTE_CAP['t-obsbook'] = 'observations';
if (typeof ACA_ROUTES !== 'undefined') ACA_ROUTES.add('a-obsbook');
if (typeof RG_ANAV !== 'undefined') RG_ANAV.add('a-obsbook');
if (typeof ROUTE_PURPOSE !== 'undefined') { ROUTE_PURPOSE['t-obsbook'] = 'A learner\'s workplace observation book: criteria, records, drafts and sign-off.'; ROUTE_PURPOSE['c-obsbook'] = 'A learner\'s observation records, with Coordinator feedback.'; ROUTE_PURPOSE['a-obsbook'] = 'A learner\'s observation records (read-only).'; }

/* ---------- Entry points ---------- */
const cf2BookBtn = (route, lid) => `<section class="card cf2-bookcta"><div class="row-b"><div><h2>Observation Book</h2><p class="small muted">The learner's observation criteria, records, drafts and sign-off in one place.</p></div><button class="btn btn-primary" data-go="${route}" data-id="${esc(lid)}">Open Observation Book</button></div></section>`;
const _tlvCF2 = tasLearnerView;
tasLearnerView = function (id, t) { const h = _tlvCF2.apply(this, arguments), L = tasLearner(id); return t === 'observations' && L && !L.short && dW(id) && hasRole('Assessor') && typeof h === 'string' ? h.replace(/(<\/div>)\s*$/, '$1') + cf2BookBtn('t-obsbook', id) : h; };
const _cLearnerCF2 = SCREENS['c-learner'];
SCREENS['c-learner'] = p => { const h = _cLearnerCF2(p); return p && p.tab === 'observations' && p.id && dW(p.id) && typeof h === 'string' && chIsMyBatchLid(p.id) ? h + cf2BookBtn('c-obsbook', p.id) : h; };
const _aLearnerCF2 = SCREENS['a-learner'];
SCREENS['a-learner'] = p => { const h = _aLearnerCF2(p); if (!p || !p.id || (p.tab && p.tab !== 'overview') || typeof h !== 'string') return h; const w = dW(p.id); if (!w || !w.nvq || !cf2BookWho(p.id)) return h; return h + cf2BookBtn('a-obsbook', p.id).replace('Open Observation Book', 'Open Observation Book (read-only)'); };
// The record screen links back to the learner's book
const _recCF2 = SCREENS['t-obsrec'];
SCREENS['t-obsrec'] = p => {
  const h = _recCF2(p), o = p && p.id ? obById(p.id) : null; if (!o || typeof h !== 'string' || !o.lid || /lockpage/.test(h) && !/Observation report/.test(h)) return h;
  const back = `<div class="row cf2-recback"><button class="btn btn-sm" data-go="t-obsbook" data-id="${esc(o.lid)}">${ic('book', 14)}Observation Book — ${esc(o.learner)}</button></div>`;
  const r = o.src && o.src.report, fb = cf2Fb(o.id), extra = o.status === 'Completed' && r ? `<section class="card cf2-recnotes"><h2>Per-criterion remarks, performance and evidence</h2><div class="tbl-wrap"><table class="tbl dense"><tbody>${(r.nvq || []).concat(r.ia || []).map(x => `<tr><td><span class="code">${esc(x[0])}</span></td><td class="small">${cf2CritNotes(r, (r.ia || []).includes(x) ? 'ia' : 'nvq', x[0], x[4])}</td></tr>`).join('')}</tbody></table></div>${fb.length ? `<h3>Coordinator feedback</h3><ul class="list small">${fb.map(f => `<li class="li"><div class="li-b"><span>${esc(f.text)}</span><span class="xs muted">${esc(f.by)} (Academic Coordinator), ${fdt(f.at)}${f.crit ? ' · ' + esc(f.crit) : ''}</span></div></li>`).join('')}</ul>` : ''}</section>` : '';
  return back + h + extra;
};

/* ---------- Recording: per-criterion observed performance and evidence (NVQ and programme Academy rows) ---------- */
const cf2RecOk = () => { const id = (S.params || {}).id; return id && typeof g2ObsWhy === 'function' ? g2ObsWhy(id, 'sign') : 'No observation'; };
const _rowCF2 = dCritRow;
dCritRow = function (set, code, desc, label, req, types, v) {
  const h = _rowCF2.apply(this, arguments), dr = curDr(); if (!dr || typeof h !== 'string') return h;
  const k = set + '|' + code, ev = ((dr.cev || {})[k] || []), sid = cf2Safe(set + '-' + code), me = TME().name;
  const add = `<label for="cf2-p-${sid}">Observed performance and context for ${esc(code)}</label><textarea class="textarea cf2-perf" id="cf2-p-${sid}" rows="2" data-oninput="cf2Perf" data-s="${set}" data-c="${esc(code)}">${esc(v.p || '')}</textarea>
    <div class="cf2-cev">${ev.length ? `<ul class="list small">${ev.map((x, i) => `<li class="li"><div class="li-b">${ic('clip', 13)} ${esc(x.name)} <span class="xs muted">${esc(x.by)} · ${fdt(x.at)}</span></div>${x.by === me ? `<button class="btn btn-sm btn-ghost" data-act="cf2CEvRm" data-s="${set}" data-c="${esc(code)}" data-k="${i}" aria-label="Remove ${esc(x.name)}">Remove</button>` : ''}</li>`).join('')}</ul>` : '<p class="xs muted">No evidence attached to this criterion.</p>'}<label class="sr" for="cf2-e-${sid}">Attach evidence to ${esc(code)}</label><input class="input" type="file" id="cf2-e-${sid}" multiple data-onchange="cf2CEv" data-s="${set}" data-c="${esc(code)}"></div>`;
  return h.replace(/<\/div>\s*$/, add + '</div>');
};
INP.cf2Perf = el => { if (cf2RecOk()) return; const d = curDr(); if (!d) return; const s = d[el.dataset.s][el.dataset.c] = d[el.dataset.s][el.dataset.c] || {}; s.p = el.value; };
INP.cf2CEv = el => {
  const why = cf2RecOk(), o = curObs(); if (why) { tasLog('Observations', o ? o.learner : '—', 'Blocked: attach observation evidence', '—', '—', why); toast(why, 'err'); el.value = ''; return; }
  const d = curDr(); if (!d) return; const k = el.dataset.s + '|' + el.dataset.c, at = now().toISOString();
  ((d.cev = d.cev || {})[k] = d.cev[k] || []).push(...[...(el.files || [])].map(f => ({ name: f.name, size: f.size || 0, by: TME().name, at }))); render();
};
ACT.cf2CEvRm = el => {
  const why = cf2RecOk(); if (why) { toast(why, 'err'); return; } const d = curDr(), k = el.dataset.s + '|' + el.dataset.c, list = d && d.cev && d.cev[k], x = list && list[+el.dataset.k]; if (!x) return;
  if (x.by !== TME().name) { toast('Only the person who attached this evidence can remove it before sign-off.', 'err'); return; } list.splice(+el.dataset.k, 1); render();
};
// Save draft: recorded (who and when); reopened from the Observation Book or the Observations list
const _saveCF2o = ACT.orSave;
ACT.orSave = el => {
  const id = (S.params || {}).id, o = id ? obById(id) : null, d = id ? STORE.tas.obsDraft[id] : null;
  if (!o || !d) return _saveCF2o(el);
  const why = typeof g2ObsWhy === 'function' ? g2ObsWhy(id, 'sign') : ''; if (why) { tasLog('Observations', o.learner, 'Blocked: save observation draft', '—', '—', why); toast(why, 'err'); return false; }
  const at = now().toISOString(); d.savedAt = at; d.savedBy = TME().name; (CF2().obsDraftLog[id] = CF2().obsDraftLog[id] || []).push([at, d.savedBy]);
  tasLog('Observations', o.learner, 'Observation draft saved', '—', 'Draft', `${o.evName || o.scope || ''} · ${fdt(o.at)}`);
  toast(S.offline ? 'Saved on this device — will sync when online.' : 'Draft saved. Reopen it from the learner\'s Observation Book or from Observations.');
};
// Sign-off: the per-criterion performance notes and attachments are frozen into the report (the existing rules decide whether it signs)
const _signCF2 = ACT.orSign;
ACT.orSign = el => {
  const id = (el && el.dataset && el.dataset.id) || (S.params || {}).id, o = id ? obById(id) : null, m0 = MODAL, r = _signCF2(el);
  if (!o || !o.src || !MODAL || MODAL === m0) return r;
  const a = MODAL.actions.find(x => x.label === 'Sign off and lock'); if (!a || a._cf2) return r; const f = a.fn; a._cf2 = true;
  a.fn = (...x) => {
    const d = STORE.tas.obsDraft[id] || {}, keep = JSON.parse(JSON.stringify({ nvq: d.nvq || {}, ia: d.ia || {}, cev: d.cev || {}, savedAt: d.savedAt || null, savedBy: d.savedBy || null }));
    const res = f(...x), rec = o.src;
    if (res !== false && rec.status === 'Completed' && rec.report && !rec.report.cf2) {
      const perf = { nvq: {}, ia: {} }; ['nvq', 'ia'].forEach(s => Object.entries(keep[s]).forEach(([c, v]) => { if (v && v.p) perf[s][c] = v.p; }));
      rec.report.cf2 = Object.freeze({ perf, ev: keep.cev, drafts: (CF2().obsDraftLog[id] || []).slice() });
      rec.signedBy = rec.signedBy || TME().name;
    }
    return res;
  };
  return r;
};

/* ---------- Coordinator feedback: attributed, separate from the Assessor's outcomes ---------- */
ACT.cf2ObsFb = el => {
  const lid = el.dataset.l, rid = el.dataset.r, who = cf2BookWho(lid), w = who && who.w, o = w && (w.observations || []).find(x => cf2RecId(w, x) === rid);
  const no = why => { logA('Observations', `${w ? chFullName(w) : lid} (${lid})`, 'Blocked: Coordinator observation feedback', '—', '—', why); toast(why, 'err'); return false; };
  if (!who || who.role !== 'coord') return no('Only the learner\'s Academic Coordinator adds Coordinator feedback here.');
  if (!who.fb) return no(`Feedback is added by the learner's designated Coordinator (${who.des}).`);
  if (!o || !['Confirmed', 'Completed'].includes(o.status)) return no('Feedback is added to a confirmed or signed-off observation.');
  // (page fields, not a dialog: mval reads only inside the dialog)
  const pv = s => ((document.getElementById(s) || {}).value || '').trim(), t = pv('cf2-fb-' + cf2Safe(rid)), c = pv('cf2-fbc-' + cf2Safe(rid)); if (!t) { fieldErr('#cf2-fb-' + cf2Safe(rid), 'Write your feedback first'); return false; }
  const ctx = dCtx(w); if (c && !cf2EvCodes(ctx, o).includes(c)) return no('That criterion isn\'t part of this observation.');
  cf2Fb(rid).push({ by: CME().name, role: 'Academic Coordinator', at: now().toISOString(), text: t, crit: c || null });
  logA('Observations', `${chFullName(w)} (${lid})`, 'Coordinator observation feedback added', '—', c ? `On ${c}` : 'Whole observation', t.slice(0, 120));
  if (typeof tasNotifyW === 'function') tasNotifyW('Coordinator feedback on an observation', `${chFullName(w)} — ${fd(o.at)}${c ? ' · ' + c : ''}`, 't-obsbook.' + lid);
  render(); toast('Feedback added. The Assessor\'s outcomes are unchanged.');
};

UXC.push(['CF2-D', 'Client Feedback 2.0 — Workplace Observation Book (15 Nov 2026)', [
  'Assessor → My Students → learner → Observations → Open Observation Book: the learner, programme and pinned version, batch, workplace and permission, observation assessor and Coordinator; per required observation the location, date, NVQ assessment criteria and Academy observation criteria (separate sets), records with draft / signed state, follow-ups and Coordinator feedback.',
  'The record screen adds observed performance and evidence attachments per NVQ / Academy criterion (attributed). Save draft records who saved and when; the draft is reopened from the book. Sign-off (unchanged rules and lock) freezes those notes and attachments into the report.',
  'Coordinators (learner → Observations → Observation Book) read the records and add attributed feedback that never changes an outcome; Academic, Super and System Administrators read the book (read-only).']]);
