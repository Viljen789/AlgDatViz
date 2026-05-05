import { useEffect, useMemo, useState } from 'react';
import useReducedMotion from '../../../hooks/useReducedMotion';
import styles from './CoinChangeCanvas.module.css';

const CELL_W = 56;
const CELL_GAP = 8;
const ARROW_ZONE_H = 78;

const cellCenterPx = i => i * (CELL_W + CELL_GAP) + CELL_W / 2;

const CoinChangeCanvas = ({ frame, preset }) => {
	const reduced = useReducedMotion();
	const [phase, setPhase] = useState('resolved');

	const target = preset?.target ?? 0;
	const cellCount = target + 1;
	const tableWidth = cellCount * CELL_W + Math.max(0, cellCount - 1) * CELL_GAP;

	const activeI = frame?.activeI ?? null;
	const predecessors = useMemo(
		() => frame?.predecessors ?? [],
		[frame]
	);
	const winningIndex = frame?.winningPredecessor?.prevIndex ?? null;
	const dpTable = frame?.dpTable ?? [];
	const equation = frame?.equation;

	const stepKey = frame?.step;
	const predCount = predecessors.length;

	useEffect(() => {
		if (predCount === 0) {
			setPhase('resolved');
			return;
		}
		setPhase('drawing');
		const dur = reduced ? 180 : 560;
		const timer = window.setTimeout(() => setPhase('resolved'), dur);
		return () => window.clearTimeout(timer);
	}, [stepKey, preset?.id, predCount, reduced]);

	const predecessorIndexSet = useMemo(
		() => new Set(predecessors.map(p => p.prevIndex)),
		[predecessors]
	);

	const stateFor = i => {
		if (i === activeI) return 'active';
		if (predecessorIndexSet.has(i)) {
			if (phase === 'resolved' && i === winningIndex) return 'winning';
			return 'flight';
		}
		if (dpTable[i] !== null && dpTable[i] !== undefined) return 'done';
		return 'idle';
	};

	const showActiveValue = phase === 'resolved' && activeI !== null;
	const activeValue = showActiveValue ? dpTable[activeI] : null;

	const arrowKey = `${preset?.id}-${frame?.step}`;
	const greedyDone = frame?.greedyDone;
	const verdict = frame?.verdict;

	return (
		<div className={styles.canvas}>
			<EquationStrip
				equation={equation}
				phase={phase}
				winningIndex={winningIndex}
				preset={preset}
				activeI={activeI}
				activeValue={activeValue}
				hasPredecessors={predecessors.length > 0}
			/>

			<div className={styles.tableScroll}>
				<div
					className={styles.tableInner}
					style={{ width: `${tableWidth}px` }}
				>
					<svg
						className={styles.arrowLayer}
						width={tableWidth}
						height={ARROW_ZONE_H}
						viewBox={`0 0 ${tableWidth} ${ARROW_ZONE_H}`}
						aria-hidden="true"
						key={arrowKey}
					>
						{predecessors.map(p => {
							const startX = cellCenterPx(p.prevIndex);
							const endX = cellCenterPx(activeI);
							const dist = Math.abs(activeI - p.prevIndex);
							const apex = Math.max(8, ARROW_ZONE_H - 18 - dist * 4);
							const startY = ARROW_ZONE_H;
							const endY = ARROW_ZONE_H;
							const path = `M ${startX} ${startY} C ${startX} ${apex} ${endX} ${apex} ${endX} ${endY}`;
							const labelX = (startX + endX) / 2;
							const labelY = apex - 4;
							const isWinning =
								phase === 'resolved' && p.prevIndex === winningIndex;
							return (
								<g
									key={p.prevIndex}
									className={`${styles.arrowGroup} ${isWinning ? styles.arrowGroupWinning : ''}`}
								>
									<path
										d={path}
										className={styles.arrowPath}
										pathLength="1"
										fill="none"
									/>
									<circle
										cx={endX}
										cy={endY}
										r="3"
										className={styles.arrowHead}
									/>
									<text
										x={labelX}
										y={labelY}
										className={styles.arrowLabel}
										textAnchor="middle"
									>
										+{p.coin}
									</text>
								</g>
							);
						})}
					</svg>

					<ol className={styles.cellRow}>
						{dpTable.map((value, i) => {
							const state = stateFor(i);
							return (
								<li
									key={i}
									className={`${styles.cell} ${styles[`cell-${state}`]}`}
								>
									<span className={styles.cellIndex}>i={i}</span>
									<span className={styles.cellValue}>
										{i === activeI && !showActiveValue
											? '?'
											: value === null || value === undefined
												? '?'
												: value}
									</span>
								</li>
							);
						})}
					</ol>
				</div>
			</div>

			<GreedyStrip
				preset={preset}
				choices={frame?.greedyChoices ?? []}
				remaining={frame?.greedyRemaining ?? preset?.target}
				done={greedyDone}
				verdict={verdict}
			/>
		</div>
	);
};

