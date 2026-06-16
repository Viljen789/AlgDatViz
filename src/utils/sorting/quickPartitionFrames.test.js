import assert from 'node:assert/strict';
import test from 'node:test';
import { getQuickSortFrames } from './quickPartitionFrames.js';

const sortedCopy = a => [...a].sort((x, y) => x - y);

// A reference Lomuto partition over a copy, so the generator's pivot landing
// index and post-partition arrangement can be checked against an independent
// implementation (not against the generator restating itself).
const refPartition = (a, lo, hi) => {
	const arr = [...a];
	const pivot = arr[hi];
	let i = lo - 1;
	for (let j = lo; j < hi; j++) {
		if (arr[j] < pivot) {
			i++;
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
	}
	[arr[i + 1], arr[hi]] = [arr[hi], arr[i + 1]];
	return { arr, p: i + 1 };
};

test('full sort is correct across assorted inputs', () => {
	const cases = [
		[],
		[1],
		[2, 1],
		[1, 2],
		[5, 2, 9, 1, 5, 6],
		[38, 27, 43, 3, 9, 82, 10, 51],
		[5, 4, 3, 2, 1], // worst case: already reverse-sorted
		[1, 2, 3, 4, 5], // worst case: already sorted (pivot is always the max)
		[7, 7, 7, 7], // all equal
		[3, 1, 3, 1, 3, 1],
	];
	for (const input of cases) {
		const { frames, sorted } = getQuickSortFrames(input);
		assert.deepEqual(
			sorted,
			sortedCopy(input),
			`sorted ${JSON.stringify(input)}`
		);
		// The final 'done' frame's array must equal the sorted output.
		const last = frames[frames.length - 1];
		assert.equal(last.phase, 'done');
		assert.deepEqual(last.array, sortedCopy(input));
	}
});

test('the first partition lands the pivot at its reference final index', () => {
	const input = [38, 27, 43, 3, 9, 82, 10, 51];
	const { p } = refPartition(input, 0, input.length - 1);
	const { frames } = getQuickSortFrames(input);
	// The first 'place' frame is the first completed partition (top-level call).
	const firstPlace = frames.find(f => f.phase === 'place');
	assert.ok(firstPlace, 'a place frame exists');
	assert.equal(firstPlace.pivotIndex, p);
	// At that frame, the pivot index is recorded as locked (final position).
	assert.ok(firstPlace.locked.includes(p));
});

test('after the first partition, the array is correctly partitioned around the pivot', () => {
	const input = [38, 27, 43, 3, 9, 82, 10, 51];
	const ref = refPartition(input, 0, input.length - 1);
	const { frames } = getQuickSortFrames(input);
	const firstPlace = frames.find(f => f.phase === 'place');
	// The generator's array at the first place frame matches an independent
	// Lomuto partition: everything left of the pivot is < it, everything right ≥.
	assert.deepEqual(firstPlace.array, ref.arr);
	const p = firstPlace.pivotIndex;
	for (let k = 0; k < p; k++) {
		assert.ok(firstPlace.array[k] < firstPlace.array[p], `left[${k}] < pivot`);
	}
	for (let k = p + 1; k < firstPlace.array.length; k++) {
		assert.ok(
			firstPlace.array[k] >= firstPlace.array[p],
			`right[${k}] >= pivot`
		);
	}
});

test('a place frame names the two recursion subranges flanking the pivot', () => {
	const input = [5, 2, 9, 1, 5, 6];
	const { frames } = getQuickSortFrames(input);
	const firstPlace = frames.find(f => f.phase === 'place');
	const p = firstPlace.pivotIndex;
	const { left, right } = firstPlace.subranges;
	if (p - 1 >= 0) assert.deepEqual(left, [0, p - 1]);
	else assert.equal(left, null);
	if (p + 1 <= input.length - 1)
		assert.deepEqual(right, [p + 1, input.length - 1]);
	else assert.equal(right, null);
});

test('comparison frames count exactly the < comparisons the algorithm makes', () => {
	const input = [5, 2, 9, 1, 5, 6];
	const { frames, comparisons } = getQuickSortFrames(input);
	const compareFrames = frames.filter(f => f.phase === 'compare');
	assert.equal(compareFrames.length, comparisons);
	// Each compare frame compares some j against the pivot index and records less.
	for (const f of compareFrames) {
		assert.ok(Array.isArray(f.compared) && f.compared.length === 2);
		assert.equal(typeof f.less, 'boolean');
		assert.equal(f.compared[0], f.j);
		assert.equal(f.compared[1], f.pivotIndex);
	}
});

test('worst case on a sorted input makes the n(n-1)/2 comparisons (the T(n)=T(n-1)+n shape)', () => {
	// Sorted ascending: Lomuto's pivot (last = max) never finds anything smaller
	// to swap past, so each partition of size m peels exactly one element and does
	// m-1 comparisons → total C(n,2) = n(n-1)/2. This is the worst case the lesson
	// ties to the Master Theorem's T(n) = T(n-1) + n leaf.
	for (const n of [1, 2, 5, 8, 12]) {
		const input = Array.from({ length: n }, (_, k) => k + 1);
		const { comparisons } = getQuickSortFrames(input);
		assert.equal(comparisons, (n * (n - 1)) / 2, `n=${n}`);
	}
});

test('every index ends up locked, and the array length is preserved', () => {
	const input = [4, 1, 3, 2, 8, 5];
	const { frames } = getQuickSortFrames(input);
	const last = frames[frames.length - 1];
	assert.deepEqual(
		last.locked,
		Array.from({ length: input.length }, (_, k) => k)
	);
	for (const f of frames) {
		assert.equal(f.array.length, input.length, 'array length stays constant');
	}
});

test('swap frames actually permute two cells and never touch a locked pivot mid-partition', () => {
	const input = [9, 3, 7, 1, 8, 2, 6];
	const { frames } = getQuickSortFrames(input);
	for (let idx = 1; idx < frames.length; idx++) {
		const f = frames[idx];
		if (f.phase !== 'swap') continue;
		const prev = frames[idx - 1];
		const [a, b] = f.swapped;
		assert.notEqual(a, b, 'a swap exchanges two distinct indices');
		// The two swapped values are the prior frame's values, exchanged.
		assert.equal(f.array[a], prev.array[b]);
		assert.equal(f.array[b], prev.array[a]);
	}
});

test('init frame is honest about an empty input', () => {
	const { frames, sorted } = getQuickSortFrames([]);
	assert.deepEqual(sorted, []);
	assert.equal(frames[0].phase, 'init');
	assert.equal(frames[frames.length - 1].phase, 'done');
});
