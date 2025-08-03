import {useMemo, useState} from "react";
import styles from "./AdjacencyMatrix.module.css";

const AdjacencyMatrix = ({
	                         graph,
	                         selectedNodeId,
	                         isDirected,
	                         isWeighted,
	                         onUpdate,
	                         onCellSelect,
	                         onNodeSelect,
	                         onAddNode,
	                         onDeleteNode
                         }) => {
	const [selectedCell, setSelectedCell] = useState(null);
	const handleCellFocus = (fromIndex, toIndex) => {
		const fromNodeId = graph.nodes[fromIndex]?.id;
		const toNodeId = graph.nodes[toIndex]?.id;
		if (fromNodeId && toNodeId) {
			setSelectedCell({fromIndex, toIndex});
			onCellSelect({fromNodeId, toNodeId});
			onNodeSelect && onNodeSelect(null);
		}
	};

	const handleCellBlur = () => {
		setSelectedCell(null);
		onCellSelect(null);
	};
	const {matrix, nodeMap} = useMemo(() => {
		const nodeIds = graph.nodes.map(node => node.id);
		const nodeMap = new Map(nodeIds.map((id, index) => [id, index]));
		const size = graph.nodes.length;
		const matrix = Array(size).fill(0).map(() => Array(size).fill(0));

		graph.edges.forEach(edge => {
			const fromIndex = nodeMap.get(edge.from);
			const toIndex = nodeMap.get(edge.to);
			if (fromIndex !== undefined && toIndex !== undefined) {
				matrix[fromIndex][toIndex] = isWeighted ? edge.weight : 1;
				if (!isDirected) {
					matrix[toIndex][fromIndex] = isWeighted ? edge.weight : 1;
				}
			}
		});
		return {matrix, nodeMap};
	}, [graph, isDirected, isWeighted]);

	const selectedIndex = selectedNodeId ? nodeMap.get(selectedNodeId) : null;

	const handleInputChange = (value, fromIndex, toIndex) => {
		const numericValue = parseInt(value, 10);
		const finalValue = !isNaN(numericValue) ? numericValue : 0;

		onUpdate(finalValue, fromIndex, toIndex);
	};

	return (
		<div className={styles.matrixContainer}>
			<div className={styles.tableWrapper}>
				<table>
					<thead>
					<tr>
						<th className={styles.cornerCell}></th>
						{graph.nodes.map(node => <th key={node.id}>{node.label}</th>)}
						<th className={styles.actionheader}></th>
					</tr>
					</thead>
					<tbody>
					{matrix.map((row, i) => (
						<tr key={i} className={i === selectedIndex ? styles.selectedRow : ""}>
							<th className={styles.nodeHeader}>
								<div className={styles.labelContainer}>
									<span className={styles.nodeLabel}>{graph.nodes[i]?.label}</span>
								</div>
							</th>
							{row.map((val, j) => (
								<td key={j} className={j === selectedIndex ? styles.selectedCol : ""}>
									<input
										type="number"
										className={`${styles.cellInput} ${selectedCell?.fromIndex === i && selectedCell?.toIndex === j ? styles.cellSelected : ''}`}
										value={val}
										onChange={(e) => handleInputChange(e.target.value, i, j)}
										/*disabled={i === j}*/
										min="0"
										onFocus={() => handleCellFocus(i, j)}
										onBlur={handleCellBlur}
									/>
								</td>
							))}
							<td className={styles.actionCell}>
								<button
									onClick={() => onDeleteNode(graph.nodes[i].id)}
									className={styles.deleteButton}
									title={`Delete node ${graph.nodes[i].label}`}>
									×
								</button>
							</td>
						</tr>
					))}
					</tbody>
					<tfoot>
					<tr>
						<td colSpan={graph.nodes.length + 2}>
							<button onClick={onAddNode} className={styles.addButton} title="Add node">
	        <span className={styles.plusIcon}>+</span>
	      </button>
						</td>
					</tr>
					</tfoot>
				</table>
			</div>
		</div>
	)
		;
};

export default AdjacencyMatrix;
