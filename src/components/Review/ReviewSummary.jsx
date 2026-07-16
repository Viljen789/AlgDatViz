import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, Check, RotateCcw, X } from 'lucide-react';
import { StudyOutcome } from '@viljen789/study-ui';
import { accentTokens } from './reviewUtils.js';
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
 *   schedule    optional { promoted, heldAtMax }: how the run moved the
 *               spaced-repetition schedule, so the summary can show one honest
 *               line ("N cards pushed further out"). Absent in free practice.
 *   onRestart   () => void — start a fresh, reseeded session.
 */
const ReviewSummary = ({ questions, answers, schedule, onRestart }) => {
	const total = questions.length;
	const score = useMemo(
		() => questions.filter(q => answers[q.id]?.status === 'correct').length,
		[questions, answers]
	);
	const ratio = total ? score / total : 0;

	// One honest line on what the run did to the schedule. A correct answer below
	// the top box pushes the card further out; a card already at the longest
	// interval is only "held" there, never claimed as advanced. Free-practice
	// runs pass no schedule, so this line stays absent rather than over-claiming.
	const promoted = schedule?.promoted ?? 0;
	const heldAtMax = schedule?.heldAtMax ?? 0;
	const scheduleLine = useMemo(() => {
		if (!schedule) return null;
		if (promoted > 0) {
			const noun = promoted === 1 ? 'card' : 'cards';
			const held =
				heldAtMax > 0 ? `, ${heldAtMax} held at the longest interval` : '';
			return `${promoted} ${noun} pushed further out${held}.`;
		}
		if (heldAtMax > 0) {
			const noun = heldAtMax === 1 ? 'card' : 'cards';
			return `${heldAtMax} ${noun} held at the longest interval.`;
		}
		return null;
	}, [schedule, promoted, heldAtMax]);

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
				.sort(
					(a, b) =>
						b.missed - a.missed || a.topicNumber.localeCompare(b.topicNumber)
				),
		[topics]
	);
	const mastered = useMemo(() => topics.filter(t => t.missed === 0), [topics]);
	const nextFocus = revisit[0] ?? null;

	return (
		<StudyOutcome
			className={styles.summary}
			eyebrow="Session complete"
			tone="review"
			score={{ value: score, max: total, label: `Scored ${score} of ${total}` }}
			heading="Review result"
			summary={verdictFor(ratio)}
			note={
				scheduleLine && (
					<span className={styles.scheduleLine}>
						<CalendarClock
							size={14}
							strokeWidth={2.2}
							aria-hidden="true"
							className={styles.scheduleIcon}
						/>
						{scheduleLine}
					</span>
				)
			}
			details={
				<>
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
													<span className={styles.topicName}>
														{t.topicName}
													</span>
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
				</>
			}
			actions={
				<div className={styles.actions}>
					{nextFocus ? (
						<Link to={nextFocus.to} className={styles.nextAction}>
							Continue with {nextFocus.topicName.toLowerCase()}
							<ArrowRight size={15} strokeWidth={2.2} aria-hidden="true" />
						</Link>
					) : (
						<Link to="/" className={styles.nextAction}>
							Return to today
							<ArrowRight size={15} strokeWidth={2.2} aria-hidden="true" />
						</Link>
					)}
					<button
						type="button"
						className={styles.restartBtn}
						onClick={onRestart}
					>
						<RotateCcw size={15} strokeWidth={2.2} aria-hidden="true" />
						<span>New session</span>
					</button>
					{nextFocus && (
						<Link to="/" className={styles.homeLink}>
							Back to today
						</Link>
					)}
				</div>
			}
		/>
	);
};

export default ReviewSummary;
