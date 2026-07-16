import assert from 'node:assert/strict';
import test from 'node:test';
import { createGraphAlgorithmSteps } from './graphAlgorithms.js';
import {
	buildGraphAdjacency,
	buildGraphMatrix,
	getGraphEdgesForMode,
	parseAndUpdateGraph,
	updateGraphEdge,
} from './graphUtils.js';

const graphWithAntiparallelEdges = () => ({
	nodes: ['A', 'B', 'C'].map(id => ({ id, label: id })),
	edges: [
		{ from: 'A', to: 'B', weight: 2 },
		{ from: 'B', to: 'A', weight: 7 },
		{ from: 'B', to: 'C', weight: 3 },
	],
});

test('direction mode is a pure interpretation and never mutates stored edges', () => {
	const graph = graphWithAntiparallelEdges();
	const original = structuredClone(graph);

	assert.deepEqual(getGraphEdgesForMode(graph, false), [
		{ from: 'A', to: 'B', weight: 2 },
		{ from: 'B', to: 'C', weight: 3 },
	]);
	assert.deepEqual(getGraphEdgesForMode(graph, true), original.edges);
	assert.deepEqual(
		graph,
		original,
		'directed -> undirected -> directed is lossless'
	);
});

test('undirected list and matrix views mirror one stored edge symmetrically', () => {
	const graph = graphWithAntiparallelEdges();
	const adjacency = buildGraphAdjacency(graph, false);
	const { matrix, nodeMap } = buildGraphMatrix(graph, false, true);

	assert.deepEqual(adjacency.get('A'), [{ to: 'B', weight: 2 }]);
	assert.deepEqual(adjacency.get('B'), [
		{ to: 'A', weight: 2 },
		{ to: 'C', weight: 3 },
	]);
	assert.equal(matrix[nodeMap.get('A')][nodeMap.get('B')], 2);
	assert.equal(matrix[nodeMap.get('B')][nodeMap.get('A')], 2);
	assert.equal(matrix[nodeMap.get('B')][nodeMap.get('C')], 3);
	assert.equal(matrix[nodeMap.get('C')][nodeMap.get('B')], 3);
});

test('directed matrix edit changes A -> B without deleting B -> A', () => {
	const graph = graphWithAntiparallelEdges();
	const updated = updateGraphEdge(graph, {
		fromNodeId: 'A',
		toNodeId: 'B',
		value: 11,
		isWeighted: true,
		isDirected: true,
	});

	assert.deepEqual(updated.edges, [
		{ from: 'B', to: 'A', weight: 7 },
		{ from: 'B', to: 'C', weight: 3 },
		{ from: 'A', to: 'B', weight: 11 },
	]);
	assert.deepEqual(
		graph,
		graphWithAntiparallelEdges(),
		'input remains untouched'
	);
});

test('directed matrix deletion removes only the selected orientation', () => {
	const updated = updateGraphEdge(graphWithAntiparallelEdges(), {
		fromNodeId: 'A',
		toNodeId: 'B',
		value: 0,
		isWeighted: true,
		isDirected: true,
	});

	assert.ok(updated.edges.some(edge => edge.from === 'B' && edge.to === 'A'));
	assert.ok(!updated.edges.some(edge => edge.from === 'A' && edge.to === 'B'));
});

test('undirected matrix and list edits store each relationship once', () => {
	const matrixUpdated = updateGraphEdge(graphWithAntiparallelEdges(), {
		fromNodeId: 'A',
		toNodeId: 'B',
		value: 5,
		isWeighted: true,
		isDirected: false,
	});
	assert.deepEqual(
		matrixUpdated.edges.filter(
			edge =>
				(edge.from === 'A' && edge.to === 'B') ||
				(edge.from === 'B' && edge.to === 'A')
		),
		[{ from: 'A', to: 'B', weight: 5 }]
	);

	const listUpdated = parseAndUpdateGraph(
		'B:9, C:4',
		'A',
		graphWithAntiparallelEdges(),
		true,
		false
	);
	assert.deepEqual(listUpdated.edges, [
		{ from: 'B', to: 'C', weight: 3 },
		{ from: 'A', to: 'B', weight: 9 },
		{ from: 'A', to: 'C', weight: 4 },
	]);
});

test('directed list edits preserve incoming and antiparallel edges', () => {
	const updated = parseAndUpdateGraph(
		'C:6',
		'A',
		graphWithAntiparallelEdges(),
		true,
		true
	);

	assert.deepEqual(updated.edges, [
		{ from: 'B', to: 'A', weight: 7 },
		{ from: 'B', to: 'C', weight: 3 },
		{ from: 'A', to: 'C', weight: 6 },
	]);
});

test('the unchanged canonical graph supports both directed and undirected traces', () => {
	const graph = {
		nodes: ['A', 'B'].map(id => ({ id })),
		edges: [{ from: 'A', to: 'B', weight: 1 }],
	};
	const original = structuredClone(graph);
	const undirected = createGraphAlgorithmSteps(graph, 'bfs', {
		startNodeId: 'B',
		isDirected: false,
	});
	const directed = createGraphAlgorithmSteps(graph, 'bfs', {
		startNodeId: 'B',
		isDirected: true,
	});

	assert.deepEqual([...undirected.at(-1).visitedNodes].sort(), ['A', 'B']);
	assert.deepEqual(directed.at(-1).visitedNodes, ['B']);
	assert.deepEqual(graph, original);
});
