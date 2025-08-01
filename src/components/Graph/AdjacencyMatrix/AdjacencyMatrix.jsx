import {useMemo} from "react";
import styles from "./AdjacencyMatrix.module.css";

const AdjacencyMatrix = ({graph, selectedNodeId, isDirected}) => {
	const {matrix, nodeMap} = useMemo(() => {
		const nodeIds = graph.nodes.map(node => node.id);
		const nodeMap = new Map(nodeIds.map((id, index) => [id, index]));
		const size = graph.nodes.length;
		const matrix = Array(size).fill(0).map(() => Array(size).fill(0));
		graph.edges.forEach(edge => {
			const fromIndex = nodeMap.get(edge.from);
			const toIndex = nodeMap.get(edge.to);
			if (fromIndex !== undefined && toIndex !== undefined) {
				matrix[fromIndex][toIndex] = 1;
				if (!isDirected) {
					matrix[toIndex][fromIndex] = 1;
				}
			}
		});
		return {matrix, nodeMap};
	}, [graph, isDirected]);
	const selectedIndex = selectedNodeId ? nodeMap.get(selectedNodeId) : null;
	return (
		<div className={styles.matrixContainer}>
			<table>
				<thead>
				<tr>
					<th></th>
					{graph.nodes.map(node => <th key={node.id}>{node.label}</th>)}
				</tr>
				</thead>
				<tbody>
				{matrix.map((row, i) => (
					<tr key={i} className={i === selectedIndex ? styles.selected : ""}>
						<th>{graph.nodes[i].label}</th>
						{row.map((val, j) => (
							<td key={j} className={j === selectedIndex ? styles.selected : ""}>{val}</td>
						))}
					</tr>
				))}
				</tbody>
			</table>

		</div>
	)
}
export default AdjacencyMatrix;
