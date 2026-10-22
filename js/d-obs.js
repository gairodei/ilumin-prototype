/* ============================================================
   Batch D1 — the learner-specific observation journey (22 Oct 2026; PD-D-01…09 in PROVISIONAL-DECISIONS.md).
   For a learner whose pinned programme version (w.nvq.progVersion, fixed at enrolment) has a recorded observation
   configuration with required observation events (N5a / CB6), observations run per event:
   1. The learner's assigned Academic Coordinator chooses the location of each event, from the locations the event and the
      version permit. The learner (and the observation assessor) are told.
   2. Workplace: scheduling needs the workplace's permission (the existing secure-link process; unchanged gate).
      Academy office: the Coordinator's choice raises the existing CH-37 request for that event — the learner agrees, then the
      Academic Admin approves (PD-W0-05). Nothing is booked before that.
   3. Only the learner's allocated observation assessor (CH-17) proposes a date for an event and records it. The proposal is
      tied to the event, version and location.
   4. The record checklist is the event's own: its NVQ criteria with their evidence requirements, and (workplace only) the
      version's Academy criteria in the event, with the evidence types the event permits.
   5. Sign-off locks the record (as before) and keeps the event, version, location, criteria results and evidence with it.
   The observation fee is unchanged: one per learner per course, raised from the learner's pinned terms at the first confirmed
   observation (CH-38 / CB9 — chFeeSync). Learners whose version has no recorded events (seeded, configured before N5) keep the
   existing observation flow. Also fixed: the assessor's observation list only ever included the seeded learner's world, so
   other learners' observations never reached their assessor. Loads last.
   ============================================================ */
'use strict';

const D_LOC = { workplace: 'Workplace', office: 'Academy office' };
// The learner's observation requirements: their pinned version's configuration and its events (null: the existing flow applies)
function dCtx(w) {
  if (!w || !w.nvq || !w.nvq.progVersion || typeof n5ConfigFor !== 'function') return null;
  const pr = chProgOf(w); if (!pr || !pr.id || pr.unresolved) return null;
  const v = +w.nvq.progVersion, cfg = n5ConfigFor(pr.id, v); if (!cfg || cfg.required !== true) return null;
  const evs = cbEvOf(cfg); return evs.length ? { pr, v, cfg, evs } : null;
}
const dW = lid => { const k = chWorldKey(lid); return k ? STORE.worlds[k] : null; };
const dSel = (w, id) => ((w && w.dObs) || {})[id] || null;
const dLocs = (ctx, e) => (e.loc || []).filter(k => cbLocOk(ctx.cfg, k));
const dRecs = (w, ctx, e) => (w.observations || []).filter(o => o.dEv === e.id && o.dV === ctx.v);
const dReq = (w, e) => chOrs().filter(r => r.lid === w.me.id && r.dEv === e.id).slice(-1)[0] || null;
const dPerm = w => (w.workplace ? w.workplace.perm : 'Not entered');
// The state of one event for one learner
function dState(w, ctx, e) {
  const recs = dRecs(w, ctx, e), done = recs.find(o => o.status === 'Completed'); if (done) return { k: 'done', t: 'Completed', tone: 'green', rec: done };
  const act = recs.find(o => ['Proposed', 'Confirmed'].includes(o.status)); if (act) return { k: 'active', t: act.status === 'Proposed' ? 'Date proposed' : 'Confirmed', tone: 'blue', rec: act };
  const s = dSel(w, e.id); if (!s) return { k: 'nosel', t: 'Location to be chosen by the Coordinator', tone: 'amber' };
  if (s.loc === 'workplace') return dPerm(w) === 'Granted' ? { k: 'ready', t: 'Ready to schedule — workplace', tone: 'green' } : { k: 'wait', t: `Waiting for workplace permission (${String(dPerm(w)).replace('Permission ', '')})`, tone: 'amber' };
  const r = dReq(w, e);
  if (!r) return { k: 'wait', t: 'Academy-office request not raised', tone: 'amber' };
  if (r.status === 'Awaiting consent') return { k: 'wait', t: 'Waiting for the learner to agree', tone: 'amber', req: r };
  if (r.status === 'Pending approval') return { k: 'wait', t: 'Waiting for Academic Admin approval', tone: 'amber', req: r };
  if (r.status === 'Approved' || r.status === 'Booked') return { k: 'ready', t: 'Ready to schedule — Academy office (approved)', tone: 'green', req: r };
  return { k: 'refused', t: `Academy office ${r.status === 'Declined' ? 'declined by the learner' : 'not approved'} — the Coordinator chooses again`, tone: 'red', req: r };
}
const dEvCrit = (ctx, e) => { const nvq = n5NvqOk(ctx.pr, ctx.cfg).map(c => c.code), ia = ctx.cfg.ia.filter(c => c.status === 'Active').map(c => c.code); return { nvq: e.crit.filter(c => nvq.includes(c)), ia: e.crit.filter(c => ia.includes(c)) }; };
const dTxtLoc = k => D_LOC[k] || k;

