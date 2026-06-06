import { useCallback, useMemo, useState } from 'react';
import { TOPIC_BY_ID } from '../../data/curriculum.js';
import useProgress from '../../hooks/useProgress.js';
import TopicTemplate from '../../common/TopicTemplate/index.js';
import StacksQueuesStage from './StacksQueuesStage.jsx';
import StacksQueuesPlayground from './StacksQueuesPlayground.jsx';
import { SCENES } from './scenes.js';

const TOPIC_ID = 'stacks-queues';

const initialCheckStates = () =>
	Object.fromEntries(SCENES.map(scene => [scene.id, {}]));

/**
 * StacksQueuesLesson — the Stacks & Queues topic on the canonical TopicTemplate.
 * It supplies only the concept scenes, the synchronized stage, the comprehension
 * checks and the interactive playground; all page structure (hero, scrolly,
 * breadcrumbs, up-next) comes from the template, and every visual token comes
 * from theme.css via the topic accent.
 */
const StacksQueuesLesson = () => {
	const { markVisited, markCompleted } = useProgress();
	const [checkStates, setCheckStates] = useState(initialCheckStates);

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

	const renderStage = useCallback(
		activeScene => <StacksQueuesStage activeScene={activeScene} />,
		[]
	);

	const handlePlaygroundInteract = useCallback(() => {
		markCompleted(TOPIC_ID);
	}, [markCompleted]);

	const renderPlayground = useCallback(
		() => <StacksQueuesPlayground onUserInteract={handlePlaygroundInteract} />,
		[handlePlaygroundInteract]
	);

	const handleVisit = useCallback(() => {
		markVisited(TOPIC_ID);
	}, [markVisited]);

	const eyebrow = useMemo(
		() =>
			`${topic?.number ?? '02'} · ${topic?.name ?? 'Stacks & queues'} · LIFO vs FIFO`,
		[topic]
	);

	return (
		<TopicTemplate
			topicId={TOPIC_ID}
			accent={topic?.accent}
			eyebrow={eyebrow}
			title="Two rules for what to do next."
			lede="A stack and a queue are the two simplest ways to decide which pending piece of work to handle first. The only difference is the end you remove from — and that one choice ripples through every algorithm built on top. Each scene ends with a quick check; answer it, then keep scrolling."
			scenes={SCENES}
			renderStage={renderStage}
			checkStates={checkStates}
			onChoiceAnswer={handleChoiceAnswer}
			playgroundEyebrow="Playground"
			playgroundTitle="Now your turn. Push, pop, enqueue, dequeue — then replay it."
			playgroundLede="Switch between stack and queue and run operations. Each one is recorded onto a timeline, so you can step back, scrub, or replay the whole run with the controls below — try the same operations in both modes and watch the order flip."
			playgroundLabel="Skip to playground"
			onVisit={handleVisit}
			renderPlayground={renderPlayground}
		/>
	);
};

export default StacksQueuesLesson;
