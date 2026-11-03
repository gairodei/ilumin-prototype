/* ============================================================
   SIB-FINAL A — System Admin client feedback (3 Nov 2026; PD-SIB-A-01…). Loads after sa-e-reports.js.
   The three questions were "how does it work", and each feature already works as accepted (OBS-1 / OBS-1b, S5d / SA-FINAL D,
   S4b / CF / AA-FOLLOWUP). Each screen now explains its workflow in place, from the existing behaviour only — no new editor,
   rule, route or record:
   SYS-01 Observation Criteria Library: category → criteria → evidence per criterion → publish → select in the NVQ Programme
          Builder (Workplace / Academy office, "Same as Workplace" with exclusions) → publish the programme (frozen snapshot) →
          used in the learner's observation; library versions; qualification criteria versus Academy standards; who manages it.
   SYS-02 Referrals: who issues and who uses a code, where it is entered, how attribution and counts work, how a referral
          differs from an agency-linked learner, and the limitations (no public link, placeholder domain, attribution is not a
          paid enrolment, no commission or payout). The same text for the Super Administrator, System Administrators and the
          Business Admin.
   SYS-03 Learning Repository: repository versus programme content, the lifecycle (Draft → Published → new versions →
          Unpublished / Retired), types, module links, release rules and the Coordinator's batch release, roles, learner access
          and the SCORM demonstration notice; the counts by status and by programme module come from the resource store.
   ============================================================ */
'use strict';

/* ---------- SYS-01: Observation Criteria Library ---------- */
const SIBA_OCL = `<section class="card sib-how sib-ocl-how"><h2>How the Observation Criteria Library works</h2>
  <ol class="sib-flow small">
    <li><strong>Create a category</strong> — "New category": a short code (for example ABS), a name and a description. A category groups related criteria.</li>
    <li><strong>Add criteria</strong> — open the category's draft and add its criteria (code ABS-01…, title, instructions for the assessor, order). Criteria are only created here.</li>
    <li><strong>Configure evidence</strong> — for each criterion, choose the evidence the assessor can record (assessor notes, photos, videos, documents, authorised references) and which are required.</li>
    <li><strong>Publish the category</strong> — it becomes a frozen version (Version 1, 2…). Later edits start a new draft; a published criterion is retired, never deleted.</li>
    <li><strong>Select it in a programme</strong> — NVQ Programme Builder → step 4 Observations → "Workplace Observation Criteria" and "Academy Observation Criteria": choose published categories, with all their criteria or chosen ones. The Academy tab can use "Same as Workplace" (inherited criteria can be excluded one by one) or its own selection, plus Academy-only additions.</li>
    <li><strong>Publish the programme version</strong> — the selection is frozen into that version. Learners on it keep those criteria even if the library changes later.</li>
    <li><strong>Used in the learner's observation</strong> — the Coordinator chooses the location for each observation; the assessor sees that location's criteria, records evidence per criterion and an outcome; the signed report is locked.</li></ol>
  <div class="grid-2 small"><div><h3 class="small">Two kinds of observation criteria</h3><p><strong>Qualification (NVQ) criteria</strong> come from the curriculum (Learning Outcomes of the Observation type) and map to the awarding body's units. They are not library content. <strong>Academy standards</strong> are this library's criteria — the Academy's own internal standards — and never replace qualification criteria.</p></div>
  <div><h3 class="small">Who manages it</h3><p>The Super Administrator, Academic Admins and System Administrators create, edit and publish categories. A custom role with Courses &amp; Programmes: View can view. Editing a category never changes published programme versions, learners' requirements or recorded observations.</p></div></div></section>`;
const _oclSIBA = SCREENS['k-ocl'];
SCREENS['k-ocl'] = p => { const h = _oclSIBA(p); return p && p.id ? h : eAfterHead(h, SIBA_OCL); };

/* ---------- SYS-02: Referrals ---------- */
const SIBA_REF = `<section class="card sib-how sib-ref-more"><h2>Referral codes, agency learners and what referrals don't do</h2><ul class="small sib-list">
  <li><strong>Who issues a code</strong> — the Super Administrator, a System Administrator or the Business Admin, for an agent, an agency (chosen from the existing agencies) or a Welfare Buddy.</li>
  <li><strong>Who uses it</strong> — the person being introduced, when they create their own learner account. The code is typed into the optional "Referral / Agent Code" field on the registration form.</li>
  <li><strong>How a referred learner is identified</strong> — their learner record shows "<em>type</em> referral (code <em>CODE</em>)" from verified registration; the Attribution tab lists them. Counts are those learner records, so every screen shows the same number.</li>
  <li><strong>Not an agency link</strong> — an agency's learners are the ones it gave a bundle seat to, or linked through an approved link request (Agencies → Learners). An Agency referral code only records who introduced a learner: it doesn't make them that agency's learner, use a seat or show the agency their progress.</li></ul>
  <div class="note b-amber sib-ref-limits">${ic('alert')}<div class="small"><strong>Current limitations:</strong> there is no public referral link (no deployed route); illumin-academy.example is a placeholder domain, not a referral service; attribution records a registration, not a paid enrolment; there are no commissions, rewards or payouts. Self-referral and reward rules are not defined (client decision).</div></div></section>`;
