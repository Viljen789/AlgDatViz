import assert from 'node:assert/strict';
import test from 'node:test';
import {
	buildMaxFlowTrace,
	buildResidual,
	buildStateRows,
	edmondsKarpTrace,
	extractMinCut,
	fordFulkersonTrace,
	flowValue,
	maxFlowValue,
} from './maxFlowTrace.js';
import {
	CLRS_NETWORK,
	MATCHING_NETWORK,
	REROUTE_NETWORK,
} from './maxFlowMeta.js';

// Every frame must carry a 0-based pseudocode line and a flow map + value so the
// stage + PseudoState rail stay in lockstep with the algorithm.
const assertFrameShape = frame => {
	assert.equal(typeof frame.line, 'number', 'frame has a numeric line');
	assert.ok(frame.line >= 0, 'line is 0-based');
	assert.equal(typeof frame.flow, 'object', 'frame has a flow map');
	assert.equal(typeof frame.value, 'number', 'frame has a numeric flow value');
	assert.ok(Array.isArray(frame.residual), 'frame carries a residual edge list');
};

// A flow is FEASIBLE when 0 ≤ f(u,v) ≤ c(u,v) on every edge and flow is
// conserved at every vertex other than the source and sink.
const assertFeasibleFlow = (network, flow) => {
	network.edges.forEach(e => {
		const f = flow[`${e.from}->${e.to}`] || 0;
		assert.ok(f >= 0, `f(${e.from},${e.to}) ≥ 0`);
		assert.ok(f <= e.capacity, `f(${e.from},${e.to}) ≤ c = ${e.capacity}`);
	});
	const inflow = {};
	const outflow = {};
	network.nodes.forEach(n => {
		inflow[n.id] = 0;
		outflow[n.id] = 0;
	});
	network.edges.forEach(e => {
		const f = flow[`${e.from}->${e.to}`] || 0;
		outflow[e.from] += f;
		inflow[e.to] += f;
	});
	network.nodes.forEach(n => {
		if (n.id === network.source || n.id === network.sink) return;
		assert.equal(
			inflow[n.id],
			outflow[n.id],
			`flow conserved at ${n.id} (in ${inflow[n.id]} = out ${outflow[n.id]})`
		);
	});
};

// ── The classic CLRS network: maximum flow = 23 ──
test('edmondsKarpTrace computes the CLRS maximum flow value 23', () => {
	const { frames, flow, value } = edmondsKarpTrace(CLRS_NETWORK);
	frames.forEach(assertFrameShape);
	assert.equal(value, 23, 'CLRS network max flow is 23');
	assertFeasibleFlow(CLRS_NETWORK, flow);
});

test('fordFulkersonTrace computes the CLRS maximum flow value 23', () => {
	const { flow, value } = fordFulkersonTrace(CLRS_NETWORK);
	assert.equal(value, 23, 'CLRS network max flow is 23 (any path order)');
	assertFeasibleFlow(CLRS_NETWORK, flow);
});

// ── Max-flow / min-cut theorem on the CLRS network ──
test('CLRS min-cut capacity equals the max-flow value (23)', () => {
	const { flow, value, minCut } = edmondsKarpTrace(CLRS_NETWORK);
	assert.equal(minCut.capacity, value, 'min-cut capacity = max-flow value');
	assert.equal(minCut.capacity, 23, 'and that value is 23');
	// The source must be on the S side; the sink must not be.
	assert.ok(minCut.S.includes('s'), 'source is on the S side of the cut');
	assert.ok(!minCut.S.includes('t'), 'sink is on the T side of the cut');
	// Independently recompute the min cut from the final flow.
	const recomputed = extractMinCut(CLRS_NETWORK, flow);
	assert.equal(recomputed.capacity, 23, 'extractMinCut agrees: capacity 23');
});

test('the revealed min-cut edges are exactly the saturated crossing edges', () => {
	const { flow, minCut } = edmondsKarpTrace(CLRS_NETWORK);
	// Every edge crossing the cut from S to T must be SATURATED (f = c): that is
	// why no more flow can cross. (This is the heart of the theorem.)
	minCut.edges.forEach(e => {
		const f = flow[`${e.from}->${e.to}`] || 0;
		assert.equal(f, e.capacity, `cut edge ${e.from}→${e.to} is saturated`);
	});
	const cutCapacity = minCut.edges.reduce((s, e) => s + e.capacity, 0);
	assert.equal(cutCapacity, minCut.capacity);
});

// ── Ford-Fulkerson and Edmonds-Karp agree on the value ──
test('Ford-Fulkerson and Edmonds-Karp reach the same max-flow value', () => {
	[CLRS_NETWORK, REROUTE_NETWORK, MATCHING_NETWORK].forEach(net => {
		const ff = fordFulkersonTrace(net).value;
		const ek = edmondsKarpTrace(net).value;
		assert.equal(ff, ek, 'both algorithms compute the same maximum flow');
	});
});

// ── Reverse (back) edges: rerouting is required to reach the maximum ──
test('the reroute network needs a back edge and reaches max flow 2', () => {
	const { frames, flow, value } = fordFulkersonTrace(REROUTE_NETWORK);
	assert.equal(value, 2, 'maximum flow of the reroute network is 2');
	assertFeasibleFlow(REROUTE_NETWORK, flow);
	// The residual network must include back edges once flow has been pushed.
	const hasBack = frames.some(f => f.residual.some(re => re.kind === 'back'));
	assert.ok(hasBack, 'a residual back edge appears during the run');
});

