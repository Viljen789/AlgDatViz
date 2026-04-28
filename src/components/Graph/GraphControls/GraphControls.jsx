import styles from './GraphControls.module.css';
import ToggleSwitch from '../../../common/ToggleSwitch/ToggleSwitch';
import { GRAPH_PRESETS } from '../../../data/graphPresets.js';

const GraphControls = ({
	isDirected,
	onToggleDirected,
	isWeighted,
	onToggleWeighted,
	presetId,
	onPresetChange,
}) => {
	return (
		<div className={styles.controlsContainer}>
			<div className={styles.lessonTitle}>
				<strong>Graph lab</strong>
				<span>Build, edit, and step through algorithms</span>
			</div>
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
			<label className={styles.presetControl}>
				<span>Example</span>
				<select
					value={presetId}
					onChange={event => onPresetChange(event.target.value)}
				>
					{Object.entries(GRAPH_PRESETS).map(([id, preset]) => (
						<option key={id} value={id}>
							{preset.label}
						</option>
					))}
				</select>
			</label>
		</div>
	);
};

export default GraphControls;
