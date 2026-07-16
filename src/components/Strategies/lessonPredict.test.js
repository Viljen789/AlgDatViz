import assert from 'node:assert/strict';
import test from 'node:test';

// Derivation guardrail for the Strategies lesson's predict-before-reveal beats.
// The greedy-trap scene asks the student to COMMIT to how many coins greedy
// spends on {1, 5, 6} for 10¢ BEFORE the stage plays it out. That answer must be
// un-fudgeable: re-run the SAME generator the stage animates on the SAME instance
// and re-derive the count INDEPENDENTLY of the scene, then assert the authored
// scene answer equals it. If a scene ever hand-typed its "5", this fails — exactly
// like ShortestPaths/lessonProbes.test.js holds its probe answers to the generator.
//
// The five worked-example scenes (rod cutting, LCS, 0/1 + fractional knapsack,
// Huffman) are held to the same bar below: each answer is re-derived from its
// generator AND from an independent walk that never touches the generator's code
// path, and the factual claims the misconception lines make (density greedy banks
// 2; fixed-width is 33; …) are asserted too, so the teaching copy cannot rot.

import { buildCoinChangeFrames } from './coinChangeFrames.js';
import { buildRodCuttingFrames } from './rodCuttingFrames.js';
import { buildLcsFrames } from './lcsFrames.js';
import { buildKnapsack01Frames } from './knapsack01Frames.js';
import { buildFractionalKnapsackFrames } from './fractionalKnapsackFrames.js';
import { buildHuffmanFrames } from './huffmanFrames.js';
import {
	SCENES,
	GREEDY_TRAP_COINS,
	ROD_PRICES,
	ROD_N,
	ROD_REVENUE,
	LCS_X,
	LCS_Y,
	LCS_LENGTH,
	KNAPSACK_ITEMS,
	KNAPSACK_CAPACITY,
	KNAPSACK01_BEST,
	FRACTIONAL_TOTAL,
	HUFFMAN_SYMBOLS,
	HUFFMAN_BITS,
	HUFFMAN_FIXED_BITS,
} from './scenes.js';

const greedyTrapScene = () => {
	const scene = SCENES.find(s => s.id === 'greedy-trap');
	assert.ok(scene, 'greedy-trap scene not found');
	assert.equal(scene.check.kind, 'predict', 'greedy-trap is a predict check');
	return scene;
};

// Independent re-derivation: walk the greedy choice rule (biggest coin that fits,
// repeatedly) without touching the generator's summary helper, so a bug in either
// path is caught. This mirrors the textbook greedy on {1,5,6} for 10¢.
const greedyCoinCount = (target, coins) => {
	const sorted = [...coins].sort((a, b) => b - a);
	let remaining = target;
	let count = 0;
	let safety = 0;
	while (remaining > 0 && safety++ < 1024) {
		const coin = sorted.find(c => c <= remaining);
		if (!coin) return null; // greedy got stranded with no exact change
		remaining -= coin;
		count += 1;
	}
	return count;
};

test('greedy-trap predict: the answer re-derives from buildCoinChangeFrames', () => {
	const { summary } = buildCoinChangeFrames({ target: 10, coins: [1, 5, 6] });
	// The generator and the scene agree on the same greedy count (6+1+1+1+1 = 5).
	assert.equal(summary.greedyFinal, 5, 'generator: greedy spends 5 coins');
	assert.equal(
		GREEDY_TRAP_COINS,
		summary.greedyFinal,
		'scene constant is the generator greedy count, not hand-typed'
	);
	assert.equal(
		greedyTrapScene().check.answer,
		summary.greedyFinal,
		'authored predict answer is the generator greedy count'
	);
});

test('greedy-trap predict: an independent greedy walk agrees with the answer', () => {
	const independent = greedyCoinCount(10, [1, 5, 6]);
	assert.equal(
		independent,
		5,
		'independent greedy walk: 6 + 1 + 1 + 1 + 1 = 5'
	);
	assert.equal(
		greedyTrapScene().check.answer,
		independent,
		'authored predict answer matches an independent re-derivation'
	);
	// And DP genuinely beats it (the whole point of the trap), so 5 is the greedy
	// number, not the optimum.
	const { summary } = buildCoinChangeFrames({ target: 10, coins: [1, 5, 6] });
	assert.equal(
		summary.dpFinal,
		2,
		'DP optimum is 2 (5 + 5), so greedy is unsafe'
	);
	assert.notEqual(
		greedyTrapScene().check.answer,
		summary.dpFinal,
		'the predict answer is the greedy count, distinct from the DP optimum'
	);
});

test('greedy-trap predict: the answer is one of the offered options', () => {
	const check = greedyTrapScene().check;
	assert.ok(
		check.options.includes(check.answer),
		'predict answer must be a selectable option'
	);
	assert.equal(
		check.revealGate,
		true,
		'the auto-revealing stage must be gated'
	);
});

