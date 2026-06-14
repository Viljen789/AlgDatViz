// Cheat sheet for the Foundations (complexity) topic — definitions, the bounds,
// the growth ladder, and how to read cost off code. Shape matches TopicTemplate's
// CheatSheet: { keyIdea, sections: [{ title, items: [{term,def} | string] }] }.

export const CHEAT_SHEET = {
	keyIdea:
		'Complexity is how the number of steps grows with the input size n. Keep only the fastest-growing term and drop its constant — that class is what survives at scale.',
	sections: [
		{
			title: 'The three bounds',
			items: [
				{ term: 'O(f)', def: 'upper bound — at most' },
				{ term: 'Ω(f)', def: 'lower bound — at least' },
				{ term: 'Θ(f)', def: 'tight — both at once' },
			],
		},
		{
			title: 'Growth classes, slow → fast',
			items: [
				{ term: 'O(1)', def: 'constant' },
				{ term: 'O(log n)', def: 'logarithmic' },
				{ term: 'O(n)', def: 'linear' },
				{ term: 'O(n log n)', def: 'linearithmic' },
				{ term: 'O(n²)', def: 'quadratic' },
				{ term: 'O(2ⁿ)', def: 'exponential' },
			],
		},
		{
			title: 'Reading it off code',
			items: [
				'A loop over n items → O(n).',
				'A loop nested in a loop → O(n²).',
				'Halving the range each step → O(log n).',
				'Separate (not nested) loops add: n + n = O(n).',
			],
		},
		{
			title: 'Which case?',
			items: [
				{ term: 'worst', def: 'the guarantee — what you quote' },
				{ term: 'average', def: 'expected over typical inputs' },
				{ term: 'amortized', def: 'averaged over a run (dynamic-array append = O(1))' },
			],
		},
	],
};
