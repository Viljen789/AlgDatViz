import { useCallback, useMemo, useState } from 'react';
import { TOPIC_BY_ID } from '../data/curriculum.js';
import useProgress from '../hooks/useProgress.js';
import TopicTemplate from '../common/TopicTemplate/index.js';
import { checkAnswer } from '../common/TopicTemplate/checkAnswer.js';
import ShortestPathsStage from '../components/ShortestPaths/ShortestPathsStage.jsx';
import ShortestPathsPlayground from '../components/ShortestPaths/ShortestPathsPlayground.jsx';
import { SCENES } from '../components/ShortestPaths/scenes.js';

const TOPIC_ID = 'shortest-paths';

const initialCheckStates = () =>
	Object.fromEntries(SCENES.map(scene => [scene.id, {}]));

// Cheat-sheet: the revision-layer recap a learner can flip open mid-scroll.
// Tokens/text only; the page's concrete numbers are measured by the pure
// generators in relaxTrace.js.
const CHEAT_SHEET = {
	keyIdea:
		'Every single-source shortest-path algorithm is the SAME atomic move — Relax(u, v, w): if dist[u] + w < dist[v], lower dist[v] and set pred[v] = u. Bellman-Ford, DAG-SP, and Dijkstra differ only in the ORDER they relax edges. You are done when no edge can be relaxed (the triangle inequality holds everywhere).',
	sections: [
		{
			title: 'The Relax primitive',
			items: [
				{
					term: 'Relax(u, v, w)',
					def: 'if dist[u] + w < dist[v]: dist[v] = dist[u] + w; pred[v] = u. It only ever lowers a distance.',
				},
				{
					term: 'optimal substructure',
					def: 'Subpaths of shortest paths are shortest, so extending a correct prefix by one relaxed edge is safe.',
				},
				{
					term: 'pred subgraph',
					def: 'One pred[v] per vertex; following it back to s reconstructs the path. The pred pointers form the shortest-path tree.',
				},
			],
		},
		{
			title: 'The three orders',
			items: [
				{
					term: 'Bellman-Ford — O(V·E)',
					def: 'Relax ALL edges |V|−1 times, then one more pass detects a negative-weight cycle. Handles negative edges.',
				},
				{
					term: 'DAG-SP — O(V + E)',
					def: 'Relax out-edges in topological order, once. Works with negatives; the graph must be acyclic.',
				},
				{
					term: 'Dijkstra — O((V+E) log V)',
					def: 'Greedily settle the closest unsettled vertex from a priority queue, then relax its out-edges. Non-negative weights only.',
				},
			],
		},
		{
			title: 'When to use which',
			items: [
				{
					term: 'negative edges',
					def: 'Bellman-Ford (general graph; also reports a negative cycle).',
				},
				{
					term: 'a weighted DAG',
					def: 'DAG-SP — the fastest, and negatives are fine.',
				},
				{
					term: 'non-negative weights',
					def: 'Dijkstra — fast and greedy, but unsafe if any edge is negative.',
				},
			],
		},
	],
};

/**
 * ShortestPathsPage — the Single-source shortest paths topic on the canonical
 * TopicTemplate.
 *
 * Hero → concept scrolly (the Relax primitive, optimal substructure, the
 * triangle inequality, then Bellman-Ford / DAG-SP / Dijkstra as three orders of
 * the same Relax, why Dijkstra needs non-negative weights, and the predecessor
 * subgraph) with a retrieval check per scene → the interactive
 * ShortestPathsPlayground (run all three algorithms on a shared graph via one
 * Relax engine, synced pseudocode + live dist/pred table). Default export;
 * topicId "shortest-paths" so the orchestrator wires <Route path="/shortest-paths">.
 */
const ShortestPathsPage = () => {
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
		activeScene => <ShortestPathsStage activeScene={activeScene} />,
		[]
	);

	const handlePlaygroundInteract = useCallback(() => {
		markCompleted(TOPIC_ID);
	}, [markCompleted]);

	const renderPlayground = useCallback(
		() => <ShortestPathsPlayground onUserInteract={handlePlaygroundInteract} />,
		[handlePlaygroundInteract]
	);

	const handleVisit = useCallback(() => {
		markVisited(TOPIC_ID);
	}, [markVisited]);

	const eyebrow = useMemo(
		() =>
			`${topic?.number ?? '12'} · ${topic?.name ?? 'Shortest paths (single-source)'} · SSSP`,
		[topic]
	);

	return (
		<TopicTemplate
			topicId={TOPIC_ID}
			accent={topic?.accent}
			eyebrow={eyebrow}
			title="One source, every destination — relax edges until nothing improves."
			lede="Keep a tentative distance and a predecessor for each vertex, then repeat one move — Relax — until no edge can lower a distance. Bellman-Ford, DAG shortest paths, and Dijkstra are the same Relax in three different orders. Follow the story scene by scene, answer each check, then run all three on one graph yourself."
			scenes={SCENES}
			renderStage={renderStage}
			checkStates={checkStates}
			onAnswer={handleAnswer}
			cheatSheet={CHEAT_SHEET}
			playgroundEyebrow="Sandbox"
			playgroundTitle="Now your turn. Same graph, three schedules of Relax."
			playgroundLede="Run Bellman-Ford, DAG-SP, and Dijkstra on one shared graph. Watch the relaxing edge glow, the dist[]/pred[] table update in lockstep with the synced pseudocode, and the relaxation count climb. Use space, the arrow keys, or the controls — and the scenario chips to load a negative edge or a negative cycle."
			renderPlayground={renderPlayground}
			onVisit={handleVisit}
		/>
	);
};

export default ShortestPathsPage;
