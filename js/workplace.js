/* Workplace Contact link pages — no account, no login. Public, mobile-first pages reached by secure time-limited links
   ("w-" routes, token only in the URL) plus a demo inbox of every email the system "sent" to workplace contacts.
   Links and emails are reconciled from the shared store, so learner resends, assessor reschedules and cancellations
   produce the matching emails automatically. */
'use strict';

const WPC_TZ_LABEL = { 'Asia/Dubai': 'GST' };
const wNow = () => new Date(now().getTime() + ((STORE.wpc && STORE.wpc.offset) || 0) * DAY);
const wIso = () => wNow().toISOString();
function wfmt(iso, tz = 'Europe/London', time = true) {
  const d = new Date(iso), o = { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
  const base = new Intl.DateTimeFormat('en-GB', o).format(d).replace(/,/g, '');
  if (!time) return base;
  const t = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
  const z = WPC_TZ_LABEL[tz] || (new Intl.DateTimeFormat('en-GB', { timeZone: tz, timeZoneName: 'short' }).formatToParts(d).find(p => p.type === 'timeZoneName') || {}).value || '';
  return `${base}, ${t} ${z}`;
}
const wTok = key => (hashN(key) >>> 0).toString(16).padStart(8, '0') + (hashN(key + '#') >>> 0).toString(16).slice(0, 4);
const WPC_IP = ['86.14.203.77', '81.98.12.140', '94.204.18.61'];

/* ---------- Store: links + emails ---------- */
function wpcPatch() {
  if (!STORE.worlds || (STORE.wpc && STORE.wpc._built === STORE.worlds)) return;
  const W_ = STORE.wpc = { _built: STORE.worlds, links: [], emails: [], offset: 0, failNext: false, drafts: {}, notes: {} };
  const C = STORE.worlds.C, Dw = STORE.worlds.D, cw = C.workplace, dw = Dw.workplace;
  const ctc = (wp, extra = {}) => ({ name: wp.cname, title: wp.ctitle, email: wp.cemail, phone: wp.cphone, ...extra });
  const L = n => (ADMIN && ADMIN.learners.find(l => l.name === n)) || { id: '—', name: n };
  const link = o => { const l = { tz: 'Europe/London', status: 'Active', assessor: null, ...o, token: wTok(o.key) }; W_.links.push(l); return l; };
  const mail = (kind, l, sent, extra = {}) => W_.emails.push({ id: 'EM-' + (100 + W_.emails.length), kind, token: l ? l.token : null, to: l.contact, home: l.home, learner: l.learner, sent, tz: l.tz, ...extra, lkey: l.key });
  const L3 = 'Level 3 Diploma in Adult Care (England)', L2 = 'Level 2 Diploma in Care (England)';
  // Aisha (C) — Willowbrook: permission Granted (link Used), observation flows
  const cBase = { v: 'C', learner: VNAME('C'), lid: C.me.id, qual: C.nvq.title, home: cw.name, address: cw.address + ', ' + cw.postcode, contact: ctc(cw), assessor: 'James Pryce' };
  const cp = link({ ...cBase, key: 'C:perm:seed', kind: 'perm', sent: D(-247), expires: D(-240), status: 'Used', used: { decision: 'Granted', at: cw.grantedAt, name: cw.grantedBy, title: cw.ctitle, ip: WPC_IP[0] } });
  mail('permRequest', cp, D(-247)); mail('receipt', cp, cw.grantedAt);
  const o1 = C.observations.find(o => o.id === 'o1'), o2 = C.observations.find(o => o.id === 'o2'), o4 = C.observations.find(o => o.id === 'o4');
  const oldAt = D(6, '10:00');
  const s1 = link({ ...cBase, key: 'C:obs:o1:' + oldAt, kind: 'obs', oid: 'o1', at: oldAt, sent: D(-5, '09:00'), expires: D(5), status: 'Superseded' });
  mail('obsProposed', s1, D(-5, '09:00'), { at: oldAt });
  const a1 = link({ ...cBase, key: 'C:obs:o1:' + o1.at, kind: 'obs', oid: 'o1', at: o1.at, sent: D(-2, '11:30'), expires: new Date(new Date(o1.at).getTime() - DAY).toISOString(), revised: { oldAt, reason: 'The assessor has a training day on the original date.' } });
  mail('obsRevised', a1, D(-2, '11:30'), { at: o1.at, oldAt });
  const l2 = link({ ...cBase, key: 'C:obs:o2:' + o2.at, kind: 'obs', oid: 'o2', at: o2.at, sent: D(-6, '10:00'), expires: D(2), status: 'Answered', learnerResp: { at: D(-3, '19:20'), outcome: 'Accepted' } });
  mail('obsProposed', l2, D(-6, '10:00'), { at: o2.at }); mail('obsConfirmed', link({ ...cBase, key: 'C:conf:o2', kind: 'info', info: 'confirmed', oid: 'o2', at: o2.at, sent: D(-3, '19:21'), expires: D(30) }), D(-3, '19:21'), { at: o2.at });
  const l4 = link({ ...cBase, key: 'C:obs:o4:' + o4.at, kind: 'obs', oid: 'o4', at: o4.at, sent: D(-30, '09:00'), expires: D(-21), status: 'Used', used: { decision: 'Accepted', at: D(-27, '14:05'), name: cw.cname } });
  mail('obsProposed', l4, D(-30, '09:00'), { at: o4.at }); mail('obsConfirmed', link({ ...cBase, key: 'C:conf:o4', kind: 'info', info: 'confirmed', oid: 'o4', at: o4.at, sent: D(-27, '14:06'), expires: D(-20) }), D(-27, '14:06'), { at: o4.at });
  mail('obsCancelled', link({ ...cBase, key: 'C:cancel:o4', kind: 'info', info: 'cancelled', oid: 'o4', at: o4.at, sent: D(-21, '08:00'), expires: D(30), reason: 'The assessor is unwell.' }), D(-21, '08:00'), { at: o4.at, reason: 'The assessor is unwell.' });
  // Grace (D) — Addington Court: earlier link superseded (email corrected), current link active with reminder sent
  const dBase = { v: 'D', learner: VNAME('D'), lid: Dw.me.id, qual: Dw.nvq.title, home: dw.name, address: dw.address + ', ' + dw.postcode, assessor: 'James Pryce' };
  const d0 = link({ ...dBase, key: 'D:perm:old', kind: 'perm', contact: ctc(dw, { email: 'd.frazer@addingtoncourt.co.uk' }), sent: D(-9, '20:15'), expires: D(-2), status: 'Superseded', supReason: 'details' });
  mail('permRequest', d0, D(-9, '20:15'));
  const d1 = link({ ...dBase, key: 'D:perm:' + dw.sent, kind: 'perm', contact: ctc(dw), sent: dw.sent, expires: dw.expiry, reminded: D(-2, '09:00') });
  mail('permRequest', d1, dw.sent); mail('permReminder', d1, D(-2, '09:00'));
  // Caseload learners (no learner-portal login in the demo): Active · Expired → escalated · Declined · Granted
  const ext = (name, home, addr, contact, qual, extra) => ({ learner: name, lid: L(name).id, qual, home, address: addr, contact, assessor: 'Sarah Okonkwo', ...extra });
  const lf = link({ ...ext('Leah Fernandes', 'Al Noor Home Care', 'Villa 14, Al Wasl Road, Dubai', { name: 'Ms Mariam Haddad', title: 'Manager', email: 'mariam.haddad@alnoorcare.ae', phone: '+971 4 555 0192' }, L3, { assessor: 'Omar Siddiqui', tz: 'Asia/Dubai' }), key: 'X:perm:leah', kind: 'perm', sent: D(-1, '06:30'), expires: D(6, '06:30') });
  mail('permRequest', lf, D(-1, '06:30'));
  const im = link({ ...ext('Isla Morgan', 'Oak Tree Care', '22 Church Lane, Leeds LS6 2AB', { name: 'Mr Graham Pike', title: 'Coordinator', email: 'g.pike@oaktreecare.co.uk', phone: '0113 496 0441' }, L3), key: 'X:perm:isla', kind: 'perm', sent: D(-20, '10:00'), expires: D(-13, '10:00'), status: 'Expired', reminded: D(-15, '09:00'), escalated: D(-13, '10:05') });
  mail('permRequest', im, D(-20, '10:00')); mail('permReminder', im, D(-15, '09:00'));
  const ep = link({ ...ext('Ethan Parker', 'Rosewood Lodge', '9 Hill Street, Bristol BS7 8QT', { name: 'Mrs Helen Shaw', title: 'Manager', email: 'helen.shaw@rosewoodlodge.co.uk', phone: '0117 496 0283' }, L2), key: 'X:perm:ethan', kind: 'perm', sent: D(-12, '11:00'), expires: D(-5, '11:00'), status: 'Used', used: { decision: 'Declined', at: D(-10, '15:40'), name: 'Mrs Helen Shaw', reason: 'Not a suitable time', note: 'We are in a CQC inspection period — please try again after 1 November.', ip: WPC_IP[1] } });
  mail('permRequest', ep, D(-12, '11:00')); mail('receipt', ep, D(-10, '15:41'));
  const ka = link({ ...ext('Kofi Asante', 'Meadowview Care Home', '4 Elm Road, Leeds LS6 2AB', { name: 'Mr Peter Lowe', title: 'Manager', email: 'p.lowe@meadowviewcare.co.uk', phone: '0113 496 0870' }, L3), key: 'X:perm:kofi', kind: 'perm', sent: D(-70, '09:00'), expires: D(-63), status: 'Used', used: { decision: 'Granted', at: D(-69, '12:10'), name: 'Mr Peter Lowe', title: 'Manager', ip: WPC_IP[2] } });
  mail('permRequest', ka, D(-70, '09:00')); mail('receipt', ka, D(-69, '12:11'));
  W_.notes = { 'D': 'Called Mr Fraser 3 Oct — voicemail', 'Ethan Parker': 'Inspection period' };
}
const _isW = initStore; initStore = function () { _isW(); wpcPatch(); };
const wLink = tok => STORE.wpc.links.find(l => l.token === tok);
const wLinkByKey = key => STORE.wpc.links.find(l => l.key === key);
const wObs = l => l.v && l.oid ? STORE.worlds[l.v].observations.find(o => o.id === l.oid) : null;
function wMail(kind, l, extra = {}) { STORE.wpc.emails.unshift({ id: 'EM-' + (100 + STORE.wpc.emails.length), kind, token: l ? l.token : null, to: l.contact, home: l.home, learner: l.learner, sent: wIso(), tz: l.tz, lkey: l.key, ...extra }); }
function wNewLink(o) { const l = { tz: 'Europe/London', status: 'Active', ...o, token: wTok(o.key) }; STORE.wpc.links.push(l); return l; }

/* Reconcile links/emails with the shared learner + observation data (learner resends, assessor reschedules/cancels, learner responds first) */
function wpcSync() {
  if (!STORE.wpc) return;
  ['C', 'D'].forEach(v => {
    const w = STORE.worlds[v]; if (!w || !w.workplace || !w.flags.admitted) return;
    const wp = w.workplace, base = { v, learner: VNAME(v), lid: w.me.id, qual: w.nvq.title, home: wp.name, address: wp.address + ', ' + wp.postcode, contact: { name: wp.cname, title: wp.ctitle, email: wp.cemail, phone: wp.cphone }, assessor: 'James Pryce' };
    if (wp.perm === 'Permission Pending') {
      const key = v + ':perm:' + wp.sent;
      if (!wLinkByKey(key)) {
        const prev = STORE.wpc.links.filter(l => l.v === v && l.kind === 'perm' && l.status === 'Active');
        const changedHome = prev.some(l => l.home !== wp.name);
        prev.forEach(l => { l.status = 'Superseded'; l.supReason = changedHome ? 'workplace' : 'details'; });
        const nl = wNewLink({ ...base, key, kind: 'perm', sent: wIso(), expires: new Date(wNow().getTime() + 7 * DAY).toISOString() });
        wp.expiry = nl.expires; wMail('permRequest', nl);
      }
    }
    w.observations.filter(o => o.status === 'Rescheduled').forEach(o => STORE.wpc.links.filter(l => l.v === v && l.kind === 'obs' && l.oid === o.id && l.status === 'Active').forEach(l => { l.status = 'Superseded'; (STORE.wpc.revise = STORE.wpc.revise || {})[v] = { obs: o, oldAt: l.at, reason: (o.reason || '').replace(/^Rescheduled by [^:]*: ?/, '') || 'The assessor has updated the date.' }; }));
    w.observations.forEach(o => {
      const obsLinks = STORE.wpc.links.filter(l => l.v === v && l.kind === 'obs' && l.oid === o.id);
      if (o.status === 'Proposed' && wp.perm === 'Granted' && !o.alt && o.locType !== 'office') {
        const key = v + ':obs:' + o.id + ':' + o.at;
        if (!wLinkByKey(key)) {
          let prev = obsLinks.filter(l => ['Active', 'Used', 'Answered'].includes(l.status)).sort((a, b) => b.sent > a.sent ? 1 : -1)[0];
          const rv = !prev && STORE.wpc.revise && STORE.wpc.revise[v]; if (rv) { prev = { at: rv.oldAt }; if (rv.obs && !rv.obs.newAt) rv.obs.newAt = o.at; o.reviseReason = o.reviseReason || rv.reason; delete STORE.wpc.revise[v]; }
          obsLinks.filter(l => l.status === 'Active').forEach(l => l.status = 'Superseded');
          const nl = wNewLink({ ...base, key, kind: 'obs', oid: o.id, at: o.at, assessor: o.assessor, sent: wIso(), expires: new Date(Math.max(wNow().getTime() + DAY, new Date(o.at).getTime() - DAY)).toISOString(), revised: prev ? { oldAt: prev.at, reason: o.reviseReason || 'The assessor has updated the date.' } : null });
          wMail(prev ? 'obsRevised' : 'obsProposed', nl, { at: o.at, oldAt: prev ? prev.at : null });
        }
      }
      // learner responded first → workplace link shows "already answered"
      obsLinks.filter(l => l.status === 'Active' && (o.status !== 'Proposed' || o.alt) && o.status !== 'Cancelled').forEach(l => { l.status = 'Answered'; l.learnerResp = { at: wIso(), outcome: o.status === 'Confirmed' ? 'Accepted' : 'Alternative proposed' }; });
      if (o.status === 'Confirmed' && obsLinks.length && !wLinkByKey(v + ':conf:' + o.id)) { const nl = wNewLink({ ...base, key: v + ':conf:' + o.id, kind: 'info', info: 'confirmed', oid: o.id, at: o.at, assessor: o.assessor, sent: wIso(), expires: new Date(new Date(o.at).getTime() + 30 * DAY).toISOString() }); wMail('obsConfirmed', nl, { at: o.at }); }
      if (o.status === 'Cancelled' && obsLinks.length && wLinkByKey(v + ':conf:' + o.id) && !wLinkByKey(v + ':cancel:' + o.id)) { const r = (o.reason || '').replace(/^Cancelled by [^:]*: ?/, '') || 'The visit could not go ahead.'; const nl = wNewLink({ ...base, key: v + ':cancel:' + o.id, kind: 'info', info: 'cancelled', oid: o.id, at: o.at, assessor: o.assessor, sent: wIso(), expires: new Date(wNow().getTime() + 30 * DAY).toISOString(), reason: r }); wMail('obsCancelled', nl, { at: o.at, reason: r }); }
    });
  });
}

/* Token state (§5) */
function wState(l) {
  if (!l) return 'invalid';
  if (l.status === 'Superseded') return 'superseded';
  if (l.kind === 'obs') { const o = wObs(l); if (o && o.status === 'Cancelled' && l.status !== 'Used') return 'cancelled'; }
  if (l.status === 'Answered') return 'answered';
  if (l.status === 'Used' || l.status === 'Withdrawn') return 'used';
  if (l.status === 'Expired' || (l.kind !== 'info' && new Date(l.expires) < wNow())) return 'expired';
  return 'valid';
}
const W_STATE_LABEL = { valid: 'Active', used: 'Used', expired: 'Expired', superseded: 'Superseded', answered: 'Answered by learner', cancelled: 'Visit cancelled', invalid: 'Invalid' };

/* ---------- Shell (§4) ---------- */
const wFirst = l => l.learner.split(' ')[0];
function wShell(body, opts = {}) {
  return `<div class="wpc"><header class="wpc-h"><a class="logo" aria-label="Illumin Academy">${LOGO}<div><b>Illumin Academy</b><span>Secure link</span></div></a>${opts.demo ? `<span class="wpc-demo-tag">Demo — what the contact sees</span>` : ''}</header>
  <main id="main" class="wpc-main" tabindex="-1">${S.offline ? `<div class="note b-amber wpc-card-w" role="status">${ic('wifioff')}<div class="small"><strong>You're offline.</strong> Your choices are kept — reconnect to send them.</div></div>` : ''}${body}</main>
  <footer class="wpc-f"><p>Questions? Contact Illumin Academy — ${academyContact()}</p><p><button class="linklike" data-act="wpcPrivacy">Privacy notice</button> · <button class="linklike" data-act="wpcA11y">Accessibility statement</button></p><p class="xs muted">You don't need an account. This page only shows what you need to make this decision.</p></footer></div>`;
}
const wCard = (inner, cls = '') => `<section class="card wpc-card ${cls}">${inner}</section>`;
const wHelp = () => `<p class="small muted">Need help? Contact Illumin Academy — ${academyContact()}.</p>`;
const wStateCard = (icon, tone, h, body) => wCard(`<div class="wpc-ic t-${tone}" aria-hidden="true">${ic(icon, 28)}</div><h1>${h}</h1>${body}${wHelp()}`, 'wpc-state');

function wTokenPage(l, st) {
  if (st === 'invalid') return wStateCard('search', 'grey', 'We couldn\'t find this request', `<p>The link may be mistyped or incomplete. Please open the most recent email from Illumin Academy and use the button in it.</p>`);
  if (st === 'expired') return wStateCard('clock', 'amber', 'This link has expired', `<p>It expired on <strong>${wfmt(l.expires, l.tz)}</strong>.</p><p>Please ask ${esc(l.learner)} to resend the request, or contact the Academy.</p>`);
  if (st === 'superseded') return wStateCard('refresh', 'blue', l.kind === 'perm' ? 'This request has been replaced' : 'These details have changed', l.kind === 'perm' ? `<p>This request has been replaced by a newer one — please use the most recent email.</p>${l.supReason === 'workplace' ? `<p class="small muted">${esc(wFirst(l))} has updated their workplace.</p>` : ''}` : `<p>These details have changed — please use the latest email.</p>`);
  if (st === 'answered') return wStateCard('check', 'green', 'Already answered', `<p>${esc(l.learner)} responded on your behalf on <strong>${wfmt(l.learnerResp.at, l.tz)}</strong>: <strong>${esc(l.learnerResp.outcome)}</strong>.</p><p>If this isn't right, please contact the Academy.</p>`);
  if (st === 'cancelled') { const o = wObs(l); return wStateCard('x', 'grey', 'This visit has been cancelled', `<p>The visit on ${wfmt(l.at, l.tz)} will not go ahead${o && o.reason ? ` — ${esc(o.reason.replace(/^Cancelled by [^:]*: ?/, ''))}` : ''}.</p><p>A new date will be proposed by email.</p>`); }
  if (st === 'used') { const u = l.used || {}; return wStateCard('check', 'green', 'You\'ve already responded', `<p>Your decision: <strong>${esc(u.decision === 'Accepted' ? 'Visit accepted' : u.decision === 'Alternative proposed' ? 'Different date suggested' : 'Permission ' + (u.decision || '').toLowerCase())}</strong> on ${wfmt(u.at, l.tz)}.</p><p>Decisions can't be changed here. If you need to change something, please contact the Academy.</p>${l.kind === 'perm' && u.decision === 'Granted' && l.status !== 'Withdrawn' ? `<p><button class="btn" data-act="wpcGo" data-t="w-withdraw.${l.token}">Withdraw permission</button></p>` : ''}`); }
  return '';
}

/* ---------- Pages ---------- */
const WPC_DUR = 'about 2 hours';
function wPermPage(l, step) {
  const c = l.contact, d = STORE.wpc.drafts[l.token] = STORE.wpc.drafts[l.token] || { name: c.name, title: ['Manager', 'Coordinator'].includes(c.title) ? c.title : 'Other', titleOther: ['Manager', 'Coordinator'].includes(c.title) ? '' : c.title, home: l.home, auth: false, agree: false, sig: '', cond: '', reason: '', reasonText: '' };
  const err = STORE.wpc.err === l.token ? `<div class="note b-red" role="alert">${ic('alert')}<div class="small"><strong>We couldn't send your decision.</strong> Check your connection and try again — your answers are kept.</div></div>` : '';
  if (step === 'grant') return wCard(`<p class="wpc-step">Step 2 of 2 · Grant permission</p><h1>Confirm your details</h1>${err}
    <form class="stack" data-submit="wpcGrant" data-t="${l.token}" novalidate>
      <div class="field"><label for="wg-n">Your name</label><span class="hint">As we have it for you. Correct it if it's wrong.</span><input class="input wpc-in" id="wg-n" value="${esc(d.name)}" autocomplete="name" data-oninput="wpcDraft" data-t="${l.token}" data-k="name"></div>
      <div class="field"><label for="wg-t">Your job title</label><select class="select wpc-in" id="wg-t" data-onchange="wpcDraft" data-t="${l.token}" data-k="title">${['Manager', 'Coordinator', 'Other'].map(o => `<option ${d.title === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
      ${d.title === 'Other' ? `<div class="field"><label for="wg-to">Job title</label><input class="input wpc-in" id="wg-to" value="${esc(d.titleOther)}" data-oninput="wpcDraft" data-t="${l.token}" data-k="titleOther"></div>` : ''}
      <div class="field"><label for="wg-h">Care home or organisation</label><input class="input wpc-in" id="wg-h" value="${esc(d.home)}" data-oninput="wpcDraft" data-t="${l.token}" data-k="home"></div>
      <div class="field"><span class="lbl">Address</span><p class="small">${esc(l.address)}</p></div>
      <p class="xs muted">If you change any of these, we keep both versions and show your corrected details to ${esc(wFirst(l))} and the Academy.</p>
      <label class="check wpc-check"><input type="checkbox" id="wg-a" ${d.auth ? 'checked' : ''} data-onchange="wpcDraft" data-t="${l.token}" data-k="auth"><span>I confirm I have the authority to give this permission on behalf of ${esc(d.home)}.</span></label>
      <label class="check wpc-check"><input type="checkbox" id="wg-g" ${d.agree ? 'checked' : ''} data-onchange="wpcDraft" data-t="${l.token}" data-k="agree"><span>I agree to Illumin Academy assessors carrying out work-based observations of ${esc(l.learner)} at this workplace, as described.</span></label>
      <div class="field"><label for="wg-s">Signature: type your full name to sign</label><span class="hint">This is your signature. It's separate from the name above.</span><input class="input wpc-in" id="wg-s" value="${esc(d.sig)}" data-oninput="wpcDraft" data-t="${l.token}" data-k="sig"></div>
      <div class="field"><label for="wg-c">Conditions or notes for the assessor (optional)</label><textarea class="textarea" id="wg-c" placeholder="For example: weekdays before 2pm only; sign in at reception" data-oninput="wpcDraft" data-t="${l.token}" data-k="cond">${esc(d.cond)}</textarea></div>
      <button class="btn btn-primary btn-block wpc-btn" type="submit" id="wg-go" ${d.auth && d.agree && (d.sig || '').trim() ? '' : 'disabled aria-disabled="true"'}>Confirm and grant permission</button>
      <p class="xs muted" id="wg-why" ${d.auth && d.agree && (d.sig || '').trim() ? 'hidden' : ''}>Tick both boxes and type your full name to continue.</p>
      <button type="button" class="btn btn-ghost btn-block wpc-btn" data-act="wpcStep" data-t="${l.token}" data-s="">Back</button></form>`);
  if (step === 'decline') return wCard(`<p class="wpc-step">Step 2 of 2 · Decline permission</p><h1>Decline permission</h1>${err}
    <form class="stack" data-submit="wpcDecline" data-t="${l.token}" novalidate>
      <div class="field"><label for="wd-r">Reason (optional)</label><select class="select wpc-in" id="wd-r" data-onchange="wpcDraft" data-t="${l.token}" data-k="reason"><option value="">Choose a reason…</option>${['Not a suitable time', 'Policy does not allow', 'Learner no longer works here', 'Details incorrect', 'Other'].map(o => `<option ${d.reason === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
      <div class="field"><label for="wd-t">Anything else you'd like to say (optional)</label><textarea class="textarea" id="wd-t" data-oninput="wpcDraft" data-t="${l.token}" data-k="reasonText">${esc(d.reasonText)}</textarea></div>
      <div class="note b-blue">${ic('info')}<div class="small">${esc(l.learner)} will be told you've declined and the reason you give.</div></div>
      <button class="btn btn-danger btn-block wpc-btn" type="submit">Confirm decline</button>
      <button type="button" class="btn btn-block wpc-btn" data-act="wpcStep" data-t="${l.token}" data-s="">Back</button></form>`);
  const who = l.assessor ? `A qualified assessor (${esc(l.assessor)})` : 'An Illumin Academy assessor';
  return wCard(`<p class="wpc-step">Step 1 of 2 · Review the request</p><h1>Permission for work-based observations</h1>
    <p class="wpc-hello">Hello ${esc(c.name)},<br><span class="muted">${esc(c.title)} at ${esc(l.home)}</span></p>
    <dl class="wpc-dl"><dt>Who</dt><dd>${esc(l.learner)} is studying ${esc(l.qual)} with Illumin Academy.</dd>
      <dt>What</dt><dd>${who} would like to watch ${esc(wFirst(l))} doing their normal job at your workplace, on dates you agree.</dd>
      <dt>Documents from Illumin Academy</dt><dd>${wDocs('Workplace permission link')}</dd><dt>What happens</dt><dd><ul><li>The assessor visits for ${WPC_DUR}.</li><li>They watch and do not step in to give care.</li><li><strong>No personal information about your residents or service users is recorded.</strong></li></ul></dd>
      <dt>What you're agreeing to</dt><dd>Permission for observation visits during ${esc(wFirst(l))}'s programme. We'll ask you to agree each visit date separately.</dd>
      <dt>Your data</dt><dd>We record your name, job title, the date and time, and your IP address, so there is a record of your decision on ${esc(wFirst(l))}'s file. <button class="linklike" data-act="wpcPrivacy">Privacy notice</button></dd></dl>
    <details class="wpc-faq"><summary>Frequently asked questions</summary><h3>Can I say no?</h3><p class="small">Yes. Choose "Decline". ${esc(wFirst(l))} will be told and can talk to you about it.</p><h3>Can I change the date?</h3><p class="small">Yes. Each visit date is sent to you separately and you can suggest a different one.</p><h3>Who do I contact?</h3><p class="small">Illumin Academy — ${academyContact()}.</p></details>
    <p class="small"><strong>This link expires on ${wfmt(l.expires, l.tz)}.</strong></p>
    <div class="wpc-actions"><button class="btn btn-primary btn-block wpc-btn" data-act="wpcStep" data-t="${l.token}" data-s="grant">Grant permission</button><button class="btn btn-block wpc-btn" data-act="wpcStep" data-t="${l.token}" data-s="decline">Decline</button></div>`);
}
function wObsPage(l, step) {
  const d = STORE.wpc.drafts[l.token] = STORE.wpc.drafts[l.token] || { note: '', reasonQ: '', reason: '', slots: [{ date: '', part: 'Morning', time: '' }, { date: '', part: 'Afternoon', time: '' }, { date: '', part: 'Morning', time: '' }], never: '', loc: '' };
  const err = STORE.wpc.err === l.token ? `<div class="note b-red" role="alert">${ic('alert')}<div class="small"><strong>We couldn't send your answer.</strong> Check your connection and try again — your answers are kept.</div></div>` : '';
  const sum = `<dl class="wpc-dl"><dt>Learner</dt><dd>${esc(l.learner)}</dd><dt>Assessor</dt><dd>${esc(l.assessor || 'An Illumin Academy assessor')}</dd><dt>Date and time</dt><dd><strong>${wfmt(l.at, l.tz)}</strong></dd><dt>Estimated duration</dt><dd>${WPC_DUR}</dd><dt>Location</dt><dd>${esc(l.home)}, ${esc(l.address)}</dd><dt>Purpose</dt><dd>To watch ${esc(wFirst(l))} doing their normal role.</dd><dt>Documents from Illumin Academy</dt><dd>${wDocs(l.revised ? 'Observation revised' : 'Observation proposed')}</dd></dl>`;
  if (step === 'accept') return wCard(`<p class="wpc-step">Accept this date</p><h1>Confirm the visit</h1>${err}${sum}
    <form class="stack" data-submit="wpcAccept" data-t="${l.token}" novalidate><div class="field"><label for="wa-n">Note for the assessor (optional)</label><textarea class="textarea" id="wa-n" placeholder="Sign-in instructions, parking, who to ask for on the day" data-oninput="wpcDraft" data-t="${l.token}" data-k="note">${esc(d.note)}</textarea></div>
    <button class="btn btn-primary btn-block wpc-btn" type="submit">Confirm visit</button><button type="button" class="btn btn-block wpc-btn" data-act="wpcStep" data-t="${l.token}" data-s="">Back</button></form>`);
  if (step === 'alt') return wCard(`<p class="wpc-step">Suggest a different date</p><h1>Suggest a different date</h1>${err}<p class="small">Currently proposed: <strong>${wfmt(l.at, l.tz)}</strong></p>
    <form class="stack" data-submit="wpcAlt" data-t="${l.token}" novalidate>
      <fieldset class="field" style="border:0;padding:0"><legend class="lbl">Why doesn't this date work? (required)</legend><div class="wpc-quick">${['Staffing', 'Inspection or visit that day', 'Learner not on shift', 'Other'].map(o => `<label class="wpc-pill"><input type="radio" name="wq" value="${o}" ${d.reasonQ === o ? 'checked' : ''} data-onchange="wpcDraft" data-t="${l.token}" data-k="reasonQ"><span>${o}</span></label>`).join('')}</div></fieldset>
      <div class="field"><label for="wo-r">Tell the assessor a little more</label><textarea class="textarea" id="wo-r" data-oninput="wpcDraft" data-t="${l.token}" data-k="reason">${esc(d.reason)}</textarea><span class="err-slot" id="wo-err"></span></div>
      <fieldset class="stack" style="border:0;padding:0"><legend class="lbl">Suggest up to 3 dates</legend>${d.slots.map((s, k) => `<div class="wpc-slot"><span class="xs muted">Option ${k + 1}${k ? ' (optional)' : ''}</span><div class="form-grid"><div class="field"><label for="ws-d${k}">Date</label><input class="input wpc-in" type="date" id="ws-d${k}" value="${s.date}" data-oninput="wpcSlot" data-t="${l.token}" data-i="${k}" data-k="date"></div><div class="field"><label for="ws-p${k}">Time of day</label><select class="select wpc-in" id="ws-p${k}" data-onchange="wpcSlot" data-t="${l.token}" data-i="${k}" data-k="part">${['Morning', 'Afternoon', 'Specific time'].map(o => `<option ${s.part === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>${s.part === 'Specific time' ? `<div class="field"><label for="ws-t${k}">Time</label><input class="input wpc-in" type="time" id="ws-t${k}" value="${s.time}" data-oninput="wpcSlot" data-t="${l.token}" data-i="${k}" data-k="time"></div>` : ''}</div></div>`).join('')}</fieldset>
      <div class="field"><label for="wo-n">Any times that never work? (optional)</label><input class="input wpc-in" id="wo-n" value="${esc(d.never)}" placeholder="For example: never on Mondays" data-oninput="wpcDraft" data-t="${l.token}" data-k="never"></div>
      <button class="btn btn-primary btn-block wpc-btn" type="submit">Send suggestion</button><button type="button" class="btn btn-block wpc-btn" data-act="wpcStep" data-t="${l.token}" data-s="">Back</button></form>`);
  return wCard(`<p class="wpc-step">Visit request</p><h1>Proposed observation visit</h1>
    ${l.revised ? `<div class="note b-amber" role="status">${ic('refresh')}<div class="small"><strong>This replaces the previous date (${wfmt(l.revised.oldAt, l.tz)})</strong> — reason: ${esc(l.revised.reason)}</div></div>` : ''}
    <p class="wpc-hello">Hello ${esc(l.contact.name)},<br><span class="muted">${esc(l.contact.title)} at ${esc(l.home)}</span></p>${sum}
    <div class="field"><label for="wl-loc">If the assessor should go to a different unit or entrance, tell us here (optional)</label><input class="input wpc-in" id="wl-loc" value="${esc(d.loc)}" data-oninput="wpcDraft" data-t="${l.token}" data-k="loc"></div>
    <div class="note b-grey">${ic('info')}<div class="small">${esc(wFirst(l))} may also respond to this request. The first response is used.</div></div>
    <p class="small">Please reply by ${wfmt(l.expires, l.tz)}.</p>
    <div class="wpc-actions"><button class="btn btn-primary btn-block wpc-btn" data-act="wpcStep" data-t="${l.token}" data-s="accept">Accept this date</button><button class="btn btn-block wpc-btn" data-act="wpcStep" data-t="${l.token}" data-s="alt">Suggest a different date</button></div>`);
}
function wInfoPage(l) {
  if (l.info === 'cancelled') return wStateCard('x', 'grey', 'Visit cancelled', `<dl class="wpc-dl"><dt>Learner</dt><dd>${esc(l.learner)}</dd><dt>Was planned for</dt><dd>${wfmt(l.at, l.tz)}</dd><dt>Reason</dt><dd>${esc(l.reason)}</dd></dl><p><strong>A new date will be proposed</strong> by email.</p>`);
  return wCard(`<div class="wpc-ic t-green" aria-hidden="true">${ic('cal', 28)}</div><h1>Confirmed visit</h1><dl class="wpc-dl"><dt>Learner</dt><dd>${esc(l.learner)}</dd><dt>Assessor</dt><dd>${esc(l.assessor || '—')}</dd><dt>Date and time</dt><dd><strong>${wfmt(l.at, l.tz)}</strong></dd><dt>Location</dt><dd>${esc(l.home)}, ${esc(l.address)}</dd></dl><button class="btn btn-block wpc-btn" data-act="wpcIcs">${ic('download', 16)}Add to calendar (.ics)</button><p class="small">To raise a concern, please speak to ${esc(wFirst(l))} or contact the Academy.</p>${wHelp()}`);
}
function wOutcome(l, kind) {
  const u = l.used || {};
  const o = {
    granted: () => ['check', 'green', 'Thank you — permission granted', `<p>We've recorded your decision on <strong>${wfmt(u.at, l.tz)}</strong>. ${esc(l.learner)} and their assessor have been notified. You'll receive a separate email to agree each visit date.</p><p class="small">A copy has been emailed to you</p>`],
    declined: () => ['check', 'blue', 'Your decision has been recorded', `<p>Your decision has been recorded on <strong>${wfmt(u.at, l.tz)}</strong>. ${esc(l.learner)} has been notified. If you change your mind, please contact the Academy.</p>`],
    accepted: () => ['cal', 'green', `Visit confirmed for ${wfmt(l.at, l.tz)}`, `<button class="btn btn-block wpc-btn" data-act="wpcIcs">${ic('download', 16)}Add to calendar (.ics)</button><p>${esc(l.learner)} and the assessor have been notified.</p><p class="small">If anything changes, please let ${esc(wFirst(l))} know or contact the Academy.</p>`],
    alt: () => ['send', 'blue', 'Thanks — suggestion sent', `<p>We've sent your suggestion to the assessor. You'll receive a new email with an updated date.</p>`],
    withdrawn: () => ['check', 'blue', 'Permission withdrawn', `<p>We've recorded this on <strong>${wfmt(u.withdrawnAt || u.at, l.tz)}</strong>. ${esc(l.learner)} and their assessor have been notified, and any planned workplace visits are cancelled. Observations already completed stay valid.</p>`],
  }[kind]();
  return wStateCard(o[0], o[1], o[2], o[3] + '<p class="strong">You can now close this page.</p>');
}
function wWithdrawPage(l, step) {
  if (!l || l.kind !== 'perm' || !l.used || l.used.decision !== 'Granted') return wTokenPage(l, l ? 'used' : 'invalid');
  if (l.status === 'Withdrawn') return wOutcome(l, 'withdrawn');
  const d = STORE.wpc.drafts[l.token] = STORE.wpc.drafts[l.token] || {}, planned = l.v ? STORE.worlds[l.v].observations.filter(o => ['Proposed', 'Confirmed'].includes(o.status) && o.locType !== 'office') : [];
  if (step === 'confirm') return wCard(`<p class="wpc-step">Step 2 of 2 · Confirm</p><h1>Withdraw permission?</h1>
    <dl class="wpc-dl"><dt>Learner</dt><dd>${esc(l.learner)}</dd><dt>Workplace</dt><dd>${esc(l.home)}</dd><dt>Reason</dt><dd>${d.wReason ? esc(d.wReason) : '<span class="muted">No reason given</span>'}</dd><dt>Planned visits</dt><dd>${planned.length ? `${planned.length} planned workplace visit${planned.length === 1 ? '' : 's'} will be cancelled` : 'None planned'}</dd></dl>
    <div class="note b-amber">${ic('alert')}<div class="small">${esc(wFirst(l))} and their assessor will be told. Observations already completed stay valid.</div></div>
    <form class="stack" data-submit="wpcWithdraw" data-t="${l.token}" novalidate><button class="btn btn-danger btn-block wpc-btn" type="submit">Confirm — withdraw permission</button><button type="button" class="btn btn-block wpc-btn" data-act="wpcStep" data-t="${l.token}" data-s="">Back</button></form>`);
  return wCard(`<p class="wpc-step">Step 1 of 2 · Withdraw permission</p><h1>Withdraw permission</h1><p>You gave permission on ${wfmt(l.used.at, l.tz)} for observations of ${esc(l.learner)} at ${esc(l.home)}.</p>
    <div class="field"><label for="ww-r">Reason (optional)</label><textarea class="textarea" id="ww-r" data-oninput="wpcDraft" data-t="${l.token}" data-k="wReason">${esc(d.wReason || '')}</textarea></div><div class="note b-amber">${ic('alert')}<div class="small">Any planned workplace visits will be cancelled. ${esc(wFirst(l))} and their assessor will be told.</div></div>
    <button class="btn btn-primary btn-block wpc-btn" data-act="wpcStep" data-t="${l.token}" data-s="confirm">Continue</button>`);
}

/* ---------- Routing + render ---------- */
const WPC_ROUTES = ['w-permission', 'w-visit', 'w-info', 'w-withdraw', 'w-inbox'];
function wpcPage() {
  wpcSync();
  const r = S.route, p = S.params || {};
  if (r === 'w-inbox') return wInbox(p);
  const l = p.id ? wLink(p.id) : null, outcome = S.wpcOutcome && S.wpcOutcome.t === p.id ? S.wpcOutcome.k : null;
  if (outcome && l) return wOutcome(l, outcome);
  if (r === 'w-withdraw') return wWithdrawPage(l, p.tab);
  const want = { 'w-permission': 'perm', 'w-visit': 'obs', 'w-info': 'info' }[r];
  if (!l || l.kind !== want) return wTokenPage(null, 'invalid');
  if (l.kind === 'info') return wInfoPage(l);
  const st = wState(l); if (st !== 'valid') return wTokenPage(l, st);
  return l.kind === 'perm' ? wPermPage(l, p.tab || '') : wObsPage(l, p.tab || '');
}
const _renderW = render;
render = function () {
  if (S.route && S.route.startsWith('w-') && STORE.wpc) {
    document.body.classList.toggle('frame-mobile', S.frame === 'mobile');
    let body; try { body = wpcPage(); } catch (e) { console.error(e); body = wCard('<h1>Something went wrong on our side</h1><p>Please try again in a moment.</p><button class="btn btn-primary" data-act="wpcRetry">Try again</button>'); }
    $('#app').innerHTML = S.route === 'w-inbox' ? body : wShell(body, { demo: true });
    renderDemo(); afterRender(); return;
  }
  _renderW();
};
const _renderDemoW = renderDemo;
renderDemo = function () {
  if (!(S.route && S.route.startsWith('w-'))) return _renderDemoW();
  $('#demo-root').innerHTML = `<button class="demo-fab" data-act="demoToggle" aria-expanded="${S.demoOpen}">${ic('target', 16)}<span class="fab-l">Demo controls</span></button>${S.demoOpen ? `<div class="demo-panel" role="dialog" aria-label="Prototype demo controls"><div class="row-b"><h2>Prototype controls</h2><button class="icon-btn" data-act="demoToggle" aria-label="Close demo controls">${ic('x')}</button></div>${roleSwitchHtml()}${wpcControls()}<fieldset><legend>View — demo only</legend><div class="seg" role="group" aria-label="Layout preview"><button aria-pressed="${S.frame !== 'mobile'}" data-act="frame" data-f="auto">${ic('monitor', 14)} Full width</button><button aria-pressed="${S.frame === 'mobile'}" data-act="frame" data-f="mobile">${ic('phone', 14)} 390px phone</button></div></fieldset></div>` : ''}`;
};
function wpcControls() {
  return `<fieldset><legend>Workplace contact — demo only</legend><div class="btns"><button class="btn btn-sm" data-act="wpcGo" data-t="w-inbox">Open contact inbox</button><button class="btn btn-sm" data-act="wpcAdvance" data-d="5">Advance 5 days</button><button class="btn btn-sm" data-act="wpcAdvance" data-d="8">Advance 8 days</button><button class="btn btn-sm" data-act="wpcLearnerFirst">Simulate learner responds first</button><button class="btn btn-sm" data-act="wpcFailNext">Next submit fails (network)</button><button class="btn btn-sm" data-act="wpcGo" data-t="w-permission.0000badtoken">Mistyped link</button></div><span class="xs muted">Demo only — the contact clock is ${STORE.wpc && STORE.wpc.offset ? STORE.wpc.offset + ' days ahead' : 'today'}.</span></fieldset>`;
}
ACT.wpcGo = el => { const [r, id, tab] = el.dataset.t.split('.'); S.wpcOutcome = null; STORE.wpc.err = null; go(r, { id: id || undefined, tab: tab || undefined }); };
ACT.wpcStep = el => { STORE.wpc.err = null; go(S.route, { id: el.dataset.t, tab: el.dataset.s || undefined }); };
ACT.wpcRetry = () => render();
ACT.wpcPrivacy = () => openModal({ title: 'Privacy notice', body: `<p class="small">Illumin Academy records your decision (your name, job title, the date and time, and your IP address) so that there is evidence of permission on the learner's file. We keep it for as long as the learner's records are kept. We never ask for information about your residents or service users.</p><p class="small">Full privacy notice: ${chPrivacyLink() /* CH-32 */}</p>`, actions: [{ label: 'Close', cls: 'btn-primary' }] });
ACT.wpcA11y = () => openModal({ title: 'Accessibility statement', body: `<p class="small">These pages are designed to meet WCAG 2.2 AA. They work on small screens, with keyboard only and with screen readers. If something doesn't work for you, contact us (${academyContact()}).</p>`, actions: [{ label: 'Close', cls: 'btn-primary' }] });
ACT.wpcIcs = () => toast('Calendar file downloaded (simulated).', 'info');
INP.wpcDraft = el => {
  const d = STORE.wpc.drafts[el.dataset.t]; if (!d) return;
  d[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value;
  if (['auth', 'agree', 'sig'].includes(el.dataset.k)) { const ok = !!(d.auth && d.agree && (d.sig || '').trim()), b = $('#wg-go'); if (b) { b.disabled = !ok; b.setAttribute('aria-disabled', String(!ok)); } const w = $('#wg-why'); if (w) w.hidden = ok; }
  if (el.dataset.k === 'title') render();
};
INP.wpcSlot = el => { const d = STORE.wpc.drafts[el.dataset.t]; d.slots[+el.dataset.i][el.dataset.k] = el.value; if (el.dataset.k === 'part') render(); };

/* Submissions — double-submit safe, network-error safe, consent never editable */
function wSubmitGuard(l) {
  if (!l || wState(l) !== 'valid') { S.wpcOutcome = null; render(); return false; }
  if (STORE.wpc.failNext || S.offline) { STORE.wpc.failNext = false; STORE.wpc.err = l.token; render(); return false; }
  STORE.wpc.err = null; return true;
}
const ipFor = l => WPC_IP[hashN(l.token) % WPC_IP.length];
function tasNotifyW(t, b, go) { if (STORE.tas) STORE.tas.notifs.unshift({ id: 'tn' + Date.now() + Math.random().toString(36).slice(2, 5), t, b, at: now().toISOString(), go, unread: true, cat: 'Observations' }); }
function logW(l, action, before, after, reason) { if (ADMIN) ADMIN.audit.unshift({ id: 'AU-' + (9900 + ADMIN.audit.length), actor: l.contact.name, role: 'Workplace contact (secure link)', at: now().toISOString(), module: 'Observations', entity: `${l.learner} · ${l.home}`, action, before: before ?? '—', after: after ?? '—', reason: reason || '', ip: ipFor(l) }); }
SUBMIT.wpcGrant = f => {
  const l = wLink(f.dataset.t); if (!wSubmitGuard(l)) return;
  const d = STORE.wpc.drafts[l.token]; if (!(d.auth && d.agree)) { toast('Tick both boxes to continue.', 'err'); return; }
  if (!(d.sig || '').trim()) return fieldErr('#wg-s', 'Type your full name to grant permission');
  if (!d.name.trim()) return fieldErr('#wg-n', 'Enter your full name');
  const title = d.title === 'Other' ? (d.titleOther.trim() || 'Other') : d.title;
  const corrected = (d.name.trim() !== l.contact.name || title !== l.contact.title || d.home.trim() !== l.home) ? { from: { name: l.contact.name, title: l.contact.title, home: l.home }, to: { name: d.name.trim(), title, home: d.home.trim() } } : null;
  l.status = 'Used'; l.used = { decision: 'Granted', at: wIso(), name: d.name.trim(), title, home: d.home.trim(), ip: ipFor(l), sig: d.sig, cond: d.cond, corrected };
  if (l.v) {
    const w = STORE.worlds[l.v], wp = w.workplace;
    if (corrected) { wp.cnameOrig = l.contact.name; wp.cname = d.name.trim(); wp.ctitle = title; }
    Object.assign(wp, { perm: 'Granted', grantedAt: l.used.at, grantedBy: d.name.trim(), reminder: null, consent: { ...l.used } });
    notifyLearner(l.v, 'Schedule', 'Workplace permission granted', `${d.name.trim()} (${title}) granted permission for observations at ${wp.name}.`, 'observations..workplace');
  }
  tasNotifyW('Workplace permission granted', `${l.learner} · ${l.home} — you can now propose observations`, 't-obs');
  logW(l, 'Permission granted (secure link)', 'Pending', 'Granted', corrected ? `Details corrected by contact: ${corrected.from.name} → ${corrected.to.name}` : d.cond || '');
  wMail('receipt', l, { decision: 'Granted' });
  S.wpcOutcome = { t: l.token, k: 'granted' }; go(S.route, { id: l.token });
};
SUBMIT.wpcDecline = f => {
  const l = wLink(f.dataset.t); if (!wSubmitGuard(l)) return;
  const d = STORE.wpc.drafts[l.token], reasonTxt = [d.reason, d.reasonText.trim()].filter(Boolean).join(' — ') || 'No reason given';
  l.status = 'Used'; l.used = { decision: 'Declined', at: wIso(), name: l.contact.name, reason: d.reason, note: d.reasonText.trim(), ip: ipFor(l) };
  if (l.v) { const wp = STORE.worlds[l.v].workplace; Object.assign(wp, { perm: 'Declined', declineReason: reasonTxt, reminder: null }); notifyLearner(l.v, 'Schedule', 'Workplace permission declined', `${l.contact.name} declined: ${reasonTxt}`, 'observations..workplace'); }
  tasNotifyW('Workplace permission declined', `${l.learner} · ${l.home} — observations remain blocked`, 't-obs');
  logW(l, 'Permission declined (secure link)', 'Pending', 'Declined', reasonTxt);
  wMail('receipt', l, { decision: 'Declined' });
  S.wpcOutcome = { t: l.token, k: 'declined' }; go(S.route, { id: l.token });
};
SUBMIT.wpcWithdraw = f => {
  const l = wLink(f.dataset.t), r = ((STORE.wpc.drafts[l.token] || {}).wReason || '').trim();
  if (STORE.wpc.failNext || S.offline) { STORE.wpc.failNext = false; toast('We couldn\'t send this. Try again — your reason is kept.', 'err'); return; }
  l.status = 'Withdrawn'; l.used.withdrawnAt = wIso(); l.used.withdrawReason = r; let n = 0;
  if (l.v) { const w = STORE.worlds[l.v]; w.workplace.perm = 'Withdrawn'; w.workplace.withdrawReason = r; w.observations.filter(o => ['Proposed', 'Confirmed'].includes(o.status) && o.locType !== 'office').forEach(o => { n++; o.status = 'Cancelled'; o.reason = 'Cancelled: workplace permission withdrawn.'; }); w.events = w.events.filter(e => !(e.type === 'obs' && e.loc !== 'Academy office' && new Date(e.start) > now())); notifyLearner(l.v, 'Schedule', 'Workplace permission withdrawn', `${l.contact.name} withdrew permission${r ? ': ' + r : ''}. ${n ? n + ' planned workplace visit' + (n === 1 ? ' is' : 's are') + ' cancelled. ' : ''}Your Academic Coordinator may advise an Academy office observation — you\'ll be asked to agree first.` /* CH-43 */, 'observations..workplace'); }
  (STORE.tas ? STORE.tas.obs : []).filter(o => o.learner === l.learner && o.locType !== 'office' && ['Proposed', 'Confirmed'].includes(o.status)).forEach(o => { n++; o.status = 'Cancelled'; o.perm = 'Withdrawn'; });
  tasNotifyW('Workplace permission withdrawn', `${l.learner} · ${l.home}${n ? ` — ${n} planned workplace visit${n === 1 ? '' : 's'} cancelled` : ''}. The learner\'s Coordinator is told and may advise an Academy office observation (the learner must agree).` /* CH-43 */, 't-obs'); logW(l, 'Permission withdrawn (secure link)', 'Granted', 'Withdrawn', r || 'No reason given');
  S.wpcOutcome = { t: l.token, k: 'withdrawn' }; go('w-withdraw', { id: l.token });
};
SUBMIT.wpcAccept = f => {
  const l = wLink(f.dataset.t); if (!wSubmitGuard(l)) return;
  const d = STORE.wpc.drafts[l.token], o = wObs(l);
  l.status = 'Used'; l.used = { decision: 'Accepted', at: wIso(), name: l.contact.name, note: d.note.trim(), loc: d.loc.trim() };
  if (o) {
    const w = STORE.worlds[l.v];
    o.status = 'Confirmed'; o.respBy = `Workplace contact (${l.contact.name})`; o.wpNote = [d.loc.trim() && 'Location: ' + d.loc.trim(), d.note.trim()].filter(Boolean).join(' · ');
    w.events = w.events.filter(e => e.id !== 'eo' + o.id); w.events.push({ id: 'eo' + o.id + 'c', type: 'obs', title: 'Observation (confirmed)', start: o.at, end: new Date(new Date(o.at).getTime() + 7200e3).toISOString(), course: w.nvq.title, loc: o.loc, go: 'observations' });
    notifyLearner(l.v, 'Schedule', 'Observation confirmed by your workplace', `${l.contact.name} accepted the visit on ${fdt(o.at)}. It's in your calendar with reminders.`, 'observations');
  }
  tasNotifyW('Observation confirmed by workplace', `${l.learner} · ${fdt(l.at)} — responded by ${l.contact.name}`, 't-calendar');
  logW(l, 'Observation date accepted (secure link)', 'Proposed', 'Confirmed', d.note.trim());
  S.wpcOutcome = { t: l.token, k: 'accepted' }; go(S.route, { id: l.token });
};
SUBMIT.wpcAlt = f => {
  const l = wLink(f.dataset.t); if (wState(l) !== 'valid') return wSubmitGuard(l);
  const d = STORE.wpc.drafts[l.token];
  if (!d.reasonQ && !d.reason.trim()) { const e = $('#wo-err'); if (e) e.innerHTML = `<span class="err" role="alert">${ic('alert', 14)}Choose a reason or tell us why this date doesn't work</span>`; $('#wo-r').focus(); return; }
  const slots = d.slots.filter(s => s.date);
  if (!slots.length) { toast('Suggest at least one date.', 'err'); $('#ws-d0').focus(); return; }
  if (!wSubmitGuard(l)) return;
  const reason = [d.reasonQ, d.reason.trim()].filter(Boolean).join(' — '), sug = slots.map(s => wfmt(s.date + 'T12:00:00Z', l.tz, false) + ' · ' + (s.part === 'Specific time' && s.time ? s.time : s.part.toLowerCase())).join('; ');
  l.status = 'Used'; l.used = { decision: 'Alternative proposed', at: wIso(), name: l.contact.name, reason, slots: sug, never: d.never.trim() };
  const o = wObs(l);
  if (o) { o.alt = true; o.altWp = { by: l.contact.name, reason, slots: sug, never: d.never.trim(), at: wIso() }; notifyLearner(l.v, 'Schedule', 'Workplace asked for a different date', `${l.contact.name}: ${reason}. Suggested: ${sug}.`, 'observations'); }
  tasNotifyW('Alternative requested by workplace', `${l.learner}: ${reason}. Suggested ${sug}`, 't-obs');
  logW(l, 'Alternative date proposed (secure link)', 'Proposed', 'Proposed — alternative requested', reason);
  S.wpcOutcome = { t: l.token, k: 'alt' }; go(S.route, { id: l.token });
};

/* ---------- Demo inbox (§A5) ---------- */
const EMAIL_KIND = {
  permRequest: (e, l) => [`Permission request: work-based observations for ${e.learner} at ${e.home}`, 'Review the request', 'w-permission'],
  permReminder: (e, l) => [`Reminder: permission request for ${e.learner} expires on ${wfmt(l.expires, e.tz, false)}`, 'Review the request', 'w-permission'],
  obsProposed: (e, l) => [`Proposed observation visit on ${wfmt(e.at, e.tz, false)} — ${e.learner}`, 'View the proposed visit', 'w-visit'],
  obsRevised: (e, l) => [`Updated observation date proposed — ${e.learner}`, 'View the updated visit', 'w-visit'],
  obsConfirmed: (e, l) => [`Observation visit confirmed — ${e.learner}, ${wfmt(e.at, e.tz, false)}`, 'View details', 'w-info'],
  obsCancelled: (e, l) => [`Observation visit cancelled — ${e.learner}, ${wfmt(e.at, e.tz, false)}`, 'View details', 'w-info'],
  receipt: (e, l) => [`Your decision: permission for ${e.learner} at ${e.home}`, null, null],
};
const linkStatusOf = e => { const l = wLink(e.token); if (!l) return '—'; if (e.kind === 'receipt') return '—'; const st = wState(l); return { valid: 'Active', used: 'Used', expired: 'Expired', superseded: 'Superseded', answered: 'Used', cancelled: 'Superseded', invalid: '—' }[st]; };
const LS_TONE = { Active: 'green', Used: 'blue', Expired: 'amber', Superseded: 'grey' };
function wEmailBody(e) {
  const l = wLink(e.token) || STORE.wpc.links.find(x => x.key === e.lkey) || {}, [subj, btn, route] = EMAIL_KIND[e.kind](e, l), tz = e.tz, first = (e.learner || '').split(' ')[0];
  const body = {
    permRequest: () => `<p>${esc(e.learner)} is studying ${esc(l.qual || '')} with Illumin Academy and has given your details as their workplace contact. An Illumin Academy assessor would like to watch ${esc(first)} doing their normal job at ${esc(e.home)} on dates you agree.</p><p>Please grant or decline permission using the secure button below. It takes about two minutes and you don't need an account.</p>`,
    permReminder: () => `<p>We haven't yet had your answer about work-based observations for ${esc(e.learner)} at ${esc(e.home)}. The secure link expires on <strong>${wfmt(l.expires, tz)}</strong>.</p>`,
    obsProposed: () => `<p>An observation visit is proposed for ${esc(e.learner)}:</p><ul><li><strong>Date and time:</strong> ${wfmt(e.at, tz)}</li><li><strong>Location:</strong> ${esc(e.home)}, ${esc(l.address || '')}</li><li><strong>Assessor:</strong> ${esc(l.assessor || '')}</li><li><strong>Estimated duration:</strong> ${WPC_DUR}</li></ul><p>Please accept the date or suggest a different one. ${esc(first)} may also respond — the first response is used.</p>`,
    obsRevised: () => `<p><strong>This replaces the previous request</strong> (${e.oldAt ? wfmt(e.oldAt, tz) : 'previous date'}).</p><ul><li><strong>New date and time:</strong> ${wfmt(e.at, tz)}</li><li><strong>Location:</strong> ${esc(e.home)}</li><li><strong>Assessor:</strong> ${esc(l.assessor || '')}</li></ul>`,
    obsConfirmed: () => `<p>The observation visit for ${esc(e.learner)} is confirmed.</p><ul><li><strong>Date and time:</strong> ${wfmt(e.at, tz)}</li><li><strong>Location:</strong> ${esc(e.home)}, ${esc(l.address || '')}</li><li><strong>Assessor:</strong> ${esc(l.assessor || '')}</li></ul><p>${ic('clip2', 14)} visit.ics — Add to calendar</p><p>To raise a concern, please speak to ${esc(first)} or contact the Academy.</p>${(p => p ? `<p class="small">Need to withdraw permission for observations? <button class="linklike" data-act="wpcGo" data-t="w-withdraw.${p.token}">Withdraw permission</button></p>` : '')(STORE.wpc.links.find(x => x.kind === 'perm' && x.learner === e.learner && x.used && x.used.decision === 'Granted' && x.status !== 'Withdrawn'))}`,
    obsCancelled: () => `<p>The observation visit for ${esc(e.learner)} on ${wfmt(e.at, tz)} has been cancelled.</p><p><strong>Reason:</strong> ${esc(e.reason || '')}</p><p>A new date will be proposed.</p>`,
    receipt: () => `<p>For your records, a copy of your decision:</p><ul><li><strong>Decision:</strong> Permission ${esc(((l.used || {}).decision || e.decision || '').toLowerCase())}</li><li><strong>Recorded:</strong> ${l.used ? wfmt(l.used.at, tz) : '—'}</li><li><strong>By:</strong> ${esc((l.used || {}).name || e.to.name)}${(l.used || {}).title ? ', ' + esc(l.used.title) : ''}</li>${(l.used || {}).reason ? `<li><strong>Reason:</strong> ${esc(l.used.reason)}</li>` : ''}</ul>${(l.used || {}).decision === 'Granted' ? `<p class="small">Need to withdraw permission later? <button class="linklike" data-act="wpcGo" data-t="w-withdraw.${l.token}">Withdraw permission</button></p>` : ''}`,
  }[e.kind]();
  return `<div class="mail"><div class="mail-h"><div class="small"><strong>From:</strong> Illumin Academy</div><div class="small"><strong>To:</strong> ${esc(e.to.name)} &lt;${esc(e.to.email)}&gt;</div><div class="small muted">${wfmt(e.sent, tz)}</div><h2>${esc(subj)}</h2></div>
    <div class="mail-b"><p>Dear ${esc(e.to.name)} (${esc(e.to.title)}),</p>${body}
    ${btn ? `<p><button class="btn btn-primary wpc-btn" data-act="wpcGo" data-t="${route}.${e.token}">${btn}</button></p><p class="xs muted">Secure link: <span class="mono">https://portal.illumin-academy.example/w/${route.slice(2)}/${e.token}</span>${['permRequest', 'permReminder', 'obsProposed', 'obsRevised'].includes(e.kind) ? ` · expires ${wfmt(l.expires, tz)}` : ''}</p>` : ''}
    <hr><p class="xs muted">Illumin Academy · ${academyContact()}<br>We use your details only to manage this request. Privacy notice: ${chPrivacyLink() /* CH-32 */}<br>If you weren't expecting this, contact us.</p></div></div>`;
}
function wInbox(p) {
  const sel = p.id && STORE.wpc.emails.find(e => e.id === p.id), f = ui('wpcF', 'All'), q = (ui('wpcQ', '') || '').toLowerCase();
  const list = STORE.wpc.emails.filter(e => (f === 'All' || linkStatusOf(e) === f) && (!q || (e.to.name + e.to.email + e.home + e.learner + EMAIL_KIND[e.kind](e, wLink(e.token) || {})[0]).toLowerCase().includes(q))).sort((a, b) => new Date(b.sent) - new Date(a.sent));
  return `<div class="wpc-inbox"><header class="wpc-h"><a class="logo">${LOGO}<div><b>Workplace contact inbox</b><span>Demo — every email sent to workplace contacts</span></div></a><span class="demo-tag">Demo only</span></header>
  <main id="main" class="page wpc-inbox-main" tabindex="-1"><div class="page-h"><div class="stack" style="gap:2px"><h1>Workplace contact inbox (demo)</h1><p class="sub">Mock mailbox. Open a message and use its button to see the page the contact would see.</p></div></div>
  <div class="note b-blue">${ic('info')}<div class="small"><strong>Demo only:</strong> ${wpcControls().replace(/<\/?fieldset>|<legend>[^<]*<\/legend>/g, '')}</div></div>
  <div class="row"><div class="field" style="flex:1;min-width:200px"><label class="sr" for="wq">Search messages</label><input class="input" id="wq" type="search" placeholder="Search recipient, care home, learner or subject…" value="${esc(ui('wpcQ', ''))}" data-oninput="wpcQ"></div><div class="seg" role="group" aria-label="Link status">${['All', 'Active', 'Used', 'Expired', 'Superseded'].map(k => `<button aria-pressed="${f === k}" data-act="wpcF" data-k="${k}">${k}</button>`).join('')}</div></div>
  <div class="wpc-mailgrid"><section class="card pad0"><div class="tbl-wrap"><table class="tbl dense"><caption class="sr">Emails sent to workplace contacts</caption><thead><tr><th>Recipient</th><th>Care home</th><th>Subject</th><th>Sent</th><th>Link</th></tr></thead><tbody>${list.map(e => { const l = wLink(e.token) || {}, ls = linkStatusOf(e); return `<tr class="${sel && sel.id === e.id ? 'hl' : ''}"><td><button class="linklike strong" data-act="wpcOpenMail" data-id="${e.id}">${esc(e.to.name)}</button><div class="xs muted">${esc(e.to.email)}</div></td><td class="small">${esc(e.home)}</td><td class="small">${esc(EMAIL_KIND[e.kind](e, l)[0])}</td><td class="small">${wfmt(e.sent, e.tz)}</td><td>${ls === '—' ? '<span class="muted small">No link</span>' : chip(ls, LS_TONE[ls])}</td></tr>`; }).join('') || '<tr><td colspan="5" class="small muted">No messages match.</td></tr>'}</tbody></table></div></section>
  ${sel ? `<section class="card wpc-preview" aria-label="Message preview">${wEmailBody(sel)}</section>` : `<section class="card wpc-preview"><div class="empty">${ic('inbox', 30)}<strong>Select a message to read it</strong></div></section>`}</div>
  <section class="card"><h2>Link status by learner</h2><div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Learner</th><th>Care home</th><th>Type</th><th>Status</th><th>Sent</th><th>Expires</th></tr></thead><tbody>${STORE.wpc.links.filter(l => l.kind !== 'info').map(l => `<tr><td>${esc(l.learner)}</td><td class="small">${esc(l.home)}</td><td class="small">${l.kind === 'perm' ? 'Permission' : 'Visit date'}</td><td>${chip(W_STATE_LABEL[wState(l)], { valid: 'green', used: 'blue', expired: 'amber', answered: 'blue' }[wState(l)] || 'grey')}</td><td class="small nowrap">${fd(l.sent)}</td><td class="small nowrap">${fd(l.expires)}</td></tr>`).join('')}</tbody></table></div></section></main></div>`;
}
ACT.wpcOpenMail = el => go('w-inbox', { id: el.dataset.id });
ACT.wpcF = el => { setUi('wpcF', el.dataset.k); render(); };
INP.wpcQ = el => { setUi('wpcQ', el.value); render(); const i = $('#wq'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } };

/* ---------- Demo-only controls ---------- */
ACT.wpcAdvance = el => {
  const n = +el.dataset.d; STORE.wpc.offset += n; wpcSync();
  let rem = 0, exp = 0;
  STORE.wpc.links.forEach(l => {
    if (l.status !== 'Active' || l.kind === 'info') return;
    const left = (new Date(l.expires) - wNow()) / DAY;
    if (left < 0) {
      l.status = 'Expired'; exp++;
      if (l.kind === 'perm') { l.escalated = wIso(); if (l.v) { const wp = STORE.worlds[l.v].workplace; wp.perm = 'Expired'; wp.reminder = null; notifyLearner(l.v, 'Schedule', 'Workplace permission link expired', `${l.contact.name} didn't reply before ${fd(l.expires)}. You can resend the link.`, 'observations..workplace'); } if (ADMIN) (ADMIN._saNotifs || ADMIN.myNotifs).unshift({ t: 'Workplace permission escalated', b: `${l.learner} · ${l.home} — contact unresponsive`, at: now().toISOString(), unread: true, go: 'a-observations..permissions' }); if (typeof acaNotify === 'function') acaNotify('Workplace permission escalated', `${l.learner} · ${l.home} — contact unresponsive`, 'a-observations..permissions', 'all', 'Admissions'); }
    } else if (l.kind === 'perm' && !l.reminded && left <= 3) {
      l.reminded = wIso(); rem++; wMail('permReminder', l);
      if (l.v) STORE.worlds[l.v].workplace.reminder = 'Reminder sent ' + fd(wIso());
    }
  });
  render(); toast(`Demo only: advanced ${n} days. ${rem} reminder(s) sent, ${exp} link(s) expired${exp ? ' and escalated to the Academy' : ''}.`, 'info');
};
ACT.wpcLearnerFirst = () => {
  wpcSync();
  const l = STORE.wpc.links.find(x => x.kind === 'obs' && x.status === 'Active' && wState(x) === 'valid' && wObs(x));
  if (!l) { toast('No open visit request to answer.', 'info'); return; }
  const o = wObs(l), w = STORE.worlds[l.v];
  o.status = 'Confirmed'; o.respBy = 'Learner'; w.events = w.events.filter(e => e.id !== 'eo' + o.id); w.events.push({ id: 'eo' + o.id + 'c', type: 'obs', title: 'Observation (confirmed)', start: o.at, end: new Date(new Date(o.at).getTime() + 7200e3).toISOString(), course: w.nvq.title, loc: o.loc, go: 'observations' });
  wpcSync(); render(); toast(`Demo only: ${l.learner} accepted the visit first. The workplace link now shows "Already answered".`, 'info');
};
ACT.wpcFailNext = () => { STORE.wpc.failNext = true; toast('Demo only: the next submit on a link page will fail.', 'info'); };

/* ---------- Role switch / demo switcher entry ---------- */
const _rshW = roleSwitchHtml;
roleSwitchHtml = function () { return _rshW().replace('</div><button class="btn btn-sm" data-act="resetDemo">', `<button aria-pressed="${!!(S.route && S.route.startsWith('w-'))}" data-act="switchRole" data-r="wpc">Workplace contact inbox (demo)</button></div><button class="btn btn-sm" data-act="resetDemo">`); };
const _srW = ACT.switchRole;
ACT.switchRole = el => { if (el.dataset.r === 'wpc') { S.wpcOutcome = null; go('w-inbox'); return; } if (S.route && S.route.startsWith('w-')) S.route = ''; _srW(el); };
const _resetW = ACT.resetDemo;
ACT.resetDemo = () => { const inW = S.route && S.route.startsWith('w-'); _resetW(); wpcPatch(); if (inW) go('w-inbox'); };

/* ---------- Cross-view: learner, assessor, admin ---------- */
// Learner: permission card shows Withdrawn, corrected contact name, consent record; observation list shows who responded / workplace alternative
const _permCardW = permCard;
permCard = function () {
  const wp = W.workplace;
  if (wp.perm === 'Withdrawn') return `<section class="card"><div class="row-b"><h2>Permission for observations</h2>${chip('Withdrawn', 'red')}</div><div class="reason"><span class="r-t">${ic('alert', 15)}Withdrawn by ${esc(wp.cname)}</span><span>${esc(wp.withdrawReason || 'No reason given')}</span></div><p class="small">Planned workplace visits were cancelled; completed observations stay valid. Your assessor can propose an observation at the Academy office, or you can send a new permission request.</p><div class="row"><button class="btn btn-sm btn-primary" data-act="editWp">Edit details &amp; resend</button></div></section>`;
  let h = _permCardW();
  if (wp.perm === 'Granted' && wp.consent) h = h.replace('</section>', `<p class="xs muted">Consent recorded ${fdt(wp.consent.at)} · ${esc(wp.consent.title || '')}${wp.cnameOrig ? ` · details corrected by contact (was ${esc(wp.cnameOrig)})` : ''}</p></section>`);
  return h;
};
const _obsListW = obsList;
obsList = function () {
  const h = _obsListW(), list = [...W.observations].sort((a, b) => new Date(b.at) - new Date(a.at)), parts = h.split('<article class="card">');
  list.forEach((o, k) => { let seg = parts[k + 1]; if (!seg) return;
    if (o.status === 'Proposed' && o.altWp) seg = seg.replace('Alternative requested — waiting for your assessor.', `Alternative requested by your workplace (${esc(o.altWp.by)}): ${esc(o.altWp.reason)}. Suggested: ${esc(o.altWp.slots)}. Waiting for your assessor.`);
    if (o.status === 'Confirmed' && o.respBy) seg = seg.replace('Added to your calendar.', `Added to your calendar. Responded by: ${esc(o.respBy.startsWith('Workplace') ? 'workplace contact' : 'you')}.`);
    parts[k + 1] = seg; });
  return parts.join('<article class="card">');
};
// Assessor: who responded + workplace alternative with reason and suggested dates
const _tasObsW = tasObs;
tasObs = function () { return _tasObsW().map(o => { if (!o.src) return o; if (o.src.respBy) o.resp = o.src.respBy; if (o.src.altWp) o.alt = `Alternative requested by workplace (${o.src.altWp.by}): ${o.src.altWp.reason}. Suggested: ${o.src.altWp.slots}${o.src.altWp.never ? '. Never: ' + o.src.altWp.never : ''}`; if (o.src.wpNote) o.wpNote = o.src.wpNote; return o; }); };
// Admins (Super Admin + Academic Admin): permissions tracker driven by the link store, with consent record
function wTrackerRows() {
  wpcSync();
  const latest = {};
  STORE.wpc.links.filter(l => l.kind === 'perm').forEach(l => { const k = l.v || l.learner; if (!latest[k] || l.sent >= latest[k].sent) latest[k] = l; });
  return Object.entries(latest).map(([k, l], i) => {
    const wp = l.v ? STORE.worlds[l.v].workplace : null, st = wState(l);
    let status = st === 'valid' ? (l.reminded ? 'Pending — reminder sent' : 'Pending') : st === 'expired' ? 'Escalated (contact unresponsive)' : st === 'used' || l.status === 'Withdrawn' ? (l.status === 'Withdrawn' ? 'Withdrawn' : l.used.decision) : 'Superseded';
    if (wp && wp.perm === 'Granted' && !l.used) status = 'Granted';
    const u = l.used || (wp && wp.consent) || null;
    return { id: 'pm' + i, learner: l.learner, wp: l.home, contact: (u && u.name && u.decision === 'Granted' ? u.name + ', ' + (u.title || l.contact.title) : l.contact.name + ', ' + l.contact.title) + (u && u.corrected ? ' (corrected by contact)' : ''), st: status, sent: l.sent, consent: u && u.decision === 'Granted' ? `${u.name} · ${fdt(u.at)} · IP ${u.ip}` : u && u.decision === 'Declined' ? `Declined · ${fdt(u.at)}${u.reason ? ' · ' + u.reason : ''}` : '—', note: STORE.wpc.notes[l.v || l.learner] || '', token: l.token };
  });
}
const _obsAdmW = SCREENS['a-observations'];
SCREENS['a-observations'] = (p) => {
  if ((p.tab || 'list') !== 'permissions') return _obsAdmW(p);
  const head = _obsAdmW({ ...p, tab: 'list' }), i = head.indexOf('<section class="dt">'), top = i > 0 ? head.slice(0, i) : pageA('Observations');
  const tone = s => s.startsWith('Escalated') ? 'red' : s === 'Granted' ? 'green' : s === 'Declined' || s === 'Withdrawn' ? 'red' : s.startsWith('Pending') ? 'amber' : 'grey';
  return top.replace(/<button class="btn btn-primary" data-act="newObs">[^]*?<\/button>/, '').replace('aria-selected="true" data-go="a-observations"  data-tab="list"', 'aria-selected="false" data-go="a-observations"  data-tab="list"').replace('aria-selected="false" data-go="a-observations"  data-tab="permissions"', 'aria-selected="true" data-go="a-observations"  data-tab="permissions"') + dt({ id: 'perms', name: 'Workplace permissions', rows: wTrackerRows(), search: r => r.learner + r.wp + r.contact,
    cols: [{ k: 'learner', l: 'Learner' }, { k: 'wp', l: 'Workplace' }, { k: 'contact', l: 'Contact', h: r => `<span class="small">${esc(r.contact)}</span>` }, { k: 'st', l: 'Status', h: r => chip(r.st, tone(r.st)) }, { k: 'sent', l: 'Link sent', h: r => `<span class="small nowrap">${fd(r.sent)}</span>`, s: r => r.sent }, { k: 'consent', l: 'Consent record', h: r => `<span class="small">${esc(r.consent)}</span>` }, { k: 'note', l: 'Follow-up note', h: r => `<span class="small">${esc(r.note || '—')}</span>` }],
    filters: [{ k: 's', l: 'Status', get: r => r.st, opts: ['Pending', 'Pending — reminder sent', 'Granted', 'Declined', 'Escalated (contact unresponsive)', 'Withdrawn'] }],
    act: r => `<button class="btn btn-sm" data-act="permNote" data-id="${r.id}">Add follow-up note</button>` }) + `<p class="xs muted">${ic('info', 12)} Statuses come from the secure links sent to workplace contacts. <button class="linklike" data-act="switchRole" data-r="wpc">Open the contact inbox (demo)</button></p>`;
};

/* ---------- Screen index ---------- */
const _idxW = SCREENS.index;
SCREENS.index = p => { wpcSync(); const t = key => (wLinkByKey(key) || {}).token, L = (l, r) => `<li><button class="linklike" data-act="wpcGo" data-t="${r}">${l}</button></li>`, Ls = STORE.wpc.links, act = Ls.find(l => l.kind === 'perm' && wState(l) === 'valid'), obs = Ls.find(l => l.kind === 'obs' && wState(l) === 'valid'), first = k => STORE.wpc.emails.find(e => e.kind === k);
  return _idxW(p) + `<section class="card idx-sec"><h2>Workplace Contact (link pages)</h2><ul class="idx-list">
  ${L('Demo inbox — every email', 'w-inbox')}
  ${act ? L('P1 Permission request overview', 'w-permission.' + act.token) + L('P2 Grant — confirm your details', 'w-permission.' + act.token + '.grant') + L('P4 Decline', 'w-permission.' + act.token + '.decline') : ''}
  ${L('P3 / P5 outcomes — reached after submitting P2 / P4', 'w-inbox')}${L('P6 Withdraw permission — reason (optional) → confirm', 'w-withdraw.' + t('X:perm:kofi'))}
  ${obs ? L('O1 Proposed visit (revised — "replaces the previous date")', 'w-visit.' + obs.token) + L('O2 Accept — confirm', 'w-visit.' + obs.token + '.accept') + L('O4 Suggest a different date', 'w-visit.' + obs.token + '.alt') : ''}
  ${L('Confirmed visit details', 'w-info.' + t('C:conf:o2'))}${L('Cancelled visit', 'w-info.' + t('C:cancel:o4'))}
  ${L('Token: expired (Isla Morgan)', 'w-permission.' + t('X:perm:isla'))}${L('Token: already used — granted', 'w-permission.' + t('X:perm:kofi'))}${L('Token: already used — declined', 'w-permission.' + t('X:perm:ethan'))}${L('Token: superseded permission', 'w-permission.' + t('D:perm:old'))}${L('Token: superseded visit', 'w-visit.' + (Ls.find(l => l.kind === 'obs' && l.status === 'Superseded') || {}).token)}${L('Token: already answered by learner', 'w-visit.' + t('C:obs:o2:' + STORE.worlds.C.observations.find(o => o.id === 'o2').at))}${L('Token: visit cancelled', 'w-visit.' + t('C:obs:o4:' + STORE.worlds.C.observations.find(o => o.id === 'o4').at))}${L('Token: invalid / mistyped', 'w-permission.0000badtoken')}
  ${['permRequest', 'permReminder', 'obsProposed', 'obsRevised', 'obsConfirmed', 'obsCancelled', 'receipt'].map(k => first(k) ? `<li><button class="linklike" data-act="wpcGo" data-t="w-inbox.${first(k).id}">Email: ${EMAIL_KIND[k](first(k), wLink(first(k).token) || {})[0].split(':')[0].split(' —')[0]}</button></li>` : '').join('')}</ul></section>`; };

if (STORE.worlds) wpcPatch();
