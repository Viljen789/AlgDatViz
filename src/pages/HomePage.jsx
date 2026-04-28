import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './HomePage.module.css';

const HOME_CARDS = [
	{
		id: 'sorting',
		to: '/sorting',
		title: 'Sorting Algorithms',
		description:
			'Watch Bubble, Selection, Insertion, Quick, Merge, Heap, Counting, Radix and Bucket Sort organize data step-by-step with synchronized pseudocode.',
		algorithms: ['Bubble', 'Selection', 'Insertion', 'Quick', 'Merge', 'Heap'],
		accent: '#4f7cf8',
		symbol: (
			<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
				<rect x="4" y="20" width="4" height="8" rx="1" fill="#4f7cf8" opacity="0.9" />
				<rect x="10" y="14" width="4" height="14" rx="1" fill="#4f7cf8" opacity="0.75" />
				<rect x="16" y="8" width="4" height="20" rx="1" fill="#4f7cf8" opacity="0.6" />
				<rect x="22" y="4" width="4" height="24" rx="1" fill="#4f7cf8" opacity="0.45" />
			</svg>
		),
	},
	{
		id: 'graph',
		to: '/graph',
		title: 'Graph Visualizer',
		description:
			'Build graphs, edit representations, and step through BFS, DFS, Dijkstra, spanning trees, topological sorting, and max flow.',
		algorithms: ['BFS', 'DFS', 'Dijkstra', 'MST', 'Topo', 'Flow'],
		accent: '#38c9a0',
		symbol: (
			<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
				<circle cx="6" cy="6" r="4" fill="#38c9a0" opacity="0.9" />
				<circle cx="26" cy="8" r="4" fill="#38c9a0" opacity="0.75" />
				<circle cx="16" cy="24" r="4" fill="#38c9a0" opacity="0.6" />
				<line x1="6" y1="6" x2="26" y2="8" stroke="#38c9a0" strokeWidth="1.5" opacity="0.5" />
				<line x1="6" y1="6" x2="16" y2="24" stroke="#38c9a0" strokeWidth="1.5" opacity="0.5" />
				<line x1="26" y1="8" x2="16" y2="24" stroke="#38c9a0" strokeWidth="1.5" opacity="0.5" />
			</svg>
		),
	},
	{
		id: 'hashmap',
		to: '/hashmap',
		title: 'Hash Maps',
		description:
			'Practice put, get, delete, collisions, chaining, load factor, and resizing with a bucket-level visualizer.',
		algorithms: ['Hashing', 'Chaining', 'Collisions', 'Resize'],
		accent: '#f8a74f',
		symbol: (
			<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
				<rect x="4" y="5" width="24" height="5" rx="1" fill="#f8a74f" opacity="0.9" />
				<rect x="4" y="13.5" width="24" height="5" rx="1" fill="#f8a74f" opacity="0.65" />
				<rect x="4" y="22" width="24" height="5" rx="1" fill="#f8a74f" opacity="0.42" />
				<circle cx="10" cy="16" r="2.5" fill="#38c9a0" />
				<circle cx="17" cy="16" r="2.5" fill="#38c9a0" opacity="0.72" />
			</svg>
		),
	},
	{
		id: 'stacks-queues',
		to: '/stacks-queues',
		title: 'Stacks & Queues',
		description:
			'Compare LIFO and FIFO behavior with push, pop, enqueue, dequeue, peek, and guided operation traces.',
		algorithms: ['Stack', 'Queue', 'LIFO', 'FIFO', 'BFS', 'DFS'],
		accent: '#7fa4fc',
		symbol: (
			<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
				<rect x="5" y="20" width="10" height="5" rx="1.2" fill="#7fa4fc" opacity="0.95" />
				<rect x="5" y="14" width="10" height="5" rx="1.2" fill="#7fa4fc" opacity="0.72" />
				<rect x="5" y="8" width="10" height="5" rx="1.2" fill="#7fa4fc" opacity="0.5" />
				<path d="M20 10h6M20 16h6M20 22h6" stroke="#38c9a0" strokeWidth="2.2" strokeLinecap="round" />
				<path d="M23 7v18" stroke="#38c9a0" strokeWidth="1.5" opacity="0.45" strokeLinecap="round" />
			</svg>
		),
	},
	{
		id: 'tree',
		to: '/tree',
		title: 'Trees',
		description:
			'Use a binary search tree to see comparisons, branching, insert/search/delete behavior, and traversal orders.',
		algorithms: ['BST', 'Search', 'Insert', 'Delete', 'Traversal'],
		accent: '#c97af8',
		symbol: (
			<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
				<circle cx="16" cy="6" r="4" fill="#c97af8" opacity="0.95" />
				<circle cx="9" cy="18" r="4" fill="#c97af8" opacity="0.7" />
				<circle cx="23" cy="18" r="4" fill="#c97af8" opacity="0.7" />
				<circle cx="5" cy="28" r="3" fill="#c97af8" opacity="0.48" />
				<circle cx="13" cy="28" r="3" fill="#c97af8" opacity="0.48" />
				<line x1="16" y1="10" x2="9" y2="14" stroke="#c97af8" strokeWidth="1.5" opacity="0.55" />
				<line x1="16" y1="10" x2="23" y2="14" stroke="#c97af8" strokeWidth="1.5" opacity="0.55" />
				<line x1="9" y1="22" x2="5" y2="25" stroke="#c97af8" strokeWidth="1.5" opacity="0.4" />
				<line x1="9" y1="22" x2="13" y2="25" stroke="#c97af8" strokeWidth="1.5" opacity="0.4" />
			</svg>
		),
	},
	{
		id: 'strategies',
		to: '/strategies',
		title: 'Algorithm Strategies',
		description:
			'Learn dynamic programming and greedy thinking with small guided examples, tables, local choices, and proof cues.',
		algorithms: ['DP', 'Greedy', 'State', 'Recurrence', 'Exchange'],
		accent: '#38c9a0',
		symbol: (
			<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
				<rect x="4" y="5" width="6" height="6" rx="1.2" fill="#4f7cf8" opacity="0.95" />
				<rect x="13" y="5" width="6" height="6" rx="1.2" fill="#4f7cf8" opacity="0.75" />
				<rect x="22" y="5" width="6" height="6" rx="1.2" fill="#4f7cf8" opacity="0.55" />
				<path d="M6 23c5-8 10-8 20-8" stroke="#38c9a0" strokeWidth="2.2" strokeLinecap="round" />
				<circle cx="7" cy="23" r="2.5" fill="#38c9a0" />
				<circle cx="18" cy="17" r="2.5" fill="#38c9a0" opacity="0.72" />
				<circle cx="26" cy="15" r="2.5" fill="#38c9a0" opacity="0.52" />
			</svg>
		),
	},
	{
		id: 'master',
		to: '/master-theorem',
		title: 'Master Theorem',
		description:
			'Compare recursion leaves against combine work with sliders, examples, and a level-by-level recursion tree.',
		algorithms: ['Recurrences', 'Cases', 'Theta', 'Recursion Tree'],
		accent: '#f8c040',
		symbol: (
			<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
				<path d="M8 6h16M8 26h16M22 6 11 16l11 10" stroke="#f8c040" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
				<circle cx="10" cy="16" r="2.5" fill="#38c9a0" />
				<rect x="20" y="13" width="6" height="6" rx="1.5" fill="#4f7cf8" opacity="0.78" />
			</svg>
		),
	},
];

