// Iterative (unrolling / substitution) method for FIRST-ORDER recurrences.
//
// The Master Theorem solves divide-and-conquer recurrences of the form
//   T(n) = a · T(n / b) + f(n),
// where the subproblem size SHRINKS BY A FACTOR b (n / b). A different and
// equally exam-relevant family is the first-order recurrence
//   T(n) = T(n - 1) + g(n),   with T(baseN) = baseVal,
// where the size shrinks by a CONSTANT (n − 1). The Master Theorem does not
// apply to these (b would be 1, log_b a undefined); the standard tool is the
// ITERATION method: unroll the recurrence and sum the per-step costs:
//
//   T(n) = T(baseN) + Σ_{k = baseN+1}^{n} g(k)  =  baseVal + Σ g(k).
//
// This module is the pure, deterministic, unit-tested source of truth for that
// unrolling, mirroring masterMath.js so an exam set can DERIVE a concrete value
// T(k) instead of hand-typing it. The closed form itself stays a STATIC concept
// answer; only the numeric value is derived here.

/**
 * unrollRecurrence — iterate a first-order recurrence T(n) = T(n−1) + g(n).
 *
 * Starting from T(baseN) = baseVal, it accumulates one step at a time
 *   T(k) = T(k − 1) + g(k)   for k = baseN + 1, …, n
 * and returns both the final value T(n) and the per-step trace. Reading the
 * value off this trace is exactly the iteration method a student performs by
 * hand, so a derived key can only ever be what unrolling actually produces.
 *
 * @param {Object}   args
 * @param {number}   args.baseN    the base index (where the recurrence bottoms out).
 * @param {number}   args.baseVal  the base value T(baseN).
 * @param {(k:number)=>number} args.g  the additive per-step cost g(k).
 * @param {number}   args.n        the index to solve for (n >= baseN).
 * @returns {{ value:number, steps:Array<{k:number, gk:number, partial:number}> }}
 *          `value` is T(n); `steps[i]` records the step that produced T(k):
 *          its index k, the cost g(k) added, and the running partial T(k).
 */
export const unrollRecurrence = ({ baseN, baseVal, g, n }) => {
	if (n < baseN) {
		throw new RangeError(
			`unrollRecurrence: n (${n}) must be >= baseN (${baseN})`
		);
	}
	let partial = baseVal;
	const steps = [];
	for (let k = baseN + 1; k <= n; k += 1) {
		const gk = g(k);
		partial += gk;
		steps.push({ k, gk, partial });
	}
	return { value: partial, steps };
};

// ── named example cost functions g(k) the exam set uses ──────────────────────

// g(k) = 2^(k-1). With T(1) = 1 this is the classic exam recurrence
//   T(n) = T(n-1) + 2^(n-1),  whose closed form is T(n) = 2^n − 1
// (a geometric sum 1 + 2 + 4 + … + 2^(n-1) = 2^n − 1).
export const gPow2 = k => 2 ** (k - 1);

// g(k) = k. With T(1) = 1 this is
//   T(n) = T(n-1) + n,  whose closed form is the triangular number n(n+1)/2.
export const gLinear = k => k;
