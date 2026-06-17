// Unit tests for tableDoubling — pin the doubling cost model so the derived exam
// answers (foundations-4) can never quietly drift, and prove the amortized-O(1)
// bound (total work < 3n) actually holds.

import test from 'node:test';
import assert from 'node:assert/strict';

import { tableDoubling } from './tableDoubling.js';

// An INDEPENDENT reference simulator (different code path than tableDoubling): it
// tracks size/capacity by hand and accumulates copies at each resize. If the two
// ever disagree, one of them has a bug.
function referenceDoubling(n) {
	let capacity = n === 0 ? 0 : 1;
	let size = 0;
	let copies = 0;
	let resizes = 0;
	for (let i = 0; i < n; i += 1) {
		if (size === capacity) {
			copies += size;
			capacity = capacity === 0 ? 1 : capacity * 2;
			resizes += 1;
		}
		size += 1;
	}
	return { copies, resizes, totalCost: n + copies, capacity };
}

test('hand-checked small case n = 5 (capacities 1,2,4,8)', () => {
	const r = tableDoubling(5);
	assert.equal(r.copies, 7); // 1 + 2 + 4 copied at the three resizes
	assert.equal(r.resizes, 3); // doubled at sizes 1, 2, 4
	assert.equal(r.totalCost, 12); // 5 inserts + 7 copies
	assert.equal(r.capacity, 8); // 1 → 2 → 4 → 8
});

test('hand-checked case n = 10 (the foundations-4 input)', () => {
	const r = tableDoubling(10);
	// Resizes fire at sizes 1, 2, 4, 8 → copies 1 + 2 + 4 + 8 = 15.
	assert.equal(r.copies, 15);
	assert.equal(r.resizes, 4);
	assert.equal(r.totalCost, 25); // 10 inserts + 15 copies
	assert.equal(r.capacity, 16); // 1 → 2 → 4 → 8 → 16
});

test('degenerate inputs n = 0 and n = 1', () => {
	assert.deepEqual(tableDoubling(0), {
		copies: 0,
		resizes: 0,
		totalCost: 0,
		capacity: 0, // nothing allocated for an empty table
	});
	assert.deepEqual(tableDoubling(1), {
		copies: 0, // the first insert into capacity 1 copies nothing
		resizes: 0,
		totalCost: 1,
		capacity: 1,
	});
});

test('copies + n === totalCost (the cost decomposition holds)', () => {
	for (let n = 0; n <= 200; n += 1) {
		const { copies, totalCost } = tableDoubling(n);
		assert.equal(
			copies + n,
			totalCost,
			`n=${n}: copies (${copies}) + n (${n}) must equal totalCost (${totalCost})`
		);
	}
});

test('amortized O(1): totalCost < 3n for every n ≥ 1', () => {
	for (let n = 1; n <= 1000; n += 1) {
		const { totalCost } = tableDoubling(n);
		assert.ok(
			totalCost < 3 * n,
			`n=${n}: totalCost ${totalCost} should be < 3n = ${3 * n} (amortized-O(1) bound)`
		);
	}
});

test('resizes === number of times the capacity doubled (final cap = 2^resizes for n ≥ 1)', () => {
	for (let n = 1; n <= 1024; n += 1) {
		const { resizes, capacity } = tableDoubling(n);
		// Starting at capacity 1, each resize doubles it, so capacity = 2^resizes.
		assert.equal(
			capacity,
			2 ** resizes,
			`n=${n}: capacity ${capacity} should equal 2^resizes = ${2 ** resizes}`
		);
		// And the table is always large enough to hold all n elements, but not
		// wastefully so (previous capacity was too small).
		assert.ok(capacity >= n, `n=${n}: capacity ${capacity} must hold n`);
		assert.ok(
			resizes === 0 || capacity / 2 < n,
			`n=${n}: capacity ${capacity} should be the smallest power of two ≥ n`
		);
	}
});

test('agrees with an independent reference simulator across a range of n', () => {
	for (let n = 0; n <= 300; n += 1) {
		assert.deepEqual(
			tableDoubling(n),
			referenceDoubling(n),
			`n=${n}: tableDoubling disagrees with the reference simulator`
		);
	}
});

test('rejects invalid n', () => {
	assert.throws(() => tableDoubling(-1), RangeError);
	assert.throws(() => tableDoubling(2.5), RangeError);
});
