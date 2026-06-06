import assert from 'node:assert/strict';
import test from 'node:test';
import { getCountingSortStepsWithStats } from '../../utils/sorting/algorithms/countingSort.js';
import { getRadixSortStepsWithStats } from '../../utils/sorting/algorithms/radixSort.js';
import { getBucketSortStepsWithStats } from '../../utils/sorting/algorithms/bucketSort.js';
import {
	BUCKET_PSEUDO,
	COUNTING_PSEUDO,
	PSEUDO_BY_ALGORITHM,
	RADIX_PSEUDO,
	stepToPseudoFrame,
} from './sortingPseudo.js';

// Every {line, state} frame must point at a real pseudocode line and carry
// state rows, so PseudoState renders in lockstep with the canvas.
const assertConformant = (frame, lines) => {
	assert.ok(Array.isArray(frame.state), 'frame.state is an array');
	if (frame.line !== null) {
		assert.equal(typeof frame.line, 'number', 'line is a number when set');
		assert.ok(frame.line >= 0 && frame.line < lines.length, 'line is in range');
	}
};

test('every counting-sort step maps to a valid pseudocode line', () => {
	const { steps } = getCountingSortStepsWithStats([3, 1, 2, 1]);
	assert.ok(steps.length > 0);
	steps.forEach(step =>
		assertConformant(stepToPseudoFrame('counting', step), COUNTING_PSEUDO)
	);
	// The counting phase should highlight the increment line.
	const counting = steps.find(s => s.metadata.phase === 'counting');
	assert.equal(stepToPseudoFrame('counting', counting).line, 3);
	// The reconstruction phase should highlight the write-back line.
	const recon = steps.find(s => s.metadata.phase === 'reconstructing');
	assert.equal(stepToPseudoFrame('counting', recon).line, 7);
});

test('counting frame exposes k and the active value/slot as live state', () => {
	const { steps } = getCountingSortStepsWithStats([4, 2, 4]);
	const counting = steps.find(s => s.metadata.phase === 'counting');
	const frame = stepToPseudoFrame('counting', counting);
	const byId = Object.fromEntries(frame.state.map(r => [r.id, r.value]));
	assert.equal(byId.x, counting.metadata.activeValue, 'reading x row matches');
	assert.equal(byId.slot, counting.metadata.activeSlot, 'count[x] slot matches');
	// At least one row is flagged active (the thing that just changed).
	assert.ok(frame.state.some(r => r.active));
});

test('every radix-sort step maps to a valid line and tracks pass + digit', () => {
	const { steps } = getRadixSortStepsWithStats([21, 12, 11, 22]);
	steps.forEach(step =>
		assertConformant(stepToPseudoFrame('radix', step), RADIX_PSEUDO)
	);
	const distributing = steps.find(s => s.metadata.phase === 'distributing');
	const frame = stepToPseudoFrame('radix', distributing);
	const byId = Object.fromEntries(frame.state.map(r => [r.id, r.value]));
	assert.equal(byId.digit, distributing.metadata.currentDigit, 'digit row matches');
	assert.match(String(byId.pass), /\/\s*\d/, 'pass shows current / total');
});

test('every bucket-sort step maps to a valid line and tracks bucket m', () => {
	const { steps } = getBucketSortStepsWithStats([5, 1, 9, 3, 7, 2]);
	steps.forEach(step =>
		assertConformant(stepToPseudoFrame('bucket', step), BUCKET_PSEUDO)
	);
	const distributing = steps.find(
		s => s.metadata.phase === 'distributing' && typeof s.metadata.targetBucket === 'number'
	);
	const frame = stepToPseudoFrame('bucket', distributing);
	const byId = Object.fromEntries(frame.state.map(r => [r.id, r.value]));
	assert.equal(byId.to, distributing.metadata.targetBucket, '→ bucket row matches');
});

test('PSEUDO_BY_ALGORITHM exposes the three listings', () => {
	assert.equal(PSEUDO_BY_ALGORITHM.counting, COUNTING_PSEUDO);
	assert.equal(PSEUDO_BY_ALGORITHM.radix, RADIX_PSEUDO);
	assert.equal(PSEUDO_BY_ALGORITHM.bucket, BUCKET_PSEUDO);
});

test('stepToPseudoFrame is pure and tolerates unknown algorithm / null step', () => {
	assert.deepEqual(stepToPseudoFrame('nope', {}), { line: null, state: [] });
	const frame = stepToPseudoFrame('counting', null);
	assert.ok(Array.isArray(frame.state));
});
