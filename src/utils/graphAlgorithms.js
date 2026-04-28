const INF = Number.POSITIVE_INFINITY;

export const GRAPH_ALGORITHMS = {
	bfs: {
		label: 'BFS',
		fullName: 'Breadth-first search',
		structure: 'Queue',
		accent: '#4f7cf8',
		bestFor: 'Shortest paths in unweighted graphs',
		category: 'Graph traversal',
		intuition:
			'BFS explores the graph in waves. The queue preserves layer order, so nodes reached earlier are never farther away in an unweighted graph.',
		strategy: [
			'Put the start node in a queue.',
			'Repeatedly remove the oldest queued node.',
			'Add each unvisited neighbor to the back of the queue.',
			'Record parents to reconstruct shortest unweighted paths.',
		],
		complexity: {
			time: { average: 'O(V + E)', worst: 'O(V + E)' },
			space: { worst: 'O(V)' },
			variables: [
				{ symbol: 'V', label: 'vertices' },
				{ symbol: 'E', label: 'edges' },
			],
			why: [
				'Each vertex is enqueued at most once.',
				'Each adjacency entry is inspected once, so vertices plus edges dominate.',
				'The queue and visited set can hold up to V vertices.',
			],
		},
		tradeoffs: {
			useWhen: [
				'You need shortest paths in an unweighted graph.',
				'You want to explore by distance from a start node.',
			],
			watchOut: [
				'Weights break the shortest-path guarantee.',
				'Wide graphs can make the queue large.',
			],
		},
		legend: [
			{ label: 'Queued frontier', color: 'var(--color-accent-blue)' },
			{ label: 'Visited', color: 'var(--color-accent-green)' },
			{ label: 'Target / active', color: 'var(--color-accent-red)' },
		],
		compareCards: [
			{
				label: 'BFS vs DFS',
				title: 'Queue vs stack',
				text: 'BFS fans out by distance; DFS commits to one path before backtracking.',
			},
			{
				label: 'BFS vs Dijkstra',
				title: 'Uniform costs only',
				text: 'BFS is Dijkstra with every edge weight treated as 1.',
			},
		],
		conceptChecks: [
			{
				question: 'Why does BFS find shortest unweighted paths?',
				answer:
					'The queue processes all nodes at distance d before any node at distance d + 1.',
			},
		],
		lines: [
			'visited = {start}; queue = [start]',
			'while queue is not empty:',
			'  current = queue.dequeue()',
			'  for each neighbor of current:',
			'    if neighbor is unvisited:',
			'      mark neighbor and enqueue it',
		],
	},
	dfs: {
		label: 'DFS',
		fullName: 'Depth-first search',
		structure: 'Stack',
		accent: '#c97af8',
		bestFor: 'Exploring components, cycles, and backtracking trees',
		category: 'Graph traversal',
		intuition:
			'DFS follows one branch as far as it can, then backs up to try alternatives. It is the graph version of exploring a maze by committing to a corridor.',
		strategy: [
			'Push the start node onto a stack.',
			'Pop the newest node to continue the current branch.',
			'Mark unvisited nodes as they are reached.',
			'Push neighbors so unexplored paths remain available.',
		],
		complexity: {
			time: { average: 'O(V + E)', worst: 'O(V + E)' },
			space: { worst: 'O(V)' },
			variables: [
				{ symbol: 'V', label: 'vertices' },
				{ symbol: 'E', label: 'edges' },
			],
			why: [
				'Every vertex is marked once.',
				'Every edge is considered from an adjacency list.',
				'The stack or recursion path can grow to V nodes.',
			],
		},
		tradeoffs: {
			useWhen: [
				'You need reachability, component discovery, cycle checks, or backtracking.',
				'Memory should follow path depth instead of graph width.',
			],
			watchOut: [
				'DFS does not guarantee shortest paths.',
				'Recursive DFS can overflow the call stack on very deep graphs.',
			],
		},
		legend: [
			{ label: 'Stack frontier', color: 'var(--color-accent-purple)' },
			{ label: 'Visited', color: 'var(--color-accent-green)' },
			{ label: 'Current path', color: 'var(--color-accent-orange)' },
		],
		compareCards: [
			{
				label: 'DFS vs BFS',
				title: 'Depth vs layers',
				text: 'DFS reveals structure and backtracking; BFS reveals distance layers.',
			},
		],
		conceptChecks: [
			{
				question: 'Why can DFS miss a shortest path first?',
				answer:
					'It follows the most recent branch deeply before trying other same-distance neighbors.',
			},
		],
		lines: [
			'stack = [start]',
			'while stack is not empty:',
			'  current = stack.pop()',
			'  if current is already visited: continue',
			'  mark current as visited',
			'  push unvisited neighbors',
		],
	},
	dijkstra: {
		label: 'Dijkstra',
		fullName: "Dijkstra's shortest path",
		structure: 'Priority queue',
		accent: '#f8a74f',
		bestFor: 'Shortest paths with non-negative weights',
		category: 'Shortest paths',
		intuition:
			'Dijkstra repeatedly settles the unsettled node with the smallest known distance. Non-negative weights make that greedy choice final.',
		strategy: [
			'Start with distance 0 for the source and infinity for all others.',
			'Use a priority queue ordered by current distance.',
			'Relax outgoing edges from the closest unsettled node.',
			'Stop when the target is settled or the queue is empty.',
		],
		complexity: {
			time: { average: 'O((V + E) log V)', worst: 'O((V + E) log V)' },
			space: { worst: 'O(V)' },
			variables: [
				{ symbol: 'V', label: 'vertices' },
				{ symbol: 'E', label: 'edges' },
			],
			why: [
				'Each edge can trigger a relaxation attempt.',
				'Priority queue pushes and removals cost log V.',
				'Distances, parents, and queue entries use vertex-scale memory.',
			],
		},
		tradeoffs: {
			useWhen: [
				'Edges have non-negative weights.',
				'You need shortest paths from one source.',
			],
			watchOut: [
				'Negative edges invalidate the settled-node guarantee.',
				'For unweighted graphs, BFS is simpler and cheaper.',
			],
		},
		legend: [
			{ label: 'Tentative frontier', color: 'var(--color-accent-orange)' },
			{ label: 'Settled node', color: 'var(--color-accent-green)' },
			{ label: 'Shortest-path edge', color: 'var(--color-accent-yellow)' },
		],
		compareCards: [
			{
				label: 'Dijkstra vs BFS',
				title: 'Weights change the frontier',
				text: 'Dijkstra uses a priority queue instead of a FIFO queue because edge costs differ.',
			},
		],
		conceptChecks: [
			{
				question: 'Why are negative weights a problem?',
				answer:
					'A later negative edge could make an already-settled distance smaller, breaking the greedy proof.',
			},
		],
		lines: [
			'distance[start] = 0; all others = infinity',
			'push start into the priority queue',
			'while priority queue is not empty:',
			'  current = node with smallest distance',
			'  for each edge current -> neighbor:',
			'    relax if distance can improve',
		],
	},
	kruskal: {
		label: 'Kruskal',
		fullName: "Kruskal's minimum spanning tree",
		structure: 'Sorted edges + union find',
		accent: '#38c9a0',
		bestFor: 'Building the cheapest network over all nodes',
		category: 'Minimum spanning tree',
		intuition:
			'Kruskal considers edges from cheapest to most expensive and accepts an edge only when it connects two separate components.',
		strategy: [
			'Sort all edges by weight.',
			'Start with each vertex as its own component.',
			'Accept an edge if it connects different components.',
			'Reject edges that would create a cycle.',
		],
		complexity: {
			time: { average: 'O(E log E)', worst: 'O(E log E)' },
			space: { worst: 'O(V)' },
			variables: [
				{ symbol: 'V', label: 'vertices' },
				{ symbol: 'E', label: 'edges' },
			],
			why: [
				'Sorting the edges dominates the running time.',
				'Union-find makes cycle checks almost constant after sorting.',
				'The component structure stores parent/rank data for vertices.',
			],
		},
		tradeoffs: {
			useWhen: [
				'You want an MST and edges are easy to sort globally.',
				'The graph is sparse or already edge-list shaped.',
			],
			watchOut: [
				'It builds a forest before becoming one tree.',
				'It ignores edge direction because spanning trees are undirected.',
			],
		},
		legend: [
			{ label: 'Candidate edge', color: 'var(--color-accent-blue)' },
			{ label: 'Accepted edge', color: 'var(--color-accent-green)' },
			{ label: 'Rejected cycle', color: 'var(--color-accent-red)' },
		],
		compareCards: [
			{
				label: 'Kruskal vs Prim',
				title: 'Global vs growing',
				text: 'Kruskal scans sorted global edges; Prim grows one connected tree from a start node.',
			},
		],
		conceptChecks: [
			{
				question: 'Why reject edges within the same component?',
				answer:
					'Those endpoints are already connected, so adding the edge would create a cycle.',
			},
		],
		lines: [
			'sort all edges by weight',
			'make each node its own component',
			'for each edge from cheapest to largest:',
			'  if endpoints are in different components:',
			'    accept edge and union components',
			'  otherwise reject edge to avoid a cycle',
		],
	},
	prim: {
		label: 'Prim',
		fullName: "Prim's minimum spanning tree",
		structure: 'Growing cut',
		accent: '#38c9a0',
		bestFor: 'Growing an MST from one starting node',
		category: 'Minimum spanning tree',
		intuition:
			'Prim grows one tree by repeatedly crossing the cheapest edge from visited nodes to unvisited nodes.',
		strategy: [
			'Start from one node.',
			'Track edges crossing from the tree to outside nodes.',
			'Choose the cheapest crossing edge.',
			'Add the new node and update the frontier.',
		],
		complexity: {
			time: { average: 'O(E log V)', worst: 'O(E log V)' },
			space: { worst: 'O(V + E)' },
			variables: [
				{ symbol: 'V', label: 'vertices' },
				{ symbol: 'E', label: 'edges' },
			],
			why: [
				'Each crossing edge can enter the priority queue.',
				'Queue operations cost log V.',
				'Visited nodes and candidate edges need extra storage.',
			],
		},
		tradeoffs: {
			useWhen: [
				'You want to grow an MST from a known starting point.',
				'The graph is connected and represented by adjacency lists.',
			],
			watchOut: [
				'Disconnected graphs produce a spanning forest, not one tree.',
				'Direction is ignored for MST intuition.',
			],
		},
		legend: [
			{ label: 'Tree node', color: 'var(--color-accent-green)' },
			{ label: 'Crossing edge', color: 'var(--color-accent-orange)' },
			{ label: 'Accepted edge', color: 'var(--color-accent-yellow)' },
		],
		compareCards: [
			{
				label: 'Prim vs Kruskal',
				title: 'One tree vs many components',
				text: 'Prim expands a single tree; Kruskal merges components from a sorted edge list.',
			},
		],
		conceptChecks: [
			{
				question: 'What is a crossing edge?',
				answer:
					'It connects one visited tree node to one unvisited node outside the tree.',
			},
		],
		lines: [
			'visited = {start}; tree = []',
			'while not all nodes are visited:',
			'  choose the cheapest crossing edge',
			'  add that edge to the tree',
			'  add the new node to visited',
			'  update the crossing-edge frontier',
		],
	},
	topo: {
		label: 'Topological',
		fullName: "Kahn's topological sort",
		structure: 'Indegree queue',
		accent: '#f86060',
		bestFor: 'Ordering dependencies in a directed acyclic graph',
		category: 'Dependency ordering',
		intuition:
			'Topological sort repeatedly removes work that has no remaining prerequisites.',
		strategy: [
			'Compute each node indegree.',
			'Queue nodes with indegree 0.',
			'Output a queued node and remove its outgoing edges.',
			'Queue neighbors whose indegree becomes 0.',
		],
		complexity: {
			time: { average: 'O(V + E)', worst: 'O(V + E)' },
			space: { worst: 'O(V)' },
			variables: [
				{ symbol: 'V', label: 'vertices' },
				{ symbol: 'E', label: 'edges' },
			],
			why: [
				'Every node enters the queue at most once.',
				'Every directed edge is removed once when its source is output.',
				'The indegree table and queue are vertex-sized.',
			],
		},
		tradeoffs: {
			useWhen: [
				'You need a valid order for prerequisites or dependencies.',
				'The graph is directed and acyclic.',
			],
			watchOut: [
				'Cycles mean no topological ordering exists.',
				'Undirected graphs do not have prerequisite direction.',
			],
		},
		legend: [
			{ label: 'Zero indegree', color: 'var(--color-accent-green)' },
			{ label: 'Output order', color: 'var(--color-accent-yellow)' },
			{ label: 'Blocked by dependency', color: 'var(--color-accent-red)' },
		],
		conceptChecks: [
			{
				question: 'How does Kahn detect a cycle?',
				answer:
					'If nodes remain but no node has indegree 0, the remaining nodes depend on each other cyclically.',
			},
		],
		lines: [
			'compute indegree for every node',
			'queue all nodes with indegree 0',
			'while queue is not empty:',
			'  remove a node and append it to the order',
			'  decrement indegree of outgoing neighbors',
			'  enqueue neighbors that become indegree 0',
		],
	},
	maxflow: {
		label: 'Max flow',
		fullName: 'Ford-Fulkerson max flow',
		structure: 'Residual network',
		accent: '#38c9a0',
		bestFor: 'Finding how much can move from a source to a sink',
		category: 'Network flow',
		intuition:
			'Max flow keeps finding usable source-to-sink paths and pushes as much extra flow as the tightest edge allows.',
		strategy: [
			'Start with zero flow.',
			'Find an augmenting path in the residual network.',
			'Push the path bottleneck amount of flow.',
			'Update forward and reverse residual capacities.',
		],
		complexity: {
			time: { average: 'O(E * max_flow)', worst: 'O(E * max_flow)' },
			space: { worst: 'O(V + E)' },
			variables: [
				{ symbol: 'V', label: 'vertices' },
				{ symbol: 'E', label: 'edges' },
				{ symbol: 'max_flow', label: 'total integer flow' },
			],
			why: [
				'Each augmenting path search scans edges in the residual graph.',
				'With integer capacities, Ford-Fulkerson may need one augmentation per unit of flow.',
				'The residual graph stores forward and reverse capacity information.',
			],
		},
		tradeoffs: {
			useWhen: [
				'You are modeling capacity from a source to a sink.',
				'Capacities are small enough for augmenting paths to be intuitive.',
			],
			watchOut: [
				'Path choice affects runtime.',
				'The model needs directed, weighted capacities to make sense.',
			],
		},
		legend: [
			{ label: 'Residual path', color: 'var(--color-accent-yellow)' },
			{ label: 'Bottleneck', color: 'var(--color-accent-orange)' },
			{ label: 'Saturated edge', color: 'var(--color-accent-red)' },
		],
		conceptChecks: [
			{
				question: 'Why add reverse residual edges?',
				answer:
					'They let later paths undo or reroute earlier flow choices when a better arrangement is found.',
			},
		],
		lines: [
			'flow on every edge starts at 0',
			'while a residual path source -> sink exists:',
			'  find the path bottleneck capacity',
			'  add bottleneck flow along the path',
			'  update forward and reverse residual edges',
			'return total flow leaving the source',
		],
	},
};

