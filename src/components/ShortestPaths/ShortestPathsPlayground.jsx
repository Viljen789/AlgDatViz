import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import Button from '../../common/Button/Button.jsx';
import StepControlBar from '../../common/StepControlBar/StepControlBar.jsx';
import {
	FrameTrace,
	PseudoState,
	usePlayback,
} from '../../common/PlaybackEngine/index.js';
import { SSSP_PSEUDO, buildSsspTrace, buildStateRows } from './relaxTrace.js';
import { SSSP_ALGORITHMS, SSSP_ALGO_ORDER, SSSP_PRESETS } from './ssspMeta.js';
import { buildEdges, projectNodes, VIEW_H, VIEW_W } from './graphLayout.js';
import styles from './ShortestPathsPlayground.module.css';

const INITIAL_PRESET = SSSP_PRESETS[0];

const SPEED_OPTIONS = [
	{ value: 25, label: '0.5×' },
	{ value: 100, label: '1×' },
	{ value: 200, label: '2×' },
	{ value: 320, label: '5×' },
];

// The pseudocode rail per algorithm — the shared Relax block lines up across all
// three, so switching algorithms re-uses the SAME relax animation, just on a
// different schedule of calls.
const PSEUDO_FOR = {
	bellmanFord: SSSP_PSEUDO.bellmanFord,
	dagShortestPaths: SSSP_PSEUDO.dagShortestPaths,
	dijkstra: SSSP_PSEUDO.dijkstra,
};

const NODE_R = 6;

// A single idle frame so the graph renders before any run, sharing the trace
// frame shape (∞ distances, no predecessors).
const idleFrame = (graph, source) => {
	const dist = {};
	const pred = {};
	graph.nodes.forEach(n => {
		dist[n.id] = n.id === source ? 0 : null;
		pred[n.id] = null;
	});
	return {
		dist,
		pred,
		edge: null,
		improved: false,
		settled: [],
		active: null,
		order: [],
		negativeCycle: false,
		phase: 'idle',
		line: null,
		title: 'Ready',
		description:
			'Pick an algorithm, then run. Every one is the same Relax — in a different order.',
		relaxations: 0,
		improvements: 0,
	};
};

const edgeKey = e => `${e.from}->${e.to}`;
const predTreeEdges = pred => {
	const s = new Set();
	if (!pred) return s;
	Object.entries(pred).forEach(([v, u]) => {
		if (u != null) s.add(`${u}->${v}`);
	});
	return s;
};

/**
 * ShortestPathsPlayground — the interactive SSSP sandbox.
 *
 * Runs Bellman-Ford, DAG-SP, and Dijkstra on a shared weighted digraph, all
 * driven by the SAME Relax primitive through the shared PlaybackEngine (step /
 * scrub / replay / speed + scoped keyboard). The relaxing edge glows on the
 * graph while the dist[]/pred[] table updates in lockstep with the synced
 * pseudocode (PseudoState) and live state (the edge, the dist[u]+w test, the
 * running relaxation counts). Switching algorithms keeps the same graph so the
 * "same move, different schedule" idea is felt directly.
 */
