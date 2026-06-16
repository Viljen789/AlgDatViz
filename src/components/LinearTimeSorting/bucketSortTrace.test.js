import assert from 'node:assert/strict';
import test from 'node:test';
import { bucketSort } from './bucketSortTrace.js';

// An independent reference for the bucket-index mapping, used to cross-check the
// generator's own assignment rather than letting it restate itself.
const refIndex = (value, numBuckets, max) =>
	Math.floor((value * numBuckets) / (max + 1));

// The exam-bank fixture. Hand-computed below with max = 49, max+1 = 50, so
// index = floor(value / 12.5):
//   29→2  25→2  3→0  49→3  9→0  37→2  21→1  43→3
const FIXTURE = [29, 25, 3, 49, 9, 37, 21, 43];

test('scatter: every value lands in floor(value*m/(max+1))', () => {
	const { max, bucketIndexOf } = bucketSort(FIXTURE, 4);
	assert.equal(max, 49, 'max of the fixture');
	for (const v of FIXTURE) {
		assert.equal(
			bucketIndexOf(v),
			refIndex(v, 4, 49),
			`index of ${v} matches the independent formula`
		);
	}
	// Spot-check the concrete, hand-verified indices.
	assert.equal(bucketIndexOf(29), 2);
	assert.equal(bucketIndexOf(25), 2);
	assert.equal(bucketIndexOf(3), 0);
	assert.equal(
		bucketIndexOf(49),
		3,
		'the max lands in the LAST bucket, no overflow'
	);
	assert.equal(bucketIndexOf(9), 0);
	assert.equal(bucketIndexOf(37), 2);
	assert.equal(bucketIndexOf(21), 1);
	assert.equal(bucketIndexOf(43), 3);
});

test('buckets hold scatter-order contents BEFORE the local sort', () => {
	const { buckets } = bucketSort(FIXTURE, 4);
	// Insertion order within each bucket, exactly as the values appear in input.
	assert.deepEqual(buckets, [
		[3, 9], // bucket 0
		[21], // bucket 1
		[29, 25, 37], // bucket 2 — note 29 before 25 (input order, NOT sorted yet)
		[49, 43], // bucket 3 — note 49 before 43
	]);
});

test('sortedBuckets sort each bucket; gather concatenates in index order', () => {
	const { sortedBuckets, sorted } = bucketSort(FIXTURE, 4);
	assert.deepEqual(sortedBuckets, [
		[3, 9],
		[21],
		[25, 29, 37], // bucket 2 now ascending
		[43, 49], // bucket 3 now ascending
	]);
	assert.deepEqual(sorted, [3, 9, 21, 25, 29, 37, 43, 49]);
});

test('the final array equals a plain ascending sort of the input', () => {
	const cases = [
		[],
		[0],
		[7, 7, 7],
		[5, 1, 9, 3, 7, 2],
		[10, 0, 10, 0, 5],
		FIXTURE,
	];
	for (const input of cases) {
		const { sorted } = bucketSort(input, 4);
		assert.deepEqual(
			sorted,
			[...input].sort((a, b) => a - b),
			`sorted ${JSON.stringify(input)}`
		);
	}
});

test('worst case: when everything maps to one bucket, that bucket holds all n', () => {
	// Identical values all share the same index, so one bucket carries the whole
	// input and the others are empty — the Theta(n^2) trap (the inner sort does
	// all the work). With m = 5 and all-equal values, index = floor(v*5/(v+1)) for
	// max = v, which is 4 for v >= 4: everything in the LAST bucket.
	const all7 = [7, 7, 7, 7, 7, 7];
	const { buckets, sorted } = bucketSort(all7, 5);
	const nonEmpty = buckets.filter(b => b.length > 0);
	assert.equal(nonEmpty.length, 1, 'exactly one bucket is non-empty');
	assert.equal(nonEmpty[0].length, all7.length, 'it holds all n values');
	assert.deepEqual(sorted, all7);
});

test('a single bucket (numBuckets = 1) degenerates to one sort of everything', () => {
	const input = [4, 1, 3, 2];
	const { buckets, sorted } = bucketSort(input, 1);
	assert.deepEqual(buckets, [[4, 1, 3, 2]], 'the lone bucket gets every value');
	assert.deepEqual(sorted, [1, 2, 3, 4]);
});

test('numBuckets must be a positive integer', () => {
	assert.throws(() => bucketSort([1, 2, 3], 0), RangeError);
	assert.throws(() => bucketSort([1, 2, 3], -2), RangeError);
	assert.throws(() => bucketSort([1, 2, 3], 2.5), RangeError);
});
