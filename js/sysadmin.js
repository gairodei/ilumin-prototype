/* Standalone System Administrator — the existing admin console with the Super-Administrator-only powers removed:
   no final Data Correction approval (first review → "Forward to Super Admin"), no overrides, no escalated items,
   no Super Administrator role/accounts. First approver for learner profile changes, Data Correction
   first review and below-minimum bundle prices. Also: new staff accounts get a set-password email in the demo inbox,
   and granted/revoked departmental roles take effect at the user's next sign-in. */
'use strict';

/* ---------- Identities (§3) ---------- */
const SYS_VARIANTS = {
  SY: { label: 'System Admin A (default)', staff: 'ST-003', roles: ['System Administrator'], note: 'Owen Price · main demo user' },
  SB: { label: 'System Admin B', staff: 'ST-022', roles: ['System Administrator'], note: 'Rhys Talbot · first review of Data Corrections raised by A' },
  SC: { label: 'Only one System Admin', staff: 'ST-003', roles: ['System Administrator'], note: 'Rhys Talbot deactivated — own items route to the Super Administrator', solo: true },
  SD: { label: 'System Admin + Finance Admin', staff: 'ST-003', roles: ['System Administrator', 'Finance Admin'], note: '2FA required because of the Finance role · role switcher', multi: true },
};
const SYS_A = 'Owen Price', SYS_B = 'Rhys Talbot', SYS_POOL = 'Owen Price';
const SYS_TYPES = ['Learner profile change', 'Data correction', 'Bundle price below minimum'];
const isSys = () => !!(ADMIN && ADMIN.sysRole && S.portal === 'admin' && S.sysCtx !== 'Finance Admin');
const sysNames = () => ADMIN.staff.filter(s => s.roles.includes('System Administrator') && !s.roles.includes('Super Administrator') && s.status === 'Active').map(s => s.name);
const otherSys = () => sysNames().find(n => n !== ADMIN.me.name) || null;
if (ADMIN_VARIANTS.A) ADMIN_VARIANTS.A.label = 'Super Admin + System Admin (same person)';
if (ADMIN_VARIANTS.B) ADMIN_VARIANTS.B.label = 'Super Admin only';
const _setIdS = setAdminIdentity;
setAdminIdentity = function (av) {
  const A = ADMIN; if (!A) return;
  const rt = A.staff.find(s => s.id === 'ST-022'), ow = A.staff.find(s => s.id === 'ST-003');
  if (STORE.sys && SYS_VARIANTS[av]) STORE.sys.solo = av === 'SC';
  if (rt) rt.status = STORE.sys && STORE.sys.solo ? 'Deactivated' : (rt.status === 'Deactivated' ? 'Active' : rt.status);
  if (ow) { if (ow._vAdd) { ow.roles = ow.roles.filter(r => r !== 'Finance Admin'); ow._vAdd = false; ow.tfa = 'Not required'; } if (av === 'SD' && !ow.roles.includes('Finance Admin')) { ow.roles.push('Finance Admin'); ow._vAdd = true; ow.tfa = 'Enabled'; } }
  if (SYS_VARIANTS[av]) {
    if (A.fin || A.aca || A.biz || A.iqaRole) _setIdS(A._saAv || 'A');
    const V = SYS_VARIANTS[av], s = A.staff.find(x => x.id === V.staff);
    if (!A._saMe) { A._saMe = A.me; A._saNotifs = A.myNotifs; A._saAv = A.av; }
    A.av = av; A.sysRole = true; A.fin = false; A.aca = false; A.biz = false; A.iqaRole = false; S.finCtx = null; S.sysCtx = 'System Administrator'; A.variant = { label: V.label };
    A.me = { name: s.name, first: s.name.split(' ')[0], email: s.email, roles: V.roles.slice(), tz: 'Europe/London', id: s.id };
    if (V.tfa) S.sys2fa = true;
  } else { A.sysRole = false; S.sysCtx = null; _setIdS(av); }
};

