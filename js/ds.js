/* ============================================================
   UX polish v2 — Phase 2: one design system, applied everywhere (route: design-system).
   Presentation only. No flow, rule, permission, status word or fixed colour changes:
   ink, RAG, five-state, Coordinator grey and IQA teal keep their colours.
   Shared pieces wrapped here so every view picks them up:
     chip()      one status chip: icon + label + colour from one dictionary + tooltip (meaning · who acts next)
     dt()        row actions (one visible, the rest under "⋯"), named row checkboxes, density toggle (admin),
                 whole-row click, friendly empty state
     queueDetail Decision template: what was asked | context and history | sticky decision panel with the
                 consequence of each option before the click
     emptyState()/skeleton()/errorState()  shared state patterns
   Loads after every portal file.
   ============================================================ */
'use strict';

/* ---------- Colour vocabulary: purple is only "Added to PD" ---------- */
Object.assign(TONE, {
  'Under Review': 'blue', 'Rescheduled': 'amber', 'Refunded': 'grey', 'Open': 'amber', 'Postponed': 'amber',
  'Deactivated': 'red', 'Paused': 'red', 'On track': 'green', 'At risk': 'redor', 'Stalled': 'amber', 'Projected late': 'amber',
  'Awaiting Coordinator release': 'blue', 'Awaiting release': 'blue', 'Released': 'green', 'Escalated': 'red', 'Info Requested': 'blue',
  'Returned to Requester': 'grey', 'Paid/Processed': 'teal', 'Approved – awaiting payment': 'amber', 'Seat held': 'amber',
  'Not scheduled': 'grey', 'Draft': 'grey', 'Published': 'green', 'Retired': 'grey', 'Archived': 'grey', 'Suspended': 'red',
  'Not activated': 'amber', 'Acknowledged': 'green', 'Closed': 'grey', 'Answered': 'green', 'Verified': 'green', 'Replaced': 'grey',
  'Pending Verification': 'amber', 'Deposit refund in progress': 'amber', 'Seat released': 'grey', 'Full': 'blue',
});

