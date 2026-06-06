import { Check, MousePointerClick } from 'lucide-react';
import styles from './LessonCheck.module.css';

const STATUS_LABEL = {
	correct: 'Correct',
	incorrect: 'Not quite',
};

const PairProgress = ({ selectedCount, prompt }) => (
	<div className={styles.pairProgress} aria-live="polite">
		<MousePointerClick size={14} strokeWidth={2} aria-hidden="true" />
		<span>
			{selectedCount === 0
				? prompt || 'Make a selection on the stage to begin.'
				: 'Now complete your selection on the stage.'}
		</span>
	</div>
);

/**
 * LessonCheck — the reusable inline comprehension check for TopicTemplate.
 *
 * Wrong answers are never punished: the explanation reveals regardless of
 * correctness, so every attempt becomes a teaching moment.
 *
 * check kinds
 * -----------
 *   'choice' : { prompt, options[], answer, explanation }
 *              Rendered as a button row; this component owns the interaction
 *              and calls onChoiceAnswer(value).
 *   'pair'   : { prompt, hint?, explanation }
 *              An interaction that happens on the visualization stage; the host
 *              owns the state and feeds back `state.status`. This component only
 *              renders the prompt, the in-progress hint, and the reveal.
 *
 * state: { status?: 'correct' | 'incorrect', selected?, ... }
 */
const LessonCheck = ({ check, state, onChoiceAnswer }) => {
	const isAnswered = state?.status != null;
	const status = state?.status;

	return (
		<aside
			className={`${styles.check} ${isAnswered ? styles.checkAnswered : ''}`}
			aria-label="Check your understanding"
		>
			<div className={styles.head}>
				<span className={styles.eyebrow}>Check</span>
				{isAnswered && (
					<span
						className={`${styles.status} ${
							status === 'correct'
								? styles.statusCorrect
								: styles.statusIncorrect
						}`}
					>
						{status === 'correct' && (
							<Check size={13} strokeWidth={2.5} aria-hidden="true" />
						)}
						{STATUS_LABEL[status]}
					</span>
				)}
			</div>

			<p className={styles.prompt}>{check.prompt}</p>

			{check.kind === 'choice' && (
				<div
					className={styles.choiceRow}
					role="group"
					aria-label="Answer choices"
				>
					{check.options.map(opt => {
						const isPicked = isAnswered && state.selected === opt;
						const isAnswer = isAnswered && opt === check.answer;
						return (
							<button
								key={opt}
								type="button"
								className={`${styles.choice} ${
									isAnswer ? styles.choiceAnswer : ''
								} ${isPicked && !isAnswer ? styles.choicePickedWrong : ''}`}
								onClick={() => !isAnswered && onChoiceAnswer(opt)}
								disabled={isAnswered}
								aria-pressed={isPicked}
							>
								{opt}
							</button>
						);
					})}
				</div>
			)}

			{check.kind === 'pair' && !isAnswered && (
				<PairProgress
					selectedCount={state?.selected?.length || 0}
					prompt={check.hint}
				/>
			)}

			{isAnswered && (
				<div className={styles.reveal}>
					<p className={styles.explanation}>{check.explanation}</p>
				</div>
			)}
		</aside>
	);
};

export default LessonCheck;
