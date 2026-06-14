// mastery — derive a per-topic "how solid is this?" score from the data the app
// already keeps. `overall` only exposes one percent; for exam prep the useful
// signal is which topics have decayed ("you've half-forgotten MST"). Pure +
// testable; reads progress.checks + the SRS cards against the review bank.

import { MAX_BOX } from '../components/Review/srsSchedule.js';

/** Group a flat review bank into { topicId: entries[] }. */
export const groupBankByTopic = bank => {
	const out = {};
	for (const entry of bank || []) {
		(out[entry.topicId] ||= []).push(entry);
	}
	return out;
};

// One check's mastery, 0..1: a scheduled card scores by its Leitner box (recall
// strength); a check answered correctly but not yet in the schedule scores 0.5
// (learned once, not yet reinforced); unseen/wrong scores 0.
const entryScore = (entry, checks, cards) => {
	const card = cards?.[entry.id];
	if (card) return Math.min(card.box, MAX_BOX) / MAX_BOX;
	if (checks?.[entry.topicId]?.[entry.sceneId] === true) return 0.5;
	return 0;
};

/**
 * topicMastery — mean per-check score across a topic's checks.
 * @returns {{score:number, total:number, answered:number, hasData:boolean}}
 */
export const topicMastery = (entries, checks, cards) => {
	if (!entries || entries.length === 0)
		return { score: 0, total: 0, answered: 0, hasData: false };
	let sum = 0;
	let answered = 0;
	for (const entry of entries) {
		const card = cards?.[entry.id];
		const correct = checks?.[entry.topicId]?.[entry.sceneId] === true;
		if (card || correct) answered += 1;
		sum += entryScore(entry, checks, cards);
	}
	return {
		score: sum / entries.length,
		total: entries.length,
		answered,
		hasData: answered > 0,
	};
};

/** Mastery for every topic represented in the bank: { topicId: {...} }. */
export const allMastery = ({ bank, checks, cards }) => {
	const grouped = groupBankByTopic(bank);
	const out = {};
	for (const [topicId, entries] of Object.entries(grouped)) {
		out[topicId] = topicMastery(entries, checks, cards);
	}
	return out;
};
