import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	createProgressStore,
	firstTryStatsFrom,
	furthestSceneIndex,
	mergeCheckRecord,
	migrateCheckValue,
} from './useProgress.js';

const createMemoryStorage = () => {
	const values = new Map();
	return {
		getItem: key => values.get(key) ?? null,
		setItem: (key, value) => values.set(key, String(value)),
	};
};

const createMemoryEventTarget = () => {
	const listeners = new Map();
	return {
		addEventListener: (type, listener) => {
			if (!listeners.has(type)) listeners.set(type, new Set());
			listeners.get(type).add(listener);
		},
		removeEventListener: (type, listener) => {
			listeners.get(type)?.delete(listener);
		},
		dispatch: (type, event) => {
			for (const listener of listeners.get(type) || []) listener(event);
		},
	};
};

// furthestSceneIndex is the pure merge rule behind topic resume: it only ever
// moves the stored "furthest scene" forward, and treats anything malformed as
// scene 0 so bad state never throws or scrolls somewhere nonsensical. It takes
// no React/DOM, so it's testable in isolation here.

test('furthestSceneIndex: keeps the larger index (resume only moves forward)', () => {
	assert.equal(furthestSceneIndex(2, 5), 5);
	assert.equal(furthestSceneIndex(5, 2), 5);
	assert.equal(furthestSceneIndex(3, 3), 3);
});

test('furthestSceneIndex: scrolling back up never rewinds the resume point', () => {
	// Reader reached scene 6, then scrolls back to 1 — the stored furthest stays 6.
	let furthest = 0;
	for (const reached of [0, 1, 2, 3, 4, 5, 6, 3, 1, 0]) {
		furthest = furthestSceneIndex(furthest, reached);
	}
	assert.equal(furthest, 6);
});

test('furthestSceneIndex: first run / no history resolves to scene 0', () => {
	assert.equal(furthestSceneIndex(0, 0), 0);
	assert.equal(furthestSceneIndex(undefined, undefined), 0);
	assert.equal(furthestSceneIndex(null, null), 0);
});

test('furthestSceneIndex: malformed or negative inputs clamp to 0', () => {
	assert.equal(furthestSceneIndex(NaN, NaN), 0);
	assert.equal(furthestSceneIndex(-4, -1), 0);
	assert.equal(furthestSceneIndex(Infinity, 2), 2);
	assert.equal(furthestSceneIndex('3', '7'), 0); // non-numbers are not coerced
});

test('furthestSceneIndex: fractional indices floor to a whole scene', () => {
	assert.equal(furthestSceneIndex(0, 2.9), 2);
	assert.equal(furthestSceneIndex(1.4, 0), 1);
});

// mergeCheckRecord is the non-punitive, first-try-preserving merge behind
// recordCheck: the first attempt decides `firstTry` forever; a later correct
// answer flips `correct` true without rewriting `firstTry`; a wrong answer never
// downgrades; and an unchanged answer returns the SAME object (identity) so the
// recording effect can bail without re-rendering.

test('mergeCheckRecord: a first-try success records both flags true', () => {
	assert.deepEqual(mergeCheckRecord(undefined, true), {
		correct: true,
		firstTry: true,
	});
});

test('mergeCheckRecord: a first wrong attempt is honest (both false)', () => {
	assert.deepEqual(mergeCheckRecord(undefined, false), {
		correct: false,
		firstTry: false,
	});
});

test('mergeCheckRecord: wrong→correct flips correct but firstTry stays false', () => {
	const first = mergeCheckRecord(undefined, false); // { correct:false, firstTry:false }
	const second = mergeCheckRecord(first, true);
	assert.deepEqual(second, { correct: true, firstTry: false });
});

test('mergeCheckRecord: a later wrong answer never un-records a prior correct', () => {
	const correct = { correct: true, firstTry: true };
	// non-punitive: returns the SAME object (no change), so the effect can bail
	assert.equal(mergeCheckRecord(correct, false), correct);
});

test('mergeCheckRecord: re-answering an already-correct check is a no-op', () => {
	const correct = { correct: true, firstTry: false };
	assert.equal(mergeCheckRecord(correct, true), correct);
});

// migrateCheckValue tolerates the legacy boolean shape on read.

test('migrateCheckValue: legacy `true` becomes a first-try success', () => {
	assert.deepEqual(migrateCheckValue(true), { correct: true, firstTry: true });
});

