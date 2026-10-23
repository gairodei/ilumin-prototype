/* ============================================================
   MC — Multiple Academic Coordinators per batch, and learner document privacy (23 Oct 2026; PD-MC-01… in PROVISIONAL-DECISIONS.md).
   Model (one source of truth for each fact):
     - b.coords: the batch's Coordinator list (batch level, in the order they were added).
     - b.mcA[lid] = { to, at, by, src }: each learner's designated Coordinator in that batch (learner level). b.mcH keeps every
       allocation change. b.coord is no longer stored: it reads the first listed Coordinator, so every one-Coordinator screen and
       check works as before; writing it (the existing "Change Academic Coordinator" path) replaces that Coordinator and moves
       their learners to the new one.
     - A learner who joins is allocated to the Coordinator with the fewest active learners (ties: the one listed first). Existing
       allocations never move on their own; manual reassignment and removing a Coordinator need a reason and are audited.
   Coordinator portal: every Coordinator of a batch sees the full roster and the academic workflow; learner-specific actions
   (messages, observation locations, Academy-office observation decisions, per-learner assessor overrides) are the designated
   Coordinator's. Learners see only their own Coordinator. Admission / personal documents are never opened from the Coordinator
   or Teacher/Assessor portals; academic files keep their existing rules.
   Loads last.
   ============================================================ */
'use strict';

/* ---------- 1. Model ---------- */
let MC_AS = null, MC_STRICT = null, MC_BOOT = false, MC_BY = null, MC_FROM = null;
const MC_ENDED = ['Discontinued', 'Withdrawn', 'Expired-Incomplete', 'Cancelled', 'Completed'];
function mcNorm(b) {
  if (!b || b._mc) return b;
  const own = Object.getOwnPropertyDescriptor(b, 'coord'), first = own && 'value' in own ? own.value : null;
  if (!Array.isArray(b.coords)) b.coords = first ? [first] : [];
  Object.defineProperty(b, '_mc', { value: true, enumerable: false, configurable: true });
  Object.defineProperty(b, '_mcSig', { value: '', enumerable: false, writable: true, configurable: true });
  Object.defineProperty(b, 'coord', { enumerable: true, configurable: true,
    get() { const c = this.coords || []; return MC_AS && c.includes(MC_AS) ? MC_AS : c[0] || null; },
    set(v) { mcSetFirst(this, v); } });
  b.mcA = b.mcA || {}; b.mcH = b.mcH || [];
  return b;
}
const mcList = b => (b ? mcNorm(b).coords : []);
const mcHas = (b, name) => !!name && mcList(b).includes(name);
const mcMulti = b => mcList(b).length > 1;
const mcWho = () => MC_BY || (S.portal === 'coord' && typeof CME === 'function' ? CME().name : ADMIN && ADMIN.me ? ADMIN.me.name : 'System');
const mcLidOf = e => e.lid || (e.v && STORE.worlds[e.v] && STORE.worlds[e.v].me && STORE.worlds[e.v].me.id) || null;
// A learner is identified when a learner record (admin data or a learner account) carries the ID
let MC_KS = null;
const mcKnown = lid => { const a = ADMIN.learners, ws = STORE.worlds || {}, k = a.length + ':' + Object.keys(ws).length;
  if (!MC_KS || MC_KS.a !== a || MC_KS.ws !== ws || MC_KS.k !== k) MC_KS = { a, ws, k, s: new Set(a.map(x => x.id).concat(Object.values(ws).map(w => w.me && w.me.id).filter(Boolean))) };
  return !!lid && MC_KS.s.has(lid); };
// The batch's actual members: identified learners of its cohort entries, then of its roster rows, in enrolment order.
// This is the list the Coordinator portal shows; Coordinator allocation and every allocation count use it.
function mcLids(b) {
  const seen = new Set(), out = [];
  (b.coh || []).forEach(e => { const l = mcLidOf(e); if (l && !seen.has(l) && mcKnown(l)) { seen.add(l); out.push(l); } });
  (b.roster || []).forEach(r => { if (r && r[1] && !seen.has(r[1]) && mcKnown(r[1])) { seen.add(r[1]); out.push(r[1]); } });
  return out;
}
// Everything a roster screen can show for a batch, each kind kept apart (nothing is deleted or invented):
//   members — identified batch members; unresolved — roster rows whose learner can't be identified (historical entries);
//   demo — rows the admin roster adds for demonstration (batchRoster) that aren't batch members; uncounted — enrolments the
//   batch's count records with no row at all.
function mcRosterView(b) {
  const members = mcLids(b), unresolved = (b.roster || []).filter(r => r && !mcKnown(r[1]));
  const demo = (typeof batchRoster === 'function' ? batchRoster(b) : []).filter(r => !members.includes(r[1]) && !(b.roster || []).includes(r));
  return { members, unresolved, demo, uncounted: Math.max(0, (b.enrolled || 0) - members.length - unresolved.length) };
}
function mcCountNote(b, where) {
  const v = mcRosterView(b), parts = [];
  if (v.unresolved.length) parts.push(`${plural(v.unresolved.length, 'unresolved historical roster entry', 'unresolved historical roster entries')} (no identifiable learner record)`);
  if (v.uncounted) parts.push(`${plural(v.uncounted, 'enrolment')} counted on the batch with no learner record (historical count)`);
  if (where === 'admin' && v.demo.length) parts.push(`${plural(v.demo.length, 'demonstration row')} below that ${v.demo.length === 1 ? 'isn\'t' : 'aren\'t'} batch members`);
  return `<p class="small mc-rnote">${ic('users', 13)} <strong>${plural(v.members.length, 'identified batch member')}</strong> — these are the learners allocated to Academic Coordinators${parts.length ? '. Not counted as members: ' + parts.join('; ') : ''}. The enrolment count (${b.enrolled}/${b.cap}) is the batch's recorded figure.</p>`;
}
function mcStatus(b, lid) {
  const e = (b.coh || []).find(x => mcLidOf(x) === lid);
  if (e && e.v && STORE.worlds[e.v]) { const w = STORE.worlds[e.v]; return w.nvq && w.nvq.status === 'Discontinued' ? 'Discontinued' : 'Active'; }
  const l = ADMIN.learners.find(x => x.id === lid);
  if (e) return ((l && l._enr) || [])[0] && l._enr[0].status || 'Active';
  // A roster row: the learner's enrolment on this batch's programme, when one is recorded
  const en = ((l && l._enr) || []).find(x => x.type === 'NVQ / RQF' && x.title === b.course);
  return (en && en.status) || 'Active';
}
const mcActive = (b, lid) => !MC_ENDED.includes(mcStatus(b, lid));
function mcName(b, lid) {
  const e = (b.coh || []).find(x => mcLidOf(x) === lid);
  if (e && e.v && STORE.worlds[e.v]) return chFullName(STORE.worlds[e.v]);
  const r = (b.roster || []).find(x => x[1] === lid); if (r) return r[0];
  const l = ADMIN.learners.find(x => x.id === lid) || (typeof learnerById === 'function' && learnerById(lid)); return l ? l.name : lid;
}
// Current workload: active learners of this batch allocated to each listed Coordinator
function mcLoad(b, lids) {
  const load = Object.fromEntries(mcList(b).map(c => [c, 0]));
  (lids || mcLids(b)).forEach(l => { const a = b.mcA[l]; if (a && load[a.to] !== undefined && mcActive(b, l)) load[a.to]++; });
  return load;
}
const mcLeast = (b, load) => mcList(b).reduce((m, c) => (m === null || load[c] < load[m] ? c : m), null);
function mcSync(b) {
  if (!b) return; mcNorm(b);
  const lids = mcLids(b), sig = b.coords.join('|') + '#' + lids.join(',');
  if (b._mcSig === sig) return;
  const need = lids.filter(l => !(b.mcA[l] && b.coords.includes(b.mcA[l].to)));
  if (need.length && b.coords.length) {
    const load = mcLoad(b, lids), at = now().toISOString();
    need.forEach(lid => {
      const prev = b.mcA[lid], to = mcLeast(b, load), src = MC_BOOT ? 'Existing enrolment' : prev ? 'Previous Coordinator no longer on this batch' : 'Balanced allocation on enrolment';
      b.mcA[lid] = { to, at, by: 'System', src };
      b.mcH.push({ lid, from: prev ? prev.to : null, to, at, by: 'System', reason: src, kind: MC_BOOT ? 'seed' : 'auto' });
      if (mcActive(b, lid)) load[to]++;
    });
  }
  b._mcSig = sig;
}
const mcSyncAll = () => (typeof ADMIN !== 'undefined' && ADMIN && ADMIN.batches ? ADMIN.batches.forEach(mcSync) : null);
const mcBootAll = () => { MC_BOOT = true; try { mcSyncAll(); } finally { MC_BOOT = false; } };
// The learner's designated Coordinator in batch b (default: their current batch)
function mcOf(lid, b) { b = b || chBatchOfLid(lid); if (!b) return null; mcSync(b); const a = b.mcA[lid]; return a && b.coords.includes(a.to) && mcLids(b).includes(lid) ? a.to : null; }
const mcMineL = L => S.portal === 'coord' && mcOf(L.lid, L.batch) === CME().name;
const mcMineLid = lid => S.portal === 'coord' && mcOf(lid) === CME().name;
// Run f as if the viewer's batch list leaves out this learner's batch unless they are the learner's designated Coordinator
const mcStrict = (lid, f) => { const p = MC_STRICT; MC_STRICT = lid; try { return f(); } finally { MC_STRICT = p; } };
const mcAs = (name, f) => { const p = MC_AS; MC_AS = name; try { return f(); } finally { MC_AS = p; } };

