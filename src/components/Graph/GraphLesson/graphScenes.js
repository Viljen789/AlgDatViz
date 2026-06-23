// The scrolly scenes that build graph intuition before the playground takes
// over. They walk from "what is a graph" → the two representations → how a
// traversal's frontier decides visit order (BFS layers vs DFS depth).
//
// Each scene carries a `check` — a small comprehension question answered before
// scrolling on. Wrong answers are never punished: the explanation reveals
// regardless of correctness, so every attempt is a teaching moment.
//
// The stage (GraphStage) reads `activeScene` and renders a matching view of the
// SAME small graph defined below, so the prose and the picture stay in lockstep.

import { createGraphAlgorithmSteps } from '../../../utils/graphAlgorithms.js';
import { topoSort } from '../topoSort.js';
import { genericTraverse } from '../oneFrontier.js';
import { bfsDequeueProbe } from '../../../data/traceProbes.js';

// A compact 6-node teaching graph. Positions are chosen so the BFS layers from
// A read cleanly left-to-right: layer 0 = A, layer 1 = {B, C}, layer 2 = {D, E},
// layer 3 = {F}. Adjacency is sorted alphabetically, which fixes a deterministic
// visit order for both BFS and DFS.
export const LESSON_GRAPH = {
	nodes: [
		{ id: 'A', label: 'A', x: 60, y: 110 },
		{ id: 'B', label: 'B', x: 170, y: 50 },
		{ id: 'C', label: 'C', x: 170, y: 170 },
		{ id: 'D', label: 'D', x: 290, y: 50 },
		{ id: 'E', label: 'E', x: 290, y: 170 },
		{ id: 'F', label: 'F', x: 400, y: 110 },
	],
	edges: [
		{ from: 'A', to: 'B' },
		{ from: 'A', to: 'C' },
		{ from: 'B', to: 'D' },
		{ from: 'C', to: 'E' },
		{ from: 'D', to: 'F' },
		{ from: 'E', to: 'F' },
	],
};

// Derive the true visit order straight from the algorithm's step output, so the
// retrieval check below is graded against what BFS/DFS actually do — nothing is
// hand-fabricated. We read the first time each node becomes "active" across the
// real steps (createGraphAlgorithmSteps from utils/graphAlgorithms.js).
const visitOrderFromSteps = algorithmId => {
	const steps = createGraphAlgorithmSteps(LESSON_GRAPH, algorithmId, {
		startNodeId: 'A',
	});
	const order = [];
	const seen = new Set();
	steps.forEach(step => {
		// A node is "visited" the first time it appears in the visited set.
		(step.visitedNodes || []).forEach(id => {
			if (!seen.has(id)) {
				seen.add(id);
				order.push(id);
			}
		});
	});
	return order;
};

// BFS from A, neighbours visited in alphabetical order:
//   A → B → C → D → E → F  (layer by layer)
export const BFS_ORDER = visitOrderFromSteps('bfs');

// DFS from A, newest-first, neighbours pushed in alphabetical order so the
// alphabetically-later neighbour is popped first; with this graph the run is:
//   A → B → D → F → E → C
export const DFS_ORDER = visitOrderFromSteps('dfs');

// ─────────────────────────────────────────────────────────────────────────────
// Trace-step probe: "which vertex does BFS DEQUEUE next?"
//
// The same frozen-frame mechanic the exam grades (data/traceProbes.js plus the exam
// SP-BFS problem), brought into the lesson on the lesson's OWN graph (LESSON_GRAPH),
// so the frozen queue the student reads is exactly the frontier this graph produces.
// We run the shared frontier generator (genericTraverse, discipline 'fifo') and
// freeze the beat just before the 2nd dequeue (ordinal 1, where the queue already
// holds more than one waiting vertex so the FIFO front is non-trivial). The answer
// is read off the next extract frame, never typed. The frozen frame becomes the
// question canvas (StepProbeFrame renders view.kind 'bfs-dequeue').
const BFS_IDS = LESSON_GRAPH.nodes.map(n => n.id).sort(); // ['A'..'F']
const BFS_RUN = genericTraverse(LESSON_GRAPH, {
	discipline: 'fifo',
	start: 'A',
});
const BFS_PROBE = bfsDequeueProbe(BFS_RUN, BFS_IDS, 1);

// The frozen FIFO queue, front to rear (derived from the frame), so the distractor
// lines below quote the real frontier rather than a hand-typed picture.
const BFS_QUEUE = (BFS_PROBE.frozen.frontier || []).map(item => item.id);