/* ---------- 1. The Coordinator chooses each event's location ---------- */
function dCoordCard(lid) {
  const w = dW(lid), ctx = dCtx(w); if (!ctx) return '';
  const can = chIsMyBatchLid(lid);
  const rows = ctx.evs.map(e => {
    const st = dState(w, ctx, e), s = dSel(w, e.id), locs = dLocs(ctx, e), lock = ['active', 'done'].includes(st.k) || (st.req && ['Awaiting consent', 'Pending approval'].includes(st.req.status));
    const pick = !can || lock ? `<strong>${s ? esc(dTxtLoc(s.loc)) : '—'}</strong>` : `<label class="sr" for="d-loc-${e.id}">Location for ${esc(e.name)}</label><select class="select d-loc" id="d-loc-${e.id}" data-cb-keep>${s ? '' : '<option value="">Choose…</option>'}${locs.map(k => `<option value="${k}" ${s && s.loc === k ? 'selected' : ''}>${dTxtLoc(k)}</option>`).join('')}</select><button class="btn btn-sm btn-primary" data-act="dObsLoc" data-l="${esc(lid)}" data-e="${e.id}">Save</button>`;
    return `<tr data-e="${e.id}"><td><strong>${esc(e.name)}</strong><div class="xs muted">Permitted: ${esc(locs.map(dTxtLoc).join(', ') || 'none')}</div></td><td class="nowrap d-pick">${pick}</td><td>${chip(st.t, st.tone)}${s ? `<div class="xs muted">Chosen by ${esc(s.by)}, ${fdt(s.at)}</div>` : ''}</td></tr>`;
  }).join('');
  return `<section class="card d-coord"><div class="row-b"><h2>Required observations — ${esc(ctx.pr.title)} Version ${ctx.v}</h2>${chip(plural(ctx.evs.length, 'event'), 'blue')}</div>
    <p class="small muted">From the learner's programme version. ${can ? 'Choose where each observation takes place. The learner and the observation assessor are told. An Academy-office choice asks the learner to agree and then goes to the Academic Admin for approval.' : 'The learner\'s Academic Coordinator chooses the locations.'}</p>
    <div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Observation</th><th>Location</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="xs muted">${ic('lock', 12)} Workplace permission: ${chip(dPerm(w))}. Dates are proposed and observations recorded by the learner's observation assessor (${esc(chEff(lid, 'obs') || 'not allocated')}).</p></section>`;
}
ACT.dObsLoc = el => {
  const lid = el && el.dataset && el.dataset.l, w = dW(lid), ctx = dCtx(w), e = ctx && ctx.evs.find(x => x.id === el.dataset.e);
  const no = (why, msg) => { chAudit('Observations', w ? `${chFullName(w)} (${lid})` : (lid || '—'), 'Blocked: choose observation location', '—', '—', why); toast(msg, 'err'); return false; };
  if (!w || !ctx || !e) return no('No observation event for this learner', 'Observation not found.');
  if (!chIsMyBatchLid(lid)) return no('Only the learner\'s Academic Coordinator chooses observation locations', 'Only the learner\'s Academic Coordinator chooses where observations take place.');
  const loc = ((document.getElementById('d-loc-' + e.id) || {}).value) || el.dataset.loc || '';
  if (!dLocs(ctx, e).includes(loc)) return no(`Location not permitted for ${e.name}`, 'Choose one of the permitted locations.');
  const st = dState(w, ctx, e), s = dSel(w, e.id);
  if (['active', 'done'].includes(st.k)) return no(`${e.name} is ${st.t.toLowerCase()}`, `${e.name} is already ${st.t.toLowerCase()}: its location can't change. The assessor cancels the proposal first.`);
  if (st.req && ['Awaiting consent', 'Pending approval'].includes(st.req.status)) return no('Academy-office request open', 'An Academy-office request for this observation is waiting for the learner or the Academic Admin. Change the location after it is decided.');
  if (s && s.loc === loc && st.k !== 'refused') { toast('Nothing has changed.', 'info'); return; }
  const at = now().toISOString(), by = CME().name, hist = (s && s.hist ? s.hist.slice() : []).concat([[at, by, 'Location chosen', dTxtLoc(loc)]]);
  (w.dObs = w.dObs || {})[e.id] = { loc, by, at, v: ctx.v, hist };
  chAudit('Observations', `${chFullName(w)} (${lid})`, 'Observation location chosen', s ? `${e.name}: ${dTxtLoc(s.loc)}` : '—', `${e.name}: ${dTxtLoc(loc)}`, `${ctx.pr.title} Version ${ctx.v}`);
  let extra = '';
  if (loc === 'office') {
    const r = dReq(w, e);
    if (!r || ['Rejected', 'Declined', 'Withdrawn'].includes(r.status)) {
      const nr = chOrCreate(lid, 'coord', `${e.name}: the Coordinator chose an Academy-office observation`, by); nr.dEv = e.id; nr.dV = ctx.v;
      extra = ' Please agree to the Academy-office observation on your Observations page; it is then approved by the Academic Admin.';
    }
  }
  notifyLearner(w.v || chWorldKey(lid), 'Schedule', 'Observation location chosen', `${e.name}: ${dTxtLoc(loc)}.${loc === 'workplace' ? ' Your observation assessor proposes a date once your workplace has given permission.' : ''}${extra}`, 'observations');
  if (typeof tasNotifyW === 'function') tasNotifyW('Observation location chosen', `${chFullName(w)} — ${e.name}: ${dTxtLoc(loc)}`, 't-obs');
  render(); toast(`Saved: ${e.name} — ${dTxtLoc(loc)}. The learner is told.`);
};
const _cLearnerD = SCREENS['c-learner'];
SCREENS['c-learner'] = p => { const h = _cLearnerD(p); return p && p.tab === 'observations' && p.id ? h + dCoordCard(p.id) : h; };

