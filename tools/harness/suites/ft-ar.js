// AR — assignment outcome, References and persistent drafts (31 Oct 2026; PD-AR-*). suites.sh runs this suite with FIXTURE=client.
// The suite reloads the page for real (location.reload) between its phases: results and the phase travel in sessionStorage, the
// drafts under test in localStorage (each harness run has a fresh browser profile). The last phase loads the full legacy fixture.
// Checked: References on the demo and on seeded (older) editable assignments; Save draft → refresh → restored; per-learner,
// programme-version and release isolation; storage failure; files to reattach; submitted work not overwritten by a stale draft;
// Reset demo clears saved drafts; the Assessor's draft decision hidden, the published outcome visible at once; wrong-role and
// cross-learner refusals; fees, admission and the mixed-mode batch unchanged.
(async function () {
  const SS = window.sessionStorage, PH = +(SS.getItem('ft-ar.phase') || 0);
  const R = JSON.parse(SS.getItem('ft-ar.R') || '[]'); const ok = (n, c, i = '') => R.push((c ? 'PASS ' : 'FAIL ') + n + (i ? ' — ' + i : ''));
  const J = JSON.stringify, $1 = s => document.querySelector(s), $a = s => [...document.querySelectorAll(s)];
  const T = async (n, f) => { try { closeModal(); await f(); } catch (e) { R.push('FAIL ' + n + ' — threw ' + e.message + ' ' + (e.stack || '').split('\n')[1]); } };
  const click = el => { if (!el) throw new Error('missing control'); el.click(); };
  const prim = () => { const a = MODAL && MODAL.actions.find(x => x.cls && /primary|danger/.test(x.cls)); return a && a.fn ? a.fn() : undefined; };
  const act = l => { const a = MODAL && MODAL.actions.find(x => x.label === l); return a && a.fn ? a.fn() : undefined; };
  const signOutUI = () => { closeModal(); if (S.signedIn) ACT.logout(); };
  const pick = p => { signOutUI(); click($1(`#app .dr-signin [data-act="drAs"][data-p="${p}"]`)); };
  const main = () => ($1('main') || document.body).textContent.replace(/\s+/g, ' ');
  const tick = () => new Promise(r => setTimeout(r, 30));
  const LS = () => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(AR_PFX)) o[k] = localStorage.getItem(k); } return o; };
  const typeIn = (sel, html) => { const b = $1(sel); b.innerHTML = html; INP.rteInput(b); };
  const attach = async name => { const dt = new DataTransfer(); dt.items.add(new File(['private evidence bytes'], name, { type: 'application/pdf' })); const inp = $1('main .paper input[type="file"]'); inp.files = dt.files; INP.attach(inp); await tick(); };
  const next = ph => { SS.setItem('ft-ar.R', J(R)); SS.setItem('ft-ar.phase', String(ph)); location.reload(); };
  const learner = v => { S.variant = v; ACT.switchRole({ dataset: { r: 'learner' } }); S.signedIn = true; };
  const TCH = v => { S.tas.v = v; tasEnter(); S.signedIn = true; };
  const AM = 'IA-L-32000', DV = 'IA-L-32001', K = (lid, aid) => lid + '~' + aid;

  if (PH === 0) {
    /* ---------- References on the demo's NVQ assignments ---------- */
    await T('AR-B demo References', async () => {
      pick('nvq-sp'); ['a10', 'a11'].forEach(id => { go('assignment', { id });
        const order = ['.paper', '.cb-refs', '.cf-submit'].map(s => $1('main ' + s));
        ok(`AR-B demo ${id}: each question has its own answer box, then one References box, then evidence and submission`, order.every(Boolean) && order.every((x, i) => !i || (order[i - 1].compareDocumentPosition(x) & 4)) && $a('main .cb-refs').length === 1 && $a('main .paper .rte-body').length === W.assignments.find(a => a.id === id).qs.length);
      });
      ok('AR-B References is a multiline text box with no citation-format rule', !!$1('main .cb-refs .rte-body[aria-multiline="true"][contenteditable="true"]') && !/APA|Harvard|format/i.test($1('main .cb-refs').textContent));
      ok('AR-C the prototype-only storage note is shown discreetly with Save draft', /Prototype only/.test(($1('main .cf-submit .ar-proto') || {}).textContent || '') && /not the files themselves/.test($1('main .ar-proto').textContent));
    });

    /* ---------- Save draft in this browser; isolation; failure ---------- */
    await T('AR-C save draft', async () => {
      pick('nvq-sp'); const a = W.assignments.find(x => x.id === 'a10'); go('assignment', { id: 'a10' });
      const chipT = () => (($1('#savechip') || {}).textContent || '').trim(), line = () => (($1('main .cf-saved') || {}).textContent || '').trim();
      ok('AR-S before any edit: "No draft saved yet" (no "Saved" claim)', chipT() === 'No draft saved yet' && line() === 'No draft saved yet' && !/\bSaved\b/.test(chipT()));
      typeIn('main .paper .rte-body', '<p>AR answer: I put the person at the centre of their care plan.</p>');
      await tick(); await new Promise(r => setTimeout(r, 800));
      ok('AR-S after typing: "Unsaved changes" in the chip and by Save draft — the in-page auto-save no longer says "Saved"', chipT() === 'Unsaved changes' && /^Unsaved changes/.test(line()) && !!$1('#savechip.ar-dirty') && !/Saved \d/.test(chipT()));
      typeIn('main .cb-refs .rte-body', '<p>Care Act 2014</p><p>https://www.skillsforcare.org.uk</p>');
      await attach('ar-evidence.pdf');
      click($1('main [data-act="cfSaveDraft"]'));
      const st = LS(), k = arKey(a), rec = JSON.parse(st[k] || 'null');
      ok('AR-C Save draft writes one record for Amira, programme version and assignment release', !!rec && Object.keys(st).length === 1 && k === `${AR_PFX}client|${AM}|NV-N1@1|${arRel(a)}`, Object.keys(st).join());
      ok('AR-C the record holds the answer, the References and the file name — not the file\'s contents', rec && /person at the centre/.test(rec.answers[a.qs[0].id]) && /Care Act 2014/.test(rec.refs) && J(rec.files[a.qs[0].id]) === '["ar-evidence.pdf"]' && !/private evidence bytes/.test(st[k]));
      ok('AR-C nothing sensitive is stored (no password, token, payment or document data)', !/password|token|card|iban|sort.?code|passport/i.test(st[k]) && J(Object.keys(rec).sort()) === J(['answers', 'files', 'learner', 'prog', 'refs', 'rel', 'round', 'savedAt', 'status', 'v']));
      ok('AR-C Save draft reports success accurately', /^Draft saved locally/.test(line()) && !$1('main .cf-saved.ar-fail'));
      ok('AR-S after Save draft: the chip says "Draft saved locally" with the time', /^Draft saved locally \d{1,2}:\d{2}$/.test(chipT()) && !!$1('#savechip.ar-saved'));
      // Storage full / unavailable: an error, no claim, the previous record kept
      const orig = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new DOMException('Quota exceeded', 'QuotaExceededError'); };
      typeIn('main .paper .rte-body', '<p>AR answer CHANGED while storage fails.</p>');
      let r; try { r = ACT.cfSaveDraft({ dataset: { id: 'a10' } }); } finally { Storage.prototype.setItem = orig; }
      ok('AR-C storage failure: Save draft says it wasn\'t saved and claims nothing', r === false && line() === 'Save failed' && !!$1('main .cf-saved.ar-fail') && /couldn't be saved/.test(($1('#toast-root') || document.body).textContent));
      await new Promise(r0 => setTimeout(r0, 800));
      ok('AR-S storage failure: the chip says "Save failed" and nothing on the page claims the draft is saved', chipT() === 'Save failed' && !!$1('#savechip.ar-fail') && !/saved locally|Saved \d/.test(chipT() + ' ' + line()));
      ok('AR-C storage failure: the earlier saved draft is untouched', /person at the centre/.test(JSON.parse(localStorage.getItem(arKey(a))).answers[a.qs[0].id]));
      const dl = Object.getOwnPropertyDescriptor(window, 'localStorage'); let r2 = 'skipped';
      try { Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('denied', 'SecurityError'); } }); r2 = ACT.cfSaveDraft({ dataset: { id: 'a10' } }); } catch (e) { r2 = 'n/a'; } finally { if (dl) Object.defineProperty(window, 'localStorage', dl); else delete window.localStorage; }
      ok('AR-C storage disabled: Save draft refuses with an error', r2 === false || r2 === 'n/a', String(r2));
      typeIn('main .paper .rte-body', '<p>AR answer: I put the person at the centre of their care plan.</p>'); click($1('main [data-act="cfSaveDraft"]'));
      ok('AR-C saved again once storage works', /^Draft saved locally/.test(line()) && /^Draft saved locally/.test(chipT()));
      // Dev: never sees or overwrites Amira's draft
      pick('nvq-fa'); go('assignment', { id: 'a10' });
      ok('AR-D Dev\'s Assignment 1 is empty — Amira\'s draft isn\'t shown', !/person at the centre|Care Act 2014|ar-evidence/.test(main()) && !$1('main .ar-restored'));
      typeIn('main .paper .rte-body', '<p>DEV answer only.</p>'); typeIn('main .cb-refs .rte-body', '<p>Dev reference</p>'); click($1('main [data-act="cfSaveDraft"]'));
      const st2 = LS(); ok('AR-D Dev\'s draft is a separate record; Amira\'s is unchanged', Object.keys(st2).length === 2 && Object.keys(st2).some(x => x.includes(`|${DV}|`)) && /person at the centre/.test(st2[Object.keys(st2).find(x => x.includes(`|${AM}|`))]));
      // Version and release isolation: the key changes with the programme version and with the questions; records under other keys aren't read
      pick('nvq-sp'); const pv = W.nvq.progVersion, k1 = arKey(a); W.nvq.progVersion = 2; const k2 = arKey(a); W.nvq.progVersion = pv;
      const qt = a.qs[0].text; a.qs[0].text = qt + ' (changed)'; const k3 = arKey(a); a.qs[0].text = qt;
      ok('AR-E the draft key changes with the programme version and with the assignment release (its questions)', k1 !== k2 && k1 !== k3 && k2.includes('NV-N1@2') && !k3.endsWith(arRel(a)));
      const fake = (k, t) => localStorage.setItem(k, J({ v: 1, savedAt: now().toISOString(), learner: AM, prog: 'x', rel: k.split('|').pop(), status: 'Not Started', round: 0, answers: { [a.qs[0].id]: `<p>${t}</p>` }, refs: `<p>${t}</p>`, files: {} }));
      fake(k2, 'OTHER VERSION text'); fake(k3, 'OTHER RELEASE text');
      // A stored copy edited outside the page: restored as text only
      const s1 = JSON.parse(localStorage.getItem(k1)); s1.refs += '<img src=x onerror="window.__arXss=1"><script>window.__arXss=2</script><p onclick="x()">Skills for Care</p>'; localStorage.setItem(k1, J(s1));
      ok('AR-C closing and reopening the page leaves the saved record in the browser (no session state needed)', !!localStorage.getItem(k1));
    });
    return next(1);
  }

  if (PH === 1) {
    /* ---------- After a real browser refresh ---------- */
    await T('AR-C restored after refresh', async () => {
      ok('AR-C the page really reloaded: a fresh demo, nobody signed in', !S.signedIn && FX.mode === 'client' && STORE.worlds.CD1.assignments.every(x => x.status === 'Not Started'));
      pick('nvq-sp'); const a = W.assignments.find(x => x.id === 'a10'); go('assignment', { id: 'a10' });
      ok('AR-C Amira signs in again: her answer is restored', /person at the centre/.test($1('main .paper .rte-body').innerHTML));
      ok('AR-C …and her References', /Care Act 2014/.test($1('main .cb-refs .rte-body').innerHTML) && /skillsforcare/.test($1('main .cb-refs .rte-body').innerHTML));
      ok('AR-C …with "Draft restored from this browser" and when it was saved', /Draft restored from this browser/.test(($1('main .ar-restored') || {}).textContent || '') && /^Draft saved locally/.test($1('main .cf-saved').textContent.trim()) && /^Draft saved locally/.test($1('#savechip').textContent.trim()));
      typeIn('main .cb-refs .rte-body', $1('main .cb-refs .rte-body').innerHTML); await tick();
      ok('AR-S an edit after the restore: "Unsaved changes", naming when it was last saved locally', $1('#savechip').textContent.trim() === 'Unsaved changes' && /^Unsaved changes — last saved locally/.test($1('main .cf-saved').textContent.trim()));
      ok('AR-C the attached file isn\'t claimed: "Please reattach your files" names it, and nothing is attached', /Please reattach your files/.test(($1('main .ar-reattach') || {}).textContent || '') && /ar-evidence\.pdf/.test($1('main .ar-reattach').textContent) && !(W.drafts['att.a10.' + a.qs[0].id + '.0'] || []).length && /No evidence files attached yet/.test($1('main .cf-submit').textContent));
      ok('AR-C restored text keeps formatting only (no scripts, handlers or images)', !window.__arXss && !$1('main .cb-refs img, main .cb-refs script, main .cb-refs [onclick]') && /Skills for Care/.test($1('main .cb-refs').textContent));
      ok('AR-E drafts saved under another programme version or release are not restored', !/OTHER VERSION|OTHER RELEASE/.test(main()));
      // Reattaching the same file clears the reminder
      const dt = new DataTransfer(); dt.items.add(new File(['x'], 'ar-evidence.pdf', { type: 'application/pdf' })); const inp = $1('main .paper input[type="file"]'); inp.files = dt.files; INP.attach(inp); await tick(); go('assignment', { id: 'a10' });
      ok('AR-C reattaching the file removes it from "Please reattach"', !$1('main .ar-reattach') && /ar-evidence\.pdf/.test($1('main .cf-submit .cf-att').textContent));
      pick('nvq-fa'); go('assignment', { id: 'a10' });
      ok('AR-D Dev sees only his own restored draft, never Amira\'s', /DEV answer only/.test($1('main .paper .rte-body').innerHTML) && !/person at the centre|Care Act 2014/.test(main()));
      pick('nvq-sp'); go('assignment', { id: 'a10' });
      ok('AR-D back to Amira: her draft is intact', /person at the centre/.test($1('main .paper .rte-body').innerHTML) && /Care Act 2014/.test($1('main .cb-refs .rte-body').innerHTML));
      // Submit: the submission stands and the browser draft goes
      fxFast(ff => { ACT.reviewSubmit({ dataset: { id: 'a10' } }); ok('AR-C Review shows the References with the answers', MODAL && /Care Act 2014/.test(MODAL.body)); prim(); ff(16500); }); closeModal();
      ok('AR-C submitted with the restored answer and References (frozen)', a.status === 'Submitted' && /person at the centre/.test(a.qs[0].rounds[0].html) && /Care Act 2014/.test(a.refRounds[0].html) && Object.isFrozen(a.refRounds[0]));
      ok('AR-C submitting removes Amira\'s saved draft from the browser (Dev\'s stays)', !localStorage.getItem(arKey(a)) && Object.keys(LS()).some(k => k.includes(`|${DV}|`)));
      W.arHyd = {}; go('assignment', { id: 'a10' });
      ok('AR-C the submitted assignment stays locked: no answer box, no Save draft, nothing restored over it', !$1('main .paper .rte-body[contenteditable="true"]') && !$1('main [data-act="cfSaveDraft"]') && /Care Act 2014/.test(($1('main .cb-refs-done') || {}).textContent || ''));
      // A stale copy of the old draft put back after submission is ignored and removed
      localStorage.setItem(arKey(a), J({ v: 1, savedAt: now().toISOString(), learner: AM, prog: arProg(), rel: arRel(a), status: 'Not Started', round: 0, answers: { [a.qs[0].id]: '<p>STALE draft</p>' }, refs: '<p>STALE ref</p>', files: {} }));
      const r0 = J(a.qs[0].rounds); W.arHyd = {}; go('assignment', { id: 'a10' });
      ok('AR-C a stale draft is never restored over submitted work (and is removed)', J(a.qs[0].rounds) === r0 && !/STALE/.test(main()) && !localStorage.getItem(arKey(a)) && !/STALE/.test(J(W.drafts)));
    });

    /* ---------- The final outcome: draft hidden, publish visible at once ---------- */
    await T('AR-A final outcome', async () => {
      const key = K(AM, 'a10'), a = STORE.worlds.CD1.assignments.find(x => x.id === 'a10');
      pick('assessor'); go('t-mark', { id: key });
      click($1('main .r3-out [data-act="r3Declare"]'));
      ok('AR-A the Assessor\'s decision dialog offers Save draft and Publish to learner', MODAL && MODAL.actions.some(x => x.label === 'Save draft') && MODAL.actions.some(x => x.label === 'Publish to learner' && /primary/.test(x.cls)));
      $1('input[name="r3-res"][value="Pass"]').checked = true; $1('#d-ofb').value = 'AR overall: a clear, well-referenced answer.'; $1('#rsn').value = 'Meets the brief';
      act('Save draft'); closeModal();
      ok('AR-A Save draft keeps the decision as a draft: no outcome recorded', !r3Out(key) && R3().odraft[key] && R3().odraft[key].result === 'Pass' && ADMIN.audit.some(x => x.action === 'Final outcome draft saved'));
      go('t-mark', { id: key }); ok('AR-A the workspace shows the draft as not visible to the learner', /Draft saved/.test($1('main .r3-out').textContent) && /not visible to the learner/.test($1('main .r3-out').textContent) && /Continue the draft decision/.test($1('main .r3-out').textContent));
      // The marking release doesn't publish it
      const d = dft(key); markable(tasAsg(tasSubs(true).find(s => s.key === key))).forEach(q => { d.items[q.id] = { exit: 'pass', rag: 'G', fb: 'Well evidenced.', met: 'Met' }; }); ACT.mkRelease({ dataset: { k: key } }); prim(); closeModal();
      pick('coord1'); ACT.relOne({ dataset: { k: key } }); prim(); closeModal(); await tick();
      ok('AR-A the marking release doesn\'t publish the draft decision', a.status === 'Feedback Received' && !r3Out(key) && !!R3().odraft[key]);
      pick('nvq-sp'); go('assignment', { id: 'a10' });
      ok('AR-A Amira can\'t see the draft decision (assignment page)', !$1('main .d-lout') && !$1('main .ar-ost') && !/AR overall/.test(main()));
      go('progress', { tab: 'feedback' }); ok('AR-A …nor in Progress & Gap Analysis', !/Final outcome|AR overall/.test(main()));
      // Wrong roles can't publish (or save a draft)
      const sec0 = ADMIN.security.length;
      pick('teacher'); ACT.r3Declare({ dataset: { k: key } }); const t1 = !MODAL; closeModal();
      pick('coord1'); ACT.r3Declare({ dataset: { k: key } }); const t2 = !MODAL; closeModal();
      pick('nvq-sp'); ACT.r3Declare({ dataset: { k: key } }); const t3 = !MODAL; closeModal();
      pick('nvq-fa'); ACT.r3Declare({ dataset: { k: key } }); const t4 = !MODAL; closeModal();
      ok('AR-A (negative) the Teacher, the Coordinator, Amira and another learner can\'t publish or draft the outcome (refused, logged)', t1 && t2 && t3 && t4 && !r3Out(key) && ADMIN.security.length >= sec0 + 4);
      // Publish
      pick('assessor'); go('t-mark', { id: key }); click($1('main .r3-out [data-act="r3Declare"]'));
      ok('AR-A reopening continues the draft (Pass, rationale and overall feedback filled in)', $1('input[name="r3-res"][value="Pass"]').checked && /AR overall/.test($1('#d-ofb').value) && $1('#rsn').value === 'Meets the brief');
      prim(); closeModal();
      const o = r3Out(key);
      ok('AR-A Publish records the allocated Assessor\'s Pass as published; the draft is gone', o && o.result === 'Pass' && o.published === true && o.by === 'James Pryce' && !R3().odraft[key]);
      ok('AR-A not derived from the criteria (the outcome is the Assessor\'s choice)', o.note === 'Meets the brief' && /AR overall/.test(o.feedback));
      pick('nvq-sp'); go('assignment', { id: 'a10' }); const lo = ($1('main .d-lout') || {}).textContent || '';
      ok('AR-A Amira sees the published Pass at once, with the overall feedback', /Final outcome/.test(lo) && /Pass/.test(lo) && /AR overall: a clear, well-referenced answer/.test(lo) && /James Pryce/.test(lo));
      ok('AR-A the status card shows the final outcome beside the status', /Pass/.test(($1('main .ar-ost') || {}).textContent || ''));
      ok('AR-A the published criterion feedback is still shown', !!$1('main .r3-learner') && /Assessor ·/.test($1('main .r3-learner').textContent));
      ok('AR-A Amira is notified, linking to the assignment', W.notifs.some(n => n.title === 'Final outcome published' && n.go === 'assignment.a10' && /Pass/.test(n.body)));
      go('progress', { tab: 'feedback' }); ok('AR-A Progress & Gap Analysis → Assessment feedback shows it', /Final outcome: Pass/.test(main()) && /AR overall/.test(main()));
      go('progress'); ok('AR-A Progress Overview lists it with the work', /Final outcome: Pass/.test(($1('main .cf-pwork') || {}).textContent || ''));
      setUi('asgTab', 'feedback'); go('assignments'); ok('AR-A the Assignments list shows it in the Feedback column', /Final outcome: Pass/.test(($1('main table') || {}).textContent || '')); setUi('asgTab', 'todo');
      pick('nvq-fa'); go('assignment', { id: 'a10' }); go('progress', { tab: 'feedback' });
      ok('AR-A (isolation) Dev doesn\'t see Amira\'s result', !/Final outcome|AR overall/.test(main()) && !STORE.worlds.CD2.notifs.some(n => n.title === 'Final outcome published'));
      pick('teacher'); ACT.r3Declare({ dataset: { k: key } }); ok('AR-A (negative) the Teacher still can\'t change it', !MODAL && r3Out(key).result === 'Pass'); closeModal();
      pick('assessor'); ACT.r3Declare({ dataset: { k: key } }); ok('AR-A (negative) a published outcome isn\'t re-published or changed here (Data Correction)', !MODAL && r3Out(key).result === 'Pass'); closeModal();
    });

    /* ---------- Outcome published before the detailed marking is released ---------- */
    await T('AR-H outcome before detailed feedback', async () => {
      const key = K(DV, 'a10'), a = STORE.worlds.CD2.assignments.find(x => x.id === 'a10');
      pick('nvq-fa'); go('assignment', { id: 'a10' });
      fxFast(ff => { ACT.reviewSubmit({ dataset: { id: 'a10' } }); prim(); ff(16500); }); closeModal();
      ok('AR-H Dev submits Assignment 1', a.status === 'Submitted');
      pick('coord2'); go('c-sub', { id: key }); $1('#r3-cv-' + a.qs[0].id).value = 'Met'; $1('#r3-ct-' + a.qs[0].id).value = 'AR-H coordinator: good link to the criterion.'; ACT.r3CooJudge({ dataset: { k: key, q: a.qs[0].id } });
      pick('nvq-fa'); go('assignment', { id: 'a10' });
      ok('AR-H the Coordinator\'s published criterion feedback shows on its own, before any outcome', /AR-H coordinator/.test(main()) && !$1('main .d-lout'));
      pick('assessor'); ACT.mkMet({ dataset: { k: key, q: a.qs[0].id, v: 'Met' } }); ACT.r3Declare({ dataset: { k: key } });
      $1('input[name="r3-res"][value="Fail"]').checked = true; $1('#d-ofb').value = 'AR-H overall: the example does not show the person shaping the plan.'; $1('#rsn').value = 'Key point missing';
      act('Save draft'); closeModal();
      pick('nvq-fa'); go('assignment', { id: 'a10' });
      ok('AR-H the draft Fail stays private (not shown to Dev)', !$1('main .d-lout') && !/AR-H overall/.test(main()));
      pick('assessor'); ACT.r3Declare({ dataset: { k: key } }); prim(); closeModal();
      ok('AR-H published by the allocated Assessor while the detailed marking is unreleased', r3Out(key) && r3Out(key).result === 'Fail' && a.status === 'Submitted' && r3Judg(key).some(j => j.role === 'Assessor' && !j.published));
      pick('nvq-fa'); go('assignment', { id: 'a10' }); const lo = ($1('main .d-lout') || {}).textContent || '';
      ok('AR-H Dev sees the published Fail and the overall feedback at once', /Fail/.test(lo) && /AR-H overall/.test(lo) && /Fail/.test(($1('main .ar-ost') || {}).textContent || ''));
      ok('AR-H "Detailed criterion feedback … is not yet available" replaces "You\'ll be notified when feedback is ready"', /Detailed criterion feedback from your Assessor is not yet available\./.test(main()) && !/notified when feedback is ready|told as soon as it is ready/.test(main()));
      ok('AR-H the Coordinator\'s criterion Met is still shown; the Assessor\'s unreleased judgement is not', /AR-H coordinator/.test(main()) && !/Assessor ·/.test(($1('main .r3-learner') || {}).textContent || ''));
      ok('AR-H the Fail isn\'t inferred from the criteria (Coordinator and Assessor both judged Met)', r3Judg(key).filter(j => j.value === 'Met').length >= 2 && r3Out(key).result === 'Fail');
      go('progress', { tab: 'feedback' }); ok('AR-H Progress → Assessment feedback: the Fail, the overall feedback and the same "not yet available" line', /Final outcome: Fail/.test(main()) && /AR-H overall/.test(main()) && /not yet available/.test(main()));
      // Without any criterion feedback published, the exact wording
      pick('nvq-sp'); const am = STORE.worlds.CD1.assignments.find(x => x.id === 'a11'); go('assignment', { id: 'a11' }); typeIn('main .paper .rte-body', '<p>a11</p>');
      fxFast(ff => { ACT.reviewSubmit({ dataset: { id: 'a11' } }); prim(); ff(16500); }); closeModal();
      pick('assessor'); ACT.r3Declare({ dataset: { k: K(AM, 'a11') } }); $1('input[name="r3-res"][value="Pass"]').checked = true; $1('#d-ofb').value = 'AR-H a11 overall.'; $1('#rsn').value = 'ok'; prim(); closeModal();
      pick('nvq-sp'); go('assignment', { id: 'a11' });
      ok('AR-H with no criterion feedback published yet: "Detailed criterion feedback is not yet available."', am.status === 'Submitted' && /Detailed criterion feedback is not yet available\./.test(main()) && /Pass/.test(($1('main .d-lout') || {}).textContent || ''));
    });

    /* ---------- Reset demo clears saved drafts ---------- */
    await T('AR-F reset', async () => {
      pick('nvq-fa'); go('assignment', { id: 'a11' }); typeIn('main .paper .rte-body', '<p>RESET-ME draft</p>'); click($1('main [data-act="cfSaveDraft"]'));
      ok('AR-F before Reset: drafts are saved in the browser', Object.keys(LS()).length >= 1);
      signOutUI(); S.demoOpen = true; renderDemo(); ACT.drReset();
      ok('AR-F the Reset confirmation says saved drafts are discarded', MODAL && /assignment drafts saved in this browser/.test(MODAL.body)); prim(); closeModal();
      ok('AR-F Reset demo removes every saved draft from the browser', Object.keys(LS()).length === 0);
    });
    return next(2);
  }

  if (PH === 2) {
    await T('AR-F after Reset and refresh', async () => {
      pick('nvq-fa'); go('assignment', { id: 'a11' });
      ok('AR-F after Reset and a refresh, the old draft doesn\'t come back', !/RESET-ME/.test(main()) && !$1('main .ar-restored') && Object.keys(LS()).length === 0);
      go('assignment', { id: 'a10' }); ok('AR-F the demo is back to its starting data (Assignment 1 not started, no outcome)', W.assignments.find(x => x.id === 'a10').status === 'Not Started' && !r3Out(K(AM, 'a10')) && !$1('main .d-lout'));
    });
    await T('AR-G fees, admission, mixed mode unchanged', async () => {
      const tot = k => (STORE.worlds[k].plans.find(p => p.e === 'nvq') || { rows: [] }).rows.reduce((s, r) => s + fpP(r.amount), 0), b = cdBatch();
      ok('AR-G fee terms and the mixed-mode batch unchanged: Amira Self-Paced £1,800, Dev Fully Assisted £2,600, one batch', Math.round(tot('CD1')) === 180000 && Math.round(tot('CD2')) === 260000 && STORE.worlds.CD1.signup.plan.opt.mode === 'Self-Paced' && STORE.worlds.CD2.signup.plan.opt.mode === 'Fully Assisted' && STORE.worlds.CD1.signup.batch === b.code && STORE.worlds.CD2.signup.batch === b.code);
      ok('AR-G admissions unchanged: both demo learners admitted', STORE.worlds.CD1.admission.status === 'Approved' && STORE.worlds.CD2.admission.status === 'Approved');
    });

    /* ---------- Older (seeded) assignments: the legacy fixture ---------- */
    await T('AR-B legacy References', async () => {
      ACT.fxLegacy(); learner('C');
      const A = W.assignments, ns = A.find(x => x.status === 'Not Started' && !x.closed && !x.refsOn), rs = A.find(x => x.status === 'Resubmission Required' && !x.refsOn), done = A.filter(x => !['Not Started', 'Resubmission Required'].includes(x.status));
      const snap = J(done.map(x => [x.id, x.status, x.qs.map(q => [q.rounds, q.fb, q.state]), x.refRounds || null]));
      ok('AR-B the legacy learner has seeded assignments without the CB5 References setting', !!ns && !!rs && done.length > 0 && A.every(x => !x.refsOn));
      go('assignment', { id: ns.id });
      const order = ['.paper', '.cb-refs', '.cf-submit'].map(s => $1('main ' + s));
      ok(`AR-B an older editable assignment (${ns.id}) shows an empty References box after its questions`, order.every(Boolean) && order.every((x, i) => !i || (order[i - 1].compareDocumentPosition(x) & 4)) && !cfTxt($1('main .cb-refs .rte-body').innerHTML) && $a('main .cb-refs').length === 1);
      go('assignment', { id: rs.id });
      ok(`AR-B a resubmission (${rs.id}) shows the References box for the new round; earlier answers stay locked`, !!$1('main .cb-refs .rte-body[contenteditable="true"]') && !$1('main .cb-refs-done') && $a('main .paper .rte-body[contenteditable="true"]').length === rs.qs.filter(q => q.state === 'rework').length);
      done.forEach(x => go('assignment', { id: x.id }));
      ok('AR-B submitted / assessed older work: no References box, nothing reopened', !$1('main .cb-refs .rte-body[contenteditable="true"]') && !$1('main [data-act="cfSaveDraft"]'));
      ok('AR-B viewing older work rewrites nothing (answers, feedback, rounds)', J(done.map(x => [x.id, x.status, x.qs.map(q => [q.rounds, q.fb, q.state]), x.refRounds || null])) === snap);
      ok('AR-B the assignment definitions are unchanged (no References flag added)', A.every(x => !x.refsOn) && s2Defs().filter(d => d.refs).length === s2Defs().filter(d => d.refs === true).length);
      // Through draft, refresh-safe save, review and submission of the older assignment
      go('assignment', { id: ns.id }); typeIn('main .paper .rte-body', '<p>Legacy answer</p>'); typeIn('main .cb-refs .rte-body', '<p>Legacy reference: NICE guidance</p>'); click($1('main [data-act="cfSaveDraft"]'));
      ok('AR-B Save draft keeps the older assignment\'s References (legacy dataset key)', /NICE guidance/.test(JSON.parse(localStorage.getItem(arKey(ns)) || '{}').refs || '') && arKey(ns).startsWith(AR_PFX + 'legacy|'));
      fxFast(ff => { ACT.reviewSubmit({ dataset: { id: ns.id } }); ok('AR-B Review shows the References', MODAL && /NICE guidance/.test(MODAL.body)); prim(); ff(16500); }); closeModal();
      ok('AR-B submitted: References recorded with the submission round on the learner\'s record', ns.status === 'Submitted' && ns.refRounds.length === 1 && ns.refRounds[0].round === 'Submission' && /NICE guidance/.test(ns.refRounds[0].html) && Object.isFrozen(ns.refRounds[0]) && !localStorage.getItem(arKey(ns)));
      go('assignment', { id: ns.id }); ok('AR-B the learner sees them read-only with the submission', /NICE guidance/.test(($1('main .cb-refs-done') || {}).textContent || ''));
      // Resubmission round label
      go('assignment', { id: rs.id }); typeIn('main .cb-refs .rte-body', '<p>Resub reference</p>'); $a('main .paper .rte-body[contenteditable="true"]').forEach(b => { b.innerHTML = '<p>Reworked</p>'; INP.rteInput(b); });
      const n0 = rs.resubUsed; fxFast(ff => { ACT.reviewSubmit({ dataset: { id: rs.id } }); prim(); ff(16500); }); closeModal();
      ok('AR-B a resubmission\'s References are labelled with its round', rs.refRounds && rs.refRounds.length === 1 && rs.refRounds[0].round === 'Resubmission ' + (n0 + 1) && /Resub reference/.test(rs.refRounds[0].html));
      const sub = chRaw(() => tasSubs(true)).find(x => x.L.v === 'C' && x.a.id === ns.id), nm = sub && chEff(sub.L.lid, 'asg', sub.L.batch), tv = Object.keys(TAS_USERS).find(k => TAS_USERS[k].name === nm);
      ok('AR-B the older submission is in its allocated Assessor\'s marking', !!sub && !!tv, J([!!sub, nm]));
      if (tv) { TCH(tv); go('t-mark', { id: sub.key }); ok('AR-B the allocated Assessor sees the older assignment\'s References with the answers', /NICE guidance/.test(main())); }
    });
    await T('AR-B builder setting', async () => {
      const d = s2Defs().find(x => x.status === 'Draft') || s2Defs()[0];
      setAdminIdentity('A'); S.portal = 'admin'; S.signedIn = true; const before = d.refs;
      ACT.cbAsgSet({ dataset: { id: d.id, k: 'refs' } }); ok('AR-B (negative) the Course Builder can no longer remove the References section (logged)', d.refs === before && ADMIN.audit.some(x => /Blocked: change references \(always on\)/.test(x.action || '')));
      ok('AR-B the builder says References are always shown', /Always — after the last question/.test(cbAsgSettings(d)));
    });
    SS.removeItem('ft-ar.phase'); SS.removeItem('ft-ar.R');
    const p = document.createElement('pre'); p.id = 'ft-out'; p.textContent = R.join('\n'); document.body.appendChild(p);
  }
})();
