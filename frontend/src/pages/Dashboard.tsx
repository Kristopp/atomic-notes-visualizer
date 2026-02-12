import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SpatialLayout from '../layouts/SpatialLayout';
import SpatialHeader from '../components/spatial/SpatialHeader';
import SpatialSidebar from '../components/spatial/SpatialSidebar';
import SpatialSessionDock from '../components/spatial/SpatialSessionDock';
import SpatialInspector from '../components/spatial/SpatialInspector';
import GraphCanvas from '../components/graph/GraphCanvas';
import JobProgressTracker from '../components/dashboard/JobProgressTracker';
import DeleteConfirmModal from '../components/dashboard/DeleteConfirmModal';
import { transformAPIToGraphData } from '../utils/graph-transformer';
import type { GraphData, GraphNode } from '../types/graph';

// Hardcoded for now, should come from env or config
const API_BASE_URL = 'http://localhost:8002';

const Dashboard: React.FC = () => {
    // State
    const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [filteredGraphData, setFilteredGraphData] = useState<GraphData | null>(null);
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [currentNoteId, setCurrentNoteId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [allNotes, setAllNotes] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeJobs, setActiveJobs] = useState<string[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ noteId: number, title: string, count: number } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Initial Data Loading
    const loadGraphData = useCallback(async (noteId: number) => {
        try {
            setError(null);
            const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}/graph`);
            if (!response.ok) throw new Error(`Failed to load graph: ${response.statusText}`);
            const apiData = await response.json();
            const transformed = transformAPIToGraphData(apiData);
            setGraphData(transformed);
            setCurrentNoteId(noteId);
            setFilteredGraphData(null); // Reset filter on new graph load
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Failed to load graph data');
        }
    }, []);

    // Load available notes (sessions)
    const loadNotes = useCallback(async (autoLoadId?: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/notes`);
            if (!response.ok) throw new Error('Failed to fetch notes');
            const data = await response.json();
            const notes = data.notes || data; // Handle both direct array and {notes: []}
            setAllNotes(notes);

            if (autoLoadId) {
                await loadGraphData(autoLoadId);
            } else if (!currentNoteId && notes.length > 0) {
                // Auto-load first note with content
                const firstWithEntities = notes.find((n: any) => n.entity_count > 0);
                if (firstWithEntities) await loadGraphData(firstWithEntities.id);
            }
        } catch (err) {
            console.error("Failed to load notes:", err);
            setError("Could not load previous sessions.");
        }
    }, [currentNoteId, loadGraphData]);

    useEffect(() => {
        loadNotes();
    }, [loadNotes]);

    // Handlers
    const handleFileUpload = async (file: File) => {
        setIsProcessing(true);
        setError(null);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            const data = await response.json();
            await loadNotes(); // Refresh list
            if (data.job_id) {
                setActiveJobs(prev => [...prev, data.job_id]);
            } else if (data.note_id) {
                await loadGraphData(data.note_id);
            }
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleYoutubeProcessing = async (url: string) => {
        setIsProcessing(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/youtube/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'YouTube processing failed');
            }

            const data = await response.json();
            await loadNotes(); // Refresh list

            if (data.job_id) {
                setActiveJobs(prev => [...prev, data.job_id]);
            }
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'YouTube processing failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSearch = (query: string) => {
        if (!query.trim()) {
            setFilteredGraphData(null);
            return;
        }

        const lowerQuery = query.toLowerCase();
        const filteredNodes = graphData.nodes.filter((node: any) =>
            node.name.toLowerCase().includes(lowerQuery) ||
            node.type?.toLowerCase().includes(lowerQuery)
        );

        const nodeIds = new Set(filteredNodes.map((n: any) => n.id));
        const filteredLinks = graphData.links.filter((link: any) =>
            nodeIds.has(link.source as string) && nodeIds.has(link.target as string)
        );

        setFilteredGraphData({ nodes: filteredNodes, links: filteredLinks });
    };

    const handleNodeClick = useCallback((node: GraphNode) => {
        setSelectedNode(node);
    }, []);

    const handleDeleteClick = useCallback((noteId: number, title: string, count: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDeleteConfirm({ noteId, title, count });
    }, []);

    const handleConfirmDelete = async () => {
        if (!showDeleteConfirm) return;
        setIsDeleting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/notes/${showDeleteConfirm.noteId}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Delete failed');

            if (currentNoteId === showDeleteConfirm.noteId) {
                setGraphData({ nodes: [], links: [] });
                setCurrentNoteId(null);
                setSelectedNode(null);
            }
            await loadNotes();
            setShowDeleteConfirm(null);
        } catch (err) {
            console.error(err);
            setError("Failed to delete note.");
        } finally {
            setIsDeleting(false);
        }
    };

    // Render
    return (
        <SpatialLayout>
            {error && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] p-6 bg-white/80 border border-red-200 rounded-hyper text-red-600 text-xs font-bold uppercase tracking-widest flex items-center gap-4 animate-fade-in backdrop-blur-md shadow-spatial-lift">
                    <span className="flex-none bg-red-500 text-white px-2 py-0.5 rounded-md font-black">ERROR</span>
                    {error}
                </div>
            )}

            <SpatialHeader onSearch={handleSearch} />

            <main className="relative h-screen w-full overflow-hidden">

                {/* Level 0-1: Persistent Knowledge Graph (Background Layer) */}
                <div className="h-full w-full z-0 selection:bg-black/5">
                    <AnimatePresence mode="wait">
                        {graphData.nodes.length > 0 ? (
                            <motion.div
                                key={currentNoteId || 'empty'}
                                initial={{ opacity: 0, scale: 1.05 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                                className="w-full h-full"
                            >
                                <GraphCanvas
                                    data={filteredGraphData || graphData}
                                    onNodeClick={handleNodeClick}
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="waiting"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center h-full w-full pointer-events-none"
                            >
                                {/* Spatial White-Glass Empty State */}
                                <div className="relative">
                                    <motion.div
                                        animate={{
                                            scale: [1, 1.05, 1],
                                            opacity: [0.3, 0.5, 0.3]
                                        }}
                                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                        className="w-80 h-80 bg-white/20 backdrop-blur-[40px] rounded-full shadow-spatial-lift border border-white/40 flex items-center justify-center"
                                    >
                                        <div className="w-40 h-40 bg-white/40 rounded-full blur-2xl animate-pulse" />
                                    </motion.div>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-text-primary/30">
                                            Awaiting Graph
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Level 1: Sidebar (Floating Action Dock) */}
                <SpatialSidebar
                    onUpload={handleFileUpload}
                    onYoutubeUpload={handleYoutubeProcessing}
                    isProcessing={isProcessing}
                />

                {/* Level 1.5: Session Dock (Floating Card Row) */}
                <SpatialSessionDock
                    sessions={allNotes}
                    currentSessionId={currentNoteId}
                    onSessionSelect={loadGraphData}
                    onDelete={handleDeleteClick}
                />

                {/* Level 2: Spatial Inspector Overlay (Right side floating) */}
                <div className="absolute inset-x-4 bottom-4 top-[40vh] md:inset-auto md:top-28 md:right-12 md:bottom-12 z-40 pointer-events-none">
                    <AnimatePresence>
                        {selectedNode && (
                            <motion.div
                                initial={{ x: 400, opacity: 0, scale: 0.95 }}
                                animate={{ x: 0, opacity: 1, scale: 1 }}
                                exit={{ x: 400, opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                className="pointer-events-auto h-full"
                            >
                                <SpatialInspector
                                    selectedNode={selectedNode}
                                    onClose={() => setSelectedNode(null)}
                                    onExpand={() => console.log('Expand context for:', selectedNode)}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

            </main>

            {/* Floating Elements (Jobs Progress) */}
            <div className="fixed bottom-12 right-12 z-50 flex flex-col gap-4">
                {activeJobs.map(jobId => (
                    <JobProgressTracker
                        key={jobId}
                        jobId={jobId}
                        apiBaseUrl={API_BASE_URL}
                        onComplete={(noteId: number) => {
                            loadNotes(noteId);
                            setActiveJobs(prev => prev.filter(id => id !== jobId));
                        }}
                        onClose={() => setActiveJobs(prev => prev.filter(id => id !== jobId))}
                    />
                ))}
            </div>

            <DeleteConfirmModal
                isOpen={!!showDeleteConfirm}
                noteTitle={showDeleteConfirm?.title || ''}
                entityCount={showDeleteConfirm?.count || 0}
                isDeleting={isDeleting}
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowDeleteConfirm(null)}
            />
        </SpatialLayout>
    );
};

export default Dashboard;
