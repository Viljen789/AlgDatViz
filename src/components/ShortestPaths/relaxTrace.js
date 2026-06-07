// Pure, UI-free step-frame generators for the Single-source shortest paths topic.
//
// THE CENTERPIECE: every SSSP algorithm in this topic is built from one atomic
// move — Relax(u, v, w):
//
//     if dist[u] + w < dist[v]:
//         dist[v] = dist[u] + w
//         pred[v] = u
//
// Bellman-Ford, DAG shortest paths, and Dijkstra differ ONLY in the *order* in
// which they call Relax over the edges. So this module exposes a single `relax`
// primitive (the same one, emitting the same kind of frame) and three drivers
// that schedule relax calls differently:
//
//   • bellmanFordTrace        — relax ALL edges, V−1 times, then one more pass to
//                               detect a negative-weight cycle. Handles negatives.
//   • dagShortestPathsTrace   — relax each vertex's out-edges in topological order.
//                               One pass; works with negatives; needs a DAG.
//   • dijkstraTrace           — repeatedly settle the closest unsettled vertex
//                               from a priority queue, relaxing its out-edges.
//                               Greedy; requires non-negative weights.
//
// These generators are deliberately React-free so the resulting distances, the
// predecessor subgraph, and negative-cycle detection can be unit-tested in
// isolation (relaxTrace.test.js). The stage and playground only render frames;
// they never re-derive the algorithm.
//
// FRAME CONTRACT (the {line, state} shape PseudoState consumes — see
// common/PlaybackEngine/PseudoState.jsx). Every frame additionally carries the
// SSSP-specific fields the stage + dist/pred table read:
//
//   frame = {
//     dist:        { [nodeId]: number|null },  // tentative distances (null = ∞).
//     pred:        { [nodeId]: string|null },  // predecessor in the SP tree.
//     edge:        { from, to, weight } | null,// the edge being relaxed this beat.
//     improved:    boolean,                    // did this relax improve dist[v]?
//     settled:     string[],                   // settled vertices (Dijkstra).
//     active:      string|null,                // the vertex currently expanded.
//     pass:        number|null,                // Bellman-Ford pass index (1..V).
//     order:       string[],                   // topological order (DAG-SP).
//     negativeCycle: boolean,                  // true on the detection beat.
//     phase:       string,                     // 'init'|'relax-improve'|'relax-keep'
//                                              //   |'settle'|'pass'|'done'|'cycle'.
//     line:        number,                     // 0-based index into the pseudocode.
//     title:       string,                     // short headline for the beat.
//     description: string,                     // one-line narration (FrameTrace).
//     relaxations: number,                     // running count of relax calls.
//     improvements:number,                     // running count of improving relaxes.
//   }

const INF = null; // null is our ∞ sentinel (JSON-friendly, easy to render).

const lt = (a, b) => {
	// a < b with null treated as +∞.
	if (a === INF) return false;
	if (b === INF) return true;
	return a < b;
};

const add = (a, w) => (a === INF ? INF : a + w);

const cloneDist = dist => ({ ...dist });
const clonePred = pred => ({ ...pred });

// Normalize an arbitrary graph ({ nodes:[{id}], edges:[{from,to,weight}] }) into
// a directed edge list with numeric weights and a stable node-id order. Edges
// here are ALWAYS directed (SSSP is a directed-graph story); an undirected input
// would be expanded by the caller before reaching here.
const normalizeEdges = graph =>
	graph.edges.map(e => ({
		from: e.from,
		to: e.to,
		weight: Number(e.weight),
	}));

const nodeIdsOf = graph => graph.nodes.map(n => n.id);

const initDist = (graph, source) => {
	const dist = {};
	const pred = {};
	nodeIdsOf(graph).forEach(id => {
		dist[id] = id === source ? 0 : INF;
		pred[id] = null;
	});
	return { dist, pred };
};

