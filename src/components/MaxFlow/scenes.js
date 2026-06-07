// The scrolly scenes that build maximum-flow intuition before the playground.
//
// One continuous story on the classic CLRS flow network: what a flow network is
// (capacities, source, sink, conservation, the value of a flow), the residual
// network and augmenting paths, Ford-Fulkerson and Edmonds-Karp as the same
// augment-until-stuck loop with different path choices, the max-flow / min-cut
// theorem (revealing the cut), and finally integrality + bipartite matching as
// the headline application.
//
// Every concrete number is derived from the pure generators in maxFlowTrace.js
// (run in maxFlowTrace.test.js) so the scrolly and the algorithms can never
// disagree.

import {
	buildResidual,
	edmondsKarpTrace,
	extractMinCut,
} from './maxFlowTrace.js';
import {
	CLRS_NETWORK,
	MATCHING_NETWORK,
} from './maxFlowMeta.js';

// Canonical answers measured once from the generators.
const EK = edmondsKarpTrace(CLRS_NETWORK);
const MAX_FLOW = EK.value; // 23
const MIN_CUT = EK.minCut; // capacity 23
const MATCH = edmondsKarpTrace(MATCHING_NETWORK).value; // 3

// A concrete residual-capacity prediction. After pushing 12 units along
// s→v1→v3→t, the forward residual of s→v1 (capacity 16) is 16 − 12 = 4.
const SV1_CAP = CLRS_NETWORK.edges.find(e => e.from === 's' && e.to === 'v1').capacity; // 16
const PUSHED = 12;
const SV1_RESIDUAL = SV1_CAP - PUSHED; // 4
// And the back edge v1→s then has residual = flow = 12.
const SV1_BACK = PUSHED; // 12
// Sanity-check the residual numbers against the pure builder so the scene can
// never drift from the implementation.
const SAMPLE_RESIDUAL = buildResidual(
	CLRS_NETWORK.edges.map(e => ({ ...e })),
	{ 's->v1': PUSHED }
);
const SV1_FWD_CHECK = SAMPLE_RESIDUAL.find(
	re => re.kind === 'forward' && re.edgeKey === 's->v1'
).residual; // 4

