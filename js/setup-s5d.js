/* Setup S5d — announcements, notification templates, the delivery log and referral codes (S5-04, S5-05, S5-07).
   One lifecycle for every existing announcement store (no new store): drafts are edited in place under a stable ID, published,
   scheduled (published once when the clock reaches the time, on the next screen update) and withdrawn — withdrawal reaches the
   learners' copies. Audiences resolve to real learner, staff and agency IDs, once per person. The agency feed and the teacher
   list show only what the reader may see. Templates are stored and govern the senders wired to them; every send is a simulated
   delivery-log record. Referral codes get create / disable / re-enable / extend / edit-while-unused, checked in the action.
   Loads after setup-s5b.js. */
'use strict';

/* ---------- Store ----------
   STORE.s5d keeps what this session changed, so an admin rebuild (which re-seeds ADMIN.announcements, STORE.biz, STORE.agy,
   STORE.tas, the referral codes and the admin audit) puts it back: announcements by kind and ID, templates (and their
   attachments), the delivery log, referral codes by code and the audit rows of these modules. Only the demo reset clears it. */
function s5dStore() { return (STORE.s5d = STORE.s5d || { anns: { academy: {}, biz: {}, agency: {}, teacher: {}, coord: {} }, tpl: {}, tplAtt: {}, log: [], refs: {}, audit: [], seq: 0 }); }
const s5dClone = x => JSON.parse(JSON.stringify(x));
const s5dClean = v => String(v == null ? '' : v).replace(/[ \t]+/g, ' ').trim();

/* ---------- The five existing announcement workflows ---------- */
const S5D_K = {
  academy: { list: () => (ADMIN && ADMIN.announcements) || [], pre: 'AN-', clock: () => now(), name: 'Academy announcement' },
  biz: { list: () => (STORE.biz && STORE.biz.anns) || [], pre: 'BA-', clock: () => now(), name: 'Announcement to agencies' },
  agency: { list: () => (STORE.agy && STORE.agy.anns) || [], pre: 'GA-', clock: () => agNow(), name: 'Agency announcement' },
  teacher: { list: () => (STORE.tas && STORE.tas.anns) || [], pre: 'TA-', clock: () => now(), name: 'Teacher announcement' },
  coord: { list: () => (STORE.coo && STORE.coo.anns) || [], pre: 'CA-', clock: () => now(), name: 'Coordinator announcement' },
};
const s5dFind = (k, id) => S5D_K[k] ? S5D_K[k].list().find(a => a.id === id) || null : null;
const s5dTouch = (k, a) => { if (a) s5dStore().anns[k][a.id] = s5dClone(a); };
const S5D_TONE = { Draft: 'grey', Scheduled: 'blue', Published: 'green', Expired: 'grey', Withdrawn: 'red' };

/* ---------- Who is acting, and what they may do (checked when the action runs) ----------
   Academy-wide announcements: Super Administrator and System Administrators (Announcements: all capabilities). Academic Admin:
   academy-wide announcements too (Roles and Permissions — Tick to Confirm: Academic Admin → Communications → "Academy-wide
   announcements" ticked; the unticked "own cohorts" row doesn't limit that) — every academy audience, managing their own
   announcements; other people's announcements and teacher-originated copies stay with the Super / System Admin. Announcements to agencies: Business Admin (and the Super Admin).
   Agencies: their own learners (not when receive-only, not when the login can't sign in). Teachers and Coordinators: their own
   announcements to their own cohorts / batches. Nobody manages someone else's own announcements. */
function s5dRole(k) {
  const adm = S.portal === 'admin' && S.signedIn && ADMIN && ADMIN.me && !(typeof s5Ctx === 'function' && s5Ctx());
  if (k === 'academy') return !adm ? '' : (isSA() || isSys()) ? 'admin' : (typeof isAca === 'function' && isAca()) ? 'aca' : '';
  if (k === 'biz') return adm && (isBiz() || isSA()) ? 'admin' : '';
  if (k === 'agency') return S.portal === 'agency' && S.signedIn && S.agy && S.agy.id && AG() && !receiveOnly() && !s5bLoginWhy(AG()) ? 'owner' : '';
  if (k === 'teacher') return S.portal === 'staff' && S.signedIn && TME() ? 'owner' : '';
  if (k === 'coord') return S.portal === 'coord' && S.signedIn && CME() && S.coo.ctx === 'Academic Coordinator' ? 'owner' : '';
  return '';
}
const S5D_WHO = {
  academy: 'Academy announcements are sent by the Super Administrator, System Administrators and Academic Admins.',
  biz: 'Announcements to agencies are sent by the Business Admin (or the Super Admin).',
  agency: 'Only a signed-in agency with full communication can announce to its own learners.',
  teacher: 'Teachers announce to their own cohorts from the teaching portal.',
  coord: 'Academic Coordinators announce to their own batches from the coordinator portal.',
};
function s5dOwns(k, a) {
  if (!a) return true;
  if (k === 'agency') return a.agency === AGN();
  if (k === 'teacher') return a.by === TME().name;
  if (k === 'coord') return a.by === CME().name;
  if (k === 'academy') return a.by === ADMIN.me.name;
  return true;
}
function s5dWhy(k, a) {
  const r = s5dRole(k);
  if (!r) return k === 'agency' && S.portal === 'agency' && AG() && receiveOnly() ? 'Your agency is set to receive-only, so it can\'t send announcements.' : S5D_WHO[k];
  if ((r === 'owner' || r === 'aca') && !s5dOwns(k, a)) return 'You can only manage your own announcements.';
  return '';
}
function s5dActor() {
  if (S.portal === 'agency' && S.signedIn && S.agy && S.agy.id && AG()) return { name: `${AG().contact.split(' (')[0]} (${AGN()})`, role: 'Agency Administrator' };
  if (S.portal === 'staff' && S.signedIn && TME()) return { name: TME().name, role: TME().roles.join(' + ') };
  if (S.portal === 'coord' && S.signedIn && CME()) return { name: CME().name, role: 'Academic Coordinator' };
  if (S.portal === 'admin' && S.signedIn && ADMIN && ADMIN.me) return { name: ADMIN.me.name, role: typeof s5Ctx === 'function' && s5Ctx() ? 'Custom-role user' : isSA() ? 'Super Administrator' : isSys() ? 'System Administrator' : isBiz() ? 'Business Admin' : (typeof isAca === 'function' && isAca()) ? 'Academic Admin' : (ADMIN.me.roles[0] || 'Staff'), admin: true };
  return { name: 'Not signed in', role: '—' };
}
const S5D_MODS = ['Announcements', 'Notification Settings', 'Referrals'];
const _logAS5d = logA;
logA = function (module) {
  const r = _logAS5d.apply(this, arguments);
  if (S5D_MODS.includes(module) && ADMIN && ADMIN.audit[0] && ADMIN.audit[0].module === module && !/^AU-S5D-/.test(ADMIN.audit[0].id)) { const st = s5dStore(), a = ADMIN.audit[0]; a.id = 'AU-S5D-' + (++st.seq); st.audit.push(a); }
  // A self-registration with a referral code changes the code's count: keep it with the codes
  if (module === 'Learners' && ADMIN && ADMIN.audit[0] && ADMIN.audit[0].action === 'Self-registration') { const m = String(ADMIN.audit[0].after).match(/code (\S+)/); const c = m && (ADMIN.referrals || []).find(x => x.code === m[1]); if (c) s5dRefTouch(c); }
  return r;
};
// Audit row as the actual actor (admin actors through logA; teachers, coordinators and agencies as themselves)
function s5dAudit(module, entity, action, before, after, reason) {
  const w = s5dActor();
  if (w.admin) { logA(module, entity, action, before, after, reason); return ADMIN.audit[0]; }
  const st = s5dStore(), row = { id: 'AU-S5D-' + (++st.seq), actor: w.name, role: w.role, at: now().toISOString(), module, entity, action, before: before ?? '—', after: after ?? '—', reason: reason || '', ip: S.portal === 'agency' ? '86.12.44.10' : '81.2.69.142' };
  ADMIN.audit.unshift(row); st.audit.push(row); return row;
}
function s5dDeny(module, entity, what, why, quiet) {
  const w = s5dActor();
  ADMIN.security.unshift({ id: 'SE-S5D-' + (++s5dStore().seq), sev: 'High', at: now().toISOString(), type: 'Out-of-scope action', detail: `${w.role} ${w.name} attempted: ${what} — ${why}`, reviewed: false });
  s5dAudit(module, entity, 'Blocked: ' + what, '—', '—', why);
  if (!quiet) toast(why + ' Attempt logged.', 'err');
  return false;
}

