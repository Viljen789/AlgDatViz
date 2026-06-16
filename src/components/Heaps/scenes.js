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
	isLeftChildPair,
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

// Counting the sift-downs of Build-Max-Heap on the stage heap. Build-Max-Heap
// runs Max-Heapify (sift-down) once on every INTERNAL node, that is every node
// with at least one child. In an n-element heap those are exactly the first
// floor(n/2) array slots (indices floor(n/2)-1 .. 0); the remaining ceil(n/2)
// slots are leaves and are skipped. For STAGE_HEAP (n = 7) that is 3 calls.
const STAGE_N = STAGE_HEAP.length;
const STAGE_INTERNAL_NODES = Math.floor(STAGE_N / 2); // sift-down call count = 3

export const SCENES = [
	{
		id: 'heap-property',
		eyebrow: 'The heap property',
		title: 'A tree where every parent beats its children.',
		body: `A binary max-heap is a complete binary tree with one rule: every parent is ≥ both of its children. There is no left/right order like a search tree — only the parent-over-child relationship. The consequence is immediate and useful: the maximum is always at the very top, A[0] = ${STAGE_HEAP[0]}.`,
		check: {
			kind: 'choice',
			prompt: 'In a max-heap, where is the largest element guaranteed to be?',
			options: ['At the root', 'In a leaf', 'In the left subtree', 'Anywhere'],
			answer: 'At the root',
			misconceptions: {
				'In a leaf':
					'Leaves hold the smallest elements, not the largest. The heap rule pushes big values up toward the root, so the maximum cannot end up stranded at the bottom.',
				'In the left subtree':
					'A max-heap has no left/right ordering, so neither subtree is favored. The parent-over-child rule alone forces the maximum all the way to the root, not to a side.',
				Anywhere:
					'The heap property pins the maximum precisely. Since every parent dominates its children, no element can sit above the largest one, so it must be the root, not just somewhere.',
			},
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
			kind: 'pair',
			prompt:
				'On the heap, click any node and the node that is its LEFT child (index 2i+1).',
			hint: 'Click a node, then the node one level down on its left — the array cell at 2i+1.',
			// Host-graded on HeapStage. Pure index relation (2i+1), so it is true for
			// whatever values the layout happens to hold — no value-ordering claimed.
			validate: ([a, b]) => isLeftChildPair(a, b),
			exampleCorrectPair: [FOCUS_INDEX, FOCUS_LEFT],
			explanation: `Left child of i is 2i+1: node ${FOCUS_INDEX} → 2·${FOCUS_INDEX}+1 = ${FOCUS_LEFT}, node 0 → 1, node 2 → 5. Its right child is 2i+2 and its parent is ⌊(i−1)/2⌋ (node ${FOCUS_INDEX} → ${FOCUS_PARENT}, its right child ${FOCUS_RIGHT}). The arithmetic IS the tree — that is why a heap needs no pointers, and why this works for any node regardless of the value it holds.`,
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
			options: [
				'Sift up toward the root',
				'Sift down toward the leaves',
				'It stays put',
				'Re-build the whole heap',
			],
			answer: 'Sift up toward the root',
			misconceptions: {
				'Sift down toward the leaves':
					'Sifting down is the extract-max repair, where a too-small root sinks. A freshly inserted leaf is potentially too LARGE for its parent, so it moves the other way, upward.',
				'It stays put':
					'A new leaf can violate the property against its parent, so it cannot simply stay. It must bubble up until it is no larger than its parent, restoring the rule.',
				'Re-build the whole heap':
					'Rebuilding the whole heap is O(n) and wasteful here. Insert disturbs the property at one spot, so repairing along a single leaf-to-root path of length log n is enough.',
			},
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
			options: [
				...new Set([
					String(SECOND_MAX),
					String(PREDICT_HEAP[1]),
					String(PREDICT_HEAP[3]),
					String(PREDICT_HEAP[4]),
				]),
			],
			answer: String(SECOND_MAX),
			misconceptions: {
				15: 'Reading 15 takes A[1], the slot right after the old root, but extract-max does not promote the neighbouring cell. The last leaf moves to the top and sinks while the larger child 18 rises, so 18 becomes the new maximum and 15 stays beneath it.',
				11: '11 sits low in the left subtree, below several larger values. A heap always returns the current maximum, and both 18 and 16 outrank 11, so it cannot be the next one out.',
				9: '9 is a small leaf near the bottom of the heap. Extract-max hands back the largest remaining element, which after the tree re-settles is 18, never a value as small as 9.',
			},
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
	{
		id: 'build-derivation',
		eyebrow: 'Why O(n) (the derivation)',
		title: 'The deep sinks are rare, so the sum is linear.',
		body: `The measurement says O(n); here is why. Build-Max-Heap runs sift-down once on each internal node, and a node of height h costs O(h). The catch is that height is scarce near the bottom: a complete tree has at most ⌈n/2^(h+1)⌉ nodes of height h, so half the nodes are leaves (h = 0, no work), a quarter have height 1, and only one node has the full height. The total is Σ over h of (n/2^(h+1))·O(h) = O(n · Σ h/2^h). That series Σ h/2^h converges to 2 (not to log n), so the whole build is O(2n) = O(n). Repeated insert loses because it pays from the bottom UP, where the levels are crowded.`,
		check: {
			kind: 'numeric',
			prompt: `On the ${STAGE_N}-node heap on the left, how many sift-down (Max-Heapify) calls does Build-Max-Heap make?`,
			answer: STAGE_INTERNAL_NODES,
			placeholder: 'a count',
			explanation: `Build-Max-Heap sifts down every internal node and skips the leaves, so it makes ⌊n/2⌋ = ⌊${STAGE_N}/2⌋ = ${STAGE_INTERNAL_NODES} calls (the leaves, the other ${STAGE_N - STAGE_INTERNAL_NODES} slots, already satisfy the heap property). Most of those calls sit low in the tree and barely sink: weighting each height h by its ⌈n/2^(h+1)⌉ nodes gives O(n·Σ h/2^h) = O(2n) = O(n), since Σ h/2^h = 2.`,
		},
	},
];

// Re-export the validated stage heap so the stage and scenes share one source.
export const STAGE_HEAP_VALID = STAGE_IS_HEAP;