const sortNodeIds = ids => [...ids].sort((a, b) => a.localeCompare(b));

const edgeKey = (from, to, isDirected = false) => {
	if (isDirected || from === to) return `${from}->${to}`;
	return [from, to].sort().join('--');
};

const normalizeWeight = weight => {
	const value = Number(weight);
	return Number.isFinite(value) && value > 0 ? value : 1;
};

const formatDistance = value => (value === INF ? 'inf' : value);

const cloneDistances = distances =>
	Object.fromEntries(
		Object.entries(distances).map(([nodeId, value]) => [
			nodeId,
			formatDistance(value),
		])
	);

export const getUniqueEdges = (graph, isDirected = false) => {
	const seen = new Set();
	const unique = [];

	graph.edges.forEach(edge => {
		const key = edgeKey(edge.from, edge.to, isDirected);
		if (seen.has(key)) return;
		seen.add(key);
		unique.push({
			from: edge.from,
			to: edge.to,
			weight: normalizeWeight(edge.weight),
		});
	});

	return unique;
};

const buildAdjacency = (graph, isDirected) => {
	const adjacency = new Map(graph.nodes.map(node => [node.id, []]));
	const edges = getUniqueEdges(graph, isDirected);

	edges.forEach(edge => {
		adjacency.get(edge.from)?.push({
			to: edge.to,
			weight: edge.weight,
			from: edge.from,
		});

		if (!isDirected && edge.from !== edge.to) {
			adjacency.get(edge.to)?.push({
				to: edge.from,
				weight: edge.weight,
				from: edge.to,
			});
		}
	});

	adjacency.forEach(neighbors => {
		neighbors.sort((a, b) => a.to.localeCompare(b.to));
	});

	return adjacency;
};

