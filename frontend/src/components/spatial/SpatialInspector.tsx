import { motion, AnimatePresence } from 'framer-motion';
import GlassPanel from './GlassPanel';
import { X, Layers, Maximize2 } from 'lucide-react';
import type { GraphNode } from '../../types/graph';

interface SpatialInspectorProps {
    selectedNode: GraphNode | null;
    onClose: () => void;
    onExpand: () => void;
}

const SpatialInspector: React.FC<SpatialInspectorProps> = ({ selectedNode, onClose, onExpand }) => {
    if (!selectedNode) return null;

    return (
        <AnimatePresence>
            {selectedNode && (
                <GlassPanel
                    layout
                    intensity="thick"
                    className="h-full w-full md:w-[400px] flex flex-col"
                >
                    {/* Header */}
                    <div className="p-8 border-b border-black/[0.03] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-black/[0.03] flex items-center justify-center">
                                <Layers className="w-4 h-4 text-text-secondary opacity-60" />
                            </div>
                            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] opacity-40">
                                Inspector
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-black/5 transition-all duration-300 active:scale-90"
                        >
                            <X className="w-5 h-5 text-text-secondary opacity-50" />
                        </button>
                    </div>

                    {/* Content Scroller */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">

                        {/* ID Badge */}
                        <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-black/[0.03] border border-black/[0.02]">
                            <span className="text-[10px] font-bold text-text-secondary opacity-60">
                                REF-ID: {selectedNode.id.substring(0, 8)}
                            </span>
                        </div>

                        {/* Title */}
                        <div className="space-y-3">
                            <h2 className="text-3xl font-bold text-text-primary tracking-tight leading-[1.1]">
                                {selectedNode.name}
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-2.5 py-1 rounded-md bg-black/5 text-[10px] font-bold uppercase tracking-wider text-text-primary/60">
                                    {selectedNode.type || 'Entity'}
                                </span>
                                {selectedNode.size && (
                                    <span className="px-2.5 py-1 rounded-md bg-blue-50 text-[10px] font-bold uppercase tracking-wider text-blue-600/70">
                                        Weight: {selectedNode.size.toFixed(2)}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Core Content */}
                        <div className="space-y-6">
                            <div className="p-6 rounded-2xl bg-black/[0.02] border border-black/[0.01]">
                                <h4 className="text-[10px] font-bold uppercase tracking-[0.1em] text-text-secondary opacity-40 mb-3">
                                    Entity Analysis
                                </h4>
                                <p className="text-sm font-medium text-text-primary/70 leading-relaxed">
                                    This node represents a key {selectedNode.type || 'concept'} within the current dataset.
                                    Further analysis suggests strong correlation with surrounding clusters.
                                </p>
                            </div>

                            <p className="text-xs text-text-secondary/50 leading-relaxed italic">
                                Extended metadata and source citations are being synthesized from the underlying knowledge graph.
                            </p>
                        </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="p-8 border-t border-black/[0.03]">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onExpand}
                            className="w-full flex items-center justify-center gap-3 bg-text-primary text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-black/10 transition-all duration-300"
                        >
                            <span>Open Detailed View</span>
                            <Maximize2 className="w-4 h-4" />
                        </motion.button>
                    </div>
                </GlassPanel>
            )}
        </AnimatePresence>
    );
};

export default SpatialInspector;
