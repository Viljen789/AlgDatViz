// Pure, UI-free step-frame generators for the Minimum Spanning Trees topic.
//
// A minimum spanning tree (MST) of a connected, weighted, undirected graph is a
// subset of edges that connects every vertex with the least possible total
// weight. Two greedy algorithms both find one, and the same correctness argument
// — the CUT PROPERTY — proves both:
//
//   CUT PROPERTY. For any cut (a partition of the vertices into two sides) that
//   no current tree edge crosses, the minimum-weight edge crossing that cut (a
//   "light edge") is SAFE: some MST contains it. So greedily taking light edges
//   across respecting cuts can never go wrong.
//
//   KRUSKAL grows a forest: sort edges ascending, add the next edge iff its
//   endpoints are in different components (union-find detects the cycle). Each
//   accepted edge is the light edge across the cut separating its two components.
//
//   PRIM grows one tree from a start vertex: the cut is always (tree, rest), and
//   it repeatedly adds the lightest edge leaving the tree (a frontier / priority
//   queue). That edge is, by construction, the light edge of that cut.
//
// On a connected graph both produce a minimum spanning tree of the same total
// weight (and, when all weights are distinct, the SAME tree).
//
// These generators are deliberately React-free so MST correctness, the union-
// find cycle logic, the cut/light-edge helper, and the running totals can be
// unit-tested in isolation (mstTrace.test.js). The stage and playground only
// render the frames; they never re-derive the algorithm.
//
// FRAME CONTRACT (the {line, state} shape PseudoState consumes — see
// common/PlaybackEngine/PseudoState.jsx). Every frame additionally carries the
// MST-specific fields the graph stage reads:
//
//   frame = {
//     line:        number,   // 0-based index into the op's pseudocode.
//     phase:       string,   // 'init'|'consider'|'accept'|'reject'|'done'|…
//     considerEdge: EdgeKey|null,  // the edge under consideration this beat.
//     treeEdges:   EdgeKey[], // edges committed to the MST so far.
//     rejectedEdges: EdgeKey[], // edges rejected (would form a cycle).
//     treeNodes:   string[],  // vertices in the tree (Prim) / touched (Kruskal).
//     components:  string[][], // union-find components (Kruskal) / [tree, rest].
//     frontier:    EdgeKey[],  // crossing/candidate edges (Prim frontier).
//     totalWeight: number,    // running MST weight.
//     title:       string,    // short headline for the beat.
//     description: string,    // one-line narration (FrameTrace).
//     state:       Row[],     // PseudoState live-state rows for this beat.
//   }
//
// An EdgeKey is the canonical undirected id "u|v" with u < v lexicographically.

import { createUnionFind } from './unionFind.js';

// ── Edge helpers (canonical undirected ids) ─────────────────────────────────

export const edgeId = (u, v) => (String(u) < String(v) ? `${u}|${v}` : `${v}|${u}`);

export const edgeEndpoints = id => id.split('|');

// Normalise a graph's edge list into sorted, de-duplicated {u, v, w, id} records.
export const normalizeEdges = edges => {
	const seen = new Set();
	const out = [];
	for (const e of edges) {
		const id = edgeId(e.u, e.v);
		if (seen.has(id)) continue;
		seen.add(id);
		const [u, v] = edgeEndpoints(id);
		out.push({ id, u, v, w: e.w });
	}
	return out;
};

const byWeightThenId = (a, b) => a.w - b.w || a.id.localeCompare(b.id);

// ── Pseudocode listings (0-based line indices match the frame `line`) ────────

export const MST_PSEUDO = {
	kruskal: [
		'Kruskal(G):',
		'  sort edges by weight ascending',
		'  make-set(v) for every vertex',
		'  for each edge (u, v) in sorted order:',
		'    if find(u) ≠ find(v):',
		'      add (u, v) to the MST; union(u, v)',
		'    else: skip — it would form a cycle',
		'  return MST',
	],
	prim: [
		'Prim(G, start):',
		'  tree = {start}; frontier = edges leaving start',
		'  while some vertex is outside the tree:',
		'    (u, v) = lightest edge crossing the cut',
		'    add (u, v) to the MST',
		'    move the new vertex into the tree',
		'    update the frontier across the new cut',
		'  return MST',
	],
};

