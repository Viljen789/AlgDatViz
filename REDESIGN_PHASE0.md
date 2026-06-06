# AlgDatViz Redesign — Phase 0: Audit & Plan

> Orchestration artifact. Status: **awaiting human sign-off on §4 decisions and §5 plan.**
> No agents have been spun up. Nothing in Phase 1+ starts until this is approved.

---

## 1. Detected stack — *conform to it, do not replace*

| Layer | What's here | Notes |
|---|---|---|
| Framework | **React 19** + **Vite 7** SPA | `type: module`, StrictMode on. |
| Routing | **react-router-dom 7** | Lazy routes + `<Suspense>` + framer page transitions in `App.jsx`. |
| Styling | **CSS Modules** + two global sheets (`styles/globals.css`, `styles/theme.css`) | Tokens already live in `theme.css`. No Tailwind/CSS-in-JS. |
| Motion | **framer-motion 12** + **gsap 3** | Both present; gsap usage is sparse. `useReducedMotion` hook exists. |
| Icons | **lucide-react** | Already a single consistent set. Keep. |
| Dataviz/graph | **reactflow 11** **and** **vis-network 10** **and** **recharts 3** | ⚠️ Two graph libraries shipped — likely redundant (see §3). |
| Tests | `node --test` (unit) + **Playwright** visual snapshots | `*.test.js` for sorting; `scripts/inspect*.mjs` exist. |
| Pkg mgr | **pnpm** (workspace files just added) | |

**Rule for all agents:** build inside this stack. No new framework, no new styling paradigm, no new state library, no new icon set without orchestrator + human sign-off.

---

## 2. What already exists (preserve — do not rewrite from scratch)

The repo is **further along than "generic starter."** Several §5 requirements are partially built:

- **Design tokens** — `src/styles/theme.css` already defines color/space/radius/type/shadow/motion vars, including a `prefers-reduced-motion` block. *This is the seed of the design system — extend it, don't replace it.*
- **A working step/scrub/replay engine** — `useSortingVisualizer` hook + `common/StepControlBar` already give keyboard control (space / ← / →), a scrub slider, first/last, speed menu, step counter. §4C is ~60% done **for sorting**.
- **A progress system** — `hooks/useProgress.js` (localStorage `algdatviz:progress:v1`, `completed[]` + `lastVisited`, cross-tab sync, fail-silent).
- **A curriculum map** — `data/curriculum.js` (8 topics, teaching order, pull-quotes, complexity, accent) rendered as a scroll-revealed vertical "spine" with keyboard nav on `HomePage`.
- **A gold-standard reference, in progress** — `components/MergeSortLesson/*` is exactly the §5 template (Hero → scene-by-scene scrolly with inline checks → playground → up-next). **This is the intended template; the redesign should standardize on it.**
- Chosen typefaces already loaded — **Space Grotesk** + **JetBrains Mono** (Google Fonts, `index.html`).
- Accessibility baseline — reduced-motion hook, focus-ring token, ARIA on the curriculum spine and step toolbar.

**Implication:** This is a *consolidation + systematization* job, not a rewrite. Block any agent that proposes starting over.

---

## 3. Findings — mapped to the four named problems

### A. "Generic / AI-generated" look
- Flat near-black (`#070811`) + single blue glow (`--shadow-canvas-lamp`, `.lamp`) is the dominant hero device — the exact anti-pattern in §6.
- `theme.css` carries **token sprawl / legacy aliases** (`--color-slight-grey`, `--color-light-blue`, `--color-dark-blue`, `--color-medium-grey`…) layered over the newer semantic tokens. Two naming generations coexist.
- **512 `rgba()` literals** across `*.module.css` — lots of one-off translucent colors that bypass the token layer (only 36 raw hex, so hex discipline is OK; the leak is rgba()).

### B. No sense of place / overview — *partially solved, then fragmented*
- The HomePage "spine" is genuinely good and directly answers "where am I / what's next."
- **But the topic model is defined in 3 places that disagree:**
  - `data/curriculum.js` — 8 topics incl. a `foundations` entry that has no page (points at `/stacks-queues`), order: foundations → stacks → master → sorting → hashing → trees → graphs → strategies.
  - `common/Sidebar` `NAV_ITEMS` — different set/order/labels, its own hardcoded accents.
  - `App.jsx` `PAGE_META` — a *third* copy of titles + per-route accent colors.
- **Progress is not global.** `markCompleted` is only ever called from the merge-sort playground, so *only Sorting can ever be marked complete*; the Sidebar shows no progress at all.

