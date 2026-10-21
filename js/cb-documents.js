/* ============================================================
   CB3 — Offer Letter & Documents (21 Oct 2026; PD-CB-20…24 in PROVISIONAL-DECISIONS.md).
   Section 6 of the unified course builder holds all of a programme's document configuration, in two areas:
   - Offer letter: the existing versioned offer letter (S4-09, E2) — the current template, upload a new version (its own text),
     preview, every earlier version, restore an earlier version as a NEW version, and which versions learners signed. The client
     confirmed (21 Oct 2026) that the "Course Contract" IS this offer letter: there is no separate contract, agreement or signing step.
   - Required enrolment documents: the existing S4a checklist (mandatory / optional, formats, maximum size, region, guidance,
     expiry) with a real version history — each change keeps a frozen copy of the version it produced, so earlier versions can be
     read; applicants keep the version pinned when their sign-up started (checklistV).
   The CH-8 quick-pick checkbox list is no longer an editor: it isn't shown, and saving it directly is refused (logged).
   Nothing here is a new store for letters or checklists: STORE.chLetters and S4().lists stay the records; the checklist history
   (S4().ckHist) only adds frozen copies. Loads after cb-details.js.
   ============================================================ */
'use strict';

/* ---------- Offer letter versions are history: the seeded first versions are frozen too (uploads already were) ---------- */
const _letterSeedCB3 = chLetterSeed;
chLetterSeed = function () { const L = _letterSeedCB3.apply(this, arguments); Object.values(L).forEach(l => l.forEach(x => e1Freeze(x))); return L; };

/* ---------- Signed letters: exact saved copies versus historical records without one ----------
   Since S4-09, signing keeps a frozen personalised copy (sig.snapshot). Signatures from before that (the seeded Aisha Rahman and
   Grace Mensah) have only their recorded signature metadata and the version number: no personalised copy was kept. Those are
   never shown as a signed copy — "View historical template" shows the version's template with its merge fields unfilled and the
   recorded signature metadata as stored, and says the exact copy wasn't kept. Nothing personal, no signature and no payment terms
   are filled in. */
const cbSnapOf = w => !!(w && w.signup && w.signup.sig && w.signup.sig.snapshot);
// Who may open a learner's signed letter: the learner themselves, and admin-portal staff whose role opens admissions, learner or
// programme pages (the pages that show it); nobody in another portal
const CB_LETTER_ROUTES = ['a-admissions', 'a-learners', 'a-learner', 'a-programmes'];
function cbCanSeeLetter(w) {
  if (!w || !S.signedIn) return false;
  if (S.portal === 'learner') return W === w;
  if (S.portal !== 'admin') return false;
  const can = r => (typeof isFin === 'function' && isFin()) ? FIN_ROUTES.has(r) : (typeof isAca === 'function' && isAca()) ? ACA_ROUTES.has(r) : (typeof isBiz === 'function' && isBiz()) ? BIZ_ROUTES.has(r) : true;
  return CB_LETTER_ROUTES.some(can);
}
function cbLetterRefuse(w, what) {
  logA('Admissions', w && w.me ? `${chFullName(w)} (${w.me.id})` : '—', 'Blocked: ' + what, '—', '—', 'Not allowed to view this learner\'s offer letter');
  toast('You can\'t view this learner\'s offer letter.', 'err');
}
const _signedPdfCB3 = ACT.chSignedPdf;
ACT.chSignedPdf = el => {
  const w = chW(el && el.dataset && el.dataset.v); if (!w || !w.signup || !w.signup.sig) return;
  if (!cbCanSeeLetter(w)) return cbLetterRefuse(w, 'view signed offer letter');
  if (!cbSnapOf(w)) return ACT.cbHistTemplate(el); // no exact copy was kept: never presented as one
  return _signedPdfCB3(el);
};
ACT.cbHistTemplate = el => {
  const w = chW(el && el.dataset && el.dataset.v), s = w && w.signup && w.signup.sig; if (!s) return;
  if (!cbCanSeeLetter(w)) return cbLetterRefuse(w, 'view historical offer letter template');
  const L = chLetters(chProgOf(w).id).find(x => x.v === s.v);
  openModal({ title: `Historical template — offer letter version ${s.v}`, sub: `${esc(chFullName(w))} · ${esc(w.me.id)} · not the signed copy`, size: 'lg',
    body: `<div class="note b-amber cb-hist-tpl" role="status">${ic('alert')}<div class="small"><strong>This is not the learner's signed copy.</strong> This signature was recorded before signed copies were kept, so the exact personalised letter they signed wasn't retained. Below is the template of the version they signed, with its merge fields unfilled, and the signature record exactly as stored.</div></div>
      <dl class="kv cb-sigrec"><dt>Signed as</dt><dd>${esc(s.name || '—')}</dd><dt>Signed</dt><dd>${s.at ? fdt(s.at) : '—'}</dd><dt>IP address (recorded)</dt><dd>${esc(s.ip || '—')}</dd><dt>Offer letter version</dt><dd>Version ${s.v}</dd><dt>Exact signed copy</dt><dd>Not kept</dd></dl>
      ${L ? `<h3>Template of version ${s.v}</h3>${chLetterHtml(L, { raw: true })}` : `<p class="small">The text of version ${s.v} isn't available.</p>`}`,
    actions: [{ label: 'Close', cls: 'btn-primary' }] });
};
// The sign-up summary (learner, application, Learner 360): accurate wording for a record without an exact copy
const _susCB3 = chSignupSummary;
chSignupSummary = function (w) {
  const h = _susCB3.apply(this, arguments); if (!w || !w.signup || !w.signup.sig || cbSnapOf(w)) return h;
  return h.replace(`data-act="chSignedPdf" data-v="${w.v}">View signed PDF</button>`, `data-act="cbHistTemplate" data-v="${w.v}">View historical template</button> <span class="xs muted">(the exact signed copy wasn't kept)</span>`);
};

