/* ============================================================
   Batch AR — assignment outcome, References and persistent drafts (31 Oct 2026; PD-AR-* in PROVISIONAL-DECISIONS.md). Loads last.
   1  Final Pass / Fail (confirmed by the user): only the learner's allocated, Active Assessor decides it (R3's checks, unchanged).
      The Assessor can save a draft decision (never shown to the learner, never published by the marking release) or publish it.
      A published outcome reaches the learner at once with the overall feedback — no Coordinator release, no Academic Admin
      approval (supersedes PD-D-13's release condition and the LP note "a learner never sees the declared Pass / Fail"). The learner
      sees only their own; agencies don't see it; nothing is derived from criterion judgements.
   2  References (confirmed by the user): every editable assignment shows one References box after the last question, seeded and
      builder assignments alike. The assignment definitions and versions are unchanged; submitted work isn't reopened or rewritten.
      References are kept per submission round on the learner's record and shown to the learner, the allocated Assessor and the
      Coordinator.
   3  Save draft (prototype only): keeps the answers, the References and the names of attached files in this browser's localStorage,
      keyed by learner ID, programme version and assignment release. Restored after a refresh or a new sign-in as the same learner;
      never shown to another learner; removed on submission and by Reset demo. File contents are never stored — restored file
      names ask to be reattached. Not secure storage: a live system keeps drafts on the server, behind sign-in.
   ============================================================ */
'use strict';

const AR = { busy: false };
const arMe = () => (cfLearner() && W.nvq ? W.me : null);
const arKeyOf = a => W.me.id + '~' + a.id;

/* ---------- 1. Final outcome: draft or publish (allocated Assessor only) ---------- */
const arODrafts = () => { const s = R3(); return (s.odraft = s.odraft || {}); };
const arVal = s => (($(s) || {}).value || '').trim();
const _declAR = ACT.r3Declare;
ACT.r3Declare = el => {
  const key = el && el.dataset && el.dataset.k, r = _declAR(el); if (!MODAL || !/^Final outcome/.test(MODAL.title || '')) return r;
  const s = chRaw(() => tasSubs(true).find(x => x.key === key)), a = tasAsg(s), round = a.round || 'Sub 1', dr = arODrafts()[key];
  const pub = MODAL.actions.find(x => /primary/.test(x.cls || '')), g = pub.fn;
  pub.label = 'Publish to learner';
  pub.fn = (...x) => {
    const before = r3Out(key), res = g(...x), o = r3Out(key); if (res === false || !o || o === before) return res;
    o.published = true; o.pubAt = o.at; delete arODrafts()[key];
    if (s.L.v) notifyLearner(s.L.v, 'Assignments', 'Final outcome published', `${a.title}: ${o.result} (${o.round}). Your Assessor's overall feedback is on the assignment page.`, 'assignment.' + a.id);
    render(); toast(`Published to the learner: ${o.result}.`); return res;
  };
  MODAL.actions.splice(MODAL.actions.indexOf(pub), 0, { label: 'Save draft', cls: 'btn', fn: () => {
    const w = r3OutWhy(key); if (w) { closeModal(); return r3Deny(String(key), 'save a final outcome draft', w, tasLog); }
    const v = ($('input[name="r3-res"]:checked') || {}).value || '', note = arVal('#rsn'), fb = arVal('#d-ofb');
    if (!v && !note && !fb) { fieldErr('#r3-res', 'Choose Pass or Fail, or write something, before saving a draft'); return false; }
    arODrafts()[key] = { result: v, note, feedback: fb, at: now().toISOString(), by: TME().name, round };
    tasLog('Assessment', `${s.L.name} · ${a.title}`, 'Final outcome draft saved', '—', `${v || 'No result chosen'} (${round}) — draft, not visible to the learner`, '');
    render(); toast('Draft saved. The learner can\'t see it until you publish it.');
  } });
  MODAL.body = MODAL.body.replace('<p class="xs muted">A declared outcome', '<p class="xs muted">Save draft keeps your decision for later; only you can see it. Publish to learner shows the outcome and your overall feedback to the learner straight away. A declared outcome');
  renderModal();
  if (dr && dr.round === round) { const x = $(`input[name="r3-res"][value="${dr.result}"]`); if (x) x.checked = true; if ($('#rsn')) $('#rsn').value = dr.note; if ($('#d-ofb')) $('#d-ofb').value = dr.feedback; }
  return r;
};
// The workspace card: a saved draft says so, and its button continues it
const _outCardAR = r3OutCard;
r3OutCard = function (s) {
  const h = _outCardAR.apply(this, arguments), d = arODrafts()[s.key], o = r3Out(s.key); if (!d || (o && o.round === d.round)) return h;
  return h.replace('>Declare final outcome…</button>', '>Continue the draft decision…</button>').replace(/(<\/p>)/, `$1<p class="small ar-odraft">${ic('edit', 12)} Draft saved ${fdt(d.at)}${d.result ? ': ' + chip(d.result, r3Tone(d.result)) : ''} — not visible to the learner.</p>`);
};

