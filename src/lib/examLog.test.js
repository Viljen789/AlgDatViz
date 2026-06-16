import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
	recordExamTopic,
	clearExamLog,
	readExamLog,
	examScoresFromState,
	topicDelta,
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

// ── Score sequence + per-topic delta ─────────────────────────────────────────

test('recordExamTopic appends each sitting to the score history', () => {
	recordExamTopic('graphs', 0.4);
	recordExamTopic('graphs', 0.6);
	recordExamTopic('graphs', 0.7);
	const read = readExamLog();
	// The climb is kept in order, oldest sitting first — not just the latest.
	assert.deepEqual(read.topics.graphs.history, [0.4, 0.6, 0.7]);
	assert.equal(read.topics.graphs.attempts, 3);
	assert.equal(read.topics.graphs.latest, 0.7);
});

test('recordExamTopic clamps each appended sitting into [0,1]', () => {
	recordExamTopic('a', 1.7);
	recordExamTopic('a', -0.5);
	assert.deepEqual(readExamLog().topics.a.history, [1, 0]);
});

test('readExamLog backfills a 2-point history when best > latest (>= 2 attempts)', () => {
	// A pre-sequence record: we genuinely saw a high-water best AND a later, weaker
	// latest across 4 sittings, so [best, latest] are two real, defensible points.
	store.set(
		'algdatviz:exam:v1',
		JSON.stringify({
			topics: {
				mst: { latest: 0.3, best: 0.8, attempts: 4, at: '2026-06-10' },
			},
		})
	);
	const read = readExamLog();
	assert.deepEqual(read.topics.mst.history, [0.8, 0.3]);
});

test('readExamLog backfills a single-point history when only one number is known', () => {
	// best === latest, or a lone attempt: we never knew an earlier number, so we do
	// NOT fabricate one — the history is exactly the single score we have.
	store.set(
		'algdatviz:exam:v1',
		JSON.stringify({
			topics: {
				one: { latest: 0.5, best: 0.5, attempts: 1, at: '2026-06-10' },
				flat: { latest: 0.6, best: 0.6, attempts: 3, at: '2026-06-11' },
			},
		})
	);
	const read = readExamLog();
	assert.deepEqual(read.topics.one.history, [0.5]);
	// best === latest means both extremes coincide — only one real point survives.
	assert.deepEqual(read.topics.flat.history, [0.6]);
});

test('recording onto a migrated record appends to its backfilled history', () => {
	// Old shape with no history; the first new sitting extends the backfilled climb.
	store.set(
		'algdatviz:exam:v1',
		JSON.stringify({
			topics: {
				mst: { latest: 0.3, best: 0.8, attempts: 4, at: '2026-06-10' },
			},
		})
	);
	recordExamTopic('mst', 0.9);
	assert.deepEqual(readExamLog().topics.mst.history, [0.8, 0.3, 0.9]);
});

test('readExamLog keeps a stored history verbatim (clamped), ignoring backfill', () => {
	store.set(
		'algdatviz:exam:v1',
		JSON.stringify({
			topics: {
				graphs: {
					latest: 0.7,
					best: 0.7,
					attempts: 3,
					history: [0.2, 1.5, 0.7],
					at: '2026-06-10',
				},
			},
		})
	);
	// A real sequence is preserved (1.5 clamped to 1), not replaced by [latest].
	assert.deepEqual(readExamLog().topics.graphs.history, [0.2, 1, 0.7]);
});

test('topicDelta returns the signed climb from the first sitting with a direction', () => {
	const up = topicDelta({ history: [0.4, 0.6, 0.7] });
	assert.ok(Math.abs(up.delta - 0.3) < 1e-9); // +0.30
	assert.equal(up.first, 0.4);
	assert.equal(up.latest, 0.7);
	assert.equal(up.count, 3);
	assert.equal(up.direction, 1);

	const down = topicDelta({ history: [0.8, 0.3] });
	assert.ok(Math.abs(down.delta + 0.5) < 1e-9); // -0.50
	assert.equal(down.direction, -1);

	const flat = topicDelta({ history: [0.5, 0.5] });
	assert.equal(flat.delta, 0);
	assert.equal(flat.direction, 0);
});

test('topicDelta returns null below 2 sittings (no fake delta)', () => {
	assert.equal(topicDelta({ history: [0.5] }), null);
	assert.equal(topicDelta({ history: [] }), null);
	assert.equal(topicDelta({}), null);
	assert.equal(topicDelta(undefined), null);
});
