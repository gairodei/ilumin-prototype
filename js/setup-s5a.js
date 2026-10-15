/* Setup S5a — staff administration, custom roles and permission security.
   Role identity is canonical (URL ids, underscores and case can't bypass a lock); every role or capability change checks
   the actor when it is made (not when the page opened); staff profiles can be edited; custom roles can be assigned and
   their capabilities are enforced for custom-role access; allocation saves re-check role eligibility. */
'use strict';

/* ---------- Role identity ---------- */
const S5_SUPER = 'Super Administrator', S5_SYS = 'System Administrator', S5_ADMIN_ROLES = [S5_SUPER, S5_SYS];
const S5_NON_STAFF = ['Learner', 'Agency Administrator'];
const S5_BUILTIN = ALL_ROLES.filter(r => !/\(custom\)$/.test(r)).concat(S5_NON_STAFF); // fixed in code, never from labels
// One canonical form for a role id from a route, a form attribute or a select value
const s5Role = x => { let v = String(x == null ? '' : x); try { v = decodeURIComponent(v); } catch (e) { /* keep raw */ } return v.replace(/[_+]/g, ' ').replace(/\s+/g, ' ').trim(); };
const s5Key = x => s5Role(x).toLowerCase();
const s5IsSuper = x => s5Key(x) === S5_SUPER.toLowerCase();
const s5IsSysRole = x => s5Key(x) === S5_SYS.toLowerCase();
// The role record for an id (exact canonical name, case-insensitive) — null when it doesn't exist
const s5RoleRec = x => { rolesData(); const k = s5Key(x); return ADMIN.roles.find(r => r.name.toLowerCase() === k) || null; };
const s5IsCustom = name => { const r = s5RoleRec(name); return !!(r && r.kind === 'Custom' && !S5_BUILTIN.includes(r.name)); };
// Reserved names: a custom role can't take (or imitate) a built-in role's name
const s5Flat = x => s5Key(x).replace(/\(custom\)$/, '').replace(/[^a-z0-9]/g, '');
const s5ReservedName = n => S5_BUILTIN.some(r => s5Flat(r) === s5Flat(n)) || /superadmin|systemadmin|sysadmin/.test(s5Flat(n));

/* ---------- Store: role configuration, custom-role holdings and profile edits survive an admin rebuild ---------- */
// STORE.s5a is the authoritative record of what admins changed this session: role configuration (roles, caps, status), staff
// accounts created (made: full record by staff ID), role grants / revokes on seeded accounts (grants: { email, add, rem }),
// account status and 2FA state (acct) and profile edits (prof). buildAdmin() re-creates ADMIN.staff from the seed on every
// rebuild (variant switch, Super Admin identity change), so these are replayed after each rebuild and identity switch.
// Only the deliberate demo reset (initStore) clears them.
function s5Store() { return (STORE.s5a = STORE.s5a || { roles: [], caps: {}, status: {}, made: {}, grants: {}, acct: {}, prof: {}, audit: [], mails: [] }); }
// Audit rows for staff accounts and roles are kept with that state (the admin audit list is rebuilt with the seed)
const S5_AUDIT_MODS = ['Staff & Users', 'Roles & Capabilities', 'Staff Allocations'];
const _logAS5a = logA;
logA = function (module) { const r = _logAS5a.apply(this, arguments); if (S5_AUDIT_MODS.includes(module) && ADMIN && ADMIN.audit[0] && ADMIN.audit[0].module === module) { const st = s5Store(), a = ADMIN.audit[0]; a.id = 'AU-S5-' + (st.audit.length + 1); st.audit.push(a); } return r; };
const s5AuditReplay = () => { const st = s5Store(); if (!ADMIN || !ADMIN.audit || !st.audit.length) return; const have = new Set(ADMIN.audit.map(a => a.id)); const add = st.audit.filter(a => !have.has(a.id)); if (!add.length) return; ADMIN.audit = ADMIN.audit.concat(add).sort((x, y) => String(y.at).localeCompare(String(x.at))); };
const _isS5a = initStore; initStore = function () { STORE.s5a = null; return _isS5a.apply(this, arguments); };
const _baS5a = buildAdmin;
buildAdmin = function () {
  const res = _baS5a.apply(this, arguments), st = s5Store();
  if (ADMIN && ADMIN.staff) {
    // Persona reconciliation (S5a): Sarah Okonkwo's staff record and her Teacher/Assessor persona share the same email,
    // qualifications and registration, and she is the teacher of her short-course batch — the record was missing Teacher.
    const sa = ADMIN.staff.find(s => s.id === 'ST-004');
    if (sa && sa.email === TAS_USERS.A.email && !sa.roles.includes('Teacher')) sa.roles.push('Teacher');
    s5Replay(null); s5AuditReplay();
  }
  return res;
};
// Variant fixtures that deliberately set a seeded record (demo identities): replay leaves exactly those fields to the fixture
const S5_FIX = { SD: [['ST-003', 'Finance Admin']], BD: [['ST-013', 'Finance Admin']], KD: [['ST-009', 'Assessor']], QC: [['ST-005', 'IQA']], FC: [['ST-012', '*']], SC: [['ST-022', '*']] };
function s5Replay(av) {
  if (!ADMIN || !ADMIN.staff) return; const st = s5Store(), fix = S5_FIX[av] || [], fixed = (id, r) => fix.some(([i, x]) => i === id && (x === '*' || x === r));
  // Accounts created this session: back once each, same staff ID (an ID or email already present is never duplicated)
  Object.values(st.made).forEach(m => { if (!ADMIN.staff.some(s => s.id === m.id || s.email.toLowerCase() === m.email.toLowerCase())) ADMIN.staff.push({ ...JSON.parse(JSON.stringify(m)), _s5Made: true }); });
  // Their set-password emails (the demo mailbox is re-created with the admin view): the same messages, so "used" is kept
  if (STORE.agy && STORE.agy.lmails) st.mails.forEach(m => { if (!STORE.agy.lmails.includes(m) && ADMIN.staff.some(s => s.id === m.staffId)) STORE.agy.lmails.unshift(m); });
  ADMIN.staff.forEach(s => {
    if (s._s5Made || st.made[s.id]) return;
    const seed = s._s5Base || s.email, g = st.grants[s.id], a = st.acct[s.id], p = st.prof[s.id];
    if (g && g.email === seed) { s._s5Base = seed; s.roles = s.roles.filter(r => !g.rem.includes(r) || fixed(s.id, r)); g.add.forEach(r => { if (!s.roles.includes(r) && !fixed(s.id, r)) s.roles.push(r); }); }
    if (a && a.email === seed && !fixed(s.id, '*')) { s._s5Base = seed; s.status = a.status; s.tfa = a.tfa; }
    if (p && p.base === seed) { s._s5Base = seed; ['name', 'email', 'mobile', 'quals'].forEach(k => { if (p[k] !== undefined) s[k] = p[k]; }); if (p.prevNames) s.prevNames = p.prevNames.slice(); }
  });
}
const _rolesDataS5a = rolesData;
rolesData = function () {
  const r = _rolesDataS5a.apply(this, arguments);
  if (!ADMIN._s5r) {
    ADMIN._s5r = true; const st = s5Store();
    st.roles.forEach(x => { if (!ADMIN.roles.some(y => y.name === x.name)) ADMIN.roles.push({ ...x }); });
    Object.entries(st.caps).forEach(([n, c]) => { ADMIN.roleCaps[n] = { ...c }; });
    Object.entries(st.status).forEach(([n, v]) => { const y = ADMIN.roles.find(z => z.name === n); if (y) y.status = v; });
  }
  // Holders are counted from the staff records (they used to be a seeded number)
  ADMIN.roles.forEach(y => { if (!S5_NON_STAFF.includes(y.name)) y.holders = ADMIN.staff.filter(s => s.roles.includes(y.name)).length; });
  return r;
};
// After any change to an account: a created account is re-snapshotted; a seeded one keeps its status / 2FA state
const s5Touch = s => { if (!s) return; const st = s5Store(); if (s._s5Made || st.made[s.id]) { const c = JSON.parse(JSON.stringify(s)); delete c._s5Made; st.made[s.id] = c; return; } s._s5Base = s._s5Base || s.email; st.acct[s.id] = { email: s._s5Base, status: s.status, tfa: s.tfa }; };
// A grant or revoke on a seeded account is kept as an operation, so a revoked role isn't regained when the seed is rebuilt
const s5RoleOp = (s, r, op) => { if (!s) return; const st = s5Store(); if (s._s5Made || st.made[s.id]) return s5Touch(s); s._s5Base = s._s5Base || s.email; const g = st.grants[s.id] = st.grants[s.id] && st.grants[s.id].email === s._s5Base ? st.grants[s.id] : { email: s._s5Base, add: [], rem: [] }; g.add = g.add.filter(x => x !== r); g.rem = g.rem.filter(x => x !== r); (op === 'add' ? g.add : g.rem).push(r); s5Touch(s); };

