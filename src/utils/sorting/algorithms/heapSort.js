export function getHeapSortStepsWithStats(array) {
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

	function heapify(size, i) {
		let largest = i;
		const left = 2 * i + 1;
		const right = 2 * i + 2;
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: Array.from({ length: n - size }, (_, k) => n - 1 - k),
			line: 4,
			stats: createStats(),
			metadata: {
				phase: 'heapifying',
				heapArray: [...arr],
				heapSize: size,
				parentIndex: i,
				leftChild: left,
				rightChild: right,
			},
		});
		if (left < size) {
			comparisons++;
			if (arr[left] > arr[largest]) largest = left;
		}
		if (right < size) {
			comparisons++;
			if (arr[right] > arr[largest]) largest = right;
		}
		if (largest !== i) {
			swaps++;
			writes += 2;
			[arr[i], arr[largest]] = [arr[largest], arr[i]];
			steps.push({
				array: [...arr],
				comparing: [i, largest],
				swapping: [i, largest],
				sorted: Array.from({ length: n - size }, (_, k) => n - 1 - k),
				line: 4,
				stats: createStats(),
				metadata: {
					phase: 'heapifying',
					heapArray: [...arr],
					heapSize: size,
					parentIndex: i,
					leftChild: left,
					rightChild: right,
				},
			});
			heapify(size, largest);
		}
	}

	steps.push({
		array: [...arr],
		comparing: [],
		swapping: [],
		sorted: [],
		line: 0,
		stats: createStats(),
		metadata: { phase: 'building', heapArray: [...arr], heapSize: n },
	});
	for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
		heapify(n, i);
	}

	for (let i = n - 1; i > 0; i--) {
		swaps++;
		writes += 2;
		[arr[0], arr[i]] = [arr[i], arr[0]];
		steps.push({
			array: [...arr],
			comparing: [0, i],
			swapping: [0, i],
			sorted: Array.from({ length: n - i }, (_, k) => n - 1 - k),
			line: 2,
			stats: createStats(),
			metadata: {
				phase: 'extracting',
				heapArray: [...arr],
				heapSize: i,
				maxElement: i,
			},
		});
		heapify(i, 0);
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
