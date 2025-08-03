import {useState, useMemo, useEffect} from "react";
import styles from "./AdjacencyList.module.css";

const AdjacencyList = ({graph, isWeighted, onUpdate, selectedNodeId, onAddNode, onDeleteNode}) => {
	const [inputValues, setInputValues] = useState(new Map());
	const [errorMap, setErrorMap] = useState(new Map());

	const validNodeIds = useMemo(() => new Set(graph.nodes.map(n => n.id)), [graph.nodes]);

	const displayStrings = useMemo(() => {
		const adjList = new Map();
		graph.nodes.forEach(node => adjList.set(node.id, []));
		graph.edges.forEach(edge => {
			adjList.get(edge.from)?.push({to: edge.to, weight: edge.weight});
		});

		const displayMap = new Map();
		adjList.forEach((neighbors, nodeId) => {
			const displayString = neighbors
				.sort((a, b) => a.to.localeCompare(b.to))
				.map(n => isWeighted ? `${n.to}:${n.weight}` : n.to)
				.join(", ");
			displayMap.set(nodeId, displayString);
		});
		return displayMap;
	}, [graph, isWeighted]);

	useEffect(() => {
		setInputValues(displayStrings);
		setErrorMap(new Map());
	}, [displayStrings]);

	const validateInput = (inputValue) => {
		const tokens = inputValue.split(',').map(e => e.trim().split(':')[0]).filter(Boolean);
		if (tokens.length === 0) return true;
		return tokens.every(token => validNodeIds.has(token.toUpperCase()));
	};

	const handleInputChange = (inputValue, nodeId) => {
		const transformedValue = inputValue.toUpperCase();
		setInputValues(prev => new Map(prev.set(nodeId, transformedValue)));
		setErrorMap(prev => new Map(prev.set(nodeId, !validateInput(transformedValue))));
	};

	const processFinalInput = (nodeId) => {
		const finalValue = inputValues.get(nodeId) || '';
		if (validateInput(finalValue)) {
			onUpdate(finalValue, nodeId);
		} else {
			setInputValues(prev => new Map(prev.set(nodeId, displayStrings.get(nodeId) || '')));
			setErrorMap(prev => new Map(prev.set(nodeId, false)));
		}
	};

	return (
		<div className={styles.listContainer}>
			{[...graph.nodes]
				.sort((a, b) => a.id.localeCompare(b.id))
				.map(node => (
					<div key={node.id} className={`${styles.row} ${node.id === selectedNodeId ? styles.selected : ""}`}>
						<span className={styles.nodeLabel}>{node.id}:</span>
						<input
							type="text"
							value={inputValues.get(node.id) || ''}
							onChange={(e) => handleInputChange(e.target.value, node.id)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									processFinalInput(node.id);
									e.target.blur();
								}
							}}
							onBlur={() => processFinalInput(node.id)}
							className={`${styles.neighborsInput} ${errorMap.get(node.id) ? styles.inputInvalid : ''}`}
							placeholder={isWeighted ? "B:5, C:2" : "B, C"}
						/>
						<button className={styles.deleteButton} onClick={() => onDeleteNode(node.id)}
						        title={`Delete node ${node.id}`}>×
						</button>
					</div>
				))}
			<div className={`${styles.row} ${styles.addRow}`}>
				<button onClick={onAddNode} className={styles.addButton} title="Add node">
					<span className={styles.plusIcon}>+</span>
				</button>
			</div>
		</div>
	);
};

export default AdjacencyList;
