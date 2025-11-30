import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGraphStore } from '@/stores/graphStore';
import { DependencyGraph, Edge } from '@/types/graph';
import { GlobalMetrics } from '@/types/metrics';
import { RefactoringChange } from '@/types/refactoring';
import { recalculateMetrics } from '@/utils/metricsCalculator';
import { GraphManipulationControls } from '@/components/Refactoring/GraphManipulationControls';
import { MetricsComparison } from '@/components/Refactoring/MetricsComparison';
import { Graph3D } from '@/components/Graph3D/Graph3D';
import { LayoutSelector } from '@/components/Graph3D/LayoutSelector'; // Import the real component
import { Github, Folder, FileJson, GitBranch, ArrowRight, X, Circle } from 'lucide-react';

export const RefactoringPage = () => {
  const originalGraph = useGraphStore(state => state.graph);
  const originalMetrics = useGraphStore(state => state.globalMetrics);
  const analysisSource = useGraphStore(state => state.analysisSource);
  const navigate = useNavigate();

  const [modifiedGraph, setModifiedGraph] = useState<DependencyGraph | null>(null);
  const [modifiedMetrics, setModifiedMetrics] = useState<GlobalMetrics | null>(null);
  const [changes, setChanges] = useState<RefactoringChange[]>([]);
  const [controlsExpanded, setControlsExpanded] = useState(true);
  const [graphInteracted, setGraphInteracted] = useState(false);
  const [removedEdgeIds, setRemovedEdgeIds] = useState<string[]>([]); // Track removed edges to show in red
  const [removedNodeIds, setRemovedNodeIds] = useState<string[]>([]); // Track removed nodes to show in red
  const [addedNodeIds, setAddedNodeIds] = useState<string[]>([]); // Track added nodes to show in green
  const [addedEdgeIds, setAddedEdgeIds] = useState<string[]>([]); // Track added edges to show in green
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null); // Track node to glow on hover
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null); // Track node to focus camera on


  // Initialize modified graph from original
  useEffect(() => {
    if (originalGraph) {
      setModifiedGraph(JSON.parse(JSON.stringify(originalGraph)));
    }
  }, [originalGraph]);

  // Recalculate metrics when modified graph changes (excluding removed edges)
  useEffect(() => {
    if (modifiedGraph && changes.length > 0) {
      // Filter out removed edges for metrics calculation
      const graphForMetrics = {
        ...modifiedGraph,
        edges: modifiedGraph.edges.filter(e => !removedEdgeIds.includes(e.id))
      };
      const newMetrics = recalculateMetrics(graphForMetrics);
      setModifiedMetrics(newMetrics);
    } else {
      setModifiedMetrics(null);
    }
  }, [modifiedGraph, changes, removedEdgeIds]);

  const handleRemoveNode = (nodeId: string) => {
    if (!modifiedGraph) return;
    const node = modifiedGraph.nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Find all edges connected to this node
    const connectedEdgeIds = modifiedGraph.edges
      .filter(e => e.source === nodeId || e.target === nodeId)
      .map(e => e.id);

    // Mark node as removed (keep it in graph but track it)
    setRemovedNodeIds(prev => [...prev, nodeId]);

    // Mark all connected edges as removed
    setRemovedEdgeIds(prev => [...prev, ...connectedEdgeIds]);

    setChanges(prev => [...prev, {
      id: `change-${Date.now()}`,
      type: 'remove_node',
      description: `Removed node: ${node.label}`,
      data: { nodeId, label: node.label, connectedEdgeIds },
      timestamp: new Date().toISOString(),
    }]);
  };

  const handleRemoveEdge = (edgeId: string) => {
    if (!modifiedGraph) return;
    const edge = modifiedGraph.edges.find(e => e.id === edgeId);
    if (!edge) return;

    // Add to removed edges list (keeps it visible in red)
    setRemovedEdgeIds(prev => [...prev, edgeId]);

    // Add to change history
    setChanges(prev => [...prev, {
      id: `change-${Date.now()}`,
      type: 'remove_edge',
      description: `Removed dependency: ${edge.source} → ${edge.target}`,
      data: { edgeId, edge },
      timestamp: new Date().toISOString(),
    }]);
  };

  const handleAddEdge = (source: string, target: string) => {
    if (!modifiedGraph) return;
    const sNode = modifiedGraph.nodes.find(n => n.id === source);
    const tNode = modifiedGraph.nodes.find(n => n.id === target);
    if (!sNode || !tNode) return;
    const newEdge: Edge = { id: `edge-${Date.now()}`, source, target, imports: ['manual'], weight: 1, thickness: 0.5 };
    setModifiedGraph({ ...modifiedGraph, edges: [...modifiedGraph.edges, newEdge] });
    setAddedEdgeIds(prev => [...prev, newEdge.id]); // Track added edge
    setChanges(prev => [...prev, {
      id: `change-${Date.now()}`, type: 'add_edge', description: `Added dependency: ${sNode.label} → ${tNode.label}`,
      data: { source, target, edgeId: newEdge.id }, timestamp: new Date().toISOString(),
    }]);
  };

  const handleAddNode = (name: string, connections: string[]) => {
    if (!modifiedGraph) return;
    const newNodeId = `node-${Date.now()}`;
    const newNode = {
      id: newNodeId,
      label: name,
      module: 'manual',
      type: 'service',
      position: { x: Math.random() * 40 - 20, y: Math.random() * 40 - 20, z: Math.random() * 40 - 20 },
      color: '#10b981', // Emerald-500
      metrics: {
        cyclomatic_complexity: 1,
        halstead_volume: 0,
        maintainability_index: 100,
        is_hot_zone: false
      }
    };

    const newEdges = connections.map(targetId => ({
      id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      source: newNodeId,
      target: targetId,
      imports: ['manual'],
      weight: 1,
      thickness: 0.5
    }));

    setModifiedGraph({
      ...modifiedGraph,
      nodes: [...modifiedGraph.nodes, newNode],
      edges: [...modifiedGraph.edges, ...newEdges]
    });

    setAddedNodeIds(prev => [...prev, newNodeId]);
    setAddedEdgeIds(prev => [...prev, ...newEdges.map(e => e.id)]); // Track edges created with node

    setChanges(prev => [...prev, {
      id: `change-${Date.now()}`,
      type: 'add_node',
      description: `Added node: ${name} (${connections.length} connections)`,
      data: { nodeId: newNodeId, edges: newEdges },
      timestamp: new Date().toISOString(),
    }]);

    // Focus camera on newly added node and highlight it
    setFocusNodeId(null);
    setHighlightedNodeId(null);
    setTimeout(() => {
      setFocusNodeId(newNodeId);
      setHighlightedNodeId(newNodeId);
    }, 50);

    // Clear highlight after 3 seconds
    setTimeout(() => setHighlightedNodeId(null), 3050);
  };

  const handleUndoChange = (changeId: string) => {
    if (!modifiedGraph) return;

    const change = changes.find(c => c.id === changeId);
    if (!change) return;

    // Reverse the change based on its type
    switch (change.type) {
      case 'remove_node':
        // Restore the node by removing from removed list
        setRemovedNodeIds(prev => prev.filter(id => id !== change.data.nodeId));
        // Also restore connected edges
        if (change.data.connectedEdgeIds) {
          setRemovedEdgeIds(prev => prev.filter(id => !change.data.connectedEdgeIds.includes(id)));
        }
        break;

      case 'remove_edge':
        // Restore the edge from removedEdgeIds
        setRemovedEdgeIds(prev => prev.filter(id => id !== change.data.edgeId));
        break;

      case 'add_edge':
        // Remove the added edge
        setModifiedGraph({
          ...modifiedGraph,
          edges: modifiedGraph.edges.filter(e => e.id !== change.data.edgeId)
        });
        setAddedEdgeIds(prev => prev.filter(id => id !== change.data.edgeId));
        break;

      case 'add_node':
        // Remove the added node and its edges
        const edgeIdsToRemove = change.data.edges?.map((e: Edge) => e.id) || [];
        setModifiedGraph({
          ...modifiedGraph,
          nodes: modifiedGraph.nodes.filter(n => n.id !== change.data.nodeId),
          edges: modifiedGraph.edges.filter(e => e.source !== change.data.nodeId)
        });
        setAddedNodeIds(prev => prev.filter(id => id !== change.data.nodeId));
        setAddedEdgeIds(prev => prev.filter(id => !edgeIdsToRemove.includes(id)));
        break;
    }

    // Remove the change from history
    setChanges(prev => prev.filter(c => c.id !== changeId));
  };

  const handleReset = () => {
    if (originalGraph) {
      setModifiedGraph(JSON.parse(JSON.stringify(originalGraph)));
      setChanges([]);
      setModifiedMetrics(null);
      setRemovedEdgeIds([]);
      setRemovedNodeIds([]);
      setAddedNodeIds([]);
      setAddedEdgeIds([]);
    }
  };

  if (!originalGraph || !originalMetrics) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto mb-4">
            <GitBranch className="w-6 h-6 text-teal-600" />
          </div>

          <h2 className="text-lg font-bold text-slate-900 mb-2">
            Refactoring Scenarios
          </h2>

          <p className="text-sm text-slate-600 mb-6">
            Experiment with architectural changes and see how metrics update in real-time. Analyze a project first.
          </p>

          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg font-medium text-sm hover:bg-teal-600 transition-colors"
          >
            Analyze Project <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const sourceIcon = {
    github: <Github className="w-4 h-4" />,
    local: <Folder className="w-4 h-4" />,
    import: <FileJson className="w-4 h-4" />,
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex-shrink-0 z-30 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-semibold text-slate-900">Refactoring Sandbox</span>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
              {analysisSource && sourceIcon[analysisSource.type]}
              <span className="font-mono truncate max-w-[200px]">
                {analysisSource?.url || analysisSource?.fileName || 'Unknown Source'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            {changes.length > 0 && (
              <span className="px-2 py-1 bg-teal-50 text-teal-700 rounded-md font-medium">
                {changes.length} change{changes.length !== 1 ? 's' : ''}
              </span>
            )}
            {modifiedGraph && (
              <span>
                <span className="font-mono font-semibold text-slate-700">{modifiedGraph.nodes.length}</span> nodes
                <span className="mx-1.5 text-slate-600">·</span>
                <span className="font-mono font-semibold text-slate-700">{modifiedGraph.edges.length}</span> edges
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Left: Controls */}
        {controlsExpanded ? (
          <div className="w-72 border-r border-slate-200 bg-white overflow-y-auto custom-scrollbar z-20 flex-shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h3 className="text-sm font-semibold text-slate-900">Modifications</h3>
              <button onClick={() => setControlsExpanded(false)} className="text-slate-600 hover:text-slate-600 hover:bg-slate-100 rounded p-1 -mr-1">
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            </div>
            <div className="p-4">
            {modifiedGraph && (
              <GraphManipulationControls
                graph={modifiedGraph}
                onRemoveNode={handleRemoveNode}
                onRemoveEdge={handleRemoveEdge}
                removedEdgeIds={removedEdgeIds}
                onAddEdge={handleAddEdge}
                onAddNode={handleAddNode}
                onReset={handleReset}
                changesCount={changes.length}
              />
            )}
            {changes.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-medium text-slate-600 mb-3">History</h4>
                <div className="space-y-2">
                  {changes.slice().reverse().map((change, idx) => (
                    <div
                      key={change.id}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 group transition-colors hover:border-teal-300 hover:bg-teal-50/30 cursor-pointer"
                      onClick={() => {
                        if (change.type === 'add_node' && change.data?.nodeId) {
                          setFocusNodeId(null);
                          setTimeout(() => setFocusNodeId(change.data.nodeId), 10);
                        }
                      }}
                      onMouseEnter={() => {
                        if (change.type === 'add_node' && change.data?.nodeId) {
                          setHighlightedNodeId(change.data.nodeId);
                        }
                      }}
                      onMouseLeave={() => setHighlightedNodeId(null)}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-mono text-slate-600 mt-0.5">#{changes.length - idx}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase mb-1 ${change.type.includes('remove') ? 'bg-rose-100 text-rose-600' : 'bg-teal-100 text-teal-600'
                            }`}>
                            {change.type.replace('_', ' ')}
                          </div>
                          <p className="text-slate-600 truncate">{change.description}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUndoChange(change.id); }}
                          aria-label="Undo this change"
                          title="Undo this change"
                          className="text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded p-1 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          </div>
        ) : (
          <div className="w-12 border-r border-slate-200 bg-white flex flex-col items-center py-4 gap-2 z-20 flex-shrink-0">
            <button onClick={() => setControlsExpanded(true)} className="text-slate-600 hover:text-slate-600 hover:bg-slate-100 rounded p-2">
              <ArrowRight className="w-5 h-5" />
            </button>

            {/* Change count badges with icons - only show if changes exist */}
            <div className="flex flex-col gap-3 mt-2">
              {/* Nodes badge */}
              {(addedNodeIds.length > 0 || removedNodeIds.length > 0) && (
                <div className="relative w-9 h-9">
                  <div className="w-9 h-9 bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center">
                    <Circle className="w-4 h-4 text-slate-600" />
                  </div>
                  {addedNodeIds.length > 0 && (
                    <div
                      className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold border border-white shadow-sm"
                      title={`${addedNodeIds.length} node${addedNodeIds.length > 1 ? 's' : ''} added`}
                    >
                      +{addedNodeIds.length}
                    </div>
                  )}
                  {removedNodeIds.length > 0 && (
                    <div
                      className="absolute -bottom-1 -right-1 bg-rose-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold border border-white shadow-sm"
                      title={`${removedNodeIds.length} node${removedNodeIds.length > 1 ? 's' : ''} removed`}
                    >
                      −{removedNodeIds.length}
                    </div>
                  )}
                </div>
              )}

              {/* Edges badge */}
              {(addedEdgeIds.length > 0 || removedEdgeIds.length > 0) && (
                <div className="relative w-9 h-9">
                  <div className="w-9 h-9 bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-slate-600" />
                  </div>
                  {addedEdgeIds.length > 0 && (
                    <div
                      className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold border border-white shadow-sm"
                      title={`${addedEdgeIds.length} edge${addedEdgeIds.length > 1 ? 's' : ''} added`}
                    >
                      +{addedEdgeIds.length}
                    </div>
                  )}
                  {removedEdgeIds.length > 0 && (
                    <div
                      className="absolute -bottom-1 -right-1 bg-rose-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold border border-white shadow-sm"
                      title={`${removedEdgeIds.length} edge${removedEdgeIds.length > 1 ? 's' : ''} removed`}
                    >
                      −{removedEdgeIds.length}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Center: Graph */}
        <div className="flex-1 relative bg-slate-50 overflow-hidden"
          onClick={() => { if (!graphInteracted) { setGraphInteracted(true); setControlsExpanded(false); } }}>

          {/*
            USE ACTUAL LAYOUT SELECTOR HERE
            1. Pass modifiedGraph/Metrics so it updates correctly.
            2. Pass className to position it absolutely inside this div.
          */}
          <LayoutSelector
            customGraph={modifiedGraph}
            customMetrics={modifiedMetrics}
            className="absolute top-4 right-4 z-40"
          />

          {modifiedGraph ? (
            <Graph3D
              customGraph={modifiedGraph}
              disableImpactAnalysis={true}
              hideClusterBoxes={false} // Graph3D listens to UI Store now
              hideLayoutSelector={true} // Hide internal, use the external one above
              hideNodeMetrics={true}
              hideControlsLegend={false}
              removedEdgeIds={removedEdgeIds}
              removedNodeIds={removedNodeIds}
              addedNodeIds={addedNodeIds}
              addedEdgeIds={addedEdgeIds}
              highlightedNodeId={highlightedNodeId}
              focusNodeId={focusNodeId}
              onNodeDragEnd={(nodeId, position) => {
                if (modifiedGraph) {
                  setModifiedGraph({
                    ...modifiedGraph,
                    nodes: modifiedGraph.nodes.map(n =>
                      n.id === nodeId ? { ...n, position } : n
                    )
                  });
                }
              }}
            // Note: We do NOT pass 'layout' or 'selectedModule' props here.
            // Graph3D will listen to the same store that LayoutSelector updates.
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600 font-mono text-sm">
              NO GRAPH LOADED
            </div>
          )}

        </div>

        {/* Right: Metrics Comparison */}
        <div className="w-96 border-l border-slate-200 bg-white flex flex-col z-20 flex-shrink-0 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
            <h2 className="text-sm font-semibold text-slate-900">Metrics Comparison</h2>
            <p className="text-sm text-slate-600 mt-0.5">Before & after your changes</p>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 min-h-0 overflow-hidden">
            <MetricsComparison
              original={originalMetrics}
              modified={modifiedMetrics}
            />
          </div>
        </div>
      </div>
    </div>
  );
};