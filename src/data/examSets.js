// examSets — the derived exam-practice problem bank.
//
// Each entry is a multi-part exam problem ({ kind:'problem', stem, parts:[...] })
// graded with partial credit by the pure checkAnswer core (see
// common/TopicTemplate/checkAnswer.js). ExamPage runs a chosen set's problems
// and scores the result by topic.
//
// CORRECTNESS CULTURE (the whole point of this module)
//   Every gradeable answer key here is DERIVED, never hand-typed. We import the
//   same pure, unit-tested generators the topic pages use, CALL them on each
//   problem's concrete input at module load, and read the keys off the result:
//
//     • MST          kruskalTrace / primTrace  → acceptance order + total weight
//     • Shortest path dijkstraTrace / bellmanFordTrace → settle order + dist[]
//     • Heaps        buildMaxHeapTrace / extractMaxTrace → post-build array, max
//     • Master Thm   analyseRecurrence → case id + Θ bound
//
//   So an answer key can only ever be what the algorithm actually produces. A few
//   conceptual parts that cannot be auto-derived (e.g. "which algorithm handles
//   negative edges") are authored as 'choice' parts whose correct option is
//   unambiguous from the course material.
//
// SHAPES (the leaf kinds, per checkAnswer.js)
//   order    : { items:[label], answer:[label] }           (sequence)
//   numeric  : { answer:Number, tolerance? }               (single value)
//   choice   : { options:[label], answer:label }           (one of)
//   classify : { items:[{id,label}], categories:[{id,label}], answer:{id→catId} }
//   spotbug  : { lines:[code], answer:Number } | { options, answer }

import {
	kruskalTrace,
	primTrace,
	crossingEdges,
	edgeEndpoints,
} from '../components/Mst/mstTrace.js';
import { MST_VERTICES, MST_EDGES } from '../components/Mst/mstMeta.js';
import {
	dijkstraTrace,
	bellmanFordTrace,
} from '../components/ShortestPaths/relaxTrace.js';
import {
	buildMaxHeapTrace,
	extractMaxTrace,
} from '../components/Heaps/heapTrace.js';
import { analyseRecurrence } from '../components/MasterTheorem/masterMath.js';
import { floydWarshall } from '../components/AllPairsShortestPaths/fwTrace.js';
import { getCountingSortStepsWithStats } from '../utils/sorting/algorithms/countingSort.js';
import { radixWithSubroutine } from '../components/LinearTimeSorting/stability.js';
import { bucketSort } from '../components/LinearTimeSorting/bucketSortTrace.js';
import {
	buildBst,
	inorderValues,
	deleteValue,
	getTraversalSteps,
	containsValue,
} from '../components/Tree/treeUtils.js';
import { genericTraverse } from '../components/Graph/oneFrontier.js';
import { topoSort, isValidTopoOrder } from '../components/Graph/topoSort.js';
import { createBucketsFromEntries } from '../components/HashMap/hashMapTrace.js';
import { edmondsKarpTrace } from '../components/MaxFlow/maxFlowTrace.js';
import { sqFrames } from '../components/StacksQueues/sqFrames.js';
import { getMergeSortStepsWithStats } from '../utils/sorting/algorithms/mergeSort.js';
import { getQuickSortFrames } from '../utils/sorting/quickPartitionFrames.js';
import {
	buildCoinChangeFrames,
	buildClimbingStairsFrames,
} from '../components/Strategies/coinChangeFrames.js';
import { activitySelect } from '../components/Strategies/activitySelect.js';
import { dijkstraSettleProbe, bfsDequeueProbe } from './traceProbes.js';

// ── small derivation helpers (pure) ──────────────────────────────────────────

// A readable "u–v (w)" label for an MST edge id ("u|v"), given a weight lookup.
const mstEdgeLabel = (id, weightOf) => {
	const [u, v] = edgeEndpoints(id);
	return `${u}–${v} (${weightOf.get(id)})`;
};

// Weight lookup keyed by canonical edge id, from a raw {u,v,w} edge list. We
// re-key through kruskalTrace's own id convention by importing edgeEndpoints,
// but it is simplest to build the map straight from the input edges.
const weightMap = edges => {
	const m = new Map();
	for (const e of edges) {
		const a = String(e.u);
		const b = String(e.v);
		const id = a < b ? `${a}|${b}` : `${b}|${a}`;
		m.set(id, e.w);
	}
	return m;
};

// The vertex settle ORDER for a Dijkstra/Bellman run: read it off the frames in
// the order vertices are first marked 'settle' (Dijkstra) — the trace's `settled`
// field is SORTED, not chronological, so we must walk the frames for order.
const settleOrder = frames => {
	const seen = new Set();
	const order = [];
	for (const f of frames) {
		if (f.phase === 'settle' && f.active && !seen.has(f.active)) {
			seen.add(f.active);
			order.push(f.active);
		}
	}
	return order;
};

// Format a dist[] map value (null = unreachable / ∞) for a numeric answer key.
const distVal = v => (v == null ? Infinity : v);

// The dist[] snapshot AFTER a given Bellman-Ford pass: walk the trace frames and
// keep the last frame stamped with that pass index (the state after its final
// edge-relax, i.e. after the whole pass). Pure read off the generator's frames.
const distAfterPass = (frames, pass) => {
	let snap = null;
	for (const f of frames) if (f.pass === pass) snap = f.dist;
	return snap || {};
};

// =============================================================================
// MST — two problems on two small weighted, connected, undirected graphs.
// =============================================================================

// Problem M1: Kruskal on a 5-vertex graph. Derived: acceptance order + weight.
const M1_VERTICES = ['A', 'B', 'C', 'D', 'E'];
const M1_EDGES = [
	{ u: 'A', v: 'B', w: 1 },
	{ u: 'A', v: 'C', w: 5 },
	{ u: 'B', v: 'C', w: 4 },
	{ u: 'B', v: 'D', w: 8 },
	{ u: 'C', v: 'D', w: 2 },
	{ u: 'C', v: 'E', w: 7 },
	{ u: 'D', v: 'E', w: 3 },
];
const M1_W = weightMap(M1_EDGES);
const M1_KRUSKAL = kruskalTrace({ vertices: M1_VERTICES, edges: M1_EDGES });
// treeEdges is in Kruskal acceptance order (ascending weight, cycle-free).
const M1_ACCEPT = M1_KRUSKAL.treeEdges.map(id => mstEdgeLabel(id, M1_W));
// A plausible "sort order" distractor pool is the same labels; for the order
// part we present them shuffled by giving `items` a stable non-answer order.
const M1_ITEMS_SHUFFLED = [...M1_ACCEPT].slice().reverse();

const problemM1 = {
	kind: 'problem',
	stem:
		'Undirected weighted graph G with vertices A, B, C, D, E and edges ' +
		'A–B(1), A–C(5), B–C(4), B–D(8), C–D(2), C–E(7), D–E(3). ' +
		'Run Kruskal’s algorithm on G.',
	parts: [
		{
			kind: 'order',
			prompt:
				'Arrange the edges Kruskal ADDS to the MST, in the order it accepts them ' +
				'(ascending weight, skipping any edge that would close a cycle).',
			items: M1_ITEMS_SHUFFLED,
			answer: M1_ACCEPT,
			explanation:
				'Kruskal sorts edges ascending and adds each one whose endpoints are in ' +
				'different components. The accepted edges, in order, are ' +
				`${M1_ACCEPT.join(', ')}.`,
		},
		{
			kind: 'numeric',
			prompt: 'What is the total weight of the minimum spanning tree?',
			answer: M1_KRUSKAL.totalWeight,
			placeholder: 'total weight',
			explanation:
				`Summing the accepted edge weights gives ${M1_KRUSKAL.totalWeight}. ` +
				'Both Kruskal and Prim reach this same minimum.',
		},
		{
			kind: 'numeric',
			prompt:
				`G has ${M1_VERTICES.length} vertices. How many edges does its spanning ` +
				'tree contain?',
			answer: M1_VERTICES.length - 1,
			placeholder: 'a count',
			explanation:
				`A spanning tree on n vertices has exactly n − 1 edges, so ` +
				`${M1_VERTICES.length} − 1 = ${M1_VERTICES.length - 1}.`,
		},
		{
			kind: 'choice',
			prompt:
				'Kruskal uses a union-find structure on every edge it considers. What ' +
				'does the find(u) ≠ find(v) test detect?',
			options: [
				'Whether adding the edge would create a cycle',
				'Whether the edge is the heaviest remaining',
				'Whether the graph is connected',
				'Whether the edge has negative weight',
			],
			answer: 'Whether adding the edge would create a cycle',
			explanation:
				'If find(u) = find(v) the endpoints are already in one component, so the ' +
				'edge would close a cycle and Kruskal skips it. Different roots means the ' +
				'edge is safe to add.',
		},
	],
};

// Problem M2: Prim from a start vertex on a 4-vertex graph. Derived from primTrace.
const M2_VERTICES = ['A', 'B', 'C', 'D'];
const M2_EDGES = [
	{ u: 'A', v: 'B', w: 3 },
	{ u: 'A', v: 'C', w: 1 },
	{ u: 'B', v: 'C', w: 7 },
	{ u: 'B', v: 'D', w: 5 },
	{ u: 'C', v: 'D', w: 2 },
];
const M2_W = weightMap(M2_EDGES);
const M2_PRIM = primTrace({
	vertices: M2_VERTICES,
	edges: M2_EDGES,
	start: 'A',
});
// treeEdges is in Prim acceptance order (lightest crossing edge each step).
const M2_ACCEPT = M2_PRIM.treeEdges.map(id => mstEdgeLabel(id, M2_W));
const M2_ITEMS_SHUFFLED = [...M2_ACCEPT].slice().reverse();

const problemM2 = {
	kind: 'problem',
	stem:
		'Undirected weighted graph H with vertices A, B, C, D and edges ' +
		'A–B(3), A–C(1), B–C(7), B–D(5), C–D(2). Run Prim’s algorithm starting at A.',
	parts: [
		{
			kind: 'order',
			prompt:
				'Arrange the edges Prim adds, in order. At each step Prim takes the ' +
				'lightest edge crossing the (tree, rest) cut.',
			items: M2_ITEMS_SHUFFLED,
			answer: M2_ACCEPT,
			explanation:
				'Starting at A, the lightest crossing edge each step gives ' +
				`${M2_ACCEPT.join(', ')}.`,
		},
		{
			kind: 'numeric',
			prompt: 'What is the total weight of the minimum spanning tree?',
			answer: M2_PRIM.totalWeight,
			placeholder: 'total weight',
			explanation:
				`The accepted edges sum to ${M2_PRIM.totalWeight}. Prim from any start ` +
				'reaches the same minimum weight as Kruskal.',
		},
		{
			kind: 'choice',
			prompt: 'Which edge does Prim add FIRST from start vertex A?',
			options: [`${M2_ACCEPT[0]}`, 'A–B (3)', 'C–D (2)', 'B–D (5)'],
			answer: `${M2_ACCEPT[0]}`,
			explanation:
				`The frontier out of A is A–B(3) and A–C(1); the lighter is ${M2_ACCEPT[0]}, ` +
				'so Prim adds it first.',
		},
	],
};

// =============================================================================
// SHORTEST PATHS — one Dijkstra problem, one Bellman-Ford (negative-edge) problem.
// =============================================================================

// Problem S1: Dijkstra on a small directed graph. Derived: settle order + dist[].
const S1_GRAPH = {
	nodes: [{ id: 'S' }, { id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }],
	edges: [
		{ from: 'S', to: 'A', weight: 4 },
		{ from: 'S', to: 'B', weight: 1 },
		{ from: 'B', to: 'A', weight: 2 },
		{ from: 'A', to: 'C', weight: 5 },
		{ from: 'B', to: 'D', weight: 6 },
		{ from: 'D', to: 'C', weight: 1 },
	],
};
const S1_DIJKSTRA = dijkstraTrace(S1_GRAPH, { source: 'S' });
const S1_SETTLE = settleOrder(S1_DIJKSTRA.frames); // chronological settle order
const S1_DIST = S1_DIJKSTRA.dist;

const problemS1 = {
	kind: 'problem',
	stem:
		'Directed weighted graph (non-negative) with edges ' +
		'S→A(4), S→B(1), B→A(2), A→C(5), B→D(6), D→C(1). ' +
		'Run Dijkstra from source S.',
	parts: [
		{
			kind: 'order',
			prompt:
				'In what order does Dijkstra SETTLE (finalize) the vertices? Dijkstra ' +
				'always settles the unsettled vertex of smallest tentative distance next.',
			items: ['A', 'B', 'C', 'D', 'S'],
			answer: S1_SETTLE,
			explanation:
				`Settling smallest-distance-first gives ${S1_SETTLE.join(' → ')}. ` +
				'S is distance 0, then B at 1, then A at 3 (via B), and so on.',
		},
		{
			kind: 'numeric',
			prompt: 'What is the final shortest distance dist[A] from S?',
			answer: distVal(S1_DIST.A),
			placeholder: 'distance',
			explanation:
				`dist[A] = ${distVal(S1_DIST.A)}. The path S→B→A (1 + 2) beats the direct ` +
				'S→A (4), which is exactly why Dijkstra relaxes A again after settling B.',
		},
		{
			kind: 'numeric',
			prompt: 'What is the final shortest distance dist[C] from S?',
			answer: distVal(S1_DIST.C),
			placeholder: 'distance',
			explanation:
				`dist[C] = ${distVal(S1_DIST.C)}. Both S→B→D→C (1 + 6 + 1) and S→B→A→C ` +
				'(1 + 2 + 5) reach C at cost 8, so C settles last.',
		},
		{
			kind: 'choice',
			prompt:
				'Why may Dijkstra give a WRONG answer if an edge has negative weight?',
			options: [
				'A settled vertex can later be reached more cheaply, but Dijkstra never revisits it',
				'It runs forever and never terminates',
				'It cannot initialize the source distance to 0',
				'Negative weights make the priority queue empty immediately',
			],
			answer:
				'A settled vertex can later be reached more cheaply, but Dijkstra never revisits it',
			explanation:
				'Dijkstra assumes the smallest tentative distance is final the moment a ' +
				'vertex is settled. A later negative edge can undercut that, but the settled ' +
				'vertex is never reopened. Use Bellman-Ford for negative weights.',
		},
	],
};

// Problem S2: Bellman-Ford with a negative edge (no negative cycle). Derived.
const S2_GRAPH = {
	nodes: [{ id: 'S' }, { id: 'A' }, { id: 'B' }, { id: 'C' }],
	edges: [
		{ from: 'S', to: 'A', weight: 4 },
		{ from: 'S', to: 'B', weight: 5 },
		{ from: 'A', to: 'C', weight: 3 },
		{ from: 'B', to: 'A', weight: -3 },
		{ from: 'B', to: 'C', weight: 6 },
	],
};
const S2_BF = bellmanFordTrace(S2_GRAPH, { source: 'S' });
const S2_DIST = S2_BF.dist;

const problemS2 = {
	kind: 'problem',
	stem:
		'Directed weighted graph with a negative edge: ' +
		'S→A(4), S→B(5), A→C(3), B→A(-3), B→C(6). ' +
		'Run Bellman-Ford from source S.',
	parts: [
		{
			kind: 'choice',
			prompt:
				'This graph has a negative-weight edge B→A(-3). Which algorithm is the ' +
				'correct choice to compute shortest paths here?',
			options: [
				'Bellman-Ford',
				'Dijkstra',
				'Either works the same',
				'Neither can run',
			],
			answer: 'Bellman-Ford',
			explanation:
				'Bellman-Ford relaxes every edge |V|−1 times and is correct with negative ' +
				'edges (as long as there is no negative cycle). Dijkstra’s settle-once ' +
				'guarantee breaks under negative weights.',
		},
		{
			kind: 'numeric',
			prompt: 'After Bellman-Ford, what is dist[A] from S?',
			answer: distVal(S2_DIST.A),
			placeholder: 'distance',
			explanation:
				`dist[A] = ${distVal(S2_DIST.A)}. The path S→B→A costs 5 + (−3) = 2, which ` +
				'beats the direct S→A of 4 — only an algorithm that handles negatives finds it.',
		},
		{
			kind: 'numeric',
			prompt: 'After Bellman-Ford, what is dist[C] from S?',
			answer: distVal(S2_DIST.C),
			placeholder: 'distance',
			explanation:
				`dist[C] = ${distVal(S2_DIST.C)}, via S→B→A→C (5 − 3 + 3 = 5), cheaper than ` +
				'S→A→C (4 + 3 = 7) or S→B→C (5 + 6 = 11).',
		},
		{
			kind: 'choice',
			prompt:
				'Bellman-Ford runs one extra pass after the |V|−1 relaxation rounds. What ' +
				'does that final pass detect?',
			options: [
				'A reachable negative-weight cycle (any edge that still relaxes)',
				'Whether the graph is connected',
				'The vertex with the largest distance',
				'Whether Dijkstra would have been faster',
			],
			answer: 'A reachable negative-weight cycle (any edge that still relaxes)',
			explanation:
				'After |V|−1 passes all true shortest paths are settled. If any edge can ' +
				'still be relaxed on one more pass, a reachable negative-weight cycle exists ' +
				'and no finite shortest path is defined.',
		},
	],
};

// =============================================================================
// HEAPS — one build-max-heap problem, one extract-max problem.
// =============================================================================

// Problem H1: Build-Max-Heap on an arbitrary array. Derived: post-build array.
const H1_INPUT = [3, 9, 2, 1, 4, 5];
const H1_BUILD = buildMaxHeapTrace(H1_INPUT);
const H1_FINAL = H1_BUILD.finalHeap; // the array AFTER bottom-up build
const H1_FINAL_STR = `[${H1_FINAL.join(', ')}]`;

// Three wrong distractors for the post-build array: the unchanged input, a
// fully-sorted-descending array (a common "a heap is sorted" misconception), and
// a near-miss with one pair swapped. Kept clearly distinct from the real answer.
const H1_SORTED_DESC = `[${[...H1_INPUT].sort((a, b) => b - a).join(', ')}]`;
const H1_INPUT_STR = `[${H1_INPUT.join(', ')}]`;
const H1_NEAR = (() => {
	const a = [...H1_FINAL];
	if (a.length >= 3) [a[1], a[2]] = [a[2], a[1]];
	return `[${a.join(', ')}]`;
})();

const problemH1 = {
	kind: 'problem',
	stem:
		`Build a binary max-heap from the array ${H1_INPUT_STR} using the bottom-up ` +
		'BuildMaxHeap procedure (sift down each internal node from ⌊n/2⌋−1 to 0).',
	parts: [
		{
			kind: 'numeric',
			prompt:
				`The array has ${H1_INPUT.length} elements (indices 0..${H1_INPUT.length - 1}). ` +
				'What is the index of the LAST internal node, where BuildMaxHeap starts ' +
				'sifting (⌊n/2⌋−1)?',
			answer: Math.floor(H1_INPUT.length / 2) - 1,
			placeholder: 'an index',
			explanation:
				`⌊${H1_INPUT.length}/2⌋ − 1 = ${Math.floor(H1_INPUT.length / 2) - 1}. ` +
				'Everything past it is a leaf, already a trivial heap, so the loop starts here.',
		},
		{
			kind: 'choice',
			prompt:
				'Which array is the result AFTER BuildMaxHeap finishes? (Index 0 must be ' +
				'the maximum, and every parent ≥ its children.)',
			options: [H1_FINAL_STR, H1_SORTED_DESC, H1_INPUT_STR, H1_NEAR],
			answer: H1_FINAL_STR,
			explanation:
				`Bottom-up heapify yields ${H1_FINAL_STR}: the max ${H1_FINAL[0]} sits at ` +
				'index 0 and the heap property holds throughout. A heap is NOT sorted — ' +
				`${H1_SORTED_DESC} is a fully sorted array, a different (stronger) structure.`,
		},
		{
			kind: 'numeric',
			prompt: 'After BuildMaxHeap, what value sits at the root (index 0)?',
			answer: H1_FINAL[0],
			placeholder: 'a value',
			explanation: `The root of a max-heap is always the maximum element, here ${H1_FINAL[0]}.`,
		},
	],
};

// Problem H2: Extract-Max from a valid max-heap. Derived: max + resulting array.
const H2_HEAP = [9, 7, 8, 1, 4, 2]; // a valid max-heap
const H2_EXTRACT = extractMaxTrace({ heap: H2_HEAP });
const H2_MAX = H2_EXTRACT.max;
const H2_AFTER = H2_EXTRACT.finalHeap; // heap array after one extract-max
const H2_AFTER_STR = `[${H2_AFTER.join(', ')}]`;
// Distractors: simply dropping the root (no sift-down), and a one-swap near-miss.
const H2_NAIVE = `[${H2_HEAP.slice(1).join(', ')}]`;
const H2_NEAR = (() => {
	const a = [...H2_AFTER];
	if (a.length >= 3) [a[1], a[2]] = [a[2], a[1]];
	return `[${a.join(', ')}]`;
})();
const H2_ROOTLAST = `[${[H2_HEAP[H2_HEAP.length - 1], ...H2_HEAP.slice(1, -1)].join(', ')}]`;

const problemH2 = {
	kind: 'problem',
	stem:
		`The array [${H2_HEAP.join(', ')}] is already a valid max-heap. Perform one ` +
		'ExtractMax: return the max, move the last leaf to the root, shrink, then ' +
		'sift the new root down.',
	parts: [
		{
			kind: 'numeric',
			prompt: 'What value does ExtractMax return?',
			answer: H2_MAX,
			placeholder: 'a value',
			explanation: `ExtractMax always returns the root of a max-heap, here ${H2_MAX}.`,
		},
		{
			kind: 'choice',
			prompt:
				'What is the heap array AFTER the extraction and the sift-down restore ' +
				'(the extracted element is removed)?',
			options: [H2_AFTER_STR, H2_NAIVE, H2_ROOTLAST, H2_NEAR],
			answer: H2_AFTER_STR,
			explanation:
				`The last leaf moves to the root and sinks until the heap property holds, ` +
				`giving ${H2_AFTER_STR}. Simply deleting the root and shifting (${H2_NAIVE}) ` +
				'would break the implicit tree structure.',
		},
		{
			kind: 'numeric',
			prompt:
				'After the extraction and sift-down, what value sits at the root (index 0)?',
			answer: H2_AFTER[0],
			placeholder: 'a value',
			explanation:
				`After restoring the heap, the new maximum ${H2_AFTER[0]} rises to the root. ` +
				`ExtractMax is O(log n): one root-to-leaf descent (here ${H2_EXTRACT.comparisons} ` +
				'comparisons).',
		},
	],
};

// Problem H3: HEAPSORT — the whole sort. Build a max-heap, then repeatedly
// ExtractMax off the shrinking heap; each max drops into the sorted tail, so the
// ascending result is the extracted maxima in REVERSE order. Every answer (the
// post-build array, the first max, the heap after two extractions, the final
// sorted array) is read off buildMaxHeapTrace / extractMaxTrace — never typed.
const H3_INPUT = [4, 10, 3, 5, 1, 8, 7];
const H3_HEAP = buildMaxHeapTrace(H3_INPUT).finalHeap; // valid max-heap
const H3_HEAP_STR = `[${H3_HEAP.join(', ')}]`;

// Run heapsort by chaining ExtractMax: collect each returned max and the heap
// array that remains after it. The sorted (ascending) array is those maxima
// reversed (first max → last slot).
const H3_RUN = (() => {
	let heap = [...H3_HEAP];
	const maxes = []; // extraction order: max, 2nd max, …
	const after = []; // heap array remaining after the k-th extraction
	while (heap.length > 0) {
		const r = extractMaxTrace({ heap });
		maxes.push(r.max);
		heap = r.finalHeap;
		after.push([...heap]);
	}
	return { maxes, after, sorted: [...maxes].reverse() };
})();

const H3_FIRST_MAX = H3_RUN.maxes[0]; // first element extracted = the max
const H3_AFTER2 = H3_RUN.after[1]; // heap contents after the first 2 extractions
const H3_AFTER2_STR = `[${H3_AFTER2.join(', ')}]`;
const H3_SORTED_STR = `[${H3_RUN.sorted.join(', ')}]`;

// Distractors, in the heaps-1/heaps-2 house style: the unchanged input, a
// one-swap near-miss, and (for the sorted part) the DESCENDING array — which is
// exactly the extraction order, the classic "forgot to reverse" trap.
const H3_INPUT_STR = `[${H3_INPUT.join(', ')}]`;
const H3_DESC_STR = `[${[...H3_INPUT].sort((a, b) => b - a).join(', ')}]`;
const H3_HEAP_NEAR = (() => {
	const a = [...H3_HEAP];
	if (a.length >= 3) [a[1], a[2]] = [a[2], a[1]];
	return `[${a.join(', ')}]`;
})();
const H3_AFTER2_NEAR = (() => {
	const a = [...H3_AFTER2];
	if (a.length >= 3) [a[1], a[2]] = [a[2], a[1]];
	return `[${a.join(', ')}]`;
})();

const problemH3 = {
	kind: 'problem',
	stem:
		`Heapsort sorts ${H3_INPUT_STR} in place. First BuildMaxHeap turns it into a ` +
		`max-heap; then it repeatedly extracts the max (swap the root with the last ` +
		`heap slot, shrink the heap by one, sift the new root down) so each maximum ` +
		`lands in the growing sorted tail.`,
	parts: [
		{
			kind: 'choice',
			prompt:
				`Phase 1 is BuildMaxHeap. Which array is the max-heap it produces, before ` +
				`any element has been extracted?`,
			options: [H3_HEAP_STR, H3_DESC_STR, H3_INPUT_STR, H3_HEAP_NEAR],
			answer: H3_HEAP_STR,
			misconceptions: {
				[H3_DESC_STR]:
					`That is the array sorted in descending order. BuildMaxHeap only enforces ` +
					`parent >= children, which puts the max at index 0 but leaves the rest ` +
					`partially ordered; it does not sort.`,
			},
			explanation:
				`Bottom-up heapify gives ${H3_HEAP_STR}: the max ${H3_HEAP[0]} sits at index ` +
				`0 and every parent >= its children. The sorting only happens in phase 2, as ` +
				`maxima are pulled off one at a time.`,
		},
		{
			kind: 'numeric',
			prompt:
				`Phase 2 begins. What is the FIRST element heapsort extracts (it goes into ` +
				`the last array slot)?`,
			answer: H3_FIRST_MAX,
			placeholder: 'a value',
			explanation:
				`ExtractMax returns the root of the max-heap, which is the largest element ` +
				`${H3_FIRST_MAX}. Heapsort swaps it into the final position, where it stays.`,
		},
		{
			kind: 'choice',
			prompt:
				`After the first TWO ExtractMax steps, the two largest values are parked in ` +
				`the sorted tail and the heap has shrunk by two. What are the heap's ` +
				`remaining contents (the still-unsorted prefix)?`,
			options: [H3_AFTER2_STR, H3_HEAP_STR, H3_AFTER2_NEAR, H3_INPUT_STR],
			answer: H3_AFTER2_STR,
			misconceptions: {
				[H3_HEAP_STR]:
					`That is the heap BEFORE any extraction. Two ExtractMax steps have already ` +
					`removed the two largest values and re-heapified what is left.`,
			},
			explanation:
				`Removing the top two maxima and re-heapifying after each leaves the ` +
				`${H3_AFTER2.length}-element max-heap ${H3_AFTER2_STR}. Its root is again the ` +
				`largest of the values that remain.`,
		},
		{
			kind: 'choice',
			prompt:
				`Heapsort runs ExtractMax until the heap is empty. What is the final, fully ` +
				`sorted array (ascending)?`,
			options: [H3_SORTED_STR, H3_DESC_STR, H3_HEAP_STR, H3_INPUT_STR],
			answer: H3_SORTED_STR,
			misconceptions: {
				[H3_DESC_STR]:
					`That is the order the maxima come OUT in (largest first). But each ` +
					`extracted max is placed at the back of the array, so reading the array ` +
					`front-to-back gives ascending order, not descending.`,
			},
			explanation:
				`Each ExtractMax drops the current maximum into the next tail slot, so the ` +
				`array fills from the back with ever-smaller maxima and ends ascending: ` +
				`${H3_SORTED_STR}.`,
		},
		{
			kind: 'choice',
			prompt:
				`Why is heapsort Theta(n log n) in the worst case AND in place (O(1) extra ` +
				`space)?`,
			options: [
				'BuildMaxHeap is O(n), then n ExtractMax calls each cost O(log n) for n log n total, and the heap and the sorted tail share the one array',
				'It makes a sorted copy of the array, which takes n log n time and n extra space',
				'Each ExtractMax is O(n), so n of them give O(n squared)',
				'It is only fast on average; the worst case is O(n squared) like quicksort',
			],
			answer:
				'BuildMaxHeap is O(n), then n ExtractMax calls each cost O(log n) for n log n total, and the heap and the sorted tail share the one array',
			explanation:
				`Building the heap is O(n); each of the n extractions sifts a root down one ` +
				`root-to-leaf path, O(log n), for Theta(n log n) overall, and that bound is the ` +
				`worst case, not just the average. Because the shrinking heap and the growing ` +
				`sorted tail occupy the same array, the only extra space is a few indices, so ` +
				`it is in place.`,
		},
	],
};

// =============================================================================
// MASTER THEOREM — two recurrences, classified by analyseRecurrence.
// =============================================================================

