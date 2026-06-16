// checkAnswer — the pure answer-checking core for LessonCheck.
//
// This module is deliberately UI-free so the grading logic for every retrieval
// check kind can be unit-tested independently of React. LessonCheck (and any
// host page) calls `checkAnswer(check, payload)` and gets back a plain result;
// it never re-implements grading.
//
// PHILOSOPHY
//   Wrong answers are never punished. Grading only decides whether to show the
//   "correct" badge — the host always reveals the explanation regardless. So
//   `checkAnswer` returns `{ correct, ... }` and leaves pedagogy to the caller.
//
// CHECK KINDS + DATA SHAPES (the contract Phase 1b topics author against)
//   All kinds share: { kind, prompt, explanation }. Kind-specific fields below.
//
//   'choice'   : { options: string[], answer: string, misconceptions?: object }
//                payload: the chosen option string.
//                `misconceptions` is OPTIONAL: a map from a wrong option (keyed
//                by its String() form, so numeric options work) to a one-line
//                "why that was wrong" note. checkAnswer does not read it, so
//                grading is unaffected, but it travels on the check so the host
//                (LessonCheck) can surface the line that engages the chosen
//                distractor's misconception. Backward-compatible: checks without
//                it grade and render exactly as before.
//                -> { correct, selected }
//
//   'pair'     : host-graded stage interaction (selection on the visualization).
//                checkAnswer does NOT grade this — the host owns correctness and
//                feeds LessonCheck `state.status` directly. Included here only so
//                callers can route uniformly; returns { correct: null }.
//
//   'numeric'  : { answer: number, tolerance?: number }
//                Tolerant numeric match: correct when |value - answer| <=
//                tolerance (default 0 → exact). Accepts numeric strings.
//                payload: number | numeric string.
//                -> { correct, value }
//
//   'text'     : { answer?: string, accept?: string[], match?: fn }
//                Normalized tolerant text match. Normalization lowercases,
//                trims, and collapses internal whitespace. Correct when the
//                normalized payload equals the normalized `answer` OR any entry
//                in `accept` (synonyms), OR a provided `match(normalized, raw)`
//                predicate returns true.
//                payload: string.
//                -> { correct, value }
//
//   'order'    : { items: string[], answer: string[] }
//                Arrange items into a sequence. Correct when the payload array
//                deep-equals `answer` (order matters). `items` is the pool the
//                UI presents; `answer` is the target ordering.
//                payload: string[] (the user's ordering).
//                -> { correct, order }
//
//   'classify' : { items: [{id,label}], categories: [{id,label}],
//                  answer: { [itemId]: categoryId } }
//                Assign each item to a category. Correct when EVERY item is
//                assigned its answer category (all-or-nothing for the badge; the
//                result also reports per-item correctness for richer UI).
//                payload: { [itemId]: categoryId }.
//                -> { correct, assignment, perItem: { [itemId]: boolean } }
//
//   'predict'  : either a constrained choice (provide `options`) or a free value
//                (provide `numeric`/`text` style `answer`). Predict-the-next so a
//                host can gate revealing the next frame on a correct prediction.
//                  { mode?: 'choice'|'numeric'|'text', ... } — `mode` defaults to
//                  'choice' if `options` present, else 'numeric' if `answer` is a
//                  number, else 'text'. Grading delegates to the matching kind.
//                payload: per the resolved mode.
//                -> { correct, value, mode }
//
//   'stepProbe': a FROZEN-FRAME trace question — the canvas IS the question. The
//                check carries a `frame` (the algorithm's real state at step k, as
//                emitted by a trace generator) and a `view` descriptor naming how to
//                depict it; the learner predicts the NEXT decision, whose answer is
//                DERIVED from frame k+1 of the SAME generator (never hand-typed).
//                Grading is identical to 'predict' (it resolves the same
//                choice/numeric/text mode and delegates), so checkAnswer never reads
//                `frame`/`view` — those travel only for the host to render the frozen
//                state honestly. Shape:
//                  { frame, view, mode?, options?/answer?, ... }
//                payload: per the resolved mode.
//                -> { correct, value, mode }
//
//   'spotbug'  : { lines: string[], answer: number } | { options, answer }
//                Pick the wrong line / wrong claim. With `lines`, `answer` is the
//                index of the buggy line; payload is the chosen index. With
//                `options`, behaves like choice with the buggy claim as `answer`
//                and accepts the same optional `misconceptions` map.
//                payload: number (line index) | string (option).
//                -> { correct, selected }
//
//   'problem'  : { stem, parts: Check[] }
//                A multi-part exam-style question: a `stem` of shared context
//                followed by 3-5 linked sub-questions, each a normal LEAF check
//                ({ kind, prompt, ... }). Graded with partial credit by mapping
//                checkAnswer over the parts.
//                payload: an ARRAY of per-part payloads (payload[i] feeds
//                parts[i] in that leaf kind's own payload shape).
//                A part of kind 'pair' (external grading) is tolerated: it is
//                graded as { correct: null } and EXCLUDED from the score
//                denominator, so a problem never crashes on a non-auto-graded
//                part. Mirrors checkClassify's per-item style.
//                -> { correct, score, perPart: [{correct, ...}, ...] }
//                  `correct` is true only when every auto-graded part is correct;
//                  `score` is (#correct) / (#auto-graded parts), in [0, 1], and is
//                  0 when there are no auto-graded parts.