const makeStep = step => ({
	title: '',
	description: '',
	line: 0,
	activeNodes: [],
	visitedNodes: [],
	queuedNodes: [],
	stackNodes: [],
	settledNodes: [],
	pathEdges: [],
	candidateEdges: [],
	rejectedEdges: [],
	structureLabel: '',
	structure: [],
	distances: null,
	order: [],
	mstWeight: null,
	flowMap: null,
	flowValue: null,
	bottleneck: null,
	insight: '',
	...step,
});

const asArray = set => sortNodeIds([...set]);

const getTreeEdgesFromParents = parents =>
	Object.entries(parents)
		.filter(([, parent]) => parent != null)
		.map(([to, from]) => ({ from, to }));

const maybeTargetCopy = targetNodeId => (targetNodeId ? [targetNodeId] : []);

const bfsSteps = (graph, options) => {
	const { startNodeId, targetNodeId, isDirected } = options;
	const adjacency = buildAdjacency(graph, isDirected);
	const visited = new Set([startNodeId]);
	const queue = [startNodeId];
	const parents = {};
	const steps = [
		makeStep({
			title: 'Seed the queue',
			description: `Start from ${startNodeId}. BFS visits nodes in layers, so every node entering the queue has the shortest unweighted distance known so far.`,
			line: 0,
			activeNodes: [startNodeId],
			queuedNodes: [...queue],
			visitedNodes: asArray(visited),
			structureLabel: 'Queue',
			structure: [...queue],
			insight:
				'Queue order is the reason BFS discovers nearest nodes before farther nodes.',
		}),
	];

	while (queue.length) {
		const current = queue.shift();
		steps.push(
			makeStep({
				title: `Dequeue ${current}`,
				description: `${current} leaves the front of the queue. Now inspect its outgoing neighbors.`,
				line: 2,
				activeNodes: [current, ...maybeTargetCopy(targetNodeId)],
				visitedNodes: asArray(visited),
				queuedNodes: [...queue],
				pathEdges: getTreeEdgesFromParents(parents),
				structureLabel: 'Queue',
				structure: [...queue],
				insight: 'Everything still in the queue is waiting at the same or next depth.',
			})
		);

		if (targetNodeId && current === targetNodeId) {
			steps.push(
				makeStep({
					title: `Found ${targetNodeId}`,
					description: `The target was dequeued, so BFS has reached it by a shortest unweighted path.`,
					line: 2,
					activeNodes: [current],
					visitedNodes: asArray(visited),
					pathEdges: getTreeEdgesFromParents(parents),
					structureLabel: 'Queue',
					structure: [...queue],
					insight: 'For weighted graphs, use Dijkstra instead of BFS.',
				})
			);
			break;
		}

		for (const neighbor of adjacency.get(current) || []) {
			const edge = { from: current, to: neighbor.to };
			if (!visited.has(neighbor.to)) {
				visited.add(neighbor.to);
				parents[neighbor.to] = current;
				queue.push(neighbor.to);
				steps.push(
					makeStep({
						title: `Discover ${neighbor.to}`,
						description: `${neighbor.to} was unvisited, so mark it and add it to the back of the queue.`,
						line: 5,
						activeNodes: [current, neighbor.to],
						visitedNodes: asArray(visited),
						queuedNodes: [...queue],
						candidateEdges: [edge],
						pathEdges: getTreeEdgesFromParents(parents),
						structureLabel: 'Queue',
						structure: [...queue],
						insight:
							'The highlighted edge becomes part of the BFS tree: first discovery wins.',
					})
				);
			} else {
				steps.push(
					makeStep({
						title: `Skip ${neighbor.to}`,
						description: `${neighbor.to} is already marked, so this edge cannot improve the BFS tree.`,
						line: 4,
						activeNodes: [current, neighbor.to],
						visitedNodes: asArray(visited),
						queuedNodes: [...queue],
						rejectedEdges: [edge],
						pathEdges: getTreeEdgesFromParents(parents),
						structureLabel: 'Queue',
						structure: [...queue],
						insight: 'Skipping marked nodes prevents infinite loops in cyclic graphs.',
					})
				);
			}
		}
	}

	steps.push(
		makeStep({
			title: 'Traversal complete',
			description: `BFS reached ${visited.size} of ${graph.nodes.length} nodes from ${startNodeId}.`,
			line: 1,
			visitedNodes: asArray(visited),
			pathEdges: getTreeEdgesFromParents(parents),
			structureLabel: 'Queue',
			structure: [],
			insight: 'Disconnected nodes need a new start node or an outer component loop.',
		})
	);

	return steps;
};