const masterProblem = ({ id, a, b, d, k, fnText, recurrenceText }) => {
	const r = analyseRecurrence({ a, b, d, k });
	const cValue = Math.log(a) / Math.log(b);
	const cText = Number.isInteger(cValue) ? String(cValue) : cValue.toFixed(2);
	// The three case labels, presented as the choice options (correct = r.name).
	const caseOptions = ['Case 1', 'Case 2', 'Case 3'];
	// The correct Θ bound is r.result (derived). Build the options by adding it to a
	// pool of common, clearly-distinct Master-Theorem bounds, then dedupe and cap at
	// 4 so the answer is always present and the distractors are plausible.
	const BOUND_POOL = [
		`Θ(${formatNForExam(cValue)})`, // the leaf side n^c
		`Θ(${formatNForExam(d)})`, // the root side n^d
		'Θ(n log n)',
		'Θ(n^2)',
		'Θ(n^3)',
		'Θ(n)',
	];
	const boundOptions = [r.result, ...BOUND_POOL.filter(o => o !== r.result)]
		.filter((o, i, arr) => arr.indexOf(o) === i)
		.slice(0, 4);
	return {
		id,
		a,
		b,
		d,
		k,
		analysis: r,
		cText,
		caseOptions,
		boundOptions,
		fnText,
		recurrenceText,
	};
};

// Local n^x formatter mirroring masterMath.formatPower, kept tiny + dependency-free
// so the exam options read like the topic ("1", "n", "n^1.58", …).
function formatNForExam(x) {
	if (Math.abs(x) < 0.001) return '1';
	if (Math.abs(x - 1) < 0.001) return 'n';
	const rounded = Number.isInteger(x)
		? String(x)
		: x.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
	return `n^${rounded}`;
}

// Problem T1: T(n) = 2T(n/2) + n  (merge sort) — Case 2, Θ(n log n).
const T1 = masterProblem({
	id: 't1',
	a: 2,
	b: 2,
	d: 1,
	k: 0,
	fnText: 'n',
	recurrenceText: 'T(n) = 2·T(n/2) + n',
});
// Problem T2: T(n) = 8T(n/2) + n^2  — Case 1 (leaves win), Θ(n^3).
const T2 = masterProblem({
	id: 't2',
	a: 8,
	b: 2,
	d: 2,
	k: 0,
	fnText: 'n^2',
	recurrenceText: 'T(n) = 8·T(n/2) + n^2',
});

const masterCheck = T => ({
	kind: 'problem',
	stem:
		`Solve the recurrence ${T.recurrenceText} with the Master Theorem. Here ` +
		`a = ${T.a}, b = ${T.b}, and f(n) = ${T.fnText}.`,
	parts: [
		{
			kind: 'choice',
			prompt: `Compute the leaf-growth exponent c = log_b(a) = log_${T.b}(${T.a}). What is c?`,
			options: [...new Set([T.cText, String(T.d), '1', '2', '3'])].slice(0, 4),
			answer: T.cText,
			explanation:
				`c = log_${T.b}(${T.a}) = ${T.cText}. This is compared against d = ${T.d} ` +
				'(the exponent of the combine work f(n) = n^d).',
		},
		{
			kind: 'choice',
			prompt: `Comparing c = ${T.cText} with d = ${T.d}, which Master Theorem case applies?`,
			options: T.caseOptions,
			answer: T.analysis.name,
			explanation:
				`${T.analysis.name}: ${T.analysis.tone}. ` +
				(T.analysis.caseId === 1
					? 'c > d, so the leaves dominate.'
					: T.analysis.caseId === 3
						? 'c < d, so the root combine work dominates.'
						: 'c = d, so every level costs about the same.'),
		},
		{
			kind: 'choice',
			prompt: 'What is the asymptotic bound Θ(·) for T(n)?',
			options: T.boundOptions,
			answer: T.analysis.result,
			explanation: `The bound is ${T.analysis.result}. ${T.analysis.explanation}`,
		},
	],
});

const problemT1 = masterCheck(T1);
const problemT2 = masterCheck(T2);

// =============================================================================
// MASTER THEOREM, set 3 — Case 3 (root-dominated) and the two ideas a Case-3
// problem must pin down: the REGULARITY condition the theorem needs, and a
// recurrence whose f(n) is NOT polynomially comparable to n^(log_b a), so the
// BASIC Master Theorem does not settle it. Both recurrences are classified by
// analyseRecurrence (case + Θ bound are derived); the regularity statement and
// the gap-case verdict are conceptual choices (analyseRecurrence has no flag for
// either, so they stay STATIC and are listed in the test's allowlist).
// =============================================================================

// Problem T3: T(n) = 2T(n/2) + n^2 — c = log2(2) = 1 < d = 2, so the root combine
// work dominates: Case 3, Θ(n^2). (Not used by master-1 = 2T(n/2)+n or
// master-2 = 8T(n/2)+n^2.)
const T3 = masterProblem({
	id: 't3',
	a: 2,
	b: 2,
	d: 2,
	k: 0,
	fnText: 'n^2',
	recurrenceText: 'T(n) = 2·T(n/2) + n^2',
});
// Problem T4: T(n) = 4T(n/2) + n^3 — c = log2(4) = 2 < d = 3, so again the root
// work wins: Case 3, Θ(n^3). A second, steeper Case-3 split so the recurrence
// is recognised, not pattern-matched from T3.
const T4 = masterProblem({
	id: 't4',
	a: 4,
	b: 2,
	d: 3,
	k: 0,
	fnText: 'n^3',
	recurrenceText: 'T(n) = 4·T(n/2) + n^3',
});

// A Case-3 problem is only half-answered by "the root wins". The Master Theorem
// only grants Case 3 when f(n) also satisfies the REGULARITY condition
// a·f(n/b) <= c·f(n) for some constant c < 1 and all large n, and it stays
// silent when f(n) is not polynomially comparable to n^(log_b a). This set
// derives the case + Θ bound for two clean Case-3 recurrences, then asks for
// those two conceptual facts.
const problemT3 = {
	kind: 'problem',
	stem:
		`Two recurrences whose combine work outgrows the leaves (Case 3), plus the ` +
		`fine print the Master Theorem attaches to that case. For T3, ` +
		`${T3.recurrenceText}: a = ${T3.a}, b = ${T3.b}, f(n) = ${T3.fnText}, so ` +
		`c = log_${T3.b}(${T3.a}) = ${T3.cText}.`,
	parts: [
		{
			kind: 'choice',
			prompt:
				`T3: ${T3.recurrenceText}. Comparing c = ${T3.cText} with d = ${T3.d}, ` +
				`which Master Theorem case applies?`,
			options: T3.caseOptions,
			answer: T3.analysis.name,
			misconceptions: {
				'Case 1':
					`Case 1 is when c > d and the LEAVES win. Here c = ${T3.cText} < d = ` +
					`${T3.d}, so the work grows toward the ROOT, not the leaves.`,
				'Case 2':
					`Case 2 needs c = d (every level ties). Here c = ${T3.cText} is strictly ` +
					`less than d = ${T3.d}, so one side dominates: the root.`,
			},
			explanation:
				`${T3.analysis.name}: ${T3.analysis.tone}. c = ${T3.cText} < d = ${T3.d}, ` +
				`so the root combine work dominates.`,
		},
		{
			kind: 'choice',
			prompt: `T3: ${T3.recurrenceText}. What is the asymptotic bound Θ(·) for T(n)?`,
			options: T3.boundOptions,
			answer: T3.analysis.result,
			misconceptions: {
				'Θ(n log n)':
					`Θ(n log n) is the Case-2 (every-level-ties) answer for f(n) = n. Here ` +
					`the root dominates, so the bound is the combine work itself, ${T3.analysis.result}.`,
			},
			explanation: `The bound is ${T3.analysis.result}. ${T3.analysis.explanation}`,
		},
		{
			kind: 'choice',
			prompt:
				`Case 3 is not automatic once c < d. Which EXTRA condition on f(n) must ` +
				`hold for the Master Theorem to actually conclude T(n) = Θ(f(n))?`,
			options: [
				'The regularity condition: a·f(n/b) <= c·f(n) for some constant c < 1 and all large n',
				'f(n) must be a polynomial with integer coefficients',
				'f(n) must be monotonically increasing for all n',
				'a must be strictly greater than b',
			],
			answer:
				'The regularity condition: a·f(n/b) <= c·f(n) for some constant c < 1 and all large n',
			explanation:
				`Case 3 requires the regularity (smoothness) condition a·f(n/b) <= c·f(n) ` +
				`for some c < 1 and all large n. It guarantees the combine work shrinks ` +
				`geometrically down the tree, so the root term Θ(f(n)) dominates the total. ` +
				`For the polynomial f(n) = ${T3.fnText} it holds, so T3 is genuinely ${T3.analysis.result}.`,
		},
		{
			kind: 'choice',
			prompt:
				`T4: ${T4.recurrenceText}. Here a = ${T4.a}, b = ${T4.b}, f(n) = ${T4.fnText}, ` +
				`so c = log_${T4.b}(${T4.a}) = ${T4.cText}. Comparing c with d = ${T4.d}, ` +
				`which case applies?`,
			options: T4.caseOptions,
			answer: T4.analysis.name,
			misconceptions: {
				'Case 1':
					`Case 1 needs c > d. Here c = ${T4.cText} < d = ${T4.d}, so the root ` +
					`work dominates, not the leaves.`,
			},
			explanation:
				`${T4.analysis.name}: ${T4.analysis.tone}. c = ${T4.cText} < d = ${T4.d}, ` +
				`so the root combine work dominates again.`,
		},
		{
			kind: 'choice',
			prompt: `T4: ${T4.recurrenceText}. What is the asymptotic bound Θ(·) for T(n)?`,
			options: T4.boundOptions,
			answer: T4.analysis.result,
			explanation: `The bound is ${T4.analysis.result}. ${T4.analysis.explanation}`,
		},
		{
			kind: 'choice',
			prompt:
				`Now consider T(n) = 2T(n/2) + n/log n. Here c = log_2(2) = 1, but ` +
				`f(n) = n/log n is asymptotically between n^(1-ε) and n^1 for every ε > 0. ` +
				`Which statement is TRUE?`,
			options: [
				'The basic Master Theorem does not apply: f(n) is not polynomially comparable to n^c, so it falls in the gap between the cases',
				'It is Case 1, so T(n) = Θ(n)',
				'It is Case 2, so T(n) = Θ(n log n)',
				'It is Case 3, so T(n) = Θ(n/log n)',
			],
			answer:
				'The basic Master Theorem does not apply: f(n) is not polynomially comparable to n^c, so it falls in the gap between the cases',
			explanation:
				`The three cases all require f(n) to be polynomially smaller, equal, or ` +
				`larger than n^c = n^1. But n/log n is smaller than n by only a ` +
				`logarithmic factor, not a polynomial n^ε one, so no case fits: this is ` +
				`the gap the basic Master Theorem cannot resolve. (The Akra-Bazzi method ` +
				`handles it and gives Θ(n log log n), but the basic theorem stays silent.)`,
		},
	],
};

// =============================================================================
// ALL-PAIRS SHORTEST PATHS — a full Floyd-Warshall hand-trace (one final row + an
// intermediate-layer cell), derived from floydWarshall.
// =============================================================================

// Problem A1: Floyd-Warshall on a 4-vertex directed graph (vertices 1..4). We
// grade one complete final-matrix ROW and one cell of an intermediate k-layer,
// both read straight off the generator's layers.
const A1_GRAPH = {
	nodes: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }],
	edges: [
		{ from: '1', to: '2', weight: 3 },
		{ from: '1', to: '4', weight: 7 },
		{ from: '2', to: '3', weight: 1 },
		{ from: '3', to: '1', weight: 2 },
		{ from: '3', to: '4', weight: 2 },
		{ from: '4', to: '2', weight: 5 },
	],
};
const A1_FW = floydWarshall(A1_GRAPH);
const A1_IDS = A1_FW.ids; // ['1','2','3','4']
// Final shortest-distance row out of vertex 1 (distVal maps null → ∞ for keys).
const A1_ROW1 = A1_FW.dist[A1_IDS.indexOf('1')];
const A1_D12 = distVal(A1_ROW1[A1_IDS.indexOf('2')]);
const A1_D13 = distVal(A1_ROW1[A1_IDS.indexOf('3')]);
const A1_D14 = distVal(A1_ROW1[A1_IDS.indexOf('4')]);
// layers[k] = D after allowing intermediates {1..k}. layers[1] allows only vertex 1.
// The cell d[4][2] after the k=1 round: is going 4 → 1 → 2 yet possible? No, since
// 4 → 1 has no path through {1} alone, so d[4][2] stays its direct edge weight 5.
const A1_LAYER1 = A1_FW.layers[1];
const A1_L1_42 = distVal(A1_LAYER1[A1_IDS.indexOf('4')][A1_IDS.indexOf('2')]);

const problemA1 = {
	kind: 'problem',
	stem:
		'Directed weighted graph on vertices 1, 2, 3, 4 with edges ' +
		'1→2(3), 1→4(7), 2→3(1), 3→1(2), 3→4(2), 4→2(5). ' +
		'Run Floyd-Warshall (the triple loop over intermediate vertices k = 1..4).',
	parts: [
		{
			kind: 'numeric',
			prompt:
				'In the FINAL distance matrix, what is d[1][3], the shortest distance ' +
				'from vertex 1 to vertex 3?',
			answer: A1_D13,
			placeholder: 'a distance',
			explanation:
				`d[1][3] = ${A1_D13}, along 1 → 2 → 3 (3 + 1). No shorter route through ` +
				'any intermediate exists.',
		},
		{
			kind: 'order',
			prompt:
				'Pair each destination with its FINAL shortest distance from vertex 1. ' +
				'Drag the four cells into the row order d[1][1], d[1][2], d[1][3], d[1][4].',
			// Labeled cells so the task is a real arrangement even when the distances
			// happen to be monotonic; items are presented in a non-answer order.
			items: [
				`d[1][3] = ${A1_D13}`,
				`d[1][1] = 0`,
				`d[1][4] = ${A1_D14}`,
				`d[1][2] = ${A1_D12}`,
			],
			answer: [
				`d[1][1] = 0`,
				`d[1][2] = ${A1_D12}`,
				`d[1][3] = ${A1_D13}`,
				`d[1][4] = ${A1_D14}`,
			],
			explanation:
				`Row 1 settles to [0, ${A1_D12}, ${A1_D13}, ${A1_D14}]: d[1][1] = 0, ` +
				`d[1][2] = ${A1_D12} (direct), d[1][3] = ${A1_D13} (via 2), and d[1][4] = ` +
				`${A1_D14} (via 2 → 3, since 3 → 4 is only 2).`,
		},
		{
			kind: 'numeric',
			prompt:
				'After the k = 1 round (intermediates restricted to {1}), what is d[4][2]? ' +
				'Ask only: does routing 4 → 1 → 2 beat the direct edge?',
			answer: A1_L1_42,
			placeholder: 'a distance',
			explanation:
				`d[4][2] = ${A1_L1_42}. With only vertex 1 allowed as an intermediate, ` +
				'there is no 4 → 1 path yet, so d[4][2] keeps its direct edge weight 5. It ' +
				'only drops later, once vertex 3 is admitted (4 → 2 stays the shortest here).',
		},
		{
			kind: 'choice',
			prompt:
				'Why is the loop order k OUTERMOST (above i and j) essential to ' +
				'correctness?',
			options: [
				'd[i][j] through {1..k} is built from the {1..k−1} layer, so all of k−1 must finish first',
				'It makes the algorithm run in Θ(V²) instead of Θ(V³)',
				'It lets the matrix be filled column by column',
				'It avoids needing a predecessor matrix',
			],
			answer:
				'd[i][j] through {1..k} is built from the {1..k−1} layer, so all of k−1 must finish first',
			misconceptions: {
				'It makes the algorithm run in Θ(V²) instead of Θ(V³)':
					'The triple loop is Θ(V³) regardless of which index is outermost. Loop order is about correctness of the DP recurrence, not the asymptotic cost.',
			},
			explanation:
				'The recurrence d_k[i][j] = min(d_{k−1}[i][j], d_{k−1}[i][k] + d_{k−1}[k][j]) ' +
				'reads the previous k-layer. Finishing all of k before any of k+1 guarantees ' +
				'every cell it reads is already the {1..k} answer.',
		},
	],
};

// =============================================================================
// SHORTEST PATHS — a full per-pass Bellman-Ford dist[] hand-trace (negative
// edges, no negative cycle), derived from bellmanFordTrace's frames.
// =============================================================================

// Problem S3: dist[] after pass 1, and the final dist[], read off the trace.
const S3_GRAPH = {
	nodes: [{ id: 'S' }, { id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }],
	edges: [
		{ from: 'S', to: 'A', weight: 6 },
		{ from: 'S', to: 'B', weight: 7 },
		{ from: 'A', to: 'B', weight: 8 },
		{ from: 'A', to: 'C', weight: 5 },
		{ from: 'A', to: 'D', weight: -4 },
		{ from: 'B', to: 'C', weight: -3 },
		{ from: 'B', to: 'D', weight: 9 },
		{ from: 'C', to: 'A', weight: -2 },
		{ from: 'D', to: 'S', weight: 2 },
	],
};
const S3_BF = bellmanFordTrace(S3_GRAPH, { source: 'S' });
const S3_DIST = S3_BF.dist; // final distances
// The relaxation order is the edge list order above; after pass 1, A→D(-4) has
// fired (dist[D] = 2) but C→A(-2) has not yet lowered A, so dist[D] is still 2.
const S3_PASS1 = distAfterPass(S3_BF.frames, 1);
const S3_P1_D = distVal(S3_PASS1.D);
const S3_FINAL_D = distVal(S3_DIST.D);
const S3_FINAL_C = distVal(S3_DIST.C);

const problemS3 = {
	kind: 'problem',
	stem:
		'Directed graph with negative edges (no negative cycle): ' +
		'S→A(6), S→B(7), A→B(8), A→C(5), A→D(−4), B→C(−3), B→D(9), C→A(−2), D→S(2). ' +
		'Run Bellman-Ford from S, relaxing the edges in the listed order each pass.',
	parts: [
		{
			kind: 'numeric',
			prompt:
				'After ONE full pass (relax all nine edges once), what is dist[D]?',
			answer: S3_P1_D,
			placeholder: 'a distance',
			explanation:
				`dist[D] = ${S3_P1_D} after pass 1: S→A sets dist[A] = 6, then A→D(−4) gives ` +
				'dist[D] = 2. Edges later in the order have not yet improved A, so D rests at 2 ' +
				'for now.',
		},
		{
			kind: 'numeric',
			prompt:
				'After the algorithm finishes all |V|−1 passes, what is the FINAL dist[D]?',
			answer: S3_FINAL_D,
			placeholder: 'a distance',
			explanation:
				`Final dist[D] = ${S3_FINAL_D}. Later passes propagate S→B→C→A (7 − 3 − 2 = 2), ` +
				'lowering dist[A] to 2, so A→D gives dist[D] = 2 − 4 = −2.',
		},
		{
			kind: 'numeric',
			prompt: 'What is the FINAL dist[C]?',
			answer: S3_FINAL_C,
			placeholder: 'a distance',
			explanation:
				`Final dist[C] = ${S3_FINAL_C}, via S→B→C (7 + (−3) = 4), which beats S→A→C ` +
				'(6 + 5 = 11).',
		},
		{
			kind: 'choice',
			prompt:
				'Bellman-Ford runs |V|−1 = 4 passes here. Why exactly |V|−1, not fewer?',
			options: [
				'A shortest path has at most |V|−1 edges, and each pass extends correct distances by one more edge',
				'Because the graph has 4 vertices and one pass per vertex is a coincidence',
				'To give every edge a chance to be the source edge once',
				'Negative edges require one pass each to cancel out',
			],
			answer:
				'A shortest path has at most |V|−1 edges, and each pass extends correct distances by one more edge',
			explanation:
				'After pass k, all shortest paths using ≤ k edges are correct. A simple ' +
				'shortest path visits at most |V| vertices, so ≤ |V|−1 edges — |V|−1 passes ' +
				'settle them all.',
		},
	],
};

// =============================================================================
// LINEAR-TIME SORTING — a full counting-sort pass and a radix-stability
// modification analysis, both derived from the real generators.
// =============================================================================

// Problem L1: Counting sort on a small array of small keys. We grade the count[]
// histogram after the tally and the fully reconstructed array.
const L1_INPUT = [2, 5, 3, 0, 2, 3, 0, 3];
const L1_STEPS = getCountingSortStepsWithStats(L1_INPUT).steps;
const L1_LAST = L1_STEPS[L1_STEPS.length - 1];
const L1_SORTED = L1_LAST.array; // final sorted array
const L1_SORTED_STR = `[${L1_SORTED.join(', ')}]`;
// The count[] array after the counting phase finishes (last 'counting' step).
const L1_COUNTING = L1_STEPS.filter(s => s.metadata.phase === 'counting');
const L1_COUNT = L1_COUNTING[L1_COUNTING.length - 1].metadata.countArray;
const L1_K = L1_LAST.metadata.k; // range size = max + 1
const L1_COUNT0 = L1_COUNT[0]; // how many keys equal 0

const problemL1 = {
	kind: 'problem',
	stem:
		`Counting-sort the array [${L1_INPUT.join(', ')}]. The keys are integers in ` +
		`0..${Math.max(...L1_INPUT)}, so the count array has indices 0..${Math.max(
			...L1_INPUT
		)}.`,
	parts: [
		{
			kind: 'numeric',
			prompt:
				'Counting sort allocates count[0..k−1] where k is the key range. What is ' +
				'k (the number of count slots)?',
			answer: L1_K,
			placeholder: 'a count',
			explanation: `The largest key is ${Math.max(...L1_INPUT)}, so the slots are 0..${Math.max(
				...L1_INPUT
			)} — that is k = ${L1_K} slots.`,
		},
		{
			kind: 'numeric',
			prompt:
				'After the tally pass, what is count[0] (the number of keys equal to 0)?',
			answer: L1_COUNT0,
			placeholder: 'a count',
			explanation: `There are ${L1_COUNT0} zeros in the input, so count[0] = ${L1_COUNT0}.`,
		},
		{
			kind: 'choice',
			prompt: 'What is the final array after counting sort completes?',
			options: [
				L1_SORTED_STR,
				`[${[...L1_INPUT].sort((a, b) => b - a).join(', ')}]`,
				`[${L1_INPUT.join(', ')}]`,
				`[${[...new Set(L1_INPUT)].sort((a, b) => a - b).join(', ')}]`,
			],
			answer: L1_SORTED_STR,
			explanation:
				`Replaying the counts in increasing key order rebuilds ${L1_SORTED_STR}. ` +
				'Counting sort emits each key value count[v] times, so duplicates are kept, not ' +
				'deduplicated.',
		},
		{
			kind: 'choice',
			prompt:
				'Counting sort runs in Θ(n + k). When is that genuinely linear in n, ' +
				'beating the Θ(n log n) comparison lower bound?',
			options: [
				'When k is O(n), i.e. the key range is not much larger than the array',
				'Whenever the array has no duplicates',
				'Only when the input is already sorted',
				'Always, for any integer keys',
			],
			answer:
				'When k is O(n), i.e. the key range is not much larger than the array',
			misconceptions: {
				'Always, for any integer keys':
					'If k dominates n (e.g. 32-bit keys with a tiny array) the k term blows up. Counting sort is only linear when the range k is O(n).',
			},
			explanation:
				'Θ(n + k) is Θ(n) exactly when k = O(n). For a huge key range counting sort ' +
				'wastes time and space on empty slots; that is why radix sort decomposes large ' +
				'keys into small-range digits.',
		},
	],
};

// Problem L2: a radix-stability MODIFICATION ANALYSIS. LSD radix sorts by digit,
// least-significant first; each pass MUST be stable. Swapping in an unstable
// per-digit subroutine breaks the final order — derived by re-running the
// generator with the unstable subroutine.
const L2_VALUES = [53, 17, 31, 58, 11, 35];
const L2_STABLE = radixWithSubroutine(L2_VALUES, true);
const L2_UNSTABLE = radixWithSubroutine(L2_VALUES, false);
// The array after the FIRST (ones-digit) stable pass.
const L2_ONES_AFTER = L2_STABLE.passes[0].after;
const L2_ONES_STR = `[${L2_ONES_AFTER.join(', ')}]`;
const L2_STABLE_RESULT_STR = `[${L2_STABLE.result.join(', ')}]`;
const L2_UNSTABLE_RESULT_STR = `[${L2_UNSTABLE.result.join(', ')}]`;

const problemL2 = {
	kind: 'problem',
	stem:
		`LSD radix sort on the two-digit numbers [${L2_VALUES.join(', ')}]: one pass ` +
		'on the ones digit, then one pass on the tens digit, each pass a stable ' +
		'counting sort.',
	parts: [
		{
			kind: 'choice',
			prompt:
				'What is the array AFTER the first pass (sorting by the ONES digit only)?',
			options: [
				L2_ONES_STR,
				`[${[...L2_VALUES].sort((a, b) => a - b).join(', ')}]`,
				`[${[...L2_VALUES]
					.sort((a, b) => Math.floor(a / 10) - Math.floor(b / 10))
					.join(', ')}]`,
				`[${L2_VALUES.join(', ')}]`,
			],
			answer: L2_ONES_STR,
			explanation:
				`Ordering by the ones digit (keeping ties in input order) gives ${L2_ONES_STR}: ` +
				'31, 11 (digit 1), then 53, 35 (digit 3/5), and so on. The tens digit is ' +
				'ignored on this pass.',
		},
		{
			kind: 'choice',
			prompt: 'After BOTH passes, what is the final array?',
			options: [
				L2_STABLE_RESULT_STR,
				L2_UNSTABLE_RESULT_STR,
				`[${[...L2_VALUES].sort((a, b) => b - a).join(', ')}]`,
				L2_ONES_STR,
			],
			answer: L2_STABLE_RESULT_STR,
			explanation:
				`The tens pass, applied stably, finishes the sort: ${L2_STABLE_RESULT_STR}. ` +
				'Equal tens digits keep the ones-digit order established by the previous pass.',
		},
		{
			kind: 'choice',
			prompt:
				'Suppose we replace the per-digit pass with an UNSTABLE counting sort ' +
				'(equal digits may be reordered). What happens to the final array?',
			options: [
				`It is no longer sorted, e.g. ${L2_UNSTABLE_RESULT_STR}`,
				'It is still fully sorted; stability only affects speed',
				'It is sorted but in descending order',
				'The algorithm crashes on equal digits',
			],
			answer: `It is no longer sorted, e.g. ${L2_UNSTABLE_RESULT_STR}`,
			misconceptions: {
				'It is still fully sorted; stability only affects speed':
					'Stability is not a performance detail in radix sort — it is load-bearing for correctness. An unstable per-digit pass destroys the ordering the earlier digit established.',
			},
			explanation:
				'Radix relies on each pass preserving the order set by less-significant digits. ' +
				`An unstable tens pass scrambles equal-tens records, yielding ${L2_UNSTABLE_RESULT_STR}, ` +
				'which is not sorted. Stability per digit is mandatory.',
		},
	],
};

// Problem L3: BUCKET SORT on non-negative integers. Values are scattered into m
// range-buckets by index = floor(value * m / (max+1)); each bucket is sorted
// locally, then buckets are concatenated in index order. We grade the bucket a
// value lands in, the SCATTER-order contents of one bucket (before its local
// sort), and the final gathered array — all read off bucketSort (never typed).
// The two asymptotic parts (expected Theta(n), one-bucket Theta(n^2)) are
// conceptual (STATIC).
const L3_VALUES = [29, 25, 3, 49, 9, 37, 21, 43];
const L3_BUCKETS = 4;
const L3_RUN = bucketSort(L3_VALUES, L3_BUCKETS);
const L3_MAX = L3_RUN.max; // 49, so the bucket divisor (max+1) is 50
// The probed value (37) and the bucket it lands in.
const L3_PROBE = 37;
const L3_PROBE_BUCKET = L3_RUN.bucketIndexOf(L3_PROBE); // 2
// The SCATTER-order contents of that bucket, BEFORE the local sort.
const L3_BUCKET_SCATTER = L3_RUN.buckets[L3_PROBE_BUCKET]; // [29, 25, 37]
const L3_BUCKET_SORTED = L3_RUN.sortedBuckets[L3_PROBE_BUCKET]; // [25, 29, 37]
// The final sorted array (buckets concatenated in index order).
const L3_SORTED = L3_RUN.sorted; // [3, 9, 21, 25, 29, 37, 43, 49]
const L3_SORTED_STR = `[${L3_SORTED.join(', ')}]`;

