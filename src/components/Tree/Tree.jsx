import {
	ChevronLeft,
	ChevronRight,
	Pause,
	Play,
	Plus,
	RotateCcw,
	Search,
	Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import LearningPanel from '../../common/LearningPanel/LearningPanel.jsx';
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
import styles from './Tree.module.css';

const INITIAL_VALUES = [42, 23, 61, 12, 31, 54, 72, 28, 36];

const TRAVERSAL_LABELS = {
	inorder: 'Inorder',
	preorder: 'Preorder',
	postorder: 'Postorder',
	levelorder: 'Level order',
};

const BST_LINES = [
	'compare target with current node',
	'if equal: stop',
	'if target is smaller: go left',
	'left subtree contains smaller values',
	'if target is larger: go right',
	'right subtree contains larger values',
];

const TRAVERSAL_LINES = [
	'preorder: visit, left, right',
	'inorder: left, visit, right',
	'postorder: left, right, visit',
	'level order: visit by depth with a queue',
];

const TRAVERSAL_STRATEGIES = {
	inorder: [
		'Visit the left subtree first.',
		'Then visit the current node.',
		'Then visit the right subtree.',
		'For a BST, this outputs values in sorted order.',
	],
	preorder: [
		'Visit the current node first.',
		'Then traverse the left subtree.',
		'Then traverse the right subtree.',
		'This is useful for copying or serializing tree shape.',
	],
	postorder: [
		'Traverse the left subtree.',
		'Traverse the right subtree.',
		'Visit the current node after its children.',
		'This is useful when children must be processed before parents.',
	],
	levelorder: [
		'Start with the root in a queue.',
		'Visit nodes from left to right at each depth.',
		'Add children to the queue for the next layer.',
		'This exposes breadth and tree levels.',
	],
};

const getTreeLearningContent = (mode, traversalType, stats, prompt) => {
	const isTraversal = mode === 'traversal';
	return {
		name: isTraversal
			? `${TRAVERSAL_LABELS[traversalType]} traversal`
			: 'Binary search tree operation',
		category: 'Tree data structure',
		summary: isTraversal
			? 'Tree traversals define the order in which nodes are visited.'
			: 'BST search, insert, and delete all follow the ordering rule at each node.',
		intuition: isTraversal
			? 'A traversal is a disciplined walk through the tree. The visit order determines what the output means.'
			: 'A BST turns each comparison into a direction choice: smaller values go left, larger values go right.',
		strategy: isTraversal
			? TRAVERSAL_STRATEGIES[traversalType]
			: [
					'Compare the target with the current node.',
					'Go left when the target is smaller.',
					'Go right when the target is larger.',
					'Stop when the target is found or an empty child pointer is reached.',
				],
		complexity: isTraversal
			? {
					time: { average: 'O(n)', worst: 'O(n)' },
					space: { worst: traversalType === 'levelorder' ? 'O(w)' : 'O(h)' },
					variables: [
						{ symbol: 'n', label: 'nodes' },
						{ symbol: 'h', label: 'height' },
						{ symbol: 'w', label: 'maximum width' },
					],
					why: [
						'Every traversal visits each node exactly once.',
						'Depth-first traversals keep a path of height h on the stack.',
						'Level order keeps a queue that can grow to the widest level.',
					],
				}
			: {
					time: { average: 'O(log n)', worst: 'O(n)' },
					space: { worst: 'O(h)' },
					variables: [
						{ symbol: 'n', label: 'nodes' },
						{ symbol: 'h', label: `current height ${stats.height}` },
					],
					why: [
						'Each comparison discards one subtree when the tree is balanced.',
						'A balanced tree has height about log n.',
						'A chain-shaped tree has height n, so operations become linear.',
					],
				},
		tradeoffs: {
			useWhen: isTraversal
				? [
						'You need to inspect every node in a deliberate order.',
						'You want sorted output from a BST with inorder traversal.',
					]
				: [
						'You need ordered keys and directional search.',
						'The tree is balanced or small enough that height stays controlled.',
					],
			watchOut: isTraversal
				? [
						'Traversal always touches every node.',
						'The same tree can produce very different outputs depending on traversal order.',
					]
				: [
						'Plain BSTs can become unbalanced.',
						'Delete cases are trickier when a node has two children.',
					],
		},
		legend: [
			{ label: 'Current node', color: 'var(--color-accent-orange)' },
			{ label: 'Search path', color: 'var(--color-accent-purple)' },
			{ label: 'Visited output', color: 'var(--color-accent-green)' },
		],
		compareCards: [
			{
				label: 'Balanced',
				title: 'Height near log n',
				text: 'Comparisons cut away large subtrees, so search stays shallow.',
			},
			{
				label: 'Unbalanced',
				title: 'Height near n',
				text: 'The tree behaves like a linked list and loses logarithmic behavior.',
			},
		],
		pseudocode: isTraversal ? TRAVERSAL_LINES : BST_LINES,
		conceptChecks: [
			{
				question: isTraversal
					? 'Why does inorder traversal sort a BST?'
					: 'Why does height control BST operation cost?',
				answer: isTraversal
					? 'All smaller values are in the left subtree and all larger values are in the right subtree.'
					: 'Every comparison moves down one level, so the number of comparisons is bounded by the height.',
			},
		],
		prompt,
	};
};

const Tree = () => {
	const [root, setRoot] = useState(() => buildBst(INITIAL_VALUES));
	const [inputValue, setInputValue] = useState('29');
	const [traversalType, setTraversalType] = useState('inorder');
	const [steps, setSteps] = useState(() => getTraversalSteps(buildBst(INITIAL_VALUES), 'inorder'));
	const [stepIndex, setStepIndex] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const [mode, setMode] = useState('traversal');

	const layout = useMemo(() => getTreeLayout(root), [root]);
	const stats = useMemo(() => getTreeStats(root), [root]);
	const currentStep = steps[stepIndex] ?? steps[0];
	const activeNodes = new Set(currentStep?.activeNodes || []);
	const pathNodes = new Set(currentStep?.pathNodes || []);
	const treePrompt = stats.balanced
		? 'Try inserting several increasing values to see how height can drift away from logarithmic behavior.'
		: 'This tree is unbalanced, so search paths can become longer than the ideal log n shape.';
	const learningContent = getTreeLearningContent(
		mode,
		traversalType,
		stats,
		treePrompt
	);

	useEffect(() => {
		if (!isPlaying) return;
		if (stepIndex >= steps.length - 1) {
			setIsPlaying(false);
			return;
		}
		const timer = window.setTimeout(() => {
			setStepIndex(index => Math.min(index + 1, steps.length - 1));
		}, 850);
		return () => window.clearTimeout(timer);
	}, [isPlaying, stepIndex, steps.length]);

	const resetSteps = nextSteps => {
		setSteps(nextSteps);
		setStepIndex(0);
		setIsPlaying(false);
	};

	const parseValue = () => {
		const parsed = Number.parseInt(inputValue, 10);
		return Number.isFinite(parsed) ? parsed : null;
	};

	const handleSearch = () => {
		const value = parseValue();
		if (value == null) return;
		setMode('search');
		resetSteps(getSearchSteps(root, value));
	};

	const handleInsert = () => {
		const value = parseValue();
		if (value == null) return;
		const existed = containsValue(root, value);
		const nextRoot = insertValue(root, value);
		setRoot(nextRoot);
		setMode('search');
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
	};

	const handleDelete = () => {
		const value = parseValue();
		if (value == null) return;
		const existed = containsValue(root, value);
		const nextRoot = deleteValue(root, value);
		setRoot(nextRoot);
		setMode('search');
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
	};

	const handleTraversal = () => {
		setMode('traversal');
		resetSteps(getTraversalSteps(root, traversalType));
	};

	const handleReset = () => {
		const nextRoot = buildBst(INITIAL_VALUES);
		setRoot(nextRoot);
		setInputValue('29');
		setTraversalType('inorder');
		setMode('traversal');
		resetSteps(getTraversalSteps(nextRoot, 'inorder'));
	};

	return (
		<div className={styles.dashboard}>
			<section className={styles.treePanel}>
				<div className={styles.controls}>
					<div className={styles.titleBlock}>
						<strong>Binary search tree lab</strong>
						<span>Compare, branch, visit, and rebalance mentally</span>
					</div>
					<div className={styles.valueControls}>
						<label>
							<span>Value</span>
							<input
								type="number"
								value={inputValue}
								onChange={event => setInputValue(event.target.value)}
								onKeyDown={event => {
									if (event.key === 'Enter') handleSearch();
								}}
							/>
						</label>
						<button type="button" onClick={handleInsert} title="Insert value">
							<Plus size={16} />
							Insert
						</button>
						<button type="button" onClick={handleSearch} title="Search value">
							<Search size={16} />
							Search
						</button>
						<button type="button" onClick={handleDelete} title="Delete value">
							<Trash2 size={16} />
							Delete
						</button>
					</div>
					<div className={styles.traversalControls}>
						<label>
							<span>Traversal</span>
							<select
								value={traversalType}
								onChange={event => setTraversalType(event.target.value)}
							>
								{Object.entries(TRAVERSAL_LABELS).map(([id, label]) => (
									<option key={id} value={id}>
										{label}
									</option>
								))}
							</select>
						</label>
						<button type="button" onClick={handleTraversal}>
							Run
						</button>
						<button type="button" onClick={handleReset} title="Reset tree">
							<RotateCcw size={16} />
						</button>
					</div>
				</div>

				<div className={styles.canvasShell}>
					<svg
						className={styles.treeSvg}
						viewBox={`0 0 ${layout.width} ${layout.height}`}
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
								<g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
									<circle
										r="24"
										className={`${styles.nodeCircle} ${
											isPath ? styles.nodePath : ''
										} ${isActive ? styles.nodeActive : ''}`}
									/>
									<text className={styles.nodeText} textAnchor="middle" dy="5">
										{node.value}
									</text>
								</g>
							);
						})}
					</svg>
				</div>
			</section>

			<aside className={styles.lessonPanel}>
				<div className={styles.statsGrid}>
					<div>
						<span>Nodes</span>
						<strong>{stats.count}</strong>
					</div>
					<div>
						<span>Height</span>
						<strong>{stats.height}</strong>
					</div>
					<div>
						<span>Leaves</span>
						<strong>{stats.leaves}</strong>
					</div>
					<div>
						<span>Balanced</span>
						<strong>{stats.balanced ? 'Yes' : 'No'}</strong>
					</div>
				</div>

				<div className={styles.playback}>
					<button
						type="button"
						onClick={() => setStepIndex(index => Math.max(index - 1, 0))}
						disabled={stepIndex === 0}
						title="Previous step"
					>
						<ChevronLeft size={18} />
					</button>
					<button
						type="button"
						onClick={() => setIsPlaying(prev => !prev)}
						className={styles.playButton}
						title={isPlaying ? 'Pause' : 'Play'}
					>
						{isPlaying ? <Pause size={18} /> : <Play size={18} />}
					</button>
					<button
						type="button"
						onClick={() =>
							setStepIndex(index => Math.min(index + 1, steps.length - 1))
						}
						disabled={stepIndex >= steps.length - 1}
						title="Next step"
					>
						<ChevronRight size={18} />
					</button>
					<span>
						{stepIndex + 1}/{steps.length}
					</span>
				</div>

				<div className={styles.stepCard}>
					<strong>{currentStep?.title}</strong>
					<p>{currentStep?.description}</p>
				</div>

				<div>
					<div className={styles.sectionLabel}>Output</div>
					<div className={styles.outputRow}>
						{currentStep?.output?.length ? (
							currentStep.output.map((item, index) => (
								<span key={`${item}-${index}`}>{item}</span>
							))
						) : (
							<small>Waiting for visits</small>
						)}
					</div>
				</div>

				<LearningPanel
					content={learningContent}
					trace={{
						title: currentStep?.title,
						text: currentStep?.description,
						steps: [
							{
								label: 'Path',
								text: currentStep?.pathNodes?.length
									? currentStep.pathNodes.join(', ')
									: 'waiting for a path',
							},
							{
								label: 'Output',
								text: currentStep?.output?.length
									? currentStep.output.join(', ')
									: 'no visits yet',
							},
						],
					}}
					activeLine={currentStep?.line}
					accent="var(--color-accent-purple)"
				/>
			</aside>
		</div>
	);
};

export default Tree;
