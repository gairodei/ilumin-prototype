/* ============================================================
   SA-FINAL D — attendance (SA-03), referral link (SA-04), referral attribution (SA-05). 3 Nov 2026; PD-SAF-D-01…08.
   Loads after sa-c-assess.js. Wraps only; no existing file is edited.
   SA-03 Attendance is never automatic. The admin and register screens say how it is recorded: manual entry with a reason,
      "Import Zoom report (simulated)" (sample participants generated in the prototype, labelled simulated everywhere they
      appear), and automatic Zoom integration (not implemented). The legacy name-based register handlers (adjAtt, umMatch,
      umDismiss, SUBMIT.thr) get the N4 role rule (Super, System and Academic Admin) checked when the action starts and again
      on confirm; refusals are logged. Match and Dismiss need a reason and are audited; Adjust refuses a no-op. Thresholds are
      read-only (the rules are fixed in code; nothing was ever saved). "Report retrieved" is shown as "Report imported (simulated)".
   SA-04 No public referral route exists and illumin-academy.example is a placeholder (RD-02): every "Copy link" for a referral
      becomes "Copy code" (the agency profile copied a certificate-verification URL). The QR holds the code, not a link.
   SA-05 Registration counts come from the learner records (the "(code X)" a learner's referral holds), on the codes list,
      History, Business reports and the agency profile; the Attribution lists show only those learners.
   ============================================================ */
'use strict';

/* ---------- SA-05: attribution counted from learner records ---------- */
const SAD_DEF = 'Attribution = the referral code a learner supplied when they registered; recorded once at verified registration; it does not track clicks, enrolments or payments.';
// regCreate writes "<Type> referral (code X)" — the only place a code reaches a learner record (besides Data Correction)
const sadRefCodeOf = l => { const m = /\(code ([A-Z0-9][A-Z0-9-]*)\)/i.exec((l && l.referral) || ''); return m ? m[1].toUpperCase() : null; };
const sadRefLearners = () => { const seen = new Set(); return allLearners().filter(l => l && sadRefCodeOf(l) && !seen.has(l.id) && seen.add(l.id)); };
const sadRefOf = code => sadRefLearners().filter(l => sadRefCodeOf(l) === String(code || '').toUpperCase());
const sadRefN = r => sadRefOf(r.code).length;
const sadNoLink = 'Referral links are not available in this prototype: there is no deployed referral route, and illumin-academy.example is a placeholder domain. A public link needs a production route (client decision). Share the code instead.';
const sadHowRef = () => `<section class="card sad-ref-how"><h2>How referral codes work</h2><ol class="small sad-steps">
  <li><strong>Created</strong> — the Super Administrator, a System Administrator or the Business Admin generates a code here for an agent, an agency or a Welfare Buddy. Every change is audited.</li>
  <li><strong>Shared</strong> — the owner gives the code to the person they introduce ("Copy code").</li>
  <li><strong>Supplied</strong> — the person types it into the optional "Referral / Agent Code" field when they create their learner account (sign-in → Create an account). An expired, disabled or unknown code isn't credited; they register without it.</li>
  <li><strong>Recorded</strong> — when they verify their email or mobile code, their learner record keeps "<em>type</em> referral (code <em>CODE</em>)", once. It can be changed only through Data Correction.</li></ol>
  <p class="small sad-def"><strong>${esc(SAD_DEF)}</strong></p><p class="small">Registrations are the learners whose record holds the code, counted from the learner records.</p>
  <div class="note b-amber sad-nolink">${ic('info')}<div class="small">${esc(sadNoLink)}</div></div></section>`;