/* ---------- 1. The learner's views of a published outcome ---------- */
const arOut = a => { if (!arMe() || !a) return null; const k = arKeyOf(a); return dOutSeen(k) ? r3Out(k) : null; };
// The Assessor's detailed marking is released with the status change from "Submitted"; Coordinator criterion feedback is published
// on its own (R3) and is shown as soon as it is, so the wording names the Assessor's part when some criterion feedback is already there
const AR_READY = ["You'll be notified when feedback is ready.", "Not yet — your assessor is marking it. You'll be told as soon as it is ready."];
const arNotYet = a => (a && a.status === 'Submitted' ? (r3Judg(arKeyOf(a)).some(j => j.published) ? 'Detailed criterion feedback from your Assessor is not yet available.' : 'Detailed criterion feedback is not yet available.') : '');
const arOutChip = o => `<span class="ar-ochip">${chip('Final outcome: ' + o.result, r3Tone(o.result))}</span>`;
// The assignment page's status card shows it beside the status
const _asgAR = SCREENS.assignment;
SCREENS.assignment = p => {
  const a = p && p.id && W && (W.assignments || []).find(x => x.id === p.id), o = arOut(a); let h = _asgAR(p);
  if (o) h = h.replace('<div class="cf-st-row">', `<div class="cf-st-row"><div class="cf-st ar-ost"><span class="eyebrow">Final outcome</span><div>${chip(o.result, r3Tone(o.result))}</div></div>`);
  // Published before the detailed marking is released: say exactly what isn't available yet (the generic "feedback ready" wording misled)
  const ny = o && arNotYet(a);
  if (ny) h = h.replace(AR_READY[0], ny).replace(AR_READY[1], ny).replace('<p class="xs muted">The outcome is your Assessor', `<p class="small ar-notyet">${ny}</p><p class="xs muted">The outcome is your Assessor`);
  return h;
};
// Progress & Gap Analysis: the Assessment feedback tab and the academic-work columns
const _fbAsgAR = cfFbAsg;
cfFbAsg = function (a) {
  const h = _fbAsgAR.apply(this, arguments), o = arOut(a); if (!o) return h;
  const card = `<div class="ar-lout"><p class="small"><strong>Final outcome:</strong> ${chip(o.result, r3Tone(o.result))} <span class="xs muted">${esc(o.round)} · ${esc(o.by)} (your Assessor) · published ${fd(o.pubAt || o.at)}</span></p>${o.feedback ? `<p class="small"><strong>Overall feedback:</strong> ${esc(o.feedback)}</p>` : ''}${arNotYet(a) ? `<p class="small ar-notyet">${arNotYet(a)}</p>` : ''}</div>`;
  return h.replace('</span></summary>', '</span> ' + arOutChip(o) + '</summary>').replace('<div class="stack" style="gap:8px;margin-top:8px">', '<div class="stack" style="gap:8px;margin-top:8px">' + card);
};
const _progAR = SCREENS.progress;
SCREENS.progress = p => {
  const h = _progAR(p); if (!arMe()) return h;
  const T = cfTpl(h); T.content.querySelectorAll('.cf-wcol li [data-go="assignment"]').forEach(b => { const o = arOut(asgById(b.dataset.id)), li = b.closest('li'); if (o && li) li.insertAdjacentHTML('beforeend', arOutChip(o)); });
  return T.innerHTML;
};
// Assignments list: the Feedback column
const _ragAR = ragSummary;
ragSummary = function (a) { const h = _ragAR.apply(this, arguments), o = S.route === 'assignments' && arOut(a); return o ? h + arOutChip(o) : h; };

