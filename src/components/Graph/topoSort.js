// topoSort — a pure topological sort of a DAG via Kahn's algorithm.
//
// THE IDEA (TDT4120, DAG ordering):
//   A topological order lists the vertices so that every edge u → v points
//   forward (u appears before v). Kahn's algorithm builds it from in-degrees:
//   repeatedly take a vertex with NO remaining incoming edges (it has no
//   unmet prerequisite), emit it, and remove its out-edges — which may free
//   the next batch of in-degree-0 vertices.
//
// DETERMINISM:
//   When several vertices are simultaneously in-degree-0, the order is not
//   unique. To make THIS function deterministic (so an exam answer derived from
//   it is stable), we always emit the ready vertex with the SMALLEST id, using a
//   natural numeric-aware comparison so '2' < '10'.
//
// CYCLE DETECTION:
//   A graph with a directed cycle has no topological order: the vertices on the
//   cycle never reach in-degree 0. Kahn's therefore emits FEWER vertices than the
//   graph has. We surface that as `hasCycle` and return the partial order we could
//   emit before getting stuck.
//
// This module is deliberately React-free and pure so the ordering can be
// unit-tested without a DOM (topoSort.test.js).

// Compare two vertex ids so that embedded integers sort numerically ('2' < '10')
// while plain strings still sort sensibly ('a' < 'b'). Mirrors the "smallest id"
// tie-break the rest of the topic uses for determinism.
const byId = (a, b) =>
	String(a).localeCompare(String(b), undefined, { numeric: true });

// Normalise an edge to its [from, to] endpoints. Edges may be written either as
// { from, to } (the graph-view convention) or { u, v } (the MST convention); we
// accept both so callers do not have to re-key.
const endpointsOf = e => {
	const from = e.from !== undefined ? e.from : e.u;
	const to = e.to !== undefined ? e.to : e.v;
	return [from, to];
};

// topoSort(vertices, edges) → { order, indegree, hasCycle }
//
//   vertices  Array of vertex ids (strings or numbers).
//   edges     Array of directed edges, each { from, to } or { u, v }.
//
//   order     the topological order (Kahn, smallest-id-first). On a cyclic graph
//             this is the PARTIAL order emitted before the algorithm got stuck.
//   indegree  { [id]: number } — the ORIGINAL in-degree of every vertex (the
//             count of incoming edges before any removal), so callers can read
//             "the in-degree of v" straight off the result.
//   hasCycle  true iff fewer vertices could be emitted than exist (a directed
//             cycle, so no full topological order exists).
export const topoSort = (vertices, edges) => {
	const ids = [...vertices];

	// Original in-degree of every vertex (counts incoming edges only; edges to
	// unknown vertices are ignored defensively).
	const indegree = {};
	ids.forEach(id => {
		indegree[id] = 0;
	});

	// Adjacency (out-edges) for the removal step.
	const out = new Map(ids.map(id => [String(id), []]));
	edges.forEach(e => {
		const [from, to] = endpointsOf(e);
		if (!(to in indegree)) return;
		indegree[to] += 1;
		out.get(String(from))?.push(to);
	});

	// A WORKING copy of in-degrees we decrement as we remove vertices; `indegree`
	// above stays the pristine original we return.
	const remaining = { ...indegree };

	const order = [];
	const emitted = new Set();

	// Repeatedly emit the smallest-id vertex whose remaining in-degree is 0.
	// (A simple rescan each step keeps this transparent; the DAGs here are small.)
	while (order.length < ids.length) {
		const ready = ids
			.filter(id => !emitted.has(id) && remaining[id] === 0)
			.sort(byId);
		if (ready.length === 0) break; // nothing free → a cycle blocks the rest

		const u = ready[0];
		order.push(u);
		emitted.add(u);
		for (const v of out.get(String(u)) || []) {
			remaining[v] -= 1;
		}
	}

	return {
		order,
		indegree,
		hasCycle: order.length < ids.length,
	};
};

// isValidTopoOrder(order, edges) → boolean
//
// True iff `order` is a valid topological ordering for `edges`: every directed
// edge u → v has u positioned strictly before v. (A candidate that omits or
// duplicates vertices, or that has any edge pointing backward, is rejected.)
export const isValidTopoOrder = (order, edges) => {
	const pos = new Map();
	order.forEach((id, i) => {
		if (pos.has(id))
			pos.set(id, NaN); // a duplicate makes the order ill-formed
		else pos.set(id, i);
	});
	return edges.every(e => {
		const [from, to] = endpointsOf(e);
		const pu = pos.get(from);
		const pv = pos.get(to);
		if (pu === undefined || pv === undefined) return false; // edge endpoint missing
		if (Number.isNaN(pu) || Number.isNaN(pv)) return false; // duplicated endpoint
		return pu < pv; // u must come strictly before v
	});
};
