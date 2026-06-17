// iterativeRecurrence.test.js — the unroller must agree with the KNOWN closed
// forms. The whole point of deriving a numeric exam key by unrolling is that it
// can only ever be what iteration produces, so these tests pin the unroller
// against the two closed forms the exam set leans on.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
	unrollRecurrence,
	gPow2,
	gLinear,
} from './iterativeRecurrence.js';

// T(1) = 1, T(n) = T(n-1) + 2^(n-1)  ⇒  T(n) = 2^n − 1.
test('unrollRecurrence — 2^(k-1) sum matches the closed form 2^n − 1', () => {
	for (let n = 1; n <= 12; n += 1) {
		const { value } = unrollRecurrence({ baseN: 1, baseVal: 1, g: gPow2, n });
		assert.equal(value, 2 ** n - 1, `T(${n}) should be 2^${n} − 1`);
	}
});

// T(1) = 1, T(n) = T(n-1) + n  ⇒  T(n) = n(n+1)/2 (triangular numbers).
test('unrollRecurrence — g(k)=k sum matches the closed form n(n+1)/2', () => {
	for (let n = 1; n <= 12; n += 1) {
		const { value } = unrollRecurrence({
			baseN: 1,
			baseVal: 1,
			g: gLinear,
			n,
		});
		assert.equal(value, (n * (n + 1)) / 2, `T(${n}) should be n(n+1)/2`);
	}
});

// The per-step trace is the iteration method made explicit: one step per k from
// baseN+1..n, each carrying the added cost and the running partial T(k).
test('unrollRecurrence — steps record one entry per unrolled index', () => {
	const { value, steps } = unrollRecurrence({
		baseN: 1,
		baseVal: 1,
		g: gPow2,
		n: 8,
	});
	assert.equal(steps.length, 7); // k = 2..8
	assert.equal(steps[0].k, 2);
	assert.equal(steps[0].gk, gPow2(2)); // 2^1 = 2
	assert.equal(steps.at(-1).k, 8);
	assert.equal(steps.at(-1).partial, value); // last partial IS T(n)
	assert.equal(value, 2 ** 8 - 1); // 255
});

// n = baseN returns the base value untouched (no steps to unroll).
test('unrollRecurrence — n === baseN is the base case (no steps)', () => {
	const { value, steps } = unrollRecurrence({
		baseN: 1,
		baseVal: 1,
		g: gPow2,
		n: 1,
	});
	assert.equal(value, 1);
	assert.equal(steps.length, 0);
});

// Guard: solving below the base index is a usage error, not a silent 0.
test('unrollRecurrence — n < baseN throws', () => {
	assert.throws(
		() => unrollRecurrence({ baseN: 1, baseVal: 1, g: gPow2, n: 0 }),
		RangeError
	);
});