const problemL3 = {
	kind: 'problem',
	stem:
		`Bucket-sort the non-negative integers [${L3_VALUES.join(', ')}] into ` +
		`${L3_BUCKETS} buckets. The largest value is ${L3_MAX}, so a value v is ` +
		`scattered into bucket floor(v * ${L3_BUCKETS} / ${L3_MAX + 1}). Each bucket ` +
		`is then sorted on its own and the buckets are concatenated in index order.`,
	parts: [
		{
			kind: 'numeric',
			prompt:
				`Into which 0-based bucket is the value ${L3_PROBE} scattered? ` +
				`(Use bucket index = floor(v * ${L3_BUCKETS} / ${L3_MAX + 1}).)`,
			answer: L3_PROBE_BUCKET,
			placeholder: 'a bucket index',
			explanation:
				`floor(${L3_PROBE} * ${L3_BUCKETS} / ${L3_MAX + 1}) = floor(${
					L3_PROBE * L3_BUCKETS
				} / ${L3_MAX + 1}) = ${L3_PROBE_BUCKET}, so ${L3_PROBE} lands in bucket ` +
				`${L3_PROBE_BUCKET}. The mapping spreads the range 0..${L3_MAX} across ` +
				`${L3_BUCKETS} equal-width buckets; the +1 in the divisor keeps the ` +
				`maximum ${L3_MAX} inside the last bucket instead of overflowing.`,
		},
		{
			kind: 'order',
			prompt:
				`List the contents of bucket ${L3_PROBE_BUCKET} as they sit RIGHT AFTER ` +
				`the scatter, BEFORE that bucket is sorted (keep them in the order the ` +
				`values appear in the input). Drag them into that sequence.`,
			items: [...L3_BUCKET_SCATTER].sort((a, b) => a - b).map(String),
			answer: L3_BUCKET_SCATTER.map(String),
			explanation:
				`Scanning the input left to right, the values that map to bucket ` +
				`${L3_PROBE_BUCKET} are ${L3_BUCKET_SCATTER.join(', ')} (in that order). ` +
				`Bucket sort scatters first and sorts each bucket only afterwards, so ` +
				`right after the scatter the bucket still holds them in input order, not ` +
				`sorted order. Its local sort then turns ` +
				`[${L3_BUCKET_SCATTER.join(', ')}] into [${L3_BUCKET_SORTED.join(', ')}].`,
		},
		{
			kind: 'order',
			prompt:
				`After every bucket is sorted and the buckets are concatenated from ` +
				`bucket 0 upward, list the final sorted array. Drag the values into ` +
				`order.`,
			items: [...L3_VALUES].sort((a, b) => b - a).map(String),
			answer: L3_SORTED.map(String),
			explanation:
				`Sorting each bucket and gathering them in index order yields ` +
				`${L3_SORTED_STR}. Because each value sits in a bucket whose whole range ` +
				`is below the next bucket's, concatenating the sorted buckets in order ` +
				`produces the fully sorted array with no merge step.`,
		},
		{
			kind: 'choice',
			prompt:
				`Bucket sort runs in expected Theta(n) on this kind of input. Which ` +
				`assumption makes that expectation hold?`,
			options: [
				'The values are spread roughly uniformly, so each bucket holds about n/m values and the local sorts are cheap',
				'The values are already sorted before bucketing',
				'There are very few buckets, so distribution is fast',
				'Bucket sort is always Theta(n) for any integer input',
			],
			answer:
				'The values are spread roughly uniformly, so each bucket holds about n/m values and the local sorts are cheap',
			misconceptions: {
				'Bucket sort is always Theta(n) for any integer input':
					'Linear time is an AVERAGE-case expectation, not a guarantee. Scatter and gather are Theta(n + m), but the local sorts cost more when a bucket grows large; only a roughly uniform spread keeps every bucket small.',
				'The values are already sorted before bucketing':
					'Pre-sortedness is not what bucket sort needs. A sorted but tightly clustered set still piles into one bucket. What matters is an even SPREAD across the range, so the buckets fill evenly.',
			},
			explanation:
				'With m about n buckets and a roughly uniform spread, each bucket holds about n/m = O(1) values, so all the local sorts together cost Theta(n). Adding the Theta(n) scatter and Theta(n + m) gather gives expected Theta(n) overall.',
		},
		{
			kind: 'choice',
			prompt:
				`Now suppose the input is skewed so that EVERY value maps to the same ` +
				`single bucket. What is bucket sort's worst-case running time (with an ` +
				`insertion sort inside each bucket)?`,
			options: ['Theta(n^2)', 'Theta(n)', 'Theta(n log n)', 'Theta(log n)'],
			answer: 'Theta(n^2)',
			misconceptions: {
				'Theta(n)':
					'Theta(n) is the EXPECTED case for a uniform spread. If everything lands in one bucket, the scatter is still Theta(n) but that one bucket now holds all n values, and sorting it dominates.',
				'Theta(n log n)':
					'Theta(n log n) would need the inner sort to be a comparison sort like merge sort. With an insertion sort inside the bucket, a single bucket of n values costs Theta(n^2).',
			},
			explanation:
				'When all n values fall into one bucket, that bucket becomes the entire input and its insertion sort runs in Theta(n^2). The buckets bought nothing: bucket sort has degraded to a single insertion sort. This is why bucket sort needs its values to spread, not clump.',
		},
	],
};

// =============================================================================
// TREES — a full BST hand-trace: build from an insertion order, read the
// in-order traversal, then a delete operation. Derived from treeUtils.
// =============================================================================

// Problem B1: insert in a fixed order, then delete a two-child node.
const B1_INSERT = [50, 30, 70, 20, 40, 60, 80, 35];
const B1_ROOT = buildBst(B1_INSERT);
const B1_INORDER = inorderValues(B1_ROOT); // ascending by the BST invariant
const B1_PRE = (() => {
	const steps = getTraversalSteps(B1_ROOT, 'preorder');
	return steps[steps.length - 1].output.map(Number);
})();
// Delete 30 (two children); its in-order successor 35 replaces it.
const B1_AFTER_DEL = deleteValue(B1_ROOT, 30);
const B1_DEL_INORDER = inorderValues(B1_AFTER_DEL);
const B1_SUCCESSOR = B1_INORDER[B1_INORDER.indexOf(30) + 1]; // 35
const B1_REMOVES_30 = !containsValue(B1_AFTER_DEL, 30);

const problemB1 = {
	kind: 'problem',
	stem:
		`Insert the keys ${B1_INSERT.join(', ')} into an initially empty binary ` +
		'search tree, in that order (each key goes left if smaller than the current ' +
		'node, right if larger).',
	parts: [
		{
			kind: 'order',
			prompt:
				'List the keys in the order an IN-ORDER traversal visits them. Drag them ' +
				'into that sequence.',
			items: [...B1_INSERT].sort((a, b) => b - a).map(String),
			answer: B1_INORDER.map(String),
			explanation:
				`An in-order walk of any BST yields its keys in ascending order: ` +
				`${B1_INORDER.join(', ')}. This is exactly why an in-order traversal sorts.`,
		},
		{
			kind: 'choice',
			prompt: 'Which key is the ROOT of the tree, and which is its left child?',
			options: [
				`root ${B1_PRE[0]}, left child ${B1_PRE[1]}`,
				`root ${B1_INORDER[0]}, left child ${B1_INORDER[1]}`,
				`root ${B1_PRE[1]}, left child ${B1_PRE[0]}`,
				`root ${B1_INORDER[B1_INORDER.length - 1]}, left child ${B1_PRE[1]}`,
			],
			answer: `root ${B1_PRE[0]}, left child ${B1_PRE[1]}`,
			misconceptions: {
				[`root ${B1_INORDER[0]}, left child ${B1_INORDER[1]}`]:
					'The smallest key is the leftmost LEAF, not the root. The root is whatever was inserted first (here 50); the BST shape is fixed by insertion order.',
			},
			explanation:
				`The first key inserted, ${B1_PRE[0]}, is the root. The next key ` +
				`${B1_PRE[1]} is smaller, so it becomes the root's left child. A pre-order ` +
				`traversal (root first) reads ${B1_PRE.join(', ')}.`,
		},
		{
			kind: 'numeric',
			prompt:
				'Now DELETE the key 30. It has two children, so it is replaced by its ' +
				'in-order successor (the smallest key in its right subtree). Which key ' +
				'moves up to take its place?',
			answer: B1_SUCCESSOR,
			placeholder: 'a key',
			explanation:
				`The successor of 30 is the minimum of its right subtree, which is ` +
				`${B1_SUCCESSOR}. It moves up so the BST ordering is preserved; deleting a ` +
				`two-child node always splices in the successor (or predecessor).`,
		},
		{
			kind: 'order',
			prompt:
				'After deleting 30, list the remaining keys in in-order sequence.',
			items: [...B1_DEL_INORDER].sort((a, b) => b - a).map(String),
			answer: B1_DEL_INORDER.map(String),
			explanation:
				`30 is gone and ${B1_SUCCESSOR} takes its slot, so the in-order sequence is ` +
				`${B1_DEL_INORDER.join(', ')} — still sorted, still without 30 (removed: ` +
				`${B1_REMOVES_30}).`,
		},
	],
};

// =============================================================================
// GRAPHS — one graph, two traversal disciplines: BFS visit order + BFS depths,
// and the DFS visit order. Derived from genericTraverse (the shared frontier).
// =============================================================================

// Problem G1: an undirected graph; FIFO frontier → BFS, LIFO frontier → DFS.
// Adjacency is built alphabetically, so the orders are deterministic.
const G1_GRAPH = {
	nodes: [
		{ id: 'A' },
		{ id: 'B' },
		{ id: 'C' },
		{ id: 'D' },
		{ id: 'E' },
		{ id: 'F' },
	],
	edges: [
		{ from: 'A', to: 'B' },
		{ from: 'A', to: 'C' },
		{ from: 'B', to: 'D' },
		{ from: 'C', to: 'D' },
		{ from: 'C', to: 'E' },
		{ from: 'D', to: 'F' },
		{ from: 'E', to: 'F' },
	],
};
const G1_BFS = genericTraverse(G1_GRAPH, { discipline: 'fifo', start: 'A' });
const G1_DFS = genericTraverse(G1_GRAPH, { discipline: 'lifo', start: 'A' });
const G1_BFS_ORDER = G1_BFS.visitOrder;
const G1_DFS_ORDER = G1_DFS.visitOrder;
// BFS depth = shortest unweighted hop count from A.
const G1_DEPTH_F = distVal(G1_BFS.dist.F);

const problemG1 = {
	kind: 'problem',
	stem:
		'Undirected graph with vertices A..F and edges A–B, A–C, B–D, C–D, C–E, ' +
		'D–F, E–F. Traverse from A. When a vertex has several unvisited neighbours, ' +
		'consider them in alphabetical order.',
	parts: [
		{
			kind: 'order',
			prompt: 'Give the order BFS (a FIFO queue frontier) VISITS the vertices.',
			items: ['F', 'E', 'D', 'C', 'B', 'A'],
			answer: G1_BFS_ORDER,
			explanation:
				`BFS drains the queue oldest-first, so it sweeps level by level: ` +
				`${G1_BFS_ORDER.join(' → ')}. A (level 0), then B, C (level 1), then D, E ` +
				'(level 2), then F (level 3).',
		},
		{
			kind: 'numeric',
			prompt:
				'BFS labels each vertex with its depth (hop count from A). What is the ' +
				'BFS depth of F?',
			answer: G1_DEPTH_F,
			placeholder: 'a depth',
			explanation:
				`F sits at depth ${G1_DEPTH_F}: the shortest unweighted route from A reaches it ` +
				'in that many hops (e.g. A → C → D → F or A → C → E → F). BFS finds shortest ' +
				'paths in unweighted graphs.',
		},
		{
			kind: 'order',
			prompt:
				'Give the order DFS (a LIFO stack frontier) VISITS the vertices, with ' +
				'the same alphabetical tie-breaking.',
			items: ['F', 'E', 'D', 'C', 'B', 'A'],
			answer: G1_DFS_ORDER,
			explanation:
				`DFS plunges down one branch before backtracking: ${G1_DFS_ORDER.join(' → ')}. ` +
				'The stack hands back the most recently added vertex, so it dives deep first.',
		},
		{
			kind: 'choice',
			prompt:
				'Both traversals settle all six vertices and run in Θ(V + E). What ' +
				'single thing differs between them?',
			options: [
				'The frontier discipline: a FIFO queue (BFS) vs a LIFO stack (DFS)',
				'BFS visits more vertices than DFS',
				'DFS cannot reach every vertex',
				'BFS uses edge weights and DFS does not',
			],
			answer:
				'The frontier discipline: a FIFO queue (BFS) vs a LIFO stack (DFS)',
			explanation:
				'It is the same loop over the same graph; only the rule for which frontier ' +
				'vertex leaves next changes. Queue → breadth-first, stack → depth-first.',
		},
	],
};

// =============================================================================
// GRAPHS (topological sort) — Kahn's algorithm on a fixed DAG. The first vertex
// in the order, any vertex's in-degree, the full topological order, and whether
// a candidate order is valid are all read off topoSort / isValidTopoOrder
// (never hand-typed). Only "why a cycle has no order" is conceptual (STATIC).
// =============================================================================

// A 6-vertex "prerequisite" DAG. Two sources (A, B), and F depends on everything
// upstream of it, so Kahn's smallest-id-first order is unique enough to grade.
//   A → C   A → D   B → C   C → E   D → E   E → F
const G2_VERTICES = ['A', 'B', 'C', 'D', 'E', 'F'];
const G2_EDGES = [
	{ from: 'A', to: 'C' },
	{ from: 'A', to: 'D' },
	{ from: 'B', to: 'C' },
	{ from: 'C', to: 'E' },
	{ from: 'D', to: 'E' },
	{ from: 'E', to: 'F' },
];
const G2_TOPO = topoSort(G2_VERTICES, G2_EDGES);
const G2_ORDER = G2_TOPO.order; // ['A','B','C','D','E','F']
const G2_FIRST = G2_ORDER[0]; // 'A' — the in-degree-0, smallest-id vertex
const G2_INDEG_E = G2_TOPO.indegree.E; // 2 (from C and D)
// A VALID alternative order (different from Kahn's, to show order is not unique).
// Whether it is valid is itself derived from isValidTopoOrder.
const G2_CANDIDATE = ['B', 'A', 'D', 'C', 'E', 'F'];
const G2_CANDIDATE_STR = `[${G2_CANDIDATE.join(', ')}]`;
const G2_CANDIDATE_VALID = isValidTopoOrder(G2_CANDIDATE, G2_EDGES); // true
const G2_VALIDITY = G2_CANDIDATE_VALID ? 'Valid' : 'Invalid';
// The order part is presented shuffled (a stable non-answer order to drag from).
const G2_ITEMS_SHUFFLED = [...G2_ORDER].slice().reverse();

const problemG2 = {
	kind: 'problem',
	stem:
		'Directed acyclic graph with vertices A, B, C, D, E, F and edges ' +
		'A→C, A→D, B→C, C→E, D→E, E→F. Run a topological sort with Kahn’s ' +
		'algorithm: repeatedly remove an in-degree-0 vertex, breaking ties by ' +
		'choosing the smallest id (alphabetical here).',
	parts: [
		{
			kind: 'choice',
			prompt:
				'Kahn starts from a vertex with NO incoming edges (in-degree 0). With the ' +
				'smallest-id tie-break, which vertex does the topological sort emit FIRST?',
			options: [G2_FIRST, 'C', 'F', 'E'],
			answer: G2_FIRST,
			misconceptions: {
				F:
					'F is the SINK (everything must come before it); it is emitted LAST, ' +
					'not first. Kahn starts from in-degree-0 sources.',
			},
			explanation:
				`A and B are the only in-degree-0 vertices (no prerequisites). The ` +
				`smallest-id tie-break picks ${G2_FIRST} first; B follows once A is removed.`,
		},
		{
			kind: 'numeric',
			prompt:
				'In the ORIGINAL graph, what is the in-degree of vertex E (its number of ' +
				'incoming edges)?',
			answer: G2_INDEG_E,
			placeholder: 'a count',
			explanation:
				`E has incoming edges from C and D, so its in-degree is ${G2_INDEG_E}. ` +
				'Kahn can only emit E once both of those are removed (its in-degree hits 0).',
		},
		{
			kind: 'order',
			prompt:
				'Give the full topological order Kahn produces, smallest in-degree-0 ' +
				'vertex first at each step. Drag the vertices into that sequence.',
			items: G2_ITEMS_SHUFFLED,
			answer: G2_ORDER,
			explanation:
				`Emitting the smallest free vertex each step gives ${G2_ORDER.join(' → ')}. ` +
				'A and B are the sources; C, D open up next; E waits for both C and D; F is last.',
		},
		{
			kind: 'choice',
			prompt:
				`A topological order is not unique. Is the candidate order ${G2_CANDIDATE_STR} ` +
				'a VALID topological order for this graph (every edge points forward)?',
			options: ['Valid', 'Invalid'],
			answer: G2_VALIDITY,
			explanation:
				`${G2_CANDIDATE_STR} is ${G2_VALIDITY.toLowerCase()}: every edge u→v has u ` +
				'before v, even though it differs from Kahn’s smallest-id order. Many ' +
				'distinct orders can be correct as long as no edge points backward.',
		},
		{
			kind: 'choice',
			prompt:
				'Suppose we add the edge F→A, creating a cycle A→C→E→F→A. How many ' +
				'vertices can a topological sort now place?',
			options: [
				'None — a graph with a cycle has no topological order',
				'All six, in some order',
				'Only the vertices outside the cycle',
				'Exactly five, dropping one cycle vertex',
			],
			answer: 'None — a graph with a cycle has no topological order',
			misconceptions: {
				'Only the vertices outside the cycle':
					'Kahn would emit B (still in-degree 0), but a topological order must ' +
					'place EVERY vertex. Because the cycle vertices never reach in-degree 0, ' +
					'no complete order exists, so the sort fails rather than partially succeeds.',
			},
			explanation:
				'In a cycle A→C→E→F→A every vertex has an unmet ' +
				'prerequisite ahead of it, so none can be placed first. Kahn’s in-degrees ' +
				'never all reach 0, which is exactly how it DETECTS the cycle: fewer vertices ' +
				'come out than went in. A topological order exists only for a DAG.',
		},
	],
};

// =============================================================================
// TRACE-STEP PROBES — the mid-run WHY, graded against the frame stream (council
// #6). Every problem above asks for a TERMINAL artifact; these freeze a frame as
// the question and grade the NEXT decision, derived from the next decision frame of
// the SAME generator (traceProbes.js does the read-off). The frozen state rides on
// each 'stepProbe' part as `frame` so the host renders the canvas the algorithm is
// actually at; the answer is never typed.
// =============================================================================

// Problem SP-SSSP: Dijkstra on the same non-negative graph as S1, probed mid-run.
// We freeze two beats (the 2nd and 3rd settle) and ask which vertex settles next —
// the smallest-tentative-distance choice that IS Dijkstra. Answers are read off the
// subsequent settle frame, so they can only be what the algorithm does.
const SP_DIJKSTRA_IDS = S1_GRAPH.nodes.map(n => n.id); // ['S','A','B','C','D']
const SP_DIJKSTRA_P1 = dijkstraSettleProbe(S1_DIJKSTRA, SP_DIJKSTRA_IDS, 2);
const SP_DIJKSTRA_P2 = dijkstraSettleProbe(S1_DIJKSTRA, SP_DIJKSTRA_IDS, 3);

// `lead` opens the question so both the first ("which vertex does Dijkstra settle
// next?") and the follow-up ("which vertex does Dijkstra settle next AFTER THAT?")
// read cleanly — no interstitial-word double space.
const dijkstraProbePart = (probe, lead) => ({
	kind: 'stepProbe',
	// The frozen state IS the question — stored verbatim from the generator's frame.
	frame: probe.frozen,
	view: {
		kind: 'dijkstra-settle',
		ids: SP_DIJKSTRA_IDS,
		source: 'S',
		nextLabel: 'settles next',
	},
	prompt:
		'Dijkstra is mid-run on the graph below. From the frozen state — the settled ' +
		`set and the current tentative distances — ${lead}`,
	options: probe.options,
	answer: probe.answer,
	explanation:
		`Dijkstra always settles the UNSETTLED vertex of smallest tentative distance. ` +
		`Among the unsettled vertices the minimum is ${probe.answer} (dist = ` +
		`${distVal(probe.frozen.dist[probe.answer])}), so it is finalized next. The picture ` +
		'is the generator’s real state at that ExtractMin, not a sketch.',
});

const problemSPdijkstra = {
	kind: 'problem',
	stem:
		'Directed weighted graph (non-negative) with edges ' +
		'S→A(4), S→B(1), B→A(2), A→C(5), B→D(6), D→C(1). Dijkstra runs from S. ' +
		'Each part freezes the algorithm mid-run; read the next move off the state shown.',
	parts: [
		dijkstraProbePart(
			SP_DIJKSTRA_P1,
			'which vertex does Dijkstra SETTLE (finalize) next?'
		),
		dijkstraProbePart(
			SP_DIJKSTRA_P2,
			'which vertex does Dijkstra settle next after that?'
		),
	],
};

// Problem SP-BFS: BFS (a FIFO frontier) on the same graph as G1, probed mid-run.
// We freeze two beats (before the 2nd and 3rd dequeue) and ask which vertex leaves
// the queue next — the FIFO front. Answers read off the next extract frame.
const SP_BFS_IDS = G1_GRAPH.nodes.map(n => n.id); // ['A'..'F']
const SP_BFS_P1 = bfsDequeueProbe(G1_BFS, SP_BFS_IDS, 1);
const SP_BFS_P2 = bfsDequeueProbe(G1_BFS, SP_BFS_IDS, 2);

const bfsProbePart = (probe, lead) => ({
	kind: 'stepProbe',
	frame: probe.frozen,
	view: {
		kind: 'bfs-dequeue',
		ids: SP_BFS_IDS,
		start: 'A',
		nextLabel: 'dequeues next',
	},
	prompt:
		'BFS is mid-run on the graph below, using a FIFO queue frontier. From the ' +
		`queue shown, ${lead}`,
	options: probe.options,
	answer: probe.answer,
	explanation:
		`A FIFO queue hands back the vertex that has waited longest — the FRONT of the ` +
		`queue. Here the front is ${probe.answer}, so BFS dequeues it next and then ` +
		'considers its neighbours. The queue shown is the generator’s real frontier.',
});

const problemSPbfs = {
	kind: 'problem',
	stem:
		'Undirected graph with vertices A..F and edges A–B, A–C, B–D, C–D, C–E, D–F, ' +
		'E–F. BFS runs from A (alphabetical tie-breaking). Each part freezes the queue ' +
		'mid-run; read the next dequeue off the frontier shown.',
	parts: [
		bfsProbePart(
			SP_BFS_P1,
			'which vertex does BFS DEQUEUE (remove from the front) next?'
		),
		bfsProbePart(SP_BFS_P2, 'which vertex does BFS dequeue next after that?'),
	],
};

// =============================================================================
// HASHING — a full chaining hand-trace: hash several keys, place them in buckets,
// observe a collision, read the load factor. Bucket indices are DERIVED by the
// HashMap module's own hash (polynomial: hash=7, ·31 per char, % capacity).
// =============================================================================

// Problem HM1: insert five string keys into a capacity-7 table with separate
// chaining. We grade a derived bucket index, the collision count, and α.
const HM1_KEYS = ['cat', 'dog', 'bird', 'fish', 'ant'];
const HM1_CAPACITY = 7;
const HM1_ENTRIES = HM1_KEYS.map(k => ({ key: k, value: k.length }));
const HM1_BUCKETS = createBucketsFromEntries(HM1_ENTRIES, HM1_CAPACITY);
// Find the bucket holding a specific key (derived, not hand-typed).
const HM1_BUCKET_OF = key =>
	HM1_BUCKETS.findIndex(b => b.some(e => e.key === key));
const HM1_CAT_BUCKET = HM1_BUCKET_OF('cat');
// The number of buckets that hold more than one key (a real chained collision).
const HM1_COLLISION_BUCKETS = HM1_BUCKETS.filter(b => b.length > 1).length;
// Load factor α = n / m after all insertions.
const HM1_ALPHA = (HM1_KEYS.length / HM1_CAPACITY).toFixed(2);
// The longest chain length (how many keys share one bucket at most).
const HM1_MAX_CHAIN = Math.max(...HM1_BUCKETS.map(b => b.length));

const problemHM1 = {
	kind: 'problem',
	stem:
		`A hash table with m = ${HM1_CAPACITY} buckets uses separate chaining. The ` +
		'hash of a string is h = 7, then h = h·31 + charCode for each character, and ' +
		`the bucket is h mod ${HM1_CAPACITY}. Insert the keys ` +
		`${HM1_KEYS.map(k => `"${k}"`).join(', ')} in that order.`,
	parts: [
		{
			kind: 'numeric',
			prompt:
				'After inserting all five keys, how many buckets hold a COLLISION (more ' +
				'than one key chained together)?',
			answer: HM1_COLLISION_BUCKETS,
			placeholder: 'a count',
			explanation:
				`${HM1_COLLISION_BUCKETS} bucket holds two keys: "cat" and "ant" hash to the ` +
				`same index ${HM1_CAT_BUCKET}, so they share a chain. The other keys land ` +
				'alone. Separate chaining absorbs the collision in a linked list.',
		},
		{
			kind: 'numeric',
			prompt:
				'What is the length of the LONGEST chain (the most keys in any single ' +
				'bucket)?',
			answer: HM1_MAX_CHAIN,
			placeholder: 'a length',
			explanation:
				`The longest chain has ${HM1_MAX_CHAIN} keys (the colliding pair in bucket ` +
				`${HM1_CAT_BUCKET}). A lookup that hits this bucket scans the whole chain.`,
		},
		{
			kind: 'choice',
			prompt:
				`The table holds ${HM1_KEYS.length} keys in ${HM1_CAPACITY} buckets. What ` +
				'is the load factor α = n / m?',
			options: [
				HM1_ALPHA,
				(HM1_CAPACITY / HM1_KEYS.length).toFixed(2),
				String(HM1_KEYS.length),
				'1.00',
			],
			answer: HM1_ALPHA,
			explanation:
				`α = n / m = ${HM1_KEYS.length} / ${HM1_CAPACITY} = ${HM1_ALPHA}. The expected ` +
				'chain length is α, so the average successful search is Θ(1 + α).',
		},
		{
			kind: 'choice',
			prompt:
				'As we keep inserting and α grows past a threshold, the table RESIZES ' +
				'(rehashes into a larger table). Why must every key be rehashed, not just ' +
				'copied to the same index?',
			options: [
				'The bucket index is h mod m, and m changes — so the index of each key changes too',
				'Because the hash function itself changes during a resize',
				'To put the keys into sorted order',
				'Only colliding keys need rehashing; the rest keep their index',
			],
			answer:
				'The bucket index is h mod m, and m changes — so the index of each key changes too',
			misconceptions: {
				'Because the hash function itself changes during a resize':
					'The hash h of a key is fixed. What changes on resize is the table size m in the compression step h mod m, which is why every index must be recomputed.',
			},
			explanation:
				'A key’s slot is h mod m. Doubling m (to a new prime) changes h mod m for ' +
				'essentially every key, so the whole table is rebuilt to spread the chains out ' +
				'again and restore O(1) average operations.',
		},
	],
};

// =============================================================================
// MAXIMUM FLOW — a full Edmonds-Karp hand-trace: the maximum-flow value and the
// minimum cut. Derived from edmondsKarpTrace (value + extracted min cut).
// =============================================================================

// Problem MF1: a 6-vertex flow network. We grade the max-flow value, the min-cut
// capacity (equal to it), and the size of the source side S of the min cut.
const MF1_NETWORK = {
	nodes: [
		{ id: 'S' },
		{ id: 'A' },
		{ id: 'B' },
		{ id: 'C' },
		{ id: 'D' },
		{ id: 'T' },
	],
	source: 'S',
	sink: 'T',
	edges: [
		{ from: 'S', to: 'A', capacity: 10 },
		{ from: 'S', to: 'B', capacity: 10 },
		{ from: 'A', to: 'B', capacity: 2 },
		{ from: 'A', to: 'C', capacity: 4 },
		{ from: 'A', to: 'D', capacity: 8 },
		{ from: 'B', to: 'D', capacity: 9 },
		{ from: 'C', to: 'T', capacity: 10 },
		{ from: 'D', to: 'C', capacity: 6 },
		{ from: 'D', to: 'T', capacity: 10 },
	],
};
const MF1_RUN = edmondsKarpTrace(MF1_NETWORK);
const MF1_VALUE = MF1_RUN.value;
const MF1_CUT = MF1_RUN.minCut;
const MF1_CUT_CAP = MF1_CUT.capacity;
const MF1_CUT_S_SIZE = MF1_CUT.S.length; // vertices on the source side
const MF1_CUT_EDGES = MF1_CUT.edges
	.map(e => `${e.from}→${e.to}(${e.capacity})`)
	.join(', ');

const problemMF1 = {
	kind: 'problem',
	stem:
		'Flow network from source S to sink T with capacities ' +
		'S→A(10), S→B(10), A→B(2), A→C(4), A→D(8), B→D(9), C→T(10), D→C(6), D→T(10). ' +
		'Run Edmonds-Karp (augment along shortest residual paths) to maximum flow.',
	parts: [
		{
			kind: 'numeric',
			prompt: 'What is the value of the maximum flow from S to T?',
			answer: MF1_VALUE,
			placeholder: 'a flow value',
			explanation:
				`The maximum flow is ${MF1_VALUE}. Augmenting paths push flow until no ` +
				'residual S→T path remains; the value out of S then equals ' +
				`${MF1_VALUE}.`,
		},
		{
			kind: 'numeric',
			prompt:
				'By the max-flow / min-cut theorem, the minimum-cut capacity equals the ' +
				'max-flow value. What is the capacity of the minimum cut?',
			answer: MF1_CUT_CAP,
			placeholder: 'a capacity',
			explanation:
				`The min cut crosses ${MF1_CUT_EDGES}, total capacity ${MF1_CUT_CAP} — equal ` +
				`to the max-flow value ${MF1_VALUE}, as the theorem guarantees.`,
		},
		{
			kind: 'numeric',
			prompt:
				'The min cut splits the vertices into S-side and T-side. How many ' +
				'vertices are on the SOURCE side (the set reachable from S in the final ' +
				'residual network)?',
			answer: MF1_CUT_S_SIZE,
			placeholder: 'a count',
			explanation:
				`The source side is {${MF1_CUT.S.join(', ')}} — ${MF1_CUT_S_SIZE} vertices. ` +
				'These are exactly the vertices still reachable from S once no augmenting path ' +
				'remains; the cut edges leave this set.',
		},
		{
			kind: 'choice',
			prompt:
				'Edmonds-Karp differs from plain Ford-Fulkerson in ONE rule. Which?',
			options: [
				'It always augments along a SHORTEST residual path (BFS), giving an O(V·E²) bound',
				'It augments along the path of largest bottleneck',
				'It never uses back edges in the residual network',
				'It finds the min cut first, then the flow',
			],
			answer:
				'It always augments along a SHORTEST residual path (BFS), giving an O(V·E²) bound',
			misconceptions: {
				'It never uses back edges in the residual network':
					'Both algorithms use residual back edges to reroute flow. Edmonds-Karp’s only change is choosing the shortest augmenting path (BFS) instead of any path.',
			},
			explanation:
				'Choosing the fewest-edge augmenting path each round (BFS) makes the running ' +
				'time polynomial, O(V·E²), independent of the capacity magnitudes — unlike ' +
				'generic Ford-Fulkerson, whose DFS path choice can depend on |f*|.',
		},
	],
};