// Move every learner allocated to `from` to `to` (Coordinator replaced); history kept per learner
function mcMove(b, from, to, why) {
  const at = now().toISOString(), by = mcWho();
  Object.entries(b.mcA).forEach(([lid, a]) => { if (a.to === from) { b.mcA[lid] = { to, at, by, src: why }; b.mcH.push({ lid, from, to, at, by, reason: why, kind: 'replace' }); mcOrFollow(lid, to); } });
}
// Writing b.coord (the existing single-Coordinator path): the first listed Coordinator is replaced and keeps no learners
function mcSetFirst(b, v) {
  if (!v) return;
  const c = b.coords; if (c.includes(v)) { c.splice(c.indexOf(v), 1); c.unshift(v); return; }
  const from = c[0]; if (from) { c[0] = v; mcMove(b, from, v, 'Academic Coordinator changed'); } else c.push(v);
}
// Open Academy-office observation requests follow the learner's designated Coordinator (one decider, never two)
function mcOrFollow(lid, to) {
  if (typeof chOrs !== 'function') return;
  chOrs().filter(r => r.lid === lid && ['Awaiting consent', 'Pending approval'].includes(r.status) && r.coord !== to).forEach(r => {
    const was = r.coord; r.coord = to; r.history.push(['System', now().toISOString(), 'Coordinator changed', `${was || '—'} → ${to}`]);
    const i = r.qid && ADMIN.queue.find(x => x.id === r.qid); if (i && isOpen(i) && i.first === was) { i.first = to; (i.history = i.history || []).push(['System', now().toISOString(), 'Reassigned', `Learner's Coordinator is now ${to}`]); }
  });
}

/* ---------- 2. Boot, rebuilds and new enrolments ---------- */
const _isMC = initStore;
initStore = function () { const r = _isMC.apply(this, arguments); STORE.mcDocReview = []; mcBootAll(); mcNotifHook(); return r; };
const _baMC = buildAdmin;
buildAdmin = function () { const r = _baMC.apply(this, arguments); if (typeof STORE !== 'undefined' && STORE.worlds) mcBootAll(); return r; };
// A learner who joins (any enrolment path) is allocated straight after the action that added them
AFTER.unshift(() => { try { mcSyncAll(); } catch (e) { /* no admin data yet */ } });

/* ---------- 3. Coordinator notifications: learner-specific ones go to the learner's Coordinator, batch ones to every Coordinator ---------- */
// Context set by the wrappers below: the learner an action is about (MC_LID), or the batches a batch-level notice covers (MC_FAN)
let MC_LID = null, MC_FAN = null;
const mcCtx = (k, v, f) => { const p = k === 'lid' ? MC_LID : MC_FAN; if (k === 'lid') MC_LID = v; else MC_FAN = v; try { return f(); } finally { if (k === 'lid') MC_LID = p; else MC_FAN = p; } };
// The learner's Coordinator in batch b; after they have left it, the Coordinator they last had there
const mcLast = (lid, b) => mcOf(lid, b) || (b && b.mcA && b.mcA[lid] && mcHas(b, b.mcA[lid].to) ? b.mcA[lid].to : null);
function mcRoute(n) {
  if (!n || !n.to || n.mc) return [n];
  const m = /^c-(?:learner\.([^.~]+)|sub\.([^~]+)~)/.exec(n.go || ''), lid = m && (m[1] || m[2]);
  if (lid) { const b = chBatchOfLid(lid); if (b && mcMulti(b) && mcHas(b, n.to)) { const d = mcLast(lid, b); if (d) return [{ ...n, to: d, mc: true }]; } return [n]; }
  const bm = /^c-batches\.(.+)$/.exec(n.go || ''), b = bm && ADMIN.batches.find(x => x.code === bm[1]);
  if (b && mcMulti(b) && mcHas(b, n.to)) {
    if (MC_LID) { const d = mcLast(MC_LID, b); if (d) return [{ ...n, to: d, mc: true }]; } // about one learner: their Coordinator only
    return mcList(b).map((c, k) => ({ ...n, id: n.id + '-' + k, to: c, mc: true }));
  }
  if (n.go === 'c-timeline') { // a schedule notice: every Coordinator of the batches it covers, once each
    const bs = (MC_FAN ? MC_FAN.bs : ADMIN.batches.filter(x => String(n.b || '').includes('(' + x.code + ')'))).filter(x => mcMulti(x) && mcHas(x, n.to));
    if (bs.length) { const sent = MC_FAN ? MC_FAN.sent : new Set(); return [...new Set(bs.flatMap(mcList))].filter(c => { const k = c + '|' + n.t + '|' + n.b; if (sent.has(k)) return false; sent.add(k); return true; }).map((c, k) => ({ ...n, id: n.id + '-' + k, to: c, mc: true })); }
  }
  return [n];
}
function mcNotifHook() {
  const a = STORE.coo && STORE.coo.notifs; if (!a || a._mc) return;
  Object.defineProperty(a, '_mc', { value: true });
  a.unshift = function (...items) { return Array.prototype.unshift.apply(this, items.flatMap(mcRoute)); };
}
const mcNotify = (to, t, body, go) => { if (STORE.coo && to) { mcNotifHook(); STORE.coo.notifs.unshift({ id: 'cn' + Date.now() + Math.random().toString(36).slice(2, 5), t, b: body, at: now().toISOString(), go, unread: true, to, mc: true }); } };
const _cnMC = cooNotifs;
cooNotifs = function () { mcNotifHook(); const me = CME().name; return _cnMC.apply(this, arguments).filter(n => !(n.mc && n.to !== me)); };

// Legacy single-Coordinator paths that act for one learner or one schedule change
const _relMC = chReleaseSeat; chReleaseSeat = function (w) { return mcCtx('lid', w && w.me && w.me.id, () => _relMC.apply(this, arguments)); };
const _moveMC = chDoMove; chDoMove = function (lid) { return mcCtx('lid', lid, () => _moveMC.apply(this, arguments)); };
const _sessMC = s4bNotifySess; s4bNotifySess = function (x) { return mcCtx('fan', { bs: s4bCodesOf(x).map(s4bBatch).filter(Boolean), sent: new Set() }, () => _sessMC.apply(this, arguments)); };
const _n3MC = n3Notify; n3Notify = function (codes) { return mcCtx('fan', { bs: (codes || []).map(n3Batch).filter(Boolean), sent: new Set() }, () => _n3MC.apply(this, arguments)); };
// Academic calendar "staff" filter: a batch matches every one of its Coordinators
const _kCalMC = kCalBody; kCalBody = function () { const fs = ui('kcS', ''); return mcAs(fs || null, () => _kCalMC.apply(this, arguments)); };
// The seeded office request (OR-101) is created for learner D's own Coordinator
const _seedQMC = chB7bSeedQ; chB7bSeedQ = function () { const w = STORE.worlds && STORE.worlds.D, p = MC_BOOT; MC_BOOT = true; let d; try { d = w && ADMIN && ADMIN.batches ? mcOf(w.me.id) : null; } finally { MC_BOOT = p; } return mcAs(d, () => _seedQMC.apply(this, arguments)); };

