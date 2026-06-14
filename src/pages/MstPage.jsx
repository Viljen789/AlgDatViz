import { useCallback, useMemo, useState } from 'react';
import { TOPIC_BY_ID } from '../data/curriculum.js';
import useProgress from '../hooks/useProgress.js';
import TopicTemplate from '../common/TopicTemplate/index.js';
import { checkAnswer } from '../common/TopicTemplate/checkAnswer.js';
import MstStage from '../components/Mst/MstStage.jsx';
import MstSandbox from '../components/Mst/MstSandbox.jsx';
import { SCENES, MST_EDGE_COUNT, MST_WEIGHT } from '../components/Mst/scenes.js';

const TOPIC_ID = 'mst';

const initialCheckStates = () =>
	Object.fromEntries(SCENES.map(scene => [scene.id, {}]));

// Cheat-sheet: the revision-layer recap a learner can flip open mid-scroll.
// Tokens/text only — the load-bearing numbers come from the pure generators.
const CHEAT_SHEET = {
	keyIdea: `A minimum spanning tree connects every vertex of a connected weighted graph with the least total weight, using exactly n − 1 edges. The cut property is the engine: the lightest edge crossing any cut that no chosen edge already crosses is safe — some MST contains it. Kruskal and Prim are both that one greedy move, repeated, so both reach the same minimum (weight ${MST_WEIGHT}, ${MST_EDGE_COUNT} edges, on this topic's graph).`,
	sections: [
		{
			title: 'The cut property (the "why")',
			items: [
				{
					term: 'cut',
					def: 'A partition of the vertices into two sides. An edge crosses it when its endpoints land on opposite sides.',
				},
				{
					term: 'light edge',
					def: 'The minimum-weight edge crossing a cut. If no already-chosen edge crosses that cut, the light edge is SAFE — adding it keeps the partial tree extendable to an MST.',
				},
				{
					term: 'generic-MST',
					def: 'Repeatedly add a safe edge until you have n − 1. Kruskal and Prim are two ways of always finding a safe (light) edge.',
				},
			],
		},
		{
			title: 'Union-find (Kruskal needs it)',
			items: [
				{
					term: 'make-set(v)',
					def: 'Each vertex starts as its own one-element component.',
				},
				{
					term: 'find(v)',
					def: "Returns v's component representative; path compression flattens the path so later finds are O(α).",
				},
				{
					term: 'union(u, v)',
					def: 'Merge two components by rank (shorter tree under taller). find(u) == find(v) means a cycle — reject the edge.',
				},
			],
		},
		{
			title: 'Kruskal vs Prim',
			items: [
				{
					term: 'Kruskal',
					def: 'Sort edges ascending; add the next edge iff find(u) ≠ find(v), then union. Grows a forest that fuses into one tree.',
				},
				{
					term: 'Prim',
					def: 'Grow one tree from a start vertex; always add the lightest edge crossing the (tree, rest) cut. A priority-queue frontier.',
				},
				{
					term: 'both → O(E log V)',
					def: 'Kruskal: sorting dominates (O(E log E) = O(E log V)). Prim with a binary heap: O(E log V). Same minimum tree; distinct weights ⇒ identical tree.',
				},
			],
		},
	],
};

/**
 * MstPage — the Minimum Spanning Trees topic on the canonical TopicTemplate.
 *
 * Hero → concept scrolly (what an MST is, the cut property + light-edge-is-safe,
 * union-find, Kruskal, Prim, and the punchline that both build the same tree)
 * with a retrieval check per scene → the interactive MstPlayground (Kruskal &
 * Prim on the SAME graph via the shared PlaybackEngine, synced pseudocode + live
 * union-find / frontier state). Default export; topicId "mst" so the orchestrator
 * wires <Route path="/mst">.
 */
const MstPage = () => {
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
		activeScene => <MstStage activeScene={activeScene} />,
		[]
	);

	const handlePlaygroundInteract = useCallback(() => {
		markCompleted(TOPIC_ID);
	}, [markCompleted]);

	const renderPlayground = useCallback(
		() => <MstSandbox onUserInteract={handlePlaygroundInteract} />,
		[handlePlaygroundInteract]
	);

	const handleVisit = useCallback(() => {
		markVisited(TOPIC_ID);
	}, [markVisited]);

	const eyebrow = useMemo(
		() =>
			`${topic?.number ?? '11'} · ${topic?.name ?? 'Minimum spanning trees'} · MST`,
		[topic]
	);

	return (
		<TopicTemplate
			topicId={TOPIC_ID}
			eyebrow={eyebrow}
			title="Connect everything for the least total weight."
			lede="A minimum spanning tree links every vertex of a weighted graph as cheaply as possible. One idea — the cut property — proves it: the lightest edge crossing a respected cut is always safe. Follow the story scene by scene, answer each check, then run Kruskal and Prim on the same graph and watch them build the identical tree."
			scenes={SCENES}
			renderStage={renderStage}
			checkStates={checkStates}
			onAnswer={handleAnswer}
			cheatSheet={CHEAT_SHEET}
			playgroundEyebrow="Sandbox"
			playgroundTitle="Same graph, two algorithms, one tree."
			playgroundLede="Run a single algorithm with synced pseudocode and live state, or switch to Compare and watch Kruskal and Prim race side by side on the same graph under one scrubber, both reaching the identical minimum tree. Use space, the arrow keys, or the controls — and the scenario chips to switch algorithm or start vertex."
			renderPlayground={renderPlayground}
			onVisit={handleVisit}
		/>
	);
};

export default MstPage;
