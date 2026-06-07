// Static metadata for the Single-source shortest paths topic: the shared graph
// the playground runs all three algorithms on, algorithm descriptors, scenario
// presets, and fixed node positions for the SVG stage. The pseudocode for each
// algorithm lives in relaxTrace.js (SSSP_PSEUDO) so the trace `line` indices and
// the rendered listing can never drift apart.

// ── The shared graph (a DAG so all three algorithms can run on it) ──
//
// Directed, non-negative, acyclic — so Dijkstra, DAG-SP, and Bellman-Ford all
// apply and must produce identical distances from S. Hand-verified shortest
// distances from S: S=0, A=7 (S→C→A), B=8 (S→C→A→B), C=3, D=5 (S→C→D).
// Positions (x,y in a 0..100 viewBox-ish space) lay the graph out left→right.
export const SHARED_GRAPH = {
	nodes: [
		{ id: 'S', x: 8, y: 50 },
		{ id: 'C', x: 34, y: 78 },
		{ id: 'A', x: 40, y: 24 },
		{ id: 'D', x: 66, y: 80 },
		{ id: 'B', x: 72, y: 32 },
	],
	edges: [
		{ from: 'S', to: 'A', weight: 10 },
		{ from: 'S', to: 'C', weight: 3 },
		{ from: 'C', to: 'A', weight: 4 },
		{ from: 'C', to: 'D', weight: 2 },
		{ from: 'A', to: 'B', weight: 1 },
		{ from: 'D', to: 'B', weight: 8 },
	],
};

export const SHARED_SOURCE = 'S';

// A graph WITH a reachable negative-weight cycle (A→B→C→A sums to -1). Only
// Bellman-Ford can run on this — its job is to *report* the cycle. Not a DAG.
export const NEG_CYCLE_GRAPH = {
	nodes: [
		{ id: 'S', x: 8, y: 50 },
		{ id: 'A', x: 38, y: 26 },
		{ id: 'B', x: 70, y: 30 },
		{ id: 'C', x: 54, y: 78 },
	],
	edges: [
		{ from: 'S', to: 'A', weight: 1 },
		{ from: 'A', to: 'B', weight: 1 },
		{ from: 'B', to: 'C', weight: -3 },
		{ from: 'C', to: 'A', weight: 1 },
	],
};

// A DAG with a negative EDGE (but no cycle): S→B→A = -2 beats the direct S→A.
// Shows DAG-SP / Bellman-Ford handling negatives that Dijkstra cannot.
export const NEG_EDGE_GRAPH = {
	nodes: [
		{ id: 'S', x: 8, y: 50 },
		{ id: 'B', x: 40, y: 78 },
		{ id: 'A', x: 46, y: 24 },
		{ id: 'T', x: 78, y: 50 },
	],
	edges: [
		{ from: 'S', to: 'A', weight: 5 },
		{ from: 'S', to: 'B', weight: 2 },
		{ from: 'B', to: 'A', weight: -4 },
		{ from: 'A', to: 'T', weight: 1 },
		{ from: 'B', to: 'T', weight: 7 },
	],
};

// ── Algorithm descriptors for the playground ──
export const SSSP_ALGORITHMS = {
	bellmanFord: {
		id: 'bellmanFord',
		name: 'Bellman-Ford',
		oneLine:
			'Relax every edge, |V|−1 times, then one more pass to detect a negative-weight cycle. Handles negative edges.',
		complexity: 'O(V·E)',
		handlesNegatives: true,
		needsDag: false,
	},
	dagShortestPaths: {
		id: 'dagShortestPaths',
		name: 'DAG-SP',
		oneLine:
			'Relax edges in topological order — one pass. Works with negative weights, but the graph must be acyclic.',
		complexity: 'O(V + E)',
		handlesNegatives: true,
		needsDag: true,
	},
	dijkstra: {
		id: 'dijkstra',
		name: 'Dijkstra',
		oneLine:
			'Greedily settle the closest unsettled vertex from a priority queue and relax its out-edges. Needs non-negative weights.',
		complexity: 'O((V + E) log V)',
		handlesNegatives: false,
		needsDag: false,
	},
};

export const SSSP_ALGO_ORDER = ['bellmanFord', 'dagShortestPaths', 'dijkstra'];

// Playground scenarios. Each names the graph + a source, and which algorithm to
// preselect. The "negative cycle" scenario steers the user to Bellman-Ford.
export const SSSP_PRESETS = [
	{
		id: 'shared-dag',
		label: 'Shared DAG',
		intent:
			'A non-negative DAG — run all three algorithms and watch them reach the same distances by different schedules of the same Relax calls.',
		graph: SHARED_GRAPH,
		source: 'S',
		algorithmId: 'dijkstra',
	},
	{
		id: 'negative-edge',
		label: 'Negative edge (DAG)',
		intent:
			'A DAG with a negative edge: DAG-SP and Bellman-Ford get it right; Dijkstra can settle a vertex too early.',
		graph: NEG_EDGE_GRAPH,
		source: 'S',
		algorithmId: 'dagShortestPaths',
	},
	{
		id: 'negative-cycle',
		label: 'Negative cycle',
		intent:
			'A reachable negative-weight cycle — only Bellman-Ford applies, and its extra pass reports that no shortest path exists.',
		graph: NEG_CYCLE_GRAPH,
		source: 'S',
		algorithmId: 'bellmanFord',
	},
];
