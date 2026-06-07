// Static metadata for the All-pairs shortest paths topic: the shared weighted
// digraph the stage + playground run Floyd-Warshall (and transitive closure) on,
// algorithm/mode descriptors, scenario presets, and fixed node positions for the
// SVG graph view. The pseudocode for each mode lives in fwTrace.js (FW_PSEUDO) so
// the trace `line` indices and the rendered listing can never drift apart.

// ── The shared graph (a directed, weighted, 4-vertex digraph) ──
//
// Chosen so several pairs only get their true shortest distance once an
// intermediate vertex is allowed — the whole point of the k-loop. Vertices are
// labelled 1..4 (Floyd-Warshall's natural 1-indexed numbering).
//
// Edges:  1→2 = 3,  1→3 = 8,  2→4 = 1,  3→2 = 4,  4→1 = 2,  4→3 = -5
// (A CLRS-style example with a negative edge but NO negative cycle — so the
// distances are well defined and Floyd-Warshall shines: e.g. 1→3 is 8 directly
// but only 4 once routing through 2 and 4 is allowed: 1→2→4→3 = 3+1−5 = −1.)
//
// Verified all-pairs shortest distances (rows = from, cols = to):
//        1     2     3     4
//   1 [  0     3    -1     4 ]
//   2 [  3     0    -4     1 ]
//   3 [  7     4     0     5 ]
//   4 [  2    -1    -5     0 ]
export const SHARED_GRAPH = {
	nodes: [
		{ id: '1', x: 20, y: 22 },
		{ id: '2', x: 80, y: 22 },
		{ id: '3', x: 20, y: 80 },
		{ id: '4', x: 80, y: 80 },
	],
	edges: [
		{ from: '1', to: '2', weight: 3 },
		{ from: '1', to: '3', weight: 8 },
		{ from: '2', to: '4', weight: 1 },
		{ from: '3', to: '2', weight: 4 },
		{ from: '4', to: '1', weight: 2 },
		{ from: '4', to: '3', weight: -5 },
	],
};

// A second, all-non-negative digraph (no negative edges) — simpler arithmetic for
// learners who want to verify the recurrence by hand, and a clean closure demo.
export const SIMPLE_GRAPH = {
	nodes: [
		{ id: 'A', x: 20, y: 22 },
		{ id: 'B', x: 80, y: 22 },
		{ id: 'C', x: 20, y: 80 },
		{ id: 'D', x: 80, y: 80 },
	],
	edges: [
		{ from: 'A', to: 'B', weight: 4 },
		{ from: 'A', to: 'C', weight: 1 },
		{ from: 'C', to: 'B', weight: 2 },
		{ from: 'B', to: 'D', weight: 5 },
		{ from: 'C', to: 'D', weight: 8 },
	],
};

// A graph WITH a reachable negative-weight cycle (2→3→4→2 sums to −1). Floyd-
// Warshall's diagnostic: a diagonal entry d[v][v] drops below 0.
export const NEG_CYCLE_GRAPH = {
	nodes: [
		{ id: '1', x: 20, y: 22 },
		{ id: '2', x: 80, y: 22 },
		{ id: '3', x: 80, y: 80 },
		{ id: '4', x: 20, y: 80 },
	],
	edges: [
		{ from: '1', to: '2', weight: 4 },
		{ from: '2', to: '3', weight: 2 },
		{ from: '3', to: '4', weight: -5 },
		{ from: '4', to: '2', weight: 2 },
	],
};

export const SHARED_SOURCE = '1';

// ── Mode descriptors for the playground ──
//
// Both modes are the SAME triple loop over intermediate vertices — Floyd-Warshall
// uses min/+, transitive closure uses OR/AND.
export const APSP_MODES = {
	floydWarshall: {
		id: 'floydWarshall',
		name: 'Floyd-Warshall',
		oneLine:
			'Dynamic program over intermediate vertices: for each k, ask whether routing every pair i→j through k is shorter. Fills the V×V distance matrix in Θ(V³).',
		complexity: 'Θ(V³)',
		kind: 'distance',
	},
	transitiveClosure: {
		id: 'transitiveClosure',
		name: 'Transitive closure',
		oneLine:
			'The boolean twin of the same recurrence: i reaches j through {1..k} if it already could, OR it reaches k and k reaches j. Same Θ(V³) triple loop, OR/AND instead of min/+.',
		complexity: 'Θ(V³)',
		kind: 'reach',
	},
};

export const APSP_MODE_ORDER = ['floydWarshall', 'transitiveClosure'];

// Playground scenarios. Each names a graph, the mode to preselect, and intent.
export const APSP_PRESETS = [
	{
		id: 'shared',
		label: 'Negative edge',
		intent:
			'A directed graph with a negative edge but no negative cycle — watch distances drop only once the right intermediate vertex is allowed.',
		graph: SHARED_GRAPH,
		mode: 'floydWarshall',
	},
	{
		id: 'simple',
		label: 'Non-negative',
		intent:
			'All weights ≥ 0 — easy arithmetic to verify the d[i][k] + d[k][j] recurrence by hand.',
		graph: SIMPLE_GRAPH,
		mode: 'floydWarshall',
	},
	{
		id: 'closure',
		label: 'Reachability',
		intent:
			'Transitive closure on the same triple loop — fills a boolean "can i reach j?" matrix with OR/AND.',
		graph: SIMPLE_GRAPH,
		mode: 'transitiveClosure',
	},
	{
		id: 'neg-cycle',
		label: 'Negative cycle',
		intent:
			'A reachable negative-weight cycle — Floyd-Warshall flags it when a diagonal entry d[v][v] goes below 0.',
		graph: NEG_CYCLE_GRAPH,
		mode: 'floydWarshall',
	},
];
