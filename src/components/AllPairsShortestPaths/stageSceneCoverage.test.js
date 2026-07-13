import assert from 'node:assert/strict';
import test from 'node:test';

// Coverage guardrail for the APSP sticky stage's scene → view selection.
//
// AllPairsShortestPathsStage paints one sticky matrix view per scrolly scene. The
// stage once mapped the active scene to a view with a hard-coded NUMERIC switch
// (cases 0–8) — the exact pattern that shipped off-by-N bugs in GraphStage and
// ShortestPathsStage, where a scene inserted into scenes.js left the later scenes
// silently inheriting a stale case meant for a different scene (the wrong matrix
// layer / spotlight). The fix moves the view selection into scenes.js, keyed by
// scene id (VIEW_FOR_SCENE / selectViewForScene), mirroring StrategiesStage's
// SCENE_BOARDS, GraphStage's SCENE map, and ShortestPaths' VIEW_FOR_SCENE.
//
// This test pins that contract so the off-by-N bug class can't recur here: every
// scene id in SCENES must have an EXPLICIT view entry (never reach the catch-all
// fallback), and the map must cover at least as many ids as there are scenes. It
// imports the map from the pure scenes.js module so `node --test` can run it
// without transpiling the JSX stage (mirrors ShortestPaths/stageSceneCoverage).

import { SCENES, VIEW_FOR_SCENE, selectViewForScene } from './scenes.js';

test('every APSP scene id has an explicit sticky-view mapping', () => {
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

test('selectViewForScene returns a well-formed view for each scene', () => {
	SCENES.forEach(scene => {
		const view = selectViewForScene(scene.id);
		assert.ok(view, `selectViewForScene("${scene.id}") returned nothing`);
		// Every view picks a matrix layer (a number the stage indexes into LAYERS /
		// SLOW.layers), a k-label, and a caption — the stage reads all three
		// unconditionally, so a malformed view would crash the render.
		assert.equal(
			typeof view.layer,
			'number',
			`view for "${scene.id}" has no numeric layer index`
		);
		assert.equal(
			typeof view.kLabel,
			'string',
			`view for "${scene.id}" has no k-label string`
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

test('the distinguishing scenes keep their OWN matrix emphasis, not a stale neighbour', () => {
	// Regression pin for the bug class: each scene that owns a UNIQUE matrix
	// emphasis must still carry it, so a future reorder that re-points the cases is
	// caught here rather than shipping a scene that paints the wrong picture.
	const closure = selectViewForScene('transitive-closure');
	const when = selectViewForScene('when');
	const predecessor = selectViewForScene('predecessor');
	const slow = selectViewForScene('slow-apsp');
	const allPairs = selectViewForScene('all-pairs');

	// Only the transitive-closure scene renders the boolean reachability matrix.
	assert.ok(
		closure.boolean,
		'transitive-closure should render the boolean reachability view'
	);
	assert.ok(!allPairs.boolean, 'all-pairs is the numeric matrix, not boolean');

	// Only the "when" scene spotlights the diagonal (neg-cycle diagnostic).
	assert.ok(when.diagCells, 'when should spotlight the diagonal cells');
	assert.ok(
		!predecessor.diagCells,
		'predecessor should not spotlight the diagonal'
	);

	// Only the predecessor scene lights the reconstructed-path cells.
	assert.ok(
		predecessor.pathCells,
		'predecessor should light the reconstructed path'
	);
	assert.ok(!when.pathCells, 'when should not light the reconstructed path');

	// Only the slow-apsp scene reads the edge-indexed SLOW.layers, not FW's
	// k-indexed LAYERS — view.slow flips the matrix source in the stage.
	assert.ok(
		slow.slow,
		'slow-apsp should read the Slow-APSP (edge-indexed) layers'
	);
	assert.ok(!allPairs.slow, 'all-pairs should read FW’s k-indexed layers');

	// Captions match their prose topic, so a re-point that swaps two views is caught.
	assert.match(closure.caption, /reachab|OR\/AND/i);
	assert.match(when.caption, /diagonal|neg cycle/i);
	assert.match(slow.caption, /L⁽²⁾|⊗/);
});
