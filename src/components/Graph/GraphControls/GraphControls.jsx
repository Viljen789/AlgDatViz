import styles from './GraphControls.module.css';
import ToggleSwitch from '../../../common/ToggleSwitch/ToggleSwitch';

const GraphControls = ({
	isDirected,
	onToggleDirected,
	isWeighted,
	onToggleWeighted,
}) => {
	return (
		<div className={styles.controlsContainer}>
			<div className={styles.controlGroup}>
				<ToggleSwitch
					label="Directed"
					checked={isDirected}
					onChange={onToggleDirected}
				/>
			</div>
			<div className={styles.controlGroup}>
				<ToggleSwitch
					label="Weighted"
					checked={isWeighted}
					onChange={onToggleWeighted}
				/>
			</div>
		</div>
	);
};

export default GraphControls;
