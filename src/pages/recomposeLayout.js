// recomposeLayout — the pure geometry for the Home hero's "Recompose" instrument.
//
// One conserved company of 14 atoms re-forms itself through core CS structures:
// array → sorted bars → binary tree → heap → graph → shortest path → spanning
// tree → max flow → back to the array. The thesis (the product's whole point):
// it is the SAME data the whole time — a heap is an array, a tree is an array, a
// graph and its spanning tree and its max-flow network are one dataset under
// different access rules. Atom identity is conserved (atom 0 is always the
// array's index 0, the tree's root) so a literate viewer can track a node through
// the morph — that legibility is what makes it read as an instrument.
//
// Every state is self-evident in the instrument's pure language (atoms + edges +
// bars): topology is drawn with edges, magnitude with bars, and the graph family
// (shortest path / spanning tree / max flow) reuses the SAME constellation, only
// re-painting which edges are lit, trimmed, or filled. We deliberately do NOT
// draw container-defined structures (a stack frame, a hash bin, a matrix grid)
// here — those are shown on the curriculum map's per-topic figures.
//
// Pure + deterministic: every coordinate is computed once at module load from
// the viewBox, so the animation layer only interpolates between fixed targets.

export const VIEWBOX = { w: 800, h: 520 };
const { w: W, h: H } = VIEWBOX;

// 14 atoms with fixed distinct values, so the sort order + heap/tree math are
// deterministic. (A permutation of 0..13.)
const VALUES = [6, 10, 2, 13, 4, 8, 0, 11, 5, 9, 1, 12, 7, 3];
export const N = VALUES.length;

// rank[i] = the sorted position of atom i (by value) → its x in the sorted state.
const sortedByValue = [...VALUES.keys()].sort((a, b) => VALUES[a] - VALUES[b]);
const rank = new Array(N);
sortedByValue.forEach((atomIdx, pos) => {
	rank[atomIdx] = pos;
});

// ── Array / sorted (a bar chart with dot caps) ──────────────────────────────
const MARGIN_X = 92;
const BASELINE_Y = 392;
const slotX = k => MARGIN_X + (k * (W - 2 * MARGIN_X)) / (N - 1); // k ∈ 0..N-1
const barH = v => 54 + (v / (N - 1)) * 176; // value → bar height (54..230)

// Each atom caps the TOP of its bar; the bar drops to the shared baseline. So in
// the wrapper's local frame the bar is at y=0 with height h (extends downward).
export const BARS = VALUES.map(v => ({ h: barH(v) }));

const arrayAtoms = VALUES.map((v, i) => ({
	x: slotX(i),
	y: BASELINE_Y - barH(v),
	scale: 1,
}));
const sortedAtoms = VALUES.map((v, i) => ({
	x: slotX(rank[i]),
	y: BASELINE_Y - barH(v),
	scale: 1,
}));

// ── Binary tree / heap (same topology, different packing) ───────────────────
// Node i: level = floor(log2(i+1)); children at 2i+1, 2i+2. A parent sits exactly
// above the midpoint of its children when x = marginX + (slot+0.5)*usable/2^level.
const levelOf = i => Math.floor(Math.log2(i + 1));
const treeLayout = ({ marginX, top, rowGap, scale }) => {
	const usable = W - 2 * marginX;
	return Array.from({ length: N }, (_, i) => {
		const level = levelOf(i);
		const slot = i - (2 ** level - 1);
		return {
			x: marginX + ((slot + 0.5) * usable) / 2 ** level,
			y: top + level * rowGap,
			scale,
		};
	});
};
const treeAtoms = treeLayout({ marginX: 70, top: 96, rowGap: 104, scale: 1 });
const heapAtoms = treeLayout({
	marginX: 168,
	top: 120,
	rowGap: 92,
	scale: 0.9,
});

// Tree/heap edges: parent → each existing child, in a FIXED order so the same
// line bends (not redraws) between tree and heap.
const treeEdges = [];
for (let i = 0; i < N; i += 1) {
	if (2 * i + 1 < N) treeEdges.push({ from: i, to: 2 * i + 1 });
	if (2 * i + 2 < N) treeEdges.push({ from: i, to: 2 * i + 2 });
}

