// Pure builder for the "overlapping subproblems" treatment of Climbing Stairs.
//
// The recurrence ways(n) = ways(n−1) + ways(n−2) (Fibonacci in disguise) is the
// canonical vehicle for the DP signature: naive recursion recomputes the SAME
// subproblem many times. This module makes that visible as data — independent of
// React, so it can be unit-tested — in two shapes:
//
//   buildRecursionTree(n)  → the full naive call tree, with each node tagged by
//                            how many times its subproblem ways(k) appears across
//                            the whole tree (its "repeat rank"). Repeated nodes
//                            are what the stage highlights.
//
//   buildOverlapCensus(n)  → per-subproblem counts: how often each ways(k) is
//                            evaluated by naive recursion vs. memoization (once).
//                            This is the number the retrieval check is graded on.
//
// Both are pure functions of n with no UI dependency.

// Naive recursion call count: T(n) = number of *calls* to ways made when
// evaluating ways(n) with no memo. T(0)=T(1)=1, T(n)=T(n-1)+T(n-2)+1.
const naiveCallCount = n => {
	if (n <= 1) return 1;
	let a = 1; // T(0)
	let b = 1; // T(1)
	for (let i = 2; i <= n; i++) {
		const cur = a + b + 1;
		a = b;
		b = cur;
	}
	return b;
};

/**
 * buildOverlapCensus — for each subproblem k in 0..n, how many times naive
 * recursion evaluates ways(k) while computing ways(n), versus memoization
 * (always exactly once, because the first evaluation caches the result).
 *
 * The naive evaluation count of a subproblem k equals the number of *nodes*
 * labelled ways(k) in the call tree of ways(n). That count satisfies the same
 * additive structure as the calls themselves, so we accumulate it directly.
 *
 * @param {number} n
 * @returns {{
 *   n: number,
 *   rows: Array<{ k: number, naive: number, memo: number }>,
 *   naiveTotal: number,   // total ways(...) evaluations without memo
 *   memoTotal: number,    // total with memo (each subproblem once)
 *   maxNaive: number,     // worst single-subproblem recomputation count
 * }}
 */
export const buildOverlapCensus = n => {
	const size = Math.max(0, n) + 1;
	// counts[k] = number of times ways(k) is evaluated in the naive tree of ways(n).
	const counts = new Array(size).fill(0);
	counts[n] = 1; // the root ways(n) is evaluated once
	// Walk from the top down: each evaluation of ways(k) spawns ways(k-1) and
	// ways(k-2) (for k >= 2), so it contributes its own count to both children.
	for (let k = n; k >= 2; k--) {
		counts[k - 1] += counts[k];
		counts[k - 2] += counts[k];
	}

	const rows = [];
	for (let k = 0; k <= n; k++) {
		rows.push({ k, naive: counts[k], memo: counts[k] > 0 ? 1 : 0 });
	}

	const naiveTotal = counts.reduce((s, c) => s + c, 0);
	const memoTotal = rows.reduce((s, r) => s + r.memo, 0);
	const maxNaive = rows.reduce((m, r) => Math.max(m, r.naive), 0);

	return { n, rows, naiveTotal, memoTotal, maxNaive };
};

/**
 * buildRecursionTree — the full naive call tree for ways(n).
 *
 * Each node: { id, k, depth, children: [] }. `id` is a stable preorder path so
 * React keys and the census cross-reference cleanly. The tree is annotated after
 * construction with `repeats` (how many nodes in the whole tree share this k) so
 * the stage can highlight subproblems that recur — the visible DP signature.
 *
 * Guarded to small n (the tree is exponential); callers pass n <= ~6.
 *
 * @param {number} n
 * @returns {{
 *   root: object,
 *   nodeCount: number,
 *   census: ReturnType<typeof buildOverlapCensus>,
 * }}
 */
export const buildRecursionTree = n => {
	const census = buildOverlapCensus(n);
	const repeatsByK = Object.fromEntries(
		census.rows.map(r => [r.k, r.naive])
	);

	let nodeCount = 0;
	const make = (k, depth, path) => {
		nodeCount += 1;
		const node = {
			id: path,
			k,
			depth,
			repeats: repeatsByK[k] ?? 0,
			isRepeated: (repeatsByK[k] ?? 0) > 1,
			isBase: k <= 1,
			children: [],
		};
		if (k >= 2) {
			node.children.push(make(k - 1, depth + 1, `${path}.L`));
			node.children.push(make(k - 2, depth + 1, `${path}.R`));
		}
		return node;
	};

	const root = n < 0 ? null : make(n, 0, 'r');
	return { root, nodeCount, census };
};

/**
 * recursionTreeToLevels — flatten the tree into depth-ordered rows for a
 * left-to-right layout. Returns an array of arrays of nodes, one per depth.
 */
export const recursionTreeToLevels = root => {
	const levels = [];
	const visit = node => {
		if (!node) return;
		(levels[node.depth] ||= []).push(node);
		node.children.forEach(visit);
	};
	visit(root);
	return levels;
};

// Re-exported so tests and the stage can assert the closed-form total against an
// independent computation of the same quantity.
export const naiveTotalCalls = naiveCallCount;
