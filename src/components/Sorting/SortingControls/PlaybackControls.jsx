import styles from './PlaybackControls.module.css';

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
        disabled={!isSorting}
        title="Previous Step"
      >
        <span className={styles.icon}>⏮</span>
      </button>

      <button
        className={`${styles.controlButton} ${styles.playPauseButton}`}
        onClick={onPlayPause}
        disabled={!isSorting}
        title={isPaused ? "Play" : "Pause"}
      >
        <span className={styles.icon}>
          {isPaused ? '▶' : '⏸'}
        </span>
      </button>

      <button
        className={styles.controlButton}
        onClick={onStepForward}
        disabled={!isSorting}
        title="Next Step"
      >
        <span className={styles.icon}>⏭</span>
      </button>
    </div>
  );
};

export default PlaybackControls;