// =============================================================================
// MST MODIFICATION ANALYSIS — does adding a constant to every edge weight change
// the MST? Derived by re-running Kruskal on the perturbed input.
// =============================================================================

const M3_VERTICES = ['A', 'B', 'C', 'D', 'E'];
const M3_EDGES = [
	{ u: 'A', v: 'B', w: 2 },
	{ u: 'A', v: 'C', w: 3 },
	{ u: 'B', v: 'C', w: 1 },
	{ u: 'B', v: 'D', w: 4 },
	{ u: 'C', v: 'D', w: 5 },
	{ u: 'C', v: 'E', w: 6 },
	{ u: 'D', v: 'E', w: 2 },
];
const M3_W = weightMap(M3_EDGES);
const M3_BASE = kruskalTrace({ vertices: M3_VERTICES, edges: M3_EDGES });
const M3_BASE_ACCEPT = M3_BASE.treeEdges.map(id => mstEdgeLabel(id, M3_W));
const M3_SHIFT = 10;
const M3_SHIFTED_EDGES = M3_EDGES.map(e => ({ ...e, w: e.w + M3_SHIFT }));
const M3_SHIFTED = kruskalTrace({
	vertices: M3_VERTICES,
	edges: M3_SHIFTED_EDGES,
});
// Same tree? Compare the (sorted) accepted edge-id sets.
const M3_SAME_TREE =
	JSON.stringify([...M3_BASE.treeEdges].sort()) ===
	JSON.stringify([...M3_SHIFTED.treeEdges].sort());
const M3_BASE_WEIGHT = M3_BASE.totalWeight;
const M3_SHIFTED_WEIGHT = M3_SHIFTED.totalWeight;
const M3_DELTA = M3_SHIFTED_WEIGHT - M3_BASE_WEIGHT; // = shift * (n - 1)

const problemM3 = {
	kind: 'problem',
	stem:
		'Undirected weighted graph on A, B, C, D, E with edges ' +
		'A–B(2), A–C(3), B–C(1), B–D(4), C–D(5), C–E(6), D–E(2). ' +
		`Now suppose we add a constant ${M3_SHIFT} to the weight of EVERY edge.`,
	parts: [
		{
			kind: 'choice',
			prompt:
				`Does adding ${M3_SHIFT} to every edge weight change WHICH edges form the ` +
				'minimum spanning tree?',
			options: [
				'No — the same edges form the MST',
				'Yes — heavier edges are now avoided',
				'Yes — the MST gains an extra edge',
				'It depends on whether the graph has a cycle',
			],
			answer: 'No — the same edges form the MST',
			misconceptions: {
				'Yes — heavier edges are now avoided':
					'Every spanning tree has exactly n−1 edges, so a uniform shift adds the same constant·(n−1) to all of them. The relative ordering of spanning-tree totals is unchanged, so the MST is the same.',
			},
			explanation:
				'A spanning tree on n vertices always uses n−1 edges, so adding c to every ' +
				`weight raises every spanning tree's total by exactly c·(n−1). The minimizer is ` +
				`unchanged — the same edges (${M3_SAME_TREE ? 'confirmed by re-running Kruskal' : 'see below'}).`,
		},
		{
			kind: 'numeric',
			prompt: 'What is the total weight of the MST on the ORIGINAL graph?',
			answer: M3_BASE_WEIGHT,
			placeholder: 'total weight',
			explanation: `The MST edges are ${M3_BASE_ACCEPT.join(', ')}, summing to ${M3_BASE_WEIGHT}.`,
		},
		{
			kind: 'numeric',
			prompt:
				`After adding ${M3_SHIFT} to every edge, by how much does the MST's total ` +
				'weight INCREASE?',
			answer: M3_DELTA,
			placeholder: 'an increase',
			explanation:
				`The tree has n−1 = ${M3_VERTICES.length - 1} edges, each now ${M3_SHIFT} ` +
				`heavier, so the total rises by ${M3_SHIFT} × ${M3_VERTICES.length - 1} = ` +
				`${M3_DELTA} (from ${M3_BASE_WEIGHT} to ${M3_SHIFTED_WEIGHT}).`,
		},
		{
			kind: 'choice',
			prompt:
				'Contrast: if instead we MULTIPLIED every weight by a positive constant, ' +
				'would the MST edges change?',
			options: [
				'No — scaling by a positive constant preserves the order of all edge weights',
				'Yes — multiplication reorders the edges',
				'Only if some weights are below 1',
				'Yes — it can introduce a cycle',
			],
			answer:
				'No — scaling by a positive constant preserves the order of all edge weights',
			explanation:
				'Both adding a constant and multiplying by a positive constant are monotonic ' +
				'transforms: they preserve the relative order of edge weights, and the greedy ' +
				'MST choices depend only on that order. So the MST edge set is unchanged either way.',
		},
	],
};

// Problem M4: the CUT PROPERTY in isolation. On the lesson's shared graph we fix
// ONE cut S = {A, B, D} vs the rest, and read its crossing edges plus the
// lightest (safe) crossing edge straight off crossingEdges, the same helper
// Kruskal and Prim's light-edge logic is built on. Everything gradeable is
// derived; only the "why the light edge is safe" exchange argument is STATIC.
const M4_VERTICES = MST_VERTICES;
const M4_EDGES = MST_EDGES;
const M4_CUT = ['A', 'B', 'D']; // S; the rest is {C, E, F, G}
const M4_REST = M4_VERTICES.filter(v => !M4_CUT.includes(v));
// A readable "u–v (w)" label straight off a crossingEdges {u,v,w} record.
const m4Label = e => `${e.u}–${e.v} (${e.w})`;
const M4_CROSS = crossingEdges(M4_EDGES, M4_CUT); // { crossing, light }
// crossing is sorted ascending by weight (then id): the answer to the order part.
const M4_CROSSING = M4_CROSS.crossing.map(m4Label);
const M4_CROSSING_SHUFFLED = [...M4_CROSSING].slice().reverse();
const M4_LIGHT = M4_CROSS.light; // the lightest crossing edge: the safe edge.
const M4_LIGHT_LABEL = m4Label(M4_LIGHT);
const M4_LIGHT_WEIGHT = M4_LIGHT.w;
const M4_HEAVIEST_LABEL = m4Label(
	M4_CROSS.crossing[M4_CROSS.crossing.length - 1]
);
// Cross-check (distinct weights, so the MST is unique): the cut property's
// "some MST" is THE MST here, so the light edge must appear in it.
const M4_MST = kruskalTrace({ vertices: M4_VERTICES, edges: M4_EDGES });
const M4_LIGHT_IN_MST = M4_MST.treeEdges.includes(M4_LIGHT.id);

const problemM4 = {
	kind: 'problem',
	stem:
		'The same graph the lesson runs Kruskal and Prim on: vertices A, B, C, D, ' +
		'E, F, G with edges A–B(2), A–D(3), B–C(9), B–E(4), C–F(5), D–E(8), ' +
		'D–G(12), E–F(6), E–G(7), F–G(10), C–E(11). Fix the CUT that splits the ' +
		`vertices into S = {${M4_CUT.join(', ')}} and the rest {${M4_REST.join(', ')}}. ` +
		'The cut property is the single theorem behind BOTH algorithms.',
	parts: [
		{
			kind: 'order',
			prompt:
				`An edge CROSSES the cut when exactly one endpoint is inside S = ` +
				`{${M4_CUT.join(', ')}}. List every crossing edge in ascending weight ` +
				`order. (Edges with both endpoints inside S, like A–B, do not cross.)`,
			items: M4_CROSSING_SHUFFLED,
			answer: M4_CROSSING,
			explanation:
				`Exactly one endpoint inside S means one of A, B, D and one of ` +
				`${M4_REST.join(', ')}. Those edges, lightest first, are ` +
				`${M4_CROSSING.join(', ')}. A–B and A–D stay inside S, so they do not ` +
				`cross; E–F, E–G, F–G stay inside the rest, so they do not cross either.`,
		},
		{
			kind: 'choice',
			prompt:
				'The cut property guarantees ONE of the crossing edges is safe to add ' +
				'to the MST. Which crossing edge is it?',
			options: [M4_LIGHT_LABEL, M4_HEAVIEST_LABEL, 'A–B (2)', 'C–F (5)'],
			answer: M4_LIGHT_LABEL,
			misconceptions: {
				[M4_HEAVIEST_LABEL]:
					`That is the HEAVIEST edge crossing the cut. The cut property is about ` +
					`the LIGHTEST crossing edge; a heaviest crossing edge is exactly the ` +
					`kind an MST avoids.`,
				'A–B (2)':
					`A–B is lighter, but BOTH its endpoints are inside S, so it does not ` +
					`cross the cut at all. The property only speaks about edges that cross.`,
				'C–F (5)':
					`C–F is light, but both endpoints (C and F) are outside S, so it does ` +
					`not cross this cut.`,
			},
			explanation:
				`The cut property says: for any cut, the LIGHTEST edge crossing it is ` +
				`safe, so some MST contains it. Among the crossing edges ` +
				`${M4_CROSSING.join(', ')} the lightest is ${M4_LIGHT_LABEL}, so it is ` +
				`the safe edge` +
				(M4_LIGHT_IN_MST ? `, and indeed it is in this graph's MST.` : '.'),
		},
		{
			kind: 'numeric',
			prompt:
				`What is the WEIGHT of that safe edge, the lightest edge crossing ` +
				`S = {${M4_CUT.join(', ')}}?`,
			answer: M4_LIGHT_WEIGHT,
			placeholder: 'a weight',
			explanation:
				`The crossing edges are ${M4_CROSSING.join(', ')}; the minimum weight ` +
				`among them is ${M4_LIGHT_WEIGHT} (edge ${M4_LIGHT_LABEL}). That is the ` +
				`edge the cut property certifies as safe.`,
		},
		{
			kind: 'choice',
			prompt:
				'WHY is that lightest crossing edge guaranteed to be in some MST? ' +
				'(This single exchange argument is what makes both Kruskal and Prim ' +
				'correct.)',
			options: [
				'Take any MST without it; adding it makes a cycle that also crosses ' +
					'the cut, so swapping that heavier crossing edge out yields a ' +
					'spanning tree no heavier, and that tree is an MST containing the ' +
					'light edge',
				'Because the lightest edge in the WHOLE graph is always in the MST',
				'Because every edge crossing a cut is in every MST',
				'Because Prim happens to add it first from vertex A',
			],
			answer:
				'Take any MST without it; adding it makes a cycle that also crosses ' +
				'the cut, so swapping that heavier crossing edge out yields a ' +
				'spanning tree no heavier, and that tree is an MST containing the ' +
				'light edge',
			misconceptions: {
				'Because the lightest edge in the WHOLE graph is always in the MST':
					'A different claim, and a weaker one. The cut property is local: it ' +
					'is about the lightest edge crossing THIS cut, not the global minimum. ' +
					'That locality is what lets Prim and Kruskal make progress one cut at ' +
					'a time.',
				'Because every edge crossing a cut is in every MST':
					'Only the LIGHTEST crossing edge is guaranteed safe. The heavier ' +
					'crossing edges (here D–E, B–C, D–G) need not be in any MST.',
			},
			explanation:
				'The exchange argument: take any MST that omits the light edge e. ' +
				'Adding e creates exactly one cycle, and that cycle must cross the cut a ' +
				'second time on some edge f. Since e is the LIGHTEST crossing edge, ' +
				'weight(e) is at most weight(f), so removing f and keeping e yields a ' +
				'spanning tree of weight no greater than the MST, hence an MST ' +
				'containing e. That guarantee is exactly why greedily taking light ' +
				'edges (Kruskal across components, Prim across the tree/rest cut) never ' +
				'goes wrong.',
		},
	],
};

// =============================================================================
// FOUNDATIONS (arrays & complexity) — counting loop work, big-O simplification,
// and the best/worst/amortized distinction. Conceptual, so numeric keys are
// computed with an EXPLICIT arithmetic expression in the module (never typed).
// =============================================================================

// Problem F1: a nested loop whose body runs 1 + 2 + … + n times. We count it with
// the closed form n(n+1)/2 for a concrete n, then a big-O simplification choice.
const F1_N = 8;
// Inner body executes for j = i..n−1 on each i, i.e. n + (n−1) + … + 1 times.
// That sum is n(n+1)/2, computed here as an explicit expression (the answer key).
const F1_BODY_COUNT = (F1_N * (F1_N + 1)) / 2; // 8·9/2 = 36

const problemF1 = {
	kind: 'problem',
	stem:
		`Consider this nested loop on an array of length n = ${F1_N}: ` +
		'"for i from 0 to n−1, then for j from i to n−1, do one unit of work". ' +
		'Count how the inner work grows, then simplify it to a Θ class.',
	parts: [
		{
			kind: 'numeric',
			prompt:
				`For n = ${F1_N}, how many times does the inner "one unit of work" line ` +
				'run in total? (The inner loop runs n times when i = 0, n−1 times when ' +
				'i = 1, and so on down to 1.)',
			answer: F1_BODY_COUNT,
			placeholder: 'a count',
			explanation:
				`The body runs n + (n−1) + … + 1 = n(n+1)/2 times. For n = ${F1_N} that is ` +
				`${F1_N}·${F1_N + 1}/2 = ${F1_BODY_COUNT}.`,
		},
		{
			kind: 'choice',
			prompt:
				'The exact count is n(n+1)/2 = n²/2 + n/2. What is its Θ class (drop ' +
				'constant factors and lower-order terms)?',
			options: ['Θ(n²)', 'Θ(n)', 'Θ(n log n)', 'Θ(n³)'],
			answer: 'Θ(n²)',
			misconceptions: {
				'Θ(n)':
					'The n/2 term is dominated by n²/2 for large n. Big-O keeps only the ' +
					'fastest-growing term, which here is the quadratic one.',
			},
			explanation:
				'n²/2 + n/2 is dominated by the n² term, and the constant 1/2 is dropped, ' +
				'so the count is Θ(n²). A doubly-nested loop over the same range is the ' +
				'classic quadratic shape.',
		},
		{
			kind: 'choice',
			prompt:
				'Simplify O(3n² + 100n + 7) to its tightest standard big-O class.',
			options: ['O(n²)', 'O(n)', 'O(3n²)', 'O(n² + n)'],
			answer: 'O(n²)',
			misconceptions: {
				'O(3n²)':
					'Constant factors are dropped in big-O: 3n² is O(n²). The notation ' +
					'describes growth rate, not the exact coefficient.',
			},
			explanation:
				'Drop the constant factor 3 and the lower-order 100n + 7 terms: the ' +
				'growth is governed by n², so O(3n² + 100n + 7) = O(n²).',
		},
		{
			kind: 'choice',
			prompt:
				'A dynamic array doubles its capacity when full. Any single push can ' +
				'cost Θ(n) (a full copy), yet we still call push "Θ(1) amortized". What ' +
				'does amortized mean here?',
			options: [
				'Averaged over a sequence of operations, each push costs Θ(1); the rare Θ(n) copies are paid for by the many cheap pushes',
				'Every individual push is guaranteed to cost Θ(1) in the worst case',
				'It is the best-case cost of a single push',
				'It is the cost only when the array never resizes',
			],
			answer:
				'Averaged over a sequence of operations, each push costs Θ(1); the rare Θ(n) copies are paid for by the many cheap pushes',
			misconceptions: {
				'Every individual push is guaranteed to cost Θ(1) in the worst case':
					'That is worst-case per operation, which is Θ(n) here (the resize copy). Amortized cost averages the total over the whole sequence, which is Θ(1) per push.',
			},
			explanation:
				'n pushes do at most ~2n total work (geometric resizing: 1 + 2 + 4 + … ' +
				'< 2n copies), so the average per push is Θ(1). Worst-case for one push ' +
				'is still Θ(n).',
		},
	],
};

// Problem F2: the growth-rate race (ordering functions by asymptotic growth) and
// the best/worst-case distinction for a concrete algorithm. Conceptual choices
// with one unambiguous correct option; the linear-search count key below is a
// plain arithmetic expression, not a guessed number.
const F2_N = 100;
// Linear search worst case: the target is absent (or last), so all n elements are
// inspected. The count is exactly n, written as an explicit expression.
const F2_LINEAR_WORST = F2_N; // n comparisons in the worst case
// Best case: the target is the first element, one comparison.
const F2_LINEAR_BEST = 1;

const problemF2 = {
	kind: 'problem',
	stem:
		'Asymptotic growth and case analysis. Order functions by how fast they grow, ' +
		'then reason about linear search on an array of n elements.',
	parts: [
		{
			kind: 'order',
			prompt:
				'Arrange these growth rates from SLOWEST-growing to FASTEST-growing (the ' +
				'order in which they would win the "growth-rate race" for large n).',
			items: ['O(n²)', 'O(log n)', 'O(2ⁿ)', 'O(n)', 'O(n log n)'],
			answer: ['O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(2ⁿ)'],
			explanation:
				'For large n the order is log n < n < n log n < n² < 2ⁿ. Logarithmic grows ' +
				'slowest, exponential explodes fastest; n log n sits just above linear and ' +
				'below quadratic.',
		},
		{
			kind: 'numeric',
			prompt:
				`Linear search scans an array of n = ${F2_N} elements for a target. In the ` +
				'WORST case (target absent), how many elements does it inspect?',
			answer: F2_LINEAR_WORST,
			placeholder: 'a count',
			explanation:
				`The worst case inspects all n = ${F2_LINEAR_WORST} elements, since the ` +
				'target is only ruled out after the last one. That is the Θ(n) worst-case ' +
				'cost.',
		},
		{
			kind: 'numeric',
			prompt:
				'For the SAME linear search, how many elements does it inspect in the ' +
				'BEST case (target is the first element)?',
			answer: F2_LINEAR_BEST,
			placeholder: 'a count',
			explanation:
				`The best case is ${F2_LINEAR_BEST}: the very first comparison finds the ` +
				'target. Best, worst, and average are different questions about the SAME ' +
				'algorithm.',
		},
		{
			kind: 'choice',
			prompt:
				'Why do we usually quote the WORST-case (big-O) bound rather than the ' +
				'best case when comparing algorithms?',
			options: [
				'It is a guarantee: the algorithm never does worse, so it bounds performance for any input',
				'The best case is impossible to compute',
				'The worst case is always the same as the average case',
				'Best-case analysis would make every algorithm look identical',
			],
			answer:
				'It is a guarantee: the algorithm never does worse, so it bounds performance for any input',
			misconceptions: {
				'The worst case is always the same as the average case':
					'They often differ: linear search is Θ(n) worst case but Θ(n) average ' +
					'too, while quicksort is Θ(n²) worst case yet Θ(n log n) average. The ' +
					'worst case is quoted because it is a hard guarantee, not because it ' +
					'equals the average.',
			},
			explanation:
				'The worst case gives an upper bound that holds for every input, so it is ' +
				'a safety guarantee. Best-case bounds are optimistic and rarely useful for ' +
				'comparing real performance.',
		},
	],
};

// =============================================================================
// STACKS & QUEUES — trace a concrete op sequence on each structure (final state
// + what comes out next), derived by SIMULATING the sequence with sqFrames, plus
// a LIFO-vs-FIFO use-case choice.
// =============================================================================

// Problem SQ1: the SAME op-log on a stack and on a queue, so the LIFO/FIFO
// contrast is concrete. Ops: push/enqueue A, B, C, then remove, push/enqueue D,
// then remove. Final contents are read straight off the simulated frames.
const SQ_OPS = [
	{ type: 'add', value: 'A' },
	{ type: 'add', value: 'B' },
	{ type: 'add', value: 'C' },
	{ type: 'remove' },
	{ type: 'add', value: 'D' },
	{ type: 'remove' },
];
const SQ_STACK_FRAMES = sqFrames('stack', [], SQ_OPS);
const SQ_QUEUE_FRAMES = sqFrames('queue', [], SQ_OPS);
// Final contents: stack listed bottom→top, queue listed front→rear.
const SQ_STACK_FINAL = SQ_STACK_FRAMES[SQ_STACK_FRAMES.length - 1].items; // ['A','B']
const SQ_QUEUE_FINAL = SQ_QUEUE_FRAMES[SQ_QUEUE_FRAMES.length - 1].items; // ['C','D']
const SQ_STACK_FINAL_STR = `[${SQ_STACK_FINAL.join(', ')}]`;
const SQ_QUEUE_FINAL_STR = `[${SQ_QUEUE_FINAL.join(', ')}]`;
// What the NEXT remove would output: stack pops the top (last of the list),
// queue dequeues the front (first of the list). Derived by simulating one more op.
const SQ_STACK_NEXT = sqFrames('stack', SQ_STACK_FINAL, [{ type: 'remove' }]);
const SQ_QUEUE_NEXT = sqFrames('queue', SQ_QUEUE_FINAL, [{ type: 'remove' }]);
const SQ_STACK_POPS = SQ_STACK_FINAL[SQ_STACK_FINAL.length - 1]; // 'B'
const SQ_QUEUE_DEQ = SQ_QUEUE_FINAL[0]; // 'C'
// Confirm the simulated removes agree with the read-off endpoints (defensive).
const SQ_STACK_AFTER_STR = `[${SQ_STACK_NEXT[SQ_STACK_NEXT.length - 1].items.join(', ')}]`;
const SQ_QUEUE_AFTER_STR = `[${SQ_QUEUE_NEXT[SQ_QUEUE_NEXT.length - 1].items.join(', ')}]`;

const problemSQ1 = {
	kind: 'problem',
	stem:
		'Apply the SAME operation sequence to an empty stack and an empty queue: ' +
		'add A, add B, add C, remove, add D, remove. For the stack "add" is push and ' +
		'"remove" is pop; for the queue "add" is enqueue and "remove" is dequeue.',
	parts: [
		{
			kind: 'choice',
			prompt:
				'After the full sequence, what does the STACK contain, listed bottom to ' +
				'top? (A stack removes the most recently added element.)',
			options: [SQ_STACK_FINAL_STR, SQ_QUEUE_FINAL_STR, '[A, D]', '[B, D]'],
			answer: SQ_STACK_FINAL_STR,
			explanation:
				'Push A, B, C leaves [A, B, C]. Pop removes C (the top). Push D gives ' +
				`[A, B, D]. Pop removes D. Final: ${SQ_STACK_FINAL_STR}.`,
		},
		{
			kind: 'choice',
			prompt:
				'After the full sequence, what does the QUEUE contain, listed front to ' +
				'rear? (A queue removes the earliest added element.)',
			options: [SQ_QUEUE_FINAL_STR, SQ_STACK_FINAL_STR, '[A, D]', '[B, D]'],
			answer: SQ_QUEUE_FINAL_STR,
			explanation:
				'Enqueue A, B, C leaves [A, B, C]. Dequeue removes A (the front). ' +
				`Enqueue D gives [B, C, D]. Dequeue removes B. Final: ${SQ_QUEUE_FINAL_STR}.`,
		},
		{
			kind: 'choice',
			prompt:
				`From the final states (stack ${SQ_STACK_FINAL_STR}, queue ` +
				`${SQ_QUEUE_FINAL_STR}), which value comes out on the NEXT remove from ` +
				'each structure?',
			options: [
				`Stack pops ${SQ_STACK_POPS}, queue dequeues ${SQ_QUEUE_DEQ}`,
				`Stack pops ${SQ_QUEUE_DEQ}, queue dequeues ${SQ_STACK_POPS}`,
				`Both return ${SQ_STACK_POPS}`,
				`Both return ${SQ_QUEUE_DEQ}`,
			],
			answer: `Stack pops ${SQ_STACK_POPS}, queue dequeues ${SQ_QUEUE_DEQ}`,
			explanation:
				`The stack returns its top, ${SQ_STACK_POPS}, leaving ${SQ_STACK_AFTER_STR}. ` +
				`The queue returns its front, ${SQ_QUEUE_DEQ}, leaving ${SQ_QUEUE_AFTER_STR}. ` +
				'LIFO takes the newest, FIFO takes the oldest.',
		},
	],
};

// Problem SQ2: choose the right discipline for two use cases (LIFO vs FIFO),
// plus the depth-first / breadth-first frontier consequence.
const problemSQ2 = {
	kind: 'problem',
	stem:
		'Two scenarios, two disciplines. Decide whether each wants a stack (LIFO, ' +
		'last in first out) or a queue (FIFO, first in first out).',
	parts: [
		{
			kind: 'choice',
			prompt:
				'You implement UNDO in an editor: each action is recorded, and undo must ' +
				'reverse the MOST RECENT action first. Which structure fits?',
			options: [
				'A stack (LIFO) — the last action recorded is the first undone',
				'A queue (FIFO) — the first action recorded is the first undone',
				'Either works identically',
				'Neither; undo needs a sorted list',
			],
			answer: 'A stack (LIFO) — the last action recorded is the first undone',
			explanation:
				'Undo reverses actions newest-first, which is exactly LIFO. Push each ' +
				'action; undo pops the most recent. A queue would undo the oldest action ' +
				'first, the wrong order.',
		},
		{
			kind: 'choice',
			prompt:
				'A print server must serve jobs in the ORDER they were submitted ' +
				'(fairness, first come first served). Which structure fits?',
			options: [
				'A queue (FIFO) — jobs leave in submission order',
				'A stack (LIFO) — the newest job prints first',
				'Either works identically',
				'Neither; printing needs a priority heap by default',
			],
			answer: 'A queue (FIFO) — jobs leave in submission order',
			explanation:
				'First-come-first-served IS FIFO: enqueue on submit, dequeue to print, so ' +
				'the earliest job is served first. A stack would let a late job jump ahead ' +
				'of everything waiting.',
		},
		{
			kind: 'choice',
			prompt:
				'Graph search reuses these exact disciplines for its frontier. A FIFO ' +
				'queue frontier gives which traversal, and a LIFO stack frontier gives ' +
				'which?',
			options: [
				'Queue → breadth-first search; stack → depth-first search',
				'Queue → depth-first search; stack → breadth-first search',
				'Both give breadth-first search',
				'Both give depth-first search',
			],
			answer: 'Queue → breadth-first search; stack → depth-first search',
			explanation:
				'A FIFO frontier hands back the oldest discovered vertex, sweeping level ' +
				'by level (BFS). A LIFO frontier hands back the newest, plunging down one ' +
				'branch (DFS). Same loop, different frontier discipline.',
		},
	],
};

// =============================================================================
// SORTING (merge sort) — a full hand-trace derived from getMergeSortStepsWithStats:
// an intermediate merged subarray, the final array, the comparison count, and the
// recurrence/complexity. Every key is read off the real generator's steps.
// =============================================================================

const MS1_INPUT = [5, 2, 8, 1, 9, 3, 7, 4];
const MS1_RUN = getMergeSortStepsWithStats(MS1_INPUT);
const MS1_STEPS = MS1_RUN.steps;
const MS1_FINAL = MS1_STEPS[MS1_STEPS.length - 1].array; // fully sorted array
const MS1_FINAL_STR = `[${MS1_FINAL.join(', ')}]`;
const MS1_COMPARISONS = MS1_RUN.finalStats.comparisons;
// The completed merges, keyed by their target range. We read the merged snapshot
// for the LEFT half [0,3] and the very first leaf-pair merge [0,1], straight off
// the generator (never hand-typed).
const MS1_MERGES = MS1_STEPS.filter(
	s => s.metadata && s.metadata.operation === 'merge_complete'
);
const MS1_MERGE_OF = (start, end) =>
	MS1_MERGES.find(
		m => m.metadata.target[0] === start && m.metadata.target[1] === end
	).metadata.outputSnapshot;
const MS1_LEFT_HALF = MS1_MERGE_OF(0, 3); // merge of the left four elements
const MS1_LEFT_HALF_STR = `[${MS1_LEFT_HALF.join(', ')}]`;
const MS1_RIGHT_HALF = MS1_MERGE_OF(4, 7); // merge of the right four elements
const MS1_RIGHT_HALF_STR = `[${MS1_RIGHT_HALF.join(', ')}]`;

