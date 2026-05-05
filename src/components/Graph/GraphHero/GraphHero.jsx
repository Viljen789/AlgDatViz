import { useState } from 'react';
import { ChevronDown, RotateCcw, Plus, Minus, Layers } from 'lucide-react';
import styles from './GraphHero.module.css';
import { GRAPH_ALGORITHMS } from '../../../utils/graphAlgorithms.js';
import { GRAPH_ALGORITHM_META } from '../../../utils/graphAlgorithmMeta.js';
import { GRAPH_PRESETS } from '../../../data/graphPresets.js';
import GraphAlgorithmPicker from '../GraphAlgorithmPicker/GraphAlgorithmPicker';
import GraphReadMoreOverlay from '../GraphReadMoreOverlay/GraphReadMoreOverlay';

const supportsTarget = id =>
	id === 'maxflow' || id === 'dijkstra' || id === 'bfs' || id === 'dfs';
const supportsStart = id => id !== 'kruskal' && id !== 'topo';

const GraphHero = ({
	algorithmId,
	onAlgorithmChange,
	startNodeId,
	targetNodeId,
	onClearTarget,
	presetId,
	onPresetChange,
	isDirected,
	onToggleDirected,
	isWeighted,
	onToggleWeighted,
	onAddNode,
	onDeleteSelected,
	selectedNodeId,
	statusSuffix,
}) => {
	const [pickerOpen, setPickerOpen] = useState(false);
	const [readMoreOpen, setReadMoreOpen] = useState(false);
	const [presetOpen, setPresetOpen] = useState(false);
	const [graphMenuOpen, setGraphMenuOpen] = useState(false);

	const info = GRAPH_ALGORITHMS[algorithmId];
	const meta = GRAPH_ALGORITHM_META[algorithmId] || {};
	const startLabel = algorithmId === 'maxflow' ? 'source' : 'start';
	const targetLabel = algorithmId === 'maxflow' ? 'sink' : 'target';

	return (
		<header className={styles.hero}>
			<div className={styles.left}>
				<button
					type="button"
					className={styles.title}
					onClick={() => setPickerOpen(true)}
					aria-haspopup="dialog"
					title="Choose graph algorithm"
				>
					<span className={styles.titleText}>{info?.fullName || 'Graph'}</span>
					<ChevronDown
						size={20}
						strokeWidth={1.75}
						className={styles.titleChevron}
					/>
				</button>
				<p className={styles.oneLine}>{info?.bestFor}</p>
			</div>

			<div className={styles.right}>
				<div className={styles.notation}>
					<span className={styles.complexity}>{meta.complexity}</span>
					{supportsStart(algorithmId) && (
						<>
							<span className={styles.notationDot}>·</span>
							<span className={styles.endpoint}>
								<span className={styles.endpointLabel}>{startLabel}</span>
								<span className={styles.endpointValue}>
									{startNodeId || '—'}
								</span>
							</span>
						</>
					)}
					{supportsTarget(algorithmId) && (
						<>
							<span className={styles.notationDot}>→</span>
							<span className={styles.endpoint}>
								<span className={styles.endpointLabel}>{targetLabel}</span>
								<button
									type="button"
									className={styles.endpointButton}
									onClick={() => targetNodeId && onClearTarget?.()}
									title={targetNodeId ? 'Clear target' : 'Shift-click a node to set'}
									disabled={!targetNodeId}
								>
									{targetNodeId || '—'}
								</button>
							</span>
						</>
					)}
					{statusSuffix && (
						<>
							<span className={styles.notationDot}>·</span>
							<span className={styles.status}>{statusSuffix}</span>
						</>
					)}
				</div>

				<div className={styles.actions}>
					<div className={styles.menuWrap}>
						<button
							type="button"
							className={styles.ghostBtn}
							onClick={() => setPresetOpen(o => !o)}
							aria-haspopup="listbox"
							aria-expanded={presetOpen}
						>
							<Layers size={14} strokeWidth={2} />
							<span>Presets</span>
						</button>
						{presetOpen && (
							<>
								<div
									className={styles.menuBackdrop}
									onClick={() => setPresetOpen(false)}
								/>
								<ul className={styles.menu} role="listbox">
									{Object.entries(GRAPH_PRESETS).map(([id, preset]) => (
										<li
											key={id}
											role="option"
											aria-selected={id === presetId}
										>
											<button
												type="button"
												className={`${styles.menuItem} ${
													id === presetId ? styles.menuItemActive : ''
												}`}
												onClick={() => {
													onPresetChange(id);
													setPresetOpen(false);
												}}
											>
												<span>{preset.label || id}</span>
											</button>
										</li>
									))}
								</ul>
							</>
						)}
					</div>

					<div className={styles.menuWrap}>
						<button
							type="button"
							className={styles.ghostBtn}
							onClick={() => setGraphMenuOpen(o => !o)}
							aria-haspopup="menu"
							aria-expanded={graphMenuOpen}
						>
							<span>Graph</span>
							<ChevronDown size={12} strokeWidth={2} />
						</button>
						{graphMenuOpen && (
							<>
								<div
									className={styles.menuBackdrop}
									onClick={() => setGraphMenuOpen(false)}
								/>
								<div className={styles.menu} role="menu">
									<button
										type="button"
										className={styles.menuItem}
										onClick={onAddNode}
									>
										<span>
											<Plus size={12} strokeWidth={2.4} /> Add node
										</span>
									</button>
									<button
										type="button"
										className={styles.menuItem}
										onClick={onDeleteSelected}
										disabled={!selectedNodeId}
									>
										<span>
											<Minus size={12} strokeWidth={2.4} /> Remove selected
										</span>
									</button>
									<div className={styles.menuSeparator} />
									<label className={styles.menuToggle}>
										<input
											type="checkbox"
											checked={isDirected}
											onChange={onToggleDirected}
										/>
										<span>Directed</span>
									</label>
									<label className={styles.menuToggle}>
										<input
											type="checkbox"
											checked={isWeighted}
											onChange={onToggleWeighted}
										/>
										<span>Weighted</span>
									</label>
								</div>
							</>
						)}
					</div>

					<button
						type="button"
						className={styles.ghostBtn}
						onClick={() => setReadMoreOpen(true)}
					>
						Read more
					</button>
				</div>
			</div>

			<GraphAlgorithmPicker
				isOpen={pickerOpen}
				onClose={() => setPickerOpen(false)}
				value={algorithmId}
				onChange={id => {
					onAlgorithmChange(id);
					setPickerOpen(false);
				}}
			/>

			<GraphReadMoreOverlay
				isOpen={readMoreOpen}
				onClose={() => setReadMoreOpen(false)}
				algorithmId={algorithmId}
			/>
		</header>
	);
};

export default GraphHero;
