import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	addDays,
	computeStreak,
	daysUntil,
	examNewCap,
	DAILY_GOAL,
} from './activityLog.js';

// These selectors all take today/now explicitly, so they're pure and testable
// without touching localStorage or the system clock.

test('addDays steps a key forward and back across a month boundary', () => {
	assert.equal(addDays('2026-06-30', 1), '2026-07-01');
	assert.equal(addDays('2026-07-01', -1), '2026-06-30');
	assert.equal(addDays('2026-06-15', 0), '2026-06-15');
	// across a year boundary too
	assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('computeStreak: counts consecutive active days up to today', () => {
	const days = {
		'2026-06-13': 2,
		'2026-06-14': 5,
		'2026-06-15': 1,
	};
	const { current, longest } = computeStreak(days, '2026-06-15');
	assert.equal(current, 3);
	assert.equal(longest, 3);
});

test('computeStreak: an empty today still counts the run up to yesterday', () => {
	// Today has no activity yet; the streak should survive (count to yesterday)
	// rather than read as already broken mid-day.
	const days = {
		'2026-06-13': 1,
		'2026-06-14': 1,
	};
	const { current } = computeStreak(days, '2026-06-15');
	assert.equal(current, 2);
});

test('computeStreak: a whole missed day breaks the current run', () => {
	// 06-14 is missing, so neither today nor yesterday is active ⇒ current 0.
	const days = {
		'2026-06-11': 1,
		'2026-06-12': 1,
		'2026-06-13': 1,
	};
	const { current } = computeStreak(days, '2026-06-15');
	assert.equal(current, 0);
});

test('computeStreak: longest can exceed the current run', () => {
	const days = {
		// a 4-day run that already ended
		'2026-06-01': 1,
		'2026-06-02': 1,
		'2026-06-03': 1,
		'2026-06-04': 1,
		// a fresh 2-day run ending today
		'2026-06-14': 1,
		'2026-06-15': 1,
	};
	const { current, longest } = computeStreak(days, '2026-06-15');
	assert.equal(current, 2);
	assert.equal(longest, 4);
});

test('computeStreak: empty input is zero/zero', () => {
	assert.deepEqual(computeStreak({}, '2026-06-15'), { current: 0, longest: 0 });
	assert.deepEqual(computeStreak(undefined, '2026-06-15'), {
		current: 0,
		longest: 0,
	});
});

test('daysUntil: 0 on exam day, negative when past, null when unset', () => {
	assert.equal(daysUntil('2026-06-15', '2026-06-15'), 0);
	assert.equal(daysUntil('2026-06-20', '2026-06-15'), 5);
	assert.equal(daysUntil('2026-06-10', '2026-06-15'), -5);
	assert.equal(daysUntil(null, '2026-06-15'), null);
	assert.equal(daysUntil('', '2026-06-15'), null);
});

test('examNewCap: ramps up as the exam approaches', () => {
	// Far out (or unset) ⇒ the base goal.
	assert.equal(examNewCap(null), DAILY_GOAL);
	assert.equal(examNewCap(30), DAILY_GOAL);
	// Just over two weeks out is still base; at/within 14 days it ramps to 1.5x.
	assert.equal(examNewCap(15), DAILY_GOAL);
	assert.equal(examNewCap(14), Math.round(DAILY_GOAL * 1.5));
	assert.equal(examNewCap(13), Math.round(DAILY_GOAL * 1.5));
	// At the 3-day threshold it doubles.
	assert.equal(examNewCap(3), DAILY_GOAL * 2);
	assert.equal(examNewCap(1), DAILY_GOAL * 2);
	assert.equal(examNewCap(0), DAILY_GOAL * 2);
});

test('examNewCap: honors a custom base', () => {
	assert.equal(examNewCap(30, 10), 10);
	assert.equal(examNewCap(2, 10), 20);
	assert.equal(examNewCap(10, 10), 15);
});