const problemMS1 = {
	kind: 'problem',
	stem:
		`Merge-sort the array [${MS1_INPUT.join(', ')}]. Merge sort splits the array ` +
		'in half, recursively sorts each half, then merges the two sorted halves.',
	parts: [
		{
			kind: 'choice',
			prompt:
				`The array splits into a left half [${MS1_INPUT.slice(0, 4).join(', ')}] ` +
				`and a right half [${MS1_INPUT.slice(4).join(', ')}]. After the left half ` +
				'is fully sorted (recursively), what does it look like?',
			options: [
				MS1_LEFT_HALF_STR,
				`[${MS1_INPUT.slice(0, 4).join(', ')}]`,
				MS1_RIGHT_HALF_STR,
				`[${[...MS1_INPUT.slice(0, 4)].sort((a, b) => b - a).join(', ')}]`,
			],
			answer: MS1_LEFT_HALF_STR,
			explanation:
				`Sorting the left four elements [${MS1_INPUT.slice(0, 4).join(', ')}] ` +
				`yields ${MS1_LEFT_HALF_STR}. Each half is sorted independently before the ` +
				'final merge combines them.',
		},
		{
			kind: 'choice',
			prompt:
				`Both halves are now sorted: left ${MS1_LEFT_HALF_STR}, right ` +
				`${MS1_RIGHT_HALF_STR}. What is the FINAL array after the top-level merge?`,
			options: [
				MS1_FINAL_STR,
				`[${MS1_INPUT.join(', ')}]`,
				`[${[...MS1_INPUT].sort((a, b) => b - a).join(', ')}]`,
				`${MS1_LEFT_HALF_STR.slice(0, -1)}, ${MS1_RIGHT_HALF_STR.slice(1)}`,
			],
			answer: MS1_FINAL_STR,
			explanation:
				'Merging the two sorted halves by repeatedly taking the smaller front ' +
				`element gives ${MS1_FINAL_STR}. Concatenating the halves without merging ` +
				'would not be sorted.',
		},
		{
			kind: 'numeric',
			prompt:
				'Exactly how many element-to-element COMPARISONS does this merge sort ' +
				'perform on the array? (Count each "is left front ≤ right front?" test.)',
			answer: MS1_COMPARISONS,
			placeholder: 'a count',
			explanation:
				`This run performs ${MS1_COMPARISONS} comparisons across all the merges. ` +
				'Merge sort makes Θ(n log n) comparisons; for n = ' +
				`${MS1_INPUT.length} that is at most about n·log₂n = ` +
				`${MS1_INPUT.length} × ${Math.log2(MS1_INPUT.length)} = ` +
				`${MS1_INPUT.length * Math.log2(MS1_INPUT.length)} in the worst case, so ${MS1_COMPARISONS} sits just under the bound.`,
		},
		{
			kind: 'choice',
			prompt:
				'Merge sort obeys the recurrence T(n) = 2·T(n/2) + Θ(n): two half-size ' +
				'subproblems plus a linear merge. What does it solve to?',
			options: ['Θ(n log n)', 'Θ(n²)', 'Θ(n)', 'Θ(log n)'],
			answer: 'Θ(n log n)',
			misconceptions: {
				'Θ(n²)':
					'Θ(n²) is the bound for the simple quadratic sorts (insertion, ' +
					'selection). Merge sort halves the problem and merges in linear time, ' +
					'so it is Θ(n log n).',
			},
			explanation:
				'By the Master Theorem with a = 2, b = 2, f(n) = Θ(n): log_b(a) = 1 = d, ' +
				'so this is Case 2 and T(n) = Θ(n log n). The log n factor is the number of ' +
				'halving levels; each level does Θ(n) merge work.',
		},
	],
};

// Problem MS2: the MERGE step in isolation, plus the divide-and-conquer recursion
// depth. The merged output is DERIVED from the generator's top-level merge of the
// concatenated sorted lists (each half is already sorted, so the recursion's final
// merge reproduces the hand merge of the two lists).
const MS2_LEFT = [1, 4, 6, 8];
const MS2_RIGHT = [2, 3, 5, 7];
const MS2_RUN = getMergeSortStepsWithStats([...MS2_LEFT, ...MS2_RIGHT]);
const MS2_STEPS = MS2_RUN.steps;
const MS2_TOP_MERGE = MS2_STEPS.filter(
	s =>
		s.metadata &&
		s.metadata.operation === 'merge_complete' &&
		s.metadata.target[0] === 0 &&
		s.metadata.target[1] === MS2_LEFT.length + MS2_RIGHT.length - 1
);
const MS2_MERGED =
	MS2_TOP_MERGE[MS2_TOP_MERGE.length - 1].metadata.outputSnapshot;
const MS2_MERGED_STR = `[${MS2_MERGED.join(', ')}]`;
// Recursion depth (number of halving levels) for n elements = ⌈log₂ n⌉, computed
// with an explicit expression so the key is derived, not guessed.
const MS2_N = MS2_LEFT.length + MS2_RIGHT.length; // 8
const MS2_DEPTH = Math.ceil(Math.log2(MS2_N)); // ⌈log₂ 8⌉ = 3

const problemMS2 = {
	kind: 'problem',
	stem:
		`Merge sort's MERGE step combines two already-sorted runs into one. You are ` +
		`handed the sorted runs [${MS2_LEFT.join(', ')}] and [${MS2_RIGHT.join(', ')}].`,
	parts: [
		{
			kind: 'choice',
			prompt:
				'Merge the two sorted runs by repeatedly taking the smaller of the two ' +
				'front elements. What is the merged result?',
			options: [
				MS2_MERGED_STR,
				`[${[...MS2_LEFT, ...MS2_RIGHT].join(', ')}]`,
				`[${[...MS2_LEFT, ...MS2_RIGHT].sort((a, b) => b - a).join(', ')}]`,
				`[${[...MS2_RIGHT, ...MS2_LEFT].join(', ')}]`,
			],
			answer: MS2_MERGED_STR,
			explanation:
				`Taking the smaller front element each step interleaves the runs into ` +
				`${MS2_MERGED_STR}. Merging two sorted lists of total length m costs Θ(m) ` +
				'comparisons, never more than m − 1.',
		},
		{
			kind: 'numeric',
			prompt:
				`Merge sort halves the array until each piece has one element. For ` +
				`n = ${MS2_N} elements, how many halving LEVELS (the recursion depth) are ` +
				'there? (Each level halves the subproblem size.)',
			answer: MS2_DEPTH,
			placeholder: 'a depth',
			explanation:
				`Halving ${MS2_N} → 4 → 2 → 1 takes ⌈log₂ ${MS2_N}⌉ = ${MS2_DEPTH} levels. ` +
				'Each level does Θ(n) total merge work, giving the Θ(n log n) bound.',
		},
		{
			kind: 'choice',
			prompt:
				'The merge takes the LEFT element when the two fronts are EQUAL. What ' +
				'property of merge sort does this tie-breaking rule give?',
			options: [
				'Stability — equal keys keep their original relative order',
				'In-place sorting — no extra array is needed',
				'A lower comparison count',
				'Worst-case Θ(n) overall time',
			],
			answer: 'Stability — equal keys keep their original relative order',
			misconceptions: {
				'In-place sorting — no extra array is needed':
					'Standard merge sort is NOT in place; the merge writes into an ' +
					'auxiliary array. The left-on-tie rule is about stability, not space.',
			},
			explanation:
				'Preferring the left run on ties means an earlier equal element is emitted ' +
				'first, so equal keys keep their input order. That makes merge sort stable, ' +
				'which matters when sorting records by a secondary key.',
		},
	],
};

// =============================================================================
// SORTING (comparison-sort lower bound): the decision-tree argument. Any
// comparison sort is a binary decision tree whose leaves are the n! possible
// input orderings; a binary tree with L leaves has height >= ceil(log2 L), so
// the worst case needs >= ceil(log2(n!)) comparisons, i.e. Omega(n log n). For a
// fixed small n = 5 the leaf count n! and the min worst-case comparisons
// ceil(log2(n!)) are DERIVED from a tiny factorial helper (never hand-typed);
// only the WHY (n! leaves, why that is Omega(n log n), why counting/radix escape
// it) is conceptual.
// =============================================================================

// A tiny factorial so the leaf count and the log2 bound are computed, not typed.
const factorial = n => {
	let product = 1;
	for (let i = 2; i <= n; i += 1) product *= i;
	return product;
};

const SL3_N = 5;
const SL3_ORDERINGS = factorial(SL3_N); // n! leaves of the decision tree = 120
const SL3_MIN_COMPARISONS = Math.ceil(Math.log2(factorial(SL3_N))); // ⌈log₂ n!⌉ = 7

const problemSL3 = {
	kind: 'problem',
	stem:
		`Any sort that orders elements only by COMPARING pairs can be drawn as a ` +
		`binary decision tree: each internal node asks "is a < b?", and every ` +
		`possible sorted output is a leaf. Reason about the shortest such tree for ` +
		`n = ${SL3_N} elements.`,
	parts: [
		{
			kind: 'numeric',
			prompt:
				`Each distinct ordering of the ${SL3_N} inputs must reach its own leaf. ` +
				`How many leaves does the decision tree need at minimum (i.e. how many ` +
				`distinct orderings of ${SL3_N} elements are there)?`,
			answer: SL3_ORDERINGS,
			placeholder: 'a count',
			explanation:
				`There are ${SL3_N}! = ${SL3_ORDERINGS} permutations of ${SL3_N} ` +
				`distinct elements, and a correct comparison sort must be able to output ` +
				`each one, so the tree needs at least ${SL3_ORDERINGS} leaves.`,
		},
		{
			kind: 'numeric',
			prompt:
				`A binary tree with L leaves has height at least ⌈log₂ L⌉, and the ` +
				`worst-case number of comparisons is that height. With L = ` +
				`${SL3_ORDERINGS} leaves, how many comparisons must the worst case make ` +
				`at minimum?`,
			answer: SL3_MIN_COMPARISONS,
			placeholder: 'a count',
			explanation:
				`A binary tree of height h has at most 2^h leaves, so h ≥ ⌈log₂ L⌉. ` +
				`Here ⌈log₂ ${SL3_ORDERINGS}⌉ = ${SL3_MIN_COMPARISONS}, so SOME input ` +
				`forces at least ${SL3_MIN_COMPARISONS} comparisons. No comparison sort ` +
				`can beat that on every input.`,
		},
		{
			kind: 'choice',
			prompt: `Why does the decision tree have exactly n! leaves (and not fewer)?`,
			options: [
				'Each of the n! input orderings needs its own leaf, because the sort must produce a different sequence of decisions for each',
				'Because the tree is balanced, so it has n! leaves by construction',
				'Because each comparison has two outcomes, so n comparisons give n! leaves',
				'Because n! is the number of comparisons the sort performs',
			],
			answer:
				'Each of the n! input orderings needs its own leaf, because the sort must produce a different sequence of decisions for each',
			misconceptions: {
				'Because each comparison has two outcomes, so n comparisons give n! leaves':
					'Two outcomes per comparison give 2^(#comparisons) leaves, not n!. The n! comes from the INPUTS: there are n! orderings to distinguish, and that many leaves are needed; setting 2^h ≥ n! is exactly what forces the height.',
			},
			explanation:
				'A correct sort must map every one of the n! initial orderings to the ' +
				'correct output, and two different orderings can require different ' +
				'comparison outcomes, so each needs its own leaf. That is why at least ' +
				'n! leaves are required.',
		},
		{
			kind: 'choice',
			prompt:
				`From "L ≥ n! leaves" and "height ≥ ⌈log₂ L⌉", why does the worst case ` +
				`take Ω(n log n) comparisons in general (for arbitrary n)?`,
			options: [
				'Because log₂(n!) = Θ(n log n) (Stirling), so the height ⌈log₂ n!⌉ grows like n log n',
				'Because n! = Θ(n log n)',
				'Because every sort makes exactly n log n comparisons',
				'Because the tree has n levels and log n leaves',
			],
			answer:
				'Because log₂(n!) = Θ(n log n) (Stirling), so the height ⌈log₂ n!⌉ grows like n log n',
			misconceptions: {
				'Because n! = Θ(n log n)':
					'n! itself is enormous (super-exponential), not Θ(n log n). It is the LOGARITHM of n! that is Θ(n log n): log₂(n!) = Σ log₂ k = Θ(n log n) by Stirling, and that log is the tree height = worst-case comparisons.',
			},
			explanation:
				'The worst case is the tree height ≥ ⌈log₂(n!)⌉, and log₂(n!) = ' +
				'Σ_{k=1..n} log₂ k = Θ(n log n) (Stirling). So any comparison sort needs ' +
				'Ω(n log n) comparisons in the worst case, and merge sort and heapsort ' +
				'meet this bound.',
		},
		{
			kind: 'choice',
			prompt:
				`Counting sort and radix sort run in O(n) time, beating the ⌈log₂ n!⌉ ` +
				`bound. How is that possible?`,
			options: [
				'They do not compare elements to each other (they bucket by key value), so the decision-tree model and its bound do not apply',
				'They are not correct sorts, so the bound does not count',
				'They use a balanced binary tree, which lowers the height',
				'They make fewer than ⌈log₂ n!⌉ comparisons by being clever about comparisons',
			],
			answer:
				'They do not compare elements to each other (they bucket by key value), so the decision-tree model and its bound do not apply',
			misconceptions: {
				'They make fewer than ⌈log₂ n!⌉ comparisons by being clever about comparisons':
					'No comparison-based sort can beat ⌈log₂ n!⌉; that is the whole theorem. Counting and radix sort sidestep it by NOT comparing elements at all: they index into buckets by key, so they are not modelled by the decision tree.',
			},
			explanation:
				'The Ω(n log n) bound only constrains sorts whose only operation is ' +
				'comparing pairs of elements. Counting and radix sort instead use the ' +
				'keys directly as array indices (bucketing), so they are outside the ' +
				'decision-tree model and can run in O(n) for bounded-range keys.',
		},
	],
};

// =============================================================================
// STRATEGIES (greedy / divide-and-conquer / DP) — a coin-change DP table value
// and the greedy-vs-DP comparison, derived by SIMULATING buildCoinChangeFrames on
// a coin set where greedy FAILS; plus a Fibonacci DP value from climbing stairs.
// =============================================================================

// Problem P1: coins {1, 3, 4} making 6. Greedy (largest-first) takes 4 + 1 + 1 = 3
// coins; the DP optimum is 3 + 3 = 2 coins. The classic greedy counterexample.
const P1_COINS = [1, 3, 4];
const P1_TARGET = 6;
const P1_RUN = buildCoinChangeFrames({ target: P1_TARGET, coins: P1_COINS });
const P1_DP_TABLE = P1_RUN.frames[P1_RUN.frames.length - 1].dpTable; // dp[0..target]
const P1_DP_OPT = P1_RUN.summary.dpFinal; // optimal coin count for the target = 2
const P1_GREEDY = P1_RUN.summary.greedyFinal; // greedy coin count = 3
const P1_DP_AT_4 = P1_DP_TABLE[4]; // dp[4] = 1 (the single 4-coin)

// Problem P2: climbing stairs n = 6 (Fibonacci DP). ways(6) read off the table.
const P2_N = 6;
const P2_RUN = buildClimbingStairsFrames(P2_N);
const P2_DP_TABLE = P2_RUN.frames[P2_RUN.frames.length - 1].dpTable; // dp[0..n]
const P2_WAYS = P2_DP_TABLE[P2_N]; // ways(6) = 13

const problemP1 = {
	kind: 'problem',
	stem:
		`Make ${P1_TARGET}¢ using the coin denominations {${P1_COINS.join(', ')}}, with ` +
		'unlimited coins of each. Two approaches: a greedy that always takes the ' +
		'largest coin that fits, and a dynamic-programming table dp[a] = the fewest ' +
		'coins to make amount a.',
	parts: [
		{
			kind: 'numeric',
			prompt:
				`In the DP table, what is dp[4], the minimum number of coins to make 4¢ ` +
				`with {${P1_COINS.join(', ')}}?`,
			answer: P1_DP_AT_4,
			placeholder: 'a coin count',
			explanation:
				`dp[4] = ${P1_DP_AT_4}: the single coin 4 makes 4¢ directly, so one coin ` +
				'suffices. dp[a] = 1 + min over coins c of dp[a − c].',
		},
		{
			kind: 'numeric',
			prompt:
				`What is dp[${P1_TARGET}], the minimum number of coins to make ` +
				`${P1_TARGET}¢ optimally?`,
			answer: P1_DP_OPT,
			placeholder: 'a coin count',
			explanation:
				`dp[${P1_TARGET}] = ${P1_DP_OPT}, achieved by 3 + 3 (two coins). The DP ` +
				'examines every coin for every amount, so it never misses the optimum.',
		},
		{
			kind: 'numeric',
			prompt:
				`The GREEDY method takes the largest coin ≤ the remaining amount, ` +
				`repeatedly. How many coins does greedy use to make ${P1_TARGET}¢ here?`,
			answer: P1_GREEDY,
			placeholder: 'a coin count',
			explanation:
				`Greedy takes 4 (remaining 2), then 1, then 1 — that is ${P1_GREEDY} coins. ` +
				`The optimum is only ${P1_DP_OPT} (3 + 3), so greedy OVERSHOOTS here.`,
		},
		{
			kind: 'choice',
			prompt:
				`On coins {${P1_COINS.join(', ')}} making ${P1_TARGET}¢, greedy used ` +
				`${P1_GREEDY} coins but the optimum is ${P1_DP_OPT}. What does this ` +
				'counterexample show?',
			options: [
				'Greedy coin change is not optimal for arbitrary coin sets; only some (canonical) systems make it optimal',
				'Greedy is always optimal; the DP must be wrong',
				'The problem has no optimal solution',
				'DP and greedy always agree on coin change',
			],
			answer:
				'Greedy coin change is not optimal for arbitrary coin sets; only some (canonical) systems make it optimal',
			misconceptions: {
				'DP and greedy always agree on coin change':
					`They agree on canonical systems (like {1, 5, 10, 25}) but not here: on ` +
					`{${P1_COINS.join(', ')}} greedy commits to the 4 and needs ${P1_GREEDY} ` +
					`coins, while DP finds ${P1_DP_OPT}.`,
			},
			explanation:
				'Taking the biggest coin first can strand you with an expensive ' +
				'remainder. DP considers every option for every sub-amount, so it is ' +
				'always optimal; greedy is optimal only for special (canonical) coin sets.',
		},
	],
};

const problemP2 = {
	kind: 'problem',
	stem:
		`Climbing stairs: you may take 1 or 2 steps at a time. The number of distinct ` +
		`ways to reach stair n satisfies ways(n) = ways(n−1) + ways(n−2), with ` +
		'ways(0) = ways(1) = 1. This is divide-and-conquer with OVERLAPPING ' +
		'subproblems, so DP (memoize each ways(k) once) replaces exponential ' +
		'recursion.',
	parts: [
		{
			kind: 'numeric',
			prompt:
				'Filling the table bottom-up, what is ways(4), the number of ways to ' +
				'climb 4 stairs?',
			answer: P2_DP_TABLE[4],
			placeholder: 'a count',
			explanation:
				`ways(4) = ways(3) + ways(2) = ${P2_DP_TABLE[3]} + ${P2_DP_TABLE[2]} = ` +
				`${P2_DP_TABLE[4]}. Each entry sums the two below it (a Fibonacci sequence).`,
		},
		{
			kind: 'numeric',
			prompt: `What is ways(${P2_N})?`,
			answer: P2_WAYS,
			placeholder: 'a count',
			explanation:
				`ways(${P2_N}) = ways(${P2_N - 1}) + ways(${P2_N - 2}) = ` +
				`${P2_DP_TABLE[P2_N - 1]} + ${P2_DP_TABLE[P2_N - 2]} = ${P2_WAYS}. The DP ` +
				`table dp[0..${P2_N}] is [${P2_DP_TABLE.join(', ')}].`,
		},
		{
			kind: 'choice',
			prompt:
				'Naive recursion for ways(n) recomputes the same ways(k) many times. Why ' +
				'does memoization (DP) make it efficient?',
			options: [
				'Each subproblem ways(k) is computed once and cached, turning exponential recomputation into Θ(n) work',
				'Memoization changes the recurrence to a faster one',
				'It avoids the base cases entirely',
				'It sorts the subproblems before solving them',
			],
			answer:
				'Each subproblem ways(k) is computed once and cached, turning exponential recomputation into Θ(n) work',
			misconceptions: {
				'Memoization changes the recurrence to a faster one':
					'The recurrence is unchanged. Memoization just stores each ways(k) the ' +
					'first time it is computed, so the naive tree of repeated calls collapses ' +
					'to n distinct subproblems solved once each.',
			},
			explanation:
				'There are only n + 1 distinct subproblems ways(0..n). Solving each once ' +
				'and reusing the stored value makes the whole computation Θ(n) instead of ' +
				'the exponential blow-up of recomputing shared subproblems.',
		},
	],
};

// =============================================================================
// STRATEGIES — activity selection (the greedy that IS optimal). Where greedy
// coin change (strategies-1) could be beaten by DP, the earliest-finish-first
// greedy here is provably optimal. Which activity is picked first, the maximum
// number of compatible activities, and the full selected set are all derived by
// SIMULATING activitySelect on a fixed instance with real overlaps; only the WHY
// (the exchange / greedy-stays-ahead argument, and the contrast with coin change)
// is conceptual.
// =============================================================================

// Problem P3: nine activities [start, finish) with genuine overlaps. A3 = [0, 6)
// is a long early decoy (it is BOTH the earliest-starting and the longest
// activity), exactly the kind of interval a naive instinct grabs; the optimal
// greedy ignores it. activitySelect sorts by finish, takes the earliest-finishing
// activity, then each later one whose start >= the last finish. Selected set is
// {A1, A4, A8, A9} (size 4); the first activity chosen is A1 (earliest finish, 4).
const P3_ACTIVITIES = [
	{ id: 'A1', start: 1, finish: 4 },
	{ id: 'A2', start: 3, finish: 5 },
	{ id: 'A3', start: 0, finish: 6 },
	{ id: 'A4', start: 4, finish: 7 },
	{ id: 'A5', start: 3, finish: 8 },
	{ id: 'A6', start: 5, finish: 9 },
	{ id: 'A7', start: 6, finish: 10 },
	{ id: 'A8', start: 8, finish: 11 },
	{ id: 'A9', start: 11, finish: 13 },
];
const P3_RUN = activitySelect(P3_ACTIVITIES);
const P3_FIRST = P3_RUN.selectedIds[0]; // earliest finish => 'A1'
const P3_COUNT = P3_RUN.count; // maximum compatible activities => 4
const P3_SELECTED_STR = `{${P3_RUN.selectedIds.join(', ')}}`; // '{A1, A4, A8, A9}'
// A few plausible-but-wrong full-set strings for the choice distractors.
const P3_ALL_STR = `{${P3_ACTIVITIES.map(a => a.id).join(', ')}}`;
const P3_EARLY_START_SET_STR = '{A3, A8, A9}'; // greedily taking the long decoy A3
const P3_NONOPT_SET_STR = '{A1, A2, A4, A8, A9}'; // A1 and A2 overlap — illegal

const problemP3 = {
	kind: 'problem',
	stem:
		`Activity selection. Nine activities want one shared resource (one room, one ` +
		`processor); each is a half-open interval [start, finish), so an activity ` +
		`finishing at t and one starting at t do NOT clash. Choose the LARGEST set ` +
		`with no two overlapping. The greedy: sort by finish time, take the activity ` +
		`that finishes earliest, then repeatedly take the next activity whose start ` +
		`is at or after the last chosen finish.\n\n` +
		P3_ACTIVITIES.map(a => `    ${a.id}: [${a.start}, ${a.finish})`).join('\n'),
	parts: [
		{
			kind: 'choice',
			prompt:
				`The greedy commits to one activity before looking at any other. Which ` +
				`activity does it pick FIRST?`,
			options: [P3_FIRST, 'A3', 'A2', 'A9'],
			answer: P3_FIRST,
			misconceptions: {
				A3:
					`A3 = [0, 6) starts earliest AND is the longest, which is exactly why a ` +
					`naive choice grabs it. But it finishes late (6) and blocks A1, A2 and ` +
					`A4 at once. The greedy sorts by FINISH, so it takes A1 (finishes at 4).`,
				A2:
					`A2 finishes at 5, but A1 finishes earlier, at 4. Earliest-finish-first ` +
					`takes A1.`,
			},
			explanation:
				`Sorted by finish time, A1 = [1, 4) finishes first, so the greedy takes ` +
				`it. Choosing the activity that frees the resource soonest leaves the most ` +
				`time for everything after it.`,
		},
		{
			kind: 'numeric',
			prompt:
				`Running the greedy to the end, what is the MAXIMUM number of mutually ` +
				`compatible activities you can schedule?`,
			answer: P3_COUNT,
			placeholder: 'a count',
			explanation:
				`The greedy takes A1 [1,4), then A4 [4,7) (starts at 4 >= 4), then A8 ` +
				`[8,11) (8 >= 7), then A9 [11,13) (11 >= 11): ${P3_COUNT} activities. No ` +
				`compatible set is larger, because earliest-finish-first is optimal.`,
		},
		{
			kind: 'choice',
			prompt: `Which set of activities does the greedy actually select?`,
			options: [
				P3_SELECTED_STR,
				P3_EARLY_START_SET_STR,
				P3_NONOPT_SET_STR,
				P3_ALL_STR,
			],
			answer: P3_SELECTED_STR,
			misconceptions: {
				[P3_NONOPT_SET_STR]:
					`A1 = [1, 4) and A2 = [3, 5) overlap (A2 starts at 3, before A1 finishes ` +
					`at 4), so they cannot both be chosen. A compatible set never contains ` +
					`two overlapping activities.`,
				[P3_ALL_STR]:
					`These all overlap one another; "compatible" means NO two overlap, so ` +
					`you cannot keep them all. The largest compatible subset has just ` +
					`${P3_COUNT}.`,
			},
			explanation:
				`Taking the earliest finish each time gives A1 -> A4 -> A8 -> A9, i.e. ` +
				`${P3_SELECTED_STR}. Each starts at or after the previous one finishes, so ` +
				`the set is compatible and (by the exchange argument) maximum.`,
		},
		{
			kind: 'choice',
			prompt:
				`WHY is earliest-finish-first guaranteed optimal here, when greedy coin ` +
				`change (strategies-1) could be beaten by DP?`,
			options: [
				'An exchange argument: swapping the optimal solution’s first activity for the earliest-finishing one keeps it valid and no smaller, so the greedy choice is always safe (it "stays ahead")',
				'Because the activities were already sorted, so any greedy works',
				'Because activity selection has no overlapping subproblems',
				'Because there are fewer activities than coins, so greedy cannot fail',
			],
			answer:
				'An exchange argument: swapping the optimal solution’s first activity for the earliest-finishing one keeps it valid and no smaller, so the greedy choice is always safe (it "stays ahead")',
			misconceptions: {
				'Because the activities were already sorted, so any greedy works':
					`Sorting is just step one. What makes THIS greedy optimal is the ` +
					`exchange argument: the earliest-finishing activity can always replace ` +
					`the first activity of any optimal schedule without losing anything. ` +
					`Coin change has no such safe swap, so its greedy can be beaten.`,
			},
			explanation:
				`Activity selection has the greedy-choice property: any optimal schedule ` +
				`can be modified to start with the earliest-finishing activity (swap it in ` +
				`- it frees the resource at least as soon), so a greedy that always takes ` +
				`it stays ahead of every alternative. Coin change lacks this property: ` +
				`taking the biggest coin can strand an expensive remainder, which is why ` +
				`its greedy is optimal only for special (canonical) coin systems.`,
		},
	],
};

// =============================================================================
// NP-COMPLETENESS — conceptual classification (P / NP / NP-hard / NP-complete),
// the reduction DIRECTION for proving NP-hardness, and the verifier-in-polynomial-
// time definition of NP. All 'choice'/'classify' with unambiguous correct options.
// =============================================================================

const problemNP1 = {
	kind: 'problem',
	stem:
		'Place four decision problems in their tightest standard complexity class. ' +
		'Recall: P = solvable in polynomial time; NP = a YES-certificate is ' +
		'checkable in polynomial time; NP-hard = at least as hard as every problem ' +
		'in NP; NP-complete = in NP AND NP-hard.',
	parts: [
		{
			kind: 'classify',
			prompt:
				'Classify each problem. (SAT and HALTING are the textbook landmarks; ' +
				'SORTING is the easy baseline.)',
			items: [
				{ id: 'sorting', label: 'Sorting n numbers' },
				{ id: 'sat', label: 'Boolean satisfiability (SAT)' },
				{ id: 'halting', label: 'The halting problem' },
				{ id: 'tsp', label: 'Travelling-salesman decision (tour ≤ B?)' },
			],
			categories: [
				{ id: 'p', label: 'In P (polynomial-time solvable)' },
				{ id: 'npc', label: 'NP-complete' },
				{ id: 'undecidable', label: 'Undecidable (not even computable)' },
			],
			answer: {
				sorting: 'p',
				sat: 'npc',
				halting: 'undecidable',
				tsp: 'npc',
			},
			explanation:
				'Sorting runs in O(n log n), so it is in P. SAT (Cook-Levin) and the ' +
				'TSP decision problem are NP-complete: in NP and NP-hard. The halting ' +
				'problem is undecidable, harder still — no algorithm decides it at all.',
		},
		{
			kind: 'choice',
			prompt: 'What is NP-complete, precisely?',
			options: [
				'A problem that is BOTH in NP AND NP-hard',
				'Any problem that takes exponential time',
				'A problem in P that also happens to be in NP',
				'A problem that is NP-hard but provably not in NP',
			],
			answer: 'A problem that is BOTH in NP AND NP-hard',
			misconceptions: {
				'Any problem that takes exponential time':
					'NP-complete is about membership in NP plus NP-hardness, not a raw ' +
					'running time. Some NP-hard problems (like halting) are not in NP at ' +
					'all, so they are not NP-complete.',
			},
			explanation:
				'NP-complete = in NP (a certificate is poly-time checkable) AND NP-hard ' +
				'(everything in NP reduces to it). They are the hardest problems IN NP; if ' +
				'any one is in P then P = NP.',
		},
		{
			kind: 'choice',
			prompt:
				'NP is defined by what a VERIFIER can do. Which statement captures the ' +
				'definition of NP?',
			options: [
				'A problem is in NP if a given YES-certificate can be CHECKED in polynomial time',
				'A problem is in NP if it can be SOLVED in polynomial time',
				'A problem is in NP if it can be solved in nondeterministic exponential time',
				'A problem is in NP if no polynomial-time algorithm can exist for it',
			],
			answer:
				'A problem is in NP if a given YES-certificate can be CHECKED in polynomial time',
			misconceptions: {
				'A problem is in NP if it can be SOLVED in polynomial time':
					'That defines P. NP is about VERIFYING a proposed solution quickly, not ' +
					'finding one. P ⊆ NP, but the open question is whether the inclusion is ' +
					'strict.',
			},
			explanation:
				'NP = problems whose YES-instances have a short certificate verifiable in ' +
				'polynomial time. Finding the certificate may need exponential search; the ' +
				'definition only requires that CHECKING one is fast.',
		},
	],
};