test('greedy-trap predict: every distractor carries a misconception line', () => {
	const check = greedyTrapScene().check;
	const distractors = check.options
		.map(String)
		.filter(option => option !== String(check.answer));
	const keys = check.misconceptions ? Object.keys(check.misconceptions) : [];
	assert.deepEqual(
		keys.filter(key => !distractors.includes(key)),
		[],
		'misconception key(s) match no option (would never render)'
	);
	assert.deepEqual(
		distractors.filter(distractor => !keys.includes(distractor)),
		[],
		'a wrong option is missing its misconception line'
	);
});

// ── The five worked-example scenes ───────────────────────────────────────────

const sceneCheck = (id, kind) => {
	const scene = SCENES.find(s => s.id === id);
	assert.ok(scene, `${id} scene not found`);
	assert.equal(scene.check.kind, kind, `${id} is a ${kind} check`);
	return scene.check;
};

// A gated choice-style check must offer its answer and actually hold the stage.
const assertGatedChoice = (id, check) => {
	assert.ok(
		check.options.includes(check.answer),
		`${id}: answer must be a selectable option`
	);
	assert.equal(check.revealGate, true, `${id}: the revealing stage is gated`);
};

test('rod-cutting predict: the answer re-derives from buildRodCuttingFrames', () => {
	const { summary } = buildRodCuttingFrames({ prices: ROD_PRICES, n: ROD_N });
	assert.equal(summary.revenue, 10, 'generator: best revenue is 10');
	assert.deepEqual(
		summary.pieces,
		[2, 2],
		'generator: the optimal cut is 2 + 2'
	);
	assert.equal(
		ROD_REVENUE,
		summary.revenue,
		'scene constant is the generator revenue, not hand-typed'
	);
	assert.equal(
		sceneCheck('rod-cutting', 'predict').answer,
		summary.revenue,
		'authored predict answer is the generator revenue'
	);
});

test('rod-cutting predict: an independent recursion agrees with the answer', () => {
	// Plain top-down max over every leading piece — no dp table, no generator.
	const best = j =>
		j === 0
			? 0
			: Math.max(
					...Array.from(
						{ length: j },
						(_, k) => (ROD_PRICES[k] ?? 0) + best(j - (k + 1))
					)
				);
	assert.equal(best(ROD_N), 10, 'independent recursion: max revenue is 10');
	const check = sceneCheck('rod-cutting', 'predict');
	assert.equal(check.answer, best(ROD_N), 'answer matches the re-derivation');
	// The misconception lines' claims: selling whole fetches 9, and the answer
	// genuinely beats it (the scene's "margin only the max notices").
	assert.equal(ROD_PRICES[ROD_N - 1], 9, 'the uncut rod fetches 9');
	assert.ok(
		check.answer > ROD_PRICES[ROD_N - 1],
		'cutting beats selling whole'
	);
	assertGatedChoice('rod-cutting', check);
});

test('lcs predict: the answer re-derives from buildLcsFrames', () => {
	const { summary } = buildLcsFrames({ x: LCS_X, y: LCS_Y });
	assert.equal(summary.length, 2, 'generator: LCS length is 2');
	assert.equal(
		summary.dp[LCS_X.length][LCS_Y.length],
		summary.length,
		'the corner cell IS the LCS length'
	);
	assert.equal(summary.lcs, 'AC', 'generator traceback recovers "AC"');
	assert.equal(
		LCS_LENGTH,
		summary.length,
		'scene constant is the generator length, not hand-typed'
	);
	assert.equal(
		sceneCheck('lcs', 'predict').answer,
		summary.length,
		'authored predict answer is the corner-cell value'
	);
});

test('lcs predict: an independent recursion agrees with the answer', () => {
	// Textbook recursive LCS on the raw strings — no table shared with the
	// generator, so a bug in either path is caught.
	const lcsLen = (i, j) =>
		i === 0 || j === 0
			? 0
			: LCS_X[i - 1] === LCS_Y[j - 1]
				? lcsLen(i - 1, j - 1) + 1
				: Math.max(lcsLen(i - 1, j), lcsLen(i, j - 1));
	const independent = lcsLen(LCS_X.length, LCS_Y.length);
	assert.equal(independent, 2, 'independent recursion: LCS length is 2');
	const check = sceneCheck('lcs', 'predict');
	assert.equal(check.answer, independent, 'answer matches the re-derivation');
	assertGatedChoice('lcs', check);
});

test('knapsack-01 predict: the answer re-derives from buildKnapsack01Frames', () => {
	const { summary } = buildKnapsack01Frames({
		items: KNAPSACK_ITEMS,
		capacity: KNAPSACK_CAPACITY,
	});
	assert.equal(summary.best, 7, 'generator: optimal value is 7');
	assert.deepEqual(summary.chosenNames, ['Q'], 'generator: take Q alone');
	assert.equal(
		KNAPSACK01_BEST,
		summary.best,
		'scene constant is the generator optimum, not hand-typed'
	);
	assert.equal(
		sceneCheck('knapsack-01', 'predict').answer,
		summary.best,
		'authored predict answer is the generator optimum'
	);
});

