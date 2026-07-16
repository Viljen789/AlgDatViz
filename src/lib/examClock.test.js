import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	examDeadline,
	examSecondsRemaining,
	hasUnansweredProblems,
} from './examClock.js';

test('deadline countdown follows elapsed wall time, not callback count', () => {
	const deadline = examDeadline(75, 10_000);
	assert.equal(deadline, 85_000);
	assert.equal(examSecondsRemaining(deadline, 10_000), 75);
	assert.equal(examSecondsRemaining(deadline, 55_250), 30);
	// A callback delayed past the deadline expires immediately.
	assert.equal(examSecondsRemaining(deadline, 120_000), 0);
});

test('deadline helpers clamp invalid and exhausted durations', () => {
	assert.equal(examDeadline(-5, 100), 100);
	assert.equal(examDeadline(Number.NaN, 100), 100);
	assert.equal(examSecondsRemaining(100, 100), 0);
	assert.equal(examSecondsRemaining(Number.NaN, 100), 0);
});

test('clock expiry distinguishes a complete final answer from missing work', () => {
	assert.equal(
		hasUnansweredProblems({ a: { status: 'correct' }, b: { status: 'incorrect' } }, 2),
		false
	);
	assert.equal(hasUnansweredProblems({ a: { status: 'correct' } }, 2), true);
});
