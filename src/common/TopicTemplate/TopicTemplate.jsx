import { useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, ChevronRight } from 'lucide-react';
import { CURRICULUM } from '../../data/curriculum.js';
import useProgress from '../../hooks/useProgress.js';
import useReducedMotion from '../../hooks/useReducedMotion.js';
import TopicScrolly from './TopicScrolly.jsx';
import styles from './TopicTemplate.module.css';

/**
 * TopicTemplate — the canonical, content-agnostic topic-page shell.
 *
 * Implements the locked section order:
 *   Hero → Concept (scrolly) → Visualization (sticky stage) →
 *   Comprehension check (inline per scene) → Playground → What's next
 * plus breadcrumbs and the "up next on the path" footer.
 *
 * It is driven entirely by props and the topic object from curriculum.js;
 * Phase 3 topic agents fill it without bespoke styling. Every visual token
 * comes from src/styles/theme.css. The page is tinted by the topic's signature
 * hue via the `--topic-accent` CSS variable.
 *
 * Props
 * -----
 *   topicId        id from curriculum.js (resolves accent, name, up-next).
 *   accent         CSS color for the topic accent (default var(--topic-<id>)).
 *
 *   eyebrow        small mono kicker over the hero title.
 *   title          hero headline (string or node).
 *   lede           hero supporting paragraph (string or node).
 *
 *   scenes         Array<Scene> for the scrolly concept section. Each scene:
 *                    { id, eyebrow, title, body, check? }
 *                  `check` drives the inline comprehension check (see
 *                  LessonCheck for the shape).
 *   renderStage    (activeScene) => node — the sticky visualization. Receives
 *                  the active scene index so the stage can react to scroll.
 *   checkStates    optional controlled map { [sceneId]: state } for checks.
 *   onChoiceAnswer optional (sceneId, value) => void for choice checks.
 *
 *   playgroundEyebrow / playgroundTitle / playgroundLede  playground header.
 *   renderPlayground  () => node — the interactive sandbox.
 *   playgroundLabel   label for the skip-to-playground button (default given).
 *
 *   onVisit        optional () => void; defaults to markVisited(topicId).
 *   children       optional extra sections rendered after the playground.
 */
const TopicTemplate = ({
	topicId,
	accent,
	eyebrow,
	title,
	lede,
	scenes = [],
	renderStage,
	checkStates,
	onChoiceAnswer,
	playgroundEyebrow = 'Playground',
	playgroundTitle,
	playgroundLede,
	playgroundLabel = 'Skip to playground',
	renderPlayground,
	onVisit,
	children,
}) => {
	const reducedMotion = useReducedMotion();
	const { markVisited } = useProgress();
	const playgroundRef = useRef(null);

	const topic = CURRICULUM.find(t => t.id === topicId) || null;
	const topicIdx = CURRICULUM.findIndex(t => t.id === topicId);
	const nextTopic = topicIdx >= 0 ? CURRICULUM[topicIdx + 1] : null;
	const resolvedAccent = accent || `var(--topic-${topicId})`;

	useEffect(() => {
		if (onVisit) onVisit();
		else if (topicId) markVisited(topicId);
	}, [onVisit, markVisited, topicId]);

	const handleSkipToPlayground = useCallback(() => {
		playgroundRef.current?.scrollIntoView({
			behavior: reducedMotion ? 'auto' : 'smooth',
			block: 'start',
		});
	}, [reducedMotion]);

	return (
		<div
			className={styles.page}
			style={{ '--topic-accent': resolvedAccent }}
		>
			<header className={styles.topicHeader}>
				<div className={styles.topicHeaderInner}>
					<nav className={styles.crumbs} aria-label="Breadcrumb">
						<Link to="/" className={styles.crumbLink}>
							Path
						</Link>
						<ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
						<span className={styles.crumbCurrent}>{topic?.name}</span>
					</nav>
					{renderPlayground && (
						<button
							type="button"
							className={styles.skipBtn}
							onClick={handleSkipToPlayground}
						>
							<span>{playgroundLabel}</span>
							<ArrowDown size={13} strokeWidth={2} aria-hidden="true" />
						</button>
					)}
				</div>
			</header>

			<section className={styles.hero} aria-labelledby="topic-title">
				{eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
				<h1 id="topic-title" className={styles.heroTitle}>
					{title}
				</h1>
				{lede && <p className={styles.heroLede}>{lede}</p>}
			</section>

			{scenes.length > 0 && renderStage && (
				<TopicScrolly
					scenes={scenes}
					renderStage={renderStage}
					checkStates={checkStates}
					onChoiceAnswer={onChoiceAnswer}
				/>
			)}

			{renderPlayground && (
				<section
					ref={playgroundRef}
					className={styles.playgroundSection}
					aria-labelledby="playground-heading"
				>
					<header className={styles.playgroundHeader}>
						{playgroundEyebrow && (
							<p className={styles.eyebrow}>{playgroundEyebrow}</p>
						)}
						{playgroundTitle && (
							<h2
								id="playground-heading"
								className={styles.playgroundTitle}
							>
								{playgroundTitle}
							</h2>
						)}
						{playgroundLede && (
							<p className={styles.playgroundLede}>{playgroundLede}</p>
						)}
					</header>
					{renderPlayground()}
				</section>
			)}

			{children}

			{nextTopic && (
				<footer className={styles.upNext}>
					<div>
						<p className={styles.label}>Up next on the path</p>
						<Link to={nextTopic.to} className={styles.upNextLink}>
							{nextTopic.name}
							<ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
						</Link>
						<p className={styles.upNextQuote}>{nextTopic.pullQuote}</p>
					</div>
				</footer>
			)}
		</div>
	);
};

export default TopicTemplate;
