import assert from 'node:assert/strict';
import test from 'node:test';
import {
	createGraphAlgorithmSteps,
	GRAPH_ALGORITHMS,
} from './graphAlgorithms.js';

// Three SCCs whose condensation is a chain: {A,B,C} → {D,E} → {F,G}.
const GRAPH = {
	nodes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(id => ({ id, label: id })),
	edges: [
		{ from: 'A', to: 'B' },
		{ from: 'B', to: 'C' },
		{ from: 'C', to: 'A' },
		{ from: 'C', to: 'D' },
		{ from: 'D', to: 'E' },
		{ from: 'E', to: 'D' },
		{ from: 'E', to: 'F' },
		{ from: 'F', to: 'G' },
		{ from: 'G', to: 'F' },
	],
};

const finalComponentMap = steps => {
	for (let i = steps.length - 1; i >= 0; i--) {
		if (steps[i].componentMap && Object.keys(steps[i].componentMap).length) {
			return steps[i].componentMap;
		}
	}
	return {};
};

// Group node ids by their assigned component index → a set of member-sets.
const groupsOf = map => {
	const byComp = new Map();
	for (const [node, comp] of Object.entries(map)) {
		if (!byComp.has(comp)) byComp.set(comp, []);
		byComp.get(comp).push(node);
	}
	return [...byComp.values()].map(g => g.sort().join('')).sort();
};

test('scc is registered with pseudocode lines', () => {
	assert.ok(GRAPH_ALGORITHMS.scc, 'scc entry exists');
	assert.ok(Array.isArray(GRAPH_ALGORITHMS.scc.lines));
});

test('scc — every step line is a valid pseudocode index', () => {
	const steps = createGraphAlgorithmSteps(GRAPH, 'scc', {
		startNodeId: 'A',
		isDirected: true,
	});
	const n = GRAPH_ALGORITHMS.scc.lines.length;
	assert.ok(steps.length > 0, 'produces steps');
	for (const step of steps) {
		assert.ok(step.line >= 0 && step.line < n, `line ${step.line} valid`);
	}
});

test('scc — recovers the three components {A,B,C}, {D,E}, {F,G}', () => {
	const steps = createGraphAlgorithmSteps(GRAPH, 'scc', {
		startNodeId: 'A',
		isDirected: true,
	});
	const groups = groupsOf(finalComponentMap(steps));
	assert.deepEqual(groups, ['ABC', 'DE', 'FG']);
});

test('scc — every node is assigned exactly one component', () => {
	const steps = createGraphAlgorithmSteps(GRAPH, 'scc', {
		startNodeId: 'A',
		isDirected: true,
	});
	const map = finalComponentMap(steps);
	assert.equal(Object.keys(map).length, 7, 'all 7 nodes assigned');
});

test('scc — a single big cycle is one component', () => {
	const ring = {
		nodes: ['A', 'B', 'C', 'D'].map(id => ({ id, label: id })),
		edges: [
			{ from: 'A', to: 'B' },
			{ from: 'B', to: 'C' },
			{ from: 'C', to: 'D' },
			{ from: 'D', to: 'A' },
		],
	};
	const steps = createGraphAlgorithmSteps(ring, 'scc', {
		startNodeId: 'A',
		isDirected: true,
	});
	assert.deepEqual(groupsOf(finalComponentMap(steps)), ['ABCD']);
});

test('scc — a DAG has every node in its own component', () => {
	const dag = {
		nodes: ['A', 'B', 'C'].map(id => ({ id, label: id })),
		edges: [
			{ from: 'A', to: 'B' },
			{ from: 'B', to: 'C' },
		],
	};
	const steps = createGraphAlgorithmSteps(dag, 'scc', {
		startNodeId: 'A',
		isDirected: true,
	});
	assert.deepEqual(groupsOf(finalComponentMap(steps)), ['A', 'B', 'C']);
});
