import assert from 'node:assert/strict';
import test from 'node:test';
import { buildHuffmanFrames } from './huffmanFrames.js';
import { HUFFMAN_PSEUDO } from './strategiesMeta.js';

// Validate a frame against THE FRAME CONTRACT (common/PlaybackEngine/PseudoState.jsx).
const assertConformant = frame => {
	assert.equal(typeof frame.line, 'number', 'line is a number');
	assert.ok(
		frame.line >= 0 && frame.line < HUFFMAN_PSEUDO.length,
		`line ${frame.line} is a valid index into HUFFMAN_PSEUDO`
	);
	assert.ok(Array.isArray(frame.state), 'state is an array');
	assert.ok(frame.state.length > 0, 'state has at least one row');
	for (const row of frame.state) {
		assert.equal(typeof row.label, 'string', 'row has a string label');
		assert.ok('value' in row, 'row has a value');
	}
};

const CLRS = [
	{ char: 'f', freq: 5 },
	{ char: 'e', freq: 9 },
	{ char: 'c', freq: 12 },
	{ char: 'b', freq: 13 },
	{ char: 'd', freq: 16 },
	{ char: 'a', freq: 45 },
];

test('buildHuffmanFrames — every frame conforms to the contract', () => {
	const { frames } = buildHuffmanFrames(CLRS);
	assert.ok(frames.length > 0, 'produces frames');
	for (const frame of frames) assertConformant(frame);
});

test('buildHuffmanFrames — n−1 merges produce a single root', () => {
	const { frames, summary } = buildHuffmanFrames(CLRS);
	const last = frames[frames.length - 1];
	assert.equal(last.forest.length, 1, 'one tree remains');
	assert.equal(summary.root.freq, 100, 'root frequency = total frequency');
});

test('buildHuffmanFrames — produces a prefix-free code for every symbol', () => {
	const { summary } = buildHuffmanFrames(CLRS);
	const codes = Object.values(summary.codes);
	assert.equal(Object.keys(summary.codes).length, 6, 'one code per symbol');
	// Prefix-free: no codeword is a prefix of another.
	for (const a of codes) {
		for (const b of codes) {
			if (a === b) continue;
			assert.ok(!b.startsWith(a), `${a} is not a prefix of ${b}`);
		}
	}
});

test('buildHuffmanFrames — rarer symbols get codes at least as long as common ones', () => {
	const { summary } = buildHuffmanFrames(CLRS);
	// a:45 is most frequent → shortest code; f:5 is rarest → longest.
	assert.ok(
		summary.codes['a'].length <= summary.codes['f'].length,
		'the most frequent symbol is no deeper than the rarest'
	);
});

test('buildHuffmanFrames — beats a fixed-width code on the CLRS instance', () => {
	const { summary } = buildHuffmanFrames(CLRS);
	// CLRS result: 224 bits for Huffman vs 300 for a fixed 3-bit code.
	assert.equal(summary.huffmanBits, 224, 'classic 224-bit optimum');
	assert.equal(summary.fixedBits, 300, 'fixed 3-bit code is 300 bits');
	assert.ok(summary.huffmanBits < summary.fixedBits, 'Huffman wins');
});

test('buildHuffmanFrames — handles a single symbol', () => {
	const { frames, summary } = buildHuffmanFrames([{ char: 'z', freq: 7 }]);
	for (const frame of frames) assertConformant(frame);
	assert.equal(summary.codes['z'], '0', 'a lone symbol still gets one bit');
});

test('buildHuffmanFrames — ignores non-positive / malformed symbols', () => {
	const { frames } = buildHuffmanFrames([
		{ char: 'a', freq: 0 },
		{ char: 'b', freq: -3 },
		{ char: 'c', freq: NaN },
	]);
	assert.equal(frames.length, 1, 'falls back to a single empty frame');
});
