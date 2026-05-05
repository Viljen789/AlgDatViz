import OverlaySheet from '../../../common/OverlaySheet/OverlaySheet';
import {
	STRATEGY_ALGORITHMS,
	STRATEGY_ALGORITHM_ORDER,
	STRATEGY_CATEGORY_ORDER,
} from '../strategiesMeta';
import styles from './StrategiesAlgorithmPicker.module.css';

const StrategiesAlgorithmPicker = ({ isOpen, onClose, value, onChange }) => {
	const grouped = STRATEGY_CATEGORY_ORDER.map(category => ({
		category,
		items: STRATEGY_ALGORITHM_ORDER.filter(
			id => STRATEGY_ALGORITHMS[id]?.category === category
		),
	})).filter(g => g.items.length > 0);

	return (
		<OverlaySheet
			isOpen={isOpen}
			onClose={onClose}
			title="Choose a strategy"
			subtitle="DP remembers every option. Greedy commits to the local best. Sometimes they agree."
			width={760}
		>
			<div className={styles.groups}>
				{grouped.map(group => (
					<section key={group.category} className={styles.group}>
						<h3 className={styles.category}>{group.category}</h3>
						<ul className={styles.list} role="listbox">
							{group.items.map(id => {
								const algo = STRATEGY_ALGORITHMS[id];
								const isActive = id === value;
								return (
									<li key={id} role="option" aria-selected={isActive}>
										<button
											type="button"
											className={`${styles.row} ${isActive ? styles.rowActive : ''}`}
											onClick={() => onChange(id)}
										>
											<span className={styles.name}>{algo.name}</span>
											<span className={styles.phrase}>{algo.motionPhrase}</span>
											<span className={styles.complexity}>
												{algo.complexity}
											</span>
										</button>
									</li>
								);
							})}
						</ul>
					</section>
				))}
			</div>
		</OverlaySheet>
	);
};

export default StrategiesAlgorithmPicker;
