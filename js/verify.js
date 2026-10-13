/* ============================================================
   Public certificate verification page (v- routes) — QR only (G11.2)
   No login, no account. Opened from a certificate's QR code. Shows only:
   full name, course, issue date and status (Valid / Expired / Revoked / Replaced).
   Never: date of birth, email, phone, learner ID, agency, scores,
   other certificates, revocation reason, replacement number.
   ============================================================ */
const VER_LIMIT = 20;          // lookups per 10 minutes
const VER_LABEL = { valid: 'Valid', expired: 'Expired', revoked: 'Revoked', superseded: 'Replaced', none: 'Not found' };

function verPatch() { STORE.ver = { attempts: [], failNext: false, qrNo: null }; S.ver = {}; }
const _isV = initStore; initStore = function () { _isV(); verPatch(); };

if (!ICONS.camera) ICONS.camera = 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z';
if (!ICONS.printer) ICONS.printer = 'M7 9V3h10v6M7 18H4v-9h16v9h-3M7 14h10v7H7z';

/* ---------- Helpers ---------- */
// Upper-case, drop spaces/dashes, then re-format. Returns null when the format is wrong.
function verNorm(raw) {
  const s = String(raw || '').toUpperCase().replace(/[\s\-‐‑–—_.\/]/g, '');
  const m = s.match(/^WEL(\d{4})(\d{5})([A-Z]?)$/);
  return m ? `WEL-${m[1]}-${m[2]}${m[3]}` : null;
}
const verUrl = no => location.href.split('#')[0] + '#v-verify.' + no;

// Every certificate number the public page can answer for, including replaced numbers.
function verIndex() {
  const out = [], seen = new Set(), add = r => { if (r.no && !seen.has(r.no)) { seen.add(r.no); out.push(r); } };
  [...'ABCDEF'].forEach(v => STORE.worlds[v].certs.forEach(c => {
    if (!c.no || c.no === '—' || c.status === 'Processing') return;
    add({ no: c.no, holder: VNAME(v), course: c.course, issued: c.issued, expires: c.expires, revoked: c.status === 'Revoked' ? (c.revoked || 'Revoked') : null });
  }));
  // Replaced numbers (Data Correction re-issues). Never linked to the new number.
  [...'ABCDEF'].forEach(v => STORE.worlds[v].certs.forEach(c => {
    if (!c.supersedes) return;
    (c.lineage || []).forEach((l, i) => { if (l[2] !== 'Current' && l[0] !== c.no) add({ no: l[0], holder: VNAME(v), course: c.course, issued: l[1], superseded: (c.lineage[i + 1] || [0, c.issued])[1] }); });
    add({ no: c.supersedes, holder: VNAME(v), course: c.course, issued: ((c.lineage || []).find(l => l[0] === c.supersedes) || [])[1] || null, superseded: c.issued });
  }));
  allCerts().filter(x => String(x.key).startsWith('X:')).forEach(x => add({ no: x.no, holder: x.learner, course: x.course, issued: x.issued, expires: x.expires, revoked: x.status === 'Revoked' ? 'Revoked' : null }));
  if (STORE.agy) STORE.agy.certs.forEach(c => add({ no: c.no, holder: c.learner, course: c.course, issued: c.issued, expires: c.expires, revoked: c.revoked || null }));
  return out;
}
const verFind = no => verIndex().find(r => r.no === no) || null;
const verClock = () => (typeof agNow === 'function' ? agNow() : now());
const verDays = iso => Math.ceil((new Date(iso) - verClock()) / DAY);
function verStatus(r) {
  if (!r) return 'none';
  if (r.superseded) return 'superseded';
  if (r.revoked) return 'revoked';
  if (!r.expires) return 'valid';
  return verDays(r.expires) < 0 ? 'expired' : 'valid';
}
function verLog(no, outcome, via) {
  if (!ADMIN) return;
  ADMIN.audit.unshift({ id: 'AU-' + (9500 + ADMIN.audit.length), actor: 'Public visitor', role: 'No login — public verification page', at: now().toISOString(), module: 'Certificate verification', entity: no, action: 'Certificate verification', before: '—', after: outcome, reason: via === 'q' ? 'Opened from QR code' : 'Opened from verification link', ip: '203.0.113.' + (10 + ADMIN.audit.length % 200) });
}

