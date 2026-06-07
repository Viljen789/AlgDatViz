import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import Button from '../../common/Button/Button.jsx';
import StepControlBar from '../../common/StepControlBar/StepControlBar.jsx';
import {
	FrameTrace,
	PseudoState,
	usePlayback,
} from '../../common/PlaybackEngine/index.js';
import {
	MAXFLOW_PSEUDO,
	buildMaxFlowTrace,
	buildResidual,
	buildStateRows,
	edgeKey,
} from './maxFlowTrace.js';
import {
	MAXFLOW_ALGORITHMS,
	MAXFLOW_ALGO_ORDER,
	MAXFLOW_PRESETS,
} from './maxFlowMeta.js';
import { buildEdges, projectNodes, VIEW_H, VIEW_W } from './graphLayout.js';
import styles from './MaxFlowPlayground.module.css';

const INITIAL_PRESET = MAXFLOW_PRESETS[0];

const SPEED_OPTIONS = [
	{ value: 25, label: '0.5×' },
	{ value: 100, label: '1×' },
	{ value: 200, label: '2×' },
	{ value: 320, label: '5×' },
];

const PSEUDO_FOR = {
	fordFulkerson: MAXFLOW_PSEUDO.fordFulkerson,
	edmondsKarp: MAXFLOW_PSEUDO.edmondsKarp,
};

const NODE_R = 6;

// A single idle frame so the network renders before any run, sharing the trace
// frame shape (zero flow, residual = capacities).
const idleFrame = network => {
	const flow = {};
	network.edges.forEach(e => {
		flow[edgeKey(e.from, e.to)] = 0;
	});
	const residual = buildResidual(
		network.edges.map(e => ({ ...e })),
		flow
	);
	return {
		flow,
		value: 0,
		residual,
		path: null,
		bottleneck: null,
		reachable: [],
		minCut: null,
		phase: 'idle',
		line: null,
		title: 'Ready',
		description:
			'Pick an algorithm, then run. Both augment until no augmenting path remains; only the path choice differs.',
		augmentations: 0,
	};
};

// The set of ORIGINAL edge keys touched by the current augmenting path.
const pathEdgeSet = path => {
	const s = new Set();
	if (!path) return s;
	path.forEach(re => s.add(re.edgeKey));
	return s;
};
// The set of vertices on the current augmenting path.
const pathNodeSet = (path, source) => {
	const s = new Set();
	if (!path) return s;
	s.add(source);
	path.forEach(re => s.add(re.to));
	return s;
};

/**
 * MaxFlowPlayground — the interactive maximum-flow sandbox.
 *
 * Runs Ford-Fulkerson and Edmonds-Karp on a shared flow network, both driven by
 * the SAME augment-until-stuck loop over the residual network through the shared
 * PlaybackEngine (step / scrub / replay / speed + scoped keyboard). The current
 * augmenting path glows on the network, edge labels show flow/capacity, and the
 * residual capacities update in lockstep with the synced pseudocode (PseudoState)
 * and live state (the path, the bottleneck, the flow value, the min-cut capacity
 * once revealed). Switching algorithms keeps the same network so the "same loop,
 * different path choice" idea is felt directly.
 */
