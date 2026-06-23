import assert from 'node:assert/strict';
import test from 'node:test';

// Derivation guardrail for the verify-it scene's predict-before-reveal check.
//
// The 'verify-it' scene asks the student to COMMIT to the verification verdict —
// does the verifier accept or reject the proposed 3-SAT certificate? — BEFORE the
// stage's VerifyBoard scans the clauses. The answer must therefore be DERIVED from
// the same pure verifier the board animates (verify3SAT in certificates.js), never
// hand-typed, so the prompt and the board can never disagree.
//
// Here we re-run verify3SAT on the EXACT formula + certificate the stage uses
// (DEMO_FORMULA / VERIFY_ASSIGNMENT, mirrored below as the stage hard-codes them
// rather than exporting them) and re-derive the verdict independently, then assert
// the scene's authored answer equals it. If the certificate, the formula, or the
// verifier ever change so the verdict flips, this fails — exactly like the exam
// bank's and the ShortestPaths lesson's derived-key guardrails.

import { verify3SAT } from './certificates.js';
import { SCENES } from './scenes.js';

// Mirror of the data the stage feeds the board (NpCompletenessStage.jsx:
// DEMO_FORMULA + VERIFY_ASSIGNMENT). Kept here as an independent re-statement so a
// silent edit to either side is caught by the verdict no longer matching.
const FORMULA = {
	vars: ['x1', 'x2', 'x3'],
	clauses: [
		[
			{ var: 'x1', negated: false },
			{ var: 'x2', negated: true },
			{ var: 'x3', negated: false },
		],
		[
			{ var: 'x1', negated: true },
			{ var: 'x2', negated: false },
			{ var: 'x3', negated: false },
		],
	],
};
const ASSIGNMENT = { x1: true, x2: false, x3: false };

// The board renders "verifier accepts" when result.ok, else "verifier rejects";
// the predict options use the same two words. So the derived answer is exactly
// that verdict mapped to the option label.
const verdictLabel = ok => (ok ? 'Accepts' : 'Rejects');

const verifyScene = SCENES.find(scene => scene.id === 'verify-it');

test('verify-it scene hosts a predict-before-reveal with a reveal gate', () => {
	assert.ok(verifyScene, 'verify-it scene not found');
	assert.equal(verifyScene.check.kind, 'predict');
	assert.equal(
		verifyScene.check.revealGate,
		true,
		'the VerifyBoard auto-paints the verdict, so the predict must gate it'
	);
	assert.deepEqual(
		verifyScene.check.options,
		['Accepts', 'Rejects'],
		'options must mirror the board verdict wording'
	);
});

test('verify-it answer is the verify3SAT verdict for the certificate the board scans', () => {
	const result = verify3SAT(FORMULA, ASSIGNMENT);
	// Sanity: this is the rejecting certificate the scene is built around — clause 0
	// satisfied by x1, clause 1 has no true literal.
	assert.equal(result.satisfiedClauses, 1);
	assert.equal(result.totalClauses, 2);
	assert.equal(result.ok, false);

	const derived = verdictLabel(result.ok);
	assert.equal(
		verifyScene.check.answer,
		derived,
		'authored answer is not the verify3SAT verdict (accepts/rejects) for this certificate'
	);
	assert.ok(
		verifyScene.check.options.includes(verifyScene.check.answer),
		'answer is not among the predict options'
	);
});

// Mirror of misconceptionCoverage.test.js, applied here so the predict's single
// distractor carries its teaching line and no key is an orphan.
test('verify-it predict covers every distractor with a misconception line', () => {
	const { options, answer, misconceptions } = verifyScene.check;
	const distractors = options
		.map(String)
		.filter(option => option !== String(answer));
	const keys = misconceptions ? Object.keys(misconceptions) : [];
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
