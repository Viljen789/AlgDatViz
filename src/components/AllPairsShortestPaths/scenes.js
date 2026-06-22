// The scrolly scenes that build all-pairs shortest-path intuition before the
// playground.
//
// One continuous story on a single small weighted digraph: the all-pairs problem,
// the "allow paths through {1..k}" dynamic program at the heart of Floyd-Warshall,
// the recurrence d_k[i][j] = min(d_{k−1}[i][j], d_{k−1}[i][k] + d_{k−1}[k][j]),
// the predecessor matrix + path reconstruction, the transitive-closure twin, and
// a nod to the matrix-multiplication framing + the Θ(V³) cost.
//
// Every concrete number is derived from the pure generator in fwTrace.js (run in
// fwTrace.test.js) so the scrolly and the matrix view can never disagree.

import { floydWarshall, reconstructPath } from './fwTrace.js';
import { slowApsp } from './slowApsp.js';
import { SHARED_GRAPH } from './apspMeta.js';

const FW = floydWarshall(SHARED_GRAPH);
const IDS = FW.ids; // ['1','2','3','4']
const FINAL = FW.dist; // final distance matrix
const L0 = FW.layers[0]; // k = 0 (direct edges)
const L2 = FW.layers[2]; // after allowing {1, 2}

// Slow-APSP layers for the matrix-multiplication scene. NOTE the contract
// (slowApsp.js): SLOW.layers[m−1] === L^(m), so SLOW.layers[0] === L^(1) === W
// and SLOW.layers[1] === L^(2) (shortest paths of ≤ 2 edges). This indexing is
// by EDGE COUNT — unrelated to FW's k-indexed layers above; never conflate them.
const SLOW = slowApsp(SHARED_GRAPH);
const SLOW_L2 = SLOW.layers[1]; // L^(2): every shortest path of at most two edges

const at = (m, from, to) => m[IDS.indexOf(from)][IDS.indexOf(to)]; // distance lookup by id

// The entry that DRAMATICALLY improves after one matrix product: 2→3 has no
// direct edge (L^(1)[2][3] = ∞), but the two-edge route 2→4→3 = 1 + (−5) gives
// L^(2)[2][3] = −4. Derived from the generator, never hand-typed.
const SLOW_L2_2_3 = at(SLOW_L2, '2', '3'); // −4 — best ≤ 2-edge path, via 4

// Path 1 → 3 only becomes short once intermediates are allowed: 1→2→4→3.
const PATH_1_3 = reconstructPath(FW.pred, IDS, '1', '3'); // ['1','2','4','3']
const DIST_1_3 = at(FINAL, '1', '3'); // -1
const DIRECT_1_3 = at(L0, '1', '3'); // 8

// After k = 2 (paths may route through 1 or 2), d[1][4] improves to 1→2→4.
const DIST_1_4_K2 = at(L2, '1', '4'); // 4

