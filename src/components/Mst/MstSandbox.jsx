import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import MstPlayground from './MstPlayground.jsx';
import MstCompare from './MstCompare.jsx';
import useReducedMotion from '../../hooks/useReducedMotion.js';
import styles from './MstSandbox.module.css';

// Flip drives the Single <-> Compare swap (the SAME graph re-anchoring between a
// one-up canvas and the left half of the two-up). Shared across the other Flip
// surfaces; registering twice is a no-op.
gsap.registerPlugin(Flip);

// The Single graph and Compare's LEFT (Kruskal) pane are ONE shared element:
// both carry this flip-id, so on a mode switch Flip slides + scales that graph
// from where it was into where it lands, instead of teleporting on a remount.
// Compare's left pane tags its .graphBox in JSX; the Single canvas box is inside
// MstPlayground (not ours to edit), so we tag it imperatively — it is the direct
// parent of the one graph SVG, found by its aria-label, in either mode.
const FLIP_ID = 'mst-shared-graph';
const GRAPH_SELECTOR = 'svg[aria-label="Weighted graph"]';

// The persisting "left" graph box in the live sandbox: in Single the sole graph;
// in Compare the first in document order, which is the Kruskal pane.
const findSharedBox = root => {
	const svg = root?.querySelector(GRAPH_SELECTOR);
	return svg?.parentElement || null;
};

// Wraps the MST sandbox with a Single / Compare toggle: run one algorithm with
// full pseudocode + live state, or watch Kruskal and Prim race side-by-side on
// the same graph. Both forward onUserInteract so the topic still completes.
const MstSandbox = ({ onUserInteract }) => {
	const reducedMotion = useReducedMotion();
	const [mode, setMode] = useState('single');
	const sandboxRef = useRef(null);
	// The Flip snapshot captured (while the leaving layout still exists) the frame
	// before setMode commits; consumed once React has mounted the new tree.
	const pendingFlipRef = useRef(null);
	// The mode the last committed effect ran for — so a re-run triggered only by a
	// reduced-motion preference flip (mode unchanged) animates nothing. null until
	// first mount, which is itself skipped (initial render is not a transition).
	const prevModeRef = useRef(null);

	// Capture the shared graph's current rect BEFORE the mode swaps, so Flip.from
	// has a real start to interpolate from after the remount. Tag the box first
	// (Single's wrapper has no flip-id of its own) so getState keys it correctly.
	const changeMode = next => {
		if (next === mode) return;
		onUserInteract?.();
		if (!reducedMotion) {
			const box = findSharedBox(sandboxRef.current);
			if (box) {
				box.setAttribute('data-flip-id', FLIP_ID);
				pendingFlipRef.current = Flip.getState(box);
			}
		}
		setMode(next);
	};

	// Find Compare's revealed Prim pane (the right one) after a commit — only it
	// is new this beat, so it is the one that eases / fades in.
	const findRightPane = sandbox => {
		const graphs = sandbox?.querySelectorAll(GRAPH_SELECTOR);
		return graphs?.[1]?.closest(`.${styles.flipSibling}`) || null;
	};

	// Run the transition after commit: the shared graph re-anchors (slide + scale)
	// into its new home while the revealed Prim pane (Compare) eases in as a calm
	// sibling; on the way back the left graph Flips to center and Prim unmounts.
	// Reduced motion keeps the lesson — no travel, just a brief fade so the new
	// pane registers — and the 'same graph, two routes' point still lands via the
	// shared edge data and the result strip.
	useLayoutEffect(() => {
		// Only a real mode change is a transition: skip the initial mount and any
		// re-run caused solely by the reduced-motion preference toggling.
		if (prevModeRef.current === mode) return undefined;
		const changed = prevModeRef.current !== null;
		prevModeRef.current = mode;
		if (!changed) return undefined;
		const sandbox = sandboxRef.current;

		if (reducedMotion) {
			// No Flip: the layout has already snapped to the new arrangement. Just a
			// ~120ms fade-in of the revealed pane so the change reads.
			if (mode !== 'compare') return undefined;
			const rightPane = findRightPane(sandbox);
			if (!rightPane) return undefined;
			const ctx = gsap.context(() => {
				gsap.fromTo(
					rightPane,
					{ opacity: 0 },
					{ opacity: 1, duration: 0.12, ease: 'power1.inOut' }
				);
			}, sandbox);
			return () => ctx.revert();
		}

		const pending = pendingFlipRef.current;
		if (!pending) return undefined;
		pendingFlipRef.current = null;

		const box = findSharedBox(sandbox);
		if (box) box.setAttribute('data-flip-id', FLIP_ID);

		const ctx = gsap.context(() => {
			// One quiet slide + scale, no overshoot — a mode-switch polish, not a
			// spring. absolute keeps the graph put while its siblings reflow.
			Flip.from(pending, {
				duration: 0.5,
				ease: 'power2.inOut',
				absolute: true,
			});
			// Compare's second (Prim) pane is new this beat: fade it in from a small
			// x so it reads as revealed alongside, not stamped in.
			if (mode === 'compare') {
				const rightPane = findRightPane(sandbox);
				if (rightPane) {
					gsap.fromTo(
						rightPane,
						{ opacity: 0, x: 12 },
						{ opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' }
					);
				}
			}
		}, sandbox);
		return () => ctx.revert();
	}, [mode, reducedMotion]);

	return (
		<div className={styles.sandbox} ref={sandboxRef}>
			<div className={styles.toggle} role="group" aria-label="Sandbox mode">
				<button
					type="button"
					className={`${styles.toggleBtn} ${mode === 'single' ? styles.toggleActive : ''}`}
					aria-pressed={mode === 'single'}
					onClick={() => changeMode('single')}
				>
					Single algorithm
				</button>
				<button
					type="button"
					className={`${styles.toggleBtn} ${mode === 'compare' ? styles.toggleActive : ''}`}
					aria-pressed={mode === 'compare'}
					onClick={() => changeMode('compare')}
				>
					Compare side by side
				</button>
			</div>
			{mode === 'single' ? (
				<MstPlayground onUserInteract={onUserInteract} />
			) : (
				<MstCompare
					onUserInteract={onUserInteract}
					rightPaneClass={styles.flipSibling}
				/>
			)}
		</div>
	);
};

export default MstSandbox;
