import assert from 'node:assert/strict';
import test from 'node:test';

// Derivation guardrail for the Strategies lesson's stable-matching predict beat.
// The 'stable-matching' scene shows a fixed 3×3 instance plus a PROPOSED matching
// and asks the student to COMMIT to whether it is stable — and if not, which pair
// blocks it — BEFORE the stage draws the blocking edge. That answer must be
// un-fudgeable: re-run the SAME generator the exam uses (galeShapley.js) on the
// SAME instance the stage paints and re-derive the blocking pair INDEPENDENTLY of
// the scene, then assert the authored answer equals it. If a scene ever hand-typed
// "Bram ⇄ Wren", this fails — exactly like lessonPredict.test.js holds the
// greedy-trap coin count and ShortestPaths/lessonProbes.test.js holds its probes.

import { blockingPairs, galeShapley, isStable } from '../../lib/galeShapley.js';
import {
	SCENES,
	STABLE_MEN,
	STABLE_WOMEN,
	STABLE_PROPOSED,
	STABLE_MEN_NAMES,
	STABLE_WOMEN_NAMES,
	STABLE_OPTIONS,
	STABLE_ANSWER,
	stablePairLabel,
} from './scenes.js';

const stableScene = () => {
	const scene = SCENES.find(s => s.id === 'stable-matching');
	assert.ok(scene, 'stable-matching scene not found');
	assert.equal(
		scene.check.kind,
		'predict',
		'stable-matching is a predict check'
	);
	return scene;
};

// Independent re-derivation of "does (m,w) block?" straight from the preference
// lists — without calling blockingPairs — so a bug in either path is caught. A
// pair blocks iff BOTH rank the other strictly above their current partner.
const blocksByHand = (manId, womanId, proposed, men, women) => {
	const womanOfMan = proposed[manId];
	const husbandOfWoman = Object.keys(proposed).find(
		m => proposed[m] === womanId
	);
	const manPrefersHer =
		men[manId].indexOf(womanId) < men[manId].indexOf(womanOfMan);
	const womanPrefersHim =
		women[womanId].indexOf(manId) < women[womanId].indexOf(husbandOfWoman);
	return manPrefersHer && womanPrefersHim;
};

test('stable-matching predict: the proposed matching really is unstable', () => {
	assert.equal(
		isStable(STABLE_PROPOSED, STABLE_MEN, STABLE_WOMEN),
		false,
		'the scene must show an UNSTABLE matching for the predict to have a blocking pair'
	);
});

test('stable-matching predict: the answer re-derives from blockingPairs (one pair)', () => {
	const bp = blockingPairs(STABLE_PROPOSED, STABLE_MEN, STABLE_WOMEN);
	assert.equal(
		bp.length,
		1,
		'the instance must have exactly one blocking pair'
	);
	const { man, woman } = bp[0];
	const derivedLabel = stablePairLabel(man, woman);
	assert.equal(
		STABLE_ANSWER,
		derivedLabel,
		'scene constant is the generator blocking pair, not hand-typed'
	);
	assert.equal(
		stableScene().check.answer,
		derivedLabel,
		'authored predict answer is the generator blocking pair'
	);
});

test('stable-matching predict: an independent by-hand check agrees on the blocking pair', () => {
	// The only pair that blocks, by an independent read of the preference lists.
	assert.ok(
		blocksByHand('m2', 'w1', STABLE_PROPOSED, STABLE_MEN, STABLE_WOMEN),
		'Bram (m2) and Wren (w1) must each prefer the other to their partner'
	);
	// And every OTHER man/woman combination does not block.
	for (const manId of Object.keys(STABLE_MEN)) {
		for (const womanId of Object.keys(STABLE_WOMEN)) {
			if (STABLE_PROPOSED[manId] === womanId) continue; // already matched
			const expected = manId === 'm2' && womanId === 'w1';
			assert.equal(
				blocksByHand(manId, womanId, STABLE_PROPOSED, STABLE_MEN, STABLE_WOMEN),
				expected,
				`blocking status of ${stablePairLabel(manId, womanId)}`
			);
		}
	}
	assert.equal(
		stableScene().check.answer,
		stablePairLabel('m2', 'w1'),
		'authored predict answer matches the independent re-derivation'
	);
});

test('stable-matching predict: Gale-Shapley resolves the blocking pair (Wren ↔ Bram)', () => {
	// The whole point of the beat: running GS instead yields a STABLE matching in
	// which the blocking pair is married, so the answer is a real instability the
	// algorithm removes, not an arbitrary lure.
	const { matching } = galeShapley(STABLE_MEN, STABLE_WOMEN);
	assert.equal(
		matching.get('m2'),
		'w1',
		'Gale-Shapley pairs Bram with Wren, dissolving the blocking pair'
	);
	assert.ok(
		isStable(matching, STABLE_MEN, STABLE_WOMEN),
		'the Gale-Shapley result has no blocking pair'
	);
});

test('stable-matching predict: the answer is one of the offered options + gated', () => {
	const check = stableScene().check;
	assert.deepEqual(
		check.options,
		STABLE_OPTIONS,
		'the scene offers the canonical option list'
	);
	assert.ok(
		check.options.includes(check.answer),
		'predict answer must be a selectable option'
	);
	assert.equal(
		check.revealGate,
		true,
		'the auto-revealing stage must be gated until the student commits'
	);
});

test('stable-matching predict: every distractor carries a misconception line', () => {
	const check = stableScene().check;
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

test('stable-matching predict: the people labels are internally consistent', () => {
	// Guard the readable labels against drift from the id-keyed prefs (a mislabel
	// would silently teach the wrong pair even with a correct id-level derivation).
	for (const id of Object.keys(STABLE_MEN))
		assert.ok(STABLE_MEN_NAMES[id], `man ${id} has a display name`);
	for (const id of Object.keys(STABLE_WOMEN))
		assert.ok(STABLE_WOMEN_NAMES[id], `woman ${id} has a display name`);
});