/* ---------- Audiences: stable IDs (learner L:, staff S:, agency G:), one copy per person ---------- */
const S5D_AT = { all: 'All users (learners, staff and agencies)', learners: 'All learners', staff: 'All staff', roles: 'Staff with a role', batches: 'Learners in batches', agencies: 'Selected agencies', allAgencies: 'All active agencies', agencyLearners: 'An agency\'s learners', agyAll: 'All my learners', agyCourse: 'Learners in a course', agySel: 'Selected learners', tbatches: 'My cohorts', cbatches: 'My batches' };
const S5D_IDS = ['roles', 'batches', 'agencies', 'agencyLearners', 'agyCourse', 'agySel', 'tbatches', 'cbatches'];
function s5dTypes(k) {
  if (k === 'academy') return ['all', 'learners', 'staff', 'roles', 'batches', 'agencies', 'allAgencies', 'agencyLearners'];
  return { biz: ['allAgencies', 'agencies'], agency: ['agyAll', 'agyCourse', 'agySel'], teacher: ['tbatches'], coord: ['cbatches'] }[k];
}
const s5dActiveAgencies = () => ADMIN.agencies.filter(a => agStatus(a) === 'Active');
const s5dStaffRoles = () => [...new Set(ADMIN.staff.filter(s => s.status === 'Active').flatMap(s => s.roles))].sort();
const s5dBatchOpts = () => ADMIN.batches.filter(b => b.status !== 'Cancelled').map(b => [b.code, `${b.label} (${b.code})`]);
// The ID choices for a type, for the person composing (their own cohorts, batches, roster or courses only)
function s5dOpts(k, t, a) {
  if (t === 'roles') return s5dStaffRoles().map(r => [r, r]);
  if (t === 'batches') return s5dBatchOpts();
  if (t === 'agencies') return s5dActiveAgencies().map(g => [g.id, g.name]);
  if (t === 'agencyLearners') return ADMIN.agencies.map(g => [g.id, g.name]);
  if (t === 'agyCourse') return [...new Set(STORE.agy.assign.filter(x => x.agency === AGN()).map(x => x.course))].map(c => [c, c]);
  if (t === 'agySel') return agyRoster().map(l => [l.id, l.name]);
  if (t === 'tbatches') return tasBatches().map(b => [b.code, b.label]);
  if (t === 'cbatches') return myBatches().map(b => [b.code, b.label]);
  return [];
}
const s5dWorldOf = id => Object.keys(STORE.worlds || {}).find(v => STORE.worlds[v] && STORE.worlds[v].me && STORE.worlds[v].me.id === id) || null;
const s5dBatchLids = b => (b.coh || []).map(e => e.v ? (STORE.worlds[e.v] && STORE.worlds[e.v].me.id) : e.lid).concat((b.roster || []).map(r => r[1])).filter(Boolean);
function s5dWithTas(key, fn) { const v = S.tas.v; if (key && TAS_USERS[key]) S.tas.v = key; try { return fn(); } finally { S.tas.v = v; } }
function s5dWithCoo(key, fn) { const v = S.coo.v; if (key && COO_USERS[key]) S.coo.v = key; try { return fn(); } finally { S.coo.v = v; } }
const s5dTasKey = n => (Object.values(TAS_USERS).find(u => u.name === n) || {}).key;
const s5dCooKey = n => (Object.values(COO_USERS).find(u => u.name === n) || {}).key;
function s5dResolve(k, sp, a) {
  const out = new Map(), L = l => { if (l && l.id && l.rec !== 'Archived' && !out.has('L:' + l.id)) out.set('L:' + l.id, { key: 'L:' + l.id, type: 'learner', id: l.id, name: l.name, v: l.v || s5dWorldOf(l.id) }); };
  const Sx = s => { if (s && s.status === 'Active' && !out.has('S:' + s.id)) out.set('S:' + s.id, { key: 'S:' + s.id, type: 'staff', id: s.id, name: s.name }); };
  const G = g => { if (g && !out.has('G:' + g.id)) out.set('G:' + g.id, { key: 'G:' + g.id, type: 'agency', id: g.id, name: g.name }); };
  const lid = id => L(learnerById(id) || (s5dWorldOf(id) ? { id, name: VNAME(s5dWorldOf(id)), v: s5dWorldOf(id) } : null));
  const ids = (sp && sp.ids) || [];
  switch (sp && sp.t) {
    case 'all': allLearners().forEach(L); ADMIN.staff.forEach(Sx); s5dActiveAgencies().forEach(G); break;
    case 'learners': allLearners().forEach(L); break;
    case 'staff': ADMIN.staff.forEach(Sx); break;
    case 'roles': ADMIN.staff.filter(s => s.roles.some(r => ids.includes(r))).forEach(Sx); break;
    case 'batches': ids.forEach(c => { const b = ADMIN.batches.find(x => x.code === c); if (b) s5dBatchLids(b).forEach(lid); }); break;
    case 'agencies': ids.forEach(id => G(ADMIN.agencies.find(g => g.id === id))); break;
    case 'allAgencies': s5dActiveAgencies().forEach(G); break;
    case 'agencyLearners': ids.forEach(id => { const g = ADMIN.agencies.find(x => x.id === id); if (g) agyRoster(g.name).forEach(L); }); break;
    case 'agyAll': agyRoster(a.agency).forEach(L); break;
    case 'agyCourse': agyRoster(a.agency).filter(l => STORE.agy.assign.some(x => x.agency === a.agency && x.lid === l.id && ids.includes(x.course))).forEach(L); break;
    case 'agySel': { const own = agyRoster(a.agency).map(l => l.id); ids.filter(id => own.includes(id)).forEach(lid); break; }
    case 'tbatches': s5dWithTas(a.byKey || s5dTasKey(a.by), () => tasLearners(true)).filter(l => ids.includes(l.batch.code) && l.lid).forEach(l => L({ id: l.lid, name: l.name, v: l.v })); break;
    case 'cbatches': s5dWithCoo(a.byKey || s5dCooKey(a.by), () => myLearners(true)).filter(l => ids.includes(l.batch.code) && l.lid).forEach(l => L({ id: l.lid, name: l.name, v: l.v })); break;
  }
  return [...out.values()];
}
// Audience of a record: stored on new records; derived once from the seeded audience text for the rest
const s5dAgIds = names => (names || []).map(n => (ADMIN.agencies.find(g => g.name === n) || {}).id).filter(Boolean);
const s5dBatchIds = label => String(label || '').split(/,\s*/).map(x => (ADMIN.batches.find(b => b.label === x.replace(/^Cohort: /, '')) || {}).code).filter(Boolean);
function s5dSpecOf(k, a) {
  if (a.spec) return a.spec;
  const L = String(a.aud || '');
  if (k === 'biz') return a.targets && a.targets.length ? { t: 'agencies', ids: s5dAgIds(a.targets) } : { t: 'allAgencies', ids: [] };
  if (k === 'agency') return /^Learners in /.test(L) ? { t: 'agyCourse', ids: [L.slice(13)] } : /^Selected/.test(L) ? { t: 'agySel', ids: [] } : { t: 'agyAll', ids: [] };
  if (k === 'teacher' || k === 'coord') return { t: k === 'teacher' ? 'tbatches' : 'cbatches', ids: s5dBatchIds(L) };
  if (/^All users$/i.test(L)) return { t: 'all', ids: [] };
  if (/^All learners$/i.test(L)) return { t: 'learners', ids: [] };
  if (/^(Agency administrators|All agencies)$/i.test(L)) return { t: 'allAgencies', ids: [] };
  if (/^Agencies: /.test(L)) return { t: 'agencies', ids: s5dAgIds(a.targets || L.slice(10).split(', ')) };
  if (/^Role: /.test(L)) return { t: 'roles', ids: [L.slice(6).replace(/s$/, '')] };
  const m = L.match(/^Agency: (.*) learners$/); if (m) return { t: 'agencyLearners', ids: s5dAgIds([m[1]]) };
  const b = s5dBatchIds(L); if (b.length) return { t: 'batches', ids: b };
  return { t: 'label', ids: [] };
}
function s5dAudLabel(k, sp) {
  const ids = sp.ids || [], agn = () => ids.map(id => (ADMIN.agencies.find(g => g.id === id) || {}).name || id), bl = () => ids.map(c => (ADMIN.batches.find(b => b.code === c) || (typeof SHORT_BATCH === 'function' && SHORT_BATCH().code === c ? SHORT_BATCH() : {})).label || c);
  return { all: 'All users', learners: 'All learners', staff: 'All staff', roles: 'Role: ' + ids.join(', '), batches: bl().join(', '), agencies: 'Agencies: ' + agn().join(', '), allAgencies: 'All agencies', agencyLearners: 'Learners of ' + agn().join(', '), agyAll: 'All my learners', agyCourse: 'Learners in ' + (ids[0] || '—'), agySel: `Selected learners (${ids.length})`, tbatches: bl().join(', '), cbatches: bl().join(', ') }[sp.t] || '—';
}

/* ---------- Notification templates (S5-05) ----------
   One stored template per catalogue event: subject, body, on / off, channels, frequency, version and history (attachments use the
   existing per-event attachment list, now kept with the templates). Sign-in and account-recovery messages can't be turned off or
   lose email — no policy allows that (reported as open). Wired senders: "Announcement" (every announcement workflow) and
   "Set-password / reset" (agency set-password links). Other events keep their current behaviour (listed as a coverage gap). */
const S5D_MAND = ['Registration verification', 'Welcome / activation', 'Set-password / reset'];
const S5D_CH = ['Email', 'SMS', 'In-app'];
function s5dTplDef(e) {
  const base = { subject: `${e} — {{course}}`, body: 'Hello {{learner_name}},\n\nThis is about {{course}} on {{date}}.\n\nOpen the portal: {{link}}\n\nIllumin Academy', enabled: true, ch: { Email: true, SMS: /reminder|overdue|Live|paused/i.test(e), 'In-app': true }, freq: 'Every occurrence', v: 1, hist: [] };
  if (e === 'Announcement') return { ...base, subject: 'New announcement', body: '{{title}}', fields: ['title', 'from', 'link'] };
  if (e === 'Set-password / reset') return { ...base, subject: 'Set up your Illumin Academy agency portal', body: 'Dear {{name}},\n\nIllumin Academy has created the Agency Administrator login for {{agency}}. There is one login per agency. Set your password to activate it.\n\nThe link expires on {{expiry}} ({{days}} days after it was sent).\n\nIllumin Academy', ch: { Email: true, SMS: false, 'In-app': false }, fields: ['name', 'agency', 'expiry', 'days'] };
  return base;
}
const s5dTpl = e => s5dStore().tpl[e] || s5dTplDef(e);
const s5dMerge = (s, v) => String(s || '').replace(/\{\{(\w+)\}\}/g, (m, k) => v[k] != null ? v[k] : m);
function s5dTplWhy() {
  if (S.portal !== 'admin' || !S.signedIn || !ADMIN || !ADMIN.me || (typeof s5Ctx === 'function' && s5Ctx())) return 'Notification templates and settings are managed by the Super Administrator and System Administrators.';
  return isSA() || isSys() ? '' : 'Notification templates and settings are managed by the Super Administrator and System Administrators.';
}

/* ---------- Delivery log: one simulated record per recipient and channel, never twice ---------- */
const S5D_SIM = 'Simulated — not sent (prototype)';
function s5dSend(ev, src, srcLabel, r, ch, fx) {
  const st = s5dStore(), key = `${ev}|${src}|${r.key}|${ch}`; if (st.log.some(x => x.key === key)) return null;
  const T = s5dTpl(ev), on = T.enabled && T.ch[ch];
  const res = !T.enabled ? 'Suppressed — template turned off' : !T.ch[ch] ? 'Suppressed — channel off in the template' : ch === 'In-app' ? (r.type === 'agency' || (r.type === 'learner' && r.v) ? 'Simulated — shown in the portal' : 'Simulated — recorded (no portal inbox for this person)') : S5D_SIM;
  const rec = { key, id: 'DL-' + (st.log.length + 1), at: now().toISOString(), event: ev, src, srcLabel, to: r.key, toName: r.name, ch, tpl: `${ev} v${T.v}`, result: res };
  st.log.unshift(rec); if (on && fx) fx(T); return rec;
}

/* ---------- Publication, mirrors and withdrawal ---------- */
// Mirrors: an announcement shown in the academy list on behalf of another store (Business Admin → agencies; the seeded
// teacher announcement TA-1 shown as AN-02). The source is authoritative; its mirror and the learners' copies follow it.
const s5dRoot = (k, a) => a.srcK ? { k: a.srcK, a: s5dFind(a.srcK, a.srcId) || a, key: `${a.srcK}:${a.srcId}` } : { k, a, key: `${k}:${a.id}` };
const s5dMirrors = (k, a) => ADMIN.announcements.filter(m => m.srcK === k && m.srcId === a.id);
function s5dSyncMirror(k, a) {
  let ms = s5dMirrors(k, a);
  if (!ms.length && k === 'biz' && a.status !== 'Draft') { const m = { id: 'AN-' + a.id, srcK: 'biz', srcId: a.id }; ADMIN.announcements.unshift(m); ms = [m]; }
  ms.forEach(m => { Object.assign(m, { title: a.title, body: a.body, aud: a.aud, spec: s5dSpecOf(k, a), ch: (a.ch || []).slice(), status: a.status, at: a.at, by: a.by, recipients: a.recipients }); s5dTouch('academy', m); });
}
const S5D_FROM = { academy: 'Illumin Academy', biz: 'Illumin Academy' };
const S5D_KIND = { academy: 'Academy', biz: 'Academy', agency: 'Agency', teacher: 'Teacher', coord: 'Teacher' };
function s5dDeliver(k, a) {
  if (a.delivered) return 0;
  const R = s5dResolve(k, s5dSpecOf(k, a), a), root = `${k}:${a.id}`, from = a.from || S5D_FROM[k] || a.by, at = a.at;
  a.delivered = now().toISOString(); a.recipients = R.length; a.recips = R.map(r => r.key);
  R.forEach(r => {
    // The announcement itself: in the learner's portal (one copy, linked to its source); agencies read it in "From the Academy"
    if (r.type === 'learner' && r.v && STORE.worlds[r.v] && !STORE.worlds[r.v].announcements.some(x => x.src === root)) STORE.worlds[r.v].announcements.unshift({ id: 'an-' + a.id + '-' + r.v, src: root, title: a.title, from, kind: S5D_KIND[k], at, body: a.body || '', ...(a.att && a.att.length ? { att: a.att[0] } : {}) });
    (a.ch || []).forEach(ch => s5dSend('Announcement', root, s5dEnt(a), r, ch, T => {
      if (ch !== 'In-app') return;
      const subj = s5dMerge(T.subject, { title: a.title, from }) + (k === 'agency' ? ' from ' + a.agency : ''), body = s5dMerge(T.body, { title: a.title, from, link: 'messages..announcements' });
      if (r.type === 'learner' && r.v) notifyLearner(r.v, 'Other', subj, body, 'messages..announcements');
      if (r.type === 'agency' && typeof agyNotify === 'function') agyNotify(subj + ' from the Academy', a.title, 'g-anns..academy', 'Academy', r.name);
    }));
  });
  return R.length;
}
// Withdrawn: the learners' copies leave their announcement lists (kept in w.annArchive); expired ones are marked expired.
// Delivery records and notifications already sent stay as history.
function s5dRetract(rootKey, how) {
  Object.values(STORE.worlds || {}).forEach(w => {
    if (!w || !w.announcements) return;
    if (how === 'Expired') { w.announcements.filter(x => x.src === rootKey).forEach(x => { x.expired = true; }); return; }
    const out = w.announcements.filter(x => x.src === rootKey); if (!out.length) return;
    w.annArchive = (w.annArchive || []).concat(out.map(x => ({ ...x, withdrawn: now().toISOString() }))); w.announcements = w.announcements.filter(x => x.src !== rootKey);
  });
}
const s5dHist = (a, action, detail) => { a.hist = (a.hist || []).concat([[now().toISOString(), s5dActor().name, action, detail || '']]); };
const s5dEnt = a => `${a.title} (${a.id})`;

