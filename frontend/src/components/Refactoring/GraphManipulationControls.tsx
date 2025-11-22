import { useState } from 'react';
import { DependencyGraph, Node, Edge } from '@/types/graph';
import { Trash2, Link as LinkIcon, RotateCcw, X, Plus } from 'lucide-react';
import { AddNodeModal } from './AddNodeModal';

interface GraphManipulationControlsProps {
  graph: DependencyGraph;
  onRemoveNode: (nodeId: string) => void;
  onRemoveEdge: (edgeId: string) => void;
  removedEdgeIds: string[];
  onAddEdge: (source: string, target: string) => void;
  onAddNode: (name: string, connections: string[]) => void;
  onReset: () => void;
  changesCount: number;
}

export const GraphManipulationControls = ({
  graph,
  onRemoveNode,
  onRemoveEdge,
  removedEdgeIds,
  onAddEdge,
  onAddNode,
  onReset,
  changesCount,
}: GraphManipulationControlsProps) => {
  const [showAddEdge, setShowAddEdge] = useState(false);
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [showNodeList, setShowNodeList] = useState(false);
  const [showEdgeList, setShowEdgeList] = useState(false);

  const handleAddEdge = () => {
    if (selectedSource && selectedTarget && selectedSource !== selectedTarget) {
      onAddEdge(selectedSource, selectedTarget);
      setSelectedSource('');
      setSelectedTarget('');
      setShowAddEdge(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Change count and Reset button */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-600 font-medium leading-none">
          {changesCount} change{changesCount !== 1 ? 's' : ''} made
        </p>
        <button
          onClick={onReset}
          disabled={changesCount === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors leading-none"
        >
          <RotateCcw className="w-3 h-3" />
          Reset All
        </button>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setShowAddNodeModal(true)}
          className="flex flex-col items-center gap-1.5 p-3 bg-white border border-slate-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors group"
        >
          <Plus className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
          <span className="text-[10px] font-bold text-slate-600 group-hover:text-emerald-700">
            Add Node
          </span>
        </button>

        <button
          onClick={() => {
            setShowAddEdge(!showAddEdge);
            setShowNodeList(false);
            setShowEdgeList(false);
          }}
          className="flex flex-col items-center gap-1.5 p-3 bg-white border border-slate-200 rounded-lg hover:border-teal-300 hover:bg-teal-50 transition-colors group"
        >
          <LinkIcon className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
          <span className="text-[10px] font-bold text-slate-600 group-hover:text-teal-700">
            Add Edge
          </span>
        </button>

        <button
          onClick={() => {
            setShowNodeList(!showNodeList);
            setShowEdgeList(false);
            setShowAddEdge(false);
          }}
          className="flex flex-col items-center gap-1.5 p-3 bg-white border border-slate-200 rounded-lg hover:border-rose-300 hover:bg-rose-50 transition-colors group"
        >
          <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-rose-600" />
          <span className="text-[10px] font-bold text-slate-600 group-hover:text-rose-700">
            Remove Node
          </span>
        </button>

        <button
          onClick={() => {
            setShowEdgeList(!showEdgeList);
            setShowNodeList(false);
            setShowAddEdge(false);
          }}
          className="flex flex-col items-center gap-1.5 p-3 bg-white border border-slate-200 rounded-lg hover:border-amber-300 hover:bg-amber-50 transition-colors group"
        >
          <X className="w-4 h-4 text-slate-400 group-hover:text-amber-600" />
          <span className="text-[10px] font-bold text-slate-600 group-hover:text-amber-700">
            Remove Edge
          </span>
        </button>
      </div>

      {/* Remove Node Panel */}
      {showNodeList && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 max-h-64 overflow-y-auto">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
            Select Node to Remove
          </div>
          <div className="space-y-1">
            {graph.nodes.map((node) => (
              <button
                key={node.id}
                onClick={() => {
                  if (confirm(`Remove node "${node.label}"? This will also remove all connected edges.`)) {
                    onRemoveNode(node.id);
                    setShowNodeList(false);
                  }
                }}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">{node.label}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{node.id}</div>
                  </div>
                  <Trash2 className="w-3 h-3 text-slate-300 group-hover:text-rose-600" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Remove Edge Panel */}
      {showEdgeList && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 max-h-64 overflow-y-auto">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
            Click Edge to Remove (shows RED on graph)
          </div>

          <div className="space-y-1">
            {graph.edges.map((edge) => {
              const sourceNode = graph.nodes.find(n => n.id === edge.source);
              const targetNode = graph.nodes.find(n => n.id === edge.target);
              const isRemoved = removedEdgeIds.includes(edge.id);

              return (
                <button
                  key={edge.id}
                  onClick={() => {
                    onRemoveEdge(edge.id);
                  }}
                  disabled={isRemoved}
                  className={`w-full text-left px-3 py-2 rounded-md border transition-colors group ${isRemoved
                    ? 'bg-rose-50 border-rose-300 cursor-not-allowed opacity-60'
                    : 'hover:bg-amber-50 border-transparent hover:border-amber-200'
                    }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className={`text-[10px] ${isRemoved ? 'text-rose-700 font-bold line-through' : 'text-slate-500'}`}>
                        {sourceNode?.label || edge.source}
                        <span className={`mx-1 ${isRemoved ? 'text-rose-400' : 'text-slate-300'}`}>→</span>
                        {targetNode?.label || edge.target}
                      </div>
                      <div className={`text-[9px] font-mono ${isRemoved ? 'text-rose-600' : 'text-slate-400'}`}>
                        {`${edge.imports.slice(0, 3).join(', ')}${edge.imports.length > 3 ? ` +${edge.imports.length - 3}` : ''}`}
                      </div>
                    </div>
                    <X className={`w-3 h-3 flex-shrink-0 ${isRemoved ? 'text-rose-600' : 'text-slate-300 group-hover:text-rose-600'
                      }`} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Edge Panel */}
      {showAddEdge && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
            Create New Dependency
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                Source Module
              </label>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-none focus:border-teal-500 transition-all"
              >
                <option value="">Select source...</option>
                {graph.nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                Target Module
              </label>
              <select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-none focus:border-teal-500 transition-all"
              >
                <option value="">Select target...</option>
                {graph.nodes
                  .filter(node => node.id !== selectedSource)
                  .map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.label}
                    </option>
                  ))}
              </select>
            </div>

            <button
              onClick={handleAddEdge}
              disabled={!selectedSource || !selectedTarget || selectedSource === selectedTarget}
              className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Dependency
            </button>
          </div>
        </div>
      )}
      {/* Add Node Modal */}
      <AddNodeModal
        isOpen={showAddNodeModal}
        onClose={() => setShowAddNodeModal(false)}
        onConfirm={onAddNode}
        nodes={graph.nodes}
      />
    </div>
  );
};
