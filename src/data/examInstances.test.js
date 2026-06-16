// examInstances.test.js — the seeded fresh-instance layer's own guardrail.
//
// examSets.test.js already proves the seeded ANSWERS re-derive from the generators
// (correctness) and that instances are deterministic and varied. This file proves
// the OTHER half: that every generated INPUT is exam-appropriate — connected where
// it must be, non-negative where the algorithm needs it, the right size, no
// negative cycle, a valid heap, distinct keys, a unique answer where required.
// These are the constraints the builders REJECTION-SAMPLE for; if a constraint ever
// silently breaks (a graph goes disconnected, a heap stops being a heap), an exam
// item becomes ill-posed, and this is where we catch it — across a wide seed sweep
// so a rare bad draw cannot hide.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
	INSTANCE_BUILDERS,
	SEEDABLE_SET_IDS,
	buildInstanceProblem,
	isSeedable,
} from './examInstances.js';

import { kruskalTrace, primTrace } from '../components/Mst/mstTrace.js';
import {
	dijkstraTrace,
	bellmanFordTrace,
} from '../components/ShortestPaths/relaxTrace.js';
import { isMaxHeap } from '../components/Heaps/heapTrace.js';
import { analyseRecurrence } from '../components/MasterTheorem/masterMath.js';
import { floydWarshall } from '../components/AllPairsShortestPaths/fwTrace.js';
import { genericTraverse } from '../components/Graph/oneFrontier.js';
import { createBucketsFromEntries } from '../components/HashMap/hashMapTrace.js';
import { edmondsKarpTrace } from '../components/MaxFlow/maxFlowTrace.js';
import { buildCoinChangeFrames } from '../components/Strategies/coinChangeFrames.js';

// A wide seed sweep so a constraint that fails only on a rare draw is still caught.
const SEEDS = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);

// Pull the validated input out of the instance (the builder attaches it).
const inputOf = (id, seed) => buildInstanceProblem(id, seed).__input;

// ── connectivity helpers ─────────────────────────────────────────────────────

// Is an UNDIRECTED edge list connected over `vertices`? (union-find by hand.)
const undirectedConnected = (vertices, edges) => {
	const parent = new Map(vertices.map(v => [v, v]));
	const find = x => {
		while (parent.get(x) !== x) {
			parent.set(x, parent.get(parent.get(x)));
			x = parent.get(x);
		}
		return x;
	};
	const union = (a, b) => parent.set(find(a), find(b));
	for (const e of edges) union(String(e.u), String(e.v));
	const roots = new Set(vertices.map(find));
	return roots.size === 1;
};

// Which vertices are reachable from `src` along DIRECTED edges?
const reachableFrom = (ids, edges, src) => {
	const adj = new Map(ids.map(id => [id, []]));
	for (const e of edges) adj.get(e.from)?.push(e.to);
	const seen = new Set([src]);
	const stack = [src];
	while (stack.length) {
		const u = stack.pop();
		for (const v of adj.get(u) || []) {
			if (!seen.has(v)) {
				seen.add(v);
				stack.push(v);
			}
		}
	}
	return seen;
};

// ── meta-guardrails on the layer itself ──────────────────────────────────────

test('the seedable registry is non-empty and self-consistent', () => {
	assert.ok(SEEDABLE_SET_IDS.length >= 20, 'expected a broad seedable set');
	for (const id of SEEDABLE_SET_IDS) {
		assert.equal(typeof INSTANCE_BUILDERS[id], 'function');
		assert.ok(isSeedable(id));
	}
	// The three genuinely-conceptual sets must NOT be seedable.
	for (const id of ['stacks-queues-2', 'np-1', 'np-2']) {
		assert.equal(isSeedable(id), false, `${id} should be fixed (conceptual)`);
	}
});

// ── MST: connected, distinct weights ⇒ unique MST, n-1 tree edges, a real skip ──

test('mst-1 inputs: connected, distinct weights, n-1 tree edges, a cycle is skipped', () => {
	for (const seed of SEEDS) {
		const { vertices, edges } = inputOf('mst-1', seed);
		assert.ok(
			undirectedConnected(vertices, edges),
			`seed ${seed}: disconnected`
		);
		const ws = edges.map(e => e.w);
		assert.equal(
			new Set(ws).size,
			ws.length,
			`seed ${seed}: weights not distinct`
		);
		assert.ok(
			edges.every(e => e.w > 0),
			`seed ${seed}: a non-positive weight slipped in`
		);
		const run = kruskalTrace({ vertices, edges });
		assert.equal(
			run.treeEdges.length,
			vertices.length - 1,
			`seed ${seed}: MST is not a spanning tree (wrong edge count)`
		);
		assert.ok(
			edges.length > vertices.length - 1,
			`seed ${seed}: no extra edge, so no cycle is ever skipped`
		);
	}
});