const dfsSteps = (graph, options) => {
	const { startNodeId, targetNodeId, isDirected } = options;
	const adjacency = buildAdjacency(graph, isDirected);
	const visited = new Set();
	const stack = [{ nodeId: startNodeId, parent: null }];
	const parents = {};
	const steps = [
		makeStep({
			title: 'Seed the stack',
			description: `Put ${startNodeId} on the stack. DFS follows one branch as far as it can before backing up.`,
			line: 0,
			activeNodes: [startNodeId],
			stackNodes: [startNodeId],
			structureLabel: 'Stack',
			structure: [startNodeId],
			insight: 'A stack gives DFS its deep, backtracking behavior.',
		}),
	];

	while (stack.length) {
		const frame = stack.pop();
		const current = frame.nodeId;

		steps.push(
			makeStep({
				title: `Pop ${current}`,
				description: `${current} is removed from the top of the stack.`,
				line: 2,
				activeNodes: [current, ...maybeTargetCopy(targetNodeId)],
				visitedNodes: asArray(visited),
				stackNodes: stack.map(item => item.nodeId),
				pathEdges: getTreeEdgesFromParents(parents),
				structureLabel: 'Stack',
				structure: stack.map(item => item.nodeId),
				insight: 'The last node pushed is the first node explored.',
			})
		);

		if (visited.has(current)) {
			steps.push(
				makeStep({
					title: `Already visited ${current}`,
					description: `${current} was reached earlier, so DFS discards this duplicate stack entry.`,
					line: 3,
					activeNodes: [current],
					visitedNodes: asArray(visited),
					stackNodes: stack.map(item => item.nodeId),
					pathEdges: getTreeEdgesFromParents(parents),
					structureLabel: 'Stack',
					structure: stack.map(item => item.nodeId),
					insight: 'Duplicate entries are common in iterative DFS unless marked when pushed.',
				})
			);
			continue;
		}

		visited.add(current);
		if (frame.parent != null && parents[current] == null) {
			parents[current] = frame.parent;
		}

		steps.push(
			makeStep({
				title: `Visit ${current}`,
				description: `${current} is now part of the DFS tree.`,
				line: 4,
				activeNodes: [current],
				visitedNodes: asArray(visited),
				stackNodes: stack.map(item => item.nodeId),
				pathEdges: getTreeEdgesFromParents(parents),
				structureLabel: 'Stack',
				structure: stack.map(item => item.nodeId),
				insight: 'DFS tree edges record the path taken during first visits.',
			})
		);

		if (targetNodeId && current === targetNodeId) {
			steps.push(
				makeStep({
					title: `Found ${targetNodeId}`,
					description: `DFS found the target, but this path is not guaranteed to be shortest.`,
					line: 4,
					activeNodes: [current],
					visitedNodes: asArray(visited),
					pathEdges: getTreeEdgesFromParents(parents),
					structureLabel: 'Stack',
					structure: stack.map(item => item.nodeId),
					insight: 'DFS is about reachability and structure, not shortest paths.',
				})
			);
			break;
		}

		const neighbors = [...(adjacency.get(current) || [])].reverse();
		for (const neighbor of neighbors) {
			if (!visited.has(neighbor.to)) {
				stack.push({ nodeId: neighbor.to, parent: current });
			}
		}

		steps.push(
			makeStep({
				title: `Push neighbors of ${current}`,
				description: `Unvisited neighbors are pushed so DFS can keep diving from the newest one.`,
				line: 5,
				activeNodes: [current],
				visitedNodes: asArray(visited),
				stackNodes: stack.map(item => item.nodeId),
				pathEdges: getTreeEdgesFromParents(parents),
				candidateEdges: neighbors.map(neighbor => ({
					from: current,
					to: neighbor.to,
				})),
				structureLabel: 'Stack',
				structure: stack.map(item => item.nodeId),
				insight: 'Neighbor order changes the exact DFS tree, but not the concept.',
			})
		);
	}

	steps.push(
		makeStep({
			title: 'Traversal complete',
			description: `DFS visited ${visited.size} of ${graph.nodes.length} nodes from ${startNodeId}.`,
			line: 1,
			visitedNodes: asArray(visited),
			pathEdges: getTreeEdgesFromParents(parents),
			structureLabel: 'Stack',
			structure: [],
			insight: 'DFS is the basis for cycle detection, SCCs, and topological sorting.',
		})
	);

	return steps;
};