/* ---------- Actor checks (made at the moment of the change) ---------- */
const s5ActorLbl = () => isSA() ? 'Super Administrator' : isSys() ? 'System Administrator' : s5Ctx() ? 'Custom-role user' : (ADMIN.me.roles[0] || 'Staff');
function s5Deny(module, entity, what, why, quiet) {
  ADMIN.security.unshift({ id: 'SE-' + (900 + ADMIN.security.length), sev: 'High', at: now().toISOString(), type: 'Out-of-scope action', detail: `${s5ActorLbl()} ${ADMIN.me.name} attempted: ${what}${why ? ' — ' + why : ''}`, reviewed: false });
  logA(module, entity, 'Blocked: ' + what, '—', '—', why);
  if (!quiet) toast(why + ' Attempt logged.', 'err');
  return false;
}
const S5_OPS = { caps: 'change role capabilities', create: 'create custom roles', retire: 'retire custom roles', grant: 'grant roles', revoke: 'remove roles', addUser: 'create staff accounts' };
function s5AdminWhy(op, name) {
  if (s5Ctx()) return 'Role and account administration stays with the Super Administrator and System Administrators.';
  if (!isSA() && !isSys()) return `Only a Super Administrator or a System Administrator can ${S5_OPS[op]}.`;
  if (name && s5IsSuper(name) && !isSA()) return 'Only a Super Administrator can grant, remove or change the Super Administrator role.';
  return '';
}
// Capability locks, checked on the saved values (not only on the disabled checkboxes)
const s5NonV = c => (c || '').replace(/V/g, '');
function s5CapsLockWhy(name, after, before, custom) {
  if (CAP_MODULES.some(m => !/^V?C?E?D?$/.test(after[m] || ''))) return 'Invalid capability values.';
  if (S5_NON_STAFF.includes(name) && CAP_MODULES.some(m => (after[m] || '') !== (before[m] || ''))) return 'This base role is locked.';
  const MV = 'Marking & Verification';
  if (name === 'Academic Coordinator' && (after[MV] || '') !== (before[MV] || '')) return 'The Academic Coordinator can never have mark/verify capability.';
  if (name !== 'Assessor' && s5NonV(after[MV]) !== s5NonV(before[MV])) return 'Mark/verify stays with the Assessor base role.';
  if (custom && s5NonV(after['Roles & Capabilities'])) return 'A custom role can\'t create or change roles — role administration stays with the Super Administrator and System Administrators.';
  return '';
}
const s5ReadCaps = () => { const c = {}; CAP_MODULES.forEach(m => { c[m] = $$(`.cap[data-m="${m}"]:checked`).map(x => x.dataset.k).join(''); }); return c; };
// Run fn; the reason dialog it opens re-checks guard() when confirmed, then runs after()
function s5Dlg(run, guard, after) {
  const rd = reasonDlg;
  reasonDlg = function (o) { reasonDlg = rd; const ok = o.onOk; o.onOk = (...a) => { if (guard() !== true) return false; const res = ok(...a); if (res !== false && after) after(); return res; }; return rd(o); };
  try { return run(); } finally { reasonDlg = rd; }
}
// Run fn; the modal it opens re-checks guard() on its primary action, then runs after()
function s5Mod(run, guard, after) {
  const om = openModal;
  openModal = function (m) { openModal = om; (m.actions || []).forEach(a => { if (a.fn && a.cls && /primary|danger/.test(a.cls)) { const f = a.fn; a.fn = (...x) => { if (guard() !== true) return false; const res = f(...x); if (res !== false && after) after(); return res; }; } }); return om(m); };
  try { return run(); } finally { openModal = om; }
}

