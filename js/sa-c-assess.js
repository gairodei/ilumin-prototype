/* ============================================================
   SA-FINAL C — Super Admin feedback SA-02 (Create observation) and SA-01 (Assignments & Criteria Mapping) (3 Nov 2026;
   PD-SAF-C-* in PROVISIONAL-DECISIONS.md). Loads last.
   SA-02 The legacy free-text "Create observation entry" dialog (academic.js §6.14 + the AC3 learner list) recorded a hard-coded
       criterion of another qualification ("U306 3.1"), the legacy shared IA-1…IA-5 list and another learner's workplace, with no
       location type or observation event — bypassing the Coordinator's location choice and Academy-office approval. It is replaced:
       - a learner whose pinned programme version has observation events (D1 / OBS-1): read-only oversight — each event's status,
         the Coordinator's location choice, the NVQ qualification criteria and the Academy standards (library categories) with their
         source, evidence permitted, who is responsible for the next step, and a link to it. The admin creates nothing here: the
         Coordinator chooses the location, the observation assessor proposes the date (no accepted override rule — client question).
       - a learner whose version has no events (legacy fixture only — configured before N5): the earlier admin entry (MR-08) is kept,
         but built from that learner's own record — their programme's observation criteria, their own workplace (read-only),
         workplace only, their allocated observation assessor — and re-checked on confirm.
       The list no longer appends a hard-coded "+ IA-1–IA-4": scope and location come from each record; records without an event or
       location type are shown as recorded and labelled. Signed records, fees, Confirm/Cancel and waivers are unchanged.
   SA-01 Mapping stays manual. a-assignments now explains Curriculum → Unit → Learning Outcome → Criterion → Question (the CBX/AA-FINAL
       guide), shows where the columns come from (programme, programme version, unit, module, Learning Outcomes) with links to the
       curriculum, says that mapping is manual and who last changed it, marks the client demo's example mappings as set up for the
       demo, labels the header chip "Assignment version", reuses the per-criterion coverage on Coverage analytics, and drops the
       prototype wording. Published assignments and history are unchanged.
   #23 Legacy fixture: NV-L2's stored curriculum is the Level 3 structure (U301–U307). Records depend on it, so it is labelled, not rewritten.
   ============================================================ */
'use strict';

/* ================= SA-02 Observation entry ================= */
const SAC_MOD = 'Observations';
const sacLearners = () => (typeof ac3ObsLearners === 'function' ? ac3ObsLearners() : []);
const sacW = v => (v && STORE.worlds && STORE.worlds[v]) || null;
const sacPerm = w => (w && w.workplace && w.workplace.perm) || 'Not entered';
const sacWp = w => (w && w.workplace && String(w.workplace.name || '').trim()) || '';
function sacWho(w) { const lid = w.me.id, b = chBatchOfLid(lid); return { coord: (typeof mcOf === 'function' && mcOf(lid)) || (b && b.coord) || '', asr: chEff(lid, 'obs') || '', b }; }
const sacPermTxt = w => { const p = sacPerm(w); return p === 'Not entered' ? 'Not entered — the learner hasn\'t entered a workplace yet' : String(p).replace('Permission ', ''); };
// #23: the legacy fixture's Level 2 programme holds the Level 3 curriculum (labelled, never rewritten)
const sacL2Legacy = pr => !!pr && !fxClient() && pr.id === 'NV-L2' && ((typeof cbTree === 'function' && cbTree(pr)) || []).some(u => /^U3/.test(u.code));
const SAC_L2_NOTE = 'Legacy demonstration data: this Level 2 programme\'s stored curriculum is the Level 3 structure (U301–U307). Existing assignments, observations and records refer to it, so it is kept as recorded and not rewritten.';

