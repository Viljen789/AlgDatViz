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

import { EXAM_SETS, buildExamSets } from './examSets.js';
import {
	SEEDABLE_SET_IDS,
	buildInstanceProblem,
	isSeedable,
} from './examInstances.js';
import { getQuickSortFrames } from '../utils/sorting/quickPartitionFrames.js';
import { quickselectTrace } from '../components/QuickSortLesson/quickselectTrace.js';

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
	dagShortestPathsTrace,
} from '../components/ShortestPaths/relaxTrace.js';
import { SSSP_ALGO_ORDER } from '../components/ShortestPaths/ssspMeta.js';
import {
	buildMaxHeapTrace,
	extractMaxTrace,
} from '../components/Heaps/heapTrace.js';
import { analyseRecurrence } from '../components/MasterTheorem/masterMath.js';
import {
	unrollRecurrence,
	gPow2,
} from '../components/MasterTheorem/iterativeRecurrence.js';
import {
	floydWarshall,
	transitiveClosure,
} from '../components/AllPairsShortestPaths/fwTrace.js';
import { slowApsp } from '../components/AllPairsShortestPaths/slowApsp.js';
import { getCountingSortStepsWithStats } from '../utils/sorting/algorithms/countingSort.js';
import { radixWithSubroutine } from '../components/LinearTimeSorting/stability.js';
import { bucketSort } from '../components/LinearTimeSorting/bucketSortTrace.js';
import {
	buildBst,
	inorderValues,
	deleteValue,
	getTraversalSteps,
} from '../components/Tree/treeUtils.js';
import { genericTraverse } from '../components/Graph/oneFrontier.js';
import { topoSort, isValidTopoOrder } from '../components/Graph/topoSort.js';
import { createBucketsFromEntries } from '../components/HashMap/hashMapTrace.js';
import { edmondsKarpTrace } from '../components/MaxFlow/maxFlowTrace.js';
import { sqFrames } from '../components/StacksQueues/sqFrames.js';
import { getMergeSortStepsWithStats } from '../utils/sorting/algorithms/mergeSort.js';
import {
	buildCoinChangeFrames,
	buildClimbingStairsFrames,
} from '../components/Strategies/coinChangeFrames.js';
import { activitySelect } from '../components/Strategies/activitySelect.js';
import { tableDoubling } from '../components/Foundations/tableDoubling.js';
import { galeShapley, blockingPairs, isStable } from '../lib/galeShapley.js';

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

// ── trace-step probe re-derivation (INDEPENDENT of data/traceProbes.js) ──────
// The bank builds its probes via traceProbes.js; this is a SECOND implementation so
// a bug in that shared read-off is caught (the two must agree). We find the decision
// frames ourselves and read the next decision off the frame stream. `ordinal` is
// 1-based among decision frames after the first (matching the bank's convention),
// the probed decision frame is decisions[ordinal], the FROZEN frame is the one
// immediately before it, and the answer is that decision frame's field.
const probeFrameIndices = (frames, phase) => {
	const out = [];
	frames.forEach((f, i) => {
		if (f.phase === phase) out.push(i);
	});
	return out;
};

