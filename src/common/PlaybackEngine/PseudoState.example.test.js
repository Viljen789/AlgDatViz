import assert from 'node:assert/strict';
import test from 'node:test';
import {
	LINEAR_SEARCH_PSEUDOCODE,
	linearSearchFrames,
} from './PseudoState.example.js';

// Validate that a frame conforms to THE FRAME CONTRACT (PseudoState.jsx):
//   line: a valid 0-based index into the pseudocode lines;
//   state: an ordered array of {label, value} rows;
//   highlight: an array (possibly empty) of emphasis ids.
const assertConformant = (frame, lineCount) => {
	assert.equal(typeof frame.line, 'number');
	assert.ok(frame.line >= 0 && frame.line < lineCount, 'line in range');
	assert.ok(Array.isArray(frame.state), 'state is an array');
	for (const row of frame.state) {
		assert.equal(typeof row.label, 'string', 'row has a label');
		assert.ok('value' in row, 'row has a value');
	}
	assert.ok(Array.isArray(frame.highlight), 'highlight is an array');
};

test('linearSearchFrames — every frame conforms to the contract', () => {
	const frames = linearSearchFrames([5, 3, 9, 1], 9);
	assert.ok(frames.length > 0);
	for (const frame of frames) {
		assertConformant(frame, LINEAR_SEARCH_PSEUDOCODE.length);
	}
});

test('linearSearchFrames — ends on the found line at the right index', () => {
	const frames = linearSearchFrames([5, 3, 9, 1], 9);
	const last = frames.at(-1);
	assert.equal(last.line, 3, 'final frame is the "return i" line');
	assert.deepEqual(last.highlight, [2], 'highlights the matched index');
	const found = last.state.find(r => r.id === 'found');
	assert.equal(found.value, 2, 'reports the found index');
});

test('linearSearchFrames — ends on NIL when the target is absent', () => {
	const frames = linearSearchFrames([5, 3, 9, 1], 42);
	const last = frames.at(-1);
	assert.equal(last.line, 4, 'final frame is the "return NIL" line');
	const result = last.state.find(r => r.id === 'result');
	assert.equal(result.value, 'NIL');
	assert.deepEqual(last.highlight, []);
});

test('linearSearchFrames — empty array yields a single NIL frame', () => {
	const frames = linearSearchFrames([], 1);
	assert.equal(frames.length, 1);
	assert.equal(frames[0].line, 4);
});
