import assert from 'node:assert/strict';
import test from 'node:test';

// Derivation guardrail for the Graph lesson's topological-sort PREDICT beat
// (scene `topo-next`). The exam bank re-derives every answer key from its
// generator so a key can never be hand-typed; an in-lesson predict beat must be
// just as un-fudgeable. So here we re-run the SAME generator (topoSort, Kahn's)
// on the SAME DAG the scene draws and re-derive the predicted "next vertex out"
// INDEPENDENTLY of graphScenes.js, then assert the authored check matches. If the
// scene ever typed its own answer or drifted from the DAG, this fails.

import { topoSort } from '../topoSort.js';
import { SCENES, TOPO_GRAPH, TOPO_ORDER, TOPO_SOURCE } from './graphScenes.js';

const sceneById = id => {
	const scene = SCENES.find(s => s.id === id);
	assert.ok(scene, `scene "${id}" not found`);
	return scene;
};

// Re-derive Kahn's state one turn past the source, here, without reading the
// scene's exported helpers: emit the unique in-degree-0 source, remove its
// out-edges, and read off (a) the next vertex Kahn's emits and (b) the working
// in-degrees the algorithm now sees. A second implementation of the removal step,
// so a bug in graphScenes.js's derivation is caught rather than mirrored.
const rederiveNextEmission = () => {
	const ids = TOPO_GRAPH.nodes.map(n => n.id);
	const { order, indegree } = topoSort(ids, TOPO_GRAPH.edges);

	// The source is the unique in-degree-0 vertex; confirm there is exactly one so
	// "the next vertex" is unambiguous for this DAG.
	const sources = ids.filter(id => indegree[id] === 0);
	assert.equal(sources.length, 1, 'DAG must have exactly one source');
	const source = sources[0];

	// The next emission is the second element of the real Kahn order.
	const next = order[1];

	// The working in-degrees after the source's out-edges are deleted.
	const after = { ...indegree };
	TOPO_GRAPH.edges.forEach(({ from, to }) => {
		if (from === source) after[to] -= 1;
	});

	return { source, next, indegreeAfterSource: after };
};

test('topo-next: the predicted next vertex re-derives from Kahn’s on the DAG', () => {
	const scene = sceneById('topo-next');
	const { source, next } = rederiveNextEmission();

	assert.equal(scene.check.kind, 'predict', 'topo-next must be a predict beat');
	assert.equal(
		scene.check.revealGate,
		true,
		'a predict-before-reveal beat must hold the stage reveal'
	);
	// The authored exports agree with the independently re-derived run.
	assert.equal(TOPO_SOURCE, source, 'exported source disagrees with Kahn’s');
	assert.equal(
		scene.check.answer,
		next,
		'authored answer is not the vertex Kahn’s emits after the source'
	);
	assert.equal(
		scene.check.answer,
		TOPO_ORDER[1],
		'the answer must be the 2nd vertex of the real topological order'
	);
	// The answer must be one of the offered options.
	assert.ok(
		scene.check.options.includes(scene.check.answer),
		'answer is not among the predict options'
	);
});

test('topo-next: every distractor is keyed and its misconception matches the in-degrees', () => {
	const scene = sceneById('topo-next');
	const { next, indegreeAfterSource } = rederiveNextEmission();
	const { options, misconceptions, answer } = scene.check;

	const distractors = options.map(String).filter(o => o !== String(answer));
	const keys = misconceptions ? Object.keys(misconceptions) : [];

	// No orphan keys (they would never render) and no missing distractor lines —
	// the same coverage bar misconceptionCoverage.test.js enforces.
	assert.deepEqual(
		keys.filter(k => !distractors.includes(k)),
		[],
		'misconception key(s) match no option'
	);
	assert.deepEqual(
		distractors.filter(d => !keys.includes(d)),
		[],
		'a wrong option is missing its misconception line'
	);

	// The line for each distractor must reflect the TRUE after-source in-degree:
	// a still-blocked vertex (in-degree > 0) is named as blocked; a tie vertex
	// (in-degree 0, but loses the smallest-id tie-break) is named as a tie.
	distractors.forEach(id => {
		const deg = indegreeAfterSource[id];
		const line = misconceptions[id];
		assert.ok(line, `no misconception for ${id}`);
		if (deg > 0) {
			assert.ok(
				line.includes(`in-degree ${deg}`),
				`${id}'s line should quote its real in-degree ${deg}: "${line}"`
			);
		} else {
			// A ready-but-loses-the-tie vertex: the line should name the winner.
			assert.ok(
				line.includes(next),
				`${id} is free but loses the tie to ${next}; its line should say so: "${line}"`
			);
		}
	});
});
