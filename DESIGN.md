---
name: AlgDatViz
description: A visual instrument for building intuition about algorithms and data structures.
colors:
  carbon-indigo: "#070811"
  panel-indigo: "#0b0d1c"
  sidebar-indigo: "#09091a"
  elevated-indigo: "#090b16"
  input-indigo: "#0f1120"
  hover-indigo: "#141828"
  border-soft: "#1a1f38"
  border-strong: "#2a3060"
  lunar-paper: "#d0d5ec"
  dimmed-paper: "#606888"
  muted-paper: "#404870"
  dim-paper: "#303558"
  probe-blue: "#4f7cf8"
  verified-jade: "#38c9a0"
  filament-amber: "#f8a74f"
  tracer-violet: "#c97af8"
  beam-yellow: "#f8c040"
  error-red: "#f86060"
typography:
  display:
    fontFamily: "Space Grotesk, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "clamp(28px, 4vw, 44px)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Space Grotesk, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Space Grotesk, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Space Grotesk, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  body-sm:
    fontFamily: "Space Grotesk, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  label:
    fontFamily: "Space Grotesk, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.14em"
  notation:
    fontFamily: "JetBrains Mono, Roboto Mono, monospace"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "6px"
  lg: "10px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "20px"
  xl: "28px"
  "2xl": "44px"
  "3xl": "72px"
components:
  button-primary:
    backgroundColor: "{colors.probe-blue}"
    textColor: "#ffffff"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.dimmed-paper}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  button-ghost-hover:
    backgroundColor: "{colors.hover-indigo}"
    textColor: "{colors.lunar-paper}"
  card:
    backgroundColor: "{colors.panel-indigo}"
    textColor: "{colors.lunar-paper}"
    rounded: "{rounded.lg}"
    padding: "22px"
  input:
    backgroundColor: "{colors.input-indigo}"
    textColor: "{colors.lunar-paper}"
    typography: "{typography.notation}"
    rounded: "{rounded.md}"
    padding: "7px 10px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.dimmed-paper}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "2px 9px"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.dimmed-paper}"
    typography: "{typography.body-sm}"
    padding: "10px 18px"
  nav-link-active:
    textColor: "{colors.lunar-paper}"
---

# Design System: AlgDatViz

## 1. Overview

**Creative North Star: "The Late Study Desk"**

Imagine a CS student at one in the morning. The room is dark. A single warm desk lamp pools light across an open textbook and a quiet laptop. The work is hard but unhurried. There are no distractions, no notifications, no decorations — only the page, the pen, and the problem. AlgDatViz is the laptop on that desk.

The interface is **mostly dark, mostly still, mostly silent**. When the canvas moves, it moves the way a thought moves: with intent, in sequence, with a beat of pause between steps so the viewer can register what just happened. Color enters sparingly and means something every time it does. Typography is grown-up — Space Grotesk for prose, JetBrains Mono for the things only computers care about. The chrome of the application — sidebar, header, controls — recedes into the desk so that the visualization itself can perform.

This system explicitly rejects the textbook-website cliché (cluttered panels, beige, every metric on screen at once), the LeetCode cramped-productivity feel, the shadcn-default SaaS dashboard look (Stripe admin cosplay, card-grid-with-stat-numbers reflex), kid-coding bright primaries with cartoon mascots, and the LLM-default dark-mode-with-purple-gradient slop that haunts every AI-generated landing page.

**Key Characteristics:**
- One focal area per screen. Everything else is desk surface.
- Warm-on-dark. Text and accents are tinted, never pure white on pure black.
- Choreographed motion, not interpolation. Transitions encode meaning.
- A single complexity notation, set in mono, beats a table of six.
- Borders are ghost-thin or absent. Depth comes from tonal layering, not strokes.

## 2. Colors

A near-black indigo desk surface, lifted by four state hues that carry semantic meaning across every visualization. The palette is small on purpose: the more colors, the less each one means.

### Primary

- **Probe Blue** (`#4f7cf8`): The active-scan, comparing, or focused state. The most-used accent across visualizations. Also the brand color in the sidebar logo and primary CTAs. When you see Probe Blue moving, the algorithm is doing work *on* something.

### Secondary

- **Verified Jade** (`#38c9a0`): The done, sorted, found, or correct state. Appears at the *end* of a transition, never the middle. Verifies the algorithm's progress to the viewer.
- **Filament Amber** (`#f8a74f`): The in-flight, swapping, writing, or transient state. When two values are being exchanged, when a node is being inserted, when a hash is being rehashed — Filament Amber lights up briefly and then resolves to one of the other roles.
- **Tracer Violet** (`#c97af8`): The pivot, target, or selected-by-user state. Used when *one* element among many has a special role — the pivot in quicksort, the search target in BST, the source node in Dijkstra.

