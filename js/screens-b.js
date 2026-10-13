/* Screens B: Admission & Documents, Assignments, Progress & Gap Analysis, Observations & Workplace */
'use strict';

/* ---------- Admission & Documents ---------- */
SCREENS.admission = () => {
  const ad = W.admission, st = ad.status;
  const final = ['Approved', 'Rejected', 'Withdrawn'].includes(st);
  const when = s => (ad.history.find(h => h[0] === s) || [])[1];
  // CH-07: the review runs after sign-up (payment), while the learner is already learning
  const steps = [['Signed up', when('Sign-up complete')], ['Under Review', when('Under Review')], [final ? st : 'Approved / Rejected', final ? when(st) : null]];
  const curIdx = final ? 2 : 1;
  const mand = W.docs.filter(d => d.mand), ok = mand.filter(d => d.status === 'Approved').length;
  const ro = ['Rejected', 'Withdrawn'].includes(st);
  let status = '';
  if (st === 'Awaiting review') status = `<div class="note b-blue">${ic('clock')}<div><strong>You've started — your application is waiting for a reviewer.</strong> We usually decide within 7 days. Keep learning while we review.</div></div>`;
  if (st === 'Pending — Documents Required') status = `<div class="note b-amber">${ic('clip')}<div><strong>Documents required.</strong> The Academy needs more from you — see the documents below. Keep learning while we review.</div></div>`;
  if (st === 'Under Review') status = `<div class="note b-blue">${ic('clock')}<div><strong>Your application is under review.</strong> We usually decide within 7 days — expect a decision by ${fd(D(6))}. We'll notify you by email and in the portal. Keep learning while we review.</div></div>`;
  if (st === 'Rejected') status = `<div class="note b-red" role="alert">${ic('alert')}<div><strong>Your application was not approved.</strong><p style="margin-top:6px">${esc(ad.rejectReason)}</p><div class="b-act"><button class="btn btn-sm" data-act="reapply">Re-apply</button></div></div></div>`;
  if (st === 'Withdrawn') status = `<div class="note b-grey">${ic('info')}<div><strong>You withdrew this application on ${fd(when('Withdrawn'))}.</strong> This page is now a read-only record. To study with us again, apply from Browse Courses.</div></div>`;
  if (st === 'Approved') status = `<div class="note b-green">${ic('check')}<div><strong>Admission approved — welcome to the programme.</strong> Your place on <strong>${esc(W.batchCancelled?.moved || ad.batch)}</strong>, starting ${fd(W.batchCancelled?.start || ad.batchStart)}, is confirmed.<div class="b-act"><button class="btn btn-sm" data-go="course" data-id="nvq">Open programme</button></div></div></div>`;
  return `${pageHead('Admission & Documents', esc(W.nvq.title))}
  ${edgeNotices('admission')}
  <section class="card"><div class="row-b"><h2>Application status</h2>${chip(st)}</div>
    <ol class="stepper" aria-label="Application progress">${steps.map(([l, d], i) => `<li class="step ${i < curIdx || (i === curIdx && final) ? (st === 'Rejected' && i === 2 ? 'bad' : 'done') : i === curIdx ? 'cur' : ''}" ${i === curIdx ? 'aria-current="step"' : ''}><span class="dot">${i < curIdx || (final && i === 2) ? (st === 'Rejected' && i === 2 ? '✕' : '✓') : i + 1}</span><span class="s-l">${esc(l)}</span><span class="s-d">${d ? fdt(d) : 'Not yet'}</span></li>`).join('')}</ol>
    ${status}</section>
  <section class="card"><div class="row-b"><h2>Admission progress</h2><span class="strong num">${ok} of ${mand.length} mandatory documents approved</span></div>${bar(Math.round(ok / mand.length * 100), 'Mandatory documents approved')}</section>
  ${ro && W.admission.deposit.paid && W.admission.deposit.refund ? depositRefundCard() : st === 'Withdrawn' ? '' : depositCard()}
  <section class="stack"><h2>Required documents</h2><div class="grid">${W.docs.map(d => docCard(d, ro)).join('')}</div></section>`;
};
function depositRefundCard() { const dp = W.admission.deposit, st = dp.refund === 'Refunded' ? 'Refunded' : 'Deposit refund in progress'; return `<section class="card"><div class="row-b"><h2>Deposit</h2>${chip(st, st === 'Refunded' ? 'green' : 'blue')}</div><p class="small">${st === 'Refunded' ? `Your deposit of ${money(dp.min, dp.cur)} has been refunded to your original payment method.` : `Your deposit of ${money(dp.min, dp.cur)} is being refunded because ${W.batchCancelled && W.batchCancelled.refund ? 'the Academy cancelled your batch' : 'your admission was not approved'}. It goes back to your original payment method.`}</p></section>`; }
function depositCard() {
  const dp = W.admission.deposit;
  if (dp.paid && (dp.refund || (W.batchCancelled && W.batchCancelled.refund))) return depositRefundCard();
  if (W.flags.sponsored) return `<section class="card"><h2>Fees</h2><p>Your course fees are covered by ${esc(W.me.sponsor)}. No deposit or instalments are needed.</p></section>`;
  if (!dp.paid) return chPaySummary(); // CH-10: paid in sign-up step 4 — a deposit, or the first instalment
  if (dp.released) return `<section class="card"><div class="row-b"><h2>Deposit</h2>${chip('Seat released', 'amber')}</div><div class="note b-amber">${ic('alert')}<div><strong>Seat released</strong><br><span class="small">Your seat hold ended on ${fd(dp.holdUntil)}. The rest of the fee wasn't paid by then, so your seat on this batch has gone. You can still join a later batch. Message the Academy and we'll help you.</span><div class="b-act"><button class="btn btn-sm btn-primary" data-go="messages">Message the Academy</button></div></div></div></section>`;
  const held = dp.holdUntil && new Date(dp.holdUntil) > now();
  return `<section class="card"><div class="row-b"><h2>Deposit</h2>${chip('Paid')}</div><dl class="kv"><dt>Deposit paid</dt><dd>${money(dp.min, dp.cur)} on ${fd(dp.paidAt)}</dd>${held ? `<dt>Seat held until</dt><dd><strong>${fdt(dp.holdUntil)}</strong> · <span class="countdown" data-count="${dp.holdUntil}">${cdown(new Date(dp.holdUntil) - now())}</span> left</dd><dt>Balance due</dt><dd class="num">${money(dp.balance, dp.cur)}</dd>` : `<dt>Balance</dt><dd>Paid by instalment plan — see Payments</dd>`}</dl>
  ${held ? `<div class="row"><button class="btn btn-primary" data-act="payBalance">Pay balance</button><button class="btn" data-go="payments">Set up instalments</button></div><p class="small muted">If the balance isn't paid by the end of the hold, the seat is released.</p>` : ''}</section>`;
}
function docCard(d, ro) {
  const exp = d.expires ? daysTo(d.expires) : null, inWindow = exp !== null && exp <= 30 && exp > 0;
  const upl = ui('upl-' + d.id);
  let body = '';
  if (['Rejected', 'Resubmission Required'].includes(d.status)) body = `<div class="reason ${d.status === 'Resubmission Required' ? 'amber' : ''}"><span class="r-t">${ic('alert', 15)}${d.status === 'Rejected' ? 'Why it was rejected' : 'What to change'}</span><span>${esc(d.reason)}</span><span class="xs muted">${esc(d.reviewer)} · ${fd(D(-10))}</span></div>${ro ? '' : `<button class="btn btn-primary btn-sm" data-act="reupload" data-id="${d.id}">${ic('upload', 14)}Re-upload</button>`}`;
  else if (d.status === 'Pending' && !ro) body = dropZone(d);
  else if (d.status === 'Submitted') body = `<p class="small">${ic('doc', 14)} <span class="mono">${esc(d.file)}</span><br><span class="muted">${d.uploaded ? 'Uploaded ' + fdt(d.uploaded) + ' — ' : ''}waiting for review</span></p>`;
  else if (d.status === 'Approved') body = `<p class="small">${ic('doc', 14)} <span class="mono">${esc(d.file || 'document.pdf')}</span>${d.uploaded ? `<br><span class="muted">Uploaded ${fdt(d.uploaded)}</span>` : ''}</p>`;
  if (d.expires && d.status === 'Approved') body += `<div class="note ${inWindow ? 'b-amber' : 'b-grey'}" style="padding:8px 10px">${ic('clock', 16)}<div class="small">Expires ${fd(d.expires)}${inWindow ? ` — <strong>expires in ${exp} days</strong>` : ''}</div></div>`;
  if (d.status === 'Approved' && d.replacement) body += `<div class="note b-blue" style="padding:8px 10px">${ic('refresh', 16)}<div class="small"><strong>Replacement in review:</strong> <span class="mono">${esc(d.replacement.file)}</span> · uploaded ${fdt(d.replacement.uploaded)}<br><span class="muted">Your current document stays valid until the replacement is approved.</span></div></div>`;
  else if (d.status === 'Approved' && !ro) body += `<div><button class="btn btn-sm" data-act="replaceDoc" data-id="${d.id}">${ic('upload', 14)}Replace document</button></div>${d.repResult ? `<p class="xs muted">Last replacement ${esc(d.repResult.status.toLowerCase())}: ${esc(d.repResult.reason)}</p>` : ''}`;
  if (upl) body = upl.err ? `<div class="reason"><span class="r-t">${ic('alert', 15)}Upload failed</span><span>${esc(upl.err)}</span></div>` + dropZone(d) : `<div class="stack" style="gap:4px"><span class="small">Uploading <span class="mono">${esc(upl.name)}</span>…</span><div class="bar"><span id="upbar-${d.id}" style="width:${upl.p}%"></span></div></div>`;
  return `<article class="card" id="doc-${d.id}"><div class="row-b"><h3>${esc(d.name)}</h3>${chip(d.status)}</div>
    <div class="row">${chip(d.mand ? 'Mandatory' : 'Optional', d.mand ? 'red' : 'grey')}<span class="xs muted">${d.formats} · max ${d.max}</span></div>
    <p class="small muted">${esc(d.guide)}</p>${body}
    ${d.versions.length ? `<details><summary class="small strong" style="cursor:pointer">Version history (${d.versions.length})</summary><ul class="list small">${d.versions.map(v => `<li class="li" style="padding:6px 0"><span class="mono">${esc(v[0])}</span><span class="spacer"></span><span class="muted">${fdt(v[1])}</span>${chip(v[2], v[2] === 'Awaiting review' || v[2] === 'Replacement (in review)' ? 'blue' : v[2] === 'Current (valid)' ? 'green' : v[2] === 'Replaced' ? 'grey' : undefined)}</li>`).join('')}</ul><p class="xs muted">Uploaded files can't be deleted.</p></details>` : ''}</article>`;
}
function dropZone(d) {
  return `<label class="drop" data-drop="${d.id}" for="file-${d.id}">${ic('upload', 22)}<span><strong>Drag and drop</strong> or choose a file</span><span class="xs">${d.formats} · max ${d.max}</span><input type="file" id="file-${d.id}" data-onchange="docFile" data-id="${d.id}"></label>
  <div class="row xs"><button class="linklike" data-act="sampleUpload" data-id="${d.id}">Prototype: upload a sample PDF</button><button class="linklike" data-act="badUpload" data-id="${d.id}">Prototype: try a 12 MB .exe</button></div>`;
}
function startUpload(id, name, size) {
  const d = W.docs.find(x => x.id === id);
  const ext = (name.split('.').pop() || '').toLowerCase();
  const allowed = d.formats.toLowerCase().includes('docx') && ext === 'docx' || ['pdf', 'jpg', 'jpeg', 'png'].includes(ext) && d.formats.toLowerCase().includes(ext === 'jpeg' ? 'jpg' : ext);
  if (!allowed) { setUi('upl-' + id, { err: `"${name}" is a .${ext} file. Upload a ${d.formats} file.` }); render(); return; }
  if (size > 5 * 1024 * 1024) { setUi('upl-' + id, { err: `"${name}" is ${(size / 1048576).toFixed(1)} MB. The maximum size is ${d.max}.` }); render(); return; }
  setUi('upl-' + id, { name, p: 0 }); render();
  let p = 0;
  const t = setInterval(() => {
    p += 20; const u = ui('upl-' + id); if (u) u.p = p; const b = $('#upbar-' + id); if (b) b.style.width = p + '%';
    if (p >= 100) { clearInterval(t); setUi('upl-' + id, null); const at = now().toISOString(); if (d._replacing && d.status === 'Approved') { d._replacing = false; const cv = d.versions.find(v => v[0] === d.file); if (cv) cv[2] = 'Current (valid)'; else d.versions.unshift([d.file || 'document.pdf', d.uploaded || at, 'Current (valid)']); d.replacement = { file: name, uploaded: at }; d.repResult = null; d.versions.unshift([name, at, 'Replacement (in review)']); closeModal(); render(); toast(`${esc(name)} uploaded. Your current document stays valid until the replacement is approved.`); return; } d.status = 'Submitted'; d.file = name; d.uploaded = at; d.versions.unshift([name, d.uploaded, 'Awaiting review']); render(); toast(`${esc(name)} uploaded at ${ft(d.uploaded)}. It's now waiting for review.`); }
  }, 250);
}
INP.docFile = el => { const f = el.files[0]; if (f) { closeModal(); startUpload(el.dataset.id, f.name, f.size); } };
ACT.sampleUpload = el => { closeModal(); startUpload(el.dataset.id, 'scan_' + el.dataset.id + '_' + fmt(now().toISOString(), { day: '2-digit', month: '2-digit' }).replace('/', '') + '.pdf', 820000); };
ACT.badUpload = el => { closeModal(); startUpload(el.dataset.id, 'setup.exe', 12.4 * 1048576); };
document.addEventListener('dragover', e => { const z = e.target.closest('[data-drop]'); if (z) { e.preventDefault(); z.classList.add('over'); } });
document.addEventListener('dragleave', e => { const z = e.target.closest('[data-drop]'); if (z) z.classList.remove('over'); });
document.addEventListener('drop', e => { const z = e.target.closest('[data-drop]'); if (z) { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { closeModal(); startUpload(z.dataset.drop, f.name, f.size); } } });
ACT.reupload = el => { const d = W.docs.find(x => x.id === el.dataset.id); openModal({ title: 'Re-upload document', sub: esc(d.name), body: `<div class="reason ${d.status === 'Resubmission Required' ? 'amber' : ''}"><span class="r-t">${ic('alert', 15)}Reviewer's note</span><span>${esc(d.reason)}</span></div>${dropZone(d)}<p class="small muted">Your new file goes back to "Submitted" for review. The previous file stays in your version history.</p>`, actions: [{ label: 'Cancel' }] }); };
ACT.replaceDoc = el => { const d = W.docs.find(x => x.id === el.dataset.id); d._replacing = true; openModal({ title: 'Replace document', sub: esc(d.name), body: `<p>You can replace this document at any time${d.expires ? ` (the current one expires on <strong>${fd(d.expires)}</strong>)` : ''}. The replacement goes to review. <strong>Your current approved document stays valid until the replacement is approved.</strong></p>${dropZone(d)}`, actions: [{ label: 'Cancel', fn: () => { d._replacing = false; } }] }); };
ACT.withdrawApp = () => confirmDlg({ title: 'Withdraw your application?', danger: true, ok: 'Withdraw application', body: `<div class="note b-red">${ic('alert')}<div><strong>This can't be undone.</strong> Your application for ${esc(W.nvq.title)} will close and any held seat will be released. You would need to start a new application to study this programme.</div></div>`, onOk: () => { W.admission.status = 'Withdrawn'; W.admission.history.push(['Withdrawn', now().toISOString()]); render(); toast('Application withdrawn.'); } });
ACT.reapply = () => toast('Re-application rules are still to be confirmed by the Academy.', 'info');
ACT.payBalance = () => { const dp = W.admission.deposit; checkout({ cur: dp.cur, title: 'NVQ balance — ' + W.nvq.title, amount: dp.balance, partial: true, min: W.amt(100), onSuccess: (p) => { dp.balance = Math.max(0, dp.balance - p); if (!dp.balance) dp.holdUntil = null; } }); };
ACT.approveAllDocs = () => { if (!W.docs) return; W.docs.forEach(d => { if (d.mand) { d.status = 'Approved'; d.file = d.file || 'document.pdf'; d.uploaded = d.uploaded || now().toISOString(); } }); if (W.signup && W.signup.done && W.admission.status === 'Awaiting review') { W.admission.status = 'Under Review'; W.admission.history.push(['Under Review', now().toISOString()]); } render(); toast('Prototype: reviewer approved all mandatory documents.', 'info'); };
ACT.approveAdmission = () => { if (!W.signup || !W.signup.done) { toast('The application is reviewed after sign-up — finish the sign-up first.', 'info'); return; } W.admission.status = 'Approved'; W.admission.history.push(['Approved', now().toISOString()]); render(); toast('Admission approved — the place on ' + W.admission.batch + ' is confirmed.'); };

