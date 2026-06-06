import assert from 'node:assert/strict';
import test from 'node:test';
import {
	countLeaves,
	decisionTree,
	factorial,
	flattenLevels,
	log2Factorial,
	lowerBound,
	permutations,
	treeHeight,
} from './decisionTree.js';

test('factorial computes exact small factorials and rejects bad input', () => {
	assert.equal(factorial(0), 1);
	assert.equal(factorial(1), 1);
	assert.equal(factorial(3), 6);
	assert.equal(factorial(5), 120);
	assert.ok(Number.isNaN(factorial(-1)));
	assert.ok(Number.isNaN(factorial(1.5)));
});

test('permutations enumerates every ordering with no duplicates', () => {
	const perms = permutations(['a', 'b', 'c']);
	assert.equal(perms.length, 6, '3! = 6 orderings');
	const joined = perms.map(p => p.join(''));
	assert.equal(new Set(joined).size, 6, 'all orderings are distinct');
	// Every element appears once per permutation.
	perms.forEach(p => assert.deepEqual([...p].sort(), ['a', 'b', 'c']));
});

test('log2Factorial matches log2 of the exact factorial for small n', () => {
	for (let n = 2; n <= 8; n += 1) {
		assert.ok(
			Math.abs(log2Factorial(n) - Math.log2(factorial(n))) < 1e-9,
			`log2(${n}!) consistent`
		);
	}
});

test('lowerBound: 3 items need 3 comparisons (ceil log2 6)', () => {
	const b = lowerBound(3);
	assert.equal(b.leaves, 6, 'tree must reach 3! = 6 leaves');
	assert.equal(b.minComparisons, 3, 'ceil(log2 6) = 3');
	// 2^2 = 4 < 6, so height 2 is impossible; 2^3 = 8 ≥ 6 is enough.
	assert.ok(b.maxLeavesAtHeight(2) < b.leaves, 'height 2 cannot hold 6 leaves');
	assert.ok(b.maxLeavesAtHeight(3) >= b.leaves, 'height 3 can hold 6 leaves');
});

test('lowerBound minComparisons is the smallest h with 2^h >= n!', () => {
	for (let n = 1; n <= 10; n += 1) {
		const b = lowerBound(n);
		const h = b.minComparisons;
		assert.ok(2 ** h >= b.leaves, `2^${h} >= ${n}!`);
		if (h > 0) {
			assert.ok(2 ** (h - 1) < b.leaves, `2^${h - 1} < ${n}! (h is minimal)`);
		}
	}
});

test('decisionTree(3) builds an optimal tree: 6 leaves, height 3', () => {
	const { root, leaves, bound } = decisionTree(['a', 'b', 'c']);
	assert.ok(root, 'a concrete tree exists for n=3');
	assert.equal(leaves.length, 6, 'six sorted-order leaves');
	assert.equal(countLeaves(root), 6, 'the tree reaches all 6 permutations');
	assert.equal(treeHeight(root), 3, 'optimal height equals the bound');
	assert.equal(treeHeight(root), bound.minComparisons, 'height == bound');
});

test('decisionTree(3) leaves cover every permutation exactly once', () => {
	const { root } = decisionTree(['a', 'b', 'c']);
	const found = [];
	const walk = nd => {
		if (!nd) return;
		if (nd.kind === 'leaf') found.push(nd.order);
		walk(nd.yes);
		walk(nd.no);
	};
	walk(root);
	const expected = permutations(['a', 'b', 'c']).map(p => p.join('<'));
	assert.deepEqual(found.sort(), expected.sort(), 'leaves == permutations');
});

test('decisionTree for n != 3 still returns leaves + bound (no explicit tree)', () => {
	const { root, leaves, bound } = decisionTree(['a', 'b', 'c', 'd']);
	assert.equal(root, null, 'no hand-built tree beyond n=3');
	assert.equal(leaves.length, 24, '4! = 24 orderings');
	assert.equal(bound.minComparisons, 5, 'ceil(log2 24) = 5');
});

test('flattenLevels groups nodes by depth for row-by-row rendering', () => {
	const { root } = decisionTree(['a', 'b', 'c']);
	const levels = flattenLevels(root);
	assert.equal(levels[0].length, 1, 'one root at depth 0');
	assert.equal(levels[0][0].kind, 'compare');
	// Total nodes across levels equals the whole tree.
	const total = levels.reduce((sum, lvl) => sum + lvl.length, 0);
	assert.equal(total, countLeaves(root) + 5, 'internal + leaf nodes accounted');
});

test('treeHeight and countLeaves handle the empty tree', () => {
	assert.equal(treeHeight(null), -1);
	assert.equal(countLeaves(null), 0);
});
