import assert from 'node:assert/strict';
import test from 'node:test';
import { getQuickSortFrames } from './quickPartitionFrames.js';
import { PSEUDO_CODE } from './algorithmInfo.js';
import { quickStepToPseudoFrame } from './quickFrames.js';

const rowsById = frame => Object.fromEntries(frame.state.map(r => [r.id, r]));

test('returns a conformant empty frame for junk input', () => {
	const frame = quickStepToPseudoFrame(null);
	assert.equal(frame.line, null);
	assert.deepEqual(frame.state, []);
	assert.deepEqual(frame.highlight, []);
});

test('line index stays a valid 0-based index into the quicksort pseudocode', () => {
	const lines = PSEUDO_CODE.quickSort;
	const { frames } = getQuickSortFrames([5, 2, 9, 1, 5, 6]);
	for (const f of frames) {
		const { line } = quickStepToPseudoFrame(f);
		if (line == null) continue;
		assert.ok(
			line >= 0 && line < lines.length,
			`line ${line} out of range for ${lines.length} pseudocode lines`
		);
	}
});

test('a pivot frame maps to the pivot pseudocode line and shows the pivot', () => {
	const { frames } = getQuickSortFrames([5, 2, 9, 1, 5, 6]);
	const pivotFrame = frames.find(f => f.phase === 'pivot');
	const frame = quickStepToPseudoFrame(pivotFrame);
	assert.equal(frame.line, 7); // 'pivot = array[high]'
	const rows = rowsById(frame);
	assert.ok(rows.pivot && rows.pivot.active === true);
	assert.ok(rows.i && rows.j);
});

test('a compare frame maps to the if-line and reports the comparison result', () => {
	const { frames } = getQuickSortFrames([5, 2, 9, 1, 5, 6]);
	const cmpFrame = frames.find(f => f.phase === 'compare');
	const frame = quickStepToPseudoFrame(cmpFrame);
	assert.equal(frame.line, 10); // 'if array[j] < pivot:'
	const rows = rowsById(frame);
	assert.ok(rows.cmp && rows.cmp.active === true);
	assert.match(rows.cmp.value, /yes|no/);
});

test('an inner swap maps to line 12, the final pivot swap maps to line 13', () => {
	const { frames } = getQuickSortFrames([5, 2, 9, 1, 5, 6]);
	const swaps = frames.filter(f => f.phase === 'swap');
	// At least one inner swap and the closing pivot swap exist for this input.
	const lines = swaps.map(quickStepToPseudoFrame).map(f => f.line);
	assert.ok(lines.includes(12), 'an inner swap maps to line 12');
	assert.ok(lines.includes(13), 'the pivot swap maps to line 13');
});

test('a place frame maps to the return line and names both recursion sides', () => {
	const { frames } = getQuickSortFrames([5, 2, 9, 1, 5, 6]);
	const placeFrame = frames.find(f => f.phase === 'place');
	const frame = quickStepToPseudoFrame(placeFrame);
	assert.equal(frame.line, 14); // 'return i+1 (pivot_index)'
	const rows = rowsById(frame);
	assert.ok(rows.placed && rows.placed.active === true);
	assert.ok(rows.left && rows.right);
	assert.deepEqual(frame.highlight, [placeFrame.pivotIndex]);
});

test('the done frame reports a sorted status and no line', () => {
	const { frames } = getQuickSortFrames([5, 2, 9, 1, 5, 6]);
	const doneFrame = frames.find(f => f.phase === 'done');
	const frame = quickStepToPseudoFrame(doneFrame);
	assert.equal(frame.line, null);
	assert.equal(rowsById(frame).done.value, 'sorted');
});
