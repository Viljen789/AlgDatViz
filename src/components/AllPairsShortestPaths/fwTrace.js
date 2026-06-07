// Pure, UI-free step-frame generators for the All-pairs shortest paths topic.
//
// THE CENTERPIECE: Floyd-Warshall is a dynamic program over the *intermediate*
// vertices it is allowed to route through. Number the vertices 1..n. Let
//
//     d_k[i][j] = the length of a shortest path from i to j whose internal
//                 vertices all come from the set {1, …, k}.
//
// With no intermediates allowed (k = 0) that is just the direct edge (or 0 on the
// diagonal, ∞ otherwise). Adding vertex k to the allowed set, a shortest i→j path
// either ignores k or goes i → … → k → … → j — and each half only uses
// intermediates from {1, …, k−1}. So the recurrence is:
//
//     d_k[i][j] = min( d_{k−1}[i][j],            // don't route through k
//                      d_{k−1}[i][k] + d_{k−1}[k][j] )  // route through k
//
// Three nested loops (k outermost, then i, then j) fill the matrix in Θ(V³) time,
// reusing the previous layer in place. A predecessor matrix π is updated alongside
// it so any shortest path can be reconstructed.
//
// TRANSITIVE CLOSURE is the boolean reachability twin of the same recurrence:
//
//     t_k[i][j] = t_{k−1}[i][j]  OR  ( t_{k−1}[i][k] AND t_{k−1}[k][j] )
//
// "i can reach j through {1..k}" iff it could already, or it can reach k and k
// can reach j. Same triple loop, AND/OR instead of +/min.
//
// These generators are deliberately React-free so the per-k matrices, the
// predecessor reconstruction, and the closure can be unit-tested in isolation
// (fwTrace.test.js). The stage and playground only render frames; they never
// re-derive the algorithm.
//
// FRAME CONTRACT (the {line, state} shape PseudoState consumes — see
// common/PlaybackEngine/PseudoState.jsx). Every cell-relax frame also carries the
// APSP-specific fields the matrix stage reads:
//
//   frame = {
//     dist:    number[][] | null[][],  // the working distance matrix (null = ∞).
//     pred:    (number|null)[][],      // predecessor matrix π.
//     k, i, j: number|null,            // the loop indices this beat (0-based).
//     readIK:  [i,k] | null,           // the dist[i][k] cell being READ.
//     readKJ:  [k,j] | null,           // the dist[k][j] cell being READ.
//     write:   [i,j] | null,           // the dist[i][j] cell possibly written.
//     candidate: number|null,          // dist[i][k] + dist[k][j] this beat.
//     improved:  boolean,              // did routing through k lower dist[i][j]?
//     phase:   string,                 // 'init'|'k-round'|'compare'|'improve'
//                                      //   |'keep'|'done'.
//     line:    number,                 // 0-based index into the pseudocode.
//     title:   string,                 // short headline for the beat.
//     description: string,             // one-line narration (FrameTrace).
//     updates: number,                 // running count of improving writes.
//     compares: number,                // running count of compared cells.
//   }

const INF = null; // null is our ∞ sentinel (JSON-friendly, easy to render).

const lt = (a, b) => {
	// a < b with null treated as +∞.
	if (a === INF) return false;
	if (b === INF) return true;
	return a < b;
};

const add = (a, b) => (a === INF || b === INF ? INF : a + b);

// Deep-copy an n×n matrix (numbers / null) so each frame snapshots its own state.
const cloneMatrix = m => m.map(row => row.slice());

const nodeIdsOf = graph => graph.nodes.map(n => n.id);

// Build the k = 0 distance + predecessor matrices from the directed edge list.
//   dist[i][i] = 0, dist[i][j] = w(i,j) for a direct edge, ∞ otherwise.
//   pred[i][j] = i for a direct edge (the last hop before j is i), else null.
const initMatrices = graph => {
	const ids = nodeIdsOf(graph);
	const n = ids.length;
	const idx = Object.fromEntries(ids.map((id, i) => [id, i]));
	const dist = Array.from({ length: n }, (_, i) =>
		Array.from({ length: n }, (_, j) => (i === j ? 0 : INF))
	);
	const pred = Array.from({ length: n }, () => Array.from({ length: n }, () => null));
	graph.edges.forEach(e => {
		const i = idx[e.from];
		const j = idx[e.to];
		if (i == null || j == null) return;
		const w = Number(e.weight);
		// Keep the lightest parallel edge; ignore non-improving self-loops.
		if (i === j) return;
		if (dist[i][j] === INF || w < dist[i][j]) {
			dist[i][j] = w;
			pred[i][j] = ids[i];
		}
	});
	return { ids, n, dist, pred };
};

