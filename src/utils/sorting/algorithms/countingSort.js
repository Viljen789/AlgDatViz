// src/utils/sorting/algorithms/countingSort.js

export function getCountingSortStepsWithStats(array) {
  const arr = [...array];
  const n = arr.length;
  let comparisons = 0; // Counting sort has no direct comparisons
  let swaps = 0; // Represents array writes/placements

  const steps = [];
  const createStats = () => ({ comparisons, swaps, arraySize: n, totalOperations: comparisons + swaps });

  steps.push({ array: [...arr], comparing: [], swapping: [], sorted: [], line: null, stats: createStats() });

  if (n === 0) {
    return { steps, finalStats: createStats() };
  }

  steps.push({ array: [...arr], comparing: Array.from({ length: n }, (_, k) => k), swapping: [], sorted: [], line: 2, stats: createStats() });
  const max = Math.max(...arr);
  const count = new Array(max + 1).fill(0);

  steps.push({ array: [...arr], comparing: [], swapping: [], sorted: [], line: 3, stats: createStats() });
  for (let i = 0; i < n; i++) {
    steps.push({ array: [...arr], comparing: [i], swapping: [], sorted: [], line: 4, stats: createStats() });
    count[arr[i]]++;
    swaps++; // Consider reading into the count array as a form of write/operation
    steps.push({ array: [...arr], comparing: [i], swapping: [], sorted: [], line: 5, stats: createStats() });
  }

  let sortedIndex = 0;
  steps.push({ array: [...arr], comparing: [], swapping: [], sorted: [], line: 6, stats: createStats() });
  for (let i = 0; i <= max; i++) {
    steps.push({ array: [...arr], comparing: [], swapping: [], sorted: Array.from({ length: sortedIndex }, (_, k) => k), line: 7, stats: createStats() });
    while (count[i] > 0) {
      steps.push({ array: [...arr], comparing: [], swapping: [], sorted: Array.from({ length: sortedIndex }, (_, k) => k), line: 8, stats: createStats() });
      
      swaps++; // Placing the element into the sorted array
      arr[sortedIndex] = i;
      steps.push({ array: [...arr], comparing: [], swapping: [sortedIndex], sorted: Array.from({ length: sortedIndex }, (_, k) => k), line: 9, stats: createStats() });

      count[i]--;
      sortedIndex++;
      steps.push({ array: [...arr], comparing: [], swapping: [], sorted: Array.from({ length: sortedIndex }, (_, k) => k), line: 10, stats: createStats() });
    }
  }

  const finalStats = createStats();
  steps.push({ array: [...arr], comparing: [], swapping: [], sorted: Array.from({ length: n }, (_, k) => k), line: null, stats: finalStats });

  return { steps, finalStats };
}
