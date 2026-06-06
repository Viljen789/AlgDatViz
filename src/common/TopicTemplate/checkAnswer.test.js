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
	assert.equal(checkAnswer(check, '8').correct, true, 'accepts numeric strings');
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

test('spotbug — line index mode and claim mode', () => {
	const lineMode = {
		kind: 'spotbug',
		lines: ['i = 0', 'while i < n', 'i = i'],
		answer: 2,
	};
	assert.equal(checkAnswer(lineMode, 2).correct, true);
	assert.equal(checkAnswer(lineMode, '2').correct, true, 'accepts string index');
	assert.equal(checkAnswer(lineMode, 1).correct, false);

	const claimMode = {
		kind: 'spotbug',
		options: ['heaps are sorted', 'heaps are partially ordered'],
		answer: 'heaps are sorted',
	};
	assert.equal(checkAnswer(claimMode, 'heaps are sorted').correct, true);
	assert.equal(checkAnswer(claimMode, 'heaps are partially ordered').correct, false);
});

test('pair and unknown kinds are not graded here (correct: null)', () => {
	assert.equal(checkAnswer({ kind: 'pair' }, ['a']).correct, null);
	assert.equal(checkAnswer({ kind: 'mystery' }, 1).correct, null);
	assert.equal(checkAnswer(null, 1).correct, null);
});
