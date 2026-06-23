import { useCallback, useMemo, useState } from 'react';
import { TOPIC_BY_ID } from '../data/curriculum.js';
import useProgress from '../hooks/useProgress.js';
import TopicTemplate from '../common/TopicTemplate/index.js';
import { checkAnswer } from '../common/TopicTemplate/checkAnswer.js';
import HashMapStage from '../components/HashMap/HashMapStage.jsx';
import HashMapPlayground from '../components/HashMap/HashMapPlayground.jsx';
import { SCENES, STAGE_CAPACITY } from '../components/HashMap/scenes.js';

const TOPIC_ID = 'hashing';

const initialCheckStates = () =>
	Object.fromEntries(SCENES.map(scene => [scene.id, {}]));

// Cheat-sheet: the revision-layer recap a learner can flip open mid-scroll.
// Tokens/text only — no fabricated numbers; m=STAGE_CAPACITY matches the demo.
const CHEAT_SHEET = {
	keyIdea:
		'A key becomes an address: hash it, compress with mod m, and collisions just share a short chain — so the average operation stays O(1).',
	sections: [
		{
			title: 'From key to bucket',
			items: [
				{
					term: 'hash → index',
					def: 'index = hash(key) % m. The same key always lands in the same bucket; m is the number of buckets.',
				},
				{
					term: 'separate chaining',
					def: 'Each bucket is a tiny linked list. Colliding keys append to the chain; a lookup walks only that one chain.',
				},
			],
		},
		{
			title: 'Load factor & growth',
			items: [
				{
					term: 'α = n / m',
					def: 'Entries over buckets — how crowded the table is. As α rises, chains lengthen and lookups slow.',
				},
				{
					term: 'resize / rehash',
					def: `Around α ≈ 0.75, allocate a bigger table and recompute hash % newCapacity for every entry (one O(n) event).`,
				},
			],
		},
		{
			title: 'Cost',
			items: [
				{
					term: 'average',
					def: 'O(1) for put / get / delete when α is bounded by a constant (short chains).',
				},
				{
					term: 'worst case',
					def: `O(n): if every key collides into one bucket (e.g. m = ${STAGE_CAPACITY} but all n keys share a slot), the chain is the whole table.`,
				},
			],
		},
	],
};

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

	// Generic submit for every check kind. Grading is delegated to the pure
	// checkAnswer core, so the numeric "which bucket?" retrieval check (and any
	// future kind) is graded the same way as the choice checks.
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
		// The second arg is the template's opt-in reveal gate: revealHeld is true
		// while scene 0's predict-the-bucket check is still unanswered, so the stage
		// holds its honest pre-drop frame (the key hovers, no bucket spotlighted)
		// instead of dropping "cat" into its slot and spoiling the prediction.
		// Defaults keep it safe if a caller passes only the scene (the other lessons).
		(activeScene, { revealHeld = false } = {}) => (
			<HashMapStage activeScene={activeScene} holdReveal={revealHeld} />
		),
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
			onAnswer={handleAnswer}
			cheatSheet={CHEAT_SHEET}
			playgroundEyebrow="Sandbox"
			playgroundTitle="Now your turn. Hash, collide, resize."
			playgroundLede="Run put, get, delete, and resize on a live table. Watch the chosen bucket light up, the chain grow, and the load factor climb. Use space, the arrow keys, or the controls — and the scenario chips to load a tricky table."
			renderPlayground={renderPlayground}
			onVisit={handleVisit}
		/>
	);
};

export default HashMapPage;
