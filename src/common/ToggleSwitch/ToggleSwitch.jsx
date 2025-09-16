import styles from './ToggleSwitch.module.css';

const ToggleSwitch = ({ label, checked, onChange }) => (
	<label className={styles.switchLabel}>
		<span>{label}</span>
		<div className={styles.switchContainer}>
			<input
				type="checkbox"
				checked={checked}
				onChange={onChange}
				className={styles.hiddenCheckbox}
			/>
			<div className={styles.switchTrack}>
				<div className={styles.switchThumb}></div>
			</div>
		</div>
	</label>
);
export default ToggleSwitch;
