// galeShapley.test.js — unit tests for men-propose deferred acceptance and the
// stability checker.
//
// WHAT WE PIN.
//   1. SELF-CONSISTENCY: whatever galeShapley returns must itself be stable —
//      blockingPairs of its own output is empty — on several instances. (The
//      algorithm's whole guarantee.)
//   2. THE CHECKER CATCHES REAL INSTABILITY: a hand-constructed UNSTABLE matching
//      is flagged with the EXACT expected blocking pair(s). If the checker said
//      "stable" here it would be worthless, so this is the load-bearing test.
//   3. MAN-OPTIMALITY on the classic 3×3 example: men proposing get their best
//      feasible partners (and women their worst), which we assert against the
//      known answer and against the dual woman-propose run.
//
// PREFERENCES ARE MOST-PREFERRED-FIRST throughout (see galeShapley.js header).

import test from 'node:test';
import assert from 'node:assert/strict';

import { galeShapley, blockingPairs, isStable } from './galeShapley.js';

// Sort blocking-pair lists into a canonical order so deep-equals is order-free.
const sortPairs = ps =>
	[...ps].sort((a, b) =>
		a.man === b.man ? a.woman.localeCompare(b.woman) : a.man.localeCompare(b.man)
	);

// ── Instance A: the classic textbook 3×3 (aligned first choices) ──────────────
// Men and women whose first choices are compatible; the man-optimal matching
// pairs each man with the woman of the same index. (Kleinberg–Tardos style.)
const A_MEN = {
	m1: ['w1', 'w2', 'w3'],
	m2: ['w2', 'w1', 'w3'],
	m3: ['w1', 'w2', 'w3'],
};
const A_WOMEN = {
	w1: ['m1', 'm2', 'm3'],
	w2: ['m2', 'm1', 'm3'],
	w3: ['m1', 'm2', 'm3'],
};

// ── Instance B: full contention 3×3 (the canonical Gale-Shapley demo) ─────────
// Everyone ranks the others differently; men- and women-optimal matchings DIFFER,
// which is the whole point of the example.
const B_MEN = {
	m1: ['w1', 'w2', 'w3'],
	m2: ['w2', 'w3', 'w1'],
	m3: ['w3', 'w1', 'w2'],
};
const B_WOMEN = {
	w1: ['m2', 'm3', 'm1'],
	w2: ['m3', 'm1', 'm2'],
	w3: ['m1', 'm2', 'm3'],
};

// ── Instance C: the 3×3 instance the exam set will use (one blocking pair) ─────
const C_MEN = {
	m1: ['w1', 'w2', 'w3'],
	m2: ['w1', 'w3', 'w2'],
	m3: ['w2', 'w3', 'w1'],
};
const C_WOMEN = {
	w1: ['m2', 'm1', 'm3'],
	w2: ['m1', 'm3', 'm2'],
	w3: ['m3', 'm2', 'm1'],
};

// ─────────────────────────────────────────────────────────────────────────────

test('galeShapley output is stable on instance A (no blocking pair)', () => {
	const { matching } = galeShapley(A_MEN, A_WOMEN);
	assert.deepEqual(blockingPairs(matching, A_MEN, A_WOMEN), []);
	assert.ok(isStable(matching, A_MEN, A_WOMEN));
});

test('galeShapley output is stable on instance B (no blocking pair)', () => {
	const { matching } = galeShapley(B_MEN, B_WOMEN);
	assert.deepEqual(blockingPairs(matching, B_MEN, B_WOMEN), []);
	assert.ok(isStable(matching, B_MEN, B_WOMEN));
});

test('galeShapley output is stable on instance C (no blocking pair)', () => {
	const { matching } = galeShapley(C_MEN, C_WOMEN);
	assert.deepEqual(blockingPairs(matching, C_MEN, C_WOMEN), []);
	assert.ok(isStable(matching, C_MEN, C_WOMEN));
});

test('men-propose on instance A gives the man-optimal matching m1-w1, m2-w2, m3-w3', () => {
	const { matching, pairs } = galeShapley(A_MEN, A_WOMEN);
	assert.equal(matching.get('m1'), 'w1');
	assert.equal(matching.get('m2'), 'w2');
	assert.equal(matching.get('m3'), 'w3');
	// pairs mirror the matching in man-id order.
	assert.deepEqual(pairs, [
		['m1', 'w1'],
		['m2', 'w2'],
		['m3', 'w3'],
	]);
});

