import assert from 'node:assert/strict';
import test from 'node:test';
import {
	buildBst,
	containsValue,
	deleteValue,
	getSearchSteps,
	getTraversalSteps,
	inorderValues,
	insertValue,
} from './treeUtils.js';

// A small, stable BST reused across the tests:
//          42
//        /    \
//      23      61
//     /  \    /  \
//   12   31  54  72
const VALUES = [42, 23, 61, 12, 31, 54, 72];
const tree = () => buildBst(VALUES);

// Validate that a frame conforms to THE FRAME CONTRACT (PseudoState.jsx):
//   line: a number index; state: ordered {label, value} rows.
const assertFrame = (frame, lineCount) => {
	assert.equal(typeof frame.line, 'number', 'frame has a numeric line');
	assert.ok(
		frame.line >= 0 && frame.line < lineCount,
		`line ${frame.line} in range 0..${lineCount - 1}`
	);
	assert.ok(Array.isArray(frame.state), 'state is an array');
	for (const row of frame.state) {
		assert.equal(typeof row.label, 'string', 'row has a string label');
		assert.ok('value' in row, 'row has a value');
	}
};

// ── buildBst / insert / contains / delete keep the invariant ──

test('buildBst + containsValue store every inserted value', () => {
	const root = tree();
	for (const v of VALUES) assert.ok(containsValue(root, v), `contains ${v}`);
	assert.equal(containsValue(root, 999), false, 'absent value not found');
});

test('insertValue is immutable and keeps duplicates out', () => {
	const root = tree();
	const next = insertValue(root, 29);
	assert.equal(containsValue(root, 29), false, 'original tree untouched');
	assert.ok(containsValue(next, 29), 'new tree has the value');
	// A duplicate insert leaves the value set unchanged (inorder is identical).
	assert.deepEqual(
		inorderValues(insertValue(next, 29)),
		inorderValues(next),
		'duplicate insert does not add a value'
	);
	// Inserting at the root (existing) returns the same reference (early no-op).
	assert.equal(insertValue(root, 42), root, 'root-level duplicate is a no-op');
});

test('deleteValue removes a node and preserves sorted order', () => {
	const root = deleteValue(tree(), 23);
	assert.equal(containsValue(root, 23), false, '23 is gone');
	const seq = inorderValues(root);
	assert.deepEqual(seq, [...seq].sort((a, b) => a - b), 'still sorted');
});

// ── inorderValues is the sorted sequence (drives the `order` retrieval check) ──

test('inorderValues returns the values in sorted order', () => {
	assert.deepEqual(inorderValues(tree()), [12, 23, 31, 42, 54, 61, 72]);
	assert.deepEqual(inorderValues(buildBst([50, 30, 70, 40, 60])), [
		30, 40, 50, 60, 70,
	]);
	assert.deepEqual(inorderValues(null), []);
});

// ── getSearchSteps — conformant frames + correct path/found state ──

const SEARCH_LINES = 6; // TREE_PSEUDO.search has 6 lines.

test('getSearchSteps frames conform and end on the found node', () => {
	const steps = getSearchSteps(tree(), 54);
	assert.ok(steps.length > 0);
	for (const s of steps) assertFrame(s, SEARCH_LINES);
	const last = steps.at(-1);
	assert.equal(last.line, 1, 'found frame highlights the "if equal" line');
	assert.deepEqual(last.activeNodes, ['54'], 'lands on 54');
	const path = last.state.find(r => r.id === 'path');
	assert.equal(path.value, '42 → 61 → 54', 'path is the real descent');
});

test('getSearchSteps reports the comparison direction in state', () => {
	const steps = getSearchSteps(tree(), 54);
	const compare = steps[0].state.find(r => r.id === 'compare');
	assert.equal(compare.value, '54 > 42 → right', 'first compare goes right');
	assert.equal(steps[0].line, 4, 'going right highlights the right-branch line');
});

test('getSearchSteps ends on a "fell off the tree" frame when absent', () => {
	const steps = getSearchSteps(tree(), 99);
	const last = steps.at(-1);
	assert.equal(last.line, 0);
	assert.deepEqual(last.activeNodes, [], 'no node is active when absent');
	const compare = last.state.find(r => r.id === 'compare');
	assert.equal(compare.value, 'fell off the tree');
});

// ── getTraversalSteps — conformant frames + sorted inorder output ──

const TRAVERSAL_LINES = 5; // each traversal pseudocode block has 5 lines.

test('getTraversalSteps inorder visits every node in sorted order', () => {
	const steps = getTraversalSteps(tree(), 'inorder');
	assert.equal(steps.length, VALUES.length, 'one frame per node');
	for (const s of steps) assertFrame(s, TRAVERSAL_LINES);
	const final = steps.at(-1).state.find(r => r.id === 'output');
	assert.equal(final.value, '12 23 31 42 54 61 72', 'output is sorted');
});

test('getTraversalSteps preorder visits the root first', () => {
	const steps = getTraversalSteps(tree(), 'preorder');
	assert.equal(steps[0].state.find(r => r.id === 'visit').value, 42);
	assert.equal(steps[0].line, 2, 'preorder visit() is line index 2');
});

test('getTraversalSteps handles an empty tree', () => {
	const steps = getTraversalSteps(null, 'inorder');
	assert.equal(steps.length, 1);
	assert.equal(steps[0].line, 0);
});