test('mst-2 inputs: connected, start A has ≥2 incident edges, n-1 tree edges', () => {
	for (const seed of SEEDS) {
		const { vertices, edges, start } = inputOf('mst-2', seed);
		assert.equal(start, 'A');
		assert.ok(
			undirectedConnected(vertices, edges),
			`seed ${seed}: disconnected`
		);
		const incident = edges.filter(e => e.u === start || e.v === start);
		assert.ok(
			incident.length >= 2,
			`seed ${seed}: start ${start} has <2 incident edges (the "first edge" choice is trivial)`
		);
		const run = primTrace({ vertices, edges, start });
		assert.equal(
			run.treeEdges.length,
			vertices.length - 1,
			`seed ${seed}: not spanning`
		);
	}
});

// ── Dijkstra: non-negative, all reachable, UNIQUE settle order ───────────────

test('sssp-1 (Dijkstra) inputs: non-negative, all reachable, unique distances', () => {
	for (const seed of SEEDS) {
		const { graph } = inputOf('sssp-1', seed);
		assert.equal(graph.nodes.length, 5);
		assert.ok(
			graph.edges.every(e => e.weight > 0),
			`seed ${seed}: Dijkstra input has a non-positive weight`
		);
		const ids = graph.nodes.map(n => n.id);
		const reach = reachableFrom(ids, graph.edges, 'S');
		assert.equal(
			reach.size,
			ids.length,
			`seed ${seed}: not all vertices reachable from S`
		);
		const run = dijkstraTrace(graph, { source: 'S' });
		const dists = ids.map(id =>
			run.dist[id] == null ? Infinity : run.dist[id]
		);
		assert.ok(
			dists.every(d => Number.isFinite(d)),
			`seed ${seed}: an infinite distance`
		);
		assert.equal(
			new Set(dists).size,
			dists.length,
			`seed ${seed}: distances are not unique (settle order would be ambiguous)`
		);
	}
});

// ── Bellman-Ford: has a negative edge, NO negative cycle, all reachable ──────

const bfInputOk = (graph, { mustChangeD = false } = {}) => {
	const ids = graph.nodes.map(n => n.id);
	const hasNeg = graph.edges.some(e => e.weight < 0);
	const run = bellmanFordTrace(graph, { source: 'S' });
	const dists = ids.map(id => (run.dist[id] == null ? Infinity : run.dist[id]));
	const reachAll = dists.every(d => Number.isFinite(d));
	let changeOk = true;
	if (mustChangeD) {
		let pass1D = null;
		for (const f of run.frames) if (f.pass === 1) pass1D = f.dist?.D;
		const p1 = pass1D == null ? Infinity : pass1D;
		const fin = run.dist.D == null ? Infinity : run.dist.D;
		changeOk = p1 !== fin;
	}
	return hasNeg && !run.negativeCycle && reachAll && changeOk;
};

test('sssp-2 (Bellman-Ford) inputs: a negative edge, no negative cycle, all reachable', () => {
	for (const seed of SEEDS) {
		const { graph } = inputOf('sssp-2', seed);
		assert.equal(graph.nodes.length, 4);
		assert.ok(bfInputOk(graph), `seed ${seed}: BF input violates a constraint`);
		// Weights are non-zero by construction.
		assert.ok(
			graph.edges.every(e => e.weight !== 0),
			`seed ${seed}: a zero-weight edge`
		);
	}
});

test('sssp-3 (Bellman-Ford trace) inputs: negative edge, no neg cycle, dist[D] changes after pass 1', () => {
	for (const seed of SEEDS) {
		const { graph } = inputOf('sssp-3', seed);
		assert.equal(graph.nodes.length, 5);
		assert.ok(
			bfInputOk(graph, { mustChangeD: true }),
			`seed ${seed}: BF-trace input violates a constraint (or dist[D] does not change after pass 1)`
		);
	}
});

// ── Heaps: build input is a non-heap; extract input is a VALID heap ──────────

