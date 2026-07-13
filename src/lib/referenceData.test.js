import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	sortComparison,
	decisionCards,
	complexitySheet,
	greedyRule,
	glossaryTerms,
	glossarySections,
} from './referenceData.js';
import { ALGORITHM_INFO } from '../utils/sorting/algorithmInfo.js';
import { ALGORITHM_ORDER } from '../utils/sorting/algorithmMeta.js';
import { PROGRESS_TOPICS } from '../data/curriculum.js';
import { SSSP_ALGORITHMS } from '../components/ShortestPaths/ssspMeta.js';
import {
	STRATEGY_ALGORITHMS,
	STRATEGY_ALGORITHM_ORDER,
} from '../components/Strategies/strategiesMeta.js';
import { APSP_MODES } from '../components/AllPairsShortestPaths/apspMeta.js';
import { MAXFLOW_ALGORITHMS } from '../components/MaxFlow/maxFlowMeta.js';
import { EXAMPLES as MASTER_EXAMPLES } from '../components/MasterTheorem/masterMath.js';

// ── sortComparison ──────────────────────────────────────────────────────────
test('sortComparison covers every sort in ALGORITHM_ORDER, in order', () => {
	assert.equal(sortComparison.length, ALGORITHM_ORDER.length);
	assert.deepEqual(
		sortComparison.map(r => r.id),
		ALGORITHM_ORDER
	);
});

test('sortComparison reads name + best/average/worst + boolean properties', () => {
	for (const row of sortComparison) {
		const info = ALGORITHM_INFO[row.id];
		assert.equal(row.name, info.name);
		assert.equal(row.best, info.complexity.time.best);
		assert.equal(row.average, info.complexity.time.average);
		assert.equal(row.worst, info.complexity.time.worst);
		// Booleans, derived from the 0|1 properties — never a bare number.
		assert.equal(typeof row.stable, 'boolean');
		assert.equal(typeof row.inPlace, 'boolean');
		assert.equal(row.stable, info.properties.stable === 1);
		assert.equal(row.inPlace, info.properties.inPlace === 1);
	}
});

test('sortComparison reflects known facts (merge stable not in-place; quick in-place not stable)', () => {
	const merge = sortComparison.find(r => r.id === 'mergeSort');
	assert.equal(merge.stable, true);
	assert.equal(merge.inPlace, false);
	const quick = sortComparison.find(r => r.id === 'quickSort');
	assert.equal(quick.stable, false);
	assert.equal(quick.inPlace, true);
});

// ── decisionCards ───────────────────────────────────────────────────────────
test('decisionCards covers the seven exam decisions, in teaching order', () => {
	assert.deepEqual(
		decisionCards.map(c => c.id),
		['search', 'traversal', 'strategy', 'mst', 'sssp', 'apsp', 'maxflow']
	);
	// Teaching order: each card's topic appears no earlier in the curriculum
	// than the previous card's — the same order the complexity sheet walks.
	const order = PROGRESS_TOPICS.map(t => t.id);
	const positions = decisionCards.map(c => order.indexOf(c.topicId));
	assert.deepEqual(
		positions,
		[...positions].sort((a, b) => a - b)
	);
});

test('each decision card has a question and at least two options', () => {
	for (const card of decisionCards) {
		assert.equal(typeof card.title, 'string');
		assert.equal(typeof card.question, 'string');
		assert.ok(card.options.length >= 2, `${card.id} needs >= 2 options`);
		for (const opt of card.options) {
			assert.equal(typeof opt.when, 'string');
			assert.equal(typeof opt.pick, 'string');
			assert.equal(typeof opt.because, 'string');
			assert.ok(opt.because.length > 0);
		}
	}
});

test('decision cards point at real curriculum topics', () => {
	const ids = new Set(PROGRESS_TOPICS.map(t => t.id));
	for (const card of decisionCards) {
		assert.ok(ids.has(card.topicId), `${card.id} -> ${card.topicId}`);
	}
});

