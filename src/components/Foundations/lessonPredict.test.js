import assert from 'node:assert/strict';
import test from 'node:test';

// Derivation guardrails for the Foundations scenes whose check keys are derived
// from live data rather than hand-typed:
//   • the `race` predict-before-reveal — the answer must be the class the
//     stage's own curves make highest at large n;
//   • the `bisect` hand-trace — the answer must be the second probe of an
//     actual [lo, hi) trace of the very array the stage draws.
// Each is re-derived here INDEPENDENTLY of the scene's own helper (a second
// read-off, so a bug in the helper is caught too), then asserted equal to the
// authored key. If the underlying data ever changes, this fails unless the
// scene key follows — the key can't quietly drift.

import { SCENES, BISECT, bisectProbes } from './scenes.js';
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

// ── bisect scene: the second-probe key must be a real trace, not a hand-typed
// index. The scene derives it from bisectProbes (the SAME data the stage
// draws); here the probe sequence is re-derived with an INDEPENDENT recursive
// implementation of the [lo, hi) convention, so a bug in either one is caught.

const bisectScene = () => {
	const scene = SCENES.find(s => s.id === 'bisect');
	assert.ok(scene, 'the `bisect` scene exists');
	assert.equal(scene.check.kind, 'choice', '`bisect` is a hand-trace choice');
	return scene.check;
};

// Independent trace: same half-open convention (mid = ⌊(lo + hi) / 2⌋, too
// small ⇒ lo = mid + 1, too big ⇒ hi = mid) but written recursively, so the two
// derivations share no code.
const rederiveProbes = (
	values,
	target,
	lo = 0,
	hi = values.length,
	acc = []
) => {
	if (lo >= hi) return acc;
	const mid = (lo + hi) >> 1;
	acc.push(mid);
	if (values[mid] === target) return acc;
	return values[mid] < target
		? rederiveProbes(values, target, mid + 1, hi, acc)
		: rederiveProbes(values, target, lo, mid, acc);
};

test('the bisect scene data is a sorted array that contains the target', () => {
	const sorted = [...BISECT.values].sort((a, b) => a - b);
	assert.deepEqual(BISECT.values, sorted, 'binary search needs sorted input');
	assert.ok(BISECT.values.includes(BISECT.target), 'target is present');
});

test('the two probe derivations agree (scene helper vs independent recursion)', () => {
	assert.deepEqual(
		bisectProbes(BISECT.values, BISECT.target),
		rederiveProbes(BISECT.values, BISECT.target)
	);
});

test('bisect answer is the second probe of the actual trace', () => {
	const probes = rederiveProbes(BISECT.values, BISECT.target);
	assert.ok(probes.length >= 2, 'the trace reaches a second probe');
	assert.equal(bisectScene().answer, String(probes[1]));
});

test('the derived second probe is one of the offered options', () => {
	const check = bisectScene();
	assert.ok(
		check.options.includes(check.answer),
		'answer must be selectable among options[]'
	);
});

test('the trace honors the ⌊log₂ n⌋ + 1 probe budget the scene promises', () => {
	const probes = rederiveProbes(BISECT.values, BISECT.target);
	const budget = Math.floor(Math.log2(BISECT.values.length)) + 1;
	assert.ok(
		probes.length <= budget,
		`took ${probes.length} probes, budget is ${budget}`
	);
});
