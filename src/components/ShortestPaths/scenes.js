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
	reconstructPath,
} from './relaxTrace.js';
import { SHARED_GRAPH, SHARED_SOURCE } from './ssspMeta.js';

// Measure the canonical answers from the generators on the shared graph.
const BF = bellmanFordTrace(SHARED_GRAPH, { source: SHARED_SOURCE });
const DIST = BF.dist; // { S:0, A:7, B:8, C:3, D:5 }
const PATH_TO_B = reconstructPath(BF.pred, SHARED_SOURCE, 'B'); // [S,C,A,B]

// Relax-step demonstration numbers, taken straight from the edge list so the
// predict check is graded against the real arithmetic.
//   When dist[C]=3 and we relax C→A (w=4): 3+4 = 7 < 10, so dist[A] improves to 7.
const RELAX_C = DIST.C; // 3
const RELAX_CA_W = SHARED_GRAPH.edges.find(e => e.from === 'C' && e.to === 'A').weight; // 4
const RELAX_RESULT = RELAX_C + RELAX_CA_W; // 7
const DIRECT_SA = SHARED_GRAPH.edges.find(e => e.from === 'S' && e.to === 'A').weight; // 10

// Dijkstra relaxation count on the shared graph (used in the algorithms scene).
const DIJ = dijkstraTrace(SHARED_GRAPH, { source: SHARED_SOURCE });

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
			explanation:
				'In topological order, by the time you process u, every path into u has already been relaxed, so dist[u] is correct. Relaxing u’s out-edges then extends correct prefixes by one edge — no vertex ever needs revisiting. Negative weights don’t break this; only a cycle would (and a DAG has none).',
		},
	},
	{
		id: 'dijkstra',
		eyebrow: 'Order #3 — greedy',
		title: 'Dijkstra: always settle the closest vertex next.',
		body: `When all weights are non-negative, a greedy order wins: keep the vertices in a priority queue by tentative distance, repeatedly EXTRACT-MIN the closest unsettled vertex, and relax its out-edges. The closest unsettled distance can never later get smaller — no non-negative edge can shrink it — so each vertex is settled exactly once. Cost: O((V + E) log V). On the shared graph it settles everything in ${DIJ.relaxations} relaxations.`,
		check: {
			kind: 'predict',
			prompt: `Dijkstra settles vertices in increasing distance order. On the shared graph the source S is settled first (dist 0). Which vertex is settled SECOND?`,
			options: ['C', 'A', 'B', 'D'],
			answer: 'C',
			explanation: `After S, the smallest tentative distance is dist[C] = ${DIST.C} (the direct S→C edge), smaller than the tentative dist[A] = ${DIRECT_SA}. Dijkstra extracts the minimum, so C is settled second — and only then does relaxing C→A lower dist[A] to ${DIST.A}. Greedily taking the closest is safe precisely because no later non-negative edge can undercut it.`,
		},
	},
	{
		id: 'why-nonneg',
		eyebrow: 'The catch',
		title: 'Why Dijkstra breaks on negative edges.',
		body: `Dijkstra's whole correctness rests on one assumption: once you settle the closest unsettled vertex, its distance is final. A negative edge can violate that — a vertex settled early might later be reachable more cheaply through a far vertex via a negative edge, but Dijkstra has already locked it in and never reconsiders. For negative edges you must use Bellman-Ford (any graph) or DAG-SP (acyclic).`,
		check: {
			kind: 'classify',
			prompt:
				'Match each situation to the algorithm you should reach for.',
			items: [
				{ id: 'neg', label: 'Graph has negative-weight edges (may have cycles)' },
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