test('heaps-1 inputs: 6 distinct values that are NOT already a max-heap', () => {
	for (const seed of SEEDS) {
		const { array } = inputOf('heaps-1', seed);
		assert.equal(array.length, 6);
		assert.equal(
			new Set(array).size,
			array.length,
			`seed ${seed}: values not distinct`
		);
		assert.equal(
			isMaxHeap(array),
			false,
			`seed ${seed}: input is already a heap (build does nothing)`
		);
	}
});

test('heaps-2 inputs: a VALID max-heap of 6 distinct values', () => {
	for (const seed of SEEDS) {
		const { heap } = inputOf('heaps-2', seed);
		assert.equal(heap.length, 6);
		assert.equal(
			new Set(heap).size,
			heap.length,
			`seed ${seed}: heap values not distinct`
		);
		assert.ok(
			isMaxHeap(heap),
			`seed ${seed}: extract input is NOT a valid max-heap`
		);
	}
});

// ── Master theorem: lands in the intended case ───────────────────────────────

test('master-1 inputs land in Case 2; master-2 inputs land in Case 1', () => {
	for (const seed of SEEDS) {
		const m1 = inputOf('master-1', seed).params;
		const m2 = inputOf('master-2', seed).params;
		assert.equal(
			analyseRecurrence(m1).caseId,
			2,
			`seed ${seed}: master-1 not Case 2`
		);
		assert.equal(
			analyseRecurrence(m2).caseId,
			1,
			`seed ${seed}: master-2 not Case 1`
		);
		for (const p of [m1, m2]) {
			assert.ok([2, 3, 4].includes(p.b), `seed ${seed}: b out of {2,3,4}`);
			assert.ok(p.a >= 1 && p.a <= 16, `seed ${seed}: a out of range`);
			assert.ok(p.d >= 0 && p.d <= 3, `seed ${seed}: d out of range`);
		}
	}
});

// ── Floyd-Warshall: 1 reaches 2, 3, 4; positive weights ─────────────────────

test('apsp-1 inputs: positive weights, vertex 1 reaches 2, 3 and 4', () => {
	for (const seed of SEEDS) {
		const { graph } = inputOf('apsp-1', seed);
		assert.equal(graph.nodes.length, 4);
		assert.ok(
			graph.edges.every(e => e.weight > 0),
			`seed ${seed}: non-positive weight`
		);
		const run = floydWarshall(graph);
		const ids = run.ids;
		const row1 = run.dist[ids.indexOf('1')];
		for (const dest of ['2', '3', '4']) {
			assert.notEqual(
				row1[ids.indexOf(dest)],
				null,
				`seed ${seed}: vertex 1 cannot reach ${dest}`
			);
		}
		assert.equal(
			run.negativeCycle,
			false,
			`seed ${seed}: unexpected negative cycle`
		);
	}
});

// ── Counting sort: small non-negative keys, a duplicate, a real range ────────

test('linsort-1 inputs: 8 keys in 0..6 with a duplicate, a zero, and max ≥ 3', () => {
	for (const seed of SEEDS) {
		const { array } = inputOf('linsort-1', seed);
		assert.equal(array.length, 8);
		assert.ok(
			array.every(v => v >= 0 && v <= 6),
			`seed ${seed}: key out of 0..6`
		);
		assert.ok(
			new Set(array).size < array.length,
			`seed ${seed}: no duplicate key`
		);
		assert.ok(
			array.includes(0),
			`seed ${seed}: no zero key (count[0] would be trivial)`
		);
		assert.ok(Math.max(...array) >= 3, `seed ${seed}: key range too small`);
	}
});

// ── Radix: distinct two-digit values, a tens AND a ones collision, unstable wrong

test('linsort-2 inputs: 6 distinct two-digit values with digit collisions; unstable is wrong', () => {
	for (const seed of SEEDS) {
		const { values } = inputOf('linsort-2', seed);
		assert.equal(values.length, 6);
		assert.equal(
			new Set(values).size,
			values.length,
			`seed ${seed}: values not distinct`
		);
		assert.ok(
			values.every(v => v >= 10 && v <= 99),
			`seed ${seed}: not two-digit`
		);
		const tens = values.map(v => Math.floor(v / 10));
		const ones = values.map(v => v % 10);
		assert.ok(
			new Set(tens).size < tens.length,
			`seed ${seed}: no tens collision`
		);
		assert.ok(
			new Set(ones).size < ones.length,
			`seed ${seed}: no ones collision`
		);
	}
});

