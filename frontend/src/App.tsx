/**
 * Main App Component
 * Atomic Notes Visualizer - AI-powered knowledge graph
 */
import { useState, useEffect } from 'react';
import GraphCanvas from './components/graph/GraphCanvas';
import UploadPanel from './components/dashboard/UploadPanel';
import SearchBar from './components/dashboard/SearchBar';
import FilterControls from './components/dashboard/FilterControls';
import type { GraphData, GraphNode } from './types/graph';
import { transformAPIToGraphData } from './utils/graph-transformer';
import DeleteConfirmModal from './components/dashboard/DeleteConfirmModal';
import ProcessingStatusWidget from './components/dashboard/ProcessingStatusWidget';
import type { ProcessingStatus } from './components/dashboard/ProcessingStatusWidget';
import './index.css';

const API_BASE_URL = 'http://localhost:8002';

function App() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentNoteId, setCurrentNoteId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allNotes, setAllNotes] = useState<any[]>([]);

  const [processingNoteId, setProcessingNoteId] = useState<number | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ noteId: number, title: string, entityCount: number } | null>(null);

  // Load the first available note on mount
  useEffect(() => {
    loadFirstNote();
  }, []);

  const loadFirstNote = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notes/`);
      const data = await response.json();

      // Store all notes
      setAllNotes(data.notes || []);

      if (data.notes && data.notes.length > 0) {
        const firstNoteWithEntities = data.notes.find((n: any) => n.entity_count > 0);
        if (firstNoteWithEntities) {
          loadGraphData(firstNoteWithEntities.id);
        }
      }
    } catch (err) {
      console.error('Error loading notes:', err);
      setError('Failed to connect to backend. Make sure the server is running on port 8002.');
    }
  };

  const loadGraphData = async (noteId: number) => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}/graph`);

      if (!response.ok) {
        throw new Error(`Failed to load graph: ${response.statusText}`);
      }

      const apiData = await response.json();
      const graphData = transformAPIToGraphData(apiData);
      setGraphData(graphData);
      setCurrentNoteId(noteId);
    } catch (err) {
      console.error('Error loading graph:', err);
      setError(err instanceof Error ? err.message : 'Failed to load graph data');
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Upload file
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch(`${API_BASE_URL}/api/notes/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadData = await uploadResponse.json();
      const noteId = uploadData.note_id;

      console.log(`File uploaded successfully: Note ID ${noteId}`);

      // Show informative message about next steps
      setError(
        `✓ Note "${file.name}" uploaded successfully (ID: ${noteId})!\n\n` +
        `To see it in the graph:\n` +
        `1. Set up your OpenAI API key in backend/.env\n` +
        `2. Call: POST ${API_BASE_URL}/api/notes/${noteId}/process\n` +
        `3. The AI will extract entities and relationships for visualization`
      );

      // Refresh to show any processed notes
      await loadFirstNote();

      // If you have API key configured, uncomment this:
      // await processNote(noteId);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessNote = async (noteId: number, _noteTitle: string) => {
    setProcessingNoteId(noteId);
    setError(null);
    setProcessingStatus({
      stage: 'extracting',
      message: 'Initializing processing...',
      progress: 0
    });

    try {
      // Use fetch with streaming for Server-Sent Events (SSE)
      const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}/process`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Processing failed');
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events (split by \n\n)
        const events = buffer.split('\n\n');
        buffer = events.pop() || ''; // Keep incomplete event in buffer

        for (const event of events) {
          if (event.startsWith('data: ')) {
            const jsonStr = event.substring(6); // Remove 'data: ' prefix
            try {
              const data = JSON.parse(jsonStr);

              setProcessingStatus({
                stage: data.stage,
                message: data.message,
                progress: data.progress
              });

              // If complete, refresh and auto-close
              if (data.stage === 'complete') {
                // Refresh notes list
                await loadFirstNote();

                // Auto-switch to view the processed note's graph
                await loadGraphData(noteId);

                // Auto-hide after 3 seconds
                setTimeout(() => {
                  setProcessingNoteId(null);
                  setProcessingStatus(null);
                }, 3000);
              }

              // If error, show and close
              if (data.stage === 'error') {
                throw new Error(data.message);
              }

            } catch (parseErr) {
              console.warn('Failed to parse SSE event:', jsonStr, parseErr);
            }
          }
        }
      }

    } catch (err) {
      console.error('Processing error:', err);
      setError(err instanceof Error ? err.message : 'Processing failed. Make sure your OpenAI API key is configured in backend/.env');
      setProcessingNoteId(null);
      setProcessingStatus(null);
    }
  };

  const handleDeleteClick = (noteId: number, title: string, entityCount: number) => {
    setShowDeleteConfirm({ noteId, title, entityCount });
  };

  const handleDeleteConfirm = async () => {
    if (!showDeleteConfirm) return;

    const noteId = showDeleteConfirm.noteId;
    setDeletingNoteId(noteId);
    setShowDeleteConfirm(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      // Refresh notes list
      await loadFirstNote();

      // If we deleted the currently viewed note, clear the graph
      if (currentNoteId === noteId) {
        setGraphData({ nodes: [], links: [] });
        setCurrentNoteId(null);
      }

    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete note');
    } finally {
      setDeletingNoteId(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(null);
  };

  // Uncomment this when OpenAI API key is configured
  /*
  const processNote = async (noteId: number) => {
    try {
      const processResponse = await fetch(`${API_BASE_URL}/api/notes/${noteId}/process`, {
        method: 'POST',
      });

      if (!processResponse.ok) {
        throw new Error('Processing failed');
      }

      await processResponse.json();
      
      // Load the graph data
      await loadGraphData(noteId);
      
    } catch (err) {
      console.error('Processing error:', err);
      setError(err instanceof Error ? err.message : 'Processing failed');
    }
  };
  */

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      // Reload current note if search is cleared
      if (currentNoteId) {
        loadGraphData(currentNoteId);
      }
      return;
    }

    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const results = await response.json();
      console.log('Search results:', results);

      // TODO: Transform search results to graph format
      // For now, just log them

    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
    }
  };

  const handleFilterChange = (filters: { entityTypes: string[]; minStrength: number }) => {
    console.log('Filters changed:', filters);
    // TODO: Apply filters to graph data
    // Filter nodes and links based on selected entity types and min strength
  };

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
    console.log('Node clicked:', node);
  };

  return (
    <div className="min-h-screen text-slate-200">
      {/* Aurora Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="glass border-b border-white/10 sticky top-0 z-50 animate-shimmer">
        {/* Animated Glow Background for Header */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-1/2 h-full bg-indigo-500/5 blur-[40px] animate-pulse" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
          <div className="flex items-center justify-between">
            <div className="group cursor-default">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:rotate-12 transition-transform duration-500">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-300 to-purple-400 group-hover:from-indigo-200 group-hover:via-purple-200 group-hover:to-pink-200 transition-all duration-700">
                  Atomic Notes
                </h1>
              </div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.2em] ml-11">
                AI Knowledge Engine <span className="text-indigo-500/50 mx-1">/</span> Visualizer
              </p>
            </div>

            <div className="flex items-center gap-6">
              {/* System Status Badge */}
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full border border-white/5 bg-white/5 glass">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Engine active
                </span>
              </div>

              {/* Action Link Mock */}
              <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block" />
              <button className="hidden sm:flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors group">
                <svg className="w-4 h-4 group-hover:rotate-45 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Explore
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Error Banner */}
        {error && (
          <div className="mb-8 glass border-blue-500/30 text-blue-300 px-6 py-4 rounded-xl whitespace-pre-line animate-slideIn">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Controls */}
          <aside className="lg:col-span-1 space-y-8">
            <UploadPanel
              onFileUpload={handleFileUpload}
              isProcessing={isProcessing}
            />

            {/* Notes List */}
            {allNotes.length > 0 && (
              <div className="glass rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Your Notes
                </h2>
                <div className="space-y-3">
                  {allNotes.map((note) => (
                    <div
                      key={note.id}
                      className={`group relative p-4 rounded-xl border transition-all duration-300 ${note.id === currentNoteId
                        ? 'border-indigo-500/50 bg-indigo-500/10'
                        : 'border-white/5 hover:border-white/20 hover:bg-white/5'
                        }`}
                    >
                      {/* Note Content - Click to view */}
                      <div
                        className="cursor-pointer"
                        onClick={() => note.entity_count > 0 && loadGraphData(note.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${note.id === currentNoteId ? 'text-indigo-300' : 'text-slate-200'
                              }`}>
                              {note.title}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${note.entity_count > 0
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}>
                                {note.entity_count > 0 ? `${note.entity_count} entities` : 'Unprocessed'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons - Show on hover */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        {/* Process Button - Only show if not processed */}
                        {note.entity_count === 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProcessNote(note.id, note.title);
                            }}
                            disabled={processingNoteId === note.id || deletingNoteId === note.id}
                            className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Process with AI"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </button>
                        )}

                        {/* Delete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(note.id, note.title, note.entity_count);
                          }}
                          disabled={deletingNoteId === note.id}
                          className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete note"
                        >
                          {deletingNoteId === note.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>

                      {/* Processing Indicator - Show inline if this note is being processed */}
                      {processingNoteId === note.id && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="flex items-center gap-2 text-xs text-indigo-700">
                            <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            <span>Processing...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <FilterControls onFilterChange={handleFilterChange} />
          </aside>

          {/* Main Graph Area */}
          <section className="lg:col-span-3 space-y-8">
            {/* Search Bar */}
            <div className="glass rounded-2xl p-4">
              <SearchBar onSearch={handleSearch} />
            </div>

            {/* Graph Visualization */}
            <div className="glass rounded-2xl p-4 overflow-hidden">
              {graphData.nodes.length > 0 ? (
                <div className="rounded-xl overflow-hidden border border-white/5 bg-slate-950/20">
                  <GraphCanvas
                    data={graphData}
                    width={900}
                    height={620}
                    onNodeClick={handleNodeClick}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-[580px] text-slate-500 border-2 border-dashed border-white/5 rounded-xl">
                  <div className="text-center group">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <svg className="w-8 h-8 text-indigo-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <p className="text-xl font-bold text-slate-300 mb-2">No graph data available</p>
                    <p className="text-sm max-w-xs mx-auto">Upload a note or use the AI processor to see your knowledge graph come to life.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Selected Node Details */}
            {selectedNode && (
              <div className="glass rounded-2xl p-8 border-l-4 border-indigo-500 animate-slideIn">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {selectedNode.name}
                    </h3>
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest text-indigo-300 mb-6">
                      {selectedNode.type}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="text-slate-500 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {selectedNode.description && (
                  <p className="text-slate-300 text-lg leading-relaxed">{selectedNode.description}</p>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm !== null}
        noteTitle={showDeleteConfirm?.title || ''}
        entityCount={showDeleteConfirm?.entityCount || 0}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      {/* Processing Status Widget (Sticky) */}
      {processingNoteId !== null && processingStatus && (
        <ProcessingStatusWidget
          noteTitle={allNotes.find(n => n.id === processingNoteId)?.title || ''}
          status={processingStatus}
        />
      )}
    </div>
  );
}

export default App;
