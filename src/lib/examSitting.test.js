import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILT_TOPICS } from '../data/curriculum.js';
import { EXAM_SETS } from '../data/examSets.js';
import {
	BALANCED_EXAM_PROBLEM_COUNT,
	SECONDS_PER_EXAM_PART,
	aggregateExamByTopic,
	aggregateExamScore,
	buildBalancedExamSets,
	examBudgetSeconds,
	examPartCount,
} from './examSitting.js';

const topics = [
	{ id: 'a1', phase: 'A' },
	{ id: 'a2', phase: 'A' },
	{ id: 'a3', phase: 'A' },
	{ id: 'b1', phase: 'B' },
	{ id: 'b2', phase: 'B' },
	{ id: 'c1', phase: 'C' },
];

const makeSet = (topicId, n, parts = 2) => ({
	id: `${topicId}-${n}`,
	topicId,
	topicName: topicId.toUpperCase(),
	problem: {
		kind: 'problem',
		parts: Array.from({ length: parts }, (_, i) => ({
			id: i,
			kind: 'numeric',
		})),
	},
});

const bank = topics.flatMap(topic => [makeSet(topic.id, 1), makeSet(topic.id, 2)]);

test('balanced sitting is deterministic, immutable, and keeps bank references', () => {
	const before = bank.map(set => set.id);
	const first = buildBalancedExamSets(bank, { topics, seed: 'paper-7', length: 6 });
	const again = buildBalancedExamSets(bank, { topics, seed: 'paper-7', length: 6 });

	assert.deepEqual(
		first.map(set => set.id),
		again.map(set => set.id)
	);
	assert.deepEqual(
		bank.map(set => set.id),
		before
	);
	first.forEach(set => assert.ok(bank.includes(set)));
});

test('one topic per phase is dealt before later rounds can dominate', () => {
	const selected = buildBalancedExamSets(bank, {
		topics,
		seed: 42,
		length: 6,
	});
	const phaseOf = new Map(topics.map(topic => [topic.id, topic.phase]));

	assert.deepEqual(
		new Set(selected.slice(0, 3).map(set => phaseOf.get(set.topicId))),
		new Set(['A', 'B', 'C'])
	);
	assert.equal(new Set(selected.map(set => set.topicId)).size, 6);
});

test('different seeds vary the paper while preserving its size', () => {
	const first = buildBalancedExamSets(bank, { topics, seed: 1, length: 6 });
	const second = buildBalancedExamSets(bank, { topics, seed: 2, length: 6 });
	assert.equal(first.length, 6);
	assert.equal(second.length, 6);
	assert.notDeepEqual(
		first.map(set => set.id),
		second.map(set => set.id)
	);
});

test('requests beyond unique topics fill from the remaining bank without duplicates', () => {
	const selected = buildBalancedExamSets(bank, { topics, seed: 9, length: 10 });
	assert.equal(selected.length, 10);
	assert.equal(new Set(selected.map(set => set.id)).size, 10);
});

test('time budget follows graded parts rather than problem count', () => {
	const run = [makeSet('a1', 1, 1), makeSet('b1', 1, 4)];
	assert.equal(examPartCount(run), 5);
	assert.equal(examBudgetSeconds(run), 5 * SECONDS_PER_EXAM_PART);
});

test('host-graded pair parts receive neither score weight nor exam time', () => {
	const mixed = makeSet('a1', 1, 1);
	mixed.problem.parts.push({ kind: 'pair' });
	const other = makeSet('b1', 1, 1);

	assert.equal(examPartCount([mixed, other]), 2);
	assert.equal(examBudgetSeconds([mixed, other]), 2 * SECONDS_PER_EXAM_PART);
	assert.equal(aggregateExamScore([mixed, other], [1, 0]).ratio, 0.5);
});

test('overall and per-topic scores weight each problem by its part count', () => {
	const run = [makeSet('a1', 1, 1), makeSet('a1', 2, 4)];
	const overall = aggregateExamScore(run, [1, 0]);
	const [topic] = aggregateExamByTopic(run, [1, 0]);

	assert.equal(overall.totalParts, 5);
	assert.equal(overall.earnedParts, 1);
	assert.equal(overall.ratio, 0.2);
	assert.equal(topic.ratio, 0.2);
	assert.equal(topic.problemCount, 2);
});

test('the default sitting length stays intentionally compact', () => {
	const expandedTopics = Array.from({ length: 20 }, (_, i) => ({
		id: `t${i}`,
		phase: `phase-${i % 5}`,
	}));
	const expandedBank = expandedTopics.map(topic => makeSet(topic.id, 1));
	const selected = buildBalancedExamSets(expandedBank, {
		topics: expandedTopics,
		seed: 3,
	});
	assert.equal(selected.length, BALANCED_EXAM_PROBLEM_COUNT);
});

test('the real bank produces a 12-topic paper covering every course phase', () => {
	const selected = buildBalancedExamSets(EXAM_SETS, {
		topics: BUILT_TOPICS,
		seed: 'integration-paper',
	});
	const phaseOf = new Map(BUILT_TOPICS.map(topic => [topic.id, topic.phase]));
	const expectedPhases = new Set(BUILT_TOPICS.map(topic => topic.phase));

	assert.equal(selected.length, BALANCED_EXAM_PROBLEM_COUNT);
	assert.equal(new Set(selected.map(set => set.topicId)).size, selected.length);
	assert.deepEqual(
		new Set(selected.map(set => phaseOf.get(set.topicId))),
		expectedPhases
	);
});