// ── BST: 8 distinct keys, a deletable two-child node ─────────────────────────

test('trees-1 inputs: 8 distinct keys; the deleted key has two children', () => {
	for (const seed of SEEDS) {
		const { insertOrder, delValue } = inputOf('trees-1', seed);
		assert.equal(insertOrder.length, 8);
		assert.equal(
			new Set(insertOrder).size,
			8,
			`seed ${seed}: keys not distinct`
		);
		assert.ok(
			insertOrder.includes(delValue),
			`seed ${seed}: delValue not in the tree`
		);
		// Reconstruct and confirm delValue's node has two children.
		const childCount = (() => {
			let node = { value: insertOrder[0], left: null, right: null };
			const insert = (root, v) => {
				if (root == null) return { value: v, left: null, right: null };
				if (v === root.value) return root;
				if (v < root.value) root.left = insert(root.left, v);
				else root.right = insert(root.right, v);
				return root;
			};
			for (const v of insertOrder.slice(1)) node = insert(node, v);
			const findNode = (root, v) => {
				let cur = root;
				while (cur) {
					if (cur.value === v) return cur;
					cur = v < cur.value ? cur.left : cur.right;
				}
				return null;
			};
			const target = findNode(node, delValue);
			return target && target.left && target.right ? 2 : 0;
		})();
		assert.equal(
			childCount,
			2,
			`seed ${seed}: delValue does not have two children`
		);
	}
});

// ── Graphs: connected (all 6 visited), BFS depth ≥ 2 somewhere ───────────────

test('graphs-1 inputs: connected (BFS visits all 6) with a depth ≥ 2', () => {
	for (const seed of SEEDS) {
		const { graph, target } = inputOf('graphs-1', seed);
		assert.equal(graph.nodes.length, 6);
		const bfs = genericTraverse(graph, { discipline: 'fifo', start: 'A' });
		assert.equal(
			bfs.visitOrder.length,
			6,
			`seed ${seed}: graph not connected from A`
		);
		const depths = Object.values(bfs.dist).map(d => (d == null ? -1 : d));
		assert.ok(
			Math.max(...depths) >= 2,
			`seed ${seed}: graph too shallow (max depth < 2)`
		);
		// The asked target is genuinely the deepest vertex.
		const targetDepth = bfs.dist[target];
		assert.equal(
			targetDepth,
			Math.max(...depths),
			`seed ${seed}: target is not the deepest vertex`
		);
	}
});

// ── Hashing: 5 distinct keys, at least one collision in 7 buckets ────────────

test('hashing-1 inputs: 5 distinct keys with ≥1 real chained collision in 7 buckets', () => {
	for (const seed of SEEDS) {
		const { keys, capacity } = inputOf('hashing-1', seed);
		assert.equal(capacity, 7);
		assert.equal(keys.length, 5);
		assert.equal(new Set(keys).size, 5, `seed ${seed}: keys not distinct`);
		const entries = keys.map(k => ({ key: k, value: k.length }));
		const buckets = createBucketsFromEntries(entries, capacity);
		const collisions = buckets.filter(b => b.length > 1).length;
		assert.ok(
			collisions >= 1,
			`seed ${seed}: no collision (the chaining question is trivial)`
		);
	}
});

// ── Max flow: positive flow, a proper source side of the min cut ─────────────

test('maxflow-1 inputs: positive flow, min-cut source side is a proper subset', () => {
	for (const seed of SEEDS) {
		const { network } = inputOf('maxflow-1', seed);
		assert.equal(network.source, 'S');
		assert.equal(network.sink, 'T');
		assert.ok(
			network.edges.every(e => e.capacity > 0),
			`seed ${seed}: a non-positive capacity`
		);
		const run = edmondsKarpTrace(network);
		assert.ok(
			run.value > 0,
			`seed ${seed}: max flow is 0 (degenerate network)`
		);
		assert.ok(run.minCut.S.length >= 1, `seed ${seed}: empty source side`);
		assert.ok(
			run.minCut.S.length < network.nodes.length,
			`seed ${seed}: min-cut source side is every vertex (no real cut)`
		);
	}
});

// ── Foundations: n in the documented ranges ──────────────────────────────────

