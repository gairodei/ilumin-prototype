/* Setup S5b — agency administration, activation and access security (S5-06, G9.1).
   One agency record holds the agency and its single login; completing the first set-password activates both, once and
   audited; agency details can be edited (with real versions); login actions keep the first-login requirement; every agency
   mutation checks the actor when it is made; a login that can't sign in can't buy by calling the purchase directly; agency
   records, login state, set-password emails and the agency audit survive admin rebuilds. Loads after setup-s5a.js. */
'use strict';

/* ---------- Identity and state model ----------
   ADMIN.agencies is the one store: one record per agency (stable id AG-nn) that also holds its one Agency Administrator login.
     status       Onboarding | Active | Inactive | Suspended                              — the agency
     loginStatus  Not activated | Active | Pending email confirmation | Deactivated       — its single login
     activatedAt  set once, when the first set-password is completed (the agency's activation)
   Set-password links are the agency emails in the demo mailbox (STORE.agy.lmails, kind 'agency'). Only the latest unused link,
   sent to the current login email, works; older ones are superseded. */
const S5B_PEND = 'Pending email confirmation';
LS_TONE2[S5B_PEND] = 'amber';
const s5bAg = id => (ADMIN && ADMIN.agencies || []).find(a => a.id === id) || null;
const s5bEnt = a => `${a.name} (${a.id})`;
const s5bClean = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
const s5bKey = v => s5bClean(v).toLowerCase();
const s5bMailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 120;
const s5bDec = s => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; };
// Has the login completed its first set-password? (seeded deactivated logins were in use before they were deactivated)
const s5bSetUp = a => !!a.activatedAt || a.loginStatus === 'Active' || a.loginStatus === S5B_PEND || (a.loginStatus === 'Deactivated' && a.deactFrom !== 'Not activated');
// Can this login sign in now? The existing sign-in rules (deactivated login or suspended agency; login not activated), plus an
// unconfirmed login-email change. Purchases use the same rule.
function s5bLoginWhy(a) {
  if (!a) return 'Agency not found.';
  if (a.loginStatus === 'Deactivated' || a.status === 'Suspended') return 'This agency account is inactive — contact Illumin Academy.';
  if (a.loginStatus === 'Not activated') return 'The agency login is not activated yet — the set-password link from Illumin Academy has to be used first.';
  if (a.loginStatus === S5B_PEND) return 'The agency\'s login email was changed — the set-password link sent to the new address has to be used first.';
  return a.loginStatus === 'Active' ? '' : 'The agency login is not active.';
}

/* ---------- Store: what admins change survives an admin rebuild ----------
   buildAdmin() re-creates ADMIN.agencies, STORE.agy (with the demo mailbox), STORE.biz and the admin audit from the seed on every
   rebuild (admin variant switch, a Super Admin identity change, an index jump). STORE.s5b keeps, by agency ID, the record of every
   agency created or changed this session (full record: details, versions, status, login, login status, permissions), the agency
   set-password emails created or used / superseded, the agency audit rows and the activation notifications. They are put back
   after each rebuild — same IDs, never duplicated. Only the deliberate demo reset (initStore) clears them. */
function s5bStore() { return (STORE.s5b = STORE.s5b || { recs: {}, mails: [], audit: [], notifs: [], seq: 0, mseq: 0 }); }
const s5bTouch = a => { if (a) s5bStore().recs[a.id] = JSON.parse(JSON.stringify(a)); };
const s5bKeepMail = m => { const st = s5bStore(); if (m && !st.mails.includes(m)) st.mails.push(m); };
const _logAS5b = logA;
logA = function (module) {
  const r = _logAS5b.apply(this, arguments);
  if (module === 'Agencies' && ADMIN && ADMIN.audit[0] && ADMIN.audit[0].module === 'Agencies' && !/^AU-S5B-/.test(ADMIN.audit[0].id)) { const st = s5bStore(), a = ADMIN.audit[0]; a.id = 'AU-S5B-' + (++st.seq); st.audit.push(a); }
  return r;
};
function s5bReplay() {
  if (!ADMIN || !ADMIN.agencies) return; const st = s5bStore();
  Object.values(st.recs).forEach(r => { const c = JSON.parse(JSON.stringify(r)), k = ADMIN.agencies.findIndex(a => a.id === r.id); if (k >= 0) ADMIN.agencies[k] = c; else ADMIN.agencies.push(c); });
  if (STORE.agy && STORE.agy.lmails) st.mails.forEach(m => { const k = STORE.agy.lmails.findIndex(x => x.id === m.id); if (k >= 0) STORE.agy.lmails[k] = m; else STORE.agy.lmails.unshift(m); });
  if (STORE.biz && STORE.biz.notifs) st.notifs.forEach(n => { if (!STORE.biz.notifs.some(x => x.id === n.id)) STORE.biz.notifs.unshift(n); });
  if (ADMIN.audit && st.audit.length) { const have = new Set(ADMIN.audit.map(a => a.id)), add = st.audit.filter(a => !have.has(a.id)); if (add.length) ADMIN.audit = ADMIN.audit.concat(add).sort((x, y) => String(y.at).localeCompare(String(x.at))); }
}
// While the seed is rebuilt, the agency the portal points at may not exist yet (the base seed has AG-01–06; AG-07–11 are added by
// later patches and created agencies by the replay), and dates are formatted in that agency's time zone. So during the build the
// portal points at the default agency (A · CarePlus), then back at its own agency once it exists again (not after a demo reset
// that removed it).
function s5bHeld(run) {
  const id = S.agy && S.agy.id, v = S.agy && S.agy.v; if (S.agy) { S.agy.id = null; S.agy.v = 'A'; }
  try { return run(); } finally { if (S.agy && id && s5bAg(id)) { S.agy.id = id; S.agy.v = v; } }
}
const _isS5b = initStore; initStore = function () { STORE.s5b = null; S.s5bLink = null; const a = arguments; return s5bHeld(() => _isS5b.apply(this, a)); };
const _baS5b = buildAdmin;
buildAdmin = function () { const a = arguments; return s5bHeld(() => { const r = _baS5b.apply(this, a); s5bReplay(); return r; }); };