/* ---------- Lookup ---------- */
function verRun(no, via) {
  const st = STORE.ver, t = Date.now();
  st.attempts = st.attempts.filter(x => t - x < 10 * 60000);
  if (st.attempts.length >= VER_LIMIT) {
    if (!st.rateLogged && ADMIN) { st.rateLogged = true; ADMIN.security.unshift({ id: 'SE-' + (800 + ADMIN.security.length), sev: 'Low', at: now().toISOString(), type: 'Verification rate limit', detail: `More than ${VER_LIMIT} certificate lookups in 10 minutes from one visitor — further checks paused`, reviewed: false }); }
    return { no, via, err: 'rate' };
  }
  st.attempts.push(t);
  if (st.failNext || S.offline) { st.failNext = false; return { no, via, err: 'net' }; }
  const hit = verFind(no), found = !!hit;
  verLog(no, found ? VER_LABEL[verStatus(hit)] : 'Not found', via);
  return { no, via, at: verClock().toISOString(), found };
}

/* ---------- Shell ---------- */
function verShell(body) {
  return `<div class="wpc ver"><header class="wpc-h"><span class="ver-brand" aria-label="Illumin Academy — certificate verification"><b class="ver-mark">Illumin Academy</b><span>Certificate verification</span></span><span class="row" style="gap:6px">${S.vBack ? `<button class="btn btn-sm btn-ghost ver-noprint" data-act="vBack">${ic('back', 14)}Back to prototype</button>` : `<span class="wpc-demo-tag ver-noprint">Demo — public page</span>`}</span></header>
  <main id="main" class="wpc-main" tabindex="-1">${body}</main>
  <footer class="wpc-f"><p>Questions about a certificate? Contact Illumin Academy — ${academyContact()}</p><p class="ver-noprint"><button class="linklike" data-act="vPrivacy">Privacy notice</button> · <button class="linklike" data-act="wpcA11y">Accessibility statement</button></p></footer></div>`;
}
const verCard = (inner, cls = '') => `<section class="card wpc-card ver-card ${cls}">${inner}</section>`;

/* ---------- Entry ---------- */
function verEntry() {
  if (S.ver.cam) return verCam();
  return verCard(`<h1>Check a certificate</h1><p>Scan the QR code on the certificate to verify it.</p>
    <button class="btn btn-primary btn-block wpc-btn" data-act="vCam">${ic('camera', 16)}Scan QR code</button>
    <details class="wpc-faq"><summary>${ic('help', 15)}Where is the QR code?</summary><p class="small">The QR code is printed on the certificate. You can also scan it with your phone's camera app — it opens this page with the result.</p></details>`);
}
function verCam() {
  const c = S.ver.cam;
  if (c === 'ask') return verCard(`<h1>Scan QR code</h1><div class="ver-prompt" role="dialog" aria-label="Browser camera permission (demo)"><p class="xs muted">Demo — your browser's prompt</p><p><strong>This verification page</strong> wants to use your camera</p><div class="row"><button class="btn" data-act="vCamPerm" data-ok="0">Block</button><button class="btn btn-primary" data-act="vCamPerm" data-ok="1">Allow</button></div></div><p class="small muted">The camera is only used to read the QR code. Nothing is recorded or stored.</p><button class="btn btn-block wpc-btn" data-act="vCamOff">Cancel</button>`);
  if (c === 'denied') return verCard(`<div class="wpc-ic t-amber" aria-hidden="true">${ic('camera', 28)}</div><h1>Camera access is blocked</h1><p>To scan the QR code, allow camera access for this page in your browser settings, then try again.</p><p>You can also scan the QR code with your phone's camera app.</p><div class="wpc-actions"><button class="btn btn-primary btn-block wpc-btn" data-act="vCam">Try the camera again</button><button class="btn btn-block wpc-btn" data-act="vCamOff">Cancel</button></div>`);
  return verCard(`<h1>Scan QR code</h1><div class="ver-cam" role="img" aria-label="Camera preview. Point the camera at the QR code on the certificate."><span class="ver-cam-f" aria-hidden="true"></span><span class="ver-cam-t">Point your camera at the QR code on the certificate</span></div>
    <button class="btn btn-primary btn-block wpc-btn ver-noprint" data-act="vScan">${ic('target', 16)}Simulate QR scan (demo)</button><button class="btn btn-block wpc-btn" data-act="vCamOff">Cancel</button>`);
}