/* ---------- The learner sees their required observations ---------- */
function dLearnerCard() {
  const w = W, ctx = dCtx(w); if (!ctx) return '';
  return `<section class="card d-learner"><h2>Your required observations — Version ${ctx.v}</h2><p class="small muted">Set by your programme. Your Academic Coordinator chooses where each takes place; your observation assessor proposes the date.</p>
    <ul class="list">${ctx.evs.map(e => { const st = dState(w, ctx, e), s = dSel(w, e.id), r = st.req;
      return `<li class="li" data-e="${e.id}"><div class="li-b"><strong>${esc(e.name)}</strong><span class="small">${s ? `Location: ${esc(dTxtLoc(s.loc))}` : 'Location not chosen yet'}</span>${r && r.status === 'Awaiting consent' && r.lid === w.me.id ? `<span class="row"><button class="btn btn-sm btn-primary" data-act="chOrConsent" data-id="${r.id}" data-a="accept">Agree to the Academy office</button><button class="btn btn-sm" data-act="chOrConsent" data-id="${r.id}" data-a="decline">Decline</button></span>` : ''}</div>${chip(st.t, st.tone)}</li>`; }).join('')}</ul></section>`;
}
// For a learner on the event journey, Academy-office observations are agreed per event (above); the older free-standing
// request card would duplicate the consent buttons, so it isn't shown to them (other learners keep it)
if (typeof chOrLearnerCard === 'function') { const _orCardD = chOrLearnerCard; chOrLearnerCard = function () { return dCtx(W) ? '' : _orCardD.apply(this, arguments); }; }
const _obsListD = obsList;
obsList = function () { return dLearnerCard() + _obsListD.apply(this, arguments); };

