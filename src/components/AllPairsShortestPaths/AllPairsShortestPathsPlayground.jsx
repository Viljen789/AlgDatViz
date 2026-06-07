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
	FW_PSEUDO,
	buildStateRows,
	floydWarshall,
	formatDist,
	reconstructPath,
	transitiveClosure,
} from './fwTrace.js';
import {
	APSP_MODES,
	APSP_MODE_ORDER,
	APSP_PRESETS,
} from './apspMeta.js';
import { buildEdges, projectNodes, VIEW_H, VIEW_W } from './graphLayout.js';
import styles from './AllPairsShortestPathsPlayground.module.css';

const INITIAL_PRESET = APSP_PRESETS[0];

const SPEED_OPTIONS = [
	{ value: 25, label: '0.5×' },
	{ value: 100, label: '1×' },
	{ value: 200, label: '2×' },
	{ value: 360, label: '5×' },
];

const NODE_R = 7;

// Build a precomputed trace for the chosen mode + graph.
const buildTrace = (modeId, graph) =>
	modeId === 'transitiveClosure'
		? transitiveClosure(graph)
		: floydWarshall(graph);

// A single idle frame so the matrix renders before any run, sharing the trace
// frame shape (k=0 layer, no active cell).
const idleFrame = (modeId, graph) => {
	const result = buildTrace(modeId, graph);
	const first = result.frames[0];
	return {
		...first,
		title: 'Ready',
		description:
			modeId === 'transitiveClosure'
				? 'The boolean reachability matrix, before any intermediate hops. Run to fill it across k with OR/AND.'
				: 'The matrix starts as the direct edges (k = 0). Run to fill it across k — the same triple loop, in motion.',
		phase: 'idle',
		line: null,
		ids: result.ids,
	};
};

const cellKey = (i, j) => `${i},${j}`;

/**
 * AllPairsShortestPathsPlayground — the interactive APSP sandbox.
 *
 * Runs Floyd-Warshall (and its transitive-closure twin) on a shared weighted
 * digraph, driven by the shared PlaybackEngine (step / scrub / replay / speed +
 * scoped keyboard). The V×V matrix and the graph stay in sync: the cell being
 * relaxed (d[i][j]) glows while the two cells it reads (d[i][k], d[k][j]) are
 * marked, and the synced pseudocode (PseudoState) + live state (k, i, j, the two
 * reads, the candidate sum, the update count) update in lockstep. Switching modes
 * keeps the same graph so "same loop, different semiring" is felt directly.
 */
