// examSets.test.js — the permanent "every exam answer is DERIVED" guardrail.
//
// THE INVARIANT (council #12). examSets.js promises that every gradeable answer
// key is produced by a pure, unit-tested generator — never hand-typed. That
// promise is otherwise enforced only by convention. This test makes it a CI
// fact: for every auto-gradable part of every exam set, we RE-DERIVE the
// expected answer from the SAME generator on the SAME input the bank uses, and
// assert it deep-equals the stored `part.answer`. A hand-typed or drifted answer
// therefore makes this test fail.
//
// HOW THIS IS A REAL GUARDRAIL (not a tautology). The prior ad-hoc checker only
// confirmed each stored answer grades to 100% against checkAnswer — i.e. the
// answer is self-consistent (it grades against itself). That cannot catch an
// answer that drifted away from what the algorithm actually produces. Here we
// reconstruct the answer from FIRST PRINCIPLES (call kruskalTrace / dijkstraTrace
// / … on the concrete input, read the key off the result with the same logic the
// bank uses) and compare. The inputs are replicated below from examSets.js; if an
// input or an answer is edited in only one place, the two diverge and this fails.
//
// COVERAGE DISCIPLINE. We iterate EXAM_SETS programmatically, so a newly added
// set is auto-covered:
//   • Every set MUST have a derivation recipe (RECIPES) — a missing recipe fails.
//   • Every part is either re-derived by that recipe OR named in a small, visible
//     STATIC allowlist (truly conceptual prose/definition answers that no
//     generator produces). A new part with no derivation defaults to "must be
//     derived", so "static" cannot become a silent escape hatch.

import test from 'node:test';
import assert from 'node:assert/strict';

import { EXAM_SETS } from './examSets.js';

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
} from '../components/Tree/treeUtils.js';
import { genericTraverse } from '../components/Graph/oneFrontier.js';
import { createBucketsFromEntries } from '../components/HashMap/hashMapTrace.js';
import { edmondsKarpTrace } from '../components/MaxFlow/maxFlowTrace.js';
import { sqFrames } from '../components/StacksQueues/sqFrames.js';
import { getMergeSortStepsWithStats } from '../utils/sorting/algorithms/mergeSort.js';
import {
	buildCoinChangeFrames,
	buildClimbingStairsFrames,
} from '../components/Strategies/coinChangeFrames.js';

// ── derivation helpers, replicated 1:1 from examSets.js ─────────────────────
// These intentionally mirror the bank's private helpers. The whole point is to
// re-derive INDEPENDENTLY; if the bank's read-off logic and these ever disagree
// about what a generator produces, that disagreement is the bug we want surfaced.

const mstEdgeLabel = (id, weightOf) => {
	const [u, v] = edgeEndpoints(id);
	return `${u}–${v} (${weightOf.get(id)})`;
};

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

const distVal = v => (v == null ? Infinity : v);

const distAfterPass = (frames, pass) => {
	let snap = null;
	for (const f of frames) if (f.pass === pass) snap = f.dist;
	return snap || {};
};

// Master-theorem c = log_b(a), formatted exactly as the bank's cText.
const cText = (a, b) => {
	const c = Math.log(a) / Math.log(b);
	return Number.isInteger(c) ? String(c) : c.toFixed(2);
};

// ── replicated inputs (must stay byte-identical to examSets.js) ─────────────

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

const M2_VERTICES = ['A', 'B', 'C', 'D'];
const M2_EDGES = [
	{ u: 'A', v: 'B', w: 3 },
	{ u: 'A', v: 'C', w: 1 },
	{ u: 'B', v: 'C', w: 7 },
	{ u: 'B', v: 'D', w: 5 },
	{ u: 'C', v: 'D', w: 2 },
];

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
const M3_SHIFT = 10;

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

const H1_INPUT = [3, 9, 2, 1, 4, 5];
const H2_HEAP = [9, 7, 8, 1, 4, 2];

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

const L1_INPUT = [2, 5, 3, 0, 2, 3, 0, 3];
const L2_VALUES = [53, 17, 31, 58, 11, 35];

const B1_INSERT = [50, 30, 70, 20, 40, 60, 80, 35];

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