// ── The pseudocode listing (0-based line indices match frame.line) ──
export const FW_PSEUDO = {
	floydWarshall: [
		'Floyd-Warshall(W):',
		'  D = W   // d[i][j] = edge i→j (∞ if none, 0 on diagonal)',
		'  for k = 1 to n:',
		'    for i = 1 to n:',
		'      for j = 1 to n:',
		'        if d[i][k] + d[k][j] < d[i][j]:',
		'          d[i][j] = d[i][k] + d[k][j]',
		'          π[i][j] = π[k][j]',
		'  return D, π',
	],
	transitiveClosure: [
		'Transitive-Closure(G):',
		'  T = adjacency (T[i][i] = true)',
		'  for k = 1 to n:',
		'    for i = 1 to n:',
		'      for j = 1 to n:',
		'        T[i][j] = T[i][j] OR (T[i][k] AND T[k][j])',
		'  return T',
	],
};

// Line indices within the Floyd-Warshall listing (for frame.line).
const FW_LINE = {
	init: 1,
	kLoop: 2,
	iLoop: 3,
	jLoop: 4,
	test: 5,
	write: 6,
	done: 8,
};

const fmt = v => (v === INF || v === undefined ? '∞' : v);

/**
 * floydWarshall — the dynamic program over intermediate vertices.
 *
 * Returns the final distance + predecessor matrices, a snapshot of the distance
 * matrix AFTER each k-round (`layers[k]`, with `layers[0]` = the k=0 / direct
 * matrix), the node-id order, a negative-cycle flag (any diagonal entry < 0),
 * and a full per-cell `frames` timeline for the playback engine.
 *
 * @param {{nodes:{id}[], edges:{from,to,weight}[]}} graph
 * @returns {{
 *   ids:string[], n:number,
 *   dist:(number|null)[][], pred:(string|null)[][],
 *   layers:(number|null)[][][],   // layers[k] = D after allowing {1..k}
 *   negativeCycle:boolean,
 *   updates:number, compares:number,
 *   frames:object[],
 * }}
 */
export const floydWarshall = graph => {
	const { ids, n, dist, pred } = initMatrices(graph);
	const layers = [cloneMatrix(dist)]; // layers[0] = k=0 (direct edges)
	const frames = [];
	let updates = 0;
	let compares = 0;

	frames.push({
		dist: cloneMatrix(dist),
		pred: pred.map(r => r.slice()),
		k: null,
		i: null,
		j: null,
		readIK: null,
		readKJ: null,
		write: null,
		candidate: null,
		improved: false,
		phase: 'init',
		line: FW_LINE.init,
		title: 'Initialize D with the direct edges',
		description:
			'd[i][j] starts as the weight of edge i→j (0 on the diagonal, ∞ where no edge exists). No intermediate vertices are allowed yet — this is the k = 0 layer.',
		updates,
		compares,
	});

	for (let k = 0; k < n; k++) {
		frames.push({
			dist: cloneMatrix(dist),
			pred: pred.map(r => r.slice()),
			k,
			i: null,
			j: null,
			readIK: null,
			readKJ: null,
			write: null,
			candidate: null,
			improved: false,
			phase: 'k-round',
			line: FW_LINE.kLoop,
			title: `Allow paths through ${ids[k]} (k = ${k + 1})`,
			description: `Now every shortest path may route through any of {${ids
				.slice(0, k + 1)
				.join(', ')}}. For each pair (i, j) ask: is going i → ${ids[k]} → j shorter than the best i → j found so far?`,
			updates,
			compares,
		});

		for (let i = 0; i < n; i++) {
			for (let j = 0; j < n; j++) {
				compares += 1;
				const candidate = add(dist[i][k], dist[k][j]);
				const improves = lt(candidate, dist[i][j]);

				if (improves) {
					dist[i][j] = candidate;
					pred[i][j] = pred[k][j];
					updates += 1;
					frames.push({
						dist: cloneMatrix(dist),
						pred: pred.map(r => r.slice()),
						k,
						i,
						j,
						readIK: [i, k],
						readKJ: [k, j],
						write: [i, j],
						candidate,
						improved: true,
						phase: 'improve',
						line: FW_LINE.write,
						title: `${ids[i]} → ${ids[k]} → ${ids[j]} is shorter`,
						description: `d[${ids[i]}][${ids[k]}] + d[${ids[k]}][${ids[j]}] = ${fmt(
							dist[i][k]
						)} + ${fmt(dist[k][j])} = ${fmt(candidate)} < the old d[${ids[i]}][${
							ids[j]
						}], so route through ${ids[k]}: d[${ids[i]}][${ids[j]}] = ${fmt(
							candidate
						)} and π[${ids[i]}][${ids[j]}] = π[${ids[k]}][${ids[j]}].`,
						updates,
						compares,
					});
				} else {
					frames.push({
						dist: cloneMatrix(dist),
						pred: pred.map(r => r.slice()),
						k,
						i,
						j,
						readIK: [i, k],
						readKJ: [k, j],
						write: [i, j],
						candidate,
						improved: false,
						phase: 'keep',
						line: FW_LINE.test,
						title: `${ids[i]} → ${ids[j]} stays as is`,
						description: `d[${ids[i]}][${ids[k]}] + d[${ids[k]}][${ids[j]}] = ${fmt(
							dist[i][k]
						)} + ${fmt(dist[k][j])} = ${fmt(candidate)} is not less than d[${ids[i]}][${
							ids[j]
						}] = ${fmt(dist[i][j])}, so routing through ${ids[k]} doesn't help.`,
						updates,
						compares,
					});
				}
			}
		}

		layers.push(cloneMatrix(dist));
	}

	const negativeCycle = dist.some((row, i) => row[i] !== INF && row[i] < 0);

	frames.push({
		dist: cloneMatrix(dist),
		pred: pred.map(r => r.slice()),
		k: null,
		i: null,
		j: null,
		readIK: null,
		readKJ: null,
		write: null,
		candidate: null,
		improved: false,
		phase: 'done',
		line: FW_LINE.done,
		title: negativeCycle
			? 'Negative-weight cycle detected'
			: 'All shortest distances found',
		description: negativeCycle
			? 'A diagonal entry d[v][v] dropped below 0 — a vertex can reach itself for negative total weight, so a negative-weight cycle exists and some shortest paths are undefined.'
			: `After the k-loop finishes, d[i][j] is the true shortest distance for every pair — every intermediate vertex has been considered. ${updates} improving updates in ${compares} comparisons, all in Θ(V³).`,
		updates,
		compares,
	});

	return {
		ids,
		n,
		dist: cloneMatrix(dist),
		pred: pred.map(r => r.slice()),
		layers,
		negativeCycle,
		updates,
		compares,
		frames,
	};
};