// ── Cut + light-edge helper (the heart of MST correctness) ───────────────────
//
// Given a graph and a SET of vertices on one side of a cut, return every edge
// that crosses the cut (exactly one endpoint inside `inside`) and which of those
// crossing edges is the lightest (the safe "light edge"). Pure + unit-tested.
//
// @param {Array<{u,v,w}>} edges  the graph's (normalised) edges.
// @param {Set<string>|Array<string>} inside  vertices on one side of the cut.
// @returns {{ crossing: Edge[], light: Edge|null }}
export const crossingEdges = (edges, inside) => {
	const set = inside instanceof Set ? inside : new Set(inside);
	const crossing = normalizeEdges(edges)
		.filter(e => set.has(e.u) !== set.has(e.v)) // exactly one endpoint inside
		.sort(byWeightThenId);
	return { crossing, light: crossing[0] || null };
};

// The light (minimum-weight) edge crossing the cut, or null if none cross.
export const lightEdge = (edges, inside) => crossingEdges(edges, inside).light;

// ── MST verification (used by tests + the "both build the same tree" claim) ──
//
// Total weight of a set of edge ids against the graph's weights.
export const totalWeight = (edges, edgeIds) => {
	const w = new Map(normalizeEdges(edges).map(e => [e.id, e.w]));
	return [...edgeIds].reduce((sum, id) => sum + (w.get(id) ?? 0), 0);
};

// A connected graph on n vertices has an MST of exactly n − 1 edges that touches
// every vertex without a cycle. Returns a structural report for tests.
export const isSpanningTree = (vertices, edgeIds) => {
	const uf = createUnionFind(vertices);
	let acyclic = true;
	for (const id of edgeIds) {
		const [u, v] = edgeEndpoints(id);
		if (!uf.union(u, v)) acyclic = false; // a cycle within the chosen set
	}
	return {
		acyclic,
		connected: uf.count() === 1,
		edgeCount: [...edgeIds].length,
		expectedEdges: vertices.length - 1,
		spanning:
			acyclic &&
			uf.count() === 1 &&
			[...edgeIds].length === vertices.length - 1,
	};
};

// ── live-state rows for PseudoState (pure; unit-tested) ──────────────────────

const componentsText = comps =>
	comps.length ? comps.map(g => `{${g.join(',')}}`).join(' ') : '∅';

const edgeLabel = e => (e ? `${e.u}–${e.v} (${e.w})` : '—');

// ── Kruskal frames ───────────────────────────────────────────────────────────

export const kruskalTrace = ({ vertices, edges }) => {
	const sorted = normalizeEdges(edges).sort(byWeightThenId);
	const uf = createUnionFind(vertices);
	const treeEdges = [];
	const rejectedEdges = [];
	const touched = new Set();
	let total = 0;
	const frames = [];

	const push = ({
		line,
		phase,
		considerEdge = null,
		title,
		description,
		stateExtra = [],
	}) => {
		frames.push({
			line,
			phase,
			considerEdge,
			treeEdges: [...treeEdges],
			rejectedEdges: [...rejectedEdges],
			treeNodes: [...touched].sort(),
			components: uf.components(),
			frontier: [],
			totalWeight: total,
			title,
			description,
			state: [
				{ id: 'edge', label: 'edge (u,v)', value: edgeLabel(considerEdge), active: true },
				{ id: 'comps', label: 'components', value: componentsText(uf.components()) },
				{ id: 'tree', label: 'MST edges', value: treeEdges.length },
				{ id: 'weight', label: 'total weight', value: total },
				...stateExtra,
			],
		});
	};

	push({
		line: 1,
		phase: 'init',
		title: 'Sort the edges, isolate the vertices',
		description: `All ${sorted.length} edges sorted ascending by weight; every vertex starts in its own component (make-set).`,
	});

	for (const e of sorted) {
		const ru = uf.find(e.u);
		const rv = uf.find(e.v);
		push({
			line: 4,
			phase: 'consider',
			considerEdge: e,
			title: `Consider ${e.u}–${e.v} (weight ${e.w})`,
			description: `find(${e.u}) = ${ru}, find(${e.v}) = ${rv}. Same root means a cycle; different roots means it is safe.`,
		});
		if (ru !== rv) {
			uf.union(e.u, e.v);
			treeEdges.push(e.id);
			touched.add(e.u);
			touched.add(e.v);
			total += e.w;
			push({
				line: 5,
				phase: 'accept',
				considerEdge: e,
				title: `Accept ${e.u}–${e.v}`,
				description: `Endpoints were in different components, so ${e.u}–${e.v} is the light edge across that cut — safe. Union them.`,
			});
		} else {
			rejectedEdges.push(e.id);
			push({
				line: 6,
				phase: 'reject',
				considerEdge: e,
				title: `Skip ${e.u}–${e.v}`,
				description: `${e.u} and ${e.v} are already connected, so this edge would close a cycle. Reject it.`,
			});
		}
	}

	push({
		line: 7,
		phase: 'done',
		title: 'Minimum spanning tree complete',
		description:
			uf.count() === 1
				? `${treeEdges.length} edges, total weight ${total}. A connected graph on ${vertices.length} vertices needs exactly ${vertices.length - 1}.`
				: `Only ${treeEdges.length} edges found — the graph is disconnected.`,
	});

	return {
		frames,
		treeEdges: [...treeEdges],
		totalWeight: total,
		lines: MST_PSEUDO.kruskal,
	};
};

