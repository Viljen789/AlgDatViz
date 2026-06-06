import { useCallback, useMemo, useState } from 'react';
import { TOPIC_BY_ID } from '../data/curriculum.js';
import useProgress from '../hooks/useProgress.js';
import TopicTemplate from '../common/TopicTemplate/index.js';
import { checkAnswer } from '../common/TopicTemplate/checkAnswer.js';
import LinearTimeSortingStage from '../components/LinearTimeSorting/LinearTimeSortingStage.jsx';
import LinearTimeSortingPlayground from '../components/LinearTimeSorting/LinearTimeSortingPlayground.jsx';
import { SCENES, TREE_BOUND } from '../components/LinearTimeSorting/scenes.js';

const TOPIC_ID = 'linear-time-sorting';

const initialCheckStates = () =>
	Object.fromEntries(SCENES.map(scene => [scene.id, {}]));

// Cheat-sheet: the revision-layer recap a learner can flip open mid-scroll.
// Tokens/text only — costs + assumptions + the lower bound + the stability rule.
const CHEAT_SHEET = {
	keyIdea:
		'Comparison sorts are bounded below by Ω(n log n) because they are decision trees needing n! leaves. Counting, radix, and bucket beat that bound by NOT comparing — they use keys as indices or distribute by range — but only when the keys cooperate.',
	sections: [
		{
			title: 'The comparison lower bound',
			items: [
				{
					term: 'decision tree',
					def: 'Any comparison sort is a binary tree: each node is one comparison, each leaf a sorted order. Sorting n distinct items needs ≥ n! leaves.',
				},
				{
					term: 'Ω(n log n)',
					def: `A height-h binary tree has ≤ 2^h leaves, so 2^h ≥ n! ⟹ h ≥ log₂(n!) = Ω(n log n). For n = 3: ⌈log₂ ${TREE_BOUND.leaves}⌉ = ${TREE_BOUND.minComparisons} comparisons.`,
				},
			],
		},
		{
			title: 'Linear-time sorts (cost + assumption)',
			items: [
				{
					term: 'counting sort',
					def: 'O(n + k). Tally each value (value = index), replay low → high. Needs a small value range k. Stable.',
				},
				{
					term: 'radix sort',
					def: 'O(d·(n + k)). Sort by each digit LSD-first with a stable counting pass. Needs bounded digit width d.',
				},
				{
					term: 'bucket sort',
					def: 'O(n) expected. Distribute by range into m buckets, sort each, concatenate. Needs a roughly uniform spread.',
				},
			],
		},
		{
			title: 'Stability',
			items: [
				{
					term: 'definition',
					def: 'A sort is stable if records with equal keys keep their input order.',
				},
				{
					term: 'why radix needs it',
					def: 'LSD radix relies on each per-digit pass preserving the order won by earlier passes. An unstable pass reorders equal digits and corrupts the final result.',
				},
			],
		},
	],
};

/**
 * LinearTimeSortingPage — the Linear-time sorting topic on the TopicTemplate.
 *
 * Hero → concept scrolly (the comparison lower bound via the decision-tree
 * argument → counting / radix / bucket sort → stability → assumptions) with an
 * inline retrieval check per scene → the interactive playground running the
 * three comparison-free sorts on the shared PlaybackEngine with synced
 * pseudocode + live state. Route /linear-time-sorting, default export.
 */
const LinearTimeSortingPage = () => {
	const { markVisited, markCompleted } = useProgress();
	const [checkStates, setCheckStates] = useState(initialCheckStates);

	const topic = TOPIC_BY_ID[TOPIC_ID];

	// Generic submit for every check kind. Grading is delegated to the pure
	// checkAnswer core, so the numeric / predict / classify retrieval checks are
	// graded exactly like the choice checks.
	const handleAnswer = useCallback((sceneId, payload) => {
		const scene = SCENES.find(s => s.id === sceneId);
		if (!scene) return;
		const result = checkAnswer(scene.check, payload);
		setCheckStates(prev => ({
			...prev,
			[sceneId]: {
				...result,
				status: result.correct ? 'correct' : 'incorrect',
			},
		}));
	}, []);

	const renderStage = useCallback(
		activeScene => <LinearTimeSortingStage activeScene={activeScene} />,
		[]
	);

	const handlePlaygroundInteract = useCallback(() => {
		markCompleted(TOPIC_ID);
	}, [markCompleted]);

	const renderPlayground = useCallback(
		() => <LinearTimeSortingPlayground onUserInteract={handlePlaygroundInteract} />,
		[handlePlaygroundInteract]
	);

	const handleVisit = useCallback(() => {
		markVisited(TOPIC_ID);
	}, [markVisited]);

	const eyebrow = useMemo(
		() =>
			`${topic?.number ?? '05'} · ${topic?.name ?? 'Linear-time sorting'} · Beat n log n`,
		[topic]
	);

	return (
		<TopicTemplate
			topicId={TOPIC_ID}
			accent={topic?.accent}
			eyebrow={eyebrow}
			title="Beat n log n by not comparing at all."
			lede="Every comparison sort hits an Ω(n log n) wall — it is a decision tree that must reach n! leaves. Counting, radix, and bucket sort step around the wall by using keys as indices instead of comparing them. Follow the argument scene by scene, answer each check, then sort live."
			scenes={SCENES}
			renderStage={renderStage}
			checkStates={checkStates}
			onAnswer={handleAnswer}
			cheatSheet={CHEAT_SHEET}
			playgroundEyebrow="Sandbox"
			playgroundTitle="Now your turn. Sort without a single comparison."
			playgroundLede="Run counting, radix, and bucket sort on a live array. Watch values become indices, digits get sorted pass by pass, and buckets fill — with the pseudocode line and live state moving in lockstep. Use space, the arrow keys, or the controls; shuffle for a new array."
			renderPlayground={renderPlayground}
			onVisit={handleVisit}
		/>
	);
};

export default LinearTimeSortingPage;
