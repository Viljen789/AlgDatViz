import { useMemo } from 'react';
import { floydWarshall, reconstructPath, formatDist } from './fwTrace.js';
import { slowApsp } from './slowApsp.js';
import { SHARED_GRAPH } from './apspMeta.js';
import { buildEdges, projectNodes, VIEW_H, VIEW_W } from './graphLayout.js';
import StateLegend from '../../common/StateLegend/StateLegend';
import { SceneNarration } from '../../common/PlaybackEngine';
import styles from './AllPairsShortestPathsStage.module.css';

// Swatch colours mirror what AllPairsShortestPathsStage.module.css paints in the
// matrix. The write target and the two cells it reads ride the topic accent
// (apsp = lime) at two intensities; the reconstructed-path cells borrow
// --color-warning; the diagonal spotlight is the accent again.
const SW_WRITE = 'var(--topic-accent)';
const SW_READ = 'color-mix(in srgb, var(--topic-accent) 22%, var(--surface-2))';
const SW_PATH = 'color-mix(in srgb, var(--color-warning) 20%, var(--surface-2))';
const SW_DIAG = 'color-mix(in srgb, var(--topic-accent) 60%, var(--surface-2))';

// Canonical answers measured once from the generator (shared by every scene).
const FW = floydWarshall(SHARED_GRAPH);
const IDS = FW.ids;
const LAYERS = FW.layers; // LAYERS[k] = D after allowing {1..k}; LAYERS[0] = direct
const PATH_1_3 = reconstructPath(FW.pred, IDS, '1', '3'); // ['1','2','4','3']

// Slow-APSP layers for the matrix-multiplication scene. DIFFERENT indexing from
// FW: SLOW.layers[m−1] === L^(m), so SLOW.layers[0] === L^(1) === W and
// SLOW.layers[1] === L^(2) (shortest paths of ≤ 2 edges). Never conflate these
// with FW's LAYERS, which are indexed by the intermediate-vertex k.
const SLOW = slowApsp(SHARED_GRAPH);

const NODES = projectNodes(SHARED_GRAPH.nodes);
const EDGES = buildEdges(SHARED_GRAPH.edges, NODES);

const idxOf = id => IDS.indexOf(id);
const cellKey = (i, j) => `${i},${j}`;

