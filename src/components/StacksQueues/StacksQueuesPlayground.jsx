import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Eye, RotateCcw } from 'lucide-react';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import {
	usePlayback,
	FrameTrace,
	PseudoState,
} from '../../common/PlaybackEngine';
import { SPEED_OPTIONS } from '../../utils/sorting/algorithmMeta.js';
import StepControlBar from '../../common/StepControlBar/StepControlBar.jsx';
import useReducedMotion from '../../hooks/useReducedMotion.js';
import { SQ_MODES } from './stacksQueuesMeta.js';
import { sqFrames, SQ_PSEUDO } from './sqFrames.js';
import styles from './StacksQueuesPlayground.module.css';

// Flip drives the stack<->queue morph (the same cells under a different access
// discipline). Registration is idempotent — mirrors HomePage's ScrollTrigger.
gsap.registerPlugin(Flip);

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
// One shared empty array so an empty frame never yields a fresh [] each render.
const EMPTY_ITEMS = [];

const initialItemsFor = mode =>
	mode === 'stack' ? INITIAL_STACK : INITIAL_QUEUE;

const StacksQueuesPlayground = ({ onUserInteract }) => {
	const reducedMotion = useReducedMotion();
	const playerRef = useRef(null);
	const stageRef = useRef(null);
	const [mode, setMode] = useState('stack');
	// The op-log: the single source of truth. Frames derive from it purely.
	const [ops, setOps] = useState([]);
	const nextIndexRef = useRef(0);
	// When the student switches discipline we carry the CURRENT contents into the
	// new mode (rather than snapping to that mode's defaults) so Flip has real
	// shared nodes to morph: a stack and a queue are the same cells, only the
	// access end differs. null means "use the mode's starting example".
	const carriedItemsRef = useRef(null);
	// Cross-render handoffs for the pop/dequeue exit and the mode morph. Captured
	// synchronously in the click handler (while the leaving node still exists),
	// consumed in the layout effect once React has committed the shorter array.
	const pendingExitRef = useRef(null);
	const pendingFlipRef = useRef(null);

	const m = SQ_MODES[mode];
	const lines = useMemo(() => SQ_PSEUDO[mode] || [], [mode]);
	const initialItems = useMemo(
		() => carriedItemsRef.current ?? initialItemsFor(mode),
		[mode]
	);

	const frames = useMemo(
		() => sqFrames(mode, initialItems, ops),
		[mode, initialItems, ops]
	);

	const player = usePlayback(frames, { speed: 100 });
	const { seek } = player;

	const currentFrame = player.currentFrame || frames[0];
	// Stable per frame so the morph/exit effects and handleModeChange don't see a
	// fresh array identity on every render.
	const items = useMemo(
		() => currentFrame?.items || EMPTY_ITEMS,
		[currentFrame]
	);
	const isEmpty = items.length === 0;

	// After any new op, pin the cursor to the freshest frame so the canvas shows
	// the just-performed result. Scrubbing back is then opt-in.
	const pinToLatest = useRef(false);
	useEffect(() => {
		if (!pinToLatest.current) return;
		pinToLatest.current = false;
		seek(frames.length - 1);
	}, [frames, seek]);

	// THE MODE MORPH. The pile (column) and the lane (row) are the same cells under
	// a different access discipline; Flip turns the layout delta the CSS already
	// implies into one eased re-anchoring. handleModeChange clears ops + carries the
	// items, so the cursor is briefly out of range (canvas empty) for one commit,
	// then pinToLatest seeks to the carried frame and the new renderer mounts. We
	// wait for that second commit — when the cells actually exist — before flipping;
	// the unified data-flip-ids match each old cell to its twin in the new renderer.
	useLayoutEffect(() => {
		const pending = pendingFlipRef.current;
		if (!pending) return;
		const stage = stageRef.current;
		// Cells not committed yet (cursor still clamping after the ops reset) — hold
		// the captured state and retry on the next commit rather than no-op morphing.
		if (!stage || stage.querySelectorAll('[data-cell]').length === 0) return;
		pendingFlipRef.current = null;
		const ctx = gsap.context(() => {
			if (reducedMotion) {
				// Keep the lesson (same cells, new arrangement reflows on its own); just
				// a brief opacity beat so the re-anchoring registers without travel.
				gsap.fromTo(
					stage?.querySelectorAll('[data-cell]') || [],
					{ opacity: 0.4 },
					{ opacity: 1, duration: 0.1, ease: 'power1.inOut' }
				);
				return;
			}
			stage?.classList.add(styles.morphing);
			Flip.from(pending.flipState, {
				duration: 0.55,
				ease: 'power3.inOut',
				absolute: true,
				stagger: { each: 0.04, from: pending.from },
				onComplete: () => stage?.classList.remove(styles.morphing),
			});
		}, stageRef);
		return () => {
			stage?.classList.remove(styles.morphing);
			ctx.revert();
		};
	}, [mode, items.length, reducedMotion]);

	// THE POP / DEQUEUE EXIT. The defining LIFO/FIFO contract, made visible: the
	// leaving clone (captured pre-unmount) flies off — a stack pop lifts UP off the
	// top (last in, first out); a queue dequeue fades at the front while the
	// survivors slide LEFT into the vacated slot (served from the front, everyone
	// advances). Fires on the shrink commit, after pinToLatest seeks forward.
	const prevLenRef = useRef(items.length);
	useLayoutEffect(() => {
		const shrank = items.length < prevLenRef.current;
		prevLenRef.current = items.length;
		const pending = pendingExitRef.current;
		if (!pending || !shrank) return;
		pendingExitRef.current = null;
		const { clone, survivorRects, mode: exitMode } = pending;
		const stage = stageRef.current;
		const ctx = gsap.context(() => {
			// Survivors glide from where they sat into the slot they inherit (stack:
			// the pile drops UP toward the top; queue: the line advances LEFT into the
			// vacated front). Order-matched: new cell i flew from old survivor i.
			const newCells = stage
				? Array.from(stage.querySelectorAll('[data-cell]'))
				: [];
			if (!reducedMotion && survivorRects) {
				const stageRect = stage?.getBoundingClientRect();
				newCells.forEach((el, i) => {
					const from = survivorRects[i];
					if (!from || !stageRect) return;
					const r = el.getBoundingClientRect();
					const dx = from.left - (r.left - stageRect.left);
					const dy = from.top - (r.top - stageRect.top);
					if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
					gsap.fromTo(
						el,
						{ x: dx, y: dy },
						{
							x: 0,
							y: 0,
							duration: 0.34,
							ease: 'power3.out',
							overwrite: 'auto',
							clearProps: 'transform',
						}
					);
				});
			}
			// The leaving cell flies off — the defining LIFO/FIFO gesture.
			if (clone) {
				if (reducedMotion) {
					// A few-px directional nudge + fade keeps "something left" without travel.
					gsap.to(clone, {
						y: exitMode === 'stack' ? -4 : 0,
						x: exitMode === 'stack' ? 0 : -4,
						opacity: 0,
						duration: 0.12,
						ease: 'power1.inOut',
						overwrite: 'auto',
						onComplete: () => clone.remove(),
					});
				} else if (exitMode === 'stack') {
					// Lifted UP off the top of the pile and away (last in, first out).
					gsap.to(clone, {
						y: -26,
						opacity: 0,
						duration: 0.3,
						ease: 'power2.in',
						overwrite: 'auto',
						onComplete: () => clone.remove(),
					});
				} else {
					// Served from the front: drifts forward (left) as it leaves the line.
					gsap.to(clone, {
						x: -18,
						opacity: 0,
						duration: 0.3,
						ease: 'power2.in',
						overwrite: 'auto',
						onComplete: () => clone.remove(),
					});
				}
			}
		}, stageRef);
		return () => {
			// If we unmount mid-flight, drop any clone that hasn't removed itself.
			if (clone && clone.parentNode) clone.remove();
			ctx.revert();
		};
	}, [items.length, reducedMotion]);

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
		// Capture the leaving cell BEFORE React unmounts it. The removed element is
		// always the first `.cell` in DOM order (stack top / queue front both render
		// front-most first); the rest are the survivors that compact into its place.
		// We measure rects here (the BarView offsetLeft idiom) rather than Flip the
		// survivors, because a dequeue re-keys every queue cell — the survivor nodes
		// remount, so position-by-id matching is unreliable; order-matched rect
		// deltas are not. Survivor i (new) maps to old survivor i (same DOM order).
		const stage = stageRef.current;
		if (stage && !isEmpty) {
			const cells = stage.querySelectorAll('[data-cell]');
			const leaving = cells[0];
			const survivors = Array.from(cells).slice(1);
			if (leaving) {
				const stageRect = stage.getBoundingClientRect();
				const rect = leaving.getBoundingClientRect();
				// Clone the leaving cell and pin it, absolutely, over its live position
				// inside the (relative) stage. React never sees this node, so it rides
				// across the re-render untouched until the fly-out removes it.
				const clone = leaving.cloneNode(true);
				clone.setAttribute('data-leaving-clone', '');
				clone.removeAttribute('data-cell');
				clone.removeAttribute('data-flip-id');
				clone.style.position = 'absolute';
				clone.style.margin = '0';
				clone.style.left = `${rect.left - stageRect.left}px`;
				clone.style.top = `${rect.top - stageRect.top}px`;
				clone.style.width = `${rect.width}px`;
				clone.style.height = `${rect.height}px`;
				clone.style.pointerEvents = 'none';
				clone.style.zIndex = '2';
				stage.appendChild(clone);
				pendingExitRef.current = {
					mode,
					clone,
					// Survivor positions (relative to the stage), in DOM order, so each
					// survivor can glide from where it was into the slot it inherits.
					survivorRects: survivors.map(el => {
						const r = el.getBoundingClientRect();
						return {
							left: r.left - stageRect.left,
							top: r.top - stageRect.top,
						};
					}),
				};
			}
		}
		appendOp({ type: 'remove' });
	}, [appendOp, isEmpty, mode, onUserInteract]);

	const handlePeek = useCallback(() => {
		onUserInteract?.();
		appendOp({ type: 'peek' });
	}, [appendOp, onUserInteract]);

	const handleReset = useCallback(() => {
		onUserInteract?.();
		// Back to the mode's canonical starting example (drop any carried contents).
		carriedItemsRef.current = null;
		nextIndexRef.current = 0;
		pinToLatest.current = true;
		setOps([]);
	}, [onUserInteract]);

	const handleModeChange = useCallback(
		next => {
			if (next === mode) return;
			onUserInteract?.();
			// Carry the CURRENT contents into the new discipline so the morph has
			// shared nodes: the on-screen cells survive the switch, only their access
			// end (top -> front/rear) changes. We capture Flip state from the live
			// cells first; their unified data-flip-ids let Flip match each cell to its
			// twin in the freshly mounted (pile<->lane) renderer after React commits.
			const stage = stageRef.current;
			if (stage) {
				const cells = stage.querySelectorAll('[data-cell]');
				if (cells.length) {
					pendingFlipRef.current = {
						flipState: Flip.getState(cells),
						// Pop the morph from the moving end so it reads as a re-anchoring,
						// not a shuffle: stack reels in from the top (end), queue from the
						// front (start).
						from: mode === 'stack' ? 'end' : 'start',
					};
				}
			}
			carriedItemsRef.current = [...items];
			nextIndexRef.current = 0;
			pinToLatest.current = true;
			setMode(next);
			setOps([]);
		},
		[items, mode, onUserInteract]
	);

	const totalSteps = frames.length;
	const canStep = totalSteps > 1;

	const renderStack = () => (
		<div className={styles.pile}>
			{[...items].reverse().map((value, idx, arr) => {
				// realIdx is the cell's position in `items` (bottom-anchored). Both
				// renderers key + tag by this SAME index so a stack cell and its queue
				// twin share one identity — the gate that lets Flip morph (not faux-morph).
				const realIdx = arr.length - 1 - idx;
				const cellKey = `${value}-${realIdx}`;
				const isTop = idx === 0;
				const isHot = currentFrame?.highlight === realIdx;
				return (
					<div
						key={cellKey}
						data-cell
						data-flip-id={cellKey}
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
					// idx is the position in `items` — the SAME identity the pile keys by,
					// so each queue cell carries the data-flip-id of its stack twin.
					const cellKey = `${value}-${idx}`;
					const isFront = idx === 0;
					const isRear = idx === items.length - 1;
					const isHot = currentFrame?.highlight === idx;
					return (
						<div
							key={cellKey}
							data-cell
							data-flip-id={cellKey}
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
			<div
				className={styles.toolbar}
				role="group"
				aria-label="Mode and operations"
			>
				<div
					className={styles.modeToggle}
					role="group"
					aria-label="Data structure mode"
				>
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
					<div className={styles.canvasStage} ref={stageRef}>
						{mode === 'stack' ? renderStack() : renderQueue()}
					</div>
				</section>

				<aside
					className={styles.rail}
					aria-label="Pseudocode, live state and trace"
				>
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
