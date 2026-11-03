/* ============================================================
   AA-FINAL Workstream D — certificates and document checklists (3 Nov 2026). Loads after aa1-integrity.js.
   AA-20 / D6  An issued short-course certificate is drawn from the template pinned when the learner enrolled (cert.tpl, copied
         from the enrolment's certTpl at issue): its layout, its logo and only the fields ticked on that template (certificate
         number, QR code, expiry, completion and issue dates). One renderer (aafdDoc) serves the learner's viewer (ACT.viewCert),
         the admin certificate detail (certDetail), the agency download (ACT.agCertDl) and the course editor's live preview, so
         the preview is what the learner gets. Certificates issued before course templates existed (no cert.tpl: every seeded
         certificate) keep the standard design exactly as before — no historical record is rewritten.
         The register's Template column showed an invented 'v2' / 'v3'; it now shows the certificate's own template version
         ("Course template v2 · course v4") or "Standard design" for a certificate issued before templates.
         Revoke (and generation Retry) are shown only to the Super Administrator — the only role the handlers allow
         (ac-integrity.js / mr-g1.js, PD-AC-12); the handler guards are unchanged. Re-issue via Data Correction is shown only
         to the roles that may raise one (ac3-academic.js).
         Found while testing: a certificate's number was 2500 + that learner's own certificate count, so two learners
         completing could both get WEL-2026-02500 (verification is by number). A just-issued certificate whose number is
         already used takes the next free one; issued numbers are never changed.
         The NVQ learner's empty Certificates page said the certificate "is issued when you complete your programme"; it now
         follows the accepted rule (PD-FP / screens-b.js): the qualification certificate is posted by the awarding body and is
         not issued, downloaded or verified in the LMS.
   AA-13 Certificate designs: the existing per-course template (logo, 2 layouts, 7 fields, preview) gets a version record —
         each saved template change is "template version n" with date, person, course version and reason — and the Certificate
         tab lists what is supported, the version history and which issued certificates use which version. An uploaded logo is
         previewed from a data URL held in this browser tab only (AAFD_LOGO), clearly labelled; the course keeps only the
         file name (as before). Whole-design upload and an Academy-wide design library are NOT built (client decision).
   AA-18 Document checklist: the Edit / Retire / Restore / reorder controls are explained above the list; when the checklist is
         read-only for the user (s4CanCk — after publishing, Super Administrator only, PROVISIONAL-DECISIONS CB3) the bare
         "Read-only for you" becomes the reason, who can change it, and that changes create a checklist version applicants
         keep. The restriction itself is unchanged.
   ============================================================ */
'use strict';

/* ---------- Template versions (per short course) ---------- */
// A logo picked on the Certificate tab: file name → data URL, for this browser tab only (never stored, never on a server)
const AAFD_LOGO = {};
const AAFD_PROTO = 'Prototype: files are not stored on a server — the logo image is previewed in this browser tab only, and the course keeps just the file name.';
const aafdTplOf = t => ({ layout: (t && t.layout) || '', fields: ((t && t.fields) || []).slice(), logo: (t && t.logo) || '' });
const aafdSame = (a, b) => !!a && !!b && (a.layout || '') === (b.layout || '') && (a.logo || '') === (b.logo || '') && fcSame(a.fields || [], b.fields || []);
// The recorded history; before the first recorded change, the current template is version 1 (in use when tracking began)
const aafdHist = sp => (sp && sp.certTpls && sp.certTpls.length ? sp.certTpls : [{ n: 1, ...aafdTplOf(sp && sp.cert), at: null, baseline: true }]);
const aafdCur = sp => aafdHist(sp).slice(-1)[0];
const aafdTxt = t => `${t.layout || 'no layout'} · ${(t.fields || []).length} fields${t.logo ? ' · logo ' + t.logo : ' · default "Welfare" mark'}`;
// The template version an enrolment was pinned to: recorded at purchase, else the version matching its pinned template
function aafdTplNFor(e) {
  if (!e) return null; if (e.certTplN) return e.certTplN;
  const row = e.courseId && s1Row(e.courseId); if (!row || !e.certTpl) return null;
  const h = aafdHist(s1Spec(row)), t = e.enrolled ? new Date(e.enrolled).getTime() : Infinity;
  const m = h.filter(x => aafdSame(x, e.certTpl)), inForce = m.filter(x => !x.at || new Date(x.at).getTime() <= t).slice(-1)[0];
  return (inForce || m.slice(-1)[0] || {}).n || null;
}

