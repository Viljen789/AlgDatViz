// PlaybackEngine — per-scene aria-live narration for the topic concept stages.
//
// Every topic Stage figure wraps in role="img" (or role="group") with ONE static
// aria-label, and renders its per-scene caption — the per-step WHY, e.g.
// "Relax C -> A: 7 < 10" — INSIDE that subtree. For role="img", ARIA flattens the
// whole subtree to the single static label, so the per-scene caption is never
// announced: a screen-reader student hears one frozen sentence for the entire
// scrolly, no matter how far they scroll.
//
// SceneNarration fixes that without touching the picture. It is a visually-hidden
// aria-live="polite" region rendered OUTSIDE the role=img subtree (as a sibling),
// announcing the SAME honest caption the visible figure already shows. The figure
// keeps its caption as the on-screen text; this exposes it to assistive tech.
//
// It is the lightweight twin of FrameTrace: FrameTrace renders a VISIBLE narration
// line (plus counter / structured trace) for the interactive playgrounds; the
// scrolly stages already paint their caption, so they only need the announcement.
// Both are the same idea — an aria-live="polite" region that speaks the current
// step's honest text — so the whole product narrates consistently.
//
// HONESTY: pass only the caption the visuals already convey. Never narrate a
// value-ordering the pixels do not satisfy (the tree/heap are index-packed).
//
// PROPS
//   children   string | node — the current scene's honest caption / step text.
//                              Re-announced whenever it changes (i.e. per scene).
//   ariaLive   'polite' | 'assertive' | 'off' — politeness (default 'polite').
//   className  string        — extra class on the (already sr-only) wrapper.

import styles from './SceneNarration.module.css';

const SceneNarration = ({ children, ariaLive = 'polite', className = '' }) => {
	if (children == null || children === '') return null;
	return (
		<p className={`${styles.srLive} ${className}`.trim()} aria-live={ariaLive}>
			{children}
		</p>
	);
};

export default SceneNarration;