const HM1_KEYS = ['cat', 'dog', 'bird', 'fish', 'ant'];
const HM1_CAPACITY = 7;

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

const F1_N = 8;
const F2_N = 100;

const SQ_OPS = [
	{ type: 'add', value: 'A' },
	{ type: 'add', value: 'B' },
	{ type: 'add', value: 'C' },
	{ type: 'remove' },
	{ type: 'add', value: 'D' },
	{ type: 'remove' },
];

const MS1_INPUT = [5, 2, 8, 1, 9, 3, 7, 4];
const MS2_LEFT = [1, 4, 6, 8];
const MS2_RIGHT = [2, 3, 5, 7];

const P1_COINS = [1, 3, 4];
const P1_TARGET = 6;
const P2_N = 6;

// ── per-problem re-derivations ──────────────────────────────────────────────
// Each recipe returns a map { partIndex → re-derived expected answer }. Only the
// auto-gradable parts appear; conceptual parts are covered by STATIC below.
// Every value here is computed from a generator call on a replicated input.

const mergeOutput = (steps, start, end) =>
	steps.find(
		s =>
			s.metadata &&
			s.metadata.operation === 'merge_complete' &&
			s.metadata.target[0] === start &&
			s.metadata.target[1] === end
	).metadata.outputSnapshot;

