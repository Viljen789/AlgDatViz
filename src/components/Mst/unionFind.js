// unionFind — a pure, UI-free disjoint-set (union-find) data structure.
//
// This is the data structure Kruskal needs: it answers "are these two vertices
// already in the same component?" in (almost) constant time, so a cycle check is
// one Find on each endpoint. Two classic optimisations keep it fast:
//
//   • UNION BY RANK — when merging two trees, hang the shorter under the taller,
//     so the trees stay shallow.
//   • PATH COMPRESSION — on every Find, re-point the nodes along the path
//     straight at the root, so later Finds are flat.
//
// Together they give the inverse-Ackermann bound α(n) per operation — effectively
// constant. The structure is deliberately React-free so the make-set / find /
// union invariants can be unit-tested in isolation (unionFind.test.js); the stage
// and playground only render the component snapshots, they never re-derive them.
//
// Elements are arbitrary comparable keys (we use string vertex ids). makeSet is
// implicit: an unseen element becomes its own singleton set on first touch.

/**
 * createUnionFind — build a disjoint-set forest.
 *
 * @param {Array<string|number>} [elements=[]]  initial elements, each its own set.
 * @returns {{
 *   makeSet:    (x) => void,
 *   find:       (x) => string|number,   // representative (with path compression)
 *   findNoCompress: (x) => string|number, // representative, read-only (for views)
 *   union:      (a, b) => boolean,      // true if merged, false if already joined
 *   connected:  (a, b) => boolean,
 *   rankOf:     (x) => number,
 *   count:      () => number,           // number of disjoint sets
 *   components: () => Array<Array<string|number>>, // sorted groups (for the UI)
 * }}
 */
export const createUnionFind = (elements = []) => {
	const parent = new Map();
	const rank = new Map();

	const makeSet = x => {
		if (!parent.has(x)) {
			parent.set(x, x);
			rank.set(x, 0);
		}
	};

	elements.forEach(makeSet);

	// Find WITH path compression: flattens the path to the root as a side effect.
	const find = x => {
		makeSet(x);
		let root = x;
		while (parent.get(root) !== root) root = parent.get(root);
		// Second pass: re-point every node on the path straight at the root.
		let cur = x;
		while (parent.get(cur) !== root) {
			const next = parent.get(cur);
			parent.set(cur, root);
			cur = next;
		}
		return root;
	};

	// Read-only representative lookup (no mutation) — handy for rendering a
	// snapshot without disturbing the structure under test.
	const findNoCompress = x => {
		if (!parent.has(x)) return x;
		let root = x;
		while (parent.get(root) !== root) root = parent.get(root);
		return root;
	};

	// Union BY RANK: returns false when the two are already in one set (which is
	// exactly the cycle signal Kruskal rejects on).
	const union = (a, b) => {
		const ra = find(a);
		const rb = find(b);
		if (ra === rb) return false;
		const rankA = rank.get(ra);
		const rankB = rank.get(rb);
		if (rankA < rankB) {
			parent.set(ra, rb);
		} else if (rankA > rankB) {
			parent.set(rb, ra);
		} else {
			parent.set(rb, ra);
			rank.set(ra, rankA + 1);
		}
		return true;
	};

	const connected = (a, b) => find(a) === find(b);

	const rankOf = x => {
		makeSet(x);
		return rank.get(x);
	};

	const count = () => {
		let n = 0;
		for (const [el, p] of parent) if (el === p) n += 1;
		return n;
	};

	// Group every element by its representative; sort within and across groups so
	// the rendered component list is stable and deterministic.
	const components = () => {
		const groups = new Map();
		for (const el of parent.keys()) {
			const root = findNoCompress(el);
			if (!groups.has(root)) groups.set(root, []);
			groups.get(root).push(el);
		}
		const out = [...groups.values()].map(group =>
			[...group].sort((x, y) => String(x).localeCompare(String(y)))
		);
		out.sort((g1, g2) => String(g1[0]).localeCompare(String(g2[0])));
		return out;
	};

	return {
		makeSet,
		find,
		findNoCompress,
		union,
		connected,
		rankOf,
		count,
		components,
	};
};

export default createUnionFind;
