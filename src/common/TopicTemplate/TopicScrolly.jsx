import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useReducedMotion from '../../hooks/useReducedMotion.js';
import LessonCheck from './LessonCheck.jsx';
import SceneControlBar from './SceneControlBar.jsx';
import styles from './TopicScrolly.module.css';

/**
 * TopicScrolly — the "Concept + Visualization" engine of the topic template.
 *
 * A two-column scrollytelling layout: a sticky visualization stage on one side
 * and scene-by-scene prose on the other, each scene ending with an optional
 * inline comprehension check. The active scene is tracked with an
 * IntersectionObserver and passed to `renderStage` so the visualization can
 * react to scroll. prefers-reduced-motion is respected (scenes are not faded).
 *
 * Props
 * -----
 *   scenes         Array<{ id, eyebrow, title, body, check? }>
 *   renderStage    (activeScene:number, opts?:{ revealHeld:boolean }) => node —
 *                  the sticky stage. The second arg is opt-in: `revealHeld` is
 *                  true only while the active scene's check carries
 *                  `revealGate: true` and its solution is still hidden, so a
 *                  stage can hold its honest pre-reveal frame. Stages that take only
 *                  (activeScene) ignore it, so every other topic is unaffected.
 *   checkStates    optional map { [sceneId]: state } for the inline checks.
 *   onAnswer       optional (sceneId, payload) => void — generic check submit
 *                  for every check kind (choice/numeric/text/order/classify/…).
 *   onRetry        optional (sceneId) => void — clears host-owned state for
 *                  stage-graded checks. Ordinary checks retry locally.
 *   onChoiceAnswer optional (sceneId, value) => void — backward-compatible alias
 *                  of onAnswer (kept so existing topics keep working).
 *   onActiveScene  optional (index:number) => void notifier.
 *   initialScene   optional number — the scene to resume at on mount (the
 *                  furthest the reader previously reached). 0 / undefined lands
 *                  at the top with no scroll (the first-run behavior).
 */
