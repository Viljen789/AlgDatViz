import assert from 'node:assert/strict';
import test from 'node:test';
import { getMergeSortStepsWithStats } from './algorithms/mergeSort.js';
import { PSEUDO_CODE } from './algorithmInfo.js';
import { mergeStepToPseudoFrame } from './mergeFrames.js';

const rowsById = frame =>
	Object.fromEntries(frame.state.map(r => [r.id, r]));

test('mergeStepToPseudoFrame returns a conformant empty frame for junk input', () => {
	const frame = mergeStepToPseudoFrame(null);
	assert.equal(frame.line, null);
	assert.deepEqual(frame.state, []);
	assert.deepEqual(frame.highlight, []);
});

test('line index stays a valid 0-based index into the merge-sort pseudocode', () => {
	const lines = PSEUDO_CODE.mergeSort;
	const { steps } = getMergeSortStepsWithStats([5, 2, 4, 1]);
	for (const step of steps) {
		const { line } = mergeStepToPseudoFrame(step);
		if (line == null) continue;
		assert.ok(
			line >= 0 && line < lines.length,
			`line ${line} out of range for ${lines.length} pseudocode lines`
		);
	}
});

test('a dividing step exposes range / mid / left / right and highlights the range', () => {
	const { steps } = getMergeSortStepsWithStats([5, 2, 4, 1]);
	const divideStep = steps.find(s => s.metadata?.phase === 'dividing');
	const frame = mergeStepToPseudoFrame(divideStep);
	const rows = rowsById(frame);
	assert.ok(rows.range && rows.mid && rows.left && rows.right);
	// First top-level divide: range [0,3], mid 1.
	assert.equal(rows.range.value, '[0, 3]');
	assert.equal(rows.mid.value, 1);
	assert.equal(rows.mid.active, true);
	assert.deepEqual(frame.highlight, [0, 3]);
});

test('a merging copy step exposes live i / j / k cursors and the copied value', () => {
	const { steps } = getMergeSortStepsWithStats([5, 2, 4, 1]);
	const moveStep = steps.find(
		s =>
			s.metadata?.phase === 'merging' && s.metadata.movedElement !== undefined
	);
	const frame = mergeStepToPseudoFrame(moveStep);
	const rows = rowsById(frame);
	assert.equal(rows.i.label, 'i (left)');
	assert.equal(rows.j.label, 'j (right)');
	assert.equal(rows.k.label, 'k (output)');
	assert.equal(typeof rows.i.value, 'number');
	assert.equal(typeof rows.j.value, 'number');
	assert.equal(typeof rows.k.value, 'number');
	assert.ok(rows.copied, 'a copy step reports the moved element');
	assert.equal(rows.copied.active, true);
	// The active line is the pseudocode "copy smaller" line.
	assert.equal(frame.line, moveStep.line);
});

test('the completed step reports a sorted status', () => {
	const { steps } = getMergeSortStepsWithStats([5, 2, 4, 1]);
	const doneStep = steps.find(s => s.metadata?.phase === 'completed');
	const frame = mergeStepToPseudoFrame(doneStep);
	const rows = rowsById(frame);
	assert.equal(rows.done.value, 'sorted');
});
