import OverlaySheet from '../../../common/OverlaySheet/OverlaySheet';
import { HASH_OPERATIONS, HASH_OP_ORDER } from '../hashMapMeta';
import styles from './HashMapAlgorithmPicker.module.css';

const HashMapAlgorithmPicker = ({ isOpen, onClose, value, onChange }) => {
	return (
		<OverlaySheet
			isOpen={isOpen}
			onClose={onClose}
			title="Hash map operations"
			subtitle="Each step you take is the same recipe: hash, then chase the chain."
			width={680}
		>
			<ul className={styles.list} role="listbox">
				{HASH_OP_ORDER.map(id => {
					const op = HASH_OPERATIONS[id];
					const isActive = id === value;
					return (
						<li key={id} role="option" aria-selected={isActive}>
							<button
								type="button"
								className={`${styles.row} ${isActive ? styles.rowActive : ''}`}
								onClick={() => onChange(id)}
							>
								<span className={styles.name}>{op.name}</span>
								<span className={styles.phrase}>{op.motionPhrase}</span>
								<span className={styles.complexity}>{op.complexity}</span>
							</button>
						</li>
					);
				})}
			</ul>
		</OverlaySheet>
	);
};

export default HashMapAlgorithmPicker;
