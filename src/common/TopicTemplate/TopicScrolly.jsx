import { useEffect, useRef, useState } from 'react';
import LessonCheck from './LessonCheck.jsx';
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
 *   onChoiceAnswer optional (sceneId, value) => void for choice checks.
 *   onActiveScene  optional (index:number) => void notifier.
 */
const TopicScrolly = ({
	scenes,
	renderStage,
	checkStates,
	onChoiceAnswer,
	onActiveScene,
}) => {
	const [activeScene, setActiveScene] = useState(0);
	const sceneRefs = useRef([]);
	const rootRef = useRef(null);

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
				root,
				threshold: [0.4, 0.6, 0.8],
				rootMargin: '-25% 0px -35% 0px',
			}
		);
		sceneRefs.current.forEach(node => {
			if (node) observer.observe(node);
		});
		return () => observer.disconnect();
	}, [onActiveScene]);

	return (
		<section
			ref={rootRef}
			className={styles.scrolly}
			aria-label="Concept, scene by scene"
		>
			<div className={styles.stageColumn}>
				<div className={styles.stageSticky}>{renderStage(activeScene)}</div>
			</div>

			<div className={styles.proseColumn}>
				{scenes.map((scene, idx) => (
					<article
						key={scene.id}
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
								onChoiceAnswer={value =>
									onChoiceAnswer?.(scene.id, value)
								}
							/>
						)}
					</article>
				))}
			</div>
		</section>
	);
};

export default TopicScrolly;