const problemNP2 = {
	kind: 'problem',
	stem:
		'Reductions prove hardness, and the DIRECTION matters. To prove a target ' +
		'problem B is NP-hard, you reduce a KNOWN NP-hard problem A to B (written ' +
		'A ≤p B): an instance of A is transformed, in polynomial time, into an ' +
		'equivalent instance of B.',
	parts: [
		{
			kind: 'choice',
			prompt:
				'You want to prove that INDEPENDENT-SET is NP-hard. You already know ' +
				'3-SAT is NP-hard. Which reduction do you build?',
			options: [
				'Reduce 3-SAT to INDEPENDENT-SET (3-SAT ≤p INDEPENDENT-SET)',
				'Reduce INDEPENDENT-SET to 3-SAT (INDEPENDENT-SET ≤p 3-SAT)',
				'Reduce INDEPENDENT-SET to a problem in P',
				'Either direction proves NP-hardness equally',
			],
			answer: 'Reduce 3-SAT to INDEPENDENT-SET (3-SAT ≤p INDEPENDENT-SET)',
			misconceptions: {
				'Reduce INDEPENDENT-SET to 3-SAT (INDEPENDENT-SET ≤p 3-SAT)':
					'That direction only shows INDEPENDENT-SET is no harder than 3-SAT (an ' +
					'upper bound). To prove it is HARD you must map the KNOWN-hard problem ' +
					'INTO it: 3-SAT ≤p INDEPENDENT-SET.',
			},
			explanation:
				'To prove B is NP-hard you reduce a known-hard A INTO B (A ≤p B), so a ' +
				'fast solver for B would solve A too. The classic 3-SAT ≤p INDEPENDENT-SET ' +
				'clause-gadget construction does exactly this.',
		},
		{
			kind: 'choice',
			prompt:
				'A reduction A ≤p B used for hardness proofs must satisfy two properties. ' +
				'Which pair is required?',
			options: [
				'It runs in polynomial time, and it preserves the answer (YES maps to YES, NO maps to NO)',
				'It runs in polynomial time, and it makes the instance smaller',
				'It can take exponential time as long as the answer is preserved',
				'It only needs to map YES instances of A to YES instances of B',
			],
			answer:
				'It runs in polynomial time, and it preserves the answer (YES maps to YES, NO maps to NO)',
			explanation:
				'A polynomial-time many-one reduction transforms instances in poly time ' +
				'AND is answer-preserving in both directions, so B’s answer reveals A’s. ' +
				'Without poly time the reduction proves nothing about polynomial hardness.',
		},
		{
			kind: 'choice',
			prompt:
				'Suppose someone exhibits a polynomial-time algorithm for ONE ' +
				'NP-complete problem. What follows?',
			options: [
				'P = NP — every problem in NP is then solvable in polynomial time',
				'Only that one problem becomes easy; the rest are unaffected',
				'The halting problem becomes decidable',
				'Nothing follows without checking each problem separately',
			],
			answer:
				'P = NP — every problem in NP is then solvable in polynomial time',
			misconceptions: {
				'Only that one problem becomes easy; the rest are unaffected':
					'Every NP problem reduces to any NP-complete problem in poly time, so a ' +
					'poly-time algorithm for one gives a poly-time algorithm for all of NP. ' +
					'That is the whole point of completeness.',
			},
			explanation:
				'Because every NP problem reduces to an NP-complete one in polynomial ' +
				'time, solving any single NP-complete problem in P collapses P and NP into ' +
				'the same class.',
		},
	],
};

// =============================================================================
// THE EXAM SET REGISTRY
// =============================================================================
//
// Each set bundles ~2 derived problems for one topic. `topicId` matches a
// curriculum id so ExamPage can resolve the topic name/accent; `topicName` is a
// display fallback. The exam page groups sets by topic and scores by topic.

// =============================================================================
// QUICKSORT (Lomuto partition, pivot = last) — the partition pass + recursion,
// and the worst case. The pivot's final index, the array after the first
// partition, the recursion sub-array, and the comparison counts are all read off
// getQuickSortFrames (never hand-typed); only the asymptotic recurrence-result
// and the practical-fix choices are conceptual.
// =============================================================================

const QS1_INPUT = [7, 2, 9, 4, 1, 8, 5, 6];
const QS1_RUN = getQuickSortFrames(QS1_INPUT);
const QS1_PIVOT = QS1_INPUT[QS1_INPUT.length - 1]; // Lomuto pivot = last element
const QS1_FIRST_PLACE = QS1_RUN.frames.find(
	f =>
		f.phase === 'place' &&
		f.range &&
		f.range[0] === 0 &&
		f.range[1] === QS1_INPUT.length - 1
);
const QS1_PIVOT_INDEX = QS1_FIRST_PLACE.pivotIndex;
const QS1_AFTER = QS1_FIRST_PLACE.array;
const QS1_AFTER_STR = `[${QS1_AFTER.join(', ')}]`;
const QS1_LEFT_STR = `[${QS1_AFTER.slice(0, QS1_PIVOT_INDEX).join(', ')}]`;
const QS1_RIGHT_STR = `[${QS1_AFTER.slice(QS1_PIVOT_INDEX + 1).join(', ')}]`;
const QS1_SORTED_STR = `[${QS1_RUN.sorted.join(', ')}]`;

const problemQS1 = {
	kind: 'problem',
	stem:
		`Quicksort with Lomuto partition (pivot = the LAST element). Partition the ` +
		`array [${QS1_INPUT.join(', ')}] around its pivot ${QS1_PIVOT}, then recurse ` +
		`on each side.`,
	parts: [
		{
			kind: 'numeric',
			prompt:
				`The pivot is the last element, ${QS1_PIVOT}. After one partition pass, ` +
				`at which 0-based index does ${QS1_PIVOT} come to rest (its final sorted ` +
				`position)?`,
			answer: QS1_PIVOT_INDEX,
			placeholder: 'an index',
			explanation:
				`Lomuto sweeps a pointer across the array, pulling every value less than ` +
				`${QS1_PIVOT} to the left, then swaps the pivot just past them. ` +
				`${QS1_PIVOT_INDEX} values are smaller, so ${QS1_PIVOT} lands at index ` +
				`${QS1_PIVOT_INDEX}, and it never moves again.`,
		},
		{
			kind: 'choice',
			prompt: `What does the array look like immediately after that first partition?`,
			options: [
				QS1_AFTER_STR,
				QS1_SORTED_STR,
				`[${QS1_INPUT.join(', ')}]`,
				`[${[...QS1_INPUT].sort((a, b) => b - a).join(', ')}]`,
			],
			answer: QS1_AFTER_STR,
			misconceptions: {
				[QS1_SORTED_STR]:
					`That is the FULLY sorted array. One partition only places the pivot ` +
					`and splits the rest into "less than" and "greater than"; the two sides ` +
					`are not sorted yet.`,
			},
			explanation:
				`After partitioning, everything left of index ${QS1_PIVOT_INDEX} is less ` +
				`than ${QS1_PIVOT} and everything right is greater, but neither side is ` +
				`sorted yet: ${QS1_AFTER_STR}.`,
		},
		{
			kind: 'choice',
			prompt:
				`Partition leaves ${QS1_PIVOT} home and splits the rest into two ranges ` +
				`to recurse on. Which values form the LEFT sub-array the next recursive ` +
				`call sorts?`,
			options: [
				QS1_LEFT_STR,
				QS1_RIGHT_STR,
				`[${QS1_AFTER.slice(0, QS1_PIVOT_INDEX + 1).join(', ')}]`,
				QS1_AFTER_STR,
			],
			answer: QS1_LEFT_STR,
			explanation:
				`The left sub-array is everything before the pivot's resting index ` +
				`${QS1_PIVOT_INDEX}: ${QS1_LEFT_STR}. Quicksort sorts it and the right ` +
				`side ${QS1_RIGHT_STR} independently; the pivot itself is already done.`,
		},
		{
			kind: 'numeric',
			prompt:
				`How many element-to-element COMPARISONS does the FULL quicksort make on ` +
				`this array? (Count each "is this element < the current pivot?" test.)`,
			answer: QS1_RUN.comparisons,
			placeholder: 'a count',
			explanation:
				`Summed across every partition pass, this run makes ` +
				`${QS1_RUN.comparisons} comparisons. With reasonably balanced pivots ` +
				`quicksort is Θ(n log n) on average.`,
		},
	],
};

// QUICKSORT worst case: on an already-sorted array the last-element pivot is
// always the maximum, so each partition splits n into n-1 and 0 (the n(n-1)/2
// comparison disaster). The count is derived; the recurrence-result and the fix
// are conceptual choices.
const QS2_SORTED = [1, 2, 3, 4, 5, 6];
const QS2_WC_COMPARISONS = getQuickSortFrames(QS2_SORTED).comparisons;

const problemQS2 = {
	kind: 'problem',
	stem:
		`Quicksort's running time is decided entirely by how BALANCED its partitions ` +
		`are. Look at the case that goes wrong.`,
	parts: [
		{
			kind: 'numeric',
			prompt:
				`Run Lomuto quicksort (pivot = last) on the already-sorted array ` +
				`[${QS2_SORTED.join(', ')}]. How many element comparisons does it make?`,
			answer: QS2_WC_COMPARISONS,
			placeholder: 'a count',
			explanation:
				`On sorted input the last element is always the largest, so every ` +
				`partition puts the pivot at the end and recurses on the other n-1 ` +
				`elements: (n-1) + (n-2) + ... + 1 = n(n-1)/2 = ${QS2_WC_COMPARISONS} for ` +
				`n = ${QS2_SORTED.length}. That is the Θ(n²) worst case.`,
		},
		{
			kind: 'choice',
			prompt:
				`That worst case splits n into n-1 and 0 every time, giving the ` +
				`recurrence T(n) = T(n-1) + Θ(n). What does it solve to?`,
			options: ['Θ(n²)', 'Θ(n log n)', 'Θ(n)', 'Θ(n³)'],
			answer: 'Θ(n²)',
			misconceptions: {
				'Θ(n log n)':
					`Θ(n log n) is the BALANCED case, where each split is about n/2. The ` +
					`sorted-input worst case peels off one element at a time, so the work ` +
					`is n + (n-1) + ... = Θ(n²).`,
			},
			explanation:
				`Unrolling T(n) = T(n-1) + Θ(n) gives Θ(n) + Θ(n-1) + ... + Θ(1) = Θ(n²). ` +
				`This is why a naive last-element pivot is dangerous on nearly-sorted data.`,
		},
		{
			kind: 'choice',
			prompt:
				`Which simple change makes that Θ(n²) worst case vanishingly unlikely in ` +
				`practice?`,
			options: [
				'Choose the pivot at random (or median-of-three)',
				'Always pick the first element as the pivot',
				'Sort the array before partitioning',
				'Use a bigger array',
			],
			answer: 'Choose the pivot at random (or median-of-three)',
			explanation:
				`A random (or median-of-three) pivot makes a badly unbalanced split ` +
				`extremely unlikely, so quicksort runs in its Θ(n log n) average case on ` +
				`any input, including already-sorted data.`,
		},
	],
};

// =============================================================================
// TREES (BST) — deleting a TWO-CHILD node. Insert builds a fixed BST; deleting
// the root (two children) splices in its in-order successor. The successor lives
// two left-steps down the right subtree and carries its own right child up, so
// the re-thread is real. The successor, the in-order sequence after deletion,
// and the pre-order after deletion are all read off the tree generators (never
// hand-typed); only WHY the successor preserves the BST property is conceptual.
// =============================================================================

const B2_INSERT = [60, 30, 90, 20, 45, 80, 100, 70, 75];
const B2_ROOT = buildBst(B2_INSERT);
const B2_INORDER = inorderValues(B2_ROOT); // ascending by the BST invariant
// Delete the ROOT (two children); its in-order successor moves up.
const B2_DELETE = B2_ROOT.value; // 60
const B2_SUCCESSOR = B2_INORDER[B2_INORDER.indexOf(B2_DELETE) + 1]; // 70
const B2_PREDECESSOR = B2_INORDER[B2_INORDER.indexOf(B2_DELETE) - 1]; // 45 (distractor)
const B2_AFTER_DEL = deleteValue(B2_ROOT, B2_DELETE);
const B2_AFTER_INORDER = inorderValues(B2_AFTER_DEL);
// Final value of a traversal = the `output` of its last step.
const B2_AFTER_PRE = (() => {
	const steps = getTraversalSteps(B2_AFTER_DEL, 'preorder');
	return steps[steps.length - 1].output.map(Number);
})();
const B2_AFTER_POST = (() => {
	const steps = getTraversalSteps(B2_AFTER_DEL, 'postorder');
	return steps[steps.length - 1].output.map(Number);
})();
const B2_REMOVES_TARGET = !containsValue(B2_AFTER_DEL, B2_DELETE);
const B2_AFTER_PRE_STR = `[${B2_AFTER_PRE.join(', ')}]`;
const B2_AFTER_POST_STR = `[${B2_AFTER_POST.join(', ')}]`;
const B2_BEFORE_PRE_STR = `[${(() => {
	const steps = getTraversalSteps(B2_ROOT, 'preorder');
	return steps[steps.length - 1].output;
})().join(', ')}]`;

const problemB2 = {
	kind: 'problem',
	stem:
		`Insert the keys ${B2_INSERT.join(', ')} into an initially empty binary ` +
		`search tree, in that order. Then DELETE the root key ${B2_DELETE}. Because ` +
		`${B2_DELETE} has two children, it is replaced by its in-order successor: the ` +
		`smallest key in its right subtree.`,
	parts: [
		{
			kind: 'numeric',
			prompt:
				`Which key moves up to replace ${B2_DELETE}? (Find the minimum of ` +
				`${B2_DELETE}'s right subtree — keep stepping left from the right child.)`,
			answer: B2_SUCCESSOR,
			placeholder: 'a key',
			explanation:
				`The in-order successor is the smallest key larger than ${B2_DELETE}, ` +
				`i.e. the minimum of the right subtree. Stepping left from the right child ` +
				`reaches ${B2_SUCCESSOR}, so ${B2_SUCCESSOR} takes the root's place. ` +
				`${B2_SUCCESSOR}'s own right child is re-attached where ${B2_SUCCESSOR} ` +
				`used to sit, so no keys are lost.`,
		},
		{
			kind: 'choice',
			prompt:
				`Splicing the successor in keeps the tree a valid BST. WHY does using the ` +
				`in-order successor preserve the search-tree ordering?`,
			options: [
				`It is larger than everything in the left subtree and smaller than the ` +
					`rest of the right subtree, so it fits the deleted node's slot exactly`,
				`It is the largest key in the whole tree, so it belongs at the root`,
				`It is a leaf, so moving it can never violate any ordering`,
				`Any key from the right subtree works; the successor is just convenient`,
			],
			answer:
				`It is larger than everything in the left subtree and smaller than the ` +
				`rest of the right subtree, so it fits the deleted node's slot exactly`,
			misconceptions: {
				[`It is a leaf, so moving it can never violate any ordering`]:
					`The successor is the LEFTMOST node of the right subtree, but it can ` +
					`still have a right child (here ${B2_SUCCESSOR} has one). It is not ` +
					`necessarily a leaf; what matters is that no key sits between it and the ` +
					`deleted key.`,
				[`Any key from the right subtree works; the successor is just convenient`]:
					`Only the successor (or the predecessor) fits. A larger key from the ` +
					`right subtree would end up smaller than some key now in its left ` +
					`subtree, breaking the BST ordering.`,
			},
			explanation:
				`The successor is the smallest key greater than ${B2_DELETE}, so nothing ` +
				`lies strictly between them. Dropping it into the deleted slot keeps every ` +
				`left-subtree key below it and every remaining right-subtree key above it — ` +
				`exactly the BST invariant. The predecessor (here ${B2_PREDECESSOR}) works ` +
				`for the mirror-image reason.`,
		},
		{
			kind: 'order',
			prompt:
				`After deleting ${B2_DELETE}, list the remaining keys in IN-ORDER ` +
				`sequence. Drag them into that order.`,
			items: [...B2_AFTER_INORDER].sort((a, b) => b - a).map(String),
			answer: B2_AFTER_INORDER.map(String),
			explanation:
				`${B2_DELETE} is gone and ${B2_SUCCESSOR} fills its slot, so an in-order ` +
				`walk still yields ascending keys: ${B2_AFTER_INORDER.join(', ')} — sorted ` +
				`and without ${B2_DELETE} (removed: ${B2_REMOVES_TARGET}).`,
		},
		{
			kind: 'choice',
			prompt:
				`A PRE-ORDER traversal (visit node, then left subtree, then right subtree) ` +
				`of the tree AFTER the deletion reads which sequence?`,
			options: [
				B2_AFTER_PRE_STR,
				B2_BEFORE_PRE_STR,
				B2_AFTER_POST_STR,
				`[${B2_AFTER_INORDER.join(', ')}]`,
			],
			answer: B2_AFTER_PRE_STR,
			misconceptions: {
				[B2_BEFORE_PRE_STR]:
					`That is the pre-order of the tree BEFORE the deletion (it still starts ` +
					`at ${B2_DELETE}). After deleting the root, ${B2_SUCCESSOR} is the new ` +
					`root, so pre-order starts at ${B2_SUCCESSOR}.`,
				[`[${B2_AFTER_INORDER.join(', ')}]`]:
					`That is the IN-ORDER sequence (ascending). Pre-order visits the root ` +
					`first, so it starts at the new root ${B2_SUCCESSOR}, not the smallest ` +
					`key.`,
			},
			explanation:
				`With ${B2_SUCCESSOR} now the root, pre-order visits ${B2_SUCCESSOR} first, ` +
				`then its left subtree, then its right subtree: ${B2_AFTER_PRE_STR}.`,
		},
	],
};

// =============================================================================
// ALL-PAIRS SHORTEST PATHS #2 (apsp-2) - the Floyd-Warshall DP RECURRENCE and
// its per-k intermediate matrices. apsp-1 grades a final row + one k=1 cell that
// does NOT improve; apsp-2 is the complementary angle: it watches a cell ACTUALLY
// drop as the recurrence fires. Distinct 5-vertex digraph. Every numeric answer
// is read straight off floydWarshall's `layers[k]` (D after allowing {1..k}) and
// final `dist`; only the transitive-closure analogue is conceptual.
//
// Recurrence: d_k[i][j] = min( d_{k-1}[i][j], d_{k-1}[i][k] + d_{k-1}[k][j] ).
// =============================================================================

// Directed, weighted, vertices 1..5. Chosen so several pairs only shorten once a
// specific intermediate is admitted, so the intermediate matrices tell a story:
//   d[1][3]: 11 (direct) → 6 once vertex 2 is allowed (1 → 2 → 3 = 4 + 2).
//   d[2][4]: 7  (direct) → 3 once vertex 3 is allowed (2 → 3 → 4 = 2 + 1).
//   d[1][5]: ∞ (no edge) → 10 finally (1 → 2 → 3 → 4 → 5 = 4 + 2 + 1 + 3).
const A2_GRAPH = {
	nodes: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }],
	edges: [
		{ from: '1', to: '2', weight: 4 },
		{ from: '1', to: '3', weight: 11 },
		{ from: '2', to: '3', weight: 2 },
		{ from: '2', to: '4', weight: 7 },
		{ from: '3', to: '4', weight: 1 },
		{ from: '3', to: '5', weight: 5 },
		{ from: '4', to: '5', weight: 3 },
		{ from: '5', to: '1', weight: 6 },
		{ from: '4', to: '1', weight: 2 },
	],
};
const A2_FW = floydWarshall(A2_GRAPH);
const A2_IDS = A2_FW.ids; // ['1','2','3','4','5']
const A2_IX = id => A2_IDS.indexOf(id);

// layers[k] = D after allowing intermediates {1..k}. layers[2] allows {1, 2}.
// d[1][3] after the k = 2 round: routing 1 → 2 → 3 (4 + 2 = 6) now beats the
// direct edge 11, so the recurrence writes 6.
const A2_LAYER2 = A2_FW.layers[2];
const A2_L2_13 = distVal(A2_LAYER2[A2_IX('1')][A2_IX('3')]); // 6

// Which intermediate, when first admitted, lowers d[2][4]? Scan the layers for
// the first k where the cell changes from the previous layer; layer k is the
// round that admitted vertex A2_IDS[k - 1]. d[2][4] is 7 through {1, 2} and only
// drops to 3 once vertex 3 is allowed (2 → 3 → 4 = 2 + 1).
const A2_FIRST_IMPROVE = (fromId, toId) => {
	const i = A2_IX(fromId);
	const j = A2_IX(toId);
	for (let k = 1; k < A2_FW.layers.length; k++) {
		const prev = A2_FW.layers[k - 1][i][j];
		const cur = A2_FW.layers[k][i][j];
		if (JSON.stringify(prev) !== JSON.stringify(cur)) return A2_IDS[k - 1];
	}
	return null;
};
const A2_FIRST_24 = A2_FIRST_IMPROVE('2', '4'); // '3'

// Final shortest distance for a pair with NO direct edge: 1 → 5 is built up
// entirely from intermediates (1 → 2 → 3 → 4 → 5 = 4 + 2 + 1 + 3 = 10).
const A2_D15 = distVal(A2_FW.dist[A2_IX('1')][A2_IX('5')]); // 10

const problemA2 = {
	kind: 'problem',
	stem:
		'Directed weighted graph on vertices 1, 2, 3, 4, 5 with edges ' +
		'1→2(4), 1→3(11), 2→3(2), 2→4(7), 3→4(1), 3→5(5), 4→5(3), 4→1(2), 5→1(6). ' +
		'Run Floyd-Warshall and watch the intermediate matrices: d_k[i][j] = ' +
		'min(d_{k−1}[i][j], d_{k−1}[i][k] + d_{k−1}[k][j]) lets a path route through ' +
		'vertex k once round k admits it.',
	parts: [
		{
			kind: 'numeric',
			prompt:
				'After the k = 2 round (intermediates restricted to {1, 2}), what is ' +
				'd[1][3]? Apply the recurrence: is going 1 → 2 → 3 shorter than the ' +
				'direct edge 1→3 of weight 11?',
			answer: A2_L2_13,
			placeholder: 'a distance',
			explanation:
				`d[1][3] = ${A2_L2_13}. The recurrence compares the old value 11 with ` +
				`d[1][2] + d[2][3] = 4 + 2 = ${A2_L2_13}, so vertex 2 as an intermediate ` +
				`wins: 1 → 2 → 3. This is already the final value; no later vertex beats it.`,
		},
		{
			kind: 'choice',
			prompt:
				'Track d[2][4] as k grows. The direct edge 2→4 is 7. Admitting which ' +
				'vertex k as an intermediate is the FIRST to lower d[2][4] below 7?',
			options: [
				`Vertex ${A2_FIRST_24}`,
				'Vertex 4',
				'Vertex 1',
				'It never drops below 7',
			],
			answer: `Vertex ${A2_FIRST_24}`,
			misconceptions: {
				'Vertex 4':
					'Vertex 4 is the DESTINATION, not an intermediate on the way to it. ' +
					'A path i → 4 → 4 is meaningless; admitting vertex 4 leaves d[2][4] ' +
					'unchanged. The improvement comes from vertex 3: 2 → 3 → 4 = 2 + 1 = 3.',
			},
			explanation:
				`Vertex ${A2_FIRST_24}. Through {1, 2} the only 2→4 route is the direct ` +
				`edge (7). Once vertex 3 is admitted the recurrence finds ` +
				`d[2][3] + d[3][4] = 2 + 1 = 3 < 7, so d[2][4] drops to 3.`,
		},
		{
			kind: 'numeric',
			prompt:
				'In the FINAL distance matrix (all intermediates allowed), what is ' +
				'd[1][5], the shortest distance from vertex 1 to vertex 5? There is no ' +
				'direct 1→5 edge, so it must be assembled from intermediates.',
			answer: A2_D15,
			placeholder: 'a distance',
			explanation:
				`d[1][5] = ${A2_D15}, along 1 → 2 → 3 → 4 → 5 (4 + 2 + 1 + 3). Other ` +
				`routes are longer: 1 → 2 → 3 → 5 = 4 + 2 + 5 = 11 and 1 → 3 → 5 = ` +
				`11 + 5 = 16, so the four-hop path wins.`,
		},
		{
			kind: 'choice',
			prompt:
				'Transitive closure is the boolean twin of this DP: replace + with AND ' +
				'and min with OR. Which recurrence computes "i can reach j using only ' +
				'intermediates from {1..k}"?',
			options: [
				't_k[i][j] = t_{k−1}[i][j] OR (t_{k−1}[i][k] AND t_{k−1}[k][j])',
				't_k[i][j] = t_{k−1}[i][j] AND (t_{k−1}[i][k] OR t_{k−1}[k][j])',
				't_k[i][j] = t_{k−1}[i][k] AND t_{k−1}[k][j]',
				't_k[i][j] = t_{k−1}[i][j] OR t_{k−1}[k][k]',
			],
			answer: 't_k[i][j] = t_{k−1}[i][j] OR (t_{k−1}[i][k] AND t_{k−1}[k][j])',
			misconceptions: {
				't_k[i][j] = t_{k−1}[i][k] AND t_{k−1}[k][j]':
					'This drops the first term. i can reach j if it ALREADY could ' +
					'(t_{k−1}[i][j]) OR via k. Without the OR, a pair already connected ' +
					'through lower-numbered vertices would be wrongly forgotten.',
			},
			explanation:
				'It is Floyd-Warshall with min → OR and + → AND: i reaches j through ' +
				'{1..k} iff it already did, OR it can reach k AND k can reach j. Same ' +
				'k-outermost triple loop, Θ(V³).',
		},
	],
};

// =============================================================================
// MAXIMUM FLOW (augmenting paths + max-flow / min-cut) — a second network whose
// minimum cut is INTERIOR (neither the source edges nor the sink edges). We grade
// the bottleneck of the FIRST augmenting path, the max-flow value, the min-cut
// capacity (equal to it), and which side of the min cut a vertex lands on. All
// numbers are read off edmondsKarpTrace (frames carry each path + bottleneck;
// run.minCut carries the capacity and the reachable-from-S side); only the
// theorem statement is conceptual.
// =============================================================================

const MF2_NETWORK = {
	nodes: [
		{ id: 'S' },
		{ id: 'A' },
		{ id: 'B' },
		{ id: 'C' },
		{ id: 'D' },
		{ id: 'T' },
	],
	source: 'S',
	sink: 'T',
	edges: [
		{ from: 'S', to: 'A', capacity: 8 },
		{ from: 'S', to: 'C', capacity: 7 },
		{ from: 'A', to: 'B', capacity: 9 },
		{ from: 'A', to: 'C', capacity: 3 },
		{ from: 'C', to: 'D', capacity: 6 },
		{ from: 'B', to: 'D', capacity: 2 },
		{ from: 'B', to: 'T', capacity: 5 },
		{ from: 'D', to: 'T', capacity: 9 },
	],
};
const MF2_RUN = edmondsKarpTrace(MF2_NETWORK);
const MF2_VALUE = MF2_RUN.value;
const MF2_CUT = MF2_RUN.minCut;
const MF2_CUT_CAP = MF2_CUT.capacity;
// First augmenting path + its bottleneck: the earliest frame carrying a path's
// min residual capacity. Edmonds-Karp augments along shortest residual paths.
const MF2_FIRST = MF2_RUN.frames.find(f => f.bottleneck != null);
const MF2_FIRST_BOTTLENECK = MF2_FIRST.bottleneck;
const MF2_FIRST_PATH = [
	MF2_FIRST.path[0].from,
	...MF2_FIRST.path.map(re => re.to),
].join(' → ');
// Which side of the min cut vertex D is on: the source side S is exactly the set
// still reachable from S in the FINAL residual network.
const MF2_D_SIDE = MF2_CUT.S.includes('D')
	? 'Source side (with S)'
	: 'Sink side (with T)';
const MF2_CUT_EDGES = MF2_CUT.edges
	.map(e => `${e.from}→${e.to}(${e.capacity})`)
	.join(', ');

