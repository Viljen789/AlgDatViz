import { useEffect, useMemo, useState } from 'react';
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
import { TREE_OPERATIONS, TREE_PSEUDO } from './treeAlgorithmMeta';
import TreeHero from './TreeHero/TreeHero';
import StepControlBar from '../../common/StepControlBar/StepControlBar';
import PseudocodeRail from '../../common/PseudocodeRail/PseudocodeRail';
import styles from './Tree.module.css';

const INITIAL_VALUES = [42, 23, 61, 12, 31, 54, 72, 28, 36];

const SPEED_OPTIONS = [
	{ value: 1300, label: '0.5×' },
	{ value: 850, label: '1×' },
	{ value: 450, label: '2×' },
	{ value: 200, label: '5×' },
];

const Tree = () => {
	const [root, setRoot] = useState(() => buildBst(INITIAL_VALUES));
	const [inputValue, setInputValue] = useState('29');
	const [operationId, setOperationId] = useState('inorder');
	const [steps, setSteps] = useState(() =>
		getTraversalSteps(buildBst(INITIAL_VALUES), 'inorder')
	);
	const [stepIndex, setStepIndex] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const [speed, setSpeed] = useState(850);

	const layout = useMemo(() => getTreeLayout(root), [root]);
	const stats = useMemo(() => getTreeStats(root), [root]);
	const currentStep = steps[stepIndex] ?? steps[0];
	const activeNodes = new Set(currentStep?.activeNodes || []);
	const pathNodes = new Set(currentStep?.pathNodes || []);

	useEffect(() => {
		if (!isPlaying) return;
		if (stepIndex >= steps.length - 1) {
			setIsPlaying(false);
			return;
		}
		const timer = window.setTimeout(() => {
			setStepIndex(index => Math.min(index + 1, steps.length - 1));
		}, speed);
		return () => window.clearTimeout(timer);
	}, [isPlaying, stepIndex, steps.length, speed]);

	const op = TREE_OPERATIONS[operationId];

	const resetSteps = nextSteps => {
		setSteps(nextSteps);
		setStepIndex(0);
		setIsPlaying(false);
	};

	const parseValue = () => {
		const parsed = Number.parseInt(inputValue, 10);
		return Number.isFinite(parsed) ? parsed : null;
	};

	const handleRun = () => {
		if (operationId === 'search') {
			const value = parseValue();
			if (value == null) return;
			resetSteps(getSearchSteps(root, value));
			setIsPlaying(true);
			return;
		}
		if (operationId === 'insert') {
			const value = parseValue();
			if (value == null) return;
			const existed = containsValue(root, value);
			const nextRoot = insertValue(root, value);
			setRoot(nextRoot);
			resetSteps([
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
			setIsPlaying(true);
			return;
		}
		if (operationId === 'delete') {
			const value = parseValue();
			if (value == null) return;
			const existed = containsValue(root, value);
			const nextRoot = deleteValue(root, value);
			setRoot(nextRoot);
			resetSteps([
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
			setIsPlaying(true);
			return;
		}
		// traversals
		resetSteps(getTraversalSteps(root, operationId));
		setIsPlaying(true);
	};

	const handleReset = () => {
		const nextRoot = buildBst(INITIAL_VALUES);
		setRoot(nextRoot);
		setInputValue('29');
		setOperationId('inorder');
		resetSteps(getTraversalSteps(nextRoot, 'inorder'));
	};

	const handleOperationChange = id => {
		setOperationId(id);
		setIsPlaying(false);
		setStepIndex(0);
		// Pre-populate steps for traversals so the step bar feels alive immediately
		const next = TREE_OPERATIONS[id];
		if (next && !next.needsValue) {
			setSteps(getTraversalSteps(root, id));
		} else {
			setSteps([
				{
					title: 'Ready',
					description: `Enter a value and run ${next?.name || 'the operation'}.`,
					activeNodes: [],
					pathNodes: [],
					output: [],
					line: null,
				},
			]);
		}
	};

	const handlePlayPause = () => {
		if (stepIndex >= steps.length - 1) {
			setStepIndex(0);
			setIsPlaying(true);
			return;
		}
		setIsPlaying(p => !p);
	};

	const totalSteps = steps.length;
	const canStep = totalSteps > 1;
	const lines = TREE_PSEUDO[operationId] || [];
	const activeLine = currentStep?.line ?? null;

	const statusSuffix = !canStep
		? 'ready'
		: stepIndex >= totalSteps - 1
			? 'done'
			: isPlaying
				? 'running'
				: 'paused';

	return (
		<div className={styles.shell}>
			<TreeHero
				operationId={operationId}
				onOperationChange={handleOperationChange}
				value={inputValue}
				onValueChange={setInputValue}
				onRun={handleRun}
				onReset={handleReset}
				stats={stats}
				statusSuffix={statusSuffix}
			/>

			<div className={styles.body}>
				<section className={styles.canvas} aria-label="Tree canvas">
					<div className={styles.canvasOverlay}>
						<span className={styles.notation}>{op?.complexity}</span>
						{currentStep?.title && (
							<>
								<span className={styles.notationDot}>·</span>
								<span className={styles.stat}>{currentStep.title}</span>
							</>
						)}
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
										pathNodes.has(edge.from.id) && pathNodes.has(edge.to.id)
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
											r="24"
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
					{currentStep?.description && (
						<div className={styles.frameNote} aria-live="polite">
							<span className={styles.frameNoteLabel}>STEP</span>
							<span className={styles.frameNoteText}>
								{currentStep.description}
							</span>
						</div>
					)}
					{currentStep?.output?.length > 0 && (
						<div className={styles.outputStrip}>
							<span className={styles.outputLabel}>OUTPUT</span>
							<div className={styles.outputItems}>
								{currentStep.output.map((item, idx) => (
									<span key={idx} className={styles.outputItem}>
										{item}
									</span>
								))}
							</div>
						</div>
					)}
				</section>

				<PseudocodeRail
					lines={lines}
					activeLine={activeLine}
					isRunning={canStep && stepIndex > 0}
				/>
			</div>

			<div className={styles.bar}>
				<StepControlBar
					isPlaying={isPlaying}
					canStep={canStep}
					currentStep={stepIndex}
					totalSteps={totalSteps}
					speed={speed}
					speedOptions={SPEED_OPTIONS}
					onPlayPause={handlePlayPause}
					onStepBack={() =>
						setStepIndex(index => Math.max(index - 1, 0))
					}
					onStepForward={() =>
						setStepIndex(index =>
							Math.min(index + 1, steps.length - 1)
						)
					}
					onSeek={step => {
						setStepIndex(Math.max(0, Math.min(step, steps.length - 1)));
						setIsPlaying(false);
					}}
					onFirst={() => {
						setStepIndex(0);
						setIsPlaying(false);
					}}
					onLast={() => {
						setStepIndex(steps.length - 1);
						setIsPlaying(false);
					}}
					onSpeedChange={setSpeed}
				/>
			</div>
		</div>
	);
};

export default Tree;