/* ---------- Scheduled publication: on the next screen update after the time is reached, exactly once ----------
   There is no background service in the prototype: a due announcement is published when any screen is next drawn. Its status
   and delivered stamp (and the per-recipient delivery keys) make every later evaluation do nothing. */
function s5dTick() {
  if (typeof ADMIN === 'undefined' || !ADMIN || !ADMIN.announcements || !STORE.worlds) return;
  Object.keys(S5D_K).forEach(k => S5D_K[k].list().forEach(a => {
    if (a.status !== 'Scheduled' || a.delivered || a.srcK || new Date(a.at) > S5D_K[k].clock()) return;
    a.status = 'Published'; const n = s5dDeliver(k, a);
    a.hist = (a.hist || []).concat([[now().toISOString(), 'Scheduler', 'Published (scheduled time reached)', `${n} recipients`]]);
    const st = s5dStore(), row = { id: 'AU-S5D-' + (++st.seq), actor: 'Scheduler', role: 'System', at: now().toISOString(), module: 'Announcements', entity: s5dEnt(a), action: 'Published (scheduled)', before: 'Scheduled', after: `Published · ${n} recipients`, reason: '' };
    ADMIN.audit.unshift(row); st.audit.push(row);
    s5dSyncMirror(k, a); s5dTouch(k, a);
  }));
}
const _renderS5d = render;
render = function () { s5dTick(); return _renderS5d.apply(this, arguments); };

/* ---------- Lifecycle (S5-04): create / edit a draft in place, publish, schedule, cancel, withdraw, expire ---------- */
function s5dNewId(k) {
  const st = s5dStore(), num = i => +(String(i).match(/(\d+)$/) || [0, 0])[1], used = S5D_K[k].list().map(a => a.id).concat(Object.keys(st.anns[k]));
  if (k === 'academy') used.push(...Object.keys(st.anns.academy));
  let n = Math.max(0, ...used.filter(i => i.startsWith(S5D_K[k].pre) && !/^AN-[A-Z]{2}-/.test(i)).map(num)) + 1, id;
  do { id = S5D_K[k].pre + (k === 'academy' ? String(n).padStart(2, '0') : n); n++; } while (used.includes(id));
  return id;
}
const S5D_MODE = { draft: 'Draft', schedule: 'Scheduled', publish: 'Published' };
function s5dSave(k, id, v, mode) {
  const a = id ? s5dFind(k, id) : null, what = a ? 'edit ' + s5dEnt(a) : 'create a ' + S5D_K[k].name.toLowerCase();
  let w = s5dWhy(k, a);
  if (!w && id && !a) w = 'Announcement not found.';
  if (!w && a && a.srcK) w = 'This announcement is managed in its own workflow.';
  if (!w && a && !['Draft', 'Scheduled'].includes(a.status)) w = 'Only drafts and scheduled announcements can be changed.';
  if (!w && !S5D_MODE[mode]) w = 'Unknown action.';
  if (w) { s5dDeny('Announcements', a ? s5dEnt(a) : '—', what, w, true); return { ok: false, why: w }; }
  const title = s5dClean(v.title), body = String(v.body || '').trim(), types = s5dTypes(k), sp = { t: v.spec && v.spec.t, ids: [...new Set((v.spec && v.spec.ids) || [])] }, ch = [...new Set(v.ch || [])], att = (v.att || []).slice(), clock = S5D_K[k].clock(), errs = {};
  if (!title) errs.title = 'Enter a title'; else if (title.length > 150) errs.title = '150 characters at most';
  if (body.length > 5000) errs.body = '5,000 characters at most';
  if (att.length > 5 || att.some(f => !/\.(pdf|docx|png|jpe?g)$/i.test(f))) errs.att = 'Up to 5 attachments: PDF, DOCX, PNG or JPG';
  if (!types.includes(sp.t)) errs.aud = 'Choose an audience you can send to';
  else if (S5D_IDS.includes(sp.t)) { const ok = s5dOpts(k, sp.t, a).map(o => o[0]), bad = sp.ids.filter(x => !ok.includes(x)); if (bad.length) errs.aud = 'Outside the audiences you can send to: ' + bad.join(', '); else if (mode !== 'draft' && !sp.ids.length) errs.aud = 'Choose at least one ' + (sp.t === 'roles' ? 'role' : sp.t === 'agyCourse' ? 'course' : sp.t === 'agySel' ? 'learner' : /agenc/i.test(sp.t) ? 'agency' : 'batch'); }
  else sp.ids = [];
  if (ch.some(c => !S5D_CH.includes(c))) errs.ch = 'Unknown channel'; else if (mode !== 'draft' && !ch.length) errs.ch = 'Choose at least one channel';
  if (mode === 'schedule') { const t = new Date(v.at); if (!v.at || isNaN(t)) errs.at = 'Choose the date and time'; else if (t <= clock) errs.at = 'Choose a time in the future'; }
  const tmp = { ...(a || {}), agency: a ? a.agency : (k === 'agency' ? AGN() : undefined), by: a ? a.by : s5dActor().name.replace(/ \(.*\)$/, ''), byKey: a ? a.byKey : (k === 'teacher' ? TME().key : k === 'coord' ? CME().key : undefined) };
  const n = mode !== 'draft' && !errs.aud ? s5dResolve(k, sp, tmp).length : 0;
  if (mode !== 'draft' && !errs.aud && !n) errs.aud = 'This audience has no recipients';
  if (Object.keys(errs).length) { s5dAudit('Announcements', a ? s5dEnt(a) : (title || '—'), 'Blocked: save announcement', '—', '—', Object.values(errs).join('; ')); return { ok: false, errs }; }
  const before = a ? `${a.status} · ${a.aud}` : '—', rec = a || { id: s5dNewId(k), by: tmp.by, byKey: tmp.byKey, created: now().toISOString(), hist: [] };
  Object.assign(rec, { title, body, att, spec: sp, aud: s5dAudLabel(k, sp), ch, status: S5D_MODE[mode], at: mode === 'schedule' ? new Date(v.at).toISOString() : clock.toISOString(), s5d: true });
  delete rec.delivered;
  if (k === 'agency') rec.agency = rec.from = tmp.agency;
  if (k === 'teacher' || k === 'coord') rec.from = rec.by;
  if (k === 'biz') rec.targets = sp.t === 'agencies' ? sp.ids.map(x => (ADMIN.agencies.find(g => g.id === x) || {}).name) : null;
  if (!a) S5D_K[k].list().unshift(rec);
  rec.recipients = mode === 'draft' ? undefined : n;
  s5dHist(rec, a ? (mode === 'draft' ? 'Draft saved' : mode === 'schedule' ? 'Scheduled' : 'Published') : (mode === 'draft' ? 'Created as a draft' : mode === 'schedule' ? 'Created and scheduled' : 'Created and published'), mode === 'schedule' ? 'for ' + fdt(rec.at) : rec.aud);
  if (mode === 'publish') s5dDeliver(k, rec);
  s5dSyncMirror(k, rec); s5dTouch(k, rec);
  s5dAudit('Announcements', s5dEnt(rec), a ? `${S5D_MODE[mode] === 'Draft' ? 'Draft edited' : S5D_MODE[mode]} (same announcement)` : (mode === 'draft' ? 'Draft created' : S5D_MODE[mode]), before, `${rec.status} · ${rec.aud}${mode === 'draft' ? '' : ` · ${rec.recipients} recipients`}${mode === 'schedule' ? ' · for ' + fdt(rec.at) : ''}`, '');
  return { ok: true, a: rec };
}
const S5D_ST = { Draft: ['Scheduled'], Withdrawn: ['Published', 'Scheduled'], Expired: ['Published'] };
const S5D_STW = { Draft: 'cancel the schedule of', Withdrawn: 'withdraw', Expired: 'expire' };
const S5D_STA = { Draft: 'Schedule cancelled (back to draft)', Withdrawn: 'Withdrawn', Expired: 'Expired' };
function s5dStWhy(k, a0, R, to) {
  if (!S5D_ST[to]) return 'Unknown status.';
  if (to === 'Expired' && R.k !== 'academy') return 'Only academy announcements are expired here.';
  // The source's own rule; the academy copy of a teacher announcement can also be withdrawn by the Super / System Admin
  let w = s5dWhy(R.k, R.a); if (w && R.k === 'teacher' && k === 'academy' && s5dRole('academy') === 'admin') w = '';
  if (w) return w;
  if (!S5D_ST[to].includes(R.a.status)) return `This announcement is ${String(R.a.status).toLowerCase()}, so it can't be ${({ Draft: 'returned to draft', Withdrawn: 'withdrawn', Expired: 'expired' })[to]}.`;
  return '';
}
function s5dSetStatus(k, id, to, reason) {
  const a0 = s5dFind(k, id);
  if (!a0) { s5dDeny('Announcements', String(id || '—'), (S5D_STW[to] || 'change') + ' an announcement', 'Announcement not found.', true); return { ok: false, why: 'Announcement not found.' }; }
  const R = s5dRoot(k, a0), w = s5dStWhy(k, a0, R, to);
  if (w) { s5dDeny('Announcements', s5dEnt(a0), `${S5D_STW[to] || 'change'} ${s5dEnt(a0)}`, w, true); return { ok: false, why: w }; }
  const r = s5dClean(reason); if (!r) return { ok: false, errs: { reason: 'Enter a reason' } };
  const a = R.a, before = a.status; a.status = to; if (to === 'Draft') delete a.delivered;
  s5dHist(a, S5D_STA[to], r); if (to !== 'Draft') s5dRetract(R.key, to);
  s5dMirrors(R.k, a).forEach(m => { m.status = to; m.hist = (m.hist || []).concat([[now().toISOString(), s5dActor().name, S5D_STA[to], r]]); s5dTouch('academy', m); });
  s5dTouch(R.k, a);
  s5dAudit('Announcements', s5dEnt(a), S5D_STA[to], before, to, r);
  return { ok: true, a };
}

