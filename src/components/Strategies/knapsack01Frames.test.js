import assert from 'node:assert/strict';
import test from 'node:test';
import { buildKnapsack01Frames } from './knapsack01Frames.js';
import { KNAPSACK01_PSEUDO } from './strategiesMeta.js';

const assertConformant = frame => {
	assert.equal(typeof frame.line, 'number', 'line is a number');
	assert.ok(
		frame.line >= 0 && frame.line < KNAPSACK01_PSEUDO.length,
		`line ${frame.line} is a valid index into KNAPSACK01_PSEUDO`
	);
	assert.ok(Array.isArray(frame.state), 'state is an array');
	assert.ok(frame.state.length > 0, 'state has at least one row');
	for (const row of frame.state) {
		assert.equal(typeof row.label, 'string', 'row has a string label');
		assert.ok('value' in row, 'row has a value');
	}
};

// Classic small instance: capacity 10.
const ITEMS = [
	{ name: 'A', weight: 5, value: 10 },
	{ name: 'B', weight: 4, value: 40 },
	{ name: 'C', weight: 6, value: 30 },
	{ name: 'D', weight: 3, value: 50 },
];

test('buildKnapsack01Frames — every frame conforms to the contract', () => {
	const { frames } = buildKnapsack01Frames({ items: ITEMS, capacity: 10 });
	assert.ok(frames.length > 0);
	for (const frame of frames) assertConformant(frame);
});

test('buildKnapsack01Frames — optimum is value 90 (B + D)', () => {
	// B(4,40) + D(3,50) = weight 7 ≤ 10, value 90 — the best achievable.
	const { summary } = buildKnapsack01Frames({ items: ITEMS, capacity: 10 });
	assert.equal(summary.best, 90, 'optimal value 90');
	assert.deepEqual([...summary.chosenNames].sort(), ['B', 'D']);
	assert.ok(summary.usedWeight <= 10, 'within capacity');
});

test('buildKnapsack01Frames — chosen items realise the optimum and fit', () => {
	const { summary } = buildKnapsack01Frames({ items: ITEMS, capacity: 10 });
	const v = summary.chosen.reduce((acc, idx) => acc + ITEMS[idx].value, 0);
	const w = summary.chosen.reduce((acc, idx) => acc + ITEMS[idx].weight, 0);
	assert.equal(v, summary.best, 'chosen value = dp[n][W]');
	assert.ok(w <= 10, 'chosen weight within capacity');
});

test('buildKnapsack01Frames — greedy-by-ratio is suboptimal here (the lesson)', () => {
	// Ratios: A=2, B=10, C=5, D=16.67. Greedy by ratio (0/1) takes D(3) then B(4)
	// then C won't fit (6 > 3 left), A won't fit → 90. Construct a case where the
	// ratio order misleads: capacity 4 with a high-ratio light item vs a perfect-fit item.
	const tricky = [
		{ name: 'P', weight: 1, value: 2 }, // ratio 2 (best ratio)
		{ name: 'Q', weight: 4, value: 7 }, // ratio 1.75 but fills exactly
	];
	const { summary } = buildKnapsack01Frames({ items: tricky, capacity: 4 });
	// Optimal is Q alone (7) — taking P first (greedy ratio) strands 3 capacity → 2.
	assert.equal(summary.best, 7, 'DP finds Q=7, beating greedy-ratio P=2');
	assert.deepEqual(summary.chosenNames, ['Q']);
});

test('buildKnapsack01Frames — nothing fits → value 0', () => {
	const { summary } = buildKnapsack01Frames({
		items: [{ name: 'X', weight: 99, value: 100 }],
		capacity: 5,
	});
	assert.equal(summary.best, 0);
	assert.deepEqual(summary.chosen, []);
});