/* ---------- Results ---------- */
function verResult(res) {
  const again = `<div class="wpc-actions ver-noprint"><button class="btn btn-primary btn-block wpc-btn" data-act="vAnother">Scan another certificate</button>`;
  if (res.err === 'rate') return verCard(`<div class="wpc-ic t-amber" aria-hidden="true">${ic('clock', 28)}</div><h1>Too many checks</h1><p>For security, checks from this device are paused for a few minutes. Please wait 10 minutes and try again.</p>${again}</div>`, 'ver-state');
  if (res.err === 'net') return verCard(`<div class="wpc-ic t-amber" aria-hidden="true">${ic('wifioff', 28)}</div><h1>We couldn't check this certificate</h1><p>Something went wrong with the connection. Check you're online and try again.</p><div class="wpc-actions ver-noprint"><button class="btn btn-primary btn-block wpc-btn" data-act="vRetry">Try again</button><button class="btn btn-block wpc-btn" data-act="vAnother">Scan another certificate</button></div>`, 'ver-state');
  const r = res.found ? verFind(res.no) : null, st = verStatus(r);
  if (!r) return verCard(`<div class="ver-status t-grey" role="status"><span class="ver-ic" aria-hidden="true">${ic('search', 30)}</span><div><h1>Not found</h1><p>We couldn't find a certificate for this QR code.</p></div></div>
    <p>Scan the QR code again. If it still isn't found, ask the holder to check their certificate or contact Illumin Academy.</p>${verChecked(res)}${again}</div>`, 'ver-state');
  const fld = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
  const T = {
    valid: ['green', 'check', 'Valid certificate', 'This certificate is genuine and current.'],
    expired: ['amber', 'clock', 'Expired', 'This certificate was genuine but has expired.'],
    revoked: ['red', 'x', 'Revoked', 'This certificate was revoked. It is no longer valid.'],
    superseded: ['grey', 'refresh', 'Replaced', 'This certificate has been replaced by a newer one and is no longer the current version. Ask the holder for their current certificate.'],
  }[st];
  const rows = fld('Full name', `<strong>${esc(r.holder)}</strong>`) + fld('Course', esc(r.course)) + fld('Issue date', r.issued ? fd(r.issued) : '—') + fld('Status', VER_LABEL[st]);
  return verCard(`<div class="ver-status t-${T[0]}" role="status"><span class="ver-ic" aria-hidden="true">${ic(T[1], 30)}</span><div><h1>${T[2]}</h1><p>${T[3]}</p></div></div>
    <dl class="wpc-dl ver-dl">${rows}</dl>
    ${st === 'revoked' ? `<p class="small">If you have questions about this certificate, contact Illumin Academy (${academyContact()}).</p>` : ''}
    ${verChecked(res)}
    <div class="note b-blue">${ic('info')}<div class="small">This confirms that the certificate is genuine. It does not confirm the identity of the person showing it to you — check their photo ID as well.</div></div>
    ${again}</div>`, 'ver-res');
}
const verChecked = res => res.at ? `<p class="small muted">Checked on ${fdt(res.at)}</p>` : '';

