import assert from 'node:assert/strict';
import test from 'node:test';

import {
	REVIEW_BANK,
	REVIEW_TOPIC_IDS,
	SELF_GRADED_KINDS,
	accentTokens,
	buildReviewBank,
	buildTopicQueue,
	isSelfGraded,
	sampleSession,
	shuffleWithSeed,
	topicBankSlice,
} from './reviewBank.js';
import { DAY_MS } from './srsSchedule.js';
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
	assert.deepEqual(
		list,
		Array.from({ length: 25 }, (_, i) => i),
		'input intact'
	);
	// It is a permutation (same multiset of elements).
	assert.deepEqual(
		[...a].sort((x, y) => x - y),
		list
	);
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
	assert.equal(
		new Set(sessionIds).size,
		sessionIds.length,
		'no dupes in a session'
	);
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

// ── Per-topic drill queue (revision plan → scoped retrieval) ───────────────────

// A small two-topic bank fixture; the real bank is exercised separately below.
const drillBank = [
	{ id: 'a:1', topicId: 'a' },
	{ id: 'a:2', topicId: 'a' },
	{ id: 'a:3', topicId: 'a' },
	{ id: 'b:1', topicId: 'b' },
];

test('topicBankSlice keeps only one topic, in order, without mutating the bank', () => {
	const slice = topicBankSlice('a', drillBank);
	assert.deepEqual(
		slice.map(e => e.id),
		['a:1', 'a:2', 'a:3']
	);
	// A view, not a mutation: the source bank is untouched.
	assert.equal(drillBank.length, 4);
	assert.deepEqual(topicBankSlice('zzz', drillBank), []);
	assert.deepEqual(topicBankSlice('a', null), []);
});

test('buildTopicQueue scopes the queue to the topic and reports availability', () => {
	const q = buildTopicQueue({
		topicId: 'a',
		cards: {},
		now: 0,
		bank: drillBank,
	});
	// available = every bank entry for the topic; the queue is a subset of those.
	assert.equal(q.available, 3);
	assert.ok(
		q.queue.every(e => e.topicId === 'a'),
		'no foreign-topic question leaks into the drill'
	);
	assert.ok(!q.queue.some(e => e.id === 'b:1'), 'topic b is excluded entirely');
});

test('buildTopicQueue lists due cards first (most overdue first), then fresh', () => {
	const now = 10 * DAY_MS;
	const cards = {
		'a:1': { box: 1, reps: 1, lapses: 0, last: 0, due: 9 * DAY_MS }, // due, less overdue
		'a:2': { box: 2, reps: 1, lapses: 0, last: 0, due: 2 * DAY_MS }, // due, most overdue
		// a:3 has no card ⇒ fresh, trails the due cards.
	};
	const q = buildTopicQueue({ topicId: 'a', cards, now, bank: drillBank });
	assert.equal(q.dueCount, 2);
	assert.equal(q.freshCount, 1);
	assert.deepEqual(
		q.queue.map(e => e.id),
		['a:2', 'a:1', 'a:3'],
		'most-overdue due card first, then the remaining due, then fresh'
	);
});

test('buildTopicQueue admits fresh cards with NO visited gate (the click is the intent)', () => {
	// Unlike /review, a plan-day drill has no isNewEligible gate: clicking the day
	// scopes intent to this topic, so all its never-seen cards are fair game.
	const q = buildTopicQueue({
		topicId: 'a',
		cards: {},
		now: 0,
		bank: drillBank,
	});
	assert.equal(q.dueCount, 0);
	assert.equal(q.freshCount, 3, 'every fresh card in the topic is eligible');
	assert.equal(q.queue.length, 3);
});

test('buildTopicQueue honours the new-card cap', () => {
	const many = Array.from({ length: 12 }, (_, i) => ({
		id: `a:${i}`,
		topicId: 'a',
	}));
	const q = buildTopicQueue({
		topicId: 'a',
		cards: {},
		now: 0,
		newCap: 4,
		bank: many,
	});
	assert.equal(q.freshCount, 4, 'capped at newCap');
	assert.equal(q.freshAvailable, 12, 'but reports how many were available');
	assert.equal(q.available, 12);
	assert.equal(q.queue.length, 4);
});

test('buildTopicQueue is empty and safe for a topic with no bank entries', () => {
	const q = buildTopicQueue({ topicId: 'nope', cards: {}, now: 0 });
	assert.equal(q.available, 0);
	assert.deepEqual(q.queue, []);
	assert.equal(q.dueCount, 0);
	assert.equal(q.freshCount, 0);
});

test('buildTopicQueue against the real bank yields only that topic, gradeable', () => {
	const topicId = REVIEW_TOPIC_IDS[0];
	const q = buildTopicQueue({ topicId, cards: {}, now: 0 });
	assert.ok(q.available > 0, `the bank has ${topicId} questions to drill`);
	assert.ok(q.queue.length > 0, 'a fresh schedule yields a non-empty drill');
	for (const entry of q.queue) {
		assert.equal(entry.topicId, topicId, 'scoped to the chosen topic');
		// Each drawn entry grades through the same pure core as /review.
		assert.equal(typeof checkAnswer(entry.check, undefined).correct, 'boolean');
	}
});
