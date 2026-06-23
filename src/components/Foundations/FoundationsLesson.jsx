import { useCallback, useMemo, useState } from 'react';
import { TOPIC_BY_ID } from '../../data/curriculum.js';
import useProgress from '../../hooks/useProgress.js';
import TopicTemplate, {
	checkAnswer,
} from '../../common/TopicTemplate/index.js';
import FoundationsStage from './FoundationsStage.jsx';
import FoundationsPlayground from './FoundationsPlayground.jsx';
import { SCENES } from './scenes.js';
import { CHEAT_SHEET } from './foundationsMeta.js';

const TOPIC_ID = 'foundations';

const initialCheckStates = () =>
	Object.fromEntries(SCENES.map(scene => [scene.id, {}]));

/**
 * FoundationsLesson — the complexity primer (#01) on the canonical TopicTemplate.
 * It comes before every data structure: what "cost" means, counting the work in
 * code, the O/Ω/Θ bounds, the growth-rate race, and best/worst/average +
 * amortized cost. Recurrences live in the Master Theorem topic.
 */
const FoundationsLesson = () => {
	const { markVisited, markCompleted } = useProgress();
	const [checkStates, setCheckStates] = useState(initialCheckStates);

	const topic = TOPIC_BY_ID[TOPIC_ID];

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
		// The second arg is the template's opt-in reveal gate: revealHeld is true
		// while the race scene's predict check is still unanswered, so the stage
		// holds its honest bare-axes frame instead of plotting the curves (and
		// spoiling which class wins). Defaults keep it safe if a caller passes
		// only the scene — the other 14 lessons ignore the 2nd arg.
		(activeScene, { revealHeld = false } = {}) => (
			<FoundationsStage activeScene={activeScene} holdReveal={revealHeld} />
		),
		[]
	);

	const handlePlaygroundInteract = useCallback(() => {
		markCompleted(TOPIC_ID);
	}, [markCompleted]);

	const renderPlayground = useCallback(
		() => <FoundationsPlayground onUserInteract={handlePlaygroundInteract} />,
		[handlePlaygroundInteract]
	);

	const handleVisit = useCallback(() => {
		markVisited(TOPIC_ID);
	}, [markVisited]);

	const eyebrow = useMemo(
		() => `${topic?.number ?? '01'} · ${topic?.name ?? 'Foundations'}`,
		[topic]
	);

	return (
		<TopicTemplate
			topicId={TOPIC_ID}
			accent={topic?.accent}
			eyebrow={eyebrow}
			title="How much does an algorithm cost?"
			lede="Before any data structure, one question runs underneath everything: as the input grows, how fast does the work grow? Complexity is the lens you'll point at every algorithm after this — built up one idea at a time. Each scene ends with a quick check; answer it, then keep scrolling."
			scenes={SCENES}
			renderStage={renderStage}
			checkStates={checkStates}
			onAnswer={handleAnswer}
			cheatSheet={CHEAT_SHEET}
			playgroundEyebrow="Playground"
			playgroundTitle="Feel the classes diverge."
			playgroundLede="Slide the input size and watch each complexity class compute its step count. The bars are log-scaled, so you can see O(2ⁿ) run away while O(log n) barely moves — the whole reason the dominant term is all that matters at scale."
			playgroundLabel="Skip to playground"
			onVisit={handleVisit}
			renderPlayground={renderPlayground}
		/>
	);
};

export default FoundationsLesson;
