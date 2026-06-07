import assert from 'node:assert/strict';
import test from 'node:test';
import {
	INFINITY,
	buildStateRows,
	floydWarshall,
	reconstructPath,
	transitiveClosure,
} from './fwTrace.js';

// A graph helper.
const G = (nodeIds, edges) => ({
	nodes: nodeIds.map(id => ({ id })),
	edges,
});

// Every Floyd-Warshall frame must carry a numeric line and a dist matrix so the
// matrix stage + PseudoState rail stay in lockstep with the algorithm.
const assertFwFrameShape = frame => {
	assert.equal(typeof frame.line, 'number', 'frame has a numeric line');
	assert.ok(frame.line >= 0, 'line is 0-based');
	assert.ok(Array.isArray(frame.dist), 'frame has a dist matrix');
	assert.ok(Array.isArray(frame.dist[0]), 'dist is 2-D');
};

// ── Known graph: a CLRS-style digraph with a negative edge but no neg cycle ──
//
//   1→2=3, 1→3=8, 2→4=1, 3→2=4, 4→1=2, 4→3=−5
// Hand-verified all-pairs shortest distances (∞ shown as the null sentinel):
const KNOWN = G(
	['1', '2', '3', '4'],
	[
		{ from: '1', to: '2', weight: 3 },
		{ from: '1', to: '3', weight: 8 },
		{ from: '2', to: '4', weight: 1 },
		{ from: '3', to: '2', weight: 4 },
		{ from: '4', to: '1', weight: 2 },
		{ from: '4', to: '3', weight: -5 },
	]
);
const KNOWN_DIST = [
	[0, 3, -1, 4],
	[3, 0, -4, 1],
	[7, 4, 0, 5],
	[2, -1, -5, 0],
];

test('floydWarshall computes correct all-pairs distances on the known graph', () => {
	const { dist, negativeCycle, ids, n } = floydWarshall(KNOWN);
	assert.equal(n, 4);
	assert.deepEqual(ids, ['1', '2', '3', '4']);
	assert.equal(negativeCycle, false);
	assert.deepEqual(dist, KNOWN_DIST, 'distance matrix matches the hand answer');
});

test('floydWarshall layer 0 is the direct-edge matrix (k = 0, no intermediates)', () => {
	const { layers } = floydWarshall(KNOWN);
	// layers[0] = direct edges: 0 on the diagonal, ∞ where no edge, weight otherwise.
	assert.deepEqual(layers[0], [
		[0, 3, 8, INFINITY],
		[INFINITY, 0, INFINITY, 1],
		[INFINITY, 4, 0, INFINITY],
		[2, INFINITY, -5, 0],
	]);
});

test('floydWarshall produces n+1 layers (k = 0 .. n), each a full V×V matrix', () => {
	const { layers, n } = floydWarshall(KNOWN);
	assert.equal(layers.length, n + 1, 'one layer per k-round plus the k=0 layer');
	layers.forEach(layer => {
		assert.equal(layer.length, n);
		layer.forEach(row => assert.equal(row.length, n));
	});
	// The last layer equals the final distance matrix.
	assert.deepEqual(layers[layers.length - 1], KNOWN_DIST);
});

test('floydWarshall reveals an intermediate improvement only once k allows it', () => {
	const { layers, ids } = floydWarshall(KNOWN);
	const i = ids.indexOf('1');
	const j = ids.indexOf('4');
	// No direct 1→4 edge: ∞ at k = 0.
	assert.equal(layers[0][i][j], INFINITY, 'no direct 1→4 edge');
	// After k = 2 (allowing intermediates {1, 2}), 1→2→4 = 3 + 1 = 4.
	assert.equal(layers[2][i][j], 4, '1→2→4 available once vertex 2 is allowed');
});

