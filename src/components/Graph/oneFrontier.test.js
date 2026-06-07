import assert from 'node:assert/strict';
import test from 'node:test';
import {
	DISCIPLINE_ORDER,
	DISCIPLINES,
	INFINITY,
	ONE_FRONTIER_PSEUDO,
	buildOneFrontierTrace,
	genericTraverse,
	idleFrame,
} from './oneFrontier.js';

// ── Shared test graphs ────────────────────────────────────────────────────────

// An UNWEIGHTED teaching graph for BFS/DFS equivalence. Layers from A:
//   layer 0: A · layer 1: B,C · layer 2: D,E · layer 3: F
const UNWEIGHTED = {
	nodes: ['A', 'B', 'C', 'D', 'E', 'F'].map(id => ({ id })),
	edges: [
		{ from: 'A', to: 'B' },
		{ from: 'A', to: 'C' },
		{ from: 'B', to: 'D' },
		{ from: 'C', to: 'E' },
		{ from: 'D', to: 'F' },
		{ from: 'E', to: 'F' },
	],
};

// A WEIGHTED graph for Dijkstra + Prim equivalence. Weights distinct ⇒ unique
// MST. (Same shape family as the MST topic, self-contained here.)
const WEIGHTED = {
	nodes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(id => ({ id })),
	edges: [
		{ from: 'A', to: 'B', weight: 2 },
		{ from: 'A', to: 'D', weight: 3 },
		{ from: 'B', to: 'C', weight: 9 },
		{ from: 'B', to: 'E', weight: 4 },
		{ from: 'C', to: 'F', weight: 5 },
		{ from: 'D', to: 'E', weight: 8 },
		{ from: 'D', to: 'G', weight: 12 },
		{ from: 'E', to: 'F', weight: 6 },
		{ from: 'E', to: 'G', weight: 7 },
		{ from: 'F', to: 'G', weight: 10 },
		{ from: 'C', to: 'E', weight: 11 },
	],
};

// ── Independent reference implementations (NOT the engine under test) ─────────
//
// We grade the engine against algorithms computed here from scratch, so the test
// proves an equivalence rather than re-asserting the engine's own output.

const adjacencyUndirected = graph => {
	const adj = new Map(graph.nodes.map(n => [n.id, []]));
	graph.edges.forEach(e => {
		const w = Number(e.weight ?? 1);
		adj.get(e.from).push({ to: e.to, weight: w });
		adj.get(e.to).push({ to: e.from, weight: w });
	});
	adj.forEach(l => l.sort((a, b) => a.to.localeCompare(b.to)));
	return adj;
};

// Reference BFS visit order (queue, alphabetical neighbours).
const refBfsOrder = (graph, start) => {
	const adj = adjacencyUndirected(graph);
	const seen = new Set([start]);
	const q = [start];
	const order = [];
	while (q.length) {
		const u = q.shift();
		order.push(u);
		for (const { to } of adj.get(u)) {
			if (!seen.has(to)) {
				seen.add(to);
				q.push(to);
			}
		}
	}
	return order;
};

// Reference Dijkstra distances (array scan ExtractMin, alphabetical neighbours).
const refDijkstra = (graph, start) => {
	const adj = adjacencyUndirected(graph);
	const ids = graph.nodes.map(n => n.id);
	const dist = Object.fromEntries(ids.map(id => [id, Infinity]));
	dist[start] = 0;
	const done = new Set();
	for (;;) {
		let u = null;
		for (const id of ids) {
			if (done.has(id) || dist[id] === Infinity) continue;
			if (u === null || dist[id] < dist[u]) u = id;
		}
		if (u === null) break;
		done.add(u);
		for (const { to, weight } of adj.get(u)) {
			if (dist[u] + weight < dist[to]) dist[to] = dist[u] + weight;
		}
	}
	return dist;
};

// Reference MST total weight via Kruskal (sorted edges + union-find).
const refMstWeight = graph => {
	const ids = graph.nodes.map(n => n.id);
	const parent = Object.fromEntries(ids.map(id => [id, id]));
	const find = x => (parent[x] === x ? x : (parent[x] = find(parent[x])));
	const union = (a, b) => {
		const ra = find(a);
		const rb = find(b);
		if (ra === rb) return false;
		parent[ra] = rb;
		return true;
	};
	const edges = [...graph.edges]
		.map(e => ({ ...e, weight: Number(e.weight) }))
		.sort((a, b) => a.weight - b.weight);
	let weight = 0;
	let count = 0;
	for (const e of edges) {
		if (union(e.from, e.to)) {
			weight += e.weight;
			count += 1;
		}
	}
	return { weight, edges: count };
};

