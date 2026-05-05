export function getRadixSortStepsWithStats(array) {
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

	const max = Math.max(...arr, 0);
	const totalPasses = Math.max(1, String(max).length);
	const placeLabelFor = exp => {
		if (exp === 1) return 'ones';
		if (exp === 10) return 'tens';
		if (exp === 100) return 'hundreds';
		if (exp === 1000) return 'thousands';
		return `${exp}s`;
	};
	const cloneBuckets = buckets => buckets.map(bucket => [...bucket]);
	const createMetadata = (exp, pass, extra = {}) => ({
		exp,
		placeLabel: placeLabelFor(exp),
		pass,
		totalPasses,
		maxDigits: totalPasses,
		...extra,
	});

	for (let exp = 1, pass = 1; Math.floor(max / exp) > 0; exp *= 10, pass++) {
		const output = new Array(n);
		const count = new Array(10).fill(0);
		const buckets = Array.from({ length: 10 }, () => []);

		for (let i = 0; i < n; i++) {
			const digit = Math.floor(arr[i] / exp) % 10;
			buckets[digit].push(arr[i]);
			count[digit]++;
			auxiliaryWrites += 2;
			steps.push({
				array: [...arr],
				comparing: [i],
				swapping: [],
				sorted: [],
				line: 5,
				stats: createStats(),
				metadata: createMetadata(exp, pass, {
					phase: 'distributing',
					buckets: cloneBuckets(buckets),
					countArray: [...count],
					currentIndex: i,
					currentDigit: digit,
					activeValue: arr[i],
				}),
			});
		}

		for (let i = 1; i < 10; i++) {
			count[i] += count[i - 1];
			auxiliaryWrites++;
		}
		for (let i = n - 1; i >= 0; i--) {
			const digit = Math.floor(arr[i] / exp) % 10;
			const destinationIndex = count[digit] - 1;
			output[destinationIndex] = arr[i];
			count[digit]--;
			auxiliaryWrites += 2;
			steps.push({
				array: [...arr],
				comparing: [i],
				swapping: [destinationIndex],
				sorted: [],
				line: 4,
				stats: createStats(),
				metadata: createMetadata(exp, pass, {
					phase: 'collecting',
					buckets: cloneBuckets(buckets),
					countArray: [...count],
					outputArray: [...output],
					currentIndex: i,
					currentDigit: digit,
					activeValue: arr[i],
					destinationIndex,
				}),
			});
		}
		for (let i = 0; i < n; i++) {
			writes++;
			arr[i] = output[i];
			steps.push({
				array: [...arr],
				comparing: [],
				swapping: [i],
				sorted: [],
				line: 4,
				stats: createStats(),
				metadata: createMetadata(exp, pass, {
					phase: 'writing',
					buckets: cloneBuckets(buckets),
					outputArray: [...output],
					destinationIndex: i,
					activeValue: arr[i],
				}),
			});
		}
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: [],
			line: 6,
			stats: createStats(),
			metadata: createMetadata(exp, pass, {
				phase: 'pass-complete',
				buckets: cloneBuckets(buckets),
				outputArray: [...output],
			}),
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
		metadata: createMetadata(1, totalPasses, {
			phase: 'completed',
			buckets: [],
		}),
	});
	return { steps, finalStats };
}
