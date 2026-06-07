// Static metadata for the Maximum flow topic: the flow networks the stage and
// playground run on, algorithm descriptors (Ford-Fulkerson / Edmonds-Karp),
// scenario presets, and fixed node positions for the SVG stage. The pseudocode
// for each algorithm lives in maxFlowTrace.js (MAXFLOW_PSEUDO) so the trace
// `line` indices and the rendered listing can never drift apart.

// ── The classic CLRS flow network (max flow = 23) ──
//
// Directed, integer capacities, single source s and single sink t. This is the
// canonical textbook network whose maximum flow value is 23 and whose minimum
// cut ({s, v1, v2, v4}, {v3, t}) has capacity 12 + 7 + 4 = 23 — verified in
// maxFlowTrace.test.js. Positions (x, y in a 0..100 space) lay it out left→right
// with the source on the left and the sink on the right.
export const CLRS_NETWORK = {
	source: 's',
	sink: 't',
	nodes: [
		{ id: 's', x: 6, y: 50 },
		{ id: 'v1', x: 33, y: 20 },
		{ id: 'v2', x: 33, y: 80 },
		{ id: 'v3', x: 67, y: 20 },
		{ id: 'v4', x: 67, y: 80 },
		{ id: 't', x: 94, y: 50 },
	],
	edges: [
		{ from: 's', to: 'v1', capacity: 16 },
		{ from: 's', to: 'v2', capacity: 13 },
		{ from: 'v1', to: 'v3', capacity: 12 },
		{ from: 'v2', to: 'v1', capacity: 4 },
		{ from: 'v2', to: 'v4', capacity: 14 },
		{ from: 'v3', to: 'v2', capacity: 9 },
		{ from: 'v3', to: 't', capacity: 20 },
		{ from: 'v4', to: 'v3', capacity: 7 },
		{ from: 'v4', to: 't', capacity: 4 },
	],
};

// ── A small network where the GREEDY choice needs a reverse (back) edge ──
//
// The single edge b→a (capacity 1) is the bottleneck a naive first augmenting
// path saturates; reaching the maximum (value 2) requires the algorithm to push
// flow BACK along it via a residual reverse edge. Max flow = 2, min cut = 2.
export const REROUTE_NETWORK = {
	source: 's',
	sink: 't',
	nodes: [
		{ id: 's', x: 6, y: 50 },
		{ id: 'a', x: 40, y: 18 },
		{ id: 'b', x: 40, y: 82 },
		{ id: 't', x: 94, y: 50 },
	],
	edges: [
		{ from: 's', to: 'a', capacity: 1 },
		{ from: 's', to: 'b', capacity: 1 },
		{ from: 'a', to: 'b', capacity: 1 },
		{ from: 'a', to: 't', capacity: 1 },
		{ from: 'b', to: 't', capacity: 1 },
	],
};

// ── A bipartite-matching network (matching = max flow with unit capacities) ──
//
// Left vertices L1..L3, right vertices R1..R3, every edge capacity 1. Add a
// super-source s → each Li (cap 1) and each Rj → super-sink t (cap 1). The
// maximum flow value equals the size of a maximum matching. Here a perfect
// matching of size 3 exists (L1-R1, L2-R2, L3-R3 via the cross edges), so the
// max flow is 3. Integer capacities → integer flow → a real (integral) matching.
export const MATCHING_NETWORK = {
	source: 's',
	sink: 't',
	nodes: [
		{ id: 's', x: 6, y: 50 },
		{ id: 'L1', x: 32, y: 18 },
		{ id: 'L2', x: 32, y: 50 },
		{ id: 'L3', x: 32, y: 82 },
		{ id: 'R1', x: 68, y: 18 },
		{ id: 'R2', x: 68, y: 50 },
		{ id: 'R3', x: 68, y: 82 },
		{ id: 't', x: 94, y: 50 },
	],
	edges: [
		{ from: 's', to: 'L1', capacity: 1 },
		{ from: 's', to: 'L2', capacity: 1 },
		{ from: 's', to: 'L3', capacity: 1 },
		{ from: 'L1', to: 'R1', capacity: 1 },
		{ from: 'L1', to: 'R2', capacity: 1 },
		{ from: 'L2', to: 'R2', capacity: 1 },
		{ from: 'L2', to: 'R3', capacity: 1 },
		{ from: 'L3', to: 'R1', capacity: 1 },
		{ from: 'L3', to: 'R3', capacity: 1 },
		{ from: 'R1', to: 't', capacity: 1 },
		{ from: 'R2', to: 't', capacity: 1 },
		{ from: 'R3', to: 't', capacity: 1 },
	],
};

// ── Algorithm descriptors for the playground ──
//
// Ford-Fulkerson and Edmonds-Karp differ in ONE thing: how they pick the next
// augmenting path in the residual network — any path (DFS here) vs the SHORTEST
// path by edge count (BFS). Both augment until no augmenting path remains.
export const MAXFLOW_ALGORITHMS = {
	fordFulkerson: {
		id: 'fordFulkerson',
		name: 'Ford-Fulkerson',
		oneLine:
			'Find ANY augmenting path in the residual network (depth-first here), push its bottleneck, repeat until none remains.',
		complexity: 'O(E · |f*|)',
		pathRule: 'any residual path (DFS)',
	},
	edmondsKarp: {
		id: 'edmondsKarp',
		name: 'Edmonds-Karp',
		oneLine:
			'Ford-Fulkerson with one rule: always take the SHORTEST augmenting path by edge count (BFS). That makes it polynomial.',
		complexity: 'O(V · E²)',
		pathRule: 'shortest residual path (BFS)',
	},
};

export const MAXFLOW_ALGO_ORDER = ['fordFulkerson', 'edmondsKarp'];

// Playground scenarios. Each names the network, and which algorithm to
// preselect. The matching scenario frames max-flow as bipartite matching.
export const MAXFLOW_PRESETS = [
	{
		id: 'clrs',
		label: 'Classic network',
		intent:
			'The textbook flow network — run either algorithm and watch the flow climb to 23, the value of a maximum flow (and the capacity of the minimum cut).',
		network: CLRS_NETWORK,
		algorithmId: 'edmondsKarp',
	},
	{
		id: 'reroute',
		label: 'Needs a back edge',
		intent:
			'A tiny network where reaching the maximum (2) forces the algorithm to push flow BACK along a residual reverse edge — the clever trick that makes augmenting paths complete.',
		network: REROUTE_NETWORK,
		algorithmId: 'fordFulkerson',
	},
	{
		id: 'matching',
		label: 'Bipartite matching',
		intent:
			'Unit-capacity edges turn max-flow into maximum bipartite matching — each unit of flow is one matched pair. Integer capacities guarantee an integral (real) matching.',
		network: MATCHING_NETWORK,
		algorithmId: 'edmondsKarp',
	},
];
