import { useGraphStore } from '@/stores/graphStore';

export const DependencyModal = () => {
  const selectedEdge = useGraphStore(state => state.selectedEdge);
  const setSelectedEdge = useGraphStore(state => state.setSelectedEdge);
  const graph = useGraphStore(state => state.graph);

  if (!selectedEdge || !graph) return null;

  const sourceNode = graph.nodes.find((n) => n.id === selectedEdge.source);
  const targetNode = graph.nodes.find((n) => n.id === selectedEdge.target);

  const handleClose = () => setSelectedEdge(null);

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-panel max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Dependency Details</h3>
          <button
            onClick={handleClose}
            className="modal-close-button text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <p className="text-xs font-medium text-blue-600 mb-1">From</p>
            <p className="font-semibold text-gray-900">{sourceNode?.label || selectedEdge.source}</p>
          </div>

          <div className="bg-green-50 border border-green-100 rounded-xl p-3">
            <p className="text-xs font-medium text-green-600 mb-1">To</p>
            <p className="font-semibold text-gray-900">{targetNode?.label || selectedEdge.target}</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Imported Names <span className="text-gray-500 font-normal">({selectedEdge.imports.length})</span>
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 max-h-48 overflow-y-auto">
              <ul className="space-y-1.5">
                {selectedEdge.imports.map((imp, idx) => (
                  <li key={idx} className="text-sm font-mono text-gray-700">
                    • {imp}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
