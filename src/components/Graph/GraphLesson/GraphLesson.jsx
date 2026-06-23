import { useCallback, useMemo, useState } from 'react';
import { TOPIC_BY_ID } from '../../../data/curriculum.js';
import useProgress from '../../../hooks/useProgress.js';
import TopicTemplate from '../../../common/TopicTemplate/index.js';
import { checkAnswer } from '../../../common/TopicTemplate/checkAnswer.js';
import GraphDashboard from '../GraphDashboard.jsx';
import OneFrontier from '../OneFrontier/OneFrontier.jsx';
import GraphStage from './GraphStage.jsx';
import { SCENES, CHEAT_SHEET } from './graphScenes.js';
import styles from './GraphLesson.module.css';

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

	// Generic submit for every check kind (choice + the non-MCQ `order` retrieval
	// check). Grading is delegated to the pure checkAnswer module, so this page
	// never re-implements correctness; it only stores the kind-appropriate state
	// fields LessonCheck reads back. Wrong answers still reveal the explanation.
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

	// The second arg is the template's opt-in reveal gate: revealHeld is true while
	// a revealGate scene's predict check is still unanswered (the topo-next beat),
	// so the stage withholds the numbering that would spoil the prediction.
	const renderStage = useCallback(
		(activeScene, { revealHeld = false } = {}) => (
			<GraphStage activeScene={activeScene} holdReveal={revealHeld} />
		),
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
			onAnswer={handleAnswer}
			cheatSheet={CHEAT_SHEET}
			playgroundEyebrow="Sandbox"
			playgroundTitle="Now your turn. Step, scrub, replay."
			playgroundLede="Run BFS, DFS, Dijkstra, MST, topological sort, or max flow on real graphs. Drag nodes, switch between graph / list / matrix views, and step through the algorithm with space and the arrow keys."
			onVisit={handleVisit}
			renderPlayground={renderPlayground}
		>
			<section
				id="one-frontier"
				className={styles.oneFrontierSection}
				aria-labelledby="one-frontier-heading"
			>
				<header className={styles.oneFrontierHeader}>
					<p className={styles.oneFrontierEyebrow}>Signature interactive</p>
					<h2 id="one-frontier-heading" className={styles.oneFrontierTitle}>
						One frontier, four algorithms.
					</h2>
					<p className={styles.oneFrontierLede}>
						The same generic loop — seed the frontier, extract a vertex, settle
						it, offer its neighbours back — on one shared graph. Toggle the{' '}
						<strong>frontier discipline</strong> and watch the same loop become
						BFS, DFS, Dijkstra, or Prim. Only <code>extract()</code> changes:
						which vertex leaves the frontier next. Use space, the arrow keys, or
						the controls; the live frontier, the settle order, the resulting
						tree, and the synced pseudocode all update in lockstep.
					</p>
				</header>
				<OneFrontier onUserInteract={handlePlaygroundInteract} />
			</section>
		</TopicTemplate>
	);
};

export default GraphLesson;
