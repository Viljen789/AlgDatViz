import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { PROGRESS_TOPICS } from '../data/curriculum.js';

const STORAGE_KEY = 'algdatviz:progress:v1';

// The furthest scene index a topic was ever read to. Resume only ever moves
// *forward* — re-reading an earlier scene must not rewind where you pick back
// up. Pure + exported so the merge rule is unit-testable. Treats anything
// non-finite/negative as "scene 0" so malformed state never throws or scrolls
// somewhere nonsensical.
export const furthestSceneIndex = (prev, next) => {
	const a = Number.isFinite(prev) && prev > 0 ? Math.floor(prev) : 0;
	const b = Number.isFinite(next) && next > 0 ? Math.floor(next) : 0;
	return Math.max(a, b);
};

// A check record captures retrieval outcome with two fields:
//   correct  — whether the check has EVER been answered correctly. Drives
//              completion, which stays non-punitive: a later correct answer always
//              counts, a wrong one never un-records a prior correct.
//   firstTry — whether the FIRST attempt was correct. Set once and preserved
//              forever, so a struggled-then-correct check can no longer masquerade
//              as a clean first-try success. This is the honest mastery signal that
//              the old "store true on correct, discard the rest" model threw away.
// Pure + exported so the merge, migration, and stat rules are unit-testable.

// Merge a newly graded answer into a check's prior record. Never punishes: the
// first correct answer flips `correct` true; `firstTry` is decided on the first
// attempt and never changes. Returns the SAME record object when nothing should
// change, so the recording effect can compare by identity and never loop.
export const mergeCheckRecord = (existing, correct) => {
	const nowCorrect = Boolean(correct);
	if (!existing) return { correct: nowCorrect, firstTry: nowCorrect };
	if (nowCorrect && existing.correct !== true)
		return { correct: true, firstTry: existing.firstTry === true };
	return existing; // wrong re-answer, or already correct — no state change
};

// Normalize one stored check value into the { correct, firstTry } record. Tolerates
// the legacy boolean shape (`true` = a correctly-answered check recorded before
// first-try tracking existed; treated as a first-try success since no attempt
// history can be reconstructed). Returns null for anything malformed so it drops.
export const migrateCheckValue = val => {
	if (val === true) return { correct: true, firstTry: true };
	if (val && typeof val === 'object') {
		const correct = val.correct === true;
		const firstTry = typeof val.firstTry === 'boolean' ? val.firstTry : correct;
		return { correct, firstTry };
	}
	return null;
};

// Overall first-try accuracy across every attempted check: the share answered
// correctly on the very first try. The honest counterpart to completion —
// completion says "got here eventually", this says "how often did it click first".
export const firstTryStatsFrom = checks => {
	let attempted = 0;
	let firstTry = 0;
	for (const byCheck of Object.values(checks || {})) {
		for (const rec of Object.values(byCheck || {})) {
			if (!rec) continue;
			attempted += 1;
			if (rec.firstTry === true) firstTry += 1;
		}
	}
	return { attempted, firstTry, rate: attempted ? firstTry / attempted : 0 };
};

const emptyState = () => ({
	completed: [],
	visited: [],
	lastVisited: null,
	// checks: { [topicId]: { [checkId]: { correct, firstTry } } } — per-topic
	// retrieval record. `correct` drives non-punitive completion; `firstTry` is the
	// honest mastery signal. Added additively (Phase 1a; first-try in Phase 3).
	// Migrates safely: old state has no `checks` key (starts empty) and any legacy
	// boolean values are normalized on read by migrateCheckValue.
	checks: {},
	// scenes: { [topicId]: furthestSceneIndex } — how far into each topic's
	// scrolly the reader has reached, so entering a topic resumes at that scene
	// instead of scene 0. Added additively: old state has no `scenes` key and
	// every topic simply resumes at 0 (the first-run behavior).
	scenes: {},
});

const stateFromStorage = storage => {
	if (!storage) return emptyState();
	try {
		const raw = storage.getItem(STORAGE_KEY);
		if (!raw) return emptyState();
		const parsed = JSON.parse(raw);
		const completed = Array.isArray(parsed.completed) ? parsed.completed : [];
		const lastVisited =
			typeof parsed.lastVisited === 'string' ? parsed.lastVisited : null;
		// `visited` is additive (added Phase 2). Migrate older state that only
		// stored `lastVisited` by seeding the set from what we know.
		const visitedRaw = Array.isArray(parsed.visited) ? parsed.visited : [];
		const visited = Array.from(
			new Set([
				...visitedRaw,
				...completed,
				...(lastVisited ? [lastVisited] : []),
			])
		);
		// `checks` is additive (added Phase 1a). Normalize each value to a
		// { correct, firstTry } record via migrateCheckValue (tolerates legacy
		// booleans); drop anything malformed so old/partial state never throws.
		const checks = {};
		if (parsed.checks && typeof parsed.checks === 'object') {
			for (const [topicId, byCheck] of Object.entries(parsed.checks)) {
				if (!byCheck || typeof byCheck !== 'object') continue;
				const inner = {};
				for (const [checkId, val] of Object.entries(byCheck)) {
					const rec = migrateCheckValue(val);
					if (rec) inner[checkId] = rec;
				}
				if (Object.keys(inner).length > 0) checks[topicId] = inner;
			}
		}
		// `scenes` is additive (added Phase 2c). Keep only positive integer
		// indices keyed by topic; ignore anything malformed so old/partial
		// state never throws and simply resumes at scene 0.
		const scenes = {};
		if (parsed.scenes && typeof parsed.scenes === 'object') {
			for (const [topicId, idx] of Object.entries(parsed.scenes)) {
				const n = furthestSceneIndex(0, Number(idx));
				if (n > 0) scenes[topicId] = n;
			}
		}
		return { completed, visited, lastVisited, checks, scenes };
	} catch {
		return emptyState();
	}
};

