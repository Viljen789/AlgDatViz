// oneFrontier — the signature interactive's pure engine.
//
// THE ONE IDEA (TDT4120 H9, brief §7 #1):
//   One graph. One loop. A swappable *frontier discipline*. The same loop
//   becomes four different algorithms — only the rule for which vertex leaves the
//   frontier next changes:
//
//     'fifo'      → BFS        (queue: oldest out first)
//     'lifo'      → DFS        (stack: newest out first)
//     'min-dist'  → Dijkstra   (priority queue keyed by tentative distance)
//     'min-edge'  → Prim (MST) (priority queue keyed by lightest crossing edge)
//
// THE GENERIC LOOP (identical for all four):
//
//     init frontier with the start
//     while frontier not empty:
//       u = frontier.extract()        ← the ONLY line that differs
//       settle u
//       for each neighbour v of u:
//         consider/relax (u, v)
//         frontier.add / update v
//
// The four disciplines are four `extract` rules over the same frontier. That
// single choice is the whole difference between the algorithms — this module
// makes that unity literal: one `genericTraverse`, four frontier objects.
//
// This file is deliberately React-free and pure so the discipline→algorithm
// equivalences can be unit-tested without a DOM (oneFrontier.test.js): FIFO must
// reproduce BFS visit order, LIFO a valid DFS order, min-dist Dijkstra's
// distances, and min-edge a minimum spanning tree.
//
// FRAME CONTRACT (the {line, state} shape PseudoState consumes — see
// common/PlaybackEngine/PseudoState.jsx). Every frame additionally carries the
// fields the interactive's graph view reads:
//
//   frame = {
//     line:      number,                 // 0-based index into ONE_FRONTIER_PSEUDO.
//     state:     Array<{id,label,value,active?}>,  // live machine state rows.
//     frontier:  Array<{id,key}>,        // current frontier contents (in extract
//                                        //   order; `key` = the priority shown).
//     visited:   string[],               // settled vertices, in settle order.
//     current:   string|null,            // the vertex just extracted/settling.
//     edge:      { from, to, weight }|null,  // the edge being considered.
//     tree:      Array<{from,to,weight}>,// discovery / MST tree edges so far.
//     dist:      { [id]: number|null },  // tentative key per vertex (null = ∞).
//     accepted:  boolean,                // did this consider step add/update v?
//     phase:     string,                 // 'init'|'extract'|'consider-add'
//                                        //   |'consider-skip'|'done'.
//     title:     string,                 // short headline for the beat.
//     description: string,               // one-line narration.
//   }

const INF = null; // ∞ sentinel (JSON-friendly; rendered as ∞).

const lt = (a, b) => {
	// a < b with null treated as +∞.
	if (a === INF) return false;
	if (b === INF) return true;
	return a < b;
};

// ── Frontier disciplines ─────────────────────────────────────────────────────
//
// Each discipline is the SAME interface — { add, extract, has, size, items } —
// differing only in how `extract` chooses the next vertex. `add(id, ctx)` is
// handed the candidate vertex plus the context it needs to decide its priority
// `key` (the edge weight from the current vertex, and the tentative distance).
//
// `items()` returns the frontier in the order `extract` would drain it, each as
// { id, key }, so the UI can render the live frontier exactly as the algorithm
// sees it.

// FIFO queue → BFS. Order of arrival is the priority; key is the BFS depth.
const fifoFrontier = () => {
	const q = []; // [{ id, key }]
	const inQ = new Set();
	return {
		discipline: 'fifo',
		add: (id, { depth }) => {
			if (inQ.has(id)) return false;
			q.push({ id, key: depth });
			inQ.add(id);
			return true;
		},
		extract: () => {
			const item = q.shift();
			if (item) inQ.delete(item.id);
			return item || null;
		},
		has: id => inQ.has(id),
		size: () => q.length,
		items: () => q.map(x => ({ ...x })),
	};
};

// LIFO stack → DFS. Most recently pushed is extracted first.
const lifoFrontier = () => {
	const s = []; // [{ id, key }] — top of stack is the LAST element
	const inS = new Set();
	return {
		discipline: 'lifo',
		add: (id, { depth }) => {
			if (inS.has(id)) return false;
			s.push({ id, key: depth });
			inS.add(id);
			return true;
		},
		extract: () => {
			const item = s.pop();
			if (item) inS.delete(item.id);
			return item || null;
		},
		has: id => inS.has(id),
		size: () => s.length,
		// items() lists extract order: top of stack first.
		items: () => s.map(x => ({ ...x })).reverse(),
	};
};

