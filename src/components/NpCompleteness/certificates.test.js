import assert from 'node:assert/strict';
import test from 'node:test';
import {
	literalSatisfied,
	clauseSatisfied,
	verify3SAT,
	verifyVertexCover,
	verifyIndependentSet,
	verifyClique,
	reduce3SatToIndependentSet,
	satisfyingAssignmentToIndependentSet,
} from './certificates.js';

// ── shared fixtures ──────────────────────────────────────────────────────────

// (x1 ∨ ¬x2 ∨ x3) ∧ (¬x1 ∨ x2 ∨ x3) — small satisfiable 3-SAT formula.
const lit = (v, negated = false) => ({ var: v, negated });
const FORMULA = {
	vars: ['x1', 'x2', 'x3'],
	clauses: [
		[lit('x1'), lit('x2', true), lit('x3')],
		[lit('x1', true), lit('x2'), lit('x3')],
	],
};

// A 4-cycle a-b-c-d-a. VC of size 2 = {a,c}; max independent set size 2 = {a,c}.
const SQUARE = {
	nodes: ['a', 'b', 'c', 'd'],
	edges: [
		['a', 'b'],
		['b', 'c'],
		['c', 'd'],
		['d', 'a'],
	],
};

// A triangle plus a pendant: a-b, b-c, c-a (triangle), c-d (pendant).
const TRIANGLE = {
	nodes: ['a', 'b', 'c', 'd'],
	edges: [
		['a', 'b'],
		['b', 'c'],
		['c', 'a'],
		['c', 'd'],
	],
};

// ── literal / clause primitives ──────────────────────────────────────────────

test('literalSatisfied — sign matches value', () => {
	assert.equal(literalSatisfied(lit('x'), { x: true }), true);
	assert.equal(literalSatisfied(lit('x'), { x: false }), false);
	assert.equal(literalSatisfied(lit('x', true), { x: false }), true);
	assert.equal(literalSatisfied(lit('x', true), { x: true }), false);
});

test('literalSatisfied — unassigned variable is not satisfied', () => {
	assert.equal(literalSatisfied(lit('x'), {}), false);
	assert.equal(literalSatisfied(lit('x', true), {}), false);
});

test('clauseSatisfied — true when any literal holds', () => {
	const clause = [lit('a'), lit('b', true)];
	assert.equal(clauseSatisfied(clause, { a: false, b: false }), true); // ¬b
	assert.equal(clauseSatisfied(clause, { a: true, b: true }), true); // a
	assert.equal(clauseSatisfied(clause, { a: false, b: true }), false); // neither
});

// ── verify3SAT ───────────────────────────────────────────────────────────────

test('verify3SAT — accepts a genuine satisfying assignment', () => {
	const r = verify3SAT(FORMULA, { x1: true, x2: true, x3: false });
	assert.equal(r.ok, true);
	assert.equal(r.satisfiedClauses, 2);
	assert.equal(r.totalClauses, 2);
	assert.equal(r.failingClause, -1);
	assert.deepEqual(r.perClause, [true, true]);
});

test('verify3SAT — rejects an assignment that misses a clause', () => {
	// x1=false, x2=false, x3=false: clause 1 (x1 ∨ ¬x2 ∨ x3) -> ¬x2 true -> ok;
	// pick something that fails clause 0 instead.
	const r = verify3SAT(FORMULA, { x1: false, x2: true, x3: false });
	// clause0: x1=F, ¬x2=F, x3=F -> false; clause1: ¬x1=T -> true
	assert.equal(r.ok, false);
	assert.equal(r.failingClause, 0);
	assert.equal(r.perClause[0], false);
	assert.equal(r.perClause[1], true);
});

test('verify3SAT — empty formula is not a YES instance', () => {
	const r = verify3SAT({ vars: [], clauses: [] }, {});
	assert.equal(r.ok, false);
	assert.equal(r.totalClauses, 0);
});

