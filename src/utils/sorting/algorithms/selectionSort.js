export function getSelectionSortStepsWithStats(array) {
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
		let minIndex = i;
		steps.push({
			array: [...arr],
			comparing: [i],
			swapping: [],
			sorted: Array.from({ length: i }, (_, k) => k),
			line: 1,
			stats: createStats(),
		});

		for (let j = i + 1; j < n; j++) {
			comparisons++;
			steps.push({
				array: [...arr],
				comparing: [j, minIndex],
				swapping: [],
				sorted: Array.from({ length: i }, (_, k) => k),
				line: 3,
				stats: createStats(),
			});
			if (arr[j] < arr[minIndex]) {
				minIndex = j;
				steps.push({
					array: [...arr],
					comparing: [minIndex],
					swapping: [],
					sorted: Array.from({ length: i }, (_, k) => k),
					line: 4,
					stats: createStats(),
				});
			}
		}

		if (minIndex !== i) {
			swaps++;
			writes += 2;
			[arr[i], arr[minIndex]] = [arr[minIndex], arr[i]];
			steps.push({
				array: [...arr],
				comparing: [],
				swapping: [i, minIndex],
				sorted: Array.from({ length: i }, (_, k) => k),
				line: 5,
				stats: createStats(),
			});
		}
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: Array.from({ length: i + 1 }, (_, k) => k),
			line: 6,
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
