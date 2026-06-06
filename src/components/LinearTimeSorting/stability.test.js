import assert from 'node:assert/strict';
import test from 'node:test';
import {
	label,
	makeRecords,
	preservesInputOrder,
	radixWithSubroutine,
	stabilityDemo,
	stableSortByKey,
	unstableSortByKey,
} from './stability.js';

test('makeRecords tags records by input position', () => {
	const recs = makeRecords([3, 1, 3]);
	assert.deepEqual(
		recs.map(label),
		['3a', '1b', '3c'],
		'tags a,b,c track original slots'
	);
});

test('stableSortByKey keeps equal keys in input order', () => {
	const input = makeRecords([3, 1, 3, 1]); // 3a 1b 3c 1d
	const out = stableSortByKey(input).map(label);
	// 1s before 3s; within ties, original order (b before d, a before c).
	assert.deepEqual(out, ['1b', '1d', '3a', '3c']);
});

test('unstableSortByKey reorders equal keys', () => {
	const input = makeRecords([3, 1, 3, 1]); // 3a 1b 3c 1d
	const out = unstableSortByKey(input).map(label);
	// Keys still ascend, but ties are reversed: 1d before 1b, 3c before 3a.
	assert.deepEqual(out, ['1d', '1b', '3c', '3a']);
});

test('preservesInputOrder is the operational test of stability', () => {
	const input = makeRecords([3, 1, 3, 1]);
	assert.equal(preservesInputOrder(input, stableSortByKey(input)), true);
	assert.equal(preservesInputOrder(input, unstableSortByKey(input)), false);
});

test('stabilityDemo reports stable preserves order, unstable does not', () => {
	const demo = stabilityDemo([3, 1, 3, 1]);
	assert.equal(demo.stablePreserves, true);
	assert.equal(demo.unstablePreserves, false);
	// Both variants must still produce a key-sorted result.
	const keys = arr => arr.map(r => r.key);
	assert.deepEqual(keys(demo.stable), [1, 1, 3, 3]);
	assert.deepEqual(keys(demo.unstable), [1, 1, 3, 3]);
});

test('radix with a STABLE per-digit subroutine sorts correctly', () => {
	const values = [21, 12, 11, 22, 13];
	const run = radixWithSubroutine(values, true);
	assert.equal(run.sorted, true, 'final array is non-decreasing');
	assert.deepEqual(run.result, [11, 12, 13, 21, 22]);
	assert.equal(run.passes.length, 2, 'two-digit numbers → ones + tens passes');
});

test('radix with an UNSTABLE per-digit subroutine breaks the final order', () => {
	// Crafted so the tens pass scrambles the ones-pass ordering.
	const values = [21, 12, 11, 22, 13];
	const run = radixWithSubroutine(values, false);
	assert.equal(
		run.sorted,
		false,
		'an unstable per-digit pass destroys radix correctness'
	);
});

test('radixWithSubroutine records before/after for each pass', () => {
	const run = radixWithSubroutine([21, 12], true);
	run.passes.forEach(pass => {
		assert.ok(Array.isArray(pass.before));
		assert.ok(Array.isArray(pass.after));
		assert.equal(pass.before.length, pass.after.length);
		assert.equal(typeof pass.label, 'string');
	});
	assert.equal(run.passes[0].label, 'ones');
	assert.equal(run.passes[1].label, 'tens');
});
