// L3-B — Self-Paced submissions aren't blocked by the batch due date, client demo (suites.sh runs it with FIXTURE=client; a real reload,
// then Reset). The audit's reproduction (probe S21): Amira (Self-Paced) submits Assignment 2 two days after its batch due date by clicking;
// Sam (Self-Paced) submits two late assignments in one monthly period; Tom (Self-Paced) submits before the due date. Dev (Fully Assisted)
// is still refused. A Finance pause, a closed assignment and a learner's own resubmission deadline still block. The mode comes from the
// sign-up's frozen records: changing the live option or the programme version doesn't move it, and a pin that disagrees falls back to the
// Fully Assisted rule. Short courses are untouched. After a real refresh Amira submits the other late assignment.
(async function () {
  const SS = window.sessionStorage, K = 'ft-l3b.', PH = +(SS.getItem(K + 'phase') || 0);
  const R = JSON.parse(SS.getItem(K + 'R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = (el, what) => { if (!el) throw new Error('control not rendered: ' + (what || '')); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const reason = r => { const t = $1('#rsn'); if (t) t.value = r; return press(); };
  const as = p => { closeModal(); ACT.drAs({ dataset: { p } }); S.signedIn = true; S.auth = null; S.ui = {}; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const next = ph => { SS.setItem(K + 'R', J(R)); SS.setItem(K + 'phase', String(ph)); location.reload(); };
  let lastToast = ''; const _t = toast; toast = function (m) { lastToast = String(m); return _t.apply(this, arguments); };
  const at = iso => { CLOCK_SHIFT += new Date(iso).getTime() - now().getTime(); };
  const A = (v, id) => STORE.worlds[v].assignments.find(x => x.id === id);
  const since = a0 => ADMIN.audit.slice(0, ADMIN.audit.length - a0);
  // Submit through the page: type an answer, Review & Submit, Submit, the 15-second undo window
  const submitUI = id => { go('assignment', { id }); const b = $1('main .paper .rte-body'); if (b) { b.innerHTML = '<p>L3-B answer.</p>'; INP.rteInput(b); }
    fxFast(ff => { click($1('main [data-act="reviewSubmit"]'), 'Review & Submit ' + id); const s = $a('#modal-root [data-mi]').find(x => /^Submit$/.test(x.textContent.trim())); if (s) s.click(); ff(16500); }); closeModal(); };
  const AFTER = '2027-01-19T12:00:00Z'; // a10 due 13 Dec 2026, a11 due 17 Jan 2027 (the demo batch's deadlines)

  if (PH === 0) {
    await T('L3B-0 mode resolution from the sign-up records', async () => {
      const m = v => l3bModeOf(STORE.worlds[v]);
      ok('L3B-0a Amira, Sam and Tom: Self-Paced from the fee option fixed at sign-up', ['CD1', 'CD4', 'CD5'].every(v => m(v).mode === 'Self-Paced' && /NV-N1-FO-001, fixed at sign-up/.test(m(v).src)), J(['CD1', 'CD4', 'CD5'].map(m)));
      ok('L3B-0b Dev: Fully Assisted', m('CD2').mode === 'Fully Assisted');
      ok('L3B-0c Lena (short course only): no NVQ mode', m('CD3').mode === null);
    });

    await T('L3B-1 short courses are unaffected', async () => {
      as('short'); const e = W.enrolments.find(x => x.kind === 'short' && x.status === 'Active'), m = e && shMods(e).find(x => x.quiz && x.quiz.attempts.length < (x.quiz.max || 3));
      if (!e || !m) return ok('L3B-1 setup', false, 'no short-course quiz');
      const n0 = m.quiz.attempts.length; setUi('shMod-' + e.id, m.id); go('course', { id: e.id, tab: 'quiz' });
      for (let i = 0; i < 6 && !$1(`main [data-act="startQuiz"][data-id="${e.id}"]`); i++) { const c = $1('main [data-act="openItem"], main [data-act="scormFinish"]'); if (!c) break; c.click(); closeModal(); go('course', { id: e.id, tab: 'quiz' }); } // the module content first (the quiz opens after it)
      const b = $1(`main [data-act="startQuiz"][data-id="${e.id}"]`); if (b) { b.click(); const st = $a('#modal-root [data-mi]').find(x => /Start quiz/.test(x.textContent)); if (st) st.click(); }
      if (W.quiz) { W.quiz.ans = { 0: 0 }; finishQuiz(false); }
      ok('L3B-1 a short-course quiz starts and is recorded as before', m.quiz.attempts.length === n0 + 1, `${n0} → ${m.quiz.attempts.length} · btn ${!!b} · toast ${lastToast}`); W.quiz = null;
    });

    await T('L3B-2 Self-Paced before the batch due date (Tom): submits as before, nothing marked late', async () => {
      as('nvq-bank'); const a0 = ADMIN.audit.length; submitUI('a10');
      ok('L3B-2 Tom\'s a10 is Submitted; no "after the batch due date" record', A('CD5', 'a10').status === 'Submitted' && !since(a0).some(x => /after the batch due date/.test(x.action)), A('CD5', 'a10').status);
    });

    at(AFTER);

    await T('L3B-3 Fully Assisted after the due date (Dev): unchanged — refused', async () => {
      as('nvq-fa'); go('assignment', { id: 'a10' });
      ok('L3B-3a his page still says Deadline passed and No late submissions', /Deadline passed/.test(main()) && /No late submissions/.test(main()) && !/Past the batch due date/.test(main()));
      const a0 = ADMIN.audit.length; lastToast = ''; const r = ACT.reviewSubmit({ dataset: { id: 'a10' } });
      ok('L3B-3b ACT.reviewSubmit is refused with the deadline message and logged', r === false && /deadline has passed/.test(lastToast) && since(a0).some(x => x.action === 'Blocked: submit after the deadline'));
      ok('L3B-3c startUndo called directly is refused too; a10 stays Not Started', startUndo(A('CD2', 'a10'), false) === false && A('CD2', 'a10').status === 'Not Started');
      ok('L3B-3d his dashboard offers no past-due assignment as the next activity', cfNvqNext() === null);
    });

    await T('L3B-4 Self-Paced after the due date (Amira): the page and the action agree — she submits', async () => {
      as('nvq-sp'); go('assignment', { id: 'a11' });
      ok('L3B-4a the page says she can still submit, not "Deadline passed" / "No late submissions"', /Past the batch due date — as a Self-Paced learner you can still submit/.test(main()) && /the batch due date is a guide/.test(main()) && !/Deadline passed/.test(main()) && !/No late submissions/.test(main()));
      ok('L3B-4b Review & Submit is offered and her dashboard\'s next activity includes a past-due assignment', !!$1('main [data-act="reviewSubmit"]') && !!cfNvqNext());
      const t0 = now().getTime(), a0 = ADMIN.audit.length; submitUI('a11'); const a = A('CD1', 'a11');
      ok('L3B-4c a11 is Submitted (real clicks), two days after its batch due date', a.status === 'Submitted' && new Date(a.due) < new Date(a.submittedAt), `${a.status} · due ${a.due} · at ${a.submittedAt}`);
      ok('L3B-4d timed when she pressed Submit (the demo clock, not the due date)', Math.abs(new Date(a.submittedAt).getTime() - t0) < 60000 && a.timeline[0][1] === a.submittedAt);
      ok('L3B-4e recorded as submitted after the batch due date (Self-Paced)', since(a0).some(x => x.action === 'Submitted after the batch due date (Self-Paced)' && /Batch due date/.test(x.reason)));
    });

    await T('L3B-5 a Finance-paused Self-Paced learner (Sam) is still blocked', async () => {
      as('nvq-dep'); const lid = W.me.id; as('fin'); ACT.chPause({ dataset: { l: lid, e: 'nvq' } }); reason('L3B test');
      as('nvq-dep'); lastToast = ''; const r = ACT.reviewSubmit({ dataset: { id: 'a10' } });
      ok('L3B-5a refused by the access lock, not the deadline; a10 unchanged', r === false && /Access paused/.test(lastToast) && A('CD4', 'a10').status === 'Not Started', lastToast);
      go('assignment', { id: 'a10' }); ok('L3B-5b the page is locked (Access paused), no Submit', /Access paused/.test(main()) && !$1('main [data-act="reviewSubmit"]'));
      as('fin'); ACT.chRestore({ dataset: { l: lid, e: 'nvq' } }); reason('L3B restore'); ok('L3B-5c Finance restores access', !chPaused(lid, 'nvq'));
    });

    await T('L3B-6 still binding for Self-Paced: a closed assignment and the learner\'s own resubmission deadline', async () => {
      as('nvq-dep'); const a = A('CD4', 'a10'), b = A('CD4', 'a11');
      a.closed = true; lastToast = ''; const r1 = ACT.reviewSubmit({ dataset: { id: 'a10' } }); a.closed = false;
      ok('L3B-6a a closed assignment is refused', r1 === false && /deadline has passed/.test(lastToast) && a.status === 'Not Started');
      const keep = { status: b.status, resubDue: b.resubDue };
      Object.assign(b, { status: 'Resubmission Required', resubDue: '2027-01-18T20:59:00Z' }); const late = dLate(b);
      Object.assign(b, { resubDue: '2027-01-25T20:59:00Z' }); const open = !dLate(b); Object.assign(b, keep);
      ok('L3B-6b a resubmission deadline set for her binds when passed and not before', late && open);
    });

    await T('L3B-7 two Self-Paced submissions in one monthly period (Sam), in the Assessor\'s monthly worklist', async () => {
      as('nvq-dep'); submitUI('a10'); submitUI('a11'); const x = A('CD4', 'a10'), y = A('CD4', 'a11');
      ok('L3B-7a both late assignments are Submitted', x.status === 'Submitted' && y.status === 'Submitted', `${x.status} / ${y.status}`);
      ok('L3B-7b both fall in the same 15th → 14th period (15 Jan – 14 Feb), reviewed from 15 Feb', r4Cycle(x.submittedAt).key === '2027-01' && r4Cycle(y.submittedAt).key === '2027-01' && r4Cycle(x.submittedAt).review.slice(0, 10) === '2027-02-15');
      ok('L3B-7c the cycle boundary is unchanged: the 14th belongs to the previous period, the 15th starts the next', r4Cycle('2027-01-14T12:00:00Z').key === '2026-12' && r4Cycle('2027-01-15T12:00:00Z').key === '2027-01');
      closeModal(); ACT.demoSignInAsTas({ dataset: { v: 'S' } }); S.signedIn = true;
      const subs = chRaw(() => tasSubs(true)), mine = subs.filter(s => ['CD1', 'CD4'].includes(s.L.v) && s.status === 'Submitted');
      ok('L3B-7d the Assessor has the three late Self-Paced submissions to review, each in its monthly cycle', mine.length >= 3 && mine.every(s => r4IsSP(s) && /15 Jan/.test(r4CycleLbl(s))), J(mine.map(s => [s.L.v, s.a.id, r4CycleLbl(s)])));
    });

    await T('L3B-8 the mode is protected: live records and versions don\'t move it; a disagreeing pin falls back', async () => {
      const o = r1Opt('NV-N1-FO-001'), m0 = o.mode, pr = cbPr('NV-N1'), v0 = pr.version;
      try { o.mode = 'Fully Assisted'; pr.version = v0 + 1; ok('L3B-8a changing the live option\'s mode and the programme version leaves Amira Self-Paced', l3bModeOf(STORE.worlds.CD1).mode === 'Self-Paced'); }
      finally { o.mode = m0; pr.version = v0; }
      const w = STORE.worlds.CD2, p0 = w.signup.plan; // Dev, a10 still Not Started and past due
      w.signup.plan = Object.freeze({ ...p0, opt: Object.freeze({ ...p0.opt, mode: 'Self-Paced' }) }); // the option says Self-Paced, the approved terms say Fully Assisted
      try {
        const a0 = ADMIN.audit.length; l3bLogged.delete(w.me.id); as('nvq-fa'); lastToast = ''; const r = ACT.reviewSubmit({ dataset: { id: 'a10' } });
        ok('L3B-8b a pin that disagrees with its approved terms isn\'t treated as Self-Paced: refused, logged as unclear', l3bModeOf(w).conflict && r === false && /deadline has passed/.test(lastToast) && since(a0).some(x => /Delivery mode unclear/.test(x.action)), J([l3bModeOf(w), r, lastToast, since(a0).map(x => x.action)]));
      } finally { w.signup.plan = p0; }
    });

    closeModal(); if (S.signedIn && ACT.logout) ACT.logout(); return next(1);
  }

  if (PH === 1) {
    await T('L3B-R after a real refresh', async () => {
      ok('L3B-R1 the demo changes were restored; the late submissions are kept with their times', FCP.st === 'saved' && !!FCP.restored && A('CD1', 'a11').status === 'Submitted' && !!A('CD1', 'a11').submittedAt && A('CD4', 'a10').status === 'Submitted');
      ok('L3B-R2 the modes still resolve from the sign-up records', l3bModeOf(STORE.worlds.CD1).mode === 'Self-Paced' && l3bModeOf(STORE.worlds.CD2).mode === 'Fully Assisted');
      CLOCK_SHIFT = 0; at(AFTER);
      as('nvq-sp'); submitUI('a10'); ok('L3B-R3 Amira submits a10 (due 13 Dec) after the refresh too', A('CD1', 'a10').status === 'Submitted');
      as('nvq-fa'); lastToast = ''; ok('L3B-R4 Dev is still refused', ACT.reviewSubmit({ dataset: { id: 'a10' } }) === false && A('CD2', 'a10').status === 'Not Started');
      CLOCK_SHIFT = 0; ACT.resetDemo(); closeModal();
      ok('L3B-R5 Reset demo: the assignments are Not Started again', ['CD1', 'CD4'].every(v => A(v, 'a10').status === 'Not Started'));
    });
  }

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
  SS.removeItem(K + 'phase'); SS.removeItem(K + 'R');
})();
