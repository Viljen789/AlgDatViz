import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildExamSets } from '../data/examSets.js';
import {
	createExamSeed,
	examPaperUrl,
	normalizeExamSeed,
	readExamPaperIds,
	resolveExamPaperSets,
} from './examPaperState.js';

test('fresh seeds are canonical non-zero strings before generation', () => {
	assert.equal(
		createExamSeed({ now: () => 123456789, random: () => 0.25 }),
		String((123456789 ^ Math.floor(0.25 * 0xffffffff)) >>> 0)
	);
	assert.equal(createExamSeed({ now: () => 0, random: () => 0 }), '1');
	assert.equal(normalizeExamSeed(42), '42');
	assert.equal(normalizeExamSeed(' 42 '), '42');
	assert.equal(normalizeExamSeed(''), null);
});

test('paper URLs replace stale state and preserve ordered unique ids', () => {
	const href = examPaperUrl(
		'https://example.test/exam?seed=42&topic=mst&paper=stale&present=1#result',
		['trees-2', 'mst-1', 'trees-2', '']
	);
	const url = new URL(href);

	assert.equal(url.searchParams.get('seed'), '42');
	assert.equal(url.searchParams.get('paper'), 'trees-2,mst-1');
	assert.equal(url.searchParams.has('topic'), false);
	assert.equal(url.searchParams.get('present'), '1');
	assert.equal(url.hash, '#result');
	assert.deepEqual(readExamPaperIds(url.searchParams), ['trees-2', 'mst-1']);
});

test('a copied seed and ordered id list reconstruct the exact generated paper', () => {
	const seed = createExamSeed({ now: () => 987654321, random: () => 0.125 });
	const bank = buildExamSets(seed);
	const picked = resolveExamPaperSets(bank, ['linsort-3', 'mst-1', 'trees-3']);
	const href = examPaperUrl(
		`https://example.test/exam?seed=${seed}`,
		picked.map(set => set.id)
	);
	const url = new URL(href);
	const restoredSeed = normalizeExamSeed(url.searchParams.get('seed'));
	const restored = resolveExamPaperSets(
		buildExamSets(restoredSeed),
		readExamPaperIds(url.searchParams)
	);

assert.deepEqual(restored, picked);
});
