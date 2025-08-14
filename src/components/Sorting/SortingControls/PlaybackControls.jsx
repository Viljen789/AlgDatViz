import styles from './PlaybackControls.module.css'; // Change from .css to .module.css

const PlaybackControls = ({
	                          onPlayPause,
	                          onStepBack,
	                          onStepForward,
	                          isSorting,
	                          isPaused,
                          }) => {
	return (
		<div className={styles.playbackContainer}>
			<button
				className={styles.controlButton}
				onClick={onStepBack}
				disabled={!isSorting || !isPaused}
				title="Step Backward"
			>
				<span className={styles.icon}>|⏴</span>
			</button>

			<button
				className={`${styles.controlButton} ${styles.playPauseButton}`}
				onClick={onPlayPause}
				disabled={!isSorting}
				title={isPaused ? "Play" : "Pause"}
			>
				{isPaused ? (
					<span className={styles.icon}>⏵</span>
				) : (
					<span className={styles.icon}>⏸</span>
				)}
			</button>

			<button
				className={styles.controlButton}
				onClick={onStepForward}
				disabled={!isSorting || !isPaused}
				title="Step Forward"
			>
				<span className={styles.icon}>⏵|</span>
			</button>
		</div>
	);
};

export default PlaybackControls;
