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
import { sqFrames } from '../components/StacksQueues/sqFrames.js';
import { getMergeSortStepsWithStats } from '../utils/sorting/algorithms/mergeSort.js';
import {
	buildCoinChangeFrames,
	buildClimbingStairsFrames,
} from '../components/Strategies/coinChangeFrames.js';

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
	'mst-3': null, // mst-3 is a modification-analysis (uniform shift) — concept-heavy; left fixed.
	'sssp-1': sssp1,
	'sssp-2': sssp2,
	'sssp-3': sssp3,
	'heaps-1': heaps1,
	'heaps-2': heaps2,
	'master-1': master1,
	'master-2': master2,
	'apsp-1': apsp1,
	'linsort-1': linsort1,
	'linsort-2': linsort2,
	'trees-1': trees1,
	'graphs-1': graphs1,
	'hashing-1': hashing1,
	'maxflow-1': maxflow1,
	'foundations-1': foundations1,
	'foundations-2': foundations2,
	'stacks-queues-1': stacksQueues1,
	'sorting-1': sorting1,
	'sorting-2': sorting2,
	'strategies-1': strategies1,
	'strategies-2': strategies2,
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
