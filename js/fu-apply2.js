/* ============================================================
   Follow-up decisions — Step 2, continued: mock learner Priya Nair, F5 (Coordinator edits),
   F10 (Super Admin notifications). Loads after fu-apply.js.
   ============================================================ */
'use strict';

/* ---------- Mock learner Priya Nair (world H) ----------
   CH-01 / CH-02: a plain UK learner — country set at registration, everything in GBP (the F1 moved-country state is removed). */
const PRIYA = { id: 'IA-L-40990', first: 'Priya', last: 'Nair', email: 'priya.nair@example.com', mobile: '+44 7700 900877', dob: '22 Jun 1994', address: '18 Kings Road, Reading', postcode: 'RG1 3AB', country: 'United Kingdom', tz: 'Europe/London', cur: 'GBP', joined: '12 Mar 2026', referral: 'Self-registration', sponsor: null };
const PRIYA_JOINED = '2026-03-12T09:00:00.000Z';
function fuShortEnrol(id, base, at, status) {
  const tpl = STORE.worlds.A.enrolments.find(e => e.kind === 'short' && (e.base || e.title).startsWith(base)) || STORE.worlds.A.enrolments.find(e => e.kind === 'short');
  const e = JSON.parse(JSON.stringify(tpl)), price = coursePrice(base);
  return Object.assign(e, { id, base, title: base, status, enrolled: at, start: at, end: new Date(new Date(at).getTime() + 365 * DAY).toISOString(), progress: 20, sponsor: null, price, cur: 'GBP', certId: undefined, completedAt: undefined, reason: undefined, quiz: { ...e.quiz, attempts: [] }, reqs: (e.reqs || []).map(([r]) => [r, false]) });
}
function fuPriya() {
  PERSONAS.H = { ...PRIYA };
  VARIANTS.H = { nvq: false, fresh: true };
  const w = STORE.worlds.H = makeWorld('H'), t0 = '2026-03-14T10:00:00.000Z', t1 = D(-6, '11:20');
  Object.assign(w, { enrolments: [], certs: [], tx: [], plans: [], threads: [], requests: [], attendance: [], resources: [], events: [], payOverdue: null, referral: null });
  const e1 = fuShortEnrol('pn1', 'Moving and Handling People', t0, 'Active'), e2 = fuShortEnrol('pn2', 'Fire Safety Awareness', t1, 'Active');
  w.enrolments.push(e2, e1);
  w.plans.push({ e: 'pn2', title: e2.title, plan: 'One-time payment', cur: 'GBP', rows: [{ n: 1, amount: e2.price, due: t1, status: 'Paid', paid: e2.price, receipt: 'RCP-40995' }] }, { e: 'pn1', title: e1.title, plan: 'One-time payment', cur: 'GBP', rows: [{ n: 1, amount: e1.price, due: t0, status: 'Paid', paid: e1.price, receipt: 'RCP-40991' }] });
  w.tx.push({ at: t1, ref: 'TXN-40995', method: 'Visa •••• 2290', amount: e2.price, status: 'Succeeded', desc: e2.title, cur: 'GBP' }, { at: t0, ref: 'TXN-40991', method: 'Visa •••• 2290', amount: e1.price, status: 'Succeeded', desc: e1.title, cur: 'GBP' });
  w.notifs = [{ id: 'nph', cat: 'Account', title: 'Welcome to Illumin Academy', body: 'Browse courses to get started.', at: PRIYA_JOINED, unread: false, go: 'browse' }];
  STORE.acct.H = 'Active'; return w;
}
const _isFu = initStore; initStore = function () { _isFu(); fuPriya(); };
if (typeof STORE !== 'undefined' && STORE.worlds && !STORE.worlds.H) fuPriya();