/* ---------- Shared-store patch (§A6) ---------- */
function sysPatch() {
  if (!ADMIN || ADMIN._sysPatched || !STORE.worlds) return; ADMIN._sysPatched = true;
  const A = ADMIN, Y = STORE.sys = { notifs: [], solo: STORE.sys ? STORE.sys.solo : false };
  if (!A.staff.some(s => s.id === 'ST-022')) A.staff.push({ id: 'ST-022', name: SYS_B, email: 'rhys.talbot@illumin-academy.example', roles: ['System Administrator'], status: 'Active', tfa: 'Not required', last: D(-1, '18:05'), alloc: 0, mobile: '+44 7700 900822', tz: 'Europe/London' });
  // Learner profile change requests (derived from the learner portal): 4 pending (incl. Aisha R-1080), approved, rejected, escalated
  const pc = (v, id, target, proposed, reason, raised, extra = {}) => { const w = STORE.worlds[v]; if (w.requests.some(r => r.id === id)) return; w.requests.unshift({ id, type: 'Profile change', target, raised, status: 'Requested', reason, proposed, decision: null, file: extra.file || null }); w.profilePending[target] = proposed; };
  pc('A', 'R-1085', 'Full name', 'Daniel Chukwuemeka Okafor', 'Adding my middle name as on my passport.', D(-1, '20:10'), { file: 'passport_scan.pdf' });
  pc('E', 'R-1086', 'Mobile', '+44 7700 900999', 'New work phone.', D(-3, '12:00'));
  pc('F', 'R-1087', 'Email', 'fatima.almansoori@mail.ae.example', 'My old email is closing.', D(-4, '09:40'));
  pc('B', 'R-1088', 'Address', 'Apt 803, Marina Gate 2, Dubai Marina, Dubai', 'Moved apartments.', D(-9, '10:00'), { file: 'tenancy_contract.pdf' });
  // Data Correction Requests — first review by System Admin, final approval by Super Admin
  const dc = (id, raisedBy, raised, status, learner, field, current, proposed, reason, extra = {}) => { const L = allLearners().find(l => l.name === learner) || {}; A.queue.push({ id, type: 'Data correction', raisedBy, raised, status, first: SYS_POOL, finalSuper: true, related: [`${learner} · ${field}`, 'a-learner.' + L.id], notes: [], history: [[raisedBy, raised, 'Raised', reason]], reason, data: { field, current, proposed, firstReview: extra.firstReview || 'Awaiting System Administrator first review', ...(extra.data || {}) }, ...extra }); };
  dc('AQ-8002', 'James Pryce', D(-5, '10:00'), 'Pending', 'Ruby Clarke', 'Assessment record', 'L2 Assignment 3 Q2 — Not Met', 'L2 Assignment 3 Q2 — Met (verified 28 Sep)', 'Verification was recorded against the wrong question.', { stage: 'final', firstReview: 'Owen Price: evidence checked — forwarded for final approval.', extraHist: [[SYS_A, D(-4, '09:00'), 'Forward to Super Admin for final approval', 'Evidence checked.']] });
  dc('AQ-8003', 'Omar Siddiqui', D(-12, '11:00'), 'Rejected', 'Leah Fernandes', 'Date of birth', '04 Feb 1995', '14 Feb 1995', 'Learner says DOB is wrong.', { decidedBy: SYS_A, decision: 'Rejected at first review — no ID evidence attached.' });
  dc('AQ-8004', 'Rachel Hughes', D(-6, '15:00'), 'Returned to Requester', 'Kofi Asante', 'Batch enrolment date', '12 Jan 2026', '05 Jan 2026', 'Started with the cohort a week earlier.', { decidedBy: SYS_B, decision: 'Returned — attach the original enrolment confirmation.' });
  dc('AQ-8005', SYS_A, D(-1, '09:30'), 'Pending', 'Isla Morgan', 'Referral attribution', 'Self-registration', 'Agency — CarePlus Recruitment (demo)', 'Agency confirmed attribution by email.', { data: { selfRaised: true } });
  // Below floor: add a second pending item
  if (STORE.biz && !STORE.biz.products.some(p => p.id === 'CAT-14')) {
    STORE.biz.products.push({ id: 'CAT-14', name: 'Meridian starter deal', courses: ['Moving and Handling People', 'Fire Safety Awareness'], seats: 15, days: 365, desc: '', mode: 'custom', pct: null, slabs: null, customTotal: 640, cur: 'GBP', agency: 'Meridian Home Support (demo)', status: 'Pending approval', version: 1, history: [[1, D(-2), 'Sophie Turner', 'Draft created'], [1, D(-2), 'Sophie Turner', 'Submitted for approval below the minimum price (AQ-8010)']], floor: { state: 'Pending', qid: 'AQ-8010', just: 'First-year welcome price to win the account.' } });
    A.queue.push({ id: 'AQ-8010', type: 'Bundle price below minimum', raisedBy: 'Sophie Turner', raised: D(-2, '11:00'), status: 'Pending', first: SYS_POOL, related: ['Meridian Home Support (demo) · CAT-14', 'a-bundles.CAT-14.catalogue'], notes: [], amount: 640, cur: 'GBP', history: [['Sophie Turner', D(-2, '11:00'), 'Raised', 'First-year welcome price to win the account.']], reason: 'First-year welcome price to win the account.', data: { floor: 888, requested: 640, bundle: 'CAT-14', productId: 'CAT-14' } });
  }
  const n = (t, b, at, go, unread, to = 'all') => Y.notifs.push({ id: 'YN-' + Y.notifs.length, t, b, at, go, unread, to });
  n('Profile change request awaiting you', 'R-1085 · Daniel Okafor — Full name', D(-1, '20:11'), 'a-queue.AQ-R-1085', true);
  n('Item escalated to Super Administrator', 'Profile change R-1088 — no decision for 7 days', D(-2, '00:05'), 'a-queue.AQ-R-1088-B', true);
  n('Below-minimum price awaiting you', 'AQ-8010 · Meridian starter deal', D(-2, '11:01'), 'a-queue.AQ-8010', false);
  n('Your decision was overridden', 'AQ-1015 · Super Admin changed Returned → Approved (example)', D(-9), 'a-queue.AQ-1015', false, SYS_A);
}
const _baS = buildAdmin; buildAdmin = function (av) { const r = _baS(av); sysPatch(); return r; };
const _isS = initStore; initStore = function () { _isS(); sysPatch(); };
const sysNotifs = () => (STORE.sys ? STORE.sys.notifs : []).filter(n => n.to === 'all' || n.to === ADMIN.me.name);
function sysNotify(t, b, go, to = 'all') { if (STORE.sys) STORE.sys.notifs.unshift({ id: 'YN-' + Date.now() + Math.random().toString(36).slice(2, 5), t, b, at: now().toISOString(), go, unread: true, to }); }
function notifyRaiser(i, t, b) { const who = i.raisedBy; if (STORE.tas && Object.values(TAS_USERS).some(u => u.name === who)) STORE.tas.notifs.unshift({ id: 'tn' + Date.now(), t, b, at: now().toISOString(), go: 't-approvals', unread: true, cat: 'Marking' }); if (typeof acaNotify === 'function' && ['Rachel Hughes', 'Joanne Lister'].includes(who)) acaNotify(t, b, 'a-queue.' + i.id, who, 'System'); if (sysNames().includes(who) || who === SYS_A) sysNotify(t, b, 'a-queue.' + i.id, who); }

