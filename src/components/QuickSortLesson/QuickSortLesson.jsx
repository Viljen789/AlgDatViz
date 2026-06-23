import { useCallback, useMemo, useState } from 'react';
import { TOPIC_BY_ID } from '../../data/curriculum.js';
import useProgress from '../../hooks/useProgress.js';
import TopicTemplate, {
	checkAnswer,
} from '../../common/TopicTemplate/index.js';
import QuickSortStage from './QuickSortStage.jsx';
import QuickSortPlayground from './QuickSortPlayground.jsx';
import { SCENES } from './scenes.js';

const TOPIC_ID = 'quicksort';

const initialCheckStates = () =>
	Object.fromEntries(SCENES.map(scene => [scene.id, {}]));

/**
 * QuickSortLesson — the scroll-driven quicksort lesson, built on the same
 * TopicTemplate shell as the merge-sort lesson. It supplies the partition
 * visualization (driven HONESTLY by the shared frame generator), the scenes +
 * retrieval checks, and a step/scrub/replay playground.
 *
 * Quicksort is Lomuto partition with the pivot = the last element (the CLRS
 * variant, matching the synced pseudocode). The arc: partition -> the pivot
 * snaps to its final index -> recurse on the two sides -> why a bad pivot is
 * quadratic -> the worst-case recurrence T(n) = T(n-1) + n, set beside the
 * balanced 2T(n/2) + n that the Master Theorem resolves to Theta(n log n).
 */
const QuickSortLesson = () => {
	const { markVisited, markCompleted } = useProgress();
	const [checkStates, setCheckStates] = useState(initialCheckStates);

	const topic = TOPIC_BY_ID[TOPIC_ID];

	// Generic submit for every check kind (choice / numeric / order). Grading is
	// the shared, pure checkAnswer; this host only records the result so
	// LessonCheck can render the answered state. Wrong answers still reveal the
	// explanation (the template shows it whenever a status is set).
	const handleAnswer = useCallback((sceneId, payload) => {
		const scene = SCENES.find(s => s.id === sceneId);
		if (!scene || !scene.check) return;
		const result = checkAnswer(scene.check, payload);
		if (result.correct == null) return;
		setCheckStates(prev => ({
			...prev,
			[sceneId]: {
				selected: result.selected,
				value: result.value,
				order: result.order,
				status: result.correct ? 'correct' : 'incorrect',
			},
		}));
	}, []);

	const handlePlaygroundInteract = useCallback(() => {
		markCompleted(TOPIC_ID);
	}, [markCompleted]);

	const handleVisit = useCallback(() => {
		markVisited(TOPIC_ID);
	}, [markVisited]);

	const renderStage = useCallback(
		// The second arg is the template's opt-in reveal gate: revealHeld is true
		// while the partition scene's predict check is still unanswered, so the stage
		// holds its honest pre-partition frame instead of auto-playing the sweep (and
		// spoiling the prediction). Defaults keep it safe if a caller passes only the
		// scene. Mirrors MergeSortLesson.
		(activeScene, { revealHeld = false } = {}) => (
			<QuickSortStage activeScene={activeScene} holdReveal={revealHeld} />
		),
		[]
	);

	const renderPlayground = useCallback(
		() => <QuickSortPlayground onUserInteract={handlePlaygroundInteract} />,
		[handlePlaygroundInteract]
	);

	const eyebrow = useMemo(
		() => `${topic?.number ?? '05'} · ${topic?.name ?? 'Sorting'} · Quicksort`,
		[topic]
	);

	const cheatSheet = useMemo(
		() => ({
			keyIdea:
				'Partition the range around a pivot in one linear pass: smaller left, larger right, the pivot lands in its final slot. Then recurse on the two sides. The split is the whole algorithm; the pivot choice decides whether you get n log n or n squared.',
			sections: [
				{
					title: 'Quicksort at a glance',
					items: [
						{
							term: 'Recurrence (avg)',
							def: 'T(n) = 2T(n/2) + Θ(n) = Θ(n log n) — the Master Theorem tie case, same as merge sort.',
						},
						{
							term: 'Recurrence (worst)',
							def: 'T(n) = T(n − 1) + Θ(n) = Θ(n²) — a lopsided split, one side empty.',
						},
						{
							term: 'Worst case when',
							def: 'The pivot is always the min or max — e.g. a last-element pivot on already-sorted input.',
						},
						{
							term: 'In place?',
							def: 'Yes. Partition rearranges within the array; only O(log n) stack space on average.',
						},
						{
							term: 'Stable',
							def: 'No. Swaps across the array can reorder equal keys.',
						},
						{
							term: 'Partition',
							def: 'Lomuto: i is the boundary of "below pivot", j sweeps. One pass, n − 1 comparisons.',
						},
					],
				},
				{
					title: 'Versus the alternatives',
					items: [
						{
							term: 'vs merge sort',
							def: 'Same Θ(n log n) average, but merge sort GUARANTEES it; quicksort can hit Θ(n²). Quicksort is in place; merge sort is stable and needs Θ(n) aux.',
						},
						{
							term: 'Taming the worst case',
							def: 'Randomize the pivot or use median-of-three, so no fixed input is the adversary. Expected time becomes Θ(n log n) regardless of order.',
						},
						{
							term: 'Why it is fast in practice',
							def: 'In-place partitioning has great cache locality and a tiny constant factor, so it often beats merge sort on real data despite the worse bound.',
						},
					],
				},
			],
		}),
		[]
	);

	return (
		<TopicTemplate
			topicId={TOPIC_ID}
			eyebrow={eyebrow}
			title="Quicksort partitions, then recurses."
			lede="Watch one partition pass place its pivot for good, then see the recursion fork into the two sides. Each scene ends with a quick check — answer it, then keep scrolling."
			scenes={SCENES}
			renderStage={renderStage}
			cheatSheet={cheatSheet}
			checkStates={checkStates}
			onAnswer={handleAnswer}
			playgroundEyebrow="Sandbox"
			playgroundTitle="Now your turn. Step, scrub, replay."
			playgroundLede="A fresh random array, the actual partition. Use space, the arrow keys, or the controls below. Watch each pivot snap into its final slot, and the live pseudocode track the pointers."
			onVisit={handleVisit}
			renderPlayground={renderPlayground}
		/>
	);
};

export default QuickSortLesson;
