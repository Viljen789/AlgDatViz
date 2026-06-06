import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import {
	buildBst,
	containsValue,
	deleteValue,
	getSearchSteps,
	getTraversalSteps,
	getTreeLayout,
	getTreeStats,
	insertValue,
} from './treeUtils.js';
import { TREE_OPERATIONS, TREE_OP_ORDER, TREE_PSEUDO } from './treeAlgorithmMeta.js';
import { usePlayback, FrameTrace } from '../../common/PlaybackEngine/index.js';
import StepControlBar from '../../common/StepControlBar/StepControlBar.jsx';
import PseudocodeRail from '../../common/PseudocodeRail/PseudocodeRail.jsx';
import Button from '../../common/Button/Button.jsx';
import Input from '../../common/Input/Input.jsx';
import styles from './TreePlayground.module.css';

const INITIAL_VALUES = [42, 23, 61, 12, 31, 54, 72, 28, 36];

const SPEED_OPTIONS = [
	{ value: 200, label: '0.5×' },
	{ value: 450, label: '1×' },
	{ value: 750, label: '2×' },
	{ value: 950, label: '5×' },
];

const readyFrame = opName => [
	{
		title: 'Ready',
		description: `Enter a value and run ${opName || 'the operation'}.`,
		activeNodes: [],
		pathNodes: [],
		output: [],
		line: null,
	},
];

const verbFor = id =>
	id === 'search'
		? 'Find'
		: id === 'insert'
			? 'Insert'
			: id === 'delete'
				? 'Remove'
				: 'Run';

/**
 * TreePlayground — the interactive BST sandbox. Preserves every operation from
 * the original Tree component (insert / search / delete + in/pre/post/level-
 * order traversals) and the compare-and-descend motion, but drives stepping
 * through the shared PlaybackEngine (scoped keyboard, scrub, replay, speed) and
 * is built entirely on design tokens + the shared primitives.
 */
