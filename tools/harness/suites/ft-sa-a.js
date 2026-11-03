// SA-FINAL A — refund integrity (SA-11), offline payment (SA-06) and the finance Lows (#14, #20, #22). suites.sh runs it with
// FIXTURE=client. Phase 0: the client demo (Amira, Dev, Lena, Sam, Tom) through the real screens; phase 1: a real refresh, Reset demo,
// then the legacy fixture (Pending TXN-60165, Failed rows, the seeded partly refunded TXN-60217, seeded deposits and duplicates).
// Expected money is worked out here in pence, never read back from the code under test.
(async function () {
  const SS = window.sessionStorage, PH = +(SS.getItem('ft-sa-a.phase') || 0);
  const R = JSON.parse(SS.getItem('ft-sa-a.R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const primBtn = () => $1('#modal-root .modal-f .btn-primary');
  const submit = sel => { const f = $1(sel); if (!f) throw new Error('missing form ' + sel); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const pick = p => { signOutUI(); if (!$1('#app .dr-signin')) { S.signedIn = false; S.auth = 'signin'; render(); } click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); if ($1('.otp-i')) { $a('.otp-i').forEach((i, k) => { i.value = '123456'[k]; }); submit('form[data-submit="tfaCode"]'); } S.ui = {}; };
  const FA = (av = 'FA') => { closeModal(); setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const SA = () => { closeModal(); setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; S.ui = {}; };
  const role = r => { closeModal(); ACT.switchRole({ dataset: { r } }); S.signedIn = true; S.ui = {}; };
  const ACA = () => { closeModal(); acaEnter('KA'); S.signedIn = true; S.ui = {}; };
  const AGY = id => { closeModal(); agyEnter(id, true); };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const mtxt = () => ($1('#modal-root') ? $1('#modal-root').textContent.replace(/\s+/g, ' ') : '');
  const next = ph => { SS.setItem('ft-sa-a.R', J(R)); SS.setItem('ft-sa-a.phase', String(ph)); location.reload(); };
  const type = (sel, v, ev = 'input') => { const e = $1(sel); if (!e) throw new Error('missing ' + sel); e.value = v; e.dispatchEvent(new Event(ev, { bubbles: true })); };
  const choose = (sel, v) => { const e = $1(sel); if (!e) throw new Error('missing ' + sel); if (e.type === 'radio') e.checked = true; else e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); };
  const P = x => Math.round(x * 100), G = p => money(p / 100, 'GBP');
  const sec = () => ADMIN.security.length, lastAud = () => ADMIN.audit[0] || {};
  const Q = () => ADMIN.queue.filter(i => i.type === 'Refund');
  const rfd = () => allTx().filter(t => t.refund).length;
  const tx = (ref, payer) => allTx().find(t => t.ref === ref && t.payer === payer && !t.refund);
  // Direct calls as people who may not record payments or raise refunds
  const OUTSIDERS = [['Academic Admin', ACA], ['Business Admin', () => role('bizA')], ['Coordinator', () => { pick('coord1'); }], ['Agency', () => AGY('AG-02')]];

  if (PH === 0) {
    const CD = k => STORE.worlds[k], lid = k => CD(k).me.id;
    const amira0 = J(CD('CD1').plans.map(p => p.rows.map(r => [r.n, r.status, r.paid]))), amTx0 = CD('CD1').tx.length;

    /* ================= SA-06 offline payment ================= */
    await T('SA06-1 from a learner who owes nothing (Lena): no other learner\'s item', async () => {
      pick('super'); go('a-learner', { id: lid('CD3'), tab: 'payments' });
      click($1('main [data-act="offlinePay"]'));
      ok('SA06-1 Lena (nothing due): "Nothing is due" with her name and ID; no item list is offered', !!MODAL && /Nothing is due for Lena Hart/.test(mtxt()) && mtxt().includes(lid('CD3')) && !$1('#modal-root #op-t') && !/Amira/.test(mtxt()), mtxt().slice(0, 200));
      click(primBtn());
      ok('SA06-1 nothing recorded on Amira (the audit\'s wrong-learner payment)', J(CD('CD1').plans.map(p => p.rows.map(r => [r.n, r.status, r.paid]))) === amira0 && CD('CD1').tx.length === amTx0);
    });
    let rcv = '';
    await T('SA06-2 from Amira\'s page: bound to Amira, item chosen explicitly, date and note saved', async () => {
      pick('super'); go('a-learner', { id: lid('CD1'), tab: 'payments' }); click($1('main [data-act="offlinePay"]'));
      const opts = $a('#modal-root #op-t option').map(o => o.value).filter(Boolean);
      ok('SA06-2 the dialog names Amira and her learner ID and lists only her items', /Payer: Amira Shah/.test(mtxt()) && mtxt().includes(lid('CD1')) && opts.length >= 1 && opts.every(k => k.startsWith('CD1|')), J(opts));
      ok('SA06-2 no item is preselected (Choose…)', $1('#modal-root #op-t').value === '' && $1('#op-a').value === '');
      $1('#rsn').value = 'Paid at reception'; const n0 = CD('CD1').tx.length; click(primBtn());
      ok('SA06-2 Confirm without an item is refused; dialog stays open; nothing recorded', !!MODAL && CD('CD1').tx.length === n0 && /Choose what the payment is for/.test(mtxt()));
      choose('#op-t', 'CD1|nvq|2'); ok('SA06-2 choosing the item fills its amount (£300.00)', P(+$1('#op-a').value) === 30000, $1('#op-a').value);
      rcv = D(-3).slice(0, 10); $1('#op-d').value = D(2).slice(0, 10); click(primBtn());
      ok('SA06-2 a date received in the future is refused', !!MODAL && CD('CD1').tx.length === n0 && /can't be in the future/.test(mtxt()));
      $1('#op-d').value = rcv; $1('#op-n').value = 'Cash handed in at the office'; $1('#op-r').value = 'BACS-SAA01'; click(primBtn());
      const t = CD('CD1').tx.find(x => x.ref === 'BACS-SAA01'), row = CD('CD1').plans.find(p => p.e === 'nvq').rows.find(r => r.n === 2);
      ok('SA06-2 recorded on Amira: instalment 2 Paid, £300.00, receipt', !MODAL && !!t && P(t.amount) === 30000 && row.status === 'Paid' && /^RCP-/.test(row.receipt || ''), J(t));
      ok('SA06-2 Date received and Note are saved on the payment', t && t.dateReceived === rcv && t.note === 'Cash handed in at the office', J(t && [t.dateReceived, t.note]));
      const au = ADMIN.audit.find(a => a.action === 'Recorded offline payment' && a.entity === 'BACS-SAA01');
      ok('SA06-2 audit "Recorded offline payment": before/after kept, reason carries the date and note', !!au && /due$/.test(au.before) && /paid$/.test(au.after) && /Paid at reception · Date received .* · Note: Cash handed in at the office/.test(au.reason), au && J([au.before, au.after, au.reason]));
      go('f-ledger'); const lr = $a('main table tbody tr').find(tr => tr.textContent.includes('BACS-SAA01'));
      ok('SA06-2 the ledger row shows the date received and the note', !!lr && /Received \d/.test(lr.textContent) && /Cash handed in/.test(lr.textContent), lr && lr.textContent.replace(/\s+/g, ' ').slice(0, 200));
      ACT.txOpen({ dataset: { r: 'BACS-SAA01', p: VNAME('CD1') } }); ok('SA06-2 the transaction shows Date received and the note', /Date received/.test(mtxt()) && /Recorded with the payment: Cash handed in/.test(mtxt())); closeModal();
      SS.setItem('ft-sa-a.rcv', rcv);
    });
    await T('SA06-3 from a list: payer first, then only that payer\'s items', async () => {
      pick('fin'); go('f-ledger'); click($1('main [data-act="finOffline"]'));
      ok('SA06-3 Finance → Ledger → Record offline payment asks for the payer; no item list yet', !!MODAL && /choose the payer/.test(MODAL.title) && !$1('#modal-root #op-t') && !primBtn(), MODAL && MODAL.title);
      type('#saa-op-q', 'sam'); const btns = $a('#modal-root [data-act="saaOpPayer"]');
      ok('SA06-3 search narrows the payers (Sam Turner only)', btns.length === 1 && /Sam/.test(btns[0].textContent), btns.map(b => b.textContent).join(' | '));
      click(btns[0]); const opts = $a('#modal-root #op-t option').map(o => o.value).filter(Boolean);
      ok('SA06-3 bound to Sam: only Sam\'s items, nothing preselected', /Payer: Sam/.test(mtxt()) && opts.length > 0 && opts.every(k => k.startsWith('CD4|')) && ($1('#modal-root #op-t').value === '' || opts.length === 1), J(opts));
      ok('SA06-3 "Change payer" goes back to the list', !!$1('#modal-root [data-act="finOffline"]')); click($1('#modal-root [data-act="finOffline"]')); ok('SA06-3 back at the payer list', /choose the payer/.test(MODAL.title)); closeModal();
      go('f-learner', { id: lid('CD4'), tab: 'payments' }); click($1('main [data-act="offlinePay"]'));
      ok('SA06-3 Finance learner page → Record offline payment is bound to that learner', /Payer: Sam/.test(mtxt()) && $a('#modal-root #op-t option').map(o => o.value).filter(Boolean).every(k => k.startsWith('CD4|'))); closeModal();
    });
    await T('SA06-4 a row button keeps its item, scoped to its payer; a forged other-payer key is refused', async () => {
      FA(); const k = payTargets().find(t => t.key.startsWith('CD2|')).key; ACT.finOffline({ dataset: { k } });
      ok('SA06-4 a row\'s Record payment preselects that item and lists only that payer\'s items', $1('#modal-root #op-t').value === k && $a('#modal-root #op-t option').every(o => o.value.startsWith('CD2|')));
      const other = payTargets().find(t => t.key.startsWith('CD4|')).key, sel = $1('#modal-root #op-t'); sel.insertAdjacentHTML('beforeend', `<option value="${other}">forged</option>`); sel.value = other; $1('#rsn').value = 'forged'; const n0 = CD('CD4').tx.length; click(primBtn());
      ok('SA06-4 a forged option for another payer is refused and logged; nothing recorded on Sam', CD('CD4').tx.length === n0 && /Blocked: payment against another payer/.test(lastAud().action), lastAud().action); closeModal();
    });
    await T('SA06-5 unauthorized direct calls', async () => {
      for (const [n, as] of OUTSIDERS) { as(); const s0 = sec(), n0 = CD('CD1').tx.length; ACT.offlinePay({ dataset: { l: lid('CD1') } }); const m1 = !!MODAL; closeModal(); ACT.finOffline({ dataset: {} }); const m2 = !!MODAL; closeModal(); ACT.finOffline({ dataset: { payer: 'l:' + lid('CD1') } }); const m3 = !!MODAL; closeModal();
        ok(`SA06-5 ${n}: offlinePay / finOffline refused in the handler (no dialog, logged)`, !m1 && !m2 && !m3 && sec() >= s0 + 3 && CD('CD1').tx.length === n0, J([m1, m2, m3, sec() - s0])); }
    });

    /* ================= SA-11 refunds ================= */
    let rq = '';
    await T('SA11-1 Finance: learner-first Raise refund through the screens', async () => {
      pick('fin'); go('f-refunds'); ok('SA11-1 Refunds explains requested → approved → processed and that no money is returned', /Requested → approved → processed/.test(main()) && /does not return any money/.test(main()));
      click($1('main [data-act="finRaise"]')); const all = $a('#modal-root [data-act="saaRfPayer"]').length;
      ok('SA11-1 step 1: choose the payer — every payer in the ledger is listed, no item list yet', /choose the payer/.test(MODAL.title) && all === new Set(allTx().map(t => t.payer)).size && !$1('#modal-root input[name="saa-rf-t"]'), all + ' payers');
      type('#saa-rf-q', 'amira'); const b = $a('#modal-root [data-act="saaRfPayer"]'); ok('SA11-1 search finds Amira', b.length === 1 && /Amira/.test(b[0].textContent), b.map(x => x.textContent).join('|'));
      click(b[0]); const rows = $a('#modal-root table.saa-hist tbody tr'), mine = allTx().filter(t => t.payer === VNAME('CD1') && !t.refund);
      ok('SA11-1 step 2: Amira\'s payment history — every payment, with status, refunded and left to refund', rows.length === mine.length && mine.every(t => mtxt().includes(t.ref)) && /Paid \(collected\)/.test(mtxt()) && /Left to refund/.test(mtxt()), rows.length + ' rows');
      const t = mine.find(x => x.ref !== 'BACS-SAA01' && x.status === 'Paid'), k = mine.indexOf(t);
      ok('SA11-1 step 2: the paid payment can be chosen and shows its remainder', !!$1(`#modal-root #saa-rf-${k}`) && !$1(`#modal-root #saa-rf-${k}`).disabled);
      choose(`#saa-rf-${k}`); ok('SA11-1 choosing it shows the limit and fills the remainder', /Up to £300\.00/.test(mtxt()) && P(+$1('#saa-rf-a').value) === P(t.amount));
      $1('#saa-rf-a').value = '400'; $1('#saa-rf-d').value = 'Withdrew in week one'; click(primBtn()); ok('SA11-1 more than is left to refund is refused', /exceeds what is left to refund/.test(mtxt()) && /^Raise refund/.test(MODAL.title));
      $1('#saa-rf-a').value = '120'; const q0 = Q().length; click(primBtn());
      ok('SA11-1 step 3: a summary — collected, this refund, left after, approver, no money returned', /^Confirm refund/.test(MODAL.title) && mtxt().includes('£300.00') && mtxt().includes('£120.00') && mtxt().includes('£180.00') && /sent to Mark Bennett for approval/.test(mtxt()) && /does not return any money/.test(mtxt()) && Q().length === q0);
      const a = MODAL.actions.find(x => x.cls === 'btn-primary'); click(primBtn()); const it = Q()[0];
      ok('SA11-1 confirmed: one refund request, Pending, for Mark Bennett; nothing processed', Q().length === q0 + 1 && it.status === 'Pending' && it.first === 'Mark Bennett' && P(it.amount) === 12000 && !it.processed && it.data.tx === t.ref, it && J([it.id, it.status, it.first, it.amount]));
      a.fn(); a.fn(); ok('SA11-1 replaying the confirm (double click) raises nothing more', Q().length === q0 + 1);
      ok('SA11-1 the open request holds its amount: £180.00 left', P(refundable(tx(t.ref, t.payer))) === 18000);
      rq = it.id; SS.setItem('ft-sa-a.rq', rq);
      const s0 = sec(); applyDecision(it, 'approve', 'self'); ok('SA11-1 the raiser can\'t approve it (G4)', it.status === 'Pending');
    });
    await T('SA11-2 learner Payments tabs reach the same flow', async () => {
      pick('fin'); go('f-learner', { id: lid('CD2'), tab: 'payments' }); click($1('main [data-act="finRaise"]'));
      ok('SA11-2 Finance learner page → Raise refund opens Dev\'s payment history directly', /Raise refund — Dev Patel/.test(MODAL.title) && !!$1('#modal-root table.saa-hist'), MODAL && MODAL.title); closeModal();
      pick('super'); go('a-learner', { id: lid('CD4'), tab: 'payments' }); click($1('main [data-act="finRaise"]'));
      ok('SA11-2 Learner 360 → Payments → Raise refund opens Sam\'s history', /Raise refund — Sam/.test(MODAL.title)); closeModal();
      go('a-finance', { tab: 'refunds' }); const b = $1('main [data-act="raiseRefund"]'); if (b) { click(b); ok('SA11-2 the admin console\'s Raise refund is the same learner-first flow (no 40-item list)', /choose the payer/.test(MODAL.title) && !$1('#modal-root #rr-t')); closeModal(); } else ok('SA11-2 admin console Raise refund button', false);
    });
    await T('SA11-3 Super Administrator: processed at once, and the form says so (#20)', async () => {
      pick('super'); const t = allTx().find(x => x.payer === VNAME('CD4') && x.status === 'Paid' && !x.refund);
      raiseRefund(t); ok('#20 the Super Administrator\'s refund form says it is processed immediately (not "Will be sent to")', /Processed immediately \(Super Administrator\)/.test(mtxt()) && !/Will be sent to/.test(mtxt()) && /Process refund now/.test(primBtn().textContent)); closeModal();
      ACT.finRaise({ dataset: { l: lid('CD4') } }); const mine = allTx().filter(x => x.payer === VNAME('CD4') && !x.refund), k = mine.findIndex(x => x.ref === t.ref);
      choose(`#saa-rf-${k}`); $1('#saa-rf-a').value = '50'; $1('#saa-rf-d').value = 'Goodwill — SA test'; click(primBtn());
      ok('SA11-3 summary: processed immediately, no second approval', /Processed immediately \(Super Administrator\)/.test(mtxt()) && /Process refund now/.test(primBtn().textContent));
      const r0 = rfd(), q0 = Q().length; click(primBtn()); const it = Q()[0];
      ok('SA11-3 processed at once: Approved, refund transaction recorded once', Q().length === q0 + 1 && it.status === 'Approved' && !!it.processed && rfd() === r0 + 1, it && J([it.status, it.first]));
      ok('SA11-3 Sam\'s payment now shows the remainder (£150.00 of £200.00)', P(refundable(tx(t.ref, t.payer))) === P(t.amount) - 5000);
    });
    await T('SA11-4 Finance Admin B approves the request: processed once', async () => {
      FA('FB'); const it = ADMIN.queue.find(i => i.id === rq), r0 = rfd(); applyDecision(it, 'approve', 'Approved by B');
      ok('SA11-4 approved by the other Finance Admin and processed once', it.status === 'Approved' && !!it.processed && rfd() === r0 + 1); const p0 = it.processed; refundEffect(it); ok('SA11-4 a second processing does nothing', it.processed === p0 && rfd() === r0 + 1);
    });
    await T('SA11-5 unauthorized direct calls', async () => {
      const t = allTx().find(x => x.payer === VNAME('CD1') && x.status === 'Paid' && !x.refund);
      for (const [n, as] of OUTSIDERS) { as(); const s0 = sec(), q0 = Q().length; ACT.finRaise({}); const m1 = !!MODAL; closeModal(); ACT.finRaise({ dataset: { l: lid('CD1') } }); const m2 = !!MODAL; closeModal(); raiseRefund(t); const m3 = !!MODAL; closeModal(); ACT.raiseRefund(); const m4 = !!MODAL; closeModal(); ACT.saaRfPayer({ dataset: { p: t.payer } }); const m5 = !!MODAL; closeModal();
        ok(`SA11-5 ${n}: every Raise refund entry is refused in the handler (no dialog, logged)`, ![m1, m2, m3, m4, m5].some(Boolean) && sec() >= s0 + 4 && Q().length === q0, J([m1, m2, m3, m4, m5, sec() - s0])); }
      ACA(); const it = newRefund(t, 1, 'Other', 'forged', 'Retain access'); it.raisedBy = 'Someone'; ADMIN.queue.unshift(it); const s0 = sec(); applyDecision(it, 'approve', 'x');
      ok('SA11-5 an Academic Admin\'s direct approval is refused', it.status === 'Pending' && sec() > s0); ADMIN.queue.splice(ADMIN.queue.indexOf(it), 1);
    });
    signOutUI(); next(1); return;
  }

  if (PH === 1) {
    await T('SA refresh: the payment\'s date and note and the refund request survive a real refresh', async () => {
      const rcv = SS.getItem('ft-sa-a.rcv'), t = STORE.worlds.CD1.tx.find(x => x.ref === 'BACS-SAA01'), it = ADMIN.queue.find(i => i.id === SS.getItem('ft-sa-a.rq'));
      ok('SA refresh: Date received and Note kept', !!t && t.dateReceived === rcv && t.note === 'Cash handed in at the office', J(t && [t.dateReceived, t.note]));
      ok('SA refresh: the approved refund is still processed once', !!it && it.status === 'Approved' && !!it.processed);
    });
    await T('SA Reset demo', async () => {
      signOutUI(); ACT.resetDemo();
      ok('SA Reset: the test payment and refunds are gone; Amira\'s instalment 2 is due again', !STORE.worlds.CD1.tx.some(x => x.ref === 'BACS-SAA01') && !ADMIN.queue.some(i => i.id === SS.getItem('ft-sa-a.rq') && i.processed) && STORE.worlds.CD1.plans.find(p => p.e === 'nvq').rows.find(r => r.n === 2).status !== 'Paid');
    });

    /* ================= Legacy fixture ================= */
    fxLoadLegacy();
    const legacyTx = (ref, st) => allTx().find(t => t.ref === ref && !t.refund && (!st || t.status === st));
    await T('L-#1 Pending TXN-60165: refused at every refund boundary', async () => {
      SA(); const t = legacyTx('TXN-60165'); ok('L (setup) TXN-60165 is Pending', !!t && t.status === 'Pending', t && J([t.payer, t.amount, t.status]));
      if (!t) return; const q0 = Q().length, r0 = rfd(); raiseRefund(t);
      ok('L-#1 Super raiseRefund(Pending TXN-60165): no form, no refund, no RFD row; refusal logged', !MODAL && Q().length === q0 && rfd() === r0 && lastAud().action === 'Blocked: refund of a payment that was not collected' && /not collected/.test(lastAud().reason), J([lastAud().action, lastAud().reason]));
      ok('L-#1 its refundable remainder is £0.00', refundable(t) === 0);
      const it = newRefund(t, t.amount, 'Other', 'forged pending', 'Retain access'); ADMIN.queue.unshift(it); saApply(it, 'forged');
      ok('L-#1 saApply of a forged item for it is refused (not Approved, nothing processed)', it.status === 'Pending' && !it.processed && rfd() === r0);
      FA('FB'); applyDecision(it, 'approve', 'B approves'); ok('L-#1 a Finance Admin\'s approval of it is refused', it.status === 'Pending' && !it.processed && rfd() === r0 && /not collected/.test(lastAud().reason));
      ADMIN.queue.splice(ADMIN.queue.indexOf(it), 1);
    });
    await T('L-#1 Failed payments: refused by raise and approval', async () => {
      FA(); const f = allTx().filter(t => t.status === 'Failed' && !t.refund); ok('L (setup) Failed payments exist', f.length > 0, f.length);
      const q0 = Q().length, r0 = rfd(); f.slice(0, 3).forEach(t => { raiseRefund(t); closeModal(); }); ok('L-#1 raiseRefund of Failed payments: nothing raised', Q().length === q0 && rfd() === r0);
      const t = legacyTx('TXN-60308') || f[0], it = newRefund(t, t.amount, 'Other', 'forged failed', 'Retain access'); ADMIN.queue.unshift(it); FA('FB'); applyDecision(it, 'approve', 'x');
      ok('L-#1 approving a refund of Failed ' + t.ref + ' is refused (the audit\'s accepted approval)', it.status === 'Pending' && !it.processed && rfd() === r0, t.status); ADMIN.queue.splice(ADMIN.queue.indexOf(it), 1);
      const rf = allTx().find(t => t.status === 'Refunded' && !t.refund && !allTx().some(y => y.refund && fiOrigOf(y) === t.ref && y.payer === t.payer)); raiseRefund(rf); ok('L-#1 a payment already refunded in full is refused', !MODAL && /already refunded in full/.test(lastAud().reason));
    });
    await T('L-#5 seeded partly refunded TXN-60217 fails closed', async () => {
      FA(); const t = legacyTx('TXN-60217', 'Partially refunded'); ok('L (setup) TXN-60217 Partially refunded, no refund record', !!t && !allTx().some(y => y.refund && fiOrigOf(y) === t.ref), t && J([t.payer, t.amount]));
      if (!t) return; const q0 = Q().length; ok('L-#5 refundable is £0.00 (was the full £35.00)', refundable(t) === 0);
      raiseRefund(t); ok('L-#5 raiseRefund refused with the reason (earlier refund has no record); nothing raised', !MODAL && Q().length === q0 && /earlier refund has no record/.test(lastAud().reason));
      go('f-refunds'); click($1('main [data-act="finRaise"]')); type('#saa-rf-q', t.payer); click($a('#modal-root [data-act="saaRfPayer"]').find(b => b.dataset.p === t.payer));
      const mine = allTx().filter(x => x.payer === t.payer && !x.refund), k = mine.indexOf(t), r = $1(`#modal-root #saa-rf-${k}`);
      ok('L-#5 in ' + t.payer + '\'s history it is disabled, refunded "Unknown — not recorded", with the reason', !!r && r.disabled && /Unknown — not recorded/.test(r.closest('tr').textContent) && /earlier refund has no record/.test(r.closest('tr').textContent), r && r.closest('tr').textContent.replace(/\s+/g, ' '));
      const pend = mine.find(x => x.status === 'Pending'); if (pend) ok('L-#5 a Pending payment in the history is disabled with its reason', $1(`#modal-root #saa-rf-${mine.indexOf(pend)}`).disabled);
      closeModal(); ACT.txOpen({ dataset: { r: t.ref, p: t.payer } }); ok('L-#5 the transaction offers no Raise refund and says why', !MODAL.actions.some(a => a.label === 'Raise refund') && /Not refundable/.test(mtxt())); closeModal();
      const it = newRefund(t, 1, 'Other', 'forged', 'Retain access'); ADMIN.queue.unshift(it); FA('FB'); applyDecision(it, 'approve', 'x'); ok('L-#5 approving a refund of it is refused', it.status === 'Pending' && !it.processed); ADMIN.queue.splice(ADMIN.queue.indexOf(it), 1);
    });
    await T('L preserved: Paid refunds, deposits, duplicates, every payer listed', async () => {
      FA(); go('f-refunds'); click($1('main [data-act="finRaise"]')); const n = $a('#modal-root [data-act="saaRfPayer"]').length, payers = new Set(allTx().map(t => t.payer)).size;
      ok('L the payer list has every payer in the ledger (no 40 cap)', n === payers && allTx().filter(t => !t.refund).length > 40, n + ' / ' + payers); closeModal();
      const p = allTx().find(t => t.status === 'Paid' && !t.refund && t.payerType !== 'Agency' && !fiObsFeeTx(t) && refundable(t) > 0); raiseRefund(p); ok('L a Paid payment still opens the refund form with its remainder', !!$1('#modal-root #rr-a') && P(+$1('#rr-a').value) === P(refundable(p))); closeModal();
      const d = STORE.fin.deposits.find(x => x.status === 'Seat held'); ACT.depRefund({ dataset: { id: d.id } }); ok('L a seeded deposit refund still opens (FP/DP)', !!$1('#modal-root #rr-a'), d.id); closeModal();
      const du = STORE.fin.dups.find(x => x.id === 'DUP-2'); ACT.dupRefund({ dataset: { id: du.id } }); ok('L a duplicate-payment refund still opens (DUP-2)', !!$1('#modal-root #rr-a'), du.id + ' ' + J([lastAud().action, lastAud().reason])); closeModal();
      const d1 = STORE.fin.dups.find(x => x.id === 'DUP-1'), q0 = Q().length; ACT.dupRefund({ dataset: { id: d1.id } }); ok('L DUP-1 already has the seeded open request AQ-1013: a second refund is refused as a duplicate', !MODAL && Q().length === q0 && /Nothing is left to refund on TXN-79118/.test(lastAud().reason)); closeModal();
    });
    await T('L-#22 one refund rule for the ledger footer and the reports', async () => {
      FA(); go('f-ledger'); const f = $1('main .fc-led-foot'), L = fiLedger({});
      ok('L-#22 ledger footer refunded = reports refunded (all dates)', !!f && +f.dataset.refunded === L.refunded, f && J([f.dataset.refunded, L.refunded]));
      ok('L-#22 the unrecorded part refunds are reported as unknown in both', !!f && +f.dataset.unknown === L.unknown && L.unknown > 0 && /amount is unknown and not counted/.test(f.textContent), f && J([f.dataset.unknown, L.unknown]));
    });
    await T('L-#2 wrong learner (legacy): from Priya Raman\'s page', async () => {
      SA(); const pr = allLearners().find(l => l.name === 'Priya Raman'), aisha = J(STORE.worlds.A.plans.map(p => p.rows.map(r => [r.n, r.status, r.paid])));
      go('a-learner', { id: pr.id, tab: 'payments' }); const b = $1('main [data-act="offlinePay"]'); click(b);
      const opts = $a('#modal-root #op-t option').map(o => o.value).filter(Boolean), mine = payTargets().filter(t => saaPayer(t).k === 'l:' + pr.id).map(t => t.key);
      ok('L-#2 Priya\'s dialog lists only her items, or says nothing is due', (/Nothing is due for Priya Raman/.test(mtxt()) && !opts.length && !mine.length) || (opts.length && J(opts.sort()) === J(mine.sort())), J(opts));
      if (primBtn() && $1('#modal-root #op-t')) { $1('#rsn').value = 'x'; click(primBtn()); } closeModal();
      ok('L-#2 nothing recorded on Aisha Rahman', J(STORE.worlds.A.plans.map(p => p.rows.map(r => [r.n, r.status, r.paid]))) === aisha);
    });
    await T('L-#14 agency invoice payment: Date received kept, a future date refused', async () => {
      FA(); const i = (ADMIN.queue || []).find(x => x.stage === 'awaiting' && x.data && x.data.agency);
      ok('L-#14 (setup) an invoice is awaiting payment', !!i); if (!i) return;
      ACT.invPay({ dataset: { id: i.id } }); $1('#ip-d').value = '2999-01-01'; $1('#ip-r').value = 'BACS-SAAINV'; $1('#rsn').value = 'Received';
      const fut = primBtn(); click(fut);
      ok('L-#14 a future Date received is refused: dialog stays, nothing paid', !!MODAL && i.stage === 'awaiting' && !allTx().some(t => t.ref === 'BACS-SAAINV'));
      const past = D(-3).slice(0, 10); $1('#ip-d').value = past; click(primBtn()); const why = MODAL ? $a('#modal-root .field-err, #modal-root .err, #modal-root [role=alert]').map(e => e.textContent).join(' / ') || mtxt().slice(0, 300) : ''; closeModal();
      const t = (STORE.fin.tx || []).find(x => x.ref === 'BACS-SAAINV');
      ok('L-#14 the invoice payment keeps its Date received', i.stage === 'paid' && !!t && t.dateReceived === past, J([why, t && t.dateReceived, i.stage]));
    });
    SS.removeItem('ft-sa-a.phase'); SS.removeItem('ft-sa-a.R');
  }
  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