test('floydWarshall emits a {line, state} frame per cell + monotonic counters', () => {
	const { frames, n } = floydWarshall(KNOWN);
	frames.forEach(assertFwFrameShape);
	// init + (per k: 1 round-banner + n*n cells) + done.
	const expected = 1 + n * (1 + n * n) + 1;
	assert.equal(frames.length, expected, 'one frame per cell plus banners');
	// Comparison + update counters never decrease across the timeline.
	let lastCompares = 0;
	let lastUpdates = 0;
	frames.forEach(f => {
		assert.ok(f.compares >= lastCompares, 'compares is monotonic');
		assert.ok(f.updates >= lastUpdates, 'updates is monotonic');
		lastCompares = f.compares;
		lastUpdates = f.updates;
	});
	const done = frames[frames.length - 1];
	assert.equal(done.phase, 'done');
	assert.equal(done.compares, n * n * n, 'exactly V³ comparisons (the cost)');
});

test('floydWarshall improving frames mark the write cell + its two read cells', () => {
	const { frames } = floydWarshall(KNOWN);
	const improve = frames.find(f => f.phase === 'improve');
	assert.ok(improve, 'there is at least one improving update');
	assert.ok(Array.isArray(improve.write) && improve.write.length === 2);
	assert.deepEqual(improve.readIK, [improve.i, improve.k], 'reads d[i][k]');
	assert.deepEqual(improve.readKJ, [improve.k, improve.j], 'reads d[k][j]');
	assert.equal(
		improve.candidate,
		improve.dist[improve.i][improve.k] === INFINITY ||
			improve.dist[improve.k][improve.j] === INFINITY
			? INFINITY
			: improve.dist[improve.i][improve.k] + improve.dist[improve.k][improve.j],
		'candidate = d[i][k] + d[k][j]'
	);
});

// ── Predecessor matrix + path reconstruction ──
test('floydWarshall predecessor matrix reconstructs correct shortest paths', () => {
	const { pred, ids } = floydWarshall(KNOWN);
	// 1→3 is shortest via 1→2→4→3 (3 + 1 − 5 = −1), not the direct 1→3 = 8.
	assert.deepEqual(reconstructPath(pred, ids, '1', '3'), ['1', '2', '4', '3']);
	assert.deepEqual(reconstructPath(pred, ids, '1', '4'), ['1', '2', '4']);
	assert.deepEqual(reconstructPath(pred, ids, '1', '1'), ['1']);
});

test('reconstructPath returns null for an unreachable target', () => {
	const lonely = G(
		['1', '2', '3'],
		[{ from: '1', to: '2', weight: 1 }]
	);
	const { pred, ids } = floydWarshall(lonely);
	assert.equal(reconstructPath(pred, ids, '1', '3'), null);
});

// ── Negative-weight cycle detection ──
test('floydWarshall flags a reachable negative-weight cycle', () => {
	const negCycle = G(
		['1', '2', '3', '4'],
		[
			{ from: '1', to: '2', weight: 4 },
			{ from: '2', to: '3', weight: 2 },
			{ from: '3', to: '4', weight: -5 },
			{ from: '4', to: '2', weight: 2 }, // 2→3→4→2 sums to −1
		]
	);
	const { negativeCycle, frames, dist } = floydWarshall(negCycle);
	assert.equal(negativeCycle, true, '2→3→4→2 (sum −1) is a negative cycle');
	// A diagonal entry must have gone below 0.
	assert.ok(
		dist.some((row, i) => row[i] < 0),
		'some d[v][v] dropped below 0'
	);
	assert.equal(frames[frames.length - 1].phase, 'done');
});

test('floydWarshall does NOT false-positive a cycle on a clean graph', () => {
	assert.equal(floydWarshall(KNOWN).negativeCycle, false);
});

// ── Non-negative graph: distances + agreement with the recurrence by hand ──
const SIMPLE = G(
	['A', 'B', 'C', 'D'],
	[
		{ from: 'A', to: 'B', weight: 4 },
		{ from: 'A', to: 'C', weight: 1 },
		{ from: 'C', to: 'B', weight: 2 },
		{ from: 'B', to: 'D', weight: 5 },
		{ from: 'C', to: 'D', weight: 8 },
	]
);

