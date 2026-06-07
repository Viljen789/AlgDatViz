// Pure, UI-free step-frame generators for the Maximum flow topic.
//
// THE CENTERPIECE: every max-flow algorithm here is built from one loop — find
// an AUGMENTING PATH in the RESIDUAL NETWORK, push its bottleneck of flow along
// it, and repeat until no augmenting path remains. At that point the set of
// vertices still reachable from the source in the residual network defines a
// MINIMUM CUT whose capacity equals the maximum-flow value (the max-flow /
// min-cut theorem).
//
//   Residual capacity of a forward edge (u,v):  c(u,v) − f(u,v)
//   Residual capacity of a back edge   (v,u):  f(u,v)          (lets flow undo)
//   Augment by b along a path: forward edges gain b of flow, back edges lose b.
//
// Ford-Fulkerson and Edmonds-Karp differ ONLY in how they choose the next
// augmenting path over the residual graph:
//
//   • fordFulkersonTrace  — ANY residual path (depth-first search). Correct, but
//                           its running time depends on the flow value: O(E·|f*|).
//   • edmondsKarpTrace    — the SHORTEST residual path by edge count (BFS). This
//                           single rule makes it polynomial: O(V·E²).
//
// These generators are deliberately React-free so the maximum-flow value, the
// residual network, the augmenting paths, and the min-cut extraction can be
// unit-tested in isolation (maxFlowTrace.test.js). The stage and playground only
// render frames; they never re-derive the algorithm.
//
// FRAME CONTRACT (the {line, state} shape PseudoState consumes — see
// common/PlaybackEngine/PseudoState.jsx). Every frame additionally carries the
// max-flow-specific fields the stage + residual view read:
//
//   frame = {
//     flow:        { [edgeKey]: number },   // flow on each ORIGINAL directed edge.
//     value:       number,                  // value of the current flow (out of s).
//     residual:    [{ from, to, residual, kind:'forward'|'back', edgeKey }],
//                                           // the residual network at this beat.
//     path:        [{ from, to, kind, residual }] | null,  // current augmenting path.
//     bottleneck:  number|null,             // min residual along `path`.
//     reachable:   string[],                // vertices reachable from s (BFS/DFS set).
//     minCut:      { S: string[], edges: [{from,to,capacity}], capacity } | null,
//                                           // revealed once no augmenting path remains.
//     phase:       string,                  // 'init'|'search'|'augment'|'done'|'cut'.
//     line:        number,                  // 0-based index into the pseudocode.
//     title:       string,                  // short headline for the beat.
//     description: string,                  // one-line narration (FrameTrace).
//     augmentations:number,                 // running count of augmenting paths.
//   }

const edgeKey = (from, to) => `${from}->${to}`;

const nodeIdsOf = network => network.nodes.map(n => n.id);

// Normalize a network into a stable directed edge list with numeric capacities.
const normalizeEdges = network =>
	network.edges.map(e => ({
		from: e.from,
		to: e.to,
		capacity: Number(e.capacity),
	}));

// ── The shared pseudocode listings (0-based line indices match frame.line) ──
//
// Both algorithms are the SAME augment-until-stuck loop; only the "choose a
// path" line differs (any path vs the shortest path), so it lines up visually.
export const MAXFLOW_PSEUDO = {
	fordFulkerson: [
		'FordFulkerson(G, s, t):',
		'  for each edge (u,v): f[u,v] = 0',
		'  while an augmenting path p exists in G_f:',
		'    p = any residual s→t path (DFS)',
		'    b = min residual capacity along p',
		'    augment flow along p by b',
		'  return |f|  (no path → flow is maximum)',
	],
	edmondsKarp: [
		'EdmondsKarp(G, s, t):',
		'  for each edge (u,v): f[u,v] = 0',
		'  while an augmenting path p exists in G_f:',
		'    p = SHORTEST residual s→t path (BFS)',
		'    b = min residual capacity along p',
		'    augment flow along p by b',
		'  return |f|  (no path → flow is maximum)',
	],
};

// Pseudocode line offsets reused by the drivers, so each beat highlights the
// right line in whichever listing is showing.
const LINE = { init: 1, whileTest: 2, choosePath: 3, bottleneck: 4, augment: 5, done: 6 };