const MaxFlowPlayground = ({ onUserInteract }) => {
	const playerRef = useRef(null);

	const [presetId, setPresetId] = useState(INITIAL_PRESET.id);
	const [network, setNetwork] = useState(INITIAL_PRESET.network);
	const [algorithmId, setAlgorithmId] = useState(INITIAL_PRESET.algorithmId);

	const [frames, setFrames] = useState(() => [idleFrame(INITIAL_PRESET.network)]);

	const player = usePlayback(frames, { speed: 100 });
	const { currentStep, currentFrame, totalSteps, seek, play } = player;

	const algo = MAXFLOW_ALGORITHMS[algorithmId];
	const frame = currentFrame || frames[0];

	const projected = useMemo(() => projectNodes(network.nodes), [network]);
	const drawEdges = useMemo(
		() => buildEdges(network.edges, projected),
		[network, projected]
	);

	const canStep = totalSteps > 1;
	const lines = useMemo(() => PSEUDO_FOR[algorithmId] || [], [algorithmId]);
	const activeLine = frame?.line ?? null;
	const stateRows = useMemo(() => buildStateRows(frame), [frame]);

	const notify = useCallback(() => onUserInteract?.(), [onUserInteract]);

	const handleRun = useCallback(() => {
		notify();
		const result = buildMaxFlowTrace(algorithmId, network);
		if (!result.frames.length) return;
		setFrames(result.frames);
	}, [notify, algorithmId, network]);

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
		setNetwork(preset.network);
		setAlgorithmId(preset.algorithmId);
		const idle = [idleFrame(preset.network)];
		framesKeyRef.current = idle;
		setFrames(idle);
	}, []);

	const handlePresetChange = useCallback(
		id => {
			const preset = MAXFLOW_PRESETS.find(p => p.id === id);
			if (!preset) return;
			notify();
			setPresetId(id);
			applyPreset(preset);
		},
		[notify, applyPreset]
	);

	const handleReset = useCallback(() => {
		notify();
		const preset = MAXFLOW_PRESETS.find(p => p.id === presetId) || INITIAL_PRESET;
		const idle = [idleFrame(preset.network)];
		framesKeyRef.current = idle;
		setNetwork(preset.network);
		setFrames(idle);
	}, [notify, presetId]);

	const handleAlgorithmChange = useCallback(
		id => {
			notify();
			setAlgorithmId(id);
			const idle = [idleFrame(network)];
			framesKeyRef.current = idle;
			setFrames(idle);
		},
		[notify, network]
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
	const pathSet = useMemo(() => pathEdgeSet(frame?.path), [frame]);
	const pathNodes = useMemo(
		() => pathNodeSet(frame?.path, network.source),
		[frame, network.source]
	);
	const residualByKey = useMemo(() => {
		const m = {};
		(frame?.residual || []).forEach(re => {
			m[`${re.from}->${re.to}`] = re;
		});
		return m;
	}, [frame]);
	const sSide = useMemo(
		() => new Set(frame?.minCut ? frame.minCut.S : []),
		[frame]
	);
	const cutEdgeSet = useMemo(() => {
		const s = new Set();
		if (frame?.minCut)
			frame.minCut.edges.forEach(e => s.add(edgeKey(e.from, e.to)));
		return s;
	}, [frame]);
	const showCut = Boolean(frame?.minCut);

	const flowOf = e => frame?.flow?.[edgeKey(e.from, e.to)] || 0;

	return (
		<div className={styles.shell} ref={playerRef}>
			{/* ---------- Controls ---------- */}
			<div className={styles.controls}>
				<div
					className={styles.algoTabs}
					role="tablist"
					aria-label="Maximum-flow algorithm"
				>
					{MAXFLOW_ALGO_ORDER.map(id => {
						const item = MAXFLOW_ALGORITHMS[id];
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
						aria-label="Reset network"
						title="Reset network"
					>
						<RotateCcw size={14} strokeWidth={2} />
						<span>Reset</span>
					</Button>
				</div>
			</div>

			<p className={styles.opLine}>{algo?.oneLine}</p>

			<div className={styles.scenarioRow}>
				<span className={styles.scenarioLabel}>Network</span>
				<div className={styles.scenarioChips} role="group">
					{MAXFLOW_PRESETS.map(preset => (
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
					<span className={styles.statValue}>{frame?.value ?? 0}</span>
					<span className={styles.statLabel}>flow value |f|</span>
				</div>
				<div className={styles.stat}>
					<span className={styles.statValue}>{frame?.augmentations ?? 0}</span>
					<span className={styles.statLabel}>augmentations</span>
				</div>
				<div className={styles.stat}>
					<span className={styles.statValue}>{frame?.bottleneck ?? '—'}</span>
					<span className={styles.statLabel}>bottleneck</span>
				</div>
				<div className={`${styles.stat} ${showCut ? styles.statCut : ''}`}>
					<span className={styles.statValue}>
						{showCut ? frame.minCut.capacity : '—'}
					</span>
					<span className={styles.statLabel}>min-cut cap</span>
				</div>
			</div>

			{/* ---------- Canvas + trace ---------- */}
			<div className={styles.body}>
				<section className={styles.canvas} aria-label="Flow-network view">
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
								id="pgmfArrow"
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
								id="pgmfArrowHot"
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

						{showCut && (
							<line x1="50" y1="4" x2="50" y2="96" className={styles.cutLine} />
						)}

						{drawEdges.map(edge => {
							const key = edgeKey(edge.from, edge.to);
							const onPath = pathSet.has(key);
							const isCutEdge = cutEdgeSet.has(key);
							const f = flowOf(edge);
							const re = residualByKey[key];
							const saturated = f >= edge.capacity && f > 0;
							const hot = onPath || isCutEdge;
							const cls = [styles.edge];
							if (saturated) cls.push(styles.edgeSaturated);
							else if (f > 0) cls.push(styles.edgeFlowing);
							if (isCutEdge) cls.push(styles.edgeCut);
							if (onPath) cls.push(styles.edgePath);

							// Label: flow/capacity, with residual in subscript-style.
							const label = `${f}/${edge.capacity}`;
							const resLabel = re ? `r${re.residual}` : '';

							return (
								<g key={key}>
									<path
										d={edge.path}
										className={cls.join(' ')}
										fill="none"
										markerEnd={`url(#${hot ? 'pgmfArrowHot' : 'pgmfArrow'})`}
									/>
									<text
										x={edge.lx}
										y={edge.ly}
										className={`${styles.weight} ${
											onPath || saturated ? styles.weightHot : ''
										}`}
										textAnchor="middle"
										dominantBaseline="central"
									>
										{label}
									</text>
									{resLabel && (
										<text
											x={edge.lx}
											y={edge.ly + 4}
											className={styles.residualLabel}
											textAnchor="middle"
											dominantBaseline="central"
										>
											{resLabel}
										</text>
									)}
								</g>
							);
						})}

						{projected.map(node => {
							const isSource = node.id === network.source;
							const isSink = node.id === network.sink;
							const onPath = pathNodes.has(node.id);
							const inS = showCut ? sSide.has(node.id) : false;
							const cls = [styles.node];
							if (onPath) cls.push(styles.nodePath);
							if (isSource) cls.push(styles.nodeSource);
							else if (isSink) cls.push(styles.nodeSink);
							if (showCut) cls.push(inS ? styles.nodeInS : styles.nodeInT);
							return (
								<g
									key={node.id}
									transform={`translate(${node.px}, ${node.py})`}
								>
									<circle r={NODE_R} className={cls.join(' ')} />
									<text
										className={styles.nodeText}
										textAnchor="middle"
										dominantBaseline="central"
									>
										{node.id}
									</text>
								</g>
							);
						})}
					</svg>
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

export default MaxFlowPlayground;
