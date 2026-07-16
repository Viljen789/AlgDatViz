// Lightweight scheduling index for surfaces that only need card identity.
//
// The full REVIEW_BANK includes prompts, explanations, options, generated
// frames, and every topic's scene module. Importing it from the home page made
// the first route download the whole course before it could show a due count.
// This manifest keeps only the two fields planSession/forecastDue read.
// reviewBank.test.js locks it 1:1 to the canonical derived bank so authoring a
// new review-safe lesson check cannot silently leave the dashboard behind.

const SCENE_IDS_BY_TOPIC = {
	foundations: [
		'cost',
		'counting',
		'drop',
		'notation',
		'race',
		'bisect',
		'invariant',
		'cases',
	],
	'stacks-queues': ['why', 'stack', 'queue', 'traversal'],
	'master-theorem': [
		'recurrence',
		'tree',
		'leaves',
		'levels',
		'sum-levels',
		'result',
		'compute-c',
		'classify-cases',
		'fine-print',
		'extended-case-2',
		'iteration-method',
	],
	sorting: ['split', 'base', 'merge', 'recurrence'],
	quicksort: [
		'partition',
		'place',
		'recurse',
		'pivot-choice',
		'recurrence',
		'select',
	],
	'linear-time-sorting': [
		'bound',
		'leaves',
		'counting',
		'radix',
		'stability',
		'bucket',
		'assumptions',
	],
	hashing: [
		'hash',
		'collision',
		'chaining',
		'load-factor',
		'resize',
		'worst-case',
	],
	trees: ['hierarchy', 'invariant', 'search', 'traversal'],
	heaps: [
		'heap-property',
		'parent-index',
		'sift',
		'extract',
		'build-vs-insert',
		'build-derivation',
	],
	graphs: ['representations', 'bfs-probe', 'one-frontier'],
	strategies: [
		'two-shapes',
		'greedy-trap',
		'dp-remembers',
		'greedy-safe',
		'two-properties',
		'choose-what',
	],
	mst: ['what-is-mst', 'cut-property', 'union-find', 'kruskal', 'prim'],
	'shortest-paths': [
		'relax',
		'optimal-substructure',
		'triangle',
		'bellman-ford',
		'dag-sp',
		'dijkstra-probe',
		'dijkstra-pq',
		'why-nonneg',
		'pred-subgraph',
	],
	apsp: [
		'all-pairs',
		'intermediates',
		'recurrence',
		'fill-across-k',
		'predecessor',
		'transitive-closure',
		'matrix-mult',
		'when',
		'slow-apsp',
	],
	'max-flow': [
		'flow-network',
		'residual',
		'augmenting-path',
		'ford-fulkerson',
		'edmonds-karp',
		'max-flow-min-cut',
		'integrality',
		'matching',
	],
	'np-completeness': [
		'the-line',
		'np-is-verify',
		'hard-vs-complete',
		'the-roster',
		'reduction-tool',
		'wrong-direction',
		'worked-reduction',
	],
};

export const REVIEW_MANIFEST = Object.entries(SCENE_IDS_BY_TOPIC).flatMap(
	([topicId, sceneIds]) =>
		sceneIds.map(sceneId => ({
			id: `${topicId}:${sceneId}`,
			topicId,
		}))
);