test('knapsack-01 predict: brute force agrees, and density greedy really banks 2', () => {
	// Independent brute force over every subset (2 items → 4 subsets).
	let best = 0;
	for (let mask = 0; mask < 1 << KNAPSACK_ITEMS.length; mask++) {
		let weight = 0;
		let value = 0;
		KNAPSACK_ITEMS.forEach((it, idx) => {
			if (mask & (1 << idx)) {
				weight += it.weight;
				value += it.value;
			}
		});
		if (weight <= KNAPSACK_CAPACITY) best = Math.max(best, value);
	}
	assert.equal(best, 7, 'brute force: optimal value is 7');
	const check = sceneCheck('knapsack-01', 'predict');
	assert.equal(check.answer, best, 'answer matches the brute force');
	// The "2" misconception's claim: density greedy on indivisible items grabs P
	// (ratio 2 > 1.75), strands 3 capacity, and banks only 2.
	let remaining = KNAPSACK_CAPACITY;
	let greedyValue = 0;
	for (const it of [...KNAPSACK_ITEMS].sort(
		(a, b) => b.value / b.weight - a.value / a.weight
	)) {
		if (it.weight <= remaining) {
			remaining -= it.weight;
			greedyValue += it.value;
		}
	}
	assert.equal(greedyValue, 2, 'density greedy (0/1) banks 2 on this bag');
	assert.notEqual(check.answer, greedyValue, 'the optimum is not the greedy 2');
	assertGatedChoice('knapsack-01', check);
});

test('fractional-knapsack numeric: the answer re-derives from the generator', () => {
	const { summary } = buildFractionalKnapsackFrames({
		items: KNAPSACK_ITEMS,
		capacity: KNAPSACK_CAPACITY,
	});
	assert.equal(summary.total, 7.25, 'generator: greedy total is 7.25');
	const q = summary.states.find(s => s.name === 'Q');
	assert.equal(q?.fraction, 0.75, 'generator: 3/4 of Q fills the bag');
	assert.equal(
		FRACTIONAL_TOTAL,
		summary.total,
		'scene constant is the generator total, not hand-typed'
	);
	const check = sceneCheck('fractional-knapsack', 'numeric');
	assert.equal(check.answer, summary.total, 'authored numeric answer matches');
	assert.equal(check.revealGate, true, 'the total-revealing stage is gated');
});

test('fractional-knapsack numeric: an independent greedy walk agrees', () => {
	// Independent density walk with splitting — and the explanation's ledger:
	// splitting (7.25) beats the 0/1 optimum (7), which beats 0/1 greedy (2).
	const sorted = [...KNAPSACK_ITEMS].sort(
		(a, b) => b.value / b.weight - a.value / a.weight
	);
	let remaining = KNAPSACK_CAPACITY;
	let total = 0;
	for (const it of sorted) {
		const take = Math.min(1, remaining / it.weight);
		total += take * it.value;
		remaining -= take * it.weight;
		if (remaining <= 0) break;
	}
	assert.equal(total, 7.25, 'independent walk: 2 + 0.75 × 7 = 7.25');
	const check = sceneCheck('fractional-knapsack', 'numeric');
	assert.equal(check.answer, total, 'answer matches the re-derivation');
	assert.ok(
		check.answer > KNAPSACK01_BEST,
		'splitting beats the 0/1 optimum on the same bag'
	);
});

test('huffman choice: the answer re-derives from buildHuffmanFrames', () => {
	const { summary } = buildHuffmanFrames(HUFFMAN_SYMBOLS);
	assert.equal(summary.huffmanBits, 23, 'generator: the message takes 23 bits');
	assert.equal(
		HUFFMAN_BITS,
		summary.huffmanBits,
		'scene constant is the generator bit total, not hand-typed'
	);
	const check = sceneCheck('huffman', 'choice');
	assert.equal(
		check.answer,
		summary.huffmanBits,
		'authored choice answer is the generator bit total'
	);
	assertGatedChoice('huffman', check);
});

test('huffman choice: the codeword table independently re-sums to the answer', () => {
	// Cross-derivation: Σ freq × |code| over the emitted codewords is a different
	// path through the tree than the generator's depth measure — they must agree.
	const { summary } = buildHuffmanFrames(HUFFMAN_SYMBOLS);
	const weighted = HUFFMAN_SYMBOLS.reduce(
		(acc, s) => acc + s.freq * summary.codes[s.char].length,
		0
	);
	assert.equal(weighted, 23, 'Σ freq × codeword length = 23');
	const check = sceneCheck('huffman', 'choice');
	assert.equal(check.answer, weighted, 'answer matches the cross-derivation');
	// The distractors' claims: 33 is the fixed 3-bit baseline; 13 is the sum of
	// codeword lengths with frequencies forgotten (1 + 3 + 3 + 3 + 3).
	assert.equal(summary.fixedBits, 33, 'fixed-width baseline is 33 bits');
	assert.equal(HUFFMAN_FIXED_BITS, summary.fixedBits, 'scene constant matches');
	const unweighted = Object.values(summary.codes).reduce(
		(acc, code) => acc + code.length,
		0
	);
	assert.equal(unweighted, 13, 'the frequency-blind sum is 13');
	assert.ok(
		check.options.includes(summary.fixedBits) &&
			check.options.includes(unweighted),
		'both misconception values are offered as distractors'
	);
});
