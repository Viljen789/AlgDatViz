export function getBucketSortStepsWithStats(array) {
	const arr = [...array];
	const n = arr.length;
	let comparisons = 0;
	let swaps = 0;
	const steps = [];
	const createStats = () => ({
		comparisons,
		swaps,
		arraySize: n,
		totalOperations: comparisons + swaps,
	});
	if (n === 0) return { steps, finalStats: createStats() };

	const bucketCount = Math.floor(Math.sqrt(n)) || 1;
	const buckets = Array.from({ length: bucketCount }, () => []);
	const max = Math.max(...arr, 0);

	steps.push({
		array: [...arr],
		comparing: [],
		swapping: [],
		sorted: [],
		line: 1,
		stats: createStats(),
		metadata: {
			phase: 'distributing',
			buckets: JSON.parse(JSON.stringify(buckets)),
			bucketCount,
		},
	});

	for (let i = 0; i < n; i++) {
		const bucketIndex = Math.floor(
			((bucketCount - 1) * arr[i]) / (max || 1)
		);
		buckets[bucketIndex].push(arr[i]);
		swaps++;
		steps.push({
			array: [...arr],
			comparing: [i],
			swapping: [],
			sorted: [],
			line: 5,
			stats: createStats(),
			metadata: {
				phase: 'distributing',
				buckets: JSON.parse(JSON.stringify(buckets)),
				bucketCount,
			},
		});
	}

	let currentIndex = 0;
	for (let i = 0; i < bucketCount; i++) {
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: Array.from({ length: currentIndex }, (_, k) => k),
			line: 7,
			stats: createStats(),
			metadata: {
				phase: 'sorting',
				buckets: JSON.parse(JSON.stringify(buckets)),
				bucketCount,
				currentBucket: i,
			},
		});

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
				} else break;
			}
			swaps++;
			bucket[l + 1] = key;
		}

		for (let j = 0; j < bucket.length; j++) {
			swaps++;
			arr[currentIndex] = bucket[j];
			steps.push({
				array: [...arr],
				comparing: [],
				swapping: [currentIndex],
				sorted: Array.from({ length: currentIndex }, (_, k) => k),
				line: 9,
				stats: createStats(),
				metadata: {
					phase: 'collecting',
					buckets: JSON.parse(JSON.stringify(buckets)),
					bucketCount,
					currentBucket: i,
				},
			});
			currentIndex++;
		}
	}

	const finalStats = createStats();
	steps.push({
		array: [...arr],
		comparing: [],
		swapping: [],
		sorted: Array.from({ length: n }, (_, k) => k),
		line: null,
		stats: finalStats,
		metadata: { phase: 'completed' },
	});
	return { steps, finalStats };
}
