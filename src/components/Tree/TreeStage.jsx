import { useMemo } from 'react';
import { buildBst, getTreeLayout } from './treeUtils.js';
import { INSERT_KEY, SEARCH_KEY, STAGE_VALUES } from './scenes.js';
import styles from './TreeStage.module.css';

// The scrolly stage. One fixed BST, re-lit per scene so the same picture builds
// the concept step by step. It mirrors MergeSortStage: a single SVG whose node
// and edge classes change with `activeScene`, plus a small caption overlay.
//
// Scenes (index → emphasis):
//   0 hierarchy  — reveal the tree level by level, root highlighted.
//   1 invariant  — tint the root's left subtree small, right subtree large.
//   2 search     — light the comparison path down to SEARCH_KEY (54).
//   3 insert     — show the search path to INSERT_KEY (29) + a ghost new node.
//   4 traversal  — animate the inorder visit order with a sorted output strip.

const NODE_R = 22;

// Walk the search path for a key, returning the ordered list of node ids visited
// and, when the key is absent, the id of the node whose empty child it would
// attach under plus which side ('left' | 'right').
const searchPath = (root, key) => {
	const path = [];
	let current = root;
	let parentId = null;
	let side = null;
	while (current) {
		path.push(String(current.value));
		if (current.value === key) {
			return { path, found: true, parentId: null, side: null };
		}
		parentId = String(current.value);
		if (key < current.value) {
			side = 'left';
			current = current.left;
		} else {
			side = 'right';
			current = current.right;
		}
	}
	return { path, found: false, parentId, side };
};

// Inorder sequence of node ids — the visit order the traversal scene animates.
const inorderIds = root => {
	const out = [];
	const walk = node => {
		if (!node) return;
		walk(node.left);
		out.push(String(node.value));
		walk(node.right);
	};
	walk(root);
	return out;
};

