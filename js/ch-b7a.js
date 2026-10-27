/* ============================================================
   Client decisions — Batch 7a: content, locations and bank details (CH-32 … CH-36).
   CH-32 privacy notice and CH-33 LMS domain are System Configuration settings (the verification link and QR use
   https://<LMS domain>/verify/<token>). CH-34 office locations and CH-35 bank details live in System Configuration;
   every change is an approval item (raised by the System Admin, decided by the Super Admin, reminder after 7 days;
   the Super Admin's own changes apply immediately). Office observations keep the location they were booked at.
   Bank details show on the sign-up bank step, learner "Pay by bank transfer" and agency bank-transfer purchases.
   CH-36: the four "Client to supply" topics are resolved; P-31 is the one Pending client topic.
   Decision effects are wired through ch-b7-apply.js (before guard.js). Loads after ch-b6.js.
   ============================================================ */
'use strict';

const CH_OFF_T = 'Office location change', CH_BANKD_T = 'Bank details change';
QTYPES.push(CH_OFF_T, CH_BANKD_T); REMIND_TYPES.push(CH_OFF_T, CH_BANKD_T);
QLBL[CH_OFF_T] = 'Office location'; QLBL[CH_BANKD_T] = 'Bank details';
const CH_BANK_DEFAULT = { bank: 'Lloyds Bank', sort: '30-90-89', acc: '80060562', name: 'Welfare Health and Safety Academy' };

