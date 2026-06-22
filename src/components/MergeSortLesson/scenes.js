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
			misconceptions: {
				2: 'You stopped one halving early, at pieces of size 2. Those still need one more split to reach single elements, so the count is 8 → 4 → 2 → 1, which is 3 steps.',
				4: 'That counts the pieces at the bottom, not the splits taken to get there. Reaching four pieces of size 2 is only the second split; one more produces the singletons, for 3 splits in all.',
				8: '8 is how many one-element pieces you end with, not how many splits it took. Halving 8 down to singletons takes log₂(8) = 3 splits.',
			},
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
			misconceptions: {
				3: 'That is the height of the tree, the number of levels, not the count of leaves. Each level doubles the pieces, so the bottom level holds 8 leaves, one per element.',
				4: 'You may be counting the pairs just above the bottom, where there are four pieces of size 2. Splitting each of those once more gives the leaves, and there are 8 of them.',
				16: 'A merge-sort tree branches in two, not four, so it does not double past the elements. With 8 elements there are exactly 8 leaves, since each leaf is a single original value.',
			},
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
			kind: 'predict',
			prompt:
				'The two sorted runs [27, 38] and [3, 43] are about to merge. Which value gets copied out first?',
			options: [3, 27, 38, 43],
			answer: 3,
			misconceptions: {
				27: 'Merge compares only the two front cursors: 27 vs 3. 3 is smaller, so it leads; 27 follows only after the right run advances past 3.',
				38: '38 is the rear of the left run. The merge never looks past the front cursor 27, and 27 itself loses to 3.',
				43: '43 is the larger of the two fronts, so it waits. The smaller front, 3, is copied first.',
			},
			explanation:
				'Merge always copies the smaller of the two front cursors. 3 < 27, so 3 leads the merged run, exactly the value you can watch travel out first below. The merge never looks past the cursors, which is what keeps it linear.',
		},
	},
	{
		id: 'recurrence',
		eyebrow: 'Cost',
		title: 'The same merge runs at every level. That is why the cost is O(n log n).',
		body: 'log n levels of merges, each doing n work to scan and copy every element. The recursion tree is the proof.',
		check: {
			kind: 'numeric',
			prompt:
				'You merge two already-sorted runs of length 4 and 4. What is the maximum number of comparisons this single merge can make?',
			answer: 7,
			explanation:
				'A merge of runs totalling m elements makes at most m − 1 comparisons: every comparison emits one element to the output, and the very last element is copied without a comparison once one run empties. Here m = 8, so at most 8 − 1 = 7. Summed over a level, every level still does Θ(n) work, and there are log₂ n levels — that is the n log n.',
			placeholder: 'Number of comparisons',
		},
	},
];
