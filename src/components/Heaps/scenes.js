// The scrolly scenes that build heap intuition before the playground.
//
// One continuous story on a single small max-heap: the heap property, the
// heap-as-array dual view (the index arithmetic), sift-down/insert/extract, the
// E1 snubletråd (Build-Max-Heap is O(n), not O(n log n)), and the priority-queue
// framing. Each scene ends with a retrieval `check` answered before scrolling on
// — wrong answers are never punished; the explanation always reveals.
//
// All concrete numbers are derived from the pure generators in heapTrace.js (run
// in heapTrace.test.js) so the scrolly and the algorithm can never disagree.

import {
	buildMaxHeapTrace,
	compareBuildVsInsert,
	extractMaxTrace,
	leftChild,
	parentIndex,
	rightChild,
} from './heapTrace.js';
import { COMPARE_INPUT } from './heapMeta.js';

// The one heap the stage tells its story on. Already a valid max-heap.
//   index:  0   1   2   3  4  5  6
//   value: 16  14  10   8  7  9  3
export const STAGE_HEAP = [16, 14, 10, 8, 7, 9, 3];

// A node we point at for the index-arithmetic check. Node 1 (value 14) has
// parent 0 and children 3 and 4 — concrete, derivable arithmetic.
const FOCUS_INDEX = 1;
const FOCUS_PARENT = parentIndex(FOCUS_INDEX);
const FOCUS_LEFT = leftChild(FOCUS_INDEX);
const FOCUS_RIGHT = rightChild(FOCUS_INDEX);

// E1 comparison numbers, measured from the generators on a shared 10-element
// input (see heapMeta.COMPARE_INPUT).
const CMP = compareBuildVsInsert(COMPARE_INPUT);
export const BUILD_OPS = CMP.build.operations;
export const INSERT_OPS = CMP.repeatedInsert.operations;

// The extract-max story heap and what the next two extractions return — used by
// the predict-next check. Built so the answer is NOT simply "A[1], the next
// array slot": here the second-largest (18) lives at A[2] (the right child), so
// a learner must let the heap re-settle to read the new maximum.
export const PREDICT_HEAP = [20, 15, 18, 11, 9, 16, 14, 8];
const FIRST_MAX = extractMaxTrace({ heap: PREDICT_HEAP }).max; // 20
const AFTER_FIRST = extractMaxTrace({ heap: PREDICT_HEAP }).finalHeap;
const SECOND_MAX = extractMaxTrace({ heap: AFTER_FIRST }).max; // the real runner-up

// Sanity: STAGE_HEAP really is a valid max-heap (kept honest at module load).
const STAGE_IS_HEAP = buildMaxHeapTrace(STAGE_HEAP).finalHeap;

