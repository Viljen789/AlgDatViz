import assert from 'node:assert/strict';
import test from 'node:test';

// Coverage guardrail for the SSSP sticky stage's scene → view selection.
//
// ShortestPathsStage paints one sticky visual per scrolly scene. The stage once
// mapped the active scene to a view with a hard-coded NUMERIC switch (cases 0–7),
// but scenes.js grew two extra scenes ('dijkstra-probe', 'dijkstra-pq') inserted
// after 'dijkstra' — so the later scenes silently inherited a stale case meant
// for a different scene (e.g. 'why-nonneg' fell through to the pred-subgraph
// default and 'dijkstra-pq' showed a path-reconstruction picture). The fix moves
// the view selection into scenes.js, keyed by scene id (VIEW_FOR_SCENE /
// selectViewForScene), mirroring StrategiesStage's SCENE_BOARDS and GraphStage's
// SCENE map.
//
// This test pins that contract so the whole off-by-N bug class can't recur here:
// every scene id in SCENES must have an EXPLICIT view entry (never reach the
// catch-all fallback), and the map must cover at least as many ids as there are
// scenes. Mirrors the style of lessonProbes.test.js (re-import the authored data,
// assert it independently).

import { SCENES, VIEW_FOR_SCENE, selectViewForScene } from './scenes.js';

test('every SSSP scene id has an explicit sticky-view mapping', () => {
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

test('selectViewForScene returns a distinct, well-formed view for each scene', () => {
	SCENES.forEach(scene => {
		const view = selectViewForScene(scene.id);
		assert.ok(view, `selectViewForScene("${scene.id}") returned nothing`);
		// Every view paints the dist/pred table and a caption — the stage reads
		// these unconditionally, so a malformed view would crash the render.
		assert.ok(view.dist, `view for "${scene.id}" has no dist snapshot`);
		assert.ok(view.pred, `view for "${scene.id}" has no pred snapshot`);
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

test('the two inserted Dijkstra scenes get their OWN views, not a stale neighbour', () => {
	// Regression pin for the original bug: 'dijkstra-pq' (queue cost) must NOT
	// render the path-to-B reconstruction, and 'why-nonneg' must NOT inherit it
	// either. Both were the symptoms the audit flagged.
	const probe = selectViewForScene('dijkstra-probe');
	const pq = selectViewForScene('dijkstra-pq');
	const whyNonneg = selectViewForScene('why-nonneg');
	const predSubgraph = selectViewForScene('pred-subgraph');

	// dijkstra-pq is about the queue's cost, not a path reconstruction: it must
	// not carry the path highlight set the pred-subgraph scene owns.
	assert.ok(
		!pq.pathSet,
		'dijkstra-pq should not render the path-to-B reconstruction (that is pred-subgraph)'
	);
	assert.ok(
		!whyNonneg.pathSet,
		'why-nonneg should not render the path-to-B reconstruction (that is pred-subgraph)'
	);
	// Only the pred-subgraph scene paints the reconstructed path.
	assert.ok(
		predSubgraph.pathSet,
		'pred-subgraph should render the reconstructed path to B'
	);

	// Each Dijkstra scene's caption matches its prose topic, so a future reorder
	// that re-points them is caught.
	assert.match(probe.caption, /settle|tentative|mid-run/i);
	assert.match(pq.caption, /queue|cost|charge/i);
	assert.match(whyNonneg.caption, /non-negative|Relax/i);
});