/* ---------- 4. Admin: Coordinators on the batch ---------- */
const mcCanWhy = () => w0BatchAdminWhy();
const mcEnt = b => `${b.label} (${b.code})`;
function mcCheckNew(b, name) {
  if (!name) return 'Choose an Academic Coordinator.';
  if (mcHas(b, name)) return `${name} is already an Academic Coordinator of ${b.code}.`;
  return s5HoldsWhy(name, 'Academic Coordinator') || w0P33Why(b, name);
}
function mcAddCoord(b, name, reason) {
  const ent = b ? mcEnt(b) : '—', why = !b ? 'Batch not found.' : mcCanWhy() || mcCheckNew(b, name) || (!String(reason || '').trim() ? 'A reason is required.' : '');
  if (why) return w0Deny('Batches', ent, 'Add an Academic Coordinator', why);
  mcSync(b); const at = now().toISOString();
  b.coords.push(name); (b.coordHistory = b.coordHistory || []).push([name, at, null]);
  logA('Batches', ent, 'Academic Coordinator added', '—', name, reason);
  mcNotify(name, 'Added as Coordinator', `${ent} — you share it with ${mcList(b).filter(c => c !== name).join(', ') || 'no one else'}. New learners are allocated to you as they join.`, 'c-batches.' + b.code);
  return true;
}
// Remove a Coordinator: their learners are reassigned first — shared across the others (balanced) or all to one named Coordinator
function mcRemovePlan(b, name, target) {
  const lids = mcLids(b).filter(l => b.mcA[l] && b.mcA[l].to === name), rest = mcList(b).filter(c => c !== name);
  const load = mcLoad(b); delete load[name];
  return lids.map(lid => { const to = target || rest.reduce((m, c) => (m === null || load[c] < load[m] ? c : m), null); if (mcActive(b, lid)) load[to]++; return [lid, to]; });
}
function mcRemoveCoord(b, name, reason, target) {
  const ent = b ? mcEnt(b) : '—';
  const why = !b ? 'Batch not found.' : mcCanWhy() || (!mcHas(b, name) ? `${name} isn't an Academic Coordinator of ${b.code}.` : mcList(b).length < 2 ? `${name} is the only Academic Coordinator of ${b.code}. Use "Change Academic Coordinator" to replace them, so the learners always have a Coordinator.` : target && (!mcHas(b, target) || target === name) ? 'Choose one of the other Coordinators of this batch.' : !String(reason || '').trim() ? 'A reason is required.' : '');
  if (why) return w0Deny('Batches', ent, 'Remove an Academic Coordinator', why);
  mcSync(b);
  const plan = mcRemovePlan(b, name, target), at = now().toISOString(), by = mcWho();
  plan.forEach(([lid, to]) => { b.mcA[lid] = { to, at, by, src: 'Coordinator removed: ' + reason }; b.mcH.push({ lid, from: name, to, at, by, reason, kind: 'remove' }); mcOrFollow(lid, to); });
  b.coords.splice(b.coords.indexOf(name), 1);
  (b.coordHistory || []).forEach(h => { if (h[0] === name && !h[2]) h[2] = at; });
  if (mcLids(b).some(l => b.mcA[l] && b.mcA[l].to === name)) throw new Error('MC: learners left with a removed Coordinator');
  const per = {}; plan.forEach(([, to]) => { per[to] = (per[to] || 0) + 1; });
  logA('Batches', ent, 'Academic Coordinator removed', name, '—', reason);
  if (plan.length) logA('Batches', ent, 'Learners reassigned to other Coordinators', `${plan.length} with ${name}`, Object.entries(per).map(([c, n]) => `${c}: ${n}`).join(' · '), reason);
  mcNotify(name, 'Removed as Coordinator', `${ent}. Feedback you already posted keeps your name.`, 'c-dashboard');
  Object.entries(per).forEach(([c, n]) => mcNotify(c, 'Learners allocated to you', `${ent}: ${plural(n, 'learner')} from ${name}.`, 'c-batches.' + b.code));
  plan.forEach(([lid, to]) => mcLearnerTold(lid, to));
  return true;
}
function mcReassign(b, lid, to, reason) {
  const ent = b ? `${mcName(b, lid)} (${lid}) · ${b.code}` : lid || '—', from = b && mcOf(lid, b);
  const why = !b ? 'Batch not found.' : mcCanWhy() || (!mcLids(b).includes(lid) ? 'This learner isn\'t in this batch.' : !mcHas(b, to) ? 'Choose one of this batch\'s Academic Coordinators.' : to === from ? `${to} is already this learner's Coordinator.` : !String(reason || '').trim() ? 'A reason is required.' : '');
  if (why) return w0Deny('Batches', ent, 'Reassign a learner\'s Academic Coordinator', why);
  const at = now().toISOString(), by = mcWho();
  b.mcA[lid] = { to, at, by, src: 'Reassigned: ' + reason }; b.mcH.push({ lid, from, to, at, by, reason, kind: 'manual' }); mcOrFollow(lid, to);
  logA('Batches', ent, 'Learner Coordinator reassigned', from || '—', to, reason);
  mcNotify(to, 'Learner allocated to you', `${mcName(b, lid)} (${b.code}) — from ${from || '—'}.`, 'c-learner.' + lid);
  if (from) mcNotify(from, 'Learner reassigned', `${mcName(b, lid)} (${b.code}) is now with ${to}. Your feedback keeps your name.`, 'c-batches.' + b.code);
  mcLearnerTold(lid, to);
  return true;
}
function mcLearnerTold(lid, to) { const v = chWorldKey(lid); if (v && STORE.worlds[v]) { mcPeopleSync(STORE.worlds[v]); notifyLearner(v, 'Other', 'Your Academic Coordinator has changed', `${to} is now your Academic Coordinator.`, 'courses'); } }