/* ---------- 3. The assessor's list includes every allocated learner (not only the seeded one) ---------- */
const _tasObsD = tasObs;
tasObs = function () {
  const base = _tasObsD.apply(this, arguments), have = new Set(base.map(o => o.id)), out = base.slice();
  tasLearners(true).forEach(L => { if (!L.v || L.v === 'C' || L.v === 'D') return; const w = STORE.worlds[L.v]; if (!w || !w.observations) return;
    if (typeof chScoped === 'function' && chScoped() && chEff(L.lid, 'obs') !== chMe()) return; // CH-17: only the observation assessor
    w.observations.forEach(o => { const id = L.v + '-' + o.id; if (have.has(id)) return; have.add(id);
      out.push({ id, src: o, v: L.v, lid: w.me.id, learner: VNAME(L.v), home: o.locType === 'office' ? 'Academy office' : (w.workplace || {}).name || '—', addr: o.locType === 'office' ? '' : w.workplace ? `${w.workplace.address || ''}${w.workplace.postcode ? ', ' + w.workplace.postcode : ''}` : '', locType: o.locType || 'work', at: o.newAt || o.at, scope: o.scope, nvqN: String(o.scope || '').split(',').filter(Boolean).length, iaN: (o.dIa || []).length, status: o.status, resp: o.status === 'Confirmed' ? 'Learner' : '—', perm: dPerm(w), alt: o.alt ? 'Alternative requested by the learner' : null, assessor: o.assessor, report: o.report, signed: o.signed, postEntered: o.postEntered, reason: o.reason, newAt: o.newAt, dEv: o.dEv, evName: o.dEvName }); }); });
  return out;
};