/* ---------- 2. References on every editable assignment ---------- */
// CB5 assignments (refsOn) already have the box; the others (seeded, pre-CB5) get the same box while they can be edited.
// Their references are recorded on the learner's copy at submission, with the round they belong to.
const arRefsDone = a => (a.refRounds || []).length ? `<section class="card cb-refs-done"><h3>References</h3>${a.refRounds.map((r, i) => `<div class="small"><span class="xs muted">${esc(r.round || (i ? 'Resubmission ' + i : 'Submission'))} — ${fdt(r.at)}</span>${cfTxt(r.html) ? r.html : '<p><em>No references given</em></p>'}</div>`).join('')}</section>` : '';
const arBox = h => { const k = h.indexOf('<section class="card cf-submit"'), e = k < 0 ? h.lastIndexOf(CF_END) : k; return e < 0 ? h : h.slice(0, e) + '%%REFS%%' + h.slice(e); };
const _sheetAR = answerSheet;
answerSheet = function (a) {
  let h = _sheetAR.apply(this, arguments); if (!cfLearner()) return h;
  h = arChipSwap(h, a).replace('Your answers save automatically as you type and at least every 10 seconds.', 'Your answers are kept on this page as you type. Press <strong>Save draft</strong> to keep them in this browser if you refresh or sign out.');
  return a.refsOn ? h : arBox(h).replace('%%REFS%%', cbRefBox(a));
};
const _resubAR = resubView;
resubView = function (a) { const h = cfLearner() ? arChipSwap(_resubAR.apply(this, arguments), a) : _resubAR.apply(this, arguments); return a.refsOn || !cfLearner() ? h : arRefsDone(a) + arBox(h).replace('%%REFS%%', cbRefBox(a)); };
const _lockedAR = lockedView;
lockedView = function (a) { return _lockedAR.apply(this, arguments) + (a.refsOn ? '' : arRefsDone(a)); };
const _reviewAR = ACT.reviewSubmit;
ACT.reviewSubmit = el => {
  const r = _reviewAR(el), a = asgById(el && el.dataset && el.dataset.id); if (!MODAL || !a || a.refsOn || !/^Review your/.test(MODAL.title || '')) return r;
  const v = W.drafts[cbRefKey(a)] || ''; MODAL.body = MODAL.body.replace('<p class="small muted">When you press Submit', `<div class="q cb-refs-rev"><div class="q-h"><span class="q-t"><strong>References</strong></span></div><div style="padding:6px">${cfTxt(v) ? v : '<em>No references given</em>'}</div></div><p class="small muted">When you press Submit`); renderModal();
  return r;
};
const _finAR = finaliseSubmit;
finaliseSubmit = function (a, resub, at) {
  if (a && !a.refsOn) { const n = (a.refRounds = a.refRounds || []).length; a.refRounds.push(Object.freeze({ at, html: W.drafts[`${a.id}.refs.${n}`] || '', round: resub ? 'Resubmission ' + (a.resubUsed + 1) : 'Submission' })); }
  const res = _finAR.apply(this, arguments); arForget(a); return res;
};
// Staff: the allocated Assessor and the Coordinator see them with the answers (CB5 / CF already do for refsOn)
// (the submission as each portal already scopes it: the Assessor's marking, the Coordinator's batches)
const AR_SUB = { 't-mark': key => r3StaffSub(key), 'c-sub': key => (S.portal === 'coord' && typeof mySubmissions === 'function' ? mySubmissions(true).find(x => x.key === key) : null) };
const arStaffAsg = (r, key) => { const s = AR_SUB[r](key), w = s && s.L.lid && chWorldByLid(s.L.lid), id = String(key).split('~')[1]; return w ? (w.assignments || []).find(x => x.id === id) : null; };
Object.keys(AR_SUB).forEach(r => { const f = SCREENS[r]; SCREENS[r] = p => { const h = f(p), a = p && p.id && !/cb-refs-done/.test(h) ? arStaffAsg(r, p.id) : null; return a && !a.refsOn && (a.refRounds || []).length ? h + arRefsDone(a) : h; }; });
// Course Builder: the References section is no longer optional (it was a per-assignment setting, PD-CB-37)
const _setAR = cbAsgSettings;
cbAsgSettings = function () { return _setAR.apply(this, arguments).replace(/<dt>References section<\/dt><dd>[\s\S]*?<\/dd>/, '<dt>References section</dt><dd>Always — after the last question <span class="xs muted">(every assignment, confirmed 31 Oct 2026)</span></dd>'); };
const _cbSetAR = ACT.cbAsgSet;
ACT.cbAsgSet = el => {
  if (!(el && el.dataset && el.dataset.k === 'refs')) return _cbSetAR(el);
  const d = s2Def(el.dataset.id); if (d) s2Log(d, 'Blocked: change references (always on)', d.refs ? 'On' : 'Off', d.refs ? 'On' : 'Off', 'Every assignment has a References section');
  toast('Every assignment has a References section — it can\'t be removed.', 'info'); return false;
};

