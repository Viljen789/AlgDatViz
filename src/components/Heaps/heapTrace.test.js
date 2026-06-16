import assert from 'node:assert/strict';
import test from 'node:test';
import {
	buildMaxHeapTrace,
	buildOperationTrace,
	buildStateRows,
	compareBuildVsInsert,
	extractMaxTrace,
	insertTrace,
	isLeftChildPair,
	isMaxHeap,
	leftChild,
	parentIndex,
	rightChild,
} from './heapTrace.js';

// Every frame must carry a 0-based pseudocode line and a heap array, so the
// canvas + PseudoState rail stay in lockstep.
const assertFrameShape = frame => {
	assert.equal(typeof frame.line, 'number', 'frame has a numeric line');
	assert.ok(frame.line >= 0, 'line is 0-based');
	assert.ok(Array.isArray(frame.heap), 'frame has a heap array');
	assert.equal(typeof frame.heapSize, 'number', 'frame has a heap size');
};

// ── Index arithmetic (the heap-as-array centerpiece) ──

test('parent/child index math is the 0-based heap arithmetic', () => {
	assert.equal(leftChild(0), 1);
	assert.equal(rightChild(0), 2);
	assert.equal(leftChild(2), 5);
	assert.equal(rightChild(2), 6);
	assert.equal(parentIndex(1), 0);
	assert.equal(parentIndex(2), 0);
	assert.equal(parentIndex(6), 2);
	// Round-trip: a child's parent's child includes the child.
	for (let i = 1; i < 50; i++) {
		const p = parentIndex(i);
		assert.ok(leftChild(p) === i || rightChild(p) === i);
	}
});

// ── isLeftChildPair (the pair-check validator: the 2i+1 relation) ──

test('isLeftChildPair recognises a node and its left child in either order', () => {
	// (parent, its left child) holds across the first few levels.
	assert.ok(isLeftChildPair(0, 1), '0 and its left child 1');
	assert.ok(isLeftChildPair(1, 3), '1 and its left child 3');
	assert.ok(isLeftChildPair(2, 5), '2 and its left child 5');
	// Order-independent: the click order must not matter.
	assert.ok(isLeftChildPair(3, 1), 'same pair, reversed');
	// It is the LEFT child specifically — a right-child pair is not accepted.
	assert.ok(!isLeftChildPair(0, 2), 'right child 2 is not the left child');
	assert.ok(!isLeftChildPair(1, 4), 'right child 4 is not the left child');
	// Unrelated indices, a node with itself, and out-of-range/garbage inputs.
	assert.ok(!isLeftChildPair(1, 5), 'not in a parent/left-child relation');
	assert.ok(!isLeftChildPair(2, 2), 'a node is not its own child');
	assert.ok(!isLeftChildPair(-1, 1), 'negative index rejected');
	assert.ok(!isLeftChildPair(1, 1.5), 'non-integer rejected');
	assert.ok(!isLeftChildPair(undefined, 3), 'missing index rejected');
});

test('isLeftChildPair agrees with leftChild for every parent index', () => {
	// For any i, {i, leftChild(i)} is accepted and the off-by-one neighbours are
	// not — the relation IS the 2i+1 arithmetic, value-free.
	for (let i = 0; i < 40; i++) {
		assert.ok(isLeftChildPair(i, leftChild(i)), `i=${i} with 2i+1`);
		assert.ok(!isLeftChildPair(i, leftChild(i) + 1), `i=${i} not with 2i+2`);
	}
});

// ── Build-Max-Heap ──

test('buildMaxHeapTrace produces a valid max-heap and keeps the multiset', () => {
	const input = [3, 9, 2, 1, 4, 5, 8, 7, 6, 0];
	const { frames, finalHeap } = buildMaxHeapTrace(input);
	frames.forEach(assertFrameShape);
	assert.ok(isMaxHeap(finalHeap), 'result satisfies the max-heap property');
	assert.equal(finalHeap[0], Math.max(...input), 'max sits at the root');
	assert.deepEqual(
		[...finalHeap].sort((a, b) => a - b),
		[...input].sort((a, b) => a - b),
		'no element lost or invented'
	);
	// The original input is not mutated (pure generator).
	assert.deepEqual(input, [3, 9, 2, 1, 4, 5, 8, 7, 6, 0]);
});

test('buildMaxHeapTrace handles trivial inputs', () => {
	assert.ok(isMaxHeap(buildMaxHeapTrace([]).finalHeap));
	assert.deepEqual(buildMaxHeapTrace([42]).finalHeap, [42]);
});

// ── Insert (sift-up) ──

test('insertTrace places a new key and preserves the heap property', () => {
	const heap = buildMaxHeapTrace([5, 4, 3, 2, 1]).finalHeap;
	const { frames, finalHeap } = insertTrace({ heap, key: 9 });
	frames.forEach(assertFrameShape);
	assert.ok(isMaxHeap(finalHeap), 'still a max-heap after insert');
	assert.equal(finalHeap[0], 9, 'the new max bubbled to the root');
	assert.equal(finalHeap.length, heap.length + 1, 'one element added');
});