// ── Residual network construction (pure) ──────────────────────────────────────
//
// For every original directed edge (u,v) with capacity c and flow f:
//   • a FORWARD residual edge u→v with residual c − f  (if positive),
//   • a BACK   residual edge v→u with residual f       (if positive, lets us
//     cancel earlier flow).
// Parallel original edges in opposite directions are summed into one net entry
// per direction so the residual graph stays simple. Returns a flat edge list.
export const buildResidual = (edges, flow) => {
	const out = [];
	edges.forEach(e => {
		const key = edgeKey(e.from, e.to);
		const f = flow[key] || 0;
		const forward = e.capacity - f;
		if (forward > 0) {
			out.push({
				from: e.from,
				to: e.to,
				residual: forward,
				kind: 'forward',
				edgeKey: key,
			});
		}
		if (f > 0) {
			out.push({
				from: e.to,
				to: e.from,
				residual: f,
				kind: 'back',
				edgeKey: key,
			});
		}
	});
	return out;
};

// Adjacency of residual edges keyed by their `from` vertex (sorted by `to` for
// deterministic traversal order across runs and tests).
const residualAdj = (ids, residual) => {
	const adj = Object.fromEntries(ids.map(id => [id, []]));
	residual.forEach(re => adj[re.from].push(re));
	Object.values(adj).forEach(list =>
		list.sort((a, b) => a.to.localeCompare(b.to))
	);
	return adj;
};

// Depth-first search for ANY augmenting s→t path over the residual graph.
// Returns { path, reachable } where path is an array of residual edges (or null).
const dfsAugmentingPath = (ids, residual, source, sink) => {
	const adj = residualAdj(ids, residual);
	const visited = new Set([source]);
	const parent = {};
	const stack = [source];
	while (stack.length) {
		const u = stack.pop();
		if (u === sink) break;
		for (const re of adj[u]) {
			if (visited.has(re.to)) continue;
			visited.add(re.to);
			parent[re.to] = re;
			stack.push(re.to);
		}
	}
	return { path: tracePath(parent, source, sink), reachable: [...visited].sort() };
};

// Breadth-first search for the SHORTEST augmenting s→t path (fewest edges).
const bfsAugmentingPath = (ids, residual, source, sink) => {
	const adj = residualAdj(ids, residual);
	const visited = new Set([source]);
	const parent = {};
	const queue = [source];
	while (queue.length) {
		const u = queue.shift();
		if (u === sink) break;
		for (const re of adj[u]) {
			if (visited.has(re.to)) continue;
			visited.add(re.to);
			parent[re.to] = re;
			queue.push(re.to);
		}
	}
	return { path: tracePath(parent, source, sink), reachable: [...visited].sort() };
};

// Rebuild the residual-edge path from the parent map, or null if t unreached.
const tracePath = (parent, source, sink) => {
	if (!parent[sink]) return null;
	const path = [];
	let cur = sink;
	while (cur !== source) {
		const re = parent[cur];
		if (!re) return null;
		path.unshift(re);
		cur = re.from;
	}
	return path;
};

// Apply an augmentation of `b` units along a residual path to the flow map:
// forward residual edges add flow to their original edge, back edges subtract.
const applyAugment = (flow, path, b) => {
	path.forEach(re => {
		if (re.kind === 'forward') flow[re.edgeKey] = (flow[re.edgeKey] || 0) + b;
		else flow[re.edgeKey] = (flow[re.edgeKey] || 0) - b;
	});
};

// Value of a flow = net flow leaving the source.
const flowValue = (edges, flow, source) =>
	edges.reduce((sum, e) => {
		const f = flow[edgeKey(e.from, e.to)] || 0;
		if (e.from === source) return sum + f;
		if (e.to === source) return sum - f;
		return sum;
	}, 0);

