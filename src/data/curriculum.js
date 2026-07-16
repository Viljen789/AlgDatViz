// TDT4120 (NTNU Algoritmer og datastrukturer) curriculum, in teaching order.
//
// SINGLE SOURCE OF TRUTH for the topic model. The sidebar nav, the app shell
// (titles + accents), and the home curriculum map all DERIVE from this list —
// there are no competing topic/accent/label definitions anywhere else.
//
// Each topic owns a path-node entry on the home page and a route to its lesson
// or sandbox surface.
//
// Per-topic signature hue: every topic references its harmonized hue via the
// `--topic-<tokenId>` token defined once in src/styles/theme.css. The token id
// is the short form (e.g. id 'stacks-queues' → token '--topic-stacks'). The
// `accent` field is a `var(--topic-*)` reference (never a hardcoded hex) so the
// whole app inherits one palette.
//
// Field reference (KEEP STABLE — read by components/MergeSortLesson and others):
//   id          stable topic id (matches useProgress completion ids)
//   number      two-digit teaching-order label ('01'…'08')
//   phase       macro-arc the topic belongs to ('Foundations', 'Sorting &
//               search', 'Structures', 'Graphs', 'Intractability') — groups the
//               sidebar nav so the course's shape is legible
//   name        full display name
//   navLabel    compact label for the sidebar
//   pullQuote   one-line "why this matters"
//   keywords    searchable algorithm/concept names (topic finder haystack)
//   complexity  headline asymptotic note
//   tokenId     short token id → `--topic-<tokenId>`
//   accent      `var(--topic-<tokenId>)` — the topic's signature hue
//   icon        lucide icon name (mapped to a component in the Sidebar)
//   to          route to the topic's front door
//   status      'ready' | 'preview' | 'soon'
//   featured    optional — highlighted on the curriculum map
//   countsToProgress  whether the topic participates in overall progress
//                     (preview aliases and 'soon' placeholders do not)
//   locked      optional — true for 'soon' nodes: non-navigable, muted/locked
//                     treatment. They have no `to` route and no per-topic hue
//                     token yet (a real `--topic-*` hue is assigned when each is
//                     actually built); they use a neutral locked treatment.
//   lessonTrace optional 'model' for lessons whose interactive teaches by
//                     changing inputs rather than synchronized pseudocode.
//                     All other canonical lessons default to 'pseudocode'.

const topicAccent = tokenId => `var(--topic-${tokenId})`;

