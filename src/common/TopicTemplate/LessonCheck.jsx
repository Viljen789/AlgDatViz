import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, MousePointerClick } from 'lucide-react';
import StepProbeFrame from './StepProbeFrame.jsx';
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
				placeholder={
					placeholder ||
					(kind === 'numeric' ? 'Enter a number' : 'Type your answer')
				}
				aria-label="Your answer"
				step={kind === 'numeric' ? 'any' : undefined}
			/>
			<button
				type="submit"
				className={styles.submit}
				disabled={draft.trim() === ''}
			>
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
			<ol
				className={styles.orderList}
				aria-label="Arrange into the correct order"
			>
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
const ClassifyGrid = ({
	items,
	categories,
	isAnswered,
	answer,
	perItem,
	onSubmit,
}) => {
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

// Resolve a predict check's effective mode (choice / numeric / text). Shared by
// the top-level component and the LeafInput so a predict part inside a problem
// renders the same widget it would on its own.
const resolvePredictMode = check => {
	if (check.mode) return check.mode;
	if (Array.isArray(check.options)) return 'choice';
	if (typeof check.answer === 'number') return 'numeric';
	return 'text';
};

// ── LeafInput — the per-kind input widget for ONE leaf check. ──
// Extracted so a 'problem' can render each of its parts WITHOUT forking the
// widgets: the top-level component and each problem part both route through here.
// Renders exactly the same markup the inline branches used before. 'pair' is the
// only kind LeafInput cannot host on its own (it needs the stage), so it shows a
// calm note inside a problem; standalone 'pair' is still handled by LessonCheck.
const LeafInput = ({ check, state, submit }) => {
	const isAnswered = state?.status != null;
	const predictMode =
		check.kind === 'predict' || check.kind === 'stepProbe'
			? resolvePredictMode(check)
			: null;

	if (check.kind === 'choice') {
		return (
			<ChoiceRow
				options={check.options}
				answer={check.answer}
				selected={state?.selected}
				isAnswered={isAnswered}
				onPick={submit}
			/>
		);
	}

	if (check.kind === 'numeric' || check.kind === 'text') {
		return (
			<InputForm
				kind={check.kind}
				placeholder={check.placeholder}
				isAnswered={isAnswered}
				value={state?.value}
				onSubmit={submit}
			/>
		);
	}

	if (check.kind === 'order') {
		return (
			<OrderList
				items={check.items}
				isAnswered={isAnswered}
				answer={check.answer}
				onSubmit={submit}
			/>
		);
	}

	if (check.kind === 'classify') {
		return (
			<ClassifyGrid
				items={check.items}
				categories={check.categories}
				isAnswered={isAnswered}
				answer={check.answer}
				perItem={state?.perItem}
				onSubmit={submit}
			/>
		);
	}

	if (check.kind === 'predict' && predictMode === 'choice') {
		return (
			<ChoiceRow
				options={check.options}
				answer={check.answer}
				selected={state?.value}
				isAnswered={isAnswered}
				onPick={submit}
			/>
		);
	}

	if (check.kind === 'predict' && predictMode !== 'choice') {
		return (
			<InputForm
				kind={predictMode}
				placeholder={check.placeholder}
				isAnswered={isAnswered}
				value={state?.value}
				onSubmit={submit}
			/>
		);
	}

	// Trace-step probe: render the frozen frame k as the question (the canvas IS the
	// question), then the same predict widget below. The answer is graded against the
	// generator's next frame; the depiction shows the generator's real state at k.
	if (check.kind === 'stepProbe') {
		return (
			<div className={styles.stepProbe}>
				<StepProbeFrame frame={check.frame} view={check.view} />
				{predictMode === 'choice' ? (
					<ChoiceRow
						options={check.options}
						answer={check.answer}
						selected={state?.value}
						isAnswered={isAnswered}
						onPick={submit}
					/>
				) : (
					<InputForm
						kind={predictMode}
						placeholder={check.placeholder}
						isAnswered={isAnswered}
						value={state?.value}
						onSubmit={submit}
					/>
				)}
			</div>
		);
	}

	if (check.kind === 'spotbug' && Array.isArray(check.lines)) {
		return (
			<SpotbugLines
				lines={check.lines}
				isAnswered={isAnswered}
				answer={check.answer}
				selected={state?.selected}
				onPick={submit}
			/>
		);
	}

	if (check.kind === 'spotbug' && !check.lines) {
		return (
			<ChoiceRow
				options={check.options}
				answer={check.answer}
				selected={state?.selected}
				isAnswered={isAnswered}
				onPick={submit}
			/>
		);
	}

	if (check.kind === 'pair') {
		return (
			<p className={styles.partPairNote}>
				Graded on the stage. Make the selection there.
			</p>
		);
	}

	return null;
};

const PART_LABELS = 'abcdefghijklmnopqrstuvwxyz';

// ── ProblemBlock — a multi-part exam question (stem + labelled sub-questions). ──
// Each part reuses LeafInput for its widget (no forked inputs). A per-part answer
// array is collected and submitted as one payload; the host grades via
// checkAnswer('problem', payload) and feeds the result back through `state`
// ({ status, score, perPart }). Per-part correct/incorrect and the overall score
// reveal with the same calm styling as every other kind.
const ProblemBlock = ({ check, state, submit }) => {
	const parts = Array.isArray(check.parts) ? check.parts : [];
	const isAnswered = state?.status != null;
	const perPart = state?.perPart;
	const [answers, setAnswers] = useState(() => parts.map(() => undefined));

	const setPartAnswer = (idx, value) =>
		setAnswers(prev => {
			const next = [...prev];
			next[idx] = value;
			return next;
		});

	// A part is ready once it has an answer, or it is a 'pair' (host-graded, so it
	// never blocks the problem-level submit).
	const allReady = parts.every(
		(part, idx) => part.kind === 'pair' || answers[idx] !== undefined
	);

	const scorePct = state?.score == null ? null : Math.round(state.score * 100);

	return (
		<div className={styles.problem}>
			<ol className={styles.partList}>
				{parts.map((part, idx) => {
					const partResult = perPart?.[idx];
					const partStatus = !isAnswered
						? null
						: partResult?.correct === true
							? 'correct'
							: partResult?.correct === null
								? null
								: 'incorrect';
					// The leaf widget reads its own state slice. Before submit, only
					// the draft answer matters; after submit, status drives the reveal.
					const partState = {
						status: partStatus,
						selected: answers[idx],
						value: answers[idx],
						order: answers[idx],
						assignment: answers[idx],
						perItem: partResult?.perItem,
					};
					return (
						<li key={idx} className={styles.part}>
							<div className={styles.partHead}>
								<span className={styles.partLabel} aria-hidden="true">
									{PART_LABELS[idx] || idx + 1}
								</span>
								<p className={styles.partPrompt}>{part.prompt}</p>
								{partStatus && (
									<span
										className={`${styles.partStatus} ${
											partStatus === 'correct'
												? styles.statusCorrect
												: styles.statusIncorrect
										}`}
									>
										{partStatus === 'correct' && (
											<Check size={12} strokeWidth={2.5} aria-hidden="true" />
										)}
										{STATUS_LABEL[partStatus]}
									</span>
								)}
							</div>
							<LeafInput
								check={part}
								state={partState}
								submit={value => setPartAnswer(idx, value)}
							/>
							{isAnswered && part.explanation && (
								<p className={styles.partExplanation}>{part.explanation}</p>
							)}
						</li>
					);
				})}
			</ol>
			{!isAnswered && (
				<button
					type="button"
					className={styles.submit}
					onClick={() => submit(answers)}
					disabled={!allReady}
				>
					Check answers
				</button>
			)}
			{isAnswered && scorePct != null && (
				<p className={styles.problemScore} aria-live="polite">
					Score: {scorePct}%
				</p>
			)}
		</div>
	);
};

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
 * Per-distractor feedback: a choice-style check (choice / spotbug claim-mode /
 * predict choice-mode) may carry an OPTIONAL `misconceptions` map from a wrong
 * option (keyed by its String() form) to a one-line "why that was wrong" note.
 * When the answer is incorrect and the chosen option has an entry, that line is
 * shown above the canonical explanation, framed as why the choice misfired —
 * calm, in the topic accent, never red. Checks without the map render unchanged.
 *
 * check kinds (data shapes documented in checkAnswer.js)
 * -----------
 *   'choice'   : { prompt, options[], answer, misconceptions?, explanation }
 *   'pair'     : { prompt, hint?, explanation } — host-graded stage interaction.
 *   'numeric'  : { prompt, answer, tolerance?, placeholder?, explanation }
 *   'text'     : { prompt, answer?/accept?/match?, placeholder?, explanation }
 *   'order'    : { prompt, items[], answer[], explanation }
 *   'classify' : { prompt, items[{id,label}], categories[{id,label}], answer{}, explanation }
 *   'predict'  : { prompt, (options/answer per mode), explanation }
 *   'spotbug'  : { prompt, lines[]+answer(index) | options[]+answer, explanation }
 *   'problem'  : { stem, parts[] } — a stem plus 3-5 labelled leaf sub-questions,
 *                graded with partial credit. State carries { status, score, perPart }.
 *
 * Props
 *   check            the check object.
 *   state            { status?: 'correct'|'incorrect', selected?, value?,
 *                      order?, assignment?, perItem? } controlled by the host.
 *   gated            true when this is the active check holding progress back.
 *                    Shows a calm "Answer to continue." affordance and an accent
 *                    ring while still unanswered; both clear once a status is set.
 *   onAnswer         (payload) => void — generic submit for every kind.
 *   onChoiceAnswer   (value) => void — backward-compatible alias of onAnswer
 *                    (kept so existing topics keep working).
 */
const LessonCheck = ({ check, state, gated, onAnswer, onChoiceAnswer }) => {
	const isAnswered = state?.status != null;
	const status = state?.status;
	// Only an unanswered, still-gating check shows the hint; answering clears it.
	const showGateHint = gated && !isAnswered;
	// onAnswer is the generic path; onChoiceAnswer remains as a back-compat alias.
	const submit = onAnswer || onChoiceAnswer || (() => {});

	const predictMode = useMemo(
		() => (check.kind === 'predict' ? resolvePredictMode(check) : null),
		[check]
	);

	// Per-distractor feedback: when a choice-style answer is wrong and the chosen
	// option has a `misconceptions` entry, surface the line that engages THAT
	// misconception above the canonical explanation. Predict choice-mode stores
	// the pick in state.value; choice and spotbug claim-mode store it in
	// state.selected. Options can be numbers, so look up by String() form.
	const misconception = useMemo(() => {
		if (status !== 'incorrect' || !check.misconceptions) return null;
		const picked = predictMode === 'choice' ? state?.value : state?.selected;
		if (picked == null) return null;
		return check.misconceptions[String(picked)] ?? null;
	}, [status, check.misconceptions, predictMode, state]);

	return (
		<aside
			className={`${styles.check} ${isAnswered ? styles.checkAnswered : ''} ${
				showGateHint ? styles.checkGated : ''
			}`}
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

			<p className={styles.prompt}>
				{check.kind === 'problem' ? check.stem : check.prompt}
			</p>

			{showGateHint && <p className={styles.gateHint}>Answer to continue.</p>}

			{check.kind === 'pair' && !isAnswered && (
				<PairProgress
					selectedCount={state?.selected?.length || 0}
					prompt={check.hint}
				/>
			)}

			{check.kind === 'problem' ? (
				<ProblemBlock check={check} state={state} submit={submit} />
			) : (
				check.kind !== 'pair' && (
					<LeafInput check={check} state={state} submit={submit} />
				)
			)}

			{isAnswered && check.kind !== 'problem' && (
				<div className={styles.reveal}>
					{misconception && (
						<p className={styles.misconception}>
							<span className={styles.misconceptionLabel}>
								Why that was wrong
							</span>
							{misconception}
						</p>
					)}
					<p className={styles.explanation}>{check.explanation}</p>
				</div>
			)}
		</aside>
	);
};

export default LessonCheck;