// Who acts next on one event (from the D1 state; never decided here)
function sacNext(w, e, st, who) {
  const A = who.asr || 'not allocated yet', C = who.coord || 'not assigned yet', r = st.req, p = sacPerm(w);
  if (st.k === 'done') return { t: 'Nothing — signed off', by: who.asr || '—', role: 'Observation assessor' };
  if (st.k === 'active') return st.rec && st.rec.status === 'Confirmed' ? { t: 'Record the observation and sign it off', by: A, role: 'Observation assessor' } : { t: 'Respond to the proposed date', by: chFullName(w) + (st.rec && st.rec.locType === 'office' ? '' : ' or the workplace contact'), role: 'Learner' };
  if (st.k === 'ready') return { t: 'Propose a date', by: A, role: 'Observation assessor' };
  if (st.k === 'nosel' || st.k === 'refused') return { t: st.k === 'refused' ? 'Choose the location again' : 'Choose the location', by: C, role: 'Academic Coordinator' };
  if (r && r.source === 'learner' && r.status === 'Pending approval') return { t: 'Decide the learner\'s Academy-office request', by: C, role: 'Academic Coordinator' };
  if (r && r.status === 'Awaiting consent') return { t: 'Agree to the Academy-office observation', by: chFullName(w), role: 'Learner' };
  if (r && r.status === 'Pending approval') return { t: 'Approve the Academy-office observation', by: 'An Academic Admin', role: 'Approvals Queue', q: true };
  if (/permission/.test(st.t)) return p === 'Not entered' ? { t: 'Enter the workplace details', by: chFullName(w), role: 'Learner' } : { t: 'Grant workplace permission', by: 'The workplace contact', role: 'asked by the learner\'s secure link' };
  return { t: 'Save the location choice again', by: C, role: 'Academic Coordinator' };
}
// The criteria of one event, for the given locations, each with its source (from the pinned version only)
function sacCrit(ctx, e, locs) {
  const c = dEvCrit(ctx, e), nv = n5NvqOk(ctx.pr, ctx.cfg), ia = (ctx.cfg.ia || []).filter(x => x.status === 'Active'), snap = ctx.cfg.ol1snap;
  const li = (code, t, src) => `<li data-code="${esc(code)}"><span class="code">${esc(code)}</span> ${esc(t || '')}<div class="xs muted">${src}</div></li>`;
  const nvq = c.nvq.map(code => { const x = nv.find(y => y.code === code) || {}; return li(code, x.d, `Source: qualification curriculum — ${esc([x.unit, x.lo].filter(Boolean).join(' '))}${x.loTitle ? ' ' + esc(x.loTitle) : ''} · Evidence requirement: ${esc(x.req || '—')}`); });
  const own = locs.includes('workplace') ? c.ia.map(code => { const x = ia.find(y => y.code === code) || {}; return li(code, x.title || x.t, `Source: this programme's Academy criteria (IA list), Version ${ctx.v} · workplace only`); }) : [];
  const lib = locs.map(l => { const its = snap ? snap[ol1Loc(l)] || [] : null;
    return `<p class="xs sac-cl">${ic('layers', 12)} <strong>Academy standards — ${esc(dTxtLoc(l))}</strong> <span class="muted">(Observation Criteria Library)</span></p>${its === null ? '<p class="xs muted">No library criteria were recorded for this version (published before the library).</p>' : its.length ? `<ul class="sac-crit">${its.map(i => li(i.code, i.title, `Source: ${esc(i.catCode)} ${esc(i.catName)} v${i.catV} · Evidence: ${esc(ol1EvTxt(i))}`)).join('')}</ul>` : `<p class="xs muted">None for the ${esc(dTxtLoc(l).toLowerCase())} in this version.</p>`}`; }).join('');
  return `<p class="xs sac-cl">${ic('book', 12)} <strong>NVQ qualification criteria</strong> <span class="muted">(both locations)</span></p>${nvq.length ? `<ul class="sac-crit">${nvq.join('')}</ul>` : '<p class="xs muted">None in this observation.</p>'}
    ${own.length ? `<p class="xs sac-cl"><strong>Academy criteria (programme IA list)</strong></p><ul class="sac-crit">${own.join('')}</ul>` : ''}${lib}
    <p class="xs muted">Evidence the assessor may record for this observation: ${esc(n5EvTxt({ types: e.ev }))}.</p>`;
}
function sacEvCard(w, ctx, e, who) {
  const st = dState(w, ctx, e), s = dSel(w, e.id), nx = sacNext(w, e, st, who), locs = dLocs(ctx, e), recs = dRecs(w, ctx, e);
  const loc = s ? `${esc(dTxtLoc(s.loc))} <span class="xs muted">— chosen by ${esc(s.by)}, ${fdt(s.at)}</span>` : `Not chosen yet <span class="xs muted">(permitted: ${esc(locs.map(dTxtLoc).join(', ') || 'none')})</span>`;
  return `<section class="card flat sac-ev" data-e="${e.id}"><div class="row-b"><h3>${esc(e.name)}</h3>${chip(st.t, st.tone)}</div>
    <dl class="kv"><dt>Location</dt><dd>${loc}</dd><dt>Next step</dt><dd>${esc(nx.t)} — <strong>${esc(nx.by)}</strong> <span class="xs muted">(${esc(nx.role)})</span>${nx.q ? ' <button class="btn btn-sm" data-go="a-queue">Open the Approvals Queue</button>' : ''}</dd>
    ${recs.length ? `<dt>Records</dt><dd>${recs.map(o => `${chip(o.status)} ${fdt(o.newAt || o.at)} · ${esc(o.assessor || '—')}`).join('<br>')}</dd>` : ''}</dl>
    ${s ? '' : '<p class="xs muted">The criteria depend on the location the Coordinator chooses:</p>'}${sacCrit(ctx, e, s ? [s.loc] : locs)}</section>`;
}
// One learner, read-only (the dialog and the learner record)
function sacOversight(v) {
  const w = sacW(v), ctx = dCtx(w); if (!ctx) return '';
  const who = sacWho(w), lid = w.me.id;
  return `<div class="sac-ov" data-v="${esc(v)}"><dl class="kv"><dt>Programme</dt><dd>${esc(ctx.pr.title)} — Version ${ctx.v} <span class="xs muted">(pinned at enrolment)</span></dd>
    <dt>Academic Coordinator</dt><dd>${esc(who.coord || 'Not assigned yet')} <span class="xs muted">— chooses each location</span></dd><dt>Observation assessor</dt><dd>${esc(who.asr || 'Not allocated yet')} <span class="xs muted">— proposes the date, records and signs off</span></dd>
    <dt>Workplace</dt><dd>${esc(sacWp(w) || 'Not entered yet')}</dd><dt>Workplace permission</dt><dd>${chip(sacPerm(w), sacPerm(w) === 'Granted' ? 'green' : 'amber')} <span class="xs muted">${esc(sacPermTxt(w))}</span></dd></dl>
    <div class="note b-blue sac-ovnote">${ic('info')}<div class="small">Super Admin and Academic Admin oversee observations here; they don't choose the location or the date. ${sacPerm(w) === 'Granted' ? '' : 'A workplace observation can\'t be scheduled until the workplace grants permission; the Coordinator may choose the Academy office instead, which needs the learner\'s agreement and Academic Admin approval.'}</div></div>
    ${ctx.evs.map(e => sacEvCard(w, ctx, e, who)).join('')}
    <div class="row"><button class="btn btn-sm" data-go="a-learners" data-id="${esc(lid)}" data-tab="observations">Learner record — Observations</button><button class="btn btn-sm btn-ghost" data-go="a-programmes" data-id="${esc(ctx.pr.id)}" data-tab="events">Programme observation settings</button></div></div>`;
}

