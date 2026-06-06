import { useCallback, useMemo, useState } from 'react';
import { TOPIC_BY_ID } from '../../../data/curriculum.js';
import useProgress from '../../../hooks/useProgress.js';
import TopicTemplate from '../../../common/TopicTemplate/index.js';
import GraphDashboard from '../GraphDashboard.jsx';
import GraphStage from './GraphStage.jsx';
import { SCENES } from './graphScenes.js';

const TOPIC_ID = 'graphs';

const initialCheckStates = () =>
	Object.fromEntries(SCENES.map(scene => [scene.id, {}]));

/**
 * GraphLesson — the Graphs topic on the canonical TopicTemplate. It supplies the
 * graph concept stage, the scrolly scenes + comprehension checks, and preserves
 * the full multi-algorithm GraphDashboard as the playground. All structure and
 * styling come from the template + design tokens; the topic is tinted by its
 * signature hue (var(--topic-graphs)).
 */
const GraphLesson = () => {
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
		activeScene => <GraphStage activeScene={activeScene} />,
		[]
	);

	// Marking the topic complete once the student actually drives the playground.
	const handlePlaygroundInteract = useCallback(() => {
		markCompleted(TOPIC_ID);
	}, [markCompleted]);

	const renderPlayground = useCallback(
		() => <GraphDashboard onUserInteract={handlePlaygroundInteract} />,
		[handlePlaygroundInteract]
	);

	const handleVisit = useCallback(() => {
		markVisited(TOPIC_ID);
	}, [markVisited]);

	const eyebrow = useMemo(
		() => `${topic?.number ?? '07'} · ${topic?.name ?? 'Graphs'}`,
		[topic]
	);

	return (
		<TopicTemplate
			topicId={TOPIC_ID}
			eyebrow={eyebrow}
			title="Nodes, edges, and the order you explore them."
			lede="A graph is just things and the links between them. The whole craft is choosing what to explore next — a single decision that separates BFS from DFS. Each scene ends with a quick check; answer it, then keep scrolling."
			scenes={SCENES}
			renderStage={renderStage}
			checkStates={checkStates}
			onChoiceAnswer={handleChoiceAnswer}
			playgroundEyebrow="Sandbox"
			playgroundTitle="Now your turn. Step, scrub, replay."
			playgroundLede="Run BFS, DFS, Dijkstra, MST, topological sort, or max flow on real graphs. Drag nodes, switch between graph / list / matrix views, and step through the algorithm with space and the arrow keys."
			onVisit={handleVisit}
			renderPlayground={renderPlayground}
		/>
	);
};

export default GraphLesson;
