/* Setup S5c — CSV learner-account import, validation and error reports (S5-03).
   The import reads the file the administrator chose (in the browser — nothing is uploaded), checks every row against the learner
   account rules and the existing learners, previews the result without changing anything, and on confirmation re-checks and
   creates only valid rows, with new stable learner IDs. The error report is a real CSV of this attempt's rejected rows. Creating
   accounts and adding learners to a batch stay separate: the batch-roster CSV is shown as not available. Loads after setup-s5d.js. */
'use strict';

/* ---------- The template (columns of the existing learner-account model) ----------
   Required: Full name, Email, Mobile — the three columns of the existing import samples (both treated a missing mobile as an
   error) — and Country, which registration and Add learner both require because it fixes the learner's data region and can't be
   changed later (CH-01). Other columns are ignored and listed. No course, batch, agency or payment columns: importing creates
   accounts only. */
const S5C_COLS = [['name', 'Full name', ['full name', 'name']], ['email', 'Email', ['email', 'email address']], ['mobile', 'Mobile', ['mobile', 'mobile number']], ['country', 'Country', ['country']]];
const S5C_MAX_ROWS = 500, S5C_MAX_BYTES = 1024 * 1024;
const S5C_TEMPLATE = 'Full name,Email,Mobile,Country\r\n"Evans, Lucy",lucy.evans@example.co.uk,+44 7700 900801,United Kingdom\r\n';
// The earlier fixed sample, kept as a clearly labelled demonstration file (now a real CSV read like any other file)
const S5C_DEMO = { name: 'demo-learners-6-rows.csv', text: 'Full name,Email,Mobile,Country\r\nLucy Evans,lucy.evans@example.co.uk,+44 7700 900801,United Kingdom\r\nImran Sheikh,imran.sheikh@example.co.uk,+44 7700 900802,United Kingdom\r\nAisha Rahman,aisha.rahman@gmail.com,+44 7700 900188,United Kingdom\r\nPeter Grant,peter.grant@,+44 7700 900804,United Kingdom\r\nNoura Saeed,noura.saeed@mail.ae,,United Arab Emirates\r\nTariq Aziz,tariq.aziz@mail.ae,+971 50 555 0199,United Arab Emirates\r\n' };

/* ---------- CSV reading (RFC 4180: quotes, "" escapes, commas and line breaks in quotes, CRLF / LF / CR, blank lines) ---------- */
function s5cParse(text) {
  const rows = [], s = String(text == null ? '' : text).replace(/^﻿/, '');
  let row = [], f = '', q = false, i = 0, line = 1, start = 1, quoted = false;
  const endField = () => { row.push(quoted ? f : f.trim()); f = ''; quoted = false; };
  const endRow = () => { const wasQ = quoted; endField(); if (!(row.length === 1 && row[0] === '' && !wasQ)) rows.push({ line: start, cells: row }); row = []; start = line; };
  while (i < s.length) {
    const c = s[i];
    if (q) {
      if (c === '"') {
        if (s[i + 1] === '"') { f += '"'; i += 2; continue; }
        q = false; i++; while (i < s.length && s[i] === ' ') i++; // spaces after a closing quote are allowed
        if (i < s.length && !/[,\r\n]/.test(s[i])) return { error: `Line ${line}: unexpected characters after a closing quote.` };
        continue;
      }
      if (c === '\n' || (c === '\r' && s[i + 1] !== '\n')) line++;
      f += c; i++; continue;
    }
    if (c === '"') { if (f.trim() !== '') return { error: `Line ${line}: a quote appears inside an unquoted value — wrap the value in quotes and double any quotes inside it.` }; f = ''; q = true; quoted = true; i++; continue; }
    if (c === ',') { endField(); i++; continue; }
    if (c === '\r' || c === '\n') { endRow(); if (c === '\r' && s[i + 1] === '\n') i++; i++; line++; start = line; continue; }
    f += c; i++;
  }
  if (q) return { error: `Line ${start}: a quoted value is never closed.` };
  if (f !== '' || row.length || quoted) endRow();
  return { rows };
}
const s5cCsvCell = v => { let t = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return /[",\r\n]|^\s|\s$/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
const s5cCsv = rows => rows.map(r => r.map(s5cCsvCell).join(',')).join('\r\n') + '\r\n';
// Local download (Blob); the last file is kept for the page (and the tests) to read back
function s5cDownload(name, text) {
  S5C_LAST.file = { name, text };
  try { const a = document.createElement('a'), u = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })); a.href = u; a.download = name; a.style.display = 'none'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(u); a.remove(); }, 0); } catch (e) { /* the file content is still shown as downloaded */ }
  toast(`${name} downloaded.`);
}
const S5C_LAST = { file: null };

