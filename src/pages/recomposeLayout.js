// recomposeLayout — the pure geometry for the Home hero's "Recompose" instrument.
//
// One conserved company of 14 atoms re-forms itself through every core CS
// structure: array → sorted bars → binary tree → heap → graph → back to array.
// The thesis (the product's whole point): it is the SAME data the whole time —
// a heap is an array, a tree is an array, a sorted run and a graph are one
// dataset under different access rules. Atom identity is conserved (atom 0 is
// always the array's index 0, the tree's root, the heap's root) so a literate
// viewer can track a node through the morph — that legibility is what makes it
// read as an instrument, not decoration.
//
// Pure + deterministic: every coordinate is computed once at module load from
// the viewBox, so the animation layer only interpolates between fixed targets.
// No paid plugins, no path morphing — just per-atom transforms + cheap attrs.

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
const heapAtoms = treeLayout({ marginX: 168, top: 120, rowGap: 92, scale: 0.9 });

// Tree/heap edges: parent → each existing child, in a FIXED order so the same
// line bends (not redraws) between tree and heap.
const treeEdges = [];
for (let i = 0; i < N; i += 1) {
	if (2 * i + 1 < N) treeEdges.push({ from: i, to: 2 * i + 1 });
	if (2 * i + 2 < N) treeEdges.push({ from: i, to: 2 * i + 2 });
}

// ── Graph (a deterministic, hand-placed constellation) ──────────────────────
const graphAtoms = [
	{ x: 400, y: 130 }, { x: 250, y: 205 }, { x: 560, y: 195 }, { x: 165, y: 305 },
	{ x: 342, y: 300 }, { x: 470, y: 296 }, { x: 648, y: 305 }, { x: 228, y: 404 },
	{ x: 400, y: 420 }, { x: 560, y: 408 }, { x: 118, y: 208 }, { x: 690, y: 214 },
	{ x: 306, y: 146 }, { x: 520, y: 138 },
].map(p => ({ ...p, scale: 1 }));

const graphEdges = [
	{ from: 0, to: 12 }, { from: 0, to: 13 }, { from: 12, to: 1 }, { from: 13, to: 2 },
	{ from: 1, to: 10 }, { from: 1, to: 3 }, { from: 1, to: 4 }, { from: 3, to: 7 },
	{ from: 4, to: 8 }, { from: 2, to: 5 }, { from: 2, to: 6 }, { from: 5, to: 9 },
	{ from: 6, to: 11 }, { from: 8, to: 9 },
];

export const EDGE_POOL = Math.max(treeEdges.length, graphEdges.length);

export const STATES = {
	array: { atoms: arrayAtoms, bars: BARS, edges: [] },
	sorted: { atoms: sortedAtoms, bars: BARS, edges: [] },
	tree: { atoms: treeAtoms, bars: null, edges: treeEdges },
	heap: { atoms: heapAtoms, bars: null, edges: treeEdges },
	graph: { atoms: graphAtoms, bars: null, edges: graphEdges },
};

// The loop order. It returns to 'array', and graph→array lands EXACTLY on the
// array coords, so the loop is seamless by construction.
export const ORDER = ['array', 'sorted', 'tree', 'heap', 'graph'];

// A topic-hue wash names the active concept (subtle, ≤0.08 alpha in CSS).
export const WASH_HUE = {
	array: 226, // foundations blue
	sorted: 210, // sorting azure
	tree: 286, // trees violet
	heap: 312, // heaps magenta
	graph: 162, // graphs teal
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
};

// The conservation thesis in words — the <960px fallback, where the live
// instrument is hidden and only the reading column renders.
export const THESIS_SENTENCE = 'The same fourteen values, read five ways.';

/**
 * edgeFrame — for a state and a line-pool index, the endpoint coords + whether
 * the line is active (drawn). Lines beyond the state's edge count park at the
 * canvas center, invisible, ready to fade in for a denser state.
 */
export const edgeFrame = (state, k) => {
	const { atoms, edges } = STATES[state];
	const e = edges[k];
	if (!e) return { active: false, x1: W / 2, y1: H / 2, x2: W / 2, y2: H / 2 };
	return {
		active: true,
		x1: atoms[e.from].x,
		y1: atoms[e.from].y,
		x2: atoms[e.to].x,
		y2: atoms[e.to].y,
	};
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