const RECIPES = {
	'mst-1': () => {
		const w = weightMap(M1_EDGES);
		const run = kruskalTrace({ vertices: M1_VERTICES, edges: M1_EDGES });
		const accept = run.treeEdges.map(id => mstEdgeLabel(id, w));
		return {
			0: accept, // order: acceptance order
			1: run.totalWeight, // numeric: MST weight
			2: M1_VERTICES.length - 1, // numeric: n-1 edges
		};
	},
	'mst-2': () => {
		const w = weightMap(M2_EDGES);
		const run = primTrace({
			vertices: M2_VERTICES,
			edges: M2_EDGES,
			start: 'A',
		});
		const accept = run.treeEdges.map(id => mstEdgeLabel(id, w));
		return {
			0: accept,
			1: run.totalWeight,
			2: accept[0], // choice: first edge Prim adds
		};
	},
	'sssp-1': () => {
		const run = dijkstraTrace(S1_GRAPH, { source: 'S' });
		return {
			0: settleOrder(run.frames),
			1: distVal(run.dist.A),
			2: distVal(run.dist.C),
		};
	},
	'sssp-2': () => {
		const run = bellmanFordTrace(S2_GRAPH, { source: 'S' });
		return {
			1: distVal(run.dist.A),
			2: distVal(run.dist.C),
		};
	},
	'heaps-1': () => {
		const run = buildMaxHeapTrace(H1_INPUT);
		const final = run.finalHeap;
		return {
			0: Math.floor(H1_INPUT.length / 2) - 1, // last internal node index
			1: `[${final.join(', ')}]`, // choice: post-build array
			2: final[0], // root value
		};
	},
	'heaps-2': () => {
		const run = extractMaxTrace({ heap: H2_HEAP });
		const after = run.finalHeap;
		return {
			0: run.max,
			1: `[${after.join(', ')}]`,
			2: after[0],
		};
	},
	'master-1': () => {
		const r = analyseRecurrence({ a: 2, b: 2, d: 1, k: 0 });
		return {
			0: cText(2, 2), // choice: c = log_b a
			1: r.name, // choice: which case
			2: r.result, // choice: Θ bound
		};
	},
	'master-2': () => {
		const r = analyseRecurrence({ a: 8, b: 2, d: 2, k: 0 });
		return {
			0: cText(8, 2),
			1: r.name,
			2: r.result,
		};
	},
	'mst-3': () => {
		const base = kruskalTrace({ vertices: M3_VERTICES, edges: M3_EDGES });
		const shifted = kruskalTrace({
			vertices: M3_VERTICES,
			edges: M3_EDGES.map(e => ({ ...e, w: e.w + M3_SHIFT })),
		});
		return {
			1: base.totalWeight, // numeric: original MST weight
			2: shifted.totalWeight - base.totalWeight, // numeric: weight increase
		};
	},
	'sssp-3': () => {
		const run = bellmanFordTrace(S3_GRAPH, { source: 'S' });
		const pass1 = distAfterPass(run.frames, 1);
		return {
			0: distVal(pass1.D), // numeric: dist[D] after pass 1
			1: distVal(run.dist.D), // numeric: final dist[D]
			2: distVal(run.dist.C), // numeric: final dist[C]
		};
	},
	'apsp-1': () => {
		const run = floydWarshall(A1_GRAPH);
		const ids = run.ids;
		const row1 = run.dist[ids.indexOf('1')];
		const d12 = distVal(row1[ids.indexOf('2')]);
		const d13 = distVal(row1[ids.indexOf('3')]);
		const d14 = distVal(row1[ids.indexOf('4')]);
		const l1 = run.layers[1];
		const l1_42 = distVal(l1[ids.indexOf('4')][ids.indexOf('2')]);
		return {
			0: d13, // numeric: final d[1][3]
			1: [
				// order: the labelled row cells
				`d[1][1] = 0`,
				`d[1][2] = ${d12}`,
				`d[1][3] = ${d13}`,
				`d[1][4] = ${d14}`,
			],
			2: l1_42, // numeric: d[4][2] after k=1
		};
	},
	'linsort-1': () => {
		const steps = getCountingSortStepsWithStats(L1_INPUT).steps;
		const last = steps[steps.length - 1];
		const counting = steps.filter(s => s.metadata.phase === 'counting');
		const count = counting[counting.length - 1].metadata.countArray;
		return {
			0: last.metadata.k, // numeric: k slots
			1: count[0], // numeric: count[0]
			2: `[${last.array.join(', ')}]`, // choice: final sorted array
		};
	},
	'linsort-2': () => {
		const stable = radixWithSubroutine(L2_VALUES, true);
		const unstable = radixWithSubroutine(L2_VALUES, false);
		const onesStr = `[${stable.passes[0].after.join(', ')}]`;
		const unstableStr = `[${unstable.result.join(', ')}]`;
		return {
			0: onesStr, // choice: after ones-digit pass
			1: `[${stable.result.join(', ')}]`, // choice: final array
			2: `It is no longer sorted, e.g. ${unstableStr}`, // choice: unstable effect
		};
	},
	'trees-1': () => {
		const root = buildBst(B1_INSERT);
		const inorder = inorderValues(root);
		const pre = (() => {
			const steps = getTraversalSteps(root, 'preorder');
			return steps[steps.length - 1].output.map(Number);
		})();
		const successor = inorder[inorder.indexOf(30) + 1];
		const afterDel = deleteValue(root, 30);
		const delInorder = inorderValues(afterDel);
		return {
			0: inorder.map(String), // order: in-order traversal
			1: `root ${pre[0]}, left child ${pre[1]}`, // choice: root + left child
			2: successor, // numeric: successor of 30
			3: delInorder.map(String), // order: in-order after delete
		};
	},
	'graphs-1': () => {
		const bfs = genericTraverse(G1_GRAPH, { discipline: 'fifo', start: 'A' });
		const dfs = genericTraverse(G1_GRAPH, { discipline: 'lifo', start: 'A' });
		return {
			0: bfs.visitOrder, // order: BFS visit order
			1: distVal(bfs.dist.F), // numeric: BFS depth of F
			2: dfs.visitOrder, // order: DFS visit order
		};
	},
	'hashing-1': () => {
		const entries = HM1_KEYS.map(k => ({ key: k, value: k.length }));
		const buckets = createBucketsFromEntries(entries, HM1_CAPACITY);
		const collisions = buckets.filter(b => b.length > 1).length;
		const maxChain = Math.max(...buckets.map(b => b.length));
		const alpha = (HM1_KEYS.length / HM1_CAPACITY).toFixed(2);
		return {
			0: collisions, // numeric: collision buckets
			1: maxChain, // numeric: longest chain
			2: alpha, // choice: load factor α
		};
	},
	'maxflow-1': () => {
		const run = edmondsKarpTrace(MF1_NETWORK);
		return {
			0: run.value, // numeric: max-flow value
			1: run.minCut.capacity, // numeric: min-cut capacity
			2: run.minCut.S.length, // numeric: source-side size
		};
	},
	'foundations-1': () => ({
		0: (F1_N * (F1_N + 1)) / 2, // numeric: n(n+1)/2 body count
	}),
	'foundations-2': () => ({
		1: F2_N, // numeric: linear-search worst case
		2: 1, // numeric: linear-search best case
	}),
	'sorting-1': () => {
		const run = getMergeSortStepsWithStats(MS1_INPUT);
		const steps = run.steps;
		const leftStr = `[${mergeOutput(steps, 0, 3).join(', ')}]`;
		const finalStr = `[${steps[steps.length - 1].array.join(', ')}]`;
		return {
			0: leftStr, // choice: sorted left half
			1: finalStr, // choice: final array
			2: run.finalStats.comparisons, // numeric: comparison count
		};
	},
	'sorting-2': () => {
		const run = getMergeSortStepsWithStats([...MS2_LEFT, ...MS2_RIGHT]);
		const n = MS2_LEFT.length + MS2_RIGHT.length;
		const mergedStr = `[${mergeOutput(run.steps, 0, n - 1).join(', ')}]`;
		return {
			0: mergedStr, // choice: merged result
			1: Math.ceil(Math.log2(n)), // numeric: recursion depth
		};
	},
	'strategies-1': () => {
		const run = buildCoinChangeFrames({ target: P1_TARGET, coins: P1_COINS });
		const dpTable = run.frames[run.frames.length - 1].dpTable;
		return {
			0: dpTable[4], // numeric: dp[4]
			1: run.summary.dpFinal, // numeric: dp[target] optimum
			2: run.summary.greedyFinal, // numeric: greedy coin count
		};
	},
	'strategies-2': () => {
		const run = buildClimbingStairsFrames(P2_N);
		const dpTable = run.frames[run.frames.length - 1].dpTable;
		return {
			0: dpTable[4], // numeric: ways(4)
			1: dpTable[P2_N], // numeric: ways(6)
		};
	},
	// Purely conceptual sets: no generator produces these. Every part is static.
	'stacks-queues-2': () => ({}),
	'np-1': () => ({}),
	'np-2': () => ({}),
};

