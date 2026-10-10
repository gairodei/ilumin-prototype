/* ============================================================
   UX polish v2 — Phase 5 (remaining items): interaction quality.
   Presentation and interaction only; decisions, rules, statuses and stored data are unchanged.
     dialogs      focus is trapped inside an open dialog and returns to the control that opened it
     validation   once a field has an error it is re-checked as you type; email and number fields check themselves
     disabled     every disabled button says why (tooltip)
     drafts       typed text in a dialog or a page box is not lost by accident: you are asked before it is discarded
     auto-save    one indicator style everywhere (Saving… / Saved 14:05 / Saved on this device / Save failed — retrying)
     release      Release queue keyboard: J / K or arrows to move, Enter opens, R releases, X selects, ? help
     loading      skeleton placeholders while a page loads on a slow connection (demo toggle) and after "Try again"
     instant      mark-as-read and preference switches apply at once and roll back with a message if saving fails
     phones       the page's main action stays in reach at the bottom of the screen
   Loads after purposes.js, before guard.js.
   ============================================================ */
'use strict';

/* ---------- Dialogs: focus trap and focus return ---------- */
const MODAL_FOCUSABLE = 'button, [href], input, select, textarea, [contenteditable="true"], [tabindex]:not([tabindex="-1"])';
function modalFocusables() {
  const m = document.querySelector('#modal-root .modal'); if (!m) return [];
  return [...m.querySelectorAll(MODAL_FOCUSABLE)].filter(e => !e.disabled && e.type !== 'hidden' && e.getAttribute('tabindex') !== '-1' && visible(e));
}
// Tab and Shift+Tab cycle inside the dialog; focus that has escaped is brought back in. Handled here in full, so the
// older handler (which counted hidden and disabled fields) doesn't also act.
document.addEventListener('keydown', e => {
  if (e.key !== 'Tab' || !MODAL) return;
  e.stopPropagation();
  const m = document.querySelector('#modal-root .modal'), f = modalFocusables(), a = document.activeElement;
  if (!f.length) { e.preventDefault(); if (m) m.focus(); return; }
  if (!m || !m.contains(a)) { e.preventDefault(); (e.shiftKey ? f[f.length - 1] : f[0]).focus(); return; }
  if (e.shiftKey && (a === f[0] || a === m)) { e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && a === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
}, true);
// Focus moved behind an open dialog (a click on the page, a script) goes back into the dialog
document.addEventListener('focusin', e => {
  if (!MODAL || !e.target || !e.target.closest) return;
  if (e.target.closest('#modal-root, #demo-root, #toasts, #undo-root')) return;
  const f = modalFocusables(), m = document.querySelector('#modal-root .modal');
  (f[0] || m) && (f[0] || m).focus();
});
const _renderModalP = renderModal;
renderModal = function () { const r = _renderModalP.apply(this, arguments); const m = document.querySelector('#modal-root .modal'); if (m) { m.setAttribute('tabindex', '-1'); dtipPass(m); } return r; };
// Remember the opener by its attributes too: if the page redraws while the dialog is open, the same control is found again
const _openModalP = openModal;
openModal = function (m) {
  const prev = MODAL, sig = prev ? prev.focusSig : (focusSig(document.activeElement) || (lastUsed && Date.now() - lastUsed.at < 2000 ? lastUsed.sig : null));
  const r = _openModalP.apply(this, arguments); if (MODAL) MODAL.focusSig = sig; return r;
};
const _closeModalP = closeModal;
closeModal = function () {
  const m = MODAL, r = _closeModalP.apply(this, arguments);
  if (m && !MODAL) {
    const a = document.activeElement;
    if (!a || a === document.body || !document.contains(a)) {
      if (!(m.focusSig && focusBack(m.focusSig))) { const h = document.querySelector('#main h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }
    }
  }
  return r;
};

/* ---------- Validation as you type ----------
   A field that has shown an error is re-checked on every keystroke: the message clears as soon as the entry is right
   and comes back if it is emptied again. Email and number fields check their format once you have typed and moved on.
   Submitting still runs every rule as before. */
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const REQUIRED_MSG = /^(Enter|Choose|Select|Add|Type|Give)\b|required/i;
const isEmailField = el => el.type === 'email' || /valid email/i.test(el.dataset.errMsg || '');
function liveMsg(el) {
  const v = (el.value || '').trim(), had = el.dataset.errMsg || '';
  if (!v) return REQUIRED_MSG.test(had) ? had : ''; // empty: only a "required" message comes back (no nagging otherwise)
  if (isEmailField(el) && !EMAIL_RX.test(v)) return /valid email/i.test(had) ? had : 'Enter a valid email address, like name@example.com';
  if (el.type === 'number') { const n = +v, lo = el.getAttribute('min'), hi = el.getAttribute('max'); if (isNaN(n) || (lo !== null && n < +lo) || (hi !== null && n > +hi)) return lo !== null && hi !== null ? `Enter a number from ${lo} to ${hi}` : lo !== null ? `Enter ${lo} or more` : `Enter ${hi} or less`; }
  const ml = +el.getAttribute('minlength') || 0; if (ml && v.length < ml) return `Use at least ${ml} characters`;
  return '';
}
function liveShow(el, msg) {
  const f = el.closest('.field') || el.parentElement; if (!f) return;
  let e = f.querySelector('.err');
  if (!msg) { if (e) e.remove(); el.removeAttribute('aria-invalid'); return; }
  el.setAttribute('aria-invalid', 'true');
  if (!e) { f.insertAdjacentHTML('beforeend', `<span class="err" role="status">${ic('alert', 14)}<span class="err-t"></span></span>`); e = f.querySelector('.err'); }
  if (!e.id) e.id = (el.id || 'f' + Math.random().toString(36).slice(2, 8)) + '-err';
  const t = e.querySelector('.err-t'); if (t) t.textContent = msg; else e.innerHTML = ic('alert', 14) + `<span class="err-t">${esc(msg)}</span>`;
  const d = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean); if (!d.includes(e.id)) el.setAttribute('aria-describedby', d.concat(e.id).join(' '));
}
const _fieldErrP = fieldErr;
fieldErr = function (sel, msg) {
  _fieldErrP.apply(this, arguments);
  const el = $(sel); if (!el) return;
  el.dataset.errMsg = msg; el.dataset.live = '1';
  const e = (el.closest('.field') || el.parentElement || document).querySelector('.err');
  if (e) { if (!e.id) e.id = (el.id || 'f') + '-err'; const d = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean); if (!d.includes(e.id)) el.setAttribute('aria-describedby', d.concat(e.id).join(' ')); }
};
const liveTarget = el => el && el.matches && el.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea, select') && el.closest('#app, #modal-root');
function liveCheck(el) {
  if (!liveTarget(el) || !el.dataset.live) return;
  // an error the field can't re-check by itself (already used, dates out of order…) clears once you change the entry
  liveShow(el, liveMsg(el));
}
document.addEventListener('input', e => liveCheck(e.target));
document.addEventListener('change', e => liveCheck(e.target));
document.addEventListener('focusout', e => {
  const el = e.target; if (!liveTarget(el) || el.dataset.live || !(el.value || '').trim()) return;
  if (isEmailField(el) || el.type === 'number' || el.hasAttribute('minlength')) { el.dataset.live = '1'; liveCheck(el); }
});

/* ---------- Every disabled button says why ---------- */
const subOf = k => (typeof tasSubs === 'function' ? (tasSubs() || []).find(x => x.key === k) : null);
const DISABLED_WHY = {
  appApprove: () => 'Approve every mandatory document first.',
  tfaFinish: () => 'Tick the box to confirm you have saved your recovery codes.',
  tfaResend: () => 'You can ask for another code when the countdown ends.',
  regResend: () => 'You can ask for another code when the countdown ends.',
  dtPg: b => /prev/i.test(b.getAttribute('aria-label') || '') ? 'You are on the first page.' : /next/i.test(b.getAttribute('aria-label') || '') ? 'You are on the last page.' : 'This is the page you are on.',
  agAssignFrom: () => 'No seats to assign: the bundle has expired or every seat is in use.',
  agCertDl: () => 'A revoked certificate can\'t be downloaded.',
  agAsStep: () => 'Make a choice on this step first.',
  lmSet: () => 'This link has already been used.',
  invPay: () => 'You raised this invoice, so another Finance Admin records the payment.',
  qRecord: () => 'You marked this work, so you can\'t record a finding on it (conflict of interest).',
  qNav: b => b.dataset.d === '1' ? 'This is the last record in the list.' : 'This is the first record in the list.',
  reqAttempts: () => 'You already have a request waiting for a decision.',
  reqChange: () => 'A change request for this detail is already waiting.',
  quizGo: () => 'This is the first question.',
  mkNav: b => /Previous/.test(b.textContent) ? 'This is the first submission in your queue.' : 'This is the last submission in your queue.',
  mkMet: b => mkWhy(b), mkRag: b => mkWhy(b), mkVerify: b => mkWhy(b), mkSave: b => mkWhy(b),
  mkRelease: b => { const s = subOf(b.dataset.k); return s && s.toMark && s.L.status !== 'Discontinued' ? 'Mark at least one question first.' : mkWhy(b); },
  mkRec: () => 'Your role can\'t record recommendations.',
  tasAdj: () => 'Your role can\'t adjust attendance.',
  tasReviewed: () => 'This register is already marked as reviewed.',
  qDo: () => 'You raised this item, or it is about you, so someone else must act on it.',
  fmtCmd: () => 'Formatting is off because this text can\'t be edited.',
  viewCert: () => 'The certificate isn\'t issued yet.',
  revokeRole: () => 'This role can\'t be removed here.',
  sysRoleWhy: () => 'Only the Super Administrator can change this.',
  wpcStep: () => 'Complete the step above first.',
};
function mkWhy(b) {
  const s = subOf(b.dataset.k);
  if (s && s.L.status === 'Discontinued') return 'This learner is discontinued, so marking is closed.';
  if (s && typeof relStore === 'function' && relStore()[s.key]) return 'Sent to the Coordinator for release, so your marking is read-only.';
  return s && s.status ? `Status: ${s.status} — this submission isn't waiting for marking, so it is read-only.` : 'This submission isn\'t waiting for marking, so it is read-only.';
}
function disabledWhy(b) {
  const near = b.getAttribute('aria-describedby') && document.getElementById(b.getAttribute('aria-describedby').split(' ')[0]);
  if (near && near.textContent.trim()) return near.textContent.trim();
  const f = DISABLED_WHY[b.dataset.act]; if (f) return f(b);
  if (b.matches('[data-pwsubmit]')) return 'Meet every password rule above first.';
  if (b.id === 'tfa-done') return DISABLED_WHY.tfaFinish(b);
  if (b.id === 'wg-go') return 'Tick both boxes and type your name to sign first.';
  if (/^Start marking/.test(b.textContent.trim())) return 'Nothing is waiting for you to mark.';
  if (/Choose quantity/.test(b.textContent)) return 'Choose a quantity first.';
  if (b.closest('#modal-root')) return 'Complete the required details above first.';
  if (b.closest('.rte-tb')) return DISABLED_WHY.fmtCmd(b);
  return 'Not available right now.';
}
// Titles added here are marked, so they are removed again when the button becomes available
function dtipPass(root) {
  (root || document).querySelectorAll('button').forEach(b => {
    const mine = b.hasAttribute('data-dtip');
    if (b.disabled) { if (!b.getAttribute('title') || mine) { const t = disabledWhy(b); if (b.getAttribute('title') !== t) b.setAttribute('title', t); b.setAttribute('data-dtip', ''); } }
    else if (mine) { b.removeAttribute('title'); b.removeAttribute('data-dtip'); }
  });
}
AFTER.push(() => dtipPass(document.getElementById('app')));
['input', 'change', 'click'].forEach(t => document.addEventListener(t, () => setTimeout(() => { dtipPass(document.getElementById('app')); dtipPass(document.getElementById('modal-root')); }, 0)));

/* ---------- Drafts: typed text isn't lost by accident ----------
   Only boxes whose text isn't kept anywhere count: answer sheets, marking, coordinator feedback, observation notes,
   IQA findings and workplace replies keep their own drafts (those have their own handling or simply persist).
   Typing counts (input events); a value set by a script without typing does not. Nothing is blocked: you are asked first. */
const DRAFTS = new Set();
let lastEditAt = 0;
const draftBox = el => el && el.matches && el.matches('textarea, [contenteditable="true"], input[type="text"], input:not([type]), input[type="email"], input[type="tel"], input[type="url"]')
  && !el.closest('[data-oninput], [data-onchange]') && !el.matches('[type="search"], [role="searchbox"]') && !el.closest('.dt-bar, .hdr-search, .adm-hdr, [role="search"], .demo-panel, #demo-root');
document.addEventListener('input', e => {
  lastEditAt = Date.now();
  const el = e.target; if (!draftBox(el)) return;
  // page boxes: free text only (single-line page inputs are filters and lookups); dialogs: any typed field
  if (!el.closest('#modal-root') && !el.matches('textarea, [contenteditable="true"]')) return;
  DRAFTS.add(el);
}, true);
const draftVal = el => (el.isContentEditable ? el.textContent : el.value || '');
const draftChanged = el => document.contains(el) && draftVal(el).trim() && (el.isContentEditable || draftVal(el) !== (el.defaultValue || ''));
function draftsIn(sel) { [...DRAFTS].forEach(el => { if (!document.contains(el)) DRAFTS.delete(el); }); return [...DRAFTS].filter(el => el.closest(sel) && draftChanged(el)); }
const modalDirty = () => !!MODAL && draftsIn('#modal-root').length > 0;
const snippet = el => { const t = draftVal(el).trim().replace(/\s+/g, ' '); return t.length > 60 ? t.slice(0, 57) + '…' : t; };
// Discard what was typed in a dialog? — "Keep editing" puts the dialog back exactly as it was
function askDiscard() {
  const prev = MODAL, root = document.getElementById('modal-root'), fields = [...root.querySelectorAll('.modal input, .modal textarea, .modal select, .modal [contenteditable="true"]')];
  const vals = fields.map(f => f.isContentEditable ? f.innerHTML : (f.type === 'checkbox' || f.type === 'radio') ? f.checked : f.value), dirty = fields.map(f => DRAFTS.has(f));
  const title = String(prev.title || '').replace(/<[^>]+>/g, '');
  openModal({ title: 'Discard what you typed?', dismissable: false, body: `<p>Your text in “${esc(title)}” hasn't been saved or sent. If you close the dialog, it will be lost.</p>`,
    actions: [{ label: 'Discard', cls: 'btn-danger', fn: () => { MODAL = prev; DRAFTS.clear(); closeModal(); return false; } },
      { label: 'Keep editing', cls: 'btn-primary', fn: () => {
        MODAL = prev; renderModal();
        const now = [...root.querySelectorAll('.modal input, .modal textarea, .modal select, .modal [contenteditable="true"]')];
        now.forEach((f, i) => { if (i >= vals.length) return; if (f.isContentEditable) f.innerHTML = vals[i]; else if (f.type === 'checkbox' || f.type === 'radio') f.checked = vals[i]; else f.value = vals[i]; if (dirty[i]) DRAFTS.add(f); });
        const first = now.find((f, i) => dirty[i]); setTimeout(() => first && first.focus(), 0); return false;
      } }] });
}
const _mClose = ACT.modalClose, _mScrim = ACT.modalScrim;
ACT.modalClose = (el, e) => { if (modalDirty()) return askDiscard(); return _mClose(el, e); };
ACT.modalScrim = (el, e) => { if (MODAL && MODAL.dismissable && modalDirty()) return askDiscard(); return _mScrim(el, e); };
document.addEventListener('keydown', e => { if (e.key === 'Escape' && MODAL && MODAL.dismissable && modalDirty()) { e.preventDefault(); e.stopPropagation(); askDiscard(); } }, true);
document.addEventListener('click', e => {
  if (!MODAL) return;
  const mi = e.target.closest && e.target.closest('#modal-root [data-mi]'); if (!mi) return;
  const a = MODAL.actions[+mi.dataset.mi]; if (!a || a.fn || !modalDirty()) return;
  e.preventDefault(); e.stopPropagation(); askDiscard();
}, true);
// Using a box's own button (Send, Save, Post…) or submitting its form counts as dealing with the text
const boxHome = el => el.closest('form, .card, section, .modal-b') || el.parentElement;
document.addEventListener('submit', e => { [...DRAFTS].forEach(b => { if (e.target.contains(b)) DRAFTS.delete(b); }); }, true);
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('#app button:not([data-go]), #app [type="submit"]'); if (!b || NAV_ACTS.has(b.dataset.act)) return;
  [...DRAFTS].forEach(x => { if (!x.closest('#modal-root') && boxHome(x) && boxHome(x).contains(b)) DRAFTS.delete(x); });
}, true);
// Leaving a page with typed text (or an answer sheet whose last change hasn't saved)
const NAV_ACTS = new Set(['goTok', 'aJump', 'agyGo', 'cooGo', 'cooIdxGo', 'jump', 'switchRole', 'scOpen', 'roleBack', 'openIndex', 'signOut', 'resetDemo']);
const unsavedSheet = () => S.portal === 'learner' && S.route === 'assignment' && typeof DIRTY !== 'undefined' && DIRTY && !!document.querySelector('#savechip.fail, #savechip.local');
let NAV_BYPASS = false;
document.addEventListener('click', e => {
  if (NAV_BYPASS) { NAV_BYPASS = false; return; }
  const el = e.target.closest && e.target.closest('[data-go], [data-act]'); if (!el || el.closest('#modal-root') || MODAL) return;
  if (!(el.dataset.go || NAV_ACTS.has(el.dataset.act))) return;
  const boxes = draftsIn('#app'), sheet = unsavedSheet(); if (!boxes.length && !sheet) return;
  e.preventDefault(); e.stopPropagation();
  const box = boxes[0];
  openModal({ title: 'Leave this page?', body: box ? `<p>What you typed hasn't been saved or sent:</p><p class="small muted">“${esc(snippet(box))}”</p><p>If you leave, it will be lost.</p>` : `<p>Your latest changes to the answer sheet haven't reached the server yet — we're still retrying. If you leave now, they may be lost.</p>`,
    actions: [{ label: 'Leave anyway', cls: 'btn-danger', fn: () => { DRAFTS.clear(); setTimeout(() => { NAV_BYPASS = true; el.click(); NAV_BYPASS = false; }, 0); } }, { label: 'Stay on this page', cls: 'btn-primary', fn: () => { setTimeout(() => (box || document.querySelector('#main .rte-body') || el).focus(), 0); } }] });
}, true);
window.addEventListener('beforeunload', e => {
  const recent = lastEditAt && (typeof DIRTY !== 'undefined' && DIRTY || (S.tas && S.tas.dirty) || (S.coo && S.coo.dirty));
  if (draftsIn('#app, #modal-root').length || recent) { e.preventDefault(); e.returnValue = ''; }
});

