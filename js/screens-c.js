/* Screens C: Learning Resources, Calendar, Attendance, Payments, Certificates */
'use strict';

/* ---------- Learning Resources ---------- */
const RICON = { doc: 'doc', video: 'video', scorm: 'pkg', key: 'key' }, RLBL = { doc: 'Document', video: 'Video', scorm: 'SCORM', key: 'Answer key' };
SCREENS.resources = () => {
  const q = (ui('resQ', '') || '').toLowerCase(), tf = ui('resT', '');
  const groups = W.resources;
  const byCourse = {};
  groups.forEach(g => (byCourse[g.course] = byCourse[g.course] || []).push(g));
  const match = i => (!q || (i.title + ' ' + i.desc + ' ' + i.tags.join(' ')).toLowerCase().includes(q)) && (!tf || i.kind === tf);
  return `${pageHead('Learning Resources', 'Materials for your courses, grouped by course, unit and module.')}
  <div class="row"><div class="field" style="flex:1;min-width:200px"><label for="rq">Search resources</label><input class="input" id="rq" type="search" value="${esc(ui('resQ', ''))}" placeholder="Title, description or tag" data-onchange="resQ"></div>
  <div class="field"><label for="rt">Type</label><select class="select" id="rt" data-onchange="resT"><option value="">All types</option><option value="doc" ${tf === 'doc' ? 'selected' : ''}>Documents (PDF, DOCX, PPT)</option><option value="video" ${tf === 'video' ? 'selected' : ''}>Videos</option><option value="scorm" ${tf === 'scorm' ? 'selected' : ''}>SCORM</option><option value="key" ${tf === 'key' ? 'selected' : ''}>Answer keys</option></select></div></div>
  ${Object.entries(byCourse).map(([course, gs]) => `<section class="stack"><h2>${esc(course)}</h2>${gs.map(g => g.expired ? `<div class="card"><h3>${esc(g.unit)}</h3><div class="empty">${ic('lock', 30)}<strong>Your access has ended — renew</strong><p class="small">Resources for this course are hidden while your access is expired.</p><div class="row"><button class="btn btn-sm btn-primary" data-act="reqTime" data-id="${g.courseId}">Request more time</button><button class="btn btn-sm" data-act="repurchase" data-id="${g.courseId}">Renew</button></div></div></div>` : (() => { const items = g.items.filter(match); return items.length ? `<div class="card pad0"><h3 style="padding:14px 18px 0">${esc(g.unit)}</h3><ul class="list" style="padding:0 18px">${items.map(i => `<li class="li"><div class="li-icon">${ic(i.state === 'Locked' ? 'lock' : RICON[i.kind])}</div><div class="li-b"><span class="strong">${esc(i.title)}</span><span class="small muted">${esc(i.desc)}</span><div class="chip-row">${i.tags.map(t => `<span class="typebadge">${esc(t)}</span>`).join('')}<span class="typebadge">${RLBL[i.kind]}</span></div>${i.lock ? `<span class="small" style="color:var(--amber)">${ic('lock', 13)} ${esc(i.lock)}</span>` : ''}</div>
      <div class="li-a">${chip(i.state)}${i.state !== 'Locked' ? `<button class="btn btn-sm" data-act="openRes" data-id="${i.id}">${i.kind === 'scorm' ? 'Launch' : i.kind === 'video' ? 'Watch' : 'View'}</button>${i.dl ? `<button class="btn btn-sm btn-ghost" data-act="fakeDl" data-f="${esc(i.title)}" aria-label="Download ${esc(i.title)}">${ic('download', 15)}</button>` : ''}` : ''}</div></li>`).join('')}</ul></div>` : ''; })()).join('')}</section>`).join('')}`;
};
INP.resQ = el => { setUi('resQ', el.value); render(); };
INP.resT = el => { setUi('resT', el.value); render(); };
ACT.openRes = el => {
  const i = W.resources.flatMap(g => g.items).find(x => x.id === el.dataset.id);
  if (i.state === 'New') i.state = 'Opened';
  const body = i.kind === 'doc' ? `<div class="viewer"><div class="v-tb">${ic('doc', 15)} ${esc(i.title)}<span class="spacer"></span>${i.dl ? `<button data-act="fakeDl" data-f="${esc(i.title)}">${ic('download', 14)} Download</button>` : '<span class="xs" style="opacity:.75">View only</span>'}</div><div class="pdf-pages"><div class="pdf-page"><strong>${esc(i.title)}</strong>${Array.from({ length: 16 }, (_, k) => `<div class="ln" style="width:${55 + k * 29 % 45}%"></div>`).join('')}</div></div></div>`
    : i.kind === 'video' ? `<div class="viewer"><div class="video"><button class="play" data-act="resPlay" data-id="${i.id}" aria-label="Play">${ic('play', 28)}</button><div class="vbar"><div class="bar"><span id="rvbar" style="width:${i.state === 'Completed' ? 100 : 20}%"></span></div><span>Vimeo · resume from 18:22</span></div></div></div>`
      : `<div class="viewer"><div class="v-tb">${ic('pkg', 15)} SCORM launcher · tracks completion and score</div><div class="scorm"><h3>${esc(i.title)}</h3><p>Branching scenario: choose how to respond at each step.</p><button class="btn btn-primary" data-act="resScorm" data-id="${i.id}">Complete scenario</button></div></div>`;
  openModal({ title: esc(i.title), size: 'xl', body, onClose: () => render() });
};
ACT.resPlay = el => { const i = W.resources.flatMap(g => g.items).find(x => x.id === el.dataset.id); $('#rvbar').style.width = '100%'; i.state = 'Completed'; toast('Video watched — marked as completed.'); };
ACT.resScorm = el => { const i = W.resources.flatMap(g => g.items).find(x => x.id === el.dataset.id); i.state = 'Completed'; closeModal(); toast('Scenario completed — score 85% recorded.'); };

