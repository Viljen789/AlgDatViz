// activitySelect.test.js — concrete, hand-verified checks for the activity-
// selection greedy. The headline case is the classic CLRS instance (Introduction
// to Algorithms, 3rd ed., Fig 16.1), whose optimal selection {a1, a4, a8, a11}
// (size 4) is worked out in the book, so these are not self-derived expectations.

import test from 'node:test';
import assert from 'node:assert/strict';

import { activitySelect } from './activitySelect.js';

// The CLRS activities, indexed 1..11, given here in SCRAMBLED order on purpose so
// the test also proves the function sorts by finish time itself (it must not rely
// on the caller pre-sorting).
//   i:  1  2  3  4  5  6  7  8  9 10 11
//   s:  1  3  0  5  3  5  6  8  8  2 12
//   f:  4  5  6  7  9  9 10 11 12 14 16
const CLRS = [
	{ id: 'a5', start: 3, finish: 9 },
	{ id: 'a11', start: 12, finish: 16 },
	{ id: 'a1', start: 1, finish: 4 },
	{ id: 'a8', start: 8, finish: 11 },
	{ id: 'a3', start: 0, finish: 6 },
	{ id: 'a7', start: 6, finish: 10 },
	{ id: 'a2', start: 3, finish: 5 },
	{ id: 'a10', start: 2, finish: 14 },
	{ id: 'a4', start: 5, finish: 7 },
	{ id: 'a9', start: 8, finish: 12 },
	{ id: 'a6', start: 5, finish: 9 },
];

test('CLRS instance: greedy selects {a1, a4, a8, a11} in finish order', () => {
	const { selectedIds, count } = activitySelect(CLRS);
	// CLRS Fig 16.1: earliest finish a1(f=4) → next start>=4 with earliest finish
	// is a4(s=5,f=7) → then a8(s=8,f=11) → then a11(s=12,f=16). Four activities.
	assert.deepEqual(selectedIds, ['a1', 'a4', 'a8', 'a11']);
	assert.equal(count, 4);
});

test('the chosen activities are pairwise compatible (no overlaps)', () => {
	const { selectedIds } = activitySelect(CLRS);
	const byId = new Map(CLRS.map(a => [a.id, a]));
	const chosen = selectedIds.map(id => byId.get(id));
	for (let i = 1; i < chosen.length; i++) {
		// half-open intervals: each start is at or after the previous finish
		assert.ok(
			chosen[i].start >= chosen[i - 1].finish,
			`${chosen[i].id} (start ${chosen[i].start}) overlaps ${chosen[i - 1].id} ` +
				`(finish ${chosen[i - 1].finish})`
		);
	}
});

test('input order does not change the result (sort is internal)', () => {
	const reversed = [...CLRS].reverse();
	const a = activitySelect(CLRS);
	const b = activitySelect(reversed);
	assert.deepEqual(a.selectedIds, b.selectedIds);
	assert.equal(a.count, b.count);
});

test('does not mutate the caller array', () => {
	const snapshot = JSON.stringify(CLRS);
	activitySelect(CLRS);
	assert.equal(JSON.stringify(CLRS), snapshot);
});

test('small hand-traceable instance: earliest finish wins over earliest start', () => {
	// B starts first (0) but finishes late (5); A finishes earliest (2). Greedy
	// must take A first, then C [3,4): {A, C}, NOT the single long B.
	const activities = [
		{ id: 'B', start: 0, finish: 5 },
		{ id: 'A', start: 0, finish: 2 },
		{ id: 'C', start: 3, finish: 4 },
	];
	const { selectedIds, count } = activitySelect(activities);
	assert.deepEqual(selectedIds, ['A', 'C']);
	assert.equal(count, 2);
});

test('touching intervals are compatible (start == previous finish)', () => {
	// [0,2) then [2,4) then [4,6): all three back-to-back activities fit.
	const activities = [
		{ id: 'x', start: 0, finish: 2 },
		{ id: 'y', start: 2, finish: 4 },
		{ id: 'z', start: 4, finish: 6 },
	];
	const { selectedIds, count } = activitySelect(activities);
	assert.deepEqual(selectedIds, ['x', 'y', 'z']);
	assert.equal(count, 3);
});

test('empty input selects nothing', () => {
	const { selectedIds, count } = activitySelect([]);
	assert.deepEqual(selectedIds, []);
	assert.equal(count, 0);
});