const TreeStage = ({ activeScene = 0 }) => {
	const root = useMemo(() => buildBst(STAGE_VALUES), []);
	const layout = useMemo(() => getTreeLayout(root), [root]);

	const rootId = String(STAGE_VALUES[0]);
	const search = useMemo(() => searchPath(root, SEARCH_KEY), [root]);
	const insert = useMemo(() => searchPath(root, INSERT_KEY), [root]);
	const inorder = useMemo(() => inorderIds(root), [root]);

	// Map each node id to whether it sits in the root's left or right subtree,
	// for the invariant scene's smaller/larger tint.
	const subtreeSide = useMemo(() => {
		const map = {};
		const tag = (node, side) => {
			if (!node) return;
			map[String(node.value)] = side;
			tag(node.left, side);
			tag(node.right, side);
		};
		tag(root?.left, 'left');
		tag(root?.right, 'right');
		return map;
	}, [root]);

	// Per-scene emphasis sets.
	const showInvariant = activeScene === 1;
	const isSearch = activeScene === 2;
	const isInsert = activeScene === 3;
	const isTraversal = activeScene === 4;

	const pathIds = new Set(
		isSearch ? search.path : isInsert ? insert.path : []
	);
	// The current "head" of a search/insert path — the node the descent ends on.
	// For search, that's the matched node; for insert, the parent of the new slot.
	const headId = isSearch
		? search.path[search.path.length - 1]
		: isInsert
			? insert.path[insert.path.length - 1]
			: null;

	const visitedIds = isTraversal ? new Set(inorder) : new Set();

	const ghostNode = useMemo(() => {
		if (!isInsert || insert.found || !insert.parentId) return null;
		const parent = layout.nodes.find(n => n.id === insert.parentId);
		if (!parent) return null;
		const dx = insert.side === 'left' ? -52 : 52;
		return { x: parent.x + dx, y: parent.y + 92, value: INSERT_KEY };
	}, [isInsert, insert, layout.nodes]);

	const caption = (() => {
		switch (activeScene) {
			case 0:
				return 'One root, descending levels';
			case 1:
				return 'left < node < right, at every node';
			case 2:
				return `Search ${SEARCH_KEY}: compare, discard half, descend`;
			case 3:
				return `Insert ${INSERT_KEY}: search until a pointer is empty`;
			case 4:
				return 'Inorder · left, self, right → sorted';
			default:
				return '';
		}
	})();

	const revealLevels = activeScene === 0;

	return (
		<div
			className={styles.wrap}
			data-scene={activeScene}
			role="img"
			aria-label="Binary search tree, illustrated scene by scene"
		>
			<svg
				viewBox={`0 0 ${layout.width} ${layout.height}`}
				className={styles.svg}
				preserveAspectRatio="xMidYMid meet"
			>
				{/* Invariant scene: wash the two subtrees of the root. */}
				{showInvariant &&
					(() => {
						const xs = layout.nodes.map(n => n.x);
						const minX = Math.min(...xs) - NODE_R - 8;
						const maxX = Math.max(...xs) + NODE_R + 8;
						const rootNode = layout.nodes.find(n => n.id === rootId);
						const splitX = rootNode ? rootNode.x : (minX + maxX) / 2;
						return (
							<g aria-hidden="true">
								<rect
									x={minX}
									y={0}
									width={Math.max(splitX - minX, 0)}
									height={layout.height}
									className={styles.washLeft}
								/>
								<rect
									x={splitX}
									y={0}
									width={Math.max(maxX - splitX, 0)}
									height={layout.height}
									className={styles.washRight}
								/>
							</g>
						);
					})()}

				{layout.edges.map(edge => {
					const onPath =
						pathIds.has(edge.from.id) && pathIds.has(edge.to.id);
					return (
						<line
							key={`${edge.from.id}-${edge.to.id}`}
							x1={edge.from.x}
							y1={edge.from.y}
							x2={edge.to.x}
							y2={edge.to.y}
							className={onPath ? styles.edgeActive : styles.edge}
						/>
					);
				})}

				{/* Ghost insertion edge + node (insert scene only). */}
				{ghostNode &&
					(() => {
						const parent = layout.nodes.find(
							n => n.id === insert.parentId
						);
						return (
							<g aria-hidden="true">
								<line
									x1={parent.x}
									y1={parent.y}
									x2={ghostNode.x}
									y2={ghostNode.y}
									className={styles.edgeGhost}
								/>
								<g
									transform={`translate(${ghostNode.x}, ${ghostNode.y})`}
									className={styles.ghostGroup}
								>
									<circle r={NODE_R} className={styles.nodeGhost} />
									<text
										className={styles.nodeText}
										textAnchor="middle"
										dy="5"
									>
										{ghostNode.value}
									</text>
								</g>
							</g>
						);
					})()}

				{layout.nodes.map((node, idx) => {
					const isRoot = node.id === rootId;
					const onPath = pathIds.has(node.id);
					const isHead = node.id === headId;
					const isFound =
						isSearch && search.found && node.id === String(SEARCH_KEY);
					const isVisited = visitedIds.has(node.id);
					const side = subtreeSide[node.id];

					const classes = [styles.nodeCircle];
					if (revealLevels) classes.push(styles.nodeReveal);
					if (showInvariant && isRoot) classes.push(styles.nodeRootMark);
					if (showInvariant && side === 'left')
						classes.push(styles.nodeSmaller);
					if (showInvariant && side === 'right')
						classes.push(styles.nodeLarger);
					if (onPath) classes.push(styles.nodePath);
					if (isHead) classes.push(styles.nodeHead);
					if (isFound) classes.push(styles.nodeFound);
					if (isVisited) classes.push(styles.nodeVisited);

					return (
						<g
							key={node.id}
							transform={`translate(${node.x}, ${node.y})`}
							className={revealLevels ? styles.revealGroup : undefined}
							style={
								revealLevels
									? { '--delay': `${node.depth * 90 + idx * 12}ms` }
									: isTraversal
										? { '--delay': `${inorder.indexOf(node.id) * 120}ms` }
										: undefined
							}
						>
							<circle r={NODE_R} className={classes.join(' ')} />
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

			{isTraversal && (
				<div className={styles.outputStrip} aria-hidden="true">
					<span className={styles.outputLabel}>Inorder</span>
					<div className={styles.outputItems}>
						{inorder.map((id, i) => (
							<span
								key={id}
								className={styles.outputItem}
								style={{ '--delay': `${i * 120 + 120}ms` }}
							>
								{id}
							</span>
						))}
					</div>
				</div>
			)}

			<p className={styles.caption}>{caption}</p>
		</div>
	);
};

export default TreeStage;
