import { useEffect, useState } from 'react';
import useReducedMotion from '../../../hooks/useReducedMotion';
import styles from './ClimbingStairsCanvas.module.css';

const CELL_W = 64;
const CELL_GAP = 10;
const ARROW_ZONE_H = 84;

const cellCenterPx = i => i * (CELL_W + CELL_GAP) + CELL_W / 2;

const ClimbingStairsCanvas = ({ frame, n = 6 }) => {
	const reduced = useReducedMotion();
	const [phase, setPhase] = useState('resolved');

	const cellCount = n + 1;
	const tableWidth = cellCount * CELL_W + Math.max(0, cellCount - 1) * CELL_GAP;
	const activeI = frame?.activeI ?? null;
	const predecessors = frame?.predecessors ?? [];
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
		const dur = reduced ? 180 : 480;
		const t = window.setTimeout(() => setPhase('resolved'), dur);
		return () => window.clearTimeout(t);
	}, [stepKey, predCount, reduced]);

	const stateFor = i => {
		if (i === activeI) return 'active';
		if (predecessors.some(p => p.prevIndex === i)) return 'flight';
		if (dpTable[i] !== null && dpTable[i] !== undefined) return 'done';
		return 'idle';
	};

	const showActiveValue = phase === 'resolved' && activeI !== null;

	return (
		<div className={styles.canvas}>
			<div className={styles.equationStrip}>
				{activeI === null ? (
					<span className={styles.equationTemplate}>
						dp[i] = dp[i − 1] + dp[i − 2]
					</span>
				) : !equation ? (
					<>
						<span className={styles.equationLead}>dp[{activeI}]</span>
						<span className={styles.equationOp}>=</span>
						<span className={styles.equationConst}>{dpTable[activeI]}</span>
					</>
				) : (
					<>
						<span className={styles.equationLead}>dp[{activeI}]</span>
						<span className={styles.equationOp}>=</span>
						{equation.terms.map((t, idx) => (
							<span key={t.index} className={styles.equationTermWrap}>
								<span className={styles.equationTerm}>
									dp[{t.index}]={t.value}
								</span>
								{idx < equation.terms.length - 1 && (
									<span className={styles.equationOp}>+</span>
								)}
							</span>
						))}
						<span
							className={`${styles.equationTail} ${
								phase === 'resolved' ? styles.equationTailVisible : ''
							}`}
						>
							<span className={styles.equationOp}>=</span>
							<span className={styles.equationResult}>{equation.result}</span>
						</span>
					</>
				)}
			</div>

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
						key={`${frame?.step}-${activeI}`}
					>
						{predecessors.map(p => {
							const startX = cellCenterPx(p.prevIndex);
							const endX = cellCenterPx(activeI);
							const apex = Math.max(
								12,
								ARROW_ZONE_H - 22 - Math.abs(activeI - p.prevIndex) * 6
							);
							const startY = ARROW_ZONE_H;
							const path = `M ${startX} ${startY} C ${startX} ${apex} ${endX} ${apex} ${endX} ${startY}`;
							return (
								<g key={p.prevIndex} className={styles.arrowGroup}>
									<path
										d={path}
										className={styles.arrowPath}
										pathLength="1"
										fill="none"
									/>
									<circle
										cx={endX}
										cy={startY}
										r="3"
										className={styles.arrowHead}
									/>
									<text
										x={(startX + endX) / 2}
										y={apex - 4}
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

			<p className={styles.caption}>
				{frame?.description ||
					'Each cell looks two cells back — Fibonacci is the recurrence in disguise.'}
			</p>
		</div>
	);
};

export default ClimbingStairsCanvas;