// ── verifyVertexCover ────────────────────────────────────────────────────────

test('verifyVertexCover — {a,c} covers the 4-cycle within k=2', () => {
	const r = verifyVertexCover(SQUARE, ['a', 'c'], 2);
	assert.equal(r.ok, true);
	assert.equal(r.coversAll, true);
	assert.equal(r.withinK, true);
	assert.equal(r.size, 2);
	assert.equal(r.uncoveredEdge, null);
});

test('verifyVertexCover — rejects a set that leaves an edge uncovered', () => {
	// {a,b}: edge c-d has neither endpoint -> uncovered.
	const r = verifyVertexCover(SQUARE, ['a', 'b'], 2);
	assert.equal(r.ok, false);
	assert.equal(r.coversAll, false);
	assert.deepEqual(r.uncoveredEdge, ['c', 'd']);
});

test('verifyVertexCover — rejects a valid cover that exceeds k', () => {
	const r = verifyVertexCover(SQUARE, ['a', 'b', 'c'], 2);
	assert.equal(r.coversAll, true); // it does cover everything
	assert.equal(r.withinK, false); // but 3 > k=2
	assert.equal(r.ok, false);
});

// ── verifyIndependentSet ─────────────────────────────────────────────────────

test('verifyIndependentSet — {a,c} is independent in the 4-cycle (size ≥ 2)', () => {
	const r = verifyIndependentSet(SQUARE, ['a', 'c'], 2);
	assert.equal(r.ok, true);
	assert.equal(r.independent, true);
	assert.equal(r.atLeastK, true);
	assert.equal(r.conflictEdge, null);
});

test('verifyIndependentSet — rejects a set containing an edge', () => {
	const r = verifyIndependentSet(SQUARE, ['a', 'b'], 2);
	assert.equal(r.ok, false);
	assert.equal(r.independent, false);
	assert.deepEqual(r.conflictEdge, ['a', 'b']);
});

test('verifyIndependentSet — rejects when too small for k', () => {
	const r = verifyIndependentSet(SQUARE, ['a'], 2);
	assert.equal(r.independent, true);
	assert.equal(r.atLeastK, false);
	assert.equal(r.ok, false);
});

// ── verifyClique ─────────────────────────────────────────────────────────────

test('verifyClique — the triangle {a,b,c} is a clique of size 3', () => {
	const r = verifyClique(TRIANGLE, ['a', 'b', 'c'], 3);
	assert.equal(r.ok, true);
	assert.equal(r.complete, true);
	assert.equal(r.missingEdge, null);
});

test('verifyClique — rejects a non-adjacent pair', () => {
	// a and d are not adjacent in TRIANGLE.
	const r = verifyClique(TRIANGLE, ['a', 'd'], 2);
	assert.equal(r.ok, false);
	assert.equal(r.complete, false);
	assert.deepEqual(r.missingEdge, ['a', 'd']);
});

test('verifyClique ↔ verifyIndependentSet — clique on G = ind.set on complement', () => {
	// Complement of TRIANGLE on {a,b,c,d}: all pairs NOT in TRIANGLE's edges.
	// TRIANGLE edges: ab, bc, ca, cd. Non-edges: ad, bd. So complement:
	const complement = {
		nodes: ['a', 'b', 'c', 'd'],
		edges: [
			['a', 'd'],
			['b', 'd'],
		],
	};
	// {a,b,c} is a clique in TRIANGLE; in the complement those three are
	// pairwise non-adjacent ⇒ an independent set.
	const clique = verifyClique(TRIANGLE, ['a', 'b', 'c'], 3);
	const indep = verifyIndependentSet(complement, ['a', 'b', 'c'], 3);
	assert.equal(clique.ok, true);
	assert.equal(indep.ok, true);
});

// ── reduce3SatToIndependentSet ───────────────────────────────────────────────

