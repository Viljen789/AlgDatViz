import assert from 'node:assert/strict';
import test from 'node:test';
import { checkAnswer } from './checkAnswer.js';

test('choice — exact option match', () => {
	const check = { kind: 'choice', options: ['a', 'b'], answer: 'b' };
	assert.equal(checkAnswer(check, 'b').correct, true);
	assert.equal(checkAnswer(check, 'a').correct, false);
	assert.equal(checkAnswer(check, 'b').selected, 'b');
});

test('numeric — exact match when no tolerance', () => {
	const check = { kind: 'numeric', answer: 8 };
	assert.equal(checkAnswer(check, 8).correct, true);
	assert.equal(
		checkAnswer(check, '8').correct,
		true,
		'accepts numeric strings'
	);
	assert.equal(checkAnswer(check, 7).correct, false);
});

test('numeric — tolerant within ± tolerance, fails outside', () => {
	const check = { kind: 'numeric', answer: 100, tolerance: 5 };
	assert.equal(checkAnswer(check, 103).correct, true);
	assert.equal(checkAnswer(check, 95).correct, true, 'boundary inclusive');
	assert.equal(checkAnswer(check, 105).correct, true, 'boundary inclusive');
	assert.equal(checkAnswer(check, 106).correct, false);
	assert.equal(checkAnswer(check, 'abc').correct, false, 'non-numeric → false');
});

test('text — normalized tolerant match (case/space-insensitive)', () => {
	const check = { kind: 'text', answer: 'Big O' };
	assert.equal(checkAnswer(check, '  big   o ').correct, true);
	assert.equal(checkAnswer(check, 'BIG O').correct, true);
	assert.equal(checkAnswer(check, 'theta').correct, false);
	assert.equal(checkAnswer(check, '').correct, false, 'empty is not correct');
});

test('text — accepted-answers list (synonyms)', () => {
	const check = {
		kind: 'text',
		answer: 'logarithmic',
		accept: ['log n', 'o(log n)'],
	};
	assert.equal(checkAnswer(check, 'LOG N').correct, true);
	assert.equal(checkAnswer(check, 'O(log n)').correct, true);
	assert.equal(checkAnswer(check, 'linear').correct, false);
});

test('text — custom match predicate', () => {
	const check = {
		kind: 'text',
		match: normalized => normalized.includes('divide'),
	};
	assert.equal(checkAnswer(check, 'Divide and conquer').correct, true);
	assert.equal(checkAnswer(check, 'greedy').correct, false);
});

test('order — deep equality, order matters', () => {
	const check = {
		kind: 'order',
		items: ['split', 'sort', 'merge'],
		answer: ['split', 'sort', 'merge'],
	};
	assert.equal(checkAnswer(check, ['split', 'sort', 'merge']).correct, true);
	assert.equal(checkAnswer(check, ['sort', 'split', 'merge']).correct, false);
	assert.equal(checkAnswer(check, ['split', 'sort']).correct, false, 'length');
	assert.equal(checkAnswer(check, null).correct, false);
});

test('classify — all-correct required for the badge, perItem reported', () => {
	const check = {
		kind: 'classify',
		items: [
			{ id: 'e1', label: 'u→v' },
			{ id: 'e2', label: 'v→u' },
		],
		categories: [
			{ id: 'tree', label: 'tree edge' },
			{ id: 'back', label: 'back edge' },
		],
		answer: { e1: 'tree', e2: 'back' },
	};
	const all = checkAnswer(check, { e1: 'tree', e2: 'back' });
	assert.equal(all.correct, true);
	assert.deepEqual(all.perItem, { e1: true, e2: true });

	const partial = checkAnswer(check, { e1: 'tree', e2: 'tree' });
	assert.equal(partial.correct, false, 'one wrong → not correct');
	assert.deepEqual(partial.perItem, { e1: true, e2: false });

	const empty = checkAnswer(check, {});
	assert.equal(empty.correct, false);
});

test('predict — resolves mode (choice/numeric/text)', () => {
	const choice = { kind: 'predict', options: ['x', 'y'], answer: 'y' };
	assert.equal(checkAnswer(choice, 'y').correct, true);
	assert.equal(checkAnswer(choice, 'y').mode, 'choice');

	const numeric = { kind: 'predict', answer: 42, tolerance: 1 };
	assert.equal(checkAnswer(numeric, 43).correct, true);
	assert.equal(checkAnswer(numeric, 43).mode, 'numeric');

	const text = { kind: 'predict', answer: 'pop' };
	assert.equal(checkAnswer(text, 'POP').correct, true);
	assert.equal(checkAnswer(text, 'POP').mode, 'text');
});

test('stepProbe — grades like predict (choice mode), ignores frame/view', () => {
	// The frozen state and view ride on the check; grading must NOT consult them.
	const check = {
		kind: 'stepProbe',
		frame: { phase: 'settle', settled: ['B', 'S'], dist: { S: 0, A: 3, B: 1 } },
		view: { kind: 'dijkstra-settle', nextLabel: 'settle next' },
		options: ['A', 'C', 'D'],
		answer: 'A', // derived from frame k+1's active vertex
	};
	assert.equal(checkAnswer(check, 'A').correct, true);
	assert.equal(checkAnswer(check, 'A').mode, 'choice');
	assert.equal(checkAnswer(check, 'C').correct, false);
	assert.equal(checkAnswer(check, 'A').value, 'A');
});

