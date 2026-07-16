import { useEffect, useMemo, useState } from 'react';
import styles from './AdjacencyList.module.css';
import {
	AddNodeButton,
	DeleteNodeButton,
} from '../../../common/NodeButtons/NodeButtons.jsx';
import { buildGraphAdjacency } from '../../../utils/graphUtils.js';

const AdjacencyList = ({
	graph,
	isDirected,
	isWeighted,
	onUpdate,
	selectedNodeId,
	onAddNode,
	onDeleteNode,
}) => {
	const [inputValues, setInputValues] = useState(new Map());
	const [errorMap, setErrorMap] = useState(new Map());

	const validNodeIds = useMemo(
		() => new Set(graph.nodes.map(n => n.id)),
		[graph.nodes]
	);

	const displayStrings = useMemo(() => {
		const adjList = buildGraphAdjacency(graph, isDirected);

		const displayMap = new Map();
		adjList.forEach((neighbors, nodeId) => {
			const displayString = neighbors
				.sort((a, b) => a.to.localeCompare(b.to))
				.map(n => (isWeighted ? `${n.to}:${n.weight}` : n.to))
				.join(', ');
			displayMap.set(nodeId, displayString);
		});
		return displayMap;
	}, [graph, isDirected, isWeighted]);

	useEffect(() => {
		setInputValues(displayStrings);
		setErrorMap(new Map());
	}, [displayStrings]);

	const validateInput = inputValue => {
		const tokens = inputValue
			.split(',')
			.map(e => e.trim().split(':')[0])
			.filter(Boolean);
		if (tokens.length === 0) return true;
		return tokens.every(token => validNodeIds.has(token.toUpperCase()));
	};

	const handleInputChange = (inputValue, nodeId) => {
		const transformedValue = inputValue.toUpperCase();
		setInputValues(prev => new Map(prev.set(nodeId, transformedValue)));
		setErrorMap(
			prev => new Map(prev.set(nodeId, !validateInput(transformedValue)))
		);
	};

	const processFinalInput = nodeId => {
		const finalValue = inputValues.get(nodeId) || '';
		if (validateInput(finalValue)) {
			// Focusing and leaving a mirrored undirected row is not an edit. Avoid
			// collapsing an underlying antiparallel pair merely because clicking the
			// direction toggle blurred this input.
			if (finalValue === (displayStrings.get(nodeId) || '')) return;
			onUpdate(finalValue, nodeId);
		} else {
			setInputValues(
				prev => new Map(prev.set(nodeId, displayStrings.get(nodeId) || ''))
			);
			setErrorMap(prev => new Map(prev.set(nodeId, false)));
		}
	};

	return (
		<div className={styles.listContainer}>
			{[...graph.nodes]
				.sort((a, b) => a.id.localeCompare(b.id))
				.map(node => (
					<div
						key={node.id}
						className={`${styles.row} ${node.id === selectedNodeId ? styles.selected : ''}`}
					>
						<span className={styles.nodeLabel}>{node.id}:</span>
						<input
							type="text"
							value={inputValues.get(node.id) || ''}
							onChange={e => handleInputChange(e.target.value, node.id)}
							onKeyDown={e => {
								if (e.key === 'Enter') {
									e.preventDefault();
									processFinalInput(node.id);
									e.target.blur();
								}
							}}
							onBlur={() => processFinalInput(node.id)}
							className={`${styles.neighborsInput} ${errorMap.get(node.id) ? styles.inputInvalid : ''}`}
							placeholder={isWeighted ? 'B:5, C:2' : 'B, C'}
						/>
						<DeleteNodeButton
							onClick={() => onDeleteNode(node.id)}
							title="Delete node"
							className={styles.deleteButton}
						/>
					</div>
				))}
			<div className={`${styles.row} ${styles.addRow}`}>
				<AddNodeButton onClick={onAddNode} title="Add node" />
			</div>
		</div>
	);
};

export default AdjacencyList;
