// src/utils/sorting/algorithms/mergeSort.js

export function getMergeSortStepsWithStats(array) {
	const arr = [...array];
	const n = arr.length;
	let comparisons = 0;
	let writes = 0;
	let swaps = 0;
	let auxiliaryWrites = 0;
	const steps = [];
	const completedRanges = new Set();
	const serializeCompletedRanges = () =>
		Array.from(completedRanges).map(key => key.split(':').map(Number));
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
		line: 1,
		stats: createStats(),
		metadata: { phase: 'initializing', completedRanges: [] },
	});

	function merge(mainArray, start, middle, end, auxArray, level) {
		// Copy relevant part to auxArray before merging
		for (let i = start; i <= end; i++) {
			auxArray[i] = mainArray[i];
			auxiliaryWrites++;
		}

		let i = start,
			j = middle + 1,
			k = start;

		steps.push({
			array: [...mainArray],
			comparing: [],
			swapping: [],
			sorted: [],
			line: 6,
			stats: createStats(),
			metadata: {
				phase: 'merging',
				operation: 'merge_prepare',
				target: [start, end],
				left: [start, middle],
				right: [middle + 1, end],
				level,
				leftCursor: i,
				rightCursor: j,
				outputIndex: k,
				outputSnapshot: mainArray.slice(start, end + 1),
				completedRanges: serializeCompletedRanges(),
			},
		});

		while (i <= middle && j <= end) {
			comparisons++;
			steps.push({
				array: [...mainArray],
				comparing: [i, j],
				swapping: [],
				sorted: [],
				line: 10,
				stats: createStats(),
				metadata: {
					phase: 'merging',
					operation: 'comparing',
					target: [start, end],
					left: [start, middle],
					right: [middle + 1, end],
					level,
					leftCursor: i,
					rightCursor: j,
					outputIndex: k,
					outputSnapshot: mainArray.slice(start, end + 1),
					comparingValues: [auxArray[i], auxArray[j]],
					completedRanges: serializeCompletedRanges(),
				},
			});

			if (auxArray[i] <= auxArray[j]) {
				writes++;
				mainArray[k] = auxArray[i];
				steps.push({
					array: [...mainArray],
					comparing: [],
					swapping: [k],
					sorted: [],
					line: 11,
					stats: createStats(),
					metadata: {
						phase: 'merging',
						operation: 'move_from_left',
						target: [start, end],
						left: [start, middle],
						right: [middle + 1, end],
						level,
						leftCursor: i,
						rightCursor: j,
						outputIndex: k,
						outputSnapshot: mainArray.slice(start, end + 1),
						movedElement: auxArray[i],
						movedFrom: 'left',
						completedRanges: serializeCompletedRanges(),
					},
				});
				i++;
			} else {
				writes++;
				mainArray[k] = auxArray[j];
				steps.push({
					array: [...mainArray],
					comparing: [],
					swapping: [k],
					sorted: [],
					line: 11,
					stats: createStats(),
					metadata: {
						phase: 'merging',
						operation: 'move_from_right',
						target: [start, end],
						left: [start, middle],
						right: [middle + 1, end],
						level,
						leftCursor: i,
						rightCursor: j,
						outputIndex: k,
						outputSnapshot: mainArray.slice(start, end + 1),
						movedElement: auxArray[j],
						movedFrom: 'right',
						completedRanges: serializeCompletedRanges(),
					},
				});
				j++;
			}
			k++;
		}

		while (i <= middle) {
			writes++;
			mainArray[k] = auxArray[i];
			steps.push({
				array: [...mainArray],
				comparing: [],
				swapping: [k],
				sorted: [],
				line: 12,
				stats: createStats(),
				metadata: {
					phase: 'merging',
					operation: 'move_remaining_left',
					target: [start, end],
					left: [start, middle],
					right: [middle + 1, end],
					level,
					leftCursor: i,
					rightCursor: j,
					outputIndex: k,
					outputSnapshot: mainArray.slice(start, end + 1),
					movedElement: auxArray[i],
					movedFrom: 'left',
					completedRanges: serializeCompletedRanges(),
				},
			});
			i++;
			k++;
		}

		while (j <= end) {
			writes++;
			mainArray[k] = auxArray[j];
			steps.push({
				array: [...mainArray],
				comparing: [],
				swapping: [k],
				sorted: [],
				line: 12,
				stats: createStats(),
				metadata: {
					phase: 'merging',
					operation: 'move_remaining_right',
					target: [start, end],
					left: [start, middle],
					right: [middle + 1, end],
					level,
					leftCursor: i,
					rightCursor: j,
					outputIndex: k,
					outputSnapshot: mainArray.slice(start, end + 1),
					movedElement: auxArray[j],
					movedFrom: 'right',
					completedRanges: serializeCompletedRanges(),
				},
			});
			j++;
			k++;
		}

		completedRanges.add(`${start}:${end}`);
		steps.push({
			array: [...mainArray],
			comparing: [],
			swapping: [],
			sorted:
				start === 0 && end === n - 1
					? Array.from({ length: n }, (_, k) => k)
					: [],
			line: 6,
			stats: createStats(),
			metadata: {
				phase: 'merging',
				operation: 'merge_complete',
				target: [start, end],
				left: [start, middle],
				right: [middle + 1, end],
				level,
				outputSnapshot: mainArray.slice(start, end + 1),
				completedRanges: serializeCompletedRanges(),
			},
		});
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
				operation: 'divide',
				range: [start, end],
				left: [start, middle],
				right: [middle + 1, end],
				level,
				completedRanges: serializeCompletedRanges(),
			},
		});
		mergeSortHelper(mainArray, start, middle, auxArray, level + 1);
		mergeSortHelper(mainArray, middle + 1, end, auxArray, level + 1);
		merge(mainArray, start, middle, end, auxArray, level);
	}

	const auxiliaryArray = [...arr];
	mergeSortHelper(arr, 0, n - 1, auxiliaryArray, 0);

	const finalStats = createStats();
	steps.push({
		array: [...arr],
		comparing: [],
		swapping: [],
		sorted: Array.from({ length: n }, (_, k) => k),
		line: null,
		stats: finalStats,
		metadata: {
			phase: 'completed',
			completedRanges: serializeCompletedRanges(),
		},
	});
	return { steps, finalStats };
}
