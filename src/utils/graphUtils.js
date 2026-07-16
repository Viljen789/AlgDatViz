const undirectedEdgeKey = (from, to) =>
	from === to ? `${from}->${to}` : [from, to].sort().join('--');

/**
 * Return the edges a graph view should interpret for the active direction mode.
 *
 * The graph state always remains the source of truth. In undirected mode we
 * collapse antiparallel edges to one relationship for display/algorithm lenses;
 * importantly, we do not write a synthetic reverse edge back into that state.
 * The first stored orientation wins, matching the graph visualizer and the
 * algorithm engine's existing undirected-edge semantics.
 */
export function getGraphEdgesForMode(graph, isDirected) {
	const edges = graph?.edges || [];
	if (isDirected) return edges;

	const seen = new Set();
	return edges.filter(edge => {
		const key = undirectedEdgeKey(edge.from, edge.to);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

/** Build the adjacency rows rendered by the list lens. */
export function buildGraphAdjacency(graph, isDirected) {
	const adjacency = new Map(graph.nodes.map(node => [node.id, []]));

	getGraphEdgesForMode(graph, isDirected).forEach(edge => {
		adjacency.get(edge.from)?.push({ to: edge.to, weight: edge.weight });
		if (!isDirected && edge.from !== edge.to) {
			adjacency.get(edge.to)?.push({ to: edge.from, weight: edge.weight });
		}
	});

	return adjacency;
}

/** Build the values rendered by the matrix lens. */
export function buildGraphMatrix(graph, isDirected, isWeighted) {
	const nodeIds = graph.nodes.map(node => node.id);
	const nodeMap = new Map(nodeIds.map((id, index) => [id, index]));
	const matrix = Array.from({ length: nodeIds.length }, () =>
		Array(nodeIds.length).fill(0)
	);

	getGraphEdgesForMode(graph, isDirected).forEach(edge => {
		const fromIndex = nodeMap.get(edge.from);
		const toIndex = nodeMap.get(edge.to);
		if (fromIndex === undefined || toIndex === undefined) return;

		const value = isWeighted ? edge.weight : 1;
		matrix[fromIndex][toIndex] = value;
		if (!isDirected) matrix[toIndex][fromIndex] = value;
	});

	return { matrix, nodeMap };
}

/**
 * Apply one matrix-cell edit without changing the meaning of unrelated edges.
 * Directed edits replace only from -> to. Undirected edits replace the single
 * relationship between the pair and store it once; the matrix/list/visualizer
 * mirror it when interpreting the undirected view.
 */
export function updateGraphEdge(
	graph,
	{ fromNodeId, toNodeId, value, isWeighted, isDirected }
) {
	if (!fromNodeId || !toNodeId) return graph;

	const edges = graph.edges.filter(edge => {
		const isForward = edge.from === fromNodeId && edge.to === toNodeId;
		if (isDirected) return !isForward;

		const isReverse = edge.from === toNodeId && edge.to === fromNodeId;
		return !isForward && !isReverse;
	});

	if (value > 0) {
		edges.push({
			from: fromNodeId,
			to: toNodeId,
			weight: isWeighted ? value : 1,
		});
	}

	return { ...graph, edges };
}

export function parseAndUpdateGraph(
	inputValue,
	sourceNodeId,
	currentGraph,
	isWeighted,
	isDirected
) {
	const validNodeIds = new Set(currentGraph.nodes.map(node => node.id));

	const newOutgoingEdges = inputValue
		.split(',')
		.map(e => e.trim())
		.filter(Boolean)
		.map(entry => {
			let to, weight;
			const transformedEntry = entry.toUpperCase();
			if (isWeighted) {
				const parts = transformedEntry.split(':').map(p => p.trim());
				to = parts[0];
				weight = Number(parts[1]);
				if (!to || isNaN(weight) || !validNodeIds.has(to)) return null;
			} else {
				to = transformedEntry;
				weight = 1;
				if (!to || !validNodeIds.has(to)) return null;
			}
			return { from: sourceNodeId, to, weight };
		})
		.filter(Boolean);

	if (isDirected) {
		const edgesToKeep = currentGraph.edges.filter(e => e.from !== sourceNodeId);
		const finalEdges = [...edgesToKeep, ...newOutgoingEdges];
		return { ...currentGraph, edges: finalEdges };
	} else {
		const existingPairs = new Map();
		currentGraph.edges.forEach(edge => {
			if (edge.from !== sourceNodeId && edge.to !== sourceNodeId) {
				const key = undirectedEdgeKey(edge.from, edge.to);

				if (!existingPairs.has(key)) {
					existingPairs.set(key, edge);
				}
			}
		});

		const newPairs = new Map();
		newOutgoingEdges.forEach(edge => {
			const key = undirectedEdgeKey(edge.from, edge.to);
			newPairs.set(key, edge);
		});

		const allPairs = new Map([...existingPairs, ...newPairs]);

		// Store each undirected relationship once. The three graph lenses and the
		// algorithm engine mirror it while isDirected is false, so toggling modes is
		// now a pure interpretation change instead of an edge mutation.
		return { ...currentGraph, edges: [...allPairs.values()] };
	}
}
