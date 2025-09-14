import styles from "./SortingControls.module.css";
import HoverDropdown from "../../../common/DropdownControl/HoverDropdown.jsx";
import Button from "../../../common/Button/Button.jsx";

const SortingControls = ({
  shuffleArray,
  setArraySize,
  arraySize,
  setAnimationSpeed,
  animationSpeed,
  setSortingAlgorithm,
  sortingAlgorithm,
  startSort,
  isSorting,
  viewMode,
  toggleViewMode,
}) => {
  const algorithms = [
    { value: "bubbleSort", label: "Bubble Sort" },
    { value: "quickSort", label: "Quick Sort" },
    { value: "mergeSort", label: "Merge Sort" },
    { value: "heapSort", label: "Heap Sort" },
    { value: "insertionSort", label: "Insertion Sort" },
    { value: "selectionSort", label: "Selection Sort" },
    { value: "countingSort", label: "Counting Sort" },
    { value: "radixSort", label: "Radix Sort" },
    { value: "bucketSort", label: "Bucket Sort" },
  ];

  const sizeOptions = [
    { value: 10, label: "10 elements" },
    { value: 20, label: "20 elements" },
    { value: 50, label: "50 elements" },
  ];

  const speedOptions = [
    { value: 25, label: "0.5x" },
    { value: 50, label: "1x" },
    { value: 100, label: "2x" },
    { value: 250, label: "5x" },
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
        />
      </div>

      <Button onClick={shuffleArray} disabled={isSorting}>
        Shuffle Array
      </Button>

      <Button onClick={toggleViewMode}>
        {viewMode === "bars" ? "Show Box View" : " Show Bar View"}
      </Button>
      <Button onClick={startSort} variant="primary">
        {isSorting ? "Stop" : "Start Sorting"}
      </Button>
    </div>
  );
};

export default SortingControls;
