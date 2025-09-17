// src/utils/sorting/algorithms/mergeSort.js

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

	steps.push({
		array: [...arr],
		stats: createStats(),
		metadata: { phase: 'initializing' },
	});

	function merge(mainArray, start, middle, end, auxArray, level) {
		let k = start,
			i = start,
			j = middle + 1;
		steps.push({
			array: [...auxArray],
			stats: createStats(),
			metadata: {
				phase: 'merging',
				operation: 'merge_prepare',
				target: [start, end],
				left: [start, middle],
				right: [middle + 1, end],
				level,
			},
		});
		while (i <= middle && j <= end) {
			comparisons++;
			steps.push({
				array: [...mainArray],
				comparing: [i, j],
				stats: createStats(),
				metadata: {
					phase: 'merging',
					operation: 'comparing',
					target: [start, end],
					left: [start, middle],
					right: [middle + 1, end],
					level,
					comparingValues: [auxArray[i], auxArray[j]],
				},
			});
			if (auxArray[i] <= auxArray[j]) {
				swaps++;
				mainArray[k] = auxArray[i];
				steps.push({
					array: [...mainArray],
					swapping: [k],
					stats: createStats(),
					metadata: {
						phase: 'merging',
						operation: 'move_from_left',
						target: [start, end],
						left: [start, middle],
						right: [middle + 1, end],
						level,
						movedElement: auxArray[i],
					},
				});
				i++;
				k++;
			} else {
				swaps++;
				mainArray[k] = auxArray[j];
				steps.push({
					array: [...mainArray],
					swapping: [k],
					stats: createStats(),
					metadata: {
						phase: 'merging',
						operation: 'move_from_right',
						target: [start, end],
						left: [start, middle],
						right: [middle + 1, end],
						level,
						movedElement: auxArray[j],
					},
				});
				j++;
				k++;
			}
		}
		while (i <= middle) {
			swaps++;
			mainArray[k] = auxArray[i];
			steps.push({
				array: [...mainArray],
				swapping: [k],
				stats: createStats(),
				metadata: {
					phase: 'merging',
					operation: 'move_remaining_left',
					target: [start, end],
					left: [start, middle],
					right: [middle + 1, end],
					level,
					movedElement: auxArray[i],
				},
			});
			i++;
			k++;
		}
		while (j <= end) {
			swaps++;
			mainArray[k] = auxArray[j];
			steps.push({
				array: [...mainArray],
				swapping: [k],
				stats: createStats(),
				metadata: {
					phase: 'merging',
					operation: 'move_remaining_right',
					target: [start, end],
					left: [start, middle],
					right: [middle + 1, end],
					level,
					movedElement: auxArray[j],
				},
			});
			j++;
			k++;
		}
		steps.push({
			array: [...mainArray],
			stats: createStats(),
			metadata: {
				phase: 'merging',
				operation: 'merge_complete',
				target: [start, end],
				left: [start, middle],
				right: [middle + 1, end],
				level,
			},
		});
	}

	function mergeSortHelper(mainArray, start, end, auxArray, level) {
		if (start >= end) return;
		const middle = Math.floor((start + end) / 2);
		steps.push({
			array: [...auxArray],
			stats: createStats(),
			metadata: {
				phase: 'dividing',
				operation: 'divide',
				range: [start, end],
				left: [start, middle],
				right: [middle + 1, end],
				level,
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
		sorted: Array.from({ length: n }, (_, k) => k),
		stats: finalStats,
		metadata: { phase: 'completed' },
	});
	return { steps, finalStats };
}
