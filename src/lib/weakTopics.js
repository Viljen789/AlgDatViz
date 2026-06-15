// weakTopics — the ONE shared "which topics need shoring up?" ranking.
//
// Three surfaces used to compute this independently with divergent thresholds
// (/progress at 0.6, /exam at 0.7), so the same topic could be "weak" in one place
// and "fine" in another. This module is the single source of truth: one threshold,
// one ranking. /progress renders it ("Shore these up"); the exam summary's study
// nudge reuses WEAK_THRESHOLD so the two agree.
//
// Pure: takes the curriculum topics + an allMastery() map; never reads a clock.

// Below this mastery score a topic with data counts as weak. Single source of
// truth — do not reintroduce a second threshold elsewhere.
export const WEAK_THRESHOLD = 0.6;

/**
 * rankWeakTopics — topics with data scoring below `threshold`, weakest first.
 *
 * Only topics whose mastery has data are eligible (an untouched topic isn't
 * "weak", it's "not started" — a different prompt). Each returned item is the
 * source topic spread with its mastery `score` attached, so callers can render
 * name/number/accent directly.
 *
 * @param {object} args
 * @param {Array<{id:string}>} args.topics       curriculum topics
 * @param {Record<string,{score:number,hasData:boolean}>} args.mastery  allMastery() map
 * @param {number} [args.threshold]              weak cutoff (default WEAK_THRESHOLD)
 * @param {number} [args.limit]                  optional max count (weakest kept)
 * @returns {Array<{score:number, id:string}>}
 */
export const rankWeakTopics = ({
	topics,
	mastery,
	threshold = WEAK_THRESHOLD,
	limit,
} = {}) => {
	const ranked = (topics || [])
		.map(topic => ({ ...topic, score: mastery?.[topic.id]?.score ?? 0 }))
		.filter(topic => {
			const m = mastery?.[topic.id];
			return m?.hasData && m.score < threshold;
		})
		.sort((a, b) => a.score - b.score);
	return typeof limit === 'number' ? ranked.slice(0, limit) : ranked;
};
