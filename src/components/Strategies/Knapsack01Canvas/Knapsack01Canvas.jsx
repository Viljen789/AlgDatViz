import { useMemo } from 'react';
import styles from './Knapsack01Canvas.module.css';

// The 0/1 knapsack canvas: a dp grid with items down the rows and capacity 0..W
// across the columns. The active cell weighs its two options — skip (the cell
// straight above) and take (the cell above, shifted left by the item's weight,
// plus its value). The final frame traces the choices back and tags the items
// that made the cut.

const key = (i, w) => `${i},${w}`;

const Knapsack01Canvas = ({ frame }) => {
	const items = useMemo(() => frame?.items ?? [], [frame]);
	const W = frame?.capacity ?? 0;
	const grid = frame?.grid ?? [[0]];
	const active = frame?.active ?? null;
	const took = frame?.took ?? false;
	const fits = frame?.fits ?? false;
	const tracePath = frame?.tracePath ?? null;
	const chosen = useMemo(() => new Set(frame?.chosen ?? []), [frame]);

	const n = items.length;

	// Source cells for the active cell: skip = (i−1, w); take = (i−1, w−weight).
	const sources = useMemo(() => {
		if (!active) return {};
		const { i, w } = active;
		const out = { [key(i - 1, w)]: 'skip' };
		if (fits) {
			const it = items[i - 1];
			out[key(i - 1, w - it.weight)] = 'take';
		}
		return out;
	}, [active, fits, items]);

	const traceSet = useMemo(
		() => new Set((tracePath ?? []).map(c => key(c.i, c.w))),
		[tracePath]
	);

	const cellState = (i, w) => {
		if (active && i === active.i && w === active.w)
			return took ? 'take' : 'active';
		const role = sources[key(i, w)];
		if (role === 'take') return 'srctake';
		if (role === 'skip') return 'srcskip';
		if (traceSet.has(key(i, w))) return 'trace';
		const v = grid[i]?.[w];
		return v !== null && v !== undefined ? 'done' : 'idle';
	};

	return (
		<div className={styles.canvas}>
			<div className={styles.gridScroll}>
				<div
					className={styles.grid}
					style={{ '--cols': W + 1 }}
					role="img"
					aria-label="0/1 knapsack dynamic-programming table"
				>
					{/* Header: corner + capacity labels */}
					<div className={`${styles.head} ${styles.corner}`}>item ╲ w</div>
					{Array.from({ length: W + 1 }, (_, w) => (
						<div key={`h${w}`} className={styles.head}>
							{w}
						</div>
					))}

					{/* Rows */}
					{grid.map((row, i) => (
						<div key={`r${i}`} className={styles.rowContents}>
							<div
								className={`${styles.rowHead} ${
									chosen.has(i - 1) ? styles.rowHeadChosen : ''
								}`}
							>
								{i === 0 ? (
									<span className={styles.rowEmpty}>∅</span>
								) : (
									<>
										<span className={styles.rowName}>
											{items[i - 1].name ?? `#${i}`}
											{chosen.has(i - 1) && (
												<span className={styles.check} aria-hidden="true">
													✓
												</span>
											)}
										</span>
										<span className={styles.rowMeta}>
											w{items[i - 1].weight}·v{items[i - 1].value}
										</span>
									</>
								)}
							</div>
							{row.map((value, w) => {
								const state = cellState(i, w);
								return (
									<div
										key={`c${i}-${w}`}
										className={`${styles.cell} ${styles[`cell-${state}`]}`}
									>
										{value}
									</div>
								);
							})}
						</div>
					))}
				</div>
			</div>

			<div className={styles.legendRow} aria-hidden="true">
				<span className={styles.legendItem}>
					<span className={`${styles.swatch} ${styles.swatchTake}`} /> take
					(value + above-left)
				</span>
				<span className={styles.legendItem}>
					<span className={`${styles.swatch} ${styles.swatchSkip}`} /> skip
					(cell above)
				</span>
				<span className={styles.legendItem}>
					<span className={`${styles.swatch} ${styles.swatchTrace}`} />{' '}
					traceback
				</span>
			</div>

			<span className={styles.dims}>
				{n} items · capacity {W}
			</span>
		</div>
	);
};

export default Knapsack01Canvas;