// A valid DFS order: every vertex's *parent* in the discovery tree must already
// be visited before it, and from each vertex the next visited vertex must be a
// descendant or a backtrack — a sufficient structural check is that the
// discovery tree is a spanning tree and visit order is a valid stack drain.
// Pragmatically: assert it visits all reachable vertices exactly once, starts at
// the source, and each non-start vertex's tree edge connects to an
// earlier-visited vertex (a connected DFS forest in discovery order).
const isValidTraversalOrder = (order, tree, start, reachable) => {
	if (order[0] !== start) return false;
	if (new Set(order).size !== order.length) return false; // no repeats
	if (new Set(order).size !== reachable.size) return false; // all reached
	const seen = new Set([start]);
	const treeBy = Object.fromEntries(tree.map(e => [e.to, e]));
	for (let i = 1; i < order.length; i++) {
		const v = order[i];
		const edge = treeBy[v];
		if (!edge) return false; // every non-start vertex has a tree edge
		if (!seen.has(edge.from)) return false; // connected to already-seen vertex
		seen.add(v);
	}
	return true;
};

// Every frame must carry a 0-based pseudocode line and the structural fields the
// graph view + PseudoState rail read, so they stay in lockstep.
const assertFrameShape = frame => {
	assert.equal(typeof frame.line, 'number', 'frame has a numeric line');
	assert.ok(frame.line >= 0 && frame.line < ONE_FRONTIER_PSEUDO.length, 'line indexes the pseudocode');
	assert.ok(Array.isArray(frame.state), 'frame carries PseudoState rows');
	assert.ok(Array.isArray(frame.frontier), 'frame lists the frontier');
	assert.ok(Array.isArray(frame.visited), 'frame lists settled vertices');
	assert.ok(Array.isArray(frame.tree), 'frame lists tree edges');
	assert.equal(typeof frame.dist, 'object', 'frame has a dist map');
};

// ════════════════════════════════════════════════════════════════════════════
//  THE FOUR EQUIVALENCES — one loop, one swappable frontier, four algorithms.
// ════════════════════════════════════════════════════════════════════════════

test('FIFO discipline yields the BFS visit order', () => {
	const { frames, visitOrder } = genericTraverse(UNWEIGHTED, {
		discipline: 'fifo',
		start: 'A',
	});
	frames.forEach(assertFrameShape);
	assert.deepEqual(visitOrder, refBfsOrder(UNWEIGHTED, 'A'));
	// On this graph that order is the layer order A,B,C,D,E,F.
	assert.deepEqual(visitOrder, ['A', 'B', 'C', 'D', 'E', 'F']);
});

test('LIFO discipline yields a valid DFS order (depth-first, not layered)', () => {
	const { frames, visitOrder, tree } = genericTraverse(UNWEIGHTED, {
		discipline: 'lifo',
		start: 'A',
	});
	frames.forEach(assertFrameShape);
	const reachable = new Set(UNWEIGHTED.nodes.map(n => n.id));
	assert.ok(
		isValidTraversalOrder(visitOrder, tree, 'A', reachable),
		`"${visitOrder.join(',')}" is a valid DFS order with a connected discovery tree`
	);
	// DFS must NOT equal the BFS layer order on this graph — it plunges deep.
	assert.notDeepEqual(visitOrder, refBfsOrder(UNWEIGHTED, 'A'));
	// Concretely: after A it dives into one branch (B before exhausting A's other
	// neighbour C only after that branch dead-ends), so C is not visited second.
	assert.notEqual(visitOrder[1] === 'B' && visitOrder[2] === 'C', true);
});

test('min-dist discipline yields Dijkstra distances', () => {
	const { frames, dist } = genericTraverse(WEIGHTED, {
		discipline: 'min-dist',
		start: 'A',
	});
	frames.forEach(assertFrameShape);
	const expected = refDijkstra(WEIGHTED, 'A');
	for (const id of WEIGHTED.nodes.map(n => n.id)) {
		const got = dist[id] === INFINITY ? Infinity : dist[id];
		assert.equal(got, expected[id], `dist[${id}] matches Dijkstra (${expected[id]})`);
	}
	// Sanity: hand-computed shortest distances from A on WEIGHTED.
	assert.equal(dist.A, 0);
	assert.equal(dist.B, 2);
	assert.equal(dist.D, 3);
});

test('min-edge discipline yields a minimum spanning tree (same weight as Kruskal)', () => {
	const { frames, tree, totalWeight, visitOrder } = genericTraverse(WEIGHTED, {
		discipline: 'min-edge',
		start: 'A',
	});
	frames.forEach(assertFrameShape);
	const { weight: mstWeight, edges: mstEdges } = refMstWeight(WEIGHTED);
	// The known MST of WEIGHTED has total weight 27 over 6 edges (7 vertices).
	assert.equal(mstWeight, 27, 'reference Kruskal MST weight is 27');
	assert.equal(totalWeight, mstWeight, 'Prim discipline reaches the same MST weight');
	assert.equal(tree.length, mstEdges, 'spanning tree has |V|-1 edges');
	assert.equal(visitOrder.length, WEIGHTED.nodes.length, 'every vertex is in the tree');
});