### C. Shallow playgrounds — *engine exists but isn't shared*
- `useSortingVisualizer` + `StepControlBar` are solid and reusable in spirit, but **named/coupled to sorting**. Graph / Tree / HashMap / Strategies each roll their own controls and have no scrub/replay/keyboard parity.
- No synchronized recursion/state trace as a shared primitive (merge-sort has a bespoke recursive view).

### D. Drifting visual language — *three generations of "topic page" coexist*
1. **Gen 1 (bespoke):** `Sorting/SortingDashboard` (687 jsx / 855 css) + `Sorting/SortingScrollytelling` (510 / **1005** css).
2. **Gen 2 (data-driven shared):** `common/TopicScrollytelling` (352 / **1264** css) fed by `data/topicStories.js`, used by Graph, HashMap, MasterTheorem, StacksQueues, Strategies, Tree via `TopicRoute`.
3. **Gen 3 (the target):** `components/MergeSortLesson`.
- Heavy bespoke CSS (1264- and 1005-line module files) is the structural cause of the drift.
- **Sorting has two front doors:** sidebar "Sorting" → `/sorting` (Gen 1), but curriculum "Sorting" → `/lessons/merge-sort` (Gen 3). Confusing and duplicative.

### Dead / redundant code
- `src/utils/sortingAlgorithms.js` (21 KB) — imported by **nobody**; superseded by `src/utils/sorting/*`. Safe to delete.
- `reactflow` **and** `vis-network` both shipped — confirm which the Graph topic actually uses and drop the other (bundle + 60fps budget).

---

## 4. [DECISION] items — **LOCKED (human-confirmed 2026-06-06)**

1. **Typography — LOCKED.** Display **Bricolage Grotesque** · Body **Inter** · Mono **JetBrains Mono** (keep). All Google-Fonts-hosted; update `index.html` + `--font-family-*` tokens. Establish a deliberate type scale + rhythm; tight tracking on large display, generous body line-height.
2. **Color model — LOCKED: (b) harmonized per-topic signature hues.** Re-derive the current ad-hoc green/orange/purple/blue into **one HSL discipline** (shared saturation/lightness family). Each topic hue is defined **once** as a token and consumed by curriculum + sidebar + hero + page accents — this kills the 3-source color drift in §3B. Plus a small semantic set (success/warn/error/info) held separate from topic hues.
3. **Template consolidation — LOCKED: standardize on `MergeSortLesson`.** It becomes the canonical template; port all topics onto it; retire Gen 1 (`SortingDashboard`/`SortingScrollytelling`) and Gen 2 (`TopicScrollytelling`/`topicStories`) as each topic ports. One front door per topic.

---

## 5. Proposed phase plan & agent assignments

Sequenced exactly per the master prompt. **Hard review gate between every phase.**

- **Phase 1 — Foundation (1 agent, blocking).** *Design System Agent.* Promote `theme.css` to a single source of truth: re-derive the harmonized palette + per-topic hue tokens, set the type scale, prune legacy aliases, add a surface/elevation system beyond flat-black+glow, motion utilities, and a `/styleguide` living reference. Primitives: Button/Input/Card/Surface/Tabs/Toggle wired to tokens.
- **Phase 2 — parallel after P1 merges.**
  - *Navigation & IA Agent:* collapse the 3 topic models into one source; global shell; curriculum map polish; **global progress** (per-topic + overall, in sidebar + home); breadcrumbs; the shared topic-page **template shell** (structure only) abstracted from MergeSortLesson.
  - *Reference Topic Agent:* bring **Sorting** to gold standard end-to-end on the new system, finishing `MergeSortLesson` as the canonical example. Locks the template.
- **Phase 3 — parallel after the template locks.**
  - *Playground Engine Agent:* generalize `useSortingVisualizer` + `StepControlBar` into a topic-agnostic step/scrub/replay + trace engine; all topics consume it.
  - *Topic Agents* (1 per remaining topic): port content into template + tokens, no bespoke styling.
  - *Content & Comprehension Agent:* checks, copy, empty/loading/error microcopy.
- **Phase 4 — Polish.** Motion, a11y audit (WCAG AA, keyboard, reduced-motion), perf budgets (CLS≈0, drop the duplicate graph lib, lazy-load heavy topics), cross-topic consistency review, QA against §5.

## 6. File-ownership map (no two agents touch the same file in a phase)