const baseFrame = ({
	dist,
	pred,
	edge = null,
	improved = false,
	settled = [],
	active = null,
	pass = null,
	order = [],
	negativeCycle = false,
	phase = 'init',
	line = 0,
	title = '',
	description = '',
	relaxations = 0,
	improvements = 0,
}) => ({
	dist: cloneDist(dist),
	pred: clonePred(pred),
	edge: edge ? { ...edge } : null,
	improved,
	settled: [...settled],
	active,
	pass,
	order: [...order],
	negativeCycle,
	phase,
	line,
	title,
	description,
	relaxations,
	improvements,
});

// ── The shared pseudocode listings (0-based line indices match frame.line) ──
//
// Each algorithm's listing makes the shared Relax block visually identical: the
// `if dist[u] + w < dist[v]` test, the `dist[v] = …`, and the `pred[v] = u`
// update line up across all three so the unity is felt, not asserted.
export const SSSP_PSEUDO = {
	relax: [
		'Relax(u, v, w):',
		'  if dist[u] + w < dist[v]:',
		'    dist[v] = dist[u] + w',
		'    pred[v] = u',
	],
	bellmanFord: [
		'BellmanFord(G, s):',
		'  init dist[s]=0, others=∞',
		'  repeat |V|-1 times:',
		'    for each edge (u,v,w):',
		'      Relax(u, v, w)',
		'  for each edge (u,v,w):',
		'    if dist[u]+w < dist[v]: report NEGATIVE CYCLE',
	],
	dagShortestPaths: [
		'DAG-Shortest-Paths(G, s):',
		'  topologically sort V',
		'  init dist[s]=0, others=∞',
		'  for each u in topo order:',
		'    for each edge (u,v,w):',
		'      Relax(u, v, w)',
	],
	dijkstra: [
		'Dijkstra(G, s):',
		'  init dist[s]=0, others=∞',
		'  Q = all vertices',
		'  while Q not empty:',
		'    u = ExtractMin(Q)   // smallest dist',
		'    for each edge (u,v,w):',
		'      Relax(u, v, w)',
	],
};

// The Relax pseudocode line offsets WITHIN each algorithm's listing, so a relax
// beat can highlight the (shared) test/update lines that belong to that driver.
const RELAX_LINES = {
	bellmanFord: { test: 4, update: 4 }, // the single `Relax(u,v,w)` call line
	dagShortestPaths: { test: 5, update: 5 },
	dijkstra: { test: 6, update: 6 },
};

// ── THE RELAX PRIMITIVE ──────────────────────────────────────────────────────
//
// The atomic move every SSSP algorithm shares. Mutates `dist`/`pred` in place
// when the edge improves the destination, pushes ONE compare beat (and, on an
// improvement, leaves the new values in the next frame the driver emits), and
// threads a running counter so the drivers can report relaxation totals.
//
// Returns whether the edge improved dist[v]. The frame it pushes uses the
// driver's relax line so the synced pseudocode lands on the shared Relax block.
export const relax = (
	edge,
	{ dist, pred, frames, counter, driver, ctx = {} }
) => {
	const { from: u, to: v, weight: w } = edge;
	counter.relaxations += 1;

	const candidate = add(dist[u], w);
	const improves = lt(candidate, dist[v]);
	const lineSet = RELAX_LINES[driver] || RELAX_LINES.bellmanFord;

	if (improves) {
		dist[v] = candidate;
		pred[v] = u;
		counter.improvements += 1;
		frames.push(
			baseFrame({
				dist,
				pred,
				edge,
				improved: true,
				phase: 'relax-improve',
				line: lineSet.update,
				title: `Relax ${u} → ${v}: improves`,
				description: `dist[${u}] + ${w} = ${candidate} < dist[${v}] — so dist[${v}] = ${candidate} and pred[${v}] = ${u}.`,
				relaxations: counter.relaxations,
				improvements: counter.improvements,
				...ctx,
			})
		);
	} else {
		const lhs = candidate === INF ? '∞' : candidate;
		const rhs = dist[v] === INF ? '∞' : dist[v];
		frames.push(
			baseFrame({
				dist,
				pred,
				edge,
				improved: false,
				phase: 'relax-keep',
				line: lineSet.test,
				title: `Relax ${u} → ${v}: no change`,
				description: `dist[${u}] + ${w} = ${lhs} is not less than dist[${v}] = ${rhs}, so nothing changes.`,
				relaxations: counter.relaxations,
				improvements: counter.improvements,
				...ctx,
			})
		);
	}
	return improves;
};

