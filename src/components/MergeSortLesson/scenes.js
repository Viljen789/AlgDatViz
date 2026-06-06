// The five scrolly scenes that build intuition before the playground takes over.
// Values are chosen to merge cleanly across three levels for an 8-element array.
//
// Each scene also carries a `check` — a small interactive question the user
// answers before scrolling on. Wrong answers are not punished: the explanation
// reveals regardless of correctness, so every attempt becomes a teaching
// moment.

export const STAGE_VALUES = [38, 27, 43, 3, 9, 82, 10, 51];

// Adjacent inversions in STAGE_VALUES: (0,1) 38>27, (2,3) 43>3, (5,6) 82>10.
const ADJACENT_INVERSIONS = [
	[0, 1],
	[2, 3],
	[5, 6],
];

const isAdjacentInversion = (a, b) => {
	if (a == null || b == null) return false;
	const [left, right] = a < b ? [a, b] : [b, a];
	return right - left === 1 && STAGE_VALUES[left] > STAGE_VALUES[right];
};

export const SCENES = [
	{
		id: 'array',
		eyebrow: 'Setup',
		title: 'Here is an unsorted array.',
		body: 'Eight values, no order. Merge sort treats this as one promise it does not yet know how to keep.',
		check: {
			kind: 'pair',
			prompt:
				'Click any pair of adjacent values where the left is bigger than the right.',
			hint: 'Pick two bars that touch each other on the stage.',
			validate: ([a, b]) => isAdjacentInversion(a, b),
			exampleCorrectPair: ADJACENT_INVERSIONS[0],
			explanation:
				'Pairs like these are inversions — the local symptom of disorder. Merge sort never fixes them in place. Instead, it splits the problem so that, once the pieces are sorted on their own, the inversions disappear during the merge.',
		},
	},
	{
		id: 'split',
		eyebrow: 'Divide',
		title: 'Merge sort splits it in half. Then splits the halves. All the way down.',
		body: 'Three levels of splitting, until every piece is one element. Nothing is sorted yet — the algorithm is just shrinking the problem.',
		check: {
			kind: 'choice',
			prompt:
				'How many split steps before every piece is just one element, for n = 8?',
			options: [2, 3, 4, 8],
			answer: 3,
			explanation:
				'Each split halves the problem: 8 → 4, 4 → 2, 2 → 1. That is log₂(8) = 3 levels of splitting. The key insight: log₂ n levels is also why the total cost stays at O(n log n) — the tree is shallow, even for huge n.',
		},
	},
	{
		id: 'base',
		eyebrow: 'Base case',
		title: 'At the bottom, every piece is one element. Trivially sorted.',
		body: 'A list of one is sorted by definition. The hard part of the recursion is over before any comparisons happen.',
		check: {
			kind: 'choice',
			prompt: 'How many leaves does the recursion tree have for n = 8?',
			options: [3, 4, 8, 16],
			answer: 8,
			explanation:
				'One leaf per original element — eight in, eight leaves. In general, the tree has exactly n leaves. That is why the total work at the leaf level is n, not n log n. Most of the cost lives in the merges above, where each level still scans n elements.',
		},
	},
	{
		id: 'merge',
		eyebrow: 'Combine',
		title: 'Coming back up, neighboring pieces merge in order.',
		body: 'Two sorted runs become one sorted run by reading their front cursors and copying the smaller value out, repeatedly.',
		check: {
			kind: 'choice',
			prompt:
				'You are merging the sorted runs [3, 7] and [5, 9]. Which value gets copied to the output first?',
			options: [3, 5, 7, 9],
			answer: 3,
			explanation:
				'Merge always compares the front cursors of the two runs and copies the smaller. Front of left is 3, front of right is 5; 3 wins and the left cursor advances. Next comparison: 7 vs 5. The merge never looks past the cursors — that is what makes it linear in the merged length.',
		},
	},
	{
		id: 'recurrence',
		eyebrow: 'Cost',
		title: 'The same merge runs at every level. That is why the cost is O(n log n).',
		body: 'log n levels of merges, each doing n work to scan and copy every element. The recursion tree is the proof.',
		check: {
			kind: 'choice',
			prompt:
				'At level 2 of the recursion tree (counting from the root as level 0), how many separate merge operations happen?',
			options: [1, 2, 4, 8],
			answer: 4,
			explanation:
				'Level 2 has four ranges of two elements each, so four merges happen there. Each merge handles n/4 elements, and 4 × n/4 = n total work at that level. The same n shows up at every level, and there are log₂ n levels — that is the n log n.',
		},
	},
];
