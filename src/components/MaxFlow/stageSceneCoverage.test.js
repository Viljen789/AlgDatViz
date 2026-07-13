import assert from 'node:assert/strict';
import test from 'node:test';

// Coverage guardrail for the max-flow sticky stage's scene → view selection.
//
// MaxFlowStage paints one sticky flow-network view per scrolly scene. The stage
// once carried TWO hard-coded NUMERIC switches (SCENE_VIEW for the network/flow
// picture, SCENE_LEGEND for the key) — the exact pattern that shipped off-by-N
// bugs in GraphStage and ShortestPathsStage, where a scene inserted into scenes.js
// left the later scenes silently inheriting a stale case meant for a different
// scene. The fix moves the selection into scenes.js, keyed by scene id
// (VIEW_FOR_SCENE / selectViewForScene), with the legend folded into each view so
// there is only ONE id-keyed source of truth. Mirrors StrategiesStage's
// SCENE_BOARDS, GraphStage's SCENE map, and ShortestPaths' VIEW_FOR_SCENE.
//
// This test pins that contract so the off-by-N bug class can't recur here: every
// scene id in SCENES must have an EXPLICIT view entry (never reach the catch-all
// fallback), and the map must cover at least as many ids as there are scenes. It
// imports the map from the pure scenes.js module so `node --test` can run it
// without transpiling the JSX stage (mirrors ShortestPaths/stageSceneCoverage).

import { SCENES, VIEW_FOR_SCENE, selectViewForScene } from './scenes.js';

test('every max-flow scene id has an explicit sticky-view mapping', () => {
	const mappedIds = Object.keys(VIEW_FOR_SCENE);
	SCENES.forEach(scene => {
		assert.ok(
			Object.prototype.hasOwnProperty.call(VIEW_FOR_SCENE, scene.id),
			`scene "${scene.id}" has no explicit view in VIEW_FOR_SCENE — it would fall through to a catch-all default meant for a different scene`
		);
	});
	// At least as many mapped ids as scenes (no scene goes unmapped). The map may
	// legitimately have its own entries, so this is a lower bound, not equality.
	assert.ok(
		mappedIds.length >= SCENES.length,
		`expected at least ${SCENES.length} mapped scene views, got ${mappedIds.length}`
	);
});

test('selectViewForScene returns a well-formed view (network + flow + legend + caption) for each scene', () => {
	SCENES.forEach(scene => {
		const view = selectViewForScene(scene.id);
		assert.ok(view, `selectViewForScene("${scene.id}") returned nothing`);
		// The stage reads these unconditionally, so a malformed view would crash the
		// render: a network with nodes/edges, a flow map, a legend array, a caption.
		assert.ok(
			view.network && Array.isArray(view.network.nodes),
			`view for "${scene.id}" has no network with nodes`
		);
		assert.ok(
			view.flow && typeof view.flow === 'object',
			`view for "${scene.id}" has no flow snapshot`
		);
		assert.ok(
			Array.isArray(view.legend) && view.legend.length > 0,
			`view for "${scene.id}" has no legend items`
		);
		assert.equal(
			typeof view.caption,
			'string',
			`view for "${scene.id}" has no caption string`
		);
		assert.ok(
			view.caption.length > 0,
			`view for "${scene.id}" has an empty caption`
		);
	});
});

test('the distinguishing scenes keep their OWN network emphasis, not a stale neighbour', () => {
	// Regression pin for the bug class: each scene that owns a UNIQUE picture must
	// still carry it, so a future reorder that re-points the cases is caught here
	// rather than shipping a scene that paints the wrong network state.
	const residual = selectViewForScene('residual');
	const augmenting = selectViewForScene('augmenting-path');
	const minCut = selectViewForScene('max-flow-min-cut');
	const matching = selectViewForScene('matching');
	const flowNetwork = selectViewForScene('flow-network');

	// Only the residual + augmenting-path scenes overlay the residual network.
	assert.ok(
		residual.showResidual,
		'residual should overlay the residual network'
	);
	assert.ok(
		!flowNetwork.showResidual,
		'flow-network shows bare capacities only'
	);

	// Only the augmenting-path scene highlights a path with a bottleneck badge.
	assert.ok(
		augmenting.pathSet,
		'augmenting-path should highlight its s→t path'
	);
	assert.equal(
		augmenting.bottleneck,
		4,
		'augmenting-path should carry its bottleneck = 4'
	);
	assert.ok(
		!residual.pathSet,
		'residual should not highlight an augmenting path'
	);

	// Only the max-flow-min-cut scene reveals the cut partition.
	assert.ok(minCut.minCut, 'max-flow-min-cut should reveal the cut partition');
	assert.ok(!matching.minCut, 'matching should not reveal a cut');

	// Only the matching scene swaps in the bipartite MATCHING_NETWORK (more nodes
	// than the CLRS network), so a re-point that leaves it on CLRS is caught.
	assert.ok(
		matching.network.nodes.length > flowNetwork.network.nodes.length,
		'matching should render the bipartite matching network, not the CLRS network'
	);

	// Captions match their prose topic, so a re-point that swaps two views is caught.
	assert.match(residual.caption, /residual/i);
	assert.match(minCut.caption, /min cut/i);
	assert.match(matching.caption, /matching/i);
});
