import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
	ArrowRight,
	Check,
	ChevronRight,
	Clock,
	LayoutGrid,
	RotateCcw,
} from 'lucide-react';
import LessonCheck from '../common/TopicTemplate/LessonCheck.jsx';
import { checkAnswer } from '../common/TopicTemplate/checkAnswer.js';
import { accentTokens } from '../components/Review/reviewBank.js';
import { TOPIC_BY_ID } from '../data/curriculum.js';
import { EXAM_SETS, EXAM_TOPIC_IDS } from '../data/examSets.js';
import { logActivity } from '../lib/activityLog.js';
import { recordExamTopic } from '../lib/examLog.js';
import { WEAK_THRESHOLD } from '../lib/weakTopics.js';
import styles from './ExamPage.module.css';

/**
 * ExamPage — the exam-practice surface (route /exam).
 *
 * Each exam set is one multi-part 'problem' check (stem + 3-4 leaf sub-questions)
 * whose answer keys are DERIVED at module load from the same pure generators the
 * topic pages use (see src/data/examSets.js). So nothing on this page can grade
 * against a hand-typed key.
 *
 * The page has two states:
 *   • Picker  — the hero plus the available sets, grouped by topic.
 *   • Session — runs the chosen sets one problem at a time, rendering each through
 *               the shared LessonCheck and grading via the pure checkAnswer core
 *               (the same partial-credit 'problem' grading used everywhere). At the
 *               end it shows a summary SCORED BY TOPIC.
 *
 * Grading reuse: rather than fork ReviewSession (which is built for single-kind
 * bank cards and a boolean correct/incorrect), this is a thin focused runner that
 * threads each problem's partial-credit `score` through to the by-topic summary.
 */

// Resolve a topic's display metadata (name, number, route, accent). Falls back to
// the set's own topicName when a topic id is not in the curriculum model.
const topicMeta = (topicId, fallbackName) => {
	const t = TOPIC_BY_ID[topicId];
	return {
		topicId,
		name: t?.name ?? fallbackName ?? topicId,
		number: t?.number ?? '',
		to: t?.to ?? '/',
		accent: t?.accent ?? 'var(--color-accent-blue)',
	};
};

// Sets grouped by topic, in first-appearance (teaching) order, for the picker.
const groupByTopic = sets => {
	const groups = EXAM_TOPIC_IDS.map(topicId => {
		const items = sets.filter(s => s.topicId === topicId);
		const meta = topicMeta(topicId, items[0]?.topicName);
		return { ...meta, sets: items };
	});
	return groups.filter(g => g.sets.length > 0);
};

// A short, honest read on the by-topic result (mirrors ReviewSummary's tone).
const verdictFor = ratio => {
	if (ratio >= 0.9)
		return 'Exam-ready across these topics. Keep the recall warm.';
	if (ratio >= 0.7) return 'Solid. Tighten the topics scored below.';
	if (ratio >= 0.4) return 'Coming along. The topics below need another pass.';
	return 'Early days. Work the topics below, then run it again.';
};

const pct = ratio => Math.round(ratio * 100);

// ── Timed mode ────────────────────────────────────────────────────────────────
// A calm, optional clock. The budget is derived from the run length: about two
// minutes of working time per problem, so the total scales with the chosen set
// and never needs a hand-typed number.
const SECONDS_PER_PROBLEM = 120;
const budgetFor = count => count * SECONDS_PER_PROBLEM;

// Below this per-topic ratio the summary nudges the learner back to the lesson.
// Shared with /progress's weakness ranking so the two surfaces agree on "weak".
const STUDY_THRESHOLD = WEAK_THRESHOLD;

// Aggregate the per-problem partial-credit scores into a per-topic average,
// preserving teaching order. `scores[i]` aligns with `runSets[i]`. This is the
// single source the summary renders AND the persist effect records from, so the
// number stored to examLog is exactly the number the learner sees.
const aggregateByTopic = (runSets, scores) => {
	const map = new Map();
	runSets.forEach((set, i) => {
		if (!map.has(set.topicId)) {
			map.set(set.topicId, {
				...topicMeta(set.topicId, set.topicName),
				sum: 0,
				count: 0,
			});
		}
		const t = map.get(set.topicId);
		t.sum += scores[i] ?? 0;
		t.count += 1;
	});
	return [...map.values()].map(t => ({
		...t,
		ratio: t.count ? t.sum / t.count : 0,
	}));
};