// Dialogs
const mcCoordOpts = (b, skip = []) => ADMIN.staff.filter(s => s.roles.includes('Academic Coordinator') && s.status === 'Active' && !mcHas(b, s.name) && !skip.includes(s.name)).map(s => s.name);
ACT.mcAdd = el => {
  const b = ADMIN.batches.find(x => x.code === (el && el.dataset && el.dataset.id)), why = !b ? 'Batch not found.' : mcCanWhy();
  if (why) return w0Deny('Batches', b ? mcEnt(b) : '—', 'Add an Academic Coordinator', why);
  const opts = mcCoordOpts(b);
  reasonDlg({ title: 'Add an Academic Coordinator — ' + esc(b.code), ok: 'Add Coordinator', extra: `<div class="field"><label for="mc-add">Academic Coordinator</label><select class="select" id="mc-add">${opts.map(n => `<option>${esc(n)}</option>`).join('')}</select></div><p class="small muted">Learners already in the batch keep their Coordinator. Learners who join from now on go to whichever Coordinator has the fewest active learners. To move a learner, use Reassign.</p>`,
    onOk: r => { const n = mval('#mc-add'); const p = mcCheckNew(b, n); if (p) { fieldErr('#mc-add', p); return false; } if (mcAddCoord(b, n, r) === false) return false; render(); toast(`${n} added. Existing learners keep their Coordinator.`); } });
};
ACT.mcRemove = el => {
  const b = ADMIN.batches.find(x => x.code === (el && el.dataset && el.dataset.id)), name = el && el.dataset && el.dataset.n;
  const why = !b ? 'Batch not found.' : mcCanWhy() || (!mcHas(b, name) ? `${name} isn't an Academic Coordinator of ${b.code}.` : mcList(b).length < 2 ? `${name} is the only Academic Coordinator of ${b.code}. Use "Change Academic Coordinator" to replace them.` : '');
  if (why) return w0Deny('Batches', b ? mcEnt(b) : '—', 'Remove an Academic Coordinator', why);
  mcSync(b);
  const rest = mcList(b).filter(c => c !== name), n = mcLids(b).filter(l => b.mcA[l] && b.mcA[l].to === name).length;
  reasonDlg({ title: `Remove ${esc(name)} — ${esc(b.code)}`, ok: 'Reassign and remove', danger: true,
    body: `<p class="small">${esc(name)} has ${plural(n, 'learner')} in this batch. They are reassigned before ${esc(name)} is removed, so no learner is left without a Coordinator. Their earlier feedback and decisions keep their name.</p>`,
    extra: n ? `<div class="field"><label for="mc-rm-to">Reassign their learners to</label><select class="select" id="mc-rm-to"><option value="">Share them across the other Coordinators (fewest active learners first)</option>${rest.map(c => `<option value="${esc(c)}">All to ${esc(c)}</option>`).join('')}</select></div>` : '',
    onOk: r => { if (mcRemoveCoord(b, name, r, mval('#mc-rm-to') || null) === false) return false; render(); toast(`${name} removed. ${plural(n, 'learner')} reassigned.`); } });
};
ACT.mcMove = el => {
  const b = ADMIN.batches.find(x => x.code === (el && el.dataset && el.dataset.id)), lid = el && el.dataset && el.dataset.l;
  const why = !b ? 'Batch not found.' : mcCanWhy() || (!mcLids(b).includes(lid) ? 'This learner isn\'t in this batch.' : !mcMulti(b) ? `${b.code} has one Academic Coordinator — add another first.` : '');
  if (why) return w0Deny('Batches', b ? `${lid || '—'} · ${b.code}` : '—', 'Reassign a learner\'s Academic Coordinator', why);
  const cur = mcOf(lid, b), opts = mcList(b).filter(c => c !== cur);
  reasonDlg({ title: `Reassign ${esc(mcName(b, lid))}`, ok: 'Reassign', body: `<p class="small">Current Academic Coordinator: <strong>${esc(cur || '—')}</strong>. Feedback, judgements and decisions already recorded keep the name of whoever made them.</p>`,
    extra: `<div class="field"><label for="mc-mv">New Academic Coordinator</label><select class="select" id="mc-mv">${opts.map(c => `<option>${esc(c)}</option>`).join('')}</select></div>`,
    onOk: r => { if (mcReassign(b, lid, mval('#mc-mv'), r) === false) return false; render(); toast(`${mcName(b, lid)} is now with ${mval('#mc-mv') || 'the new Coordinator'}.`); } });
};
function mcPanel(b) {
  mcSync(b);
  const can = !mcCanWhy(), lids = mcLids(b), load = mcLoad(b, lids), all = Object.fromEntries(mcList(b).map(c => [c, lids.filter(l => b.mcA[l] && b.mcA[l].to === c).length]));
  const rows = lids.map(lid => ({ lid, name: mcName(b, lid), st: mcStatus(b, lid), to: mcOf(lid, b), a: b.mcA[lid] }));
  const hist = b.mcH.filter(h => h.kind !== 'seed').slice(-8).reverse();
  return `<section class="card mc-panel"><div class="row-b"><h2>Academic Coordinators (${mcList(b).length})</h2>${can ? `<button class="btn btn-sm" data-act="mcAdd" data-id="${b.code}">${ic('plus', 14)}Add Coordinator</button>` : ''}</div>
    <p class="small muted">Each learner has one designated Coordinator from this list. A learner who joins goes to the Coordinator with the fewest active learners (ties: the one listed first). Existing allocations never move on their own.</p>
    ${mcList(b).length ? `<div class="tbl-wrap"><table class="tbl dense mc-load"><thead><tr><th>Coordinator</th><th class="r">Active learners</th><th class="r">All allocated</th><th><span class="sr">Actions</span></th></tr></thead><tbody>${mcList(b).map(c => `<tr><td><strong>${esc(c)}</strong></td><td class="r">${load[c]}</td><td class="r">${all[c]}</td><td class="r">${can && mcMulti(b) ? `<button class="btn btn-sm" data-act="mcRemove" data-id="${b.code}" data-n="${esc(c)}">Remove</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : `<p class="small">${chip('Not assigned', 'red')}</p>`}
    <h3 class="small">Learner allocation (${lids.length})</h3>
    ${dt({ id: 'mc-al-' + b.code, name: 'Learner allocation', rows, rid: r => r.lid, search: r => r.name + r.lid + (r.to || ''), noExport: true, filters: [{ k: 'c', l: 'Coordinator', get: r => r.to || '—', opts: mcList(b) }],
      cols: [{ k: 'name', l: 'Learner', h: r => `<strong>${esc(r.name)}</strong><div class="xs mono muted">${r.lid}</div>`, v: r => r.name }, { k: 'st', l: 'Enrolment', h: r => chip(r.st), v: r => r.st }, { k: 'to', l: 'Academic Coordinator', v: r => r.to || '—' }, { k: 'src', l: 'Since', h: r => r.a ? `<span class="xs">${fd(r.a.at)} · ${esc(r.a.src)}</span>` : '—', v: r => r.a ? r.a.at : '' }],
      act: r => can && mcMulti(b) ? `<button class="btn btn-sm" data-act="mcMove" data-id="${b.code}" data-l="${r.lid}">Reassign</button>` : '', empty: 'No learners in this batch yet' })}
    ${hist.length ? `<h3 class="small">Recent allocation changes</h3><ul class="list small">${hist.map(h => `<li class="li"><div class="li-b"><span>${esc(mcName(b, h.lid))}: ${esc(h.from || '—')} → <strong>${esc(h.to)}</strong></span><span class="xs muted">${fdt(h.at)} · ${esc(h.by)} · ${esc(h.reason)}</span></div></li>`).join('')}</ul>` : ''}</section>`;
}
const _aBatchMC = SCREENS['a-batches'];
SCREENS['a-batches'] = p => {
  let h = _aBatchMC(p); const b = p && p.id && ADMIN.batches.find(x => x.code === p.id); if (!b) return h;
  if ((p.tab || 'roster') === 'roster') return mcAdminRoster(h, b);
  if (p.tab !== 'staff') return h;
  mcSync(b);
  h = h.replace(/<dt>Academic Coordinator<\/dt><dd>([\s\S]*?)<\/dd>/, (m, inner) => mcMulti(b) ? `<dt>Academic Coordinators</dt><dd>${esc(mcList(b).join(', '))}</dd>` : m);
  const k = h.indexOf('</section>'); return k < 0 ? h + mcPanel(b) : h.slice(0, k + 10) + mcPanel(b) + h.slice(k + 10);
};
// Admin roster: members, unresolved entries and demonstration rows, each labelled; the counts explained
function mcAdminRoster(h, b) {
  mcSync(b);
  const k = h.indexOf('<h2>Roster ('), u = k < 0 ? -1 : h.indexOf('<ul class="list">', k), e = u < 0 ? -1 : h.indexOf('</ul>', u); if (e < 0) return h;
  const v = mcRosterView(b), src = lid => { const r = (b.roster || []).find(x => x[1] === lid); return r ? r[2] : 'Cohort'; };
  const li = (name, lid, sub, tag, link) => `<li class="li mc-r mc-r-${tag[1]}"><div class="li-b">${link ? `<a href="#a-learner.${lid}" data-go="a-learner" data-id="${lid}" class="strong">${esc(name)}</a>` : `<strong>${esc(name)}</strong>`}<span class="xs muted">${esc(lid || '—')} · ${esc(sub)}</span></div>${chip(tag[0], tag[2])}</li>`;
  const rows = v.members.map(l => li(mcName(b, l), l, `${src(l)} · Coordinator: ${mcOf(l, b) || 'not assigned'}`, ['Batch member', 'm', 'green'], true))
    .concat(v.unresolved.map(r => li(r[0] || 'Unnamed entry', r[1], `${r[2] || '—'} · no learner record — not allocated`, ['Unresolved historical roster entry', 'u', 'amber'], false)))
    .concat(v.demo.map(r => li(r[0], r[1], 'shown for demonstration — not part of this batch', ['Demonstration only', 'd', 'grey'], true)))
    .concat(v.uncounted ? [`<li class="li small muted mc-r mc-r-c">${plural(v.uncounted, 'further enrolment')} recorded on the batch without an identifiable learner (historical count) — not allocated</li>`] : []);
  return h.slice(0, u) + mcCountNote(b, 'admin') + '<ul class="list mc-roster">' + rows.join('') + h.slice(e);
}
// "Change Academic Coordinator" on a batch with several: choose which one is replaced; their learners move to the new one
const _ccMC = changeCoordinator;
changeCoordinator = function (code, to, reason, actor, from) {
  const b = ADMIN.batches.find(x => x.code === code); if (!b) return _ccMC.apply(this, arguments);
  mcSync(b); from = from || MC_FROM || b.coords[0];
  if (!mcMulti(b)) { const p = MC_BY; MC_BY = actor || null; try { return _ccMC.apply(this, arguments); } finally { MC_BY = p; } }
  const why = !mcHas(b, from) ? `${from} isn't an Academic Coordinator of ${b.code}.` : mcHas(b, to) ? `${to} is already an Academic Coordinator of ${b.code}.` : w0P33Why(b, to);
  if (why) return w0Deny('Batches', mcEnt(b), 'Change the Academic Coordinator', why);
  const at = now().toISOString(), p = MC_BY; MC_BY = actor || null;
  try { b.coords[b.coords.indexOf(from)] = to; mcMove(b, from, to, 'Academic Coordinator changed: ' + reason); } finally { MC_BY = p; }
  (b.coordHistory || []).forEach(h => { if (h[0] === from && !h[2]) h[2] = at; }); (b.coordHistory = b.coordHistory || []).push([to, at, null]);
  ADMIN.audit.unshift({ id: 'AU-' + (9700 + ADMIN.audit.length), actor: actor || ADMIN.me.name, role: actor ? 'System Administrator' : ADMIN.me.roles[0], at, module: 'Batches', entity: mcEnt(b), action: 'Academic Coordinator changed', before: from, after: to, reason, ip: '81.2.69.142' });
  mcNotify(from, 'Batch reassigned', `${mcEnt(b)}: your learners are now with ${to}. Your feedback stays attributed to you.`, 'c-dashboard');
  mcNotify(to, 'New batch assigned to you', `${mcEnt(b)} — the learners of ${from}`, 'c-batches.' + b.code);
};
const _chgMC = ACT.changeCoord;
ACT.changeCoord = (el, e) => {
  const b = ADMIN.batches.find(x => x.code === (el && el.dataset && el.dataset.id)), r = _chgMC(el, e);
  if (!b || !MODAL || !mcMulti(b) || !$('#modal-root #cc-to')) return r;
  [...document.querySelectorAll('#modal-root #cc-to option')].filter(o => mcHas(b, o.value)).forEach(o => o.remove());
  $('#modal-root #cc-to').closest('.field').insertAdjacentHTML('beforebegin', `<div class="field"><label for="cc-from">Replace</label><select class="select" id="cc-from">${mcList(b).map(c => `<option>${esc(c)}</option>`).join('')}</select><span class="hint">Their learners move to the new Coordinator.</span></div>`);
  MODAL.body = $('#modal-root .modal-b').innerHTML;
  const a = MODAL.actions.find(x => x.cls && /primary/.test(x.cls)); if (a && a.fn) { const g = a.fn; a.fn = (...x) => { MC_FROM = mval('#cc-from'); try { return g(...x); } finally { MC_FROM = null; } }; }
  return r;
};
// "Change staff allocations": with several Coordinators, the list is managed in the Academic Coordinators panel
const _bsMC = ACT.batchStaff;
ACT.batchStaff = (el, e) => {
  const b = ADMIN.batches.find(x => x.code === (el && el.dataset && el.dataset.id)), r = _bsMC(el, e);
  if (b && MODAL && mcMulti(b) && $('#modal-root #bs-c')) { const f = $('#modal-root #bs-c').closest('.field'); f.outerHTML = `<input type="hidden" id="bs-c" value="${esc(b.coord || '')}"><p class="small muted mc-bs-note">${ic('users', 13)} ${esc(b.code)} has ${mcList(b).length} Academic Coordinators — add, remove or reassign them in the Academic Coordinators panel.</p>`; MODAL.body = $('#modal-root .modal-b').innerHTML; }
  return r;
};
// Workload on the staff pages: a batch counts for every Coordinator on it
const _slMC = staffLoad;
staffLoad = function (s) { const r = _slMC.apply(this, arguments); r.allocs += ADMIN.batches.filter(b => mcHas(b, s.name) && b.coord !== s.name).length; return r; };

/* ---------- 5. Create batch: one or more Coordinators ---------- */
let MC_NB = null;
const _nbMC = ACT.newBatch; ACT.newBatch = function () { MC_NB = { code: '', extra: [] }; return _nbMC.apply(this, arguments); };
const _omMC = openModal;
openModal = function (m) {
  if (m && MC_NB && /^Create batch — step 1 of 5$/.test(m.title || '')) (m.actions || []).forEach(a => { if (a.fn && a.cls && /primary/.test(a.cls)) { const g = a.fn; a.fn = (...x) => { MC_NB.code = (mval('#nb-c') || '').toUpperCase(); return g(...x); }; } });
  if (m && MC_NB && /^Create batch — step 2 of 5$/.test(m.title || '') && typeof m.body === 'string') {
    const names = ADMIN.staff.filter(s => s.roles.includes('Academic Coordinator') && s.status === 'Active').map(s => s.name);
    m.body = m.body.replace(/(<label for="nb-ac">)Academic Coordinator \(required\)(<\/label>)/, '$1Academic Coordinator (required)$2').replace(/(<select class="select" id="nb-ac">[\s\S]*?<\/select><\/div>)/, `$1<fieldset class="field full mc-nb" style="border:0;padding:0"><legend class="lbl">More Academic Coordinators (optional)</legend><p class="xs muted">Each learner gets one designated Coordinator. Learners are shared out as they join — whoever has the fewest active learners.</p><div class="row">${names.map(n => `<label class="check"><input type="checkbox" class="mc-nb-c" value="${esc(n)}" ${MC_NB.extra.includes(n) ? 'checked' : ''}>${esc(n)}</label>`).join('')}</div></fieldset>`);
    (m.actions || []).forEach(a => { if (a.fn && a.cls && /primary/.test(a.cls)) { const g = a.fn; a.fn = (...x) => {
      const first = mval('#nb-ac'), extra = $$('#modal-root .mc-nb-c:checked').map(i => i.value).filter(n => n !== first), as = $$('#modal-root .nb-a:checked').map(i => i.value);
      const bad = extra.find(n => as.includes(n)); if (bad) { const why = `${bad} is an assessor on this batch, so they can't also be its Academic Coordinator. ${CH_P33}`; w0Log('Batches', MC_NB.code || 'New batch', 'Blocked: Coordinator as assessor', '—', bad, why); fieldErr('#modal-root .mc-nb-c', why); toast(why, 'err'); return false; }
      const off = extra.find(n => s5HoldsWhy(n, 'Academic Coordinator')); if (off) { toast(s5HoldsWhy(off, 'Academic Coordinator'), 'err'); return false; }
      const r = g(...x); if (r !== false) MC_NB.extra = extra; return r; }; } });
  }
  if (m && MC_NB && /^Create batch — step 5 of 5$/.test(m.title || '') && typeof m.body === 'string' && MC_NB.extra.length) m.body = m.body.replace(/<dt>Academic Coordinator<\/dt><dd>([^<]*)<\/dd>/, (x, c) => `<dt>Academic Coordinators</dt><dd class="mc-nb-rev">${esc([c].concat(MC_NB.extra).join(', '))}</dd>`);
  return _omMC.apply(this, arguments);
};
const _syncMC = syncTasBatches;
syncTasBatches = function () {
  if (MC_NB && MC_NB.code) { const nb = MC_NB, b = (ADMIN.batches || []).find(x => x.code === nb.code && x.created && !x._mcNb);
    if (b) { MC_NB = null; mcNorm(b); Object.defineProperty(b, '_mcNb', { value: true });
      const add = nb.extra.filter(n => !mcHas(b, n)); if (add.length) { const at = now().toISOString(); add.forEach(n => { b.coords.push(n); (b.coordHistory = b.coordHistory || [[b.coords[0], at, null]]).push([n, at, null]); mcNotify(n, 'New batch assigned to you', `${mcEnt(b)} — one of ${b.coords.length} Academic Coordinators`, 'c-batches.' + b.code); }); if (!b.coordHistory.some(h => h[0] === b.coords[0])) b.coordHistory.unshift([b.coords[0], at, null]); logA('Batches', mcEnt(b), 'Academic Coordinators set', '—', b.coords.join(', '), 'Batch created'); } } }
  return _syncMC.apply(this, arguments);
};

/* ---------- 6. P-33 with several Coordinators: none of them may be the batch's assessor ---------- */
const _panelMC = chAssessPanel;
chAssessPanel = function (b) { let h = _panelMC.apply(this, arguments); if (!b || !mcMulti(b)) return h; mcList(b).forEach(c => { h = h.split(/(<option[^>]*>[^<]*<\/option>)/).filter(x => !(x.startsWith('<option') && x.replace(/<[^>]+>/g, '') === esc(c))).join(''); }); return h; };
const _saveMC = ACT.chAssessSave;
ACT.chAssessSave = el => { const b = ADMIN.batches.find(x => x.code === (el && el.dataset && el.dataset.b)); const c = b && mcList(b).find(n => CH_AROLES.some(([k]) => ($('#ch-as-' + k) || {}).value === n)); if (c) { chAudit('Batches', mcEnt(b), 'Blocked: Coordinator as assessor', '—', c, CH_P33); toast(CH_P33, 'err'); return; } return _saveMC(el); };
const _r3MC = r3OutWhy;
r3OutWhy = function (key) { const w = _r3MC.apply(this, arguments); if (w) return w; const s = chRaw(() => tasSubs(true).find(x => x.key === key)); return s && s.L.batch && mcHas(s.L.batch, TME().name) ? 'An Academic Coordinator of this batch can\'t declare outcomes for it (P-33).' : ''; };

/* ---------- 7. Coordinator portal ---------- */
const _mbMC = myBatches;
myBatches = function () {
  if (S.coo.edge === 'noBatches') return [];
  const me = CME().name, r = ADMIN.batches.filter(b => mcHas(b, me) || (S.coo.edge === 'completed' && b.code === 'L2DC-SEP25' && me === 'Dr Helen Carter'));
  if (!MC_STRICT) return r;
  const b = chBatchOfLid(MC_STRICT); return b && mcOf(MC_STRICT, b) !== me ? r.filter(x => x !== b) : r;
};
void _mbMC;
// Learner-specific decisions are the designated Coordinator's (batch-wide academic work stays open to every Coordinator)
const mcNotMineWhy = lid => { if (S.portal !== 'coord' || !lid) return ''; const b = chBatchOfLid(lid); if (!b || !mcHas(b, CME().name)) return ''; const d = mcOf(lid, b); return d && d !== CME().name ? `Only ${d}, this learner's Academic Coordinator, can do this.` : ''; };
const mcDesignatedOnly = (k, lidOf, what) => { const f = ACT[k]; if (!f) return; ACT[k] = (el, e) => {
  const lid = lidOf(el), why = mcNotMineWhy(lid); if (why) return w0Deny('Learners', `${lid ? chLidName(lid) : '—'} (${lid || '—'})`, what, why);
  const r = mcStrict(lid, () => f(el, e)); if (MODAL && lid) w0OnConfirm(() => { const w = mcNotMineWhy(lid); return w ? w0Deny('Learners', `${chLidName(lid)} (${lid})`, what, w) || true : false; }); return r; }; };
const mcOrLid = el => { const i = qItem(el && el.dataset && el.dataset.id), r = i && chOrOf((i.data || {}).req); return r ? r.lid : null; };
mcDesignatedOnly('chOrDecide', mcOrLid, 'Decide an Academy-office observation');
mcDesignatedOnly('chOrAdvise', el => el && el.dataset && el.dataset.id, 'Advise an Academy-office observation');
mcDesignatedOnly('dObsLoc', el => el && el.dataset && el.dataset.l, 'Choose an observation location');
mcDesignatedOnly('chOvSet', el => el && el.dataset && el.dataset.l, 'Change a learner\'s assessor');
mcDesignatedOnly('chOvReset', el => el && el.dataset && el.dataset.l, 'Reset a learner\'s assessor');
// A per-learner assessor override can't name any Coordinator of the batch (P-33)
const _ovMC = ACT.chOvSet;
ACT.chOvSet = (el, e) => {
  const r = _ovMC(el, e), b = chBatchOfLid(el && el.dataset && el.dataset.l); if (!MODAL || !b || !mcMulti(b)) return r;
  [...document.querySelectorAll('#modal-root #ch-ov-n option')].filter(o => mcHas(b, o.value)).forEach(o => o.remove());
  w0OnConfirm(() => { const n = mval('#ch-ov-n'); if (!mcHas(b, n)) return false; chAudit('Batches', el.dataset.l, 'Blocked: Coordinator as assessor', '—', n, CH_P33); fieldErr('#ch-ov-n', CH_P33); return true; });
  return r;
};
// Cards on the learner record: read-only for a Coordinator who isn't the learner's
const _ovCardMC = chOvCard; chOvCard = lid => mcStrict(lid, () => _ovCardMC(lid));
const _dCardMC = dCoordCard; dCoordCard = lid => mcStrict(lid, () => _dCardMC(lid)).replace('The learner\'s Academic Coordinator chooses the locations.', `The learner's Academic Coordinator (${esc(mcOf(lid) || '—')}) chooses the locations.`);
const _orCardMC = chOrCoordCard;
chOrCoordCard = function (lid) {
  const h = _orCardMC.apply(this, arguments); if (!mcNotMineWhy(lid)) return h;
  const note = `<p class="xs muted mc-or-note">${ic('lock', 12)} Advised and decided by ${esc(mcOf(lid))}, this learner's Academic Coordinator.</p>`;
  return h.replace(/<div class="row"><button class="btn btn-sm btn-primary" data-act="chOrDecide"[\s\S]*?<\/div>/, '').replace(/<button class="btn btn-sm" data-act="chOrAdvise"[^>]*>[^<]*<\/button>/, '').replace(/<\/section>$/, note + '</section>');
};
// A shared class organised by the batch: any of its Coordinators may move it
const _edMC = ACT.cooEditEv; ACT.cooEditEv = (el, e) => mcAs(S.portal === 'coord' ? CME().name : null, () => _edMC(el, e));
// A new office-observation request goes to the learner's own Coordinator
const _orCreateMC = chOrCreate; chOrCreate = function (lid) { return mcAs(mcOf(lid), () => _orCreateMC.apply(this, arguments)); };
// Messages to learners: the designated Coordinator only
const _crMC = cooRecipients;
cooRecipients = function () { const me = CME().name, mine = new Set(myLearners(true).filter(l => mcOf(l.lid, l.batch) === me).map(l => l.name + ' (Learner)')), all = new Set(myLearners(true).map(l => l.name + ' (Learner)')); return _crMC.apply(this, arguments).filter(r => !all.has(r) || mine.has(r)); };
const _cmMC = cooComposeModal;
cooComposeModal = function () { const r = _cmMC.apply(this, arguments); w0OnConfirm(() => { const to = mval('#cm-to'); if (!/ \(Learner\)$/.test(to) || cooRecipients().includes(to)) return false; return w0Deny('Messages', to, 'Message a learner', 'Only the learner\'s own Academic Coordinator messages them. Ask their Coordinator, or the Academic Admin.') || true; }); return r; };

// Roster: "My learner" tag, My learners / All batch learners, and the counts
const _rtMC = rosterTable;
rosterTable = function (ls, id) {
  if (S.portal !== 'coord') return _rtMC.apply(this, arguments);
  const me = CME().name, real = ls.filter(l => mcKnown(l.lid)), mine = real.filter(l => mcOf(l.lid, l.batch) === me), sc = ui('mcSc-' + id, 'all'), rows = sc === 'mine' ? mine : ls;
  let h = _rtMC.call(this, rows, id);
  rows.forEach(l => { const d = mcKnown(l.lid) && mcOf(l.lid, l.batch), tag = !mcKnown(l.lid) ? `<span class="mc-tag">${chip('Unresolved roster entry — not allocated', 'amber')}</span>` : d === me ? `<span class="mc-tag">${chip('My learner', 'green')}</span>` : `<span class="xs muted mc-tag">Coordinator: ${esc(d || '—')}</span>`; h = h.split(`<div class="xs mono muted">${l.lid}</div>`).join(`<div class="xs mono muted">${l.lid}</div>${tag}`); });
  const one = id.startsWith('roster-') && ADMIN.batches.find(b => 'roster-' + b.code === id);
  const bar = `<div class="mc-scope row-b"><div role="tablist" aria-label="Which learners" class="tabs">${[['mine', 'My learners', mine.length], ['all', one ? 'All batch learners' : 'All learners in my batches', real.length]].map(([k, l, n]) => `<button class="tab" role="tab" aria-selected="${k === sc}" data-act="mcScope" data-t="${id}" data-k="${k}">${l}<span class="cnt">${n}</span></button>`).join('')}</div><p class="small mc-count"><strong>${mine.length}</strong> of <strong>${real.length}</strong> learners are allocated to you</p></div>`;
  return bar + (one ? mcCountNote(one, 'coord') : '') + h;
};
ACT.mcScope = el => { setUi('mcSc-' + el.dataset.t, el.dataset.k); render(); };
// Learner record: who the learner's Coordinator is; contact details and messaging for that Coordinator only; admission status only
function mcAdmStatus(lid) {
  const v = chWorldKey(lid), w = v && STORE.worlds[v];
  if (w && w.docs && w.docs.length) { const m = w.docs.filter(d => d.mand); return m.length && m.every(d => d.status === 'Approved') ? ['Admission documents verified', 'green'] : ['Admission documents not yet verified', 'amber']; }
  const L = (ADMIN.learners.find(x => x.id === lid) || {}), app = (ADMIN.apps || []).find(a => a.name === L.name);
  if (app) return app.docsOk >= app.docsAll ? ['Admission documents verified', 'green'] : ['Admission documents not yet verified', 'amber'];
  return ['Admission documents verified', 'green'];
}
const _clMC = SCREENS['c-learner'];
SCREENS['c-learner'] = p => {
  let h = _clMC(p); const L = p && p.id && myLearners(true).find(l => l.lid === p.id); if (!L || (p.tab && p.tab !== 'summary')) return h;
  const d = mcOf(L.lid, L.batch), mine = d === CME().name, [adm, tone] = mcAdmStatus(L.lid);
  h = h.replace(/(<dt>Batch<\/dt><dd>[^<]*<\/dd>)/, `$1<dt>Academic Coordinator</dt><dd class="mc-who">${esc(d || '—')}${mine ? ' (me) ' + chip('My learner', 'green') : ''}</dd><dt>Admission documents</dt><dd class="mc-adm">${chip(adm, tone)}<div class="xs muted">Status only — the files are held by the Admissions team.</div></dd>`);
  if (mine && !L.email) { const em = (ADMIN.learners.find(x => x.id === L.lid) || {}).email; if (em) h = h.replace(/<dt>Email<\/dt><dd>[^<]*<\/dd>/, `<dt>Email</dt><dd>${esc(em)}</dd>`); } // roster learners carry no email on the portal row
  if (!mine) h = h.replace(/<dt>Email<\/dt><dd>[^<]*<\/dd>/, `<dt>Contact details</dt><dd class="small muted mc-nocontact">Shown to ${esc(d || 'the learner\'s Coordinator')}, this learner's Coordinator.</dd>`)
    .replace(/<button class="btn btn-sm btn-primary" data-act="cooCompose"[^>]*>[\s\S]*?<\/button>/, '');
  return h;
};
// Batch: the Coordinators of the batch in its staff team; my caseload on the overview; the "no longer" page lists who now coordinates
const _cbMC = SCREENS['c-batches'];
SCREENS['c-batches'] = p => {
  let h = _cbMC(p); const b = p && p.id && ADMIN.batches.find(x => x.code === p.id); if (!b) return h;
  if (!mcHas(b, CME().name)) return h.replace(/is now coordinated by [^.<]*\./, `is now coordinated by ${esc(mcList(b).join(', ') || '—')}.`);
  if ((p.tab || 'overview') !== 'overview') return h;
  const me = CME().name, others = mcList(b).filter(c => c !== me), lids = mcLids(b), n = lids.filter(l => mcOf(l, b) === me).length;
  h = h.replace(/(<span class="xs muted">Academic Coordinator \(me\)<\/span><\/div><\/li>)/, `$1${others.map(c => `<li class="li"><div class="li-b"><strong>${esc(c)}</strong><span class="xs muted">Academic Coordinator</span></div></li>`).join('')}`);
  return h.replace(/(<dt>Capacity<\/dt><dd>[^<]*<\/dd>)/, `$1<dt>My learners</dt><dd class="mc-mine">${n} of ${lids.length}${others.length ? ` · ${plural(mcList(b).length, 'Coordinator')}` : ''}</dd>`);
};
// Dashboard: my caseload per batch; office-observation decisions only for my learners
const _cdMC = SCREENS['c-dashboard'];
SCREENS['c-dashboard'] = p => {
  let h = _cdMC(p); const me = CME().name, bs = scopeBatches();
  h = h.replace(/<li class="li"><div class="li-b"><a href="#c-learner\.([^"]+)" data-go="c-learner"[^>]*>[^<]*<\/a><span class="small muted">[^<]*<\/span><\/div><button class="btn btn-sm btn-primary" data-act="chOrDecide"[\s\S]*?<\/li>/g, (m, lid) => (mcNotMineWhy(lid) ? '' : m));
  if (!bs.some(mcMulti)) return h;
  const card = `<section class="card mc-caseload"><h2>${ic('users')} My caseload</h2><ul class="list small">${bs.map(b => { const l = mcLids(b), n = l.filter(x => mcOf(x, b) === me).length; return `<li class="li"><div class="li-b"><strong>${esc(b.label)}</strong><span class="xs muted">${b.code} · ${plural(mcList(b).length, 'Coordinator')}</span></div><span>${n} of ${l.length} learners are mine</span><button class="btn btn-sm" data-go="c-batches" data-id="${b.code}" data-tab="roster">Roster</button></li>`; }).join('')}</ul></section>`;
  return chAfterHead(h, card);
};

