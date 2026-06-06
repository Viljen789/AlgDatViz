import { useCallback, useEffect, useMemo, useState } from 'react';
import { PROGRESS_TOPICS } from '../data/curriculum.js';

const STORAGE_KEY = 'algdatviz:progress:v1';

const emptyState = () => ({
	completed: [],
	visited: [],
	lastVisited: null,
	// checks: { [topicId]: { [checkId]: true } } — correctly-answered retrieval
	// checks per topic. Added additively (Phase 1a). Migrates safely: old state
	// simply has no `checks` key and starts empty.
	checks: {},
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
			new Set([...visitedRaw, ...completed, ...(lastVisited ? [lastVisited] : [])])
		);
		// `checks` is additive (added Phase 1a). Normalize to a map of maps of
		// booleans; ignore anything malformed so old/partial state never throws.
		const checks = {};
		if (parsed.checks && typeof parsed.checks === 'object') {
			for (const [topicId, byCheck] of Object.entries(parsed.checks)) {
				if (!byCheck || typeof byCheck !== 'object') continue;
				const inner = {};
				for (const [checkId, correct] of Object.entries(byCheck)) {
					if (correct) inner[checkId] = true;
				}
				if (Object.keys(inner).length > 0) checks[topicId] = inner;
			}
		}
		return { completed, visited, lastVisited, checks };
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

	// Record the outcome of a retrieval check. Only correct answers are stored
	// (so completion can derive from required-checks-correct). A topic with a
	// recorded check is also implicitly visited.
	const recordCheck = useCallback((topicId, checkId, correct) => {
		if (!topicId || checkId == null) return;
		setState(prev => {
			const topicChecks = prev.checks[topicId] || {};
			const alreadyRecorded = topicChecks[checkId] === true;
			const alreadyVisited = prev.visited.includes(topicId);
			// Wrong answers are never punished and never un-record a prior correct
			// answer. We only ever persist a *new* correct answer (or a first
			// visit). Anything that wouldn't change state returns prev unchanged
			// — critical so the recording effect can't loop on re-renders.
			const willRecord = Boolean(correct) && !alreadyRecorded;
			if (!willRecord && alreadyVisited) return prev;
			const next = {
				...prev,
				visited: alreadyVisited ? prev.visited : [...prev.visited, topicId],
				checks: willRecord
					? { ...prev.checks, [topicId]: { ...topicChecks, [checkId]: true } }
					: prev.checks,
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

	// Count of correctly-answered checks for a topic.
	const correctCheckCount = useCallback(
		topicId => Object.keys(state.checks[topicId] || {}).length,
		[state.checks]
	);

	const isCheckCorrect = useCallback(
		(topicId, checkId) => state.checks[topicId]?.[checkId] === true,
		[state.checks]
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
		markVisited,
		markCompleted,
		recordCheck,
		reset,
		isCompleted,
		isCompletedBy,
		isVisited,
		isCheckCorrect,
		correctCheckCount,
		overall,
	};
};

export default useProgress;
