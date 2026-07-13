import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Completion is evidence, not interaction. TopicTemplate owns the one path that
// certifies a canonical lesson: enough scene checks have been answered correctly.
// A previous pattern let every host call markCompleted on the first playground
// click, silently bypassing that contract. Discover all JSX hosts that render the
// canonical template so new topics inherit this guardrail without updating a list.

const srcDir = fileURLToPath(new URL('../', import.meta.url));

const jsxFilesUnder = dir => {
	const files = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) files.push(...jsxFilesUnder(full));
		else if (entry.isFile() && entry.name.endsWith('.jsx')) files.push(full);
	}
	return files;
};

const lessonHosts = jsxFilesUnder(srcDir)
	.map(file => ({ file, source: readFileSync(file, 'utf8') }))
	.filter(({ source }) => /<TopicTemplate\b/.test(source));

test('canonical lesson hosts cannot bypass check-derived completion', () => {
	assert.ok(
		lessonHosts.length >= 16,
		`expected to audit the full lesson set, found ${lessonHosts.length}`
	);
	for (const { file, source } of lessonHosts) {
		assert.doesNotMatch(
			source,
			/\bmarkCompleted\s*\(/,
			`${path.relative(srcDir, file)} certifies completion outside TopicTemplate`
		);
	}
});
