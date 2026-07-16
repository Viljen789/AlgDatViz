// reviewBank — the cross-topic question bank for the cumulative mixed-review.
//
// This is the deferred capstone of the revision layer (PEDAGOGY_PLAN §6): a
// single pure registry that collects every standalone, self-graded retrieval
// check authored across all topics, so a student can practice spaced retrieval
// from the whole course in one shuffled session instead of one topic at a time.
//
// DESIGN
//   • Read-only. Each topic's `SCENES` is imported as-is; this module never
//     mutates a scene or its `check`. It only re-keys the existing checks into a
//     flat, topic-tagged list.
//   • Self-graded kinds only. A bank question must be gradeable by the pure
//     `checkAnswer` core with no topic-specific stage or missing visual context.
//     Checks may set `reviewSafe: false` when their prompt depends on the lesson
//     canvas. So we include the
//     self-graded kinds (choice, numeric, text, order, classify, predict,
//     stepProbe, spotbug) and EXCLUDE `pair` — which needs a live topic
//     visualization to resolve (host-graded).
//   • Stable ids. Each entry id is `${topicId}:${sceneId}` so a question maps
//     back to exactly one scene; the same id is what useProgress already records
//     (topicId + sceneId), keeping a future "review counts as retrieval" wiring
//     trivial without changing the progress API here.
//
// The module is intentionally UI-free and deterministic so the bank + the
// shuffler/sampler can be unit-tested (reviewBank.test.js).

import { CURRICULUM, TOPIC_BY_ID } from '../../data/curriculum.js';
import {
	buildTopicQueue as buildQueueFromEntries,
	buildTopicReviewEntries,
	topicBankSlice as sliceTopicEntries,
} from './topicReview.js';
import {
	SELF_GRADED_KINDS,
	accentTokens,
	isReviewSafe,
	isSelfGraded,
} from './reviewUtils.js';
import {
	mulberry32,
	shuffleWithSeed,
	toSeed,
} from '../../lib/seededRandom.js';

// Compatibility façade: full-bank consumers may keep importing these helpers
// here, while dependency-sensitive consumers import their light source modules.
export {
	SELF_GRADED_KINDS,
	accentTokens,
	isReviewSafe,
	isSelfGraded,
};
export { mulberry32, shuffleWithSeed, toSeed };

// Each topic's scrolly scenes, imported read-only. The map key is the topic id
// from curriculum.js so every entry resolves a real curriculum node (name,
// number, route, accent). TOPIC_SCENES below derives its order from CURRICULUM,
// so adding or reordering a lesson cannot silently make review drift from the
// course path.
import { SCENES as foundationsScenes } from '../Foundations/scenes.js';
import { SCENES as sortingScenes } from '../MergeSortLesson/scenes.js';
import { SCENES as quicksortScenes } from '../QuickSortLesson/scenes.js';
import { SCENES as stacksScenes } from '../StacksQueues/scenes.js';
import { SCENES as masterScenes } from '../MasterTheorem/scenes.js';
import { SCENES as linsortScenes } from '../LinearTimeSorting/scenes.js';
import { SCENES as hashingScenes } from '../HashMap/scenes.js';
import { SCENES as treesScenes } from '../Tree/scenes.js';
import { SCENES as heapsScenes } from '../Heaps/scenes.js';
import { SCENES as strategiesScenes } from '../Strategies/scenes.js';
import { SCENES as mstScenes } from '../Mst/scenes.js';
import { SCENES as ssspScenes } from '../ShortestPaths/scenes.js';
import { SCENES as apspScenes } from '../AllPairsShortestPaths/scenes.js';
import { SCENES as maxflowScenes } from '../MaxFlow/scenes.js';
import { SCENES as npcScenes } from '../NpCompleteness/scenes.js';
import { SCENES as graphScenes } from '../Graph/GraphLesson/graphScenes.js';

// topicId → scenes is an identity map only. Teaching order comes exclusively
// from CURRICULUM below, eliminating the second hand-maintained topic order that
// previously omitted Graphs and Quicksort.
const SCENES_BY_TOPIC = {
	foundations: foundationsScenes,
	'stacks-queues': stacksScenes,
	'master-theorem': masterScenes,
	sorting: sortingScenes,
	quicksort: quicksortScenes,
	'linear-time-sorting': linsortScenes,
	hashing: hashingScenes,
	trees: treesScenes,
	heaps: heapsScenes,
	graphs: graphScenes,
	strategies: strategiesScenes,
	mst: mstScenes,
	'shortest-paths': ssspScenes,
	apsp: apspScenes,
	'max-flow': maxflowScenes,
	'np-completeness': npcScenes,
};

const TOPIC_SCENES = CURRICULUM.map(topic => [
	topic.id,
	SCENES_BY_TOPIC[topic.id],
]).filter(([, scenes]) => Array.isArray(scenes));

/**
 * buildReviewBank — collect every standalone self-graded check across all topics
 * into a flat, topic-tagged list (teaching order). Pure: derived only from the imported
 * SCENES + curriculum, never mutates them.
 *
 * @returns {Array<{
 *   id: string,           // `${topicId}:${sceneId}` — stable, unique
 *   topicId: string,      // curriculum topic id
 *   topicName: string,    // display name
 *   topicNumber: string,  // two-digit teaching-order label
 *   to: string,           // route to the owning topic
 *   accent: string,       // topic signature hue (var(--topic-*))
 *   sceneId: string,      // owning scene id
 *   sceneTitle: string,   // scene headline (context for the question)
 *   check: object,        // the original (read-only) check object
 * }>}
 */
