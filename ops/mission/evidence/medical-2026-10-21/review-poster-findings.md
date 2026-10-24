# Independent Medical poster/pipeline review

Verdict: two P2 correctness gaps reproduced. The actual current Medical artwork,
hash lineage, deterministic encoding, numeric-revision guards, input snapshots,
and cooperative publication budget locking receive bounded clearance. This is
not a whole-collection, model, merge, deployment, or production clearance.

Review context: Mission Control Tier 2 independent verifier; base HEAD
`ecc682a177bad936a2275269e73de76d58f9c2ac`, plus the existing uncommitted Medical
poster work. Only permitted `review-poster-*.mjs/md/log` scratch files were written.
Reviewed source digests are recorded in `review-poster-probes.log`; they stayed
unchanged across the probe run.

## Findings

### P2: Package the source snapshot that passed validation

Location: [package-hero-collection.mjs](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media/scripts/package-hero-collection.mjs:12>), lines 12-14.

The script hashes the `bytes` returned by `readFile(sourceFile)` but then packages
the source by calling `copyFile(sourceFile, ...)`, reopening a mutable pathname.
If the retained edited PNG changes between those awaits, the packaged source
does not match `hero.sourceSha256`, yet the command reports success. The new hash
check does not guarantee the contents of the file actually delivered.

Repro: run the scratch probe command below. The unmodified package module runs
with a deterministic in-memory filesystem adapter that replaces the source at
the `copyFile` boundary, after the original bytes passed the real SHA-256 check.
`package-source-mutation-after-validation` records:

- Validated source SHA: `24991272baff80f71e1f2fca70533c93c62bc23d102a0a729e3765bf1c76f12a`.
- Packaged source SHA: `11e259fa0ef29e81fdb011c49864bcd91163db49ad9d2447db8517c90641278c`.
- Command reached its success message; packaged bytes are `unvalidated-source`.

Suggested focused correction: write the already validated `bytes` to the package
destination. Add a source-change-between-validation-and-delivery regression.
The old script also copied a live path; the finding is specifically a gap in the
new edited-source integrity guarantee, not a claim that all package races are new.

### P2: Validate revisions before mixed-type comparisons

Location: [hero-poster-publication.mjs](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media/scripts/hero-poster-publication.mjs:31>), lines 31-32; input originates from `config.revision` at [prepare-medical-poster.mjs](<C:/Users/IslandDevCrew/Documents/Interest Shield/apps/media/scripts/prepare-medical-poster.mjs:19>).

The downgrade guard uses coercing `>` but the same-revision guard uses strict
`===`, without first validating the revision's type. Existing numeric revision
`3` plus incoming string `"3"` and changed bytes passes both guards and overwrites
the edited poster without a new revision. The committed JSON configuration is a
source of this value and is not schema-validated. An incoming `"invalid"` also
passes, stores a nonnumeric revision, and allows a subsequent numeric revision 1
to replace revision 3 through that malformed intermediate record.

Repros: `malformed-string-revision` confirms changed bytes accepted with existing
numeric 3/incoming string `"3"`; `invalid-revision-then-downgrade` records accepted
revision sequence `[3,"invalid",1]`.

Suggested focused correction: require a positive safe integer for every supplied
revision before staging/publication, preserving the existing missing-revision=1
legacy convention. Test numeric strings and nonnumeric strings; assert no asset
or provenance write on rejection. Actual current `poster.json` uses numeric 2,
so this does not show corruption of the present delivered poster.

## Verified Boundaries

- Retained generated PNG: 1,698,030 bytes; 1536x1024 RGBA; SHA
  `30dd8c59ba54ce8608863eaf9f8835c40296e829d1e97f635fb1f1d2b732e41f`.
  Native sharp pixel inspection found 777,424 alpha<16 and 783,354 alpha>240
  pixels, 50,083 emerald badge pixels, and zero red-threshold pixels anywhere.
  Visual inspection agrees that the visible mark is a green shield, not a cross.
- Retained original input: 143,410 bytes; SHA
  `090b189bd6ec0a40e23ad470acbf86ff0b950a481153fc6f991a2876e5e9cda2`.
  It retains 38,784 red badge pixels. Its SHA/previous-source name and original
  generation SHA agree with the predecessor Medical provenance read from HEAD.
- Delivered WebP: 130,728 bytes; 1200x800 RGBA; SHA
  `d583676e52f8742757c33b865603210e0b5430c78feda5243ef70c2b5a6c87a1`.
  The real preparation function reproduces these exact bytes and the full current
  Medical record, and rejects corrupted source/original inputs.
- Mutating the caller's output Buffer and record while publication is waiting
  does not change the staged bytes or staged metadata.
- Ordinary numeric downgrade and same-numeric-revision/changed-poster rejection
  happen without output or provenance writes. Concurrent revision 3 then revision
  2 publication keeps revision 3 because the queued publisher reads live state.
- Concurrent publishers cannot each spend stale aggregate headroom: a first
  exact-cap publication succeeds, then the second cap+1 attempt rejects before
  writing the second asset. A separately held existing `withHeroManifestLock`
  that introduces model bytes likewise forces the queued poster to recheck and
  reject before output/JSON writes. Lock-file I/O is excluded from that statement.
- Six invalid/path-shaped poster IDs reject before publication. The actual
  Medical `sourceFile` resolves from repository root into `apps/media/sources/`.
  Native URL normalization and the script's trailing-slash prefix check reject
  traversal, encoded-dot traversal, a sibling-prefix directory, a remote URL,
  and an encoded slash before any file copy.

## Evidence And Limits

Fresh native test run, exit 0, 4/4 selected tests passed:

```powershell
node --test --test-name-pattern 'Medical poster retains|Medical fallback preserves|Medical poster preparation|Legacy poster preparation' apps/media/scripts/medical-poster.test.mjs
```

Deterministic CPU probes, exit 0 with explicitly labeled reproduced failures:

```powershell
node --experimental-vm-modules .superpowers/sdd/2026-10-21-medical/review-poster-probes.mjs
```

The probes evaluate the unmodified publisher, shared lock, and package source;
only filesystem operations are substituted with an in-memory adapter. Native
Node URL/path/crypto/timer behavior and native sharp decoding are used. This
proves the exercised interleavings and branch behavior, not OS-level durability,
Windows sharing-violation recovery, or process-crash behavior. Probe exit 0 means
the expected observed outcomes were reproduced, not that the findings are fixed.

The parent's existing `poster-green-first.log` records all five poster tests
passing, including its real on-disk cap-plus-one rejection. I did not rerun the
fifth test because it creates `apps/media/.cache/...` outside my permitted scratch
area. My virtual concurrent cap+1 probes are separate and described above.

The legacy-routing test is an AST check, and packaging assertions in that test
are textual. Full real-original legacy rebuild/idempotency and actual collection
packaging remain with the parent, as requested; I did not duplicate them.

Containment clearance is lexical/URL only: no `realpath` check is present, so this
does not prove confinement through a symlink or Windows junction. No such link
was installed or tested in actual media sources. These are local trusted repo
inputs; no remote-input or credentials/exfiltration exploit is asserted.

The existing final live `hero-provenance.json` copy can race a publisher and make
a package manifest describe a different generation than copied files. The
`package-live-manifest-race` probe reproduces this too, but that line predates the
diff and it is not counted as a new regression or a whole-set atomicity promise.

No model/geometry review, browser/server/GPU work, dependency install, cloud,
production backend, DNS, credentials, commit, push, merge, or promotion occurred.
No whole-set crash-atomic claim is made: publication is per-file rename followed
by a JSON manifest rename, as explicitly scoped by the parent.
