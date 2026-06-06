import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	ArrowDownToLine,
	ArrowUpFromLine,
	Eye,
	RotateCcw,
} from 'lucide-react';
import { usePlayback, FrameTrace, PseudoState } from '../../common/PlaybackEngine';
import { SPEED_OPTIONS } from '../../utils/sorting/algorithmMeta.js';
import StepControlBar from '../../common/StepControlBar/StepControlBar.jsx';
import { SQ_MODES } from './stacksQueuesMeta.js';
import { sqFrames, SQ_PSEUDO } from './sqFrames.js';
import styles from './StacksQueuesPlayground.module.css';

// The interactive sandbox. The student issues operations (push/pop or
// enqueue/dequeue, plus peek) and each one appends to a replayable op-log. The
// pure `sqFrames` generator turns that log into a timeline of contract-conformant
// frames, so one source drives BOTH the canvas (items/narration) and the synced
// PseudoState panel (executing pseudocode line + live top/front/rear/size). The
// shared PlaybackEngine then owns stepping, scrubbing and replay across that
// history — the same playback ergonomics every other topic gets.

const INITIAL_STACK = ['call()', 'parse()', 'eval()'];
const INITIAL_QUEUE = ['A', 'B', 'C'];
const VALUE_POOL = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

const initialItemsFor = mode =>
	mode === 'stack' ? INITIAL_STACK : INITIAL_QUEUE;

