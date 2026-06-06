import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Network, ListTree, Grid3x3 } from 'lucide-react';
import GraphVisualizer from './GraphVisualizer/GraphVisualizer';
import AdjacencyMatrix from './AdjacencyMatrix/AdjacencyMatrix';
import AdjacencyList from './AdjacencyList/AdjacencyList';
import GraphHero from './GraphHero/GraphHero';
import styles from './GraphDashboard.module.css';
import { parseAndUpdateGraph } from '../../utils/graphUtils.js';
import {
	createGraphAlgorithmSteps,
	GRAPH_ALGORITHMS,
} from '../../utils/graphAlgorithms.js';
import { GRAPH_ALGORITHM_META } from '../../utils/graphAlgorithmMeta.js';
import { GRAPH_PRESETS } from '../../data/graphPresets.js';
import PseudocodeRail from '../../common/PseudocodeRail/PseudocodeRail';
import StepControlBar from '../../common/StepControlBar/StepControlBar';
import { usePlayback } from '../../common/PlaybackEngine';

const cloneGraph = graph => JSON.parse(JSON.stringify(graph));

const SPEED_OPTIONS = [
	{ value: 1500, label: '0.5×' },
	{ value: 950, label: '1×' },
	{ value: 500, label: '2×' },
	{ value: 220, label: '5×' },
];

const VIEW_OPTIONS = [
	{ value: 'graph', label: 'Graph', icon: Network },
	{ value: 'list', label: 'List', icon: ListTree },
	{ value: 'matrix', label: 'Matrix', icon: Grid3x3 },
];

// The graph SPEED_OPTIONS are per-frame delays in ms (lower = faster), so we map
// the speed value straight through to the engine's delay.
const speedToDelay = speed => speed;

