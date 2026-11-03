// SA-SAFETY — an erasure request is not a regular archive. suites.sh runs it with FIXTURE=client.
// Phase 0: client demo — active learner (held as Pending review, nothing changed), completed learner (archived, then completed),
// already archived learner (recorded, no change), confirm-time re-check, decideDsr / dsrDone guards, role matrix;
// phase 1: a real refresh keeps the Pending review request, Reset demo, then the legacy fixture's completed request.
(async function () {
  const SS = window.sessionStorage, PH = +(SS.getItem('ft-sas.phase') || 0);
  const R = JSON.parse(SS.getItem('ft-sas.R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s);
  const T = async (n, f) => { try { closeModal(); S.frame = 'auto'; await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const reason = (r = 'SAS test') => { const t = $1('#rsn'); if (t) t.value = r; const x = prim(); if (x !== false && MODAL) closeModal(); return x; };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const next = ph => { SS.setItem('ft-sas.R', J(R)); SS.setItem('ft-sas.phase', String(ph)); location.reload(); };
  const sec = () => ADMIN.security.length, lastAud = () => ADMIN.audit[0] || {};
  const AS = av => { closeModal(); setAdminIdentity(av); S.portal = 'admin'; S.signedIn = true; S.ui = {}; go('a-dashboard'); };
  const ID = {
    super: () => AS('A'), sys: () => AS('SY'), fin: () => AS('FA'),
    aca: () => { closeModal(); acaEnter('KA'); S.signedIn = true; S.ui = {}; },
    biz: () => { closeModal(); bizEnter('BA'); S.ui = {}; },
  };
  const L = re => allLearners().find(l => re.test(l.name));
  const W = l => STORE.worlds[lrnKey(l)];
  let n = 0; const dsr = (l, type = 'Erasure', lid = l && l.id) => { const id = 'DSR-SAS-' + (++n); ADMIN.dsr.unshift({ id, who: l ? l.name : 'Nobody Known', lid, at: now().toISOString(), type, status: 'Open', loggedBy: 'SAS test', decision: '' }); return id; };
  const D_ = id => ADMIN.dsr.find(x => x.id === id);
  const btn = id => $1(`main [data-act="dsrArchive"][data-id="${id}"]`), doneBtn = id => $1(`main [data-act="dsrDone"][data-id="${id}"]`);
  const view = () => go('a-dataprotection', { tab: 'dsr' });

  if (PH === 0) {
    await T('SAS-1 active learner: held as Pending review, learner untouched', async () => {
      ID.super(); const am = L(/Amira/), id = dsr(am), w0 = J(W(am).enrolments), a0 = ADMIN.audit.length; view();
      ok('SAS-1 the open erasure request offers "Check and archive"', !!btn(id) && /Check and archive/.test(btn(id).textContent));
      click(btn(id));
      const d = D_(id);
      ok('SAS-1 no archive dialog opens', !MODAL);
      ok('SAS-1 Amira stays Active; her enrolments are unchanged', L(/Amira/).rec === 'Active' && J(W(am).enrolments) === w0);
      ok('SAS-1 the request is kept as Pending review with the reason', d.status === 'Pending review' && !d.archived && /Enrolment not finished/.test(d.decision) && /Enrolment not finished/.test(d.review.why.join(' ')), J([d.status, d.decision]));
      ok('SAS-1 audit: "Erasure request held for review" (Open → Pending review); no archive entry', lastAud().action === 'Erasure request held for review' && lastAud().before === 'Open' && lastAud().after === 'Pending review' && !ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(x => x.action === 'Archive record'), J(lastAud()));
      view(); ok('SAS-1 the table shows Pending review, the reason, and a Re-check button', /Pending review/.test(main()) && /Enrolment not finished/.test(main()) && !!btn(id) && /Re-check/.test(btn(id).textContent));
      const a1 = ADMIN.audit.length; click(btn(id));
      ok('SAS-1 re-check with the same reasons: still held, no duplicate audit entry', D_(id).status === 'Pending review' && ADMIN.audit.length === a1 && L(/Amira/).rec === 'Active');
      ACT.decideDsr({ dataset: { id } });
      ok('SAS-1 decideDsr on it: same guarded step (not "Decided", nothing archived)', !MODAL && D_(id).status === 'Pending review' && L(/Amira/).rec === 'Active');
      ACT.dsrDone({ dataset: { id } });
      ok('SAS-1 dsrDone on it is refused (no dialog, not completed, refusal logged)', !MODAL && D_(id).status === 'Pending review' && lastAud().action === 'Erasure step refused' && /hasn't been archived/.test(lastAud().reason), J(lastAud()));
      view(); ok('SAS-1 no Mark completed button while Pending review', !doneBtn(id));
      SS.setItem('ft-sas.held', id);
    });
    await T('SAS-4 confirm-time re-check: a learner who becomes active meanwhile is held, not archived', async () => {
      ID.super(); const sm = L(/Lena/), w = W(sm), keep = J(w.enrolments); w.enrolments.forEach(e => { e.status = 'Completed'; });
      const e0 = sabElig(sm); if (!e0.ok) { ok('SAS-4 (setup) a second eligible learner', false, J(e0.why)); w.enrolments = JSON.parse(keep); return; }
      const id = dsr(sm); view(); click(btn(id)); const m = !!MODAL;
      w.enrolments[0].status = 'Active'; reason('basis');
      ok('SAS-4 the dialog opened, but confirm re-checked: not archived, held as Pending review', m && allLearners().find(l => l.id === sm.id).rec === 'Active' && D_(id).status === 'Pending review' && !D_(id).archived, J([m, D_(id).status]));
      w.enrolments = JSON.parse(keep); ADMIN.dsr.splice(ADMIN.dsr.indexOf(D_(id)), 1); // the held test request would block SAS-2
    });
    await T('SAS-2 completed learner: archived through the request, then completed', async () => {
      ID.super(); const le = L(/Lena/); W(le).enrolments.forEach(e => { e.status = 'Completed'; });
      const e = sabElig(le); ok('SAS-2 (setup) Lena, every enrolment Completed, is eligible', e.ok, J(e.why));
      if (!e.ok) return;
      const id = dsr(le); view(); click(btn(id));
      ok('SAS-2 the archive dialog opens and says the records show nothing active', !!MODAL && /nothing still active or open/.test($1('#modal-root').textContent));
      reason('Learner asked for erasure; all enrolments completed');
      const d = D_(id);
      ok('SAS-2 Lena is archived; nothing deleted (her enrolments are still there)', L(/Lena/).rec === 'Archived' && W(le).enrolments.length > 0);
      ok('SAS-2 the request records the archive and its basis', !!d.archived && /^Archived — basis: Learner asked/.test(d.decision) && d.status === 'Open');
      ok('SAS-2 audit: learner "Archive record" and "Erasure request: record archived"', ADMIN.audit.some(x => x.entity === le.id && x.action === 'Archive record' && x.before === 'Active') && ADMIN.audit.some(x => x.entity === id && x.action === 'Erasure request: record archived'));
      view(); ok('SAS-2 now offers Mark completed (no archive button)', !!doneBtn(id) && !btn(id));
      click(doneBtn(id)); reason('Done');
      ok('SAS-2 completed', D_(id).status === 'Completed' && !!D_(id).completed);
      const a0 = ADMIN.audit.length; ACT.dsrArchive({ dataset: { id } }); ACT.dsrDone({ dataset: { id } });
      ok('SAS-2 replay on the completed request: refused, nothing changes', !MODAL && D_(id).status === 'Completed' && ADMIN.audit.slice(0, ADMIN.audit.length - a0).every(x => x.action === 'Erasure step refused'));
      SS.setItem('ft-sas.lena', le.id);
    });
    await T('SAS-3 already archived learner: outcome recorded, no change', async () => {
      ID.super(); const le = L(/Lena/), id = dsr(le), acct0 = J(STORE.acct); view(); click(btn(id));
      ok('SAS-3 the dialog says the learner is already archived', !!MODAL && /already archived/.test($1('#modal-root').textContent));
      reason('Already archived after DSR-SAS-2');
      const d = D_(id);
      ok('SAS-3 nothing changes on the learner', J(STORE.acct) === acct0 && L(/Lena/).rec === 'Archived');
      ok('SAS-3 the request records it; Mark completed is offered', !!d.archived && /already archived — no change/.test(d.decision) && lastAud().action === 'Erasure request: record already archived');
    });
    await T('SAS-5 unknown learner and non-erasure requests', async () => {
      ID.super(); const id = dsr(null, 'Erasure', 'NO-SUCH-ID'); ACT.dsrArchive({ dataset: { id } });
      ok('SAS-5 learner not found: held as Pending review (fail closed)', D_(id).status === 'Pending review' && /not found/.test(D_(id).decision));
      const ac = dsr(L(/Amira/), 'Access'); ACT.dsrArchive({ dataset: { id: ac } });
      ok('SAS-5 dsrArchive on an access request: refused, no change, logged', !MODAL && D_(ac).status === 'Open' && !D_(ac).archived && lastAud().action === 'Erasure step refused');
    });
    await T('SAS-6 unauthorised direct calls change nothing', async () => {
      ['fin', 'aca', 'biz'].forEach(r => {
        ID.super(); const id = dsr(L(/Amira/)); ID[r](); const s0 = sec(), d0 = J(D_(id)), acct0 = J(STORE.acct);
        ACT.dsrArchive({ dataset: { id } }); ACT.decideDsr({ dataset: { id } }); ACT.dsrDone({ dataset: { id } });
        ok(`SAS-6 ${r}: dsrArchive / decideDsr / dsrDone refused and logged, nothing changed`, !MODAL && J(D_(id)) === d0 && J(STORE.acct) === acct0 && sec() > s0, J([D_(id).status, sec() - s0]));
        closeModal();
      });
      ID.sys(); const id = dsr(L(/Amira/)); ACT.dsrArchive({ dataset: { id } });
      ok('SAS-6 a System Administrator gets the same guarded step (held, Amira still Active)', D_(id).status === 'Pending review' && L(/Amira/).rec === 'Active');
    });
    next(1); return;
  }

  if (PH === 1) {
    await T('SAS-7 refresh keeps the Pending review request and its reasons', async () => {
      ID.super(); const id = SS.getItem('ft-sas.held'), d = D_(id);
      ok('SAS-7 after a real refresh: still Pending review, reasons kept, Amira Active', !!d && d.status === 'Pending review' && /Enrolment not finished/.test(d.decision) && L(/Amira/).rec === 'Active', d && J([d.status]));
    });
    await T('SAS-8 Reset demo and the legacy fixture', async () => {
      ACT.resetDemo(); ID.super();
      ok('SAS-8 Reset demo: the test requests are gone; Lena is Active again', !ADMIN.dsr.some(x => /^DSR-SAS-/.test(x.id)) && L(/Lena/).rec === 'Active');
      fxLoadLegacy(); AS('A'); go('a-dataprotection', { tab: 'dsr' });
      const d = D_('DSR-14'); ok('SAS-8 legacy completed erasure DSR-14 is kept as recorded, with no action button', !!d && d.status === 'Completed' && /awarding-body retention/.test(d.decision) && !btn('DSR-14'));
      const a0 = ADMIN.audit.length; ACT.dsrArchive({ dataset: { id: 'DSR-14' } });
      ok('SAS-8 a direct dsrArchive on it is refused; nothing changes', !MODAL && d.status === 'Completed' && lastAud().action === 'Erasure step refused' && ADMIN.audit.length === a0 + 1);
    });
    SS.removeItem('ft-sas.phase'); SS.removeItem('ft-sas.R'); SS.removeItem('ft-sas.held'); SS.removeItem('ft-sas.lena');
  }
  const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
})();