// Full TDT4120 curriculum, in teaching order — every topic is now built
// (the back half shipped in Phase 5). 'soon' remains a valid status value for
// future additions, but no entry currently uses it.
export const CURRICULUM = [
	{
		id: 'foundations',
		number: '01',
		phase: 'Foundations',
		name: 'Arrays & complexity',
		// Shortened for the sidebar the same way 'All-pairs SP' and 'Max flow'
		// are — the full name won't fit the row once the Next chip and status
		// dot claim their space. (The old 'Foundations' label both contradicted
		// the breadcrumb/path/CTA name and duplicated this topic's phase header.)
		navLabel: 'Arrays & big-O',
		pullQuote:
			'Where every algorithm lives. The cost of one operation, multiplied.',
		complexity: 'O(1) … O(2ⁿ)',
		// Searchable algorithm/concept names for the topic finder.
		keywords:
			'big-O, omega, theta, asymptotic analysis, growth rates, amortized cost, binary search, arrays',
		tokenId: 'foundations',
		accent: topicAccent('foundations'),
		icon: 'Layers',
		// The complexity primer — its own dedicated lesson, taught before any data
		// structure: what "cost" means, counting work in code, the O/Ω/Θ bounds,
		// the growth-rate race, and best/worst/average + amortized cost.
		// Recurrences (aT(n/b)+f(n)) live in the Master Theorem topic.
		to: '/foundations',
		status: 'ready',
		countsToProgress: true,
		lessonTrace: 'model',
	},
	{
		id: 'stacks-queues',
		number: '02',
		phase: 'Foundations',
		name: 'Stacks & queues',
		navLabel: 'Stacks / queues',
		pullQuote: 'The two simplest disciplines for "what to do next."',
		complexity: 'O(1)',
		// Searchable algorithm/concept names for the topic finder.
		keywords: 'stack, queue, LIFO, FIFO, push, pop, enqueue, dequeue',
		tokenId: 'stacks',
		accent: topicAccent('stacks'),
		icon: 'List',
		to: '/stacks-queues',
		status: 'ready',
		countsToProgress: true,
	},
	{
		id: 'master-theorem',
		number: '03',
		phase: 'Foundations',
		name: 'Recursion & the master theorem',
		navLabel: 'Master theorem',
		pullQuote:
			'Why a problem solved by solving smaller versions of itself ever terminates.',
		complexity: 'T(n) = aT(n/b) + f(n)',
		// Searchable algorithm/concept names for the topic finder.
		keywords: 'recurrences, divide and conquer, recursion tree, aT(n/b) + f(n)',
		tokenId: 'master',
		accent: topicAccent('master'),
		icon: 'Sigma',
		to: '/master-theorem',
		status: 'ready',
		countsToProgress: true,
	},
	{
		id: 'sorting',
		number: '04',
		phase: 'Sorting & search',
		name: 'Sorting',
		navLabel: 'Sorting',
		pullQuote: 'Five algorithms, one task. The differences are the lesson.',
		complexity: 'O(n log n)',
		// Searchable algorithm/concept names for the topic finder.
		keywords:
			'merge sort, insertion sort, bubble sort, stability, in-place, comparison sorting',
		tokenId: 'sorting',
		accent: topicAccent('sorting'),
		icon: 'BarChart3',
		// The scroll-driven merge sort lesson is the single front door for
		// sorting (the old /sorting sandbox route has been retired).
		to: '/lessons/merge-sort',
		status: 'ready',
		featured: true,
		countsToProgress: true,
	},
	{
		id: 'quicksort',
		number: '05',
		phase: 'Sorting & search',
		name: 'Quicksort',
		navLabel: 'Quicksort',
		pullQuote:
			'Partition around a pivot, then recurse. The split is the whole trick.',
		complexity: 'O(n log n) avg',
		// Searchable algorithm/concept names for the topic finder.
		keywords: 'partition, pivot, quickselect, randomized, average case',
		tokenId: 'quicksort',
		accent: topicAccent('quicksort'),
		icon: 'SplitSquareHorizontal',
		// The scroll-driven quicksort lesson: Lomuto partition, the pivot landing
		// in its final place, recursion on the two sides, and the worst-case
		// recurrence T(n) = T(n-1) + n set beside the Master Theorem's 2T(n/2)+n.
		to: '/lessons/quicksort',
		status: 'ready',
		countsToProgress: true,
	},
	{
		id: 'linear-time-sorting',
		number: '06',
		phase: 'Sorting & search',
		name: 'Linear-time sorting',
		navLabel: 'Linear-time sort',
		pullQuote:
			'Beat n log n by not comparing at all — when the keys cooperate.',
		complexity: 'O(n + k)',
		// Searchable algorithm/concept names for the topic finder.
		keywords: 'counting sort, radix sort, bucket sort, non-comparison sorting',
		tokenId: 'linsort',
		accent: topicAccent('linsort'),
		icon: 'ArrowDownNarrowWide',
		to: '/linear-time-sorting',
		status: 'ready',
		countsToProgress: true,
	},
	{
		id: 'hashing',
		number: '07',
		phase: 'Sorting & search',
		name: 'Hashing',
		navLabel: 'Hash maps',
		pullQuote: 'Constant-time lookup, when collisions cooperate.',
		complexity: 'O(1) avg',
		// Searchable algorithm/concept names for the topic finder.
		keywords:
			'hash tables, collisions, chaining, open addressing, load factor, resizing',
		tokenId: 'hashing',
		accent: topicAccent('hashing'),
		icon: 'Hash',
		to: '/hashmap',
		status: 'ready',
		countsToProgress: true,
	},
	{
		id: 'trees',
		number: '08',
		phase: 'Structures',
		name: 'Trees',
		navLabel: 'Trees',
		pullQuote:
			'Hierarchical order. The shape of every search you will ever write.',
		complexity: 'O(log n)',
		// Searchable algorithm/concept names for the topic finder.
		keywords:
			'binary search tree, BST, inorder, preorder, postorder, successor, insert, delete',
		tokenId: 'trees',
		accent: topicAccent('trees'),
		icon: 'GitBranch',
		to: '/tree',
		status: 'ready',
		countsToProgress: true,
	},
	{
		id: 'heaps',
		number: '09',
		phase: 'Structures',
		name: 'Heaps & priority queues',
		navLabel: 'Heaps',
		pullQuote:
			'A tree flattened into an array. Always hand back the best element next.',
		complexity: 'O(log n)',
		// Searchable algorithm/concept names for the topic finder.
		keywords:
			'heap, priority queue, heapify, build-heap, heapsort, extract-min',
		tokenId: 'heaps',
		accent: topicAccent('heaps'),
		icon: 'Triangle',
		to: '/heaps',
		status: 'ready',
		countsToProgress: true,
	},
	{
		id: 'graphs',
		number: '10',
		phase: 'Graphs',
		name: 'Graphs',
		navLabel: 'Graphs',
		pullQuote:
			'Nodes and edges. Half of computer science is reachable from here.',
		complexity: 'O(V + E)',
		// Searchable algorithm/concept names for the topic finder.
		keywords:
			'BFS, DFS, breadth-first, depth-first, topological sort, strongly connected components, Kosaraju, adjacency matrix, adjacency list',
		tokenId: 'graphs',
		accent: topicAccent('graphs'),
		icon: 'Network',
		to: '/graph',
		status: 'ready',
		countsToProgress: true,
	},
	{
		id: 'strategies',
		number: '11',
		phase: 'Graphs',
		name: 'Strategies',
		navLabel: 'Strategies',
		pullQuote:
			'Greedy, divide and conquer, dynamic programming. When to choose what.',
		complexity: '—',
		// Searchable algorithm/concept names for the topic finder.
		keywords:
			'greedy, dynamic programming, DP, Huffman coding, 0/1 knapsack, fractional knapsack, longest common subsequence, LCS, rod cutting, coin change, interval scheduling, activity selection, stable matching, memoization',
		tokenId: 'strategies',
		accent: topicAccent('strategies'),
		icon: 'Brain',
		to: '/strategies',
		status: 'ready',
		countsToProgress: true,
	},
	{
		id: 'mst',
		number: '12',
		phase: 'Graphs',
		name: 'Minimum spanning trees',
		navLabel: 'Spanning trees',
		pullQuote:
			'Connect everything for the least total weight. Greedy, and provably right.',
		complexity: 'O(E log V)',
		// Searchable algorithm/concept names for the topic finder.
		keywords:
			'Kruskal, Prim, union-find, disjoint sets, cut property, safe edges',
		tokenId: 'mst',
		accent: topicAccent('mst'),
		icon: 'Share2',
		to: '/mst',
		status: 'ready',
		countsToProgress: true,
	},
	{
		id: 'shortest-paths',
		number: '13',
		phase: 'Graphs',
		name: 'Shortest paths (single-source)',
		navLabel: 'Shortest paths',
		pullQuote:
			'One source, every destination — relax edges until nothing improves.',
		complexity: 'O((V + E) log V)',
		// Searchable algorithm/concept names for the topic finder.
		keywords:
			'Dijkstra, Bellman-Ford, DAG shortest path, relaxation, negative edges, SSSP',
		tokenId: 'sssp',
		accent: topicAccent('sssp'),
		icon: 'Route',
		to: '/shortest-paths',
		status: 'ready',
		countsToProgress: true,
	},
	{
		id: 'apsp',
		number: '14',
		phase: 'Graphs',
		name: 'All-pairs shortest paths',
		navLabel: 'All-pairs SP',
		pullQuote:
			'Every shortest route at once, through dynamic programming on intermediates.',
		complexity: 'O(V³)',
		// Searchable algorithm/concept names for the topic finder.
		keywords:
			'Floyd-Warshall, slow and faster APSP, transitive closure, distance matrix',
		tokenId: 'apsp',
		accent: topicAccent('apsp'),
		icon: 'Grid3x3',
		to: '/all-pairs-shortest-paths',
		status: 'ready',
		countsToProgress: true,
	},
	{
		id: 'max-flow',
		number: '15',
		phase: 'Graphs',
		name: 'Maximum flow',
		navLabel: 'Max flow',
		pullQuote:
			'How much can a network carry? Push, find residuals, and cut the bottleneck.',
		complexity: 'O(V·E²)',
		// Searchable algorithm/concept names for the topic finder.
		keywords:
			'Ford-Fulkerson, Edmonds-Karp, min cut, residual network, augmenting paths, bipartite matching',
		tokenId: 'maxflow',
		accent: topicAccent('maxflow'),
		icon: 'Workflow',
		to: '/max-flow',
		status: 'ready',
		countsToProgress: true,
	},
	{
		id: 'np-completeness',
		number: '16',
		phase: 'Intractability',
		name: 'NP-completeness',
		navLabel: 'NP-completeness',
		pullQuote:
			'The line between "hard to solve" and "easy to check" — and reductions across it.',
		complexity: 'P vs NP',
		// Searchable algorithm/concept names for the topic finder.
		keywords:
			'P vs NP, NP-hard, reductions, SAT, 3-SAT, clique, vertex cover, Hamiltonian cycle, subset sum',
		tokenId: 'npc',
		accent: topicAccent('npc'),
		icon: 'Puzzle',
		to: '/np-completeness',
		status: 'ready',
		countsToProgress: true,
		lessonTrace: 'model',
	},
];

export const TOPIC_BY_ID = Object.fromEntries(
	CURRICULUM.map(topic => [topic.id, topic])
);

export const TOPIC_BY_ROUTE = Object.fromEntries(
	// A route may be shared (foundations aliases /stacks-queues); the first
	// real ('ready') topic for a route wins so chrome shows the right title.
	// 'soon' placeholders have no route (to: null) and are skipped.
	CURRICULUM.filter(topic => topic.to).reduce((acc, topic) => {
		const existing = acc.find(([route]) => route === topic.to);
		if (!existing) acc.push([topic.to, topic]);
		else if (existing[1].status !== 'ready' && topic.status === 'ready')
			existing[1] = topic;
		return acc;
	}, [])
);

export const FIRST_TOPIC = CURRICULUM[0];

// Topics with a real lesson surface (ready/preview) — navigable. Excludes the
// locked 'soon' placeholders.
export const BUILT_TOPICS = CURRICULUM.filter(topic => topic.status !== 'soon');

// Topics that count toward overall progress (excludes preview aliases and the
// locked 'soon' placeholders — so the denominator is always only what's built).
export const PROGRESS_TOPICS = CURRICULUM.filter(
	topic => topic.countsToProgress
);