const TreePlayground = ({ onUserInteract }) => {
	const playerRef = useRef(null);

	const [root, setRoot] = useState(() => buildBst(INITIAL_VALUES));
	const [inputValue, setInputValue] = useState('29');
	const [operationId, setOperationId] = useState('inorder');
	// The active timeline. Mutating ops (insert/delete) commit the new tree and
	// set the frames together so the canvas + steps stay in sync.
	const [steps, setSteps] = useState(() =>
		getTraversalSteps(buildBst(INITIAL_VALUES), 'inorder')
	);

	const player = usePlayback(steps, { speed: 450 });
	const {
		currentStep,
		totalSteps,
		isPlaying,
		toggle,
		stepForward,
		stepBack,
		seek,
		first,
		last,
		speed,
		setSpeed,
		replay,
	} = player;

	// When the user explicitly runs an operation we want it to auto-play from the
	// start. setSteps is async, so we flag the request and fire replay() once the
	// engine has the new timeline (and only when it has somewhere to advance to).
	const pendingPlayRef = useRef(false);
	useEffect(() => {
		if (!pendingPlayRef.current) return;
		pendingPlayRef.current = false;
		if (steps.length > 1) replay();
	}, [steps, replay]);

	const layout = useMemo(() => getTreeLayout(root), [root]);
	const stats = useMemo(() => getTreeStats(root), [root]);
	const currentFrame = steps[currentStep] ?? steps[0];
	const activeNodes = useMemo(
		() => new Set(currentFrame?.activeNodes || []),
		[currentFrame]
	);
	const pathNodes = useMemo(
		() => new Set(currentFrame?.pathNodes || []),
		[currentFrame]
	);

	const op = TREE_OPERATIONS[operationId];
	const canStep = totalSteps > 1;
	const lines = TREE_PSEUDO[operationId] || [];
	const activeLine = currentFrame?.line ?? null;

	// Replace the timeline and rewind to the start.
	const loadSteps = useCallback(
		nextSteps => {
			setSteps(nextSteps);
			// seek(0) clamps safely and pauses; the engine re-clamps when the
			// frames array changes length, so the cursor never goes stale.
			seek(0);
		},
		[seek]
	);

	const parseValue = useCallback(() => {
		const parsed = Number.parseInt(inputValue, 10);
		return Number.isFinite(parsed) ? parsed : null;
	}, [inputValue]);

	const handleRun = useCallback(() => {
		onUserInteract?.();
		pendingPlayRef.current = true;
		if (operationId === 'search') {
			const value = parseValue();
			if (value == null) return;
			loadSteps(getSearchSteps(root, value));
			return;
		}
		if (operationId === 'insert') {
			const value = parseValue();
			if (value == null) return;
			const existed = containsValue(root, value);
			const nextRoot = insertValue(root, value);
			setRoot(nextRoot);
			loadSteps([
				...getSearchSteps(root, value),
				{
					title: existed ? `${value} already exists` : `Insert ${value}`,
					description: existed
						? 'BSTs usually store unique keys, so this insert leaves the tree unchanged.'
						: `${value} is linked at the first empty child pointer reached by the search path.`,
					activeNodes: [String(value)],
					pathNodes: [String(value)],
					output: [],
					line: existed ? 1 : 2,
				},
			]);
			return;
		}
		if (operationId === 'delete') {
			const value = parseValue();
			if (value == null) return;
			const existed = containsValue(root, value);
			const nextRoot = deleteValue(root, value);
			setRoot(nextRoot);
			loadSteps([
				...getSearchSteps(root, value),
				{
					title: existed ? `Delete ${value}` : `${value} was absent`,
					description: existed
						? 'The node is removed while preserving the BST ordering rule.'
						: 'No node matched the key, so the tree stays the same.',
					activeNodes: existed ? [] : [String(value)],
					pathNodes: [],
					output: [],
					line: existed ? 1 : 0,
				},
			]);
			return;
		}
		// traversals
		loadSteps(getTraversalSteps(root, operationId));
	}, [onUserInteract, operationId, parseValue, root, loadSteps]);

	const handleReset = useCallback(() => {
		onUserInteract?.();
		const nextRoot = buildBst(INITIAL_VALUES);
		setRoot(nextRoot);
		setInputValue('29');
		setOperationId('inorder');
		loadSteps(getTraversalSteps(nextRoot, 'inorder'));
	}, [onUserInteract, loadSteps]);

	const handleOperationChange = useCallback(
		id => {
			onUserInteract?.();
			setOperationId(id);
			const next = TREE_OPERATIONS[id];
			// Pre-populate traversals so the step bar feels alive immediately;
			// value-driven ops show a "ready" prompt until Run is pressed.
			if (next && !next.needsValue) {
				loadSteps(getTraversalSteps(root, id));
			} else {
				loadSteps(readyFrame(next?.name));
			}
		},
		[onUserInteract, root, loadSteps]
	);

	// Wrap step controls so any interaction marks the topic complete.
	const wrap = useCallback(
		fn =>
			(...args) => {
				onUserInteract?.();
				fn(...args);
			},
		[onUserInteract]
	);

	const frameNarration = currentFrame?.description
		? currentFrame.description
		: 'Pick an operation, enter a value, and press Run to watch the algorithm compare and descend.';

	const outputItems = currentFrame?.output || [];

	return (
		<div className={styles.shell} ref={playerRef}>
			<div className={styles.controls}>
				<div className={styles.opTabs} role="group" aria-label="Tree operation">
					{TREE_OP_ORDER.map(id => {
						const meta = TREE_OPERATIONS[id];
						const selected = id === operationId;
						return (
							<button
								key={id}
								type="button"
								aria-pressed={selected}
								className={`${styles.opTab} ${
									selected ? styles.opTabActive : ''
								}`}
								onClick={() => handleOperationChange(id)}
							>
								{meta.name}
							</button>
						);
					})}
				</div>

				<div className={styles.runRow}>
					{op?.needsValue && (
						<div className={styles.valueField}>
							<Input
								size="sm"
								type="number"
								value={inputValue}
								onChange={e => setInputValue(e.target.value)}
								onKeyDown={e => {
									if (e.key === 'Enter') handleRun();
								}}
								placeholder="value"
								aria-label="Value"
							/>
						</div>
					)}
					<Button
						variant="primary"
						size="sm"
						onClick={handleRun}
						style={{ '--btn-accent': 'var(--topic-accent)' }}
					>
						<Play size={13} strokeWidth={2.4} fill="currentColor" />
						{op?.needsValue ? `${verbFor(operationId)}` : 'Run'}
					</Button>
					<Button variant="ghost" size="sm" onClick={handleReset}>
						<RotateCcw size={14} strokeWidth={2} />
						Reset
					</Button>
				</div>
			</div>

			<div className={styles.body}>
				<section className={styles.canvas} aria-label="Binary search tree">
					<div className={styles.notation} aria-hidden="true">
						<span className={styles.notationStrong}>{op?.complexity}</span>
						<span className={styles.notationDot}>·</span>
						<span>nodes {stats?.count ?? 0}</span>
						<span className={styles.notationDot}>·</span>
						<span>height {stats?.height ?? 0}</span>
						<span className={styles.notationDot}>·</span>
						<span
							className={
								stats?.balanced ? styles.balanced : styles.unbalanced
							}
						>
							{stats?.balanced ? 'balanced' : 'unbalanced'}
						</span>
					</div>

					<div className={styles.canvasStage}>
						<svg
							className={styles.treeSvg}
							viewBox={`0 0 ${layout.width} ${layout.height}`}
							preserveAspectRatio="xMidYMid meet"
							role="img"
							aria-label="Binary search tree visualization"
						>
							{layout.edges.map(edge => (
								<line
									key={`${edge.from.id}-${edge.to.id}`}
									x1={edge.from.x}
									y1={edge.from.y}
									x2={edge.to.x}
									y2={edge.to.y}
									className={
										pathNodes.has(edge.from.id) &&
										pathNodes.has(edge.to.id)
											? styles.edgeActive
											: styles.edge
									}
								/>
							))}
							{layout.nodes.map(node => {
								const isActive = activeNodes.has(node.id);
								const isPath = pathNodes.has(node.id);
								return (
									<g
										key={node.id}
										transform={`translate(${node.x}, ${node.y})`}
									>
										<circle
											r="22"
											className={`${styles.nodeCircle} ${
												isPath ? styles.nodePath : ''
											} ${isActive ? styles.nodeActive : ''}`}
										/>
										<text
											className={styles.nodeText}
											textAnchor="middle"
											dy="5"
										>
											{node.value}
										</text>
									</g>
								);
							})}
						</svg>
					</div>

					{outputItems.length > 0 && (
						<div className={styles.outputStrip}>
							<span className={styles.outputLabel}>Output</span>
							<div className={styles.outputItems}>
								{outputItems.map((item, idx) => (
									<span
										key={`${item}-${idx}`}
										className={styles.outputItem}
									>
										{item}
									</span>
								))}
							</div>
						</div>
					)}

					<div className={styles.trace}>
						<FrameTrace
							eyebrow={currentFrame?.title || op?.name}
							narration={frameNarration}
							step={currentStep}
							totalSteps={totalSteps}
						/>
					</div>
				</section>

				<PseudocodeRail
					lines={lines}
					activeLine={activeLine}
					isRunning={canStep && currentStep > 0}
				/>
			</div>

			<div className={styles.bar}>
				<StepControlBar
					isPlaying={isPlaying}
					canStep={canStep}
					currentStep={currentStep}
					totalSteps={totalSteps}
					speed={speed}
					speedOptions={SPEED_OPTIONS}
					onPlayPause={wrap(toggle)}
					onStepBack={wrap(stepBack)}
					onStepForward={wrap(stepForward)}
					onSeek={wrap(seek)}
					onFirst={wrap(first)}
					onLast={wrap(last)}
					onSpeedChange={setSpeed}
					scopeRef={playerRef}
				/>
			</div>
		</div>
	);
};

export default TreePlayground;
