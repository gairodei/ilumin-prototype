/* ============================================================
   Batch F follow-up — cross-portal route safeguard (23 Oct 2026; PD-F-10 in PROVISIONAL-DECISIONS.md).
   Root cause: each portal decides which routes it renders.
     - The learner portal had no route check: pageHtml() rendered any SCREENS entry, so a learner who typed #a-audit, #f-ledger,
       #t-queue, #c-learner… saw that screen (actions were still refused by their own checks).
     - The admin persona guards each listed only the route prefixes that existed when they were written: Finance checked a- only,
       Academic a- and f-, so Finance could open Academic (k-) and Business (b-) screens and Academic could open Business screens;
       System Admin had no k- / b- check at all.
     - Coordinator, staff and agency portals already render only their own prefix (anything else returns to their dashboard).
   The fix reuses each persona's existing route set (built from its own navigation) — no new permission model, no role changes:
     - learner portal: another portal's route (a- f- k- b- q- c- t- g-) shows an access-denied page;
     - admin console: the unguarded prefixes above are checked against FIN_ROUTES / ACA_ROUTES, and for System Admin against the
       Super Admin console's navigation (ANAV), which it uses.
   Each refusal is logged once per attempt (security event + audit). The check runs before the screen renders, so nothing of the
   screen is built and the stale-link fallback can never open another record in its place.
   Loads last.
   ============================================================ */
'use strict';

const RG_OTHER = /^(a|f|k|b|q|c|t|g)-/;           // another portal's routes, as seen from the learner portal
const RG_ANAV = new Set(ANAV.flatMap(([, i]) => i.map(x => x[0])));
const rgLog = (who, route, why) => {
  const key = `${S.portal}|${who}|${route}|${(S.params || {}).id || ''}`; if (S._rgLast === key) return; S._rgLast = key;
  if (ADMIN && ADMIN.security) ADMIN.security.unshift({ id: 'SE-R-' + (ADMIN.security.length + 1), sev: 'Medium', at: now().toISOString(), type: 'Out-of-scope access', detail: `${who} opened ${route}`, reviewed: false });
  logA('Security', route + ((S.params || {}).id ? ' · ' + S.params.id : ''), 'Blocked: open screen', '—', '—', `${who}: ${why}`);
};
const rgDenied = (msg, to, lbl) => `<div class="lockpage rg-deny"><div class="lock-ic">${ic('lock', 30)}</div><h1>You don't have permission — logged</h1><p class="muted">${msg} The attempt has been recorded in the security log.</p><button class="btn btn-primary" data-go="${to}">Go to ${lbl}</button></div>`;

/* ---------- Learner portal ---------- */
const _pageHtmlRG = pageHtml;
pageHtml = function () {
  if (S.signedIn && !S.serverError && RG_OTHER.test(S.route || '')) {
    rgLog(`Learner ${W && W.me ? chFullName(W) + ' (' + W.me.id + ')' : ''}`.trim(), S.route, 'not a learner screen');
    return rgDenied('This screen isn\'t part of the learner portal.', 'dashboard', 'your dashboard');
  }
  return _pageHtmlRG.apply(this, arguments);
};

/* ---------- Admin console: the prefixes the persona guards didn't cover ---------- */
function rgAdminWhy(r) {
  const p = (r.match(/^([afkbq])-/) || [])[1]; if (!p || !SCREENS[r]) return null;
  if (isFin() && ['k', 'b'].includes(p) && !FIN_ROUTES.has(r)) return ['Finance Admin', 'f-dashboard', 'Finance Dashboard'];
  if (isAca() && p === 'b' && !ACA_ROUTES.has(r)) return ['Academic Admin', 'k-dashboard', 'Academic Dashboard'];
  if (ADMIN.sysRole && !isFin() && !isSA() && ['k', 'b'].includes(p) && !RG_ANAV.has(r)) return ['System Administrator', 'a-dashboard', 'Dashboard'];
  return null;
}
const _pageRG = adminPage;
adminPage = function () {
  const w = S.portal === 'admin' && !S.serverError && rgAdminWhy(S.route || '');
  if (w) { const [role, to, lbl] = w; rgLog(`${role} ${ADMIN.me.name}`, S.route, `not part of the ${role} role`); return rgDenied(`This screen isn't part of the ${role} role.`, to, lbl); }
  return _pageRG.apply(this, arguments);
};
