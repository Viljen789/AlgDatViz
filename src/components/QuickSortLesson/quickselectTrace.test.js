import assert from 'node:assert/strict';
import test from 'node:test';
import { quickselectTrace } from './quickselectTrace.js';

// The whole point of quickselectTrace is to be an INDEPENDENTLY checkable source
// of truth for the exam bank. So here we cross-check it against the definition of
// "i-th smallest" — sort a copy and index — rather than against the generator
// restating itself. If the deterministic RANDOMIZED-SELECT ever drifts from the
// order-statistic it claims to compute, these fail.

const sortedCopy = a => [...a].sort((x, y) => x - y);

// A reference Lomuto partition over a copy, used to check the FIRST partition's
// arrangement and landing index without trusting the generator's own partition.
const refPartition = a => {
	const arr = [...a];
	const hi = arr.length - 1;
	const pivot = arr[hi];
	let i = -1;
	for (let j = 0; j < hi; j++) {
		if (arr[j] < pivot) {
			i++;
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
	}
	[arr[i + 1], arr[hi]] = [arr[hi], arr[i + 1]];
	return { arr, p: i + 1 };
};

const isPermutation = (a, b) => {
	if (a.length !== b.length) return false;
	return (
		JSON.stringify([...a].sort((x, y) => x - y)) ===
		JSON.stringify([...b].sort((x, y) => x - y))
	);
};

test('selected === the i-th smallest, for every rank i = 1..n', () => {
	const cases = [
		[3, 7, 1, 9, 2, 8, 5], // 7 distinct
		[38, 27, 43, 3, 9, 82, 10, 51], // the lesson's array
		[5, 4, 3, 2, 1], // reverse sorted
		[1, 2, 3, 4, 5, 6], // already sorted (Lomuto worst case)
		[42], // singleton
		[10, 30, 20, 40], // small even-length
	];
	for (const input of cases) {
		const want = sortedCopy(input);
		for (let i = 1; i <= input.length; i++) {
			const { selected, selectedIndex } = quickselectTrace(input, i);
			assert.equal(
				selected,
				want[i - 1],
				`select(${JSON.stringify(input)}, i=${i}) should be the i-th smallest`
			);
			// selectedIndex is the 0-based final (sorted) position = i - 1.
			assert.equal(selectedIndex, i - 1, `selectedIndex for i=${i}`);
		}
	}
});

test('i=1 returns the minimum and i=n returns the maximum', () => {
	const input = [3, 7, 1, 9, 2, 8, 5];
	const min = Math.min(...input);
	const max = Math.max(...input);
	assert.equal(quickselectTrace(input, 1).selected, min, 'i=1 is the min');
	assert.equal(
		quickselectTrace(input, input.length).selected,
		max,
		'i=n is the max'
	);
});

test('i = middle rank returns the median element', () => {
	const input = [3, 7, 1, 9, 2, 8, 5]; // n=7, median rank = 4
	const want = sortedCopy(input)[3]; // the 4th smallest
	assert.equal(quickselectTrace(input, 4).selected, want);
});

test('firstPartition.array is a permutation of the input', () => {
	const input = [38, 27, 43, 3, 9, 82, 10, 51];
	const { firstPartition } = quickselectTrace(input, 4);
	assert.ok(
		isPermutation(firstPartition.array, input),
		'the array after the first partition is a rearrangement of the input'
	);
	assert.equal(firstPartition.array.length, input.length);
});

test('the first pivot lands in its sorted-final position (independent partition check)', () => {
	const inputs = [
		[38, 27, 43, 3, 9, 82, 10, 51],
		[3, 7, 1, 9, 2, 8, 5],
		[10, 30, 20, 40],
	];
	for (const input of inputs) {
		const ref = refPartition(input);
		const { firstPartition } = quickselectTrace(input, 1);
		// The first partition's arrangement and landing index match an independent
		// Lomuto partition (the pivot's choice of i does not change the FIRST split).
		assert.equal(firstPartition.pivotFinalIndex, ref.p, `landing index`);
		assert.deepEqual(firstPartition.array, ref.arr, `arrangement`);
		// The pivot value at its landing index equals the sorted value there: it is
		// in its final position.
		const pivotValue = firstPartition.array[firstPartition.pivotFinalIndex];
		assert.equal(
			pivotValue,
			sortedCopy(input)[firstPartition.pivotFinalIndex],
			`pivot is in its sorted-final position`
		);
		// Everything left of it is smaller; everything right is >= it.
		const p = firstPartition.pivotFinalIndex;
		for (let k = 0; k < p; k++)
			assert.ok(firstPartition.array[k] < pivotValue, `left[${k}] < pivot`);
		for (let k = p + 1; k < input.length; k++)
			assert.ok(firstPartition.array[k] >= pivotValue, `right[${k}] >= pivot`);
	}
});

test('the first pivot is always the LAST element of the input (deterministic choice)', () => {
	for (const input of [
		[3, 7, 1, 9, 2, 8, 5],
		[38, 27, 43, 3, 9, 82, 10, 51],
		[5, 4, 3, 2, 1],
	]) {
		const { pivots } = quickselectTrace(input, 2);
		assert.equal(pivots[0], input[input.length - 1]);
	}
});

test('the input array is not mutated', () => {
	const input = [3, 7, 1, 9, 2, 8, 5];
	const copy = [...input];
	quickselectTrace(input, 4);
	assert.deepEqual(
		input,
		copy,
		'quickselectTrace must not mutate its argument'
	);
});

test('frames record one partition each, ending in a "found" decision', () => {
	const input = [3, 7, 1, 9, 2, 8, 5];
	const { frames, pivots } = quickselectTrace(input, 4);
	assert.equal(frames.length, pivots.length, 'one frame per partition/pivot');
	assert.equal(
		frames[frames.length - 1].decision,
		'found',
		'the recursion stops when the pivot IS the requested rank'
	);
	// Every non-final frame steered left or right.
	for (let f = 0; f < frames.length - 1; f++) {
		assert.ok(['left', 'right'].includes(frames[f].decision));
	}
});
