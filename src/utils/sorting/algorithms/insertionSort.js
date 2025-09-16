export function getInsertionSortStepsWithStats(array) {
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

	steps.push({
		array: [...arr],
		comparing: [],
		swapping: [],
		sorted: [],
		line: null,
		stats: createStats(),
	});

	for (let i = 1; i < n; i++) {
		const key = arr[i];
		let j = i - 1;
		steps.push({
			array: [...arr],
			comparing: [i],
			swapping: [],
			sorted: Array.from({ length: i }, (_, k) => k),
			line: 2,
			stats: createStats(),
		});

		while (j >= 0) {
			comparisons++;
			steps.push({
				array: [...arr],
				comparing: [j, i],
				swapping: [],
				sorted: Array.from({ length: i }, (_, k) => k),
				line: 4,
				stats: createStats(),
			});
			if (arr[j] > key) {
				swaps++;
				arr[j + 1] = arr[j];
				steps.push({
					array: [...arr],
					comparing: [],
					swapping: [j, j + 1],
					sorted: Array.from({ length: i }, (_, k) => k),
					line: 5,
					stats: createStats(),
				});
				j--;
			} else {
				break;
			}
		}

		swaps++;
		arr[j + 1] = key;
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [j + 1],
			sorted: Array.from({ length: i + 1 }, (_, k) => k),
			line: 7,
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
