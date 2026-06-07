import assert from 'node:assert/strict';
import test from 'node:test';
import {
	INFINITY,
	bellmanFordTrace,
	buildSsspTrace,
	buildStateRows,
	dagShortestPathsTrace,
	dijkstraTrace,
	reconstructPath,
	relax,
	topologicalOrder,
} from './relaxTrace.js';

// A node list helper.
const G = (nodeIds, edges) => ({
	nodes: nodeIds.map(id => ({ id })),
	edges,
});

// Every frame must carry a 0-based pseudocode line and dist/pred maps so the
// stage + PseudoState rail stay in lockstep with the algorithm.
const assertFrameShape = frame => {
	assert.equal(typeof frame.line, 'number', 'frame has a numeric line');
	assert.ok(frame.line >= 0, 'line is 0-based');
	assert.equal(typeof frame.dist, 'object', 'frame has a dist map');
	assert.equal(typeof frame.pred, 'object', 'frame has a pred map');
};

// ── The Relax primitive (the centerpiece) ──

test('relax improves dist[v] and sets pred[v] when the edge is shorter', () => {
	const dist = { A: 0, B: INFINITY };
	const pred = { A: null, B: null };
	const frames = [];
	const counter = { relaxations: 0, improvements: 0 };
	const improved = relax(
		{ from: 'A', to: 'B', weight: 5 },
		{ dist, pred, frames, counter, driver: 'bellmanFord' }
	);
	assert.equal(improved, true);
	assert.equal(dist.B, 5, 'dist[B] = dist[A] + w');
	assert.equal(pred.B, 'A', 'pred[B] = u');
	assert.equal(counter.relaxations, 1);
	assert.equal(counter.improvements, 1);
	assert.equal(frames.length, 1);
	assert.equal(frames[0].phase, 'relax-improve');
});

test('relax leaves dist/pred untouched when the edge does not improve', () => {
	const dist = { A: 0, B: 3 };
	const pred = { A: null, B: 'X' };
	const frames = [];
	const counter = { relaxations: 0, improvements: 0 };
	const improved = relax(
		{ from: 'A', to: 'B', weight: 10 },
		{ dist, pred, frames, counter, driver: 'dijkstra' }
	);
	assert.equal(improved, false);
	assert.equal(dist.B, 3, 'dist[B] unchanged');
	assert.equal(pred.B, 'X', 'pred[B] unchanged');
	assert.equal(counter.improvements, 0);
	assert.equal(frames[0].phase, 'relax-keep');
});

test('relax treats ∞ (null) as +infinity — an unreachable u cannot improve v', () => {
	const dist = { A: INFINITY, B: 7 };
	const pred = { A: null, B: null };
	const frames = [];
	const counter = { relaxations: 0, improvements: 0 };
	const improved = relax(
		{ from: 'A', to: 'B', weight: 1 },
		{ dist, pred, frames, counter, driver: 'bellmanFord' }
	);
	assert.equal(improved, false, '∞ + w is still ∞, not < 7');
	assert.equal(dist.B, 7);
});

// ── Known graph: distances must match a hand-computed answer ──
//
// Directed graph (CLRS-style), source S:
//   S→A=10, S→C=3, C→A=4, A→C=1?  — keep it acyclic-ish for cross-checks.
// We use a graph whose single-source distances are easy to verify by hand.
//
//        (10)        (1)
//   S ───────► A ───────► B
//   │ \                   ▲
//(3)│  \(? none)          │ (?)
//   ▼                     │
//   C ───────────────────►D
//        (2)        (8)? — compute below.
//
// Concrete edges + expected distances:
const KNOWN = G(
	['S', 'A', 'B', 'C', 'D'],
	[
		{ from: 'S', to: 'A', weight: 10 },
		{ from: 'S', to: 'C', weight: 3 },
		{ from: 'C', to: 'A', weight: 4 }, // S→C→A = 7 beats S→A = 10
		{ from: 'C', to: 'D', weight: 2 }, // S→C→D = 5
		{ from: 'A', to: 'B', weight: 1 }, // S→C→A→B = 8
		{ from: 'D', to: 'B', weight: 8 }, // S→C→D→B = 13 (worse than 8)
	]
);
// Hand-computed shortest distances from S:
//   S=0, C=3, D=5, A=7 (via C), B=8 (via C→A).
const KNOWN_DIST = { S: 0, A: 7, B: 8, C: 3, D: 5 };

