import { useMemo } from 'react';
import { floydWarshall, formatDist } from './fwTrace.js';
import { slowApsp } from './slowApsp.js';
import { SHARED_GRAPH } from './apspMeta.js';
import { SCENES, selectViewForScene } from './scenes.js';
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
const SW_PATH =
	'color-mix(in srgb, var(--color-warning) 20%, var(--surface-2))';
const SW_DIAG = 'color-mix(in srgb, var(--topic-accent) 60%, var(--surface-2))';

// Canonical answers measured once from the generator (shared by every scene).
const FW = floydWarshall(SHARED_GRAPH);
const IDS = FW.ids;
const LAYERS = FW.layers; // LAYERS[k] = D after allowing {1..k}; LAYERS[0] = direct

// Slow-APSP layers for the matrix-multiplication scene. DIFFERENT indexing from
// FW: SLOW.layers[m−1] === L^(m), so SLOW.layers[0] === L^(1) === W and
// SLOW.layers[1] === L^(2) (shortest paths of ≤ 2 edges). Never conflate these
// with FW's LAYERS, which are indexed by the intermediate-vertex k.
const SLOW = slowApsp(SHARED_GRAPH);

const NODES = projectNodes(SHARED_GRAPH.nodes);
const EDGES = buildEdges(SHARED_GRAPH.edges, NODES);

const idxOf = id => IDS.indexOf(id);
const cellKey = (i, j) => `${i},${j}`;

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
	// Scene → sticky view by stable id (never a numeric index): the selector lives
	// in scenes.js so an inserted/reordered scene can't desync the matrix view.
	const view = useMemo(
		() => selectViewForScene(SCENES[activeScene]?.id),
		[activeScene]
	);
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
				{
					swatch: SW_READ,
					label: 'reads d[i][k], d[k][j]',
					aria: 'accent tint',
				},
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
