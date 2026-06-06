import { useMemo } from 'react';
import { STORY_PARAMS } from './scenes.js';
import { analyseRecurrence, buildLevels, formatNumber } from './masterMath.js';
import styles from './MasterTheoremStage.module.css';

// Stage geometry. The recursion tree is laid out top-down in a fixed viewBox so
// the prose column can drive how many levels are revealed per scene without the
// layout jumping. Node x-positions are spread evenly within each level.
const VIEW_W = 480;
const VIEW_H = 300;
const PAD_X = 28;
const PAD_TOP = 26;
const LEVEL_GAP = 64;
const NODE_R = 9;
const TREE_DEPTH = 3; // levels 0..3 for the merge-sort example (a=2, b=2)

const buildTreeNodes = (a, depth) => {
	const levels = [];
	for (let level = 0; level <= depth; level += 1) {
		const count = a ** level;
		const usableW = VIEW_W - PAD_X * 2;
		const nodes = Array.from({ length: count }, (_, i) => ({
			id: `${level}-${i}`,
			level,
			x: PAD_X + ((i + 0.5) / count) * usableW,
			y: PAD_TOP + level * LEVEL_GAP,
		}));
		levels.push(nodes);
	}
	return levels;
};

const MasterTheoremStage = ({ activeScene = 0 }) => {
	const { a, b } = STORY_PARAMS;
	const analysis = useMemo(() => analyseRecurrence(STORY_PARAMS), []);
	const levelData = useMemo(() => buildLevels(STORY_PARAMS, TREE_DEPTH), []);
	const treeLevels = useMemo(() => buildTreeNodes(a, TREE_DEPTH), [a]);

	// How much of the tree is revealed per scene.
	//   0 setup       → just the root
	//   1 unfold      → full tree
	//   2 leaves      → full tree, leaves emphasised
	//   3 levels      → full tree + per-level work bars
	//   4 result      → bars + the dominant side called out
	const visibleDepth = activeScene >= 1 ? TREE_DEPTH : 0;
	const emphasiseLeaves = activeScene === 2;
	const showBars = activeScene >= 3;
	const showResult = activeScene >= 4;
	const { dominant } = analysis;

	// Which level rows are part of the "winning" side, for restrained colouring.
	const isDominantLevel = level => {
		if (!showResult) return false;
		if (dominant === 'leaves') return level === TREE_DEPTH;
		if (dominant === 'root') return level === 0;
		return true; // levels tie
	};

	const renderEdges = () => {
		if (visibleDepth < 1) return null;
		const lines = [];
		for (let level = 0; level < visibleDepth; level += 1) {
			treeLevels[level].forEach((parent, parentIdx) => {
				const children = treeLevels[level + 1];
				for (let c = 0; c < a; c += 1) {
					const child = children[parentIdx * a + c];
					if (!child) continue;
					lines.push(
						<line
							key={`${parent.id}->${child.id}`}
							x1={parent.x}
							y1={parent.y + NODE_R}
							x2={child.x}
							y2={child.y - NODE_R}
							className={styles.edge}
						/>
					);
				}
			});
		}
		return lines;
	};

	return (
		<div
			className={styles.wrap}
			data-scene={activeScene}
			role="img"
			aria-label="Recursion tree for T(n) = a·T(n/b) + f(n), showing where the work piles up"
		>
			<svg
				viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
				className={styles.svg}
				preserveAspectRatio="xMidYMid meet"
			>
				<g className={styles.edgeGroup}>{renderEdges()}</g>

				{treeLevels.slice(0, visibleDepth + 1).map((nodes, level) => {
					const isLeafRow = level === TREE_DEPTH;
					let nodeClass = styles.node;
					if (isLeafRow && (emphasiseLeaves || dominant === 'leaves')) {
						nodeClass = `${styles.node} ${styles.nodeLeaf}`;
					} else if (level === 0 && dominant === 'root' && showResult) {
						nodeClass = `${styles.node} ${styles.nodeRoot}`;
					}
					return (
						<g
							key={level}
							className={styles.levelGroup}
							style={{ '--delay': `${level * 90}ms` }}
						>
							{nodes.map(node => (
								<circle
									key={node.id}
									cx={node.x}
									cy={node.y}
									r={NODE_R}
									className={nodeClass}
								/>
							))}
						</g>
					);
				})}
			</svg>

			{/* Per-level work bars: leaves-vs-combine, the heart of the theorem. */}
			<div
				className={`${styles.bars} ${showBars ? styles.barsShow : ''}`}
				aria-hidden={!showBars}
			>
				<p className={styles.barsTitle}>Work per level</p>
				<ol className={styles.barRows}>
					{levelData.map(level => (
						<li key={level.level} className={styles.barRow}>
							<span className={styles.barLabel}>
								L{level.level}
							</span>
							<span className={styles.barTrack}>
								<span
									className={`${styles.barFill} ${
										isDominantLevel(level.level)
											? styles.barFillDominant
											: ''
									}`}
									style={{ width: `${level.width}%` }}
								/>
							</span>
							<span className={styles.barValue}>
								{formatNumber(level.relativeWork)}×
							</span>
						</li>
					))}
				</ol>
			</div>

			{/* The verdict, revealed on the final scene. */}
			<div
				className={`${styles.verdict} ${showResult ? styles.verdictShow : ''}`}
				aria-hidden={!showResult}
			>
				<span className={styles.verdictCase}>{analysis.name}</span>
				<span className={styles.verdictResult}>{analysis.result}</span>
			</div>

			<div className={styles.notation} aria-hidden="true">
				T(n) = {a}·T(n/{b}) + n
			</div>
		</div>
	);
};

export default MasterTheoremStage;