const sadUsedCell = r => s5dRefUsed(r) ? 'Used' + (sadRefN(r) ? '' : '<div class="xs muted">locked by an earlier demo figure — no learner on record</div>') : '<span class="muted">Unused</span>';
const sadActs = r => s5dRefActs(r).replace(/<button class="btn btn-sm" data-act="aCopyRef" data-c="([^"]*)">Copy link<\/button>/g, '<button class="btn btn-sm" data-act="sadCopyCode" data-c="$1">Copy code</button>');
function sadRefTable(id) {
  return dt({ id, name: 'Referral codes', rows: ADMIN.referrals, rid: r => r.code, search: r => r.code + ' ' + r.owner, empty: 'No referral codes yet — use "Generate code"', filters: [{ k: 't', l: 'Type', get: r => r.type, opts: S5D_RTYPES }, { k: 's', l: 'Status', get: s5dRefSt, opts: ['Active', 'Expired', 'Disabled'] }, { k: 'u', l: 'Use', get: r => s5dRefUsed(r) ? 'Used' : 'Unused', opts: ['Used', 'Unused'] }],
    cols: [{ k: 'code', l: 'Code', h: r => `<span class="code">${r.code}</span>` }, { k: 'type', l: 'Type' }, { k: 'owner', l: 'Owner' }, { k: 'valid', l: 'Valid until', h: r => fd(r.valid), s: r => r.valid }, { k: 'status', l: 'Status', h: r => chip(s5dRefSt(r), { Active: 'green', Expired: 'grey', Disabled: 'red' }[s5dRefSt(r)]), v: s5dRefSt }, { k: 'regs', l: 'Registrations', r: 1, h: r => String(sadRefN(r)), v: r => String(sadRefN(r)), s: r => sadRefN(r) }, { k: 'used', l: 'Used', h: sadUsedCell, v: r => s5dRefUsed(r) ? 'Used' : 'Unused' }],
    act: sadActs });
}
function sadAttrTable(id, dc) {
  const own = l => (s5dRef(sadRefCodeOf(l)) || {}).owner || 'Code no longer listed';
  return dt({ id, name: 'Attributed learners', rows: sadRefLearners(), search: l => l.name + ' ' + sadRefCodeOf(l), empty: 'No learner has registered with a referral code yet', filters: [{ k: 'c', l: 'Code', get: sadRefCodeOf }],
    cols: [{ k: 'name', l: 'Learner' }, { k: 'code', l: 'Code', h: l => `<span class="code">${esc(sadRefCodeOf(l))}</span>`, v: sadRefCodeOf }, { k: 'owner', l: 'Credited to', v: own }, { k: 'referral', l: 'Recorded at registration' }, { k: 'joined', l: 'Registered' }],
    act: dc ? l => `<button class="btn btn-sm" data-act="raiseDC" data-id="${l.id}">Correct (Data Correction)</button>` : null });
}
const SAD_LINE = 'Referral codes record who introduced a learner. Agents and Welfare Buddies receive no payment; agency savings come from bundle pricing at checkout.';
const _refSAD = SCREENS['a-referrals'];
SCREENS['a-referrals'] = (p) => {
  if (typeof s5dRefTable !== 'function') return _refSAD(p);
  const biz = isBiz(), t = p.tab === 'attribution' ? 'attribution' : 'codes', can = !s5dRefWhy(), gen = can ? `<button class="btn btn-primary" data-act="newRef">${ic('plus', 15)}Generate code</button>` : '';
  const head = biz ? pageA('Referrals & Attribution', '', gen) + `<p class="small"> · ${SAD_LINE}</p>` + subtabs([['codes', 'Codes'], ['attribution', 'Attributed learners']], t, 'a-referrals')
    : pageA('Referrals') + `<p class="small">${SAD_LINE}</p>` + subtabs([['codes', 'Referral codes'], ['attribution', 'Attribution']], t, 'a-referrals');
  if (t === 'attribution') return head + `<div class="note b-grey sad-attr-def">${ic('info')}<div class="small"><strong>${esc(SAD_DEF)}</strong> Only learners whose record holds a referral code are listed. Welfare Buddy referrals record attribution only — no reward. Corrections only via Data Correction.</div></div>` + sadAttrTable(biz ? 'battr' : 'attr', !biz) + (biz ? '<p class="xs muted">Read-only. Corrections go through Data Correction.</p>' : '');
  const rules = `<p class="xs muted">A code can be edited (type and owner) only while it is unused; once used, its attribution is fixed. Disabled codes can be re-enabled while their validity lasts; extend first if it has ended. Codes never change a price, a discount or VAT.</p>`;
  return head + sadHowRef() + rules + sadRefTable(biz ? 'brefs' : 'refs') + (biz ? '' : gen);
};
// SA-04: copy the code itself — never a link (no route reads one) and never a certificate-verification URL
ACT.sadCopyCode = el => {
  const c = String((el && el.dataset && el.dataset.c) || '').toUpperCase(), r = s5dRef(c);
  const mine = S.portal === 'agency' ? !!r && typeof AG === 'function' && AG() && r.owner === AG().name : S.portal === 'learner' ? !!(W && W.referral && W.referral.code === c) : S.portal === 'admin';
  if (!c || (!r && S.portal !== 'learner') || !mine) { toast('That referral code isn\'t available to you.', 'err'); return false; }
  copyText(c, `Referral code ${c} copied. The person types it into "Referral / Agent Code" when they create their account.`); return c;
};
ACT.aCopyRef = ACT.sadCopyCode;
ACT.copyRef = () => ACT.sadCopyCode({ dataset: { c: (W && W.referral && W.referral.code) || '' } });
ACT.bRefQr = el => { const r = s5dRef(el.dataset.c); if (!r) return false; openModal({ title: 'QR code — ' + esc(r.code), body: `<div style="display:grid;place-items:center">${qr(r.code, 140)}<p class="mono small">${esc(r.code)}</p></div><p class="small">This QR code holds the referral code only, not a link. ${esc(sadNoLink)}</p>`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); };
// History: the learners listed are the ones counted (was: seed count + a wider name match)
ACT.s5dRefHist = el => { const r = s5dRef(el.dataset.c); if (!r) return; const rows = ADMIN.audit.filter(a => a.module === 'Referrals' && a.entity === r.code), L = sadRefOf(r.code);
  openModal({ title: 'History — ' + esc(r.code), size: 'lg', body: `<dl class="kv"><dt>Type</dt><dd>${esc(r.type)}</dd><dt>Owner</dt><dd>${esc(r.owner)}</dd><dt>Status</dt><dd>${chip(s5dRefSt(r))}</dd><dt>Valid until</dt><dd>${fd(r.valid)}</dd><dt>Registrations</dt><dd class="sad-hist-n">${L.length}${L.length ? ` · ${L.map(l => esc(l.name)).join(', ')}` : ''} <span class="xs muted">(counted from learner records)</span></dd></dl><p class="xs muted">${esc(SAD_DEF)}</p>${rows.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>When</th><th>Who</th><th>What</th><th>Before → after</th><th>Reason</th></tr></thead><tbody>${rows.map(a => `<tr><td class="small nowrap">${fdt(a.at)}</td><td class="small">${esc(a.actor)}</td><td class="small">${esc(a.action)}</td><td class="small">${esc(a.before)} → ${esc(a.after)}</td><td class="small">${esc(a.reason || '')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">No changes recorded this session.</p>'}`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); };
// Business → Commercial Reports → Referral attribution: same counts (read through derived copies; the codes are never written)
const _bRepSAD = SCREENS['b-reports'];
if (_bRepSAD) SCREENS['b-reports'] = (p) => {
  if ((p || {}).tab !== 'referrals') return _bRepSAD(p);
  const o = ADMIN.referrals; let h; ADMIN.referrals = o.map(r => ({ ...r, regs: sadRefN(r) }));
  try { h = _bRepSAD(p); } finally { ADMIN.referrals = o; }
  return h.replace('<p class="xs muted">Attribution counts only.</p>', `<p class="xs muted sad-def">Attribution counts only — registrations counted from learner records. ${esc(SAD_DEF)}</p>`);
};
// Agency profile: its own code, "Copy code", the count from records and how the code is used
const _gProfSAD = SCREENS['g-profile'];
SCREENS['g-profile'] = (p) => {
  const h = _gProfSAD(p), a = typeof AG === 'function' && AG(); if (!a) return h;
  const r = (ADMIN.referrals || []).find(x => x.owner === a.name);
  const card = `<section class="card sad-ag-ref"><h2>Referral code</h2>${r ? `<p><span class="mono">${esc(r.code)}</span> · <button class="linklike" data-act="sadCopyCode" data-c="${esc(r.code)}">Copy code</button></p><p class="small">${plural(sadRefN(r), 'learner')} registered with this code (counted from learner records). Commission is a bundle discount only — no payouts exist.</p><p class="small">Give this code to people you introduce. They type it into the optional "Referral / Agent Code" field when they create their Illumin Academy learner account; once they verify their email or mobile, your agency is recorded as having introduced them. Learners you create yourself are not counted.</p><p class="xs muted">${esc(SAD_DEF)} ${esc(sadNoLink)}</p>` : '<p class="small muted">Your agency has no referral code. The Academy creates referral codes.</p>'}</section>`;
  return h.replace(/<section class="card"><h2>Referral code<\/h2>[\s\S]*?<\/section>/, card);
};
// Learner (Welfare Buddy) profile: the code, not a placeholder link presented as working
profReferral = function () {
  const r = W.referral, n = s5dRef(r.code) ? sadRefN(s5dRef(r.code)) : null;
  return `<section class="card sad-wb-ref" style="max-width:640px"><h2>Your Welfare Buddy referral</h2><div class="field"><span class="lbl">Referral code</span><span class="code" style="font-size:1.1rem;justify-self:start">${esc(r.code)}</span></div><button class="btn btn-primary" data-act="copyRef" style="justify-self:start">${ic('copy', 15)}Copy code</button>
  <p class="small">Give this code to someone joining Illumin Academy. They type it into "Referral / Agent Code" when they create their account; once they verify it, you are recorded as having introduced them.</p>
  <p class="xs muted">Example link format only — a placeholder, not live: <span class="mono">illumin-academy.example/r/${esc(r.code)}</span>. ${esc(sadNoLink)}</p>
  <div class="note b-grey">${ic('info')}<div class="small">Referrals record attribution only — no reward. ${esc(SAD_DEF)}</div></div></section>`;
};

/* ---------- SA-03: attendance — how it is recorded ---------- */
const SAD_AUTO = 'Automatic Zoom integration is not implemented: nothing is imported after a class on its own.';
const sadAttModes = () => `<div class="note b-blue sad-att-modes" role="note">${ic('info')}<div class="small"><strong>How attendance is recorded</strong><ul class="sad-steps">
  <li><strong>Manual recording</strong> — staff who may record (Super, System and Academic Admins; a Teacher for the sessions they teach) choose Record or Correct for each learner and give a reason. Every change is audited.</li>
  <li><strong>Import Zoom report (simulated)</strong> — a button on each online session's register. It generates sample participants inside the prototype; they are not real Zoom data. A repeated import never overwrites a manual entry.</li>
  <li><strong>Automatic Zoom integration — not implemented.</strong> ${esc(SAD_AUTO.replace(/^Automatic Zoom integration is not implemented: /, ''))} A person records attendance or presses Import on each session.</li></ul></div></div>`;
const SAD_RR = 'Report retrieved', SAD_RI = 'Report imported (simulated)';
// Legacy name-based sessions: shown as "Report imported (simulated)" (read through relabelled copies; records unchanged)
const sadWithSess = fn => { const o = ADMIN.sessions; if (!Array.isArray(o)) return fn(); ADMIN.sessions = o.map(s => s.status === SAD_RR ? { ...s, status: SAD_RI } : s); try { return String(fn()).split(SAD_RR).join(SAD_RI); } finally { ADMIN.sessions = o; } };
const SAD_THR = `<section class="card sad-thr"><h2>Attendance thresholds</h2><dl class="kv"><dt>Present</dt><dd>at least 80% of the session</dd><dt>Late</dt><dd>at least 80%, but joined more than 10 minutes late</dd><dt>Partial</dt><dd>30–79%</dd><dt>Absent</dt><dd>under 30%</dd></dl><p class="small">Read-only. These fixed rules set the status of a simulated Zoom import; a manual entry sets the status directly. Changing them needs client approval, so they can't be edited or saved in this prototype.</p></section>`;
const _aAttSAD = SCREENS['a-attendance'];
SCREENS['a-attendance'] = p => {
  let h = sadWithSess(() => _aAttSAD(p)); if (p.id) return h;
  if ((p.tab || 'sessions') === 'thresholds') h = h.replace(/<form class="card form-grid" data-submit="thr">[\s\S]*?<\/form>/, SAD_THR);
  const i = h.indexOf('<div class="subtabs"'); return i < 0 ? sadAttModes() + h : h.slice(0, i) + sadAttModes() + h.slice(i);
};
const _tSessSAD = SCREENS['t-sessions'];
SCREENS['t-sessions'] = p => sadWithSess(() => _tSessSAD(p));
// Register (N4): sources and unmatched participants labelled simulated; the three ways explained
const _n4RegSAD = n4RegisterHtml;
n4RegisterHtml = function () {
  let h = _n4RegSAD.apply(this, arguments);
  h = h.split('<td class="small">zoom</td>').join('<td class="small">Simulated Zoom import</td>').split('<td class="small">zoom (matched)</td>').join('<td class="small">Simulated Zoom import · matched by a person</td>').split('<td class="small">manual</td>').join('<td class="small">Manual</td>');
  h = h.replace(/<h3>Unmatched Zoom participants \((\d+) open\)<\/h3>/, '<h3>Unmatched participants — simulated Zoom report ($1 open)</h3><p class="xs muted">These participants were generated by the prototype\'s simulated import; they are not real Zoom attendees.</p>');
  h = h.replace(/(<li class="li" data-pid="[^"]*"><div class="li-b"><strong>[^<]*<\/strong>)/g, `$1 ${chip('Simulated', 'amber')}`);
  return h.replace('<p class="xs muted">Zoom data is simulated in the prototype.', sadAttModes() + '<p class="xs muted">Zoom data is simulated in the prototype.');
};
// Legacy name-based registers: their join / leave times are sample data
const SAD_LEG = `<div class="note b-amber sad-leg">${ic('info')}<div class="small">Legacy sample register: the join and leave times are prototype sample data, not retrieved from Zoom. ${esc(SAD_AUTO)}</div></div>`;
const _regSAD = register;
register = function (id) { const h = _regSAD.apply(this, arguments); return (typeof s4bSessById === 'function' && s4bSessById(id)) || !(ADMIN.sessions || []).some(s => s.id === id) ? h : h.replace('<div class="tbl-wrap">', SAD_LEG + '<div class="tbl-wrap">'); };
const _tasRegSAD = tasRegister;
tasRegister = function (id) { const h = _tasRegSAD.apply(this, arguments); return (typeof s4bSessById === 'function' && s4bSessById(id)) ? h : h.replace('<div class="tbl-wrap">', SAD_LEG + '<div class="tbl-wrap">'); };
// Teacher notification: "Zoom report retrieved" → "Zoom report imported (simulated)"
const sadRenNotifs = () => { ((typeof STORE !== 'undefined' && STORE.tas && STORE.tas.notifs) || []).forEach(n => { if (n && n.t === 'Zoom report retrieved') n.t = 'Zoom report imported (simulated)'; }); };
const _baSAD = buildAdmin; buildAdmin = function () { const r = _baSAD.apply(this, arguments); sadRenNotifs(); return r; };
const _isSAD = initStore; initStore = function () { const r = _isSAD.apply(this, arguments); sadRenNotifs(); return r; };
if (ACT.tasSimZoom) { const _f = ACT.tasSimZoom; ACT.tasSimZoom = function () { const r = _f.apply(this, arguments); sadRenNotifs(); render(); return r; }; }

/* ---------- SA-03: legacy register handlers — N4 role rule, reason, audit, no no-ops ---------- */
const sadLegOk = what => n4Admin() ? true : n4Refuse(null, what);
ACT.adjAtt = el => {
  const what = 'adjust a legacy attendance register'; if (!sadLegOk(what)) return false;
  const sid = el.dataset.s, k = +el.dataset.k, r = ((ADMIN.reg || {})[sid] || [])[k]; if (!r) { toast('This register row doesn\'t exist.', 'err'); return false; }
  reasonDlg({ title: 'Adjust attendance — ' + esc(r[0]), ok: 'Save', extra: `<div class="field"><label for="aa">Status</label><select class="select" id="aa">${['Present', 'Late', 'Partial', 'Absent'].map(x => `<option ${x === r[4] ? 'selected' : ''}>${x}</option>`).join('')}</select></div>`,
    onOk: why => { if (!sadLegOk(what)) return false; const to = $('#aa').value, before = r[4]; if (to === before) { fieldErr('#aa', 'Nothing has changed'); return false; }
      r[4] = to; r[5] = true; logA('Attendance', r[0] + ' · ' + sid, 'Attendance adjusted', before, to, why); render(); toast('Adjusted with your reason.'); } });
};
ACT.umMatch = el => {
  const what = 'match a Zoom participant'; if (!sadLegOk(what)) return false;
  const u = (ADMIN.unmatched || []).find(x => x.id === el.dataset.id); if (!u) { toast('Already reconciled.', 'info'); return false; }
  const sel = $('#um-' + u.id), to = (sel && sel.value) || (el.dataset.to || ''); if (!to) { toast('Choose the learner first.', 'err'); return false; }
  reasonDlg({ title: 'Match participant — ' + esc(u.name), ok: 'Match', label: 'How you verified it (required)', body: `<p class="small">Credit <strong>${esc(u.name)}</strong> (${esc(u.email || 'no email')}, ${u.mins} min) to <strong>${esc(to)}</strong>. The name alone isn't proof — check with the learner or teacher first.</p>`,
    onOk: why => { if (!sadLegOk(what)) return false; if (!ADMIN.unmatched.includes(u)) { toast('Already reconciled.', 'info'); return; } ADMIN.unmatched = ADMIN.unmatched.filter(x => x !== u); logA('Attendance', u.name + ' · ' + u.session, 'Participant matched', u.name, to, why); render(); toast('Matched with your reason.'); } });
};
ACT.umDismiss = el => {
  const what = 'dismiss a Zoom participant'; if (!sadLegOk(what)) return false;
  const u = (ADMIN.unmatched || []).find(x => x.id === el.dataset.id); if (!u) { toast('Already reconciled.', 'info'); return false; }
  reasonDlg({ title: 'Dismiss participant — ' + esc(u.name), ok: 'Dismiss', body: '<p class="small">No learner is credited (for example a guest speaker).</p>',
    onOk: why => { if (!sadLegOk(what)) return false; if (!ADMIN.unmatched.includes(u)) { toast('Already reconciled.', 'info'); return; } ADMIN.unmatched = ADMIN.unmatched.filter(x => x !== u); logA('Attendance', u.name + ' · ' + u.session, 'Participant dismissed', u.name, 'Dismissed', why); render(); toast('Dismissed with your reason.'); } });
};
// Thresholds are fixed rules (n4StatusOf): nothing is saved, and no "Updated" entry is written
SUBMIT.thr = () => { if (!sadLegOk('change the attendance thresholds')) return false; toast('Thresholds are fixed in this prototype — nothing was saved.', 'info'); return false; };

/* ---------- Records ---------- */
UXC.push(['SA-FINAL D', 'Attendance, referral codes and attribution (SA-03, SA-04, SA-05; 3 Nov 2026)', [
  'Attendance: the Attendance screen and every register say how attendance is recorded — manual recording with a reason, "Import Zoom report (simulated)" (sample participants, labelled simulated), and automatic Zoom integration (not implemented). Legacy register actions need the Super, System or Academic Admin role (checked again on confirm; refusals logged); Match and Dismiss need a reason and are audited; Adjust refuses a change that changes nothing. Thresholds are shown read-only.',
  'Referral codes: "Copy link" is now "Copy code" everywhere (the agency profile copied a certificate-verification address). There is no deployed referral route and the domain is a placeholder, so no working link is offered. The screen explains how a code is created, supplied at registration and recorded.',
  'Attribution: registrations are counted from the learner records on the codes list, History, Business reports and the agency profile; the Attribution lists show only learners whose record holds a referral code (agency-created learners are no longer listed). ' + SAD_DEF,
]]);
