// Pure wall-clock helpers for timed exam sittings. Countdown callbacks may be
// throttled in a background tab, so remaining time is always derived from an
// absolute deadline rather than from the number of interval ticks received.

export const examDeadline = (seconds, now = Date.now()) => {
	const duration = Number.isFinite(Number(seconds))
		? Math.max(0, Number(seconds))
		: 0;
	return Number(now) + duration * 1000;
};

export const examSecondsRemaining = (deadline, now = Date.now()) => {
	const remainingMs = Number(deadline) - Number(now);
	if (!Number.isFinite(remainingMs) || remainingMs <= 0) return 0;
	return Math.ceil(remainingMs / 1000);
};

/** True only when a run still has at least one genuinely unanswered problem. */
export const hasUnansweredProblems = (states = {}, total = 0) => {
	const required = Math.max(0, Math.floor(Number(total) || 0));
	const answered = Object.values(states ?? {}).filter(
		state => state?.status != null
	).length;
	return answered < required;
};