// ── Graph (a deterministic, hand-placed constellation) ──────────────────────
const graphAtoms = [
	{ x: 400, y: 130 },
	{ x: 250, y: 205 },
	{ x: 560, y: 195 },
	{ x: 165, y: 305 },
	{ x: 342, y: 300 },
	{ x: 470, y: 296 },
	{ x: 648, y: 305 },
	{ x: 228, y: 404 },
	{ x: 400, y: 420 },
	{ x: 560, y: 408 },
	{ x: 118, y: 208 },
	{ x: 690, y: 214 },
	{ x: 306, y: 146 },
	{ x: 520, y: 138 },
].map(p => ({ ...p, scale: 1 }));

// The FIRST N-1 (13) edges form a spanning tree of all 14 nodes; the rest close
// cycles, so the graph is visibly denser than its spanning tree and the
// spanningTree state reads as "trim the graph back to a tree."
const graphEdges = [
	{ from: 0, to: 12 },
	{ from: 0, to: 13 },
	{ from: 12, to: 1 },
	{ from: 13, to: 2 },
	{ from: 1, to: 10 },
	{ from: 1, to: 3 },
	{ from: 1, to: 4 },
	{ from: 3, to: 7 },
	{ from: 4, to: 8 },
	{ from: 2, to: 5 },
	{ from: 2, to: 6 },
	{ from: 5, to: 9 },
	{ from: 6, to: 11 },
	// cycle-closing edges (beyond the spanning tree)
	{ from: 8, to: 9 },
	{ from: 7, to: 8 },
	{ from: 4, to: 5 },
	{ from: 3, to: 4 },
	{ from: 5, to: 6 },
];
// The spanning tree is exactly the first N-1 edges (connects all 14, no cycle).
const spanningTreeEdges = graphEdges.slice(0, N - 1);

// ── Shortest path (light one fewest-hops route, dim the rest) ───────────────
// The route runs from a clear SOURCE (atom 0, top) to a clear SINK (atom 8,
// bottom) — both marked with a ring by the hero — so the state reads as "the
// shortest path between these two nodes," not just "some bold edges." Each
// consecutive pair in SP_PATH is a real graph edge. The graph family (graph,
// shortestPath, spanningTree, maxFlow) shares these two endpoints.
export const SP_PATH = [0, 12, 1, 4, 8];
export const GRAPH_ENDS = {
	source: SP_PATH[0],
	sink: SP_PATH[SP_PATH.length - 1],
};
const spOnPath = (a, b) => {
	for (let i = 0; i < SP_PATH.length - 1; i += 1) {
		const u = SP_PATH[i];
		const v = SP_PATH[i + 1];
		if ((a === u && b === v) || (a === v && b === u)) return true;
	}
	return false;
};
const shortestPathEdges = graphEdges.map(e =>
	spOnPath(e.from, e.to) ? { ...e, highlight: true } : { ...e, dim: true }
);

// ── Max flow (each edge a pipe: width ∝ capacity, fill ∝ flow / capacity) ────
// Illustrative capacities + flows on the same constellation. The legend claims
// only the ENCODING (width = capacity, fill = flow), never a specific max value:
// the spanning-tree backbone carries flow, the cycle edges sit slack (flow 0), so
// the fill contrast reads as "flow concentrates on a backbone, capacity to spare."
const maxFlowEdges = graphEdges.map((e, i) => {
	const cap = 3 + ((i * 3) % 4); // varies 3..6
	const frac = i < N - 1 ? 0.45 + 0.5 * (((i * 4) % 5) / 5) : 0;
	return { ...e, cap, flow: Math.round(cap * frac) };
});

export const EDGE_POOL = Math.max(treeEdges.length, graphEdges.length);

export const STATES = {
	array: { atoms: arrayAtoms, bars: BARS, edges: [] },
	sorted: { atoms: sortedAtoms, bars: BARS, edges: [] },
	tree: { atoms: treeAtoms, bars: null, edges: treeEdges },
	heap: { atoms: heapAtoms, bars: null, edges: treeEdges },
	graph: { atoms: graphAtoms, bars: null, edges: graphEdges },
	shortestPath: { atoms: graphAtoms, bars: null, edges: shortestPathEdges },
	spanningTree: { atoms: graphAtoms, bars: null, edges: spanningTreeEdges },
	maxFlow: { atoms: graphAtoms, bars: null, edges: maxFlowEdges },
};