// One misconception line per OTHER option (every distractor), keyed by String(id),
// each explaining why that vertex is NOT the next dequeue: a FIFO queue serves the
// FRONT, so a vertex behind the front (or not in the queue at all) has to wait. The
// queue positions come from the frozen frame, so no distractor line is fabricated.
const BFS_MISCONCEPTIONS = Object.fromEntries(
	BFS_PROBE.options
		.filter(id => id !== BFS_PROBE.answer)
		.map(id => {
			const pos = BFS_QUEUE.indexOf(id);
			const here =
				pos === -1
					? `${id} is not in the queue yet, so it has not been discovered and cannot be dequeued`
					: `${id} is behind ${BFS_PROBE.answer} in the queue (position ${pos + 1}, not the front)`;
			return [
				String(id),
				`${here}. A FIFO queue hands back the vertex that has waited LONGEST, the front ${BFS_PROBE.answer}, so it leaves before ${id}.`,
			];
		})
);

// ── A separate DIRECTED ACYCLIC graph, for the topological-sort scene only ──────
//
// The LESSON_GRAPH above is UNDIRECTED (GraphStage's adjacency pushes both
// directions, and its matrix is symmetric), so it has no topological order. The
// topo scene needs a DAG, so it carries its own tiny one. Five nodes, six
// directed edges, laid out strictly left-to-right so every arrow points forward
// — the picture IS the ordering. Designed to have EXACTLY ONE source (A, the only
// in-degree-0 vertex) so "which node comes first?" has one unambiguous answer.
//
//   A→B  A→C  B→D  C→D  C→E  D→E
//
// Every edge goes from an earlier letter to a later one, so the graph is acyclic
// by construction; topoSort confirms hasCycle === false below.
export const TOPO_GRAPH = {
	nodes: [
		{ id: 'A', label: 'A', x: 55, y: 110 },
		{ id: 'B', label: 'B', x: 165, y: 50 },
		{ id: 'C', label: 'C', x: 165, y: 170 },
		{ id: 'D', label: 'D', x: 290, y: 110 },
		{ id: 'E', label: 'E', x: 405, y: 110 },
	],
	edges: [
		{ from: 'A', to: 'B' },
		{ from: 'A', to: 'C' },
		{ from: 'B', to: 'D' },
		{ from: 'C', to: 'D' },
		{ from: 'C', to: 'E' },
		{ from: 'D', to: 'E' },
	],
};

// Run the REAL Kahn's-algorithm generator on the DAG so every fact the scene
// asserts (the order, the in-degrees, the unique source, whether a cycle exists)
// is derived, never hand-typed — same discipline as the exam answer keys.
//   order    : ['A','B','C','D','E']  (smallest-id tie-break)
//   indegree : { A:0, B:1, C:1, D:2, E:2 }
//   hasCycle : false
const TOPO_RESULT = topoSort(
	TOPO_GRAPH.nodes.map(n => n.id),
	TOPO_GRAPH.edges
);
export const TOPO_ORDER = TOPO_RESULT.order;

// The unique in-degree-0 vertex — the only node that can legally come first in
// ANY topological order. Derived from the in-degrees so it stays correct if the
// DAG is ever edited (and a single source keeps the "first?" check unambiguous).
const TOPO_SOURCES = TOPO_GRAPH.nodes
	.map(n => n.id)
	.filter(id => TOPO_RESULT.indegree[id] === 0);
export const TOPO_SOURCE = TOPO_SOURCES[0];

// ── The "predict the next emission" beat ───────────────────────────────────────
//
// The scene above asks a STATIC question (which vertex is the source). This one
// runs the algorithm one more turn: Kahn's has already emitted the source and
// deleted its out-edges, so which vertex comes out NEXT? That is the second
// element of the real Kahn order — derived, never typed.
//   TOPO_ORDER = ['A','B','C','D','E']  →  source A out, B is next.
export const TOPO_NEXT = TOPO_ORDER[1];

// The in-degrees AFTER the source's out-edges are removed (the working state Kahn's
// reads when it picks the 2nd vertex). Start from the pristine in-degrees and
// decrement each successor of the source by one, exactly the removal step the
// generator performs. Derived so the distractor lines below quote the real counts.
const TOPO_INDEGREE_AFTER_SOURCE = (() => {
	const remaining = { ...TOPO_RESULT.indegree };
	TOPO_GRAPH.edges.forEach(({ from, to }) => {
		if (from === TOPO_SOURCE) remaining[to] -= 1;
	});
	return remaining;
})();