const dijkstraSteps = (graph, options) => {
	const { startNodeId, targetNodeId, isDirected } = options;
	const adjacency = buildAdjacency(graph, isDirected);
	const distances = Object.fromEntries(graph.nodes.map(node => [node.id, INF]));
	const parents = {};
	const settled = new Set();
	const queue = [{ nodeId: startNodeId, distance: 0 }];
	distances[startNodeId] = 0;

	const queueLabels = () =>
		queue
			.slice()
			.sort((a, b) => a.distance - b.distance || a.nodeId.localeCompare(b.nodeId))
			.map(item => `${item.nodeId}:${formatDistance(item.distance)}`);

	const steps = [
		makeStep({
			title: 'Initialize distances',
			description: `Set ${startNodeId} to distance 0 and every other node to infinity.`,
			line: 0,
			activeNodes: [startNodeId],
			queuedNodes: [startNodeId],
			distances: cloneDistances(distances),
			structureLabel: 'Priority queue',
			structure: queueLabels(),
			insight:
				'Dijkstra repeatedly locks in the unsettled node with the smallest known distance.',
		}),
	];

	while (queue.length) {
		queue.sort((a, b) => a.distance - b.distance || a.nodeId.localeCompare(b.nodeId));
		const { nodeId: current, distance } = queue.shift();
		if (settled.has(current)) continue;

		settled.add(current);
		steps.push(
			makeStep({
				title: `Settle ${current}`,
				description: `${current} has the smallest tentative distance (${formatDistance(distance)}), so that distance is final.`,
				line: 3,
				activeNodes: [current, ...maybeTargetCopy(targetNodeId)],
				settledNodes: asArray(settled),
				visitedNodes: asArray(settled),
				pathEdges: getTreeEdgesFromParents(parents),
				distances: cloneDistances(distances),
				structureLabel: 'Priority queue',
				structure: queueLabels(),
				insight:
					'Once a node is settled, no later non-negative edge can produce a shorter route to it.',
			})
		);

		if (targetNodeId && current === targetNodeId) {
			steps.push(
				makeStep({
					title: `Shortest path to ${targetNodeId} found`,
					description: `The target was settled with total cost ${formatDistance(distances[targetNodeId])}.`,
					line: 3,
					activeNodes: [current],
					settledNodes: asArray(settled),
					visitedNodes: asArray(settled),
					pathEdges: getTreeEdgesFromParents(parents),
					distances: cloneDistances(distances),
					structureLabel: 'Priority queue',
					structure: queueLabels(),
					insight:
						'Stopping when the target is settled is safe; stopping when first discovered is not.',
				})
			);
			break;
		}

		for (const neighbor of adjacency.get(current) || []) {
			if (settled.has(neighbor.to)) continue;
			const candidate = distances[current] + neighbor.weight;
			const edge = { from: current, to: neighbor.to };
			if (candidate < distances[neighbor.to]) {
				distances[neighbor.to] = candidate;
				parents[neighbor.to] = current;
				queue.push({ nodeId: neighbor.to, distance: candidate });
				steps.push(
					makeStep({
						title: `Relax ${current} -> ${neighbor.to}`,
						description: `${formatDistance(distances[current])} + ${neighbor.weight} improves ${neighbor.to} to ${candidate}.`,
						line: 5,
						activeNodes: [current, neighbor.to],
						settledNodes: asArray(settled),
						visitedNodes: asArray(settled),
						queuedNodes: queue.map(item => item.nodeId),
						candidateEdges: [edge],
						pathEdges: getTreeEdgesFromParents(parents),
						distances: cloneDistances(distances),
						structureLabel: 'Priority queue',
						structure: queueLabels(),
						insight:
							'Relaxation means replacing a worse route with a cheaper one.',
					})
				);
			} else {
				steps.push(
					makeStep({
						title: `Keep current distance for ${neighbor.to}`,
						description: `${formatDistance(distances[current])} + ${neighbor.weight} is not better than ${formatDistance(distances[neighbor.to])}.`,
						line: 5,
						activeNodes: [current, neighbor.to],
						settledNodes: asArray(settled),
						visitedNodes: asArray(settled),
						rejectedEdges: [edge],
						pathEdges: getTreeEdgesFromParents(parents),
						distances: cloneDistances(distances),
						structureLabel: 'Priority queue',
						structure: queueLabels(),
						insight:
							'Not every edge matters; Dijkstra keeps only the best known predecessor.',
					})
				);
			}
		}
	}

	steps.push(
		makeStep({
			title: 'Shortest-path tree complete',
			description: `Settled ${settled.size} reachable nodes from ${startNodeId}.`,
			line: 2,
			settledNodes: asArray(settled),
			visitedNodes: asArray(settled),
			pathEdges: getTreeEdgesFromParents(parents),
			distances: cloneDistances(distances),
			structureLabel: 'Priority queue',
			structure: [],
			insight:
				'The final predecessor edges form a shortest-path tree from the start node.',
		})
	);

	return steps;
};