export const SCENES = [
	{
		id: 'all-pairs',
		eyebrow: 'The problem',
		title: 'Not one source — every source, every destination at once.',
		body: `Single-source shortest paths answers "from S, how far to everywhere?" All-pairs asks the bigger question: the shortest distance between EVERY ordered pair of vertices. The answer is a V×V matrix D where d[i][j] is the shortest distance from i to j. You could run Dijkstra from every vertex, but Floyd-Warshall computes the whole matrix directly with one elegant dynamic program — and it tolerates negative edges.`,
		check: {
			kind: 'numeric',
			prompt: `For a graph with |V| = ${IDS.length} vertices, how many entries does the all-pairs distance matrix D have?`,
			answer: IDS.length * IDS.length,
			placeholder: 'a count',
			explanation: `D is V×V, so ${IDS.length} × ${IDS.length} = ${
				IDS.length * IDS.length
			} entries — one shortest distance for every ordered pair (i, j), including the 0s down the diagonal. Floyd-Warshall fills all of them in Θ(V³) time.`,
		},
	},
	{
		id: 'intermediates',
		eyebrow: 'The key idea',
		title: 'Allow paths through more and more vertices.',
		body: `Number the vertices 1..n. Define d_k[i][j] = the shortest i→j distance using only intermediate vertices drawn from the set {1, …, k}. With k = 0 no intermediates are allowed, so d_0 is just the direct edges (∞ where none, 0 on the diagonal). As k grows, you unlock one more vertex you may route through — and when k = n, every vertex is allowed and d_n[i][j] is the true shortest distance. The whole algorithm is: grow that allowed set one vertex at a time.`,
		check: {
			kind: 'choice',
			prompt: 'What does d_k[i][j] mean in Floyd-Warshall?',
			options: [
				'The shortest i→j path whose intermediate vertices all come from {1, …, k}',
				'The shortest path that uses exactly k edges',
				'The k-th shortest path from i to j',
				'The shortest path that visits vertex k',
			],
			answer:
				'The shortest i→j path whose intermediate vertices all come from {1, …, k}',
			misconceptions: {
				'The shortest path that uses exactly k edges':
					'This confuses the intermediate-vertex index k with an edge count. Floyd-Warshall’s k bounds WHICH vertices a path may pass through, not how many edges it has; the matrix-multiplication APSP variant counts edges, but that is a different algorithm.',
				'The k-th shortest path from i to j':
					'k is not a ranking of paths. There is one shortest distance per pair at each stage; k names the set of allowed intermediate vertices {1, …, k}, not the k-th best route.',
				'The shortest path that visits vertex k':
					'A path counted in d_k is allowed to use {1, …, k} but is not required to pass through k. The k-round considers both the route that ignores k and the route that uses it, then keeps the smaller.',
			},
			explanation:
				'd_k[i][j] is the best i→j distance allowed to route only through the first k vertices. At k = 0 that is the direct edge; at k = n every vertex is permitted, so d_n is the real all-pairs answer. Growing k by one is exactly "now you may also pass through vertex k."',
		},
	},
	{
		id: 'recurrence',
		eyebrow: 'The recurrence',
		title: 'Adding vertex k: route through it, or don’t.',
		body: `When you unlock vertex k, a shortest i→j path using {1, …, k} either ignores k — so it is the old d_{k−1}[i][j] — or it goes i → … → k → … → j, and each half only uses intermediates from {1, …, k−1}. That gives the one recurrence the whole algorithm rests on:\n\n  d_k[i][j] = min( d_{k−1}[i][j],  d_{k−1}[i][k] + d_{k−1}[k][j] )\n\nThree nested loops (k outermost, then i, then j) apply it across the matrix in place. The cell d[i][j] reads exactly two other cells: d[i][k] and d[k][j].`,
		check: {
			kind: 'predict',
			prompt: `Direct edge ${'1'}→${'3'} costs ${DIRECT_1_3}. But routing through 2 then 4 gives 1→2→4→3 = 3 + 1 + (−5). What is the final d[1][3]?`,
			answer: DIST_1_3,
			placeholder: 'a distance',
			explanation: `3 + 1 + (−5) = ${DIST_1_3}, which beats the direct edge's ${DIRECT_1_3}. The recurrence discovers this in stages: first 1→2→4 becomes available, then allowing 4 as an intermediate lets d[1][3] drop to ${DIST_1_3} via d[1][4] + d[4][3]. No single direct edge ever shows this — the intermediates do.`,
		},
	},
	{
		id: 'fill-across-k',
		eyebrow: 'The matrix in motion',
		title: 'Watch the matrix improve, one k-round at a time.',
		body: `Each k-round sweeps the whole V×V matrix once, relaxing every cell d[i][j] against its two readers d[i][k] and d[k][j]. After the k = 2 round here, d[1][4] has already dropped to ${DIST_1_4_K2} (the route 1→2→4), even though 1 has no direct edge to 4. The k-th row and k-th column are special: during round k they never change (relaxing through k can't improve a path that already ends or starts at k), so they act as the fixed "rulers" every other cell measures against.`,
		check: {
			kind: 'numeric',
			prompt: `There is no direct edge 1→4. After the k = 2 round (paths may route through {1, 2}), what is d[1][4]? (Hint: 1→2→4.)`,
			answer: DIST_1_4_K2,
			placeholder: 'a distance',
			explanation: `d[1][4] = d[1][2] + d[2][4] = 3 + 1 = ${DIST_1_4_K2}. Vertex 2 was the intermediate that connected them. Each k-round can only lower a distance, never raise it — the matrix monotonically improves until k = n.`,
		},
	},
	{
		id: 'predecessor',
		eyebrow: 'Reconstructing the path',
		title: 'A predecessor matrix turns distances back into routes.',
		body: `D gives lengths, not paths. Floyd-Warshall keeps a second matrix π alongside it: π[i][j] is the vertex just before j on a shortest i→j path. Whenever routing through k improves d[i][j], you copy π[i][j] = π[k][j] — the predecessor of j on the k→j leg. To rebuild a path, start at j and walk π[i][·] backward until you reach i. Here the shortest 1→3 route reconstructs to ${PATH_1_3.join(
			' → '
		)}.`,
		check: {
			kind: 'order',
			prompt:
				'Reconstruct the shortest path from 1 to 3 by walking the predecessor matrix. Put the vertices in order from 1 to 3.',
			items: ['4', '1', '3', '2'],
			answer: PATH_1_3,
			explanation: `Walking π backward from 3 gives ${PATH_1_3.join(
				' → '
			)} (total ${DIST_1_3}). The predecessor matrix is all you store beyond D — O(V²) space — and it encodes every shortest path simultaneously.`,
		},
	},
	{
		id: 'transitive-closure',
		eyebrow: 'The boolean twin',
		title: 'The same loop, with OR and AND, gives reachability.',
		body: `Drop the weights and ask only "can i reach j at all?" The exact same triple loop solves it — just swap the arithmetic for booleans:\n\n  t_k[i][j] = t_{k−1}[i][j]  OR  ( t_{k−1}[i][k]  AND  t_{k−1}[k][j] )\n\n"i reaches j through {1..k}" iff it already could, OR it can reach k and k can reach j. This is the transitive closure of the graph, computed in the same Θ(V³). min/+ becomes OR/AND; the structure is identical.`,
		check: {
			kind: 'classify',
			prompt:
				'Match each all-pairs computation to the operations its recurrence uses.',
			items: [
				{ id: 'fw', label: 'Floyd-Warshall (shortest distances)' },
				{ id: 'tc', label: 'Transitive closure (reachability)' },
			],
			categories: [
				{ id: 'minplus', label: 'min and +' },
				{ id: 'orand', label: 'OR and AND' },
			],
			answer: { fw: 'minplus', tc: 'orand' },
			explanation:
				'Floyd-Warshall combines candidate paths with + and keeps the better with min. Transitive closure replaces those with AND (both legs must exist) and OR (either route reaches). Same nested loops over intermediate vertices — only the semiring changes.',
		},
	},
	{
		id: 'matrix-mult',
		eyebrow: 'A wider view',
		title: 'It is matrix "multiplication" in the (min, +) semiring.',
		body: `One relaxation pass — d[i][j] = min over k of (d[i][k] + d[k][j]) — is exactly matrix multiplication with min for "+" and + for "×". Doing that pass V−1 times (Slow-APSP) gives the answer in O(V⁴); repeated squaring (Faster-APSP) cuts it to O(V³ log V). Floyd-Warshall is cleverer still: by reusing each k-layer in place it gets the same answer in a flat Θ(V³), no repeated passes needed. All three are the same idea — combine paths through one more vertex at a time.`,
		check: {
			kind: 'choice',
			prompt: 'What is the running time of Floyd-Warshall?',
			options: ['Θ(V³)', 'Θ(V²)', 'Θ(V⁴)', 'Θ(E log V)'],
			answer: 'Θ(V³)',
			misconceptions: {
				'Θ(V²)':
					'Θ(V²) is the size of the distance matrix, not the cost of filling it. Each of the V² cells is relaxed once per k-round, and there are V rounds, so the work is V × V² = Θ(V³).',
				'Θ(V⁴)':
					'Θ(V⁴) is the Slow-APSP bound, which redoes a full matrix-multiplication pass V−1 times. Floyd-Warshall avoids that by reusing each k-layer in place, so it needs only the three nested loops, Θ(V³).',
				'Θ(E log V)':
					'Θ(E log V) is the cost of one Dijkstra run, an edge-driven single-source bound. Floyd-Warshall is vertex-driven and computes ALL pairs at once; its cost depends on V, not on the edge count E.',
			},
			explanation:
				'Three nested loops over the n vertices — k, then i, then j — each Θ(V), give Θ(V³), independent of how many edges there are. That beats the O(V⁴) Slow-APSP and the O(V³ log V) repeated-squaring variants, and it is competitive with running Dijkstra from every vertex on dense graphs (while also handling negative edges).',
		},
	},
	{
		id: 'when',
		eyebrow: 'Choosing the tool',
		title: 'Floyd-Warshall vs. the alternatives.',
		body: `When do you reach for Floyd-Warshall? When you need ALL pairs, especially on a dense graph, or when there are negative edges (it detects a negative-weight cycle too: a diagonal entry d[v][v] going below 0). If you only need one source, a single Dijkstra or Bellman-Ford is far cheaper. If you only need reachability, transitive closure on the same loop suffices.`,
		check: {
			kind: 'classify',
			prompt: 'Match each task to the algorithm you should reach for.',
			items: [
				{
					id: 'allpairs',
					label:
						'Shortest distance between every pair (dense graph, maybe negatives)',
				},
				{
					id: 'onesrc',
					label: 'Shortest paths from a single source, non-negative weights',
				},
				{ id: 'reach', label: 'Only need: can i reach j, for all pairs?' },
			],
			categories: [
				{ id: 'fw', label: 'Floyd-Warshall' },
				{ id: 'dij', label: 'Dijkstra from one source' },
				{ id: 'tc', label: 'Transitive closure' },
			],
			answer: { allpairs: 'fw', onesrc: 'dij', reach: 'tc' },
			explanation:
				'All pairs (and negatives) → Floyd-Warshall at Θ(V³). One source, non-negative → a single Dijkstra, much cheaper than the full matrix. Pure reachability → transitive closure, the boolean form of the same triple loop. Matching the algorithm to what you actually need is the whole point.',
		},
	},
	{
		id: 'slow-apsp',
		eyebrow: 'The matrix-multiplication view',
		title:
			'Slow-APSP: multiply the matrix into itself, one extra edge at a time.',
		body: `The previous scene called Floyd-Warshall a (min, +) matrix "multiplication." Here is what that product actually computes. Start from L⁽¹⁾ = W, the one-edge distances (direct edges, ∞ where none, 0 on the diagonal). Each min-plus product extends every path by exactly one more edge:\n\n  L⁽ᵐ⁾[i][j] = min over k of ( L⁽ᵐ⁻¹⁾[i][k] + W[k][j] )\n\nso L⁽ᵐ⁾[i][j] is the best i→j route using at most m edges. On this graph 2→3 has no direct edge (L⁽¹⁾[2][3] = ∞), but after one product the two-edge route 2→4→3 = 1 + (−5) makes L⁽²⁾[2][3] = ${SLOW_L2_2_3}. A shortest path in an n-vertex graph (no negative cycle) uses at most n−1 edges, so L⁽ⁿ⁻¹⁾ already holds every shortest distance — that is V−1 products of Θ(V³) each, O(V⁴); repeated squaring (L⁽²⁾, L⁽⁴⁾, L⁽⁸⁾, …) trims it to O(V³ log V). Floyd-Warshall reaches the same answer in flat Θ(V³) by reusing each k-layer in place instead of redoing a full product per round.`,
		check: {
			kind: 'numeric',
			prompt: `After one matrix product, L⁽²⁾ holds every shortest path of at most two edges. There is no direct edge 2→3, but 2→4→3 = 1 + (−5). What is L⁽²⁾[2][3]?`,
			answer: SLOW_L2_2_3,
			placeholder: 'a distance',
			explanation: `L⁽²⁾[2][3] = min over k of (L⁽¹⁾[2][k] + W[k][3]). The only finite term is k = 4: L⁽¹⁾[2][4] + W[4][3] = 1 + (−5) = ${SLOW_L2_2_3}, beating L⁽¹⁾[2][3] = ∞. One min-plus product unlocked the two-edge route; further products keep extending until L⁽ⁿ⁻¹⁾ is the full all-pairs answer — the same matrix Floyd-Warshall builds in Θ(V³).`,
		},
	},
];