// ── Bellman-Ford: relax ALL edges |V|−1 times, then detect a negative cycle ──
export const bellmanFordTrace = (graph, { source } = {}) => {
	const ids = nodeIdsOf(graph);
	const src = source && ids.includes(source) ? source : ids[0];
	const edges = normalizeEdges(graph);
	const { dist, pred } = initDist(graph, src);
	const counter = { relaxations: 0, improvements: 0 };
	const frames = [];

	frames.push(
		baseFrame({
			dist,
			pred,
			phase: 'init',
			line: 1,
			title: `Initialize from ${src}`,
			description: `dist[${src}] = 0, every other vertex = ∞. No predecessors yet.`,
		})
	);

	const V = ids.length;
	for (let pass = 1; pass <= V - 1; pass++) {
		frames.push(
			baseFrame({
				dist,
				pred,
				pass,
				phase: 'pass',
				line: 2,
				title: `Pass ${pass} of ${V - 1}`,
				description: `Relax every edge once more. After pass k, all shortest paths using ≤ k edges are correct.`,
				relaxations: counter.relaxations,
				improvements: counter.improvements,
			})
		);
		for (const edge of edges) {
			relax(edge, {
				dist,
				pred,
				frames,
				counter,
				driver: 'bellmanFord',
				ctx: { pass },
			});
		}
	}

	// Detection pass: any edge that can still be relaxed means a reachable
	// negative-weight cycle exists (no finite shortest path).
	let negativeCycle = false;
	let offender = null;
	for (const edge of edges) {
		if (lt(add(dist[edge.from], edge.weight), dist[edge.to])) {
			negativeCycle = true;
			offender = edge;
			break;
		}
	}

	if (negativeCycle) {
		frames.push(
			baseFrame({
				dist,
				pred,
				edge: offender,
				negativeCycle: true,
				phase: 'cycle',
				line: 6,
				title: 'Negative-weight cycle detected',
				description: `Edge ${offender.from} → ${offender.to} still relaxes after |V|−1 passes — a reachable negative cycle means no shortest path exists.`,
				relaxations: counter.relaxations,
				improvements: counter.improvements,
			})
		);
	} else {
		frames.push(
			baseFrame({
				dist,
				pred,
				phase: 'done',
				line: 5,
				title: 'Shortest paths found',
				description: `No edge relaxes on the check pass, so the distances are final and there is no negative cycle.`,
				relaxations: counter.relaxations,
				improvements: counter.improvements,
			})
		);
	}

	return {
		frames,
		dist: cloneDist(dist),
		pred: clonePred(pred),
		negativeCycle,
		relaxations: counter.relaxations,
		improvements: counter.improvements,
	};
};

// ── Topological sort (Kahn) over the directed edge list — for DAG-SP ──
//
// Returns { order, hasCycle }. A cycle means DAG-SP cannot run (no valid order).
export const topologicalOrder = graph => {
	const ids = nodeIdsOf(graph);
	const edges = normalizeEdges(graph);
	const indeg = Object.fromEntries(ids.map(id => [id, 0]));
	const adj = Object.fromEntries(ids.map(id => [id, []]));
	edges.forEach(e => {
		indeg[e.to] += 1;
		adj[e.from].push(e.to);
	});
	const queue = ids.filter(id => indeg[id] === 0).sort();
	const order = [];
	while (queue.length) {
		const u = queue.shift();
		order.push(u);
		adj[u]
			.slice()
			.sort()
			.forEach(v => {
				indeg[v] -= 1;
				if (indeg[v] === 0) {
					queue.push(v);
					queue.sort();
				}
			});
	}
	return { order, hasCycle: order.length !== ids.length };
};