test('reduce3SatToIndependentSet — structure: one vertex per literal, k = m', () => {
	const { graph, k, vertexMeta } = reduce3SatToIndependentSet(FORMULA);
	// 2 clauses × 3 literals = 6 vertices.
	assert.equal(graph.nodes.length, 6);
	assert.equal(k, 2, 'k equals the number of clauses');
	// Every vertex carries its (clause, literal) provenance.
	for (const node of graph.nodes) {
		assert.ok(vertexMeta[node], `${node} has meta`);
		assert.equal(typeof vertexMeta[node].clause, 'number');
	}
});

test('reduce3SatToIndependentSet — clause-clique edges connect each clause', () => {
	const { graph } = reduce3SatToIndependentSet(FORMULA);
	const has = (a, b) =>
		graph.edges.some(
			([x, y]) => (x === a && y === b) || (x === b && y === a)
		);
	// Clause 0 literals c0_0,c0_1,c0_2 form a triangle.
	assert.ok(has('c0_0', 'c0_1'));
	assert.ok(has('c0_0', 'c0_2'));
	assert.ok(has('c0_1', 'c0_2'));
});

test('reduce3SatToIndependentSet — conflict edges link x with ¬x across clauses', () => {
	const { graph } = reduce3SatToIndependentSet(FORMULA);
	const has = (a, b) =>
		graph.edges.some(
			([x, y]) => (x === a && y === b) || (x === b && y === a)
		);
	// clause0 literal0 is x1 (positive); clause1 literal0 is ¬x1 -> conflict edge.
	assert.ok(has('c0_0', 'c1_0'), 'x1 (c0_0) conflicts with ¬x1 (c1_0)');
});

test('reduce3SatToIndependentSet — a satisfying assignment yields a valid size-m independent set', () => {
	const assignment = { x1: true, x2: true, x3: false };
	assert.equal(verify3SAT(FORMULA, assignment).ok, true);
	const { graph, k } = reduce3SatToIndependentSet(FORMULA);
	const picks = satisfyingAssignmentToIndependentSet(FORMULA, assignment);
	assert.equal(picks.length, k, 'one literal chosen per clause');
	const r = verifyIndependentSet(graph, picks, k);
	assert.equal(
		r.ok,
		true,
		'the mapped picks form an independent set of size k'
	);
});

test('reduce3SatToIndependentSet — preserves YES/NO (correctness of the reduction)', () => {
	// Try every assignment of the 3 vars; the reduced graph must have an
	// independent set of size m for EXACTLY the satisfying assignments.
	const { graph, k } = reduce3SatToIndependentSet(FORMULA);
	const vars = FORMULA.vars;
	for (let mask = 0; mask < 1 << vars.length; mask++) {
		const assignment = {};
		vars.forEach((v, i) => {
			assignment[v] = Boolean(mask & (1 << i));
		});
		const sat = verify3SAT(FORMULA, assignment).ok;
		const picks = satisfyingAssignmentToIndependentSet(FORMULA, assignment);
		const mapped = picks.length === k && verifyIndependentSet(graph, picks, k).ok;
		if (sat) {
			assert.equal(mapped, true, 'SAT ⇒ size-k independent set exists');
		}
	}
});

test('reduce3SatToIndependentSet — runs in polynomial size (no exponential blow-up)', () => {
	// 4 clauses of 3 literals -> 12 vertices; edges bounded by O(n²) where n=12.
	const big = {
		vars: ['a', 'b', 'c', 'd'],
		clauses: [
			[lit('a'), lit('b'), lit('c')],
			[lit('a', true), lit('b'), lit('d')],
			[lit('b', true), lit('c', true), lit('d')],
			[lit('a'), lit('c'), lit('d', true)],
		],
	};
	const { graph, k } = reduce3SatToIndependentSet(big);
	assert.equal(graph.nodes.length, 12);
	assert.equal(k, 4);
	assert.ok(graph.edges.length <= (12 * 11) / 2, 'edges bounded by C(n,2)');
});
