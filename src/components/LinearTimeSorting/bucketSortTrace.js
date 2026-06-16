// bucketSortTrace.js — a pure, deterministic bucket sort over non-negative
// integers, written so an exam bank can DERIVE its answer keys from it (never
// hand-type them). It is intentionally minimal: no animation frames, no stats —
// just the two facts a learner traces by hand, exposed as data.
//
//   1. WHICH bucket each value lands in, and therefore the contents of every
//      bucket BEFORE its local sort (the "scatter" step).
//   2. The final sorted array after each bucket is sorted and the buckets are
//      concatenated in index order (the "gather" step).
//
// Bucket assignment uses the standard integer-range mapping for values in
// [0, max]:  index = floor(value * numBuckets / (max + 1)).  Because the largest
// value maps to floor(max * numBuckets / (max + 1)) = numBuckets - 1, every value
// lands in a valid bucket 0..numBuckets-1 with no clamping needed.

/**
 * Bucket-sort non-negative integers and expose the intermediate buckets.
 *
 * @param {number[]} values     Non-negative integers to sort.
 * @param {number}   numBuckets Number of buckets (a positive integer).
 * @returns {{
 *   numBuckets: number,
 *   max: number,
 *   bucketIndexOf: (value: number) => number,
 *   buckets: number[][],   // contents in scatter order, BEFORE each local sort
 *   sortedBuckets: number[][], // each bucket after its local sort
 *   sorted: number[],      // final sorted array (buckets concatenated in order)
 * }}
 */
export function bucketSort(values, numBuckets) {
	if (!Number.isInteger(numBuckets) || numBuckets < 1) {
		throw new RangeError(
			`numBuckets must be a positive integer, got ${numBuckets}`
		);
	}
	const input = [...values];

	// An empty input sorts to itself; report empty buckets so callers never crash.
	if (input.length === 0) {
		return {
			numBuckets,
			max: 0,
			bucketIndexOf: () => 0,
			buckets: Array.from({ length: numBuckets }, () => []),
			sortedBuckets: Array.from({ length: numBuckets }, () => []),
			sorted: [],
		};
	}

	const max = Math.max(...input);

	// index = floor(value * numBuckets / (max + 1)).  The +1 guarantees the max
	// value maps to numBuckets-1 rather than overflowing to numBuckets.
	const bucketIndexOf = value => Math.floor((value * numBuckets) / (max + 1));

	// Scatter: distribute values into buckets, preserving input (scatter) order
	// within each bucket so the "before local sort" contents are well-defined.
	const buckets = Array.from({ length: numBuckets }, () => []);
	for (const value of input) {
		buckets[bucketIndexOf(value)].push(value);
	}

	// Local sort: each bucket is sorted ascending. Gather: concatenate buckets in
	// index order (0, 1, ..., numBuckets-1) to form the final sorted array.
	const sortedBuckets = buckets.map(bucket =>
		[...bucket].sort((a, b) => a - b)
	);
	const sorted = sortedBuckets.flat();

	return { numBuckets, max, bucketIndexOf, buckets, sortedBuckets, sorted };
}