### Neutral

- **Carbon Indigo** (`#070811`): The desk surface. The deepest background. Almost-black but tinted toward indigo so the warm accents read against it.
- **Panel Indigo** (`#0b0d1c`): The first lift — cards, panels, the main content surface above the desk. ~3% lighter than Carbon.
- **Sidebar Indigo** (`#09091a`): The chrome surfaces — sidebar, toolbar — slightly cooler than Panel so the eye knows it's app shell, not content.
- **Elevated Indigo** (`#090b16`): A subtle alt-tone for striped tables, scrollbar tracks, code blocks.
- **Input Indigo** (`#0f1120`): Form fields. Reads as recessed against Panel.
- **Hover Indigo** (`#141828`): The hover-state lift. The most you ever raise a surface short of focus.
- **Border Soft** (`#1a1f38`): The default 1px divider. Whisper-quiet.
- **Border Strong** (`#2a3060`): Used only when grouping cannot be done with whitespace alone.
- **Lunar Paper** (`#d0d5ec`): Primary text on dark. Tinted *cool* to match the indigo surfaces, but never bluer than necessary.
- **Dimmed Paper** (`#606888`): Secondary text — captions, helper copy, hover hints.
- **Muted Paper** (`#404870`): Tertiary text — icon defaults, subtle metadata.
- **Dim Paper** (`#303558`): Quaternary — disabled states, the faintest legible mark.

### Reserved

- **Error Red** (`#f86060`): App-level errors only — failed input validation, broken state, critical alerts. **Never** used to encode algorithm state. The algorithm-state quartet is Probe Blue / Verified Jade / Filament Amber / Tracer Violet.
- **Beam Yellow** (`#f8c040`): Path highlight, only on graph and tree visualizations to draw a route. Used sparingly because yellow on dark fights every other accent.

### Named Rules

**The Algorithm State Quartet Rule.** Algorithm-state encoding is restricted to the four hues: Probe Blue (active), Verified Jade (done), Filament Amber (in flight), Tracer Violet (special). Red is reserved for application errors. Adding a fifth state hue is forbidden — split visual roles across these four or introduce a redundant non-color encoding (shape, position, motion).

**The Single Pool Rule.** Each screen has exactly one focal area lit by one accent at any given moment. Two simultaneous accents on the same surface compete and turn the canvas into a circus. If you need to show two states at once, separate them in time (sequence the animation) or in space (different regions of the canvas).

**The No-Pure-Black Rule.** `#000000` is forbidden. Carbon Indigo (`#070811`) is the floor. Pure black is what cheap dark themes use; Carbon Indigo is what desk surfaces look like at 1am.

## 3. Typography

**Display Font:** Space Grotesk (with -apple-system, BlinkMacSystemFont, sans-serif fallback).
**Mono Font:** JetBrains Mono (with Roboto Mono, monospace fallback).

**Character:** Space Grotesk is a geometric sans with just enough warmth in its terminals to feel grown-up rather than cold-corporate; JetBrains Mono is a developer monospace with strong character shapes and excellent hinting. Together they read as a serious computer-science register — a designer's textbook, not a marketing site.

### Hierarchy

- **Display** (700, `clamp(28px, 4vw, 44px)`, line-height 1.05, letter-spacing -0.025em): Reserved for hero moments — the home page introduction, the title above an active visualization once the redesign is in place. Currently underused; the redesign will promote page titles to this scale.
- **Headline** (700, 20px, line-height 1.2, letter-spacing -0.02em): Page titles inside the app shell.
- **Title** (700, 16px, line-height 1.3, letter-spacing -0.01em): Card titles, panel titles, section headers within a page.
- **Body** (400, 14px, line-height 1.6): Default reading text. Lines wrap at 65–75ch maximum; longer lines are forbidden in pedagogical prose because they're already hard enough to read at 1am.
- **Body-sm** (400, 12.5px, line-height 1.65): Helper text, captions, descriptions inside cards.
- **Label** (700, 11px, line-height 1.2, letter-spacing 0.14em, **UPPERCASE**): Section labels (e.g. "LEGEND"), micro-headers, axis labels. Uppercase by convention.
- **Notation** (Mono, 500, 13px): Code, pseudocode, complexity notations (`O(n log n)`), variable names, hash values, anything that's *literally code or math*.

### Named Rules

