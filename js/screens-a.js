/* Screens A: Dashboard, My Courses, course detail (short + NVQ hub), content viewers, quiz, Browse, checkout */
'use strict';

/* ---------- Shared: checkout ---------- */
function checkout({ title, amount, partial = false, min = 0, onSuccess, cur }) {
  cur = cur || W.me.cur;
  const body = () => `<div class="kv"><dt>For</dt><dd>${esc(title)}</dd><dt>Amount due</dt><dd class="strong num">${money(amount, cur)}</dd></div><p class="xs muted ch-stripe">Stripe may show this amount in your local currency. You'll be charged ${money(amount, 'GBP')}.</p>
    ${partial ? `<fieldset class="stack" style="border:0;padding:0;margin:0"><legend class="lbl">How much do you want to pay?</legend>
      <label class="check"><input type="radio" name="payamt" value="full" checked data-onchange="payAmt"> Full amount (${money(amount, cur)})</label>
      <label class="check"><input type="radio" name="payamt" value="part" data-onchange="payAmt"> Part payment</label>
      <div class="field" id="partWrap" hidden><label for="partAmt">Amount (${cur})</label><input class="input num" id="partAmt" type="number" min="${min || 1}" max="${amount}" step="0.01" value="${Math.round(amount / 2)}"><span class="hint">Minimum ${money(min || 1, cur)}. The rest stays due on the same date.</span></div></fieldset>` : ''}
    <div class="field"><label for="payMethod">Payment method</label><select class="select" id="payMethod"><option>Saved card — Visa •••• 4417 (expires 08/28)</option><option>New debit or credit card</option><option>Apple Pay / Google Pay</option></select></div>
    <div class="note b-grey">${ic('shield')}<div class="small">You'll complete payment on our secure payment page. Illumin Academy never stores your full card number.</div></div>
    <label class="check small"><input type="checkbox" id="payFail"> Prototype: simulate a declined payment</label>`;
  openModal({
    title: 'Pay now', sub: 'Secure checkout', body: body(),
    actions: [{ label: 'Cancel', cls: 'btn-ghost' }, { label: `${ic('lock', 15)} Pay securely`, cls: 'btn-primary', fn: () => {
      const part = $('#modal-root input[name="payamt"][value="part"]')?.checked;
      let paid = amount;
      if (part) { paid = parseFloat($('#partAmt').value); if (!(paid >= (min || 1) && paid < amount)) { fieldErr('#partAmt', `Enter an amount between ${money(min || 1, cur)} and ${money(amount, cur)}`); return false; } }
      const fail = $('#payFail').checked;
      MODAL.body = `<div class="empty" aria-live="polite">${ic('refresh', 34)}<strong>Processing your payment…</strong><span class="small">Don't close this window.</span></div>`; MODAL.actions = []; MODAL.dismissable = false; renderModal();
      setTimeout(() => {
        if (fail) openModal({ title: 'Payment failed', body: `<div class="note b-red">${ic('alert')}<div><strong>Your bank declined this payment.</strong> No money has been taken. Check your card details or try another card.</div></div><p class="small muted">Reference TXN-${90100 + Math.floor(Math.random() * 800)} · ${fdt(now().toISOString())}</p>`, actions: [{ label: 'Close', cls: 'btn' }, { label: 'Retry payment', cls: 'btn-primary', fn: () => { checkout({ title, amount, partial, min, onSuccess, cur }); return false; } }] });
        else {
          const ref = 'TXN-' + (90200 + Math.floor(Math.random() * 700));
          W.tx.unshift({ at: now().toISOString(), ref, method: 'Visa •••• 4417', amount: paid, status: 'Succeeded', desc: title, cur });
          onSuccess && onSuccess(paid, ref);
          openModal({ title: 'Payment successful', body: `<div class="note b-green">${ic('check')}<div><strong>${money(paid, cur)} paid.</strong> Thank you — your receipt has been emailed to ${esc(W.me.email)}.</div></div><dl class="kv"><dt>Reference</dt><dd class="mono">${ref}</dd><dt>Paid at</dt><dd>${fdt(now().toISOString())}</dd><dt>For</dt><dd>${esc(title)}</dd></dl>`, actions: [{ label: 'Download receipt', cls: 'btn', fn: () => { toast('Receipt downloaded (simulated).'); return false; } }, { label: 'Done', cls: 'btn-primary' }] });
          render();
        }
      }, 1300);
      return false;
    } }],
  });
}
INP.payAmt = el => { $('#partWrap').hidden = el.value !== 'part'; };