const makeDisjointSet = nodes => {
	const parent = Object.fromEntries(nodes.map(node => [node.id, node.id]));
	const rank = Object.fromEntries(nodes.map(node => [node.id, 0]));

	const find = nodeId => {
		if (parent[nodeId] !== nodeId) {
			parent[nodeId] = find(parent[nodeId]);
		}
		return parent[nodeId];
	};

	const union = (a, b) => {
		const rootA = find(a);
		const rootB = find(b);
		if (rootA === rootB) return false;
		if (rank[rootA] < rank[rootB]) {
			parent[rootA] = rootB;
		} else if (rank[rootA] > rank[rootB]) {
			parent[rootB] = rootA;
		} else {
			parent[rootB] = rootA;
			rank[rootA] += 1;
		}
		return true;
	};

	const components = () => {
		const grouped = {};
		nodes.forEach(node => {
			const root = find(node.id);
			grouped[root] = grouped[root] || [];
			grouped[root].push(node.id);
		});
		return Object.values(grouped).map(group => group.sort().join(''));
	};

	return { find, union, components };
};

const kruskalSteps = (graph, options) => {
	const { isDirected } = options;
	const edges = getUniqueEdges(graph, false).sort(
		(a, b) =>
			a.weight - b.weight ||
			a.from.localeCompare(b.from) ||
			a.to.localeCompare(b.to)
	);
	const dsu = makeDisjointSet(graph.nodes);
	const mstEdges = [];
	const rejected = [];
	let mstWeight = 0;

	const steps = [
		makeStep({
			title: 'Sort edges',
			description: `${edges.length} edges are considered from cheapest to most expensive${isDirected ? '; direction is ignored for spanning trees' : ''}.`,
			line: 0,
			structureLabel: 'Sorted edges',
			structure: edges.map(edge => `${edge.from}-${edge.to}:${edge.weight}`),
			insight:
				'Kruskal is greedy: it always asks whether the next cheapest edge is safe.',
		}),
	];

	edges.forEach(edge => {
		const accepted = dsu.union(edge.from, edge.to);
		if (accepted) {
			mstEdges.push(edge);
			mstWeight += edge.weight;
			steps.push(
				makeStep({
					title: `Accept ${edge.from}-${edge.to}`,
					description: `${edge.from} and ${edge.to} were in different components, so this edge cannot create a cycle.`,
					line: 3,
					activeNodes: [edge.from, edge.to],
					visitedNodes: [...new Set(mstEdges.flatMap(e => [e.from, e.to]))],
					candidateEdges: [edge],
					pathEdges: [...mstEdges],
					rejectedEdges: [...rejected],
					mstWeight,
					structureLabel: 'Components',
					structure: dsu.components(),
					insight:
						'Accepted MST edges connect components while keeping the forest acyclic.',
				})
			);
		} else {
			rejected.push(edge);
			steps.push(
				makeStep({
					title: `Reject ${edge.from}-${edge.to}`,
					description: `${edge.from} and ${edge.to} are already connected, so adding this edge would form a cycle.`,
					line: 5,
					activeNodes: [edge.from, edge.to],
					visitedNodes: [...new Set(mstEdges.flatMap(e => [e.from, e.to]))],
					rejectedEdges: [...rejected],
					candidateEdges: [edge],
					pathEdges: [...mstEdges],
					mstWeight,
					structureLabel: 'Components',
					structure: dsu.components(),
					insight: 'Cycle checks are exactly what union-find makes fast.',
				})
			);
		}
	});

	steps.push(
		makeStep({
			title: 'Spanning tree complete',
			description:
				mstEdges.length === graph.nodes.length - 1
					? `The MST uses ${mstEdges.length} edges with total weight ${mstWeight}.`
					: `Only ${mstEdges.length} tree edges were found, so this graph is disconnected.`,
			line: 2,
			visitedNodes: [...new Set(mstEdges.flatMap(edge => [edge.from, edge.to]))],
			pathEdges: [...mstEdges],
			rejectedEdges: [...rejected],
			mstWeight,
			structureLabel: 'MST edges',
			structure: mstEdges.map(edge => `${edge.from}-${edge.to}`),
			insight: 'A connected graph with n nodes needs exactly n - 1 MST edges.',
		})
	);

	return steps;
};

const primSteps = (graph, options) => {
	const { startNodeId, isDirected } = options;
	const edges = getUniqueEdges(graph, false);
	const visited = new Set([startNodeId]);
	const mstEdges = [];
	let mstWeight = 0;

	const crossingEdges = () =>
		edges
			.filter(
				edge =>
					(visited.has(edge.from) && !visited.has(edge.to)) ||
					(visited.has(edge.to) && !visited.has(edge.from))
			)
			.sort(
				(a, b) =>
					a.weight - b.weight ||
					a.from.localeCompare(b.from) ||
					a.to.localeCompare(b.to)
			);

	const steps = [
		makeStep({
			title: `Start from ${startNodeId}`,
			description: `Prim grows one connected tree, beginning at ${startNodeId}${isDirected ? '; direction is ignored for spanning trees' : ''}.`,
			line: 0,
			activeNodes: [startNodeId],
			visitedNodes: asArray(visited),
			structureLabel: 'Cut edges',
			structure: crossingEdges().map(edge => `${edge.from}-${edge.to}:${edge.weight}`),
			insight:
				'The cut is the boundary between visited nodes and unvisited nodes.',
		}),
	];

	while (visited.size < graph.nodes.length) {
		const candidates = crossingEdges();
		if (!candidates.length) break;
		const edge = candidates[0];
		const nextNode = visited.has(edge.from) ? edge.to : edge.from;
		mstEdges.push(edge);
		mstWeight += edge.weight;
		visited.add(nextNode);

		steps.push(
			makeStep({
				title: `Take ${edge.from}-${edge.to}`,
				description: `${edge.from}-${edge.to} is the cheapest edge crossing from the tree to a new node.`,
				line: 2,
				activeNodes: [edge.from, edge.to],
				visitedNodes: asArray(visited),
				candidateEdges: [edge],
				pathEdges: [...mstEdges],
				mstWeight,
				structureLabel: 'Cut edges',
				structure: crossingEdges().map(item => `${item.from}-${item.to}:${item.weight}`),
				insight:
					'Prim stays connected the whole time; Kruskal may build several components first.',
			})
		);
	}

	steps.push(
		makeStep({
			title: 'Prim tree complete',
			description:
				visited.size === graph.nodes.length
					? `Every node is connected with total weight ${mstWeight}.`
					: `The graph is disconnected from ${startNodeId}; only ${visited.size} nodes were reached.`,
			line: 1,
			visitedNodes: asArray(visited),
			pathEdges: [...mstEdges],
			mstWeight,
			structureLabel: 'MST edges',
			structure: mstEdges.map(edge => `${edge.from}-${edge.to}`),
			insight:
				'Prim and Kruskal can pick different edge orders but must end at the same optimal total weight when weights are unique.',
		})
	);

	return steps;
};

