import { useCallback, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, RotateCcw } from 'lucide-react';
import LessonCheck from '../../common/TopicTemplate/LessonCheck.jsx';
import { checkAnswer } from '../../common/TopicTemplate/checkAnswer.js';
import { accentTokens } from './reviewBank.js';
import ReviewSummary from './ReviewSummary.jsx';
import styles from './ReviewSession.module.css';

/**
 * ReviewSession — one cumulative mixed-review run.
 *
 * Walks a pre-sampled, cross-topic list of bank questions one at a time. Each
 * question renders through the shared LessonCheck and is graded by the pure
 * checkAnswer core — never a bespoke grader — so every kind (choice, numeric,
 * text, order, classify, predict, spotbug) behaves exactly as it does in its
 * home topic. A running score is kept; wrong answers reveal the explanation
 * (consistent with the rest of the app, where mistakes teach). At the end a
 * summary reports the score and which topics to revisit.
 *
 * Per the brief, the page does NOT mutate the progress API; review is its own
 * spaced-retrieval surface. State is local to the session.
 *
 * Props
 *   questions   the sampled bank entries (each: { id, topicId, topicName,
 *               topicNumber, to, accent, sceneId, sceneTitle, check }).
 *   onRestart   () => void — reseed and start a fresh session.
 *   onGraded    optional (entryId, correct) => { promoted, heldAtMax } | void.
 *               Fired once per question when first answered, so a spaced-
 *               repetition layer can reschedule the card. May return how this
 *               answer moved the schedule (promoted = pushed to a longer
 *               interval; heldAtMax = kept at the longest interval), which the
 *               summary reports honestly. Omitted by free-practice callers.
 */
const ReviewSession = ({ questions, onRestart, onGraded }) => {
	// Per-question controlled check state, keyed by entry id. Same shape the
	// topic pages feed LessonCheck: { status, ...graderResult }.
	const [answers, setAnswers] = useState({});
	const [index, setIndex] = useState(0);
	const [finished, setFinished] = useState(false);
	// Running tally of how this run moved the schedule, from onGraded's return:
	// `promoted` cards got a longer interval, `heldAtMax` were already at the top.
	const [schedule, setSchedule] = useState({ promoted: 0, heldAtMax: 0 });
	const liveRef = useRef(null);

	const total = questions.length;
	const current = questions[index];
	const currentState = current ? answers[current.id] : undefined;
	const isAnswered = currentState?.status != null;

	const answeredCount = useMemo(
		() => Object.values(answers).filter(a => a?.status != null).length,
		[answers]
	);
	const score = useMemo(
		() => Object.values(answers).filter(a => a?.status === 'correct').length,
		[answers]
	);

	// Grade via the shared pure core, then store the result + status. Identical to
	// the topic pages so the bank's checks grade the same way everywhere.
	const handleAnswer = useCallback(
		payload => {
			if (!current) return;
			if (answers[current.id]?.status != null) return; // grade & schedule once
			const result = checkAnswer(current.check, payload);
			setAnswers(prev => {
				if (prev[current.id]?.status != null) return prev;
				return {
					...prev,
					[current.id]: {
						...result,
						status: result.correct ? 'correct' : 'incorrect',
					},
				};
			});
			const moved = onGraded?.(current.id, result.correct);
			if (moved) {
				setSchedule(prev => ({
					promoted: prev.promoted + (moved.promoted ? 1 : 0),
					heldAtMax: prev.heldAtMax + (moved.heldAtMax ? 1 : 0),
				}));
			}
		},
		[current, answers, onGraded]
	);

	const goNext = useCallback(() => {
		if (index + 1 >= total) {
			setFinished(true);
			return;
		}
		setIndex(i => Math.min(i + 1, total - 1));
		// Move focus to the new question heading for screen-reader continuity.
		requestAnimationFrame(() => liveRef.current?.focus());
	}, [index, total]);

	if (total === 0) {
		return (
			<div className={styles.empty} role="status">
				<p>No review questions are available yet.</p>
			</div>
		);
	}

	if (finished) {
		return (
			<ReviewSummary
				questions={questions}
				answers={answers}
				schedule={schedule}
				onRestart={onRestart}
			/>
		);
	}

	const progressPercent = Math.round((index / total) * 100);
	const tones = accentTokens(current.accent);

	return (
		<div
			className={styles.session}
			style={{
				'--q-accent': tones.accent,
				'--q-accent-ink': tones.ink,
				'--q-accent-contrast': tones.contrast,
			}}
		>
			{/* Progress + running score */}
			<div className={styles.statusBar}>
				<div
					className={styles.progress}
					role="group"
					aria-label={`Question ${index + 1} of ${total}`}
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
						Question <strong>{index + 1}</strong> / {total}
					</span>
				</div>

				<div className={styles.score} aria-live="off">
					<Check size={14} strokeWidth={2.6} aria-hidden="true" />
					<span>
						<strong>{score}</strong> correct
						{answeredCount > 0 && (
							<span className={styles.scoreMeta}> · {answeredCount} answered</span>
						)}
					</span>
				</div>
			</div>

			{/* The question card */}
			<div className={styles.card}>
				<div className={styles.cardHead}>
					<Link
						to={current.to}
						className={styles.topicTag}
						aria-label={`From ${current.topicName} — open this topic`}
					>
						<span className={styles.topicNum}>{current.topicNumber}</span>
						<span className={styles.topicName}>{current.topicName}</span>
						<ArrowRight size={12} strokeWidth={2.2} aria-hidden="true" />
					</Link>
					<p className={styles.sceneTitle}>{current.sceneTitle}</p>
				</div>

				{/* The retrieval question heading — focus target for a11y. */}
				<h2
					className={styles.srHeading}
					tabIndex={-1}
					ref={liveRef}
				>
					Question {index + 1} of {total}, from {current.topicName}
				</h2>

				{/* Reuse the canonical check renderer + grader — no reinvented UI. */}
				<LessonCheck
					key={current.id}
					check={current.check}
					state={currentState}
					onAnswer={handleAnswer}
				/>

				<div className={styles.actions}>
					{!isAnswered && (
						<button
							type="button"
							className={styles.skipBtn}
							onClick={goNext}
						>
							{index + 1 >= total ? 'Skip & finish' : 'Skip'}
						</button>
					)}
					{isAnswered && (
						<button
							type="button"
							className={styles.nextBtn}
							onClick={goNext}
							autoFocus
						>
							<span>
								{index + 1 >= total ? 'See results' : 'Next question'}
							</span>
							<ArrowRight size={15} strokeWidth={2.2} aria-hidden="true" />
						</button>
					)}
				</div>
			</div>

			<div className={styles.sessionFoot}>
				<button
					type="button"
					className={styles.restartLink}
					onClick={onRestart}
				>
					<RotateCcw size={13} strokeWidth={2} aria-hidden="true" />
					<span>Start over with a new set</span>
				</button>
			</div>
		</div>
	);
};

export default ReviewSession;