/* ---------- 3. Save draft: this browser only (prototype) ---------- */
const AR_PFX = 'ilumin.proto.draft.v1|';
const arLS = () => { try { return window.localStorage || null; } catch (e) { return null; } };
// The release: the assignment ID with its questions (a release with other questions is another draft); the brief version isn't part
// of it, so a brief update keeps the draft (S2-06)
const arHash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
const arRel = a => a.id + '.' + arHash(a.qs.map(q => q.id + ':' + q.text).join('\n'));
const arProg = () => `${(typeof s3ProgOfW === 'function' && s3ProgOfW(W)) || W.nvq.title}@${W.nvq.progVersion || W.nvq.version || '-'}`;
const arKey = a => [AR_PFX + ((typeof FX !== 'undefined' && FX.mode) || 'legacy'), W.me.id, arProg(), arRel(a)].join('|');
// The answer boxes open in the current round (all questions, or the ones needing rework) and their draft keys
const arRound = a => (a.status === 'Resubmission Required' ? a.resubUsed + 1 : 0);
const arQs = a => (a.status === 'Resubmission Required' ? a.qs.filter(q => q.state === 'rework') : a.qs).map(q => [q, `${a.id}.${q.id}.${a.status === 'Resubmission Required' ? q.rounds.length : 0}`]);
const arOpen = a => ['Not Started', 'Resubmission Required'].includes(a.status);
// Restored HTML keeps only text formatting (the stored copy could have been edited outside the page)
const AR_TAGS = /^(P|BR|B|STRONG|I|EM|U|UL|OL|LI|A|DIV|SPAN)$/;
function arClean(h) {
  const t = cfTpl(String(h || ''));
  const walk = n => [...n.childNodes].forEach(c => {
    if (c.nodeType === 3) return;
    if (c.nodeType !== 1 || /^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|TEMPLATE|SVG|MATH)$/i.test(c.tagName)) return c.remove();
    walk(c); if (!AR_TAGS.test(c.tagName)) return c.replaceWith(...c.childNodes);
    [...c.attributes].forEach(x => { if (!(c.tagName === 'A' && x.name === 'href' && /^https?:\/\//i.test(x.value))) c.removeAttribute(x.name); });
  });
  walk(t.content); return t.innerHTML;
}
// File names restored from a draft that haven't been attached again (the files themselves were never stored)
const arPending = a => { const re = (W.arRe || {})[a.id] || {}; return arQs(a).map(([q, k]) => [q, (re[q.id] || []).filter(f => !(W.drafts['att.' + k] || []).includes(f))]).filter(([, l]) => l.length); };
function arRecord(a) {
  const answers = {}, files = {};
  arQs(a).forEach(([q, k]) => { if (W.drafts[k] != null) answers[q.id] = W.drafts[k]; const l = (W.drafts['att.' + k] || []).slice(); arPending(a).filter(([x]) => x === q).forEach(([, p]) => l.push(...p)); if (l.length) files[q.id] = [...new Set(l)].map(String); });
  return { v: 1, savedAt: now().toISOString(), learner: W.me.id, prog: arProg(), rel: arRel(a), status: a.status, round: arRound(a), answers, refs: W.drafts[cbRefKey(a)] || '', files };
}
function arForget(a) { if (!a || !W || !W.me) return; const ls = arLS(); try { if (ls) ls.removeItem(arKey(a)); } catch (e) { /* storage unavailable: nothing to remove */ } if (W.arRe) delete W.arRe[a.id]; if (W.arFrom) delete W.arFrom[a.id]; }
// Restore once per learner world and assignment, before the learner's pages draw (not while a demo dataset is being built)
function arHydrate() {
  if (AR.busy || !S.signedIn || !arMe()) return;
  const ls = arLS(); W.arHyd = W.arHyd || {};
  (W.assignments || []).forEach(a => {
    if (W.arHyd[a.id]) return; W.arHyd[a.id] = true; if (!ls) return;
    let rec = null; try { rec = JSON.parse(ls.getItem(arKey(a)) || 'null'); } catch (e) { rec = null; }
    if (!rec || rec.learner !== W.me.id) return;
    if (!arOpen(a)) { arForget(a); return; } // submitted since: the submission stands, the old draft goes
    if (a.closed || rec.status !== a.status || rec.round !== arRound(a) || rec.rel !== arRel(a)) return;
    arQs(a).forEach(([q, k]) => { if (typeof (rec.answers || {})[q.id] === 'string') W.drafts[k] = arClean(rec.answers[q.id]); });
    if (typeof rec.refs === 'string') W.drafts[cbRefKey(a)] = arClean(rec.refs);
    const f = {}; Object.entries(rec.files || {}).forEach(([q, l]) => { if (Array.isArray(l) && a.qs.some(x => x.id === q)) f[q] = l.map(String); });
    (W.arRe = W.arRe || {})[a.id] = f; (W.arFrom = W.arFrom || {})[a.id] = rec.savedAt; W.drafts[cfSavedKey(a)] = rec.savedAt;
  });
}
const _renderAR = render;
render = function () { arHydrate(); return _renderAR.apply(this, arguments); };
const _fxlAR = fxLoadClient;
fxLoadClient = function () { AR.busy = true; try { return _fxlAR.apply(this, arguments); } finally { AR.busy = false; } };
// Save draft: the page's answers and References, then this browser's storage; a failure says so and claims nothing
ACT.cfSaveDraft = el => {
  const a = asgById(el && el.dataset && el.dataset.id); if (!a || !arMe()) return false;
  if (!arOpen(a) || a.closed || W.nvq.status === 'Discontinued') { toast('This assignment isn\'t open for editing.', 'err'); return false; }
  $$('#main .rte-body[data-key]').forEach(b => { if (b.dataset.key.startsWith(a.id + '.') && b.getAttribute('contenteditable') === 'true') W.drafts[b.dataset.key] = b.innerHTML; });
  const rec = arRecord(a), ls = arLS(), st = W.arState = W.arState || {};
  try { if (!ls) throw new Error('no storage'); ls.setItem(arKey(a), JSON.stringify(rec)); } catch (e) {
    st[a.id] = 'fail'; arPaint(a);
    toast('Your draft couldn\'t be saved in this browser (storage is unavailable or full). Your work is still on this page — don\'t refresh or close it.', 'err'); return false;
  }
  W.drafts[cfSavedKey(a)] = rec.savedAt; st[a.id] = 'saved'; DIRTY = false; clearTimeout(SAVE_T); arPaint(a);
  toast(arPending(a).length || Object.keys(rec.files).length ? 'Draft saved locally in this browser. Your answers and references are kept; attached files must be reattached after a refresh.' : 'Draft saved locally in this browser. Your answers and references are kept until you submit.');
};
// The draft status (AR final review): what is kept where, never "saved" unless Save draft wrote it to this browser. Typing changes
// only this page ("Unsaved changes"); the page's own in-memory auto-save no longer shows "Saved" on a learner's assignment.
const AR_ST = {
  none: ['edit', 'No draft saved yet', 'Press Save draft to keep your work in this browser if you refresh or sign out.'],
  dirty: ['alert', 'Unsaved changes', 'Your changes are on this page only. Press Save draft to keep them if you refresh or sign out.'],
  saved: ['check', 'Draft saved locally', 'Saved in this browser on this device (prototype). It comes back after a refresh.'],
  fail: ['alert', 'Save failed', 'This browser couldn\'t store your draft. Your work is still on this page — don\'t refresh or close it.'],
};
const arStOf = a => ((W.arState || {})[a.id]) || (W.drafts[cfSavedKey(a)] ? 'saved' : 'none');
const arStTxt = a => { const k = arStOf(a), at = W.drafts[cfSavedKey(a)]; return AR_ST[k][1] + (k === 'saved' && at ? ' ' + fdt(at) : k === 'dirty' && at ? ' — last saved locally ' + fdt(at) : ''); };
const arChip = a => { const k = arStOf(a), [i, , tip] = AR_ST[k]; return `<span id="savechip" class="save-chip ar-chip ar-${k}" data-sv="ar-${k}" role="status" aria-live="polite" aria-atomic="true" title="${esc(tip)}">${ic(i, 13)}${esc(AR_ST[k][1] + (k === 'saved' && W.drafts[cfSavedKey(a)] ? ' ' + fmt(W.drafts[cfSavedKey(a)], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''))}</span>`; };
const arChipA = () => { if (!arMe() || S.route !== 'assignment' || !S.params) return null; const a = asgById(S.params.id); return a && arOpen(a) && !a.closed ? a : null; };
function arPaint(a) {
  const c = $('#savechip'); if (c) c.outerHTML = arChip(a);
  const s = $('#main .cf-saved'); if (s) { s.textContent = arStTxt(a); s.classList.toggle('ar-fail', arStOf(a) === 'fail'); s.classList.toggle('ar-dirty', arStOf(a) === 'dirty'); }
}
const arChipSwap = (h, a) => (arChipA() === a ? h.replace(/<span id="savechip"[\s\S]*?<\/span>(?=<button)/, arChip(a)) : h);
const _dsAR = doSave;
doSave = function () { const a = arChipA(); if (!a) return _dsAR.apply(this, arguments); (W.arState = W.arState || {})[a.id] = 'dirty'; clearTimeout(SAVE_T); SAVE_T = setTimeout(() => { DIRTY = false; }, 700); arPaint(a); };
const _ssAR = setSave;
setSave = function () { const a = arChipA(); return a ? arPaint(a) : _ssAR.apply(this, arguments); };
const _cnAR = chipNorm;
chipNorm = function (el) { return el && el.classList && el.classList.contains('ar-chip') ? undefined : _cnAR.apply(this, arguments); };
// The submission box: a restored draft, files to reattach, and the prototype note
const _subAR = cfSubmitBox;
cfSubmitBox = function (a) {
  const h = _subAR.apply(this, arguments), pend = arPending(a), from = (W.arFrom || {})[a.id];
  const re = pend.length ? `<div class="note b-amber ar-reattach" role="status">${ic('clip2')}<div class="small"><strong>Please reattach your files.</strong> Your saved draft listed these files, but this browser doesn't keep the files themselves, so they aren't attached:<ul class="list small">${pend.map(([q, l]) => `<li><span class="strong">Q${a.qs.indexOf(q) + 1}</span> ${l.map(esc).join(', ')}</li>`).join('')}</ul></div></div>` : '';
  const rs = from ? `<p class="xs ar-restored">${ic('check', 12)} Draft restored from this browser (saved ${fdt(from)}).</p>` : '';
  const proto = '<p class="xs muted ar-proto">Prototype only: Save draft keeps your answers, references and the names of attached files in this browser on this device — not the files themselves, and not on the Academy\'s servers. Reset demo clears it. A live system saves drafts securely to your account.</p>';
  const k = arStOf(a);
  return h.replace('</h3>', '</h3>' + rs + re).replace(/<\/section>$/, proto + '</section>').replace(/<span class="xs muted cf-saved"([^>]*)>[^<]*<\/span>/, `<span class="xs muted cf-saved${k === 'fail' ? ' ar-fail' : k === 'dirty' ? ' ar-dirty' : ''}"$1>${esc(arStTxt(a))}</span>`);
};
// Reset demo removes every draft this prototype saved in the browser (all datasets)
function arClearAll() { const ls = arLS(); if (!ls) return; try { const ks = []; for (let i = 0; i < ls.length; i++) ks.push(ls.key(i)); ks.filter(k => k && k.startsWith(AR_PFX)).forEach(k => ls.removeItem(k)); } catch (e) { /* storage unavailable */ } }
const _resetAR = ACT.resetDemo;
ACT.resetDemo = function () { arClearAll(); return _resetAR.apply(this, arguments); };
const _drResetAR = ACT.drReset;
ACT.drReset = () => { const r = _drResetAR(); if (MODAL && /Reset the demo/.test(MODAL.title || '')) { MODAL.body = MODAL.body.replace('— new learners, batches, submissions, payments and decisions.', '— new learners, batches, submissions, payments and decisions, and the assignment drafts saved in this browser.'); renderModal(); } return r; };
const _drPanelAR = drPanel;
drPanel = function () { return _drPanelAR.apply(this, arguments).replace('Discards every change made in this browser tab.', 'Discards every change made in this browser tab, including saved assignment drafts.'); };

/* ---------- Records ---------- */
UXC.push(['AR', 'Assignment outcome, References and saved drafts (31 Oct 2026)', [
  'Final Pass / Fail: the allocated Assessor can save a draft decision (only they see it) or publish it. A published outcome is shown to the learner straight away — on the assignment page, in Progress & Gap Analysis and in the Assignments list — with the overall feedback and a notification. No Coordinator release or Academic Admin approval; the marking release never publishes a draft.',
  'References: every assignment that can still be edited has one References box after the last question, including the seeded ones; the Course Builder no longer offers to remove it. Submitted work is unchanged and isn\'t reopened. References are kept with each submission round and shown to the learner, the Assessor and the Coordinator.',
  'Save draft (prototype): keeps the answers, References and the names of attached files in this browser, for this learner, programme version and assignment release only. A refresh or a new sign-in restores them; another learner never sees them; submitting or Reset demo removes them. Files must be reattached after a refresh. If the browser can\'t store it, Save draft says so.',
  'Draft status (final review): "No draft saved yet", "Unsaved changes", "Draft saved locally 09:15" (only after Save draft wrote to this browser) or "Save failed" — the page\'s in-memory auto-save no longer shows "Saved".',
  'Outcome before detailed feedback (final review): a published Pass / Fail and overall feedback show at once; "Detailed criterion feedback is not yet available." replaces "You\'ll be notified when feedback is ready".']]);