/* ---------- Who may import (checked when the action runs) ----------
   "Bulk-create learners from a CSV file" — Super Administrator and System Administrators (roles document). "Add learners to a
   batch (single, CSV or automatic)" is a different capability (Academic Admin among others) and doesn't grant account creation. */
function s5cWhy() {
  if (S.portal !== 'admin' || !S.signedIn || !ADMIN || !ADMIN.me || (typeof s5Ctx === 'function' && s5Ctx())) return 'Bulk-creating learner accounts from a CSV file is for the Super Administrator and System Administrators.';
  return isSA() || isSys() ? '' : 'Bulk-creating learner accounts from a CSV file is for the Super Administrator and System Administrators.';
}
function s5cDeny(what, why) {
  const w = typeof s5dActor === 'function' ? s5dActor() : { name: ADMIN.me.name, role: ADMIN.me.roles[0] };
  ADMIN.security.unshift({ id: 'SE-S5C-' + (++s5cStore().seq), sev: 'High', at: now().toISOString(), type: 'Out-of-scope action', detail: `${w.role} ${w.name} attempted: ${what} — ${why}`, reviewed: false });
  s5cLog('Learners', 'CSV import', 'Blocked: ' + what, '—', '—', why);
  toast(why + ' Attempt logged.', 'err'); return false;
}

/* ---------- Store: imported accounts and import records survive an admin rebuild ---------- */
function s5cStore() { return (STORE.s5c = STORE.s5c || { made: {}, imports: [], audit: [], seq: 0 }); }
function s5cLog(module, entity, action, before, after, reason) {
  logA(module, entity, action, before, after, reason); const st = s5cStore(), a = ADMIN.audit[0];
  if (a && !/^AU-S5C-/.test(a.id)) { a.id = 'AU-S5C-' + (++st.seq); st.audit.push(a); }
  return a;
}
function s5cReplay() {
  if (!ADMIN || !ADMIN.learners) return; const st = s5cStore();
  Object.values(st.made).forEach(m => { if (!ADMIN.learners.some(l => l.id === m.id)) ADMIN.learners.unshift(JSON.parse(JSON.stringify(m))); });
  if (ADMIN.audit && st.audit.length) { const have = new Set(ADMIN.audit.map(a => a.id)), add = st.audit.filter(a => !have.has(a.id)); if (add.length) ADMIN.audit = ADMIN.audit.concat(add).sort((x, y) => String(y.at).localeCompare(String(x.at))); }
}
const _isS5c = initStore; initStore = function () { STORE.s5c = null; S.s5c = null; return _isS5c.apply(this, arguments); };
const _baS5c = buildAdmin; buildAdmin = function () { const r = _baS5c.apply(this, arguments); s5cReplay(); return r; };

/* ---------- Row checks (registration-style; nothing is created while checking) ----------
   Name required (letters, 100 characters at most). Email valid. Mobile in international form (+ country code, 8–15 digits).
   Country one of the registration countries. Duplicates are refused, never merged or overwritten: an email or mobile that
   already belongs to a learner (or a pending registration), and the second and later rows in the file with the same email or
   mobile. Emails compare without case; mobiles compare by digits. */
