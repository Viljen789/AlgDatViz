import { useState } from 'react';
import MstPlayground from './MstPlayground.jsx';
import MstCompare from './MstCompare.jsx';
import styles from './MstSandbox.module.css';

// Wraps the MST sandbox with a Single / Compare toggle: run one algorithm with
// full pseudocode + live state, or watch Kruskal and Prim race side-by-side on
// the same graph. Both forward onUserInteract so the topic still completes.
const MstSandbox = ({ onUserInteract }) => {
	const [mode, setMode] = useState('single');
	return (
		<div className={styles.sandbox}>
			<div className={styles.toggle} role="group" aria-label="Sandbox mode">
				<button
					type="button"
					className={`${styles.toggleBtn} ${mode === 'single' ? styles.toggleActive : ''}`}
					aria-pressed={mode === 'single'}
					onClick={() => setMode('single')}
				>
					Single algorithm
				</button>
				<button
					type="button"
					className={`${styles.toggleBtn} ${mode === 'compare' ? styles.toggleActive : ''}`}
					aria-pressed={mode === 'compare'}
					onClick={() => setMode('compare')}
				>
					Compare side by side
				</button>
			</div>
			{mode === 'single' ? (
				<MstPlayground onUserInteract={onUserInteract} />
			) : (
				<MstCompare onUserInteract={onUserInteract} />
			)}
		</div>
	);
};

export default MstSandbox;
