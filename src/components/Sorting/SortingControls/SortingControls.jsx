import styles from './SortingControls.module.css';
import HoverDropdown from '../../../common/HoverDropdown.jsx';

const SortingControls = ({
  generateArray,
  setArraySize,
  arraySize,
  setAnimationSpeed,
  animationSpeed,
  setSortingAlgorithm,
  sortingAlgorithm,
  startSort,
  isSorting,
  viewMode,
  toggleViewMode
}) => {

  const algorithms = [
    {value: "bubbleSort", label: "Bubble Sort"},
    {value: "quickSort", label: "Quick Sort"},
    {value: "mergeSort", label: "Merge Sort"},
    {value: "heapSort", label: "Heap Sort"},
    {value: "insertionSort", label: "Insertion Sort"},
    {value: "selectionSort", label: "Selection Sort"},
    {value: "countingSort", label: "Counting Sort"},
    {value: "radixSort", label: "Radix Sort"},
    {value: "bucketSort", label: "Bucket Sort"}
  ];

  const sizeOptions = [
    {value: 10, label: "10 elements"},
    {value: 20, label: "20 elements"},
    {value: 50, label: "50 elements"},
    {value: 100, label: "100 elements"}
  ];

  const speedOptions = [
    {value: 50, label: "0.5x"},
    {value: 100, label: "1x"},
    {value: 150, label: "1.5x"},
    {value: 200, label: "2x"}
  ];

  return (
    <div className={styles.controlsContainer}>
      <div className={styles.controlGroup}>
        <HoverDropdown
          label="Algorithm"
          options={algorithms}
          value={sortingAlgorithm}
          onChange={setSortingAlgorithm}
          disabled={isSorting}
        />
      </div>

      <div className={styles.controlGroup}>
        <HoverDropdown
          label="Size"
          options={sizeOptions}
          value={arraySize}
          onChange={setArraySize}
          disabled={isSorting}
        />
      </div>

      <div className={styles.controlGroup}>
        <HoverDropdown
          label="Speed"
          options={speedOptions}
          value={animationSpeed}
          onChange={setAnimationSpeed}
          disabled={isSorting}
        />
      </div>

      <div className={styles.controlGroup}>
        <button
          className={styles.controlButton}
          onClick={generateArray}
          disabled={isSorting}
        >
          Generate Array
        </button>
      </div>

      <div className={styles.controlGroup}>
        <button
          className={styles.viewModeButton}
          onClick={toggleViewMode}
          disabled={isSorting}
        >
          {viewMode === 'bars' ? 'Box View' : 'Bar View'}
        </button>
      </div>

      <div className={styles.controlGroup}>
        <button
          className={`${styles.controlButton} ${styles.startButton}`}
          onClick={startSort}
        >
          {isSorting ? 'Stop Sorting' : 'Start Sorting'}
        </button>
      </div>
    </div>
  );
};

export default SortingControls;
