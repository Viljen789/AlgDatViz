import assert from 'node:assert/strict';
import test from 'node:test';
import {
	GRAPH_ALGORITHMS,
	createGraphAlgorithmSteps,
	bfsLineState,
	dfsLineState,
	graphLineState,
} from './graphAlgorithms.js';

// The small teaching graph: A → {B, C}, B → D, C → E, D → F, E → F.
// Undirected, neighbours sorted alphabetically (matches buildAdjacency), so the
// runs are deterministic: BFS = A B C D E F, DFS = A B D F E C.
const GRAPH = {
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
		{ from: 'C', to: 'E' },
		{ from: 'D', to: 'F' },
		{ from: 'E', to: 'F' },
	],
};

const bfsSteps = () =>
	createGraphAlgorithmSteps(GRAPH, 'bfs', { startNodeId: 'A' });
const dfsSteps = () =>
	createGraphAlgorithmSteps(GRAPH, 'dfs', { startNodeId: 'A' });

// Validate a frame against THE FRAME CONTRACT (PlaybackEngine/PseudoState.jsx):
// a `line` that indexes into the algorithm's pseudocode, and a `state` array of
// labelled rows.
const assertConformant = (frame, lineCount) => {
	assert.equal(typeof frame.line, 'number');
	assert.ok(frame.line >= 0 && frame.line < lineCount, 'line in pseudocode range');
	assert.ok(Array.isArray(frame.state), 'state is an array');
	assert.ok(frame.state.length > 0, 'state has rows');
	for (const row of frame.state) {
		assert.equal(typeof row.label, 'string', 'row has a label');
		assert.ok('value' in row, 'row has a value');
	}
};

test('bfsLineState — every projected frame conforms to the contract', () => {
	const steps = bfsSteps();
	const lineCount = GRAPH_ALGORITHMS.bfs.lines.length;
	assert.ok(steps.length > 0);
	for (const step of steps) {
		assertConformant(bfsLineState(step), lineCount);
	}
});

test('dfsLineState — every projected frame conforms to the contract', () => {
	const steps = dfsSteps();
	const lineCount = GRAPH_ALGORITHMS.dfs.lines.length;
	assert.ok(steps.length > 0);
	for (const step of steps) {
		assertConformant(dfsLineState(step), lineCount);
	}
});

test('bfsLineState — line matches the step line and state mirrors the queue', () => {
	const steps = bfsSteps();
	// The seed step puts A in the queue at line 0.
	const seed = bfsLineState(steps[0]);
	assert.equal(seed.line, steps[0].line);
	const queueRow = seed.state.find(r => r.id === 'queue');
	assert.equal(queueRow.value, 'A', 'queue starts holding just the start node');
	const currentRow = seed.state.find(r => r.id === 'current');
	assert.equal(currentRow.value, 'A');
	assert.equal(currentRow.active, true, 'current node row is emphasized');
});

test('bfsLineState — final frame reports all nodes visited', () => {
	const steps = bfsSteps();
	const last = bfsLineState(steps.at(-1));
	const visited = last.state.find(r => r.id === 'visited');
	assert.equal(visited.value, GRAPH.nodes.length, 'BFS visits every node');
});

test('dfsLineState — state surfaces the stack (LIFO), not a queue', () => {
	const steps = dfsSteps();
	const seed = dfsLineState(steps[0]);
	const stackRow = seed.state.find(r => r.id === 'stack');
	assert.ok(stackRow, 'DFS exposes a stack row');
	assert.equal(stackRow.label, 'stack (LIFO)');
	assert.equal(stackRow.value, 'A', 'stack seeded with the start node');
	assert.equal(
		seed.state.find(r => r.id === 'queue'),
		undefined,
		'DFS does not present a queue row'
	);
});

test('graphLineState — dispatches to the right projector and is null otherwise', () => {
	const bfs = bfsSteps()[0];
	const dfs = dfsSteps()[0];
	assert.deepEqual(graphLineState('bfs', bfs), bfsLineState(bfs));
	assert.deepEqual(graphLineState('dfs', dfs), dfsLineState(dfs));
	// Algorithms without a projection fall back to null (plain pseudocode rail).
	assert.equal(graphLineState('dijkstra', bfs), null);
	assert.equal(graphLineState('kruskal', bfs), null);
});

test('graphLineState — handles a missing/empty step defensively', () => {
	const frame = graphLineState('bfs', undefined);
	assert.equal(frame.line, 0);
	assert.ok(Array.isArray(frame.state));
	const queue = frame.state.find(r => r.id === 'queue');
	assert.equal(queue.value, '∅', 'empty structure renders as ∅');
});