export const SCENES = [
	{
		id: 'flow-network',
		eyebrow: 'The setup',
		title: 'A flow network is pipes with capacities, a source, and a sink.',
		body: `A flow network is a directed graph where every edge (u,v) has a non-negative capacity c(u,v) — the most that can flow through it. One vertex is the source s (where flow originates) and one is the sink t (where it ends). A flow assigns each edge an amount f(u,v) with 0 ≤ f(u,v) ≤ c(u,v) (the capacity constraint), and at every other vertex flow in = flow out (conservation). The VALUE of a flow is the net amount leaving s — which, by conservation, equals the net amount arriving at t.`,
		check: {
			kind: 'choice',
			prompt:
				'What does flow conservation require at every vertex other than the source and the sink?',
			options: [
				'Total flow in equals total flow out',
				'Every edge is fully saturated',
				'Flow out is at most the capacity',
				'The vertex sends flow only to the sink',
			],
			answer: 'Total flow in equals total flow out',
			explanation:
				'Conservation: no intermediate vertex creates or destroys flow, so flow in = flow out there. Only s (a net producer) and t (a net consumer) are exempt. Because of this, the value of a flow can be measured either as the net flow out of s or the net flow into t — they are equal.',
		},
	},
	{
		id: 'residual',
		eyebrow: 'The key structure',
		title: 'The residual network shows where flow can still change.',
		body: `Given a flow f, the residual network G_f records the remaining room on each edge. A forward residual edge u→v has residual capacity c(u,v) − f(u,v): the spare capacity left. A back residual edge v→u has residual capacity f(u,v): the amount of flow we could CANCEL by sending flow the other way. Those back edges are the clever part — they let the algorithm undo an earlier, suboptimal routing decision. We always look for more flow in G_f, never in the original graph.`,
		check: {
			kind: 'predict',
			prompt: `Edge s→v1 has capacity ${SV1_CAP}. After we push ${PUSHED} units of flow through it, what is the residual capacity of the FORWARD residual edge s→v1?`,
			answer: SV1_RESIDUAL,
			placeholder: 'a residual capacity',
			explanation: `Forward residual = c(s,v1) − f(s,v1) = ${SV1_CAP} − ${PUSHED} = ${SV1_FWD_CHECK}. (The matching BACK edge v1→s gets residual = f = ${SV1_BACK}, the flow we could cancel.) The residual network is recomputed from the flow after every augmentation.`,
		},
	},
	{
		id: 'augmenting-path',
		eyebrow: 'The move',
		title: 'An augmenting path is a path of spare capacity from s to t.',
		body: `An augmenting path is any path from s to t in the residual network — every edge on it has positive residual capacity. The most flow you can add along it is its bottleneck: the smallest residual capacity on the path. Augmenting means pushing that bottleneck amount along the path: forward edges gain flow, back edges return flow. Each augmentation strictly increases the value of the flow, and (with integer capacities) by at least one unit.`,
		check: {
			kind: 'choice',
			prompt:
				'On an augmenting path, how much flow can be added in one augmentation?',
			options: [
				'The minimum residual capacity along the path (its bottleneck)',
				'The maximum capacity on the path',
				'The capacity of the first edge',
				'Exactly one unit, always',
			],
			answer:
				'The minimum residual capacity along the path (its bottleneck)',
			explanation:
				'The bottleneck — the smallest residual capacity on the path — caps how much you can push, because every edge on the path must accommodate the same amount. Adding the bottleneck keeps the flow feasible and saturates at least one edge, which is why progress is always made.',
		},
	},
	{
		id: 'ford-fulkerson',
		eyebrow: 'Algorithm #1',
		title: 'Ford-Fulkerson: augment until no augmenting path remains.',
		body: `The whole method is one loop. Start with zero flow; while an augmenting path exists in the residual network, find one, push its bottleneck, and recompute the residual network. When no augmenting path remains, the flow is maximum. Ford-Fulkerson leaves the path choice open — take ANY residual path. With integer capacities it terminates, but the number of augmentations can be as large as the flow value itself, so its running time is O(E · |f*|).`,
		check: {
			kind: 'choice',
			prompt: 'When does Ford-Fulkerson stop?',
			options: [
				'When no augmenting path exists in the residual network',
				'When every edge is saturated',
				'After exactly |V| − 1 iterations',
				'When the source has no outgoing edges',
			],
			answer:
				'When no augmenting path exists in the residual network',
			explanation:
				'No augmenting path in G_f means the sink is unreachable from the source through spare capacity, so no more flow can be sent — the flow is maximum. (Not every edge need be saturated; only the edges crossing the min cut are.)',
		},
	},
	{
		id: 'edmonds-karp',
		eyebrow: 'Algorithm #2',
		title: 'Edmonds-Karp: take the shortest augmenting path (BFS).',
		body: `Edmonds-Karp is Ford-Fulkerson with one rule: always choose the SHORTEST augmenting path by number of edges, found with breadth-first search. That single discipline bounds the number of augmentations to O(V·E) regardless of the capacities, giving a polynomial O(V·E²) running time — independent of how large the capacities are. Same loop, same residual network, same augment step; only the path choice is pinned down.`,
		check: {
			kind: 'choice',
			prompt:
				'What is the ONLY difference between Edmonds-Karp and generic Ford-Fulkerson?',
			options: [
				'It always picks the shortest augmenting path (by edge count), via BFS',
				'It does not use a residual network',
				'It allows fractional flow',
				'It never uses back edges',
			],
			answer:
				'It always picks the shortest augmenting path (by edge count), via BFS',
			explanation:
				'Both augment until stuck over the same residual network. Edmonds-Karp simply fixes the path choice to the BFS shortest path, which makes the augmentation count — and thus the running time O(V·E²) — independent of the capacity sizes.',
		},
	},
	{
		id: 'max-flow-min-cut',
		eyebrow: 'The theorem',
		title: 'Max-flow equals min-cut.',
		body: `A cut (S, T) splits the vertices with s ∈ S and t ∈ T; its capacity is the total capacity of edges going from S to T. Any flow's value is at most the capacity of any cut (flow must cross). The max-flow / min-cut theorem says these meet: the maximum flow value equals the minimum cut capacity. And the cut is right there — when the algorithm halts, take S = the vertices still reachable from s in the residual network. Every edge crossing that cut is saturated, so its capacity is exactly the flow value.`,
		check: {
			kind: 'numeric',
			prompt: `On the classic network the maximum flow value is ${MAX_FLOW}. By the max-flow / min-cut theorem, what is the capacity of a minimum cut?`,
			answer: MIN_CUT.capacity,
			placeholder: 'a capacity',
			explanation: `${MIN_CUT.capacity}. The reachable set from s in the final residual network is S = {${MIN_CUT.S.join(', ')}}; the saturated edges crossing it (${MIN_CUT.edges
				.map(e => `${e.from}→${e.to}`)
				.join(', ')}) sum to ${MIN_CUT.capacity} — exactly the max-flow value. Min-cut capacity always equals max-flow value.`,
		},
	},
	{
		id: 'integrality',
		eyebrow: 'A guarantee',
		title: 'Integer capacities give an integer maximum flow.',
		body: `The integrality theorem: if every capacity is an integer, Ford-Fulkerson produces a maximum flow in which every edge's flow is an integer too. The reason is direct — flow starts at 0, every bottleneck is an integer (a min of integers), and each augmentation adds an integer amount, so the flow stays integral throughout. This is what makes max-flow a tool for COMBINATORIAL problems, where a fractional answer would be meaningless — like matching people to jobs.`,
		check: {
			kind: 'choice',
			prompt:
				'Why does Ford-Fulkerson produce an integer maximum flow when all capacities are integers?',
			options: [
				'Each augmentation adds an integer bottleneck, starting from zero flow',
				'It rounds the final flow to the nearest integer',
				'Residual capacities are always 1',
				'It only works on graphs with unit capacities',
			],
			answer:
				'Each augmentation adds an integer bottleneck, starting from zero flow',
			explanation:
				'Flow begins at 0, every bottleneck is the minimum of integer residual capacities (hence an integer), and augmenting adds that integer everywhere on the path. By induction the flow is integral at every step — no rounding needed. This integrality is what lets max-flow solve combinatorial problems exactly.',
		},
	},
	{
		id: 'matching',
		eyebrow: 'The application',
		title: 'Bipartite matching IS max-flow with unit capacities.',
		body: `To find a maximum matching between a left set L and a right set R, build a flow network: add a super-source s with a capacity-1 edge to each L vertex, give each allowed L→R pair a capacity-1 edge, and add a capacity-1 edge from each R vertex to a super-sink t. Then the maximum flow value equals the size of a maximum matching — each unit of flow is one matched pair, and unit capacities ensure every vertex is used at most once. Integrality guarantees the flow (and thus the matching) is whole.`,
		check: {
			kind: 'numeric',
			prompt: `In the matching network (3 left, 3 right vertices, all unit capacities), the maximum flow value is ${MATCH}. What is the size of the maximum matching?`,
			answer: MATCH,
			placeholder: 'a count',
			explanation: `${MATCH}. Maximum matching size = maximum flow value, because each unit of flow traverses one L→R edge (one matched pair) and the unit capacities on the s→L and R→t edges stop any vertex from being matched twice. Integer capacities → an integral flow → an actual matching of ${MATCH} pairs.`,
		},
	},
];

// Re-export the measured numbers so the stage can show the same answers.
export const MEASURED = {
	maxFlow: MAX_FLOW,
	minCut: MIN_CUT,
	matching: MATCH,
	finalFlow: EK.flow,
	finalResidual: extractMinCut(CLRS_NETWORK, EK.flow),
};
