import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
	ArrowRight,
	ChevronRight,
	Flame,
	Minus,
	RotateCcw,
	Target,
	TrendingDown,
	TrendingUp,
	X,
} from 'lucide-react';
import { BUILT_TOPICS, FIRST_TOPIC, TOPIC_BY_ID } from '../data/curriculum.js';
import {
	REVIEW_BANK,
	buildTopicQueue,
} from '../components/Review/reviewBank.js';
import ReviewSession from '../components/Review/ReviewSession.jsx';
import Eyebrow from '../common/Eyebrow/Eyebrow.jsx';
import { allMastery } from '../lib/mastery.js';
import { rankWeakTopics } from '../lib/weakTopics.js';
import { buildRevisionPlan } from '../lib/revisionPlan.js';
import { clearExamLog, useExamLog } from '../lib/examLog.js';
import { addDays, logActivity, todayKey } from '../lib/activityLog.js';
import useProgress from '../hooks/useProgress.js';
import useSrs from '../hooks/useSrs.js';
import useActivity from '../hooks/useActivity.js';
import styles from './ProgressPage.module.css';

// How many never-seen cards a single topic drill introduces at once. Matches the
// /review new-card cap so a topic's first drill isn't a wall of new questions.
const TOPIC_NEW_CAP = 8;

const HEAT_WEEKS = 13;
const pct = s => Math.round(s * 100);

// A revision-plan day's short label: "Today" for the first day, "+1"/"+2"… after.
const dayOffsetLabel = index => (index === 0 ? 'Today' : `+${index}`);

// The heatmap colour ramp, brightest at the right: empty, then three brand-tinted
// steps. The legend and every day-cell read from this one array so "Less → More"
// always matches the squares above it. Both themes inherit the brand hue.
const HEAT_RAMP = [
	'var(--color-border-subtle)',
	'hsl(var(--brand-h) var(--brand-s) var(--brand-l) / 0.3)',
	'hsl(var(--brand-h) var(--brand-s) var(--brand-l) / 0.6)',
	'hsl(var(--brand-h) var(--brand-s) var(--brand-l) / 0.95)',
];

// One day's count → its ramp bucket 0..3 (0 answered → empty; thresholds at 3
// and 6). The bucket drives BOTH the fill colour and a redundant inset ring, so
// the heatmap never encodes intensity by hue alone (colour-blind safe).
const heatLevel = c => (c <= 0 ? 0 : c < 3 ? 1 : c < 6 ? 2 : 3);
const heat = c => HEAT_RAMP[heatLevel(c)];

// Month labels keyed to the first week-column that begins in each month, so the
// strip above the heatmap reads like a calendar without one label per week.
const MONTHS = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
];

