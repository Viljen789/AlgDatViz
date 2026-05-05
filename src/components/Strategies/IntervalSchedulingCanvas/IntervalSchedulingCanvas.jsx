import { useMemo } from 'react';
import styles from './IntervalSchedulingCanvas.module.css';

const IntervalSchedulingCanvas = ({ frame, intervals = [] }) => {
	const ivs = frame?.intervals ?? intervals.map(iv => ({ ...iv, state: 'idle' }));

	const { maxEnd, ticks } = useMemo(() => {
		const max = ivs.reduce((m, iv) => Math.max(m, iv.end), 0);
		const t = [];
		for (let i = 0; i <= max; i++) t.push(i);
		return { maxEnd: max, ticks: t };
	}, [ivs]);

	const chosenCount = ivs.filter(iv => iv.state === 'chosen').length;
	const rejectedCount = ivs.filter(iv => iv.state === 'rejected').length;
	const lastFinish =
		frame?.lastFinish === -Infinity
			? '−∞'
			: typeof frame?.lastFinish === 'number'
				? frame.lastFinish
				: '—';

	return (
		<div className={styles.canvas}>
			<div className={styles.summary}>
				<div className={styles.summaryItem}>
					<span className={styles.summaryLabel}>CHOSEN</span>
					<span className={`${styles.summaryValue} ${styles.summaryValueDone}`}>
						{chosenCount}
					</span>
				</div>
				<div className={styles.summaryDivider} />
				<div className={styles.summaryItem}>
					<span className={styles.summaryLabel}>REJECTED</span>
					<span className={styles.summaryValue}>{rejectedCount}</span>
				</div>
				<div className={styles.summaryDivider} />
				<div className={styles.summaryItem}>
					<span className={styles.summaryLabel}>LAST FINISH</span>
					<span className={styles.summaryValue}>{lastFinish}</span>
				</div>
			</div>

			<div className={styles.timeline}>
				<div className={styles.tickRow}>
					{ticks.map(t => (
						<span
							key={t}
							className={styles.tick}
							style={{ left: `${(t / maxEnd) * 100}%` }}
						>
							<span className={styles.tickLabel}>{t}</span>
						</span>
					))}
				</div>

				<ul className={styles.rows}>
					{ivs.map(iv => {
						const leftPct = (iv.start / maxEnd) * 100;
						const widthPct = ((iv.end - iv.start) / maxEnd) * 100;
						return (
							<li key={iv.id} className={styles.row}>
								<span className={styles.rowLabel}>{iv.id}</span>
								<div className={styles.track}>
									{ticks.map(t => (
										<span
											key={`g-${t}`}
											className={styles.gridLine}
											style={{ left: `${(t / maxEnd) * 100}%` }}
										/>
									))}
									<div
										className={`${styles.bar} ${styles[`bar-${iv.state}`]}`}
										style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
									>
										<span className={styles.barRange}>
											{iv.start}–{iv.end}
										</span>
									</div>
								</div>
							</li>
						);
					})}
				</ul>
			</div>

			{frame?.description && (
				<p className={styles.caption}>{frame.description}</p>
			)}
		</div>
	);
};

export default IntervalSchedulingCanvas;
