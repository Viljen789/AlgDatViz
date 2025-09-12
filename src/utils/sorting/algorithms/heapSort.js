// src/utils/sorting/algorithms/heapSort.js

export function getHeapSortStepsWithStats(array) {
  const arr = [...array];
  const n = arr.length;
  let comparisons = 0;
  let swaps = 0;
  let sortedCount = 0;

  const steps = [];
  const createStats = () => ({ comparisons, swaps, arraySize: n, totalOperations: comparisons + swaps });

  steps.push({ array: [...arr], comparing: [], swapping: [], sorted: [], line: null, stats: createStats() });

  function heapify(size, i) {
    let largest = i;
    const left = 2 * i + 1;
    const right = 2 * i + 2;

    if (left < size) {
      comparisons++;
      if (arr[left] > arr[largest]) largest = left;
      steps.push({ array: [...arr], comparing: [left, i], swapping: [], sorted: Array.from({ length: sortedCount }, (_, k) => n - 1 - k), stats: createStats() });
    }
    if (right < size) {
      comparisons++;
      if (arr[right] > arr[largest]) largest = right;
      steps.push({ array: [...arr], comparing: [right, i], swapping: [], sorted: Array.from({ length: sortedCount }, (_, k) => n - 1 - k), stats: createStats() });
    }
    if (largest !== i) {
      swaps++;
      [arr[i], arr[largest]] = [arr[largest], arr[i]];
      steps.push({ array: [...arr], comparing: [], swapping: [i, largest], sorted: Array.from({ length: sortedCount }, (_, k) => n - 1 - k), stats: createStats() });
      heapify(size, largest);
    }
  }

  steps.push({ array: [...arr], comparing: [], swapping: [], sorted: [], line: 1, stats: createStats() });
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    heapify(n, i);
  }

  for (let i = n - 1; i > 0; i--) {
    steps.push({ array: [...arr], comparing: [], swapping: [], sorted: Array.from({ length: sortedCount }, (_, k) => n - 1 - k), line: 2, stats: createStats() });
    swaps++;
    [arr[0], arr[i]] = [arr[i], arr[0]];
    steps.push({ array: [...arr], comparing: [], swapping: [0, i], sorted: Array.from({ length: sortedCount }, (_, k) => n - 1 - k), line: 3, stats: createStats() });

    sortedCount++;
    steps.push({ array: [...arr], comparing: [], swapping: [], sorted: Array.from({ length: sortedCount }, (_, k) => n - 1 - k), line: 4, stats: createStats() });
    heapify(i, 0);
    steps.push({ array: [...arr], comparing: [], swapping: [], sorted: Array.from({ length: sortedCount }, (_, k) => n - 1 - k), line: 5, stats: createStats() });
  }

  const finalStats = createStats();
  steps.push({ array: [...arr], comparing: [], swapping: [], sorted: Array.from({ length: n }, (_, k) => k), line: null, stats: finalStats });

  return { steps, finalStats };
}
