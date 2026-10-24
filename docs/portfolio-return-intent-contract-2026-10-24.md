# Portfolio Return Intent

The primary navigation now retains an explicit `scenario=portfolio` through
Learn and Settings, then back to the adopted Dashboard or Simulator. The first
decoded scenario value must match exactly. Bare, unknown, case-mismatched and
unsupported routes retain their existing behavior; explicit demo exits stay bare.

This is URL-only return intent, not financial ownership. The existing financial
selector and Guardian callback are unchanged. Cockpit, Vault and lesson-focused
Simulator links remain separate demos. No store mirroring, migration, new book
read on link rendering, calculation or advice change is introduced.

The parent reproduced 47 passing and two failing component assertions before
the fix, then 49 passing after it. A separate browser baseline on the unchanged
f85 preview observed three Learn-entry query failures at 280/375/1440px while
three adverse-state workflows passed. Settings and return paths were not reached
by those failed baseline flows. The stronger standing browser oracle retains
all 66 prior assertions and waits for the active navigation state before reading
it. All sixteen fresh local gates now pass, including six real browser workflows
at those widths and six information-page round trips. Saved book bytes remain
unchanged. A test-only precondition error was retained and corrected: after the
new Dashboard returns, the old Simulator demo-exit check explicitly restores its
original Simulator starting route. All 71 assertions remain; no app workaround
or timeout increase was introduced. New-head remote verification remains pending.

This does not complete all-route scenario consolidation or production readiness.