// Legacy fixture: a learner without observation events keeps the earlier admin entry, from their own record
const sacPreCrit = v => withW(v, () => allCrit()).filter(c => c.type === 'Observation');
const sacPreIa = w => (w.iaCriteria || []).map(([c, d]) => ({ code: c, d }));
function sacPreForm(v) {
  const w = sacW(v), who = sacWho(w), crit = sacPreCrit(v), ia = sacPreIa(w), p = sacPerm(w), pr = chProgOf(w);
  return `<div class="note b-amber sac-pre">${ic('alert')}<div class="small"><strong>Recorded under the earlier rules.</strong> This learner's programme version has no observation events, so there is no Coordinator location choice to follow. An entry here is a workplace observation, proposed with the learner's own criteria. An Academy-office observation needs the learner's Academy-office request and its approval.</div></div>
    ${sacL2Legacy(pr) ? `<p class="xs muted sac-l2">${ic('info', 12)} ${esc(SAC_L2_NOTE)}</p>` : ''}
    <dl class="kv"><dt>Programme</dt><dd>${esc(w.nvq.title)}${w.nvq.version ? ' — ' + esc(w.nvq.version) : ' <span class="xs muted">(version not recorded)</span>'}</dd><dt>Observation assessor</dt><dd>${esc(who.asr || 'Not allocated')}</dd><dt>Location</dt><dd>Workplace — ${esc(sacWp(w) || 'not entered by the learner')}</dd><dt>Workplace permission</dt><dd>${chip(p, p === 'Granted' ? 'green' : 'amber')}</dd></dl>
    ${p === 'Granted' ? '' : `<div class="note b-amber">${ic('alert')}<div class="small">Workplace permission is "${esc(p)}" — creation is blocked until it's Granted.</div></div>`}
    <div class="field"><label for="no-d">Date and time</label><input class="input" type="datetime-local" id="no-d" value="${D(12, '08:30').slice(0, 16)}"></div>
    <fieldset class="field" style="border:0;padding:0"><legend class="lbl">NVQ criteria — from ${esc(w.nvq.title)}</legend>${crit.length ? crit.map((c, k) => `<label class="check small"><input type="checkbox" class="sac-nvq" value="${esc(c.code)}" ${k < 2 ? 'checked' : ''}>${esc(c.code)} — ${esc(c.d)}</label>`).join('') : '<p class="small muted">This learner\'s curriculum has no observation criteria.</p>'}<span class="hint">Only this learner's own observation criteria can be chosen.</span></fieldset>
    ${ia.length ? `<div class="card flat"><span class="eyebrow">Academy criteria attached to this learner's programme (as on the assessor's proposal)</span><ul class="small">${ia.map(c => `<li>${esc(c.code)} — ${esc(c.d)}</li>`).join('')}</ul></div>` : ''}`;
}
function sacPreCreate(v) {
  const w = sacW(v), ent = w ? `${VNAME(v)} (${w.me.id})` : '—';
  const no = (why, msg) => { logA(SAC_MOD, ent, 'Blocked: create observation entry', '—', '—', why); const p = $('#modal-root #no-p'); if (p) p.innerHTML = `<div class="note b-red">${ic('lock')}<div class="small"><strong>Observation creation blocked:</strong> ${esc(msg)}</div></div>`; else toast(msg, 'err'); return false; };
  if (!w || !sacLearners().includes(v)) return no('Learner not available', 'choose a learner from the list.');
  if (dCtx(w)) return no('Observation events apply', 'this learner\'s observations follow their programme version\'s events — the Coordinator chooses the location and the observation assessor proposes the date.');
  const p = sacPerm(w); if (p !== 'Granted') return no(`Workplace permission is "${p}"`, `workplace permission is "${p}". It must be Granted first.`);
  const loc = sacWp(w); if (!loc) return no('No workplace recorded', 'the learner hasn\'t entered a workplace.');
  const asr = sacWho(w).asr; if (!asr) return no('No observation assessor allocated', 'no observation assessor is allocated — set one in the batch\'s Assessors panel.');
  const own = sacPreCrit(v).map(c => c.code), nvq = $$('#modal-root .sac-nvq:checked').map(x => x.value);
  if (!nvq.length) return no('No NVQ criterion chosen', 'choose at least one NVQ criterion.');
  const bad = nvq.filter(c => !own.includes(c)); if (bad.length) return no('Criteria not in the learner\'s curriculum: ' + bad.join(', '), `${bad.join(', ')} isn't one of this learner's observation criteria.`);
  const dv = mval('#no-d'), t = dv ? new Date(dv + ':00Z') : null; if (!t || isNaN(t)) return no('No date', 'choose the date and time.');
  const at = t.toISOString(), ia = sacPreIa(w).map(c => c.code), scope = nvq.join(', ') + (ia.length ? ' · ' + ia.join(', ') : '');
  if ((w.observations || []).some(o => o.saPre && o.at === at && o.scope === scope && o.status === 'Proposed')) { toast('This observation entry already exists.', 'info'); return; } // a replayed confirm
  let n = 10 + w.observations.length, id = 'o' + n; while (w.observations.some(o => o.id === id)) id = 'o' + (++n);
  const o = { id, at, loc, locType: 'work', assessor: asr, scope, saNvq: nvq, saIa: ia, saPre: true, by: ADMIN.me.name, status: 'Proposed' };
  w.observations.unshift(o); notifyLearner(v, 'Schedule', 'Observation proposed', `${o.assessor} proposed an observation on ${fdt(o.at)}.`, 'observations');
  logA(SAC_MOD, ent, 'Observation proposed', '—', `${fdt(o.at)} · ${loc} · ${scope}`, 'Admin entry — programme version without observation events'); render(); toast('Observation created. The learner and workplace can now respond.');
}

// "Create observation entry": oversight for event learners, the earlier entry otherwise
const sacOptTxt = v => { const w = sacW(v); return `${VNAME(v)} — ${dCtx(w) ? 'observation events' : 'earlier rules'} · permission: ${sacPerm(w)}`; };
const sacBody = v => (dCtx(sacW(v)) ? sacOversight(v) : sacPreForm(v));
const sacAct = v => (dCtx(sacW(v)) ? 'Open the learner\'s observations' : 'Create (Proposed)');
const sacModal = (ls, v) => `<div class="field"><label for="no-l">Learner</label><select class="select" id="no-l" data-onchange="sacObsL">${ls.map(x => `<option value="${esc(x)}" ${x === v ? 'selected' : ''}>${esc(sacOptTxt(x))}</option>`).join('')}</select></div><div id="sac-ob">${sacBody(v)}</div><span id="no-p"></span>`;
ACT.newObs = el => {
  const ls = sacLearners(), want = el && el.dataset && el.dataset.v, v = ls.includes(want) ? want : ls[0];
  if (!v) { toast('No learner has an NVQ enrolment with a workplace record yet.', 'info'); return; }
  openModal({ title: 'Observation entry', sub: 'Location: the Academic Coordinator · date and record: the observation assessor', size: 'lg', body: sacModal(ls, v),
    actions: [{ label: 'Close' }, { label: sacAct(v), cls: 'btn-primary', id: 'sac-go', fn: () => {
      const x = mval('#no-l'), w = sacW(x);
      if (w && sacLearners().includes(x) && dCtx(w)) { closeModal(); go('a-learners', { id: w.me.id, tab: 'observations' }); return; }
      return sacPreCreate(x);
    } }] });
};
INP.sacObsL = el => { if (!MODAL) return; const ls = sacLearners(), v = ls.includes(el.value) ? el.value : ls[0]; MODAL.body = sacModal(ls, v); const a = MODAL.actions.find(x => x.id === 'sac-go'); if (a) a.label = sacAct(v); renderModal(); };
// MR-08: the same rule as before (Academic Admin / Super Administrator), re-checked on confirm
g1Guard('newObs', 'Observations', 'create an observation entry', () => g1SaAca() ? '' : G1_WHY.obs, () => '—');

// The list: scope and location from each record (was a hard-coded "+ IA-1–IA-4" on every workplace row) — called by admin-b.js
function sacObsLoc(o) {
  if (o.locType === 'office') return `<span class="small">${chip('Academy office', 'blue')} ${chOfficeTxt(o)}</span>`;
  return `<span class="small">${chip('Workplace', 'outline')} ${esc(o.loc || '—')}${o.locType || o.dEv ? '' : '<br><span class="xs muted sac-pre-loc">Recorded before location rules</span>'}</span>`;
}
function sacObsScope(o) {
  if (o.dEv) {
    const snap = typeof ol1SnapOf === 'function' ? ol1SnapOf(o.dPid, o.dV) : null, lib = snap ? (snap[ol1Loc(o.dLoc)] || []).map(i => i.code) : [];
    return `<span class="small">NVQ: <span class="mono">${esc(o.scope || '—')}</span>${(o.dIa || []).length ? ` · Academy: <span class="mono">${esc(o.dIa.join(', '))}</span>` : ''}${lib.length ? ` · Library: <span class="mono">${esc(lib.join(', '))}</span>` : ''}<br><span class="xs muted">${esc(o.dEvName || o.dEv)} · Version ${esc(String(o.dV))}</span></span>`;
  }
  if (o.saPre) return `<span class="small">NVQ: <span class="mono">${esc((o.saNvq || []).join(', '))}</span>${(o.saIa || []).length ? ` · Academy: <span class="mono">${esc(o.saIa.join(', '))}</span>` : ''}<br><span class="xs muted">Admin entry — programme version without observation events</span></span>`;
  return `<span class="small">${esc(o.scope || '—')}${o.locType === 'office' ? ' (NVQ only)' : ''}<br><span class="xs muted">As recorded</span></span>`;
}
// Required observation events of every learner (oversight), below the records
function sacEvRows() { return sacLearners().flatMap(v => { const w = sacW(v), ctx = dCtx(w); if (!ctx) return []; const who = sacWho(w); return ctx.evs.map(e => ({ v, w, ctx, e, who, st: dState(w, ctx, e), s: dSel(w, e.id) })); }); }
function sacEvTable() {
  const rows = sacEvRows(); if (!rows.length) return '';
  const crit = r => { const c = dEvCrit(r.ctx, r.e), snap = r.ctx.cfg.ol1snap, lib = r.s && snap ? (snap[ol1Loc(r.s.loc)] || []).map(i => i.code) : []; return `NVQ <span class="mono">${esc(c.nvq.join(', ') || '—')}</span>${r.s ? (lib.length ? ` · Library <span class="mono">${esc(lib.join(', '))}</span>` : '') : ' · <span class="muted">Academy standards follow the location</span>'}`; };
  return `<section class="card sac-evs"><div class="row-b"><h2>Required observations by learner</h2>${chip(plural(rows.length, 'event'), 'blue')}</div><p class="small muted">From each learner's pinned programme version. The Academic Coordinator chooses each location; the observation assessor proposes the date and records the observation. This page oversees them — it doesn't make those choices.</p>
    <div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Learner</th><th>Programme version</th><th>Observation</th><th>Location</th><th>Criteria</th><th>Status</th><th>Next step</th><th><span class="sr">Actions</span></th></tr></thead><tbody>${rows.map(r => { const nx = sacNext(r.w, r.e, r.st, r.who);
      return `<tr data-v="${esc(r.v)}" data-e="${r.e.id}"><td>${esc(VNAME(r.v))}<div class="xs muted">Permission: ${esc(sacPerm(r.w))}</div></td><td class="small">${esc(r.ctx.pr.title)} — Version ${r.ctx.v}</td><td class="small">${esc(r.e.name)}</td><td class="small">${r.s ? esc(dTxtLoc(r.s.loc)) : '<span class="muted">Not chosen yet</span>'}</td><td class="xs">${crit(r)}</td><td>${chip(r.st.t, r.st.tone)}</td><td class="small">${esc(nx.t)} — <strong>${esc(nx.by)}</strong></td><td><button class="btn btn-sm" data-act="newObs" data-v="${esc(r.v)}">Details</button></td></tr>`; }).join('')}</tbody></table></div></section>`;
}
const _soaSAC = SCREENS['a-observations'];
SCREENS['a-observations'] = function (p) {
  let h = _soaSAC.apply(this, arguments); if (p && p.tab && p.tab !== 'list') return h;
  h = h.replace(/(data-act="newObs">[^]*?)Create observation entry<\/button>/, '$1Observation entry</button>');
  return h + sacEvTable(); // below the records (the records table stays the page's first table)
};
// The learner record's Observations tab: the same oversight for event learners (their workplace may not be entered yet)
const _lObsSAC = lObs;
lObs = function (L, w) {
  const v = w && (w.v || chWorldKey(w.me.id)); if (!w || !dCtx(w) || !v) return _lObsSAC.apply(this, arguments);
  const hist = (w.observations || []);
  return `<section class="card sac-rec"><h2>Required observations</h2>${sacOversight(v).replace(/<div class="row"><button class="btn btn-sm" data-go="a-learners"[^]*?<\/button>/, '<div class="row">')}</section>
    <section class="card"><h2>Observation records</h2>${hist.length ? `<ul class="list small">${hist.map(o => `<li class="li"><div class="li-b"><strong>${fdt(o.newAt || o.at)}</strong><span>${sacObsScope(o)}</span><span class="xs muted">${esc(o.assessor || '—')}</span></div>${chip(o.status)}</li>`).join('')}</ul>` : '<p class="small muted">No observation proposed or recorded yet.</p>'}<button class="btn btn-sm" data-go="a-observations">All observations</button></section>`;
};

/* ================= SA-01 Assignments & Criteria Mapping ================= */
// The client demo build maps one question per assignment as an example: recorded here so the screen can say so
if (typeof cdBuild === 'function') {
  const _cdSAC = cdBuild;
  cdBuild = function () {
    const r = _cdSAC.apply(this, arguments);
    try { const pr = cdPr(); if (pr) s2Defs().filter(d => cbAsgPid(d) === pr.id).forEach(d => { d.saDemo = { crit: {} }; d.qs.forEach(q => { d.saDemo.crit[q.id] = q.crit.slice(); }); }); } catch (e) { /* the demo build reports its own errors */ }
    return r;
  };
}
const sacAsgPr = d => { const id = cbAsgPid(d); return id ? cbPr(id) : null; };
const sacAsgV = (d, pr) => d.pv || (pr && !pr.chNew ? pr.version : undefined);
const sacPvTxt = a => { const d = a && (a.def || (a.id && s2Def(a.id))); return d && d.qs ? cbAsgVerTxt(d) : '—'; };
const sacLastMap = d => ADMIN.audit.find(a => a.module === 'Assignments' && a.entity === d.title && /^Mapping changed/.test(a.action)) || null;
const SAC_GUIDE_HERE = 'This screen sets up steps 5–6, on the criteria of the programme version shown below (Course Builder → Curriculum & Outcomes).';
const sacGuide = (open, here) => aafaGuide('assessments').replace('You are setting up steps 5–6 here, on the criteria from Section 2.', here || SAC_GUIDE_HERE).replace('<details class="aafa-guide card">', `<details class="aafa-guide card sac-guide"${open ? ' open' : ''}>`);
const SAC_MANUAL = 'Mapping is manual: a person ticks each box in the Criteria mapping grid — nothing is mapped automatically. A new question starts with no criteria, and the assignment can\'t be published until every question is mapped. A question can cover several criteria; the Assessor judges each one separately. Every change is recorded in the audit.';
// Where the columns come from: programme → version → unit → module → Learning Outcomes → criteria → this assignment's questions
function sacAsgSrc(d) {
  const pr = sacAsgPr(d), v = sacAsgV(d, pr), uc = s2UnitCode(d.unit), mk = +((/Module (\d+)/.exec(d.unit || '') || [])[1] || 0);
  if (!pr) return `<section class="card sac-src"><h3>Where these criteria come from</h3><p class="small">This assignment's programme couldn't be identified from its record ("${esc(d.programme || '—')}"), so its criteria can't be traced to a curriculum. The criteria already mapped are kept as recorded.</p><button class="btn btn-sm" data-go="a-programmes">Programmes</button></section>`;
  const tree = (typeof cbTree === 'function' && cbTree(pr, v)) || [], u = tree.find(x => x.code === uc), qn = aafaQNums(d), by = {};
  d.qs.filter(q => q.status === 'Active').forEach(q => aafaDefCrits(q).forEach(c => (by[c] = by[c] || []).push(qn[q.id])));
  const verTxt = d.pv ? `Version ${d.pv}` : `Version not recorded — the columns use ${v ? 'Version ' + v : 'the version the curriculum shows'}`;
  const link = `<button class="btn btn-sm" data-go="a-programmes" data-id="${esc(pr.id)}" data-tab="structure">Open the curriculum</button><button class="btn btn-sm btn-ghost" data-go="a-programmes" data-id="${esc(pr.id)}" data-tab="assessments">Course Builder — Assessments (coverage)</button>`;
  const kv = `<dl class="kv"><dt>Programme</dt><dd>${esc(pr.title)} <span class="xs muted">(${esc(pr.id)})</span></dd><dt>Programme version</dt><dd>${esc(verTxt)}</dd><dt>Unit</dt><dd>${u ? `${esc(u.code)} ${esc(u.title)}` : esc(uc || '—')}</dd>${u && mk && u.mods[mk - 1] ? `<dt>Module</dt><dd>Module ${mk} — ${esc(u.mods[mk - 1].title)}</dd>` : ''}</dl>`;
  const l2 = sacL2Legacy(pr) ? `<p class="xs muted sac-l2">${ic('info', 12)} ${esc(SAC_L2_NOTE)}</p>` : '';
  if (!u) return `<section class="card sac-src"><h3>Where these criteria come from</h3>${kv}${l2}<p class="small">${esc(uc || 'The target unit')} isn't in ${esc(pr.title)} ${esc(v ? 'Version ' + v : '')}'s curriculum, so no criteria can be listed. Check the target unit on the Details tab, or add the unit in the curriculum.</p><div class="row">${link}</div></section>`;
  const mods = u.mods.filter(m => m.status !== 'Retired'), rows = mods.flatMap((m, k) => (m.los || []).filter(l => l.status !== 'Retired').map(lo => {
    const kn = critKind(lo.type || 'Knowledge') === 'Knowledge', cs = (lo.crit || []).filter(c => c.status !== 'Retired');
    return `<tr data-lo="${esc(m.code + ' ' + lo.code)}"><td class="small">Module ${k + 1}${k + 1 === mk ? ' <span class="xs muted">(this assignment)</span>' : ''}</td><td class="small"><strong>${esc(lo.code)}</strong> ${esc(lo.title || '')}<div class="xs muted">${kn ? 'Knowledge — mapped to assignment questions' : `${esc(lo.type)} — assessed by observation, not here`}</div></td><td class="small">${cs.length ? cs.map(c => `<div data-c="${esc(c.code)}"><span class="mono">${esc(c.code)}</span> ${esc(c.d)} → ${kn ? (by[c.code] ? `<strong>${esc(by[c.code].join(', '))}</strong>` : '<span class="aafa-gap">not mapped in this assignment</span>') : `<span class="muted">${ic('lock', 11)} observation</span>`}</div>`).join('') : '<span class="muted">No criteria yet</span>'}</td></tr>`;
  })).join('');
  const know = mods.some(m => (m.los || []).some(l => l.status !== 'Retired' && critKind(l.type || 'Knowledge') === 'Knowledge' && (l.crit || []).some(c => c.status !== 'Retired')));
  return `<section class="card sac-src"><h3>Where these criteria come from</h3>${kv}${l2}
    <p class="xs muted sac-chain">Curriculum → Unit → Learning Outcome → Assessment criterion → Question. The grid's columns are every criterion of ${esc(u.code)} in this programme version.</p>
    ${rows ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Module</th><th>Learning Outcome</th><th>Criteria → questions of this assignment</th></tr></thead><tbody>${rows}</tbody></table></div>` : ''}
    ${know ? '' : `<p class="small aafa-gap">${esc(u.code)} has no knowledge criteria in this version yet — add a Knowledge Learning Outcome with criteria in the curriculum before questions can be mapped.</p>`}<div class="row">${link}</div></section>`;
}
function sacManual(d) {
  const last = sacLastMap(d), demo = d.saDemo && d.saDemo.crit ? Object.entries(d.saDemo.crit).filter(([, c]) => c.length) : [], qn = aafaQNums(d);
  const same = demo.every(([q, c]) => { const x = d.qs.find(y => y.id === q); return x && JSON.stringify(x.crit) === JSON.stringify(c); });
  return `<div class="note b-blue sac-manual">${ic('info')}<div class="small"><p><strong>${esc(SAC_MANUAL)}</strong>${last ? ` Last mapping change: ${esc(last.actor)}${last.role ? ` (${esc(last.role)})` : ''}, ${fdt(last.at)}.` : ' No mapping change has been recorded yet.'}</p>
    ${demo.length ? `<p class="sac-demo">Client demo: ${demo.map(([q, c]) => `${esc(qn[q] || q)} → <span class="mono">${esc(c.join(', '))}</span>`).join('; ')} ${demo.length > 1 ? 'were' : 'was'} set up when the demo was built, as an example for this demonstration — not an automatic rule${same ? '' : ' (changed since)'}. Change it in the grid like any other mapping.</p>` : ''}</div></div>`;
}
const _asgEdSAC = asgEditor;
asgEditor = function (id, t) {
  const h = _asgEdSAC.apply(this, arguments), d = s2Def(id); if (!d || !d.qs) return h;
  const k = ['details', 'questions', 'mapping', 'extensions'].includes(t) ? t : 'details', dv = document.createElement('div'); dv.innerHTML = h;
  dv.querySelectorAll('.page-h .typebadge').forEach(b => { if (/^Version \d+$/.test(b.textContent.trim())) b.textContent = 'Assignment ' + b.textContent.trim().toLowerCase(); });
  const reach = dv.querySelector('.s2-reach .small');
  if (reach) reach.innerHTML = reach.innerHTML.replace(/It reached (.+?) with full data in this prototype \(worlds C and D and newly signed-up learners\) and the assessor's marking\. Other batches show it in the admin and Coordinator views only — this is a prototype limit, not a fault\./,
    (m, n) => fxClient() ? `It reached ${n} in these batches; their assessor marks the submissions.` : `It reached ${n} with full data in these batches; their assessor marks the submissions. Other batches show it in the admin and Coordinator views only.`);
  const st = dv.querySelector('.subtabs'), pr = sacAsgPr(d), v = sacAsgV(d, pr);
  const line = `<p class="small sac-pvline">${ic('layers', 13)} Criteria from <strong>${esc(pr ? pr.title : d.programme || '—')}</strong> — ${esc(d.pv ? 'Programme version ' + d.pv : 'programme version not recorded' + (v ? ` (columns use Version ${v})` : ''))} · ${esc(d.unit || '—')} · <span class="typebadge">Assignment version ${d.version}</span></p>`;
  const extra = k === 'mapping' ? sacGuide(true) + sacManual(d) + sacAsgSrc(d) : k === 'questions' ? sacGuide(false) + line : line;
  if (st) st.insertAdjacentHTML('afterend', extra);
  return dv.innerHTML;
};
// The mapping preview pointed at a per-criterion table that only the builder had; Coverage analytics now has it too
const _mapSAC = s2Mapping;
s2Mapping = function () { return _mapSAC.apply(this, arguments).replace('(another assignment may cover them — see Criteria coverage in the assignments list)', '(another assignment may cover them — see Coverage analytics on the Assignments list)'); };
const _covSAC = coverage;
coverage = function () {
  const h = _covSAC.apply(this, arguments); if (!fxClient()) return h;
  const ps = (ADMIN.programmes || []).filter(p => p.status !== 'Retired' && cbAsgOf(p).length && cbAsgTreeOf(p).length);
  return h + `<p class="small muted sac-cov">${ic('info', 13)} Per criterion: which assignment questions cover each criterion, from the people who mapped them (nothing is mapped automatically).</p>` + ps.map(p => aafaCoverage(p).replace('<h3>Criteria coverage (read-only)</h3>', `<h3>Criteria coverage — ${esc(p.title)} (read-only)</h3>`)).join('');
};
// The list: the guide and the manual-mapping note above the assignments
const _sasgSAC = SCREENS['a-assignments'];
SCREENS['a-assignments'] = function (p) {
  const h = _sasgSAC.apply(this, arguments); if (p && (p.id || p.tab)) return h;
  const dv = document.createElement('div'); dv.innerHTML = h; const ph = dv.querySelector('.page-h');
  const x = `<div class="note b-blue sac-manual">${ic('info')}<div class="small"><strong>${esc(SAC_MANUAL)}</strong> Open an assignment and choose Criteria mapping to see where its criteria come from.</div></div>${sacGuide(false, 'Assignments set up steps 5–6, on the criteria of their own programme version (Course Builder → Curriculum & Outcomes).')}`;
  if (ph) ph.insertAdjacentHTML('afterend', x); else dv.insertAdjacentHTML('afterbegin', x);
  return dv.innerHTML;
};
// The publish dialog's prototype wording
const _pubSAC = ACT.pubAsg;
ACT.pubAsg = function () {
  const m0 = MODAL, r = _pubSAC.apply(this, arguments);
  if (MODAL && MODAL !== m0 && typeof MODAL.body === 'string' && /prototype limit/.test(MODAL.body)) {
    MODAL.body = MODAL.body.replace(/ Other batches show it in the admin and Coordinator views only \(prototype limit\)\./, fxClient() ? '' : ' Other batches show it in the admin and Coordinator views only.');
    if (fxClient()) MODAL.body = MODAL.body.replace(/ learners? with full data/g, m => m.replace(' with full data', '')).replace('Learners with full data in these batches', 'Learners in these batches');
    renderModal();
  }
  return r;
};
// #23 in the builder's curriculum
const _panelsSAC = cbPanels;
cbPanels = function (pr, sec) {
  const r = _panelsSAC.apply(this, arguments); if (sec !== 'curriculum' || !sacL2Legacy(pr) || !Array.isArray(r) || !r.length) return r;
  return r.map((p, i) => (i ? p : [p[0], p[1], function () { return `<div class="note b-amber sac-l2">${ic('info')}<div class="small">${esc(SAC_L2_NOTE)}</div></div>` + p[2].apply(this, arguments); }]));
};

/* ---------- Records ---------- */
UXC.push(['SA-FINAL C', 'Observation entry and assignment criteria mapping (3 Nov 2026)', [
  'Observations: "Observation entry" shows, for a learner on observation events, each event\'s status, the Coordinator\'s location choice, the NVQ qualification criteria and Academy standards with their source, the evidence permitted, who acts next and a link — it creates nothing. Learners without events (legacy fixture) keep the earlier entry, built from their own record. The list shows each record\'s own scope; the hard-coded "+ IA-1–IA-4" is gone.',
  'Assignments & Criteria Mapping: the curriculum guide, the programme version and unit/module/Learning Outcome source of the columns, a note that mapping is manual (and who last changed it), the client demo\'s example mappings labelled, "Assignment version" on the chip, per-criterion coverage on Coverage analytics; the prototype wording is gone.']]);
