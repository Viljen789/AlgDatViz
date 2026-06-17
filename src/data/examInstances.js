// examInstances — the SEEDED FRESH-INSTANCE layer for the exam bank.
//
// THE PROBLEM THIS SOLVES (council idea #5). data/examSets.js derives every
// answer from a pure generator, but on a FIXED input. So an exam "retake" re-runs
// the IDENTICAL problem, and a 1am crammer can memorize "the MST is 11" instead of
// learning to run Kruskal. The substrate to fix this already exists: the *Trace
// generators are pure over ARBITRARY input, and mulberry32 (a seeded PRNG) ships
// in components/Review/reviewBank.js.
//
// THE MECHANISM. Given a seed, we deterministically generate a FRESH, well-formed
// input for a problem — a different graph / array / recurrence of the SAME SHAPE
// and difficulty — via the seeded PRNG, then derive the answer from the SAME pure,
// unit-tested generator on that fresh input. A sitting is URL-seedable, so
// "retake" = a new seed = a new instance of the same shape. The answer is STILL
// whatever the algorithm actually produces — un-memorizable, still provably correct.
//
// CORRECTNESS CULTURE (unchanged, extended). Like examSets.js, every gradeable key
// here is DERIVED, never hand-typed: each builder calls the same generator
// (kruskalTrace / dijkstraTrace / buildMaxHeapTrace / analyseRecurrence / …) on the
// freshly-generated input and reads the key off the result. examSets.test.js is
// extended to RE-DERIVE seeded instances too: same seed → same instance → answer
// must equal the generator's output. So a seeded answer can only ever be what the
// algorithm produces.
//
// INPUT-SPACE CONSTRAINTS (the whole game). A randomly-thrown graph is usually
// invalid as an exam item: disconnected, negative where the algorithm forbids it,
// tied so the answer is not unique, or the wrong size. Each generator below
// constrains its input space DELIBERATELY (and documents the constraints inline) so
// every instance is connected where it must be, non-negative where the algorithm
// needs it, the right vertex/element count, and (where the question demands a single
// answer) UNIQUE. We REJECTION-SAMPLE: draw, validate, redraw with the next sub-seed
// until the instance is exam-appropriate. The PRNG makes that loop deterministic.
//
// SEEDABLE vs FIXED. The builders registry below covers the cleanly-seedable
// problem types (graph / array / recurrence traces + the closed-form numeric ones).
// Three sets are GENUINELY conceptual — they have no input to vary, only a
// which-structure / which-class / reduction-direction choice — and are left fixed:
//     stacks-queues-2  (undo wants a stack; print queue wants a FIFO; queue→BFS)
//     np-1             (classify P / NP-complete / undecidable; defn of NP-complete)
//     np-2             (reduction direction; P=NP from one poly NP-complete algo)
// A set with no builder here simply falls back to its fixed examSets.js problem, so
// coverage can grow incrementally and back-compat is automatic.

import { mulberry32, toSeed } from '../components/Review/reviewBank.js';

import {
	kruskalTrace,
	primTrace,
	crossingEdges,
	edgeEndpoints,
} from '../components/Mst/mstTrace.js';
import {
	dijkstraTrace,
	bellmanFordTrace,
} from '../components/ShortestPaths/relaxTrace.js';
import {
	buildMaxHeapTrace,
	extractMaxTrace,
	isMaxHeap,
} from '../components/Heaps/heapTrace.js';
import { analyseRecurrence } from '../components/MasterTheorem/masterMath.js';
import { floydWarshall } from '../components/AllPairsShortestPaths/fwTrace.js';
import { getCountingSortStepsWithStats } from '../utils/sorting/algorithms/countingSort.js';
import { radixWithSubroutine } from '../components/LinearTimeSorting/stability.js';
import { getQuickSortFrames } from '../utils/sorting/quickPartitionFrames.js';
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
import {
	buildCoinChangeFrames,
	buildClimbingStairsFrames,
} from '../components/Strategies/coinChangeFrames.js';
import { dijkstraSettleProbe, bfsDequeueProbe } from './traceProbes.js';
import { activitySelect } from '../components/Strategies/activitySelect.js';

// ── PRNG helpers (thin, deterministic) ───────────────────────────────────────
//
// A `rng` is a mulberry32 stream (a 0-arg function → float in [0,1)). All the
// drawing primitives below are pure given a stream, so the same seed reproduces
// the same instance — the determinism the guardrail test relies on.

// An integer in [lo, hi] inclusive.
const int = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

// A uniformly random element of `arr`.
const pick = (rng, arr) => arr[int(rng, 0, arr.length - 1)];

