export const ALGORITHM_META = {
	bubbleSort: {
		oneLine: 'Compare each pair of neighbors, swap if out of order, repeat.',
		motionPhrase: 'adjacent swap, slow rise',
		complexity: 'O(n²)',
		complexityBest: 'O(n)',
		showcase: {
			tag: 'Local repair',
			signature:
				'It fixes one neighboring inversion at a time, so large values drift right through repeated swaps.',
			contrast:
				'Unlike selection sort, it can stop early on nearly sorted input, but it writes much more often.',
			watch: ['neighbor pair', 'swap ripple', 'sorted suffix'],
		},
	},
	selectionSort: {
		oneLine: 'Find the minimum in the unsorted suffix, swap it into place.',
		motionPhrase: 'scanner sweep, single place',
		complexity: 'O(n²)',
		complexityBest: 'O(n²)',
		showcase: {
			tag: 'Minimum hunt',
			signature:
				'It commits to one output position, scans everything left, then performs one placement.',
			contrast:
				'Unlike bubble sort, it minimizes writes, but it never benefits from already sorted input.',
			watch: ['current minimum', 'unsorted suffix', 'one final swap'],
		},
	},
	insertionSort: {
		oneLine: 'Take the next value and slide it left until it fits.',
		motionPhrase: 'lift one, slide it home',
		complexity: 'O(n²)',
		complexityBest: 'O(n)',
		showcase: {
			tag: 'Growing hand',
			signature:
				'It keeps a sorted prefix and slides the next value into the exact gap where it belongs.',
			contrast:
				'Unlike selection sort, it adapts beautifully to nearly sorted data and keeps equal values stable.',
			watch: ['sorted prefix', 'lifted key', 'right shifts'],
		},
	},
	mergeSort: {
		oneLine:
			'Split the array recursively until each piece is one element, then merge pairs back together in order.',
		motionPhrase: 'split deep, merge back up',
		complexity: 'O(n log n)',
		complexityBest: 'O(n log n)',
		showcase: {
			tag: 'Divide and combine',
			signature:
				'It makes sorting easy by splitting until every piece is sorted, then merging sorted pieces.',
			contrast:
				'Unlike quick sort, its work is predictable, but it pays with extra merge storage.',
			watch: ['recursive split', 'left vs right', 'merge upward'],
		},
	},
	quickSort: {
		oneLine:
			'Pick a pivot, partition smaller left and larger right, recurse on each side.',
		motionPhrase: 'pivot orbit, partition split',
		complexity: 'O(n log n)',
		complexityBest: 'O(n log n)',
		complexityWorst: 'O(n²)',
		showcase: {
			tag: 'Pivot partition',
			signature:
				'It chooses a pivot, pushes smaller values left and larger values right, then recurses.',
			contrast:
				'Unlike merge sort, it usually sorts in place, but bad pivots can collapse it to quadratic time.',
			watch: ['pivot', 'partition boundary', 'recursive sides'],
		},
	},
	heapSort: {
		oneLine:
			'Reorganize as a max-heap, then repeatedly extract the root and re-heapify.',
		motionPhrase: 'tree restructure, root extract',
		complexity: 'O(n log n)',
		complexityBest: 'O(n log n)',
		showcase: {
			tag: 'Priority structure',
			signature:
				'It first builds a max-heap, then repeatedly removes the root into the sorted tail.',
			contrast:
				'Unlike quick sort, it guarantees O(n log n) time with constant extra space, but it is not stable.',
			watch: ['heap root', 'child comparison', 'sorted tail'],
		},
	},
	countingSort: {
		oneLine:
			'Count how many of each value exist, then play the counts back in order.',
		motionPhrase: 'rise into bins, flatten back',
		complexity: 'O(n + k)',
		complexityBest: 'O(n + k)',
		showcase: {
			tag: 'Frequency table',
			signature:
				'It stops comparing values and uses each value as an address in a count table.',
			sample:
				'Generated with repeated values in a small range so the count table has visible frequencies.',
			contrast:
				'Unlike comparison sorts, it can be linear, but only when the value range is small.',
			watch: ['value as index', 'frequency bar', 'replay counts'],
		},
	},
	radixSort: {
		oneLine:
			'Sort stably by each digit position, least significant to most significant.',
		motionPhrase: 'digit by digit, regroup',
		complexity: 'O(d · (n + k))',
		complexityBest: 'O(d · (n + k))',
		showcase: {
			tag: 'Digit passes',
			signature:
				'It sorts by one digit at a time, relying on stability so earlier digit order is preserved.',
			sample:
				'Generated as two-digit values so the ones and tens passes are both visible.',
			contrast:
				'Unlike counting sort, it handles wider numbers by repeating a small stable counting step.',
			watch: ['active digit', 'stable bucket', 'next place'],
		},
	},
	bucketSort: {
		oneLine:
			'Distribute values into buckets by range, sort each bucket, then concatenate.',
		motionPhrase: 'fly to buckets, gather sorted',
		complexity: 'O(n + k)',
		complexityBest: 'O(n + k)',
		complexityWorst: 'O(n²)',
		showcase: {
			tag: 'Range distribution',
			signature:
				'It sends values into range buckets first, sorts each small bucket, then joins the buckets.',
			sample:
				'Generated across clustered ranges so values visibly spread into multiple buckets.',
			contrast:
				'Unlike counting sort, buckets hold ranges instead of exact values, so distribution quality matters.',
			watch: ['range bucket', 'local sort', 'concatenate'],
		},
	},
};

export const ALGORITHM_ORDER = [
	'bubbleSort',
	'selectionSort',
	'insertionSort',
	'mergeSort',
	'quickSort',
	'heapSort',
	'countingSort',
	'radixSort',
	'bucketSort',
];

export const SIZE_OPTIONS = [
	{ value: 10, label: '10' },
	{ value: 20, label: '20' },
	{ value: 50, label: '50' },
	{ value: 100, label: '100' },
];

export const SPEED_OPTIONS = [
	{ value: 25, label: 'Study 0.5×' },
	{ value: 50, label: 'Lesson 1×' },
	{ value: 100, label: 'Flow 2×' },
	{ value: 250, label: 'Review 5×' },
	{ value: 500, label: 'Scan 10×' },
];
