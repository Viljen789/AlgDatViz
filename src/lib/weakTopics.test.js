import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankWeakTopics, WEAK_THRESHOLD } from './weakTopics.js';

const topics = [
	{ id: 'a', name: 'A' },
	{ id: 'b', name: 'B' },
	{ id: 'c', name: 'C' },
	{ id: 'd', name: 'D' },
];

const mastery = {
	a: { score: 0.2, hasData: true }, // weak
	b: { score: 0.55, hasData: true }, // weak (below 0.6)
	c: { score: 0.9, hasData: true }, // solid
	d: { score: 0.1, hasData: false }, // not started ⇒ not "weak"
};

test('WEAK_THRESHOLD is the single unified cutoff', () => {
	assert.equal(WEAK_THRESHOLD, 0.6);
});

test('rankWeakTopics: only topics with data below threshold, weakest first', () => {
	const weak = rankWeakTopics({ topics, mastery });
	assert.deepEqual(
		weak.map(t => t.id),
		['a', 'b']
	);
	// score is attached to each item.
	assert.equal(weak[0].score, 0.2);
	assert.equal(weak[1].score, 0.55);
	// the original topic fields survive.
	assert.equal(weak[0].name, 'A');
});

test('rankWeakTopics: a topic without data is excluded even at score 0', () => {
	const weak = rankWeakTopics({ topics, mastery });
	assert.equal(
		weak.find(t => t.id === 'd'),
		undefined
	);
});

test('rankWeakTopics: a custom threshold widens or narrows the set', () => {
	const weak = rankWeakTopics({ topics, mastery, threshold: 0.95 });
	assert.deepEqual(
		weak.map(t => t.id),
		['a', 'b', 'c']
	);
});

test('rankWeakTopics: limit keeps the weakest N', () => {
	const weak = rankWeakTopics({ topics, mastery, limit: 1 });
	assert.deepEqual(
		weak.map(t => t.id),
		['a']
	);
});

test('rankWeakTopics: empty / missing inputs are safe', () => {
	assert.deepEqual(rankWeakTopics({}), []);
	assert.deepEqual(rankWeakTopics({ topics: [], mastery: {} }), []);
	assert.deepEqual(rankWeakTopics(), []);
});
