import assert from 'node:assert/strict';
import test from 'node:test';

// Derivation guardrail for the Strategies lesson's predict-before-reveal beat.
// The greedy-trap scene asks the student to COMMIT to how many coins greedy
// spends on {1, 5, 6} for 10¢ BEFORE the stage plays it out. That answer must be
// un-fudgeable: re-run the SAME generator the stage animates on the SAME instance
// and re-derive the count INDEPENDENTLY of the scene, then assert the authored
// scene answer equals it. If a scene ever hand-typed its "5", this fails — exactly
// like ShortestPaths/lessonProbes.test.js holds its probe answers to the generator.

import { buildCoinChangeFrames } from './coinChangeFrames.js';
import { SCENES, GREEDY_TRAP_COINS } from './scenes.js';

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
