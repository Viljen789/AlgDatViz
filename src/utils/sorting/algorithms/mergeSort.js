export function getMergeSortStepsWithStats(array) {
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
	const maxLevel = n > 0 ? Math.floor(Math.log2(n)) : 0;

	steps.push({
		array: [...arr],
		comparing: [],
		swapping: [],
		sorted: [],
		line: null,
		stats: createStats(),
		metadata: { phase: 'initializing' },
	});

	function merge(mainArray, start, middle, end, auxArray, level) {
		let k = start,
			i = start,
			j = middle + 1;
		steps.push({
			array: [...mainArray],
			comparing: [],
			swapping: [],
			sorted: [],
			line: 8,
			stats: createStats(),
			metadata: {
				phase: 'merging',
				leftArray: auxArray.slice(start, middle + 1),
				rightArray: auxArray.slice(middle + 1, end + 1),
				mergeIndices: [start, end],
				currentLevel: level,
				maxLevel,
			},
		});

		while (i <= middle && j <= end) {
			comparisons++;
			if (auxArray[i] <= auxArray[j]) {
				swaps++;
				mainArray[k++] = auxArray[i++];
			} else {
				swaps++;
				mainArray[k++] = auxArray[j++];
			}
			steps.push({
				array: [...mainArray],
				comparing: [i - 1, j - 1],
				swapping: [k - 1],
				sorted: [],
				line: 11,
				stats: createStats(),
				metadata: {
					phase: 'merging',
					leftArray: auxArray.slice(start, middle + 1),
					rightArray: auxArray.slice(middle + 1, end + 1),
					mergeIndices: [start, end],
					currentLevel: level,
					maxLevel,
				},
			});
		}
		while (i <= middle) {
			swaps++;
			mainArray[k++] = auxArray[i++];
		}
		while (j <= end) {
			swaps++;
			mainArray[k++] = auxArray[j++];
		}
	}

	function mergeSortHelper(mainArray, start, end, auxArray, level) {
		if (start >= end) return;
		const middle = Math.floor((start + end) / 2);
		steps.push({
			array: [...mainArray],
			comparing: [],
			swapping: [],
			sorted: [],
			line: 3,
			stats: createStats(),
			metadata: {
				phase: 'dividing',
				subarrays: [
					{ elements: mainArray.slice(start, end + 1), level },
				],
				currentLevel: level,
				maxLevel,
			},
		});
		mergeSortHelper(auxArray, start, middle, mainArray, level + 1);
		mergeSortHelper(auxArray, middle + 1, end, mainArray, level + 1);
		merge(mainArray, start, middle, end, auxArray, level);
	}

	mergeSortHelper(arr, 0, n - 1, arr.slice(), 0);
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