/* ---------- Offer letter: who signed which version ---------- */
// Every learner with a signed offer letter for this programme: the version, and whether the exact copy was kept with the signature
const cbSigners = pr => Object.entries(STORE.worlds || {}).filter(([, w]) => w && w.signup && w.signup.sig && w.nvq && chProgOf(w).id === pr.id)
  .map(([k, w]) => ({ k, name: chFullName(w), id: w.me.id, v: (w.signup.sig.snapshot || {}).v || w.signup.sig.v, at: w.signup.sig.at, snap: cbSnapOf(w) }));
// Applicants whose sign-up is pinned to a letter version but not yet signed
const cbPinned = pr => Object.values(STORE.worlds || {}).filter(w => w && w.signup && !w.signup.sig && w.signup.letterV && w.nvq && chProgOf(w).id === pr.id);
function cbSignedCard(pr) {
  const sg = cbSigners(pr), pin = cbPinned(pr), l = chLetters(pr.id), names = s4CanLetter();
  const by = (v, snap) => sg.filter(x => x.v === v && x.snap === snap).length, pv = v => pin.filter(w => w.signup.letterV === v).length;
  return `<section class="card cb-signed"><h2>Who received and signed each version</h2>
    <p class="small muted">A learner signs the version current when their sign-up started. Since signed copies have been kept, the exact personalised letter and the signature are saved with the learner and never change when a new version is uploaded or restored. Older signatures have only their signature record and version number: their exact copy wasn't kept.</p>
    ${l.length ? `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Version</th><th class="r">Signed — exact copy saved</th><th class="r">Signed — template only (copy not kept)</th><th class="r">Sign-ups in progress</th></tr></thead><tbody>${l.slice().reverse().map(x => `<tr data-v="${x.v}"><td>Version ${x.v}${x === l[l.length - 1] ? ' ' + chip('Current', 'green') : ''}</td><td class="r">${by(x.v, true)}</td><td class="r">${by(x.v, false)}</td><td class="r">${pv(x.v)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${!sg.length ? '<p class="small">No learner has signed this programme\'s offer letter yet.</p>' : names ? `<h3>Signatures</h3><div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Learner</th><th>Student ID</th><th>Version signed</th><th>Signed</th><th>Record</th><th></th></tr></thead><tbody>${sg.map(x => `<tr data-k="${esc(x.k)}"><td>${esc(x.name)}</td><td class="mono small">${esc(x.id)}</td><td>Version ${x.v}</td><td>${x.at ? fdt(x.at) : '—'}</td><td>${x.snap ? chip('Exact signed copy saved', 'green') : chip('Template only — exact copy not kept', 'amber')}</td><td>${x.snap ? `<button class="btn btn-sm btn-ghost" data-act="chSignedPdf" data-v="${esc(x.k)}">View signed copy</button>` : `<button class="btn btn-sm btn-ghost" data-act="cbHistTemplate" data-v="${esc(x.k)}">View historical template</button>`}</td></tr>`).join('')}</tbody></table></div>` : `<p class="small muted">${ic('lock', 12)} Learner names and signed copies are shown to programme administrators only.</p>`}</section>`;
}
const cbLetterNote = () => `<p class="small cb-contract-note">${ic('info', 14)} <strong>This offer letter is the course contract.</strong> Applicants read and sign it in step 3 of their sign-up; there is no separate contract to sign.</p>`;
function cbLetterPanel(pr) {
  return cbLetterNote() + chLetterTab(pr) + cbSignedCard(pr);
}

/* ---------- Required enrolment documents: a real version history ---------- */
const cbCkHist = pid => ((S4().ckHist = S4().ckHist || {})[pid] = S4().ckHist[pid] || []);
const cbCkCopy = L => e1Freeze(JSON.parse(JSON.stringify(L.items)));
// The version in force is recorded before anything changes it (the list in use before versions were kept has no date or author)
function cbCkSeed(pid) {
  const L = s4List(pid), h = cbCkHist(pid);
  if (!h.some(x => x.v === L.v)) h.push(e1Freeze({ v: L.v, at: L.fixture ? null : now().toISOString(), by: L.fixture ? null : '—', action: L.fixture ? 'The list in use before checklists were versioned' : 'Version in force when its history began', items: cbCkCopy(L) }));
}
const _ckChangedCB3 = s4CkChanged;
s4CkChanged = function (pr, action, before, after, r) {
  const res = _ckChangedCB3.apply(this, arguments), L = s4List(pr.id);
  cbCkHist(pr.id).push(e1Freeze({ v: L.v, at: now().toISOString(), by: ADMIN.me ? ADMIN.me.name : '—', action, detail: after, reason: r || '', items: cbCkCopy(L) }));
  return res;
};
// Every checklist action records the version in force before it can change (direct calls included)
['s4CkAdd', 's4CkEdit', 's4CkRetire', 's4CkRestore', 's4CkMove'].forEach(n => { const f = ACT[n]; if (typeof f !== 'function') return; ACT[n] = function (el) { const pid = el && el.dataset && el.dataset.p; if (pid && s4Pr(pid)) cbCkSeed(pid); return f.apply(this, arguments); }; });
const cbCkApplicants = (pid, v) => Object.values(STORE.worlds || {}).filter(w => w && w.signup && w.signup.checklistV === v && w.nvq && chProgOf(w).id === pid).length;
function cbCkHistoryCard(pr) {
  cbCkSeed(pr.id); const h = cbCkHist(pr.id).slice().sort((a, b) => b.v - a.v), cur = s4List(pr.id).v;
  return `<section class="card cb-ckhist"><h2>Checklist version history</h2><p class="small muted">Each change makes a new version for new applicants; an application keeps the version it started with. Earlier versions are kept read-only.</p>
    <div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Version</th><th>Changed</th><th>By</th><th>What changed</th><th class="r">Active documents</th><th class="r">Applicants on it</th><th></th></tr></thead><tbody>${h.map(x => `<tr data-v="${x.v}"><td>Version ${x.v}${x.v === cur ? ' ' + chip('Current', 'green') : ''}</td><td>${x.at ? fdt(x.at) : '<span class="muted">No recorded date</span>'}</td><td>${x.by ? esc(x.by) : '<span class="muted">—</span>'}</td><td class="small">${esc(x.action)}${x.detail ? `<div class="xs muted">${esc(String(x.detail).slice(0, 140))}</div>` : ''}</td><td class="r">${x.items.filter(i => i.status === 'Active').length}</td><td class="r">${cbCkApplicants(pr.id, x.v)}</td><td><button class="btn btn-sm btn-ghost" data-act="cbCkView" data-p="${pr.id}" data-v="${x.v}">View</button></td></tr>`).join('')}</tbody></table></div></section>`;
}
ACT.cbCkView = el => {
  const pr = s4Pr(el.dataset.p), x = pr && cbCkHist(pr.id).find(y => y.v === +el.dataset.v); if (!x) return;
  openModal({ title: `Required enrolment documents — version ${x.v}`, sub: esc(pr.title), size: 'lg', body: `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Document</th><th>Mandatory</th><th>Formats</th><th>Max size</th><th>Has expiry</th><th>Applies to</th><th>Guidance</th><th>Status</th></tr></thead><tbody>${x.items.map(i => `<tr class="${i.status === 'Retired' ? 'muted' : ''}"><td>${esc(i.name)}</td><td>${i.mand ? 'Mandatory' : 'Optional'}</td><td>${esc(i.formats)}</td><td>${esc(i.max)}</td><td>${i.expiry ? 'Yes' : 'No'}</td><td>${esc(i.applies)}</td><td class="small">${esc(i.guide || '')}</td><td>${esc(i.status)}</td></tr>`).join('')}</tbody></table></div><p class="xs muted">Read-only: a past version can't be changed.</p>`, actions: [{ label: 'Close', cls: 'btn-primary' }] });
};
function cbDocsPanel(pr) {
  return s4ChecklistCard(pr, { title: 'Required enrolment documents' }) + cbCkHistoryCard(pr);
}

/* ---------- The CH-8 quick-pick list is not an editor any more ---------- */
ACT.ch8SaveDocs = el => {
  const pr = ch8Pr(el && el.dataset && el.dataset.id);
  logA('Admissions & Documents', pr ? `${pr.title} — document checklist` : 'Document checklist', 'Blocked: legacy checklist (read-only)', '—', '—', 'Edit the Required enrolment documents list in Offer Letter & Documents');
  toast('This old quick-pick list is read-only. Edit the Required enrolment documents list instead.', 'err');
};

/* ---------- Records ---------- */
UXC.push(['CB3', 'Offer Letter & Documents (21 Oct 2026)', [
  'Section 6 is now "Offer Letter & Documents", with two areas: Offer letter and Required enrolment documents. The client confirmed that the "Course Contract" is the offer letter: there is no separate contract, agreement or signing step, and the builder no longer mentions one.',
  'Offer letter (the existing versioned letter): the current template, Upload new version (with its own text), Preview, every earlier version (preview), Restore as a new version, and a new "Who received and signed each version" table — signed and in-progress counts per version, and for programme administrators the learners who signed with "View signed copy" (the exact copy kept with the signature).',
  'Required enrolment documents (the existing checklist): mandatory / optional, formats, maximum size, region, guidance, expiry; now with a version history — each change keeps a read-only copy of the version it produced ("View"), with the number of applicants on each version. Applicants keep the version their sign-up started with.',
  'The old quick-pick checkbox list of new programmes is no longer shown or saved (refused and logged): the checklist has one editor.',
  'Correction: signatures recorded before signed copies were kept (Aisha Rahman, Grace Mensah) are marked "Template only — exact copy not kept" and offer "View historical template" (the version\x27s template with merge fields unfilled, the stored signature record, and a statement that the exact copy wasn\x27t retained) — never "View signed copy". Only the learner and staff whose role opens admissions, learner or programme pages can open a learner\x27s letter; others are refused and logged.']]);
const _aIdxCB3 = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxCB3(p) + `<section class="card idx-sec"><h2>CB3 — Offer Letter &amp; Documents</h2><ul class="idx-list">${[
  chIdxLi('Level 3 Diploma — Offer letter (versions, signed copies)', { act: 'aJump', t: 'a-programmes.NV-L3.letter' }, 'CB3 — the offer letter is the course contract.'),
  chIdxLi('Level 3 Diploma — Required enrolment documents (version history)', { act: 'aJump', t: 'a-programmes.NV-L3.docs' }, 'CB3 — one checklist, versioned.'),
  chIdxLi('New programme NV-N1 (Draft) — Offer Letter & Documents', { act: 'aJump', t: 'a-programmes.NV-N1.documents' }, 'CB3 — a new course before its first letter version.')].join('')}</ul></section>`;
