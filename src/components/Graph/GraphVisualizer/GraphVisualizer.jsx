import { useMemo, useRef, useState } from 'react';
import styles from './GraphVisualizer.module.css';

const NODE_RADIUS = 26;
const VIEW_PADDING = 115;

const makeEdgeKey = (from, to, isDirected = false) => {
	if (isDirected || from === to) return `${from}->${to}`;
	return [from, to].sort().join('--');
};

const toKeySet = (edges, isDirected) =>
	new Set((edges || []).map(edge => makeEdgeKey(edge.from, edge.to, isDirected)));

const GraphVisualizer = ({
	graph,
	selectedNodeId,
	onNodeClick,
	onNodePositionChange,
	isDirected,
	isWeighted,
	selectedCell,
	algorithmState,
}) => {
	const svgRef = useRef(null);
	const dragMovedRef = useRef(false);
	const [draggingNodeId, setDraggingNodeId] = useState(null);

	const nodeMap = useMemo(
		() => new Map(graph.nodes.map(node => [node.id, node])),
		[graph.nodes]
	);

	const bounds = useMemo(() => {
		if (!graph.nodes.length) {
			return { minX: -320, minY: -220, width: 640, height: 440 };
		}

		const xs = graph.nodes.map(node => node.x ?? 0);
		const ys = graph.nodes.map(node => node.y ?? 0);
		const minX = Math.min(...xs) - VIEW_PADDING;
		const maxX = Math.max(...xs) + VIEW_PADDING;
		const minY = Math.min(...ys) - VIEW_PADDING;
		const maxY = Math.max(...ys) + VIEW_PADDING;

		return {
			minX,
			minY,
			width: Math.max(maxX - minX, 640),
			height: Math.max(maxY - minY, 440),
		};
	}, [graph.nodes]);

	const visibleEdges = useMemo(() => {
		const edgeSet = new Set();
		const edges = [];

		graph.edges.forEach(edge => {
			const key = makeEdgeKey(edge.from, edge.to, isDirected);
			if (!isDirected && edgeSet.has(key)) return;
			edgeSet.add(key);
			edges.push({ ...edge, key });
		});

		const addOverlayEdge = edge => {
			if (!nodeMap.has(edge.from) || !nodeMap.has(edge.to)) return;
			const key = makeEdgeKey(edge.from, edge.to, isDirected);
			if (edgeSet.has(key)) return;
			edgeSet.add(key);
			edges.push({ ...edge, key, isOverlay: true });
		};

		if (selectedCell) {
			addOverlayEdge({
				from: selectedCell.fromNodeId,
				to: selectedCell.toNodeId,
				isPreview: true,
			});
		}

		[
			...(algorithmState?.candidateEdges || []),
			...(algorithmState?.pathEdges || []),
			...(algorithmState?.rejectedEdges || []),
		].forEach(addOverlayEdge);

		return edges;
	}, [graph.edges, nodeMap, isDirected, selectedCell, algorithmState]);

	const activeNodes = new Set(algorithmState?.activeNodes || []);
	const visitedNodes = new Set(algorithmState?.visitedNodes || []);
	const queuedNodes = new Set([
		...(algorithmState?.queuedNodes || []),
		...(algorithmState?.stackNodes || []),
	]);
	const settledNodes = new Set(algorithmState?.settledNodes || []);
	const pathEdgeKeys = toKeySet(algorithmState?.pathEdges, isDirected);
	const candidateEdgeKeys = toKeySet(algorithmState?.candidateEdges, isDirected);
	const rejectedEdgeKeys = toKeySet(algorithmState?.rejectedEdges, isDirected);
	const flowMap = algorithmState?.flowMap || null;

	const getSvgPoint = event => {
		const svg = svgRef.current;
		if (!svg) return null;
		const point = svg.createSVGPoint();
		point.x = event.clientX;
		point.y = event.clientY;
		return point.matrixTransform(svg.getScreenCTM().inverse());
	};

	const handlePointerMove = event => {
		if (!draggingNodeId || !onNodePositionChange) return;
		const point = getSvgPoint(event);
		if (!point) return;
		dragMovedRef.current = true;
		onNodePositionChange(draggingNodeId, { x: point.x, y: point.y });
	};

	const stopDragging = () => {
		setDraggingNodeId(null);
		window.setTimeout(() => {
			dragMovedRef.current = false;
		}, 0);
	};

	const getEdgeGeometry = edge => {
		const from = nodeMap.get(edge.from);
		const to = nodeMap.get(edge.to);
		if (!from || !to) return null;

		if (edge.from === edge.to) {
			const x = from.x ?? 0;
			const y = from.y ?? 0;
			return {
				path: `M ${x + 8} ${y - NODE_RADIUS} C ${x + 72} ${y - 88}, ${x + 82} ${y + 8}, ${x + NODE_RADIUS} ${y + 12}`,
				labelX: x + 58,
				labelY: y - 48,
			};
		}

		const x1 = from.x ?? 0;
		const y1 = from.y ?? 0;
		const x2 = to.x ?? 0;
		const y2 = to.y ?? 0;
		const dx = x2 - x1;
		const dy = y2 - y1;
		const length = Math.hypot(dx, dy) || 1;
		const ux = dx / length;
		const uy = dy / length;
		const startX = x1 + ux * NODE_RADIUS;
		const startY = y1 + uy * NODE_RADIUS;
		const endX = x2 - ux * (NODE_RADIUS + (isDirected ? 7 : 0));
		const endY = y2 - uy * (NODE_RADIUS + (isDirected ? 7 : 0));
		const midX = (startX + endX) / 2;
		const midY = (startY + endY) / 2;
		const normalX = -uy;
		const normalY = ux;
		const hasReverse =
			isDirected && graph.edges.some(item => item.from === edge.to && item.to === edge.from);
		const curve =
			edge.isOverlay || hasReverse
				? edge.from.localeCompare(edge.to) > 0
					? -44
					: 44
				: 0;

		if (curve !== 0) {
			const controlX = midX + normalX * curve;
			const controlY = midY + normalY * curve;
			return {
				path: `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`,
				labelX: midX + normalX * curve * 0.58,
				labelY: midY + normalY * curve * 0.58,
			};
		}

		return {
			path: `M ${startX} ${startY} L ${endX} ${endY}`,
			labelX: midX + normalX * 14,
			labelY: midY + normalY * 14,
		};
	};

	const getEdgeLabel = edge => {
		if (flowMap) {
			const flow = flowMap[`${edge.from}->${edge.to}`] ?? 0;
			const capacity = Number(edge.weight ?? 0);
			if (Number.isFinite(capacity) && capacity > 0) return `${flow}/${capacity}`;
		}
		return isWeighted && edge.weight != null ? String(edge.weight) : '';
	};

	return (
		<div className={styles.graphContainer}>
			<svg
				ref={svgRef}
				className={styles.graphSvg}
				viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
				onPointerMove={handlePointerMove}
				onPointerUp={stopDragging}
				onPointerLeave={stopDragging}
				role="img"
				aria-label="Graph visualization"
			>
				<defs>
					<marker
						id="graph-arrow"
						viewBox="0 0 10 10"
						refX="8"
						refY="5"
						markerWidth="7"
						markerHeight="7"
						orient="auto-start-reverse"
					>
						<path d="M 0 0 L 10 5 L 0 10 z" className={styles.arrowMarker} />
					</marker>
				</defs>

				{visibleEdges.map(edge => {
					const geometry = getEdgeGeometry(edge);
					if (!geometry) return null;
					const key = makeEdgeKey(edge.from, edge.to, isDirected);
					const isSelectedEdge =
						selectedCell &&
						((edge.from === selectedCell.fromNodeId &&
							edge.to === selectedCell.toNodeId) ||
							(!isDirected &&
								edge.from === selectedCell.toNodeId &&
								edge.to === selectedCell.fromNodeId));
					const isConnectedToSelected =
						selectedNodeId &&
						(edge.from === selectedNodeId || edge.to === selectedNodeId);
					const label = getEdgeLabel(edge);

					return (
						<g key={`${edge.from}-${edge.to}-${edge.isOverlay ? 'overlay' : 'base'}`}>
							<path
								d={geometry.path}
								className={`${styles.edgePath} ${
									pathEdgeKeys.has(key) ? styles.edgePathAccepted : ''
								} ${candidateEdgeKeys.has(key) ? styles.edgePathCandidate : ''} ${
									rejectedEdgeKeys.has(key) ? styles.edgePathRejected : ''
								} ${edge.isPreview || edge.isOverlay ? styles.edgePathPreview : ''} ${
									isSelectedEdge || isConnectedToSelected
										? styles.edgePathSelected
										: ''
								}`}
								markerEnd={isDirected ? 'url(#graph-arrow)' : undefined}
							/>
							{label && (
								<g transform={`translate(${geometry.labelX}, ${geometry.labelY})`}>
									<rect
										className={styles.edgeLabelBg}
										x={-Math.max(18, label.length * 4.8)}
										y="-13"
										width={Math.max(36, label.length * 9.6)}
										height="26"
										rx="6"
									/>
									<text className={styles.edgeLabel} textAnchor="middle" dy="4">
										{label}
									</text>
								</g>
							)}
						</g>
					);
				})}

				{graph.nodes.map(node => {
					const nodeId = node.id;
					const isSelected = nodeId === selectedNodeId;
					const isActive = activeNodes.has(nodeId);
					const isVisited = visitedNodes.has(nodeId);
					const isQueued = queuedNodes.has(nodeId);
					const isSettled = settledNodes.has(nodeId);

					return (
						<g
							key={nodeId}
							className={styles.nodeGroup}
							transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}
							onPointerDown={event => {
								event.stopPropagation();
								event.currentTarget.setPointerCapture(event.pointerId);
								setDraggingNodeId(nodeId);
								dragMovedRef.current = false;
							}}
							onClick={event => {
								event.stopPropagation();
								if (dragMovedRef.current) return;
								onNodeClick(nodeId === selectedNodeId ? null : nodeId);
							}}
						>
							<circle
								r={NODE_RADIUS}
								className={`${styles.nodeCircle} ${
									isVisited ? styles.nodeVisited : ''
								} ${isQueued ? styles.nodeQueued : ''} ${
									isSettled ? styles.nodeSettled : ''
								} ${isSelected ? styles.nodeSelected : ''} ${
									isActive ? styles.nodeActive : ''
								}`}
							/>
							<text className={styles.nodeText} textAnchor="middle" dy="5">
								{node.label ?? node.id}
							</text>
						</g>
					);
				})}
			</svg>
		</div>
	);
};

export default GraphVisualizer;