// Saving the Certificate tab: a changed template (layout, fields or logo) is recorded as the next template version
const _s1SaveD = ACT.s1Save;
ACT.s1Save = function (el) {
  const c = el && el.dataset && el.dataset.t === 'certificate' && s1Row(el.dataset.id);
  if (!c) return _s1SaveD.apply(this, arguments);
  const sp = s1Spec(c), before = aafdTplOf(sp.cert), hist0 = aafdHist(sp).map(x => ({ ...x, fields: x.fields.slice() }));
  const args = arguments, self = this;
  return fcWrapDlg(o => ({ ...o, onOk: r => {
    const res = o.onOk(r); if (res === false) return res;
    const now_ = aafdTplOf(sp.cert);
    if (!aafdSame(now_, before)) {
      if (!sp.certTpls || !sp.certTpls.length) sp.certTpls = hist0;
      const n = sp.certTpls.slice(-1)[0].n + 1;
      sp.certTpls.push({ n, ...now_, at: now().toISOString(), by: ADMIN.me.name, courseV: c.version, reason: r });
      s1Log(c, `Certificate template version ${n} (course version ${c.version})`, aafdTxt(before), aafdTxt(now_), r); render();
    }
    return res;
  } }), () => _s1SaveD.apply(self, args));
};

// Pinned at purchase: the template version beside the template copy (setup-s1 pins certTpl; fp-cert pins certV)
const _enrolD = s1Enrol;
s1Enrol = function (c, row) {
  const r = _enrolD.apply(this, arguments), e = W.enrolments.find(x => x.courseId === (row && row.id));
  if (e && e.certTpl && e.certTplN == null) e.certTplN = aafdCur(s1Spec(row)).n;
  return r;
};
// At issue: the certificate keeps its own copy of the pinned template, with its template and course versions
const _shCompD = shComplete;
shComplete = function (e) {
  const before = e && e.status, r = _shCompD.apply(this, arguments);
  if (!e || before === 'Completed' || e.status !== 'Completed' || !e.certId) return r;
  const cert = W.certs.find(x => x.id === e.certId);
  // The number was 2500 + this learner's certificate count, so two learners could get the same number (verification is by
  // number). A just-issued certificate whose number is already used elsewhere takes the next free number.
  if (cert && cert.no && cert.no !== '—' && !cert.noFixed) {
    const used = []; Object.keys(STORE.worlds || {}).forEach(v => (STORE.worlds[v].certs || []).forEach(x => { if (x !== cert) used.push(x.no); })); ((STORE.agy && STORE.agy.certs) || []).forEach(x => used.push(x.no));
    if (used.includes(cert.no)) { let n = 2500; const num = s => +(String(s).match(/^WEL-2026-0(\d+)$/) || [])[1] || 0; used.forEach(s => { if (num(s) >= n && num(s) < 3000) n = num(s) + 1; }); cert.no = 'WEL-2026-0' + n; }
    cert.noFixed = true;
  }
  if (!e.certTpl) return r;
  if (cert && cert.tplN == null) Object.assign(cert, { tpl: aafdTplOf(cert.tpl || e.certTpl), tplN: aafdTplNFor(e), courseV: e.certV || null, courseId: e.courseId, completed: e.completedAt || cert.issued });
  return r;
};