// A min-key priority frontier shared by Dijkstra (key = tentative distance) and
// Prim (key = lightest crossing edge). `add` updates the stored key when the new
// candidate is better (decrease-key); `extract` returns the smallest key, ties
// broken by vertex id for determinism.
const minKeyFrontier = discipline => {
	const keyOf = new Map(); // id -> current key
	return {
		discipline,
		add: (id, { key }) => {
			const existing = keyOf.has(id) ? keyOf.get(id) : INF;
			if (lt(key, existing)) {
				keyOf.set(id, key);
				return true; // improved (insert or decrease-key)
			}
			return false;
		},
		extract: () => {
			let best = null;
			for (const [id, key] of keyOf) {
				if (
					best === null ||
					lt(key, best.key) ||
					(key === best.key && id < best.id)
				) {
					best = { id, key };
				}
			}
			if (best) keyOf.delete(best.id);
			return best;
		},
		has: id => keyOf.has(id),
		size: () => keyOf.size,
		items: () =>
			[...keyOf.entries()]
				.map(([id, key]) => ({ id, key }))
				.sort((a, b) => lt(a.key, b.key) ? -1 : lt(b.key, a.key) ? 1 : a.id < b.id ? -1 : 1),
	};
};

const makeFrontier = discipline => {
	switch (discipline) {
		case 'fifo':
			return fifoFrontier();
		case 'lifo':
			return lifoFrontier();
		case 'min-dist':
			return minKeyFrontier('min-dist');
		case 'min-edge':
			return minKeyFrontier('min-edge');
		default:
			return fifoFrontier();
	}
};

// ── Discipline metadata (UI labels + the algorithm each one becomes) ──────────
export const DISCIPLINES = {
	fifo: {
		id: 'fifo',
		structure: 'FIFO queue',
		algorithm: 'BFS',
		fullName: 'Breadth-first search',
		extractRule: 'take the vertex that has waited longest',
		keyLabel: 'depth',
		buildsLabel: 'BFS tree',
		oneLine:
			'A queue hands back the oldest waiting vertex, so the frontier drains layer by layer — that is exactly why BFS finds shortest unweighted paths.',
	},
	lifo: {
		id: 'lifo',
		structure: 'LIFO stack',
		algorithm: 'DFS',
		fullName: 'Depth-first search',
		extractRule: 'take the most recently added vertex',
		keyLabel: 'depth',
		buildsLabel: 'DFS tree',
		oneLine:
			'A stack hands back the newest vertex, so the frontier plunges down one branch before backtracking — depth-first exploration.',
	},
	'min-dist': {
		id: 'min-dist',
		structure: 'min-distance priority queue',
		algorithm: 'Dijkstra',
		fullName: "Dijkstra's shortest paths",
		extractRule: 'take the vertex with the smallest tentative distance',
		keyLabel: 'dist',
		buildsLabel: 'shortest-path tree',
		oneLine:
			'Keyed by tentative distance, the frontier always settles the closest unsettled vertex — Dijkstra. Non-negative weights make that greedy choice final.',
	},
	'min-edge': {
		id: 'min-edge',
		structure: 'min-edge priority queue',
		algorithm: 'Prim',
		fullName: "Prim's minimum spanning tree",
		extractRule: 'take the vertex across the lightest crossing edge',
		keyLabel: 'edge w',
		buildsLabel: 'minimum spanning tree',
		oneLine:
			'Keyed by the lightest edge crossing the cut, the frontier grows one tree across its cheapest boundary edge each step — Prim builds an MST.',
	},
};

export const DISCIPLINE_ORDER = ['fifo', 'lifo', 'min-dist', 'min-edge'];

// ── The ONE shared pseudocode (0-based line indices match frame.line) ─────────
//
// Identical for all four disciplines — only `extract` (line 3) carries a
// per-discipline annotation so the unity is felt while the difference is named.
export const ONE_FRONTIER_PSEUDO = [
	'Traverse(G, s, discipline):',     // 0
	'  add s to the frontier',         // 1
	'  while frontier not empty:',     // 2
	'    u = frontier.extract()',      // 3  ← the only line that changes meaning
	'    settle u',                    // 4
	'    for each neighbour v of u:',  // 5
	'      consider edge (u, v)',      // 6
	'      frontier.add / update v',   // 7
];

const LINE = {
	header: 0,
	addStart: 1,
	whileLoop: 2,
	extract: 3,
	settle: 4,
	forEach: 5,
	consider: 6,
	addUpdate: 7,
};

// ── Graph helpers (pure) ──────────────────────────────────────────────────────

const nodeIdsOf = graph => graph.nodes.map(n => n.id);

const weightOf = e => {
	const w = Number(e.weight);
	return Number.isFinite(w) && w > 0 ? w : 1;
};

