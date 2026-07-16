import assert from 'node:assert/strict';
import test from 'node:test';
import { createGraphAlgorithmSteps } from '../../../utils/graphAlgorithms.js';
import {
	SCENES,
	SCC_COMPONENT_MAP,
	SCC_GRAPH,
	SCC_GROUPS,
	SCC_TARGET,
	SCC_TARGET_ANSWER,
} from './graphScenes.js';

const sceneById = id => {
	const scene = SCENES.find(candidate => candidate.id === id);
	assert.ok(scene, `scene "${id}" not found`);
	return scene;
};

const finalComponentMap = graph => {
	const steps = createGraphAlgorithmSteps(graph, 'scc', {
		startNodeId: graph.nodes[0]?.id,
		isDirected: true,
	});
	return (
		[...steps]
			.reverse()
			.find(
				step =>
					Object.keys(step.componentMap || {}).length === graph.nodes.length
			)?.componentMap || {}
	);
};

const groupsOf = componentMap => {
	const groups = new Map();
	Object.entries(componentMap).forEach(([nodeId, componentId]) => {
		if (!groups.has(componentId)) groups.set(componentId, []);
		groups.get(componentId).push(nodeId);
	});
	return [...groups.values()]
		.map(group => group.sort((a, b) => a.localeCompare(b)))
		.sort((a, b) => a[0].localeCompare(b[0]));
};

// Independent reachability oracle: this verifies the authored teaching graph's
// groups really are maximal mutually-reachable sets instead of trusting the SCC
// generator twice.
const reachableFrom = start => {
	const adjacency = new Map(SCC_GRAPH.nodes.map(node => [node.id, []]));
	SCC_GRAPH.edges.forEach(({ from, to }) => adjacency.get(from)?.push(to));
	const reached = new Set([start]);
	const queue = [start];
	while (queue.length) {
		const node = queue.shift();
		for (const neighbor of adjacency.get(node) || []) {
			if (reached.has(neighbor)) continue;
			reached.add(neighbor);
			queue.push(neighbor);
		}
	}
	return reached;
};

test('scc lesson derives the three displayed groups from the shared Kosaraju trace', () => {
	const rerunMap = finalComponentMap(SCC_GRAPH);
	const rerunGroups = groupsOf(rerunMap);

	assert.deepEqual(rerunMap, SCC_COMPONENT_MAP);
	assert.deepEqual(rerunGroups, [['A', 'B'], ['C', 'D'], ['E']]);
	assert.deepEqual(
		[...SCC_GROUPS].sort((a, b) => a[0].localeCompare(b[0])),
		rerunGroups
	);
});

test('every displayed SCC is mutually reachable, and different SCCs are not', () => {
	const ids = SCC_GRAPH.nodes.map(node => node.id);
	const reachability = Object.fromEntries(
		ids.map(id => [id, reachableFrom(id)])
	);

	for (const from of ids) {
		for (const to of ids) {
			const mutuallyReachable =
				reachability[from].has(to) && reachability[to].has(from);
			assert.equal(
				SCC_COMPONENT_MAP[from] === SCC_COMPONENT_MAP[to],
				mutuallyReachable,
				`${from} and ${to} component membership must match mutual reachability`
			);
		}
	}
});

test('scc lesson check answer and feedback stay tied to the derived target group', () => {
	const scene = sceneById('scc');
	const targetComponent = SCC_COMPONENT_MAP[SCC_TARGET];
	const targetMembers = Object.entries(SCC_COMPONENT_MAP)
		.filter(([, componentId]) => componentId === targetComponent)
		.map(([nodeId]) => nodeId)
		.sort((a, b) => a.localeCompare(b));
	const derivedAnswer = `{${targetMembers.join(', ')}}`;

	assert.equal(scene.check.kind, 'choice');
	assert.equal(
		scene.check.reviewSafe,
		false,
		'the check depends on the stage graph'
	);
	assert.equal(SCC_TARGET_ANSWER, derivedAnswer);
	assert.equal(scene.check.answer, derivedAnswer);
	assert.ok(scene.check.options.includes(derivedAnswer));

	const distractors = scene.check.options.filter(
		option => option !== scene.check.answer
	);
	assert.deepEqual(
		Object.keys(scene.check.misconceptions).sort(),
		distractors.sort(),
		'every SCC distractor has targeted feedback and no orphan key'
	);
	assert.match(scene.body, /finish order/i);
	assert.match(scene.body, /reverse every edge/i);
	assert.match(scene.body, /condensation graph/i);
});
