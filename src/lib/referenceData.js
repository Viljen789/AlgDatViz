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
import {
	STRATEGY_ALGORITHMS,
	STRATEGY_ALGORITHM_ORDER,
} from '../components/Strategies/strategiesMeta.js';
import { APSP_MODES } from '../components/AllPairsShortestPaths/apspMeta.js';
import { MAXFLOW_ALGORITHMS } from '../components/MaxFlow/maxFlowMeta.js';
import { EXAMPLES as MASTER_EXAMPLES } from '../components/MasterTheorem/masterMath.js';
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

// Greedy vs DP: not two algorithms but two strategies, so the "pick" is the
// strategy and the roster of problems under each is DERIVED from the Strategies
// meta's category tags (name + complexity read straight off STRATEGY_ALGORITHMS).
// A problem re-classified in its lesson moves columns here automatically. Coin
// change is tagged 'DP vs Greedy' — the boundary lesson — so it lands in neither
// roster on purpose; the note carries it instead.
const strategyChoice = (() => {
	const roster = category =>
		STRATEGY_ALGORITHM_ORDER.map(id => STRATEGY_ALGORITHMS[id])
			.filter(algo => algo.category === category)
			.map(algo => `${algo.name} ${algo.complexity}`)
			.join(' · ');
	return {
		id: 'strategy',
		topicId: 'strategies',
		title: 'Greedy or dynamic programming',
		question:
			'Optimal substructure either way. Commit greedily, or fill a table?',
		options: [
			{
				when: 'An exchange argument proves the local choice safe',
				pick: 'Greedy',
				because: `Sort once, commit in one pass, never revisit. ${roster('Greedy')}.`,
			},
			{
				when: 'Subproblems overlap and no local choice is provably safe',
				pick: 'Dynamic programming',
				because: `Solve every subproblem once, store it, build the optimum bottom-up. ${roster('DP')}.`,
			},
		],
		note: `${STRATEGY_ALGORITHMS.coinChange.name} straddles the line: greedy happens to work for canonical coin systems and fails for arbitrary ones.`,
	};
})();

// Searching: the earliest decision the course teaches — sorted input turns a
// scan into a halving. The pick label is read off the master-theorem lesson's
// worked examples (MASTER_EXAMPLES), so a renamed or dropped example there
// fails the reference tests instead of silently orphaning this card.
const searchChoice = (() => {
	const binarySearch = MASTER_EXAMPLES.find(e => e.label === 'Binary search');
	return {
		id: 'search',
		topicId: 'foundations',
		title: 'Searching an array',
		question: 'Find one key. Can you rule out half at a time?',
		options: [
			{
				when: 'The input is sorted',
				pick: binarySearch.label,
				because: `O(log n). Probe the middle and discard the half that cannot hold the key — the live range halves every step (T(n) = T(n/${binarySearch.b}) + Θ(1), master theorem case 2).`,
			},
			{
				when: 'No usable order',
				pick: 'Linear scan',
				because:
					'O(n). With nothing sorted there is nothing to rule out, so every element may need a look. Sorting first only pays off across many searches.',
			},
		],
	};
})();

// APSP: one Θ(V³) matrix fill, or V single-source runs? Density and edge signs
// decide it, and both picks read name + complexity off the same metas their
// lessons render (APSP_MODES, SSSP_ALGORITHMS). The note carries the pensum's
// matrix-multiplication cousins as a one-line contrast.
const apspChoice = (() => {
	const fw = APSP_MODES.floydWarshall;
	const dijkstra = SSSP_ALGORITHMS.dijkstra;
	return {
		id: 'apsp',
		topicId: 'apsp',
		title: 'All-pairs shortest paths',
		question:
			'Every distance for every pair. One matrix, or V single-source runs?',
		options: [
			{
				when: 'Dense graph, or negative edges present',
				pick: fw.name,
				because: `${fw.complexity}. Three loops over intermediate vertices fill the V×V matrix. Negative edges are fine as long as no negative cycle exists — one shows up as a negative diagonal entry.`,
			},
			{
				when: 'Sparse graph, all weights non-negative',
				pick: `${dijkstra.name} from every vertex`,
				because: `V runs of ${dijkstra.complexity} is about O(V·E log V), which beats Θ(V³) when E is far below V².`,
			},
		],
		note: 'The matrix route is the slow cousin: Slow-APSP extends paths one edge per min-plus product for Θ(V⁴); Faster-APSP squares the matrix instead for Θ(V³ log V) — both behind Floyd-Warshall’s flat Θ(V³).',
	};
})();