/**
 * transitiveClosure — the boolean reachability twin of Floyd-Warshall.
 *
 *   t_k[i][j] = t_{k−1}[i][j] OR (t_{k−1}[i][k] AND t_{k−1}[k][j])
 *
 * Returns the final boolean matrix, per-k layers, the node-id order, and a
 * per-cell frame timeline (same triple loop; OR/AND instead of min/+).
 *
 * @param {{nodes:{id}[], edges:{from,to,weight?}[]}} graph
 * @returns {{
 *   ids:string[], n:number,
 *   reach:boolean[][],
 *   layers:boolean[][][],
 *   added:number, compares:number,
 *   frames:object[],
 * }}
 */
export const transitiveClosure = graph => {
	const ids = nodeIdsOf(graph);
	const n = ids.length;
	const idx = Object.fromEntries(ids.map((id, i) => [id, i]));
	// T = adjacency, with the diagonal true (every vertex reaches itself).
	const reach = Array.from({ length: n }, (_, i) =>
		Array.from({ length: n }, (_, j) => i === j)
	);
	graph.edges.forEach(e => {
		const i = idx[e.from];
		const j = idx[e.to];
		if (i != null && j != null) reach[i][j] = true;
	});

	const cloneBool = m => m.map(row => row.slice());
	const layers = [cloneBool(reach)];
	const frames = [];
	let added = 0;
	let compares = 0;

	frames.push({
		reach: cloneBool(reach),
		k: null,
		i: null,
		j: null,
		readIK: null,
		readKJ: null,
		write: null,
		improved: false,
		phase: 'init',
		line: 1,
		title: 'Start from the adjacency matrix',
		description:
			'T[i][j] is true when there is a direct edge i→j (and on the diagonal — every vertex reaches itself). No intermediates allowed yet.',
		added,
		compares,
	});

	for (let k = 0; k < n; k++) {
		frames.push({
			reach: cloneBool(reach),
			k,
			i: null,
			j: null,
			readIK: null,
			readKJ: null,
			write: null,
			improved: false,
			phase: 'k-round',
			line: 2,
			title: `Allow hops through ${ids[k]} (k = ${k + 1})`,
			description: `i can now reach j through {${ids
				.slice(0, k + 1)
				.join(', ')}} if it already could, OR it can reach ${ids[k]} and ${ids[k]} can reach j.`,
			added,
			compares,
		});
		for (let i = 0; i < n; i++) {
			for (let j = 0; j < n; j++) {
				compares += 1;
				const via = reach[i][k] && reach[k][j];
				const next = reach[i][j] || via;
				const newlyTrue = next && !reach[i][j];
				reach[i][j] = next;
				if (newlyTrue) added += 1;
				frames.push({
					reach: cloneBool(reach),
					k,
					i,
					j,
					readIK: [i, k],
					readKJ: [k, j],
					write: [i, j],
					improved: newlyTrue,
					phase: newlyTrue ? 'improve' : 'keep',
					line: 5,
					title: newlyTrue
						? `${ids[i]} can now reach ${ids[j]} via ${ids[k]}`
						: `${ids[i]} → ${ids[j]} unchanged`,
					description: newlyTrue
						? `T[${ids[i]}][${ids[k]}] AND T[${ids[k]}][${ids[j]}] is true, so T[${ids[i]}][${ids[j]}] becomes reachable.`
						: `T[${ids[i]}][${ids[j]}] stays ${reach[i][j] ? 'true' : 'false'} — routing through ${ids[k]} adds nothing new.`,
					added,
					compares,
				});
			}
		}
		layers.push(cloneBool(reach));
	}

	frames.push({
		reach: cloneBool(reach),
		k: null,
		i: null,
		j: null,
		readIK: null,
		readKJ: null,
		write: null,
		improved: false,
		phase: 'done',
		line: 6,
		title: 'Transitive closure complete',
		description: `After the k-loop, T[i][j] is true exactly when i can reach j. ${added} reachability links were added across ${compares} comparisons — the same Θ(V³) triple loop as Floyd-Warshall, with OR/AND.`,
		added,
		compares,
	});

	return { ids, n, reach: cloneBool(reach), layers, added, compares, frames };
};

