# Hero Millisecond Clock

This narrowly changes web-stage elapsed-time accounting, not the artwork or
financial engine. Current source already passes the older low-cadence contracts;
that historical clamp defect is not claimed as a newly reproduced failure.

## Corrected Boundary

After the first visible RAF, intervals 4000 + 3999.5 + 0.5 milliseconds total
eight seconds. Converting each interval to seconds before summing can leave
7.999999999999999 and schedule one extra frame. The endpoint pose was already
within its existing tolerance; this is not evidence of a permanently spinning
browser or measurable physical-performance harm.

The stage now accumulates RAF milliseconds as `elapsedMs`. It converts once at
`heroAngleAt` and compares against `HERO_TURN_SECONDS * 1000`. Replay resets
elapsedMs and its previous timestamp; visibility resets only the timestamp.
Duration, easing, first-visible-frame origin, reduced motion, loading, parent
visibility policy and resource ownership remain unchanged. No epsilon or early
rounding is used.

## Evidence

- Integrated pre-fix positives: six pass, four genuine endpoint assertion failures.
- Integrated resource/lifecycle suite: 38/38, including 15 appended cases/controls.
- Independent private candidate: 49/49 plus seven independent cases containing
  128 precisely generated actual-component timestamp schedules.
- Independent integrated-root review: six cases pass; exact source, five old
  mutation-target/unit rows and all 15 appended contracts verified.
- Full web regression command, ESLint and no-emit TypeScript checks pass locally.
  The common-month reference lane retains 23247 passed probes, zero failed.
- Both previous Kahan-regression schedules are retained: 2001 + 5694 + 305ms and
  5771.125 + 2112.5 + 31.875 + 76.625 + 7.875ms.

The earlier compensated-seconds proposal remains rejected: its 59 passing cases
missed two regressions found independently. Its evidence was not overwritten.
All old assertions remain; five mutation source targets use equivalent
milliseconds/current identifiers. There is no new test harness or dependency.
Exact hashes and dated review pointers are in the accompanying mission evidence.

## Release Limits

New-source exact-SHA GitHub CI, automatic preview and bounded browser checks are
separate gates, pending at this local checkpoint. Existing local servers and
their build remain protected; no local production rebuild is claimed here.

CPU tests simulate hooks, loading, RAF and rendering with real Three/helpers.
They do not establish universal floating-point correctness, real React/browser
scheduling, continuous smoothness, physical FPS, memory, energy or photorealism.
Parent hidden/offscreen disposal/remount still applies. Full collection art,
managed-backend, financial-model extensions, native and production gates remain
open. PR256 stays draft; no merge or production promotion.