const s5cDigits = v => String(v || '').replace(/\D/g, '');
function s5cIndex() {
  const em = new Map(), mo = new Map();
  allLearners().forEach(l => { if (l.email) em.set(l.email.trim().toLowerCase(), l.id); const d = s5cDigits(l.mobile); if (d.length >= 8) mo.set(d, l.id); });
  (STORE.regs || []).forEach(r => { if (r.email && !em.has(r.email.toLowerCase())) em.set(r.email.toLowerCase(), 'a pending registration'); });
  return { em, mo };
}
function s5cCheck(parsed) {
  const out = { header: [], missing: [], ignored: [], rows: [], fileError: '' };
  if (parsed.error) { out.fileError = 'The file isn\'t valid CSV. ' + parsed.error; return out; }
  const rows = parsed.rows; if (!rows.length) { out.fileError = 'The file is empty.'; return out; }
  const head = rows[0].cells.map(h => h.trim()), key = h => h.toLowerCase().replace(/\s+/g, ' ');
  const idx = {}; S5C_COLS.forEach(([k, , al]) => { const i = head.findIndex(h => al.includes(key(h))); if (i >= 0) idx[k] = i; });
  out.header = head; out.missing = S5C_COLS.filter(([k]) => idx[k] == null).map(c => c[1]); out.ignored = head.filter((h, i) => h && !Object.values(idx).includes(i));
  if (out.missing.length) { out.fileError = `Missing required column${out.missing.length > 1 ? 's' : ''}: ${out.missing.join(', ')}. The header row must have Full name, Email, Mobile and Country.`; return out; }
  if (rows.length - 1 > S5C_MAX_ROWS) { out.fileError = `The file has ${rows.length - 1} learner rows; import up to ${S5C_MAX_ROWS} at a time.`; return out; }
  const { em, mo } = s5cIndex(), seenE = new Map(), seenM = new Map();
  rows.slice(1).forEach((r, k) => {
    const v = {}; S5C_COLS.forEach(([c]) => { v[c] = (r.cells[idx[c]] || '').trim(); }); const n = k + 2, errs = [], dup = [];
    if (r.cells.length > head.length) errs.push(`Has ${r.cells.length} values but the header has ${head.length} columns`);
    if (!v.name) errs.push('Full name is required'); else if (v.name.length > 100 || !/\p{L}/u.test(v.name)) errs.push('Full name must contain letters (100 characters at most)');
    const e = v.email.toLowerCase(); if (!v.email) errs.push('Email is required'); else if (v.email.length > 120 || !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(v.email)) errs.push('Email is not a valid address');
    const d = s5cDigits(v.mobile); if (!v.mobile) errs.push('Mobile is required'); else if (!/^\+[\d ()-]+$/.test(v.mobile) || d.length < 8 || d.length > 15) errs.push('Mobile must be in international form, e.g. +44 7700 900123');
    const ctry = v.country && REG_COUNTRIES.find(c => c[0].toLowerCase() === v.country.toLowerCase()); if (!v.country) errs.push('Country is required'); else if (!ctry) errs.push('Country isn\'t one of the registration countries');
    if (v.email && !errs.some(x => /^Email/.test(x))) { if (em.has(e)) dup.push(`Email already belongs to ${/^IA-/.test(em.get(e)) ? 'learner ' + em.get(e) : em.get(e)}`); else if (seenE.has(e)) dup.push(`Same email as row ${seenE.get(e)}`); else seenE.set(e, n); }
    if (v.mobile && !errs.some(x => /^Mobile/.test(x))) { if (mo.has(d)) dup.push(`Mobile already belongs to learner ${mo.get(d)}`); else if (seenM.has(d)) dup.push(`Same mobile as row ${seenM.get(d)}`); else seenM.set(d, n); }
    out.rows.push({ n, line: r.line, v: { ...v, country: ctry ? ctry[0] : v.country }, region: ctry ? ctry[2] : '', errs, dup, ok: !errs.length && !dup.length, status: errs.length ? 'Invalid' : dup.length ? 'Duplicate' : 'Valid' });
  });
  if (!out.rows.length) out.fileError = 'The file has a header row but no learner rows.';
  return out;
}