const isNil = v => v === undefined || v === null;

// Shared text normalizer: case-fold, trim, collapse internal whitespace.
export const normalizeText = value =>
	String(value ?? '')
		.toLowerCase()
		.trim()
		.replace(/\s+/g, ' ');

const toNumber = value => {
	if (typeof value === 'number') return Number.isNaN(value) ? null : value;
	if (typeof value === 'string' && value.trim() !== '') {
		const n = Number(value);
		return Number.isNaN(n) ? null : n;
	}
	return null;
};

const checkNumeric = (check, payload) => {
	const value = toNumber(payload);
	const target = toNumber(check.answer);
	if (value === null || target === null) return { correct: false, value };
	const tolerance = Math.abs(toNumber(check.tolerance) ?? 0);
	return { correct: Math.abs(value - target) <= tolerance, value };
};

const checkText = (check, payload) => {
	const raw = String(payload ?? '');
	const value = normalizeText(raw);
	if (value === '') return { correct: false, value };
	const accepted = [
		...(isNil(check.answer) ? [] : [check.answer]),
		...(Array.isArray(check.accept) ? check.accept : []),
	].map(normalizeText);
	let correct = accepted.includes(value);
	if (!correct && typeof check.match === 'function') {
		correct = Boolean(check.match(value, raw));
	}
	return { correct, value };
};

const arraysEqual = (a, b) =>
	Array.isArray(a) &&
	Array.isArray(b) &&
	a.length === b.length &&
	a.every((x, i) => x === b[i]);

const checkOrder = (check, payload) => {
	const order = Array.isArray(payload) ? payload : [];
	return { correct: arraysEqual(order, check.answer), order };
};

const checkClassify = (check, payload) => {
	const assignment = payload && typeof payload === 'object' ? payload : {};
	const answer = check.answer || {};
	const itemIds = Object.keys(answer);
	const perItem = {};
	let allCorrect = itemIds.length > 0;
	for (const id of itemIds) {
		const ok = assignment[id] === answer[id];
		perItem[id] = ok;
		if (!ok) allCorrect = false;
	}
	return { correct: allCorrect, assignment, perItem };
};

const checkChoice = (check, payload) => ({
	correct: payload === check.answer,
	selected: payload,
});

const resolvePredictMode = check => {
	if (check.mode) return check.mode;
	if (Array.isArray(check.options)) return 'choice';
	if (typeof check.answer === 'number') return 'numeric';
	return 'text';
};

const checkPredict = (check, payload) => {
	const mode = resolvePredictMode(check);
	if (mode === 'choice') {
		const r = checkChoice(check, payload);
		return { correct: r.correct, value: r.selected, mode };
	}
	if (mode === 'numeric') {
		const r = checkNumeric(check, payload);
		return { correct: r.correct, value: r.value, mode };
	}
	const r = checkText(check, payload);
	return { correct: r.correct, value: r.value, mode };
};

// A trace-step probe grades exactly like a predict: it resolves the same
// choice/numeric/text mode and delegates. The frozen `frame` and `view` descriptor
// ride on the check purely so the host can render the frame-k state; grading never
// reads them, so a probe can only ever be marked against the predicted next move.
const checkStepProbe = (check, payload) => checkPredict(check, payload);

const checkSpotbug = (check, payload) => {
	// Line-mode: answer is the buggy line index.
	if (Array.isArray(check.lines)) {
		const selected = toNumber(payload);
		return { correct: selected === toNumber(check.answer), selected };
	}
	// Claim-mode: behaves like a choice over options.
	return checkChoice(check, payload);
};

// Grade a multi-part problem: map checkAnswer over each leaf part with its own
// per-part payload. A 'pair' part (host-graded) returns { correct: null } and is
// excluded from the score denominator so the kind never crashes. Declared as a
// hoisted function so it can call checkAnswer, which is defined below.
function checkProblem(check, payload) {
	const parts = Array.isArray(check.parts) ? check.parts : [];
	const payloads = Array.isArray(payload) ? payload : [];
	const perPart = parts.map((part, i) => checkAnswer(part, payloads[i]));
	const graded = perPart.filter(r => r.correct !== null);
	const correctCount = graded.filter(r => r.correct === true).length;
	const score = graded.length === 0 ? 0 : correctCount / graded.length;
	const correct = graded.length > 0 && correctCount === graded.length;
	return { correct, score, perPart };
}

const GRADERS = {
	choice: checkChoice,
	numeric: checkNumeric,
	text: checkText,
	order: checkOrder,
	classify: checkClassify,
	predict: checkPredict,
	stepProbe: checkStepProbe,
	spotbug: checkSpotbug,
	problem: checkProblem,
};

/**
 * checkAnswer — grade a payload against a check definition.
 *
 * @param {object} check    a check object (see kinds above).
 * @param {*}      payload  the user's answer in the kind's payload shape.
 * @returns {{correct: boolean|null, ...}} kind-specific result. `pair` (and any
 *          unknown kind) returns { correct: null } because grading is external.
 */
export const checkAnswer = (check, payload) => {
	if (!check || typeof check !== 'object') return { correct: null };
	if (check.kind === 'pair') return { correct: null };
	const grader = GRADERS[check.kind];
	if (!grader) return { correct: null };
	return grader(check, payload);
};

export default checkAnswer;