/* ---------- 3. Proposing a date for an event ---------- */
function dFillEv() {
  const box = document.querySelector('#modal-root #d-ev'); if (!box) return;
  const lid = mval('#op-l'), w = dW(lid), ctx = dCtx(w), crit = document.querySelector('#modal-root .op-c') && document.querySelector('#modal-root .op-c').closest('fieldset'), ia = document.getElementById('op-ia'), send = document.getElementById('op-send');
  // (style, not the hidden attribute: these elements' own display rules would override it)
  const show = (x, on) => { if (x) { x.hidden = !on; x.style.display = on ? '' : 'none'; } };
  if (!ctx) { box.innerHTML = ''; show(crit, true); return; }
  show(crit, false); show(ia, false);
  const opts = ctx.evs.map(e => ({ e, st: dState(w, ctx, e) })), ready = opts.filter(x => x.st.k === 'ready');
  box.innerHTML = `<div class="field d-evf"><label for="d-ev-s">Observation (from the learner's Version ${ctx.v})</label><select class="select" id="d-ev-s" data-onchange="dEvPick">${opts.map(x => `<option value="${x.e.id}" ${x.st.k === 'ready' ? '' : 'disabled'}>${esc(x.e.name)} — ${esc(x.st.t)}</option>`).join('')}</select><span class="hint">Only observations whose location the Coordinator has chosen, and that are approved or permitted there, can be proposed.</span></div><div id="d-ev-info" class="small"></div>`;
  const sel = document.getElementById('d-ev-s'); if (ready.length) sel.value = ready[0].e.id;
  if (send) send.disabled = !ready.length;
  if (!ready.length) { document.getElementById('d-ev-info').innerHTML = `<div class="note b-amber">${ic('info')}<div class="small">Nothing can be proposed for this learner yet: each observation needs its location chosen by the Coordinator${opts.some(x => x.st.req) ? ', and an Academy-office observation the learner\'s agreement and approval' : ''}${opts.some(x => x.st.k === 'wait' && /permission/.test(x.st.t)) ? ', and a workplace observation the workplace\'s permission' : ''}.</div></div>`; return; }
  INP.dEvPick(sel);
}
INP.dEvPick = el => {
  const lid = mval('#op-l'), w = dW(lid), ctx = dCtx(w), e = ctx && ctx.evs.find(x => x.id === el.value); if (!e) return;
  const s = dSel(w, e.id), office = s.loc === 'office', c = dEvCrit(ctx, e), send = document.getElementById('op-send');
  document.querySelectorAll('#modal-root input[name="op-lt"]').forEach(r => { r.checked = (r.value === 'office') === office; r.disabled = r.value === 'office' ? !office : office; });
  const loc = document.getElementById('op-loc'); if (loc) { loc.value = office ? 'Academy office' : (w.workplace || {}).name || ''; loc.readOnly = true; }
  const ia = document.getElementById('op-ia'); if (ia) { ia.hidden = true; ia.style.display = 'none'; }
  if (!office) { const p = document.getElementById('op-perm'); if (p) p.innerHTML = dPerm(w) === 'Granted' ? `<p class="small" style="color:var(--green)">✓ Workplace permission granted</p>` : ''; }
  if (send) send.disabled = false;
  document.getElementById('d-ev-info').innerHTML = `<dl class="kv d-evkv"><dt>Location</dt><dd>${esc(dTxtLoc(s.loc))} <span class="xs muted">(chosen by ${esc(s.by)})</span></dd><dt>NVQ criteria</dt><dd class="mono">${esc(c.nvq.join(', ') || '—')}</dd>${office ? '' : `<dt>Academy criteria</dt><dd class="mono">${esc(c.ia.join(', ') || '—')}</dd>`}<dt>Evidence permitted</dt><dd>${esc(n5EvTxt({ types: e.ev }))}</dd></dl>`;
};
const _obPermD = INP.obPerm;
INP.obPerm = el => { const r = _obPermD(el); dFillEv(); return r; };
const _obPropD = ACT.obPropose;
ACT.obPropose = el => {
  const r = _obPropD(el); if (!MODAL || !/id="op-l"/.test(MODAL.body || '')) return r;
  // into the open dialog (not by re-rendering it: the CH-17 wrapper has already removed other assessors' learners from the list)
  const lf = document.querySelector('#modal-root #op-l'); if (lf && !document.getElementById('d-ev')) (lf.closest('.field') || lf).insertAdjacentHTML('afterend', '<div id="d-ev"></div>');
  dFillEv();
  const a = MODAL.actions.find(x => x.label === 'Send proposal'); if (!a || a._d) return r; const f = a.fn; a._d = true;
  a.fn = (...x) => {
    const lid = mval('#op-l'), w = dW(lid), ctx = dCtx(w); if (!ctx) return f(...x); // the existing flow (no recorded events)
    const e = ctx.evs.find(y => y.id === mval('#d-ev-s')), st = e && dState(w, ctx, e), s = e && dSel(w, e.id);
    if (!e || !st || st.k !== 'ready') { tasLog('Observations', chFullName(w), 'Blocked: propose observation', '—', '—', e ? `${e.name}: ${st.t}` : 'No observation chosen'); toast(e ? `${e.name}: ${st.t}.` : 'Choose the observation.', 'err'); return false; }
    const office = s.loc === 'office', chosen = ($('input[name="op-lt"]:checked') || {}).value === 'office';
    if (office !== chosen) { tasLog('Observations', chFullName(w), 'Blocked: propose observation', '—', '—', 'Location differs from the Coordinator\'s choice'); toast(`${e.name} takes place at the ${dTxtLoc(s.loc).toLowerCase()} (the Coordinator's choice).`, 'err'); return false; }
    if (!office && dPerm(w) !== 'Granted') { toast('Workplace permission not granted.', 'err'); return false; }
    const c = dEvCrit(ctx, e), first = document.querySelector('#modal-root .op-c'); if (first && !document.querySelector('#modal-root .op-c:checked')) first.checked = true;
    const n0 = w.observations.length, keep = STORE.chOffReq, rq = st.req;
    if (office) { if (rq.status === 'Booked') rq.status = 'Approved'; STORE.chOffReq = [rq]; } // the CH-37 gate and booking act on this event's own request
    let out; try { out = f(...x); } finally { if (office) STORE.chOffReq = keep; }
    if (out === false || w.observations.length <= n0) return out;
    const rec = w.observations[0]; Object.assign(rec, { dEv: e.id, dEvName: e.name, dV: ctx.v, dPid: ctx.pr.id, dLoc: s.loc, locType: office ? 'office' : 'work', loc: office ? 'Academy office' : (w.workplace || {}).name, scope: c.nvq.join(', '), dIa: office ? [] : c.ia.slice(), dEvTypes: (e.ev || []).slice() });
    tasLog('Observations', chFullName(w), 'Observation event proposed', '—', `${e.name} · ${dTxtLoc(s.loc)} · ${fdt(rec.at)}`, `${ctx.pr.title} Version ${ctx.v}`);
    return out;
  };
  return r;
};