// Max flow: both algorithms augment until no residual path remains; the ONLY
// difference is the path rule, so the card contrasts exactly that. Names and
// complexities read off MAXFLOW_ALGORITHMS (the meta the lesson renders).
const maxFlowChoice = (() => {
	const ff = MAXFLOW_ALGORITHMS.fordFulkerson;
	const ek = MAXFLOW_ALGORITHMS.edmondsKarp;
	return {
		id: 'maxflow',
		topicId: 'max-flow',
		title: 'Maximum flow',
		question:
			'Augment until no path remains. Any path, or always the shortest?',
		options: [
			{
				when: 'Capacities are small integers',
				pick: ff.name,
				because: `${ff.complexity}. Any residual path will do; each augmentation adds at least 1, so the bound scales with the answer |f*|. Huge capacities make that bound huge, and irrational ones can stop it terminating at all.`,
			},
			{
				when: 'You want a bound independent of capacities',
				pick: ek.name,
				because: `${ek.complexity}. Always augment along a fewest-edges path (BFS): that caps the number of augmentations at O(V·E) no matter the capacity values.`,
			},
		],
	};
})();

// Cards render in teaching order — sorted by their topic's position in the
// curriculum, the same order the complexity sheet and the glossary walk.
export const decisionCards = [
	searchChoice,
	traversalChoice,
	strategyChoice,
	mstChoice,
	ssspChoice,
	apspChoice,
	maxFlowChoice,
];

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
// Curated prose, but the Strategies labels and every complexity are read off
// STRATEGY_ALGORITHMS (the same meta the lessons render), so a renamed problem
// or a revised bound updates here too. Greedy is provably optimal when an
// exchange argument holds: the MST cut property, earliest-finish interval
// scheduling, merging the two rarest symbols (Huffman), ratio-first on a
// divisible knapsack. It is NOT safe where indivisibility or interacting
// choices break the exchange — arbitrary coin change, 0/1 knapsack, LCS, rod
// cutting — and there dynamic programming tabulates the overlapping
// subproblems instead.
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
			label: STRATEGY_ALGORITHMS.intervalScheduling.name,
			why: `Always taking the compatible interval that finishes earliest leaves the most room, an exchange argument proves it optimal. ${STRATEGY_ALGORITHMS.intervalScheduling.complexity} to sort by finish time.`,
		},
		{
			id: 'huffman',
			topicId: 'strategies',
			label: STRATEGY_ALGORITHMS.huffman.name,
			why: `Merging the two rarest symbols is always safe: an exchange argument swaps them into the deepest leaves of any optimal tree without raising the cost. ${STRATEGY_ALGORITHMS.huffman.complexity} with a min-heap.`,
		},
		{
			id: 'fractional',
			topicId: 'strategies',
			label: STRATEGY_ALGORITHMS.fractionalKnapsack.name,
			why: `Items are divisible, so densest-first never strands capacity — split the last item and the bag fills exactly. ${STRATEGY_ALGORITHMS.fractionalKnapsack.complexity} to sort by value per weight.`,
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
			label: STRATEGY_ALGORITHMS.knapsack01.name,
			why: `Best ratio first can block a better whole-item combination — indivisibility breaks the exchange argument. DP over items × capacities solves it in ${STRATEGY_ALGORITHMS.knapsack01.complexity}.`,
		},
		{
			id: 'lcs',
			topicId: 'strategies',
			label: STRATEGY_ALGORITHMS.lcs.name,
			why: `No local rule survives: the best answer for two prefixes depends on shorter prefixes, and those subproblems overlap heavily. DP fills the table in ${STRATEGY_ALGORITHMS.lcs.complexity}.`,
		},
		{
			id: 'rod',
			topicId: 'strategies',
			label: STRATEGY_ALGORITHMS.rodCutting.name,
			why: `The most valuable first cut depends on the optimum for every remaining length, and those remainders recur. DP tabulates each once in ${STRATEGY_ALGORITHMS.rodCutting.complexity}.`,
		},
	],
};

// ── Bilingual exam glossary ─────────────────────────────────────────────────────
// The TDT4120 exam is written in Norwegian; this app teaches in English. That gap
// is VOCABULARY, not language — a student who knows the concept can still stall on
// "spenntre" or "slakking" under time pressure. So the cheat sheet carries an
// English → Norsk term map of the words the exam actually uses.
//
// Curated content (the Norwegian terms can't be derived from code), but STRUCTURED
// as derived data: every entry is tagged with the curriculum `topicId` it belongs
// to, the terms are GROUPED by walking PROGRESS_TOPICS in teaching order, and a
// guardrail test asserts every progress topic carries at least one pair — so the
// glossary can never silently fall behind the curriculum (referenceData.test.js).
//
// The Norwegian terms are the ones used in the official NTNU course material
// (the Norwegian CLRS, the lecture notes and the Wikipendium summary). A few are
// kept in English ON PURPOSE because the course itself does (e.g. "heap",
// "in-place", "worst case"); those carry a short note so the student is not
// surprised to see the English word on a Norwegian exam.

