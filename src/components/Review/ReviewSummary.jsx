import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, RotateCcw, X } from 'lucide-react';
import { accentTokens } from './reviewBank.js';
import styles from './ReviewSummary.module.css';

// A short, honest read on the result — retrieval practice, not a grade.
const verdictFor = ratio => {
	if (ratio >= 0.9) return 'Exam-ready on this sample. Keep the recall warm.';
	if (ratio >= 0.7) return 'Solid recall. Tighten the few topics below.';
	if (ratio >= 0.4) return 'Coming along — the topics below need another pass.';
	return 'Early days. Revisit the topics below, then run it again.';
};

/**
 * ReviewSummary — end-of-session results for the cumulative review.
 *
 * Reports the score and, crucially, WHICH topics to revisit: any topic with a
 * missed or skipped question is surfaced (with a count and a link straight back
 * to that topic). This turns the test into a study plan, which is the point of
 * spaced retrieval before the exam.
 *
 * Props
 *   questions   the session's bank entries (in asked order).
 *   answers     { [entryId]: { status: 'correct'|'incorrect' } } — local state.
 *   onRestart   () => void — start a fresh, reseeded session.
 */
const ReviewSummary = ({ questions, answers, onRestart }) => {
	const total = questions.length;
	const score = useMemo(
		() => questions.filter(q => answers[q.id]?.status === 'correct').length,
		[questions, answers]
	);
	const ratio = total ? score / total : 0;
	const percent = Math.round(ratio * 100);

	// Group results by topic so we can recommend what to revisit. A topic is a
	// "revisit" if it has any incorrect OR skipped (unanswered) question.
	const topics = useMemo(() => {
		const map = new Map();
		for (const q of questions) {
			if (!map.has(q.topicId)) {
				map.set(q.topicId, {
					topicId: q.topicId,
					topicName: q.topicName,
					topicNumber: q.topicNumber,
					to: q.to,
					accent: q.accent,
					total: 0,
					correct: 0,
					missed: 0, // incorrect or skipped
				});
			}
			const t = map.get(q.topicId);
			t.total += 1;
			if (answers[q.id]?.status === 'correct') t.correct += 1;
			else t.missed += 1;
		}
		return [...map.values()];
	}, [questions, answers]);

	const revisit = useMemo(
		() =>
			topics
				.filter(t => t.missed > 0)
				.sort((a, b) => b.missed - a.missed || a.topicNumber.localeCompare(b.topicNumber)),
		[topics]
	);
	const mastered = useMemo(
		() => topics.filter(t => t.missed === 0),
		[topics]
	);

	return (
		<section className={styles.summary} aria-labelledby="review-summary-heading">
			<header className={styles.head}>
				<p className={styles.eyebrow}>Session complete</p>
				<h2 id="review-summary-heading" className={styles.scoreLine}>
					<span className={styles.scoreNum}>{score}</span>
					<span className={styles.scoreOf}> / {total}</span>
				</h2>
				<div
					className={styles.scoreTrack}
					role="progressbar"
					aria-valuenow={score}
					aria-valuemin={0}
					aria-valuemax={total}
					aria-label={`Scored ${score} of ${total}`}
				>
					<span
						className={styles.scoreFill}
						style={{ width: `${percent}%` }}
					/>
				</div>
				<p className={styles.verdict}>{verdictFor(ratio)}</p>
			</header>

			{revisit.length > 0 && (
				<div className={styles.block}>
					<h3 className={styles.blockTitle}>Revisit these topics</h3>
					<ul className={styles.topicList}>
						{revisit.map(t => {
							const tones = accentTokens(t.accent);
							return (
							<li
								key={t.topicId}
								className={styles.topicRow}
								style={{
									'--q-accent': tones.accent,
									'--q-accent-ink': tones.ink,
									'--q-accent-contrast': tones.contrast,
								}}
							>
								<Link to={t.to} className={styles.topicLink}>
									<span className={styles.topicNum}>{t.topicNumber}</span>
									<span className={styles.topicMeta}>
										<span className={styles.topicName}>{t.topicName}</span>
										<span className={styles.topicScore}>
											{t.correct} / {t.total} correct
										</span>
									</span>
									<span className={styles.missBadge}>
										<X size={12} strokeWidth={2.6} aria-hidden="true" />
										{t.missed} to review
									</span>
									<ArrowRight
										size={15}
										strokeWidth={2}
										aria-hidden="true"
										className={styles.topicArrow}
									/>
								</Link>
							</li>
							);
						})}
					</ul>
				</div>
			)}

			{mastered.length > 0 && (
				<div className={styles.block}>
					<h3 className={styles.blockTitle}>Clean sweep</h3>
					<ul className={styles.masteredList}>
						{mastered.map(t => {
							const tones = accentTokens(t.accent);
							return (
							<li
								key={t.topicId}
								className={styles.masteredChip}
								style={{
									'--q-accent': tones.accent,
									'--q-accent-ink': tones.ink,
								}}
							>
								<Check size={12} strokeWidth={2.8} aria-hidden="true" />
								{t.topicName}
							</li>
							);
						})}
					</ul>
				</div>
			)}

			<div className={styles.actions}>
				<button type="button" className={styles.restartBtn} onClick={onRestart}>
					<RotateCcw size={15} strokeWidth={2.2} aria-hidden="true" />
					<span>New session</span>
				</button>
				<Link to="/" className={styles.homeLink}>
					Back to the path
				</Link>
			</div>
		</section>
	);
};

export default ReviewSummary;