const topoSteps = (graph, options) => {
	const { isDirected } = options;
	const adjacency = buildAdjacency(graph, true);
	const indegree = Object.fromEntries(graph.nodes.map(node => [node.id, 0]));
	getUniqueEdges(graph, true).forEach(edge => {
		indegree[edge.to] = (indegree[edge.to] || 0) + 1;
	});

	const queue = sortNodeIds(
		Object.entries(indegree)
			.filter(([, degree]) => degree === 0)
			.map(([nodeId]) => nodeId)
	);
	const order = [];
	const removedEdges = [];
	const steps = [
		makeStep({
			title: 'Compute indegrees',
			description: `${queue.length} node${queue.length === 1 ? '' : 's'} currently have no prerequisites${isDirected ? '' : '; undirected graphs usually create cycles for topological sort'}.`,
			line: 0,
			queuedNodes: [...queue],
			distances: indegree,
			structureLabel: 'Zero-indegree queue',
			structure: [...queue],
			insight:
				'A node can be scheduled only after all incoming dependencies disappear.',
		}),
	];

	while (queue.length) {
		const current = queue.shift();
		order.push(current);
		steps.push(
			makeStep({
				title: `Emit ${current}`,
				description: `${current} has indegree 0, so it is safe to place next in the topological order.`,
				line: 3,
				activeNodes: [current],
				visitedNodes: [...order],
				queuedNodes: [...queue],
				distances: { ...indegree },
				order: [...order],
				pathEdges: [...removedEdges],
				structureLabel: 'Order',
				structure: [...order],
				insight: 'Every emitted node has no remaining prerequisites.',
			})
		);

		for (const neighbor of adjacency.get(current) || []) {
			indegree[neighbor.to] -= 1;
			removedEdges.push({ from: current, to: neighbor.to });
			if (indegree[neighbor.to] === 0) {
				queue.push(neighbor.to);
				queue.sort((a, b) => a.localeCompare(b));
			}
			steps.push(
				makeStep({
					title: `Remove ${current} -> ${neighbor.to}`,
					description: `Removing this dependency lowers ${neighbor.to}'s indegree to ${indegree[neighbor.to]}.`,
					line: 4,
					activeNodes: [current, neighbor.to],
					visitedNodes: [...order],
					queuedNodes: [...queue],
					candidateEdges: [{ from: current, to: neighbor.to }],
					pathEdges: [...removedEdges],
					distances: { ...indegree },
					order: [...order],
					structureLabel: 'Zero-indegree queue',
					structure: [...queue],
					insight:
						'When indegree becomes 0, the node is ready to be scheduled.',
				})
			);
		}
	}

	const remaining = graph.nodes
		.map(node => node.id)
		.filter(nodeId => !order.includes(nodeId));

	steps.push(
		makeStep({
			title: remaining.length ? 'Cycle detected' : 'Topological order complete',
			description: remaining.length
				? `${remaining.join(', ')} still have prerequisites, which means a directed cycle remains.`
				: `A valid order is ${order.join(' -> ')}.`,
			line: 2,
			activeNodes: remaining,
			visitedNodes: [...order],
			queuedNodes: [],
			rejectedEdges: remaining.length ? getUniqueEdges(graph, true) : [],
			pathEdges: [...removedEdges],
			distances: { ...indegree },
			order: [...order],
			structureLabel: remaining.length ? 'Blocked nodes' : 'Order',
			structure: remaining.length ? remaining : [...order],
			insight:
				'Topological sort exists only for directed acyclic graphs, often called DAGs.',
		})
	);

	return steps;
};

const directedFlowKey = (from, to) => `${from}->${to}`;

