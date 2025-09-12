// src/components/Sorting/SortingDashboard/SortingDashboard.jsx

import styles from './SortingDashboard.module.css';
import {useSortingVisualizer} from '../../../hooks/useSortingVisualizer';

// Import all UI components
import SortingControls from '../SortingControls/SortingControls';
import ArrayVisualizer from '../ArrayVisualizer/ArrayVisualizer';
import PseudoCodeViewer from '../PseudoCodeViewer/PseudoCodeViewer';
import AlgorithmInfoPanel from '../AlgorithmInfoPanel/AlgorithmInfoPanel';

// Import data
import {ALGORITHM_INFO} from '../../../utils/sorting';

const SortingDashboard = () => {
    // Get all state and logic from our custom hook
    const {
        array,
        arraySize,
        setArraySize,
        animationSpeed,
        setAnimationSpeed,
        sortingAlgorithm,
        setSortingAlgorithm,
        viewMode,
        toggleViewMode,
        isSorting,
        isPaused,
        isFastMode,
        operationStats,
        throttledOperationStats,
        isGraphVisible,
        toggleGraphVisibility,
        shuffleArray,
        startSort,
        onPlayPause,
        onStepBack,
        onStepForward,
        currentFrame,
    } = useSortingVisualizer();

    return (
        <div className={styles.dashboardContainer}>
            <SortingControls
                shuffleArray={shuffleArray}
                setArraySize={setArraySize}
                arraySize={arraySize}
                setAnimationSpeed={setAnimationSpeed}
                animationSpeed={animationSpeed}
                setSortingAlgorithm={setSortingAlgorithm}
                sortingAlgorithm={sortingAlgorithm}
                startSort={startSort}
                isSorting={isSorting}
                viewMode={viewMode}
                toggleViewMode={toggleViewMode}
            />

            <div className={styles.mainContentArea}>
                <div className={styles.visualizerWrapper}>
                    <ArrayVisualizer
                        viewMode={viewMode}
                        array={array}
                        isSorting={isSorting}
                        isPaused={isPaused}
                        onPlayPause={onPlayPause}
                        onStepBack={onStepBack}
                        onStepForward={onStepForward}
                        isFastMode={isFastMode}
                        comparingIndices={currentFrame.comparing || []}
                        swappingIndices={currentFrame.swapping || []}
                        sortedIndices={currentFrame.sorted || []}
                    />
                </div>

                <div className={styles.pseudoCodeWrapper}>
                    <PseudoCodeViewer
                        algorithm={sortingAlgorithm}
                        activeLine={currentFrame.line}
                        isFastMode={isFastMode}
                    />
                </div>

                <div className={styles.infoWrapper}>
                    <AlgorithmInfoPanel
                        info={ALGORITHM_INFO[sortingAlgorithm]}
                        operationStats={throttledOperationStats}
                        isGraphVisible={isGraphVisible}
                        onToggleGraph={toggleGraphVisibility}
                        algorithmInfo={ALGORITHM_INFO[sortingAlgorithm]}
                        arraySize={arraySize}
                        isSorting={isSorting}
                    />
                </div>
            </div>
        </div>
    );
};

export default SortingDashboard;
