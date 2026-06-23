import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	firstTryStatsFrom,
	furthestSceneIndex,
	mergeCheckRecord,
	migrateCheckValue,
} from './useProgress.js';

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

// mergeCheckRecord is the non-punitive, first-try-preserving merge behind
// recordCheck: the first attempt decides `firstTry` forever; a later correct
// answer flips `correct` true without rewriting `firstTry`; a wrong answer never
// downgrades; and an unchanged answer returns the SAME object (identity) so the
// recording effect can bail without re-rendering.

test('mergeCheckRecord: a first-try success records both flags true', () => {
	assert.deepEqual(mergeCheckRecord(undefined, true), {
		correct: true,
		firstTry: true,
	});
});

test('mergeCheckRecord: a first wrong attempt is honest (both false)', () => {
	assert.deepEqual(mergeCheckRecord(undefined, false), {
		correct: false,
		firstTry: false,
	});
});

test('mergeCheckRecord: wrong→correct flips correct but firstTry stays false', () => {
	const first = mergeCheckRecord(undefined, false); // { correct:false, firstTry:false }
	const second = mergeCheckRecord(first, true);
	assert.deepEqual(second, { correct: true, firstTry: false });
});

test('mergeCheckRecord: a later wrong answer never un-records a prior correct', () => {
	const correct = { correct: true, firstTry: true };
	// non-punitive: returns the SAME object (no change), so the effect can bail
	assert.equal(mergeCheckRecord(correct, false), correct);
});

test('mergeCheckRecord: re-answering an already-correct check is a no-op', () => {
	const correct = { correct: true, firstTry: false };
	assert.equal(mergeCheckRecord(correct, true), correct);
});

// migrateCheckValue tolerates the legacy boolean shape on read.

test('migrateCheckValue: legacy `true` becomes a first-try success', () => {
	assert.deepEqual(migrateCheckValue(true), { correct: true, firstTry: true });
});

test('migrateCheckValue: a record passes through, defaulting firstTry to correct', () => {
	assert.deepEqual(migrateCheckValue({ correct: true, firstTry: false }), {
		correct: true,
		firstTry: false,
	});
	// firstTry absent (e.g. partial) falls back to `correct`
	assert.deepEqual(migrateCheckValue({ correct: true }), {
		correct: true,
		firstTry: true,
	});
});

test('migrateCheckValue: malformed values drop to null', () => {
	assert.equal(migrateCheckValue(false), null);
	assert.equal(migrateCheckValue(0), null);
	assert.equal(migrateCheckValue('x'), null);
	assert.equal(migrateCheckValue(null), null);
});

// firstTryStatsFrom derives the honest overall accuracy.

test('firstTryStatsFrom: counts first-try successes over attempted checks', () => {
	const checks = {
		t: {
			a: { correct: true, firstTry: true },
			b: { correct: true, firstTry: false }, // struggled then got it
		},
		u: { a: { correct: false, firstTry: false } }, // attempted, not yet right
	};
	const s = firstTryStatsFrom(checks);
	assert.equal(s.attempted, 3);
	assert.equal(s.firstTry, 1);
	assert.equal(s.rate, 1 / 3);
});

test('firstTryStatsFrom: empty/absent checks is a clean zero (no divide-by-zero)', () => {
	assert.deepEqual(firstTryStatsFrom({}), {
		attempted: 0,
		firstTry: 0,
		rate: 0,
	});
	assert.deepEqual(firstTryStatsFrom(undefined), {
		attempted: 0,
		firstTry: 0,
		rate: 0,
	});
});