// Per-scene emphasis. Each picks which k-layer to show in the matrix and which
// cells to spotlight, mirroring the prose. The matrix-across-k feel comes from
// scenes 1→3 stepping the layer index 0 → 2 → final.
const SCENE_VIEW = activeScene => {
	switch (activeScene) {
		// 0 all-pairs — the final matrix, every cell lit as "the answer".
		case 0:
			return {
				layer: LAYERS.length - 1,
				kLabel: 'final',
				caption: `The full ${IDS.length}×${IDS.length} answer: d[i][j] for every ordered pair`,
			};
		// 1 intermediates — k = 0, the direct-edge matrix (no intermediates yet).
		case 1:
			return {
				layer: 0,
				kLabel: '0',
				caption:
					'k = 0 — direct edges only (∞ where no edge, 0 on the diagonal)',
			};
		// 2 recurrence — the final layer; spotlight d[1][3] + its two readers.
		case 2: {
			const i = idxOf('1');
			const j = idxOf('3');
			const k = idxOf('4'); // the last intermediate that settles 1→3
			return {
				layer: LAYERS.length - 1,
				kLabel: 'final',
				write: [i, j],
				readIK: [i, k],
				readKJ: [k, j],
				caption: 'd[1][3] = min(old, d[1][4] + d[4][3]) — one cell reads two',
			};
		}
		// 3 fill-across-k — after k = 2; spotlight d[1][4] (now 1→2→4).
		case 3: {
			const i = idxOf('1');
			const j = idxOf('4');
			const k = idxOf('2');
			return {
				layer: 2,
				kLabel: '2',
				write: [i, j],
				readIK: [i, k],
				readKJ: [k, j],
				caption: 'After k = 2: d[1][4] = d[1][2] + d[2][4] = 4 (via 2)',
			};
		}
		// 4 predecessor — final matrix; light the reconstructed 1→3 path cells.
		case 4: {
			const pathCells = new Set();
			for (let p = 0; p < PATH_1_3.length - 1; p++) {
				pathCells.add(cellKey(idxOf(PATH_1_3[p]), idxOf(PATH_1_3[p + 1])));
			}
			return {
				layer: LAYERS.length - 1,
				kLabel: 'final',
				pathCells,
				caption: `π reconstructs 1 → 3 as ${PATH_1_3.join(' → ')}`,
			};
		}
		// 5 transitive closure — final matrix shown as reachability (boolean).
		case 5:
			return {
				layer: LAYERS.length - 1,
				kLabel: 'final',
				boolean: true,
				caption: 'Same loop, OR/AND: T[i][j] = reachable? (✓ = yes)',
			};
		// 6 matrix-mult — final matrix as "the product".
		case 6:
			return {
				layer: LAYERS.length - 1,
				kLabel: 'final',
				caption: 'D = the (min, +) "product" — combining paths through every k',
			};
		// 7 when — final matrix; spotlight the diagonal (neg-cycle diagnostic).
		case 7: {
			const diag = new Set(IDS.map((_, i) => cellKey(i, i)));
			return {
				layer: LAYERS.length - 1,
				kLabel: 'final',
				diagCells: diag,
				caption:
					'Diagonal stays 0 here — a negative d[v][v] would flag a neg cycle',
			};
		}
		// 8 slow-apsp — the (min, +) matrix product. Source = SLOW.layers (indexed
		// by edge count, NOT by FW's intermediate k). Show L^(2) (≤ 2-edge paths)
		// and spotlight d[2][3]: ∞ at one edge, but 2→4→3 = 1 + (−5) = −4 at two.
		case 8:
		default: {
			const i = idxOf('2');
			const j = idxOf('3');
			const k = idxOf('4'); // the single intermediate that achieves the min
			return {
				slow: true,
				layer: 1, // SLOW.layers[1] === L^(2)
				kLabel: 'L⁽²⁾',
				write: [i, j],
				readIK: [i, k], // L⁽¹⁾[2][4] = 1
				readKJ: [k, j], // W[4][3] = −5
				caption:
					'L⁽²⁾ = L⁽¹⁾ ⊗ W: d[2][3] drops to −4 via 2→4→3 (no direct 2→3 edge)',
			};
		}
	}
};

const NODE_R = 7;

/**
 * AllPairsShortestPathsStage — the SIGNATURE interactive: a V×V distance matrix
 * that fills across k, beside the weighted digraph. As the scrolly advances the
 * matrix steps through its k-layers (direct edges → allowing {1,2} → the final
 * answer), highlighting the cell being relaxed and the two cells it reads
 * (d[i][k] and d[k][j]), plus predecessor reconstruction and the boolean
 * transitive-closure view. Every number comes from the pure generator in
 * fwTrace.js, so the picture can never disagree with the algorithm.
 */