const browserEventTarget = () =>
	typeof window === 'undefined' ? null : window;

const browserStorage = () => {
	if (typeof window === 'undefined') return null;
	try {
		return window.localStorage;
	} catch {
		return null;
	}
};

// One deep, observable progress store shared by every useProgress consumer.
// Actions always re-read the latest persisted snapshot before reducing, so an
// action from a client that rendered earlier can never replace checks/scenes a
// different client wrote later. The in-memory snapshot is cached (required by
// useSyncExternalStore) and same-tab writes synchronously notify subscribers;
// the browser `storage` event keeps other tabs in lockstep.
export const createProgressStore = (options = {}) => {
	const storage = Object.prototype.hasOwnProperty.call(options, 'storage')
		? options.storage
		: browserStorage();
	const eventTarget = Object.prototype.hasOwnProperty.call(
		options,
		'eventTarget'
	)
		? options.eventTarget
		: browserEventTarget();
	const serverSnapshot = emptyState();
	let snapshot = stateFromStorage(storage);
	let fingerprint = JSON.stringify(snapshot);
	let memoryOnly = false;
	let listening = false;
	const listeners = new Set();

	const getSnapshot = () => snapshot;
	const getServerSnapshot = () => serverSnapshot;

	const publish = next => {
		const nextFingerprint = JSON.stringify(next);
		if (nextFingerprint === fingerprint) return snapshot;
		snapshot = next;
		fingerprint = nextFingerprint;
		for (const listener of [...listeners]) listener();
		return snapshot;
	};

	const persist = next => {
		if (!storage) {
			memoryOnly = true;
			return;
		}
		try {
			storage.setItem(STORAGE_KEY, JSON.stringify(next));
			memoryOnly = false;
		} catch {
			// Storage may be unavailable (Safari private mode, quota). Keep the
			// shared in-memory snapshot live even when persistence fails.
			memoryOnly = true;
		}
	};

	const latestState = () =>
		memoryOnly || !storage ? snapshot : stateFromStorage(storage);

	const update = reducer => {
		const latest = latestState();
		const next = reducer(latest);
		if (next === latest) {
			// If this client had a stale snapshot, converge it on the latest persisted
			// value even though the requested action itself was a no-op.
			publish(latest);
			return snapshot;
		}
		persist(next);
		publish(next);
		return snapshot;
	};

	const markVisited = topicId =>
		update(prev => {
			const alreadyVisited = prev.visited.includes(topicId);
			if (prev.lastVisited === topicId && alreadyVisited) return prev;
			return {
				...prev,
				lastVisited: topicId,
				visited: alreadyVisited ? prev.visited : [...prev.visited, topicId],
			};
		});

	const markCompleted = topicId =>
		update(prev => {
			const alreadyCompleted = prev.completed.includes(topicId);
			const alreadyVisited = prev.visited.includes(topicId);
			if (alreadyCompleted && alreadyVisited) return prev;
			return {
				...prev,
				completed: alreadyCompleted
					? prev.completed
					: [...prev.completed, topicId],
				visited: alreadyVisited ? prev.visited : [...prev.visited, topicId],
			};
		});

	const recordCheck = (topicId, checkId, correct) => {
		if (!topicId || checkId == null) return;
		update(prev => {
			const topicChecks = prev.checks[topicId] || {};
			const existing = topicChecks[checkId];
			const merged = mergeCheckRecord(existing, correct);
			const recordChanged = merged !== existing;
			const alreadyVisited = prev.visited.includes(topicId);
			if (!recordChanged && alreadyVisited) return prev;
			return {
				...prev,
				visited: alreadyVisited ? prev.visited : [...prev.visited, topicId],
				checks: recordChanged
					? { ...prev.checks, [topicId]: { ...topicChecks, [checkId]: merged } }
					: prev.checks,
			};
		});
	};

	const recordScene = (topicId, sceneIndex) => {
		if (!topicId) return;
		update(prev => {
			const current = prev.scenes[topicId] || 0;
			const nextIdx = furthestSceneIndex(current, sceneIndex);
			const alreadyVisited = prev.visited.includes(topicId);
			if (nextIdx === current && alreadyVisited) return prev;
			return {
				...prev,
				visited: alreadyVisited ? prev.visited : [...prev.visited, topicId],
				scenes:
					nextIdx === current
						? prev.scenes
						: { ...prev.scenes, [topicId]: nextIdx },
			};
		});
	};

	const reset = () => {
		const next = emptyState();
		persist(next);
		publish(next);
	};

	const syncFromStorage = () => {
		memoryOnly = false;
		publish(stateFromStorage(storage));
	};

	const onStorage = event => {
		if (event?.key != null && event.key !== STORAGE_KEY) return;
		syncFromStorage();
	};

	const startListening = () => {
		if (listening || !eventTarget?.addEventListener) return;
		eventTarget.addEventListener('storage', onStorage);
		listening = true;
	};

	const stopListening = () => {
		if (!listening || !eventTarget?.removeEventListener) return;
		eventTarget.removeEventListener('storage', onStorage);
		listening = false;
	};

	const subscribe = listener => {
		listeners.add(listener);
		if (listeners.size === 1) {
			startListening();
			// Storage may have changed between module evaluation and the first mount.
			syncFromStorage();
		}
		return () => {
			listeners.delete(listener);
			if (listeners.size === 0) stopListening();
		};
	};

	return {
		getSnapshot,
		getServerSnapshot,
		subscribe,
		markVisited,
		markCompleted,
		recordCheck,
		recordScene,
		reset,
	};
};