// ── DAG shortest paths: relax out-edges in topological order (one pass) ──
export const dagShortestPathsTrace = (graph, { source } = {}) => {
	const ids = nodeIdsOf(graph);
	const src = source && ids.includes(source) ? source : ids[0];
	const edges = normalizeEdges(graph);
	const { order, hasCycle } = topologicalOrder(graph);
	const { dist, pred } = initDist(graph, src);
	const counter = { relaxations: 0, improvements: 0 };
	const frames = [];

	if (hasCycle) {
		frames.push(
			baseFrame({
				dist,
				pred,
				phase: 'cycle',
				line: 1,
				title: 'Not a DAG',
				description:
					'This graph has a directed cycle, so no topological order exists and DAG-SP cannot run.',
			})
		);
		return {
			frames,
			dist: cloneDist(dist),
			pred: clonePred(pred),
			order,
			hasCycle: true,
			relaxations: 0,
			improvements: 0,
		};
	}

	frames.push(
		baseFrame({
			dist,
			pred,
			order,
			phase: 'init',
			line: 1,
			title: 'Topologically sort the DAG',
			description: `A valid order is ${order.join(' → ')}. Processing vertices in this order means every predecessor's distance is final before we use it.`,
		})
	);
	frames.push(
		baseFrame({
			dist,
			pred,
			order,
			phase: 'init',
			line: 2,
			title: `Initialize from ${src}`,
			description: `dist[${src}] = 0, every other vertex = ∞.`,
		})
	);

	const adj = Object.fromEntries(ids.map(id => [id, []]));
	edges.forEach(e => adj[e.from].push(e));

	for (const u of order) {
		frames.push(
			baseFrame({
				dist,
				pred,
				order,
				active: u,
				phase: 'settle',
				line: 3,
				title: `Process ${u}`,
				description:
					dist[u] === INF
						? `${u} is unreachable so far (dist = ∞); relaxing from it cannot help yet.`
						: `dist[${u}] = ${dist[u]} is already final. Relax each edge leaving ${u}.`,
				relaxations: counter.relaxations,
				improvements: counter.improvements,
			})
		);
		for (const edge of adj[u].slice().sort((a, b) => a.to.localeCompare(b.to))) {
			relax(edge, {
				dist,
				pred,
				frames,
				counter,
				driver: 'dagShortestPaths',
				ctx: { order, active: u },
			});
		}
	}

	frames.push(
		baseFrame({
			dist,
			pred,
			order,
			phase: 'done',
			line: 0,
			title: 'Shortest paths found',
			description: `One pass in topological order suffices — ${counter.relaxations} relaxations, no repeats needed. Negative edges are fine; only cycles are forbidden.`,
			relaxations: counter.relaxations,
			improvements: counter.improvements,
		})
	);

	return {
		frames,
		dist: cloneDist(dist),
		pred: clonePred(pred),
		order,
		hasCycle: false,
		relaxations: counter.relaxations,
		improvements: counter.improvements,
	};
};

