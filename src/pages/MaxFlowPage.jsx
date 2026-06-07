import { useCallback, useMemo, useState } from 'react';
import { TOPIC_BY_ID } from '../data/curriculum.js';
import useProgress from '../hooks/useProgress.js';
import TopicTemplate from '../common/TopicTemplate/index.js';
import { checkAnswer } from '../common/TopicTemplate/checkAnswer.js';
import MaxFlowStage from '../components/MaxFlow/MaxFlowStage.jsx';
import MaxFlowPlayground from '../components/MaxFlow/MaxFlowPlayground.jsx';
import { SCENES } from '../components/MaxFlow/scenes.js';

const TOPIC_ID = 'max-flow';

const initialCheckStates = () =>
	Object.fromEntries(SCENES.map(scene => [scene.id, {}]));

// Cheat-sheet: the revision-layer recap a learner can flip open mid-scroll.
// Tokens/text only; the page's concrete numbers are measured by the pure
// generators in maxFlowTrace.js.
const CHEAT_SHEET = {
	keyIdea:
		'Push flow from s to t. While an AUGMENTING PATH exists in the RESIDUAL NETWORK (a path of spare capacity), send its bottleneck of flow along it; forward edges fill, back edges drain. When no augmenting path remains, the flow is maximum — and the vertices still reachable from s in the residual network are one side of a MINIMUM CUT whose capacity equals that maximum-flow value.',
	sections: [
		{
			title: 'Flow networks',
			items: [
				{
					term: 'capacity / flow',
					def: 'Each edge (u,v) has capacity c(u,v); a flow obeys 0 ≤ f(u,v) ≤ c(u,v).',
				},
				{
					term: 'conservation',
					def: 'At every vertex except s and t, flow in = flow out.',
				},
				{
					term: 'value of a flow',
					def: 'The net flow leaving s — equal, by conservation, to the net flow into t.',
				},
			],
		},
		{
			title: 'Residual network & augmenting paths',
			items: [
				{
					term: 'forward residual',
					def: 'u→v with residual c(u,v) − f(u,v): the spare capacity left.',
				},
				{
					term: 'back residual',
					def: 'v→u with residual f(u,v): flow you can cancel by rerouting. The clever trick.',
				},
				{
					term: 'augmenting path',
					def: 'An s→t path in the residual network; augment by its bottleneck (the smallest residual on it).',
				},
			],
		},
		{
			title: 'The algorithms',
			items: [
				{
					term: 'Ford-Fulkerson — O(E·|f*|)',
					def: 'Augment along ANY residual path until none remains. Terminates with integer capacities.',
				},
				{
					term: 'Edmonds-Karp — O(V·E²)',
					def: 'Ford-Fulkerson choosing the SHORTEST augmenting path (BFS) every time → polynomial.',
				},
			],
		},
		{
			title: 'Theorems & applications',
			items: [
				{
					term: 'max-flow = min-cut',
					def: 'Maximum flow value = minimum cut capacity. S = residual-reachable set from s; the crossing edges are saturated.',
				},
				{
					term: 'integrality',
					def: 'Integer capacities → an integer maximum flow (every bottleneck is integral).',
				},
				{
					term: 'bipartite matching',
					def: 'Unit-capacity flow: max matching = max flow; integrality makes the matching whole.',
				},
			],
		},
	],
};

/**
 * MaxFlowPage — the Maximum flow topic on the canonical TopicTemplate.
 *
 * Hero → concept scrolly (flow networks → the residual network + augmenting
 * paths → Ford-Fulkerson / Edmonds-Karp → max-flow / min-cut with the cut
 * revealed → integrality → bipartite matching) with a retrieval check per scene
 * → the interactive MaxFlowPlayground (run Ford-Fulkerson / Edmonds-Karp on a
 * shared network via one augment-until-stuck engine, residual graph + augmenting
 * path highlighted, flow value updating, synced pseudocode + live state). Default
 * export; topicId "max-flow" so the orchestrator wires <Route path="/max-flow">.
 */
const MaxFlowPage = () => {
	const { markVisited, markCompleted } = useProgress();
	const [checkStates, setCheckStates] = useState(initialCheckStates);

	const topic = TOPIC_BY_ID[TOPIC_ID];

	// Generic submit for every check kind — grading delegated to the pure
	// checkAnswer core so numeric / choice / predict all grade alike.
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
		activeScene => <MaxFlowStage activeScene={activeScene} />,
		[]
	);

	const handlePlaygroundInteract = useCallback(() => {
		markCompleted(TOPIC_ID);
	}, [markCompleted]);

	const renderPlayground = useCallback(
		() => <MaxFlowPlayground onUserInteract={handlePlaygroundInteract} />,
		[handlePlaygroundInteract]
	);

	const handleVisit = useCallback(() => {
		markVisited(TOPIC_ID);
	}, [markVisited]);

	const eyebrow = useMemo(
		() => `${topic?.number ?? '14'} · ${topic?.name ?? 'Maximum flow'} · Max-flow`,
		[topic]
	);

	return (
		<TopicTemplate
			topicId={TOPIC_ID}
			accent={topic?.accent}
			eyebrow={eyebrow}
			title="How much can a network carry? Push, find residuals, and cut the bottleneck."
			lede="A flow network is pipes with capacities, a source, and a sink. Keep finding an augmenting path of spare capacity in the residual network and push flow along it until none remains — then the flow is maximum, and the cut that proves it is sitting right there. Follow the story scene by scene, answer each check, then run Ford-Fulkerson and Edmonds-Karp on one network yourself."
			scenes={SCENES}
			renderStage={renderStage}
			checkStates={checkStates}
			onAnswer={handleAnswer}
			cheatSheet={CHEAT_SHEET}
			playgroundEyebrow="Sandbox"
			playgroundTitle="Now your turn. Same network, two ways to choose the augmenting path."
			playgroundLede="Run Ford-Fulkerson and Edmonds-Karp on one shared flow network. Watch the augmenting path glow, the flow/capacity labels and residual capacities update in lockstep with the synced pseudocode, and the flow value climb — until no path remains and the minimum cut is revealed. Use space, the arrow keys, or the controls — and the network chips to load the back-edge example or a bipartite-matching instance."
			renderPlayground={renderPlayground}
			onVisit={handleVisit}
		/>
	);
};

export default MaxFlowPage;
