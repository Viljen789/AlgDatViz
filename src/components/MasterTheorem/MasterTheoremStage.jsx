import { useMemo } from 'react';
import { SCENES, STORY_PARAMS } from './scenes.js';
import {
	recurrenceShape,
	formatNumber,
	formatPower,
	formatLog,
} from './masterMath.js';
import { SceneNarration } from '../../common/PlaybackEngine';
import styles from './MasterTheoremStage.module.css';

// Stage geometry. The recursion tree is laid out top-down in a fixed viewBox so
// the prose column can drive how many levels are revealed per scene without the
// layout jumping. Node x-positions are spread evenly within each level. The
// *shape* of the tree (branching, width) and the per-level work bars are driven
// by the active scene's recurrence, so the silhouette re-shapes per case:
// bottom-heavy when the leaves win, even on a tie, top-heavy when the root wins.
const VIEW_W = 480;
const VIEW_H = 300;
const PAD_X = 28;
const PAD_TOP = 26;
const NODE_R = 9;

// Lay out a^level nodes per level inside the viewBox. `depth` is the legibility-
// capped tree depth from recurrenceShape, so a high branching factor a is drawn
// over fewer levels rather than spilling hundreds of leaves off the stage. The
// vertical gap adapts to the depth so 1-level and 3-level trees both fill height.
const buildTreeNodes = (a, depth) => {
	const levelGap = depth > 0 ? (VIEW_H - PAD_TOP * 2) / depth : 0;
	const levels = [];
	for (let level = 0; level <= depth; level += 1) {
		const count = a ** level;
		const usableW = VIEW_W - PAD_X * 2;
		const nodes = Array.from({ length: count }, (_, i) => ({
			id: `${level}-${i}`,
			level,
			x: PAD_X + ((i + 0.5) / count) * usableW,
			y: PAD_TOP + level * levelGap,
		}));
		levels.push(nodes);
	}
	return levels;
};

const MasterTheoremStage = ({ activeScene = 0 }) => {
	// Each scene may pin its own recurrence so the stage demonstrates that case's
	// shape; scenes without one fall back to the running merge-sort example.
	const params = SCENES[activeScene]?.recurrence ?? STORY_PARAMS;
	const { a, b, d, k } = params;

	// One analysis drives the whole picture, so the silhouette, the colouring,
	// and the verdict chip can never disagree with each other or with the prose.
	const shape = useMemo(() => recurrenceShape(params), [params]);
	const { treeDepth, dominantLevel, profile, levels: levelData } = shape;
	const treeLevels = useMemo(
		() => buildTreeNodes(a, treeDepth),
		[a, treeDepth]
	);

	// How much of the stage is revealed.
	//   scene 0 (setup) → just the root, no bars, no verdict
	//   scenes 1–2      → the tree unfolds (leaves emphasised on scene 2)
	//   scene 3+        → tree + per-level work bars
	//   scene 4+        → bars + the dominant side called out + verdict chip
	// Any scene that pins a recurrence is *about* its shape, so it always shows
	// the full silhouette (full tree, bars, verdict) regardless of index.
	const pinned = Boolean(SCENES[activeScene]?.recurrence);
	const unfolded = activeScene >= 1 || pinned;
	const emphasiseLeaves = activeScene === 2;
	const showBars = activeScene >= 3 || pinned;
	const showResult = activeScene >= 4 || pinned;

	const visibleDepth = unfolded ? treeDepth : 0;

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

	// The f(n) combine term, written honestly from d and k (e.g. "n", "n^2",
	// "n log n"), so the notation matches whichever recurrence is on screen.
	const combineTerm = `${formatPower(d)}${formatLog(k)}`.trim();

	// Per-scene narration for screen readers — the honest WHY the silhouette and
	// bars paint, and (once revealed) the verdict the figure shows. The dominant
	// side IS the case, so it is named the same way the picture colours it.
	const dominantClause =
		shape.dominant === 'leaves'
			? 'the leaves carry the work'
			: shape.dominant === 'root'
				? 'the root carries the work'
				: 'every level carries equal work';
	const sceneNarration = showResult
		? `T(n) = ${a}·T(n/${b}) + ${combineTerm}: ${dominantClause} — ${shape.name}, ${shape.result}.`
		: emphasiseLeaves
			? `The recursion tree for T(n) = ${a}·T(n/${b}) + ${combineTerm} has ${a} branches per node down to its leaves.`
			: unfolded
				? `The recursion tree for T(n) = ${a}·T(n/${b}) + ${combineTerm}, branching ${a} ways per level.`
				: `Setting up T(n) = ${a}·T(n/${b}) + ${combineTerm}: ${a} subproblems of size n/${b} plus ${combineTerm} to combine.`;

	return (
		<>
			{/* Per-scene narration for screen readers, OUTSIDE the role=img figure
			    below (which collapses its silhouette + verdict into one static label). */}
			<SceneNarration>{sceneNarration}</SceneNarration>
			<div
				className={styles.wrap}
				data-scene={activeScene}
				data-profile={profile}
				role="img"
				aria-label={`Recursion tree for T(n) = ${a}·T(n/${b}) + ${combineTerm}: a ${profile.replace('-', ' ')} shape where ${shape.dominant === 'leaves' ? 'the leaves carry the work' : shape.dominant === 'root' ? 'the root carries the work' : 'every level carries equal work'}`}
			>
				<svg
					viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
					className={styles.svg}
					preserveAspectRatio="xMidYMid meet"
				>
					<g className={styles.edgeGroup}>{renderEdges()}</g>

					{treeLevels.slice(0, visibleDepth + 1).map((nodes, level) => {
						const isLeafRow = level === treeDepth;
						let nodeClass = styles.node;
						if (isLeafRow && (emphasiseLeaves || dominantLevel === treeDepth)) {
							nodeClass = `${styles.node} ${styles.nodeLeaf}`;
						} else if (level === 0 && dominantLevel === 0 && showResult) {
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

				{/* Per-level work bars: leaves-vs-combine, the heart of the theorem.
			    Their profile (growing, flat, shrinking down the column) IS the
			    case, driven by the same per-level work the verdict cites. */}
				<div
					className={`${styles.bars} ${showBars ? styles.barsShow : ''}`}
					aria-hidden={!showBars}
				>
					<p className={styles.barsTitle}>Work per level</p>
					<ol className={styles.barRows}>
						{levelData.map(level => (
							<li key={level.level} className={styles.barRow}>
								<span className={styles.barLabel}>L{level.level}</span>
								<span className={styles.barTrack}>
									<span
										className={`${styles.barFill} ${
											showResult && level.level === dominantLevel
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

				{/* The verdict, revealed once the dominant side is called out. */}
				<div
					className={`${styles.verdict} ${showResult ? styles.verdictShow : ''}`}
					aria-hidden={!showResult}
				>
					<span className={styles.verdictCase}>{shape.name}</span>
					<span className={styles.verdictResult}>{shape.result}</span>
				</div>

				<div className={styles.notation} aria-hidden="true">
					T(n) = {a}·T(n/{b}) + {combineTerm}
				</div>
			</div>
		</>
	);
};

export default MasterTheoremStage;
