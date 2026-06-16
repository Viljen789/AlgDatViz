import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectWeakExamSets, WEAK_EXAM_LENGTH } from './weakExam.js';

// A tiny stand-in bank: 3 topics, multiple sets each, so we can assert ordering
// and top-up behaviour without depending on the real EXAM_SETS contents.
const sets = [
	{ id: 'x-1', topicId: 'x' },
	{ id: 'x-2', topicId: 'x' },
	{ id: 'y-1', topicId: 'y' },
	{ id: 'y-2', topicId: 'y' },
	{ id: 'z-1', topicId: 'z' },
	{ id: 'z-2', topicId: 'z' },
];

// Topic order used to top up once weak topics are exhausted (next-weakest first).
const order = ['x', 'y', 'z'];

test('weakest topic comes first, in the bank own order', () => {
	const { sets: chosen } = selectWeakExamSets({
		sets,
		weak: [{ id: 'z' }, { id: 'x' }],
		length: 4,
		order,
	});
	// z is weakest, so its sets lead; then x.
	assert.deepEqual(
		chosen.map(s => s.id),
		['z-1', 'z-2', 'x-1', 'x-2']
	);
});

test('a full run from weak material alone does not top up', () => {
	const res = selectWeakExamSets({
		sets,
		weak: [{ id: 'z' }, { id: 'x' }],
		length: 4,
		order,
	});
	assert.equal(res.toppedUp, false);
	assert.equal(res.weakCount, 4);
	assert.deepEqual(res.weakTopicIds, ['z', 'x']);
	assert.deepEqual(res.topicIds, ['z', 'x']);
});

test('thin weak material tops up from the next topics, reported honestly', () => {
	// Only one weak topic with 2 sets, but we want 5 problems → top up from order.
	const res = selectWeakExamSets({
		sets,
		weak: [{ id: 'y' }],
		length: 5,
		order,
	});
	// y first (weak), then top-up order x, z until length is reached.
	assert.deepEqual(
		res.sets.map(s => s.id),
		['y-1', 'y-2', 'x-1', 'x-2', 'z-1']
	);
	assert.equal(res.toppedUp, true);
	assert.equal(res.weakCount, 2); // only the 2 y problems are from a weak topic
	assert.deepEqual(res.weakTopicIds, ['y']);
	assert.deepEqual(res.topicIds, ['y', 'x', 'z']);
});

test('never returns more than length, and slices mid-topic when needed', () => {
	const res = selectWeakExamSets({
		sets,
		weak: [{ id: 'x' }, { id: 'y' }, { id: 'z' }],
		length: 3,
		order,
	});
	assert.equal(res.sets.length, 3);
	// x (both) then the first of y — y-2 is dropped by the length cap.
	assert.deepEqual(
		res.sets.map(s => s.id),
		['x-1', 'x-2', 'y-1']
	);
});

test('chosen sets are the SAME references from the bank (no fabrication)', () => {
	const { sets: chosen } = selectWeakExamSets({
		sets,
		weak: [{ id: 'x' }],
		length: 2,
		order,
	});
	chosen.forEach(s => assert.ok(sets.includes(s)));
});

test('no weak topics → still assembles a run from order (cold practice)', () => {
	const res = selectWeakExamSets({ sets, weak: [], length: 3, order });
	assert.deepEqual(
		res.sets.map(s => s.id),
		['x-1', 'x-2', 'y-1']
	);
	assert.equal(res.weakCount, 0);
	assert.equal(res.toppedUp, true);
	assert.deepEqual(res.weakTopicIds, []);
});

test('topics in the bank but absent from order are still reachable', () => {
	// order omits z entirely; z must still be drawable as a last resort.
	const res = selectWeakExamSets({
		sets,
		weak: [],
		length: 6,
		order: ['x', 'y'],
	});
	assert.ok(res.sets.some(s => s.topicId === 'z'));
	assert.equal(res.sets.length, 6);
});

test('empty / missing inputs are safe', () => {
	assert.deepEqual(selectWeakExamSets({}).sets, []);
	assert.deepEqual(selectWeakExamSets().sets, []);
	const empty = selectWeakExamSets({ sets: [], weak: [] });
	assert.equal(empty.weakCount, 0);
	assert.equal(empty.toppedUp, false);
});

test('WEAK_EXAM_LENGTH is the default run length', () => {
	assert.equal(typeof WEAK_EXAM_LENGTH, 'number');
	const res = selectWeakExamSets({ sets, weak: [], order });
	// With only 6 sets available, a default-length request is capped by supply.
	assert.equal(res.sets.length, Math.min(WEAK_EXAM_LENGTH, sets.length));
});
