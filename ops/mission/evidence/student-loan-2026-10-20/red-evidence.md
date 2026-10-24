# Student Loan contract RED evidence

Scope: only apps/media/scripts/student-loan-refinement.test.mjs and this ignored scratch directory. No builder, material config, manifest, public asset, helper, dependency, server or commit changes authored here.

Baseline: branch codex/restoration/asset-heroes, HEAD 2fe733c. Initial worktree clean. The parent subsequently added cloth.png/leather.png under apps/media/sources/student-loan; those files were only listed/read, never modified by this task.

Observed old studentLoan.glb:
- 897548 bytes, 27636 decoded triangles, 0 textures.
- SHA-256 30fed0d378a0d3214f6ef81a12a5887795bb2e8613ce93908e1ed2585f1d6d63.
- No protected studentLoan record in hero-imported.json.
- Actual public collection 10415192 bytes, unchanged cap 10485760 bytes, measured 2026-10-21T04:39:55.553Z.

Command (cwd apps/media): node --test scripts/student-loan-refinement.test.mjs

First run, before builder existed: 2 tests, 0 pass, 2 expected assertion failures, exit 1. Provenance failed with undefined quality versus refined-textured. PBR failed with texture count 0 versus 9. Reported to parent immediately before continuing geometry tests.

Expanded RED: 9 tests, 0 pass, 9 expected assertion failures, exit 1. Failures: missing refined-textured record; 0 versus 9 textures; missing SL-Book-Lower; missing SL-Cap (support and tassel cases); missing SL-Diploma (scroll and bow cases); old GLB exceeds 0.75MiB; missing locked saveRefinedHero publication callback. The absent builder is converted into the explicit publication assertion, not an ENOENT failure.

After the parent created the builder, two reruns against the unchanged old study produced 8 expected failures and 1 pass: the locked-publication budget contract and its removed-guard/stale-total static mutations now pass. Read-only inspection of the parent's builder confirmed matching material names, child hierarchy, X-axis diploma, 22-turn helical cord and bow projection. No parent builder was executed by this task. Parent separately reported the first build was rejected before publication at 1.435MB, then started a smaller build; those are parent reports, not independently rerun here.

Regression command: node --test scripts/credit-card-refinement.test.mjs scripts/land-refinement.test.mjs

Result: 18 tests passed, 0 failed, exit 0. No browser, server, dependency installation or full media pipeline invoked.

Geometry contracts derive bounds in decoded local frames. Assumptions to coordinate with the parent artifact when available:
- Books have Y thickness and closed oriented positional edges (1e-5 positional weld), including all merged individual leaves. Covers/pages have Y thickness less than 30 percent of their shorter horizontal span.
- Contact checks inspect actual triangle surfaces and point containment in XYZ with tolerance 0.006 times target bounding-box diagonal. They are not merely AABB overlap tests.
- Cord sections are sampled perpendicular to the measured button-to-head chord; each strand must wind more than one full turn across the middle 80 percent. This assumes a monotonic suspended cord path in that projection; inspect/adapt if the authored path doubles back.
- Diploma shell and spiral are along X in SL-Diploma local coordinates. The centreline must remain open through the whole group; radial shell rays require inner and outer walls. The actual spiral must span at least half the tube length and exhibit several crossings and substantial radial travel.
- Bow loop holes are enclosed empty cells in the silhouette along each loop's shortest local bounding-box axis, with nonzero volume and actual thickness. Revisit projection if the parent authors highly twisted loops.

Two in-memory artifact mutations are included: lateral displacement of SL-Cord-Strand-0 and addition of a closed solid box inside the scroll lumen. Both first require the unmodified verifier to pass. They cannot execute past missing-node assertions on the old study, so mutation sensitivity on the refined artifact is pending parent publication, not claimed as already demonstrated.