/* ---------- Editor (all five workflows) ---------- */
const s5dAttHtml = () => { const E = S.s5dEd; return E && E.att.length ? `<ul class="list fu-att">${E.att.map((f, i) => `<li class="li small">${ic('clip2', 14)} ${esc(f)} <button type="button" class="btn btn-sm" data-act="s5dAttRm" data-i="${i}">Remove</button></li>`).join('')}</ul>` : '<p class="small muted">No attachments.</p>'; };
function s5dIdsHtml(k) {
  const E = S.s5dEd; if (!S5D_IDS.includes(E.t)) return '';
  const o = s5dOpts(k, E.t), one = E.t === 'agyCourse';
  return `<label class="sr" for="s5d-ids-s">Choose</label><select class="select" id="s5d-ids-s" ${one ? '' : 'multiple size="5"'} data-onchange="s5dAudIds">${one ? '<option value="">Choose a course</option>' : ''}${o.map(([v, l]) => `<option value="${esc(v)}" ${E.ids.includes(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>${one ? '' : '<span class="hint">Choose one or more. Each person receives one copy, however many of these they belong to.</span>'}`;
}
function s5dCountHtml(k) {
  const E = S.s5dEd, a = E.id ? s5dFind(k, E.id) : null, tmp = { ...(a || {}), agency: a ? a.agency : (k === 'agency' ? AGN() : undefined), by: a ? a.by : s5dActor().name, byKey: a ? a.byKey : (k === 'teacher' ? TME().key : k === 'coord' ? CME().key : undefined) };
  const R = s5dResolve(k, { t: E.t, ids: E.ids }, tmp), c = t => R.filter(r => r.type === t).length;
  return `Resolved recipients: <strong>${R.length}</strong> <span class="xs muted">(${c('learner')} learners · ${c('staff')} staff · ${c('agency')} agencies)</span>`;
}
function s5dEditor(k, id) {
  const a = id ? s5dFind(k, id) : null;
  let w = s5dWhy(k, a); if (!w && id && !a) w = 'Announcement not found.'; if (!w && a && (a.srcK || !['Draft', 'Scheduled'].includes(a.status))) w = 'Only drafts and scheduled announcements can be edited, in their own workflow.';
  if (w) return s5dDeny('Announcements', a ? s5dEnt(a) : '—', a ? 'edit ' + s5dEnt(a) : 'create a ' + S5D_K[k].name.toLowerCase(), w);
  const types = s5dTypes(k), sp = a ? s5dSpecOf(k, a) : { t: types[0], ids: [] }, ch = a ? (a.ch || []) : (k === 'biz' || k === 'agency' ? ['In-app'] : ['In-app', 'Email']), sched = a && a.status === 'Scheduled';
  S.s5dEd = { k, id: a ? a.id : null, t: types.includes(sp.t) ? sp.t : types[0], ids: (sp.ids || []).slice(), att: a && a.att ? a.att.slice() : [] };
  const E = S.s5dEd;
  openModal({ title: a ? `Edit announcement — ${a.id}` : 'New announcement', sub: a ? `${a.status} · created ${fdt(a.created || a.at)} by ${a.by || '—'}` : S5D_K[k].name, size: 'lg', body: `<div class="field"><label for="s5d-t">Title</label><input class="input" id="s5d-t" value="${esc(a ? a.title : '')}"></div>
    <div class="field"><label for="s5d-b">Message</label><textarea class="textarea" id="s5d-b" rows="5">${esc(a ? a.body || '' : '')}</textarea></div>
    <div class="field"><span class="lbl">Attachments</span><div id="s5d-att">${s5dAttHtml()}</div><label class="sr" for="s5d-f">Attach a file</label><input class="input" type="file" id="s5d-f" accept=".pdf,.docx,.png,.jpg,.jpeg" data-onchange="s5dAttFile"><button type="button" class="btn btn-sm" data-act="s5dAttSample" style="justify-self:start">Attach a sample file (demo)</button></div>
    <fieldset class="stack" style="border:0;padding:0"><legend class="lbl">Audience</legend>${types.length > 1 ? `<label class="sr" for="s5d-a">Audience type</label><select class="select" id="s5d-a" data-onchange="s5dAud">${types.map(t => `<option value="${t}" ${E.t === t ? 'selected' : ''}>${S5D_AT[t]}</option>`).join('')}</select>` : `<p class="small">${S5D_AT[types[0]]}</p>`}<div id="s5d-ids">${s5dIdsHtml(k)}</div></fieldset>
    <div class="row">${['In-app', 'Email', 'SMS'].map(c => `<label class="check small"><input type="checkbox" class="s5d-ch" value="${c}" ${ch.includes(c) ? 'checked' : ''}>${c}</label>`).join('')}</div>
    <div class="form-grid"><div class="field"><label for="s5d-w">Timing</label><select class="select" id="s5d-w"><option value="now">Publish now</option><option value="sched" ${sched ? 'selected' : ''}>Schedule</option></select></div><div class="field"><label for="s5d-at">Scheduled for (UTC)</label><input class="input" type="datetime-local" id="s5d-at" value="${sched ? String(a.at).slice(0, 16) : ''}"></div></div>
    <p class="small" id="s5d-c">${s5dCountHtml(k)}</p><p class="xs muted">Delivery is simulated: the announcement appears in the recipients' portals; email and SMS are recorded in the delivery log, never sent. A scheduled announcement is published the next time the prototype updates a screen after its time.</p>`,
    actions: [{ label: 'Cancel', fn: () => { S.s5dEd = null; } }, { label: 'Save draft', cls: 'btn', fn: () => s5dEdSubmit('draft') }, { label: 'Publish', cls: 'btn-primary', fn: () => s5dEdSubmit(($('#s5d-w') || {}).value === 'sched' ? 'schedule' : 'publish') }] });
}
function s5dEdSubmit(mode) {
  const E = S.s5dEd; if (!E) return false;
  const sel = $('#s5d-ids-s'), at = mval('#s5d-at');
  if (sel) E.ids = [...sel.selectedOptions].map(o => o.value).filter(Boolean);
  const res = s5dSave(E.k, E.id, { title: mval('#s5d-t'), body: ($('#s5d-b') || {}).value || '', att: E.att.slice(), spec: { t: ($('#s5d-a') || {}).value || E.t, ids: E.ids.slice() }, ch: $$('#modal-root .s5d-ch:checked').map(x => x.value), at: at ? new Date(at + (at.length === 16 ? ':00Z' : 'Z')).toISOString() : '' }, mode);
  if (!res.ok) {
    if (res.errs) Object.entries(res.errs).forEach(([f, t]) => { const m = { title: '#s5d-t', body: '#s5d-b', at: '#s5d-at' }[f]; if (m) fieldErr(m, t); else toast(t, 'err'); });
    else toast(res.why + ' Attempt logged.', 'err');
    return false;
  }
  S.s5dEd = null; render();
  toast(mode === 'draft' ? `Draft saved (${res.a.id}).` : mode === 'schedule' ? `Scheduled for ${fdt(res.a.at)}.` : `Published to ${res.a.recipients} recipients (simulated delivery).`);
}
INP.s5dAud = el => { const E = S.s5dEd; if (!E) return; E.t = el.value; E.ids = []; const d = $('#s5d-ids'); if (d) d.innerHTML = s5dIdsHtml(E.k); const c = $('#s5d-c'); if (c) c.innerHTML = s5dCountHtml(E.k); };
INP.s5dAudIds = el => { const E = S.s5dEd; if (!E) return; E.ids = [...el.selectedOptions].map(o => o.value).filter(Boolean); const c = $('#s5d-c'); if (c) c.innerHTML = s5dCountHtml(E.k); };
const s5dAttAdd = name => { const E = S.s5dEd; if (!E) return; if (!/\.(pdf|docx|png|jpe?g)$/i.test(name)) { toast('Attach a PDF, DOCX, PNG or JPG file.', 'err'); return; } if (E.att.length >= 5) { toast('Up to 5 attachments.', 'err'); return; } E.att.push(name); const d = $('#s5d-att'); if (d) d.innerHTML = s5dAttHtml(); };
ACT.s5dAttSample = () => { const E = S.s5dEd; if (E) s5dAttAdd(`Announcement attachment ${E.att.length + 1}.pdf`); };
INP.s5dAttFile = el => { const f = el.files && el.files[0]; if (f) s5dAttAdd(f.name); };
ACT.s5dAttRm = el => { const E = S.s5dEd; if (!E) return; E.att.splice(+el.dataset.i, 1); const d = $('#s5d-att'); if (d) d.innerHTML = s5dAttHtml(); };
ACT.s5dEdit = el => s5dEditor(el.dataset.k, el.dataset.id);
ACT.composeAnn = el => s5dEditor('academy', el && el.dataset && el.dataset.id);
ACT.bAnn = el => s5dEditor('biz', el && el.dataset && el.dataset.id);
ACT.agAnn = el => s5dEditor('agency', el && el.dataset && el.dataset.id);
ACT.tasAnn = el => s5dEditor('teacher', el && el.dataset && el.dataset.id);
ACT.cooAnn = el => s5dEditor('coord', el && el.dataset && el.dataset.id);
ACT.s5dSt = el => {
  const d = (el && el.dataset) || {}, k = d.k, id = d.id, to = d.s, a0 = S5D_K[k] ? s5dFind(k, id) : null;
  const w = !a0 ? 'Announcement not found.' : s5dStWhy(k, a0, s5dRoot(k, a0), to);
  if (w) return s5dDeny('Announcements', a0 ? s5dEnt(a0) : String(id || '—'), `${S5D_STW[to] || 'change'} ${a0 ? s5dEnt(a0) : 'an announcement'}`, w);
  const L = { Draft: ['Cancel scheduled announcement', 'Cancel schedule', 'It returns to draft and isn\'t published.'], Withdrawn: ['Withdraw announcement', 'Withdraw', 'It leaves learners\' and agencies\' announcement lists now. Its history and delivery records are kept.'], Expired: ['Expire announcement', 'Expire', 'Learners still see it, marked as expired.'] }[to];
  reasonDlg({ title: `${L[0]} — ${esc(a0.title)}`, ok: L[1], danger: to === 'Withdrawn', body: `<p class="small">${L[2]}</p>`, onOk: r => { const res = s5dSetStatus(k, id, to, r); if (!res.ok) { if (res.why) toast(res.why + ' Attempt logged.', 'err'); return false; } render(); toast(to === 'Withdrawn' ? 'Withdrawn.' : to === 'Draft' ? 'Schedule cancelled — back to draft.' : 'Expired.'); } });
};
// The existing status buttons and calls go through the same rules
ACT.annSt = el => ACT.s5dSt({ dataset: { k: 'academy', id: el.dataset.id, s: el.dataset.s } });
ACT.bAnnWd = el => ACT.s5dSt({ dataset: { k: 'biz', id: el.dataset.id, s: 'Withdrawn' } });
ACT.agAnnWd = el => ACT.s5dSt({ dataset: { k: 'agency', id: el.dataset.id, s: 'Withdrawn' } });
ACT.tasAnnSt = el => ACT.s5dSt({ dataset: { k: 'teacher', id: el.dataset.id, s: el.dataset.s } });
ACT.cooAnnSt = el => ACT.s5dSt({ dataset: { k: 'coord', id: el.dataset.id, s: el.dataset.s } });

