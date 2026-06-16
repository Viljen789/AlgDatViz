import assert from 'node:assert/strict';
import test from 'node:test';
import { topoSort, isValidTopoOrder } from './topoSort.js';

// ── DAG 1: a small DAG with two simultaneous sources (a, b) ────────────────────
//
//   a → c   a → d   b → c   c → e   d → e
//
// In-degrees: a=0, b=0, c=2 (a,b), d=1 (a), e=2 (c,d).
// Kahn, smallest-id first:
//   ready {a,b} → a · removes a: c=1, d=0 · ready {b,d} → b · removes b: c=0
//   · ready {c,d} → c · removes c: e=1 · ready {d} → d · removes d: e=0
//   · ready {e} → e.  Order = a, b, c, d, e.
const DAG1_VERTICES = ['a', 'b', 'c', 'd', 'e'];
const DAG1_EDGES = [
	{ from: 'a', to: 'c' },
	{ from: 'a', to: 'd' },
	{ from: 'b', to: 'c' },
	{ from: 'c', to: 'e' },
	{ from: 'd', to: 'e' },
];

test('DAG1: Kahn emits the smallest-id-first topological order', () => {
	const { order, hasCycle } = topoSort(DAG1_VERTICES, DAG1_EDGES);
	assert.equal(hasCycle, false);
	assert.deepEqual(order, ['a', 'b', 'c', 'd', 'e']);
});

test('DAG1: in-degrees are the original incoming-edge counts', () => {
	const { indegree } = topoSort(DAG1_VERTICES, DAG1_EDGES);
	assert.deepEqual(indegree, { a: 0, b: 0, c: 2, d: 1, e: 2 });
});

test('DAG1: the emitted order is a valid topological order', () => {
	const { order } = topoSort(DAG1_VERTICES, DAG1_EDGES);
	assert.equal(isValidTopoOrder(order, DAG1_EDGES), true);
});

// ── DAG 2: numeric-aware tie-break ('2' must precede '10') ─────────────────────
//
//   2 → 10   3 → 10   2 → 3
//
// In-degrees: 2=0, 3=1 (from 2), 10=2 (from 2,3).
// Kahn: ready {2} → 2 · removes 2: 3=0, 10=1 · ready {3} → 3 · removes 3: 10=0
//   · ready {10} → 10.  Order = 2, 3, 10 (NOT 2, 10, 3 — numeric tie-break).
const DAG2_VERTICES = ['2', '3', '10'];
const DAG2_EDGES = [
	{ from: '2', to: '10' },
	{ from: '3', to: '10' },
	{ from: '2', to: '3' },
];

test('DAG2: ties break numerically so 3 precedes 10', () => {
	const { order, indegree, hasCycle } = topoSort(DAG2_VERTICES, DAG2_EDGES);
	assert.equal(hasCycle, false);
	assert.deepEqual(order, ['2', '3', '10']);
	assert.equal(indegree['10'], 2);
});

// ── { u, v } edge shape is accepted as well as { from, to } ────────────────────
test('topoSort accepts the { u, v } edge shape', () => {
	const edges = [
		{ u: 'a', v: 'c' },
		{ u: 'a', v: 'd' },
		{ u: 'b', v: 'c' },
		{ u: 'c', v: 'e' },
		{ u: 'd', v: 'e' },
	];
	const { order, indegree } = topoSort(DAG1_VERTICES, edges);
	assert.deepEqual(order, ['a', 'b', 'c', 'd', 'e']);
	assert.deepEqual(indegree, { a: 0, b: 0, c: 2, d: 1, e: 2 });
});

// ── A directed cycle has NO topological order ──────────────────────────────────
//
//   p → q   q → r   r → p     (every vertex stays in-degree 1; none frees)
const CYCLE_VERTICES = ['p', 'q', 'r'];
const CYCLE_EDGES = [
	{ from: 'p', to: 'q' },
	{ from: 'q', to: 'r' },
	{ from: 'r', to: 'p' },
];

test('a directed cycle is detected and yields an empty partial order', () => {
	const { order, indegree, hasCycle } = topoSort(CYCLE_VERTICES, CYCLE_EDGES);
	assert.equal(hasCycle, true);
	assert.deepEqual(order, []); // nothing is ever in-degree 0
	assert.deepEqual(indegree, { p: 1, q: 1, r: 1 });
});

test('a partial cycle still emits the acyclic prefix, then gets stuck', () => {
	// s → p starts the line; p,q,r form the same 3-cycle. Only s is free.
	const vertices = ['s', 'p', 'q', 'r'];
	const edges = [{ from: 's', to: 'p' }, ...CYCLE_EDGES];
	const { order, hasCycle } = topoSort(vertices, edges);
	assert.equal(hasCycle, true);
	assert.deepEqual(order, ['s']); // s emits, then p/q/r block on the cycle
});

// ── isValidTopoOrder rejects bad candidates ────────────────────────────────────
test('isValidTopoOrder rejects an order with a backward edge', () => {
	// Swap c and e: now c → e points backward.
	const bad = ['a', 'b', 'e', 'd', 'c'];
	assert.equal(isValidTopoOrder(bad, DAG1_EDGES), false);
});

test('isValidTopoOrder rejects an order missing a vertex', () => {
	const incomplete = ['a', 'b', 'c', 'd']; // e is absent
	assert.equal(isValidTopoOrder(incomplete, DAG1_EDGES), false);
});
