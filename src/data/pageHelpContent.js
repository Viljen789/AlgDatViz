export const PAGE_HELP = {
	'/': {
		title: 'Algorithm Visualizer Home',
		tips: [
			'Click on any card to explore a specific algorithm or data structure.',
			'Look for the synchronized pseudocode to follow the logic step-by-step.',
			'Check the complexity stats to understand performance tradeoffs.',
		],
	},
	'/graph': {
		title: 'Graph Lab Tips',
		tips: [
			'Drag nodes to rearrange the layout for better clarity.',
			'Use the "Adjacency Matrix" or "List" tabs to edit the graph structure directly.',
			'Select an algorithm (like BFS or Dijkstra) and click "Play" to see the traversal.',
			'Click on a node to focus it or set it as a start/target for algorithms.',
		],
	},
	'/hashmap': {
		title: 'Hash Map Exploration',
		tips: [
			'Type a Key and Value, then click "Put" to see how hashing works.',
			'Watch the "Load Factor" meter; if it turns red, it is time to "Resize".',
			'Collisions are handled via separate chaining (lists in each bucket).',
			'Resize to see how every key is rehashed into new bucket locations.',
		],
	},
	'/tree': {
		title: 'BST Operations',
		tips: [
			'Insert values to see how the tree maintains the Binary Search property.',
			'Search for a value to follow the path from root to leaf.',
			'Try "Inorder Traversal" to see the values printed in sorted order.',
			'Watch how the tree becomes unbalanced if you insert values in sorted order.',
		],
	},
	'/stacks-queues': {
		title: 'Stacks vs Queues',
		tips: [
			'Stacks use LIFO (Last-In-First-Out). Think of a stack of plates.',
			'Queues use FIFO (First-In-First-Out). Think of a line at a store.',
			'Use "Trace" to see the exact state of the internal array.',
		],
	},
	'/strategies': {
		title: 'Problem Solving Strategies',
		tips: [
			'Dynamic Programming: Solving subproblems and storing results.',
			'Greedy: Making the best local choice at each step.',
			'Explore the recurrence relations to understand the underlying logic.',
		],
	},
	'/master-theorem': {
		title: 'Master Theorem Guide',
		tips: [
			'Adjust a, b, and f(n) to see how they change the complexity case.',
			'Follow the recursion tree levels to see work distribution.',
			'Check the "Case" indicator to see which part of the theorem applies.',
		],
	},
};
