import { useCallback, useMemo, useState } from 'react';
import { TOPIC_BY_ID } from '../data/curriculum.js';
import useProgress from '../hooks/useProgress.js';
import TopicTemplate from '../common/TopicTemplate/index.js';
import { checkAnswer } from '../common/TopicTemplate/checkAnswer.js';
import NpCompletenessStage from '../components/NpCompleteness/NpCompletenessStage.jsx';
import NpCompletenessExplorer from '../components/NpCompleteness/NpCompletenessExplorer.jsx';
import { SCENES } from '../components/NpCompleteness/scenes.js';

const TOPIC_ID = 'np-completeness';

const initialCheckStates = () =>
	Object.fromEntries(SCENES.map(scene => [scene.id, {}]));

// Cheat-sheet: the revision-layer recap a learner can flip open mid-scroll.
// Tokens/text only; every concrete number in the topic comes from the pure,
// unit-tested certificate verifiers in certificates.js.
const CHEAT_SHEET = {
	keyIdea:
		'NP is "easy to CHECK, (apparently) hard to FIND": a yes-instance has a certificate verifiable in polynomial time. NP-complete = in NP AND NP-hard. To PROVE a problem hard you reduce a known-hard problem INTO it (3-SAT ≤p B); to USE a solver you reduce your problem INTO that solver (A ≤p B). Reduce the wrong way and you have proved nothing.',
	sections: [
		{
			title: 'The four classes',
			items: [
				{
					term: 'P',
					def: 'Solvable in polynomial time (sorting, shortest path, MST).',
				},
				{
					term: 'NP',
					def: 'Yes-instances have a polynomial-time-verifiable certificate. P ⊆ NP.',
				},
				{
					term: 'NP-hard',
					def: 'At least as hard as everything in NP (all of NP reduces to it). Need NOT be in NP.',
				},
				{
					term: 'NP-complete',
					def: 'In NP AND NP-hard — the hardest still-checkable problems; all inter-reducible.',
				},
			],
		},
		{
			title: 'Verify vs solve',
			items: [
				{
					term: 'verify',
					def: 'Check a given certificate in poly time (one linear pass for 3-SAT; scan edges for a cover / clique).',
				},
				{
					term: 'solve',
					def: 'Produce a certificate — apparently needs exponential search for NP-complete problems.',
				},
				{
					term: 'the gap',
					def: 'P = NP asks whether fast verifying always implies fast solving. Unknown.',
				},
			],
		},
		{
			title: 'Reduction direction (A ≤p B)',
			items: [
				{
					term: 'to SOLVE A with B',
					def: 'Reduce A → B (A ≤p B), run B’s solver, translate back. Arrow points to the tool you have.',
				},
				{
					term: 'to PROVE B is NP-hard',
					def: 'Reduce a known-hard A → B (e.g. 3-SAT ≤p B). B is at least as hard as A.',
				},
				{
					term: 'the classic error',
					def: 'Reducing B → 3-SAT to "prove B hard" proves nothing — wrong direction.',
				},
			],
		},
		{
			title: 'The standard NP-complete problems',
			items: [
				'SAT · 3-SAT · CLIQUE · VERTEX-COVER · INDEPENDENT-SET · HAMILTONIAN-CYCLE · TSP (decision) · SUBSET-SUM — all polynomially inter-reducible (one poly solver would crack them all).',
			],
		},
	],
};

/**
 * NpCompletenessPage — the NP-completeness topic on the canonical TopicTemplate.
 *
 * The conceptual capstone of TDT4120. Hero → concept scrolly (P; NP as
 * verifiable certificates; verify-vs-solve made tangible; NP-hard vs
 * NP-complete; the standard NP-complete problems; reductions and especially the
 * DIRECTION, including a wrong-direction spotbug; a worked 3-SAT ≤p
 * Independent-Set reduction) with a retrieval check per scene → an interactive
 * explorer (certificate verifier for 3-SAT / vertex-cover / independent-set, run
 * in polynomial time via the pure verifiers, plus a reduction-direction demo).
 *
 * Default export; topicId "np-completeness" so the orchestrator wires
 * <Route path="/np-completeness">. App.jsx is NOT edited here.
 */
const NpCompletenessPage = () => {
	const { markVisited, markCompleted } = useProgress();
	const [checkStates, setCheckStates] = useState(initialCheckStates);

	const topic = TOPIC_BY_ID[TOPIC_ID];

	// Generic submit for every check kind — grading delegated to the pure
	// checkAnswer core so numeric / choice / classify / spotbug all grade alike.
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

	const renderStage = useCallback(
		activeScene => <NpCompletenessStage activeScene={activeScene} />,
		[]
	);

	const handlePlaygroundInteract = useCallback(() => {
		markCompleted(TOPIC_ID);
	}, [markCompleted]);

	const renderPlayground = useCallback(
		() => <NpCompletenessExplorer onUserInteract={handlePlaygroundInteract} />,
		[handlePlaygroundInteract]
	);

	const handleVisit = useCallback(() => {
		markVisited(TOPIC_ID);
	}, [markVisited]);

	const eyebrow = useMemo(
		() => `${topic?.number ?? '15'} · ${topic?.name ?? 'NP-completeness'}`,
		[topic]
	);

	return (
		<TopicTemplate
			topicId={TOPIC_ID}
			accent={topic?.accent}
			eyebrow={eyebrow}
			title="The line between hard to solve and easy to check."
			lede="Some problems we can only solve by searching an exponential space — yet a proposed answer checks in seconds. That is NP. Walk from P and NP through the NP-hard vs NP-complete distinction to reductions, where the DIRECTION is everything: reduce a known-hard problem INTO a new one to prove it hard, the other way round to use a solver. Answer each check, then verify certificates and pick the right reduction yourself."
			scenes={SCENES}
			renderStage={renderStage}
			checkStates={checkStates}
			onAnswer={handleAnswer}
			cheatSheet={CHEAT_SHEET}
			playgroundEyebrow="Explorer"
			playgroundTitle="Verify a certificate. Then point the reduction the right way."
			playgroundLede="Toggle a truth assignment and watch a 3-SAT certificate verified clause by clause in one linear pass — there is no “solve” button, because finding the certificate is the hard part. Build a vertex cover or an independent set on a small graph and see it accepted or rejected instantly. Then take the reduction-direction challenge: choose how to reduce, and see why the wrong direction proves nothing."
			renderPlayground={renderPlayground}
			onVisit={handleVisit}
		/>
	);
};

export default NpCompletenessPage;
