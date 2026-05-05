# Product

## Register

product

## Users

CS students preparing for exams in algorithms and data structures — often working alone on a laptop, late, with a textbook open and a deadline pressing. They are not browsing for entertainment. They came here because something hasn't clicked: a recurrence relation, a recursive descent, a hash collision, the difference between greedy and DP. They will close the tab the moment the page feels like another textbook.

A meaningful secondary user is an instructor pulling the app onto a projector mid-lecture to demonstrate a single concept. The visualization must read at 10 feet without commentary.

## Product Purpose

A visual instrument for building intuition about how algorithms and data structures actually behave — not just what answer they produce.

The product succeeds when a confused student watches a recursive algorithm split a problem all the way down to its base case, then re-combine on the way back up, and feels the structure click. The product fails when the user can describe what happened on screen but cannot explain *why* the algorithm made the choice it did at each step.

This is not a reference tool, a benchmarking tool, or a coding playground. It is a single-purpose teaching instrument.

## Brand Personality

**Precise, expressive, unhurried.** Lab × cinematic.

Lab: every visible element is measured, labeled honestly, and earns its place. No theatrics for theatrics' sake. The product respects the subject matter and the viewer.

Cinematic: when something *does* move, it moves with intent and timing. State transitions are choreographed, not interpolated. The central canvas is a performance piece, not a chart.

Voice: the considered tone of a strong lecturer who knows the material cold and refuses to talk down. Short sentences. No exclamation marks. No "Let's dive in!" No emoji.

## Anti-references

Things this should never look or feel like:

- **VisuAlgo and classic university visualizers** — cluttered panel grids, beige backgrounds, every metric on screen at once, no hierarchy.
- **LeetCode-style cramped productivity UI** — twelve panels competing for the same pixels, optimized for speed-running interview prep, not for understanding.
- **Default shadcn / SaaS dashboard look** — Stripe admin cosplay. Card-grid-with-stat-numbers reflex. Sidebar + breadcrumbs + tabs + filter chips for a tool that is fundamentally about a single big visualization.
- **Kid-coding aesthetics** — Scratch / Code.org bright primaries, cartoon mascots, rocket emoji, "Awesome job!" toast notifications.
- **LLM-default dark-mode-with-purple-gradient slop** — generic glassmorphism, hero metric template, gradient text, indistinguishable from any other AI-generated SaaS landing.

Things this should feel like, in spirit:

- **Observable notebooks** — notebook rhythm of prose + figure + prose, considered data visualization, restraint, computer-science register without being austere.
- **Advent of Code** — quiet, terminal-tinged, warm, unmistakably for people who like the *craft* of computer science.

## Design Principles

1. **Recursion is the hero.** The hardest concepts in this curriculum are recursive: merge sort, tree traversal, divide-and-conquer, DP recurrences. These get first-class visual choreography, not side-panel summaries. The viewer must be able to follow one piece all the way down to the base case and watch it merge back up. If a screen makes recursion feel flat, the screen has failed.

2. **The canvas is a stage, not a panel.** The central visualization gets hero proportion and generous breathing room. Controls, metrics, and metadata recede — into a unified bottom bar, contextual overlays, or progressive disclosure — until the user reaches for them. Never compete with the thing the user came to see.

3. **Show the why, not just the what.** A static end-state is not a teaching tool. Every state transition should make the *cause* visible: which two values are being compared, which previous DP cells combine to derive the current one, which recursive call is currently active. The recurrence itself is the lesson.

4. **Considered, not crowded.** Resist the dashboard reflex. Borders, dividers, and labels exist only when their absence would actually confuse the reader. Three short sentences beat one paragraph. One key complexity notation (`O(n log n)`) beats a table of six.

5. **Motion is content.** Animations encode meaning — the swap, the descent, the merge, the rehash. They are not decorative easing. Reduced-motion users get softened timing and shorter distances, never a stripped lesson.

## Accessibility & Inclusion

- **Contrast**: text and interactive elements meet WCAG AA against the dark background; primary text targets AAA where reasonable.
- **Reduced motion**: honor `prefers-reduced-motion` by softening timing and reducing travel distance, but never remove lesson-bearing motion entirely. The recursion descent in merge sort is the lesson; we slow it, we do not skip it.
- **Color-blind safety**: state encoding never relies on a red/green pair. The accent system commits to blue / green / orange / purple as four mutually distinguishable hues across deuteranopia and protanopia. State is also redundantly encoded via position, motion, or shape so color is never the sole signal.
- **Keyboard**: every step control (play, pause, step forward, step back, scrub) is reachable and operable from the keyboard with visible focus.
- **Language**: the app is written in English. Code identifiers and the project name are bilingual-friendly (Norwegian roots), which is fine — the UI copy itself stays in plain English.
