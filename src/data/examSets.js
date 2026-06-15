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
	edgeEndpoints,
} from '../components/Mst/mstTrace.js';
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
import {
	buildBst,
	inorderValues,
	deleteValue,
	getTraversalSteps,
	containsValue,
} from '../components/Tree/treeUtils.js';
import { genericTraverse } from '../components/Graph/oneFrontier.js';
import { createBucketsFromEntries } from '../components/HashMap/hashMapTrace.js';
import { edmondsKarpTrace } from '../components/MaxFlow/maxFlowTrace.js';

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
const M2_PRIM = primTrace({ vertices: M2_VERTICES, edges: M2_EDGES, start: 'A' });
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
			options: [
				`${M2_ACCEPT[0]}`,
				'A–B (3)',
				'C–D (2)',
				'B–D (5)',
			],
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
			options: ['Bellman-Ford', 'Dijkstra', 'Either works the same', 'Neither can run'],
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
			answer:
				'A reachable negative-weight cycle (any edge that still relaxes)',
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
			prompt:
				'After BuildMaxHeap, what value sits at the root (index 0)?',
			answer: H1_FINAL[0],
			placeholder: 'a value',
			explanation:
				`The root of a max-heap is always the maximum element, here ${H1_FINAL[0]}.`,
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
			explanation:
				`ExtractMax always returns the root of a max-heap, here ${H2_MAX}.`,
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
	const boundOptions = [
		r.result,
		...BOUND_POOL.filter(o => o !== r.result),
	].filter((o, i, arr) => arr.indexOf(o) === i).slice(0, 4);
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
	const rounded = Number.isInteger(x) ? String(x) : x.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
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
			prompt:
				`Compute the leaf-growth exponent c = log_b(a) = log_${T.b}(${T.a}). What is c?`,
			options: [...new Set([T.cText, String(T.d), '1', '2', '3'])].slice(0, 4),
			answer: T.cText,
			explanation:
				`c = log_${T.b}(${T.a}) = ${T.cText}. This is compared against d = ${T.d} ` +
				'(the exponent of the combine work f(n) = n^d).',
		},
		{
			kind: 'choice',
			prompt:
				`Comparing c = ${T.cText} with d = ${T.d}, which Master Theorem case applies?`,
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
			explanation:
				`The bound is ${T.analysis.result}. ${T.analysis.explanation}`,
		},
	],
});

const problemT1 = masterCheck(T1);
const problemT2 = masterCheck(T2);

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
		`0..${Math.max(...L1_INPUT)}, so the count array has indices 0..${
			Math.max(...L1_INPUT)
		}.`,
	parts: [
		{
			kind: 'numeric',
			prompt:
				'Counting sort allocates count[0..k−1] where k is the key range. What is ' +
				'k (the number of count slots)?',
			answer: L1_K,
			placeholder: 'a count',
			explanation:
				`The largest key is ${Math.max(...L1_INPUT)}, so the slots are 0..${
					Math.max(...L1_INPUT)
				} — that is k = ${L1_K} slots.`,
		},
		{
			kind: 'numeric',
			prompt:
				'After the tally pass, what is count[0] (the number of keys equal to 0)?',
			answer: L1_COUNT0,
			placeholder: 'a count',
			explanation:
				`There are ${L1_COUNT0} zeros in the input, so count[0] = ${L1_COUNT0}.`,
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
			prompt:
				'Which key is the ROOT of the tree, and which is its left child?',
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
			prompt:
				'Give the order BFS (a FIFO queue frontier) VISITS the vertices.',
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
const HM1_BUCKET_OF = key => HM1_BUCKETS.findIndex(b => b.some(e => e.key === key));
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
const M3_SHIFTED = kruskalTrace({ vertices: M3_VERTICES, edges: M3_SHIFTED_EDGES });
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
			explanation:
				`The MST edges are ${M3_BASE_ACCEPT.join(', ')}, summing to ${M3_BASE_WEIGHT}.`,
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

// =============================================================================
// THE EXAM SET REGISTRY
// =============================================================================
//
// Each set bundles ~2 derived problems for one topic. `topicId` matches a
// curriculum id so ExamPage can resolve the topic name/accent; `topicName` is a
// display fallback. The exam page groups sets by topic and scores by topic.

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
		id: 'mst-3',
		topicId: 'mst',
		topicName: 'Minimum spanning trees',
		problem: problemM3,
	},
	{
		id: 'sssp-3',
		topicId: 'shortest-paths',
		topicName: 'Shortest paths (single-source)',
		problem: problemS3,
	},
	{
		id: 'apsp-1',
		topicId: 'apsp',
		topicName: 'All-pairs shortest paths',
		problem: problemA1,
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
		id: 'trees-1',
		topicId: 'trees',
		topicName: 'Trees',
		problem: problemB1,
	},
	{
		id: 'graphs-1',
		topicId: 'graphs',
		topicName: 'Graphs',
		problem: problemG1,
	},
	{
		id: 'hashing-1',
		topicId: 'hashing',
		topicName: 'Hashing',
		problem: problemHM1,
	},
	{
		id: 'maxflow-1',
		topicId: 'max-flow',
		topicName: 'Maximum flow',
		problem: problemMF1,
	},
];

// Distinct topic ids represented, in first-appearance order (for grouping).
export const EXAM_TOPIC_IDS = [...new Set(EXAM_SETS.map(s => s.topicId))];

export default EXAM_SETS;
