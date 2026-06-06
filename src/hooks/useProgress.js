import { useCallback, useEffect, useMemo, useState } from 'react';
import { PROGRESS_TOPICS } from '../data/curriculum.js';

const STORAGE_KEY = 'algdatviz:progress:v1';

const readState = () => {
	if (typeof window === 'undefined')
		return { completed: [], visited: [], lastVisited: null };
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return { completed: [], visited: [], lastVisited: null };
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
		return { completed, visited, lastVisited };
	} catch {
		return { completed: [], visited: [], lastVisited: null };
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

	const reset = useCallback(() => {
		const next = { completed: [], visited: [], lastVisited: null };
		writeState(next);
		setState(next);
	}, []);

	const completedSet = useMemo(
		() => new Set(state.completed),
		[state.completed]
	);
	const visitedSet = useMemo(() => new Set(state.visited), [state.visited]);

	const isCompleted = useCallback(
		topicId => completedSet.has(topicId),
		[completedSet]
	);
	const isVisited = useCallback(
		topicId => visitedSet.has(topicId),
		[visitedSet]
	);

	// Overall progress, derived across every topic that counts (preview
	// aliases excluded). Completed implies progress; visited-but-not-completed
	// counts as partial.
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
		markVisited,
		markCompleted,
		reset,
		isCompleted,
		isVisited,
		overall,
	};
};

export default useProgress;