/* ---------- 4. The record checklist: the event's criteria and evidence requirements ---------- */
function dCritRow(set, code, desc, label, req, types, v) {
  return `<div class="obs-card"><div class="row-b"><span class="code">${esc(code)}</span><span class="xs muted">${label}</span></div><p class="small">${esc(desc)}</p>${req ? `<p class="xs muted">Evidence requirement: ${esc(req)}</p>` : ''}<p class="xs muted">Evidence permitted: ${esc(n5EvTxt({ types }))}</p>
    <div class="tgl-row"><button class="tgl ${v.o === 1 ? 'on' : ''}" data-act="orT" data-s="${set}" data-c="${esc(code)}" data-k="o" data-v="1" aria-pressed="${v.o === 1}">Observed</button><button class="tgl ${v.o === 0 ? 'on off' : ''}" data-act="orT" data-s="${set}" data-c="${esc(code)}" data-k="o" data-v="0" aria-pressed="${v.o === 0}">Not Yet Observed</button></div>
    <div class="tgl-row"><button class="tgl ${v.c === 1 ? 'on' : ''}" data-act="orT" data-s="${set}" data-c="${esc(code)}" data-k="c" data-v="1" aria-pressed="${v.c === 1}">Competent</button><button class="tgl ${v.c === 0 ? 'on off' : ''}" data-act="orT" data-s="${set}" data-c="${esc(code)}" data-k="c" data-v="0" aria-pressed="${v.c === 0}">Not Yet Competent</button></div>
    <label class="sr" for="d-m-${set}-${esc(code)}">Comment for ${esc(code)}</label><input class="input" id="d-m-${set}-${esc(code)}" placeholder="Comment (optional)" value="${esc(v.m || '')}" data-oninput="orM" data-s="${set}" data-c="${esc(code)}"></div>`;
}
// The checklist a record uses: from the pinned version's configuration (frozen at publication) for the event and location
function dChecklist(o) {
  const w = STORE.worlds[o.v], ctx = dCtx(w); if (!ctx || ctx.v !== o.src.dV) return null;
  const e = ctx.evs.find(x => x.id === o.src.dEv); if (!e) return null;
  const type = o.src.dLoc === 'office' ? 'office' : 'workplace', cl = n5Checklist(ctx.pr, ctx.cfg, type); if (!cl.ok) return { e, ctx, why: cl.why, items: [] };
  const tree = (w.tree || []).flatMap(u => u.mods.flatMap(m => m.los.flatMap(l => l.crit))), reqOf = code => { const c = tree.find(x => x.code === code); return c ? c.evReq || c.ev || '' : ''; };
  return { e, ctx, type, items: cl.items.filter(i => e.crit.includes(i.code)).map(i => ({ set: i.kind === 'NVQ' ? 'nvq' : 'ia', code: i.code, d: i.d, kind: i.kind, req: i.kind === 'NVQ' ? (reqOf(i.code) || i.req) : '', types: ((i.ev && i.ev.types) || []).filter(t => (e.ev || []).includes(t)) })) };
}
function dRecScreen(o) {
  const cl = dChecklist(o); if (!cl) return null;
  const dr = STORE.tas.obsDraft[o.id] = STORE.tas.obsDraft[o.id] || { started: now().toISOString(), nvq: {}, ia: {}, ctx: '', notes: '', evt: [] };
  const evt = dr.evt || [];
  return `<div class="obs-rec d-rec">
  <div class="card" style="gap:4px"><span class="eyebrow">Observation record</span><h1 style="font-size:1.2rem">${esc(o.learner)} — ${esc(cl.e.name)}</h1><span class="small">${fdl(o.at)} · ${esc(dTxtLoc(o.src.dLoc))}${o.src.dLoc === 'office' ? ' · ' + chOfficeTxt(o) : ' · ' + esc(o.home)} · ${esc(cl.ctx.pr.title)} Version ${cl.ctx.v} · Started at ${ft(dr.started)}</span>${dr.postEntered ? chip('Post-entered — observed ' + fd(dr.postEntered), 'outline') : ''}</div>
  <div class="note b-amber">${ic('shield')}<div class="small"><strong>Do not record service-user names or identifying information.</strong> Evidence must respect workplace privacy rules.</div></div>
  <div class="field"><label for="or-ctx">Context (setting, task, service users present — no identifying details)</label><textarea class="textarea" id="or-ctx" data-oninput="orF" data-f="ctx">${esc(dr.ctx)}</textarea></div>
  ${cl.why ? `<div class="note b-red">${ic('alert')}<div class="small">${esc(cl.why)}</div></div>` : ''}
  <h2>NVQ criteria</h2>${cl.items.filter(i => i.set === 'nvq').map(i => dCritRow('nvq', i.code, i.d, 'Observation / Competency', i.req, i.types, dr.nvq[i.code] || {})).join('') || '<p class="small muted">None in this observation.</p>'}
  ${cl.type === 'office' ? '<p class="small muted">Academy office observation: NVQ criteria only.</p>' : cl.items.some(i => i.set === 'ia') ? `<h2>Illumin Academy criteria</h2><p class="xs muted">This programme version's Academy standard — internal quality, not qualification competency.</p>${cl.items.filter(i => i.set === 'ia').map(i => dCritRow('ia', i.code, i.d, 'Academy standard', '', i.types, dr.ia[i.code] || {})).join('')}` : ''}
  <fieldset class="field n5-fs"><legend class="lbl">Evidence recorded (permitted for this observation)</legend><div class="n5-evs">${(cl.e.ev || []).map(k => `<label class="check"><input type="checkbox" class="d-evt" value="${k}" ${evt.includes(k) ? 'checked' : ''} data-onchange="dEvt"><span>${esc((N5_EV.find(x => x[0] === k) || [k, k])[1])}</span></label>`).join('')}</div></fieldset>
  <div class="field"><label for="or-n">Observation notes and directly observed performance</label><textarea class="textarea" id="or-n" data-oninput="orF" data-f="notes">${esc(dr.notes)}</textarea></div>
  <div class="field"><label for="or-att">Evidence attachment</label><input class="input" type="file" id="or-att" multiple data-onchange="orAtt">${(dr.att || []).length ? `<ul class="list small" aria-label="Attached evidence">${dr.att.map((f, k) => `<li class="li"><div class="li-b">${ic('clip', 14)} ${esc(f.name)}</div><button class="btn btn-sm btn-ghost" data-act="orAttRm" data-k="${k}" aria-label="Remove ${esc(f.name)}">Remove</button></li>`).join('')}</ul>` : ''}</div>
  <div class="sticky-actions"><button class="btn btn-block" data-act="orSave">Save draft</button><button class="btn btn-block btn-danger" data-act="obCancel" data-id="${o.id}">No-show / cancel</button><button class="btn btn-block btn-primary" data-act="orSign" data-id="${o.id}">Sign off</button></div></div>`;
}
INP.dEvt = () => { const d = curDr(); if (d) d.evt = $$('.d-evt:checked').map(x => x.value); };
const dMeta = r => (r && r.dEv ? `<section class="card d-recmeta"><h2>${esc(r.dEv.name)}</h2><dl class="kv"><dt>Programme version</dt><dd>${esc(r.dEv.prog)} — Version ${r.dEv.v}</dd><dt>Location</dt><dd>${esc(dTxtLoc(r.dEv.loc))}</dd><dt>Evidence recorded</dt><dd>${esc(n5EvTxt({ types: r.dEv.types }))}</dd></dl></section>` : '');
const _orScrD = SCREENS['t-obsrec'];
SCREENS['t-obsrec'] = p => {
  const o = p && p.id ? obById(p.id) : null;
  if (o && o.src && o.src.dEv) {
    if (o.status === 'Confirmed') { const h = dRecScreen(o); if (h) return h; }
    if (o.status === 'Completed') { const h = _orScrD(p), r = o.src.report; return h.replace('<section class="card"><h2>NVQ criteria</h2>', dMeta(r) + '<section class="card"><h2>NVQ criteria</h2>'); }
  }
  return _orScrD(p);
};

/* ---------- 5. Sign-off of an event record (the same lock and stamps; the event's own checklist) ---------- */
const _orSignD = ACT.orSign;
ACT.orSign = el => {
  const id = (el && el.dataset && el.dataset.id) || (S.params || {}).id, o = id ? obById(id) : null;
  if (!o || !o.src || !o.src.dEv) return _orSignD(el); // the existing flow — including its refusal for another assessor's record
  if (!hasRole('Assessor')) { tasLog('Observations', o.learner, 'Blocked: sign off observation', '—', '—', 'Only an Assessor records observations'); toast('Only the observation assessor records observations.', 'err'); return; }
  if (o.status !== 'Confirmed') { toast('Only a confirmed observation can be signed off.', 'err'); return; }
  const cl = dChecklist(o), d = curDr() || STORE.tas.obsDraft[o.id]; if (!cl || !d) return;
  const miss = cl.items.filter(i => { const x = (d[i.set] || {})[i.code]; return !x || x.o === undefined || x.c === undefined; });
  if (miss.length) { toast(`Set Observed and Competent for every criterion first (${miss.map(i => i.code).join(', ')}).`, 'err'); return; }
  const evt = (d.evt || []).filter(t => (cl.e.ev || []).includes(t)); if (!evt.length) { toast('Tick the evidence you recorded (from the types this observation permits).', 'err'); return; }
  openModal({ title: 'Sign off observation', body: `<div class="note b-amber">${ic('lock')}<div><strong>Sign-off locks this record.</strong> Your name and the time are stamped.</div></div><p class="small">${esc(cl.e.name)} · ${esc(dTxtLoc(o.src.dLoc))} · Version ${cl.ctx.v}</p><h3>Learner acknowledgement (optional)</h3><label class="check"><input type="checkbox" id="ack-c"> I acknowledge this observation record</label><div class="field"><label for="ack-n">Learner's typed name</label><input class="input" id="ack-n"></div>`,
    actions: [{ label: 'Cancel' }, { label: 'Sign off and lock', cls: 'btn-primary', fn: () => {
      const me = TME().name, at = now().toISOString(), w = STORE.worlds[o.v], row = i => [i.code, i.d, d[i.set][i.code].o, d[i.set][i.code].c, d[i.set][i.code].m || ''];
      const report = { nvq: cl.items.filter(i => i.set === 'nvq').map(row), ia: cl.items.filter(i => i.set === 'ia').map(row), notes: d.notes || 'Signed off.', ctx: d.ctx || '', followUp: null, evidence: (d.att || []).map(f => f.name),
        dEv: { id: cl.e.id, name: cl.e.name, v: cl.ctx.v, pid: cl.ctx.pr.id, prog: cl.ctx.pr.title, loc: o.src.dLoc, types: evt, crit: cl.items.map(i => i.code) } };
      Object.assign(o.src, { status: 'Completed', report, signed: at, signedBy: me, postEntered: d.postEntered || null, ack: !!($('#ack-c') || {}).checked });
      (w.tree || []).forEach(u => u.mods.forEach(m => m.los.forEach(lo => lo.crit.forEach(c => { const x = d.nvq[c.code]; if (!x || !cl.items.some(i => i.set === 'nvq' && i.code === c.code)) return; c.obs = { o: x.o, c: x.c }; if (x.o && x.c) { c.st = 'Achieved'; c.date = at; c.lock = { by: me, at }; c.src = `Observation · ${cl.e.name} · ${fd(o.at)}`; } else if (x.o && !x.c) c.st = 'Action Required'; else c.st = 'In Progress'; }))));
      (w.events || []).filter(e => e.type === 'obs' && keyOf(e.start) === keyOf(o.at)).forEach(e => { e.title = `Observation (completed) — ${cl.e.name}`; });
      notifyLearner(o.v, 'Schedule', 'Observation report available', `${me} signed off ${cl.e.name} (${fd(o.at)}).`, 'observations');
      delete STORE.tas.obsDraft[o.id]; tasLog('Observations', o.learner, 'Observation signed off', 'Confirmed', 'Completed (locked)', `${cl.e.name} · ${dTxtLoc(o.src.dLoc)} · Version ${cl.ctx.v}${d.postEntered ? ' · Post-entered' : ''}`);
      go('t-obsrec', { id: o.id }); toast('Signed off and locked. Outcomes flow to the competency map.');
    } }] });
};

/* ---------- Records ---------- */
UXC.push(['D1', 'Observations — the learner-specific journey (22 Oct 2026)', [
  'For learners whose programme version has required observation events, observations run per event. The learner\'s Academic Coordinator chooses each event\'s location on the learner\'s Observations tab, from the locations the event and version permit; the learner and the observation assessor are told.',
  'Workplace observations need the workplace\'s permission (unchanged). An Academy-office choice raises the existing request for that event: the learner agrees on their Observations page, then the Academic Admin approves.',
  'Only the learner\'s observation assessor proposes a date — for a chosen event whose location is ready — and records it. The record checklist is the event\'s own: its NVQ criteria with their evidence requirements and, at the workplace, the version\'s Academy criteria in the event, with the evidence types it permits. Sign-off locks the record with the event, version, location, results and evidence.',
  'The assessor\'s observation list now includes every allocated learner (before, only the seeded learner\'s observations were listed). The observation fee is unchanged: one per learner per course, from the learner\'s agreed terms. Learners on versions without recorded events keep the existing flow.']]);