const problemMF2 = {
	kind: 'problem',
	stem:
		'Flow network from source S to sink T with capacities ' +
		'S→A(8), S→C(7), A→B(9), A→C(3), C→D(6), B→D(2), B→T(5), D→T(9). ' +
		'Run Edmonds-Karp: repeatedly find an augmenting path in the residual ' +
		'network, push its bottleneck of flow, and stop when none remains.',
	parts: [
		{
			kind: 'numeric',
			prompt:
				`The first augmenting path Edmonds-Karp finds is ${MF2_FIRST_PATH}. What ` +
				`is its BOTTLENECK — the most flow you can push along it this round?`,
			answer: MF2_FIRST_BOTTLENECK,
			placeholder: 'a capacity',
			explanation:
				`The bottleneck is the smallest residual capacity on the path. Along ` +
				`${MF2_FIRST_PATH} the residuals are 8, 9, 5, so only ` +
				`${MF2_FIRST_BOTTLENECK} units fit — the B→T edge is the constraint, not ` +
				`the wide S→A edge.`,
		},
		{
			kind: 'numeric',
			prompt: 'What is the value of the maximum flow from S to T?',
			answer: MF2_VALUE,
			placeholder: 'a flow value',
			explanation:
				`Augmenting paths keep adding flow until no residual S→T path remains. ` +
				`The total pushed out of S is then ${MF2_VALUE}, the maximum flow.`,
		},
		{
			kind: 'numeric',
			prompt:
				'By the max-flow / min-cut theorem, the minimum-cut capacity equals the ' +
				'max-flow value. What is the capacity of the minimum cut?',
			answer: MF2_CUT_CAP,
			placeholder: 'a capacity',
			explanation:
				`The min cut crosses ${MF2_CUT_EDGES}, total capacity ${MF2_CUT_CAP} — ` +
				`equal to the max flow ${MF2_VALUE}. Note it is an interior cut: cheaper ` +
				`than cutting the source edges (8+7=15) or the sink edges (5+9=14).`,
		},
		{
			kind: 'choice',
			prompt:
				'Once no augmenting path remains, the vertices reachable from S in the ' +
				'final residual network form the source side of the min cut. Which side ' +
				'is vertex D on?',
			options: ['Source side (with S)', 'Sink side (with T)'],
			answer: MF2_D_SIDE,
			misconceptions: {
				'Source side (with S)':
					'D is NOT reachable from S in the final residual network: both edges ' +
					'into D (C→D and B→D) are saturated, so the cut separates D onto the ' +
					'sink side. The source side is {S, A, B, C}.',
			},
			explanation:
				`The source side S = {${MF2_CUT.S.join(', ')}} is exactly what stays ` +
				`reachable from S once every augmenting path is exhausted. D is cut off ` +
				`from it, so D sits on the sink side: ${MF2_D_SIDE}.`,
		},
		{
			kind: 'choice',
			prompt:
				'Edmonds-Karp stops when it can find NO augmenting path from S to T. Why ' +
				'does that prove the flow is already MAXIMUM?',
			options: [
				'No augmenting path means the reachable set S forms a cut whose capacity equals the current flow, and no flow can exceed any cut (max-flow = min-cut)',
				'Because every edge in the network is now saturated to capacity',
				'Because the algorithm has run for V·E iterations, which is always enough',
				'Because BFS has visited every vertex at least once',
			],
			answer:
				'No augmenting path means the reachable set S forms a cut whose capacity equals the current flow, and no flow can exceed any cut (max-flow = min-cut)',
			misconceptions: {
				'Because every edge in the network is now saturated to capacity':
					'Edges need NOT all be saturated — only the cut edges leaving the ' +
					'reachable set are. Here D→T (capacity 9) is not saturated, yet the ' +
					'flow is still maximum.',
			},
			explanation:
				'When BFS cannot reach T, the reachable set S and its complement form a ' +
				'cut. Every edge leaving S is saturated (else BFS would cross it) and ' +
				'every edge entering S carries no flow, so the cut capacity equals the ' +
				'flow value. Since no flow can exceed any cut, this flow is maximum — the ' +
				'max-flow / min-cut theorem.',
		},
	],
};

// =============================================================================
// HASHING (resize / rehash) - the SAME keys hashed into m and into 2m buckets.
// A resize is just rehashing every key under the new modulus, so we build the
// table twice with createBucketsFromEntries and read the load factor, the
// longest chain before vs after, and where one key lands once m doubles. Every
// number here is DERIVED by the HashMap module's own hash; nothing is typed.
// =============================================================================

// Problem HM2: eight keys in a capacity-7 table are overloaded (alpha = 8/7 > 1).
// We grade the load factor before the resize, the longest chain AFTER doubling to
// m = 14, and the bucket a specific key rehashes to. Keys are sea creatures so the
// set is visibly distinct from hashing-1's cat/dog/bird/fish/ant.
const HM2_KEYS = [
	'frog',
	'crab',
	'clam',
	'seal',
	'orca',
	'tuna',
	'bass',
	'carp',
];
const HM2_CAPACITY = 7; // m before the resize
const HM2_CAPACITY_2 = HM2_CAPACITY * 2; // m after doubling (rehash target)
const HM2_ENTRIES = HM2_KEYS.map(k => ({ key: k, value: k.length }));
// The table hashed into m and into 2m buckets (both derived by the module hash).
const HM2_BEFORE = createBucketsFromEntries(HM2_ENTRIES, HM2_CAPACITY);
const HM2_AFTER = createBucketsFromEntries(HM2_ENTRIES, HM2_CAPACITY_2);
// Derivation helpers (read off the built tables, never hand-typed).
const HM2_BUCKET_OF = (buckets, key) =>
	buckets.findIndex(b => b.some(e => e.key === key));
const HM2_MAX_CHAIN = buckets => Math.max(...buckets.map(b => b.length));
const HM2_COLLISIONS = buckets => buckets.filter(b => b.length > 1).length;
// Load factor alpha = n / m BEFORE the resize (the table is overloaded, alpha > 1).
const HM2_ALPHA_BEFORE = HM2_KEYS.length / HM2_CAPACITY; // 8 / 7 = 1.142857...
const HM2_ALPHA_BEFORE_STR = HM2_ALPHA_BEFORE.toFixed(2); // "1.14" for display
const HM2_ALPHA_AFTER_STR = (HM2_KEYS.length / HM2_CAPACITY_2).toFixed(2); // "0.57"
// Longest chain before vs after the resize (the resize payoff).
const HM2_MAX_BEFORE = HM2_MAX_CHAIN(HM2_BEFORE); // 3
const HM2_MAX_AFTER = HM2_MAX_CHAIN(HM2_AFTER); // 2
// One key from the overloaded longest chain, and where it rehashes to once m
// doubles. Its bucket MOVES, because the slot is h mod m and only m changed.
const HM2_PROBE_KEY = 'seal';
const HM2_PROBE_BEFORE = HM2_BUCKET_OF(HM2_BEFORE, HM2_PROBE_KEY); // 3 at m = 7
const HM2_PROBE_AFTER = HM2_BUCKET_OF(HM2_AFTER, HM2_PROBE_KEY); // 10 at m = 14
// Collision-bucket count before vs after (used only in explanation prose).
const HM2_COLL_BEFORE = HM2_COLLISIONS(HM2_BEFORE); // 3
const HM2_COLL_AFTER = HM2_COLLISIONS(HM2_AFTER); // 1

const problemHM2 = {
	kind: 'problem',
	stem:
		`A hash table with separate chaining holds ${HM2_KEYS.length} keys in ` +
		`m = ${HM2_CAPACITY} buckets. The hash of a string is h = 7, then ` +
		`h = h*31 + charCode for each character, and the bucket is h mod m. The keys ` +
		`are ${HM2_KEYS.map(k => `"${k}"`).join(', ')}. The table is about to ` +
		`resize by doubling to m = ${HM2_CAPACITY_2} and rehashing every key.`,
	parts: [
		{
			kind: 'numeric',
			prompt:
				`Before the resize, what is the load factor alpha = n / m? ` +
				`(${HM2_KEYS.length} keys in ${HM2_CAPACITY} buckets; give two decimals.)`,
			answer: HM2_ALPHA_BEFORE,
			tolerance: 0.01,
			placeholder: 'a load factor',
			explanation:
				`alpha = n / m = ${HM2_KEYS.length} / ${HM2_CAPACITY} = ` +
				`${HM2_ALPHA_BEFORE_STR}. Because alpha is above 1 there are more keys than ` +
				`buckets, so by the pigeonhole principle some bucket must chain. The ` +
				`expected chain length is alpha, which is why the table resizes to pull it ` +
				`back down.`,
		},
		{
			kind: 'numeric',
			prompt:
				`The resize doubles the table to m = ${HM2_CAPACITY_2} and rehashes every ` +
				`key. After the resize, what is the length of the LONGEST chain?`,
			answer: HM2_MAX_AFTER,
			placeholder: 'a length',
			explanation:
				`Rehashing into ${HM2_CAPACITY_2} buckets drops the load factor to ` +
				`${HM2_ALPHA_AFTER_STR}, and the longest chain shrinks from ` +
				`${HM2_MAX_BEFORE} to ${HM2_MAX_AFTER} (the count of collision buckets ` +
				`falls from ${HM2_COLL_BEFORE} to ${HM2_COLL_AFTER}). A shorter worst-case ` +
				`chain is exactly what restores fast lookups.`,
		},
		{
			kind: 'numeric',
			prompt:
				`At m = ${HM2_CAPACITY} the key "${HM2_PROBE_KEY}" sits in bucket ` +
				`${HM2_PROBE_BEFORE}. After the table doubles to m = ${HM2_CAPACITY_2}, ` +
				`which bucket does "${HM2_PROBE_KEY}" rehash into?`,
			answer: HM2_PROBE_AFTER,
			placeholder: 'a bucket index',
			explanation:
				`The bucket is h mod m, and only m changed (the hash h of "` +
				`${HM2_PROBE_KEY}" is fixed). Recomputing h mod ${HM2_CAPACITY_2} moves it ` +
				`from bucket ${HM2_PROBE_BEFORE} to bucket ${HM2_PROBE_AFTER}, which is why ` +
				`every key has to be rehashed on a resize rather than copied to the same ` +
				`slot.`,
		},
		{
			kind: 'choice',
			prompt:
				`The whole point of resizing is to keep operations fast. Why is a hash ` +
				`table's expected lookup O(1) in the first place?`,
			options: [
				'A good hash spreads keys uniformly, so the expected chain length is alpha = n / m, and resizing keeps alpha bounded by a constant',
				'Because each bucket can hold at most one key, so there are never any chains',
				'Because the keys are stored in sorted order, so lookups binary-search the table',
				'Because the hash function makes every key land in bucket 0',
			],
			answer:
				'A good hash spreads keys uniformly, so the expected chain length is alpha = n / m, and resizing keeps alpha bounded by a constant',
			misconceptions: {
				'Because each bucket can hold at most one key, so there are never any chains':
					'That describes open addressing, not separate chaining. Here a bucket holds a whole chain; the cost is O(1 + alpha), and keeping alpha a small constant by resizing is what makes that O(1) on average.',
			},
			explanation:
				'With a hash that distributes keys uniformly, the expected number of keys ' +
				'in a bucket is alpha = n / m, so an average lookup scans O(1 + alpha) ' +
				'entries. Resizing whenever alpha grows past a threshold keeps alpha below ' +
				'a fixed constant, which pins the expected work at O(1).',
		},
	],
};

// Problem S4: WHY Dijkstra needs non-negative weights, shown by it FAILING. A
// directed graph with ONE negative edge (B→A, -2) and no cycle at all, so no
// negative cycle. Dijkstra settles A via the cheap-looking direct S→A(2) BEFORE
// it ever processes B; once A is settled it is never reopened, so the later
// B→A(-2) that would undercut it is ignored (the trace literally skips a settled
// head). Bellman-Ford relaxes every edge repeatedly and finds the true S→B→A
// path. We DERIVE both runs and read the contrast straight off them: Dijkstra's
// (wrong) dist[A] from dijkstraTrace, the true dist[A] from bellmanFordTrace, and
// the mis-handled vertex from the negative edge's head. The disagreement IS the
// lesson, so nothing here is hand-typed.
const S4_GRAPH = {
	nodes: [{ id: 'S' }, { id: 'A' }, { id: 'B' }, { id: 'C' }],
	edges: [
		{ from: 'S', to: 'A', weight: 2 },
		{ from: 'S', to: 'B', weight: 3 },
		{ from: 'B', to: 'A', weight: -2 },
		{ from: 'A', to: 'C', weight: 2 },
	],
};
const S4_DIJKSTRA = dijkstraTrace(S4_GRAPH, { source: 'S' });
const S4_BF = bellmanFordTrace(S4_GRAPH, { source: 'S' });
// The unique negative edge; its HEAD is the vertex Dijkstra settles too early.
const S4_NEG_EDGE = S4_GRAPH.edges.find(e => e.weight < 0);
const S4_WRONG = S4_NEG_EDGE.to; // 'A'
// What Dijkstra REPORTS for A vs the TRUE shortest distance Bellman-Ford finds.
const S4_DIJKSTRA_A = distVal(S4_DIJKSTRA.dist.A); // 2 (over-reported)
const S4_TRUE_A = distVal(S4_BF.dist.A); // 1 (via S→B→A = 3 + (−2))
// The error propagates one hop: A→C inherits A's inflated distance.
const S4_DIJKSTRA_C = distVal(S4_DIJKSTRA.dist.C); // 4
const S4_TRUE_C = distVal(S4_BF.dist.C); // 3
// Distractor vertices for the "which vertex is wrong" choice: the non-source
// vertices the two runs AGREE on (Dijkstra dist == Bellman-Ford dist). Here that
// is exactly B (3 == 3); A and C disagree, so neither is a safe distractor.
const S4_AGREE = S4_GRAPH.nodes
	.map(n => n.id)
	.filter(
		id =>
			id !== 'S' && distVal(S4_DIJKSTRA.dist[id]) === distVal(S4_BF.dist[id])
	);

const problemS4 = {
	kind: 'problem',
	stem:
		'Directed weighted graph with one negative edge and no cycle: ' +
		'S→A(2), S→B(3), B→A(-2), A→C(2). Run Dijkstra from S, then run ' +
		'Bellman-Ford from S, and compare what each reports for vertex A.',
	parts: [
		{
			kind: 'numeric',
			prompt:
				'Run Dijkstra from S. Dijkstra settles the closest unsettled vertex ' +
				'and never reopens it. What distance does Dijkstra end up REPORTING ' +
				'for dist[A]?',
			answer: S4_DIJKSTRA_A,
			placeholder: 'distance',
			explanation:
				`Dijkstra settles S(0), then sees A at 2 (direct S→A) and B at 3. Since ` +
				`2 < 3 it settles A = 2 and locks it in. Only afterwards does it process ` +
				`B and look at B→A(-2). But A is already settled, so that edge is skipped. ` +
				`Dijkstra therefore reports dist[A] = ${S4_DIJKSTRA_A}.`,
		},
		{
			kind: 'numeric',
			prompt:
				'Now run Bellman-Ford from S on the SAME graph. What is the TRUE ' +
				'shortest distance dist[A]?',
			answer: S4_TRUE_A,
			placeholder: 'distance',
			explanation:
				`Bellman-Ford relaxes every edge each pass, so it eventually uses S→B(3) ` +
				`then B→A(-2): the path S→B→A costs 3 + (−2) = ${S4_TRUE_A}, which beats ` +
				`the direct S→A of 2. There is no negative cycle, so ${S4_TRUE_A} is the ` +
				`correct shortest distance, strictly less than the ${S4_DIJKSTRA_A} ` +
				`Dijkstra reported.`,
		},
		{
			kind: 'choice',
			prompt:
				'Dijkstra and Bellman-Ford disagree here. Which vertex does Dijkstra ' +
				'SETTLE (and lock in) before the negative edge B→A could lower its ' +
				'distance, so Dijkstra reports it too high?',
			options: [S4_WRONG, ...S4_AGREE, 'None: the two runs agree'],
			answer: S4_WRONG,
			misconceptions: {
				B:
					`B is settled correctly. Dijkstra reaches B at 3 via S→B and nothing ` +
					`can undercut that, so Dijkstra and Bellman-Ford agree on dist[B] = 3. ` +
					`The break is at A, the head of the negative edge B→A.`,
				'None: the two runs agree':
					`They disagree. Dijkstra reports dist[A] = ${S4_DIJKSTRA_A} but the true ` +
					`distance is ${S4_TRUE_A}; the error even propagates to C ` +
					`(${S4_DIJKSTRA_C} vs ${S4_TRUE_C}). That gap is exactly Dijkstra failing.`,
			},
			explanation:
				`B→A is the only edge that can pull dist[A] below 2, but Dijkstra settles ` +
				`A at 2 before it ever processes B, then refuses to reopen a settled ` +
				`vertex. So A is the vertex it gets wrong: reported 2, true ${S4_TRUE_A}. ` +
				`The mistake flows downstream too. A→C makes Dijkstra report dist[C] = ` +
				`${S4_DIJKSTRA_C} instead of the true ${S4_TRUE_C}.`,
		},
		{
			kind: 'choice',
			prompt:
				'What exactly is the assumption that breaks once a negative edge is ' +
				'present, and is the reason Dijkstra reported the wrong dist[A]?',
			options: [
				'That the smallest tentative distance is final the moment a vertex is settled, so a settled vertex is never reopened even though a later negative edge could lower it',
				'That the graph is connected',
				'That the priority queue stays non-empty',
				'That the source distance can be initialized to 0',
			],
			answer:
				'That the smallest tentative distance is final the moment a vertex is settled, so a settled vertex is never reopened even though a later negative edge could lower it',
			misconceptions: {
				'That the graph is connected':
					`Connectivity is unrelated. The graph here is perfectly connected from S; ` +
					`the failure is purely that a settled vertex is treated as final.`,
				'That the priority queue stays non-empty':
					`The queue empties normally. Dijkstra terminates; it just terminates with ` +
					`a wrong answer because it sealed A too early.`,
			},
			explanation:
				`Dijkstra's correctness rests on one claim: when a vertex is extracted with ` +
				`the smallest tentative distance, that distance is already optimal, so it ` +
				`can be settled and never revisited. With non-negative weights that holds, ` +
				`because no later edge can shorten a path already at the minimum. A negative ` +
				`edge breaks it: a path discovered later (through B) can undercut the ` +
				`settled value, but Dijkstra has moved on and will not reopen A. ` +
				`Bellman-Ford makes no finality assumption. It keeps relaxing every edge, ` +
				`which is why it stays correct on negative edges (absent a negative cycle).`,
		},
	],
};

// =============================================================================
// FOUNDATIONS (amortized analysis) — a dynamic-array doubling hand-trace. A
// dynamic array starts at capacity 1 and DOUBLES when full; appending n elements
// copies elements ONLY at resizes, and those copies sum to 1 + 2 + 4 + … < 2n, so
// each append is O(1) AMORTIZED even though one append (the resize) is O(n). The
// two numeric answers — total element copies across all resizes, and the number
// of doublings — are COMPUTED by a pure simulation (never hand-typed); the
// amortized-vs-worst-case reasoning is conceptual (STATIC). n = 17 is chosen NOT
// a power of two so the numbers (31 copies, 5 doublings) are non-obvious. This is
// the DERIVED numeric complement to foundations-1#3, which only asks what
// "amortized O(1)" MEANS in prose.
// =============================================================================

// Pure simulation: append n elements into a dynamic array that starts at
// capacity 1 and doubles when full. Returns the total element COPIES made across
// all resizes and the number of resize/doubling EVENTS. Copies happen only on a
// resize, where every element already stored is moved into the doubled buffer.
const simulateDoubling = n => {
	let capacity = 1;
	let size = 0;
	let copies = 0;
	let doublings = 0;
	for (let i = 0; i < n; i += 1) {
		if (size === capacity) {
			// full → grow: copy every existing element into the doubled buffer.
			copies += size;
			capacity *= 2;
			doublings += 1;
		}
		size += 1; // place the new element
	}
	return { copies, doublings, finalCapacity: capacity };
};

const F3_N = 17; // not a power of two ⇒ non-obvious counts
const F3_SIM = simulateDoubling(F3_N);
const F3_COPIES = F3_SIM.copies; // 1 + 2 + 4 + 8 + 16 = 31
const F3_DOUBLINGS = F3_SIM.doublings; // resizes at sizes 1, 2, 4, 8, 16 ⇒ 5
const F3_FINAL_CAP = F3_SIM.finalCapacity; // 32

const problemF3 = {
	kind: 'problem',
	stem:
		`A dynamic array starts at capacity 1 and DOUBLES its capacity whenever it ` +
		`is full. You append n = ${F3_N} elements one at a time. A resize is the only ` +
		`time elements are copied: growing from capacity c moves all c elements into ` +
		`the new capacity-2c buffer. Count the copying work, then reason about why ` +
		`each append is still O(1) on average.`,
	parts: [
		{
			kind: 'numeric',
			prompt:
				`Across ALL the resizes triggered while appending ${F3_N} elements, how ` +
				`many element COPIES are made in total? (Each resize copies every element ` +
				`currently stored into the doubled buffer.)`,
			answer: F3_COPIES,
			placeholder: 'a copy count',
			explanation:
				`The array fills at sizes 1, 2, 4, 8, 16, so it resizes there, copying ` +
				`1 + 2 + 4 + 8 + 16 = ${F3_COPIES} elements in total. This geometric sum is ` +
				`2·(largest power of two ≤ n) − 1, always strictly less than 2n; here ` +
				`${F3_COPIES} < 2·${F3_N} = ${2 * F3_N}. Spreading ${F3_COPIES} copies over ` +
				`${F3_N} appends is under 2 copies per append, which is the Θ(1) amortized ` +
				`cost.`,
		},
		{
			kind: 'numeric',
			prompt:
				`How many times does the array DOUBLE (resize) while those ${F3_N} ` +
				`elements are appended?`,
			answer: F3_DOUBLINGS,
			placeholder: 'a count',
			explanation:
				`A resize fires each time size reaches a power of two that is below n: at ` +
				`sizes 1, 2, 4, 8 and 16, so ${F3_DOUBLINGS} doublings (the capacity climbs ` +
				`1 → 2 → 4 → 8 → 16 → ${F3_FINAL_CAP}). In general there are about ` +
				`⌊log₂ n⌋ + 1 doublings, because each one needs twice the elements of the ` +
				`last to trigger, and that geometric spacing is exactly why the copies stay ` +
				`O(n) total.`,
		},
		{
			kind: 'choice',
			prompt:
				`The total copy work is the geometric series 1 + 2 + 4 + … + ` +
				`${F3_FINAL_CAP / 2}, which sums to ${F3_COPIES} (< 2n). Why does this make ` +
				`a single append O(1) AMORTIZED?`,
			options: [
				'The whole append sequence does < 2n copies, so averaged over the n appends each one costs O(1), even though individual appends differ',
				'Every individual append copies at most 2 elements, so each is O(1) in the worst case',
				'Doubling makes every append cost exactly the same, so they are all O(1)',
				'Amortized means the best case, and the best-case append copies nothing',
			],
			answer:
				'The whole append sequence does < 2n copies, so averaged over the n appends each one costs O(1), even though individual appends differ',
			misconceptions: {
				'Every individual append copies at most 2 elements, so each is O(1) in the worst case':
					`Not per append: the append that triggers the last resize copies all ` +
					`${F3_FINAL_CAP / 2} surviving elements, so that one is O(n). Amortized ` +
					`cost is the TOTAL (< 2n) spread over the sequence, not a per-operation ` +
					`worst-case bound.`,
				'Amortized means the best case, and the best-case append copies nothing':
					`Amortized is not best-case. It is the average over a whole sequence, ` +
					`which deliberately accounts for the expensive resizes by charging them ` +
					`against the many cheap appends.`,
			},
			explanation:
				`Geometric resizing caps the total copying at 1 + 2 + 4 + … < 2n for n ` +
				`appends. Dividing that total by n appends gives under 2 copies per append, ` +
				`i.e. Θ(1) amortized. Amortized analysis charges the rare costly resize ` +
				`against the run of cheap appends before it, so the average per operation ` +
				`stays constant.`,
		},
		{
			kind: 'choice',
			prompt:
				`Despite the O(1) amortized cost, what is the WORST-case cost of a SINGLE ` +
				`append?`,
			options: [
				'O(n): the append that fills the array must copy all n existing elements into the doubled buffer',
				'O(1): no single append ever copies more than a constant number of elements',
				'O(log n): each append does work proportional to the number of doublings so far',
				'O(n²): the resize copies every element once for each earlier resize',
			],
			answer:
				'O(n): the append that fills the array must copy all n existing elements into the doubled buffer',
			misconceptions: {
				'O(1): no single append ever copies more than a constant number of elements':
					`The append that triggers a resize copies the entire current contents. ` +
					`Just before the array doubles from ${F3_FINAL_CAP / 2} it copies all ` +
					`${F3_FINAL_CAP / 2} elements, which is Θ(n), not Θ(1). Amortized O(1) and ` +
					`worst-case O(n) are different questions about the same operation.`,
				'O(log n): each append does work proportional to the number of doublings so far':
					`A resize copies elements, not doublings. The cost of the resizing append ` +
					`is the element count it moves (up to n), so it is O(n), not O(log n).`,
			},
			explanation:
				`A single append is O(n) in the worst case: when size has reached capacity, ` +
				`growing the array copies all the stored elements (up to n) into the new ` +
				`buffer before the new element lands. The amortized O(1) bound averages this ` +
				`rare O(n) spike over the many O(1) appends; it does not make any individual ` +
				`append cheap.`,
		},
	],
};

// =============================================================================
// TREES — BST HEIGHT and shape. The height of the tree a fixed insert order
// builds, the height of the degenerate chain the SAME keys make in sorted order
// (n - 1), and the minimum achievable height floor(log2 n). Heights are computed
// with a tiny pure recursion using the EDGE convention (height of empty = -1, a
// single node = 0, i.e. edges on the longest root-to-leaf path) and re-derived
// the same way in the test. Why insertion order fixes the shape, and why balanced
// (O(log n)) beats degenerate (O(n)) for search, is conceptual (STATIC).
// =============================================================================

// Edge-convention height of a BST node: empty = -1, leaf = 0. Pure; the test
// re-implements this identical recursion to re-derive the answers independently.
const bstHeight = node =>
	node == null ? -1 : 1 + Math.max(bstHeight(node.left), bstHeight(node.right));

// Problem B3: insert in a balanced order, measure the height, then compare with
// the sorted-order chain and the theoretical minimum.
const B3_INSERT = [40, 20, 60, 10, 30, 50, 70]; // a roughly balanced insert order
const B3_N = B3_INSERT.length; // 7
const B3_ROOT = buildBst(B3_INSERT);
const B3_INORDER = inorderValues(B3_ROOT); // ascending by the BST invariant
// (1) Height of the BST as actually built from the insert order above.
const B3_HEIGHT = bstHeight(B3_ROOT); // 2 (balanced)
// (2) Insert the SAME keys in sorted ascending order: every key is larger than
// all before it, so each goes right and the tree degenerates to a chain. We BUILD
// that tree and measure it rather than assert n - 1 blindly.
const B3_SORTED = [...B3_INSERT].sort((a, b) => a - b);
const B3_CHAIN_HEIGHT = bstHeight(buildBst(B3_SORTED)); // 6 = n - 1
// (3) Minimum possible height for n keys: a perfectly balanced tree, floor(log2 n).
const B3_MIN_HEIGHT = Math.floor(Math.log2(B3_N)); // floor(log2 7) = 2

