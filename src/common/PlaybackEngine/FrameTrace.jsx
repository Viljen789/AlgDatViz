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

import styles from './FrameTrace.module.css';

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
					{entries.map(entry => (
						<li
							key={entry.id}
							className={`${styles.entry} ${entry.active ? styles.entryActive : ''}`}
							style={
								entry.depth
									? { '--trace-depth': entry.depth }
									: undefined
							}
							aria-current={entry.active ? 'step' : undefined}
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
					))}
				</ol>
			)}

			{children}
		</div>
	);
};

export default FrameTrace;