/* ---------- F5 Coordinator edits own batch; last save wins; both versions kept; the other party is told ---------- */
const fuHist = key => ((STORE.fuHist = STORE.fuHist || {})[key] = STORE.fuHist[key] || []);
const fuWho = () => S.portal === 'coord' ? { name: CME().name, role: 'Academic Coordinator' } : { name: ADMIN.me.name, role: 'Academic Admin' };
function fuRecord(key, item, from, to, reason, b) {
  const me = fuWho(), h = fuHist(key), prev = h.find(x => x.role !== me.role);
  h.unshift({ by: me.name, role: me.role, at: now().toISOString(), from, to, reason });
  if (!prev) return;
  const msg = `${me.name} changed ${item} after your edit — see history.`;
  if (prev.role === 'Academic Coordinator') { if (STORE.coo) STORE.coo.notifs.unshift({ id: 'cn' + Date.now() + Math.random().toString(36).slice(2, 4), t: 'Changed after your edit', b: msg, at: now().toISOString(), go: 'c-timeline', unread: true, to: prev.by }); }
  else if (typeof acaNotify === 'function') acaNotify('Changed after your edit', msg, b ? 'a-batches.' + b.code : 'k-calendar', prev.by, 'Scheduling');
}
const fuHistHtml = key => { const h = fuHist(key); return h.length ? `<section class="stack" id="fu-hist"><h3 class="small">Version history</h3><ul class="list small">${h.map(x => `<li class="li"><div class="li-b"><span><strong>${esc(x.by)}</strong> <span class="muted">(${esc(x.role)})</span> · ${fdt(x.at)}</span><span class="xs muted">${esc(x.from)} → ${esc(x.to)} · ${esc(x.reason)}</span></div></li>`).join('')}</ul></section>` : ''; };
function fuWrapEv(act, sel) {
  const f = ACT[act];
  ACT[act] = el => {
    const { b, e } = findEv(el.dataset.b, el.dataset.id), key = b.code + ':' + e.id, before = e.start;
    f(el); if (!MODAL) return;
    MODAL.body += fuHistHtml(key); renderModal();
    const a = MODAL.actions.find(x => x.cls && /primary/.test(x.cls)); if (!a) return; const g = a.fn;
    a.fn = (...x) => { const r = mval(sel), res = g(...x); if (res !== false) { const cur = findEv(el.dataset.b, el.dataset.id).e; if (cur && cur.start !== before) fuRecord(key, `${EVLBL[e.type].toLowerCase()} "${e.title}" (${b.code})`, fdt(before), fdt(cur.start), r, b); } return res; };
  };
}
fuWrapEv('cooEditEv', '#ee-r'); fuWrapEv('kEditEv', '#ke-r');
const staffTxt = b => 'Teacher: ' + (b.teachers.join(', ') || '—') + ' · Assessor: ' + (b.assessors.join(', ') || '—');
// Academic Admin staff changes land in the same history
const _bsF = ACT.batchStaff;
ACT.batchStaff = el => {
  const b = ADMIN.batches.find(x => x.code === el.dataset.id); _bsF(el); if (!MODAL || !b || S.portal === 'coord') return;
  const before = staffTxt(b); MODAL.body += fuHistHtml(b.code + ':staff'); renderModal();
  const a = MODAL.actions.find(x => x.cls && /primary/.test(x.cls)), g = a.fn;
  a.fn = (...x) => { const r = mval('#rsn'), res = g(...x); if (res !== false && staffTxt(b) !== before) fuRecord(b.code + ':staff', 'staff for ' + b.code, before, staffTxt(b), r, b); return res; };
};
// "Edit staff" on the Coordinator's own batch — reuses the Academic Admin modal; the Coordinator slot is not editable
ACT.cooStaff = el => {
  const b = ADMIN.batches.find(x => x.code === el.dataset.id); if (!b || !myBatches().some(x => x.code === b.code)) { toast('You can only edit staff on your own batch.', 'err'); return; }
  const before = staffTxt(b); _bsF({ dataset: { id: b.code } }); if (!MODAL) return;
  MODAL.title = 'Edit staff — ' + b.code;
  MODAL.body = MODAL.body.replace(/<div class="field"><label for="bs-c">Academic Coordinator<\/label><select class="select" id="bs-c">[\s\S]*?<\/select><\/div>/, `<input type="hidden" id="bs-c" value="${esc(b.coord || '')}"><p class="small muted">${ic('lock', 13)} The Academic Coordinator slot is set by the Academic Admin. Marking already done keeps the original assessor's name.</p>`) + fuHistHtml(b.code + ':staff');
  renderModal();
  const a = MODAL.actions.find(x => x.cls && /primary/.test(x.cls)), g = a.fn;
  a.fn = (...x) => { const me = ADMIN.me, r = mval('#rsn'); ADMIN.me = { ...me, name: CME().name, roles: ['Academic Coordinator'] }; let res; try { res = g(...x); } finally { ADMIN.me = me; } if (res !== false && staffTxt(b) !== before) fuRecord(b.code + ':staff', 'staff for ' + b.code, before, staffTxt(b), r, b); return res; };
};
const _cBatchF = SCREENS['c-batches'];
SCREENS['c-batches'] = p => { const h = _cBatchF(p), b = p && p.id && ADMIN.batches.find(x => x.code === p.id); if (!b || !myBatches().some(x => x.code === b.code) || (typeof roBatch === 'function' && roBatch(b))) return h; return h.replace(`<button class="btn btn-sm" data-act="cooBulk" data-b="${b.code}">`, `<button class="btn btn-sm" data-act="cooStaff" data-id="${b.code}">${ic('users', 14)}Edit staff</button><button class="btn btn-sm" data-act="cooBulk" data-b="${b.code}">`); };
// notification catalogue: the new event
if (typeof NEVENTS !== 'undefined') { const g = NEVENTS.find(x => x[0] === 'Schedule'); if (g && !g[1].includes('Changed after your edit')) g[1].push('Changed after your edit'); }
if (typeof NREC !== 'undefined') NREC['Changed after your edit'] = 'Academic Coordinator, Academic Admin';