const AllPairsShortestPathsPlayground = ({ onUserInteract }) => {
	const playerRef = useRef(null);

	const [presetId, setPresetId] = useState(INITIAL_PRESET.id);
	const [graph, setGraph] = useState(INITIAL_PRESET.graph);
	const [modeId, setModeId] = useState(INITIAL_PRESET.mode);

	const [frames, setFrames] = useState(() => [
		idleFrame(INITIAL_PRESET.mode, INITIAL_PRESET.graph),
	]);

	const player = usePlayback(frames, { speed: 100 });
	const { currentStep, currentFrame, totalSteps, seek, play } = player;

	const mode = APSP_MODES[modeId];
	const isClosure = modeId === 'transitiveClosure';
	const frame = currentFrame || frames[0];

	// Node ids + geometry recomputed when the graph changes.
	const ids = useMemo(() => graph.nodes.map(n => n.id), [graph]);
	const projected = useMemo(() => projectNodes(graph.nodes), [graph]);
	const drawEdges = useMemo(
		() => buildEdges(graph.edges, projected),
		[graph, projected]
	);

	const canStep = totalSteps > 1;
	const lines = useMemo(() => FW_PSEUDO[modeId] || [], [modeId]);
	const activeLine = frame?.line ?? null;
	const stateRows = useMemo(
		() => (isClosure ? closureStateRows(frame, ids) : buildStateRows(frame, ids)),
		[frame, ids, isClosure]
	);

	// The matrix this frame: distance frames carry `dist`, closure carry `reach`.
	const matrix = isClosure ? frame?.reach : frame?.dist;

	const notify = useCallback(() => onUserInteract?.(), [onUserInteract]);

	const handleRun = useCallback(() => {
		notify();
		const result = buildTrace(modeId, graph);
		if (!result.frames.length) return;
		setFrames(result.frames);
	}, [notify, modeId, graph]);

	// When a fresh timeline arrives, jump to the start and play it.
	const framesKeyRef = useRef(null);
	useEffect(() => {
		if (frames.length <= 1) return;
		if (framesKeyRef.current === frames) return;
		framesKeyRef.current = frames;
		seek(0);
		play();
	}, [frames, seek, play]);

	const applyState = useCallback((nextMode, nextGraph) => {
		const idle = [idleFrame(nextMode, nextGraph)];
		framesKeyRef.current = idle;
		setFrames(idle);
	}, []);

	const handlePresetChange = useCallback(
		id => {
			const preset = APSP_PRESETS.find(p => p.id === id);
			if (!preset) return;
			notify();
			setPresetId(id);
			setGraph(preset.graph);
			setModeId(preset.mode);
			applyState(preset.mode, preset.graph);
		},
		[notify, applyState]
	);

	const handleModeChange = useCallback(
		id => {
			notify();
			setModeId(id);
			applyState(id, graph);
		},
		[notify, graph, applyState]
	);

	const handleReset = useCallback(() => {
		notify();
		const preset = APSP_PRESETS.find(p => p.id === presetId) || INITIAL_PRESET;
		setGraph(preset.graph);
		setModeId(preset.mode);
		applyState(preset.mode, preset.graph);
	}, [notify, presetId, applyState]);

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

	// Final-answer flags read from the last computed frame.
	const finalResult = useMemo(() => buildTrace(modeId, graph), [modeId, graph]);
	const negativeCycle = !isClosure && finalResult.negativeCycle;

	// Highlight sets from the current frame.
	const write = frame?.write || null;
	const readIK = frame?.readIK || null;
	const readKJ = frame?.readKJ || null;
	const activeK = frame?.k != null ? frame.k : null;
	const sameCell = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];

	// Active legs on the graph: the i→k and k→j edges being read this beat.
	const ikEdge = readIK ? cellKey(readIK[0], readIK[1]) : null;
	const kjEdge = readKJ ? cellKey(readKJ[0], readKJ[1]) : null;
	const idIdx = useMemo(
		() => Object.fromEntries(ids.map((id, i) => [id, i])),
		[ids]
	);

	// Reconstructed paths summary (distance mode, when finished + no neg cycle).
	const pathSummary = useMemo(() => {
		if (isClosure || negativeCycle) return null;
		if (currentStep < totalSteps - 1) return null;
		const i = '1' in idIdx ? '1' : ids[0];
		// Show one illustrative reconstructed path on the shared / simple graphs.
		const target = ids[ids.length - 1];
		const path = reconstructPath(finalResult.pred, ids, i, target);
		if (!path || path.length < 2) return null;
		return { from: i, to: target, path, dist: finalResult.dist[idIdx[i]][idIdx[target]] };
	}, [isClosure, negativeCycle, currentStep, totalSteps, finalResult, ids, idIdx]);

	return (
		<div className={styles.shell} ref={playerRef}>
			{/* ---------- Controls ---------- */}
			<div className={styles.controls}>
				<div
					className={styles.modeTabs}
					role="tablist"
					aria-label="All-pairs computation"
				>
					{APSP_MODE_ORDER.map(id => {
						const item = APSP_MODES[id];
						const active = id === modeId;
						return (
							<button
								key={id}
								type="button"
								role="tab"
								aria-selected={active}
								className={`${styles.modeTab} ${active ? styles.modeTabActive : ''}`}
								onClick={() => handleModeChange(id)}
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

			<p className={styles.opLine}>{mode?.oneLine}</p>

			<div className={styles.scenarioRow}>
				<span className={styles.scenarioLabel}>Scenario</span>
				<div className={styles.scenarioChips} role="group">
					{APSP_PRESETS.map(preset => (
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
					<span className={styles.statValue}>{mode?.complexity}</span>
					<span className={styles.statLabel}>complexity</span>
				</div>
				<div className={styles.stat}>
					<span className={styles.statValue}>
						{activeK == null ? '—' : ids[activeK]}
					</span>
					<span className={styles.statLabel}>k (via)</span>
				</div>
				<div className={styles.stat}>
					<span className={styles.statValue}>
						{isClosure ? frame?.added ?? 0 : frame?.updates ?? 0}
					</span>
					<span className={styles.statLabel}>
						{isClosure ? 'new links' : 'updates'}
					</span>
				</div>
				<div className={styles.stat}>
					<span className={styles.statValue}>{frame?.compares ?? 0}</span>
					<span className={styles.statLabel}>compares</span>
				</div>
				<div className={`${styles.stat} ${negativeCycle ? styles.statWarn : ''}`}>
					<span className={styles.statValue}>
						{isClosure
							? 'reachability'
							: negativeCycle
								? 'neg cycle'
								: 'negatives ok'}
					</span>
					<span className={styles.statLabel}>weights</span>
				</div>
			</div>

			{/* ---------- Canvas + trace ---------- */}
			<div className={styles.body}>
				<section className={styles.canvas} aria-label="All-pairs graph + matrix">
					<div className={styles.canvasOverlay} aria-hidden="true">
						<span className={styles.mono}>{mode?.name}</span>
						{frame?.title && (
							<>
								<span className={styles.dot}>·</span>
								<span className={styles.mono}>{frame.title}</span>
							</>
						)}
					</div>

					<div className={styles.canvasInner}>
						<svg
							viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
							className={styles.svg}
							preserveAspectRatio="xMidYMid meet"
						>
							<defs>
								<marker
									id="pgApspArrow"
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
									id="pgApspArrowHot"
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
								const i = idIdx[edge.from];
								const j = idIdx[edge.to];
								const key = cellKey(i, j);
								const isLeg = key === ikEdge || key === kjEdge;
								const cls = [styles.edge];
								if (isLeg) cls.push(styles.edgeLeg);
								return (
									<g key={`${edge.from}->${edge.to}`}>
										<path
											d={edge.path}
											className={cls.join(' ')}
											fill="none"
											markerEnd={`url(#${isLeg ? 'pgApspArrowHot' : 'pgApspArrow'})`}
										/>
										<text
											x={edge.lx}
											y={edge.ly}
											className={`${styles.weight} ${isLeg ? styles.weightHot : ''}`}
											textAnchor="middle"
											dominantBaseline="central"
										>
											{edge.weight}
										</text>
									</g>
								);
							})}

							{projected.map(node => {
								const ni = idIdx[node.id];
								const isVia = activeK != null && ni === activeK;
								const isFrom = write && ni === write[0];
								const isTo = write && ni === write[1];
								const cls = [styles.node];
								if (isVia) cls.push(styles.nodeVia);
								if (isFrom) cls.push(styles.nodeFrom);
								if (isTo) cls.push(styles.nodeTo);
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

						{/* The live V×V matrix */}
						<div className={styles.matrixWrap}>
							<table className={styles.matrix}>
								<thead>
									<tr>
										<th scope="col" className={styles.corner}>
											{isClosure ? 'T' : 'd'}
										</th>
										{ids.map((id, j) => (
											<th
												key={id}
												scope="col"
												className={write && j === write[1] ? styles.colHot : ''}
											>
												{id}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{ids.map((rowId, i) => (
										<tr key={rowId}>
											<th
												scope="row"
												className={`${styles.rowKey} ${
													write && i === write[0] ? styles.rowHot : ''
												} ${activeK === i ? styles.rowVia : ''}`}
											>
												{rowId}
											</th>
											{ids.map((colId, j) => {
												const v = matrix?.[i]?.[j];
												const cls = [styles.cell];
												if (sameCell([i, j], write)) cls.push(styles.cellWrite);
												if (sameCell([i, j], readIK)) cls.push(styles.cellRead);
												if (sameCell([i, j], readKJ)) cls.push(styles.cellRead);
												if (activeK === j && !write) cls.push(styles.colVia);
												const display = isClosure
													? v
														? '✓'
														: '·'
													: formatDist(v);
												return (
													<td key={colId} className={cls.join(' ')}>
														{display}
													</td>
												);
											})}
										</tr>
									))}
								</tbody>
							</table>
							{pathSummary && (
								<div className={styles.pathRow} aria-live="polite">
									<span className={styles.pathLabel}>path {pathSummary.from}→{pathSummary.to}</span>
									<span className={styles.pathSeq}>
										{pathSummary.path.join(' → ')} ({formatDist(pathSummary.dist)})
									</span>
								</div>
							)}
						</div>
					</div>
				</section>

				<div className={styles.trace}>
					<FrameTrace
						eyebrow={mode?.name}
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

// Live-state rows for the transitive-closure mode (booleans instead of sums).
const closureStateRows = (frame, ids = []) => {
	if (!frame) return [];
	const label = idx => (idx == null ? '—' : ids[idx] ?? idx + 1);
	const cell = c => (c ? `${ids[c[0]] ?? c[0]}→${ids[c[1]] ?? c[1]}` : '—');
	const active = frame.phase === 'improve' || frame.phase === 'keep';
	const bool = v => (v === true ? 'true' : v === false ? 'false' : '—');
	const readIK = frame.readIK ? frame.reach[frame.readIK[0]][frame.readIK[1]] : null;
	const readKJ = frame.readKJ ? frame.reach[frame.readKJ[0]][frame.readKJ[1]] : null;
	return [
		{
			id: 'k',
			label: 'k (via)',
			value: frame.k == null ? '—' : label(frame.k),
			active: active || frame.phase === 'k-round',
		},
		{
			id: 'ij',
			label: '(i, j)',
			value:
				frame.i == null || frame.j == null
					? '—'
					: `(${label(frame.i)}, ${label(frame.j)})`,
			active,
		},
		{ id: 'tik', label: 'T[i][k]', value: bool(readIK), active },
		{ id: 'tkj', label: 'T[k][j]', value: bool(readKJ), active },
		{
			id: 'and',
			label: 'T[i][k] AND T[k][j]',
			value: bool(readIK === true && readKJ === true),
			active: frame.phase === 'improve',
		},
		{
			id: 'write',
			label: 'making reachable',
			value: cell(frame.improved ? frame.write : null),
			active: frame.phase === 'improve',
		},
		{ id: 'added', label: 'new links', value: frame.added ?? 0, active: frame.phase === 'improve' },
	];
};

export default AllPairsShortestPathsPlayground;