/* ---------- One renderer for a templated certificate ---------- */
// d: { learner, course, issued, completed, expires, expTxt, no, tpl, qsz, verify }
function aafdDoc(d) {
  const t = d.tpl, has = f => (t.fields || []).includes(f), port = /^Portrait/.test(t.layout || '');
  const logo = t.logo ? (d.preview ? `<span class="xs muted fc-logo-n">Logo: ${esc(t.logo)}</span>` : '') + (AAFD_LOGO[t.logo] ? `<img class="aafd-logo" src="${AAFD_LOGO[t.logo]}" alt="${esc(t.logo)}">` : d.preview ? '' : `<span class="aafd-logo-ph xs">Logo: ${esc(t.logo)}</span>`) : '';
  const dates = [has('Completion date') && d.completed ? 'Completed ' + fd(d.completed) : '', has('Issue date') && d.issued ? 'Issued ' + fd(d.issued) : '', has('Expiry') ? (d.expTxt || (d.expires ? 'Valid until ' + fd(d.expires) : 'No expiry')) : ''].filter(Boolean).join('<br>');
  const q = has('QR code') && d.no ? (d.verify && typeof verQrBtn === 'function' ? verQrBtn(d.no, qr(d.no, d.qsz || 56)) : qr(d.no, d.qsz || 56)) : '';
  const no = has('Certificate number') && d.no ? `Certificate no. ${esc(d.no)}${d.verify ? `<br>Verify at welfare-verify.example/${esc(d.no)}` : ''}` : '';
  return `<div class="cert-doc aafd-doc ${port ? 'aafd-port' : 'aafd-land'}" data-layout="${esc(t.layout || '')}">${logo}<span class="w-brand">Welfare</span><span class="xs aafd-kind">Certificate of completion</span>${port ? '' : '<h3>This certifies that</h3>'}${has('Learner name') ? `<span class="nm">${esc(d.learner)}</span>` : ''}${has('Course') ? `${port ? '' : '<p>has successfully completed</p>'}<h3 class="aafd-course">${esc(d.course)}</h3>` : ''}${dates || q || no ? `<div class="meta"><span>${dates}</span>${q}<span style="text-align:right">${no}</span></div>` : ''}</div>`;
}
// Replace the first <div class="cert-doc"…>…</div> (balanced) in html with doc
function aafdSwap(html, doc) {
  const s = html.indexOf('<div class="cert-doc"'); if (s < 0) return html;
  const re = /<\/?div\b[^>]*>/g; re.lastIndex = s; let depth = 0, m;
  while ((m = re.exec(html))) { depth += m[0][1] === '/' ? -1 : 1; if (!depth) return html.slice(0, s) + doc + html.slice(re.lastIndex); }
  return html;
}
const aafdEnrOfCert = (w, c) => (w && w.enrolments || []).find(e => e.certId === c.id || e.id === c.enrol);
const aafdTplNote = c => (c && c.tpl ? `<p class="xs muted aafd-tplnote">${ic('award', 12)} ${esc(aafdTplLabel(c))} — ${esc(c.tpl.layout)}, as pinned when the learner enrolled.</p>` : '');
function aafdTplLabel(c) {
  if (!c || !c.tpl) return 'Standard design';
  return (c.tplN ? 'Course template v' + c.tplN : 'Course template (version not recorded)') + (c.courseV ? ' · course v' + c.courseV : '');
}

// Learner: the certificate viewer
const _viewCertD = ACT.viewCert;
ACT.viewCert = function (el) {
  const m0 = MODAL, r = _viewCertD.apply(this, arguments), c = W.certs.find(x => x.id === (el && el.dataset && el.dataset.id));
  if (MODAL && MODAL !== m0 && c && c.tpl) {
    const e = aafdEnrOfCert(W, c);
    MODAL.body = aafdSwap(MODAL.body, aafdDoc({ learner: W.me.first + ' ' + W.me.last, course: c.course, issued: c.issued, completed: c.completed || (e && e.completedAt) || c.issued, expires: c.expires, no: c.no, tpl: c.tpl, qsz: 64, verify: true }));
    MODAL.body = MODAL.body.replace('<p class="small muted">', aafdTplNote(c) + '<p class="small muted">'); renderModal();
  }
  return r;
};

