// revisionPlan — a deadline-aware "what to revise on which day" schedule.
//
// With an exam date set, "you have N topics and D days" is answerable concretely:
// rank every built topic weakest-first and deal them across the days you have
// left, front-loading the weakest so the shakiest material gets the most runway.
// The ProgressPage renders this as a day-by-day plan; the exam countdown gives it
// daysUntilExam.
//
// Pure: takes `today` (YYYY-MM-DD) explicitly and does date math via addDays from
// activityLog.js — it never reaches for the system clock (the caller supplies it).

import { addDays } from './activityLog.js';

/**
 * buildRevisionPlan — bucket all built topics across the days until the exam.
 *
 * Returns null when there's no usable horizon (no date, or the exam is today/past
 * — nothing left to plan). Otherwise topics are ranked weakest-first by mastery
 * score; a topic with no mastery data sorts as weakest (score 0) because "never
 * studied" needs revision most. Each day gets ceil(nTopics / daysUntilExam) topics
 * (front-loaded: day 0 fills first), so every topic lands on exactly one day and
 * the weakest cluster at the front.
 *
 * @param {object} args
 * @param {Array<{id,name,number,accent}>} args.topics        built curriculum topics
 * @param {Record<string,{score:number,hasData:boolean}>} args.mastery  allMastery() map
 * @param {number|null} args.daysUntilExam                    whole days left (daysUntil())
 * @param {string} args.today                                 YYYY-MM-DD anchor
 * @returns {null | {days: Array<{index:number, dateKey:string,
 *           topics: Array<{id,name,number,accent,score}>}>, topicCount:number}}
 */
export const buildRevisionPlan = ({
	topics,
	mastery,
	daysUntilExam,
	today,
} = {}) => {
	if (daysUntilExam == null || daysUntilExam <= 0) return null;

	// Rank weakest-first. No data ⇒ score 0 (sorts as weakest). Stable on ties so
	// the curriculum's teaching order is the tiebreaker.
	const ranked = (topics || [])
		.map(topic => ({
			id: topic.id,
			name: topic.name,
			number: topic.number,
			accent: topic.accent,
			score: mastery?.[topic.id]?.hasData ? mastery[topic.id].score : 0,
		}))
		.sort((a, b) => a.score - b.score);

	const topicCount = ranked.length;
	const perDay = Math.max(1, Math.ceil(topicCount / daysUntilExam));

	const days = [];
	for (let index = 0; index < daysUntilExam; index += 1) {
		const slice = ranked.slice(index * perDay, index * perDay + perDay);
		// Once the topics run out, later days are empty (still listed so the user
		// sees the full runway, with the load concentrated up front).
		days.push({ index, dateKey: addDays(today, index), topics: slice });
	}

	return { days, topicCount };
};