test('stepProbe — numeric mode (e.g. relaxed dist[v]) grades tolerantly', () => {
	const check = {
		kind: 'stepProbe',
		frame: { phase: 'relax-keep', dist: { S: 0, A: 4 } },
		view: { kind: 'relax-edge', edge: { from: 'S', to: 'A', weight: 3 } },
		mode: 'numeric',
		answer: 3, // dist[A] becomes 3 at frame k+1
	};
	assert.equal(checkAnswer(check, 3).correct, true);
	assert.equal(
		checkAnswer(check, '3').correct,
		true,
		'accepts numeric strings'
	);
	assert.equal(checkAnswer(check, 3).mode, 'numeric');
	assert.equal(checkAnswer(check, 4).correct, false);
});

test('spotbug — line index mode and claim mode', () => {
	const lineMode = {
		kind: 'spotbug',
		lines: ['i = 0', 'while i < n', 'i = i'],
		answer: 2,
	};
	assert.equal(checkAnswer(lineMode, 2).correct, true);
	assert.equal(
		checkAnswer(lineMode, '2').correct,
		true,
		'accepts string index'
	);
	assert.equal(checkAnswer(lineMode, 1).correct, false);

	const claimMode = {
		kind: 'spotbug',
		options: ['heaps are sorted', 'heaps are partially ordered'],
		answer: 'heaps are sorted',
	};
	assert.equal(checkAnswer(claimMode, 'heaps are sorted').correct, true);
	assert.equal(
		checkAnswer(claimMode, 'heaps are partially ordered').correct,
		false
	);
});

test('pair and unknown kinds are not graded here (correct: null)', () => {
	assert.equal(checkAnswer({ kind: 'pair' }, ['a']).correct, null);
	assert.equal(checkAnswer({ kind: 'mystery' }, 1).correct, null);
	assert.equal(checkAnswer(null, 1).correct, null);
});

test('problem — all parts correct → score 1, correct true', () => {
	const check = {
		kind: 'problem',
		stem: 'Run Dijkstra from s on the given graph.',
		parts: [
			{ kind: 'numeric', prompt: 'd(t)?', answer: 8 },
			{
				kind: 'choice',
				prompt: 'First settled?',
				options: ['s', 'a'],
				answer: 's',
			},
			{ kind: 'text', prompt: 'Predecessor of t?', answer: 'a' },
		],
	};
	const result = checkAnswer(check, [8, 's', 'A']);
	assert.equal(result.correct, true);
	assert.equal(result.score, 1);
	assert.equal(result.perPart.length, 3);
	assert.deepEqual(
		result.perPart.map(p => p.correct),
		[true, true, true]
	);
});

test('problem — partial credit (2/3) → score 2/3, correct false', () => {
	const check = {
		kind: 'problem',
		stem: 'Heap facts.',
		parts: [
			{ kind: 'numeric', prompt: 'Parent index of 5 (1-based)?', answer: 2 },
			{ kind: 'numeric', prompt: 'Left child of 2?', answer: 4 },
			{
				kind: 'choice',
				prompt: 'A max-heap root holds the…',
				options: ['min', 'max'],
				answer: 'max',
			},
		],
	};
	const result = checkAnswer(check, [2, 99, 'max']);
	assert.equal(result.correct, false);
	assert.equal(result.score, 2 / 3);
	assert.deepEqual(
		result.perPart.map(p => p.correct),
		[true, false, true]
	);
});

test('problem — mixed leaf kinds graded together', () => {
	const check = {
		kind: 'problem',
		stem: 'A grab-bag of leaf kinds.',
		parts: [
			{
				kind: 'order',
				prompt: 'Phases?',
				items: ['a', 'b'],
				answer: ['a', 'b'],
			},
			{
				kind: 'classify',
				prompt: 'Sort edges',
				items: [{ id: 'e1', label: 'u→v' }],
				categories: [{ id: 'tree', label: 'tree' }],
				answer: { e1: 'tree' },
			},
			{ kind: 'numeric', prompt: 'Count?', answer: 3, tolerance: 1 },
		],
	};
	const all = checkAnswer(check, [['a', 'b'], { e1: 'tree' }, 4]);
	assert.equal(all.correct, true);
	assert.equal(all.score, 1);
	assert.deepEqual(
		all.perPart.map(p => p.correct),
		[true, true, true]
	);

	const some = checkAnswer(check, [['b', 'a'], { e1: 'tree' }, 4]);
	assert.equal(some.correct, false);
	assert.equal(some.score, 2 / 3);
	assert.deepEqual(
		some.perPart.map(p => p.correct),
		[false, true, true]
	);
});

test('problem — pair parts are tolerated, excluded from the denominator', () => {
	const check = {
		kind: 'problem',
		stem: 'One auto-graded part, one host-graded part.',
		parts: [
			{ kind: 'numeric', prompt: 'd(t)?', answer: 8 },
			{ kind: 'pair', prompt: 'Select the relaxing edge on the stage.' },
		],
	};
	const result = checkAnswer(check, [8, ['x', 'y']]);
	// Only the numeric part counts toward the score; the pair part is null.
	assert.equal(result.score, 1);
	assert.equal(result.correct, true);
	assert.equal(result.perPart[1].correct, null, 'pair part not auto-graded');

	const wrong = checkAnswer(check, [7, ['x', 'y']]);
	assert.equal(wrong.score, 0);
	assert.equal(wrong.correct, false);
});

test('problem — missing/empty payload grades every part as incorrect', () => {
	const check = {
		kind: 'problem',
		stem: 'No answers given.',
		parts: [
			{ kind: 'numeric', prompt: 'x?', answer: 1 },
			{ kind: 'text', prompt: 'y?', answer: 'foo' },
		],
	};
	const result = checkAnswer(check, undefined);
	assert.equal(result.correct, false);
	assert.equal(result.score, 0);
	assert.deepEqual(
		result.perPart.map(p => p.correct),
		[false, false]
	);
});
