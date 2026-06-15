// referenceData — pure derivations behind the /reference cheat sheet.
//
// SINGLE SOURCE: every row on the reference page is DERIVED here from the real
// lesson data modules, never hand-typed. So when an algorithm's complexity or a
// decision boolean changes in its lesson, the cheat sheet changes with it and
// can never silently drift. The only curated prose is `greedyRule`, and even
// that is anchored to facts the lessons already teach (MST cut property, etc.).
//
// All exports are plain values / pure functions of imported module data, so the
// whole file is unit-testable with no DOM and no clock (referenceData.test.js).

import { ALGORITHM_INFO } from '../utils/sorting/algorithmInfo.js';
import { ALGORITHM_ORDER } from '../utils/sorting/algorithmMeta.js';
import { SSSP_ALGORITHMS } from '../components/ShortestPaths/ssspMeta.js';
import { MST_ALGORITHMS } from '../components/Mst/mstMeta.js';
import { GRAPH_ALGORITHM_META } from '../utils/graphAlgorithmMeta.js';
import { PROGRESS_TOPICS } from '../data/curriculum.js';

// ── Sort comparison ───────────────────────────────────────────────────────────
// One row per sort, in the lessons' teaching order (ALGORITHM_ORDER), reading
// name + best/average/worst time + the stable / in-place properties straight off
// ALGORITHM_INFO. `stable`/`inPlace` are surfaced as booleans so the table can
// render a redundant glyph + text (color-blind safe), never a bare 0/1.
export const sortComparison = ALGORITHM_ORDER.map(id => {
	const info = ALGORITHM_INFO[id];
	const time = info.complexity.time;
	return {
		id,
		name: info.name,
		best: time.best,
		average: time.average,
		worst: time.worst,
		stable: info.properties.stable === 1,
		inPlace: info.properties.inPlace === 1,
	};
});

// ── Decision cards: "which algorithm when" ─────────────────────────────────────
// Each card poses the choice a student actually has to make on an exam and reads
// the deciding booleans from the SAME metas the lessons drive, so the rule on the
// card is exactly the rule the lesson taught.

// Shortest paths: the choice keys on handlesNegatives + needsDag. We DERIVE each
// option from those booleans (rather than hand-picking an algorithm by key), so the
// card tracks the same metas the lessons drive and a meta edit that invalidated the
// rule would change the card too. The three predicates are mutually exclusive and
// exhaustive over the SSSP set: the general negative-edge tool handles negatives
// without needing a DAG; the DAG tool needs a DAG; the non-negative tool does neither.
const ssspChoice = (() => {
	const algos = Object.values(SSSP_ALGORITHMS);
	const bellman = algos.find(a => a.handlesNegatives && !a.needsDag);
	const dagSp = algos.find(a => a.needsDag);
	const dijkstra = algos.find(a => !a.handlesNegatives && !a.needsDag);
	return {
		id: 'sssp',
		topicId: 'shortest-paths',
		title: 'Single-source shortest paths',
		question: 'One source, every distance. Which relaxation schedule?',
		options: [
			{
				when: 'Negative edges are possible',
				// Bellman-Ford is the general tool: it handles negatives and reports a
				// negative cycle. (Only it has handlesNegatives AND not needsDag.)
				pick: bellman.name,
				because: `${bellman.complexity}. Relax every edge V-1 times, then one more pass to report a negative cycle.`,
			},
			{
				when: 'The graph is a DAG',
				pick: dagSp.name,
				because: `${dagSp.complexity}. Relax in topological order, one pass. Negative weights are fine, cycles are not.`,
			},
			{
				when: 'All weights are non-negative',
				pick: dijkstra.name,
				because: `${dijkstra.complexity}. Greedily settle the closest vertex from a priority queue. Breaks on a negative edge.`,
			},
		],
	};
})();

// MST: Prim vs Kruskal build the SAME tree; the contrast is how they grow it.
const mstChoice = (() => {
	const kruskal = MST_ALGORITHMS.kruskal;
	const prim = MST_ALGORITHMS.prim;
	return {
		id: 'mst',
		topicId: 'mst',
		title: 'Minimum spanning tree',
		question: 'Connect everything for the least weight. Same tree, two habits.',
		options: [
			{
				when: 'You think in sorted edges',
				pick: kruskal.name,
				because: `${kruskal.complexity}. Sort every edge globally, add the next cheapest that joins two components (union-find rejects cycles).`,
			},
			{
				when: 'You grow from one vertex',
				pick: prim.name,
				because: `${prim.complexity}. Grow a single tree, always taking the lightest edge crossing the cut to a vertex outside it.`,
			},
		],
		note: 'Distinct weights make the MST unique, so both return the identical tree.',
	};
})();

// Traversal: BFS vs DFS, both O(V+E), differ by the frontier structure.
const traversalChoice = (() => {
	const bfs = GRAPH_ALGORITHM_META.bfs;
	const dfs = GRAPH_ALGORITHM_META.dfs;
	return {
		id: 'traversal',
		topicId: 'graphs',
		title: 'Graph traversal',
		question: 'Visit every reachable vertex. Queue or stack?',
		options: [
			{
				when: 'Shortest path in an unweighted graph',
				pick: 'BFS',
				because: `${bfs.complexity}. A queue visits in layers, so the first time you reach a vertex is along a fewest-edges path.`,
			},
			{
				when: 'Reachability, cycles, topological order',
				pick: 'DFS',
				because: `${dfs.complexity}. A stack follows one path to the end and retreats, exposing back edges and finish times.`,
			},
		],
	};
})();

export const decisionCards = [ssspChoice, mstChoice, traversalChoice];

// ── Complexity sheet ───────────────────────────────────────────────────────────
// The whole curriculum as a one-screen formula list: the headline complexity for
// each of the built, progress-counting topics, in teaching order. Reads number /
// name / complexity / accent straight off the curriculum model.
export const complexitySheet = PROGRESS_TOPICS.map(topic => ({
	id: topic.id,
	number: topic.number,
	name: topic.name,
	complexity: topic.complexity,
	accent: topic.accent,
	to: topic.to,
}));

// ── Greedy rule ────────────────────────────────────────────────────────────────
// Curated, but tight and anchored to facts the lessons already teach: greedy is
// provably optimal when a matroid-style exchange argument holds (MST cut
// property) or an exchange argument on intervals holds (earliest-finish-time
// scheduling). It is NOT safe for arbitrary coin systems or 0/1 knapsack, where
// a local best can foreclose the global optimum and you need dynamic programming.
export const greedyRule = {
	title: 'Greedy: when a local choice is provably global',
	lede: 'Greedy commits to the best-looking option now and never reconsiders. That is only correct when an exchange argument proves the greedy choice is in some optimal solution.',
	safe: [
		{
			id: 'mst',
			topicId: 'mst',
			label: 'Minimum spanning tree',
			why: 'The cut property guarantees the lightest edge crossing any cut is in the MST, so Prim and Kruskal are exact.',
		},
		{
			id: 'interval',
			topicId: 'strategies',
			label: 'Interval scheduling',
			why: 'Always taking the compatible interval that finishes earliest leaves the most room, an exchange argument proves it optimal.',
		},
	],
	unsafe: [
		{
			id: 'coins',
			topicId: 'strategies',
			label: 'Arbitrary coin change',
			why: 'Largest-coin-first can overshoot the fewest-coins answer for some denominations. Use dynamic programming.',
		},
		{
			id: 'knapsack',
			topicId: 'strategies',
			label: '0/1 knapsack',
			why: 'Best ratio first can block a better whole-item combination. The 0/1 case needs dynamic programming.',
		},
	],
};
