// The scrolly scenes that build graph intuition before the playground takes
// over. They walk from "what is a graph" → the two representations → how a
// traversal's frontier decides visit order (BFS layers vs DFS depth).
//
// Each scene carries a `check` — a small comprehension question answered before
// scrolling on. Wrong answers are never punished: the explanation reveals
// regardless of correctness, so every attempt is a teaching moment.
//
// The stage (GraphStage) reads `activeScene` and renders a matching view of the
// SAME small graph defined below, so the prose and the picture stay in lockstep.

import { createGraphAlgorithmSteps } from '../../../utils/graphAlgorithms.js';

// A compact 6-node teaching graph. Positions are chosen so the BFS layers from
// A read cleanly left-to-right: layer 0 = A, layer 1 = {B, C}, layer 2 = {D, E},
// layer 3 = {F}. Adjacency is sorted alphabetically, which fixes a deterministic
// visit order for both BFS and DFS.
export const LESSON_GRAPH = {
	nodes: [
		{ id: 'A', label: 'A', x: 60, y: 110 },
		{ id: 'B', label: 'B', x: 170, y: 50 },
		{ id: 'C', label: 'C', x: 170, y: 170 },
		{ id: 'D', label: 'D', x: 290, y: 50 },
		{ id: 'E', label: 'E', x: 290, y: 170 },
		{ id: 'F', label: 'F', x: 400, y: 110 },
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

// Derive the true visit order straight from the algorithm's step output, so the
// retrieval check below is graded against what BFS/DFS actually do — nothing is
// hand-fabricated. We read the first time each node becomes "active" across the
// real steps (createGraphAlgorithmSteps from utils/graphAlgorithms.js).
const visitOrderFromSteps = algorithmId => {
	const steps = createGraphAlgorithmSteps(LESSON_GRAPH, algorithmId, {
		startNodeId: 'A',
	});
	const order = [];
	const seen = new Set();
	steps.forEach(step => {
		// A node is "visited" the first time it appears in the visited set.
		(step.visitedNodes || []).forEach(id => {
			if (!seen.has(id)) {
				seen.add(id);
				order.push(id);
			}
		});
	});
	return order;
};

// BFS from A, neighbours visited in alphabetical order:
//   A → B → C → D → E → F  (layer by layer)
export const BFS_ORDER = visitOrderFromSteps('bfs');

// DFS from A, newest-first, neighbours pushed in alphabetical order so the
// alphabetically-later neighbour is popped first; with this graph the run is:
//   A → B → D → F → E → C
export const DFS_ORDER = visitOrderFromSteps('dfs');

export const SCENES = [
	{
		id: 'nodes-edges',
		eyebrow: 'Setup',
		title: 'A graph is just nodes joined by edges.',
		body: 'Six nodes, six edges. No order, no root, no rows — only what connects to what. Almost every relationship in computing is a graph hiding in plain sight.',
		check: {
			kind: 'choice',
			prompt: 'How many neighbours does node A have in this graph?',
			options: [1, 2, 3, 6],
			answer: 2,
			explanation:
				'A connects to B and C, so it has degree 2. A node’s neighbours are exactly the nodes one edge away — that adjacency is the only thing every graph algorithm ever asks about.',
		},
	},
	{
		id: 'representations',
		eyebrow: 'Representation',
		title: 'Store it as a list, or as a matrix.',
		body: 'An adjacency list keeps, per node, just its neighbours — compact when edges are sparse. An adjacency matrix marks every possible pair with a 0 or 1 — instant lookups, but n² cells whether or not the edges exist.',
		check: {
			kind: 'choice',
			prompt:
				'For a graph with few edges (sparse), which representation usually wastes the least memory?',
			options: ['Adjacency list', 'Adjacency matrix', 'Always equal', 'Neither'],
			answer: 'Adjacency list',
			explanation:
				'A list stores only the edges that exist — O(V + E) space. A matrix always reserves V² cells, so a sparse graph leaves most of them at 0. Matrices win only when the graph is dense or you need O(1) “is there an edge?” checks.',
		},
	},
	{
		id: 'frontier',
		eyebrow: 'Traversal',
		title: 'A traversal keeps a frontier of what to explore next.',
		body: 'Start at A and mark it. The frontier is the set of nodes waiting their turn. Which one you take next is the only real choice — and that single decision is the whole difference between BFS and DFS.',
		check: {
			kind: 'choice',
			prompt:
				'A traversal has started at A and marked it. What does the frontier hold next?',
			options: ['A', 'B and C', 'D and E', 'Every node'],
			answer: 'B and C',
			explanation:
				'After A is marked, its unvisited neighbours B and C enter the frontier. They are the only nodes one edge away, so they are the candidates for the next visit — whichever order you pull them in.',
		},
	},
	{
		id: 'bfs',
		eyebrow: 'Breadth-first',
		title: 'BFS uses a queue — oldest out first — so it spreads in layers.',
		body: 'A queue hands back the node that has waited longest. Everything at distance 1 is dequeued before anything at distance 2, so BFS fans outward one ring at a time. That layer order is exactly why BFS finds shortest unweighted paths.',
		check: {
			kind: 'choice',
			prompt:
				'BFS from A has visited A, then B, then C. With a queue (alphabetical neighbours), which node does it visit next?',
			options: ['D', 'E', 'F', 'A'],
			answer: 'D',
			explanation:
				'B was queued before C, so B is dequeued first; its unvisited neighbour D enters the queue ahead of C’s neighbour E. The queue preserves arrival order, so the visit sequence is A, B, C, D, E, F — strictly by distance from A.',
		},
	},
	{
		id: 'bfs-order',
		eyebrow: 'Recall',
		title: 'Now you place the order.',
		body: 'You have seen the queue spread A outward in layers. Reconstruct it yourself: arrange the six nodes into the exact sequence BFS visits them, starting from A with neighbours taken alphabetically.',
		check: {
			kind: 'order',
			prompt:
				'Drag the nodes into the order BFS visits them, starting at A (alphabetical neighbours).',
			// `items` is the shuffled pool the learner reorders; `answer` is the
			// true BFS visit order, derived above from the real algorithm steps.
			items: ['C', 'A', 'E', 'B', 'F', 'D'],
			answer: BFS_ORDER,
			explanation:
				'BFS pulls nodes from a FIFO queue, so it finishes an entire distance layer before the next one: A (layer 0), then B and C (layer 1), then D and E (layer 2), then F (layer 3). The sequence is A, B, C, D, E, F — strictly by distance from the start.',
		},
	},
	{
		id: 'dfs',
		eyebrow: 'Depth-first',
		title: 'DFS uses a stack — newest out first — so it plunges deep.',
		body: 'A stack hands back the node added most recently. DFS commits to one branch until it dead-ends, then backtracks to the last fork. It does not measure distance — it reveals reachability, components, and cycles.',
		check: {
			kind: 'choice',
			prompt:
				'Swap the queue for a stack. Starting at A → B, which node does DFS dive to before it ever touches C?',
			options: ['C', 'D', 'E', 'It visits C next'],
			answer: 'D',
			explanation:
				'A stack returns the newest node, so after pushing B’s neighbours DFS dives into D, then F, then back up to E — exploring B’s whole branch before it ever returns to C. Same graph, same start, completely different order: the data structure is the algorithm.',
		},
	},
	{
		id: 'one-frontier',
		eyebrow: 'The unifying idea',
		title: 'One loop, one frontier — swap its discipline, change the algorithm.',
		body: 'BFS and DFS were the same loop with a different frontier. Push that further: key the frontier by tentative distance and the same loop becomes Dijkstra; key it by the lightest crossing edge and it becomes Prim’s MST. The only line that ever changes is extract() — which vertex leaves the frontier next. The interactive below the playground runs all four from one loop.',
		check: {
			kind: 'classify',
			prompt:
				'Match each frontier discipline to the algorithm the one loop becomes.',
			items: [
				{ id: 'fifo', label: 'FIFO queue (oldest out)' },
				{ id: 'lifo', label: 'LIFO stack (newest out)' },
				{ id: 'mindist', label: 'min priority queue keyed by distance' },
				{ id: 'minedge', label: 'min priority queue keyed by crossing-edge weight' },
			],
			categories: [
				{ id: 'bfs', label: 'BFS' },
				{ id: 'dfs', label: 'DFS' },
				{ id: 'dijkstra', label: 'Dijkstra' },
				{ id: 'prim', label: 'Prim (MST)' },
			],
			answer: {
				fifo: 'bfs',
				lifo: 'dfs',
				mindist: 'dijkstra',
				minedge: 'prim',
			},
			explanation:
				'All four are one generic traversal: init the frontier with the start, then repeatedly extract a vertex, settle it, and offer its neighbours back to the frontier. Only extract() differs — FIFO → BFS, LIFO → DFS, min-distance → Dijkstra, min-edge → Prim. The frontier discipline is the algorithm.',
		},
	},
];

// The collapsible cheat-sheet shown in the hero (TopicTemplate `cheatSheet`).
// One key idea, then the two pairs students actually mix up: the storage choice
// (list vs matrix) and the traversal choice (BFS vs DFS). Runtimes are the same
// notation students must recall on the exam.
export const CHEAT_SHEET = {
	keyIdea:
		'A graph is just things and the links between them. The whole craft is choosing what to explore next. One generic loop with a swappable frontier discipline becomes four algorithms: FIFO queue → BFS, LIFO stack → DFS, min-distance PQ → Dijkstra, min-edge PQ → Prim. Only extract() — which vertex leaves the frontier next — ever changes.',
	sections: [
		{
			title: 'Representation',
			items: [
				{
					term: 'Adjacency list',
					def: 'Per node, store only its neighbours. O(V + E) space — compact for sparse graphs. Listing a node’s neighbours is O(degree).',
				},
				{
					term: 'Adjacency matrix',
					def: 'A V×V grid marking every possible pair. O(V²) space whether or not edges exist, but O(1) “is there an edge u–v?” lookups.',
				},
				{
					term: 'Which to pick',
					def: 'List for sparse graphs (E ≪ V²); matrix for dense graphs or when you need constant-time edge queries.',
				},
			],
		},
		{
			title: 'Traversal',
			items: [
				{
					term: 'BFS — queue (FIFO)',
					def: 'Oldest out first, so it fans out in layers. Finds shortest paths in unweighted graphs. O(V + E) time, O(V) space.',
				},
				{
					term: 'DFS — stack / recursion (LIFO)',
					def: 'Newest out first, so it plunges down one branch then backtracks. Reveals reachability, components, cycles, and edge types. O(V + E) time, O(V) space.',
				},
				{
					term: 'Both are O(V + E)',
					def: 'Each vertex is processed once and each edge inspected once. The frontier (queue or stack) holds up to V nodes.',
				},
			],
		},
		{
			title: 'One frontier, four algorithms',
			items: [
				{
					term: 'The generic loop',
					def: 'Seed the frontier with the start; while it is non-empty, extract a vertex, settle it, and offer each neighbour back to the frontier. Only extract() differs between algorithms.',
				},
				{
					term: 'FIFO queue → BFS',
					def: 'Extract the oldest waiting vertex. Spreads in layers → shortest unweighted paths.',
				},
				{
					term: 'LIFO stack → DFS',
					def: 'Extract the newest vertex. Plunges down one branch then backtracks.',
				},
				{
					term: 'min-distance PQ → Dijkstra',
					def: 'Extract the closest unsettled vertex (key = tentative distance). Non-negative weights only.',
				},
				{
					term: 'min-edge PQ → Prim',
					def: 'Extract the vertex across the lightest crossing edge (key = edge weight). Builds a minimum spanning tree.',
				},
			],
		},
	],
};