// ── Minimum-cut extraction (pure; unit-tested) ────────────────────────────────
//
// Once no augmenting path remains, the set S of vertices reachable from the
// source in the FINAL residual network is one side of a minimum cut. Its
// capacity is the sum of capacities of original edges crossing S → (V∖S). The
// max-flow / min-cut theorem guarantees this equals the maximum-flow value.
export const extractMinCut = (network, flow) => {
	const ids = nodeIdsOf(network);
	const edges = normalizeEdges(network);
	const source = network.source;
	const residual = buildResidual(edges, flow);
	const adj = residualAdj(ids, residual);

	const S = new Set([source]);
	const stack = [source];
	while (stack.length) {
		const u = stack.pop();
		for (const re of adj[u]) {
			if (!S.has(re.to)) {
				S.add(re.to);
				stack.push(re.to);
			}
		}
	}

	const crossing = edges
		.filter(e => S.has(e.from) && !S.has(e.to))
		.map(e => ({ from: e.from, to: e.to, capacity: e.capacity }));
	const capacity = crossing.reduce((sum, e) => sum + e.capacity, 0);

	return { S: [...S].sort(), edges: crossing, capacity };
};

// A base frame factory keeping every frame the same shape.
const baseFrame = ({
	flow,
	value,
	residual = [],
	path = null,
	bottleneck = null,
	reachable = [],
	minCut = null,
	phase = 'init',
	line = 0,
	title = '',
	description = '',
	augmentations = 0,
}) => ({
	flow: { ...flow },
	value,
	residual: residual.map(re => ({ ...re })),
	path: path ? path.map(re => ({ ...re })) : null,
	bottleneck,
	reachable: [...reachable],
	minCut: minCut
		? { S: [...minCut.S], edges: minCut.edges.map(e => ({ ...e })), capacity: minCut.capacity }
		: null,
	phase,
	line,
	title,
	description,
	augmentations,
});

const pathLabel = (source, path) =>
	[source, ...path.map(re => re.to)].join(' → ');

// ── The shared augment-until-stuck driver ─────────────────────────────────────
//
// `findPath(ids, residual, source, sink)` is the only thing Ford-Fulkerson and
// Edmonds-Karp differ on (DFS vs BFS). Everything else — building the residual
// network, finding the bottleneck, augmenting, and revealing the min cut — is
// identical, so both algorithms reuse this body.
const runMaxFlow = (network, findPath, algorithmId) => {
	const ids = nodeIdsOf(network);
	const edges = normalizeEdges(network);
	const source = network.source;
	const sink = network.sink;

	const flow = {};
	edges.forEach(e => {
		flow[edgeKey(e.from, e.to)] = 0;
	});

	const frames = [];
	let augmentations = 0;

	const residual0 = buildResidual(edges, flow);
	frames.push(
		baseFrame({
			flow,
			value: 0,
			residual: residual0,
			phase: 'init',
			line: LINE.init,
			title: 'Start with zero flow',
			description: `Every edge carries 0 flow, so the residual network equals the original capacities. Goal: push as much as possible from ${source} to ${sink}.`,
			augmentations,
		})
	);

	let guard = 0;
	for (;;) {
		guard += 1;
		if (guard > 200) break; // safety net (integer capacities terminate well before).

		const residual = buildResidual(edges, flow);
		const { path, reachable } = findPath(ids, residual, source, sink);

		if (!path) {
			// No augmenting path — the flow is maximum. Reveal the min cut.
			const minCut = extractMinCut(network, flow);
			const value = flowValue(edges, flow, source);
			frames.push(
				baseFrame({
					flow,
					value,
					residual,
					reachable,
					phase: 'cut',
					line: LINE.whileTest,
					title: 'No augmenting path remains',
					description: `${sink} is unreachable from ${source} in the residual network. The reachable set S = {${reachable.join(', ')}} is one side of a minimum cut.`,
					augmentations,
				})
			);
			frames.push(
				baseFrame({
					flow,
					value,
					residual,
					reachable,
					minCut,
					phase: 'done',
					line: LINE.done,
					title: `Maximum flow = ${value}`,
					description: `The min cut crosses ${minCut.edges
						.map(e => `${e.from}→${e.to}`)
						.join(', ')} with total capacity ${minCut.capacity} — equal to the max-flow value ${value} (max-flow = min-cut).`,
					augmentations,
				})
			);
			break;
		}

		// Found an augmenting path: report it, then its bottleneck.
		const bottleneck = Math.min(...path.map(re => re.residual));
		const value = flowValue(edges, flow, source);
		frames.push(
			baseFrame({
				flow,
				value,
				residual,
				path,
				reachable,
				phase: 'search',
				line: LINE.choosePath,
				title: `Augmenting path ${pathLabel(source, path)}`,
				description: `${
					algorithmId === 'edmondsKarp' ? 'BFS' : 'DFS'
				} found a residual path from ${source} to ${sink}. ${
					path.some(re => re.kind === 'back')
						? 'It uses a back edge — flow will be rerouted.'
						: 'Every edge on it still has spare residual capacity.'
				}`,
				augmentations,
			})
		);
		frames.push(
			baseFrame({
				flow,
				value,
				residual,
				path,
				bottleneck,
				reachable,
				phase: 'search',
				line: LINE.bottleneck,
				title: `Bottleneck = ${bottleneck}`,
				description: `The smallest residual capacity along the path is ${bottleneck}, so that is the most flow we can add this round.`,
				augmentations,
			})
		);

		applyAugment(flow, path, bottleneck);
		augmentations += 1;
		const newValue = flowValue(edges, flow, source);
		const residualAfter = buildResidual(edges, flow);
		frames.push(
			baseFrame({
				flow,
				value: newValue,
				residual: residualAfter,
				path,
				bottleneck,
				reachable,
				phase: 'augment',
				line: LINE.augment,
				title: `Augment by ${bottleneck} → flow = ${newValue}`,
				description: `Push ${bottleneck} units along the path: forward edges gain ${bottleneck}, back edges return ${bottleneck}. The residual network updates and the flow value rises to ${newValue}.`,
				augmentations,
			})
		);
	}

	const value = flowValue(edges, flow, source);
	const minCut = extractMinCut(network, flow);
	return {
		frames,
		flow: { ...flow },
		value,
		minCut,
		augmentations,
	};
};