/* ---------- The import screens ---------- */
const s5cCounts = c => ({ total: c.rows.length, valid: c.rows.filter(r => r.ok).length, invalid: c.rows.filter(r => r.status === 'Invalid').length, dup: c.rows.filter(r => r.status === 'Duplicate').length });
function s5cLoad(name, text, size) {
  const w = s5cWhy(); if (w) return s5cDeny('preview a learner CSV import', w);
  const c = size > S5C_MAX_BYTES ? { rows: [], fileError: 'The file is larger than 1 MB.' } : s5cCheck(s5cParse(text));
  S.s5c = { file: name, text, checked: now().toISOString(), c, done: null }; s5cPreview(); return true;
}
ACT.importCsv = () => {
  const w = s5cWhy(); if (w) return s5cDeny('open the learner CSV import', w);
  openModal({ title: 'Bulk import learner accounts (CSV)', size: 'lg', body: `<ol class="small" style="margin:0;padding-left:18px"><li>Download the template. One learner per row; required columns: <strong>Full name, Email, Mobile, Country</strong>.</li><li>Choose the file. Every row is checked before anything is created — nothing leaves your browser.</li><li>Review the check, then create the valid rows.</li></ol>
    <div class="row"><button class="btn btn-sm" data-act="s5cTemplate">${ic('download', 14)}Download template</button></div>
    <label class="drop" for="csvf">${ic('upload', 22)}<span><strong>Choose a CSV file</strong> (.csv, up to 1 MB, ${S5C_MAX_ROWS} rows)</span><input type="file" id="csvf" accept=".csv,text/csv" data-onchange="csvPicked"></label>
    <p class="small">Demonstration: <button class="linklike" data-act="csvSample">check the demonstration file (${esc(S5C_DEMO.name)}, 6 rows)</button> · <button class="linklike" data-act="s5cDemoDl">download it</button>. It is processed exactly like a chosen file and deliberately includes 3 rows that fail — one duplicate of an existing learner, one invalid email and one missing mobile — to show the checks.</p>
    <p class="xs muted">Mobile in international form (+44 …, +971 …). Country as at registration (${REG_COUNTRIES.map(c => c[0]).join(', ')}) — it sets the data region and can't be changed later. This creates accounts only: no course, batch, agency or payment. Learners already registered (same email or mobile) are never changed or merged. Excel files aren't supported — save as CSV.</p>`, actions: [{ label: 'Cancel' }] });
};
INP.csvPicked = el => {
  const w = s5cWhy(); if (w) return s5cDeny('preview a learner CSV import', w);
  const f = el && el.files && el.files[0]; if (!f) return;
  if (!/\.csv$/i.test(f.name)) { toast('Choose a .csv file (Excel files aren\'t supported — save as CSV first).', 'err'); return; }
  if (f.size > S5C_MAX_BYTES) return s5cLoad(f.name, '', f.size);
  const r = new FileReader(); r.onload = () => s5cLoad(f.name, String(r.result), f.size); r.onerror = () => toast('The file couldn\'t be read.', 'err'); r.readAsText(f);
};
ACT.csvSample = () => s5cLoad(S5C_DEMO.name, S5C_DEMO.text, S5C_DEMO.text.length);
ACT.s5cTemplate = () => s5cDownload('learner-import-template.csv', S5C_TEMPLATE);
ACT.s5cDemoDl = () => s5cDownload(S5C_DEMO.name, S5C_DEMO.text);
const S5C_TONE = { Valid: 'green', Duplicate: 'amber', Invalid: 'red', Created: 'green', Rejected: 'red' };
function s5cTable(rows, res) {
  const shown = rows.slice(0, 200);
  return `<div class="tbl-wrap"><table class="tbl dense"><thead><tr><th>Row</th><th>Full name</th><th>Email</th><th>Mobile</th><th>Country</th><th>Result</th></tr></thead><tbody>${shown.map(r => { const st = res ? (r.created ? 'Created' : 'Rejected') : r.status; return `<tr class="${r.ok && (!res || r.created) ? '' : 'hl'}"><td>${r.n}</td><td>${esc(r.v.name || '—')}</td><td class="small">${esc(r.v.email || '—')}</td><td class="small nowrap">${esc(r.v.mobile || '—')}</td><td class="small">${esc(r.v.country || '—')}</td><td>${chip(st, S5C_TONE[st])}${r.created ? ` <span class="mono xs">${esc(r.created)}</span>` : ''}${r.errs.concat(r.dup).concat(r.late || []).map(x => `<div class="xs">${esc(x)}</div>`).join('')}</td></tr>`; }).join('')}</tbody></table></div>${rows.length > shown.length ? `<p class="xs muted">Showing the first 200 of ${rows.length} rows — the error report lists every rejected row.</p>` : ''}`;
}
function s5cPreview() {
  const P = S.s5c, c = P.c, k = s5cCounts(c), bad = c.rows.filter(r => !r.ok).length;
  if (c.fileError) return openModal({ title: 'This file can\'t be imported', size: 'lg', body: `<p class="small">${ic('doc', 14)} ${esc(P.file)}</p><div class="note b-red">${ic('alert')}<div class="small">${esc(c.fileError)}</div></div><p class="small">Nothing was created. Fix the file and choose it again.</p>`, actions: [{ label: 'Choose another file', fn: () => { ACT.importCsv(); return false; } }, { label: 'Close', cls: 'btn-primary' }] });
  openModal({ title: 'Check rows before import', size: 'lg', body: `<p class="small">${ic('doc', 14)} <strong>${esc(P.file)}</strong> · checked ${fdt(P.checked)}</p><div class="kpis">${kpi('Rows', k.total)}${kpi('Valid', k.valid)}${kpi('Invalid', k.invalid)}${kpi('Duplicates', k.dup)}</div>${c.ignored.length ? `<p class="xs muted">Ignored columns: ${c.ignored.map(esc).join(', ')}.</p>` : ''}<p class="small">Nothing has been created yet. When you confirm, every row is checked again against the current learners, and only rows that still pass are created.</p>${s5cTable(c.rows)}`,
    actions: [{ label: 'Cancel' }, { label: bad ? `Download error report (${bad})` : 'No rows to report', cls: 'btn', fn: () => { if (bad) ACT.s5cErrors(); else toast('Every row passed — there is no error report.', 'info'); return false; } }, { label: `Create valid rows only (${k.valid})`, cls: 'btn-primary', fn: () => s5cConfirm() }] });
}

