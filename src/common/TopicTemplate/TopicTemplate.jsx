import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
	ArrowDown,
	ArrowRight,
	ChevronDown,
	ChevronRight,
} from 'lucide-react';
import { CURRICULUM } from '../../data/curriculum.js';
import { logActivity } from '../../lib/activityLog.js';
import useProgress from '../../hooks/useProgress.js';
import useReducedMotion from '../../hooks/useReducedMotion.js';
import TopicScrolly from './TopicScrolly.jsx';
import styles from './TopicTemplate.module.css';

// ── Collapsible cheat-sheet (prop-driven disclosure) ──
// cheatSheet shape:
//   { keyIdea?: string|node,
//     sections?: [{ title: string, items: [{ term, def } | string|node] }] }
const CheatSheet = ({ cheatSheet }) => {
	const [open, setOpen] = useState(false);
	if (!cheatSheet) return null;
	const { keyIdea, sections = [] } = cheatSheet;
	return (
		<section className={styles.cheatSheet} aria-labelledby="cheatsheet-heading">
			<button
				type="button"
				className={styles.cheatToggle}
				onClick={() => setOpen(o => !o)}
				aria-expanded={open}
				aria-controls="cheatsheet-body"
			>
				<span className={styles.cheatToggleLabel}>
					<span className={styles.eyebrow} id="cheatsheet-heading">
						Cheat sheet
					</span>
					<span className={styles.cheatHint}>
						Definitions, recurrences, runtimes
					</span>
				</span>
				<ChevronDown
					size={16}
					strokeWidth={2}
					aria-hidden="true"
					className={`${styles.cheatChevron} ${open ? styles.cheatChevronOpen : ''}`}
				/>
			</button>
			{open && (
				<div className={styles.cheatBody} id="cheatsheet-body">
					{keyIdea && (
						<div className={styles.cheatKeyIdea}>
							<span className={styles.cheatKeyLabel}>The one key idea</span>
							<p className={styles.cheatKeyText}>{keyIdea}</p>
						</div>
					)}
					{sections.map((section, i) => (
						<div key={section.title || i} className={styles.cheatSection}>
							{section.title && (
								<h3 className={styles.cheatSectionTitle}>{section.title}</h3>
							)}
							<dl className={styles.cheatList}>
								{(section.items || []).map((item, j) =>
									item && typeof item === 'object' && 'term' in item ? (
										<div key={item.term || j} className={styles.cheatRow}>
											<dt className={styles.cheatTerm}>{item.term}</dt>
											<dd className={styles.cheatDef}>{item.def}</dd>
										</div>
									) : (
										<div key={j} className={styles.cheatRow}>
											<dd className={styles.cheatDefFull}>{item}</dd>
										</div>
									)
								)}
							</dl>
						</div>
					))}
				</div>
			)}
		</section>
	);
};

// ── Scene navigator / minimap (keyboard-accessible jump-links) ──
const SceneNavigator = ({ scenes, activeScene, hasPlayground, onJump }) => {
	if (!scenes || scenes.length === 0) return null;
	return (
		<nav className={styles.sceneNav} aria-label="Scenes in this topic">
			<ol className={styles.sceneNavList}>
				{scenes.map((scene, idx) => (
					<li key={scene.id}>
						<a
							href={`#scene-${scene.id}`}
							className={`${styles.sceneNavLink} ${
								activeScene === idx ? styles.sceneNavLinkActive : ''
							}`}
							aria-current={activeScene === idx ? 'true' : undefined}
							onClick={e => {
								e.preventDefault();
								onJump(`scene-${scene.id}`);
							}}
						>
							<span className={styles.sceneNavNum}>
								{String(idx + 1).padStart(2, '0')}
							</span>
							<span className={styles.sceneNavTitle}>{scene.title}</span>
						</a>
					</li>
				))}
				{hasPlayground && (
					<li>
						<a
							href="#topic-playground"
							className={styles.sceneNavLink}
							onClick={e => {
								e.preventDefault();
								onJump('topic-playground');
							}}
						>
							<span className={styles.sceneNavNum}>▶</span>
							<span className={styles.sceneNavTitle}>Playground</span>
						</a>
					</li>
				)}
			</ol>
		</nav>
	);
};