/* ---------- Status dictionary: what it means · who acts next ---------- */
// [staff wording, learner / agency / public wording]. One entry per status word, used by every chip tooltip.
const STATUS_INFO = {
  'Not Started': ['Nothing submitted yet. The learner acts next.', 'You haven\'t started this yet. Open it when you\'re ready.'],
  'Submitted': ['Waiting for marking. The assessor acts next.', 'Submitted — your assessor is marking it. You\'ll be notified when feedback is released.'],
  'Feedback Received': ['Feedback released to the learner. No action unless a resubmission is asked for.', 'Your feedback is ready. Open it to read what your assessor said.'],
  'Resubmission Required': ['Feedback released with corrections. The learner resubmits by the deadline.', 'Some answers need changes. Only the highlighted answers need changing — resubmit by the deadline.'],
  'Completed': ['Finished and closed. No further action.', 'Done — nothing more to do here.'],
  'Awaiting Coordinator release': ['Marked and sent. The Academic Coordinator releases it to the learner next.', 'Your work has been marked. Feedback is on its way.'],
  'Awaiting release': ['Marked and sent. The Academic Coordinator releases it to the learner next.', 'Your work has been marked. Feedback is on its way.'],
  'Released': ['Feedback released to the learner by the Coordinator.', 'Your feedback is ready.'],
  'In Progress': ['Evidence submitted or observation planned, not yet judged.', 'Evidence is in, or an observation is planned. Not judged yet.'],
  'Action Required': ['The assessor needs more evidence or rework. The learner acts next.', 'Your assessor needs more evidence or a change from you.'],
  'Added to PD': ['Will be covered in the Professional Discussion — no rework.', 'This will be covered in your Professional Discussion. You don\'t need to redo it.'],
  'Achieved': ['Criterion met and signed off.', 'Done — this criterion is met and signed off.'],
  'Active': ['In use. No action needed.', 'Active — you can use it now.'],
  'Expired-Incomplete': ['Access ended before completion. The learner can ask for more time or re-purchase.', 'Your access ended before you finished. Your progress is saved — ask for more time or buy the course again.'],
  'Discontinued': ['Stopped for this course or batch only. Records are kept.', 'This course has been stopped. Your records are kept and you can still read them.'],
  'Payment Pending': ['Waiting for the bank to confirm the payment.', 'We\'re waiting for your bank to confirm the payment. This usually takes a few minutes.'],
  'Pending': ['Waiting for a decision. The approver acts next.', 'Waiting for a decision. We\'ll tell you when it\'s made.'],
  'Requested': ['Waiting for a decision. The approver acts next.', 'Your request is with the Academy. We\'ll tell you when it\'s decided.'],
  'Approved': ['Approved and applied.', 'Approved.'],
  'Rejected': ['Rejected, with a reason. The requester can see why.', 'Not approved. Open it to see why.'],
  'Escalated': ['No decision for 7 days — the Super Administrator decides now.', 'Your request is with a senior member of staff.'],
  'Info Requested': ['The approver asked for more information. The requester acts next.', 'We need a bit more information from you.'],
  'Returned to Requester': ['Sent back to the requester to change and resubmit.', 'Sent back to you to change and send again.'],
  'Paid/Processed': ['Payment recorded and applied.', 'Paid and processed.'],
  'Approved – awaiting payment': ['Approved. Seats are credited once Finance records the payment.', 'Approved — your seats are added once your payment arrives.'],
  'Paid': ['Paid in full.', 'Paid — thank you.'],
  'Overdue': ['Past its due date and unpaid. Access pauses at 30 days.', 'This payment is late. Pay it to keep your access.'],
  'Partially paid': ['Part paid; the rest is still due.', 'Part paid — the rest is still due.'],
  'Refunded': ['Money returned to the original payment method.', 'Your money has been returned.'],
  'Failed': ['Did not go through. Nothing was charged.', 'This didn\'t go through. Nothing was charged — you can try again.'],
  'Succeeded': ['Completed successfully.', 'Completed successfully.'],
  'Valid': ['Genuine and current.', 'This certificate is genuine and current.'],
  'Expired': ['Past its expiry date.', 'This has passed its expiry date.'],
  'Expiring soon': ['Expires soon — plan a renewal.', 'This expires soon. Plan your renewal.'],
  'Revoked': ['Withdrawn by the Academy. Not valid.', 'This certificate has been withdrawn and is not valid.'],
  'Replaced': ['Replaced by a newer certificate.', 'Replaced by a newer certificate.'],
  'Superseded': ['Replaced by a newer version.', 'Replaced by a newer version.'],
  'Processing': ['Being prepared.', 'Being prepared — check back soon.'],
  'Proposed': ['Date proposed. The learner (and workplace) accept or suggest another time.', 'A date has been proposed. Accept it or suggest another time.'],
  'Confirmed': ['Date agreed by everyone.', 'Date agreed.'],
  'Cancelled': ['Cancelled. Nothing will happen on this date.', 'Cancelled.'],
  'Rescheduled': ['Moved to a new date.', 'Moved to a new date.'],
  'Postponed': ['Moved to a later date.', 'Moved to a later date.'],
  'Permission Pending': ['Waiting for the workplace to decide.', 'Waiting for your workplace to decide.'],
  'Granted': ['Permission given.', 'Permission given.'],
  'Declined': ['Declined. The requester can see it.', 'Declined.'],
  'Withdrawn': ['No longer in effect.', 'No longer in effect.'],
  'Present': ['Attended.', 'You attended.'], 'Late': ['Joined late.', 'You joined late.'], 'Partial': ['Attended part of it.', 'You attended part of it.'], 'Absent': ['Did not attend.', 'You didn\'t attend.'],
  'Open': ['Still open — action is pending.', 'Still open.'],
  'Observed': ['Seen by the assessor.', 'Seen by your assessor.'], 'Not Yet Observed': ['Not seen yet.', 'Not seen yet.'],
  'Competent': ['Meets the standard.', 'You meet the standard.'], 'Not Yet Competent': ['Doesn\'t meet the standard yet.', 'Not there yet — your assessor will tell you what to do.'],
  'Paused': ['Access paused for non-payment. Finance or System Admin can restore it.', 'Your access is paused. Pay the overdue amount to restore it.'],
  'Deactivated': ['Account switched off. Records kept.', 'This account is switched off.'],
  'Suspended': ['Account suspended. Records kept.', 'This account is suspended.'],
  'Archived': ['Read-only record. Every access needs a stated purpose.', 'This record is read-only.'],
  'At risk': ['Likely to miss the end date. The Coordinator acts next.', 'At risk.'],
  'On track': ['Progressing as planned.', 'On track.'],
  'Pending Verification': ['Account created; the code hasn\'t been entered yet.', 'Enter the 6-digit code we sent you to finish setting up your account.'],
  'Seat held': ['Deposit paid; the seat is held until the balance date.', 'Your deposit is paid and your seat is held.'],
};
const isPublicSide = () => ['learner', 'agency'].includes(S.portal) || /^(v-|w-)/.test(S.route || '');
function statusTip(label) { const x = STATUS_INFO[label]; return x ? x[isPublicSide() ? 1 : 0] : ''; }

