export function getRadixSortStepsWithStats(array) {
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

	const max = Math.max(...arr, 0);

	for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
		const output = new Array(n);
		const count = new Array(10).fill(0);
		const buckets = Array.from({ length: 10 }, () => []);

		for (let i = 0; i < n; i++) {
			const digit = Math.floor(arr[i] / exp) % 10;
			buckets[digit].push(arr[i]);
			count[digit]++;
		}
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: [],
			line: 5,
			stats: createStats(),
			metadata: {
				phase: 'distributing',
				exp,
				buckets: JSON.parse(JSON.stringify(buckets)),
			},
		});

		for (let i = 1; i < 10; i++) count[i] += count[i - 1];
		for (let i = n - 1; i >= 0; i--) {
			const digit = Math.floor(arr[i] / exp) % 10;
			output[count[digit] - 1] = arr[i];
			count[digit]--;
		}
		for (let i = 0; i < n; i++) {
			swaps++;
			arr[i] = output[i];
		}
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: Array.from({ length: n }, (_, k) => k),
			sorted: [],
			line: 6,
			stats: createStats(),
			metadata: { phase: 'collecting', exp, buckets: [] },
		});
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
