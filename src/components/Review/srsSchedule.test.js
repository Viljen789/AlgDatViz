import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	BOX_INTERVALS_DAYS,
	DAY_MS,
	MAX_BOX,
	gradeCard,
	initialCard,
	planSession,
} from './srsSchedule.js';

test('gradeCard promotes a box and pushes the due date out on correct', () => {
	const now = 1_000_000;
	const c1 = gradeCard(undefined, true, now);
	assert.equal(c1.box, 1);
	assert.equal(c1.reps, 1);
	assert.equal(c1.lapses, 0);
	assert.equal(c1.due, now + BOX_INTERVALS_DAYS[1] * DAY_MS);

	const c2 = gradeCard(c1, true, now);
	assert.equal(c2.box, 2);
	assert.equal(c2.due, now + BOX_INTERVALS_DAYS[2] * DAY_MS);
});

test('gradeCard resets to box 0 (due now) and counts a lapse on wrong', () => {
	const now = 5_000_000;
	const seeded = { box: 3, reps: 3, lapses: 0, last: 0, due: 0 };
	const after = gradeCard(seeded, false, now);
	assert.equal(after.box, 0);
	assert.equal(after.lapses, 1);
	assert.equal(after.due, now); // interval 0 ⇒ due immediately
});

test('gradeCard never exceeds MAX_BOX', () => {
	let card = initialCard();
	for (let i = 0; i < 20; i += 1) card = gradeCard(card, true, 0);
	assert.equal(card.box, MAX_BOX);
});

test('planSession lists overdue first, then caps new by eligibility', () => {
	const now = 10 * DAY_MS;
	const candidates = [
		{ id: 'a:1', topicId: 'a' },
		{ id: 'a:2', topicId: 'a' },
		{ id: 'b:1', topicId: 'b' }, // new, eligible (a & b visited)
		{ id: 'c:1', topicId: 'c' }, // new, NOT eligible (c not visited)
	];
	const cards = {
		'a:1': { box: 1, reps: 1, lapses: 0, last: 0, due: 9 * DAY_MS }, // overdue
		'a:2': { box: 2, reps: 1, lapses: 0, last: 0, due: 50 * DAY_MS }, // not due
	};
	const visited = new Set(['a', 'b']);
	const plan = planSession(cards, candidates, {
		now,
		newCap: 5,
		isNewEligible: e => visited.has(e.topicId),
	});
	assert.equal(plan.dueCount, 1);
	assert.equal(plan.freshCount, 1); // only b:1 — c:1 is ineligible
	assert.deepEqual(plan.queue.map(e => e.id), ['a:1', 'b:1']);
	assert.equal(plan.scheduledCount, 2);
});

test('planSession honours the new-card cap', () => {
	const candidates = Array.from({ length: 20 }, (_, i) => ({
		id: `t:${i}`,
		topicId: 't',
	}));
	const plan = planSession({}, candidates, { now: 0, newCap: 6 });
	assert.equal(plan.freshCount, 6);
	assert.equal(plan.freshAvailable, 20);
	assert.equal(plan.queue.length, 6);
});
