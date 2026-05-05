import OverlaySheet from '../../../common/OverlaySheet/OverlaySheet';
import { ALGORITHM_INFO } from '../../../utils/sorting';
import styles from './ReadMoreOverlay.module.css';

const ReadMoreOverlay = ({ isOpen, onClose, algorithm }) => {
	const info = ALGORITHM_INFO[algorithm];
	if (!info) return null;

	return (
		<OverlaySheet
			isOpen={isOpen}
			onClose={onClose}
			title={info.name}
			subtitle={info.intuition}
			variant="bottom"
		>
			<div className={styles.body}>
				<section className={styles.section}>
					<h3 className={styles.h}>How it thinks</h3>
					<p className={styles.p}>{info.thoughtProcess}</p>
				</section>

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

				<section className={styles.complexity}>
					<div className={styles.cBlock}>
						<span className={styles.cLabel}>BEST</span>
						<span className={styles.cVal}>{info.complexity.time.best}</span>
					</div>
					<div className={styles.cBlock}>
						<span className={styles.cLabel}>AVERAGE</span>
						<span className={styles.cVal}>{info.complexity.time.average}</span>
					</div>
					<div className={styles.cBlock}>
						<span className={styles.cLabel}>WORST</span>
						<span className={styles.cVal}>{info.complexity.time.worst}</span>
					</div>
					<div className={styles.cBlock}>
						<span className={styles.cLabel}>SPACE</span>
						<span className={styles.cVal}>{info.complexity.space.worst}</span>
					</div>
					<div className={styles.cBlock}>
						<span className={styles.cLabel}>STABLE</span>
						<span className={styles.cVal}>
							{info.properties.stable ? 'yes' : 'no'}
						</span>
					</div>
					<div className={styles.cBlock}>
						<span className={styles.cLabel}>IN PLACE</span>
						<span className={styles.cVal}>
							{info.properties.inPlace ? 'yes' : 'no'}
						</span>
					</div>
				</section>

				{info.complexityReason && (
					<section className={styles.section}>
						<h3 className={styles.h}>Why these bounds</h3>
						<ul className={styles.bullets}>
							{info.complexityReason.map((r, i) => (
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
			</div>
		</OverlaySheet>
	);
};

export default ReadMoreOverlay;