const ShortestPathsPlayground = ({ onUserInteract }) => {
	const playerRef = useRef(null);

	const [presetId, setPresetId] = useState(INITIAL_PRESET.id);
	const [graph, setGraph] = useState(INITIAL_PRESET.graph);
	const [source, setSource] = useState(INITIAL_PRESET.source);
	const [algorithmId, setAlgorithmId] = useState(INITIAL_PRESET.algorithmId);

	const [frames, setFrames] = useState(() => [
		idleFrame(INITIAL_PRESET.graph, INITIAL_PRESET.source),
	]);

	const player = usePlayback(frames, { speed: 100 });
	const { currentStep, currentFrame, totalSteps, seek, play } = player;

	const algo = SSSP_ALGORITHMS[algorithmId];
	const frame = currentFrame || frames[0];

	// Geometry recomputed when the graph changes.
	const projected = useMemo(() => projectNodes(graph.nodes), [graph]);
	const drawEdges = useMemo(
		() => buildEdges(graph.edges, projected),
		[graph, projected]
	);

	const ids = graph.nodes.map(n => n.id);
	const canStep = totalSteps > 1;
	const lines = useMemo(() => PSEUDO_FOR[algorithmId] || [], [algorithmId]);
	const activeLine = frame?.line ?? null;
	const stateRows = useMemo(() => buildStateRows(frame), [frame]);

	const notify = useCallback(() => onUserInteract?.(), [onUserInteract]);

	const handleRun = useCallback(() => {
		notify();
		const result = buildSsspTrace(algorithmId, graph, { source });
		if (!result.frames.length) return;
		setFrames(result.frames);
	}, [notify, algorithmId, graph, source]);

	// When a fresh timeline arrives, jump to the start and play it.
	const framesKeyRef = useRef(null);
	useEffect(() => {
		if (frames.length <= 1) return;
		if (framesKeyRef.current === frames) return;
		framesKeyRef.current = frames;
		seek(0);
		play();
	}, [frames, seek, play]);

	const applyPreset = useCallback(preset => {
		setGraph(preset.graph);
		setSource(preset.source);
		setAlgorithmId(preset.algorithmId);
		const idle = [idleFrame(preset.graph, preset.source)];
		framesKeyRef.current = idle;
		setFrames(idle);
	}, []);

	const handlePresetChange = useCallback(
		id => {
			const preset = SSSP_PRESETS.find(p => p.id === id);
			if (!preset) return;
			notify();
			setPresetId(id);
			applyPreset(preset);
		},
		[notify, applyPreset]
	);

	const handleReset = useCallback(() => {
		notify();
		const preset = SSSP_PRESETS.find(p => p.id === presetId) || INITIAL_PRESET;
		const idle = [idleFrame(preset.graph, preset.source)];
		framesKeyRef.current = idle;
		setGraph(preset.graph);
		setSource(preset.source);
		setFrames(idle);
	}, [notify, presetId]);

	const handleAlgorithmChange = useCallback(
		id => {
			notify();
			setAlgorithmId(id);
			const idle = [idleFrame(graph, source)];
			framesKeyRef.current = idle;
			setFrames(idle);
		},
		[notify, graph, source]
	);

	// Click a node to make it the source: re-init distances (0 here, ∞ elsewhere)
	// and return the timeline to the idle frame, mirroring handleAlgorithmChange.
	const handleSourceChange = useCallback(
		id => {
			if (id === source) return;
			notify();
			setSource(id);
			const idle = [idleFrame(graph, id)];
			framesKeyRef.current = idle;
			setFrames(idle);
		},
		[notify, graph, source]
	);

	const handlePlayPause = useCallback(() => {
		notify();
		if (frames.length <= 1) {
			handleRun();
			return;
		}
		if (currentStep >= totalSteps - 1) {
			player.replay();
			return;
		}
		player.toggle();
	}, [notify, frames.length, currentStep, totalSteps, player, handleRun]);

	const narration = useMemo(() => {
		if (!frame) return null;
		return frame.description || frame.title;
	}, [frame]);

	// Highlight sets from the current frame.
	const activeEdgeKey = frame?.edge ? edgeKey(frame.edge) : null;
	const treeSet = useMemo(() => predTreeEdges(frame?.pred), [frame]);
	const settledSet = useMemo(() => new Set(frame?.settled || []), [frame]);
	const activeNode = frame?.active;
	const relaxTarget = frame?.edge ? frame.edge.to : null;
	const relaxSource = frame?.edge ? frame.edge.from : null;
	const improved = frame?.phase === 'relax-improve';
	const isCycle = frame?.phase === 'cycle' && frame?.negativeCycle;

	return (
		<div className={styles.shell} ref={playerRef}>
			{/* ---------- Controls ---------- */}
			<div className={styles.controls}>
				<div
					className={styles.algoTabs}
					role="tablist"
					aria-label="Shortest-path algorithm"
				>
					{SSSP_ALGO_ORDER.map(id => {
						const item = SSSP_ALGORITHMS[id];
						const active = id === algorithmId;
						return (
							<button
								key={id}
								type="button"
								role="tab"
								aria-selected={active}
								className={`${styles.algoTab} ${active ? styles.algoTabActive : ''}`}
								onClick={() => handleAlgorithmChange(id)}
							>
								{item.name}
							</button>
						);
					})}
				</div>

				<div className={styles.actions}>
					<Button variant="primary" size="sm" onClick={handleRun}>
						<Play size={13} strokeWidth={2.4} fill="currentColor" />
						<span>Run</span>
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleReset}
						aria-label="Reset graph"
						title="Reset graph"
					>
						<RotateCcw size={14} strokeWidth={2} />
						<span>Reset</span>
					</Button>
				</div>
			</div>

			<p className={styles.opLine}>{algo?.oneLine}</p>

			<div className={styles.scenarioRow}>
				<span className={styles.scenarioLabel}>Scenario</span>
				<div className={styles.scenarioChips} role="group">
					{SSSP_PRESETS.map(preset => (
						<button
							key={preset.id}
							type="button"
							className={`${styles.scenarioChip} ${
								preset.id === presetId ? styles.scenarioChipActive : ''
							}`}
							aria-pressed={preset.id === presetId}
							onClick={() => handlePresetChange(preset.id)}
							title={preset.intent}
						>
							{preset.label}
						</button>
					))}
				</div>
			</div>

			{/* ---------- Stats ---------- */}
			<div className={styles.stats}>
				<div className={styles.stat}>
					<span className={styles.statValue}>{algo?.complexity}</span>
					<span className={styles.statLabel}>complexity</span>
				</div>
				<div className={styles.stat}>
					<span className={styles.statValue}>{source}</span>
					<span className={styles.statLabel}>source</span>
				</div>
				<div className={styles.stat}>
					<span className={styles.statValue}>{frame?.relaxations ?? 0}</span>
					<span className={styles.statLabel}>relaxations</span>
				</div>
				<div className={styles.stat}>
					<span className={styles.statValue}>{frame?.improvements ?? 0}</span>
					<span className={styles.statLabel}>improving</span>
				</div>
				<div className={`${styles.stat} ${isCycle ? styles.statWarn : ''}`}>
					<span className={styles.statValue}>
						{isCycle
							? 'neg cycle'
							: algo?.handlesNegatives
								? 'negatives ok'
								: '≥ 0 only'}
					</span>
					<span className={styles.statLabel}>weights</span>
				</div>
			</div>

			{/* ---------- Canvas + trace ---------- */}
			<div className={styles.body}>
				<section
					className={styles.canvas}
					aria-label="Shortest-path graph view"
				>
					<div className={styles.canvasHint}>
						click a node to set the <strong>source</strong>
					</div>
					<div className={styles.canvasOverlay} aria-hidden="true">
						<span className={styles.mono}>{algo?.name}</span>
						{frame?.title && (
							<>
								<span className={styles.dot}>·</span>
								<span className={styles.mono}>{frame.title}</span>
							</>
						)}
					</div>

					<svg
						viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
						className={styles.svg}
						preserveAspectRatio="xMidYMid meet"
					>
						<defs>
							<marker
								id="pgArrow"
								viewBox="0 0 10 10"
								refX="8"
								refY="5"
								markerWidth="5"
								markerHeight="5"
								orient="auto-start-reverse"
							>
								<path d="M 0 1 L 9 5 L 0 9 z" className={styles.arrowHead} />
							</marker>
							<marker
								id="pgArrowHot"
								viewBox="0 0 10 10"
								refX="8"
								refY="5"
								markerWidth="5"
								markerHeight="5"
								orient="auto-start-reverse"
							>
								<path d="M 0 1 L 9 5 L 0 9 z" className={styles.arrowHeadHot} />
							</marker>
						</defs>

						{drawEdges.map(edge => {
							const key = edgeKey(edge);
							const isRelax = activeEdgeKey === key;
							const isTree = treeSet.has(key);
							const hot = isRelax || isTree;
							const cls = [styles.edge];
							if (isTree) cls.push(styles.edgeTree);
							if (isRelax)
								cls.push(improved ? styles.edgeImprove : styles.edgeRelax);
							return (
								<g key={key}>
									<line
										x1={edge.x1}
										y1={edge.y1}
										x2={edge.x2}
										y2={edge.y2}
										className={cls.join(' ')}
										markerEnd={`url(#${hot ? 'pgArrowHot' : 'pgArrow'})`}
									/>
									<text
										x={edge.mx}
										y={edge.my}
										className={`${styles.weight} ${isRelax ? styles.weightHot : ''}`}
										textAnchor="middle"
										dominantBaseline="central"
									>
										{edge.weight}
									</text>
								</g>
							);
						})}

						{projected.map(node => {
							const isSource = node.id === source;
							const isSettled = settledSet.has(node.id);
							const isActive = node.id === activeNode;
							const isTarget = node.id === relaxTarget;
							const isFrom = node.id === relaxSource;
							const cls = [styles.node];
							if (isSettled) cls.push(styles.nodeSettled);
							if (isSource) cls.push(styles.nodeSource);
							if (isFrom) cls.push(styles.nodeFrom);
							if (isTarget) cls.push(styles.nodeTarget);
							if (isActive) cls.push(styles.nodeActive);
							return (
								<g
									key={node.id}
									transform={`translate(${node.px}, ${node.py})`}
									className={styles.nodeGroup}
									role="button"
									tabIndex={0}
									aria-pressed={isSource}
									aria-label={
										isSource
											? `Node ${node.id}, current source`
											: `Set node ${node.id} as source`
									}
									onClick={() => handleSourceChange(node.id)}
									onKeyDown={e => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											handleSourceChange(node.id);
										}
									}}
								>
									<circle r={NODE_R} className={cls.join(' ')} />
									<text
										className={styles.nodeText}
										textAnchor="middle"
										dominantBaseline="central"
									>
										{node.id}
									</text>
									<text
										className={styles.nodeDist}
										textAnchor="middle"
										dominantBaseline="central"
										y={-NODE_R - 3}
									>
										{frame?.dist?.[node.id] === null ||
										frame?.dist?.[node.id] === undefined
											? '∞'
											: frame.dist[node.id]}
									</text>
								</g>
							);
						})}
					</svg>

					{/* dist[]/pred[] table under the graph */}
					<div className={styles.tableWrap}>
						<table className={styles.table}>
							<thead>
								<tr>
									<th scope="col">v</th>
									{ids.map(id => (
										<th
											key={id}
											scope="col"
											className={id === relaxTarget ? styles.colActive : ''}
										>
											{id}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								<tr>
									<th scope="row" className={styles.rowKey}>
										dist
									</th>
									{ids.map(id => {
										const d = frame?.dist?.[id];
										return (
											<td
												key={id}
												className={id === relaxTarget ? styles.cellActive : ''}
											>
												{d === null || d === undefined ? '∞' : d}
											</td>
										);
									})}
								</tr>
								<tr>
									<th scope="row" className={styles.rowKey}>
										pred
									</th>
									{ids.map(id => (
										<td
											key={id}
											className={id === relaxTarget ? styles.cellActive : ''}
										>
											{frame?.pred?.[id] ?? '—'}
										</td>
									))}
								</tr>
							</tbody>
						</table>
					</div>
				</section>

				<div className={styles.trace}>
					<FrameTrace
						eyebrow={algo?.name}
						step={currentStep}
						totalSteps={totalSteps}
						narration={narration}
					/>
					<PseudoState
						className={styles.pseudo}
						lines={lines}
						line={activeLine}
						state={stateRows}
						isRunning={activeLine != null}
						label="Pseudocode"
						stateLabel="Live state"
						step={currentStep}
						totalSteps={totalSteps}
					/>
				</div>
			</div>

			{/* ---------- Transport ---------- */}
			<div className={styles.transport}>
				<StepControlBar
					isPlaying={player.isPlaying}
					canStep={canStep}
					currentStep={currentStep}
					totalSteps={totalSteps}
					speed={player.speed}
					speedOptions={SPEED_OPTIONS}
					onPlayPause={handlePlayPause}
					onStepBack={player.stepBack}
					onStepForward={player.stepForward}
					onSeek={seek}
					onFirst={player.first}
					onLast={player.last}
					onSpeedChange={player.setSpeed}
					scopeRef={playerRef}
				/>
			</div>
		</div>
	);
};

export default ShortestPathsPlayground;
