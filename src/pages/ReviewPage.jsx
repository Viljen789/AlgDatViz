import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Shuffle } from 'lucide-react';
import {
	REVIEW_BANK,
	REVIEW_TOPIC_IDS,
	sampleSession,
} from '../components/Review/reviewBank.js';
import ReviewSession from '../components/Review/ReviewSession.jsx';
import styles from './ReviewPage.module.css';

// How many questions a single mixed session draws (capped at the bank size).
const SESSION_SIZE = 10;

/**
 * ReviewPage — the cumulative mixed-review surface ("Test deg selv!").
 *
 * The capstone of the revision layer: a shuffled retrieval session drawn from
 * EVERY topic at once, so a student practices spaced retrieval across the whole
 * course before the exam — the antidote to the fluency illusion (brief §3).
 *
 * It reuses the bank registry (reviewBank.js) for the question pool + the seeded
 * cross-topic sampler, and renders every question through the shared LessonCheck
 * graded by the pure checkAnswer core (see ReviewSession). Standalone token-
 * styled layout matching the topic design language (hero + session); works in
 * both themes and at 380px.
 *
 * Default export → wired by the orchestrator at <Route path="/review">.
 */
const ReviewPage = () => {
	// A monotonically increasing seed: each "new session" reseeds for a fresh
	// (but still deterministic, hence reproducible/testable) draw.
	const [seed, setSeed] = useState(() => Date.now() % 100000);
	const [started, setStarted] = useState(false);

	const questions = useMemo(
		() => sampleSession({ count: SESSION_SIZE, seed }),
		[seed]
	);

	const start = useCallback(() => setStarted(true), []);
	const restart = useCallback(() => {
		setSeed(s => s + 1);
		setStarted(true);
	}, []);

	const bankSize = REVIEW_BANK.length;
	const topicCount = REVIEW_TOPIC_IDS.length;
	const sessionCount = questions.length;

	return (
		<div className={styles.page}>
			<header className={styles.topBar}>
				<nav className={styles.crumbs} aria-label="Breadcrumb">
					<Link to="/" className={styles.crumbLink}>
						Path
					</Link>
					<ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
					<span className={styles.crumbCurrent}>Cumulative review</span>
				</nav>
			</header>

			<section className={styles.hero} aria-labelledby="review-title">
				<p className={styles.eyebrow}>Test deg selv · Spaced retrieval</p>
				<h1 id="review-title" className={styles.title}>
					Mix it all up. Pull the answer from memory.
				</h1>
				<p className={styles.lede}>
					Re-reading feels like learning; retrieving is learning. This pulls{' '}
					{sessionCount} questions at random from across every topic and shuffles
					them, so you practice recognizing <em>which</em> idea applies — not just
					recalling one topic at a time. Wrong answers always reveal the
					explanation.
				</p>

				<dl className={styles.stats}>
					<div className={styles.stat}>
						<dt className={styles.statLabel}>Per session</dt>
						<dd className={styles.statValue}>{sessionCount}</dd>
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
					<button type="button" className={styles.startBtn} onClick={start}>
						<Shuffle size={16} strokeWidth={2.2} aria-hidden="true" />
						<span>Start a mixed session</span>
					</button>
				)}
			</section>

			{started && (
				<section className={styles.sessionWrap} aria-label="Review session">
					<ReviewSession
						key={seed}
						questions={questions}
						onRestart={restart}
					/>
				</section>
			)}
		</div>
	);
};

export default ReviewPage;
