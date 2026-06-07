import assert from 'node:assert/strict';
import test from 'node:test';
import { createUnionFind } from './unionFind.js';
import {
	crossingEdges,
	edgeId,
	idleMstFrame,
	isSpanningTree,
	kruskalTrace,
	lightEdge,
	normalizeEdges,
	primTrace,
	totalWeight,
} from './mstTrace.js';
import { MST_EDGES, MST_VERTICES } from './mstMeta.js';

// Every MST frame must carry a 0-based pseudocode line and the structural fields
// the graph stage + PseudoState rail read, so they stay in lockstep.
const assertFrameShape = frame => {
	assert.equal(typeof frame.line, 'number', 'frame has a numeric line');
	assert.ok(frame.line >= 0, 'line is 0-based');
	assert.ok(Array.isArray(frame.treeEdges), 'frame lists tree edges');
	assert.ok(Array.isArray(frame.state), 'frame carries PseudoState rows');
	assert.equal(typeof frame.totalWeight, 'number', 'frame has a running weight');
};

// ── Union-find (the data structure Kruskal needs) ──

test('union-find: make-set, find, and singleton components', () => {
	const uf = createUnionFind(['A', 'B', 'C']);
	assert.equal(uf.count(), 3, 'three singletons');
	assert.equal(uf.find('A'), 'A', 'a fresh element is its own root');
	assert.ok(!uf.connected('A', 'B'));
	assert.deepEqual(uf.components(), [['A'], ['B'], ['C']]);
});

test('union-find: union merges sets and reports the cycle signal', () => {
	const uf = createUnionFind(['A', 'B', 'C', 'D']);
	assert.equal(uf.union('A', 'B'), true, 'first union merges');
	assert.equal(uf.union('A', 'B'), false, 'already joined → false (a cycle)');
	assert.ok(uf.connected('A', 'B'));
	uf.union('C', 'D');
	assert.equal(uf.count(), 2, 'two components: {A,B} and {C,D}');
	assert.equal(uf.union('B', 'C'), true, 'merging two trees');
	assert.equal(uf.count(), 1, 'all connected');
	assert.equal(uf.union('A', 'D'), false, 'any further union is a cycle');
});

test('union-find: path compression flattens without changing membership', () => {
	const uf = createUnionFind(['A', 'B', 'C', 'D', 'E']);
	// Build a chain, then a Find must compress it but keep the same root set.
	uf.union('A', 'B');
	uf.union('B', 'C');
	uf.union('C', 'D');
	uf.union('D', 'E');
	const root = uf.find('E');
	assert.equal(uf.find('A'), root, 'every element shares one root');
	assert.equal(uf.count(), 1);
	// All five are mutually connected regardless of insertion order.
	for (const x of ['A', 'B', 'C', 'D', 'E'])
		for (const y of ['A', 'B', 'C', 'D', 'E'])
			assert.ok(uf.connected(x, y));
});

test('union-find: union by rank keeps trees shallow', () => {
	const uf = createUnionFind(['A', 'B', 'C', 'D']);
	uf.union('A', 'B'); // rank(rootA) becomes 1
	uf.union('C', 'D'); // rank(rootC) becomes 1
	uf.union('A', 'C'); // equal ranks → one root's rank becomes 2
	const root = uf.find('A');
	// The deepest possible chain after compression is height ≤ 2; every Find lands
	// on the single root in one hop after compression.
	for (const x of ['A', 'B', 'C', 'D']) assert.equal(uf.find(x), root);
	assert.ok(uf.rankOf(root) >= 1, 'the surviving root has accumulated rank');
});

// ── Edge helpers ──

test('edgeId is canonical and order-independent', () => {
	assert.equal(edgeId('A', 'B'), 'A|B');
	assert.equal(edgeId('B', 'A'), 'A|B', 'undirected: same id either way');
});

test('normalizeEdges de-duplicates and canonicalises', () => {
	const norm = normalizeEdges([
		{ u: 'B', v: 'A', w: 2 },
		{ u: 'A', v: 'B', w: 2 }, // duplicate of the first (undirected)
		{ u: 'A', v: 'C', w: 5 },
	]);
	assert.equal(norm.length, 2, 'the duplicate undirected edge is dropped');
	assert.deepEqual(
		norm.map(e => e.id).sort(),
		['A|B', 'A|C']
	);
});

// ── Cut + light-edge (the heart of MST correctness) ──

test('crossingEdges: only edges with exactly one endpoint inside cross', () => {
	const { crossing } = crossingEdges(MST_EDGES, ['A']);
	// From A the only crossing edges are A–B and A–D.
	assert.deepEqual(
		crossing.map(e => e.id).sort(),
		['A|B', 'A|D']
	);
});

test('lightEdge: the minimum-weight crossing edge is the safe choice', () => {
	// Cut {A} → light edge is A–B (weight 2), the cheapest leaving A.
	assert.equal(lightEdge(MST_EDGES, ['A'])?.id, 'A|B');
	// Cut {A,B,D} → crossing edges are B–C(9), B–E(4), D–E(8), D–G(12); light = B–E.
	assert.equal(lightEdge(MST_EDGES, ['A', 'B', 'D'])?.id, 'B|E');
});

test('lightEdge: a cut nothing crosses has no light edge', () => {
	assert.equal(lightEdge(MST_EDGES, MST_VERTICES), null, 'whole graph: no crossing');
	assert.equal(lightEdge(MST_EDGES, []), null, 'empty side: no crossing');
});

