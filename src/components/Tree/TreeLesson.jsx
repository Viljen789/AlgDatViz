import { useCallback, useMemo, useState } from 'react';
import { TOPIC_BY_ID } from '../../data/curriculum.js';
import useProgress from '../../hooks/useProgress.js';
import TopicTemplate from '../../common/TopicTemplate/index.js';
import { checkAnswer } from '../../common/TopicTemplate/checkAnswer.js';
import TreeStage from './TreeStage.jsx';
import TreePlayground from './TreePlayground.jsx';
import { SCENES } from './scenes.js';
import { TREE_CHEAT_SHEET } from './treeCheatSheet.js';

const TOPIC_ID = 'trees';

const initialCheckStates = () =>
	Object.fromEntries(SCENES.map(scene => [scene.id, {}]));

/**
 * TreeLesson — the Trees topic experience on the canonical TopicTemplate. It
 * supplies only the BST scrolly stage, the concept scenes + comprehension
 * checks, and the interactive playground; all page structure (hero, scrolly,
 * playground frame, breadcrumbs, up-next) comes from the template, and every
 * visual token from theme.css.
 */
const TreeLesson = () => {
	const { markVisited, markCompleted } = useProgress();
	const [checkStates, setCheckStates] = useState(initialCheckStates);

	const topic = TOPIC_BY_ID[TOPIC_ID];

	// Generic submit for every check kind. Grading delegates to the shared pure
	// `checkAnswer`, so choice / predict / order all grade correctly without the
	// page re-implementing per-kind logic; the result is mapped to the controlled
	// state shape LessonCheck reads back.
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
		activeScene => <TreeStage activeScene={activeScene} />,
		[]
	);

	const handlePlaygroundInteract = useCallback(() => {
		markCompleted(TOPIC_ID);
	}, [markCompleted]);

	const renderPlayground = useCallback(
		() => <TreePlayground onUserInteract={handlePlaygroundInteract} />,
		[handlePlaygroundInteract]
	);

	const handleVisit = useCallback(() => {
		markVisited(TOPIC_ID);
	}, [markVisited]);

	const eyebrow = useMemo(
		() =>
			`${topic?.number ?? '06'} · ${topic?.name ?? 'Trees'} · Binary search trees`,
		[topic]
	);

	return (
		<TopicTemplate
			topicId={TOPIC_ID}
			eyebrow={eyebrow}
			title="One invariant turns every comparison into a direction."
			lede="A binary search tree keeps smaller values left and larger values right — at every node. That single rule is why a search can throw away half the tree on each step. Answer the check at the end of each scene, then keep scrolling."
			scenes={SCENES}
			renderStage={renderStage}
			checkStates={checkStates}
			onAnswer={handleAnswer}
			cheatSheet={TREE_CHEAT_SHEET}
			playgroundEyebrow="Sandbox"
			playgroundTitle="Now your turn. Insert, search, delete, traverse."
			playgroundLede="The real BST. Pick an operation, give it a value, and watch the algorithm compare and descend — step, scrub, or replay with space and the arrow keys."
			onVisit={handleVisit}
			renderPlayground={renderPlayground}
		/>
	);
};

export default TreeLesson;
