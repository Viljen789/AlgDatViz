import { DEFAULT_NEW_CAP, planSession } from './srsSchedule.js';
import { isReviewSafe } from './reviewUtils.js';

/**
 * Build the canonical review entries for one already-loaded lesson. The shape
 * intentionally matches REVIEW_BANK exactly, including stable ids, so a topic
 * page can schedule its own cards without importing the all-topic registry.
 */
export const buildTopicReviewEntries = ({ topic, scenes } = {}) => {
	if (!topic?.id || !Array.isArray(scenes)) return [];
	return scenes
		.filter(scene => scene?.id && isReviewSafe(scene.check))
		.map(scene => ({
			id: `${topic.id}:${scene.id}`,
			topicId: topic.id,
			topicName: topic.name,
			topicNumber: topic.number,
			to: topic.to,
			accent: topic.accent,
			sceneId: scene.id,
			sceneTitle: scene.title,
			check: scene.check,
		}));
};

/** Every entry belonging to one topic, preserving source order. */
export const topicBankSlice = (topicId, bank = []) =>
	(Array.isArray(bank) ? bank : []).filter(entry => entry.topicId === topicId);

/**
 * Build the due-first, capped-fresh queue for one topic. Callers pass either a
 * lesson-local entry list or REVIEW_BANK; this module deliberately has no full-
 * bank default so importing it stays dependency-light.
 */
export const buildTopicQueue = ({
	topicId,
	cards,
	now = 0,
	newCap = DEFAULT_NEW_CAP,
	bank = [],
} = {}) => {
	const slice = topicBankSlice(topicId, bank);
	const plan = planSession(cards || {}, slice, { now, newCap });
	return { ...plan, available: slice.length };
};
