import { test } from 'node:test';
import assert from 'node:assert/strict';
import { furthestSceneIndex } from './useProgress.js';

// furthestSceneIndex is the pure merge rule behind topic resume: it only ever
// moves the stored "furthest scene" forward, and treats anything malformed as
// scene 0 so bad state never throws or scrolls somewhere nonsensical. It takes
// no React/DOM, so it's testable in isolation here.

test('furthestSceneIndex: keeps the larger index (resume only moves forward)', () => {
	assert.equal(furthestSceneIndex(2, 5), 5);
	assert.equal(furthestSceneIndex(5, 2), 5);
	assert.equal(furthestSceneIndex(3, 3), 3);
});

test('furthestSceneIndex: scrolling back up never rewinds the resume point', () => {
	// Reader reached scene 6, then scrolls back to 1 — the stored furthest stays 6.
	let furthest = 0;
	for (const reached of [0, 1, 2, 3, 4, 5, 6, 3, 1, 0]) {
		furthest = furthestSceneIndex(furthest, reached);
	}
	assert.equal(furthest, 6);
});

test('furthestSceneIndex: first run / no history resolves to scene 0', () => {
	assert.equal(furthestSceneIndex(0, 0), 0);
	assert.equal(furthestSceneIndex(undefined, undefined), 0);
	assert.equal(furthestSceneIndex(null, null), 0);
});

test('furthestSceneIndex: malformed or negative inputs clamp to 0', () => {
	assert.equal(furthestSceneIndex(NaN, NaN), 0);
	assert.equal(furthestSceneIndex(-4, -1), 0);
	assert.equal(furthestSceneIndex(Infinity, 2), 2);
	assert.equal(furthestSceneIndex('3', '7'), 0); // non-numbers are not coerced
});

test('furthestSceneIndex: fractional indices floor to a whole scene', () => {
	assert.equal(furthestSceneIndex(0, 2.9), 2);
	assert.equal(furthestSceneIndex(1.4, 0), 1);
});
