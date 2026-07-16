import assert from 'node:assert/strict';
import test from 'node:test';

import { TOPIC_BY_ID } from '../../data/curriculum.js';
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
import { REVIEW_BANK } from './reviewBank.js';
import {
	buildTopicQueue,
	buildTopicReviewEntries,
} from './topicReview.js';

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

test('lesson-local entries equal every canonical topic bank slice', () => {
	for (const [topicId, scenes] of Object.entries(SCENES_BY_TOPIC)) {
		const local = buildTopicReviewEntries({
			topic: TOPIC_BY_ID[topicId],
			scenes,
		});
		const canonical = REVIEW_BANK.filter(entry => entry.topicId === topicId);
		assert.deepEqual(
			local,
			canonical,
			`${topicId} keeps identical ids, metadata, ordering, and check references`
		);
	}
});

test('the lightweight queue schedules a lesson-local slice without a full-bank default', () => {
	const topicId = 'sorting';
	const bank = buildTopicReviewEntries({
		topic: TOPIC_BY_ID[topicId],
		scenes: sortingScenes,
	});
	const plan = buildTopicQueue({ topicId, cards: {}, now: 0, bank });

	assert.equal(plan.available, bank.length);
	assert.ok(plan.queue.length > 0);
	assert.ok(plan.queue.every(entry => entry.topicId === topicId));
	assert.deepEqual(
		buildTopicQueue({ topicId, cards: {}, now: 0 }).queue,
		[],
		'lightweight callers must pass an explicit local or canonical entry list'
	);
});