**The Mono Voice Rule.** JetBrains Mono is reserved for *data* — code, complexity notations, variable names, numeric values inside a visualization, hash function output. It must not appear on UI chrome (button labels, navigation, headings). When prose and code share a sentence, the code switches font; the prose does not.

**The One Notation Rule.** Each visualization shows exactly one complexity notation in scannable position (e.g., `O(n log n)` in the upper-right of the canvas). A table of best/worst/average/space is offered behind progressive disclosure, never in the default view. The point of the visible notation is to be glanceable.

**The 65ch Cap.** Pedagogical prose never exceeds 75 characters per line, ideally 65. Wide rivers of text are how textbook websites lose students at midnight.

## 4. Elevation

This system is **flat by default with tonal layering**. Shadows are rare and reserved for active focus states on the central canvas; depth on every other surface comes from indigo tonal shifts (Carbon → Panel → Hover Indigo, each ~3–4% lighter than the previous). Borders are 1px Border Soft, used for separation only when whitespace cannot do the job.

The Late Study Desk metaphor is the source: a desk lamp casts one warm pool. There is no overhead light, no rim light, no ambient lift across every surface.

### Shadow Vocabulary

- **Focus Glow** (`box-shadow: 0 0 0 3px rgba(79, 124, 248, 0.25)`): Keyboard focus on interactive elements. Probe Blue at 25% alpha, no offset, just a halo. Replaces the browser default focus ring.
- **Canvas Lamp** (`box-shadow: 0 24px 80px -32px rgba(79, 124, 248, 0.18)`): Optional, applied to the central visualization container when it is the active surface on a page. The "pool of light" effect. One per page, never two.
- **Card Hover** (`box-shadow: 0 8px 32px rgba(<accent>, 0.16)`): Used on the home page and topic-grid cards, where the per-card accent provides the glow color. Restricted to navigation-card use.

### Named Rules

**The One Lamp Rule.** A page may have at most one Canvas Lamp shadow. If the user is on a page with multiple visualizations, only the active one carries the lamp. Two lamps means there is no focus.

**The Ghost Border Rule.** Default borders are 1px in Border Soft (`#1a1f38`). Stronger borders are forbidden on content surfaces — if a stronger border feels needed, the surface needs a different background tone instead. Colored borders (a blue stripe on a card, a green left-edge accent) are forbidden everywhere.

## 5. Components

### Buttons