// "16 min" for a whole-minute budget, or "8:30" when it is not a round minute.
const formatBudgetLabel = seconds => {
	const mins = seconds / 60;
	if (Number.isInteger(mins)) return `${mins} min`;
	return `${Math.floor(mins)}:${String(seconds % 60).padStart(2, '0')}`;
};

// "MM:SS" for the live countdown, clamped at zero.
const formatClock = seconds => {
	const s = Math.max(0, seconds);
	const m = Math.floor(s / 60);
	return `${m}:${String(s % 60).padStart(2, '0')}`;
};

// ── The summary, scored BY TOPIC ──────────────────────────────────────────────
const ExamSummary = ({
	runSets,
	scores,
	onRetake,
	onBackToSets,
	onStudyTopic,
	onRetakeTopic,
	endedOnClock = false,
	endedEarly = false,
}) => {
	// Aggregate the per-problem partial-credit scores into a per-topic average,
	// weakest-first for the rows below.
	const topics = useMemo(
		() => aggregateByTopic(runSets, scores).sort((a, b) => a.ratio - b.ratio),
		[runSets, scores]
	);

	const overall = useMemo(() => {
		const valid = scores.filter(s => typeof s === 'number');
		const sum = valid.reduce((a, b) => a + b, 0);
		return valid.length ? sum / valid.length : 0;
	}, [scores]);

	// The single weakest topic that fell below the shared study threshold, if any.
	// When it exists it earns the primary action (the most productive next step
	// past the weakness the run just surfaced); otherwise "Retake this exam" leads.
	const weakest = topics.find(t => t.ratio < STUDY_THRESHOLD) ?? null;

	return (
		<section className={styles.summary} aria-labelledby="exam-summary-heading">
			<header className={styles.summaryHead}>
				<p className={styles.eyebrow}>Exam complete</p>
				<h2 id="exam-summary-heading" className={styles.summaryScore}>
					<span className={styles.summaryScoreNum}>{pct(overall)}</span>
					<span className={styles.summaryScoreOf}>% overall</span>
				</h2>
				<div
					className={styles.scoreTrack}
					role="progressbar"
					aria-valuenow={pct(overall)}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-label={`Overall score ${pct(overall)} percent`}
				>
					<span
						className={styles.scoreFill}
						style={{ width: `${pct(overall)}%` }}
					/>
				</div>
				<p className={styles.verdict}>{verdictFor(overall)}</p>
				{endedOnClock && (
					<p className={styles.timeNote}>
						<Clock size={13} strokeWidth={2.2} aria-hidden="true" />
						Time ran out. Unanswered problems scored zero.
					</p>
				)}
				{endedEarly && !endedOnClock && (
					<p className={styles.timeNote}>
						<Clock size={13} strokeWidth={2.2} aria-hidden="true" />
						You ended early. Unanswered problems scored zero.
					</p>
				)}
			</header>

			<div className={styles.block}>
				<h3 className={styles.blockTitle}>By topic</h3>
				<ul className={styles.topicList}>
					{topics.map(t => {
						const tones = accentTokens(t.accent);
						const isWeak = t.ratio < STUDY_THRESHOLD;
						return (
							<li
								key={t.topicId}
								className={styles.topicRow}
								style={{
									'--q-accent': tones.accent,
									'--q-accent-ink': tones.ink,
								}}
							>
								<Link to={t.to} className={styles.topicLink}>
									{t.number && (
										<span className={styles.topicNum}>{t.number}</span>
									)}
									<span className={styles.topicMeta}>
										<span className={styles.topicName}>{t.name}</span>
										<span className={styles.topicScore}>
											{pct(t.ratio)}% · {t.count} problem
											{t.count === 1 ? '' : 's'}
										</span>
									</span>
									<span className={styles.topicBar} aria-hidden="true">
										<span
											className={styles.topicBarFill}
											style={{ width: `${pct(t.ratio)}%` }}
										/>
									</span>
									<ArrowRight
										size={15}
										strokeWidth={2}
										aria-hidden="true"
										className={styles.topicArrow}
									/>
								</Link>
								{isWeak && (
									<div className={styles.topicActions}>
										{/* Retrieval: run this topic's problems again, cold. */}
										<button
											type="button"
											className={styles.retakeLink}
											onClick={() => onRetakeTopic(t.topicId)}
										>
											<RotateCcw
												size={12}
												strokeWidth={2.2}
												aria-hidden="true"
											/>
											Retake {t.name}
										</button>
										{/* Re-read: open the lesson for this topic. */}
										<Link to={t.to} className={styles.studyLink}>
											Study {t.name}
											<ArrowRight
												size={12}
												strokeWidth={2.2}
												aria-hidden="true"
											/>
										</Link>
									</div>
								)}
							</li>
						);
					})}
				</ul>
			</div>

			<div className={styles.summaryActions}>
				{weakest ? (
					<button
						type="button"
						className={styles.primaryBtn}
						onClick={() => onStudyTopic(weakest.topicId)}
					>
						<ArrowRight size={15} strokeWidth={2.2} aria-hidden="true" />
						<span>Study {weakest.name}</span>
					</button>
				) : (
					<button
						type="button"
						className={styles.primaryBtn}
						onClick={onRetake}
					>
						<RotateCcw size={15} strokeWidth={2.2} aria-hidden="true" />
						<span>Retake this exam</span>
					</button>
				)}
				{/* When a weak topic took primary, keep the honest replay reachable. */}
				{weakest && (
					<button type="button" className={styles.retakeBtn} onClick={onRetake}>
						<RotateCcw size={14} strokeWidth={2.2} aria-hidden="true" />
						<span>Retake this exam</span>
					</button>
				)}
				<button
					type="button"
					className={styles.ghostBtn}
					onClick={onBackToSets}
				>
					<LayoutGrid size={13} strokeWidth={2} aria-hidden="true" />
					<span>Back to exam sets</span>
				</button>
				<Link to="/review" className={styles.ghostLink}>
					Switch to spaced review
				</Link>
			</div>
		</section>
	);
};

