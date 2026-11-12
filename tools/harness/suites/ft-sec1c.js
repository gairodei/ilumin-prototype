// SEC-01 on the client demo (suites.sh runs it with FIXTURE=client): the Level 3 audit's reproduction (probe S15). Finance pauses the
// Self-Paced learner's NVQ through the real Pause access action; the learner's direct ACT.reviewSubmit('a10') — and its dialog, undo
// window and finalisation — no longer submit. Finance restores access and the same submission goes through.
(async function () {
  const R = []; const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const press = () => { const r = prim(); if (r !== false && MODAL) closeModal(); return r; };
  const as = p => { closeModal(); ACT.drAs({ dataset: { p } }); S.signedIn = true; S.auth = null; S.ui = {}; };
  let lastToast = ''; const _t = toast; toast = function (m) { lastToast = String(m); return _t.apply(this, arguments); };

  await T('SEC1C the audit reproduction (S15)', async () => {
    as('nvq-sp'); const lid = W.me.id, a = asgById('a10');
    ok('SEC1C setup: the Self-Paced learner has a10 open to submit', !!a && ['Not Started', 'Resubmission Required'].includes(a.status) && !lockFor('assignment'), a && a.status);
    as('fin'); ACT.chPause({ dataset: { l: lid, e: 'nvq' } }); const t = $1('#rsn'); if (t) t.value = 'SEC1C test'; press();
    ok('SEC1C-1 Finance pauses the NVQ (CH-14, real action)', !!chPaused(lid, 'nvq'));
    as('nvq-sp'); const st0 = a.status, a0 = ADMIN.audit.length; lastToast = '';
    const r = ACT.reviewSubmit({ dataset: { id: 'a10' } }); if (MODAL) prim(); await wait(16500);
    ok('SEC1C-2 the direct ACT.reviewSubmit(a10) no longer submits: refused, no dialog, status unchanged', r === false && asgById('a10').status === st0 && /Access paused/.test(lastToast), `${st0} → ${asgById('a10').status}`);
    ok('SEC1C-3 the refusal is in the audit log as blocked', ADMIN.audit.slice(0, ADMIN.audit.length - a0).some(x => x.action === 'Blocked: submit an assignment (access locked)'));
    go('assignment', { id: 'a10' }); ok('SEC1C-4 the page shows Access paused (unchanged)', /Access paused/.test($1('main').textContent) && !$1('main [data-act="reviewSubmit"]'));
    ok('SEC1C-5 finaliseSubmit called directly is refused too', finaliseSubmit(a, a.status === 'Resubmission Required', now().toISOString()) === false && asgById('a10').status === st0);
    as('fin'); ACT.chRestore({ dataset: { l: lid, e: 'nvq' } }); const t2 = $1('#rsn'); if (t2) t2.value = 'SEC1C restore'; press();
    ok('SEC1C-6 Finance restores access', !chPaused(lid, 'nvq'));
    as('nvq-sp'); go('assignment', { id: 'a10' }); const b = $1('main [data-act="reviewSubmit"]'); if (b) b.click();
    const sub = $a('#modal-root [data-mi]').find(x => /^Submit$/.test(x.textContent)); if (sub) sub.click(); await wait(16500);
    ok('SEC1C-7 after restoring, Review & Submit → Submit (real clicks) submits a10', asgById('a10').status === 'Submitted', asgById('a10').status);
  });

  document.body.insertAdjacentHTML('beforeend', '<pre id="ft-out">' + R.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>');
})();
