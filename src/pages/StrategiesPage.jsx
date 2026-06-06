import { useCallback, useMemo, useState } from 'react';
import { TOPIC_BY_ID } from '../data/curriculum.js';
import useProgress from '../hooks/useProgress.js';
import TopicTemplate from '../common/TopicTemplate/index.js';
import { checkAnswer } from '../common/TopicTemplate/checkAnswer.js';
import StrategiesStage from '../components/Strategies/StrategiesStage.jsx';
import StrategiesDashboard from '../components/Strategies/StrategiesDashboard.jsx';
import { SCENES } from '../components/Strategies/scenes.js';
import { STRATEGIES_CHEAT_SHEET } from '../components/Strategies/strategiesMeta.js';

const TOPIC_ID = 'strategies';

const initialCheckStates = () =>
	Object.fromEntries(SCENES.map(scene => [scene.id, {}]));

/**
 * StrategiesPage — the Strategies topic on the canonical TopicTemplate.
 *
 * The template owns all page structure (hero, scrolly, playground, breadcrumbs,
 * up-next). This page supplies the concept scenes (when a greedy choice is
 * provably safe vs when you need DP), a synchronized stage that reacts to the
 * active scene, the comprehension checks, and the multi-canvas playground driven
 * by the shared playback engine.
 */
const StrategiesPage = () => {
	const { markVisited, markCompleted } = useProgress();
	const [checkStates, setCheckStates] = useState(initialCheckStates);

	const topic = TOPIC_BY_ID[TOPIC_ID];

	// Generic submit for every check kind (choice / classify / spotbug / …).
	// Grading is delegated to the pure checkAnswer module so the page never
	// re-implements it; the full result is stored so kind-specific UI (e.g.
	// per-item correctness for classify) has what it needs.
	const handleAnswer = useCallback((sceneId, payload) => {
		const scene = SCENES.find(s => s.id === sceneId);
		if (!scene?.check) return;
		const result = checkAnswer(scene.check, payload);
		setCheckStates(prev => ({
			...prev,
			[sceneId]: {
				...result,
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
		activeScene => <StrategiesStage activeScene={activeScene} />,
		[]
	);

	const renderPlayground = useCallback(
		() => <StrategiesDashboard onUserInteract={handlePlaygroundInteract} />,
		[handlePlaygroundInteract]
	);

	const eyebrow = useMemo(
		() => `${topic?.number ?? '08'} · ${topic?.name ?? 'Strategies'}`,
		[topic]
	);

	return (
		<TopicTemplate
			topicId={TOPIC_ID}
			eyebrow={eyebrow}
			title="Remember everything, or commit to one move?"
			lede="Greedy takes the best-looking step right now. Dynamic programming refuses to commit and builds from every subproblem it has solved. The skill is knowing which is safe — each scene ends with a quick check."
			scenes={SCENES}
			renderStage={renderStage}
			checkStates={checkStates}
			onAnswer={handleAnswer}
			cheatSheet={STRATEGIES_CHEAT_SHEET}
			playgroundEyebrow="Sandbox"
			playgroundTitle="Run the strategies yourself. Step, scrub, replay."
			playgroundLede="Watch the DP table fill cell by cell while greedy commits in parallel — then switch problems. Use space, the arrow keys, or the controls below. Coin change lets you swap coin sets to make greedy succeed or fail."
			onVisit={handleVisit}
			renderPlayground={renderPlayground}
		/>
	);
};

export default StrategiesPage;
