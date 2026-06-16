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
test('decisionCards covers the three exam decisions', () => {
	assert.deepEqual(
		decisionCards.map(c => c.id),
		['sssp', 'mst', 'traversal']
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
