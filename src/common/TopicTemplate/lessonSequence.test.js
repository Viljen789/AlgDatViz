import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLessonSequence } from './lessonSequence.js';

test('builds the full code-tracing lesson route by default', () => {
	const steps = buildLessonSequence({
		topicId: 'sorting',
		sceneCount: 5,
		hasPlayground: true,
	});

	assert.deepEqual(
		steps.map(step => step.label),
		['Objective', 'Visualize', 'Trace code', 'Checkpoint', 'Exam']
	);
	assert.equal(steps[1].detail, '5 guided scenes');
	assert.equal(steps[2].href, '#topic-playground');
	assert.equal(steps[4].to, '/exam?topic=sorting');
});

test('uses honest experiment wording for model-led lessons', () => {
	const steps = buildLessonSequence({
		topicId: 'foundations',
		sceneCount: 1,
		hasPlayground: true,
		traceMode: 'model',
	});

	assert.equal(steps[1].detail, '1 guided scene');
	assert.equal(steps[2].label, 'Experiment');
	assert.equal(steps[2].detail, 'Change inputs and compare outcomes');
});

test('omits the trace beat when a future lesson has no playground', () => {
	const steps = buildLessonSequence({
		topicId: 'preview',
		sceneCount: 0,
		hasPlayground: false,
	});

	assert.deepEqual(
		steps.map(step => step.id),
		['objective', 'visualize', 'checkpoint', 'exam']
	);
	assert.equal(steps[1].detail, 'Build the mental model');
});