test('migrateCheckValue: a record passes through, defaulting firstTry to correct', () => {
	assert.deepEqual(migrateCheckValue({ correct: true, firstTry: false }), {
		correct: true,
		firstTry: false,
	});
	// firstTry absent (e.g. partial) falls back to `correct`
	assert.deepEqual(migrateCheckValue({ correct: true }), {
		correct: true,
		firstTry: true,
	});
});

test('migrateCheckValue: malformed values drop to null', () => {
	assert.equal(migrateCheckValue(false), null);
	assert.equal(migrateCheckValue(0), null);
	assert.equal(migrateCheckValue('x'), null);
	assert.equal(migrateCheckValue(null), null);
});

// firstTryStatsFrom derives the honest overall accuracy.

test('firstTryStatsFrom: counts first-try successes over attempted checks', () => {
	const checks = {
		t: {
			a: { correct: true, firstTry: true },
			b: { correct: true, firstTry: false }, // struggled then got it
		},
		u: { a: { correct: false, firstTry: false } }, // attempted, not yet right
	};
	const s = firstTryStatsFrom(checks);
	assert.equal(s.attempted, 3);
	assert.equal(s.firstTry, 1);
	assert.equal(s.rate, 1 / 3);
});

test('firstTryStatsFrom: empty/absent checks is a clean zero (no divide-by-zero)', () => {
	assert.deepEqual(firstTryStatsFrom({}), {
		attempted: 0,
		firstTry: 0,
		rate: 0,
	});
	assert.deepEqual(firstTryStatsFrom(undefined), {
		attempted: 0,
		firstTry: 0,
		rate: 0,
	});
});

test('progress actions merge the latest persisted checks and scenes instead of erasing them', () => {
	const storage = createMemoryStorage();
	// Two stores model two hook instances that both mounted before either wrote.
	// The second instance therefore starts with the stale empty snapshot that used
	// to overwrite the first instance's newer retrieval state on completion.
	const lesson = createProgressStore({ storage });
	const playground = createProgressStore({ storage });

	lesson.recordCheck('sorting', 'merge-step', true);
	lesson.recordScene('sorting', 4);
	playground.markCompleted('sorting');

	assert.deepEqual(playground.getSnapshot().checks.sorting['merge-step'], {
		correct: true,
		firstTry: true,
	});
	assert.equal(playground.getSnapshot().scenes.sorting, 4);
	assert.deepEqual(playground.getSnapshot().completed, ['sorting']);
});

test('same-tab progress actions immediately update subscribers', () => {
	const store = createProgressStore({ storage: createMemoryStorage() });
	const seen = [];
	const unsubscribe = store.subscribe(() => seen.push(store.getSnapshot()));

	store.recordCheck('graphs', 'bfs-next', false);

	assert.equal(seen.length, 1);
	assert.deepEqual(seen[0].checks.graphs['bfs-next'], {
		correct: false,
		firstTry: false,
	});
	assert.deepEqual(seen[0].visited, ['graphs']);

	unsubscribe();
	store.markCompleted('graphs');
	assert.equal(seen.length, 1, 'unsubscribed clients stay quiet');
});

test('storage events synchronize the cached snapshot from another tab', () => {
	const storage = createMemoryStorage();
	const eventTarget = createMemoryEventTarget();
	const store = createProgressStore({ storage, eventTarget });
	let notifications = 0;
	const unsubscribe = store.subscribe(() => {
		notifications += 1;
	});

	storage.setItem(
		'algdatviz:progress:v1',
		JSON.stringify({
			completed: ['trees'],
			visited: [],
			lastVisited: 'trees',
			checks: { trees: { traversal: true } },
			scenes: { trees: 3 },
		})
	);
	eventTarget.dispatch('storage', { key: 'algdatviz:progress:v1' });

	assert.equal(notifications, 1);
	assert.deepEqual(store.getSnapshot().completed, ['trees']);
	assert.deepEqual(store.getSnapshot().visited, ['trees']);
	assert.deepEqual(store.getSnapshot().checks.trees.traversal, {
		correct: true,
		firstTry: true,
	});
	assert.equal(store.getSnapshot().scenes.trees, 3);
	unsubscribe();
});

test('the server snapshot is stable and browser-independent', () => {
	const store = createProgressStore({ storage: null, eventTarget: null });
	const first = store.getServerSnapshot();

	store.recordCheck('sorting', 'merge-step', true);

	assert.equal(store.getServerSnapshot(), first);
	assert.deepEqual(first, {
		completed: [],
		visited: [],
		lastVisited: null,
		checks: {},
		scenes: {},
	});
});