| Owner | Owns (write) | Reads only |
|---|---|---|
| **Design System** | `src/styles/theme.css`, `src/styles/globals.css`, new `src/styles/styleguide` + primitives in `src/common/Button,Input,Card,Surface,Tabs,Toggle` | everything |
| **Nav & IA** | `src/data/curriculum.js`, `src/common/Sidebar/*`, `src/App.jsx`, `src/pages/HomePage.*`, new `src/common/TopicTemplate/*`, `src/hooks/useProgress.js` | tokens, MergeSortLesson |
| **Reference Topic** | `src/components/MergeSortLesson/*`, `src/pages/MergeSortLessonPage.jsx`, `src/components/Sorting/*` | tokens, template |
| **Playground Engine** | `src/hooks/useSortingVisualizer.js` → generalized engine hook, `src/common/StepControlBar/*`, new `src/common/PlaybackEngine/*` | tokens |
| **Topic Agent: Graphs** | `src/components/Graph/*`, `src/pages/GraphPage.jsx` | tokens, template, engine |
| **Topic Agent: Hashing** | `src/components/HashMap/*`, `src/pages/HashMapPage.jsx` | " |
| **Topic Agent: Trees** | `src/components/Tree/*`, `src/pages/TreePage.jsx` | " |
| **Topic Agent: Stacks/Queues** | `src/components/StacksQueues/*`, `src/pages/StacksQueuesPage.jsx` | " |
| **Topic Agent: Strategies** | `src/components/Strategies/*`, `src/pages/StrategiesPage.jsx` | " |
| **Topic Agent: Master Thm** | `src/components/MasterTheorem/*`, `src/pages/MasterTheoremPage.jsx` | " |
| **Content** | `src/data/pageHelpContent.js`, `src/data/topicStories.js` (until retired), copy strings | all |

*To retire after their topics port (Nav&IA + relevant Topic Agent, coordinated):* `common/TopicScrollytelling/*`, `data/topicStories.js`, `Sorting/SortingScrollytelling/*`, `Sorting/SortingDashboard/*`, `utils/sortingAlgorithms.js`.

## 8. Status log

