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
// Around that spine sit the worked examples: rod cutting, LCS and 0/1 knapsack
// deepen the DP idea right after it is named (1-D table → 2-D table → the bag
// where density greedy dies), and fractional knapsack + Huffman follow the
// interval-scheduling scene as the greedy successes — each carrying its own
// exchange argument — before the decision rule sums it all up.
//
// The synchronized stage (StrategiesStage) reacts to the active scene *by id*
// (not a fragile integer index) so prose and visualization stay in lockstep.
//
// Each scene ends with an inline comprehension check. Wrong answers are not
// punished — the explanation reveals either way, so every attempt teaches.

import { buildCoinChangeFrames } from './coinChangeFrames.js';
import { buildRodCuttingFrames } from './rodCuttingFrames.js';
import { buildLcsFrames } from './lcsFrames.js';
import { buildKnapsack01Frames } from './knapsack01Frames.js';
import { buildFractionalKnapsackFrames } from './fractionalKnapsackFrames.js';
import { buildHuffmanFrames } from './huffmanFrames.js';
import { blockingPairs } from '../../lib/galeShapley.js';

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

// ── Stable matching (Gale-Shapley) — the closing scene's instance ─────────────
// The exam bank tests stable matching but no scene taught it, a study→exam dead
// end. This fixed 3×3 instance + a PROPOSED (not GS-produced) matching gives the
// student one calm "is this stable? if not, who blocks it?" beat. Everything the
// scene shows — the prefs, the matching lines, the predict answer — lives here so
// the stage renders the SAME data the answer is derived from, and so
// stableMatching.test.js can re-derive the key from galeShapley.js. We label the
// people with first names purely for readability; the prefs are id-keyed.
export const STABLE_MEN = {
	m1: ['w1', 'w2', 'w3'],
	m2: ['w1', 'w3', 'w2'],
	m3: ['w2', 'w3', 'w1'],
};
export const STABLE_WOMEN = {
	w1: ['m2', 'm1', 'm3'],
	w2: ['m1', 'm3', 'm2'],
	w3: ['m3', 'm2', 'm1'],
};
// A deliberately UNSTABLE proposed matching (NOT what Gale-Shapley returns). It
// pairs each man with a partner, but exactly one pair blocks it. The student
// commits to which pair (or "stable") before the stage reveals the blocking edge.
export const STABLE_PROPOSED = { m1: 'w1', m2: 'w3', m3: 'w2' };

// Human-readable labels so the option strings read like "Bram ⇄ Wren", not ids.
export const STABLE_MEN_NAMES = { m1: 'Adi', m2: 'Bram', m3: 'Cyrus' };
export const STABLE_WOMEN_NAMES = { w1: 'Wren', w2: 'Xena', w3: 'Yuki' };

export const stablePairLabel = (manId, womanId) =>
	`${STABLE_MEN_NAMES[manId]} ⇄ ${STABLE_WOMEN_NAMES[womanId]}`;

// DERIVED, never hand-typed: re-run the real stability checker on the EXACT
// instance + proposed matching the stage paints. It returns the single blocking
// pair { man: 'm2', woman: 'w1' }; the scene's answer is its readable label, and
// stableMatching.test.js asserts this equals blockingPairs(...) so it can't drift.
const STABLE_BLOCKING = blockingPairs(
	STABLE_PROPOSED,
	STABLE_MEN,
	STABLE_WOMEN
);
export const STABLE_BLOCKING_PAIR = STABLE_BLOCKING[0]; // { man:'m2', woman:'w1' }
export const STABLE_ANSWER = stablePairLabel(
	STABLE_BLOCKING_PAIR.man,
	STABLE_BLOCKING_PAIR.woman
); // = 'Bram ⇄ Wren'

// The three offered pairings + "It's already stable", in a fixed reading order so
// the option list is stable across runs. The correct one is STABLE_ANSWER.
export const STABLE_OPTIONS = [
	stablePairLabel('m1', 'w2'), // Adi ⇄ Xena — one-sided lure (Xena wants Adi; Adi does not)
	stablePairLabel('m2', 'w1'), // Bram ⇄ Wren — the real blocking pair
	stablePairLabel('m3', 'w3'), // Cyrus ⇄ Yuki — Cyrus already has his top choice
	"It's already stable",
];

// ── The five worked examples (rod cutting, LCS, 0/1 + fractional knapsack, ────
// Huffman). Each instance lives here so the stage renders the SAME runs the
// answers are derived from, exactly like the coin-change and stable-matching
// beats above. Every answer is read off a generator summary — never hand-typed —
// and lessonPredict.test.js re-derives each one independently so no key can
// drift from the generator the stage (and the playground) animates.

