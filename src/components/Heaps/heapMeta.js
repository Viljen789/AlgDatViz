// Static metadata for the Heaps playground: operation descriptors, starting
// presets, and the Build-vs-insert demo inputs. The pseudocode for each op lives
// in heapTrace.js (HEAP_PSEUDO) so the trace `line` indices and the rendered
// listing can never drift apart.

export const HEAP_OPERATIONS = {
	insert: {
		id: 'insert',
		name: 'Insert',
		needsKey: true,
		oneLine:
			'Append the key at the next free leaf, then sift it up until the heap property holds.',
		complexity: 'O(log n)',
	},
	extractMax: {
		id: 'extractMax',
		name: 'Extract-max',
		needsKey: false,
		oneLine:
			'Take the root (the max), move the last leaf up to the root, shrink, then sift down.',
		complexity: 'O(log n)',
	},
	build: {
		id: 'build',
		name: 'Build-heap',
		needsKey: false,
		oneLine:
			'Heapify every internal node from the bottom up — one O(n) pass turns any array into a max-heap.',
		complexity: 'O(n)',
	},
};

export const HEAP_OP_ORDER = ['insert', 'extractMax', 'build'];

// Starting heaps for the playground. Each is already a valid max-heap (except
// the build preset, which is intentionally unordered so build-heap has work).
export const HEAP_PRESETS = [
	{
		id: 'classic',
		label: 'Textbook heap',
		intent: 'A valid 7-element max-heap — insert or extract to watch it re-settle.',
		heap: [16, 14, 10, 8, 7, 9, 3],
		operationId: 'insert',
		key: 15,
	},
	{
		id: 'build-from-scratch',
		label: 'Unordered array',
		intent: 'A scrambled array — run Build-heap to heapify it bottom-up in O(n).',
		heap: [4, 1, 3, 2, 16, 9, 10, 14, 8, 7],
		operationId: 'build',
		key: 12,
	},
	{
		id: 'extract-run',
		label: 'Drain the max',
		intent: 'A full heap — extract-max repeatedly to read elements in sorted order.',
		heap: [20, 18, 12, 15, 9, 10, 6, 11, 14],
		operationId: 'extractMax',
		key: 5,
	},
	{
		id: 'climb',
		label: 'Big new key',
		intent: 'Insert a value larger than everything — it bubbles all the way to the root.',
		heap: [10, 8, 9, 4, 7, 2, 5],
		operationId: 'insert',
		key: 99,
	},
];

// The shared input for the E1 Build-vs-insert comparison stage. Chosen so both
// strategies have real, visibly different op counts (ascending-ish so repeated
// insert keeps climbing).
export const COMPARE_INPUT = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
