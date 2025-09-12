// src/utils/sorting/algorithms/quickSort.js

export function getQuickSortStepsWithStats(array) {
  const arr = [...array];
  const n = arr.length;
  let comparisons = 0;
  let swaps = 0;

  const steps = [];
  const createStats = () => ({ comparisons, swaps, arraySize: n, totalOperations: comparisons + swaps });

  steps.push({ array: [...arr], comparing: [], swapping: [], sorted: [], line: null, stats: createStats() });

  function partition(low, high, sortedIndices) {
    const pivot = arr[high];
    let i = low - 1;
    steps.push({ array: [...arr], comparing: [high], swapping: [], sorted: Array.from(sortedIndices), line: 8, stats: createStats() });

    for (let j = low; j < high; j++) {
      comparisons++;
      steps.push({ array: [...arr], comparing: [j, high], swapping: [], sorted: Array.from(sortedIndices), line: 10, stats: createStats() });

      if (arr[j] < pivot) {
        i++;
        if (i !== j) {
          swaps++;
          [arr[i], arr[j]] = [arr[j], arr[i]];
          steps.push({ array: [...arr], comparing: [], swapping: [i, j], sorted: Array.from(sortedIndices), line: 13, stats: createStats() });
        }
      }
    }

    if (i + 1 !== high) {
      swaps++;
      [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
      steps.push({ array: [...arr], comparing: [], swapping: [i + 1, high], sorted: Array.from(sortedIndices), line: 14, stats: createStats() });
    }
    return i + 1;
  }

  function quickSortRecursive(low, high, sortedIndices = new Set()) {
    if (low < high) {
      const pi = partition(low, high, sortedIndices);
      sortedIndices.add(pi);
      steps.push({ array: [...arr], comparing: [], swapping: [], sorted: Array.from(sortedIndices), line: 3, stats: createStats() });

      quickSortRecursive(low, pi - 1, new Set(sortedIndices));
      quickSortRecursive(pi + 1, high, new Set(sortedIndices));
    } else if (low === high) {
        sortedIndices.add(low);
    }
  }

  quickSortRecursive(0, n - 1);

  const finalStats = createStats();
  steps.push({ array: [...arr], comparing: [], swapping: [], sorted: Array.from({ length: n }, (_, k) => k), line: null, stats: finalStats });

  return { steps, finalStats };
}