// "Mon 16 Jun" for a YYYY-MM-DD key — the calendar date beside each plan day.
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const formatPlanDate = key => {
	const d = new Date(`${key}T00:00:00`);
	return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

// A tiny exam-score sparkline: the climb across sittings, oldest-left. Purely
// decorative reinforcement of the delta chip beside it (the chip carries the
// readable signal), so it is aria-hidden. Points are normalised to a fixed 0..1
// band — a flat line means flat scores, not "no data". One point can't draw a
// line, so the dot fallback keeps a single-sit topic from rendering blank (the
// grid only mounts this for >= 2 sits anyway).
const SPARK_W = 40;
const SPARK_H = 14;
const SPARK_PAD = 2;
const Sparkline = ({ history }) => {
	const n = history.length;
	const span = SPARK_W - SPARK_PAD * 2;
	const x = i => SPARK_PAD + (n <= 1 ? span / 2 : (i / (n - 1)) * span);
	// y inverts the ratio: a higher score sits higher on the strip.
	const y = v => SPARK_PAD + (1 - v) * (SPARK_H - SPARK_PAD * 2);
	const points = history.map((v, i) => `${x(i)},${y(v)}`).join(' ');
	return (
		<svg
			className={styles.spark}
			viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
			width={SPARK_W}
			height={SPARK_H}
			aria-hidden="true"
			focusable="false"
		>
			<polyline
				points={points}
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			{/* A filled dot on the latest sitting anchors the eye at "today". */}
			<circle
				cx={x(n - 1)}
				cy={y(history[n - 1])}
				r="1.6"
				fill="currentColor"
			/>
		</svg>
	);
};

// The per-topic exam trend: a sparkline of the climb plus a delta chip. The chip
// is colour-blind-safe by construction — it pairs a direction GLYPH (up/down/flat
// arrow) with an explicit +/- SIGN and the point count, so the meaning never rides
// on hue alone. `delta` is a ratio change in [-1,1]; we show it as signed points.
const DELTA_GLYPH = { 1: TrendingUp, '-1': TrendingDown, 0: Minus };
const ExamTrend = ({ trend }) => {
	const points = Math.round(trend.delta * 100);
	const signed = points > 0 ? `+${points}` : `${points}`; // 0 ⇒ "0", down ⇒ "-N"
	const Glyph = DELTA_GLYPH[trend.direction];
	const dir =
		trend.direction === 1 ? 'up' : trend.direction === -1 ? 'down' : 'flat';
	const word = trend.direction === 0 ? 'level' : `${signed} points`;
	return (
		<span className={styles.trend} data-dir={dir}>
			<Sparkline history={trend.history} />
			<span className={styles.trendDelta}>
				<Glyph size={12} strokeWidth={2.4} aria-hidden="true" />
				<span className={styles.trendNum}>{signed}</span>
			</span>
			<span className={styles.srOnly}>
				{`Exam trend: ${word} across ${trend.count} sittings since the first sit.`}
			</span>
		</span>
	);
};

/**
 * ProgressPage (/progress) — the mastery dashboard.
 *
 * Turns the data the app already collects (correct checks + SRS cards + the new
 * activity log) into the diagnostic that actually matters for exam prep: which
 * topics have decayed, how the streak is doing, and how long until the exam.
 */
const ProgressPage = () => {
	const {
		checks,
		isCompleted,
		isVisited,
		overall,
		firstTryStats,
		reset: resetProgress,
	} = useProgress();
	const { cards, grade, reset: resetSrs } = useSrs();
	const { examScores, examDeltas } = useExamLog();
	const {
		days,
		examDate,
		currentStreak,
		longestStreak,
		daysUntilExam,
		setExamDate,
		reset: resetActivity,
	} = useActivity();

	// One "today" (local YYYY-MM-DD) drives the heatmap window AND the revision
	// plan's day buckets, so both read the same calendar day.
	const today = todayKey();

	// Fold the /exam outcomes into mastery: a recent, exam-shaped "could I do this
	// cold?" signal. This is also what makes an exam-only topic (e.g. graphs, with
	// no review bank) carry a real score rather than reading as "not started".
	const mastery = useMemo(
		() => allMastery({ bank: REVIEW_BANK, checks, cards, examScores }),
		[checks, cards, examScores]
	);

	const topics = useMemo(
		() =>
			BUILT_TOPICS.map(t => {
				const m = mastery[t.id];
				const completed = isCompleted(t.id);
				const score = m ? m.score : completed ? 1 : isVisited(t.id) ? 0.3 : 0;
				return {
					...t,
					score,
					answered: m?.answered ?? 0,
					total: m?.total ?? 0,
					hasData: m?.hasData ?? false,
					fromExam: m?.fromExam ?? false,
					// Evidence-of-motion across exam sittings (null until >= 2 sits).
					examDelta: examDeltas[t.id] ?? null,
				};
			}),
		[mastery, isCompleted, isVisited, examDeltas]
	);

	// One shared weakness ranking (lib/weakTopics.js) at the shared WEAK_THRESHOLD,
	// so "Shore these up" agrees with the exam summary's study nudge.
	const weak = useMemo(
		() => rankWeakTopics({ topics, mastery, limit: 4 }),
		[topics, mastery]
	);

	// Day-by-day revision plan, only when an exam date is set. Weakest topics are
	// front-loaded across the remaining days (lib/revisionPlan.js); a plan day
	// carries {id, name, number, accent, score} per topic but not its route, so we
	// resolve `to` from the curriculum model when linking.
	const revisionPlan = useMemo(
		() => buildRevisionPlan({ topics, mastery, daysUntilExam, today }),
		[topics, mastery, daysUntilExam, today]
	);

	// ── One-click topic drill (revision plan → scoped retrieval) ─────────────────
	// Clicking a plan-day topic launches a ReviewSession scoped to THAT topic. We
	// reuse the same scheduler /review uses (buildTopicQueue → planSession) and the
	// same grade path (useSrs.grade + logActivity), so the cards that decide
	// tomorrow's plan get rescheduled. The queue is snapshot at launch so it doesn't
	// reshuffle as cards reschedule out of "due" on each answer (mirrors /review).
	const [drill, setDrill] = useState(null); // { topicId, questions, runId } | null

	const startDrill = useCallback(
		topicId => {
			const plan = buildTopicQueue({
				topicId,
				cards,
				now: Date.now(),
				newCap: TOPIC_NEW_CAP,
			});
			if (plan.queue.length === 0) return; // nothing to drill — leave the link
			setDrill(prev => ({
				topicId,
				questions: plan.queue,
				// Bump a run id so re-launching the SAME topic remounts ReviewSession.
				runId: (prev?.topicId === topicId ? prev.runId : 0) + 1,
			}));
		},
		[cards]
	);

	const closeDrill = useCallback(() => setDrill(null), []);

	// Re-snapshot the SAME topic (ReviewSession's "start over") against the now
	// freshly-graded schedule, so a restart pulls whatever is still due.
	const restartDrill = useCallback(() => {
		if (drill) startDrill(drill.topicId);
	}, [drill, startDrill]);

	// Grade the card AND log a day of study — the EXACT path /review uses, so a
	// drill reschedules cards and lights the heatmap identically.
	const handleDrillGraded = useCallback(
		(id, correct) => {
			grade(id, correct);
			logActivity();
		},
		[grade]
	);

	// "Touched" = the student has answered a check or finished the topic. We sort
	// the grid by mastery ascending so the cards that need work float to the top
	// (the grid becomes a prioritization map, not 15 identical tiles); untouched
	// topics, which all sit at 0, keep their teaching order beneath the rest.
	// Anything with any progress (a visited 0.3, a completed 1, or real check data)
	// counts as touched, so a card that shows a bar also floats above the 0% cards
	// and wears the active style — bar, prominence, and order stay consistent.
	const isTouched = useCallback(t => t.hasData || t.score > 0, []);

	const orderedTopics = useMemo(
		() =>
			[...topics].sort((a, b) => {
				const ta = isTouched(a);
				const tb = isTouched(b);
				if (ta !== tb) return ta ? -1 : 1; // touched first
				if (ta) return a.score - b.score; // weakest of the touched first
				return 0; // untouched keep teaching order (stable sort)
			}),
		[topics, isTouched]
	);

	const weeks = useMemo(() => {
		const dow = new Date(`${today}T00:00:00`).getDay();
		const start = addDays(today, -(dow + (HEAT_WEEKS - 1) * 7));
		return Array.from({ length: HEAT_WEEKS }, (_, w) =>
			Array.from({ length: 7 }, (_, d) => {
				const k = addDays(start, w * 7 + d);
				return { k, count: days[k] || 0, future: k > today };
			})
		);
	}, [days, today]);

	const daysStudied = Object.keys(days).length;

	// A label for each week-column that opens a new month (blank otherwise), so the
	// strip above the heatmap reads as a calendar without crowding every week.
	const monthLabels = useMemo(
		() =>
			weeks.map((col, w) => {
				const first = col.find(cell => !cell.future) ?? col[0];
				const month = new Date(`${first.k}T00:00:00`).getMonth();
				const prev =
					w === 0
						? null
						: new Date(
								`${(weeks[w - 1].find(c => !c.future) ?? weeks[w - 1][0]).k}T00:00:00`
							).getMonth();
				return month !== prev ? MONTHS[month] : '';
			}),
		[weeks]
	);

	// First-run: nothing answered and nothing finished. Drives the guidance card,
	// the "Start here" tag, and the empty heatmap caption.
	const hasNoActivity = daysStudied === 0 && overall.completed === 0;

	const handleReset = useCallback(() => {
		if (
			window.confirm(
				'Reset all progress, the review schedule, and your study history? This cannot be undone.'
			)
		) {
			resetProgress();
			resetSrs();
			resetActivity();
			clearExamLog();
		}
	}, [resetProgress, resetSrs, resetActivity]);

	return (
		<div className={styles.page}>
			<header className={styles.topBar}>
				<nav className={styles.crumbs} aria-label="Breadcrumb">
					<Link to="/" className={styles.crumbLink}>
						Path
					</Link>
					<ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
					<span className={styles.crumbCurrent}>Progress</span>
				</nav>
			</header>

			<section className={styles.hero} aria-labelledby="progress-title">
				<Eyebrow>Mastery · Spaced retrieval</Eyebrow>
				<h1 id="progress-title" className={styles.title}>
					Where you stand.
				</h1>
				<p className={styles.lede}>
					Your mastery across every topic, your day-by-day study streak, and a
					revision plan that tightens as the exam nears.
				</p>

				<dl className={styles.stats}>
					<div className={styles.stat}>
						<dt className={styles.statLabel}>Streak</dt>
						<dd className={styles.statValue}>
							<Flame size={18} strokeWidth={2.2} aria-hidden="true" />
							{currentStreak}
						</dd>
						<p className={styles.statSub}>longest {longestStreak}</p>
					</div>
					<div className={styles.stat}>
						<dt className={styles.statLabel}>Days studied</dt>
						<dd className={styles.statValue}>{daysStudied}</dd>
					</div>
					<div className={styles.stat}>
						<dt className={styles.statLabel}>Topics complete</dt>
						<dd className={styles.statValue}>
							{overall.completed}
							<span className={styles.statOf}>/{overall.total}</span>
						</dd>
						<p className={styles.statSub}>curriculum topics</p>
					</div>
					<div className={styles.stat}>
						<dt className={styles.statLabel}>First-try</dt>
						{firstTryStats.attempted > 0 ? (
							<>
								<dd className={styles.statValue}>
									{Math.round(firstTryStats.rate * 100)}
									<span className={styles.statOf}>%</span>
								</dd>
								<p className={styles.statSub}>
									{firstTryStats.firstTry}/{firstTryStats.attempted} checks
									first try
								</p>
							</>
						) : (
							<>
								<dd className={styles.statValueMuted}>—</dd>
								<p className={styles.statSub}>answer a check to begin</p>
							</>
						)}
					</div>
					<div className={`${styles.stat} ${styles.statExam}`}>
						<dt className={styles.statLabel}>Exam</dt>
						{daysUntilExam != null && daysUntilExam >= 0 ? (
							<dd className={styles.statValue}>
								{daysUntilExam}
								<span className={styles.statOf}>days</span>
							</dd>
						) : (
							<dd className={styles.statValueMuted}>not set</dd>
						)}
						<label className={styles.examInput}>
							<span className={styles.srOnly}>Exam date</span>
							<input
								type="date"
								value={examDate || ''}
								min={today}
								onChange={e => setExamDate(e.target.value)}
							/>
						</label>
						{daysUntilExam == null && (
							<p className={styles.statSub}>
								Set a date for a day-by-day plan.
							</p>
						)}
					</div>
				</dl>
			</section>

			<section className={styles.block} aria-labelledby="heatmap-title">
				<h2 id="heatmap-title" className={styles.blockTitle}>
					Activity
				</h2>
				<div className={styles.heatScroll}>
					<div className={styles.heatMonths} aria-hidden="true">
						{monthLabels.map((label, w) => (
							<span key={w} className={styles.heatMonth}>
								{label}
							</span>
						))}
					</div>
					<div
						className={styles.heatmap}
						role="group"
						aria-labelledby="heatmap-title"
					>
						{/* A spoken summary up front; the grid below carries per-day labels
						    for screen-reader users who navigate into it. */}
						<span className={styles.srOnly}>
							{daysStudied === 0
								? 'No study days logged in the last 13 weeks.'
								: `${daysStudied} day${
										daysStudied === 1 ? '' : 's'
									} studied in the last 13 weeks. Each cell is one day.`}
						</span>
						{weeks.map((col, w) => (
							<div key={w} className={styles.heatCol}>
								{col.map(cell => {
									// Intensity rides on TWO channels: the fill colour and a
									// data-level the CSS turns into an inset ring (for count > 0).
									// So a colour-blind reader still distinguishes the busier days.
									const level = cell.future ? 0 : heatLevel(cell.count);
									return (
										<span
											key={cell.k}
											className={styles.heatCell}
											data-level={level}
											data-future={cell.future ? '' : undefined}
											role={cell.future ? undefined : 'img'}
											aria-hidden={cell.future ? 'true' : undefined}
											aria-label={
												cell.future
													? undefined
													: `${cell.k}: ${cell.count} answered`
											}
											title={
												cell.future
													? undefined
													: `${cell.k}: ${cell.count} answered`
											}
											style={{
												background: cell.future
													? 'transparent'
													: heat(cell.count),
											}}
										/>
									);
								})}
							</div>
						))}
					</div>
				</div>
				<div className={styles.heatLegend} aria-hidden="true">
					<span className={styles.heatLegendLabel}>Less</span>
					{HEAT_RAMP.map((swatch, i) => (
						<span
							key={i}
							className={styles.heatLegendSwatch}
							data-level={i}
							style={{ background: swatch }}
						/>
					))}
					<span className={styles.heatLegendLabel}>More</span>
				</div>
				{hasNoActivity && (
					<p className={styles.heatCaption}>
						No study days logged yet. Each square is a day; answer a review or a
						topic check to light one up.
					</p>
				)}
			</section>

			{revisionPlan && revisionPlan.topicCount > 0 && (
				<section className={styles.block} aria-labelledby="plan-title">
					<h2 id="plan-title" className={styles.blockTitle}>
						Your revision plan
					</h2>
					<p className={styles.blockLede}>
						{revisionPlan.topicCount} topics across the{' '}
						{daysUntilExam === 1
							? 'day before the exam'
							: `${daysUntilExam} days until the exam`}
						, weakest first.
					</p>
					<ol className={styles.plan}>
						{revisionPlan.days.map(day => (
							<li key={day.dateKey} className={styles.planDay}>
								<div className={styles.planMeta}>
									<span className={styles.planOffset}>
										{dayOffsetLabel(day.index)}
									</span>
									<span className={styles.planDate}>
										{formatPlanDate(day.dateKey)}
									</span>
								</div>
								{day.topics.length > 0 ? (
									<div className={styles.planBody}>
										<ul className={styles.planTopics}>
											{day.topics.map(topic => {
												const active = drill?.topicId === topic.id;
												return (
													<li key={topic.id} className={styles.planTopicItem}>
														{/* Primary action: drill THIS topic inline. A real
														    button so it's keyboard-operable; aria-expanded
														    ties it to the session panel below. */}
														<button
															type="button"
															className={styles.planTopic}
															style={{ '--accent': topic.accent }}
															aria-expanded={active}
															aria-controls={
																active ? `drill-${topic.id}` : undefined
															}
															onClick={() =>
																active ? closeDrill() : startDrill(topic.id)
															}
														>
															<span className={styles.planTopicNum}>
																{topic.number}
															</span>
															<span className={styles.planTopicName}>
																{topic.name}
															</span>
															<Target
																size={13}
																strokeWidth={2.2}
																aria-hidden="true"
															/>
															<span className={styles.srOnly}>
																{active
																	? ', close retrieval drill'
																	: ', start a retrieval drill'}
															</span>
														</button>
														{/* Quiet secondary path: open the topic page to
														    re-read, preserving the original chip link. */}
														<Link
															to={TOPIC_BY_ID[topic.id]?.to ?? '/'}
															className={styles.planTopicOpen}
															aria-label={`Open ${topic.name}`}
														>
															<ArrowRight
																size={13}
																strokeWidth={2.2}
																aria-hidden="true"
															/>
														</Link>
													</li>
												);
											})}
										</ul>
										{/* The scoped retrieval session expands in place under the day
										    it belongs to, so the plan stays in view while you drill. */}
										{drill && day.topics.some(t => t.id === drill.topicId) && (
											<div
												id={`drill-${drill.topicId}`}
												className={styles.planDrill}
											>
												<div className={styles.planDrillHead}>
													<p className={styles.planDrillTitle}>
														Retrieving{' '}
														<strong>
															{TOPIC_BY_ID[drill.topicId]?.name ??
																drill.topicId}
														</strong>{' '}
														· {drill.questions.length} question
														{drill.questions.length === 1 ? '' : 's'}
													</p>
													<button
														type="button"
														className={styles.planDrillClose}
														onClick={closeDrill}
													>
														<X size={14} strokeWidth={2.2} aria-hidden="true" />
														<span>Close</span>
													</button>
												</div>
												<ReviewSession
													key={`${drill.topicId}:${drill.runId}`}
													questions={drill.questions}
													onRestart={restartDrill}
													onGraded={handleDrillGraded}
												/>
											</div>
										)}
									</div>
								) : (
									<p className={styles.planRest}>Buffer or rest.</p>
								)}
							</li>
						))}
					</ol>
				</section>
			)}

			{weak.length > 0 && (
				<section className={styles.block} aria-labelledby="weak-title">
					<h2 id="weak-title" className={styles.blockTitle}>
						Shore these up
					</h2>
					<p className={styles.blockLede}>
						Your weakest topics by recall, worth a pass before the exam.
					</p>
					<ul className={styles.weakList}>
						{weak.map(t => (
							<li key={t.id}>
								<Link
									to={t.to}
									className={styles.weakRow}
									style={{ '--accent': t.accent }}
								>
									<span className={styles.weakNum}>{t.number}</span>
									<span className={styles.weakName}>{t.name}</span>
									<span className={styles.weakBar}>
										<span
											className={styles.weakFill}
											style={{ width: `${pct(t.score)}%` }}
										/>
									</span>
									<span className={styles.weakPct}>{pct(t.score)}%</span>
									<ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" />
								</Link>
							</li>
						))}
					</ul>
				</section>
			)}

			<section className={styles.block} aria-labelledby="topics-title">
				<h2 id="topics-title" className={styles.blockTitle}>
					All topics
				</h2>

				{hasNoActivity && (
					<div className={styles.firstRun}>
						<p className={styles.firstRunText}>
							Nothing tracked yet. Open a topic to start.
						</p>
						<Link
							to={FIRST_TOPIC.to}
							className={styles.firstRunLink}
							style={{ '--accent': FIRST_TOPIC.accent }}
						>
							<span>Start with {FIRST_TOPIC.name}</span>
							<ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" />
						</Link>
					</div>
				)}

				<ul className={styles.grid}>
					{orderedTopics.map(t => {
						const touched = isTouched(t);
						// Topic 01 carries a quiet "Start here" tag until the student has
						// touched anything, so a blank dashboard names its own first move.
						const startHere = hasNoActivity && t.id === FIRST_TOPIC.id;
						return (
							<li key={t.id}>
								<Link
									to={t.to}
									className={`${styles.card} ${touched ? '' : styles.cardIdle}`}
									style={{ '--accent': t.accent }}
								>
									<div className={styles.cardHead}>
										<span className={styles.cardNum}>{t.number}</span>
										{startHere ? (
											<span className={styles.cardStart}>Start here</span>
										) : (
											<span className={styles.cardPct}>{pct(t.score)}%</span>
										)}
									</div>
									<span className={styles.cardName}>{t.name}</span>
									{/* The progress track only appears once a topic has data; an
									    empty rail on every untouched card was just noise. */}
									{touched && (
										<span className={styles.cardBar}>
											<span
												className={styles.cardFill}
												style={{ width: `${pct(t.score)}%` }}
											/>
										</span>
									)}
									<span className={styles.cardMeta}>
										{t.hasData
											? t.total > 0
												? `${t.answered}/${t.total} checks`
												: 'exam only'
											: isCompleted(t.id)
												? 'completed'
												: 'not started'}
										{/* A quiet marker when the exam, not the review bank,
										    set this score (a topic can be exam-only). */}
										{t.fromExam && (
											<span className={styles.cardFromExam}>from exam</span>
										)}
										{/* The climb across exam sittings — a sparkline + signed
										    delta with a redundant glyph. Only present once a topic
										    has >= 2 real sittings (a single sit shows no trend). */}
										{t.examDelta && <ExamTrend trend={t.examDelta} />}
									</span>
								</Link>
							</li>
						);
					})}
				</ul>
			</section>

			<footer className={styles.footer}>
				<button type="button" className={styles.resetBtn} onClick={handleReset}>
					<RotateCcw size={14} strokeWidth={2} aria-hidden="true" />
					<span>Reset all progress</span>
				</button>
			</footer>
		</div>
	);
};

export default ProgressPage;
