import styles from './ToggleSwitch.module.css';

/**
 * ToggleSwitch — token-wired primitive.
 * States: hover / focus-visible (on the hidden checkbox) / active / disabled.
 */
const ToggleSwitch = ({ label, checked, onChange, disabled = false }) => (
	<label
		className={`${styles.switchLabel} ${disabled ? styles.disabled : ''}`}
	>
		{label && <span>{label}</span>}
		<div className={styles.switchContainer}>
			<input
				type="checkbox"
				checked={checked}
				onChange={onChange}
				disabled={disabled}
				className={styles.hiddenCheckbox}
			/>
			<div className={styles.switchTrack}>
				<div className={styles.switchThumb}></div>
			</div>
		</div>
	</label>
);

export default ToggleSwitch;
