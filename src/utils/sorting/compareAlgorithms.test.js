import test from 'node:test';
import assert from 'node:assert/strict';
import { compareSortingAlgorithms } from './compareAlgorithms.js';

test('comparison ranks every sorting algorithm on the same input', () => {
	const rows = compareSortingAlgorithms([5, 1, 4, 2, 8]);

	assert.equal(rows.length, 9);
	assert.deepEqual(
		rows.map(row => row.rank),
		[1, 2, 3, 4, 5, 6, 7, 8, 9]
	);
	assert.ok(rows.every(row => row.totalOperations >= 0));
	assert.ok(rows.every(row => Number.isInteger(row.steps)));
});

test('comparison does not mutate the provided values', () => {
	const values = [3, 2, 1, 2];
	compareSortingAlgorithms(values);

	assert.deepEqual(values, [3, 2, 1, 2]);
});