export const buildReviewBank = () => {
	const bank = [];
	for (const [topicId, scenes] of TOPIC_SCENES) {
		const topic = TOPIC_BY_ID[topicId];
		bank.push(...buildTopicReviewEntries({ topic, scenes }));
	}
	return bank;
};

// The canonical bank, built once at module load. Read-only consumers (the page +
// tests) share this; pass an explicit list to the shuffler/sampler when a test
// needs a controlled fixture.
export const REVIEW_BANK = buildReviewBank();

// Distinct topics represented in the bank (teaching order, de-duplicated).
export const REVIEW_TOPIC_IDS = [
	...new Set(REVIEW_BANK.map(entry => entry.topicId)),
];

// ── Deterministic PRNG + shuffle ──────────────────────────────────────────────
// A seeded shuffle so a session is reproducible given a seed (testable + lets a
// student re-take the exact same set, or get a fresh one by re-seeding).

/**
 * sampleSession — pick a cross-topic, shuffled set of ~`count` questions.
 *
 * Spreads across topics so a short session never draws every question from one
 * topic: we shuffle WITHIN each topic (seeded), then round-robin across topics
 * (one per topic per pass) until `count` is reached, and finally shuffle the
 * chosen set (seeded) so the topic order itself is mixed. Deterministic given a
 * seed; pure (no mutation of the bank).
 *
 * @param {object} [opts]
 * @param {number} [opts.count=10]      target number of questions.
 * @param {number|string} [opts.seed=1] session seed.
 * @param {Array}  [opts.bank=REVIEW_BANK] source list (override for tests).
 * @returns {Array} the chosen, shuffled bank entries (≤ count, ≤ bank length).
 */
export const sampleSession = ({
	count = 10,
	seed = 1,
	bank = REVIEW_BANK,
} = {}) => {
	if (!Array.isArray(bank) || bank.length === 0) return [];
	const target = Math.max(0, Math.min(count, bank.length));
	if (target === 0) return [];

	// Group by topic, preserving teaching order of first appearance.
	const byTopic = new Map();
	for (const entry of bank) {
		if (!byTopic.has(entry.topicId)) byTopic.set(entry.topicId, []);
		byTopic.get(entry.topicId).push(entry);
	}

	// Shuffle within each topic so the per-topic pick rotates with the seed.
	const queues = [...byTopic.values()].map((entries, i) =>
		shuffleWithSeed(entries, `${toSeed(seed)}:${i}`)
	);

	// Round-robin across topics: one question per topic per pass, so coverage is
	// as broad as possible before any topic contributes a second question.
	const chosen = [];
	let exhausted = false;
	while (chosen.length < target && !exhausted) {
		exhausted = true;
		for (const queue of queues) {
			if (chosen.length >= target) break;
			const next = queue.shift();
			if (next) {
				chosen.push(next);
				exhausted = false;
			}
		}
	}

	// Mix the final order so consecutive questions hop topics (seeded → stable).
	return shuffleWithSeed(chosen, `${toSeed(seed)}:session`);
};

/**
 * topicBankSlice — every bank entry belonging to one topic, in teaching order.
 * Pure: a filtered view of the bank, never mutated.
 *
 * @param {string} topicId             curriculum topic id (`entry.topicId`).
 * @param {Array}  [bank=REVIEW_BANK]  source list (override for tests).
 * @returns {Array} the topic's bank entries (possibly empty).
 */
export const topicBankSlice = (topicId, bank = REVIEW_BANK) =>
	sliceTopicEntries(topicId, bank);

/**
 * buildTopicQueue — the spaced-retrieval queue for ONE topic, for the revision
 * plan's one-click "drill this day" launch.
 *
 * This is the per-topic analogue of how /review builds its session: it reuses the
 * SAME scheduler (planSession) over the topic-filtered bank slice, so the due /
 * fresh split, ordering (most-overdue first, then a capped trickle of new), and
 * card contract are identical to the whole-course queue — no bespoke scheduling.
 * The only scoping change is the candidate set (one topic) and the eligibility
 * gate: a plan day is an explicit "drill THIS topic" intent, so every fresh card
 * in the topic is eligible (no isNewEligible "visited" gate — clicking IS the
 * signal). Grading the returned entries through useSrs.grade reschedules exactly
 * the cards that buildRevisionPlan reads to rank tomorrow's plan.
 *
 * Pure: reads `cards` + `bank`, returns a plan; mutates nothing.
 *
 * @param {object} args
 * @param {string} args.topicId            curriculum topic id to scope to.
 * @param {Record<string,object>} args.cards  the SRS schedule (useSrs cards).
 * @param {number} args.now                ms epoch "now" (drives due math).
 * @param {number} [args.newCap]           max never-seen cards to introduce.
 * @param {Array}  [args.bank=REVIEW_BANK] source bank (override for tests).
 * @returns {{queue:Array, dueCount:number, freshCount:number,
 *            freshAvailable:number, scheduledCount:number, available:number}}
 *          available = total bank entries for the topic (queue ≤ available).
 */
export const buildTopicQueue = ({
	topicId,
	cards,
	now = 0,
	newCap,
	bank = REVIEW_BANK,
} = {}) => {
	return buildQueueFromEntries({ topicId, cards, now, newCap, bank });
};

export default REVIEW_BANK;