test('min-edge MST weight is start-independent (same tree from any start)', () => {
	const fromA = genericTraverse(WEIGHTED, { discipline: 'min-edge', start: 'A' });
	const fromF = genericTraverse(WEIGHTED, { discipline: 'min-edge', start: 'F' });
	assert.equal(fromA.totalWeight, fromF.totalWeight, 'same MST weight regardless of start');
	assert.equal(fromA.totalWeight, 27);
});

// ── The unity: all four are the SAME loop, differing only in extract ──────────

test('all four disciplines run the same loop and settle every reachable vertex', () => {
	const all = new Set(UNWEIGHTED.nodes.map(n => n.id));
	for (const discipline of DISCIPLINE_ORDER) {
		const graph = discipline === 'fifo' || discipline === 'lifo' ? UNWEIGHTED : UNWEIGHTED;
		const { visitOrder } = genericTraverse(graph, { discipline, start: 'A' });
		assert.equal(new Set(visitOrder).size, all.size, `${discipline} reaches all vertices`);
		assert.equal(visitOrder[0], 'A', `${discipline} starts at the source`);
	}
});

test('every discipline is registered with its algorithm name', () => {
	assert.deepEqual(DISCIPLINE_ORDER, ['fifo', 'lifo', 'min-dist', 'min-edge']);
	assert.equal(DISCIPLINES.fifo.algorithm, 'BFS');
	assert.equal(DISCIPLINES.lifo.algorithm, 'DFS');
	assert.equal(DISCIPLINES['min-dist'].algorithm, 'Dijkstra');
	assert.equal(DISCIPLINES['min-edge'].algorithm, 'Prim');
});

// ── Frame contract details ────────────────────────────────────────────────────

test('frontier snapshots are in extract order (next-out first)', () => {
	// FIFO: oldest first. After seeding A and extracting it, B then C are queued;
	// the frontier snapshot must list B before C (B leaves next).
	const { frames } = genericTraverse(UNWEIGHTED, { discipline: 'fifo', start: 'A' });
	const afterAddingC = frames.find(
		f => f.phase === 'consider-add' && f.edge?.to === 'C'
	);
	assert.ok(afterAddingC, 'a frame adds C to the frontier');
	const order = afterAddingC.frontier.map(x => x.id);
	assert.deepEqual(order, ['B', 'C'], 'FIFO frontier drains B before C');
});

test('min-dist frame keys are the tentative distances', () => {
	const { frames } = genericTraverse(WEIGHTED, { discipline: 'min-dist', start: 'A' });
	// After settling A, the frontier holds B:2 and D:3 (A's edges).
	const afterA = frames.find(f => f.phase === 'extract' && f.current === 'A');
	assert.ok(afterA);
	// The very next add frames key B by 2 and D by 3.
	const addB = frames.find(f => f.phase === 'consider-add' && f.edge?.to === 'B');
	const keyB = addB.frontier.find(x => x.id === 'B')?.key;
	assert.equal(keyB, 2, 'B is keyed by its tentative distance 2');
});

test('idleFrame is a conformant frame with the start seeded', () => {
	const frame = idleFrame(WEIGHTED, { discipline: 'min-edge', start: 'A' });
	assertFrameShape(frame);
	assert.equal(frame.phase, 'init');
	assert.equal(frame.visited.length, 0);
	assert.equal(frame.frontier[0]?.id, 'A', 'start is the only frontier member');
});

// ── Dispatch + purity ─────────────────────────────────────────────────────────

test('buildOneFrontierTrace dispatches by discipline id', () => {
	for (const discipline of DISCIPLINE_ORDER) {
		const { frames } = buildOneFrontierTrace(discipline, WEIGHTED, { start: 'A' });
		assert.ok(frames.length > 1, `${discipline} produces frames`);
	}
});

test('genericTraverse does not mutate the input graph', () => {
	const snapshot = JSON.stringify(WEIGHTED);
	DISCIPLINE_ORDER.forEach(discipline =>
		genericTraverse(WEIGHTED, { discipline, start: 'A' })
	);
	assert.equal(JSON.stringify(WEIGHTED), snapshot, 'graph untouched');
});

test('a missing / unknown start falls back to the first node deterministically', () => {
	const { visitOrder } = genericTraverse(UNWEIGHTED, {
		discipline: 'fifo',
		start: 'ZZZ',
	});
	assert.equal(visitOrder[0], 'A', 'falls back to the first node');
});