/* ---------- One icon set (SVG) for chips and RAG ---------- */
Object.assign(ICONS, { circle: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z', half: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 3v18', diamond: 'M12 3l9 9-9 9-9-9z', dot: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z' });
const CHIP_IC = { green: 'check', red: 'x', redor: 'alert', amber: 'clock', blue: 'half', grey: 'circle', purple: 'diamond', teal: 'dot', outline: 'circle' };

/* ---------- Status chip: dictionary colour wins, icon + label + tooltip ---------- */
chip = function (label, tone) {
  const L = String(label), t = TONE[L] || (typeof tone === 'string' && tone ? tone : 'grey'), tip = statusTip(L);
  return `<span class="chip t-${t}"${tip ? ` title="${esc(tip)}" data-tip="1"` : ''}><span class="chip-i" aria-hidden="true">${ic(CHIP_IC[t] || 'circle', 12)}</span>${esc(L)}</span>`;
};

/* ---------- Formats ---------- */
const MONTHS3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function monthLbl(ym) { const [y, m] = String(ym).split('-').map(Number); return m ? `${MONTHS3[m - 1]} ${y}` : String(ym); } // "2026-09" → "Sep 2026"

// Queue "days outstanding" chip: same chip component (icon + tooltip); wording unchanged
daysChip = function (d) {
  if (d == null) return '<span class="muted small">—</span>';
  const t = d >= 7 ? 'red' : d >= 5 ? 'amber' : 'outline';
  const tip = d >= 7 ? 'Not decided within 7 days — it escalates to the Super Administrator, or the approver gets a reminder (Data correction, Discount rate change).' : d >= 5 ? 'Days since it was raised. At 7 days it escalates to the Super Administrator, or the approver gets a reminder.' : 'Days since it was raised.';
  return `<span class="chip t-${t}" title="${tip}" data-tip="1"><span class="chip-i" aria-hidden="true">${ic(d >= 5 ? 'clock' : 'circle', 12)}</span>${d} days${d >= 7 ? ' · overdue' : d >= 5 ? ' · nearing SLA' : ''}</span>`;
};

/* ---------- Shared state patterns ---------- */
function emptyState({ icon = 'inbox', title, why = '', action = '' }) { return `<div class="empty ds-empty">${ic(icon, 30)}<strong>${title}</strong>${why ? `<span class="small muted">${why}</span>` : ''}${action}</div>`; }
const adminHome = () => (typeof isIqa === 'function' && isIqa()) ? 'q-records' : (typeof isBiz === 'function' && isBiz()) ? 'b-dashboard' : (typeof isAca === 'function' && isAca()) ? 'k-dashboard' : (typeof isFin === 'function' && isFin()) ? 'f-dashboard' : 'a-dashboard';
const homeRoute = () => ({ admin: adminHome(), coord: 'c-dashboard', staff: 't-dashboard', agency: 'g-dashboard' }[S.portal] || 'dashboard');
const homeBtn = () => `<button class="btn btn-sm" data-go="${homeRoute()}">Back to dashboard</button>`;
function skeleton(kind = 'list', n = 4) {
  const line = w => `<span class="skel" style="width:${w}%"></span>`;
  if (kind === 'table') return `<div class="skel-tbl" aria-busy="true" aria-label="Loading">${Array.from({ length: n }, (_, k) => `<div class="skel-row">${line(30)}${line(45)}${line(15)}</div>`).join('')}</div>`;
  if (kind === 'card') return `<div class="card skel-card" aria-busy="true" aria-label="Loading">${line(40)}${line(90)}${line(75)}</div>`;
  return `<div class="stack" aria-busy="true" aria-label="Loading">${Array.from({ length: n }, (_, k) => line(90 - k * 12)).join('')}</div>`;
}
function errorState({ what, fix, retry = '' }) { return `<div class="note b-red" role="alert">${ic('alert')}<div><strong>${what}</strong><div class="small">${fix}</div>${retry ? `<div class="b-act"><button class="btn btn-sm" data-act="${retry}">${ic('refresh', 14)}Retry</button></div>` : ''}</div></div>`; }

// Messages: the reading pane before a conversation is chosen (every portal)
function msgPaneEmpty(list, route, compose) {
  const first = (list || [])[0];
  const acts = `${first ? `<button class="btn btn-sm" data-go="${route}" data-id="${esc(first.id)}">Open the latest conversation</button>` : ''}${compose ? `<button class="btn btn-sm" data-act="${compose}">${ic('plus', 14)}New message</button>` : ''}`;
  return `<div style="margin:auto">${emptyState({ icon: 'msg', title: 'No conversation open', why: (list || []).length ? 'Choose a conversation from the list to read it and reply.' : 'There are no conversations yet.' + (compose ? ' Start one with "New message".' : ''), action: acts ? `<div class="row" style="justify-content:center">${acts}</div>` : '' })}</div>`;
}

/* ---------- Table: row actions, named checkboxes, density, empty state ---------- */
const ROWBTN = /<(button|a)\b[^>]*>[\s\S]*?<\/\1>/g;
function dsRowActs(h) {
  if (!h) return h;
  const items = h.match(ROWBTN) || [];
  const rest = h.replace(ROWBTN, '').replace(/<\/?div[^>]*>/g, '').trim();
  const demote = x => x.replace(/\bbtn-primary\b/, '');
  if (items.length <= 2 || rest) return h.replace(/\bbtn-primary\b/g, '');
  let k = items.findIndex(x => /btn-primary/.test(x)); if (k < 0) k = items.findIndex(x => !/btn-danger|btn-ghost/.test(x)); if (k < 0) k = 0;
  const main = demote(items[k]), more = items.filter((_, j) => j !== k).map(demote);
  return `<div class="row-acts">${main}<details class="rowmenu"><summary class="btn btn-sm btn-ghost" aria-label="More actions">${ic('more', 16)}</summary><div class="rowmenu-dd">${more.join('')}</div></details></div>`;
}
const _dtDS = dt;
dt = function (cfg) {
  if (cfg.act && !cfg._ds) { const a = cfg.act; cfg.act = r => dsRowActs(a(r)); cfg._ds = 1; }
  if (!cfg.emptyCta) cfg.emptyCta = `<span class="small muted">${cfg.emptyWhy || 'New items appear here as soon as there are any.'}</span>${homeBtn()}`;
  let h = _dtDS(cfg);
  // With rows ticked, the first bulk action is the screen's primary (row actions are secondary) — unless it is destructive
  h = h.replace(/<button class="btn btn-sm" (data-act="dtBulk" data-t="[^"]*" data-i="0">)([^<]*)<\/button>/, (m, a, l) => /archive|remove|discontinu|reject|revoke|delete|deactivat/i.test(l) ? m : `<button class="btn btn-sm btn-primary" ${a}${l}</button>`);
  // Rows with a main link are clickable as a whole (class set here instead of a costly :has() selector)
  h = h.replace(/<tr class="([^"]*)">([\s\S]*?)<\/tr>/g, (m, c, body) => /<a [^>]*(data-go="|data-act="goTok")/.test(body) ? `<tr class="${c ? c + ' ' : ''}row-link">${body}</tr>` : m);
  h = h.replace(/aria-label="Select row" data-onchange="dtSel" data-t="([^"]*)" data-id="([^"]*)"/g, (m, t, id) => `aria-label="Select ${id}" data-onchange="dtSel" data-t="${t}" data-id="${id}"`);
  if (S.portal === 'admin') {
    const roomy = ui('dsDensity', 'compact') === 'roomy';
    h = h.replace('<section class="dt">', `<section class="dt${roomy ? ' dt-roomy' : ''}">`).replace('<span class="spacer"></span>', `<span class="spacer"></span><button class="btn btn-sm" data-act="dsDensity" aria-pressed="${roomy}" title="Row spacing">${roomy ? 'Compact rows' : 'Roomy rows'}</button>`);
  }
  return h;
};
ACT.dsDensity = () => { setUi('dsDensity', ui('dsDensity', 'compact') === 'roomy' ? 'compact' : 'roomy'); render(); };
// Whole-row click opens the row's main link (clicks on controls keep their own behaviour)
document.addEventListener('click', e => {
  const tr = e.target.closest('.dt tbody tr'); if (!tr || e.target.closest('a,button,input,select,textarea,label,summary,details')) return;
  if (window.getSelection && String(window.getSelection()).length) return;
  const link = tr.querySelector('td a[data-go], td a[data-act="goTok"]'); if (link) link.click();
});