// The loop order. It returns to 'array', and maxFlow→array lands EXACTLY on the
// array coords, so the loop is seamless by construction. The reduced-motion
// dissolve cycle reads this same list, so the two motion modes stay in lockstep.
export const ORDER = [
	'array',
	'sorted',
	'tree',
	'heap',
	'graph',
	'shortestPath',
	'spanningTree',
	'maxFlow',
];

// A topic-hue wash names the active concept (subtle, ≤0.08 alpha in CSS).
export const WASH_HUE = {
	array: 226, // foundations blue
	sorted: 210, // sorting azure
	tree: 286, // trees violet
	heap: 312, // heaps magenta
	graph: 162, // graphs teal
	shortestPath: 198, // shortest paths cyan
	spanningTree: 142, // spanning trees green
	maxFlow: 28, // max flow amber
};

// The legend copy for the live figcaption — one short, STRUCTURALLY-TRUE line
// per state. Deliberately restrained to claims the rendered pixels satisfy:
// topology and index arithmetic, never value-ordering. The heap/tree here are
// index-PACKED (treeLayout), not value-ordered — atom 0 (value 6) sits above
// child atom 1 (value 10) — so captioning "max-heap / parent ≥ children" would
// be a visible lie. We say only what is true on screen.
export const PHASES = {
	array: { name: 'Array', note: '14 values, one order' },
	sorted: { name: 'Sorted run', note: 'rearranged by value' },
	tree: { name: 'Binary tree', note: 'children of i at 2i+1, 2i+2' },
	heap: { name: 'Heap', note: 'same array, parent/child by index' },
	graph: { name: 'Graph', note: 'edges, no inherent root' },
	shortestPath: { name: 'Shortest path', note: 'the lit route, fewest hops' },
	spanningTree: {
		name: 'Spanning tree',
		note: 'connect every node, no cycles',
	},
	maxFlow: { name: 'Max flow', note: 'width is capacity, fill is flow' },
};

// The conservation thesis in words — the <960px fallback, where the live
// instrument is hidden and only the reading column renders.
export const THESIS_SENTENCE = 'The same fourteen values, read eight ways.';

/**
 * edgeFrame — for a state and a line-pool index, the endpoint coords + whether
 * the line is active (drawn), plus any per-edge "meaning" the state paints:
 * `highlight` / `dim` (shortest path) and `cap` / `flow` (max flow). Lines beyond
 * the state's edge count park invisible — the cycle edges at their graph spot so
 * they fade in place, everything else at the canvas center.
 */
export const edgeFrame = (state, k) => {
	const { atoms, edges } = STATES[state];
	const e = edges[k];
	if (e) {
		const f = {
			active: true,
			x1: atoms[e.from].x,
			y1: atoms[e.from].y,
			x2: atoms[e.to].x,
			y2: atoms[e.to].y,
		};
		if (e.highlight) f.highlight = true;
		if (e.dim) f.dim = true;
		if (e.cap != null) {
			f.cap = e.cap;
			f.flow = e.flow;
		}
		return f;
	}
	// The cycle-closing graph edges (index ≥ N-1) park at their graph position when
	// inactive, so they fade in place in the graph instead of flying from the
	// canvas center. Core edges (the spanning tree / tree pointers) park at center.
	const g = k >= N - 1 ? graphEdges[k] : null;
	if (g)
		return {
			active: false,
			x1: graphAtoms[g.from].x,
			y1: graphAtoms[g.from].y,
			x2: graphAtoms[g.to].x,
			y2: graphAtoms[g.to].y,
		};
	return { active: false, x1: W / 2, y1: H / 2, x2: W / 2, y2: H / 2 };
};

// A root→leaf path for the heapify "sift" cascade beat.
export const HEAPIFY_PATH = [0, 2, 6, 13];

// BFS visitation order from node 0 over the graph, for the frontier-wave beat.
export const BFS_ORDER = (() => {
	const adj = Array.from({ length: N }, () => []);
	graphEdges.forEach(({ from, to }) => {
		adj[from].push(to);
		adj[to].push(from);
	});
	const seen = new Set([0]);
	const queue = [0];
	const order = [];
	while (queue.length) {
		const u = queue.shift();
		order.push(u);
		for (const v of adj[u]) {
			if (!seen.has(v)) {
				seen.add(v);
				queue.push(v);
			}
		}
	}
	return order;
})();
