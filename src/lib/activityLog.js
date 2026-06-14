// activityLog — the temporal layer the product was missing.
//
// The app records rich learning *outcomes* (checks, SRS cards) but never *when*
// you studied, so streaks, "done today", an exam countdown and deadline-aware
// scheduling were all impossible. This is the thin store that adds time: a count
// of answered questions per local day, plus an optional exam date.
//
// It's a plain module (not a hook) so the answer sites — TopicTemplate and
// ReviewPage — can log without coupling to React; useActivity subscribes for
// live reads. Pure selectors (computeStreak, daysUntil) take the state + "today"
// explicitly so they're unit-testable.

const STORAGE_KEY = 'algdatviz:activity:v1';
export const ACTIVITY_EVENT = 'algdatviz:activity';
export const DAILY_GOAL = 8; // answers/reviews that close the daily ring
const DAY_MS = 86400000;

/** Local YYYY-MM-DD for a Date (defaults to now). */
export const todayKey = (d = new Date()) => {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
};

/** Step a YYYY-MM-DD key by n local days. */
export const addDays = (key, n) => {
	const d = new Date(`${key}T00:00:00`);
	d.setDate(d.getDate() + n);
	return todayKey(d);
};

const emptyState = () => ({ days: {}, examDate: null });

export const readActivity = () => {
	if (typeof window === 'undefined') return emptyState();
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return emptyState();
		const parsed = JSON.parse(raw);
		const days = {};
		if (parsed?.days && typeof parsed.days === 'object') {
			for (const [k, v] of Object.entries(parsed.days)) {
				const n = Number(v);
				if (/^\d{4}-\d{2}-\d{2}$/.test(k) && n > 0) days[k] = n;
			}
		}
		const examDate =
			typeof parsed?.examDate === 'string' &&
			/^\d{4}-\d{2}-\d{2}$/.test(parsed.examDate)
				? parsed.examDate
				: null;
		return { days, examDate };
	} catch {
		return emptyState();
	}
};

const writeActivity = next => {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
		// Same-tab live updates (storage events only fire cross-tab).
		window.dispatchEvent(new Event(ACTIVITY_EVENT));
	} catch {
		// Storage unavailable (private mode, quota). Fail silent.
	}
};

/** Record one unit of study for today. Called once per answered question. */
export const logActivity = (n = 1) => {
	const state = readActivity();
	const key = todayKey();
	writeActivity({
		...state,
		days: { ...state.days, [key]: (state.days[key] || 0) + n },
	});
};

export const clearActivity = () => writeActivity(emptyState());

export const setExamDate = dateStr => {
	const state = readActivity();
	const examDate =
		typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
			? dateStr
			: null;
	writeActivity({ ...state, examDate });
};

/**
 * computeStreak — current + longest run of consecutive active days.
 * The current streak survives until you miss a *whole* day: if today has no
 * activity yet, it counts up to yesterday (so opening the app mid-day doesn't
 * show your streak as already broken).
 */
export const computeStreak = (days, today = todayKey()) => {
	const has = k => (days?.[k] || 0) > 0;
	let cursor = has(today) ? today : addDays(today, -1);
	let current = 0;
	while (has(cursor)) {
		current += 1;
		cursor = addDays(cursor, -1);
	}
	const keys = Object.keys(days || {})
		.filter(k => days[k] > 0)
		.sort();
	let longest = 0;
	let run = 0;
	let prev = null;
	for (const k of keys) {
		run = prev && addDays(prev, 1) === k ? run + 1 : 1;
		if (run > longest) longest = run;
		prev = k;
	}
	return { current, longest };
};

/** Whole days from today until the exam (null if unset; negative if past). */
export const daysUntil = (examDate, today = todayKey()) => {
	if (!examDate) return null;
	const a = new Date(`${today}T00:00:00`).getTime();
	const b = new Date(`${examDate}T00:00:00`).getTime();
	return Math.round((b - a) / DAY_MS);
};

/** Closer to the exam ⇒ introduce more new cards per session. */
export const examNewCap = (daysUntilExam, base = DAILY_GOAL) => {
	if (daysUntilExam == null || daysUntilExam > 14) return base;
	if (daysUntilExam <= 3) return base * 2;
	return Math.round(base * 1.5);
};
