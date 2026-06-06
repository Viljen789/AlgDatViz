import { useCallback, useMemo, useState } from 'react';
import { TOPIC_BY_ID } from '../../data/curriculum.js';
import useProgress from '../../hooks/useProgress.js';
import TopicTemplate from '../../common/TopicTemplate/index.js';
import MasterTheoremStage from './MasterTheoremStage.jsx';
import MasterTheoremPlayground from './MasterTheoremPlayground.jsx';
import { SCENES } from './scenes.js';
import { EXAMPLES } from './masterMath.js';

const TOPIC_ID = 'master-theorem';

const initialCheckStates = () =>
	Object.fromEntries(SCENES.map(scene => [scene.id, {}]));

/**
 * MasterTheoremLesson — the gold-standard Master Theorem experience, built on
 * TopicTemplate. It supplies the recursion-tree stage, the scrolly scenes with
 * comprehension checks, and the engine-driven playground; the template owns all
 * page structure (hero, scrolly, playground frame, breadcrumbs, up-next).
 */
const MasterTheoremLesson = () => {
	const { markVisited, markCompleted } = useProgress();
	const [checkStates, setCheckStates] = useState(initialCheckStates);
	// Merge sort is the running example throughout the lesson, so the playground
	// opens on it for continuity.
	const [params, setParams] = useState(EXAMPLES[0]);

	const topic = TOPIC_BY_ID[TOPIC_ID];

	const handleChoiceAnswer = useCallback((sceneId, value) => {
		const scene = SCENES.find(s => s.id === sceneId);
		if (!scene) return;
		const isCorrect = value === scene.check.answer;
		setCheckStates(prev => ({
			...prev,
			[sceneId]: {
				selected: value,
				status: isCorrect ? 'correct' : 'incorrect',
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
		activeScene => <MasterTheoremStage activeScene={activeScene} />,
		[]
	);

	const renderPlayground = useCallback(
		() => (
			<MasterTheoremPlayground
				params={params}
				onParamsChange={setParams}
				onUserInteract={handlePlaygroundInteract}
			/>
		),
		[params, handlePlaygroundInteract]
	);

	const eyebrow = useMemo(
		() =>
			`${topic?.number ?? '03'} · ${topic?.navLabel ?? 'Master theorem'}`,
		[topic]
	);

	return (
		<TopicTemplate
			topicId={TOPIC_ID}
			eyebrow={eyebrow}
			title="Find where the recursion piles up its work."
			lede="A problem that calls smaller copies of itself draws a tree. The Master Theorem is a single comparison that tells you which part of that tree carries the cost — the leaves, every level, or the root. Answer each check, then keep scrolling."
			scenes={SCENES}
			renderStage={renderStage}
			checkStates={checkStates}
			onChoiceAnswer={handleChoiceAnswer}
			playgroundEyebrow="Sandbox"
			playgroundTitle="Set a, b, f(n). Watch the tree reveal."
			playgroundLede="Step the recursion tree open one level at a time and watch the leaves-vs-combine work shift the dominant side. Use space, the arrow keys, or the controls. Try the preset recurrences to see all three cases."
			renderPlayground={renderPlayground}
			onVisit={handleVisit}
		/>
	);
};

export default MasterTheoremLesson;
