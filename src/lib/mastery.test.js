import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_BOX } from '../components/Review/srsSchedule.js';
import { allMastery, groupBankByTopic, topicMastery } from './mastery.js';

const bank = [
	{ id: 't:a', topicId: 't', sceneId: 'a' },
	{ id: 't:b', topicId: 't', sceneId: 'b' },
	{ id: 'u:a', topicId: 'u', sceneId: 'a' },
];

test('groupBankByTopic splits a flat bank by topic', () => {
	const g = groupBankByTopic(bank);
	assert.equal(g.t.length, 2);
	assert.equal(g.u.length, 1);
});

test('topicMastery: unseen scores 0', () => {
	const m = topicMastery(groupBankByTopic(bank).t, {}, {});
	assert.equal(m.score, 0);
	assert.equal(m.answered, 0);
	assert.equal(m.hasData, false);
});

test('topicMastery: a correct-but-unscheduled check is 0.5', () => {
	const checks = { t: { a: true } };
	const m = topicMastery(groupBankByTopic(bank).t, checks, {});
	// one check at 0.5, one at 0 → mean 0.25 over two
	assert.equal(m.score, 0.25);
	assert.equal(m.answered, 1);
	assert.equal(m.hasData, true);
});

test('topicMastery: a maxed SRS card scores full for that check', () => {
	const cards = { 't:a': { box: MAX_BOX, reps: 5, lapses: 0, last: 0, due: 0 } };
	const m = topicMastery(groupBankByTopic(bank).t, {}, cards);
	// one check at 1.0, one at 0 → mean 0.5
	assert.equal(m.score, 0.5);
	assert.equal(m.answered, 1);
});

test('allMastery returns a score per topic in the bank', () => {
	const m = allMastery({ bank, checks: { u: { a: true } }, cards: {} });
	assert.equal(m.u.score, 0.5);
	assert.equal(m.t.score, 0);
	assert.equal(Object.keys(m).length, 2);
});
