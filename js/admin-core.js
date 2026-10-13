/* Super Administrator console — shell, sign-in routing, 2FA, shared admin components (data table, audit panel, reason dialog), demo controls. */
'use strict';

/* ---------- Navigation ---------- */
const ANAV = [
  ['Overview', [['a-dashboard', 'Dashboard', 'home'], ['a-queue', 'Approvals Queue', 'inbox']]],
  ['People', [['a-learners', 'Learners', 'users'], ['a-admissions', 'Admissions & Documents', 'clip'], ['a-staff', 'Staff & Users', 'user'], ['a-roles', 'Roles & Capabilities', 'shield']]],
  ['Academic', [['a-courses', 'Short Courses', 'book'], ['a-programmes', 'NVQ Programmes', 'layers'], ['a-assignments', 'Assignments & Criteria Mapping', 'edit'], ['a-batches', 'Batches', 'users'], ['a-scheduling', 'Scheduling & Calendars', 'cal'], ['a-observations', 'Observations', 'eye'], ['a-attendance', 'Attendance (Zoom)', 'checksq'], ['a-resources', 'Learning Resources', 'doc'], ['a-records', 'Assessment Records & Quality', 'chart']]],
  ['Credentials', [['a-certificates', 'Certificates', 'award']]],
  ['Commercial', [['a-agencies', 'Agencies', 'building'], ['a-bundles', 'Bundles & Licences', 'pkg'], ['a-referrals', 'Referrals', 'link']]],
  ['Finance', [['a-finance', 'Finance', 'card']]],
  ['Insight', [['a-reports', 'Reports & Analytics', 'chart']]],
  ['Communication', [['a-announcements', 'Announcements', 'pin'], ['a-messages', 'Messages', 'msg'], ['a-notifsettings', 'Notification Settings', 'bell']]],
  ['Governance', [['a-dataprotection', 'Data Protection & Archive', 'lock'], ['a-audit', 'Audit & Security Logs', 'shield']]],
  ['System', [['a-integrations', 'Integrations', 'link'], ['a-config', 'System Configuration', 'key']]],
  ['Me', [['a-me', 'My Profile & Security', 'user']]],
];
const GOVERNANCE = ['a-dashboard', 'a-queue', 'a-staff', 'a-roles', 'a-dataprotection', 'a-audit', 'a-me', 'a-index'];
const ASECTION = { 'a-learner': 'a-learners' };

