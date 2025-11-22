import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Node } from '@/types/graph';
import { Plus, Check } from 'lucide-react';

interface AddNodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (name: string, connections: string[]) => void;
    nodes: Node[];
}

export const AddNodeModal = ({ isOpen, onClose, onConfirm, nodes }: AddNodeModalProps) => {
    const [name, setName] = useState('');
    const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const handleSubmit = () => {
        if (!name.trim()) return;
        onConfirm(name, selectedConnections);
        onClose();
        // Reset state
        setName('');
        setSelectedConnections([]);
        setSearchTerm('');
    };

    const toggleConnection = (nodeId: string) => {
        setSelectedConnections(prev =>
            prev.includes(nodeId)
                ? prev.filter(id => id !== nodeId)
                : [...prev, nodeId]
        );
    };

    const filteredNodes = nodes.filter(node =>
        node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Node">
            <div className="space-y-6 p-1">
                {/* Name Input */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                        Node Name
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. PaymentService"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:border-teal-500 transition-all"
                        autoFocus
                    />
                </div>

                {/* Connections Selection */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                        Connect to Existing Nodes (Optional)
                    </label>

                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search nodes..."
                        className="w-full px-3 py-1.5 mb-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-none focus:border-teal-500"
                    />

                    <div className="border border-slate-200 rounded-md max-h-60 overflow-y-auto bg-slate-50/50">
                        {filteredNodes.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400 italic">
                                No nodes found
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredNodes.map(node => {
                                    const isSelected = selectedConnections.includes(node.id);
                                    return (
                                        <button
                                            key={node.id}
                                            onClick={() => toggleConnection(node.id)}
                                            className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white transition-colors ${isSelected ? 'bg-teal-50/50' : ''
                                                }`}
                                        >
                                            <div className="min-w-0 flex-1 pr-2">
                                                <div className={`text-xs font-medium ${isSelected ? 'text-teal-700' : 'text-slate-700'}`}>
                                                    {node.label}
                                                </div>
                                                <div className="text-[10px] text-slate-400 truncate font-mono">
                                                    {node.id}
                                                </div>
                                            </div>
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected
                                                ? 'bg-teal-500 border-teal-500 text-white'
                                                : 'border-slate-300 bg-white'
                                                }`}>
                                                {isSelected && <Check className="w-3 h-3" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5">
                        Selected: {selectedConnections.length} node{selectedConnections.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!name.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add Node
                    </button>
                </div>
            </div>
        </Modal>
    );
};