/* ---------- Routing + render ---------- */
function verPage() {
  const p = S.params || {}; S.ver = S.ver || {};
  if (!p.id) return verEntry();
  const no = verNorm(p.id) || String(p.id).toUpperCase();
  if (S.ver.fresh || !S.ver.res || S.ver.res.no !== no) { S.ver.fresh = false; S.ver.res = verRun(no, p.tab); }
  return verResult(S.ver.res);
}
const _renderV = render;
render = function () {
  if (S.route && S.route.startsWith('v-') && STORE.ver) {
    document.body.classList.toggle('frame-mobile', S.frame === 'mobile');
    let body; try { body = verPage(); } catch (e) { console.error(e); body = verCard('<h1>Something went wrong on our side</h1><p>Please try again in a moment.</p><button class="btn btn-primary" data-act="vRetry">Try again</button>'); }
    $('#app').innerHTML = verShell(body);
    renderDemo(); afterRender(); return;
  }
  _renderV();
};
function verOpen(no, via) {
  if (MODAL) { MODAL = null; renderModal(); }
  if (!(S.route && S.route.startsWith('v-'))) S.vBack = routeTok(S.route, S.params || {});
  S.ver = { fresh: true }; go('v-verify', { id: no, tab: via || undefined });
}

/* ---------- Actions ---------- */
ACT.vAnother = () => { S.ver = {}; go('v-verify'); };
ACT.vRetry = () => { S.ver.fresh = true; render(); };
ACT.vCam = () => { S.ver.cam = 'ask'; if (S.route !== 'v-verify' || (S.params || {}).id) go('v-verify'); else render(); };
ACT.vCamPerm = el => { S.ver.cam = el.dataset.ok === '1' ? 'on' : 'denied'; render(); };
ACT.vCamOff = () => { S.ver.cam = null; render(); };
ACT.vScan = () => { const no = STORE.ver.qrNo || verDefaultQr(); S.ver = { fresh: true }; go('v-verify', { id: no, tab: 'q' }); };
ACT.vOpen = el => verOpen(el.dataset.no, el.dataset.via);
ACT.vBack = () => { const t = S.vBack; S.vBack = null; S.ver = {}; setRoute(t); try { history.pushState(null, '', '#' + t); } catch (e) { /* sandboxed */ } render(); };
ACT.vPrivacy = () => openModal({ title: 'Privacy notice', body: `<p class="small">This page shows only what is needed to confirm a certificate: the holder's full name, the course, the issue date and its status. Each check is logged (certificate number, time and IP address) to protect against misuse. We never show the holder's contact details, date of birth or other records.</p><p class="small">Full privacy notice: ${c2s('privacy notice URL')}</p>`, actions: [{ label: 'Close', cls: 'btn-primary' }] });