/* ---------- Import (S5-03): re-check against the current learners, create only rows that still pass, once ---------- */
// Imported learners use their own range (IA-L-33001 upwards): the next number no learner — current or imported earlier — has
function s5cNewId(taken) { const made = s5cStore().made; let n = 33001; while (taken.has('IA-L-' + n) || made['IA-L-' + n]) n++; return 'IA-L-' + n; }
function s5cImport() {
  const w = s5cWhy(); if (w) { s5cDeny('import learner accounts from CSV', w); return { ok: false, why: w }; }
  const P = S.s5c; if (!P || !P.c || P.c.fileError) return { ok: false, why: 'Choose and check a CSV file first.' };
  if (P.done) return { ok: false, why: `This file was already imported (${P.done}). Choose the file again to check it against the current learners.` };
  const c = s5cCheck(s5cParse(P.text)), st = s5cStore(), impId = 'IMP-' + String(st.imports.length + 1).padStart(3, '0'), at = now().toISOString(), created = [];
  const taken = new Set(allLearners().map(l => l.id));
  c.rows.forEach(r => {
    const was = (P.c.rows.find(x => x.n === r.n) || {}).ok; if (was && !r.ok) r.late = ['Passed the preview, but changed since: ' + r.errs.concat(r.dup).join('; ')];
    if (!r.ok) return;
    const id = s5cNewId(taken); taken.add(id);
    const l = { id, name: r.v.name, email: r.v.email, mobile: r.v.mobile, agency: null, courses: [], acct: 'Pending Verification', rec: 'Active', region: r.region, last: at, flags: [], dob: '—', address: '—', postcode: '—', country: r.v.country, joined: fd(at), referral: 'Bulk import (CSV)', cur: 'GBP', importId: impId };
    ADMIN.learners.unshift(l); st.made[id] = JSON.parse(JSON.stringify(l)); r.created = id; created.push(id);
    s5cLog('Learners', id, 'Learner created (CSV import)', '—', 'Pending Verification', `${impId} · row ${r.n}`);
    // The account-activation email of Add learner, as a simulated delivery record (nothing is sent)
    if (typeof s5dSend === 'function') s5dSend('Welcome / activation', 'import:' + id, `Learner account ${id} (${impId})`, { key: 'L:' + id, type: 'learner', id, name: l.name }, 'Email', null);
  });
  const rej = c.rows.filter(r => !r.created), why = {}; rej.forEach(r => r.errs.concat(r.dup).forEach(x => { const k = x.replace(/ (row \d+|learner IA-L-\d+|"[^"]*")/g, ''); why[k] = (why[k] || 0) + 1; }));
  const rec = { id: impId, at, by: ADMIN.me.name, file: P.file, total: c.rows.length, created, rejected: rej.map(r => ({ n: r.n, reasons: r.errs.concat(r.dup).concat(r.late || []) })), rows: c.rows };
  st.imports.unshift(rec); P.done = impId; P.c = c;
  s5cLog('Learners', `${impId} · ${P.file}`, 'Bulk import (CSV)', '—', `${c.rows.length} rows · ${created.length} created · ${rej.length} rejected`, (created.length ? 'Created: ' + created.join(', ') : 'Nothing created') + (rej.length ? ' · Rejected: ' + Object.entries(why).map(([k, n]) => `${n} × ${k}`).join('; ') : ''));
  return { ok: true, rec };
}
function s5cConfirm() {
  const res = s5cImport(); if (!res.ok) { toast(res.why, 'err'); return false; }
  const r = res.rec; render();
  openModal({ title: 'Import complete', size: 'lg', body: `<div class="note b-${r.created.length ? 'green' : 'amber'}">${ic(r.created.length ? 'check' : 'alert')}<div><strong>${r.created.length} learner account${r.created.length === 1 ? '' : 's'} created</strong> from ${esc(r.file)} (${r.id}). ${r.rejected.length} row${r.rejected.length === 1 ? ' was' : 's were'} not imported.</div></div><p class="small">New accounts are "Pending Verification": each learner gets the account-activation email (simulated in the prototype — see the Notification log). No course, batch, agency or payment was set.</p>${s5cTable(r.rows, true)}`,
    actions: [{ label: r.rejected.length ? `Download error report (${r.rejected.length})` : 'No rows to report', cls: 'btn', fn: () => { if (r.rejected.length) ACT.s5cErrors(); else toast('Every row was imported — there is no error report.', 'info'); return false; } }, { label: 'Done', cls: 'btn-primary' }] });
}
// Error report: this attempt's rejected rows only — row, name, email, result and reasons (no mobile, country or other data)
ACT.s5cErrors = () => {
  const w = s5cWhy(); if (w) return s5cDeny('download a learner import error report', w);
  const P = S.s5c; if (!P || !P.c || P.c.fileError) { toast('Check a CSV file first.', 'info'); return; }
  const bad = P.c.rows.filter(r => P.done ? !r.created : !r.ok); if (!bad.length) { toast('Every row passed — there is no error report.', 'info'); return; }
  s5cDownload(P.file.replace(/\.csv$/i, '') + '-errors.csv', s5cCsv([['Row', 'Full name', 'Email', 'Result', 'Reasons']].concat(bad.map(r => [r.n, r.v.name, r.v.email, P.done ? 'Not imported' : r.status, r.errs.concat(r.dup).concat(r.late || []).join('; ')]))));
};

/* ---------- Batch roster: adding learners to a batch by CSV isn't available ----------
   It used to open the account import above, which creates accounts and never touched the batch. Adding by CSV needs the rule
   that makes a learner eligible for a batch (admission, enrolment, payment); the single-learner Add learner checks only an
   active account and no other active batch, so it can't simply be repeated for a file. Shown as not available, with the reason;
   Add learner (one at a time) is unchanged. */
const S5C_BATCH = 'Adding learners to a batch by CSV isn\'t available yet: it needs a confirmed rule for which learners are eligible for a batch (admission, enrolment and payment). Use Add learner for one learner at a time. Learners → Bulk import creates accounts only and doesn\'t add anyone to a batch.';
ACT.s5cBatchCsv = () => { openModal({ title: 'Bulk CSV to a batch — not available', body: `<div class="note b-amber">${ic('info')}<div class="small">${esc(S5C_BATCH)}</div></div><p class="small">Nothing was changed.</p>`, actions: [{ label: 'Close', cls: 'btn-primary' }] }); return false; };
const _aBatchS5c = SCREENS['a-batches'];
SCREENS['a-batches'] = p => _aBatchS5c(p).replace(/<button class="btn btn-sm" data-act="importCsv">Bulk CSV<\/button>/, `<button class="btn btn-sm" data-act="s5cBatchCsv" disabled aria-disabled="true" title="${esc(S5C_BATCH)}">Bulk CSV (not available)</button>`);
const _addToBatchS5c = ACT.addToBatch;
ACT.addToBatch = el => { const r = _addToBatchS5c(el); if (MODAL && MODAL.body) { MODAL.body = MODAL.body.replace('Methods: individual (here), bulk CSV, multi-select from Learners, or automatically on admission.', 'Methods: individual (here) or automatically on admission. Adding by CSV isn\'t available yet.'); renderModal(); } return r; };

/* ---------- Create batch: the "Bulk (CSV)" intake rule isn't available ----------
   The wizard stores the chosen intake rule on the new batch (b.intake), but nothing implements a CSV intake. The option is shown
   as not available and disabled, and both "Next" on the intake step and "Create batch" refuse it (a re-enabled or crafted
   option too). Existing batches and their stored values are untouched; Manual and Automatic on admission approval are unchanged. */
const S5C_INTAKE_WHY = 'Not available yet — adding learners to a batch by CSV needs a confirmed batch-eligibility rule (admission, enrolment, payment). Choose Manual or Automatic on admission approval.';
function s5cIntakeDeny() { logA('Batches', 'New batch', 'Blocked: unsupported intake rule', '—', 'Bulk (CSV)', 'CSV intake isn\'t available'); toast('"Bulk (CSV)" isn\'t available yet. Choose Manual or Automatic on admission approval.', 'err'); return false; }
const _omS5c = openModal;
openModal = function (m) {
  const prim = m && (m.actions || []).find(a => a.cls && /primary/.test(a.cls));
  if (m && m.body && prim && prim.fn && /^Create batch — step 4 of 5/.test(m.title || '')) {
    m.body = m.body.replace(/<input type="radio" name="nb-in" value="Bulk \(CSV\)" (checked)?>/, '<input type="radio" name="nb-in" value="Bulk (CSV)" disabled aria-disabled="true">').replace(/(<span>)Bulk \(CSV\)(<span class="hint" style="display:block">)You upload a spreadsheet with all the learners\./, `$1Bulk (CSV) — not available$2${S5C_INTAKE_WHY}`);
    const f = prim.fn; prim.fn = (...x) => { const v = ($('#modal-root input[name="nb-in"]:checked') || {}).value; if (v === 'Bulk (CSV)') return s5cIntakeDeny(); if (!v) { toast('Choose an intake rule.', 'err'); return false; } return f(...x); };
  }
  if (m && m.body && prim && prim.fn && /^Create batch — step 5 of 5/.test(m.title || '') && /<dt>Intake rule<\/dt><dd>Bulk \(CSV\)<\/dd>/.test(m.body)) prim.fn = () => s5cIntakeDeny();
  return _omS5c.apply(this, arguments);
};

/* ---------- Learners list: Bulk import offered to the people who may use it ---------- */
const _aLearnersS5c = SCREENS['a-learners'];
SCREENS['a-learners'] = p => { const h = _aLearnersS5c(p), w = s5cWhy(); return w ? h.replace(/<button class="btn" data-act="importCsv">([^]*?)<\/button>/, `<button class="btn" data-act="importCsv" disabled aria-disabled="true" title="${esc(w)}">$1</button>`) : h; };

/* ---------- Records ---------- */
UXC.push(['Setup S5c', 'Setup fixes — CSV learner import, validation and error reports (S5-03)', [
  'S5-03: Learners → Bulk import (CSV) used to show the same fixed six-row sample whatever file was chosen, create those rows, and "download" an error report that was only a message. It now reads the chosen file in the browser (nothing is uploaded), checks every row, previews the result without creating anything, and on confirmation checks every row again against the current learners and creates only the rows that still pass. The six-row sample is kept as a clearly labelled demonstration file, checked like any other file and downloadable.',
  'Template (from the existing learner-account model): Full name, Email, Mobile — the columns of the existing import samples — and Country, which registration and Add learner require because it fixes the data region and can\'t be changed later. Column names are matched without case ("Email address", "Mobile number" and "Name" are accepted too); other columns are ignored and listed. No course, batch, agency or payment columns: the import creates accounts only. CSV rules: quoted values, commas and line breaks inside quotes, "" for a quote, CRLF / LF / CR line endings and blank lines are handled; a malformed file (unclosed quote, stray quote, too many values) is refused with the line number. Up to 500 rows and 1 MB. Excel files aren\'t supported.',
  'Row checks: name required (letters, 100 characters at most); valid email; mobile in international form (+ country code, 8–15 digits); country one of the registration countries. Duplicates are refused, never merged and never overwrite a learner: an email or mobile that already belongs to a learner (emails without case, mobiles by digits; pending registrations too), and later rows in the same file with the same email or mobile. This is the registration rule, adopted for the import as a safeguard — the wider duplicate policy (Add learner only warns about a mobile) is still to be confirmed by the client. The preview shows each row number, name, email, mobile, country, result (Valid / Invalid / Duplicate) and every reason, with total / valid / invalid / duplicate counts.',
  'Import: each created learner gets a new stable ID (IA-L-33001 onwards, never reused), the "Pending Verification" status of Add learner and the account-activation email as a simulated delivery record (Notification log; nothing is sent). No course, batch, agency, announcement, payment or other record is created. A row that passed the preview but no longer passes (for example its email was registered meanwhile) is rejected and says why. The same check can\'t be imported twice; importing the same file again rejects every row already created as a duplicate. The result lists every row with its new ID or its reasons. Imported accounts and the import records survive admin rebuilds, identity switches and index jumps; only the demo reset removes them.',
  'Error report: "Download error report" now downloads a real CSV made in the browser from this attempt — Row, Full name, Email, Result, Reasons — for the rejected rows only (no mobile, country or other data). Values are escaped (quotes, commas, line breaks) and a value starting with = + - or @ is prefixed with an apostrophe so a spreadsheet can\'t run it. When every row passed, there is no report and the button says so.',
  'Who can do what (checked when the action runs, as well as in the screen): bulk-creating learner accounts from CSV — Super Administrator and System Administrators (roles document: "Bulk-create learners from a CSV file"). Others — including Academic Admins, who manage batch rosters, a different capability — see the button disabled with the reason; direct calls to open, preview, import or download are refused, change nothing and are logged. Each import is audited: actor, time, file name, rows, created and rejected counts, the new learner IDs and a summary of the reasons — not the file\'s contents.',
  'Supported versus not available: importing learner ACCOUNTS from a CSV (Learners → Bulk import) is supported, as above. Adding learners to a BATCH by CSV is not available anywhere — not on the roster and not as a batch intake rule — because it needs a confirmed batch-eligibility rule (admission, enrolment, payment). Creating a batch never imports or enrols anyone.',
  'Batch roster: "Bulk CSV" on a batch roster opened the account import, which never added anyone to the batch. Adding learners to a batch by CSV needs a confirmed rule for which learners are eligible for a batch (admission, enrolment, payment) — the single Add learner checks only an active account and no other active batch — so it is now shown as not available, with the reason, and a direct call changes nothing. Add learner (one at a time, capacity → waitlist, no learner in two active batches) is unchanged.',
  'Create batch: the intake-rule step offered "Bulk (CSV) — You upload a spreadsheet with all the learners", but no CSV intake exists (the choice was only stored on the batch). It is now marked "not available" with the reason and disabled, and the wizard refuses it when saving — on the intake step and on Create batch — even if the option is re-enabled or crafted (refusals are audited). Manual and Automatic on admission approval work as before; existing batches and any stored intake values are unchanged.',
  'Open (to confirm): the duplicate email / mobile policy across registration, Add learner and agency Add learner; Country is now a required import column (from the account model; the old sample had none); the batch-eligibility rule needed before learners can be added to a batch by CSV (roster or intake rule); the single Add learner to a batch has no role check of its own (tracked for S5e). Unchanged: the agency portal\'s bulk import (still a demonstration file) and accounts created by Add learner one at a time (not yet kept across admin rebuilds — S5e).']]);
const _aIdxS5c = SCREENS['a-index'];
SCREENS['a-index'] = p => _aIdxS5c(p).replace(/(<section class="card idx-sec"><h2>Setup fixes<\/h2><ul class="idx-list">)/, `$1${chIdxLi('Learners → Bulk import (CSV)', { act: 'aJump', t: 'a-learners' }, 'S5c — reads the chosen file, row checks and duplicates, preview without changes, re-checked import with stable IDs, real error report; batch-roster CSV shown as not available.')}`);
