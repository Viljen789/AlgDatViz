import assert from 'node:assert/strict';
import test from 'node:test';
import { sqFrames } from './sqFrames.js';
import { SQ_PSEUDO } from './stacksQueuesMeta.js';

// Validate a frame against THE FRAME CONTRACT (PseudoState.jsx): `line` is null
// or a valid 0-based index into the mode's pseudocode, and `state` is an ordered
// array of {label, value} rows.
const assertConformant = (frame, lineCount) => {
	if (frame.line !== null) {
		assert.equal(typeof frame.line, 'number');
		assert.ok(frame.line >= 0 && frame.line < lineCount, 'line in range');
	}
	assert.ok(Array.isArray(frame.state), 'state is an array');
	for (const row of frame.state) {
		assert.equal(typeof row.label, 'string', 'row has a label');
		assert.ok('value' in row, 'row has a value');
	}
};

test('sqFrames — first frame is the untouched initial structure', () => {
	const frames = sqFrames('stack', ['x', 'y'], []);
	assert.equal(frames.length, 1);
	assert.equal(frames[0].op, 'init');
	assert.deepEqual(frames[0].items, ['x', 'y']);
	assert.equal(frames[0].line, null);
});

test('sqFrames — every stack frame conforms to the contract', () => {
	const frames = sqFrames('stack', ['a'], [
		{ type: 'add', value: 'b' },
		{ type: 'peek' },
		{ type: 'remove' },
	]);
	for (const frame of frames) {
		assertConformant(frame, SQ_PSEUDO.stack.length);
	}
});

test('sqFrames — every queue frame conforms to the contract', () => {
	const frames = sqFrames('queue', ['a'], [
		{ type: 'add', value: 'b' },
		{ type: 'peek' },
		{ type: 'remove' },
	]);
	for (const frame of frames) {
		assertConformant(frame, SQ_PSEUDO.queue.length);
	}
});

test('stack is LIFO — pop returns the most recently pushed value', () => {
	// Push A, B, C, D onto an empty stack, then pop once.
	const frames = sqFrames(
		'stack',
		[],
		[
			{ type: 'add', value: 'A' },
			{ type: 'add', value: 'B' },
			{ type: 'add', value: 'C' },
			{ type: 'add', value: 'D' },
			{ type: 'remove' },
		]
	);
	const afterPushes = frames.at(-2);
	assert.deepEqual(afterPushes.items, ['A', 'B', 'C', 'D']);
	const afterPop = frames.at(-1);
	// D (last in) is gone; A, B, C remain.
	assert.deepEqual(afterPop.items, ['A', 'B', 'C']);
	assert.match(afterPop.narration, /Popped D/);
});

test('queue is FIFO — dequeue returns the oldest value', () => {
	// Enqueue A, B, C, D onto an empty queue, then dequeue once.
	const frames = sqFrames(
		'queue',
		[],
		[
			{ type: 'add', value: 'A' },
			{ type: 'add', value: 'B' },
			{ type: 'add', value: 'C' },
			{ type: 'add', value: 'D' },
			{ type: 'remove' },
		]
	);
	const afterDeq = frames.at(-1);
	// A (first in) is gone; B, C, D remain in order.
	assert.deepEqual(afterDeq.items, ['B', 'C', 'D']);
	assert.match(afterDeq.narration, /Dequeued A/);
});

test('stack live state tracks the top pointer and size', () => {
	const frames = sqFrames('stack', [], [{ type: 'add', value: 'A' }]);
	const top = frames.at(-1).state.find(r => r.id === 'top');
	const size = frames.at(-1).state.find(r => r.id === 'size');
	assert.equal(top.value, 0, 'single element sits at index 0');
	assert.equal(size.value, 1);
});

test('queue live state tracks front + rear pointers', () => {
	const frames = sqFrames('queue', [], [
		{ type: 'add', value: 'A' },
		{ type: 'add', value: 'B' },
	]);
	const last = frames.at(-1);
	assert.equal(last.state.find(r => r.id === 'front').value, 0);
	assert.equal(last.state.find(r => r.id === 'rear').value, 1);
});

test('removing from an empty structure is a safe no-op frame', () => {
	const frames = sqFrames('stack', [], [{ type: 'remove' }]);
	const last = frames.at(-1);
	assert.equal(last.op, 'noop');
	assert.deepEqual(last.items, []);
	assert.equal(last.line, null);
});

test('the add op highlights the cell that was just inserted', () => {
	// Stack: highlight the new top. Queue: highlight the new rear.
	const stack = sqFrames('stack', ['a'], [{ type: 'add', value: 'b' }]).at(-1);
	assert.equal(stack.highlight, 1, 'new top cell index');
	const queue = sqFrames('queue', ['a'], [{ type: 'add', value: 'b' }]).at(-1);
	assert.equal(queue.highlight, 1, 'new rear cell index');
});