/* ---------- Reading: lists, the detail view and the agency feed ---------- */
function s5dViewWhy(k, a) {
  if (k === 'academy') return S.portal === 'admin' && S.signedIn ? '' : S5D_WHO.academy;
  if (k === 'biz') return s5dRole('biz') ? '' : S5D_WHO.biz;
  if (k === 'agency') return S.portal === 'agency' && S.signedIn && AG() && a.agency === AGN() ? '' : 'Only the agency that sent it can open this announcement.';
  if (k === 'teacher') return S.portal === 'staff' && S.signedIn && a.by === TME().name ? '' : 'Teachers can only open their own announcements.';
  if (k === 'coord') return S.portal === 'coord' && S.signedIn && a.by === CME().name ? '' : 'Coordinators can only open their own announcements.';
  return 'Not available.';
}
ACT.s5dView = el => {
  const k = el.dataset.k, a = S5D_K[k] ? s5dFind(k, el.dataset.id) : null, w = !a ? 'Announcement not found.' : s5dViewWhy(k, a);
  if (w) return s5dDeny('Announcements', a ? s5dEnt(a) : String(el.dataset.id || '—'), 'open ' + (a ? s5dEnt(a) : 'an announcement'), w);
  const R = s5dRoot(k, a), recs = s5dStore().log.filter(x => x.src === R.key), sent = recs.filter(x => /^Simulated/.test(x.result)).length;
  openModal({ title: esc(a.title), sub: `${a.id} · ${S5D_K[k].name}`, size: 'lg', body: `<dl class="kv"><dt>Status</dt><dd>${chip(a.status, S5D_TONE[a.status])}</dd><dt>${a.status === 'Scheduled' ? 'Scheduled for' : 'Date'}</dt><dd>${fdt(a.at)}</dd><dt>Sender</dt><dd>${esc(a.by || '—')}</dd><dt>Audience</dt><dd>${esc(a.aud || '—')}</dd><dt>Recipients</dt><dd>${a.recipients != null ? a.recipients : '— (resolved when published)'}</dd><dt>Channels</dt><dd>${esc((a.ch || []).join(', ') || '—')}</dd>${a.att && a.att.length ? `<dt>Attachments</dt><dd>${a.att.map(f => `${ic('clip2', 14)} ${esc(f)}`).join('<br>')}</dd>` : ''}${a.srcK ? `<dt>Source</dt><dd class="small">${esc(a.srcK === 'biz' ? 'Announcement to agencies ' : 'Teacher announcement ')}${esc(a.srcId)}</dd>` : ''}</dl>
    ${a.body ? `<section class="card flat"><p class="small">${esc(a.body).replace(/\n/g, '<br>')}</p></section>` : ''}
    <h3 class="small">History</h3>${(R.a.hist || []).length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>When</th><th>Who</th><th>What</th><th>Detail</th></tr></thead><tbody>${R.a.hist.map(h => `<tr><td class="small nowrap">${fdt(h[0])}</td><td class="small">${esc(h[1])}</td><td class="small">${esc(h[2])}</td><td class="small">${esc(h[3] || '')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">Seeded record — no changes this session.</p>'}
    <p class="small">Delivery records: <strong>${recs.length}</strong> (${sent} simulated, ${recs.length - sent} suppressed) — see Notification Settings → Notification log.</p>`, actions: [{ label: 'Close', cls: 'btn-primary' }] });
};
function s5dActs(k, a) {
  const b = (act, l, s) => `<button class="btn btn-sm" data-act="${act}" data-k="${k}" data-id="${esc(a.id)}"${s ? ` data-s="${s}"` : ''}>${l}</button>`, R = s5dRoot(k, a), can = s => !s5dStWhy(k, a, R, s);
  let h = b('s5dView', 'Open');
  if (!a.srcK && ['Draft', 'Scheduled'].includes(a.status) && !s5dWhy(k, a)) h += ' ' + b('s5dEdit', 'Edit');
  if (a.status === 'Scheduled' && can('Draft')) h += ' ' + b('s5dSt', 'Cancel schedule', 'Draft');
  if (['Published', 'Scheduled'].includes(a.status) && can('Withdrawn')) h += ' ' + b('s5dSt', 'Withdraw', 'Withdrawn');
  if (a.status === 'Published' && can('Expired')) h += ' ' + b('s5dSt', 'Expire', 'Expired');
  return h;
}
function s5dTable(k, rows, id) {
  return dt({ id, name: 'Announcements', rows, rid: a => a.id, search: a => a.title + ' ' + a.id, filters: [{ k: 's', l: 'Status', get: a => a.status, opts: ['Draft', 'Scheduled', 'Published', 'Expired', 'Withdrawn'] }],
    cols: [{ k: 'title', l: 'Title', h: a => `<strong>${esc(a.title)}</strong><div class="xs mono muted">${esc(a.id)}</div>${a.teacher || a.srcK === 'teacher' ? ' <span class="typebadge">Teacher-originated</span>' : a.srcK === 'biz' ? ' <span class="typebadge">To agencies</span>' : ''}`, v: a => a.title }, { k: 'aud', l: 'Audience', h: a => `<span class="small">${esc(a.aud || '—')}</span>`, v: a => a.aud || '' }, { k: 'recipients', l: 'Recipients', r: 1, v: a => a.recipients != null ? String(a.recipients) : '—' }, { k: 'ch', l: 'Channels', v: a => (a.ch || []).join(', ') }, { k: 'status', l: 'Status', h: a => chip(a.status, S5D_TONE[a.status]), v: a => a.status }, { k: 'by', l: 'Sender', v: a => a.by || '—' }, { k: 'at', l: 'Date', h: a => `<span class="small nowrap">${a.status === 'Scheduled' ? 'For ' : ''}${fdt(a.at)}</span>`, s: a => a.at, v: a => a.at }],
    act: a => s5dActs(k, a), empty: 'No announcements yet' });
}
const S5D_RULES = `<div class="note b-grey">${ic('shield')}<div class="small"><strong>Who sends what:</strong> academy-wide — Super Administrator, System Administrators and Academic Admins (Academic Admins manage their own); to agencies — Business Admin; to cohorts — Teachers and Academic Coordinators, their own only. Each person receives one copy. Withdrawing removes it from learners' and agencies' lists at once; history and delivery records are kept.</div></div>`;
SCREENS['a-announcements'] = () => { const r = s5dRole('academy'); return `${pageA('Announcements', r === 'aca' ? 'Academy-wide announcements — you manage the ones you create.' : '', r ? `<button class="btn btn-primary" data-act="composeAnn">${ic('plus', 15)}New announcement</button>` : '')}${S5D_RULES}${s5dTable('academy', ADMIN.announcements, 'ann')}`; };
SCREENS['b-anns'] = () => `${pageA('Announcements to Agencies', '', s5dRole('biz') ? `<button class="btn btn-primary" data-act="bAnn">${ic('plus', 15)}New announcement</button>` : '')}<p class="small muted">Agencies read these under Announcements → "From the Academy". Each agency sees only what is addressed to it.</p>${s5dTable('biz', STORE.biz.anns, 'banns')}`;
SCREENS['t-announcements'] = () => `${pageA('Announcements', 'Audience limited to your own cohorts', `<button class="btn btn-primary" data-act="tasAnn">${ic('plus', 15)}New announcement</button>`)}${s5dTable('teacher', STORE.tas.anns.filter(a => a.by === TME().name), 'tann')}`;
SCREENS['c-announcements'] = () => `${pageA('Announcements', 'Audience limited to your batches', `<button class="btn btn-primary" data-act="cooAnn">${ic('plus', 15)}New announcement</button>`)}${s5dTable('coord', STORE.coo.anns.filter(a => a.by === CME().name), 'cann')}`;
// Agency feed: only published announcements, from now or earlier, addressed to everyone, to all agencies or to this agency
function s5dAgencySees(a, ag) {
  if (!a || !ag || a.status !== 'Published' || new Date(a.at) > now()) return false;
  const sp = s5dSpecOf(a.srcK || 'academy', a.srcK ? (s5dFind(a.srcK, a.srcId) || a) : a);
  return sp.t === 'all' || sp.t === 'allAgencies' || (sp.t === 'agencies' && sp.ids.includes(ag.id));
}
const s5dAgencyFeed = ag => ADMIN.announcements.filter(a => s5dAgencySees(a, ag)).sort((x, y) => String(y.at).localeCompare(String(x.at)));
agyAcademyAnns = function () { const list = s5dAgencyFeed(AG()); return `<section class="card"><h2>Announcements from the Academy</h2>${list.length ? `<ul class="list">${list.map(x => `<li class="li"><div class="li-b"><strong class="small">${esc(x.title)}</strong><span class="xs muted">${esc(x.by)} · ${fd(x.at)}</span>${x.body ? `<span class="small">${esc(x.body)}</span>` : ''}</div></li>`).join('')}</ul>` : '<p class="small muted">No announcements.</p>'}</section>`; };
SCREENS['g-anns'] = (p) => {
  const ro = receiveOnly(), t = ro ? 'academy' : (p.tab === 'academy' ? 'academy' : 'mine');
  const st = subtabs((ro ? [] : [['mine', 'To my learners']]).concat([['academy', 'From the Academy']]), t, 'g-anns');
  if (t === 'academy') return gHead('Announcements') + st + (ro ? `<div class="note b-amber">${ic('lock')}<div class="small">Your agency is set to receive-only, so announcements to learners aren't available.</div></div>` : '') + agyAcademyAnns();
  return `${gHead('Announcements', 'Send announcements to your own learners only.', `<button class="btn btn-primary" data-act="agAnn">${ic('plus', 15)}New announcement</button>`)}${st}${s5dTable('agency', STORE.agy.anns.filter(a => a.agency === AGN()), 'g-anns')}`;
};

/* ---------- Notification Settings: stored templates, toggles that take effect, the real delivery log ---------- */
const s5dTplLock = e => S5D_MAND.includes(e) ? 'Needed for sign-in and account recovery — it can\'t be turned off (no policy allows it).' : '';
const s5dTplW = e => { const st = s5dStore(); return (st.tpl[e] = st.tpl[e] || s5dTplDef(e)); };
function s5dTplSet(e, change, reason) {
  const w = s5dTplWhy(); if (w) { s5dDeny('Notification Settings', e, 'change the "' + e + '" template', w, true); return { ok: false, why: w }; }
  const T = s5dTpl(e), next = { subject: T.subject, body: T.body, enabled: T.enabled, ch: { ...T.ch }, freq: T.freq, ...change, ch: { ...T.ch, ...(change.ch || {}) } }, errs = {};
  next.subject = s5dClean(next.subject); next.body = String(next.body || '').trim();
  if (!next.subject) errs.subject = 'Enter a subject'; else if (next.subject.length > 150) errs.subject = '150 characters at most';
  if (!next.body) errs.body = 'Enter the message'; else if (next.body.length > 5000) errs.body = '5,000 characters at most';
  if (!['Every occurrence', 'Daily digest', 'At most once per 24 hours'].includes(next.freq)) errs.freq = 'Choose a frequency';
  if (S5D_MAND.includes(e) && (!next.enabled || !next.ch.Email)) errs.enabled = s5dTplLock(e);
  if (next.enabled && !S5D_CH.some(c => next.ch[c])) errs.ch = 'Keep at least one channel, or turn the event off';
  if (Object.keys(errs).length) { s5dAudit('Notification Settings', e, 'Blocked: template change', '—', '—', Object.values(errs).join('; ')); return { ok: false, errs }; }
  const desc = o => `${o.enabled ? 'On' : 'Off'} · ${S5D_CH.filter(c => o.ch[c]).join(', ') || 'no channel'} · ${o.freq}`, ch = ['subject', 'body', 'enabled', 'freq'].filter(k => next[k] !== T[k]).concat(S5D_CH.filter(c => next.ch[c] !== T.ch[c]).map(c => c));
  if (!ch.length) return { ok: false, errs: { form: 'No changes to save' } };
  const W = s5dTplW(e), before = desc(W);
  Object.assign(W, { subject: next.subject, body: next.body, enabled: next.enabled, ch: next.ch, freq: next.freq, v: W.v + 1 }); W.hist = (W.hist || []).concat([[now().toISOString(), s5dActor().name, `Version ${W.v}`, ch.join(', '), reason || '']]);
  s5dAudit('Notification Settings', e, `Template saved — version ${W.v}`, before, desc(W), [ch.join(', '), reason].filter(Boolean).join(' — '));
  return { ok: true, v: W.v };
}
INP.evToggle = el => {
  const e = el.dataset.e, lock = s5dTplLock(e);
  if (lock) { el.checked = true; s5dAudit('Notification Settings', e, 'Blocked: turn off', '—', '—', lock); toast(lock, 'err'); return false; }
  const r = s5dTplSet(e, { enabled: !!el.checked }); if (!r.ok) { el.checked = !el.checked; toast((r.why || Object.values(r.errs)[0]) + (r.why ? ' Attempt logged.' : ''), 'err'); return false; }
  toast(`${e}: ${el.checked ? 'on' : 'off'} (template version ${r.v}).`);
};
INP.s5dTplCh = el => {
  const e = el.dataset.e, c = el.dataset.c, r = s5dTplSet(e, { ch: { [c]: !!el.checked } });
  if (!r.ok) { el.checked = !el.checked; toast((r.why || Object.values(r.errs)[0]) + (r.why ? ' Attempt logged.' : ''), 'err'); return false; }
  toast(`${e}: ${c} ${el.checked ? 'on' : 'off'}.`);
};
const S5D_TIMING = e => /reminder/i.test(e) ? 'Offsets: −7 / −3 / −1 days' : /nearing deadline/.test(e) ? '7 days before the deadline' : /consent expired/.test(e) ? 'After 7 days without a response' : 'Immediate';
const S5D_WIRED = { Announcement: 'Applies to every announcement (academy, agencies, teachers, coordinators, agencies to their learners)', 'Set-password / reset': 'Applies to agency set-password links' };
SCREENS['a-notifsettings'] = (p) => {
  const t = p.tab || 'catalogue', st = subtabs([['catalogue', 'Event catalogue'], ['log', 'Notification log']], t, 'a-notifsettings');
  if (t === 'log') return pageA('Notification Settings') + st + s5dLogView();
  const can = !s5dTplWhy(), dis = (e, c) => !can ? ` disabled title="${esc(s5dTplWhy())}"` : (S5D_MAND.includes(e) && (!c || c === 'Email')) ? ` disabled title="${esc(s5dTplLock(e))}"` : '';
  return pageA('Notification Settings') + st + `<div class="note b-blue">${ic('info')}<div class="small"><strong>What these settings do in the prototype:</strong> they are stored and versioned. They govern the announcement notifications and the agency set-password emails${''} — a turned-off event or channel is recorded as "Suppressed" in the notification log. Other events show their settings but keep their current messages for now. Nothing is sent by real email or SMS. Sign-in and account-recovery messages can't be turned off.</div></div>` + NEVENTS.map(([g, evs]) => `<section class="card"><h3>${g}</h3><div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Event</th><th>Enabled</th><th>Email</th><th>SMS</th><th>In-app</th><th>Recipients</th><th>Timing</th><th></th></tr></thead><tbody>${evs.map(e => { const T = s5dTpl(e); return `<tr><td>${e}${S5D_WIRED[e] ? `<div class="xs muted">${S5D_WIRED[e]}</div>` : ''}</td><td><span class="toggle"><input type="checkbox" role="switch" aria-label="${e} enabled" ${T.enabled ? 'checked' : ''} data-onchange="evToggle" data-e="${esc(e)}"${dis(e)}><span></span></span></td>${S5D_CH.map(c => `<td><input type="checkbox" aria-label="${e} ${c === 'In-app' ? 'in-app' : c}" ${T.ch[c] ? 'checked' : ''} data-onchange="s5dTplCh" data-e="${esc(e)}" data-c="${c}"${dis(e, c)}></td>`).join('')}<td class="small">${NREC[e] || ((g === 'Approvals' || g === 'System' ? 'Staff' : 'Learner') + (/Workplace/.test(e) ? ', workplace contact' : ''))}</td><td class="small">${S5D_TIMING(e)}</td><td><button class="btn btn-sm" data-act="tplEdit" data-e="${esc(e)}">Template</button>${T.v > 1 ? ` <span class="xs muted">v${T.v}</span>` : ''}</td></tr>`; }).join('')}</tbody></table></div></section>`).join('');
};
ACT.tplEdit = el => {
  const e = el.dataset.e, T = s5dTpl(e), can = !s5dTplWhy(), lock = s5dTplLock(e), ro = can ? '' : 'readonly';
  const sample = { learner_name: 'Aisha Rahman', course: 'Level 3 Diploma in Adult Care', date: fd(now().toISOString()), link: 'https://illumin-academy.example/…', title: 'Half-term class schedule', from: 'Illumin Academy', name: 'Helen', agency: 'Riverside Care Partners (demo)', expiry: fdt(new Date(now().getTime() + s5bLinkDays() * DAY).toISOString()), days: s5bLinkDays() };
  openModal({ title: 'Template — ' + esc(e), sub: `Version ${T.v}${T.enabled ? '' : ' · turned off'}`, size: 'lg', body: `${can ? '' : `<div class="note b-grey">${ic('lock')}<div class="small"><strong>Read only.</strong> ${esc(s5dTplWhy())}</div></div>`}${lock ? `<p class="small">${ic('lock', 14)} ${esc(lock)}</p>` : ''}<div class="field"><label for="tp-s">Subject</label><input class="input" id="tp-s" value="${esc(T.subject)}" ${ro}></div><div class="field"><label for="tp-b">Body</label><textarea class="textarea" id="tp-b" rows="6" ${ro}>${esc(T.body)}</textarea></div><p class="small">Merge fields: ${(T.fields || ['learner_name', 'course', 'date', 'link']).map(f => `<span class="code">{{${f}}}</span>`).join(' ')}</p>
    <div class="row"><label class="check small"><input type="checkbox" id="tp-on" ${T.enabled ? 'checked' : ''} ${lock || !can ? 'disabled' : ''}>Enabled</label>${S5D_CH.map(c => `<label class="check small"><input type="checkbox" class="tp-ch" value="${c}" ${T.ch[c] ? 'checked' : ''} ${!can || (lock && c === 'Email') ? 'disabled' : ''}>${c}</label>`).join('')}</div>
    <div class="field"><label for="tp-f">Frequency</label><select class="select" id="tp-f" ${can ? '' : 'disabled'}>${['Every occurrence', 'Daily digest', 'At most once per 24 hours'].map(f => `<option ${T.freq === f ? 'selected' : ''}>${f}</option>`).join('')}</select></div>
    <div class="card flat"><span class="eyebrow">Preview</span><p class="small"><strong>${esc(s5dMerge(T.subject, sample))}</strong></p><p class="small">${esc(s5dMerge(T.body, sample)).replace(/\n/g, '<br>')}</p></div>${S5D_WIRED[e] ? `<p class="xs muted">${S5D_WIRED[e]}. Messages already sent keep the version they were sent with.</p>` : '<p class="xs muted">Stored for this event; its messages aren\'t generated from the template yet in the prototype.</p>'}${typeof WP_TPLS !== 'undefined' && WP_TPLS.includes(e) ? tplAttSec(e) : ''}`,
    actions: [{ label: 'Send test to me', cls: 'btn', fn: () => { toast('Test recorded for ' + ADMIN.me.email + ' (simulated — nothing is sent).', 'info'); return false; } }].concat(can ? [{ label: 'Save template', cls: 'btn-primary', fn: () => {
      const ch = {}; $$('#modal-root .tp-ch').forEach(x => { ch[x.value] = x.checked; });
      const r = s5dTplSet(e, { subject: mval('#tp-s'), body: ($('#tp-b') || {}).value || '', enabled: lock ? true : !!($('#tp-on') || {}).checked, ch, freq: mval('#tp-f') });
      if (!r.ok) { if (r.errs) Object.entries(r.errs).forEach(([f, t]) => { const m = { subject: '#tp-s', body: '#tp-b' }[f]; if (m) fieldErr(m, t); else toast(t, 'err'); }); else toast(r.why + ' Attempt logged.', 'err'); return false; }
      render(); toast(`Template saved — version ${r.v}.`);
    } }] : [{ label: 'Close', cls: 'btn-primary' }]) });
};
// Template attachments: same permission as the templates
[['tplAttSample', ACT], ['tplAttRm', ACT], ['tplAttFile', INP]].forEach(([k, o]) => { const f = o[k]; if (!f) return; o[k] = (el, e) => { const w = s5dTplWhy(); if (w) return s5dDeny('Notification Settings', (el && el.dataset && el.dataset.e) || '—', 'change template attachments', w); return f(el, e); }; });
function s5dLogView() {
  const st = s5dStore(), seeded = (ADMIN.notifLog || []).map((n, k) => ({ id: 'seed-' + k, at: n.at, event: n.event, srcLabel: '—', toName: n.to, ch: n.ch, tpl: '—', result: `${n.status}${n.retries ? ` · ${n.retries} retries` : ''}${n.fallback ? ` · fallback ${n.fallback}` : ''}`, demo: true }));
  const rows = st.log.map(x => ({ ...x })).concat(seeded), tone = r => /^Suppressed/.test(r) ? 'amber' : /^Simulated/.test(r) ? 'blue' : /Failed/.test(r) ? 'red' : 'grey';
  return `<div class="note b-amber">${ic('info')}<div class="small"><strong>Simulated delivery.</strong> Records made this session show what the prototype generated: in-app copies, and email / SMS that would have been sent — nothing leaves the prototype. "Suppressed" means the template or channel is turned off. Seeded rows are demo records.</div></div>` + dt({ id: 'nlog', name: 'Notification log', rows, rid: x => x.id, search: x => [x.event, x.srcLabel, x.toName, x.to].join(' '), cols: [{ k: 'at', l: 'When', h: x => `<span class="small nowrap">${fdt(x.at)}</span>`, s: x => x.at, v: x => x.at }, { k: 'event', l: 'Event' }, { k: 'srcLabel', l: 'Source', h: x => `<span class="small">${esc(x.srcLabel || '—')}</span>`, v: x => x.srcLabel || '' }, { k: 'toName', l: 'Recipient', h: x => `<span class="small">${esc(x.toName || '—')}${x.to ? `<div class="xs mono muted">${esc(x.to)}</div>` : ''}</span>`, v: x => x.toName || '' }, { k: 'ch', l: 'Channel' }, { k: 'tpl', l: 'Template', h: x => `<span class="xs">${esc(x.tpl)}</span>`, v: x => x.tpl }, { k: 'result', l: 'Result', h: x => chip(x.result, tone(x.result)), v: x => x.result }, { k: 'demo', l: 'Record', h: x => x.demo ? '<span class="xs muted">Demo record (seeded)</span>' : '<span class="xs">This session</span>', v: x => x.demo ? 'Demo record' : 'This session' }],
    filters: [{ k: 'r', l: 'Result', get: x => /^Suppressed/.test(x.result) ? 'Suppressed' : /^Simulated/.test(x.result) ? 'Simulated' : 'Demo record', opts: ['Simulated', 'Suppressed', 'Demo record'] }, { k: 'c', l: 'Channel', get: x => x.ch }], empty: 'No notifications yet' });
}

/* ---------- Agency set-password emails: written from the template, with the link's own expiry ----------
   Each email is written when its link is issued, from the "Set-password / reset" template, with that link's stored expiry
   ({{expiry}}, {{days}}) — editing the template or the configured period later never changes an email already sent. */
function s5dStampMail(m) {
  if (!m || m.kind !== 'agency' || m.subj) return m;
  if (!m.expires) m.expires = new Date(new Date(m.sent).getTime() + s5bLinkDays() * DAY).toISOString();
  const T = s5dTpl('Set-password / reset'), days = Math.round((new Date(m.expires) - new Date(m.sent)) / DAY), v = { name: String(m.name || '').split(' ')[0] || m.name, agency: m.agency, expiry: fdt(m.expires), days };
  m.subj = s5dMerge(T.subject, v); m.tplV = T.v; m.by = 'Illumin Academy';
  m.html = s5dMerge(T.body, v).split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('') + ((m.att || []).length ? `<p class="small"><strong>Attachments:</strong> ${m.att.map(f => `${ic('clip2', 14)} <button class="linklike" data-act="wpcDoc" data-n="${esc(f)}">${esc(f)}</button>`).join(' ')}</p>` : '');
  m.btn = `<button class="btn btn-primary" data-act="lmSet" data-id="${esc(m.id)}">Set your password</button>`;
  s5dSend('Set-password / reset', 'link:' + m.id, 'Set-password link ' + m.id, { key: 'G:' + m.agencyId, type: 'agency', name: m.agency }, 'Email', null);
  return m;
}
const _s5bMailS5d = s5bMail; s5bMail = function () { return s5dStampMail(_s5bMailS5d.apply(this, arguments)); };
const _s5bMadeS5d = s5bMade; s5bMade = function (a) { const r = _s5bMadeS5d.apply(this, arguments); STORE.agy.lmails.filter(m => m.kind === 'agency' && m.agencyId === a.id).forEach(s5dStampMail); return r; };

/* ---------- Referral codes (S5-07) ----------
   D1 (accepted): referral codes record who introduced a learner — no commission, no checkout discount; the Referrals screen is for
   the Super Administrator, System Administrators and the Business Admin (generate, disable, extend, copy). S5-07 adds create with a
   unique code, re-enable, extend in the Super Admin view and edit type / owner while unused — each checked in the action. A code
   that has been used keeps its type and owner, so its attribution never changes. Codes never touch prices, discounts or VAT. */
const S5D_RTYPES = ['Agent', 'Agency', 'Welfare Buddy'];
function s5dRefWhy() {
  if (S.portal !== 'admin' || !S.signedIn || !ADMIN || !ADMIN.me || (typeof s5Ctx === 'function' && s5Ctx())) return 'Referral codes are managed by the Super Administrator, System Administrators and the Business Admin.';
  return isSA() || isSys() || isBiz() ? '' : 'Referral codes are managed by the Super Administrator, System Administrators and the Business Admin.';
}
const s5dRef = c => (ADMIN.referrals || []).find(r => r.code.toUpperCase() === String(c || '').trim().toUpperCase()) || null;
const s5dRefSt = r => r.status === 'Disabled' ? 'Disabled' : (r.valid && new Date(r.valid) <= now()) ? 'Expired' : 'Active';
const s5dRefUsed = r => (r.regs || 0) > 0 || allLearners().some(l => new RegExp('(^|[^A-Z0-9-])' + r.code.replace(/[-]/g, '\\-') + '($|[^A-Z0-9-])', 'i').test(l.referral || ''));
function s5dRefTouch(r) { if (r) s5dStore().refs[r.code] = s5dClone(r); }
const s5dDay = v => { const d = new Date(String(v || '') + (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? 'T12:00:00Z' : '')); return isNaN(d) ? null : d; };
function s5dRefOp(op, code, v, reason) {
  const r = op === 'create' ? null : s5dRef(code), what = { create: 'create a referral code', disable: 'disable ' + code, enable: 're-enable ' + code, extend: 'extend ' + code, edit: 'edit ' + code }[op] || 'change ' + code;
  let w = s5dRefWhy(); if (!w && op !== 'create' && !r) w = 'Referral code not found.';
  if (!w && r) {
    if (op === 'disable' && r.status === 'Disabled') w = 'This code is already disabled.';
    if (op === 'enable' && r.status !== 'Disabled') w = 'Only a disabled code can be re-enabled.';
    if (op === 'enable' && r.status === 'Disabled' && r.valid && new Date(r.valid) <= now()) w = 'Its validity has ended — extend it first, then re-enable it.';
    if (op === 'edit' && s5dRefUsed(r)) w = 'This code has been used, so its type and owner can\'t change (the learners it introduced keep their attribution).';
  }
  if (w) { s5dDeny('Referrals', r ? r.code : String(code || '—'), what, w, true); return { ok: false, why: w }; }
  const rs = s5dClean(reason), errs = {};
  if (op !== 'create' && !rs) errs.reason = 'Enter a reason';
  if (op === 'create' || op === 'edit') {
    if (!S5D_RTYPES.includes(v.type)) errs.type = 'Choose Agent, Agency or Welfare Buddy';
    const o = s5dClean(v.owner); if (!o) errs.owner = 'Enter the owner'; else if (o.length > 120) errs.owner = '120 characters at most';
    if (v.type === 'Agency' && o && !ADMIN.agencies.some(g => g.name === o)) errs.owner = 'For an Agency code, choose an existing agency';
  }
  if (op === 'create') {
    const c = s5dClean(v.code).toUpperCase();
    if (c && !/^[A-Z0-9][A-Z0-9-]{3,19}$/.test(c)) errs.code = '4–20 letters, numbers or hyphens';
    else if (c && s5dRef(c)) errs.code = 'This code already exists';
    const d = s5dDay(v.valid); if (!d) errs.valid = 'Choose the end date'; else if (d <= now()) errs.valid = 'Choose a date in the future';
  }
  if (op === 'extend') { const d = s5dDay(v.valid); if (!d) errs.valid = 'Choose the new end date'; else if (d <= now() || (r.valid && d <= new Date(r.valid))) errs.valid = 'Choose a date later than both today and the current end date'; }
  if (Object.keys(errs).length) { s5dAudit('Referrals', r ? r.code : (v.code || '—'), 'Blocked: ' + what, '—', '—', Object.values(errs).join('; ')); return { ok: false, errs }; }
  if (op === 'create') {
    let c = s5dClean(v.code).toUpperCase();
    if (!c) { const p = (s5dClean(v.owner).replace(/\(.*\)/, '').split(' ')[0] || 'REF').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'REF'; let n = 100 + ADMIN.referrals.length; do { c = `${p}-${n++}`; } while (s5dRef(c) || s5dStore().refs[c]); }
    const nr = { code: c, type: v.type, owner: s5dClean(v.owner), valid: s5dDay(v.valid).toISOString(), status: 'Active', regs: 0, created: now().toISOString(), by: ADMIN.me.name };
    ADMIN.referrals.unshift(nr); s5dRefTouch(nr);
    logA('Referrals', c, 'Code created', '—', `${nr.type} · ${nr.owner} · valid until ${fd(nr.valid)}`, rs);
    return { ok: true, r: nr };
  }
  const before = `${r.type} · ${r.owner} · ${s5dRefSt(r)} · valid until ${fd(r.valid)}`;
  if (op === 'disable') r.status = 'Disabled';
  if (op === 'enable') r.status = 'Active';
  if (op === 'extend') { r.valid = s5dDay(v.valid).toISOString(); if (r.status === 'Expired') r.status = 'Active'; }
  if (op === 'edit') { r.type = v.type; r.owner = s5dClean(v.owner); }
  s5dRefTouch(r);
  logA('Referrals', r.code, { disable: 'Disabled', enable: 'Re-enabled', extend: 'Validity extended', edit: 'Type / owner edited (unused code)' }[op], before, `${r.type} · ${r.owner} · ${s5dRefSt(r)} · valid until ${fd(r.valid)}`, rs);
  return { ok: true, r };
}
const s5dRefActs = r => { if (s5dRefWhy()) return `<button class="btn btn-sm" data-act="aCopyRef" data-c="${r.code}">Copy link</button>`; const s = s5dRefSt(r), b = (a, l) => ` <button class="btn btn-sm" data-act="${a}" data-c="${r.code}">${l}</button>`;
  return `<button class="btn btn-sm" data-act="aCopyRef" data-c="${r.code}">Copy link</button>${isBiz() ? b('bRefQr', 'QR') : ''}${s !== 'Disabled' ? b('disableRef', 'Disable') : ''}${r.status === 'Disabled' && s5dDay(r.valid) > now() ? b('s5dRefEnable', 'Re-enable') : ''}${b('bRefExtend', 'Extend')}${!s5dRefUsed(r) ? b('s5dRefEdit', 'Edit') : ''}${b('s5dRefHist', 'History')}`; };
function s5dRefTable(id) {
  return dt({ id, name: 'Referral codes', rows: ADMIN.referrals, rid: r => r.code, search: r => r.code + ' ' + r.owner, filters: [{ k: 't', l: 'Type', get: r => r.type, opts: S5D_RTYPES }, { k: 's', l: 'Status', get: s5dRefSt, opts: ['Active', 'Expired', 'Disabled'] }, { k: 'u', l: 'Use', get: r => s5dRefUsed(r) ? 'Used' : 'Unused', opts: ['Used', 'Unused'] }],
    cols: [{ k: 'code', l: 'Code', h: r => `<span class="code">${r.code}</span>` }, { k: 'type', l: 'Type' }, { k: 'owner', l: 'Owner' }, { k: 'valid', l: 'Valid until', h: r => fd(r.valid), s: r => r.valid }, { k: 'status', l: 'Status', h: r => chip(s5dRefSt(r), { Active: 'green', Expired: 'grey', Disabled: 'red' }[s5dRefSt(r)]), v: s5dRefSt }, { k: 'regs', l: 'Registrations', r: 1 }, { k: 'used', l: 'Used', h: r => s5dRefUsed(r) ? 'Used' : '<span class="muted">Unused</span>', v: r => s5dRefUsed(r) ? 'Used' : 'Unused' }],
    act: s5dRefActs });
}
const _refS5d = SCREENS['a-referrals'];
SCREENS['a-referrals'] = (p) => {
  const t = p.tab || 'codes'; if (t === 'attribution') return _refS5d(p);
  const can = !s5dRefWhy(), line = '<p class="small">Referral codes record who introduced a learner. Agents and Welfare Buddies receive no payment; agency savings come from bundle pricing at checkout.</p>', gen = can ? `<button class="btn btn-primary" data-act="newRef">${ic('plus', 15)}Generate code</button>` : '';
  const rules = `<p class="xs muted">A code can be edited (type and owner) only while it is unused; once used, its attribution is fixed. Disabled codes can be re-enabled while their validity lasts; extend first if it has ended. Codes never change a price, a discount or VAT.</p>`;
  if (isBiz()) return pageA('Referrals & Attribution', '', gen) + `<p class="small"> · Referral codes record who introduced a learner. Agents and Welfare Buddies receive no payment; agency savings come from bundle pricing at checkout.</p>` + subtabs([['codes', 'Codes'], ['attribution', 'Attributed learners']], 'codes', 'a-referrals') + rules + s5dRefTable('brefs');
  return pageA('Referrals') + line + subtabs([['codes', 'Referral codes'], ['attribution', 'Attribution']], 'codes', 'a-referrals') + rules + s5dRefTable('refs') + gen;
};
const s5dRefForm = (r, create) => `${create ? `<div class="field"><label for="rf-c">Code (optional)</label><input class="input" id="rf-c" placeholder="Generated if left empty"><span class="hint">4–20 letters, numbers or hyphens; must be unique.</span></div>` : ''}<div class="field"><label for="rf-t">Type</label><select class="select" id="rf-t">${S5D_RTYPES.map(x => `<option ${r && r.type === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div><div class="field"><label for="rf-o">Owner</label><input class="input" id="rf-o" value="${esc(r ? r.owner : '')}"><span class="hint">For an Agency code, the agency's name.</span></div>${create ? `<div class="field"><label for="rf-v">Valid until</label><input class="input" type="date" id="rf-v" value="${D(365).slice(0, 10)}"></div>` : ''}`;
const s5dRefErr = (res, map) => { if (res.errs) Object.entries(res.errs).forEach(([f, t]) => map[f] ? fieldErr(map[f], t) : toast(t, 'err')); else toast(res.why + ' Attempt logged.', 'err'); return false; };
ACT.newRef = () => { const w = s5dRefWhy(); if (w) return s5dDeny('Referrals', '—', 'create a referral code', w);
  openModal({ title: 'Generate referral code', body: s5dRefForm(null, true), actions: [{ label: 'Cancel' }, { label: 'Generate', cls: 'btn-primary', fn: () => { const res = s5dRefOp('create', null, { code: mval('#rf-c'), type: mval('#rf-t'), owner: mval('#rf-o'), valid: mval('#rf-v') }, ''); if (!res.ok) return s5dRefErr(res, { code: '#rf-c', type: '#rf-t', owner: '#rf-o', valid: '#rf-v' }); render(); toast('Code ' + res.r.code + ' generated.'); } }] }); };
const s5dRefDlg = (op, title, okL, extra, val) => el => { const c = el.dataset.c;
  const r = s5dRef(c), w = s5dRefWhy() || (!r ? 'Referral code not found.' : '');
  if (w) return s5dDeny('Referrals', c || '—', title.toLowerCase() + ' ' + (c || ''), w);
  reasonDlg({ title: `${title} — ${esc(c)}`, ok: okL, extra: extra ? extra(r) : '', onOk: rs => { const res = s5dRefOp(op, c, val ? val() : {}, rs); if (!res.ok) return s5dRefErr(res, { valid: '#re-v', type: '#rf-t', owner: '#rf-o' }); render(); toast({ disable: 'Code disabled.', enable: 'Code re-enabled.', extend: 'Validity extended.', edit: 'Code updated.' }[op]); } }); };
ACT.disableRef = s5dRefDlg('disable', 'Disable', 'Disable');
ACT.s5dRefEnable = s5dRefDlg('enable', 'Re-enable', 'Re-enable', r => `<p class="small">The code works again until ${fd(r.valid)}.</p>`);
ACT.bRefExtend = s5dRefDlg('extend', 'Extend validity', 'Extend', r => `<p class="small">Currently valid until ${fd(r.valid)}.</p><div class="field"><label for="re-v">New end date</label><input class="input" type="date" id="re-v" value="${new Date(Math.max(new Date(r.valid).getTime(), now().getTime()) + 365 * DAY).toISOString().slice(0, 10)}"></div>`, () => ({ valid: mval('#re-v') }));
ACT.s5dRefEdit = s5dRefDlg('edit', 'Edit referral code', 'Save', r => s5dRefForm(r, false), () => ({ type: mval('#rf-t'), owner: mval('#rf-o') }));
ACT.s5dRefHist = el => { const r = s5dRef(el.dataset.c); if (!r) return; const rows = ADMIN.audit.filter(a => a.module === 'Referrals' && a.entity === r.code), L = allLearners().filter(l => (l.referral || '').toUpperCase().includes(r.code.toUpperCase()));
  openModal({ title: 'History — ' + esc(r.code), size: 'lg', body: `<dl class="kv"><dt>Type</dt><dd>${esc(r.type)}</dd><dt>Owner</dt><dd>${esc(r.owner)}</dd><dt>Status</dt><dd>${chip(s5dRefSt(r))}</dd><dt>Valid until</dt><dd>${fd(r.valid)}</dd><dt>Registrations</dt><dd>${r.regs || 0}${L.length ? ` · ${L.map(l => esc(l.name)).join(', ')}` : ''}</dd></dl>${rows.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>When</th><th>Who</th><th>What</th><th>Before → after</th><th>Reason</th></tr></thead><tbody>${rows.map(a => `<tr><td class="small nowrap">${fdt(a.at)}</td><td class="small">${esc(a.actor)}</td><td class="small">${esc(a.action)}</td><td class="small">${esc(a.before)} → ${esc(a.after)}</td><td class="small">${esc(a.reason || '')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">No changes recorded this session.</p>'}`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); };

/* ---------- Seeded records and persistence ---------- */
function s5dNormSeeds() {
  // The Business Admin's seeded announcement BA-1 is mirrored in the academy list as "AN-BA1", but every other mirror is
  // "AN-" + its BA ID, so withdrawing BA-1 never reached it. The mirror keeps its content, sender and date; its ID is corrected.
  const m = ADMIN.announcements.find(a => a.id === 'AN-BA1');
  if (m && STORE.biz && STORE.biz.anns.some(b => b.id === 'BA-1')) { m.id = 'AN-BA-1'; m.srcK = 'biz'; m.srcId = 'BA-1'; m.hist = [[m.at, 'Prototype data', 'Mirror ID corrected', 'AN-BA1 → AN-BA-1 — the academy-list copy of BA-1, like every other announcement to agencies']]; }
  // AN-02 is the academy-list copy of Marcus Bell's TA-1 (same title, sender, cohort and date)
  const t = ADMIN.announcements.find(a => a.id === 'AN-02'), ta = STORE.tas && STORE.tas.anns.find(a => a.id === 'TA-1');
  if (t && ta && t.title === ta.title && !t.srcK) { t.srcK = 'teacher'; t.srcId = 'TA-1'; }
  // The learners' seeded copies of AN-01, TA-1 and AN-05 are linked to their sources, so a withdrawal reaches them
  const link = { n1: ['academy:AN-01', 'Academy closed 25–26 December'], n2: ['teacher:TA-1', 'Unit 306 class recording uploaded'], n5: ['academy:AN-05', 'Planned maintenance — 14 September'] };
  Object.values(STORE.worlds || {}).forEach(w => (w && w.announcements || []).forEach(x => { const l = link[x.id]; if (l && !x.src && x.title === l[1]) x.src = l[0]; }));
}
function s5dReplay() {
  if (!ADMIN || !ADMIN.announcements) return; const st = s5dStore();
  Object.keys(st.anns).forEach(k => Object.values(st.anns[k]).forEach(r => { const L = S5D_K[k].list(); if (!L) return; const i = L.findIndex(a => a.id === r.id), c = s5dClone(r); if (i >= 0) L[i] = c; else L.unshift(c); }));
  ADMIN.tplAtt = st.tplAtt;
  Object.values(st.refs).forEach(r => { const i = ADMIN.referrals.findIndex(x => x.code === r.code), c = s5dClone(r); if (i >= 0) ADMIN.referrals[i] = c; else ADMIN.referrals.unshift(c); });
  if (STORE.agy && STORE.agy.lmails) STORE.agy.lmails.forEach(s5dStampMail);
  if (ADMIN.audit && st.audit.length) { const have = new Set(ADMIN.audit.map(a => a.id)), add = st.audit.filter(a => !have.has(a.id)); if (add.length) ADMIN.audit = ADMIN.audit.concat(add).sort((x, y) => String(y.at).localeCompare(String(x.at))); }
}
const _isS5d = initStore; initStore = function () { STORE.s5d = null; S.s5dEd = null; return _isS5d.apply(this, arguments); };
const _baS5d = buildAdmin; buildAdmin = function () { const r = _baS5d.apply(this, arguments); s5dNormSeeds(); s5dReplay(); return r; };
if (typeof ADMIN !== 'undefined' && ADMIN) { s5dNormSeeds(); s5dReplay(); }

/* ---------- Records ---------- */
UXC.push(['Setup S5d', 'Setup fixes — announcements, notification templates and referral codes (S5-04, S5-05, S5-07)', [
  'Information exposure fixed first. Agency "From the Academy" listed every announcement whose audience text contained "Agenc" plus every "Agency administrators" item whatever its status — the Draft AN-04 reached every agency, and an announcement to one agency\'s learners was shown to all agencies. The feed now reads one rule: published, dated now or earlier, and addressed to everyone, to all agencies or to that agency by ID. Drafts, scheduled, withdrawn, expired and other agencies\' announcements never appear. Teachers: the default teacher (Sarah Okonkwo) saw — and could withdraw — every teacher\'s announcements; each teacher now sees and manages only their own, checked in every action (also by a direct call and after an identity change).',
  'Business Admin mirror ID: BA-1 was copied to the academy list as "AN-BA1", while every other announcement to agencies is copied as "AN-" + its ID, so withdrawing BA-1 never reached the copy. It is now AN-BA-1 (same content, sender and date; the correction is in its history), and every change to an announcement to agencies updates its copy.',
  'S5-04 lifecycle, one engine for the five existing announcement lists (academy, to agencies, agency to its learners, teacher, coordinator — no new store): create a draft; reopen it with its content; edit and save it as the same announcement (same ID, no duplicate); publish; schedule for a date and time; cancel a schedule (back to draft); withdraw a published or scheduled announcement; expire (academy). Each change has history (who, when, what, reason) and an audit row. "Open" shows the content, audience, recipients, channels, history and delivery records. Attachments (PDF, DOCX, PNG, JPG; up to 5) are kept on the announcement and shown to learners.',
  'Withdrawal is authoritative: the announcement leaves every learner\'s announcement list and every agency feed at once (the copies are kept in the learner\'s archive, and delivery records and notifications already sent stay as history). The seeded learner copies of AN-01, TA-1 / AN-02 and AN-05 are linked to their sources so this works for them too.',
  'Scheduling: a scheduled announcement stays hidden until its time, then is published once — with its recipients, copies and delivery records — the next time the prototype draws a screen (agency announcements follow the agency clock, so "Advance 30 days" applies). There is no background service: nothing is published while the prototype is closed. The status and a delivered stamp make every later evaluation do nothing, so reopening screens never publishes or notifies twice.',
  'Audiences resolve to real people by stable ID — learners by learner ID, staff by staff ID, agencies by agency ID — and each person gets one copy however many chosen roles or batches include them. Academy (Super / System Admin, Academic Admin): all users, all learners, all staff, staff with chosen roles (for example Assessors — active staff who hold the role), learners in chosen batches, chosen agencies, all active agencies, or an agency\'s learners. Academic Admin: the same academy audiences, managing their own announcements. Business Admin: all active agencies or chosen ones. Agency: its own learners (all, a course, chosen). Teacher: their own cohorts. Coordinator: their own batches. The choices offered are the sender\'s own; anything else sent by a direct call is refused. The recipient count is the number of resolved people, shown before sending and stored when published (it replaced fixed numbers such as "14").',
  'Who can do what (checked when the action runs): academy-wide — Super Administrator and System Administrators (Announcements: all capabilities), and Academic Admins for their own announcements. Announcements to agencies — Business Admin and the Super Admin. Cohorts — Teachers and Academic Coordinators, their own. Agencies — their own learners, not when receive-only or when the login can\'t sign in. Others, and anyone managing someone else\'s own announcement, are refused; nothing changes and the attempt goes to the security log and the audit. Notification templates — Super Administrator and System Administrators.',
  'Correction against the client roles document (Roles and Permissions — Tick to Confirm): Academic Admin → Communications has "Academy-wide announcements" ticked ("Announcements to own cohorts" unticked). The first S5d build limited Academic Admins to their own announcements to chosen batches; they now use the same academy workflow and audiences as the Super / System Admin — create, edit, schedule, publish and withdraw — for the announcements they create. Managing other people\'s academy announcements, and the academy copies of teacher, Coordinator, agency or Business Admin announcements, is not part of that grant and stays where it was. This applies the documented permission; it is not a new policy.',
  'S5-05 templates: subject, body, on / off, channels (email, SMS, in-app), frequency and attachments (where the existing model has them — workplace events) are stored, versioned and audited, and survive navigation, identity switches and admin rebuilds. The "Announcement" template governs every announcement notification (its subject and body are used; off, or a channel off, records the send as "Suppressed"), and "Set-password / reset" writes the agency set-password emails. Sign-in and account-recovery messages (registration verification, welcome / activation, set-password / reset) can\'t be turned off or lose email — no policy allows that. Other events keep their current messages for now (their settings are stored).',
  'Agency set-password emails (the S5b follow-up): each email is now written when its link is issued, from the template, with that link\'s own stored expiry date and period — "expires on <date> (N days after it was sent)". Changing the configured period affects new links only; earlier emails and links keep their original expiry; editing the template never moves an expiry. S5b\'s link checks (expiry, used, superseded) are unchanged.',
  'Delivery log: Notification Settings → Notification log now lists one record per recipient and channel for every wired send — source (announcement or link ID), recipient ID, channel, template and version, time and result: "Simulated — shown in the portal", "Simulated — not sent (prototype)" for email and SMS, or "Suppressed" (template or channel off). Nothing claims real delivery. The same send is never recorded twice. Seeded rows are labelled demo records.',
  'S5-07 referral codes (D1: attribution only — no commission, no checkout discount): Super Admin, System Admins and the Business Admin can create a code (optional custom code, unique; type; owner — an existing agency for Agency codes; end date in the future), disable it, re-enable a disabled code while its validity lasts, extend its validity (now also in the Super Admin view; the new date must be later than today and the current end date) and edit type and owner while it is unused. A used code (registrations or attributed learners) keeps its type and owner. Every change is audited and shown in the code\'s History. Prices, discounts, VAT, purchases and enrolment fees are unchanged.',
  'Persistence: announcements (all five lists, with mirrors), templates and their attachments, the delivery log, referral codes and these audit rows are kept in the prototype store and put back after each admin rebuild — same IDs, no duplicates. Learners\' copies live with the learners and survive rebuilds. Only the deliberate demo reset restores the seed.',
  'Open (to confirm): Business Admin — the matrix lists Announcements: View, Edit; used for announcements to agencies (create included, as the existing screen did), not academy-wide. Turning off sign-in and account-recovery messages needs a policy. Gaps: staff have no in-app announcement inbox (their sends are recorded in the log only); notifications other than announcements and agency set-password emails aren\'t generated from templates yet; scheduled announcements publish only while the prototype is open. Tracked for S5e: the agency store (purchases, assignments, ledger, notifications, demo clock), the bundle catalogue, Finance ledger and the security log are still re-created by an admin rebuild.']]);
const _aIdxS5d = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxS5d(p).replace(/(<section class="card idx-sec"><h2>Setup fixes<\/h2><ul class="idx-list">)/, `$1${chIdxLi('Announcements · Notification Settings · Referrals', { act: 'aJump', t: 'a-announcements' }, 'S5d — agency and teacher visibility fixed, drafts edited in place, scheduling, authoritative withdrawal, real audiences, stored templates, delivery log, referral code lifecycle.')}`);
// S5b's agency-rename check looks for live references to the name; STORE.s5d only holds copies of records kept in their own
// stores (already checked) and delivery history (recipient names), so it isn't a reference
const _s5bNameRefS5d = s5bNameRefWhy;
s5bNameRefWhy = function () { const keep = STORE.s5d; delete STORE.s5d; try { return _s5bNameRefS5d.apply(this, arguments); } finally { STORE.s5d = keep; } };
