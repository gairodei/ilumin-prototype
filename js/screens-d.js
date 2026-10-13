/* Screens D: Messages, Notifications, My Requests, Profile & Settings, Help, Screen index */
'use strict';

/* ---------- Messages ---------- */
/* G3.7: per-course Teacher/Assessor and Coordinator, plus a chosen Academic Admin. No Finance. */
const acaAdmins = () => (typeof ADMIN !== 'undefined' && ADMIN ? ADMIN.staff.filter(s => s.roles.includes('Academic Admin') && s.status === 'Active').map(s => s.name) : ['Rachel Hughes']);
function recipientGroups() {
  const g = [];
  if (W.flags.nvq && W.flags.admitted) g.push([W.nvq.title, W.nvq.people.filter(([role]) => /Teacher|Assessor|Coordinator/.test(role)).map(([role, name]) => `${name} (${role})`)]);
  g.push(['Academic Admin', acaAdmins().map(n => `Academic Admin — ${n}`)]);
  return g;
}
function recipients() { return recipientGroups().flatMap(x => x[1]); }
SCREENS.messages = (p) => {
  const t = p.tab === 'announcements' ? 'announcements' : 'threads';
  const head = pageHead('Messages', 'Conversations with your Academy team. Messages are kept and can\'t be deleted.', `<button class="btn btn-primary" data-act="compose">${ic('plus', 15)}New message</button>`);
  const st = subtabs([['threads', `Messages (${W.threads.filter(x => x.unread).length} unread)`], ['announcements', 'Announcements']], t, 'messages');
  if (t === 'announcements') return head + st + `<div class="stack">${W.announcements.map(a => `<article class="card" ${a.expired ? 'style="opacity:.7"' : ''}><div class="row-b"><div class="row">${a.pinned ? chip('Pinned', 'amber') : ''}${a.expired ? chip('Expired', 'grey') : ''}<span class="typebadge">${a.kind}</span></div><span class="small muted">${fdt(a.at)}</span></div><h3>${esc(a.title)}</h3><p class="small muted">From ${esc(a.from)}</p><p>${esc(a.body)}</p>${a.att ? `<div><button class="btn btn-sm" data-act="fakeDl" data-f="${esc(a.att)}">${ic('download', 14)}${esc(a.att)}</button></div>` : ''}</article>`).join('')}</div>`;
  const cf = ui('msgCourse', '');
  const list = W.threads.filter(x => !cf || x.course === cf);
  const cur = p.id && W.threads.find(x => x.id === p.id);
  if (cur) cur.unread = false;
  return head + st + `<div class="msg-layout ${cur ? 'has-thread' : ''}"><div class="thread-list"><div style="padding:10px 12px;border-bottom:1px solid var(--line)"><label class="sr" for="mf">Filter by course</label><select class="select" id="mf" data-onchange="msgCourse"><option value="">All courses</option>${[...new Set(W.threads.map(x => x.course))].map(c => `<option ${cf === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    ${thBar('L', list)}${thx('L', list).map(th => { const last = th.msgs[th.msgs.length - 1]; return `<button class="thread-item" data-go="messages" data-id="${th.id}" ${cur && cur.id === th.id ? 'aria-current="true"' : ''}><span class="ti-top">${th.unread ? '<span class="unread-dot" style="margin:0"></span><span class="sr">Unread</span>' : ''}<span class="ti-sub">${esc(th.subject)}</span><span class="xs muted">${fds(last.at)}</span></span><span class="xs muted">${esc(th.with.join(', '))} · ${th.course}</span><span class="ti-last">${last.me ? 'You: ' : ''}${esc(last.text)}</span></button>`; }).join('')}</div>
    <div class="chat">${cur ? `<div class="chat-h"><button class="btn btn-sm btn-ghost" data-go="messages" style="justify-self:start">${ic('back', 14)}All messages</button><h2>${esc(cur.subject)}</h2><span class="small muted">With ${esc(cur.with.join(', '))}</span></div>
      <div class="chat-b" aria-live="polite">${cur.msgs.map(m => `<div class="bubble ${m.me ? 'me' : ''}"><span class="b-meta"><strong>${esc(m.from)}</strong> · ${fdt(m.at)}</span><span>${esc(m.text)}</span>${m.att ? `<button class="attach" data-act="fakeDl" data-f="${esc(m.att)}">${ic('clip2', 13)}${esc(m.att)}</button>` : ''}</div>`).join('')}</div>
      <form class="chat-f" data-submit="reply" data-id="${cur.id}"><label class="sr" for="reply">Reply</label><textarea class="textarea" id="reply" rows="2" style="min-height:44px" placeholder="Write a reply…"></textarea><label class="icon-btn" style="cursor:pointer" aria-label="Attach file">${ic('clip2')}<input type="file" class="sr" id="reply-att"></label><button class="btn btn-primary" type="submit">${ic('send', 15)}Send</button></form>`
      : `${msgPaneEmpty(W.threads, 'messages', 'compose')}`}</div></div>`;
};
INP.msgCourse = el => { setUi('msgCourse', el.value); render(); };
SUBMIT.reply = (f) => { const txt = $('#reply').value.trim(); const att = $('#reply-att').files[0]; if (!txt && !att) return fieldErr('#reply', 'Write a message first'); const th = W.threads.find(x => x.id === f.dataset.id); th.msgs.push({ me: true, from: 'You', at: now().toISOString(), text: txt || '(attachment)', att: att && att.name }); render(); toast('Message sent.'); };
ACT.compose = (el) => {
  const to = el && el.dataset && el.dataset.to, sub = el && el.dataset && el.dataset.sub;
  const gs = recipientGroups(), to2 = to === 'Academic Admin' ? 'Academic Admin — ' + acaAdmins()[0] : to;
  openModal({ title: 'New message', body: `<div class="field"><label for="m-to">To</label><select class="select" id="m-to">${gs.map(([g, list]) => `<optgroup label="${esc(g)}">${list.map(r => `<option ${r === to2 ? 'selected' : ''}>${esc(r)}</option>`).join('')}</optgroup>`).join('')}</select><span class="hint">Your teachers, assessors and coordinator for each course, or an Academic Admin. Questions about fees? Message an Academic Admin.</span></div>
    <div class="field"><label for="m-sub">Subject</label><input class="input" id="m-sub" value="${esc(sub || '')}"></div><div class="field"><label for="m-body">Message</label><textarea class="textarea" id="m-body" rows="5"></textarea></div><div class="field"><label for="m-att">Attachment (optional)</label><input class="input" type="file" id="m-att"></div>`,
    actions: [{ label: 'Cancel' }, { label: `${ic('send', 15)} Send`, cls: 'btn-primary', fn: () => {
      const s = mval('#m-sub'), b = mval('#m-body'); if (!s) { fieldErr('#m-sub', 'Enter a subject'); return false; } if (!b) { fieldErr('#m-body', 'Write your message'); return false; }
      const f = $('#m-att').files[0]; const id = 't' + Date.now();
      const toV = mval('#m-to'), isAA = toV.startsWith('Academic Admin — '), at = now().toISOString(), th = { id, subject: s, course: isAA ? 'Academic Admin' : W.flags.nvq ? 'NVQ' : 'Short courses', with: [toV], unread: false, msgs: [{ me: true, from: 'You', at, text: b, att: f && f.name }] };
      W.threads.unshift(th);
      if (isAA && typeof ADMIN !== 'undefined') ADMIN.threads.unshift({ id: 'MT-L' + Date.now(), subject: s, party: `${W.me.first} ${W.me.last} (learner)`, status: 'Open', cat: 'Learner', to: toV.replace('Academic Admin — ', ''), lv: S.variant, lthread: id, msgs: [[`${W.me.first} ${W.me.last}`, at, b]] });
      go('messages', { id }); toast('Message sent.');
    } }] });
};

/* ---------- Notifications ---------- */
const NF = { All: () => true, Unread: n => n.unread, Assignments: n => n.cat === 'Assignments', Payments: n => n.cat === 'Payments', Certificates: n => n.cat === 'Certificates', Admission: n => n.cat === 'Admission', Schedule: n => n.cat === 'Schedule', Requests: n => n.cat === 'Requests', Enrolment: n => ['Enrolment', 'Courses'].includes(n.cat), Account: n => n.cat === 'Account', Other: n => !['Assignments', 'Payments', 'Certificates', 'Admission', 'Schedule', 'Requests', 'Enrolment', 'Courses', 'Account'].includes(n.cat) };
const NF_ALWAYS = ['All', 'Unread', 'Assignments', 'Payments', 'Certificates', 'Admission', 'Schedule']; // the newer tabs appear only when they have notifications
SCREENS.notifications = () => {
  const f = ui('nf', 'All'), list = W.notifs.filter(NF[f]);
  return `${pageHead('Notifications', `${W.notifs.filter(n => n.unread).length} unread`, `<button class="btn" data-act="markAllRead">Mark all read</button>`)}
  ${tabs(Object.keys(NF).filter(k => (k !== 'Admission' || W.flags.nvq) && (NF_ALWAYS.includes(k) || W.notifs.some(NF[k]))).map(k => [k, k, W.notifs.filter(NF[k]).length]), f, 'nfTab', 'Notification filter')}
  ${nfList('L', list, n => `<li class="li"><span>${n.unread ? '<span class="unread-dot"></span>' : '<span class="read-dot"></span>'}<span class="sr">${n.unread ? 'Unread' : 'Read'}</span></span><div class="li-b"><button class="linklike" style="text-align:left;text-decoration:none;color:var(--fg);font-weight:${n.unread ? 700 : 400}" data-act="openNotif" data-id="${n.id}">${esc(n.title)}</button><span class="small muted">${esc(n.body)}</span><span class="xs muted">${fdt(n.at)} · <span class="typebadge">${n.cat}</span></span></div><div class="li-a"><button class="btn btn-sm btn-ghost" data-act="toggleRead" data-id="${n.id}">Mark as ${n.unread ? 'read' : 'unread'}</button><button class="btn btn-sm" data-act="openNotif" data-id="${n.id}">Open</button></div></li>`, { empty: `<div class="card"><div class="empty">${ic('bell', 36)}<p>You're all caught up.</p></div></div>` })}
  <p class="small muted">Choose SMS and email in <button class="linklike" data-go="profile" data-tab="preferences">Profile → Preferences</button>.</p>`;
};
ACT.nfTab = el => { setUi('nf', el.dataset.k); render(); };
ACT.toggleRead = el => { const n = W.notifs.find(x => x.id === el.dataset.id); n.unread = !n.unread; render(); };
INP.nprefs = el => { const k = el.dataset.k, other = k === 'sms' ? 'email' : 'sms'; if (!el.checked && !W.notifPrefs[other]) { el.checked = true; toast('Keep at least one channel on — we need it for codes and security messages.', 'err'); return; } W.notifPrefs[k] = el.checked; toast(`${k === 'sms' ? 'SMS' : 'Email'} ${el.checked ? 'on' : 'off'}.`); };

/* ---------- My Requests ---------- */
SCREENS.requests = () => {
  const exhausted = W.enrolments.find(e => e.kind === 'short' && e.quiz && e.quiz.attempts.length >= e.quiz.max && !e.quiz.attempts.some(a => a.result === 'Pass') && e.status === 'Active');
  const expired = W.enrolments.find(e => e.status === 'Expired-Incomplete');
  return `${pageHead('My Requests', 'Requests you\'ve made to the Academy and their decisions.')}
  <section class="card"><h2>Raise a new request</h2><div class="row">
    ${exhausted ? `<button class="btn" data-act="reqAttempts" data-id="${exhausted.id}">Extra quiz attempts — ${esc(exhausted.title)}</button>` : `<button class="btn" disabled title="Available when you've used all quiz attempts">Extra quiz attempts</button>`}
    ${expired ? `<button class="btn" data-act="reqTime" data-id="${expired.id}">More time — ${esc(expired.title)}</button>` : `<button class="btn" disabled title="Available when a course expires before you finish">More time on a course</button>`}
    <button class="btn" data-go="profile">Profile change</button></div><p class="small muted">You can cancel a request while it is pending.</p></section>
  ${dt({ id: 'lu-h-lreq', name: 'My requests', rows: W.requests, noExport: true, rid: r => r.id, cols: [{ k: 'req', l: 'Request', h: r => `<span class="mono small">${r.id}</span><div class="strong">${r.type}</div>`, v: r => r.id + ' ' + r.type }, { k: 'target', l: 'Course or field', h: r => `<span class="small">${esc(r.target)}</span>`, v: r => r.target }, { k: 'raised', l: 'Raised', h: r => `<span class="nowrap small">${fd(r.raised)}</span>`, v: r => r.raised }, { k: 'status', l: 'Status', h: r => chip(r.status), v: r => r.status }, { k: 'decided', l: 'Decided', h: r => `<span class="nowrap small">${r.decided ? fd(r.decided) : '—'}</span>`, v: r => r.decided || '' }, { k: 'decision', l: 'Decision', h: r => `<span class="small">${r.decision ? esc(r.decision) : '<span class="muted">Waiting for a decision</span>'}</span>`, v: r => r.decision || '' }], act: r => `<button class="btn btn-sm" data-act="reqDetail" data-id="${r.id}">View</button>${r.status === 'Requested' ? ` <button class="btn btn-sm" data-act="reqCancel" data-id="${r.id}">Cancel request</button>` : ''}` })}`;
};
ACT.reqDetail = el => { const r = W.requests.find(x => x.id === el.dataset.id); openModal({ title: `${r.type} · ${r.id}`, body: `<dl class="kv"><dt>Status</dt><dd>${chip(r.status)}</dd><dt>What you asked</dt><dd>${r.type} — ${esc(r.target)}</dd><dt>Raised</dt><dd>${fdt(r.raised)}</dd><dt>Your reason</dt><dd>${esc(r.reason)}</dd><dt>Decision</dt><dd>${r.decision ? esc(r.decision) : 'Waiting for a decision — usually within 2 working days.'}</dd>${r.decided ? `<dt>Decided</dt><dd>${fdt(r.decided)}</dd>` : ''}${r.grant ? `<dt>Granted</dt><dd class="strong">${esc(r.grant)}</dd>` : ''}</dl>${r.status === 'Re-purchase Required' ? `<button class="btn btn-sm" data-go="browse">Re-purchase from Browse Courses</button>` : ''}`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); };

/* ---------- Profile & Settings ---------- */
const PTABS = [['personal', 'Personal details'], ['security', 'Security'], ['documents', 'My documents'], ['workplace', 'Workplace details'], ['preferences', 'Preferences'], ['referral', 'Referral'], ['privacy', 'Privacy & consent']];
SCREENS.profile = (p) => {
  const tabsAvail = PTABS.filter(([k]) => (k !== 'referral' || W.flags.buddy) && (k !== 'workplace' || (W.flags.nvq && W.flags.admitted)) && (k !== 'documents' || W.flags.nvq));
  const t = tabsAvail.some(([k]) => k === p.tab) ? p.tab : 'personal';
  const body = { personal: profPersonal, security: profSecurity, documents: profDocs, workplace: profWorkplace, preferences: profPrefs, referral: profReferral, privacy: profPrivacy }[t] || profPersonal;
  return `${pageHead('Profile & Settings', `${esc(W.me.first + ' ' + W.me.last)} · ${W.me.id}`)}${subtabs(tabsAvail, t, 'profile')}${body()}`;
};
function profPersonal() {
  const me = W.me, pend = W.profilePending;
  const F = [['Learner ID', me.id, 0], ['Full name', me.first + ' ' + me.last, 1], ['Email', me.email, 1], ['Mobile', me.mobile, 1], ['Date of birth', me.dob, 1], ['Address', me.address, 1], ['Postcode', me.postcode, 1], ['Country of residence', me.country + ' (set at registration)', 0], ['Account status', S.edge === 'archived' ? 'Archived' : 'Active', 0], ['Date joined', me.joined, 0], ['Sponsoring agency', me.sponsor || 'None', 0], ['Referral source', me.referral, 0]];
  const result = { 'Mobile': W.requests.find(r => r.id === 'R-1013'), 'Full name': W.requests.find(r => r.id === 'R-0998') };
  return `<section class="card"><div class="row-b"><h2>Personal details</h2></div><p class="small muted">You can't edit these details directly. Use "Request change" and the Academy will review it.</p>
  <dl class="list">${F.map(([l, v, can, tb]) => `<div class="li"><div class="li-b"><dt class="small muted">${l}</dt><dd style="margin:0" class="strong">${esc(v)}</dd>${pend[l] ? `<span>${chip('Change pending approval', 'amber')} <span class="xs muted">Requested: ${esc(pend[l])}</span></span>` : result[l] ? `<span class="xs">${chip(result[l].status)} <span class="muted">${esc(result[l].decision)}</span></span>` : ''}</div>${can ? `<button class="btn btn-sm" data-act="reqChange" data-f="${l}" data-v="${esc(v)}" ${pend[l] ? 'disabled' : ''}>Request change</button>` : '<span class="xs muted">Read-only</span>'}</div>`).join('')}</dl>
  <div class="note b-blue">${ic('award')}<div class="small"><strong>Name used on certificates:</strong> ${esc(me.first + ' ' + me.last)}. To correct your name on an issued certificate, request a change — the Academy will re-issue it.</div></div></section>`;
}
ACT.reqChange = el => {
  const f = el.dataset.f, v = el.dataset.v;
  openModal({ title: 'Request a change', sub: f, body: `<dl class="kv"><dt>Field</dt><dd>${esc(f)}</dd><dt>Current value</dt><dd>${esc(v)}</dd></dl><div class="field"><label for="pc-new">New value</label><input class="input" id="pc-new"></div><div class="field"><label for="pc-r">Reason</label><textarea class="textarea" id="pc-r"></textarea></div><div class="field"><label for="pc-f">Supporting file (optional)</label><input class="input" type="file" id="pc-f"><span class="hint">${f === 'Full name' ? 'For a name change, upload a passport, driving licence or deed poll.' : 'For example a utility bill for an address change.'}</span></div>`,
    actions: [{ label: 'Cancel' }, { label: 'Send request', cls: 'btn-primary', fn: () => { const nv = mval('#pc-new'), r = mval('#pc-r'); if (!nv) { fieldErr('#pc-new', 'Enter the new value'); return false; } if (!r) { fieldErr('#pc-r', 'Enter a reason'); return false; } const id = 'R-' + (1060 + W.requests.length); W.requests.unshift({ id, type: 'Profile change', target: f, raised: now().toISOString(), status: 'Requested', reason: r, decision: null }); W.profilePending[f] = nv; render(); toast(`Request ${id} sent. You'll see the result here and in My Requests.`); } }] });
};
function pwForm(id) {
  return `<form class="stack" data-submit="changePw" id="${id}" novalidate style="max-width:440px">${pwField('cp-cur', 'Current password', '', 'current-password')}${pwField('cp-new', 'New password', 'new')}${pwField('cp-conf', 'Confirm new password', 'confirm')}${pwPolicy('cp-pol')}<p class="small muted">${ic('info', 13)} You'll be signed out on other devices.</p><button class="btn btn-primary" type="submit" data-pwsubmit disabled>Change password</button></form>`;
}
SUBMIT.changePw = () => { if (!$('#cp-cur').value) return fieldErr('#cp-cur', 'Enter your current password'); if (MODAL) closeModal(); else render(); toast('Password changed. You\'ve been signed out on other devices.'); };
ACT.changePw = () => { S.menu = null; render(); openModal({ title: 'Change password', body: pwForm('cpm') }); };
function profSecurity() {
  return `<div class="grid-2"><section class="card"><h2>Change password</h2>${pwForm('cpf')}<button class="linklike small" data-act="demoAuth" data-a="forgot">Forgot your password?</button></section>
  <section class="card"><h2>Sign-in</h2><p class="small muted">Last sign-in: ${fdt(D(0, '07:55'))}</p></section></div>`;
}
function profDocs() {
  if (!W.docs.length) return `<div class="card"><div class="empty"><p>You have no admission documents.</p></div></div>`;
  return `<section class="card"><h2>My documents</h2><p class="small muted">All programmes · same rules as Admission & Documents. Files can't be deleted.</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Document</th><th>Programme</th><th>Status</th><th>Expiry</th><th><span class="sr">Action</span></th></tr></thead><tbody>${W.docs.map(d => { const exp = d.expires ? daysTo(d.expires) : null; return `<tr><td class="strong">${esc(d.name)}</td><td class="small">${esc(W.nvq.title)}</td><td>${chip(d.status)}</td><td class="small">${d.expires ? fd(d.expires) + (exp <= 30 ? ` · <strong>in ${exp} days</strong>` : '') : '—'}</td><td>${['Rejected', 'Resubmission Required'].includes(d.status) ? `<button class="btn btn-sm btn-primary" data-act="reupload" data-id="${d.id}">Re-upload</button>` : d.expires && exp <= 30 && d.status === 'Approved' ? `<button class="btn btn-sm" data-act="replaceDoc" data-id="${d.id}">Replace</button>` : d.status === 'Pending' ? `<button class="btn btn-sm" data-go="admission">Upload</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div></section>`;
}
function profWorkplace() {
  const w = W.workplace;
  return `<section class="card"><div class="row-b"><h2>Workplace details</h2>${chip(w.perm)}</div><p class="small muted">${esc(W.nvq.title)}</p><dl class="kv"><dt>Workplace</dt><dd>${esc(w.name)}, ${esc(w.postcode)}</dd><dt>Contact</dt><dd>${esc(w.ctitle)} — ${esc(w.cname)}</dd><dt>Your role</dt><dd>${esc(w.role)}</dd><dt>Permission</dt><dd>${chip(w.perm)}</dd></dl><div><button class="btn btn-sm" data-go="observations" data-tab="workplace">Manage workplace details</button></div></section>`;
}
function profPrefs() {
  return `<section class="card" style="max-width:640px"><h2>Preferences</h2>
  <div class="field"><label for="pf-tz">Time zone</label><select class="select" id="pf-tz" data-onchange="setTz">${(z => [['Europe/London', 'Europe/London (GMT/BST)'], ['Asia/Dubai', 'Asia/Dubai (GST)'], ['Asia/Kolkata', 'Asia/Kolkata (IST)']].concat([['Europe/London', 0], ['Asia/Dubai', 0], ['Asia/Kolkata', 0]].some(x => x[0] === z) ? [] : [[z, z]]).map(([v, l]) => `<option value="${v}" ${z === v ? 'selected' : ''}>${l}</option>`).join(''))(W.me.tz || tzOfLearner(W.me))}</select><span class="hint">Detected automatically from your browser. All dates and times in the portal use this zone.</span></div>
  <div class="field"><span class="lbl">Notification channels</span><ul class="list">${[['email', 'Email', 'To ' + W.me.email], ['sms', 'SMS', 'To ' + W.me.mobile]].map(([k, l, d]) => `<li class="li"><div class="li-b"><label class="strong" for="np-${k}">${l}</label><span class="small muted">${esc(d)}</span></div><span class="toggle"><input type="checkbox" role="switch" id="np-${k}" ${W.notifPrefs[k] ? 'checked' : ''} data-onchange="nprefs" data-k="${k}"><span></span></span></li>`).join('')}</ul><span class="hint">Keep at least one channel on. One-time codes and security messages always go by whichever channel is on.</span></div>
  <div class="field"><label for="pf-lang">Language</label><input class="input" id="pf-lang" readonly value="English (UK)"><span class="hint">The portal is available in UK English only.</span></div></section>`;
}
INP.setTz = el => { W.me.tz = el.value; render(); toast(`Times now shown in ${tzl()}.`); };
function profReferral() {
  const r = W.referral;
  return `<section class="card" style="max-width:640px"><h2>Your Welfare Buddy referral</h2><div class="row" style="gap:20px;align-items:flex-start">${qr(r.link, 120)}<div class="stack" style="flex:1;min-width:200px"><div class="field"><span class="lbl">Referral code</span><span class="code" style="font-size:1.1rem;justify-self:start">${r.code}</span></div><div class="field"><label for="ref-link">Referral link</label><input class="input mono" id="ref-link" readonly value="${r.link}"></div><button class="btn btn-primary" data-act="copyRef" style="justify-self:start">${ic('copy', 15)}Copy link</button></div></div>
  <div class="note b-grey">${ic('info')}<div class="small">Referrals record attribution only — no reward.</div></div></section>`;
}
ACT.copyRef = () => copyText(W.referral.link, 'Referral link copied');
function profPrivacy() {
  return `<section class="card"><h2>Privacy &amp; consent</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Document</th><th>Version / choice</th><th>Accepted</th><th></th></tr></thead><tbody>${W.consents.map(([d, v, at]) => `<tr><td class="strong">${d}</td><td>${v}</td><td>${fts(at)} on ${fd(at)}</td><td><button class="btn btn-sm btn-ghost" data-act="policy" data-p="${d}">Read</button></td></tr>`).join('')}</tbody></table></div>
  <div class="row-b"><div><h3>Your data</h3><p class="small muted">To request a copy of your data or ask for erasure, message an Academic Admin.</p></div><div class="row"><button class="btn" data-act="compose" data-to="Academic Admin" data-sub="Data request">${ic('msg', 15)}Message an Academic Admin</button></div></div></section>`;
}
ACT.dataReq = () => confirmDlg({ title: 'Request a copy of your data?', ok: 'Send request', body: '<p>The Academy will email you a copy within one month, as required by UK GDPR. We may ask you to confirm your identity.</p>', onOk: () => toast('Data request sent. We\'ll email you within one month.') });

/* ---------- Help ---------- */
SCREENS.help = () => {
  const faq = [
    ['How do I submit an assignment?', 'Open the assignment, write each answer in the box under its question, then choose "Review & Submit". Check your answers on the review screen and press Submit.'],
    ['Can I undo a submission?', 'Yes, for 15 seconds. When you press Submit the time is recorded and an Undo bar appears. After 15 seconds the submission is final and can\'t be reopened.'],
    ['What happens if I miss a deadline?', 'The answer sheet closes at the deadline and late submissions aren\'t accepted. If you need more time, contact your assessor before the deadline to ask for an extension.'],
    ['Why wasn\'t my Zoom attendance recorded?', 'Attendance only counts when you join with the email address registered with Illumin Academy. Check you\'re signed in to Zoom with that email.'],
    ['How do I pay an instalment?', 'Go to Payments and choose "Pay now" next to the instalment. If a payment is 15 days overdue we\'ll remind you; at 30 days your course access is paused until it\'s paid.'],
    ['When do I get my certificate?', 'Short-course certificates are issued automatically when you complete all requirements. NVQ certificates are issued after the awarding body confirms your achievement.'],
    ['How can someone check my certificate is real?', 'Use "Copy verification link" on the certificate and share it. Anyone with the link can see whether the certificate is valid.'],
  ];
  return `${pageHead('Help / Contact Academy')}
  <div class="grid-2"><section class="card"><h2>Frequently asked questions</h2><div class="stack">${faq.map(([q, a]) => `<details class="card flat" style="padding:12px"><summary class="strong" style="cursor:pointer">${q}</summary><p class="small" style="margin-top:8px">${a}</p></details>`).join('')}</div></section>
  <div class="stack-lg"><form class="card" data-submit="contact"><div class="row-b"><h2>Contact the Academy</h2></div><div class="field"><label for="ct-topic">Topic</label><select class="select" id="ct-topic"><option>My course or assignment</option><option>Payments</option><option>Certificates</option><option>Technical problem</option><option>Something else</option></select></div><div class="field"><label for="ct-msg">Message</label><textarea class="textarea" id="ct-msg" rows="5"></textarea></div><button class="btn btn-primary" type="submit">Send</button>
    <p class="small muted">Or contact us: ${academyContact()}</p></form>
  <section class="note b-grey">${ic('info')}<div class="small"><strong>Questions about an assessment outcome</strong> are handled directly by the Academy by email (${academyContact()}). There is no in-portal appeal.</div></section></div></div>`;
};
SUBMIT.contact = () => { if (!$('#ct-msg').value.trim()) return fieldErr('#ct-msg', 'Write your message'); $('#ct-msg').value = ''; toast('Message sent. We reply within 2 working days.'); };

/* ---------- Screen index ---------- */
const MODALS = {
  startQuiz: ['A', 'course.mh26.quiz', () => ACT.startQuiz({ dataset: { id: 'mh26' } })],
  quizAuto: ['A', 'course.mh26.quiz', () => { W.quiz = { e: 'mh26', ans: { 0: 0, 1: 1 }, cur: 0, ends: Date.now() + 3000, mode: 'one', conn: true }; go('quiz', { id: 'mh26' }); }],
  reviewSubmit: ['C', 'assignment.a3', () => { W.drafts['a3.q1.0'] = '<p>A duty of care means I must act in the best interests of the people I support…</p>'; ACT.reviewSubmit({ dataset: { id: 'a3' } }); }],
  undo: ['C', 'assignment.a3', () => startUndo(asgById('a3'), false)],
  submitted: ['C', 'assignment.a3', () => finaliseSubmit(asgById('a3'), false, now().toISOString())],
  withdraw: ['B', 'admission', () => ACT.withdrawApp()],
  reqAttempts: ['A', 'course.bls.quiz', () => ACT.reqAttempts({ dataset: { id: 'bls' } })],
  reqTime: ['A', 'course.ipc', () => ACT.reqTime({ dataset: { id: 'ipc' } })],
  reqProfile: ['C', 'profile', () => ACT.reqChange({ dataset: { f: 'Address', v: W.me.address } })],
  reupload: ['B', 'admission', () => ACT.reupload({ dataset: { id: 'd3' } })],
  replace: ['C', 'admission', () => ACT.replaceDoc({ dataset: { id: 'd2' } })],
  obsAlt: ['C', 'observations', () => ACT.obsAlt({ dataset: { id: 'o1' } })],
  pdAlt: ['C', 'progress..pd', () => ACT.pdAlt()],
  wpChange: ['C', 'observations..workplace', () => ACT.changeWp()],
  payNow: ['C', 'payments', () => ACT.payInst({ dataset: { e: 'nvq', n: '5' } })],
  changePw: ['C', 'profile..security', () => ACT.changePw()],
  ical: ['C', 'calendar', () => ACT.ical()],
  copyVerify: ['A', 'certificates', () => ACT.copyVerify({ dataset: { id: 'c1' } })],
  compose: ['C', 'messages', () => ACT.compose()],
  session: ['C', 'dashboard', () => ACT.sessionWarn()],
  zoom: ['C', 'dashboard', () => ACT.joinZoom({ dataset: { id: 'e1' } })],
  viewCert: ['A', 'certificates', () => ACT.viewCert({ dataset: { id: 'c5' } })],
  obsReport: ['C', 'observations', () => ACT.obsReport({ dataset: { id: 'o3' } })],
};
ACT.jump = el => {
  const { v, e, r, m, a } = el.dataset;
  const mv = m ? MODALS[m][0] : null;
  const tv = v || mv;
  if (tv || e) { S.variant = tv || S.variant; setEdge(e || 'none'); }
  if (a) { signOut(); S.auth = a; S.authMsg = null; render(); return; }
  if (e && EDGES.find(x => x[0] === e)?.[3] === 'auth') return;
  S.signedIn = true; S.serverError = false; S.demoOpen = false;
  const [rt, id, tab] = (r || (m ? MODALS[m][1] : 'dashboard')).split('.');
  go(rt, { id, tab });
  if (m) setTimeout(MODALS[m][2], 60);
};
SCREENS.index = () => {
  const L = (label, o = {}) => `<li><button class="linklike" data-act="jump" ${Object.entries(o).map(([k, v]) => `data-${k}="${v}"`).join(' ')}>${label}</button>${o.v ? ` <span class="xs muted">· ${o.v}</span>` : ''}</li>`;
  const sec = (t, items) => `<section class="card idx-sec"><h2>${t}</h2><ul class="idx-list">${items.join('')}</ul></section>`;
  return `${pageHead('Screen index', 'Every screen, state and dialog in this prototype. Each link switches to the right learner variant and opens the item. Letters show the variant used: A B2C · B applicant · C active NVQ · D sponsored · E multi-role · F Welfare Buddy.')}
  ${sec('§4 Sign-in (entry point)', [L('Sign in', { a: 'signin' }), L('Forgot password', { a: 'forgot' }), L('Reset link sent', { a: 'forgotSent' }), L('Reset password (policy checklist)', { a: 'reset' }), L('Reset success', { a: 'resetDone' }), L('Reset link expired', { a: 'resetExpired' }), L('First-time set password', { a: 'first', v: 'D' }), L('First-time welcome screen', { a: 'welcome', v: 'D' }), L('First-time link expired', { a: 'firstExpired', v: 'D' }), L('Pending verification (resend)', { a: 'verify' }), L('Deactivated account message', { e: 'deactivated' }), L('Session timeout warning', { m: 'session' }), L('Session expired → return to page', { r: 'assignment.a3', v: 'C' })])}
  ${sec('§3 Learner variants', Object.entries(VARIANT_INFO).map(([k, [l]]) => L(`${k} · ${l} — dashboard`, { v: k, r: 'dashboard' })))}
  ${sec('§6.1 Dashboard & §6.2 My Courses', [L('Dashboard — active NVQ', { v: 'C' }), L('Dashboard — B2C with Action Needed', { v: 'A' }), L('Dashboard — empty state (applicant)', { v: 'B' }), L('My Courses list (all statuses, re-enrolments)', { v: 'A', r: 'courses' }), L('Short course — Overview', { v: 'A', r: 'course.mh26' }), L('Short course — Content (PDF / Vimeo / SCORM)', { v: 'A', r: 'course.mh26.content' }), L('Short course — Quiz (before start)', { v: 'A', r: 'course.mh26.quiz' }), L('Quiz — attempts exhausted', { v: 'A', r: 'course.bls.quiz' }), L('Quiz — passed', { v: 'A', r: 'course.dem.quiz' }), L('Short course — Certificate processing', { v: 'A', r: 'course.dem.certificate' }), L('Short course — Certificate issued', { v: 'A', r: 'course.mh25.certificate' }), L('Expired-Incomplete course', { v: 'A', r: 'course.ipc' }), L('Payment Pending course', { v: 'A', r: 'course.fire' }), L('Discontinued course', { v: 'A', r: 'course.med' }), L('NVQ programme hub (overview + people)', { v: 'C', r: 'course.nvq' }), L('Agency-sponsored programme', { v: 'D', r: 'course.nvq' })])}
  ${sec('§6.3 Admission & Documents', [L('Pending — Documents Required (upload, rejected, resubmission, expiring)', { v: 'B', r: 'admission' }), L('Under Review', { e: 'underreview' }), L('Rejected (+ re-apply)', { e: 'rejected' }), L('Withdrawn (read-only)', { e: 'withdrawn' }), L('Approved + Replace window', { v: 'C', r: 'admission' }), L('Sign-up — documents step (Priya Raman)', { v: 'B', r: 'admission' })])}
  ${sec('§6.4 Assignments', [L('Assignments list (filters, tabs)', { v: 'C', r: 'assignments' }), L('Answer sheet with auto-save', { v: 'C', r: 'assignment.a3' }), L('Brief updated + extended deadline', { v: 'C', r: 'assignment.a3' }), L('Deadline passed — editor disabled', { v: 'C', r: 'assignment.a6' }), L('Submitted — status timeline', { v: 'C', r: 'assignment.a4' }), L('Feedback view + Coordinator feedback', { v: 'C', r: 'assignment.a5' }), L('Completed', { v: 'C', r: 'assignment.a1' }), L('Resubmission view (black/red, PD item)', { v: 'C', r: 'assignment.a2' }), L('Resubmission limit reached (amber ink)', { v: 'C', r: 'assignment.a7' })])}
  ${sec('§6.5 Progress & §6.6 Observations', [L('Progress summary + programme tree', { v: 'C', r: 'progress' }), L('Outstanding criteria + improvement plan', { v: 'C', r: 'progress..plan' }), L('PD consolidation checklist + session', { v: 'C', r: 'progress..pd' }), L('My Portfolio', { v: 'C', r: 'progress..portfolio' }), L('Qualification requirements met', { e: 'qualified' }), L('Observations list (all statuses)', { v: 'C', r: 'observations' }), L('Workplace details — permission granted', { v: 'C', r: 'observations..workplace' }), L('Workplace — permission pending + escalated', { v: 'D', r: 'observations..workplace' })])}
  ${sec('§6.7 – §6.16 Other tabs', [L('Learning Resources (locked, expired)', { v: 'C', r: 'resources' }), L('Calendar (month/week/day/agenda)', { v: 'C', r: 'calendar' }), L('Attendance', { v: 'C', r: 'attendance' }), L('Payments — instalments, overdue, partial', { v: 'C', r: 'payments' }), L('Payments — pending, expired link, refunds', { v: 'A', r: 'payments' }), L('Payments — agency-sponsored', { v: 'D', r: 'payments' }), L('Certificates (all statuses)', { v: 'A', r: 'certificates' }), L('Messages + thread', { v: 'C', r: 'messages.t1' }), L('Announcements', { v: 'C', r: 'messages..announcements' }), L('Notifications (every event)', { v: 'C', r: 'notifications' }), L('My Requests', { v: 'A', r: 'requests' }), L('Profile — personal details', { v: 'C', r: 'profile' }), L('Profile — security', { v: 'C', r: 'profile..security' }), L('Profile — my documents', { v: 'C', r: 'profile..documents' }), L('Profile — preferences', { v: 'C', r: 'profile..preferences' }), L('Profile — referral (Welfare Buddy)', { v: 'F', r: 'profile..referral' }), L('Profile — privacy & consent', { v: 'C', r: 'profile..privacy' }), L('Help / Contact Academy', { v: 'C', r: 'help' }), L('Browse Courses', { v: 'A', r: 'browse' }), L('Multi-role switcher', { v: 'E', r: 'dashboard' })])}
  ${sec('§7 Edge states', EDGES.filter(([k]) => k !== 'none').map(([k, l]) => L(l, { e: k })).concat([L('404 page', { r: 'nothing-here' })]))}
  ${sec('§8 Modals and dialogs', [['startQuiz', 'Start quiz confirmation'], ['quizAuto', 'Quiz auto-submitted notice (wait 3 s)'], ['reviewSubmit', 'Review & Submit screen'], ['undo', '15-second Undo bar'], ['submitted', 'Submission final confirmation'], ['withdraw', 'Withdraw application confirmation'], ['reqAttempts', 'Request more attempts'], ['reqTime', 'Request more time'], ['reqProfile', 'Request profile change'], ['reupload', 'Re-upload document'], ['replace', 'Replace expiring document'], ['obsAlt', 'Request alternative observation date'], ['pdAlt', 'Request alternative PD date'], ['wpChange', 'Workplace change warning'], ['payNow', 'Pay Now / partial payment → success or failure'], ['changePw', 'Change password'], ['ical', 'Copy iCal link'], ['copyVerify', 'Copy verification link'], ['compose', 'Message composer'], ['session', 'Session timeout warning'], ['zoom', 'Join on Zoom notice'], ['viewCert', 'Certificate viewer (Welfare branding)'], ['obsReport', 'Observation report']].map(([k, l]) => L(l, { m: k })))}
  <section class="card"><h2>Items pending client confirmation</h2><p class="small muted">Shown on screen with a "Pending client" or "Client to supply" tag.</p><ul class="idx-list small">${TBD_TOPICS.map(t => `<li>${esc(t[0] + ': ' + t[1])}</li>`).join('')}</ul></section>`;
};
