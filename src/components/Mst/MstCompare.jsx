import { useCallback, useMemo, useRef } from 'react';
import StepControlBar from '../../common/StepControlBar/StepControlBar.jsx';
import { usePlayback } from '../../common/PlaybackEngine/index.js';
import MstGraph from './MstGraph.jsx';
import { kruskalTrace, normalizeEdges, primTrace } from './mstTrace.js';
import { MST_EDGES, MST_VERTICES } from './mstMeta.js';
import styles from './MstCompare.module.css';

// Compare mode — Kruskal vs Prim on the SAME graph, in lockstep under one
// scrubber, so the student SEES the two greedy strategies reach the identical
// minimum tree by different routes. Both traces already exist and emit the same
// frame shape; this is two stages on one shared clock.

const SPEED_OPTIONS = [
	{ value: 25, label: '0.5×' },
	{ value: 100, label: '1×' },
	{ value: 200, label: '2×' },
	{ value: 320, label: '5×' },
];

const ALL_EDGES = normalizeEdges(MST_EDGES);

// Frame → graph highlight sets (the same mapping the single-algorithm playground
// uses, so both panes light identically).
const buildEdgeSets = frame => {
	const considerId = frame?.considerEdge?.id;
	const phase = frame?.phase;
	return {
		tree: new Set(frame?.treeEdges || []),
		rejected: new Set(frame?.rejectedEdges || []),
		frontier: new Set(frame?.frontier || []),
		light:
			considerId && (phase === 'consider' || phase === 'accept')
				? new Set([considerId])
				: undefined,
		consider:
			considerId && phase === 'reject' ? new Set([considerId]) : undefined,
	};
};

const ComparePane = ({ title, rule, frame, done, doneSteps }) => {
	const edgeSets = useMemo(() => buildEdgeSets(frame), [frame]);
	const nodeSets = useMemo(
		() => ({ tree: new Set(frame?.treeNodes || []) }),
		[frame]
	);
	return (
		<div className={`${styles.pane} ${done ? styles.paneDone : ''}`}>
			<div className={styles.paneHead}>
				<span className={styles.paneTitle}>{title}</span>
				{done ? (
					<span className={styles.donePill}>done · {doneSteps} steps</span>
				) : (
					<span className={styles.paneBeat}>{frame?.title}</span>
				)}
			</div>
			<div className={styles.graphBox}>
				<MstGraph edges={ALL_EDGES} edgeSets={edgeSets} nodeSets={nodeSets} />
			</div>
			<div className={styles.paneFoot}>
				<span className={styles.paneStat}>
					<strong>{frame?.treeEdges?.length ?? 0}</strong> edges
				</span>
				<span className={styles.paneStat}>
					<strong>{frame?.totalWeight ?? 0}</strong> weight
				</span>
			</div>
			<p className={styles.paneRule}>{rule}</p>
		</div>
	);
};

const MstCompare = ({ onUserInteract }) => {
	const playerRef = useRef(null);

	const left = useMemo(
		() => kruskalTrace({ vertices: MST_VERTICES, edges: MST_EDGES }),
		[]
	);
	const right = useMemo(
		() => primTrace({ vertices: MST_VERTICES, edges: MST_EDGES, start: 'A' }),
		[]
	);
	const lf = left.frames;
	const rf = right.frames;

	// One shared clock over the LONGER timeline. usePlayback only owns a cursor
	// (it never reads inside a frame), so a length-only sentinel is all it needs;
	// each pane clamps the cursor to its own last frame and then holds — which is
	// exactly how "Prim finishes first" becomes visible.
	const sharedLen = Math.max(lf.length, rf.length);
	const clock = useMemo(
		() => Array.from({ length: sharedLen }, (_, i) => i),
		[sharedLen]
	);
	const player = usePlayback(clock, { speed: 100 });
	const { currentStep, totalSteps, seek } = player;

	const leftFrame = lf[Math.min(currentStep, lf.length - 1)];
	const rightFrame = rf[Math.min(currentStep, rf.length - 1)];
	const leftDone = currentStep >= lf.length - 1;
	const rightDone = currentStep >= rf.length - 1;
	const canStep = totalSteps > 1;
	const sameMst = left.totalWeight === right.totalWeight;

	const handlePlayPause = useCallback(() => {
		onUserInteract?.();
		if (currentStep >= totalSteps - 1) player.replay();
		else player.toggle();
	}, [onUserInteract, currentStep, totalSteps, player]);

	return (
		<div className={styles.shell} ref={playerRef}>
			{/* Announce each synchronized step to assistive tech (compare mode has no
			    FrameTrace of its own). */}
			<p className={styles.srLive} aria-live="polite">
				{`Step ${currentStep + 1} of ${totalSteps}. Kruskal: ${
					leftFrame?.description || leftFrame?.title || ''
				}. Prim: ${rightFrame?.description || rightFrame?.title || ''}.`}
			</p>

			<div className={styles.twoUp}>
				<ComparePane
					title="Kruskal"
					rule="Take the cheapest edge in the whole graph — skip it if it would close a cycle."
					frame={leftFrame}
					done={leftDone}
					doneSteps={lf.length - 1}
				/>
				<ComparePane
					title="Prim (from A)"
					rule="Grow one tree: take the cheapest edge leaving the vertices you already have."
					frame={rightFrame}
					done={rightDone}
					doneSteps={rf.length - 1}
				/>
			</div>

			<div className={styles.result}>
				<span className={styles.resultLead}>One graph → one minimum tree:</span>
				<span className={styles.resultItem}>
					Kruskal — {left.treeEdges.length} edges, weight {left.totalWeight}
				</span>
				<span className={styles.resultItem}>
					Prim — {right.treeEdges.length} edges, weight {right.totalWeight}
				</span>
				<span
					className={`${styles.resultVerdict} ${sameMst ? styles.resultOk : ''}`}
				>
					{sameMst ? 'same MST ✓' : 'same weight'}
				</span>
			</div>

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
	);
};

export default MstCompare;
