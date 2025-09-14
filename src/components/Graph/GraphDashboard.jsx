// src/components/Graph/GraphDashboard/GraphDashboard.jsx

import { useCallback, useEffect, useState } from "react"; // 1. Import useCallback
import GraphVisualizer from "./GraphVisualizer/GraphVisualizer";
import AdjacencyMatrix from "./AdjacencyMatrix/AdjacencyMatrix";
import AdjacencyList from "./AdjacencyList/AdjacencyList";
import styles from "./GraphDashboard.module.css";
import { parseAndUpdateGraph } from "../../utils/graphUtils.js";
import Tabs from "../../common/Tabs/Tabs.jsx";
import GraphControls from "./GraphControls/GraphControls";
import DashboardLayout from "../../common/DashboardLayout/DashboardLayout.jsx"; // Assuming you have this from our previous discussion
import Panel from "../../common/Panel/Panel.jsx";

const GraphDashboard = () => {
  const [graph, setGraph] = useState({
    nodes: [
      { id: "A", x: 50, y: 50, label: "A" },
      { id: "B", x: 200, y: 80, label: "B" },
      { id: "C", x: 120, y: 200, label: "C" },
    ],
    edges: [
      { from: "A", to: "B", weight: 1 },
      { from: "A", to: "C", weight: 1 },
      { from: "B", to: "C", weight: 1 },
    ],
  });

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isDirected, setIsDirected] = useState(false);
  const [isWeighted, setIsWeighted] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);

  // --- 2. Wrap all handlers in useCallback to stabilize them ---

  const handleListUpdate = useCallback(
    (inputValue, sourceNodeId) => {
      const newGraph = parseAndUpdateGraph(
        inputValue,
        sourceNodeId,
        graph,
        isWeighted,
        isDirected,
      );
      setGraph(newGraph);
    },
    [graph, isWeighted, isDirected],
  ); // Dependencies are state variables the function uses

  const handleMatrixUpdate = useCallback(
    (newValue, fromIndex, toIndex) => {
      setGraph((currentGraph) => {
        const fromNode = currentGraph.nodes[fromIndex];
        const toNode = currentGraph.nodes[toIndex];
        if (!fromNode || !toNode) return currentGraph;

        const newEdges = currentGraph.edges.filter(
          (edge) =>
            !(edge.from === fromNode.id && edge.to === toNode.id) &&
            !(edge.from === toNode.id && edge.to === fromNode.id),
        );

        if (newValue > 0) {
          const weight = isWeighted ? newValue : 1;
          newEdges.push({ from: fromNode.id, to: toNode.id, weight });
          if (!isDirected) {
            newEdges.push({ from: toNode.id, to: fromNode.id, weight });
          }
        }
        return { ...currentGraph, edges: newEdges };
      });
    },
    [isDirected, isWeighted],
  );

  const handleAddNewNode = useCallback(() => {
    setGraph((currentGraph) => {
      let nextCharCode = 65;
      if (currentGraph.nodes.length > 0) {
        const highestCharCode = Math.max(
          ...currentGraph.nodes.map((node) => node.id.charCodeAt(0)),
        );
        nextCharCode = highestCharCode + 1;
      }
      const newNodeId = String.fromCharCode(nextCharCode);
      const newNode = {
        id: newNodeId,
        x: 250 + Math.random() * 200,
        y: 150 + Math.random() * 200,
        label: newNodeId,
      };

      const newNodes = [...currentGraph.nodes, newNode];
      let newEdges = [...currentGraph.edges];

      // Optionally, connect the new node to an existing one
      if (currentGraph.nodes.length > 0) {
        const randomEdgeIndex = Math.floor(
          Math.random() * currentGraph.nodes.length,
        );
        const randomEdgeNodeId = currentGraph.nodes[randomEdgeIndex].id;
        newEdges.push({ from: newNodeId, to: randomEdgeNodeId, weight: 1 });
        if (!isDirected) {
          newEdges.push({ from: randomEdgeNodeId, to: newNodeId, weight: 1 });
        }
      }
      return { ...currentGraph, nodes: newNodes, edges: newEdges };
    });
  }, [isDirected]);

  const handleDeleteNode = useCallback((nodeId) => {
    if (!nodeId) return;
    setGraph((currentGraph) => {
      const newEdges = currentGraph.edges.filter(
        (edge) => edge.from !== nodeId && edge.to !== nodeId,
      );
      const newNodes = currentGraph.nodes.filter((node) => node.id !== nodeId);
      return { ...currentGraph, edges: newEdges, nodes: newNodes };
    });
    setSelectedNodeId(null);
  }, []);

  // --- 3. Fix the problematic useEffect ---

  useEffect(() => {
    // If the graph is directed, do nothing.
    if (isDirected) {
      return;
    }

    // If the graph is undirected, ensure all edges are symmetrical.
    setGraph((currentGraph) => {
      let hasChanged = false; // Flag to check if we actually need to update state
      const newEdges = [...currentGraph.edges];
      const edgeSet = new Set(
        currentGraph.edges.map((e) => `${e.from}->${e.to}`),
      );

      currentGraph.edges.forEach((edge) => {
        const reverseKey = `${edge.to}->${edge.from}`;
        if (!edgeSet.has(reverseKey)) {
          newEdges.push({ from: edge.to, to: edge.from, weight: edge.weight });
          hasChanged = true; // A change is needed!
        }
      });

      // THE FIX: Only return a new object if a change was actually made.
      if (hasChanged) {
        return { ...currentGraph, edges: newEdges };
      }

      // Otherwise, return the original state to prevent the re-render loop.
      return currentGraph;
    });
  }, [isDirected, graph]); // <-- Correct dependencies; // <-- Add `graph` to the dependency array.

  const tabItems = [
    {
      label: "Adjacency List",
      content: (
        <AdjacencyList
          graph={graph}
          selectedNodeId={selectedNodeId}
          isDirected={isDirected}
          isWeighted={isWeighted}
          onUpdate={handleListUpdate}
          onAddNode={handleAddNewNode}
          onDeleteNode={handleDeleteNode}
        />
      ),
    },
    {
      label: "Adjacency Matrix",
      content: (
        <AdjacencyMatrix
          graph={graph}
          selectedNodeId={selectedNodeId}
          isDirected={isDirected}
          isWeighted={isWeighted}
          onUpdate={handleMatrixUpdate}
          onCellSelect={setSelectedCell}
          onNodeSelect={setSelectedNodeId}
          onAddNode={handleAddNewNode}
          onDeleteNode={handleDeleteNode}
        />
      ),
    },
  ];

  return (
    <DashboardLayout
      controls={
        <GraphControls
          isDirected={isDirected}
          onToggleDirected={() => setIsDirected((prev) => !prev)}
          isWeighted={isWeighted}
          onToggleWeighted={() => setIsWeighted((prev) => !prev)}
        />
      }
    >
      <div className={styles.contentFlex}>
        <Panel
          className={styles.graphPanel}
          title="Graph Visualization"
          style={{ width: "100%", height: "100%" }}
        >
          <GraphVisualizer
            graph={graph}
            selectedNodeId={selectedNodeId}
            onNodeClick={setSelectedNodeId}
            isDirected={isDirected}
            isWeighted={isWeighted}
            selectedCell={selectedCell}
          />
        </Panel>
        <Panel className={styles.dataPanel}>
          <Tabs tabs={tabItems} />
        </Panel>
      </div>
    </DashboardLayout>
  );
};

export default GraphDashboard;
