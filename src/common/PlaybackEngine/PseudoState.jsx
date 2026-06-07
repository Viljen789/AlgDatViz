// PseudoState — synced pseudocode + live variable-state panel.
//
// Pairs an algorithm's pseudocode with a single playback frame: the executing
// line is highlighted in lockstep and a live variable-state readout shows the
// machine's current values. It is reusable by both the playground stage and
// (Phase 2) the teaching stage, so every topic narrates the same way.
//
// ──────────────────────────────────────────────────────────────────────────
// THE FRAME CONTRACT (Phase 1b topics emit frames in this shape)
//
//   frame = {
//     line:      number,            // 0-based index into `lines`; the currently
//                                   //   executing pseudocode line. null/undefined
//                                   //   = no line highlighted.
//     state:     Array<{            // ordered variable-state rows (render order
//       label:   string,           //   is the array order). Each row:
//       value:   string|number,    //   the variable's current value.
//       active?: boolean,          //   emphasize this row (it just changed).
//     }>,
//     highlight: Array<string|number> | undefined,
//                                   // optional emphasis ids the host stage can
//                                   //   read (e.g. node/cell ids to glow). The
//                                   //   panel does not render these itself; it
//                                   //   exposes them so the stage stays in sync.
//   }
//
// A frame generator is any pure `(input) => frame[]`. Generators belong in the
// topic's utils so they can be unit-tested without React. See
// PseudoState.example.js for a minimal conformant generator + its test.
// ──────────────────────────────────────────────────────────────────────────
//
// PROPS
//   lines        string[]          — the pseudocode, one entry per line.
//   frame        Frame             — the active frame (see contract above). If a
//                                    bare `line`/`state` is easier, pass them as
//                                    top-level props instead (below).
//   line         number            — override: active line index (used when no
//                                    `frame` is given).
//   state        StateRow[]        — override: state rows (used when no `frame`).
//   label        string            — pseudocode rail heading (default 'PSEUDOCODE').
//   stateLabel   string            — state readout heading (default 'STATE').
//   step         number            — optional step index for the counter.
//   totalSteps   number            — optional total for the counter.
//   isRunning    boolean           — when false, no line is highlighted even if
//                                    `line` is set (default true).
//   className    string            — extra class on the root.

import { useEffect, useRef } from 'react';
import useReducedMotion from '../../hooks/useReducedMotion.js';
import styles from './PseudoState.module.css';

// Stable identity for a state row across frames. We diff by label/id — never by
// array index — so reordering or scrubbing doesn't smear "what changed" onto the
// wrong rows.
const rowKey = (row, idx) => row?.id ?? row?.label ?? idx;

// Compare the incoming frame against the previous one and report the delta:
//   - changed: Set of rowKeys whose `value` flipped or that became newly active
//   - lineChanged: did the executing pseudocode line move?
// Returns `null` for "don't pulse anything" cases (first render, or a reset /
// wholesale row-set swap where every row would otherwise scream at once).
const diffFrame = (prev, next) => {
	if (!prev) return null; // first render — nothing to announce yet.

	const lineChanged = prev.line !== next.line;

	const prevRows = prev.rows;
	const nextRows = next.rows;
	const hasPrevRows = Array.isArray(prevRows) && prevRows.length > 0;
	const hasNextRows = Array.isArray(nextRows) && nextRows.length > 0;

	// Idle/reset transitions (rows appear, vanish, or are fully swapped out)
	// must not light up every row — that reads as noise, not a delta.
	if (!hasPrevRows || !hasNextRows) {
		return { changed: new Set(), lineChanged };
	}

	const prevByKey = new Map(
		prevRows.map((row, idx) => [rowKey(row, idx), row])
	);
	const nextKeys = nextRows.map((row, idx) => rowKey(row, idx));

	// A reset commonly re-keys the whole panel (different labels entirely). If
	// none of the new rows existed before, it's a reset, not a per-row change.
	const overlap = nextKeys.filter(k => prevByKey.has(k)).length;
	if (overlap === 0) {
		return { changed: new Set(), lineChanged };
	}

	const changed = new Set();
	nextRows.forEach((row, idx) => {
		const key = nextKeys[idx];
		const before = prevByKey.get(key);
		if (!before) return; // brand-new row from a reset/swap — don't pulse.
		const valueChanged = String(before.value) !== String(row.value);
		const becameActive = !before.active && !!row.active;
		if (valueChanged || becameActive) changed.add(key);
	});

	return { changed, lineChanged };
};

