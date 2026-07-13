import { useMemo } from 'react';
import styles from './RodCuttingCanvas.module.css';

// The rod-cutting canvas: a length-priced rod up top (resolved into its optimal
// pieces at the end), the live recurrence in the middle, and the 1-D dp table
// dp[0..n] below, mirroring the Coin-Change idiom so the two DP problems read as
// kin.

const RodCuttingCanvas = ({ frame }) => {
	const n = frame?.n ?? 0;
	const prices = useMemo(() => frame?.prices ?? [], [frame]);
	const price = i => prices[i - 1] ?? 0;
	const dpTable = frame?.dpTable ?? [];
	const activeJ = frame?.activeJ ?? null;
	const winning = frame?.winning ?? null;
	const pieces = frame?.pieces ?? null;

	// Build the rod's unit segments. At the end we colour by the optimal pieces;
	// mid-run we show the rod of length j with its winning leading piece lit.
	const segments = useMemo(() => {
		if (pieces) {
			const out = [];
			let group = 0;
			for (const len of pieces) {
				for (let k = 0; k < len; k++) {
					out.push({ group, head: k === 0, span: len, role: 'piece' });
				}
				group += 1;
			}
			return out;
		}
		if (activeJ != null && winning) {
			const out = [];
			for (let u = 1; u <= activeJ; u++) {
				out.push({
					group: 0,
					head: u === 1,
					span: winning.piece,
					role: u <= winning.piece ? 'lead' : 'rest',
				});
			}
			return out;
		}
		return [];
	}, [pieces, activeJ, winning]);

	return (
		<div className={styles.canvas}>
			{/* ── Rod ── */}
			<div className={styles.rodWrap}>
				<span className={styles.rodTag}>ROD</span>
				<div className={styles.rod} role="img" aria-label="Rod pieces">
					{segments.length === 0 ? (
						<span className={styles.rodEmpty}>length {n}</span>
					) : (
						segments.map((s, idx) => (
							<span
								key={idx}
								className={`${styles.unit} ${styles[`unit-${s.role}`]} ${
									s.head ? styles.unitHead : ''
								} ${s.group % 2 === 1 ? styles.unitAlt : ''}`}
							>
								{s.head && (
									<span className={styles.unitLabel}>
										{s.role === 'rest'
											? `dp[${activeJ - winning.piece}]`
											: `${s.span}→${price(s.span)}`}
									</span>
								)}
							</span>
						))
					)}
				</div>
			</div>

			{/* ── Recurrence ── */}
			<div className={styles.equationStrip}>
				{activeJ == null ? (
					<span className={styles.equationTemplate}>
						dp[j] = max over i of ( price[i] + dp[j − i] )
					</span>
				) : winning ? (
					<>
						<span className={styles.equationLead}>dp[{activeJ}]</span>
						<span className={styles.equationOp}>=</span>
						<span className={styles.equationFn}>max(</span>
						<span className={styles.equationConst}>price[{winning.piece}]</span>
						<span className={styles.equationOp}>+</span>
						<span className={styles.equationTerm}>
							dp[{winning.prevIndex}]
						</span>
						<span className={styles.equationFn}>)</span>
						<span className={styles.equationOp}>=</span>
						<span className={styles.equationConst}>{winning.price}</span>
						<span className={styles.equationOp}>+</span>
						<span className={styles.equationTerm}>{winning.prevValue}</span>
						<span className={styles.equationOp}>=</span>
						<span className={styles.equationResult}>
							{dpTable[activeJ]}
						</span>
					</>
				) : (
					<span className={styles.equationTemplate}>
						optimal revenue r({n}) = {dpTable[n]}
					</span>
				)}
			</div>

			{/* ── dp table ── */}
			<div className={styles.tableScroll}>
				<ol className={styles.cellRow}>
					{dpTable.map((value, j) => {
						let state = 'idle';
						if (value !== null && value !== undefined) state = 'done';
						if (winning && j === winning.prevIndex) state = 'winning';
						if (j === activeJ) state = 'active';
						return (
							<li
								key={j}
								className={`${styles.cell} ${styles[`cell-${state}`]}`}
							>
								<span className={styles.cellIndex}>j={j}</span>
								<span className={styles.cellValue}>
									{value === null || value === undefined ? '·' : value}
								</span>
							</li>
						);
					})}
				</ol>
			</div>
		</div>
	);
};

export default RodCuttingCanvas;