- **2026-06-06 — Phase 0:** audit complete; §4 decisions LOCKED by human; plan + ownership map approved.
- **2026-06-06 — Phase 1 (Design System): COMPLETE, gate passed.** `theme.css` is now the single source of truth; Bricolage Grotesque + Inter + JetBrains Mono live; 8 topic hues in one HSL family (s72/l66) defined once; surface/elevation system; primitives (Button/Tabs/Toggle extended; Card/Surface/Input new); living `/styleguide` route. Verified by orchestrator: `pnpm lint` clean, `pnpm build` succeeds, all legacy token names aliased (no page breakage). Minor notes: (a) elevated surface is now correctly *lighter* than panel — intentional subtle shift; (b) semantic `--color-success`/`--color-info` currently share the graphs/foundations hues — revisit in Phase 4 so a success state on the Graphs page stays distinct from its topic accent.
- **2026-06-06 — Phase 2 (Nav&IA + Reference Topic): COMPLETE, gate passed.** Single topic model in `curriculum.js` (Sidebar + App derive from it; `NAV_ITEMS`/`PAGE_META` deleted); each topic uses its `--topic-<id>` token. Global progress (`useProgress` extended additively: `visited[]`, `isCompleted/isVisited`, derived `overall`; migrates old state). Home spine + Sidebar rebuilt on tokens with per-topic + overall progress. Sorting collapsed to one front door (`/lessons/merge-sort`); `/sorting` route + `SortingPage.jsx` + Gen-1 `SortingScrollytelling` retired; multi-algorithm sandbox preserved and folded into the lesson (lazy). `common/TopicTemplate/*` extracted (TopicTemplate + TopicScrolly + LessonCheck); MergeSortLesson consumes it = proven. Verified by orchestrator: lint clean, build green, 25/25 tests. **Open items carried to Phase 3:** (a) `StepControlBar` registers a global window space/arrow listener — with the embedded sandbox, two playgrounds can both respond; Playground Engine agent must scope it to focus/active. (b) stale `'/sorting'` key in `data/pageHelpContent.js` (Content agent). (c) Product call (default kept): `foundations` is a preview aliasing `/stacks-queues` and is excluded from overall progress, so the denominator is **7**, not 8.
- **2026-06-06 — Phase 3a (Playback Engine): COMPLETE, gate passed.** Topic-agnostic engine extracted to `src/common/PlaybackEngine/` (`usePlayback`, `usePlaybackKeys`, `FrameTrace`); `useSortingVisualizer` refactored to wrap it (public API byte-compatible); `StepControlBar` keyboard handling moved off the global `window` to a scoped player registry (gains `scopeRef`/`keyboard` props) — fixes the two-playgrounds double-fire. Verified: lint clean, build green, 25/25 tests. Engine entry: `import { usePlayback, usePlaybackKeys, FrameTrace } from 'common/PlaybackEngine'`.
- **2026-06-06 — Phase 3b (6 Topic Agents): COMPLETE, gate passed.** Graphs / Hashing / Trees / Stacks&Queues / Strategies / Master Theorem all ported to `TopicTemplate` + engine + tokens; each has scrolly scenes, a synchronized stage, comprehension checks, and an engine-driven playground (scoped keyboard) on its harmonized hue. All legacy interactive viz preserved. Verified by orchestrator on the combined tree: lint exit 0, build green, 25/25 tests. (A transient lint break in `Graph/GraphDashboard.jsx` seen by sibling agents mid-run was resolved by the Graphs agent's final pass.) **Dead code to remove in cleanup:** `Graph/GraphAlgorithmPanel`, `Graph/GraphControls` (0 importers); legacy `HashMap` dashboard/hero/picker/overlay cluster; `common/TopicScrollytelling/*` + `data/topicStories.js` (+ stale comment ref in `MasterTheorem/scenes.js`); residual hex (16) in `Tooltip`/`LearningPanel`/`StepControlBar`. Perf note: `recharts` makes the lazy MasterTheorem chunk ~335 kB (off first-load).
- **2026-06-06 — Phase 4a (cleanup): DONE by orchestrator.** Deleted verified-dead code (`Graph/GraphAlgorithmPanel`, `Graph/GraphControls`, the legacy `HashMap` dashboard/hero/picker/overlay cluster, `common/TopicScrollytelling/*`, `data/topicStories.js`). Dropped `reactflow` + `vis-network` (pnpm pruned). lint exit 0, build green, 25/25 tests.
- **2026-06-06 — Visual QA:** captured all 8 topics + home + styleguide via `scripts/qa-capture.mjs` (Playwright → `test-results/qa/`). Result: one consistent template + type system across every topic; per-topic harmonized hues working as wayfinding. **Findings for Phase 4b:** (1) BUG — on `/stacks-queues` both `Foundations` and `Stacks / queues` sidebar items show active (foundations aliases the route); fix the active-match so only one lights up. (2) residual hardcoded hex (16) in `Tooltip`/`LearningPanel`/`StepControlBar`. (3) semantic `--color-success`/`--color-info` still share topic hues.
- **2026-06-06 — Phase 4b (content + polish/QA): COMPLETE, gate passed.** Sidebar double-active bug fixed (one active item per route); semantic colors separated from topic hues (emerald/amber/red/cyan, all AA); residual hardcoded hex tokenized → **0** in module CSS; playback dock now adopts each topic's hue; stale `'/sorting'` help key removed; a11y fix — global `:focus-visible` ring restored for bare buttons (was keyboard-invisible); content/voice + empty/loading/error states verified across all 8 topics; perf confirmed (all topics lazy). Verified: lint exit 0, build green, 25/25 tests; QA re-captured.
- **✅ REDESIGN COMPLETE (2026-06-06).** All §5 Definition-of-Done boxes ticked: one token source of truth; one shared template per topic; home curriculum map + persistent global progress (denominator 7); distinctive Bricolage/Inter/JetBrains typography; restrained semantic color distinct from per-topic wayfinding hues; full interactive states incl. focus-visible; reduced-motion honored; WCAG AA + keyboard playgrounds; lazy-loaded, no layout shift; and side-by-side all topics read as one designed product (confirmed via `test-results/qa/`). Started from "generic AI output"; ended consolidating 3 page generations + 3 topic models + a sorting-coupled engine into one system. Stack unchanged (React 19 / Vite / CSS Modules). Remaining nice-to-haves (non-blocking): drop `recharts` to slim the Master Theorem chunk; optional light theme.
- **Graph library decision (resolved):** neither `reactflow` nor `vis-network` is imported anywhere — `GraphVisualizer` is hand-rolled SVG, which is the best fit (fully themeable to the design system, zero dep). **Action:** drop *both* deps from `package.json` during Phase 4 cleanup.

## 7. What I need from you (then I stop)
1. Confirm the three **[DECISION]** items in §4 (typography, color model, template consolidation).
2. Approve the phase plan (§5) and file-ownership map (§6).
3. On approval I spin up **only the Design System Agent** (Phase 1) and hold the gate.