// SQ1 is special: its derivations come from simulating sqFrames, but two of its
// three parts ARE derived (stack/queue final contents). Kept as its own recipe.
RECIPES['stacks-queues-1'] = () => {
	const stackFinal = sqFrames('stack', [], SQ_OPS).at(-1).items;
	const queueFinal = sqFrames('queue', [], SQ_OPS).at(-1).items;
	const stackPops = stackFinal[stackFinal.length - 1];
	const queueDeq = queueFinal[0];
	return {
		0: `[${stackFinal.join(', ')}]`, // choice: stack final contents
		1: `[${queueFinal.join(', ')}]`, // choice: queue final contents
		2: `Stack pops ${stackPops}, queue dequeues ${queueDeq}`, // choice: next removes
	};
};

// ── STATIC allowlist: parts whose answer is genuinely conceptual prose ───────
// A generator cannot produce these (they are definitions / which-algorithm /
// why-this-is-true choices). Keyed by `${setId}#${partIndex}`, each with a short
// reason. This list is meant to stay SMALL and visible; anything not here and not
// derived is treated as a missing derivation and fails the test.
const STATIC = {
	'mst-1#3': 'concept: what find(u)≠find(v) detects',
	'sssp-1#3': 'concept: why Dijkstra fails on negative edges',
	'sssp-2#0': 'concept: which algorithm for negative edges',
	'sssp-2#3': 'concept: what the extra BF pass detects',
	'mst-3#0': 'concept: does a uniform weight shift change the MST',
	'mst-3#3': 'concept: does positive scaling change the MST',
	'sssp-3#3': 'concept: why exactly |V|-1 passes',
	'apsp-1#3': 'concept: why k is the outermost loop',
	'linsort-1#3': 'concept: when counting sort is linear',
	'graphs-1#3': 'concept: BFS-vs-DFS frontier discipline',
	'hashing-1#3': 'concept: why resize rehashes every key',
	'maxflow-1#3': 'concept: Edmonds-Karp vs Ford-Fulkerson rule',
	'foundations-1#1': 'concept: Θ class of n(n+1)/2',
	'foundations-1#2': 'concept: big-O simplification of 3n²+100n+7',
	'foundations-1#3': 'concept: meaning of amortized O(1)',
	'foundations-2#0': 'concept: order growth rates (fixed canonical sequence)',
	'foundations-2#3': 'concept: why quote worst-case',
	'sorting-1#3': 'concept: recurrence T(n)=2T(n/2)+Θ(n) solves to',
	'sorting-2#2': 'concept: left-on-tie gives stability',
	'strategies-1#3': 'concept: greedy coin change not always optimal',
	'strategies-2#2': 'concept: why memoization is efficient',
	// (stacks-queues-1 has no static parts — all three are re-derived.)
	'stacks-queues-2#0': 'concept: undo wants a stack',
	'stacks-queues-2#1': 'concept: print queue wants a FIFO',
	'stacks-queues-2#2': 'concept: queue→BFS, stack→DFS',
	'np-1#0': 'concept: classify P / NP-complete / undecidable',
	'np-1#1': 'concept: definition of NP-complete',
	'np-1#2': 'concept: definition of NP (verifier)',
	'np-2#0': 'concept: reduction direction for NP-hardness',
	'np-2#1': 'concept: properties of a hardness reduction',
	'np-2#2': 'concept: P=NP follows from one poly NP-complete algo',
};