/* ---------- Wiring: existing "Copy verification link" + certificate QR codes ---------- */
function verCopy(no) {
  const open = ` <button class="linklike" data-act="vOpen" data-no="${no}">Open the page</button>`;
  try { navigator.clipboard.writeText(verUrl(no)).then(() => toast('Verification link copied.' + open), () => toast('Copy blocked by your browser.' + open, 'info')); }
  catch (e) { toast('Verification link ready (copy blocked by your browser).' + open, 'info'); }
}
const verQrBtn = (no, html) => `<button type="button" class="ver-qr" data-act="vOpen" data-no="${no}" data-via="q" title="Scan to verify" aria-label="Verification QR code for ${no} — open the verification page">${html}</button>`;
ACT.copyVerify = el => {
  const c = W.certs.find(x => x.id === el.dataset.id), url = verUrl(c.no);
  openModal({ title: 'Copy verification link', body: `<p>Anyone with this link can check that your certificate is real. So can anyone who scans the QR code on it. It shows your full name, the course, the issue date and the certificate status.</p><div class="field"><label for="vlink">Verification link</label><input class="input mono" id="vlink" readonly value="${esc(url)}"></div><p class="xs muted">Live address: ${c2s('verification domain')}</p>`,
    actions: [{ label: 'Close' }, { label: 'Open the page', cls: 'btn', fn: () => verOpen(c.no) }, { label: `${ic('copy', 15)} Copy link`, cls: 'btn-primary', fn: () => { verCopy(c.no); } }] });
};
ACT.aCopyVerify = el => verCopy(el.dataset.n);
ACT.agCopyVerify = el => verCopy(el.dataset.no);
const _certCardV = certCard;
certCard = function (c) { const h = _certCardV(c); return c.no && c.no !== '—' ? h.replace(qr(c.no), verQrBtn(c.no, qr(c.no))) : h; };
const _certDetailV = certDetail;
certDetail = function (k) { const h = _certDetailV(k), x = certByKey(k); return x ? h.replace(qr(x.no, 56), verQrBtn(x.no, qr(x.no, 56))) : h; };
const _viewCertV = ACT.viewCert;
ACT.viewCert = el => { _viewCertV(el); const c = W.certs.find(x => x.id === el.dataset.id); if (MODAL && c) { MODAL.body = MODAL.body.replace(qr(c.no, 64), verQrBtn(c.no, qr(c.no, 64))); renderModal(); } };

/* ---------- Demo switcher ---------- */
function verDefaultQr() { const c = STORE.worlds.A.certs.find(x => x.id === 'c5') || STORE.worlds.A.certs.find(x => x.status === 'Valid'); return c ? c.no : 'WEL-2026-02310'; }
function verSamples() {
  const A = STORE.worlds.A.certs, C = STORE.worlds.C.certs, no = (w, id) => (w.find(x => x.id === id) || {}).no;
  const rows = [
    [no(A, 'c5'), 'Daniel Okafor'], [no(A, 'c2'), 'Daniel Okafor'], [no(C, 'c5') || no(C, 'c2'), 'Aisha Rahman'],
    [no(A, 'c1'), 'Daniel Okafor'], ['WEL-2026-01650', 'register'], [no(A, 'c3'), 'Daniel Okafor'], [no(A, 'c4'), 'Daniel Okafor'],
    [STORE.agy && (STORE.agy.certs.find(c => c.revoked) || {}).no, 'agency-sponsored'], ['WEL-2026-01880', 'replaced by a re-issue'],
  ].filter(r => r[0] && r[0] !== '—');
  // Numbers replaced by Data Corrections in this session
  [...'ABCDEF'].forEach(v => STORE.worlds[v].certs.forEach(c => { if (c.supersedes && c.issued && -daysTo(c.issued) < 1 && !rows.some(r => r[0] === c.supersedes)) rows.push([c.supersedes, 'replaced today'], [c.no, VNAME(v) + ' · new number']); }));
  return rows.map(r => [r[0], VER_LABEL[verStatus(verFind(r[0]))], r[1]]).concat([['WEL-2026-99999', 'Not found', 'unknown QR code']]);
}
function verControls() {
  return `<fieldset><legend>Certificate verification — demo only</legend><p class="xs muted">Sample certificates — each opens via its QR link (status is live):</p><ul class="ver-samples">${verSamples().map(r => `<li><button class="linklike mono small" data-act="vOpen" data-no="${r[0]}" data-via="q">${r[0]}</button> <span class="xs">${esc(r[1])} · <span class="muted">${esc(r[2])}</span></span></li>`).join('')}</ul>
    <div class="btns"><button class="btn btn-sm" data-act="vScanDemo">${ic('phone', 14)}Simulate QR scan (phone)</button><button class="btn btn-sm" data-act="vAdvance">Advance 30 days</button><button class="btn btn-sm" data-act="vFailNext">Next lookup fails (network)</button><button class="btn btn-sm" data-act="vAudit">See the log as Super Admin</button></div></fieldset>`;
}
ACT.vScanDemo = () => { S.frame = 'mobile'; S.ver = { cam: 'on' }; STORE.ver.qrNo = verDefaultQr(); if (!(S.route && S.route.startsWith('v-'))) S.vBack = routeTok(S.route, S.params || {}); go('v-verify'); };
ACT.vAdvance = () => { if (ACT.agyAdvance) ACT.agyAdvance(); if (S.ver && S.ver.res) S.ver.fresh = true; render(); };
ACT.vFailNext = () => { STORE.ver.failNext = true; toast('The next lookup will fail with a network error.', 'info'); };
ACT.vAudit = () => { S.vBack = null; S.ver = {}; S.route = ''; S.portal = 'admin'; S.signedIn = true; go('a-audit'); };

