import { useCallback, useMemo, useState } from 'react';
import { TOPIC_BY_ID } from '../../data/curriculum.js';
import useProgress from '../../hooks/useProgress.js';
import TopicTemplate from '../../common/TopicTemplate/index.js';
import checkAnswer from '../../common/TopicTemplate/checkAnswer.js';
import MasterTheoremStage from './MasterTheoremStage.jsx';
import MasterTheoremPlayground from './MasterTheoremPlayground.jsx';
import { SCENES } from './scenes.js';
import { EXAMPLES } from './masterMath.js';

// Concise cheat-sheet for the master theorem (Phase-1 revision layer depth — the
// full three-case leaves/levels/root derivation is Phase 4).
const CHEAT_SHEET = {
	keyIdea:
		'Compare the leaf-growth exponent c = log_b(a) against the combine-work exponent d (where f(n) = Θ(n^d)). Whichever side grows faster owns the runtime.',
	sections: [
		{
			title: 'The recurrence',
			items: [
				{
					term: 'T(n)',
					def: 'a·T(n/b) + f(n) — a calls of size n/b, plus f(n) combine work.',
				},
				{
					term: 'Compare',
					def: 'n^(log_b a) (leaf work) against f(n) (combine work).',
				},
			],
		},
		{
			title: 'The three cases',
			items: [
				{ term: 'Case 1 · c > d', def: 'Leaves dominate → Θ(n^(log_b a)).' },
				{ term: 'Case 2 · c = d', def: 'Every level ties → Θ(n^d log n).' },
				{
					term: 'Case 3 · c < d',
					def: 'Root combine work dominates → Θ(n^d).',
				},
			],
		},
		{
			title: 'Running example',
			items: [
				{
					term: 'Merge sort',
					def: 'T(n) = 2T(n/2) + n → c = log₂2 = 1 = d → Case 2 → Θ(n log n).',
				},
			],
		},
	],
};

const TOPIC_ID = 'master-theorem';

const initialCheckStates = () =>
	Object.fromEntries(SCENES.map(scene => [scene.id, {}]));

/**
 * MasterTheoremLesson — the gold-standard Master Theorem experience, built on
 * TopicTemplate. It supplies the recursion-tree stage, the scrolly scenes with
 * comprehension checks, and the engine-driven playground; the template owns all
 * page structure (hero, scrolly, playground frame, breadcrumbs, up-next).
 */
const MasterTheoremLesson = () => {
	const { markVisited, markCompleted } = useProgress();
	const [checkStates, setCheckStates] = useState(initialCheckStates);
	// Merge sort is the running example throughout the lesson, so the playground
	// opens on it for continuity.
	const [params, setParams] = useState(EXAMPLES[0]);

	const topic = TOPIC_BY_ID[TOPIC_ID];

	// Generic grading for every check kind (choice / numeric / classify / …) via
	// the pure checkAnswer core, so non-MCQ retrieval checks grade correctly.
	const handleAnswer = useCallback((sceneId, payload) => {
		const scene = SCENES.find(s => s.id === sceneId);
		if (!scene) return;
		const result = checkAnswer(scene.check, payload);
		setCheckStates(prev => ({
			...prev,
			[sceneId]: {
				...result,
				selected: result.selected ?? payload,
				value: result.value ?? payload,
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
		// Second arg is the template's opt-in reveal gate: revealHeld is true while
		// the 'levels' scene's predict check is unanswered, so the stage holds its
		// neutral pre-draw frame instead of painting the bottom-heavy silhouette +
		// "Case 1" verdict (which would spoil the prediction). Defaults keep it safe
		// if a caller passes only the scene.
		(activeScene, { revealHeld = false } = {}) => (
			<MasterTheoremStage activeScene={activeScene} holdReveal={revealHeld} />
		),
		[]
	);

	const renderPlayground = useCallback(
		() => (
			<MasterTheoremPlayground
				params={params}
				onParamsChange={setParams}
				onUserInteract={handlePlaygroundInteract}
			/>
		),
		[params, handlePlaygroundInteract]
	);

	const eyebrow = useMemo(
		() => `${topic?.number ?? '03'} · ${topic?.navLabel ?? 'Master theorem'}`,
		[topic]
	);

	return (
		<TopicTemplate
			topicId={TOPIC_ID}
			accent={topic?.accent}
			eyebrow={eyebrow}
			title="Find where the recursion piles up its work."
			lede="A problem that calls smaller copies of itself draws a tree. The Master Theorem is a single comparison that tells you which part of that tree carries the cost — the leaves, every level, or the root. Answer each check, then keep scrolling."
			scenes={SCENES}
			renderStage={renderStage}
			checkStates={checkStates}
			onAnswer={handleAnswer}
			cheatSheet={CHEAT_SHEET}
			playgroundEyebrow="Sandbox"
			playgroundTitle="Set a, b, f(n). Watch the tree reveal."
			playgroundLede="Step the recursion tree open one level at a time and watch the leaves-vs-combine work shift the dominant side. Use space, the arrow keys, or the controls. Try the preset recurrences to see all three cases."
			renderPlayground={renderPlayground}
			onVisit={handleVisit}
		/>
	);
};

export default MasterTheoremLesson;
