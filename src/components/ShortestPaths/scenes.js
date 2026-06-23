// The scrolly scenes that build single-source shortest-path intuition before the
// playground.
//
// One continuous story on a single small weighted digraph: the Relax primitive
// (the atomic move), shortest-path properties (optimal substructure + the
// triangle inequality + the predecessor subgraph), and then the three algorithms
// shown as nothing more than different *orders* of the same Relax calls —
// Bellman-Ford (negatives), DAG-SP (a DAG), Dijkstra (non-negative, greedy) —
// plus why Dijkstra needs non-negative weights.
//
// Every concrete number is derived from the pure generators in relaxTrace.js (run
// in relaxTrace.test.js) so the scrolly and the algorithms can never disagree.

import {
	bellmanFordTrace,
	dijkstraTrace,
	formatDist,
	reconstructPath,
} from './relaxTrace.js';
import { SHARED_GRAPH, SHARED_SOURCE } from './ssspMeta.js';
import { dijkstraSettleProbe } from '../../data/traceProbes.js';

// Measure the canonical answers from the generators on the shared graph.
const BF = bellmanFordTrace(SHARED_GRAPH, { source: SHARED_SOURCE });
const DIST = BF.dist; // { S:0, A:7, B:8, C:3, D:5 }
const PATH_TO_B = reconstructPath(BF.pred, SHARED_SOURCE, 'B'); // [S,C,A,B]

// Relax-step demonstration numbers, taken straight from the edge list so the
// predict check is graded against the real arithmetic.
//   When dist[C]=3 and we relax C→A (w=4): 3+4 = 7 < 10, so dist[A] improves to 7.
const RELAX_C = DIST.C; // 3
const RELAX_CA_W = SHARED_GRAPH.edges.find(
	e => e.from === 'C' && e.to === 'A'
).weight; // 4
const RELAX_RESULT = RELAX_C + RELAX_CA_W; // 7
const DIRECT_SA = SHARED_GRAPH.edges.find(
	e => e.from === 'S' && e.to === 'A'
).weight; // 10

// Dijkstra relaxation count on the shared graph (used in the algorithms scene).
const DIJ = dijkstraTrace(SHARED_GRAPH, { source: SHARED_SOURCE });

// ─────────────────────────────────────────────────────────────────────────────
// Trace-step probe: "which vertex does Dijkstra SETTLE next?"
//
// The same frozen-frame mechanic the exam grades (data/traceProbes.js plus the exam
// SP-SSSP problem), brought into the lesson on the topic's OWN graph (SHARED_GRAPH
// from ssspMeta.js), so the frozen state the student reasons from is exactly the
// one the SSSP stage traces. We run dijkstraTrace and freeze the beat just before
// the 3rd settle (ordinal 2 skips the trivial source-then-nearest opening). The
// answer is read off the next settle frame, never typed. The frozen frame becomes
// the question canvas (StepProbeFrame renders view.kind 'dijkstra-settle').
const DIJ_IDS = SHARED_GRAPH.nodes.map(n => n.id).sort(); // ['A','B','C','D','S']
const DIJ_PROBE = dijkstraSettleProbe(DIJ, DIJ_IDS, 2);

// The settled vertex's own final tentative distance, derived from the frozen frame,
// so the explanation quotes the generator's number, not a hand-typed one.
const dijDistOf = id => DIJ_PROBE.frozen.dist[id];

// One misconception line per OTHER option (every distractor), keyed by String(id),
// each explaining why that unsettled vertex is NOT the next settle: it has a larger
// (or still-infinite) tentative distance, so ExtractMin passes it over for now. The
// numbers come from the frozen frame, so no distractor line is hand-fabricated.
const DIJ_MISCONCEPTIONS = Object.fromEntries(
	DIJ_PROBE.options
		.filter(id => id !== DIJ_PROBE.answer)
		.map(id => {
			const d = dijDistOf(id);
			const here =
				d == null
					? `${id} is still at tentative distance ∞, since no relaxed edge has reached it yet`
					: `${id} sits at tentative distance ${d}, larger than ${DIJ_PROBE.answer}’s ${dijDistOf(DIJ_PROBE.answer)}`;
			return [
				String(id),
				`${here}. Dijkstra always ExtractMin the SMALLEST tentative distance among the unsettled, so ${DIJ_PROBE.answer} is finalized before ${id}.`,
			];
		})
);

