// The scrolly scenes that build MST intuition before the playground.
//
// One continuous story on a single small weighted graph (mstMeta.MST_GRAPH):
// what an MST is, the cut property + light-edge-is-safe (the "why"), union-find
// as Kruskal's cycle detector, Kruskal, Prim, and the punchline — both build the
// SAME tree. Each scene ends with a retrieval `check` answered before scrolling
// on; wrong answers are never punished, the explanation always reveals.
//
// All concrete numbers are derived from the pure generators in mstTrace.js (run
// in mstTrace.test.js) so the scrolly and the algorithm can never disagree.

import { crossingEdges, kruskalTrace, primTrace } from './mstTrace.js';
import { MST_EDGES, MST_VERTICES } from './mstMeta.js';

// Measured facts about the shared graph (never hand-typed).
const KRUSKAL = kruskalTrace({ vertices: MST_VERTICES, edges: MST_EDGES });
const PRIM_A = primTrace({
	vertices: MST_VERTICES,
	edges: MST_EDGES,
	start: 'A',
});
export const MST_WEIGHT = KRUSKAL.totalWeight; // 27
export const MST_EDGE_COUNT = KRUSKAL.treeEdges.length; // n − 1 = 6

// Light edge across the cut {A, B, D} — used by the cut-property check. The
// crossing edges are B–C(9), B–E(4), D–E(8), D–G(12); the light edge is B–E(4).
const CUT_INSIDE = ['A', 'B', 'D'];
const CUT = crossingEdges(MST_EDGES, CUT_INSIDE);
const CUT_LIGHT = CUT.light; // B–E (4)

// Sanity (kept honest at module load): Kruskal and Prim agree.
const SAME_TREE =
	JSON.stringify(KRUSKAL.treeEdges.slice().sort()) ===
	JSON.stringify(PRIM_A.treeEdges.slice().sort());

