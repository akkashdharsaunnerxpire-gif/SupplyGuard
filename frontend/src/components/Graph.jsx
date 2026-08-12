import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from "reactflow";

import "reactflow/dist/style.css";

const API_URL = import.meta.env.VITE_API_URL;
// =====================================================
// CUSTOM GRAPH NODE
// =====================================================

function GraphNode({ data }) {
  const {
    label,
    kind,
    borderColor,
    background,
    textColor,
    boxShadow,
    opacity,
  } = data;

  // ===================================================
  // SUPPLIER
  // ===================================================

  if (kind === "supplier") {
    return (
      <div
        style={{
          position: "relative",
          width: 260,
          minHeight: 72,
          padding: "16px 20px",
          borderRadius: 16,
          border: "2px solid #111827",
          background: "#111827",
          color: "#ffffff",
          fontWeight: 700,
          textAlign: "center",
          boxShadow,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
          lineHeight: 1.35,
        }}
      >
        {label}

        <Handle
          id="supplier-source"
          type="source"
          position={Position.Bottom}
          style={{
            background: "#111827",
            width: 8,
            height: 8,
            border: "1px solid white",
          }}
        />
      </div>
    );
  }

  // ===================================================
  // COMPONENT
  // ===================================================

  if (kind === "component") {
    return (
      <div
        style={{
          position: "relative",
          width: 260,
          minHeight: 72,
          padding: "16px 20px",
          borderRadius: 16,
          border: `3px solid ${borderColor}`,
          background,
          color: textColor,
          fontWeight: 700,
          textAlign: "center",
          boxShadow,
          opacity,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
          transition: "all 0.3s ease",
          lineHeight: 1.35,
        }}
      >
        {label}

        {/* Supplier -> Component */}
        <Handle
          id="component-target"
          type="target"
          position={Position.Top}
          style={{
            background: borderColor,
            width: 8,
            height: 8,
          }}
        />

        {/* Component -> Product */}
        <Handle
          id="component-product-source"
          type="source"
          position={Position.Bottom}
          style={{
            background: borderColor,
            width: 8,
            height: 8,
          }}
        />

        {/* Component -> Component */}
        <Handle
          id="component-dependency-source"
          type="source"
          position={Position.Right}
          style={{
            background: borderColor,
            width: 8,
            height: 8,
          }}
        />

        {/* Component <- Component */}
        <Handle
          id="component-dependency-target"
          type="target"
          position={Position.Left}
          style={{
            background: borderColor,
            width: 8,
            height: 8,
          }}
        />
      </div>
    );
  }

  // ===================================================
  // PRODUCT
  // ===================================================

  if (kind === "product") {
    return (
      <div
        style={{
          position: "relative",
          width: 260,
          minHeight: 72,
          padding: "16px 20px",
          borderRadius: 16,
          border: `3px solid ${borderColor}`,
          background,
          color: textColor,
          fontWeight: 700,
          textAlign: "center",
          boxShadow,
          opacity,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
          transition: "all 0.3s ease",
          lineHeight: 1.35,
        }}
      >
        {label}

        {/* Component -> Product */}
        <Handle
          id="product-target"
          type="target"
          position={Position.Top}
          style={{
            background: borderColor,
            width: 8,
            height: 8,
          }}
        />
      </div>
    );
  }

  return null;
}

// =====================================================
// NODE TYPES
// =====================================================

const nodeTypes = {
  graphNode: GraphNode,
};

// =====================================================
// CUSTOM EDGE
// =====================================================

function DependencyEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  label,
  labelColor = "#475569",
  labelOffsetY = 0,
}) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 14,
    offset: 24,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={style}
        markerEnd={markerEnd}
      />

      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${
                labelY + labelOffsetY
              }px)`,

              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.6px",
              color: labelColor,

              background: "rgba(255,255,255,0.96)",
              border: "1px solid #e2e8f0",
              borderRadius: 5,
              padding: "4px 7px",

              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 10,

              boxShadow: "0 1px 3px rgba(15,23,42,0.08)",
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

// =====================================================
// EDGE TYPES
// =====================================================

const edgeTypes = {
  dependency: DependencyEdge,
};

// =====================================================
// MAIN GRAPH
// =====================================================

function Graph({ supplierId, impact }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  const [graphData, setGraphData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ===================================================
  // AFFECTED IDS
  // ===================================================

  const affectedComponentIds = useMemo(() => {
    return new Set(
      (impact?.affected_components || []).map((component) =>
        String(component.id)
      )
    );
  }, [impact]);

  const affectedProductIds = useMemo(() => {
    return new Set(
      (impact?.affected_products || []).map((product) =>
        String(product.id)
      )
    );
  }, [impact]);

  // ===================================================
  // LOAD GRAPH DATA
  // ONLY WHEN SUPPLIER CHANGES
  // ===================================================

  useEffect(() => {
    if (!supplierId) {
      setGraphData(null);
      setNodes([]);
      setEdges([]);
      setLoading(false);
      return;
    }

    const loadGraph = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `${API_URL}/api/graph/supplier/${supplierId}`
        );

        setGraphData(response.data);
      } catch (err) {
        console.error("Graph error:", err);

        setError("Unable to load dependency graph.");

        setGraphData(null);
        setNodes([]);
        setEdges([]);
      } finally {
        setLoading(false);
      }
    };

    loadGraph();
  }, [supplierId]);

  // ===================================================
  // BUILD GRAPH
  // RUNS WHEN GRAPH DATA OR IMPACT CHANGES
  // ===================================================

  useEffect(() => {
    if (!graphData) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // =================================================
    // SEPARATE NODES
    // =================================================

    const suppliers = (graphData.nodes || []).filter(
      (node) => node.type === "supplier"
    );

    const components = (graphData.nodes || []).filter(
      (node) => node.type === "component"
    );

    const products = (graphData.nodes || []).filter(
      (node) => node.type === "product"
    );

    // =================================================
    // GRAPH DIMENSIONS
    // =================================================

    const graphWidth = Math.max(
      1200,
      components.length * 330,
      products.length * 330
    );

    // =================================================
    // SUPPLIER NODES
    // =================================================

    const supplierSpacing = 320;

    const supplierTotalWidth =
      Math.max(1, suppliers.length) * supplierSpacing;

    const supplierStartX =
      (graphWidth - supplierTotalWidth) / 2;

    const supplierNodes = suppliers.map((node, index) => {
      return {
        id: String(node.id),
        type: "graphNode",

        position: {
          x: supplierStartX + index * supplierSpacing,
          y: 40,
        },

        data: {
          label: `${node.label}`,
          kind: "supplier",

          boxShadow: impact
            ? "0 0 0 7px rgba(148,163,184,0.25), 0 8px 20px rgba(15,23,42,0.15)"
            : "0 8px 20px rgba(15,23,42,0.15)",
        },

        draggable: true,
      };
    });

    // =================================================
    // COMPONENT NODES
    // =================================================

    const componentSpacing = 330;

    const componentTotalWidth =
      Math.max(1, components.length) * componentSpacing;

    const componentStartX =
      (graphWidth - componentTotalWidth) / 2;

    const componentNodes = components.map(
      (node, index) => {
        const criticality = String(
          node.criticality || ""
        ).toLowerCase();

        const isAffected = affectedComponentIds.has(
          String(node.id)
        );

        // ---------------------------------------------
        // NORMAL COLOR
        // ---------------------------------------------

        let normalBorderColor = "#2563eb";

        if (criticality === "critical") {
          normalBorderColor = "#dc2626";
        } else if (criticality === "high") {
          normalBorderColor = "#f59e0b";
        } else if (criticality === "low") {
          normalBorderColor = "#16a34a";
        }

        // ---------------------------------------------
        // DEFAULT STYLE
        // ---------------------------------------------

        let borderColor = normalBorderColor;
        let background = "#ffffff";
        let textColor = "#111827";

        let boxShadow =
          "0 6px 15px rgba(0,0,0,0.08)";

        let opacity = 1;

        // ---------------------------------------------
        // AFTER SIMULATION
        // ---------------------------------------------

        if (impact) {
          if (isAffected) {
            borderColor = "#dc2626";
            background = "#fef2f2";
            textColor = "#111827";

            boxShadow =
              "0 0 0 7px rgba(220,38,38,0.12), 0 8px 20px rgba(220,38,38,0.18)";

            opacity = 1;
          } else {
            borderColor = "#cbd5e1";
            background = "#f8fafc";
            textColor = "#94a3b8";

            boxShadow = "none";
            opacity = 0.45;
          }
        }

        return {
          id: String(node.id),
          type: "graphNode",

          position: {
            x:
              componentStartX +
              index * componentSpacing,
            y: 270,
          },

          data: {
            label: `${node.label}`,
            kind: "component",

            borderColor,
            background,
            textColor,
            boxShadow,
            opacity,
          },

          draggable: true,
        };
      }
    );

    // =================================================
    // PRODUCT NODES
    // =================================================

    const productSpacing = 330;

    const productTotalWidth =
      Math.max(1, products.length) * productSpacing;

    const productStartX =
      (graphWidth - productTotalWidth) / 2;

    const productNodes = products.map(
      (node, index) => {
        const riskLevel = String(
          node.risk_level || ""
        ).toLowerCase();

        const isAffected = affectedProductIds.has(
          String(node.id)
        );

        // ---------------------------------------------
        // NORMAL COLOR
        // ---------------------------------------------

        let normalBorderColor = "#2563eb";

        if (riskLevel === "critical") {
          normalBorderColor = "#dc2626";
        } else if (riskLevel === "high") {
          normalBorderColor = "#f59e0b";
        } else if (riskLevel === "low") {
          normalBorderColor = "#16a34a";
        }

        // ---------------------------------------------
        // DEFAULT STYLE
        // ---------------------------------------------

        let borderColor = normalBorderColor;
        let background = "#ffffff";
        let textColor = "#111827";

        let boxShadow =
          "0 6px 15px rgba(0,0,0,0.08)";

        let opacity = 1;

        // ---------------------------------------------
        // AFTER SIMULATION
        // ---------------------------------------------

        if (impact) {
          if (isAffected) {
            borderColor = "#f97316";
            background = "#fff7ed";
            textColor = "#111827";

            boxShadow =
              "0 0 0 7px rgba(249,115,22,0.12), 0 8px 20px rgba(249,115,22,0.18)";

            opacity = 1;
          } else {
            borderColor = "#cbd5e1";
            background = "#f8fafc";
            textColor = "#94a3b8";

            boxShadow = "none";
            opacity = 0.45;
          }
        }

        return {
          id: String(node.id),
          type: "graphNode",

          position: {
            x:
              productStartX +
              index * productSpacing,
            y: 510,
          },

          data: {
            label: `${node.label}`,
            kind: "product",

            borderColor,
            background,
            textColor,
            boxShadow,
            opacity,
          },

          draggable: true,
        };
      }
    );

    // =================================================
    // SET NODES
    // =================================================

    setNodes([
      ...supplierNodes,
      ...componentNodes,
      ...productNodes,
    ]);

    // =================================================
    // EDGES
    // =================================================

    const formattedEdges = (
      graphData.edges || []
    ).map((edge, index) => {
      const sourceId = String(edge.source);
      const targetId = String(edge.target);

      const sourceAffected =
        affectedComponentIds.has(sourceId) ||
        affectedProductIds.has(sourceId);

      const targetAffected =
        affectedComponentIds.has(targetId) ||
        affectedProductIds.has(targetId);

      const isAffectedEdge =
        sourceAffected || targetAffected;

      // ---------------------------------------------
      // EDGE TYPE
      // ---------------------------------------------

      const edgeType = String(
        edge.type || ""
      ).toUpperCase();

      // ---------------------------------------------
      // HANDLE MAPPING
      // ---------------------------------------------

      let sourceHandle;
      let targetHandle;

      switch (edgeType) {
        case "SUPPLIES":
          sourceHandle = "supplier-source";
          targetHandle = "component-target";
          break;

        case "USED_IN":
          sourceHandle = "component-product-source";
          targetHandle = "product-target";
          break;

        case "DEPENDS_ON":
          sourceHandle =
            "component-dependency-source";

          targetHandle =
            "component-dependency-target";
          break;

        default:
          break;
      }

      // ---------------------------------------------
      // EDGE STYLE
      // ---------------------------------------------

      let stroke = "#94a3b8";
      let strokeWidth = 2;
      let opacity = 1;

      if (impact) {
        if (isAffectedEdge) {
          stroke = "#dc2626";
          strokeWidth = 3;
          opacity = 1;
        } else {
          stroke = "#cbd5e1";
          strokeWidth = 2;
          opacity = 0.35;
        }
      }

      // ---------------------------------------------
      // LABEL COLOR
      // ---------------------------------------------

      const labelColor = impact
        ? isAffectedEdge
          ? "#dc2626"
          : "#94a3b8"
        : "#475569";

      // ---------------------------------------------
      // LABEL
      // ---------------------------------------------

      let displayLabel = "";

      if (edgeType === "SUPPLIES") {
        displayLabel = "SUPPLIES";
      } else if (edgeType === "USED_IN") {
        displayLabel = "USED IN";
      } else if (edgeType === "DEPENDS_ON") {
        displayLabel = "DEPENDS ON";
      } else {
        displayLabel = edge.type || "";
      }

      // ---------------------------------------------
      // LABEL POSITION
      // ---------------------------------------------

      let labelOffsetY = 0;

      if (edgeType === "SUPPLIES") {
        labelOffsetY = -6;
      }

      if (edgeType === "USED_IN") {
        labelOffsetY = -8;
      }

      if (edgeType === "DEPENDS_ON") {
        labelOffsetY = -18;
      }

      return {
        id:
          edge.id ||
          `edge-${sourceId}-${targetId}-${index}`,

        source: sourceId,
        target: targetId,

        sourceHandle,
        targetHandle,

        type: "dependency",

        label: displayLabel,
        labelColor,
        labelOffsetY,

        animated: impact
          ? isAffectedEdge
          : true,

        style: {
          stroke,
          strokeWidth,
          opacity,
          strokeDasharray: "7 6",
        },

        data: {
          edgeType,
        },

        zIndex: 1,
      };
    });

    setEdges(formattedEdges);
  }, [
    graphData,
    impact,
    affectedComponentIds,
    affectedProductIds,
  ]);

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <section className="analysis-card">
        <p>Loading dependency graph...</p>
      </section>
    );
  }

  // ===================================================
  // ERROR
  // ===================================================

  if (error) {
    return (
      <section className="analysis-card">
        <p
          style={{
            color: "#dc2626",
          }}
        >
          {error}
        </p>
      </section>
    );
  }

  // ===================================================
  // GRAPH UI
  // ===================================================

  return (
    <section
      style={{
        marginTop: "32px",
        background: "white",
        borderRadius: "16px",
        padding: "24px",
        border: "1px solid #e5e7eb",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            fontWeight: "700",
            letterSpacing: "2px",
            color: "#64748b",
          }}
        >
          DEPENDENCY GRAPH
        </div>

        <h2
          style={{
            margin: "8px 0",
            fontSize: "24px",
            color: "#111827",
          }}
        >
          Supply Chain Dependency Graph
        </h2>

        <p
          style={{
            color: "#64748b",
            marginBottom: 0,
          }}
        >
          Explore how suppliers, components and
          products are connected.
        </p>
      </div>

      {/* LEGEND */}

      <div
        style={{
          display: "flex",
          gap: "20px",
          marginBottom: "16px",
          flexWrap: "wrap",
          fontSize: "13px",
          color: "#475569",
        }}
      >
        <span>🔴 Critical</span>
        <span>🟠 High Risk</span>
        <span>🔵 Normal</span>
        <span>🟢 Low Risk</span>

        {impact && (
          <>
            <span>🔴 Affected Component</span>
            <span>🟠 Affected Product</span>
          </>
        )}
      </div>

      {/* GRAPH */}

      <div
        style={{
          height: "540px",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          overflow: "hidden",
          background: "#ffffff",
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{
            padding: 0.18,
            minZoom: 0.55,
            maxZoom: 1.15,
          }}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          proOptions={{
            hideAttribution: false,
          }}
        >
          <Background
            gap={16}
            size={1}
            color="#cbd5e1"
          />

          <Controls />

          <MiniMap
            nodeColor={(node) => {
              // -----------------------------------------
              // SUPPLIER
              // -----------------------------------------

              if (
                node.data?.kind === "supplier"
              ) {
                return "#111827";
              }

              // -----------------------------------------
              // COMPONENT
              // -----------------------------------------

              if (
                node.data?.kind === "component"
              ) {
                if (
                  impact &&
                  affectedComponentIds.has(
                    String(node.id)
                  )
                ) {
                  return "#dc2626";
                }

                return (
                  node.data?.borderColor ||
                  "#2563eb"
                );
              }

              // -----------------------------------------
              // PRODUCT
              // -----------------------------------------

              if (
                node.data?.kind === "product"
              ) {
                if (
                  impact &&
                  affectedProductIds.has(
                    String(node.id)
                  )
                ) {
                  return "#f97316";
                }

                return (
                  node.data?.borderColor ||
                  "#2563eb"
                );
              }

              return "#2563eb";
            }}
            nodeStrokeWidth={3}
            maskColor="rgba(241,245,249,0.75)"
          />
        </ReactFlow>
      </div>
    </section>
  );
}

export default Graph;