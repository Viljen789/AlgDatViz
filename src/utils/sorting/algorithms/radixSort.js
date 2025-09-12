// src/utils/sorting/algorithms/radixSort.js

export function getRadixSortStepsWithStats(array) {
  const arr = [...array];
  const n = arr.length;
  let comparisons = 0; // Represents digit extractions/reads
  let swaps = 0; // Represents array writes

  const steps = [];
  const createStats = () => ({ comparisons, swaps, arraySize: n, totalOperations: comparisons + swaps });

  steps.push({ array: [...arr], comparing: [], swapping: [], sorted: [], line: null, stats: createStats() });

  if (n === 0) {
    return { steps, finalStats: createStats() };
  }

  steps.push({ array: [...arr], comparing: Array.from({ length: n }, (_, k) => k), swapping: [], sorted: [], line: 2, stats: createStats() });
  const max = Math.max(...arr);

  for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
    steps.push({ array: [...arr], comparing: [], swapping: [], sorted: [], line: 4, stats: createStats() });

    const output = new Array(n);
    const count = new Array(10).fill(0);

    steps.push({ array: [...arr], comparing: [], swapping: [], sorted: [], line: 5, stats: createStats() });

    for (let i = 0; i < n; i++) {
      comparisons++; // Count digit extraction as a "comparison" like operation
      const digit = Math.floor(arr[i] / exp) % 10;
      count[digit]++;
    }

    for (let i = 1; i < 10; i++) {
      count[i] += count[i - 1];
    }

    for (let i = n - 1; i >= 0; i--) {
      comparisons++; // Another digit extraction
      const digit = Math.floor(arr[i] / exp) % 10;
      swaps++;
      output[count[digit] - 1] = arr[i];
      count[digit]--;
    }

    for (let i = 0; i < n; i++) {
      swaps++;
      arr[i] = output[i];
    }

    steps.push({ array: [...arr], comparing: [], swapping: Array.from({ length: n }, (_, k) => k), sorted: [], line: 6, stats: createStats() });
    steps.push({ array: [...arr], comparing: [], swapping: [], sorted: [], line: 7, stats: createStats() });
  }

  const finalStats = createStats();
  steps.push({ array: [...arr], comparing: [], swapping: [], sorted: Array.from({ length: n }, (_, k) => k), line: null, stats: finalStats });

  return { steps, finalStats };
}