const assertDistEquals = (got, expected) => {
	for (const id of Object.keys(expected)) {
		const g = got[id] === INFINITY ? '∞' : got[id];
		assert.equal(got[id], expected[id], `dist[${id}] = ${expected[id]} (got ${g})`);
	}
};

test('bellmanFordTrace computes correct distances on the known graph', () => {
	const { frames, dist, negativeCycle } = bellmanFordTrace(KNOWN, { source: 'S' });
	frames.forEach(assertFrameShape);
	assert.equal(negativeCycle, false);
	assertDistEquals(dist, KNOWN_DIST);
});

test('dijkstraTrace computes correct distances on the known graph (non-negative)', () => {
	const { frames, dist, hasNegative } = dijkstraTrace(KNOWN, { source: 'S' });
	frames.forEach(assertFrameShape);
	assert.equal(hasNegative, false);
	assertDistEquals(dist, KNOWN_DIST);
});

test('dagShortestPathsTrace computes correct distances on the known DAG', () => {
	const { frames, dist, hasCycle, order } = dagShortestPathsTrace(KNOWN, {
		source: 'S',
	});
	frames.forEach(assertFrameShape);
	assert.equal(hasCycle, false, 'the known graph is a DAG');
	// S must come before everything reachable from it; C before A and D.
	assert.ok(order.indexOf('S') < order.indexOf('C'));
	assert.ok(order.indexOf('C') < order.indexOf('A'));
	assert.ok(order.indexOf('C') < order.indexOf('D'));
	assertDistEquals(dist, KNOWN_DIST);
});

test('all three drivers agree on the known graph (Relax is the shared core)', () => {
	const bf = bellmanFordTrace(KNOWN, { source: 'S' }).dist;
	const dag = dagShortestPathsTrace(KNOWN, { source: 'S' }).dist;
	const dij = dijkstraTrace(KNOWN, { source: 'S' }).dist;
	assert.deepEqual(bf, dag, 'Bellman-Ford and DAG-SP agree');
	assert.deepEqual(bf, dij, 'Bellman-Ford and Dijkstra agree');
});

// ── Negative edges: a DAG with a negative edge ──
//
// DAG-SP and Bellman-Ford handle negatives; this verifies the result is still
// correct when a shorter route uses a negative edge.
const NEG_DAG = G(
	['S', 'A', 'B', 'T'],
	[
		{ from: 'S', to: 'A', weight: 5 },
		{ from: 'S', to: 'B', weight: 2 },
		{ from: 'A', to: 'T', weight: 1 },
		{ from: 'B', to: 'A', weight: -4 }, // S→B→A = -2 beats S→A = 5
		{ from: 'B', to: 'T', weight: 7 },
	]
);
// S=0, B=2, A=-2 (via B), T=-1 (via B→A→T).
const NEG_DAG_DIST = { S: 0, A: -2, B: 2, T: -1 };

test('bellmanFordTrace handles negative edges in a DAG correctly', () => {
	const { dist, negativeCycle } = bellmanFordTrace(NEG_DAG, { source: 'S' });
	assert.equal(negativeCycle, false);
	assertDistEquals(dist, NEG_DAG_DIST);
});

test('dagShortestPathsTrace handles negative edges (no cycles) correctly', () => {
	const { dist, hasCycle } = dagShortestPathsTrace(NEG_DAG, { source: 'S' });
	assert.equal(hasCycle, false);
	assertDistEquals(dist, NEG_DAG_DIST);
});

// ── Negative-weight CYCLE detection (Bellman-Ford's job) ──
const NEG_CYCLE = G(
	['S', 'A', 'B', 'C'],
	[
		{ from: 'S', to: 'A', weight: 1 },
		{ from: 'A', to: 'B', weight: 1 },
		{ from: 'B', to: 'C', weight: -3 },
		{ from: 'C', to: 'A', weight: 1 }, // A→B→C→A sums to -1: a negative cycle
	]
);

test('bellmanFordTrace detects a reachable negative-weight cycle', () => {
	const { frames, negativeCycle } = bellmanFordTrace(NEG_CYCLE, { source: 'S' });
	assert.equal(negativeCycle, true, 'A→B→C→A (sum -1) is a negative cycle');
	const cycleFrame = frames.find(f => f.negativeCycle);
	assert.ok(cycleFrame, 'a frame flags the cycle');
	assert.equal(cycleFrame.phase, 'cycle');
});

test('bellmanFordTrace does NOT false-positive a cycle on a clean graph', () => {
	const { negativeCycle } = bellmanFordTrace(KNOWN, { source: 'S' });
	assert.equal(negativeCycle, false);
});