/* ---------- One auto-save indicator ----------
   Every auto-save chip (answer sheet, quiz, Marking Workspace) uses the same four states, icons, wording and
   announcements. Offline, a draft that can't reach the server reads "Saved on this device". */
const SAVE_STATES = {
  busy: ['refresh', 'Saving…', 'Saving your draft.'],
  ok: ['check', 'Saved', 'Your draft is saved. It saves again automatically as you work.'],
  local: ['clock', 'Saved on this device', 'You\'re offline. Your draft is kept on this device and saves when you\'re back online.'],
  fail: ['alert', 'Save failed — retrying', 'The server didn\'t respond. Your text is kept on this page and we keep trying.'],
  idle: ['check', 'Draft auto-saves', 'Your draft saves automatically as you work.'],
};
function chipState(el) {
  const t = el.textContent.trim();
  if (/Saving/.test(t)) return 'busy';
  if (/fail|couldn|not saved/i.test(t)) return S.offline ? 'local' : 'fail';
  if (/this device/i.test(t)) return 'local';
  if (/^Saved\b/.test(t)) return 'ok';
  return 'idle';
}
function chipNorm(el) {
  const st = chipState(el), [i, l, tip] = SAVE_STATES[st];
  const time = st === 'ok' ? ((el.textContent.match(/\d{1,2}:\d{2}/) || [])[0] || fmt(now().toISOString(), { hour: '2-digit', minute: '2-digit', hour12: false })) : '';
  const txt = l + (time ? ' ' + time : ''), cls = 'save-chip ' + st;
  if (el.className !== cls) el.className = cls;
  if (el.textContent.trim() !== txt || el.dataset.sv !== st) { el.innerHTML = ic(i, 13) + esc(txt); el.dataset.sv = st; }
  if (el.getAttribute('title') !== tip) el.setAttribute('title', tip);
  if (el.getAttribute('role') !== 'status') el.setAttribute('role', 'status');
  if (el.getAttribute('aria-live') !== 'polite') el.setAttribute('aria-live', 'polite');
  if (el.getAttribute('aria-atomic') !== 'true') el.setAttribute('aria-atomic', 'true');
}
const chipsNorm = () => document.querySelectorAll('.save-chip').forEach(chipNorm);
// Design System: the one auto-save indicator, all states
if (SCREENS['design-system']) {
  const _dsP = SCREENS['design-system'];
  SCREENS['design-system'] = p => _dsP(p) + `<section class="card"><h2>Auto-save indicator</h2><p class="small">One style wherever a draft saves by itself (answer sheet, quiz, Marking Workspace). It is a polite status: screen readers hear each change once.</p><div class="row" style="flex-wrap:wrap;gap:8px">${['busy', 'ok', 'local', 'fail', 'idle'].map(s => { const [i, l, tip] = SAVE_STATES[s]; return `<span class="save-chip ${s}" data-sv="${s}" title="${esc(tip)}">${ic(i, 13)}${esc(l + (s === 'ok' ? ' 14:05' : ''))}</span>`; }).join('')}</div></section>`;
}
AFTER.push(chipsNorm);
// the chips also change between redraws (timers) — keep them in the one style
try { new MutationObserver(() => { if (document.querySelector('.save-chip')) chipsNorm(); }).observe(document.body, { childList: true, subtree: true, characterData: true }); } catch (e) { /* old browser: the redraw pass still applies */ }

