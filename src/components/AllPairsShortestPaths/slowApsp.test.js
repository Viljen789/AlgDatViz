// slowApsp.test.js — unit tests for the Slow-APSP min-plus matrix recurrence.
//
// THE CRITICAL CROSS-CHECK. Slow-APSP and Floyd-Warshall compute the SAME object
// (the all-pairs shortest-distance matrix) by different routes — one grows the
// edge count via repeated min-plus products, the other grows the intermediate
// set in place. So the strongest possible correctness witness is: on the same
// graph, slowApsp(g).dist (= L^(n−1)) must EQUAL floydWarshall(g).dist. We assert
// exactly that on several small directed weighted graphs. We also pin the
// indexing contract (layers[0] === W) and the layer dimensions.
//
// One representation wrinkle: fwTrace.js uses `null` for ∞, slowApsp.js uses
// `Infinity`. `norm` maps both to the string '∞' before the deep-equal so the
// two matrices are compared on value, not on sentinel choice.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
	slowApsp,
	extendShortestPaths,
	weightMatrix,
	INFINITY,
} from './slowApsp.js';
import { floydWarshall } from './fwTrace.js';

// Normalize a matrix for cross-representation comparison: null (fwTrace's ∞) and
// Infinity (slowApsp's ∞) both become '∞'; finite numbers pass through.
const norm = m =>
	m.map(row =>
		row.map(v => (v === null || v === INFINITY || v === Infinity ? '∞' : v))
	);

// ── Test graphs (directed, weighted; node order fixes the matrix index) ──

// G1: a 4-vertex digraph with a NEGATIVE edge and an indirect shortest path, but
// no negative cycle (the CLRS-flavoured shape). 1→3 is 8 directly but only −1 via
// 1→2→4→3 (3 + 1 − 5) — so multiple ∞/indirect cells exercise the product.
const G1 = {
	nodes: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }],
	edges: [
		{ from: '1', to: '2', weight: 3 },
		{ from: '1', to: '3', weight: 8 },
		{ from: '2', to: '4', weight: 1 },
		{ from: '3', to: '2', weight: 4 },
		{ from: '4', to: '1', weight: 2 },
		{ from: '4', to: '3', weight: -5 },
	],
};

// G2: a 5-vertex non-negative digraph where several pairs (e.g. 1→5) have NO
// direct edge and must be assembled from up to four edges — stresses that L^(m)
// keeps improving as m grows toward n−1.
const G2 = {
	nodes: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }],
	edges: [
		{ from: '1', to: '2', weight: 4 },
		{ from: '1', to: '3', weight: 11 },
		{ from: '2', to: '3', weight: 2 },
		{ from: '2', to: '4', weight: 7 },
		{ from: '3', to: '4', weight: 1 },
		{ from: '3', to: '5', weight: 5 },
		{ from: '4', to: '5', weight: 3 },
		{ from: '5', to: '1', weight: 6 },
		{ from: '4', to: '1', weight: 2 },
	],
};

// G3: a small 4-vertex graph with disconnected pieces — some pairs stay ∞ forever
// (vertex D is a sink reachable from nobody but itself). Confirms ∞ survives the
// product and matches Floyd-Warshall's ∞ (null) cells.
const G3 = {
	nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }],
	edges: [
		{ from: 'A', to: 'B', weight: 2 },
		{ from: 'B', to: 'C', weight: 3 },
		{ from: 'A', to: 'C', weight: 10 },
		{ from: 'C', to: 'D', weight: 1 },
	],
};

const GRAPHS = { G1, G2, G3 };

// ── The cross-check: Slow-APSP's final layer === Floyd-Warshall's distances ──

for (const [name, g] of Object.entries(GRAPHS)) {
	test(`[${name}] slowApsp.dist (L^(n−1)) equals Floyd-Warshall's distance matrix`, () => {
		const slow = slowApsp(g);
		const fw = floydWarshall(g);
		assert.deepEqual(slow.ids, fw.ids, 'node-id / matrix order must match');
		assert.deepEqual(
			norm(slow.dist),
			norm(fw.dist),
			`Slow-APSP and Floyd-Warshall disagree on ${name}`
		);
	});
}

