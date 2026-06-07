import assert from 'node:assert/strict';
import test from 'node:test';

import {
	REVIEW_BANK,
	REVIEW_TOPIC_IDS,
	SELF_GRADED_KINDS,
	accentTokens,
	buildReviewBank,
	isSelfGraded,
	sampleSession,
	shuffleWithSeed,
} from './reviewBank.js';
import { checkAnswer } from '../../common/TopicTemplate/checkAnswer.js';
import { TOPIC_BY_ID } from '../../data/curriculum.js';

// ── The bank itself ──────────────────────────────────────────────────────────

test('bank is non-empty and spans multiple topics', () => {
	assert.ok(REVIEW_BANK.length > 0, 'bank has questions');
	assert.ok(
		REVIEW_TOPIC_IDS.length >= 5,
		`bank should cover many topics (got ${REVIEW_TOPIC_IDS.length})`
	);
});

test('every entry has a gradeable, self-graded check and a real topic tag', () => {
	for (const entry of REVIEW_BANK) {
		// Topic tag resolves to a real curriculum node.
		const topic = TOPIC_BY_ID[entry.topicId];
		assert.ok(topic, `topicId resolves: ${entry.topicId}`);
		assert.equal(entry.topicName, topic.name);
		assert.equal(entry.to, topic.to);
		assert.equal(entry.accent, topic.accent);

		// Stable, namespaced id.
		assert.equal(entry.id, `${entry.topicId}:${entry.sceneId}`);

		// The check is present, self-graded, and produces a boolean from the pure
		// grader (never the null that pair/unknown kinds return).
		assert.ok(entry.check, `entry ${entry.id} has a check`);
		assert.ok(
			isSelfGraded(entry.check),
			`entry ${entry.id} is self-graded (${entry.check.kind})`
		);
		const graded = checkAnswer(entry.check, undefined);
		assert.equal(
			typeof graded.correct,
			'boolean',
			`entry ${entry.id} grades to a boolean`
		);
	}
});

test('bank excludes the host-graded pair kind entirely', () => {
	assert.ok(!SELF_GRADED_KINDS.has('pair'), 'pair is not self-graded');
	assert.equal(
		REVIEW_BANK.filter(e => e.check.kind === 'pair').length,
		0,
		'no pair entries leaked into the bank'
	);
});

test('the known pair scene (merge-sort "array") is excluded but its siblings are kept', () => {
	// MergeSortLesson scene "array" is kind:'pair' (host-graded) and must be
	// dropped; the rest of merge-sort's self-graded checks must survive.
	assert.equal(
		REVIEW_BANK.some(e => e.id === 'sorting:array'),
		false,
		'the pair scene is excluded'
	);
	assert.ok(
		REVIEW_BANK.some(e => e.id === 'sorting:recurrence'),
		'a self-graded sorting check survives'
	);
});

test('entry ids are unique', () => {
	const ids = REVIEW_BANK.map(e => e.id);
	assert.equal(new Set(ids).size, ids.length, 'no duplicate entry ids');
});

test('buildReviewBank is pure — repeated calls match the cached bank by value', () => {
	const a = buildReviewBank();
	const b = buildReviewBank();
	assert.deepEqual(
		a.map(e => e.id),
		b.map(e => e.id)
	);
	assert.deepEqual(
		a.map(e => e.id),
		REVIEW_BANK.map(e => e.id)
	);
});

// ── Shuffler determinism ──────────────────────────────────────────────────────

test('shuffleWithSeed is deterministic for a given seed and pure', () => {
	const list = Array.from({ length: 25 }, (_, i) => i);
	const a = shuffleWithSeed(list, 42);
	const b = shuffleWithSeed(list, 42);
	assert.deepEqual(a, b, 'same seed → same order');
	assert.deepEqual(list, Array.from({ length: 25 }, (_, i) => i), 'input intact');
	// It is a permutation (same multiset of elements).
	assert.deepEqual([...a].sort((x, y) => x - y), list);
});

test('shuffleWithSeed varies with the seed (and accepts string seeds)', () => {
	const list = Array.from({ length: 25 }, (_, i) => i);
	const a = shuffleWithSeed(list, 1);
	const b = shuffleWithSeed(list, 2);
	assert.notDeepEqual(a, b, 'different seeds → different order');
	const s = shuffleWithSeed(list, 'exam-1');
	assert.deepEqual(s, shuffleWithSeed(list, 'exam-1'), 'string seed stable');
});

// ── Session sampling ──────────────────────────────────────────────────────────

test('sampleSession is deterministic given a seed', () => {
	const a = sampleSession({ count: 10, seed: 7 });
	const b = sampleSession({ count: 10, seed: 7 });
	assert.deepEqual(
		a.map(e => e.id),
		b.map(e => e.id),
		'same seed → same session'
	);
});

test('sampleSession returns count questions and covers multiple topics', () => {
	const session = sampleSession({ count: 10, seed: 3 });
	assert.equal(session.length, 10, 'returns the requested count');
	const topics = new Set(session.map(e => e.topicId));
	assert.ok(
		topics.size >= 5,
		`a 10-question session spans many topics (got ${topics.size})`
	);
	// All entries are real bank entries (no fabrication).
	const ids = new Set(REVIEW_BANK.map(e => e.id));
	for (const e of session) assert.ok(ids.has(e.id), `${e.id} is a bank entry`);
	// No duplicate questions within one session.
	const sessionIds = session.map(e => e.id);
	assert.equal(new Set(sessionIds).size, sessionIds.length, 'no dupes in a session');
});

test('sampleSession round-robins so a short session maximizes topic spread', () => {
	// With at least N topics, an N-question session should hit N distinct topics.
	const n = Math.min(REVIEW_TOPIC_IDS.length, 8);
	const session = sampleSession({ count: n, seed: 11 });
	assert.equal(session.length, n);
	assert.equal(
		new Set(session.map(e => e.topicId)).size,
		n,
		'one question per topic until count is reached'
	);
});

test('sampleSession is bounded and safe at the edges', () => {
	assert.deepEqual(sampleSession({ count: 0, seed: 1 }), []);
	assert.deepEqual(sampleSession({ bank: [], count: 5 }), []);
	const huge = sampleSession({ count: 9999, seed: 1 });
	assert.equal(huge.length, REVIEW_BANK.length, 'never exceeds the bank size');
});

// ── Accent token derivation ───────────────────────────────────────────────────

test('accentTokens derives the AA-safe ink + contrast partners from a topic hue', () => {
	const t = accentTokens('var(--topic-heaps)');
	assert.equal(t.accent, 'var(--topic-heaps)');
	assert.equal(t.ink, 'var(--topic-heaps-ink)');
	assert.equal(t.contrast, 'var(--topic-heaps-contrast)');
});

test('accentTokens falls back to theme-neutral tokens for a non-topic accent', () => {
	const t = accentTokens('#bada55');
	assert.equal(t.accent, '#bada55');
	assert.equal(t.ink, 'var(--topic-accent-ink)');
	assert.equal(t.contrast, 'var(--color-text-on-accent)');
	// And degrades safely with no input.
	assert.equal(accentTokens().accent, 'var(--color-accent-blue)');
});

test('every bank entry accent resolves to topic ink/contrast tokens', () => {
	for (const entry of REVIEW_BANK) {
		const t = accentTokens(entry.accent);
		assert.match(t.ink, /^var\(--topic-[a-z0-9]+-ink\)$/);
		assert.match(t.contrast, /^var\(--topic-[a-z0-9]+-contrast\)$/);
	}
});
