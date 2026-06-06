# AlgDatViz — Mission 2 (Pedagogy & Coverage): Phase 0 Plan

> Status: **awaiting human sign-off (§2 decisions + sequencing).** No code written yet.
> Builds on the completed design-system redesign (see `REDESIGN_PHASE0.md`). The visual foundation is law; this mission adds pedagogy, interaction, coverage, a11y.

---

## 1. Re-audit — brief claims vs the actual repo

| Brief's diagnosis | Verdict after reading the code | Detail |
|---|---|---|
| Recognition-only MCQ checks | **Confirmed** | `TopicTemplate/LessonCheck.jsx` supports only `kind:'choice'` (button row) + `kind:'pair'` (stage selection). All topics use `choice`. No retrieval/free-input/ordering/numeric. |
| Synced pseudocode "not visible" | **Half true — important nuance** | `PseudocodeRail` IS wired in all **7 playgrounds** (+ `FrameTrace`). But the **teaching scrolly stages have no pseudocode at all** — and the scrolly is what most users read. So: add pseudocode+state to the teaching view; verify the playground sync actually locksteps. |
| Scroll-driven, fights the user | **Confirmed** | `TopicScrolly.jsx` advances scenes purely via `IntersectionObserver`; no prev/next/scrub in the concept section. Reduced-motion only stops fades, doesn't add controls. |
| Dark-only, a11y gaps | **Confirmed** | `theme.css` has no `[data-theme]`/`prefers-color-scheme`. Tokens ARE centralized + semantic (`--surface-*`, `--color-text-*`) so light is a token-layer swap — **but** the leftover theme-agnostic `rgba(255,255,255,…)`/`rgba(0,0,0,…)` glass+shadow literals will break in light mode and must be tokenized. Dimmed upcoming-scene text needs a contrast audit. |
| `0/7` with 8 topics | **Confirmed + root cause** | `useProgress.overall.total = PROGRESS_TOPICS.length = 7` (foundations is a `preview` alias excluded on purpose, locked last session), while `HomePage` says "Eight topics." Visible mismatch. Tied to the scope decision below. |
| Half a course; hashing over-built | **Confirmed** | 8 curriculum entries; covers up to graphs/strategies. Hashing (a prerequisite) has a full lesson; the examinable back half (heaps, linear-time sort, MST, SSSP, APSP, max-flow, NP-C) is absent. Hero claims "the TDT4120 curriculum." |
| "stray artifact under hero CTA" | **Identified** | `HomePage` `heroDivider` (a vertical-line+dot SVG after the actions). |

### Reuse inventory (lowers Phase 4–5 cost a lot)
- **Already real step-generators** (pure, reusable, mostly UI-independent): graph `bfs/dfs/dijkstra/kruskal/prim/topo/maxflow` (`utils/graphAlgorithms.js`); sorting `merge/quick/heap/counting/radix/bucket/insertion/selection/bubble` (`utils/sorting/*`, with views); `masterMath.analyseRecurrence/buildLevels`; `coinChangeFrames`, climbing-stairs, interval-scheduling.
- **Genuinely missing implementations:** Bellman-Ford, DAG-SP, Floyd-Warshall, transitive closure, SCC, edge-classification, union-find (as a viz), decision-tree lower bound, randomized-select, LCS, 0/1 knapsack, rod-cutting, Huffman, NP-C/reduction demos.
- **Testability:** only `utils/sorting/*.test.js` exist. `graphAlgorithms.js` is already pure/testable; tree/hashmap/strategies trace logic is partly inside components → extract to pure generators so they can be unit-tested (brief §2).

---

## 2. Decisions — **LOCKED (human-confirmed 2026-06-06)**

1. **Theme default — LOCKED:** follow system (`prefers-color-scheme`) on first load + a manual toggle that persists to localStorage.
2. **Curriculum scope & `0/7` — LOCKED:** show the **full** TDT4120 curriculum on the home map with unbuilt topics as clearly-labelled **"coming soon" locked nodes**; rewrite the hero to be honest ("building toward the full curriculum"); **overall progress counts only built (`ready`) topics**, so the number is always true and grows as Phase 5 ships. (Resolves the count mismatch by construction.)
3. **Teaching interaction model — LOCKED:** keep the narrative but make **explicit playback primary** in the teaching stage (prev/next/play/scrub + keyboard); scroll stays as an optional convenience, never the only path.
4. **Sequencing — LOCKED:** follow brief order — Phases 1–4 (revision layer, interaction, a11y, depth) on existing topics first, then Phase 5 expansion on the finalized template.

---

## 3. Issue → phase map (with repo-specific notes)