// Rod cutting — the first four prices of the CLRS §14.1 table, rod length 4.
// dp[4] = max(1+8, 5+5, 8+1, 9+0) = 10 by cutting 2 + 2 — one better than the 9
// an uncut rod fetches, a margin only the full max notices.
export const ROD_PRICES = [1, 5, 8, 9];
export const ROD_N = 4;
export const ROD_RUN = buildRodCuttingFrames({ prices: ROD_PRICES, n: ROD_N });
export const ROD_REVENUE = ROD_RUN.summary.revenue; // = 10 (pieces 2 + 2)

// LCS — the playground's small pair (AGCAT / GAC), 5 × 3 cells. The final cell
// compares T with C (no match), so it carries max(up, left) = 2; the traceback
// recovers "AC". The scene's predict is that final cell's value.
export const LCS_X = 'AGCAT';
export const LCS_Y = 'GAC';
export const LCS_RUN = buildLcsFrames({ x: LCS_X, y: LCS_Y });
export const LCS_LENGTH = LCS_RUN.summary.length; // = 2 = dp[5][3]

// Knapsack — the playground's "ratio trap" preset (strategiesMeta.js), solved
// BOTH ways on the same bag: the 0/1 table proves 7 (take Q whole, leave the
// denser P behind) while density greedy on indivisible items banks only 2; let
// items split (fractional) and the same density rule is provably optimal at
// 7.25 (P whole + 3/4 of Q).
export const KNAPSACK_CAPACITY = 4;
export const KNAPSACK_ITEMS = [
	{ name: 'P', weight: 1, value: 2 },
	{ name: 'Q', weight: 4, value: 7 },
];
export const KNAPSACK01_RUN = buildKnapsack01Frames({
	items: KNAPSACK_ITEMS,
	capacity: KNAPSACK_CAPACITY,
});
export const KNAPSACK01_BEST = KNAPSACK01_RUN.summary.best; // = 7 (Q alone)
export const FRACTIONAL_RUN = buildFractionalKnapsackFrames({
	items: KNAPSACK_ITEMS,
	capacity: KNAPSACK_CAPACITY,
});
export const FRACTIONAL_TOTAL = FRACTIONAL_RUN.summary.total; // = 7.25