/* ---------- Render ---------- */
function adminRender() {
  if (!S.route.startsWith('a-') && !S.route.startsWith('f-') && !S.route.startsWith('k-') && !S.route.startsWith('b-') && !S.route.startsWith('q-')) S.route = 'a-dashboard';
  const sec = ASECTION[S.route] || S.route;
  const q = allQueue(), mine = q.filter(awaitingMe), esc_ = q.filter(i => i.escalated && isOpen(i));
  const unread = ADMIN.myNotifs.filter(n => n.unread).length;
  $('#app').innerHTML = `<div class="adm"><button class="skip btn btn-primary" data-act="skip">Skip to main content</button>
  <header class="hdr adm-hdr">
    <button class="icon-btn adm-menu-btn" data-act="aDrawer" aria-label="Menu" aria-expanded="${!!S.aDrawer}">${ic('menu')}</button>
    <a class="logo" href="#a-dashboard" data-go="a-dashboard">${LOGO}<div><b>Illumin Academy</b><span>Admin console</span></div></a>
    <div class="hdr-search adm-search" role="search">${ic('search', 16)}<label class="sr" for="asearch">Search learners, staff, agencies, courses, batches, certificates, transactions and queue items</label><input id="asearch" type="search" placeholder="Search learners, certificates, TXN refs, queue IDs…" value="${esc(S.aq || '')}" data-oninput="aSearch" autocomplete="off">${S.aq ? searchResults(S.aq) : ''}</div>
    <div class="hdr-right">
      <button class="btn btn-sm adm-appr" data-go="a-queue" aria-label="Approvals Queue: ${mine.length} awaiting me${esc_.length && isSA() ? `, ${esc_.length} escalated to me` : ''}">${ic('inbox', 15)}<span class="hide-sm">Approvals Queue</span><span class="chip t-blue">${mine.length}</span>${esc_.length && isSA() ? `<span class="chip t-red">${esc_.length} escalated</span>` : ''}</button>
      <button class="icon-btn" data-act="menu" data-m="abell" aria-label="Notifications, ${unread} unread">${ic('bell', 20)}${unread ? `<span class="badge">${unread}</span>` : ''}</button>
      <button class="icon-btn" data-go="a-messages" aria-label="Messages">${ic('msg', 20)}${ADMIN.threads.filter(t => t.status === 'Open').length ? `<span class="badge">${ADMIN.threads.filter(t => t.status === 'Open').length}</span>` : ''}</button>
      <span class="role-ctx hide-sm" title="Role context">${esc(ADMIN.me.roles.join(' · '))}</span>
      <button class="avatar-btn" data-act="menu" data-m="aavatar" aria-label="Account menu"><span class="avatar">${ADMIN.me.name.split(' ').map(x => x[0]).join('').slice(0, 2)}</span></button>
    </div>
    ${S.menu === 'abell' ? `<div class="dd" role="dialog" aria-label="Notifications"><div class="dd-h"><h3>Notifications</h3><button class="linklike small" data-act="aMarkRead">Mark all read</button></div><ul class="dd-list">${ADMIN.myNotifs.slice(0, 5).map((n, i) => `<li><button class="dd-item" data-act="aOpenNotif" data-i="${i}">${n.unread ? '<span class="unread-dot"></span>' : '<span class="read-dot"></span>'}<span class="stack" style="gap:2px"><span class="small ${n.unread ? 'strong' : ''}">${esc(n.t)}</span><span class="xs muted">${esc(n.b)} · ${rel(n.at)}</span></span></button></li>`).join('') || '<li class="small muted" style="padding:12px 14px">No notifications yet. New ones appear here.</li>'}</ul></div>` : ''}
    ${S.menu === 'aavatar' ? `<div class="dd" style="width:260px" role="menu"><div class="dd-h"><div><div class="strong">${esc(ADMIN.me.name)}</div><div class="xs muted">${esc(ADMIN.me.email)}</div></div></div><ul class="menu-list"><li><button data-go="a-me">${ic('user')}My profile</button></li><li><button data-go="a-me" data-tab="security">${ic('shield')}Security &amp; 2FA</button></li><li><button data-act="logout">${ic('logout')}Sign out</button></li></ul></div>` : ''}
  </header>
  <div class="adm-frame">
    <nav class="adm-side ${S.aDrawer ? 'open' : ''}" aria-label="Admin navigation">${(typeof adminNav === 'function' ? adminNav() : ANAV).map(([g, items]) => `<div class="adm-group"><button class="adm-gh" data-act="aGroup" data-g="${g}" aria-expanded="${!(S.ui['ag-' + g])}">${g}<span aria-hidden="true">${S.ui['ag-' + g] ? '+' : '−'}</span></button>${S.ui['ag-' + g] ? '' : `<ul>${items.map(([r, l, i]) => `<li><a href="#${r}" data-go="${r}" ${sec === r ? 'aria-current="page"' : ''}>${ic(i, 16)}<span>${l}</span>${r === 'a-queue' && mine.length ? `<span class="cnt">${mine.length}</span>` : ''}</a></li>`).join('')}</ul>`}</div>`).join('')}
      <div class="adm-group"><a href="#a-index" data-go="a-index" class="small" style="padding:6px 10px;display:block">Admin screen index</a></div></nav>
    ${S.aDrawer ? '<div class="scrim adm-scrim" data-act="aDrawer"></div>' : ''}
    <main id="main" class="main" tabindex="-1">${adminBanners()}<div class="page adm-page">${adminPage()}</div><footer class="foot"><span>© 2026 Illumin Academy · Admin console</span><span class="spacer"></span><span>Times in ${tzl()} (Europe/London)</span></footer></main>
  </div></div>`;
}
function adminBanners() {
  const out = [];
  if (S.offline) out.push(banner('grey', 'wifioff', `<strong>You're offline.</strong> Changes are queued and will sync when you reconnect.`, `<button class="btn btn-sm" data-act="toggleOffline">Retry now</button>`));
  const e = ADMIN.edge;
  if (e === 'zoomDown') out.push(banner('red', 'zoom', '<strong>Zoom unavailable — manual marking enabled.</strong> Attendance reports can\'t be retrieved. Teachers can mark attendance manually.', `<button class="btn btn-sm" data-go="a-attendance">Open attendance</button>`));
  if (e === 'emailDown') out.push(banner('red', 'send', '<strong>Email delivery failing.</strong> Notifications are falling back to SMS and in-app messages.', `<button class="btn btn-sm" data-go="a-integrations">View integration</button>`));
  if (e === 'payDown') out.push(banner('red', 'card', '<strong>Payment gateway not responding.</strong> Learner payments will retry automatically every 10 minutes.', `<button class="btn btn-sm" data-go="a-integrations">View integration</button>`));
  if (ADMIN.integrations.some(i => i.status === 'Failing') && e === 'none') out.push(banner('red', 'alert', `<strong>Integration failure:</strong> ${ADMIN.integrations.filter(i => i.status === 'Failing').map(i => i.name).join(', ')} — sustained failures since ${ft(D(-1, '17:44'))} yesterday.${canIntegrations() ? '' : ' The Super Administrator has been notified — nothing for you to do.'}`, canIntegrations() ? `<button class="btn btn-sm" data-go="a-integrations">Open Integrations</button>` : ''));
  return out.length ? `<div class="banners">${out.join('')}</div>` : '';
}
function adminPage() {
  if (S.serverError) return errorPage();
  const fn = SCREENS[S.route];
  if (!fn) return notFound().replace(/data-go="dashboard"/, 'data-go="a-dashboard"').replace(/data-go="index"/, 'data-go="a-index"');
  try { return fn(S.params); } catch (err) { console.error(err); return errorPage(); }
}
function searchResults(q) {
  q = q.toLowerCase(); const r = [];
  allLearners().forEach(l => { if ((l.name + l.id + l.email).toLowerCase().includes(q)) r.push(['Learner', l.name + ' · ' + l.id, 'a-learner.' + l.id]); });
  ADMIN.staff.forEach(s => { if ((s.name + s.email).toLowerCase().includes(q)) r.push(['Staff', s.name, 'a-staff.' + s.id]); });
  ADMIN.agencies.forEach(a => { if (a.name.toLowerCase().includes(q)) r.push(['Agency', a.name, 'a-agencies.' + a.id]); });
  ADMIN.courses.forEach(c => { if (c.title.toLowerCase().includes(q)) r.push(['Course', c.title, 'a-courses.' + c.id]); });
  ADMIN.batches.forEach(b => { if ((b.code + b.label).toLowerCase().includes(q)) r.push(['Batch', b.label + ' — ' + b.code, 'a-batches.' + b.code]); });
  allCerts().forEach(c => { if (c.no.toLowerCase().includes(q)) r.push(['Certificate', c.no + ' · ' + c.learner, 'a-certificates.' + c.key]); });
  allTx().forEach(t => { if (t.ref.toLowerCase().includes(q)) r.push(['Transaction', t.ref + ' · ' + t.payer, 'a-finance']); });
  allQueue().forEach(i => { if (i.id.toLowerCase().includes(q)) r.push(['Queue item', i.id + ' · ' + i.type, 'a-queue.' + i.id]); });
  return `<div class="dd adm-sr" style="left:0;right:auto;top:42px;width:min(520px,90vw)"><ul class="dd-list">${r.slice(0, 10).map(x => `<li><button class="dd-item" data-act="goTok" data-t="${x[2]}"><span class="typebadge">${x[0]}</span><span class="small">${esc(x[1])}</span></button></li>`).join('') || '<li class="dd-item small muted">No matches</li>'}</ul></div>`;
}
INP.aSearch = el => { S.aq = el.value; render(); const i = $('#asearch'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); };
ACT.aDrawer = () => { S.aDrawer = !S.aDrawer; render(); };
ACT.aGroup = el => { S.ui['ag-' + el.dataset.g] = !S.ui['ag-' + el.dataset.g]; render(); };
ACT.aMarkRead = () => { ADMIN.myNotifs.forEach(n => n.unread = false); S.menu = null; render(); };
ACT.aOpenNotif = el => { const n = ADMIN.myNotifs[+el.dataset.i]; n.unread = false; S.menu = null; ACT.goTok({ dataset: { t: n.go } }); };
// Admin navigation clears search and drawer
const _go = go;
go = function (route, params) { if (S.portal === 'admin') { S.aq = ''; S.aDrawer = false; } return _go(route, params); };

/* ---------- Out-of-scope guard — G1.3: the Super Administrator has every permission, so variant B is never out of scope ---------- */
function guard(act) {
  if (false) {
    ADMIN.security.unshift({ id: 'SE-' + (600 + ADMIN.security.length), sev: 'Medium', at: now().toISOString(), type: 'Out-of-scope action', detail: `${ADMIN.me.name} attempted "${act}" in ${S.route.slice(2)}`, reviewed: false });
    toast('You don\'t have permission for this action — logged.', 'err'); return false;
  }
  return true;
}