/* ---------- Settings (System Configuration) ---------- */
const chCfg = n => ((typeof ADMIN !== 'undefined' && ADMIN && ADMIN.config) || []).find(x => x.name === n);
const chBankTxt = b => `${b.bank} · Sort code ${b.sort} · Account number ${b.acc} · Account name ${b.name}`;
function chB7aSeed() {
  if (!ADMIN || !ADMIN.config) return;
  const row = (id, group, name, value) => { if (!ADMIN.config.some(c => c.name === name)) ADMIN.config.push({ id, group, name, value, fixed: false, history: [] }); };
  row('CF-PRIV', 'Contact', 'Privacy notice', 'https://welfarehs.co.uk/privacy-policy');
  row('CF-LMS', 'Certificates', 'LMS domain', 'lms.welfarehs.co.uk');
  ADMIN.chBank = ADMIN.chBank || { ...CH_BANK_DEFAULT };
  row('CF-BANK', 'Payments', 'Bank details for transfers', chBankTxt(ADMIN.chBank));
  ADMIN.chOffices = ADMIN.chOffices || [{ id: 'OL-1', name: 'Luton office', address: '60 Park Street, Luton', postcode: 'LU1 3ET', status: 'Active', history: [['Owen Price', D(-200), 'Created', '']] }];
}
const _baCh7a = buildAdmin;
buildAdmin = function () { const r = _baCh7a.apply(this, arguments); chB7aSeed(); return r; };
if (typeof ADMIN !== 'undefined' && ADMIN) chB7aSeed();
const chPrivacyUrl = () => (chCfg('Privacy notice') || {}).value || 'https://welfarehs.co.uk/privacy-policy';
const chLmsDomain = () => ((chCfg('LMS domain') || {}).value || 'lms.welfarehs.co.uk').replace(/^https?:\/\//, '').replace(/\/+$/, '');
const chBankDet = () => (ADMIN && ADMIN.chBank) || CH_BANK_DEFAULT;

/* ---------- CH-32 privacy notice, CH-33 verification link ---------- */
const chPrivacyLink = () => { const u = chPrivacyUrl(); return `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\//, ''))}</a>`; };
// A stable opaque token per certificate (the live page looks the certificate up by it)
const chVerToken = no => { let h = 2166136261; for (const ch of String(no)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return (h.toString(36) + (h ^ 0x5bd1e995 >>> 0).toString(36)).replace(/-/g, '').slice(0, 12).padEnd(12, '0'); };
const chVerifyUrl = no => `https://${chLmsDomain()}/verify/${chVerToken(no)}`;
const chVerifyNote = () => `Live address: https://${esc(chLmsDomain())}/verify/… — set at deployment.`;

/* ---------- CH-35 bank details ---------- */
const chBankHtml = ref => { const b = chBankDet(); return `<span class="ch-bank">${esc(b.bank)} · Sort code <span class="mono">${esc(b.sort)}</span> · Account number <span class="mono">${esc(b.acc)}</span> · Account name ${esc(b.name)}${ref ? ` · Reference <span class="mono">${esc(ref)}</span>` : ''}</span>`; };

/* ---------- CH-34 office locations ---------- */
const chOffices = () => (ADMIN && ADMIN.chOffices) || [];
const chOfficeLine = o => o ? `${o.name} — ${o.address}, ${o.postcode}` : '';
const chOfficeSnap = o => o ? { id: o.id, name: o.name, address: o.address, postcode: o.postcode } : null;
const chActiveOffices = () => chOffices().filter(o => o.status === 'Active');
// The location an office observation was booked at (kept even if the location is later retired)
const chOfficeOf = o => (o && (o.office || (o.src && o.src.office))) || chOfficeSnap(chActiveOffices()[0] || chOffices()[0]);
const chOfficeTxt = o => esc(chOfficeLine(chOfficeOf(o)));
// Booking: a dropdown of active locations (assessor "Propose observation", office branch)
function chOfficePick() {
  const act = chActiveOffices(); if (!act.length) return `<span class="note b-amber small">${ic('alert', 14)} No active office location — the System Admin adds one in System Configuration.</span>`;
  const cur = ui('chOffice', act[0].id);
  return `</p><div class="field" style="max-width:420px"><label for="op-office">Office location</label><select class="select" id="op-office" data-onchange="chOfficePick">${act.map(o => `<option value="${o.id}" ${o.id === cur ? 'selected' : ''}>${esc(chOfficeLine(o))}</option>`).join('')}</select></div><p class="small">`;
}
INP.chOfficePick = el => { setUi('chOffice', el.value); const o = chOffices().find(x => x.id === el.value), l = $('#op-loc'); if (l && o) l.value = o.name; };
const _obPropCh7a = ACT.obPropose;
ACT.obPropose = el => {
  const r = _obPropCh7a(el); if (!MODAL) return r;
  const a = MODAL.actions.find(x => x.label === 'Send proposal'); if (!a || a._ch7a) return r;
  const f = a.fn; a._ch7a = true;
  a.fn = (...x) => {
    const sel = $('#op-office'), off = sel && chOffices().find(o => o.id === sel.value), office = ($('input[name="op-lt"]:checked') || {}).value === 'office';
    const lid = mval('#op-l'), L = tasLearners(true).find(l => l.lid === lid), w = L && L.v ? STORE.worlds[L.v] : null, n = w ? w.observations.length : STORE.tas.obs.length;
    if (office && !off) { toast('Choose an office location.', 'err'); return false; }
    const res = f(...x);
    if (office && off && res !== false) {
      const rec = w ? (w.observations.length > n ? w.observations[0] : null) : (STORE.tas.obs.length > n ? STORE.tas.obs[0] : null);
      if (rec && rec.locType === 'office') { rec.office = chOfficeSnap(off); if (w) { const ev = w.events[w.events.length - 1]; if (ev && ev.loc === 'Academy office') ev.loc = chOfficeLine(off); } }
      render();
    }
    return res;
  };
  return r;
};
// Mock: existing office observations were booked at the Luton office
function chOfficeSeedObs() {
  const s = chOfficeSnap(chOffices()[0] || { id: 'OL-1', name: 'Luton office', address: '60 Park Street, Luton', postcode: 'LU1 3ET' });
  Object.values(STORE.worlds || {}).forEach(w => (w.observations || []).forEach(o => { if (o.locType === 'office' && !o.office) o.office = { ...s }; }));
  ((STORE.tas && STORE.tas.obs) || []).forEach(o => { if (o.locType === 'office' && !o.office) o.office = { ...s }; });
}
const _isCh7a = initStore;
initStore = function () { const r = _isCh7a.apply(this, arguments); chOfficeSeedObs(); return r; };
if (typeof STORE !== 'undefined' && STORE.worlds) chOfficeSeedObs();

/* ---------- Approval items (System Admin raises → Super Admin decides) ---------- */
const chCanCfg = () => isSA() || (typeof isSys === 'function' && isSys());
function chRaise(type, related, reason, data) {
  let n = 9000 + ADMIN.queue.length, id = 'AQ-' + n; while (ADMIN.queue.some(i => i.id === (id = 'AQ-' + n))) n++;
  const at = now().toISOString(), i = { id, type, raisedBy: ADMIN.me.name, raised: at, status: 'Pending', first: 'Super Administrator', related: [related, 'a-config'], notes: [], reason, history: [[ADMIN.me.name, at, 'Raised', reason]], data };
  ADMIN.queue.unshift(i); return i;
}
const chOffAfterTxt = d => d.kind === 'retire' ? 'Retired' : chOfficeLine(d.after);
function chOfficeRequest(kind, o, after, reason) {
  const before = o ? chOfficeSnap(o) : null, label = (after || o).name;
  const i = chRaise(CH_OFF_T, `Office locations · ${label}`, reason, { kind, id: o ? o.id : null, before, after });
  if (o) o.pending = i.id;
  logA('System Configuration', `Office location · ${label}`, { add: 'Add requested', edit: 'Change requested', retire: 'Retire requested' }[kind], before ? chOfficeLine(before) : '—', chOffAfterTxt(i.data), reason);
  if (isSA()) saApply(i, reason); else if (ADMIN.myNotifs) ADMIN.myNotifs.unshift({ t: 'Office location change to approve', b: `${i.id} · ${label}`, at: now().toISOString(), unread: true, go: 'a-queue.' + i.id });
  return i;
}
CH7_EFFECTS[CH_OFF_T] = (i, a, r) => {
  const d = i.data || {}, o = d.id && chOffices().find(x => x.id === d.id);
  if (o && ['approve', 'reject', 'return'].includes(a)) delete o.pending;
  if (a !== 'approve') return;
  const at = now().toISOString();
  if (d.kind === 'add') { const id = 'OL-' + (chOffices().length + 1); ADMIN.chOffices.push({ id, ...d.after, status: 'Active', history: [[ADMIN.me.name, at, 'Added (' + i.id + ')', r]] }); d.id = id; }
  else if (o && d.kind === 'edit') { Object.assign(o, { name: d.after.name, address: d.after.address, postcode: d.after.postcode }); o.history.push([ADMIN.me.name, at, 'Changed (' + i.id + ')', r]); }
  else if (o && d.kind === 'retire') { o.status = 'Retired'; o.history.push([ADMIN.me.name, at, 'Retired (' + i.id + ')', r]); }
  logA('System Configuration', `Office location · ${(d.after || d.before).name}`, 'Office location change approved', d.before ? chOfficeLine(d.before) : '—', chOffAfterTxt(d), r);
};
function chBankRequest(after, reason) {
  const before = { ...chBankDet() }, i = chRaise(CH_BANKD_T, 'Bank details for transfers', reason, { before, after });
  ADMIN.chBankPending = i.id;
  logA('System Configuration', 'Bank details for transfers', 'Change requested', chBankTxt(before), chBankTxt(after), reason);
  chFinAll('Bank details change requested', `${i.id} · ${chBankTxt(after)} — raised by ${ADMIN.me.name}`, 'a-queue.' + i.id);
  if (isSA()) saApply(i, reason); else if (ADMIN.myNotifs) ADMIN.myNotifs.unshift({ t: 'Bank details change to approve', b: i.id, at: now().toISOString(), unread: true, go: 'a-queue.' + i.id });
  return i;
}
// Every Finance Admin is told about bank-detail requests and their outcome
const chFinAll = (t, b, go) => { if (STORE.fin) STORE.fin.notifs.unshift({ to: 'all', t, b, at: now().toISOString(), go, unread: true }); };
CH7_EFFECTS[CH_BANKD_T] = (i, a, r) => {
  if (!['approve', 'reject', 'return'].includes(a)) return;
  if (ADMIN.chBankPending === i.id) delete ADMIN.chBankPending;
  const d = i.data || {};
  if (a === 'approve') { ADMIN.chBank = { ...d.after }; const c = chCfg('Bank details for transfers'); if (c) { c.history.unshift([ADMIN.me.name, now().toISOString(), c.value, chBankTxt(d.after)]); c.value = chBankTxt(d.after); } logA('System Configuration', 'Bank details for transfers', 'Bank details change approved', chBankTxt(d.before), chBankTxt(d.after), r); }
  chFinAll(`Bank details change ${a === 'approve' ? 'approved' : a === 'reject' ? 'rejected' : 'returned'}`, `${i.id} · ${a === 'approve' ? 'New details: ' + chBankTxt(d.after) : r}`, 'a-queue.' + i.id);
};

/* ---------- System Configuration screen ---------- */
const _cfgCh7a = SCREENS['a-config'];
SCREENS['a-config'] = p => {
  let h = _cfgCh7a(p);
  h = h.replace(/(<td>LMS domain<\/td><td><strong>[^<]*<\/strong>)/, `$1<div class="xs muted">Set at deployment; the client's IT team points this subdomain to the LMS.</div>`);
  h = h.replace(/(<td>Bank details for transfers<\/td><td><strong>[^<]*<\/strong>)/, `$1${ADMIN.chBankPending ? `<div class="xs">${chip('Change pending', 'amber')} <a href="#a-queue.${ADMIN.chBankPending}" data-act="goTok" data-t="a-queue.${ADMIN.chBankPending}">${ADMIN.chBankPending}</a></div>` : ''}`);
  if (!chCanCfg()) h = h.replace(/<button class="btn btn-sm" data-act="cfgEdit" data-id="CF-BANK">Edit<\/button>/, `<span class="xs muted">${ic('lock', 12)} System Admin / Super Admin</span>`);
  const open = ADMIN.queue.filter(i => i.type === CH_OFF_T && isOpen(i) && i.data && i.data.kind === 'add');
  const rows = chOffices().map(o => `<tr><td>${esc(o.name)}</td><td>${esc(o.address)}</td><td class="mono">${esc(o.postcode)}</td><td>${chip(o.status, o.status === 'Active' ? 'green' : 'grey')}${o.pending ? ` ${chip('Change pending', 'amber')} <a href="#a-queue.${o.pending}" data-act="goTok" data-t="a-queue.${o.pending}" class="xs">${o.pending}</a>` : ''}</td><td class="nowrap">${chCanCfg() && o.status === 'Active' ? (o.pending ? `<button class="btn btn-sm" disabled title="A change to this location is awaiting Super Admin approval">Edit</button> <button class="btn btn-sm" disabled title="A change to this location is awaiting Super Admin approval">Retire</button>` : `<button class="btn btn-sm" data-act="chOffEdit" data-id="${o.id}">Edit</button> <button class="btn btn-sm btn-danger" data-act="chOffRetire" data-id="${o.id}">Retire</button>`) : ''}</td></tr>`)
    .concat(open.map(i => `<tr><td>${esc(i.data.after.name)}</td><td>${esc(i.data.after.address)}</td><td class="mono">${esc(i.data.after.postcode)}</td><td>${chip('Pending approval', 'amber')} <a href="#a-queue.${i.id}" data-act="goTok" data-t="a-queue.${i.id}" class="xs">${i.id}</a></td><td></td></tr>`)).join('');
  return h + `<section class="card ch-offices"><div class="row-b"><h2>Office locations</h2>${chCanCfg() ? `<button class="btn btn-sm" data-act="chOffAdd">${ic('plus', 14)}Add location</button>` : ''}</div>
    <p class="small muted">Used for Academy-office observations. Adding, changing or retiring a location is approved by the Super Administrator (reminder after 7 days). Past observations keep the location they were booked at.</p>
    <div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Name</th><th>Address</th><th>Postcode</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
};
const chOffFields = o => `<div class="form-grid"><div class="field"><label for="ol-n">Name</label><input class="input" id="ol-n" value="${esc(o ? o.name : '')}"></div><div class="field"><label for="ol-a">Address</label><input class="input" id="ol-a" value="${esc(o ? o.address : '')}"></div><div class="field"><label for="ol-p">Postcode</label><input class="input" id="ol-p" value="${esc(o ? o.postcode : '')}"></div></div>`;
const chOffRead = () => { const after = { name: mval('#ol-n').trim(), address: mval('#ol-a').trim(), postcode: mval('#ol-p').trim().toUpperCase() }; if (!after.name) { fieldErr('#ol-n', 'Enter a name'); return null; } if (!after.address) { fieldErr('#ol-a', 'Enter the address'); return null; } if (!after.postcode) { fieldErr('#ol-p', 'Enter the postcode'); return null; } return after; };
const chOffDone = i => { render(); toast(isSA() ? `Applied immediately — ${SA_TAG}.` : `Sent to the Super Administrator for approval (${i.id}).`); };
const chNoCfg = () => { if (chCanCfg()) return false; logA('System Configuration', 'Office locations / bank details', 'Blocked: not permitted', '—', '—', ADMIN.me.name); toast('Only the System Admin or Super Admin can change this.', 'err'); return true; };
ACT.chOffAdd = () => { if (chNoCfg()) return; reasonDlg({ title: 'Add office location', ok: isSA() ? 'Add now' : 'Send for approval', extra: chOffFields(null), onOk: r => { const a = chOffRead(); if (!a) return false; chOffDone(chOfficeRequest('add', null, a, r)); } }); };
ACT.chOffEdit = el => { if (chNoCfg()) return; const o = chOffices().find(x => x.id === el.dataset.id); if (!o || o.pending) return; reasonDlg({ title: 'Change ' + esc(o.name), ok: isSA() ? 'Save now' : 'Send for approval', extra: chOffFields(o), onOk: r => { const a = chOffRead(); if (!a) return false; if (chOfficeLine(a) === chOfficeLine(o)) { fieldErr('#ol-n', 'Nothing has changed'); return false; } chOffDone(chOfficeRequest('edit', o, a, r)); } }); };
ACT.chOffRetire = el => { if (chNoCfg()) return; const o = chOffices().find(x => x.id === el.dataset.id); if (!o || o.pending) return; reasonDlg({ title: 'Retire ' + esc(o.name), ok: isSA() ? 'Retire now' : 'Send for approval', danger: true, body: `<p class="small">${esc(chOfficeLine(o))} is removed from the booking list. Past observations keep this location. Nothing is deleted.</p>`, onOk: r => chOffDone(chOfficeRequest('retire', o, null, r)) }); };
// Bank details: the Edit button raises a "Bank details change" (never a direct edit)
const _cfgEditCh7a = ACT.cfgEdit;
ACT.cfgEdit = el => {
  const c = ADMIN.config.find(x => x.id === el.dataset.id);
  if (!c || c.name !== 'Bank details for transfers') return _cfgEditCh7a(el);
  if (chNoCfg()) return; if (ADMIN.chBankPending) { toast('A bank details change is already awaiting approval.', 'err'); return; }
  const b = chBankDet();
  reasonDlg({ title: 'Change bank details for transfers', ok: isSA() ? 'Save now' : 'Send for approval', body: `<p class="small">Shown to learners and agencies who pay by bank transfer. Approved by the Super Administrator; every Finance Admin is notified.</p>`,
    extra: `<div class="form-grid"><div class="field"><label for="bk-b">Bank</label><input class="input" id="bk-b" value="${esc(b.bank)}"></div><div class="field"><label for="bk-s">Sort code</label><input class="input mono" id="bk-s" value="${esc(b.sort)}"></div><div class="field"><label for="bk-a">Account number</label><input class="input mono" id="bk-a" value="${esc(b.acc)}"></div><div class="field"><label for="bk-n">Account name</label><input class="input" id="bk-n" value="${esc(b.name)}"></div></div>`,
    onOk: r => {
      const a = { bank: mval('#bk-b').trim(), sort: mval('#bk-s').trim(), acc: mval('#bk-a').trim(), name: mval('#bk-n').trim() };
      if (!a.bank) { fieldErr('#bk-b', 'Enter the bank'); return false; } if (!/^\d{2}-\d{2}-\d{2}$/.test(a.sort)) { fieldErr('#bk-s', 'Use the format 12-34-56'); return false; } if (!/^\d{8}$/.test(a.acc)) { fieldErr('#bk-a', 'Enter 8 digits'); return false; } if (!a.name) { fieldErr('#bk-n', 'Enter the account name'); return false; }
      if (chBankTxt(a) === chBankTxt(b)) { fieldErr('#bk-b', 'Nothing has changed'); return false; }
      const i = chBankRequest(a, r); render(); toast(isSA() ? `Applied immediately — ${SA_TAG}. Finance Admins are notified.` : `Sent to the Super Administrator for approval (${i.id}). Finance Admins are notified.`);
    } });
};

/* ---------- Queue item panels ---------- */
const _qdCh7a = queueDetail;
queueDetail = function (id) {
  const html = _qdCh7a(id), i = qItem(id); if (!i || ![CH_OFF_T, CH_BANKD_T].includes(i.type)) return html;
  const d = i.data || {};
  const panel = i.type === CH_OFF_T
    ? `<section class="card"><h2>Office location change</h2><dl class="kv"><dt>Change</dt><dd>${{ add: 'Add a location', edit: 'Change a location', retire: 'Retire a location' }[d.kind]}</dd><dt>Before</dt><dd>${d.before ? esc(chOfficeLine(d.before)) : '—'}</dd><dt>After</dt><dd><strong>${esc(chOffAfterTxt(d))}</strong></dd></dl><p class="xs muted">${ic('info', 12)} Raised by the System Admin · approved by the Super Admin · reminder after 7 days. Past observations keep the location they were booked at.</p></section>`
    : `<section class="card"><h2>Bank details change</h2><dl class="kv"><dt>Before</dt><dd><span class="strike">${esc(chBankTxt(d.before))}</span></dd><dt>After</dt><dd><strong>${esc(chBankTxt(d.after))}</strong></dd></dl><p class="xs muted">${ic('info', 12)} Raised by the System Admin · approved by the Super Admin · reminder after 7 days · every Finance Admin is notified of the request and the outcome.</p></section>`;
  const k = [html.indexOf('<div class="q3">'), html.indexOf('<div class="grid-2"><div class="stack-lg">')].find(x => x >= 0) ?? -1;
  return k < 0 ? html : html.slice(0, k) + `<div class="grid-2 k-panels">${panel}</div>` + html.slice(k);
};

/* ---------- Learner: Pay now by bank transfer (CH-35) ---------- */
const _payCh7a = SCREENS.payments;
SCREENS.payments = p => {
  let h = _payCh7a(p);
  h = h.replace(/(<button class="btn btn-sm" data-act="payInst" data-e="([^"]+)" data-n="(\d+)">Pay now<\/button>)/g, '$1 <button class="btn btn-sm" data-act="chPayBank" data-e="$2" data-n="$3">Bank transfer</button>');
  const wait = (STORE.chBank || []).filter(x => x.wv === S.variant && x.status === 'Awaiting confirmation');
  if (wait.length) { const k = h.indexOf('<div class="kpis">'); const note = `<div class="note b-amber" role="status">${ic('clock')}<div class="small"><strong>Bank transfer awaiting confirmation.</strong> ${wait.map(x => `${esc(x.title)} instalment ${x.n} · ${money(x.amount, 'GBP')} · reference <span class="mono">${esc(x.ref)}</span>`).join('; ')}. Finance confirms it when the money arrives.</div></div>`; h = k < 0 ? note + h : h.slice(0, k) + note + h.slice(k); }
  return h;
};
ACT.chPayBank = el => {
  const pl = W.plans.find(x => x.e === el.dataset.e), r = pl && pl.rows.find(x => x.n === +el.dataset.n); if (!r) return;
  const amount = r.amount - (r.paid || 0), ref = `${W.me.id.replace(/^IA-L-/, 'IA-')}-${String(pl.e).toUpperCase().slice(0, 3)}${r.n}`;
  openModal({ title: 'Pay by bank transfer', sub: `${esc(pl.title)} · instalment ${r.n}`, body: `<p><strong>Pay ${money(amount, 'GBP')} by bank transfer.</strong></p><div class="card flat"><p class="small">${chBankHtml(ref)}</p></div><p class="small">Use the reference so Finance can match your payment. It shows as <strong>Awaiting confirmation</strong> until Finance records it.</p>`,
    actions: [{ label: 'Cancel' }, { label: 'I\'ve made the transfer', cls: 'btn-primary', fn: () => {
      r.confirming = true; r.bankRef = ref;
      STORE.chBank = STORE.chBank || []; STORE.chBank.push({ wv: S.variant, lid: W.me.id, name: W.me.first + ' ' + W.me.last, ek: pl.e, e: pl.e, title: pl.title, course: pl.title, opt: 'instalment', n: r.n, ref, amount, at: now().toISOString(), status: 'Awaiting confirmation' });
      if (STORE.fin) STORE.fin.notifs.unshift({ to: 'all', t: 'Bank transfer awaiting confirmation', b: `${W.me.first} ${W.me.last} · ${pl.title} instalment ${r.n} · ${money(amount, 'GBP')} · ref ${ref}`, at: now().toISOString(), go: 'f-exceptions..bank', unread: true });
      render(); toast('Thanks — Finance confirms your transfer when it arrives.');
    } }] });
};
// Finance records the transfer → the learner's instalment is paid
const _ptCh7a = payTargets;
payTargets = function () { return _ptCh7a().map(t => t.chb && t.chb.wv ? { ...t, label: `${t.chb.name} — ${t.chb.title} — instalment ${t.chb.n} (${money(t.chb.amount, 'GBP')} bank transfer, awaiting confirmation)` } : t); };
const _rpCh7a = recordPayment;
recordPayment = function (t, a, ref, mode, r) {
  const x = t && t.chb; if (!x || !x.wv) return _rpCh7a.apply(this, arguments);
  const w = STORE.worlds[x.wv], pl = w && w.plans.find(p => p.e === x.e), row = pl && pl.rows.find(y => y.n === x.n), at = now().toISOString();
  x.status = 'Confirmed'; x.confirmed = { at, by: ADMIN.me.name, ref };
  if (row) { row.paid = (row.paid || 0) + a; row.status = row.paid >= row.amount ? 'Paid' : 'Partially paid'; row.confirming = false; row.receipt = 'RCP-' + ref.slice(-5); row.paidAt = at; }
  if (w) { w.tx.unshift({ at, ref, method: 'Bank transfer', amount: a, status: 'Succeeded', desc: `${x.title} — instalment ${x.n}`, cur: 'GBP' }); notifyLearner(x.wv, 'Payments', 'Bank transfer received', `${money(a, 'GBP')} for ${x.title} instalment ${x.n} is confirmed.`, 'payments'); }
  logA('Finance', ref, 'Recorded offline payment', money(t.due, 'GBP') + ' due', money(a, 'GBP') + ' paid', r); toast('Payment recorded — the bank transfer is confirmed.');
};

/* ---------- CH-36 placeholder register ---------- */
TBD_TOPICS.splice(0, TBD_TOPICS.length, ['Pending client', 'Fully assisted vs self-paced: what defines each, and is it set per course or per batch (P-31)', 'P-31', 'Admin → NVQ programme → Support type'], ['Pending client', 'short-course module lists (P-34)', 'P-34', 'Admin → Courses → short course → Modules']);
CH_TBD_RESOLVED.push(
  ['T04', 'Client to supply: bank payment instructions', 'CH-35', 'System Configuration → "Bank details for transfers" (Lloyds Bank), shown with a reference on the sign-up bank step, learner "Pay by bank transfer" and agency bank-transfer purchases.'],
  ['T06', 'Client to supply: privacy notice URL', 'CH-32', 'System Configuration → "Privacy notice": https://welfarehs.co.uk/privacy-policy.'],
  ['T07', 'Client to supply: verification domain', 'CH-33', 'System Configuration → "LMS domain" (lms.welfarehs.co.uk); links and QR codes use https://<LMS domain>/verify/<token>.'],
  ['T08', 'Client to supply: Academy office address', 'CH-34', 'System Configuration → "Office locations": Luton office — 60 Park Street, Luton, LU1 3ET.']);
const _tbdRegCh7a = SCREENS['tbd-register'];
SCREENS['tbd-register'] = p => _tbdRegCh7a(p).replace(/<p class="small muted">Remaining: T04[^<]*<\/p>/, '<p class="small muted">Every "Client to supply" topic is resolved. Remaining: P-31 and P-34 (Pending client).</p>');
// Open client items: status of each (P-27 … P-35); only P-31 and P-34 are still pending
const CH_OPEN = [
  ['P-27', 'Observation fee', 'Resolved by CH-38 (built in 7b)', 'blue', 'One fee per learner per course (£70 fully assisted / £100 self-paced), raised at the first confirmed observation.'],
  ['P-28', 'Mistyped country', 'Resolved (Data Correction fallback)', 'green', 'A genuinely mistyped country is corrected only through Data Correction (System Admin review → Super Admin final, audited) — never as a profile request. If the region changes between UK and UAE, an admin moves the learner\'s data (audited, one-off).'],
  ['P-29', 'Client content', 'Resolved by CH-32 – CH-35 (Batch 7a)', 'green', 'Privacy notice URL, LMS domain, office locations and bank details are System Configuration settings.'],
  ['P-30', 'Intake choice at sign-up', 'Resolved by CH-42 (built in 7c)', 'blue', 'The system assigns the nearest batch with space; the learner doesn\'t choose.'],
  ['P-31', 'Fully assisted vs self-paced', 'Pending client', 'amber', 'What defines each, and is it set per course or per batch? The prototype sets it per course (Admin → NVQ programme → Support type); default Fully assisted.'],
  ['P-32', 'Released seat and content', 'Resolved (built in 7c)', 'blue', 'Content does not lock when a seat is released; the normal overdue rules still apply.'],
  ['P-33', 'Coordinator assessing their own batch', 'Resolved (built in 7c)', 'blue', 'A batch\'s Academic Coordinator can\'t be its assignment, PD or observation assessor.'],
  ['P-34', 'Short-course module lists', 'Pending client', 'amber', 'The module lists of each short course are prototype examples until the client supplies them (Courses → course → Modules).'],
  ['P-35', 'Bank details', 'Resolved', 'green', 'Lloyds Bank details confirmed; changes: System Admin → Super Admin, audited, all Finance Admins notified.']];
CH_PENDING.splice(0, CH_PENDING.length, ...CH_OPEN.filter(r => r[2] === 'Pending client').map(r => [r[0], r[1], r[4]]));
const chOpenSection = () => `<section class="card"><h2>Open client items</h2>${recTbl(['ID', 'Topic', 'Status', 'What it means in the prototype'], CH_OPEN.map(r => [r[0], esc(r[1]), chip(r[2], r[3]), esc(r[4])]))}<p class="small muted">Still pending: ${CH_PENDING.map(r => r[0]).join(', ')}.</p></section>`;

/* ---------- Records ---------- */
CH_SOURCES.push(['S7', 'Client answers to the Batch 7 brief, 13 Oct'], ['S8', 'Client follow-up: fee rule and workplace withdrawal, 13 Oct']);
CH_LOG.push(
  ['CH-32', 'Privacy notice URL (https://welfarehs.co.uk/privacy-policy)', 'S7', '7a'],
  ['CH-33', 'Verification address: <LMS domain>/verify/<token>', 'S7', '7a'],
  ['CH-34', 'Office locations (Luton office); changes approved by the Super Admin', 'S7', '7a'],
  ['CH-35', 'Bank details for transfers (Lloyds Bank); changes approved by the Super Admin', 'S7', '7a'],
  ['CH-36', 'Placeholder register: client topics resolved; P-31 added', 'S7', '7a'],
  ['CH-37', 'Academy-office observation: request, advice, consent and approval', 'S7', '7b'],
  ['CH-38', 'Observation fee (£70 fully assisted / £100 self-paced), once per learner per course', 'S7→S8', '7b'],
  ['CH-39', 'Observation fee waiver (Finance review → Super Admin)', 'S7', '7b'],
  ['CH-40', 'Observation fee non-refundable; rescheduling has no effect', 'S7→S8', '7b'],
  ['CH-41', 'Learner Payments: progress dial and payment cards', 'S7', '7b'],
  ['CH-42', 'Sign-up assigns the nearest batch; admin batch changes before the start', 'S7/S8', '7c'],
  ['CH-43', 'Workplace withdraws permission: Coordinator advises an office observation', 'S8', '7b']);
CH_APPLIED['7a'] = '13 Oct 2026';
const _cdLogCh7a = SCREENS['cd-log'];
SCREENS['cd-log'] = p => _cdLogCh7a(p).replace('Client decisions — change list (CH-01 … CH-31)', 'Client decisions — change list (CH-01 … CH-43)').replace(/<section class="card"><h2>Pending client<\/h2>[\s\S]*?<\/section>/, () => chOpenSection());
UXC.push(['CH batch 7a', 'Client decisions — Batch 7a (CH-32 … CH-36)', [
  'CH-32: System Configuration → "Privacy notice" (https://welfarehs.co.uk/privacy-policy) replaces the placeholder on the verification page, the workplace privacy notice and the workplace email footer.',
  'CH-33: System Configuration → "LMS domain" (lms.welfarehs.co.uk, with the note "Set at deployment; the client\'s IT team points this subdomain to the LMS."). "Copy verification link" and the certificate QR codes use https://<LMS domain>/verify/<token>; "Open the page" still opens the prototype\'s verification page.',
  'CH-34: System Configuration → "Office locations" (name, address, postcode, Active/Retired), starting with "Luton office — 60 Park Street, Luton, LU1 3ET". Adding, changing or retiring a location raises "Office location change" (System Admin → Super Admin, reminder after 7 days; the Super Admin\'s own change applies immediately; audited). Booking an office observation uses a dropdown of active locations; past observations keep the location they were booked at.',
  'CH-35: System Configuration → "Bank details for transfers" (Lloyds Bank · 30-90-89 · 80060562 · Welfare Health and Safety Academy; confirmed by the client, P-35), shown with a reference on the sign-up bank step, the learner\'s new "Bank transfer" option next to Pay now (Awaiting confirmation until Finance records it) and agency bank-transfer purchases. Changes raise "Bank details change" (System Admin → Super Admin, reminder after 7 days); every Finance Admin is notified of the request and the outcome.',
  'P-28 (resolved): a genuinely mistyped country is corrected only through Data Correction — Learner 360 → Raise Data Correction → "Country of residence" (a country list and the note "If the region changes between UK and UAE, an admin moves the learner\'s data (audited, one-off)."), System Admin review → Super Admin final; on approval the country changes, audited, with a one-off data-region move entry when UK ↔ UAE. Never a profile request. P-35 (resolved): the bank details are confirmed — no "Proposed default" tag.',
  'CH-36: the four "Client to supply" topics (T04, T06, T07, T08) are resolved; the register has two topics, both Pending client: P-31 (fully assisted vs self-paced) and P-34 (short-course module lists, tagged on Courses → Modules). The Decisions Log\'s "Open client items" shows each item\'s status: P-27, P-30, P-32, P-33 resolved (built in 7b / 7c), P-28, P-29, P-35 resolved. "Who approves what" has 17 rows. TBD-register.txt regenerated.']]);
const _aIdxCh7a = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxCh7a(p).replace(/(<section class="card idx-sec"><h2>Client decisions \(CH\)<\/h2><ul class="idx-list">)/, `$1${[
  chIdxLi('System Configuration — privacy notice, LMS domain, bank details, office locations', { act: 'aJump', t: 'a-config' }, 'CH-32 – CH-35 — the settings that replace the client placeholders.'),
  chIdxLi('Approvals item — Office location change', { act: 'aJump', t: 'a-queue.AQ-9001' }, 'CH-34 — a new office location awaiting the Super Administrator.'),
  chIdxLi('Approvals item — Bank details change', { act: 'aJump', t: 'a-queue.AQ-9002' }, 'CH-35 — new bank details awaiting approval; Finance Admins are told.')].join('')}`);
const _idxCh7a = SCREENS.index;
SCREENS.index = p => _idxCh7a(p).replace(/(<section class="card idx-sec"><h2>Client decisions \(CH\)<\/h2><ul class="idx-list">)/, `$1${chIdxLi('Payments — Pay by bank transfer', { go: 'payments' }, 'CH-35 — the Academy\'s bank details with your payment reference.')}`);

/* ---------- Mock: one office location change and one bank details change awaiting the Super Admin ---------- */
function chB7aSeedQ() {
  if (!ADMIN || !ADMIN.queue || ADMIN.queue.some(i => i.id === 'AQ-9001')) return;
  const at = D(-2, '10:20'), add = { name: 'Milton Keynes office', address: '12 Silbury Boulevard, Milton Keynes', postcode: 'MK9 2AF' };
  ADMIN.queue.push({ id: 'AQ-9001', type: CH_OFF_T, raisedBy: SYS_A, raised: at, status: 'Pending', first: 'Super Administrator', related: ['Office locations · Milton Keynes office', 'a-config'], notes: [], reason: 'Second office for learners in Buckinghamshire.', history: [[SYS_A, at, 'Raised', 'Second office for learners in Buckinghamshire.']], data: { kind: 'add', id: null, before: null, after: add } });
  const at2 = D(-1, '16:05'), nb = { ...chBankDet(), acc: '80060570' };
  ADMIN.queue.push({ id: 'AQ-9002', type: CH_BANKD_T, raisedBy: SYS_A, raised: at2, status: 'Pending', first: 'Super Administrator', related: ['Bank details for transfers', 'a-config'], notes: [], reason: 'Finance asked to use the new client account for transfers.', history: [[SYS_A, at2, 'Raised', 'Finance asked to use the new client account for transfers.']], data: { before: { ...chBankDet() }, after: nb } });
  ADMIN.chBankPending = 'AQ-9002';
}
const _baCh7aQ = buildAdmin;
buildAdmin = function () { const r = _baCh7aQ.apply(this, arguments); chB7aSeedQ(); return r; };
if (typeof ADMIN !== 'undefined' && ADMIN) chB7aSeedQ();

/* ---------- P-28: a mistyped country is corrected only through Data Correction ---------- */
const CH_CTRY = 'Country of residence';
const CH_REGION_NOTE = 'If the region changes between UK and UAE, an admin moves the learner\'s data (audited, one-off).';
const _raiseDcCh7a = ACT.raiseDC;
ACT.raiseDC = el => {
  _raiseDcCh7a(el); const L = learnerById(el.dataset.id), f = $('#modal-root #dc-f'); if (!L || !f || !MODAL) return;
  f.insertAdjacentHTML('beforeend', `<option>${CH_CTRY}</option>`); f.setAttribute('data-onchange', 'chDcField'); f.dataset.l = L.id;
  const a = MODAL.actions.find(x => x.label === 'Raise correction'), fn = a && a.fn;
  if (a) a.fn = (...x) => {
    const ctry = mval('#dc-f') === CH_CTRY, pv = mval('#dc-p');
    if (ctry && pv === L.country) { fieldErr('#dc-p', 'That is the current country'); return false; }
    const n = ADMIN.queue.length, res = fn(...x);
    const i = ADMIN.queue.length > n && ADMIN.queue[0].type === 'Data correction' ? ADMIN.queue[0] : null;
    if (ctry && i) { i.data.current = L.country; i.data.lid = L.id; i.data.regionMove = regionOf(L.country) !== regionOf(pv); render(); }
    return res;
  };
};
INP.chDcField = el => {
  const L = learnerById(el.dataset.l), ctry = el.value === CH_CTRY, p = $('#dc-p'), note = $('#dc-cnote');
  if (ctry && p && p.tagName !== 'SELECT') p.outerHTML = `<select class="select" id="dc-p"><option value="">Choose the correct country</option>${REG_COUNTRIES.map(c => c[0]).filter(c => c !== (L && L.country)).map(c => `<option>${esc(c)}</option>`).join('')}</select>`;
  if (!ctry && p && p.tagName === 'SELECT') p.outerHTML = '<input class="input" id="dc-p">';
  if (ctry && !note) $('#dc-p').closest('.field').insertAdjacentHTML('afterend', `<div class="note b-blue" id="dc-cnote">${ic('info')}<div class="small"><strong>Only for a genuine mistake at registration</strong> — the country can't be changed by a profile request. Current: ${esc(L ? L.country : '—')}. ${CH_REGION_NOTE}</div></div>`);
  if (!ctry && note) note.remove();
};
CH7_EFFECTS['Data correction'] = (i, a, r) => {
  const d = i.data || {}; if (a !== 'approveFinal' || d.field !== CH_CTRY || d.applied) return;
  const L = learnerById(d.lid) || (d.v && STORE.worlds[d.v] ? { id: STORE.worlds[d.v].me.id, v: d.v } : null); if (!L) return;
  const was = d.current, w = L.v ? STORE.worlds[L.v] : null, rec = ADMIN.learners.find(x => x.id === L.id);
  if (w) w.me.country = d.proposed; if (rec) rec.country = d.proposed; d.applied = true;
  logA('Learners', L.id, 'Data correction (final)', was, d.proposed, r);
  if (regionOf(was) !== regionOf(d.proposed)) logA('Data protection', L.id, 'Data region move (one-off)', regionOf(was), regionOf(d.proposed), 'Country corrected by ' + i.id);
  if (L.v) notifyLearner(L.v, 'Profile', 'Your country was corrected', `Country of residence: ${d.proposed} (Data Correction ${i.id}).`, 'profile');
};
const _qdCh7aDc = queueDetail;
queueDetail = function (id) { const h = _qdCh7aDc(id), i = qItem(id); if (!i || i.type !== 'Data correction' || !i.data || i.data.field !== CH_CTRY) return h; const k = [h.indexOf('<div class="q3">'), h.indexOf('<div class="grid-2"><div class="stack-lg">')].find(x => x >= 0) ?? -1; const n = `<div class="note b-blue">${ic('info')}<div class="small"><strong>Country correction:</strong> ${esc(i.data.current || '—')} → <strong>${esc(i.data.proposed)}</strong>${i.data.regionMove ? ` — data region ${regionOf(i.data.current)} → ${regionOf(i.data.proposed)}` : ''}. ${CH_REGION_NOTE}</div></div>`; return k < 0 ? h : h.slice(0, k) + n + h.slice(k); };

/* ---------- P-34: short-course module lists are Pending client ---------- */
const _modsCh7a = chModulesTab;
chModulesTab = function (c) { return `<div class="note b-grey">${ic('info')}<div class="small"><span class="tbd" title="${TBD_TIP}">Pending client: short-course module lists (P-34)</span> The module lists are prototype examples until the client supplies each course's list.</div></div>` + _modsCh7a.apply(this, arguments); };
