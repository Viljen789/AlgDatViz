import OverlaySheet from '../../../common/OverlaySheet/OverlaySheet';
import { GRAPH_ALGORITHMS } from '../../../utils/graphAlgorithms.js';
import {
	GRAPH_ALGORITHM_META,
	GRAPH_ALGORITHM_ORDER,
	GRAPH_CATEGORY_ORDER,
} from '../../../utils/graphAlgorithmMeta.js';
import styles from './GraphAlgorithmPicker.module.css';

const GraphAlgorithmPicker = ({ isOpen, onClose, value, onChange }) => {
	const grouped = GRAPH_CATEGORY_ORDER.map(category => ({
		category,
		items: GRAPH_ALGORITHM_ORDER.filter(
			id => GRAPH_ALGORITHM_META[id]?.category === category
		),
	})).filter(group => group.items.length > 0);

	return (
		<OverlaySheet
			isOpen={isOpen}
			onClose={onClose}
			title="Choose a graph algorithm"
			subtitle="Each algorithm runs on the current graph. Pick by what you're studying."
			width={760}
		>
			<div className={styles.groups}>
				{grouped.map(group => (
					<section key={group.category} className={styles.group}>
						<h3 className={styles.category}>{group.category}</h3>
						<ul className={styles.list} role="listbox">
							{group.items.map(id => {
								const info = GRAPH_ALGORITHMS[id];
								const meta = GRAPH_ALGORITHM_META[id] || {};
								const isActive = id === value;
								return (
									<li key={id} role="option" aria-selected={isActive}>
										<button
											type="button"
											className={`${styles.row} ${isActive ? styles.rowActive : ''}`}
											onClick={() => onChange(id)}
										>
											<span className={styles.name}>{info?.fullName || id}</span>
											<span className={styles.phrase}>{meta.motionPhrase}</span>
											<span className={styles.complexity}>{meta.complexity}</span>
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

export default GraphAlgorithmPicker;
