import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	BOX_INTERVALS_DAYS,
	DAY_MS,
	MAX_BOX,
	forecastDue,
	gradeCard,
	initialCard,
	planSession,
	seedCard,
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
	assert.deepEqual(
		plan.queue.map(e => e.id),
		['a:1', 'b:1']
	);
	assert.equal(plan.scheduledCount, 2);
});

// ── seedCard: in-lesson first answer enters spaced repetition (retrieval leak) ──

test('seedCard first-correct enters a future-due card (matches a first review success)', () => {
	const now = 1_000_000;
	const card = seedCard(undefined, true, now);
	// Identical to grading a fresh card correctly at /review: box 1, due +1 day.
	assert.deepEqual(card, gradeCard(undefined, true, now));
	assert.equal(card.box, 1);
	assert.equal(card.reps, 1);
	assert.equal(card.lapses, 0);
	assert.equal(card.due, now + BOX_INTERVALS_DAYS[1] * DAY_MS);
	assert.ok(
		card.due > now,
		'a correct first answer is scheduled for the future'
	);
});

test('seedCard first-incorrect enters a soon-due lapse (box 0, due now)', () => {
	const now = 2_000_000;
	const card = seedCard(undefined, false, now);
	assert.deepEqual(card, gradeCard(undefined, false, now));
	assert.equal(card.box, 0);
	assert.equal(card.lapses, 1);
	assert.equal(card.due, now); // interval 0 ⇒ due immediately for desirable difficulty
});

test('seedCard is idempotent: an existing card is never re-graded', () => {
	const now = 3_000_000;
	const existing = seedCard(undefined, true, now); // first answer → box 1
	// A second answer on the same scroll (or a re-scroll) must NOT advance the box.
	const reCorrect = seedCard(existing, true, now + 5 * DAY_MS);
	assert.strictEqual(
		reCorrect,
		existing,
		'returns the same card reference unchanged'
	);
	assert.equal(reCorrect.box, 1, 'box did not inflate on re-answer');
	// Even a later wrong re-answer is a no-op in-lesson (schedule advances at /review).
	const reWrong = seedCard(existing, false, now + 9 * DAY_MS);
	assert.strictEqual(reWrong, existing);
	assert.equal(
		reWrong.lapses,
		0,
		'no lapse recorded for an in-lesson re-answer'
	);
});

test('seedCard then a real review grade still advances the same card', () => {
	const now = 4_000_000;
	const seeded = seedCard(undefined, true, now); // box 1 from in-lesson
	// /review later grades the (now-existing) card via gradeCard — box advances.
	const reviewed = gradeCard(seeded, true, now + 2 * DAY_MS);
	assert.equal(
		reviewed.box,
		2,
		'a /review success after seeding promotes normally'
	);
});

test('planSession surfaces a seeded card as due once its interval elapses', () => {
	const now = 0;
	const entry = { id: 'foundations:s1', topicId: 'foundations' };
	// First-incorrect in-lesson → box 0, due now ⇒ shows up immediately at /review.
	const lapse = seedCard(undefined, false, now);
	const planNow = planSession({ [entry.id]: lapse }, [entry], { now });
	assert.equal(planNow.dueCount, 1);
	assert.deepEqual(
		planNow.queue.map(e => e.id),
		[entry.id]
	);

	// First-correct in-lesson → due +1 day: not due now, but due after the interval.
	const success = seedCard(undefined, true, now);
	assert.equal(
		planSession({ [entry.id]: success }, [entry], { now }).dueCount,
		0
	);
	assert.equal(
		planSession({ [entry.id]: success }, [entry], { now: now + DAY_MS })
			.dueCount,
		1
	);
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

// ── forecastDue: when work returns, so a caught-up student has a reason to come back ──

test('forecastDue with an empty schedule has no future due (nextDueMs null)', () => {
	const now = 10 * DAY_MS;
	const candidates = [
		{ id: 'a:1', topicId: 'a' },
		{ id: 'b:1', topicId: 'b' },
	];
	const f = forecastDue({}, candidates, { now });
	assert.equal(f.dueToday, 0);
	assert.deepEqual(f.byDay, []);
	assert.equal(f.nextDueMs, null);
});

test('forecastDue buckets a card due tomorrow into byDay offset 1, count 1', () => {
	const now = 10 * DAY_MS;
	const candidates = [{ id: 'mst:1', topicId: 'mst' }];
	const cards = {
		'mst:1': { box: 1, reps: 1, lapses: 0, last: now, due: now + DAY_MS },
	};
	const f = forecastDue(cards, candidates, { now });
	assert.equal(f.dueToday, 0);
	assert.equal(f.byDay.length, 1);
	assert.deepEqual(f.byDay[0], {
		offset: 1,
		dateMs: now + DAY_MS,
		count: 1,
		topicIds: ['mst'],
	});
	assert.equal(f.nextDueMs, now + DAY_MS);
});

test('forecastDue keeps a past-due card in dueToday, never double-counted in the forecast', () => {
	const now = 10 * DAY_MS;
	const candidates = [
		{ id: 'a:1', topicId: 'a' }, // overdue
		{ id: 'b:1', topicId: 'b' }, // due tomorrow
	];
	const cards = {
		'a:1': { box: 1, reps: 1, lapses: 0, last: 0, due: 9 * DAY_MS }, // due <= now
		'b:1': { box: 2, reps: 1, lapses: 0, last: now, due: now + DAY_MS },
	};
	const f = forecastDue(cards, candidates, { now });
	assert.equal(f.dueToday, 1);
	// The overdue card never appears in byDay; only the future card does.
	assert.equal(f.byDay.length, 1);
	assert.equal(f.byDay[0].offset, 1);
	assert.equal(f.byDay[0].count, 1);
	assert.deepEqual(f.byDay[0].topicIds, ['b']);
	assert.equal(f.nextDueMs, now + DAY_MS); // the future card, not the overdue one
});

test('forecastDue tracks the soonest future due and drops cards past the horizon', () => {
	const now = 0;
	const candidates = [
		{ id: 'a:1', topicId: 'a' }, // due in 2 days
		{ id: 'a:2', topicId: 'a' }, // due in 2 days (same bucket, same topic)
		{ id: 'b:1', topicId: 'b' }, // due in 9 days — beyond a 3-day horizon
	];
	const cards = {
		'a:1': { box: 2, reps: 1, lapses: 0, last: 0, due: 2 * DAY_MS },
		'a:2': { box: 2, reps: 1, lapses: 0, last: 0, due: 2 * DAY_MS },
		'b:1': { box: 4, reps: 1, lapses: 0, last: 0, due: 9 * DAY_MS },
	};
	const f = forecastDue(cards, candidates, { now, horizonDays: 3 });
	assert.equal(f.byDay.length, 1); // only the day-2 bucket is inside the horizon
	assert.equal(f.byDay[0].offset, 2);
	assert.equal(f.byDay[0].count, 2);
	assert.deepEqual(f.byDay[0].topicIds, ['a']); // de-duplicated topic ids
	// nextDueMs still reflects the soonest, even when a later card is out of range.
	assert.equal(f.nextDueMs, 2 * DAY_MS);
});