export const SCENES = [
	{
		id: 'relax',
		eyebrow: 'The atomic move',
		title: 'Every shortest-path algorithm is built from one operation.',
		body: `Keep a tentative distance dist[v] for each vertex (the source is 0, everything else starts at ∞) and a predecessor pred[v]. The single move is Relax(u, v, w): ask whether going through u is better — if dist[u] + w < dist[v], then lower dist[v] to dist[u] + w and set pred[v] = u. That is the whole engine. Bellman-Ford, DAG-SP, and Dijkstra differ only in the ORDER they call it.`,
		check: {
			kind: 'predict',
			prompt: `dist[${'C'}] = ${RELAX_C}. We relax edge C → A with weight ${RELAX_CA_W}, while dist[A] is currently ${DIRECT_SA} (from the direct edge S→A). What does dist[A] become?`,
			answer: RELAX_RESULT,
			placeholder: 'a distance',
			explanation: `dist[C] + w = ${RELAX_C} + ${RELAX_CA_W} = ${RELAX_RESULT}, which is less than the current dist[A] = ${DIRECT_SA}, so the edge relaxes: dist[A] = ${RELAX_RESULT} and pred[A] = C. Relaxing means replacing a worse route with a cheaper one — and it only ever lowers a distance, never raises it.`,
		},
	},
	{
		id: 'optimal-substructure',
		eyebrow: 'Why it works',
		title: 'Subpaths of shortest paths are themselves shortest.',
		body: `Shortest paths have optimal substructure: if the shortest route S → … → B passes through A, then the S → A portion of it is itself a shortest S → A path. (If a cheaper S → A existed, you could splice it in and beat the supposed best S → B — a contradiction.) This is exactly why Relax composes: once dist[A] is correct, relaxing A's out-edges can extend that correct prefix one edge further.`,
		check: {
			kind: 'choice',
			prompt:
				'A shortest path from S to B goes S → C → A → B. What must be true of the S → A portion?',
			options: [
				'It is a shortest path from S to A',
				'It is the longest path from S to A',
				'It has the same length as S → B',
				'Nothing — subpaths can be anything',
			],
			answer: 'It is a shortest path from S to A',
			misconceptions: {
				'It is the longest path from S to A':
					'This inverts the property: a shortest path is built from shortest subpaths, never longest. Splicing in a longer S → A prefix could only make the S → B path longer, so a longest subpath would contradict optimality.',
				'It has the same length as S → B':
					'A prefix S → A is part of the larger path S → B, so it is generally shorter, not equal. The claim confuses the length of a subpath with the length of the whole path it sits inside.',
				'Nothing — subpaths can be anything':
					'This denies optimal substructure outright. If a subpath could be anything, you could replace the S → A prefix with a cheaper route and beat the supposed shortest S → B, which is impossible. Subpaths of shortest paths are forced to be shortest.',
			},
			explanation:
				'Optimal substructure: every subpath of a shortest path is a shortest path between its own endpoints. Swap in a cheaper S → A and the whole S → B would get cheaper, contradicting that it was shortest. This property is what lets a one-edge Relax build global shortest paths from local improvements.',
		},
	},
	{
		id: 'triangle',
		eyebrow: 'The invariant',
		title: 'The triangle inequality is what Relax enforces.',
		body: `For real shortest distances δ, the triangle inequality holds for every edge (u,v,w): δ(s,v) ≤ δ(s,u) + w. An edge that violates the tentative version — dist[u] + w < dist[v] — is precisely an edge Relax can still improve. So an algorithm is finished exactly when NO edge can be relaxed: every edge satisfies dist[v] ≤ dist[u] + w, and the tentative distances equal the true ones.`,
		check: {
			kind: 'choice',
			prompt: 'When has a shortest-path algorithm finished?',
			options: [
				'When no edge can be relaxed any further',
				'When every vertex has been visited once',
				'When the priority queue is full',
				'When dist[s] reaches 0',
			],
			answer: 'When no edge can be relaxed any further',
			misconceptions: {
				'When every vertex has been visited once':
					'Visiting a vertex does not mean its distance is final. In Bellman-Ford a vertex can be relaxed again on a later pass, and only the no-edge-relaxes test, not a visit count, proves convergence.',
				'When the priority queue is full':
					'A full or empty queue is a Dijkstra implementation detail, not the stopping condition for shortest paths in general. Bellman-Ford and DAG-SP use no priority queue at all yet still finish; convergence is defined by relaxation, not by queue state.',
				'When dist[s] reaches 0':
					'dist[s] is 0 from the very first line of initialization, before any work happens. That tells you nothing about the rest of the vertices, so it cannot be a termination test.',
			},
			explanation:
				'If dist[u] + w < dist[v] for some edge, that edge still improves something, so you are not done. When every edge satisfies dist[v] ≤ dist[u] + w (the triangle inequality), no relaxation helps and the distances are final. That convergence test is exactly Bellman-Ford’s extra pass.',
		},
	},
	{
		id: 'bellman-ford',
		eyebrow: 'Order #1 — brute force',
		title: 'Bellman-Ford: relax every edge, |V|−1 times.',
		body: `The simplest schedule: relax ALL edges, then do it again, |V|−1 times in total. After pass k, every shortest path that uses at most k edges is correct — and a simple shortest path has at most |V|−1 edges, so |V|−1 passes settle everything. One more pass that STILL improves an edge can only mean a reachable negative-weight cycle (a path you can loop forever to get cheaper), so Bellman-Ford reports it. Cost: O(V·E). It is the one that handles negative edges.`,
		check: {
			kind: 'numeric',
			prompt: `A graph has |V| = ${SHARED_GRAPH.nodes.length} vertices. How many times does Bellman-Ford relax the full edge set before its negative-cycle check pass?`,
			answer: SHARED_GRAPH.nodes.length - 1,
			placeholder: 'a count',
			explanation: `|V| − 1 = ${SHARED_GRAPH.nodes.length} − 1 = ${SHARED_GRAPH.nodes.length - 1} passes. A simple path visits at most |V| vertices, so it has at most |V|−1 edges; after that many full relaxation passes nothing more can improve unless a negative cycle exists. The extra detection pass makes that exactly ${SHARED_GRAPH.nodes.length} passes in all.`,
		},
	},
	{
		id: 'dag-sp',
		eyebrow: 'Order #2 — one clean pass',
		title: 'DAG-SP: relax in topological order, once.',
		body: `If the graph is a DAG, you can do far better than |V|−1 passes. Topologically sort the vertices, then process them in that order, relaxing each vertex's out-edges. Because every predecessor comes before its successors in the order, dist[u] is already final the moment you relax out of u — one pass suffices. Cost: O(V + E), and negative edges are perfectly fine (only cycles are forbidden, and a DAG has none).`,
		check: {
			kind: 'choice',
			prompt:
				'Why does one pass in topological order suffice for a DAG, with no repeats?',
			options: [
				'Every predecessor is processed before its successors, so dist[u] is final when you relax out of u',
				'Topological sort sorts the vertices by distance',
				'DAGs have no edges',
				'It only works for non-negative weights',
			],
			answer:
				'Every predecessor is processed before its successors, so dist[u] is final when you relax out of u',
			misconceptions: {
				'Topological sort sorts the vertices by distance':
					'Topological order ranks vertices by edge dependency, not by tentative distance. The order is fixed before any relaxation runs, so it cannot reflect distances it has not computed yet. Sorting by distance is Dijkstra, a different idea.',
				'DAGs have no edges':
					'A DAG has plenty of edges; it just has no directed cycles. The single pass works because of the acyclic order of those edges, not because they are absent.',
				'It only works for non-negative weights':
					'This borrows Dijkstra’s restriction by mistake. DAG-SP tolerates negative edges freely, because a DAG has no cycle for a negative weight to loop around. The acyclic structure, not the sign of the weights, is what makes one pass enough.',
			},
			explanation:
				'In topological order, by the time you process u, every path into u has already been relaxed, so dist[u] is correct. Relaxing u’s out-edges then extends correct prefixes by one edge — no vertex ever needs revisiting. Negative weights don’t break this; only a cycle would (and a DAG has none).',
		},
	},
	{
		id: 'dijkstra',
		eyebrow: 'Order #3 — greedy',
		title: 'Dijkstra: always settle the closest vertex next.',
		body: `When all weights are non-negative, a greedy order wins: keep the vertices in a priority queue by tentative distance, repeatedly EXTRACT-MIN the closest unsettled vertex, and relax its out-edges. The closest unsettled distance can never later get smaller (no non-negative edge can shrink it), so each vertex is settled exactly once. The cost depends on which priority queue you pick. The familiar O((V + E) log V) assumes a BINARY HEAP, where each of the V extractions and E decrease-keys costs O(log V). On the shared graph it settles everything in ${DIJ.relaxations} relaxations.`,
		check: {
			kind: 'predict',
			prompt: `Dijkstra settles vertices in increasing distance order. On the shared graph the source S is settled first (dist 0). Which vertex is settled SECOND?`,
			options: ['C', 'A', 'B', 'D'],
			answer: 'C',
			misconceptions: {
				A: 'A does have a direct edge from S, but it weighs 10, far above the S→C edge’s 3. Dijkstra settles the smallest tentative distance first, so C is second; A drops to 7 only after C is settled and C→A relaxes it, which makes A the fourth vertex out.',
				B: 'B is the farthest vertex, distance 8 by the route S→C→A→B, so it is settled last rather than second. Dijkstra reaches it only after C, D, and A have all been settled.',
				D: 'D settles at distance 5, still larger than C’s 3. Since Dijkstra always extracts the smallest tentative distance next, C is settled second and D follows third.',
			},
			explanation: `After S, the smallest tentative distance is dist[C] = ${DIST.C} (the direct S→C edge), smaller than the tentative dist[A] = ${DIRECT_SA}. Dijkstra extracts the minimum, so C is settled second — and only then does relaxing C→A lower dist[A] to ${DIST.A}. Greedily taking the closest is safe precisely because no later non-negative edge can undercut it.`,
		},
	},
	{
		id: 'dijkstra-probe',
		eyebrow: 'Order #3, trace it',
		title: 'Now read the next move off the real state.',
		body: `The exam grades exactly this skill: freeze Dijkstra mid-run and ask what it does next. Below is the algorithm's REAL state on the shared graph: the settled set (each locked vertex final) and the current tentative distances at this ExtractMin. No prose to lean on, just the table the priority queue sees. Pick the vertex Dijkstra settles next, then check yourself.`,
		check: {
			kind: 'stepProbe',
			// The frozen frame IS the question, stored verbatim from the generator's
			// frame, so StepProbeFrame depicts the algorithm's real state, not a sketch.
			frame: DIJ_PROBE.frozen,
			view: {
				kind: 'dijkstra-settle',
				ids: DIJ_IDS,
				source: SHARED_SOURCE,
				nextLabel: 'settles next',
			},
			prompt:
				'Dijkstra is mid-run on the shared graph. From the frozen state (the ' +
				'settled set and the current tentative distances), which vertex does ' +
				'Dijkstra SETTLE (finalize) next?',
			options: DIJ_PROBE.options,
			answer: DIJ_PROBE.answer,
			misconceptions: DIJ_MISCONCEPTIONS,
			explanation: `Dijkstra always settles the UNSETTLED vertex of smallest tentative distance. Among the unsettled vertices the minimum is ${DIJ_PROBE.answer} (dist = ${dijDistOf(DIJ_PROBE.answer)}), so it is finalized next. The picture is the generator’s real state at that ExtractMin, the same read-off the exam asks for, one decision at a time.`,
		},
	},
	{
		id: 'dijkstra-pq',
		eyebrow: 'Order #3, the price of the queue',
		title: 'Dijkstra’s running time is whatever the priority queue charges.',
		body: `O((V + E) log V) is not a law of Dijkstra, it is the bill from a binary heap. Swap the queue and the bound changes. A simple ARRAY (scan all vertices for the minimum each round) makes each EXTRACT-MIN cost O(V) and each decrease-key O(1), giving O(V^2 + E) = O(V^2). A FIBONACCI HEAP makes decrease-key O(1) amortized, giving O(E + V log V). On a SPARSE graph (E ~ V) the heap wins; on a DENSE graph (E ~ V^2) the plain array’s O(V^2) beats the binary heap, whose log factor on V^2 edges makes it O(V^2 log V).`,
		check: {
			kind: 'choice',
			prompt:
				'On a dense graph (E ~ V^2), which Dijkstra implementation is asymptotically fastest?',
			options: [
				'Array / linear-scan min, O(V^2)',
				'Binary heap, O((V + E) log V)',
				'Fibonacci heap, O(E + V log V)',
			],
			answer: 'Array / linear-scan min, O(V^2)',
			misconceptions: {
				'Binary heap, O((V + E) log V)':
					'On E ~ V^2 edges the heap pays a log factor per edge: O((V + V^2) log V) = O(V^2 log V), strictly slower than the array’s O(V^2). The heap version is not always fastest.',
				'Fibonacci heap, O(E + V log V)':
					'On a dense graph O(E + V log V) = O(V^2 + V log V) = O(V^2), so the Fibonacci heap only ties the array asymptotically, never beats it. Its win is on sparse graphs (E ~ V), and its large constants make the plain array the practical dense-graph choice.',
			},
			explanation:
				'Substitute E ~ V^2 into each bound. Array: O(V^2 + E) = O(V^2). Binary heap: O((V + E) log V) = O(V^2 log V), the slowest. Fibonacci heap: O(E + V log V) = O(V^2). So the array matches the Fibonacci heap and beats the binary heap. The heap’s per-edge log factor is pure overhead once the graph is dense; the array’s strength is that its O(V^2) extraction cost is already dominant, so it pays nothing extra for the V^2 edges.',
		},
	},
	{
		id: 'why-nonneg',
		eyebrow: 'The catch',
		title: 'Why Dijkstra breaks on negative edges.',
		body: `Dijkstra's whole correctness rests on one assumption: once you settle the closest unsettled vertex, its distance is final. A negative edge can violate that — a vertex settled early might later be reachable more cheaply through a far vertex via a negative edge, but Dijkstra has already locked it in and never reconsiders. For negative edges you must use Bellman-Ford (any graph) or DAG-SP (acyclic).`,
		check: {
			kind: 'classify',
			prompt: 'Match each situation to the algorithm you should reach for.',
			items: [
				{
					id: 'neg',
					label: 'Graph has negative-weight edges (may have cycles)',
				},
				{ id: 'dag', label: 'Graph is a weighted DAG (negatives allowed)' },
				{ id: 'nonneg', label: 'Graph has only non-negative weights' },
			],
			categories: [
				{ id: 'bf', label: 'Bellman-Ford' },
				{ id: 'dagsp', label: 'DAG-SP' },
				{ id: 'dij', label: 'Dijkstra' },
			],
			answer: { neg: 'bf', dag: 'dagsp', nonneg: 'dij' },
			explanation:
				'Negative edges in a general graph → Bellman-Ford (it also detects negative cycles). A DAG → DAG-SP, the fastest at O(V+E), and it tolerates negative edges. Only non-negative weights → Dijkstra, the fastest of the three at O((V+E) log V) but unsafe with negatives. All three are the same Relax — only the schedule differs.',
		},
	},
	{
		id: 'pred-subgraph',
		eyebrow: 'The answer',
		title: 'The pred pointers ARE the shortest-path tree.',
		body: `You never store whole paths — just one pred[v] per vertex, the predecessor on a shortest route from the source. Follow pred backward from any target to the source and you reconstruct the path; together the pred pointers form a shortest-path tree rooted at S. On the shared graph, the shortest route to B is ${PATH_TO_B.join(' → ')}, with total distance ${DIST.B}.`,
		check: {
			kind: 'numeric',
			prompt: `Following pred backward from B gives the path ${PATH_TO_B.join(' → ')}. What is the shortest distance from S to B?`,
			answer: DIST.B,
			placeholder: 'a distance',
			explanation: `dist[B] = ${DIST.B}, the sum along ${PATH_TO_B.join(' → ')} (3 + 4 + 1). The pred map is all you keep: O(V) space, and walking it backward rebuilds any shortest path on demand. Every SSSP algorithm here ends with the same pred tree — they computed it with the same Relax, in different orders.`,
		},
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// Sticky-stage view selection (consumed by ShortestPathsStage).
//
// The stage paints one sticky visual per scene. It is keyed by scene id (NOT a
// numeric index), mirroring StrategiesStage's SCENE_BOARDS and GraphStage's SCENE
// map: when scenes are inserted or reordered above, the right visual still
// follows its scene. (The two Dijkstra scenes 'dijkstra-probe' and 'dijkstra-pq'
// were once inserted after 'dijkstra' without updating a numeric switch in the
// stage, so the later scenes painted the WRONG sticky visual — e.g. the
// priority-queue-cost scene showed a path-to-B reconstruction. Keying by id makes
// that whole off-by-N bug class impossible.) Living here (a pure module) keeps the
// selection unit-testable without importing the JSX stage.

const FINAL_DIST = BF.dist;
const FINAL_PRED = BF.pred;

// Edges of the reconstructed path, as a Set of "u->v" keys (the highlight key the
// stage matches edges against).
const pathEdges = path => {
	if (!path || path.length < 2) return new Set();
	const s = new Set();
	for (let i = 0; i < path.length - 1; i++) s.add(`${path[i]}->${path[i + 1]}`);
	return s;
};

// Predecessor-tree edges (pred[v] -> v).
const predTreeEdges = pred => {
	const s = new Set();
	Object.entries(pred).forEach(([v, u]) => {
		if (u != null) s.add(`${u}->${v}`);
	});
	return s;
};

// id → view builder. Every scene id above has an explicit entry; each builder
// returns the highlight sets + a dist/pred snapshot + caption the stage renders.
// Distances build up across the early "story" snapshots so the picture matches
// what the prose claims. Builders are lazy so this map sits at module scope.
const VIEW_FOR_SCENE = {
	// relax — the single relax C→A improving dist[A] from 10 to 7.
	relax: () => ({
		dist: { S: 0, A: 7, B: formatDist(null), C: 3, D: formatDist(null) },
		pred: { S: null, A: 'C', B: null, C: 'S', D: null },
		relaxEdge: 'C->A',
		// dist[A] before this relax: the direct S→A edge = 10. The count starts
		// here so the estimate is seen to fall to 7, not appear.
		relaxFrom: 10,
		caption: 'Relax C → A: dist[C] + 4 = 7 < 10, so dist[A] = 7, pred[A] = C',
	}),
	// optimal substructure — the S→C→A→B path; subpath S→C→A glows.
	'optimal-substructure': () => ({
		dist: FINAL_DIST,
		pred: FINAL_PRED,
		pathSet: pathEdges(PATH_TO_B),
		subpathSet: pathEdges(['S', 'C', 'A']),
		caption: 'A shortest S→B path; its S→A prefix is itself shortest',
	}),
	// triangle inequality — every edge satisfies dist[v] ≤ dist[u] + w.
	triangle: () => ({
		dist: FINAL_DIST,
		pred: FINAL_PRED,
		treeSet: predTreeEdges(FINAL_PRED),
		caption: 'Converged: no edge has dist[u] + w < dist[v]',
	}),
	// Bellman-Ford — relax ALL edges (every edge lit as "the schedule").
	'bellman-ford': () => ({
		dist: FINAL_DIST,
		pred: FINAL_PRED,
		allEdges: true,
		caption: 'Bellman-Ford relaxes every edge, |V|−1 times',
	}),
	// DAG-SP — relax in topological order; show the order.
	'dag-sp': () => ({
		dist: FINAL_DIST,
		pred: FINAL_PRED,
		treeSet: predTreeEdges(FINAL_PRED),
		order: ['S', 'C', 'A', 'D', 'B'],
		caption: 'DAG-SP relaxes out-edges in topological order, once',
	}),
	// Dijkstra — settle order by increasing distance.
	dijkstra: () => ({
		dist: FINAL_DIST,
		pred: FINAL_PRED,
		treeSet: predTreeEdges(FINAL_PRED),
		settleOrder: ['S', 'C', 'D', 'A', 'B'],
		caption: 'Dijkstra settles vertices in increasing distance',
	}),
	// Dijkstra, trace it — freeze mid-settle. The sticky visual shows the same
	// increasing-distance settle order the frozen ExtractMin reasons from (the
	// question itself renders in the prose column via the stepProbe frame).
	'dijkstra-probe': () => ({
		dist: FINAL_DIST,
		pred: FINAL_PRED,
		treeSet: predTreeEdges(FINAL_PRED),
		settleOrder: ['S', 'C', 'D', 'A', 'B'],
		caption: 'Dijkstra mid-run: settle the smallest tentative distance next',
	}),
	// Dijkstra, the price of the queue — the running time IS the priority queue's
	// bill. Same pred tree (same algorithm), but the caption is about queue cost,
	// not a path reconstruction.
	'dijkstra-pq': () => ({
		dist: FINAL_DIST,
		pred: FINAL_PRED,
		treeSet: predTreeEdges(FINAL_PRED),
		caption:
			'Same settle order — its cost is whatever the priority queue charges',
	}),
	// why non-negative — the same Relax underlies all three; only Dijkstra needs
	// the non-negative-weight assumption.
	'why-nonneg': () => ({
		dist: FINAL_DIST,
		pred: FINAL_PRED,
		treeSet: predTreeEdges(FINAL_PRED),
		caption: 'Same Relax — Dijkstra alone needs non-negative weights',
	}),
	// predecessor subgraph — the pred tree + reconstructed path to B.
	'pred-subgraph': () => ({
		dist: FINAL_DIST,
		pred: FINAL_PRED,
		treeSet: predTreeEdges(FINAL_PRED),
		pathSet: pathEdges(PATH_TO_B),
		caption: `pred tree rooted at S · path to B = ${PATH_TO_B.join(' → ')}`,
	}),
};

// Pure id → view selector. Every scene id has an explicit entry above; an unknown
// id (only possible if a scene were added without a view) falls back to the
// pred-subgraph view rather than a numeric default meant for a different scene.
// Exported (with the map) so stageSceneCoverage.test.js can assert every scene id
// is mapped and no scene silently inherits a stale catch-all.
export const selectViewForScene = sceneId =>
	(VIEW_FOR_SCENE[sceneId] ?? VIEW_FOR_SCENE['pred-subgraph'])();

export { VIEW_FOR_SCENE };
