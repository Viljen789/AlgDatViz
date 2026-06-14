// srsSchedule — the pure spaced-repetition core for the review layer.
//
// Re-reading feels like learning; retrieving on a schedule IS learning. The
// cumulative review (reviewBank.js) already flattens every self-graded check
// into a bank keyed `${topicId}:${sceneId}`. This module adds the missing piece:
// a per-card schedule so a student practices each idea again right before they'd
// forget it, instead of drawing questions at random forever.
//
// DESIGN
//   • A Leitner box system. Each card sits in a box 0..5; a correct answer
//     promotes it one box (longer interval), a wrong answer sends it back to box
//     0 (due again today). Box → interval is BOX_INTERVALS_DAYS.
//   • Pure + deterministic. Every function takes `now` (ms epoch) explicitly so
//     the schedule is unit-testable and never reaches for Date.now() itself
//     (the hook supplies the clock). No I/O, no mutation of inputs.
//   • Card ids are exactly the reviewBank entry ids (`${topicId}:${sceneId}`),
//     so the schedule lines up 1:1 with the existing question bank and progress.

export const DAY_MS = 86400000;

// Box → days until due. Box 0 = due immediately (interval 0). Tuned for an
// exam-prep cadence: a card mastered through every box is parked ~3 weeks out.
export const BOX_INTERVALS_DAYS = [0, 1, 2, 4, 9, 21];
export const MAX_BOX = BOX_INTERVALS_DAYS.length - 1;

// How many never-seen cards a single session introduces, so a first review of a
// large bank isn't a wall of hundreds of "new" questions.
export const DEFAULT_NEW_CAP = 8;

/** A fresh card, before its first review. Box 0 ⇒ due now. */
export const initialCard = () => ({ box: 0, reps: 0, lapses: 0, last: 0, due: 0 });

/**
 * gradeCard — schedule a card after one retrieval attempt.
 * Correct promotes a box (longer interval); wrong resets to box 0 (due today)
 * and counts a lapse. Pure: returns a new card, never mutates the input.
 *
 * @param {object|undefined} card  the prior card (or undefined for first review)
 * @param {boolean} correct        was the answer correct
 * @param {number} now             ms epoch "now"
 * @returns {{box:number,reps:number,lapses:number,last:number,due:number}}
 */
export const gradeCard = (card, correct, now) => {
	const prev = card || initialCard();
	const box = correct ? Math.min(prev.box + 1, MAX_BOX) : 0;
	return {
		box,
		reps: prev.reps + 1,
		lapses: prev.lapses + (correct ? 0 : 1),
		last: now,
		due: now + BOX_INTERVALS_DAYS[box] * DAY_MS,
	};
};

/**
 * planSession — build the study queue from the schedule + the question bank.
 *
 * Overdue cards come first (most overdue first), then up to `newCap` never-seen
 * cards drawn from eligible material (so review only surfaces what the student
 * has actually studied — `isNewEligible` is typically "topic has been visited").
 *
 * Pure: reads `cards` + `candidates`, returns a plan; mutates nothing.
 *
 * @param {Record<string,object>} cards  schedule keyed by bank-entry id
 * @param {Array<{id:string, topicId:string}>} candidates  the review bank
 * @param {object} [opts]
 * @param {number} opts.now                ms epoch "now" (required for due math)
 * @param {number} [opts.newCap]           max new cards to introduce this session
 * @param {(entry)=>boolean} [opts.isNewEligible]  gate which new cards may appear
 * @returns {{queue:Array, dueCount:number, freshCount:number,
 *            freshAvailable:number, scheduledCount:number}}
 */
export const planSession = (
	cards,
	candidates,
	{ now = 0, newCap = DEFAULT_NEW_CAP, isNewEligible } = {}
) => {
	const due = [];
	const fresh = [];
	for (const entry of candidates || []) {
		const card = cards?.[entry.id];
		if (card) {
			if (card.due <= now) due.push({ entry, due: card.due });
		} else if (!isNewEligible || isNewEligible(entry)) {
			fresh.push(entry);
		}
	}
	due.sort((a, b) => a.due - b.due);
	const freshChosen = fresh.slice(0, Math.max(0, newCap));
	return {
		queue: [...due.map(d => d.entry), ...freshChosen],
		dueCount: due.length,
		freshCount: freshChosen.length,
		freshAvailable: fresh.length,
		scheduledCount: Object.keys(cards || {}).length,
	};
};
