import {
	BookOpen,
	ChevronLeft,
	ChevronRight,
	Pause,
	Play,
	RotateCcw,
} from 'lucide-react';
import { GRAPH_ALGORITHMS } from '../../../utils/graphAlgorithms.js';
import LearningPanel from '../../../common/LearningPanel/LearningPanel.jsx';
import styles from './GraphAlgorithmPanel.module.css';

const ALGORITHM_OPTIONS = Object.entries(GRAPH_ALGORITHMS);

const getRequirementNote = (algorithmId, isDirected, isWeighted) => {
	if (algorithmId === 'topo' && !isDirected) {
		return 'Topological sort teaches dependencies best on a directed graph.';
	}
	if ((algorithmId === 'kruskal' || algorithmId === 'prim') && isDirected) {
		return 'Spanning trees ignore direction and connect every node as cheaply as possible.';
	}
	if (algorithmId === 'dijkstra' && !isWeighted) {
		return 'With all weights equal to 1, Dijkstra behaves like a shortest-path lesson with uniform costs.';
	}
	if ((algorithmId === 'kruskal' || algorithmId === 'prim') && !isWeighted) {
		return 'Unweighted spanning trees still work; every edge has cost 1.';
	}
	if (algorithmId === 'maxflow' && (!isDirected || !isWeighted)) {
		return 'Max flow is most intuitive on a directed, weighted graph where weights are capacities.';
	}
	return '';
};

const ChipList = ({ items, emptyText = 'Empty' }) => (
	<div className={styles.chipList}>
		{items?.length ? (
			items.map((item, index) => (
				<span key={`${item}-${index}`} className={styles.chip}>
					{item}
				</span>
			))
		) : (
			<span className={styles.emptyChip}>{emptyText}</span>
		)}
	</div>
);

const DistanceGrid = ({ distances }) => {
	if (!distances) return null;
	return (
		<div className={styles.distanceGrid}>
			{Object.entries(distances).map(([nodeId, value]) => (
				<div key={nodeId} className={styles.distanceCell}>
					<span>{nodeId}</span>
					<strong>{value}</strong>
				</div>
			))}
		</div>
	);
};

const formatItems = items => (items?.length ? items.join(', ') : 'empty');

const getLearningTrace = currentStep => {
	const steps = [];
	if (currentStep.structureLabel) {
		steps.push({
			label: currentStep.structureLabel,
			text: formatItems(currentStep.structure),
		});
	}
	const visitedOrSettled = currentStep.settledNodes?.length
		? currentStep.settledNodes
		: currentStep.visitedNodes;
	if (visitedOrSettled?.length) {
		steps.push({
			label: 'Visited / settled',
			text: formatItems(visitedOrSettled),
		});
	}
	if (currentStep.order?.length) {
		steps.push({
			label: 'Output order',
			text: formatItems(currentStep.order),
		});
	}
	if (currentStep.mstWeight != null) {
		steps.push({
			label: 'Tree weight',
			text: String(currentStep.mstWeight),
		});
	}
	if (currentStep.flowValue != null) {
		steps.push({
			label: 'Flow value',
			text: String(currentStep.flowValue),
		});
	}

	return {
		title: currentStep.title,
		text: currentStep.insight || currentStep.description,
		steps,
	};
};

