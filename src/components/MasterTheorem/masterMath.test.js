import assert from 'node:assert/strict';
import test from 'node:test';
import {
	analyseRecurrence,
	buildLevels,
	buildRecursionFrames,
	recurrenceShape,
	RECURSION_PSEUDOCODE,
} from './masterMath.js';

// The three canonical recurrences the scrolly scenes pin, one per case.
const MERGE = { a: 2, b: 2, d: 1, k: 0 }; // c = d = 1  → Case 2, even
const LEAFY = { a: 8, b: 2, d: 1, k: 0 }; // c = 3 > 1  → Case 1, bottom-heavy
const ROOTY = { a: 2, b: 2, d: 2, k: 0 }; // c = 1 < 2  → Case 3, top-heavy

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

// ── recurrenceShape: the silhouette must agree with the verdict ──

test('recurrenceShape — profile names the case the same analysis decides', () => {
	assert.equal(recurrenceShape(MERGE).profile, 'even');
	assert.equal(recurrenceShape(LEAFY).profile, 'bottom-heavy');
	assert.equal(recurrenceShape(ROOTY).profile, 'top-heavy');
	// caseId mirrors analyseRecurrence, so picture and prose share one source.
	assert.equal(recurrenceShape(MERGE).caseId, analyseRecurrence(MERGE).caseId);
	assert.equal(recurrenceShape(LEAFY).caseId, analyseRecurrence(LEAFY).caseId);
	assert.equal(recurrenceShape(ROOTY).caseId, analyseRecurrence(ROOTY).caseId);
});

test('recurrenceShape — the widest work bar IS the dominant level', () => {
	// Honesty contract: the level the helper marks dominant must be the level
	// whose relative work is actually the maximum, so the colour can never lie.
	for (const params of [MERGE, LEAFY, ROOTY]) {
		const shape = recurrenceShape(params);
		const works = shape.levels.map(l => l.relativeWork);
		const maxWork = Math.max(...works);
		const analysis = analyseRecurrence(params);

		if (analysis.dominant === 'leaves') {
			// Bottom-heavy: last level carries (strictly) the most work.
			assert.equal(shape.dominantLevel, shape.workDepth);
			assert.equal(shape.levels.at(-1).relativeWork, maxWork);
			assert.ok(
				shape.levels.at(-1).relativeWork > shape.levels[0].relativeWork
			);
		} else if (analysis.dominant === 'root') {
			// Top-heavy: the root carries (strictly) the most work.
			assert.equal(shape.dominantLevel, 0);
			assert.equal(shape.levels[0].relativeWork, maxWork);
			assert.ok(
				shape.levels[0].relativeWork > shape.levels.at(-1).relativeWork
			);
		} else {
			// Even: no single level dominates and every level ties.
			assert.equal(shape.dominantLevel, null);
			for (const work of works) {
				assert.ok(Math.abs(work - maxWork) < 1e-9, 'every level ties');
			}
		}
	}
});

test('recurrenceShape — work-bar widths slope the right way per case', () => {
	const shapeOf = params => recurrenceShape(params).levels;
	// Even: every level ties, so all bars share the busiest width (100).
	const even = shapeOf(MERGE);
	assert.ok(even.every(l => Math.abs(l.width - 100) < 1e-9));

	// Bottom-heavy: relative work grows strictly down the tree, and the widest
	// bar (the busiest level, normalised to 100) is the bottom row. Display
	// widths are only non-decreasing because a tiny-work floor keeps faint bars
	// visible, so the strict-monotonicity claim is made on the true work.
	const leafy = shapeOf(LEAFY);
	for (let i = 1; i < leafy.length; i += 1) {
		assert.ok(leafy[i].relativeWork > leafy[i - 1].relativeWork);
		assert.ok(leafy[i].width >= leafy[i - 1].width);
	}
	assert.equal(leafy.at(-1).width, 100);

	// Top-heavy: relative work shrinks strictly down the tree; the root bar is
	// the widest (100), later bars only non-increasing for the same floor reason.
	const rooty = shapeOf(ROOTY);
	for (let i = 1; i < rooty.length; i += 1) {
		assert.ok(rooty[i].relativeWork < rooty[i - 1].relativeWork);
		assert.ok(rooty[i].width <= rooty[i - 1].width);
	}
	assert.equal(rooty[0].width, 100);
});

test('recurrenceShape — dot-tree depth stays legible as branching a grows', () => {
	// a = 8 must not try to draw 8^3 = 512 leaves; the cap keeps the bottom row
	// under maxLeafNodes while a = 2 still gets the full tree depth.
	assert.equal(recurrenceShape(MERGE).treeDepth, 3); // 2^3 = 8 leaves, fine
	assert.equal(recurrenceShape(LEAFY).treeDepth, 1); // 8^1 = 8 leaves, fine
	assert.ok(recurrenceShape(LEAFY).treeDepth >= 1);
	// Binary search (a = 1) never branches, so it keeps the full depth.
	assert.equal(recurrenceShape({ a: 1, b: 2, d: 0, k: 0 }).treeDepth, 3);
});