// ── DAG-SP refuses a cyclic graph ──
test('dagShortestPathsTrace reports hasCycle when the graph is not a DAG', () => {
	const cyclic = G(
		['X', 'Y'],
		[
			{ from: 'X', to: 'Y', weight: 1 },
			{ from: 'Y', to: 'X', weight: 1 },
		]
	);
	const { hasCycle, frames } = dagShortestPathsTrace(cyclic, { source: 'X' });
	assert.equal(hasCycle, true);
	assert.equal(frames[0].phase, 'cycle');
});

// ── topologicalOrder ──
test('topologicalOrder returns a valid order for a DAG and flags cycles', () => {
	const { order, hasCycle } = topologicalOrder(KNOWN);
	assert.equal(hasCycle, false);
	assert.equal(order.length, 5);
	// Every edge must go forward in the order.
	KNOWN.edges.forEach(e => {
		assert.ok(
			order.indexOf(e.from) < order.indexOf(e.to),
			`edge ${e.from}→${e.to} respects the topo order`
		);
	});
	assert.equal(topologicalOrder(NEG_CYCLE).hasCycle, true);
});

// ── Predecessor subgraph / path reconstruction ──
test('reconstructPath rebuilds the shortest path from the pred map', () => {
	const { pred } = bellmanFordTrace(KNOWN, { source: 'S' });
	assert.deepEqual(reconstructPath(pred, 'S', 'B'), ['S', 'C', 'A', 'B']);
	assert.deepEqual(reconstructPath(pred, 'S', 'D'), ['S', 'C', 'D']);
	assert.deepEqual(reconstructPath(pred, 'S', 'S'), ['S']);
});

test('reconstructPath returns null for an unreachable target', () => {
	const lonely = G(
		['S', 'A', 'Z'],
		[{ from: 'S', to: 'A', weight: 1 }]
	);
	const { pred } = bellmanFordTrace(lonely, { source: 'S' });
	assert.equal(reconstructPath(pred, 'S', 'Z'), null);
});

// ── Purity: inputs are never mutated ──
test('drivers do not mutate the input graph', () => {
	const snapshot = JSON.stringify(KNOWN);
	bellmanFordTrace(KNOWN, { source: 'S' });
	dagShortestPathsTrace(KNOWN, { source: 'S' });
	dijkstraTrace(KNOWN, { source: 'S' });
	assert.equal(JSON.stringify(KNOWN), snapshot, 'graph untouched');
});

// ── Dijkstra's blind spot on negatives (teaching: why it needs non-negative) ──
test('dijkstraTrace flags a negative edge (its correctness assumption breaks)', () => {
	const withNeg = G(
		['S', 'A', 'B'],
		[
			{ from: 'S', to: 'A', weight: 1 },
			{ from: 'S', to: 'B', weight: 3 },
			{ from: 'B', to: 'A', weight: -5 }, // makes S→B→A = -2, but A settles early
		]
	);
	const { hasNegative } = dijkstraTrace(withNeg, { source: 'S' });
	assert.equal(hasNegative, true);
});

// ── buildStateRows (the PseudoState bridge) ──
test('buildStateRows surfaces the relax test, dist[v], and counts', () => {
	const { frames } = bellmanFordTrace(KNOWN, { source: 'S' });
	const relaxFrame = frames.find(f => f.phase === 'relax-improve');
	const rows = buildStateRows(relaxFrame);
	const byId = Object.fromEntries(rows.map(r => [r.id, r.value]));
	assert.ok('edge' in byId, 'reports the edge being relaxed');
	assert.ok('test' in byId, 'reports dist[u] + w');
	assert.ok('distv' in byId, 'reports dist[v]');
	assert.ok('relaxations' in byId && 'improvements' in byId, 'reports counts');
});

test('buildStateRows is pure and tolerates a null frame', () => {
	assert.deepEqual(buildStateRows(null), []);
	assert.deepEqual(buildStateRows(undefined), []);
});

// ── Dispatch ──
test('buildSsspTrace dispatches by algorithm id', () => {
	assert.ok(buildSsspTrace('bellmanFord', KNOWN, { source: 'S' }).frames.length > 0);
	assert.ok(buildSsspTrace('dagShortestPaths', KNOWN, { source: 'S' }).frames.length > 0);
	assert.ok(buildSsspTrace('dijkstra', KNOWN, { source: 'S' }).frames.length > 0);
	assert.deepEqual(buildSsspTrace('nope', KNOWN, { source: 'S' }).frames, []);
});
