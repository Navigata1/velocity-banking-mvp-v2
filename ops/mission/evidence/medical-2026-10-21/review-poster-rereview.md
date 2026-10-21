# Bounded Publisher/Packager Re-review

Verdict: both previously reported P2 findings are resolved in the reviewed code.
No further important correctness regression found in this bounded pass. The
pre-existing live-manifest copy race is also resolved for the exercised package
snapshot/cooperative-lock interleavings. This supersedes the open-finding verdict
in `review-poster-findings.md`, which remains a historical first-pass record.

## Code Reviewed

- `apps/media/scripts/hero-poster-publication.mjs`, particularly lines 8-11,
  24-27, and 31-45: positive safe-integer revisions, legacy undefined=1, validation
  of all stored records, fresh numeric revision and budget checks under the lock.
- `apps/media/scripts/package-hero-collection.mjs`, particularly lines 7-16 and
  22-29: existing shared lock, captured JSON buffers, one read/hash/write snapshot
  per payload, and delivery of captured rather than reopened JSON files.
- The added sixth/seventh tests in `medical-poster.test.mjs`; the packager's
  manifest expectations were checked against actual model/video manifest field
  shapes only, without reviewing model geometry or executing a real package.

Source hashes stayed unchanged across the run and are recorded in
`review-poster-rereview.log`:

- Publisher SHA: `1620b28d99bfb14e4f52b16c80b4926e59bc94648262b6492fe275f84309d989`.
- Packager SHA: `d22965484de8ba7c423ecf5b6a187c63dbb3729e5d42442ff119294b074a127e`.
- Tests SHA: `d8f0068cffa701aa45692fb189ec41c6167e10c568213cadcd2b9ffa675ea125`.

## Fresh Evidence

```powershell
node --experimental-vm-modules .superpowers/sdd/2026-10-21-medical/review-poster-rereview.mjs
node --test --test-name-pattern '^Collection packaging delivers' apps/media/scripts/medical-poster.test.mjs
```

Both commands exited 0. The repository's actual new packaging regression passed
1/1 selected tests using its Acorn-based execution adapter. I did not claim a
fresh full seven-test run; the real on-disk tests are left with the parent.

The independent scratch harness evaluates unmodified current modules with an
in-memory filesystem adapter and the actual shared-lock implementation. It
verified:

- 13 malformed incoming revisions reject before lock acquisition/output writes.
- 22 malformed stored-record cases reject before asset/provenance writes,
  including records whose IDs do not match the incoming Medical update.
- Missing revisions remain legacy revision 1; upgrading to 2 works and later
  replacing it with an undefined revision rejects.
- Caller Buffer/record mutation while queued still cannot change staged output.
- A queued numeric revision 2 cannot overwrite a completed numeric revision 3.
- All four payload paths and all three JSON paths actually mutate immediately
  after their reads. Each is read once, and all seven delivered files match the
  captured pre-mutation snapshots. All package reads, writes, and mkdir calls
  occur while the existing shared lock is held.
- A bad source PNG, poster WebP, GLB, or MP4 causes rejection without writing the
  final package provenance; each failure releases the lock.
- Four URL/path containment counterexamples still reject before payload writes.
- Packaging pauses while holding the default shared lock; a publisher using its
  default lock queues behind it. The package retains coherent revision 2 bytes
  and provenance, then the live publication advances to revision 3 afterward.

## Limits

No actual full package/originals run, public-budget/originals run, render, browser,
server, GPU, dependency, cloud, production, credential, commit, or push operation
was performed. Only permitted scratch files were edited or generated.

Filesystem-adapter interleavings do not prove Windows sharing behavior, slow
real-disk package timing, process-crash durability, or arbitrary noncooperating
writers. Source containment is still lexical/URL rather than realpath confinement
through symlinks/junctions. A rejected package may leave earlier individual files;
there is no whole-set transaction or crash-atomicity clearance. These are retained
scope limits, not new important findings from the reviewed fix.