const LEGEND = [
	{ color: '#4f7cf8', label: 'Comparing' },
	{ color: '#f8a74f', label: 'Swapping / Writing' },
	{ color: '#38c9a0', label: 'Sorted / Found' },
	{ color: '#f86060', label: 'Pivot / Target' },
	{ color: '#f8c040', label: 'Path' },
];

const HomePage = () => {
	const navigate = useNavigate();
	const [hovered, setHovered] = useState(null);

	return (
		<div className={styles.container}>
			<div className={styles.intro}>
				<p className={styles.introText}>
					Interactive step-by-step visualizations with synchronized state,
					pseudocode, and short explanations. Choose a concept to begin
					exploring.
				</p>
			</div>

			<div className={styles.grid}>
				{HOME_CARDS.map(card => {
					const isHovered = hovered === card.id;
					return (
						<button
							key={card.id}
							onClick={() => navigate(card.to)}
							onMouseEnter={() => setHovered(card.id)}
							onMouseLeave={() => setHovered(null)}
							className={styles.card}
							style={{
								borderColor: isHovered ? `${card.accent}aa` : undefined,
								background: isHovered ? `${card.accent}09` : undefined,
								transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
								boxShadow: isHovered
									? `0 8px 32px ${card.accent}28`
									: 'none',
							}}
						>
							<div className={styles.cardHead}>
								{card.symbol}
								<span
									className={styles.arrow}
									style={{
										opacity: isHovered ? 1 : 0,
										color: card.accent,
										transform: isHovered
											? 'translateX(0)'
											: 'translateX(-6px)',
									}}
								>
									→
								</span>
							</div>
							<div className={styles.cardTitle}>{card.title}</div>
							<div className={styles.cardDesc}>{card.description}</div>
							<div className={styles.tagRow}>
								{card.algorithms.map(a => (
									<span
										key={a}
										className={styles.tag}
										style={{
											borderColor: `${card.accent}55`,
											color: `${card.accent}cc`,
										}}
									>
										{a}
									</span>
								))}
							</div>
						</button>
					);
				})}
			</div>

			<div className={styles.legend}>
				<span className={styles.legendTitle}>LEGEND</span>
				{LEGEND.map(({ color, label }) => (
					<div key={label} className={styles.legendItem}>
						<div className={styles.dot} style={{ background: color }} />
						<span className={styles.legendLabel}>{label}</span>
					</div>
				))}
			</div>
		</div>
	);
};

export default HomePage;
