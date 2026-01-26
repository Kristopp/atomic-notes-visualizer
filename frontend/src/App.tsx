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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{noteId: number, title: string, entityCount: number} | null>(null);

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

  const handleProcessNote = async (noteId: number, noteTitle: string) => {
    setProcessingNoteId(noteId);
    setError(null);
    setProcessingStatus({
      stage: 'start',
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">
            Atomic Notes Visualizer
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            AI-powered knowledge graph from your notes
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded whitespace-pre-line">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Controls */}
          <aside className="lg:col-span-1 space-y-6">
            <UploadPanel
              onFileUpload={handleFileUpload}
              isProcessing={isProcessing}
            />
            
            {/* Notes List */}
            {allNotes.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Your Notes</h2>
                <div className="space-y-2">
                  {allNotes.map((note) => (
                    <div
                      key={note.id}
                      className={`group relative p-3 rounded-lg border transition-all ${
                        note.id === currentNoteId
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                      }`}
                    >
                      {/* Note Content - Click to view */}
                      <div 
                        className="cursor-pointer"
                        onClick={() => note.entity_count > 0 && loadGraphData(note.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {note.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-1 rounded ${
                                note.entity_count > 0
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {note.entity_count > 0 ? `${note.entity_count} entities` : 'Not processed'}
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
          <section className="lg:col-span-3 space-y-6">
            {/* Search Bar */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <SearchBar onSearch={handleSearch} />
            </div>

            {/* Graph Visualization */}
            <div className="bg-white rounded-lg shadow-md p-4">
              {graphData.nodes.length > 0 ? (
                <GraphCanvas
                  data={graphData}
                  width={900}
                  height={600}
                  onNodeClick={handleNodeClick}
                />
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-500">
                  <div className="text-center">
                    <p className="text-lg mb-2">No graph data available</p>
                    <p className="text-sm">Upload a note or run the seed_mock_data.py script</p>
                  </div>
                </div>
              )}
            </div>

            {/* Selected Node Details */}
            {selectedNode && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {selectedNode.name}
                </h3>
                <p className="text-sm text-gray-600 mb-4 capitalize">
                  Type: {selectedNode.type}
                </p>
                {selectedNode.description && (
                  <p className="text-gray-700">{selectedNode.description}</p>
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