/* ---------- Roles & Capabilities ---------- */
// What custom-role access actually enforces as actions (tested); other ticks are saved but give view-only access for now
const S5_SUPPORTED = { 'Admissions & Documents': ['VE', 'Edit = document decisions'], 'Staff & Users': ['VE', 'Edit = staff profiles (not administrator accounts)'], 'Roles & Capabilities': ['V', 'View only — role administration stays with built-in roles'], 'Marking & Verification': ['V', 'View only — marking and verification use their own portals'] };
const s5Sup = m => (S5_SUPPORTED[m] || ['V'])[0];
const s5SupNote = m => S5_SUPPORTED[m] ? S5_SUPPORTED[m][1] : 'View works; Create / Edit / Delete are saved but not yet available as actions';
const s5MarkRows = h => CAP_MODULES.reduce((x, m) => x.replace(`<tr><td>${m}</td>`, `<tr><td>${m}<div class="xs muted">${esc(s5SupNote(m))}</div></td>`), h);
const S5_SUP_NOTE = `<div class="note b-amber">${ic('info')}<div class="small"><strong>Custom-role access in this prototype:</strong> View is enforced on every module (navigation, screens and links). Of the other permissions, only Edit on Admissions &amp; Documents (document decisions) and Edit on Staff &amp; Users (staff profiles) work as actions; other Create / Edit / Delete ticks are saved for later but give view-only access for now.</div></div>`;
const _rolesScrS5a = SCREENS['a-roles'];
SCREENS['a-roles'] = p => {
  rolesData();
  const id = p.id && p.id !== 'new' ? s5Role(p.id) : null;
  if (id && s5IsSuper(id) && !isSA()) return isSys() ? sysDenied('open Super Administrator role settings') : s5LockPage('open Super Administrator role settings', 'Only a Super Administrator can open the Super Administrator role.');
  if (p.id === 'new') { const why = s5AdminWhy('create'); if (why) return s5LockPage('create a custom role', why); }
  const rec = id ? s5RoleRec(id) : null;
  let h = _rolesScrS5a(rec ? { ...p, id: rec.name.replace(/ /g, '_') } : p);
  if (p.id) return h;
  const sub = 'Built-in roles can\'t be retired or deleted. Custom roles can be retired (no new assignments), never deleted.';
  h = h.replace('Base roles are locked. Custom roles can be retired, never deleted.', sub);
  const who = `<div class="note b-blue">${ic('shield')}<div class="small"><strong>Who can change what</strong><ul class="small" style="margin:4px 0 0 18px;padding:0">
    <li><strong>Edit a role's capabilities:</strong> Super Administrator; System Administrator (not the Super Administrator role). The locked rules below always apply.</li>
    <li><strong>Assign or remove a role:</strong> in Staff &amp; Users — Super Administrator; System Administrator (not the Super Administrator or System Administrator role, and not on a Super Administrator account). Retired roles can't be newly assigned.</li>
    <li><strong>Create or retire a custom role:</strong> Super Administrator; System Administrator. A custom role can't include role administration.</li>
    <li><strong>Super Administrator authority:</strong> only a Super Administrator can change the Super Administrator role or grant / remove it; at least one Super Administrator must remain.</li></ul></div></div>`;
  h = h.replace(/(<div class="note b-grey">[^]*?<strong>Locked rules:<\/strong>[^]*?<\/div><\/div>)/, `$1${who}`);
  if (!isSA()) h = h.replace(/<a href="#a-roles" data-go="a-roles" data-id="Super_Administrator" class="strong">Super Administrator<\/a>/, `<span class="strong">Super Administrator</span> <span class="xs muted">${ic('lock', 12)} Super Admin only</span>`).replace(/<button class="btn btn-sm" data-go="a-roles" data-id="Super_Administrator">Edit capabilities<\/button>/, `<span class="xs muted">${ic('lock', 12)} Locked</span>`);
  if (s5AdminWhy('caps')) h = h.replace(/>Edit capabilities<\/button>/g, '>View capabilities</button>');
  if (s5AdminWhy('create')) h = h.replace(/<button class="btn btn-primary" data-act="newRole">[^]*?<\/button><button class="btn" data-act="copyRole">[^]*?<\/button>/, '');
  return h;
};
const _roleEdS5a = roleEditor;
roleEditor = function (name) {
  let h = _roleEdS5a(name); const r = s5RoleRec(name); if (!r) return h;
  const why = s5AdminWhy('caps', name);
  if (why) {
    h = h.replace(/<input type="checkbox"([^>]*?)class="cap"/g, '<input type="checkbox"$1class="cap" disabled').replace(/(data-onchange="discCapRole"[^>]*?)>/, '$1 disabled>').replace(/<button class="btn btn-primary" type="submit">Save changes<\/button>/, '');
    return h.replace('<form class="card" data-submit="saveCaps"', `<div class="note b-grey">${ic('lock')}<div class="small"><strong>View only.</strong> ${esc(why)}</div></div><form class="card" data-submit="saveCaps"`);
  }
  if (r.kind === 'Custom') h = s5MarkRows(h).replace('<form class="card" data-submit="saveCaps"', S5_SUP_NOTE + '<form class="card" data-submit="saveCaps"').replace(/(<input type="checkbox" aria-label="Roles &amp; Capabilities [CED]"|<input type="checkbox" aria-label="Roles & Capabilities [CED]")([^>]*?)>/g, (m, a, b) => `${a}${b.replace(/ checked/, '')} disabled>`).replace('<div class="row"><button class="btn" type="button" data-act="previewCaps"', `<p class="xs muted">${ic('lock', 12)} A custom role can only view Roles &amp; Capabilities — role administration stays with built-in roles.</p><div class="row"><button class="btn" type="button" data-act="previewCaps"`);
  return h;
};
const _draftS5a = roleDraftEditor;
roleDraftEditor = function () {
  const d = S.roleDraft; if (d && d.caps) d.caps['Roles & Capabilities'] = (d.caps['Roles & Capabilities'] || '').includes('V') ? 'V' : '';
  return s5MarkRows(_draftS5a()).replace('<form class="card" data-submit="createRole"', S5_SUP_NOTE + '<form class="card" data-submit="createRole"').replace(/(<input type="checkbox" aria-label="Roles & Capabilities [CED]")([^>]*?)>/g, (m, a, b) => `${a}${b.replace(/ checked/, '')} disabled>`).replace('Mark/verify stays with the Assessor base role.', 'Mark/verify stays with the Assessor base role; role administration stays with built-in roles.');
};
const _saveCapsS5a = SUBMIT.saveCaps;
SUBMIT.saveCaps = (f, e) => {
  const raw = f && f.dataset ? f.dataset.r : '', rec = s5RoleRec(raw), name = rec ? rec.name : s5Role(raw);
  const why = !rec ? 'Unknown role.' : s5AdminWhy('caps', name);
  if (why) return s5Deny('Roles & Capabilities', name || '—', 'change capabilities of ' + (name || 'an unknown role'), why);
  const lock = s5CapsLockWhy(name, s5ReadCaps(), ADMIN.roleCaps[name] || roleCaps(name), rec.kind === 'Custom');
  if (lock) return s5Deny('Roles & Capabilities', name, 'change capabilities of ' + name, lock);
  f.dataset.r = name;
  return s5Dlg(() => _saveCapsS5a(f, e), () => { const w = s5AdminWhy('caps', name); return w ? s5Deny('Roles & Capabilities', name, 'change capabilities of ' + name, w) : true; },
    () => { s5Store().caps[name] = { ...ADMIN.roleCaps[name] }; });
};
const _discCapS5a = INP.discCapRole;
INP.discCapRole = (el, e) => {
  const rec = s5RoleRec(el && el.dataset ? el.dataset.r : ''), name = rec ? rec.name : '—', why = !rec ? 'Unknown role.' : s5IsSuper(name) || S5_NON_STAFF.includes(name) ? 'This role\'s named capabilities are locked.' : s5AdminWhy('caps', name);
  if (why) { if (el && 'checked' in el) el.checked = !el.checked; return s5Deny('Roles & Capabilities', name, 'change "Change discount rate" for ' + name, why); }
  el.dataset.r = name; return _discCapS5a(el, e);
};
['newRole', 'copyRole'].forEach(k => {
  const f = ACT[k];
  ACT[k] = (el, e) => {
    const why = s5AdminWhy('create'); if (why) return s5Deny('Roles & Capabilities', '—', 'create a custom role', why);
    const src = el && el.dataset && el.dataset.r ? s5RoleRec(el.dataset.r) : null;
    if (src && (s5IsSuper(src.name) || S5_NON_STAFF.includes(src.name))) return s5Deny('Roles & Capabilities', src.name, 'copy the ' + src.name + ' role', 'This role can\'t be copied.');
    return s5Mod(() => f(el, e), () => {
      const n = mval('#cr-n'), from = $('#cr-s') ? mval('#cr-s') : '', w = s5AdminWhy('create');
      if (w) return s5Deny('Roles & Capabilities', n || '—', 'create a custom role', w);
      if (n && s5ReservedName(n)) { fieldErr('#cr-n', 'This name is reserved for a built-in role'); return false; }
      if (from && (s5IsSuper(from) || S5_NON_STAFF.includes(s5Role(from)) || !s5RoleRec(from))) return s5Deny('Roles & Capabilities', from, 'copy the ' + from + ' role', 'This role can\'t be copied.');
      return true;
    });
  };
});
const _createRoleS5a = SUBMIT.createRole;
SUBMIT.createRole = (f, e) => {
  const d = S.roleDraft; if (!d) return;
  const check = () => {
    const w = s5AdminWhy('create'); if (w) return s5Deny('Roles & Capabilities', d.name + ' (custom)', 'create a custom role', w);
    if (s5ReservedName(d.name)) return s5Deny('Roles & Capabilities', d.name + ' (custom)', 'create a custom role', 'This name is reserved for a built-in role.');
    const lock = s5CapsLockWhy(d.name + ' (custom)', s5ReadCapsOr(d), roleCaps('none'), true); if (lock) return s5Deny('Roles & Capabilities', d.name + ' (custom)', 'create a custom role', lock);
    return true;
  };
  if (!check()) return;
  const n0 = ADMIN.roles.length;
  return s5Mod(() => _createRoleS5a(f, e), check, () => { if (ADMIN.roles.length > n0) { const r = ADMIN.roles[ADMIN.roles.length - 1], st = s5Store(); st.roles.push({ ...r }); st.caps[r.name] = { ...ADMIN.roleCaps[r.name] }; } });
};
// The draft editor's checkboxes when shown, else the draft's own caps (direct calls)
const s5ReadCapsOr = d => $$('.cap[data-m]').length ? s5ReadCaps() : { ...roleCaps('none'), ...(d.caps || {}) };
const _retireS5a = ACT.retireRole;
ACT.retireRole = (el, e) => {
  const rec = s5RoleRec(el && el.dataset ? el.dataset.r : ''), name = rec ? rec.name : s5Role(el && el.dataset && el.dataset.r);
  const why = () => !rec ? 'Unknown role.' : rec.kind !== 'Custom' || S5_BUILTIN.includes(rec.name) ? 'Built-in roles can\'t be retired.' : rec.status !== 'Active' ? 'This role is already retired.' : s5AdminWhy('retire');
  const w = why(); if (w) return s5Deny('Roles & Capabilities', name || '—', 'retire ' + (name || 'an unknown role'), w);
  el.dataset.r = name;
  return s5Dlg(() => _retireS5a(el, e), () => { const x = why(); return x ? s5Deny('Roles & Capabilities', name, 'retire ' + name, x) : true; }, () => { s5Store().status[name] = 'Retired'; const sr = s5Store().roles.find(x => x.name === name); if (sr) sr.status = 'Retired'; });
};

