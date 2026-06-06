import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCoinChangeFrames } from './coinChangeFrames.js';
import { COIN_CHANGE_PSEUDO } from './strategiesMeta.js';

// Validate a frame against THE FRAME CONTRACT (common/PlaybackEngine/PseudoState.jsx):
//   line: a valid 0-based index into the pseudocode lines;
//   state: an ordered array of {label, value} rows.
const assertConformant = frame => {
	assert.equal(typeof frame.line, 'number', 'line is a number');
	assert.ok(
		frame.line >= 0 && frame.line < COIN_CHANGE_PSEUDO.length,
		`line ${frame.line} is a valid index into COIN_CHANGE_PSEUDO`
	);
	assert.ok(Array.isArray(frame.state), 'state is an array');
	assert.ok(frame.state.length > 0, 'state has at least one row');
	for (const row of frame.state) {
		assert.equal(typeof row.label, 'string', 'row has a string label');
		assert.ok('value' in row, 'row has a value');
	}
};

test('buildCoinChangeFrames — every frame conforms to the contract', () => {
	const { frames } = buildCoinChangeFrames({ target: 10, coins: [1, 5, 6] });
	assert.ok(frames.length > 0, 'produces frames');
	for (const frame of frames) assertConformant(frame);
});

test('buildCoinChangeFrames — base-case frame is dp[0] = 0 on the base line', () => {
	const { frames } = buildCoinChangeFrames({ target: 10, coins: [1, 5, 6] });
	const base = frames[0];
	assert.equal(base.line, 0, 'base case is the dp[0] = 0 line');
	assert.equal(base.dpTable[0], 0, 'dp[0] = 0');
	const dpRow = base.state.find(r => r.id === 'dp');
	assert.equal(dpRow.value, 0, 'state reports dp[0] = 0');
});

test('buildCoinChangeFrames — the {1,5,6}=10 trap: DP=2 beats greedy=5', () => {
	const { frames, summary } = buildCoinChangeFrames({
		target: 10,
		coins: [1, 5, 6],
	});
	// Ground truth for the spotbug/classify checks: 5+5 = two coins.
	assert.equal(summary.dpFinal, 2, 'DP optimum is 2 coins (5 + 5)');
	assert.equal(summary.greedyFinal, 5, 'greedy spends 5 coins (6 + 1 + 1 + 1 + 1)');
	assert.equal(summary.greedySafe, false, 'greedy is NOT safe for this coin set');
	const last = frames.at(-1);
	assert.equal(last.line, 7, 'final frame is the return dp[target] line');
	const dpFinalRow = last.state.find(r => r.id === 'dpFinal');
	assert.equal(dpFinalRow.value, 2, 'final state reports dp[10] = 2');
});

test('buildCoinChangeFrames — canonical set {1,5,10}: greedy and DP agree', () => {
	const { summary } = buildCoinChangeFrames({ target: 14, coins: [1, 5, 10] });
	assert.equal(summary.dpFinal, summary.greedyFinal, 'both find the same count');
	assert.equal(summary.greedySafe, true, 'greedy is safe for a canonical set');
});

test('buildCoinChangeFrames — i==coin frame reads dp[0] via the relax line', () => {
	const { frames } = buildCoinChangeFrames({ target: 10, coins: [1, 5, 6] });
	// dp[5]: best comes from the 5¢ coin reading dp[0]=0, so dp[5]=1.
	const five = frames.find(f => f.activeI === 5);
	assert.equal(five.line, 6, 'a resolved cell sits on the dp[i] = best line');
	assert.equal(five.dpTable[5], 1, 'dp[5] = 1 (one 5¢ coin)');
	const cRow = five.state.find(r => r.id === 'c');
	assert.equal(cRow.value, '5¢', 'coin under consideration is 5¢');
});

test('buildCoinChangeFrames — guards invalid input with a single idle frame', () => {
	const { frames, summary } = buildCoinChangeFrames({ target: -1, coins: [] });
	assert.equal(frames.length, 1, 'one frame for invalid input');
	assert.equal(summary, null, 'no summary for invalid input');
	assertConformant(frames[0]);
});