const StacksQueuesPlayground = ({ onUserInteract }) => {
	const playerRef = useRef(null);
	const [mode, setMode] = useState('stack');
	// The op-log: the single source of truth. Frames derive from it purely.
	const [ops, setOps] = useState([]);
	const nextIndexRef = useRef(0);

	const m = SQ_MODES[mode];
	const lines = useMemo(() => SQ_PSEUDO[mode] || [], [mode]);
	const initialItems = useMemo(() => initialItemsFor(mode), [mode]);

	const frames = useMemo(
		() => sqFrames(mode, initialItems, ops),
		[mode, initialItems, ops]
	);

	const player = usePlayback(frames, { speed: 100 });
	const { seek } = player;

	const currentFrame = player.currentFrame || frames[0];
	const items = currentFrame?.items || [];
	const isEmpty = items.length === 0;

	// After any new op, pin the cursor to the freshest frame so the canvas shows
	// the just-performed result. Scrubbing back is then opt-in.
	const pinToLatest = useRef(false);
	useEffect(() => {
		if (!pinToLatest.current) return;
		pinToLatest.current = false;
		seek(frames.length - 1);
	}, [frames, seek]);

	const getNextValue = useCallback(() => {
		const value = VALUE_POOL[nextIndexRef.current % VALUE_POOL.length];
		nextIndexRef.current += 1;
		return value;
	}, []);

	const appendOp = useCallback(op => {
		pinToLatest.current = true;
		setOps(prev => [...prev, op]);
	}, []);

	const handleAdd = useCallback(() => {
		onUserInteract?.();
		appendOp({ type: 'add', value: getNextValue() });
	}, [appendOp, getNextValue, onUserInteract]);

	const handleRemove = useCallback(() => {
		onUserInteract?.();
		appendOp({ type: 'remove' });
	}, [appendOp, onUserInteract]);

	const handlePeek = useCallback(() => {
		onUserInteract?.();
		appendOp({ type: 'peek' });
	}, [appendOp, onUserInteract]);

	const handleReset = useCallback(() => {
		onUserInteract?.();
		nextIndexRef.current = 0;
		pinToLatest.current = true;
		setOps([]);
	}, [onUserInteract]);

	const handleModeChange = useCallback(
		next => {
			if (next === mode) return;
			onUserInteract?.();
			nextIndexRef.current = 0;
			pinToLatest.current = true;
			setMode(next);
			setOps([]);
		},
		[mode, onUserInteract]
	);

	const totalSteps = frames.length;
	const canStep = totalSteps > 1;

	const renderStack = () => (
		<div className={styles.pile}>
			{[...items].reverse().map((value, idx, arr) => {
				const realIdx = arr.length - 1 - idx;
				const isTop = idx === 0;
				const isHot = currentFrame?.highlight === realIdx;
				return (
					<div
						key={`${value}-${realIdx}`}
						className={`${styles.cell} ${styles.stackCell} ${
							isTop ? styles.cellEnd : ''
						} ${isHot ? styles.cellHot : ''}`}
					>
						<span className={styles.cellLabel}>{value}</span>
						{isTop && <span className={styles.anchor}>top</span>}
					</div>
				);
			})}
			{isEmpty && <p className={styles.emptyHint}>stack is empty</p>}
			<div className={styles.floor} aria-hidden="true">
				bottom
			</div>
		</div>
	);

	const renderQueue = () => (
		<div className={styles.lane}>
			<span className={styles.endLabel}>front</span>
			<div className={styles.track}>
				{items.map((value, idx) => {
					const isFront = idx === 0;
					const isRear = idx === items.length - 1;
					const isHot = currentFrame?.highlight === idx;
					return (
						<div
							key={`${value}-${idx}`}
							className={`${styles.cell} ${styles.queueCell} ${
								isFront ? styles.cellEnd : ''
							} ${isRear && !isFront ? styles.cellRear : ''} ${
								isHot ? styles.cellHot : ''
							}`}
						>
							<span className={styles.cellLabel}>{value}</span>
							{isFront && <span className={styles.anchor}>front</span>}
							{isRear && !isFront && (
								<span className={styles.anchor}>rear</span>
							)}
						</div>
					);
				})}
				{isEmpty && <p className={styles.emptyHint}>queue is empty</p>}
			</div>
			<span className={styles.endLabel}>rear</span>
		</div>
	);

	return (
		<div className={styles.shell} ref={playerRef}>
			<div className={styles.toolbar} role="group" aria-label="Mode and operations">
				<div className={styles.modeToggle} role="group" aria-label="Data structure mode">
					<button
						type="button"
						className={`${styles.modeBtn} ${
							mode === 'stack' ? styles.modeBtnActive : ''
						}`}
						onClick={() => handleModeChange('stack')}
						aria-pressed={mode === 'stack'}
					>
						Stack <span className={styles.modeAcronym}>LIFO</span>
					</button>
					<button
						type="button"
						className={`${styles.modeBtn} ${
							mode === 'queue' ? styles.modeBtnActive : ''
						}`}
						onClick={() => handleModeChange('queue')}
						aria-pressed={mode === 'queue'}
					>
						Queue <span className={styles.modeAcronym}>FIFO</span>
					</button>
				</div>

				<div className={styles.ops}>
					<button
						type="button"
						className={styles.primaryBtn}
						onClick={handleAdd}
					>
						<ArrowDownToLine size={14} strokeWidth={2.2} aria-hidden="true" />
						<span>{m.addLabel}</span>
					</button>
					<button
						type="button"
						className={styles.ghostBtn}
						onClick={handleRemove}
						disabled={isEmpty}
					>
						<ArrowUpFromLine size={14} strokeWidth={2.2} aria-hidden="true" />
						<span>{m.removeLabel}</span>
					</button>
					<button
						type="button"
						className={styles.ghostBtn}
						onClick={handlePeek}
						disabled={isEmpty}
					>
						<Eye size={14} strokeWidth={2.2} aria-hidden="true" />
						<span>Peek</span>
					</button>
					<button
						type="button"
						className={styles.ghostBtn}
						onClick={handleReset}
						aria-label="Reset to the starting example"
						title="Reset"
					>
						<RotateCcw size={14} strokeWidth={2} aria-hidden="true" />
					</button>
				</div>
			</div>

			<div className={styles.body}>
				<section className={styles.canvas} aria-label={`${m.name} canvas`}>
					<div className={styles.canvasNotation} aria-hidden="true">
						{m.complexity}
					</div>
					<div className={styles.canvasStage}>
						{mode === 'stack' ? renderStack() : renderQueue()}
					</div>
				</section>

				<aside className={styles.rail} aria-label="Pseudocode, live state and trace">
					<PseudoState
						className={styles.pseudo}
						lines={lines}
						frame={currentFrame}
						label={`${m.name} · pseudocode`}
						stateLabel="Live state"
						step={player.currentStep}
						totalSteps={totalSteps}
					/>
					<FrameTrace
						eyebrow="Trace"
						narration={currentFrame?.narration}
						step={player.currentStep}
						totalSteps={totalSteps}
					/>
				</aside>
			</div>

			<div className={styles.controlsDock}>
				<StepControlBar
					isPlaying={player.isPlaying}
					canStep={canStep}
					currentStep={player.currentStep}
					totalSteps={totalSteps}
					speed={player.speed}
					speedOptions={SPEED_OPTIONS}
					onPlayPause={player.toggle}
					onStepBack={player.stepBack}
					onStepForward={player.stepForward}
					onSeek={player.seek}
					onFirst={player.first}
					onLast={player.last}
					onSpeedChange={player.setSpeed}
					scopeRef={playerRef}
				/>
			</div>
		</div>
	);
};

export default StacksQueuesPlayground;