// ── the tests ───────────────────────────────────────────────────────────────

// Sanity: every set has a recipe, so a NEW set cannot slip in uncovered.
test('every exam set has a derivation recipe (no uncovered set)', () => {
	const missing = EXAM_SETS.filter(s => !(s.id in RECIPES)).map(s => s.id);
	assert.deepEqual(
		missing,
		[],
		`exam set(s) without a re-derivation recipe in examSets.test.js: ${missing.join(
			', '
		)}. Add a recipe that re-derives their answers from the generator.`
	);
});

// The heart of the guardrail: re-derive and deep-equal every gradeable answer.
let derivedCount = 0;
let staticCount = 0;

for (const set of EXAM_SETS) {
	const recipe = RECIPES[set.id];
	if (!recipe) continue; // covered by the sanity test above
	const expectedByIndex = recipe();
	const parts = set.problem.parts;

	test(`[${set.id}] every gradeable answer is re-derived from its generator`, () => {
		parts.forEach((part, i) => {
			const key = `${set.id}#${i}`;
			if (i in expectedByIndex) {
				derivedCount += 1;
				assert.deepEqual(
					part.answer,
					expectedByIndex[i],
					`DRIFT: ${set.id} part ${i} (${part.kind}) stored answer ` +
						`${JSON.stringify(part.answer)} does not match the re-derived ` +
						`${JSON.stringify(expectedByIndex[i])}. Either the stored key was ` +
						`hand-edited away from the generator, or an input drifted.`
				);
			} else {
				// Not derived → it MUST be on the visible static allowlist.
				staticCount += 1;
				assert.ok(
					key in STATIC,
					`UNCOVERED PART: ${set.id} part ${i} (${part.kind}) is neither ` +
						`re-derived nor on the STATIC allowlist. Add a derivation for it, ` +
						`or (only if it is genuinely conceptual prose) add "${key}" to STATIC ` +
						`with a reason.`
				);
			}
		});
	});
}

// Report the coverage split so "static" can never quietly grow unnoticed.
test('derivation coverage is reported (and static stays the minority)', () => {
	const total = derivedCount + staticCount;
	// Surface the numbers in the test output.
	console.log(
		`exam-answer coverage: ${derivedCount}/${total} parts re-derived, ` +
			`${staticCount}/${total} genuinely static (conceptual).`
	);
	assert.ok(total > 0, 'no exam parts were inspected');
	// Guardrail on the guardrail: derived parts must outnumber static ones, so a
	// regression that quietly converts derived → static gets caught.
	assert.ok(
		derivedCount > staticCount,
		`expected re-derived parts to outnumber static ones, but got ` +
			`${derivedCount} derived vs ${staticCount} static`
	);
});