/* ---------- Shell: notifications, dashboard, role switch (Finance context in variant D) ---------- */
const _renderS = adminRender;
adminRender = function () {
  if (ADMIN.sysRole) ADMIN.myNotifs = sysNotifs();
  const svN = ADMIN.sysRole ? ADMIN._saNotifs : undefined; if (ADMIN.sysRole) delete ADMIN._saNotifs;
  const finWas = ADMIN.fin; if (ADMIN.sysRole && S.sysCtx === 'Finance Admin') { ADMIN.fin = true; if (!FIN_VARIANTS.SD) FIN_VARIANTS.SD = { label: 'System Admin + Finance Admin', staff: 'ST-003', roles: ['Finance Admin', 'System Administrator'] }; if (S.route.startsWith('a-') && !['a-queue', 'a-me'].includes(S.route)) S.route = 'f-dashboard'; }
  // The sidebar Finance items (shared with Super Admin) open the real Finance screens; other Finance-portal routes still return to the dashboard
  if (ADMIN.sysRole && S.sysCtx !== 'Finance Admin' && S.route.startsWith('f-') && !['f-ledger', 'f-overdue', 'f-refunds', 'f-exceptions', 'f-reports', 'f-learner', 'f-learners'].includes(S.route)) S.route = 'a-dashboard';
  try { _renderS(); } finally { if (svN !== undefined) ADMIN._saNotifs = svN; if (ADMIN.sysRole) ADMIN.fin = finWas; }
  const rc = $('.adm .role-ctx');
  if (ADMIN.sysRole) {
    if (SYS_VARIANTS[ADMIN.av].multi && rc) rc.outerHTML = `<div class="role-switch"><label for="sctx">Role</label><select id="sctx" data-onchange="sCtx"><option ${S.sysCtx !== 'Finance Admin' ? 'selected' : ''}>System Administrator</option><option ${S.sysCtx === 'Finance Admin' ? 'selected' : ''}>Finance Admin</option></select></div>`;
    else if (rc) rc.textContent = 'System Administrator';
    const sub = $('.adm .logo span'); if (sub && isSys()) sub.textContent = 'System Administrator';
  }
  if (S.multiRoles && S.multiRoles.length > 1 && rc && $('.adm .role-ctx')) $('.adm .role-ctx').outerHTML = `<div class="role-switch"><label for="mctx">Role</label><select id="mctx" data-onchange="mCtx">${S.multiRoles.map(r => `<option ${S.multiCur === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>`;
};
INP.sCtx = el => { S.sysCtx = el.value; go(el.value === 'Finance Admin' ? 'f-dashboard' : 'a-dashboard'); toast('Role context: ' + el.value, 'info'); };
const _dashS = SCREENS['a-dashboard'];
SCREENS['a-dashboard'] = (p) => {
  let h = _dashS(p); if (!isSys()) return h;
  const q = allQueue(), mine = q.filter(awaitingMe), escd = q.filter(i => i.status === 'Escalated' && isOpen(i)), raised = q.filter(i => isMine(i) && isOpen(i));
  const li = i => `<li class="li"><div class="li-b"><span class="strong"><span class="mono small">${i.id}</span> · ${esc(qLbl(i.type))}</span><span class="small muted">${esc(i.related[0])}</span></div>${daysChip(i.days)}<button class="btn btn-sm" data-go="a-queue" data-id="${i.id}">Open</button></li>`;
  const card = `<section class="card"><div class="card-h"><h2>${ic('inbox')}My approvals</h2><button class="btn btn-sm btn-ghost" data-go="a-queue">Open queue</button></div><p class="xs muted">Learner profile changes · Data Correction first review · below-minimum bundle prices</p>
    ${(dl => dl.length ? `<div class="note b-amber" role="status">${ic('clock')}<div class="small"><strong>Data requests nearing their deadline (${dl.length})</strong>${dl.map(d => `<div>${esc(d.id)} · ${esc(d.type)} · ${esc(d.who)} — due ${fd(dsrDue(d))}</div>`).join('')}<div class="b-act"><button class="btn btn-sm" data-act="goTok" data-t="a-dataprotection..dsr">Open data requests</button></div></div></div>` : '')(typeof dsrLeft === 'function' ? ADMIN.dsr.filter(d => d.status === 'Open' && dsrLeft(d) <= 7) : [])}<h3 class="small">Awaiting me (${mine.length})${mine.length > 6 ? ` · <button class="linklike small" data-go="a-queue">View all</button>` : ''}</h3><ul class="list">${mine.slice().sort((a, b) => new Date(a.raised) - new Date(b.raised)).slice(0, 6).map(li).join('') || '<li class="small muted">You\'re all caught up.</li>'}</ul>
    <h3 class="small">Raised by me (${raised.length})</h3><p class="xs muted">Items you raised. Someone else decides them — you can follow their progress here.</p><ul class="list">${raised.map(li).join('') || '<li class="small muted">None.</li>'}</ul>
    <h3 class="small">Escalated to Super Admin — read-only (${escd.length})</h3><p class="xs muted">Not decided within 7 days, so only the Super Administrator can decide these now.</p><ul class="list">${escd.slice(0, 5).map(li).join('') || '<li class="small muted">Nothing escalated.</li>'}</ul></section>`;
  h = h.replace(/<section class="card"><div class="card-h"><h2>[^]*?My approvals<\/h2>[^]*?<\/section>/, card);
  return h;
};

/* ---------- Approvals Queue (§2.2) ---------- */
const sysBlocked = i => { const me = ADMIN.me.name; return i.raisedBy === me || (i.related[0] || '').startsWith(me + ' ·'); };
const _allQS = allQueue; allQueue = function () { const q = _allQS(); return isSys() ? q.filter(i => i.type !== 'Super Admin own action') : q; };
const _awS = awaitingMe;
awaitingMe = function (i) {
  if (isSys()) return isOpen(i) && SYS_TYPES.includes(i.type) && i.first === SYS_POOL && i.status !== 'Escalated' && !(i.type === 'Data correction' && i.stage === 'final') && !sysBlocked(i) && !(STORE.sys.solo && i.raisedBy === ADMIN.me.name);
  return _awS(i);
};
const _sbS = selfBlocked; selfBlocked = function (i) { return isSys() ? (sysBlocked(i) || i.status === 'Escalated' || (i.type === 'Data correction' && i.stage === 'final') || !SYS_TYPES.includes(i.type)) : _sbS(i); };
const SQTABS = { me: ['Awaiting me', i => awaitingMe(i)], raised: ['Raised by me', i => isMine(i)], decided: ['Decided', i => !isOpen(i)], open: ['All open', isOpen] };
const _qScrS = SCREENS['a-queue'];
SCREENS['a-queue'] = (p) => {
  if (!isSys() || p.id) return _qScrS(p);
  const t = SQTABS[ui('sqTab', 'me')] ? ui('sqTab', 'me') : 'me', all = allQueue(), rows = all.filter(SQTABS[t][1]);
  return `${pageA('Approvals Queue', 'You are the first approver for learner profile changes, Data Correction first review and below-minimum bundle prices. Items left undecided for 7 days escalate to the Super Administrator.', `<button class="btn" data-act="qRouting">${ic('info', 15)}Who approves what</button>`)}
  ${STORE.sys.solo ? `<div class="note b-amber">${ic('info')}<div class="small"><strong>Only one System Administrator exists.</strong> Items you raise go straight to the Super Administrator.</div></div>` : ''}
  ${tabs(Object.entries(SQTABS).map(([k, [l, f]]) => [k, l, all.filter(f).length]), t, 'sqTab', 'Queue views')}
  ${dt({ id: 'squeue-' + t, name: 'Approvals Queue — ' + SQTABS[t][0], rows, rid: i => i.id, search: i => i.id + i.type + i.raisedBy + i.related[0], filters: [{ k: 'type', l: 'Item type', get: i => qLbl(i.type) }, { k: 'status', l: 'Status', get: i => i.status, opts: ['Pending', 'Approved', 'Rejected', 'Returned to Requester', 'Info Requested', 'Escalated'] }, { k: 'stage', l: 'Data Correction stage', get: i => i.type === 'Data correction' ? (i.stage === 'final' ? 'Awaiting Super Admin' : 'First review') : '—', opts: ['First review', 'Awaiting Super Admin'] }],
    cols: [{ k: 'id', l: 'Item ID', h: i => `<a href="#a-queue.${i.id}" data-go="a-queue" data-id="${i.id}" class="mono strong nowrap">${i.id}</a>` }, { k: 'type', l: 'Item type', h: i => `<span class="small">${esc(qLbl(i.type))}</span>${i.type === 'Data correction' ? `<div class="xs muted">${i.stage === 'final' ? 'Awaiting Super Admin' : 'First review'}</div>` : ''}` }, { k: 'raisedBy', l: 'Raised by' }, { k: 'raised', l: 'Raised', h: i => fd(i.raised), s: i => i.raised }, { k: 'days', l: 'Days outstanding', h: i => daysChip(i.days), s: i => i.days ?? -1 }, { k: 'status', l: 'Status', h: i => qchip(i.status) }, { k: 'rel', l: 'Related record', h: i => `<span class="small">${esc(i.related[0])}</span>`, v: i => i.related[0] }],
    rowCls: i => i.status === 'Escalated' ? 'row-esc' : '', act: i => `<button class="btn btn-sm" data-go="a-queue" data-id="${i.id}">Open</button>`, empty: t === 'me' ? 'You\'re all caught up' : 'No items in this view' })}`;
};
ACT.sqTab = el => { setUi('sqTab', el.dataset.k); render(); };
const IDENTITY_FIELDS = ['Full name', 'Date of birth'];
const _qdS = queueDetail;
queueDetail = function (id) {
  let html = _qdS(id); const i = qItem(id); if (!i) return html;
  const sys = isSys(), open = isOpen(i), d = i.data || {};
  let top = '', panel = '';
  if (i.type === 'Learner profile change' && i.req) {
    const w = STORE.worlds[i.v], certs = w ? w.certs.filter(c => c.status === 'Valid' || c.status === 'Expiring soon') : [];
    panel = `<section class="card"><h2>Profile change request</h2><dl class="kv"><dt>Learner</dt><dd>${esc(VNAME(i.v))} <span class="mono xs">${w.me.id}</span></dd><dt>Field</dt><dd>${esc(i.req.target)}</dd><dt>Current value</dt><dd>${esc(profileVal(i.v, i.req.target))}</dd><dt>Proposed value</dt><dd><strong>${esc(i.req.proposed || w.profilePending[i.req.target] || '—')}</strong></dd><dt>Reason</dt><dd>${esc(i.req.reason)}</dd><dt>Requested</dt><dd>${fdt(i.req.raised)}</dd><dt>Supporting file</dt><dd>${i.req.file ? `<button class="linklike" data-act="viewFile" data-f="${esc(i.req.file)}">${ic('doc', 13)} ${esc(i.req.file)}</button>` : '—'}</dd></dl>
      ${IDENTITY_FIELDS.some(f => i.req.target.startsWith(f.split(' ')[0])) ? `<div class="note b-blue">${ic('info')}<div class="small">Name and date-of-birth changes that affect an issued certificate go through a Data Correction: System Admin review, Super Admin final approval, then the certificate is re-issued and the old one shows <strong>Replaced</strong>.${certs.length ? ` ${certs.length} issued certificate(s) carry the current value.` : ''}</div></div>${certs.length && open && i.req.status !== 'Converted' ? `<div class="row"><button class="btn btn-primary" data-act="sysConvertDC" data-id="${i.id}">Convert to Data Correction</button></div>` : ''}${i.req.convertedTo ? `<p class="small">Converted to <a href="#a-queue.${i.req.convertedTo}" data-go="a-queue" data-id="${i.req.convertedTo}" class="mono">${i.req.convertedTo}</a>.</p>` : ''}` : ''}</section>`;
  }
  if (i.type === 'Data correction') {
    const f = d.finding && ADMIN.iqa.find(x => x.id === d.finding);
    panel = `<section class="card"><h2>${i.stage === 'final' ? 'Awaiting Super Admin final approval' : 'First review — System Administrator'}</h2><dl class="kv"><dt>Raised by</dt><dd>${esc(i.raisedBy)}</dd><dt>Record</dt><dd><a href="#${i.related[1]}" data-act="goTok" data-t="${i.related[1]}">${esc(i.related[0])}</a></dd><dt>Reason</dt><dd>${esc(i.reason || '—')}</dd><dt>First review</dt><dd>${esc(d.firstReview || 'Awaiting System Administrator first review')}</dd>${f ? `<dt>Related IQA finding</dt><dd><span class="iqa-badge sm">${ic('shield', 12)}${f.id}</span> ${esc(f.text)}</dd>` : ''}</dl><p class="xs muted">Two stages: System Administrator first review, then Super Administrator final approval (always).</p></section>`;
    if (sys && open && i.stage !== 'final') html = html.replace(/<button class="btn btn-primary" data-act="qDo" data-id="[^"]*" data-a="approveFinal"[^>]*>[^<]*<\/button>/, `<button class="btn btn-primary" data-act="qDo" data-id="${i.id}" data-a="forward" ${sysBlocked(i) ? 'disabled' : ''}>Forward to Super Admin for final approval</button>`);
    if (sys && i.stage === 'final' && open) top += `<div class="note b-blue">${ic('clock')}<div class="small"><strong>Awaiting Super Admin</strong> — first review passed. Read-only for System Administrators.</div></div>`;
    if (!sys && open && ADMIN.me.roles.includes('Super Administrator')) top += `<div class="note b-grey">${ic('info')}<div class="small">${i.stage === 'final' ? 'First review passed by the System Administrator — ready for your final approval.' : 'Not yet first-reviewed by a System Administrator. You can still give final approval.'}</div></div>`;
  }
  if (sys) {
    html = html.replace(/<div class="note b-amber" role="status">[^]*?You cannot approve an item you raised[^]*?<\/div><\/div>/, '');
    html = html.replace(/<div class="row"><button class="btn" data-act="qOverride"[^]*?<\/span><\/div>/, '');
    if (open && sysBlocked(i) && SYS_TYPES.includes(i.type)) { const to = STORE.sys.solo ? null : otherSys(); top += `<div class="note b-amber" role="status">${ic('lock')}<div><strong>Self-approval blocked.</strong> ${isMine(i) ? 'You raised this item' : 'You are the subject of this item'} — ${to ? `first review by <strong>${esc(to)}</strong>` : `<strong>no other System Admin — routed to Super Administrator</strong>`}.</div></div>`; }
    if (i.status === 'Escalated') { html = html.replace(/<div class="note b-red" role="status">[^]*?<\/div><\/div>/, ''); top += `<div class="note b-red" role="status">${ic('alert')}<div><strong>Escalated to Super Administrator — read-only.</strong> No decision for 7 days.</div></div>`; }
    if (!open || selfBlocked(i)) html = html.replace(/<section class="card"><h2>Decision<\/h2>[^]*?<\/section>/, open ? `<section class="card"><h2>Decision</h2><p class="small muted">${ic('lock', 14)} ${i.status === 'Escalated' ? 'The Super Administrator decides escalated items.' : i.stage === 'final' ? 'Awaiting Super Admin final approval.' : SYS_TYPES.includes(i.type) ? 'You can view this item but can\'t decide it.' : 'Not a System Administrator item — read-only.'}</p><button class="btn btn-sm" data-act="qDo" data-id="${i.id}" data-a="note">Add note</button></section>` : '');
  }
  if (S.portal === 'admin' && !ADMIN.me.roles.includes('Super Administrator')) html = html.replace(/<div class="row"><button class="btn" data-act="qOverride"[^]*?<\/span><\/div>/, '');
  if (top || panel) html = html.replace('<div class="grid-2"><div class="stack-lg">', top + (panel && !html.includes('k-panels">' + panel) ? `<div class="grid-2 k-panels">${panel}</div>` : '') + '<div class="grid-2"><div class="stack-lg">');
  return html;
};
const _qDoS = ACT.qDo;
ACT.qDo = el => {
  const i = qItem(el.dataset.id), a = el.dataset.a;
  if (a === 'forward') { if (sysBlocked(i)) { toast('You can\'t review your own item.', 'err'); return; } reasonDlg({ title: 'Forward to Super Admin for final approval — ' + i.id, ok: 'Forward to Super Admin', label: 'First-review comment (required)', body: `<div class="note b-blue">${ic('info')}<div class="small">Final approval is always the Super Administrator's. The original value is kept in history.</div></div>`, onOk: r => { i.stage = 'final'; i.data.firstReview = `${ADMIN.me.name}: ${r}`; i.forwardedBy = ADMIN.me.name; i.history.push([ADMIN.me.name, now().toISOString(), 'Forward to Super Admin for final approval', r]); logA('Approvals Queue', i.id, 'First review — forwarded to Super Admin', 'First review', 'Awaiting Super Admin', r); notifyRaiser(i, 'First review passed — awaiting final approval', `${i.id} · ${i.related[0]}`); render(); toast('Forwarded — the Super Administrator now has it in "Awaiting me".'); } }); return; }
  if (isSys() && i && (a === 'approveFinal' || (!SYS_TYPES.includes(i.type) && a !== 'note'))) { toast('Not available to System Administrators.', 'err'); return; }
  _qDoS(el);
};
const _applyS = applyDecision;
applyDecision = function (i, a, r, o) {
  const sys = isSys(), wasStage = i.stage;
  _applyS(i, a, r, o);
  if (i.type !== 'Data correction' || a === 'note') return;
  if (sys && ['reject', 'return', 'info'].includes(a)) notifyRaiser(i, `Data Correction ${({ reject: 'rejected', return: 'returned', info: 'needs more information' })[a]} at first review`, `${i.id} · ${r}`);
  if (!sys && ['approveFinal', 'reject'].includes(a) && wasStage === 'final') { sysNotify(a === 'reject' ? 'Forwarded Data Correction rejected by Super Admin' : 'Data Correction given final approval', `${i.id} · ${i.related[0]}${a === 'reject' ? ' — ' + r : ''}`, 'a-queue.' + i.id, i.forwardedBy || 'all'); notifyRaiser(i, a === 'reject' ? 'Data Correction rejected' : 'Data Correction approved', `${i.id} · ${r}`); }
};
const _logAS = logA;
logA = function (module, entity, action, before, after, reason) { _logAS(module, entity, action, before, after, reason); if (module === 'Approvals Queue' && action === 'Override decision' && STORE.sys) { const i = allQueue().find(x => x.id === entity); if (i && (sysNames().includes(i.decidedBy) || i.decidedBy === SYS_A)) sysNotify('Your decision was overridden', `${i.id}: ${before} → ${after} (${ADMIN.me.name}) — ${reason}`, 'a-queue.' + i.id, i.decidedBy); } };

/* ---------- Staff & Roles (§2.3), Referrals (§2.4), Raise DC (§2.5) ---------- */
const isSuperRec = s => s.roles.includes('Super Administrator');
function sysDenied(what) { ADMIN.security.unshift({ id: 'SE-' + (900 + ADMIN.security.length), sev: 'High', at: now().toISOString(), type: 'Out-of-scope action', detail: `System Administrator ${ADMIN.me.name} attempted: ${what}`, reviewed: false }); return `<div class="lockpage"><div class="lock-ic">${ic('lock', 30)}</div><h1>Only a Super Administrator can do this</h1><p class="muted">This attempt has been logged.</p><button class="btn btn-primary" data-go="a-dashboard">Go to Dashboard</button></div>`; }
const _staffS = SCREENS['a-staff'];
SCREENS['a-staff'] = (p) => { let h = _staffS(p); if (!isSys()) return h; if (!p.id) { ADMIN.staff.filter(isSuperRec).forEach(s => { h = h.replace(`data-id="${s.id}" class="strong">${esc(s.name)}</a>`, `data-id="${s.id}" class="strong">${esc(s.name)}</a> <span title="Super Administrator account — locked for System Administrators">${ic('lock', 13)}<span class="sr">Locked</span></span>`); }); return h; }
  const s = ADMIN.staff.find(x => x.id === p.id); if (!s) return h;
  h = h.replace(/(<select class="select" id="gr"[^>]*>)([^]*?)(<\/select>)/, (m, a, b, c) => a + b.replace('<option>Super Administrator</option>', '<option disabled>Super Administrator — Super Admin only</option>').replace('<option>System Administrator</option>', '<option disabled>System Administrator — Super Administrator only</option>') + c);
  if (isSuperRec(s)) { h = h.replace(/<div class="row"><button class="btn btn-sm" data-act="staffSt"[^]*?<\/div>\n/, '').replace(/<button class="btn btn-sm" data-act="(revokeRole|grantRole|staffSt|staffReset)"[^>]*>[^<]*<\/button>/g, ''); h = h.replace('<div class="subtabs"', `<div class="note b-grey">${ic('lock')}<div class="small"><strong>Super Administrator account — read-only.</strong> A System Administrator can't edit or deactivate it.</div></div><div class="subtabs"`); }
  return h.replace(/(data-act="revokeRole" data-id="[^"]*" data-r="(Super|System) Administrator")/g, '$1 disabled title="Only a Super Administrator can grant or remove this role"').replace(/(data-r="System Administrator" disabled[^>]*>Revoke<\/button>)/, '$1<span class="xs muted">Only a Super Administrator can grant or remove this role</span>'); // TBD-150
};
const _addUserS = ACT.addUser;
ACT.addUser = el => { _addUserS(el); if (!isSys()) return; const cb = $$('#modal-root .nu-role').find(x => x.value === 'Super Administrator'); if (cb) { cb.disabled = true; cb.parentElement.setAttribute('title', 'Only a Super Administrator can grant or remove this role'); cb.parentElement.insertAdjacentHTML('beforeend', ` <button type="button" class="icon-btn" data-act="sysRoleWhy" aria-label="Why is this disabled?">${ic('info', 14)}</button>`); } };
ACT.sysRoleWhy = () => toast('Only a Super Administrator can grant or remove the Super Administrator role.', 'info');
const _staffStS = ACT.staffSt; ACT.staffSt = el => { const s = ADMIN.staff.find(x => x.id === el.dataset.id); if (isSys() && isSuperRec(s)) { openModal({ title: 'Locked', body: sysDenied('change status of ' + s.name), actions: [{ label: 'Close', cls: 'btn-primary' }] }); return; } _staffStS(el); };
const _staffRS = ACT.staffReset; ACT.staffReset = el => { const s = ADMIN.staff.find(x => x.id === el.dataset.id); if (isSys() && isSuperRec(s)) { toast('Super Administrator accounts are locked for System Administrators.', 'err'); return; } _staffRS(el); };
const _grantS = ACT.grantRole; ACT.grantRole = el => { if (isSys() && $('#gr') && /^(Super|System) Administrator/.test($('#gr').value)) { sysDenied('grant ' + $('#gr').value); toast('Only a Super Administrator can grant this role. Attempt logged.', 'err'); return; } _grantS(el); };
const _revokeS = ACT.revokeRole;
ACT.revokeRole = el => { const s = ADMIN.staff.find(x => x.id === el.dataset.id), r = el.dataset.r; if (isSys() && (r === 'Super Administrator' || r === 'System Administrator' || isSuperRec(s))) { sysDenied('revoke ' + r + ' from ' + s.name); toast('Only a Super Administrator can grant or remove this role. Attempt logged.', 'err'); return; } if (isSys() && r === 'System Administrator' && sysNames().length <= 1 && sysNames().includes(s.name)) { openModal({ title: 'Remove the last System Administrator?', body: `<div class="note b-amber">${ic('alert')}<div class="small"><strong>${esc(s.name)} is the last active System Administrator.</strong> First-review items would go straight to the Super Administrator.</div></div>`, actions: [{ label: 'Remove anyway', cls: 'btn-danger', fn: () => { setTimeout(() => _revokeS(el), 0); } }, { label: 'Keep role', cls: 'btn-primary' }] }); return; } _revokeS(el); };
const _rolesS = SCREENS['a-roles'];
SCREENS['a-roles'] = (p) => { if (isSys() && p.id === 'Super Administrator') return sysDenied('open Super Administrator role settings'); let h = _rolesS(p); if (isSys() && !p.id) h = h.replace('<div class="page-h">', `<div class="note b-grey">${ic('lock')}<div class="small">The Super Administrator role is managed by Super Administrators only.</div></div><div class="page-h">`); return h; };
const _refS = SCREENS['a-referrals'];
SCREENS['a-referrals'] = (p) => _refS(p);
const _raiseS = ACT.raiseDC;
ACT.raiseDC = el => { _raiseS(el); if (!isSys()) return; const f = $('#modal-root #dc-r'); const to = STORE.sys.solo ? null : otherSys(); if (f) f.closest('.field').insertAdjacentHTML('afterend', `<div class="note b-blue">${ic('info')}<div class="small"><strong>Routing:</strong> ${to ? `First review: ${esc(to)} (another System Admin) → Super Admin final approval.` : `No other System Admin — routed to Super Administrator.`}</div></div>`); };

/* G3.3: convert an identity-field profile change into a Data Correction (System Admin review → Super Admin final → re-issue; old certificate "Replaced") */
ACT.sysConvertDC = el => { const i = qItem(el.dataset.id), rq = i.req, w = STORE.worlds[i.v], cert = w.certs.find(c => c.status === 'Valid' || c.status === 'Expiring soon'), proposed = rq.proposed || w.profilePending[rq.target];
  reasonDlg({ title: 'Convert to Data Correction — ' + i.id, ok: 'Convert', body: `<p class="small">Creates a Data Correction for <strong>${esc(rq.target)}</strong>: ${esc(profileVal(i.v, rq.target))} → <strong>${esc(proposed)}</strong>. It goes to System Admin review, then Super Admin final approval. On approval the certificate is re-issued and the old one shows Replaced.</p>`, onOk: r => {
    const id = 'AQ-' + (8100 + ADMIN.queue.length), to = isSys() ? (STORE.sys.solo ? 'Super Administrator' : otherSys() || SYS_POOL) : SYS_POOL, at = now().toISOString();
    ADMIN.queue.unshift({ id, type: 'Data correction', raisedBy: ADMIN.me.name, raised: at, status: 'Pending', first: to, finalSuper: true, related: [`${VNAME(i.v)} · ${rq.target}`, 'a-learner.' + w.me.id], notes: [], reason: r, history: [[ADMIN.me.name, at, 'Raised (converted from profile change ' + i.id + ')', r]], data: { field: rq.target.startsWith('Date') ? 'Date of birth' : 'Full name', current: profileVal(i.v, rq.target), proposed, firstReview: 'Awaiting System Administrator first review', v: i.v, cert: cert && cert.id, fromProfile: i.id } });
    rq.status = 'Converted'; rq.convertedTo = id; rq.decided = at; rq.decision = 'Converted to Data Correction ' + id + '. ' + r; delete w.profilePending[rq.target];
    notifyLearner(i.v, 'Requests', 'Request update — profile change', `${rq.id}: your ${rq.target.toLowerCase()} change will be made through a Data Correction, then your certificate will be re-issued.`, 'requests');
    logA('Approvals Queue', i.id, 'Converted to Data Correction', 'Pending', id, r); if (typeof sysNotify === 'function' && to !== ADMIN.me.name) sysNotify('Data Correction awaiting first review', `${id} · ${VNAME(i.v)} — ${rq.target}`, 'a-queue.' + id, to);
    toast(`${id} created — routed to ${to} for first review.`); go('a-queue', { id }); } }); };

/* ---------- New staff accounts: set-password email + sign-in to their portal; roles take effect at next sign-in ---------- */
const _logAS2 = logA;
logA = function (module, entity, action, before, after, reason) { _logAS2(module, entity, action, before, after, reason); if (module === 'Staff & Users' && action === 'User created' && STORE.agy) { const s = ADMIN.staff.slice().reverse().find(x => x.name === entity); if (s) { s.newUser = true; STORE.agy.lmails.unshift({ id: 'LM-S' + Date.now(), kind: 'staff', staffId: s.id, name: s.name, email: s.email, agency: 'Illumin Academy', sent: now().toISOString(), used: false }); } } };
const _lmSetS = ACT.lmSet;
ACT.lmSet = el => { const m = STORE.agy.lmails.find(x => x.id === el.dataset.id); if (!m || m.kind !== 'staff') return _lmSetS(el); S.signedIn = false; S.portal = 'admin'; S.sysNewStaff = m.staffId; S.auth = 'sysStaffFirst'; S.authMsg = null; S.route = 'signin'; render(); };
const _authS = authView;
authView = function () { if (S.auth !== 'sysStaffFirst') return _authS(); const s = ADMIN.staff.find(x => x.id === S.sysNewStaff); return authShell(`<p class="eyebrow">Your staff account was created by Illumin Academy</p><h1>Set your password, ${esc(s.name.split(' ')[0])}</h1><p>${esc(s.email)} · ${esc(s.roles.join(', '))}</p><form class="stack" data-submit="sysStaffSet" novalidate>${pwField('sn-new', 'New password', 'new')}${pwField('sn-conf', 'Confirm password', 'confirm')}${pwPolicy('sn-pol')}<button class="btn btn-primary btn-block" type="submit" data-pwsubmit disabled>Set password and sign in</button></form>`); };
SUBMIT.sysStaffSet = () => { const s = ADMIN.staff.find(x => x.id === S.sysNewStaff), m = STORE.agy.lmails.find(x => x.kind === 'staff' && x.staffId === s.id && !x.used); if (m) m.used = true; s.last = now().toISOString(); S.auth = 'signin'; staffSignin(s.email); };
const ROLE_KEY = { 'System Administrator': 'SY', 'Academic Admin': 'KA', 'Business Admin': 'BA', IQA: 'QA', 'Finance Admin': 'FA' };
const ROLE_HOME = { SY: 'a-dashboard', KA: 'k-dashboard', BA: 'b-dashboard', QA: 'q-records', FA: 'f-dashboard' };
function enterAsPerson(s, role) {
  const key = ROLE_KEY[role]; setAdminIdentity(key);
  ADMIN.me = { ...ADMIN.me, name: s.name, first: s.name.split(' ')[0], email: s.email, id: s.id, roles: s.roles.slice() };
  S.multiRoles = s.roles.filter(r => ROLE_KEY[r]); S.multiCur = role; S.multiPerson = s.id;
  S.portal = 'admin'; S.signedIn = true; S.auth = 'signin'; S.authMsg = null; S.serverError = false; go(ROLE_HOME[key]);
}
INP.mCtx = el => { const s = ADMIN.staff.find(x => x.id === S.multiPerson); if (s) { enterAsPerson(s, el.value); toast('Role context: ' + el.value, 'info'); } };
const SYS_EMAILS = { 'owen.price@illumin-academy.example': 'SY', 'rhys.talbot@illumin-academy.example': 'SB' };
const _ssS = staffSignin;
staffSignin = function (e) {
  S.multiRoles = null;
  const k = SYS_EMAILS[e];
  if (k) {
    if (k === 'SB' && STORE.sys && STORE.sys.solo) { S.authMsg = { html: '<strong>Your staff account is suspended or deactivated.</strong> Contact a Super Administrator.' }; render(); return true; }
    const v = k === 'SY' && ADMIN.sysRole && ['SC', 'SD'].includes(ADMIN.av) ? ADMIN.av : k; setAdminIdentity(v);
    const rec = ADMIN.staff.find(x => x.email === e);
    if (rec && rec.roles.length !== ADMIN.me.roles.length) { ADMIN.me.roles = rec.roles.slice(); S.multiRoles = rec.roles.filter(r => ROLE_KEY[r]); S.multiCur = 'System Administrator'; S.multiPerson = rec.id; }
    if (true) { S.tfa = { tries: 0, method: 'app', setUp: true, resendAt: 0 }; S.auth = 'tfa-code'; S.authMsg = null; render(); return true; }
    sysEnter(); return true;
  }
  const s = ADMIN.staff.find(x => x.email.toLowerCase() === e.toLowerCase());
  if (s && s.newUser) {
    if (s.status !== 'Active') { S.authMsg = { html: '<strong>Your staff account is suspended or deactivated.</strong> Contact the System Administrator.' }; render(); return true; }
    const adm = s.roles.find(r => ROLE_KEY[r]);
    if (adm) { enterAsPerson(s, adm); toast(`Signed in as ${s.name} (${s.roles.join(' + ')}).`, 'info'); return true; }
    if (s.roles.some(r => ['Teacher', 'Assessor'].includes(r))) { const key = 'N' + s.id.replace(/\D/g, ''); TAS_USERS[key] = TAS_USERS[key] || { key, name: s.name, first: s.name.split(' ')[0], email: s.email, roles: s.roles.filter(r => ['Teacher', 'Assessor', 'Academic Coordinator'].includes(r)), label: key + ' · ' + s.name, batches: [], quals: s.quals || '—', reg: s.reg || '—' }; S.tas.v = key; tasEnter(); toast(`Signed in as ${s.name} — no learners allocated yet.`, 'info'); return true; }
    if (s.roles.includes('Academic Coordinator')) { const key = 'N' + s.id.replace(/\D/g, ''); COO_USERS[key] = COO_USERS[key] || { key, name: s.name, first: s.name.split(' ')[0], email: s.email, roles: ['Academic Coordinator'], label: s.name }; S.coo.v = key; cooEnter(); return true; }
  }
  const res = _ssS(e);
  // Roles granted or revoked since last sign-in take effect now (role switcher for multi-role admins)
  const rec = ADMIN.staff.find(x => x.email.toLowerCase() === e.toLowerCase());
  if (res && rec && S.signedIn && S.portal === 'admin' && ADMIN.me.email === rec.email && rec.roles.join() !== ADMIN.me.roles.join() && !rec.roles.includes('Super Administrator')) { ADMIN.me.roles = rec.roles.slice(); const ar = rec.roles.filter(r => ROLE_KEY[r]); if (ar.length > 1) { S.multiRoles = ar; S.multiCur = ar.find(r => ADMIN.variant && ROLE_KEY[r] && (ADMIN.av || '').startsWith(ROLE_KEY[r][0])) || ar[0]; S.multiPerson = rec.id; } render(); }
  return res;
};
function sysEnter() { S.portal = 'admin'; S.signedIn = true; S.auth = 'signin'; S.staffFlow = false; S.failCount = 0; S.authMsg = null; S.serverError = false; const back = S.returnTo && S.returnTo.startsWith('a-') ? S.returnTo : null; S.returnTo = null; if (back) { setRoute(back); render(); } else go('a-dashboard'); }
ACT.demoSignInAsSys = el => { const v = el.dataset.v; setAdminIdentity(v); if (true) { signOut(); setAdminIdentity(v); S.portal = 'admin'; S.authEmail = ADMIN.me.email; S.tfa = { tries: 0, method: 'app', setUp: true, resendAt: 0 }; S.auth = 'tfa-code'; render(); toast('2FA applies — use code 123456.', 'info'); return; } sysEnter(); };

/* ---------- Demo switcher (§A8) ---------- */
const _rshS = roleSwitchHtml;
roleSwitchHtml = function () { const on = n => !!(ADMIN && ADMIN.sysRole && S.portal === 'admin' && ADMIN.me.name === n); return _rshS().replace(/aria-pressed="true"( data-act="switchRole" data-r="admin")/, (m, r) => `aria-pressed="${S.portal === 'admin' && !ADMIN.aca && !ADMIN.fin && !ADMIN.biz && !ADMIN.iqaRole && !ADMIN.sysRole}"${r}`).replace('</div><button class="btn btn-sm" data-act="resetDemo">', `<button aria-pressed="${on(SYS_A)}" data-act="switchRole" data-r="sysA">System Admin A</button><button aria-pressed="${on(SYS_B)}" data-act="switchRole" data-r="sysB">System Admin B</button></div><button class="btn btn-sm" data-act="resetDemo">`); };
const _srS = ACT.switchRole;
ACT.switchRole = el => { const r = el.dataset.r; S.multiRoles = null; if (r === 'sysA' || r === 'sysB') { if (S.route && (S.route.startsWith('w-') || S.route === 'm-inbox')) S.route = ''; setAdminIdentity(r === 'sysA' ? 'SY' : 'SB'); sysEnter(); toast(`Viewing as ${ADMIN.me.name} (System Administrator)`, 'info'); return; } if (ADMIN.sysRole && !['staff', 'agyA', 'agyB', 'linbox', 'wpc'].includes(r)) setAdminIdentity(ADMIN._saAv || 'A'); _srS(el); };
const _dsaS = ACT.demoSignInAs; ACT.demoSignInAs = el => { if (el.dataset.r === 'admin' && ADMIN.sysRole) setAdminIdentity(ADMIN._saAv || 'A'); _dsaS(el); };
const _resetS = ACT.resetDemo;
ACT.resetDemo = () => { const av = ADMIN.av, keep = SYS_VARIANTS[av] ? av : null; if (keep) setAdminIdentity(ADMIN._saAv || 'A'); _resetS(); S.multiRoles = null; if (keep) { setAdminIdentity(keep); if (S.portal === 'admin') render(); } };
const tfaToggle = () => ''; // G1.4: 2FA is always required for System Admin — the demo toggle is removed
INP.sys2fa = el => { S.sys2fa = el.checked; toast(el.checked ? 'System Admin sign-in now goes through 2FA.' : '2FA no longer required for System Admin.', 'info'); render(); };
const _adpS = adminDemoPanel;
adminDemoPanel = function () {
  if (!ADMIN.sysRole) { let h = _adpS(); const i = h.indexOf('<legend>Super Admin variant — demo only</legend>'); if (i > 0) { const j = h.indexOf('</fieldset>', i); h = h.slice(0, j) + `<label class="vopt"><input type="radio" name="av" value="SY" data-onchange="sysVariant"><span><strong>C · System Admin only (new)</strong><br><span class="xs muted">Owen Price · no Super Administrator powers</span></span></label>${tfaToggle()}` + h.slice(j); } return h; }
  const g = (l, r) => `<button class="btn btn-sm" data-act="finGo" data-r="${r}">${l}</button>`;
  return `<div class="demo-panel" role="dialog" aria-label="Prototype demo controls"><div class="row-b"><h2>Prototype controls</h2><button class="icon-btn" data-act="demoToggle" aria-label="Close demo controls">${ic('x')}</button></div>${roleSwitchHtml()}
  <fieldset><legend>System Admin variant — demo only</legend>${Object.entries(SYS_VARIANTS).map(([k, v], n) => `<label class="vopt"><input type="radio" name="sv" value="${k}" ${ADMIN.av === k ? 'checked' : ''} data-onchange="sysVariant"><span><strong>${'ABCDE'[n]} · ${v.label}</strong><br><span class="xs muted">${v.note}</span></span></label>`).join('')}${tfaToggle()}</fieldset>
  <fieldset><legend>System Admin edge states (§7) — demo only</legend><div class="btns">${g('Escalated item (read-only)', 'a-queue.AQ-R-1088-B')}${g('Self-approval: my Data Correction', 'a-queue.AQ-8005')}${g('Forwarded — awaiting Super Admin', 'a-queue.AQ-8002')}${g('Identity-field profile change', 'a-queue.AQ-R-1085')}${g('Super Admin account (locked)', 'a-staff.ST-001')}${g('Grant Super Admin role via URL', 'a-roles.Super Administrator')}<button class="btn btn-sm" data-act="sysSimOverride">Super Admin overrides my decision</button><button class="btn btn-sm" data-act="sysSimFinalReject">Super Admin rejects a forwarded correction</button><button class="btn btn-sm" data-act="sessionWarn">Session timeout</button><button class="btn btn-sm" data-act="aDemo404">404</button><button class="btn btn-sm" data-act="demoServer">500</button><button class="btn btn-sm" data-act="toggleOffline">Offline</button></div></fieldset>
  <fieldset><legend>View — demo only</legend><div class="seg" role="group" aria-label="Layout preview"><button aria-pressed="${S.frame !== 'mobile'}" data-act="frame" data-f="auto">${ic('monitor', 14)} Full width</button><button aria-pressed="${S.frame === 'mobile'}" data-act="frame" data-f="mobile">${ic('phone', 14)} 390px phone</button></div></fieldset>
  <button class="btn btn-primary" data-act="finGo" data-r="a-index">Open admin screen index</button></div>`;
};
INP.sysVariant = el => ACT.demoSignInAsSys({ dataset: { v: el.value } });
function asSuper(fn) { const keep = ADMIN.av, sv = { me: ADMIN.me, sys: ADMIN.sysRole }; setAdminIdentity(ADMIN._saAv || 'A'); try { fn(); } finally { setAdminIdentity(keep); } }
ACT.sysSimOverride = () => { const i = ADMIN.queue.find(x => x.id === 'AQ-8003'); asSuper(() => { const from = i.status; i.status = 'Approved'; i.override = { by: ADMIN.me.name, at: now().toISOString(), from, to: 'Approved', reason: 'ID evidence received by the Super Admin directly.' }; logA('Approvals Queue', i.id, 'Override decision', from, 'Approved', 'ID evidence received by the Super Admin directly.'); }); render(); toast('Demo only: the Super Administrator overrode your rejection of AQ-8003.', 'info'); };
ACT.sysSimFinalReject = () => { const i = ADMIN.queue.find(x => x.type === 'Data correction' && x.stage === 'final' && isOpen(x)); if (!i) { toast('Forward a Data Correction first.', 'info'); return; } asSuper(() => applyDecision(i, 'reject', 'Evidence insufficient for a certificate re-issue.', {})); render(); toast('Demo only: the Super Administrator rejected ' + i.id + ' at final review.', 'info'); };

/* ---------- Screen index (§10.6) ---------- */
const SYS_DIFFS = [['Final approval of Data Correction Requests', 'Replaced by "Forward to Super Admin for final approval"; then read-only "Awaiting Super Admin"'], ['Override any Approvals Queue decision', '"Override decision" not rendered'], ['Escalation recipient', '"Escalated to me" removed; escalated items read-only with a banner'], ['Grant / remove the Super Administrator role', 'Role chip disabled in Add user and Roles; Super Admin accounts locked'], ['Removing the last Super Administrator', 'Not applicable — the Super role can\'t be touched'], ['Super Admin actions without approval', 'Super Administrator actions apply immediately (reason, audit entry, FYI notification). A System Admin\'s own items still follow normal routing and self-approval rules']];
const _idxS = SCREENS.index;
SCREENS.index = p => _idxS(p) + `<section class="card idx-sec"><h2>System Administrator</h2><ul class="idx-list"><li><button class="linklike" data-act="demoSignInAsSys" data-v="SY">Sign in as System Admin A (demo)</button></li><li><button class="linklike" data-act="demoSignInAsSys" data-v="SB">Sign in as System Admin B (demo)</button></li><li><button class="linklike" data-act="demoSignInAsSys" data-v="SC">Variant C — only one System Admin</button></li><li><button class="linklike" data-act="demoSignInAsSys" data-v="SD">Variant D — System Admin + Finance Admin</button></li></ul><h3 class="small">Differences from Super Administrator</h3><div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Super-Admin-only power</th><th>For System Admin</th></tr></thead><tbody>${SYS_DIFFS.map(r => `<tr><td class="small">${r[0]}</td><td class="small">${r[1]}</td></tr>`).join('')}</tbody></table></div></section>`;
const _aIdxS = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxS(p) + (isSys() ? `<section class="card idx-sec"><h2>System Administrator — differences</h2><ul class="idx-list">${SYS_DIFFS.map(r => `<li class="small"><strong>${r[0]}:</strong> ${r[1]}</li>`).join('')}</ul></section>` : '');
AFTER.push(() => { const d = $('.demo-hint .row'); if (d && !S.signedIn && !d.querySelector('[data-act="demoSignInAsSys"]')) d.insertAdjacentHTML('beforeend', '<button type="button" class="btn btn-sm" data-act="demoSignInAsSys" data-v="SY">Sign in as System Admin A (demo)</button><button type="button" class="btn btn-sm" data-act="demoSignInAsSys" data-v="SB">Sign in as System Admin B (demo)</button>'); });

if (ADMIN) sysPatch();
