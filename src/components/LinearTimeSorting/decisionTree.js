// decisionTree — the pure comparison-sort lower-bound model.
//
// The Ω(n log n) lower bound for comparison sorts is an information-theoretic
// argument, NOT a property of any one algorithm. This module makes the argument
// concrete and unit-testable:
//
//   • A comparison sort that only learns about its input through pairwise
//     comparisons is a BINARY DECISION TREE. Each internal node asks one
//     question "is A[i] < A[j]?"; the two children are the yes/no answers.
//   • To sort n distinct items correctly the tree must be able to output every
//     one of the n! input permutations, so it needs at least n! reachable
//     LEAVES (one per permutation).
//   • A binary tree of height h has at most 2^h leaves. Therefore
//         2^h ≥ n!   ⟹   h ≥ log2(n!) = Ω(n log n).
//     h is the worst-case number of comparisons (the longest root-to-leaf path),
//     so NO comparison sort can beat Ω(n log n) in the worst case.
//
// Everything here is pure (no React) so the arithmetic and the small-n tree can
// be unit-tested directly. The stage renders the returned model; it never
// recomputes the bound.

// factorial(n) — n! as an exact integer for the small n we visualize.
export const factorial = n => {
	if (!Number.isInteger(n) || n < 0) return NaN;
	let acc = 1;
	for (let i = 2; i <= n; i += 1) acc *= i;
	return acc;
};

// All permutations of [0..n-1], in lexicographic order, as label strings like
// "a<b<c". Used as the leaves of the decision tree (one sorted order each).
export const permutations = items => {
	if (items.length <= 1) return [items.slice()];
	const out = [];
	items.forEach((item, idx) => {
		const rest = [...items.slice(0, idx), ...items.slice(idx + 1)];
		permutations(rest).forEach(tail => out.push([item, ...tail]));
	});
	return out;
};

// log2(n!) without overflow for large n: sum of log2(i). This is the exact
// minimum height (in comparisons) the decision tree can have.
export const log2Factorial = n => {
	if (!Number.isInteger(n) || n < 0) return NaN;
	let acc = 0;
	for (let i = 2; i <= n; i += 1) acc += Math.log2(i);
	return acc;
};

/**
 * lowerBound — the comparison lower bound for sorting n distinct items.
 *
 * @param {number} n number of items.
 * @returns {{
 *   n: number,
 *   leaves: number,          // n!  — distinct outputs the tree must reach
 *   log2Leaves: number,      // log2(n!) — the exact information content (bits)
 *   minComparisons: number,  // ⌈log2(n!)⌉ — worst-case comparisons any
 *                            //   comparison sort needs (tree height ≥ this)
 *   maxLeavesAtHeight: function(h): number  // 2^h, the leaf budget at height h
 * }}
 */
export const lowerBound = n => {
	const leaves = factorial(n);
	const log2Leaves = log2Factorial(n);
	return {
		n,
		leaves,
		log2Leaves,
		minComparisons: Math.ceil(log2Leaves),
		maxLeavesAtHeight: h => 2 ** h,
	};
};

// A single decision-tree node. Internal nodes carry a `compare` label
// ("a:b" meaning "is a < b?"); leaves carry a sorted `order` string.
const node = props => ({
	id: props.id,
	depth: props.depth,
	kind: props.kind, // 'compare' | 'leaf'
	compare: props.compare ?? null,
	yes: props.yes ?? null,
	no: props.no ?? null,
	order: props.order ?? null,
});

// Build an optimal comparison-tree for sorting three labelled items (the canvas
// case). Three items → 3! = 6 leaves; an optimal tree has height 3, so the
// worst case is 3 comparisons (⌈log2 6⌉ = 3). The structure below is the
// textbook insertion-sort decision tree on [a, b, c].
//
// The labels read as "x<y": at each node we ask whether the first is less than
// the second; the YES branch takes the "<" answer, the NO branch the "≥" answer.
const buildThreeItemTree = ([a, b, c]) => {
	let counter = 0;
	const id = () => `n${counter++}`;
	const leaf = (depth, order) =>
		node({ id: id(), depth, kind: 'leaf', order: order.join('<') });
	const cmp = (depth, x, y, yes, no) =>
		node({ id: id(), depth, kind: 'compare', compare: `${x}<${y}`, yes, no });

	// Root: a<b ?
	return cmp(
		0,
		a,
		b,
		// a<b : now b<c ?
		cmp(
			1,
			b,
			c,
			leaf(2, [a, b, c]), // a<b<c
			// b≥c : a<c ?
			cmp(2, a, c, leaf(3, [a, c, b]), leaf(3, [c, a, b]))
		),
		// a≥b : now b<c ? (mirror)
		cmp(
			1,
			a,
			c,
			leaf(2, [b, a, c]), // b<a<c
			// a≥c : b<c ?
			cmp(2, b, c, leaf(3, [b, c, a]), leaf(3, [c, b, a]))
		)
	);
};

/**
 * decisionTree — a small concrete comparison tree for n labelled items.
 *
 * Only n = 3 has an explicit hand-built optimal tree (the canvas case). For
 * other n we still return the leaf set (all n! orders) and the bound, with a
 * null `root`, so callers can show the leaf count / height argument even when a
 * full tree is too large to draw.
 *
 * @param {string[]} labels item labels, e.g. ['a','b','c'].
 * @returns {{
 *   labels, n, root, leaves: string[], bound
 * }}
 */
export const decisionTree = (labels = ['a', 'b', 'c']) => {
	const n = labels.length;
	const leaves = permutations(labels).map(order => order.join('<'));
	const root = n === 3 ? buildThreeItemTree(labels) : null;
	return { labels, n, root, leaves, bound: lowerBound(n) };
};

// treeHeight — longest root-to-leaf path length (edges) of a built tree.
// Returns -1 for a null/empty tree, 0 for a lone leaf.
export const treeHeight = root => {
	if (!root) return -1;
	if (root.kind === 'leaf') return 0;
	return 1 + Math.max(treeHeight(root.yes), treeHeight(root.no));
};

// countLeaves — number of leaves reachable in a built tree.
export const countLeaves = root => {
	if (!root) return 0;
	if (root.kind === 'leaf') return 1;
	return countLeaves(root.yes) + countLeaves(root.no);
};

// flattenLevels — group nodes by depth, so the stage can draw the tree row by
// row. Returns an array of arrays of nodes (index = depth).
export const flattenLevels = root => {
	const levels = [];
	const walk = nd => {
		if (!nd) return;
		(levels[nd.depth] ||= []).push(nd);
		walk(nd.yes);
		walk(nd.no);
	};
	walk(root);
	return levels;
};

export default decisionTree;