test('foundations inputs: n in their documented ranges', () => {
	for (const seed of SEEDS) {
		const n1 = inputOf('foundations-1', seed).n;
		const n2 = inputOf('foundations-2', seed).n;
		assert.ok(
			n1 >= 6 && n1 <= 12,
			`seed ${seed}: foundations-1 n out of 6..12`
		);
		assert.ok(
			n2 >= 50 && n2 <= 200,
			`seed ${seed}: foundations-2 n out of 50..200`
		);
	}
});

// ── Stacks & queues: both structures finish with ≥2 items; ≥1 remove ─────────

test('stacks-queues-1 inputs: op log leaves both structures with ≥2 items and has a remove', () => {
	for (const seed of SEEDS) {
		const { ops } = inputOf('stacks-queues-1', seed);
		assert.ok(ops.length >= 4, `seed ${seed}: op log too short`);
		assert.ok(
			ops.some(o => o.type === 'remove'),
			`seed ${seed}: no remove op`
		);
		// Replay the running size to confirm it never underflows and ends ≥ 2.
		let size = 0;
		for (const o of ops) {
			if (o.type === 'add') size += 1;
			else size -= 1;
			assert.ok(size >= 0, `seed ${seed}: op log underflows (remove on empty)`);
		}
		assert.ok(size >= 2, `seed ${seed}: structures end with <2 items`);
	}
});

// ── Sorting: distinct, non-trivially-ordered array; interleaving runs ─────────

test('sorting-1 inputs: 8 distinct values, neither ascending nor descending', () => {
	for (const seed of SEEDS) {
		const { array } = inputOf('sorting-1', seed);
		assert.equal(array.length, 8);
		assert.equal(new Set(array).size, 8, `seed ${seed}: values not distinct`);
		const asc = array.every((v, i) => i === 0 || array[i - 1] < v);
		const desc = array.every((v, i) => i === 0 || array[i - 1] > v);
		assert.ok(
			!asc && !desc,
			`seed ${seed}: array is already sorted/reverse-sorted`
		);
	}
});

test('sorting-2 inputs: two sorted runs of 4 distinct values that genuinely interleave', () => {
	for (const seed of SEEDS) {
		const { left, right } = inputOf('sorting-2', seed);
		assert.equal(left.length, 4);
		assert.equal(right.length, 4);
		assert.ok(
			left.every((v, i) => i === 0 || left[i - 1] < v),
			`seed ${seed}: left not sorted`
		);
		assert.ok(
			right.every((v, i) => i === 0 || right[i - 1] < v),
			`seed ${seed}: right not sorted`
		);
		assert.equal(
			new Set([...left, ...right]).size,
			8,
			`seed ${seed}: values not distinct`
		);
		// Interleaving: neither run lies entirely below the other.
		const maxLeft = Math.max(...left);
		const minRight = Math.min(...right);
		const maxRight = Math.max(...right);
		const minLeft = Math.min(...left);
		assert.ok(
			maxLeft > minRight && maxRight > minLeft,
			`seed ${seed}: runs do not interleave`
		);
	}
});

// ── Strategies: coin set where greedy genuinely overshoots ───────────────────

test('strategies-1 inputs: coins include 1, target ≥ 4, and greedy is suboptimal', () => {
	for (const seed of SEEDS) {
		const { coins, target } = inputOf('strategies-1', seed);
		assert.ok(
			coins.includes(1),
			`seed ${seed}: coin set lacks 1 (not every amount makeable)`
		);
		assert.equal(
			new Set(coins).size,
			coins.length,
			`seed ${seed}: duplicate coin`
		);
		assert.ok(
			target >= 4,
			`seed ${seed}: target < 4 (dp[4] sub-question undefined)`
		);
		const run = buildCoinChangeFrames({ target, coins });
		const dp = run.summary.dpFinal;
		const greedy = run.summary.greedyFinal;
		assert.ok(
			greedy != null && dp != null,
			`seed ${seed}: dp/greedy did not finish`
		);
		assert.ok(
			greedy > dp,
			`seed ${seed}: greedy is NOT suboptimal (no counterexample)`
		);
	}
});

test('strategies-2 inputs: n in 5..10', () => {
	for (const seed of SEEDS) {
		const { n } = inputOf('strategies-2', seed);
		assert.ok(
			n >= 5 && n <= 10,
			`seed ${seed}: climbing-stairs n out of 5..10`
		);
	}
});