// One flat, ordered list of term pairs. `topicId` ties each to the curriculum so
// coverage is checkable; `note` is an optional caveat (a synonym, or "kept in
// English by the course"). `en` is the app's wording, `no` the exam's.
export const glossaryTerms = [
	// 01 · Arrays & complexity
	{ topicId: 'foundations', en: 'array', no: 'array' },
	{ topicId: 'foundations', en: 'running time', no: 'kjøretid' },
	{
		topicId: 'foundations',
		en: 'worst case',
		no: 'verste tilfelle',
		note: 'The course often keeps the English "worst case"; "verste tilfelle" is the plain Norwegian.',
	},
	{
		topicId: 'foundations',
		en: 'running-time bound',
		no: 'asymptotisk grense',
	},
	// 02 · Stacks & queues
	{ topicId: 'stacks-queues', en: 'stack', no: 'stakk' },
	{ topicId: 'stacks-queues', en: 'queue', no: 'kø' },
	{ topicId: 'stacks-queues', en: 'linked list', no: 'lenket liste' },
	// 03 · Recursion & the master theorem
	{ topicId: 'master-theorem', en: 'recursion', no: 'rekursjon' },
	{
		topicId: 'master-theorem',
		en: 'divide and conquer',
		no: 'splitt og hersk',
	},
	{ topicId: 'master-theorem', en: 'recurrence', no: 'rekurrens' },
	{ topicId: 'master-theorem', en: 'master theorem', no: 'masterteoremet' },
	// 04 · Sorting
	{ topicId: 'sorting', en: 'sorting', no: 'sortering' },
	{
		topicId: 'sorting',
		en: 'comparison sort',
		no: 'sammenligningsbasert sortering',
	},
	{ topicId: 'sorting', en: 'stable (sort)', no: 'stabil' },
	{
		topicId: 'sorting',
		en: 'in place',
		no: 'in-place',
		note: 'Kept in English by the course; sometimes written "på plass".',
	},
	// 05 · Quicksort
	{ topicId: 'quicksort', en: 'quicksort', no: 'kvikksortering' },
	{
		topicId: 'quicksort',
		en: 'pivot',
		no: 'pivot',
		note: 'Also "pivotelement" — the value the range is partitioned around.',
	},
	{ topicId: 'quicksort', en: 'partition', no: 'partisjonering' },
	// 06 · Linear-time sorting
	{ topicId: 'linear-time-sorting', en: 'counting sort', no: 'tellesortering' },
	{ topicId: 'linear-time-sorting', en: 'radix sort', no: 'radikssortering' },
	{ topicId: 'linear-time-sorting', en: 'bucket sort', no: 'bøttesortering' },
	// 06 · Hashing
	{
		topicId: 'hashing',
		en: 'hashing',
		no: 'hashing',
		note: 'Kept in English by the course; the table is a "hashtabell".',
	},
	{ topicId: 'hashing', en: 'hash table', no: 'hashtabell' },
	{ topicId: 'hashing', en: '(hash) collision', no: 'kollisjon' },
	{ topicId: 'hashing', en: 'chaining', no: 'kjeding' },
	// 07 · Trees
	{
		topicId: 'trees',
		en: 'binary search tree',
		no: 'binært søketre',
	},
	{ topicId: 'trees', en: 'root', no: 'rot' },
	{ topicId: 'trees', en: 'leaf', no: 'løvnode' },
	{ topicId: 'trees', en: 'height', no: 'høyde' },
	// 08 · Heaps & priority queues
	{
		topicId: 'heaps',
		en: 'heap',
		no: 'heap',
		note: 'Kept in English by the course (Min-heap / Max-heap).',
	},
	{ topicId: 'heaps', en: 'priority queue', no: 'prioritetskø' },
	// 09 · Graphs
	{ topicId: 'graphs', en: 'graph', no: 'graf' },
	{ topicId: 'graphs', en: 'edge', no: 'kant' },
	{
		topicId: 'graphs',
		en: 'vertex / node',
		no: 'node',
		note: 'CLRS\'s "vertex"; the course uses "node" (occasionally "knute").',
	},
	{ topicId: 'graphs', en: 'weight', no: 'vekt' },
	{ topicId: 'graphs', en: 'directed / undirected', no: 'rettet / urettet' },
	{ topicId: 'graphs', en: 'adjacency list', no: 'naboliste' },
	{
		topicId: 'graphs',
		en: 'breadth-first search',
		no: 'bredde-først-søk',
	},
	{ topicId: 'graphs', en: 'depth-first search', no: 'dybde-først-søk' },
	{
		topicId: 'graphs',
		en: 'back edge',
		no: 'bakoverkant',
		note: 'DFS classifies edges as tree, back, forward, or cross. The exam fact: a back edge — to an ancestor still on the DFS path — exists exactly when the graph has a cycle.',
	},
	{ topicId: 'graphs', en: 'topological sort', no: 'topologisk sortering' },
	{
		topicId: 'graphs',
		en: 'strongly connected component',
		no: 'sterkt sammenhengende komponent',
		note: 'Often abbreviated SCC in both languages.',
	},
	// 10 · Strategies
	{
		topicId: 'strategies',
		en: 'greedy algorithm',
		no: 'grådig algoritme',
	},
	{
		topicId: 'strategies',
		en: 'greedy-choice property',
		no: 'grådighetsegenskapen',
	},
	{
		topicId: 'strategies',
		en: 'dynamic programming',
		no: 'dynamisk programmering',
	},
	{
		topicId: 'strategies',
		en: 'memoization',
		no: 'memoisering',
		note: 'From "memo", not "memorize" — cache each subproblem result.',
	},
	{
		topicId: 'strategies',
		en: 'optimal substructure',
		no: 'optimal delstruktur',
	},
	{
		topicId: 'strategies',
		en: 'prefix code',
		no: 'prefikskode',
		note: 'What Huffman builds: no codeword is a prefix of another.',
	},
	{
		topicId: 'strategies',
		en: 'subproblem graph',
		no: 'delinstansgraf',
		note: 'The DAG of which subproblem needs which — DP evaluates it dependencies-first, in reverse topological order.',
	},
	// 11 · Minimum spanning trees
	{ topicId: 'mst', en: 'spanning tree', no: 'spenntre' },
	{ topicId: 'mst', en: 'minimum spanning tree', no: 'minimalt spenntre' },
	{ topicId: 'mst', en: 'cut', no: 'snitt' },
	// 12 · Shortest paths (single-source)
	{ topicId: 'shortest-paths', en: 'shortest path', no: 'korteste vei' },
	{
		topicId: 'shortest-paths',
		en: 'relaxation (of an edge)',
		no: 'slakking',
	},
	{ topicId: 'shortest-paths', en: 'negative cycle', no: 'negativ sykel' },
	// 13 · All-pairs shortest paths
	{
		topicId: 'apsp',
		en: 'all-pairs shortest paths',
		no: 'korteste vei mellom alle par',
	},
	{
		topicId: 'apsp',
		en: 'transitive closure',
		no: 'transitiv tillukning',
	},
	// 14 · Maximum flow
	{ topicId: 'max-flow', en: 'maximum flow', no: 'maksimal flyt' },
	{ topicId: 'max-flow', en: 'residual network', no: 'residualnettverk' },
	{ topicId: 'max-flow', en: 'minimum cut', no: 'minimalt snitt' },
	{ topicId: 'max-flow', en: 'augmenting path', no: 'forøkende sti' },
	{
		topicId: 'max-flow',
		en: 'bottleneck (of an augmenting path)',
		no: 'flaskehals',
		note: 'The smallest residual capacity along the path — the amount one augmentation pushes.',
	},
	{
		topicId: 'max-flow',
		en: 'antiparallel edges',
		no: 'antiparallelle kanter',
		note: 'A flow network cannot keep both u→v and v→u; split one of the pair with an intermediate vertex before running max flow.',
	},
	{
		topicId: 'max-flow',
		en: 'linear programming',
		no: 'lineær programmering',
		note: 'Recognition only on the pensum: shortest paths and max flow can both be stated as linear programs.',
	},
	// 15 · NP-completeness
	{
		topicId: 'np-completeness',
		en: 'NP-complete',
		no: 'NP-komplett',
	},
	{ topicId: 'np-completeness', en: 'NP-hard', no: 'NP-hard' },
	{ topicId: 'np-completeness', en: 'reduction', no: 'reduksjon' },
	{
		topicId: 'np-completeness',
		en: 'co-NP',
		no: 'co-NP',
		note: 'Written the same in both languages: the problems whose "no" answers carry an efficiently checkable certificate — the mirror of NP, which certifies "yes".',
	},
	{
		topicId: 'np-completeness',
		en: 'pseudopolynomial time',
		no: 'pseudopolynomisk tid',
		note: 'Polynomial in the numeric value in the input, not in its length in bits — 0/1 knapsack’s O(n·W) is the pensum example.',
	},
];

// Group the flat term list BY curriculum topic, walking PROGRESS_TOPICS so the
// sections come out in teaching order and carry the topic's number + accent (the
// same model the complexity sheet renders from). Topics with no pairs are dropped
// rather than shown empty — but the guardrail test forbids that from happening
// silently, so an empty section means an authoring gap, not a rendering choice.
export const glossarySections = PROGRESS_TOPICS.map(topic => ({
	id: topic.id,
	number: topic.number,
	name: topic.name,
	accent: topic.accent,
	to: topic.to,
	terms: glossaryTerms.filter(term => term.topicId === topic.id),
})).filter(section => section.terms.length > 0);