- **Phase 1 — Revision layer.** Pseudocode+live-state panel into the teaching stage (driven by `FrameTrace` `{line,state,highlight}`); new `Check` taxonomy in `LessonCheck` (predict-next, numeric/free input with tolerant match, ordering/trace, classify, spot-the-bug, cumulative mixed review); progress tracks correct retrieval; per-topic cheat-sheet + scene-navigator/minimap in `TopicTemplate`; fix the count. *Extend `LessonCheck` + `TopicTemplate`, don't fork.*
- **Phase 2 — Interaction model.** Generalize the playground's `StepControlBar`/`PlaybackEngine` into the teaching stage; delta-highlighting; reduced-motion snaps; scroll demoted. Keyboard + 380px verified.
- **Phase 3 — Light theme + a11y + mobile.** `[data-theme="light"]` token block in `theme.css`; tokenize the residual `rgba(255/0…)` literals; AA audit (start with dimmed scene text); mobile pass; remove `heroDivider`.
- **Phase 4 — Depth on thin sections.** Master theorem → real 3-case `n^log_b a` vs `f(n)` comparison (reuse `masterMath`). Strategies → split greedy vs DP; build overlapping-subproblems + greedy-choice-vs-optimal-substructure.
- **Phase 5 — Back half ⛔ (re-scope with you).** New topics on `TopicTemplate`+`PlaybackEngine`. Proposed sub-sequence (course order, reuse-weighted): **(5a)** Complexity + D&C deepen (mostly exist) → **(5b)** Linear-time sorting + lower bound (sorts exist; build decision-tree + stability) → **(5c)** Heaps/priority queues (heapsort exists; build heap-as-array) → **(5d)** DP + Greedy depth (overlaps Phase 4) → **(5e)** Graph traversal expansion + edge classification/topo/SCC (generators exist) → **(5f)** MST (Kruskal/Prim exist; add union-find + cut) → **(5g)** SSSP: Relax/Bellman-Ford/DAG-SP/Dijkstra (Dijkstra exists; Relax primitive new) → **(5h)** APSP Floyd-Warshall (new) → **(5i)** Max flow (generator exists; add residual/min-cut teaching) → **(5j)** NP-completeness + reductions (all new). Likely 6–10 PRs.
- **Phase 6 — Signature interactives.** One-frontier traversal (FIFO/LIFO/min-dist/min-edge → BFS/DFS/Dijkstra/Prim from one loop); `Relax` shared primitive; master-theorem explorer; notation×case matrix; reduction-direction demo.
- **Phase 7 — Polish & QA.** Consistency, regenerate QA screenshots (top/scroll × light/dark × mobile), update `/styleguide` + the log.

## 4. Guardrails I'm holding to (from §2/§9)
0 hardcoded hex stays 0; lint/build/tests green every phase; new pure trace generators get unit tests; no viz regressions; honest copy; everything on `TopicTemplate`+`PlaybackEngine`+tokens; no bespoke pages; surface big decisions at gates.

## 5. Risks / watch-items
- Light theme's real cost is the glass/shadow `rgba` literals, not the named tokens.
- Bringing playback into the scrolly without losing the narrative feel needs care (Phase 2 is the riskiest interaction change).
- Phase 5 is large; gate each sub-phase. NP-completeness/reductions is the least reuse and the most conceptual.

## 6. Progress log
- **2026-06-06 — Phase 0:** audit + plan; §2 decisions LOCKED by human. Branch `mission2-pedagogy` cut; redesign baseline committed.
- **2026-06-06 — Phase 1a (shared infra): DONE, committed `d33a42b`.** Retrieval check taxonomy (numeric/text/order/classify/predict/spotbug) with pure `checkAnswer.js`; `PseudoState` synced-pseudocode+live-state panel with documented frame contract; cheat-sheet + scene-navigator slots in `TopicTemplate`; `useProgress.recordCheck` (completion now derives from correct retrieval); honest curriculum (7 locked "coming soon" nodes, honest hero, count fixed to /7); `heroDivider` removed. Tests 25→40.
- **2026-06-06 — Phase 1b (7 topics in parallel): DONE, gate passed.** Every topic now has ≥1 non-MCQ retrieval check (graded from real algorithm output, never fabricated), a cheat-sheet, and synced pseudocode + live variable state in its playground driven by a **pure, unit-tested `{line,state}` generator**. Verified on combined tree: lint exit 0, build green, **tests 40→94**, 0 hex. Bugs fixed in passing: tree traversal highlighted the wrong pseudocode line; master-theorem accent token fallback. **Phase 1 DoD met.**
- **Deferred from Phase 1:** cross-topic *cumulative mixed-review* (needs a shared question bank) — schedule before/within Phase 7.
- **2026-06-06 — Phase 2a (teaching-stage playback): DONE by orchestrator** (after the first 2a agent hit a session limit mid-run, having written only `SceneControlBar.jsx`; orchestrator finished the CSS module + wired it into `TopicScrolly`). Explicit scene playback now primary in the concept section: first/prev/play/next/last + scene scrubber, full keyboard (←/→ step, Space auto-advance, Home/End), scoped so it never hijacks the wheel or typing; scroll stays optional & cooperative (IntersectionObserver still syncs); `prefers-reduced-motion` snaps instantly; auto-advance is **gated on answering the active scene's check** (retrieval before progress); per-topic hue tint; usable at 380px. All topics inherit it free. Verified: lint 0, build green, 94/94 tests, 0 hex; visual QA confirms (violet Trees, gold Master, "answer the check to continue"). **Phase 2 DoD (keyboard-operable + reduced-motion + no scroll-jack) met** for teaching stage; playgrounds already keyboard/reduced-motion via PlaybackEngine.
- **Deferred to a decision:** per-topic *delta-highlighting* ("animate what changed each step") from brief §4 — overlaps Phase 7 motion refinement; surfaced to human rather than auto-running a 7-agent fan-out. Full mobile overhaul is Phase 3.
