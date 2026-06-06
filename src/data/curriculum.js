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
//   status      'ready' | 'preview'
//   featured    optional — highlighted on the curriculum map
//   countsToProgress  whether the topic participates in overall progress
//                     (preview entries that just alias another topic do not)

const topicAccent = tokenId => `var(--topic-${tokenId})`;

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
		id: 'hashing',
		number: '05',
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
		number: '06',
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
		id: 'graphs',
		number: '07',
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
		number: '08',
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
];

export const TOPIC_BY_ID = Object.fromEntries(
	CURRICULUM.map(topic => [topic.id, topic])
);

export const TOPIC_BY_ROUTE = Object.fromEntries(
	// A route may be shared (foundations aliases /stacks-queues); the first
	// real ('ready') topic for a route wins so chrome shows the right title.
	CURRICULUM.reduce((acc, topic) => {
		const existing = acc.find(([route]) => route === topic.to);
		if (!existing) acc.push([topic.to, topic]);
		else if (existing[1].status !== 'ready' && topic.status === 'ready')
			existing[1] = topic;
		return acc;
	}, [])
);

export const FIRST_TOPIC = CURRICULUM[0];

// Topics that count toward overall progress (excludes preview aliases).
export const PROGRESS_TOPICS = CURRICULUM.filter(
	topic => topic.countsToProgress
);
