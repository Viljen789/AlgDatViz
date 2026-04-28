import LearningPanel from '../../../../../common/LearningPanel/LearningPanel.jsx';
import { PSEUDO_CODE } from '../../../../../utils/sorting/algorithmInfo.js';

const PHASE_LABELS = {
	initializing: 'Setting up',
	dividing: 'Splitting the problem',
	merging: 'Merging sorted pieces',
	copying: 'Writing merged values',
	counting: 'Counting frequencies',
	reconstructing: 'Rebuilding from counts',
	building: 'Building the heap',
	heapifying: 'Restoring heap order',
	extracting: 'Moving the maximum out',
	distributing: 'Distributing values',
	sorting: 'Sorting a bucket',
	collecting: 'Collecting results',
	completed: 'Sorted',
};

const SORTING_LEGEND = [
	{ label: 'Compare or inspect', color: 'rgba(79, 124, 248, 0.35)', borderColor: '#ffc107' },
	{ label: 'Swap, move, or write', color: 'rgba(248, 167, 79, 0.32)', borderColor: 'var(--color-accent-orange)' },
	{ label: 'Known sorted', color: 'var(--color-accent-green)' },
];

const ADAPTIVE_ALGORITHMS = new Set(['bubbleSort', 'insertionSort']);

const CONCEPT_CHECKS = {
	bubbleSort: [
		{
			question: 'Why can Bubble Sort be O(n) on sorted input?',
			answer:
				'With the early-exit flag, one full pass with no swaps proves every adjacent pair is already ordered.',
		},
	],
	selectionSort: [
		{
			question: 'Why is Selection Sort still O(n^2) when already sorted?',
			answer:
				'It cannot know the minimum without scanning the entire unsorted suffix for every position.',
		},
	],
	insertionSort: [
		{
			question: 'Why does nearly sorted input help Insertion Sort?',
			answer:
				'Each key only moves across the few earlier values that are out of order, so shifts stay small.',
		},
	],
	mergeSort: [
		{
			question: 'Why does Merge Sort stay O(n log n) in every case?',
			answer:
				'It always splits into log n levels and each merge level touches all n values.',
		},
	],
	quickSort: [
		{
			question: 'What makes Quick Sort degrade to O(n^2)?',
			answer:
				'Repeatedly choosing an extreme pivot leaves one side almost as large as the original array.',
		},
	],
	heapSort: [
		{
			question: 'Why is Heap Sort O(1) extra space?',
			answer:
				'The heap is stored directly inside the array, and only a few temporary values are needed for swaps.',
		},
	],
	countingSort: [
		{
			question: 'What does k mean in O(n + k)?',
			answer:
				'k is the number of possible values in the count table, not the number of input items.',
		},
	],
	radixSort: [
		{
			question: 'Why must the digit sort be stable?',
			answer:
				'Stability preserves the ordering created by earlier digit passes while later digits are processed.',
		},
	],
	bucketSort: [
		{
			question: 'When does Bucket Sort lose its advantage?',
			answer:
				'If many values land in the same bucket, sorting that bucket becomes the dominant cost.',
		},
	],
};

const getTraceSummary = (currentFrame, arraySize) => {
	if (!currentFrame) {
		return {
			title: 'Ready to trace',
			text: 'Start the sort to connect highlights with pseudocode, operation counts, and complexity.',
		};
	}

	const phase = currentFrame.metadata?.phase;
	const comparing = currentFrame.comparing?.length || 0;
	const writing = currentFrame.swapping?.length || 0;
	const sorted = currentFrame.sorted?.length || 0;
	const line = currentFrame.metadata?.line || currentFrame.line;
	const notes = [];

	if (comparing > 0) {
		notes.push(`${comparing} value${comparing === 1 ? '' : 's'} being checked`);
	}
	if (writing > 0) {
		notes.push(`${writing} position${writing === 1 ? '' : 's'} being moved or written`);
	}
	if (sorted > 0 && arraySize > 0) {
		notes.push(`${sorted}/${arraySize} positions locked in`);
	}
	if (line) {
		notes.push(`pseudocode line ${line}`);
	}

	return {
		title: phase ? PHASE_LABELS[phase] || phase : 'Reading this frame',
		text:
			notes.length > 0
				? notes.join(' | ')
				: 'This frame is a setup or checkpoint before the next visible comparison or write.',
	};
};

const buildComparisonCards = (info, sortingAlgorithm) => [
	{
		label: 'Stability',
		title: info.properties?.stable ? 'Stable' : 'Not stable',
		text: info.properties?.stable
			? 'Equal values keep their original relative order.'
			: 'Equal values can move past each other during swaps or partitioning.',
	},
	{
		label: 'Memory',
		title: info.properties?.inPlace ? 'In-place' : 'Extra storage',
		text: info.properties?.inPlace
			? 'The main work happens inside the input array.'
			: 'The algorithm uses helper arrays, buckets, counts, or merge buffers.',
	},
	{
		label: 'Adaptivity',
		title: ADAPTIVE_ALGORITHMS.has(sortingAlgorithm) ? 'Adaptive' : 'Not adaptive',
		text: ADAPTIVE_ALGORITHMS.has(sortingAlgorithm)
			? 'Already-ordered structure can reduce the amount of work.'
			: 'The main work pattern is mostly fixed by the algorithm, not by how sorted the input already is.',
	},
];

const AlgorithmLearning = ({ info, sortingAlgorithm, currentFrame, arraySize }) => {
	if (!info) {
		return <LearningPanel content={null} />;
	}

	const content = {
		name: info.name,
		category: 'Sorting algorithm',
		summary: info.intuition || info.description,
		intuition: info.thoughtProcess,
		strategy: info.strategy,
		complexity: {
			time: info.complexity.time,
			space: info.complexity.space,
			variables: [
				{ symbol: 'n', label: 'number of items' },
				...(info.complexity.time.average?.includes('k')
					? [{ symbol: 'k', label: 'value range or buckets' }]
					: []),
				...(info.complexity.time.average?.includes('d')
					? [{ symbol: 'd', label: 'digit passes' }]
					: []),
			],
			why: info.complexityReason,
		},
		tradeoffs: info.tradeoffs,
		legend: SORTING_LEGEND,
		pseudocode: PSEUDO_CODE[sortingAlgorithm],
		compareCards: buildComparisonCards(info, sortingAlgorithm),
		caseIntuition: [info.cases?.best, info.cases?.worst].filter(Boolean),
		conceptChecks: CONCEPT_CHECKS[sortingAlgorithm],
	};

	return (
		<LearningPanel
			content={content}
			trace={getTraceSummary(currentFrame, arraySize)}
			activeLine={currentFrame?.metadata?.line || currentFrame?.line || null}
			activeLineBase={1}
		/>
	);
};

export default AlgorithmLearning;
