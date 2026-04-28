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
			'Build graphs interactively. Edit the adjacency list or matrix and see changes reflected live in the visualization. Toggle directed/weighted edges.',
		algorithms: ['Adjacency List', 'Adjacency Matrix', 'Directed', 'Weighted'],
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
					Interactive step-by-step visualizations with synchronized pseudocode
					highlighting. Choose a category to begin exploring.
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
