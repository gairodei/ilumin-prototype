/* ============================================================
   L3-A — Signed offer-letter issuer integrity (7 Nov 2026; PD-L3A-* in PROVISIONAL-DECISIONS.md). Loads after cbr-builder.js
   (the outermost suSign wrapper) and before sec1-access.js.
   The signed copy (sig.snapshot, S4-09) kept the text, version, file, name, Student ID and payment wording, but the letterhead,
   watermark, signatory and declaration came from code constants when the letter was drawn, and the learner's current name and
   ID were filled in. Changing either would have changed how a signed letter looks.
   - Signing now adds to the frozen snapshot the issuer the applicant saw (chIssuerFor: the one Academy issuer for every programme
     and fee option — no contracting entity was invented or renamed) and the contract it was signed under: programme ID and
     version, fee option, delivery mode, plan version, learner type and letter version/file. Nothing already in it changes.
   - A signed letter is drawn from its snapshot only: its issuer, the name and Student ID signed, its text and payment wording.
   - A snapshot made before this has no issuer. It is never rewritten: it is shown with the issuer every letter carried until
     7 Nov 2026 (CH_ISSUER_AS_BUILT, fixed in the code then), and says so — a compatibility display, not a stored record.
   - Records with no snapshot at all keep cb-documents' "historical template" view, with the same labelled issuer.
   Access is unchanged: cbCanSeeLetter (the learner, or admin staff whose role opens the admissions, learner or programme pages)
   runs inside these wrappers before anything is drawn. Production must keep signed documents server-side.
   ============================================================ */
'use strict';

// What the snapshot records about the contract (read from the sign-up's own frozen records, never from current settings)
function l3aContract(w, s) {
  const su = w.signup || {}, pl = su.plan || {}, o = pl.opt || null, P = pl.cb8 || null, pr = chProgOf(w);
  return Object.freeze({
    prog: pr.id || null, progVersion: (w.nvq && w.nvq.progVersion) || null,
    optId: o ? o.id : P ? P.opt.id : null, optLabel: o ? o.label : P ? P.opt.label : null,
    mode: (o && o.mode) || (P && P.opt.mode) || null, planV: P ? P.planV : null,
    lt: su.cbrLetter ? su.cbrLetter.lt : null, letterV: s.v, letterFile: s.snapshot ? s.snapshot.file : null,
  });
}
const l3aIssuerRec = w => Object.freeze({ ...chIssuerFor(w), basis: 'The Academy issuer: one for every programme and fee option (no per-option contracting entity is configured)' });
const l3aSnapIssuer = s => (s && s.snapshot && s.snapshot.issuer) || null;

/* ---------- Signing: the issuer and contract go into the frozen snapshot ---------- */
const _signL3A = ACT.suSign;
ACT.suSign = function () {
  const w = W, had = w && w.signup && w.signup.sig, iss = w && w.signup ? l3aIssuerRec(w) : null; // as shown on the sign step
  const r = _signL3A.apply(this, arguments), s = w && w.signup && w.signup.sig;
  if (s && s !== had && s.snapshot && !s.snapshot.issuer) {
    s.snapshot = Object.freeze({ ...s.snapshot, issuer: iss, contract: l3aContract(w, s) });
    logA('Admissions', `${chFullName(w)} (${w.me.id})`, 'Signed offer letter recorded', '—', `Version ${s.v} · issued by ${iss.name}${s.snapshot.contract.mode ? ' · ' + s.snapshot.contract.mode : ''}`, 'Issuer, signatory and declaration kept with the signature');
  }
  return r;
};

/* ---------- Drawing a signed letter: only from its snapshot ---------- */
let L3A_CTX = null;
const l3aWith = (ctx, f) => { const k = L3A_CTX; L3A_CTX = ctx; try { return f(); } finally { L3A_CTX = k; } };
const L3A_ASBUILT_NOTE = `<div class="note b-amber l3a-compat" role="status">${ic('info')}<div class="small"><strong>Issuer details weren't stored with this signature.</strong> It was signed before 7 Nov 2026, when the letterhead, signatory and declaration were fixed in the code. They are shown as that code showed every offer letter (${esc(CH_ISSUER_AS_BUILT.name)}) — a compatibility display, not a stored record.</div></div>`;
const _letterHtmlL3A = chLetterHtml;
chLetterHtml = function (letter, o = {}) {
  const c = L3A_CTX; if (!c || !letter) return _letterHtmlL3A.apply(this, arguments);
  const h = _letterHtmlL3A.call(this, letter, c.snap ? { ...o, name: c.snap.name, sid: c.snap.sid, issuer: c.issuer } : { ...o, issuer: c.issuer });
  return (c.compat ? L3A_ASBUILT_NOTE : '') + h + (c.snap && !c.compat ? `<p class="xs muted l3a-iss">Issued by ${esc(c.issuer.name)} · signatory ${esc(c.issuer.signatory)} — recorded with the signature.</p>` : '');
};
const _signedPdfL3A = ACT.chSignedPdf;
ACT.chSignedPdf = el => {
  const w = chW(el && el.dataset && el.dataset.v), s = w && w.signup && w.signup.sig;
  if (!s || !s.snapshot) return _signedPdfL3A(el); // the guard, then cb-documents' historical template, decide
  const iss = l3aSnapIssuer(s);
  return l3aWith({ snap: s.snapshot, issuer: iss || CH_ISSUER_AS_BUILT, compat: !iss }, () => _signedPdfL3A(el));
};
const _histL3A = ACT.cbHistTemplate;
ACT.cbHistTemplate = el => l3aWith({ snap: null, issuer: CH_ISSUER_AS_BUILT, compat: true }, () => _histL3A(el));

UXC.push(['L3-A', 'Signed offer letters keep their issuer (7 Nov 2026)', [
  'Signing keeps the issuer the applicant saw — letterhead, watermark, signatory and declaration — and the contract it was signed under (programme and version, fee option, delivery mode, plan version, learner type, letter version) with the frozen signed copy.',
  'A signed letter is drawn from that copy only, with the name and Student ID signed; later changes to the issuer, the letter template, the programme or the learner\'s details don\'t change it.',
  'A copy signed before this has no issuer recorded: it is shown with the issuer every letter carried until 7 Nov 2026 and says so. Nothing already signed is rewritten.']]);