/* ---------- F10 Super Admin actions: notify, never approve ---------- */
let FU_QUIET = 0; const FU_SEEN = {};
function fuSaArea(module, entity, action) {
  const i = module === 'Approvals Queue' && typeof qItem === 'function' ? qItem(entity) : null, t = i ? i.type : '';
  if (/Refund|non-payment|Agency invoice|Discount rate/.test(t)) return ['money', i];
  if (t === 'Data correction') return ['assessment', i];
  if (/quiz attempts|More time|Resubmission limit|academic/.test(t)) return ['academic', i];
  if (/Admission|document/i.test(t)) return ['admissions', i];
  if (/Bundle|agency/i.test(t)) return ['agency', i];
  if (i) return ['account', i];
  if (/release/i.test(module + ' ' + action)) return ['academic', null];
  if (/Courses/.test(module) && /price/i.test(action + ' ' + entity)) return ['money', null];
  if (/Finance|Deposit|Overdue|Payment|Refund|Discount/i.test(module) || /price|discount|waiver|instalment|deposit|access restored|access paused|restore/i.test(action)) return ['money', null];
  if (/Batches|Scheduling|Calendar/i.test(module)) return ['batch', null];
  if (/Admission/i.test(module)) return ['admissions', null];
  if (/Agenc|Bundle|Referral/i.test(module)) return ['agency', null];
  if (/Staff|Roles|Users|Capabilit/i.test(module)) return ['staff', null];
  if (/Learner|Data Protection|Certificate/i.test(module)) return ['account', null];
  return [null, null];
}
function fuSaNotify(module, entity, action, reason) {
  const [area, i] = fuSaArea(module, entity, action); if (!area) return;
  const did = action === SA_TAG && i ? (i.type === 'Refund' ? 'processed refund ' + i.id : 'applied ' + qLbl(i.type).toLowerCase() + ' ' + i.id) : action.charAt(0).toLowerCase() + action.slice(1) + ' — ' + entity;
  const t = `Super Administrator ${ADMIN.me.name} ${did}`, b = `${t} — reason: ${reason || '—'}`, go = i ? 'a-queue.' + i.id : null, at = now().toISOString();
  const k = area + '|' + t; if (FU_SEEN[k] && Date.now() - FU_SEEN[k] < 1500) return; FU_SEEN[k] = Date.now();
  const fin = () => { if (STORE.fin) STORE.fin.notifs.unshift({ to: 'all', t, b, at, go: go || 'f-dashboard', unread: true }); };
  const sys = (to = 'all') => { if (typeof sysNotify === 'function') sysNotify(t, b, go || 'a-dashboard', to); };
  const aca = (to = 'all') => { if (typeof acaNotify === 'function') acaNotify(t, b, go || 'k-dashboard', to, 'Super Admin action'); };
  const coo = () => { if (STORE.coo) STORE.coo.notifs.unshift({ id: 'cn' + Date.now() + Math.random().toString(36).slice(2, 4), t, b, at, go: 'c-dashboard', unread: true }); };
  const tas = () => { if (typeof tasNotify === 'function') tasNotify(t, b, 't-approvals', 'Approvals'); };
  const biz = () => { if (typeof bizNotify === 'function') bizNotify(t, b, go || 'b-dashboard', 'Approvals'); };
  const rv = i && i.first && !/Super|No approval/.test(i.first) ? i.first : null, rvSys = rv && ADMIN.staff.some(s => s.name === rv && s.roles.includes('System Administrator'));
  ({ money: () => fin(), assessment: () => { sys(); tas(); coo(); }, academic: () => { aca(); coo(); }, batch: () => { coo(); aca(); }, admissions: () => { aca(); if (rvSys) sys(rv); else if (rv) aca(rv); }, account: () => sys(), agency: () => biz(), staff: () => sys() })[area]();
}
const _logAFu = logA;
logA = function (module, entity, action, before, after, reason) { _logAFu(module, entity, action, before, after, reason); if (!FU_QUIET && typeof isSA === 'function' && isSA() && S.portal === 'admin' && !/view|opened|export|purpose/i.test(action)) fuSaNotify(module, entity, action, reason); };
const _saApplyFu = saApply;
saApply = function (i, r) { FU_QUIET++; try { _saApplyFu(i, r); } finally { FU_QUIET--; } fuSaNotify('Approvals Queue', i.id, SA_TAG, r); };