const maxFlowSteps = (graph, options) => {
	const { startNodeId, targetNodeId } = options;
	const sinkNodeId =
		targetNodeId && targetNodeId !== startNodeId
			? targetNodeId
			: [...graph.nodes].reverse().find(node => node.id !== startNodeId)?.id;
	const sourceNodeId = startNodeId;
	if (!sourceNodeId || !sinkNodeId) return [];

	const capacities = new Map();
	getUniqueEdges(graph, true).forEach(edge => {
		if (edge.from === edge.to) return;
		const key = directedFlowKey(edge.from, edge.to);
		capacities.set(key, {
			from: edge.from,
			to: edge.to,
			capacity: normalizeWeight(edge.weight),
		});
	});

	const flow = Object.fromEntries([...capacities.keys()].map(key => [key, 0]));
	const cloneFlow = () => ({ ...flow });
	const currentFlowValue = () =>
		[...capacities.values()]
			.filter(edge => edge.from === sourceNodeId)
			.reduce((sum, edge) => sum + flow[directedFlowKey(edge.from, edge.to)], 0);

	const findResidualPath = () => {
		const queue = [sourceNodeId];
		const visited = new Set([sourceNodeId]);
		const parent = {};
		const scannedEdges = [];

		while (queue.length) {
			const current = queue.shift();
			const residualEdges = [];

			capacities.forEach(edge => {
				const key = directedFlowKey(edge.from, edge.to);
				const used = flow[key];
				if (edge.from === current && edge.capacity - used > 0) {
					residualEdges.push({
						from: edge.from,
						to: edge.to,
						originalFrom: edge.from,
						originalTo: edge.to,
						direction: 1,
						residual: edge.capacity - used,
					});
				}
				if (edge.to === current && used > 0) {
					residualEdges.push({
						from: edge.to,
						to: edge.from,
						originalFrom: edge.from,
						originalTo: edge.to,
						direction: -1,
						residual: used,
					});
				}
			});

			residualEdges.sort((a, b) => a.to.localeCompare(b.to));

			for (const residualEdge of residualEdges) {
				scannedEdges.push(residualEdge);
				if (visited.has(residualEdge.to)) continue;
				visited.add(residualEdge.to);
				parent[residualEdge.to] = residualEdge;
				if (residualEdge.to === sinkNodeId) {
					const path = [];
					let cursor = sinkNodeId;
					while (cursor !== sourceNodeId) {
						const step = parent[cursor];
						path.unshift(step);
						cursor = step.from;
					}
					return {
						path,
						visited,
						queue: [...queue],
						scannedEdges,
					};
				}
				queue.push(residualEdge.to);
			}
		}

		return {
			path: null,
			visited,
			queue: [],
			scannedEdges,
		};
	};

	const steps = [
		makeStep({
			title: 'Start with zero flow',
			description: `Every pipe begins at 0 flow. The goal is to push as much as possible from ${sourceNodeId} to ${sinkNodeId}.`,
			line: 0,
			activeNodes: [sourceNodeId, sinkNodeId],
			flowMap: cloneFlow(),
			flowValue: 0,
			structureLabel: 'Source -> sink',
			structure: [`${sourceNodeId} -> ${sinkNodeId}`],
			insight:
				'Capacity is the limit on an edge; flow is how much of that limit is currently used.',
		}),
	];

	let guard = 0;
	while (guard < 30) {
		guard += 1;
		const search = findResidualPath();
		if (!search.path) {
			steps.push(
				makeStep({
					title: 'No augmenting path remains',
					description: `The residual network cannot reach ${sinkNodeId}, so the current flow is maximum.`,
					line: 1,
					activeNodes: [sourceNodeId, sinkNodeId],
					visitedNodes: asArray(search.visited),
					rejectedEdges: search.scannedEdges.map(edge => ({
						from: edge.from,
						to: edge.to,
					})),
					flowMap: cloneFlow(),
					flowValue: currentFlowValue(),
					structureLabel: 'Reachable residual nodes',
					structure: asArray(search.visited),
					insight:
						'This is the max-flow min-cut idea: if residual capacity cannot cross the cut, no more flow can be sent.',
				})
			);
			break;
		}

		const bottleneck = Math.min(...search.path.map(edge => edge.residual));
		const pathNodes = [
			sourceNodeId,
			...search.path.map(edge => edge.to),
		];
		const residualPathEdges = search.path.map(edge => ({
			from: edge.from,
			to: edge.to,
		}));
		const originalPathEdges = search.path.map(edge => ({
			from: edge.originalFrom,
			to: edge.originalTo,
		}));

		steps.push(
			makeStep({
				title: `Find path ${pathNodes.join(' -> ')}`,
				description: `The smallest remaining capacity on this residual path is ${bottleneck}, so that is the most we can add now.`,
				line: 2,
				activeNodes: pathNodes,
				visitedNodes: asArray(search.visited),
				candidateEdges: residualPathEdges,
				flowMap: cloneFlow(),
				flowValue: currentFlowValue(),
				bottleneck,
				structureLabel: 'Residual path',
				structure: search.path.map(edge => `${edge.from}->${edge.to}:${edge.residual}`),
				insight:
					'The bottleneck pipe controls the whole path. Wider pipes cannot carry extra unless every edge on the path can.',
			})
		);

		search.path.forEach(edge => {
			const key = directedFlowKey(edge.originalFrom, edge.originalTo);
			flow[key] += edge.direction * bottleneck;
		});

		steps.push(
			makeStep({
				title: `Augment by ${bottleneck}`,
				description: `Push ${bottleneck} units along the path and update the residual network, including reverse edges for undoing earlier choices.`,
				line: 3,
				activeNodes: pathNodes,
				visitedNodes: pathNodes,
				pathEdges: originalPathEdges,
				flowMap: cloneFlow(),
				flowValue: currentFlowValue(),
				bottleneck,
				structureLabel: 'Flow value',
				structure: [`${currentFlowValue()}`],
				insight:
					'Reverse residual edges are the clever part: they let the algorithm reroute flow if a later path needs capacity back.',
			})
		);
	}

	steps.push(
		makeStep({
			title: `Maximum flow is ${currentFlowValue()}`,
			description: `${currentFlowValue()} total units can travel from ${sourceNodeId} to ${sinkNodeId} without violating any edge capacity.`,
			line: 5,
			activeNodes: [sourceNodeId, sinkNodeId],
			pathEdges: [...capacities.values()]
				.filter(edge => flow[directedFlowKey(edge.from, edge.to)] > 0)
				.map(edge => ({ from: edge.from, to: edge.to })),
			flowMap: cloneFlow(),
			flowValue: currentFlowValue(),
			structureLabel: 'Saturated edges',
			structure: [...capacities.values()]
				.filter(edge => flow[directedFlowKey(edge.from, edge.to)] === edge.capacity)
				.map(edge => `${edge.from}->${edge.to}`),
			insight:
				'The final labels show flow/capacity. Saturated edges are full; unsaturated edges still have spare capacity.',
		})
	);

	return steps;
};

export const createGraphAlgorithmSteps = (
	graph,
	algorithmId,
	{ startNodeId, targetNodeId = '', isDirected = false, isWeighted = false } = {}
) => {
	const nodeIds = graph.nodes.map(node => node.id);
	const start = startNodeId && nodeIds.includes(startNodeId) ? startNodeId : nodeIds[0];
	if (!start || !GRAPH_ALGORITHMS[algorithmId]) return [];

	const options = {
		startNodeId: start,
		targetNodeId:
			targetNodeId && nodeIds.includes(targetNodeId)
				? targetNodeId
				: algorithmId === 'maxflow'
					? [...nodeIds].reverse().find(nodeId => nodeId !== start) || ''
					: '',
		isDirected,
		isWeighted,
	};

	switch (algorithmId) {
		case 'bfs':
			return bfsSteps(graph, options);
		case 'dfs':
			return dfsSteps(graph, options);
		case 'dijkstra':
			return dijkstraSteps(graph, options);
		case 'kruskal':
			return kruskalSteps(graph, options);
		case 'prim':
			return primSteps(graph, options);
		case 'topo':
			return topoSteps(graph, options);
		case 'maxflow':
			return maxFlowSteps(graph, options);
		default:
			return [];
	}
};
