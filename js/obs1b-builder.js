/* ============================================================
   OBS-1b — One observation set-up workflow in the programme builder (2 Nov 2026; PD-OBS1B-* in PROVISIONAL-DECISIONS.md).
   Loads after obs1-library.js.
   Section 4 had criteria in two places: the Observation configuration tab still carried the N5a cards "NVQ observation criteria"
   and "Academy standards (IA criteria)" next to OBS-1's Workplace / Academy Observation Criteria tabs. Now:
   - Observation configuration = Settings (required / workplace / Academy office), the publishing checks, a "Criteria by location"
     summary with links to the tabs, the version list and the audit. No criteria cards.
   - Workplace Observation Criteria = Academy standards from the library + the qualification (NVQ) criteria from the curriculum
     + this programme's own Academy (IA) criteria where the version has any (earlier set-up, kept with their NVQ mapping).
   - Academy Observation Criteria = same as Workplace / own library criteria + the qualification (NVQ) criteria.
   The cards are moved, not rewritten: the same tables, buttons and handlers (n5NvqEv, n5IaEdit, n5IaState), so evidence settings,
   mapping, retire / restore and every check behave as before. NVQ criteria and Academy standards stay separate; nothing is
   converted. Nothing is stored differently: STORE.n5, the published snapshots and observation records are untouched.
   A published version that has no location tab (published before N5, or not required) keeps its criteria on the configuration tab,
   read-only, as its historical record.
   ============================================================ */
'use strict';

const ol1bTabs = d => ({ wp: !!(d && d.required === true && d.workplace === 'Permitted'), off: !!(d && d.required === true && d.office === 'Available') });
// The criteria cards move to the location tabs of a draft, or of a published version that has those tabs
const ol1bMoved = d => !!d && (d.state === 'Draft' || ol1bTabs(d).wp || ol1bTabs(d).off);
function ol1bMap(pr, d) {
  const t = ol1bTabs(d), nvq = n5Nvq(pr, d).filter(c => c.st === 'Active').length, iaOn = (d.ia || []).filter(c => c.status === 'Active').length;
  const lib = loc => { try { return ol1Resolve(d, loc).items.length; } catch (e) { return 0; } };
  const open = (tab, l) => `<button class="btn btn-sm" data-go="a-programmes" data-id="${pr.id}" data-tab="${tab}">Open ${l}</button>`;
  const note = `<p class="xs muted">${ic('info', 12)} Qualification (NVQ) criteria come from the curriculum — Learning Outcomes of the Observation type, Section 2. Academy standards come from the Observation Criteria Library. They are kept separate; neither is converted into the other. Nothing here records or decides an outcome.</p>`;
  if (d.required !== true) return `<section class="card ol1b-map"><h2>Criteria by location</h2><p class="small">${d.required === false ? 'Observation isn\'t required for this version, so there are no criteria tabs. Selections and criteria already recorded are kept, and are not published as requirements.' : 'Choose "Observation required" in Settings. A criteria tab appears for each location you enable.'}</p>${note}</section>`;
  const row = (on, cls, name, parts, tab, l, why) => `<li class="li ${cls}"><div class="li-b"><strong>${name}</strong><span class="xs muted">${on ? parts : why}</span></div>${on ? open(tab, l) : chip('Not enabled', 'grey')}</li>`;
  const q = plural(nvq, 'qualification (NVQ) criterion', 'qualification (NVQ) criteria');
  return `<section class="card ol1b-map"><h2>Criteria by location</h2><ul class="list small">
    ${row(t.wp, 'ol1b-wp', 'Workplace observation', `${plural(lib('wp'), 'Academy standard', 'Academy standards')} from the library + ${q}${iaOn ? ' + ' + plural(iaOn, 'programme Academy criterion', 'programme Academy criteria') + ' (earlier set-up)' : ''}`, 'wpcrit', 'Workplace Observation Criteria', 'Workplace observation isn\'t permitted for this version.')}
    ${row(t.off, 'ol1b-off', 'Academy-office observation', `${plural(lib('off'), 'Academy standard', 'Academy standards')} from the library + ${q}`, 'offcrit', 'Academy Observation Criteria', 'Academy-office observation isn\'t available for this version.')}</ul>${note}</section>`;
}
// Observation configuration: settings, checks and the summary; the criteria cards are on the location tabs
const _secB = n5Section;
n5Section = function (pr) {
  const h = _secB.apply(this, arguments); if (!pr || !n5CanView()) return h;
  const d = n5Shown(pr); if (!ol1bMoved(d)) return h;
  const dv = document.createElement('div'); dv.innerHTML = h;
  ['.n5-cover', '.n5-nvq', '.n5-ia'].forEach(s => { const e = dv.querySelector(s); if (e) e.remove(); });
  const set = dv.querySelector('.n5-settings'); if (set) set.insertAdjacentHTML('afterend', ol1bMap(pr, d));
  return dv.innerHTML;
};
// The location tabs: the same cards, renamed for what they are, under the library criteria
const _panelB = ol1Panel;
ol1Panel = function (pr, loc) {
  const h = _panelB.apply(this, arguments); if (!n5CanView()) return h;
  const d = n5Shown(pr); if (!d) return h;
  const dv = document.createElement('div'); dv.innerHTML = _secB(pr);
  const nv = dv.querySelector('.n5-nvq'), ia = dv.querySelector('.n5-ia'), iaN = (d.ia || []).length;
  const retitle = (el, t, p) => { const h2 = el.querySelector('h2'); if (h2) h2.textContent = t; const intro = el.querySelector('p.small.muted'); if (intro) intro.textContent = p; };
  let cards = '';
  if (nv) { retitle(nv, 'Qualification criteria (NVQ) — from the curriculum', `Learning Outcomes of the Observation type in this version's structure — change them in Section 2, Curriculum. Observed at both locations, with the same evidence settings at both. These are qualification criteria, separate from the Academy standards above.`); cards += nv.outerHTML; }
  if (loc === 'wp' && ia && iaN) { retitle(ia, 'Programme Academy criteria (earlier set-up)', `This programme's own Academy criteria from before the Observation Criteria Library, each mapped to NVQ criteria. They stay on this version's workplace observations and aren't converted into library criteria. New Academy standards are added from the library above.`); cards += ia.outerHTML; }
  const tail = `<p class="xs muted ol1-nvqnote">${ic('info', 12)} ${loc === 'off' && (d.ia || []).some(c => c.status === 'Active') ? 'Programme Academy criteria (earlier set-up) apply at the workplace only. ' : ''}Nothing here records or decides an outcome.</p>`;
  return h.replace(/<p class="xs muted ol1-nvqnote">[\s\S]*?<\/p>/, cards + tail);
};
