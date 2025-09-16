import { getBubbleSortStepsWithStats } from './algorithms/bubbleSort.js';
import { getSelectionSortStepsWithStats } from './algorithms/selectionSort.js';
import { getInsertionSortStepsWithStats } from './algorithms/insertionSort.js';
import { getQuickSortStepsWithStats } from './algorithms/quickSort.js';
import { getMergeSortStepsWithStats } from './algorithms/mergeSort.js';
import { getHeapSortStepsWithStats } from './algorithms/heapSort.js';
import { getCountingSortStepsWithStats } from './algorithms/countingSort.js';
import { getRadixSortStepsWithStats } from './algorithms/radixSort.js';
import { getBucketSortStepsWithStats } from './algorithms/bucketSort.js';

export const SORTING_FUNCTIONS = {
	bubbleSort: getBubbleSortStepsWithStats,
	selectionSort: getSelectionSortStepsWithStats,
	insertionSort: getInsertionSortStepsWithStats,
	mergeSort: getMergeSortStepsWithStats,
	quickSort: getQuickSortStepsWithStats,
	heapSort: getHeapSortStepsWithStats,
	countingSort: getCountingSortStepsWithStats,
	radixSort: getRadixSortStepsWithStats,
	bucketSort: getBucketSortStepsWithStats,
};