const GraphAlgorithmPanel = ({
	graph,
	algorithmId,
	onAlgorithmChange,
	startNodeId,
	onStartNodeChange,
	targetNodeId,
	onTargetNodeChange,
	stepIndex,
	stepCount,
	currentStep,
	isPlaying,
	onPlayPause,
	onStepBack,
	onStepForward,
	onReset,
	isDirected,
	isWeighted,
}) => {
	const meta = GRAPH_ALGORITHMS[algorithmId];
	const progress =
		stepCount <= 1 ? 0 : Math.round((stepIndex / (stepCount - 1)) * 100);
	const requirementNote = getRequirementNote(
		algorithmId,
		isDirected,
		isWeighted
	);
	const startLabel = algorithmId === 'maxflow' ? 'Source' : 'Start';
	const targetLabel = algorithmId === 'maxflow' ? 'Sink' : 'Target';
	const learningContent = {
		...meta,
		name: meta.fullName,
		summary: meta.bestFor,
		pseudocode: meta.lines,
		prompt: requirementNote,
	};

	return (
		<div className={styles.panel}>
			<div className={styles.header}>
				<div className={styles.headingLine}>
					<BookOpen size={16} strokeWidth={2.2} />
					<span>Algorithm lesson</span>
				</div>
				<strong>{meta.fullName}</strong>
				<p>{meta.bestFor}</p>
			</div>

			<div className={styles.controlsGrid}>
				<label>
					<span>Algorithm</span>
					<select
						value={algorithmId}
						onChange={event => onAlgorithmChange(event.target.value)}
					>
						{ALGORITHM_OPTIONS.map(([id, option]) => (
							<option key={id} value={id}>
								{option.fullName}
							</option>
						))}
					</select>
				</label>
				<label>
					<span>{startLabel}</span>
					<select
						value={startNodeId}
						onChange={event => onStartNodeChange(event.target.value)}
						disabled={algorithmId === 'kruskal' || algorithmId === 'topo'}
					>
						{graph.nodes.map(node => (
							<option key={node.id} value={node.id}>
								{node.label ?? node.id}
							</option>
						))}
					</select>
				</label>
				<label>
					<span>{targetLabel}</span>
					<select
						value={targetNodeId}
						onChange={event => onTargetNodeChange(event.target.value)}
						disabled={
							algorithmId === 'kruskal' ||
							algorithmId === 'prim' ||
							algorithmId === 'topo'
						}
					>
						<option value="">None</option>
						{graph.nodes.map(node => (
							<option key={node.id} value={node.id}>
								{node.label ?? node.id}
							</option>
						))}
					</select>
				</label>
			</div>

			{requirementNote && (
				<div className={styles.note} style={{ borderColor: meta.accent }}>
					{requirementNote}
				</div>
			)}

			<div className={styles.playbackRow}>
				<button type="button" onClick={onReset} title="Reset lesson">
					<RotateCcw size={16} />
				</button>
				<button
					type="button"
					onClick={onStepBack}
					disabled={stepIndex === 0}
					title="Previous step"
				>
					<ChevronLeft size={18} />
				</button>
				<button
					type="button"
					onClick={onPlayPause}
					className={styles.playButton}
					title={isPlaying ? 'Pause' : 'Play'}
					style={{ backgroundColor: meta.accent }}
				>
					{isPlaying ? <Pause size={18} /> : <Play size={18} />}
				</button>
				<button
					type="button"
					onClick={onStepForward}
					disabled={stepIndex >= stepCount - 1}
					title="Next step"
				>
					<ChevronRight size={18} />
				</button>
				<span className={styles.stepCounter}>
					{stepIndex + 1}/{stepCount}
				</span>
			</div>

			<div className={styles.progressTrack}>
				<div
					className={styles.progressFill}
					style={{ width: `${progress}%`, backgroundColor: meta.accent }}
				/>
			</div>

			<div className={styles.stepCard}>
				<div className={styles.stepTitle}>{currentStep.title}</div>
				<p>{currentStep.description}</p>
				{currentStep.insight && (
					<div className={styles.insight}>{currentStep.insight}</div>
				)}
			</div>

			<div className={styles.stateGrid}>
				<div>
					<span className={styles.stateLabel}>{currentStep.structureLabel}</span>
					<ChipList items={currentStep.structure} />
				</div>
				<div>
					<span className={styles.stateLabel}>Visited / settled</span>
					<ChipList
						items={currentStep.settledNodes?.length ? currentStep.settledNodes : currentStep.visitedNodes}
					/>
				</div>
				{currentStep.order?.length > 0 && (
					<div className={styles.wideState}>
						<span className={styles.stateLabel}>Output order</span>
						<ChipList items={currentStep.order} />
					</div>
				)}
				{currentStep.mstWeight != null && (
					<div>
						<span className={styles.stateLabel}>Tree weight</span>
						<strong className={styles.metricValue}>{currentStep.mstWeight}</strong>
					</div>
				)}
				{currentStep.flowValue != null && (
					<div>
						<span className={styles.stateLabel}>Flow value</span>
						<strong className={styles.metricValue}>{currentStep.flowValue}</strong>
					</div>
				)}
				{currentStep.bottleneck != null && (
					<div>
						<span className={styles.stateLabel}>Bottleneck</span>
						<strong className={styles.metricValue}>{currentStep.bottleneck}</strong>
					</div>
				)}
			</div>

			<DistanceGrid distances={currentStep.distances} />

			<LearningPanel
				content={learningContent}
				trace={getLearningTrace(currentStep)}
				activeLine={currentStep.line}
				accent={meta.accent}
			/>
		</div>
	);
};

export default GraphAlgorithmPanel;
