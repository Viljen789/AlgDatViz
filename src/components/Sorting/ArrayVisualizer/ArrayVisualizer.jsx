import BarView from "./BarView";
import BoxView from "./BoxView";
import PlaybackControls from "../SortingControls/PlaybackControls"; // Assuming this is the path
import styles from "./ArrayVisualizer.module.css";

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
    // The Panel component already provides the main container.
    // The root of this component is now the flex container for the content and footer.
    <div className={styles.visualizerLayout}>
      {/* This wrapper ensures the bars/boxes can grow to fill the space */}
      <div className={styles.contentWrapper}>
        {viewMode === "bars" ? (
          <BarView array={array} {...animationProps} />
        ) : (
          <BoxView array={array} {...animationProps} />
        )}
      </div>

      {/* The controls are now in a dedicated footer */}
      {/* The footer is only visible when sorting is active */}
      {isSorting && (
        <div className={styles.footerControls}>
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
  );
};

export default ArrayVisualizer;