// ── Prim frames ───────────────────────────────────────────────────────────────

export const primTrace = ({ vertices, edges, start }) => {
	const all = normalizeEdges(edges);
	const startV = start && vertices.includes(start) ? start : vertices[0];
	const tree = new Set([startV]);
	const treeEdges = [];
	let total = 0;
	const frames = [];

	const restOf = () => vertices.filter(v => !tree.has(v));

	const push = ({
		line,
		phase,
		considerEdge = null,
		frontier = [],
		title,
		description,
	}) => {
		frames.push({
			line,
			phase,
			considerEdge,
			treeEdges: [...treeEdges],
			rejectedEdges: [],
			treeNodes: [...tree].sort(),
			components: [[...tree].sort(), restOf()].filter(g => g.length),
			frontier: frontier.map(e => e.id),
			totalWeight: total,
			title,
			description,
			state: [
				{ id: 'tree', label: 'tree', value: `{${[...tree].sort().join(',')}}`, active: true },
				{ id: 'light', label: 'light edge', value: edgeLabel(considerEdge) },
				{ id: 'frontier', label: 'frontier size', value: frontier.length },
				{ id: 'weight', label: 'total weight', value: total },
			],
		});
	};

	const frontierNow = () =>
		all.filter(e => tree.has(e.u) !== tree.has(e.v)).sort(byWeightThenId);

	push({
		line: 1,
		phase: 'init',
		frontier: frontierNow(),
		title: `Start the tree at ${startV}`,
		description: `The cut is always (tree, rest). The frontier is every edge leaving ${startV} — pick the lightest next.`,
	});

	while (tree.size < vertices.length) {
		const frontier = frontierNow();
		if (!frontier.length) break; // disconnected
		const light = frontier[0];
		push({
			line: 3,
			phase: 'consider',
			considerEdge: light,
			frontier,
			title: `Lightest crossing edge: ${light.u}–${light.v} (${light.w})`,
			description: `Of all edges crossing the (tree, rest) cut, ${light.u}–${light.v} is the cheapest. The cut property says it is safe.`,
		});
		const newV = tree.has(light.u) ? light.v : light.u;
		tree.add(newV);
		treeEdges.push(light.id);
		total += light.w;
		push({
			line: 5,
			phase: 'accept',
			considerEdge: light,
			frontier: frontierNow(),
			title: `Add ${light.u}–${light.v}; ${newV} joins the tree`,
			description: `Move ${newV} inside the cut and re-compute the frontier across the new, larger tree.`,
		});
	}

	push({
		line: 7,
		phase: 'done',
		title: 'Minimum spanning tree complete',
		description:
			tree.size === vertices.length
				? `Every vertex connected with total weight ${total} — the same minimum Kruskal reaches.`
				: `Only ${tree.size} vertices reached — the graph is disconnected from ${startV}.`,
	});

	return {
		frames,
		treeEdges: [...treeEdges],
		totalWeight: total,
		lines: MST_PSEUDO.prim,
	};
};

// ── Dispatch + idle frame ─────────────────────────────────────────────────────

export const buildMstTrace = (algorithm, args) => {
	if (algorithm === 'prim') return primTrace(args);
	return kruskalTrace(args);
};

// A single idle frame so the graph renders before any run.
export const idleMstFrame = ({ vertices, algorithm }) => ({
	line: 0,
	phase: 'idle',
	considerEdge: null,
	treeEdges: [],
	rejectedEdges: [],
	treeNodes: algorithm === 'prim' ? [vertices[0]] : [],
	components:
		algorithm === 'prim' ? [[vertices[0]], vertices.slice(1)] : vertices.map(v => [v]),
	frontier: [],
	totalWeight: 0,
	title: 'Ready',
	description: 'Press play to grow the spanning tree.',
	state: [],
});