// ── Dijkstra: settle the closest unsettled vertex, relax its out-edges ──
//
// Built on the SAME relax primitive. Requires non-negative weights; if a
// negative edge is present we still run (for teaching) but flag it.
export const dijkstraTrace = (graph, { source } = {}) => {
	const ids = nodeIdsOf(graph);
	const src = source && ids.includes(source) ? source : ids[0];
	const edges = normalizeEdges(graph);
	const hasNegative = edges.some(e => e.weight < 0);
	const { dist, pred } = initDist(graph, src);
	const counter = { relaxations: 0, improvements: 0 };
	const frames = [];

	const adj = Object.fromEntries(ids.map(id => [id, []]));
	edges.forEach(e => adj[e.from].push(e));

	const settled = new Set();

	frames.push(
		baseFrame({
			dist,
			pred,
			phase: 'init',
			line: 1,
			title: `Initialize from ${src}`,
			description: `dist[${src}] = 0, every other vertex = ∞. All vertices start in the priority queue.`,
		})
	);

	for (;;) {
		// ExtractMin over unsettled vertices, tie-broken by id for determinism.
		let u = null;
		for (const id of ids) {
			if (settled.has(id)) continue;
			if (dist[id] === INF) continue;
			if (u === null || lt(dist[id], dist[u])) u = id;
		}
		if (u === null) break;

		settled.add(u);
		frames.push(
			baseFrame({
				dist,
				pred,
				settled: [...settled].sort(),
				active: u,
				phase: 'settle',
				line: 4,
				title: `Settle ${u} (dist = ${dist[u]})`,
				description: `${u} has the smallest tentative distance among the unsettled, so with non-negative weights that distance is final.`,
				relaxations: counter.relaxations,
				improvements: counter.improvements,
			})
		);

		for (const edge of adj[u].slice().sort((a, b) => a.to.localeCompare(b.to))) {
			if (settled.has(edge.to)) continue;
			relax(edge, {
				dist,
				pred,
				frames,
				counter,
				driver: 'dijkstra',
				ctx: { settled: [...settled].sort(), active: u },
			});
		}
	}

	frames.push(
		baseFrame({
			dist,
			pred,
			settled: [...settled].sort(),
			phase: 'done',
			line: 0,
			title: 'Shortest-path tree complete',
			description: hasNegative
				? `Settled ${settled.size} vertices — but this graph has a negative edge, so the settled-once guarantee can be wrong. Use Bellman-Ford for negatives.`
				: `Settled ${settled.size} reachable vertices in ${counter.relaxations} relaxations. The pred pointers form the shortest-path tree.`,
			relaxations: counter.relaxations,
			improvements: counter.improvements,
		})
	);

	return {
		frames,
		dist: cloneDist(dist),
		pred: clonePred(pred),
		settled: [...settled].sort(),
		hasNegative,
		relaxations: counter.relaxations,
		improvements: counter.improvements,
	};
};

// ── Live state rows for PseudoState (pure; unit-tested) ──
//
// Maps one playback frame onto the {id,label,value,active?} rows PseudoState
// renders beside the pseudocode — surfacing the machine's real values: the edge
// being relaxed, whether it improved, and the running relaxation counts. The
// dist[]/pred[] tables are rendered by the stage from frame.dist/frame.pred.
const fmt = v => (v === INF || v === undefined ? '∞' : v);

export const buildStateRows = frame => {
	if (!frame) return [];
	const edge = frame.edge;
	const phase = frame.phase;
	return [
		{
			id: 'edge',
			label: 'edge (u→v, w)',
			value: edge ? `${edge.from}→${edge.to}, ${edge.weight}` : '—',
			active: phase === 'relax-improve' || phase === 'relax-keep',
		},
		{
			id: 'test',
			label: 'dist[u] + w',
			value: edge ? fmt(add(frame.dist[edge.from], edge.weight)) : '—',
			active: phase === 'relax-keep',
		},
		{
			id: 'distv',
			label: 'dist[v]',
			value: edge ? fmt(frame.dist[edge.to]) : '—',
			active: phase === 'relax-improve',
		},
		{
			id: 'relaxations',
			label: 'relaxations',
			value: frame.relaxations ?? 0,
			active: phase === 'relax-improve' || phase === 'relax-keep',
		},
		{
			id: 'improvements',
			label: 'improving relaxes',
			value: frame.improvements ?? 0,
			active: phase === 'relax-improve',
		},
	];
};

// Reconstruct the path s → t from a predecessor map, or null if unreachable.
export const reconstructPath = (pred, source, target) => {
	if (target === source) return [source];
	const path = [];
	let cur = target;
	const seen = new Set();
	while (cur != null && !seen.has(cur)) {
		path.unshift(cur);
		seen.add(cur);
		if (cur === source) return path;
		cur = pred[cur];
	}
	return null; // unreachable (or cycle in pred — shouldn't happen for trees)
};

// ── Dispatch by algorithm id (shared by stage + playground) ──
export const SSSP_DRIVERS = {
	bellmanFord: bellmanFordTrace,
	dagShortestPaths: dagShortestPathsTrace,
	dijkstra: dijkstraTrace,
};

export const buildSsspTrace = (algorithmId, graph, options) => {
	const driver = SSSP_DRIVERS[algorithmId];
	return driver ? driver(graph, options) : { frames: [], dist: {}, pred: {} };
};

// Expose the ∞ sentinel + helpers for tests and the stage.
export const INFINITY = INF;
export { fmt as formatDist };