// ── Kruskal ──

test('kruskalTrace builds a valid minimum spanning tree', () => {
	const { frames, treeEdges, totalWeight: total } = kruskalTrace({
		vertices: MST_VERTICES,
		edges: MST_EDGES,
	});
	frames.forEach(assertFrameShape);
	const report = isSpanningTree(MST_VERTICES, treeEdges);
	assert.ok(report.spanning, 'Kruskal returns a spanning tree');
	assert.equal(treeEdges.length, MST_VERTICES.length - 1, 'n − 1 edges');
	assert.equal(total, 27, 'known minimum total weight for the shared graph');
	assert.equal(total, totalWeight(MST_EDGES, treeEdges), 'weight matches the edges');
});

test('kruskalTrace accepts edges in non-decreasing weight order', () => {
	const { frames } = kruskalTrace({ vertices: MST_VERTICES, edges: MST_EDGES });
	const accepted = frames.filter(f => f.phase === 'accept');
	const weights = accepted.map(f => f.considerEdge.w);
	const ascending = [...weights].sort((a, b) => a - b);
	assert.deepEqual(weights, ascending, 'greedy: cheapest-first acceptances');
});

test('kruskalTrace rejects exactly the cycle-forming edges', () => {
	const { frames } = kruskalTrace({ vertices: MST_VERTICES, edges: MST_EDGES });
	const accepted = frames.filter(f => f.phase === 'accept').length;
	const rejected = frames.filter(f => f.phase === 'reject').length;
	const considered = normalizeEdges(MST_EDGES).length;
	assert.equal(accepted, MST_VERTICES.length - 1, 'n − 1 edges accepted');
	assert.equal(accepted + rejected, considered, 'every edge is considered once');
});

// ── Prim ──

test('primTrace builds the same MST from any start vertex', () => {
	const fromA = primTrace({ vertices: MST_VERTICES, edges: MST_EDGES, start: 'A' });
	const fromF = primTrace({ vertices: MST_VERTICES, edges: MST_EDGES, start: 'F' });
	fromA.frames.forEach(assertFrameShape);
	fromF.frames.forEach(assertFrameShape);
	assert.deepEqual(
		fromA.treeEdges.slice().sort(),
		fromF.treeEdges.slice().sort(),
		'unique MST: start vertex does not change the tree'
	);
	assert.equal(fromA.totalWeight, 27);
	assert.equal(fromF.totalWeight, 27);
});

test('Prim and Kruskal agree (same tree, same weight) on the shared graph', () => {
	const k = kruskalTrace({ vertices: MST_VERTICES, edges: MST_EDGES });
	const p = primTrace({ vertices: MST_VERTICES, edges: MST_EDGES, start: 'A' });
	assert.equal(k.totalWeight, p.totalWeight, 'identical total weight');
	assert.deepEqual(
		k.treeEdges.slice().sort(),
		p.treeEdges.slice().sort(),
		'identical edge set (weights are distinct ⇒ unique MST)'
	);
});

test('every Prim accepted edge is the light edge across the current cut', () => {
	const inside = new Set(['A']);
	const { frames } = primTrace({ vertices: MST_VERTICES, edges: MST_EDGES, start: 'A' });
	for (const f of frames.filter(fr => fr.phase === 'accept')) {
		const expected = lightEdge(MST_EDGES, inside);
		assert.equal(
			f.considerEdge.id,
			expected.id,
			`across ${[...inside].sort()} the safe edge is ${expected.id}`
		);
		// Move the newly added vertex inside the cut for the next iteration.
		inside.add(f.considerEdge.u);
		inside.add(f.considerEdge.v);
	}
});

// ── Verification helper ──

test('isSpanningTree flags non-spanning / cyclic edge sets', () => {
	// Too few edges → not connected.
	const tooFew = isSpanningTree(MST_VERTICES, ['A|B', 'A|D']);
	assert.ok(!tooFew.spanning && !tooFew.connected);
	// A cycle within the chosen edges → not acyclic.
	const cyclic = isSpanningTree(['A', 'B', 'C'], ['A|B', 'B|C', edgeId('A', 'C')]);
	assert.ok(!cyclic.acyclic, 'detects the cycle');
});

// ── Idle frame + state rows ──

test('idleMstFrame is a valid starting frame for each algorithm', () => {
	const kruskalIdle = idleMstFrame({ vertices: MST_VERTICES, algorithm: 'kruskal' });
	const primIdle = idleMstFrame({ vertices: MST_VERTICES, algorithm: 'prim' });
	assert.equal(kruskalIdle.treeEdges.length, 0);
	assert.equal(kruskalIdle.components.length, MST_VERTICES.length, 'all singletons');
	assert.deepEqual(primIdle.treeNodes, [MST_VERTICES[0]], 'Prim seeds the start vertex');
});

test('every Kruskal/Prim frame exposes labelled live-state rows', () => {
	const { frames } = kruskalTrace({ vertices: MST_VERTICES, edges: MST_EDGES });
	const consider = frames.find(f => f.phase === 'consider');
	const ids = consider.state.map(r => r.id);
	assert.ok(ids.includes('comps'), 'Kruskal surfaces the union-find components');
	assert.ok(ids.includes('weight'), 'and the running total weight');
});