// Undirected adjacency, alphabetically sorted (matches utils/graphAlgorithms so a
// learner sees the same deterministic order across the topic).
const buildAdjacency = graph => {
	const adj = new Map(graph.nodes.map(n => [n.id, []]));
	graph.edges.forEach(e => {
		const w = weightOf(e);
		adj.get(e.from)?.push({ to: e.to, weight: w });
		if (e.from !== e.to) adj.get(e.to)?.push({ to: e.from, weight: w });
	});
	adj.forEach(list => list.sort((a, b) => a.to.localeCompare(b.to)));
	return adj;
};

const fmtKey = (discipline, key) => {
	if (key === INF || key === undefined) return '∞';
	return key;
};

// Snapshot the frontier as render-ready { id, key } in extract order.
const frontierItems = frontier => frontier.items();

const stateRows = ({ discipline, current, frontier, visited }) => {
	const meta = DISCIPLINES[discipline];
	const items = frontierItems(frontier);
	const front = items.length
		? items.map(it => `${it.id}:${fmtKey(discipline, it.key)}`).join(' ')
		: '∅';
	const nextOut = items.length ? items[0].id : '—';
	return [
		{ id: 'current', label: 'current (u)', value: current ?? '—', active: true },
		{
			id: 'frontier',
			label: `frontier (${meta.structure})`,
			value: front,
		},
		{
			id: 'next',
			label: 'extract() → next',
			value: nextOut,
			active: true,
		},
		{ id: 'visited', label: 'settled', value: visited.length },
	];
};

const baseFrame = ({
	discipline,
	line,
	frontier,
	visited,
	current = null,
	edge = null,
	tree,
	dist,
	accepted = false,
	phase = 'init',
	title = '',
	description = '',
}) => ({
	line,
	state: stateRows({ discipline, current, frontier, visited }),
	frontier: frontierItems(frontier),
	visited: [...visited],
	current,
	edge: edge ? { ...edge } : null,
	tree: tree.map(t => ({ ...t })),
	dist: { ...dist },
	accepted,
	phase,
	title,
	description,
});

