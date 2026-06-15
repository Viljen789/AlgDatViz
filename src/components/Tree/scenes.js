// The five scrolly scenes that build BST intuition before the playground.
//
// They teach, in order:
//   1. a tree is hierarchical order (a root with descending levels),
//   2. the BST property (left < node < right) — the invariant,
//   3. why that invariant lets search throw away half the tree,
//   4. insert = a failed search that links at the first empty pointer,
//   5. traversal orders (in / pre / post) and why inorder reads sorted.
//
// Each scene ends with a `check` — a small interactive question the user answers
// before scrolling on. Wrong answers are not punished: the explanation reveals
// regardless of correctness, so every attempt becomes a teaching moment.
//
// Two of the checks are non-MCQ retrieval and graded against real BST helpers
// (not hand-typed answers): the search scene is a `predict` (which branch to
// descend) and the traversal scene is an `order` (reconstruct the in-order
// sequence), whose answer is computed from `inorderValues` over a real tree.

import { buildBst, inorderValues } from './treeUtils.js';

// A fixed nine-node BST used by the stage. Insertion order is chosen so the tree
// is reasonably balanced (height 3) and every level is populated, which keeps
// the geometry stable across scenes.
export const STAGE_VALUES = [42, 23, 61, 12, 31, 54, 72, 36, 65];

// The key the "search" scene chases down the tree, and the slot we attach in the
// "insert" scene. 31 already exists; 29 is new and lands as 31's left child.
export const SEARCH_KEY = 36;
export const INSERT_KEY = 29;

// The branch-choice comprehension check. Searching for 54 from the root (42):
// 54 > 42 → go right. The options mirror the BST decision a learner must make.
const BRANCH_CHECK_KEY = 54;

// A small five-node BST whose in-order sequence the learner reconstructs in the
// traversal scene's `order` check. The answer is computed from the real BST so it
// is guaranteed correct (and is, by the invariant, the values in sorted order).
const ORDER_CHECK_VALUES = [50, 30, 70, 40, 60];
const ORDER_CHECK_TREE = buildBst(ORDER_CHECK_VALUES);
const ORDER_CHECK_INORDER = inorderValues(ORDER_CHECK_TREE).map(String);

