// weakExam — assemble a targeted exam from the weak-topic ranking the app
// already computes (lib/weakTopics.js → rankWeakTopics).
//
// THE LOOP THIS CLOSES. /progress names what's weak ("Shore these up") then
// only ever sends the learner to RE-READ the lesson. It never sends them back
// to RE-TEST cold. This pure selector turns a weak ranking into a problem list
// drawn from the SAME derived exam bank (data/examSets.js), so /exam can offer
// "Sit your weak spots" and run it through the existing ExamSession verbatim.
//
// DERIVATION IS UNTOUCHED. This only SELECTS and ORDERS existing sets; it never
// invents a set or an answer. Every chosen set is an element of `sets` by
// reference, so examSets.test.js (every answer re-derived) stays the authority.
//
// Pure: no clock, no storage, no React. Given the same inputs it returns the
// same assembly, which is why it is unit-tested in weakExam.test.js.

// Default run length, in problems. Matched to a focused sitting rather than the
// whole bank: long enough to be a real exam, short enough to sit in one go.
export const WEAK_EXAM_LENGTH = 10;

/**
 * selectWeakExamSets — a problem list weighted toward the learner's weak topics.
 *
 * Weakest-first: we walk the weak ranking and pull every set for each weak topic
 * (in the bank's own order) until we reach `length`. If the weak topics do not
 * have enough material for a full-length run, we TOP UP from the next topics in
 * `order` (the next-weakest, then the rest in teaching order) so the learner
 * still gets a complete sitting — and we report that honestly via `toppedUp`.
 *
 * The result is reported transparently so the caller can surface what it built
 * (e.g. "10 problems · 7 from your weak topics, topped up with 3 more"):
 *   • sets         the chosen sets, weak-topic problems first, by reference.
 *   • topicIds     distinct topic ids represented, in the order they appear.
 *   • weakTopicIds the subset of those that were genuinely weak (from `weak`).
 *   • weakCount    how many chosen PROBLEMS come from a weak topic.
 *   • toppedUp     true when we had to reach past the weak topics to fill up.
 *
 * @param {object} args
 * @param {Array<{id:string, topicId:string}>} args.sets   the exam bank (EXAM_SETS)
 * @param {Array<{id:string}>} args.weak                    weak ranking, weakest first
 * @param {number} [args.length]                            target problem count
 * @param {string[]} [args.order]                           top-up topic order (ids)
 * @returns {{sets:Array, topicIds:string[], weakTopicIds:string[], weakCount:number, toppedUp:boolean}}
 */
export const selectWeakExamSets = ({
	sets = [],
	weak = [],
	length = WEAK_EXAM_LENGTH,
	order = [],
} = {}) => {
	// Bucket the bank by topic, preserving each topic's in-bank order.
	const byTopic = new Map();
	for (const set of sets) {
		if (!byTopic.has(set.topicId)) byTopic.set(set.topicId, []);
		byTopic.get(set.topicId).push(set);
	}

	const weakIds = weak.map(t => t.id);
	const weakSet = new Set(weakIds);

	// Priority of topics to draw from: every weak topic weakest-first, then the
	// top-up `order`, then any remaining topic present in the bank (so nothing is
	// unreachable). De-duplicated, first occurrence wins.
	const priority = [];
	const pushUnique = id => {
		if (id != null && !priority.includes(id)) priority.push(id);
	};
	weakIds.forEach(pushUnique);
	order.forEach(pushUnique);
	for (const id of byTopic.keys()) pushUnique(id);

	const chosen = [];
	let weakCount = 0;
	let toppedUp = false;

	for (const topicId of priority) {
		if (chosen.length >= length) break;
		const topicSets = byTopic.get(topicId);
		if (!topicSets || topicSets.length === 0) continue;
		const isWeak = weakSet.has(topicId);
		for (const set of topicSets) {
			if (chosen.length >= length) break;
			chosen.push(set);
			if (isWeak) weakCount += 1;
			else toppedUp = true; // we drew a problem from a non-weak topic
		}
	}

	const topicIds = [...new Set(chosen.map(s => s.topicId))];
	const weakTopicIds = topicIds.filter(id => weakSet.has(id));

	return { sets: chosen, topicIds, weakTopicIds, weakCount, toppedUp };
};

export default selectWeakExamSets;
