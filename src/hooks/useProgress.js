import { useCallback, useEffect, useMemo, useState } from 'react';
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

const readState = () => {
	if (typeof window === 'undefined') return emptyState();
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
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

const writeState = next => {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
	} catch {
		// Storage may be unavailable (Safari private mode, quota). Fail silent.
	}
};

export const useProgress = () => {
	const [state, setState] = useState(readState);

	useEffect(() => {
		if (typeof window === 'undefined') return undefined;
		const onStorage = event => {
			if (event.key !== STORAGE_KEY) return;
			setState(readState());
		};
		window.addEventListener('storage', onStorage);
		return () => window.removeEventListener('storage', onStorage);
	}, []);

	const markVisited = useCallback(topicId => {
		setState(prev => {
			const alreadyVisited = prev.visited.includes(topicId);
			if (prev.lastVisited === topicId && alreadyVisited) return prev;
			const next = {
				...prev,
				lastVisited: topicId,
				visited: alreadyVisited ? prev.visited : [...prev.visited, topicId],
			};
			writeState(next);
			return next;
		});
	}, []);

	const markCompleted = useCallback(topicId => {
		setState(prev => {
			const alreadyCompleted = prev.completed.includes(topicId);
			const alreadyVisited = prev.visited.includes(topicId);
			if (alreadyCompleted && alreadyVisited) return prev;
			const next = {
				...prev,
				completed: alreadyCompleted
					? prev.completed
					: [...prev.completed, topicId],
				visited: alreadyVisited ? prev.visited : [...prev.visited, topicId],
			};
			writeState(next);
			return next;
		});
	}, []);

	// Record the outcome of a retrieval check. Called on EVERY resolved answer
	// (correct or wrong) so the first attempt's outcome is captured for honest
	// first-try mastery; the merge is non-punitive (a wrong answer never un-records
	// a prior correct, and the first correct answer flips `correct` true without
	// rewriting `firstTry`). Anything that wouldn't change state returns prev
	// unchanged — critical so the recording effect can't loop on re-renders. A
	// topic with a recorded check is also implicitly visited.
	const recordCheck = useCallback((topicId, checkId, correct) => {
		if (!topicId || checkId == null) return;
		setState(prev => {
			const topicChecks = prev.checks[topicId] || {};
			const existing = topicChecks[checkId];
			const merged = mergeCheckRecord(existing, correct);
			const recordChanged = merged !== existing;
			const alreadyVisited = prev.visited.includes(topicId);
			if (!recordChanged && alreadyVisited) return prev;
			const next = {
				...prev,
				visited: alreadyVisited ? prev.visited : [...prev.visited, topicId],
				checks: recordChanged
					? { ...prev.checks, [topicId]: { ...topicChecks, [checkId]: merged } }
					: prev.checks,
			};
			writeState(next);
			return next;
		});
	}, []);

	// Record how far into a topic's scrolly the reader has reached. Only ever
	// advances the stored index (furthestSceneIndex), so re-reading an earlier
	// scene can't rewind the resume point. Returns prev unchanged when nothing
	// moves forward — critical so the scrolly's onActiveScene notifier can fire
	// on every scroll without looping re-renders. A topic with a recorded scene
	// is implicitly visited (you can't read a scene without opening the topic).
	const recordScene = useCallback((topicId, sceneIndex) => {
		if (!topicId) return;
		setState(prev => {
			const current = prev.scenes[topicId] || 0;
			const nextIdx = furthestSceneIndex(current, sceneIndex);
			const alreadyVisited = prev.visited.includes(topicId);
			if (nextIdx === current && alreadyVisited) return prev;
			const next = {
				...prev,
				visited: alreadyVisited ? prev.visited : [...prev.visited, topicId],
				scenes:
					nextIdx === current
						? prev.scenes
						: { ...prev.scenes, [topicId]: nextIdx },
			};
			writeState(next);
			return next;
		});
	}, []);

	const reset = useCallback(() => {
		const next = emptyState();
		writeState(next);
		setState(next);
	}, []);

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