const rederiveProbe = (frames, { phase, field, ordinal }) => {
	const decisions = probeFrameIndices(frames, phase);
	const decisionIndex = decisions[ordinal];
	if (decisionIndex === undefined || decisionIndex < 1) return null;
	return {
		frozen: frames[decisionIndex - 1],
		answer: frames[decisionIndex][field],
	};
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

const S4_GRAPH = {
	nodes: [{ id: 'S' }, { id: 'A' }, { id: 'B' }, { id: 'C' }],
	edges: [
		{ from: 'S', to: 'A', weight: 2 },
		{ from: 'S', to: 'B', weight: 3 },
		{ from: 'B', to: 'A', weight: -2 },
		{ from: 'A', to: 'C', weight: 2 },
	],
};

const S5_GRAPH = {
	nodes: [
		{ id: 'S' },
		{ id: 'A' },
		{ id: 'B' },
		{ id: 'C' },
		{ id: 'D' },
		{ id: 'E' },
	],
	edges: [
		{ from: 'S', to: 'A', weight: 3 },
		{ from: 'S', to: 'B', weight: 6 },
		{ from: 'S', to: 'E', weight: 10 },
		{ from: 'A', to: 'B', weight: 1 },
		{ from: 'A', to: 'C', weight: 4 },
		{ from: 'B', to: 'C', weight: 2 },
		{ from: 'B', to: 'D', weight: 5 },
		{ from: 'C', to: 'D', weight: -3 },
		{ from: 'C', to: 'E', weight: 3 },
		{ from: 'D', to: 'E', weight: 1 },
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

const A3_GRAPH = {
	nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }],
	edges: [
		{ from: 'a', to: 'b' },
		{ from: 'b', to: 'c' },
		{ from: 'c', to: 'd' },
		{ from: 'd', to: 'b' },
		{ from: 'e', to: 'a' },
	],
};

const A4_GRAPH = {
	nodes: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }],
	edges: [
		{ from: '1', to: '2', weight: 3 },
		{ from: '2', to: '3', weight: -2 },
		{ from: '3', to: '1', weight: 4 },
		{ from: '3', to: '4', weight: 1 },
		{ from: '4', to: '2', weight: 1 },
		{ from: '2', to: '4', weight: 6 },
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

const G2_VERTICES = ['A', 'B', 'C', 'D', 'E', 'F'];
const G2_EDGES = [
	{ from: 'A', to: 'C' },
	{ from: 'A', to: 'D' },
	{ from: 'B', to: 'C' },
	{ from: 'C', to: 'E' },
	{ from: 'D', to: 'E' },
	{ from: 'E', to: 'F' },
];

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
	'master-3': () => {
		const r3 = analyseRecurrence({ a: 2, b: 2, d: 2, k: 0 });
		const r4 = analyseRecurrence({ a: 4, b: 2, d: 3, k: 0 });
		return {
			0: r3.name, // choice: T3 case (Case 3)
			1: r3.result, // choice: T3 Θ bound (Θ(n^2))
			3: r4.name, // choice: T4 case (Case 3)
			4: r4.result, // choice: T4 Θ bound (Θ(n^3))
		};
	},
	'master-4': () => {
		const run = unrollRecurrence({ baseN: 1, baseVal: 1, g: gPow2, n: 8 });
		return {
			0: run.value, // numeric: T(8) by unrolling (= 2^8 − 1 = 255)
			// parts 1 (Θ-class) and 2 (why not Master Theorem) are conceptual → STATIC
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
	'mst-4': () => {
		const cut = ['A', 'B', 'D'];
		const { crossing, light } = crossingEdges(MST_EDGES, cut);
		const label = e => `${e.u}–${e.v} (${e.w})`;
		return {
			0: crossing.map(label), // order: crossing edges, ascending weight
			1: label(light), // choice: the safe (lightest crossing) edge
			2: light.w, // numeric: its weight
		};
		// part 3 ("WHY it is safe") is conceptual; see STATIC below.
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
	'sssp-4': () => {
		const dij = dijkstraTrace(S4_GRAPH, { source: 'S' });
		const bf = bellmanFordTrace(S4_GRAPH, { source: 'S' });
		const wrong = S4_GRAPH.edges.find(e => e.weight < 0).to; // head of the neg edge
		return {
			0: distVal(dij.dist.A), // numeric: distance Dijkstra REPORTS for A (wrong)
			1: distVal(bf.dist.A), // numeric: TRUE shortest dist[A] (Bellman-Ford)
			2: wrong, // choice: the vertex Dijkstra gets wrong (= 'A')
			// part 3 ("which assumption breaks") is conceptual (see STATIC below).
		};
	},
	'sssp-5': () => {
		const run = dagShortestPathsTrace(S5_GRAPH, { source: 'S' });
		const vorder = ['S', 'A', 'B', 'C', 'D', 'E'];
		return {
			0: distVal(run.dist.E), // numeric: final dist[E] (indirect, beats S→E(10))
			1: vorder.map(id => `dist[${id}] = ${distVal(run.dist[id])}`), // order: dist[] in fixed vertex order (NOT topo order)
			// part 2 ("why one pass + why negatives ok") is conceptual → STATIC below.
		};
	},
	'sssp-6': () => {
		// Re-derive the classify buckets straight from the lesson's SSSP set.
		// item id → its algorithm id (the 3 SSSP items use their ssspMeta ids;
		// the 4 distractors use ids deliberately absent from SSSP_ALGO_ORDER).
		const itemAlgoId = {
			bellmanFord: 'bellmanFord',
			dagShortestPaths: 'dagShortestPaths',
			dijkstra: 'dijkstra',
			floydWarshall: 'floydWarshall',
			prim: 'prim',
			kruskal: 'kruskal',
			bfs: 'bfs',
		};
		const answer = Object.fromEntries(
			Object.entries(itemAlgoId).map(([itemId, algoId]) => [
				itemId,
				SSSP_ALGO_ORDER.includes(algoId) ? 'sssp' : 'not-sssp',
			])
		);
		return {
			0: answer, // classify: SSSP membership derived from SSSP_ALGO_ORDER
			// parts 1 & 2 (which one handles negatives; when BFS is correct) are
			// conceptual choice parts → STATIC below.
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
	'apsp-2': () => {
		const run = floydWarshall(A2_GRAPH);
		const ids = run.ids;
		const ix = id => ids.indexOf(id);
		// d[1][3] after the k = 2 round (intermediates {1, 2}).
		const l2_13 = distVal(run.layers[2][ix('1')][ix('3')]);
		// First admitted vertex that lowers d[2][4] below its direct edge.
		const firstImprove = (fromId, toId) => {
			const i = ix(fromId);
			const j = ix(toId);
			for (let k = 1; k < run.layers.length; k++) {
				const prev = run.layers[k - 1][i][j];
				const cur = run.layers[k][i][j];
				if (JSON.stringify(prev) !== JSON.stringify(cur)) return ids[k - 1];
			}
			return null;
		};
		// Final shortest distance for the no-direct-edge pair 1 → 5.
		const d15 = distVal(run.dist[ix('1')][ix('5')]);
		return {
			0: l2_13, // numeric: d[1][3] after k=2
			1: `Vertex ${firstImprove('2', '4')}`, // choice: first vertex to improve d[2][4]
			2: d15, // numeric: final d[1][5]
		};
	},
	'apsp-3': () => {
		const run = transitiveClosure(A3_GRAPH);
		const ids = run.ids;
		const ix = id => ids.indexOf(id);
		const R = run.reach;
		// part 0 — classify: reachable-from-a buckets.
		const reachFromA = Object.fromEntries(
			ids
				.filter(id => id !== 'a')
				.map(id => [id, R[ix('a')][ix(id)] ? 'reach' : 'noreach'])
		);
		// part 1 — numeric: off-diagonal TRUE count.
		let offDiag = 0;
		for (let i = 0; i < run.n; i += 1)
			for (let j = 0; j < run.n; j += 1) if (i !== j && R[i][j]) offDiag += 1;
		return {
			0: reachFromA, // classify: who is reachable from a
			1: offDiag, // numeric: # reachable ordered pairs (i != j)
			// part 2 (Θ(V³) twin) is conceptual → STATIC below.
		};
	},
	'apsp-4': () => {
		const run = slowApsp(A4_GRAPH);
		const ids = run.ids;
		const ix = id => ids.indexOf(id);
		// L^(2) = layers[1] (best path of at most 2 edges).
		const l2 = run.layers[1];
		return {
			0: distVal(l2[ix('1')][ix('3')]), // numeric: l^(2)_{1,3} = 1
			1: distVal(l2[ix('2')][ix('4')]), // numeric: l^(2)_{2,4} = −1
			// part 2 (running time Θ(V⁴)) is conceptual; see STATIC below.
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
	'linsort-3': () => {
		const run = bucketSort([29, 25, 3, 49, 9, 37, 21, 43], 4);
		const probeBucket = run.bucketIndexOf(37);
		return {
			0: probeBucket, // numeric: bucket 37 lands in
			1: run.buckets[probeBucket].map(String), // order: scatter-order contents
			2: run.sorted.map(String), // order: final sorted array
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
	'graphs-2': () => {
		const t = topoSort(G2_VERTICES, G2_EDGES);
		const candidate = ['B', 'A', 'D', 'C', 'E', 'F'];
		return {
			0: t.order[0], // choice: first vertex emitted
			1: t.indegree.E, // numeric: in-degree of E
			2: t.order, // order: full topological order
			3: isValidTopoOrder(candidate, G2_EDGES) ? 'Valid' : 'Invalid', // choice: candidate validity
			// part 4 (cycle ⇒ no order) is conceptual → STATIC
		};
	},
	// Trace-step probes: the answer is the NEXT decision, re-derived from the frame
	// stream of the same generator on the same fixed input (S1_GRAPH / G1_GRAPH).
	'sssp-probe-1': () => {
		const run = dijkstraTrace(S1_GRAPH, { source: 'S' });
		return {
			0: rederiveProbe(run.frames, {
				phase: 'settle',
				field: 'active',
				ordinal: 2,
			}).answer, // stepProbe: Dijkstra settles next (2nd probed settle)
			1: rederiveProbe(run.frames, {
				phase: 'settle',
				field: 'active',
				ordinal: 3,
			}).answer, // stepProbe: the settle after that
		};
	},
	'graphs-probe-1': () => {
		const bfs = genericTraverse(G1_GRAPH, { discipline: 'fifo', start: 'A' });
		return {
			0: rederiveProbe(bfs.frames, {
				phase: 'extract',
				field: 'current',
				ordinal: 1,
			}).answer, // stepProbe: BFS dequeues next
			1: rederiveProbe(bfs.frames, {
				phase: 'extract',
				field: 'current',
				ordinal: 2,
			}).answer, // stepProbe: the dequeue after that
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
	'hashing-2': () => {
		const keys = [
			'frog',
			'crab',
			'clam',
			'seal',
			'orca',
			'tuna',
			'bass',
			'carp',
		];
		const capacity = 7;
		const entries = keys.map(k => ({ key: k, value: k.length }));
		const after = createBucketsFromEntries(entries, capacity * 2);
		const sealAfter = after.findIndex(b => b.some(e => e.key === 'seal'));
		return {
			0: keys.length / capacity, // numeric: load factor alpha before resize (8/7)
			1: Math.max(...after.map(b => b.length)), // numeric: longest chain after resize
			2: sealAfter, // numeric: seal's bucket once m doubles to 14
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
	'maxflow-2': () => {
		const network = {
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
		const run = edmondsKarpTrace(network);
		const first = run.frames.find(f => f.bottleneck != null);
		return {
			0: first.bottleneck, // numeric: first augmenting path's bottleneck
			1: run.value, // numeric: max-flow value
			2: run.minCut.capacity, // numeric: min-cut capacity (= max flow)
			3: run.minCut.S.includes('D') // choice: which side D is on
				? 'Source side (with S)'
				: 'Sink side (with T)',
		};
	},
	'maxflow-3': () => {
		// Re-encode the SAME fixed bipartite graph and re-run the SAME generator,
		// independently of examSets.js, then read every gradeable key off run.value.
		const left = ['L1', 'L2', 'L3', 'L4'];
		const right = ['R1', 'R2', 'R3', 'R4'];
		const bipartite = [
			['L1', 'R1'],
			['L1', 'R2'],
			['L2', 'R1'],
			['L2', 'R2'],
			['L3', 'R1'],
			['L3', 'R2'],
			['L4', 'R3'],
			['L4', 'R4'],
		];
		const network = {
			nodes: ['S', ...left, ...right, 'T'].map(id => ({ id })),
			source: 'S',
			sink: 'T',
			edges: [
				...left.map(l => ({ from: 'S', to: l, capacity: 1 })),
				...bipartite.map(([l, r]) => ({ from: l, to: r, capacity: 1 })),
				...right.map(r => ({ from: r, to: 'T', capacity: 1 })),
			],
		};
		const run = edmondsKarpTrace(network);
		const matching = run.value;
		const perfect = matching === left.length;
		return {
			0: matching, // numeric: maximum matching size (= max-flow value)
			1: perfect // choice: does a perfect matching exist (derived option string)
				? `Yes, every left vertex is matched (size ${matching} = |L| = ${left.length})`
				: `No, the maximum matching has size ${matching}, below |L| = ${left.length}`,
			2: right.length - matching, // numeric: unmatched right vertices
			// part 3 ("WHY max-flow = max-matching") is conceptual → STATIC below.
		};
	},
	'foundations-1': () => ({
		0: (F1_N * (F1_N + 1)) / 2, // numeric: n(n+1)/2 body count
	}),
	'foundations-2': () => ({
		1: F2_N, // numeric: linear-search worst case
		2: 1, // numeric: linear-search best case
	}),
	'foundations-3': () => {
		// Re-derive the dynamic-array doubling counts from first principles
		// (independent of examSets.js). Start at capacity 1, double when full,
		// count copies (only at resizes) and doublings.
		const simulate = n => {
			let capacity = 1;
			let size = 0;
			let copies = 0;
			let doublings = 0;
			for (let i = 0; i < n; i += 1) {
				if (size === capacity) {
					copies += size;
					capacity *= 2;
					doublings += 1;
				}
				size += 1;
			}
			return { copies, doublings };
		};
		const sim = simulate(17);
		return {
			0: sim.copies, // numeric: total element copies across resizes (31)
			1: sim.doublings, // numeric: number of doublings (5)
			// parts 2 & 3 (amortized-vs-worst-case reasoning) are conceptual → STATIC
		};
	},
	'foundations-4': () => ({
		// Re-derive the total element copies for n = 10 directly from the doubling
		// simulator (independent of examSets.js). Resizes at sizes 1,2,4,8 →
		// copies 1+2+4+8 = 15.
		0: tableDoubling(10).copies, // numeric: total copies across all resizes (15)
		// parts 1 & 2 (worst-vs-amortized meaning; why doubling beats constant-k)
		// are conceptual → STATIC below.
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
	'strategies-3': () => {
		const run = activitySelect([
			{ id: 'A1', start: 1, finish: 4 },
			{ id: 'A2', start: 3, finish: 5 },
			{ id: 'A3', start: 0, finish: 6 },
			{ id: 'A4', start: 4, finish: 7 },
			{ id: 'A5', start: 3, finish: 8 },
			{ id: 'A6', start: 5, finish: 9 },
			{ id: 'A7', start: 6, finish: 10 },
			{ id: 'A8', start: 8, finish: 11 },
			{ id: 'A9', start: 11, finish: 13 },
		]);
		return {
			0: run.selectedIds[0], // choice: first activity picked (earliest finish)
			1: run.count, // numeric: maximum compatible activities
			2: `{${run.selectedIds.join(', ')}}`, // choice: the full selected set
		};
	},
	'strategies-4': () => {
		// Replicate the instance independently (do NOT import the bank's copy).
		const men = {
			m1: ['w1', 'w2', 'w3'],
			m2: ['w1', 'w3', 'w2'],
			m3: ['w2', 'w3', 'w1'],
		};
		const women = {
			w1: ['m2', 'm1', 'm3'],
			w2: ['m1', 'm3', 'm2'],
			w3: ['m3', 'm2', 'm1'],
		};
		const proposed = { m1: 'w1', m2: 'w3', m3: 'w2' };
		const bp = blockingPairs(proposed, men, women); // exactly one: (m2,w1)
		const gs = galeShapley(men, women); // man-optimal matching
		return {
			0: isStable(proposed, men, women)
				? 'Yes — it is stable'
				: 'No — it is not stable', // choice: stability (→ "No …")
			1: `(${bp[0].man}, ${bp[0].woman})`, // choice: the blocking pair (→ "(m2, w1)")
			2: Object.fromEntries(gs.pairs), // classify: man -> woman GS matching
			// part 3 (termination + man-optimality) is conceptual → STATIC below.
		};
	},
	// Purely conceptual sets: no generator produces these. Every part is static.
	'stacks-queues-2': () => ({}),
	'np-1': () => ({}),
	'np-2': () => ({}),
	'np-3': () => {
		// Re-derive the reduction's size arithmetic INDEPENDENTLY: a set S is
		// independent iff V \ S is a vertex cover, so the sizes are complements in n.
		// Same formula as the bank's vcIsSize, recomputed here from first principles.
		const n = 7;
		const vcIsSize = (total, size) => total - size;
		return {
			0: vcIsSize(n, 3), // numeric: vertex cover from a size-3 independent set (= 4)
			1: vcIsSize(n, 5), // numeric: independent set from a size-5 vertex cover (= 2)
			2: vcIsSize(n, 3), // numeric: minimum vertex cover from the size-3 maximum IS (= 4)
			// parts 3 (reduction direction) and 4 (yes<->yes guarantee) are conceptual → STATIC
		};
	},
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

// Quicksort: the partition trace (pivot index, array, left sub-array, comparison
// count) is re-derived from getQuickSortFrames; the worst-case comparison count
// too. The recurrence-result and practical-fix choices are conceptual (STATIC).
RECIPES['quicksort-1'] = () => {
	const run = getQuickSortFrames([7, 2, 9, 4, 1, 8, 5, 6]);
	const place = run.frames.find(
		f => f.phase === 'place' && f.range && f.range[0] === 0 && f.range[1] === 7
	);
	const after = place.array;
	return {
		0: place.pivotIndex,
		1: `[${after.join(', ')}]`,
		2: `[${after.slice(0, place.pivotIndex).join(', ')}]`,
		3: run.comparisons,
	};
};
RECIPES['quicksort-2'] = () => ({
	0: getQuickSortFrames([1, 2, 3, 4, 5, 6]).comparisons,
});

// Quickselect / RANDOMIZED-SELECT: the pivot's final index after the first
// PARTITION, the array after that partition, and the i-th order statistic are all
// re-derived from quickselectTrace on the same input the bank uses. The "what does
// it solve" and "worst/expected running time" choices are conceptual (STATIC).
RECIPES['quicksort-3'] = () => {
	const run = quickselectTrace([50, 80, 20, 90, 10, 70, 40, 60, 30], 4);
	return {
		0: run.firstPartition.pivotFinalIndex, // numeric: 0-based pivot landing index
		1: `[${run.firstPartition.array.join(', ')}]`, // choice: array after 1st partition
		3: run.selected, // numeric: the 4th-smallest = the return value
	};
};

// Heapsort: re-derive the whole sort from buildMaxHeapTrace + chained
// extractMaxTrace — the post-build heap, the first extracted max, the heap after
// two extractions, and the fully-sorted (maxima reversed) array. The "why
// n log n and in place" choice is conceptual (STATIC).
RECIPES['heaps-3'] = () => {
	const heap0 = buildMaxHeapTrace([4, 10, 3, 5, 1, 8, 7]).finalHeap;
	let heap = [...heap0];
	const maxes = [];
	const after = [];
	while (heap.length > 0) {
		const r = extractMaxTrace({ heap });
		maxes.push(r.max);
		heap = r.finalHeap;
		after.push([...heap]);
	}
	const sorted = [...maxes].reverse();
	return {
		0: `[${heap0.join(', ')}]`, // choice: post-build max-heap
		1: maxes[0], // numeric: first element extracted (the max)
		2: `[${after[1].join(', ')}]`, // choice: heap after the first 2 extractions
		3: `[${sorted.join(', ')}]`, // choice: final fully-sorted array
	};
};

// Trees-2 (BST delete, two-child): independently re-derive the successor, the
// in-order sequence after deletion, and the pre-order after deletion from the
// tree generators. The "why the successor preserves the BST property" choice is
// conceptual (STATIC).
RECIPES['trees-2'] = () => {
	const root = buildBst([60, 30, 90, 20, 45, 80, 100, 70, 75]);
	const inorder = inorderValues(root);
	const target = root.value; // delete the root (two children)
	const successor = inorder[inorder.indexOf(target) + 1];
	const after = deleteValue(root, target);
	const preSteps = getTraversalSteps(after, 'preorder');
	const afterPre = preSteps[preSteps.length - 1].output.map(Number);
	return {
		0: successor, // numeric: replacement key
		2: inorderValues(after).map(String), // order: in-order after delete
		3: `[${afterPre.join(', ')}]`, // choice: pre-order after delete
	};
};

RECIPES['trees-3'] = () => {
	// Re-implement the edge-convention height locally (empty = -1, leaf = 0) so
	// the re-derivation does not trust examSets.js's bstHeight.
	const height = node =>
		node == null ? -1 : 1 + Math.max(height(node.left), height(node.right));
	const insert = [40, 20, 60, 10, 30, 50, 70];
	const n = insert.length;
	const root = buildBst(insert);
	const sorted = [...insert].sort((a, b) => a - b);
	return {
		0: height(root), // numeric: height of the built (balanced) tree
		1: height(buildBst(sorted)), // numeric: degenerate chain height (n - 1)
		2: Math.floor(Math.log2(n)), // numeric: minimum height floor(log2 n)
		// part 3 ("why order determines height / balanced beats degenerate") is
		// conceptual; see STATIC below.
	};
};

// Comparison-sort lower bound: the two numeric parts (n! leaf count and the
// ⌈log₂ n!⌉ worst-case comparison bound) are re-derived from a fresh factorial;
// the three "why" choices are conceptual (STATIC).
RECIPES['sorting-3'] = () => {
	const factorial = n => {
		let product = 1;
		for (let i = 2; i <= n; i += 1) product *= i;
		return product;
	};
	const n = 5;
	return {
		0: factorial(n), // numeric: n! leaves = 120
		1: Math.ceil(Math.log2(factorial(n))), // numeric: ⌈log₂ n!⌉ = 7
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
	'mst-4#3': 'concept: the exchange argument (lightest crossing edge is safe)',
	'sssp-3#3': 'concept: why exactly |V|-1 passes',
	'apsp-1#3': 'concept: why k is the outermost loop',
	'apsp-2#3':
		'concept: transitive-closure analogue (min→OR, +→AND) of Floyd-Warshall',
	'apsp-3#2':
		'concept: transitive closure is the Θ(V³) boolean twin of Floyd-Warshall',
	'apsp-4#2':
		'concept: Slow-APSP is Θ(V⁴) (V−1 min-plus products at Θ(V³)); ' +
		'Θ(V³)=Floyd-Warshall, Θ(V³ lg V)=Faster-APSP/repeated-squaring',
	'linsort-1#3': 'concept: when counting sort is linear',
	'linsort-3#3':
		'concept: why bucket sort is expected Theta(n) (uniform spread)',
	'linsort-3#4': 'concept: one-bucket skew degrades bucket sort to Theta(n^2)',
	'graphs-1#3': 'concept: BFS-vs-DFS frontier discipline',
	'graphs-2#4': 'concept: a graph with a cycle has no topological order',
	'trees-2#1':
		'concept: successor fits between left subtree and rest of right subtree',
	'hashing-1#3': 'concept: why resize rehashes every key',
	'hashing-2#3':
		'concept: why expected lookup is O(1) (uniform hash + bounded alpha)',
	'maxflow-1#3': 'concept: Edmonds-Karp vs Ford-Fulkerson rule',
	'maxflow-2#4':
		'concept: no augmenting path ⇒ flow = a cut ⇒ optimal (max-flow=min-cut)',
	'foundations-1#1': 'concept: Θ class of n(n+1)/2',
	'foundations-1#2': 'concept: big-O simplification of 3n²+100n+7',
	'foundations-1#3': 'concept: meaning of amortized O(1)',
	'foundations-2#0': 'concept: order growth rates (fixed canonical sequence)',
	'foundations-2#3': 'concept: why quote worst-case',
	'sorting-1#3': 'concept: recurrence T(n)=2T(n/2)+Θ(n) solves to',
	'sorting-2#2': 'concept: left-on-tie gives stability',
	'sorting-3#2': 'concept: why there are n! leaves (one per input ordering)',
	'sorting-3#3': 'concept: log₂(n!)=Θ(n log n) (Stirling) ⇒ Ω(n log n)',
	'sorting-3#4':
		'concept: counting/radix do not compare ⇒ model does not apply',
	'heaps-3#4':
		'concept: build O(n) + n*ExtractMax O(log n) = Θ(n log n), in place',
	'quicksort-2#1': 'concept: T(n)=T(n-1)+n solves to Θ(n²)',
	'quicksort-2#2': 'concept: a random/median pivot avoids the worst case',
	'quicksort-3#2':
		'concept: Randomized-Select(A,1,n,i) returns the i-th smallest (i-th order statistic)',
	'quicksort-3#4':
		'concept: Randomized-Select is worst-case Θ(n²), expected Θ(n)',
	'master-3#2':
		'concept: the Case-3 regularity condition a·f(n/b) <= c·f(n), c<1',
	'master-3#5':
		'concept: f=n/log n is not polynomially comparable to n^c (gap; basic theorem n/a)',
	'master-4#1':
		'concept: T(n)=2^n−1 simplifies to Θ(2^n) (geometric sum collapses; constants drop)',
	'master-4#2':
		'concept: Master Theorem needs T(n/b) (divide); T(n-1) subtracts a constant, so it does not apply',
	'strategies-1#3': 'concept: greedy coin change not always optimal',
	'strategies-2#2': 'concept: why memoization is efficient',
	'strategies-3#3': 'concept: exchange argument; why greedy is optimal here',
	'strategies-4#3':
		'concept: Gale-Shapley always terminates with a stable matching and is man-optimal (each man gets his best partner in any stable matching)',
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
	'sssp-4#3':
		'concept: why a settled vertex is not final once a negative edge exists',
	'sssp-5#2':
		'concept: why DAG-SP needs one topological-order pass and tolerates negative edges (no cycle ⇒ no negative cycle)',
	'sssp-6#1':
		'concept: only Bellman-Ford handles negative edges on a general (cyclic) ' +
		'graph (Dijkstra needs non-negative; DAG-SP needs a DAG)',
	'sssp-6#2':
		'concept: BFS gives shortest-path distances only on an unweighted/equal-weight graph',
	'foundations-3#2':
		'concept: why amortized O(1) (geometric copies < 2n averaged over n appends)',
	'foundations-3#3':
		'concept: why a single worst-case append is still O(n) (the resize copies all elements)',
	'foundations-4#1':
		'concept: Θ(n) worst-case per op vs O(1) amortized (guaranteed average over the worst-case sequence, no probability)',
	'foundations-4#2':
		'concept: why geometric doubling gives O(1) amortized while constant-k growth gives Θ(n) amortized (Θ(n²/k) total)',
	'trees-3#3':
		'concept: insertion order fixes BST shape; balanced O(log n) vs degenerate O(n) search',
	'maxflow-3#3':
		'concept: why max-flow = max-matching (unit caps force an integral 0/1 flow into vertex-disjoint edges)',
	'np-3#3':
		'concept: reduction direction (known-hard INTO target) for NP-hardness',
	'np-3#4':
		'concept: the yes<->yes correctness guarantee (IS size ≥ s iff VC size ≤ n−s)',
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

// =============================================================================
// THE SEEDED-INSTANCE GUARDRAIL (extends the same discipline to fresh inputs).
// =============================================================================
//
// data/examInstances.js generates a FRESH input per seed and derives the answer
// from the same generator. The risk is identical to the fixed bank: a builder's
// read-off logic could drift from what the algorithm actually produces. So we hold
// it to the SAME standard — for each seedable set, across several seeds, we take
// the instance's OWN input (exposed as problem.__input) and RE-DERIVE every
// gradeable answer from the generator INDEPENDENTLY (these recipes call
// kruskalTrace / dijkstraTrace / … themselves; they do not trust the builder), then
// deep-equal it against the stored answer. Same seed → same instance → answer must
// match the generator. The fixed-bank STATIC allowlist (conceptual parts) carries
// over by index, since a seeded instance keeps each part's kind and position.

// The same read-off helpers the seeded recipes need (already declared above:
// mstEdgeLabel, weightMap, settleOrder, distVal, distAfterPass, cText, mergeOutput).

// A seeded recipe maps the instance INPUT → { partIndex → re-derived answer }, for
// the auto-gradable parts only. Conceptual parts are covered by SEEDED_STATIC.
const SEEDED_RECIPES = {
	'mst-1': ({ vertices, edges }) => {
		const w = weightMap(edges);
		const run = kruskalTrace({ vertices, edges });
		const accept = run.treeEdges.map(id => mstEdgeLabel(id, w));
		return { 0: accept, 1: run.totalWeight, 2: vertices.length - 1 };
	},
	'mst-2': ({ vertices, edges, start }) => {
		const w = weightMap(edges);
		const run = primTrace({ vertices, edges, start });
		const accept = run.treeEdges.map(id => mstEdgeLabel(id, w));
		return { 0: accept, 1: run.totalWeight, 2: accept[0] };
	},
	'sssp-1': ({ graph }) => {
		const run = dijkstraTrace(graph, { source: 'S' });
		return {
			0: settleOrder(run.frames),
			1: distVal(run.dist.A),
			2: distVal(run.dist.C),
		};
	},
	'sssp-2': ({ graph }) => {
		const run = bellmanFordTrace(graph, { source: 'S' });
		return { 1: distVal(run.dist.A), 2: distVal(run.dist.C) };
	},
	'sssp-3': ({ graph }) => {
		const run = bellmanFordTrace(graph, { source: 'S' });
		const pass1 = distAfterPass(run.frames, 1);
		return {
			0: distVal(pass1.D),
			1: distVal(run.dist.D),
			2: distVal(run.dist.C),
		};
	},
	'heaps-1': ({ array }) => {
		const run = buildMaxHeapTrace(array);
		const final = run.finalHeap;
		return {
			0: Math.floor(array.length / 2) - 1,
			1: `[${final.join(', ')}]`,
			2: final[0],
		};
	},
	'heaps-2': ({ heap }) => {
		const run = extractMaxTrace({ heap });
		const after = run.finalHeap;
		return { 0: run.max, 1: `[${after.join(', ')}]`, 2: after[0] };
	},
	'master-1': ({ params }) => {
		const r = analyseRecurrence(params);
		return { 0: cText(params.a, params.b), 1: r.name, 2: r.result };
	},
	'master-2': ({ params }) => {
		const r = analyseRecurrence(params);
		return { 0: cText(params.a, params.b), 1: r.name, 2: r.result };
	},
	'apsp-1': ({ graph }) => {
		const run = floydWarshall(graph);
		const ids = run.ids;
		const row1 = run.dist[ids.indexOf('1')];
		const d12 = distVal(row1[ids.indexOf('2')]);
		const d13 = distVal(row1[ids.indexOf('3')]);
		const d14 = distVal(row1[ids.indexOf('4')]);
		const l1 = run.layers[1];
		const l1_42 = distVal(l1[ids.indexOf('4')][ids.indexOf('2')]);
		return {
			0: d13,
			1: [
				`d[1][1] = 0`,
				`d[1][2] = ${d12}`,
				`d[1][3] = ${d13}`,
				`d[1][4] = ${d14}`,
			],
			2: l1_42,
		};
	},
	'linsort-1': ({ array }) => {
		const steps = getCountingSortStepsWithStats(array).steps;
		const last = steps[steps.length - 1];
		const counting = steps.filter(s => s.metadata.phase === 'counting');
		const count = counting[counting.length - 1].metadata.countArray;
		return {
			0: last.metadata.k,
			1: count[0],
			2: `[${last.array.join(', ')}]`,
		};
	},
	'linsort-2': ({ values }) => {
		const stable = radixWithSubroutine(values, true);
		const unstable = radixWithSubroutine(values, false);
		const onesStr = `[${stable.passes[0].after.join(', ')}]`;
		const unstableStr = `[${unstable.result.join(', ')}]`;
		return {
			0: onesStr,
			1: `[${stable.result.join(', ')}]`,
			2: `It is no longer sorted, e.g. ${unstableStr}`,
		};
	},
	'trees-1': ({ insertOrder, delValue }) => {
		const root = buildBst(insertOrder);
		const inorder = inorderValues(root);
		const pre = (() => {
			const steps = getTraversalSteps(root, 'preorder');
			return steps[steps.length - 1].output.map(Number);
		})();
		const successor = inorder[inorder.indexOf(delValue) + 1];
		const afterDel = deleteValue(root, delValue);
		const delInorder = inorderValues(afterDel);
		return {
			0: inorder.map(String),
			1: `root ${pre[0]}, left child ${pre[1]}`,
			2: successor,
			3: delInorder.map(String),
		};
	},
	'graphs-1': ({ graph, target }) => {
		const bfs = genericTraverse(graph, { discipline: 'fifo', start: 'A' });
		const dfs = genericTraverse(graph, { discipline: 'lifo', start: 'A' });
		return {
			0: bfs.visitOrder,
			1: distVal(bfs.dist[target]),
			2: dfs.visitOrder,
		};
	},
	// Seeded trace-step probes: re-run the same generator on the instance's OWN fresh
	// graph and re-derive the next decision off the frame stream — independent of the
	// builder's traceProbes.js read-off, so a seeded probe answer can only be the
	// algorithm's real next move on that fresh input.
	'sssp-probe-1': ({ graph }) => {
		const run = dijkstraTrace(graph, { source: 'S' });
		return {
			0: rederiveProbe(run.frames, {
				phase: 'settle',
				field: 'active',
				ordinal: 2,
			}).answer,
			1: rederiveProbe(run.frames, {
				phase: 'settle',
				field: 'active',
				ordinal: 3,
			}).answer,
		};
	},
	'graphs-probe-1': ({ graph }) => {
		const bfs = genericTraverse(graph, { discipline: 'fifo', start: 'A' });
		return {
			0: rederiveProbe(bfs.frames, {
				phase: 'extract',
				field: 'current',
				ordinal: 1,
			}).answer,
			1: rederiveProbe(bfs.frames, {
				phase: 'extract',
				field: 'current',
				ordinal: 2,
			}).answer,
		};
	},
	'hashing-1': ({ keys, capacity }) => {
		const entries = keys.map(k => ({ key: k, value: k.length }));
		const buckets = createBucketsFromEntries(entries, capacity);
		const collisions = buckets.filter(b => b.length > 1).length;
		const maxChain = Math.max(...buckets.map(b => b.length));
		const alpha = (keys.length / capacity).toFixed(2);
		return { 0: collisions, 1: maxChain, 2: alpha };
	},
	'maxflow-1': ({ network }) => {
		const run = edmondsKarpTrace(network);
		return {
			0: run.value,
			1: run.minCut.capacity,
			2: run.minCut.S.length,
		};
	},
	'foundations-1': ({ n }) => ({ 0: (n * (n + 1)) / 2 }),
	'foundations-2': ({ n }) => ({ 1: n, 2: 1 }),
	'stacks-queues-1': ({ ops }) => {
		const stackFinal = sqFrames('stack', [], ops).at(-1).items;
		const queueFinal = sqFrames('queue', [], ops).at(-1).items;
		const stackPops = stackFinal[stackFinal.length - 1];
		const queueDeq = queueFinal[0];
		return {
			0: `[${stackFinal.join(', ')}]`,
			1: `[${queueFinal.join(', ')}]`,
			2: `Stack pops ${stackPops}, queue dequeues ${queueDeq}`,
		};
	},
	'sorting-1': ({ array }) => {
		const run = getMergeSortStepsWithStats(array);
		const steps = run.steps;
		const leftStr = `[${mergeOutput(steps, 0, 3).join(', ')}]`;
		const finalStr = `[${steps[steps.length - 1].array.join(', ')}]`;
		return { 0: leftStr, 1: finalStr, 2: run.finalStats.comparisons };
	},
	'sorting-2': ({ left, right }) => {
		const run = getMergeSortStepsWithStats([...left, ...right]);
		const n = left.length + right.length;
		const mergedStr = `[${mergeOutput(run.steps, 0, n - 1).join(', ')}]`;
		return { 0: mergedStr, 1: Math.ceil(Math.log2(n)) };
	},
	'strategies-1': ({ coins, target }) => {
		const run = buildCoinChangeFrames({ target, coins });
		const dpTable = run.frames[run.frames.length - 1].dpTable;
		return {
			0: dpTable[4],
			1: run.summary.dpFinal,
			2: run.summary.greedyFinal,
		};
	},
	'strategies-2': ({ n }) => {
		const run = buildClimbingStairsFrames(n);
		const dpTable = run.frames[run.frames.length - 1].dpTable;
		return { 0: dpTable[4], 1: dpTable[n] };
	},
	'quicksort-1': ({ array }) => {
		const n = array.length;
		const run = getQuickSortFrames(array);
		const place = run.frames.find(
			f =>
				f.phase === 'place' &&
				f.range &&
				f.range[0] === 0 &&
				f.range[1] === n - 1
		);
		const after = place.array;
		return {
			0: place.pivotIndex,
			1: `[${after.join(', ')}]`,
			2: `[${after.slice(0, place.pivotIndex).join(', ')}]`,
			3: run.comparisons,
		};
	},
	'quicksort-2': ({ sorted }) => ({
		0: getQuickSortFrames(sorted).comparisons,
	}),
	'sorting-3': ({ n }) => {
		const factorial = m => {
			let product = 1;
			for (let i = 2; i <= m; i += 1) product *= i;
			return product;
		};
		return {
			0: factorial(n),
			1: Math.ceil(Math.log2(factorial(n))),
		};
	},
	'linsort-3': ({ values, numBuckets, probe }) => {
		const run = bucketSort(values, numBuckets);
		const probeBucket = run.bucketIndexOf(probe);
		return {
			0: probeBucket,
			1: run.buckets[probeBucket].map(String),
			2: run.sorted.map(String),
		};
	},
	'trees-2': ({ insertOrder, target }) => {
		const root = buildBst(insertOrder);
		const inorder = inorderValues(root);
		const successor = inorder[inorder.indexOf(target) + 1];
		const afterDel = deleteValue(root, target);
		const afterPre = (() => {
			const steps = getTraversalSteps(afterDel, 'preorder');
			return steps[steps.length - 1].output.map(Number);
		})();
		return {
			0: successor, // numeric: replacement key (in-order successor)
			2: inorderValues(afterDel).map(String), // order: in-order after delete
			3: `[${afterPre.join(', ')}]`, // choice: pre-order after delete
		};
	},
	'trees-3': ({ insertOrder }) => {
		// Re-implement the edge-convention height locally (empty = -1, leaf = 0) so
		// the re-derivation does not trust examInstances.js's bstHeight.
		const height = node =>
			node == null ? -1 : 1 + Math.max(height(node.left), height(node.right));
		const n = insertOrder.length;
		const root = buildBst(insertOrder);
		const sorted = [...insertOrder].sort((a, b) => a - b);
		return {
			0: height(root), // numeric: height of the built tree
			1: height(buildBst(sorted)), // numeric: degenerate chain height (n - 1)
			2: Math.floor(Math.log2(n)), // numeric: minimum height floor(log2 n)
		};
	},
	'heaps-3': ({ array }) => {
		const heap0 = buildMaxHeapTrace(array).finalHeap;
		let heap = [...heap0];
		const maxes = [];
		const after = [];
		while (heap.length > 0) {
			const r = extractMaxTrace({ heap });
			maxes.push(r.max);
			heap = r.finalHeap;
			after.push([...heap]);
		}
		const sorted = [...maxes].reverse();
		return {
			0: `[${heap0.join(', ')}]`, // choice: post-build max-heap
			1: maxes[0], // numeric: first element extracted (the max)
			2: `[${after[1].join(', ')}]`, // choice: heap after the first 2 extractions
			3: `[${sorted.join(', ')}]`, // choice: final fully-sorted array
		};
	},
	'graphs-2': ({ vertices, edges, candidate }) => {
		const t = topoSort(vertices, edges);
		const indegTarget = vertices.reduce((best, v) =>
			t.indegree[v] > t.indegree[best] ? v : best
		);
		return {
			0: t.order[0], // choice: first vertex emitted (the unique source)
			1: t.indegree[indegTarget], // numeric: largest in-degree
			2: t.order, // order: full topological order
			3: isValidTopoOrder(candidate, edges) ? 'Valid' : 'Invalid', // choice: validity
			// part 4 (cycle ⇒ no order) is conceptual → SEEDED_STATIC
		};
	},
	'mst-4': ({ edges, cut }) => {
		const { crossing, light } = crossingEdges(edges, cut);
		const label = e => `${e.u}–${e.v} (${e.w})`;
		return {
			0: crossing.map(label), // order: crossing edges, ascending weight
			1: label(light), // choice: the safe (lightest crossing) edge
			2: light.w, // numeric: its weight
			// part 3 (the exchange argument) is conceptual → SEEDED_STATIC
		};
	},
	'apsp-2': ({ graph }) => {
		const firstImprove = (layers, idx, i, j) => {
			for (let k = 1; k < layers.length; k++) {
				const prev = layers[k - 1][i][j];
				const cur = layers[k][i][j];
				if (JSON.stringify(prev) !== JSON.stringify(cur)) return idx[k - 1];
			}
			return null;
		};
		const run = floydWarshall(graph);
		const idx = run.ids;
		const ix = id => idx.indexOf(id);
		const l2_13 = distVal(run.layers[2][ix('1')][ix('3')]);
		const first14 = firstImprove(run.layers, idx, ix('1'), ix('4'));
		const fin14 = distVal(run.dist[ix('1')][ix('4')]);
		return {
			0: l2_13, // numeric: d[1][3] after k=2
			1: `Vertex ${first14}`, // choice: first vertex to lower d[1][4]
			2: fin14, // numeric: final d[1][4]
		};
	},
	'maxflow-2': ({ network }) => {
		const run = edmondsKarpTrace(network);
		const first = run.frames.find(f => f.bottleneck != null);
		return {
			0: first.bottleneck, // numeric: first augmenting path's bottleneck
			1: run.value, // numeric: max-flow value
			2: run.minCut.capacity, // numeric: min-cut capacity (= max flow)
			3: run.minCut.S.includes('D') // choice: which side D is on
				? 'Source side (with S)'
				: 'Sink side (with T)',
		};
	},
	'maxflow-3': ({ bipartite }) => {
		// Re-encode the SAME fresh bipartite graph into the SAME unit-capacity
		// network, independently of the builder, then read every key off run.value.
		const left = ['L1', 'L2', 'L3', 'L4'];
		const right = ['R1', 'R2', 'R3', 'R4'];
		const network = {
			nodes: ['S', ...left, ...right, 'T'].map(id => ({ id })),
			source: 'S',
			sink: 'T',
			edges: [
				...left.map(l => ({ from: 'S', to: l, capacity: 1 })),
				...bipartite.map(([l, r]) => ({ from: l, to: r, capacity: 1 })),
				...right.map(r => ({ from: r, to: 'T', capacity: 1 })),
			],
		};
		const run = edmondsKarpTrace(network);
		const matching = run.value;
		const perfect = matching === left.length;
		return {
			0: matching, // numeric: maximum matching size (= max-flow value)
			1: perfect // choice: does a perfect matching exist (derived option string)
				? `Yes, every left vertex is matched (size ${matching} = |L| = ${left.length})`
				: `No, the maximum matching has size ${matching}, below |L| = ${left.length}`,
			2: right.length - matching, // numeric: unmatched right vertices
		};
	},
	'sssp-4': ({ graph }) => {
		const dij = dijkstraTrace(graph, { source: 'S' });
		const bf = bellmanFordTrace(graph, { source: 'S' });
		const wrong = graph.edges.find(e => e.weight < 0).to; // head of the neg edge
		return {
			0: distVal(dij.dist.A), // numeric: distance Dijkstra REPORTS for A (wrong)
			1: distVal(bf.dist.A), // numeric: TRUE shortest dist[A] (Bellman-Ford)
			2: wrong, // choice: the vertex Dijkstra gets wrong (= 'A')
		};
	},
	'master-3': ({ t3, t4 }) => {
		const r3 = analyseRecurrence(t3);
		const r4 = analyseRecurrence(t4);
		return {
			0: r3.name, // choice: T3 case (Case 3)
			1: r3.result, // choice: T3 Θ bound
			3: r4.name, // choice: T4 case (Case 3)
			4: r4.result, // choice: T4 Θ bound
		};
	},
	'foundations-3': ({ n }) => {
		// Re-derive the doubling counts from first principles (independent of the
		// builder): start at capacity 1, double when full, copy only at resizes.
		const simulate = count => {
			let capacity = 1;
			let size = 0;
			let copies = 0;
			let doublings = 0;
			for (let i = 0; i < count; i += 1) {
				if (size === capacity) {
					copies += size;
					capacity *= 2;
					doublings += 1;
				}
				size += 1;
			}
			return { copies, doublings };
		};
		const sim = simulate(n);
		return {
			0: sim.copies, // numeric: total element copies across resizes
			1: sim.doublings, // numeric: number of doublings
		};
	},
	'hashing-2': ({ keys, capacity }) => {
		const entries = keys.map(k => ({ key: k, value: k.length }));
		const after = createBucketsFromEntries(entries, capacity * 2);
		const probeAfter = after.findIndex(b => b.some(e => e.key === keys[0]));
		return {
			0: keys.length / capacity, // numeric: load factor alpha before resize
			1: Math.max(...after.map(b => b.length)), // numeric: longest chain after resize
			2: probeAfter, // numeric: keys[0]'s bucket once m doubles
		};
	},
	'strategies-3': ({ activities }) => {
		const run = activitySelect(activities);
		return {
			0: run.selectedIds[0], // choice: first activity picked
			1: run.count, // numeric: maximum compatible activities
			2: `{${run.selectedIds.join(', ')}}`, // choice: the full selected set
		};
	},
	'np-3': ({ n }) => {
		// Re-derive the reduction's size arithmetic INDEPENDENTLY: |VC| = n - |IS|,
		// max IS of C_n = floor(n/2), min VC = n - floor(n/2). Same formula as the
		// builder, recomputed from first principles.
		const vcIsSize = (total, size) => total - size;
		const maxIs = Math.floor(n / 2);
		const minVc = vcIsSize(n, maxIs);
		return {
			0: vcIsSize(n, maxIs), // numeric: VC from a size-(maxIs) independent set
			1: vcIsSize(n, minVc + 1), // numeric: IS from a size-(minVc+1) vertex cover
			2: minVc, // numeric: minimum vertex cover from the maximum IS
		};
	},
};

// Conceptual parts of a seeded instance (same index → same kind as the fixed set).
// Mirrors the relevant entries of STATIC for the seedable sets only.
const SEEDED_STATIC = new Set([
	'mst-1#3',
	'sssp-1#3',
	'sssp-2#0',
	'sssp-2#3',
	'sssp-3#3',
	'apsp-1#3',
	'linsort-1#3',
	'graphs-1#3',
	'hashing-1#3',
	'maxflow-1#3',
	'foundations-1#1',
	'foundations-1#2',
	'foundations-1#3',
	'foundations-2#0',
	'foundations-2#3',
	'stacks-queues-1', // all three parts re-derived; no static — sentinel unused
	'sorting-1#3',
	'sorting-2#2',
	'strategies-1#3',
	'strategies-2#2',
	'quicksort-2#1', // concept: T(n)=T(n-1)+n solves to Θ(n²)
	'quicksort-2#2', // concept: a random/median pivot avoids the worst case
	'sorting-3#2', // concept: why there are n! leaves (one per input ordering)
	'sorting-3#3', // concept: log₂(n!)=Θ(n log n) (Stirling) ⇒ Ω(n log n)
	'sorting-3#4', // concept: counting/radix do not compare ⇒ model does not apply
	'linsort-3#3', // concept: why bucket sort is expected Θ(n) (uniform spread)
	'linsort-3#4', // concept: one-bucket skew degrades bucket sort to Θ(n²)
	'trees-2#1', // concept: successor fits between left subtree and rest of right subtree
	'trees-3#3', // concept: insertion order fixes BST shape; balanced O(log n) vs degenerate O(n)
	'heaps-3#4', // concept: build O(n) + n*ExtractMax O(log n) = Theta(n log n), in place
	'graphs-2#4',
	'mst-4#3',
	'apsp-2#3',
	'maxflow-2#4',
	'maxflow-3#3',
	'sssp-4#3',
	'master-3#2',
	'master-3#5',
	'foundations-3#2',
	'foundations-3#3',
	'hashing-2#3',
	'strategies-3#3',
	'np-3#3',
	'np-3#4',
]);

// A handful of seeds exercised per set: determinism + correctness across instances.
const SEEDS = [1, 2, 7, 42, 1234, 99999];

// Sanity: every seedable set declares a seeded recipe (a new seedable builder
// cannot slip in unchecked).
test('every seedable set has a seeded re-derivation recipe', () => {
	const missing = SEEDABLE_SET_IDS.filter(id => !(id in SEEDED_RECIPES));
	assert.deepEqual(
		missing,
		[],
		`seedable set(s) without a seeded recipe in examSets.test.js: ${missing.join(
			', '
		)}.`
	);
});

// Determinism: the SAME seed yields the byte-identical instance (deep-equal).
test('seeded instances are deterministic in the seed', () => {
	for (const id of SEEDABLE_SET_IDS) {
		for (const seed of SEEDS) {
			const a = buildInstanceProblem(id, seed);
			const b = buildInstanceProblem(id, seed);
			assert.deepEqual(
				a,
				b,
				`${id} @ seed ${seed} is not deterministic (two builds differ)`
			);
		}
	}
});

// Variety: different seeds yield different instances (so a "retake" is genuinely a
// new problem). We compare the gradeable answers across seeds: at least two
// DISTINCT answer-signatures must appear, or the set is effectively fixed.
test('seeded instances vary across seeds (a retake is a fresh problem)', () => {
	const wideSeeds = Array.from({ length: 24 }, (_, i) => i * 1009 + 3);
	for (const id of SEEDABLE_SET_IDS) {
		const sigs = new Set(
			wideSeeds.map(seed => {
				const p = buildInstanceProblem(id, seed);
				// Signature = the ordered list of every part's answer (the load-bearing,
				// gradeable content). If this varies, the instance is genuinely fresh.
				return JSON.stringify(p.parts.map(part => part.answer));
			})
		);
		assert.ok(
			sigs.size > 1,
			`${id} produced only ${sigs.size} distinct answer-signature across ` +
				`${wideSeeds.length} seeds — it is not varying like a fresh instance should.`
		);
	}
});

// THE HEART: every gradeable answer of every seeded instance is RE-DERIVED from the
// generator on the instance's own input, and must deep-equal the stored answer.
for (const id of SEEDABLE_SET_IDS) {
	const recipe = SEEDED_RECIPES[id];
	if (!recipe) continue; // covered by the sanity test above

	test(`[${id}] seeded instances: every gradeable answer re-derives from its generator`, () => {
		for (const seed of SEEDS) {
			const problem = buildInstanceProblem(id, seed);
			assert.ok(
				problem && problem.__input,
				`${id} @ seed ${seed}: instance is missing __input (cannot re-derive)`
			);
			const expectedByIndex = recipe(problem.__input);
			problem.parts.forEach((part, i) => {
				const key = `${id}#${i}`;
				if (i in expectedByIndex) {
					assert.deepEqual(
						part.answer,
						expectedByIndex[i],
						`SEEDED DRIFT: ${id} @ seed ${seed} part ${i} (${part.kind}) stored ` +
							`answer ${JSON.stringify(part.answer)} does not match the ` +
							`re-derived ${JSON.stringify(expectedByIndex[i])}. The builder's ` +
							`read-off has drifted from the generator.`
					);
				} else {
					// Not re-derived ⇒ must be a conceptual part (same index as the fixed
					// set's STATIC) — never a silent gap.
					assert.ok(
						SEEDED_STATIC.has(key) || SEEDED_STATIC.has(id),
						`UNCOVERED SEEDED PART: ${id} @ seed ${seed} part ${i} (${part.kind}) ` +
							`is neither re-derived nor a known conceptual part. Add a derivation ` +
							`for index ${i} to SEEDED_RECIPES['${id}'].`
					);
				}
				// Structural validity that must hold on EVERY instance, every seed:
				if (part.kind === 'choice') {
					assert.ok(
						part.options.includes(part.answer),
						`${id} @ seed ${seed} part ${i}: choice answer is not among its options`
					);
					assert.equal(
						new Set(part.options).size,
						part.options.length,
						`${id} @ seed ${seed} part ${i}: choice options contain a duplicate`
					);
				}
				// A trace-step probe is a choice over the undecided vertices: the answer
				// must be present, no duplicate options, and it must carry a frozen frame
				// (the canvas IS the question — never a probe without its state).
				if (part.kind === 'stepProbe') {
					assert.ok(
						part.options.includes(part.answer),
						`${id} @ seed ${seed} part ${i}: stepProbe answer is not among its options`
					);
					assert.equal(
						new Set(part.options).size,
						part.options.length,
						`${id} @ seed ${seed} part ${i}: stepProbe options contain a duplicate`
					);
					assert.ok(
						part.frame && part.view,
						`${id} @ seed ${seed} part ${i}: stepProbe is missing its frozen frame/view`
					);
				}
				if (part.kind === 'order') {
					assert.deepEqual(
						[...part.items].sort(),
						[...part.answer].sort(),
						`${id} @ seed ${seed} part ${i}: order answer is not a permutation of its items`
					);
				}
			});
		}
	});
}

// Back-compat: a seedless sitting is the FIXED bank, by reference. buildExamSets()
// (and falsy seeds) must return EXAM_SETS unchanged, so the seedless path is
// literally the old behaviour the rest of the app depends on.
test('buildExamSets() with no/falsy seed returns the fixed bank by reference', () => {
	assert.equal(buildExamSets(), EXAM_SETS);
	assert.equal(buildExamSets(null), EXAM_SETS);
	assert.equal(buildExamSets(0), EXAM_SETS);
	assert.equal(buildExamSets(''), EXAM_SETS);
});

// =============================================================================
// TRACE-STEP PROBE HONESTY (the canvas IS the generator's real state).
// =============================================================================
//
// A 'stepProbe' part freezes a generator frame as the question. Two things must
// hold for it to be honest: (1) the stored `frame` is the generator's REAL frame
// just before the probed decision (frames[decisionIndex − 1]) — not a hand-built
// picture; and (2) the stored `answer` is exactly that decision frame's chosen
// vertex. We re-run the generator (fixed input AND each seeded input) and re-derive
// both INDEPENDENTLY of traceProbes.js (via rederiveProbe), then deep-equal. If the
// builder ever drew its own picture or typed its own "next", this fails.

// (set id) → how to re-run the generator + which decision phase/field/ordinals it
// probes. Mirrors the bank's probe wiring, re-derived here from first principles.
const PROBE_SPECS = {
	'sssp-probe-1': {
		run: graph => dijkstraTrace(graph, { source: 'S' }),
		phase: 'settle',
		field: 'active',
		ordinals: [2, 3],
	},
	'graphs-probe-1': {
		run: graph => genericTraverse(graph, { discipline: 'fifo', start: 'A' }),
		phase: 'extract',
		field: 'current',
		ordinals: [1, 2],
	},
};

// The fixed input each probe set derives from (replicated, like the rest of this
// file). sssp-probe-1 reuses S1_GRAPH; graphs-probe-1 reuses G1_GRAPH.
const FIXED_PROBE_GRAPH = {
	'sssp-probe-1': S1_GRAPH,
	'graphs-probe-1': G1_GRAPH,
};

for (const [setId, spec] of Object.entries(PROBE_SPECS)) {
	test(`[${setId}] FIXED probe: the frozen frame and next-decision answer are the generator's real frame stream`, () => {
		const set = EXAM_SETS.find(s => s.id === setId);
		assert.ok(set, `${setId} is not in EXAM_SETS`);
		const run = spec.run(FIXED_PROBE_GRAPH[setId]);
		set.problem.parts.forEach((part, i) => {
			assert.equal(
				part.kind,
				'stepProbe',
				`${setId} part ${i} is not a stepProbe`
			);
			const expected = rederiveProbe(run.frames, {
				phase: spec.phase,
				field: spec.field,
				ordinal: spec.ordinals[i],
			});
			assert.ok(
				expected,
				`${setId} part ${i}: re-derivation found no probe frame`
			);
			// The depicted state is the generator's real frame, not a sketch.
			assert.deepEqual(
				part.frame,
				expected.frozen,
				`${setId} part ${i}: stored frozen frame is not the generator's frame just ` +
					`before the probed decision (the picture would be a fabrication).`
			);
			// The graded answer is the algorithm's real next decision.
			assert.equal(
				part.answer,
				expected.answer,
				`${setId} part ${i}: stored answer is not the next decision the generator makes`
			);
			// And the answer must be reachable as an option.
			assert.ok(
				part.options.includes(part.answer),
				`${setId} part ${i}: answer not among the probe options`
			);
		});
	});

	test(`[${setId}] SEEDED probe: every seed's frozen frame + answer re-derive from the generator on the instance's own graph`, () => {
		for (const seed of SEEDS) {
			const problem = buildInstanceProblem(setId, seed);
			assert.ok(
				problem && problem.__input && problem.__input.graph,
				`${setId} @ seed ${seed}: instance is missing __input.graph`
			);
			const run = spec.run(problem.__input.graph);
			problem.parts.forEach((part, i) => {
				assert.equal(
					part.kind,
					'stepProbe',
					`${setId} @ seed ${seed} part ${i} is not a stepProbe`
				);
				const expected = rederiveProbe(run.frames, {
					phase: spec.phase,
					field: spec.field,
					ordinal: spec.ordinals[i],
				});
				assert.ok(
					expected,
					`${setId} @ seed ${seed} part ${i}: re-derivation found no probe frame`
				);
				assert.deepEqual(
					part.frame,
					expected.frozen,
					`SEEDED PROBE DRIFT: ${setId} @ seed ${seed} part ${i}: stored frozen frame ` +
						`is not the generator's frame just before the probed decision.`
				);
				assert.equal(
					part.answer,
					expected.answer,
					`SEEDED PROBE DRIFT: ${setId} @ seed ${seed} part ${i}: stored answer is not ` +
						`the next decision the generator makes on this fresh graph.`
				);
				assert.ok(
					part.options.includes(part.answer),
					`${setId} @ seed ${seed} part ${i}: answer not among the probe options`
				);
			});
		}
	});
}

// A seeded sitting preserves the bank ENVELOPE (ids, topicIds, order, length) and
// only swaps the problem on seedable sets — so grouping / weak-exam selection /
// by-topic scoring all keep working on a seeded sitting.
test('a seeded sitting keeps the bank envelope; only seedable problems change', () => {
	const seeded = buildExamSets(42);
	assert.equal(seeded.length, EXAM_SETS.length, 'set count changed');
	seeded.forEach((set, i) => {
		const fixed = EXAM_SETS[i];
		assert.equal(set.id, fixed.id, `set ${i} id changed`);
		assert.equal(set.topicId, fixed.topicId, `set ${set.id} topicId changed`);
		assert.equal(
			set.topicName,
			fixed.topicName,
			`set ${set.id} topicName changed`
		);
		assert.equal(set.problem.kind, 'problem');
		if (isSeedable(set.id)) {
			// Seedable: a fresh instance, so it should NOT be the identical object.
			assert.notEqual(
				set.problem,
				fixed.problem,
				`${set.id} is seedable but the seeded sitting kept the fixed problem`
			);
		} else {
			// Conceptual: the fixed problem is reused verbatim (by reference).
			assert.equal(
				set.problem,
				fixed.problem,
				`${set.id} is not seedable but the seeded sitting changed its problem`
			);
		}
	});
});
