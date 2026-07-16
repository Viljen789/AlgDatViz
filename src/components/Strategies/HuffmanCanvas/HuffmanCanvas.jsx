import { useMemo } from 'react';
import styles from './HuffmanCanvas.module.css';

// Layout constants for the forest of trees. Roots sit on a common top line (the
// priority queue), children fan downward — so the row of roots literally reads as
// "the trees still in Q".
const LEAF_SPACING = 56;
const LEVEL_HEIGHT = 52;
const TREE_GAP = 28;
const NODE_R = 17;
const PAD_X = NODE_R + 6;
const PAD_Y = NODE_R + 6;

// Depth of a node within its own tree (root = 0).
const treeDepth = node => {
	if (!node || (!node.left && !node.right)) return 0;
	return 1 + Math.max(treeDepth(node.left), treeDepth(node.right));
};

const leafCount = node => {
	if (!node) return 0;
	if (!node.left && !node.right) return 1;
	return leafCount(node.left) + leafCount(node.right);
};

// Lay out one tree into absolute coordinates, offset by xOffset. Leaves are
// packed left-to-right; each internal node centres over its two children.
const layoutTree = (root, xOffset, nodes, edges) => {
	let leafSlot = 0;
	const place = (node, depth) => {
		if (!node) return null;
		const y = PAD_Y + depth * LEVEL_HEIGHT;
		let x;
		if (!node.left && !node.right) {
			x = xOffset + leafSlot * LEAF_SPACING + LEAF_SPACING / 2;
			leafSlot += 1;
		} else {
			const lx = place(node.left, depth + 1);
			const rx = place(node.right, depth + 1);
			x = (lx + rx) / 2;
			edges.push({
				id: `${node.id}-L`,
				x1: x,
				y1: y,
				x2: lx,
				y2: PAD_Y + (depth + 1) * LEVEL_HEIGHT,
				bit: '0',
			});
			edges.push({
				id: `${node.id}-R`,
				x1: x,
				y1: y,
				x2: rx,
				y2: PAD_Y + (depth + 1) * LEVEL_HEIGHT,
				bit: '1',
			});
		}
		nodes.push({
			id: node.id,
			x,
			y,
			char: node.char,
			freq: node.freq,
			isLeaf: !node.left && !node.right,
		});
		return x;
	};
	place(root, 0);
};

const layoutForest = forest => {
	const nodes = [];
	const edges = [];
	let xOffset = PAD_X;
	let maxDepth = 0;
	for (const tree of forest) {
		const width = Math.max(1, leafCount(tree)) * LEAF_SPACING;
		layoutTree(tree, xOffset, nodes, edges);
		xOffset += width + TREE_GAP;
		maxDepth = Math.max(maxDepth, treeDepth(tree));
	}
	const width = Math.max(xOffset - TREE_GAP + PAD_X, LEAF_SPACING + PAD_X * 2);
	const height = PAD_Y * 2 + maxDepth * LEVEL_HEIGHT;
	return { nodes, edges, width, height };
};

const HuffmanCanvas = ({ frame }) => {
	const forest = useMemo(() => frame?.forest ?? [], [frame]);
	const layout = useMemo(() => layoutForest(forest), [forest]);
	const selected = useMemo(() => new Set(frame?.selectedIds ?? []), [frame]);
	const mergedId = frame?.mergedId ?? null;
	const codes = frame?.codes ?? null;

	const stateFor = node => {
		if (selected.has(node.id)) return 'selected';
		if (node.id === mergedId) return 'merged';
		if (node.isLeaf) return 'leaf';
		return 'internal';
	};

	return (
		<div className={styles.canvas}>
			<div className={styles.queueLabel}>
				<span className={styles.queueTag}>PRIORITY QUEUE</span>
				<span className={styles.queueHint}>
					trees ordered by frequency — roots on the top line
				</span>
			</div>

			<div className={styles.treeScroll}>
				<svg
					className={styles.svg}
					width={layout.width}
					height={layout.height}
					viewBox={`0 0 ${layout.width} ${layout.height}`}
					role="img"
					aria-label="Huffman forest"
					key={frame?.step}
				>
					{layout.edges.map(e => {
						const midX = (e.x1 + e.x2) / 2;
						const midY = (e.y1 + e.y2) / 2;
						return (
							<g key={e.id} className={styles.edgeGroup}>
								<line
									x1={e.x1}
									y1={e.y1}
									x2={e.x2}
									y2={e.y2}
									className={styles.edge}
								/>
								<text
									x={midX}
									y={midY}
									className={styles.edgeBit}
									textAnchor="middle"
									dominantBaseline="middle"
								>
									{e.bit}
								</text>
							</g>
						);
					})}

					{layout.nodes.map(node => {
						const state = stateFor(node);
						return (
							<g
								key={node.id}
								className={`${styles.node} ${styles[`node-${state}`]}`}
								transform={`translate(${node.x} ${node.y})`}
							>
								<circle r={NODE_R} className={styles.nodeCircle} />
								{node.isLeaf ? (
									<>
										<text
											className={styles.nodeChar}
											textAnchor="middle"
											dy="-1"
										>
											{node.char}
										</text>
										<text
											className={styles.nodeFreqSmall}
											textAnchor="middle"
											dy="10"
										>
											{node.freq}
										</text>
									</>
								) : (
									<text
										className={styles.nodeFreq}
										textAnchor="middle"
										dominantBaseline="central"
									>
										{node.freq}
									</text>
								)}
							</g>
						);
					})}
				</svg>
			</div>

			{codes && (
				<div className={styles.codeTable}>
					<span className={styles.codeTag}>CODEWORDS</span>
					<div className={styles.codeRows}>
						{Object.entries(codes)
							.sort(
								(a, b) => a[1].length - b[1].length || a[0].localeCompare(b[0])
							)
							.map(([char, code]) => (
								<div key={char} className={styles.codeRow}>
									<span className={styles.codeChar}>{char}</span>
									<span className={styles.codeArrow}>→</span>
									<span className={styles.codeBits}>
										{code.split('').map((bit, i) => (
											<span
												key={i}
												className={bit === '0' ? styles.bit0 : styles.bit1}
											>
												{bit}
											</span>
										))}
									</span>
									<span className={styles.codeLen}>
										{code.length} bit{code.length === 1 ? '' : 's'}
									</span>
								</div>
							))}
					</div>
				</div>
			)}
		</div>
	);
};

export default HuffmanCanvas;