// ── The running session: one problem at a time ────────────────────────────────
const ExamSession = ({
	runSets,
	onRetake,
	onBackToSets,
	onStudyTopic,
	onRetakeTopic,
	timed = false,
}) => {
	const [index, setIndex] = useState(0);
	// Per-problem controlled check state, keyed by set id: { status, score, perPart }.
	const [states, setStates] = useState({});
	const [finished, setFinished] = useState(false);
	// True when the run ended before every problem was answered (clock or End exam),
	// so the summary can show an honest "unanswered scored zero" note.
	const [endedEarly, setEndedEarly] = useState(false);
	// Timed mode: seconds left on the clock, and whether the run ended on the clock.
	const budget = useMemo(() => budgetFor(runSets.length), [runSets.length]);
	const [secondsLeft, setSecondsLeft] = useState(budget);
	const [endedOnClock, setEndedOnClock] = useState(false);
	// Focus target: the problem heading, moved to on each advance for SR continuity.
	const headingRef = useRef(null);
	// Guard the one-time persist of results when the run finishes.
	const persistedRef = useRef(false);

	const total = runSets.length;
	const current = runSets[index];
	const currentState = current ? states[current.id] : undefined;
	const isAnswered = currentState?.status != null;
	const meta = current ? topicMeta(current.topicId, current.topicName) : null;
	const tones = meta ? accentTokens(meta.accent) : null;

	const handleAnswer = useCallback(
		payload => {
			if (!current) return;
			if (states[current.id]?.status != null) return; // grade once
			const result = checkAnswer(current.problem, payload);
			setStates(prev => {
				if (prev[current.id]?.status != null) return prev;
				return {
					...prev,
					[current.id]: {
						...result,
						status: result.correct ? 'correct' : 'incorrect',
					},
				};
			});
			// Any exam attempt counts as a day of study (streak / heatmap).
			logActivity();
		},
		[current, states]
	);

	const goNext = useCallback(() => {
		if (index + 1 >= total) {
			setFinished(true);
			return;
		}
		setIndex(i => Math.min(i + 1, total - 1));
		// Move focus to the new problem heading so the keyboard / SR caret follows
		// the run instead of falling to <body> (mirrors ReviewSession).
		requestAnimationFrame(() => headingRef.current?.focus());
	}, [index, total]);

	// Guarded exit. Ending mid-run silently destroys a near-complete attempt, so
	// require a confirm once at least one problem is answered (matches the guarded
	// reset on /progress). A finished run exits freely. Answered problems keep
	// their score; the rest count as zero, which the summary states.
	const requestExit = useCallback(() => {
		const answeredCount = Object.values(states).filter(
			s => s?.status != null
		).length;
		if (
			!finished &&
			answeredCount > 0 &&
			!window.confirm(
				'End this exam now? Answered problems keep their score, the rest count as zero.'
			)
		) {
			return;
		}
		// Only flag "ended early" when problems genuinely remain unanswered, so the
		// summary note is honest if the run was effectively complete.
		if (answeredCount < total) setEndedEarly(true);
		setFinished(true);
	}, [states, finished, total]);

	// Timed mode: a single interval that ticks the clock down once per second.
	// It runs only while a timed run is in progress; reaching zero auto-ends the
	// run into the summary (unanswered problems already score zero). The interval
	// is cleared on unmount, on End exam, and the moment the run finishes.
	useEffect(() => {
		if (!timed || finished) return undefined;
		const id = setInterval(() => {
			setSecondsLeft(s => {
				if (s <= 1) {
					clearInterval(id);
					setEndedOnClock(true);
					setEndedEarly(true);
					setFinished(true);
					return 0;
				}
				return s - 1;
			});
		}, 1000);
		return () => clearInterval(id);
	}, [timed, finished]);

	// Persist the result the moment the run finishes (by finishing, by the clock,
	// or by End exam). This is the whole point of the page: it records the exam's
	// per-topic partial-credit signal so the mastery dashboard can fold it in and
	// show decay. The ref guards against a double-write across re-renders, and the
	// number recorded is exactly the per-topic ratio the summary shows (same
	// aggregateByTopic). Unanswered problems already score zero.
	useEffect(() => {
		if (!finished || persistedRef.current) return;
		persistedRef.current = true;
		const scores = runSets.map(s => states[s.id]?.score ?? 0);
		aggregateByTopic(runSets, scores).forEach(t => {
			recordExamTopic(t.topicId, t.ratio, { score: t.sum, total: t.count });
		});
	}, [finished, runSets, states]);

	if (total === 0) {
		return (
			<div className={styles.empty} role="status">
				<p>No exam problems were selected.</p>
			</div>
		);
	}

	if (finished) {
		// Order scores to match runSets so the summary aggregates correctly.
		const scores = runSets.map(s => states[s.id]?.score ?? 0);
		return (
			<ExamSummary
				runSets={runSets}
				scores={scores}
				onRetake={onRetake}
				onBackToSets={onBackToSets}
				onStudyTopic={onStudyTopic}
				onRetakeTopic={onRetakeTopic}
				endedOnClock={endedOnClock}
				endedEarly={endedEarly}
			/>
		);
	}

	// Fill as the learner answers: the bar reaches 100% on answering the LAST
	// problem (not one behind), matching the 1-based label and aria value.
	const progressPercent = Math.round(
		((index + (isAnswered ? 1 : 0)) / total) * 100
	);

	// Quantize the timed countdown for assistive tech: the visible MM:SS still
	// ticks every second, but the live-region text only changes at meaningful
	// thresholds so it does not re-announce every second under a minute.
	const clockAnnouncement = (() => {
		if (secondsLeft > 60) return `${Math.ceil(secondsLeft / 60)} minutes left`;
		if (secondsLeft === 60) return '1 minute left';
		if (secondsLeft === 30) return '30 seconds left';
		if (secondsLeft === 10) return '10 seconds left';
		if (secondsLeft <= 5) return `${secondsLeft} seconds left`;
		return '';
	})();

	return (
		<div
			className={styles.session}
			style={{ '--q-accent': tones.accent, '--q-accent-ink': tones.ink }}
		>
			<div className={styles.statusBar}>
				<div
					className={styles.progress}
					role="group"
					aria-label={`Problem ${index + 1} of ${total}`}
				>
					<div
						className={styles.progressTrack}
						role="progressbar"
						aria-valuenow={index + 1}
						aria-valuemin={1}
						aria-valuemax={total}
					>
						<span
							className={styles.progressFill}
							style={{ width: `${progressPercent}%` }}
						/>
					</div>
					<span className={styles.progressLabel}>
						Problem <strong>{index + 1}</strong> / {total}
					</span>
					{timed && (
						<span
							className={`${styles.clock}${
								secondsLeft <= 60 ? ` ${styles.clockLow}` : ''
							}`}
						>
							<Clock size={12} strokeWidth={2.2} aria-hidden="true" />
							<span aria-hidden="true">{formatClock(secondsLeft)} left</span>
							<span className={styles.srOnly} aria-live="polite">
								{clockAnnouncement}
							</span>
						</span>
					)}
				</div>
				<button type="button" className={styles.exitLink} onClick={requestExit}>
					End exam
				</button>
			</div>

			<div className={styles.card}>
				<div className={styles.cardHead}>
					<Link
						to={meta.to}
						className={styles.topicTag}
						aria-label={`From ${meta.name}, open this topic`}
					>
						{meta.number && (
							<span className={styles.topicTagNum}>{meta.number}</span>
						)}
						<span className={styles.topicTagName}>{meta.name}</span>
						<ArrowRight size={12} strokeWidth={2.2} aria-hidden="true" />
					</Link>
				</div>

				{/* The problem heading — focus target on advance for SR continuity. */}
				<h2 className={styles.srHeading} tabIndex={-1} ref={headingRef}>
					Problem {index + 1} of {total}, from {meta.name}
				</h2>

				<LessonCheck
					key={current.id}
					check={current.problem}
					state={currentState}
					onAnswer={handleAnswer}
				/>

				<div className={styles.actions}>
					{isAnswered && (
						<button type="button" className={styles.nextBtn} onClick={goNext}>
							<span>{index + 1 >= total ? 'See results' : 'Next problem'}</span>
							<ArrowRight size={15} strokeWidth={2.2} aria-hidden="true" />
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

// ── The page ──────────────────────────────────────────────────────────────────
const ExamPage = () => {
	const navigate = useNavigate();
	const groups = useMemo(() => groupByTopic(EXAM_SETS), []);
	const [runSets, setRunSets] = useState(null); // null = picker, [] used as guard
	const [runId, setRunId] = useState(0);
	const [timed, setTimed] = useState(false); // Untimed is the default.

	const startAll = useCallback(() => {
		setRunSets(EXAM_SETS);
		setRunId(r => r + 1);
	}, []);

	const startTopic = useCallback(topicId => {
		setRunSets(EXAM_SETS.filter(s => s.topicId === topicId));
		setRunId(r => r + 1);
	}, []);

	const startSet = useCallback(set => {
		setRunSets([set]);
		setRunId(r => r + 1);
	}, []);

	const exit = useCallback(() => setRunSets(null), []);

	// Re-run the SAME sets, fresh: bump runId so ExamSession remounts with cleared
	// state. (The summary's honest replay.)
	const retake = useCallback(() => setRunId(r => r + 1), []);

	// Open a topic's lesson from the summary (re-read), or run its exam set again
	// (retrieval). startTopic already remounts the session via runId.
	const studyTopic = useCallback(
		topicId => navigate(topicMeta(topicId).to),
		[navigate]
	);

	const started = runSets !== null;
	const problemCount = EXAM_SETS.length;
	const topicCount = groups.length;

	return (
		<div className={styles.page}>
			<header className={styles.topBar}>
				<nav className={styles.crumbs} aria-label="Breadcrumb">
					<Link to="/" className={styles.crumbLink}>
						Path
					</Link>
					<ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
					<span className={styles.crumbCurrent}>Exam</span>
				</nav>
			</header>

			<section className={styles.hero} aria-labelledby="exam-title">
				<p className={styles.eyebrow}>Practice exam · Worked problems</p>
				<h1 id="exam-title" className={styles.title}>
					Sit a small exam, scored by topic.
				</h1>
				<p className={styles.lede}>
					Each problem gives a concrete input, a graph, an array, a recurrence,
					then asks you to run the algorithm by hand. Every answer key is
					derived from the same generators the lessons use, so the marking is
					exactly what the algorithm does. Wrong parts always reveal the
					explanation.
				</p>

				<dl className={styles.stats}>
					<div className={styles.stat}>
						<dt className={styles.statLabel}>Problems</dt>
						<dd className={styles.statValue}>{problemCount}</dd>
					</div>
					<div className={styles.stat}>
						<dt className={styles.statLabel}>Topics</dt>
						<dd className={styles.statValue}>{topicCount}</dd>
					</div>
				</dl>

				{!started && (
					<div className={styles.launch}>
						{/* Two-state toggle. A pair of aria-pressed buttons (not a
						    radiogroup) so each is in the tab order with native button
						    semantics, no roving-tabindex / arrow-key contract to honor. */}
						<div
							className={styles.modeToggle}
							role="group"
							aria-label="Exam timing"
						>
							<button
								type="button"
								aria-pressed={!timed}
								className={`${styles.modeOption}${
									!timed ? ` ${styles.modeOptionActive}` : ''
								}`}
								onClick={() => setTimed(false)}
							>
								Untimed
							</button>
							<button
								type="button"
								aria-pressed={timed}
								className={`${styles.modeOption}${
									timed ? ` ${styles.modeOptionActive}` : ''
								}`}
								onClick={() => setTimed(true)}
							>
								<Clock size={13} strokeWidth={2.2} aria-hidden="true" />
								Timed, {formatBudgetLabel(budgetFor(problemCount))}
							</button>
						</div>
						<button
							type="button"
							className={styles.primaryBtn}
							onClick={startAll}
						>
							<span>Start the full exam</span>
							<ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
						</button>
						<p className={styles.launchMeta}>
							{problemCount} problems across {topicCount} topics, or pick one
							topic below.
							{timed
								? ` The clock matches the run, about two minutes per problem.`
								: ''}
						</p>
					</div>
				)}
			</section>

			{!started && (
				<section className={styles.picker} aria-label="Exam sets by topic">
					<ul className={styles.topicGroups}>
						{groups.map(group => {
							const tones = accentTokens(group.accent);
							return (
								<li
									key={group.topicId}
									className={styles.topicGroup}
									style={{
										'--q-accent': tones.accent,
										'--q-accent-ink': tones.ink,
									}}
								>
									<div className={styles.groupHead}>
										<div className={styles.groupTitle}>
											{group.number && (
												<span className={styles.groupNum}>{group.number}</span>
											)}
											<h2 className={styles.groupName}>{group.name}</h2>
										</div>
										<button
											type="button"
											className={styles.groupRunBtn}
											onClick={() => startTopic(group.topicId)}
										>
											Run all {group.sets.length}
											<ArrowRight
												size={13}
												strokeWidth={2.2}
												aria-hidden="true"
											/>
										</button>
									</div>
									<ul className={styles.setList}>
										{group.sets.map((set, i) => (
											<li key={set.id}>
												<button
													type="button"
													className={styles.setBtn}
													onClick={() => startSet(set)}
												>
													<span className={styles.setIndex} aria-hidden="true">
														{i + 1}
													</span>
													<span className={styles.setStem}>
														{set.problem.stem}
													</span>
													<span className={styles.setMeta}>
														{set.problem.parts.length} parts
													</span>
													<ArrowRight
														size={14}
														strokeWidth={2}
														aria-hidden="true"
														className={styles.setArrow}
													/>
												</button>
											</li>
										))}
									</ul>
								</li>
							);
						})}
					</ul>

					<p className={styles.foot}>
						<Check size={13} strokeWidth={2.4} aria-hidden="true" />
						Looking for short recall instead?{' '}
						<Link to="/review" className={styles.footLink}>
							Spaced review
						</Link>{' '}
						drills one idea at a time.
					</p>
				</section>
			)}

			{started && (
				<section className={styles.sessionWrap} aria-label="Exam session">
					<ExamSession
						key={runId}
						runSets={runSets}
						onRetake={retake}
						onBackToSets={exit}
						onStudyTopic={studyTopic}
						onRetakeTopic={startTopic}
						timed={timed}
					/>
				</section>
			)}
		</div>
	);
};

export default ExamPage;