- **Shape:** 6px radius (md). Pill is reserved for chips/tags only.
- **Primary:** Probe Blue background, white text, 8px×14px padding, 12.5px Body-sm. Hover dims to 85% opacity (the project's universal hover pattern). Used for the principal action on a page; never more than one Primary visible at a time.
- **Ghost:** Transparent background, Dimmed Paper text, 1px Border Soft, 6px×12px padding. Hovers to Hover Indigo background and Lunar Paper text. Used for secondary actions, tool buttons (Help), and most controls.
- **Step Controls** (signature): Reserved for the unified control bar on visualization screens. Square 32px, ghost styling at rest, Probe Blue glow on the currently-active control (e.g. `Step Forward` while autoplay is running). Icon-only, 18px Lucide icons. Tooltip labels appear after a 600ms hover delay (don't pop on accidental hovers).

### Cards

- **Corner Style:** 10px radius (lg).
- **Background:** Panel Indigo. Hover shifts the border color to the card's accent at 67% alpha and adds the Card Hover shadow tinted to that accent.
- **Shadow Strategy:** None at rest. Card Hover only on hover. See Elevation.
- **Border:** 1px Border Soft at rest. Side-stripe borders are **forbidden**.
- **Internal Padding:** 22px.
- **Forbidden:** nested cards. If you reach for a card-inside-a-card, restructure the page instead.

### Inputs

- **Style:** Input Indigo background, 1px Border Soft, 6px radius, JetBrains Mono 13px text in Lunar Paper, 7px×10px padding.
- **Focus:** Border shifts to Probe Blue. No glow on inputs (the border color carries focus); Focus Glow is reserved for buttons and interactive non-input elements.
- **Range sliders:** 4px track in Border Soft, 12px circular thumb in Probe Blue. Used for the speed control on every visualization.

### Chips / Tags

- **Style:** Transparent background, 1px border in the topic accent at ~33% alpha, accent text at ~80% alpha, JetBrains Mono 11px (Label scale but mono), pill shape (999px radius), 2px×9px padding.
- **Use:** Algorithm tags on home-page cards (`Bubble`, `Quick`, `Merge`). Read as small data labels, not buttons. Not interactive.

### Navigation (Sidebar)

- **Style:** 210px fixed width, Sidebar Indigo background, 1px Border Soft right edge.
- **Items:** Body-sm in Dimmed Paper at rest; Lunar Paper on hover; the topic accent applied as a left bar (3px wide, 18px tall, no radius on the left edge) on the active route.
- **Logo lockup:** Title-scale Space Grotesk in Lunar Paper, 15px size. Sits in a 20×18 padded block above the nav list.
- **Footer:** 6px Verified Jade dot + 10.5px Dim Paper text. Reads as a status indicator, not a CTA.

### Visualization Canvas (signature, governs the redesign)

The central performance surface. **This is the component the redesign expands.**

- **Proportion:** Hero. The canvas owns the largest contiguous rectangle on every visualization page, with a minimum aspect that protects the visualization's geometry (square for graphs/trees, 16:9 for sorting bars, etc.).
- **Surface:** Panel Indigo. May carry the Canvas Lamp shadow when active.
- **Padding:** Internal padding scales with canvas size — `clamp(20px, 3vw, 44px)`. Generous on purpose.
- **Notation overlay:** Top-right corner, JetBrains Mono 13px Notation, Dimmed Paper. One line, e.g. `O(n log n) · n = 32`.
- **State legend:** Optional, bottom-right, micro-Label scale, only the states currently in play (do not show legend entries for states the running algorithm does not produce).
- **Borders:** None. The canvas is defined by its background tone shift from Carbon Indigo, not by a stroke.

### Step Control Bar (signature)

The redesign's unified control surface. Replaces the right-side panel pattern.

- **Position:** Bottom-center of the canvas, floating ~24px above the page edge.
- **Surface:** Hover Indigo background, 1px Border Soft, 10px radius. Slight Canvas Lamp shadow.
- **Layout:** Inline row of step controls (`«`, `‹`, play/pause, `›`, `»`), a horizontal scrub bar (the slider component), and a speed control. Right-edge slot for an "expand parameters" disclosure that reveals algorithm-specific controls in a contextual overlay rather than a permanent right panel.
- **Width:** Fits content. Never spans the full canvas width.

## 6. Do's and Don'ts

### Do:

- **Do** anchor every page on a single hero canvas. The canvas earns at least 60% of the visible area.
- **Do** restrict algorithm-state color to the quartet: Probe Blue, Verified Jade, Filament Amber, Tracer Violet.
- **Do** use Carbon Indigo (`#070811`) for the deepest surface. Pure black is forbidden.
- **Do** use tonal layering (Carbon → Panel → Hover Indigo) for depth before reaching for a shadow.
- **Do** show exactly one complexity notation per visualization, set in JetBrains Mono.
- **Do** cap pedagogical prose at 65–75ch.
- **Do** write motion that encodes meaning. The merge step in merge sort is the lesson; choreograph it.
- **Do** honor `prefers-reduced-motion` by softening timing and shortening travel, not by stripping animation.
- **Do** keep voice unhurried and lecturer-grade. Short sentences. No exclamation marks. No "Let's dive in!"

### Don't:

- **Don't** use side-stripe borders (a `border-left` greater than 1px as a colored accent on cards, list items, panels). Forbidden everywhere.
- **Don't** build the page with a permanent right-side panel of metrics, parameters, and controls. The redesign replaces this with a unified bottom Step Control Bar plus contextual overlays.
- **Don't** show panels-of-everything: best-case / worst-case / average / space-complexity tables in the default view. One notation, glanceable. The rest is progressive disclosure.
- **Don't** nest cards inside cards. If you're tempted, the page structure is wrong.
- **Don't** use `#000000`, `#ffffff`, or any pure CSS named color. Tint toward the system.
- **Don't** use gradient text (`background-clip: text` + linear-gradient). Emphasis comes from weight and size.
- **Don't** use glassmorphism, backdrop blur, or ambient ambient-frosted-glass surfaces. The Late Study Desk has one lamp, not seven.
- **Don't** use red and green together to encode opposite algorithm states. The quartet is colorblind-safe; respect it.
- **Don't** use kid-coding aesthetics — bright primaries, cartoon mascots, rocket emoji 🚀, "Awesome job!" toasts. This product respects its user.
- **Don't** ship the LLM dark-mode-with-purple-gradient hero template. If a screen could be mistaken for a generic AI SaaS landing, it has failed.
- **Don't** animate CSS layout properties (width, height, top, left, margin). Animate `transform`, `opacity`, and SVG attributes. GSAP and Framer Motion both prefer transform; respect them.
- **Don't** write multi-paragraph explanatory blocks beside the visualization. Three short sentences beat one paragraph; one sentence beats three short sentences if the visualization itself is doing the teaching.
