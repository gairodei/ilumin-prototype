/* ============================================================
   Follow-up decisions — Step 2 (F1–F12). Every block names its F-ID.
   Loads after followup.js.
   ============================================================ */
'use strict';

/* ---------- F11 Workplace email attachments ---------- */
const WP_TPLS = ['Workplace permission link', 'Observation proposed', 'Observation revised', 'Observation confirmed'];
const WP_DEFAULT_ATT = ['Workplace visit information.pdf', 'Illumin Academy contact details.pdf', 'Workplace FAQ.pdf'];
function tplAtt(ev) { ADMIN.tplAtt = ADMIN.tplAtt || {}; if (!ADMIN.tplAtt[ev]) ADMIN.tplAtt[ev] = WP_TPLS.includes(ev) ? WP_DEFAULT_ATT.slice() : []; return ADMIN.tplAtt[ev]; }
const tplAttList = ev => `<ul class="list fu-att">${tplAtt(ev).map((f, k) => `<li class="li"><span class="li-b small">${ic('clip2', 14)} ${esc(f)}</span><button type="button" class="btn btn-sm" data-act="tplAttRm" data-e="${esc(ev)}" data-k="${k}">Remove</button></li>`).join('') || '<li class="li small muted">No attachments.</li>'}</ul>`;
const tplAttSec = ev => `<section id="tpl-att" class="stack"><h3 class="small">Attachments</h3><p class="xs muted">Sent with every email from this template. PDF or DOCX.</p>${tplAttList(ev)}<div class="row"><label class="btn btn-sm" for="tpl-att-f">${ic('upload', 14)}Upload PDF / DOCX</label><input class="sr" type="file" id="tpl-att-f" accept=".pdf,.docx" data-onchange="tplAttFile" data-e="${esc(ev)}"><button type="button" class="btn btn-sm" data-act="tplAttSample" data-e="${esc(ev)}">Add a sample file (demo)</button></div><span class="err-slot" id="tpl-att-err"></span></section>`;
const tplAttRedraw = ev => { const s = $('#tpl-att'); if (s) s.outerHTML = tplAttSec(ev); if (MODAL) MODAL.body = MODAL.body.replace(/<section id="tpl-att"[\s\S]*?<\/section>/, tplAttSec(ev)); };
const tplAttAdd = (ev, name) => { if (!/\.(pdf|docx)$/i.test(name)) { const e = $('#tpl-att-err'); if (e) e.innerHTML = `<span class="err">${ic('alert', 14)}Only PDF or DOCX files can be attached.</span>`; return; } tplAtt(ev).push(name); logA('Notification Settings', ev, 'Template attachment added', '—', name, ''); tplAttRedraw(ev); };
INP.tplAttFile = el => { const f = el.files && el.files[0]; if (f) tplAttAdd(el.dataset.e, f.name); };
ACT.tplAttSample = el => tplAttAdd(el.dataset.e, 'Workplace document ' + (tplAtt(el.dataset.e).length + 1) + '.pdf');
ACT.tplAttRm = el => { const ev = el.dataset.e, f = tplAtt(ev).splice(+el.dataset.k, 1)[0]; logA('Notification Settings', ev, 'Template attachment removed', f, '—', ''); tplAttRedraw(ev); };
const _tplEditF = ACT.tplEdit;
ACT.tplEdit = el => { _tplEditF(el); const ev = el.dataset.e; if (WP_TPLS.includes(ev) && MODAL) { MODAL.body += tplAttSec(ev); renderModal(); } };
// Demo inbox: emails to workplace contacts show the attachments
const WP_KIND_TPL = { permRequest: 'Workplace permission link', permReminder: 'Workplace permission link', obsProposed: 'Observation proposed', obsRevised: 'Observation revised', obsConfirmed: 'Observation confirmed' };
const _wEmailBodyF = wEmailBody;
wEmailBody = function (e) { const h = _wEmailBodyF(e), ev = WP_KIND_TPL[e.kind]; if (!ev || !tplAtt(ev).length) return h; return h.replace('<hr>', `<div class="fu-att-mail"><p class="small strong">Attachments</p><ul class="list">${tplAtt(ev).map(f => `<li class="li small">${ic('clip2', 14)} <button class="linklike" data-act="wpcDoc" data-n="${esc(f)}">${esc(f)}</button></li>`).join('')}</ul></div><hr>`); };
// Workplace link pages: "Documents from Illumin Academy"
function wDocs(ev) { const fs = tplAtt(ev); return fs.length ? `<ul class="list fu-att">${fs.map(f => `<li class="li small">${ic('download', 14)} <button class="linklike" data-act="wpcDoc" data-n="${esc(f)}">${esc(f)}</button></li>`).join('')}</ul>` : '<span class="small muted">No documents.</span>'; }
ACT.wpcDoc = el => toast(`${el.dataset.n} downloaded (demo).`, 'info');
// Agency onboarding: data-sharing terms
let OA_TERMS = '';
const oaTermsShow = () => { const s = $('#oa-terms-st'); if (s) s.innerHTML = OA_TERMS ? `${ic('clip2', 14)} ${esc(OA_TERMS)} <button type="button" class="linklike" data-act="oaTermsRm">Remove</button>` : '<span class="muted">No file attached.</span>'; };
INP.oaTerms = el => { const f = el.files && el.files[0]; if (!f) return; if (!/\.(pdf|docx)$/i.test(f.name)) { fieldErr('#oa-terms', 'Attach a PDF or DOCX file'); return; } OA_TERMS = f.name; oaTermsShow(); };
ACT.oaTermsSample = () => { OA_TERMS = 'Illumin Academy data-sharing terms.pdf'; oaTermsShow(); };
ACT.oaTermsRm = () => { OA_TERMS = ''; oaTermsShow(); };
const _newAgencyF = ACT.newAgency;
ACT.newAgency = el => { OA_TERMS = ''; return _newAgencyF(el); };
AFTER.push(() => { if (typeof ADMIN !== 'undefined' && ADMIN && ADMIN.agencies && !ADMIN._fuTerms) { ADMIN._fuTerms = true; ADMIN.agencies.forEach(a => { if (!a.terms && a.loginStatus !== 'Not activated') a.terms = ['Illumin Academy data-sharing terms.pdf']; }); } });
