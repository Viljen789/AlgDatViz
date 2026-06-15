import { useMemo } from 'react';
import MstGraph from './MstGraph.jsx';
import {
	crossingEdges,
	kruskalTrace,
	normalizeEdges,
	primTrace,
} from './mstTrace.js';
import { MST_EDGES, MST_VERTICES } from './mstMeta.js';
import StateLegend from '../../common/StateLegend/StateLegend';
import styles from './MstStage.module.css';

// Swatch colours mirror MstGraph's on-canvas edge/node styling so the shared
// key matches the picture. These reproduce the old bespoke swatch classes:
// tree / light edge ride the topic accent, the frontier is a lighter wash, a
// rejected cycle reads as a hairline-only chip, and the cut sides are the
// accent vs warning tints.
const SW_TREE = 'var(--topic-accent)';
const SW_FRONTIER = 'color-mix(in srgb, var(--topic-accent) 40%, transparent)';
const SW_REJECT = 'var(--color-border-strong)';
const SW_INSIDE = 'color-mix(in srgb, var(--topic-accent) 26%, var(--surface-2))';
const SW_OUTSIDE = 'color-mix(in srgb, var(--color-warning) 22%, var(--surface-2))';

// The cut the cut-property scene illustrates: {A, B, D} vs the rest.
const CUT_INSIDE = ['A', 'B', 'D'];

// Precompute the things the static stage needs once (pure, cheap).
const KRUSKAL = kruskalTrace({ vertices: MST_VERTICES, edges: MST_EDGES });
const PRIM_A = primTrace({ vertices: MST_VERTICES, edges: MST_EDGES, start: 'A' });
const MST_TREE = new Set(KRUSKAL.treeEdges);
const ALL_EDGES = normalizeEdges(MST_EDGES);

// A small "two trees, same edges" pair for the punchline scene — both algorithms
// commit the same edge ids, so we just confirm the sets match for the caption.
const SAME =
	JSON.stringify(KRUSKAL.treeEdges.slice().sort()) ===
	JSON.stringify(PRIM_A.treeEdges.slice().sort());

/**
 * MstStage — the synchronized weighted-graph view for the MST scrolly.
 *
 * One shared graph; the emphasis changes per scene:
 *   0 what-is-mst   — reveal the MST edges over the full graph.
 *   1 cut-property  — partition the vertices into a cut and glow the light edge.
 *   2 union-find    — colour the components Kruskal currently has.
 *   3 kruskal       — the accepted (tree) edges + the rejected cycle edges.
 *   4 prim          — the growing tree from A + its dashed frontier.
 *   5 same-tree     — both algorithms' identical final tree, side note.
 */
