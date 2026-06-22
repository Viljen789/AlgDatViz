import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
	ArrowDown,
	ArrowRight,
	Brain,
	ChevronDown,
	ChevronRight,
	Target,
	X,
} from 'lucide-react';
import { CURRICULUM } from '../../data/curriculum.js';
import { logActivity } from '../../lib/activityLog.js';
import {
	buildTopicQueue,
	isSelfGraded,
} from '../../components/Review/reviewBank.js';
import ReviewSession from '../../components/Review/ReviewSession.jsx';
import useProgress from '../../hooks/useProgress.js';
import useSrs from '../../hooks/useSrs.js';
import useReducedMotion from '../../hooks/useReducedMotion.js';
import TopicScrolly from './TopicScrolly.jsx';
import styles from './TopicTemplate.module.css';

// How many never-seen cards the lesson-end drill introduces at once. Matches the
// /review + /progress one-click drill cap so a topic's first drill from the lesson
// end isn't a wall of new questions (kept in lockstep with ProgressPage).
const TOPIC_NEW_CAP = 8;

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
	const {
		markVisited,
		markCompleted,
		recordCheck,
		recordScene,
		correctCheckCount,
		furthestScene,
	} = useProgress();
	const { seed: seedCard, cards, grade } = useSrs();
	const playgroundRef = useRef(null);
	const [activeScene, setActiveScene] = useState(0);
	// The scene to resume at — read once on mount so a later persist (recordScene
	// fires as the reader scrolls) can't change where this render started.
	const resumeSceneRef = useRef(furthestScene(topicId));

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

	// The scrolly notifies on every active-scene change; track it locally (for the
	// optional scene navigator) and persist the furthest-reached scene so the next
	// visit resumes here. recordScene only ever advances, so scrolling back up
	// never rewinds the resume point.
	const handleActiveScene = useCallback(
		idx => {
			setActiveScene(idx);
			if (topicId) recordScene(topicId, idx);
		},
		[topicId, recordScene]
	);

	// How many correct checks complete this topic. Default = scenes carrying a
	// check, so completion derives from correct retrieval (Deliverable D).
	const checkCount = useMemo(
		() => scenes.filter(s => s.check).length,
		[scenes]
	);
	const requiredForCompletion =
		requiredChecks != null ? requiredChecks : checkCount;

	// Which scene checks are self-graded — exactly the kinds the review bank
	// collects (the rest are host-graded and have no `${topicId}:${sceneId}` card).
	// Seeding only these keeps the in-lesson seed 1:1 with the bank / /review.
	const selfGradedScenes = useMemo(() => {
		const set = new Set();
		for (const s of scenes) {
			if (s?.id && isSelfGraded(s.check)) set.add(s.id);
		}
		return set;
	}, [scenes]);

	// Completion signal (same derivation as the persist effect below): enough
	// required checks answered correctly. Drives the "Lock it in" section's tone —
	// a finished lesson gets a confident close, an unfinished one a quieter nudge.
	const isComplete =
		requiredForCompletion > 0 &&
		correctCheckCount(topicId) >= requiredForCompletion;

	// ── Lesson-end retrieval drill (the "Lock it in" handoff) ────────────────────
	// Finishing a lesson hands the student straight into a topic-scoped review drill
	// instead of only pointing at the next lesson. By lesson end this topic has SRS
	// cards under `${topicId}:${sceneId}` (seeded from the in-lesson checks above),
	// so we reuse the SAME scheduler /review and /progress use — buildTopicQueue →
	// ReviewSession, graded through the SAME useSrs.grade + logActivity path — so a
	// lesson-end drill reschedules exactly the cards the revision plan reads. The
	// queue is snapshot at launch so it doesn't reshuffle as cards reschedule out of
	// "due" on each answer (mirrors /review and ProgressPage's plan-day drill).
	const drillStats = useMemo(
		() =>
			buildTopicQueue({
				topicId,
				cards,
				now: Date.now(),
				newCap: TOPIC_NEW_CAP,
			}),
		[topicId, cards]
	);
	// The topic has bank-backed cards seeded from the in-lesson checks (a skimmer
	// who answered nothing seeds none → available 0). Distinguish two empty cases:
	//   • nothing seeded at all  → coach to answer the checks (no drill button).
	//   • cards seeded but none due/fresh right now → all scheduled out; the drill
	//     button would be a dead end, so we say "scheduled" and keep the exam link.
	const hasCards = drillStats.available > 0;
	const canDrill = drillStats.queue.length > 0;
	const [drill, setDrill] = useState(null); // { questions, runId } | null

	const startDrill = useCallback(() => {
		const plan = buildTopicQueue({
			topicId,
			cards,
			now: Date.now(),
			newCap: TOPIC_NEW_CAP,
		});
		if (plan.queue.length === 0) return; // nothing due/fresh right now
		setDrill(prev => ({
			questions: plan.queue,
			// Bump a run id so re-launching remounts ReviewSession from the top.
			runId: (prev?.runId ?? 0) + 1,
		}));
	}, [topicId, cards]);

	const closeDrill = useCallback(() => setDrill(null), []);

	// "Start over" re-snapshots the SAME topic against the now freshly-graded
	// schedule, so a restart pulls whatever is still due (mirrors ProgressPage).
	const restartDrill = useCallback(() => startDrill(), [startDrill]);

	// Grade the card AND log a day of study — the EXACT path /review uses, so a
	// lesson-end drill reschedules cards and lights the heatmap identically.
	const handleDrillGraded = useCallback(
		(id, correct) => {
			grade(id, correct);
			logActivity();
		},
		[grade]
	);

	useEffect(() => {
		if (onVisit) onVisit();
		else if (topicId) markVisited(topicId);
	}, [onVisit, markVisited, topicId]);

	// Record correct answers as progress whenever a check resolves to 'correct',
	// and — the retrieval-leak fix — seed an SRS card the FIRST time a check is
	// answered so in-lesson retrieval reaches spaced repetition. Driven off the
	// host-owned checkStates so this works for every check kind without the host
	// needing to call recordCheck/seed itself.
	//
	// Seeding uses the review-bank id `${topicId}:${sceneId}` so the card lines up
	// 1:1 with /review. A correct first try seeds a success (enters at the same box
	// /review uses for a first success); a first 'incorrect' (the answer is revealed
	// at that point) seeds a lapse (box 0, due now) for desirable difficulty.
	// useSrs.seed is idempotent on card existence, so re-answers and re-scrolls
	// never re-grade or inflate the schedule — only the genuinely first answer per
	// check creates a card; after that the card advances only through /review.
	//
	// When enough required checks are answered correctly, completion is derived
	// from that retrieval (not mere interaction) and persisted via markCompleted.
	useEffect(() => {
		if (!topicId || !checkStates) return;
		Object.entries(checkStates).forEach(([sceneId, st]) => {
			const status = st?.status;
			if (status === 'correct') recordCheck(topicId, sceneId, true);
			// First resolved answer seeds the card. Hosts write exactly 'correct' or
			// 'incorrect' (and reveal the explanation on 'incorrect'), so 'incorrect'
			// IS the revealed-wrong signal → seed a lapse. The hook enforces
			// first-only, so a wrong→correct fix on the same scroll won't re-grade.
			if (
				(status === 'correct' || status === 'incorrect') &&
				selfGradedScenes.has(sceneId)
			) {
				seedCard(`${topicId}:${sceneId}`, status === 'correct');
			}
		});
		if (isComplete) {
			markCompleted(topicId);
		}
	}, [
		topicId,
		checkStates,
		recordCheck,
		seedCard,
		selfGradedScenes,
		markCompleted,
		isComplete,
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
					onActiveScene={handleActiveScene}
					initialScene={resumeSceneRef.current}
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
							<h2 id="playground-heading" className={styles.playgroundTitle}>
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

			{/* "Lock it in" — the retrieval handoff. Finishing a lesson hands the
			    reader into a topic-scoped review drill (re-deriving from memory is
			    what makes it stick) and offers the topic's exam set, rather than only
			    pointing at the next lesson. The section is confident when the lesson is
			    complete and a quieter nudge otherwise; when no cards were seeded (a
			    skimmer who answered nothing) it degrades to a gentle line + the exam
			    link, never a broken drill. */}
			<section
				className={`${styles.lockIn} ${
					isComplete ? styles.lockInDone : styles.lockInOpen
				}`}
				aria-labelledby="lockin-heading"
			>
				<div className={styles.lockInHead}>
					<p className={styles.eyebrow}>Lock it in</p>
					<h2 id="lockin-heading" className={styles.lockInTitle}>
						{isComplete ? 'Now recall it cold' : 'Make it stick'}
					</h2>
					<p className={styles.lockInLede}>
						{canDrill
							? 'Re-deriving each idea from memory is what fixes it. Run a short retrieval drill on this topic, then come back to it in a day or two.'
							: hasCards
								? "Nice, this topic's cards are scheduled. Spaced review will surface them again when they are due. For now, test yourself on exam-shaped problems."
								: 'Answering the checks as you read builds a retrieval drill for this topic. Re-deriving from memory is what makes it stick.'}
					</p>
				</div>

				{drill ? (
					<div id="lockin-drill" className={styles.lockInDrill}>
						<div className={styles.lockInDrillHead}>
							<p className={styles.lockInDrillTitle}>
								Retrieving <strong>{topic?.name}</strong> ·{' '}
								{drill.questions.length} question
								{drill.questions.length === 1 ? '' : 's'}
							</p>
							<button
								type="button"
								className={styles.lockInDrillClose}
								onClick={closeDrill}
							>
								<X size={14} strokeWidth={2.2} aria-hidden="true" />
								<span>Done</span>
							</button>
						</div>
						<ReviewSession
							key={drill.runId}
							questions={drill.questions}
							onRestart={restartDrill}
							onGraded={handleDrillGraded}
						/>
					</div>
				) : (
					<div className={styles.lockInActions}>
						{canDrill && (
							<button
								type="button"
								className={styles.lockInPrimary}
								aria-controls="lockin-drill"
								aria-expanded={false}
								onClick={startDrill}
							>
								<Brain size={16} strokeWidth={2.2} aria-hidden="true" />
								<span>
									Recall this topic
									{drillStats.queue.length > 0
										? ` · ${drillStats.queue.length} card${
												drillStats.queue.length === 1 ? '' : 's'
											}`
										: ''}
								</span>
							</button>
						)}
						<Link
							to={`/exam?topic=${topicId}`}
							className={styles.lockInSecondary}
						>
							<Target size={15} strokeWidth={2.2} aria-hidden="true" />
							<span>Practice exam questions</span>
							<ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
						</Link>
					</div>
				)}
			</section>

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