/* ---------- Assignments list ---------- */
const ASG_TABS = { todo: ['To do', a => ['Not Started', 'Resubmission Required'].includes(a.status)], submitted: ['Submitted', a => ['Submitted'].includes(a.status)], feedback: ['Feedback', a => a.status === 'Feedback Received'], completed: ['Completed', a => a.status === 'Completed'] };
function ragSummary(a) {
  const latest = a.qs.map(q => q.fb.length ? q.fb[q.fb.length - 1].rag : null).filter(Boolean);
  if (!latest.length) return '<span class="small muted">—</span>';
  const c = { R: 0, A: 0, G: 0 }; latest.forEach(r => c[r]++);
  return `<div class="chip-row">${['R', 'A', 'G'].filter(k => c[k]).map(k => `<span class="rag rag-${k}" title="${RAGL[k]}">${c[k]} ${RAGL[k]}</span>`).join('')}</div>`;
}
const roundLbl = a => a.round === 'Sub 1' ? 'Sub 1' : a.round;
SCREENS.assignments = () => {
  const t = ui('asgTab', 'todo'), F = ui('asgF', { unit: '', status: '', due: '' });
  let list = W.assignments.filter(ASG_TABS[t][1]);
  if (F.unit) list = list.filter(a => a.unit.startsWith(F.unit));
  if (F.status) list = list.filter(a => a.status === F.status);
  if (F.due === 'week') list = list.filter(a => daysTo(a.resubDue || a.due) >= 0 && daysTo(a.resubDue || a.due) <= 7);
  if (F.due === 'past') list = list.filter(a => daysTo(a.due) < 0);
  const units = [...new Set(W.assignments.map(a => a.unit.split(' ')[0]))];
  return `${pageHead('Assignments', esc(W.nvq.title))}
  <div class="row" role="group" aria-label="Filters">
    <div class="field"><label for="fc">Course</label><select class="select" id="fc"><option>${esc(W.nvq.title)}</option></select></div>
    <div class="field"><label for="fu">Unit</label><select class="select" id="fu" data-onchange="asgF" data-k="unit"><option value="">All units</option>${units.map(u => `<option ${F.unit === u ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
    <div class="field"><label for="fs">Status</label><select class="select" id="fs" data-onchange="asgF" data-k="status"><option value="">All statuses</option>${['Not Started', 'Submitted', 'Feedback Received', 'Resubmission Required', 'Completed'].map(s => `<option ${F.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    <div class="field"><label for="fd">Due date</label><select class="select" id="fd" data-onchange="asgF" data-k="due"><option value="">Any time</option><option value="week" ${F.due === 'week' ? 'selected' : ''}>Next 7 days</option><option value="past" ${F.due === 'past' ? 'selected' : ''}>Deadline passed</option></select></div></div>
  ${tabs(Object.entries(ASG_TABS).map(([k, [l, fn]]) => [k, l, W.assignments.filter(fn).length]), t, 'asgTab', 'Assignment status')}
  ${list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Assignment</th><th>Due</th><th>Status</th><th>Round</th><th>Resubmissions</th><th>Feedback</th><th><span class="sr">Open</span></th></tr></thead><tbody>
  ${list.map(a => `<tr><td><a href="#assignment.${a.id}" data-go="assignment" data-id="${a.id}" class="strong">${esc(a.title)}</a><div class="small muted">${esc(a.unit)}</div>${a.briefUpdated ? `<div>${chip('Brief updated', 'amber')}</div>` : ''}</td>
    <td class="nowrap small">${a.originalDue ? `Extended to<br><strong>${fdt(a.due)}</strong>` : a.resubDue ? `Resubmission due<br><strong>${fdt(a.resubDue)}</strong>` : fdt(a.due)}${a.closed ? `<div style="color:var(--red)" class="xs strong">${ic('alert', 12)} Deadline passed</div>` : ''}</td>
    <td>${chip(a.status)}</td><td><span class="code">${roundLbl(a)}</span></td><td class="small nowrap">${a.resubUsed} of ${a.resubMax} used</td><td>${ragSummary(a)}</td><td><button class="btn btn-sm" data-go="assignment" data-id="${a.id}">Open</button></td></tr>`).join('')}</tbody></table></div>`
  : `<div class="card"><div class="empty">${ic('edit', 36)}<p>No assignments in this list.</p></div></div>`}`;
};
ACT.asgTab = el => { setUi('asgTab', el.dataset.k); render(); };
INP.asgF = el => { const F = { ...ui('asgF', { unit: '', status: '', due: '' }) }; F[el.dataset.k] = el.value; setUi('asgF', F); render(); };

/* ---------- Assignment page ---------- */
const INK = n => n === 0 ? 'ink-0' : n === 1 ? 'ink-1' : 'ink-2';
const ROUNDNAME = n => n === 0 ? 'Submission 1' : `Resubmission ${n}`;
const INKNAME = n => n === 0 ? 'black' : n === 1 ? 'red' : 'amber';
function inkLegend() { return `<div class="ink-legend" aria-label="Submission colour key"><span><i style="background:var(--ink-0)"></i>Submission 1 — black</span><span><i style="background:var(--ink-1)"></i>Resubmission 1 — red</span><span><i style="background:var(--ink-2)"></i>Resubmission 2+ — amber</span></div>`; }
function asgHeader(a) {
  const dueIso = a.resubDue || a.due, ms = new Date(dueIso) - now();
  return `${a.briefUpdated ? `<div class="note b-amber">${ic('info')}<div><strong>Brief updated on ${fdt(a.briefUpdated)}.</strong> <button class="linklike" data-act="briefChanges" data-id="${a.id}">See what changed</button></div></div>` : ''}
  <div class="grid-2"><section class="card"><h2>Brief</h2><div class="stack small">${a.brief}</div>
    <h3>Resources and templates</h3><div class="row">${a.resources.map(([n]) => `<button class="btn btn-sm" data-act="fakeDl" data-f="${esc(n)}">${ic('download', 14)}${esc(n)}</button>`).join('')}</div>
    <h3>Linked criteria</h3><ul class="list">${a.crit.map(([c, d, t]) => `<li class="li" style="padding:8px 0"><span class="code">${c}</span><div class="li-b"><span class="small">${esc(d)}</span></div>${critType(t)}</li>`).join('')}</ul></section>
  <section class="card"><h2>Deadline</h2>${a.originalDue ? `<p class="small"><span class="strike">${fdt(a.originalDue)}</span><br>${chip('Extension granted', 'green')}</p>` : ''}<p class="strong">${a.resubDue ? 'Resubmission due ' : ''}${fdt(dueIso)}</p>
    ${ms > 0 ? `<p class="small">Time left: <span class="countdown" data-count="${dueIso}">${cdown(ms)}</span></p>` : `<p class="small" style="color:var(--red)">${ic('alert', 13)} Deadline passed</p>`}
    <h3>Submission rules</h3><p class="small">${a.rules}</p><p class="small muted">No late submissions. If you need more time, contact your assessor before the deadline.</p>
    <h3>Status</h3>${statusTimeline(a)}</section></div>`;
}
function statusTimeline(a) {
  const steps = a.timeline || [];
  const want = ['Submitted', a.status === 'Completed' ? 'Completed' : 'Feedback Received / Completed'];
  if (!steps.length) return `<ol class="tl">${want.map(s => `<li><span class="tl-d"></span><div><strong class="small">${s}</strong><div class="xs muted">Not yet</div></div></li>`).join('')}</ol>`;
  return `<ol class="tl">${steps.map((s, i) => `<li class="${i === steps.length - 1 ? 'cur' : 'done'}"><span class="tl-d">${i < steps.length - 1 ? '✓' : '●'}</span><div><strong class="small">${s[0]}</strong><div class="xs muted">${fdt(s[1])}</div></div></li>`).join('')}${a.status === 'Submitted' ? '<li><span class="tl-d"></span><div><strong class="small">Your feedback</strong><div class="xs muted">Not yet — your assessor is marking it. You\'ll be told as soon as it is ready.</div></div></li>' : ''}</ol>`;
}
ACT.briefChanges = el => { const a = asgById(el.dataset.id); openModal({ title: 'What changed in the brief', sub: `Updated ${fdt(a.briefUpdated)} · version 2`, body: `<ul class="stack" style="padding-left:18px;margin:0">${a.briefChanges.map(c => `<li>${esc(c)}</li>`).join('')}</ul><p class="small muted">Version 1 published ${fd(D(-12))}. Your draft answers are unchanged.</p>`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); };
function rte(a, q, n, opts = {}) {
  const key = a.id + '.' + q.id + '.' + n;
  const val = W.drafts[key] ?? '';
  const wc = val.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return `<div class="rte ${INK(n)} ${opts.disabled ? 'disabled' : ''}" data-key="${key}">
    <div class="rte-tb" role="toolbar" aria-label="Formatting for question ${q.id.slice(1)}">${[['bold', '<b>B</b>', 'Bold'], ['italic', '<i>I</i>', 'Italic'], ['insertUnorderedList', '•', 'Bulleted list'], ['insertOrderedList', '1.', 'Numbered list'], ['createLink', ic('link', 15), 'Insert link']].map(([c, l, t]) => `<button type="button" data-act="fmtCmd" data-c="${c}" aria-label="${t}" title="${t}" ${opts.disabled ? 'disabled' : ''}>${l}</button>`).join('')}
    <span class="wc"><span data-wc="${key}">${wc}</span> words</span></div>
    <div class="rte-body" contenteditable="${opts.disabled ? 'false' : 'true'}" role="textbox" aria-multiline="true" aria-label="Your answer to question ${q.id.slice(1)}${n ? ' — ' + ROUNDNAME(n) : ''}" data-ph="${opts.disabled ? 'Editing closed' : 'Type your answer here…'}" data-oninput="rteInput" data-key="${key}" ${opts.disabled ? 'aria-disabled="true"' : ''}>${val}</div></div>
    ${!opts.disabled ? `<div class="row xs"><label class="btn btn-sm" style="cursor:pointer">${ic('clip2', 14)}Attach file<input type="file" class="sr" data-onchange="attach" data-key="${key}"></label>${(W.drafts['att.' + key] || []).map(f => `<span class="attach">${ic('doc', 13)}${esc(f)}</span>`).join('')}<span class="muted">Up to 5 files · PDF, DOCX, JPG, PNG · 10 MB each</span></div>` : ''}`;
}
let SAVE_T = null, DIRTY = false;
function setSave(state) {
  const c = $('#savechip'); if (!c) return;
  const m = { busy: [ic('refresh', 13) + 'Saving…', 'busy'], ok: [ic('check', 13) + 'Saved ' + fmt(now().toISOString(), { hour: '2-digit', minute: '2-digit', hour12: false }), 'ok'], fail: [ic('alert', 13) + 'Save failed — retrying', 'fail'] }[state];
  c.className = 'save-chip ' + m[1]; c.innerHTML = m[0];
}
function doSave() {
  setSave('busy'); clearTimeout(SAVE_T);
  SAVE_T = setTimeout(() => {
    if (S.saveFail || S.offline) { setSave('fail'); SAVE_T = setTimeout(() => { if (!S.offline) { setSave('ok'); DIRTY = false; toast('Connection restored — your draft was saved and restored.', 'info'); } }, 2500); }
    else { setSave('ok'); DIRTY = false; }
  }, 700);
}
INP.rteInput = el => {
  W.drafts[el.dataset.key] = el.innerHTML; DIRTY = true;
  const wc = el.innerText.trim().split(/\s+/).filter(Boolean).length; const w = $(`[data-wc="${el.dataset.key}"]`); if (w) w.textContent = wc;
  doSave();
};
INP.attach = el => { const f = el.files[0]; if (!f) return; const k = 'att.' + el.dataset.key; W.drafts[k] = [...(W.drafts[k] || []), f.name]; render(); doSave(); };
ACT.fmtCmd = el => { const c = el.dataset.c; const body = el.closest('.rte').querySelector('.rte-body'); body.focus(); if (c === 'createLink') { const sel = window.getSelection(); if (sel && sel.toString()) document.execCommand('createLink', false, 'https://'); else toast('Select some text first, then add a link.', 'info'); } else document.execCommand(c); INP.rteInput(body); };
AFTER.push(() => { clearTimer('autosave'); if (S.route === 'assignment' && $('#savechip')) timer('autosave', () => { if (DIRTY) doSave(); }, 10000); });

SCREENS.assignment = (p) => {
  const a = asgById(p.id); if (!a) return notFound();
  const crumbs = [['Assignments', 'assignments'], [a.title]];
  const head = pageHead(esc(a.title), `${esc(a.unit)}${(x => x ? ' — ' + esc(modLabel(x.m)) : '')(nvqModOf(W.tree, a.unit))} · ${esc(W.nvq.title)}`, `${chip(a.status)}<span class="code">${roundLbl(a)}</span><span class="small muted">${a.resubUsed} of ${a.resubMax} resubmissions used</span>${a.qs.some(q => q.rounds.length) ? `<button class="btn btn-sm" data-act="pdfDl" data-id="${a.id}">${ic('download', 14)}Download as PDF</button>` : ''}`, crumbs);
  let main;
  if (W.nvq && W.nvq.status === 'Discontinued') main = `<div class="note b-red" role="status">${ic('lock')}<div><strong>Read-only — this programme has been discontinued.</strong> You can view your submitted answers and feedback but can't change them.</div></div>
    <div class="paper">${a.qs.map((q, i) => `<div class="q">${qHead(q, i)}${rte(a, q, 0, { disabled: true })}</div>`).join('')}</div>`;
  else if (a.closed) main = `<div class="note b-red" role="status">${ic('lock')}<div><strong>Deadline passed — submission closed.</strong> Contact your assessor if you need an extension.<div class="b-act"><button class="btn btn-sm" data-act="compose" data-to="Sarah Okonkwo (Assessor)" data-sub="Extension request — ${esc(a.title)}">Message assessor</button></div></div></div>
    <div class="paper">${a.qs.map((q, i) => `<div class="q">${qHead(q, i)}${rte(a, q, 0, { disabled: true })}</div>`).join('')}</div>`;
  else if (a.status === 'Not Started') main = answerSheet(a);
  else if (a.status === 'Resubmission Required') main = resubView(a);
  else main = lockedView(a);
  return head + asgHeader(a) + main;
};
function qHead(q, i) { const c = allCrit().find(x => x.code === q.crit); return `<div class="q-h"><span class="q-n">Q${i + 1}</span><div class="stack" style="gap:6px"><span class="q-t">${esc(q.text)}</span><div class="row"><span class="code">${q.crit}</span>${critType(c ? c.type : 'Knowledge')}</div></div></div>`; }
function answerSheet(a) {
  return `<section class="stack"><div class="row-b" style="position:sticky;top:calc(var(--hdr) + 8px);z-index:5;background:var(--bg);padding:6px 0"><h2>Answer sheet</h2><div class="row"><span id="savechip" class="save-chip ok" role="status" aria-live="polite">${ic('check', 13)}${Object.keys(W.drafts).some(k => k.startsWith(a.id)) ? 'Saved' : 'Auto-save on'}</span><button class="btn btn-primary" data-act="reviewSubmit" data-id="${a.id}">Review &amp; Submit</button></div></div>
  <p class="small muted">Your answers save automatically as you type and at least every 10 seconds.</p>
  <div class="paper">${a.qs.map((q, i) => `<div class="q">${qHead(q, i)}${rte(a, q, 0)}</div>`).join('')}</div>
  <div class="row" style="justify-content:flex-end"><button class="btn btn-primary" data-act="reviewSubmit" data-id="${a.id}">Review &amp; Submit</button></div></section>`;
}
function roundBlock(q, n, r) {
  const fb = q.fb[n];
  return `<div class="q-grid"><div class="round ${INK(n)}"><span class="r-lbl">${ROUNDNAME(n)} — ${fd(r.at)} <span class="muted" style="font-weight:400;text-transform:none;letter-spacing:0">(${INKNAME(n)} ink · locked)</span></span><div class="r-ans">${r.html}</div></div>
  ${fb ? `<div class="fb fb-${fb.rag}"><div class="fb-h">${rag(fb.rag)}<span>Assessor feedback</span></div><span>${esc(fb.text)}</span><span class="xs">${esc(fb.by)} · ${fdt(fb.at)}</span></div>` : '<div></div>'}</div>`;
}
function feedbackTop(a) {
  return `${a.overall ? `<section class="card"><h2>Overall comment</h2><p>${esc(a.overall)}</p><p class="small muted">${esc(a.assessor)} · ${fdt((a.timeline.find(t => t[0].startsWith('Feedback') || t[0] === 'Completed') || a.timeline[a.timeline.length - 1])[1])}</p></section>` : ''}
  ${(a.coordAll || (a.coord ? [a.coord] : [])).map(c => `<section class="coord" aria-label="Coordinator feedback"><div class="c-h">${ic('users')}Coordinator feedback${c.scope && c.scope !== 'Overall submission' ? ` <span class="xs">· ${esc(c.scope)}</span>` : ''}</div><p>${esc(c.text)}</p><p class="small muted">${esc(c.by)}, Academic Coordinator · ${fdt(c.at)}</p><p class="xs strong">This does not change your submission status.</p></section>`).join('')}`;
}
function lockedView(a) {
  const submittedNote = a.status === 'Submitted' ? `<div class="note b-green">${ic('check')}<div><strong>Submitted at ${fts(a.submittedAt)}.</strong> Your submission is final and locked. You'll be notified when feedback is ready.</div></div>` : '';
  const limit = a.limit ? `<div class="note b-purple" role="status">${ic('lock')}<div><strong>Under review by the Academy — you'll be notified of the next step.</strong> You've used ${a.resubUsed} of ${a.resubMax} resubmissions, so editing is closed for this assignment.</div></div>` : '';
  return `${submittedNote}${limit}${feedbackTop(a)}<section class="stack"><div class="row-b"><h2>${a.qs.some(q => q.fb.length) ? 'Your answers and feedback' : 'Your submitted answers'}</h2>${inkLegend()}</div>
  <div class="paper">${a.qs.map((q, i) => `<div class="q">${qHead(q, i)}${q.rounds.map((r, n) => roundBlock(q, n, r)).join('')}${q.state === 'met' && q.fb.length ? `<span class="xs strong" style="color:#1A6A35">✓ Met — locked</span>` : ''}${q.state === 'limit' ? `<div class="pd-tag" style="background:#EEF1F1;color:#12292E;border-color:#B9C7C9">${ic('lock', 16)}<div>Resubmission limit reached — under review by the Academy.</div></div>` : ''}</div>`).join('')}</div></section>`;
}
function resubView(a) {
  const n = a.resubUsed + 1;
  return `<div class="note b-red" role="status">${ic('edit')}<div><strong>Resubmission ${n} of ${a.resubMax} — due ${fdt(a.resubDue)}.</strong> A new answer box is open only under questions that need rework. Questions that were met, or moved to your Professional Discussion, stay locked.</div></div>
  ${feedbackTop(a)}
  <section class="stack"><div class="row-b" style="position:sticky;top:calc(var(--hdr) + 8px);z-index:5;background:var(--bg);padding:6px 0"><h2>Resubmission</h2><div class="row"><span id="savechip" class="save-chip ok" role="status" aria-live="polite">${ic('check', 13)}Auto-save on</span><button class="btn btn-primary" data-act="reviewSubmit" data-id="${a.id}">Review &amp; Submit</button></div></div>
  ${inkLegend()}
  <div class="paper">${a.qs.map((q, i) => `<div class="q">${qHead(q, i)}${q.rounds.map((r, k) => roundBlock(q, k, r)).join('')}
    ${q.state === 'rework' ? `<div class="stack" style="gap:6px"><span class="r-lbl strong xs ${INK(q.rounds.length)}" style="text-transform:uppercase;letter-spacing:.06em">${ROUNDNAME(q.rounds.length)} — your new answer (${INKNAME(q.rounds.length)} ink)</span>${rte(a, q, q.rounds.length)}</div>` : ''}
    ${q.state === 'pd' ? `<div class="pd-tag">${ic('users', 18)}<div class="stack" style="gap:4px"><strong>Added to Professional Discussion — no rework needed</strong><span class="small">${esc(q.pdReason)}</span><span class="xs">Sarah Okonkwo · ${fd(q.fb[0].at)}</span><a href="#progress..pd" data-go="progress" data-tab="pd" class="small">View PD checklist</a></div></div>` : ''}
    ${q.state === 'met' ? `<span class="xs strong" style="color:#1A6A35">✓ Met — locked, no changes needed</span>` : ''}</div>`).join('')}</div>
  <div class="row" style="justify-content:flex-end"><button class="btn btn-primary" data-act="reviewSubmit" data-id="${a.id}">Review &amp; Submit</button></div></section>`;
}
ACT.reviewSubmit = el => {
  const a = asgById(el.dataset.id), resub = a.status === 'Resubmission Required';
  const qs = resub ? a.qs.filter(q => q.state === 'rework') : a.qs;
  const key = q => a.id + '.' + q.id + '.' + (resub ? q.rounds.length : 0);
  const empty = qs.filter(q => !(W.drafts[key(q)] || '').replace(/<[^>]+>|&nbsp;/g, '').trim());
  openModal({
    title: 'Review your ' + (resub ? 'resubmission' : 'answers'), sub: esc(a.title), size: 'lg',
    body: `${empty.length ? `<div class="note b-red" role="alert">${ic('alert')}<div><strong>${plural(empty.length, 'answer')} ${empty.length === 1 ? 'is' : 'are'} empty.</strong> You can still submit, but empty answers are likely to be marked "Not met".</div></div>` : `<div class="note b-green">${ic('check')}<div>Every question has an answer.</div></div>`}
    <div class="paper" style="gap:14px">${qs.map(q => { const v = W.drafts[key(q)] || ''; const isEmpty = empty.includes(q); const att = W.drafts['att.' + key(q)] || []; return `<div class="q"><div class="q-h"><span class="q-n">Q${a.qs.indexOf(q) + 1}</span><span class="q-t">${esc(q.text)}</span></div><div class="${INK(resub ? q.rounds.length : 0)} ${isEmpty ? 'empty-ans' : ''}" style="padding:6px">${isEmpty ? '<em style="color:#C01818">No answer entered</em>' : v}</div>${att.length ? `<div class="row">${att.map(f => `<span class="attach">${ic('doc', 13)}${esc(f)}</span>`).join('')}</div>` : '<span class="xs muted">No attachments</span>'}</div>`; }).join('')}</div>
    <p class="small muted">When you press Submit, the time is recorded straight away. You then have 15 seconds to undo. After that, your submission is final and can't be reopened.</p>`,
    actions: [{ label: 'Back to editing', cls: 'btn' }, { label: 'Submit', cls: 'btn-primary', fn: () => startUndo(a, resub) }],
  });
};
function startUndo(a, resub) {
  const clickAt = now().toISOString();
  let left = 15;
  // Announced once (role=status); later ticks only update the number and bar, so screen readers don't repeat it every second
  const draw = () => { const ex = $('#undo-root .undo'); if (ex) { const n = ex.querySelector('.num'), b = ex.querySelector('.u-bar span'); if (n) n.textContent = left; if (b) b.style.width = (left / 15 * 100) + '%'; return; } $('#undo-root').innerHTML = `<div class="undo" role="status"><div class="u-b"><span><strong>Submitting in <span class="num" aria-hidden="true">${left}</span>s</strong> — recorded at ${fts(clickAt)}. You have 15 seconds to undo.</span><div class="u-bar" aria-hidden="true"><span style="width:${left / 15 * 100}%"></span></div></div><button class="btn btn-sm" data-act="undoSubmit">${ic('undo', 14)}Undo</button></div>`; };
  draw();
  timer('undo', () => { left--; if (left <= 0) { clearTimer('undo'); $('#undo-root').innerHTML = ''; finaliseSubmit(a, resub, clickAt); } else draw(); }, 1000);
}
ACT.undoSubmit = () => { clearTimer('undo'); $('#undo-root').innerHTML = ''; toast('Submission cancelled. You\'re back to editing — nothing was sent.', 'info'); };
function finaliseSubmit(a, resub, at) {
  if (resub) {
    a.qs.filter(q => q.state === 'rework').forEach(q => { const k = a.id + '.' + q.id + '.' + q.rounds.length; q.rounds.push({ at, html: W.drafts[k] || '<p><em>No answer entered</em></p>' }); q.state = 'open'; });
    a.resubUsed++; a.round = 'Resub ' + a.resubUsed; a.timeline.push(['Resubmitted (' + a.resubUsed + ')', at]);
  } else {
    a.qs.forEach(q => { const k = a.id + '.' + q.id + '.0'; q.rounds.push({ at, html: W.drafts[k] || '<p><em>No answer entered</em></p>' }); });
    a.timeline = [['Submitted', at]];
  }
  a.status = 'Submitted'; a.submittedAt = at; a.resubDue = null;
  W.plan.forEach(p => { if (p.go === 'assignment.' + a.id) p.done = true; });
  render();
  openModal({ title: 'Submission received', body: `<div class="note b-green">${ic('check')}<div><strong>Submitted at ${fts(at)}.</strong></div></div><p>${esc(a.title)} is now final and locked. Your assessor will review it and you'll be notified when feedback is ready.</p><p class="small muted">A confirmation email has been sent to ${esc(W.me.email)}.</p>`, actions: [{ label: 'Download as PDF', cls: 'btn', fn: () => { ACT.pdfDl({ dataset: { id: a.id } }); return false; } }, { label: 'Done', cls: 'btn-primary' }] });
}
ACT.pdfDl = el => { const a = asgById(el.dataset.id); toast(`"${esc(a.title)}.pdf" downloaded (simulated). It keeps the black, red and amber ink, the RAG feedback colours, timestamps and author names.`); };

/* ---------- Progress & Gap Analysis ---------- */
SCREENS.progress = (p) => {
  const t = p.tab || 'tree';
  const all = allCrit(), c = countStates(all), pct = pctOf(all);
  const summary = `<section class="card"><div class="row" style="gap:28px;align-items:flex-start">
    <div class="stack" style="gap:4px;min-width:160px"><span class="eyebrow">Overall</span><span class="big-num">${pct}%</span><span class="small muted">${c['Achieved']} of ${all.length} criteria achieved</span></div>
    <div class="stack" style="flex:1;min-width:240px;gap:8px">${fiveBar(c)}<div class="chip-row">${FIVE.map(([k]) => chip(`${k}: ${c[k]}`, TONE[k])).join('')}</div>
    <p class="small">Projected completion: <strong>${fd(D(84))}</strong> vs programme end <strong>${fd(W.nvq.end)}</strong> — on track</p></div></div>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(min(100%,210px),1fr));gap:10px">${W.tree.map(u => { const cr = critOf(u); return `<div class="stack" style="gap:4px"><span class="small"><span class="code">${u.code}</span> ${esc(u.title)}</span>${bar(pctOf(cr), u.code + ' progress')}</div>`; }).join('')}</div></section>`;
  const sections = { tree: treeSection, plan: planSection, pd: pdSection, portfolio: portfolioSection };
  return `${pageHead('Progress & Gap Analysis', esc(W.nvq.title))}
  ${W.qualified ? `<section class="celebrate"><div class="ray"></div><span class="eyebrow" style="color:#F6D58E">${ic('award', 14)} Milestone reached</span><h2>Qualification requirements met</h2><p>Congratulations, ${esc(W.me.first)} — every criterion in your ${esc(W.nvq.title)} is achieved. What happens next:</p><ol style="margin:0;padding-left:20px;color:#E3F3F4"><li>Internal quality checks are completed by the Academy (usually 10 working days).</li><li>Your claim is sent to the awarding body.</li><li>Your certificate is issued and appears in Certificates.</li></ol><div><button class="btn btn-gold" data-go="certificates">Go to Certificates</button></div></section>` : ''}
  ${summary}
  ${subtabs([['tree', 'Programme tree'], ['plan', 'Gaps & improvement plan'], ['pd', 'PD consolidation checklist'], ['portfolio', 'My Portfolio']], t, 'progress')}
  ${(sections[t] || treeSection)()}`;
};
function treeSection() {
  const fs = ui('trState', ''), ft_ = ui('trType', '');
  const filt = cr => cr.filter(c => (!fs || c.st === fs));
  const node = (lvl, code, title, crits, inner, open) => { const cs = countStates(crits); return `<details class="lvl-${lvl}" ${open ? 'open' : ''}><summary><span class="caret">${ic('chev', 16)}</span><span class="tw"><span class="${lvl === 1 ? 'strong' : 'small strong'}"><span class="code">${code}</span> ${esc(title)}</span></span><span class="tm"><span class="small num pc">${pctOf(crits)}%</span>${fiveBar(cs, 'sm')}</span></summary><div class="kids">${inner}</div></details>`; };
  const critRow = (c, type) => `<div class="crit-row"><div class="stack" style="gap:4px"><div class="row" style="gap:8px"><span class="code">${c.code}</span>${critType(type)}${chip(c.st)}${c.lock ? `<span class="xs muted" title="Verified — locked">${ic('lock', 12)} Verified by ${esc(c.lock.by)} on ${fdt(c.lock.at)}</span>` : ''}</div><span class="small">${esc(c.d)}</span>
    <div class="cr-meta">${c.src ? `<span>Evidence: ${esc(c.src)}</span>` : '<span>No evidence yet</span>'}${c.date ? `<span>· Achieved ${fd(c.date)}</span>` : ''}${c.obs ? `<span>· ${chip(c.obs.o ? 'Observed' : 'Not Yet Observed')} ${chip(c.obs.c ? 'Competent' : 'Not Yet Competent')}</span>` : ''}</div></div>
    <div>${c.ev ? `<button class="btn btn-sm" data-act="goTok" data-t="${c.ev}">View evidence</button>` : ''}</div></div>`;
  const anyF = fs || ft_;
  const units = W.tree.map((u, ui_) => {
    const mods = u.mods.map(m => {
      const los = m.los.filter(lo => !ft_ || lo.type === ft_).map(lo => { const cr = filt(lo.crit); if (!cr.length) return ''; return node(4, lo.code, `${lo.title}`, lo.crit, `<div class="small muted" style="padding:6px 12px">Assessment type set on this Learning Outcome: ${critType(lo.type)}</div>` + cr.map(c => critRow(c, lo.type)).join(''), anyF); }).join('');
      return los ? node(3, m.code, modLabel(m), critOf(m), los, anyF) : '';
    }).join('');
    return mods ? node(1, u.code, u.title, critOf(u), mods, anyF || ui_ === 1) : '';
  }).join('');
  return `<section class="card pad0"><div style="padding:16px 18px" class="stack"><div class="row-b"><h2>Programme tree</h2><div class="row">
    <div class="field"><label for="trs">State</label><select class="select" id="trs" data-onchange="trState"><option value="">All states</option>${FIVE.map(([k]) => `<option ${fs === k ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
    <div class="field"><label for="trt">Type</label><select class="select" id="trt" data-onchange="trType"><option value="">All types</option><option value="Knowledge" ${ft_ === 'Knowledge' ? 'selected' : ''}>Knowledge</option><option value="Observation" ${ft_ === 'Observation' ? 'selected' : ''}>Observation / Competency</option></select></div></div></div>
    <details><summary class="small strong" style="cursor:pointer">Legend — what each state means</summary><ul class="list small">${FIVE.map(([k, , d]) => `<li class="li" style="padding:6px 0">${chip(k)}<span>${d}</span></li>`).join('')}</ul></details>
    <p class="xs muted">Course → Unit → Module → Learning Outcome → Assessment Criterion</p></div>
    <div class="tree">${units || '<div class="empty"><p>No criteria match these filters.</p></div>'}</div></section>`;
}
INP.trState = el => { setUi('trState', el.value); render(); };
INP.trType = el => { setUi('trType', el.value); render(); };
function planSection() {
  const gaps = allCrit().filter(c => c.st !== 'Achieved');
  const need = c => c.st === 'Added to PD' ? 'Discuss in your Professional Discussion' : c.st === 'Action Required' ? 'Rework required — see assessor feedback' : c.type === 'Observation' ? 'Workplace observation by your assessor' : c.st === 'In Progress' ? 'Waiting for assessor judgement' : 'Written evidence via assignment';
  return `<div class="grid-2"><section class="card"><h2>Outstanding criteria (${gaps.length})</h2><ul class="list">${gaps.map(c => `<li class="li"><div class="li-b"><div class="row" style="gap:6px"><span class="code">${c.code}</span>${chip(c.st)}${critType(c.type)}</div><span class="small">${esc(c.d)}</span><span class="xs muted">Evidence still needed: ${need(c)}</span></div><div class="li-a">${c.ev ? `<button class="btn btn-sm" data-act="goTok" data-t="${c.ev}">Go</button>` : `<button class="btn btn-sm" data-go="observations">Go</button>`}</div></li>`).join('')}</ul></section>
  <section class="card"><h2>Improvement plan</h2><p class="small muted">Work through these in order. Tick an item when you've done it.</p><ol class="list">${W.plan.map((p, i) => `<li class="li"><label class="check"><input type="checkbox" ${p.done ? 'checked' : ''} data-onchange="planDone" data-id="${p.id}" aria-label="Mark '${esc(p.action)}' as done"></label><div class="li-b"><span class="strong ${p.done ? 'strike' : ''}">${i + 1}. ${esc(p.action)}</span><span class="xs muted">Criteria ${esc(p.crit)} · target ${fd(p.target)} · ${p.src === 'System' ? chip('System', 'grey') : chip('Assessor recommendation', 'teal')}</span></div><div class="li-a"><button class="btn btn-sm" data-act="goTok" data-t="${p.go}">Open</button></div></li>`).join('')}</ol></section></div>`;
}
INP.planDone = el => { const p = W.plan.find(x => x.id === el.dataset.id); p.done = el.checked; render(); toast(p.done ? 'Marked as done.' : 'Marked as not done.'); };
function pdSection() {
  const s = W.pd.session;
  return `<div class="note b-purple">${ic('users')}<div><strong>You do not need to rework these items.</strong> Your assessor will cover them with you in your Professional Discussion.</div></div>
  <div class="grid-2"><section class="card"><h2>PD consolidation checklist</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Criterion</th><th>From</th><th>Assessor's reason</th><th>Status</th></tr></thead><tbody>${W.pd.items.map(i => `<tr><td><span class="code">${i.ref}</span><div class="xs muted">${i.unit}</div></td><td class="small"><a href="#${i.go}" data-act="goTok" data-t="${i.go}">${esc(i.from)}</a></td><td class="small">${esc(i.reason)}</td><td>${chip(i.status)}</td></tr>`).join('')}</tbody></table></div></section>
  <section class="card"><div class="row-b"><h2>PD session</h2>${chip(s.status)}</div><dl class="kv"><dt>Date and time</dt><dd><strong>${fdl(s.at)}</strong><br>${ft(s.at)} (60 minutes)</dd><dt>Mode</dt><dd>${s.mode === 'In person' ? `In person<br><span class="small">${esc(s.loc)}</span>` : `Online — <a href="#" data-act="joinPd">Zoom link</a>`}</dd><dt>With</dt><dd>${esc(s.with)}</dd></dl>
    ${s.status === 'Proposed' ? `<div class="row"><button class="btn btn-primary" data-act="pdConfirm">Confirm</button><button class="btn" data-act="pdAlt">Request alternative</button></div>` : s.status === 'Confirmed' ? `<div class="note b-green">${ic('check')}<div>Confirmed. It's in your calendar.</div></div>` : `<div class="note b-amber">${ic('clock')}<div>Alternative requested — waiting for your assessor.</div></div>`}
    <h3>Reschedule history</h3><ul class="list small">${W.pd.history.map(h => `<li class="li" style="padding:8px 0"><div class="li-b"><span><span class="strike">${fdt(h.from)}</span> → <strong>${fdt(h.to)}</strong></span><span class="xs muted">Requested by ${h.by} on ${fd(h.at)} · ${esc(h.reason)}</span></div></li>`).join('')}</ul></section></div>`;
}
ACT.pdConfirm = () => confirmDlg({ title: 'Confirm your Professional Discussion?', ok: 'Confirm this date', body: `<p>${fdt(W.pd.session.at)} · ${esc(W.pd.session.mode)}</p>`, onOk: () => { W.pd.session.status = 'Confirmed'; const e = W.events.find(x => x.id === 'epd'); if (e) e.title = 'Professional Discussion (confirmed)'; render(); toast('PD session confirmed and added to your calendar.'); } });
ACT.pdAlt = () => altDateModal('Request alternative PD date', () => { W.pd.session.status = 'Rescheduled'; W.pd.history.unshift({ from: W.pd.session.at, to: W.pd.session.at, by: 'You', reason: 'Alternative requested — awaiting assessor', at: now().toISOString() }); render(); toast('Request sent to your assessor.'); });
ACT.joinPd = () => toast('The Zoom link opens 15 minutes before the session.', 'info');
function altDateModal(title, onOk, note = '') {
  openModal({ title, body: `${note}<div class="field"><label for="alt-r">Reason</label><textarea class="textarea" id="alt-r" placeholder="For example: I'm on a night shift that week."></textarea></div><div class="form-grid"><div class="field"><label for="alt-1">Preferred date 1</label><input class="input" type="datetime-local" id="alt-1" value="${D(12).slice(0, 16)}"></div><div class="field"><label for="alt-2">Preferred date 2 (optional)</label><input class="input" type="datetime-local" id="alt-2"></div></div><p class="xs muted">Times are in ${tzl()}.</p>`,
    actions: [{ label: 'Cancel' }, { label: 'Send request', cls: 'btn-primary', fn: () => { if (!mval('#alt-r')) { fieldErr('#alt-r', 'Enter a reason'); return false; } onOk(); } }] });
}
function portfolioSection() {
  return `<section class="card"><div class="row-b"><h2>My Portfolio</h2></div><p class="small muted">A read-only view of all your evidence, organised by unit and criterion.</p>
  ${W.tree.map(u => `<details class="card flat" style="padding:12px"><summary class="strong" style="cursor:pointer"><span class="code">${u.code}</span> ${esc(u.title)}</summary><div class="tbl-wrap" style="margin-top:10px"><table class="tbl"><thead><tr><th>Criterion</th><th>Evidence</th><th>Feedback</th><th>Verification</th></tr></thead><tbody>${critOf(u).map(c => `<tr><td><span class="code">${c.code}</span></td><td class="small">${c.src ? esc(c.src) : '<span class="muted">None yet</span>'}</td><td>${c.st === 'Achieved' ? rag('G') : c.st === 'Action Required' ? rag('R') : '<span class="small muted">—</span>'}</td><td>${chip(c.st === 'Achieved' ? 'Approved' : c.src ? 'Pending' : 'Not Started', c.st === 'Achieved' ? 'green' : c.src ? 'amber' : 'grey')}</td></tr>`).join('')}</tbody></table></div></details>`).join('')}</section>`;
}

/* ---------- Observations & Workplace ---------- */
SCREENS.observations = (p) => {
  const t = p.tab || (p.id ? 'list' : 'list');
  return `${pageHead('Observations & Workplace', esc(W.nvq.title))}${subtabs([['list', 'Observations'], ['workplace', 'Workplace details']], t, 'observations')}${t === 'workplace' ? workplaceSection() : obsList()}`;
};
function permCard() {
  const w = W.workplace, p = w.perm;
  if (p === 'Not entered') return '';
  const body = {
    'Permission Pending': `<p>We emailed <strong>${esc(w.cname)}</strong> (${esc(w.cemail)}) on ${fd(w.sent)}. The link expires on ${fd(w.expiry)}.</p>${w.reminder ? `<p class="small">${chip('Reminder sent', 'blue')} ${chip('Escalated to Academy', 'purple')}<br><span class="muted">${esc(w.reminder)}</span></p>` : ''}<div class="row"><button class="btn btn-sm" data-act="resendPerm">Resend link</button></div>`,
    'Granted': `<p>Granted by <strong>${esc(w.grantedBy)}</strong> on ${fd(w.grantedAt)}.</p><button class="btn btn-sm" data-act="viewConsent">${ic('doc', 14)}View consent document</button>`,
    'Declined': `<div class="reason"><span class="r-t">${ic('alert', 15)}Reason given by ${esc(w.cname)}</span><span>${esc(w.declineReason)}</span></div><div class="row"><button class="btn btn-sm btn-primary" data-act="editWp">Edit details &amp; resend</button><button class="btn btn-sm" data-act="resendPerm">Resend link</button></div>`,
    'Expired': `<p>The link sent on ${fd(w.sent)} expired on ${fd(D(-1))} without a reply.</p><div class="row"><button class="btn btn-sm btn-primary" data-act="editWp">Edit details &amp; resend</button><button class="btn btn-sm" data-act="resendPerm">Resend link</button></div>`,
  }[p];
  return `<section class="card"><div class="row-b"><h2>Permission for observations</h2>${chip(p)}</div>${body}</section>`;
}
function workplaceSection() {
  const w = W.workplace, editing = ui('wpEdit', false) || w.perm === 'Not entered';
  const form = `<form class="card" data-submit="wpSave"><h2>${w.perm === 'Not entered' ? 'Enter your workplace details' : 'Edit workplace details'}</h2><p class="small muted">When you submit, we email your contact to ask permission for assessors to observe you at work.</p>
    <div class="form-grid">
      <div class="field full"><label for="wp-name">Care home or employer name</label><input class="input" id="wp-name" value="${esc(ui('wpBlank') ? '' : w.name)}" required></div>
      <div class="field full"><label for="wp-addr">Address</label><input class="input" id="wp-addr" value="${esc(ui('wpBlank') ? '' : w.address)}"></div>
      <div class="field"><label for="wp-pc">Postcode</label><input class="input" id="wp-pc" value="${esc(ui('wpBlank') ? '' : w.postcode)}"></div>
      <div class="field"><label for="wp-ct">Contact title</label><select class="select" id="wp-ct">${['Manager', 'Coordinator', 'Deputy Manager', 'Clinical Lead'].map(o => `<option ${w.ctitle === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
      <div class="field"><label for="wp-cn">Contact name</label><input class="input" id="wp-cn" value="${esc(ui('wpBlank') ? '' : w.cname)}"></div>
      <div class="field"><label for="wp-ce">Contact email</label><input class="input" id="wp-ce" type="email" value="${esc(ui('wpBlank') ? '' : w.cemail)}"></div>
      <div class="field"><label for="wp-cp">Contact phone</label><input class="input" id="wp-cp" type="tel" value="${esc(ui('wpBlank') ? '' : w.cphone)}"></div>
      <div class="field"><label for="wp-role">Your role / job title</label><input class="input" id="wp-role" value="${esc(w.role)}"></div>
      <div class="field full"><label for="wp-shift">Shift pattern</label><input class="input" id="wp-shift" value="${esc(w.shift)}"></div></div>
    <div class="row">${w.perm !== 'Not entered' ? '<button type="button" class="btn" data-act="cancelWp">Cancel</button>' : ''}<button class="btn btn-primary" type="submit">Submit and request permission</button></div></form>`;
  const view = `<section class="card"><div class="row-b"><h2>${esc(w.name)}</h2><div class="row"><button class="btn btn-sm" data-act="editWp">Edit details</button><button class="btn btn-sm" data-act="changeWp">Change workplace</button></div></div>
    <dl class="kv"><dt>Address</dt><dd>${esc(w.address)}, ${esc(w.postcode)}</dd><dt>Contact</dt><dd>${esc(w.ctitle)} — ${esc(w.cname)}<br><span class="small">${esc(w.cemail)} · ${esc(w.cphone)}</span></dd><dt>Your role</dt><dd>${esc(w.role)}</dd><dt>Shift pattern</dt><dd>${esc(w.shift)}</dd></dl></section>`;
  const obsCrit = allCrit().filter(c => c.type === 'Observation');
  return `<div class="grid-2"><div class="stack-lg">${editing ? form : view}${permCard()}
    ${w.history.length ? `<section class="card"><h2>Previous workplaces</h2><ul class="list">${w.history.map(h => `<li class="li"><div class="li-b"><span class="strong">${esc(h.name)}</span><span class="small muted">${h.from} – ${h.to} · consent by ${esc(h.by)}</span></div>${chip(h.perm)}<button class="btn btn-sm btn-ghost" data-act="viewConsent">View consent</button></li>`).join('')}</ul><p class="xs muted">Read-only history.</p></section>` : ''}</div>
  <section class="card"><h2>What will be observed</h2><p class="small muted">Your workplace contact sees these when they review the permission request.</p>
    <h3>NVQ criteria (Observation / Competency)</h3><ul class="list small">${obsCrit.map(c => `<li class="li" style="padding:6px 0"><span class="code">${c.code}</span><span>${esc(c.d)}</span></li>`).join('')}</ul>
    <h3>Illumin Academy criteria</h3><ul class="list small">${W.iaCriteria.map(([c, d]) => `<li class="li" style="padding:6px 0"><span class="code">${c}</span><span>${esc(d)}</span></li>`).join('')}</ul></section></div>`;
}
ACT.editWp = () => { setUi('wpEdit', true); setUi('wpBlank', false); go('observations', { tab: 'workplace' }); };
ACT.cancelWp = () => { setUi('wpEdit', false); render(); };
ACT.changeWp = () => confirmDlg({ title: 'Change your workplace?', ok: 'Continue', body: `<div class="note b-amber">${ic('alert')}<div>Permission must be granted again by your new workplace before any observations can take place there. Proposed observations at ${esc(W.workplace.name)} will be cancelled.</div></div><p class="small">Your current workplace and its consent stay in your history (read-only).</p>`, onOk: () => { const w = W.workplace; w.history.unshift({ name: w.name, from: '20 Feb 2026', to: fd(now().toISOString()), perm: w.perm === 'Granted' ? 'Granted' : w.perm, by: w.grantedBy }); setUi('wpEdit', true); setUi('wpBlank', true); render(); } });
SUBMIT.wpSave = () => {
  const name = $('#wp-name').value.trim(), em = $('#wp-ce').value.trim();
  if (!name) return fieldErr('#wp-name', 'Enter the care home or employer name');
  if (!/^\S+@\S+\.\S+$/.test(em)) return fieldErr('#wp-ce', 'Enter a valid email address, like name@carehome.co.uk');
  Object.assign(W.workplace, { name, address: $('#wp-addr').value, postcode: $('#wp-pc').value, ctitle: $('#wp-ct').value, cname: $('#wp-cn').value, cemail: em, cphone: $('#wp-cp').value, role: $('#wp-role').value, shift: $('#wp-shift').value, perm: 'Permission Pending', sent: now().toISOString(), expiry: D(14), reminder: null });
  setUi('wpEdit', false); setUi('wpBlank', false); render(); toast(`Permission request emailed to ${esc(W.workplace.cname || em)}.`);
};
ACT.resendPerm = () => { Object.assign(W.workplace, { perm: 'Permission Pending', sent: now().toISOString(), expiry: D(14) }); render(); toast('Permission link resent. It expires in 14 days.'); };
ACT.viewConsent = () => openModal({ title: 'Workplace consent', size: 'lg', body: `<div class="viewer"><div class="v-tb">${ic('doc', 15)} consent_${W.workplace.name.split(' ')[0].toLowerCase()}.pdf</div><div class="pdf-pages"><div class="pdf-page"><strong>Consent to workplace observation</strong><p>I, ${esc(W.workplace.grantedBy)}, ${esc(W.workplace.ctitle)} at ${esc(W.workplace.name)}, give permission for Illumin Academy assessors to observe ${esc(W.me.first + ' ' + W.me.last)} at work for the purposes of their qualification.</p>${Array.from({ length: 8 }, (_, i) => `<div class="ln" style="width:${70 + i * 3 % 30}%"></div>`).join('')}<p>Signed electronically ${fdt(W.workplace.grantedAt)}</p></div></div></div>`, actions: [{ label: 'Close', cls: 'btn-primary' }] });

function obsList() {
  const list = [...W.observations].sort((a, b) => new Date(b.at) - new Date(a.at));
  return `${W.workplace.perm !== 'Granted' ? `<div class="note b-amber">${ic('info')}<div>Observations at your workplace can only go ahead once your workplace has granted permission (current status: ${W.workplace.perm.toLowerCase()}). Observations at the Academy office don't need it. <button class="linklike" data-go="observations" data-tab="workplace">Workplace details</button></div></div>` : ''}
  <div class="stack">${list.map(o => {
    let acts = '';
    if (o.status === 'Proposed') acts = o.alt ? `<div class="note b-amber" style="padding:8px 10px">${ic('clock', 16)}<span class="small">Alternative requested — waiting for your assessor.</span></div>` : `<div class="row"><button class="btn btn-sm btn-primary" data-act="obsAccept" data-id="${o.id}">${o.locType === 'office' ? 'Accept' : 'Accept on behalf of workplace'}</button><button class="btn btn-sm" data-act="obsAlt" data-id="${o.id}">Request alternative date</button></div>${o.locType === 'office' ? '<p class="xs muted">This observation is at the Academy office, so your workplace doesn\'t need to agree.</p>' : '<p class="xs muted">Your workplace manager may also respond — the first response counts.</p>'}`;
    if (o.status === 'Confirmed') acts = `<p class="small">${ic('cal', 14)} Added to your calendar.</p><button class="btn btn-sm" data-act="compose" data-to="${esc(o.assessor)} (Assessor)" data-sub="Workplace objection — observation ${fd(o.at)}">Workplace has objected — message assessor</button>`;
    if (o.status === 'Cancelled') acts = `<div class="reason"><span class="r-t">Cancelled</span><span>${esc(o.reason)}</span></div>`;
    if (o.status === 'Rescheduled') acts = `<p class="small"><span class="strike">${fdt(o.at)}</span> → <strong>${fdt(o.newAt)}</strong><br><span class="muted">${esc(o.reason)}</span></p>`;
    if (o.status === 'Completed') acts = `<div class="row"><button class="btn btn-sm btn-primary" data-act="obsReport" data-id="${o.id}">View observation report</button>${o.ack ? chip('Acknowledged', 'green') : ''}</div>`;
    return `<article class="card"><div class="row-b"><div class="stack" style="gap:2px"><h3>${fdl(o.at)}, ${ft(o.at)}</h3><span class="small muted">${ic('map', 13)} ${esc(o.loc)} · Assessor ${esc(o.assessor)}</span>${o.locType === 'office' ? `<span>${chip('At the Academy office', 'blue')} ${c2s('Academy office address')}</span>` : ''}</div>${chip(o.status)}</div><p class="small"><span class="muted">Scope:</span> ${esc(o.scope)}</p>${acts}</article>`;
  }).join('')}</div>`;
}
ACT.obsAccept = el => { const o = W.observations.find(x => x.id === el.dataset.id); confirmDlg({ title: 'Accept this observation?', ok: 'Accept', body: `<p>${fdt(o.at)} at ${esc(o.loc)}.</p><p class="small muted">${o.locType === 'office' ? 'This observation is at the Academy office — no workplace agreement is needed.' : 'Accept only if your workplace has agreed to this date.'}</p>`, onOk: () => { o.status = 'Confirmed'; W.events.push({ id: 'eo' + o.id + 'c', type: 'obs', title: 'Observation (confirmed)', start: o.at, end: new Date(new Date(o.at).getTime() + 7200e3).toISOString(), course: W.nvq.title, loc: o.loc, go: 'observations' }); W.events = W.events.filter(e => e.id !== 'eo' + o.id); render(); toast('Observation confirmed and added to your calendar.'); } }); };
ACT.obsAlt = el => { const o = W.observations.find(x => x.id === el.dataset.id); altDateModal('Request alternative observation date', () => { o.alt = true; render(); toast('Alternative date request sent to ' + o.assessor + '.'); }, `<p class="small">Currently proposed: <strong>${fdt(o.at)}</strong></p>`); };
ACT.obsReport = el => {
  const o = W.observations.find(x => x.id === el.dataset.id), r = o.report;
  const tbl = (rows) => `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Criterion</th><th>Observed</th><th>Competent</th><th>Assessor comment</th></tr></thead><tbody>${rows.map(([c, d, ob, cp, cm]) => `<tr><td><span class="code">${c}</span><div class="xs muted">${esc(d)}</div></td><td>${chip(ob ? 'Observed' : 'Not Yet Observed')}</td><td>${chip(cp ? 'Competent' : 'Not Yet Competent')}</td><td class="small">${esc(cm)}</td></tr>`).join('')}</tbody></table></div>`;
  openModal({ title: 'Observation report', sub: `${fdl(o.at)} · ${esc(o.loc)}`, size: 'xl',
    body: `${o.postEntered ? `<p>${chip('Post-entered on ' + fd(o.postEntered), 'amber')} <span class="small muted">Recorded offline and entered afterwards.</span></p>` : ''}<h3>NVQ criteria</h3>${tbl(r.nvq)}${r.ia.length ? `<h3>Illumin Academy criteria</h3>${tbl(r.ia)}` : ''}<h3>Overall notes</h3><p>${esc(r.notes)}</p>${typeof obsEvidence === 'function' ? obsEvidence(r) : ''}<p class="small">Signed off by <strong>${esc(o.assessor)}</strong> · ${fdt(o.signed)}</p>${r.followUp ? `<div class="note b-blue">${ic('cal')}<div class="small">Follow-up observation scheduled: ${fdt(W.observations.find(x => x.id === r.followUp).at)} (${W.observations.find(x => x.id === r.followUp).status.toLowerCase()}).</div></div>` : ''}`,
    actions: [{ label: 'Download PDF', cls: 'btn', fn: () => { toast('Observation report downloaded (simulated).'); return false; } }, { label: o.ack ? 'Acknowledged ✓' : 'Acknowledge (optional)', cls: 'btn-primary', disabled: o.ack, fn: () => { o.ack = true; render(); toast('Thanks — you\'ve acknowledged this report.'); } }] });
};