test('floydWarshall: A→B is shortest via C (1 + 2 = 3 beats the direct 4)', () => {
	const { dist, ids, pred } = floydWarshall(SIMPLE);
	const a = ids.indexOf('A');
	const b = ids.indexOf('B');
	assert.equal(dist[a][b], 3, 'A→C→B = 3');
	assert.deepEqual(reconstructPath(pred, ids, 'A', 'B'), ['A', 'C', 'B']);
});

// ── Purity: inputs are never mutated ──
test('floydWarshall does not mutate the input graph', () => {
	const snapshot = JSON.stringify(KNOWN);
	floydWarshall(KNOWN);
	assert.equal(JSON.stringify(KNOWN), snapshot, 'graph untouched');
});

// ── Transitive closure (the boolean twin) ──
test('transitiveClosure computes reachability via the same triple loop', () => {
	const { reach, ids } = transitiveClosure(SIMPLE);
	const at = (from, to) => reach[ids.indexOf(from)][ids.indexOf(to)];
	// A reaches everything; D reaches only itself.
	assert.equal(at('A', 'A'), true, 'a vertex reaches itself');
	assert.equal(at('A', 'B'), true);
	assert.equal(at('A', 'C'), true);
	assert.equal(at('A', 'D'), true);
	assert.equal(at('D', 'A'), false, 'D is a sink — reaches nobody else');
	assert.equal(at('D', 'B'), false);
	assert.equal(at('B', 'A'), false, 'no path B→A');
	assert.equal(at('C', 'D'), true, 'C→D directly and via B');
});

test('transitiveClosure: indirect reachability appears only through an intermediate', () => {
	// 1→2→3: 1 reaches 3 only by hopping through 2.
	const chain = G(
		['1', '2', '3'],
		[
			{ from: '1', to: '2' },
			{ from: '2', to: '3' },
		]
	);
	const { reach, ids, layers } = transitiveClosure(chain);
	const at = (m, from, to) => m[ids.indexOf(from)][ids.indexOf(to)];
	// At k = 0 (adjacency only) 1 cannot yet reach 3.
	assert.equal(at(layers[0], '1', '3'), false, 'no direct 1→3 edge');
	// In the final closure it can.
	assert.equal(at(reach, '1', '3'), true, '1 reaches 3 through 2');
});

test('transitiveClosure produces n+1 boolean layers and a per-cell frame timeline', () => {
	const { layers, frames, n } = transitiveClosure(SIMPLE);
	assert.equal(layers.length, n + 1);
	// init + (per k: 1 round-banner + n*n cells) + done.
	const expected = 1 + n * (1 + n * n) + 1;
	assert.equal(frames.length, expected);
	assert.equal(frames[frames.length - 1].phase, 'done');
	frames.forEach(f => {
		assert.ok(Array.isArray(f.reach), 'closure frame carries a boolean matrix');
		assert.equal(typeof f.line, 'number');
	});
});

test('transitiveClosure does not mutate the input graph', () => {
	const snapshot = JSON.stringify(SIMPLE);
	transitiveClosure(SIMPLE);
	assert.equal(JSON.stringify(SIMPLE), snapshot);
});

// ── buildStateRows (the PseudoState bridge) ──
test('buildStateRows surfaces k, (i,j), the two reads, the candidate, and counts', () => {
	const { frames, ids } = floydWarshall(KNOWN);
	const improve = frames.find(f => f.phase === 'improve');
	const rows = buildStateRows(improve, ids);
	const byId = Object.fromEntries(rows.map(r => [r.id, r.value]));
	assert.ok('k' in byId, 'reports the intermediate vertex k');
	assert.ok('ij' in byId, 'reports (i, j)');
	assert.ok('readIK' in byId && 'readKJ' in byId, 'reports d[i][k] and d[k][j]');
	assert.ok('candidate' in byId, 'reports d[i][k] + d[k][j]');
	assert.ok('updates' in byId, 'reports the running update count');
});

test('buildStateRows is pure and tolerates a null frame', () => {
	assert.deepEqual(buildStateRows(null), []);
	assert.deepEqual(buildStateRows(undefined), []);
});