export const SCENES = [
	{
		id: 'hierarchy',
		eyebrow: 'Shape',
		title: 'A tree is order, arranged top-down.',
		body: 'One root at the top; every node points to a left and a right child. Depth grows downward, and the whole structure stays connected with no cycles. This shape is the skeleton every search will walk.',
		check: {
			kind: 'choice',
			prompt: 'A node in a binary tree can have at most how many children?',
			options: [1, 2, 3, 'any number'],
			answer: 2,
			misconceptions: {
				'1':
					'One child describes a linked list, not a binary tree. Binary allows a left and a right child, so the fan-out is two, which is what gives a balanced tree its log-height.',
				'3':
					'Three children is a ternary tree. The word binary fixes the maximum fan-out at two: a left child and a right child, never a third.',
				'any number':
					'Unbounded children describes a general tree. A binary tree caps each node at two children, and that fixed cap is what bounds the height the search walks.',
			},
			explanation:
				'Binary means two: each node has at most a left child and a right child. That fixed fan-out is what makes the height — and therefore the cost of a search — roughly log₂(n) when the tree stays balanced.',
		},
	},
	{
		id: 'invariant',
		eyebrow: 'The invariant',
		title: 'Left is smaller, right is larger. Everywhere.',
		body: 'The binary-search-tree property: for every node, all values in its left subtree are smaller and all values in its right subtree are larger. It holds recursively, at every node, all the way down — that is what turns a node diagram into a search structure.',
		check: {
			kind: 'choice',
			prompt:
				'In a BST, where do all values smaller than the current node live?',
			options: ['left subtree', 'right subtree', 'the root', 'anywhere'],
			answer: 'left subtree',
			misconceptions: {
				'right subtree':
					'This reverses the invariant. Right holds the larger values; the smaller ones live left, which is the direction a search descends when the target is below the node.',
				'the root':
					'The root is a single node, not a region for all smaller values. Smaller values fill an entire subtree (the left one), which is what lets a search discard half the tree at once.',
				'anywhere':
					'If smaller values could sit anywhere the structure would not be a search tree at all. The whole point of the BST property is that smaller values are confined to the left subtree of every node.',
			},
			explanation:
				'Smaller goes left, larger goes right — and because it holds at every node, an entire subtree is guaranteed to be on one side of a value. That guarantee is the whole reason a BST can skip half the tree on each step.',
		},
	},
	{
		id: 'search',
		eyebrow: 'Search',
		title: 'Each comparison throws away half the tree.',
		body: `Searching for ${BRANCH_CHECK_KEY}: compare with the root. If the target is larger, the left subtree cannot possibly hold it, so you discard it and descend right. One comparison, one halving. The path is the shape of every search you will write.`,
		check: {
			kind: 'predict',
			mode: 'choice',
			prompt: `You are searching for ${BRANCH_CHECK_KEY}. The root is 42. Which way do you go?`,
			options: ['left', 'right'],
			answer: 'right',
			branchKey: BRANCH_CHECK_KEY,
			explanation:
				'54 is larger than 42, so it can only be in the right subtree — the left subtree holds only values below 42. You move right and never look at the left side again. That discarded half is the log n speedup made visible.',
		},
	},
	{
		id: 'insert',
		eyebrow: 'Insert',
		title: 'Insert is just a search that falls off the tree.',
		body: `To add ${INSERT_KEY}, run the same search. It walks down until it reaches a missing child pointer — and that empty slot is exactly where the new node belongs. No reshuffling: the search path itself finds the spot that keeps the invariant intact.`,
		check: {
			kind: 'choice',
			prompt: `Inserting ${INSERT_KEY}: the search ends at an empty pointer below which node?`,
			options: [23, 31, 12, 42],
			answer: 31,
			misconceptions: {
				'23':
					'The search does not stop at 23. Since 29 > 23 it must descend right to 31, and only there does it reach an empty pointer, so the new node hangs below 31, not 23.',
				'12':
					'12 sits on the wrong side. From 23 the value 29 goes right (29 > 23), so it never visits 12 in the left subtree at all.',
				'42':
					'42 is only the root where the search begins, not where it ends. The walk continues down (29 < 42, then 29 > 23, then 29 < 31) until it falls off the tree below 31.',
			},
			explanation:
				'29 < 42 → left to 23; 29 > 23 → right to 31; 29 < 31 → left, which is empty. So 29 becomes 31’s left child. Insertion is a failed search plus a single link at the first empty pointer it reaches.',
		},
	},
	{
		id: 'traversal',
		eyebrow: 'Traversal',
		title: 'Inorder reads the tree back in sorted order.',
		body: 'A traversal visits every node in a fixed order. Inorder — left subtree, then the node, then the right subtree — follows the invariant exactly, so it emits values smallest to largest. Change the order to preorder or postorder and the same tree tells a different story.',
		check: {
			kind: 'order',
			prompt: `Arrange these BST values into the order an inorder traversal emits them (root ${ORDER_CHECK_VALUES[0]}, then ${ORDER_CHECK_VALUES.slice(1).join(', ')} inserted in turn).`,
			// Presented shuffled (insertion order, not sorted) so it's a real task;
			// the answer is the in-order sequence computed from the real tree.
			items: ORDER_CHECK_VALUES.map(String),
			answer: ORDER_CHECK_INORDER,
			explanation:
				'Inorder visits left (all smaller) before the node, then right (all larger) after it — at every node. That mirrors the BST rule, so the output comes out sorted: ' +
				`${ORDER_CHECK_INORDER.join(', ')}. Preorder and postorder serialize structure instead; level-order reads breadth-first.`,
		},
	},
];
