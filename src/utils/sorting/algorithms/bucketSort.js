// src/utils/sorting/algorithms/bucketSort.js

export function getBucketSortStepsWithStats(array) {
  const arr = [...array];
  const n = arr.length;
  let comparisons = 0;
  let swaps = 0; // Represents array writes

  const steps = [];
  const createStats = () => ({ comparisons, swaps, arraySize: n, totalOperations: comparisons + swaps });

  steps.push({ array: [...arr], comparing: [], swapping: [], sorted: [], line: null, stats: createStats() });

  if (n === 0) {
    return { steps, finalStats: createStats() };
  }

  steps.push({ array: [...arr], comparing: [], swapping: [], sorted: [], line: 2, stats: createStats() });
  const bucketCount = Math.floor(Math.sqrt(n)) || 1;
  const buckets = Array.from({ length: bucketCount }, () => []);

  steps.push({ array: [...arr], comparing: Array.from({ length: n }, (_, k) => k), swapping: [], sorted: [], line: 3, stats: createStats() });
  const max = Math.max(...arr, 0);

  for (let i = 0; i < n; i++) {
    steps.push({ array: [...arr], comparing: [i], swapping: [], sorted: [], line: 4, stats: createStats() });
    const bucketIndex = Math.floor(((bucketCount - 1) * arr[i]) / (max || 1));
    steps.push({ array: [...arr], comparing: [i], swapping: [], sorted: [], line: 5, stats: createStats() });
    buckets[bucketIndex].push(arr[i]);
    swaps++; // Placing into a bucket is a write operation
    steps.push({ array: [...arr], comparing: [i], swapping: [], sorted: [], line: 6, stats: createStats() });
  }

  let currentIndex = 0;
  for (let i = 0; i < bucketCount; i++) {
    steps.push({ array: [...arr], comparing: [], swapping: [], sorted: Array.from({ length: currentIndex }, (_, k) => k), line: 7, stats: createStats() });

    // Insertion Sort on each bucket
    const bucket = buckets[i];
    for (let k = 1; k < bucket.length; k++) {
      let key = bucket[k];
      let l = k - 1;
      while (l >= 0) {
        comparisons++;
        if (bucket[l] > key) {
          swaps++;
          bucket[l + 1] = bucket[l];
          l--;
        } else {
          break;
        }
      }
      swaps++;
      bucket[l + 1] = key;
    }
    steps.push({ array: [...arr], comparing: [], swapping: [], sorted: Array.from({ length: currentIndex }, (_, k) => k), line: 8, stats: createStats() });

    for (let j = 0; j < buckets[i].length; j++) {
      swaps++; // Placing back into the main array
      arr[currentIndex] = buckets[i][j];
      steps.push({ array: [...arr], comparing: [], swapping: [currentIndex], sorted: Array.from({ length: currentIndex }, (_, k) => k), line: 9, stats: createStats() });
      currentIndex++;
    }
  }

  const finalStats = createStats();
  steps.push({ array: [...arr], comparing: [], swapping: [], sorted: Array.from({ length: n }, (_, k) => k), line: null, stats: finalStats });

  return { steps, finalStats };
}
