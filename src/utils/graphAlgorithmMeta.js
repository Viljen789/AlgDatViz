export const GRAPH_ALGORITHM_META = {
	bfs: {
		category: 'Traversal',
		motionPhrase: 'wave outward, layer by layer',
		complexity: 'O(V + E)',
	},
	dfs: {
		category: 'Traversal',
		motionPhrase: 'follow one path, retreat on dead end',
		complexity: 'O(V + E)',
	},
	dijkstra: {
		category: 'Shortest path',
		motionPhrase: 'settle the closest, relax the rest',
		complexity: 'O((V + E) log V)',
	},
	kruskal: {
		category: 'Spanning tree',
		motionPhrase: 'cheapest edge first, never a cycle',
		complexity: 'O(E log E)',
	},
	prim: {
		category: 'Spanning tree',
		motionPhrase: 'grow from one, take the shortest exit',
		complexity: 'O(E log V)',
	},
	topo: {
		category: 'Ordering',
		motionPhrase: 'remove no-prereq, repeat until empty',
		complexity: 'O(V + E)',
	},
	maxflow: {
		category: 'Flow',
		motionPhrase: 'augmenting path, send the bottleneck',
		complexity: 'O(VE²)',
	},
};

export const GRAPH_ALGORITHM_ORDER = [
	'bfs',
	'dfs',
	'dijkstra',
	'kruskal',
	'prim',
	'topo',
	'maxflow',
];

export const GRAPH_CATEGORY_ORDER = [
	'Traversal',
	'Shortest path',
	'Spanning tree',
	'Ordering',
	'Flow',
];
