import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Clock, Shuffle } from 'lucide-react';
import {
	REVIEW_BANK,
	REVIEW_TOPIC_IDS,
	sampleSession,
} from '../components/Review/reviewBank.js';
import ReviewSession from '../components/Review/ReviewSession.jsx';
import useProgress from '../hooks/useProgress.js';
import useSrs from '../hooks/useSrs.js';
import styles from './ReviewPage.module.css';

// How many questions a single mixed (free-practice) session draws.
const SESSION_SIZE = 10;
// How many never-seen cards a spaced-repetition session introduces at once.
const NEW_CAP = 8;

/**
 * ReviewPage — the cumulative review surface, now with two modes:
 *
 *   • Spaced retrieval ("Review N due") — the scheduler (srsSchedule/useSrs)
 *     surfaces the cards that are due today plus a capped trickle of new cards
 *     from topics you've studied. Answering reschedules each card (Leitner box),
 *     so ideas come back right before you'd forget them. This is the default.
 *   • Mixed session — the original seeded random draw across the whole bank, for
 *     free practice on demand.
 *
 * Both run through the shared ReviewSession; both feed outcomes back into the
 * schedule via useSrs.grade so any practice keeps the schedule honest.
 */
const ReviewPage = () => {
	const { isVisited } = useProgress();
	const { grade, plan, scheduledCount } = useSrs();

	const [mode, setMode] = useState(null); // 'due' | 'mixed' | null
	const [seed, setSeed] = useState(() => Date.now() % 100000);
	const [sessionQuestions, setSessionQuestions] = useState([]);
	const [runId, setRunId] = useState(0);

	// New cards only surface for topics the student has actually opened, so review
	// reinforces studied material rather than dumping the whole bank as "new".
	const isNewEligible = useCallback(
		entry => isVisited(entry.topicId),
		[isVisited]
	);

	// Live plan for the hero badge (recomputes as cards are graded).
	const duePlan = useMemo(
		() => plan(REVIEW_BANK, { newCap: NEW_CAP, isNewEligible }),
		[plan, isNewEligible]
	);
	const dueTotal = duePlan.dueCount + duePlan.freshCount;

	const startDue = useCallback(() => {
		// Snapshot the queue at start so it doesn't reshuffle mid-session as cards
		// reschedule out of "due" on each answer.
		const snapshot = plan(REVIEW_BANK, { newCap: NEW_CAP, isNewEligible });
		setSessionQuestions(snapshot.queue);
		setMode('due');
		setRunId(r => r + 1);
	}, [plan, isNewEligible]);

	const startMixed = useCallback(() => {
		const nextSeed = seed + 1;
		setSeed(nextSeed);
		setSessionQuestions(sampleSession({ count: SESSION_SIZE, seed: nextSeed }));
		setMode('mixed');
		setRunId(r => r + 1);
	}, [seed]);

	const restart = useCallback(() => {
		if (mode === 'due') startDue();
		else startMixed();
	}, [mode, startDue, startMixed]);

	const bankSize = REVIEW_BANK.length;
	const topicCount = REVIEW_TOPIC_IDS.length;
	const started = mode !== null;

	return (
		<div className={styles.page}>
			<header className={styles.topBar}>
				<nav className={styles.crumbs} aria-label="Breadcrumb">
					<Link to="/" className={styles.crumbLink}>
						Path
					</Link>
					<ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
					<span className={styles.crumbCurrent}>Review</span>
				</nav>
			</header>

			<section className={styles.hero} aria-labelledby="review-title">
				<p className={styles.eyebrow}>Test deg selv · Spaced retrieval</p>
				<h1 id="review-title" className={styles.title}>
					Pull it from memory, right before you'd forget.
				</h1>
				<p className={styles.lede}>
					Re-reading feels like learning; retrieving is learning. The schedule
					brings each idea back at widening intervals, so the things you almost
					forgot come around again. Wrong answers always reveal the explanation.
				</p>

				<dl className={styles.stats}>
					<div className={`${styles.stat} ${styles.statDue}`}>
						<dt className={styles.statLabel}>Due now</dt>
						<dd className={styles.statValue}>{dueTotal}</dd>
					</div>
					<div className={styles.stat}>
						<dt className={styles.statLabel}>Scheduled</dt>
						<dd className={styles.statValue}>{scheduledCount}</dd>
					</div>
					<div className={styles.stat}>
						<dt className={styles.statLabel}>Question bank</dt>
						<dd className={styles.statValue}>{bankSize}</dd>
					</div>
					<div className={styles.stat}>
						<dt className={styles.statLabel}>Topics</dt>
						<dd className={styles.statValue}>{topicCount}</dd>
					</div>
				</dl>

				{!started && (
					<div className={styles.launch}>
						<div className={styles.actions}>
							{dueTotal > 0 ? (
								<button
									type="button"
									className={styles.dueBtn}
									onClick={startDue}
								>
									<Clock size={16} strokeWidth={2.2} aria-hidden="true" />
									<span>Review {dueTotal} due</span>
								</button>
							) : (
								<p className={styles.caughtUp}>
									You're caught up — nothing due right now. Study a topic, or
									practice a mixed set below.
								</p>
							)}
							<button
								type="button"
								className={styles.mixedBtn}
								onClick={startMixed}
							>
								<Shuffle size={15} strokeWidth={2.2} aria-hidden="true" />
								<span>Mixed session</span>
							</button>
						</div>
						{dueTotal > 0 && (
							<p className={styles.dueMeta}>
								{duePlan.dueCount} scheduled · {duePlan.freshCount} new today
							</p>
						)}
					</div>
				)}
			</section>

			{started && (
				<section className={styles.sessionWrap} aria-label="Review session">
					<ReviewSession
						key={runId}
						questions={sessionQuestions}
						onRestart={restart}
						onGraded={grade}
					/>
				</section>
			)}
		</div>
	);
};

export default ReviewPage;
