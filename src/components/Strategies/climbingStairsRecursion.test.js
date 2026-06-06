import assert from 'node:assert/strict';
import test from 'node:test';
import {
	buildOverlapCensus,
	buildRecursionTree,
	recursionTreeToLevels,
	naiveTotalCalls,
} from './climbingStairsRecursion.js';

// Ground truth for the overlapping-subproblems retrieval check. ways(k) is
// evaluated once per node labelled ways(k) in the naive call tree of ways(n).

test('buildOverlapCensus — ways(5): the famous overlap counts', () => {
	const census = buildOverlapCensus(5);
	const count = k => census.rows.find(r => r.k === k).naive;
	// Hand-verified against the call tree of ways(5):
	//   ways(5) -> ways(4)+ways(3); ways(4)->ways(3)+ways(2); etc.
	assert.equal(count(5), 1, 'root evaluated once');
	assert.equal(count(4), 1);
	assert.equal(count(3), 2, 'ways(3) recomputed twice');
	assert.equal(count(2), 3, 'ways(2) recomputed three times');
	assert.equal(count(1), 5, 'ways(1) base case hit five times');
	assert.equal(count(0), 3, 'ways(0) base case hit three times');
});

test('buildOverlapCensus — memo collapses every subproblem to exactly one', () => {
	const census = buildOverlapCensus(6);
	for (const row of census.rows) {
		assert.equal(row.memo, 1, `ways(${row.k}) is solved once with memoization`);
		assert.ok(row.naive >= 1, `ways(${row.k}) recurs at least once naively`);
	}
	assert.equal(census.memoTotal, census.n + 1, 'memo total = number of subproblems');
});

test('buildOverlapCensus — naive total equals the independent call-count formula', () => {
	// naiveTotalCalls(n) counts ways(...) invocations directly; the census sums
	// per-subproblem evaluation counts. They must agree for every n.
	for (let n = 0; n <= 8; n++) {
		const census = buildOverlapCensus(n);
		assert.equal(
			census.naiveTotal,
			naiveTotalCalls(n),
			`naive total matches for n=${n}`
		);
	}
});

test('buildOverlapCensus — naive grows while memo stays linear (the DP win)', () => {
	const small = buildOverlapCensus(4);
	const big = buildOverlapCensus(6);
	assert.ok(big.naiveTotal > small.naiveTotal, 'naive cost grows fast');
	assert.equal(big.memoTotal, 7, 'memo cost is n+1 = 7 for n=6');
	assert.ok(big.maxNaive >= 2, 'at least one subproblem genuinely overlaps');
});

test('buildRecursionTree — node count equals the naive call count', () => {
	for (let n = 0; n <= 6; n++) {
		const { nodeCount } = buildRecursionTree(n);
		assert.equal(nodeCount, naiveTotalCalls(n), `tree size matches for n=${n}`);
	}
});

test('buildRecursionTree — repeated subproblems are flagged', () => {
	const { root } = buildRecursionTree(5);
	assert.equal(root.k, 5);
	assert.equal(root.isRepeated, false, 'the root subproblem appears once');
	// Collect every node and check the isRepeated flag tracks the census.
	const census = buildOverlapCensus(5);
	const naiveByK = Object.fromEntries(census.rows.map(r => [r.k, r.naive]));
	const visit = node => {
		assert.equal(
			node.isRepeated,
			naiveByK[node.k] > 1,
			`ways(${node.k}) repeated flag matches census`
		);
		node.children.forEach(visit);
	};
	visit(root);
});

test('buildRecursionTree — base cases have no children', () => {
	const { root } = buildRecursionTree(4);
	const visit = node => {
		if (node.k <= 1) {
			assert.equal(node.children.length, 0, 'base case is a leaf');
			assert.equal(node.isBase, true);
		} else {
			assert.equal(node.children.length, 2, 'recursive case has two children');
		}
		node.children.forEach(visit);
	};
	visit(root);
});

test('recursionTreeToLevels — groups nodes by depth, root alone at depth 0', () => {
	const { root } = buildRecursionTree(4);
	const levels = recursionTreeToLevels(root);
	assert.equal(levels[0].length, 1, 'one root at depth 0');
	assert.equal(levels[0][0].k, 4);
	const total = levels.reduce((s, lvl) => s + lvl.length, 0);
	assert.equal(total, naiveTotalCalls(4), 'every node is placed on a level');
});
