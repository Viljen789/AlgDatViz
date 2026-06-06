import assert from 'node:assert/strict';
import test from 'node:test';
import {
	analyseRecurrence,
	buildLevels,
	buildRecursionFrames,
	RECURSION_PSEUDOCODE,
} from './masterMath.js';

// ── analyseRecurrence: the three cases via c = log_b(a) vs d ──

test('analyseRecurrence — merge sort (a=2,b=2,d=1) is the Case-2 tie', () => {
	const r = analyseRecurrence({ a: 2, b: 2, d: 1, k: 0 });
	assert.equal(r.caseId, 2);
	assert.equal(r.dominant, 'levels');
	assert.equal(r.result, 'Θ(n log n)');
});

test('analyseRecurrence — leaves win when c > d (a=8,b=2,d=1)', () => {
	const r = analyseRecurrence({ a: 8, b: 2, d: 1, k: 0 });
	assert.equal(r.caseId, 1);
	assert.equal(r.dominant, 'leaves');
	assert.equal(r.critical, 3); // log_2(8) = 3
	assert.equal(r.result, 'Θ(n^3)');
});

test('analyseRecurrence — root wins when c < d (a=2,b=2,d=2)', () => {
	const r = analyseRecurrence({ a: 2, b: 2, d: 2, k: 0 });
	assert.equal(r.caseId, 3);
	assert.equal(r.dominant, 'root');
	assert.equal(r.result, 'Θ(n^2)');
});

// ── buildRecursionFrames: conformance to THE FRAME CONTRACT ──

const assertConformant = (frame, lineCount) => {
	assert.equal(typeof frame.line, 'number');
	assert.ok(frame.line >= 0 && frame.line < lineCount, 'line in range');
	assert.ok(Array.isArray(frame.state), 'state is an array');
	for (const row of frame.state) {
		assert.equal(typeof row.label, 'string', 'row has a label');
		assert.ok('value' in row, 'row has a value');
	}
	assert.ok(Array.isArray(frame.highlight), 'highlight is an array');
};

test('buildRecursionFrames — every frame conforms to the contract', () => {
	const frames = buildRecursionFrames({ a: 2, b: 2, d: 1, k: 0 }, 4);
	assert.ok(frames.length > 0);
	for (const frame of frames) {
		assertConformant(frame, RECURSION_PSEUDOCODE.length);
	}
});

test('buildRecursionFrames — one frame per level plus a verdict frame', () => {
	const depth = 4;
	const frames = buildRecursionFrames({ a: 2, b: 2, d: 1, k: 0 }, depth);
	// depth + 1 levels (0..depth) plus the closing comparison frame.
	assert.equal(frames.length, depth + 2);
});

test('buildRecursionFrames — level frames report a^i nodes and n/b^i size', () => {
	const frames = buildRecursionFrames({ a: 2, b: 2, d: 1, k: 0 }, 4);
	const level = buildLevels({ a: 2, b: 2, d: 1 }, 4);
	// Level 2: a^2 = 4 nodes, size n/4.
	const f2 = frames[2];
	const nodes = f2.state.find(r => r.id === 'nodes');
	const size = f2.state.find(r => r.id === 'size');
	assert.equal(nodes.value, '4');
	assert.equal(size.value, level[2].subproblem);
	assert.deepEqual(f2.highlight, [2]);
});

test('buildRecursionFrames — verdict frame carries the case + Θ result', () => {
	const frames = buildRecursionFrames({ a: 8, b: 2, d: 1, k: 0 }, 4);
	const verdict = frames.at(-1);
	const result = verdict.state.find(r => r.id === 'result');
	const compare = verdict.state.find(r => r.id === 'compare');
	const caseRow = verdict.state.find(r => r.id === 'case');
	assert.equal(result.value, 'Θ(n^3)');
	assert.equal(compare.value, 'c > d'); // c=3 > d=1
	assert.equal(caseRow.value, 'Case 1');
});

test('buildRecursionFrames — verdict comparison sign tracks the case', () => {
	const tie = buildRecursionFrames({ a: 2, b: 2, d: 1, k: 0 }, 3).at(-1);
	const root = buildRecursionFrames({ a: 2, b: 2, d: 2, k: 0 }, 3).at(-1);
	assert.equal(tie.state.find(r => r.id === 'compare').value, 'c = d');
	assert.equal(root.state.find(r => r.id === 'compare').value, 'c < d');
});
