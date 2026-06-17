// Slow-APSP — all-pairs shortest paths by repeated min-plus matrix multiplication.
//
// THE FRAMING (CLRS §25.1). Floyd-Warshall (see fwTrace.js) grows the set of
// *intermediate* vertices a path may route through. Slow-APSP grows the *number
// of edges* a path may use, and it does so by literal matrix multiplication —
// just in the (min, +) semiring instead of (+, ×).
//
//   • Replace the scalar product a·b with the scalar sum a + b.
//   • Replace the scalar sum Σ (the "accumulate") with min.
//
// So the "matrix product" of two n×n matrices A, B, written A ⊗ B here, is
//
//     (A ⊗ B)_{ij} = min over k of ( A_{ik} + B_{kj} )                       (★)
//
// (∞ is the additive identity's opposite — the "zero" of min — and ∞ + x = ∞,
// so a missing edge poisons any path that would use it. We use JS `Infinity`.)
//
// EXTEND-SHORTEST-PATHS is exactly (★): given L^(m−1) holding shortest-path
// weights using AT MOST m−1 edges, and the raw weight matrix W, the product
// L^(m−1) ⊗ W extends every path by one more edge:
//
//     L^(m)_{ij} = min over k of ( L^(m−1)_{ik} + W_{kj} )
//
// "the best ≤ m-edge i→j path = the best (≤ m−1)-edge i→k path, then the edge
// k→j." The diagonal w_kk = 0 lets a path also just *stop* (use fewer edges),
// so L^(m) dominates L^(m−1) entrywise (distances only fall).
//
// SLOW-APSP then iterates the product. With
//
//     L^(1) = W            (one edge: the weight matrix itself)
//     L^(m) = L^(m−1) ⊗ W  (m = 2, 3, …)
//
// a shortest path in an n-vertex graph with no negative cycle has at most n−1
// edges, so L^(n−1) already holds the true all-pairs distances and no further
// product changes anything. That is n−2 products of Θ(n³) each ⇒ Θ(n⁴) total —
// the "slow" in Slow-APSP. (Repeated squaring / Faster-APSP computes L^(2),
// L^(4), L^(8), … and reaches L^(≥n−1) in ⌈lg(n−1)⌉ products ⇒ Θ(n³ lg n);
// Floyd-Warshall reuses each k-layer in place for a flat Θ(n³). See scenes.js.)
//
// ── THE INDEXING CONTRACT (read this before touching `layers`) ──
// The mathematical superscript L^(m) is 1-based: m counts edges, starting at 1.
// JavaScript arrays are 0-based. We expose the layers as a 0-based array and
// adopt ONE rule, stated once and obeyed everywhere:
//
//     layers[m - 1]  ===  L^(m)
//
// Concretely:  layers[0] === L^(1) === W,  layers[1] === L^(2),  …,
//              layers[n - 2] === L^(n−1) === the final distance matrix `dist`.
// So `layers` has length n−1, and `dist` is an alias for `layers[n - 2]`.
//
// This module is pure, deterministic, and React-free so the matrices and the
// product can be unit-tested in isolation (slowApsp.test.js), including a
// cross-check that L^(n−1) equals Floyd-Warshall's distance matrix on the same
// graph.

const INF = Infinity; // ∞ sentinel (∞ + x = ∞ falls out of native arithmetic).

// Node-id order, matching fwTrace.js: the matrix index of a vertex is its
// position in graph.nodes. Accepts {nodes} or {vertices} (the latter is used by
// a couple of other generators); ids are stringified for stable lookup.
const nodeIdsOf = graph => {
	const raw = graph.nodes ?? graph.vertices ?? [];
	return raw.map(n => String(n.id ?? n));
};

// Deep-copy an n×n numeric matrix so each layer is its own snapshot.
const cloneMatrix = m => m.map(row => row.slice());

/**
 * weightMatrix — the L^(1) = W matrix from the directed, weighted edge list.
 *
 *   W_ii = 0           (a zero-edge path from a vertex to itself)
 *   W_ij = w(i, j)     for a direct edge i→j (lightest, if parallels exist)
 *   W_ij = ∞           when there is no edge i→j
 *
 * Mirrors fwTrace.js's initMatrices (same id order, same "keep the lightest
 * parallel edge, ignore self-loops" rule) but uses Infinity for ∞ rather than
 * null, per this module's contract.
 *
 * @param {{nodes?:{id}[], vertices?:{id}[], edges:{from,to,weight}[]}} graph
 * @returns {{ ids:string[], n:number, W:number[][] }}
 */