// One misconception line per OTHER option, keyed by id, derived from the
// after-removal in-degrees so no line is hand-fabricated. A vertex is NOT the next
// emission either because it is still blocked (in-degree > 0 → an unmet
// prerequisite remains) or because it is ready but loses the smallest-id tie-break
// to TOPO_NEXT (the deterministic rule the generator uses).
const TOPO_NEXT_OPTIONS = ['B', 'C', 'D', 'E'];
const TOPO_NEXT_MISCONCEPTIONS = Object.fromEntries(
	TOPO_NEXT_OPTIONS.filter(id => id !== TOPO_NEXT).map(id => {
		const deg = TOPO_INDEGREE_AFTER_SOURCE[id];
		const line =
			deg > 0
				? `${id} still has in-degree ${deg} after ${TOPO_SOURCE} is removed, so an edge still points into it — it is not free yet and Kahn's cannot emit it.`
				: `${id} IS free now (in-degree 0), but ${TOPO_NEXT} is too, and the deterministic rule emits the smallest-id ready vertex first — ${TOPO_NEXT} before ${id}.`;
		return [String(id), line];
	})
);

export const SCENES = [
	{
		id: 'nodes-edges',
		eyebrow: 'Setup',
		title: 'A graph is just nodes joined by edges.',
		body: 'Six nodes, six edges. No order, no root, no rows — only what connects to what. Almost every relationship in computing is a graph hiding in plain sight.',
		check: {
			kind: 'choice',
			prompt: 'How many neighbours does node A have in this graph?',
			options: [1, 2, 3, 6],
			answer: 2,
			misconceptions: {
				1: 'You counted one edge and stopped. A sits on two edges, A–B and A–C, so both B and C are neighbours.',
				3: 'You likely counted a node two edges away, such as D, as if it touched A. Degree counts only the nodes one edge from A, which are B and C.',
				6: '6 is the total node count, not A’s neighbours. Degree counts the edges touching A, which is 2.',
			},
			explanation:
				'A connects to B and C, so it has degree 2. A node’s neighbours are exactly the nodes one edge away — that adjacency is the only thing every graph algorithm ever asks about.',
		},
	},
	{
		id: 'representations',
		eyebrow: 'Representation',
		title: 'Store it as a list, or as a matrix.',
		body: 'An adjacency list keeps, per node, just its neighbours — compact when edges are sparse. An adjacency matrix marks every possible pair with a 0 or 1 — instant lookups, but n² cells whether or not the edges exist.',
		check: {
			kind: 'choice',
			prompt:
				'For a graph with few edges (sparse), which representation usually wastes the least memory?',
			options: [
				'Adjacency list',
				'Adjacency matrix',
				'Always equal',
				'Neither',
			],
			answer: 'Adjacency list',
			misconceptions: {
				'Adjacency matrix':
					'You may be picturing the matrix’s fast lookups, but speed is not memory. A matrix reserves V² cells no matter how few edges exist, so on a sparse graph most of those cells sit at 0 and waste space.',
				'Always equal':
					'The two representations are not interchangeable on cost. A list grows with the edges you actually have, O(V + E), while a matrix is fixed at V² regardless, so on a sparse graph they diverge sharply.',
				Neither:
					'There is a clear winner here. When edges are few, the list stores only what exists and the matrix still pays for every possible pair, so the list wastes less.',
			},
			explanation:
				'A list stores only the edges that exist — O(V + E) space. A matrix always reserves V² cells, so a sparse graph leaves most of them at 0. Matrices win only when the graph is dense or you need O(1) “is there an edge?” checks.',
		},
	},
	{
		id: 'frontier',
		eyebrow: 'Traversal',
		title: 'A traversal keeps a frontier of what to explore next.',
		body: 'Start at A and mark it. The frontier is the set of nodes waiting their turn. Which one you take next is the only real choice — and that single decision is the whole difference between BFS and DFS.',
		check: {
			kind: 'choice',
			prompt:
				'A traversal has started at A and marked it. What does the frontier hold next?',
			options: ['A', 'B and C', 'D and E', 'Every node'],
			answer: 'B and C',
			misconceptions: {
				A: 'A is already marked, so it has left the frontier rather than waiting in it. The frontier holds the nodes discovered but not yet visited, which after A are its neighbours B and C.',
				'D and E':
					'D and E are two edges from A, so they are not reachable yet. The frontier only ever holds nodes adjacent to what has already been visited, and right now that is just A’s neighbours B and C.',
				'Every node':
					'A traversal discovers nodes gradually, not all at once. The frontier grows one edge at a time, so just after A it holds only A’s direct neighbours, B and C.',
			},
			explanation:
				'After A is marked, its unvisited neighbours B and C enter the frontier. They are the only nodes one edge away, so they are the candidates for the next visit — whichever order you pull them in.',
		},
	},
	{
		id: 'bfs',
		eyebrow: 'Breadth-first',
		title: 'BFS uses a queue — oldest out first — so it spreads in layers.',
		body: 'A queue hands back the node that has waited longest. Everything at distance 1 is dequeued before anything at distance 2, so BFS fans outward one ring at a time. That layer order is exactly why BFS finds shortest unweighted paths.',
		check: {
			kind: 'choice',
			prompt:
				'BFS from A has visited A, then B, then C. With a queue (alphabetical neighbours), which node does it visit next?',
			options: ['D', 'E', 'F', 'A'],
			answer: 'D',
			misconceptions: {
				E: 'E is C’s neighbour, and C was queued after B. A queue serves the longest waiter first, so B is dequeued before C, and B’s neighbour D is visited ahead of E.',
				F: 'F sits two layers out, at distance 3 from A. A queue finishes every node at distance 2 before reaching distance 3, so D comes well before F.',
				A: 'A was the very first node out of the queue and is already visited, so it cannot be visited again. The queue moves forward to B’s unvisited neighbour D.',
			},
			explanation:
				'B was queued before C, so B is dequeued first; its unvisited neighbour D enters the queue ahead of C’s neighbour E. The queue preserves arrival order, so the visit sequence is A, B, C, D, E, F — strictly by distance from A.',
		},
	},
	{
		id: 'bfs-probe',
		eyebrow: 'Breadth-first, trace it',
		title: 'Now read the next dequeue off the real queue.',
		body: 'The exam grades exactly this skill: freeze BFS mid-run and ask what leaves the queue next. Below is the algorithm’s REAL state on this graph: the FIFO queue, front to rear, and the visited set. No prose to lean on, just the frontier the loop sees. Pick the vertex BFS dequeues next, then check yourself.',
		check: {
			kind: 'stepProbe',
			// The frozen frame IS the question, stored verbatim from the generator's
			// frame, so StepProbeFrame depicts the algorithm's real queue, not a sketch.
			frame: BFS_PROBE.frozen,
			view: {
				kind: 'bfs-dequeue',
				ids: BFS_IDS,
				start: 'A',
				nextLabel: 'dequeues next',
			},
			prompt:
				'BFS is mid-run from A, using a FIFO queue frontier. From the queue ' +
				'shown, which vertex does BFS DEQUEUE (remove from the front) next?',
			options: BFS_PROBE.options,
			answer: BFS_PROBE.answer,
			misconceptions: BFS_MISCONCEPTIONS,
			explanation: `A FIFO queue hands back the vertex that has waited longest, the FRONT of the queue. Here the front is ${BFS_PROBE.answer}, so BFS dequeues it next and then considers its neighbours. The queue shown is the generator’s real frontier, the same read-off the exam asks for, one decision at a time.`,
		},
	},
	{
		id: 'bfs-order',
		eyebrow: 'Recall',
		title: 'Now you place the order.',
		body: 'You have seen the queue spread A outward in layers. Reconstruct it yourself: arrange the six nodes into the exact sequence BFS visits them, starting from A with neighbours taken alphabetically.',
		check: {
			kind: 'order',
			prompt:
				'Drag the nodes into the order BFS visits them, starting at A (alphabetical neighbours).',
			// `items` is the shuffled pool the learner reorders; `answer` is the
			// true BFS visit order, derived above from the real algorithm steps.
			items: ['C', 'A', 'E', 'B', 'F', 'D'],
			answer: BFS_ORDER,
			explanation:
				'BFS pulls nodes from a FIFO queue, so it finishes an entire distance layer before the next one: A (layer 0), then B and C (layer 1), then D and E (layer 2), then F (layer 3). The sequence is A, B, C, D, E, F — strictly by distance from the start.',
		},
	},
	{
		id: 'dfs',
		eyebrow: 'Depth-first',
		title: 'DFS uses a stack — newest out first — so it plunges deep.',
		body: 'A stack hands back the node added most recently. DFS commits to one branch until it dead-ends, then backtracks to the last fork. It does not measure distance — it reveals reachability, components, and cycles.',
		check: {
			kind: 'choice',
			prompt:
				'Swap the queue for a stack. Starting at A → B, which node does DFS dive to before it ever touches C?',
			options: ['C', 'D', 'E', 'It visits C next'],
			answer: 'D',
			misconceptions: {
				C: 'That is the breadth-first instinct of finishing A’s neighbours first. A stack serves the newest node, so after stepping to B, DFS dives into B’s branch and reaches D long before it returns to C.',
				E: 'E lives at the far end of B’s branch, past D and F. DFS reaches it eventually, but it descends into D first, since D is the neighbour pushed most recently from B.',
				'It visits C next':
					'That would be breadth-first behaviour. A stack returns the newest node rather than the oldest, so DFS commits to B’s branch through D before it ever backtracks to C.',
			},
			explanation:
				'A stack returns the newest node, so after pushing B’s neighbours DFS dives into D, then F, then back up to E — exploring B’s whole branch before it ever returns to C. Same graph, same start, completely different order: the data structure is the algorithm.',
		},
	},
	{
		id: 'one-frontier',
		eyebrow: 'The unifying idea',
		title:
			'One loop, one frontier — swap its discipline, change the algorithm.',
		body: 'BFS and DFS were the same loop with a different frontier. Push that further: key the frontier by tentative distance and the same loop becomes Dijkstra; key it by the lightest crossing edge and it becomes Prim’s MST. The only line that ever changes is extract() — which vertex leaves the frontier next. The interactive below the playground runs all four from one loop.',
		check: {
			kind: 'classify',
			prompt:
				'Match each frontier discipline to the algorithm the one loop becomes.',
			items: [
				{ id: 'fifo', label: 'FIFO queue (oldest out)' },
				{ id: 'lifo', label: 'LIFO stack (newest out)' },
				{ id: 'mindist', label: 'min priority queue keyed by distance' },
				{
					id: 'minedge',
					label: 'min priority queue keyed by crossing-edge weight',
				},
			],
			categories: [
				{ id: 'bfs', label: 'BFS' },
				{ id: 'dfs', label: 'DFS' },
				{ id: 'dijkstra', label: 'Dijkstra' },
				{ id: 'prim', label: 'Prim (MST)' },
			],
			answer: {
				fifo: 'bfs',
				lifo: 'dfs',
				mindist: 'dijkstra',
				minedge: 'prim',
			},
			explanation:
				'All four are one generic traversal: init the frontier with the start, then repeatedly extract a vertex, settle it, and offer its neighbours back to the frontier. Only extract() differs — FIFO → BFS, LIFO → DFS, min-distance → Dijkstra, min-edge → Prim. The frontier discipline is the algorithm.',
		},
	},
	{
		id: 'topo-sort',
		eyebrow: 'Ordering',
		title: 'Topological sort: line the nodes up so every arrow points forward.',
		body: 'Switch to a DIRECTED graph. A topological order is a single line of the vertices where, for every edge u → v, u sits before v — no arrow ever points backward. Two ways to build one: repeatedly remove a node with in-degree 0 (no unmet prerequisite — that is Kahn’s algorithm), or list the vertices by DECREASING DFS finish time. Only a DAG has one: a single cycle makes it impossible, because each node on the cycle waits on another ahead of it. This ordering is the backbone of DAG shortest paths and of every dependency resolver — build systems, course prerequisites, spreadsheet recalculation.',
		check: {
			kind: 'choice',
			// Derived against topoSort: the answer is whichever vertex is the unique
			// in-degree-0 source, so it is read off the algorithm, not hand-typed.
			// (The DAG is built with exactly one source, so this has one answer that
			// holds for EVERY valid topological order, not just Kahn's tie-break.)
			prompt:
				'In this directed graph, which node must come FIRST in every topological order?',
			options: ['A', 'B', 'D', 'E'],
			answer: TOPO_SOURCE,
			misconceptions: {
				B: 'B has an incoming edge (A → B), so something must come before it — it cannot be first. The first node is the one with in-degree 0, no incoming arrows at all.',
				D: 'D depends on both B and C (B → D, C → D), so it waits until late in the order. A node can go first only when nothing points into it; D has in-degree 2.',
				E: 'E is the SINK — every path ends there (it has in-degree 2, from C and D), so it must come LAST, not first. First belongs to the in-degree-0 source.',
			},
			explanation: `Only ${TOPO_SOURCE} has in-degree 0 — no edge points into it, so it has no prerequisite and can be placed first; every other node has an incoming edge and must wait for its source. That is exactly the move Kahn’s algorithm repeats: emit an in-degree-0 vertex, delete its out-edges, and the next in-degree-0 node opens up.`,
		},
	},
	{
		id: 'topo-next',
		eyebrow: 'Run Kahn’s one turn',
		title: 'Now run one turn of Kahn’s — predict the next vertex out.',
		body: `Kahn's has already emitted ${TOPO_SOURCE} (it was the only in-degree-0 node) and deleted ${TOPO_SOURCE}'s out-edges. Removing those edges drops some downstream in-degrees to 0, opening the next batch of free vertices. Before the figure numbers them, commit: which vertex does Kahn's emit NEXT? Remember the tie-break — when several are free at once, it takes the SMALLEST id.`,
		check: {
			kind: 'predict',
			// Hold the stage's numbering until the learner commits, so the picture
			// can't spoil the answer (the Stage reads holdReveal for scene 9).
			revealGate: true,
			// Derived against topoSort: the answer is the SECOND vertex in the real
			// Kahn order — read off the algorithm one turn past the source, never typed.
			prompt: `${TOPO_SOURCE} has just been emitted and its out-edges removed. Which vertex does Kahn’s algorithm emit NEXT?`,
			options: TOPO_NEXT_OPTIONS,
			answer: TOPO_NEXT,
			misconceptions: TOPO_NEXT_MISCONCEPTIONS,
			explanation: `Removing ${TOPO_SOURCE}'s out-edges drops B and C to in-degree 0 — both become free at once. Kahn's breaks the tie by smallest id, so ${TOPO_NEXT} is emitted next; D and E still have incoming edges (in-degree 2) and must wait. The full order this DAG produces is ${TOPO_ORDER.join(' → ')}.`,
		},
	},
];

