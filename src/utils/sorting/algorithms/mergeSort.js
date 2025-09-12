// src/utils/sorting/algorithms/mergeSort.js

export function getMergeSortStepsWithStats(array) {
  const arr = [...array];
  const n = arr.length;
  let comparisons = 0;
  let swaps = 0; // Represents array writes

  const steps = [];
  const createStats = () => ({ comparisons, swaps, arraySize: n, totalOperations: comparisons + swaps });

  steps.push({ array: [...arr], comparing: [], swapping: [], sorted: [], line: null, stats: createStats() });

  function merge(mainArray, start, middle, end, auxArray) {
    let k = start, i = start, j = middle + 1;
    steps.push({ array: [...mainArray], comparing: Array.from({ length: end - start + 1 }, (_, x) => start + x), swapping: [], sorted: [], line: 10, stats: createStats() });

    while (i <= middle && j <= end) {
      comparisons++;
      steps.push({ array: [...mainArray], comparing: [i, j], swapping: [], sorted: [], line: 12, stats: createStats() });
      if (auxArray[i] <= auxArray[j]) {
        swaps++;
        mainArray[k++] = auxArray[i++];
      } else {
        swaps++;
        mainArray[k++] = auxArray[j++];
      }
      steps.push({ array: [...mainArray], comparing: [], swapping: [k - 1], sorted: [], line: 13, stats: createStats() });
    }

    while (i <= middle) {
      swaps++;
      mainArray[k++] = auxArray[i++];
      steps.push({ array: [...mainArray], comparing: [i - 1], swapping: [k - 1], sorted: [], line: 14, stats: createStats() });
    }

    while (j <= end) {
      swaps++;
      mainArray[k++] = auxArray[j++];
      steps.push({ array: [...mainArray], comparing: [j - 1], swapping: [k - 1], sorted: [], line: 14, stats: createStats() });
    }
  }

  function mergeSortHelper(mainArray, start, end, auxArray) {
    if (start >= end) return;
    const middle = Math.floor((start + end) / 2);
    steps.push({ array: [...mainArray], comparing: [], swapping: [], sorted: [], line: 4, stats: createStats() });
    mergeSortHelper(auxArray, start, middle, mainArray);
    mergeSortHelper(auxArray, middle + 1, end, mainArray);
    merge(mainArray, start, middle, end, auxArray);
  }

  mergeSortHelper(arr, 0, n - 1, arr.slice());

  const finalStats = createStats();
  steps.push({ array: [...arr], comparing: [], swapping: [], sorted: Array.from({ length: n }, (_, k) => k), line: null, stats: finalStats });

  return { steps, finalStats };
}
