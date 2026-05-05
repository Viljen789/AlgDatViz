export function getBucketSortStepsWithStats(array) {
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

	const bucketCount = Math.floor(Math.sqrt(n)) || 1;
	const buckets = Array.from({ length: bucketCount }, () => []);
	const max = Math.max(...arr, 0);
	const bucketRanges = Array.from({ length: bucketCount }, (_, index) => {
		const lower = Math.floor((index * (max + 1)) / bucketCount);
		const upper = Math.max(
			lower,
			Math.floor(((index + 1) * (max + 1)) / bucketCount) - 1
		);
		return { lower, upper };
	});
	const sortedBuckets = new Set();
	const cloneBuckets = () => buckets.map(bucket => [...bucket]);
	const getBucketLoads = () => buckets.map(bucket => bucket.length);
	const bucketIndexFor = value =>
		Math.min(
			bucketCount - 1,
			Math.floor(((value || 0) / (max + 1 || 1)) * bucketCount)
		);
	const createMetadata = extra => {
		const bucketLoads = getBucketLoads();
		const maxBucketLoad = Math.max(...bucketLoads, 0);
		const idealBucketLoad = bucketCount > 0 ? n / bucketCount : n;
		const skewRatio = idealBucketLoad > 0 ? maxBucketLoad / idealBucketLoad : 1;
		return {
			buckets: cloneBuckets(),
			bucketCount,
			bucketRanges,
			bucketLoads,
			maxBucketLoad,
			idealBucketLoad,
			skewRatio,
			distributionQuality:
				skewRatio <= 1.35
					? 'balanced'
					: skewRatio <= 2.2
						? 'uneven'
						: 'overloaded',
			sortedBuckets: Array.from(sortedBuckets),
			...extra,
		};
	};

	steps.push({
		array: [...arr],
		comparing: [],
		swapping: [],
		sorted: [],
		line: 1,
		stats: createStats(),
		metadata: createMetadata({
			phase: 'distributing',
		}),
	});

	for (let i = 0; i < n; i++) {
		const bucketIndex = bucketIndexFor(arr[i]);
		buckets[bucketIndex].push(arr[i]);
		auxiliaryWrites++;
		steps.push({
			array: [...arr],
			comparing: [i],
			swapping: [],
			sorted: [],
			line: 5,
			stats: createStats(),
			metadata: createMetadata({
				phase: 'distributing',
				activeIndex: i,
				activeValue: arr[i],
				targetBucket: bucketIndex,
			}),
		});
	}

	let currentIndex = 0;
	for (let i = 0; i < bucketCount; i++) {
		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: Array.from({ length: currentIndex }, (_, k) => k),
			line: 7,
			stats: createStats(),
			metadata: createMetadata({
				phase: 'sorting',
				currentBucket: i,
			}),
		});

		const bucket = buckets[i];
		for (let k = 1; k < bucket.length; k++) {
			let key = bucket[k];
			let l = k - 1;
			while (l >= 0) {
				comparisons++;
				if (bucket[l] > key) {
					auxiliaryWrites++;
					bucket[l + 1] = bucket[l];
					l--;
				} else break;
			}
			auxiliaryWrites++;
			bucket[l + 1] = key;
		}
		sortedBuckets.add(i);

		steps.push({
			array: [...arr],
			comparing: [],
			swapping: [],
			sorted: Array.from({ length: currentIndex }, (_, k) => k),
			line: 7,
			stats: createStats(),
			metadata: createMetadata({
				phase: 'sorting',
				currentBucket: i,
				bucketSorted: true,
			}),
		});

		for (let j = 0; j < bucket.length; j++) {
			writes++;
			arr[currentIndex] = bucket[j];
			steps.push({
				array: [...arr],
				comparing: [],
				swapping: [currentIndex],
				sorted: Array.from({ length: currentIndex }, (_, k) => k),
				line: 8,
				stats: createStats(),
				metadata: createMetadata({
					phase: 'collecting',
					currentBucket: i,
					activeValue: bucket[j],
				}),
			});
			currentIndex++;
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
		metadata: createMetadata({ phase: 'completed' }),
	});
	return { steps, finalStats };
}