/* ---------- Actor checks (made when the change is submitted) ---------- */
// Agency administration (G9.1: "Agencies and their single login") — Business Admin and Super Admin only. The interface and every
// action use this one decision. System Admin, Finance, Academic and other staff, custom-role access and Agency Administrators are refused.
const S5B_OPS = { create: 'onboard agencies', edit: 'edit agency details', login: 'manage agency logins', perm: 'change an agency\'s communication permission', vis: 'change an agency\'s report visibility' };
function s5bWhy(op) {
  if (typeof S === 'undefined' || S.portal === 'agency') return 'Agency accounts are administered by Illumin Academy — an Agency Administrator can\'t change them.';
  if (S.portal !== 'admin' || !S.signedIn || !ADMIN || !ADMIN.me) return 'Sign in to the admin console first.';
  if (typeof s5Ctx === 'function' && s5Ctx()) return 'Agency administration stays with the Business Admin and the Super Administrator.';
  if (isBiz() || isSA()) return '';
  return `Only the Business Admin or the Super Administrator can ${S5B_OPS[op]}.`;
}
function s5bActor() {
  if (S.portal === 'agency' && S.signedIn && S.agy && S.agy.id) { const a = s5bAg(S.agy.id); return { name: a ? `${a.contact.split(' (')[0]} (${a.name})` : 'Agency Administrator', role: 'Agency Administrator', ip: '86.12.44.10' }; }
  if (S.portal !== 'admin' || !S.signedIn || !ADMIN || !ADMIN.me) return { name: 'Not signed in', role: '—', ip: '86.12.44.10' };
  return { name: ADMIN.me.name, role: typeof s5Ctx === 'function' && s5Ctx() ? 'Custom-role user' : isBiz() ? 'Business Admin' : isSA() ? 'Super Administrator' : isSys() ? 'System Administrator' : (ADMIN.me.roles[0] || 'Staff'), admin: true };
}
// Audit row in the agency's history (Agencies module): admin actors through logA, agency-side actors as themselves
function s5bAudit(entity, action, before, after, reason, who) {
  const w = who || s5bActor();
  if (w.admin && w.name === ADMIN.me.name) { logA('Agencies', entity, action, before, after, reason); return ADMIN.audit[0]; }
  const st = s5bStore(), row = { id: 'AU-S5B-' + (++st.seq), actor: w.name, role: w.role, at: now().toISOString(), module: 'Agencies', entity, action, before: before ?? '—', after: after ?? '—', reason: reason || '', ip: w.ip || '86.12.44.10' };
  ADMIN.audit.unshift(row); st.audit.push(row); return row;
}
function s5bSec(type, detail) { ADMIN.security.unshift({ id: 'SE-S5B-' + (++s5bStore().seq), sev: 'High', at: now().toISOString(), type, detail, reviewed: false }); }
function s5bDeny(entity, what, why, quiet) {
  const w = s5bActor();
  s5bSec('Out-of-scope action', `${w.role} ${w.name} attempted: ${what} — ${why}`);
  s5bAudit(entity, 'Blocked: ' + what, '—', '—', why, w);
  if (!quiet) toast(why + ' Attempt logged.', 'err');
  return false;
}

/* ---------- Set-password links ---------- */
// Expiry: the agency set-password email says "The link expires in 7 days", and System Configuration sets "Set-password / reset /
// workplace link expiry" to 7 days. The configured value is used (7 if it can't be read). Expiry runs from when the link was
// issued, on the agency portal's clock (agNow — includes the demo "Advance 30 days"), and is stored on the link when it is issued.
// Only agency set-password links (kind 'agency' — also used to confirm a new login email and to reset the password) expire here.
const S5B_CFG = 'Set-password / reset / workplace link expiry';
const s5bLinkDays = () => { const c = ((ADMIN && ADMIN.config) || []).find(x => x.name === S5B_CFG), m = c && String(c.value).match(/(\d+)\s*days?/i); return m ? +m[1] : 7; };
const s5bExpiry = m => m.expires || new Date(new Date(m.sent).getTime() + s5bLinkDays() * DAY).toISOString();
const s5bExpired = m => agNow().getTime() >= new Date(s5bExpiry(m)).getTime();
const s5bIssue = m => { m.sent = agNow().toISOString(); m.expires = new Date(agNow().getTime() + s5bLinkDays() * DAY).toISOString(); return m; };
function s5bMail(a) {
  const st = s5bStore(), m = s5bIssue({ id: `LM-AS${++st.mseq}-${a.id}`, kind: 'agency', agencyId: a.id, name: (a.contact || '').split(' (')[0] || a.name, email: a.login, agency: a.name, used: false, att: (a.terms || []).slice() });
  STORE.agy.lmails.unshift(m); s5bKeepMail(m); return m;
}
// Unused links stop working when a newer one is sent, the login email changes or the login is deactivated
function s5bVoid(a, why) { STORE.agy.lmails.filter(m => m.kind === 'agency' && m.agencyId === a.id && !m.used && !m.void).forEach(m => { m.used = true; m.void = why; s5bKeepMail(m); }); }
const s5bLatest = a => STORE.agy.lmails.filter(m => m.kind === 'agency' && m.agencyId === a.id).sort((x, y) => String(y.sent).localeCompare(String(x.sent)))[0] || null;
function s5bLinkWhy(m, a) {
  if (!m || m.kind !== 'agency') return 'This set-password link isn\'t recognised.';
  if (!a || a.id !== m.agencyId) return 'This set-password link doesn\'t belong to this agency.';
  if (m.void) return `This link was replaced (${m.void}). Use the latest email from Illumin Academy, or ask us to resend it.`;
  if (m.used) return 'This link has already been used.';
  if (s5bKey(m.email) !== s5bKey(a.login)) return 'This link was sent to a previous login email.';
  if (s5bExpired(m)) return `This link expired on ${fdt(s5bExpiry(m))} — set-password links work for ${s5bLinkDays()} days from when they are sent. Ask Illumin Academy to send you a new one.`;
  if (a.loginStatus === 'Deactivated' || a.status === 'Suspended') return 'This agency account is inactive — contact Illumin Academy.';
  return '';
}
function s5bLinkBad(a, why, m) {
  s5bSec('Set-password link refused', `${a ? a.name : 'Unknown agency'}: ${m ? m.id + ' · ' : ''}${why}`);
  if (a) s5bAudit(s5bEnt(a), 'Blocked: set-password link', '—', '—', why, { name: `Link holder (${m ? m.email : a.login})`, role: 'Agency Administrator (signed out)' });
  S.signedIn = false; S.portal = 'agency'; if (a) S.agy.id = a.id; S.s5bLink = null; S.s5bLinkMsg = why; S.auth = 'agyLinkBad'; S.authMsg = null; S.route = 'signin'; render();
  return false;
}
const _lmSetS5b = ACT.lmSet;
ACT.lmSet = (el, e) => {
  const m = STORE.agy.lmails.find(x => x.id === (el && el.dataset && el.dataset.id));
  if (m && m.kind === 'agency') { const a = s5bAg(m.agencyId), w = s5bLinkWhy(m, a); if (w) return s5bLinkBad(a, w, m); S.s5bLink = m.id; }
  return _lmSetS5b(el, e);
};
const _authS5b = authView;
authView = function () {
  if (S.auth === 'agyLinkBad') return authShell(`<div class="lock-ic">${ic('lock', 30)}</div><h1>This link can't be used</h1><p>${esc(S.s5bLinkMsg || 'This set-password link is no longer valid.')}</p><p class="small muted">Nothing has changed on the agency's account. Ask Illumin Academy to send a new set-password link if you still need one.</p><p class="small">Contact: ${academyContact()}</p><button class="btn btn-primary btn-block" data-act="lmOpen">Open the demo inbox</button>`);
  return _authS5b.apply(this, arguments);
};