/* ---------- Sign-in routing, 2FA ---------- */
const STAFF_2FA = ['Super Administrator', 'System Administrator', 'Finance Admin'];
function staffSignin(e) {
  const isStaff = e.includes('admin') || ADMIN.staff.some(s => s.email === e && s.roles.some(r => STAFF_2FA.includes(r)));
  if (!isStaff) return false;
  if (e.includes('suspended') || e.includes('deactivated')) { S.authMsg = { html: '<strong>Your staff account is suspended or deactivated.</strong> Contact the System Administrator.' }; render(); return true; }
  S.tfa = { tries: 0, method: S.tfa?.method || 'app', setUp: S.tfa?.setUp ?? true, resendAt: 0 };
  S.auth = S.tfa.setUp ? 'tfa-code' : 'tfa-setup'; S.authMsg = null; render(); return true;
}
function learnerGate() {
  const a = STORE.acct[S.variant];
  if (a === 'Deactivated') { S.authMsg = { html: '<strong>Your account is inactive — contact the Academy.</strong> ' + academyContact() }; render(); return true; }
  if (a === 'Archived') { S.edge = 'archived'; logA('Learners', W.me.id + ' · ' + W.me.first + ' ' + W.me.last, 'Archived learner login', 'Archived', 'Archived (read-only session)', 'Learner signed in to an archived account'); }
  return false;
}
function codeBoxes() { return `<div class="otp" role="group" aria-label="6-digit code">${[0, 1, 2, 3, 4, 5].map(i => `<input class="input otp-i" inputmode="numeric" maxlength="1" aria-label="Digit ${i + 1}" data-oninput="otp" data-i="${i}" ${i === 0 ? 'autofocus' : ''}>`).join('')}</div>`; }
function tfaView() {
  const a = S.auth, t = S.tfa || {}, m = S.authMsg;
  const msg = m ? `<div class="note b-${m.tone || 'red'}" role="alert">${ic('alert')}<div>${m.html}</div></div>` : '';
  const hint = `<div class="demo-hint"><strong>Prototype:</strong> code <code>123456</code> works · <code>000000</code> = expired · 3 wrong codes lock the account.</div>`;
  if (a === 'tfa-setup') return authShell(`<p class="eyebrow">Staff account · ${esc(ADMIN.me.name)}</p><h1>Set up two-step verification</h1><p class="muted">Super Administrators, System Administrators and Finance Admins must use a second step when signing in.</p>
    <div class="stack"><button class="card" style="text-align:left;cursor:pointer" data-act="tfaMethod" data-m="app"><strong>${ic('phone', 16)} Authenticator app</strong><span class="small muted">Recommended. Use an app like Microsoft or Google Authenticator.</span></button><button class="card" style="text-align:left;cursor:pointer" data-act="tfaMethod" data-m="email"><strong>${ic('send', 16)} Email code</strong><span class="small muted">We'll email a 6-digit code to ${esc(ADMIN.me.email)} each time.</span></button></div>`);
  if (a === 'tfa-app') return authShell(`<h1>Scan this QR code</h1><p class="muted">Open your authenticator app and scan the code, or enter the key manually.</p><div class="row" style="gap:16px">${qr('otpauth://illumin/' + ADMIN.me.email, 120)}<div class="field"><span class="lbl">Manual key</span><span class="mono" style="font-size:1rem">JBSW Y3DP EHPK 3PXP</span><button class="linklike small" data-act="tfaCopyKey">Copy key</button></div></div>${msg}<form class="stack" data-submit="tfaConfirm"><label class="lbl">Enter the 6-digit code to confirm</label>${codeBoxes()}<button class="btn btn-primary btn-block" type="submit">Confirm</button></form>${hint}`);
  if (a === 'tfa-email') return authShell(`<h1>Check your email</h1><p class="muted">We sent a 6-digit code to ${esc(ADMIN.me.email)}. It expires in 15 minutes.</p>${msg}<form class="stack" data-submit="tfaConfirm"><label class="lbl">Enter the code to confirm</label>${codeBoxes()}<button class="btn btn-primary btn-block" type="submit">Confirm</button></form>${hint}`);
  if (a === 'tfa-recovery') return authShell(`<h1>Save your recovery codes</h1><p class="muted">Use one of these if you lose access to your authenticator. Each code works once.</p><div class="card mono" style="grid-template-columns:repeat(2,1fr);gap:6px">${['7F2K-9QMD', 'H4LP-2XRT', 'C8NV-5JWE', 'Q3ZB-7KUA', 'M6TD-1PFS', 'R9YC-4HGN', 'W2EX-8LQV', 'B5JU-6DMZ'].map(c => `<span>${c}</span>`).join('')}</div><div class="row"><button class="btn btn-sm" data-act="tfaCopyKey">${ic('copy', 14)}Copy</button><button class="btn btn-sm" data-act="fakeDl" data-f="illumin-recovery-codes.txt">${ic('download', 14)}Download</button></div><label class="check"><input type="checkbox" id="tfa-saved" data-onchange="tfaSaved"> I've saved these codes somewhere safe</label><button class="btn btn-primary btn-block" id="tfa-done" disabled data-act="tfaFinish">Continue to the admin console</button>`);
  if (a === 'tfa-locked') return authShell(`<div class="lock-ic" style="background:var(--red-bg);color:var(--red)">${ic('lock', 28)}</div><h1>Too many attempts</h1><p>For your security, two-step verification is locked for 15 minutes. If you've lost your device, contact another Super Administrator to reset 2FA.</p><button class="btn" data-act="authGo" data-a="signin">Back to sign in</button>`);
  if (a === 'tfa-usecode') return authShell(`<h1>Use a recovery code</h1>${msg}<form class="stack" data-submit="tfaRecovery"><div class="field"><label for="rc">Recovery code</label><input class="input mono" id="rc" placeholder="XXXX-XXXX"></div><button class="btn btn-primary btn-block" type="submit">Verify</button></form><button class="linklike small" data-act="authGo" data-a="tfa-code">Use my 6-digit code instead</button>`);
  // tfa-code: every sign-in
  const cool = Math.max(0, Math.ceil((t.resendAt - Date.now()) / 1000));
  return authShell(`<p class="eyebrow">Two-step verification</p><h1>Enter your 6-digit code</h1><p class="muted">${t.method === 'email' ? `We emailed a code to ${esc(ADMIN.me.email)}.` : 'Open your authenticator app to get your code.'}</p>${msg}
    <form class="stack" data-submit="tfaCode">${codeBoxes()}<button class="btn btn-primary btn-block" type="submit">Verify and continue</button></form>
    <div class="row-b small">${t.method === 'email' ? `<button class="linklike" data-act="tfaResend" ${cool ? 'disabled' : ''}>${cool ? `Resend code in ${cool}s` : 'Resend code'}</button>` : `<button class="linklike" data-act="tfaSwitch">Email me a code instead</button>`}<button class="linklike" data-act="authGo" data-a="tfa-usecode">Use a recovery code</button></div>${hint}`);
}
INP.otp = el => {
  el.value = el.value.replace(/\D/g, '').slice(-1);
  if (el.value) { const n = el.parentElement.querySelectorAll('.otp-i')[+el.dataset.i + 1]; if (n) n.focus(); }
};
document.addEventListener('keydown', e => { if (e.key === 'Backspace' && e.target.classList?.contains('otp-i') && !e.target.value) { const p = e.target.previousElementSibling; if (p) p.focus(); } });
document.addEventListener('paste', e => { if (e.target.classList?.contains('otp-i')) { const d = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6); if (d.length) { e.preventDefault(); const bs = e.target.parentElement.querySelectorAll('.otp-i'); d.split('').forEach((c, i) => bs[i] && (bs[i].value = c)); } } });
const otpVal = () => $$('.otp-i').map(i => i.value).join('');
function checkCode(onOk) {
  const c = otpVal();
  if (c.length < 6) { S.authMsg = { html: 'Enter all 6 digits.' }; render(); return; }
  if (c === '000000') { S.authMsg = { html: '<strong>This code has expired.</strong> Codes are valid for 15 minutes. Request a new one.' }; render(); return; }
  if (c !== '123456') { S.tfa.tries = (S.tfa.tries || 0) + 1; if (S.tfa.tries >= 3) { S.auth = 'tfa-locked'; S.authMsg = null; ADMIN.security.unshift({ id: 'SE-' + (700 + S.tfa.tries), sev: 'Medium', at: now().toISOString(), type: '2FA failure', detail: `3 wrong codes for ${ADMIN.me.email} — locked 15 min`, reviewed: false }); render(); return; } S.authMsg = { html: `<strong>That code is incorrect.</strong> ${3 - S.tfa.tries} attempt${3 - S.tfa.tries === 1 ? '' : 's'} left.` }; render(); return; }
  S.authMsg = null; onOk();
}
function enterAdmin() {
  S.portal = 'admin'; S.signedIn = true; S.auth = 'signin'; S.staffFlow = false; S.failCount = 0;
  const back = S.returnTo && S.returnTo.startsWith('a-') ? S.returnTo : null; S.returnTo = null;
  if (back) { setRoute(back); render(); toast('Verified. We\'ve brought you back to where you were.', 'info'); } else go('a-dashboard');
}
SUBMIT.tfaCode = () => checkCode(() => { if ($('#trust')?.checked) toast('This device will be trusted for 30 days.', 'info'); enterAdmin(); });
SUBMIT.tfaConfirm = () => checkCode(() => { S.tfa.setUp = true; S.auth = 'tfa-recovery'; render(); });
SUBMIT.tfaRecovery = () => { if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test($('#rc').value.trim())) { S.authMsg = { html: 'That recovery code isn\'t valid. Check it and try again.' }; render(); return; } toast('Recovery code accepted. 7 codes left.', 'info'); enterAdmin(); };
ACT.tfaMethod = el => { S.tfa = S.tfa || {}; S.tfa.method = el.dataset.m; S.auth = el.dataset.m === 'app' ? 'tfa-app' : 'tfa-email'; S.authMsg = null; render(); };
ACT.tfaCopyKey = () => copyText('JBSWY3DPEHPK3PXP', 'Copied');
INP.tfaSaved = el => { $('#tfa-done').disabled = !el.checked; };
ACT.tfaFinish = () => { toast('Two-step verification is on.'); enterAdmin(); };
ACT.tfaResend = () => { S.tfa.resendAt = Date.now() + 30000; toast('New code sent. It expires in 15 minutes.'); render(); timer('tfacool', () => { if (S.auth !== 'tfa-code') return clearTimer('tfacool'); render(); if (Date.now() > S.tfa.resendAt) clearTimer('tfacool'); }, 1000); };
ACT.tfaSwitch = () => { S.tfa.method = 'email'; S.tfa.resendAt = Date.now() + 30000; S.authMsg = { tone: 'blue', html: 'We\'ve emailed you a code.' }; render(); };

