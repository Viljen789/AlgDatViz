import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRevisionPlan } from './revisionPlan.js';

const topics = [
	{ id: 'a', name: 'A', number: '01', accent: 'var(--topic-a)' },
	{ id: 'b', name: 'B', number: '02', accent: 'var(--topic-b)' },
	{ id: 'c', name: 'C', number: '03', accent: 'var(--topic-c)' },
	{ id: 'd', name: 'D', number: '04', accent: 'var(--topic-d)' },
];

const mastery = {
	a: { score: 0.9, hasData: true }, // strong
	b: { score: 0.3, hasData: true }, // weak
	c: { score: 0.6, hasData: true }, // middling
	// d: no entry ⇒ treated as weakest (score 0)
};

test('buildRevisionPlan: null when there is no usable horizon', () => {
	assert.equal(
		buildRevisionPlan({
			topics,
			mastery,
			daysUntilExam: null,
			today: '2026-06-15',
		}),
		null
	);
	assert.equal(
		buildRevisionPlan({
			topics,
			mastery,
			daysUntilExam: 0,
			today: '2026-06-15',
		}),
		null
	);
	assert.equal(
		buildRevisionPlan({
			topics,
			mastery,
			daysUntilExam: -3,
			today: '2026-06-15',
		}),
		null
	);
});

test('buildRevisionPlan: front-loads the weakest, buckets evenly', () => {
	const plan = buildRevisionPlan({
		topics,
		mastery,
		daysUntilExam: 2,
		today: '2026-06-15',
	});
	assert.equal(plan.topicCount, 4);
	assert.equal(plan.days.length, 2);
	// 4 topics / 2 days ⇒ 2 per day. Weakest first: d(0), b(0.3), c(0.6), a(0.9).
	assert.deepEqual(
		plan.days[0].topics.map(t => t.id),
		['d', 'b']
	);
	assert.deepEqual(
		plan.days[1].topics.map(t => t.id),
		['c', 'a']
	);
	// Day 0's first topic is the very weakest (the no-data topic at score 0).
	assert.equal(plan.days[0].topics[0].id, 'd');
	assert.equal(plan.days[0].topics[0].score, 0);
});

test('buildRevisionPlan: date keys step forward from today', () => {
	const plan = buildRevisionPlan({
		topics,
		mastery,
		daysUntilExam: 3,
		today: '2026-06-29',
	});
	assert.equal(plan.days[0].dateKey, '2026-06-29');
	assert.equal(plan.days[1].dateKey, '2026-06-30');
	// Crosses the month boundary via addDays.
	assert.equal(plan.days[2].dateKey, '2026-07-01');
	assert.deepEqual(
		plan.days.map(d => d.index),
		[0, 1, 2]
	);
});

test('buildRevisionPlan: every topic lands on exactly one day', () => {
	const plan = buildRevisionPlan({
		topics,
		mastery,
		daysUntilExam: 3,
		today: '2026-06-15',
	});
	const placed = plan.days.flatMap(d => d.topics.map(t => t.id));
	assert.equal(placed.length, plan.topicCount);
	assert.deepEqual([...placed].sort(), ['a', 'b', 'c', 'd']);
});

test('buildRevisionPlan: more days than topics leaves later days empty', () => {
	const plan = buildRevisionPlan({
		topics,
		mastery,
		daysUntilExam: 8,
		today: '2026-06-15',
	});
	// 4 topics / 8 days ⇒ ceil = 1 per day; first 4 days filled, rest empty.
	assert.equal(plan.days.length, 8);
	assert.equal(plan.days[0].topics.length, 1);
	assert.equal(plan.days[3].topics.length, 1);
	assert.equal(plan.days[4].topics.length, 0);
	assert.equal(plan.days[7].topics.length, 0);
	const placed = plan.days.flatMap(d => d.topics.map(t => t.id));
	assert.equal(placed.length, 4);
});

test('buildRevisionPlan: carries the display fields per topic', () => {
	const plan = buildRevisionPlan({
		topics,
		mastery,
		daysUntilExam: 1,
		today: '2026-06-15',
	});
	const first = plan.days[0].topics[0];
	assert.deepEqual(Object.keys(first).sort(), [
		'accent',
		'id',
		'name',
		'number',
		'score',
	]);
	assert.equal(first.accent, 'var(--topic-d)');
});