export const SCENES = [
	{
		id: 'what-is-mst',
		eyebrow: 'The problem',
		title: 'Connect everything for the least total weight.',
		body: `Given a connected weighted graph, a spanning tree is a subset of edges that links every vertex with no cycle — exactly n − 1 edges for n vertices. The minimum spanning tree is the spanning tree whose edge weights sum to the least. On this ${MST_VERTICES.length}-vertex graph the answer is ${MST_EDGE_COUNT} edges of total weight ${MST_WEIGHT}.`,
		check: {
			kind: 'numeric',
			prompt: `A connected graph has ${MST_VERTICES.length} vertices. Exactly how many edges does any spanning tree of it use?`,
			answer: MST_VERTICES.length - 1,
			placeholder: 'a count',
			explanation: `A spanning tree on n vertices has exactly n − 1 edges: that is the fewest that connect everything, and one more would create a cycle. Here n = ${MST_VERTICES.length}, so every spanning tree — minimum or not — uses ${MST_VERTICES.length - 1} edges.`,
		},
	},
	{
		id: 'cut-property',
		eyebrow: 'The one key idea',
		title: 'A light edge across a respected cut is always safe.',
		body: `A cut splits the vertices into two sides. An edge "crosses" the cut if its endpoints land on opposite sides. The cut property: if no edge already chosen crosses the cut, then the lightest crossing edge — the light edge — is safe; some MST contains it. This single fact is why greedily grabbing light edges can never be wrong. Take the cut {${CUT_INSIDE.join(', ')}} vs the rest.`,
		check: {
			kind: 'choice',
			prompt: `Across the cut {${CUT_INSIDE.join(', ')}} | rest, the crossing edges are ${CUT.crossing
				.map(e => `${e.u}–${e.v}(${e.w})`)
				.join(', ')}. Which edge is the safe one to add?`,
			options: [...new Set(CUT.crossing.map(e => `${e.u}–${e.v} (${e.w})`))],
			answer: `${CUT_LIGHT.u}–${CUT_LIGHT.v} (${CUT_LIGHT.w})`,
			misconceptions: Object.fromEntries(
				CUT.crossing
					.filter(e => !(e.u === CUT_LIGHT.u && e.v === CUT_LIGHT.v))
					.map(e => [
						`${e.u}–${e.v} (${e.w})`,
						`${e.u}–${e.v} crosses the cut, but at weight ${e.w} it is heavier than ${CUT_LIGHT.u}–${CUT_LIGHT.v} (${CUT_LIGHT.w}). The cut property is about the LIGHTEST crossing edge, not just any crossing edge, so this one is not the safe one.`,
					])
			),
			explanation: `The light edge is the minimum-weight crossing edge: ${CUT_LIGHT.u}–${CUT_LIGHT.v} at weight ${CUT_LIGHT.w}. The cut property guarantees a minimum spanning tree contains it, so adding it is always safe. Every step of both Kruskal and Prim is secretly this same move.`,
		},
	},
	{
		id: 'union-find',
		eyebrow: 'The data structure',
		title: 'Union-find answers "same component?" almost instantly.',
		body: `Kruskal needs to know, fast, whether an edge would close a cycle — that happens exactly when both endpoints are already in the same component. Union-find tracks the components: make-set puts each vertex alone, find returns a component's representative (compressing the path as it goes), and union merges two components by rank. A cycle is simply find(u) == find(v).`,
		check: {
			kind: 'classify',
			prompt: 'Match each union-find operation to what it does for Kruskal.',
			items: [
				{ id: 'find', label: 'find(u) == find(v)' },
				{ id: 'union', label: 'union(u, v)' },
				{ id: 'makeset', label: 'make-set(v)' },
			],
			categories: [
				{ id: 'cycle', label: 'Detects a cycle' },
				{ id: 'merge', label: 'Merges two components' },
				{ id: 'init', label: 'Starts each vertex alone' },
			],
			answer: { find: 'cycle', union: 'merge', makeset: 'init' },
			explanation:
				'make-set isolates every vertex; find returns a component root (with path compression); two equal roots, find(u) == find(v), means the endpoints are already connected — adding the edge would form a cycle. union by rank then merges the two component trees, keeping them shallow. Together these give effectively constant-time cycle checks.',
		},
	},
	{
		id: 'kruskal',
		eyebrow: 'Algorithm 1',
		title: 'Kruskal: cheapest edge first, skip the cycles.',
		body: `Sort all edges ascending. Walk them cheapest-first; add an edge only when its endpoints are in different components (union-find says find(u) ≠ find(v)), otherwise skip it as a cycle. Each accepted edge is the light edge across the cut separating those two components, so the cut property certifies every choice. The forest fuses into one tree after n − 1 acceptances. The cost is dominated by the SORT: O(E log E), and since E ≤ V² we have log E ≤ 2 log V, so O(E log E) = O(E log V). The union-find work is the cheap part: E cycle checks at O(E·alpha(V)), effectively linear.`,
		check: {
			kind: 'predict',
			prompt: `On this graph the edges sorted ascending start ${[
				...new Set(
					kruskalTrace({ vertices: MST_VERTICES, edges: MST_EDGES })
						.frames.filter(f => f.phase === 'consider')
						.slice(0, 3)
						.map(
							f =>
								`${f.considerEdge.u}–${f.considerEdge.v}(${f.considerEdge.w})`
						)
				),
			].join(', ')} … Which is the very FIRST edge Kruskal accepts?`,
			options: [...new Set(['A–B (2)', 'A–D (3)', 'B–E (4)', 'C–F (5)'])],
			answer: 'A–B (2)',
			misconceptions: {
				'A–D (3)':
					'A–D is the second-lightest edge, not the first. The opening edge can never close a cycle, since every vertex still sits alone, so the globally cheapest A–B (2) is accepted outright before A–D is even reached.',
				'B–E (4)':
					'B–E is only the third edge in ascending order. Kruskal accepts cheapest-first from the global list, so a weight-4 edge cannot jump ahead of A–B (2); it waits until the lighter edges are resolved.',
				'C–F (5)':
					'C–F (5) is one of the heavier edges, far down the sorted list. Kruskal’s first acceptance is always the globally lightest edge, which here is A–B (2), not a weight-5 edge.',
			},
			explanation:
				'Kruskal always considers the globally cheapest edge first. A–B (weight 2) is the lightest edge in the whole graph, its endpoints start in different components, so it is accepted immediately — the first edge of the MST.',
		},
	},
	{
		id: 'prim',
		eyebrow: 'Algorithm 2',
		title: 'Prim: grow one tree across the lightest frontier edge.',
		body: `Prim starts a single tree at one vertex. The cut is always (tree, everything else). Each step it adds the lightest edge crossing that cut (the frontier's minimum), pulling one new vertex inside, then re-computes the frontier. It is the cut property applied to the same cut over and over. Starting from A, the lightest edge leaving A is A–B (2), so B joins first. The log factor here comes from the PRIORITY QUEUE, not from any sort: with a binary heap, V extract-min and up to E decrease-key operations each cost O(log V), giving O(E log V). Swap in a Fibonacci heap, where decrease-key is O(1) amortized, and Prim drops to O(E + V log V).`,
		check: {
			kind: 'classify',
			prompt:
				'Both run in O(E log V), but the log factor comes from a different structure. Match each algorithm to the structure that produces its log.',
			items: [
				{ id: 'kruskal', label: 'Kruskal' },
				{ id: 'prim', label: 'Prim (binary heap)' },
			],
			categories: [
				{ id: 'sort', label: 'Sorting the edge list' },
				{ id: 'pq', label: 'The priority queue' },
			],
			answer: { kruskal: 'sort', prim: 'pq' },
			explanation:
				'Kruskal touches every edge once, but it must first sort them: that O(E log E) = O(E log V) sort is the bottleneck, while its union-find checks are only O(E·alpha(V)), effectively linear. Prim never sorts; its log comes from the binary-heap priority queue (V extract-min plus E decrease-key, each O(log V)). Same Θ(E log V) headline, two different sources, which is exactly why a Fibonacci heap speeds up Prim (to O(E + V log V)) but not Kruskal.',
		},
	},
	{
		id: 'same-tree',
		eyebrow: 'The punchline',
		title: 'Different journeys, the same destination.',
		body: `Kruskal merges scattered components from a global sorted list; Prim grows one connected tree from a start vertex. They consider edges in different orders and from different starts — yet on this graph (all weights distinct) they finish with the exact same ${MST_EDGE_COUNT}-edge tree of weight ${MST_WEIGHT}. The cut property is the shared reason: both only ever add safe light edges.`,
		check: {
			kind: 'numeric',
			prompt: `Run Kruskal, or Prim from A, or Prim from F on this graph. What total weight does the minimum spanning tree have?`,
			answer: MST_WEIGHT,
			placeholder: 'total weight',
			explanation: `All three reach total weight ${MST_WEIGHT}${SAME_TREE ? ' with the identical edge set' : ''}. When edge weights are distinct the MST is unique, so the algorithm and the start vertex change only the ORDER of the steps, never the final tree.`,
		},
	},
];