const MstStage = ({ activeScene = 0 }) => {
	const view = useMemo(() => {
		switch (activeScene) {
			case 0:
				// Reveal the MST over the whole graph.
				return {
					edgeSets: { tree: MST_TREE },
					nodeSets: { tree: new Set(MST_VERTICES) },
					cutSets: null,
					caption: `Minimum spanning tree · ${KRUSKAL.treeEdges.length} edges · weight ${KRUSKAL.totalWeight}`,
				};
			case 1: {
				// The cut + its light edge.
				const cut = crossingEdges(MST_EDGES, CUT_INSIDE);
				return {
					edgeSets: {
						frontier: new Set(cut.crossing.map(e => e.id)),
						light: new Set(cut.light ? [cut.light.id] : []),
					},
					nodeSets: {},
					cutSets: {
						inside: new Set(CUT_INSIDE),
						outside: new Set(MST_VERTICES.filter(v => !CUT_INSIDE.includes(v))),
					},
					caption: `Cut {${CUT_INSIDE.join(',')}} | rest · light edge ${cut.light.u}–${cut.light.v} (${cut.light.w}) is safe`,
				};
			}
			case 2: {
				// Components after a couple of Kruskal acceptances: take the frame
				// just after the first two accepts so multiple components show.
				const accepts = KRUSKAL.frames.filter(f => f.phase === 'accept');
				const frame = accepts[1] || accepts[0];
				return {
					edgeSets: { tree: new Set(frame.treeEdges) },
					nodeSets: { tree: new Set(frame.treeNodes) },
					cutSets: null,
					caption: `Union-find components: ${frame.components
						.map(g => `{${g.join('')}}`)
						.join(' ')} · find(u)=find(v) ⇒ cycle`,
				};
			}
			case 3: {
				// Kruskal mid-run: show committed + the most recent rejection.
				const upTo = KRUSKAL.frames.filter(
					f => f.phase === 'accept' || f.phase === 'reject'
				);
				const lastReject = [...upTo].reverse().find(f => f.phase === 'reject');
				const acceptedSoFar = new Set(
					KRUSKAL.frames
						.filter(f => f.phase === 'accept')
						.slice(0, 4)
						.map(f => f.considerEdge.id)
				);
				const rejected = new Set(
					KRUSKAL.frames
						.filter(f => f.phase === 'reject')
						.slice(0, 2)
						.map(f => f.considerEdge.id)
				);
				return {
					edgeSets: {
						tree: acceptedSoFar,
						rejected,
						consider: lastReject ? new Set([lastReject.considerEdge.id]) : undefined,
					},
					nodeSets: {
						tree: new Set(
							[...acceptedSoFar].flatMap(id => id.split('|'))
						),
					},
					cutSets: null,
					caption:
						'Kruskal: cheapest-first · solid = accepted · dashed = rejected cycle',
				};
			}
			case 4: {
				// Prim from A mid-grow: tree edges + dashed frontier.
				const accepts = PRIM_A.frames.filter(f => f.phase === 'accept');
				const frame = accepts[2] || accepts[accepts.length - 1];
				return {
					edgeSets: {
						tree: new Set(frame.treeEdges),
						frontier: new Set(frame.frontier),
					},
					nodeSets: { tree: new Set(frame.treeNodes) },
					cutSets: null,
					caption: `Prim from A: tree {${frame.treeNodes.join(',')}} · dashed = frontier crossing the cut`,
				};
			}
			case 5:
			default:
				return {
					edgeSets: { tree: MST_TREE },
					nodeSets: { tree: new Set(MST_VERTICES) },
					cutSets: null,
					caption: SAME
						? `Kruskal = Prim from A = Prim from F · same ${KRUSKAL.treeEdges.length} edges · weight ${KRUSKAL.totalWeight}`
						: `Same total weight ${KRUSKAL.totalWeight}`,
				};
		}
	}, [activeScene]);

	const legend = (() => {
		switch (activeScene) {
			case 1:
				return [
					{ swatch: SW_INSIDE, label: 'cut: inside', aria: 'accent tint' },
					{ swatch: SW_OUTSIDE, label: 'cut: rest', aria: 'warning tint' },
					{ swatch: SW_TREE, label: 'light edge (safe)', aria: 'accent' },
				];
			case 2:
				return [{ swatch: SW_TREE, label: 'merged component', aria: 'accent' }];
			case 3:
				return [
					{ swatch: SW_TREE, label: 'accepted', aria: 'accent' },
					{ swatch: SW_REJECT, label: 'rejected cycle', aria: 'hairline' },
				];
			case 4:
				return [
					{ swatch: SW_TREE, label: 'tree', aria: 'accent' },
					{ swatch: SW_FRONTIER, label: 'frontier', aria: 'accent wash' },
				];
			default:
				return [{ swatch: SW_TREE, label: 'MST edge', aria: 'accent' }];
		}
	})();

	return (
		<div
			className={styles.wrap}
			data-scene={activeScene}
			role="img"
			aria-label="A shared weighted graph shown scene by scene as its minimum spanning tree is built"
		>
			<div className={styles.notation} aria-hidden="true">
				weighted · undirected · |V| = {MST_VERTICES.length} · |E| = {ALL_EDGES.length}
			</div>

			<div className={styles.graphBox}>
				<MstGraph
					edges={ALL_EDGES}
					edgeSets={view.edgeSets}
					nodeSets={view.nodeSets}
					cutSets={view.cutSets}
				/>
			</div>

			<StateLegend items={legend} />

			<p className={styles.caption}>{view.caption}</p>
		</div>
	);
};

export default MstStage;
