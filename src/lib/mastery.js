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

// Read a stored check, tolerating both the legacy boolean (`true` = a correct
// answer recorded before first-try tracking) and the { correct, firstTry } record.
const readCheck = rec => {
	if (rec === true) return { correct: true, firstTry: true };
	if (rec && typeof rec === 'object')
		return { correct: rec.correct === true, firstTry: rec.firstTry === true };
	return { correct: false, firstTry: false };
};

// One check's mastery, 0..1: a scheduled card scores by its Leitner box (recall
// strength); otherwise the "learned once, not yet reinforced" score is now honest
// about effort — a first-try success is solid (0.5), a check that only came right
// after a wrong attempt is real but shakier (0.3), and unseen/never-correct is 0.
// (A wrong answer is never punishing: reinforcing it in /review promotes the card,
// which takes over the score above this branch.)
const entryScore = (entry, checks, cards) => {
	const card = cards?.[entry.id];
	if (card) return Math.min(card.box, MAX_BOX) / MAX_BOX;
	const { correct, firstTry } = readCheck(
		checks?.[entry.topicId]?.[entry.sceneId]
	);
	if (correct) return firstTry ? 0.5 : 0.3;
	return 0;
};

/**
 * topicMastery — mean per-check score across a topic's checks, optionally folded
 * with a recent exam ratio.
 *
 * The exam ratio (from /exam, see lib/examLog.js) is a strong, recent, exam-shaped
 * signal: "could I do this cold today?". When a topic has BOTH check/card data and
 * an exam ratio we blend them evenly (0.5/0.5) so neither masks the other; with an
 * exam ratio ONLY (a topic with no review bank, e.g. graphs) the score IS the exam
 * ratio — that's what makes an exam-only topic representable at all. `fromExam`
 * flags that the exam signal contributed, so the dashboard can say so.
 *
 * @param {Array}  entries      this topic's bank entries (may be empty)
 * @param {object} checks       progress.checks
 * @param {object} cards        SRS schedule
 * @param {number} [examRatio]  optional latest exam ratio in [0,1]
 * @returns {{score:number, total:number, answered:number, hasData:boolean,
 *           fromExam:boolean}}
 */
export const topicMastery = (entries, checks, cards, examRatio) => {
	const hasExam = Number.isFinite(examRatio);
	if (!entries || entries.length === 0) {
		// No review bank for this topic: it's representable only via an exam ratio.
		if (hasExam)
			return {
				score: examRatio,
				total: 0,
				answered: 0,
				hasData: true,
				fromExam: true,
			};
		return { score: 0, total: 0, answered: 0, hasData: false, fromExam: false };
	}
	let sum = 0;
	let answered = 0;
	for (const entry of entries) {
		const card = cards?.[entry.id];
		const correct = readCheck(checks?.[entry.topicId]?.[entry.sceneId]).correct;
		if (card || correct) answered += 1;
		sum += entryScore(entry, checks, cards);
	}
	const checkCardScore = sum / entries.length;
	const score = hasExam
		? answered > 0
			? 0.5 * examRatio + 0.5 * checkCardScore
			: examRatio
		: checkCardScore;
	return {
		score,
		total: entries.length,
		answered,
		hasData: answered > 0 || hasExam,
		fromExam: hasExam,
	};
};

/**
 * Mastery for every topic represented in the bank, UNIONED with any topic that
 * has only an exam ratio (so exam-only topics still appear): { topicId: {...} }.
 *
 * @param {object} args
 * @param {Array}  args.bank
 * @param {object} args.checks
 * @param {object} args.cards
 * @param {Record<string,number>} [args.examScores]  optional latest exam ratios
 */
export const allMastery = ({ bank, checks, cards, examScores }) => {
	const grouped = groupBankByTopic(bank);
	const scores = examScores || {};
	const out = {};
	// Union the bank's topics with any exam-only topic so the latter still emits.
	const topicIds = new Set([...Object.keys(grouped), ...Object.keys(scores)]);
	for (const topicId of topicIds) {
		out[topicId] = topicMastery(
			grouped[topicId],
			checks,
			cards,
			scores[topicId]
		);
	}
	return out;
};