// ── Ford-Fulkerson: any residual path (DFS) ──
export const fordFulkersonTrace = network =>
	runMaxFlow(network, dfsAugmentingPath, 'fordFulkerson');

// ── Edmonds-Karp: the shortest residual path (BFS) ──
export const edmondsKarpTrace = network =>
	runMaxFlow(network, bfsAugmentingPath, 'edmondsKarp');

// Convenience: just the maximum-flow value (and min cut) without the frames.
export const maxFlowValue = network => {
	const { value, minCut } = edmondsKarpTrace(network);
	return { value, minCut };
};

// ── Live state rows for PseudoState (pure; unit-tested) ──
//
// Maps one playback frame onto the {id,label,value,active?} rows PseudoState
// renders beside the pseudocode — surfacing the machine's real values: the flow
// value, the current augmenting path and its bottleneck, and the augmentation
// count. The residual network itself is rendered by the stage from frame.residual.
export const buildStateRows = frame => {
	if (!frame) return [];
	const phase = frame.phase;
	const hasPath = Array.isArray(frame.path) && frame.path.length > 0;
	return [
		{
			id: 'value',
			label: '|f| (flow value)',
			value: frame.value ?? 0,
			active: phase === 'augment' || phase === 'done',
		},
		{
			id: 'path',
			label: 'augmenting path',
			value: hasPath
				? frame.path.map(re => re.to).reduce((acc, to) => `${acc} → ${to}`, frame.path[0].from)
				: '—',
			active: phase === 'search',
		},
		{
			id: 'bottleneck',
			label: 'bottleneck b',
			value: frame.bottleneck ?? '—',
			active: phase === 'search' || phase === 'augment',
		},
		{
			id: 'augmentations',
			label: 'augmentations',
			value: frame.augmentations ?? 0,
			active: phase === 'augment',
		},
		{
			id: 'mincut',
			label: 'min-cut capacity',
			value: frame.minCut ? frame.minCut.capacity : '—',
			active: phase === 'done' || phase === 'cut',
		},
	];
};

// ── Dispatch by algorithm id (shared by stage + playground) ──
export const MAXFLOW_DRIVERS = {
	fordFulkerson: fordFulkersonTrace,
	edmondsKarp: edmondsKarpTrace,
};

export const buildMaxFlowTrace = (algorithmId, network) => {
	const driver = MAXFLOW_DRIVERS[algorithmId];
	return driver
		? driver(network)
		: { frames: [], flow: {}, value: 0, minCut: null, augmentations: 0 };
};

// Expose helpers for the stage and tests.
export { edgeKey, flowValue, pathLabel };