/* ---------- Decision template (Approvals Queue item) ---------- */
const partyOf = i => String((i.related && i.related[0]) || i.raisedBy || '').split(' · ')[0];
function dsConseq(i, a) {
  const who = partyOf(i), by = i.raisedBy || 'the requester', T = i.type || '';
  switch (a) {
    case 'grant': return `${who} gets the quiz's original number of attempts again and is notified.`;
    case 'extend': return `${who}'s access is extended from the current end date (or today if it has ended). Progress is kept; ${who.split(' ')[0]} is notified.`;
    case 'repurchase': return `No more attempts or time. ${who} is asked to buy the course again; their record is kept.`;
    case 'exceptional': return `One more resubmission opens for ${who} with the deadline you set. The assessor is notified.`;
    case 'extendDl': return `${who} gets the new deadline you set on this item. The assessor is notified.`;
    case 'decline': return `${who} sees "No further resubmission" on this item.`;
    case 'approveFinal': return 'The proposed value replaces the current one now. The original stays in the history.';
    case 'forward': return 'First review passes. The Super Administrator makes the final decision.';
    case 'resub': return `${who} is asked to upload the document again. The approved one stays valid meanwhile.`;
    case 'reject': return `Closed as Rejected. ${by === who ? who : by} sees your reason. Nothing changes.`;
    case 'return': return `Goes back to ${by} to change and send again. Nothing is applied.`;
    case 'info': return `Stays open. ${by} is asked for more information.`;
    case 'note': return 'Adds an internal note to the history. The status doesn\'t change.';
    case 'approve':
      if (T === 'Refund') return `The refund is processed to the original payment method${i.data && i.data.consequence ? ' and the enrolment is set to "' + i.data.consequence + '"' : ''}. Finance and the learner are notified.`;
      if (T === 'Discount rate change') return 'The new rates apply to new purchases from now. Existing bundles keep their price.';
      if (T.startsWith('Discontinue')) return `${who} loses access to this course or batch only. Records are kept.`;
      if (T.startsWith('Reactivate')) return `${who} gets access to this course or batch back.`;
      if (T === 'Agency invoice (offline) purchase') return 'The agency is asked to pay. Seats are credited once the payment is recorded.';
      if (T === 'Link existing learner to agency') return `${who} is linked to the agency for this course. The agency is told.`;
      if (T === 'Bundle price below minimum') return 'The bundle can be sold at the requested price.';
      if (T === 'Replace / re-upload document') return 'The new document replaces the old one.';
      if (T === 'Learner profile change') return 'The new value replaces the current one. The learner is notified.';
      return `Approved and applied now. ${by} is notified.`;
  }
  return '';
}
function dsDecision(h, i) {
  if (!i || typeof document === 'undefined') return h;
  const t = document.createElement('template'); t.innerHTML = h;
  // The main grid is the one whose first column holds Summary / Decision. Role wrappers insert their own grids or cards
  // above it (e.g. Finance refund "Original transaction / Refund requested", academic and business panels).
  const h2Of = s => ((s.querySelector('h2') || {}).textContent || '');
  const isMain = el => el.classList.contains('grid-2') && el.children[0] && [...el.children[0].children].some(s => s.tagName === 'SECTION' && ['Summary', 'Decision'].includes(h2Of(s)));
  const root = t.content, grid = [...root.children].find(isMain);
  if (!grid || grid.children.length < 2) return h;
  const [left, right] = grid.children;
  const dec = [...left.children].find(s => s.tagName === 'SECTION' && ((s.querySelector('h2') || {}).textContent || '') === 'Decision');
  const sum = [...left.children].find(s => s.tagName === 'SECTION' && ((s.querySelector('h2') || {}).textContent || '') === 'Summary');
  const L = document.createElement('div'); L.className = 'stack-lg q3-asked';
  const C = document.createElement('div'); C.className = 'stack-lg q3-context';
  if (sum) { (sum.querySelector('h2') || {}).textContent = 'What was asked'; L.appendChild(sum); }
  // Context column: role panels inserted above the main grid (their grids are unpacked), then the rest of the item
  [...root.children].filter(el => el !== grid && (el.classList.contains('grid-2') || (el.tagName === 'SECTION' && el.classList.contains('card')))).forEach(el => { if (el.classList.contains('grid-2')) { [...el.children].forEach(c => C.appendChild(c)); el.remove(); } else C.appendChild(el); });
  [...left.children].filter(el => el !== dec).forEach(el => C.appendChild(el));
  [...right.children].forEach(el => C.appendChild(el));
  const A = document.createElement('aside'); A.className = 'q3-decide'; A.setAttribute('aria-label', 'Decision');
  if (dec) {
    dec.classList.add('q-decide');
    const btns = [...dec.querySelectorAll('button[data-act="qDo"]')], main = document.createElement('div'), more = document.createElement('details');
    main.className = 'q-opts'; more.className = 'q-more'; more.innerHTML = '<summary class="small">Other options</summary>';
    btns.forEach(b => { const a = b.dataset.a, w = document.createElement('div'); w.className = 'q-opt'; w.appendChild(b); const c = dsConseq(i, a); if (c && !b.hasAttribute('disabled')) { const p = document.createElement('p'); p.className = 'xs q-conseq'; p.textContent = '→ ' + c; w.appendChild(p); } (['return', 'info', 'note'].includes(a) && btns.length > 2 ? more : main).appendChild(w); });
    const h2 = dec.querySelector('h2'); if (h2) h2.after(main); else dec.prepend(main);
    if (more.children.length > 1) main.after(more);
    dec.querySelectorAll('.row').forEach(r => { if (!r.children.length && !r.textContent.trim()) r.remove(); });
    A.appendChild(dec);
  }
  const g = document.createElement('div'); g.className = 'q3' + (dec ? '' : ' q3-nodecide'); // Page (and keyboard / screen-reader) order: what was asked → decision → context. CSS places the decision panel on the right.
  g.append(L); if (dec) g.append(A); g.append(C);
  grid.replaceWith(g);
  const box = document.createElement('div'); box.appendChild(root.cloneNode(true)); return box.innerHTML;
}
if (typeof queueDetail === 'function') { const _qdDS = queueDetail; queueDetail = function (id) { const h = _qdDS(id); try { return dsDecision(h, qItem(id)); } catch (e) { return h; } }; }