// Admin: the certificate detail (design, template line, actions only for the roles that may use them)
const _certDetD = certDetail;
certDetail = function (k) {
  let h = _certDetD.apply(this, arguments); const x = certByKey(k); if (!x) return h; const c = x.c || {};
  if (c.tpl) {
    const w = x.v && STORE.worlds[x.v], e = aafdEnrOfCert(w, c);
    h = aafdSwap(h, aafdDoc({ learner: x.learner, course: x.course, issued: x.issued, completed: c.completed || (e && e.completedAt) || x.issued, expires: x.expires, no: x.no, tpl: c.tpl, qsz: 56, verify: true }));
  }
  h = h.replace('<h2>Actions</h2>', `<dl class="kv small aafd-tplkv"><dt>Design</dt><dd>${esc(aafdTplLabel(c))}${c.tpl ? ` — ${esc(c.tpl.layout)}; fields: ${esc(c.tpl.fields.join(', '))}${c.tpl.logo ? '; logo ' + esc(c.tpl.logo) : '; default "Welfare" mark'}` : ' (issued before course templates; shown as issued)'}</dd></dl><h2>Actions</h2>`);
  if (!isSA()) {
    const had = /data-act="(revokeCert|agRevokeAdm)"/.test(h);
    h = h.replace(/<button class="btn btn-danger" data-act="(revokeCert|agRevokeAdm)"[^>]*>Revoke<\/button>/g, '');
    if (had) h = h.replace('<h2>Actions</h2><div class="stack">', `<h2>Actions</h2><div class="stack"><p class="small muted aafd-norev">${ic('lock', 12)} Revoking a certificate is done by the Super Administrator (PD-AC-12). Ask them if this certificate must be revoked.</p>`);
  }
  if (!(typeof ac3AdmRaiser === 'function' ? ac3AdmRaiser() : isSA())) h = h.replace(/<button class="btn" data-act="raiseDC"[^>]*>[^<]*<\/button>/g, '');
  return h;
};
// The register: the real template version; Retry only for the Super Administrator
const _allCertsD = allCerts;
allCerts = function () { return _allCertsD.apply(this, arguments).map(r => ({ ...r, tpl: aafdTplLabel(r.c) })); };
const _acScrD = SCREENS['a-certificates'];
SCREENS['a-certificates'] = function (p) {
  const h = _acScrD.apply(this, arguments);
  if (p && p.id || isSA() || typeof h !== 'string' || !/data-act="certRetry"/.test(h)) return h;
  return h.replace(/<button class="btn btn-sm btn-primary" data-act="certRetry"[^>]*>[^]*?<\/button>/g, '<span class="xs muted aafd-noretry">Retried by the Super Administrator</span>');
};

// Agency: the certificate download of a sponsored learner
const _agDlD = ACT.agCertDl;
ACT.agCertDl = function (el) {
  const m0 = MODAL, r = _agDlD.apply(this, arguments);
  if (!MODAL || MODAL === m0) return r;
  const row = (typeof agyCerts === 'function' ? agyCerts() : []).find(x => x.no === (el && el.dataset && el.dataset.no));
  const w = row && row.world && STORE.worlds[row.world], c = w && w.certs.find(x => x.no === row.no);
  if (c && c.tpl) { const e = aafdEnrOfCert(w, c); MODAL.body = aafdSwap(MODAL.body, aafdDoc({ learner: row.learner, course: c.course, issued: c.issued, completed: c.completed || (e && e.completedAt) || c.issued, expires: c.expires, no: c.no, tpl: c.tpl, qsz: 56 })); renderModal(); }
  return r;
};

