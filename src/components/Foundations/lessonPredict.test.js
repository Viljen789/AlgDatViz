import assert from 'node:assert/strict';
import test from 'node:test';

// Derivation guardrail for the Foundations `race` scene's predict-before-reveal.
// The check asks which growth class tops the race plot at large n; its answer must
// be the class the stage's own curves make highest, never a hand-typed label. So
// here we re-derive the winner INDEPENDENTLY of growthRates.fastestGrowingAt (a
// second read-off, so a bug in the helper is caught too), then assert the authored
// scene answer equals it. If the race functions or the right edge ever change, this
// fails unless the scene key follows — the key can't quietly drift.

import { SCENES } from './scenes.js';
import { GROWTH_RATES, RACE_NMAX, fastestGrowingAt } from './growthRates.js';

const raceCheck = () => {
	const scene = SCENES.find(s => s.id === 'race');
	assert.ok(scene, 'the `race` scene exists');
	assert.equal(
		scene.check.kind,
		'predict',
		'`race` is a predict-before-reveal'
	);
	return scene.check;
};

// Independent winner: sort the classes by f(RACE_NMAX) and take the top, rather
// than reusing fastestGrowingAt's max-scan. Two code paths, one answer.
const rederiveWinner = n =>
	[...GROWTH_RATES].sort((a, b) => b.f(n) - a.f(n))[0].label;

test('race answer is the class the stage plots highest at the right edge', () => {
	const winner = rederiveWinner(RACE_NMAX);
	assert.equal(raceCheck().answer, winner);
});

test('the two derivations agree (helper vs independent sort)', () => {
	assert.equal(fastestGrowingAt(RACE_NMAX), rederiveWinner(RACE_NMAX));
});

test('the derived winner is one of the offered options', () => {
	const check = raceCheck();
	assert.ok(
		check.options.includes(check.answer),
		'answer must be selectable among options[]'
	);
});

test('every distractor (and only distractors) carries a misconception line', () => {
	const check = raceCheck();
	const distractors = check.options
		.map(String)
		.filter(o => o !== String(check.answer));
	const keys = Object.keys(check.misconceptions || {});
	assert.deepEqual(
		keys.filter(k => !distractors.includes(k)),
		[],
		'no orphan misconception keys'
	);
	assert.deepEqual(
		distractors.filter(d => !keys.includes(d)),
		[],
		'no distractor left without a teaching line'
	);
});

test('the race scene gates the reveal (so the plot cannot spoil the prediction)', () => {
	assert.equal(raceCheck().revealGate, true);
});

// Sanity on the model itself: at the right edge the exponential really is the
// runaway winner, and the flat constant is the floor — the race the stage draws.
test('at large n the exponential tops the ladder and the constant is the floor', () => {
	const byGrowth = [...GROWTH_RATES].sort(
		(a, b) => a.f(RACE_NMAX) - b.f(RACE_NMAX)
	);
	assert.equal(byGrowth.at(-1).label, 'O(2ⁿ)');
	assert.equal(byGrowth[0].label, 'O(1)');
});
