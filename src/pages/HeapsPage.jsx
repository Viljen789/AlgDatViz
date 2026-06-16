import { useCallback, useMemo, useState } from 'react';
import { TOPIC_BY_ID } from '../data/curriculum.js';
import useProgress from '../hooks/useProgress.js';
import TopicTemplate from '../common/TopicTemplate/index.js';
import { checkAnswer } from '../common/TopicTemplate/checkAnswer.js';
import HeapStage from '../components/Heaps/HeapStage.jsx';
import HeapPlayground from '../components/Heaps/HeapPlayground.jsx';
import { SCENES, BUILD_OPS, INSERT_OPS } from '../components/Heaps/scenes.js';

const TOPIC_ID = 'heaps';

// The heap-as-array scene is the one host-graded 'pair' check: the learner
// selects two nodes on the stage. Seed it with an empty selection so the stage
// and LessonCheck's PairProgress start in the "make a selection" state.
const initialCheckStates = () =>
	Object.fromEntries(
		SCENES.map(scene => [
			scene.id,
			scene.check?.kind === 'pair' ? { selected: [] } : {},
		])
	);

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

	// Generic submit for every SELF-graded check kind — grading delegated to the
	// pure checkAnswer core so numeric / choice / classify / predict grade alike.
	// The 'pair' check is host-graded on the stage (handleNodeClick), so it is
	// skipped here: checkAnswer returns { correct: null } for it.
	const handleAnswer = useCallback((sceneId, payload) => {
		const scene = SCENES.find(s => s.id === sceneId);
		if (!scene) return;
		const result = checkAnswer(scene.check, payload);
		if (result.correct == null) return; // pair / unknown — graded on the stage.
		setCheckStates(prev => ({
			...prev,
			[sceneId]: {
				...result,
				status: result.correct ? 'correct' : 'incorrect',
			},
		}));
	}, []);

	// The single host-graded scene: the 'pair' index-relation check on the heap.
	const pairScene = useMemo(
		() => SCENES.find(s => s.check?.kind === 'pair') || null,
		[]
	);

	// Pair-check: the learner clicks two nodes on the stage. The first click sets
	// node A; the next distinct click forms the pair and is graded by the scene's
	// own validator (the pure 2i+1 relation). Locks once a status is set — wrong
	// pairs still lock and reveal the example, never re-grade. Mirrors the merge-
	// sort stage's host-grading exactly, but selects nodes instead of bars.
	const handleNodeClick = useCallback(
		nodeIndex => {
			if (!pairScene) return;
			setCheckStates(prev => {
				const current = prev[pairScene.id] || { selected: [] };
				if (current.status) return prev; // already graded — locked.
				const sel = current.selected || [];
				if (sel.length === 0) {
					return { ...prev, [pairScene.id]: { selected: [nodeIndex] } };
				}
				if (sel.length === 1) {
					if (sel[0] === nodeIndex) return prev; // same node — ignore.
					const pair = [sel[0], nodeIndex].sort((a, b) => a - b);
					const isCorrect = pairScene.check.validate(pair);
					return {
						...prev,
						[pairScene.id]: {
							selected: pair,
							status: isCorrect ? 'correct' : 'incorrect',
						},
					};
				}
				return prev;
			});
		},
		[pairScene]
	);

	// Derive the stage's pair-interaction props from the active scene's state.
	const stageInteractionFor = useCallback(
		activeScene => {
			const scene = SCENES[activeScene];
			if (scene?.check?.kind !== 'pair') {
				return {
					interactionMode: null,
					selectedNodes: [],
					exampleNodes: [],
					answerStatus: null,
				};
			}
			const cs = checkStates[scene.id] || { selected: [] };
			return {
				interactionMode: 'pair',
				selectedNodes: cs.selected || [],
				exampleNodes:
					cs.status === 'incorrect' ? scene.check.exampleCorrectPair : [],
				answerStatus: cs.status || null,
			};
		},
		[checkStates]
	);

	const renderStage = useCallback(
		activeScene => {
			const interaction = stageInteractionFor(activeScene);
			return (
				<HeapStage
					activeScene={activeScene}
					interactionMode={interaction.interactionMode}
					selectedNodes={interaction.selectedNodes}
					exampleNodes={interaction.exampleNodes}
					answerStatus={interaction.answerStatus}
					onNodeClick={handleNodeClick}
				/>
			);
		},
		[stageInteractionFor, handleNodeClick]
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