// ── THE GENERIC LOOP ──────────────────────────────────────────────────────────
//
// One traversal, parameterized by `discipline`. The frontier object owns the
// extract rule; everything else is shared. Emits a frame per meaningful beat.
//
// Returns { frames, visitOrder, dist, tree, totalWeight }:
//   visitOrder  the settle order (BFS/DFS visit order; Dijkstra/Prim settle order)
//   dist        final key per vertex: BFS/DFS depth, Dijkstra distance, Prim
//               connecting-edge weight (the standard Prim key)
//   tree        the discovery / MST tree edges (one per settled non-start vertex)
//   totalWeight sum of tree-edge weights (the MST weight for 'min-edge')
export const genericTraverse = (graph, { discipline = 'fifo', start } = {}) => {
	const ids = nodeIdsOf(graph);
	const src = start && ids.includes(start) ? start : ids[0];
	const meta = DISCIPLINES[discipline] || DISCIPLINES.fifo;
	const adj = buildAdjacency(graph);

	const frontier = makeFrontier(discipline);
	const settled = new Set();
	const visitOrder = [];
	const tree = []; // discovery / MST edges
	const frames = [];

	// Per-vertex bookkeeping. `dist` is the discipline's key (depth / distance /
	// lightest-edge weight). `parent`/`parentEdge` record how a vertex was reached.
	const dist = {};
	const depth = {};
	const parentEdge = {}; // id -> { from, to, weight }
	ids.forEach(id => {
		dist[id] = INF;
		depth[id] = INF;
	});

	// Seed the start.
	dist[src] = 0;
	depth[src] = 0;
	const seedCtx = { depth: 0, key: 0 };
	frontier.add(src, seedCtx);

	frames.push(
		baseFrame({
			discipline,
			line: LINE.addStart,
			frontier,
			visited: visitOrder,
			current: null,
			tree,
			dist,
			phase: 'init',
			title: `Seed the frontier with ${src}`,
			description: `Same loop, ${meta.structure}. Start ${src} enters the frontier; from here only one rule differs — extract() ${meta.extractRule}. That single choice makes this ${meta.algorithm}.`,
		})
	);

	while (frontier.size() > 0) {
		const picked = frontier.extract();
		if (!picked) break;
		const u = picked.id;
		if (settled.has(u)) continue;

		settled.add(u);
		visitOrder.push(u);
		// Record the tree edge that connected u (skip the start).
		if (parentEdge[u]) tree.push(parentEdge[u]);

		frames.push(
			baseFrame({
				discipline,
				line: LINE.extract,
				frontier,
				visited: visitOrder,
				current: u,
				edge: parentEdge[u] || null,
				tree,
				dist,
				phase: 'extract',
				title: `extract() → ${u}`,
				description:
					discipline === 'min-edge'
						? `The ${meta.structure} hands back ${u} across the lightest crossing edge (key ${fmtKey(discipline, picked.key)}). Settle it into the tree.`
						: discipline === 'min-dist'
							? `The ${meta.structure} hands back ${u}, the closest unsettled vertex (dist ${fmtKey(discipline, picked.key)}). With non-negative weights that distance is now final.`
							: `The ${meta.structure} hands back ${u}. Settle it, then look at its neighbours.`,
			})
		);

		for (const { to: v, weight: w } of adj.get(u) || []) {
			if (settled.has(v)) {
				continue;
			}

			// The per-discipline priority key for v reached via (u, v).
			let candidateKey;
			if (discipline === 'min-dist') candidateKey = (dist[u] ?? 0) + w;
			else if (discipline === 'min-edge') candidateKey = w;
			else candidateKey = depth[u] + 1; // fifo / lifo: BFS/DFS depth

			const ctx = { depth: depth[u] + 1, key: candidateKey };
			const before = dist[v];
			const accepted = frontier.add(v, ctx);

			if (accepted) {
				dist[v] = candidateKey;
				depth[v] = depth[u] + 1;
				parentEdge[v] = { from: u, to: v, weight: w };
				frames.push(
					baseFrame({
						discipline,
						line: LINE.addUpdate,
						frontier,
						visited: visitOrder,
						current: u,
						edge: { from: u, to: v, weight: w },
						tree,
						dist,
						accepted: true,
						phase: 'consider-add',
						title: `consider ${u}–${v}: add / update`,
						description:
							discipline === 'min-dist'
								? `dist[${u}] + ${w} = ${candidateKey}${before === INF ? '' : ` < ${before}`} improves ${v}; update its key and predecessor.`
								: discipline === 'min-edge'
									? `Edge ${u}–${v} (weight ${w}) is the best crossing edge to ${v} so far; key ${v} by ${w}.`
									: `${v} is unseen; add it to the ${meta.structure} (depth ${candidateKey}).`,
					})
				);
			} else {
				frames.push(
					baseFrame({
						discipline,
						line: LINE.consider,
						frontier,
						visited: visitOrder,
						current: u,
						edge: { from: u, to: v, weight: w },
						tree,
						dist,
						accepted: false,
						phase: 'consider-skip',
						title: `consider ${u}–${v}: keep`,
						description:
							discipline === 'min-dist'
								? `dist[${u}] + ${w} = ${candidateKey} is not better than ${v}'s current key (${fmtKey(discipline, before)}); leave it.`
								: discipline === 'min-edge'
									? `Edge ${u}–${v} (weight ${w}) is not lighter than ${v}'s current crossing edge (${fmtKey(discipline, before)}); leave it.`
									: `${v} is already in the frontier; the ${meta.structure} keeps its first arrival.`,
					})
				);
			}
		}
	}

	const totalWeight = tree.reduce((sum, e) => sum + e.weight, 0);

	frames.push(
		baseFrame({
			discipline,
			line: LINE.whileLoop,
			frontier,
			visited: visitOrder,
			current: null,
			tree,
			dist,
			phase: 'done',
			title: `${meta.algorithm} complete`,
			description:
				discipline === 'min-edge'
					? `The frontier is empty. The ${tree.length} tree edges form a ${meta.buildsLabel} of total weight ${totalWeight}.`
					: discipline === 'min-dist'
						? `The frontier is empty. The dist keys are the final shortest-path distances; the tree edges form the ${meta.buildsLabel}.`
						: `The frontier is empty. Settle order: ${visitOrder.join(' → ')}. The tree edges form the ${meta.buildsLabel}.`,
		})
	);

	return {
		frames,
		visitOrder: [...visitOrder],
		dist: { ...dist },
		tree: tree.map(t => ({ ...t })),
		totalWeight,
	};
};

// A single idle frame so the graph renders before any run, sharing the frame
// shape (start seeded, nothing settled).
export const idleFrame = (graph, { discipline = 'fifo', start } = {}) => {
	const ids = nodeIdsOf(graph);
	const src = start && ids.includes(start) ? start : ids[0];
	const frontier = makeFrontier(discipline);
	const dist = {};
	ids.forEach(id => {
		dist[id] = id === src ? 0 : INF;
	});
	frontier.add(src, { depth: 0, key: 0 });
	return baseFrame({
		discipline,
		line: LINE.header,
		frontier,
		visited: [],
		current: null,
		tree: [],
		dist,
		phase: 'init',
		title: 'Ready',
		description: `One loop, one frontier. Pick a discipline, then run — the same code becomes ${DISCIPLINES[discipline]?.algorithm ?? 'a traversal'}.`,
	});
};

// ── Dispatch (shared by the interactive) ──────────────────────────────────────
export const buildOneFrontierTrace = (discipline, graph, options = {}) =>
	genericTraverse(graph, { ...options, discipline });

// Expose the ∞ sentinel + helpers for tests and the UI.
export const INFINITY = INF;
export { fmtKey as formatKey };
