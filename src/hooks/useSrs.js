import { useCallback, useEffect, useMemo, useState } from 'react';
import { gradeCard, planSession } from '../components/Review/srsSchedule.js';

// useSrs — persistent spaced-repetition schedule for the review bank.
//
// Mirrors useProgress's storage discipline (versioned key, safe read/migrate,
// cross-tab sync, silent failure). State is a flat map of cards keyed by the
// reviewBank entry id (`${topicId}:${sceneId}`). The scheduling math lives in
// the pure, tested srsSchedule core; this hook only owns persistence + the clock.

const STORAGE_KEY = 'algdatviz:srs:v1';

const emptyState = () => ({ cards: {} });

const readState = () => {
	if (typeof window === 'undefined') return emptyState();
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return emptyState();
		const parsed = JSON.parse(raw);
		const cards = {};
		if (parsed?.cards && typeof parsed.cards === 'object') {
			for (const [id, card] of Object.entries(parsed.cards)) {
				if (!card || typeof card !== 'object') continue;
				// Normalize defensively so malformed/partial state never throws.
				cards[id] = {
					box: Number(card.box) || 0,
					reps: Number(card.reps) || 0,
					lapses: Number(card.lapses) || 0,
					last: Number(card.last) || 0,
					due: Number(card.due) || 0,
				};
			}
		}
		return { cards };
	} catch {
		return emptyState();
	}
};

const writeState = next => {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
	} catch {
		// Storage may be unavailable (private mode, quota). Fail silent.
	}
};

const now = () => (typeof Date !== 'undefined' ? Date.now() : 0);

export const useSrs = () => {
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

	// Record one retrieval outcome and reschedule the card.
	const grade = useCallback((id, correct) => {
		if (!id) return;
		setState(prev => {
			const next = {
				cards: {
					...prev.cards,
					[id]: gradeCard(prev.cards[id], Boolean(correct), now()),
				},
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

	// Build a session plan (queue + counts) against a candidate bank. `opts` may
	// carry isNewEligible / newCap; `now` is supplied here so callers stay pure.
	const plan = useCallback(
		(candidates, opts = {}) =>
			planSession(state.cards, candidates, { now: now(), ...opts }),
		[state.cards]
	);

	const scheduledCount = useMemo(
		() => Object.keys(state.cards).length,
		[state.cards]
	);

	return { cards: state.cards, grade, reset, plan, scheduledCount };
};

export default useSrs;