/* ---------- 8. Learner portal: only their own Coordinator ---------- */
function mcPeopleSync(w) {
  if (!w || !w.nvq || !Array.isArray(w.nvq.people) || !w.me) return;
  const b = chBatchOfLid(w.me.id), d = b && mcOf(w.me.id, b); if (!d) return;
  const rest = w.nvq.people.filter(([r]) => r !== 'Academic Coordinator');
  if (w.nvq.people.length === rest.length + 1 && w.nvq.people.some(([r, n]) => r === 'Academic Coordinator' && n === d)) return;
  w.nvq.people = [['Academic Coordinator', d]].concat(rest);
}
const mcStaffEmail = n => ((ADMIN.staff.find(s => s.name === n && s.status === 'Active') || Object.values(COO_USERS).find(u => u.name === n) || {}).email) || '';
const _phMC = pageHtml;
pageHtml = function () {
  if (S.portal === 'learner' && W) mcPeopleSync(W);
  let h = _phMC.apply(this, arguments);
  if (S.portal === 'learner' && W && W.nvq && W.nvq.people) { const c = (W.nvq.people.find(([r]) => r === 'Academic Coordinator') || [])[1], em = c && mcStaffEmail(c);
    if (em) h = h.replace('<span class="small muted">Academic Coordinator</span></div>', `<span class="small muted">Academic Coordinator</span><a class="xs mc-contact" href="mailto:${esc(em)}">${esc(em)}</a></div>`); }
  return h;
};
const _rgMC = recipientGroups;
recipientGroups = function () { if (W) mcPeopleSync(W); return _rgMC.apply(this, arguments); };
const _compMC = ACT.compose;
ACT.compose = (el, e) => { const r = _compMC(el, e); if (MODAL && S.portal === 'learner') w0OnConfirm(() => { const to = mval('#m-to'); return recipients().includes(to) ? false : w0Deny('Messages', to || '—', 'Send a message', 'You can message your own teachers, assessors and Coordinator, or an Academic Admin.') || true; }); return r; };