test('the SSSP card derives its picks from the meta booleans (drift-guarded)', () => {
	const sssp = decisionCards.find(c => c.id === 'sssp');
	const negatives = sssp.options.find(o => /negative edges/i.test(o.when));
	const dag = sssp.options.find(o => /DAG/i.test(o.when));
	const nonneg = sssp.options.find(o => /non-negative/i.test(o.when));
	// Each option must name the algorithm its deciding predicate selects. If a future
	// ssspMeta edit invalidated a rule (e.g. flipped dijkstra.handlesNegatives), this
	// fails here instead of silently misleading a student on the cheat sheet.
	assert.equal(negatives.pick, SSSP_ALGORITHMS.bellmanFord.name);
	assert.equal(dag.pick, SSSP_ALGORITHMS.dagShortestPaths.name);
	assert.equal(nonneg.pick, SSSP_ALGORITHMS.dijkstra.name);
	// The booleans that make those derivations valid (mutually exclusive, exhaustive).
	assert.ok(
		SSSP_ALGORITHMS.bellmanFord.handlesNegatives &&
			!SSSP_ALGORITHMS.bellmanFord.needsDag
	);
	assert.ok(SSSP_ALGORITHMS.dagShortestPaths.needsDag);
	assert.ok(!SSSP_ALGORITHMS.dijkstra.handlesNegatives);
});

test('the strategy card derives both rosters from the Strategies category tags', () => {
	const card = decisionCards.find(c => c.id === 'strategy');
	const greedyOpt = card.options.find(o => o.pick === 'Greedy');
	const dpOpt = card.options.find(o => o.pick === 'Dynamic programming');
	// Every problem the Strategies meta tags 'Greedy' or 'DP' must appear — name
	// AND complexity — under exactly that strategy, so a re-classified lesson
	// moves it here (or this fails loudly) rather than the card silently lying.
	for (const id of STRATEGY_ALGORITHM_ORDER) {
		const algo = STRATEGY_ALGORITHMS[id];
		if (algo.category === 'Greedy') {
			assert.ok(greedyOpt.because.includes(algo.name), `greedy: ${algo.name}`);
			assert.ok(greedyOpt.because.includes(algo.complexity));
			assert.ok(!dpOpt.because.includes(algo.name));
		} else if (algo.category === 'DP') {
			assert.ok(dpOpt.because.includes(algo.name), `dp: ${algo.name}`);
			assert.ok(dpOpt.because.includes(algo.complexity));
			assert.ok(!greedyOpt.because.includes(algo.name));
		}
	}
	// Coin change ('DP vs Greedy', the boundary lesson) lands in neither roster;
	// the card's note carries it instead.
	assert.ok(!greedyOpt.because.includes(STRATEGY_ALGORITHMS.coinChange.name));
	assert.ok(!dpOpt.because.includes(STRATEGY_ALGORITHMS.coinChange.name));
	assert.ok(card.note.includes(STRATEGY_ALGORITHMS.coinChange.name));
});

test('the APSP card derives Floyd-Warshall and the Dijkstra alternative from their metas', () => {
	const apsp = decisionCards.find(c => c.id === 'apsp');
	const fwOpt = apsp.options.find(
		o => o.pick === APSP_MODES.floydWarshall.name
	);
	assert.ok(fwOpt, 'an option must pick Floyd-Warshall by its meta name');
	assert.ok(fwOpt.because.includes(APSP_MODES.floydWarshall.complexity));
	const dijkstraOpt = apsp.options.find(o =>
		o.pick.includes(SSSP_ALGORITHMS.dijkstra.name)
	);
	assert.ok(dijkstraOpt, 'an option must pick Dijkstra-from-every-vertex');
	assert.ok(dijkstraOpt.because.includes(SSSP_ALGORITHMS.dijkstra.complexity));
	// The one-line matrix contrast carries both classical bounds.
	assert.ok(apsp.note.includes('Slow-APSP'));
	assert.ok(apsp.note.includes('Θ(V⁴)'));
	assert.ok(apsp.note.includes('Θ(V³ log V)'));
});

test('the max-flow card derives both algorithms from the max-flow meta', () => {
	const card = decisionCards.find(c => c.id === 'maxflow');
	const ff = card.options.find(
		o => o.pick === MAXFLOW_ALGORITHMS.fordFulkerson.name
	);
	const ek = card.options.find(
		o => o.pick === MAXFLOW_ALGORITHMS.edmondsKarp.name
	);
	assert.ok(ff, 'an option must pick Ford-Fulkerson by its meta name');
	assert.ok(ek, 'an option must pick Edmonds-Karp by its meta name');
	assert.ok(ff.because.includes(MAXFLOW_ALGORITHMS.fordFulkerson.complexity));
	assert.ok(ek.because.includes(MAXFLOW_ALGORITHMS.edmondsKarp.complexity));
	// The deciding facts: FF's bound scales with |f*|, EK's rests on BFS.
	assert.ok(ff.because.includes('|f*|'));
	assert.match(ek.because, /BFS/);
});

