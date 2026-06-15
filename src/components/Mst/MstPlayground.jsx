import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import Button from '../../common/Button/Button.jsx';
import StepControlBar from '../../common/StepControlBar/StepControlBar.jsx';
import {
	usePlayback,
	FrameTrace,
	PseudoState,
} from '../../common/PlaybackEngine/index.js';
import MstGraph from './MstGraph.jsx';
import {
	MST_PSEUDO,
	buildMstTrace,
	idleMstFrame,
	kruskalTrace,
	normalizeEdges,
	primTrace,
} from './mstTrace.js';
import {
	MST_ALGORITHMS,
	MST_EDGES,
	MST_PRESETS,
	MST_VERTICES,
} from './mstMeta.js';
import styles from './MstPlayground.module.css';

const INITIAL_PRESET = MST_PRESETS[0];

const SPEED_OPTIONS = [
	{ value: 25, label: '0.5×' },
	{ value: 100, label: '1×' },
	{ value: 200, label: '2×' },
	{ value: 320, label: '5×' },
];

const ALL_EDGES = normalizeEdges(MST_EDGES);

// Both algorithms run on the SAME graph — precompute the final trees so the
// "they build the same tree" comparison strip is a measured fact, not a claim.
const KRUSKAL_FINAL = kruskalTrace({ vertices: MST_VERTICES, edges: MST_EDGES });
const PRIM_FINAL = primTrace({ vertices: MST_VERTICES, edges: MST_EDGES, start: 'A' });
const SAME_TREE =
	JSON.stringify(KRUSKAL_FINAL.treeEdges.slice().sort()) ===
	JSON.stringify(PRIM_FINAL.treeEdges.slice().sort());

/**
 * MstPlayground — the interactive Kruskal-and-Prim-on-one-graph sandbox.
 *
 * Pick Kruskal or Prim (from a chosen start) and run it on the shared weighted
 * graph through the PlaybackEngine (step / scrub / replay / speed + scoped
 * keyboard). The graph is lit in lockstep with the synced pseudocode
 * (PseudoState) and live state — the union-find components for Kruskal, the
 * (tree, rest) frontier for Prim — and a comparison strip shows that whichever
 * you run, the final tree and weight are the same.
 */
