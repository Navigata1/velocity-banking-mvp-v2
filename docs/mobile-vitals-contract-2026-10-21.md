# Dashboard Vital Readability

## Scope

Keep the original four-vital dashboard, selected asset, Money Loop and coach tone.
Correct narrow-screen typography without changing any financial calculation,
rounding, scenario, persisted value, native route, hero asset or motion contract.

The existing four-column mobile strip could break `Est. $51.50/day` inside
`/day`. Its amount still fit the card, so the earlier overflow-only test passed.
The new real-browser character-range test reproduced this assertion failure on
the unchanged build before the CSS fix. Before screenshot/layout and RED output
are retained; the first failed invocation was a missing output directory, not a
test result, and is not counted as a RED.

## Display Change

- Mobile vitals use two columns, keeping all four cards above the asset hero.
- Grid items may shrink within their tracks; no value is truncated or rewritten.
- Values use a fixed 14px size, or fixed 12px for strings longer than 18 characters.
  This is content-based sizing, not viewport-scaled type. Long values retain their
  complete currency, precision, estimate marker and daily unit.
- Desktop typography/layout, captions, assistive text and assumptions are retained.
- Asset artwork remains the default; optional genuine 3D viewing is unchanged.

## Browser Contract

`npm --prefix apps/web run smoke:dashboard:built` exercises 18 complete workflows:
six literal House/Auto/cleared/sub-cent/independent-rounding/large-import fixtures
at 280px, 375px and 1440px. It retains the existing income edit/restore/navigation,
seven oversized currency no-op edits, exact values, disclosures and saved-data
checks. House and large-import additionally probe 768px/1264px responsive layouts.

Actual DOM text ranges prove that currency amounts, alphabetic label/value words
and `/day` remain on one line per token and within their text/card bounds. Labels
remain Cash Flow, Interest Burn, Debt-Free ETA and Next Move; all four cards must
fit in the first viewport. Values must remain at least 12px, with no horizontal
text/page overflow. The three main widths must leave at least 48px of the asset
hero visible. Browser errors/overlays still fail the gate. JSON records the text,
font sizes, token geometry results and responsive probes; screenshots are saved.

Independent review then refuted three initial test claims: hidden values,
vertical clipping and label/value collisions were accepted despite broken pixels.
Parent REDs reproduce those counterexamples, including ancestor opacity/clipping.
The strengthened checks inspect ancestor visibility/opacity, vertical bounds and
overflow clipping, and label/value glyph separation. A further RED caught vacuous
acceptance of an empty value. Seven real DOM negative controls now reject all
these defects and verify exact positive-layout restoration after each mutation.
These are bounded browser geometry/style checks, not universal paint certification.

Two obsolete regression assertions required the exact old four-column CSS
string. They are removed in favor of these rendered checks, not replaced with
a new two-column string assertion. All other regressions, financial assertions,
timing limits, hero pixel checks and publication budgets remain intact.

## Verification Boundaries

Browser plugin skill is not listed in this session. The existing repository's
finite Chrome/Playwright harness is used under the user's explicit browser/Chrome
testing authorization. Its ephemeral servers/isolated fixtures are cleaned up;
the user's existing 53143/53144 servers are not operated on.

The previous `caefd80` baseline was freshly checked against GitHub, raw CI logs,
READY Vercel identity, 285 HEAD source fingerprints, 109 evidence files and the
198-entry Desktop manifest. See its receipt on PR256, comment 6313685208. These
are baseline checks, not newly executed application tests. Current implementation
proof is separate, and both complete exact-head CI events plus hosted 88 workflow
cases/routes/model/poster hashes are required after pushing this change.

This bounded fix is not complete mobile accessibility, zoom, locale-complete
typography/keyboard, physical-device or production approval. Final collection
art, shared scenarios/common-date wealth, lender/calendar, provider/backend,
dependency exposure, device and release gates remain open.