const _renderDemoV = renderDemo;
renderDemo = function () {
  if (!(S.route && S.route.startsWith('v-'))) return _renderDemoV();
  $('#demo-root').innerHTML = `<button class="demo-fab" data-act="demoToggle" aria-expanded="${S.demoOpen}">${ic('target', 16)}<span class="fab-l">Demo controls</span></button>${S.demoOpen ? `<div class="demo-panel" role="dialog" aria-label="Prototype demo controls"><div class="row-b"><h2>Prototype controls</h2><button class="icon-btn" data-act="demoToggle" aria-label="Close demo controls">${ic('x')}</button></div>${roleSwitchHtml()}${verControls()}<fieldset><legend>View — demo only</legend><div class="seg" role="group" aria-label="Layout preview"><button aria-pressed="${S.frame !== 'mobile'}" data-act="frame" data-f="auto">${ic('monitor', 14)} Full width</button><button aria-pressed="${S.frame === 'mobile'}" data-act="frame" data-f="mobile">${ic('phone', 14)} 390px phone</button></div></fieldset></div>` : ''}`;
};
const _rshV = roleSwitchHtml;
roleSwitchHtml = function () { return _rshV().replace('</div><button class="btn btn-sm" data-act="resetDemo">', `<button aria-pressed="${!!(S.route && S.route.startsWith('v-'))}" data-act="switchRole" data-r="ver">Public: Certificate verification</button></div><button class="btn btn-sm" data-act="resetDemo">`); };
const _srV = ACT.switchRole;
ACT.switchRole = el => { if (el.dataset.r === 'ver') { if (!(S.route && S.route.startsWith('v-'))) S.vBack = routeTok(S.route, S.params || {}); S.ver = {}; go('v-verify'); return; } if (S.route && S.route.startsWith('v-')) { S.route = ''; S.vBack = null; } _srV(el); };
const _resetV = ACT.resetDemo;
ACT.resetDemo = () => { const inV = S.route && S.route.startsWith('v-'); _resetV(); verPatch(); if (inV) go('v-verify'); };

/* ---------- Screen index ---------- */
const _idxV = SCREENS.index;
SCREENS.index = p => _idxV(p) + `<section class="card idx-sec"><h2>Public — Certificate verification</h2><p class="small muted">No login. QR only — opens from every certificate QR code and "Copy verification link" button.</p><ul class="idx-list">
  <li><button class="linklike" data-act="switchRole" data-r="ver">Landing — "Scan the QR code on the certificate to verify it" + Scan QR code</button></li>
  ${verSamples().map(r => `<li><button class="linklike" data-act="vOpen" data-no="${r[0]}" data-via="q">${esc(r[1])}</button> <span class="xs muted mono">${r[0]}</span></li>`).join('')}
  <li><button class="linklike" data-act="vScanDemo">QR scan on a phone (camera mock, permission prompt, denied state)</button></li>
  <li><span class="small">Network error — use the demo controls</span></li></ul></section>`;
