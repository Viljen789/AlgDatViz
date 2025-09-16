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
		const edgesToKeep = currentGraph.edges.filter(
			e => e.from !== sourceNodeId
		);
		const finalEdges = [...edgesToKeep, ...newOutgoingEdges];
		return { ...currentGraph, edges: finalEdges };
	} else {
		const existingPairs = new Map();
		currentGraph.edges.forEach(edge => {
			if (edge.from !== sourceNodeId && edge.to !== sourceNodeId) {
				const key = [edge.from, edge.to].sort().join('-');

				if (!existingPairs.has(key)) {
					existingPairs.set(key, edge);
				}
			}
		});

		const newPairs = new Map();
		newOutgoingEdges.forEach(edge => {
			const key = [edge.from, edge.to].sort().join('-');
			newPairs.set(key, edge);
		});

		const allPairs = new Map([...existingPairs, ...newPairs]);

		const finalSymmetricalEdges = [];
		allPairs.forEach(edge => {
			finalSymmetricalEdges.push({
				from: edge.from,
				to: edge.to,
				weight: edge.weight,
			});

			if (edge.from !== edge.to) {
				finalSymmetricalEdges.push({
					from: edge.to,
					to: edge.from,
					weight: edge.weight,
				});
			}
		});

		return { ...currentGraph, edges: finalSymmetricalEdges };
	}
}