test('insertTrace of a small key stays put near the leaves', () => {
	const heap = buildMaxHeapTrace([9, 8, 7, 6, 5]).finalHeap;
	const { finalHeap } = insertTrace({ heap, key: 1 });
	assert.ok(isMaxHeap(finalHeap));
	assert.equal(finalHeap[finalHeap.length - 1], 1, 'tiny key never rises');
});

// ── Extract-max ──

test('extractMaxTrace returns the max and restores the heap', () => {
	const heap = buildMaxHeapTrace([3, 9, 2, 1, 4, 5, 8]).finalHeap;
	const { frames, finalHeap, max } = extractMaxTrace({ heap });
	frames.forEach(assertFrameShape);
	assert.equal(max, 9, 'returns the maximum');
	assert.equal(finalHeap.length, heap.length - 1, 'heap shrank by one');
	assert.ok(isMaxHeap(finalHeap), 'remaining heap is valid');
	assert.ok(!finalHeap.includes(undefined));
});

test('repeated extract-max yields elements in descending order (PQ semantics)', () => {
	const input = [3, 9, 2, 1, 4, 5, 8, 7, 6, 0];
	let heap = buildMaxHeapTrace(input).finalHeap;
	const out = [];
	while (heap.length > 0) {
		const { finalHeap, max } = extractMaxTrace({ heap });
		out.push(max);
		heap = finalHeap;
	}
	assert.deepEqual(
		out,
		[...input].sort((a, b) => b - a)
	);
});

test('extractMaxTrace on an empty heap is a no-op', () => {
	const { frames, max } = extractMaxTrace({ heap: [] });
	assert.deepEqual(frames, []);
	assert.equal(max, null);
});

// ── E1: Build-Max-Heap O(n) vs repeated insert O(n log n) ──

test('compareBuildVsInsert: both build a valid heap with the same multiset', () => {
	const input = [3, 9, 2, 1, 4, 5, 8, 7, 6, 0, 11, 13, 12, 10, 15];
	const { build, repeatedInsert } = compareBuildVsInsert(input);
	assert.ok(isMaxHeap(build.heap), 'bottom-up build is a valid max-heap');
	assert.ok(isMaxHeap(repeatedInsert.heap), 'repeated insert is a valid heap');
	const sortedInput = [...input].sort((a, b) => a - b);
	assert.deepEqual(
		[...build.heap].sort((a, b) => a - b),
		sortedInput
	);
	assert.deepEqual(
		[...repeatedInsert.heap].sort((a, b) => a - b),
		sortedInput
	);
});

test('compareBuildVsInsert: bottom-up build does strictly fewer operations', () => {
	// An ASCENDING input is the worst case for repeated insert: every new key is
	// the new max and bubbles all the way to the root (a full log-depth climb),
	// while bottom-up build still does only a linear amount of work.
	const input = Array.from({ length: 31 }, (_, i) => i + 1); // 1,2,…,31
	const { build, repeatedInsert } = compareBuildVsInsert(input);
	assert.ok(
		build.operations < repeatedInsert.operations,
		`build (${build.operations}) should be cheaper than repeated insert (${repeatedInsert.operations})`
	);
	// Bottom-up build's swap count is bounded by n (the O(n) signature): each
	// element moves down a bounded amortized amount, so total swaps < n.
	assert.ok(
		build.swaps < input.length,
		`bottom-up swaps (${build.swaps}) < n (${input.length}) — the O(n) tell`
	);
});

test('compareBuildVsInsert: the gap widens with n (super-linear vs linear)', () => {
	const ratio = n => {
		const input = Array.from({ length: n }, (_, i) => i + 1); // ascending
		const { build, repeatedInsert } = compareBuildVsInsert(input);
		return repeatedInsert.operations / build.operations;
	};
	// As n grows, repeated-insert's n·log n pulls further ahead of build's n.
	assert.ok(ratio(63) > ratio(15), 'the O(n log n)/O(n) ratio grows with n');
});

// ── buildStateRows (the PseudoState bridge) ──

test('buildStateRows exposes the index arithmetic for the active node', () => {
	const heap = buildMaxHeapTrace([3, 9, 2, 1, 4, 5, 8]).finalHeap;
	const { frames } = extractMaxTrace({ heap });
	const compare = frames.find(f => f.phase === 'compare' && f.active > 0);
	const rows = buildStateRows(compare ?? frames[0]);
	const byId = Object.fromEntries(rows.map(r => [r.id, r.value]));
	assert.ok('parent' in byId, 'reports the parent index');
	assert.ok('children' in byId, 'reports the 2i+1, 2i+2 children');
	assert.ok('comparisons' in byId && 'swaps' in byId, 'reports op counts');
});

test('buildStateRows is pure and tolerates a null frame', () => {
	assert.deepEqual(buildStateRows(null), []);
	assert.deepEqual(buildStateRows(undefined), []);
});

// ── Dispatch ──

test('buildOperationTrace dispatches by operation name', () => {
	const heap = [9, 4, 7];
	assert.ok(buildOperationTrace('insert', { heap, key: 5 }).frames.length > 0);
	assert.ok(buildOperationTrace('extractMax', { heap }).frames.length > 0);
	assert.ok(
		buildOperationTrace('build', { heap: [1, 2, 3] }).frames.length > 0
	);
	assert.deepEqual(buildOperationTrace('nope', { heap }).frames, []);
});
