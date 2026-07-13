# Money Loop 3D Stage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver one accessible, performant, model-driven Three.js selection stage for Income, LOC, Expenses, Cash Flow, and Principal.

**Architecture:** The existing dashboard model stays authoritative. A versioned pure contract maps its five artifacts to normalized visual descriptors; the DOM rail owns selection and semantics; a client-only React Three Fiber renderer consumes that contract only when capability policy allows it.

**Tech Stack:** Next.js 16.2.10, React 19.2.3, TypeScript 5, Three.js, React Three Fiber, Playwright Core, existing Node contract tests.

## Global Constraints

- Keep exactly four dashboard vitals before the Money Loop stage.
- Do not add financial formulas or outcome claims in the visual layer.
- Keep DOM tabs and previous/next buttons authoritative and keyboard accessible.
- Reduced motion, data saving, unavailable WebGL, or incomplete artifacts must use the static fallback.
- Cap full-mode device pixel ratio at 1.5 and efficient mode at 1.
- A stable selection rotates once and settles within 700 ms; caution uses at most a half turn; blocked state does not spin.
- Keep public assets at or below 2 MiB total and 1.25 MiB per file.
- Use test-first red, green, and refactor cycles for every behavior change.

---

### Task 1: Versioned Artifact Visual Contract

**Files:**
- Create: `apps/web/src/app/artifact-visual-contract.ts`
- Modify: `apps/web/src/components/MoneyLoopArtifactRail.tsx`
- Test: `apps/web/scripts/engine-regression-tests.cjs`

**Interfaces:**
- Consumes: `DashboardLoopArtifact[]` from `dashboard-model.ts`.
- Produces: `buildMoneyLoopVisualContract(artifacts): MoneyLoopVisualContract` and `selectMoneyLoopRenderMode(capabilities): 'static' | 'efficient' | 'full'`.

- [x] **Step 1: Write failing tests for canonical geometry, normalized channels, warning motion, capability fallback, and rail reachability.**
- [x] **Step 2: Run `npm --prefix apps/web test` and verify failures report the missing contract and missing rail wiring.**
- [x] **Step 3: Implement contract version 1 and expose its version, completeness, and active geometry from the DOM rail.**
- [x] **Step 4: Run `npm --prefix apps/web test`, `npm --prefix apps/web run lint`, and `npm --prefix apps/web run build`; expect 249 regressions and a 14-page build.**
- [x] **Step 5: Commit the contract, design, plan, red/green evidence, and mission heartbeat as P4-T1.**

### Task 2: Lazy Three.js Selection Stage

**Files:**
- Create: `apps/web/src/components/money-loop-3d/MoneyLoopThreeStage.tsx`
- Create: `apps/web/src/components/money-loop-3d/MoneyLoopThreeScene.tsx`
- Create: `apps/web/src/components/money-loop-3d/artifact-meshes.tsx`
- Modify: `apps/web/src/components/MoneyLoopArtifactRail.tsx`
- Modify: `apps/web/package.json`
- Modify: `apps/web/scripts/engine-regression-tests.cjs`

**Interfaces:**
- Consumes: `MoneyLoopVisualContract`, active artifact id, and `onSelect(id)` from the rail.
- Produces: an `aria-hidden` canvas with `data-testid="money-loop-three-stage"`, `data-render-mode`, and one selectable mesh per canonical artifact.

- [x] **Step 1: Add a failing source contract requiring a Next dynamic import with `ssr: false`, an `aria-hidden` canvas boundary, stable canvas dimensions, and the unchanged DOM tablist.**
- [x] **Step 2: Run `npm --prefix apps/web test`; expect the lazy-stage contract to fail because the stage files and dependencies do not exist.**
- [x] **Step 3: Add pinned `three`, `@types/three`, and `@react-three/fiber` versions, then implement the client stage and five procedural mesh factories named by the visual contract.**
- [x] **Step 4: Bind active selection to one camera framing transition and one bounded rotation; route mesh pointer selection through `onSelect` without moving keyboard focus from the DOM controls.**
- [x] **Step 5: Run `npm --prefix apps/web test`, `npm --prefix apps/web run lint`, `npm --prefix apps/web run build`, and `npm --prefix apps/web audit --omit=dev`; expect all gates and zero production vulnerabilities.**
- [x] **Step 6: Commit the lazy stage as P4-T2 after independent code review.**

### Task 3: Capability, Motion, And Lifecycle Controls

**Files:**
- Create: `apps/web/src/components/money-loop-3d/useMoneyLoopRenderMode.ts`
- Modify: `apps/web/src/components/money-loop-3d/MoneyLoopThreeStage.tsx`
- Modify: `apps/web/src/components/money-loop-3d/MoneyLoopThreeScene.tsx`
- Modify: `apps/web/scripts/engine-regression-tests.cjs`

**Interfaces:**
- Consumes: `selectMoneyLoopRenderMode`, media-query state, network data-saving state, navigator capacity hints, viewport width, intersection state, and document visibility.
- Produces: stable `static`, `efficient`, or `full` mode plus a `shouldRender` flag that pauses offscreen and hidden-document work.

- [x] **Step 1: Add failing tests for reduced motion, save-data, missing WebGL, unknown hardware, narrow viewports, offscreen pause, and hidden-document pause.**
- [x] **Step 2: Run `npm --prefix apps/web test`; expect capability-hook source and behavior contracts to fail.**
- [x] **Step 3: Implement the hook with `matchMedia`, guarded navigator hints, `IntersectionObserver`, `visibilitychange`, and cleanup for every listener.**
- [x] **Step 4: Cap DPR and geometry segments by mode, disable shadows in efficient mode, invalidate rendering only on selection/visibility changes, and keep static fallback mounted until the first nonblank frame.**
- [x] **Step 5: Run tests, lint, production build, and rendered smoke; expect no route overflow or browser errors at 1440x900 and 390x844.**
- [x] **Step 6: Commit capability and lifecycle controls as P4-T3 after independent code review.**

### Task 4: Nonblank Canvas And Responsive Interaction Gate

**Files:**
- Create: `apps/web/scripts/test-three-stage.cjs`
- Modify: `apps/web/scripts/smoke-rendered.cjs`
- Modify: `apps/web/package.json`
- Modify: `.github/workflows/ci.yml`
- Test: `apps/web/scripts/engine-regression-tests.cjs`

**Interfaces:**
- Consumes: the built dashboard, system Chrome discovery, DOM artifact controls, canvas pixels, and render-mode attributes.
- Produces: repeatable `npm --prefix apps/web run test:3d` evidence for desktop, mobile, full-capability, and static fallback states.

- [ ] **Step 1: Add failing package and CI contracts requiring `test:3d`, all five artifact selections, reduced-motion fallback, screenshots, and canvas pixel sampling.**
- [ ] **Step 2: Run `npm --prefix apps/web test`; expect missing script and CI wiring failures.**
- [ ] **Step 3: Implement a fresh-build Playwright gate that selects each DOM tab, waits for the matching active geometry, samples a central canvas grid, and rejects transparent or single-color output.**
- [ ] **Step 4: Capture 1440x900 and 390x844 screenshots, assert canvas containment and no document overflow, and verify reduced motion exposes the static fallback without a WebGL canvas.**
- [ ] **Step 5: Add `test:3d:built` after build in CI, run `npm --prefix apps/web run test:3d`, the standing rendered smoke, tests, lint, build, asset budget, and production audit.**
- [ ] **Step 6: Record P4 gate evidence, merge P4-T4, rerun all P4 gates on current main, and close P4.**
