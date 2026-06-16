// traceProbes.test.js — the freeze-frame contract for trace-step exam probes.
//
// These lock the honesty guarantees of data/traceProbes.js against the REAL trace
// generators: the frozen frame is the one just BEFORE the probed decision (so the
// state shown is what the algorithm decides from), the answer is the NEXT decision
// the generator makes, and the options are the still-undecided vertices. If any of
// those slips, a probe stops being honest — these catch it independently of the
// exam bank and its guardrail.

import test from 'node:test';
import assert from 'node:assert/strict';

import { dijkstraTrace } from '../components/ShortestPaths/relaxTrace.js';
import { genericTraverse } from '../components/Graph/oneFrontier.js';
import {
	decisionFrameIndices,
	buildTraceProbe,
	dijkstraSettleProbe,
	bfsDequeueProbe,
} from './traceProbes.js';

// A small directed non-negative graph with a single-valued settle order:
// S(0) → B(1) → A(3, via B) → D(7) → C(8). So Dijkstra settles S, B, A, D, C.
const DIJKSTRA_GRAPH = {
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
const DIJKSTRA_IDS = ['S', 'A', 'B', 'C', 'D'];

// An undirected graph; BFS from A (alphabetical) visits A,B,C,D,E,F.
const BFS_GRAPH = {
	nodes: ['A', 'B', 'C', 'D', 'E', 'F'].map(id => ({ id })),
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
const BFS_IDS = ['A', 'B', 'C', 'D', 'E', 'F'];

test('decisionFrameIndices finds every frame of the requested phase', () => {
	const run = dijkstraTrace(DIJKSTRA_GRAPH, { source: 'S' });
	const settles = decisionFrameIndices(run.frames, ['settle']);
	// Five vertices settle, so five settle frames, each carrying the settled vertex.
	assert.equal(settles.length, 5);
	assert.deepEqual(
		settles.map(i => run.frames[i].active),
		['S', 'B', 'A', 'D', 'C']
	);
});

test('buildTraceProbe freezes the frame BEFORE the probed decision and reads the next decision', () => {
	const run = dijkstraTrace(DIJKSTRA_GRAPH, { source: 'S' });
	const settles = decisionFrameIndices(run.frames, ['settle']);
	// ordinal 2 ⇒ the 3rd settle overall (settles[2], which settles A).
	const probe = buildTraceProbe(run.frames, {
		phases: ['settle'],
		decisionField: 'active',
		ordinal: 2,
	});
	assert.equal(probe.decisionIndex, settles[2]);
	assert.equal(
		probe.freezeIndex,
		settles[2] - 1,
		'frozen frame is decision − 1'
	);
	assert.equal(probe.frozen, run.frames[settles[2] - 1]);
	assert.equal(probe.answer, 'A', 'answer is the next settled vertex');
});

test('buildTraceProbe returns null when the trace has too few decisions', () => {
	const run = dijkstraTrace(DIJKSTRA_GRAPH, { source: 'S' });
	// Only five settles exist (ordinals 0..4); ordinal 5 has no decision frame.
	assert.equal(
		buildTraceProbe(run.frames, {
			phases: ['settle'],
			decisionField: 'active',
			ordinal: 5,
		}),
		null
	);
});

test('dijkstraSettleProbe: the frozen dist already reflects the prior relaxations (honest state)', () => {
	const run = dijkstraTrace(DIJKSTRA_GRAPH, { source: 'S' });
	// ordinal 2 freezes just before A settles. By then B is settled and B→A has
	// relaxed A down to 3 — so the depicted dist[A] must be 3, not the stale 4.
	const probe = dijkstraSettleProbe(run, DIJKSTRA_IDS, 2);
	assert.equal(probe.answer, 'A');
	assert.deepEqual(probe.frozen.settled, ['B', 'S']);
	assert.equal(probe.frozen.dist.A, 3, 'frozen dist reflects B→A relaxation');
	assert.equal(probe.frozen.dist.D, 7);
	// Options are exactly the unsettled vertices, with the answer present.
	assert.deepEqual(probe.options, ['A', 'C', 'D']);
	assert.ok(probe.options.includes(probe.answer));
});

test('dijkstraSettleProbe: the next ordinal settles the next-smallest vertex', () => {
	const run = dijkstraTrace(DIJKSTRA_GRAPH, { source: 'S' });
	const probe = dijkstraSettleProbe(run, DIJKSTRA_IDS, 3);
	// After S,B,A settle (dist C=8, D=7), the smallest unsettled is D.
	assert.equal(probe.answer, 'D');
	assert.deepEqual(probe.options, ['C', 'D']);
});

test('bfsDequeueProbe: the answer is the FRONT of the frozen FIFO queue', () => {
	const run = genericTraverse(BFS_GRAPH, { discipline: 'fifo', start: 'A' });
	// ordinal 1 freezes just before the 2nd extract. The queue then holds [B, C]
	// (A’s neighbours), and FIFO dequeues the front, B.
	const probe = bfsDequeueProbe(run, BFS_IDS, 1);
	assert.equal(probe.answer, 'B');
	assert.deepEqual(
		probe.frozen.frontier.map(x => x.id),
		['B', 'C'],
		'frozen frontier is the real queue'
	);
	assert.equal(
		probe.frozen.frontier[0].id,
		probe.answer,
		'answer is the queue front'
	);
	assert.deepEqual(probe.frozen.visited, ['A']);
	// Options are the not-yet-visited vertices, answer present.
	assert.ok(probe.options.includes('B'));
	assert.ok(!probe.options.includes('A'), 'a visited vertex is not an option');
});

test('bfsDequeueProbe: a later ordinal tracks the queue as it advances', () => {
	const run = genericTraverse(BFS_GRAPH, { discipline: 'fifo', start: 'A' });
	const probe = bfsDequeueProbe(run, BFS_IDS, 2);
	// After A then B are dequeued, the queue is [C, D]; the front C leaves next.
	assert.equal(probe.answer, 'C');
	assert.deepEqual(
		probe.frozen.frontier.map(x => x.id),
		['C', 'D']
	);
	assert.deepEqual(probe.frozen.visited, ['A', 'B']);
});

test('probes never invent state: the frozen frame is a frame object FROM the run', () => {
	const dj = dijkstraTrace(DIJKSTRA_GRAPH, { source: 'S' });
	const probe = dijkstraSettleProbe(dj, DIJKSTRA_IDS, 2);
	assert.ok(
		dj.frames.includes(probe.frozen),
		'the frozen frame is, by reference, one of the generator’s own frames'
	);
});