// A seeded Fisher-Yates shuffle (new array; input untouched).
const shuffle = (rng, arr) => {
	const out = [...arr];
	for (let i = out.length - 1; i > 0; i -= 1) {
		const j = int(rng, 0, i);
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
};

// `count` DISTINCT integers drawn from [lo, hi] (count ≤ range size). Used where
// duplicate keys would break uniqueness (BST keys, distinct edge weights, …).
const distinctInts = (rng, count, lo, hi) => {
	const pool = [];
	for (let v = lo; v <= hi; v += 1) pool.push(v);
	return shuffle(rng, pool).slice(0, count);
};

// Reject-and-redraw: call `draw(stream)` with successive sub-seeds until `ok`
// returns true, so a constrained instance is found DETERMINISTICALLY. `baseSeed`
// seeds attempt 0; attempt k uses baseSeed^(k*2654435761) so the streams diverge.
// `cap` bounds the search; the constraints below are loose enough that a valid
// draw is found in a handful of attempts, and the cap only guards against a logic
// bug (a hit means the constraint is unsatisfiable, which a test would surface).
const rejectionSample = (baseSeed, draw, ok, cap = 200) => {
	for (let k = 0; k < cap; k += 1) {
		const stream = mulberry32((baseSeed ^ Math.imul(k, 2654435761)) >>> 0);
		const candidate = draw(stream);
		if (ok(candidate)) return candidate;
	}
	// Unreachable for the documented constraints; surfaced loudly if a builder's
	// constraint is ever made unsatisfiable.
	throw new Error(
		'examInstances: rejection sampling exhausted — constraint unsatisfiable'
	);
};

// ── derivation helpers (replicated 1:1 from examSets.js) ─────────────────────
// Same read-off logic the fixed bank uses, so a seeded answer is derived exactly
// like a fixed one.

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

// Master-theorem c = log_b(a), formatted exactly as examSets.js's cText.
const cText = (a, b) => {
	const c = Math.log(a) / Math.log(b);
	return Number.isInteger(c) ? String(c) : c.toFixed(2);
};

// Local n^x formatter mirroring examSets.formatNForExam / masterMath.formatPower.
const formatNForExam = x => {
	if (Math.abs(x) < 0.001) return '1';
	if (Math.abs(x - 1) < 0.001) return 'n';
	const rounded = Number.isInteger(x)
		? String(x)
		: x.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
	return `n^${rounded}`;
};

// ── small graph-shape primitives shared by several builders ──────────────────

// A connected UNDIRECTED graph on `vertices` (labels), built as a random spanning
// tree (guarantees connectivity) plus a few extra random edges, with DISTINCT
// weights drawn from [wLo, wHi] (distinct ⇒ the MST is unique, so the order/weight
// answers are single-valued). Returns { edges:[{u,v,w}] }.
const connectedWeightedGraph = (rng, vertices, { extra, wLo, wHi }) => {
	const n = vertices.length;
	const present = new Set(); // canonical "a|b" keys already placed
	const edges = [];
	const keyOf = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

	// Distinct weights: enough for the spanning tree (n-1) plus the extras.
	const need = n - 1 + extra;
	const weights = distinctInts(rng, need, wLo, wHi);
	let wi = 0;

	// Random spanning tree: attach each new vertex (in a shuffled order) to a
	// random already-connected vertex. This alone makes the graph connected.
	const order = shuffle(rng, vertices);
	const connected = [order[0]];
	for (let i = 1; i < n; i += 1) {
		const v = order[i];
		const u = pick(rng, connected);
		edges.push({ u, v, w: weights[wi++] });
		present.add(keyOf(u, v));
		connected.push(v);
	}

	// A few extra non-tree edges (no self-loops, no duplicates) to make the MST
	// choice non-trivial. If the small vertex set saturates, we simply stop.
	let guard = 0;
	while (edges.length < n - 1 + extra && guard < 200) {
		guard += 1;
		const a = pick(rng, vertices);
		const b = pick(rng, vertices);
		if (a === b) continue;
		const key = keyOf(a, b);
		if (present.has(key)) continue;
		present.add(key);
		edges.push({ u: a, v: b, w: weights[wi++] });
	}
	return { edges };
};

// A connected UNDIRECTED, UNWEIGHTED graph on `vertices` (labels): a random
// spanning tree (connectivity) plus `extra` random non-tree edges, as {from,to}
// pairs. Used by the BFS/DFS builder, where edge weights are irrelevant.
const connectedUnweightedGraph = (rng, vertices, { extra }) => {
	const n = vertices.length;
	const present = new Set();
	const edges = [];
	const keyOf = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

	// Random spanning tree: attach each new vertex to a random connected one.
	const order = shuffle(rng, vertices);
	const connected = [order[0]];
	for (let i = 1; i < n; i += 1) {
		const v = order[i];
		const u = pick(rng, connected);
		edges.push({ from: u, to: v });
		present.add(keyOf(u, v));
		connected.push(v);
	}
	// A few extra non-tree edges (no self-loops, no duplicates).
	let guard = 0;
	while (edges.length < n - 1 + extra && guard < 200) {
		guard += 1;
		const a = pick(rng, vertices);
		const b = pick(rng, vertices);
		if (a === b) continue;
		const key = keyOf(a, b);
		if (present.has(key)) continue;
		present.add(key);
		edges.push({ from: a, to: b });
	}
	return { edges };
};

// A readable "A–B(3), C–D(1)" listing of an undirected weighted edge list.
const listUndirected = edges =>
	edges.map(e => `${e.u}–${e.v}(${e.w})`).join(', ');

// A readable "S→A(4), B→C(1)" listing of a directed weighted edge list.
const listDirected = edges =>
	edges.map(e => `${e.from}→${e.to}(${e.weight})`).join(', ');

// =============================================================================
// MST — Kruskal (mst-1) and Prim (mst-2). Fresh connected weighted graph with
// DISTINCT weights ⇒ unique MST; answers (acceptance order, total weight) derived
// from kruskalTrace / primTrace.
// =============================================================================

// Constraints: 5 vertices A..E, distinct weights in 1..20 (unique MST), and we
// require the random graph to have at least one NON-tree edge that gets rejected,
// so the "skip the cycle-closing edge" idea actually fires (otherwise every edge
// is accepted and the order question is trivial).
const mst1 = seed => {
	const V = ['A', 'B', 'C', 'D', 'E'];
	const { edges } = rejectionSample(
		seed,
		stream => connectedWeightedGraph(stream, V, { extra: 2, wLo: 1, wHi: 20 }),
		g => {
			const run = kruskalTrace({ vertices: V, edges: g.edges });
			// Unique-ish + non-trivial: exactly n-1 tree edges AND at least one edge
			// was rejected (a cycle was skipped). Distinct weights already give a
			// unique MST, so this only enforces "interesting".
			return (
				run.treeEdges.length === V.length - 1 && g.edges.length > V.length - 1
			);
		}
	);
	const w = weightMap(edges);
	const run = kruskalTrace({ vertices: V, edges });
	const accept = run.treeEdges.map(id => mstEdgeLabel(id, w));
	const itemsShuffled = [...accept].slice().reverse();
	return {
		kind: 'problem',
		// The fresh input this instance was derived from, exposed for the guardrail
		// test to RE-DERIVE the answers from the generator (never read for grading).
		__input: { vertices: V, edges },
		stem:
			`Undirected weighted graph G with vertices ${V.join(', ')} and edges ` +
			`${listUndirected(edges)}. Run Kruskal’s algorithm on G.`,
		parts: [
			{
				kind: 'order',
				prompt:
					'Arrange the edges Kruskal ADDS to the MST, in the order it accepts them ' +
					'(ascending weight, skipping any edge that would close a cycle).',
				items: itemsShuffled,
				answer: accept,
				explanation:
					'Kruskal sorts edges ascending and adds each one whose endpoints are in ' +
					`different components. The accepted edges, in order, are ${accept.join(
						', '
					)}.`,
			},
			{
				kind: 'numeric',
				prompt: 'What is the total weight of the minimum spanning tree?',
				answer: run.totalWeight,
				placeholder: 'total weight',
				explanation:
					`Summing the accepted edge weights gives ${run.totalWeight}. ` +
					'Both Kruskal and Prim reach this same minimum.',
			},
			{
				kind: 'numeric',
				prompt:
					`G has ${V.length} vertices. How many edges does its spanning tree ` +
					'contain?',
				answer: V.length - 1,
				placeholder: 'a count',
				explanation:
					`A spanning tree on n vertices has exactly n − 1 edges, so ${V.length} ` +
					`− 1 = ${V.length - 1}.`,
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
};

// Constraints: 4 vertices A..D, distinct weights 1..20 (unique MST), start = A.
// We require the two edges leaving A to have DIFFERENT weights so the "which edge
// first" choice has one answer, and a non-tree edge so Prim's frontier is real.
const mst2 = seed => {
	const V = ['A', 'B', 'C', 'D'];
	const start = 'A';
	const { edges } = rejectionSample(
		seed,
		stream => connectedWeightedGraph(stream, V, { extra: 1, wLo: 1, wHi: 20 }),
		g => {
			const run = primTrace({ vertices: V, edges: g.edges, start });
			const fromStart = g.edges.filter(e => e.u === start || e.v === start);
			return (
				run.treeEdges.length === V.length - 1 &&
				fromStart.length >= 2 && // A has at least two incident edges
				g.edges.length > V.length - 1
			);
		}
	);
	const w = weightMap(edges);
	const run = primTrace({ vertices: V, edges, start });
	const accept = run.treeEdges.map(id => mstEdgeLabel(id, w));
	const itemsShuffled = [...accept].slice().reverse();
	// Distractors for the "first edge" choice: the other edges leaving A, plus a
	// non-incident edge — all derived from the instance, never hand-typed.
	const firstEdgeDistractors = edges
		.filter(e => e.u === start || e.v === start)
		.map(e => mstEdgeLabel(weightMap([e]).keys().next().value, weightMap([e])))
		.filter(lbl => lbl !== accept[0])
		.slice(0, 2);
	const choiceOptions = [
		accept[0],
		...firstEdgeDistractors,
		// a guaranteed extra distractor: the heaviest edge label
		mstEdgeLabel([...w.keys()].sort((a, b) => w.get(b) - w.get(a))[0], w),
	]
		.filter((o, i, arr) => arr.indexOf(o) === i)
		.slice(0, 4);
	return {
		kind: 'problem',
		__input: { vertices: V, edges, start },
		stem:
			`Undirected weighted graph H with vertices ${V.join(', ')} and edges ` +
			`${listUndirected(edges)}. Run Prim’s algorithm starting at ${start}.`,
		parts: [
			{
				kind: 'order',
				prompt:
					'Arrange the edges Prim adds, in order. At each step Prim takes the ' +
					'lightest edge crossing the (tree, rest) cut.',
				items: itemsShuffled,
				answer: accept,
				explanation:
					`Starting at ${start}, the lightest crossing edge each step gives ` +
					`${accept.join(', ')}.`,
			},
			{
				kind: 'numeric',
				prompt: 'What is the total weight of the minimum spanning tree?',
				answer: run.totalWeight,
				placeholder: 'total weight',
				explanation:
					`The accepted edges sum to ${run.totalWeight}. Prim from any start ` +
					'reaches the same minimum weight as Kruskal.',
			},
			{
				kind: 'choice',
				prompt: `Which edge does Prim add FIRST from start vertex ${start}?`,
				options: choiceOptions,
				answer: accept[0],
				explanation:
					`Of the edges leaving ${start}, the lightest is ${accept[0]}, so Prim ` +
					'adds it first.',
			},
		],
	};
};

// =============================================================================
// SHORTEST PATHS — Dijkstra (sssp-1), Bellman-Ford small (sssp-2), Bellman-Ford
// full per-pass trace (sssp-3). Fresh directed graphs; answers from the traces.
// =============================================================================

// Build a directed graph on `ids` (first id is the source) that is REACHABLE
// (every non-source vertex reachable from the source) by laying a "backbone"
// source→…→last chain, then adding extra forward/cross edges. Weights via wOf(rng).
const reachableDirected = (rng, ids, { extra, wOf }) => {
	const src = ids[0];
	const edges = [];
	const present = new Set();
	const key = (a, b) => `${a}->${b}`;
	const add = (from, to, weight) => {
		if (from === to) return false;
		if (present.has(key(from, to))) return false;
		present.add(key(from, to));
		edges.push({ from, to, weight });
		return true;
	};
	// Backbone: a random permutation of the non-source vertices, chained from src,
	// so a directed path src → … reaches every vertex (reachability guaranteed).
	const rest = shuffle(rng, ids.slice(1));
	let prev = src;
	for (const v of rest) {
		add(prev, v, wOf(rng));
		prev = v;
	}
	// Extra edges, only FORWARD along the backbone order (src first), so we never
	// accidentally create a cycle — keeps Dijkstra/Bellman well-defined and, for
	// the BF builders, lets us forbid negative cycles cheaply (a DAG has none).
	const orderIndex = new Map([src, ...rest].map((id, i) => [id, i]));
	let guard = 0;
	while (edges.length < ids.length - 1 + extra && guard < 300) {
		guard += 1;
		const a = pick(rng, ids);
		const b = pick(rng, ids);
		if (orderIndex.get(a) >= orderIndex.get(b)) continue; // forward only
		add(a, b, wOf(rng));
	}
	return { edges };
};

// Dijkstra: non-negative weights, source S, 5 vertices. Constraint: the settle
// order must be UNIQUE (no two vertices share a settling distance at the moment of
// extraction) so the "order" answer is single-valued, and dist[A], dist[C] must be
// finite (reachability already guarantees finiteness; uniqueness is the real gate).
const sssp1 = seed => {
	const ids = ['S', 'A', 'B', 'C', 'D'];
	const graph = rejectionSample(
		seed,
		stream => ({
			nodes: ids.map(id => ({ id })),
			...reachableDirected(stream, ids, {
				extra: 3,
				wOf: s => int(s, 1, 9),
			}),
		}),
		g => {
			const run = dijkstraTrace(g, { source: 'S' });
			const order = settleOrder(run.frames);
			if (order.length !== ids.length) return false; // all reachable + settled
			// Unique final distances ⇒ unique settle order (Dijkstra ties broken by id
			// would otherwise make the "order" answer arguable). Cheap, strict gate.
			const dists = ids.map(id => distVal(run.dist[id]));
			return new Set(dists).size === dists.length;
		}
	);
	const run = dijkstraTrace(graph, { source: 'S' });
	const order = settleOrder(run.frames);
	const dist = run.dist;
	return {
		kind: 'problem',
		__input: { graph },
		stem:
			'Directed weighted graph (non-negative) with edges ' +
			`${listDirected(graph.edges)}. Run Dijkstra from source S.`,
		parts: [
			{
				kind: 'order',
				prompt:
					'In what order does Dijkstra SETTLE (finalize) the vertices? Dijkstra ' +
					'always settles the unsettled vertex of smallest tentative distance next.',
				items: [...ids].sort(),
				answer: order,
				explanation:
					`Settling smallest-distance-first gives ${order.join(' → ')}. S is ` +
					'distance 0 and settles first; each later vertex settles once it holds the ' +
					'smallest tentative distance among those left.',
			},
			{
				kind: 'numeric',
				prompt: 'What is the final shortest distance dist[A] from S?',
				answer: distVal(dist.A),
				placeholder: 'distance',
				explanation:
					`dist[A] = ${distVal(dist.A)}, the length of the shortest S→A path. ` +
					'Dijkstra may relax A several times before settling it on the cheapest route.',
			},
			{
				kind: 'numeric',
				prompt: 'What is the final shortest distance dist[C] from S?',
				answer: distVal(dist.C),
				placeholder: 'distance',
				explanation: `dist[C] = ${distVal(dist.C)}, the shortest S→C distance.`,
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
};

// Bellman-Ford (small): a directed graph with at least one NEGATIVE edge and NO
// negative cycle (guaranteed: the backbone is a DAG, negatives only on forward
// edges). 4 vertices, source S. dist[A], dist[C] derived. We require dist of A and
// C finite and that a negative edge actually IMPROVES some distance (so the
// "negatives matter" point is concrete), and unique distances for a clean key.
const sssp2 = seed => {
	const ids = ['S', 'A', 'B', 'C'];
	const graph = rejectionSample(
		seed,
		stream => ({
			nodes: ids.map(id => ({ id })),
			...reachableDirected(stream, ids, {
				// weight in [-4..6] but never 0; negatives only land on forward edges,
				// and the backbone is a DAG, so there is never a negative cycle.
				extra: 3,
				wOf: s => {
					const v = int(s, -4, 6);
					return v === 0 ? 1 : v;
				},
			}),
		}),
		g => {
			const hasNeg = g.edges.some(e => e.weight < 0);
			if (!hasNeg) return false;
			const run = bellmanFordTrace(g, { source: 'S' });
			if (run.negativeCycle) return false; // must be well-defined
			const dists = ids.map(id => distVal(run.dist[id]));
			if (dists.some(d => d === Infinity)) return false; // all reachable
			return new Set(dists).size === dists.length; // unique ⇒ clean keys
		}
	);
	const run = bellmanFordTrace(graph, { source: 'S' });
	const dist = run.dist;
	return {
		kind: 'problem',
		__input: { graph },
		stem:
			'Directed weighted graph with a negative edge: ' +
			`${listDirected(graph.edges)}. Run Bellman-Ford from source S.`,
		parts: [
			{
				kind: 'choice',
				prompt:
					'This graph has a negative-weight edge. Which algorithm is the correct ' +
					'choice to compute shortest paths here?',
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
				answer: distVal(dist.A),
				placeholder: 'distance',
				explanation:
					`dist[A] = ${distVal(dist.A)}, the shortest S→A distance once every edge ` +
					'has been relaxed enough times — including any negative edge on the way.',
			},
			{
				kind: 'numeric',
				prompt: 'After Bellman-Ford, what is dist[C] from S?',
				answer: distVal(dist.C),
				placeholder: 'distance',
				explanation: `dist[C] = ${distVal(dist.C)}, the shortest S→C distance.`,
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
};

// Bellman-Ford (full per-pass trace): dist[D] after pass 1, and the final dist[D]
// and dist[C]. 5 vertices, source S, negatives allowed, no negative cycle. We make
// the per-pass answer non-trivial by requiring dist[D] to CHANGE between pass 1 and
// the final distances (so "after one pass" ≠ "final" — the whole point of asking).
const sssp3 = seed => {
	const ids = ['S', 'A', 'B', 'C', 'D'];
	const graph = rejectionSample(
		seed,
		stream => ({
			nodes: ids.map(id => ({ id })),
			...reachableDirected(stream, ids, {
				extra: 4,
				wOf: s => {
					const v = int(s, -4, 8);
					return v === 0 ? 1 : v;
				},
			}),
		}),
		g => {
			const hasNeg = g.edges.some(e => e.weight < 0);
			if (!hasNeg) return false;
			const run = bellmanFordTrace(g, { source: 'S' });
			if (run.negativeCycle) return false;
			const dists = ids.map(id => distVal(run.dist[id]));
			if (dists.some(d => d === Infinity)) return false;
			const pass1 = distAfterPass(run.frames, 1);
			// The pass-1 dist[D] must differ from the final dist[D]: this guarantees a
			// later pass propagates an improvement, so the per-pass question is real.
			return distVal(pass1.D) !== distVal(run.dist.D);
		}
	);
	const run = bellmanFordTrace(graph, { source: 'S' });
	const dist = run.dist;
	const pass1 = distAfterPass(run.frames, 1);
	const V = ids.length;
	return {
		kind: 'problem',
		__input: { graph },
		stem:
			'Directed graph with negative edges (no negative cycle): ' +
			`${listDirected(graph.edges)}. ` +
			'Run Bellman-Ford from S, relaxing the edges in the listed order each pass.',
		parts: [
			{
				kind: 'numeric',
				prompt:
					`After ONE full pass (relax all ${graph.edges.length} edges once), what ` +
					'is dist[D]?',
				answer: distVal(pass1.D),
				placeholder: 'a distance',
				explanation:
					`dist[D] = ${distVal(pass1.D)} after pass 1. Only the improvements that ` +
					'propagate within a single left-to-right sweep of the edge list have ' +
					'reached D yet.',
			},
			{
				kind: 'numeric',
				prompt:
					'After the algorithm finishes all |V|−1 passes, what is the FINAL dist[D]?',
				answer: distVal(dist.D),
				placeholder: 'a distance',
				explanation:
					`Final dist[D] = ${distVal(dist.D)}. Later passes extend correct distances ` +
					'by one more edge each time, lowering D to its true shortest distance.',
			},
			{
				kind: 'numeric',
				prompt: 'What is the FINAL dist[C]?',
				answer: distVal(dist.C),
				placeholder: 'a distance',
				explanation: `Final dist[C] = ${distVal(dist.C)}, the shortest S→C distance.`,
			},
			{
				kind: 'choice',
				prompt:
					`Bellman-Ford runs |V|−1 = ${V - 1} passes here. Why exactly |V|−1, not ` +
					'fewer?',
				options: [
					'A shortest path has at most |V|−1 edges, and each pass extends correct distances by one more edge',
					'Because the graph has 5 vertices and one pass per vertex is a coincidence',
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
};

// =============================================================================
// HEAPS — BuildMaxHeap (heaps-1) and ExtractMax (heaps-2). Fresh arrays; answers
// from buildMaxHeapTrace / extractMaxTrace.
// =============================================================================

// BuildMaxHeap: a fresh array of DISTINCT small integers (distinct ⇒ the post-build
// array is unique, no value-tie ambiguity in the choice). 6 elements. We require
// the array NOT to already be a max-heap, so the build actually does work.
const heaps1 = seed => {
	const input = rejectionSample(
		seed,
		stream => distinctInts(stream, 6, 1, 30),
		arr => !isMaxHeap(arr) // the build must change something to be instructive
	);
	const run = buildMaxHeapTrace(input);
	const final = run.finalHeap;
	const finalStr = `[${final.join(', ')}]`;
	const inputStr = `[${input.join(', ')}]`;
	const sortedDesc = `[${[...input].sort((a, b) => b - a).join(', ')}]`;
	const near = (() => {
		const a = [...final];
		if (a.length >= 3) [a[1], a[2]] = [a[2], a[1]];
		return `[${a.join(', ')}]`;
	})();
	return {
		kind: 'problem',
		__input: { array: input },
		stem:
			`Build a binary max-heap from the array ${inputStr} using the bottom-up ` +
			'BuildMaxHeap procedure (sift down each internal node from ⌊n/2⌋−1 to 0).',
		parts: [
			{
				kind: 'numeric',
				prompt:
					`The array has ${input.length} elements (indices 0..${input.length - 1}). ` +
					'What is the index of the LAST internal node, where BuildMaxHeap starts ' +
					'sifting (⌊n/2⌋−1)?',
				answer: Math.floor(input.length / 2) - 1,
				placeholder: 'an index',
				explanation:
					`⌊${input.length}/2⌋ − 1 = ${Math.floor(input.length / 2) - 1}. ` +
					'Everything past it is a leaf, already a trivial heap, so the loop starts here.',
			},
			{
				kind: 'choice',
				prompt:
					'Which array is the result AFTER BuildMaxHeap finishes? (Index 0 must be ' +
					'the maximum, and every parent ≥ its children.)',
				options: [finalStr, sortedDesc, inputStr, near],
				answer: finalStr,
				explanation:
					`Bottom-up heapify yields ${finalStr}: the max ${final[0]} sits at index 0 ` +
					'and the heap property holds throughout. A heap is NOT sorted — ' +
					`${sortedDesc} is a fully sorted array, a different (stronger) structure.`,
			},
			{
				kind: 'numeric',
				prompt: 'After BuildMaxHeap, what value sits at the root (index 0)?',
				answer: final[0],
				placeholder: 'a value',
				explanation: `The root of a max-heap is always the maximum element, here ${final[0]}.`,
			},
		],
	};
};

// ExtractMax: start from a VALID max-heap of distinct values (we build one with
// buildMaxHeapTrace from a fresh distinct array, guaranteeing validity), then one
// ExtractMax. Answers (the max, the resulting array, new root) from extractMaxTrace.
const heaps2 = seed => {
	// A valid max-heap from a fresh distinct array — validity by construction.
	const built = rejectionSample(
		seed,
		stream => buildMaxHeapTrace(distinctInts(stream, 6, 1, 30)).finalHeap,
		// Need ≥ 3 elements for the sift-down to be non-trivial; 6 always is, but we
		// also require the extract to actually move the new root (not a degenerate
		// heap where dropping the root needs no sift), to keep the choice instructive.
		heap => {
			const after = extractMaxTrace({ heap }).finalHeap;
			return after.length >= 2 && after[0] !== heap[1];
		}
	);
	const heap = built;
	const run = extractMaxTrace({ heap });
	const max = run.max;
	const after = run.finalHeap;
	const afterStr = `[${after.join(', ')}]`;
	const naive = `[${heap.slice(1).join(', ')}]`;
	const near = (() => {
		const a = [...after];
		if (a.length >= 3) [a[1], a[2]] = [a[2], a[1]];
		return `[${a.join(', ')}]`;
	})();
	const rootLast = `[${[heap[heap.length - 1], ...heap.slice(1, -1)].join(', ')}]`;
	return {
		kind: 'problem',
		__input: { heap },
		stem:
			`The array [${heap.join(', ')}] is already a valid max-heap. Perform one ` +
			'ExtractMax: return the max, move the last leaf to the root, shrink, then ' +
			'sift the new root down.',
		parts: [
			{
				kind: 'numeric',
				prompt: 'What value does ExtractMax return?',
				answer: max,
				placeholder: 'a value',
				explanation: `ExtractMax always returns the root of a max-heap, here ${max}.`,
			},
			{
				kind: 'choice',
				prompt:
					'What is the heap array AFTER the extraction and the sift-down restore ' +
					'(the extracted element is removed)?',
				options: [afterStr, naive, rootLast, near].filter(
					(o, i, arr) => arr.indexOf(o) === i
				),
				answer: afterStr,
				explanation:
					'The last leaf moves to the root and sinks until the heap property holds, ' +
					`giving ${afterStr}. Simply deleting the root and shifting (${naive}) would ` +
					'break the implicit tree structure.',
			},
			{
				kind: 'numeric',
				prompt:
					'After the extraction and sift-down, what value sits at the root (index 0)?',
				answer: after[0],
				placeholder: 'a value',
				explanation:
					`After restoring the heap, the new maximum ${after[0]} rises to the root. ` +
					`ExtractMax is O(log n): one root-to-leaf descent (here ${run.comparisons} ` +
					'comparisons).',
			},
		],
	};
};

// =============================================================================
// MASTER THEOREM — master-1 and master-2. Fresh (a, b, d) landing in a chosen case;
// case id + Θ bound derived from analyseRecurrence.
// =============================================================================

// A fresh recurrence T(n) = a·T(n/b) + n^d, with k = 0, that lands in `targetCase`
// (1, 2, or 3). We draw b ∈ {2,3,4}, a ∈ [1..16], d ∈ [0..3] and rejection-sample
// until analyseRecurrence's caseId matches. Mirrors examSets.masterCheck exactly.
const masterInstance = (seed, { targetCase, recurrenceWord }) => {
	const params = rejectionSample(
		seed,
		stream => ({
			a: int(stream, 1, 16),
			b: pick(stream, [2, 3, 4]),
			d: int(stream, 0, 3),
			k: 0,
		}),
		p => {
			const r = analyseRecurrence(p);
			if (r.caseId !== targetCase) return false;
			// Keep the numbers exam-friendly: c = log_b(a) should be a value the
			// option list can render distinctly. Avoid a == 1 in Case 1 (impossible
			// anyway) and keep d small (already bounded).
			return true;
		}
	);
	const { a, b, d } = params;
	const r = analyseRecurrence(params);
	const cValue = Math.log(a) / Math.log(b);
	const cTxt = cText(a, b);
	const fnText = d === 0 ? '1' : d === 1 ? 'n' : `n^${d}`;
	const recurrenceText = `T(n) = ${a}·T(n/${b}) + ${fnText}`;
	const caseOptions = ['Case 1', 'Case 2', 'Case 3'];
	const BOUND_POOL = [
		`Θ(${formatNForExam(cValue)})`,
		`Θ(${formatNForExam(d)})`,
		'Θ(n log n)',
		'Θ(n^2)',
		'Θ(n^3)',
		'Θ(n)',
	];
	const boundOptions = [r.result, ...BOUND_POOL.filter(o => o !== r.result)]
		.filter((o, i, arr) => arr.indexOf(o) === i)
		.slice(0, 4);
	return {
		kind: 'problem',
		__input: { params },
		stem:
			`Solve the recurrence ${recurrenceText} with the Master Theorem. Here a = ` +
			`${a}, b = ${b}, and f(n) = ${fnText}. (${recurrenceWord})`,
		parts: [
			{
				kind: 'choice',
				prompt: `Compute the leaf-growth exponent c = log_b(a) = log_${b}(${a}). What is c?`,
				options: [...new Set([cTxt, String(d), '1', '2', '3'])].slice(0, 4),
				answer: cTxt,
				explanation:
					`c = log_${b}(${a}) = ${cTxt}. This is compared against d = ${d} (the ` +
					'exponent of the combine work f(n) = n^d).',
			},
			{
				kind: 'choice',
				prompt: `Comparing c = ${cTxt} with d = ${d}, which Master Theorem case applies?`,
				options: caseOptions,
				answer: r.name,
				explanation:
					`${r.name}: ${r.tone}. ` +
					(r.caseId === 1
						? 'c > d, so the leaves dominate.'
						: r.caseId === 3
							? 'c < d, so the root combine work dominates.'
							: 'c = d, so every level costs about the same.'),
			},
			{
				kind: 'choice',
				prompt: 'What is the asymptotic bound Θ(·) for T(n)?',
				options: boundOptions,
				answer: r.result,
				explanation: `The bound is ${r.result}. ${r.explanation}`,
			},
		],
	};
};

// master-1 keeps the merge-sort shape (Case 2); master-2 keeps the leaves-win shape
// (Case 1). Holding each fixed set's CASE constant preserves difficulty across a
// retake while the concrete a/b/d change.
const master1 = seed =>
	masterInstance(seed, {
		targetCase: 2,
		recurrenceWord: 'A balanced "every level ties" recurrence.',
	});
const master2 = seed =>
	masterInstance(seed, {
		targetCase: 1,
		recurrenceWord: 'A "leaves win" recurrence.',
	});

// =============================================================================
// ALL-PAIRS SHORTEST PATHS — apsp-1 (Floyd-Warshall). Fresh directed graph on
// 4 vertices 1..4; final row 1 + an intermediate k=1 cell, derived from floydWarshall.
// =============================================================================

const apsp1 = seed => {
	const ids = ['1', '2', '3', '4'];
	// A directed graph that keeps vertices 2, 3, 4 reachable from 1 (so row 1 has
	// finite entries) and has no negative cycle (all weights positive here). We
	// require the final row-1 entries to be DISTINCT-ish only where it aids a clean
	// "drag into order" answer — the labelled cells make it an arrangement anyway.
	const graph = rejectionSample(
		seed,
		stream => ({
			nodes: ids.map(id => ({ id })),
			...reachableDirected(stream, ids, {
				extra: 3,
				wOf: s => int(s, 1, 9),
			}),
		}),
		g => {
			const run = floydWarshall(g);
			const idx = run.ids;
			const row1 = run.dist[idx.indexOf('1')];
			// 1 must reach 2, 3 and 4 (finite distances) for the numeric parts.
			return (
				row1[idx.indexOf('2')] != null &&
				row1[idx.indexOf('3')] != null &&
				row1[idx.indexOf('4')] != null
			);
		}
	);
	const run = floydWarshall(graph);
	const idx = run.ids;
	const row1 = run.dist[idx.indexOf('1')];
	const d12 = distVal(row1[idx.indexOf('2')]);
	const d13 = distVal(row1[idx.indexOf('3')]);
	const d14 = distVal(row1[idx.indexOf('4')]);
	const layer1 = run.layers[1];
	const l1_42 = distVal(layer1[idx.indexOf('4')][idx.indexOf('2')]);
	return {
		kind: 'problem',
		__input: { graph },
		stem:
			'Directed weighted graph on vertices 1, 2, 3, 4 with edges ' +
			`${listDirected(graph.edges)}. ` +
			'Run Floyd-Warshall (the triple loop over intermediate vertices k = 1..4).',
		parts: [
			{
				kind: 'numeric',
				prompt:
					'In the FINAL distance matrix, what is d[1][3], the shortest distance ' +
					'from vertex 1 to vertex 3?',
				answer: d13,
				placeholder: 'a distance',
				explanation: `d[1][3] = ${d13}, the shortest 1 → 3 distance over all intermediates.`,
			},
			{
				kind: 'order',
				prompt:
					'Pair each destination with its FINAL shortest distance from vertex 1. ' +
					'Drag the four cells into the row order d[1][1], d[1][2], d[1][3], d[1][4].',
				items: [
					`d[1][3] = ${d13}`,
					`d[1][1] = 0`,
					`d[1][4] = ${d14}`,
					`d[1][2] = ${d12}`,
				],
				answer: [
					`d[1][1] = 0`,
					`d[1][2] = ${d12}`,
					`d[1][3] = ${d13}`,
					`d[1][4] = ${d14}`,
				],
				explanation: `Row 1 settles to [0, ${d12}, ${d13}, ${d14}].`,
			},
			{
				kind: 'numeric',
				prompt:
					'After the k = 1 round (intermediates restricted to {1}), what is d[4][2]?',
				answer: l1_42,
				placeholder: 'a distance',
				explanation:
					`d[4][2] = ${l1_42} after admitting only vertex 1 as an intermediate: it ` +
					'is the better of the direct edge 4→2 (if any) and routing 4 → 1 → 2.',
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
				explanation:
					'The recurrence d_k[i][j] = min(d_{k−1}[i][j], d_{k−1}[i][k] + d_{k−1}[k][j]) ' +
					'reads the previous k-layer. Finishing all of k before any of k+1 guarantees ' +
					'every cell it reads is already the {1..k} answer.',
			},
		],
	};
};

// =============================================================================
// LINEAR-TIME SORTING — counting sort (linsort-1) and radix stability (linsort-2).
// =============================================================================

// Counting sort: a fresh array of small non-negative keys. Constraint: at least one
// duplicate (so count[] is interesting) and max key ≥ 3 (a real range). 8 elements,
// keys 0..k. Answers (k slots, count[0], final array) from getCountingSortStepsWithStats.
const linsort1 = seed => {
	const input = rejectionSample(
		seed,
		stream => Array.from({ length: 8 }, () => int(stream, 0, 6)),
		arr => {
			const hasDup = new Set(arr).size < arr.length;
			return hasDup && Math.max(...arr) >= 3 && arr.includes(0);
		}
	);
	const steps = getCountingSortStepsWithStats(input).steps;
	const last = steps[steps.length - 1];
	const sorted = last.array;
	const sortedStr = `[${sorted.join(', ')}]`;
	const counting = steps.filter(s => s.metadata.phase === 'counting');
	const count = counting[counting.length - 1].metadata.countArray;
	const k = last.metadata.k;
	const maxKey = Math.max(...input);
	return {
		kind: 'problem',
		__input: { array: input },
		stem:
			`Counting-sort the array [${input.join(', ')}]. The keys are integers in ` +
			`0..${maxKey}, so the count array has indices 0..${maxKey}.`,
		parts: [
			{
				kind: 'numeric',
				prompt:
					'Counting sort allocates count[0..k−1] where k is the key range. What is ' +
					'k (the number of count slots)?',
				answer: k,
				placeholder: 'a count',
				explanation: `The largest key is ${maxKey}, so the slots are 0..${maxKey} — that is k = ${k} slots.`,
			},
			{
				kind: 'numeric',
				prompt:
					'After the tally pass, what is count[0] (the number of keys equal to 0)?',
				answer: count[0],
				placeholder: 'a count',
				explanation: `There are ${count[0]} zeros in the input, so count[0] = ${count[0]}.`,
			},
			{
				kind: 'choice',
				prompt: 'What is the final array after counting sort completes?',
				options: [
					sortedStr,
					`[${[...input].sort((a, b) => b - a).join(', ')}]`,
					`[${input.join(', ')}]`,
					`[${[...new Set(input)].sort((a, b) => a - b).join(', ')}]`,
				].filter((o, i, arr) => arr.indexOf(o) === i),
				answer: sortedStr,
				explanation:
					`Replaying the counts in increasing key order rebuilds ${sortedStr}. ` +
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
				explanation:
					'Θ(n + k) is Θ(n) exactly when k = O(n). For a huge key range counting sort ' +
					'wastes time and space on empty slots; that is why radix sort decomposes large ' +
					'keys into small-range digits.',
			},
		],
	};
};

// Radix stability: a fresh list of two-digit numbers. Constraint: at least one TENS
// collision (two numbers share a tens digit) AND at least one ONES collision, so the
// stable-vs-unstable contrast is observable, and the UNSTABLE result must actually be
// WRONG (radixWithSubroutine(.., false).sorted === false). Answers from the generator.
const linsort2 = seed => {
	const values = rejectionSample(
		seed,
		stream => {
			// 6 distinct two-digit numbers (distinct values, but DIGITS can collide).
			return distinctInts(stream, 6, 10, 99);
		},
		vals => {
			const tens = vals.map(v => Math.floor(v / 10));
			const ones = vals.map(v => v % 10);
			const tensCollision = new Set(tens).size < tens.length;
			const onesCollision = new Set(ones).size < ones.length;
			if (!tensCollision || !onesCollision) return false;
			// The whole lesson: an unstable per-digit pass must break the final order.
			return radixWithSubroutine(vals, false).sorted === false;
		}
	);
	const stable = radixWithSubroutine(values, true);
	const unstable = radixWithSubroutine(values, false);
	const onesAfter = stable.passes[0].after;
	const onesStr = `[${onesAfter.join(', ')}]`;
	const stableResultStr = `[${stable.result.join(', ')}]`;
	const unstableResultStr = `[${unstable.result.join(', ')}]`;
	return {
		kind: 'problem',
		__input: { values },
		stem:
			`LSD radix sort on the two-digit numbers [${values.join(', ')}]: one pass on ` +
			'the ones digit, then one pass on the tens digit, each pass a stable counting ' +
			'sort.',
		parts: [
			{
				kind: 'choice',
				prompt:
					'What is the array AFTER the first pass (sorting by the ONES digit only)?',
				options: [
					onesStr,
					`[${[...values].sort((a, b) => a - b).join(', ')}]`,
					`[${[...values]
						.sort((a, b) => Math.floor(a / 10) - Math.floor(b / 10))
						.join(', ')}]`,
					`[${values.join(', ')}]`,
				].filter((o, i, arr) => arr.indexOf(o) === i),
				answer: onesStr,
				explanation:
					`Ordering by the ones digit (keeping ties in input order) gives ${onesStr}. ` +
					'The tens digit is ignored on this pass.',
			},
			{
				kind: 'choice',
				prompt: 'After BOTH passes, what is the final array?',
				options: [
					stableResultStr,
					unstableResultStr,
					`[${[...values].sort((a, b) => b - a).join(', ')}]`,
					onesStr,
				].filter((o, i, arr) => arr.indexOf(o) === i),
				answer: stableResultStr,
				explanation:
					`The tens pass, applied stably, finishes the sort: ${stableResultStr}. ` +
					'Equal tens digits keep the ones-digit order established by the previous pass.',
			},
			{
				kind: 'choice',
				prompt:
					'Suppose we replace the per-digit pass with an UNSTABLE counting sort ' +
					'(equal digits may be reordered). What happens to the final array?',
				options: [
					`It is no longer sorted, e.g. ${unstableResultStr}`,
					'It is still fully sorted; stability only affects speed',
					'It is sorted but in descending order',
					'The algorithm crashes on equal digits',
				],
				answer: `It is no longer sorted, e.g. ${unstableResultStr}`,
				explanation:
					'Radix relies on each pass preserving the order set by less-significant digits. ' +
					`An unstable tens pass scrambles equal-tens records, yielding ${unstableResultStr}, ` +
					'which is not sorted. Stability per digit is mandatory.',
			},
		],
	};
};

// =============================================================================
// TREES — trees-1 (BST). Fresh DISTINCT insertion order; in-order, root+left child,
// a two-child delete. Answers from treeUtils.
// =============================================================================

// Constraints: 8 DISTINCT keys (distinct ⇒ a well-defined BST). The deleted key
// must have TWO children (so the successor-splice is the interesting case), and we
// pick that key from the instance — the first inserted key with two children — so
// the "which key moves up" question always has a successor. Insertion order is
// shuffled so the root and shape vary across seeds.
const trees1 = seed => {
	const found = rejectionSample(
		seed,
		stream => {
			const keys = distinctInts(stream, 8, 10, 99);
			return keys;
		},
		keys => {
			const root = buildBst(keys);
			// Need at least one node with two children to delete (so a successor exists).
			const twoChild = nodesWithTwoChildren(root);
			return twoChild.length > 0;
		}
	);
	const insertOrder = found;
	const root = buildBst(insertOrder);
	const inorder = inorderValues(root);
	const pre = (() => {
		const steps = getTraversalSteps(root, 'preorder');
		return steps[steps.length - 1].output.map(Number);
	})();
	// Delete a node that genuinely has two children — pick the smallest such value
	// for a stable, instance-derived choice.
	const twoChildVals = nodesWithTwoChildren(root).sort((a, b) => a - b);
	const delValue = twoChildVals[0];
	const successor = inorder[inorder.indexOf(delValue) + 1];
	const afterDel = deleteValue(root, delValue);
	const delInorder = inorderValues(afterDel);
	const removes = !containsValue(afterDel, delValue);
	return {
		kind: 'problem',
		__input: { insertOrder, delValue },
		stem:
			`Insert the keys ${insertOrder.join(', ')} into an initially empty binary ` +
			'search tree, in that order (each key goes left if smaller than the current ' +
			'node, right if larger).',
		parts: [
			{
				kind: 'order',
				prompt:
					'List the keys in the order an IN-ORDER traversal visits them. Drag them ' +
					'into that sequence.',
				items: [...insertOrder].sort((a, b) => b - a).map(String),
				answer: inorder.map(String),
				explanation: `An in-order walk of any BST yields its keys in ascending order: ${inorder.join(
					', '
				)}. This is exactly why an in-order traversal sorts.`,
			},
			{
				kind: 'choice',
				prompt:
					'Which key is the ROOT of the tree, and which is its left child?',
				options: [
					`root ${pre[0]}, left child ${pre[1]}`,
					`root ${inorder[0]}, left child ${inorder[1]}`,
					`root ${pre[1]}, left child ${pre[0]}`,
					`root ${inorder[inorder.length - 1]}, left child ${pre[1]}`,
				].filter((o, i, arr) => arr.indexOf(o) === i),
				answer: `root ${pre[0]}, left child ${pre[1]}`,
				explanation:
					`The first key inserted, ${pre[0]}, is the root. A pre-order traversal ` +
					`(root first) reads ${pre.join(', ')}, so the root's left child is ${pre[1]}.`,
			},
			{
				kind: 'numeric',
				prompt:
					`Now DELETE the key ${delValue}. It has two children, so it is replaced ` +
					'by its in-order successor (the smallest key in its right subtree). Which ' +
					'key moves up to take its place?',
				answer: successor,
				placeholder: 'a key',
				explanation:
					`The successor of ${delValue} is the minimum of its right subtree, which ` +
					`is ${successor}. It moves up so the BST ordering is preserved.`,
			},
			{
				kind: 'order',
				prompt: `After deleting ${delValue}, list the remaining keys in in-order sequence.`,
				items: [...delInorder].sort((a, b) => b - a).map(String),
				answer: delInorder.map(String),
				explanation:
					`${delValue} is gone and ${successor} takes its slot, so the in-order ` +
					`sequence is ${delInorder.join(', ')} — still sorted, still without ` +
					`${delValue} (removed: ${removes}).`,
			},
		],
	};
};

// Every value whose BST node has both a left and right child. Pure walk.
const nodesWithTwoChildren = root => {
	const out = [];
	const walk = node => {
		if (!node) return;
		if (node.left && node.right) out.push(node.value);
		walk(node.left);
		walk(node.right);
	};
	walk(root);
	return out;
};

// =============================================================================
// GRAPHS — graphs-1 (BFS / DFS). Fresh connected undirected graph; BFS visit order
// + a BFS depth + DFS visit order, derived from genericTraverse (alphabetical
// tie-break, exactly as the topic). Start vertex A.
// =============================================================================

const graphs1 = seed => {
	const V = ['A', 'B', 'C', 'D', 'E', 'F'];
	const start = 'A';
	const graph = rejectionSample(
		seed,
		stream => ({
			nodes: V.map(id => ({ id })),
			...connectedUnweightedGraph(stream, V, { extra: 2 }), // unweighted for BFS/DFS
		}),
		g => {
			const bfs = genericTraverse(g, { discipline: 'fifo', start });
			// Connected ⇒ all 6 visited. Require the deepest BFS depth ≥ 2 so the depth
			// question is non-trivial (not a star where everything is depth 1).
			const depths = Object.values(bfs.dist).map(d => (d == null ? -1 : d));
			return bfs.visitOrder.length === V.length && Math.max(...depths) >= 2;
		}
	);
	const bfs = genericTraverse(graph, { discipline: 'fifo', start });
	const dfs = genericTraverse(graph, { discipline: 'lifo', start });
	const bfsOrder = bfs.visitOrder;
	const dfsOrder = dfs.visitOrder;
	// Ask the depth of the vertex that is DEEPEST in BFS (instance-derived target).
	const target = V.reduce((best, v) =>
		distVal(bfs.dist[v]) > distVal(bfs.dist[best]) ? v : best
	);
	const depthTarget = distVal(bfs.dist[target]);
	// Readable undirected edge list.
	const edgeList = graph.edges.map(e => `${e.from}–${e.to}`).join(', ');
	return {
		kind: 'problem',
		__input: { graph, target },
		stem:
			`Undirected graph with vertices A..F and edges ${edgeList}. Traverse from A. ` +
			'When a vertex has several unvisited neighbours, consider them in alphabetical ' +
			'order.',
		parts: [
			{
				kind: 'order',
				prompt:
					'Give the order BFS (a FIFO queue frontier) VISITS the vertices.',
				items: [...V].sort().reverse(),
				answer: bfsOrder,
				explanation: `BFS drains the queue oldest-first, so it sweeps level by level: ${bfsOrder.join(
					' → '
				)}.`,
			},
			{
				kind: 'numeric',
				prompt:
					`BFS labels each vertex with its depth (hop count from A). What is the ` +
					`BFS depth of ${target}?`,
				answer: depthTarget,
				placeholder: 'a depth',
				explanation:
					`${target} sits at depth ${depthTarget}: the shortest unweighted route ` +
					'from A reaches it in that many hops. BFS finds shortest paths in unweighted ' +
					'graphs.',
			},
			{
				kind: 'order',
				prompt:
					'Give the order DFS (a LIFO stack frontier) VISITS the vertices, with the ' +
					'same alphabetical tie-breaking.',
				items: [...V].sort().reverse(),
				answer: dfsOrder,
				explanation:
					`DFS plunges down one branch before backtracking: ${dfsOrder.join(' → ')}. ` +
					'The stack hands back the most recently added vertex, so it dives deep first.',
			},
			{
				kind: 'choice',
				prompt:
					'Both traversals settle all six vertices and run in Θ(V + E). What single ' +
					'thing differs between them?',
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
};

// =============================================================================
// TRACE-STEP PROBES — sssp-probe-1 (Dijkstra "settle next") and graphs-probe-1
// (BFS "dequeue next"). Fresh graphs of the SAME shape as sssp-1 / graphs-1; the
// frozen frame and the next-decision answer are read off the SAME generator via
// traceProbes.js, so a seeded probe is as derived (and as un-memorizable) as any
// terminal-artifact instance.
// =============================================================================

// Dijkstra "settle next", mid-run. Same input space as sssp1 (non-negative, all
// reachable, UNIQUE distances ⇒ a single-valued settle order, so "who settles next"
// has one answer). 5 vertices ⇒ 5 settle beats, so probe ordinals 2 and 3 always
// exist. The unique-distance gate already guarantees ≥ 2 distinct options remain at
// each probed beat. The probe answer is derived from the next settle frame.
const ssspProbe1 = seed => {
	const ids = ['S', 'A', 'B', 'C', 'D'];
	const graph = rejectionSample(
		seed,
		stream => ({
			nodes: ids.map(id => ({ id })),
			...reachableDirected(stream, ids, {
				extra: 3,
				wOf: s => int(s, 1, 9),
			}),
		}),
		g => {
			const run = dijkstraTrace(g, { source: 'S' });
			const order = settleOrder(run.frames);
			if (order.length !== ids.length) return false; // all reachable + settled
			const dists = ids.map(id => distVal(run.dist[id]));
			if (new Set(dists).size !== dists.length) return false; // unique ⇒ one answer
			// Both probed beats must exist and offer a real (≥2-option) choice.
			const p2 = dijkstraSettleProbe(run, ids, 2);
			const p3 = dijkstraSettleProbe(run, ids, 3);
			return Boolean(
				p2 && p3 && p2.options.length >= 2 && p3.options.length >= 2
			);
		}
	);
	const run = dijkstraTrace(graph, { source: 'S' });
	const p1 = dijkstraSettleProbe(run, ids, 2);
	const p2 = dijkstraSettleProbe(run, ids, 3);
	const part = (probe, lead) => ({
		kind: 'stepProbe',
		frame: probe.frozen,
		view: {
			kind: 'dijkstra-settle',
			ids,
			source: 'S',
			nextLabel: 'settles next',
		},
		prompt:
			'Dijkstra is mid-run on the graph below. From the frozen state — the settled ' +
			`set and the current tentative distances — ${lead}`,
		options: probe.options,
		answer: probe.answer,
		explanation:
			'Dijkstra always settles the UNSETTLED vertex of smallest tentative distance. ' +
			`Among the unsettled vertices the minimum is ${probe.answer} (dist = ` +
			`${distVal(probe.frozen.dist[probe.answer])}), so it is finalized next.`,
	});
	return {
		kind: 'problem',
		// The fresh graph this instance derives from, for the guardrail to re-derive.
		__input: { graph },
		stem:
			'Directed weighted graph (non-negative) with edges ' +
			`${listDirected(graph.edges)}. Dijkstra runs from S. Each part freezes the ` +
			'algorithm mid-run; read the next move off the state shown.',
		parts: [
			part(p1, 'which vertex does Dijkstra SETTLE (finalize) next?'),
			part(p2, 'which vertex does Dijkstra settle next after that?'),
		],
	};
};

// BFS "dequeue next", mid-run. Same input space as graphs1 (connected, deepest BFS
// depth ≥ 2). 6 vertices ⇒ 6 extract beats, so probe ordinals 1 and 2 exist. We add
// one probe-specific gate: each frozen frontier must hold ≥ 2 waiting vertices, so
// "which dequeues next" is a genuine FIFO choice, not a forced single. The answer is
// the next extract frame's `current`.
const graphsProbe1 = seed => {
	const V = ['A', 'B', 'C', 'D', 'E', 'F'];
	const start = 'A';
	const graph = rejectionSample(
		seed,
		stream => ({
			nodes: V.map(id => ({ id })),
			...connectedUnweightedGraph(stream, V, { extra: 2 }),
		}),
		g => {
			const bfs = genericTraverse(g, { discipline: 'fifo', start });
			if (bfs.visitOrder.length !== V.length) return false; // connected
			const depths = Object.values(bfs.dist).map(d => (d == null ? -1 : d));
			if (Math.max(...depths) < 2) return false; // non-trivial depth
			const p1 = bfsDequeueProbe(bfs, V, 1);
			const p2 = bfsDequeueProbe(bfs, V, 2);
			if (!p1 || !p2) return false;
			// A real FIFO choice: each frozen queue holds at least two waiting vertices.
			return p1.frozen.frontier.length >= 2 && p2.frozen.frontier.length >= 2;
		}
	);
	const bfs = genericTraverse(graph, { discipline: 'fifo', start });
	const p1 = bfsDequeueProbe(bfs, V, 1);
	const p2 = bfsDequeueProbe(bfs, V, 2);
	const edgeList = graph.edges.map(e => `${e.from}–${e.to}`).join(', ');
	const part = (probe, lead) => ({
		kind: 'stepProbe',
		frame: probe.frozen,
		view: { kind: 'bfs-dequeue', ids: V, start, nextLabel: 'dequeues next' },
		prompt:
			'BFS is mid-run on the graph below, using a FIFO queue frontier. From the ' +
			`queue shown, ${lead}`,
		options: probe.options,
		answer: probe.answer,
		explanation:
			'A FIFO queue hands back the vertex that has waited longest — the FRONT of ' +
			`the queue. Here the front is ${probe.answer}, so BFS dequeues it next and ` +
			'then considers its neighbours.',
	});
	return {
		kind: 'problem',
		__input: { graph },
		stem:
			`Undirected graph with vertices A..F and edges ${edgeList}. BFS runs from A ` +
			'(alphabetical tie-breaking). Each part freezes the queue mid-run; read the ' +
			'next dequeue off the frontier shown.',
		parts: [
			part(p1, 'which vertex does BFS DEQUEUE (remove from the front) next?'),
			part(p2, 'which vertex does BFS dequeue next after that?'),
		],
	};
};

// =============================================================================
// HASHING — hashing-1 (separate chaining). Fresh string keys into a capacity-7
// table; collision-bucket count, longest chain, load factor — derived from
// createBucketsFromEntries (the module's own polynomial hash).
// =============================================================================

// A small pool of short, distinct lowercase words to draw keys from. Using real
// words (not random char soup) keeps the stem readable; the hash + buckets are
// still derived. We require at least one COLLISION (two keys share a bucket) so the
// chaining question is real.
const HASH_WORD_POOL = [
	'cat',
	'dog',
	'bird',
	'fish',
	'ant',
	'bee',
	'cow',
	'elk',
	'fox',
	'owl',
	'pig',
	'ram',
	'rat',
	'sow',
	'yak',
	'bat',
	'eel',
	'hen',
	'jay',
	'kit',
	'red',
	'sun',
	'sky',
	'sea',
	'oak',
	'elm',
	'fig',
	'ivy',
	'pea',
	'yam',
];

const hashing1 = seed => {
	const capacity = 7;
	const keys = rejectionSample(
		seed,
		stream => shuffle(stream, HASH_WORD_POOL).slice(0, 5),
		ks => {
			const entries = ks.map(k => ({ key: k, value: k.length }));
			const buckets = createBucketsFromEntries(entries, capacity);
			const collisions = buckets.filter(b => b.length > 1).length;
			return collisions >= 1; // at least one real chained collision
		}
	);
	const entries = keys.map(k => ({ key: k, value: k.length }));
	const buckets = createBucketsFromEntries(entries, capacity);
	const collisions = buckets.filter(b => b.length > 1).length;
	const maxChain = Math.max(...buckets.map(b => b.length));
	const alpha = (keys.length / capacity).toFixed(2);
	return {
		kind: 'problem',
		__input: { keys, capacity },
		stem:
			`A hash table with m = ${capacity} buckets uses separate chaining. The hash of ` +
			'a string is h = 7, then h = h·31 + charCode for each character, and the bucket ' +
			`is h mod ${capacity}. Insert the keys ${keys
				.map(k => `"${k}"`)
				.join(', ')} in that order.`,
		parts: [
			{
				kind: 'numeric',
				prompt:
					'After inserting all five keys, how many buckets hold a COLLISION (more ' +
					'than one key chained together)?',
				answer: collisions,
				placeholder: 'a count',
				explanation:
					`${collisions} bucket${collisions === 1 ? '' : 's'} hold more than one key. ` +
					'Separate chaining absorbs each collision in a linked list.',
			},
			{
				kind: 'numeric',
				prompt:
					'What is the length of the LONGEST chain (the most keys in any single ' +
					'bucket)?',
				answer: maxChain,
				placeholder: 'a length',
				explanation:
					`The longest chain has ${maxChain} keys. A lookup that hits that bucket ` +
					'scans the whole chain.',
			},
			{
				kind: 'choice',
				prompt:
					`The table holds ${keys.length} keys in ${capacity} buckets. What is the ` +
					'load factor α = n / m?',
				options: [
					alpha,
					(capacity / keys.length).toFixed(2),
					String(keys.length),
					'1.00',
				].filter((o, i, arr) => arr.indexOf(o) === i),
				answer: alpha,
				explanation:
					`α = n / m = ${keys.length} / ${capacity} = ${alpha}. The expected chain ` +
					'length is α, so the average successful search is Θ(1 + α).',
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
				explanation:
					'A key’s slot is h mod m. Doubling m (to a new prime) changes h mod m for ' +
					'essentially every key, so the whole table is rebuilt to spread the chains out ' +
					'again and restore O(1) average operations.',
			},
		],
	};
};

// =============================================================================
// MAXIMUM FLOW — maxflow-1 (Edmonds-Karp). Fresh capacitated network S → T on
// 6 vertices; max-flow value, min-cut capacity, source-side size — from edmondsKarpTrace.
// =============================================================================

// A layered network S → {A,B} → {C,D} → T with random positive capacities, plus a
// couple of cross edges. Layering guarantees S→T reachability (so the flow is
// positive) and acyclicity (so the trace is clean). We require the max-flow value
// to be > 0 and the source side of the min cut to be a PROPER subset (not all
// vertices), so all three numeric answers are meaningful.
const maxflow1 = seed => {
	const network = rejectionSample(
		seed,
		stream => {
			const cap = () => int(stream, 2, 12);
			// Fixed skeleton, random capacities + a random cross edge direction.
			const edges = [
				{ from: 'S', to: 'A', capacity: cap() },
				{ from: 'S', to: 'B', capacity: cap() },
				{ from: 'A', to: 'C', capacity: cap() },
				{ from: 'A', to: 'D', capacity: cap() },
				{ from: 'B', to: 'D', capacity: cap() },
				{ from: 'C', to: 'T', capacity: cap() },
				{ from: 'D', to: 'T', capacity: cap() },
			];
			// A random extra forward cross edge so cuts are non-trivial.
			if (int(stream, 0, 1) === 0) {
				edges.push({ from: 'A', to: 'B', capacity: int(stream, 1, 4) });
			} else {
				edges.push({ from: 'D', to: 'C', capacity: int(stream, 1, 6) });
			}
			return {
				nodes: ['S', 'A', 'B', 'C', 'D', 'T'].map(id => ({ id })),
				source: 'S',
				sink: 'T',
				edges,
			};
		},
		net => {
			const run = edmondsKarpTrace(net);
			// Positive flow + a proper-subset source side (cut actually splits the graph).
			return (
				run.value > 0 &&
				run.minCut.S.length >= 1 &&
				run.minCut.S.length < net.nodes.length
			);
		}
	);
	const run = edmondsKarpTrace(network);
	const value = run.value;
	const cut = run.minCut;
	const cutCap = cut.capacity;
	const cutSize = cut.S.length;
	const cutEdges = cut.edges
		.map(e => `${e.from}→${e.to}(${e.capacity})`)
		.join(', ');
	const capList = network.edges
		.map(e => `${e.from}→${e.to}(${e.capacity})`)
		.join(', ');
	return {
		kind: 'problem',
		__input: { network },
		stem:
			`Flow network from source S to sink T with capacities ${capList}. ` +
			'Run Edmonds-Karp (augment along shortest residual paths) to maximum flow.',
		parts: [
			{
				kind: 'numeric',
				prompt: 'What is the value of the maximum flow from S to T?',
				answer: value,
				placeholder: 'a flow value',
				explanation:
					`The maximum flow is ${value}. Augmenting paths push flow until no residual ` +
					`S→T path remains; the value out of S then equals ${value}.`,
			},
			{
				kind: 'numeric',
				prompt:
					'By the max-flow / min-cut theorem, the minimum-cut capacity equals the ' +
					'max-flow value. What is the capacity of the minimum cut?',
				answer: cutCap,
				placeholder: 'a capacity',
				explanation:
					`The min cut crosses ${cutEdges}, total capacity ${cutCap} — equal to the ` +
					`max-flow value ${value}, as the theorem guarantees.`,
			},
			{
				kind: 'numeric',
				prompt:
					'The min cut splits the vertices into S-side and T-side. How many ' +
					'vertices are on the SOURCE side (the set reachable from S in the final ' +
					'residual network)?',
				answer: cutSize,
				placeholder: 'a count',
				explanation:
					`The source side is {${cut.S.join(', ')}} — ${cutSize} vertices. These are ` +
					'exactly the vertices still reachable from S once no augmenting path remains.',
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
				explanation:
					'Choosing the fewest-edge augmenting path each round (BFS) makes the running ' +
					'time polynomial, O(V·E²), independent of the capacity magnitudes — unlike ' +
					'generic Ford-Fulkerson, whose DFS path choice can depend on |f*|.',
			},
		],
	};
};

// =============================================================================
// FOUNDATIONS — foundations-1 (n(n+1)/2 loop count) and foundations-2 (linear
// search worst/best). Closed-form numeric keys from an EXPLICIT expression on a
// fresh n. The conceptual choice parts are constant (and live in STATIC).
// =============================================================================

const foundations1 = seed => {
	// A fresh n in 6..12; the loop-body count n(n+1)/2 is an EXPLICIT arithmetic
	// expression on it (the key is derived, never guessed).
	const n = int(mulberry32(toSeed(seed)), 6, 12);
	const bodyCount = (n * (n + 1)) / 2;
	return {
		kind: 'problem',
		__input: { n },
		stem:
			`Consider this nested loop on an array of length n = ${n}: "for i from 0 to ` +
			'n−1, then for j from i to n−1, do one unit of work". Count how the inner ' +
			'work grows, then simplify it to a Θ class.',
		parts: [
			{
				kind: 'numeric',
				prompt:
					`For n = ${n}, how many times does the inner "one unit of work" line run ` +
					'in total? (The inner loop runs n times when i = 0, n−1 times when i = 1, ' +
					'and so on down to 1.)',
				answer: bodyCount,
				placeholder: 'a count',
				explanation:
					`The body runs n + (n−1) + … + 1 = n(n+1)/2 times. For n = ${n} that is ` +
					`${n}·${n + 1}/2 = ${bodyCount}.`,
			},
			{
				kind: 'choice',
				prompt:
					'The exact count is n(n+1)/2 = n²/2 + n/2. What is its Θ class (drop ' +
					'constant factors and lower-order terms)?',
				options: ['Θ(n²)', 'Θ(n)', 'Θ(n log n)', 'Θ(n³)'],
				answer: 'Θ(n²)',
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
				explanation:
					'Drop the constant factor 3 and the lower-order 100n + 7 terms: the growth ' +
					'is governed by n², so O(3n² + 100n + 7) = O(n²).',
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
				explanation:
					'n pushes do at most ~2n total work (geometric resizing: 1 + 2 + 4 + … < 2n ' +
					'copies), so the average per push is Θ(1). Worst-case for one push is still Θ(n).',
			},
		],
	};
};

const foundations2 = seed => {
	const n = int(mulberry32(toSeed(seed)), 50, 200);
	const worst = n; // n comparisons in the worst case (explicit expression)
	const best = 1; // first comparison hits
	return {
		kind: 'problem',
		__input: { n },
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
					`Linear search scans an array of n = ${n} elements for a target. In the ` +
					'WORST case (target absent), how many elements does it inspect?',
				answer: worst,
				placeholder: 'a count',
				explanation:
					`The worst case inspects all n = ${worst} elements, since the target is only ` +
					'ruled out after the last one. That is the Θ(n) worst-case cost.',
			},
			{
				kind: 'numeric',
				prompt:
					'For the SAME linear search, how many elements does it inspect in the BEST ' +
					'case (target is the first element)?',
				answer: best,
				placeholder: 'a count',
				explanation:
					`The best case is ${best}: the very first comparison finds the target. Best, ` +
					'worst, and average are different questions about the SAME algorithm.',
			},
			{
				kind: 'choice',
				prompt:
					'Why do we usually quote the WORST-case (big-O) bound rather than the best ' +
					'case when comparing algorithms?',
				options: [
					'It is a guarantee: the algorithm never does worse, so it bounds performance for any input',
					'The best case is impossible to compute',
					'The worst case is always the same as the average case',
					'Best-case analysis would make every algorithm look identical',
				],
				answer:
					'It is a guarantee: the algorithm never does worse, so it bounds performance for any input',
				explanation:
					'The worst case gives an upper bound that holds for every input, so it is a ' +
					'safety guarantee. Best-case bounds are optimistic and rarely useful for ' +
					'comparing real performance.',
			},
		],
	};
};

// =============================================================================
// STACKS & QUEUES — stacks-queues-1. Fresh op sequence simulated on a stack and a
// queue; final contents + next-removed, derived from sqFrames.
// =============================================================================

// A fresh op log of add(value)/remove on letters A.. We constrain it so BOTH
// structures end NON-EMPTY (so "final contents" and "next remove" are real
// questions): we generate adds/removes keeping a running size ≥ 1 and ending with
// size ≥ 2. Values are consecutive letters in add order, like the fixed problem.
const stacksQueues1 = seed => {
	const ops = rejectionSample(
		seed,
		stream => {
			const out = [];
			let added = 0;
			let size = 0;
			const len = 6;
			for (let i = 0; i < len; i += 1) {
				// Bias toward 'add' so the structures don't drain; force add when empty.
				const doAdd = size === 0 || int(stream, 0, 2) !== 0;
				if (doAdd) {
					out.push({ type: 'add', value: String.fromCharCode(65 + added) });
					added += 1;
					size += 1;
				} else {
					out.push({ type: 'remove' });
					size -= 1;
				}
			}
			return out;
		},
		opList => {
			// Both structures must finish with ≥ 2 items so the next-remove question has
			// a distinct, sensible answer; and there must be at least one remove so the
			// trace is interesting.
			const stack = sqFrames('stack', [], opList).at(-1).items;
			const queue = sqFrames('queue', [], opList).at(-1).items;
			const hasRemove = opList.some(o => o.type === 'remove');
			return stack.length >= 2 && queue.length >= 2 && hasRemove;
		}
	);
	const stackFinal = sqFrames('stack', [], ops).at(-1).items;
	const queueFinal = sqFrames('queue', [], ops).at(-1).items;
	const stackFinalStr = `[${stackFinal.join(', ')}]`;
	const queueFinalStr = `[${queueFinal.join(', ')}]`;
	const stackPops = stackFinal[stackFinal.length - 1];
	const queueDeq = queueFinal[0];
	const stackAfter = sqFrames('stack', stackFinal, [{ type: 'remove' }]).at(
		-1
	).items;
	const queueAfter = sqFrames('queue', queueFinal, [{ type: 'remove' }]).at(
		-1
	).items;
	const stackAfterStr = `[${stackAfter.join(', ')}]`;
	const queueAfterStr = `[${queueAfter.join(', ')}]`;
	// A readable English op log.
	const opLog = ops
		.map(o => (o.type === 'add' ? `add ${o.value}` : 'remove'))
		.join(', ');
	return {
		kind: 'problem',
		__input: { ops },
		stem:
			`Apply the SAME operation sequence to an empty stack and an empty queue: ` +
			`${opLog}. For the stack "add" is push and "remove" is pop; for the queue ` +
			'"add" is enqueue and "remove" is dequeue.',
		parts: [
			{
				kind: 'choice',
				prompt:
					'After the full sequence, what does the STACK contain, listed bottom to ' +
					'top? (A stack removes the most recently added element.)',
				options: [
					stackFinalStr,
					queueFinalStr,
					`[${[...stackFinal].reverse().join(', ')}]`,
					`[${queueFinal.slice().reverse().join(', ')}]`,
				].filter((o, i, arr) => arr.indexOf(o) === i),
				answer: stackFinalStr,
				explanation: `Tracing push/pop leaves the stack ${stackFinalStr} (bottom to top).`,
			},
			{
				kind: 'choice',
				prompt:
					'After the full sequence, what does the QUEUE contain, listed front to ' +
					'rear? (A queue removes the earliest added element.)',
				options: [
					queueFinalStr,
					stackFinalStr,
					`[${[...queueFinal].reverse().join(', ')}]`,
					`[${stackFinal.slice().reverse().join(', ')}]`,
				].filter((o, i, arr) => arr.indexOf(o) === i),
				answer: queueFinalStr,
				explanation: `Tracing enqueue/dequeue leaves the queue ${queueFinalStr} (front to rear).`,
			},
			{
				kind: 'choice',
				prompt:
					`From the final states (stack ${stackFinalStr}, queue ${queueFinalStr}), ` +
					'which value comes out on the NEXT remove from each structure?',
				options: [
					`Stack pops ${stackPops}, queue dequeues ${queueDeq}`,
					`Stack pops ${queueDeq}, queue dequeues ${stackPops}`,
					`Both return ${stackPops}`,
					`Both return ${queueDeq}`,
				].filter((o, i, arr) => arr.indexOf(o) === i),
				answer: `Stack pops ${stackPops}, queue dequeues ${queueDeq}`,
				explanation:
					`The stack returns its top, ${stackPops}, leaving ${stackAfterStr}. The ` +
					`queue returns its front, ${queueDeq}, leaving ${queueAfterStr}. LIFO takes ` +
					'the newest, FIFO the oldest.',
			},
		],
	};
};

// =============================================================================
// SORTING — sorting-1 (full merge-sort trace) and sorting-2 (the merge step in
// isolation + recursion depth). Fresh arrays / sorted runs; keys from
// getMergeSortStepsWithStats.
// =============================================================================

const mergeOutput = (steps, start, end) =>
	steps.find(
		s =>
			s.metadata &&
			s.metadata.operation === 'merge_complete' &&
			s.metadata.target[0] === start &&
			s.metadata.target[1] === end
	).metadata.outputSnapshot;

// Full merge sort on a fresh 8-element array of DISTINCT values (distinct ⇒ the
// sorted halves and final array are unambiguous, and the comparison count is a
// clean function of the shape). Keys: sorted left half, final array, comparisons.
const sorting1 = seed => {
	const input = rejectionSample(
		seed,
		stream => distinctInts(stream, 8, 1, 50),
		arr => {
			// Not already sorted (so the trace is instructive) and not reverse-sorted
			// (keeps the comparison count off the trivial extremes).
			const asc = arr.every((v, i) => i === 0 || arr[i - 1] < v);
			const desc = arr.every((v, i) => i === 0 || arr[i - 1] > v);
			return !asc && !desc;
		}
	);
	const run = getMergeSortStepsWithStats(input);
	const steps = run.steps;
	const final = steps[steps.length - 1].array;
	const finalStr = `[${final.join(', ')}]`;
	const comparisons = run.finalStats.comparisons;
	const leftHalf = mergeOutput(steps, 0, 3);
	const leftHalfStr = `[${leftHalf.join(', ')}]`;
	const rightHalf = mergeOutput(steps, 4, 7);
	const rightHalfStr = `[${rightHalf.join(', ')}]`;
	return {
		kind: 'problem',
		__input: { array: input },
		stem:
			`Merge-sort the array [${input.join(', ')}]. Merge sort splits the array in ` +
			'half, recursively sorts each half, then merges the two sorted halves.',
		parts: [
			{
				kind: 'choice',
				prompt:
					`The array splits into a left half [${input.slice(0, 4).join(', ')}] and ` +
					`a right half [${input.slice(4).join(', ')}]. After the left half is fully ` +
					'sorted (recursively), what does it look like?',
				options: [
					leftHalfStr,
					`[${input.slice(0, 4).join(', ')}]`,
					rightHalfStr,
					`[${[...input.slice(0, 4)].sort((a, b) => b - a).join(', ')}]`,
				].filter((o, i, arr) => arr.indexOf(o) === i),
				answer: leftHalfStr,
				explanation:
					`Sorting the left four elements [${input.slice(0, 4).join(', ')}] yields ` +
					`${leftHalfStr}. Each half is sorted independently before the final merge.`,
			},
			{
				kind: 'choice',
				prompt:
					`Both halves are now sorted: left ${leftHalfStr}, right ${rightHalfStr}. ` +
					'What is the FINAL array after the top-level merge?',
				options: [
					finalStr,
					`[${input.join(', ')}]`,
					`[${[...input].sort((a, b) => b - a).join(', ')}]`,
					`${leftHalfStr.slice(0, -1)}, ${rightHalfStr.slice(1)}`,
				].filter((o, i, arr) => arr.indexOf(o) === i),
				answer: finalStr,
				explanation:
					'Merging the two sorted halves by repeatedly taking the smaller front ' +
					`element gives ${finalStr}. Concatenating the halves without merging would ` +
					'not be sorted.',
			},
			{
				kind: 'numeric',
				prompt:
					'Exactly how many element-to-element COMPARISONS does this merge sort ' +
					'perform on the array? (Count each "is left front ≤ right front?" test.)',
				answer: comparisons,
				placeholder: 'a count',
				explanation:
					`This run performs ${comparisons} comparisons across all the merges. Merge ` +
					'sort makes Θ(n log n) comparisons.',
			},
			{
				kind: 'choice',
				prompt:
					'Merge sort obeys the recurrence T(n) = 2·T(n/2) + Θ(n): two half-size ' +
					'subproblems plus a linear merge. What does it solve to?',
				options: ['Θ(n log n)', 'Θ(n²)', 'Θ(n)', 'Θ(log n)'],
				answer: 'Θ(n log n)',
				explanation:
					'By the Master Theorem with a = 2, b = 2, f(n) = Θ(n): log_b(a) = 1 = d, so ' +
					'this is Case 2 and T(n) = Θ(n log n). The log n factor is the number of ' +
					'halving levels; each level does Θ(n) merge work.',
			},
		],
	};
};

// The merge step in isolation: two fresh SORTED runs of 4 distinct values each
// (disjoint value ranges are NOT required — interleaving is the point). Merged
// result + recursion depth ⌈log₂ n⌉, the merged output read off the generator.
const sorting2 = seed => {
	const { left, right } = rejectionSample(
		seed,
		stream => {
			// 8 distinct values split into two sorted runs of 4.
			const all = distinctInts(stream, 8, 1, 40);
			const a = shuffle(stream, all);
			const left = a.slice(0, 4).sort((x, y) => x - y);
			const right = a.slice(4).sort((x, y) => x - y);
			return { left, right };
		},
		({ left, right }) => {
			// Require genuine interleaving (not one run entirely below the other), so
			// the merge is instructive rather than a concatenation.
			const maxLeft = Math.max(...left);
			const minRight = Math.min(...right);
			const maxRight = Math.max(...right);
			const minLeft = Math.min(...left);
			return maxLeft > minRight && maxRight > minLeft;
		}
	);
	const run = getMergeSortStepsWithStats([...left, ...right]);
	const n = left.length + right.length;
	const mergedStr = `[${mergeOutput(run.steps, 0, n - 1).join(', ')}]`;
	const depth = Math.ceil(Math.log2(n));
	return {
		kind: 'problem',
		__input: { left, right },
		stem:
			`Merge sort's MERGE step combines two already-sorted runs into one. You are ` +
			`handed the sorted runs [${left.join(', ')}] and [${right.join(', ')}].`,
		parts: [
			{
				kind: 'choice',
				prompt:
					'Merge the two sorted runs by repeatedly taking the smaller of the two ' +
					'front elements. What is the merged result?',
				options: [
					mergedStr,
					`[${[...left, ...right].join(', ')}]`,
					`[${[...left, ...right].sort((a, b) => b - a).join(', ')}]`,
					`[${[...right, ...left].join(', ')}]`,
				].filter((o, i, arr) => arr.indexOf(o) === i),
				answer: mergedStr,
				explanation:
					`Taking the smaller front element each step interleaves the runs into ` +
					`${mergedStr}. Merging two sorted lists of total length m costs Θ(m) ` +
					'comparisons, never more than m − 1.',
			},
			{
				kind: 'numeric',
				prompt:
					`Merge sort halves the array until each piece has one element. For n = ` +
					`${n} elements, how many halving LEVELS (the recursion depth) are there? ` +
					'(Each level halves the subproblem size.)',
				answer: depth,
				placeholder: 'a depth',
				explanation:
					`Halving ${n} → 4 → 2 → 1 takes ⌈log₂ ${n}⌉ = ${depth} levels. Each level ` +
					'does Θ(n) total merge work, giving the Θ(n log n) bound.',
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
				explanation:
					'Preferring the left run on ties means an earlier equal element is emitted ' +
					'first, so equal keys keep their input order. That makes merge sort stable.',
			},
		],
	};
};

// =============================================================================
// STRATEGIES — strategies-1 (coin change: greedy fails) and strategies-2 (climbing
// stairs / Fibonacci DP). Fresh coin set + target / fresh n; DP + greedy counts
// from buildCoinChangeFrames / buildClimbingStairsFrames.
// =============================================================================

// Coin change where GREEDY IS SUBOPTIMAL (the classic counterexample shape). We
// draw a 3-coin set including 1 (so every amount is makeable) and a target, then
// require greedyFinal > dpFinal — i.e. greedy genuinely overshoots — so the
// counterexample is real. Keys: dp[4], dp[target], greedy count, all from the run.
const strategies1 = seed => {
	const { coins, target } = rejectionSample(
		seed,
		stream => {
			// 1 plus two larger distinct coins in 2..9; target in 6..12.
			const larger = distinctInts(stream, 2, 2, 9);
			const coins = [1, ...larger].sort((a, b) => a - b);
			const target = int(stream, 6, 12);
			return { coins, target };
		},
		({ coins, target }) => {
			const run = buildCoinChangeFrames({ target, coins });
			const dp = run.summary.dpFinal;
			const greedy = run.summary.greedyFinal;
			// Greedy must finish but use MORE coins than the optimum (a true failure),
			// and target ≥ 4 so dp[4] is a sensible sub-question.
			return greedy != null && dp != null && greedy > dp && target >= 4;
		}
	);
	const run = buildCoinChangeFrames({ target, coins });
	const dpTable = run.frames[run.frames.length - 1].dpTable;
	const dpOpt = run.summary.dpFinal;
	const greedy = run.summary.greedyFinal;
	const dpAt4 = dpTable[4];
	return {
		kind: 'problem',
		__input: { coins, target },
		stem:
			`Make ${target}¢ using the coin denominations {${coins.join(', ')}}, with ` +
			'unlimited coins of each. Two approaches: a greedy that always takes the ' +
			'largest coin that fits, and a dynamic-programming table dp[a] = the fewest ' +
			'coins to make amount a.',
		parts: [
			{
				kind: 'numeric',
				prompt:
					`In the DP table, what is dp[4], the minimum number of coins to make 4¢ ` +
					`with {${coins.join(', ')}}?`,
				answer: dpAt4,
				placeholder: 'a coin count',
				explanation: `dp[4] = ${dpAt4}. dp[a] = 1 + min over coins c of dp[a − c].`,
			},
			{
				kind: 'numeric',
				prompt:
					`What is dp[${target}], the minimum number of coins to make ${target}¢ ` +
					'optimally?',
				answer: dpOpt,
				placeholder: 'a coin count',
				explanation:
					`dp[${target}] = ${dpOpt}. The DP examines every coin for every amount, so ` +
					'it never misses the optimum.',
			},
			{
				kind: 'numeric',
				prompt:
					`The GREEDY method takes the largest coin ≤ the remaining amount, ` +
					`repeatedly. How many coins does greedy use to make ${target}¢ here?`,
				answer: greedy,
				placeholder: 'a coin count',
				explanation:
					`Greedy uses ${greedy} coins, but the optimum is only ${dpOpt}, so greedy ` +
					'OVERSHOOTS here.',
			},
			{
				kind: 'choice',
				prompt:
					`On coins {${coins.join(', ')}} making ${target}¢, greedy used ${greedy} ` +
					`coins but the optimum is ${dpOpt}. What does this counterexample show?`,
				options: [
					'Greedy coin change is not optimal for arbitrary coin sets; only some (canonical) systems make it optimal',
					'Greedy is always optimal; the DP must be wrong',
					'The problem has no optimal solution',
					'DP and greedy always agree on coin change',
				],
				answer:
					'Greedy coin change is not optimal for arbitrary coin sets; only some (canonical) systems make it optimal',
				explanation:
					'Taking the biggest coin first can strand you with an expensive remainder. ' +
					'DP considers every option for every sub-amount, so it is always optimal; ' +
					'greedy is optimal only for special (canonical) coin sets.',
			},
		],
	};
};

// Climbing stairs (Fibonacci DP) for a fresh n in 5..10. ways(4) and ways(n) read
// off the DP table. The recurrence ways(n) = ways(n−1) + ways(n−2) is fixed shape.
const strategies2 = seed => {
	const n = int(mulberry32(toSeed(seed)), 5, 10);
	const run = buildClimbingStairsFrames(n);
	const dpTable = run.frames[run.frames.length - 1].dpTable;
	const ways = dpTable[n];
	return {
		kind: 'problem',
		__input: { n },
		stem:
			`Climbing stairs: you may take 1 or 2 steps at a time. The number of distinct ` +
			`ways to reach stair n satisfies ways(n) = ways(n−1) + ways(n−2), with ways(0) ` +
			'= ways(1) = 1. This is divide-and-conquer with OVERLAPPING subproblems, so DP ' +
			'(memoize each ways(k) once) replaces exponential recursion.',
		parts: [
			{
				kind: 'numeric',
				prompt:
					'Filling the table bottom-up, what is ways(4), the number of ways to climb ' +
					'4 stairs?',
				answer: dpTable[4],
				placeholder: 'a count',
				explanation:
					`ways(4) = ways(3) + ways(2) = ${dpTable[3]} + ${dpTable[2]} = ${dpTable[4]}. ` +
					'Each entry sums the two below it (a Fibonacci sequence).',
			},
			{
				kind: 'numeric',
				prompt: `What is ways(${n})?`,
				answer: ways,
				placeholder: 'a count',
				explanation:
					`ways(${n}) = ways(${n - 1}) + ways(${n - 2}) = ${dpTable[n - 1]} + ` +
					`${dpTable[n - 2]} = ${ways}. The DP table dp[0..${n}] is ` +
					`[${dpTable.join(', ')}].`,
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
				explanation:
					'There are only n + 1 distinct subproblems ways(0..n). Solving each once and ' +
					'reusing the stored value makes the whole computation Θ(n) instead of the ' +
					'exponential blow-up of recomputing shared subproblems.',
			},
		],
	};
};

// =============================================================================
// MASTER THEOREM, set 3 — master-3. Two FRESH recurrences that BOTH land in
// CASE 3 (the combine work f(n)=n^d outgrows the leaves n^c, c<d), classified by
// analyseRecurrence. The case + Θ bound for each are derived; the regularity
// condition and the not-polynomially-comparable "gap" verdict are conceptual
// (STATIC, indices 2 and 5), mirroring the fixed problemT3 exactly.
// =============================================================================

// One fresh Case-3 recurrence T(n) = a·T(n/b) + n^d (k = 0): draw b ∈ {2,3,4},
// d ∈ {1,2,3}, a ∈ [1..16] and rejection-sample until analyseRecurrence reports
// caseId 3 (so f genuinely dominates, with the module's own 0.04 tolerance — no
// borderline c≈d draws). Returns the params plus the readable fnText.
const drawCase3 = stream => {
	const fnTextOf = d => (d === 0 ? '1' : d === 1 ? 'n' : `n^${d}`);
	return rejectionSample(
		stream,
		s => {
			const b = pick(s, [2, 3, 4]);
			const d = int(s, 1, 3);
			const a = int(s, 1, 16);
			return { a, b, d, k: 0 };
		},
		p => analyseRecurrence(p).caseId === 3
	);
};

// Replicates examSets.js's masterProblem option-building EXACTLY, so the seeded
// option lists read like the fixed bank: the three case labels, and a Θ-bound
// pool seeded with the derived result (deduped, capped at 4 ⇒ answer present,
// distractors plausible and distinct).
const masterCase3View = ({ a, b, d, k }) => {
	const r = analyseRecurrence({ a, b, d, k });
	const cValue = Math.log(a) / Math.log(b);
	const cTxt = cText(a, b);
	const fnText = d === 0 ? '1' : d === 1 ? 'n' : `n^${d}`;
	const recurrenceText = `T(n) = ${a}·T(n/${b}) + ${fnText}`;
	const caseOptions = ['Case 1', 'Case 2', 'Case 3'];
	const BOUND_POOL = [
		`Θ(${formatNForExam(cValue)})`,
		`Θ(${formatNForExam(d)})`,
		'Θ(n log n)',
		'Θ(n^2)',
		'Θ(n^3)',
		'Θ(n)',
	];
	const boundOptions = [r.result, ...BOUND_POOL.filter(o => o !== r.result)]
		.filter((o, i, arr) => arr.indexOf(o) === i)
		.slice(0, 4);
	return {
		a,
		b,
		d,
		r,
		cTxt,
		fnText,
		recurrenceText,
		caseOptions,
		boundOptions,
	};
};

const master3 = seed => {
	// Two DISTINCT fresh Case-3 recurrences (T3, T4): redraw the second until its
	// (a,b,d) differs from the first, so T4 is recognised, not pattern-matched.
	const t3p = drawCase3(seed);
	const t4p = rejectionSample(
		(seed ^ 0x9e3779b9) >>> 0,
		s => drawCase3((s ^ Math.imul(int(s, 1, 1 << 20), 2654435761)) >>> 0),
		p => !(p.a === t3p.a && p.b === t3p.b && p.d === t3p.d)
	);
	const T3 = masterCase3View(t3p);
	const T4 = masterCase3View(t4p);
	return {
		kind: 'problem',
		__input: { t3: t3p, t4: t4p },
		stem:
			`Two recurrences whose combine work outgrows the leaves (Case 3), plus the ` +
			`fine print the Master Theorem attaches to that case. For T3, ` +
			`${T3.recurrenceText}: a = ${T3.a}, b = ${T3.b}, f(n) = ${T3.fnText}, so ` +
			`c = log_${T3.b}(${T3.a}) = ${T3.cTxt}.`,
		parts: [
			{
				kind: 'choice',
				prompt:
					`T3: ${T3.recurrenceText}. Comparing c = ${T3.cTxt} with d = ${T3.d}, ` +
					`which Master Theorem case applies?`,
				options: T3.caseOptions,
				answer: T3.r.name,
				explanation:
					`${T3.r.name}: ${T3.r.tone}. c = ${T3.cTxt} < d = ${T3.d}, so the root ` +
					`combine work dominates.`,
			},
			{
				kind: 'choice',
				prompt: `T3: ${T3.recurrenceText}. What is the asymptotic bound Θ(·) for T(n)?`,
				options: T3.boundOptions,
				answer: T3.r.result,
				explanation: `The bound is ${T3.r.result}. ${T3.r.explanation}`,
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
					`For the polynomial f(n) = ${T3.fnText} it holds, so T3 is genuinely ${T3.r.result}.`,
			},
			{
				kind: 'choice',
				prompt:
					`T4: ${T4.recurrenceText}. Here a = ${T4.a}, b = ${T4.b}, f(n) = ${T4.fnText}, ` +
					`so c = log_${T4.b}(${T4.a}) = ${T4.cTxt}. Comparing c with d = ${T4.d}, ` +
					`which case applies?`,
				options: T4.caseOptions,
				answer: T4.r.name,
				explanation:
					`${T4.r.name}: ${T4.r.tone}. c = ${T4.cTxt} < d = ${T4.d}, so the root ` +
					`combine work dominates again.`,
			},
			{
				kind: 'choice',
				prompt: `T4: ${T4.recurrenceText}. What is the asymptotic bound Θ(·) for T(n)?`,
				options: T4.boundOptions,
				answer: T4.r.result,
				explanation: `The bound is ${T4.r.result}. ${T4.r.explanation}`,
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
};

// =============================================================================
// FOUNDATIONS, set 3 — foundations-3. A FRESH n appended into a dynamic array
// that starts at capacity 1 and DOUBLES when full; the total element COPIES across
// resizes and the number of DOUBLINGS are produced by a pure simulation (never
// hand-typed). The amortized-vs-worst-case reasoning parts are conceptual (STATIC,
// indices 2 and 3), mirroring the fixed problemF3 exactly.
// =============================================================================

// Pure doubling simulation, identical to examSets.js's simulateDoubling (which is
// private there): copies happen only at a resize, where every stored element moves
// into the doubled buffer. Inlined so the builder owns its derivation.
const simulateDoublingInstance = n => {
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
	return { copies, doublings, finalCapacity: capacity };
};

const isPowerOfTwo = n => n > 0 && (n & (n - 1)) === 0;

const foundations3 = seed => {
	// A fresh n in 12..40, biased to a NON-power-of-two so the counts are
	// non-obvious (as the fixed n = 17 is). The range straddles 16 and 32, so the
	// copies/doublings vary across seeds (15/4, 31/5, 63/6).
	const n = rejectionSample(
		seed,
		s => int(s, 12, 40),
		v => !isPowerOfTwo(v)
	);
	const sim = simulateDoublingInstance(n);
	const copies = sim.copies;
	const doublings = sim.doublings;
	const finalCap = sim.finalCapacity;
	return {
		kind: 'problem',
		__input: { n },
		stem:
			`A dynamic array starts at capacity 1 and DOUBLES its capacity whenever it ` +
			`is full. You append n = ${n} elements one at a time. A resize is the only ` +
			`time elements are copied: growing from capacity c moves all c elements into ` +
			`the new capacity-2c buffer. Count the copying work, then reason about why ` +
			`each append is still O(1) on average.`,
		parts: [
			{
				kind: 'numeric',
				prompt:
					`Across ALL the resizes triggered while appending ${n} elements, how ` +
					`many element COPIES are made in total? (Each resize copies every element ` +
					`currently stored into the doubled buffer.)`,
				answer: copies,
				placeholder: 'a copy count',
				explanation:
					`Each resize copies the elements present at that moment, and the resizes ` +
					`fire at sizes 1, 2, 4, 8, … below n, so the copies sum to a geometric ` +
					`series totalling ${copies}. That sum is 2·(largest power of two ≤ n) − 1, ` +
					`always strictly less than 2n; here ${copies} < 2·${n} = ${2 * n}. Spreading ` +
					`${copies} copies over ${n} appends is under 2 copies per append, the Θ(1) ` +
					`amortized cost.`,
			},
			{
				kind: 'numeric',
				prompt:
					`How many times does the array DOUBLE (resize) while those ${n} ` +
					`elements are appended?`,
				answer: doublings,
				placeholder: 'a count',
				explanation:
					`A resize fires each time size reaches a power of two below n, so the ` +
					`capacity climbs 1 → 2 → 4 → … → ${finalCap}: ${doublings} doublings. In ` +
					`general there are about ⌊log₂ n⌋ + 1 of them, because each needs twice the ` +
					`elements of the last to trigger, and that geometric spacing is exactly why ` +
					`the copies stay O(n) total.`,
			},
			{
				kind: 'choice',
				prompt:
					`The total copy work is a geometric series 1 + 2 + 4 + … summing to ` +
					`${copies} (< 2n). Why does this make a single append O(1) AMORTIZED?`,
				options: [
					'The whole append sequence does < 2n copies, so averaged over the n appends each one costs O(1), even though individual appends differ',
					'Every individual append copies at most 2 elements, so each is O(1) in the worst case',
					'Doubling makes every append cost exactly the same, so they are all O(1)',
					'Amortized means the best case, and the best-case append copies nothing',
				],
				answer:
					'The whole append sequence does < 2n copies, so averaged over the n appends each one costs O(1), even though individual appends differ',
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
				explanation:
					`A single append is O(n) in the worst case: when size has reached capacity, ` +
					`growing the array copies all the stored elements (up to n) into the new ` +
					`buffer before the new element lands. The amortized O(1) bound averages this ` +
					`rare O(n) spike over the many O(1) appends; it does not make any individual ` +
					`append cheap.`,
			},
		],
	};
};

// =============================================================================
// HASHING, set 2 — hashing-2. A FRESH set of 8 distinct string keys in m = 7
// buckets (and 2m = 14 on resize), hashed by the module's own polynomial hash via
// createBucketsFromEntries. The load factor α = n/m before the resize, the longest
// chain AFTER the resize, and where a chosen key rehashes (h mod 2m) are all
// derived; only "why expected lookup is O(1)" is conceptual (STATIC, index 3),
// mirroring the fixed problemHM2 exactly.
// =============================================================================

// A pool of short, distinct four-letter animal words — readable stems, and the
// hash + buckets stay derived. Large enough that an 8-key draw has real spread.
const HASH2_WORD_POOL = [
	'frog',
	'crab',
	'clam',
	'seal',
	'orca',
	'tuna',
	'bass',
	'carp',
	'newt',
	'toad',
	'hare',
	'lynx',
	'mole',
	'vole',
	'wolf',
	'puma',
	'ibex',
	'kudu',
	'gnat',
	'moth',
	'wasp',
	'slug',
	'crow',
	'dove',
	'lark',
	'swan',
	'wren',
	'kiwi',
	'tern',
	'gull',
];

const hashing2 = seed => {
	const capacity = 7; // m before the resize (kept fixed ⇒ α = 8/7 reproducible)
	const capacity2 = capacity * 2; // m after doubling (rehash target)
	const bucketOf = (buckets, key) =>
		buckets.findIndex(b => b.some(e => e.key === key));
	const maxChain = buckets => Math.max(...buckets.map(b => b.length));

	// Draw 8 distinct words; require a real BEFORE collision (≥1 overloaded chain)
	// AND that the resize genuinely shortens the longest chain (maxAfter < maxBefore),
	// so the "resize payoff" the prompt narrates actually happens. The probe key is
	// keys[0] (always present ⇒ its bucket is determinate before and after).
	const keys = rejectionSample(
		seed,
		s => shuffle(s, HASH2_WORD_POOL).slice(0, 8),
		ks => {
			const entries = ks.map(k => ({ key: k, value: k.length }));
			const before = createBucketsFromEntries(entries, capacity);
			const after = createBucketsFromEntries(entries, capacity2);
			const maxBefore = maxChain(before);
			const maxAfter = maxChain(after);
			const collides = before.some(b => b.length > 1);
			return collides && maxBefore >= 2 && maxAfter < maxBefore;
		}
	);
	const entries = keys.map(k => ({ key: k, value: k.length }));
	const before = createBucketsFromEntries(entries, capacity);
	const after = createBucketsFromEntries(entries, capacity2);
	const alphaBefore = keys.length / capacity; // 8 / 7 (raw; graded with tolerance)
	const alphaBeforeStr = alphaBefore.toFixed(2); // "1.14" for prose
	const alphaAfterStr = (keys.length / capacity2).toFixed(2); // "0.57"
	const maxBefore = maxChain(before);
	const maxAfter = maxChain(after);
	const collBefore = before.filter(b => b.length > 1).length;
	const collAfter = after.filter(b => b.length > 1).length;
	const probeKey = keys[0];
	const probeBefore = bucketOf(before, probeKey);
	const probeAfter = bucketOf(after, probeKey);
	return {
		kind: 'problem',
		__input: { keys, capacity },
		stem:
			`A hash table with separate chaining holds ${keys.length} keys in ` +
			`m = ${capacity} buckets. The hash of a string is h = 7, then ` +
			`h = h*31 + charCode for each character, and the bucket is h mod m. The keys ` +
			`are ${keys.map(k => `"${k}"`).join(', ')}. The table is about to ` +
			`resize by doubling to m = ${capacity2} and rehashing every key.`,
		parts: [
			{
				kind: 'numeric',
				prompt:
					`Before the resize, what is the load factor alpha = n / m? ` +
					`(${keys.length} keys in ${capacity} buckets; give two decimals.)`,
				answer: alphaBefore,
				tolerance: 0.01,
				placeholder: 'a load factor',
				explanation:
					`alpha = n / m = ${keys.length} / ${capacity} = ${alphaBeforeStr}. ` +
					`Because alpha is above 1 there are more keys than buckets, so by the ` +
					`pigeonhole principle some bucket must chain. The expected chain length is ` +
					`alpha, which is why the table resizes to pull it back down.`,
			},
			{
				kind: 'numeric',
				prompt:
					`The resize doubles the table to m = ${capacity2} and rehashes every ` +
					`key. After the resize, what is the length of the LONGEST chain?`,
				answer: maxAfter,
				placeholder: 'a length',
				explanation:
					`Rehashing into ${capacity2} buckets drops the load factor to ` +
					`${alphaAfterStr}, and the longest chain shrinks from ${maxBefore} to ` +
					`${maxAfter} (the count of collision buckets falls from ${collBefore} to ` +
					`${collAfter}). A shorter worst-case chain is exactly what restores fast ` +
					`lookups.`,
			},
			{
				kind: 'numeric',
				prompt:
					`At m = ${capacity} the key "${probeKey}" sits in bucket ${probeBefore}. ` +
					`After the table doubles to m = ${capacity2}, which bucket does ` +
					`"${probeKey}" rehash into?`,
				answer: probeAfter,
				placeholder: 'a bucket index',
				explanation:
					`The bucket is h mod m, and only m changed (the hash h of "${probeKey}" ` +
					`is fixed). Recomputing h mod ${capacity2} moves it from bucket ` +
					`${probeBefore} to bucket ${probeAfter}, which is why every key has to be ` +
					`rehashed on a resize rather than copied to the same slot.`,
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
				explanation:
					'With a hash that distributes keys uniformly, the expected number of keys ' +
					'in a bucket is alpha = n / m, so an average lookup scans O(1 + alpha) ' +
					'entries. Resizing whenever alpha grows past a threshold keeps alpha below ' +
					'a fixed constant, which pins the expected work at O(1).',
			},
		],
	};
};

// =============================================================================
// STRATEGIES, set 3 — strategies-3. A FRESH set of 9 activities (half-open
// intervals [start, finish)) with a UNIQUE, non-trivial greedy selection, run
// through activitySelect (earliest-finish-first). The first activity picked, the
// maximum compatible count, and the full selected set are derived; only the
// exchange-argument "why optimal" part is conceptual (STATIC, index 3), mirroring
// the fixed problemP3 exactly.
// =============================================================================

// The classic WRONG greedy (earliest START first), used ONLY to build a plausible
// distractor set for the choice; pure, deterministic.
const earliestStartSelect = activities => {
	const byStart = [...activities].sort((a, b) => {
		if (a.start !== b.start) return a.start - b.start;
		if (a.finish !== b.finish) return a.finish - b.finish;
		return String(a.id) < String(b.id) ? -1 : 1;
	});
	const ids = [];
	let lastFinish = -Infinity;
	for (const act of byStart) {
		if (act.start >= lastFinish) {
			ids.push(act.id);
			lastFinish = act.finish;
		}
	}
	return ids;
};

const strategies3 = seed => {
	const N = 9;
	const ids = Array.from({ length: N }, (_, i) => `A${i + 1}`);
	// Draw 9 activities with small half-open intervals over a 0..14 timeline. We
	// CONSTRAIN to a non-trivial, distinct-option instance so every choice part has
	// 4 distinct options on every seed (the seeded guardrail checks this):
	//   • 3 ≤ count ≤ 6 and count < N      (a real subset, not 1 and not all)
	//   • the earliest-start greedy differs from earliest-finish      (distractor ≠ answer)
	//   • the four selected-set strings are pairwise distinct
	const built = rejectionSample(
		seed,
		s =>
			ids.map(id => {
				const start = int(s, 0, 11);
				const len = int(s, 1, 3);
				return { id, start, finish: start + len };
			}),
		acts => {
			const run = activitySelect(acts);
			const count = run.count;
			if (count < 3 || count > 6 || count >= N) return false;
			const sel = run.selectedIds;
			const allStr = `{${acts.map(a => a.id).join(', ')}}`;
			const selStr = `{${sel.join(', ')}}`;
			const droppedStr = `{${sel.slice(0, -1).join(', ')}}`; // a smaller compatible set
			const earlyStart = earliestStartSelect(acts);
			const earlyStr = `{${earlyStart.join(', ')}}`;
			// The earliest-start greedy must produce a DIFFERENT id sequence than the
			// optimal greedy (else the "wrong greedy" distractor equals the answer)...
			if (earlyStr === selStr) return false;
			// ...and the four set-strings (answer + 3 distractors) must all differ.
			const setOpts = [selStr, allStr, earlyStr, droppedStr];
			if (new Set(setOpts).size !== setOpts.length) return false;
			// The first-pick choice needs 3 OTHER distinct ids besides selectedIds[0].
			const others = acts.map(a => a.id).filter(id => id !== sel[0]);
			return others.length >= 3;
		}
	);
	const acts = built;
	const run = activitySelect(acts);
	const sel = run.selectedIds;
	const count = run.count;
	const first = sel[0];
	const selStr = `{${sel.join(', ')}}`;
	const allStr = `{${acts.map(a => a.id).join(', ')}}`;
	const droppedStr = `{${sel.slice(0, -1).join(', ')}}`;
	const earlyStr = `{${earliestStartSelect(acts).join(', ')}}`;
	// First-pick distractors: 3 other ids in finish-time order (instance-derived).
	const byFinish = [...acts].sort((a, b) =>
		a.finish !== b.finish
			? a.finish - b.finish
			: a.start !== b.start
				? a.start - b.start
				: String(a.id) < String(b.id)
					? -1
					: 1
	);
	const firstDistractors = byFinish
		.map(a => a.id)
		.filter(id => id !== first)
		.slice(0, 3);
	const lastChosen = acts.find(a => a.id === sel[sel.length - 1]);
	const secondChosen = sel.length > 1 ? acts.find(a => a.id === sel[1]) : null;
	return {
		kind: 'problem',
		__input: { activities: acts },
		stem:
			`Activity selection. Nine activities want one shared resource (one room, one ` +
			`processor); each is a half-open interval [start, finish), so an activity ` +
			`finishing at t and one starting at t do NOT clash. Choose the LARGEST set ` +
			`with no two overlapping. The greedy: sort by finish time, take the activity ` +
			`that finishes earliest, then repeatedly take the next activity whose start ` +
			`is at or after the last chosen finish.\n\n` +
			acts.map(a => `    ${a.id}: [${a.start}, ${a.finish})`).join('\n'),
		parts: [
			{
				kind: 'choice',
				prompt:
					`The greedy commits to one activity before looking at any other. Which ` +
					`activity does it pick FIRST?`,
				options: [first, ...firstDistractors],
				answer: first,
				explanation:
					`Sorted by finish time, ${first} = [${
						acts.find(a => a.id === first).start
					}, ${
						acts.find(a => a.id === first).finish
					}) finishes first, so the greedy takes it. Choosing the activity that ` +
					`frees the resource soonest leaves the most time for everything after it.`,
			},
			{
				kind: 'numeric',
				prompt:
					`Running the greedy to the end, what is the MAXIMUM number of mutually ` +
					`compatible activities you can schedule?`,
				answer: count,
				placeholder: 'a count',
				explanation:
					`Earliest-finish-first commits to ${selStr}: ${count} activities, each ` +
					`starting at or after the previous one finishes. No compatible set is ` +
					`larger, because the greedy choice is provably optimal.`,
			},
			{
				kind: 'choice',
				prompt: `Which set of activities does the greedy actually select?`,
				options: [selStr, allStr, earlyStr, droppedStr],
				answer: selStr,
				explanation:
					`Taking the earliest finish each time gives ${selStr}. Each activity ` +
					`starts at or after the previous one finishes, so the set is compatible ` +
					`and (by the exchange argument) maximum. The full set ${allStr} contains ` +
					`overlapping activities, so they cannot all be kept.`,
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
};

// =============================================================================
// NP-COMPLETENESS, set 3 — np-3. The VERTEX-COVER <-> INDEPENDENT-SET complement
// reduction on a FRESH cycle C_n (n drawn 5..11): a set S is independent iff V \ S
// is a vertex cover, so |VC| = n - |IS|. The three size answers (VC from an
// independent set, IS from a vertex cover, and the minimum vertex cover from the
// maximum independent set) are derived from that pure complement map; only the
// reduction DIRECTION and the yes<->yes biconditional are conceptual (STATIC,
// indices 3 and 4), mirroring the fixed problemNP3 exactly.
// =============================================================================

// The reduction's size map, identical to examSets.js's vcIsSize (private there):
// S independent IFF V \ S a vertex cover ⇒ the two sizes are complements in n.
const vcIsSizeInstance = (n, size) => n - size;

const np3 = seed => {
	// A fresh cycle C_n, n in 5..11 (odd or even). For C_n the maximum independent
	// set is ⌊n/2⌋ and the minimum vertex cover is ⌈n/2⌉ = n − ⌊n/2⌋ — an honest
	// instance of the theorem (verified by brute force in the self-check).
	const n = int(mulberry32(toSeed(seed)), 5, 11);
	const edges = Array.from({ length: n }, (_, i) => ({
		u: String(i + 1),
		v: String(((i + 1) % n) + 1),
	}));
	const maxIs = Math.floor(n / 2); // C_n's maximum independent set size
	const minVc = vcIsSizeInstance(n, maxIs); // = ⌈n/2⌉
	// Given sizes the prompt fixes: an independent set of size = maxIs (achievable),
	// and a vertex cover of size minVc + 1 (a valid, non-minimum cover for n ≥ 5).
	const isGiven = maxIs;
	const vcFromIs = vcIsSizeInstance(n, isGiven); // = minVc
	const vcGiven = minVc + 1;
	const isFromVc = vcIsSizeInstance(n, vcGiven); // = maxIs − 1
	// Readable vertex/edge listings for the stem (kept as locals so the template
	// literal stays flat).
	const vertexList = Array.from({ length: n }, (_, i) => i + 1).join(', ');
	const edgeList = edges.map(e => `${e.u}–${e.v}`).join(', ');
	return {
		kind: 'problem',
		__input: { n },
		stem:
			`A concrete reduction between two NP-complete problems on ONE graph. Let G be ` +
			`the ${n}-cycle on vertices ${vertexList} with edges ${edgeList} (n = ${n} ` +
			`vertices). The key fact: a set S of vertices is INDEPENDENT (no edge inside ` +
			`S) if and only if its complement V \\ S is a VERTEX COVER (every edge has an ` +
			`endpoint outside S). So an independent set of size s corresponds exactly to a ` +
			`vertex cover of size n - s, and this single complement map reduces either ` +
			`problem to the other.`,
		parts: [
			{
				kind: 'numeric',
				prompt:
					`Suppose S is an INDEPENDENT SET of size ${isGiven} in G. Under the ` +
					`complement reduction, V \\ S is a vertex cover. What is its SIZE? ` +
					`(n = ${n}.)`,
				answer: vcFromIs,
				placeholder: 'a set size',
				explanation:
					`V \\ S has n - s = ${n} - ${isGiven} = ${vcFromIs} vertices. Every edge ` +
					`has at least one endpoint outside the independent set S, so the complement ` +
					`covers all edges. (On C${n} this is the optimum: size-${isGiven} ` +
					`independent set <-> size-${vcFromIs} vertex cover.)`,
			},
			{
				kind: 'numeric',
				prompt:
					`Now run the reduction the OTHER way. Suppose C is a VERTEX COVER of size ` +
					`${vcGiven} in G. Then V \\ C is an independent set. What is ITS size? ` +
					`(n = ${n}.)`,
				answer: isFromVc,
				placeholder: 'a set size',
				explanation:
					`V \\ C has n - c = ${n} - ${vcGiven} = ${isFromVc} vertices. Because C ` +
					`covers every edge, no edge lies inside V \\ C, so V \\ C is independent. ` +
					`The same complement map carries a vertex cover back to an independent set, ` +
					`which is why the reduction works in both directions.`,
			},
			{
				kind: 'numeric',
				prompt:
					`The optimization versions are complements too. The MAXIMUM independent ` +
					`set of this ${n}-cycle has size ${maxIs}. What is the size of the MINIMUM ` +
					`vertex cover of G?`,
				answer: minVc,
				placeholder: 'a set size',
				explanation:
					`Minimum vertex cover = n - (maximum independent set) = ${n} - ${maxIs} = ` +
					`${minVc}. Maximizing the independent set is exactly minimizing its ` +
					`complementary cover, so a largest independent set and a smallest vertex ` +
					`cover always partition the n vertices.`,
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
				explanation:
					`Taking complements is a size-preserving bijection between independent sets ` +
					`of size s and vertex covers of size n - s, so a YES instance maps to a YES ` +
					`instance and a NO to a NO: G has an independent set of size ≥ s iff G has a ` +
					`vertex cover of size ≤ n - s. That answer-preserving equivalence, computed ` +
					`in polynomial time, is exactly what makes it a valid reduction.`,
			},
		],
	};
};

// =============================================================================
// ALL-PAIRS SHORTEST PATHS #2 (apsp-2) — the Floyd-Warshall DP RECURRENCE and
// its per-k intermediate matrices. apsp-1 grades a final row plus a k=1 cell;
// apsp-2 is the complementary angle — it reads a per-k layer cell, asks which
// intermediate FIRST lowers a cell, and a final distance. Fresh DIRECTED graph
// on 4 vertices 1..4, non-negative weights (so there is never a negative cycle).
// Every numeric answer is read off floydWarshall's `layers[k]` (D after allowing
// {1..k}) and final `dist`; only the transitive-closure analogue is conceptual.
//
// Constraint (loose enough that EVERY seed draws in a handful of attempts):
// vertices 2, 3, 4 reachable from 1 (so row 1 is finite for the numerics) AND
// d[1][4] genuinely IMPROVES at least once during the k-loop — i.e. it has a
// determinate "first vertex to lower it", so the choice has a real vertex answer
// (not "it never drops"). reachableDirected lays a forward-only DAG, so every
// per-cell first-improver is well defined and the answer is single-valued.
const apsp2 = seed => {
	const ids = ['1', '2', '3', '4'];
	// The first intermediate vertex (in k-order) whose admission changes d[i][j]:
	// scan layers for the first k where the cell differs from the previous layer;
	// layer k is the round that admitted ids[k-1]. Same read-off as examSets.js.
	const firstImprove = (layers, idx, i, j) => {
		for (let k = 1; k < layers.length; k += 1) {
			const prev = layers[k - 1][i][j];
			const cur = layers[k][i][j];
			if (JSON.stringify(prev) !== JSON.stringify(cur)) return idx[k - 1];
		}
		return null;
	};
	const graph = rejectionSample(
		seed,
		stream => ({
			nodes: ids.map(id => ({ id })),
			...reachableDirected(stream, ids, {
				extra: 3,
				wOf: s => int(s, 1, 9),
			}),
		}),
		g => {
			const run = floydWarshall(g);
			const idx = run.ids;
			const ix = id => idx.indexOf(id);
			const row1 = run.dist[ix('1')];
			// 1 must reach 2, 3 and 4 (finite distances) for the numeric parts.
			if (
				row1[ix('2')] == null ||
				row1[ix('3')] == null ||
				row1[ix('4')] == null
			)
				return false;
			// d[1][4] must drop at least once, so "which vertex first lowers it" is a
			// real, single intermediate vertex rather than "never".
			return firstImprove(run.layers, idx, ix('1'), ix('4')) != null;
		}
	);
	const run = floydWarshall(graph);
	const idx = run.ids;
	const ix = id => idx.indexOf(id);
	// d[1][3] AFTER the k = 2 round (intermediates restricted to {1, 2}).
	const l2_13 = distVal(run.layers[2][ix('1')][ix('3')]);
	// Which intermediate first lowers d[1][4] (a vertex 2 or 3 — the only non-
	// endpoint hops between 1 and 4 in this DAG).
	const first14 = firstImprove(run.layers, idx, ix('1'), ix('4'));
	// Final shortest distance 1 → 4.
	const fin14 = distVal(run.dist[ix('1')][ix('4')]);
	// Choice options: the real first-improver + the OTHER vertices as "Vertex k" +
	// the "never" sentinel, deduped to four. All derived from the instance.
	const firstAnswer = `Vertex ${first14}`;
	const choiceOptions = [
		firstAnswer,
		...ids.filter(v => v !== first14).map(v => `Vertex ${v}`),
		'It never drops below the direct value',
	]
		.filter((o, i, arr) => arr.indexOf(o) === i)
		.slice(0, 4);
	return {
		kind: 'problem',
		__input: { graph },
		stem:
			'Directed weighted graph on vertices 1, 2, 3, 4 with edges ' +
			`${listDirected(graph.edges)}. ` +
			'Run Floyd-Warshall and watch the intermediate matrices: ' +
			'd_k[i][j] = min(d_{k−1}[i][j], d_{k−1}[i][k] + d_{k−1}[k][j]) lets a path ' +
			'route through vertex k once round k admits it.',
		parts: [
			{
				kind: 'numeric',
				prompt:
					'After the k = 2 round (intermediates restricted to {1, 2}), what is ' +
					'd[1][3]? Apply the recurrence: is routing 1 → 2 → 3 shorter than the ' +
					'best 1 → 3 found so far?',
				answer: l2_13,
				placeholder: 'a distance',
				explanation:
					`d[1][3] = ${l2_13} after admitting intermediates {1, 2}. The ` +
					'recurrence compares the previous value with d[1][2] + d[2][3]; the ' +
					'smaller wins.',
			},
			{
				kind: 'choice',
				prompt:
					'Track d[1][4] as k grows. Admitting which vertex k as an intermediate ' +
					'is the FIRST to lower d[1][4] below its starting value?',
				options: choiceOptions,
				answer: firstAnswer,
				explanation:
					`${firstAnswer}. Scanning the per-k layers, d[1][4] first drops on the ` +
					`round that admits ${first14} as an intermediate, because routing ` +
					`through ${first14} beats every 1 → 4 path allowed before it.`,
			},
			{
				kind: 'numeric',
				prompt:
					'In the FINAL distance matrix (all intermediates allowed), what is ' +
					'd[1][4], the shortest distance from vertex 1 to vertex 4?',
				answer: fin14,
				placeholder: 'a distance',
				explanation:
					`d[1][4] = ${fin14}, the shortest 1 → 4 distance once every vertex has ` +
					'been considered as an intermediate.',
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
				answer:
					't_k[i][j] = t_{k−1}[i][j] OR (t_{k−1}[i][k] AND t_{k−1}[k][j])',
				explanation:
					'It is Floyd-Warshall with min → OR and + → AND: i reaches j through ' +
					'{1..k} iff it already did, OR it can reach k AND k can reach j. Same ' +
					'k-outermost triple loop, Θ(V³).',
			},
		],
	};
};

// =============================================================================
// MAXIMUM FLOW #2 (maxflow-2) — augmenting paths + max-flow / min-cut on a
// network whose cut can be INTERIOR (not just the source or sink edges). Fresh
// capacitated S → T network on the same 6-vertex skeleton as the fixed apsp-2
// twin (S→A, S→C, A→B, A→C, C→D, B→D, B→T, D→T) with random integer capacities.
// We grade the bottleneck of the FIRST augmenting path, the max-flow value, the
// min-cut capacity (equal to it), and which side of the cut vertex D lands on.
// All numbers are read off edmondsKarpTrace (frames carry each path + bottleneck;
// run.minCut carries the capacity and the reachable-from-S side); only the
// theorem statement is conceptual.
//
// Constraint: positive flow AND the source side of the min cut is a PROPER subset
// (so the cut actually splits the graph and all three numerics are meaningful),
// AND a first augmenting path with a bottleneck exists. Samples in 1 attempt for
// essentially every seed (the skeleton always admits an S→T path).
const maxflow2 = seed => {
	const network = rejectionSample(
		seed,
		stream => {
			const cap = (lo, hi) => int(stream, lo, hi);
			// Fixed skeleton, random capacities. Ranges keep B→T/B→D narrow so the
			// cut is often interior (cheaper than the source or sink edge bundles).
			const edges = [
				{ from: 'S', to: 'A', capacity: cap(4, 12) },
				{ from: 'S', to: 'C', capacity: cap(4, 12) },
				{ from: 'A', to: 'B', capacity: cap(4, 12) },
				{ from: 'A', to: 'C', capacity: cap(2, 6) },
				{ from: 'C', to: 'D', capacity: cap(3, 9) },
				{ from: 'B', to: 'D', capacity: cap(1, 4) },
				{ from: 'B', to: 'T', capacity: cap(3, 8) },
				{ from: 'D', to: 'T', capacity: cap(5, 12) },
			];
			return {
				nodes: ['S', 'A', 'B', 'C', 'D', 'T'].map(id => ({ id })),
				source: 'S',
				sink: 'T',
				edges,
			};
		},
		net => {
			const run = edmondsKarpTrace(net);
			if (run.value <= 0) return false;
			if (!(run.minCut.S.length >= 1 && run.minCut.S.length < net.nodes.length))
				return false;
			return run.frames.some(f => f.bottleneck != null);
		}
	);
	const run = edmondsKarpTrace(network);
	const value = run.value;
	const cut = run.minCut;
	const cutCap = cut.capacity;
	// First augmenting path + its bottleneck (the earliest frame carrying a path's
	// min residual capacity). Edmonds-Karp augments along shortest residual paths.
	const first = run.frames.find(f => f.bottleneck != null);
	const firstBottleneck = first.bottleneck;
	const firstPath = [first.path[0].from, ...first.path.map(re => re.to)].join(
		' → '
	);
	// Which side of the min cut vertex D is on: the source side S is exactly the
	// set still reachable from S in the FINAL residual network.
	const dSide = cut.S.includes('D')
		? 'Source side (with S)'
		: 'Sink side (with T)';
	const cutEdges = cut.edges
		.map(e => `${e.from}→${e.to}(${e.capacity})`)
		.join(', ');
	const capList = network.edges
		.map(e => `${e.from}→${e.to}(${e.capacity})`)
		.join(', ');
	return {
		kind: 'problem',
		__input: { network },
		stem:
			`Flow network from source S to sink T with capacities ${capList}. ` +
			'Run Edmonds-Karp: repeatedly find an augmenting path in the residual ' +
			'network, push its bottleneck of flow, and stop when none remains.',
		parts: [
			{
				kind: 'numeric',
				prompt:
					`The first augmenting path Edmonds-Karp finds is ${firstPath}. What ` +
					'is its BOTTLENECK — the most flow you can push along it this round?',
				answer: firstBottleneck,
				placeholder: 'a capacity',
				explanation:
					'The bottleneck is the smallest residual capacity on the path. Along ' +
					`${firstPath} the minimum residual is ${firstBottleneck}, so only that ` +
					'many units fit this round — the tightest edge is the constraint, not ' +
					'the widest one.',
			},
			{
				kind: 'numeric',
				prompt: 'What is the value of the maximum flow from S to T?',
				answer: value,
				placeholder: 'a flow value',
				explanation:
					'Augmenting paths keep adding flow until no residual S→T path ' +
					`remains. The total pushed out of S is then ${value}, the maximum flow.`,
			},
			{
				kind: 'numeric',
				prompt:
					'By the max-flow / min-cut theorem, the minimum-cut capacity equals ' +
					'the max-flow value. What is the capacity of the minimum cut?',
				answer: cutCap,
				placeholder: 'a capacity',
				explanation:
					`The min cut crosses ${cutEdges}, total capacity ${cutCap} — equal to ` +
					`the max flow ${value}, exactly as the theorem guarantees.`,
			},
			{
				kind: 'choice',
				prompt:
					'Once no augmenting path remains, the vertices reachable from S in the ' +
					'final residual network form the source side of the min cut. Which ' +
					'side is vertex D on?',
				options: ['Source side (with S)', 'Sink side (with T)'],
				answer: dSide,
				explanation:
					`The source side S = {${cut.S.join(', ')}} is exactly what stays ` +
					'reachable from S once every augmenting path is exhausted, so D sits ' +
					`on the ${dSide.includes('Source') ? 'source' : 'sink'} side: ${dSide}.`,
			},
			{
				kind: 'choice',
				prompt:
					'Edmonds-Karp stops when it can find NO augmenting path from S to T. ' +
					'Why does that prove the flow is already MAXIMUM?',
				options: [
					'No augmenting path means the reachable set S forms a cut whose capacity equals the current flow, and no flow can exceed any cut (max-flow = min-cut)',
					'Because every edge in the network is now saturated to capacity',
					'Because the algorithm has run for V·E iterations, which is always enough',
					'Because BFS has visited every vertex at least once',
				],
				answer:
					'No augmenting path means the reachable set S forms a cut whose capacity equals the current flow, and no flow can exceed any cut (max-flow = min-cut)',
				explanation:
					'When BFS cannot reach T, the reachable set S and its complement form ' +
					'a cut. Every edge leaving S is saturated (else BFS would cross it) and ' +
					'every edge entering S carries no flow, so the cut capacity equals the ' +
					'flow value. Since no flow can exceed any cut, this flow is maximum — ' +
					'the max-flow / min-cut theorem.',
			},
		],
	};
};

// =============================================================================
// MAXIMUM FLOW #3 (maxflow-3) — maximum bipartite matching AS a max-flow problem.
// Fresh bipartite graph on |L| = |R| = 4 with a few edges, encoded into a unit-
// capacity network (super-source S → each L with capacity 1, each R → super-sink
// T with capacity 1, every bipartite edge L → R with capacity 1). The maximum
// matching size IS the max-flow value of that network; perfect-or-not and the
// unmatched-right count are derived from it. Constrained so the matching is non-
// trivial (2 ≤ size ≤ |L|). Only the "why max-flow = matching" choice is
// conceptual.
const maxflow3 = seed => {
	const left = ['L1', 'L2', 'L3', 'L4'];
	const right = ['R1', 'R2', 'R3', 'R4'];
	// PURE encoder: a bipartite edge list → the unit-capacity flow network
	// edmondsKarpTrace consumes. All capacities are 1, which forces an integral
	// 0/1 flow to be a set of vertex-disjoint matched edges.
	const encode = edges => ({
		nodes: ['S', ...left, ...right, 'T'].map(id => ({ id })),
		source: 'S',
		sink: 'T',
		edges: [
			...left.map(l => ({ from: 'S', to: l, capacity: 1 })),
			...edges.map(([l, r]) => ({ from: l, to: r, capacity: 1 })),
			...right.map(r => ({ from: r, to: 'T', capacity: 1 })),
		],
	});
	const bipartite = rejectionSample(
		seed,
		stream => {
			// Each left vertex gets 1..2 random right neighbours; dedupe to a clean
			// edge list (a sparse-ish bipartite graph that varies across seeds).
			const pairs = [];
			const seen = new Set();
			for (const l of left) {
				const deg = int(stream, 1, 2);
				for (const r of shuffle(stream, right).slice(0, deg)) {
					const k = `${l}|${r}`;
					if (seen.has(k)) continue;
					seen.add(k);
					pairs.push([l, r]);
				}
			}
			return pairs;
		},
		edges => {
			if (edges.length < 4) return false; // a few edges
			const m = edmondsKarpTrace(encode(edges)).value;
			return m >= 2 && m <= left.length; // non-trivial matching (2..|L|)
		}
	);
	const run = edmondsKarpTrace(encode(bipartite));
	const matching = run.value; // maximum matching size = max-flow value
	const perfect = matching === left.length;
	const unmatchedR = right.length - matching;
	// The derived option strings (so the option text itself is generated from
	// run.value, never hand-typed). No em dashes in UI copy.
	const perfectYes = `Yes, every left vertex is matched (size ${matching} = |L| = ${left.length})`;
	const perfectNo = `No, the maximum matching has size ${matching}, below |L| = ${left.length}`;
	const perfectAnswer = perfect ? perfectYes : perfectNo;
	const edgeList = bipartite.map(([l, r]) => `${l}-${r}`).join(', ');
	return {
		kind: 'problem',
		__input: { bipartite },
		stem:
			'Maximum bipartite matching as a max-flow problem. A bipartite graph has ' +
			`left set L = {${left.join(', ')}} and right set R = {${right.join(
				', '
			)}}, with edges ${edgeList}. Encode it as a flow network: add a ` +
			'super-source S with a capacity-1 edge to each L-vertex, a capacity-1 ' +
			'edge from each R-vertex to a super-sink T, and orient every bipartite ' +
			'edge L -> R with capacity 1. Run Edmonds-Karp from S to T; the maximum ' +
			'matching is the value of the maximum flow.',
		parts: [
			{
				kind: 'numeric',
				prompt:
					'What is the size of the MAXIMUM MATCHING (equivalently, the value of ' +
					'the maximum flow from S to T in the encoded network)?',
				answer: matching,
				placeholder: 'a matching size',
				explanation:
					`The maximum matching has size ${matching}. With every capacity 1, the ` +
					`integral max flow saturates ${matching} of the S->L edges and ` +
					`${matching} of the R->T edges, one per matched pair. Augmenting paths ` +
					`stop once no S->T residual path remains, so the flow value is ${matching}.`,
			},
			{
				kind: 'choice',
				prompt:
					`Does a PERFECT matching exist — one that matches all |L| = ` +
					`${left.length} left vertices?`,
				options: [perfectNo, perfectYes],
				answer: perfectAnswer,
				explanation: perfect
					? `Yes. The maximum matching has size ${matching} = |L| = ${left.length}, ` +
						'so every left vertex is matched — a perfect matching.'
					: `A perfect matching needs size |L| = ${left.length}, but the maximum ` +
						`matching is only ${matching}, so none exists. Some subset of L shares ` +
						'too few right neighbours to all be matched at once (Hall’s condition ' +
						'fails).',
			},
			{
				kind: 'numeric',
				prompt:
					'After a maximum matching, how many RIGHT vertices remain UNMATCHED? ' +
					'(There are |R| right vertices, and each matched edge uses exactly one ' +
					'of them.)',
				answer: unmatchedR,
				placeholder: 'a count',
				explanation:
					`|R| - matching size = ${right.length} - ${matching} = ${unmatchedR}. A ` +
					`matching of size ${matching} covers ${matching} right vertices, leaving ` +
					`${unmatchedR} of the ${right.length} unused.`,
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
				explanation:
					'Integral max flow with 0/1 capacities means each S -> L and each ' +
					'R -> T edge carries 0 or 1, so every left vertex sends at most one ' +
					'unit and every right vertex receives at most one. The saturated ' +
					'L -> R edges therefore form a set of vertex-disjoint edges (a ' +
					'matching), and the flow value, which counts the units leaving S, ' +
					'equals the number of matched pairs. Maximising the flow maximises the ' +
					'matching.',
			},
		],
	};
};

// =============================================================================
// SHORTEST PATHS #4 (sssp-4) — Dijkstra FAILS on a negative edge, and Bellman-
// Ford is right. Fresh directed graph built as a "diamond" so the failure is
// guaranteed and DETERMINATE:
//     S → A : a     (direct, positive)        Dijkstra settles A early at a,
//     S → B : b     (positive, b > a)         BEFORE it processes B…
//     B → A : −neg  (negative)                …so it never uses S → B → A,
//     A → C : c     (positive)                and the error propagates to C.
// It is a DAG (S → {A,B}, B → A, A → C), so there is never a negative cycle.
// We REJECTION-SAMPLE the weights until dijkstraTrace's dist[A] STRICTLY exceeds
// bellmanFordTrace's (a genuine over-report), the two AGREE on B (a clean
// distractor), and the error also shows up at C. The probed wrong vertex is A
// (the head of the negative edge). Both distances are read straight off the two
// traces — the disagreement IS the lesson, so nothing is hand-typed. Only the
// "which assumption breaks" choice is conceptual.
//
// Validated: 0 rejection-sampling exhaustions across 512+ seeds (max ~8
// attempts), with dijkstra.dist[A] > bellmanFord.dist[A] on every accepted draw.
const sssp4 = seed => {
	const ids = ['S', 'A', 'B', 'C'];
	const graph = rejectionSample(
		seed,
		stream => {
			// Ranges arranged so a < b is LIKELY (Dijkstra settles A first) and the
			// detour S → B → A can undercut the direct S → A. Rejection then enforces
			// the exact inequalities, so the failure is certain on every accepted draw.
			const a = int(stream, 2, 6); // S → A direct
			const b = int(stream, 3, 9); // S → B
			const neg = -int(stream, 1, 7); // B → A (negative)
			const c = int(stream, 1, 7); // A → C
			return {
				nodes: ids.map(id => ({ id })),
				edges: [
					{ from: 'S', to: 'A', weight: a },
					{ from: 'S', to: 'B', weight: b },
					{ from: 'B', to: 'A', weight: neg },
					{ from: 'A', to: 'C', weight: c },
				],
			};
		},
		g => {
			const bf = bellmanFordTrace(g, { source: 'S' });
			if (bf.negativeCycle) return false; // must be well-defined
			const dij = dijkstraTrace(g, { source: 'S' });
			// All non-source vertices reachable and finite under Bellman-Ford.
			if (ids.slice(1).some(id => !Number.isFinite(distVal(bf.dist[id]))))
				return false;
			// THE CORE CONTRAST: Dijkstra must over-report A (strictly greater than the
			// true distance), so the two runs genuinely disagree on the probed vertex.
			if (!(distVal(dij.dist.A) > distVal(bf.dist.A))) return false;
			// They must AGREE on B (so B is an honest "they agree" distractor option).
			if (distVal(dij.dist.B) !== distVal(bf.dist.B)) return false;
			// The error must propagate to C as well (so the explanation about downstream
			// damage is concrete on this instance).
			return distVal(dij.dist.C) > distVal(bf.dist.C);
		}
	);
	const dij = dijkstraTrace(graph, { source: 'S' });
	const bf = bellmanFordTrace(graph, { source: 'S' });
	const negEdge = graph.edges.find(e => e.weight < 0);
	const wrong = negEdge.to; // 'A' — the head of the negative edge
	const dijkstraA = distVal(dij.dist.A); // over-reported
	const trueA = distVal(bf.dist.A); // the true shortest distance
	const dijkstraC = distVal(dij.dist.C);
	const trueC = distVal(bf.dist.C);
	// Distractors for "which vertex is wrong": the non-source vertices the two runs
	// AGREE on (Dijkstra dist == Bellman-Ford dist). The diamond guarantees B agrees.
	const agree = ids.filter(
		id =>
			id !== 'S' &&
			id !== wrong &&
			distVal(dij.dist[id]) === distVal(bf.dist[id])
	);
	const wrongOptions = [wrong, ...agree, 'None: the two runs agree'].filter(
		(o, i, arr) => arr.indexOf(o) === i
	);
	return {
		kind: 'problem',
		__input: { graph },
		stem:
			'Directed weighted graph with one negative edge and no cycle: ' +
			`${listDirected(graph.edges)}. Run Dijkstra from S, then run Bellman-Ford ` +
			'from S, and compare what each reports for vertex A.',
		parts: [
			{
				kind: 'numeric',
				prompt:
					'Run Dijkstra from S. Dijkstra settles the closest unsettled vertex ' +
					'and never reopens it. What distance does Dijkstra end up REPORTING ' +
					'for dist[A]?',
				answer: dijkstraA,
				placeholder: 'distance',
				explanation:
					`Dijkstra settles S(0), then sees A at ${dijkstraA} via the direct ` +
					`S→A edge and B further out. It settles A = ${dijkstraA} and locks it ` +
					'in BEFORE it processes B, so the later B→A edge is skipped (A is ' +
					`already settled). Dijkstra therefore reports dist[A] = ${dijkstraA}.`,
			},
			{
				kind: 'numeric',
				prompt:
					'Now run Bellman-Ford from S on the SAME graph. What is the TRUE ' +
					'shortest distance dist[A]?',
				answer: trueA,
				placeholder: 'distance',
				explanation:
					'Bellman-Ford relaxes every edge each pass, so it eventually uses S→B ' +
					`then the negative B→A: that path costs ${trueA}, which beats the ` +
					`direct S→A of ${dijkstraA}. There is no negative cycle, so ${trueA} is ` +
					`the correct shortest distance — strictly less than the ${dijkstraA} ` +
					'Dijkstra reported.',
			},
			{
				kind: 'choice',
				prompt:
					'Dijkstra and Bellman-Ford disagree here. Which vertex does Dijkstra ' +
					'SETTLE (and lock in) before the negative edge B→A could lower its ' +
					'distance, so Dijkstra reports it too high?',
				options: wrongOptions,
				answer: wrong,
				explanation:
					'B→A is the only edge that can pull dist[A] below the direct value, ' +
					'but Dijkstra settles A before it ever processes B, then refuses to ' +
					`reopen a settled vertex. So A is the vertex it gets wrong: reported ` +
					`${dijkstraA}, true ${trueA}. The mistake flows downstream too — A→C ` +
					`makes Dijkstra report dist[C] = ${dijkstraC} instead of the true ` +
					`${trueC}.`,
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
				explanation:
					'Dijkstra’s correctness rests on one claim: when a vertex is extracted ' +
					'with the smallest tentative distance, that distance is already ' +
					'optimal, so it can be settled and never revisited. With non-negative ' +
					'weights that holds; a negative edge breaks it, because a path ' +
					'discovered later (through B) can undercut the settled value, but ' +
					'Dijkstra has moved on and will not reopen A. Bellman-Ford makes no ' +
					'finality assumption — it keeps relaxing every edge, which is why it ' +
					'stays correct on negative edges (absent a negative cycle).',
			},
		],
	};
};

// =============================================================================
// GRAPHS — graphs-2 (topological sort, Kahn). Fresh DAG; first emitted vertex,
// an in-degree, the full topological order, and a candidate-order validity check
// — all derived from topoSort / isValidTopoOrder, exactly as the topic does.
// =============================================================================

// A fresh DIRECTED ACYCLIC graph on `vertices` (labels). Acyclicity is guaranteed
// structurally: we draw a random vertex ORDER and orient EVERY edge forward along it
// (earlier-in-order → later-in-order), so no edge ever points back and there is no
// cycle. Connectivity + a UNIQUE source: each non-first vertex attaches to a RANDOM
// EARLIER vertex (a forward-oriented spanning TREE rooted at order[0]). That makes
// order[0] the only in-degree-0 vertex, yet the tree BRANCHES — so several vertices
// are routinely in-degree-0-ready at once (the topological order is not forced, which
// the graphs-2 builder needs so a different valid order exists). A few extra forward
// edges then enrich the in-degrees. Returns { edges:[{from,to}] }.
const forwardDag = (rng, vertices, { extra }) => {
	const order = shuffle(rng, vertices); // the random linear extension we orient along
	const rank = new Map(order.map((v, i) => [v, i]));
	const present = new Set();
	const edges = [];
	const key = (a, b) => `${a}->${b}`;
	const add = (from, to) => {
		if (rank.get(from) >= rank.get(to)) return false; // forward only ⇒ acyclic
		if (present.has(key(from, to))) return false;
		present.add(key(from, to));
		edges.push({ from, to });
		return true;
	};
	// Forward spanning tree: attach each later vertex to a RANDOM earlier one. Every
	// non-root gets an in-edge (so order[0] is the only source), and random parents
	// make the tree branch (so ready-ties are common, unlike a forced chain).
	for (let i = 1; i < order.length; i += 1) {
		const j = int(rng, 0, i - 1);
		add(order[j], order[i]);
	}
	// Extra forward (acyclic) edges to enrich the in-degrees / the order.
	let guard = 0;
	while (edges.length < order.length - 1 + extra && guard < 300) {
		guard += 1;
		add(pick(rng, vertices), pick(rng, vertices));
	}
	return { edges };
};

// A readable "A→C, B→C" listing of a directed unweighted edge list.
const listDirectedPlain = edges =>
	edges.map(e => `${e.from}→${e.to}`).join(', ');

// A DIFFERENT but still-VALID topological order: Kahn with the opposite tie-break
// (LARGEST ready id first instead of smallest). Respecting all edges, it is always a
// valid order; when some Kahn step has ≥ 2 ready vertices it differs from topoSort's
// smallest-id order — giving a genuine "another valid order" the validity part can
// show. Pure; mirrors topoSort's structure (it is not exported, so we re-build it).
const kahnLargestFirst = (vertices, edges) => {
	const indeg = {};
	vertices.forEach(v => {
		indeg[v] = 0;
	});
	const out = new Map(vertices.map(v => [String(v), []]));
	edges.forEach(e => {
		const from = e.from !== undefined ? e.from : e.u;
		const to = e.to !== undefined ? e.to : e.v;
		if (!(to in indeg)) return;
		indeg[to] += 1;
		out.get(String(from))?.push(to);
	});
	const remaining = { ...indeg };
	const order = [];
	const emitted = new Set();
	const byIdDesc = (a, b) =>
		String(b).localeCompare(String(a), undefined, { numeric: true });
	while (order.length < vertices.length) {
		const ready = vertices
			.filter(v => !emitted.has(v) && remaining[v] === 0)
			.sort(byIdDesc);
		if (!ready.length) break;
		const u = ready[0];
		order.push(u);
		emitted.add(u);
		for (const w of out.get(String(u)) || []) remaining[w] -= 1;
	}
	return order;
};

// True iff some Kahn step has ≥ 2 simultaneously-ready vertices — i.e. the
// topological order is NOT forced, so a genuinely different valid order exists.
const hasReadyTie = (vertices, edges) => {
	const indeg = {};
	vertices.forEach(v => {
		indeg[v] = 0;
	});
	const out = new Map(vertices.map(v => [String(v), []]));
	edges.forEach(e => {
		const from = e.from !== undefined ? e.from : e.u;
		const to = e.to !== undefined ? e.to : e.v;
		if (!(to in indeg)) return;
		indeg[to] += 1;
		out.get(String(from))?.push(to);
	});
	const remaining = { ...indeg };
	const emitted = new Set();
	const byId = (a, b) =>
		String(a).localeCompare(String(b), undefined, { numeric: true });
	let tie = false;
	while (emitted.size < vertices.length) {
		const ready = vertices
			.filter(v => !emitted.has(v) && remaining[v] === 0)
			.sort(byId);
		if (!ready.length) break;
		if (ready.length >= 2) tie = true;
		const u = ready[0];
		emitted.add(u);
		for (const w of out.get(String(u)) || []) remaining[w] -= 1;
	}
	return tie;
};

// Constraints: 6 vertices A..F. We require EXACTLY ONE source (one in-degree-0
// vertex) so "the vertex Kahn emits first" is single-valued, the deepest in-degree
// to be ≥ 2 so the in-degree question is non-trivial (mirrors E's in-degree 2 in the
// fixed set), AND that the order is NOT forced (some step has a tie) so a DIFFERENT
// valid order exists — the validity part can then be genuinely Valid on some seeds.
// The graph is weakly connected by the backbone.
const graphs2 = seed => {
	const V = ['A', 'B', 'C', 'D', 'E', 'F'];
	const { edges } = rejectionSample(
		seed,
		stream => forwardDag(stream, V, { extra: 2 }),
		g => {
			const t = topoSort(V, g.edges);
			if (t.hasCycle) return false; // forwardDag guarantees this; assert it anyway
			if (t.order.length !== V.length) return false; // all vertices placed
			const sources = V.filter(v => t.indegree[v] === 0);
			if (sources.length !== 1) return false; // a UNIQUE first vertex
			const maxIndeg = Math.max(...V.map(v => t.indegree[v]));
			if (maxIndeg < 2) return false; // a non-trivial in-degree to ask about
			return hasReadyTie(V, g.edges); // a second valid order must exist
		}
	);
	const t = topoSort(V, edges);
	const order = t.order;
	const first = order[0]; // the unique in-degree-0 vertex (Kahn emits it first)
	const sink = order[order.length - 1]; // emitted last — a natural distractor
	// Ask the in-degree of the vertex with the LARGEST in-degree (instance-derived).
	const indegTarget = V.reduce((best, v) =>
		t.indegree[v] > t.indegree[best] ? v : best
	);
	const indegValue = t.indegree[indegTarget];
	// The candidate order to test, chosen by a seeded coin so BOTH outcomes appear
	// across seeds (and the validity part is a live question, not a constant):
	//   • heads → a DIFFERENT but VALID order (Kahn with the opposite, largest-id
	//     tie-break). The hasReadyTie gate guarantees it differs from `order`.
	//   • tails → an INVALID order: take `order` and push the head of some edge BEFORE
	//     its tail, forcing that one edge to point backward.
	// Either way the validity is DERIVED via isValidTopoOrder, so the stored answer is
	// exactly what the checker says.
	const coinRng = mulberry32((toSeed(seed) ^ 0x9e3779b9) >>> 0);
	const makeValid = int(coinRng, 0, 1) === 1;
	let candidate;
	if (makeValid) {
		candidate = kahnLargestFirst(V, edges); // a genuinely different valid order
	} else {
		// Break exactly one edge: find an edge u→v with u before v in `order` and
		// move v to immediately before u (so the edge now points backward).
		const pos = new Map(order.map((v, i) => [v, i]));
		const back = edges.find(e => pos.get(e.from) < pos.get(e.to));
		const reordered = order.filter(v => v !== back.to);
		reordered.splice(pos.get(back.from), 0, back.to); // place `to` just before `from`
		candidate = reordered;
	}
	const candidateStr = `[${candidate.join(', ')}]`;
	const validity = isValidTopoOrder(candidate, edges) ? 'Valid' : 'Invalid';
	// First-vertex choice options: the answer (source) + the sink + two other
	// vertices, all instance-derived, deduped, exactly four distinct.
	const firstOptions = [first, sink, ...order.slice(1, order.length - 1)]
		.filter((o, i, arr) => arr.indexOf(o) === i)
		.slice(0, 4);
	const itemsShuffled = [...order].slice().reverse();
	return {
		kind: 'problem',
		// The fresh DAG this instance derives from, exposed for the guardrail test to
		// RE-DERIVE the answers from topoSort / isValidTopoOrder (never read to grade).
		__input: { vertices: V, edges, candidate },
		stem:
			`Directed acyclic graph with vertices ${V.join(', ')} and edges ` +
			`${listDirectedPlain(edges)}. Run a topological sort with Kahn’s ` +
			'algorithm: repeatedly remove an in-degree-0 vertex, breaking ties by ' +
			'choosing the smallest id (alphabetical here).',
		parts: [
			{
				kind: 'choice',
				prompt:
					'Kahn starts from a vertex with NO incoming edges (in-degree 0). Which ' +
					'vertex does the topological sort emit FIRST?',
				options: firstOptions,
				answer: first,
				explanation:
					`${first} is the only vertex with in-degree 0 (no prerequisites), so Kahn ` +
					`emits it first. ${sink} is the sink — it depends on the others and comes last.`,
			},
			{
				kind: 'numeric',
				prompt:
					`In the ORIGINAL graph, what is the in-degree of vertex ${indegTarget} ` +
					'(its number of incoming edges)?',
				answer: indegValue,
				placeholder: 'a count',
				explanation:
					`${indegTarget} has ${indegValue} incoming edge${indegValue === 1 ? '' : 's'}. ` +
					`Kahn can only emit ${indegTarget} once all of them are removed (its ` +
					'in-degree hits 0).',
			},
			{
				kind: 'order',
				prompt:
					'Give the full topological order Kahn produces, smallest in-degree-0 ' +
					'vertex first at each step. Drag the vertices into that sequence.',
				items: itemsShuffled,
				answer: order,
				explanation:
					`Emitting the smallest free vertex each step gives ${order.join(' → ')}. ` +
					'Each vertex appears only after every vertex pointing into it.',
			},
			{
				kind: 'choice',
				prompt:
					`A topological order is not unique. Is the candidate order ${candidateStr} ` +
					'a VALID topological order for this graph (every edge points forward)?',
				options: ['Valid', 'Invalid'],
				answer: validity,
				explanation:
					`${candidateStr} is ${validity.toLowerCase()}: a topological order is valid ` +
					'iff every edge u→v has u positioned strictly before v, regardless of how ' +
					'it compares to Kahn’s smallest-id order.',
			},
			{
				kind: 'choice',
				prompt:
					'Suppose we add an edge that creates a cycle. How many vertices can a ' +
					'topological sort now place?',
				options: [
					'None — a graph with a cycle has no topological order',
					'All of them, in some order',
					'Only the vertices outside the cycle',
					'All but one, dropping one cycle vertex',
				],
				answer: 'None — a graph with a cycle has no topological order',
				explanation:
					'In a cycle every vertex has an unmet prerequisite ahead of it, so none ' +
					'can ever reach in-degree 0. Kahn therefore emits fewer vertices than the ' +
					'graph has — which is exactly how it DETECTS the cycle. A topological order ' +
					'exists only for a DAG.',
			},
		],
	};
};

// =============================================================================
// MST — mst-4 (the CUT PROPERTY in isolation). Fresh connected weighted graph
// with DISTINCT weights ⇒ unique MST and a UNIQUE lightest crossing edge. We fix
// a cut S and read its crossing edges + the safe (lightest crossing) edge straight
// off crossingEdges, the same helper Kruskal/Prim's light-edge logic is built on.
// =============================================================================

// Constraints: 6 vertices A..F, distinct weights in 1..30 (unique MST; distinct
// weights also force a UNIQUE lightest crossing edge). The cut S is drawn fresh per
// instance as a proper subset of size 2 or 3. We require:
//   • the cut has at least TWO crossing edges (the ascending-order part is real), and
//   • at least one NON-crossing edge inside S AND one inside the rest (so the "looks
//     light but does not cross" distractors exist, mirroring the fixed problem).
const mst4 = seed => {
	const V = ['A', 'B', 'C', 'D', 'E', 'F'];
	const drawn = rejectionSample(
		seed,
		stream => {
			const { edges } = connectedWeightedGraph(stream, V, {
				extra: 3,
				wLo: 1,
				wHi: 30,
			});
			// A fresh proper cut S: a random subset of size 2 or 3 of the vertices.
			const size = int(stream, 2, 3);
			const cut = shuffle(stream, V).slice(0, size);
			return { edges, cut };
		},
		({ edges, cut }) => {
			const cutSet = new Set(cut);
			const { crossing, light } = crossingEdges(edges, cut);
			if (crossing.length < 2 || !light) return false; // a real ascending list
			// A non-crossing edge fully inside S, and one fully inside the rest — these
			// are the tempting "light but does not cross" distractors.
			const insideS = edges.some(e => cutSet.has(e.u) && cutSet.has(e.v));
			const insideRest = edges.some(e => !cutSet.has(e.u) && !cutSet.has(e.v));
			return insideS && insideRest;
		}
	);
	const { edges, cut } = drawn;
	const cutSet = new Set(cut);
	const rest = V.filter(v => !cutSet.has(v));
	const m4Label = e => `${e.u}–${e.v} (${e.w})`;
	const { crossing, light } = crossingEdges(edges, cut);
	const crossingLabels = crossing.map(m4Label); // ascending by weight (then id)
	const crossingShuffled = [...crossingLabels].slice().reverse();
	const lightLabel = m4Label(light);
	const lightWeight = light.w;
	const heaviestCrossingLabel = m4Label(crossing[crossing.length - 1]);
	// Two NON-crossing distractors: the lightest edge fully inside S and the lightest
	// fully inside the rest (the classic "looks light but does not cross" traps).
	const normed = edges
		.map(e => {
			const a = String(e.u);
			const b = String(e.v);
			const [u, v] = a < b ? [a, b] : [b, a];
			return { u, v, w: e.w };
		})
		.sort((p, q) => p.w - q.w);
	const insideSEdge = normed.find(e => cutSet.has(e.u) && cutSet.has(e.v));
	const insideRestEdge = normed.find(e => !cutSet.has(e.u) && !cutSet.has(e.v));
	// Build the four options: the safe edge first (so it always survives the slice),
	// then the heaviest crossing edge, then the inside-S / inside-rest non-crossing
	// distractors, finally top up from remaining crossing edges. Dedup → exactly four.
	const safeOptions = [
		lightLabel,
		heaviestCrossingLabel,
		insideSEdge ? m4Label(insideSEdge) : null,
		insideRestEdge ? m4Label(insideRestEdge) : null,
		...crossingLabels, // fallback fill if any distractor was missing/duplicate
	]
		.filter(Boolean)
		.filter((o, i, arr) => arr.indexOf(o) === i)
		.slice(0, 4);
	return {
		kind: 'problem',
		__input: { vertices: V, edges, cut },
		stem:
			`Undirected weighted graph with vertices ${V.join(', ')} and edges ` +
			`${listUndirected(edges)}. Fix the CUT that splits the vertices into ` +
			`S = {${cut.join(', ')}} and the rest {${rest.join(', ')}}. The cut ` +
			'property is the single theorem behind both Kruskal and Prim.',
		parts: [
			{
				kind: 'order',
				prompt:
					`An edge CROSSES the cut when exactly one endpoint is inside ` +
					`S = {${cut.join(', ')}}. List every crossing edge in ascending weight ` +
					'order. (Edges with both endpoints inside S, or both outside, do not cross.)',
				items: crossingShuffled,
				answer: crossingLabels,
				explanation:
					`A crossing edge has one endpoint in {${cut.join(', ')}} and one in ` +
					`{${rest.join(', ')}}. Those edges, lightest first, are ` +
					`${crossingLabels.join(', ')}.`,
			},
			{
				kind: 'choice',
				prompt:
					'The cut property guarantees ONE of the crossing edges is safe to add ' +
					'to the MST. Which crossing edge is it?',
				options: safeOptions,
				answer: lightLabel,
				explanation:
					`The cut property says the LIGHTEST edge crossing a cut is safe, so some ` +
					`MST contains it. Among the crossing edges ${crossingLabels.join(', ')} the ` +
					`lightest is ${lightLabel}, so it is the safe edge. (Distinct weights make ` +
					'it the unique lightest, hence a single answer.)',
			},
			{
				kind: 'numeric',
				prompt:
					`What is the WEIGHT of that safe edge, the lightest edge crossing ` +
					`S = {${cut.join(', ')}}?`,
				answer: lightWeight,
				placeholder: 'a weight',
				explanation:
					`The crossing edges are ${crossingLabels.join(', ')}; the minimum weight ` +
					`among them is ${lightWeight} (edge ${lightLabel}). That is the edge the ` +
					'cut property certifies as safe.',
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
					'Because Prim happens to add it first from the start vertex',
				],
				answer:
					'Take any MST without it; adding it makes a cycle that also crosses ' +
					'the cut, so swapping that heavier crossing edge out yields a ' +
					'spanning tree no heavier, and that tree is an MST containing the ' +
					'light edge',
				explanation:
					'The exchange argument: take any MST that omits the light edge e. Adding ' +
					'e creates exactly one cycle, and that cycle must cross the cut a second ' +
					'time on some edge f. Since e is the LIGHTEST crossing edge, weight(e) ≤ ' +
					'weight(f), so removing f and keeping e yields a spanning tree of weight no ' +
					'greater — hence an MST containing e. That is exactly why greedily taking ' +
					'light edges never goes wrong.',
			},
		],
	};
};

// The in-order successor NODE of a node that HAS a right child: the leftmost node
// of its right subtree (the smallest key larger than node.value). Used by trees-2
// to require an "interesting" successor (one with its own right child to re-thread).
const successorNode = node => {
	let cur = node.right;
	while (cur && cur.left) cur = cur.left;
	return cur;
};

// Edge-convention height (empty = -1, leaf = 0), mirroring examSets.js's bstHeight.
const bstHeight = node =>
	node == null ? -1 : 1 + Math.max(bstHeight(node.left), bstHeight(node.right));

// =============================================================================
// TREES — trees-2 (BST delete of a TWO-CHILD node). Fresh distinct insert order
// where the ROOT has two children AND its in-order successor itself has a right
// child to re-thread (mirrors the fixed problemB2: delete root, successor has its
// own right child). Re-derive the successor, the in-order after delete (order),
// and the pre-order after delete (choice). The "why successor" choice is STATIC.
// =============================================================================

// Constraints: 9 DISTINCT keys (matching the fixed set). The deleted node is the
// ROOT, which must have two children, and the root's in-order successor must have
// its OWN right child — so the successor-splice re-threads a subtree (the
// "interesting" case the fixed version uses), and the choice/order answers stay
// non-trivial. Insertion order is shuffled so the root and shape vary per seed.
const trees2 = seed => {
	const insertOrder = rejectionSample(
		seed,
		stream => distinctInts(stream, 9, 10, 99),
		keys => {
			const root = buildBst(keys);
			// The deleted node is the root, which must have two children.
			if (!(root.left && root.right)) return false;
			// And its in-order successor must itself have a RIGHT child, so deleting
			// the root forces that right child to be re-threaded (like 70's child 75).
			const succ = successorNode(root);
			return Boolean(succ && succ.right);
		}
	);
	const root = buildBst(insertOrder);
	const inorder = inorderValues(root);
	const target = root.value; // delete the root (two children) — matches problemB2
	const successor = inorder[inorder.indexOf(target) + 1];
	const predecessor = inorder[inorder.indexOf(target) - 1]; // prose distractor
	const afterDel = deleteValue(root, target);
	const afterInorder = inorderValues(afterDel);
	const afterPre = (() => {
		const steps = getTraversalSteps(afterDel, 'preorder');
		return steps[steps.length - 1].output.map(Number);
	})();
	const afterPost = (() => {
		const steps = getTraversalSteps(afterDel, 'postorder');
		return steps[steps.length - 1].output.map(Number);
	})();
	const beforePre = (() => {
		const steps = getTraversalSteps(root, 'preorder');
		return steps[steps.length - 1].output.map(Number);
	})();
	const removes = !containsValue(afterDel, target);
	const afterPreStr = `[${afterPre.join(', ')}]`;
	const afterPostStr = `[${afterPost.join(', ')}]`;
	const beforePreStr = `[${beforePre.join(', ')}]`;
	const inorderStr = `[${afterInorder.join(', ')}]`;
	return {
		kind: 'problem',
		// The fresh input this instance was derived from, exposed for the guardrail
		// test to RE-DERIVE the answers from the generator (never read for grading).
		__input: { insertOrder, target },
		stem:
			`Insert the keys ${insertOrder.join(', ')} into an initially empty binary ` +
			`search tree, in that order. Then DELETE the root key ${target}. Because ` +
			`${target} has two children, it is replaced by its in-order successor: the ` +
			`smallest key in its right subtree.`,
		parts: [
			{
				kind: 'numeric',
				prompt:
					`Which key moves up to replace ${target}? (Find the minimum of ` +
					`${target}'s right subtree — keep stepping left from the right child.)`,
				answer: successor,
				placeholder: 'a key',
				explanation:
					`The in-order successor is the smallest key larger than ${target}, ` +
					`i.e. the minimum of the right subtree, which is ${successor}. ` +
					`${successor}'s own right child is re-attached where ${successor} used ` +
					`to sit, so no keys are lost.`,
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
				explanation:
					`The successor is the smallest key greater than ${target}, so nothing ` +
					`lies strictly between them. Dropping it into the deleted slot keeps every ` +
					`left-subtree key below it and every remaining right-subtree key above it — ` +
					`exactly the BST invariant. The predecessor (here ${predecessor}) works ` +
					`for the mirror-image reason.`,
			},
			{
				kind: 'order',
				prompt:
					`After deleting ${target}, list the remaining keys in IN-ORDER ` +
					`sequence. Drag them into that order.`,
				items: [...afterInorder].sort((a, b) => b - a).map(String),
				answer: afterInorder.map(String),
				explanation:
					`${target} is gone and ${successor} fills its slot, so an in-order ` +
					`walk still yields ascending keys: ${afterInorder.join(', ')} — sorted ` +
					`and without ${target} (removed: ${removes}).`,
			},
			{
				kind: 'choice',
				prompt:
					`A PRE-ORDER traversal (visit node, then left subtree, then right subtree) ` +
					`of the tree AFTER the deletion reads which sequence?`,
				options: [afterPreStr, beforePreStr, afterPostStr, inorderStr].filter(
					(o, i, arr) => arr.indexOf(o) === i
				),
				answer: afterPreStr,
				explanation:
					`With ${successor} now the root, pre-order visits ${successor} first, ` +
					`then its left subtree, then its right subtree: ${afterPreStr}.`,
			},
		],
	};
};

// =============================================================================
// TREES — trees-3 (BST height). Fresh distinct insert order of 7-9 keys giving a
// non-trivial, deterministic height. Re-derive: the built-tree height, the
// degenerate (sorted-insert) chain height = n-1, and the min height
// floor(log2 n). Conceptual part STATIC. (bstHeight helper above.)
// =============================================================================

// Constraints: a fresh key count n in 7..9 and n DISTINCT keys, REJECTION-SAMPLED
// so the built height is strictly between the perfectly balanced minimum
// floor(log2 n) and the degenerate chain n-1 — i.e. the three numeric answers
// (height, chain height, min height) are all DISTINCT and the height is a
// non-trivial, deterministic middle value. Varying n also varies the chain and min
// heights across seeds, so a retake is a genuinely fresh problem.
const trees3 = seed => {
	const insertOrder = rejectionSample(
		seed,
		stream => {
			// Fresh key count in 7..9, then a fresh distinct insert order of that size.
			const n = int(stream, 7, 9);
			return distinctInts(stream, n, 10, 99);
		},
		keys => {
			const root = buildBst(keys);
			const n = keys.length;
			const h = bstHeight(root);
			// Strictly between the balanced minimum and the degenerate chain: the
			// built height, the chain height, and the min height are three DISTINCT
			// answers (otherwise the numeric parts would collide).
			const minH = Math.floor(Math.log2(n));
			const chainH = n - 1;
			return h > minH && h < chainH;
		}
	);
	const n = insertOrder.length;
	const root = buildBst(insertOrder);
	const inorder = inorderValues(root);
	const height = bstHeight(root);
	const sorted = [...insertOrder].sort((a, b) => a - b);
	const chainHeight = bstHeight(buildBst(sorted)); // == n - 1
	const minHeight = Math.floor(Math.log2(n));
	return {
		kind: 'problem',
		__input: { insertOrder },
		stem:
			`Insert the keys ${insertOrder.join(', ')} into an initially empty binary ` +
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
				answer: height,
				placeholder: 'a height',
				explanation:
					`Inserting ${insertOrder.join(', ')} builds a tree whose longest ` +
					`root-to-leaf path crosses ${height} edges, so the height is ${height}. ` +
					`In-order it reads ${inorder.join(', ')}.`,
			},
			{
				kind: 'numeric',
				prompt:
					`Now insert the SAME ${n} keys into a fresh BST in SORTED ascending ` +
					`order (${sorted.join(', ')}). What is the height of the resulting ` +
					`tree (same edge convention)?`,
				answer: chainHeight,
				placeholder: 'a height',
				explanation:
					`In sorted order every key is larger than all inserted so far, so each ` +
					`one becomes the right child of the previous: the tree degenerates into ` +
					`a single right-leaning chain. A chain of ${n} nodes has ${n} - 1 ` +
					`= ${chainHeight} edges, so its height is ${chainHeight}. This is ` +
					`the worst case, where the BST behaves like a linked list.`,
			},
			{
				kind: 'numeric',
				prompt:
					`What is the MINIMUM possible height of any BST holding all ${n} ` +
					`keys (the height of a perfectly balanced tree, floor(log2 n))?`,
				answer: minHeight,
				placeholder: 'a height',
				explanation:
					`A binary tree of height h holds at most 2^(h+1) - 1 nodes, so storing ` +
					`n nodes needs height at least floor(log2 n). For n = ${n} that is ` +
					`floor(log2 ${n}) = ${minHeight}. The degenerate chain (${chainHeight}) is ` +
					`as far from it as a BST on ${n} keys can be.`,
			},
			{
				kind: 'choice',
				prompt:
					`The same ${n} keys gave height ${height} in one order and ` +
					`height ${chainHeight} in another. Why does insertion ORDER decide ` +
					`the height, and why does the balanced shape matter for search?`,
				options: [
					'Each key is placed by comparisons against the keys already in the tree, so the order fixes the shape; a balanced tree keeps the longest path O(log n), so search touches O(log n) nodes, while a degenerate chain is O(n) like a linked list',
					'Insertion order changes which keys the tree stores, so a different set of values ends up at the leaves',
					'A BST always rebalances itself, so the order never changes the height; both trees actually have the same height',
					'The balanced tree is faster only because it stores fewer nodes than the chain',
				],
				answer:
					'Each key is placed by comparisons against the keys already in the tree, so the order fixes the shape; a balanced tree keeps the longest path O(log n), so search touches O(log n) nodes, while a degenerate chain is O(n) like a linked list',
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
};

// =============================================================================
// HEAPS — heaps-3 (HEAPSORT = BuildMaxHeap + chained ExtractMax). Fresh array of
// 7 distinct small ints. Re-derive the post-build heap array (choice), the first
// extracted max (numeric), the heap after the first 2 extractions (choice), and
// the final sorted array (choice). The "why n log n + in place" choice is STATIC.
// =============================================================================

// Constraints: 7 DISTINCT small ints (distinct => every array is unambiguous, and
// the after-2 heap has 5 elements like the fixed set). Require the post-build heap
// NOT to equal the input (the build does real work) and NOT to equal the
// descending array (so the post-build answer and the "forgot to reverse"
// descending distractor stay distinct, keeping that trap live).
const heaps3 = seed => {
	const input = rejectionSample(
		seed,
		stream => distinctInts(stream, 7, 1, 30),
		arr => {
			const heap = buildMaxHeapTrace(arr).finalHeap;
			const desc = [...arr].sort((a, b) => b - a);
			const eq = (x, y) =>
				x.length === y.length && x.every((v, i) => v === y[i]);
			return !eq(heap, arr) && !eq(heap, desc);
		}
	);
	const heap0 = buildMaxHeapTrace(input).finalHeap;
	// Run heapsort by chaining ExtractMax: collect each returned max and the heap
	// array that remains after it. Sorted (ascending) = those maxima reversed.
	const run = (() => {
		let heap = [...heap0];
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
	const heapStr = `[${heap0.join(', ')}]`;
	const firstMax = run.maxes[0];
	const after2 = run.after[1];
	const after2Str = `[${after2.join(', ')}]`;
	const sortedStr = `[${run.sorted.join(', ')}]`;
	const inputStr = `[${input.join(', ')}]`;
	const descStr = `[${[...input].sort((a, b) => b - a).join(', ')}]`;
	const heapNear = (() => {
		const a = [...heap0];
		if (a.length >= 3) [a[1], a[2]] = [a[2], a[1]];
		return `[${a.join(', ')}]`;
	})();
	const after2Near = (() => {
		const a = [...after2];
		if (a.length >= 3) [a[1], a[2]] = [a[2], a[1]];
		return `[${a.join(', ')}]`;
	})();
	return {
		kind: 'problem',
		__input: { array: input },
		stem:
			`Heapsort sorts ${inputStr} in place. First BuildMaxHeap turns it into a ` +
			`max-heap; then it repeatedly extracts the max (swap the root with the last ` +
			`heap slot, shrink the heap by one, sift the new root down) so each maximum ` +
			`lands in the growing sorted tail.`,
		parts: [
			{
				kind: 'choice',
				prompt:
					`Phase 1 is BuildMaxHeap. Which array is the max-heap it produces, before ` +
					`any element has been extracted?`,
				options: [heapStr, descStr, inputStr, heapNear].filter(
					(o, i, arr) => arr.indexOf(o) === i
				),
				answer: heapStr,
				explanation:
					`Bottom-up heapify gives ${heapStr}: the max ${heap0[0]} sits at index ` +
					`0 and every parent >= its children. The sorting only happens in phase 2, as ` +
					`maxima are pulled off one at a time.`,
			},
			{
				kind: 'numeric',
				prompt:
					`Phase 2 begins. What is the FIRST element heapsort extracts (it goes into ` +
					`the last array slot)?`,
				answer: firstMax,
				placeholder: 'a value',
				explanation:
					`ExtractMax returns the root of the max-heap, which is the largest element ` +
					`${firstMax}. Heapsort swaps it into the final position, where it stays.`,
			},
			{
				kind: 'choice',
				prompt:
					`After the first TWO ExtractMax steps, the two largest values are parked in ` +
					`the sorted tail and the heap has shrunk by two. What are the heap's ` +
					`remaining contents (the still-unsorted prefix)?`,
				options: [after2Str, heapStr, after2Near, inputStr].filter(
					(o, i, arr) => arr.indexOf(o) === i
				),
				answer: after2Str,
				explanation:
					`Removing the top two maxima and re-heapifying after each leaves the ` +
					`${after2.length}-element max-heap ${after2Str}. Its root is again the ` +
					`largest of the values that remain.`,
			},
			{
				kind: 'choice',
				prompt:
					`Heapsort runs ExtractMax until the heap is empty. What is the final, fully ` +
					`sorted array (ascending)?`,
				options: [sortedStr, descStr, heapStr, inputStr].filter(
					(o, i, arr) => arr.indexOf(o) === i
				),
				answer: sortedStr,
				explanation:
					`Each ExtractMax drops the current maximum into the next tail slot, so the ` +
					`array fills from the back with ever-smaller maxima and ends ascending: ` +
					`${sortedStr}.`,
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
};

// =============================================================================
// QUICKSORT — quicksort-1 (Lomuto partition trace) and quicksort-2 (sorted-input
// worst case). Fresh arrays / fresh n; the pivot index, post-partition array, left
// sub-array, and comparison counts are all read off getQuickSortFrames.
// =============================================================================

// quicksort-1: a fresh array of 7–8 DISTINCT small ints. The LAST element is the
// Lomuto pivot; we require it to land at a NON-EXTREME index (2..n−2) so the split
// is genuinely two-sided and the "left sub-array" / "array after partition"
// questions are interesting (a pivot at index 0 or n−1 makes one side empty). We
// also require every choice's four options to be DISTINCT (the fixed problem does
// not de-dupe these option lists, and the seeded guardrail forbids duplicate
// options), which the non-extreme + distinct-values draw satisfies in practice.
const quicksort1Instance = seed => {
	const input = rejectionSample(
		seed,
		stream => distinctInts(stream, int(stream, 7, 8), 1, 30),
		arr => {
			const n = arr.length;
			const run = getQuickSortFrames(arr);
			const place = run.frames.find(
				f =>
					f.phase === 'place' &&
					f.range &&
					f.range[0] === 0 &&
					f.range[1] === n - 1
			);
			const p = place.pivotIndex;
			if (p < 2 || p > n - 2) return false; // pivot at a non-extreme index
			// All four options of each choice part must be distinct (no de-dup in the
			// fixed problem; the guardrail asserts choice options are unique).
			const after = place.array;
			const afterStr = `[${after.join(', ')}]`;
			const sortedStr = `[${run.sorted.join(', ')}]`;
			const inputStr = `[${arr.join(', ')}]`;
			const revStr = `[${[...arr].sort((a, b) => b - a).join(', ')}]`;
			const opts1 = [afterStr, sortedStr, inputStr, revStr];
			const leftStr = `[${after.slice(0, p).join(', ')}]`;
			const rightStr = `[${after.slice(p + 1).join(', ')}]`;
			const midStr = `[${after.slice(0, p + 1).join(', ')}]`;
			const opts2 = [leftStr, rightStr, midStr, afterStr];
			return (
				new Set(opts1).size === opts1.length &&
				new Set(opts2).size === opts2.length
			);
		}
	);
	const n = input.length;
	const run = getQuickSortFrames(input);
	const pivot = input[n - 1]; // Lomuto pivot = last element
	// The 'place' frame of the TOP-LEVEL partition (range [0, n−1]).
	const place = run.frames.find(
		f =>
			f.phase === 'place' && f.range && f.range[0] === 0 && f.range[1] === n - 1
	);
	const pivotIndex = place.pivotIndex;
	const after = place.array;
	const afterStr = `[${after.join(', ')}]`;
	const sortedStr = `[${run.sorted.join(', ')}]`;
	const leftStr = `[${after.slice(0, pivotIndex).join(', ')}]`;
	const rightStr = `[${after.slice(pivotIndex + 1).join(', ')}]`;
	return {
		kind: 'problem',
		__input: { array: input },
		stem:
			`Quicksort with Lomuto partition (pivot = the LAST element). Partition the ` +
			`array [${input.join(', ')}] around its pivot ${pivot}, then recurse ` +
			`on each side.`,
		parts: [
			{
				kind: 'numeric',
				prompt:
					`The pivot is the last element, ${pivot}. After one partition pass, ` +
					`at which 0-based index does ${pivot} come to rest (its final sorted ` +
					`position)?`,
				answer: pivotIndex,
				placeholder: 'an index',
				explanation:
					`Lomuto sweeps a pointer across the array, pulling every value less than ` +
					`${pivot} to the left, then swaps the pivot just past them. ` +
					`${pivotIndex} values are smaller, so ${pivot} lands at index ` +
					`${pivotIndex}, and it never moves again.`,
			},
			{
				kind: 'choice',
				prompt: `What does the array look like immediately after that first partition?`,
				options: [
					afterStr,
					sortedStr,
					`[${input.join(', ')}]`,
					`[${[...input].sort((a, b) => b - a).join(', ')}]`,
				],
				answer: afterStr,
				misconceptions: {
					[sortedStr]:
						`That is the FULLY sorted array. One partition only places the pivot ` +
						`and splits the rest into "less than" and "greater than"; the two sides ` +
						`are not sorted yet.`,
				},
				explanation:
					`After partitioning, everything left of index ${pivotIndex} is less ` +
					`than ${pivot} and everything right is greater, but neither side is ` +
					`sorted yet: ${afterStr}.`,
			},
			{
				kind: 'choice',
				prompt:
					`Partition leaves ${pivot} home and splits the rest into two ranges ` +
					`to recurse on. Which values form the LEFT sub-array the next recursive ` +
					`call sorts?`,
				options: [
					leftStr,
					rightStr,
					`[${after.slice(0, pivotIndex + 1).join(', ')}]`,
					afterStr,
				],
				answer: leftStr,
				explanation:
					`The left sub-array is everything before the pivot's resting index ` +
					`${pivotIndex}: ${leftStr}. Quicksort sorts it and the right ` +
					`side ${rightStr} independently; the pivot itself is already done.`,
			},
			{
				kind: 'numeric',
				prompt:
					`How many element-to-element COMPARISONS does the FULL quicksort make on ` +
					`this array? (Count each "is this element < the current pivot?" test.)`,
				answer: run.comparisons,
				placeholder: 'a count',
				explanation:
					`Summed across every partition pass, this run makes ` +
					`${run.comparisons} comparisons. With reasonably balanced pivots ` +
					`quicksort is Θ(n log n) on average.`,
			},
		],
	};
};

// quicksort-2: the sorted-input worst case. A fresh n in 5..8 gives the ascending
// array [1..n]; the last-element pivot is then always the maximum, so each
// partition splits n into n−1 and 0 and the run makes the n(n−1)/2 comparison
// disaster (derived from getQuickSortFrames, never the closed form). The recurrence
// result (Θ(n²)) and the practical-fix choice are STATIC conceptual parts.
const quicksort2Instance = seed => {
	const sorted = rejectionSample(
		seed,
		stream => {
			const n = int(stream, 5, 8);
			return Array.from({ length: n }, (_, i) => i + 1);
		},
		arr => arr.length >= 5 && arr.length <= 8
	);
	const n = sorted.length;
	const wcComparisons = getQuickSortFrames(sorted).comparisons;
	return {
		kind: 'problem',
		__input: { sorted },
		stem:
			`Quicksort's running time is decided entirely by how BALANCED its partitions ` +
			`are. Look at the case that goes wrong.`,
		parts: [
			{
				kind: 'numeric',
				prompt:
					`Run Lomuto quicksort (pivot = last) on the already-sorted array ` +
					`[${sorted.join(', ')}]. How many element comparisons does it make?`,
				answer: wcComparisons,
				placeholder: 'a count',
				explanation:
					`On sorted input the last element is always the largest, so every ` +
					`partition puts the pivot at the end and recurses on the other n-1 ` +
					`elements: (n-1) + (n-2) + ... + 1 = n(n-1)/2 = ${wcComparisons} for ` +
					`n = ${n}. That is the Θ(n²) worst case.`,
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
};

// =============================================================================
// SORTING (comparison-sort lower bound) — sorting-3 (decision tree). A fresh n in
// 4..6; the number of leaves n! and the min worst-case comparisons ⌈log₂ n!⌉ are
// DERIVED from a tiny factorial (never hand-typed). The three "why" choices are
// STATIC conceptual parts (identical text to the fixed bank).
// =============================================================================

// A tiny factorial so the leaf count and the log2 bound are computed, not typed.
const factorialOf = n => {
	let product = 1;
	for (let i = 2; i <= n; i += 1) product *= i;
	return product;
};

const sorting3Instance = seed => {
	const n = rejectionSample(
		seed,
		stream => int(stream, 4, 6),
		v => v >= 4 && v <= 6
	);
	const orderings = factorialOf(n); // n! leaves of the decision tree
	const minComparisons = Math.ceil(Math.log2(orderings)); // ⌈log₂ n!⌉
	return {
		kind: 'problem',
		__input: { n },
		stem:
			`Any sort that orders elements only by COMPARING pairs can be drawn as a ` +
			`binary decision tree: each internal node asks "is a < b?", and every ` +
			`possible sorted output is a leaf. Reason about the shortest such tree for ` +
			`n = ${n} elements.`,
		parts: [
			{
				kind: 'numeric',
				prompt:
					`Each distinct ordering of the ${n} inputs must reach its own leaf. ` +
					`How many leaves does the decision tree need at minimum (i.e. how many ` +
					`distinct orderings of ${n} elements are there)?`,
				answer: orderings,
				placeholder: 'a count',
				explanation:
					`There are ${n}! = ${orderings} permutations of ${n} ` +
					`distinct elements, and a correct comparison sort must be able to output ` +
					`each one, so the tree needs at least ${orderings} leaves.`,
			},
			{
				kind: 'numeric',
				prompt:
					`A binary tree with L leaves has height at least ⌈log₂ L⌉, and the ` +
					`worst-case number of comparisons is that height. With L = ` +
					`${orderings} leaves, how many comparisons must the worst case make ` +
					`at minimum?`,
				answer: minComparisons,
				placeholder: 'a count',
				explanation:
					`A binary tree of height h has at most 2^h leaves, so h ≥ ⌈log₂ L⌉. ` +
					`Here ⌈log₂ ${orderings}⌉ = ${minComparisons}, so SOME input ` +
					`forces at least ${minComparisons} comparisons. No comparison sort ` +
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
};

// =============================================================================
// LINEAR-TIME SORTING (bucket sort) — linsort-3. A fresh array of 8 DISTINCT
// non-negative ints into 4 buckets; the bucket a probed value lands in, that
// bucket's scatter-order contents, and the final sorted array are all read off
// bucketSort. The two complexity choices are STATIC conceptual parts.
// =============================================================================

// Constraints (so every part is well-formed and instructive):
//  • 8 DISTINCT values ⇒ a deterministic final order (no value-tie ambiguity).
//  • the probed value's bucket holds ≥ 2 values ⇒ the scatter-order "order" part is
//    a real arrangement, not a one-element drag.
//  • that bucket's scatter order ≠ its sorted order ⇒ the "before the local sort"
//    question is non-trivial (the sort actually reorders it).
//  • ≥ 2 non-empty buckets ⇒ the values genuinely spread (not all in one bucket).
const linsort3Instance = seed => {
	const numBuckets = 4;
	const found = rejectionSample(
		seed,
		stream => {
			const values = distinctInts(stream, 8, 1, 60);
			const probe = pick(stream, values);
			return { values, probe };
		},
		({ values, probe }) => {
			const run = bucketSort(values, numBuckets);
			const probeBucket = run.bucketIndexOf(probe);
			if (run.buckets[probeBucket].length < 2) return false; // a real scatter group
			const nonEmpty = run.buckets.filter(b => b.length > 0).length;
			if (nonEmpty < 2) return false; // values genuinely spread across buckets
			const scatter = run.buckets[probeBucket];
			const sortedBucket = run.sortedBuckets[probeBucket];
			// scatter ≠ sorted so "right after the scatter, before the local sort" differs.
			return scatter.join(',') !== sortedBucket.join(',');
		}
	);
	const values = found.values;
	const probe = found.probe;
	const run = bucketSort(values, numBuckets);
	const max = run.max;
	const probeBucket = run.bucketIndexOf(probe);
	const scatter = run.buckets[probeBucket]; // contents BEFORE the local sort
	const sortedBucket = run.sortedBuckets[probeBucket];
	const sorted = run.sorted;
	const sortedStr = `[${sorted.join(', ')}]`;
	return {
		kind: 'problem',
		__input: { values, numBuckets, probe },
		stem:
			`Bucket-sort the non-negative integers [${values.join(', ')}] into ` +
			`${numBuckets} buckets. The largest value is ${max}, so a value v is ` +
			`scattered into bucket floor(v * ${numBuckets} / ${max + 1}). Each bucket ` +
			`is then sorted on its own and the buckets are concatenated in index order.`,
		parts: [
			{
				kind: 'numeric',
				prompt:
					`Into which 0-based bucket is the value ${probe} scattered? ` +
					`(Use bucket index = floor(v * ${numBuckets} / ${max + 1}).)`,
				answer: probeBucket,
				placeholder: 'a bucket index',
				explanation:
					`floor(${probe} * ${numBuckets} / ${max + 1}) = floor(${
						probe * numBuckets
					} / ${max + 1}) = ${probeBucket}, so ${probe} lands in bucket ` +
					`${probeBucket}. The mapping spreads the range 0..${max} across ` +
					`${numBuckets} equal-width buckets; the +1 in the divisor keeps the ` +
					`maximum ${max} inside the last bucket instead of overflowing.`,
			},
			{
				kind: 'order',
				prompt:
					`List the contents of bucket ${probeBucket} as they sit RIGHT AFTER ` +
					`the scatter, BEFORE that bucket is sorted (keep them in the order the ` +
					`values appear in the input). Drag them into that sequence.`,
				items: [...scatter].sort((a, b) => a - b).map(String),
				answer: scatter.map(String),
				explanation:
					`Scanning the input left to right, the values that map to bucket ` +
					`${probeBucket} are ${scatter.join(', ')} (in that order). ` +
					`Bucket sort scatters first and sorts each bucket only afterwards, so ` +
					`right after the scatter the bucket still holds them in input order, not ` +
					`sorted order. Its local sort then turns ` +
					`[${scatter.join(', ')}] into [${sortedBucket.join(', ')}].`,
			},
			{
				kind: 'order',
				prompt:
					`After every bucket is sorted and the buckets are concatenated from ` +
					`bucket 0 upward, list the final sorted array. Drag the values into ` +
					`order.`,
				items: [...values].sort((a, b) => b - a).map(String),
				answer: sorted.map(String),
				explanation:
					`Sorting each bucket and gathering them in index order yields ` +
					`${sortedStr}. Because each value sits in a bucket whose whole range ` +
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
};

// =============================================================================
// THE INSTANCE-BUILDER REGISTRY
// =============================================================================
//
// setId → (seed) => fresh problem { kind, stem, parts }. Each builder is PURE in
// the seed: the same seed yields the byte-identical instance (the determinism the
// guardrail leans on). A set id NOT present here has no seeded variant and falls
// back to its fixed examSets.js problem (see buildExamSets below).
//
// SEEDABLE (here): every algorithmic family — graph traces (mst, sssp, apsp,
// graphs, maxflow), array traces (heaps, linsort, sorting), recurrence/DP (master,
// strategies), structure traces (hashing, trees, stacks-queues), and the
// closed-form numeric foundations.
//
// FIXED (absent here, on purpose): stacks-queues-2, np-1, np-2 — purely conceptual
// (which structure / which complexity class / reduction direction). There is no
// "instance" to vary; only a single correct concept. Left as the fixed problems.
export const INSTANCE_BUILDERS = {
	'mst-1': mst1,
	'mst-2': mst2,
	'mst-4': mst4,
	'mst-3': null, // mst-3 is a modification-analysis (uniform shift) — concept-heavy; left fixed.
	'sssp-1': sssp1,
	'sssp-2': sssp2,
	'sssp-3': sssp3,
	'sssp-4': sssp4,
	'heaps-1': heaps1,
	'heaps-2': heaps2,
	'heaps-3': heaps3,
	'master-1': master1,
	'master-2': master2,
	'master-3': master3,
	'apsp-1': apsp1,
	'apsp-2': apsp2,
	'linsort-1': linsort1,
	'linsort-2': linsort2,
	'linsort-3': linsort3Instance,
	'trees-1': trees1,
	'trees-2': trees2,
	'trees-3': trees3,
	'graphs-1': graphs1,
	'graphs-2': graphs2,
	'graphs-probe-1': graphsProbe1,
	'sssp-probe-1': ssspProbe1,
	'hashing-1': hashing1,
	'hashing-2': hashing2,
	'maxflow-1': maxflow1,
	'maxflow-2': maxflow2,
	'maxflow-3': maxflow3,
	'foundations-1': foundations1,
	'foundations-2': foundations2,
	'foundations-3': foundations3,
	'stacks-queues-1': stacksQueues1,
	'sorting-1': sorting1,
	'sorting-2': sorting2,
	'sorting-3': sorting3Instance,
	'quicksort-1': quicksort1Instance,
	'quicksort-2': quicksort2Instance,
	'strategies-1': strategies1,
	'strategies-2': strategies2,
	'strategies-3': strategies3,
	'np-3': np3,
};

// The set ids that genuinely have a seeded variant (a non-null builder). Sets not
// listed keep their fixed problem on every seed.
export const SEEDABLE_SET_IDS = Object.keys(INSTANCE_BUILDERS).filter(
	id => typeof INSTANCE_BUILDERS[id] === 'function'
);

/**
 * isSeedable — does this exam set have a seeded fresh-instance variant?
 * @param {string} setId an EXAM_SETS id.
 */
export const isSeedable = setId =>
	typeof INSTANCE_BUILDERS[setId] === 'function';

/**
 * buildInstanceProblem — the fresh problem for one set under one seed.
 *
 * Derives a per-set sub-seed from (seed, setId) so two seedable sets in the same
 * sitting get INDEPENDENT instances (one global seed does not lock every problem
 * into a correlated draw), while remaining deterministic in the sitting seed.
 *
 * @param {string} setId an EXAM_SETS id with a builder in INSTANCE_BUILDERS.
 * @param {number|string} seed the sitting seed.
 * @returns {object|null} a fresh { kind:'problem', stem, parts } or null if the set
 *                        is not seedable (caller should fall back to the fixed one).
 */
export const buildInstanceProblem = (setId, seed) => {
	const builder = INSTANCE_BUILDERS[setId];
	if (typeof builder !== 'function') return null;
	// Fold the set id into the seed so each set's stream is distinct but reproducible.
	const subSeed = (toSeed(seed) ^ toSeed(setId)) >>> 0;
	return builder(subSeed);
};

export default INSTANCE_BUILDERS;
