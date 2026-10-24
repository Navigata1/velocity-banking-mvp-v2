# Replay Clock Boundary

Prior head `6ce6e5ede081903d771f5d9745826bcd42f88e96` is NOT a verified checkpoint.
Both full attempt1 CI events39702904111 and39702908995 failed their hero job.
Primary and SQL results are retained separately; no CI reruns replace a failure.
Successful local28stages and hosted138workflows do not override failed CI.

The extra `verifyReplay` setup resumed an already-controlled sample, calculated
`Date.now()+100`, then sent a separate pause request. Both actual failure stacks
report a past target there. Delay across the running-clock/transport boundary is
the supported explanation, not a directly measured latency distribution.

The repair deletes three statements: the helper re-pause and its two callers'
early resumes. Original captures and Replay now share the existing paused sample;
the helper still resumes in `finally`. No sleeps, retries, larger margins, altered
pixel assertions, cadence, readiness deadlines, byte limits or CI caps are added.
The original16ms primer and15x100ms motion samples remain unchanged.

The new protocol test extracts actual helper functions with TypeScript AST and
executes them against a paused caller and250ms adverse pause-delivery fixture.
Its numeric image phases isolate clock ownership, not real rendering. Permanent
negative controls reject re-pause and premature caller resume. An independent
six-case probe additionally rejects each individually restored statement.
Real browser PNG/canvas/motion proof still runs for all ten heroes at both widths.

Fresh local verification covers complete web tests, lint, build,20hero/replay
cases and fallbacks. Prior219media/27stills/native/tenvideo exports are explicitly
inherited with frozen inputs, not newly rerun locally. Both NEWfull exact-head CI
events and a fresh exact READY preview/hosted138/20servedhashes/actual IAB are
required before publishing a verified receipt.

The original initial `Date.now()+100` setup remains an inherited P2 reliability
risk. This bounded repair removes the newly introduced Replay boundary only;
it does not establish general clock safety. Photoreal/full-angle art, hardware
compatibility, security, backend, lender/calendar and native/release gates remain
open. Runtime, all ten models/posters, manifests and financial math are unchanged.
