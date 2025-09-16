export function getCountingSortStepsWithStats(array) {
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

	const max = Math.max(...arr);
	const count = new Array(max + 1).fill(0);

	steps.push({
		array: [...arr],
		comparing: [],
		swapping: [],
		sorted: [],
		line: 1,
		stats: createStats(),
		metadata: { phase: 'counting', countArray: [...count], max },
	});

	for (let i = 0; i < n; i++) {
		count[arr[i]]++;
		swaps++;
		steps.push({
			array: [...arr],
			comparing: [i],
			swapping: [],
			sorted: [],
			line: 4,
			stats: createStats(),
			metadata: { phase: 'counting', countArray: [...count], max },
		});
	}

	let sortedIndex = 0;
	for (let i = 0; i <= max; i++) {
		while (count[i] > 0) {
			swaps++;
			arr[sortedIndex] = i;
			count[i]--;
			steps.push({
				array: [...arr],
				comparing: [],
				swapping: [sortedIndex],
				sorted: Array.from({ length: sortedIndex + 1 }, (_, k) => k),
				line: 9,
				stats: createStats(),
				metadata: {
					phase: 'reconstructing',
					countArray: [...count],
					max,
				},
			});
			sortedIndex++;
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