const PseudoState = ({
	lines = [],
	frame,
	line,
	state,
	label = 'PSEUDOCODE',
	stateLabel = 'STATE',
	step,
	totalSteps,
	isRunning = true,
	className = '',
}) => {
	const activeLine = frame ? frame.line : line;
	const rows = frame ? frame.state : state;
	const showCounter =
		typeof step === 'number' && typeof totalSteps === 'number';

	const railRef = useRef(null);
	const activeRef = useRef(null);

	const reducedMotion = useReducedMotion();

	// ── Delta tracking ──────────────────────────────────────────────────────
	// Each render we diff the incoming frame against the last one to find what
	// changed (a state row's value/active state, or the executing line). Changed
	// elements are re-keyed (the row's key folds in the new value/active flag, the
	// line key folds in a flip flag) so React remounts just those nodes and the
	// CSS pulse replays on every advance. The diff is read-only here; the snapshot
	// is committed in an effect, keeping render pure (StrictMode-safe). Under
	// reduced motion we skip the diff entirely and fall back to a static marker.
	const prevFrameRef = useRef(null);
	const current = { line: activeLine, rows };
	const delta = reducedMotion ? null : diffFrame(prevFrameRef.current, current);
	const changedRows = delta ? delta.changed : null;
	const lineDidChange = delta ? delta.lineChanged : false;

	// Commit the frame snapshot *after* diffing so the next render compares
	// against this one.
	useEffect(() => {
		prevFrameRef.current = current;
	});

	// Keep the executing line centered in the rail as it advances.
	useEffect(() => {
		if (!railRef.current || !activeRef.current) return;
		if (typeof activeLine !== 'number') return;
		const rail = railRef.current;
		const active = activeRef.current;
		const offset =
			active.offsetTop - rail.clientHeight / 2 + active.clientHeight / 2;
		rail.scrollTo({ top: offset, behavior: 'smooth' });
	}, [activeLine]);

	const hasState = Array.isArray(rows) && rows.length > 0;

	return (
		<div className={`${styles.panel} ${className}`}>
			<section className={styles.rail} aria-label="Pseudocode">
				<header className={styles.head}>
					<span className={styles.label}>{label}</span>
					{showCounter ? (
						<span className={styles.counter}>
							step {step} / {Math.max(totalSteps - 1, 0)}
						</span>
					) : (
						<span className={styles.counter}>{lines.length} lines</span>
					)}
				</header>
				<div className={styles.railScroll} ref={railRef}>
					<ol className={styles.lineList}>
						{lines.map((text, idx) => {
							const isActive = isRunning && idx === activeLine;
							const trimmed = String(text ?? '').trim();
							const isComment = trimmed.startsWith('//');
							const isEmpty = trimmed === '';
							// Flash the active line only on the step that moved it
							// here. Re-key it (with a flip token) so React remounts
							// the node and the flash replays even on consecutive
							// advances onto adjacent lines.
							const pulse = isActive && lineDidChange;
							return (
								<li
									key={pulse ? `${idx}-flash` : idx}
									ref={isActive ? activeRef : null}
									className={[
										styles.line,
										isActive ? styles.lineActive : '',
										pulse ? styles.linePulse : '',
										isComment ? styles.lineComment : '',
										isEmpty ? styles.lineEmpty : '',
									]
										.filter(Boolean)
										.join(' ')}
									aria-current={isActive ? 'step' : undefined}
									data-line={idx + 1}
								>
									<span className={styles.gutter} aria-hidden="true">
										{isEmpty ? '' : idx + 1}
									</span>
									<code className={styles.code}>{text || ' '}</code>
								</li>
							);
						})}
					</ol>
				</div>
			</section>

			{hasState && (
				<section className={styles.stateBox} aria-label="Live state">
					<header className={styles.head}>
						<span className={styles.label}>{stateLabel}</span>
					</header>
					<dl className={styles.stateList} aria-live="polite">
						{rows.map((row, idx) => {
							const key = rowKey(row, idx);
							const didChange = changedRows?.has(key);
							// Animated pulse when motion is allowed; a persistent
							// "changed" marker when it isn't (reduced motion never
							// reaches diffFrame, so changedRows is null there).
							// Re-key changed rows on their new value so React
							// remounts them and the pulse replays each step.
							return (
								<div
									key={
										didChange
											? `${key}:${row.value}:${row.active ? 1 : 0}`
											: key
									}
									className={[
										styles.stateRow,
										row.active ? styles.stateRowActive : '',
										didChange ? styles.stateRowPulse : '',
									]
										.filter(Boolean)
										.join(' ')}
									data-changed={
										reducedMotion && row.active
											? 'true'
											: undefined
									}
								>
									<dt className={styles.stateKey}>{row.label}</dt>
									<dd className={styles.stateVal}>{row.value}</dd>
								</div>
							);
						})}
					</dl>
				</section>
			)}
		</div>
	);
};

export default PseudoState;
