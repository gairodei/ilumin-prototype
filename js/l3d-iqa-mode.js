/* ============================================================
   L3-D — IQA delivery-mode filter (8 Nov 2026; PD-L3D-* in PROVISIONAL-DECISIONS.md). Loads after l3c2-contract.js.
   An IQA can narrow the learners and marked records of their assigned batches to one delivery mode: All delivery modes (default),
   Self-Paced or Fully Assisted. One control, beside the batch filter (iqbPicker) on Learners, Assessment Records (every tab:
   submissions, observations, PD outcomes) and Portfolios; one filter (l3dKeep), applied where the batch filter is applied, so it
   combines with the batch filter and every table filter and only ever narrows the IQA's scope — it never widens it.
   Mode comes from what the learner accepted, never from a display label or the batch's default:
   - a learner with a sign-up: the fee option fixed at sign-up (signup.plan.opt), cross-checked with the approved terms fixed with
     it (signup.plan.cb8.opt); if the two disagree, the mode is Unknown;
   - a roster learner without one: the fee-option group recorded when they were placed in the batch (b.r2[lid].opt);
   - anything else (a standard programme fee, older records): Unknown — listed under All, never guessed.
   Same IQA role, permissions, sampling and standards for both modes. Sample sets, their items and findings are history: they are
   not filtered and nothing about them changes with the filter. Records, learners and allocations are read, never written.
   ============================================================ */
'use strict';

const L3D_MODES = ['Self-Paced', 'Fully Assisted'];
// The learner's delivery mode in a batch, or null (Unknown)
function l3dMode(lid, code) {
  const w = chWorldByLid(lid);
  if (w && w.signup && w.signup.plan) {
    const o = w.signup.plan.opt, P = w.signup.plan.cb8, pm = P && P.opt ? P.opt.mode || null : null;
    if (o && o.mode) return pm && pm !== o.mode ? null : o.mode;
    if (pm) return pm;
    return null;
  }
  const b = code && chBatch(code), x = b && b.r2 && b.r2[lid], o = x && x.opt && typeof r1Opt === 'function' ? r1Opt(x.opt) : null;
  return o && L3D_MODES.includes(o.mode) ? o.mode : null;
}
const l3dLbl = m => m || 'Unknown';
const l3dChip = m => m ? chip(m, m === 'Self-Paced' ? 'outline' : 'blue') : `<span class="small muted l3d-unk" title="No delivery mode was recorded with this learner's enrolment">Unknown</span>`;
// The chosen mode (S.iqa.mode), or null for All
const l3dPick = () => { const m = S.iqa && S.iqa.mode; return L3D_MODES.includes(m) ? m : null; };
// The one filter: does a learner in a batch match the chosen mode?
const l3dKeep = (lid, code) => { const m = l3dPick(); return !m || l3dMode(lid, code) === m; };

/* ---------- Where the batch filter applies, the mode filter applies too ---------- */
const _airL3D = allIqaRecords;
allIqaRecords = function () { const all = _airL3D.apply(this, arguments); return IQB_PICK && !IQB_RAW && l3dPick() ? all.filter(r => l3dKeep(r.lid, iqbRecBatch(r))) : all; };
const _plL3D = sibqPortLearners;
sibqPortLearners = function () { const out = _plL3D.apply(this, arguments); if (!IQB_PICK || !l3dPick()) return out; const ok = new Set(sibqScope().filter(x => l3dKeep(x.lid, x.batch)).map(x => x.lid)); return out.filter(([l]) => ok.has(l)); };
// Learner rows carry their mode (for the column and the Learners filter)
const _scL3D = sibqScope;
sibqScope = function () { return _scL3D.apply(this, arguments).map(x => ({ ...x, mode: l3dMode(x.lid, x.batch) })); };
const l3dRows = rows => rows.filter(x => l3dKeep(x.lid, x.batch));

/* ---------- The control, beside the batch filter ---------- */
const _pkL3D = iqbPicker;
iqbPicker = function (scr) {
  const h = _pkL3D.apply(this, arguments); if (!h) return h; const cur = l3dPick() || 'all';
  const sel = `<label class="small strong" for="l3d-m">Delivery mode</label><select class="select" style="width:auto" id="l3d-m" data-onchange="l3dPick" data-s="${scr}"><option value="all" ${cur === 'all' ? 'selected' : ''}>All delivery modes</option>${L3D_MODES.map(m => `<option value="${m}" ${cur === m ? 'selected' : ''}>${m}</option>`).join('')}</select>`;
  return h.replace(/<\/div>$/, `${sel}</div>`);
};
INP.l3dPick = el => { S.iqa.mode = L3D_MODES.includes(el.value) ? el.value : 'all'; if (el.dataset.s === 'q-portfolios') { S.params = {}; go('q-portfolios'); return; } render(); };
// A clear empty state when the mode filter leaves nothing
const l3dEmpty = what => l3dPick() ? `<div class="note b-blue l3d-none" role="status">${ic('info')}<div class="small"><strong>No ${what} for ${esc(l3dPick())} learners</strong> in ${iqbPick() ? esc(iqbPick()) : 'your scope'}. Choose "All delivery modes" to see every learner. Learners whose delivery mode wasn't recorded are listed under All as "Unknown".</div></div>` : '';
const _qrL3D = SCREENS['q-records'];
SCREENS['q-records'] = p => { const h = _qrL3D(p); if (S.portal !== 'admin' || !l3dPick()) return h; IQB_PICK++; let n; try { n = allIqaRecords().length; } finally { IQB_PICK--; } return n ? h : eAfterHead(h, l3dEmpty('marked records')); };

UXC.push(['L3-D', 'IQA: filter by delivery mode (8 Nov 2026)', [
  'Learners, Assessment Records (submissions, observations, PD outcomes) and Portfolios have a Delivery mode filter beside the batch filter: All delivery modes, Self-Paced or Fully Assisted. It works within mixed batches and combines with the other filters; it never shows anything outside the IQA\'s assigned batches.',
  'The mode is the one the learner accepted with their fee option. A learner without a recorded mode is shown as "Unknown" and appears under All only. Sample sets and findings are not filtered and don\'t change.']]);