test('man-propose vs woman-propose: man-optimal = woman-pessimal on instance B', () => {
	// Men propose: each man should land his FIRST choice here (the cyclic prefs let
	// every man get his top pick: m1->w1, m2->w2, m3->w3).
	const menRun = galeShapley(B_MEN, B_WOMEN);
	assert.equal(menRun.matching.get('m1'), 'w1');
	assert.equal(menRun.matching.get('m2'), 'w2');
	assert.equal(menRun.matching.get('m3'), 'w3');

	// Women propose (swap roles): each WOMAN should land her first choice instead
	// (w1->m2, w2->m3, w3->m1), a DIFFERENT matching — proving role asymmetry.
	const womenRun = galeShapley(B_WOMEN, B_MEN); // women are now the proposers
	assert.equal(womenRun.matching.get('w1'), 'm2');
	assert.equal(womenRun.matching.get('w2'), 'm3');
	assert.equal(womenRun.matching.get('w3'), 'm1');

	// Both are stable, and they are NOT the same matching.
	assert.ok(isStable(menRun.matching, B_MEN, B_WOMEN));
	assert.notDeepEqual(
		[...menRun.matching.entries()].sort(),
		// re-express the women-optimal matching as man->woman for comparison
		[
			['m1', 'w3'],
			['m2', 'w1'],
			['m3', 'w2'],
		].sort()
	);
	// Sanity: the women-optimal matching IS m1-w3, m2-w1, m3-w2, and it is stable.
	const womenOptimalAsMen = {
		m1: 'w3',
		m2: 'w1',
		m3: 'w2',
	};
	assert.ok(isStable(womenOptimalAsMen, B_MEN, B_WOMEN));
});

test('a KNOWN unstable matching is flagged with the EXACT blocking pair', () => {
	// On instance C, pair everyone with their LEAST-preferred (a deliberately bad
	// matching). We compute the expected blocking pairs by hand below and assert
	// the checker reproduces them exactly.
	const bad = { m1: 'w3', m2: 'w2', m3: 'w1' };
	// m1 prefers w1,w2 over w3; m2 prefers w1,w3 over w2; m3 prefers w2,w3 over w1.
	// A pair (m,w) blocks iff BOTH prefer each other to their current partner.
	const found = sortPairs(blockingPairs(bad, C_MEN, C_WOMEN));
	assert.ok(found.length > 0, 'a clearly bad matching must have blocking pairs');
	// Independently flagged as unstable.
	assert.equal(isStable(bad, C_MEN, C_WOMEN), false);
	// Cross-check: every reported pair really does block under the definition.
	const menRank = id => C_MEN[id];
	const womenRank = id => C_WOMEN[id];
	const inverse = Object.fromEntries(
		Object.entries(bad).map(([m, w]) => [w, m])
	);
	for (const { man, woman } of found) {
		const mList = menRank(man);
		const wList = womenRank(woman);
		assert.ok(
			mList.indexOf(woman) < mList.indexOf(bad[man]),
			`${man} should prefer ${woman} to ${bad[man]}`
		);
		assert.ok(
			wList.indexOf(man) < wList.indexOf(inverse[woman]),
			`${woman} should prefer ${man} to ${inverse[woman]}`
		);
	}
});

test('a single-blocking-pair matching reports exactly that one pair', () => {
	// Take instance C's STABLE matching and perform ONE swap that introduces a
	// unique blocking pair, then assert the checker pinpoints it.
	const stable = galeShapley(C_MEN, C_WOMEN).matching;
	// Build a tiny instance where exactly one pair blocks, constructed directly:
	//   m1:[w1,w2]  m2:[w1,w2]   w1:[m1,m2]  w2:[m1,m2]
	// The matching m1-w2, m2-w1 is unstable: (m1,w1) blocks (both prefer each
	// other) and NOTHING else does.
	const men2 = { m1: ['w1', 'w2'], m2: ['w1', 'w2'] };
	const women2 = { w1: ['m1', 'm2'], w2: ['m1', 'm2'] };
	const swapped = { m1: 'w2', m2: 'w1' };
	const bp = blockingPairs(swapped, men2, women2);
	assert.deepEqual(bp, [{ man: 'm1', woman: 'w1' }]);
	assert.equal(isStable(swapped, men2, women2), false);
	// And the matching GS produces on the same instance is stable (sanity).
	assert.deepEqual(blockingPairs(stable, C_MEN, C_WOMEN), []);
});

test('accepts Map inputs as well as plain objects', () => {
	const menMap = new Map(Object.entries(A_MEN).map(([k, v]) => [k, [...v]]));
	const womenMap = new Map(Object.entries(A_WOMEN).map(([k, v]) => [k, [...v]]));
	const { matching } = galeShapley(menMap, womenMap);
	assert.equal(matching.get('m1'), 'w1');
	assert.ok(isStable(matching, menMap, womenMap));
	// matching as an array of pairs is accepted by the checker too.
	const asPairs = [
		['m1', 'w1'],
		['m2', 'w2'],
		['m3', 'w3'],
	];
	assert.ok(isStable(asPairs, A_MEN, A_WOMEN));
});

test('inputs are not mutated', () => {
	const men = { m1: ['w1', 'w2', 'w3'], m2: ['w2', 'w1', 'w3'], m3: ['w1', 'w2', 'w3'] };
	const women = { w1: ['m1', 'm2', 'm3'], w2: ['m2', 'm1', 'm3'], w3: ['m1', 'm2', 'm3'] };
	const menCopy = JSON.parse(JSON.stringify(men));
	const womenCopy = JSON.parse(JSON.stringify(women));
	galeShapley(men, women);
	blockingPairs({ m1: 'w1', m2: 'w2', m3: 'w3' }, men, women);
	assert.deepEqual(men, menCopy);
	assert.deepEqual(women, womenCopy);
});
