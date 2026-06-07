// PlaybackEngine — reusable synchronized trace / narration primitive.
//
// Every topic needs the same thing next to its canvas: a live, screen-reader-
// friendly line of narration for the current frame, plus an optional structured
// state / recursion trace. The merge-sort lesson hand-rolled this; FrameTrace
// generalizes the pattern so every topic gets a *consistent* synchronized trace.
//
// It is deliberately slot-driven and content-agnostic — give it strings and/or
// nodes; it never inspects your frame shape.
//
// PROPS
//   narration      string | node   — the live "what's happening now" line.
//                                     Rendered in an aria-live="polite" region
//                                     so assistive tech announces each step.
//   eyebrow        string          — small label above the narration (optional).
//   step           number          — current step index (optional; shows
//                                     "step n / total" when both provided).
//   totalSteps     number          — total frames (optional, pairs with `step`).
//   entries        array           — optional structured trace rows. Each entry:
//                                       { id, label, value?, active?, depth? }
//                                     `active` highlights the current row;
//                                     `depth` indents it (recursion trees).
//   renderEntry    (entry) => node — optional custom row renderer; overrides the
//                                     default label/value row layout.
//   traceLabel     string          — aria-label for the trace list
//                                     (default "Trace").
//   children       node            — free-form slot rendered below the trace
//                                     (e.g. a bespoke recursion view).
//   className      string          — extra class on the root.
//   ariaLive       'polite'|'off'|'assertive' — narration politeness
//                                     (default 'polite').

import { useEffect, useRef } from 'react';
import useReducedMotion from '../../hooks/useReducedMotion.js';
import styles from './FrameTrace.module.css';

// Diff this render's trace entries against the previous render's, by stable id —
// never by index — so scrubbing/reordering doesn't mislabel "what changed".
// Returns a Set of ids whose value flipped or that just became active, or `null`
// when nothing should pulse (first render, or a wholesale reset/swap where every
// id is new and lighting them all up would be noise).
const diffEntries = (prev, next) => {
	if (!prev) return null; // first render — nothing to announce yet.
	const hasPrev = Array.isArray(prev) && prev.length > 0;
	const hasNext = Array.isArray(next) && next.length > 0;
	if (!hasPrev || !hasNext) return new Set();

	const prevById = new Map(prev.map(e => [e.id, e]));
	const overlap = next.filter(e => prevById.has(e.id)).length;
	if (overlap === 0) return new Set(); // reset/full swap — don't pulse all.

	const changed = new Set();
	for (const entry of next) {
		const before = prevById.get(entry.id);
		if (!before) continue; // brand-new row — don't pulse on first appearance.
		const valueChanged = String(before.value) !== String(entry.value);
		const becameActive = !before.active && !!entry.active;
		if (valueChanged || becameActive) changed.add(entry.id);
	}
	return changed;
};

const FrameTrace = ({
	narration,
	eyebrow,
	step,
	totalSteps,
	entries,
	renderEntry,
	traceLabel = 'Trace',
	children,
	className = '',
	ariaLive = 'polite',
}) => {
	const showCounter =
		typeof step === 'number' && typeof totalSteps === 'number';
	const hasEntries = Array.isArray(entries) && entries.length > 0;

	const reducedMotion = useReducedMotion();

	// Delta pulse: changed entries are re-keyed on their new value/active flag so
	// React remounts just those rows and the CSS animation replays each step. The
	// diff is read-only here; the snapshot is committed in an effect, keeping
	// render pure (StrictMode-safe). Skipped entirely under reduced motion.
	const prevEntriesRef = useRef(null);
	const changed = reducedMotion
		? null
		: diffEntries(prevEntriesRef.current, entries);

	useEffect(() => {
		prevEntriesRef.current = entries;
	});

	return (
		<div className={`${styles.trace} ${className}`}>
			{(eyebrow || showCounter) && (
				<div className={styles.head}>
					{eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
					{showCounter && (
						<span className={styles.counter}>
							step {step} / {Math.max(totalSteps - 1, 0)}
						</span>
					)}
				</div>
			)}

			{narration != null && (
				<p className={styles.narration} aria-live={ariaLive}>
					{narration}
				</p>
			)}

			{hasEntries && (
				<ol className={styles.entries} aria-label={traceLabel}>
					{entries.map(entry => {
						const didChange = changed?.has(entry.id);
						return (
						<li
							key={
								didChange
									? `${entry.id}:${entry.value}:${entry.active ? 1 : 0}`
									: entry.id
							}
							className={[
								styles.entry,
								entry.active ? styles.entryActive : '',
								didChange ? styles.entryPulse : '',
							]
								.filter(Boolean)
								.join(' ')}
							style={
								entry.depth
									? { '--trace-depth': entry.depth }
									: undefined
							}
							aria-current={entry.active ? 'step' : undefined}
							data-changed={
								reducedMotion && entry.active ? 'true' : undefined
							}
						>
							{renderEntry ? (
								renderEntry(entry)
							) : (
								<>
									<span className={styles.entryLabel}>{entry.label}</span>
									{entry.value != null && (
										<span className={styles.entryValue}>{entry.value}</span>
									)}
								</>
							)}
						</li>
						);
					})}
				</ol>
			)}

			{children}
		</div>
	);
};

export default FrameTrace;
