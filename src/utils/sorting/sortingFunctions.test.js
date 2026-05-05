import assert from 'node:assert/strict';
import test from 'node:test';
import { SORTING_FUNCTIONS } from './sortingFunctions.js';

const CASES = [
	{ name: 'empty input', input: [] },
	{ name: 'single item', input: [7] },
	{ name: 'reversed input', input: [9, 7, 5, 3, 1] },
	{ name: 'duplicates', input: [4, 2, 4, 1, 2, 0] },
	{ name: 'already sorted', input: [0, 1, 2, 3, 4] },
];

const finalArrayFor = result => {
	const finalStep = result.steps.at(-1);
	return finalStep?.array || [];
};

const sortedCopy = input => [...input].sort((a, b) => a - b);

for (const [algorithm, sortFunction] of Object.entries(SORTING_FUNCTIONS)) {
	test(`${algorithm} sorts core cases`, () => {
		for (const { name, input } of CASES) {
			const original = [...input];
			const result = sortFunction(input);
			assert.ok(result, `${name}: returns a result`);
			assert.deepEqual(finalArrayFor(result), sortedCopy(input), name);
			assert.deepEqual(input, original, `${name}: leaves caller input intact`);
		}
	});

	test(`${algorithm} emits normalized stats`, () => {
		const result = sortFunction([5, 1, 3, 1]);
		const finalStats = result.finalStats;
		assert.equal(typeof finalStats.comparisons, 'number');
		assert.equal(typeof finalStats.writes, 'number');
		assert.equal(typeof finalStats.swaps, 'number');
		assert.equal(typeof finalStats.auxiliaryWrites, 'number');
		assert.equal(typeof finalStats.totalOperations, 'number');
	});
}

test('counting sort exposes k and count-table metadata', () => {
	const result = SORTING_FUNCTIONS.countingSort([0, 4, 4, 2]);
	const countingStep = result.steps.find(
		step =>
			step.metadata?.phase === 'counting' && step.metadata.activeSlot === 4
	);

	assert.ok(countingStep);
	assert.equal(countingStep.metadata.k, 5);
	assert.ok(Array.isArray(countingStep.metadata.countArray));
	assert.equal(typeof countingStep.metadata.density, 'number');
});

test('bucket sort exposes distribution-quality metadata', () => {
	const result = SORTING_FUNCTIONS.bucketSort([1, 2, 3, 34, 35, 36]);
	const distributionStep = result.steps.find(
		step => step.metadata?.phase === 'distributing' && step.metadata.buckets
	);

	assert.ok(distributionStep);
	assert.ok(Array.isArray(distributionStep.metadata.bucketRanges));
	assert.ok(Array.isArray(distributionStep.metadata.bucketLoads));
	assert.equal(typeof distributionStep.metadata.skewRatio, 'number');
	assert.match(
		distributionStep.metadata.distributionQuality,
		/balanced|uneven|overloaded/
	);
});

test('radix sort exposes digit-place metadata', () => {
	const result = SORTING_FUNCTIONS.radixSort([
		329, 457, 657, 839, 436, 720, 355,
	]);
	const digitStep = result.steps.find(
		step => step.metadata?.phase === 'distributing'
	);

	assert.ok(digitStep);
	assert.equal(digitStep.metadata.placeLabel, 'ones');
	assert.equal(typeof digitStep.metadata.currentDigit, 'number');
	assert.ok(Array.isArray(digitStep.metadata.buckets));
});

test('heap sort exposes heap tree metadata', () => {
	const result = SORTING_FUNCTIONS.heapSort([4, 10, 3, 5, 1]);
	const heapStep = result.steps.find(
		step => step.metadata?.phase === 'heapifying'
	);

	assert.ok(heapStep);
	assert.ok(Array.isArray(heapStep.metadata.heapArray));
	assert.equal(typeof heapStep.metadata.heapSize, 'number');
	assert.equal(typeof heapStep.metadata.parentIndex, 'number');
});

test('merge sort exposes recursion and merge-cursor metadata', () => {
	const result = SORTING_FUNCTIONS.mergeSort([5, 2, 4, 1]);
	const divideStep = result.steps.find(
		step => step.metadata?.phase === 'dividing'
	);
	const mergeStep = result.steps.find(
		step =>
			step.metadata?.phase === 'merging' &&
			step.metadata.outputIndex !== undefined
	);

	assert.ok(divideStep);
	assert.ok(Array.isArray(divideStep.metadata.left));
	assert.ok(Array.isArray(divideStep.metadata.right));
	assert.ok(mergeStep);
	assert.equal(typeof mergeStep.metadata.outputIndex, 'number');
	assert.ok(Array.isArray(mergeStep.metadata.outputSnapshot));
	assert.ok(Array.isArray(mergeStep.metadata.completedRanges));
});
