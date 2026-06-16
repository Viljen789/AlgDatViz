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
			misconceptions: {
				1: 'You read off one recursive call from the single T term, but the coefficient in front of it, a = 2, is the count. The term T(n/2) appears, yet the 2 multiplying it says it happens twice.',
				4: 'You squared the branching instead of reading it. a² = 4 is the number of calls two levels down, not the one call splitting into a = 2 children at a single step.',
				n: 'You mistook the work term for the branching count. The +n is the combine cost f(n), not the number of subproblems; the branching factor is the coefficient a = 2 on T.',
			},
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
			misconceptions: {
				b: 'You picked the shrink factor, not the branch factor. b divides the subproblem size each level (n to n/b); the number of calls is multiplied by a, the branching count.',
				'a/b':
					'You blended the two roles into one ratio. a/b = r is the per-level work multiplier in the sum, not the call-count growth; the call count alone scales by a each level.',
				'log n':
					'You named the number of levels, not the per-level growth. log_b(n) is how deep the tree goes; the calls grow by a at every one of those levels.',
			},
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
			prompt: 'For merge sort, c = log₂(2) = 1 and d = 1. How do they compare?',
			options: ['c > d', 'c = d', 'c < d', 'cannot tell'],
			answer: 'c = d',
			misconceptions: {
				'c > d':
					'You read the leaves as winning, but both exponents equal 1. c > d would mean the leaf count outgrows the combine work; here log₂(2) = 1 exactly matches d = 1, so neither pulls ahead.',
				'c < d':
					'You read the root combine as winning, but the two exponents are equal. c < d would put f(n) ahead; with c = d = 1 the per-level work stays flat instead.',
				'cannot tell':
					'You hesitated although both numbers are given. c = log₂(2) = 1 and d = 1 are concrete, so the comparison is fully decidable: they are equal.',
			},
			explanation:
				'Both exponents are 1, so neither side runs away from the other. When c = d the work is balanced — the leaves and the root pull equally hard. That balance is exactly Case 2.',
		},
	},
	{
		id: 'levels',
		eyebrow: 'The deciding comparison',
		title: 'Whichever side grows faster wins.',
		// Stage shape: the check below is a=8,b=2,f(n)=n, so pin that recurrence
		// and let the silhouette go bottom-heavy — Case 1, leaves win.
		recurrence: { a: 8, b: 2, d: 1, k: 0 },
		body: 'If c > d the leaves dominate (Case 1) → Θ(n^c). If c < d the root-side combine work dominates (Case 3) → Θ(n^d). If they tie, every level does the same work and the log n levels stack up (Case 2) → Θ(n^d log n).',
		check: {
			kind: 'choice',
			prompt:
				'a = 8, b = 2, f(n) = n. Then c = log₂(8) = 3 and d = 1. Which case?',
			options: ['Case 1', 'Case 2', 'Case 3', 'none apply'],
			answer: 'Case 1',
			misconceptions: {
				'Case 2':
					'You assumed a tie, but c = 3 and d = 1 are far apart. Case 2 needs c = d so every level does equal work; here the leaves grow as n³ while combine is only n.',
				'Case 3':
					'You let the root combine win, but it is the smaller side. Case 3 needs c < d; here c = 3 exceeds d = 1, so the leaves dominate, not the combine work.',
				'none apply':
					'You expected a gap the theorem cannot cover, but this is a clean polynomial split. c = 3 is polynomially larger than d = 1, so Case 1 applies squarely.',
			},
			explanation:
				'c = 3 is greater than d = 1, so the leaves vastly outnumber the combine work and dominate the total: T(n) = Θ(n³). The leaf level alone carries the cost.',
		},
	},
	{
		id: 'sum-levels',
		eyebrow: 'Sum the levels',
		title: 'Add up every level and a ratio appears.',
		body: 'Level i holds a^i calls of size n/b^i, so its work is a^i · (n/b^i)^d = n^d · (a/b^d)^i. Write r = a/b^d for that per-level multiplier, and the total is n^d times the geometric series 1 + r + r² + … over the log_b(n) levels. The whole theorem is just which end of that series dominates: bottom-heavy when r > 1 (leaves win, Θ(n^(log_b a))), flat when r = 1 (every level ≈ n^d, so Θ(n^d log n)), top-heavy when r < 1 (the root term wins, Θ(n^d)).',
		check: {
			kind: 'numeric',
			// T = 2T(n/2) + n has r = a/b^d = 2/2^1 = 1, so each level does ~n
			// work; the level count is log_2(n). For n = 1024, log_2(1024) = 10.
			prompt:
				'For T(n) = 2T(n/2) + n the ratio is r = 1, so every level does about n work. For n = 1024, how many such levels are there? (Count log₂ n.)',
			answer: 10,
			tolerance: 0.01,
			placeholder: 'e.g. 10',
			explanation:
				'With r = 1 each level costs the same ≈ n, and there are log₂(n) levels because the size halves each step until it reaches 1. For n = 1024, log₂(1024) = 10 levels. Multiplying the shared per-level n by those log₂ n levels is exactly the Θ(n log n) of Case 2.',
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
			misconceptions: {
				a: 'You reached for the branching factor, but a counts children per node, not levels. The extra factor comes from how many levels stack up, which is log_b(n), not a.',
				n: 'You multiplied by the input size itself, but n is already inside the per-level n^d work. The new factor is the level count log_b(n), which is much smaller than n.',
				b: 'You picked the shrink factor, but b only sets how fast size drops per level. The number of levels it produces is log_b(n), and that log is the factor that rides along.',
			},
			explanation:
				'There are about log_b(n) levels, each costing the same n^d. Multiply shared per-level work by the number of levels and you get the Θ(n^d log n) of Case 2 — the merge-sort O(n log n).',
		},
	},
	{
		id: 'compute-c',
		eyebrow: 'Do the comparison',
		title: 'Compute the exponent yourself.',
		// Stage shape: this scene works the a=8,b=2 example, so keep the same
		// bottom-heavy Case-1 silhouette the student is computing c for.
		recurrence: { a: 8, b: 2, d: 1, k: 0 },
		body: 'Everything hinges on c = log_b(a): the exponent on n that the leaves grow by. For a = 8, b = 2 you are asking "2 to what power is 8?" — count the doublings.',
		check: {
			kind: 'numeric',
			// analyseRecurrence({a:8,b:2,…}).critical === log_2(8) === 3.
			prompt: 'Compute c = log_b(a) for a = 8, b = 2.',
			answer: 3,
			tolerance: 0.01,
			placeholder: 'e.g. 3',
			explanation:
				'log₂(8) = 3 because 2³ = 8. That is the leaf-growth exponent c: the leaves number n^3, so once c (= 3) beats the combine exponent d, the leaves carry the whole cost.',
		},
	},
	{
		id: 'classify-cases',
		eyebrow: 'Put it together',
		title: 'Which side wins each recurrence?',
		// Stage shape: among the three items being sorted, show the root-winning
		// exemplar (T = 2T(n/2) + n²) so the top-heavy silhouette — the one new
		// shape the earlier scenes have not shown — is on screen as they classify.
		recurrence: { a: 2, b: 2, d: 2, k: 0 },
		body: 'For each recurrence, compare c = log_b(a) against d (where f(n) = n^d), then drop it into the case its dominant side names: the leaves (c > d), every level tied (c = d), or the root (c < d).',
		check: {
			kind: 'classify',
			prompt:
				'Sort each recurrence by which part of the tree dominates its cost.',
			items: [
				// analyseRecurrence verdicts: c vs d.
				{ id: 'merge', label: 'T = 2T(n/2) + n  (c=1, d=1)' }, // Case 2
				{ id: 'leafy', label: 'T = 8T(n/2) + n  (c=3, d=1)' }, // Case 1
				{ id: 'rooty', label: 'T = 2T(n/2) + n²  (c=1, d=2)' }, // Case 3
			],
			categories: [
				{ id: 'leaves', label: 'Leaves win (Case 1)' },
				{ id: 'levels', label: 'Every level ties (Case 2)' },
				{ id: 'root', label: 'Root work wins (Case 3)' },
			],
			answer: {
				merge: 'levels',
				leafy: 'leaves',
				rooty: 'root',
			},
			explanation:
				'Merge sort ties (c = d = 1) → Case 2, Θ(n log n). With a = 8 the leaves explode (c = 3 > d = 1) → Case 1, Θ(n³). With f(n) = n² the combine work at the root outruns the leaves (c = 1 < d = 2) → Case 3, Θ(n²).',
		},
	},
	{
		id: 'fine-print',
		eyebrow: 'The fine print',
		title: 'Case 3 carries one extra condition.',
		body: 'The clean "compare c with d" story is the polynomial heart of the theorem, but two clauses keep it honest. Case 3 (root wins) also needs the regularity condition: a·f(n/b) ≤ k·f(n) for some constant k < 1 and all large n, which guarantees the combine work really does shrink down the tree rather than just at the top. And the theorem only speaks when f(n) is polynomially comparable to n^(log_b a): if the gap between them is merely a logarithmic factor, none of the three cases fits and the Master Theorem stays silent. The tidy three-way split is not a law of the universe; it is the part of the design space these three cases happen to cover.',
		check: {
			kind: 'choice',
			prompt:
				'Which case applies to T(n) = 2T(n/2) + n/log n? Here log_b a = log₂2 = 1, so n^(log_b a) = n.',
			options: [
				'Case 1: leaves win, Θ(n)',
				'Case 2: every level ties, Θ(n log n)',
				'Case 3: root wins, Θ(n/log n)',
				'None: the Master Theorem does not apply (the gap is only logarithmic)',
			],
			answer:
				'None: the Master Theorem does not apply (the gap is only logarithmic)',
			misconceptions: {
				'Case 1: leaves win, Θ(n)':
					'Case 1 needs f(n) polynomially smaller than n^(log_b a) = n. Here f(n) = n/log n is smaller only by a log factor, not by any n^ε, so Case 1 does not fit.',
				'Case 2: every level ties, Θ(n log n)':
					'The basic Case 2 wants f(n) = Θ(n^(log_b a) · log^k n) with k ≥ 0. Here k would be -1 (n/log n = n·log^(-1) n), which sits just outside Case 2.',
				'Case 3: root wins, Θ(n/log n)':
					'Case 3 needs f(n) polynomially larger than n, plus the regularity condition. But n/log n is smaller than n, not larger, so Case 3 is the wrong direction entirely.',
			},
			explanation:
				'f(n) = n/log n differs from n^(log_b a) = n by only a logarithmic factor, so it is not polynomially comparable to it: no ε > 0 makes f either O(n^(1-ε)) or Ω(n^(1+ε)). All three cases require a polynomial gap, so the Master Theorem is simply silent here. (A direct sum or the Akra-Bazzi method gives Θ(n log log n), but that is beyond this theorem.)',
		},
	},
	{
		id: 'extended-case-2',
		eyebrow: 'Stretching Case 2',
		title: 'A log on f(n) becomes a log on the answer.',
		body: 'The generalized Case 2 does handle one family the basic version misses: when f(n) = Θ(n^(log_b a) · log^k n) with k ≥ 0, the tie still holds but the result picks up one more log, giving Θ(n^(log_b a) · log^(k+1) n). The flat geometric series is now flat-with-a-log, and that extra log rides along to the total.',
		check: {
			kind: 'numeric',
			// T = 2T(n/2) + n log n: c = 1, f = n·log^1 n (d=1, k=1). Generalized
			// Case 2 → Θ(n^1 · log^(1+1) n) = Θ(n log^2 n), so the log exponent is 2.
			prompt:
				'T(n) = 2T(n/2) + n log n lands in Θ(n log^p n). With c = 1 and f(n) = n·log¹n (so k = 1), what is the exponent p on the log?',
			answer: 2,
			tolerance: 0.01,
			placeholder: 'e.g. 2',
			explanation:
				'Here c = log₂2 = 1 ties d = 1, so it is a Case-2 tie, but f carries an extra log¹n (k = 1). The generalized rule turns log^k n into log^(k+1) n, so T(n) = Θ(n · log^(1+1) n) = Θ(n log² n). The exponent p is 2.',
		},
	},
];
