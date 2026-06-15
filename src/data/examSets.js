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
];

// Distinct topic ids represented, in first-appearance order (for grouping).
export const EXAM_TOPIC_IDS = [...new Set(EXAM_SETS.map(s => s.topicId))];

export default EXAM_SETS;
