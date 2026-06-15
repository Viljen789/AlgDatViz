import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	sortComparison,
	decisionCards,
	complexitySheet,
	greedyRule,
} from './referenceData.js';
import { ALGORITHM_INFO } from '../utils/sorting/algorithmInfo.js';
import { ALGORITHM_ORDER } from '../utils/sorting/algorithmMeta.js';
import { PROGRESS_TOPICS } from '../data/curriculum.js';

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

test('the SSSP card derives its picks from the metas (Dijkstra needs non-negative)', () => {
	const sssp = decisionCards.find(c => c.id === 'sssp');
	const picks = sssp.options.map(o => o.pick);
	assert.ok(picks.includes('Bellman-Ford'));
	assert.ok(picks.includes('DAG-SP'));
	assert.ok(picks.includes('Dijkstra'));
});

// ── complexitySheet ─────────────────────────────────────────────────────────
test('complexitySheet covers all progress topics, in teaching order', () => {
	assert.equal(complexitySheet.length, PROGRESS_TOPICS.length);
	assert.deepEqual(
		complexitySheet.map(t => t.id),
		PROGRESS_TOPICS.map(t => t.id)
	);
});

test('complexitySheet covers all 15 curriculum topics', () => {
	// The TDT4120 curriculum is 15 topics; the cheat sheet must list every one.
	assert.equal(complexitySheet.length, 15);
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