export const SCENES = [
	{
		id: 'heap-property',
		eyebrow: 'The heap property',
		title: 'A tree where every parent beats its children.',
		body: `A binary max-heap is a complete binary tree with one rule: every parent is ≥ both of its children. There is no left/right order like a search tree — only the parent-over-child relationship. The consequence is immediate and useful: the maximum is always at the very top, A[0] = ${STAGE_HEAP[0]}.`,
		check: {
			kind: 'choice',
			prompt: 'In a max-heap, where is the largest element guaranteed to be?',
			options: [
				'At the root',
				'In a leaf',
				'In the left subtree',
				'Anywhere',
			],
			answer: 'At the root',
			explanation:
				'Since every parent dominates its children, the largest element can have no parent larger than it — so it must be the root. That single guarantee is what makes a heap a priority queue: the best element is one lookup away.',
		},
	},
	{
		id: 'heap-as-array',
		eyebrow: 'Heap as array',
		title: 'The tree is a lie — it lives in a flat array.',
		body: `A heap is never stored as nodes-with-pointers. It is one array, read level by level. The tree shape is implicit in the indices: for a node at i, its left child is at 2i+1, its right child at 2i+2, and its parent at ⌊(i−1)/2⌋. No pointers, perfect cache locality. Watch the tree and the array light up together as you step.`,
		check: {
			kind: 'numeric',
			prompt: `Using 0-based indices, what is the index of the LEFT child of the node at index ${FOCUS_INDEX} (value ${STAGE_HEAP[FOCUS_INDEX]})?`,
			answer: FOCUS_LEFT,
			placeholder: 'an index',
			explanation: `Left child of i is 2i+1 = 2·${FOCUS_INDEX}+1 = ${FOCUS_LEFT} (value ${STAGE_HEAP[FOCUS_LEFT]}). Its right child is 2i+2 = ${FOCUS_RIGHT}, and its parent is ⌊(${FOCUS_INDEX}−1)/2⌋ = ${FOCUS_PARENT}. The arithmetic IS the tree — that is why a heap needs no pointers.`,
		},
	},
	{
		id: 'parent-index',
		eyebrow: 'Index arithmetic',
		title: 'Walk upward with one floor-division.',
		body: `Going down is multiply-and-add; going up is the inverse. From any node i, the parent is ⌊(i−1)/2⌋ — integer division rounds two siblings to the same parent. Sift-up (used by Insert) walks exactly this chain from a leaf toward the root.`,
		check: {
			kind: 'numeric',
			prompt: 'What is the parent index of the node at index 6 (0-based)?',
			answer: parentIndex(6),
			placeholder: 'an index',
			explanation: `Parent of i is ⌊(i−1)/2⌋ = ⌊(6−1)/2⌋ = ⌊2.5⌋ = ${parentIndex(6)}. Index 5 has the same parent (⌊4/2⌋ = 2): they are siblings. The floor is what merges two children back onto one parent.`,
		},
	},
	{
		id: 'sift',
		eyebrow: 'Restoring the property',
		title: 'When one node breaks the rule, it sinks or floats.',
		body: `Insert and extract both temporarily violate the heap property at one spot, then repair it along a single root-to-leaf path. Sift-down (heapify) swaps a too-small node with its larger child, repeatedly, until it settles. Sift-up bubbles a too-large node toward the root. Either way the work is the height of the tree — O(log n).`,
		check: {
			kind: 'choice',
			prompt:
				'Insert appends the new key at the last leaf. Which way does it then travel to find its place?',
			options: ['Sift up toward the root', 'Sift down toward the leaves', 'It stays put', 'Re-build the whole heap'],
			answer: 'Sift up toward the root',
			explanation:
				'A freshly appended leaf may be larger than its parent, so it bubbles UP, swapping with its parent until it is no longer too big. Extract-max is the mirror image: the replacement root is too small, so it sinks DOWN. Each is one path of length ≤ log n.',
		},
	},
	{
		id: 'extract',
		eyebrow: 'Priority queue',
		title: 'Always hand back the best element next.',
		body: `A priority queue promises: whatever you ask for, you get the current maximum. A heap implements it cheaply — peek is A[0] in O(1); extract-max returns the root, promotes the last leaf, shrinks, and sifts down in O(log n). Pull repeatedly and the elements come out in sorted order (that is exactly heapsort).`,
		check: {
			kind: 'predict',
			prompt: `From the heap [${PREDICT_HEAP.join(', ')}], the first extract-max returns ${FIRST_MAX}. Which value comes out on the NEXT extract-max?`,
			// Distinct options: the correct re-settled max, the tempting "next array
			// slot" A[1], and two other present values. De-duplicated so no two
			// option labels collide.
			options: [...new Set([
				String(SECOND_MAX),
				String(PREDICT_HEAP[1]),
				String(PREDICT_HEAP[3]),
				String(PREDICT_HEAP[4]),
			])],
			answer: String(SECOND_MAX),
			explanation: `After ${FIRST_MAX} leaves, the heap re-settles and the new root — the new maximum — is ${SECOND_MAX}. It is NOT simply "the next array slot": removing the root reshuffles the tree, so you must let it sift down before reading the top again. Repeat and you get a sorted stream.`,
		},
	},
	{
		id: 'build-vs-insert',
		eyebrow: 'The key misconception (E1)',
		title: 'Building a heap is O(n) — not O(n log n).',
		body: `Here is the trap. Inserting n elements one at a time costs O(n log n): each of n inserts can sift up a full log n levels. But Build-Max-Heap — heapifying bottom-up, from the last internal node to the root — is only O(n). Most nodes are near the leaves and sink at most a step or two; the rare deep sinks are few. On the same ${COMPARE_INPUT.length} elements: bottom-up build did ${BUILD_OPS} operations, repeated insert did ${INSERT_OPS}.`,
		check: {
			kind: 'classify',
			prompt:
				'Match each way of constructing a heap from n elements to its tight asymptotic cost.',
			items: [
				{ id: 'build', label: 'Build-Max-Heap (heapify bottom-up)' },
				{ id: 'repeated', label: 'Insert the n elements one by one' },
			],
			categories: [
				{ id: 'linear', label: 'Θ(n)' },
				{ id: 'linearithmic', label: 'Θ(n log n)' },
			],
			answer: { build: 'linear', repeated: 'linearithmic' },
			explanation: `Bottom-up Build-Max-Heap is Θ(n): summing each node's possible sink-distance over the tree converges to a constant times n. Repeated insertion is Θ(n log n) in the worst case: n inserts × up to log n levels each. Same final heap, different cost — measured here as ${BUILD_OPS} vs ${INSERT_OPS} ops. When you have all the data up front, always build, don't insert.`,
		},
	},
];

// Re-export the validated stage heap so the stage and scenes share one source.
export const STAGE_HEAP_VALID = STAGE_IS_HEAP;
