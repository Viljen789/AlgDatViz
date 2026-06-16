import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Guardrail for per-distractor misconception copy. LessonCheck surfaces a "why
// that was wrong" line for a wrong choice by looking it up in the check's
// `misconceptions` map, keyed by the option's String() form. Two ways that
// silently breaks, both caught here:
//   - an ORPHAN key (matches no option) never renders — trivially introduced by
//     mistyping an option string, e.g. a hyphen where the option uses an en-dash;
//   - a MISSING distractor leaves a wrong answer with no teaching line, which the
//     learnability roadmap treats as incomplete coverage.
// The check data is the single source of truth (options + answer), so the map is
// verified against it rather than hand-maintained — same discipline as the
// derived, unit-tested exam keys.

// Topic scrolly checks live in src/components/<Topic>/scenes.js, except the Graph
// lesson which keeps them in GraphLesson/graphScenes.js. Discover dynamically so a
// new topic is covered automatically, with no hand-maintained list to drift.
const componentsDir = fileURLToPath(
	new URL('../../components/', import.meta.url)
);
const sceneModules = [];
for (const entry of readdirSync(componentsDir, { withFileTypes: true })) {
	if (!entry.isDirectory()) continue;
	for (const file of readdirSync(path.join(componentsDir, entry.name))) {
		if (file === 'scenes.js') {
			sceneModules.push([
				entry.name,
				path.join(componentsDir, entry.name, file),
			]);
		}
	}
}
sceneModules.push([
	'Graph',
	path.join(componentsDir, 'Graph', 'GraphLesson', 'graphScenes.js'),
]);

// Per-distractor feedback applies only to choice-style kinds: 'choice', 'predict'
// in choice-mode, and 'spotbug' claim-mode (options present, no code `lines`).
const isChoiceStyle = check =>
	check &&
	typeof check === 'object' &&
	((check.kind === 'choice' && Array.isArray(check.options)) ||
		(check.kind === 'predict' && Array.isArray(check.options)) ||
		(check.kind === 'spotbug' &&
			Array.isArray(check.options) &&
			!Array.isArray(check.lines)));

// Walk any exported value, collecting choice-style checks. Recurses into
// `problem` parts, since each part is itself a leaf check.
const collectChecks = (value, out, seen = new Set()) => {
	if (!value || typeof value !== 'object' || seen.has(value)) return;
	seen.add(value);
	if (typeof value.kind === 'string') {
		if (value.kind === 'problem' && Array.isArray(value.parts)) {
			for (const part of value.parts) collectChecks(part, out, seen);
		} else if (isChoiceStyle(value)) {
			out.push(value);
		}
	}
	for (const key of Object.keys(value)) {
		if (key === 'parts') continue;
		const child = value[key];
		if (Array.isArray(child))
			child.forEach(item => collectChecks(item, out, seen));
		else if (child && typeof child === 'object')
			collectChecks(child, out, seen);
	}
};

const choiceChecksFor = async modulePath => {
	const mod = await import(modulePath);
	const found = [];
	for (const value of Object.values(mod)) collectChecks(value, found);
	return [...new Set(found)];
};

for (const [topic, modulePath] of sceneModules) {
	test(`${topic}: misconceptions key every distractor and only real options`, async () => {
		const checks = await choiceChecksFor(modulePath);
		for (const check of checks) {
			const distractors = check.options
				.map(String)
				.filter(option => option !== String(check.answer));
			const keys = check.misconceptions
				? Object.keys(check.misconceptions)
				: [];
			const label = `${topic} check "${String(check.prompt ?? '').slice(0, 64)}"`;
			assert.deepEqual(
				keys.filter(key => !distractors.includes(key)),
				[],
				`${label} has misconception key(s) matching no option (they would never render)`
			);
			assert.deepEqual(
				distractors.filter(distractor => !keys.includes(distractor)),
				[],
				`${label} is missing a misconception line for a wrong option`
			);
		}
	});
}

// Guard against a discovery regression silently making the suite vacuous.
test('the coverage audit actually walked the topic checks', async () => {
	let count = 0;
	for (const [, modulePath] of sceneModules) {
		count += (await choiceChecksFor(modulePath)).length;
	}
	assert.ok(
		count >= 50,
		`expected to audit the full set of choice-style checks, found only ${count}`
	);
});