test('buildResidual emits forward residual c−f and a back edge of size f', () => {
	const edges = [{ from: 'a', to: 'b', capacity: 5 }];
	const residual = buildResidual(edges, { 'a->b': 2 });
	const fwd = residual.find(re => re.kind === 'forward');
	const back = residual.find(re => re.kind === 'back');
	assert.equal(fwd.residual, 3, 'forward residual = c − f = 5 − 2');
	assert.equal(fwd.from, 'a');
	assert.equal(fwd.to, 'b');
	assert.equal(back.residual, 2, 'back residual = f = 2');
	assert.equal(back.from, 'b', 'back edge runs v→u');
	assert.equal(back.to, 'a');
});

test('a saturated edge has no forward residual edge', () => {
	const residual = buildResidual([{ from: 'a', to: 'b', capacity: 5 }], { 'a->b': 5 });
	assert.equal(residual.find(re => re.kind === 'forward'), undefined);
	assert.equal(residual.find(re => re.kind === 'back')?.residual, 5);
});

// ── Integrality: integer capacities → integer maximum flow ──
test('integrality — every edge flow is an integer for integer capacities', () => {
	[CLRS_NETWORK, REROUTE_NETWORK, MATCHING_NETWORK].forEach(net => {
		const { flow } = edmondsKarpTrace(net);
		Object.values(flow).forEach(f => {
			assert.ok(Number.isInteger(f), `flow value ${f} is an integer`);
		});
	});
});

// ── Bipartite matching = max flow with unit capacities ──
test('bipartite matching network has maximum matching of size 3', () => {
	const { flow, value } = edmondsKarpTrace(MATCHING_NETWORK);
	assert.equal(value, 3, 'a perfect matching of size 3 exists');
	assertFeasibleFlow(MATCHING_NETWORK, flow);
	// Each matched pair is a unit of flow on a middle (Li→Rj) edge; with unit
	// capacities every Li and Rj is used at most once → a valid matching.
	const matchEdges = MATCHING_NETWORK.edges.filter(
		e => e.from.startsWith('L') && e.to.startsWith('R')
	);
	const matched = matchEdges.filter(e => (flow[`${e.from}->${e.to}`] || 0) === 1);
	assert.equal(matched.length, 3, 'three Li→Rj edges carry one unit of flow');
	const leftUsed = new Set(matched.map(e => e.from));
	const rightUsed = new Set(matched.map(e => e.to));
	assert.equal(leftUsed.size, 3, 'each left vertex matched at most once');
	assert.equal(rightUsed.size, 3, 'each right vertex matched at most once');
});

// ── flowValue: net flow leaving the source ──
test('flowValue measures net flow out of the source', () => {
	const edges = CLRS_NETWORK.edges.map(e => ({ ...e }));
	const { flow } = edmondsKarpTrace(CLRS_NETWORK);
	assert.equal(flowValue(edges, flow, 's'), 23);
});

// ── maxFlowValue convenience ──
test('maxFlowValue returns value and min cut together', () => {
	const { value, minCut } = maxFlowValue(CLRS_NETWORK);
	assert.equal(value, 23);
	assert.equal(minCut.capacity, 23);
});

// ── Purity: inputs are never mutated ──
test('drivers do not mutate the input network', () => {
	const snapshot = JSON.stringify(CLRS_NETWORK);
	edmondsKarpTrace(CLRS_NETWORK);
	fordFulkersonTrace(CLRS_NETWORK);
	extractMinCut(CLRS_NETWORK, {});
	assert.equal(JSON.stringify(CLRS_NETWORK), snapshot, 'network untouched');
});

// ── buildStateRows (the PseudoState bridge) ──
test('buildStateRows surfaces flow value, path, bottleneck, and min cut', () => {
	const { frames } = edmondsKarpTrace(CLRS_NETWORK);
	const augFrame = frames.find(f => f.phase === 'augment');
	const rows = buildStateRows(augFrame);
	const byId = Object.fromEntries(rows.map(r => [r.id, r.value]));
	assert.ok('value' in byId, 'reports the flow value');
	assert.ok('path' in byId, 'reports the augmenting path');
	assert.ok('bottleneck' in byId, 'reports the bottleneck');
	assert.ok('augmentations' in byId, 'reports the augmentation count');
	const doneFrame = frames.find(f => f.phase === 'done');
	const doneRows = Object.fromEntries(buildStateRows(doneFrame).map(r => [r.id, r.value]));
	assert.equal(doneRows.mincut, 23, 'final frame reports the min-cut capacity');
});

test('buildStateRows is pure and tolerates a null frame', () => {
	assert.deepEqual(buildStateRows(null), []);
	assert.deepEqual(buildStateRows(undefined), []);
});

// ── Dispatch ──
test('buildMaxFlowTrace dispatches by algorithm id', () => {
	assert.ok(buildMaxFlowTrace('fordFulkerson', CLRS_NETWORK).frames.length > 0);
	assert.ok(buildMaxFlowTrace('edmondsKarp', CLRS_NETWORK).frames.length > 0);
	assert.deepEqual(buildMaxFlowTrace('nope', CLRS_NETWORK).frames, []);
});

// ── Edmonds-Karp uses shortest augmenting paths (non-decreasing length) ──
test('Edmonds-Karp augmenting paths never get shorter over the run', () => {
	const { frames } = edmondsKarpTrace(CLRS_NETWORK);
	const lengths = frames
		.filter(f => f.phase === 'search' && f.line === 3 && f.path)
		.map(f => f.path.length);
	for (let i = 1; i < lengths.length; i++) {
		assert.ok(
			lengths[i] >= lengths[i - 1],
			'BFS augmenting-path lengths are non-decreasing'
		);
	}
});