/* ---------- Course editor: preview from the same renderer; logo preview; versions and usage ---------- */
const aafdPrev = (c, t) => `${aafdDoc({ preview: true, learner: 'Learner Name', course: c.title, issued: now().toISOString(), completed: now().toISOString(), expTxt: c.validity === 'No expiry' ? 'No expiry' : 'Valid ' + c.validity, no: 'WEL-2026-0000', tpl: { layout: t.layout, fields: t.fields, logo: t.own ? t.logo : '' }, qsz: 50 })}<p class="xs muted">${esc(S1_LAYOUTS.includes(t.layout) ? t.layout : 'No layout chosen')}</p>`;
// Issued certificates of a course, from every learner record
const aafdIssued = c => { const out = []; Object.keys(STORE.worlds || {}).forEach(v => (STORE.worlds[v].certs || []).forEach(x => { if (x.courseId === c.id || (!x.courseId && x.course === c.title)) out.push({ v, x }); })); return out; };
function aafdVersions(c, sp) {
  const h = aafdHist(sp), cur = h.slice(-1)[0], iss = aafdIssued(c), use = n => iss.filter(({ x }) => x.tpl && x.tplN === n);
  const std = iss.filter(({ x }) => !x.tpl), unk = iss.filter(({ x }) => x.tpl && !x.tplN);
  const who = list => list.map(({ v, x }) => `<span class="mono">${esc(x.no)}</span> (${esc(VNAME(v))})`).join(', ');
  return `<section class="card aafd-ver"><h3>Certificate template versions</h3>
    <p class="small">Current: <strong>template version ${cur.n}</strong> — ${esc(cur.layout || 'no layout')}; ${esc((cur.fields || []).join(', '))}; ${cur.logo ? 'logo ' + esc(cur.logo) : 'default "Welfare" mark'}. New enrolments are pinned to it; a learner's certificate always uses the version they enrolled on.</p>
    <div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Version</th><th>Saved</th><th>Layout</th><th>Fields</th><th>Logo</th><th>Issued certificates</th></tr></thead><tbody>${h.slice().reverse().map(x => `<tr><td>v${x.n}${x === cur ? ' ' + chip('Current', 'green') : ''}</td><td class="small">${x.at ? `${fd(x.at)} · ${esc(x.by || '')} · course v${x.courseV}<br><span class="muted">${esc(x.reason || '')}</span>` : '<span class="muted">In use when version tracking began (date not recorded)</span>'}</td><td class="small">${esc(x.layout || '—')}</td><td class="small">${esc((x.fields || []).join(', '))}</td><td class="small">${x.logo ? esc(x.logo) : 'Default "Welfare" mark'}</td><td class="small">${use(x.n).length ? who(use(x.n)) : '<span class="muted">None</span>'}</td></tr>`).join('')}</tbody></table></div>
    ${std.length ? `<p class="small muted">Issued before course templates (standard design, kept as issued): ${who(std)}.</p>` : ''}${unk.length ? `<p class="small muted">Template version not recorded: ${who(unk)}.</p>` : ''}
    <details class="aafd-sup"><summary class="small">What certificate designs support</summary><ul class="small"><li>Per course: the default "Welfare" mark or your own logo, one of ${S1_LAYOUTS.length} layouts (${S1_LAYOUTS.map(esc).join(', ')}), and which of ${S1_CERT_FIELDS.length} fields appear (${S1_CERT_FIELDS.map(esc).join(', ')}); the learner's name and the course are required.</li><li>Each saved change is a new template version with a reason and an audit entry. Issued certificates keep their version; nothing already issued is redrawn.</li><li>NVQ programmes have no LMS certificate: the qualification certificate is posted by the awarding body.</li><li>Not available (client decision): uploading a whole certificate design (PDF or image background), and an Academy-wide design library shared by courses.</li></ul></details></section>`;
}
const _s1CertD = s1Certificate;
s1Certificate = function (c, sp) {
  let h = _s1CertD.apply(this, arguments);
  h = h.replace(/<div class="fc-prev">[^]*?<\/section><\/div><\/div>$/, `<div class="fc-prev">${aafdPrev(c, fcSaved(sp))}</div></section></div></div>`);
  h = h.replace('<input class="input" type="file" id="ct-logo" accept="image/*">', `<input class="input" type="file" id="ct-logo" accept="image/*"><span class="xs muted aafd-proto">${ic('info', 12)} ${AAFD_PROTO}</span>`);
  return h + aafdVersions(c, sp);
};
const _fcTplD = INP.fcTpl;
INP.fcTpl = function (el) {
  const r = _fcTplD.apply(this, arguments), c = el && el.dataset && s1Row(el.dataset.id), p = $('main .fc-prev');
  if (!c || !p || !$('main .fc-tpl')) return r;
  const F = fcForm(s1Spec(c)); p.innerHTML = aafdPrev(c, F);
  const f = $('main #ct-logo'), file = f && f.files && f.files[0];
  if (file && !AAFD_LOGO[file.name] && /^image\//.test(file.type || '') && typeof FileReader === 'function') {
    const rd = new FileReader(); rd.onload = () => { AAFD_LOGO[file.name] = String(rd.result || ''); const q = $('main .fc-prev'); if (q && $('main .fc-tpl')) q.innerHTML = aafdPrev(c, fcForm(s1Spec(c))); }; rd.readAsDataURL(file);
  }
  return r;
};

