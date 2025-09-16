import { useEffect, useRef } from 'react';
import { Network } from 'vis-network';
import 'vis-network/styles/vis-network.css';
import styles from './GraphVisualizer.module.css';

const GraphVisualizer = ({
	graph,
	selectedNodeId,
	onNodeClick,
	isDirected,
	isWeighted,
	selectedCell,
}) => {
	const networkRef = useRef(null);
	const networkInstance = useRef(null);

	useEffect(() => {
		if (!networkRef.current || !graph) return;

		const rootStyles = getComputedStyle(document.documentElement);
		const theme = {
			primary: rootStyles.getPropertyValue('--color-primary').trim(),
			selection: rootStyles
				.getPropertyValue('--viz-selection-color')
				.trim(),
			nodeFill: rootStyles.getPropertyValue('--viz-node-fill').trim(),
			nodeStroke: rootStyles.getPropertyValue('--viz-node-stroke').trim(),
			edge: rootStyles.getPropertyValue('--viz-edge-color').trim(),
			text: rootStyles.getPropertyValue('--viz-text-color').trim(),
			textOnNode:
				rootStyles.getPropertyValue('--color-text-on-node').trim() ||
				'white',
			surface:
				rootStyles.getPropertyValue('--color-surface').trim() ||
				'white',
		};

		const nodes = graph.nodes.map(node => {
			const isSelected = node.id === selectedNodeId;
			return {
				id: node.id,
				label: String(node.label ?? node.id),
				x: node.x,
				y: node.y,
				shape: 'circle',
				color: {
					background: isSelected ? theme.selection : theme.nodeFill,
					border: isSelected ? theme.primary : theme.nodeStroke,
					highlight: {
						background: theme.selection,
						border: theme.primary,
					},
					hover: {
						background: theme.nodeFill,
						border: theme.primary,
					},
				},
				font: { color: isSelected ? theme.textOnNode : theme.text },
				borderWidth: isSelected ? 3 : 2,
			};
		});

		const edgeSet = new Set(graph.edges.map(e => `${e.from}->${e.to}`));

		let edgesToProcess = graph.edges;

		if (!isDirected) {
			const uniqueEdges = new Map();
			graph.edges.forEach(edge => {
				const key =
					edge.from < edge.to
						? `${edge.from}-${edge.to}`
						: `${edge.to}-${edge.from}`;
				if (!uniqueEdges.has(key)) {
					uniqueEdges.set(key, edge);
				}
			});
			edgesToProcess = Array.from(uniqueEdges.values());
		}

		const sortedEdges = [...edgesToProcess].sort((a, b) => {
			const aIsSelfLoop = a.from === a.to;
			const bIsSelfLoop = b.from === b.to;
			if (aIsSelfLoop && !bIsSelfLoop) return -1;
			if (!aIsSelfLoop && bIsSelfLoop) return 1;
			return 0;
		});

		const edges = sortedEdges.map(edge => {
			const isBidirectional = edgeSet.has(`${edge.to}->${edge.from}`);
			const isSelfLoop = edge.from === edge.to;

			let smoothConfig = { enabled: false };

			if (isSelfLoop) {
				smoothConfig = {
					enabled: true,
					type: 'curvedCW',
					roundness: 0.8,
				};
			} else if (isBidirectional && isDirected) {
				if (edge.from < edge.to) {
					smoothConfig = {
						enabled: true,
						type: 'curvedCW',
						roundness: 0.3,
					};
				}
			}

			const isConnectedToSelected =
				selectedNodeId != null &&
				(edge.from === selectedNodeId || edge.to === selectedNodeId);
			const isSelectedEdge =
				selectedCell &&
				((edge.from === selectedCell.fromNodeId &&
					edge.to === selectedCell.toNodeId) ||
					(!isDirected &&
						edge.from === selectedCell.toNodeId &&
						edge.to === selectedCell.fromNodeId));

			return {
				id: `${edge.from}-${edge.to}`,
				from: edge.from,
				to: edge.to,
				label: isWeighted ? String(edge.weight) : '',
				arrows: {
					to: { enabled: isDirected, type: 'arrow', scaleFactor: 1 },
				},
				smooth: smoothConfig,

				width: isSelectedEdge ? 4 : isConnectedToSelected ? 3 : 2,
				color: {
					color: isSelectedEdge
						? theme.primary
						: isConnectedToSelected
							? theme.primary
							: theme.edge,
					highlight: isSelectedEdge
						? theme.primary
						: isConnectedToSelected
							? theme.primary
							: theme.edge,
					hover: isSelectedEdge
						? theme.primary
						: isConnectedToSelected
							? theme.primary
							: theme.edge,
				},
			};
		});
		if (selectedCell) {
			const { fromNodeId, toNodeId } = selectedCell;
			const edgeExists = graph.edges.some(
				e =>
					(e.from === fromNodeId && e.to === toNodeId) ||
					(!isDirected && e.from === toNodeId && e.to === fromNodeId)
			);

			if (!edgeExists) {
				edges.push({
					id: `temp-${fromNodeId}-${toNodeId}`,
					from: fromNodeId,
					to: toNodeId,
					dashes: [5, 5],
					color: { color: theme.edge, opacity: 0.6 },
					width: 2,
					arrows: {
						to: {
							enabled: isDirected,
							type: 'arrow',
							scaleFactor: 1,
						},
					},
				});
			}
		}

		const data = { nodes, edges };

		const options = {
			physics: false,
			interaction: {
				dragNodes: true,
				zoomView: true,
				dragView: true,
				hover: true,
				hoverConnectedEdges: false,
				selectConnectedEdges: false,
			},
			nodes: {
				size: 24,
				font: { size: 16, face: 'Inter' },
			},
			edges: {
				font: {
					color: theme.text,
					size: 14,
					face: 'Inter',
					background: theme.surface,
					align: 'top',
				},
			},
		};

		networkInstance.current = new Network(
			networkRef.current,
			data,
			options
		);
		networkInstance.current.fit({ animation: { duration: 500 } });

		networkInstance.current.on('click', params => {
			const clickedNodeId =
				params.nodes.length > 0 ? params.nodes[0] : null;
			onNodeClick(
				clickedNodeId === selectedNodeId ? null : clickedNodeId
			);
		});

		return () => networkInstance.current?.destroy();
	}, [
		graph,
		selectedNodeId,
		onNodeClick,
		isDirected,
		isWeighted,
		selectedCell,
	]);

	return <div ref={networkRef} className={styles.graphContainer} />;
};

export default GraphVisualizer;
