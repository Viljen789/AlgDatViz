import { useCallback, useMemo, useState } from 'react';
import { TOPIC_BY_ID } from '../data/curriculum.js';
import useProgress from '../hooks/useProgress.js';
import TopicTemplate from '../common/TopicTemplate/index.js';
import { checkAnswer } from '../common/TopicTemplate/checkAnswer.js';
import HeapStage from '../components/Heaps/HeapStage.jsx';
import HeapPlayground from '../components/Heaps/HeapPlayground.jsx';
import { SCENES, BUILD_OPS, INSERT_OPS } from '../components/Heaps/scenes.js';

const TOPIC_ID = 'heaps';

const initialCheckStates = () =>
	Object.fromEntries(SCENES.map(scene => [scene.id, {}]));

// Cheat-sheet: the revision-layer recap a learner can flip open mid-scroll.
// Tokens/text only — every number is measured by the pure generators.
const CHEAT_SHEET = {
	keyIdea:
		'A binary max-heap is a complete tree stored flat in an array, where every parent ≥ its children. The maximum is always A[0], so a heap is a fast priority queue: peek is O(1), insert and extract-max are O(log n).',
	sections: [
		{
			title: 'Heap as array (0-based)',
			items: [
				{
					term: 'children of i',
					def: 'left = 2i+1, right = 2i+2. The tree is implicit in the indices — no pointers.',
				},
				{
					term: 'parent of i',
					def: '⌊(i−1)/2⌋. Floor-division folds two siblings onto one parent.',
				},
				{
					term: 'max-heap property',
					def: 'A[parent] ≥ A[child] everywhere ⇒ the largest element is the root, A[0].',
				},
			],
		},
		{
			title: 'Operations',
			items: [
				{
					term: 'insert — O(log n)',
					def: 'Append at the last leaf, then sift up: swap with the parent while larger.',
				},
				{
					term: 'extract-max — O(log n)',
					def: 'Return A[0], move the last leaf to the root, shrink, then sift down.',
				},
				{
					term: 'peek — O(1)',
					def: 'The maximum is always A[0]; no work needed to read it.',
				},
			],
		},
		{
			title: 'Build & priority queue',
			items: [
				{
					term: 'Build-Max-Heap — O(n)',
					def: `Heapify internal nodes bottom-up (i = ⌊n/2⌋−1 down to 0). NOT O(n log n): on the same elements bottom-up build did ${BUILD_OPS} ops vs ${INSERT_OPS} for inserting one-by-one.`,
				},
				{
					term: 'priority queue',
					def: 'Always hand back the best element next. A heap is its efficient implementation.',
				},
				{
					term: 'heapsort',
					def: 'Build-Max-Heap, then repeatedly extract-max into the freed tail → O(n log n), in place.',
				},
			],
		},
	],
};

/**
 * HeapsPage — the Heaps & priority queues topic on the canonical TopicTemplate.
 *
 * Hero → concept scrolly (heap property, heap-as-array dual view + index math,
 * sift/insert/extract, priority queue, and the E1 Build-O(n)-vs-insert-O(n log n)
 * snubletråd) with a retrieval check per scene → the interactive HeapPlayground
 * (insert / extract-max / build-heap on the shared PlaybackEngine, synced
 * pseudocode + live state). Default export; topicId "heaps" so the orchestrator
 * wires <Route path="/heaps">.
 */
const HeapsPage = () => {
	const { markVisited, markCompleted } = useProgress();
	const [checkStates, setCheckStates] = useState(initialCheckStates);

	const topic = TOPIC_BY_ID[TOPIC_ID];

	// Generic submit for every check kind — grading delegated to the pure
	// checkAnswer core so numeric / choice / classify / predict all grade alike.
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
		activeScene => <HeapStage activeScene={activeScene} />,
		[]
	);

	const handlePlaygroundInteract = useCallback(() => {
		markCompleted(TOPIC_ID);
	}, [markCompleted]);

	const renderPlayground = useCallback(
		() => <HeapPlayground onUserInteract={handlePlaygroundInteract} />,
		[handlePlaygroundInteract]
	);

	const handleVisit = useCallback(() => {
		markVisited(TOPIC_ID);
	}, [markVisited]);

	const eyebrow = useMemo(
		() =>
			`${topic?.number ?? '08'} · ${topic?.name ?? 'Heaps & priority queues'} · Heaps`,
		[topic]
	);

	return (
		<TopicTemplate
			topicId={TOPIC_ID}
			eyebrow={eyebrow}
			title="A tree flattened into an array. The best element, always on top."
			lede="A max-heap keeps every parent above its children, so the maximum is one lookup away — and the whole tree lives in a flat array addressed by arithmetic. Follow the story scene by scene, answer each check, then build, insert, and drain a heap yourself."
			scenes={SCENES}
			renderStage={renderStage}
			checkStates={checkStates}
			onAnswer={handleAnswer}
			cheatSheet={CHEAT_SHEET}
			playgroundEyebrow="Sandbox"
			playgroundTitle="Now your turn. Insert, extract, build."
			playgroundLede="Run insert, extract-max, and Build-heap on a live max-heap. Watch the same node light up in the tree and the backing array, the sift path glow, and the comparison count climb. Use space, the arrow keys, or the controls — and the scenario chips to load a tricky heap."
			renderPlayground={renderPlayground}
			onVisit={handleVisit}
		/>
	);
};

export default HeapsPage;
