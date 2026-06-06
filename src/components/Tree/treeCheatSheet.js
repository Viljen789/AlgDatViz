// The Trees cheat-sheet — the prop-driven disclosure consumed by TopicTemplate's
// CheatSheet ({ keyIdea, sections: [{ title, items: [{ term, def }] }] }).
//
// It distils the BST invariant, the O(h) runtimes (log n balanced vs n skewed),
// and the four traversal orders into a quick revision reference. No markup, no
// tokens — pure data, so it stays portable and easy to keep accurate.

export const TREE_CHEAT_SHEET = {
	keyIdea:
		'One invariant turns every comparison into a direction: keep smaller left and larger right at every node, and each compare can discard a whole subtree.',
	sections: [
		{
			title: 'The BST invariant',
			items: [
				{
					term: 'Property',
					def: 'For every node, all values in its left subtree are smaller and all values in its right subtree are larger.',
				},
				{
					term: 'Holds recursively',
					def: 'left < node < right is true at every node, all the way down — not just at the root.',
				},
				{
					term: 'Why it matters',
					def: 'It guarantees an entire subtree sits on one side of a value, so one comparison rules out half the tree.',
				},
			],
		},
		{
			title: 'Runtimes — everything is O(h)',
			items: [
				{
					term: 'Search / insert / delete',
					def: 'Each follows a single root-to-leaf path, so the cost is O(h), the height of the tree.',
				},
				{
					term: 'Balanced',
					def: 'h ≈ log₂ n, so the operations are O(log n) — the case worth aiming for.',
				},
				{
					term: 'Skewed (worst case)',
					def: 'Insert sorted data and the tree degenerates into a list: h = n, so operations fall back to O(n).',
				},
			],
		},
		{
			title: 'Traversal orders — all O(n)',
			items: [
				{
					term: 'Inorder',
					def: 'left → node → right. Follows the invariant, so it emits values in sorted order.',
				},
				{
					term: 'Preorder',
					def: 'node → left → right. Serializes structure root-first (handy for copying a tree).',
				},
				{
					term: 'Postorder',
					def: 'left → right → node. Visits children before the node (handy for freeing/deleting).',
				},
				{
					term: 'Level-order',
					def: 'breadth-first with a queue, layer by layer from the root down.',
				},
			],
		},
	],
};

export default TREE_CHEAT_SHEET;