test('the search card anchors binary search to the master-theorem example', () => {
	const card = decisionCards.find(c => c.id === 'search');
	const bin = card.options.find(o => o.pick === 'Binary search');
	assert.ok(bin, 'an option must pick binary search');
	// The pick label is read off masterMath's worked examples, so a renamed
	// lesson example fails here instead of orphaning the card.
	assert.ok(MASTER_EXAMPLES.some(e => e.label === bin.pick));
	assert.match(bin.when, /sorted/i);
	assert.ok(bin.because.includes('O(log n)'));
	assert.match(bin.because, /halves/);
});

// ── complexitySheet ─────────────────────────────────────────────────────────
test('complexitySheet covers all progress topics, in teaching order', () => {
	assert.equal(complexitySheet.length, PROGRESS_TOPICS.length);
	assert.deepEqual(
		complexitySheet.map(t => t.id),
		PROGRESS_TOPICS.map(t => t.id)
	);
});

test('complexitySheet rows carry number, name, complexity, accent', () => {
	for (const row of complexitySheet) {
		const topic = PROGRESS_TOPICS.find(t => t.id === row.id);
		assert.equal(row.number, topic.number);
		assert.equal(row.name, topic.name);
		assert.equal(row.complexity, topic.complexity);
		assert.equal(row.accent, topic.accent);
		assert.match(row.accent, /^var\(--topic-/);
	}
});

// ── greedyRule ──────────────────────────────────────────────────────────────
test('greedyRule lists safe and unsafe cases, all anchored to topics', () => {
	assert.ok(greedyRule.safe.length >= 2);
	assert.ok(greedyRule.unsafe.length >= 2);
	const ids = new Set(PROGRESS_TOPICS.map(t => t.id));
	for (const item of [...greedyRule.safe, ...greedyRule.unsafe]) {
		assert.equal(typeof item.label, 'string');
		assert.equal(typeof item.why, 'string');
		assert.ok(ids.has(item.topicId), `greedy item -> ${item.topicId}`);
	}
});

test('greedyRule keeps MST safe and 0/1 knapsack unsafe', () => {
	assert.ok(greedyRule.safe.some(i => i.id === 'mst'));
	assert.ok(greedyRule.unsafe.some(i => i.id === 'knapsack'));
});

// DRIFT GUARD: the Strategies-backed items must carry the label and the
// headline complexity straight from STRATEGY_ALGORITHMS, so a renamed problem
// or a revised bound in the lesson meta changes the cheat sheet with it.
test('greedyRule covers the Strategies problems with their meta complexities', () => {
	const items = new Map(
		[...greedyRule.safe, ...greedyRule.unsafe].map(i => [i.id, i])
	);
	const expectations = [
		['interval', STRATEGY_ALGORITHMS.intervalScheduling, 'safe'],
		['huffman', STRATEGY_ALGORITHMS.huffman, 'safe'],
		['fractional', STRATEGY_ALGORITHMS.fractionalKnapsack, 'safe'],
		['knapsack', STRATEGY_ALGORITHMS.knapsack01, 'unsafe'],
		['lcs', STRATEGY_ALGORITHMS.lcs, 'unsafe'],
		['rod', STRATEGY_ALGORITHMS.rodCutting, 'unsafe'],
	];
	for (const [id, meta, side] of expectations) {
		const item = items.get(id);
		assert.ok(item, `missing greedyRule item: ${id}`);
		assert.ok(
			greedyRule[side].includes(item),
			`${id} belongs on the ${side} side`
		);
		assert.equal(item.label, meta.name);
		assert.ok(
			item.why.includes(meta.complexity),
			`${id} why must carry ${meta.complexity}`
		);
	}
});

// ── glossary ────────────────────────────────────────────────────────────────
// COVERAGE GUARDRAIL: the bilingual exam glossary must keep a term pair for every
// curriculum topic. A new topic in curriculum.js with no Norwegian vocabulary
// authored for it fails HERE, so the glossary can never silently fall behind the
// course it is meant to translate.
test('glossary covers every progress topic with at least one term pair', () => {
	const tagged = new Set(glossaryTerms.map(t => t.topicId));
	const missing = PROGRESS_TOPICS.filter(t => !tagged.has(t.id)).map(t => t.id);
	assert.deepEqual(
		missing,
		[],
		`topics with no glossary term pair: ${missing.join(', ')}`
	);
});

test('every glossary term is tagged with a real curriculum topic', () => {
	const ids = new Set(PROGRESS_TOPICS.map(t => t.id));
	for (const term of glossaryTerms) {
		assert.ok(ids.has(term.topicId), `unknown topicId: ${term.topicId}`);
	}
});

test('every glossary term has non-empty English + Norwegian strings', () => {
	for (const term of glossaryTerms) {
		assert.equal(typeof term.en, 'string');
		assert.equal(typeof term.no, 'string');
		assert.ok(term.en.trim().length > 0, `empty en for ${term.topicId}`);
		assert.ok(term.no.trim().length > 0, `empty no for ${term.en}`);
		// `note` is optional, but when present it must be a real string.
		if (term.note !== undefined) {
			assert.equal(typeof term.note, 'string');
			assert.ok(term.note.trim().length > 0);
		}
	}
});

// The pensum vocabulary the Strategies + SCC lessons lean on must stay in the
// glossary, paired with the Norwegian term the exam actually prints.
test('glossary carries the strategies and SCC pensum term pairs', () => {
	const noFor = en => glossaryTerms.find(t => t.en === en)?.no;
	assert.equal(noFor('prefix code'), 'prefikskode');
	assert.equal(noFor('greedy-choice property'), 'grådighetsegenskapen');
	assert.equal(noFor('optimal substructure'), 'optimal delstruktur');
	assert.equal(
		noFor('strongly connected component'),
		'sterkt sammenhengende komponent'
	);
	assert.equal(noFor('memoization'), 'memoisering');
});

// Likewise for the DFS-edge, DP, max-flow and NP vocabulary the later topics
// lean on — each paired with the Norwegian term the exam actually prints.
test('glossary carries the DFS-edge, max-flow and NP pensum term pairs', () => {
	const noFor = en => glossaryTerms.find(t => t.en === en)?.no;
	assert.equal(noFor('back edge'), 'bakoverkant');
	assert.equal(noFor('subproblem graph'), 'delinstansgraf');
	assert.equal(noFor('bottleneck (of an augmenting path)'), 'flaskehals');
	assert.equal(noFor('antiparallel edges'), 'antiparallelle kanter');
	assert.equal(noFor('linear programming'), 'lineær programmering');
	assert.equal(noFor('co-NP'), 'co-NP');
	assert.equal(noFor('pseudopolynomial time'), 'pseudopolynomisk tid');
	// The exam-relevant facts ride along as notes.
	const noteFor = en => glossaryTerms.find(t => t.en === en)?.note ?? '';
	assert.match(noteFor('back edge'), /cycle/);
	assert.match(noteFor('antiparallel edges'), /intermediate vertex/);
	assert.match(noteFor('linear programming'), /shortest paths and max flow/);
});

test('glossarySections group the flat terms, in teaching order, none empty', () => {
	// Sections appear in PROGRESS_TOPICS order (every topic currently has a pair,
	// so the section order is exactly the curriculum order here).
	const coveredTopicsInOrder = PROGRESS_TOPICS.map(t => t.id).filter(id =>
		glossaryTerms.some(term => term.topicId === id)
	);
	assert.deepEqual(
		glossarySections.map(s => s.id),
		coveredTopicsInOrder
	);
	// No section is rendered empty, and the grouping loses no terms.
	let regrouped = 0;
	for (const section of glossarySections) {
		assert.ok(section.terms.length > 0, `empty section: ${section.id}`);
		assert.ok(section.terms.every(t => t.topicId === section.id));
		assert.match(section.accent, /^var\(--topic-/);
		regrouped += section.terms.length;
	}
	assert.equal(regrouped, glossaryTerms.length);
});
