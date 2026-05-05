export function getBubbleSortStepsWithStats(array) {
	const arr = [...array];
	const n = arr.length;
	let comparisons = 0;
	let writes = 0;
	let swaps = 0;
	let auxiliaryWrites = 0;

	const steps = [];
	const createStats = () => ({
		comparisons,
		writes,
		swaps,
		auxiliaryWrites,
		arraySize: n,
		totalOperations: comparisons + writes + auxiliaryWrites,
	});

	steps.push({
		array: [...arr],
		comparing: [],
		swapping: [],
		sorted: [],
		line: null,
		stats: createStats(),
	});

	for (let i = 0; i < n - 1; i++) {
		for (let j = 0; j < n - i - 1; j++) {
			comparisons++;
			steps.push({
				array: [...arr],
				comparing: [j, j + 1],
				swapping: [],
				sorted: Array.from({ length: i }, (_, k) => n - k - 1),
				line: 2,
				stats: createStats(),
			});

			if (arr[j] > arr[j + 1]) {
				swaps++;
				writes += 2;
				[arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
				steps.push({
					array: [...arr],
					comparing: [],
					swapping: [j, j + 1],
					sorted: Array.from({ length: i }, (_, k) => n - k - 1),
					line: 3,
					stats: createStats(),
				});
			}
		}
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: Array.from({ length: i + 1 }, (_, k) => n - k - 1),
			line: 4,
			stats: createStats(),
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
	});

	return { steps, finalStats };
}
