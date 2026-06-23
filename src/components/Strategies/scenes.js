// The scrolly scenes that build the core intuition of the Strategies topic.
//
// The arc names three distinct ideas and the decision rule built from them:
//   • OPTIMAL SUBSTRUCTURE — an optimum is built from optimal sub-solutions.
//     Needed by BOTH greedy and DP; on its own it decides nothing.
//   • GREEDY-CHOICE PROPERTY — a local choice is provably part of an optimum
//     (exchange argument). Optimal substructure + this ⇒ greedy is safe.
//   • OVERLAPPING SUBPROBLEMS — the same subproblem recurs many times, so naive
//     recursion explodes. Optimal substructure + this ⇒ reach for DP (memoize).
//
// The synchronized stage (StrategiesStage) reacts to the active scene *by id*
// (not a fragile integer index) so prose and visualization stay in lockstep.
//
// Each scene ends with an inline comprehension check. Wrong answers are not
// punished — the explanation reveals either way, so every attempt teaches.

import { buildCoinChangeFrames } from './coinChangeFrames.js';

// The greedy-trap predict answer is DERIVED, never hand-typed: run the SAME
// coin-change generator the stage animates on the SAME instance ({1,5,6} for
// 10¢) and read off how many coins greedy spends (6 + 1 + 1 + 1 + 1 = 5). DP
// finds 2 (5 + 5). lessonPredict.test.js re-derives this so the scene's answer
// can never drift from the generator.
const GREEDY_TRAP_SUMMARY = buildCoinChangeFrames({
	target: 10,
	coins: [1, 5, 6],
}).summary;
export const GREEDY_TRAP_COINS = GREEDY_TRAP_SUMMARY.greedyFinal; // = 5

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
			misconceptions: {
				Greedy:
					'Greedy keeps no record of past subproblems. It makes one local decision and moves on, so there is nothing to look up later; it is DP that stores every subproblem result in a table.',
			},
			explanation:
				'DP names a state, then fills a table so each subproblem is solved exactly once. Greedy keeps no such memory — it makes one local decision and moves on, which is why it is faster but riskier.',
		},
	},
	{
		id: 'greedy-trap',
		eyebrow: 'When greedy lies',
		title: 'The largest coin is not always the right coin.',
		body: 'Make 10¢ from coins {1, 5, 6}. Greedy follows one rule blindly: always grab the biggest coin that still fits. So its first move is 6¢, because 6 is the largest coin that fits in 10. Commit to a coin count before the stage plays the rest out — then watch where that first move strands it.',
		// predict (choice-mode) + revealGate: BEFORE the CoinBoard plays greedy's
		// run out (it auto-reveals the coins [6,1,1,1,1] and the "5 coins — stuck"
		// verdict on this scene), the student commits to how many coins greedy
		// spends. The answer is DERIVED from the real coin-change generator —
		// buildCoinChangeFrames({target:10, coins:[1,5,6]}).summary.greedyFinal === 5
		// (greedy: 6+1+1+1+1) versus DP's 2 (5+5). Re-derived in lessonPredict.test.js
		// so the key can never drift from the generator the stage animates.
		check: {
			kind: 'predict',
			revealGate: true,
			prompt:
				'Greedy takes the biggest coin that fits first — 6¢ for 10¢. Following that one rule to the end, how many coins does greedy spend in total?',
			options: [2, 4, 5, 6],
			answer: GREEDY_TRAP_COINS,
			misconceptions: {
				2: 'Two coins (5 + 5) is the OPTIMAL answer — what DP finds, not greedy. Greedy never considers 5 + 5, because its first rule forces it to take the larger 6¢ coin, which rules the second 5 out.',
				4: 'After taking 6¢, greedy has 4¢ left and no 5¢ or 6¢ fits, so it pays in 1¢ coins: 1+1+1+1. That is four 1¢ coins ON TOP of the first 6¢ — five coins in all, not four.',
				6: 'Greedy spends 6¢, then four 1¢ coins — that is the value 6 of the first coin, not the COUNT of coins. Count the coins themselves: one 6¢ plus four 1¢ is five coins.',
			},
			explanation:
				'Greedy commits to 6¢ first, then can only fill the remaining 4¢ with four 1¢ coins: 6 + 1 + 1 + 1 + 1 = 5 coins, exactly what plays out on the stage. DP, by remembering every option, finds 5 + 5 = 2 coins. That gap (5 versus 2) is the price of the locally best first move — greedy is not safe for this coin set.',
		},
	},
	{
		id: 'dp-remembers',
		eyebrow: 'The shared ingredient',
		title: 'Optimal substructure: both strategies stand on it.',
		body: 'Fill dp[i] = fewest coins to make i. For each amount, look back through every coin that fits and take the minimum: dp[i] = 1 + min(dp[i − c]). The best way to make i is one coin on top of the best way to make a smaller amount — that is optimal substructure, and greedy needs it too. It is the base both strategies share, not what tells them apart.',
		check: {
			kind: 'choice',
			prompt:
				'"An optimal solution is built from optimal solutions to its subproblems." This property is…',
			options: [
				'unique to dynamic programming',
				'unique to greedy',
				'required by both greedy and DP',
			],
			answer: 'required by both greedy and DP',
			misconceptions: {
				'unique to dynamic programming':
					'This treats optimal substructure as the DP signature, but greedy relies on it too. Building an optimum from optimal sub-solutions is the shared base, so it cannot single out DP.',
				'unique to greedy':
					'Optimal substructure is not what makes greedy work; the greedy-choice property is. Optimal substructure is equally required by DP, so it is shared, not greedy-only.',
			},
			explanation:
				'Optimal substructure is the shared base. It is necessary for both strategies and therefore cannot, by itself, decide which to use. The distinguishing question comes next: does a local choice provably stay optimal (greedy), or do subproblems overlap (DP)?',
		},
	},
	{
		id: 'overlapping-subproblems',
		eyebrow: 'The DP signature',
		title: 'Overlapping subproblems: the same work, over and over.',
		body: 'Count the ways to climb stairs: ways(n) = ways(n − 1) + ways(n − 2). Expand it naively and the tree explodes — ways(5) makes 15 calls, and ways(2) alone is recomputed three times. That repetition is the signature of DP. Memoize (or fill a table) and each subproblem is solved exactly once: the exponential tree collapses to a linear table.',
		// numeric: grounded in the pure, unit-tested climbingStairsRecursion census
		// (buildOverlapCensus(5) → ways(2) naive count = 3).
		check: {
			kind: 'numeric',
			prompt:
				'Expanding ways(5) with no memo, how many times is ways(2) computed?',
			answer: 3,
			explanation:
				'In the naive call tree of ways(5), the subproblem ways(2) appears three separate times — that is an overlapping subproblem. Memoization caches the first result so the other two evaluations are free, turning the exponential tree into an O(n) table.',
		},
	},
	{
		id: 'greedy-safe',
		eyebrow: 'When greedy wins',
		title: 'Greedy-choice property: the local move is provably global.',
		body: 'Interval scheduling: pick the most non-overlapping activities. Always take whoever finishes earliest. That choice leaves the most room for everything after it — and an exchange argument proves no optimal schedule ever does better. This is the greedy-choice property: combined with optimal substructure, it makes greedy a theorem, not a gamble.',
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
			misconceptions: {
				'Earliest start time':
					'Earliest-start can pick a long activity that blocks many others, and a counterexample breaks it. It is finishing early, not starting early, that leaves the most room for what follows.',
				'Shortest duration':
					'A short activity can still straddle two others and knock both out, so shortest-duration has an easy counterexample. Only earliest-finish carries the exchange-argument proof.',
			},
			explanation:
				'Earliest-finish is the rule with an exchange-argument proof: any optimal schedule can swap its first activity for the earliest-finishing one without losing any activities. That proof IS the greedy-choice property. Earliest-start and shortest-duration both have easy counterexamples.',
		},
	},
	{
		id: 'two-properties',
		eyebrow: 'The decision rule',
		title: 'One shared base, two different second ingredients.',
		body: 'Optimal substructure alone decides nothing — both strategies need it. What decides the tool is the second ingredient. Add a provable greedy-choice property and greedy is safe. Find overlapping subproblems instead and you must remember them: reach for DP. Greedy-choice and overlapping-subproblems are different properties answering different questions.',
		// classify: sort each named property into what it enables.
		check: {
			kind: 'classify',
			prompt:
				'Pair each second ingredient with the strategy it unlocks (on top of optimal substructure).',
			items: [
				{
					id: 'greedyChoice',
					label: 'Greedy-choice property (exchange argument)',
				},
				{ id: 'overlap', label: 'Overlapping subproblems' },
			],
			categories: [
				{ id: 'greedy', label: 'Use greedy' },
				{ id: 'dp', label: 'Use DP' },
			],
			answer: {
				greedyChoice: 'greedy',
				overlap: 'dp',
			},
			explanation:
				'Optimal-substructure + greedy-choice ⇒ greedy is provably safe. Optimal-substructure + overlapping-subproblems ⇒ DP (solve each repeated subproblem once). The shared base is the same; the second ingredient is what tells the two strategies apart.',
		},
	},
	{
		id: 'choose-what',
		eyebrow: 'Choosing what',
		title: 'So which do you reach for?',
		body: 'Run the test in order. Optimal substructure? Almost always yes. Now the deciding question: can you prove the local choice is exchangeable with an optimal one? Then greedy is safe. If a single counterexample breaks it and you see the same subproblem recurring, that is overlapping subproblems — reach for DP.',
		// classify: sort each real example by which strategy fits, naming WHY via
		// the three properties. Grounded in the playground's exact problems.
		check: {
			kind: 'classify',
			prompt:
				'For each problem, is the greedy choice provably safe, or do overlapping subproblems force DP?',
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
				'Interval scheduling has the greedy-choice property (exchange-argument proof), so greedy is safe. Coins {1, 5, 6} fails greedy at 10¢ (greedy 5 vs DP 2) and its dp[i − c] subproblems overlap, so it needs DP. Climbing stairs is pure overlapping subproblems — ways(k) recurs across the tree — with no single local "best move" to be greedy about, so DP is the tool.',
		},
	},
];
