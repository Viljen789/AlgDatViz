import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFractionalKnapsackFrames } from './fractionalKnapsackFrames.js';
import { buildKnapsack01Frames } from './knapsack01Frames.js';
import { FRACTIONAL_KNAPSACK_PSEUDO } from './strategiesMeta.js';

const assertConformant = frame => {
	assert.equal(typeof frame.line, 'number', 'line is a number');
	assert.ok(
		frame.line >= 0 && frame.line < FRACTIONAL_KNAPSACK_PSEUDO.length,
		`line ${frame.line} is valid`
	);
	assert.ok(Array.isArray(frame.state), 'state is an array');
	assert.ok(frame.state.length > 0, 'state has rows');
	for (const row of frame.state) {
		assert.equal(typeof row.label, 'string');
		assert.ok('value' in row);
	}
};

// CLRS §15.2 instance: capacity 50.
const CLRS = [
	{ name: '1', weight: 10, value: 60 }, // ratio 6
	{ name: '2', weight: 20, value: 100 }, // ratio 5
	{ name: '3', weight: 30, value: 120 }, // ratio 4
];

test('buildFractionalKnapsackFrames — every frame conforms to the contract', () => {
	const { frames } = buildFractionalKnapsackFrames({ items: CLRS, capacity: 50 });
	assert.ok(frames.length > 0);
	for (const frame of frames) assertConformant(frame);
});

test('buildFractionalKnapsackFrames — CLRS optimum is 240', () => {
	// Take item1 (60) + item2 (100) + 2/3 of item3 (80) = 240.
	const { summary } = buildFractionalKnapsackFrames({ items: CLRS, capacity: 50 });
	assert.equal(summary.total, 240, 'optimal fractional value 240');
	assert.equal(summary.usedWeight, 50, 'bag is exactly full');
});

test('buildFractionalKnapsackFrames — exactly one fractional item, rest whole', () => {
	const { summary } = buildFractionalKnapsackFrames({ items: CLRS, capacity: 50 });
	const fracs = summary.states.filter(s => s.status === 'fraction');
	assert.equal(fracs.length, 1, 'one split item');
	assert.ok(fracs[0].fraction > 0 && fracs[0].fraction < 1, 'a real fraction');
});

test('buildFractionalKnapsackFrames — items are processed in density order', () => {
	const { summary } = buildFractionalKnapsackFrames({
		items: [
			{ name: 'lo', weight: 10, value: 10 }, // ratio 1
			{ name: 'hi', weight: 10, value: 50 }, // ratio 5
		],
		capacity: 10,
	});
	assert.equal(summary.sorted[0].name, 'hi', 'densest first');
	assert.equal(summary.total, 50, 'take the dense one whole');
});

test('fractional ≥ 0/1 on the same instance (greedy gains from splitting)', () => {
	const items = [
		{ name: 'P', weight: 1, value: 2 },
		{ name: 'Q', weight: 4, value: 7 },
	];
	const frac = buildFractionalKnapsackFrames({ items, capacity: 4 }).summary.total;
	const binary = buildKnapsack01Frames({ items, capacity: 4 }).summary.best;
	assert.ok(frac >= binary, `fractional ${frac} ≥ 0/1 ${binary}`);
});
