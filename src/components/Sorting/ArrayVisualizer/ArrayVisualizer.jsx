import BarView from './BarView';
import BoxView from './BoxView';
import PlaybackControls from '../SortingControls/PlaybackControls';
import styles from './ArrayVisualizer.module.css';

const ArrayVisualizer = ({
  viewMode,
  array,
  isSorting,
  isPaused,
  onPlayPause,
  onStepBack,
  onStepForward,
  ...animationProps
}) => {
  return (
    <div className={styles.visualizerWrapper}>
      <div className={styles.visualizerContainer}>
        <div className={styles.visualizerContent}>
          {viewMode === 'bars' ? (
            <BarView array={array} {...animationProps} />
          ) : (
            <BoxView array={array} {...animationProps} />
          )}
        </div>

        {isSorting && (
          <div className={styles.overlayControls}>
            <PlaybackControls
              onPlayPause={onPlayPause}
              onStepBack={onStepBack}
              onStepForward={onStepForward}
              isSorting={isSorting}
              isPaused={isPaused}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ArrayVisualizer;
