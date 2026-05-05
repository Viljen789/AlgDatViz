import OverlaySheet from '../../../common/OverlaySheet/OverlaySheet';
import { ALGORITHM_INFO } from '../../../utils/sorting';
import {
	ALGORITHM_META,
	ALGORITHM_ORDER,
} from '../../../utils/sorting/algorithmMeta';
import { getProfilesForAlgorithm } from '../../../utils/sorting/dataProfiles';
import styles from './AlgorithmPicker.module.css';

const AlgorithmPicker = ({ isOpen, onClose, value, onChange }) => {
	return (
		<OverlaySheet
			isOpen={isOpen}
			onClose={onClose}
			title="Choose an algorithm"
			subtitle="Each runs the same array. Pick the one you want to study."
			width={760}
		>
			<ul className={styles.list} role="listbox">
				{ALGORITHM_ORDER.map(key => {
					const info = ALGORITHM_INFO[key];
					const meta = ALGORITHM_META[key] || {};
					const showcase = meta.showcase;
					const isActive = key === value;
					const scenarios = getProfilesForAlgorithm(key).slice(0, 4);
					return (
						<li key={key} role="option" aria-selected={isActive}>
							<button
								type="button"
								className={`${styles.row} ${isActive ? styles.rowActive : ''}`}
								onClick={() => onChange(key)}
							>
								<span className={styles.nameBlock}>
									<span className={styles.name}>{info?.name || key}</span>
									{showcase?.tag && (
										<span className={styles.tag}>{showcase.tag}</span>
									)}
								</span>
								<span className={styles.phrase}>
									{showcase?.contrast || meta.motionPhrase}
								</span>
								<span className={styles.scenarioList}>
									{scenarios.map(scenario => (
										<span key={scenario.value}>{scenario.shortLabel}</span>
									))}
								</span>
								<span className={styles.complexity}>{meta.complexity}</span>
							</button>
						</li>
					);
				})}
			</ul>
		</OverlaySheet>
	);
};

export default AlgorithmPicker;
