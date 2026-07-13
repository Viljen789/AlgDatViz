import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRodCuttingFrames } from './rodCuttingFrames.js';
import { ROD_CUTTING_PSEUDO } from './strategiesMeta.js';

const assertConformant = frame => {
	assert.equal(typeof frame.line, 'number', 'line is a number');
	assert.ok(
		frame.line >= 0 && frame.line < ROD_CUTTING_PSEUDO.length,
		`line ${frame.line} is a valid index into ROD_CUTTING_PSEUDO`
	);
	assert.ok(Array.isArray(frame.state), 'state is an array');
	assert.ok(frame.state.length > 0, 'state has at least one row');
	for (const row of frame.state) {
		assert.equal(typeof row.label, 'string', 'row has a string label');
		assert.ok('value' in row, 'row has a value');
	}
};

// CLRS price table: length 1..10 → price.
const CLRS_PRICES = [1, 5, 8, 9, 10, 17, 17, 20, 24, 30];

test('buildRodCuttingFrames — every frame conforms to the contract', () => {
	const { frames } = buildRodCuttingFrames({ prices: CLRS_PRICES, n: 8 });
	assert.ok(frames.length > 0);
	for (const frame of frames) assertConformant(frame);
});

test('buildRodCuttingFrames — reproduces the CLRS optimum r(n)', () => {
	// CLRS Figure 14.x: r1..r10 = 1,5,8,10,13,17,18,22,25,30.
	const expected = [0, 1, 5, 8, 10, 13, 17, 18, 22, 25, 30];
	const { summary } = buildRodCuttingFrames({ prices: CLRS_PRICES, n: 10 });
	for (let j = 0; j <= 10; j++) {
		assert.equal(summary.dp[j], expected[j], `dp[${j}] = ${expected[j]}`);
	}
});

test('buildRodCuttingFrames — reconstructed pieces sum to n and realise the revenue', () => {
	const { summary } = buildRodCuttingFrames({ prices: CLRS_PRICES, n: 8 });
	const sum = summary.pieces.reduce((a, b) => a + b, 0);
	assert.equal(sum, 8, 'pieces tile the whole rod');
	const realised = summary.pieces.reduce(
		(acc, len) => acc + CLRS_PRICES[len - 1],
		0
	);
	assert.equal(realised, summary.revenue, 'pieces realise dp[n]');
	assert.equal(summary.revenue, 22, 'r(8) = 22');
});

test('buildRodCuttingFrames — base frame is dp[0] = 0 on the base line', () => {
	const { frames } = buildRodCuttingFrames({ prices: CLRS_PRICES, n: 4 });
	assert.equal(frames[0].line, 0);
	assert.equal(frames[0].dpTable[0], 0);
});

test('buildRodCuttingFrames — uncut rod can be optimal (super-additive prices)', () => {
	// A length-3 rod priced so the whole piece beats any split.
	const { summary } = buildRodCuttingFrames({ prices: [1, 2, 100], n: 3 });
	assert.deepEqual(summary.pieces, [3], 'keep the whole rod');
	assert.equal(summary.revenue, 100);
});
