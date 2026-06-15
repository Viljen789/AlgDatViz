import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
	recordExamTopic,
	clearExamLog,
	readExamLog,
	examScoresFromState,
} from './examLog.js';

// The store guards on `typeof window`; under plain Node there is none. Install a
// minimal in-memory localStorage + event-dispatching window so record/read/clear
// exercise the real persistence path (the pure selector is tested without it).
const installWindowShim = () => {
	const store = new Map();
	globalThis.window = {
		localStorage: {
			getItem: k => (store.has(k) ? store.get(k) : null),
			setItem: (k, v) => store.set(k, String(v)),
			removeItem: k => store.delete(k),
		},
		dispatchEvent: () => true,
		addEventListener: () => {},
		removeEventListener: () => {},
	};
	return store;
};

let store;
beforeEach(() => {
	store = installWindowShim();
});

test('recordExamTopic stores latest, best, and an attempt count', () => {
	recordExamTopic('graphs', 0.4);
	let read = readExamLog();
	assert.equal(read.topics.graphs.latest, 0.4);
	assert.equal(read.topics.graphs.best, 0.4);
	assert.equal(read.topics.graphs.attempts, 1);

	// A weaker second attempt: latest follows it down, best holds, attempts bumps.
	recordExamTopic('graphs', 0.2);
	read = readExamLog();
	assert.equal(read.topics.graphs.latest, 0.2);
	assert.equal(read.topics.graphs.best, 0.4);
	assert.equal(read.topics.graphs.attempts, 2);

	// A stronger third attempt raises best.
	recordExamTopic('graphs', 0.9);
	read = readExamLog();
	assert.equal(read.topics.graphs.latest, 0.9);
	assert.equal(read.topics.graphs.best, 0.9);
	assert.equal(read.topics.graphs.attempts, 3);
});

test('recordExamTopic stamps a YYYY-MM-DD day and keeps optional meta', () => {
	recordExamTopic('mst', 0.75, { score: 3, total: 4 });
	const read = readExamLog();
	assert.match(read.topics.mst.at, /^\d{4}-\d{2}-\d{2}$/);
	assert.deepEqual(read.topics.mst.meta, { score: 3, total: 4 });
});

test('recordExamTopic clamps out-of-range ratios into [0,1]', () => {
	recordExamTopic('a', 1.7);
	recordExamTopic('b', -0.5);
	recordExamTopic('c', NaN);
	const read = readExamLog();
	assert.equal(read.topics.a.latest, 1);
	assert.equal(read.topics.b.latest, 0);
	assert.equal(read.topics.c.latest, 0);
});

test('recordExamTopic ignores a missing topic id', () => {
	recordExamTopic('', 0.5);
	recordExamTopic(undefined, 0.5);
	assert.deepEqual(readExamLog().topics, {});
});

test('examScoresFromState returns the LATEST ratio per topic', () => {
	const state = {
		topics: {
			graphs: { latest: 0.3, best: 0.8, attempts: 4, at: '2026-06-10' },
			mst: { latest: 0.9, best: 0.9, attempts: 1, at: '2026-06-11' },
		},
	};
	assert.deepEqual(examScoresFromState(state), { graphs: 0.3, mst: 0.9 });
});

test('examScoresFromState is safe on empty / malformed state', () => {
	assert.deepEqual(examScoresFromState(undefined), {});
	assert.deepEqual(examScoresFromState({}), {});
	assert.deepEqual(examScoresFromState({ topics: null }), {});
	// A record missing a finite latest is skipped, not emitted as undefined.
	assert.deepEqual(examScoresFromState({ topics: { x: { best: 0.5 } } }), {});
});

test('readExamLog migrates malformed records and a bare topic map', () => {
	// Bare { topicId: record } (an earlier shape, no `topics` wrapper) + a junk
	// entry that must be dropped. The good record normalizes; best >= latest.
	store.set(
		'algdatviz:exam:v1',
		JSON.stringify({
			graphs: { latest: 0.6, best: 0.2, attempts: 'oops' },
			bogus: 42,
		})
	);
	const read = readExamLog();
	assert.equal(read.topics.graphs.latest, 0.6);
	assert.equal(read.topics.graphs.best, 0.6); // raised to latest
	assert.equal(read.topics.graphs.attempts, 1); // non-numeric ⇒ 1
	assert.equal('bogus' in read.topics, false);
});

test('readExamLog returns empty state on unparseable JSON', () => {
	store.set('algdatviz:exam:v1', '{not json');
	assert.deepEqual(readExamLog(), { topics: {} });
});

test('clearExamLog empties the store', () => {
	recordExamTopic('graphs', 0.5);
	assert.equal(Object.keys(readExamLog().topics).length, 1);
	clearExamLog();
	assert.deepEqual(readExamLog(), { topics: {} });
});
