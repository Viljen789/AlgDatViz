import OverlaySheet from '../../../common/OverlaySheet/OverlaySheet';
import { HASH_OPERATIONS } from '../hashMapMeta';
import styles from './HashMapReadMoreOverlay.module.css';

const SHARED_NOTES = {
	put: {
		watchOuts: [
			'Hash collisions append to the chain instead of replacing.',
			'High load factor (≈ 0.75+) is the moment to resize.',
		],
	},
	get: {
		watchOuts: [
			'Worst case scans an entire chain when one bucket is overloaded.',
			'Equality is by key — value type does not affect lookup.',
		],
	},
	delete: {
		watchOuts: [
			'No-op when the key is missing — silent miss.',
			'Iteration order changes after deletion in chained maps.',
		],
	},
	resize: {
		watchOuts: [
			'Resize is O(n) once but lets many subsequent inserts stay O(1).',
			'Every key must rehash because hash % capacity changes.',
		],
	},
};

const HashMapReadMoreOverlay = ({ isOpen, onClose, operationId }) => {
	const op = HASH_OPERATIONS[operationId];
	if (!op) return null;
	const note = SHARED_NOTES[operationId] || { watchOuts: [] };

	return (
		<OverlaySheet
			isOpen={isOpen}
			onClose={onClose}
			title={op.name}
			subtitle={op.oneLine}
			variant="bottom"
		>
			<div className={styles.body}>
				<section className={styles.section}>
					<h3 className={styles.h}>How it thinks</h3>
					<p className={styles.p}>
						A hash map turns the key into a fixed-size integer, then compresses
						that integer with <code>% capacity</code> to pick a bucket. Each
						bucket holds a chain of entries that hashed to the same place.
						Operations only inspect the chosen chain.
					</p>
				</section>

				<section className={styles.complexity}>
					<div className={styles.cBlock}>
						<span className={styles.cLabel}>TIME</span>
						<span className={styles.cVal}>{op.complexity}</span>
					</div>
					<div className={styles.cBlock}>
						<span className={styles.cLabel}>SPACE</span>
						<span className={styles.cVal}>O(n + m)</span>
					</div>
					<div className={styles.cBlock}>
						<span className={styles.cLabel}>LOAD FACTOR</span>
						<span className={styles.cVal}>α = n / m</span>
					</div>
				</section>

				{note.watchOuts.length > 0 && (
					<section className={styles.section}>
						<h3 className={styles.h}>Watch out for</h3>
						<ul className={styles.bullets}>
							{note.watchOuts.map((s, i) => (
								<li key={i}>{s}</li>
							))}
						</ul>
					</section>
				)}
			</div>
		</OverlaySheet>
	);
};

export default HashMapReadMoreOverlay;
