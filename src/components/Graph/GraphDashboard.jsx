import {useEffect, useState} from "react";
import Graph from "./GraphVisualizer/GraphVisualizer";
import AdjacencyMatrix from "./AdjacencyMatrix/AdjacencyMatrix";
import AdjacencyList from "./AdjacencyList/AdjacencyList";
import styles from "./GraphDashboard.module.css"
import GraphVisualizer from "./GraphVisualizer/GraphVisualizer";
import ToggleSwitch from "../../common/ToggleSwitch.jsx";
import {parseAndUpdateGraph} from "../../utils/graphUtils.js";

const GraphDashboard = () => {
	const [graph, setGraph] = useState({
		nodes: [{id: "A", x: 50, y: 50, label: "A"}, {id: "B", x: 200, y: 80, label: "B"}, {
			id: "C",
			x: 120,
			y: 200,
			label: "C"
		},], edges: [{from: "A", to: "B", weight: 5}, {from: "A", to: "C", weight: 3}, {from: "B", to: "C", weight: 1},]
	});
	const [selectedNodeId, setSelectedNodeId] = useState(null);
	const [activeView, setActiveView] = useState("list");
	const [isDirected, setIsDirected] = useState(false);
	const [isWeighted, setIsWeighted] = useState(false);

	const handleListUpdate = (inputValue, sourceNodeId) => {
		const newGraph = parseAndUpdateGraph(inputValue, sourceNodeId, graph, isWeighted, isDirected);
		setGraph(newGraph);
	};
	const handleAddNewNode = () => {
		let nextCharCode = 65;

		if (graph.nodes.length > 0) {
			const highestCharCode = Math.max(...graph.nodes.map(node => node.id.charCodeAt(0)));
			nextCharCode = highestCharCode + 1;
		}
		const newNodeId = String.fromCharCode(nextCharCode);
		const newNode = {
			id: newNodeId, x: 400 + (Math.random() - 0.5) * 500, y: 300 + (Math.random() - 0.5) * 400, label: newNodeId
		};
		const randomEdgeIndex = Math.floor(Math.random() * graph.nodes.length);
		const randomEdgeNode = graph.nodes[randomEdgeIndex].id;

		setGraph(currentGraph => ({
			...currentGraph,
			nodes: [...currentGraph.nodes, newNode],
			edges: [...currentGraph.edges, {from: newNodeId, to: randomEdgeNode, weight: 1}]
		}));
	}
	const handleDeleteNode = (nodeId) => {
		if (!nodeId) return;
		setGraph(currentGraph => {
			const newEdges = currentGraph.edges.filter(
				edge => edge.from !== nodeId && edge.to !== nodeId
			);
			const newNodes = currentGraph.nodes.filter(
				node => node.id !== nodeId
			);
			return {...currentGraph, edges: newEdges, nodes: newNodes};
		});
		setSelectedNodeId(null);
	};
	useEffect(() => {
	  const handleKeyDown = (event) => {
	    if (event.key === "Delete" || event.key === "Backspace") {
	      handleDeleteNode(selectedNodeId);
	    }
	    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
	      const selectedNode = graph.nodes.find(node => node.id === selectedNodeId);
	      if (selectedNode) {
	        const index = graph.nodes.indexOf(selectedNode);
	        const newIndex = (index - 1 + graph.nodes.length) % graph.nodes.length;
	        setSelectedNodeId(graph.nodes[newIndex].id);
	      }
	    }
	    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
	      const selectedNode = graph.nodes.find(node => node.id === selectedNodeId);
	      if (selectedNode) {
	        const index = graph.nodes.indexOf(selectedNode);
	        const newIndex = (index + 1) % graph.nodes.length;
	        setSelectedNodeId(graph.nodes[newIndex].id);
	      }
	    }
	  };

	  window.addEventListener("keydown", handleKeyDown);
	  return () => {
	    window.removeEventListener("keydown", handleKeyDown);
	  };
	}, [graph.nodes, selectedNodeId]);;


	useEffect(() => {
		if (isDirected) return;


		setGraph(currentGraph => {
			const newEdges = [...currentGraph.edges];
			const edgeSet = new Set(currentGraph.edges.map(e => `${e.from}->${e.to}`));

			currentGraph.edges.forEach(edge => {
				const reverseKey = `${edge.to}->${edge.from}`;
				if (!edgeSet.has(reverseKey)) {

					newEdges.push({from: edge.to, to: edge.from, weight: edge.weight});
				}
			});

			return {...currentGraph, edges: newEdges};
		});
	}, [isDirected]);

	return (<div className={styles.dashboardContainer}>
		<div className={styles.graphPanel}>
			<GraphVisualizer graph={graph} selectedNodeId={selectedNodeId} onNodeClick={setSelectedNodeId}
			                 isDirected={isDirected} isWeighted={isWeighted}/>
		</div>
		<div className={styles.dataPanel}>
			<div className={styles.tabs}>
				<button className={activeView === "list" ? styles.activeTab : ""}
				        onClick={() => setActiveView("list")}
				> Adjacency List
				</button>
				<button className={activeView === "matrix" ? styles.activeTab : ""}
				        onClick={() => setActiveView("matrix")}
				> Adjacency Matrix
				</button>
			</div>
			<div className={styles.dataContent}>
				<div className={`${styles.viewWrapper} ${activeView === "list" ? styles.showList : styles.showMatrix}`}>
					<div className={styles.viewContainer}>
						<AdjacencyList
							graph={graph}
							selectedNodeId={selectedNodeId}
							isDirected={isDirected}
							isWeighted={isWeighted}
							onUpdate={handleListUpdate}
							onAddNode={handleAddNewNode}
							onDeleteNode={handleDeleteNode}
						/>
					</div>
					<div className={styles.viewContainer}>
						<AdjacencyMatrix graph={graph} selectedNodeId={selectedNodeId} isDirected={isDirected}/>
					</div>
				</div>
			</div>
			<div className={styles.controls}>
				<ToggleSwitch label="Directed" checked={isDirected} onChange={() => setIsDirected(!isDirected)}/>
				<ToggleSwitch label="Weighted" checked={isWeighted} onChange={() => setIsWeighted(!isWeighted)}/>
			</div>
		</div>
	</div>)
}
export default GraphDashboard;