/* ---------- Design System page ---------- */
const DS_TOKENS = [['--sp-1', '4px'], ['--sp-2', '8px'], ['--sp-3', '12px'], ['--sp-4', '16px'], ['--sp-5', '24px'], ['--sp-6', '32px']];
const DS_TYPE = [['--fs-xs', '.75rem', 'Captions, meta'], ['--fs-sm', '.875rem', 'Help text, table cells'], ['--fs-md', '1rem', 'Body (15px base)'], ['--fs-lg', '1.25rem', 'Section headings (h2)'], ['--fs-xl', '1.6rem', 'Page title (h1)']];
SCREENS['design-system'] = () => {
  const tones = [...new Set(Object.values(TONE))];
  const sample = Object.keys(STATUS_INFO);
  return `${pageHead('Design System', 'One set of templates, components, formats and patterns used by every role view. Presentation only — behaviour, status words and fixed colours are unchanged.')}
  <section class="card"><h2>Page templates</h2><div class="tbl-wrap"><table class="tbl dense"><thead><tr><th scope="col">Template</th><th scope="col">Structure</th><th scope="col">Used for</th></tr></thead><tbody>${[
    ['List', 'Title + one-line description → primary action (top right) → search, filters and date filter → table → result count and paging', 'Every table page (shared table)'],
    ['Detail', 'Breadcrumb → title, status chip and key facts → primary actions → tabs → activity / audit', 'Learner 360, batch, agency, assignment, record, purchase'],
    ['Form / modal', 'Grouped sections; label above input; help text below; required marked; primary bottom-right with Cancel to its left', 'Every dialog and form'],
    ['Decision', 'Left: what was asked · centre: evidence, context and history · right: sticky decision panel showing each option\'s consequence', 'Approvals Queue item, Release queue item'],
    ['Dashboard', '"Needs your attention" → KPIs → upcoming → activity', 'Every role dashboard'],
    ['Public / link page', 'One centred card, one decision per screen', 'Registration, workplace pages, verification'],
  ].map(r => `<tr><td class="strong small">${r[0]}</td><td class="small">${r[1]}</td><td class="small">${r[2]}</td></tr>`).join('')}</tbody></table></div></section>
  <section class="card"><h2>Buttons</h2><div class="row"><button class="btn btn-primary" type="button">Release to learner</button><button class="btn" type="button">Secondary</button><button class="btn btn-ghost" type="button">Tertiary</button><button class="btn btn-danger" type="button">Discontinue enrolment</button><button class="btn" type="button" disabled title="Choose a learner first">Disabled (says why)</button></div>
    <ul class="small"><li>One primary button per screen or section. In table rows the main action is a normal button; other actions sit under "⋯".</li><li>Destructive actions are red, never the default, and always confirm.</li><li>Labels name the outcome ("Grant 3 attempts", "Send to Coordinator"), never "OK" or "Confirm".</li></ul></section>
  <section class="card"><h2>Status chips</h2><p class="small">One component: icon + label + colour, and a tooltip saying what the status means and who acts next. Hover or focus a chip to read it. The colour comes from one dictionary, so a status looks the same on every screen. Purple is used only for "Added to PD".</p><div class="chip-row ds-chips">${sample.map(k => chip(k)).join('')}</div>
    <h3>Fixed colours (unchanged)</h3><div class="ds-fixed">${typeof inkLegend === 'function' ? inkLegend() : ''}<div class="row small"><span>RAG:</span>${rag('R')}${rag('A')}${rag('G')}</div>${fiveLegend()}<div class="row small"><span>Coordinator feedback:</span><span class="chip t-grey">Coordinator</span><span>IQA findings:</span><span class="iqa-badge">${ic('shield', 13)}IQA finding</span></div></div></section>
  <section class="card"><h2>Tables</h2><ul class="small"><li>Shared table keeps search, filters, date filter, paging, result count and filter-aware export.</li><li>Column order: identity → context → status → dates → actions. Money and numbers right-aligned.</li><li>Click anywhere on a row to open it. The main row action stays visible; others are under "⋯".</li><li>Admin views have a "Roomy rows / Compact rows" toggle. Row checkboxes are named after the row ("Select AQ-1014").</li><li>On phones tables become cards (Phase 5).</li></ul></section>
  <section class="card"><h2>Formats</h2><dl class="kv"><dt>Date</dt><dd>${fd(now().toISOString())} (fixed three-letter months — never "Sept")</dd><dt>Time</dt><dd>${ft(now().toISOString())}</dd><dt>Date and time</dt><dd>${fdt(now().toISOString())}</dd><dt>Money</dt><dd>${money(1250, 'GBP')} · ${money(5800, 'AED')} · ${money(12400, 'INR')} — currency on every amount; never summed across currencies</dd><dt>Time zone</dt><dd>Every date shows in the viewer's local time: staff portals and public pages use this device's zone (now ${esc(viewerTZ())}, ${tzl()}); learners see their country's zone; agencies see their own zone.</dd></dl></section>
  <section class="card"><h2>Feedback patterns</h2><ul class="small"><li><strong>Toast</strong> — confirms what happened in plain words ("Feedback released to Aisha").</li><li><strong>Banner</strong> — page-level state: paused, read-only, archived, escalated.</li><li><strong>Modal</strong> — confirmations and focused tasks only. Confirmations state the consequence.</li></ul><div class="row"><button class="btn btn-sm" data-act="dsToast">Show a sample toast</button></div></section>
  <section class="card"><h2>Empty, loading and error states</h2><div class="grid-2"><div class="card flat">${emptyState({ title: 'You\'re all caught up', why: 'Nothing is waiting for you right now. New items appear here as soon as they arrive.', action: '<button class="btn btn-sm" type="button">Back to dashboard</button>' })}</div><div class="card flat"><h3 class="small">Loading (skeleton, never a blank screen)</h3>${skeleton('table', 3)}</div></div>${errorState({ what: 'We couldn\'t save your changes.', fix: 'Your entries are kept. Check your connection and try again.', retry: 'dsToast' })}</section>
  <section class="card"><h2>Placeholder tag</h2><p class="small">One style for open client items. The text never changes; the tooltip explains it.</p><div class="row">${pend('example topic')}${c2s('example content')}<span class="demo-tag">Demo only</span></div><p class="xs muted">"Demo only" marks prototype-only controls and uses its own neutral style, so it isn't mistaken for a client placeholder.</p></section>
  <section class="card"><h2>Icons, spacing and type</h2><div class="row ds-icons">${['check', 'x', 'alert', 'clock', 'half', 'circle', 'diamond', 'dot', 'lock', 'info', 'more'].map(n => `<span class="ds-ic">${ic(n, 18)}<span class="xs">${n}</span></span>`).join('')}</div><p class="small">One SVG icon set. The lock icon always means verified or locked.</p>
    <div class="grid-2"><div><h3 class="small">Spacing scale</h3><ul class="list small">${DS_TOKENS.map(([k, v]) => `<li class="li"><span class="mono">${k}</span><span style="display:inline-block;height:10px;width:${v};background:var(--brand)"></span><span class="xs muted">${v}</span></li>`).join('')}</ul></div><div><h3 class="small">Type scale</h3><ul class="list small">${DS_TYPE.map(([k, v, u]) => `<li class="li"><span class="mono">${k}</span><span style="font-size:${v}">Aa</span><span class="xs muted">${v} · ${u}</span></li>`).join('')}</ul><p class="xs muted">Reading text is limited to about 72 characters per line.</p></div></div></section>`;
};
ACT.dsToast = () => toast('Feedback released to Aisha Rahman.');