const AllPairsShortestPathsStage = ({ activeScene = 0 }) => {
	const view = useMemo(() => SCENE_VIEW(activeScene), [activeScene]);
	// Most scenes read FW's k-indexed layers; the Slow-APSP scene reads the
	// edge-indexed L^(m) layers instead (view.slow flips the source).
	const matrix = view.slow ? SLOW.layers[view.layer] : LAYERS[view.layer];

	const write = view.write || null;
	const readIK = view.readIK || null;
	const readKJ = view.readKJ || null;
	const pathCells = view.pathCells || new Set();
	const diagCells = view.diagCells || new Set();
	const isBoolean = Boolean(view.boolean);

	const sameCell = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];

	// Scene-aware key, replacing the old aria-hidden read/write legend so the
	// matrix colours are spoken too. Only the states this scene paints: the
	// relaxed cell + the two it reads, the reconstructed path, or the diagonal.
	const legend = (() => {
		if (pathCells.size) {
			return [{ swatch: SW_PATH, label: 'reconstructed path', aria: 'amber' }];
		}
		if (diagCells.size) {
			return [{ swatch: SW_DIAG, label: 'diagonal d[v][v]', aria: 'accent' }];
		}
		if (write || readIK) {
			return [
				{ swatch: SW_WRITE, label: 'writes d[i][j]', aria: 'accent' },
				{ swatch: SW_READ, label: 'reads d[i][k], d[k][j]', aria: 'accent tint' },
			];
		}
		return [];
	})();

	return (
		<>
			{/* Per-scene narration for screen readers, OUTSIDE the role=img figure
			    below (which collapses its in-figure caption into one static label). */}
			<SceneNarration>{view.caption}</SceneNarration>
			<div
				className={styles.wrap}
				data-scene={activeScene}
				role="img"
				aria-label="Weighted directed graph beside the all-pairs distance matrix, filling across k, scene by scene"
			>
				<div className={styles.notation} aria-hidden="true">
					weighted digraph · |V| = {IDS.length} · k = {view.kLabel}
				</div>

				<div className={styles.layout}>
					{/* ---------- Graph ---------- */}
					<svg
						viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
						className={styles.svg}
						preserveAspectRatio="xMidYMid meet"
					>
						<defs>
							<marker
								id="apspArrow"
								viewBox="0 0 10 10"
								refX="8"
								refY="5"
								markerWidth="5"
								markerHeight="5"
								orient="auto-start-reverse"
							>
								<path d="M 0 1 L 9 5 L 0 9 z" className={styles.arrowHead} />
							</marker>
						</defs>

						{EDGES.map(edge => (
							<g key={`${edge.from}->${edge.to}`}>
								<path
									d={edge.path}
									className={styles.edge}
									fill="none"
									markerEnd="url(#apspArrow)"
								/>
								<text
									x={edge.lx}
									y={edge.ly}
									className={styles.weight}
									textAnchor="middle"
									dominantBaseline="central"
								>
									{edge.weight}
								</text>
							</g>
						))}

						{NODES.map(node => (
							<g key={node.id} transform={`translate(${node.px}, ${node.py})`}>
								<circle r={NODE_R} className={styles.node} />
								<text
									className={styles.nodeText}
									textAnchor="middle"
									dominantBaseline="central"
								>
									{node.id}
								</text>
							</g>
						))}
					</svg>

					{/* ---------- The V×V matrix (the spine) ---------- */}
					<div className={styles.matrixWrap}>
						<table className={styles.matrix}>
							<thead>
								<tr>
									<th scope="col" className={styles.corner}>
										{isBoolean ? 'T' : 'd'}
									</th>
									{IDS.map(id => (
										<th
											key={id}
											scope="col"
											className={
												write && idxOf(id) === write[1] ? styles.colHot : ''
											}
										>
											{id}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{IDS.map((rowId, i) => (
									<tr key={rowId}>
										<th
											scope="row"
											className={`${styles.rowKey} ${
												write && i === write[0] ? styles.rowHot : ''
											}`}
										>
											{rowId}
										</th>
										{IDS.map((colId, j) => {
											const v = matrix[i][j];
											const key = cellKey(i, j);
											const cls = [styles.cell];
											if (sameCell([i, j], write)) cls.push(styles.cellWrite);
											if (sameCell([i, j], readIK)) cls.push(styles.cellRead);
											if (sameCell([i, j], readKJ)) cls.push(styles.cellRead);
											if (pathCells.has(key)) cls.push(styles.cellPath);
											if (diagCells.has(key)) cls.push(styles.cellDiag);
											// Slow-APSP layers use Infinity for ∞ (FW uses null);
											// normalize both so unreachable cells render as ∞.
											const display = isBoolean
												? v === null || v === undefined
													? '·'
													: '✓'
												: v === Infinity
													? '∞'
													: formatDist(v);
											return (
												<td key={colId} className={cls.join(' ')}>
													{display}
												</td>
											);
										})}
									</tr>
								))}
							</tbody>
						</table>

						<StateLegend items={legend} />
					</div>
				</div>

				<p className={styles.caption}>{view.caption}</p>
			</div>
		</>
	);
};

export default AllPairsShortestPathsStage;
