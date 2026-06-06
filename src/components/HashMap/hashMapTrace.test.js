import assert from 'node:assert/strict';
import test from 'node:test';
import {
	buildDeleteTrace,
	buildGetTrace,
	buildOperationTrace,
	buildPutTrace,
	buildResizeTrace,
	buildStateRows,
	createBucketsFromEntries,
} from './hashMapTrace.js';

// Every trace frame must carry a 0-based pseudocode line index and a buckets
// grid sized to its capacity, so PseudoState + the canvas stay in lockstep.
const assertFrameShape = frame => {
	assert.equal(typeof frame.line, 'number', 'frame has a numeric line');
	assert.ok(frame.line >= 0, 'line is 0-based');
	assert.ok(Array.isArray(frame.buckets), 'frame has buckets');
	assert.equal(frame.buckets.length, frame.capacity, 'buckets sized to m');
};

test('buildPutTrace inserts into an empty bucket and commits the entry', () => {
	const buckets = createBucketsFromEntries([], 7);
	const { frames, finalBuckets } = buildPutTrace({
		key: 'cat',
		value: '5',
		buckets,
		capacity: 7,
	});
	assert.ok(frames.length >= 4, 'emits hash, compress, scan, commit beats');
	frames.forEach(assertFrameShape);
	// The final state actually contains the new entry.
	const flat = finalBuckets.flat();
	assert.equal(flat.length, 1);
	assert.equal(flat[0].key, 'cat');
	assert.equal(flat[0].value, '5');
});

test('buildPutTrace updates in place when the key already exists', () => {
	const buckets = createBucketsFromEntries([{ key: 'cat', value: '5' }], 7);
	const { finalBuckets } = buildPutTrace({
		key: 'cat',
		value: '13',
		buckets,
		capacity: 7,
	});
	const flat = finalBuckets.flat();
	assert.equal(flat.length, 1, 'no duplicate entry created');
	assert.equal(flat[0].value, '13', 'value overwritten in place');
});

test('buildGetTrace does not mutate the table and finds a present key', () => {
	const buckets = createBucketsFromEntries([{ key: 'cat', value: '5' }], 7);
	const { frames, finalBuckets } = buildGetTrace({
		key: 'cat',
		buckets,
		capacity: 7,
	});
	frames.forEach(assertFrameShape);
	assert.equal(finalBuckets, buckets, 'get leaves the table untouched');
});

test('buildDeleteTrace removes a present key', () => {
	const buckets = createBucketsFromEntries(
		[
			{ key: 'cat', value: '5' },
			{ key: 'dog', value: '4' },
		],
		7
	);
	const { finalBuckets } = buildDeleteTrace({
		key: 'cat',
		buckets,
		capacity: 7,
	});
	const keys = finalBuckets.flat().map(e => e.key);
	assert.deepEqual(keys.sort(), ['dog'], 'only the deleted key is gone');
});

test('buildResizeTrace grows m and preserves every entry', () => {
	const entries = [
		{ key: 'red', value: '12' },
		{ key: 'tan', value: '18' },
		{ key: 'ivy', value: '21' },
		{ key: 'oak', value: '34' },
	];
	const buckets = createBucketsFromEntries(entries, 5);
	const { frames, finalBuckets, finalCapacity } = buildResizeTrace({
		buckets,
		capacity: 5,
	});
	frames.forEach(assertFrameShape);
	assert.ok(finalCapacity > 5, 'capacity grew');
	const before = buckets.flat().map(e => e.key).sort();
	const after = finalBuckets.flat().map(e => e.key).sort();
	assert.deepEqual(after, before, 'no entry lost or gained on resize');
});

test('buildOperationTrace dispatches by operation name', () => {
	const buckets = createBucketsFromEntries([], 7);
	const put = buildOperationTrace('put', {
		key: 'cat',
		value: '5',
		buckets,
		capacity: 7,
	});
	assert.ok(put.frames.length > 0);
	const unknown = buildOperationTrace('nope', { buckets, capacity: 7 });
	assert.deepEqual(unknown.frames, []);
});

// ── buildStateRows (the PseudoState bridge) ──

test('buildStateRows reports the real hash, index, chain length and α', () => {
	const buckets = createBucketsFromEntries(
		[
			{ key: 'cat', value: '5' },
			{ key: 'dog', value: '4' },
		],
		7
	);
	const { frames } = buildPutTrace({
		key: 'ate',
		value: '8',
		buckets,
		capacity: 7,
	});
	// The compress frame knows the bucket index; the scan frame knows the chain.
	const compress = frames.find(f => f.phase === 'compress');
	const rows = buildStateRows(compress);
	const byId = Object.fromEntries(rows.map(r => [r.id, r.value]));
	assert.equal(byId.hash, compress.hash, 'hash row matches the frame hash');
	assert.equal(byId.index, compress.selectedBucket, 'index row is the bucket');
	assert.match(String(byId.alpha), /\/\s*7\s*=/, 'α shows entries over m=7');
});

test('buildStateRows is pure and tolerates a null frame', () => {
	assert.deepEqual(buildStateRows(null), []);
	assert.deepEqual(buildStateRows(undefined), []);
});

test('buildStateRows marks exactly the phase-relevant row active', () => {
	const buckets = createBucketsFromEntries([{ key: 'cat', value: '5' }], 7);
	const { frames } = buildGetTrace({ key: 'cat', buckets, capacity: 7 });
	const scan = frames.find(f => f.phase === 'scan');
	const rows = buildStateRows(scan);
	const active = rows.filter(r => r.active).map(r => r.id);
	assert.deepEqual(active, ['chain'], 'scan phase activates the chain row');
});