const _idxDS = SCREENS.index;
SCREENS.index = p => _idxDS(p) + `<section class="card idx-sec"><h2>Design System</h2><ul class="idx-list"><li><button class="linklike" data-go="design-system">Design System</button> <span class="xs muted">· page templates, buttons, status chips, tables, formats, states, placeholder tag, icons, spacing and type</span></li></ul></section>`;

/* ---------- UX Changelog: Phase 2 ---------- */
UXC.push(['Phase 2', 'UX polish v2 — one design system (Design System page)', [
  'Status chips (every view): one component — SVG icon + label + colour from one dictionary + a tooltip saying what the status means and who acts next (staff wording in staff portals, plain wording for learners, agencies and public pages). The dictionary colour wins over per-screen colours, so a status looks the same everywhere (e.g. Expired-Incomplete, Discontinued, Withdrawn, Partial, On track). Purple is now used only for "Added to PD": Open → amber, Under Review → blue, Rescheduled / Postponed → amber, Refunded → grey. Status words unchanged.',
  'Fixed colours unchanged: submission ink, RAG, five-state, Coordinator grey, IQA teal. RAG keeps its colours; its ✓ / ✕ / ! glyphs became the same SVG icons as the chips (one icon set).',
  'Shared table (every list): in rows the main action is a normal button and the rest sit under a "⋯" menu (Finance Overdue rows: 6 buttons → 1 + menu); no primary buttons inside rows; with rows ticked, the first non-destructive bulk action is primary (e.g. "Release selected"); click anywhere on a row to open it; row checkboxes named after the row ("Select AQ-1014"); admin views get a "Roomy rows / Compact rows" toggle; empty tables explain why and offer "Back to dashboard" unless the page gives a better action.',
  'Decision template (Approvals Queue item, every admin role): left "What was asked", centre context, evidence, history and notes, right a sticky decision panel. Each option shows its consequence before the click (e.g. "→ The refund is processed to the original payment method…"); Send back, Request information and Add note sit under "Other options" when there are more than two choices. Rules, routing and self-approval blocks unchanged.',
  'Buttons: one primary per screen or section — Learner Certificates, Browse Courses and Payments rows, Agency Buy Bundles and dashboard bundle cards, Teacher dashboard observations and Teaching card, Release queue rows. The learner\'s overdue "Pay now" in the summary is the primary; row "Pay now" buttons are secondary (red is kept for destructive actions). Nine dialogs that said "Confirm" now name the outcome ("Deactivate login", "Withdraw announcement", "Mark as confirmed", "Confirm this date"…). Three dialogs now put the primary on the right (Stay and finish, Stay, Keep role).',
  'Formats: fixed three-letter months ("14 Sep 2026", never "Sept"); every date in the viewer\'s local time — staff portals (admin, coordinator, teacher / assessor) and public pages use the browser\'s own zone, learners see their country\'s zone, agencies their own (previously staff, agency and verification pages followed the last-viewed learner); profile pages show the device\'s zone instead of a fixed "Europe/London"; amounts always with pence (System Configuration, Finance plans and messages, learner messages); Agency reports show "Sep 2026" instead of "2026-09" and "09/26"; Agency Purchases\' separate Currency column is hidden by default (still in Columns) because every amount carries its currency.',
  'States: one empty-state pattern (friendly line, why it\'s empty, next action) — every Messages reading pane (7 portals: "Open the latest conversation" / "New message"), Finance "You\'re all caught up", Agency certificate tabs, the admin notification bell, a new learner\'s Payments ("No payments yet" → Browse courses) and dashboard (empty "My learning" heading hidden). Skeleton, empty and error-with-Retry components defined on the Design System page (wider use in Phase 5).',
  'Placeholder tag: one style and one tooltip — "Waiting on the client — content or behaviour may change." The 8 topics and their text are unchanged. "Demo only" labels got their own neutral style so they aren\'t mistaken for client placeholders.',
  'Names: Data requests (tab, heading and table now all "Data requests"); queue column "Raised" in every role; Finance Approvals Queue gets "Who approves what" like the other queues and says "Nothing awaiting you"; Business dashboard "Awaiting me" shows each item\'s real type (was always "Link learner"); IQA "New sample set" everywhere; integration banner is red like the dashboard alert, with "Open Integrations"; Finance dashboard alerts use status chips (no purple) and the escalated refund\'s day count comes from the data.',
  'Release queue item: submission ink by round (Resubmission 2+ amber, was red), ink legend added, feedback with no RAG shown neutral (was green).',
  'Tokens (styles.css "UX polish v2" block, append-only): spacing scale --sp-1…6, type scale --fs-xs…xl, reading measure 72ch.',
  'IQA findings stay teal #0F766E (.iqa-badge, .iqa-finding — decision D9), distinct from blue "In Progress"; checked by ft-phase2. Other --teal uses (sponsor badges, a few chips) stay blue. Not changed in Phase 2, by design: status labels keep their exact punctuation (e.g. "Approved – awaiting payment"); workplace pages keep their weekday dates. Navigation (Phase 3), wording and glossary (Phase 4), mobile cards, touch targets, contrast and shortcuts (Phase 5) are still to come.',
  'Re-applied after a reset of index.html and js/core.js on 9 Oct 2026 at 16:38 IST: P0 learner header search removal; uxv2.js loaded again. The reset happened as the Claude Code session was resumed; both files were restored byte-for-byte to the session\'s first checkpoint (taken before any UX-pass edit). No other file was affected; all D1–D12 fixes were still present.', 'Decision template order fixed (scenario #8.2): page and keyboard order is now What was asked → Decision → Context, so the first decision button is the decision itself, not the Notes card\'s "Add note"; the layout on screen is unchanged.',
  'Tests changed in Phase 2: none. Tests added: ft-phase2.js (IQA teal vs blue, viewer-local time zones, decision order, chip rules, formats, table and empty-state rules).',
]]);
UXC.push(['Before / after', 'UX polish v2 — the 10 most-used screens', [
  'Learner dashboard — before: chips with text glyphs and no explanation; an empty "My learning" heading for new learners. After: chips explain themselves on hover/tap; empty sections hidden.',
  'Learner assignment and feedback — before: status chips unexplained ("Submitted"). After: "Submitted — your assessor is marking it. You\'ll be notified when feedback is released."',
  'Learner Payments — before: every row\'s "Pay now" primary or red; £0.00 KPIs for new learners. After: one primary (the overdue summary); "No payments yet" with Browse courses.',
  'Approvals Queue item (all admins) — before: long single column, decision buttons scroll away, no consequences shown. After: three columns with a sticky decision panel; each option says what will happen.',
  'Approvals Queue list — before: up to several buttons per row, generic "Select row" checkboxes. After: one row action + "⋯", whole-row click, named checkboxes, density toggle.',
  'Finance Overdue & Access — before: 6 buttons per row incl. primary and red. After: one visible action, the rest under "⋯".',
  'Coordinator Release queue — before: a primary "Release to learner" on every row; Resubmission 2+ red; no ink legend. After: row actions secondary, "Release selected" primary when rows are ticked; correct ink and legend.',
  'Marking Queue / Teacher dashboard — before: up to 25 primary "Mark" buttons; several primaries on the dashboard. After: rows secondary; one primary per card ("Start marking (oldest first)").',
  'Agency dashboard and Buy Bundles — before: a primary on every bundle card (7 on Buy Bundles). After: one primary per screen ("Assign seats"); ISO months replaced by "Sep 2026".',
  'Messages (all portals) — before: "Select a thread." After: "No conversation open" with "Open the latest conversation" and "New message" where messaging is allowed.',
]]);