/* ---------- Activation (S5-06): the first set-password activates the agency and its login, exactly once ---------- */
SUBMIT.agyFirstSet = () => {
  const a = s5bAg(S.agy.id), m = S.s5bLink ? STORE.agy.lmails.find(x => x.id === S.s5bLink) : null, w = s5bLinkWhy(m, a);
  if (w) return s5bLinkBad(a, w, m);
  const p = ($('#ag-new') || {}).value || '', c = ($('#ag-conf') || {}).value || '';
  if (!Object.values(PW_RULES).every(f => f(p)) || p !== c) { if ($('#ag-new')) fieldErr('#ag-new', 'Meet every password rule, then confirm the same password'); toast('Meet every password rule, then confirm the same password.', 'err'); return false; }
  const at = now().toISOString(), who = { name: `${a.contact.split(' (')[0]} (${a.name})`, role: 'Agency Administrator', ip: '86.12.44.10' }, b = `${a.status} · ${a.loginStatus}`;
  m.used = true; m.usedAt = at; s5bKeepMail(m); S.s5bLink = null;
  if (a.loginStatus === 'Not activated' && !a.activatedAt) {
    a.loginStatus = 'Active'; a.status = 'Active'; a.activatedAt = at;
    s5bAudit(s5bEnt(a), 'Agency activated', b, 'Active · Active', `First set-password completed for ${a.login} (link ${m.id})`, who);
    if (typeof bizNotify === 'function' && STORE.biz) { bizNotify('Agency login activated', a.name + ' set its password — the agency is now active.', 'a-agencies.' + a.id + '.login', 'Agencies'); s5bStore().notifs.push(STORE.biz.notifs[0]); }
  } else if (a.loginStatus === 'Not activated' || a.loginStatus === S5B_PEND) {
    a.loginStatus = 'Active'; if (a.status === 'Onboarding') a.status = 'Active';
    s5bAudit(s5bEnt(a), b.endsWith(S5B_PEND) ? 'Login email confirmed' : 'Login set up again', b, `${a.status} · Active`, `Set-password completed for ${a.login} (link ${m.id})`, who);
  } else s5bAudit(s5bEnt(a), 'Password set with a set-password link', b, b, `Link ${m.id}`, who);
  s5bTouch(a); S.auth = 'agyWelcome'; render();
};
// The welcome screen and the 2FA step re-check the login when they continue (a deactivated or unconfirmed login stops there)
const _tfaStartS5b = agyTfaStart;
agyTfaStart = function (a) {
  const w = s5bLoginWhy(a);
  if (w) { S.portal = 'agency'; S.signedIn = false; S.tfa = null; S.auth = 'signin'; S.authMsg = { html: `<strong>${esc(w)}</strong>` }; render(); return false; }
  return _tfaStartS5b.apply(this, arguments);
};
const _tfaCodeS5b = SUBMIT.tfaCode;
SUBMIT.tfaCode = function () {
  if (S.tfa && S.tfa.agency) { const w = s5bLoginWhy(s5bAg(S.tfa.agency)); if (w) { S.tfa = null; S.signedIn = false; S.auth = 'signin'; S.authMsg = { html: `<strong>${esc(w)}</strong>` }; render(); return false; } }
  return _tfaCodeS5b.apply(this, arguments);
};
// Demo inbox: superseded links say so (they used to look "Used")
const _inboxS5b = learnerInbox;
// Agency links past their expiry say "Expired"; an open agency email states its own expiry date
learnerInbox = function (p) {
  const h = _inboxS5b.apply(this, arguments), used = chip('Used', 'blue'), act = chip('Active', 'green'), sel = p && p.id && STORE.agy.lmails.find(x => x.id === p.id);
  const out = h.split('<tr').map(r => { const id = (r.match(/data-act="lmOpen" data-id="([^"]+)"/) || [])[1], m = id && STORE.agy.lmails.find(x => x.id === id); return !m ? r : m.void ? r.replace(used, chip('Superseded', 'grey')) : m.kind === 'agency' && !m.used && s5bExpired(m) ? r.replace(act, chip('Expired', 'amber')) : r; }).join('<tr');
  return sel && sel.kind === 'agency' ? out.replace('The link expires in 7 days.', `The link expires on ${fdt(s5bExpiry(sel))} (${s5bLinkDays()} days after it was sent).`) : out;
};

/* ---------- Onboarding (G9.1): one agency record, one login, one stable ID ---------- */
function s5bCreateWhy(name, login) {
  if (!name || ADMIN.agencies.some(a => s5bKey(a.name) === s5bKey(name))) return 'An agency with this name already exists — go back to step 1.';
  if (!s5bMailOk(login)) return 'Enter a valid login email — go back to step 3.';
  if (ADMIN.agencies.some(a => s5bKey(a.login) === s5bKey(login))) return 'This login email is already used by another agency — go back to step 3.';
  if (s5EmailTaken(login, null)) return 'This email belongs to a staff account, so it can\'t be an agency login — go back to step 3.';
  return '';
}
const _omS5b = openModal;
openModal = function (m) {
  if (m && /^Onboard agency — step 7 of 7/.test(m.title || '')) {
    const a = (m.actions || []).find(x => x.cls && /primary/.test(x.cls)), body = m.body || '';
    if (a && a.fn && !a._s5b) {
      const f = a.fn; a._s5b = true;
      a.fn = (...x) => {
        const w = s5bWhy('create'); if (w) return s5bDeny('—', 'onboard an agency', w), false;
        const name = s5bClean(s5bDec((body.match(/<dt>Agency<\/dt><dd>([^]*?) <span class="xs muted">/) || [])[1] || '')), login = s5bClean(s5bDec((body.match(/<dt>Login<\/dt><dd>([^]*?)<\/dd>/) || [])[1] || ''));
        const v = s5bCreateWhy(name, login); if (v) { s5bAudit(name || '—', 'Blocked: onboard agency', '—', '—', v); toast(v, 'err'); return false; }
        const n0 = ADMIN.agencies.length, res = f(...x);
        if (ADMIN.agencies.length > n0) s5bMade(ADMIN.agencies[ADMIN.agencies.length - 1]);
        return res;
      };
    }
  }
  return _omS5b.apply(this, arguments);
};
function s5bMade(a) {
  const st = s5bStore(), others = ADMIN.agencies.filter(x => x !== a), num = i => +(String(i).match(/\d+$/) || [0])[0];
  if (others.some(x => x.id === a.id) || st.recs[a.id]) {
    const old = a.id; a.id = 'AG-' + String(Math.max(0, ...others.map(x => num(x.id)), ...Object.keys(st.recs).map(num)) + 1).padStart(2, '0');
    STORE.agy.lmails.forEach(m => { if (m.kind === 'agency' && m.agencyId === old && m.agency === a.name && !others.some(x => x.id === old && x.name === m.agency)) m.agencyId = a.id; });
    if (S.params && S.params.id === old) { S.params.id = a.id; render(); }
  }
  a.made = true; a.versions = [{ v: 1, at: a.onboarded, by: ADMIN.me.name, what: 'Onboarded', reason: '' }];
  STORE.agy.lmails.filter(m => m.kind === 'agency' && m.agencyId === a.id).forEach(m => { if (STORE.agy.lmails.some(x => x !== m && x.id === m.id)) m.id = `LM-AS${++st.mseq}-${a.id}`; if (!m.used && !m.expires) s5bIssue(m); s5bKeepMail(m); });
  s5bTouch(a);
}
const _newAgS5b = ACT.newAgency;
ACT.newAgency = (el, e) => { const w = s5bWhy('create'); if (w) return s5bDeny('—', 'onboard an agency', w); return _newAgS5b(el, e); };

/* ---------- Agency details (S5-06): edit with validation, real versions and before → after audit ---------- */
const S5B_F = { name: 'Trading name', legal: 'Legal name', reg: 'Registration number', region: 'Region', address: 'Address', contact: 'Primary contact', email: 'Contact email', billing: 'Billing contact' };
const s5bVers = a => a.versions || [{ v: 1, at: a.onboarded, by: '—', what: 'Details as onboarded', reason: '' }];
// The trading name is also the reference used by learners, bundles, purchases, messages, rates and requests: a rename is only
// allowed while nothing refers to it (a new agency); otherwise every reference would have to move to agency IDs first.
function s5bNameRefWhy(a) {
  const q = JSON.stringify(a.name), skipA = ['agencies', 'audit', 'security', 'me', '_saMe', '_s5Sa', 'myNotifs', '_saNotifs', 'variant', 'staff', 'roles', 'roleCaps'];
  let json = '';
  try { json = JSON.stringify([Object.fromEntries(Object.entries(ADMIN).filter(([k]) => !skipA.includes(k))), Object.fromEntries(Object.entries(STORE).filter(([k]) => !['s5a', 's5b', 'agy', 'biz'].includes(k))), STORE.agy ? Object.fromEntries(Object.entries(STORE.agy).filter(([k]) => k !== 'lmails')) : null, STORE.biz ? Object.fromEntries(Object.entries(STORE.biz).filter(([k]) => k !== 'notifs')) : null]); } catch (e) { return 'The name\'s references couldn\'t be checked, so it can\'t be changed.'; }
  return json.includes(q) ? 'Learners, bundles, purchases, messages or other records refer to this agency by its trading name, so the name can\'t be changed safely yet (they would need agency IDs). The other details can be changed.' : '';
}
function s5bSaveAgency(id, v, reason) {
  const a = s5bAg(id), w = !a ? 'Agency not found.' : s5bWhy('edit');
  if (w) { s5bDeny(a ? s5bEnt(a) : String(id), 'edit agency details' + (a ? ' of ' + a.name : ''), w, true); return { ok: false, why: w }; }
  const next = { name: s5bClean(v.name), legal: s5bClean(v.legal), reg: s5bClean(v.reg), region: s5bClean(v.region), address: s5bClean(v.address), contact: s5bClean(v.contact), email: s5bClean(v.email), billing: s5bClean(v.billing) };
  const prev = { name: a.name, legal: a.legal || '', reg: a.reg || '', region: a.region, address: a.address || '', contact: a.contact || '', email: a.email || '', billing: a.billing || '' }, r = s5bClean(reason), errs = {};
  if (!next.name) errs.name = 'Enter the agency\'s trading name'; else if (next.name.length > 120) errs.name = '120 characters at most';
  else if (ADMIN.agencies.some(x => x !== a && s5bKey(x.name) === s5bKey(next.name))) errs.name = 'Another agency already has this name';
  else if (next.name !== a.name) { const ref = s5bNameRefWhy(a); if (ref) errs.name = ref; }
  if (next.legal.length > 160) errs.legal = '160 characters at most';
  if (!next.reg) errs.reg = 'Enter the registration number'; else if (next.reg.length > 40) errs.reg = '40 characters at most';
  if (!['UK', 'UAE'].includes(next.region)) errs.region = 'Choose United Kingdom or United Arab Emirates';
  if (next.address.length > 300) errs.address = '300 characters at most';
  if (next.contact.length > 120) errs.contact = '120 characters at most';
  if (!s5bMailOk(next.email)) errs.email = 'Enter a valid email address';
  if (next.billing.length > 160) errs.billing = '160 characters at most';
  if (!r) errs.reason = 'Enter a reason';
  const ch = Object.keys(next).filter(k => next[k] !== prev[k]);
  if (!Object.keys(errs).length && !ch.length) errs.form = 'No changes to save';
  if (Object.keys(errs).length) { s5bAudit(s5bEnt(a), 'Blocked: agency details update', '—', '—', Object.values(errs).join('; ')); return { ok: false, errs }; }
  const fmt = o => ch.map(k => `${S5B_F[k]}: ${o[k] || '—'}`).join('; '), vers = s5bVers(a).slice(), at = now().toISOString(), oldEnt = s5bEnt(a);
  if (ch.includes('name')) a.prevNames = (a.prevNames || []).concat(prev.name);
  ch.forEach(k => { a[k] = next[k]; });
  const nv = vers.length + 1; vers.push({ v: nv, at, by: ADMIN.me.name, what: ch.map(k => S5B_F[k]).join(', '), changes: ch.map(k => [S5B_F[k], prev[k], next[k]]), reason: r }); a.versions = vers;
  logA('Agencies', ch.includes('name') ? `${oldEnt} → ${a.name}` : s5bEnt(a), `Details edited — version ${nv}`, fmt(prev), fmt(next), r);
  s5bTouch(a);
  return { ok: true, v: nv, changed: ch };
}
ACT.bEditAgency = el => {
  const id = el && el.dataset ? el.dataset.id : '', a = s5bAg(id), w = !a ? 'Agency not found.' : s5bWhy('edit');
  if (w) return s5bDeny(a ? s5bEnt(a) : String(id || '—'), 'edit agency details' + (a ? ' of ' + a.name : ''), w);
  const f = (fid, l, v, t = 'text', hint = '', full = '') => `<div class="field${full}"><label for="${fid}">${l}</label><input class="input" id="${fid}" type="${t}" value="${esc(v || '')}">${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
  openModal({ title: 'Edit agency details — ' + esc(a.name), size: 'lg', body: `<div class="note b-blue">${ic('layers')}<div class="small">Saved as version ${s5bVers(a).length + 1} of these details, with the reason, in the agency's history. Agency ID ${esc(a.id)}, its login, learners, bundles, purchases and history are kept; completed purchases keep the details they were made with.</div></div>
    <div class="form-grid">${f('ea-n', 'Trading name (required)', a.name, 'text', 'Shown wherever the agency appears.')}${f('ea-l', 'Legal name', a.legal)}${f('ea-g', 'Registration number (required)', a.reg)}<div class="field"><label for="ea-rg">Region</label><select class="select" id="ea-rg"><option value="UK" ${a.region === 'UK' ? 'selected' : ''}>United Kingdom</option><option value="UAE" ${a.region === 'UAE' ? 'selected' : ''}>United Arab Emirates</option></select></div>${f('ea-a', 'Address', a.address, 'text', '', ' full')}${f('ea-c', 'Primary contact (name and role)', a.contact)}${f('ea-e', 'Contact email (required)', a.email, 'email')}${f('ea-b', 'Billing contact', a.billing, 'text', 'Who receives invoices and receipts.')}</div>
    <p class="xs muted">The login email is changed on the Login tab.</p><div class="field"><label for="ea-r">Reason (required)</label><textarea class="textarea" id="ea-r"></textarea><span class="hint">Recorded in the audit history.</span></div>`,
    actions: [{ label: 'Cancel' }, { label: 'Save', cls: 'btn-primary', fn: () => {
      const res = s5bSaveAgency(a.id, { name: mval('#ea-n'), legal: mval('#ea-l'), reg: mval('#ea-g'), region: mval('#ea-rg'), address: mval('#ea-a'), contact: mval('#ea-c'), email: mval('#ea-e'), billing: mval('#ea-b') }, mval('#ea-r'));
      if (!res.ok) { if (res.errs) { const map = { name: '#ea-n', legal: '#ea-l', reg: '#ea-g', region: '#ea-rg', address: '#ea-a', contact: '#ea-c', email: '#ea-e', billing: '#ea-b', reason: '#ea-r' }; Object.entries(res.errs).forEach(([k, t]) => map[k] ? fieldErr(map[k], t) : toast(t, 'info')); } return false; }
      render(); toast(`Saved as version ${res.v}. The change is in the audit history.`);
    } }] });
};

/* ---------- Login administration: one login per agency; the first-login requirement is never skipped ---------- */
const S5B_LOGIN_OPS = { resend: 'resend the set-password link', email: 'change the login email', deactivate: 'deactivate the login', reactivate: 'reactivate the login' };
function s5bLoginOpWhy(a, k) {
  if (!a) return 'Agency not found.';
  if (!S5B_LOGIN_OPS[k]) return 'Unknown login action.';
  const w = s5bWhy('login'); if (w) return w;
  if ((k === 'resend' || k === 'email') && a.loginStatus === 'Deactivated') return 'This login is deactivated — reactivate it first.';
  if (k === 'deactivate' && a.loginStatus === 'Deactivated') return 'This login is already deactivated.';
  if (k === 'reactivate' && a.loginStatus !== 'Deactivated') return 'This login isn\'t deactivated.';
  return '';
}
function s5bNewLoginWhy(a, ne) {
  if (!s5bMailOk(ne)) return 'Enter a valid email address';
  if (s5bKey(ne) === s5bKey(a.login)) return 'This is already the login email';
  if (ADMIN.agencies.some(x => x !== a && s5bKey(x.login) === s5bKey(ne))) return 'This email is already an agency login';
  if (s5EmailTaken(ne, null)) return 'This email belongs to a staff account';
  return '';
}
ACT.bLogin = el => {
  const id = el && el.dataset ? el.dataset.id : '', k = el && el.dataset ? el.dataset.a : '', a = s5bAg(id);
  const what = () => (S5B_LOGIN_OPS[k] || 'change an agency login') + (a ? ' of ' + a.name : ''), ent = () => a ? s5bEnt(a) : String(id || '—');
  const check = () => { const x = s5bLoginOpWhy(s5bAg(id), k); return x ? s5bDeny(ent(), what(), x) : true; };
  if (check() !== true) return false;
  if (k === 'resend') {
    const before = a.loginStatus; s5bVoid(a, 'a newer link was sent'); const m = s5bMail(a);
    logA('Agencies', s5bEnt(a), a.loginStatus === 'Active' ? 'Set-password link sent (password reset)' : 'Set-password link resent', before, `${m.id} → ${a.login} · expires ${fdt(m.expires)}`, ''); s5bTouch(a);
    toast(`Set-password link sent to ${a.login} — it works until ${fdt(m.expires)}. Earlier links no longer work. It's in the demo inbox.`); render(); return;
  }
  const live = ADMIN.bundles.filter(b => b.agency === a.name && b.validity && daysTo(b.validity) >= 0 && b.used > 0).length, setUp = s5bSetUp(a);
  const extra = {
    email: `<div class="field"><label for="ne">New login email</label><input class="input" id="ne" type="email" value="${esc(a.login)}"></div><p class="small muted">A new set-password link is sent to the new address and earlier links stop working. ${a.loginStatus === 'Active' ? 'Until it is used, the login is "Pending email confirmation" and can\'t sign in. The agency stays active; its learners, bundles and purchases are unchanged.' : 'The login stays "Not activated" until the agency sets its password.'}</p>`,
    deactivate: `${live ? `<div class="note b-amber">${ic('alert')}<div class="small"><strong>${esc(a.name)} has ${live} active bundle(s).</strong> Its learners keep their access.</div></div>` : ''}<p class="small">The agency can't sign in or buy until reactivated, and any unused set-password link stops working. Nothing is deleted. The agency contact is notified.</p>`,
    reactivate: setUp ? '<p class="small">The agency can sign in again.</p>' : '<p class="small"><strong>This login was never activated.</strong> Reactivating returns it to "Not activated": the agency still has to set its password with a new set-password link (send one from this tab) before it can sign in.</p>',
  }[k];
  reasonDlg({ title: { email: 'Change login email', deactivate: 'Deactivate agency login', reactivate: 'Reactivate agency login' }[k] + ' — ' + esc(a.name), ok: { email: 'Change login email', deactivate: 'Deactivate login', reactivate: 'Reactivate login' }[k], danger: k === 'deactivate', extra,
    onOk: r => {
      if (check() !== true) return false;
      const b = `${a.status} · ${a.loginStatus}`;
      if (k === 'email') {
        const ne = s5bClean(($('#ne') || {}).value), bad = s5bNewLoginWhy(a, ne); if (bad) { fieldErr('#ne', bad); return false; }
        const old = a.login; s5bVoid(a, 'the login email changed'); a.login = ne; if (a.loginStatus === 'Active') a.loginStatus = S5B_PEND;
        const m = s5bMail(a); logA('Agencies', s5bEnt(a), 'Login email changed', `${old} · ${b}`, `${ne} · ${a.status} · ${a.loginStatus} · link ${m.id}`, r);
      } else if (k === 'deactivate') {
        a.deactFrom = a.loginStatus; a.loginStatus = 'Deactivated'; a.deactReason = r; a.status = 'Inactive'; s5bVoid(a, 'the login was deactivated');
        logA('Agencies', s5bEnt(a), 'Login deactivated', b, 'Inactive · Deactivated', r);
      } else {
        const from = a.deactFrom || 'Active';
        a.loginStatus = from === 'Not activated' ? 'Not activated' : from === S5B_PEND ? S5B_PEND : 'Active';
        a.status = a.loginStatus === 'Not activated' && !a.activatedAt ? 'Onboarding' : 'Active'; a.deactReason = null; delete a.deactFrom;
        logA('Agencies', s5bEnt(a), 'Login reactivated', b, `${a.status} · ${a.loginStatus}`, r);
      }
      s5bTouch(a); render();
      toast(k === 'reactivate' && a.loginStatus !== 'Active' ? `Login reactivated — it stays "${a.loginStatus}" until the agency uses a new set-password link.` : 'Saved. The agency contact has been notified.');
    } });
};

/* ---------- Communication permission and report visibility ---------- */
const _bPermS5b = ACT.bPerm;
ACT.bPerm = (el, e) => {
  const id = el && el.dataset ? el.dataset.id : '', v = el && el.dataset ? el.dataset.v : '', a = s5bAg(id);
  const why = () => !a ? 'Agency not found.' : !['Full', 'Receive-only'].includes(v) ? 'Unknown communication permission.' : s5bWhy('perm');
  const what = 'change the communication permission' + (a ? ' of ' + a.name : ''), w = why();
  if (w) return s5bDeny(a ? s5bEnt(a) : String(id || '—'), what, w);
  return s5Dlg(() => _bPermS5b(el, e), () => { const x = why(); return x ? s5bDeny(s5bEnt(a), what, x) : true; }, () => s5bTouch(a));
};
const _agVisS5b = INP.agVis;
INP.agVis = (el, e) => {
  const id = el && el.dataset ? el.dataset.id : '', k = el && el.dataset ? el.dataset.k : '', a = s5bAg(id);
  const w = !a ? 'Agency not found.' : !(k in VIS_LBL) ? 'Unknown report setting.' : s5bWhy('vis');
  if (w) { if (el && 'checked' in el) el.checked = !el.checked; return s5bDeny(a ? s5bEnt(a) : String(id || '—'), 'change report visibility' + (a ? ' of ' + a.name : ''), w); }
  const r = _agVisS5b(el, e); s5bTouch(a); return r;
};

/* ---------- Purchases: a login that can't sign in can't buy by calling the purchase directly ---------- */
function s5bBuyWhy() { if (S.portal !== 'agency' || !S.signedIn || !S.agy) return 'Sign in to the agency portal to buy bundles.'; return s5bLoginWhy(AG()); }
function s5bBuyDeny(what) { const w = s5bBuyWhy(); if (!w) return ''; const a = S.agy && S.agy.id ? s5bAg(S.agy.id) : null; s5bDeny(a ? s5bEnt(a) : '—', what, w); S.agy.buy = null; if (MODAL) closeModal(); return w; }
['agBuy', 'agBuyMore'].forEach(k => { const f = ACT[k]; ACT[k] = (el, e) => s5bBuyDeny('buy bundles') ? false : f(el, e); });
const _payS5b = agPayResult;
agPayResult = function () { if (s5bBuyDeny('complete a bundle purchase')) return false; return _payS5b.apply(this, arguments); };
const _invS5b = agInvoiceForm;
agInvoiceForm = function () {
  if (s5bBuyDeny('request bundles by bank transfer')) return false;
  const r = _invS5b.apply(this, arguments), a = MODAL && MODAL.actions[MODAL.actions.length - 1];
  if (a && a.fn) { const f = a.fn; a.fn = (...x) => s5bBuyDeny('request bundles by bank transfer') ? false : f(...x); }
  return r;
};

/* ---------- Agency detail: what the record says, and the same permission decision as the actions ---------- */
const _agDetS5b = agencyDetail;
agencyDetail = function (id, t) {
  const a = s5bAg(id), ap = auditPanel;
  if (a && a.prevNames) auditPanel = (m, tt) => ap(x => m(x) || a.prevNames.some(n => String(x.entity).includes(n)), tt);
  let h; try { h = _agDetS5b.apply(this, arguments); } finally { auditPanel = ap; }
  if (!a) return h;
  const editWhy = s5bWhy('edit'), vers = s5bVers(a), last = vers[vers.length - 1], lock = esc(s5bWhy('vis'));
  const act = a.activatedAt ? fdt(a.activatedAt) : s5bSetUp(a) ? 'Yes — before these records' : 'Not yet — the agency hasn\'t set its password';
  h = h.replace('Edits are versioned and audited.', `Version ${vers.length} of these details${vers.length > 1 ? ` · last changed ${fdt(last.at)} by ${esc(last.by)}` : ''}. Every change is kept as a version and audited.`)
    .replace('<dl class="kv"><dt>Trading name</dt>', `<dl class="kv"><dt>Agency ID</dt><dd class="mono small">${esc(a.id)}</dd><dt>Trading name</dt>`)
    .replace(/(<dt>Region<\/dt><dd>[^<]*<\/dd>)(<dt>Primary contact<\/dt>)/, `$1<dt>Address</dt><dd>${esc(a.address || '—')}</dd>$2`)
    .replace(/(<\/dd>)(<\/dl><button class="btn btn-sm" data-act="bEditAgency")/, `$1<dt>Agency login</dt><dd>${chip(a.loginStatus, LS_TONE2[a.loginStatus] || 'grey')}</dd><dt>Activated</dt><dd>${act}</dd>$2`);
  if (editWhy) h = h.replace(/<button class="btn btn-sm" data-act="bEditAgency" data-id="[^"]*">Edit details<\/button>/, `<p class="small">${ic('lock', 14)} Agency details are edited by the Business Admin (or the Super Admin).</p>`);
  else if (vers.length > 1) h = h.replace(/(data-act="bEditAgency" data-id="[^"]*">Edit details<\/button><\/section>)/, `$1<section class="card"><h2>Versions of these details</h2><div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Version</th><th>When</th><th>By</th><th>Changed</th><th>Reason</th></tr></thead><tbody>${vers.slice().reverse().map(x => `<tr><td>v${x.v}</td><td class="small nowrap">${fdt(x.at)}</td><td class="small">${esc(x.by)}</td><td class="small">${x.changes ? x.changes.map(([l, p, n]) => `${esc(l)}: ${esc(p || '—')} → ${esc(n || '—')}`).join('<br>') : esc(x.what)}</td><td class="small">${esc(x.reason || '—')}</td></tr>`).join('')}</tbody></table></div></section>`);
  // Login tab: the first-login requirement, the current link, and only the actions that apply
  const lm = s5bLatest(a), lmTxt = !lm ? 'None sent' : lm.void ? `Superseded — ${esc(lm.void)}` : lm.used ? `Used ${fdt(lm.usedAt || lm.sent)}` : s5bExpired(lm) ? `Expired ${fdt(s5bExpiry(lm))} — not used; send a new link` : `Sent ${fdt(lm.sent)} to ${esc(lm.email)} — not used yet · expires ${fdt(s5bExpiry(lm))}`;
  h = h.replace(/(<dt>Last login<\/dt><dd>[^<]*<\/dd>)(<\/dl><p class="small muted">One login per agency)/, `$1<dt>First-time set-up</dt><dd>${s5bSetUp(a) ? 'Completed' + (a.activatedAt ? ' ' + fd(a.activatedAt) : '') : 'Outstanding — the agency has to set its password with a set-password link'}${a.loginStatus === S5B_PEND ? '<div class="xs muted">The login email changed — the new address has to be confirmed with the link sent to it.</div>' : ''}</dd><dt>Latest set-password link</dt><dd class="small">${lmTxt}</dd>$2`);
  if (a.loginStatus === 'Deactivated') h = h.replace(/<button class="btn btn-sm" data-act="bLogin" data-id="[^"]*" data-a="resend">[^<]*<\/button><button class="btn btn-sm" data-act="bLogin" data-id="[^"]*" data-a="email">[^<]*<\/button>/, '').replace(/(<div class="row"[^>]*>)(<button class="btn btn-sm btn-primary" data-act="bLogin")/, `<p class="small muted">Reactivate the login to send a set-password link or change its email.</p>$1$2`);
  else if (a.loginStatus === 'Active') h = h.replace(/(data-a="resend">)Resend set-password link(<\/button>)/, '$1Send password reset link$2');
  // Permissions & visibility: read-only for anyone who can't change them
  if (lock) h = h.replace(/<button (aria-pressed="[^"]*") data-act="bPerm"/g, `<button disabled title="${lock}" $1 data-act="bPerm"`).replace(/(<input type="checkbox" role="switch" id="vis-[^"]*" [^>]*?)data-onchange="agVis"/g, '$1disabled data-onchange="agVis"')
    .replace('<strong>Changes apply immediately</strong>', `<strong>Read only.</strong> ${lock}</div></div><div class="note b-blue">${ic('info')}<div class="small"><strong>Changes apply immediately</strong>`);
  return h;
};

/* ---------- Records ---------- */
UXC.push(['Setup S5b', 'Setup fixes — agency administration, activation and access security (S5-06, G9.1)', [
  'Identity and status (one model): each agency is one record with a stable ID (AG-nn) that also holds its single Agency Administrator login — no separate login records, no sub-users. Agency status: Onboarding · Active · Inactive · Suspended. Login status: Not activated · Active · Pending email confirmation · Deactivated. The agency list, detail, Business dashboard KPIs, the S4c per-agency discount list and sign-in all read these two fields.',
  'S5-06 activation fixed: completing the first set-password used to activate the login but leave the agency "Onboarding" in the record. It now moves both to Active together, once: the activation time is kept, the transition is audited with the agency\'s login holder as actor, before → after and the link used, and the Business Admin is notified. Creating an agency, sending links or setting a discount rate never activates it. A used link can\'t be used again, so repeating the flow adds no second activation. Activation keeps the agency ID, purchases, bundles, linked learners and settings.',
  'Set-password links: only the latest unused link sent to the current login email works, and only until it expires (see the expiry correction below). Sending a new link, changing the login email or deactivating the login makes earlier unused links stop working (the demo inbox shows them as "Superseded"); a refused link shows "This link can\'t be used", changes nothing and is logged. The set-password step checks the password rules itself (not only the disabled button). The welcome screen and the 2FA code step check the login again before the portal opens.',
  'Set-password link expiry (S5b correction): the agency set-password email has always said "The link expires in 7 days", and System Configuration sets "Set-password / reset / workplace link expiry" to 7 days, but nothing enforced it — an old link could still activate a login. Each agency link now gets its expiry when it is issued: 7 days (read from that configuration) from the time it was sent, never from when the email is reopened, on the agency portal clock (so the demo "Advance 30 days" applies). The set-password action itself refuses a link at or after its expiry: nothing changes on the agency or its login (no activation, no email confirmation, no password reset), the attempt goes to the security log and the agency audit, and the screen points to Illumin Academy for a new link. Used and superseded links stay refused whatever their expiry. Resend (Business Admin / Super Admin only) issues a fresh 7-day link and supersedes the earlier ones without reviving them. The open email shows its expiry date; the demo inbox and the Login tab show "Expired". The expiry is stored on the link, so it survives admin rebuilds. Riverside Care Partners\' seeded link (sent 9 days ago) is now expired — the Business dashboard already offers "Resend link". The same links confirm a changed login email and reset the password, so the same rule applies to them; learner, staff, consent, payment and workplace links are unchanged.',
  'Login administration: Resend (or, for an active login, "Send password reset link") — not for a deactivated login. Change login email — validated, unique among agency logins and not a staff email; the agency keeps its ID, status and history; an active login becomes "Pending email confirmation" (it used to become "Not activated", which showed an established agency as Onboarding) until the link sent to the new address is used; a deactivated login has to be reactivated first. Deactivate — status Inactive, unused links stop working. Reactivate (defect fixed) — a login that was never activated returns to "Not activated" / Onboarding and still needs a new set-password link; it used to become Active without a password. A login that was in use returns to Active.',
  'Agency details (S5-06): "Edit details" now edits trading name, legal name, registration number, region, address, primary contact, contact email and billing contact, with a reason. Validated (trading name required and unique, registration number required, region UK / UAE, valid contact email, lengths); an invalid save changes nothing. Each save is a real version (shown in "Versions of these details" with before → after, actor and reason) and audited. Records are found by agency ID. The trading name is still the reference used by learners, bundles, purchases, messages, rates and requests, so it can only be changed while nothing refers to it (a new agency); otherwise the save is refused with the reason — no other agency is ever renamed or matched by name. Completed purchases, receipts and Finance records don\'t read the legal name, address or billing contact, so editing them changes no history; prices, VAT and discounts are unchanged.',
  'Who can change what (G9.1, "Agencies and their single login"): onboarding, details, logins, communication permission and report visibility — Business Admin and Super Admin only. Each action checks the actor when it is submitted (dialogs re-check on confirm); System Admin, Finance Admin, Academic Admin, other staff, custom-role access and Agency Administrators are refused by direct calls too; refusals change nothing and go to the security log and the agency\'s audit history. For others the detail screen is read-only with the reason (same decision as the actions). Pricing, invoice decisions, link approvals and discount rates keep their own permissions (unchanged).',
  'Purchases: Buy Bundles, card payment and bank-transfer requests now check, when submitted, that the agency\'s login could sign in now (the existing sign-in rule: not deactivated or suspended, activated, email confirmed) — a login deactivated while signed in, or one that never completed set-up, can\'t buy by calling the purchase directly (refused and logged). No new commercial rule: being listed in the discount editor or having a rate doesn\'t let an agency buy; prices, discount precedence, VAT and existing purchases and entitlements are unchanged.',
  'Persistence: agencies created this session, detail edits and versions, agency and login status, login email changes, permission and visibility changes, the agency set-password emails (with their used / superseded state), activation notifications and the agency audit rows are kept in the prototype store and put back after each admin rebuild (variant switch, Super Admin identity change, index jump) — same IDs, never duplicated; a deactivated login is never restored from the seed. A new agency gets an ID no other agency has. Only the deliberate demo reset restores the seed.',
  'Open (business decisions): whether an agency whose commercial status is not Active (for example a future suspension that keeps the login) should be stopped from buying — today only the login rules above apply (pending client confirmation); renaming an agency that already has records (needs agency-ID references). Tracked for S5e, outside S5b: the rest of the agency store (purchases, seat assignments, ledger, and the agency portal\'s demo clock offset), the bundle catalogue, Finance ledger and the security log are still re-created from the seed by an admin rebuild (a link keeps its stored expiry).']]);
const _aIdxS5b = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxS5b(p).replace(/(<section class="card idx-sec"><h2>Setup fixes<\/h2><ul class="idx-list">)/, `$1${chIdxLi('Agencies → Riverside Care Partners → Login — activation and login administration', { act: 'aJump', t: 'a-agencies.AG-08.login' }, 'S5b — first set-password activates the agency once, links superseded and expiring after 7 days,reactivation keeps set-up, details editing with versions, agency permissions checked when submitted.')}`);
