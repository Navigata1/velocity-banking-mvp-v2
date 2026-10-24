# House Instanced Depth Study

## Intent

Recover visible eave, sill and planting depth without changing the calm House
identity, dashboard layout, camera, lights, exposure, materials or financial
behavior. This is a private rendering study, not final photoreal acceptance.
The autonomous implementation choice is mine, within the user's approved goal.

## Approaches

- Keep the verified instanced House unchanged:211reported draw calls, no new
  depth cost. This remains the shipping fallback.
- Combine the verified instancing with the prior private self-shadow policy.
  Selected for a controlled A/B because it may recover depth without replacing
  the model. The earlier uninstanced890-call shadow study remains held.
- Replace geometry/textures or add broader lighting/post effects:deferred.
  Those would confound this comparison and enlarge the visual change.

## Constraints

- Baseline is verified4896106/receipt6367684288, not an older unpushed candidate.
- All495source inputs,13runtime pins and20public asset files stay unchanged.
- Use the exact emitted shared House instancing module and exact prior private
  1024/2048 shadow module. Their earlier acceptance is not combined-path proof.
- Fresh static House root, one owner, no external shadow/instance setup.
- Compose instances before shadows; release shadows before instances, attempting
  both even when disposal throws. Never dispose borrowed model resources.
- Non-House paths remain no-ops before inspecting any other options.
- Desktop725x420/DPR1 uses2048; phone351x270/DPR1 uses1024. Existing renderer,
  GLB, camera, lights, materials, exposure and finite turn function are fixed.
- No dependency/lockfile/backend/auth/cloud/domain/deployment change or paid GPU.

## Acceptance And Limits

Fresh CPU tests must establish real Three InstancedMesh shadow flags, whole-yaw
bounds, owner/idempotency behavior, transaction rollback, reverse cleanup and
borrowed-resource preservation. Intended removed-code controls and independent
review precede any native/GPU collection.

One predeclared four-fixture A/B compares instanced-only versus instanced-shadow
at each size. Eleven seeks per fixture include repeat/rest checks; seven primary
poses per fixture require28original images to be individually viewed. Record
native context/job closure and exact input pins. Do not suppress raw failures.

The arithmetic211color +167shadow =378draws is a hypothesis, not a measurement.
Candidate reported submissions must not exceed the older467uninstanced baseline;
reported triangles must stay within90960. These are screening budgets, not FPS,
GPU memory, energy or phone-performance approval. Shadow maps add work relative
to the current211-call shipping baseline even if the screen passes.

Accept privately only if paired images show useful depth without clipping,
shadow acne, detached edges or transparent-glass regressions. If the benefit is
weak, retain the current shipping renderer and record rejection. Plain interiors,
angular foliage, all-ten final realism and physical-device gates remain open.

No permanent adoption follows automatically. Any accepted integration needs its
own lifecycle/media tests, source review, fresh local29, canonical export, exact
head CI/READY/hosted/browser proof and a focused verified push. The instrumented
Chrome wall-time/capture observations remain unresolved, not hidden by this art.

Independent CPU review found deferred P3 HDEP-001: falsy non-Error disposal
throws can lose first-failure observability in all three helper aggregators.
Ordinary Error-object precedence passed; arbitrary thrown-value preservation
is not approved. Keep exact helper copies for this private A/B and require an
explicit, tested all-three-aggregator hardening decision before adoption.