/* ---------- Prototype documentation pages are never learner content ----------
   Screen index, Demo Scenarios, records, audits and the Design System open in every learner variant and edge state
   (previously variant B — not yet admitted — and the archived / paused states showed "Programme content is locked" here). */
const DOC_ROUTES = ['index', 'demo-scenarios', 'design-system', 'ux-audit', 'ux-audit-v2', 'ux-changelog', 'cd-log', 'cd-inventory', 'fd-inventory', 'fu-inventory', 'lu-inventory', 'tbd-register', 'tbd-check'];
const _lockDS = lockFor; lockFor = function (r) { return DOC_ROUTES.includes(r) ? null : _lockDS(r); };
UXC.find(x => x[0] === 'Phase 2')[2].push(
  'Fix (found by ft-phase2): on Refund items the Finance wrapper\'s "Original transaction / Refund requested" grid was taken for the main grid, so the decision panel stayed in the page body. The Decision template now picks the grid holding Summary / Decision and moves role panels into the context column. Checked for every open item type.',
  'Fix (found by ft-phase2): in learner variant B (not yet admitted) and the archived / paused states, the prototype\'s documentation pages (Design System, Demo Scenarios, UX Audit, UX Changelog, Decisions Log, TBD register and the other records) showed "Programme content is locked". They now open in every variant; learner content locks are unchanged.',
  'Repository: .gitattributes (LF for every text file; shell scripts always LF); two stray carriage returns removed from js/business.js and js/screens-d.js (whitespace inside HTML strings — no visible change).');
UXC.find(x => x[0] === 'Phase 2')[2].push('Performance: the viewer-local time zone is read once and date formatters are reused per zone and format. Reading the zone on every date made each page about 4× slower to render (crawl 26s → 111s); caching also removes the cost of building a new formatter for each date.');