/* ---------- 9. Documents: access by record, never by file name ----------
   In the Coordinator and Teacher/Assessor portals a file opens only through the record it belongs to, and only for someone that record's
   existing permission covers:
     - assignment answer attachments: through the attachment record (W0 — `w0AttOpen` and its role check);
     - a course resource of an assignment (src "res"): from a submission the viewer is allowed to mark or comment on;
     - the supporting evidence of an academic Approvals item (src "q"): an item the viewer raised, of an academic type.
   Admission / onboarding uploads (any file on a learner's admission record or an application) are private wherever their name appears;
   a matching name never makes them academic. Anything else has no known record: it isn't shown and is queued for review. Admin roles
   keep their existing access. Logs and the review queue never carry the file name. */
const MC_ACAD_Q = ['Data correction', 'Resubmission limit reached', 'Discontinue enrolment — academic', 'Reactivate enrolment — academic'];
function mcPrivNames() {
  const s = new Set(); Object.values(STORE.worlds || {}).forEach(w => (w.docs || []).forEach(d => { if (d.file) s.add(d.file); (d.versions || []).forEach(v => s.add(v[0])); if (d.replacement && d.replacement.file) s.add(d.replacement.file); }));
  (ADMIN.apps || []).forEach(a => (a.docs || []).forEach(d => { if (d.file) s.add(d.file); (d.versions || []).forEach(v => s.add(v[0])); }));
  return s;
}
const mcAsgSheet = d => (d && d.asg ? d.asg : 'answer-sheet').replace(/\W+/g, '_') + '.pdf';
// The record a file request names, checked against what the viewer may see; null = no such record for this viewer
function mcDocRecord(ds) {
  const f = ds && ds.f, src = ds && ds.src;
  if (!f || !src) return null;
  if (src === 'res') {
    const s = (S.portal === 'staff' ? tasSubs(true) : mySubmissions(true)).find(x => x.key === ds.k); // the viewer's own scoped list
    const a = s && (S.portal === 'staff' ? tasAsg(s) : synthAsg(s)); return a && (a.resources || []).some(([n]) => n === f) ? { kind: 'Course resource', lid: s.L.lid } : null;
  }
  if (src === 'q' && S.portal === 'staff') {
    const i = allQueue().find(x => x.id === ds.q); if (!i || i.raisedBy !== TME().name || !MC_ACAD_Q.includes(i.type)) return null;
    return f === `evidence_${i.id}.pdf` || f === mcAsgSheet(i.data) ? { kind: 'Approvals evidence', lid: (i.data || {}).lid || null } : null;
  }
  return null;
}
// 'private' (an admission / onboarding upload), 'academic' (a record the viewer is allowed to open) or 'unknown'
function mcDocClass(ds) { const f = ds && ds.f; if (f && mcPrivNames().has(f)) return 'private'; return mcDocRecord(ds) ? 'academic' : 'unknown'; }
function mcDocWhy(ds) {
  if (!['coord', 'staff'].includes(S.portal)) return '';
  const c = mcDocClass(ds);
  if (c === 'private') return 'Admission and personal documents are only opened by staff with admissions permission. Academic staff see the verification status only.';
  if (c === 'unknown') return 'This file isn\'t linked to an academic record you can open, so it isn\'t shown. It has been sent for classification review.';
  return '';
}
function mcDocDeny(ds, what) {
  const c = mcDocClass(ds), f = (ds && ds.f) || '';
  if (c === 'unknown') { const n = (STORE.mcDocReview = STORE.mcDocReview || []).length + 1; STORE.mcDocReview.push({ ref: 'DOC-REV-' + n, fp: f ? hashN(f).toString(36) : '—', src: (ds && ds.src) || 'none', portal: S.portal, by: w0Who().name, at: now().toISOString() }); ADMIN.security.unshift({ id: 'SE-MC-' + ADMIN.security.length, sev: 'Low', at: now().toISOString(), type: 'Document classification review', detail: `A file requested from the ${S.portal === 'coord' ? 'Coordinator' : 'Teacher/Assessor'} portal has no academic record behind it, so it wasn't shown (DOC-REV-${n}).`, reviewed: false }); }
  return w0Deny('Documents', c === 'private' ? 'Restricted learner document' : 'Unclassified file', what, mcDocWhy(ds));
}
[['viewFile', 'Open a document'], ['fakeDl', 'Download a document']].forEach(([k, what]) => { const f = ACT[k]; if (!f) return; ACT[k] = (el, e) => { const ds = (el && el.dataset) || {}; if (mcDocWhy(ds)) return mcDocDeny(ds, what); if (['coord', 'staff'].includes(S.portal)) w0Log('Assessment Records', mcDocRecord(ds).kind, 'File opened', '—', '—', `Learner ${mcDocRecord(ds).lid || '—'}`); return f(el, e); }; });
// The buttons the academic portals render carry their record
const _tMarkMC = SCREENS['t-mark'];
SCREENS['t-mark'] = p => { const h = _tMarkMC(p); return p && p.id ? h.replace(/data-act="fakeDl" data-f="/g, `data-act="fakeDl" data-src="res" data-k="${esc(p.id)}" data-f="`) : h; };
const _tApprMC = SCREENS['t-approvals'];
SCREENS['t-approvals'] = p => { const h = _tApprMC(p); return p && p.id ? h.replace(/data-act="viewFile" data-f="/g, `data-act="viewFile" data-src="q" data-q="${esc(p.id)}" data-f="`) : h; };
// Attachments (W0): the stored record must exist; its role check is unchanged
const _attMC = ACT.w0AttOpen;
ACT.w0AttOpen = (el, e) => { const id = el && el.dataset && el.dataset.id; if (['coord', 'staff'].includes(S.portal) && !w0Rec(id)) return mcDocDeny({ src: 'att' }, 'Open an assignment attachment'); return _attMC(el, e); };
// The learner's own document preview, and the admissions decisions, are never run from the academic portals
const mcAdmWhy = () => (['coord', 'staff'].includes(S.portal) ? 'Admission and personal documents are only handled by staff with admissions permission.' : '');
const _csMC = ACT.csDoc; ACT.csDoc = (el, e) => (S.portal !== 'learner' ? w0Deny('Documents', 'Restricted learner document', 'Preview a learner document', mcAdmWhy() || 'Learner documents are previewed by the learner in their portal, or by admissions staff in Admissions & Documents.') : _csMC(el, e));
['docDec', 'appApprove', 'appReject', 'appWithdraw', 'replaceDoc', 'approveAllDocs'].forEach(k => { const f = ACT[k]; if (!f) return; ACT[k] = (el, e) => (mcAdmWhy() ? w0Deny('Documents', 'Restricted learner document', 'Handle admission documents', mcAdmWhy()) : f(el, e)); });

/* ---------- Records ---------- */
UXC.push(['MC', 'Multiple Academic Coordinators per batch; learner document privacy (23 Oct 2026)', [
  'Create batch: one required Academic Coordinator plus any number of further Coordinators. Batch → Staff: an "Academic Coordinators" panel lists each Coordinator\'s active and allocated learners, every learner\'s designated Coordinator, Add Coordinator, Remove (their learners are shared across the others or all moved to one, before removal) and Reassign (one learner, with a reason). Every change is audited; earlier feedback and decisions keep their author.',
  'Allocation: a learner who joins goes to the Coordinator with the fewest active learners (ties: the one listed first). Existing allocations never move because someone else joins. A one-Coordinator batch works as before.',
  'Coordinator portal: every Coordinator of a batch sees its full roster with a "My learner" tag, can switch between My learners and All batch learners, and sees "n of m learners are allocated to you". Assignment feedback works across the batch. Messaging a learner, observation locations, Academy-office observation decisions and per-learner assessor overrides are the designated Coordinator\'s only (refused and logged otherwise). Contact details show for the Coordinator\'s own learners.',
  'Learner portal: "Your people" and the message recipients show only the learner\'s own Coordinator, with their Academy email. A change of Coordinator updates this without rewriting earlier messages or feedback.',
  'Documents (final correction): in the Coordinator and Teacher/Assessor portals a file opens only through the record it belongs to — an answer attachment through its attachment record, a course resource from a submission the viewer marks, Approvals evidence from an academic item they raised. A file recorded as an admission or onboarding upload is refused wherever its name appears, and a name on its own opens nothing; such requests are queued for classification review. Refusals are logged without the file name. Admin roles keep their access. The learner record shows "Admission documents verified" (status only).',
  'Rosters (final correction): the members of a batch are its identified learners — the ones allocated to Coordinators. The admin roster labels each row Batch member, Unresolved historical roster entry or Demonstration only, and explains enrolments counted without a learner record; the Coordinator roster shows the same member count and note.',
  'Legacy Coordinator field (final correction): kept only as a batch-level display fallback (the first listed Coordinator). Learner notifications, office-observation requests and their queue owner, seat-release and batch-move notices, contact details, messaging and observation decisions use the learner\'s own Coordinator; schedule notices reach every Coordinator of the batch.']]);
const _aIdxMC = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxMC(p) + `<section class="card idx-sec"><h2>MC — Multiple Academic Coordinators</h2><ul class="idx-list">${chIdxLi('Batch → Staff — Academic Coordinators panel', { act: 'aJump', t: 'a-batches.L3AC-JAN26.staff' }, 'MC — add, remove and reassign Coordinators; each learner\'s designated Coordinator.')}</ul></section>`;

if (typeof STORE !== 'undefined' && STORE.worlds && typeof ADMIN !== 'undefined' && ADMIN) { mcBootAll(); mcNotifHook(); }