/* ---------- Calendar ---------- */
const keyOf = iso => new Intl.DateTimeFormat('en-CA', { timeZone: W.me.tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
const hourOf = iso => +new Intl.DateTimeFormat('en-GB', { timeZone: W.me.tz, hour: '2-digit', hour12: false }).format(new Date(iso)) % 24;
const kDate = k => new Date(k + 'T12:00:00Z');
const kAdd = (k, n) => new Date(kDate(k).getTime() + n * DAY).toISOString().slice(0, 10);
const kMon = k => { const d = kDate(k), wd = (d.getUTCDay() + 6) % 7; return kAdd(k, -wd); };
const EVLBL = { class: 'Class / session', deadline: 'Assignment deadline', obs: 'Observation', pd: 'PD session', mile: 'Programme milestone' };
SCREENS.calendar = () => {
  const view = ui('calView', 'month'), today = keyOf(now().toISOString()), anchor = ui('calDate', today);
  const evs = k => W.events.filter(e => keyOf(e.start) === k).sort((a, b) => new Date(a.start) - new Date(b.start));
  const evBtn = e => `<button class="ev ev-${e.type}" data-act="evPop" data-id="${e.id}" aria-label="${esc(e.title)}, ${ft(e.start)}"><i aria-hidden="true"></i><span class="t">${e.type !== 'deadline' ? fmt(e.start, { hour: '2-digit', minute: '2-digit', hour12: false }) + ' ' : ''}${esc(e.title)}</span></button>`;
  let title, grid;
  if (view === 'month') {
    const [y, m] = anchor.split('-').map(Number), first = `${y}-${String(m).padStart(2, '0')}-01`, start = kMon(first);
    title = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(kDate(first));
    const cells = []; for (let i = 0; i < 42; i++) { const k = kAdd(start, i); if (i >= 35 && +k.slice(5, 7) !== m) break; cells.push(k); }
    grid = `<div class="cal-grid" role="grid" aria-label="${title}">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div class="dow" role="columnheader">${d}</div>`).join('')}${cells.map(k => `<div class="cal-cell ${+k.slice(5, 7) !== m ? 'out' : ''} ${k === today ? 'today' : ''}" role="gridcell" aria-label="${fdl(k + 'T12:00:00Z')}"><span class="dnum">${+k.slice(8)}</span>${evs(k).map(evBtn).join('')}</div>`).join('')}</div>`;
  } else if (view === 'week' || view === 'day') {
    const days = view === 'week' ? Array.from({ length: 7 }, (_, i) => kAdd(kMon(anchor), i)) : [anchor];
    title = view === 'week' ? `Week of ${fd(days[0] + 'T12:00:00Z')}` : fdl(anchor + 'T12:00:00Z');
    const hours = Array.from({ length: 16 }, (_, i) => i + 7);
    grid = `<div style="overflow-x:auto"><div class="week" style="grid-template-columns:56px repeat(${days.length}, minmax(${view === 'day' ? 240 : 110}px, 1fr))"><div class="wh"></div>${days.map(k => `<div class="wh ${k === today ? 'today' : ''}">${fds(k + 'T12:00:00Z')}</div>`).join('')}
      ${hours.map(h => `<div class="tcol">${String(h).padStart(2, '0')}:00</div>${days.map(k => `<div class="slot">${evs(k).filter(e => hourOf(e.start) === h || (h === 7 && hourOf(e.start) < 7)).map(evBtn).join('')}</div>`).join('')}`).join('')}</div></div>`;
  } else {
    title = `Next 30 days from ${fd(anchor + 'T12:00:00Z')}`;
    const ks = Array.from({ length: 30 }, (_, i) => kAdd(anchor, i)).filter(k => evs(k).length);
    grid = ks.length ? `<div class="stack">${ks.map(k => `<section class="card" style="gap:6px"><h3>${fdl(k + 'T12:00:00Z')}${k === today ? ' · Today' : ''}</h3><ul class="list">${evs(k).map(e => `<li class="li"><span class="legend"><i class="lg-${e.type}" aria-hidden="true"></i></span><div class="li-b"><span class="strong">${esc(e.title)}</span><span class="small muted">${EVLBL[e.type]} · ${e.end !== e.start ? `${ft(e.start)} – ${ft(e.end)}` : ft(e.start)} · ${esc(e.course)}</span>${e.updated ? `<span class="small">${chip('Updated', 'amber')} <span class="strike">${ft(e.updated)}</span> → ${ft(e.start)}</span>` : ''}</div><div class="li-a">${e.type === 'class' ? joinBtn(e) : ''}${e.go ? `<button class="btn btn-sm" data-act="goTok" data-t="${e.go}">Go to item</button>` : ''}</div></li>`).join('')}</ul></section>`).join('')}</div>` : `<div class="card"><div class="empty"><p>No events in the next 30 days.</p></div></div>`;
  }
  return `${pageHead('Calendar', `All times in ${esc(W.me.tz.replace('_', ' '))} (${tzl(anchor + 'T12:00:00Z')}) · read-only`, `<button class="btn" data-act="ical">${ic('link', 15)}Subscribe (iCal)</button>`)}
  <div class="note b-blue">${ic('zoom')}<div class="small"><strong>Join using your registered email so your attendance is recorded.</strong> Zoom links appear on class events.</div></div>
  <div class="row-b"><div class="row"><button class="btn btn-sm" data-act="calNav" data-d="0">Today</button><button class="icon-btn" data-act="calNav" data-d="-1" aria-label="Previous">${ic('back')}</button><button class="icon-btn" data-act="calNav" data-d="1" aria-label="Next">${ic('chev')}</button>${calJump('calDate', anchor)}<h2 aria-live="polite">${title}</h2><span class="chip t-outline cal-tz">${tzl(anchor + 'T12:00:00Z')}</span></div>
  <div class="seg" role="group" aria-label="Calendar view">${[['month', 'Month'], ['week', 'Week'], ['day', 'Day'], ['agenda', 'Agenda']].map(([k, l]) => `<button aria-pressed="${view === k}" data-act="calView" data-v="${k}">${l}</button>`).join('')}</div></div>
  <div class="legend" aria-label="Legend">${Object.entries(EVLBL).map(([k, l]) => `<span><i class="lg-${k}" aria-hidden="true"></i>${l}</span>`).join('')}</div>
  <div class="card pad0" style="overflow:hidden">${grid}</div>`;
};
ACT.calView = el => { setUi('calView', el.dataset.v); render(); };
ACT.calNav = el => {
  const d = +el.dataset.d, v = ui('calView', 'month'), today = keyOf(now().toISOString());
  if (!d) { setUi('calDate', today); return render(); }
  const a = ui('calDate', today);
  if (v === 'month') { const [y, m] = a.split('-').map(Number); const nd = new Date(Date.UTC(y, m - 1 + d, 1)); setUi('calDate', nd.toISOString().slice(0, 10)); }
  else setUi('calDate', kAdd(a, d * (v === 'week' ? 7 : v === 'day' ? 1 : 30)));
  render();
};
ACT.evPop = (el, ev) => {
  const e = W.events.find(x => x.id === el.dataset.id); $$('.pop').forEach(p => p.remove());
  const r = el.getBoundingClientRect(), pop = document.createElement('div');
  pop.className = 'pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', e.title);
  pop.innerHTML = `<div class="row-b"><span class="legend"><span><i class="lg-${e.type}"></i>${EVLBL[e.type]}</span></span><button class="icon-btn" data-act="popClose" aria-label="Close">${ic('x', 16)}</button></div><strong>${esc(e.title)}</strong>
    <span class="small">${fdl(e.start)}<br>${e.end !== e.start ? `${ft(e.start)} – ${ft(e.end)}` : 'Due ' + ft(e.start)}</span>${e.updated ? `<span class="small">${chip('Updated', 'amber')} was <span class="strike">${ft(e.updated)}</span></span>` : ''}
    <span class="small muted">${esc(e.course)}</span>${e.loc ? `<span class="small">${ic('map', 13)} ${esc(e.loc)}</span>` : ''}${e.link ? `<span class="small mono" style="word-break:break-all">${esc(e.link)}</span>` : ''}
    <div class="row">${e.type === 'class' ? joinBtn(e) : ''}${e.go ? `<button class="btn btn-sm" data-act="goTok" data-t="${e.go}">Go to item</button>` : ''}</div>`;
  document.body.appendChild(pop);
  const w = pop.offsetWidth, h = pop.offsetHeight;
  pop.style.left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left)) + 'px';
  pop.style.top = (r.bottom + h + 8 > window.innerHeight ? Math.max(12, r.top - h - 8) : r.bottom + 8) + 'px';
  pop.querySelector('button').focus();
};
ACT.popClose = () => $$('.pop').forEach(p => p.remove());
document.addEventListener('click', e => { if (!e.target.closest('.pop') && !e.target.closest('[data-act="evPop"]')) $$('.pop').forEach(p => p.remove()); }, true);
AFTER.push(() => $$('.pop').forEach(p => p.remove()));
ACT.ical = () => {
  const url = `https://illumin-academy.example/ical/${W.me.id.toLowerCase()}-7f3a2c9e.ics`;
  openModal({ title: 'Subscribe to your calendar (iCal)', body: `<p>Add this private feed to Apple Calendar, Outlook or any app that supports iCal subscriptions. Events update automatically.</p><div class="field"><label for="ical-url">Your feed URL</label><input class="input mono" id="ical-url" readonly value="${url}"></div>
    <ol class="small" style="margin:0;padding-left:18px"><li><strong>Outlook:</strong> Add calendar → Subscribe from web → paste the URL.</li><li><strong>Apple Calendar:</strong> File → New Calendar Subscription → paste the URL.</li></ol><p class="xs muted">Keep this link private — anyone with it can see your schedule. Direct Google Calendar sync isn't available.</p>`,
    actions: [{ label: 'Close' }, { label: `${ic('copy', 15)} Copy iCal link`, cls: 'btn-primary', fn: () => { copyText(url, 'iCal link copied'); return false; } }] });
};

/* ---------- Attendance ---------- */
SCREENS.attendance = () => {
  const rows = W.attendance, tot = rows.reduce((a, r) => a + r.dur, 0), att = rows.reduce((a, r) => a + r.mins, 0), pct = Math.round(att / tot * 100);
  const course = W.flags.nvq && W.flags.admitted ? `${W.nvq.title} · ${W.nvq.batch}` : 'Live sessions across your short courses';
  return `${pageHead('Attendance', esc(course), '')}
  <div class="kpis"><div class="kpi"><span class="xs muted">Attendance</span><span class="big-num" style="color:var(${pct >= 80 ? '--green' : '--redor'})">${pct}%</span><span class="small">${pct >= 80 ? '✓ Meets' : '! Below'} the programme minimum of 80%</span></div><div class="kpi"><span class="xs muted">Sessions</span><span class="big-num">${rows.length}</span></div><div class="kpi"><span class="xs muted">Time attended</span><span class="big-num">${Math.round(att / 60 * 10) / 10}<small class="small"> h of ${Math.round(tot / 60 * 10) / 10} h</small></span></div></div>
  ${(() => { const cName = W.flags.nvq && W.flags.admitted ? W.nvq.title : 'Short courses'; const arows = rows.map(r => ({ ...r, course: r.course || cName })); const mon = r => fd(r.at).replace(/^\d+\s/, ''); const cfg = { id: 'lu-h-latt', name: 'Attendance', rows: arows, noExport: true, rid: r => r.at + r.session, filters: [{ k: 'c', l: 'Course', get: r => r.course }, { k: 'm', l: 'Month', get: mon, opts: [...new Set(arows.slice().sort((a, b) => b.at < a.at ? -1 : 1).map(mon))] }], cols: [{ k: 'session', l: 'Session', h: r => `<strong>${esc(r.session)}</strong>` }, { k: 'at', l: 'Date', h: r => `<span class="nowrap">${fdt(r.at)}</span>`, v: r => r.at }, { k: 'dur', l: 'Duration', r: 1, h: r => `${r.dur} min`, s: r => r.dur, v: r => r.dur + ' min' }, { k: 'status', l: 'Status', h: r => chip(r.status) }, { k: 'mins', l: 'Time attended', r: 1, h: r => `${r.mins} min`, s: r => r.mins, v: r => r.mins + ' min' }, { k: 'rec', l: 'Recorded', h: r => r.manual ? chip('Manually recorded', 'outline') : '<span class="small muted">Zoom</span>', v: r => r.manual ? 'Manually recorded' : 'Zoom' }] }; const st = dtState(cfg); if (!st._init) { st._init = 1; st.f.c = cName; } const X = dtCompute(cfg), n = X.rows.length, att = X.rows.filter(r => r.status !== 'Absent').length; return `<p class="strong" role="status">Attended ${att} of ${n} session${n === 1 ? '' : 's'}${n ? ` (${Math.round(att / n * 100)}%)` : ''} in this period</p>${dt(cfg)}`; })()}
  <p class="small muted">Attendance for online classes comes from Zoom and only counts if you join with your registered email. Classroom sessions are recorded manually by your teacher.</p>`;
};

/* ---------- Payments ---------- */
function recomputeOverdue() { const nv = W.plans.find(p => p.e === 'nvq'); const od = nv && nv.rows.find(r => r.status === 'Overdue'); W.payOverdue = od ? { label: 'Instalment ' + od.n, amount: od.amount - od.paid, due: od.due, e: 'nvq', n: od.n } : null; }
SCREENS.payments = () => {
  const f = W.flags;
  if (f.sponsored && !W.plans.length) return `${pageHead('Payments')}<section class="card"><div class="row">${ic('building', 28)}<div><h2>Your course fees are covered by ${esc(W.me.sponsor)}</h2><p class="muted">There's nothing for you to pay for your sponsored enrolments — no fee schedule, no instalments and no deposit.</p></div></div>
    <ul class="list">${W.enrolments.map(e => `<li class="li"><div class="li-b"><span class="strong">${esc(e.title)}</span><span class="small muted">${e.type}</span></div><span class="sponsor">${ic('building', 13)}Sponsored by ${esc(e.sponsor)}</span></li>`).join('')}</ul></section>
    <p class="small muted">If you buy a course yourself from Browse Courses, its payments will appear here.</p>`;
  if (!W.plans.length && !(W.tx || []).length) return `${pageHead('Payments', 'All amounts in GBP (£).')}<section class="card">${emptyState({ icon: 'card', title: 'No payments yet', why: 'When you buy a course, its payments and receipts appear here.', action: '<button class="btn btn-primary" data-go="browse">Browse courses</button>' })}</section>`;
  const byCur = f => money(W.plans.reduce((a, p) => a + f(p), 0), 'GBP');
  const paidOf = p => p.rows.reduce((b, r) => b + r.paid, 0) + (p.deposit && p.deposit.status === 'Paid' ? p.deposit.amount : 0), outOf = p => p.rows.reduce((b, r) => b + (r.amount - r.paid), 0), odCur = 'GBP';
  return `${pageHead('Payments', 'All amounts in GBP (£).')}
  <div class="kpis"><div class="kpi"><span class="xs muted">Paid so far</span><span class="big-num num">${byCur(paidOf)}</span></div><div class="kpi"><span class="xs muted">Outstanding</span><span class="big-num num" style="color:var(${W.payOverdue ? '--red' : '--fg'})">${byCur(outOf)}</span></div>${W.payOverdue ? `<div class="kpi" style="border-color:var(--red)"><span class="xs muted">Overdue now</span><span class="big-num num" style="color:var(--red)">${money(W.payOverdue.amount, odCur)}</span><button class="btn btn-sm btn-primary" data-act="payInst" data-e="nvq" data-n="${W.payOverdue.n}">Pay now</button></div>` : ''}</div>
  ${W.batchCancelled?.refund ? `<div class="note b-blue">${ic('refresh')}<div><strong>Refund in progress:</strong> ${money(W.batchCancelled.amount)} for your cancelled batch. Expect it within 5–10 working days.</div></div>` : ''}
  ${W.plans.map(planCard).join('')}
  <section class="stack"><h2>Transaction history</h2>${dt({ id: 'lu-h-ltx', name: 'Transaction history', rows: W.tx, noExport: true, rid: t => t.ref, cols: [{ k: 'at', l: 'Date', h: t => `<span class="nowrap">${fdt(t.at)}</span>`, v: t => t.at }, { k: 'ref', l: 'Reference', h: t => `<span class="mono">${t.ref}</span>` }, { k: 'desc', l: 'Description', h: t => `<span class="small">${esc(t.desc)}</span>` }, { k: 'method', l: 'Method', h: t => `<span class="small nowrap">${esc(t.method)}</span>` }, { k: 'amount', l: 'Amount', r: 1, h: t => `<span class="nowrap">${t.amount < 0 ? '−' + money(-t.amount, t.cur) : money(t.amount, t.cur)}</span>`, s: t => t.amount, v: t => money(Math.abs(t.amount), t.cur) }, { k: 'status', l: 'Status', h: t => chip(t.status) }] })}</section>`;
};
function planCard(pl) {
  const paid = pl.rows.reduce((a, r) => a + r.paid, 0) + (pl.deposit && pl.deposit.status === 'Paid' ? pl.deposit.amount : 0), out = pl.rows.reduce((a, r) => a + r.amount - r.paid, 0);
  const pendingConfirm = pl.rows.some(r => r.confirming);
  return `<section class="card"><div class="row-b"><div class="stack" style="gap:2px"><h2>${esc(pl.title)}</h2><span class="small muted">${pl.plan === 'Instalments' ? `Instalment plan · ${pl.rows.length} instalments${pl.partial ? ' · part payments allowed' : ''}` : 'One-time payment'}</span></div><div class="row small"><span>Paid <strong class="num">${money(paid, pl.cur)}</strong></span><span>Outstanding <strong class="num">${money(out, pl.cur)}</strong></span></div></div>
  ${pendingConfirm ? `<div class="note b-amber">${ic('clock')}<div><strong>We're confirming your payment.</strong> Your bank hasn't confirmed it yet. This usually takes a few minutes. <button class="linklike" data-act="confirmPay" data-id="${pl.e}">Prototype: bank confirms</button></div></div>` : ''}
  ${pl.linkExpired ? `<div class="note b-grey">${ic('link')}<div><strong>Your payment link for instalment 2 has expired.</strong> Links from payment emails are valid for 7 days. <div class="b-act"><button class="btn btn-sm" data-act="newPayLink" data-e="${pl.e}">Generate new link</button></div></div></div>` : ''}
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>No.</th><th class="r">Amount</th><th>Due date</th><th>Status</th><th class="r">Paid</th><th><span class="sr">Actions</span></th></tr></thead><tbody>
  ${pl.deposit ? `<tr><td>Deposit</td><td class="r num">${money(pl.deposit.amount, pl.cur)}</td><td class="small">${pl.deposit.hold ? `Seat held until ${fd(pl.deposit.hold)}` : '—'}</td><td>${chip(pl.deposit.status)}</td><td class="r num">${pl.deposit.status === 'Paid' ? money(pl.deposit.amount, pl.cur) : '—'}</td><td>${pl.deposit.status === 'Paid' ? `<button class="btn btn-sm btn-ghost" data-act="fakeDl" data-f="Receipt — deposit — ${money(pl.deposit.amount, pl.cur)}">${ic('download', 14)}Receipt</button>` : `<span class="xs muted">${esc(pl.deposit.status)}</span>`}</td></tr>` : ''}
  ${pl.rows.map(r => `<tr class="${r.status === 'Overdue' ? 'hl' : ''}"><td class="num">${pl.plan === 'Instalments' ? r.n : '1'}</td><td class="r num">${money(r.amount, pl.cur)}</td><td class="nowrap">${fd(r.due)}${r.status === 'Overdue' ? `<div class="xs strong" style="color:var(--red)">${calDaysLate(r.due, tzOfLearner(W.me))} days overdue</div>` : ''}${r.arrangement ? `<div class="xs">${chip('Arrangement', 'green')}</div>` : ''}</td><td>${r.confirming ? chip('Payment Pending') : chip(r.status)}</td><td class="r num">${r.paid ? money(r.paid, pl.cur) : '—'}</td>
    <td class="nowrap">${['Pending', 'Overdue', 'Partially paid'].includes(r.status) && !r.confirming ? `<button class="btn btn-sm" data-act="payInst" data-e="${pl.e}" data-n="${r.n}">Pay now</button>` : ''}${r.receipt ? ` <button class="btn btn-sm btn-ghost" data-act="fakeDl" data-f="Receipt ${r.receipt} — ${money(r.paid, pl.cur)}" aria-label="Receipt ${r.receipt}, ${money(r.paid, pl.cur)}">${ic('download', 14)}Receipt</button>` : ''}</td></tr>`).join('')}</tbody></table></div></section>`;
}
ACT.payInst = el => {
  const pl = W.plans.find(p => p.e === el.dataset.e), r = pl && pl.rows.find(x => x.n === +el.dataset.n);
  if (!r) { go('payments'); return; }
  checkout({ cur: pl.cur, title: `${pl.title} — ${pl.plan === 'Instalments' ? 'instalment ' + r.n : 'payment'}`, amount: r.amount - r.paid, partial: pl.partial, min: W.amt(50), onSuccess: (p, ref) => {
    r.paid += p; r.status = r.paid >= r.amount ? 'Paid' : 'Partially paid'; r.receipt = 'RCP-' + ref.slice(4);
    recomputeOverdue();
    if (S.edge === 'paused' && pl.e === 'nvq' && r.status === 'Paid') { S.edge = 'none'; setTimeout(() => toast('Access restored. Your course content is unlocked again.'), 300); }
  } });
};
ACT.newPayLink = el => { const pl = W.plans.find(p => p.e === el.dataset.e); pl.linkExpired = false; render(); toast('New payment link created and emailed to you. It is valid for 7 days.'); };

/* ---------- Certificates ---------- */
const CERT_TABS = { Valid: ['Valid'], 'Expiring soon': ['Expiring soon'], Expired: ['Expired'], Revoked: ['Revoked'], All: null };
function certCard(c) {
  const dots = c.expires && c.status !== 'Revoked' ? `<div class="stack" style="gap:4px"><span class="xs muted">Expiry reminders</span><div class="dots">${(c.remind || [30, 15, 7]).map( /* S1-06 */d => { const sent = daysTo(c.expires) <= d; return `<span class="d ${sent ? 'sent' : ''}"><i aria-hidden="true"></i>${d} days<span class="sr">${sent ? ' — reminder sent' : ' — not yet sent'}</span></span>`; }).join('')}</div></div>` : '';
  if (c.status === 'Processing') return `<article class="card"><div class="row-b"><h3>${esc(c.course)}</h3>${chip('Processing')}</div><div class="note b-blue">${ic('refresh')}<div>Certificate is being generated. We'll notify you when it's ready.</div></div><div><button class="btn btn-sm" data-act="simIssue" data-id="${c.id}">Prototype: certificate issued</button></div></article>`;
  const rev = c.status === 'Revoked';
  return `<article class="card"><div class="cert-card"><div class="stack" style="gap:6px"><div class="row">${chip(c.status)}${c.supersedes ? chip('Re-issued', 'teal') : ''}</div><h3>${esc(c.course)}</h3>
    <dl class="kv small"><dt>Certificate no.</dt><dd class="mono">${c.no}</dd><dt>Issued</dt><dd>${fd(c.issued)}</dd><dt>Expires</dt><dd>${c.expires ? fd(c.expires) + (c.status === 'Expiring soon' ? ` · <strong>in ${daysTo(c.expires)} days</strong>` : '') : 'No expiry'}</dd></dl>${c.tpl ? `<p class="xs muted">Template: ${esc(c.tpl.layout)}</p>` : ''}</div>${c.tpl && !c.tpl.fields.includes('QR code') ? '' : qr(c.no) /* S1-06 */}</div>
    ${rev ? `<div class="reason"><span class="r-t">${ic('alert', 15)}Revoked</span><span>${esc(c.revoked)}</span></div>` : ''}
    ${c.supersedes ? `<p class="small">Supersedes certificate <span class="mono">#${c.supersedes}</span></p><ol class="tl">${c.lineage.map((l, i) => `<li class="${i === c.lineage.length - 1 ? 'cur' : 'done'}"><span class="tl-d">${i + 1}</span><div class="small"><span class="mono">${l[0]}</span> · ${fd(l[1])}<br><span class="muted">${l[2]}</span></div></li>`).join('')}</ol>` : ''}
    ${dots}
    <div class="row"><button class="btn btn-sm" data-act="viewCert" data-id="${c.id}" ${rev ? `disabled aria-disabled="true" title="Download disabled for revoked certificates"` : ''}>${ic('download', 14)}View / Download PDF</button>${rev ? '' : ''}
      <button class="btn btn-sm" data-act="copyVerify" data-id="${c.id}">${ic('copy', 14)}Copy verification link</button>
      ${['Expiring soon', 'Expired'].includes(c.status) ? `<button class="btn btn-sm btn-gold" data-act="renewCert" data-id="${c.id}">Renew course</button>` : ''}</div></article>`;
}
SCREENS.certificates = () => {
  const t = ui('certTab', 'All');
  const list = W.certs.filter(c => !CERT_TABS[t] || CERT_TABS[t].includes(c.status));
  return `${pageHead('Certificates', 'Certificates are issued by Welfare on behalf of Illumin Academy.')}
  ${tabs(Object.keys(CERT_TABS).map(k => [k, k, W.certs.filter(c => !CERT_TABS[k] || CERT_TABS[k].includes(c.status)).length]), t, 'certTab', 'Certificate status')}
  ${list.length ? `<div class="grid">${list.map(certCard).join('')}</div>` : `<div class="card"><div class="empty">${ic('award', 36)}<p>No certificates in this list.</p></div></div>`}`;
};
ACT.certTab = el => { setUi('certTab', el.dataset.k); render(); };
ACT.simIssue = el => { const c = W.certs.find(x => x.id === el.dataset.id); c.status = 'Valid'; c.no = 'WEL-2026-0' + (2400 + Math.floor(Math.random() * 99)); c.issued = now().toISOString(); c.expires = D(730); W.notifs.unshift({ id: 'nc' + Date.now(), cat: 'Certificates', title: 'Certificate issued', body: c.course + ' certificate is ready.', at: now().toISOString(), go: 'certificates', unread: true }); render(); toast('Certificate issued.'); };
ACT.viewCert = el => {
  const c = W.certs.find(x => x.id === el.dataset.id);
  openModal({ title: esc(c.course), sub: `Certificate ${c.no}`, size: 'lg', body: `<div class="cert-doc"><span class="w-brand">Welfare</span><span class="xs" style="letter-spacing:.1em;text-transform:uppercase;color:#555">Certificate of completion</span><h3>This certifies that</h3><span class="nm">${esc(W.me.first + ' ' + W.me.last)}</span><p>has successfully completed</p><h3 style="font-size:1.3rem">${esc(c.course)}</h3><div class="meta"><span>Issued ${fd(c.issued)}<br>${c.expires ? 'Valid until ' + fd(c.expires) : 'No expiry'}</span>${qr(c.no, 64)}<span style="text-align:right">Certificate no. ${c.no}<br>Verify at welfare-verify.example/${c.no}</span></div></div>
    <p class="small muted">${ic('clock', 13)} The download link is valid for 15 minutes.</p>`, actions: [{ label: 'Copy verification link', cls: 'btn', fn: () => { ACT.copyVerify({ dataset: { id: c.id } }); return false; } }, { label: `${ic('download', 15)} Download PDF`, cls: 'btn-primary', fn: () => { toast(`Certificate ${c.no}.pdf downloaded (simulated).`); return false; } }] });
};
ACT.copyVerify = el => { const c = W.certs.find(x => x.id === el.dataset.id); const url = `https://welfare-verify.example/${c.no}`; openModal({ title: 'Copy verification link', body: `<p>Anyone with this link can check that your certificate is genuine. It shows your name, the course, the issue and expiry dates and the certificate status.</p><div class="field"><label for="vlink">Verification link</label><input class="input mono" id="vlink" readonly value="${url}"></div>`, actions: [{ label: 'Close' }, { label: `${ic('copy', 15)} Copy link`, cls: 'btn-primary', fn: () => { copyText(url, 'Verification link copied'); } }] }); };
ACT.renewCert = el => { const c = W.certs.find(x => x.id === el.dataset.id); const k = CATALOGUE.find(x => c.course.startsWith(x.title)) || { title: c.course, price: 39, topic: 'mh' }; checkout({ title: `${c.course} — renewal (new enrolment)`, amount: W.amt(k.price), onSuccess: () => { W.enrolments.unshift({ id: 'rn' + c.id, kind: 'short', type: 'Short course', title: c.course + ' — ' + new Date(now()).getFullYear() + ' (renewal)', base: c.course, status: 'Active', enrolled: now().toISOString(), start: now().toISOString(), end: D(90), progress: 0, price: W.amt(k.price), topic: k.topic, desc: 'Renewal enrolment.', reqs: [['Pass every module quiz with 80% or more', false]], content: freshContent(k.topic), modules: shModules({ topic: k.topic }), validity: '12 months' }); } }); };
