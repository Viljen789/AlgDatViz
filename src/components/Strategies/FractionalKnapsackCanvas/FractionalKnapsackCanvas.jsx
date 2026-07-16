import { useMemo } from 'react';
import styles from './FractionalKnapsackCanvas.module.css';

// The fractional knapsack canvas: items ranked by density (value/weight) as a row
// of cards — each fills as it is taken whole, partially for the split item, and
// greys out once the bag is full — plus a capacity bar that accumulates the taken
// weight left-to-right, with the fractional sliver hatched.

const FractionalKnapsackCanvas = ({ frame }) => {
	const items = useMemo(() => frame?.items ?? [], [frame]);
	const W = frame?.capacity ?? 0;
	const remaining = frame?.remaining ?? W;
	const total = frame?.total ?? 0;
	const activeIndex = frame?.activeIndex ?? null;

	// Capacity-bar segments: one per item that contributes weight, in ratio order.
	const segments = useMemo(() => {
		const out = [];
		for (const it of items) {
			if (it.status === 'taken') {
				out.push({ name: it.name, weight: it.weight, kind: 'whole' });
			} else if (it.status === 'fraction') {
				out.push({
					name: it.name,
					weight: it.weight * it.fraction,
					kind: 'fraction',
				});
			}
		}
		return out;
	}, [items]);

	const usedWeight = W - remaining;

	return (
		<div className={styles.canvas}>
			{/* ── Ranked item cards ── */}
			<div className={styles.rank}>
				<span className={styles.rankTag}>BY DENSITY (value / weight)</span>
				<div className={styles.cards}>
					{items.map((it, idx) => (
						<div
							key={it.name}
							className={`${styles.card} ${styles[`card-${it.status}`]} ${
								idx === activeIndex ? styles.cardActive : ''
							}`}
						>
							<div className={styles.cardHead}>
								<span className={styles.cardName}>{it.name}</span>
								<span className={styles.cardRatio}>{it.ratio}</span>
							</div>
							<div className={styles.cardFillTrack}>
								<div
									className={styles.cardFill}
									style={{
										height: `${Math.round((it.fraction || 0) * 100)}%`,
									}}
								/>
							</div>
							<div className={styles.cardMeta}>
								w{it.weight}·v{it.value}
							</div>
							{it.status === 'fraction' && (
								<div className={styles.cardFraction}>
									{Math.round(it.fraction * 100)}%
								</div>
							)}
						</div>
					))}
				</div>
			</div>

			{/* ── Capacity bar ── */}
			<div className={styles.bagWrap}>
				<div className={styles.bagHead}>
					<span className={styles.bagTag}>KNAPSACK</span>
					<span className={styles.bagMeta}>
						{Math.round(usedWeight * 100) / 100} / {W} full · value {total}
					</span>
				</div>
				<div className={styles.bag}>
					{segments.map((s, i) => (
						<div
							key={`${s.name}-${i}`}
							className={`${styles.seg} ${
								s.kind === 'fraction' ? styles.segFraction : styles.segWhole
							}`}
							style={{ width: `${(s.weight / W) * 100}%` }}
						>
							<span className={styles.segLabel}>{s.name}</span>
						</div>
					))}
					{remaining > 0 && (
						<div
							className={styles.segEmpty}
							style={{ width: `${(remaining / W) * 100}%` }}
						>
							<span className={styles.segEmptyLabel}>{remaining} free</span>
						</div>
					)}
				</div>
			</div>

			<div className={styles.legendRow} aria-hidden="true">
				<span className={styles.legendItem}>
					<span className={`${styles.swatch} ${styles.swatchWhole}`} /> taken
					whole
				</span>
				<span className={styles.legendItem}>
					<span className={`${styles.swatch} ${styles.swatchFraction}`} />{' '}
					fraction
				</span>
				<span className={styles.legendItem}>
					<span className={`${styles.swatch} ${styles.swatchSkip}`} /> skipped
					(bag full)
				</span>
			</div>
		</div>
	);
};

export default FractionalKnapsackCanvas;