const progressStore = createProgressStore();

export const useProgress = () => {
	const state = useSyncExternalStore(
		progressStore.subscribe,
		progressStore.getSnapshot,
		progressStore.getServerSnapshot
	);
	const { markVisited, markCompleted, recordCheck, recordScene, reset } =
		progressStore;

	const completedSet = useMemo(
		() => new Set(state.completed),
		[state.completed]
	);
	const visitedSet = useMemo(() => new Set(state.visited), [state.visited]);

	// Count of ever-correctly-answered checks for a topic (drives completion).
	const correctCheckCount = useCallback(
		topicId =>
			Object.values(state.checks[topicId] || {}).filter(
				rec => rec?.correct === true
			).length,
		[state.checks]
	);

	const isCheckCorrect = useCallback(
		(topicId, checkId) => state.checks[topicId]?.[checkId]?.correct === true,
		[state.checks]
	);

	// Overall first-try accuracy across every attempted check — the honest signal
	// the /progress dashboard surfaces alongside completion.
	const firstTryStats = useMemo(
		() => firstTryStatsFrom(state.checks),
		[state.checks]
	);

	// The furthest scene a topic was read to (0 when never opened) — the index
	// the topic should resume at.
	const furthestScene = useCallback(
		topicId => state.scenes[topicId] || 0,
		[state.scenes]
	);

	// A topic counts as completed when it is in `completed` (explicit) OR it has
	// answered enough required checks correctly. `requiredChecks` is supplied by
	// the topic (via TopicTemplate); when 0/undefined, only explicit completion
	// counts (backward compatible with topics that never wire checks).
	const isCompletedBy = useCallback(
		(topicId, requiredChecks) => {
			if (completedSet.has(topicId)) return true;
			const required = Number(requiredChecks) || 0;
			if (required <= 0) return false;
			return correctCheckCount(topicId) >= required;
		},
		[completedSet, correctCheckCount]
	);

	const isCompleted = useCallback(
		topicId => completedSet.has(topicId),
		[completedSet]
	);
	const isVisited = useCallback(
		topicId => visitedSet.has(topicId),
		[visitedSet]
	);

	// Overall progress, derived across every topic that counts (preview
	// aliases + coming-soon excluded — PROGRESS_TOPICS is the ready set).
	// Completed implies progress; visited-but-not-completed counts as partial.
	const overall = useMemo(() => {
		const total = PROGRESS_TOPICS.length;
		const completedCount = PROGRESS_TOPICS.filter(t =>
			completedSet.has(t.id)
		).length;
		const visitedCount = PROGRESS_TOPICS.filter(t =>
			visitedSet.has(t.id)
		).length;
		return {
			total,
			completed: completedCount,
			visited: visitedCount,
			ratio: total ? completedCount / total : 0,
			percent: total ? Math.round((completedCount / total) * 100) : 0,
			allComplete: total > 0 && completedCount === total,
		};
	}, [completedSet, visitedSet]);

	return {
		completed: state.completed,
		visited: state.visited,
		lastVisited: state.lastVisited,
		checks: state.checks,
		scenes: state.scenes,
		markVisited,
		markCompleted,
		recordCheck,
		recordScene,
		reset,
		isCompleted,
		isCompletedBy,
		isVisited,
		isCheckCorrect,
		correctCheckCount,
		firstTryStats,
		furthestScene,
		overall,
	};
};

export default useProgress;