// The collapsible cheat-sheet shown in the hero (TopicTemplate `cheatSheet`).
// One key idea, then the two pairs students actually mix up: the storage choice
// (list vs matrix) and the traversal choice (BFS vs DFS). Runtimes are the same
// notation students must recall on the exam.
export const CHEAT_SHEET = {
	keyIdea:
		'A graph is just things and the links between them. The whole craft is choosing what to explore next. One generic loop with a swappable frontier discipline becomes four algorithms: FIFO queue → BFS, LIFO stack → DFS, min-distance PQ → Dijkstra, min-edge PQ → Prim. Only extract() — which vertex leaves the frontier next — ever changes.',
	sections: [
		{
			title: 'Representation',
			items: [
				{
					term: 'Adjacency list',
					def: 'Per node, store only its neighbours. O(V + E) space — compact for sparse graphs. Listing a node’s neighbours is O(degree).',
				},
				{
					term: 'Adjacency matrix',
					def: 'A V×V grid marking every possible pair. O(V²) space whether or not edges exist, but O(1) “is there an edge u–v?” lookups.',
				},
				{
					term: 'Which to pick',
					def: 'List for sparse graphs (E ≪ V²); matrix for dense graphs or when you need constant-time edge queries.',
				},
			],
		},
		{
			title: 'Traversal',
			items: [
				{
					term: 'BFS — queue (FIFO)',
					def: 'Oldest out first, so it fans out in layers. Finds shortest paths in unweighted graphs. O(V + E) time, O(V) space.',
				},
				{
					term: 'DFS — stack / recursion (LIFO)',
					def: 'Newest out first, so it plunges down one branch then backtracks. Reveals reachability, components, cycles, and edge types. O(V + E) time, O(V) space.',
				},
				{
					term: 'Both are O(V + E)',
					def: 'Each vertex is processed once and each edge inspected once. The frontier (queue or stack) holds up to V nodes.',
				},
			],
		},
		{
			title: 'One frontier, four algorithms',
			items: [
				{
					term: 'The generic loop',
					def: 'Seed the frontier with the start; while it is non-empty, extract a vertex, settle it, and offer each neighbour back to the frontier. Only extract() differs between algorithms.',
				},
				{
					term: 'FIFO queue → BFS',
					def: 'Extract the oldest waiting vertex. Spreads in layers → shortest unweighted paths.',
				},
				{
					term: 'LIFO stack → DFS',
					def: 'Extract the newest vertex. Plunges down one branch then backtracks.',
				},
				{
					term: 'min-distance PQ → Dijkstra',
					def: 'Extract the closest unsettled vertex (key = tentative distance). Non-negative weights only.',
				},
				{
					term: 'min-edge PQ → Prim',
					def: 'Extract the vertex across the lightest crossing edge (key = edge weight). Builds a minimum spanning tree.',
				},
			],
		},
	],
};
