// Pure assembly + scoring helpers for a realistic exam sitting.
//
// The exam bank is intentionally broad: it is a catalogue learners can browse,
// not a sensible single sitting. This module samples a shorter paper while
// preserving coverage across the curriculum phases. It never creates questions
// or answer keys; every selected object is still a reference from `sets`.

import { shuffleWithSeed, toSeed } from './seededRandom.js';
import { isAutoGradedCheck } from '../common/TopicTemplate/checkAnswer.js';

export const BALANCED_EXAM_PROBLEM_COUNT = 12;
export const SECONDS_PER_EXAM_PART = 75;

const safeLength = (length, available) =>
	Math.max(0, Math.min(available, Math.floor(Number(length) || 0)));

const subSeed = (seed, label) => toSeed(`${String(seed ?? 1)}:${label}`);

/** Number of independently graded parts in one problem. */
export const examProblemPartCount = set => {
	const problem = set?.problem;
	if (problem?.kind === 'problem' && Array.isArray(problem.parts)) {
		return problem.parts.filter(isAutoGradedCheck).length;
	}
	return isAutoGradedCheck(problem) ? 1 : 0;
};

/** Number of independently graded parts in a whole run. */
export const examPartCount = sets =>
	(sets ?? []).reduce((sum, set) => sum + examProblemPartCount(set), 0);

/** Timed-mode budget: the paper scales with actual graded work, not set count. */
export const examBudgetSeconds = sets =>
	examPartCount(sets) * SECONDS_PER_EXAM_PART;

/**
 * Select a compact, phase-balanced paper from a larger exam bank.
 *
 * One candidate is chosen per topic first. Those candidates are dealt in rounds
 * across curriculum phases, which guarantees broad coverage before any phase can
 * dominate. If a caller requests more problems than there are represented
 * topics, the remaining bank entries are shuffled into the final slots.
 */
export const buildBalancedExamSets = (
	sets = [],
	{ topics = [], seed = 1, length = BALANCED_EXAM_PROBLEM_COUNT } = {}
) => {
	const target = safeLength(length, sets.length);
	if (target === 0) return [];

	const byTopic = new Map();
	for (const set of sets) {
		if (!byTopic.has(set.topicId)) byTopic.set(set.topicId, []);
		byTopic.get(set.topicId).push(set);
	}

	// Keep curriculum order for phases, but seed the topic order and chosen set
	// within each phase. Bank-only topics remain reachable in an "Other" phase.
	const topicRows = [];
	const known = new Set();
	for (const topic of topics) {
		if (!byTopic.has(topic.id) || known.has(topic.id)) continue;
		known.add(topic.id);
		topicRows.push({ id: topic.id, phase: topic.phase ?? 'Other' });
	}
	for (const topicId of byTopic.keys()) {
		if (known.has(topicId)) continue;
		topicRows.push({ id: topicId, phase: 'Other' });
	}

	const phaseOrder = [...new Set(topicRows.map(topic => topic.phase))];
	const candidatesByPhase = new Map(
		phaseOrder.map(phase => {
			const phaseTopics = topicRows.filter(topic => topic.phase === phase);
			const shuffledTopics = shuffleWithSeed(
				phaseTopics,
				subSeed(seed, `phase:${phase}`)
			);
			const candidates = shuffledTopics.map(topic =>
				shuffleWithSeed(
					byTopic.get(topic.id),
					subSeed(seed, `topic:${topic.id}`)
				)[0]
			);
			return [phase, candidates];
		})
	);

	const selected = [];
	let round = 0;
	while (selected.length < target) {
		let added = false;
		for (const phase of phaseOrder) {
			const candidate = candidatesByPhase.get(phase)?.[round];
			if (!candidate) continue;
			selected.push(candidate);
			added = true;
			if (selected.length >= target) break;
		}
		if (!added) break;
		round += 1;
	}

	if (selected.length < target) {
		const selectedRefs = new Set(selected);
		const remaining = sets.filter(set => !selectedRefs.has(set));
		selected.push(
			...shuffleWithSeed(remaining, subSeed(seed, 'remaining')).slice(
				0,
				target - selected.length
			)
		);
	}

	return selected;
};

const scoreFor = score =>
	typeof score === 'number' && Number.isFinite(score)
		? Math.max(0, Math.min(1, score))
		: 0;

/** Overall partial-credit ratio, weighting every problem by its part count. */
export const aggregateExamScore = (runSets = [], scores = []) => {
	let earnedParts = 0;
	let totalParts = 0;
	runSets.forEach((set, index) => {
		const parts = examProblemPartCount(set);
		totalParts += parts;
		earnedParts += scoreFor(scores[index]) * parts;
	});
	return {
		earnedParts,
		totalParts,
		ratio: totalParts > 0 ? earnedParts / totalParts : 0,
	};
};

/** Per-topic partial-credit ratios, using the same part weighting as overall. */
export const aggregateExamByTopic = (runSets = [], scores = []) => {
	const byTopic = new Map();
	runSets.forEach((set, index) => {
		if (!byTopic.has(set.topicId)) {
			byTopic.set(set.topicId, {
				topicId: set.topicId,
				topicName: set.topicName,
				problemCount: 0,
				earnedParts: 0,
				totalParts: 0,
			});
		}
		const row = byTopic.get(set.topicId);
		const parts = examProblemPartCount(set);
		row.problemCount += 1;
		row.totalParts += parts;
		row.earnedParts += scoreFor(scores[index]) * parts;
	});

	return [...byTopic.values()].map(row => ({
		...row,
		ratio: row.totalParts > 0 ? row.earnedParts / row.totalParts : 0,
	}));
};

export default buildBalancedExamSets;