/**
 * TopicTemplate — the canonical, content-agnostic topic-page shell.
 *
 * Implements the locked section order:
 *   Hero → Concept (scrolly) → Visualization (sticky stage) →
 *   Comprehension check (inline per scene) → Playground → What's next
 * plus breadcrumbs, an optional collapsible cheat-sheet, a scene navigator,
 * and the "up next on the path" footer.
 *
 * Driven entirely by props + the topic object from curriculum.js. Every visual
 * token comes from src/styles/theme.css; the page is tinted by the topic's
 * signature hue via the `--topic-accent` CSS variable.
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
 *                  LessonCheck / checkAnswer for the kinds + shapes).
 *   renderStage    (activeScene) => node — the sticky visualization.
 *   checkStates    optional controlled map { [sceneId]: state } for checks.
 *   onAnswer       optional (sceneId, payload) => void — generic check submit
 *                  for every kind. The host grades + updates checkStates.
 *   onChoiceAnswer optional (sceneId, value) => void — backward-compatible alias
 *                  of onAnswer (kept so existing topics keep working).
 *
 *   cheatSheet     optional { keyIdea?, sections? } → collapsible cheat-sheet.
 *   showSceneNav   optional boolean (default true when scenes present) — render
 *                  the scene navigator / minimap.
 *
 *   playgroundEyebrow / playgroundTitle / playgroundLede  playground header.
 *   renderPlayground  () => node — the interactive sandbox.
 *   playgroundLabel   label for the skip-to-playground button (default given).
 *
 *   requiredChecks optional number — how many checks must be answered correctly
 *                  for the topic to count as completed. Defaults to the number
 *                  of scenes that carry a `check`. Set 0 to opt out (completion
 *                  then comes only from explicit markCompleted, e.g. playground).
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
	onAnswer,
	onChoiceAnswer,
	cheatSheet,
	showSceneNav,
	playgroundEyebrow = 'Playground',
	playgroundTitle,
	playgroundLede,
	playgroundLabel = 'Skip to playground',
	renderPlayground,
	requiredChecks,
	onVisit,
	children,
}) => {
	const reducedMotion = useReducedMotion();
	const { markVisited, markCompleted, recordCheck, correctCheckCount } =
		useProgress();
	const playgroundRef = useRef(null);
	const [activeScene, setActiveScene] = useState(0);

	const topic = CURRICULUM.find(t => t.id === topicId) || null;
	const topicIdx = CURRICULUM.findIndex(t => t.id === topicId);
	const nextTopic = topicIdx >= 0 ? CURRICULUM[topicIdx + 1] : null;
	const resolvedAccent = accent || `var(--topic-${topicId})`;
	// Derive the AA partner tokens from whichever topic hue the page actually
	// uses. Pages may pass accent={topic.accent} (which is itself "var(--topic-
	// <suffix>)", e.g. linsort/sssp where the suffix ≠ the topicId), so we parse
	// the suffix off the resolved accent rather than the topicId. A genuinely
	// custom (non-topic) accent color falls back to the theme-neutral defaults.
	const topicSuffix = /^var\(--topic-([a-z0-9]+)\)$/.exec(resolvedAccent)?.[1];
	// AA-safe text color to place ON the solid topic fill (white on deep hues,
	// dark ink on the light yellow-green band in light theme).
	const resolvedContrast = topicSuffix
		? `var(--topic-${topicSuffix}-contrast)`
		: 'var(--color-text-on-accent)';
	// AA-safe variant of the topic hue for use as small (<13px) colored TEXT.
	const resolvedInk = topicSuffix
		? `var(--topic-${topicSuffix}-ink)`
		: 'var(--topic-accent-ink)';

	// Generic submit; onChoiceAnswer remains supported as an alias. Wrapped so
	// every answered scene check logs a day of study (streak / "today" / heatmap).
	const submitAnswer = onAnswer || onChoiceAnswer;
	const handleAnswer = useCallback(
		(sceneId, payload) => {
			submitAnswer?.(sceneId, payload);
			logActivity();
		},
		[submitAnswer]
	);

	// How many correct checks complete this topic. Default = scenes carrying a
	// check, so completion derives from correct retrieval (Deliverable D).
	const checkCount = useMemo(
		() => scenes.filter(s => s.check).length,
		[scenes]
	);
	const requiredForCompletion =
		requiredChecks != null ? requiredChecks : checkCount;

	useEffect(() => {
		if (onVisit) onVisit();
		else if (topicId) markVisited(topicId);
	}, [onVisit, markVisited, topicId]);

	// Record correct answers as progress whenever a check resolves to 'correct'.
	// Driven off the host-owned checkStates so this works for every check kind
	// without the host needing to call recordCheck itself. When the topic has
	// answered enough required checks correctly, completion is derived from that
	// retrieval (not mere interaction) and persisted via markCompleted.
	useEffect(() => {
		if (!topicId || !checkStates) return;
		Object.entries(checkStates).forEach(([sceneId, st]) => {
			if (st?.status === 'correct') recordCheck(topicId, sceneId, true);
		});
		if (
			requiredForCompletion > 0 &&
			correctCheckCount(topicId) >= requiredForCompletion
		) {
			markCompleted(topicId);
		}
	}, [
		topicId,
		checkStates,
		recordCheck,
		markCompleted,
		correctCheckCount,
		requiredForCompletion,
	]);

	const scrollToId = useCallback(
		id => {
			const el = document.getElementById(id);
			if (!el) return;
			el.scrollIntoView({
				behavior: reducedMotion ? 'auto' : 'smooth',
				block: 'start',
			});
		},
		[reducedMotion]
	);

	const handleSkipToPlayground = useCallback(() => {
		playgroundRef.current?.scrollIntoView({
			behavior: reducedMotion ? 'auto' : 'smooth',
			block: 'start',
		});
	}, [reducedMotion]);

	// The scene navigator duplicated the lesson outline (already in each scene's
	// title, the cheat sheet, and the stage's SceneControlBar) and, sitting in the
	// hero, pushed the live visualization below the fold. Off by default now; the
	// stage-docked SceneControlBar is the single scene player. A topic can still
	// opt back in with showSceneNav.
	const navEnabled = showSceneNav ?? false;

	return (
		<div
			className={styles.page}
			style={{
				'--topic-accent': resolvedAccent,
				'--topic-accent-contrast': resolvedContrast,
				'--topic-accent-ink': resolvedInk,
			}}
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

				{(cheatSheet || navEnabled) && (
					<div className={styles.heroAside}>
						<CheatSheet cheatSheet={cheatSheet} />
						{navEnabled && (
							<SceneNavigator
								scenes={scenes}
								activeScene={activeScene}
								hasPlayground={Boolean(renderPlayground)}
								onJump={scrollToId}
							/>
						)}
					</div>
				)}
			</section>

			{scenes.length > 0 && renderStage && (
				<TopicScrolly
					scenes={scenes}
					renderStage={renderStage}
					checkStates={checkStates}
					onAnswer={handleAnswer}
					onActiveScene={setActiveScene}
				/>
			)}

			{renderPlayground && (
				<section
					id="topic-playground"
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
