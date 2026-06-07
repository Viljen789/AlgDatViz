import { useCallback, useMemo, useState } from 'react';
import { TOPIC_BY_ID } from '../data/curriculum.js';
import useProgress from '../hooks/useProgress.js';
import TopicTemplate from '../common/TopicTemplate/index.js';
import { checkAnswer } from '../common/TopicTemplate/checkAnswer.js';
import AllPairsShortestPathsStage from '../components/AllPairsShortestPaths/AllPairsShortestPathsStage.jsx';
import AllPairsShortestPathsPlayground from '../components/AllPairsShortestPaths/AllPairsShortestPathsPlayground.jsx';
import { SCENES } from '../components/AllPairsShortestPaths/scenes.js';

const TOPIC_ID = 'apsp';

const initialCheckStates = () =>
	Object.fromEntries(SCENES.map(scene => [scene.id, {}]));

// Cheat-sheet: the revision-layer recap a learner can flip open mid-scroll.
// Tokens/text only; the page's concrete numbers are measured by the pure
// generators in fwTrace.js.
const CHEAT_SHEET = {
	keyIdea:
		'Floyd-Warshall is a dynamic program over the INTERMEDIATE vertices a path is allowed to use. Numbering vertices 1..n, let d_k[i][j] be the shortest i→j distance using only intermediates from {1, …, k}. Unlocking vertex k, a shortest path either ignores k or routes through it: d_k[i][j] = min( d_{k−1}[i][j], d_{k−1}[i][k] + d_{k−1}[k][j] ). Three nested loops (k, then i, then j) fill the whole V×V matrix in Θ(V³). The transitive closure is the same loop with OR/AND instead of min/+.',
	sections: [
		{
			title: 'The recurrence',
			items: [
				{
					term: 'd_k[i][j]',
					def: 'Shortest i→j distance whose intermediate vertices all come from {1, …, k}. d_0 = direct edges; d_n = the true all-pairs answer.',
				},
				{
					term: 'the update',
					def: 'd_k[i][j] = min( d_{k−1}[i][j], d_{k−1}[i][k] + d_{k−1}[k][j] ) — don’t route through k, or do. One cell reads exactly two: d[i][k] and d[k][j].',
				},
				{
					term: 'the k-loop',
					def: 'k is the OUTERMOST loop: it grows the allowed-intermediates set one vertex at a time. The k-th row and column don’t change during round k.',
				},
			],
		},
		{
			title: 'Paths + closure',
			items: [
				{
					term: 'predecessor matrix π',
					def: 'π[i][j] = vertex just before j on a shortest i→j path. On an improving update set π[i][j] = π[k][j]; walk it backward from j to rebuild the path. O(V²) space.',
				},
				{
					term: 'transitive closure',
					def: 't_k[i][j] = t_{k−1}[i][j] OR (t_{k−1}[i][k] AND t_{k−1}[k][j]). Boolean reachability via the identical triple loop.',
				},
				{
					term: 'negative cycle',
					def: 'A diagonal entry d[v][v] dropping below 0 means a reachable negative-weight cycle — some shortest paths are then undefined.',
				},
			],
		},
		{
			title: 'Cost + framing',
			items: [
				{
					term: 'Θ(V³)',
					def: 'Three nested V-loops, independent of E. Beats running Dijkstra from every source on dense graphs, and handles negative edges.',
				},
				{
					term: 'matrix multiplication',
					def: 'One relax pass is (min, +) matrix "multiplication". Slow-APSP repeats it V−1 times (O(V⁴)); repeated squaring (Faster-APSP) is O(V³ log V); Floyd-Warshall reuses layers in place for a flat Θ(V³).',
				},
				{
					term: 'when to use it',
					def: 'All pairs (especially dense / with negatives) → Floyd-Warshall. One source → Dijkstra/Bellman-Ford. Pure reachability → transitive closure.',
				},
			],
		},
	],
};

/**
 * AllPairsShortestPathsPage — the All-pairs shortest paths topic on the canonical
 * TopicTemplate.
 *
 * Hero → concept scrolly (the all-pairs problem, the "allow paths through {1..k}"
 * dynamic program, the recurrence, the matrix filling across k, the predecessor
 * matrix + reconstruction, the transitive-closure twin, the (min,+) matrix-
 * multiplication framing + Θ(V³), and when to choose it) with a retrieval check
 * per scene → the interactive playground (Floyd-Warshall + transitive closure on
 * a shared digraph via one triple-loop engine, the V×V matrix + the graph in sync
 * with synced pseudocode + live state). Default export; topicId "apsp" so the
 * orchestrator wires <Route path="/all-pairs-shortest-paths">.
 */
const AllPairsShortestPathsPage = () => {
	const { markVisited, markCompleted } = useProgress();
	const [checkStates, setCheckStates] = useState(initialCheckStates);

	const topic = TOPIC_BY_ID[TOPIC_ID];

	// Generic submit for every check kind — grading delegated to the pure
	// checkAnswer core so numeric / choice / classify / predict / order grade alike.
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
		activeScene => <AllPairsShortestPathsStage activeScene={activeScene} />,
		[]
	);

	const handlePlaygroundInteract = useCallback(() => {
		markCompleted(TOPIC_ID);
	}, [markCompleted]);

	const renderPlayground = useCallback(
		() => (
			<AllPairsShortestPathsPlayground
				onUserInteract={handlePlaygroundInteract}
			/>
		),
		[handlePlaygroundInteract]
	);

	const handleVisit = useCallback(() => {
		markVisited(TOPIC_ID);
	}, [markVisited]);

	const eyebrow = useMemo(
		() =>
			`${topic?.number ?? '13'} · ${topic?.name ?? 'All-pairs shortest paths'} · APSP`,
		[topic]
	);

	return (
		<TopicTemplate
			topicId={TOPIC_ID}
			accent={topic?.accent}
			eyebrow={eyebrow}
			title="Every shortest route at once, through dynamic programming on intermediates."
			lede="All-pairs shortest paths fills a V×V matrix of shortest distances between every ordered pair. Floyd-Warshall gets there with one elegant idea — grow the set of vertices a path is allowed to route through, one at a time — applied across the matrix in Θ(V³). Follow the story scene by scene, answer each check, then watch the matrix fill across k yourself."
			scenes={SCENES}
			renderStage={renderStage}
			checkStates={checkStates}
			onAnswer={handleAnswer}
			cheatSheet={CHEAT_SHEET}
			playgroundEyebrow="Sandbox"
			playgroundTitle="Now your turn. Watch the matrix fill across k."
			playgroundLede="Run Floyd-Warshall on a shared weighted digraph and watch the V×V matrix improve one k-round at a time — the relaxed cell d[i][j] glows while the two cells it reads (d[i][k] and d[k][j]) are marked, in lockstep with the synced pseudocode and live state. Switch to transitive closure to see the same loop with OR/AND, and use the scenario chips to load a negative edge or a negative cycle."
			renderPlayground={renderPlayground}
			onVisit={handleVisit}
		/>
	);
};

export default AllPairsShortestPathsPage;
