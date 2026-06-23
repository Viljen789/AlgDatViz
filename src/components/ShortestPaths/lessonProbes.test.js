import assert from 'node:assert/strict';
import test from 'node:test';

// Derivation guardrail for the two LESSON trace-step probes, the in-lesson twins
// of the exam's SP-SSSP / SP-BFS probes. The exam bank re-derives every probe answer
// from its generator (examSets.test.js) so a probe can never be hand-typed; a lesson
// probe must be just as un-fudgeable. So here we re-run the SAME generator on the
// SAME graph the scene used and re-derive both the frozen frame and the next-decision
// answer INDEPENDENTLY of data/traceProbes.js (a second read-off implementation, so a
// bug in the shared helper is caught), then deep-equal them against the authored
// scene check. If a scene ever drew its own picture or typed its own "next", this
// fails, exactly like the bank's guardrail.

import { SCENES as SSSP_SCENES } from './scenes.js';
import { SHARED_GRAPH, SHARED_SOURCE } from './ssspMeta.js';
import { dijkstraTrace } from './relaxTrace.js';
import { SCENES as GRAPH_SCENES } from '../Graph/GraphLesson/graphScenes.js';
import { LESSON_GRAPH } from '../Graph/GraphLesson/graphScenes.js';
import { genericTraverse } from '../Graph/oneFrontier.js';

// Independent re-derivation: find the decision frames ourselves, freeze the one just
// before the probed decision, and read the next decision off the frame stream.
// `ordinal` is 1-based among decision frames AFTER the first (the bank's convention).
const rederiveProbe = (frames, { phase, field, ordinal }) => {
	const decisions = [];
	frames.forEach((f, i) => {
		if (f.phase === phase) decisions.push(i);
	});
	const decisionIndex = decisions[ordinal];
	if (decisionIndex === undefined || decisionIndex < 1) return null;
	return {
		frozen: frames[decisionIndex - 1],
		answer: frames[decisionIndex][field],
	};
};

// The undecided (option) set, re-derived: the not-yet-decided vertices at the frozen
// beat, sorted, with the answer guaranteed present. Mirrors traceProbes.js's
// undecidedOptions, independently, so the option set can only be the honest one.
const rederiveOptions = (frozen, allIds, decidedField, answer) => {
	const done = new Set(frozen[decidedField] || []);
	const remaining = allIds.filter(id => !done.has(id)).sort();
	if (!remaining.includes(answer)) remaining.push(answer);
	return remaining.sort();
};

const sceneCheckById = (scenes, id) => {
	const scene = scenes.find(s => s.id === id);
	assert.ok(scene, `scene "${id}" not found`);
	assert.equal(
		scene.check.kind,
		'stepProbe',
		`scene "${id}" is not a stepProbe`
	);
	return scene.check;
};

// A stepProbe's options + answer are a "which option next?" question; every wrong
// option must carry a misconception line, and no key may be an orphan (matching no
// option). Mirrors misconceptionCoverage.test.js, applied to stepProbe checks (which
// that suite skips), so the lesson probes are held to the same coverage bar.
const assertMisconceptionCoverage = check => {
	const distractors = check.options
		.map(String)
		.filter(option => option !== String(check.answer));
	const keys = check.misconceptions ? Object.keys(check.misconceptions) : [];
	assert.deepEqual(
		keys.filter(key => !distractors.includes(key)),
		[],
		'misconception key(s) match no option (would never render)'
	);
	assert.deepEqual(
		distractors.filter(distractor => !keys.includes(distractor)),
		[],
		'a wrong option is missing its misconception line'
	);
};

test('ShortestPaths dijkstra-probe: frozen frame, answer, and options re-derive from dijkstraTrace', () => {
	const check = sceneCheckById(SSSP_SCENES, 'dijkstra-probe');
	const ids = SHARED_GRAPH.nodes.map(n => n.id).sort();
	const run = dijkstraTrace(SHARED_GRAPH, { source: SHARED_SOURCE });

	// ordinal 2 = the 3rd settle (skips the trivial source-then-nearest opening),
	// the same ordinal the scene authored.
	const expected = rederiveProbe(run.frames, {
		phase: 'settle',
		field: 'active',
		ordinal: 2,
	});
	assert.ok(expected, 're-derivation found no Dijkstra probe frame');

	// The depicted state is the generator's real frame, not a sketch.
	assert.deepEqual(
		check.frame,
		expected.frozen,
		'authored frozen frame is not the generator frame just before the probed settle'
	);
	// The graded answer is the algorithm's real next settle.
	assert.equal(
		check.answer,
		expected.answer,
		'authored answer is not the next vertex Dijkstra settles'
	);
	// The options are exactly the unsettled vertices at the frozen beat.
	assert.deepEqual(
		check.options,
		rederiveOptions(expected.frozen, ids, 'settled', expected.answer),
		'authored options are not the unsettled vertices at the frozen beat'
	);
	assert.ok(
		check.options.includes(check.answer),
		'answer is not among the probe options'
	);
	// The view names the renderer the host implements for this probe family.
	assert.equal(check.view.kind, 'dijkstra-settle');
	assertMisconceptionCoverage(check);
});

test('Graph bfs-probe: frozen frame, answer, and options re-derive from genericTraverse', () => {
	const check = sceneCheckById(GRAPH_SCENES, 'bfs-probe');
	const ids = LESSON_GRAPH.nodes.map(n => n.id).sort();
	const run = genericTraverse(LESSON_GRAPH, { discipline: 'fifo', start: 'A' });

	// ordinal 1 = the 2nd dequeue (the queue already holds >1 vertex, so the FIFO
	// front is non-trivial), the same ordinal the scene authored.
	const expected = rederiveProbe(run.frames, {
		phase: 'extract',
		field: 'current',
		ordinal: 1,
	});
	assert.ok(expected, 're-derivation found no BFS probe frame');

	assert.deepEqual(
		check.frame,
		expected.frozen,
		'authored frozen frame is not the generator frame just before the probed dequeue'
	);
	assert.equal(
		check.answer,
		expected.answer,
		'authored answer is not the next vertex BFS dequeues'
	);
	assert.deepEqual(
		check.options,
		rederiveOptions(expected.frozen, ids, 'visited', expected.answer),
		'authored options are not the undiscovered/waiting vertices at the frozen beat'
	);
	assert.ok(
		check.options.includes(check.answer),
		'answer is not among the probe options'
	);
	assert.equal(check.view.kind, 'bfs-dequeue');
	assertMisconceptionCoverage(check);
});