const _refSIBA = SCREENS['a-referrals'];
SCREENS['a-referrals'] = p => {
  const h = _refSIBA(p); if (typeof h !== 'string' || (p && p.tab === 'attribution')) return h;
  const k = h.indexOf('<section class="card sad-ref-how">'), e = k >= 0 ? h.indexOf('</section>', k) : -1;
  return e >= 0 ? h.slice(0, e + 10) + SIBA_REF + h.slice(e + 10) : eAfterHead(h, SIBA_REF);
};

/* ---------- SYS-03: Learning Repository ---------- */
function sibaResCounts() {
  const R = (typeof S4B === 'function' && S4B().res) || [], by = {}; R.forEach(r => { by[r.status] = (by[r.status] || 0) + 1; });
  const mods = {}; R.filter(r => !r.legacy && r.pid).forEach(r => { const pr = (ADMIN.programmes || []).find(x => x.id === r.pid), k = `${pr ? pr.title : r.pid} · ${r.unit || '—'} · ${r.mod || '—'}`; mods[k] = (mods[k] || 0) + 1; });
  return { n: R.length, by, mods, legacy: R.filter(r => r.legacy).length };
}
function sibaResHow() {
  const c = sibaResCounts(), st = ['Draft', 'Published', 'Unpublished', 'Retired', 'Expired'].filter(s => c.by[s]).map(s => `${c.by[s]} ${s.toLowerCase()}`).join(' · ') || 'none yet';
  return `<section class="card sib-how sib-res-how"><h2>How the Learning Repository works</h2>
  <p class="small">This is the one place where learning resources are kept. Each resource belongs to a programme and one of its modules (from the programme's published structure) and reaches the learners on that programme and module. The NVQ Programme Builder's "Resources &amp; Delivery" step only lists and links here; assignment briefs and the questions learners answer are managed in Assignments, not here.</p>
  <ol class="sib-flow small"><li><strong>Add</strong> — "Add resource": title, type, the file or link, programme and module, and the release rule. It starts as a Draft that learners can't see.</li>
    <li><strong>Publish</strong> — learners on that programme and module see it from its release: immediately, on a date, or after a module is complete.</li>
    <li><strong>New version</strong> — replaces the file or link; earlier versions stay in "Versions".</li>
    <li><strong>Unpublish or retire</strong> — removes it from learners; nothing is deleted and the history is kept.</li></ol>
  <ul class="small sib-list"><li><strong>Types:</strong> PDF, DOCX, PPT, Vimeo video, SCORM package and web link. Files are recorded by name — the files themselves are simulated in the prototype.</li>
    <li><strong>Who:</strong> the Super Administrator, Academic Admins and System Administrators add, edit, publish, version, unpublish and retire (there is no separate approval step). A Coordinator can change a resource's release for their own batch. Teachers and Assessors open resources through their learners' records.</li>
    <li><strong>Learners</strong> see only Published resources of their own programme and module, once released; opening is recorded in the access log.</li>
    <li><strong>SCORM</strong> is a demonstration only: package execution, progress tracking and completion reporting aren't implemented, and nothing completes or scores from it.</li></ul>
  <p class="xs muted sib-res-n">In this repository: ${plural(c.n, 'resource')} (${esc(st)})${c.legacy ? `, of which ${c.legacy} older short-course item${c.legacy === 1 ? '' : 's'} not linked to a module` : ''}.${Object.keys(c.mods).length ? ' By module: ' + Object.entries(c.mods).map(([k, n]) => `${esc(k)} (${n})`).join('; ') + '.' : ''}</p></section>`;
}
const _resSIBA = SCREENS['a-resources'];
SCREENS['a-resources'] = p => { const h = _resSIBA(p); return typeof h === 'string' && /Learning Resources/.test(h) && S.portal === 'admin' ? eAfterHead(h, sibaResHow()) : h; };
