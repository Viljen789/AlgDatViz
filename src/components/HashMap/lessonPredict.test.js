import assert from 'node:assert/strict';
import test from 'node:test';

// Derivation guardrail for the HashMap lesson's predict-before-reveal beat.
//
// Scene 0 ("hash") asks the student to PREDICT which bucket the focus key drops
// into, then the stage reveals it. The graded answer must be the SAME bucket the
// stage actually fills — never a hand-typed index that could drift from the
// generator. The stage places the key with computeHash(FOCUS_KEY, STAGE_CAPACITY)
// via the exported STAGE_HASHES table, so here we re-derive that bucket two ways:
//   1. off STAGE_HASHES, the very data the canvas animates, and
//   2. off an INDEPENDENT re-implementation of the hash (a second read-off, so a
//      bug in scenes.js's computeHash is caught too),
// then assert the authored scene answer equals both. If the scene ever typed its
// own bucket, or the hash changed without the lesson following, this fails.

import { SCENES, STAGE_CAPACITY, STAGE_HASHES, FOCUS_KEY } from './scenes.js';

// Independent re-implementation of the hash the dashboard + scenes use. Kept
// byte-for-byte equivalent on purpose: it is a SECOND witness to the bucket, so a
// silent edit to the shared computeHash diverges from this and trips the test.
const rederiveHash = (key, capacity) => {
	let hash = 7;
	for (const char of key) {
		hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
	}
	return { rawHash: hash, index: hash % capacity };
};

const hashScene = SCENES.find(scene => scene.id === 'hash');

test('hash scene is a choice-mode predict with a held reveal gate', () => {
	assert.ok(hashScene, 'scene "hash" not found');
	assert.equal(hashScene.check.kind, 'predict', 'hash check is a predict');
	assert.equal(
		hashScene.check.revealGate,
		true,
		'hash predict gates the reveal (the stage would otherwise drop the key)'
	);
	assert.ok(
		Array.isArray(hashScene.check.options),
		'choice-mode predict carries an options array'
	);
});

test('hash scene answer is the bucket computeHash gives the focus key', () => {
	// The bucket the STAGE actually fills, read off the exported generator data.
	const fromStageData = STAGE_HASHES.find(h => h.key === FOCUS_KEY);
	assert.ok(fromStageData, `${FOCUS_KEY} missing from STAGE_HASHES`);

	// The same bucket, re-derived independently of scenes.js's computeHash.
	const fromHash = rederiveHash(FOCUS_KEY, STAGE_CAPACITY);

	assert.equal(
		fromStageData.index,
		fromHash.index,
		'STAGE_HASHES bucket disagrees with the independent hash'
	);
	assert.equal(
		hashScene.check.answer,
		fromHash.index,
		'authored predict answer is not computeHash(FOCUS_KEY, STAGE_CAPACITY).index'
	);
	assert.ok(
		hashScene.check.options.includes(hashScene.check.answer),
		'the derived answer is not among the predict options'
	);
});

test('every wrong bucket option carries a misconception line, no orphans', () => {
	const { options, answer, misconceptions } = hashScene.check;
	const distractors = options.map(String).filter(o => o !== String(answer));
	const keys = misconceptions ? Object.keys(misconceptions) : [];
	assert.deepEqual(
		keys.filter(k => !distractors.includes(k)),
		[],
		'a misconception key matches no wrong option (would never render)'
	);
	assert.deepEqual(
		distractors.filter(d => !keys.includes(d)),
		[],
		'a wrong bucket option is missing its misconception line'
	);
});

test('the distractor buckets are real, in-range buckets (not random indices)', () => {
	const { options } = hashScene.check;
	const realBuckets = new Set(STAGE_HASHES.map(h => h.index));
	options.forEach(bucket => {
		assert.ok(
			Number.isInteger(bucket) && bucket >= 0 && bucket < STAGE_CAPACITY,
			`option ${bucket} is not a 0-based bucket in range`
		);
	});
	// Two of the distractors (2 and 6) are buckets other demo keys really land
	// in, so they are plausible, not arbitrary. Assert at least one such overlap
	// so a future edit can't quietly swap in nonsense buckets.
	const overlap = options.filter(b => realBuckets.has(b));
	assert.ok(
		overlap.length >= 2,
		'expected the distractors to reuse real demo buckets, not arbitrary indices'
	);
});