const TopicScrolly = ({
	scenes,
	renderStage,
	checkStates,
	onAnswer,
	onRetry,
	onChoiceAnswer,
	onActiveScene,
	initialScene = 0,
}) => {
	// Generic submit handler; onChoiceAnswer remains supported as an alias.
	const handleAnswer = onAnswer || onChoiceAnswer;
	const reducedMotion = useReducedMotion();
	// Seed the active scene so the sticky stage renders the resumed scene from
	// the very first frame (no flash of scene 0 before the scroll lands).
	const startScene = Math.max(0, Math.min(initialScene, scenes.length - 1));
	const [activeScene, setActiveScene] = useState(startScene);
	const [isPlaying, setIsPlaying] = useState(false);
	// Reveal-gated stages stay frozen through the first miss so the correction
	// remains a real attempt. They release only after a correct response, an
	// explicit worked-answer request, or the automatic reveal after a second miss.
	const [revealedScenes, setRevealedScenes] = useState(() => new Set());
	// A wrong answer can be corrected in place. While a scene is retrying we hide
	// its host-owned result from the check UI, but preserve that
	// first attempt in useProgress/SRS. The next submit overwrites the lesson-local
	// result while firstTry remains immutable in persistence.
	const [retryingScenes, setRetryingScenes] = useState(() => new Set());
	const sceneRefs = useRef([]);
	const rootRef = useRef(null);
	const total = scenes.length;

	const handleLessonAnswer = useCallback(
		(sceneId, payload) => {
			setRetryingScenes(prev => {
				if (!prev.has(sceneId)) return prev;
				const next = new Set(prev);
				next.delete(sceneId);
				return next;
			});
			handleAnswer?.(sceneId, payload);
		},
		[handleAnswer]
	);

	const handleRetry = useCallback(
		sceneId => {
			setIsPlaying(false);
			const sceneIndex = scenes.findIndex(scene => scene.id === sceneId);
			setRetryingScenes(prev => {
				const next = new Set(prev);
				next.add(sceneId);
				return next;
			});
			onRetry?.(sceneId);
			// Removing the feedback block shortens the prose card. Recenter after the
			// layout settles so IntersectionObserver cannot promote the next article
			// while the learner is correcting the current one.
			if (sceneIndex >= 0) {
				setActiveScene(sceneIndex);
				onActiveScene?.(sceneIndex);
				requestAnimationFrame(() => {
					sceneRefs.current[sceneIndex]?.scrollIntoView({
						behavior: reducedMotion ? 'auto' : 'smooth',
						block: 'center',
					});
				});
			}
		},
		[onRetry, onActiveScene, reducedMotion, scenes]
	);

	const handleReveal = useCallback(sceneId => {
		setRevealedScenes(prev => {
			if (prev.has(sceneId)) return prev;
			const next = new Set(prev);
			next.add(sceneId);
			return next;
		});
	}, []);

	// Pair checks are answered directly on the stage, so they do not travel
	// through handleLessonAnswer. Once the host reports a fresh pair result,
	// leave retry mode and show that result normally.
	useEffect(() => {
		const resolvedPairs = scenes
			.filter(
				scene =>
					scene.check?.kind === 'pair' &&
					retryingScenes.has(scene.id) &&
					checkStates?.[scene.id]?.status
			)
			.map(scene => scene.id);
		if (resolvedPairs.length === 0) return;
		setRetryingScenes(prev => {
			const next = new Set(prev);
			resolvedPairs.forEach(id => next.delete(id));
			return next;
		});
	}, [checkStates, retryingScenes, scenes]);

	const sceneStatuses = useMemo(
		() =>
			scenes.map(scene => {
				if (!scene.check) return 'none';
				if (retryingScenes.has(scene.id)) return 'retrying';
				return checkStates?.[scene.id]?.status || 'pending';
			}),
		[scenes, checkStates, retryingScenes]
	);

	useEffect(() => {
		const root = rootRef.current;
		if (!root) return undefined;
		const observer = new IntersectionObserver(
			entries => {
				const visible = entries
					.filter(entry => entry.isIntersecting)
					.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
				const idx = visible?.target?.dataset?.scene;
				if (idx != null) {
					const next = Number(idx);
					setActiveScene(next);
					onActiveScene?.(next);
				}
			},
			{
				// Observe against the viewport (root:null), NOT the .scrolly element.
				// The scenes scroll inside the page's own scroll container, so an
				// element root that isn't that container never re-fires on scroll —
				// the active scene (and the sticky stage) would freeze at its mount
				// value. A thin band ~42% down the viewport selects the scene being
				// read, so the stage now follows the scroll smoothly.
				root: null,
				threshold: 0,
				rootMargin: '-40% 0px -55% 0px',
			}
		);
		sceneRefs.current.forEach(node => {
			if (node) observer.observe(node);
		});
		return () => observer.disconnect();
	}, [onActiveScene]);

	// Resume at the furthest scene the reader previously reached. Runs once on
	// mount: if there's somewhere to resume to (> scene 0), bring that scene into
	// view inside the page's own scroller (scrollIntoView resolves against the
	// nearest scrollable ancestor — the .page element, never window). Deferred a
	// frame so the route-mount transition and web-font layout have settled before
	// we measure. First-time / no-history (startScene === 0) does nothing, so the
	// topic lands at scene 0 cleanly. The IntersectionObserver then keeps the
	// active scene and stage in sync as the reader scrolls from here.
	useEffect(() => {
		if (startScene <= 0) return undefined;
		// Find the page's own scroller (the .page overflow element), never window.
		let scroller = rootRef.current?.parentElement;
		while (scroller && scroller !== document.body) {
			const oy = getComputedStyle(scroller).overflowY;
			if (
				(oy === 'auto' || oy === 'scroll') &&
				scroller.scrollHeight > scroller.clientHeight
			)
				break;
			scroller = scroller.parentElement;
		}
		// Late layout (the sticky stage + web fonts) keeps moving the target for a
		// few frames, so a single rAF lands at ~0. Re-aim each frame until we
		// arrive (or give up after ~20 frames), which makes the resume robust to
		// the scrolly settling its height. Instant, not smooth: a resume should
		// land where the reader left off, not animate a scroll past every scene.
		let rafId;
		let frames = 0;
		const aim = () => {
			frames += 1;
			const node = sceneRefs.current[startScene];
			if (node && scroller?.scrollTo) {
				const target =
					node.getBoundingClientRect().top -
					scroller.getBoundingClientRect().top +
					scroller.scrollTop;
				if (Math.abs(scroller.scrollTop - target) > 4) {
					scroller.scrollTo({ top: target, behavior: 'auto' });
				} else if (frames > 2) {
					return;
				}
			}
			if (frames < 20) rafId = requestAnimationFrame(aim);
		};
		rafId = requestAnimationFrame(aim);
		return () => cancelAnimationFrame(rafId);
		// Mount-only ([] deps). Under StrictMode's dev double-invoke the first aim
		// loop is cancelled by cleanup and the second completes, so we deliberately
		// keep NO resumedRef guard (it would skip that second, real run).
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Explicit scene playback (Phase 2a): controls + keyboard are the primary way
	// to move through scenes. They drive the active scene by bringing it into view
	// (user-initiated scroll — never wheel/trackpad hijacking). Reduced motion
	// snaps instantly. The IntersectionObserver above stays active so natural
	// scrolling still works and keeps the controls in sync.
	const goToScene = useCallback(
		(idx, { fromAuto = false, scroll = true } = {}) => {
			const clamped = Math.max(0, Math.min(idx, scenes.length - 1));
			if (!fromAuto) setIsPlaying(false); // any manual interaction pauses
			setActiveScene(clamped);
			onActiveScene?.(clamped);
			// The stage and its explanation are one teaching beat. Every transport
			// action therefore recenters the matching prose instead of letting the
			// sticky canvas drift onto scene N+1 while scene N's reasoning remains
			// visible beside it.
			if (scroll) {
				sceneRefs.current[clamped]?.scrollIntoView({
					behavior: reducedMotion ? 'auto' : 'smooth',
					block: 'center',
				});
			}
		},
		[scenes.length, onActiveScene, reducedMotion]
	);

	// Retrieval before progress: auto-advance won't pass a scene whose check is
	// still unanswered.
	const currentScene = scenes[activeScene];
	const currentStatus = sceneStatuses[activeScene] || 'none';
	const currentAnswered = currentStatus === 'correct';
	const blockedReason =
		currentScene?.check && !currentAnswered
			? currentStatus === 'incorrect' || currentStatus === 'retrying'
				? 'correction pending. Auto-play paused.'
				: 'check pending. Auto-play paused.'
			: null;

	// Opt-in reveal gate (FIX 1): a scene whose check carries `revealGate: true`
	// asks the stage to HOLD its honest pre-reveal frame until the learner answers
	// correctly or requests the worked solution, so the visualization cannot spoil
	// a predict-before-reveal beat or the first correction attempt.
	// Pure extra signal — false for every non-gated scene, so every other topic's
	// stage is untouched.
	const revealHeld =
		Boolean(currentScene?.check?.revealGate) &&
		!currentAnswered &&
		!revealedScenes.has(currentScene?.id);

	const handleTogglePlay = useCallback(() => {
		if (isPlaying) {
			setIsPlaying(false);
			return;
		}
		if (activeScene >= scenes.length - 1) goToScene(0, { fromAuto: true });
		setIsPlaying(true);
	}, [isPlaying, activeScene, scenes.length, goToScene]);

	// Calm auto-advance: dwell on each scene, then step. Stops at the end; never
	// advances while a check is unanswered.
	useEffect(() => {
		if (!isPlaying || blockedReason) return undefined;
		if (activeScene >= scenes.length - 1) {
			setIsPlaying(false);
			return undefined;
		}
		const id = window.setTimeout(() => {
			goToScene(activeScene + 1, { fromAuto: true });
		}, 7000);
		return () => window.clearTimeout(id);
	}, [isPlaying, blockedReason, activeScene, scenes.length, goToScene]);

	return (
		<section
			id="topic-visualization"
			ref={rootRef}
			className={styles.scrolly}
			aria-label="Concept, scene by scene"
		>
			<div className={styles.stageColumn}>
				<div className={styles.stageSticky}>
					<div
						className={styles.stageContext}
						aria-live="polite"
						aria-atomic="true"
					>
						<span className={styles.stageContextIndex}>
							{String(activeScene + 1).padStart(2, '0')} /{' '}
							{String(total).padStart(2, '0')}
						</span>
						<span className={styles.stageContextTitle}>
							{currentScene?.eyebrow || currentScene?.title}
						</span>
						{currentScene?.check && (
							<span
								className={`${styles.stageContextStatus} ${
									styles[`stageContextStatus_${currentStatus}`] || ''
								}`}
							>
								{currentStatus === 'correct'
									? 'Checked'
									: currentStatus === 'incorrect'
										? 'Needs correction'
										: currentStatus === 'retrying'
											? 'Trying again'
											: 'Check ahead'}
							</span>
						)}
					</div>
					{/* Second arg is opt-in: stages that take only (activeScene)
					    ignore it, so every other topic is unaffected. */}
					<div className={styles.stageFigure}>
						{renderStage(activeScene, { revealHeld })}
					</div>
					{total > 1 && (
						<SceneControlBar
							total={total}
							active={activeScene}
							isPlaying={isPlaying}
							scenes={scenes}
							sceneStatuses={sceneStatuses}
							blockedReason={blockedReason}
							scopeRef={rootRef}
							reducedMotion={reducedMotion}
							onPrev={() => goToScene(activeScene - 1)}
							onNext={() => goToScene(activeScene + 1)}
							onFirst={() => goToScene(0)}
							onLast={() => goToScene(total - 1)}
							onJump={idx => goToScene(idx)}
							onTogglePlay={handleTogglePlay}
						/>
					)}
				</div>
			</div>

			<div className={styles.proseColumn}>
				{scenes.map((scene, idx) => {
					const effectiveState = retryingScenes.has(scene.id)
						? undefined
						: checkStates?.[scene.id];
					const nextScene = scenes[idx + 1];
					return (
						<article
							key={scene.id}
							id={`scene-${scene.id}`}
							ref={node => {
								sceneRefs.current[idx] = node;
							}}
							data-scene={idx}
							className={`${styles.scene} ${
								activeScene === idx ? styles.sceneActive : ''
							}`}
						>
							<span className={styles.sceneIndex}>
								{String(idx + 1).padStart(2, '0')}
							</span>
							{scene.eyebrow && (
								<p className={styles.sceneEyebrow}>{scene.eyebrow}</p>
							)}
							<h2 className={styles.sceneTitle}>{scene.title}</h2>
							<p className={styles.sceneBody}>{scene.body}</p>
							{scene.check && (
								<LessonCheck
									check={scene.check}
									state={effectiveState}
									// The active scene's unanswered check is what holds
									// progress back; surface that affordance on the card
									// itself, where the student is reading, rather than
									// only in the control bar's muted caption.
									gated={activeScene === idx && Boolean(blockedReason)}
									onAnswer={payload => handleLessonAnswer(scene.id, payload)}
									onRetry={() => handleRetry(scene.id)}
									onReveal={
										scene.check.revealGate
											? () => handleReveal(scene.id)
											: undefined
									}
									onContinue={nextScene ? () => goToScene(idx + 1) : undefined}
									continueLabel={
										nextScene
											? `Continue to ${nextScene.eyebrow || nextScene.title}`
											: undefined
									}
								/>
							)}
						</article>
					);
				})}
			</div>
		</section>
	);
};

export default TopicScrolly;
