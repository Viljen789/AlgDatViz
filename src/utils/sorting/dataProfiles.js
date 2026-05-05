const range = size => Array.from({ length: size }, (_, index) => index);

export const DATA_PROFILE_OPTIONS = [
	{
		value: 'random',
		label: 'Random',
		shortLabel: 'random',
		description:
			'A shuffled 1..n permutation. Good default for comparison sorts.',
		algorithms: 'all',
	},
	{
		value: 'nearlySorted',
		label: 'Nearly sorted',
		shortLabel: 'nearly sorted',
		description: 'Only a few neighboring inversions. Shows adaptive behavior.',
		algorithms: [
			'bubbleSort',
			'insertionSort',
			'mergeSort',
			'quickSort',
			'heapSort',
			'selectionSort',
		],
	},
	{
		value: 'reversed',
		label: 'Reversed',
		shortLabel: 'reversed',
		description: 'Worst-case pressure for simple quadratic sorts.',
		algorithms: [
			'bubbleSort',
			'insertionSort',
			'selectionSort',
			'mergeSort',
			'quickSort',
			'heapSort',
		],
	},
	{
		value: 'manyDuplicates',
		label: 'Many duplicates',
		shortLabel: 'duplicates',
		description:
			'Repeated values make stability and equal-key behavior visible.',
		algorithms: 'all',
	},
	{
		value: 'clustered',
		label: 'Clustered',
		shortLabel: 'clustered',
		description: 'Values gather into neighborhoods instead of filling 1..n.',
		algorithms: [
			'bucketSort',
			'countingSort',
			'radixSort',
			'quickSort',
			'mergeSort',
			'heapSort',
		],
	},
	{
		value: 'wideRange',
		label: 'Wide range',
		shortLabel: 'wide range',
		description: 'Few values, many possible slots. Makes k expensive.',
		algorithms: ['countingSort', 'radixSort'],
	},
	{
		value: 'smallRange',
		label: 'Small range',
		shortLabel: 'small range',
		description: 'Duplicates in a compact domain. Counting sort can shine.',
		algorithms: ['countingSort'],
	},
	{
		value: 'balancedBuckets',
		label: 'Balanced buckets',
		shortLabel: 'balanced',
		description: 'Values spread evenly across buckets.',
		algorithms: ['bucketSort'],
	},
	{
		value: 'skewedBuckets',
		label: 'Skewed buckets',
		shortLabel: 'skewed',
		description: 'Most values overload one bucket. Shows the worst-case trap.',
		algorithms: ['bucketSort'],
	},
	{
		value: 'radixPlaces',
		label: 'Digit places',
		shortLabel: 'digit places',
		description:
			'Two and three-digit values make ones, tens, and hundreds passes clear.',
		algorithms: ['radixSort'],
	},
	{
		value: 'badPivot',
		label: 'Bad pivots',
		shortLabel: 'bad pivots',
		description: 'Already ordered data punishes a last-element pivot.',
		algorithms: ['quickSort'],
	},
];

const DEFAULT_PROFILE_BY_ALGORITHM = {
	countingSort: 'smallRange',
	bucketSort: 'balancedBuckets',
	radixSort: 'radixPlaces',
	quickSort: 'random',
	insertionSort: 'nearlySorted',
	bubbleSort: 'random',
	selectionSort: 'random',
	mergeSort: 'random',
	heapSort: 'random',
};

const optionFor = profile =>
	DATA_PROFILE_OPTIONS.find(option => option.value === profile);

export const isProfileSupported = (algorithm, profile) => {
	const option = optionFor(profile);
	if (!option) return false;
	if (option.algorithms === 'all') return true;
	return option.algorithms.includes(algorithm);
};

export const getProfilesForAlgorithm = algorithm =>
	DATA_PROFILE_OPTIONS.filter(option =>
		option.algorithms === 'all' ? true : option.algorithms.includes(algorithm)
	);

