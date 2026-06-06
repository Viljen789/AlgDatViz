// The scrolly scenes that build master-theorem intuition before the playground
// takes over. The narrative is migrated and refreshed from the old dashboard
// copy and the master-theorem entry in data/topicStories.js.
//
// Each scene maps to a state of MasterTheoremStage via its index, and every
// scene ends with a `check` — a small comprehension question. Wrong answers are
// never punished: the explanation reveals regardless, so each attempt teaches.
//
// The running example is merge sort: T(n) = 2 T(n/2) + n, i.e. a = 2, b = 2,
// d = 1. Its leaf exponent log_2(2) = 1 ties the combine exponent d = 1, so it
// lands squarely in Case 2 — every level does the same n work.

export const STORY_PARAMS = { a: 2, b: 2, d: 1, k: 0 };

export const SCENES = [
	{
		id: 'recurrence',
		eyebrow: 'Setup',
		title: 'A problem that solves smaller copies of itself.',
		body: 'T(n) = a · T(n/b) + f(n). A call of size n spawns a copies of size n/b, then does f(n) work to combine the answers. Because each call is strictly smaller, the chain has to bottom out — that is why the recursion terminates.',
		check: {
			kind: 'choice',
			prompt:
				'In T(n) = 2·T(n/2) + n, how many subproblems does one call create?',
			options: ['1', '2', '4', 'n'],
			answer: '2',
			explanation:
				'The coefficient a in front of T is the branching factor. Here a = 2, so every call splits into two half-sized calls — exactly what merge sort does when it halves the array.',
		},
	},
	{
		id: 'tree',
		eyebrow: 'Unfold',
		title: 'Unfold it and you get a tree.',
		body: 'Draw every call as a node. The root is the whole problem; each level multiplies the node count by a while the subproblem size shrinks by b. The tree stops when the pieces are size 1 — that bottom row is the leaves.',
		check: {
			kind: 'choice',
			prompt: 'Each level down, the number of calls is multiplied by…',
			options: ['a', 'b', 'a/b', 'log n'],
			answer: 'a',
			explanation:
				'Level 0 has 1 call, level 1 has a, level 2 has a², and so on. After log_b(n) levels the calls are size 1. So the leaf count is a^(log_b n) = n^(log_b a) — that exponent log_b(a) is the whole game.',
		},
	},
	{
		id: 'leaves',
		eyebrow: 'Leaves vs combine',
		title: 'Two forces pull on the total.',
		body: 'Work at the leaves grows like n^(log_b a) — call that exponent c. The combine work f(n) ≈ n^d sits at every level. The Master Theorem is a single comparison: is c bigger than d, equal to it, or smaller?',
		check: {
			kind: 'choice',
			prompt:
				'For merge sort, c = log₂(2) = 1 and d = 1. How do they compare?',
			options: ['c > d', 'c = d', 'c < d', 'cannot tell'],
			answer: 'c = d',
			explanation:
				'Both exponents are 1, so neither side runs away from the other. When c = d the work is balanced — the leaves and the root pull equally hard. That balance is exactly Case 2.',
		},
	},
	{
		id: 'levels',
		eyebrow: 'The deciding comparison',
		title: 'Whichever side grows faster wins.',
		body: 'If c > d the leaves dominate (Case 1) → Θ(n^c). If c < d the root-side combine work dominates (Case 3) → Θ(n^d). If they tie, every level does the same work and the log n levels stack up (Case 2) → Θ(n^d log n).',
		check: {
			kind: 'choice',
			prompt:
				'a = 8, b = 2, f(n) = n. Then c = log₂(8) = 3 and d = 1. Which case?',
			options: ['Case 1', 'Case 2', 'Case 3', 'none apply'],
			answer: 'Case 1',
			explanation:
				'c = 3 is greater than d = 1, so the leaves vastly outnumber the combine work and dominate the total: T(n) = Θ(n³). The leaf level alone carries the cost.',
		},
	},
	{
		id: 'result',
		eyebrow: 'Read the shape',
		title: 'The answer is the shape of the tree.',
		body: 'A bottom-heavy tree means the leaves win. A top-heavy tree means the root wins. An even tree means every level ties and the extra log n levels multiply the cost. The per-level work bars show which shape you have at a glance.',
		check: {
			kind: 'choice',
			prompt:
				'When every level does the same amount of work, the total picks up an extra factor of…',
			options: ['a', 'n', 'log n', 'b'],
			answer: 'log n',
			explanation:
				'There are about log_b(n) levels, each costing the same n^d. Multiply shared per-level work by the number of levels and you get the Θ(n^d log n) of Case 2 — the merge-sort O(n log n).',
		},
	},
];