/* ---------- Release queue: keyboard ---------- */
const REL_KEYS = [['J / ↓', 'Next item'], ['K / ↑', 'Previous item'], ['Enter', 'Open the item'], ['R', 'Release the item (asks you to confirm)'], ['X', 'Select or clear the item for bulk release'], ['?', 'Show these shortcuts']];
const relRows = () => [...document.querySelectorAll('#main table tbody tr')].filter(tr => tr.querySelector('[data-act="relOne"][data-k]'));
const relKey = tr => tr.querySelector('[data-act="relOne"]').dataset.k;
function relMark(focus) {
  const rows = relRows(); if (!rows.length) return;
  let cur = rows.find(tr => relKey(tr) === S.coo.kb);
  rows.forEach(tr => { tr.classList.toggle('kb-cur', tr === cur); if (tr === cur) tr.setAttribute('aria-current', 'true'); else tr.removeAttribute('aria-current'); });
  if (focus && cur) { const a = cur.querySelector('a[data-go="c-release"]') || cur.querySelector('button'); if (a) a.focus(); }
}
AFTER.push(() => { if (S.portal === 'coord' && S.route === 'c-release' && !(S.params || {}).id) relMark(false); });
document.addEventListener('keydown', e => {
  if (S.portal !== 'coord' || S.route !== 'c-release' || (S.params || {}).id || MODAL || e.ctrlKey || e.metaKey || e.altKey) return;
  if (inTypingField(e.target)) return; // same check as the "/" shortcut and the Marking Workspace keys
  const rows = relRows(); if (!rows.length) return;
  const k = e.key, i = rows.findIndex(tr => relKey(tr) === S.coo.kb);
  const move = d => { const n = i < 0 ? (d > 0 ? 0 : rows.length - 1) : Math.max(0, Math.min(rows.length - 1, i + d)); S.coo.kb = relKey(rows[n]); relMark(true); };
  let done = true;
  if (k === 'j' || k === 'J' || k === 'ArrowDown') move(1);
  else if (k === 'k' || k === 'K' || k === 'ArrowUp') move(-1);
  else if (k === 'Enter' && i >= 0 && !(e.target.closest && e.target.closest('a, button'))) go('c-release', { id: S.coo.kb });
  else if ((k === 'r' || k === 'R') && i >= 0) relConfirm([S.coo.kb]);
  else if ((k === 'x' || k === 'X') && i >= 0) { const c = rows[i].querySelector('input[type="checkbox"]'); if (c) c.click(); }
  else if (k === '?') relHelp();
  else done = false;
  if (done) e.preventDefault();
});
function relHelp() { openModal({ title: 'Keyboard shortcuts — Release queue', body: `<p class="small">They work when you are not typing in a box. Releasing always asks you to confirm.</p><dl class="kv">${REL_KEYS.map(([k, d]) => `<dt><kbd>${esc(k)}</kbd></dt><dd>${esc(d)}</dd>`).join('')}</dl>`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); }
ACT.relHelp = () => relHelp();
if (SCREENS['c-release']) {
  const _crel = SCREENS['c-release'];
  SCREENS['c-release'] = p => { const h = _crel(p); return p && p.id || !myRel().length ? h : h + `<p class="xs muted rel-keys">Keyboard: J / K or ↑ / ↓ to move, Enter to open, R to release, X to select · <button class="linklike xs" data-act="relHelp">all shortcuts</button></p>`; };
}

/* ---------- Loading placeholders ----------
   With "Slow network" on (Demo controls), a page shows skeleton placeholders for a moment before its content;
   "Try again" on the server-error page shows them while it reloads. The content itself is unchanged. */
let LOADING = null;
const LOAD_MS = 700;
const curTok = () => routeTok(S.route, S.params || {});
function startLoading(ms, then) {
  const tok = curTok(); LOADING = tok; render();
  setTimeout(() => { if (LOADING !== tok) return; LOADING = null; if (then) then(); else render(); const h = document.querySelector('#main h1'); if (h && !MODAL) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }, ms);
}
AFTER.push(() => {
  const main = document.getElementById('main'); if (!main) return;
  const on = !!LOADING && LOADING === curTok();
  main.classList.toggle('is-loading', on); main.setAttribute('aria-busy', on ? 'true' : 'false');
  const old = main.querySelector(':scope > .load-skel'); if (old && !on) old.remove();
  if (on && !old) main.insertAdjacentHTML('afterbegin', `<div class="load-skel" role="status" aria-label="Loading the page"><div class="skel" style="width:38%;height:22px"></div>${skeleton('table', 6)}</div>`);
});
const _goLoad = go;
go = function (route, params) {
  const r = _goLoad.apply(this, arguments);
  if (S.slowNet && S.signedIn && !MODAL) startLoading(LOAD_MS);
  return r;
};
const _retryP = ACT.retryServer;
ACT.retryServer = (el, e) => { S.serverError = false; startLoading(600, () => _retryP(el, e)); };

/* ---------- Instant updates that roll back if saving fails ----------
   Mark as read, Mark all read and notification preferences apply at once. With "Next quick change fails" on (Demo
   controls) the save is refused: the change is undone and a message says so. Otherwise nothing is different. */
function instant(kind, name, snap, what) {
  const box = kind === 'ACT' ? ACT : INP, f = box[name]; if (typeof f !== 'function') return;
  box[name] = function (el, e) {
    const undo = snap(el), r = f.apply(this, arguments);
    if (S.optFail) {
      S.optFail = false;
      setTimeout(() => { try { undo(); } catch (x) { console.error(x); } render(); if (typeof renderDemo === 'function') renderDemo(); toast(`Couldn't save — ${what} was undone. Check your connection and try again.`, 'err'); }, 600);
    }
    return r;
  };
}
const flagsUndo = list => { const s = list.map(n => [n, n.unread]); return () => s.forEach(([n, v]) => { n.unread = v; }); };
const setUndo = (list, set) => { const s = list.map(n => [n.id, n.unread]); return () => s.forEach(([id, v]) => set(id, v)); };
instant('ACT', 'toggleRead', () => flagsUndo(W.notifs), 'the read status');
instant('ACT', 'markAllRead', () => flagsUndo(W.notifs), 'marking all as read');
instant('INP', 'nprefs', () => { const s = { ...W.notifPrefs }; return () => { Object.keys(W.notifPrefs).forEach(k => delete W.notifPrefs[k]); Object.assign(W.notifPrefs, s); }; }, 'your notification preference');
instant('ACT', 'aMarkRead', () => flagsUndo(ADMIN.myNotifs || []), 'marking all as read');
instant('ACT', 'kMarkRead', () => flagsUndo(typeof acaNotifs === 'function' ? acaNotifs() : []), 'marking all as read');
instant('ACT', 'bMarkRead', () => flagsUndo(typeof bizNotifs === 'function' ? bizNotifs() : []), 'marking all as read');
instant('ACT', 'qMarkRead', () => flagsUndo(typeof iqaNotifs === 'function' ? iqaNotifs() : []), 'marking all as read');
instant('ACT', 'agMarkRead', () => { const u = flagsUndo(STORE.agy ? STORE.agy.notifs : []), t = (ADMIN.threads || []).map(x => [x, x._agySeen]); return () => { u(); t.forEach(([x, v]) => { x._agySeen = v; }); }; }, 'marking all as read');
instant('ACT', 'cooNRead', () => setUndo(cooNotifs(), cooNSet), 'the read status');
instant('ACT', 'cooReadAll', () => setUndo(cooNotifs(), cooNSet), 'marking all as read');
instant('ACT', 'tnReadAll', () => setUndo(tasNotifs(), tnSet), 'marking all as read');

/* ---------- Demo controls: network ---------- */
const _renderDemoP = renderDemo;
renderDemo = function () {
  const r = _renderDemoP.apply(this, arguments);
  const p = document.querySelector('#demo-root .demo-panel'); if (p && !p.querySelector('.demo-net')) {
    const fs = `<fieldset class="demo-net"><legend>Network — demo only</legend><div class="btns"><label class="check small"><input type="checkbox" ${S.slowNet ? 'checked' : ''} data-onchange="slowNet">Slow network — show loading placeholders</label><label class="check small"><input type="checkbox" ${S.optFail ? 'checked' : ''} data-onchange="optFail">Next quick change fails (mark as read, preferences) — it is undone</label></div></fieldset>`;
    const btn = p.querySelector(':scope > .btn-primary:last-child'); if (btn) btn.insertAdjacentHTML('beforebegin', fs); else p.insertAdjacentHTML('beforeend', fs);
  }
  return r;
};
INP.slowNet = el => { S.slowNet = el.checked; toast(el.checked ? 'Demo only: pages now load slowly and show placeholders.' : 'Demo only: pages load at normal speed.', 'info'); };
INP.optFail = el => { S.optFail = el.checked; toast(el.checked ? 'Demo only: the next quick change will fail and be undone.' : 'Demo only: quick changes save normally.', 'info'); };

/* ---------- Phones: the page's main action stays in reach ----------
   On narrow screens a copy of the main action sits at the bottom (above the bottom bar) while the real button is
   scrolled out of view. It does exactly what the real button does — including its confirmation — and mirrors its
   disabled state and reason. */
const MOB_MAIN = [
  { r: 'assignment', p: 'learner', sel: '#main [data-act="reviewSubmit"]' },
  { r: 'course', p: 'learner', sel: '#main [data-act="quizSubmit"]' },
  { r: 't-mark', p: 'staff', sel: '#main [data-act="mkRelease"]' },
  { r: 'c-release', p: 'coord', id: true, sel: '#main .page-h [data-act="relOne"]' },
  { r: 'c-sub', p: 'coord', sel: '#main [data-act="cfPost"]' },
];
let mobObs = null;
const mobSpec = () => MOB_MAIN.find(m => m.r === S.route && m.p === S.portal && (!m.id || (S.params || {}).id));
AFTER.push(() => {
  if (mobObs) { mobObs.disconnect(); mobObs = null; }
  const main = document.getElementById('main'); if (!main) return;
  const old = main.querySelector('.mob-main'); if (old) old.remove();
  const m = mobSpec(), o = m && document.querySelector(m.sel); if (!o) return;
  const lbl = o.textContent.replace(/\s+/g, ' ').trim();
  main.insertAdjacentHTML('beforeend', `<div class="mob-main" role="region" aria-label="Main action"><button type="button" class="btn btn-primary btn-block" data-act="mobMain" ${o.disabled ? `disabled title="${esc(o.getAttribute('title') || disabledWhy(o))}"` : ''}>${esc(lbl)}</button></div>`);
  const bar = main.querySelector('.mob-main'), bn = [...document.querySelectorAll('#app .bnav')].find(visible);
  document.getElementById('app').style.setProperty('--bnav-h', (bn ? bn.offsetHeight : 0) + 'px');
  try { mobObs = new IntersectionObserver(es => es.forEach(x => { bar.classList.toggle('near', x.isIntersecting); })); mobObs.observe(o); } catch (e) { /* no observer: the bar simply stays */ }
});
ACT.mobMain = () => { const m = mobSpec(), o = m && document.querySelector(m.sel); if (o && !o.disabled) o.click(); };

/* ---------- UX Changelog ---------- */
UXC.find(x => x[0] === 'Phase 5')[2].push(
  'Dialogs: Tab and Shift+Tab stay inside an open dialog (hidden and disabled fields are skipped), focus that slips behind the dialog is brought back, and closing returns focus to the control that opened it — found again by its attributes if the page redrew meanwhile, otherwise the page heading.',
  'Validation as you type: once a field shows an error, it is re-checked on every keystroke — the message clears as soon as the entry is right and returns if it is emptied. Email and number fields check their format after you have typed and moved on. Submitting still checks every rule.',
  'Disabled buttons: every disabled button now has a tooltip that says why (for example "Approve every mandatory document first", "You are on the last page", "Sent to the Coordinator for release, so your marking is read-only").',
  'Drafts: closing a dialog (×, Esc, the backdrop or Cancel) after typing in it asks "Discard what you typed?" — Keep editing puts the dialog back with your text. Leaving a page with text typed in a message or note box, or an answer sheet whose last change hasn\'t saved, asks "Leave this page?". The browser also warns before closing the tab. Boxes that keep their own draft (answer sheets, marking, coordinator feedback, observation notes, IQA findings, workplace replies) are unchanged.',
  'Auto-save: one indicator everywhere (answer sheet, quiz, Marking Workspace) — Saving… · Saved 14:05 · Saved on this device (offline) · Save failed — retrying — with the same icons, colours, tooltip and a single polite announcement.',
  'Release queue: keyboard — J / K or ↑ / ↓ move between items, Enter opens, R releases (with the usual confirmation), X selects for bulk release, ? lists the shortcuts.',
  'Loading: skeleton placeholders while a page loads on a slow connection (Demo controls → Network → Slow network) and while "Try again" reloads after a server error.',
  'Instant updates: Mark as read, Mark all read and notification preferences change at once; if saving fails (Demo controls → Network → Next quick change fails) the change is undone and a message says so.',
  'Phones: on the answer sheet, the quiz, the Marking Workspace, a Release queue item and Coordinator feedback, the main action (Review & Submit, Submit quiz, Send to Coordinator, Release to learner, Post feedback) stays at the bottom of the screen while the real button is out of view; it does exactly the same, confirmation included.',
  'Screen index: every entry in every screen index (learner and all staff portals) now has a one-line purpose under it.',
  'Template sweep: the crawl now checks every page has exactly one main heading and that every disabled button says why.',
);
UXC.find(x => x[0] === 'Phase 5')[2].push('Fix (phase5e): screen-index purposes are looked up by what each link opens — its section and target for fixed entries, and the type or state of the item for entries whose labels carry live data (Approvals items, workplace links and emails, certificate checks, batches, Release-queue items, resubmissions) — so a changed ID or count never loses the purpose. The read-only reason in the Marking Workspace now names the status ("Status: Completed — this submission isn\'t waiting for marking, so it is read-only"). Typed text counts for the unsaved-changes warnings whether it comes from the keyboard or an input event; a value set by a script without typing still doesn\'t.');
UXC.find(x => x[0] === 'Phase 5')[2].push('Fix (phase5f): the Release queue shortcuts use the same "are you typing?" check as the "/" shortcut and the Marking Workspace keys — nothing happens while focus is in any input (checkboxes included), text box, list or editable area. Screen-index entries whose target is chosen from live data (the Teacher resubmission-limit item, the Agency\'s first learner, bundle and purchase, and the IQA archived, discontinued and former-assessor records) are looked up by item type too.');
UXC.find(x => x[0] === 'Phase 5')[2].push('Demo controls: every section heading in the Prototype controls panel now ends "— demo only" (variants, edge states, NVQ sub-states, sign-in shortcuts, View, Role, Registration, Demo Scenarios, Network, Reset); sections already titled "Demo only" are unchanged. Wording only — the order and descriptions of the sections are the same.');