/* ---------- Role switching & demo ---------- */
ACT.demoSignInAs = el => {
  if (el.dataset.r === 'learner') { S.portal = 'learner'; S.edge = 'none'; setVariant('C'); S.signedIn = true; S.auth = 'signin'; go('dashboard'); toast('Signed in as Aisha Rahman (learner).', 'info'); }
  else { S.authEmail = ADMIN.me.email; S.tfa = { tries: 0, method: 'app', setUp: true, resendAt: 0 }; S.signedIn = false; S.auth = 'tfa-code'; S.authMsg = null; render(); }
};
function roleSwitchHtml() {
  return `<fieldset><legend>Role — demo only</legend><div class="seg" role="group" aria-label="Portal role"><button aria-pressed="${S.portal !== 'admin'}" data-act="switchRole" data-r="learner">Learner</button><button aria-pressed="${S.portal === 'admin'}" data-act="switchRole" data-r="admin">Super Admin</button></div><button class="btn btn-sm" data-act="resetDemo">Reset demo data</button><span class="xs muted">Both portals share one data store. Switching keeps your changes.</span></fieldset>`;
}
ACT.switchRole = el => {
  if (el.dataset.r === 'admin') { S.portal = 'admin'; S.signedIn = true; S.serverError = false; go('a-dashboard'); toast(`Viewing as ${ADMIN.me.name} (${ADMIN.me.roles.join(' · ')})`, 'info'); }
  else { S.portal = 'learner'; S.signedIn = true; S.serverError = false; W = STORE.worlds[S.variant]; applyEdge(); go('dashboard'); toast(`Viewing as ${W.me.first} ${W.me.last} (learner)`, 'info'); }
};
ACT.resetDemo = () => { const av = ADMIN.av; S.edge = 'none'; S.ui = {}; initStore(); buildAdmin(av); toast('Demo data reset for both portals.'); render(); };
const AEDGES = [['none', 'None (normal)'], ['emptyQueue', 'Empty Approvals Queue'], ['zoomDown', 'Zoom outage → manual attendance'], ['emailDown', 'Email outage → SMS / in-app fallback'], ['payDown', 'Payment gateway outage → retry'], ['certFail', 'Certificate generation failure'], ['exportFail', 'Next export fails']];
function adminDemoPanel() {
  return `<div class="demo-panel" role="dialog" aria-label="Prototype demo controls"><div class="row-b"><h2>Prototype controls</h2><button class="icon-btn" data-act="demoToggle" aria-label="Close demo controls">${ic('x')}</button></div>
  ${roleSwitchHtml()}
  <fieldset><legend>Super Admin variant — demo only</legend>${Object.entries(ADMIN_VARIANTS).map(([k, v]) => `<label class="vopt"><input type="radio" name="av" value="${k}" ${ADMIN.av === k ? 'checked' : ''} data-onchange="adminVariant"><span><strong>${k} · ${v.label}</strong><br><span class="xs muted">${v.me}${k === 'B' ? ' · full console (every permission)' : k === 'C' ? ' · Super Admin refunds are processed immediately' : ' · default, full access'}</span></span></label>`).join('')}</fieldset>
  <fieldset><legend>Admin edge state — demo only</legend><label class="sr" for="aedge">Admin edge state</label><select class="select" id="aedge" data-onchange="adminEdge">${AEDGES.map(([k, l]) => `<option value="${k}" ${ADMIN.edge === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <div class="btns"><button class="btn btn-sm" data-act="sessionWarn">Session timeout</button><button class="btn btn-sm" data-act="sessExpireNow">Session expired (2FA re-prompt)</button><button class="btn btn-sm" data-act="aDemo404">404</button><button class="btn btn-sm" data-act="demoServer">500</button><button class="btn btn-sm" data-act="toggleOffline">Offline</button></div></fieldset>
  <fieldset><legend>Staff sign-in — demo only</legend><div class="btns"><button class="btn btn-sm" data-act="staffAuth" data-a="tfa-code">2FA code entry</button><button class="btn btn-sm" data-act="staffAuth" data-a="tfa-setup">2FA first-time setup</button><button class="btn btn-sm" data-act="staffAuth" data-a="first">Staff first-time password</button><button class="btn btn-sm" data-act="staffAuth" data-a="tfa-locked">2FA locked</button><button class="btn btn-sm" data-act="staffAuth" data-a="suspended">Suspended staff</button></div></fieldset>
  <fieldset><legend>View — demo only</legend><div class="seg" role="group" aria-label="Layout preview"><button aria-pressed="${S.frame !== 'mobile'}" data-act="frame" data-f="auto">${ic('monitor', 14)} Full width</button><button aria-pressed="${S.frame === 'mobile'}" data-act="frame" data-f="mobile">${ic('phone', 14)} 390px phone</button></div></fieldset>
  <button class="btn btn-primary" data-go="a-index">Open admin screen index</button></div>`;
}
INP.adminVariant = el => { buildAdmin(el.value); S.signedIn = true; render(); toast(`Admin variant ${el.value}: ${ADMIN_VARIANTS[el.value].label}`, 'info'); };
INP.adminEdge = el => { ADMIN.edge = el.value; if (el.value === 'zoomDown') go('a-attendance'); else if (el.value === 'emptyQueue') go('a-queue'); else if (el.value === 'certFail') go('a-certificates', { tab: 'errors' }); else render(); };
ACT.aDemo404 = () => go('a-missing');
ACT.staffAuth = el => {
  const a = el.dataset.a; signOut(); S.portal = 'admin';
  if (a === 'suspended') { S.auth = 'signin'; S.authEmail = 'suspended.admin@illumin-academy.example'; S.authMsg = { html: '<strong>Your staff account is suspended or deactivated.</strong> Contact the System Administrator.' }; }
  else if (a === 'first') { S.staffFlow = true; S.auth = 'first'; }
  else { S.tfa = { tries: 0, method: 'app', setUp: a !== 'tfa-setup', resendAt: 0 }; S.auth = a; }
  render();
};
// Keep learner-side demo controls and screen index in the learner portal
['jump', 'demoAuth', 'openIndex'].forEach(k => { const f = ACT[k]; ACT[k] = (el, e) => { S.portal = 'learner'; return f(el, e); }; });
['variant', 'edge'].forEach(k => { const f = INP[k]; INP[k] = (el, e) => { S.portal = 'learner'; return f(el, e); }; });
const _signOut = signOut;
signOut = function (reason) { const p = S.portal; _signOut(reason); if (reason === 'expired' && p === 'admin') S.authMsg = { tone: 'blue', html: '<strong>Your session expired.</strong> Sign in again — you\'ll be asked for your 2FA code, then returned to the same admin page.' }; };

/* ---------- Shared admin components ---------- */
function reasonDlg({ title, body = '', ok = 'Confirm', danger, onOk, label = 'Reason (required)', extra = '' }) {
  openModal({ title, body: `${body}${extra}<div class="field"><label for="rsn">${label}</label><textarea class="textarea" id="rsn"></textarea><span class="hint">Recorded in the audit history.</span></div>`, actions: [{ label: 'Cancel' }, { label: ok, cls: danger ? 'btn-danger' : 'btn-primary', fn: () => { const r = mval('#rsn'); if (!r) { fieldErr('#rsn', 'Enter a reason'); return false; } return onOk(r, $('#modal-root .modal')); } }] });
}
function auditPanel(match, title = 'Activity / Audit history') {
  const rows = ADMIN.audit.filter(a => match(a)), id = 'lu-h-audit-' + (S.route || '') + '-' + String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `<section class="card"><div class="row-b"><h3>${title}</h3><span class="xs muted">Tamper-evident · read-only</span></div>${rows.length ? dt({ id, name: title, rows, noExport: true, rid: a => a.id || a.at + a.action, cols: [{ k: 'at', l: 'When', h: a => `<span class="nowrap">${fdt(a.at)}</span>`, v: a => a.at }, { k: 'actor', l: 'Actor', h: a => `${esc(a.actor)}<div class="xs muted">${esc(a.role)}</div>`, v: a => a.actor + ' ' + (a.role || '') }, { k: 'action', l: 'Action' }, { k: 'ba', l: 'Before → after', h: a => `<span class="small"><span class="strike">${esc(a.before)}</span> → <strong>${esc(a.after)}</strong></span>`, v: a => a.before + ' ' + a.after }, { k: 'reason', l: 'Reason', h: a => `<span class="small">${esc(a.reason)}</span>`, v: a => a.reason || '' }] }) : '<p class="small muted">No activity recorded yet.</p>'}</section>`;
}
function exportMenu(name, tid) { const t = tid ? ` data-tid="${esc(tid)}"` : ''; return `<div class="row"><button class="btn btn-sm" data-act="aExport" data-n="${esc(name)}" data-f="CSV"${t}>${ic('download', 14)}CSV</button><button class="btn btn-sm" data-act="aExport" data-n="${esc(name)}" data-f="Excel"${t}>Excel</button><button class="btn btn-sm" data-act="aExport" data-n="${esc(name)}" data-f="PDF"${t}>PDF</button></div>`; }
ACT.aExport = el => {
  const what = `${el.dataset.n} (${el.dataset.f})`;
  toast(`Preparing export — we'll notify you. This export is logged.`, 'info');
  ADMIN.exportsLog.unshift({ who: ADMIN.me.name, what, at: now().toISOString() });
  logA('Reports & Analytics', what, 'Exported', '—', el.dataset.f, '');
  const fail = ADMIN.edge === 'exportFail';
  setTimeout(() => { ADMIN.myNotifs.unshift({ t: fail ? 'Export failed' : 'Export ready', b: fail ? what + ' — the file couldn\'t be generated. Try again.' : what + ' — download link valid for 24 hours.', at: now().toISOString(), unread: true, go: 'a-reports' }); if (fail) ADMIN.edge = 'none'; toast(fail ? `Export failed: ${esc(what)}. Try again.` : `Export ready: ${esc(what)} — download from notifications.`, fail ? 'err' : 'ok'); if (S.portal === 'admin') render(); }, 2200);
};
const pageA = (title, sub, actions = '', crumbs) => pageHead(title, sub, actions, crumbs);
const ago = iso => { const d = -daysTo(iso); return d <= 0 ? 'today' : d + ' d'; };
function daysChip(d) { if (d == null) return '<span class="muted small">—</span>'; return `<span class="chip ${d >= 7 ? 't-red' : d >= 5 ? 't-amber' : 't-outline'}"><span class="chip-i" aria-hidden="true">${d >= 7 ? '!' : d >= 5 ? '!' : '○'}</span>${d} days${d >= 7 ? ' · overdue' : d >= 5 ? ' · nearing SLA' : ''}</span>`; }
const QTONE = { Pending: 'amber', Approved: 'green', Rejected: 'red', 'Returned to Requester': 'grey', 'Info Requested': 'blue', 'Paid/Processed': 'teal', Escalated: 'red', Cancelled: 'grey' };
const qchip = s => chip(s, QTONE[s]);
const cur = (n, c) => money(n, c);

/* Data table: search, filter chips, sort, column chooser, pagination, row count, bulk select, export */
const DT = {};
/* List upgrade (B1): list type per table id (prefix match) and its default date field.
   queue = work queue (order kept, oldest first where it is today) · history = newest first · ref = order kept. */
const LIST_META = {
  'queue': ['queue', 'Date raised'], 'squeue': ['queue', 'Raised'], 'kqueue': ['queue', 'Raised'], 'bqueue': ['queue', 'Date'], 'fq': ['queue', 'Raised'],
  'apps': ['queue', 'Applied'], 'docq': ['queue'], 'expdocs': ['queue', 'Expires'], 'perms': ['queue', 'Link sent'], 'fod': ['queue', 'Due'], 'fd': ['queue', 'Due'],
  'fpend': ['queue', 'Started'], 'fdups': ['queue', 'Date'], 'ffail': ['queue', 'When'], 'flinks': ['queue', 'Expired'], 'finv': ['queue'], 'elig': ['queue', 'Last activity'],
  'kmark': ['queue', 'Waiting since'], 'kbacklog': ['queue'], 'mq': ['queue', 'Submitted'], 'bexp': ['queue', 'Expires'], 'dsr': ['queue', 'Logged'], 'crel': ['queue', 'Sent'],
  'obs': ['history', 'Date'], 'cobs': ['history', 'Date'], 'zs': ['history', 'Date'], 'catt': ['history', 'Date'], 'tsess': ['history', 'Date'],
  'subs': ['history', 'Submitted'], 'csubs': ['history', 'Submitted'], 'qrec': ['history', 'Marked'], 'iqa': ['history', 'Date'], 'qfind': ['history', 'Date'], 'tiqa': ['history', 'Date'], 'qsets': ['history', 'Created'],
  'certs': ['history', 'Issued'], 'g-certs': ['history', 'Issued'], 'agp': ['history', 'Date'], 'ledger': ['history', 'Date'], 'bledger': ['history', 'Date'], 'ledger-tx': ['history', 'Date'], 'fledger': ['history', 'Date'],
  'frefunds': ['history', 'Raised'], 'bcr': ['history'], 'fagh': ['history', 'Date'], 'faudit': ['history', 'Timestamp'], 'audit': ['history', 'Timestamp'], 'sec': ['history', 'When'], 'nlog': ['history', 'When'],
  'ann': ['history', 'Date'], 'banns': ['history', 'Date'], 'cann': ['history', 'Date'], 'tann': ['history', 'Date'], 'g-anns': ['history', 'Date'], 'arch': ['history', 'Last activity'],
  'tapp': ['history', 'Date'], 'g-assign': ['history', 'Assigned'], 'g-bas': ['history', 'Assigned'], 'g-pur': ['history', 'Date'],
  'lu-h': ['history', 'Date'], 'lu-h-lreq': ['history', 'Raised'], 'lu-h-audit': ['history', 'When'], 'lu-h-lcert': ['history', 'Issued'], 'lu-h-lreq360': ['history', 'Raised'], 'lu-h-fwaiv': ['history', 'When'], 'lu-h-fexp': ['history', 'When'], 'lu-h-aexp': ['history', 'When'], 'lu-h-aarch': ['history', 'When'], 'lu-h-cchg': ['history', 'When'], 'lu-h-bsales': ['history', 'Purchased'], 'lu-h-cver': ['history', 'Effective from'], 'lu-h-arefund': ['history', 'Raised'], 'lu-r-calmon': ['ref', 'When'],
};
function listMeta(id) { let best = null; for (const k in LIST_META) if ((id === k || id.startsWith(k + '-')) && (!best || k.length > best.length)) best = k; return best ? LIST_META[best] : ['ref']; }
const DT_ISO = /^\d{4}-\d\d-\d\dT/;
const DT_PRESETS = [['all', 'All time'], ['today', 'Today'], ['yesterday', 'Yesterday'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['month', 'This month'], ['lastmonth', 'Last month'], ['year', 'This year'], ['custom', 'Custom range']];
const DT_PS = [10, 25, 50, 100];
// Ranges use the viewer's local time zone ("Today" = today locally). End is exclusive.
function dtRange(p, from, to) {
  const n = now(), y = n.getFullYear(), m = n.getMonth(), d0 = new Date(y, m, n.getDate()), day = 864e5;
  if (p === 'today') return [d0, new Date(+d0 + day)];
  if (p === 'yesterday') return [new Date(+d0 - day), d0];
  if (p === '7d') return [new Date(+d0 - 6 * day), new Date(+d0 + day)];
  if (p === '30d') return [new Date(+d0 - 29 * day), new Date(+d0 + day)];
  if (p === 'month') return [new Date(y, m, 1), new Date(y, m + 1, 1)];
  if (p === 'lastmonth') return [new Date(y, m - 1, 1), new Date(y, m, 1)];
  if (p === 'year') return [new Date(y, 0, 1), new Date(y + 1, 0, 1)];
  if (p === 'custom') return [from ? new Date(from + 'T00:00:00') : null, to ? new Date(+new Date(to + 'T00:00:00') + day) : null];
  return [null, null];
}
const dtLocalDay = dt0 => `${dt0.getFullYear()}-${String(dt0.getMonth() + 1).padStart(2, '0')}-${String(dt0.getDate()).padStart(2, '0')}`;
function dtOwner() { try { if (S.portal === 'learner') return 'L' + S.variant; if (S.portal === 'coord') return 'C' + S.coo.v; if (S.portal === 'staff') return 'T' + S.tas.v; if (S.portal === 'agency') return 'G' + (S.agy && S.agy.id); return 'A' + (ADMIN && ADMIN.me ? ADMIN.me.name + '|' + (ADMIN.av || '') : ''); } catch (e) { return S.portal || ''; } }
const dtGet = c => c.s || c.v || (r => r[c.k]);
function dtDateCols(cfg) { return cfg.cols.filter(c => { const g = dtGet(c); let n = 0, d = 0; for (const r of cfg.rows.slice(0, 12)) { let v; try { v = g(r); } catch (e) { } if (v == null || v === '') continue; n++; if (typeof v === 'string' && DT_ISO.test(v)) d++; } return n > 0 && d === n; }); }
function dtState(cfg) {
  const key = 'dt-' + cfg.id, own = dtOwner();
  let st = S.ui[key];
  if (!st || st.owner !== own) st = S.ui[key] = { q: '', f: {}, sort: null, page: 0, hide: (cfg.cols.filter(c => c.hide).map(c => c.k)), sel: [], owner: own, ps: (S.portal === 'learner' || S.portal === 'agency') ? 10 : 25, dr: { k: null, p: 'all', from: '', to: '' } };
  if (!st.dr) st.dr = { k: null, p: 'all', from: '', to: '' };
  if (!st.ps) st.ps = (S.portal === 'learner' || S.portal === 'agency') ? 10 : 25;
  return st;
}
function dtCompute(cfg) {
  const st = dtState(cfg), meta = listMeta(cfg.id), dcols = dtDateCols(cfg);
  const dk = dcols.find(c => c.k === st.dr.k) || dcols.find(c => meta[1] && c.l === meta[1]) || dcols[0] || null;
  const vis = cfg.cols.filter(c => !st.hide.includes(c.k));
  let rows = cfg.rows.slice();
  if (st.q) {
    const q = st.q.toLowerCase();
    const txt = r => (cfg.search ? cfg.search(r) + ' ' : '') + vis.map(c => { try { return c.v ? c.v(r) : c.h ? String(c.h(r)).replace(/<[^>]*>/g, ' ') : r[c.k]; } catch (e) { return ''; } }).join(' ');
    rows = rows.filter(r => String(txt(r)).toLowerCase().includes(q));
  }
  (cfg.filters || []).forEach(f => { if (st.f[f.k]) rows = rows.filter(r => String(f.get(r)).split('|').includes(st.f[f.k])); });
  const [a, b] = dk ? dtRange(st.dr.p, st.dr.from, st.dr.to) : [null, null];
  if (dk && (a || b)) { const g = dtGet(dk); rows = rows.filter(r => { let v; try { v = g(r); } catch (e) { } if (!v || !DT_ISO.test(v)) return false; const t = new Date(v); return (!a || t >= a) && (!b || t < b); }); }
  const eff = st.sort || (meta[0] === 'history' && dk ? { k: dk.k, d: -1, auto: true } : null);
  if (eff) { const c = cfg.cols.find(x => x.k === eff.k); if (c) { const g = dtGet(c); rows.sort((x, y) => { const p = g(x), q2 = g(y); return (p > q2 ? 1 : p < q2 ? -1 : 0) * eff.d; }); } }
  const ps = st.ps, pages = Math.max(1, Math.ceil(rows.length / ps)); if (st.page >= pages) st.page = 0;
  const hasFuture = !!dk && cfg.rows.some(r => { try { const v = dtGet(dk)(r); return v && DT_ISO.test(v) && new Date(v) > now(); } catch (e) { return false; } });
  const dLabel = st.dr.p === 'custom' ? `${st.dr.from ? fd(st.dr.from + 'T12:00:00') : '…'} – ${st.dr.to ? fd(st.dr.to + 'T12:00:00') : '…'}` : (DT_PRESETS.find(x => x[0] === st.dr.p) || [, ''])[1];
  const active = st.dr.p !== 'all' && dk;
  const summary = [st.q && `"${st.q}"`, ...(cfg.filters || []).filter(f => st.f[f.k]).map(f => st.f[f.k]), active && `${dk.l}: ${dLabel}`].filter(Boolean);
  return { st, meta, dcols, dk, rows, ps, pages, view: rows.slice(st.page * ps, st.page * ps + ps), eff, hasFuture, dLabel, active, summary };
}
function dtPager(cfg, X) {
  const { st, pages, rows, ps } = X, p = st.page, t = cfg.id, from = rows.length ? p * ps + 1 : 0, to = Math.min(rows.length, p * ps + ps);
  const nums = []; for (let i = Math.max(0, Math.min(p - 2, pages - 5)); i < Math.min(pages, Math.max(p - 2, 0) + 5); i++) nums.push(i);
  const pb = (i, l, dis, aria) => `<button class="btn btn-sm" data-act="dtPg" data-t="${t}" data-p="${i}" ${dis ? 'disabled' : ''} aria-label="${aria}">${l}</button>`;
  const go = `<span class="dt-goto"><label for="dtgo-${t}" class="xs">Go to page</label><input class="input dt-goi" type="number" min="1" max="${pages}" id="dtgo-${t}" data-onchange="dtGo" data-t="${t}" aria-label="Go to page (1–${pages})"></span>`;
  return `<div class="dt-pager small"><span class="muted" role="status">Showing ${from}–${to} of ${rows.length}${rows.length !== cfg.rows.length ? ` (filtered from ${cfg.rows.length})` : ''}</span>
    <div class="row dt-pages"><label class="xs" for="dtps-${t}">Rows per page</label><select class="select dt-sel dt-ps" id="dtps-${t}" data-onchange="dtPS" data-t="${t}">${DT_PS.map(n => `<option ${n === ps ? 'selected' : ''}>${n}</option>`).join('')}</select>
      ${pb(0, '«', p === 0, 'First page')}${pb(p - 1, '‹', p === 0, 'Previous page')}${nums.map(i => `<button class="btn btn-sm ${i === p ? 'btn-primary' : ''}" data-act="dtPg" data-t="${t}" data-p="${i}" ${i === p ? 'aria-current="page"' : ''} aria-label="Page ${i + 1}">${i + 1}</button>`).join('')}${pb(p + 1, '›', p >= pages - 1, 'Next page')}${pb(pages - 1, '»', p >= pages - 1, 'Last page')}${go}</div>
    <div class="row dt-pages-m">${pb(p - 1, '‹', p === 0, 'Previous page')}<span>Page ${p + 1} of ${pages}</span>${pb(p + 1, '›', p >= pages - 1, 'Next page')}<select class="select dt-sel dt-ps" aria-label="Rows per page" data-onchange="dtPS" data-t="${t}">${DT_PS.map(n => `<option ${n === ps ? 'selected' : ''}>${n}</option>`).join('')}</select>${go.replace(`id="dtgo-${t}"`, `id="dtgom-${t}"`).replace(`for="dtgo-${t}"`, `for="dtgom-${t}"`)}</div></div>`;
}
function dtDateCtl(cfg, X) {
  const { st, dcols, dk, hasFuture, active, dLabel } = X, t = cfg.id; if (!dk) return '';
  const today = dtLocalDay(now()), mx = hasFuture ? '' : `max="${today}"`;
  return `<details class="dt-date" ${st.showD ? 'open' : ''}><summary class="btn btn-sm" data-act="dtDT" data-t="${t}">${ic('cal', 14)}Date${active ? ': ' + esc(dLabel) : ''}</summary><div class="dd dt-date-dd">
    ${dcols.length > 1 ? `<div class="field"><label for="dtdk-${t}">Filter by</label><select class="select dt-sel" id="dtdk-${t}" data-onchange="dtDK" data-t="${t}">${dcols.map(c => `<option value="${c.k}" ${c.k === dk.k ? 'selected' : ''}>${esc(c.l)}</option>`).join('')}</select></div>` : `<p class="xs muted">Filter by: ${esc(dk.l)}</p>`}
    <div class="dt-presets" role="group" aria-label="Date range">${DT_PRESETS.map(([k, l]) => `<button class="btn btn-sm ${st.dr.p === k ? 'btn-primary' : ''}" aria-pressed="${st.dr.p === k}" data-act="dtDP" data-t="${t}" data-p="${k}">${l}</button>`).join('')}</div>
    ${st.dr.p === 'custom' ? `<div class="form-grid"><div class="field"><label for="dtdf-${t}">From</label><input class="input" type="date" id="dtdf-${t}" value="${st.dr.from}" ${mx}></div><div class="field"><label for="dtdt-${t}">To</label><input class="input" type="date" id="dtdt-${t}" value="${st.dr.to}" ${mx}></div></div>${st.dr.err ? `<p class="err small" role="alert">${esc(st.dr.err)}</p>` : ''}<button class="btn btn-sm btn-primary" data-act="dtDApply" data-t="${t}">Apply</button>` : ''}
  </div></details>`;
}
function dt(cfg) {
  DT[cfg.id] = cfg;
  const X = dtCompute(cfg), { st, view, rows, eff, dk, active, dLabel } = X;
  const cols = cfg.cols.filter(c => !st.hide.includes(c.k));
  const rid = cfg.rid || (r => r.id);
  const chips = (cfg.filters || []).filter(f => st.f[f.k]).map(f => `<span class="chip t-blue">${f.l}: ${esc(st.f[f.k])} <button class="linklike" style="color:inherit" data-act="dtClr" data-t="${cfg.id}" data-k="${f.k}" aria-label="Remove filter ${f.l}">×</button></span>`).join('')
    + (active ? `<span class="chip t-blue">${esc(dk.l)}: ${esc(dLabel)} <button class="linklike" style="color:inherit" data-act="dtDClr" data-t="${cfg.id}" aria-label="Remove date filter">×</button></span>` : '');
  const anyF = st.q || chips;
  return `<section class="dt">
    <div class="dt-bar"><div class="field dt-q"><label class="sr" for="dtq-${cfg.id}">Search</label><input class="input" type="search" id="dtq-${cfg.id}" placeholder="Search…" value="${esc(st.q)}" data-oninput="dtQ" data-t="${cfg.id}"></div>
      ${dtDateCtl(cfg, X)}
      ${(cfg.filters || []).length ? `<button class="btn btn-sm dt-ftoggle" data-act="dtFT" data-t="${cfg.id}" aria-expanded="${!!st.showF}">${ic('filter', 14)}Filters${Object.values(st.f).filter(Boolean).length ? ` (${Object.values(st.f).filter(Boolean).length})` : ''}</button><div class="dt-filt ${st.showF ? 'show' : ''}">` : ''}${(cfg.filters || []).map(f => `<div class="field"><label class="sr" for="dtf-${cfg.id}-${f.k}">${f.l}</label><select class="select dt-sel" id="dtf-${cfg.id}-${f.k}" data-onchange="dtF" data-t="${cfg.id}" data-k="${f.k}"><option value="">${f.l}: all</option>${(f.opts || [...new Set(cfg.rows.flatMap(r => String(f.get(r)).split('|')))].filter(Boolean)).map(o => `<option ${st.f[f.k] === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`).join('')}${(cfg.filters || []).length ? '</div>' : ''}
      <span class="spacer"></span>
      <details class="dt-cols"><summary class="btn btn-sm">Columns</summary><div class="dd" style="position:absolute;right:0;top:36px;width:220px;padding:8px">${cfg.cols.map(c => `<label class="check small"><input type="checkbox" ${st.hide.includes(c.k) ? '' : 'checked'} data-onchange="dtCol" data-t="${cfg.id}" data-k="${c.k}">${c.l}</label>`).join('')}</div></details>
      ${cfg.noExport ? '' : exportMenu(cfg.name || cfg.id, cfg.id)}</div>
    ${anyF ? `<div class="chip-row">${chips}${st.q ? `<span class="chip t-blue">Search: "${esc(st.q)}"</span>` : ''}<button class="linklike small" data-act="dtClrAll" data-t="${cfg.id}">Clear all</button></div>` : ''}
    ${cfg.bulk && st.sel.length ? `<div class="note b-blue dt-bulk"><strong>${st.sel.length} selected</strong>${cfg.bulk.map((b, i) => `<button class="btn btn-sm" data-act="dtBulk" data-t="${cfg.id}" data-i="${i}">${b.l}</button>`).join('')}<button class="linklike small" data-act="dtSelNone" data-t="${cfg.id}">Clear selection</button></div>` : ''}
    ${rows.length ? `<div class="tbl-wrap"><table class="tbl dense"><caption class="sr">${esc(cfg.name || '')}</caption><thead><tr>${cfg.bulk ? `<th><input type="checkbox" aria-label="Select all on this page" data-onchange="dtSelAll" data-t="${cfg.id}" ${view.length && view.every(r => st.sel.includes(rid(r))) ? 'checked' : ''}></th>` : ''}${cols.map(c => `<th ${c.r ? 'class="r"' : ''}>${c.nosort ? c.l : `<button class="dt-sort" data-act="dtSort" data-t="${cfg.id}" data-k="${c.k}" aria-label="Sort by ${c.l}">${c.l}${eff && eff.k === c.k ? (eff.d > 0 ? ' ▲' : ' ▼') : ''}</button>`}</th>`).join('')}${cfg.act ? '<th><span class="sr">Actions</span></th>' : ''}</tr></thead>
    <tbody>${view.map(r => `<tr class="${cfg.rowCls ? cfg.rowCls(r) : ''}">${cfg.bulk ? `<td><input type="checkbox" aria-label="Select row" data-onchange="dtSel" data-t="${cfg.id}" data-id="${esc(rid(r))}" ${st.sel.includes(rid(r)) ? 'checked' : ''}></td>` : ''}${cols.map(c => `<td ${c.r ? 'class="r num"' : ''}>${c.h ? c.h(r) : esc((c.v || (x => x[c.k]))(r))}</td>`).join('')}${cfg.act ? `<td class="nowrap">${cfg.act(r)}</td>` : ''}</tr>`).join('')}</tbody></table></div>
    ${cfg.footer ? `<div class="dt-foot small">${cfg.footer(rows)}</div>` : ''}
    ${dtPager(cfg, X)}`
    : cfg.rows.length && anyF ? `<div class="card"><div class="empty">${ic('filter', 34)}<strong>No results for these filters</strong><button class="btn btn-sm" data-act="dtClrAll" data-t="${cfg.id}">Clear filters</button></div></div>`
    : `<div class="card"><div class="empty">${ic('inbox', 34)}<strong>${cfg.empty || 'Nothing to show'}</strong>${cfg.emptyCta || ''}</div></div>`}</section>`;
}
const dts = id => S.ui['dt-' + id];
INP.dtQ = el => { const t = el.dataset.t; dts(t).q = el.value; dts(t).page = 0; render(); const i = $('#dtq-' + t); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } };
INP.dtF = el => { dts(el.dataset.t).f[el.dataset.k] = el.value; dts(el.dataset.t).page = 0; render(); };
ACT.dtClr = el => { delete dts(el.dataset.t).f[el.dataset.k]; dts(el.dataset.t).page = 0; render(); };
ACT.dtClrAll = el => { const s = dts(el.dataset.t); s.f = {}; s.q = ''; s.dr = { k: s.dr ? s.dr.k : null, p: 'all', from: '', to: '' }; s.page = 0; render(); };
ACT.dtSort = el => { const s = dts(el.dataset.t); s.sort = s.sort && s.sort.k === el.dataset.k ? { k: el.dataset.k, d: -s.sort.d } : { k: el.dataset.k, d: 1 }; s.page = 0; render(); };
// List upgrade (B1): page size, page jump, date filter
ACT.dtPg = el => { dts(el.dataset.t).page = Math.max(0, +el.dataset.p); render(); };
INP.dtPS = el => { const s = dts(el.dataset.t); s.ps = +el.value; s.page = 0; render(); };
INP.dtGo = el => { const s = dts(el.dataset.t), n = Math.round(+el.value); const max = +el.max || 1; if (!n || n < 1 || n > max) { toast(`Enter a page from 1 to ${max}.`, 'err'); return; } s.page = n - 1; render(); };
ACT.dtDT = (el, ev) => { if (ev) ev.preventDefault(); const s = dts(el.dataset.t); s.showD = !s.showD; render(); };
INP.dtDK = el => { const s = dts(el.dataset.t); s.dr.k = el.value; s.page = 0; render(); };
ACT.dtDP = el => { const s = dts(el.dataset.t); s.dr.p = el.dataset.p; s.dr.err = ''; s.page = 0; if (el.dataset.p !== 'custom') { s.dr.from = ''; s.dr.to = ''; s.showD = false; } render(); };
ACT.dtDApply = el => { const t = el.dataset.t, s = dts(t), f = ($('#dtdf-' + t) || {}).value || '', to = ($('#dtdt-' + t) || {}).value || '', mx = ($('#dtdf-' + t) || {}).max; if (f && to && f > to) { s.dr.err = '"From" must not be after "To".'; render(); return; } if (mx && ((f && f > mx) || (to && to > mx))) { s.dr.err = 'This list has no future dates — choose dates up to today.'; render(); return; } s.dr.from = f; s.dr.to = to; s.dr.err = ''; s.page = 0; s.showD = false; render(); };
ACT.dtDClr = el => { const s = dts(el.dataset.t); s.dr = { k: s.dr.k, p: 'all', from: '', to: '' }; s.page = 0; render(); };
ACT.dtPage = el => { dts(el.dataset.t).page += +el.dataset.d; render(); };
INP.dtCol = el => { const s = dts(el.dataset.t); s.hide = el.checked ? s.hide.filter(k => k !== el.dataset.k) : [...s.hide, el.dataset.k]; render(); };
INP.dtSel = el => { const s = dts(el.dataset.t); s.sel = el.checked ? [...s.sel, el.dataset.id] : s.sel.filter(x => x !== el.dataset.id); render(); };
INP.dtSelAll = el => { const s = dts(el.dataset.t), cfg = DT[el.dataset.t], rid = cfg.rid || (r => r.id); const ids = $$(`[data-onchange="dtSel"][data-t="${el.dataset.t}"]`).map(x => x.dataset.id); s.sel = el.checked ? [...new Set([...s.sel, ...ids])] : s.sel.filter(x => !ids.includes(x)); render(); };
ACT.dtSelNone = el => { dts(el.dataset.t).sel = []; render(); };
ACT.dtBulk = el => { const cfg = DT[el.dataset.t]; cfg.bulk[+el.dataset.i].fn(dts(el.dataset.t).sel.slice()); };
function tabsA(list, cur, route, id) { return subtabs(list, cur, route, id); }
function kpi(label, val, sub = '', go = '') { return `<${go ? `a href="#${go}" data-act="goTok" data-t="${go}"` : 'div'} class="kpi${go ? ' kpi-link' : ''}"><span class="xs muted">${label}</span><span class="big-num num">${val}</span>${sub ? `<span class="small">${sub}</span>` : ''}</${go ? 'a' : 'div'}>`; }
function versionNote(v = 3, eff = D(-20)) { return `<div class="note b-blue">${ic('layers')}<div class="small"><strong>Version ${v} — effective from ${fd(eff)}.</strong> Existing enrolments stay on their version. Saving creates Version ${v + 1}.</div></div>`; }

ACT.dtFT = el => { const st = dts(el.dataset.t); st.showF = !st.showF; render(); };
