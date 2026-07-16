import test from 'node:test';
import assert from 'node:assert/strict';
import { enabledBoundary, enabledTabIndexes } from './tabNavigation.js';

test('tab boundaries skip disabled tabs', () => {
	const tabs = [
		{ disabled: true },
		{},
		{ disabled: true },
		{},
		{ disabled: true },
	];
	assert.deepEqual(enabledTabIndexes(tabs), [1, 3]);
	assert.equal(enabledBoundary(tabs, 'home'), 1);
	assert.equal(enabledBoundary(tabs, 'end'), 3);
});

test('tab boundaries retain the current fallback when every tab is disabled', () => {
	const tabs = [{ disabled: true }, { disabled: true }];
	assert.equal(enabledBoundary(tabs, 'home', 1), 1);
	assert.equal(enabledBoundary(tabs, 'end', 1), 1);
});