// Huffman — the letters of ABRACADABRA (the playground preset). A's 5
// occurrences earn it the 1-bit code; the other six letters pay 3 bits each:
// 5·1 + 6·3 = 23 bits, against 11 × 3 = 33 for a fixed-width code.
export const HUFFMAN_SYMBOLS = [
	{ char: 'A', freq: 5 },
	{ char: 'B', freq: 2 },
	{ char: 'R', freq: 2 },
	{ char: 'C', freq: 1 },
	{ char: 'D', freq: 1 },
];
export const HUFFMAN_RUN = buildHuffmanFrames(HUFFMAN_SYMBOLS);
export const HUFFMAN_BITS = HUFFMAN_RUN.summary.huffmanBits; // = 23
export const HUFFMAN_FIXED_BITS = HUFFMAN_RUN.summary.fixedBits; // = 33

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
		body: 'Count the ways to climb stairs: ways(n) = ways(n − 1) + ways(n − 2). Expand it naively and the tree explodes — ways(5) makes 15 calls, and ways(2) alone is recomputed three times. That repetition is the signature of DP. Memoize (or fill a table) and each subproblem is solved exactly once: the exponential tree collapses to a linear table. Collapse the repeated calls instead of the tree and you get the SUBPROBLEM GRAPH — one node per distinct subproblem, an edge where one needs the other’s answer — and DP’s running time reads straight off it: roughly vertices plus edges. Solving that graph bottom-up in dependency order is exactly how the shortest-paths lesson relaxes a DAG; DP and DAG shortest paths are the same picture.',
		// numeric: grounded in the pure, unit-tested climbingStairsRecursion census
		// (buildOverlapCensus(5) → ways(2) naive count = 3).
		check: {
			kind: 'numeric',
			reviewSafe: false,
			prompt:
				'Expanding ways(5) with no memo, how many times is ways(2) computed?',
			answer: 3,
			explanation:
				'In the naive call tree of ways(5), the subproblem ways(2) appears three separate times — that is an overlapping subproblem. Memoization caches the first result so the other two evaluations are free, turning the exponential tree into an O(n) table. In the subproblem graph all three calls are one ways(2) vertex with its answer computed once — count that graph’s vertices and edges and you have already priced the whole DP run.',
		},
	},
	{
		id: 'rod-cutting',
		eyebrow: 'The recipe, reused',
		title: 'Rod cutting: pick a first piece, trust the table for the rest.',
		body: 'A rod of length 4, where pieces of length 1, 2, 3, 4 sell for 1, 5, 8, 9. This is coin change wearing price tags: dp[j] = max(price[i] + dp[j − i]) — one leading piece now, plus the best already-solved answer for what remains. Optimal substructure supplies the recurrence; overlapping subproblems (every dp[j − i] is reused across lengths) make the table worth filling. It has settled through dp[3] = 8. Commit to dp[4] before the last cell fills.',
		// predict (choice-mode) + revealGate: the RodBoard holds the honest frame
		// where dp[0..3] are settled and dp[4] is still pending; the student runs the
		// max themselves before the stage writes it. The answer is DERIVED from the
		// real generator — buildRodCuttingFrames({prices:[1,5,8,9], n:4}).summary
		// .revenue === 10 (cut 2 + 2), beating the whole rod's 9 by one. Re-derived
		// independently in lessonPredict.test.js so the key can never drift.
		check: {
			kind: 'predict',
			reviewSafe: false,
			revealGate: true,
			prompt:
				'Try every leading piece against the settled cells — price[i] + dp[4 − i] for i = 1..4. What revenue does the max write into dp[4]?',
			options: [4, 9, 10, 13],
			answer: ROD_REVENUE,
			misconceptions: {
				4: 'Four is the all-unit cut, 1 + 1 + 1 + 1 — a single candidate (i = 1 all the way down), not the max. dp[4] also tries a leading piece of 2, and price[2] + dp[2] = 5 + 5 = 10 more than doubles the unit plan.',
				9: 'Nine is what the uncut rod fetches (price[4]) — and also what a 3 + 1 cut earns (8 + 1). Both are candidates dp[4] weighs and rejects, because 2 + 2 earns 5 + 5 = 10. Selling whole is one option among many, never the default.',
				13: 'That adds price[3] + price[2] = 8 + 5 — pieces totaling length 5, cut from a rod of length 4. The recurrence cannot make this mistake: pairing price[i] with dp[4 − i] spends exactly the rod you have.',
			},
			explanation:
				'dp[4] = max(1 + dp[3], 5 + dp[2], 8 + dp[1], 9 + dp[0]) = max(9, 10, 9, 9) = 10 — cut the rod into 2 + 2. Every candidate is one piece plus an already-optimal smaller answer (optimal substructure), and those smaller cells are read again and again across lengths (overlapping subproblems). Cutting beats selling whole by exactly 1, a margin only the full max ever notices.',
		},
	},
	{
		id: 'lcs',
		eyebrow: 'Two dimensions',
		title: 'Longest common subsequence: the table grows a second dimension.',
		body: 'Compare AGCAT with GAC. One index cannot name this subproblem — the state is a pair of prefixes, so the table gains a dimension: dp[i][j] is the LCS length of X[1..i] and Y[1..j]. A match extends the diagonal, dp[i−1][j−1] + 1. A mismatch drops one character and carries the better of up and left. The fill has reached the final cell, where T meets C.',
		// predict (choice-mode) + revealGate: the LcsBoard holds the frame just
		// before the corner cell is written (active cell dp[5][2], with dp[4][3] and
		// dp[5][2] both settled at 2), so the student applies the mismatch rule
		// themselves. The answer is DERIVED from the real generator —
		// buildLcsFrames({x:'AGCAT', y:'GAC'}).summary.length === 2 === dp[5][3],
		// with traceback "AC". Re-derived in lessonPredict.test.js.
		check: {
			kind: 'predict',
			reviewSafe: false,
			revealGate: true,
			prompt:
				'The final cell compares X[5] = T with Y[3] = C — no match. What value lands in dp[5][3]?',
			options: [0, 2, 3],
			answer: LCS_LENGTH,
			misconceptions: {
				0: 'A mismatch does not reset the count — that is the longest common SUBSTRING recurrence, where the run must be contiguous. A subsequence survives a mismatch: the cell carries the better prefix answer forward, max(↑, ←) = 2.',
				3: 'The +1 rides only the diagonal, and only on a match. T ≠ C, so dp[5][3] copies the better of up (2) and left (2) with nothing added — dropping a character can never lengthen the common subsequence.',
			},
			explanation:
				'No match, so dp[5][3] = max(dp[4][3], dp[5][2]) = max(2, 2) = 2: drop the T or the C and keep the better prefix answer. The +1 travels only on the diagonal, when both strings agree. Fifteen cells, each solved once from three already-final neighbours — overlapping subproblems in two dimensions — and the traceback walks the corner home to an actual subsequence, “AC”.',
		},
	},
	{
		id: 'knapsack-01',
		eyebrow: 'All or nothing',
		title: '0/1 knapsack: indivisible items break the density rule.',
		body: 'A bag of capacity 4 and two indivisible items: P weighs 1 and pays 2, Q weighs 4 and pays 7. By density P looks better — 2 per unit of weight against Q’s 1.75. But nothing here can be split, so each cell weighs two whole futures: skip the item (copy the cell above) or take all of it (its value plus the cell above, shifted left by its weight). Row Q has reached the full bag.',
		// predict (choice-mode) + revealGate: the KnapsackBoard holds the frame just
		// before the corner cell dp[2][4] is written (row P settled at 2, row Q
		// settled through w = 3), so the student weighs take-vs-skip themselves. The
		// answer is DERIVED from the real generator — buildKnapsack01Frames on the
		// playground's ratio-trap instance gives summary.best === 7 (Q alone), while
		// density greedy banks 2 — the distractor. Re-derived in lessonPredict.test.js.
		check: {
			kind: 'predict',
			reviewSafe: false,
			revealGate: true,
			prompt:
				'At the corner cell the bag is finally big enough for Q. What optimal value fills dp[Q][4] — the best this bag can carry?',
			options: [2, 7, 9],
			answer: KNAPSACK01_BEST,
			misconceptions: {
				2: 'Two is density greedy’s answer: grab P first (ratio 2 beats 1.75) and strand 3 capacity the indivisible Q cannot use. The table never pre-commits — at the full bag it still compares both futures, and taking Q for 7 wins.',
				9: 'Nine takes both items, but P + Q weigh 5 in a bag of capacity 4. The take branch pays for Q out of what remains — 7 + dp[P][0] — and that 0 is the table saying P no longer fits once Q is in.',
			},
			explanation:
				'dp[Q][4] = max(skip Q → dp[P][4] = 2, take Q → 7 + dp[P][0] = 7) = 7. Dense little P is the trap: taking it first leaves 3 capacity the indivisible Q cannot enter, which is exactly what density greedy does — it banks 2. The table, comparing both whole futures at every capacity, quietly leaves the “better ratio” behind. No exchange argument survives indivisibility; this bag returns two scenes from now with the one rule change that saves it.',
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
		id: 'fractional-knapsack',
		eyebrow: 'One rule change',
		title: 'Fractional knapsack: let items split and greedy becomes a theorem.',
		body: 'The 0/1 bag returns — capacity 4, P (weight 1, value 2), Q (weight 4, value 7) — with one rule changed: items may now be split. That change is everything. Sort by value per weight, take the densest whole, and shave a fraction off the last item so the bag closes exactly full. The exchange argument works again: any plan holding sparser weight improves by swapping it, gram for gram, for denser weight. Greedy has taken P whole; 3 capacity remains, and Q weighs 4.',
		// numeric + revealGate: the FractionalBoard holds the frame right after P is
		// taken whole (bag ¼ full, value 2) — the canvas would otherwise display the
		// final total the student is asked to compute. The answer is DERIVED from the
		// real generator — buildFractionalKnapsackFrames on the SAME ratio-trap bag
		// gives summary.total === 7.25 (2 + ¾ · 7), beating the 0/1 optimum of 7.
		// Re-derived in lessonPredict.test.js.
		check: {
			kind: 'numeric',
			reviewSafe: false,
			revealGate: true,
			prompt:
				'P is in whole and 3 capacity remains. Splitting is allowed — what total value does greedy close the bag with?',
			answer: FRACTIONAL_TOTAL,
			placeholder: 'Total value (decimals allowed)',
			explanation:
				'P fills 1 unit for value 2; the remaining 3 capacity takes 3/4 of Q for 0.75 × 7 = 5.25 — total 7.25. Hold this one bag’s three answers side by side: density greedy on indivisible items banked 2, the 0/1 table proved 7, and splitting reaches 7.25 — above every whole-item plan, because the bag closes with zero slack at the best value per unit of weight. Divisibility alone turned the same greedy rule from trap into theorem.',
		},
	},
	{
		id: 'huffman',
		eyebrow: 'Greedy builds a code',
		title: 'Huffman coding: merge the two rarest, out comes an optimal code.',
		body: 'Count the letters of ABRACADABRA — A five times, B and R twice, C and D once — and give each a binary codeword no other codeword is a prefix of. Huffman’s greedy move: merge the two rarest trees under a new parent, repeat until one tree stands. The exchange argument holds because the two rarest symbols can always be made deepest siblings without lengthening the code. Each leaf’s path — 0 left, 1 right — is its codeword, read off in the table below the tree.',
		// choice + revealGate: the tree and codeword table must stay visible (the
		// question is computed FROM them), so the board only withholds its bit-total
		// verdict until the student commits. The answer is DERIVED from the real
		// generator — buildHuffmanFrames(ABRACADABRA counts).summary.huffmanBits ===
		// 23, against fixedBits === 33 and a plain sum of codeword lengths of 13 (the
		// two distractors). Re-derived in lessonPredict.test.js.
		check: {
			kind: 'choice',
			reviewSafe: false,
			revealGate: true,
			prompt:
				'Encode all 11 letters of ABRACADABRA with the codewords shown. How many bits long is the message?',
			options: [13, 23, 33],
			answer: HUFFMAN_BITS,
			misconceptions: {
				13: 'That sums each codeword once — 1 + 3 + 3 + 3 + 3 — as if every letter occurred a single time. A message pays a codeword per occurrence: A’s 1 bit is spent five times, so the total is Σ freq × length = 23.',
				33: 'Thirty-three is the fixed-width baseline — 5 distinct symbols need 3 bits each, and 11 × 3 = 33. Huffman beats it by ten bits (about 30%) precisely because A, nearly half the message, pays 1 bit instead of 3.',
			},
			explanation:
				'A costs 1 bit and appears 5 times; B, R, C, D cost 3 bits across the 6 remaining letters: 5 × 1 + 6 × 3 = 23 bits, against 33 fixed-width. The message length is the tree’s weighted path length, Σ freq × depth — and the greedy merges minimize exactly that, sinking the rare C and D where long codes are cheap and keeping A shallow where a short code pays off five times over.',
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
	{
		id: 'stable-matching',
		eyebrow: 'A greedy that IS safe',
		title: 'Stable matching: a greedy proposal rule with no blocking pair.',
		body: 'Gale-Shapley is greedy too — every man proposes down his list, every woman keeps her best suitor so far and trades up. It is provably safe because it returns a STABLE matching: no two people both prefer each other over their assigned partners. Below is a matching someone proposed for these three pairs. A pair (m, w) BLOCKS it only when BOTH prefer each other to their current partner. Commit to your verdict before the stage reveals the edge.',
		// predict (choice-mode) + revealGate: BEFORE the StableBoard draws the
		// blocking edge, the student commits to whether the shown matching is stable
		// and, if not, WHICH pair blocks it. The answer is DERIVED from the real
		// stability checker — blockingPairs(STABLE_PROPOSED, STABLE_MEN, STABLE_WOMEN)
		// returns exactly { man:'m2', woman:'w1' } (Bram ⇄ Wren), labelled in
		// STABLE_ANSWER. Re-derived in stableMatching.test.js so the key can never
		// drift from galeShapley.js, exactly like the greedy-trap coin count above.
		check: {
			kind: 'predict',
			reviewSafe: false,
			revealGate: true,
			prompt:
				'Is this proposed matching stable? If not, which pair would break it by eloping?',
			options: STABLE_OPTIONS,
			answer: STABLE_ANSWER,
			misconceptions: {
				[stablePairLabel('m1', 'w2')]:
					'Xena does prefer Adi to her partner Cyrus — but Adi is already with Wren, his TOP choice, so he would never leave for Xena. A blocking pair needs BOTH to prefer each other; one-sided longing is not enough.',
				[stablePairLabel('m3', 'w3')]:
					'Cyrus is already matched to Xena, his FIRST choice, so he prefers no one to her — he cannot be half of a blocking pair here. Check the man wants to switch too, not just the woman.',
				"It's already stable":
					'Look again at Bram: he is matched to Yuki but ranks Wren first, and Wren ranks Bram first over her partner Adi. They both prefer each other, so they would elope — that blocking pair makes the matching unstable.',
			},
			explanation:
				'Bram ⇄ Wren blocks: Bram is matched to Yuki but prefers Wren (his #1), and Wren is matched to Adi but prefers Bram (her #1) — both would rather elope, so the matching is unstable. Adi⇄Xena and Cyrus⇄Yuki are only one-sided attractions (one wants to switch, the partner does not), which never block. Run Gale-Shapley instead and Wren ends up with Bram: the result has no blocking pair at all. That guaranteed absence is why this greedy proposal rule is provably safe — the greedy-choice property of the matching world.',
		},
	},
];