// ── The indexing contract + dimensions ──

test('layers[0] === L^(1) === W (the weight matrix)', () => {
	const { W, layers } = slowApsp(G1);
	assert.deepEqual(layers[0], W, 'layers[0] must be exactly the weight matrix');
});

test('W has 0 on the diagonal, edge weights off it, ∞ where no edge', () => {
	const { W } = slowApsp(G1);
	// ids order is ['1','2','3','4'] → indices 0..3.
	assert.equal(W[0][0], 0); // diagonal
	assert.equal(W[0][1], 3); // 1→2
	assert.equal(W[3][2], -5); // 4→3 (negative edge preserved)
	assert.equal(W[1][0], Infinity); // no 2→1 edge
});

test('layers has length n−1 and every layer is n×n', () => {
	const { n, layers, dist } = slowApsp(G2); // n = 5
	assert.equal(layers.length, n - 1, 'expected L^(1)..L^(n−1) ⇒ n−1 layers');
	for (const L of layers) {
		assert.equal(L.length, n);
		for (const row of L) assert.equal(row.length, n);
	}
	// dist is an independent copy of the last layer L^(n−1).
	assert.deepEqual(dist, layers[layers.length - 1]);
	assert.notStrictEqual(
		dist,
		layers[layers.length - 1],
		'dist must be a copy, not the same ref'
	);
});

// ── L^(m) is monotone: extending paths can only lower (or hold) a distance ──

test('each L^(m) dominates L^(m−1) entrywise (distances never increase)', () => {
	const { layers } = slowApsp(G2);
	for (let m = 1; m < layers.length; m++) {
		const prev = layers[m - 1];
		const cur = layers[m];
		for (let i = 0; i < prev.length; i++) {
			for (let j = 0; j < prev.length; j++) {
				assert.ok(
					cur[i][j] <= prev[i][j],
					`L^(${m + 1})[${i}][${j}] = ${cur[i][j]} should be ≤ L^(${m})[${i}][${j}] = ${prev[i][j]}`
				);
			}
		}
	}
});

// ── extendShortestPaths in isolation: one min-plus product ──

test('extendShortestPaths computes min over k of (A[i][k] + W[k][j]); ∞ poisons', () => {
	// A 1→2→3 chain. W: 1→2 = 5, 2→3 = 4, no other edges.
	const W = [
		[0, 5, Infinity],
		[Infinity, 0, 4],
		[Infinity, Infinity, 0],
	];
	const L2 = extendShortestPaths(W, W); // = W ⊗ W = L^(2)
	assert.equal(L2[0][2], 9, '1→2→3 = 5 + 4 = 9 should appear at ≤ 2 edges');
	assert.equal(L2[2][0], Infinity, '3 reaches nobody: stays ∞');
	assert.equal(L2[0][0], 0, 'diagonal stays 0');
});

// ── L^(1) for a 2-vertex graph is already the answer (≤ 1 edge spans all pairs) ──

test('n ≤ 2: the only layer is L^(1) = W and dist === W', () => {
	const tiny = {
		nodes: [{ id: 'x' }, { id: 'y' }],
		edges: [{ from: 'x', to: 'y', weight: 7 }],
	};
	const { layers, dist, W } = slowApsp(tiny);
	assert.equal(layers.length, 1, 'n−1 = 1 layer');
	assert.deepEqual(dist, W);
	// And it agrees with Floyd-Warshall.
	assert.deepEqual(norm(dist), norm(floydWarshall(tiny).dist));
});

// ── weightMatrix accepts the {vertices} shape too (some generators use it) ──

test('weightMatrix accepts {vertices} as well as {nodes}', () => {
	const viaVertices = weightMatrix({
		vertices: [{ id: 'p' }, { id: 'q' }],
		edges: [{ from: 'p', to: 'q', weight: 2 }],
	});
	assert.deepEqual(viaVertices.ids, ['p', 'q']);
	assert.equal(viaVertices.W[0][1], 2);
	assert.equal(viaVertices.W[1][0], Infinity);
});