export const weightMatrix = graph => {
	const ids = nodeIdsOf(graph);
	const n = ids.length;
	const idx = Object.fromEntries(ids.map((id, i) => [id, i]));
	const W = Array.from({ length: n }, (_, i) =>
		Array.from({ length: n }, (_, j) => (i === j ? 0 : INF))
	);
	(graph.edges ?? []).forEach(e => {
		const i = idx[String(e.from)];
		const j = idx[String(e.to)];
		if (i == null || j == null) return;
		if (i === j) return; // ignore self-loops; the diagonal stays 0
		const w = Number(e.weight);
		if (W[i][j] === INF || w < W[i][j]) W[i][j] = w;
	});
	return { ids, n, W };
};

/**
 * extendShortestPaths — one min-plus matrix product L ⊗ W (CLRS EXTEND-SHORTEST-
 * PATHS). Extends every shortest path by at most one more edge:
 *
 *     out_{ij} = min over k of ( L_{ik} + W_{kj} )
 *
 * ∞ + x = ∞ (native), so a missing intermediate edge contributes nothing. Pure:
 * reads L and W, returns a fresh matrix.
 *
 * @param {number[][]} L   current shortest-path-weight matrix (≤ some edge count)
 * @param {number[][]} W   the raw weight matrix
 * @returns {number[][]}   L ⊗ W
 */
export const extendShortestPaths = (L, W) => {
	const n = L.length;
	const out = Array.from({ length: n }, () =>
		Array.from({ length: n }, () => INF)
	);
	for (let i = 0; i < n; i++) {
		for (let j = 0; j < n; j++) {
			let best = INF;
			for (let k = 0; k < n; k++) {
				const cand = L[i][k] + W[k][j]; // ∞ + x = ∞ stays ∞
				if (cand < best) best = cand;
			}
			out[i][j] = best;
		}
	}
	return out;
};

/**
 * slowApsp — all-pairs shortest paths by iterating the min-plus product.
 *
 *     L^(1) = W
 *     L^(m) = L^(m−1) ⊗ W      for m = 2 .. n−1
 *
 * Returns the node-id order, the weight matrix W, every layer L^(1)..L^(n−1)
 * (see the indexing contract above: `layers[m - 1] === L^(m)`), and `dist` =
 * L^(n−1), the final all-pairs distance matrix (valid when there is no negative
 * cycle). ∞ is represented as `Infinity`.
 *
 * For n ≤ 1 there is nothing to extend: `layers` is just [W] and `dist === W`.
 *
 * @param {{nodes?:{id}[], vertices?:{id}[], edges:{from,to,weight}[]}} graph
 * @returns {{
 *   ids:string[], n:number,
 *   W:number[][],
 *   layers:number[][][],   // layers[m-1] === L^(m); length max(1, n-1)
 *   dist:number[][],       // === layers[n-2] === L^(n-1) (the answer)
 * }}
 */
export const slowApsp = graph => {
	const { ids, n, W } = weightMatrix(graph);

	// layers[0] = L^(1) = W. We then build up to L^(n−1) by repeated ⊗ W.
	const layers = [cloneMatrix(W)];
	for (let m = 2; m <= n - 1; m++) {
		// layers[m - 2] === L^(m−1); the product gives L^(m) === layers[m - 1].
		layers.push(extendShortestPaths(layers[m - 2], W));
	}

	// dist = L^(n−1) (the last layer). For n ≤ 2 the loop never runs, so the only
	// layer is L^(1) = W — which is already correct (≤ 1 edge spans every path).
	const dist = cloneMatrix(layers[layers.length - 1]);

	return { ids, n, W: cloneMatrix(W), layers, dist };
};

// Expose the ∞ sentinel + a formatter for any caller that wants to render the
// matrices (the topic stage uses fwTrace's null sentinel; this is here so the
// exam bank / a future Slow-APSP view can format Infinity consistently).
export const INFINITY = INF;
export const formatDist = v => (v === INF || v === undefined ? '∞' : v);