/* ---------- NVQ learner: the empty Certificates page follows the posted-certificate rule ---------- */
const AAFD_NVQ = 'Your NVQ qualification certificate is sent to you by post by the awarding body once it confirms your achievement. It isn\'t issued, downloaded or verified in the LMS.';
const _certScrD = SCREENS.certificates;
SCREENS.certificates = function () {
  const h = _certScrD.apply(this, arguments), k = typeof h === 'string' ? h.indexOf('<div class="card lp-nocert">') : -1;
  if (k < 0 || !(W.flags && W.flags.nvq)) return h;
  const sh = (W.enrolments || []).some(e => e.kind === 'short');
  const why = AAFD_NVQ + (sh ? ' A short course\'s certificate appears here when you complete the course, if the course offers one.' : '');
  return h.slice(0, k) + `<div class="card lp-nocert">${emptyState({ icon: 'award', title: 'No certificates yet', why })}</div>`;
};

/* ---------- AA-18: the document checklist explains its controls and its lock ---------- */
const _s4CardD = s4ChecklistCard;
s4ChecklistCard = function (pr, opts) {
  let h = _s4CardD.apply(this, arguments); if (!pr) return h;
  if (s4CanCk(pr)) {
    h = h.replace(/(<button class="icon-btn" data-act="s4CkMove"[^>]*?aria-label="([^"]*)")/g, '$1 title="$2"');
    const help = `<p class="small aafd-ckhelp">${ic('info', 13)} To change an item use <strong>Edit</strong> (name, mandatory, formats, size, expiry, region, guidance); <strong>Retire</strong> stops asking new applicants (nothing is deleted — <strong>Restore</strong> brings it back); ↑ ↓ change the order. Each change asks for a reason and creates a new checklist version.</p>`;
    return h.replace(/(<section class="card s4-ck"><div class="row-b">[^]*?<\/div>)/, '$1' + help);
  }
  const pub = pr.chNew && pr.status !== 'Draft';
  const why = pub ? `<strong>Read-only for you:</strong> after a programme is published, only the Super Administrator can add, edit, retire or reorder its document checklist (a provisional rule awaiting the client's confirmation). Ask the Super Administrator for a change. Each change creates a new checklist version; applicants keep the version they started with.`
    : `<strong>Read-only for you:</strong> the document checklist is changed by the Super Administrator, an Academic Admin or a System Admin. Each change creates a new checklist version; applicants keep the version they started with.`;
  return h.replace(/(<section class="card s4-ck"><div class="row-b">[^]*?<\/div>)/, `$1<div class="note b-grey aafd-cklock">${ic('lock')}<div class="small">${why}</div></div>`);
};

/* ---------- Records ---------- */
if (typeof UXC !== 'undefined') UXC.push(['AAF-D', 'Certificates follow their pinned template; checklist lock explained (3 Nov 2026)', [
  'A short-course certificate is drawn from the template pinned at enrolment (layout, logo, ticked fields) in the learner viewer, the admin detail and the agency download; certificates issued before templates keep the standard design.',
  'Certificates register: the Template column shows the certificate\'s template version (or "Standard design"). Revoke and Retry are shown only to the Super Administrator.',
  'Short Courses → a course → Certificate: template version history, which issued certificates use which version, and what designs support. Logo images are previewed in this browser tab only (prototype).',
  'NVQ learners with no certificates: the qualification certificate is posted by the awarding body, not issued in the LMS.',
  'Document checklist: the controls are explained; a read-only checklist says why and who can change it.']]);
