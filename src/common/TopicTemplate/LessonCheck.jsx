import { useMemo, useState } from 'react';
import {
	ArrowDown,
	ArrowUp,
	Check,
	MousePointerClick,
} from 'lucide-react';
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

// ── Choice row (also reused by spotbug claim-mode and predict choice-mode) ──
const ChoiceRow = ({ options, answer, selected, isAnswered, onPick }) => (
	<div className={styles.choiceRow} role="group" aria-label="Answer choices">
		{options.map(opt => {
			const isPicked = isAnswered && selected === opt;
			const isAnswer = isAnswered && opt === answer;
			return (
				<button
					key={opt}
					type="button"
					className={`${styles.choice} ${isAnswer ? styles.choiceAnswer : ''} ${
						isPicked && !isAnswer ? styles.choicePickedWrong : ''
					}`}
					onClick={() => !isAnswered && onPick(opt)}
					disabled={isAnswered}
					aria-pressed={isPicked}
				>
					{opt}
				</button>
			);
		})}
	</div>
);

// ── Free input (numeric / text), with a Submit button. ──
const InputForm = ({ kind, placeholder, isAnswered, value, onSubmit }) => {
	const [draft, setDraft] = useState('');
	const submit = e => {
		e.preventDefault();
		const trimmed = draft.trim();
		if (trimmed === '') return;
		onSubmit(kind === 'numeric' ? trimmed : draft);
	};
	if (isAnswered) {
		return (
			<p className={styles.answeredValue}>
				Your answer: <span className={styles.answeredValueText}>{value}</span>
			</p>
		);
	}
	return (
		<form className={styles.inputForm} onSubmit={submit}>
			<input
				className={styles.input}
				type={kind === 'numeric' ? 'number' : 'text'}
				inputMode={kind === 'numeric' ? 'decimal' : 'text'}
				value={draft}
				onChange={e => setDraft(e.target.value)}
				placeholder={placeholder || (kind === 'numeric' ? 'Enter a number' : 'Type your answer')}
				aria-label="Your answer"
				step={kind === 'numeric' ? 'any' : undefined}
			/>
			<button type="submit" className={styles.submit} disabled={draft.trim() === ''}>
				Check
			</button>
		</form>
	);
};

// ── Order: keyboard-accessible reordering (move up / move down). ──
const OrderList = ({ items, isAnswered, answer, onSubmit }) => {
	const [order, setOrder] = useState(items);
	const move = (idx, delta) => {
		const target = idx + delta;
		if (target < 0 || target >= order.length) return;
		setOrder(prev => {
			const next = [...prev];
			[next[idx], next[target]] = [next[target], next[idx]];
			return next;
		});
	};
	return (
		<div className={styles.orderWrap}>
			<ol className={styles.orderList} aria-label="Arrange into the correct order">
				{order.map((item, idx) => {
					const correctSlot = isAnswered && answer?.[idx] === item;
					return (
						<li
							key={item}
							className={`${styles.orderItem} ${
								isAnswered
									? correctSlot
										? styles.orderItemRight
										: styles.orderItemWrong
									: ''
							}`}
						>
							<span className={styles.orderRank} aria-hidden="true">
								{idx + 1}
							</span>
							<span className={styles.orderLabel}>{item}</span>
							{!isAnswered && (
								<span className={styles.orderControls}>
									<button
										type="button"
										className={styles.orderBtn}
										onClick={() => move(idx, -1)}
										disabled={idx === 0}
										aria-label={`Move ${item} up`}
									>
										<ArrowUp size={13} strokeWidth={2.2} aria-hidden="true" />
									</button>
									<button
										type="button"
										className={styles.orderBtn}
										onClick={() => move(idx, 1)}
										disabled={idx === order.length - 1}
										aria-label={`Move ${item} down`}
									>
										<ArrowDown size={13} strokeWidth={2.2} aria-hidden="true" />
									</button>
								</span>
							)}
						</li>
					);
				})}
			</ol>
			{!isAnswered && (
				<button
					type="button"
					className={styles.submit}
					onClick={() => onSubmit(order)}
				>
					Check order
				</button>
			)}
		</div>
	);
};

// ── Classify: assign each item to a category via a select (keyboard-native). ──
const ClassifyGrid = ({ items, categories, isAnswered, answer, perItem, onSubmit }) => {
	const [assignment, setAssignment] = useState({});
	const allAssigned = items.every(item => assignment[item.id]);
	return (
		<div className={styles.classifyWrap}>
			<ul className={styles.classifyList}>
				{items.map(item => {
					const itemRight = isAnswered && perItem?.[item.id];
					return (
						<li
							key={item.id}
							className={`${styles.classifyItem} ${
								isAnswered
									? itemRight
										? styles.classifyItemRight
										: styles.classifyItemWrong
									: ''
							}`}
						>
							<span className={styles.classifyLabel}>{item.label}</span>
							{isAnswered ? (
								<span className={styles.classifyResult}>
									{categories.find(c => c.id === answer?.[item.id])?.label}
								</span>
							) : (
								<select
									className={styles.classifySelect}
									value={assignment[item.id] || ''}
									onChange={e =>
										setAssignment(prev => ({
											...prev,
											[item.id]: e.target.value,
										}))
									}
									aria-label={`Category for ${item.label}`}
								>
									<option value="" disabled>
										Choose…
									</option>
									{categories.map(cat => (
										<option key={cat.id} value={cat.id}>
											{cat.label}
										</option>
									))}
								</select>
							)}
						</li>
					);
				})}
			</ul>
			{!isAnswered && (
				<button
					type="button"
					className={styles.submit}
					onClick={() => onSubmit(assignment)}
					disabled={!allAssigned}
				>
					Check
				</button>
			)}
		</div>
	);
};