export const getDefaultDataProfile = algorithm =>
	DEFAULT_PROFILE_BY_ALGORITHM[algorithm] || 'random';

const shuffleValues = values => {
	const shuffled = [...values];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
};

const nearlySortedValues = size => {
	const values = range(size).map(index => index + 1);
	const swaps = Math.max(1, Math.floor(size / 8));
	for (let i = 0; i < swaps; i++) {
		const index = Math.min(size - 2, 1 + i * 4);
		if (index >= 0 && index + 1 < values.length) {
			[values[index], values[index + 1]] = [values[index + 1], values[index]];
		}
	}
	return values;
};

const duplicateValues = size => {
	const distinctValues = Math.max(3, Math.min(7, Math.ceil(size / 4)));
	return shuffleValues(range(size).map(index => 1 + (index % distinctValues)));
};

const clusteredValues = size => {
	const clusterCount = Math.max(3, Math.min(5, Math.ceil(Math.sqrt(size))));
	const clusterWidth = 4;
	return shuffleValues(
		range(size).map(index => {
			const cluster = index % clusterCount;
			const offset = (index * 3 + cluster) % clusterWidth;
			return cluster * 12 + offset + 1;
		})
	);
};

const smallRangeValues = size => {
	const distinctValues = Math.max(4, Math.min(9, Math.ceil(size / 3)));
	return shuffleValues(range(size).map(index => index % distinctValues));
};

const wideRangeValues = size => {
	const max = Math.max(24, Math.min(160, size * 7 + 19));
	const values = range(size).map(index => {
		if (index === 0) return 0;
		if (index === size - 1) return max;
		return (index * 17 + Math.floor(index / 2) * 11) % max;
	});
	return shuffleValues(values);
};

const balancedBucketValues = size => {
	const bucketCount = Math.max(3, Math.min(6, Math.ceil(Math.sqrt(size))));
	const rangeWidth = 10;
	return shuffleValues(
		range(size).map(index => {
			const bucket = index % bucketCount;
			const offset = (index * 5 + bucket * 2) % rangeWidth;
			return bucket * rangeWidth + offset;
		})
	);
};

const skewedBucketValues = size => {
	const pivot = Math.max(1, Math.floor(size * 0.72));
	const lowCluster = range(pivot).map(index => (index * 3) % 8);
	const outliers = range(size - pivot).map(index => 36 + index * 9);
	return shuffleValues([...lowCluster, ...outliers]);
};

const radixPlaceValues = size => {
	const values = range(size).map(index => {
		const hundreds = index % 3 === 0 ? 1 + (index % 3) : 0;
		const tens = 1 + ((index * 7 + Math.floor(index / 3)) % 9);
		const ones = (index * 3 + Math.floor(index / 2)) % 10;
		return hundreds * 100 + tens * 10 + ones;
	});
	return shuffleValues(values);
};

export const createValuesForProfile = (size, algorithm, profile) => {
	const safeSize = Math.max(0, Number(size) || 0);
	const activeProfile = isProfileSupported(algorithm, profile)
		? profile
		: getDefaultDataProfile(algorithm);

	if (safeSize === 0) return [];

	switch (activeProfile) {
		case 'nearlySorted':
			return nearlySortedValues(safeSize);
		case 'reversed':
			return range(safeSize)
				.map(index => safeSize - index)
				.map(value => value);
		case 'manyDuplicates':
			return duplicateValues(safeSize);
		case 'clustered':
			return clusteredValues(safeSize);
		case 'wideRange':
			return wideRangeValues(safeSize);
		case 'smallRange':
			return smallRangeValues(safeSize);
		case 'balancedBuckets':
			return balancedBucketValues(safeSize);
		case 'skewedBuckets':
			return skewedBucketValues(safeSize);
		case 'radixPlaces':
			return radixPlaceValues(safeSize);
		case 'badPivot':
			return range(safeSize).map(index => index + 1);
		case 'random':
		default:
			return shuffleValues(range(safeSize).map(index => index + 1));
	}
};
