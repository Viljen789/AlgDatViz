import { useMemo } from 'react';
import styles from './LcsCanvas.module.css';

// The LCS canvas: a 2-D dp grid with X down the rows and Y across the columns.
// The active cell pulses; its three source neighbours (↖ diagonal, ↑ up, ← left)
// are tinted, with the chosen one emphasised; a match lights the diagonal. The
// final frame draws the traceback path and the recovered subsequence.

const key = (i, j) => `${i},${j}`;

const LcsCanvas = ({ frame }) => {
	const X = useMemo(() => frame?.X ?? [], [frame]);
	const Y = useMemo(() => frame?.Y ?? [], [frame]);
	const grid = frame?.grid ?? [[0]];
	const active = frame?.active ?? null;
	const match = frame?.match ?? false;
	const chosenSource = frame?.chosenSource ?? null;
	const tracePath = frame?.tracePath ?? null;
	const lcs = frame?.lcs ?? '';

	const m = X.length;
	const n = Y.length;

	// Source cells relative to the active cell.
	const sources = useMemo(() => {
		if (!active) return {};
		const { i, j } = active;
		return {
			[key(i - 1, j - 1)]: 'diag',
			[key(i - 1, j)]: 'up',
			[key(i, j - 1)]: 'left',
		};
	}, [active]);

	const traceSet = useMemo(
		() => new Set((tracePath ?? []).map(c => key(c.i, c.j))),
		[tracePath]
	);
	// Cells on the path where a match was emitted (X==Y) — the LCS characters.
	const traceMatchSet = useMemo(() => {
		const s = new Set();
		for (const c of tracePath ?? []) {
			if (X[c.i - 1] === Y[c.j - 1]) s.add(key(c.i, c.j));
		}
		return s;
	}, [tracePath, X, Y]);

	const cellState = (i, j) => {
		if (active && i === active.i && j === active.j) return match ? 'match' : 'active';
		if (sources[key(i, j)]) {
			const role = sources[key(i, j)];
			if (role === chosenSource) return match ? 'matchsrc' : 'chosen';
			return 'source';
		}
		if (traceMatchSet.has(key(i, j))) return 'tracematch';
		if (traceSet.has(key(i, j))) return 'trace';
		const v = grid[i]?.[j];
		return v !== null && v !== undefined ? 'done' : 'idle';
	};

	return (
		<div className={styles.canvas}>
			{lcs !== '' && (
				<div className={styles.resultStrip}>
					<span className={styles.resultTag}>LCS</span>
					<span className={styles.resultWord}>
						{lcs.split('').map((ch, k) => (
							<span key={k} className={styles.resultChar}>
								{ch}
							</span>
						))}
					</span>
					<span className={styles.resultLen}>length {lcs.length}</span>
				</div>
			)}

			<div className={styles.gridScroll}>
				<div
					className={styles.grid}
					style={{ '--cols': n + 1 }}
					role="img"
					aria-label="LCS dynamic-programming table"
				>
					{/* Header row: corner + ∅ + Y chars */}
					<div className={`${styles.head} ${styles.corner}`} />
					<div className={styles.head}>∅</div>
					{Y.map((ch, j) => (
						<div key={`y${j}`} className={styles.head}>
							{ch}
						</div>
					))}

					{/* Body rows */}
					{grid.map((row, i) => (
						<div key={`r${i}`} className={styles.rowContents}>
							<div className={styles.rowHead}>{i === 0 ? '∅' : X[i - 1]}</div>
							{row.map((value, j) => {
								const state = cellState(i, j);
								return (
									<div
										key={`c${i}-${j}`}
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
					<span className={`${styles.swatch} ${styles.swatchMatch}`} /> match → ↖+1
				</span>
				<span className={styles.legendItem}>
					<span className={`${styles.swatch} ${styles.swatchChosen}`} /> carry max(↑,
					←)
				</span>
				<span className={styles.legendItem}>
					<span className={`${styles.swatch} ${styles.swatchTrace}`} /> traceback
				</span>
			</div>

			<span className={styles.dims}>
				X = {m} chars · Y = {n} chars
			</span>
		</div>
	);
};

export default LcsCanvas;