/**
 * reconstructPath — rebuild the shortest path i → j from the predecessor matrix.
 *
 * π[i][j] is the vertex right before j on a shortest i→j path. Walk it backward
 * from j to i. Returns the list of node ids (source first), or null if j is
 * unreachable from i.
 *
 * @param {(string|null)[][]} pred   predecessor matrix (node ids).
 * @param {string[]} ids             node-id order matching the matrix indices.
 * @param {string} from
 * @param {string} to
 */
export const reconstructPath = (pred, ids, from, to) => {
	const idx = Object.fromEntries(ids.map((id, i) => [id, i]));
	const i = idx[from];
	const j = idx[to];
	if (i == null || j == null) return null;
	if (from === to) return [from];
	const path = [to];
	let cur = to;
	const seen = new Set([to]);
	while (cur !== from) {
		const p = pred[i][idx[cur]];
		if (p == null || seen.has(p)) return null; // unreachable (or a cycle)
		path.unshift(p);
		seen.add(p);
		cur = p;
	}
	return path;
};

// ── Live state rows for PseudoState (pure; unit-tested) ──
//
// Maps one Floyd-Warshall frame onto the {id,label,value,active?} rows
// PseudoState renders beside the pseudocode: the three loop indices, the two
// cells being read, their sum (the candidate), and the running update count.
export const buildStateRows = (frame, ids = []) => {
	if (!frame) return [];
	const label = idx => (idx == null ? '—' : ids[idx] ?? idx + 1);
	const cellLabel = cell =>
		cell ? `${ids[cell[0]] ?? cell[0]}→${ids[cell[1]] ?? cell[1]}` : '—';
	const active = frame.phase === 'improve' || frame.phase === 'keep';
	return [
		{
			id: 'k',
			label: 'k (via)',
			value: frame.k == null ? '—' : label(frame.k),
			active: active || frame.phase === 'k-round',
		},
		{
			id: 'ij',
			label: '(i, j)',
			value:
				frame.i == null || frame.j == null
					? '—'
					: `(${label(frame.i)}, ${label(frame.j)})`,
			active,
		},
		{
			id: 'readIK',
			label: 'd[i][k]',
			value: frame.readIK ? fmt(frame.dist[frame.readIK[0]][frame.readIK[1]]) : '—',
			active,
		},
		{
			id: 'readKJ',
			label: 'd[k][j]',
			value: frame.readKJ ? fmt(frame.dist[frame.readKJ[0]][frame.readKJ[1]]) : '—',
			active,
		},
		{
			id: 'candidate',
			label: 'd[i][k] + d[k][j]',
			value: frame.candidate == null ? '—' : fmt(frame.candidate),
			active: frame.phase === 'improve',
		},
		{
			id: 'distij',
			label: 'd[i][j]',
			value: frame.write ? fmt(frame.dist[frame.write[0]][frame.write[1]]) : '—',
			active: frame.phase === 'improve',
		},
		{
			id: 'updates',
			label: 'improving updates',
			value: frame.updates ?? 0,
			active: frame.phase === 'improve',
		},
		{
			// cellLabel referenced so the helper isn't dead code; shows the write cell.
			id: 'writeCell',
			label: 'writing',
			value: cellLabel(frame.write),
			active: frame.phase === 'improve',
		},
	];
};

// Expose the ∞ sentinel + formatter for the stage / playground.
export const INFINITY = INF;
export { fmt as formatDist };
