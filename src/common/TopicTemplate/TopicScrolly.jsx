import { useCallback, useEffect, useRef, useState } from 'react';
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
 *   renderStage    (activeScene:number) => node — the sticky stage.
 *   checkStates    optional map { [sceneId]: state } for the inline checks.
 *   onAnswer       optional (sceneId, payload) => void — generic check submit
 *                  for every check kind (choice/numeric/text/order/classify/…).
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
	const sceneRefs = useRef([]);
	const rootRef = useRef(null);
	const total = scenes.length;

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
			// Stepping one beat (Prev/Next) updates the active scene + stage but
			// holds the page still, so a panicked reader can rewind WITHOUT the
			// page scrolling out from under them. Jump targets (dots, First/Last)
			// keep scroll:true and recenter. Default true preserves prior behavior
			// for every existing caller across all topics.
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
	const blockedReason =
		currentScene?.check && !checkStates?.[currentScene.id]?.status
			? 'answer the check to continue'
			: null;

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
			ref={rootRef}
			className={styles.scrolly}
			aria-label="Concept, scene by scene"
		>
			<div className={styles.stageColumn}>
				<div className={styles.stageSticky}>
					<div className={styles.stageFigure}>{renderStage(activeScene)}</div>
					{total > 1 && (
						<SceneControlBar
							total={total}
							active={activeScene}
							isPlaying={isPlaying}
							scenes={scenes}
							blockedReason={blockedReason}
							scopeRef={rootRef}
							reducedMotion={reducedMotion}
							onPrev={() => goToScene(activeScene - 1, { scroll: false })}
							onNext={() => goToScene(activeScene + 1, { scroll: false })}
							onFirst={() => goToScene(0)}
							onLast={() => goToScene(total - 1)}
							onJump={idx => goToScene(idx)}
							onTogglePlay={handleTogglePlay}
						/>
					)}
				</div>
			</div>

			<div className={styles.proseColumn}>
				{scenes.map((scene, idx) => (
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
								state={checkStates?.[scene.id]}
								// The active scene's unanswered check is what holds
								// progress back; surface that affordance on the card
								// itself, where the student is reading, rather than
								// only in the control bar's muted caption.
								gated={activeScene === idx && Boolean(blockedReason)}
								onAnswer={payload => handleAnswer?.(scene.id, payload)}
							/>
						)}
					</article>
				))}
			</div>
		</section>
	);
};

export default TopicScrolly;
