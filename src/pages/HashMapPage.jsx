import { useCallback, useMemo, useState } from 'react';
import { TOPIC_BY_ID } from '../data/curriculum.js';
import useProgress from '../hooks/useProgress.js';
import TopicTemplate from '../common/TopicTemplate/index.js';
import HashMapStage from '../components/HashMap/HashMapStage.jsx';
import HashMapPlayground from '../components/HashMap/HashMapPlayground.jsx';
import { SCENES } from '../components/HashMap/scenes.js';

const TOPIC_ID = 'hashing';

const initialCheckStates = () =>
	Object.fromEntries(SCENES.map(scene => [scene.id, {}]));

/**
 * HashMapPage — the Hashing topic on the canonical TopicTemplate.
 *
 * Hero → concept scrolly (hash → bucket, collisions, chaining, load factor,
 * resize) with an inline comprehension check per scene → the interactive
 * HashMapPlayground (put / get / delete / resize on the shared PlaybackEngine).
 * Keeps the original route (/hashmap) and default export.
 */
const HashMapPage = () => {
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
		activeScene => <HashMapStage activeScene={activeScene} />,
		[]
	);

	const handlePlaygroundInteract = useCallback(() => {
		markCompleted(TOPIC_ID);
	}, [markCompleted]);

	const renderPlayground = useCallback(
		() => <HashMapPlayground onUserInteract={handlePlaygroundInteract} />,
		[handlePlaygroundInteract]
	);

	const handleVisit = useCallback(() => {
		markVisited(TOPIC_ID);
	}, [markVisited]);

	const eyebrow = useMemo(
		() => `${topic?.number ?? '05'} · ${topic?.name ?? 'Hashing'} · Hash maps`,
		[topic]
	);

	return (
		<TopicTemplate
			topicId={TOPIC_ID}
			eyebrow={eyebrow}
			title="A key becomes an address. Collisions cooperate."
			lede="Hashing turns any key into one bucket, so most work narrows to a single short chain. Follow the story scene by scene — answer each check, then keep scrolling — and constant-time-average will click."
			scenes={SCENES}
			renderStage={renderStage}
			checkStates={checkStates}
			onChoiceAnswer={handleChoiceAnswer}
			playgroundEyebrow="Sandbox"
			playgroundTitle="Now your turn. Hash, collide, resize."
			playgroundLede="Run put, get, delete, and resize on a live table. Watch the chosen bucket light up, the chain grow, and the load factor climb. Use space, the arrow keys, or the controls — and the scenario chips to load a tricky table."
			renderPlayground={renderPlayground}
			onVisit={handleVisit}
		/>
	);
};

export default HashMapPage;
