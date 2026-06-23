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

test('topicMastery: legacy `true` and a {firstTry:true} record both score 0.5', () => {
	const legacy = topicMastery(groupBankByTopic(bank).t, { t: { a: true } }, {});
	const record = topicMastery(
		groupBankByTopic(bank).t,
		{ t: { a: { correct: true, firstTry: true } } },
		{}
	);
	assert.equal(legacy.score, 0.25); // 0.5 + 0 over two checks
	assert.equal(record.score, 0.25); // identical — tolerant reader
});

test('topicMastery: a struggled-then-correct check scores below a first-try one', () => {
	// firstTry:false ⇒ 0.3 (honest discount), one 0 ⇒ mean 0.15, vs 0.25 for first-try.
	const m = topicMastery(
		groupBankByTopic(bank).t,
		{ t: { a: { correct: true, firstTry: false } } },
		{}
	);
	assert.equal(m.score, 0.15);
	assert.equal(m.answered, 1);
	assert.equal(m.hasData, true);
});

test('topicMastery: an attempted-but-never-correct check scores 0 and is unanswered', () => {
	const m = topicMastery(
		groupBankByTopic(bank).t,
		{ t: { a: { correct: false, firstTry: false } } },
		{}
	);
	assert.equal(m.score, 0);
	assert.equal(m.answered, 0);
	assert.equal(m.hasData, false);
});

test('topicMastery: a maxed SRS card scores full for that check', () => {
	const cards = {
		't:a': { box: MAX_BOX, reps: 5, lapses: 0, last: 0, due: 0 },
	};
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

test('topicMastery: an exam ratio blends evenly with check/card data', () => {
	// Topic t: one correct-but-unscheduled check ⇒ checkCardScore 0.25.
	const checks = { t: { a: true } };
	const m = topicMastery(groupBankByTopic(bank).t, checks, {}, 0.8);
	// 0.5*0.8 + 0.5*0.25 = 0.525
	assert.equal(m.score, 0.525);
	assert.equal(m.hasData, true);
	assert.equal(m.fromExam, true);
	assert.equal(m.total, 2);
});

test('topicMastery: an exam ratio with no check/card data IS the exam ratio', () => {
	// Bank entries exist but none answered ⇒ checkCardScore 0; exam ratio wins.
	const m = topicMastery(groupBankByTopic(bank).t, {}, {}, 0.7);
	assert.equal(m.score, 0.7);
	assert.equal(m.answered, 0);
	assert.equal(m.hasData, true);
	assert.equal(m.fromExam, true);
});

test('topicMastery: an exam-only topic (no bank entries) is the exam ratio', () => {
	const m = topicMastery([], {}, {}, 0.6);
	assert.equal(m.score, 0.6);
	assert.equal(m.total, 0);
	assert.equal(m.answered, 0);
	assert.equal(m.hasData, true);
	assert.equal(m.fromExam, true);
});

test('topicMastery: no entries and no exam ratio is the old empty result', () => {
	const m = topicMastery([], {}, {});
	assert.equal(m.score, 0);
	assert.equal(m.hasData, false);
	assert.equal(m.fromExam, false);
});

test('topicMastery: omitting examRatio is identical to the old behavior', () => {
	const checks = { t: { a: true } };
	const m = topicMastery(groupBankByTopic(bank).t, checks, {});
	assert.equal(m.score, 0.25);
	assert.equal(m.answered, 1);
	assert.equal(m.hasData, true);
	assert.equal(m.fromExam, false);
});

test('allMastery: examScores fold in and emit exam-only topics', () => {
	const m = allMastery({
		bank,
		checks: { u: { a: true } },
		cards: {},
		examScores: { u: 0.2, graphs: 0.9 },
	});
	// u has both: 0.5*0.2 + 0.5*0.5 = 0.35, flagged fromExam.
	assert.equal(m.u.score, 0.35);
	assert.equal(m.u.fromExam, true);
	// t had no exam ratio ⇒ unchanged.
	assert.equal(m.t.score, 0);
	assert.equal(m.t.fromExam, false);
	// graphs has no bank entry but an exam ratio ⇒ emitted as exam-only.
	assert.equal(m.graphs.score, 0.9);
	assert.equal(m.graphs.total, 0);
	assert.equal(m.graphs.hasData, true);
	assert.equal(m.graphs.fromExam, true);
	assert.equal(Object.keys(m).length, 3);
});

test('allMastery: absent examScores is identical to the old result', () => {
	const without = allMastery({ bank, checks: { u: { a: true } }, cards: {} });
	const withEmpty = allMastery({
		bank,
		checks: { u: { a: true } },
		cards: {},
		examScores: {},
	});
	assert.deepEqual(withEmpty, without);
	assert.equal(without.u.score, 0.5);
	assert.equal(without.t.score, 0);
	assert.equal(Object.keys(without).length, 2);
});
