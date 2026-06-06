import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { TOPIC_BY_ID } from '../../data/curriculum.js';
import useProgress from '../../hooks/useProgress.js';
import TopicTemplate from '../../common/TopicTemplate/index.js';
import MergeSortStage from './MergeSortStage.jsx';
import MergeSortPlayground from './MergeSortPlayground.jsx';
import { SCENES } from './scenes.js';
import styles from './MergeSortLesson.module.css';

// The full multi-algorithm sandbox is heavy (all eight algorithm views +
// pseudocode + comparison). It is only fetched when the student opens it, so
// the lesson itself stays light on first load.
const SortingDashboard = lazy(
	() => import('../Sorting/SortingDashboard/SortingDashboard.jsx')
);

const TOPIC_ID = 'sorting';

const initialCheckStates = () =>
	Object.fromEntries(
		SCENES.map(scene => [
			scene.id,
			scene.check?.kind === 'pair' ? { selected: [] } : {},
		])
	);

/**
 * MergeSortLesson — the gold-standard topic experience for Sorting and the
 * proof that TopicTemplate is reusable. It consumes the template for all page
 * structure (hero, scrolly, playground, breadcrumbs, up-next) and supplies only
 * the merge-sort visualization stage, scenes, comprehension checks, and the
 * step/scrub/replay playground.
 */
const MergeSortLesson = () => {
	const { markVisited, markCompleted } = useProgress();
	const [checkStates, setCheckStates] = useState(initialCheckStates);
	const [sandboxOpen, setSandboxOpen] = useState(false);

	const topic = TOPIC_BY_ID[TOPIC_ID];

	const handlePlaygroundInteract = useCallback(() => {
		markCompleted(TOPIC_ID);
	}, [markCompleted]);

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

	// Pair-check: the user picks two adjacent bars directly on the stage. Lock
	// when a valid adjacent pair is selected; a second non-adjacent click resets
	// to a new first selection. This is what makes the first check interactive.
	const handleBarClick = useCallback(slot => {
		const scene = SCENES[0];
		if (!scene || scene.check?.kind !== 'pair') return;
		setCheckStates(prev => {
			const current = prev[scene.id] || { selected: [] };
			if (current.status) return prev;
			const sel = current.selected || [];
			if (sel.length === 0) {
				return { ...prev, [scene.id]: { selected: [slot] } };
			}
			if (sel.length === 1) {
				if (sel[0] === slot) return prev;
				const isAdjacent = Math.abs(sel[0] - slot) === 1;
				if (!isAdjacent) {
					return { ...prev, [scene.id]: { selected: [slot] } };
				}
				const pair = [sel[0], slot].sort((a, b) => a - b);
				const isCorrect = scene.check.validate(pair);
				return {
					...prev,
					[scene.id]: {
						selected: pair,
						status: isCorrect ? 'correct' : 'incorrect',
					},
				};
			}
			return prev;
		});
	}, []);

	// Derive the stage's interaction state from the active scene's check.
	const stageInteractionFor = useCallback(
		activeScene => {
			const activeSceneDef = SCENES[activeScene];
			if (activeSceneDef?.check?.kind !== 'pair') {
				return {
					interactionMode: null,
					selectedSlots: [],
					exampleSlots: [],
					answerStatus: null,
				};
			}
			const cs = checkStates[activeSceneDef.id] || { selected: [] };
			return {
				interactionMode: 'pair',
				selectedSlots: cs.selected || [],
				exampleSlots:
					cs.status === 'incorrect'
						? activeSceneDef.check.exampleCorrectPair
						: [],
				answerStatus: cs.status || null,
			};
		},
		[checkStates]
	);

	const renderStage = useCallback(
		activeScene => {
			const interaction = stageInteractionFor(activeScene);
			return (
				<MergeSortStage
					activeScene={activeScene}
					interactionMode={interaction.interactionMode}
					selectedSlots={interaction.selectedSlots}
					exampleSlots={interaction.exampleSlots}
					answerStatus={interaction.answerStatus}
					onBarClick={handleBarClick}
				/>
			);
		},
		[stageInteractionFor, handleBarClick]
	);

	const renderPlayground = useCallback(
		() => <MergeSortPlayground onUserInteract={handlePlaygroundInteract} />,
		[handlePlaygroundInteract]
	);

	const handleVisit = useCallback(() => {
		markVisited(TOPIC_ID);
	}, [markVisited]);

	const eyebrow = useMemo(
		() => `${topic?.number ?? '04'} · ${topic?.name ?? 'Sorting'} · Merge sort`,
		[topic]
	);

	return (
		<TopicTemplate
			topicId={TOPIC_ID}
			eyebrow={eyebrow}
			title="Merge sort splits, then it merges."
			lede="Watch a single recursion all the way down to the base case, then back up. Each scene ends with a quick check — answer it, then keep scrolling."
			scenes={SCENES}
			renderStage={renderStage}
			checkStates={checkStates}
			onChoiceAnswer={handleChoiceAnswer}
			playgroundEyebrow="Sandbox"
			playgroundTitle="Now your turn. Step, scrub, replay."
			playgroundLede="The same eight values, the actual algorithm. Use space, the arrow keys, or the controls below. Want bubble, quick, heap, or radix? Open the full sandbox below."
			onVisit={handleVisit}
			renderPlayground={renderPlayground}
		>
			<section className={styles.sandboxCallout} aria-labelledby="sandbox-cta">
				<div className={styles.sandboxCard}>
					<div className={styles.sandboxText}>
						<p className={styles.sandboxEyebrow}>Full sandbox</p>
						<h2 id="sandbox-cta" className={styles.sandboxTitle}>
							Eight more views, eight algorithms.
						</h2>
						<p className={styles.sandboxBody}>
							Merge sort is one of a family. Open the multi-algorithm sandbox
							to compare bubble, quick, heap, insertion, selection, counting,
							radix, and bucket sort on the same data — bars, boxes, recursion
							tree, synchronized pseudocode, and a head-to-head operation count.
						</p>
					</div>
					<button
						type="button"
						className={styles.sandboxLink}
						onClick={() => setSandboxOpen(open => !open)}
						aria-expanded={sandboxOpen}
						aria-controls="sorting-sandbox"
					>
						<span>{sandboxOpen ? 'Hide the sandbox' : 'Open the sandbox'}</span>
						<ChevronDown
							size={18}
							strokeWidth={2}
							aria-hidden="true"
							className={`${styles.sandboxChevron} ${
								sandboxOpen ? styles.sandboxChevronOpen : ''
							}`}
						/>
					</button>
				</div>

				{sandboxOpen && (
					<div
						id="sorting-sandbox"
						className={styles.sandboxEmbed}
						aria-label="Multi-algorithm sorting sandbox"
					>
						<Suspense
							fallback={
								<div className={styles.sandboxLoading} role="status">
									Loading the sandbox…
								</div>
							}
						>
							<SortingDashboard initialAlgorithm="bubbleSort" embedded />
						</Suspense>
					</div>
				)}
			</section>
		</TopicTemplate>
	);
};

export default MergeSortLesson;