const problemB3 = {
	kind: 'problem',
	stem:
		`Insert the keys ${B3_INSERT.join(', ')} into an initially empty binary ` +
		`search tree, in that order (each key goes left if smaller than the current ` +
		`node, right if larger). Throughout, define the HEIGHT of a tree as the ` +
		`number of EDGES on the longest path from the root down to a leaf, so a ` +
		`single node has height 0 and an empty tree has height -1.`,
	parts: [
		{
			kind: 'numeric',
			prompt:
				`What is the HEIGHT of the BST built from this insert order (edges on ` +
				`the longest root-to-leaf path; a single node is height 0)?`,
			answer: B3_HEIGHT,
			placeholder: 'a height',
			explanation:
				`Inserting ${B3_INSERT.join(', ')} builds a balanced tree: 40 is the ` +
				`root, 20 and 60 its children, and 10, 30, 50, 70 the four leaves. The ` +
				`longest root-to-leaf path (e.g. 40 to 20 to 10) crosses ${B3_HEIGHT} ` +
				`edges, so the height is ${B3_HEIGHT}. In-order it reads ` +
				`${B3_INORDER.join(', ')}.`,
		},
		{
			kind: 'numeric',
			prompt:
				`Now insert the SAME ${B3_N} keys into a fresh BST in SORTED ascending ` +
				`order (${B3_SORTED.join(', ')}). What is the height of the resulting ` +
				`tree (same edge convention)?`,
			answer: B3_CHAIN_HEIGHT,
			placeholder: 'a height',
			explanation:
				`In sorted order every key is larger than all inserted so far, so each ` +
				`one becomes the right child of the previous: the tree degenerates into ` +
				`a single right-leaning chain. A chain of ${B3_N} nodes has ${B3_N} - 1 ` +
				`= ${B3_CHAIN_HEIGHT} edges, so its height is ${B3_CHAIN_HEIGHT}. This is ` +
				`the worst case, where the BST behaves like a linked list.`,
		},
		{
			kind: 'numeric',
			prompt:
				`What is the MINIMUM possible height of any BST holding all ${B3_N} ` +
				`keys (the height of a perfectly balanced tree, floor(log2 n))?`,
			answer: B3_MIN_HEIGHT,
			placeholder: 'a height',
			explanation:
				`A binary tree of height h holds at most 2^(h+1) - 1 nodes, so storing ` +
				`n nodes needs height at least floor(log2 n). For n = ${B3_N} that is ` +
				`floor(log2 ${B3_N}) = ${B3_MIN_HEIGHT}, and the balanced insert above ` +
				`hits exactly that minimum. The degenerate chain (${B3_CHAIN_HEIGHT}) is ` +
				`as far from it as a BST on ${B3_N} keys can be.`,
		},
		{
			kind: 'choice',
			prompt:
				`The same ${B3_N} keys gave height ${B3_HEIGHT} in one order and ` +
				`height ${B3_CHAIN_HEIGHT} in another. Why does insertion ORDER decide ` +
				`the height, and why does the balanced shape matter for search?`,
			options: [
				'Each key is placed by comparisons against the keys already in the tree, so the order fixes the shape; a balanced tree keeps the longest path O(log n), so search touches O(log n) nodes, while a degenerate chain is O(n) like a linked list',
				'Insertion order changes which keys the tree stores, so a different set of values ends up at the leaves',
				'A BST always rebalances itself, so the order never changes the height; both trees actually have the same height',
				'The balanced tree is faster only because it stores fewer nodes than the chain',
			],
			answer:
				'Each key is placed by comparisons against the keys already in the tree, so the order fixes the shape; a balanced tree keeps the longest path O(log n), so search touches O(log n) nodes, while a degenerate chain is O(n) like a linked list',
			misconceptions: {
				'Insertion order changes which keys the tree stores, so a different set of values ends up at the leaves':
					'Both trees store exactly the same set of keys; an in-order walk of either gives the sorted sequence. What changes is the SHAPE, not the contents.',
				'A BST always rebalances itself, so the order never changes the height; both trees actually have the same height':
					'A plain BST does NOT self-balance. The chain really is height ' +
					B3_CHAIN_HEIGHT +
					' here. Self-balancing needs an AVL or red-black tree, which adds rotations on top of the plain BST.',
			},
			explanation:
				'A BST inserts each key by walking down from the root and comparing, so ' +
				'the sequence of keys already present decides where the next key lands, ' +
				'and therefore the final shape. Search cost is proportional to the height: ' +
				'a balanced tree has height Theta(log n), so a lookup compares against ' +
				'O(log n) nodes, whereas the sorted-order chain has height n - 1 and a ' +
				'lookup degrades to O(n), exactly like scanning a linked list. This is why ' +
				'balanced search trees (AVL, red-black) enforce O(log n) height.',
		},
	],
};

// =============================================================================
// MAXIMUM FLOW (bipartite matching) — the classic APPLICATION of max-flow. A
// bipartite graph (left set L, right set R) is encoded as a unit-capacity flow
// network: a super-source S -> each L (cap 1), each R -> a super-sink T (cap 1),
// and every bipartite edge oriented L -> R (cap 1). With 0/1 capacities the
// integral max flow is a set of vertex-disjoint edges, so the MAX-FLOW VALUE
// EQUALS the MAXIMUM MATCHING size. We grade the matching size (= run.value),
// whether a PERFECT matching exists (size == |L|), and how many right vertices
// stay unmatched (|R| - size), all read off edmondsKarpTrace on the encoded
// network (never hand-typed). Only "why max-flow equals max-matching" is
// conceptual (STATIC).
//
// The fixed graph: L1, L2, L3 all share the neighbourhood {R1, R2} (a set of 3
// left vertices with only 2 neighbours, a Hall's-condition violation), so they
// fill at most 2 of the matching; L4 -> {R3, R4} adds one more. The maximum
// matching is therefore 3, and no perfect matching exists. Not trivially all.
// =============================================================================

const MF3_LEFT = ['L1', 'L2', 'L3', 'L4'];
const MF3_RIGHT = ['R1', 'R2', 'R3', 'R4'];
// Bipartite edges as [leftId, rightId] pairs (each becomes a capacity-1 L->R arc).
const MF3_BIPARTITE_EDGES = [
	['L1', 'R1'],
	['L1', 'R2'],
	['L2', 'R1'],
	['L2', 'R2'],
	['L3', 'R1'],
	['L3', 'R2'],
	['L4', 'R3'],
	['L4', 'R4'],
];

// PURE encoder: a bipartite graph (left, right, edges) -> the unit-capacity flow
// network edmondsKarpTrace consumes. Super-source S feeds every left vertex;
// every right vertex drains into super-sink T; each bipartite edge is an L->R
// arc. All capacities are 1, which is exactly what forces an integral 0/1 flow
// to be a set of vertex-disjoint matched edges.
const encodeBipartiteAsFlow = (left, right, edges) => ({
	nodes: ['S', ...left, ...right, 'T'].map(id => ({ id })),
	source: 'S',
	sink: 'T',
	edges: [
		...left.map(l => ({ from: 'S', to: l, capacity: 1 })),
		...edges.map(([l, r]) => ({ from: l, to: r, capacity: 1 })),
		...right.map(r => ({ from: r, to: 'T', capacity: 1 })),
	],
});

const MF3_NETWORK = encodeBipartiteAsFlow(
	MF3_LEFT,
	MF3_RIGHT,
	MF3_BIPARTITE_EDGES
);
const MF3_RUN = edmondsKarpTrace(MF3_NETWORK);
// The maximum matching size IS the max-flow value (unit-capacity integral flow).
const MF3_MATCHING = MF3_RUN.value;
// A perfect matching exists iff every left vertex is matched, i.e. size == |L|.
const MF3_PERFECT = MF3_MATCHING === MF3_LEFT.length;
// Right vertices left unmatched = |R| - matching size (each matched edge uses one).
const MF3_UNMATCHED_R = MF3_RIGHT.length - MF3_MATCHING;
// The derived answer-strings for the perfect-matching choice (so the option text
// itself is generated from run.value, never hand-typed). No em dashes in UI copy.
const MF3_PERFECT_YES = `Yes, every left vertex is matched (size ${MF3_MATCHING} = |L| = ${MF3_LEFT.length})`;
const MF3_PERFECT_NO = `No, the maximum matching has size ${MF3_MATCHING}, below |L| = ${MF3_LEFT.length}`;
const MF3_PERFECT_ANSWER = MF3_PERFECT ? MF3_PERFECT_YES : MF3_PERFECT_NO;
// A readable bipartite edge list for the stem, e.g. "L1-R1, L1-R2, ...".
const MF3_EDGE_LIST = MF3_BIPARTITE_EDGES.map(([l, r]) => `${l}-${r}`).join(
	', '
);

const problemMF3 = {
	kind: 'problem',
	stem:
		'Maximum bipartite matching as a max-flow problem. A bipartite graph has ' +
		`left set L = {${MF3_LEFT.join(', ')}} and right set R = {${MF3_RIGHT.join(
			', '
		)}}, with edges ${MF3_EDGE_LIST}. Encode it as a flow network: add a ` +
		'super-source S with a capacity-1 edge to each L-vertex, a capacity-1 edge ' +
		'from each R-vertex to a super-sink T, and orient every bipartite edge ' +
		'L -> R with capacity 1. Run Edmonds-Karp from S to T; the maximum matching ' +
		'is the value of the maximum flow.',
	parts: [
		{
			kind: 'numeric',
			prompt:
				'What is the size of the MAXIMUM MATCHING (equivalently, the value of ' +
				'the maximum flow from S to T in the encoded network)?',
			answer: MF3_MATCHING,
			placeholder: 'a matching size',
			explanation:
				`The maximum matching has size ${MF3_MATCHING}. With every capacity 1, ` +
				'the integral max flow saturates ' +
				`${MF3_MATCHING} of the S->L edges and ${MF3_MATCHING} of the R->T edges, ` +
				`one per matched pair, e.g. L1-R1, L2-R2, L4-R3. Augmenting paths stop ` +
				`once no S->T residual path remains, so the flow value is ${MF3_MATCHING}.`,
		},
		{
			kind: 'choice',
			prompt:
				`Does a PERFECT matching exist — one that matches all |L| = ` +
				`${MF3_LEFT.length} left vertices?`,
			options: [MF3_PERFECT_NO, MF3_PERFECT_YES],
			answer: MF3_PERFECT_ANSWER,
			misconceptions: {
				[MF3_PERFECT_YES]:
					`A perfect matching would need size |L| = ${MF3_LEFT.length}, but the ` +
					`max flow is only ${MF3_MATCHING}. L1, L2 and L3 together reach just two ` +
					'right vertices {R1, R2}, so three of them can never all be matched ' +
					"(Hall's condition fails).",
			},
			explanation:
				`A perfect matching has size |L| = ${MF3_LEFT.length}; here the maximum ` +
				`matching is only ${MF3_MATCHING}, so none exists. The obstruction is ` +
				'L1, L2, L3: all three share the neighbourhood {R1, R2}, a set of three ' +
				'left vertices with only two neighbours, so at most two of them can be ' +
				'matched at once.',
		},
		{
			kind: 'numeric',
			prompt:
				'After a maximum matching, how many RIGHT vertices remain UNMATCHED? ' +
				'(There are |R| right vertices, and each matched edge uses exactly one ' +
				'of them.)',
			answer: MF3_UNMATCHED_R,
			placeholder: 'a count',
			explanation:
				`|R| - matching size = ${MF3_RIGHT.length} - ${MF3_MATCHING} = ` +
				`${MF3_UNMATCHED_R}. A matching of size ${MF3_MATCHING} covers ` +
				`${MF3_MATCHING} right vertices, leaving ${MF3_UNMATCHED_R} of the ` +
				`${MF3_RIGHT.length} unused (here one of R3/R4, since only one of L4's ` +
				'two options can be taken).',
		},
		{
			kind: 'choice',
			prompt:
				'WHY does the maximum flow in this unit-capacity network equal the ' +
				'maximum matching? (This equivalence is the whole reason matching is ' +
				'solved with max-flow.)',
			options: [
				'Every capacity is 1, so an integral max flow sends 0 or 1 unit through each vertex; the saturated L -> R edges are then vertex-disjoint, i.e. a matching, and the flow value counts them',
				'Because Edmonds-Karp always finds the shortest augmenting path, which happens to be a matching',
				'Because the network is bipartite, so any flow is automatically a matching regardless of capacities',
				'Because the min cut equals the number of edges in the bipartite graph',
			],
			answer:
				'Every capacity is 1, so an integral max flow sends 0 or 1 unit through each vertex; the saturated L -> R edges are then vertex-disjoint, i.e. a matching, and the flow value counts them',
			misconceptions: {
				'Because the network is bipartite, so any flow is automatically a matching regardless of capacities':
					'Bipartiteness alone is not enough — it is the UNIT capacities that force the flow to be 0/1. The capacity-1 edge S -> L lets at most one unit reach each left vertex, and the capacity-1 edge R -> T lets at most one unit leave each right vertex, so the matched edges cannot share an endpoint.',
			},
			explanation:
				'Integral max flow (the flow values are integers, and with 0/1 ' +
				'capacities they are 0 or 1) means each S -> L and each R -> T edge ' +
				'carries 0 or 1, so every left vertex sends at most one unit and every ' +
				'right vertex receives at most one. The saturated L -> R edges therefore ' +
				'form a set of vertex-disjoint edges (a matching), and the flow value, ' +
				'which counts the units leaving S, equals the number of matched pairs. ' +
				'Maximising the flow maximises the matching.',
		},
	],
};

// =============================================================================
// NP-COMPLETENESS, set 3 — a CONCRETE polynomial-time reduction:
// VERTEX-COVER <-> INDEPENDENT-SET on the SAME graph. np-1 classifies problems
// and np-2 fixes the reduction DIRECTION in the abstract; np-3 actually RUNS the
// textbook complement reduction on a fixed graph. The reduction's content is its
// SIZE ARITHMETIC: in any graph on n vertices, a set S is independent iff its
// complement V \ S is a vertex cover, so G has an independent set of size s iff G
// has a vertex cover of size n - s. Those sizes (vertex cover from independent
// set, and the inverse) are DERIVED by a pure helper here and re-derived by the
// SAME formula in the test recipe; only the reduction DIRECTION and the
// yes <-> yes correctness guarantee are conceptual (STATIC).
// =============================================================================

// The fixed instance: the 7-cycle C7 (vertices 1..7, edge i—i+1 around the ring).
// For C7 the maximum independent set has size floor(7/2) = 3 and the minimum
// vertex cover has size 7 - 3 = 4, so the numbers below are an honest instance of
// the theorem, not just abstract arithmetic.
const NP3_N = 7;
const NP3_EDGES = [
	{ u: '1', v: '2' },
	{ u: '2', v: '3' },
	{ u: '3', v: '4' },
	{ u: '4', v: '5' },
	{ u: '5', v: '6' },
	{ u: '6', v: '7' },
	{ u: '7', v: '1' },
];

// The reduction's size map, as a pure function of n and a given set size. S is
// independent IFF V \ S is a vertex cover, so the two sizes are complements in n.
// This is the ONLY computed content of the reduction; the recipe re-derives it
// with the identical formula.
const vcIsSize = (n, size) => n - size;

// Part inputs (the sizes the prompt fixes), and their derived complements.
const NP3_IS_GIVEN = 3; // an independent set of this size...
const NP3_VC_FROM_IS = vcIsSize(NP3_N, NP3_IS_GIVEN); // ...maps to a vertex cover of size 4
const NP3_VC_GIVEN = 5; // a vertex cover of this size...
const NP3_IS_FROM_VC = vcIsSize(NP3_N, NP3_VC_GIVEN); // ...maps to an independent set of size 2
const NP3_MAX_IS = 3; // C7's maximum independent set size (stated, true for C7)
const NP3_MIN_VC = vcIsSize(NP3_N, NP3_MAX_IS); // its minimum vertex cover = 7 - 3 = 4

const problemNP3 = {
	kind: 'problem',
	stem:
		`A concrete reduction between two NP-complete problems on ONE graph. Let G be ` +
		`the 7-cycle on vertices 1, 2, 3, 4, 5, 6, 7 with edges ` +
		`${NP3_EDGES.map(e => `${e.u}–${e.v}`).join(', ')} (n = ${NP3_N} vertices). The ` +
		`key fact: a set S of vertices is INDEPENDENT (no edge inside S) if and only ` +
		`if its complement V \\ S is a VERTEX COVER (every edge has an endpoint outside ` +
		`S). So an independent set of size s corresponds exactly to a vertex cover of ` +
		`size n - s, and this single complement map reduces either problem to the other.`,
	parts: [
		{
			kind: 'numeric',
			prompt:
				`Suppose S is an INDEPENDENT SET of size ${NP3_IS_GIVEN} in G. Under the ` +
				`complement reduction, V \\ S is a vertex cover. What is its SIZE? ` +
				`(n = ${NP3_N}.)`,
			answer: NP3_VC_FROM_IS,
			placeholder: 'a set size',
			explanation:
				`V \\ S has n - s = ${NP3_N} - ${NP3_IS_GIVEN} = ${NP3_VC_FROM_IS} vertices. ` +
				`Every edge has at least one endpoint outside the independent set S, so the ` +
				`complement covers all edges. (On C7 this is the optimum: size-3 independent ` +
				`set <-> size-4 vertex cover.)`,
		},
		{
			kind: 'numeric',
			prompt:
				`Now run the reduction the OTHER way. Suppose C is a VERTEX COVER of size ` +
				`${NP3_VC_GIVEN} in G. Then V \\ C is an independent set. What is ITS size? ` +
				`(n = ${NP3_N}.)`,
			answer: NP3_IS_FROM_VC,
			placeholder: 'a set size',
			explanation:
				`V \\ C has n - c = ${NP3_N} - ${NP3_VC_GIVEN} = ${NP3_IS_FROM_VC} vertices. ` +
				`Because C covers every edge, no edge lies inside V \\ C, so V \\ C is ` +
				`independent. The same complement map carries a vertex cover back to an ` +
				`independent set, which is why the reduction works in both directions.`,
		},
		{
			kind: 'numeric',
			prompt:
				`The optimization versions are complements too. The MAXIMUM independent set ` +
				`of this 7-cycle has size ${NP3_MAX_IS}. What is the size of the MINIMUM ` +
				`vertex cover of G?`,
			answer: NP3_MIN_VC,
			placeholder: 'a set size',
			explanation:
				`Minimum vertex cover = n - (maximum independent set) = ${NP3_N} - ` +
				`${NP3_MAX_IS} = ${NP3_MIN_VC}. Maximizing the independent set is exactly ` +
				`minimizing its complementary cover, so a largest independent set and a ` +
				`smallest vertex cover always partition the n vertices.`,
		},
		{
			kind: 'choice',
			prompt:
				`You want to PROVE that VERTEX-COVER is NP-hard, and you already know ` +
				`INDEPENDENT-SET is NP-hard. Using this complement reduction, which ` +
				`direction must it go?`,
			options: [
				'Reduce INDEPENDENT-SET to VERTEX-COVER (INDEPENDENT-SET ≤p VERTEX-COVER)',
				'Reduce VERTEX-COVER to INDEPENDENT-SET (VERTEX-COVER ≤p INDEPENDENT-SET)',
				'Reduce VERTEX-COVER to a problem already known to be in P',
				'Either direction proves VERTEX-COVER NP-hard equally well',
			],
			answer:
				'Reduce INDEPENDENT-SET to VERTEX-COVER (INDEPENDENT-SET ≤p VERTEX-COVER)',
			misconceptions: {
				'Reduce VERTEX-COVER to INDEPENDENT-SET (VERTEX-COVER ≤p INDEPENDENT-SET)':
					`That direction maps the TARGET into the known-hard problem, which only ` +
					`shows VERTEX-COVER is no harder than INDEPENDENT-SET (an upper bound). To ` +
					`prove VERTEX-COVER is HARD you must map the KNOWN-hard problem INTO it: ` +
					`INDEPENDENT-SET ≤p VERTEX-COVER.`,
				'Either direction proves VERTEX-COVER NP-hard equally well':
					`Here the complement map happens to be its own inverse, so both directions ` +
					`exist, but only INDEPENDENT-SET ≤p VERTEX-COVER (known-hard INTO target) ` +
					`establishes VERTEX-COVER's hardness. The reverse direction proves the ` +
					`hardness of INDEPENDENT-SET instead.`,
			},
			explanation:
				`To show a target B is NP-hard you reduce a KNOWN NP-hard problem A INTO B ` +
				`(A ≤p B), so a fast solver for B would solve A too. With A = INDEPENDENT-SET ` +
				`and B = VERTEX-COVER, you map an independent-set instance (G, s) to the ` +
				`vertex-cover instance (G, n - s) using the same graph, which is ` +
				`INDEPENDENT-SET ≤p VERTEX-COVER.`,
		},
		{
			kind: 'choice',
			prompt:
				`For the reduction to be valid, the transformation must preserve the answer. ` +
				`Exactly what biconditional does this complement reduction guarantee for ` +
				`every threshold s?`,
			options: [
				'G has an independent set of size ≥ s  if and only if  G has a vertex cover of size ≤ n − s',
				'G has an independent set of size ≥ s  if and only if  G has a vertex cover of size ≥ s',
				'G has an independent set of size ≤ s  if and only if  G has a vertex cover of size ≤ n − s',
				'Only the forward direction holds: an independent set of size s gives a cover of size n − s, but not conversely',
			],
			answer:
				'G has an independent set of size ≥ s  if and only if  G has a vertex cover of size ≤ n − s',
			misconceptions: {
				'Only the forward direction holds: an independent set of size s gives a cover of size n − s, but not conversely':
					`The complement map S ↦ V \\ S is a bijection that is its own inverse, so ` +
					`the equivalence holds BOTH ways: a cover of size n - s also yields an ` +
					`independent set of size s. A correct many-one reduction needs that full ` +
					`yes <-> yes (and hence no <-> no) preservation.`,
				'G has an independent set of size ≥ s  if and only if  G has a vertex cover of size ≥ s':
					`A larger independent set leaves a SMALLER complement, so it corresponds to ` +
					`a smaller (size ≤ n - s) cover, not a size ≥ s one. Mixing up the ` +
					`direction of the size bound breaks the equivalence.`,
			},
			explanation:
				`Taking complements is a size-preserving bijection between independent sets ` +
				`of size s and vertex covers of size n - s, so a YES instance maps to a YES ` +
				`instance and a NO to a NO: G has an independent set of size ≥ s iff G has a ` +
				`vertex cover of size ≤ n - s. That answer-preserving equivalence, computed ` +
				`in polynomial time, is exactly what makes it a valid reduction.`,
		},
	],
};

export const EXAM_SETS = [
	{
		id: 'mst-1',
		topicId: 'mst',
		topicName: 'Minimum spanning trees',
		problem: problemM1,
	},
	{
		id: 'mst-2',
		topicId: 'mst',
		topicName: 'Minimum spanning trees',
		problem: problemM2,
	},
	{
		id: 'sssp-1',
		topicId: 'shortest-paths',
		topicName: 'Shortest paths (single-source)',
		problem: problemS1,
	},
	{
		id: 'sssp-2',
		topicId: 'shortest-paths',
		topicName: 'Shortest paths (single-source)',
		problem: problemS2,
	},
	{
		id: 'heaps-1',
		topicId: 'heaps',
		topicName: 'Heaps & priority queues',
		problem: problemH1,
	},
	{
		id: 'heaps-2',
		topicId: 'heaps',
		topicName: 'Heaps & priority queues',
		problem: problemH2,
	},
	{
		id: 'heaps-3',
		topicId: 'heaps',
		topicName: 'Heaps & priority queues',
		problem: problemH3,
	},
	{
		id: 'master-1',
		topicId: 'master-theorem',
		topicName: 'Recursion & the master theorem',
		problem: problemT1,
	},
	{
		id: 'master-2',
		topicId: 'master-theorem',
		topicName: 'Recursion & the master theorem',
		problem: problemT2,
	},
	{
		id: 'master-3',
		topicId: 'master-theorem',
		topicName: 'Recursion & the master theorem',
		problem: problemT3,
	},
	{
		id: 'mst-3',
		topicId: 'mst',
		topicName: 'Minimum spanning trees',
		problem: problemM3,
	},
	{
		id: 'mst-4',
		topicId: 'mst',
		topicName: 'Minimum spanning trees',
		problem: problemM4,
	},
	{
		id: 'sssp-3',
		topicId: 'shortest-paths',
		topicName: 'Shortest paths (single-source)',
		problem: problemS3,
	},
	{
		id: 'sssp-4',
		topicId: 'shortest-paths',
		topicName: 'Shortest paths (single-source)',
		problem: problemS4,
	},
	{
		id: 'apsp-1',
		topicId: 'apsp',
		topicName: 'All-pairs shortest paths',
		problem: problemA1,
	},
	{
		id: 'apsp-2',
		topicId: 'apsp',
		topicName: 'All-pairs shortest paths',
		problem: problemA2,
	},
	{
		id: 'linsort-1',
		topicId: 'linear-time-sorting',
		topicName: 'Linear-time sorting',
		problem: problemL1,
	},
	{
		id: 'linsort-2',
		topicId: 'linear-time-sorting',
		topicName: 'Linear-time sorting',
		problem: problemL2,
	},
	{
		id: 'linsort-3',
		topicId: 'linear-time-sorting',
		topicName: 'Linear-time sorting',
		problem: problemL3,
	},
	{
		id: 'trees-1',
		topicId: 'trees',
		topicName: 'Trees',
		problem: problemB1,
	},
	{
		id: 'trees-2',
		topicId: 'trees',
		topicName: 'Trees',
		problem: problemB2,
	},
	{
		id: 'trees-3',
		topicId: 'trees',
		topicName: 'Trees',
		problem: problemB3,
	},
	{
		id: 'graphs-1',
		topicId: 'graphs',
		topicName: 'Graphs',
		problem: problemG1,
	},
	{
		id: 'graphs-2',
		topicId: 'graphs',
		topicName: 'Graphs',
		problem: problemG2,
	},
	{
		// Trace-step probe: freeze BFS mid-run, predict the next dequeue.
		id: 'graphs-probe-1',
		topicId: 'graphs',
		topicName: 'Graphs',
		problem: problemSPbfs,
	},
	{
		// Trace-step probe: freeze Dijkstra mid-run, predict the next settle.
		id: 'sssp-probe-1',
		topicId: 'shortest-paths',
		topicName: 'Shortest paths (single-source)',
		problem: problemSPdijkstra,
	},
	{
		id: 'hashing-1',
		topicId: 'hashing',
		topicName: 'Hashing',
		problem: problemHM1,
	},
	{
		id: 'hashing-2',
		topicId: 'hashing',
		topicName: 'Hashing',
		problem: problemHM2,
	},
	{
		id: 'maxflow-1',
		topicId: 'max-flow',
		topicName: 'Maximum flow',
		problem: problemMF1,
	},
	{
		id: 'maxflow-2',
		topicId: 'max-flow',
		topicName: 'Maximum flow',
		problem: problemMF2,
	},
	{
		id: 'maxflow-3',
		topicId: 'max-flow',
		topicName: 'Maximum flow',
		problem: problemMF3,
	},
	{
		id: 'foundations-1',
		topicId: 'foundations',
		topicName: 'Arrays & complexity',
		problem: problemF1,
	},
	{
		id: 'foundations-2',
		topicId: 'foundations',
		topicName: 'Arrays & complexity',
		problem: problemF2,
	},
	{
		id: 'foundations-3',
		topicId: 'foundations',
		topicName: 'Arrays & complexity',
		problem: problemF3,
	},
	{
		id: 'stacks-queues-1',
		topicId: 'stacks-queues',
		topicName: 'Stacks & queues',
		problem: problemSQ1,
	},
	{
		id: 'stacks-queues-2',
		topicId: 'stacks-queues',
		topicName: 'Stacks & queues',
		problem: problemSQ2,
	},
	{
		id: 'sorting-1',
		topicId: 'sorting',
		topicName: 'Sorting',
		problem: problemMS1,
	},
	{
		id: 'sorting-2',
		topicId: 'sorting',
		topicName: 'Sorting',
		problem: problemMS2,
	},
	{
		id: 'sorting-3',
		topicId: 'sorting',
		topicName: 'Sorting',
		problem: problemSL3,
	},
	{
		id: 'quicksort-1',
		topicId: 'quicksort',
		topicName: 'Quicksort',
		problem: problemQS1,
	},
	{
		id: 'quicksort-2',
		topicId: 'quicksort',
		topicName: 'Quicksort',
		problem: problemQS2,
	},
	{
		id: 'strategies-1',
		topicId: 'strategies',
		topicName: 'Strategies',
		problem: problemP1,
	},
	{
		id: 'strategies-2',
		topicId: 'strategies',
		topicName: 'Strategies',
		problem: problemP2,
	},
	{
		id: 'strategies-3',
		topicId: 'strategies',
		topicName: 'Strategies',
		problem: problemP3,
	},
	{
		id: 'np-1',
		topicId: 'np-completeness',
		topicName: 'NP-completeness',
		problem: problemNP1,
	},
	{
		id: 'np-2',
		topicId: 'np-completeness',
		topicName: 'NP-completeness',
		problem: problemNP2,
	},
	{
		id: 'np-3',
		topicId: 'np-completeness',
		topicName: 'NP-completeness',
		problem: problemNP3,
	},
];

// Distinct topic ids represented, in first-appearance order (for grouping).
export const EXAM_TOPIC_IDS = [...new Set(EXAM_SETS.map(s => s.topicId))];

// =============================================================================
// SEEDED SITTINGS — fresh, un-memorizable instances of the SAME shapes.
// =============================================================================
//
// EXAM_SETS above is the FIXED bank: identical inputs every time (so a retake
// re-runs the same problem, memorizable). data/examInstances.js adds a seeded
// layer: given a seed it deterministically generates a FRESH, well-formed input of
// the same shape and difficulty, then derives the answer from the SAME pure
// generator. `buildExamSets(seed)` returns the bank with each seedable set's
// `problem` swapped for that seed's fresh instance; non-seedable (conceptual) sets
// keep their fixed problem. The set ENVELOPE (id, topicId, topicName) is unchanged,
// so every downstream consumer — ExamPage grouping, weakExam selection, by-topic
// scoring — works on a seeded sitting exactly as on the fixed one.
//
// Back-compat: `EXAM_SETS` (the default export) is untouched. Calling
// `buildExamSets()` with no seed, or seed 0/null, returns the FIXED problems by
// reference, so the seedless path is literally the old bank.

import { buildInstanceProblem, isSeedable } from './examInstances.js';

/**
 * buildExamSets — the exam bank for one sitting seed.
 *
 * @param {number|string|null} [seed] the sitting seed. Falsy (undefined/null/0/'')
 *        ⇒ the FIXED bank (same objects as EXAM_SETS), preserving back-compat.
 * @returns {Array<{id,topicId,topicName,problem}>} the sets for this sitting, in
 *          the same order/identity as EXAM_SETS; seedable problems regenerated.
 */
export const buildExamSets = (seed = null) => {
	// No seed ⇒ the fixed bank verbatim (by reference). This is the old behaviour.
	if (seed === null || seed === undefined || seed === '' || seed === 0) {
		return EXAM_SETS;
	}
	return EXAM_SETS.map(set => {
		if (!isSeedable(set.id)) return set; // conceptual set: keep the fixed problem
		const problem = buildInstanceProblem(set.id, seed);
		// A builder always returns a problem for a seedable id, but fall back to the
		// fixed problem defensively rather than ever shipping an empty sitting.
		return problem ? { ...set, problem } : set;
	});
};

export default EXAM_SETS;