const EquationStrip = ({
	equation,
	phase,
	winningIndex,
	preset,
	activeI,
	activeValue,
	hasPredecessors,
}) => {
	if (!preset) return null;

	if (activeI === null) {
		return (
			<div className={styles.equationStrip}>
				<span className={styles.equationTemplate}>
					dp[i] = 1 + min(dp[i − c] for c in coins, where i − c ≥ 0)
				</span>
			</div>
		);
	}

	if (!hasPredecessors || !equation) {
		return (
			<div className={styles.equationStrip}>
				<span className={styles.equationLead}>dp[{activeI}]</span>
				<span className={styles.equationOp}>=</span>
				<span className={styles.equationInfinity}>∞</span>
				<span className={styles.equationNote}>
					— no coin reaches {activeI}¢ from a known cell
				</span>
			</div>
		);
	}

	const showResult = phase === 'resolved';
	const winning = equation.candidates.find(
		c => c.prevIndex === winningIndex
	);

	return (
		<div className={styles.equationStrip}>
			<span className={styles.equationLead}>dp[{activeI}]</span>
			<span className={styles.equationOp}>=</span>
			<span className={styles.equationConst}>1</span>
			<span className={styles.equationOp}>+</span>
			<span className={styles.equationFn}>min(</span>
			{equation.candidates.map((c, idx) => (
				<span key={c.prevIndex} className={styles.equationTermWrap}>
					<span
						className={`${styles.equationTerm} ${
							showResult && c.prevIndex === winningIndex
								? styles.equationTermWinning
								: ''
						}`}
					>
						dp[{c.prevIndex}]={c.prevValue}
					</span>
					{idx < equation.candidates.length - 1 && (
						<span className={styles.equationSep}>,</span>
					)}
				</span>
			))}
			<span className={styles.equationFn}>)</span>
			<span
				className={`${styles.equationTail} ${
					showResult ? styles.equationTailVisible : ''
				}`}
			>
				<span className={styles.equationOp}>=</span>
				<span className={styles.equationConst}>1</span>
				<span className={styles.equationOp}>+</span>
				<span className={styles.equationTermWinning}>
					{winning?.prevValue}
				</span>
				<span className={styles.equationOp}>=</span>
				<span className={styles.equationResult}>{activeValue}</span>
			</span>
		</div>
	);
};

const GreedyStrip = ({ preset, choices, remaining, done, verdict }) => {
	if (!preset) return null;
	const totalCoins = choices.length;

	return (
		<div className={`${styles.greedyStrip} ${done ? styles.greedyDone : ''}`}>
			<div className={styles.greedyHeader}>
				<span className={styles.greedyLabel}>GREEDY</span>
				<span className={styles.greedyTagline}>
					take the largest coin that fits, never revise
				</span>
			</div>
			<div className={styles.greedyRow}>
				<div className={styles.greedyTokens}>
					{choices.length === 0 ? (
						<span className={styles.greedyEmpty}>waiting…</span>
					) : (
						choices.map((c, i) => (
							<span key={i} className={styles.greedyToken}>
								{c}¢
							</span>
						))
					)}
				</div>
				<div className={styles.greedyMeta}>
					<span className={styles.greedyCount}>
						{totalCoins} coin{totalCoins === 1 ? '' : 's'}
					</span>
					<span className={styles.greedyDot}>·</span>
					<span className={styles.greedyRemaining}>
						remaining = {remaining}¢
					</span>
				</div>
			</div>
			{verdict && <p className={styles.greedyVerdict}>{verdict}</p>}
		</div>
	);
};

export default CoinChangeCanvas;
