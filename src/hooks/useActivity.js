import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	ACTIVITY_EVENT,
	clearActivity,
	computeStreak,
	daysUntil,
	readActivity,
	setExamDate as persistExamDate,
	todayKey,
} from '../lib/activityLog.js';

// useActivity — live read of the temporal study log (see lib/activityLog.js).
// Subscribes to both cross-tab 'storage' and same-tab ACTIVITY_EVENT so the
// home/progress surfaces update the moment a question is answered elsewhere.

export const useActivity = () => {
	const [state, setState] = useState(readActivity);

	useEffect(() => {
		if (typeof window === 'undefined') return undefined;
		const refresh = () => setState(readActivity());
		window.addEventListener('storage', refresh);
		window.addEventListener(ACTIVITY_EVENT, refresh);
		return () => {
			window.removeEventListener('storage', refresh);
			window.removeEventListener(ACTIVITY_EVENT, refresh);
		};
	}, []);

	const today = todayKey();
	const { current, longest } = useMemo(
		() => computeStreak(state.days, today),
		[state.days, today]
	);
	const daysUntilExam = useMemo(
		() => daysUntil(state.examDate, today),
		[state.examDate, today]
	);

	const setExamDate = useCallback(date => persistExamDate(date), []);
	const reset = useCallback(() => clearActivity(), []);

	return {
		days: state.days,
		examDate: state.examDate,
		todayCount: state.days[today] || 0,
		currentStreak: current,
		longestStreak: longest,
		daysUntilExam,
		setExamDate,
		reset,
	};
};

export default useActivity;
