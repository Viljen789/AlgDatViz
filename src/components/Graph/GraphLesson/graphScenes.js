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

// BFS from A, neighbours visited in alphabetical order:
//   A → B → C → D → E → F  (layer by layer)
export const BFS_ORDER = ['A', 'B', 'C', 'D', 'E', 'F'];

// DFS from A, newest-first, neighbours pushed in alphabetical order so the
// alphabetically-later neighbour is popped first; with this graph the run is:
//   A → B → D → F → E → C
export const DFS_ORDER = ['A', 'B', 'D', 'F', 'E', 'C'];

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
];