/* ---------- Dashboard ---------- */
function actionItems() {
  const f = W.flags, out = [];
  if (f.nvq && W.admission) {
    const ad = W.admission;
    const pend = W.docs.filter(d => d.mand && d.status === 'Pending');
    if (pend.length && ['Pending — Documents Required'].includes(ad.status)) out.push({ sev: 'blue', t: `Upload documents — ${plural(pend.length, 'mandatory document')} to upload`, d: pend.map(x => x.name).join(', '), btn: 'Upload documents', go: 'admission' });
    W.docs.filter(d => ['Rejected', 'Resubmission Required'].includes(d.status)).forEach(d => out.push({ sev: 'red', t: `Fix a rejected document: ${d.name}`, d: d.reason, btn: 'Re-upload', go: 'admission' }));
    const exp = W.docs.find(d => d.expires && daysTo(d.expires) <= 30 && daysTo(d.expires) > 0 && d.status === 'Approved');
    if (exp) out.push({ sev: 'amber', t: `Replace an expiring document: ${exp.name}`, d: `Expires ${fd(exp.expires)} (in ${daysTo(exp.expires)} days).`, btn: 'Replace', go: 'admission' });
    const allApproved = W.docs.filter(d => d.mand).every(d => d.status === 'Approved');
    if (allApproved && !ad.deposit.paid && !['Rejected', 'Withdrawn'].includes(ad.status)) out.push({ sev: 'red', t: `Pay your deposit to hold your seat (${money(ad.deposit.min)})`, d: `Seat offer ends in <span class="countdown" data-count="${D(7, '22:59')}">${cdown(new Date(D(7, '22:59')) - now())}</span>`, btn: 'Pay deposit', act: 'payDeposit' });
    if (ad.deposit.paid && ad.deposit.holdUntil && new Date(ad.deposit.holdUntil) > now()) out.push({ sev: 'amber', t: `Pay your balance — seat held until ${fd(ad.deposit.holdUntil)}`, d: `Seat hold ends in <span class="countdown" data-count="${ad.deposit.holdUntil}">${cdown(new Date(ad.deposit.holdUntil) - now())}</span> · balance ${money(ad.deposit.balance)}`, btn: 'Pay balance', act: 'payBalance' });
  }
  if (f.nvq && f.admitted) {
    const wp = W.workplace.perm;
    if (wp === 'Not entered') out.push({ sev: 'red', t: 'Enter your workplace details', d: 'We need your care home details to arrange observations.', btn: 'Enter details', go: 'observations' });
    if (wp === 'Permission Pending') out.push({ sev: 'blue', t: 'Workplace permission pending', d: `Sent to ${W.workplace.cname} on ${fd(W.workplace.sent)}. ${W.workplace.reminder || ''}`, btn: 'View status', go: 'observations' });
    if (wp === 'Declined' || wp === 'Expired') out.push({ sev: 'red', t: `Workplace permission ${wp.toLowerCase()}`, d: wp === 'Declined' ? W.workplace.declineReason : 'The permission link expired without a reply.', btn: 'Edit & resend', go: 'observations' });
    W.observations.filter(o => o.status === 'Proposed').forEach(o => out.push({ sev: 'amber', t: 'Confirm an observation date', d: `${fdt(o.at)} at ${o.loc}`, btn: 'Respond', go: 'observations' }));
    if (W.pd.session.status === 'Proposed') out.push({ sev: 'amber', t: 'Confirm your Professional Discussion date', d: `${fdt(W.pd.session.at)} · ${W.pd.session.mode}`, btn: 'Respond', go: 'progress', tab: 'pd' });
    W.assignments.filter(a => a.status === 'Resubmission Required').forEach(a => out.push({ sev: 'red', t: `Resubmission required: ${a.title}`, d: `Resubmission ${a.resubUsed + 1} of ${a.resubMax} due ${fdt(a.resubDue || a.due)}`, btn: 'Open', go: 'assignment', id: a.id }));
  }
  (W.plans || []).forEach(pl => pl.rows.forEach(r => {
    if (r.status === 'Overdue') out.push({ sev: 'red', t: `Pay instalment ${r.n} — overdue ${calDaysLate(r.due, tzOfLearner(W.me))} days`, d: `${pl.title} · ${money(r.amount - r.paid)} was due ${fd(r.due)}`, btn: 'Pay now', act: 'payInst', e: pl.e, n: r.n });
    else if (r.status === 'Pending' && !r.confirming && daysTo(r.due) <= 7 && daysTo(r.due) >= 0) out.push({ sev: 'amber', t: `Pay instalment ${r.n} — due in ${daysTo(r.due)} days`, d: `${pl.title} · ${money(r.amount)} due ${fd(r.due)}`, btn: 'Pay now', act: 'payInst', e: pl.e, n: r.n });
  }));
  (W.requests || []).filter(r => r.decided && daysTo(r.decided) >= -3).forEach(r => out.push({ sev: 'blue', t: `Request decided: ${r.type} — ${r.status}`, d: r.decision, btn: 'View', go: 'requests' }));
  return out;
}
SCREENS.dashboard = () => {
  const f = W.flags, hr = +fmt(now().toISOString(), { hour: '2-digit', hour12: false });
  const greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const acts = actionItems();
  const weekEnd = new Date(now().getTime() + 7 * DAY);
  const deadlines = W.events.filter(e => e.type === 'deadline' && new Date(e.start) > now() && new Date(e.start) < weekEnd).length;
  const active = W.enrolments.filter(e => ['Active', 'Payment Pending'].includes(e.status));
  const ad = W.admission;
  let html = `<div class="hello"><p class="eyebrow">${fdl(now().toISOString())}</p><h1>${greet}, ${esc(W.me.first)}</h1><p class="muted">${plural(deadlines, 'deadline')} this week, ${plural(acts.length, 'action')} needed.</p></div>`;
  html += edgeNotices('dashboard');
  if (acts.length) html += `<section class="action-panel" aria-labelledby="ap-h"><div class="ap-h"><h2 id="ap-h" class="row">${ic('flag')}Action needed</h2><span class="small strong">${acts.length} ${acts.length === 1 ? 'item' : 'items'}</span></div>
    <ul class="ap-list">${acts.map(a => `<li class="ap-item"><span class="ap-sev ${a.sev}" aria-hidden="true"></span><div class="ap-b"><div class="strong">${esc(a.t)}</div><div class="small muted">${a.d}</div></div>
    <button class="btn btn-sm ${a.sev === 'red' ? 'btn-primary' : ''}" ${a.go ? `data-go="${a.go}" ${a.id ? `data-id="${a.id}"` : ''} ${a.tab ? `data-tab="${a.tab}"` : ''}` : `data-act="${a.act}" data-e="${a.e || ''}" data-n="${a.n || ''}"`}>${a.btn}</button></li>`).join('')}</ul></section>`;
  if (!active.length && !W.enrolments.some(e => e.kind === 'nvq')) {
    html += `<section class="card"><div class="empty">${ic('book', 40)}<h2>You don't have an active course yet</h2><p>${ad ? 'Your NVQ programme starts once your admission is approved. Finish your admission tasks above, or browse short courses you can start today.' : 'Browse short courses you can start today.'}</p><div class="row" style="justify-content:center">${ad ? '<button class="btn btn-primary" data-go="admission">Continue my application</button>' : ''}<button class="btn" data-go="browse">Browse courses</button></div></div>
      <h3>Popular short courses</h3><div class="grid">${CATALOGUE.filter(c => c.kind === 'short').slice(0, 3).map(catCard).join('')}</div></section>`;
  }
  if (W.enrolments.some(e => e.status !== 'Discontinued' || S.edge === 'discontinued')) html += `<section class="stack" aria-labelledby="pc-h"><div class="row-b"><h2 id="pc-h">My learning</h2><button class="btn btn-sm btn-ghost" data-go="courses">All courses ${ic('chev', 14)}</button></div><div class="grid">${W.enrolments.filter(e => e.status !== 'Discontinued' || S.edge === 'discontinued').map(enrolCard).join('')}</div></section>`;
  const left = [], right = [];
  if (f.nvq && f.admitted) left.push(assignWidget());
  left.push(upcomingWidget());
  left.push(feedbackWidget());
  right.push(announceWidget());
  right.push(recentNotifWidget());
  html += `<div class="grid-2"><div class="stack-lg">${left.join('')}</div><div class="stack-lg">${right.join('')}</div></div>`;
  return html;
};
AFTER.push(() => {
  clearTimer('cd');
  if ($$('[data-count]').length) timer('cd', () => { const els = $$('[data-count]'); if (!els.length) return clearTimer('cd'); els.forEach(el => el.textContent = cdown(new Date(el.dataset.count) - now())); }, 1000);
});
function edgeNotices(where) {
  const out = [];
  if (W.unassigned && ['dashboard', 'courses'].includes(where)) out.push(`<div class="note b-amber" role="status">${ic('info')}<div><strong>${esc(W.unassigned.agency)} has removed your seat on ${esc(W.unassigned.course)}.</strong> It no longer appears in your courses (since ${fdt(W.unassigned.at)}). Your progress is kept, so if the agency assigns the seat again you'll continue where you left off. Questions? Contact your agency or the Academy.</div></div>`);
  if (W.batchCancelled && ['dashboard', 'courses', 'nvq', 'admission'].includes(where)) out.push(W.batchCancelled.refund
    ? `<div class="note b-red" role="alert">${ic('alert')}<div><strong>Your batch ${esc(W.nvq.batch)} has been cancelled.</strong> Refund in progress: ${money(W.batchCancelled.amount)} will be returned to your original payment method within 5–10 working days. We're sorry for the disruption.<div class="b-act"><button class="btn btn-sm" data-go="payments">View refund</button><button class="btn btn-sm btn-ghost" data-go="messages">Message the Academy</button></div></div></div>`
    : `<div class="note b-blue" role="status">${ic('info')}<div><strong>Your original batch was cancelled.</strong> You've been moved to batch <strong>${esc(W.batchCancelled.moved)}</strong> starting ${fd(W.batchCancelled.start)}. Your progress, submissions and payments carry over.<div class="b-act"><button class="btn btn-sm" data-go="course" data-id="nvq">View programme</button></div></div></div>`);
  if (S.edge === 'paypending' && ['dashboard', 'courses'].includes(where)) out.push(`<div class="note b-amber" role="status">${ic('clock')}<div><strong>We're confirming your payment for Fire Safety Awareness.</strong> This usually takes a few minutes. The course unlocks automatically once your bank confirms.</div></div>`);
  if (S.edge === 'waitlist' && where === 'dashboard') out.push(`<div class="note b-amber">${ic('users')}<div><strong>Admission approved — the batch is full.</strong> You're #${W.admission.waitlist.pos} on the waitlist. We've also offered you the next intake starting ${fd(W.admission.waitlist.next)}.<div class="b-act"><button class="btn btn-sm" data-go="admission">See options</button></div></div></div>`);
  return out.join('');
}
function enrolCard(e) {
  const isN = e.kind === 'nvq';
  const dl = e.end ? daysTo(e.end) : null;
  let extra = '';
  if (isN) {
    const c = countStates(allCrit());
    extra = `<div class="stack" style="gap:6px"><span class="xs muted">Competency summary</span>${fiveBar(c)}<div class="chip-row">${FIVE.map(([k]) => chip(`${k} ${c[k]}`, TONE[k])).join('')}</div></div><div class="small"><span class="muted">Batch:</span> ${esc(e.batch)}</div>${W.qualified ? `<div class="note b-green">${ic('award')}<strong>Qualification requirements met</strong></div>` : ''}`;
  }
  const pend = e.status === 'Payment Pending';
  return `<article class="card enrol-card"><div class="ec-top"><span class="typebadge ${isN ? 'nvq' : ''}">${e.type}</span>${chip(pend ? 'Payment Pending' : e.status)}${e.sponsor ? `<span class="sponsor">${ic('building', 13)}Sponsored by ${esc(e.sponsor)}</span>` : ''}</div>
    <h3><a href="#course.${e.id}" data-go="course" data-id="${e.id}">${esc(e.title)}</a></h3>
    ${pend ? `<div class="note b-amber">${ic('clock')}<div class="small"><strong>Confirming payment.</strong> We're waiting for your bank to confirm. Content unlocks automatically.</div></div>` : bar(e.progress || (isN ? nvqProgress() : 0), 'Course progress')}
    ${e.end ? `<p class="small">${dl >= 0 ? `Access ends <strong>${fd(e.end)}</strong> · <span class="num">${dl}</span> days left` : `<span style="color:var(--redor)">Access ended ${fd(e.end)}</span>`}</p>` : ''}
    ${e.status === 'Discontinued' ? `<p class="small" style="color:var(--red)">${esc(e.reason || '')}</p>` : ''}
    ${extra}
    <div><button class="btn btn-sm" data-go="course" data-id="${e.id}">Open ${ic('chev', 14)}</button></div></article>`;
}
function assignWidget() {
  const list = W.assignments.filter(a => a.status !== 'Completed').slice(0, 5);
  return `<section class="card" aria-labelledby="aw-h"><div class="card-h"><h2 id="aw-h">${ic('edit')}Assignments</h2><button class="btn btn-sm btn-ghost" data-go="assignments">View all</button></div>
  <ul class="list">${list.map(a => { const od = a.closed || (new Date(a.due) < now() && a.status === 'Not Started'); return `<li class="li"><div class="li-b"><a href="#assignment.${a.id}" data-go="assignment" data-id="${a.id}" class="strong">${esc(a.title)}</a><span class="small muted">${esc(W.nvq.title)} · Due ${fdt(a.resubDue || a.due)}</span>${od ? `<span class="small" style="color:var(--red)">${ic('alert', 13)} Overdue — deadline passed</span>` : ''}</div><div class="li-a">${chip(a.status)}<button class="btn btn-sm" data-go="assignment" data-id="${a.id}" aria-label="Open ${esc(a.title)}">Open</button></div></li>`; }).join('')}</ul></section>`;
}
function joinBtn(ev) {
  const mins = (new Date(ev.start) - now()) / 6e4, live = mins <= 15 && now() < new Date(ev.end);
  if (!ev.link) return `<span class="small muted">${ic('map', 13)} ${esc(ev.loc || 'In person')}</span>`;
  return live ? `<button class="btn btn-sm btn-primary" data-act="joinZoom" data-id="${ev.id}">${ic('zoom', 15)}Join on Zoom</button>` : `<button class="btn btn-sm" disabled title="Opens 15 minutes before the start">${ic('zoom', 15)}Join on Zoom</button><span class="xs muted">Opens 15 min before</span>`;
}
ACT.joinZoom = el => {
  const ev = W.events.find(e => e.id === el.dataset.id);
  openModal({ title: 'Join on Zoom', body: `<p><strong>${esc(ev.title)}</strong><br>${fdt(ev.start)}</p><div class="note b-blue">${ic('info')}<div><strong>Join using your registered email (${esc(W.me.email)})</strong> so your attendance is recorded.</div></div><div class="field"><label for="zl">Meeting link</label><input class="input mono" id="zl" readonly value="${ev.link}"></div>`, actions: [{ label: 'Copy link', cls: 'btn', fn: () => { copyText(ev.link, 'Zoom link copied'); return false; } }, { label: 'Open Zoom (simulated)', cls: 'btn-primary', fn: () => toast('Zoom would open in a new window.', 'info') }] });
};
function upcomingWidget() {
  const end = new Date(now().getTime() + 7 * DAY);
  const list = W.events.filter(e => new Date(e.end) > now() && new Date(e.start) < end).sort((a, b) => new Date(a.start) - new Date(b.start));
  const lbl = { class: 'Class', deadline: 'Deadline', obs: 'Observation', pd: 'PD session', mile: 'Milestone' };
  return `<section class="card" aria-labelledby="up-h"><div class="card-h"><h2 id="up-h">${ic('cal')}Next 7 days</h2><button class="btn btn-sm btn-ghost" data-go="calendar">Calendar</button></div>
  ${list.length ? `<ul class="list">${list.map(e => `<li class="li"><div class="li-icon" style="color:var(--ev-${e.type})">${ic({ class: 'zoom', deadline: 'clock', obs: 'eye', pd: 'users', mile: 'flag' }[e.type])}</div><div class="li-b"><span class="strong">${esc(e.title)}</span><span class="small muted">${lbl[e.type]} · ${fds(e.start)}, ${ft(e.start)}${e.updated ? ` · ${chip('Updated', 'amber')}` : ''}</span></div><div class="li-a">${e.type === 'class' ? joinBtn(e) : e.go ? `<button class="btn btn-sm" data-act="goTok" data-t="${e.go}">Open</button>` : ''}</div></li>`).join('')}</ul>` : `<div class="empty">${ic('cal', 34)}<p>Nothing scheduled in the next 7 days.</p></div>`}</section>`;
}
ACT.goTok = el => { const [r, id, tab] = el.dataset.t.split('.'); go(r, { id, tab }); };
function feedbackWidget() {
  let items = [];
  if (W.flags.nvq && W.flags.admitted) {
    W.assignments.forEach(a => { const last = a.qs.flatMap(q => q.fb).sort((x, y) => new Date(y.at) - new Date(x.at))[0]; if (last) items.push({ at: last.at, t: a.title, d: a.overall, by: a.assessor, go: a.id, rag: a.qs.map(q => q.fb.length ? q.fb[q.fb.length - 1].rag : null).filter(Boolean) }); if (a.coord) items.push({ at: a.coord.at, t: 'Coordinator feedback — ' + a.title, d: a.coord.text, by: a.coord.by, go: a.id, coord: true }); });
  } else {
    W.enrolments.forEach(e => (e.quiz?.attempts || []).forEach(at => items.push({ at: at.at, t: `Quiz result — ${e.title}`, d: `Attempt ${at.n}: ${at.score}% (pass mark ${e.quiz.pass}%)`, result: at.result, course: e.id })));
  }
  items = items.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 4);
  return `<section class="card" aria-labelledby="fb-h"><div class="card-h"><h2 id="fb-h">${ic('msg')}Recent feedback</h2></div>${items.length ? `<ul class="list">${items.map(i => `<li class="li"><div class="li-b"><span class="strong">${esc(i.t)}</span><span class="small">${esc(i.d || '')}</span><span class="xs muted">${i.by ? esc(i.by) + ' · ' : ''}${fdt(i.at)}</span>${i.rag ? `<div class="chip-row">${i.rag.map(rag).join('')}</div>` : ''}${i.coord ? `<span>${chip('Coordinator feedback', 'grey')}</span>` : ''}${i.result ? chip(i.result) : ''}</div><div class="li-a"><button class="btn btn-sm" ${i.go ? `data-go="assignment" data-id="${i.go}" data-tab="feedback"` : `data-go="course" data-id="${i.course}" data-tab="quiz"`}>View</button></div></li>`).join('')}</ul>` : `<div class="empty"><p>No feedback yet.</p></div>`}</section>`;
}
function announceWidget() {
  const list = [...W.announcements].filter(a => !a.expired).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).slice(0, 4);
  return `<section class="card" aria-labelledby="an-h"><div class="card-h"><h2 id="an-h">${ic('pin')}Announcements</h2><button class="btn btn-sm btn-ghost" data-go="messages" data-tab="announcements">All</button></div>
  <div class="stack">${list.map(a => `<details class="card flat" style="padding:12px;gap:6px"><summary style="cursor:pointer;list-style:none"><div class="row" style="gap:6px">${a.pinned ? chip('Pinned', 'amber') : ''}<span class="typebadge">${a.kind}</span></div><div class="strong" style="margin-top:4px">${esc(a.title)}</div><div class="xs muted">${esc(a.from)} · ${fd(a.at)}</div></summary><p class="small">${esc(a.body)}</p>${a.att ? `<button class="btn btn-sm" data-act="fakeDl" data-f="${a.att}">${ic('download', 14)}${esc(a.att)}</button>` : ''}</details>`).join('')}</div></section>`;
}
ACT.fakeDl = el => toast(`${esc(el.dataset.f)} downloaded (simulated).`);
function recentNotifWidget() {
  const list = W.notifs.slice(0, 5);
  return `<section class="card" aria-labelledby="rn-h"><div class="card-h"><h2 id="rn-h">${ic('bell')}Recent notifications</h2><button class="linklike small" data-act="markAllRead">Mark all read</button></div>
  <ul class="list">${list.map(n => `<li class="li" style="cursor:pointer" data-act="openNotif" data-id="${n.id}">${n.unread ? '<span class="unread-dot"></span><span class="sr">Unread</span>' : '<span class="read-dot"></span><span class="sr">Read</span>'}<div class="li-b"><span class="small ${n.unread ? 'strong' : ''}">${esc(n.title)}</span><span class="xs muted">${esc(n.body)} · ${rel(n.at)}</span></div></li>`).join('')}</ul><button class="btn btn-sm" data-go="notifications">View all</button></section>`;
}
ACT.markAllRead = () => { W.notifs.forEach(n => n.unread = false); S.menu = null; render(); toast('All notifications marked as read.'); };
ACT.openNotif = el => { const n = W.notifs.find(x => x.id === el.dataset.id); n.unread = false; S.menu = null; const [r, id, tab] = n.go.split('.'); go(r, { id, tab }); };

/* ---------- My Courses ---------- */
SCREENS.courses = (p) => {
  const t = ui('coursesTab', 'Active');
  const groups = { Active: ['Active', 'Payment Pending'], Completed: ['Completed'], Expired: ['Expired-Incomplete'], Discontinued: ['Discontinued'], All: null };
  const list = W.enrolments.filter(e => !groups[t] || groups[t].includes(e.status));
  return `${pageHead('My Courses', 'Every enrolment, including re-enrolments, is listed separately with its own dates and history.')}${edgeNotices('courses')}
  ${tabs(Object.keys(groups).map(k => [k, k, W.enrolments.filter(e => !groups[k] || groups[k].includes(e.status)).length]), t, 'coursesTab', 'Course status')}
  ${list.length ? `<div class="tbl-wrap"><table class="tbl"><caption class="sr">${t} courses</caption><thead><tr><th>Course</th><th>Type</th><th>Enrolled</th><th>Access period</th><th>Status</th><th>Progress</th><th>Sponsor</th><th><span class="sr">Actions</span></th></tr></thead><tbody>
  ${list.map(e => `<tr><td><a href="#course.${e.id}" data-go="course" data-id="${e.id}" class="strong">${esc(e.title)}</a></td><td><span class="typebadge ${e.kind === 'nvq' ? 'nvq' : ''}">${e.type}</span></td><td class="nowrap">${fd(e.enrolled)}</td><td class="nowrap">${e.start ? `${fd(e.start)} – ${fd(e.end)}` : '<span class="muted">Starts when payment is confirmed</span>'}</td><td>${chip(e.status)}</td><td style="min-width:130px">${e.status === 'Payment Pending' ? '<span class="small muted">—</span>' : bar(e.kind === 'nvq' ? nvqProgress() : e.progress, 'Progress')}</td><td class="small">${e.sponsor ? esc(e.sponsor) : '<span class="muted">Self-funded</span>'}</td><td><button class="btn btn-sm" data-go="course" data-id="${e.id}">Open</button></td></tr>`).join('')}
  </tbody></table></div>` : `<div class="card"><div class="empty">${ic('book', 38)}<p>No ${t.toLowerCase()} courses.</p><button class="btn" data-go="browse">Browse courses</button></div></div>`}`;
};
ACT.coursesTab = el => { setUi('coursesTab', el.dataset.k); render(); };

/* ---------- Course detail ---------- */
SCREENS.course = (p) => {
  const e = enrolById(p.id);
  if (!e) return notFound();
  if (e.kind === 'nvq') return nvqHub(e, p);
  const crumbs = [['My Courses', 'courses'], [e.title]];
  const head = pageHead(esc(e.title), `${e.type} · enrolled ${fd(e.enrolled)}`, `${chip(e.status)}${e.sponsor ? `<span class="sponsor">${ic('building', 13)}Sponsored by ${esc(e.sponsor)}</span>` : ''}`, crumbs);
  if (e.status === 'Discontinued') return head + `<div class="lockpage" style="margin-top:10px"><div class="lock-ic" style="background:var(--red-bg);color:var(--red)">${ic('lock', 30)}</div><h2>This course has been discontinued</h2><p>${esc(e.reason)}</p><p class="small muted">Your other courses are not affected.</p>
    <p class="small">You have <strong>read-only</strong> access to your past submissions and certificates for this course.</p>${e.quiz.attempts.length ? `<div class="card" style="text-align:left;width:100%"><h3>Your past quiz attempts (read-only)</h3>${attemptTable(e)}</div>` : '<p class="small muted">No quiz attempts were submitted on this course.</p>'}${(() => { const cs = W.certs.filter(c => c.course && e.title.startsWith(c.course.split(' —')[0])); return cs.length ? `<div class="card" style="text-align:left;width:100%"><h3>Certificates for this course (read-only)</h3><ul class="list small">${cs.map(c => `<li class="li"><div class="li-b"><strong>${esc(c.course)}</strong><span class="muted">#${esc(c.no)} · ${c.issued ? 'issued ' + fd(c.issued) : '—'}</span></div>${chip(c.status)}<button class="btn btn-sm" data-act="viewCert" data-id="${c.id}">View</button></li>`).join('')}</ul></div>` : ''; })()}<button class="btn" data-go="messages">Message the Academy</button></div>`;
  if (e.status === 'Payment Pending') return head + `<div class="lockpage"><div class="lock-ic" style="background:var(--amber-bg);color:var(--amber)">${ic('clock', 30)}</div><h2>We're confirming your payment</h2><p>We received your payment for ${esc(e.title)} at ${ft(e.enrolled)} and are waiting for your bank to confirm it. This usually takes a few minutes, but can take up to 24 hours. The course unlocks automatically.</p><button class="btn" data-act="confirmPay" data-id="${e.id}">Prototype: bank confirms payment</button></div>`;
  const t = p.tab || 'overview';
  const body = { overview: shortOverview, content: shortContent_, quiz: quizTab, certificate: certTab }[t] || shortOverview;
  return head + subtabs([['overview', 'Overview'], ['content', 'Content'], ['quiz', 'Quiz'], ['certificate', 'Certificate']], t, 'course', e.id) + body(e);
};
ACT.confirmPay = el => { const e = enrolById(el.dataset.id); e.status = 'Active'; e.start = now().toISOString(); e.end = D(90); const pl = W.plans.find(x => x.e === e.id); if (pl) { pl.rows[0].status = 'Paid'; pl.rows[0].paid = pl.rows[0].amount; pl.rows[0].confirming = false; pl.rows[0].receipt = 'RCP-27118'; pl.pendingConfirm = false; } const t = W.tx.find(x => x.ref === 'TXN-90017'); if (t) t.status = 'Succeeded'; render(); toast('Payment confirmed. Fire Safety Awareness is now active.'); };
function shortOverview(e) {
  const dl = daysTo(e.end);
  const expired = e.status === 'Expired-Incomplete';
  return `${expired ? `<div class="note b-amber" role="status">${ic('clock')}<div><strong>Your access ended on ${fd(e.end)} before you completed the course.</strong> Your progress is saved at ${e.progress}% and frozen. Request more time to continue where you left off, or re-purchase the course.
    <div class="b-act"><button class="btn btn-sm btn-primary" data-act="reqTime" data-id="${e.id}">Request more time</button><button class="btn btn-sm" data-act="repurchase" data-id="${e.id}">Re-purchase (${money(repurchasePrice(e))})</button></div></div></div>` : ''}
  <div class="grid-2"><section class="card"><h2>About this course</h2><p>${esc(e.desc)}</p>
    <h3>Completion requirements</h3><ul class="list">${e.reqs.map(([r, ok]) => `<li class="li" style="padding:8px 0"><span aria-hidden="true" style="color:var(${ok ? '--green' : '--muted'})">${ic(ok ? 'check' : 'clock', 18)}</span><div class="li-b"><span>${esc(r)}</span></div>${chip(ok ? 'Done' : 'To do')}</li>`).join('')}</ul></section>
    <section class="card"><h2>Your progress</h2>${bar(e.progress, 'Course progress', expired ? 'gold' : '')}${expired ? `<p class="small muted">${ic('lock', 13)} Progress frozen</p>` : ''}
    <dl class="kv"><dt>Status</dt><dd>${chip(e.status)}</dd><dt>Access period</dt><dd>${fd(e.start)} – ${fd(e.end)}</dd><dt>Days remaining</dt><dd class="num">${dl >= 0 ? dl + ' days' : 'Ended'}</dd><dt>Certificate validity</dt><dd>${esc(e.validity)}</dd><dt>Price paid</dt><dd>${e.sponsor ? 'Paid by ' + esc(e.sponsor) : money(e.price, e.cur)}</dd></dl>
    ${!expired ? `<button class="btn btn-primary" data-go="course" data-id="${e.id}" data-tab="content">Continue learning</button>` : ''}</section></div>`;
}
function shortContent_(e) {
  if (e.status === 'Expired-Incomplete') return `<div class="lockpage"><div class="lock-ic">${ic('lock', 30)}</div><h2>Your access has ended — renew</h2><p class="muted">Course content is hidden while your access is expired. Request more time or re-purchase to continue.</p><div class="row" style="justify-content:center"><button class="btn btn-primary" data-act="reqTime" data-id="${e.id}">Request more time</button><button class="btn" data-act="repurchase" data-id="${e.id}">Re-purchase</button></div></div>`;
  const icn = { doc: 'doc', video: 'video', scorm: 'pkg' }, lbl = { doc: 'Document', video: 'Vimeo video', scorm: 'SCORM package' };
  return `<section class="card pad0"><div style="padding:16px 18px" class="row-b"><h2>Course content</h2><span class="small muted">${e.content.filter(c => c.state === 'Completed').length} of ${e.content.length} completed · work through the items in order</span></div>
  <ol class="list" style="padding:0 18px">${e.content.map((c, i) => `<li class="li"><div class="li-icon">${ic(icn[c.kind])}</div><div class="li-b"><span class="xs muted">${i + 1} · ${lbl[c.kind]} · ${c.dur}</span><span class="strong">${esc(c.title)}</span>${c.kind === 'video' ? `<div style="max-width:260px">${bar(c.watch, 'Watched')}</div><span class="xs muted">${c.watch > 0 && c.watch < 100 ? 'Resume from ' + c.resume : c.watch >= 100 ? 'Watched' : 'Not started'}</span>` : ''}${c.kind === 'scorm' && c.score ? `<span class="xs muted">Score ${c.score}%</span>` : ''}</div>
    <div class="li-a">${chip(c.state)}<button class="btn btn-sm ${c.state !== 'Completed' ? 'btn-primary' : ''}" data-act="openItem" data-e="${e.id}" data-id="${c.id}">${c.kind === 'scorm' ? 'Launch' : c.kind === 'video' ? (c.watch > 0 && c.watch < 100 ? 'Resume' : 'Watch') : 'Open'}</button>${c.dl ? `<button class="btn btn-sm btn-ghost" data-act="fakeDl" data-f="${esc(c.title)}.pdf" aria-label="Download ${esc(c.title)}">${ic('download', 15)}</button>` : ''}</div></li>`).join('')}</ol></section>`;
}
function recalcShort(e) {
  const done = e.content.filter(c => c.state === 'Completed').length + (e.quiz.attempts.some(a => a.result === 'Pass') ? 1 : 0);
  e.progress = Math.round(done / (e.content.length + 1) * 100);
  const map = { 'Open all documents': e.content.filter(c => c.kind === 'doc').every(c => c.state !== 'Not opened'), 'Watch all videos to at least 90%': e.content.filter(c => c.kind === 'video').every(c => c.watch >= 90) };
  e.reqs = e.reqs.map(([r, ok]) => [r, map[r] !== undefined ? map[r] : ok]);
}
ACT.openItem = el => {
  const e = enrolById(el.dataset.e), c = e.content.find(x => x.id === el.dataset.id);
  if (c.state === 'Not opened') c.state = 'Opened';
  if (c.kind === 'doc') { c.state = 'Completed'; recalcShort(e); }
  const viewer = () => {
    if (c.kind === 'doc') return `<div class="viewer"><div class="v-tb"><span>${ic('doc', 15)} ${esc(c.title)}.pdf</span><span class="spacer"></span><span>Page 1 of ${parseInt(c.dur) || 4}</span><button>−</button><button>+</button>${c.dl ? `<button data-act="fakeDl" data-f="${esc(c.title)}.pdf">${ic('download', 14)} Download</button>` : '<span class="xs" style="opacity:.75">Download not available for this document</span>'}</div><div class="pdf-pages">${[1, 2].map(n => `<div class="pdf-page"><strong style="font-size:1rem">${n === 1 ? esc(c.title) : 'Section ' + n}</strong>${Array.from({ length: 14 }, (_, i) => `<div class="ln" style="width:${60 + (i * 37 % 40)}%"></div>`).join('')}</div>`).join('')}</div></div>`;
    if (c.kind === 'video') return `<div class="viewer"><div class="video"><button class="play" data-act="vidPlay" aria-label="${ui('vidPlaying') ? 'Pause' : 'Play'} video">${ic(ui('vidPlaying') ? 'pause' : 'play', 28)}</button><div class="vbar"><div class="bar" role="progressbar" aria-valuenow="${c.watch}" aria-valuemin="0" aria-valuemax="100" aria-label="Watched"><span id="vidbar" style="width:${c.watch}%"></span></div><div class="row-b"><span id="vidpos">${c.watch > 0 && c.watch < 100 ? 'Resuming from ' + c.resume : '0:00'} / ${c.dur}</span><span>Vimeo · captions on</span></div></div></div><div class="v-tb"><span>${esc(c.title)}</span><span class="spacer"></span><span id="vidpct">${c.watch}% watched</span></div></div><p class="small muted">Watch at least 90% to complete this video. We remember where you stopped.</p>`;
    return `<div class="viewer"><div class="v-tb"><span>${ic('pkg', 15)} SCORM 1.2 player — ${esc(c.title)}</span><span class="spacer"></span><span>Tracking: completion and score</span></div><div class="scorm"><span class="eyebrow">Scenario 2 of 3</span><h3>Mrs P has slipped to the floor in her room. She says she isn't hurt. What do you do first?</h3>${['Help her up straight away', 'Make her comfortable, check for injury and call for a senior', 'Use the hoist on your own'].map((o, i) => `<label class="opt"><input type="radio" name="sc" ${i === 1 ? 'checked' : ''}>${o}</label>`).join('')}<div class="row"><button class="btn btn-primary" data-act="scormFinish" data-e="${e.id}" data-id="${c.id}">Finish module</button><span class="small muted">Closing the window saves your place.</span></div></div></div>`;
  };
  openModal({ title: esc(c.title), sub: `${{ doc: 'Document', video: 'Vimeo video', scorm: 'SCORM package' }[c.kind]} · ${c.dur}`, size: 'xl', body: viewer(), onClose: () => { clearTimer('vid'); setUi('vidPlaying', false); render(); } });
  setUi('vidCur', [e.id, c.id]);
};
ACT.vidPlay = () => {
  const [eid, cid] = ui('vidCur'); const e = enrolById(eid), c = e.content.find(x => x.id === cid);
  const playing = !ui('vidPlaying'); setUi('vidPlaying', playing);
  const b = $('.video .play'); b.innerHTML = ic(playing ? 'pause' : 'play', 28); b.setAttribute('aria-label', playing ? 'Pause video' : 'Play video');
  if (!playing) return clearTimer('vid');
  timer('vid', () => {
    c.watch = Math.min(100, c.watch + 4); c.resume = Math.floor(c.watch * 0.14) + ':' + String(c.watch * 7 % 60).padStart(2, '0');
    if (c.watch >= 90 && c.state !== 'Completed') { c.state = 'Completed'; recalcShort(e); toast('Video completed.'); }
    const bb = $('#vidbar'); if (bb) { bb.style.width = c.watch + '%'; $('#vidpct').textContent = c.watch + '% watched'; $('#vidpos').textContent = c.resume + ' / ' + c.dur; }
    if (c.watch >= 100) { clearTimer('vid'); setUi('vidPlaying', false); }
  }, 400);
};
ACT.scormFinish = el => { const e = enrolById(el.dataset.e), c = e.content.find(x => x.id === el.dataset.id); c.state = 'Completed'; c.score = 92; recalcShort(e); closeModal(); toast('SCORM module completed — score 92% recorded.'); };

/* Quiz tab */
function attemptTable(e) {
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Attempt</th><th>Date and time</th><th class="r">Score</th><th>Result</th></tr></thead><tbody>${e.quiz.attempts.length ? e.quiz.attempts.map(a => `<tr><td class="num">${a.n}</td><td>${fdt(a.at)}${a.auto ? ' · ' + chip('Auto-submitted', 'amber') : ''}</td><td class="r num">${a.score}%</td><td>${chip(a.result)}</td></tr>`).join('') : '<tr><td colspan="4" class="muted">No attempts yet.</td></tr>'}</tbody></table></div>`;
}
function quizTab(e) {
  const q = e.quiz, used = q.attempts.length, left = q.max - used, passed = q.attempts.find(a => a.result === 'Pass');
  if (e.status === 'Expired-Incomplete') return shortContent_(e);
  const last = q.attempts[used - 1];
  let top;
  if (passed) top = `<div class="note b-green">${ic('check')}<div><strong>You passed with ${passed.score}%</strong> on attempt ${passed.n} (${fdt(passed.at)}). Your certificate is issued automatically.</div></div>`;
  else if (left <= 0) {
    const pendingReq = W.requests.find(r => r.type === 'Extra quiz attempts' && r.target === e.title && r.status === 'Requested');
    top = `<div class="card" style="border-color:var(--redor)"><h2 class="row" style="color:var(--redor)">${ic('alert')}All ${q.max} attempts used</h2><p>You haven't reached the pass mark of ${q.pass}% yet. Choose how to continue:</p>
      ${pendingReq ? `<div class="note b-amber">${ic('clock')}<div>Your request ${pendingReq.id} for more attempts is with the Academy. We'll notify you when it's decided.</div></div>` : ''}
      <div class="grid-2e"><div class="card flat"><h3>Request more attempts</h3><p class="small muted">Tell the Academy why you need more attempts. You'll see the decision in My Requests.</p><button class="btn btn-primary" data-act="reqAttempts" data-id="${e.id}" ${pendingReq ? 'disabled' : ''}>Request more attempts</button></div>
      <div class="card flat"><h3>Re-purchase the course</h3><p class="small muted">Start a new enrolment at the full price (${money(repurchasePrice(e))}). Your current record is kept.</p><button class="btn" data-act="repurchase" data-id="${e.id}">Re-purchase course</button></div></div></div>`;
  } else top = `<section class="card"><div class="row-b"><h2>Course quiz</h2>${last ? chip(`Last attempt: ${last.score}% · ${last.result}`, last.result === 'Pass' ? 'green' : 'red') : ''}</div>
    <div class="kpis"><div class="kpi"><span class="xs muted">Questions</span><span class="big-num">${q.q}</span></div><div class="kpi"><span class="xs muted">Time limit</span><span class="big-num">${q.limit}<small class="small"> min</small></span></div><div class="kpi"><span class="xs muted">Pass mark</span><span class="big-num">${q.pass}%</span></div><div class="kpi"><span class="xs muted">Attempts used</span><span class="big-num">${used}<small class="small"> of ${q.max}</small></span></div></div>
    <div class="note b-blue">${ic('info')}<div class="small">The timer starts when you begin and can't be paused. Your answers save as you go. If time runs out, the quiz is submitted automatically with no review.</div></div>
    <div><button class="btn btn-primary" data-act="startQuiz" data-id="${e.id}">${used ? 'Retry quiz' : 'Start quiz'} (attempt ${used + 1} of ${q.max})</button></div></section>`;
  return `${top}<section class="stack"><h2>Attempt history</h2>${attemptTable(e)}</section>`;
}
ACT.startQuiz = el => {
  const e = enrolById(el.dataset.id);
  confirmDlg({ title: 'Start the quiz?', ok: 'Start quiz', body: `<p>You're about to start <strong>attempt ${e.quiz.attempts.length + 1} of ${e.quiz.max}</strong>.</p><ul class="small" style="margin:0;padding-left:18px"><li>${e.quiz.q} questions · ${e.quiz.limit} minutes · pass mark ${e.quiz.pass}%</li><li>The timer can't be paused once you start.</li><li>When time runs out, your answers are submitted automatically — there's no review and no undo.</li></ul>`, onOk: () => { W.quiz = { e: e.id, ans: {}, cur: 0, ends: Date.now() + e.quiz.limit * 6e4, mode: 'one', conn: true }; go('quiz', { id: e.id }); } });
};
ACT.reqAttempts = el => {
  const e = enrolById(el.dataset.id);
  openModal({ title: 'Request more attempts', sub: esc(e.title), body: `<div class="field"><label for="rq-reason">Why do you need more attempts?</label><textarea class="textarea" id="rq-reason" placeholder="For example: I've re-watched the videos and want to try again."></textarea><span class="hint">The Academy usually replies within 2 working days.</span></div>`,
    actions: [{ label: 'Cancel' }, { label: 'Send request', cls: 'btn-primary', fn: () => { const r = mval('#rq-reason'); if (!r) { fieldErr('#rq-reason', 'Enter a reason for your request'); return false; } const id = 'R-' + (1060 + W.requests.length); W.requests.unshift({ id, type: 'Extra quiz attempts', target: e.title, raised: now().toISOString(), status: 'Requested', reason: r, decision: null }); render(); toast(`Request ${id} sent. Track it in My Requests.`); } }] });
};
ACT.reqTime = el => {
  const e = enrolById(el.dataset.id);
  openModal({ title: 'Request more time', sub: esc(e.title), body: `<p class="small">Your access ended on ${fd(e.end)} at ${e.progress}% progress. If the Academy agrees, the course goes back to Active with your progress intact and a new end date.</p><div class="field"><label for="rt-reason">Reason</label><textarea class="textarea" id="rt-reason"></textarea></div><div class="field"><label for="rt-file">Supporting file (optional)</label><input class="input" id="rt-file" type="file"></div>`,
    actions: [{ label: 'Cancel' }, { label: 'Send request', cls: 'btn-primary', fn: () => { const r = mval('#rt-reason'); if (!r) { fieldErr('#rt-reason', 'Enter a reason for your request'); return false; } const id = 'R-' + (1060 + W.requests.length); W.requests.unshift({ id, type: 'More time on course', target: e.title, raised: now().toISOString(), status: 'Requested', reason: r, decision: null }); render(); openModal({ title: 'Request sent', body: `<p>Request <strong>${id}</strong> has been sent to the Academy.</p><button class="linklike" data-act="simGrant" data-e="${e.id}" data-r="${id}">Prototype: Academy grants +14 days</button>`, actions: [{ label: 'View My Requests', cls: 'btn', fn: () => go('requests') }, { label: 'Done', cls: 'btn-primary' }] }); } }] });
};
ACT.simGrant = el => { const e = enrolById(el.dataset.e), r = W.requests.find(x => x.id === el.dataset.r); e.status = 'Active'; e.end = extEnd(e, 14); r.status = 'Granted'; r.decided = now().toISOString(); r.decision = 'Granted: +14 days.'; r.grant = '+14 days, new end date ' + fd(e.end); closeModal(); render(); toast(`Extension granted. ${e.title} is active again until ${fd(e.end)} — progress kept at ${e.progress}%.`); };
// A re-purchase is a new purchase at the same GBP price (CH-02)
function repurchasePrice(e) { return e.price; }
ACT.repurchase = el => {
  const e = enrolById(el.dataset.id), price = repurchasePrice(e);
  checkout({ title: `${e.base} — new enrolment (${new Date(now()).getFullYear()})`, amount: price, cur: W.me.cur, onSuccess: () => { const id = e.id + 'r' + W.enrolments.length; W.enrolments.unshift({ ...e, price, cur: W.me.cur, id, title: e.base + ' — ' + new Date(now()).getFullYear() + ' (re-purchase)', status: 'Active', enrolled: now().toISOString(), start: now().toISOString(), end: D(90), progress: 0, content: shortContent(e.topic), quiz: { ...e.quiz, attempts: [] }, reqs: e.reqs.map(([r]) => [r, false]) }); } });
};
function certTab(e) {
  const c = e.certId && W.certs.find(x => x.id === e.certId);
  if (c) return c.status === 'Processing' ? `<div class="card"><div class="empty">${ic('refresh', 36)}<h2>Certificate processing</h2><p>Your certificate is being generated. This usually takes a few minutes — we'll notify you when it's ready.</p><button class="btn" data-act="simIssue" data-id="${c.id}">Prototype: certificate issued</button></div></div>` : `<div style="max-width:520px">${certCard(c)}</div>`;
  return `<div class="card"><div class="empty">${ic('award', 38)}<h2>No certificate yet</h2><p>You get your certificate automatically when you have done everything the course needs.</p><button class="btn" data-go="course" data-id="${e.id}" data-tab="overview">See requirements</button></div></div>`;
}

/* Quiz-taking screen */
SCREENS.quiz = (p) => {
  const e = enrolById(p.id), Q = W.quiz;
  if (!Q || Q.e !== e.id) return `${pageHead('Quiz', esc(e.title))}<div class="card"><div class="empty"><p>This quiz isn't in progress.</p><button class="btn" data-go="course" data-id="${e.id}" data-tab="quiz">Back to quiz</button></div></div>`;
  if (Q.result) return quizResult(e, Q);
  const n = QUIZ_BANK.length, left = Math.max(0, Q.ends - Date.now());
  const qHtml = (i) => { const [t, opts] = QUIZ_BANK[i]; return `<fieldset class="card" style="border-width:1px"><legend class="sr">Question ${i + 1}</legend><span class="eyebrow">Question ${i + 1} of ${n}</span><h2>${esc(t)}</h2><div class="stack">${opts.map((o, k) => `<label class="opt"><input type="radio" name="qa${i}" value="${k}" ${Q.ans[i] === k ? 'checked' : ''} data-onchange="quizAns" data-i="${i}">${esc(o)}</label>`).join('')}</div></fieldset>`; };
  return `${!Q.conn ? `<div class="note b-amber" role="alert">${ic('wifioff')}<div><strong>Reconnecting — your answers are saved.</strong> Keep going; we'll sync as soon as you're back online.</div></div>` : ''}
  <div class="page-h"><div><p class="eyebrow">${esc(e.title)} · attempt ${e.quiz.attempts.length + 1} of ${e.quiz.max}</p><h1>Course quiz</h1></div>
  <div class="row"><span class="save-chip ok" id="qsave" aria-live="polite">${ic('check', 13)}Saved</span><span class="timer ${left < 6e4 ? 'low' : ''}" id="qtimer" role="timer" aria-label="Time remaining">${ic('clock', 18)}<span>${mmss(left)}</span></span></div></div>
  <div class="row-b"><div class="quiz-nav" role="navigation" aria-label="Question navigator">${QUIZ_BANK.map((_, i) => `<button class="${Q.ans[i] !== undefined ? 'ans' : ''} ${Q.cur === i ? 'cur' : ''}" data-act="quizGo" data-i="${i}" aria-label="Question ${i + 1}${Q.ans[i] !== undefined ? ', answered' : ', not answered'}">${i + 1}</button>`).join('')}</div>
  </div>
  ${qHtml(Q.cur) + `<div class="row-b"><button class="btn" data-act="quizGo" data-i="${Q.cur - 1}" ${Q.cur === 0 ? 'disabled' : ''}>${ic('back', 15)}Previous</button>${Q.cur < n - 1 ? `<button class="btn btn-primary" data-act="quizGo" data-i="${Q.cur + 1}">Next ${ic('chev', 15)}</button>` : `<button class="btn btn-primary" data-act="quizSubmit">Submit quiz</button>`}</div>`}
  <div class="card flat" style="border-style:dashed"><span class="eyebrow">Prototype controls</span><div class="row"><button class="btn btn-sm" data-act="quizConn">Simulate connection loss</button><button class="btn btn-sm" data-act="quizLow">Jump to final 60 seconds</button><button class="btn btn-sm" data-act="quizExpire">Let the timer run out</button></div></div>`;
};
const mmss = ms => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
AFTER.push(() => {
  if (S.route !== 'quiz' || !W.quiz || W.quiz.result) { clearTimer('quiz'); return; }
  timer('quiz', () => {
    const Q = W.quiz; if (!Q || Q.result) return clearTimer('quiz');
    const left = Q.ends - Date.now(), el = $('#qtimer');
    if (el) { el.querySelector('span').textContent = mmss(Math.max(0, left)); el.classList.toggle('low', left < 6e4); }
    if (left <= 0) { clearTimer('quiz'); finishQuiz(true); }
  }, 500);
});
INP.quizAns = el => {
  const Q = W.quiz, i = +el.dataset.i; Q.ans[i] = +el.value;
  const nb = $$('.quiz-nav button')[i]; nb.classList.add('ans'); nb.setAttribute('aria-label', `Question ${i + 1}, answered`);
  const s = $('#qsave'); s.className = 'save-chip busy'; s.innerHTML = ic('refresh', 13) + 'Saving…';
  setTimeout(() => { if (!$('#qsave')) return; s.className = Q.conn ? 'save-chip ok' : 'save-chip'; s.innerHTML = Q.conn ? ic('check', 13) + 'Saved' : ic('clock', 13) + 'Saved on this device'; }, 600);
};
ACT.quizGo = el => { W.quiz.cur = Math.max(0, Math.min(QUIZ_BANK.length - 1, +el.dataset.i)); render(); };
ACT.quizConn = () => { W.quiz.conn = false; render(); setTimeout(() => { if (W.quiz && !W.quiz.result) { W.quiz.conn = true; render(); toast('Reconnected. Your answers are synced.'); } }, 5000); };
ACT.quizLow = () => { W.quiz.ends = Date.now() + 60e3; };
ACT.quizExpire = () => { W.quiz.ends = Date.now() + 3e3; };
ACT.quizSubmit = () => {
  const Q = W.quiz, n = Object.keys(Q.ans).length;
  confirmDlg({ title: 'Submit your quiz?', ok: 'Submit quiz', body: `<p>You've answered <strong>${n} of ${QUIZ_BANK.length}</strong> questions.${n < QUIZ_BANK.length ? ' Unanswered questions are marked as incorrect.' : ''}</p><p class="small muted">You can't change your answers after submitting.</p>`, onOk: () => finishQuiz(false) });
};
function finishQuiz(auto) {
  const Q = W.quiz, e = enrolById(Q.e);
  const correct = QUIZ_BANK.filter((q, i) => Q.ans[i] === q[2]).length, score = Math.round(correct / QUIZ_BANK.length * 100);
  const at = { n: e.quiz.attempts.length + 1, at: now().toISOString(), score, result: score >= e.quiz.pass ? 'Pass' : 'Fail', auto };
  e.quiz.attempts.push(at); Q.result = at; recalcShort(e);
  if (at.result === 'Pass') { e.reqs = e.reqs.map(([r, ok]) => [r, r.startsWith('Pass') ? true : ok]); }
  if (auto) W.notifs.unshift({ id: 'nq' + Date.now(), cat: 'Assignments', title: 'Quiz auto-submitted', body: `Time ran out on ${e.title}, attempt ${at.n}.`, at: now().toISOString(), go: `course.${e.id}.quiz`, unread: true });
  if (S.route === 'quiz') render();
  if (auto) openModal({ title: 'Time’s up — quiz submitted', dismissable: false, body: `<div class="note b-amber">${ic('clock')}<div>The time limit ran out, so your answers were submitted automatically. There's no review or undo for an auto-submitted quiz.</div></div>`, actions: [{ label: 'See my result', cls: 'btn-primary' }] });
}
function quizResult(e, Q) {
  const r = Q.result, left = e.quiz.max - e.quiz.attempts.length;
  return `${pageHead('Quiz result', esc(e.title), '', [['My Courses', 'courses'], [e.title, 'course', e.id], ['Quiz result']])}
  <section class="card" style="max-width:640px"><div class="row" style="gap:24px"><div class="score-ring num" style="color:var(${r.result === 'Pass' ? '--green' : '--red'})">${r.score}%</div><div class="stack" style="gap:6px">${chip(r.result)}${r.auto ? chip('Auto-submitted', 'amber') : ''}<span class="small">Pass mark ${e.quiz.pass}% · attempt ${r.n} of ${e.quiz.max}</span><span class="small muted">${fdt(r.at)}</span></div></div>
  <p>${r.result === 'Pass' ? 'Well done — you passed. Your certificate will be generated automatically once all requirements are complete.' : left > 0 ? `You didn't reach the pass mark this time. You have ${plural(left, 'attempt')} left.` : 'You have used all your attempts.'}</p>
  <div class="row">${r.result !== 'Pass' && left > 0 ? `<button class="btn btn-primary" data-act="startQuiz" data-id="${e.id}">Retry quiz</button>` : ''}${r.result !== 'Pass' && left <= 0 ? `<button class="btn btn-primary" data-act="reqAttempts" data-id="${e.id}" ${W.requests.some(q => q.type === 'Extra quiz attempts' && q.target === e.title && q.status === 'Requested') ? 'disabled title="Your request is already with the Academy"' : ''}>Request more attempts</button>` : ''}<button class="btn" data-act="quizDone" data-id="${e.id}">Back to course</button></div></section>
  <section class="stack"><h2>Attempt history</h2>${attemptTable(e)}</section>`;
}
ACT.quizDone = el => { W.quiz = null; go('course', { id: el.dataset.id, tab: 'quiz' }); };

/* ---------- NVQ programme hub ---------- */
function nvqHub(e, p) {
  const c = countStates(allCrit());
  const sc = [['assignments', 'Assignments', 'edit', `${W.assignments.filter(a => ['Not Started', 'Resubmission Required'].includes(a.status) && !a.closed).length} to do`], ['progress', 'Progress & Gap Analysis', 'chart', `${nvqProgress()}% achieved`], ['observations', 'Observations', 'eye', `${W.observations.filter(o => ['Proposed', 'Confirmed'].includes(o.status)).length} upcoming`], ['resources', 'Resources', 'layers', `${W.resources.filter(r => r.course === e.title).reduce((a, r) => a + r.items.length, 0)} items`], ['calendar', 'Calendar', 'cal', 'Classes and deadlines'], ['payments', 'Payments', 'card', e.sponsor ? 'Covered by agency' : W.payOverdue ? '1 overdue' : 'Up to date']];
  return `${pageHead(esc(e.title), `${e.level} · ${esc(e.ab)}`, `${chip(e.status)}${e.sponsor ? `<span class="sponsor">${ic('building', 13)}Sponsored by ${esc(e.sponsor)}</span>` : ''}`, [['My Courses', 'courses'], [e.title]])}
  ${edgeNotices('nvq')}
  ${e.status === 'Discontinued' ? `<div class="note b-red" role="status">${ic('lock')}<div><strong>This programme has been discontinued.</strong> ${esc(e.reason || '')}<br><span class="small">You can still read your work and certificates for this programme, but you can't change them. Your other courses are not affected.</span></div></div>` : ''}
  <div class="grid-2"><section class="card"><h2>Overview</h2><dl class="kv"><dt>Qualification</dt><dd>${esc(e.title)} (${e.level})</dd><dt>Awarding body</dt><dd class="mono">${esc(e.ab)}</dd><dt>Batch</dt><dd>${esc(W.batchCancelled?.moved || e.batch)}</dd><dt>Batch dates</dt><dd>${fd(W.batchCancelled?.start || e.batchStart)} – ${fd(e.batchEnd)}</dd><dt>Delivery mode</dt><dd>${esc(e.mode)}</dd><dt>Structure version</dt><dd>${esc(e.version)}</dd></dl>
    <h3>Overall progress</h3>${bar(nvqProgress(), 'Overall progress')}${fiveBar(c)}${fiveLegend(c)}</section>
    <section class="card"><h2>Your people</h2><ul class="list">${e.people.map(([role, name]) => `<li class="li"><span class="avatar" style="background:var(--surface-2);color:var(--fg)">${name.split(' ').slice(-2).map(x => x[0]).join('')}</span><div class="li-b"><span class="strong">${esc(name)}</span><span class="small muted">${role}</span></div><button class="btn btn-sm" data-act="compose" data-to="${esc(name)} (${role})">${ic('msg', 14)}Message</button></li>`).join('')}</ul></section></div>
  <section class="stack"><h2>Shortcuts for this programme</h2><div class="grid">${sc.map(([r, l, i, d]) => `<a class="card" href="#${r}" data-go="${r}" style="text-decoration:none;color:inherit;grid-template-columns:auto 1fr auto;align-items:center"><span class="li-icon">${ic(i)}</span><span class="stack" style="gap:2px"><span class="strong">${l}</span><span class="small muted">${d}</span></span>${ic('chev')}</a>`).join('')}</div></section>`;
}

/* ---------- Browse Courses ---------- */
const CATALOGUE = [
  { id: 'k1', kind: 'short', title: 'Oral Health in Care Homes', dur: '90 min', price: 25, validity: '24 months', desc: 'Mouth care assessments and daily oral hygiene for residents.', topic: 'oral' },
  { id: 'k2', kind: 'short', title: 'Mental Capacity Act and DoLS', dur: '3 hours', price: 39, validity: '12 months', desc: 'Applying the five principles of the MCA and Liberty Protection Safeguards.', topic: 'mca' },
  { id: 'k3', kind: 'short', title: 'End of Life Care', dur: '2.5 hours', price: 35, validity: '24 months', desc: 'Advance care planning, comfort care and supporting families.', topic: 'eol' },
  { id: 'k4', kind: 'short', title: 'Food Hygiene Level 2', dur: '2 hours', price: 20, validity: 'No expiry', desc: 'Safe food handling in care settings.', topic: 'food' },
  { id: 'k5', kind: 'short', title: 'Moving and Handling People', dur: '3 hours', price: 45, validity: '12 months', desc: 'Re-enrol yearly to keep your certificate valid.', topic: 'mh' },
  { id: 'k6', kind: 'nvq', title: 'Level 2 Diploma in Care (England)', dur: '12 months', price: 1800, desc: 'For care assistants new to the role.' },
  { id: 'k7', kind: 'nvq', title: 'Level 3 Diploma in Adult Care (England)', dur: '12 months', price: 2400, desc: 'For experienced and senior care workers.' },
  { id: 'k8', kind: 'nvq', title: 'Level 5 Diploma in Leadership and Management for Adult Care', dur: '18 months', price: 3600, desc: 'For registered managers and deputy managers.' },
];
function catCard(c) {
  return `<article class="card catalogue-card"><div class="thumb">${ic(c.kind === 'nvq' ? 'award' : 'book', 30)}</div><div class="row"><span class="typebadge ${c.kind === 'nvq' ? 'nvq' : ''}">${c.kind === 'nvq' ? 'NVQ / RQF' : 'Short course'}</span><span class="small muted">${c.dur}</span></div><h3>${esc(c.title)}</h3><p class="small muted">${esc(c.desc)}</p>
  <div class="row-b"><span class="strong num">${c.kind === 'nvq' ? 'From ' : ''}${money(W.amt(c.price))}</span>${c.kind === 'nvq' ? `<button class="btn btn-sm" data-act="applyNvq" data-id="${c.id}">Apply</button>` : `<button class="btn btn-sm" data-act="buyCourse" data-id="${c.id}">Buy now</button>`}</div>${c.validity ? `<span class="xs muted">Certificate validity: ${c.validity}</span>` : ''}</article>`;
}
SCREENS.browse = () => {
  const f = ui('browseF', 'all'), q = (ui('browseQ', '') || '').toLowerCase();
  const list = CATALOGUE.filter(c => (f === 'all' || c.kind === f) && (!q || c.title.toLowerCase().includes(q)));
  return `${pageHead('Browse Courses', 'Buy a short course or apply for an NVQ/RQF programme while signed in.')}
  ${W.flags.sponsored ? `<div class="note b-blue">${ic('info')}<div>Seats paid for by ${esc(W.me.sponsor)} are assigned by your agency. Anything you buy here is paid by you.</div></div>` : ''}
  <div class="row"><div class="field" style="flex:1;min-width:200px"><label for="bq" class="sr">Search courses</label><input class="input" id="bq" type="search" placeholder="Search courses" value="${esc(ui('browseQ', ''))}" data-oninput="browseQ"></div>
  <div class="seg" role="group" aria-label="Course type">${[['all', 'All'], ['short', 'Short courses'], ['nvq', 'NVQ / RQF']].map(([k, l]) => `<button aria-pressed="${f === k}" data-act="browseF" data-k="${k}">${l}</button>`).join('')}</div></div>
  <div class="grid" id="catgrid">${list.map(catCard).join('') || '<p class="muted">No courses match your search.</p>'}</div>`;
};
ACT.browseF = el => { setUi('browseF', el.dataset.k); render(); };
INP.browseQ = el => { setUi('browseQ', el.value); const g = $('#catgrid'); const f = ui('browseF', 'all'), q = el.value.toLowerCase(); g.innerHTML = CATALOGUE.filter(c => (f === 'all' || c.kind === f) && (!q || c.title.toLowerCase().includes(q))).map(catCard).join('') || '<p class="muted">No courses match your search.</p>'; };
ACT.buyCourse = el => {
  const c = CATALOGUE.find(x => x.id === el.dataset.id);
  checkout({ title: c.title, amount: W.amt(c.price), onSuccess: () => { W.enrolments.unshift({ id: 'b' + c.id, kind: 'short', type: 'Short course', title: c.title + ' — ' + new Date(now()).getFullYear(), base: c.title, status: 'Active', enrolled: now().toISOString(), start: now().toISOString(), end: D(90), progress: 0, price: W.amt(c.price), topic: c.topic, desc: c.desc, reqs: [['Open all documents', false], ['Watch all videos to at least 90%', false], ['Pass the quiz with 80% or more', false]], content: shortContent(c.topic), quiz: { q: 10, limit: 20, pass: 80, max: 3, attempts: [] }, validity: c.validity }); W.plans.push({ e: 'b' + c.id, title: c.title, plan: 'One-time', total: W.amt(c.price), rows: [{ n: 1, amount: W.amt(c.price), due: now().toISOString(), status: 'Paid', paid: W.amt(c.price), receipt: 'RCP-28' + Math.floor(Math.random() * 900 + 100) }] }); } });
};
ACT.applyNvq = el => {
  const c = CATALOGUE.find(x => x.id === el.dataset.id);
  if (W.admission) { toast('You already have an application in progress. Continue it from Admission & Documents.', 'info'); go('admission'); return; }
  confirmDlg({ title: 'Apply for ' + esc(c.title) + '?', ok: 'Start application', body: `<p>Applying starts your admission. First you upload some documents, such as ID, right to work and proof of address. Then the Academy checks your application. This usually takes up to 7 days.</p><p class="small muted">Programme content unlocks after admission is approved.</p>`, onOk: () => { toast('Application started. In this prototype, variant B shows the applicant journey.', 'info'); S.edge = 'none'; setVariant('B'); go('admission'); } });
};
