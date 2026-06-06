// The scrolly scenes that build the core intuition of the Strategies topic:
// WHEN a greedy local choice is provably safe versus WHEN you need dynamic
// programming. The synchronized stage (StrategiesStage) reacts to the active
// scene index so the prose and the visualization stay in lockstep.
//
// Each scene ends with an inline comprehension check. Wrong answers are not
// punished — the explanation reveals either way, so every attempt teaches.

export const SCENES = [
	{
		id: 'two-shapes',
		eyebrow: 'The fork',
		title: 'Two ways to chase an optimum.',
		body: 'Greedy commits to the best-looking move right now and never looks back. Dynamic programming refuses to commit — it remembers the best answer to every smaller subproblem and builds up. Same goal, opposite discipline.',
		check: {
			kind: 'choice',
			prompt:
				'Which strategy keeps a record of every subproblem it has already solved?',
			options: ['Greedy', 'Dynamic programming'],
			answer: 'Dynamic programming',
			explanation:
				'DP names a state, then fills a table so each subproblem is solved exactly once. Greedy keeps no such memory — it makes one local decision and moves on, which is why it is faster but riskier.',
		},
	},
	{
		id: 'greedy-trap',
		eyebrow: 'When greedy lies',
		title: 'The largest coin is not always the right coin.',
		body: 'Make 10¢ from coins {1, 5, 6}. Greedy grabs 6 first because it is biggest — then it is stranded, paying four 1¢ coins for five total. The locally best first move poisoned everything downstream.',
		// spotbug (line-mode): walk greedy's reasoning on {1,5,6}=10 and find the
		// step whose claim is false. Grounded in the real coin-change result —
		// DP=2 (5+5), greedy=5 (6+1+1+1+1); see coinChangeFrames.test.js.
		check: {
			kind: 'spotbug',
			prompt:
				'Here is greedy reasoning on coins {1, 5, 6} for 10¢. Which step makes a wrong claim?',
			lines: [
				'10¢: largest coin that fits is 6¢ — take it. (remaining 4¢)',
				'4¢: largest coin that fits is 1¢ — take it. (remaining 3¢)',
				'…take 1¢, 1¢, 1¢ → 6+1+1+1+1 = 5 coins.',
				'5 coins is optimal — no shorter way exists.',
			],
			answer: 3,
			explanation:
				'Steps 1–3 describe exactly what greedy does (5 coins), so they are true reports. Step 4 is the false claim: 5 + 5 = 10 uses only TWO coins, so 5 is not optimal. That single counterexample proves greedy is unsafe for this coin set.',
		},
	},
	{
		id: 'dp-remembers',
		eyebrow: 'Why DP is safe here',
		title: 'DP tries every coin, then keeps the best.',
		body: 'Fill dp[i] = fewest coins to make i. For each amount, look back through every coin that fits and take the minimum: dp[i] = 1 + min(dp[i − c]). Because each smaller answer is already optimal, the table can never be tricked into an early mistake.',
		check: {
			kind: 'choice',
			prompt:
				'Coin change has optimal substructure because dp[i] is built only from…',
			options: [
				'the single largest coin',
				'already-optimal smaller subproblems',
				'a random subproblem',
			],
			answer: 'already-optimal smaller subproblems',
			explanation:
				'Optimal substructure: the best way to make i is one coin on top of the best way to make some smaller amount. DP relies on this — every cell it reads is already the proven minimum, so the answer it builds is too.',
		},
	},
	{
		id: 'greedy-safe',
		eyebrow: 'When greedy wins',
		title: 'Sometimes the local choice is provably the global one.',
		body: 'Interval scheduling: pick the most non-overlapping activities. Always take whoever finishes earliest. That choice leaves the most room for everything after it — and an exchange argument proves no optimal schedule ever does better. Here greedy is not a gamble; it is a theorem.',
		check: {
			kind: 'choice',
			prompt:
				'For interval scheduling, which rule is the provably safe greedy choice?',
			options: [
				'Earliest start time',
				'Shortest duration',
				'Earliest finish time',
			],
			answer: 'Earliest finish time',
			explanation:
				'Earliest-finish is the rule with an exchange-argument proof: any optimal schedule can swap its first activity for the earliest-finishing one without losing any activities. Earliest-start and shortest-duration both have easy counterexamples.',
		},
	},
	{
		id: 'choose-what',
		eyebrow: 'Choosing what',
		title: 'So which do you reach for?',
		body: 'Try greedy first — it is simpler and faster. It is only safe if you can prove the local choice is exchangeable with an optimal one. If a single counterexample breaks it, the problem has overlapping subproblems you must remember: reach for DP.',
		// classify: sort each problem into "greedy is provably safe" vs "needs DP",
		// using the exact problems from the playground.
		check: {
			kind: 'classify',
			prompt:
				'For each problem, is the greedy choice provably safe, or do you need DP?',
			items: [
				{ id: 'intervals', label: 'Interval scheduling (earliest finish)' },
				{ id: 'coins156', label: 'Coin change with coins {1, 5, 6}' },
				{ id: 'stairs', label: 'Climbing stairs (count the ways)' },
			],
			categories: [
				{ id: 'greedy', label: 'Greedy is safe' },
				{ id: 'dp', label: 'Need DP' },
			],
			answer: {
				intervals: 'greedy',
				coins156: 'dp',
				stairs: 'dp',
			},
			explanation:
				'Interval scheduling has an exchange-argument proof, so greedy is safe. Coins {1, 5, 6} has the 10¢ counterexample (greedy 5 vs DP 2), so it needs DP. Climbing stairs counts paths by summing overlapping subproblems — there is no single local "best move" to be greedy about, so DP is the tool.',
		},
	},
];
