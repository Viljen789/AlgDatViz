export function getCountingSortStepsWithStats(array) {
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
	if (n === 0) return { steps, finalStats: createStats() };

	const max = Math.max(...arr);
	const usedValues = new Set(arr).size;
	const rangeSize = max + 1;
	const createMetadata = extra => ({
		max,
		k: rangeSize,
		rangeSize,
		usedValues,
		unusedSlots: Math.max(rangeSize - usedValues, 0),
		density: rangeSize > 0 ? usedValues / rangeSize : 1,
		...extra,
	});
	const count = new Array(max + 1).fill(0);

	steps.push({
		array: [...arr],
		comparing: [],
		swapping: [],
		sorted: [],
		line: 2,
		stats: createStats(),
		metadata: createMetadata({ phase: 'counting', countArray: [...count] }),
	});

	for (let i = 0; i < n; i++) {
		count[arr[i]]++;
		auxiliaryWrites++;
		steps.push({
			array: [...arr],
			comparing: [i],
			swapping: [],
			sorted: [],
			line: 4,
			stats: createStats(),
			metadata: createMetadata({
				phase: 'counting',
				countArray: [...count],
				activeIndex: i,
				activeValue: arr[i],
				activeSlot: arr[i],
			}),
		});
	}

	let sortedIndex = 0;
	for (let i = 0; i <= max; i++) {
		while (count[i] > 0) {
			writes++;
			arr[sortedIndex] = i;
			auxiliaryWrites++;
			count[i]--;
			steps.push({
				array: [...arr],
				comparing: [],
				swapping: [sortedIndex],
				sorted: Array.from({ length: sortedIndex + 1 }, (_, k) => k),
				line: 8,
				stats: createStats(),
				metadata: createMetadata({
					phase: 'reconstructing',
					countArray: [...count],
					activeValue: i,
					activeSlot: i,
					outputIndex: sortedIndex,
				}),
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
		metadata: createMetadata({ phase: 'completed', countArray: [...count] }),
	});
	return { steps, finalStats };
}
