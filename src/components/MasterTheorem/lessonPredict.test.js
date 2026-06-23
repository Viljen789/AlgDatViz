import assert from 'node:assert/strict';
import test from 'node:test';

// Derivation guardrail for the Master Theorem lesson's predict-before-reveal beat,
// the in-lesson twin of the exam's master-theorem-classify item. The student COMMITS
// to a case (Case 1 / 2 / 3) on the 'levels' scene before the stage draws the
// silhouette + verdict chip. That answer must NOT be hand-typed: it is read straight
// off analyseRecurrence — the very generator the stage's verdict renders — so the
// rehearsal can never drift from what the figure shows or from the exam item.
//
// Here we re-run analyseRecurrence on the SAME recurrence the scene pins and assert
// the scene's predict answer equals the case the generator names. If the scene ever
// typed its own case, or repointed its pinned recurrence, this fails.

import { SCENES } from './scenes.js';
import { analyseRecurrence } from './masterMath.js';

const levelsScene = SCENES.find(s => s.id === 'levels');

test('levels scene exists and pins a recurrence for its predict beat', () => {
	assert.ok(levelsScene, "the 'levels' scene is present");
	assert.ok(
		levelsScene.recurrence,
		'the predict scene pins a recurrence so the stage can draw its silhouette'
	);
});

test('predict answer === analyseRecurrence(scene.recurrence).name', () => {
	// THE GUARDRAIL: re-derive the case from the generator on the scene's own pinned
	// recurrence (a=8, b=2, d=1 → c=3 > d=1 → Case 1) and assert the authored answer
	// matches. This is the same key the exam's classify item derives, so the lesson
	// rehearsal == the exam.
	const derived = analyseRecurrence(levelsScene.recurrence).name;
	assert.equal(levelsScene.check.kind, 'predict');
	assert.equal(levelsScene.check.answer, derived);
	assert.equal(derived, 'Case 1'); // c = log₂(8) = 3 > d = 1, leaves win
});

test('the predict is a gated choice whose answer is a real option', () => {
	const { check } = levelsScene;
	// revealGate is required here: the pinned scene auto-draws the bottom-heavy
	// silhouette + "Case 1" verdict, which would spoil the prediction, so the stage
	// must hold a neutral pre-draw frame until the student commits.
	assert.equal(check.revealGate, true);
	assert.ok(
		Array.isArray(check.options),
		'choice-mode predict carries options'
	);
	assert.ok(
		check.options.includes(check.answer),
		'the derived answer is one of the options the student can pick'
	);
});

test('every distractor has a misconception line, no orphan keys', () => {
	const { check } = levelsScene;
	const distractors = check.options.filter(o => o !== check.answer);
	for (const wrong of distractors) {
		assert.ok(
			typeof check.misconceptions?.[String(wrong)] === 'string' &&
				check.misconceptions[String(wrong)].length > 0,
			`distractor ${wrong} has a teaching line`
		);
	}
	// No orphan keys: every misconception key is an actual wrong option.
	for (const key of Object.keys(check.misconceptions ?? {})) {
		assert.ok(
			check.options.map(String).includes(key) && key !== String(check.answer),
			`misconception key "${key}" maps to a real distractor`
		);
	}
});
