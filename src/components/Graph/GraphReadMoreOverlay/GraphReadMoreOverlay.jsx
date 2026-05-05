import OverlaySheet from '../../../common/OverlaySheet/OverlaySheet';
import { GRAPH_ALGORITHMS } from '../../../utils/graphAlgorithms.js';
import styles from './GraphReadMoreOverlay.module.css';

const GraphReadMoreOverlay = ({ isOpen, onClose, algorithmId }) => {
	const info = GRAPH_ALGORITHMS[algorithmId];
	if (!info) return null;

	return (
		<OverlaySheet
			isOpen={isOpen}
			onClose={onClose}
			title={info.fullName}
			subtitle={info.intuition}
			variant="bottom"
		>
			<div className={styles.body}>
				{info.strategy && (
					<section className={styles.section}>
						<h3 className={styles.h}>Strategy</h3>
						<ol className={styles.steps}>
							{info.strategy.map((s, i) => (
								<li key={i}>{s}</li>
							))}
						</ol>
					</section>
				)}

				{info.complexity && (
					<section className={styles.complexity}>
						{info.complexity.time?.average && (
							<div className={styles.cBlock}>
								<span className={styles.cLabel}>AVERAGE</span>
								<span className={styles.cVal}>
									{info.complexity.time.average}
								</span>
							</div>
						)}
						{info.complexity.time?.worst && (
							<div className={styles.cBlock}>
								<span className={styles.cLabel}>WORST</span>
								<span className={styles.cVal}>
									{info.complexity.time.worst}
								</span>
							</div>
						)}
						{info.complexity.space?.worst && (
							<div className={styles.cBlock}>
								<span className={styles.cLabel}>SPACE</span>
								<span className={styles.cVal}>
									{info.complexity.space.worst}
								</span>
							</div>
						)}
					</section>
				)}

				{info.complexity?.why && (
					<section className={styles.section}>
						<h3 className={styles.h}>Why these bounds</h3>
						<ul className={styles.bullets}>
							{info.complexity.why.map((r, i) => (
								<li key={i}>{r}</li>
							))}
						</ul>
					</section>
				)}

				{info.tradeoffs && (
					<section className={styles.tradeoffs}>
						<div>
							<h3 className={styles.h}>Reach for it when</h3>
							<ul className={styles.bullets}>
								{info.tradeoffs.useWhen.map((r, i) => (
									<li key={i}>{r}</li>
								))}
							</ul>
						</div>
						<div>
							<h3 className={styles.h}>Watch out for</h3>
							<ul className={styles.bullets}>
								{info.tradeoffs.watchOut.map((r, i) => (
									<li key={i}>{r}</li>
								))}
							</ul>
						</div>
					</section>
				)}

				{info.compareCards && info.compareCards.length > 0 && (
					<section className={styles.section}>
						<h3 className={styles.h}>Compared to</h3>
						<div className={styles.compares}>
							{info.compareCards.map((c, i) => (
								<div key={i} className={styles.compareCard}>
									<span className={styles.compareLabel}>{c.label}</span>
									<span className={styles.compareTitle}>{c.title}</span>
									<p className={styles.compareText}>{c.text}</p>
								</div>
							))}
						</div>
					</section>
				)}
			</div>
		</OverlaySheet>
	);
};

export default GraphReadMoreOverlay;
