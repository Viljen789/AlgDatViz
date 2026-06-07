// Static metadata for the MST topic: the one shared weighted graph both
// algorithms run on, its hand-placed layout, the algorithm descriptors, and the
// scenario presets. The pseudocode lives in mstTrace.js (MST_PSEUDO) so the
// trace `line` indices and the rendered listing can never drift apart.
//
// One graph, two algorithms: the signature interactive runs Kruskal AND Prim on
// THE SAME graph (below) so a learner sees they build the same minimum spanning
// tree. Weights are all distinct, which makes the MST unique — so "same tree" is
// literally true, not just "same total weight".

// Vertices laid out on a small SVG canvas (viewBox 0..100 in each axis; the
// stage scales them). Positions are chosen so edges rarely cross.
export const MST_NODES = [
	{ id: 'A', x: 16, y: 22 },
	{ id: 'B', x: 50, y: 12 },
	{ id: 'C', x: 84, y: 24 },
	{ id: 'D', x: 20, y: 64 },
	{ id: 'E', x: 52, y: 52 },
	{ id: 'F', x: 86, y: 66 },
	{ id: 'G', x: 50, y: 90 },
];

export const MST_VERTICES = MST_NODES.map(n => n.id);

// The shared weighted undirected graph. All weights distinct ⇒ unique MST.
// MST (by hand / verified in mstTrace.test.js): A-B(2), A-D(3), B-E(4), C-F(5),
// E-F(6), E-G(7)  → total 27, 6 edges over 7 vertices.
export const MST_EDGES = [
	{ u: 'A', v: 'B', w: 2 },
	{ u: 'A', v: 'D', w: 3 },
	{ u: 'B', v: 'C', w: 9 },
	{ u: 'B', v: 'E', w: 4 },
	{ u: 'C', v: 'F', w: 5 },
	{ u: 'D', v: 'E', w: 8 },
	{ u: 'D', v: 'G', w: 12 },
	{ u: 'E', v: 'F', w: 6 },
	{ u: 'E', v: 'G', w: 7 },
	{ u: 'F', v: 'G', w: 10 },
	{ u: 'C', v: 'E', w: 11 },
];

export const MST_GRAPH = {
	vertices: MST_VERTICES,
	edges: MST_EDGES,
	nodes: MST_NODES,
};

export const NODE_POS = Object.fromEntries(MST_NODES.map(n => [n.id, n]));

export const MST_ALGORITHMS = {
	kruskal: {
		id: 'kruskal',
		name: 'Kruskal',
		structure: 'Sorted edges + union-find',
		oneLine:
			'Sort every edge by weight, then add the next cheapest edge whenever it joins two different components (union-find rejects the cycles).',
		complexity: 'O(E log V)',
	},
	prim: {
		id: 'prim',
		name: 'Prim',
		structure: 'One growing tree + frontier',
		oneLine:
			'Grow a single tree from a start vertex, always taking the lightest edge that crosses from the tree to a vertex outside it.',
		complexity: 'O(E log V)',
	},
};

export const MST_ALGO_ORDER = ['kruskal', 'prim'];

// Playground scenarios. Each names the algorithm + (for Prim) the start vertex.
// They all run on the SAME graph above — that is the point.
export const MST_PRESETS = [
	{
		id: 'kruskal',
		label: 'Kruskal',
		algorithm: 'kruskal',
		start: null,
		intent: 'Sort all edges; accept the next that joins two components.',
	},
	{
		id: 'prim-a',
		label: 'Prim from A',
		algorithm: 'prim',
		start: 'A',
		intent: 'Grow one tree from A across the cheapest crossing edge.',
	},
	{
		id: 'prim-f',
		label: 'Prim from F',
		algorithm: 'prim',
		start: 'F',
		intent: 'Same graph, same MST — a different start, the same tree.',
	},
];
