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
//   name        full display name
//   navLabel    compact label for the sidebar
//   pullQuote   one-line "why this matters"
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

const topicAccent = tokenId => `var(--topic-${tokenId})`;

// The unbuilt back half of the TDT4120 curriculum, in course order. These are
// honest "coming soon" placeholders: locked, non-navigable, excluded from
// overall progress, and given a neutral/muted treatment (no per-topic hue is
// minted until the topic is actually built in Phase 1b/5). They keep the home
// curriculum map honest about full scope without claiming coverage we lack.
const comingSoon = (number, name, pullQuote, complexity) => ({
	id: `soon-${name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')}`,
	number,
	name,
	navLabel: name,
	pullQuote,
	complexity,
	tokenId: null,
	accent: 'var(--color-text-dim)',
	icon: 'Lock',
	to: null,
	status: 'soon',
	locked: true,
	countsToProgress: false,
});

export const CURRICULUM = [
	{
		id: 'foundations',
		number: '01',
		name: 'Arrays & complexity',
		navLabel: 'Foundations',
		pullQuote:
			'Where every algorithm lives. The cost of one operation, multiplied.',
		complexity: 'O(1) … O(n²)',
		tokenId: 'foundations',
		accent: topicAccent('foundations'),
		icon: 'Layers',
		// Foundations does not yet have a dedicated page; surface as the
		// playground for stacks/queues which is the closest existing primer.
		// Marked `preview` and excluded from overall progress so completing
		// stacks/queues doesn't double-count.
		to: '/stacks-queues',
		status: 'preview',
		countsToProgress: false,
	},
	{
		id: 'stacks-queues',
		number: '02',
		name: 'Stacks & queues',
		navLabel: 'Stacks / queues',
		pullQuote: 'The two simplest disciplines for "what to do next."',
		complexity: 'O(1)',
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
		name: 'Recursion & the master theorem',
		navLabel: 'Master theorem',
		pullQuote:
			'Why a problem solved by solving smaller versions of itself ever terminates.',
		complexity: 'T(n) = aT(n/b) + f(n)',
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
		name: 'Sorting',
		navLabel: 'Sorting',
		pullQuote: 'Five algorithms, one task. The differences are the lesson.',
		complexity: 'O(n log n)',
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
		id: 'linear-time-sorting',
		number: '05',
		name: 'Linear-time sorting',
		navLabel: 'Linear-time sort',
		pullQuote:
			'Beat n log n by not comparing at all — when the keys cooperate.',
		complexity: 'O(n + k)',
		tokenId: 'linsort',
		accent: topicAccent('linsort'),
		icon: 'ArrowDownNarrowWide',
		to: '/linear-time-sorting',
		status: 'ready',
		countsToProgress: true,
	},
	{
		id: 'hashing',
		number: '06',
		name: 'Hashing',
		navLabel: 'Hash maps',
		pullQuote: 'Constant-time lookup, when collisions cooperate.',
		complexity: 'O(1) avg',
		tokenId: 'hashing',
		accent: topicAccent('hashing'),
		icon: 'Hash',
		to: '/hashmap',
		status: 'ready',
		countsToProgress: true,
	},
	{
		id: 'trees',
		number: '07',
		name: 'Trees',
		navLabel: 'Trees',
		pullQuote:
			'Hierarchical order. The shape of every search you will ever write.',
		complexity: 'O(log n)',
		tokenId: 'trees',
		accent: topicAccent('trees'),
		icon: 'GitBranch',
		to: '/tree',
		status: 'ready',
		countsToProgress: true,
	},
	{
		id: 'heaps',
		number: '08',
		name: 'Heaps & priority queues',
		navLabel: 'Heaps',
		pullQuote:
			'A tree flattened into an array. Always hand back the best element next.',
		complexity: 'O(log n)',
		tokenId: 'heaps',
		accent: topicAccent('heaps'),
		icon: 'Triangle',
		to: '/heaps',
		status: 'ready',
		countsToProgress: true,
	},
	{
		id: 'graphs',
		number: '09',
		name: 'Graphs',
		navLabel: 'Graphs',
		pullQuote:
			'Nodes and edges. Half of computer science is reachable from here.',
		complexity: 'O(V + E)',
		tokenId: 'graphs',
		accent: topicAccent('graphs'),
		icon: 'Network',
		to: '/graph',
		status: 'ready',
		countsToProgress: true,
	},
	{
		id: 'strategies',
		number: '10',
		name: 'Strategies',
		navLabel: 'Strategies',
		pullQuote:
			'Greedy, divide and conquer, dynamic programming. When to choose what.',
		complexity: '—',
		tokenId: 'strategies',
		accent: topicAccent('strategies'),
		icon: 'Brain',
		to: '/strategies',
		status: 'ready',
		countsToProgress: true,
	},
	// ── Coming soon: the examinable back half, in course order. Locked, neutral
	//    treatment, excluded from progress. Built out in Phase 5 (course order,
	//    two topics per batch).
	{
		id: 'mst',
		number: '11',
		name: 'Minimum spanning trees',
		navLabel: 'Spanning trees',
		pullQuote:
			'Connect everything for the least total weight. Greedy, and provably right.',
		complexity: 'O(E log V)',
		tokenId: 'mst',
		accent: topicAccent('mst'),
		icon: 'Share2',
		to: '/mst',
		status: 'ready',
		countsToProgress: true,
	},
	{
		id: 'shortest-paths',
		number: '12',
		name: 'Shortest paths (single-source)',
		navLabel: 'Shortest paths',
		pullQuote:
			'One source, every destination — relax edges until nothing improves.',
		complexity: 'O((V + E) log V)',
		tokenId: 'sssp',
		accent: topicAccent('sssp'),
		icon: 'Route',
		to: '/shortest-paths',
		status: 'ready',
		countsToProgress: true,
	},
	comingSoon(
		'13',
		'All-pairs shortest paths',
		'Every shortest route at once, through dynamic programming on intermediates.',
		'O(V³)'
	),
	comingSoon(
		'14',
		'Maximum flow',
		'How much can a network carry? Push, find residuals, and cut the bottleneck.',
		'O(V·E²)'
	),
	comingSoon(
		'15',
		'NP-completeness',
		'The line between "hard to solve" and "easy to check" — and reductions across it.',
		'P vs NP'
	),
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
