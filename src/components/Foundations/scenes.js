// Foundations — the complexity primer that the whole curriculum stands on.
//
// Taught one idea at a time, before any data structure: what "cost" means →
// counting the work in code → dropping constants → the O/Ω/Θ bounds → watching
// the growth classes pull apart → best/worst/average and amortized cost.
// Recurrences (aT(n/b)+f(n)) are deliberately left to the Master Theorem topic.
//
// The stage (FoundationsStage) reads `activeScene` to switch its figure. Each
// scene carries an inline retrieval `check`; wrong answers still reveal the
// explanation, so every attempt teaches.

export const SCENES = [
	{
		id: 'cost',
		eyebrow: 'The question',
		title: 'What does an algorithm actually cost?',
		body: 'Not seconds — those depend on your laptop. We count how the number of steps grows as the input grows. Call the input size n; cost is a function of n. Double the input, and the question is: does the work double, square, or barely move?',
		check: {
			kind: 'choice',
			prompt: 'How do we measure an algorithm’s cost?',
			options: [
				'In seconds on your machine',
				'By how the number of steps grows with input size n',
				'By how many lines of code it has',
			],
			answer: 'By how the number of steps grows with input size n',
			explanation:
				'Wall-clock seconds depend on the hardware, the language, the weather. Complexity is machine-independent: it describes how the step count scales with n, so it holds on any computer, today and in ten years.',
		},
	},
	{
		id: 'counting',
		eyebrow: 'Counting operations',
		title: 'Count the work, line by line.',
		body: 'A single loop over n items does about n steps. Put a loop inside a loop and each of the n outer passes does n inner steps — n × n = n² steps. The shape of the loops is the cost; you can read it straight off the code.',
		check: {
			kind: 'choice',
			prompt:
				'A loop nested inside another, each running n times, performs about how many steps?',
			options: ['n', '2n', 'n log n', 'n²'],
			answer: 'n²',
			explanation:
				'The inner loop runs n times for every one of the n outer passes: n × n = n². Two separate (not nested) loops would be n + n = 2n. Nesting multiplies; sequencing adds.',
		},
	},
	{
		id: 'drop',
		eyebrow: 'Asymptotics',
		title: 'Drop the constants and the small terms.',
		body: 'Suppose you count exactly 3n² + 5n + 2 steps. For large n, the n² term swamps everything: at n = 1000 it is 3,000,000 against 5,002. We keep only the fastest-growing term and drop its constant — 3n² + 5n + 2 becomes O(n²).',
		check: {
			kind: 'choice',
			prompt: 'Simplify 3n² + 5n + 2 for large n.',
			options: ['O(n)', 'O(n²)', 'O(3n²)', 'O(n³)'],
			answer: 'O(n²)',
			explanation:
				'Keep the dominant term (n²), drop lower-order terms (5n, 2) and constant factors (the 3). Constants and small terms matter for tuning, but they don’t change how the cost scales — and scaling is what complexity describes.',
		},
	},
	{
		id: 'notation',
		eyebrow: 'The three bounds',
		title: 'O, Ω, Θ — at most, at least, exactly.',
		body: 'Big-O is an upper bound: the algorithm takes at most about this much. Big-Omega (Ω) is a lower bound: at least this much. Big-Theta (Θ) is both at once — a tight bound that pins the growth from above and below. When people say "O(n)" loosely, they usually mean Θ.',
		check: {
			kind: 'choice',
			prompt: 'Saying an algorithm is O(n) means it takes ___ about n steps.',
			options: ['at most', 'exactly', 'at least'],
			answer: 'at most',
			explanation:
				'O is the ceiling (at most). Ω is the floor (at least). Θ is both — the curve is sandwiched between c₁·n and c₂·n, so the growth is exactly linear up to constants.',
		},
	},
	{
		id: 'race',
		eyebrow: 'Growth rates',
		title: 'Watch the classes pull apart.',
		body: 'As n grows the families separate violently. O(1) and O(log n) barely lift off; O(n) and O(n log n) climb steadily; O(n²) gets steep; O(2ⁿ) leaves the chart almost immediately. This gap is why we obsess over the dominant term — at scale, the class is the whole story.',
		check: {
			kind: 'order',
			prompt: 'Arrange these from slowest-growing to fastest-growing.',
			items: ['O(n²)', 'O(1)', 'O(2ⁿ)', 'O(n)', 'O(log n)', 'O(n log n)'],
			answer: [
				'O(1)',
				'O(log n)',
				'O(n)',
				'O(n log n)',
				'O(n²)',
				'O(2ⁿ)',
			],
			explanation:
				'Constant < logarithmic < linear < linearithmic < quadratic < exponential. An O(2ⁿ) algorithm is hopeless past a few dozen items; an O(log n) one barely notices a billion.',
		},
	},
	{
		id: 'cases',
		eyebrow: 'It depends',
		title: 'Best, worst, average — and amortized.',
		body: 'The same algorithm can cost different amounts on different inputs: linear search finds it on the first try (best, O(1)) or never (worst, O(n)). Amortized cost is different again: appending to a dynamic array is usually O(1), but occasionally O(n) when it doubles — spread that rare cost over all the cheap appends and it averages to O(1).',
		check: {
			kind: 'choice',
			prompt:
				'Appending to a dynamic array is O(n) on the rare resize, but across many appends it is ___.',
			options: ['O(n) amortized', 'O(1) amortized', 'O(log n) amortized'],
			answer: 'O(1) amortized',
			explanation:
				'Doubling means a resize of cost n happens only every ~n appends, so the total for n appends is about 2n — that’s O(1) per append, amortized. Worst-case for a single append is still O(n); amortized describes the run, not the rare spike.',
		},
	},
];
