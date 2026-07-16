import test from 'node:test';
import assert from 'node:assert/strict';
import {
	decodePlaygroundState,
	encodePlaygroundState,
	nextTeachingSearch,
	teachingStateUrl,
} from './teachingState.js';

test('teaching state preserves page-specific parameters', () => {
	const next = nextTeachingSearch('seed=42&topic=graphs', {
		sceneId: 'relaxation',
		present: true,
	});
	assert.equal(next.get('v'), '2');
	assert.equal(next.get('seed'), '42');
	assert.equal(next.get('topic'), 'graphs');
	assert.equal(next.get('scene'), 'relaxation');
	assert.equal(next.get('present'), '1');
});

test('playground state round-trips unicode and nested controls', () => {
	const state = {
		controls: { preset: 'norsk-øvelse', values: [8, 3, 5] },
		playback: { currentStep: 4, speed: 100 },
	};
	assert.deepEqual(decodePlaygroundState(encodePlaygroundState(state)), state);
});

test('invalid or oversized playground state fails closed', () => {
	assert.equal(decodePlaygroundState('not-valid-base64'), null);
	assert.equal(decodePlaygroundState('x'.repeat(20_000)), null);
});

test('shared URLs keep the teaching beat but leave presenter chrome to the recipient', () => {
	const url = new URL(
		teachingStateUrl(
			'https://example.test/graph?seed=42&present=1',
			'seed=42&present=1',
			{
				sceneId: 'bfs',
				playgroundState: { controls: { source: 'A' } },
			}
		)
	);
	assert.equal(url.pathname, '/graph');
	assert.equal(url.searchParams.get('seed'), '42');
	assert.equal(url.searchParams.get('scene'), 'bfs');
	assert.equal(url.searchParams.has('present'), false);
	assert.deepEqual(decodePlaygroundState(url.searchParams.get('state')), {
		controls: { source: 'A' },
	});
});