const GraphDashboard = ({ onUserInteract }) => {
	const initialPreset = GRAPH_PRESETS.traversal;
	const [graph, setGraph] = useState(() => cloneGraph(initialPreset.graph));
	const [selectedNodeId, setSelectedNodeId] = useState(null);
	const [isDirected, setIsDirected] = useState(initialPreset.isDirected);
	const [isWeighted, setIsWeighted] = useState(initialPreset.isWeighted);
	const [selectedCell, setSelectedCell] = useState(null);
	const [presetId, setPresetId] = useState('traversal');
	const [algorithmId, setAlgorithmId] = useState('bfs');
	const [startNodeId, setStartNodeId] = useState(initialPreset.startNodeId);
	const [targetNodeId, setTargetNodeId] = useState('');
	const [viewMode, setViewMode] = useState('graph');

	// Scopes playback keyboard control (space / ← / →) to this playground so a
	// second mounted player on the page can't react to the same keypress.
	const playerRef = useRef(null);

	const algorithmSteps = useMemo(
		() =>
			createGraphAlgorithmSteps(graph, algorithmId, {
				startNodeId,
				targetNodeId,
				isDirected,
				isWeighted,
			}),
		[graph, algorithmId, startNodeId, targetNodeId, isDirected, isWeighted]
	);

	const player = usePlayback(algorithmSteps, { speed: 950, speedToDelay });
	const { currentStep: stepIndex, isPlaying, reset, seek } = player;

	const currentStep = algorithmSteps[stepIndex] ?? algorithmSteps[0];
	const totalSteps = algorithmSteps.length;
	const canStep = totalSteps > 1;

	// A fresh timeline (new algorithm, endpoints, graph) should start at step 0.
	useEffect(() => {
		reset();
	}, [algorithmId, startNodeId, targetNodeId, isDirected, isWeighted, graph, reset]);

	useEffect(() => {
		if (!graph.nodes.some(node => node.id === startNodeId)) {
			setStartNodeId(graph.nodes[0]?.id ?? '');
		}
		if (targetNodeId && !graph.nodes.some(node => node.id === targetNodeId)) {
			setTargetNodeId('');
		}
	}, [graph.nodes, startNodeId, targetNodeId]);

	useEffect(() => {
		if (isDirected) return;
		setGraph(currentGraph => {
			let hasChanged = false;
			const newEdges = [...currentGraph.edges];
			const edgeSet = new Set(
				currentGraph.edges.map(e => `${e.from}->${e.to}`)
			);
			currentGraph.edges.forEach(edge => {
				const reverseKey = `${edge.to}->${edge.from}`;
				if (!edgeSet.has(reverseKey)) {
					newEdges.push({
						from: edge.to,
						to: edge.from,
						weight: edge.weight,
					});
					hasChanged = true;
				}
			});
			if (hasChanged) return { ...currentGraph, edges: newEdges };
			return currentGraph;
		});
	}, [isDirected, graph]);

	const handlePresetChange = useCallback(id => {
		const preset = GRAPH_PRESETS[id];
		if (!preset) return;
		setPresetId(id);
		setGraph(cloneGraph(preset.graph));
		setIsDirected(preset.isDirected);
		setIsWeighted(preset.isWeighted);
		setStartNodeId(preset.startNodeId || preset.graph.nodes[0]?.id || '');
		setTargetNodeId(preset.targetNodeId || '');
		setAlgorithmId(preset.algorithmId || 'bfs');
		setSelectedNodeId(null);
		setSelectedCell(null);
	}, []);

	const handleAlgorithmChange = useCallback(
		nextAlgorithmId => {
			setAlgorithmId(nextAlgorithmId);
			if (nextAlgorithmId === 'maxflow') {
				const source = startNodeId || graph.nodes[0]?.id || '';
				const sink =
					targetNodeId && targetNodeId !== source
						? targetNodeId
						: [...graph.nodes].reverse().find(node => node.id !== source)?.id ||
							graph.nodes.find(node => node.id !== source)?.id ||
							'';
				setTargetNodeId(sink);
			}
		},
		[graph.nodes, startNodeId, targetNodeId]
	);

	const handleNodeClick = useCallback(
		(nodeId, modifiers = {}) => {
			onUserInteract?.();
			if (modifiers.shift) {
				setTargetNodeId(prev => (prev === nodeId ? '' : nodeId));
			} else {
				setSelectedNodeId(prev => (prev === nodeId ? null : nodeId));
				setStartNodeId(nodeId);
			}
		},
		[onUserInteract]
	);

	const handleNodePositionChange = useCallback((nodeId, position) => {
		setGraph(currentGraph => ({
			...currentGraph,
			nodes: currentGraph.nodes.map(node =>
				node.id === nodeId ? { ...node, ...position } : node
			),
		}));
	}, []);

	const handleListUpdate = useCallback(
		(inputValue, sourceNodeId) => {
			const newGraph = parseAndUpdateGraph(
				inputValue,
				sourceNodeId,
				graph,
				isWeighted,
				isDirected
			);
			setGraph(newGraph);
		},
		[graph, isWeighted, isDirected]
	);

	const handleMatrixUpdate = useCallback(
		(newValue, fromIndex, toIndex) => {
			setGraph(currentGraph => {
				const fromNode = currentGraph.nodes[fromIndex];
				const toNode = currentGraph.nodes[toIndex];
				if (!fromNode || !toNode) return currentGraph;
				const newEdges = currentGraph.edges.filter(
					edge =>
						!(edge.from === fromNode.id && edge.to === toNode.id) &&
						!(edge.from === toNode.id && edge.to === fromNode.id)
				);
				if (newValue > 0) {
					const weight = isWeighted ? newValue : 1;
					newEdges.push({ from: fromNode.id, to: toNode.id, weight });
					if (!isDirected) {
						newEdges.push({
							from: toNode.id,
							to: fromNode.id,
							weight,
						});
					}
				}
				return { ...currentGraph, edges: newEdges };
			});
		},
		[isDirected, isWeighted]
	);

	const handleAddNewNode = useCallback(() => {
		setGraph(currentGraph => {
			let nextCharCode = 65;
			if (currentGraph.nodes.length > 0) {
				const highestCharCode = Math.max(
					...currentGraph.nodes.map(node => node.id.charCodeAt(0))
				);
				nextCharCode = highestCharCode + 1;
			}
			const newNodeId = String.fromCharCode(nextCharCode);
			const newNode = {
				id: newNodeId,
				x: 250 + Math.random() * 200,
				y: 150 + Math.random() * 200,
				label: newNodeId,
			};
			const newNodes = [...currentGraph.nodes, newNode];
			let newEdges = [...currentGraph.edges];
			if (currentGraph.nodes.length > 0) {
				const randomEdgeIndex = Math.floor(
					Math.random() * currentGraph.nodes.length
				);
				const randomEdgeNodeId = currentGraph.nodes[randomEdgeIndex].id;
				newEdges.push({
					from: newNodeId,
					to: randomEdgeNodeId,
					weight: 1,
				});
				if (!isDirected) {
					newEdges.push({
						from: randomEdgeNodeId,
						to: newNodeId,
						weight: 1,
					});
				}
			}
			return { ...currentGraph, nodes: newNodes, edges: newEdges };
		});
	}, [isDirected]);

	const handleDeleteNode = useCallback(
		nodeId => {
			const targetId = nodeId || selectedNodeId;
			if (!targetId) return;
			setGraph(currentGraph => {
				const newEdges = currentGraph.edges.filter(
					edge => edge.from !== targetId && edge.to !== targetId
				);
				const newNodes = currentGraph.nodes.filter(
					node => node.id !== targetId
				);
				return { ...currentGraph, edges: newEdges, nodes: newNodes };
			});
			setSelectedNodeId(null);
		},
		[selectedNodeId]
	);

	const handlePlayPause = () => {
		onUserInteract?.();
		// Pressing play at the very end replays from the start.
		if (!isPlaying && stepIndex >= totalSteps - 1) {
			player.replay();
			return;
		}
		player.toggle();
	};

	const handleStepBack = () => {
		onUserInteract?.();
		player.stepBack();
	};

	const handleStepForward = () => {
		onUserInteract?.();
		player.stepForward();
	};

	const handleSeek = step => {
		onUserInteract?.();
		seek(step);
	};

	const handleFirst = () => {
		onUserInteract?.();
		player.first();
	};

	const handleLast = () => {
		onUserInteract?.();
		player.last();
	};

	const statusSuffix = useMemo(() => {
		if (!canStep) return '';
		if (stepIndex >= algorithmSteps.length - 1) return 'done';
		if (isPlaying) return 'running';
		return 'paused';
	}, [canStep, isPlaying, stepIndex, algorithmSteps.length]);

	const lines = GRAPH_ALGORITHMS[algorithmId]?.lines || [];
	const activeLine = currentStep?.line ?? null;

	const viewToggle = (
		<div
			className={styles.viewToggle}
			role="group"
			aria-label="Visualization mode"
		>
			{VIEW_OPTIONS.map(opt => {
				const Icon = opt.icon;
				const isActive = viewMode === opt.value;
				return (
					<button
						key={opt.value}
						type="button"
						className={`${styles.viewBtn} ${isActive ? styles.viewBtnActive : ''}`}
						onClick={() => setViewMode(opt.value)}
						aria-pressed={isActive}
						title={opt.label}
					>
						<Icon size={14} strokeWidth={2} />
						<span>{opt.label}</span>
					</button>
				);
			})}
		</div>
	);

	const canvasContent = (() => {
		if (viewMode === 'list') {
			return (
				<div className={styles.lensContainer}>
					<AdjacencyList
						graph={graph}
						selectedNodeId={selectedNodeId}
						isDirected={isDirected}
						isWeighted={isWeighted}
						onUpdate={handleListUpdate}
						onAddNode={handleAddNewNode}
						onDeleteNode={handleDeleteNode}
					/>
				</div>
			);
		}
		if (viewMode === 'matrix') {
			return (
				<div className={styles.lensContainer}>
					<AdjacencyMatrix
						graph={graph}
						selectedNodeId={selectedNodeId}
						isDirected={isDirected}
						isWeighted={isWeighted}
						onUpdate={handleMatrixUpdate}
						onCellSelect={setSelectedCell}
						onNodeSelect={setSelectedNodeId}
						onAddNode={handleAddNewNode}
						onDeleteNode={handleDeleteNode}
					/>
				</div>
			);
		}
		return (
			<GraphVisualizer
				graph={graph}
				selectedNodeId={selectedNodeId}
				onNodeClick={handleNodeClick}
				isDirected={isDirected}
				isWeighted={isWeighted}
				selectedCell={selectedCell}
				algorithmState={currentStep}
				onNodePositionChange={handleNodePositionChange}
			/>
		);
	})();

	return (
		<div className={styles.shell} ref={playerRef}>
			<GraphHero
				algorithmId={algorithmId}
				onAlgorithmChange={handleAlgorithmChange}
				startNodeId={startNodeId}
				targetNodeId={targetNodeId}
				onClearTarget={() => setTargetNodeId('')}
				presetId={presetId}
				onPresetChange={handlePresetChange}
				isDirected={isDirected}
				onToggleDirected={() => setIsDirected(d => !d)}
				isWeighted={isWeighted}
				onToggleWeighted={() => setIsWeighted(w => !w)}
				onAddNode={handleAddNewNode}
				onDeleteSelected={() => handleDeleteNode(selectedNodeId)}
				selectedNodeId={selectedNodeId}
				statusSuffix={statusSuffix}
			/>

			<div className={styles.body}>
				<section className={styles.canvas} aria-label="Graph canvas">
					<div className={styles.canvasOverlay}>
						<span className={styles.notation}>
							{GRAPH_ALGORITHM_META[algorithmId]?.complexity}
						</span>
						{currentStep?.title && (
							<>
								<span className={styles.notationDot}>·</span>
								<span className={styles.stat}>{currentStep.title}</span>
							</>
						)}
					</div>
					{viewMode === 'graph' && (
						<div className={styles.canvasHint}>
							click a node to set <strong>start</strong> · shift-click to set
							<strong> target</strong>
						</div>
					)}
					<div className={styles.canvasStage}>{canvasContent}</div>
					{currentStep?.description && (
						<div className={styles.frameNote} aria-live="polite">
							<span className={styles.frameNoteLabel}>STEP</span>
							<span className={styles.frameNoteText}>
								{currentStep.description}
							</span>
						</div>
					)}
				</section>

				<PseudocodeRail
					lines={lines}
					activeLine={activeLine}
					isRunning={canStep}
				/>
			</div>

			<div className={styles.bar}>
				<StepControlBar
					isPlaying={isPlaying}
					canStep={canStep}
					currentStep={stepIndex}
					totalSteps={totalSteps}
					speed={player.speed}
					speedOptions={SPEED_OPTIONS}
					onPlayPause={handlePlayPause}
					onStepBack={handleStepBack}
					onStepForward={handleStepForward}
					onSeek={handleSeek}
					onFirst={handleFirst}
					onLast={handleLast}
					onSpeedChange={player.setSpeed}
					scopeRef={playerRef}
					rightSlot={viewToggle}
				/>
			</div>
		</div>
	);
};

export default GraphDashboard;
