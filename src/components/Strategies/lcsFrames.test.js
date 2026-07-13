import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLcsFrames } from './lcsFrames.js';
import { LCS_PSEUDO } from './strategiesMeta.js';

const assertConformant = frame => {
	assert.equal(typeof frame.line, 'number', 'line is a number');
	assert.ok(
		frame.line >= 0 && frame.line < LCS_PSEUDO.length,
		`line ${frame.line} is a valid index into LCS_PSEUDO`
	);
	assert.ok(Array.isArray(frame.state), 'state is an array');
	assert.ok(frame.state.length > 0, 'state has at least one row');
	for (const row of frame.state) {
		assert.equal(typeof row.label, 'string', 'row has a string label');
		assert.ok('value' in row, 'row has a value');
	}
};

// Verify a string is a subsequence of another (order preserved, not contiguous).
const isSubsequence = (sub, full) => {
	let k = 0;
	for (const ch of full) if (k < sub.length && ch === sub[k]) k += 1;
	return k === sub.length;
};

test('buildLcsFrames — every frame conforms to the contract', () => {
	const { frames } = buildLcsFrames({ x: 'ABCBDAB', y: 'BDCAB' });
	assert.ok(frames.length > 0);
	for (const frame of frames) assertConformant(frame);
});

test('buildLcsFrames — CLRS instance has LCS length 4', () => {
	const { summary } = buildLcsFrames({ x: 'ABCBDAB', y: 'BDCAB' });
	assert.equal(summary.length, 4, 'LCS(ABCBDAB, BDCAB) = 4');
	assert.equal(summary.lcs.length, 4, 'recovered string has length 4');
});

test('buildLcsFrames — recovered LCS is a subsequence of both inputs', () => {
	const cases = [
		{ x: 'ABCBDAB', y: 'BDCAB' },
		{ x: 'AGCAT', y: 'GAC' },
		{ x: 'HUMAN', y: 'CHIMP' },
	];
	for (const { x, y } of cases) {
		const { summary } = buildLcsFrames({ x, y });
		assert.ok(isSubsequence(summary.lcs, x), `"${summary.lcs}" ⊑ ${x}`);
		assert.ok(isSubsequence(summary.lcs, y), `"${summary.lcs}" ⊑ ${y}`);
		assert.equal(summary.lcs.length, summary.length, 'length matches dp[m][n]');
	}
});

test('buildLcsFrames — frame count is m·n + base + traceback', () => {
	const { frames } = buildLcsFrames({ x: 'AGCAT', y: 'GAC' });
	assert.equal(frames.length, 5 * 3 + 2, 'one frame per cell, plus 2');
});

test('buildLcsFrames — no common characters → empty LCS', () => {
	const { summary } = buildLcsFrames({ x: 'ABC', y: 'XYZ' });
	assert.equal(summary.length, 0);
	assert.equal(summary.lcs, '');
});

test('buildLcsFrames — identical strings → LCS is the whole string', () => {
	const { summary } = buildLcsFrames({ x: 'DELTA', y: 'DELTA' });
	assert.equal(summary.lcs, 'DELTA');
	assert.equal(summary.length, 5);
});