/* ---------- Staff & Users: roles ---------- */
const s5Assignable = () => { rolesData(); return ADMIN.roles.filter(r => r.status === 'Active' && !S5_NON_STAFF.includes(r.name)).map(r => r.name); };
const s5GrantLocked = r => isSys() && S5_ADMIN_ROLES.includes(r);
function s5GrantWhy(s, role) {
  const rec = s5RoleRec(role), name = rec ? rec.name : s5Role(role);
  if (!s) return 'Staff record not found.';
  const w = s5AdminWhy('grant', name); if (w) return w;
  if (!rec || S5_NON_STAFF.includes(rec.name)) return `"${name}" is not a staff role.`;
  if (rec.status !== 'Active') return `${rec.name} is retired and can't be newly assigned.`;
  if (isSys() && s5IsSysRole(name)) return 'Only a Super Administrator can grant or remove this role.';
  if (isSys() && isSuperRec(s)) return 'Super Administrator accounts are read-only for System Administrators.';
  if (s.roles.includes(rec.name)) return `${s.name} already holds ${rec.name}.`;
  return '';
}
const _grantS5a = ACT.grantRole;
ACT.grantRole = (el, e) => {
  const s = ADMIN.staff.find(x => x.id === (el && el.dataset && el.dataset.id)), sel = $('#gr'), raw = sel ? sel.value : '', rec = s5RoleRec(raw);
  const w = s5GrantWhy(s, raw);
  if (w) { return s5Deny('Staff & Users', s ? s.name : '—', 'grant ' + (s5Role(raw) || 'a role') + (s ? ' to ' + s.name : ''), w); }
  if (sel.value !== rec.name) { const o = [...sel.options].find(x => x.value === raw); if (o) { o.value = rec.name; o.textContent = rec.name; } sel.value = rec.name; }
  return s5Dlg(() => _grantS5a(el, e), () => { const x = s5GrantWhy(s, rec.name); return x ? s5Deny('Staff & Users', s.name, 'grant ' + rec.name + ' to ' + s.name, x) : true; }, () => { if (s.roles.includes(rec.name)) s5RoleOp(s, rec.name, 'add'); });
};
function s5RevokeWhy(s, role) {
  if (!s) return 'Staff record not found.';
  const name = s5Role(role), w = s5AdminWhy('revoke', name); if (w) return w;
  if (!s.roles.includes(name)) return `${s.name} doesn't hold ${name}.`;
  return '';
}
const _revokeS5a = ACT.revokeRole;
ACT.revokeRole = (el, e) => {
  const s = ADMIN.staff.find(x => x.id === (el && el.dataset && el.dataset.id)), raw = el && el.dataset ? el.dataset.r : '', name = s && s.roles.find(r => s5Key(r) === s5Key(raw)) || s5Role(raw);
  const w = s5RevokeWhy(s, name); if (w) return s5Deny('Staff & Users', s ? s.name : '—', 'remove ' + name + (s ? ' from ' + s.name : ''), w);
  el.dataset.r = name; // existing checks (last Super Admin, System Admin limits) run on the canonical name
  return s5Dlg(() => _revokeS5a(el, e), () => { const x = s5RevokeWhy(s, name); return x ? s5Deny('Staff & Users', s.name, 'remove ' + name + ' from ' + s.name, x) : true; }, () => { if (!s.roles.includes(name)) s5RoleOp(s, name, 'rem'); });
};
const _addUserS5a = ACT.addUser;
ACT.addUser = (el, e) => {
  const w = s5AdminWhy('addUser'); if (w) return s5Deny('Staff & Users', '—', 'create a staff account', w);
  _addUserS5a(el, e); if (!MODAL) return;
  const roles = s5Assignable(), grid = roles.map(r => { const lk = s5GrantLocked(r); return `<label class="check small"${lk ? ' title="Only a Super Administrator can grant or remove this role"' : ''}><input type="checkbox" value="${esc(r)}" data-onchange="nuRoles" class="nu-role"${lk ? ' disabled' : ''}>${esc(r)}${r === S5_SUPER ? ' <span class="xs muted">— only a Super Administrator can grant or remove this role</span>' : ''}${r === S5_SYS && isSys() ? ' <span class="xs muted">— only a Super Administrator can grant this role</span>' : ''}${lk && r === S5_SUPER ? ` <button type="button" class="icon-btn" data-act="sysRoleWhy" aria-label="Why is this disabled?">${ic('info', 14)}</button>` : ''}</label>`; }).join('');
  MODAL.body = MODAL.body.replace(/<div class="grid-2e">[^]*?<\/div><\/fieldset>/, `<div class="grid-2e">${grid}</div><p class="xs muted">Retired roles aren't offered.</p></fieldset>`); renderModal();
  const a = MODAL.actions.find(x => x.cls && /primary/.test(x.cls)); if (!a) return; const g = a.fn;
  a.fn = (...x) => {
    const w2 = s5AdminWhy('addUser'); if (w2) return s5Deny('Staff & Users', '—', 'create a staff account', w2);
    const picked = $$('#modal-root .nu-role:checked').map(i => i.value), bad = picked.find(r => { const rec = s5RoleRec(r); return !rec || rec.status !== 'Active' || S5_NON_STAFF.includes(rec.name) || (s5IsSuper(r) && !isSA()) || s5GrantLocked(rec.name); });
    if (bad) return s5Deny('Staff & Users', mval('#nu-n') || '—', 'create a staff account with ' + bad, s5IsSuper(bad) || s5IsSysRole(bad) ? 'Only a Super Administrator can grant this role.' : `${bad} can't be assigned (unknown or retired).`), false;
    const em = mval('#nu-e').toLowerCase(); if (em && s5EmailTaken(em, null)) { fieldErr('#nu-e', 'Another staff account already uses this email'); return false; }
    const n0 = ADMIN.staff.length, res = g(...x);
    if (res !== false && ADMIN.staff.length > n0) s5Made(ADMIN.staff[ADMIN.staff.length - 1]);
    return res;
  };
};

// A created account gets a staff ID no other account (current or created this session) has; its set-password email follows
function s5Made(s) {
  const st = s5Store(), taken = new Set(ADMIN.staff.filter(x => x !== s).map(x => x.id).concat(Object.keys(st.made)));
  if (taken.has(s.id)) { const old = s.id, n = Math.max(0, ...[...taken, old].map(i => +(String(i).match(/\d+$/) || [0])[0])) + 1; s.id = 'ST-' + String(n).padStart(3, '0'); ((STORE.agy && STORE.agy.lmails) || []).forEach(m => { if (m.kind === 'staff' && m.staffId === old && m.email === s.email) m.staffId = s.id; }); }
  s._s5Made = true; s5Touch(s);
  ((STORE.agy && STORE.agy.lmails) || []).forEach(m => { if (m.kind === 'staff' && m.staffId === s.id && !st.mails.includes(m)) st.mails.push(m); });
}
// Account status and 2FA resets are kept too (same store)
const _staffStS5a = ACT.staffSt;
ACT.staffSt = (el, e) => { const s = ADMIN.staff.find(x => x.id === (el && el.dataset && el.dataset.id)); return s5Dlg(() => _staffStS5a(el, e), () => true, () => s5Touch(s)); };
const _staffResetS5a = ACT.staffReset;
ACT.staffReset = (el, e) => { const s = ADMIN.staff.find(x => x.id === (el && el.dataset && el.dataset.id)), r = _staffResetS5a(el, e); s5Touch(s); return r; };