const MstPlayground = ({ onUserInteract }) => {
	const playerRef = useRef(null);

	const [presetId, setPresetId] = useState(INITIAL_PRESET.id);
	const preset = MST_PRESETS.find(p => p.id === presetId) || INITIAL_PRESET;
	const algorithm = preset.algorithm;
	const algoMeta = MST_ALGORITHMS[algorithm];

	const [frames, setFrames] = useState(() => [
		idleMstFrame({ vertices: MST_VERTICES, algorithm: INITIAL_PRESET.algorithm }),
	]);

	const player = usePlayback(frames, { speed: 100 });
	const { currentStep, currentFrame, totalSteps, seek, play } = player;

	const frame = currentFrame || frames[0];
	const lines = useMemo(() => MST_PSEUDO[algorithm], [algorithm]);
	const canStep = totalSteps > 1;

	const notify = useCallback(() => onUserInteract?.(), [onUserInteract]);

	const runPreset = useCallback(p => {
		const result = buildMstTrace(p.algorithm, {
			vertices: MST_VERTICES,
			edges: MST_EDGES,
			start: p.start,
		});
		setFrames(result.frames);
	}, []);

	const handleRun = useCallback(() => {
		notify();
		runPreset(preset);
	}, [notify, preset, runPreset]);

	// When a fresh timeline arrives, jump to the start and play it.
	const framesKeyRef = useRef(null);
	useEffect(() => {
		if (frames.length <= 1) return;
		if (framesKeyRef.current === frames) return;
		framesKeyRef.current = frames;
		seek(0);
		play();
	}, [frames, seek, play]);

	const handlePresetChange = useCallback(
		id => {
			const next = MST_PRESETS.find(p => p.id === id);
			if (!next) return;
			notify();
			setPresetId(id);
			const idle = [
				idleMstFrame({ vertices: MST_VERTICES, algorithm: next.algorithm }),
			];
			framesKeyRef.current = idle;
			setFrames(idle);
		},
		[notify]
	);

	const handleReset = useCallback(() => {
		notify();
		const idle = [idleMstFrame({ vertices: MST_VERTICES, algorithm })];
		framesKeyRef.current = idle;
		setFrames(idle);
	}, [notify, algorithm]);

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

	// Build the highlight sets the graph reads from the current frame.
	const edgeSets = useMemo(() => {
		const considerId = frame?.considerEdge?.id;
		const isAccept = frame?.phase === 'accept';
		const isReject = frame?.phase === 'reject';
		return {
			tree: new Set(frame?.treeEdges || []),
			rejected: new Set(frame?.rejectedEdges || []),
			frontier: new Set(frame?.frontier || []),
			light:
				considerId && (frame?.phase === 'consider' || isAccept)
					? new Set([considerId])
					: undefined,
			consider:
				considerId && isReject ? new Set([considerId]) : undefined,
		};
	}, [frame]);

	const nodeSets = useMemo(
		() => ({ tree: new Set(frame?.treeNodes || []) }),
		[frame]
	);

	const narration = frame?.description || frame?.title;
	const componentsLabel =
		algorithm === 'kruskal' ? 'components (union-find)' : 'tree | rest (the cut)';
	const componentRows = frame?.components || [];

	return (
		<div className={styles.shell} ref={playerRef}>
			{/* ---------- Controls ---------- */}
			<div className={styles.controls}>
				<div className={styles.scenarioRow}>
					<span className={styles.scenarioLabel}>Run on one graph</span>
					<div className={styles.scenarioChips} role="group">
						{MST_PRESETS.map(p => (
							<button
								key={p.id}
								type="button"
								className={`${styles.scenarioChip} ${
									p.id === presetId ? styles.scenarioChipActive : ''
								}`}
								aria-pressed={p.id === presetId}
								onClick={() => handlePresetChange(p.id)}
								title={p.intent}
							>
								{p.label}
							</button>
						))}
					</div>
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
						aria-label="Reset"
						title="Reset"
					>
						<RotateCcw size={14} strokeWidth={2} />
						<span>Reset</span>
					</Button>
				</div>
			</div>

			<p className={styles.opLine}>{algoMeta?.oneLine}</p>

			{/* ---------- Stats ---------- */}
			<div className={styles.stats}>
				<div className={styles.stat}>
					<span className={styles.statValue}>{algoMeta?.name}</span>
					<span className={styles.statLabel}>algorithm</span>
				</div>
				<div className={styles.stat}>
					<span className={styles.statValue}>{algoMeta?.complexity}</span>
					<span className={styles.statLabel}>complexity</span>
				</div>
				<div className={styles.stat}>
					<span className={styles.statValue}>{frame?.treeEdges?.length ?? 0}</span>
					<span className={styles.statLabel}>tree edges</span>
				</div>
				<div className={styles.stat}>
					<span className={styles.statValue}>{frame?.totalWeight ?? 0}</span>
					<span className={styles.statLabel}>total weight</span>
				</div>
			</div>

			{/* ---------- Canvas + trace ---------- */}
			<div className={styles.body}>
				<section className={styles.canvas} aria-label="Weighted graph being spanned">
					<div className={styles.canvasOverlay} aria-hidden="true">
						<span className={styles.mono}>{algoMeta?.structure}</span>
						{frame?.title && (
							<>
								<span className={styles.dot}>·</span>
								<span className={styles.mono}>{frame.title}</span>
							</>
						)}
					</div>

					<div className={styles.graphBox}>
						<MstGraph edges={ALL_EDGES} edgeSets={edgeSets} nodeSets={nodeSets} />
					</div>

					{/* The data structure that IS the algorithm. */}
					<div className={styles.structure}>
						<span className={styles.structureLabel}>{componentsLabel}</span>
						<div className={styles.componentChips}>
							{componentRows.length ? (
								componentRows.map((group, i) => (
									<span key={group.join('') || i} className={styles.componentChip}>
										{`{${group.join(', ')}}`}
									</span>
								))
							) : (
								<span className={styles.componentEmpty}>∅</span>
							)}
						</div>
					</div>
				</section>

				<div className={styles.trace}>
					<FrameTrace
						eyebrow={algoMeta?.name}
						step={currentStep}
						totalSteps={totalSteps}
						narration={narration}
					/>
					<PseudoState
						className={styles.pseudo}
						lines={lines}
						line={frame?.line ?? null}
						state={frame?.state || []}
						isRunning={frame?.line != null && frame?.phase !== 'idle'}
						label="Pseudocode"
						stateLabel="Live state"
						step={currentStep}
						totalSteps={totalSteps}
					/>
				</div>
			</div>

			{/* ---------- Same-tree comparison strip ---------- */}
			<div className={styles.sameStrip}>
				<span className={styles.sameLead}>Whichever you run, one graph → one tree:</span>
				<span className={styles.sameItem}>
					Kruskal — weight {KRUSKAL_FINAL.totalWeight}
				</span>
				<span className={styles.sameItem}>
					Prim (from A) — weight {PRIM_FINAL.totalWeight}
				</span>
				<span
					className={`${styles.sameVerdict} ${SAME_TREE ? styles.sameOk : ''}`}
				>
					{SAME_TREE ? 'identical tree' : 'same weight, different edges'}
				</span>
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

export default MstPlayground;