// ── Spotbug line-mode: pick the buggy line from a code listing. ──
const SpotbugLines = ({ lines, isAnswered, answer, selected, onPick }) => (
	<ol className={styles.spotbugList} aria-label="Pick the incorrect line">
		{lines.map((line, idx) => {
			const isPicked = isAnswered && Number(selected) === idx;
			const isBug = isAnswered && idx === answer;
			return (
				<li key={idx}>
					<button
						type="button"
						className={`${styles.spotbugLine} ${isBug ? styles.spotbugBug : ''} ${
							isPicked && !isBug ? styles.spotbugWrong : ''
						}`}
						onClick={() => !isAnswered && onPick(idx)}
						disabled={isAnswered}
						aria-pressed={isPicked}
					>
						<span className={styles.spotbugGutter} aria-hidden="true">
							{idx + 1}
						</span>
						<code className={styles.spotbugCode}>{line}</code>
					</button>
				</li>
			);
		})}
	</ol>
);

/**
 * LessonCheck — the reusable inline comprehension check for TopicTemplate.
 *
 * Wrong answers are never punished: the explanation reveals regardless of
 * correctness, so every attempt becomes a teaching moment.
 *
 * Grading lives in the pure `checkAnswer(check, payload)` module; this component
 * only renders the interaction and calls `onAnswer(payload)` with the kind's
 * payload. The host grades + stores the result in `state` and feeds it back.
 *
 * check kinds (data shapes documented in checkAnswer.js)
 * -----------
 *   'choice'   : { prompt, options[], answer, explanation }
 *   'pair'     : { prompt, hint?, explanation } — host-graded stage interaction.
 *   'numeric'  : { prompt, answer, tolerance?, placeholder?, explanation }
 *   'text'     : { prompt, answer?/accept?/match?, placeholder?, explanation }
 *   'order'    : { prompt, items[], answer[], explanation }
 *   'classify' : { prompt, items[{id,label}], categories[{id,label}], answer{}, explanation }
 *   'predict'  : { prompt, (options/answer per mode), explanation }
 *   'spotbug'  : { prompt, lines[]+answer(index) | options[]+answer, explanation }
 *
 * Props
 *   check            the check object.
 *   state            { status?: 'correct'|'incorrect', selected?, value?,
 *                      order?, assignment?, perItem? } controlled by the host.
 *   onAnswer         (payload) => void — generic submit for every kind.
 *   onChoiceAnswer   (value) => void — backward-compatible alias of onAnswer
 *                    (kept so existing topics keep working).
 */
const LessonCheck = ({ check, state, onAnswer, onChoiceAnswer }) => {
	const isAnswered = state?.status != null;
	const status = state?.status;
	// onAnswer is the generic path; onChoiceAnswer remains as a back-compat alias.
	const submit = onAnswer || onChoiceAnswer || (() => {});

	const predictMode = useMemo(() => {
		if (check.kind !== 'predict') return null;
		if (check.mode) return check.mode;
		if (Array.isArray(check.options)) return 'choice';
		if (typeof check.answer === 'number') return 'numeric';
		return 'text';
	}, [check]);

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
				<ChoiceRow
					options={check.options}
					answer={check.answer}
					selected={state?.selected}
					isAnswered={isAnswered}
					onPick={submit}
				/>
			)}

			{check.kind === 'pair' && !isAnswered && (
				<PairProgress
					selectedCount={state?.selected?.length || 0}
					prompt={check.hint}
				/>
			)}

			{(check.kind === 'numeric' || check.kind === 'text') && (
				<InputForm
					kind={check.kind}
					placeholder={check.placeholder}
					isAnswered={isAnswered}
					value={state?.value}
					onSubmit={submit}
				/>
			)}

			{check.kind === 'order' && (
				<OrderList
					items={check.items}
					isAnswered={isAnswered}
					answer={check.answer}
					onSubmit={submit}
				/>
			)}

			{check.kind === 'classify' && (
				<ClassifyGrid
					items={check.items}
					categories={check.categories}
					isAnswered={isAnswered}
					answer={check.answer}
					perItem={state?.perItem}
					onSubmit={submit}
				/>
			)}

			{check.kind === 'predict' && predictMode === 'choice' && (
				<ChoiceRow
					options={check.options}
					answer={check.answer}
					selected={state?.value}
					isAnswered={isAnswered}
					onPick={submit}
				/>
			)}

			{check.kind === 'predict' && predictMode !== 'choice' && (
				<InputForm
					kind={predictMode}
					placeholder={check.placeholder}
					isAnswered={isAnswered}
					value={state?.value}
					onSubmit={submit}
				/>
			)}

			{check.kind === 'spotbug' && Array.isArray(check.lines) && (
				<SpotbugLines
					lines={check.lines}
					isAnswered={isAnswered}
					answer={check.answer}
					selected={state?.selected}
					onPick={submit}
				/>
			)}

			{check.kind === 'spotbug' && !check.lines && (
				<ChoiceRow
					options={check.options}
					answer={check.answer}
					selected={state?.selected}
					isAnswered={isAnswered}
					onPick={submit}
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