/* ---------- Staff & Users: profile (S5-01) ---------- */
const s5Clean = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
function s5EmailTaken(email, self) {
  const e = email.toLowerCase();
  if (ADMIN.staff.some(s => s !== self && s.email.toLowerCase() === e)) return true;
  const personas = [].concat(Object.values(TAS_USERS), typeof COO_USERS !== 'undefined' ? Object.values(COO_USERS) : []);
  return personas.some(u => u.email && u.email.toLowerCase() === e && (!self || u.name !== self.name));
}
function s5ProfileWhy(s) {
  if (!s) return 'Staff record not found.';
  if (s5Ctx()) { if (!s5Has('Staff & Users', 'E')) return 'Your roles don\'t include Staff & Users: Edit.'; if (s.roles.some(r => S5_ADMIN_ROLES.includes(r))) return 'Only a Super Administrator or a System Administrator can edit an administrator account.'; return ''; }
  if (isSA()) return '';
  if (isSys()) return isSuperRec(s) ? 'Super Administrator accounts are read-only for System Administrators.' : '';
  return 'Only a Super Administrator or a System Administrator can edit staff profiles.';
}
// A name is also a reference (batches, sessions, plans, queue items, personas): rename only where nothing refers to it
function s5NameRefWhy(s) {
  const nm = s.name;
  const personas = [].concat(Object.values(TAS_USERS), typeof COO_USERS !== 'undefined' ? Object.values(COO_USERS) : []);
  if (personas.some(u => u.name === nm) || Object.values(ADMIN_VARIANTS).some(v => v.me === nm) || [SYS_A, SYS_B].includes(nm)) return 'This person is a sign-in persona of the prototype, so their name can\'t be changed here.';
  const ids = [SYS_VARIANTS, ACA_VARIANTS, FIN_VARIANTS, BIZ_VARIANTS, IQA_VARIANTS].flatMap(o => Object.values(o || {}).map(v => v.staff));
  if (ids.includes(s.id)) return 'This person is a sign-in persona of the prototype, so their name can\'t be changed here.';
  let json = '';
  try { const skip = ['staff', 'audit', 'security', 'me', '_saMe', '_s5Sa', 'myNotifs', '_saNotifs', 'variant', 'roles', 'roleCaps']; json = JSON.stringify([Object.fromEntries(Object.entries(ADMIN).filter(([k]) => !skip.includes(k))), Object.fromEntries(Object.entries(STORE).filter(([k]) => k !== 's5a' && k !== 'agy')), STORE.agy ? Object.fromEntries(Object.entries(STORE.agy).filter(([k]) => k !== 'lmails')) : null]); } catch (e) { return 'The name\'s references couldn\'t be checked, so it can\'t be changed.'; }
  if (json.includes(nm)) return 'Allocations, sessions or records refer to this person by name, so the name can\'t be changed safely yet (they would need staff IDs). Other details can be changed.';
  return '';
}
function s5SaveProfile(id, v, reason) {
  const s = ADMIN.staff.find(x => x.id === id), why = s5ProfileWhy(s);
  if (why) { s5Deny('Staff & Users', s ? s.name : String(id), 'edit the staff profile' + (s ? ' of ' + s.name : ''), why); return { ok: false, why }; }
  const n = s5Clean(v.name), em = s5Clean(v.email), mo = s5Clean(v.mobile), q = s5Clean(v.quals), r = s5Clean(reason), errs = {};
  if (!n) errs.name = 'Enter a name'; else if (n.length > 80 || !/^[\p{L}][\p{L} .'’-]*$/u.test(n)) errs.name = 'Use letters, spaces, full stops, hyphens and apostrophes (80 characters at most)';
  else if (n !== s.name && ADMIN.staff.some(x => x !== s && x.name.toLowerCase() === n.toLowerCase())) errs.name = 'Another staff account already has this name';
  else if (n !== s.name) { const ref = s5NameRefWhy(s); if (ref) errs.name = ref; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em) || em.length > 120) errs.email = 'Enter a valid email';
  else if (em.toLowerCase() !== s.email.toLowerCase() && s5EmailTaken(em, s)) errs.email = 'Another staff account already uses this email';
  if (mo && !/^\+?[0-9][0-9 ()-]{6,19}$/.test(mo)) errs.mobile = 'Enter a valid mobile number (digits, spaces, brackets, hyphens; optional +)';
  if (q.length > 200) errs.quals = '200 characters at most';
  if (!r) errs.reason = 'Enter a reason';
  const next = { name: n, email: em, mobile: mo, quals: q }, prev = { name: s.name, email: s.email, mobile: s.mobile || '', quals: s.quals || '' };
  const ch = Object.keys(next).filter(k => next[k] !== prev[k]);
  if (!Object.keys(errs).length && !ch.length) errs.form = 'No changes to save';
  if (Object.keys(errs).length) { logA('Staff & Users', s.name, 'Blocked: profile update', '—', '—', Object.values(errs).join('; ')); return { ok: false, errs }; }
  const L = { name: 'Name', email: 'Email', mobile: 'Mobile', quals: 'Qualifications' }, fmt = o => ch.map(k => `${L[k]}: ${o[k] || '—'}`).join('; ');
  s._s5Base = s._s5Base || s.email;
  if (ch.includes('name')) s.prevNames = (s.prevNames || []).concat(prev.name);
  ch.forEach(k => { s[k] = next[k]; });
  const st = s5Store(); if (s._s5Made || st.made[s.id]) s5Touch(s); else st.prof[s.id] = { base: s._s5Base, name: s.name, email: s.email, mobile: s.mobile, quals: s.quals, prevNames: s.prevNames };
  if (ADMIN.me.id === s.id) { ADMIN.me.email = s.email; }
  logA('Staff & Users', s.name, 'Profile updated', fmt(prev), fmt(next), r);
  return { ok: true, changed: ch };
}
ACT.s5EditStaff = el => {
  const s = ADMIN.staff.find(x => x.id === (el && el.dataset && el.dataset.id)), why = s5ProfileWhy(s);
  if (why) return s5Deny('Staff & Users', s ? s.name : '—', 'edit the staff profile' + (s ? ' of ' + s.name : ''), why);
  const f = (id, l, v, t = 'text', hint = '') => `<div class="field"><label for="${id}">${l}</label><input class="input" id="${id}" type="${t}" value="${esc(v || '')}">${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
  openModal({ title: 'Edit profile — ' + esc(s.name), size: 'lg', body: `<div class="form-grid">${f('s5-n', 'Name', s.name)}${f('s5-e', 'Email', s.email, 'email', 'Used to sign in — must be unique.')}${f('s5-m', 'Mobile', s.mobile, 'tel')}${f('s5-q', 'Qualifications', s.quals, 'text', 'As held — record only what the person actually holds.')}</div>
    <p class="xs muted">Staff ID ${esc(s.id)}, roles, allocations and history are kept. Assessor registration, 2FA and status are changed elsewhere.</p>
    <div class="field"><label for="s5-r">Reason (required)</label><textarea class="textarea" id="s5-r"></textarea><span class="hint">Recorded in the audit history.</span></div>`,
    actions: [{ label: 'Cancel' }, { label: 'Save profile', cls: 'btn-primary', fn: () => {
      const res = s5SaveProfile(s.id, { name: mval('#s5-n'), email: mval('#s5-e'), mobile: mval('#s5-m'), quals: mval('#s5-q') }, mval('#s5-r'));
      if (!res.ok) { if (res.errs) { const m = { name: '#s5-n', email: '#s5-e', mobile: '#s5-m', quals: '#s5-q', reason: '#s5-r' }; Object.entries(res.errs).forEach(([k, t]) => m[k] ? fieldErr(m[k], t) : toast(t, 'info')); return false; } return; }
      render(); toast('Profile saved. The change is in the audit history.');
    } }] });
};
const _staffScrS5a = SCREENS['a-staff'];
SCREENS['a-staff'] = p => {
  const s = p.id ? ADMIN.staff.find(x => x.id === p.id) : null;
  // Activity and role history include entries recorded under a previous name
  const ap = auditPanel; if (s && s.prevNames) auditPanel = (m, t) => ap(a => m(a) || s.prevNames.includes(a.entity) || s.prevNames.includes(a.actor), t);
  let h; try { h = _staffScrS5a(p); } finally { auditPanel = ap; }
  if (!s) return h;
  const t = p.tab || 'profile';
  if (t === 'profile' && !s5ProfileWhy(s)) h = h.replace(/<section class="card"><dl class="kv"><dt>Email<\/dt>/, `<section class="card"><div class="row-b"><h2>Profile</h2><button class="btn btn-sm" data-act="s5EditStaff" data-id="${s.id}">${ic('edit', 14)}Edit profile</button></div><dl class="kv"><dt>Staff ID</dt><dd class="mono small">${esc(s.id)}</dd><dt>Email</dt>`);
  if (t === 'roles') {
    const opts = s5Assignable().filter(r => !s.roles.includes(r)).map(r => r === S5_SUPER && isSys() ? '<option disabled>Super Administrator — Super Admin only</option>' : r === S5_SYS && isSys() ? '<option disabled>System Administrator — Super Administrator only</option>' : `<option>${esc(r)}</option>`).join('');
    h = h.replace(/(<select class="select" id="gr"[^>]*>)[^]*?(<\/select>)/, `$1${opts}$2`);
    const ret = s.roles.filter(r => { const x = s5RoleRec(r); return x && x.status !== 'Active'; });
    if (ret.length) h = h.replace(/(<div class="row"><label class="sr" for="gr">)/, `<div class="note b-amber">${ic('alert')}<div class="small"><strong>Retired role kept:</strong> ${ret.map(esc).join(', ')} — still held, can't be newly assigned. What happens to existing holders of a retired role is not yet defined (open).</div></div>$1`);
  }
  return h;
};

/* ---------- Allocation saves re-check role eligibility ---------- */
const s5Holds = (name, role) => { const m = ADMIN.staff.filter(s => s.name === name); return m.length === 1 && m[0].status === 'Active' && m[0].roles.includes(role); };
const s5HoldsWhy = (name, role) => { const m = ADMIN.staff.filter(s => s.name === name); if (m.length > 1) return `${name}: more than one staff account has this name — choose by account.`; if (!m.length) return `${name} has no staff account.`; if (m[0].status !== 'Active') return `${name}'s account is ${m[0].status.toLowerCase()}.`; return m[0].roles.includes(role) ? '' : `${name} doesn't hold the ${role} role.`; };
function s5AllocDeny(entity, why) { logA('Batches', entity, 'Blocked: staff allocation', '—', '—', why); toast(why, 'err'); return false; }
const s5WrapPrimary = (check) => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary/.test(x.cls)); if (!a || !a.fn) return; const g = a.fn; a.fn = (...x) => { const w = check(); if (w) return w === true ? false : (toast(w, 'err'), false); return g(...x); }; };
const s5BatchStaffCheck = b => () => {
  const c = ($('#modal-root #bs-c') || {}).value || '', t = ($('#modal-root #bs-t') || {}).value || '';
  const wc = c && c !== b.coord ? s5HoldsWhy(c, 'Academic Coordinator') : '', wt = t && !(b.teachers.length === 1 && b.teachers[0] === t) ? s5HoldsWhy(t, 'Teacher') : '';
  const w = wc || wt; if (w) { s5AllocDeny(`${b.label} (${b.code})`, w); return true; } return '';
};
['batchStaff', 'cooStaff'].forEach(k => { const f = ACT[k]; if (!f) return; ACT[k] = (el, e) => { const b = ADMIN.batches.find(x => x.code === (el && el.dataset && el.dataset.id)); const r = f(el, e); if (b && MODAL) s5WrapPrimary(s5BatchStaffCheck(b)); return r; }; });
const _chSaveS5a = ACT.chAssessSave;
ACT.chAssessSave = (el, e) => {
  const b = ADMIN.batches.find(x => x.code === (el && el.dataset && el.dataset.b));
  if (b) { const a = chAllocOf(b), names = chAssessorNames(), bad = CH_AROLES.map(([k, l]) => [k, l, ($('#ch-as-' + k) || {}).value]).find(([k, , v]) => v && v !== a[k] && !names.includes(v));
    if (bad) { chAudit('Batches', `${b.label} (${b.code})`, 'Blocked: assessor allocation', '—', bad[2], `${bad[2]} isn't an active Assessor`); toast(`${bad[2]} isn't an active Assessor, so they can't be the ${bad[1].toLowerCase()}.`, 'err'); return; } }
  return _chSaveS5a(el, e);
};
const s5AnyWhy = (name, roles) => { const w = roles.map(r => s5HoldsWhy(name, r)); return w.every(Boolean) ? w.find(x => !/doesn't hold/.test(x)) || `${name} doesn't hold the ${roles.join(' or ')} role.` : ''; };
const _kAllocS5a = ACT.kAlloc;
ACT.kAlloc = (el, e) => { const r = _kAllocS5a(el, e); if (MODAL) s5WrapPrimary(() => { const who = mval('#ka-s'), w = s5AnyWhy(who, ['Teacher', 'Assessor']); if (w) { logA('Staff Allocations', who || '—', 'Blocked: allocation', '—', '—', w); fieldErr('#ka-s', w); return true; } return ''; }); return r; };
const _reallocS5a = ACT.realloc;
ACT.realloc = (el, e) => { const s = ADMIN.staff.find(x => x.id === (el && el.dataset && el.dataset.id)); const r = _reallocS5a(el, e); if (MODAL) s5WrapPrimary(() => { const to = mval('#ra-to'), w = !to ? 'Choose the new assessor' : s && to === s.name ? 'Choose a different assessor' : s5HoldsWhy(to, 'Assessor'); if (w) { logA('Staff & Users', s ? s.name : '—', 'Blocked: re-allocation', '—', to || '—', w); fieldErr('#ra-to', w); return true; } return ''; }); return r; };
// Academic Admin re-allocation wizard: the new assessor is checked when it is chosen (step 2)
const _omS5a = openModal;
openModal = function (m) { const r = _omS5a.apply(this, arguments); if (MODAL && /^Re-allocate learners — step 2 of 3/.test(MODAL.title || '')) s5WrapPrimary(() => { const to = mval('#kr-t'), w = s5HoldsWhy(to, 'Assessor'); if (w) { logA('Staff Allocations', to || '—', 'Blocked: re-allocation', '—', to || '—', w); fieldErr('#kr-t', w); return true; } return ''; }); return r; };

/* ---------- Custom-role access (S5-02): admin console for holders of custom roles ---------- */
const S5_CTXL = 'Custom role access';
const s5Ctx = () => !!(typeof ADMIN !== 'undefined' && ADMIN && ADMIN.s5c && S.portal === 'admin');
// Capability module of each admin route (navigation, screens and URLs)
const S5_ROUTE_MOD = { 'a-learners': 'Learners', 'a-learner': 'Learners', 'a-admissions': 'Admissions & Documents', 'a-staff': 'Staff & Users', 'a-roles': 'Roles & Capabilities', 'a-courses': 'Courses & Programmes', 'a-programmes': 'Courses & Programmes', 'a-resources': 'Courses & Programmes', 'a-assignments': 'Assignments & Mapping', 'a-batches': 'Batches & Scheduling', 'a-scheduling': 'Batches & Scheduling', 'a-attendance': 'Batches & Scheduling', 'a-observations': 'Observations', 'a-records': 'Marking & Verification', 'a-certificates': 'Certificates', 'a-agencies': 'Agencies & Bundles', 'a-bundles': 'Agencies & Bundles', 'a-referrals': 'Agencies & Bundles', 'a-finance': 'Finance', 'a-reports': 'Reports', 'a-announcements': 'Announcements', 'a-integrations': 'System Configuration', 'a-config': 'System Configuration' };
const S5_ROUTE_ALWAYS = ['a-dashboard', 'a-me'];
// Actions a custom-role holder can perform, by capability (everything else is refused — reported as not yet supported)
const S5_ACT_CAP = { docDec: ['Admissions & Documents', 'E'], s5EditStaff: ['Staff & Users', 'E'] };
const S5_ACT_UI = new Set(['skip', 'menu', 'modalClose', 'modalScrim', 'drawer', 'aDrawer', 'aGroup', 'aMarkRead', 'aOpenNotif', 'dtClr', 'dtClrAll', 'dtDApply', 'dtDClr', 'dtDP', 'dtDT', 'dtFT', 'dtPage', 'dtPg', 'dtSelNone', 'dtSort', 'dsDensity', 'navMore', 'navSearch', 'goTok', 'viewFile', 'fakeDl', 'theme', 'logout', 'frame', 'openIndex', 'demoToggle', 'switchRole', 'demoSignInAs', 'demoSignInAsSys', 'resetDemo', 'roleBack', 'jump', 'demoAuth', 'nfClr', 'nfG', 'nfMore', 'previewCaps', 'sysRoleWhy', 'toggleOffline', 'pwToggle', 'policy']);
const S5_INP_UI = new Set(['adminVariant', 'adminEdge', 'variant', 'edge', 'role', 'cooCtx', 'tasCtx', 'mCtx', 'sCtx', 'finCtx', 'bCtx', 'kCtx', 'qCtx', 'theme']);
// Effective capabilities: the union of all the person's roles, then the restrictions no role can override
function s5Eff(roles) {
  rolesData(); const u = unionCaps(roles || []), o = { ...u };
  o['Roles & Capabilities'] = (u['Roles & Capabilities'] || '').includes('V') ? 'V' : ''; // role administration: built-in roles only
  o['Marking & Verification'] = (u['Marking & Verification'] || '').includes('V') ? 'V' : ''; // marking, verification and IQA: their own portals
  return o;
}
const s5Has = (mod, k) => s5Ctx() && (s5Eff(ADMIN.me.roles)[mod] || '').includes(k);
const s5RouteOk = r => S5_ROUTE_ALWAYS.includes(r) || (S5_ROUTE_MOD[r] && s5Has(S5_ROUTE_MOD[r], 'V'));
function s5GateWhy(kind, k) {
  if (kind === 'ACT') { if (S5_ACT_UI.has(k)) return ''; const c = S5_ACT_CAP[k]; if (c) return s5Has(c[0], c[1]) ? '' : `Your roles don't include ${c[0]}: ${({ C: 'Create', E: 'Edit', D: 'Delete' })[c[1]]}.`; }
  if (kind === 'INP' && (S5_INP_UI.has(k) || /^(dt|nf|cal|mon|pw|otp)/.test(k))) return '';
  return 'This action isn\'t available with custom-role access.';
}
function s5LockPage(what, why) {
  ADMIN.security.unshift({ id: 'SE-' + (900 + ADMIN.security.length), sev: 'High', at: now().toISOString(), type: 'Out-of-scope action', detail: `${s5ActorLbl()} ${ADMIN.me.name} attempted: ${what}`, reviewed: false });
  return `<div class="lockpage"><div class="lock-ic">${ic('lock', 30)}</div><h1>Not available with your roles</h1><p class="muted">${esc(why)} This attempt has been logged.</p><button class="btn btn-primary" data-go="a-dashboard">Go to Dashboard</button></div>`;
}
function s5GateAll() {
  [[ACT, 'ACT'], [SUBMIT, 'SUBMIT'], [INP, 'INP']].forEach(([o, kind]) => Object.keys(o).forEach(k => {
    const f = o[k]; if (typeof f !== 'function' || f._s5) return;
    const g = function () { if (s5Ctx()) { const why = s5GateWhy(kind, k); if (why) return s5Deny('Access control', k, (kind === 'SUBMIT' ? 'submit ' : 'use ') + k, why); } return f.apply(this, arguments); };
    g._s5 = true; o[k] = g;
  }));
}
function s5Leave() {
  if (!ADMIN || !ADMIN.s5c) return; const sv = ADMIN._s5Sa || {};
  if (sv.me) { ADMIN.me = sv.me; ADMIN.myNotifs = sv.notifs; ADMIN.variant = sv.variant; }
  delete ADMIN.s5c; delete ADMIN._s5Sa;
}
function s5EnterCustom(s, keepMulti) {
  if (!s || s.status !== 'Active') return false;
  rolesData(); s5Leave();
  setAdminIdentity(ADMIN._saAv || (ADMIN_VARIANTS[ADMIN.av] ? ADMIN.av : 'A'));
  ADMIN._s5Sa = { me: ADMIN.me, notifs: ADMIN.myNotifs, variant: ADMIN.variant };
  ADMIN.s5c = { id: s.id };
  ADMIN.me = { name: s.name, first: s.name.split(' ')[0], email: s.email, id: s.id, roles: s.roles.filter(r => !S5_ADMIN_ROLES.includes(r)), tz: s.tz || 'Europe/London' };
  ADMIN.myNotifs = []; ADMIN.variant = { label: S5_CTXL };
  if (keepMulti) S.multiCur = S5_CTXL; else S.multiRoles = null;
  s5GateAll();
  S.portal = 'admin'; S.signedIn = true; S.auth = 'signin'; S.authMsg = null; S.serverError = false; go('a-dashboard');
  return true;
}
const s5CustomOnly = s => s.roles.some(s5IsCustom) && !s.roles.some(r => ROLE_KEY[r] || S5_ADMIN_ROLES.includes(r) || ['Teacher', 'Assessor', 'Academic Coordinator', 'IQA'].includes(r));
const _setIdS5a = setAdminIdentity; setAdminIdentity = function (av) { s5Leave(); const r = _setIdS5a.apply(this, arguments); s5Replay(av); return r; };
const _signOutS5a = signOut; signOut = function () { if (typeof ADMIN !== 'undefined' && ADMIN) s5Leave(); return _signOutS5a.apply(this, arguments); };
['switchRole', 'demoSignInAs', 'demoSignInAsSys'].forEach(k => { const f = ACT[k]; if (f) ACT[k] = (el, e) => { s5Leave(); return f(el, e); }; });
const _ssS5a = staffSignin;
staffSignin = function (e) {
  if (typeof ADMIN !== 'undefined' && ADMIN && typeof e === 'string') {
    rolesData(); const s = ADMIN.staff.find(x => x.email.toLowerCase() === e.toLowerCase());
    if (s && s5CustomOnly(s)) { if (s.status !== 'Active') { S.authMsg = { html: '<strong>Your staff account is suspended or deactivated.</strong> Contact the System Administrator.' }; render(); return true; } s.last = now().toISOString(); s5EnterCustom(s); toast(`Signed in as ${s.name} (${s.roles.join(' + ')}).`, 'info'); return true; }
  }
  s5Leave(); return _ssS5a.apply(this, arguments);
};
// Built-in admin + custom role: the role switcher offers custom-role access too
const _eapS5a = enterAsPerson;
enterAsPerson = function (s, role) { const r = _eapS5a.apply(this, arguments); if (s && s.roles.some(s5IsCustom) && S.multiRoles && !S.multiRoles.includes(S5_CTXL)) { S.multiRoles = S.multiRoles.concat(S5_CTXL); render(); } return r; };
const _mCtxS5a = INP.mCtx;
INP.mCtx = (el, e) => { if (el && el.value === S5_CTXL) { const s = ADMIN.staff.find(x => x.id === S.multiPerson); if (s && s5EnterCustom(s, true)) toast('Role context: ' + S5_CTXL, 'info'); return; } return _mCtxS5a(el, e); };
const _navS5a = adminNav;
adminNav = function () {
  const nav = _navS5a.apply(this, arguments); if (!s5Ctx()) return nav;
  return ANAV.map(([g, items]) => [g, items.filter(([r]) => s5RouteOk(r))]).filter(([, i]) => i.length);
};
const _pageS5a = adminPage;
adminPage = function () {
  if (s5Ctx() && !s5RouteOk(S.route)) { const k = S.route + '.' + ((S.params || {}).id || ''); const h = s5LockPage('open ' + S.route + ((S.params || {}).id ? ' (' + S.params.id + ')' : ''), `Your roles don't give access to ${S5_ROUTE_MOD[S.route] || 'this area'}.`); if (S.s5Denied === k) ADMIN.security.shift(); S.s5Denied = k; return h; }
  S.s5Denied = null; return _pageS5a.apply(this, arguments);
};
const _dashS5a = SCREENS['a-dashboard'];
SCREENS['a-dashboard'] = p => {
  if (!s5Ctx()) return _dashS5a(p);
  const eff = s5Eff(ADMIN.me.roles), raw = unionCaps(ADMIN.me.roles), routes = m => Object.entries(S5_ROUTE_MOD).filter(([r, x]) => x === m && ANAV.some(([, it]) => it.some(i => i[0] === r)));
  const av = m => eff[m].split('').filter(k => s5Sup(m).includes(k)).join(''), later = m => eff[m].split('').filter(k => !s5Sup(m).includes(k)).join('');
  const rows = CAP_MODULES.filter(m => eff[m]).map(m => `<tr><td>${m}</td><td class="small">${capStr(av(m))}${later(m) ? ` <span class="xs muted">· configured, not yet available here: ${capStr(later(m))}</span>` : ''}${raw[m] !== eff[m] ? ` <span class="xs muted">(${ic('lock', 11)} ${capStr(s5NonV(raw[m]))} stays with built-in roles)</span>` : ''}</td><td class="small">${routes(m).map(([r]) => `<a href="#${r}" data-go="${r}">${esc((ANAV.flatMap(([, it]) => it).find(i => i[0] === r) || [, r])[1])}</a>`).join(' · ') || '—'}</td></tr>`).join('');
  return `${pageA('Welcome, ' + esc(ADMIN.me.first), S5_CTXL + ' · ' + esc(ADMIN.me.roles.join(' · ')))}
  <div class="note b-blue">${ic('info')}<div class="small">Your access is the combined permissions of all your roles. Some things always stay with built-in roles: role and account administration, approvals and final decisions, marking, verification and IQA.</div></div>
  <section class="card"><h2>Your access</h2>${rows ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Module</th><th>Available to you</th><th>Open</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="small muted">Your roles don\'t include any admin modules yet.</p>'}
  <p class="xs muted">Actions available with custom-role access in this prototype: document decisions (Admissions &amp; Documents — Edit) and staff profile edits (Staff &amp; Users — Edit). Other actions are view-only here.</p></section>`;
};
const _arS5a = adminRender;
adminRender = function () {
  const r = _arS5a.apply(this, arguments); if (!s5Ctx()) return r;
  $$('.adm .adm-search, .adm .adm-appr, .adm .hdr-right [data-go="a-messages"]').forEach(x => x.remove());
  const rc = $('.adm .role-ctx'); if (rc) rc.textContent = S5_CTXL;
  const sub = $('.adm .logo span'); if (sub) sub.textContent = S5_CTXL;
  $$('.adm-side a[href="#a-index"]').forEach(a => a.closest('.adm-group') && a.closest('.adm-group').remove());
  $$('#main [data-act]').forEach(b => { if (!b.dataset.go && s5GateWhy('ACT', b.dataset.act)) { b.setAttribute('aria-disabled', 'true'); if ('disabled' in b) b.disabled = true; b.title = 'Not available with your roles'; } });
  $$('#main form[data-submit]').forEach(f => { if (s5GateWhy('SUBMIT', f.dataset.submit)) $$('[type="submit"]', f).forEach(b => { b.disabled = true; b.title = 'Not available with your roles'; }); });
  $$('#main [data-onchange], #main [data-oninput]').forEach(i => { const k = i.dataset.onchange || i.dataset.oninput; if (s5GateWhy('INP', k)) i.disabled = true; });
  return r;
};
// Second layer for the screen: refused actions never reach their handler (direct calls are refused by the wrappers)
['click', 'submit', 'change'].forEach(ev => window.addEventListener(ev, e => {
  if (!s5Ctx() || !e.target || !e.target.closest) return;
  const el = ev === 'click' ? e.target.closest('[data-act],[data-go]') : ev === 'submit' ? e.target.closest('[data-submit]') : e.target.closest('[data-onchange]');
  if (!el || (ev === 'click' && el.dataset.go)) return;
  const kind = ev === 'click' ? 'ACT' : ev === 'submit' ? 'SUBMIT' : 'INP', k = ev === 'click' ? el.dataset.act : ev === 'submit' ? el.dataset.submit : el.dataset.onchange;
  const why = s5GateWhy(kind, k); if (!why) return;
  e.stopPropagation(); e.preventDefault(); s5Deny('Access control', k, (kind === 'SUBMIT' ? 'submit ' : 'use ') + k, why);
}, true));
s5GateAll();

/* ---------- Records ---------- */
UXC.push(['Setup S5a', 'Setup fixes — role security, staff profiles and custom roles (S5-01, S5-02)', [
  'Role security (fixed first): the Super Administrator lock compared the route id "Super_Administrator" with "Super Administrator", so a System Admin could open that role\'s editor, and "Save changes" checked nobody. Role ids are now canonical (URL encoding, underscores, "+", spacing and case can\'t bypass a lock) and every change re-checks the actor when it is confirmed, not when the page opened. A System Admin can\'t open, save or change a named capability of the Super Administrator role by navigation, an altered URL, a direct call or a crafted form; refusals leave the capabilities unchanged and are written to the security log and the audit (the existing System Admin convention).',
  'Who can change what (shown on Roles & Capabilities): editing a role\'s capabilities — Super Admin; System Admin except the Super Administrator role. Assigning / removing roles (Staff & Users) — Super Admin; System Admin except the Super Administrator and System Administrator roles and Super Administrator accounts (existing TBD-150 rule, now also on Add user). Creating / retiring custom roles — Super Admin; System Admin. Super Administrator authority — Super Admin only; at least one must remain (unchanged). Other roles are refused, also by direct calls. Locks are checked on the saved values: mark/verify only for the Assessor role, none for the Academic Coordinator, Learner and Agency Administrator roles locked.',
  'S5-01 Staff profiles: "Edit profile" (Super Admin; System Admin except Super Administrator accounts) changes name, email, mobile and qualifications with a reason. Validated (name letters only, 80 max; valid email, unique across staff accounts and other people\'s personas; mobile digits / spaces / brackets / hyphens; qualifications 200 max); an invalid save changes nothing. Audited with before → after, actor and reason; shown in the staff list and record. The staff ID, roles, allocations and history are kept, and edits survive an admin rebuild (matched by staff ID and original email, never by name). A name is still used as a reference by batches, sessions, plans, queue items and personas, so a rename is refused while anything refers to the old name (the reason is shown); a new account can be renamed and its earlier history stays on the record.',
  'S5-02 Custom roles: created in the existing editor (a custom role can\'t include role administration or mark/verify, and can\'t take or imitate a built-in role\'s name), offered in Add user and Grant role while Active, granted / revoked with a reason and shown on the account. Retiring stops new assignments (Grant, Add user, direct calls); existing holders keep it and their record says so. Built-in roles can\'t be retired. Custom roles, capability changes and role holdings survive an admin rebuild (see Persistence).',
  'Custom-role access: an account whose roles are only custom roles signs in to the admin console with "Custom role access"; a built-in admin who also holds a custom role gets it in the role switcher. Access is the union of all the person\'s roles, then capped by restrictions no role can override: Roles & Capabilities view only, Marking & Verification view only; approvals, role and account administration stay with built-in roles. Navigation, screens and URLs follow View per module (refused URLs show a lock page and are logged); buttons outside the roles are disabled; every action is checked again when called directly. Supported actions: document decisions (Admissions & Documents — Edit) and staff profile edits (Staff & Users — Edit, not on administrator accounts); everything else is refused and logged as not yet supported.',
  'Allocation saves re-check eligibility when saved: batch Teacher must be an active Teacher and the Coordinator an active Academic Coordinator (Super Admin / Academic Admin and the Coordinator\'s own "Edit staff"); CH-17 assessors must be in the existing assessor list (P-33 unchanged); Academic Admin allocation needs a Teacher or Assessor; both re-allocation paths need an active Assessor. A name shared by two accounts is refused. Role changes never delete or reassign allocations or history. There is no IQA allocation save in the prototype.',
  'Persona reconciliation: Sarah Okonkwo\'s staff record (ST-004) gained Teacher — her persona, with the same email, qualifications and registration, is Teacher + Assessor and teaches her short-course batch. Michael Osei is not reconciled: the staff record (ST-017, Academic Coordinator, michael.osei@) and the persona (Teacher + Assessor + Coordinator, michael.osei.tas@) have different emails, so they can\'t be matched by a stable ID; both are kept as they were. He remains selectable as an assessor through his persona.',
  'Persistence (S5a correction): ADMIN.staff and the admin audit are rebuilt from the seed whenever the admin view is rebuilt (variant switch, a Super Admin identity change, an index jump), and some identity switches run fixture code on specific seeded accounts. Created accounts, built-in role grants / revokes and status changes lived only in the rebuilt list, so they disappeared or reverted (profile edits, role configuration and custom-role holdings on seeded accounts were already kept). The prototype store now owns what admins change this session: created accounts (full record, same staff ID; a clashing ID is replaced before anything refers to it and its set-password email follows), grants and revokes on seeded accounts as operations (a revoked role is never regained from the seed), account status and 2FA resets, profile edits, role configuration, the staff / roles / allocation audit rows, and the created accounts\' set-password emails. They are reapplied after every rebuild and identity switch; the variant fixtures (System Admin + Finance, Business Admin + Finance, Academic Admin + Assessor, IQA + Assessor, Only one Finance Admin, Only one System Admin) keep exactly the field they set while that variant is active. The staff list, record, role holders, sign-in and allocation checks all read the same records. Only the deliberate demo reset restores the seed.',
  'Custom-role settings now say what works: in a custom role\'s editor each module states whether its permissions are enforced as actions (View everywhere; Edit on Admissions & Documents = document decisions; Edit on Staff & Users = staff profiles) or saved but not yet available; the custom-role dashboard lists available permissions separately from configured-but-unsupported ones, which stay refused.',
  'Sources: client-documented (Roles and Permissions — Tick to Confirm, as quoted to us): one person can hold several roles; System Admin manages staff accounts, assigns ordinary roles, creates custom roles and edits the permitted role configuration, creates and edits batches, schedules classes and Zoom sessions; only the Super Admin grants or removes Super Administrator; System Admin doesn\'t mark or make reserved final approvals. Accepted internally (to confirm): System Admin can\'t grant / remove System Administrator (existing TBD-150, now also on Add user); custom roles can\'t include role administration; reserved names; the route → module map and the supported custom-role actions. Open: what happens to holders of a retired role; renaming staff who are referred to by name (needs staff-ID references); custom-role access for people who also teach or assess (they keep their staff portal); the staff list Role filter still lists the built-in roles only; the security log and other modules\' data (for example the agency store) are still rebuilt with the admin view (unchanged, outside S5a).']]);
const _aIdxS5a = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxS5a(p).replace(/(<section class="card idx-sec"><h2>Setup fixes<\/h2><ul class="idx-list">)/, `$1${chIdxLi('Roles & Capabilities · Staff & Users — role security and custom roles', { act: 'aJump', t: 'a-roles' }, 'S5a — Super Administrator lock, checks when saved, staff profile edits, assignable custom roles, custom-role access.')}`);
