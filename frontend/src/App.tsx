/**
 * Main App Component
 * Atomic Notes Visualizer - AI-powered knowledge graph
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import GraphCanvas from './components/graph/GraphCanvas';
import UploadPanel from './components/dashboard/UploadPanel';
import SearchBar from './components/dashboard/SearchBar';
import FilterControls from './components/dashboard/FilterControls';
import JobProgressTracker from './components/dashboard/JobProgressTracker';
import type { GraphData, GraphNode } from './types/graph';
import { transformAPIToGraphData } from './utils/graph-transformer';
import DeleteConfirmModal from './components/dashboard/DeleteConfirmModal';
import ProcessingStatusWidget from './components/dashboard/ProcessingStatusWidget';
import type { ProcessingStatus } from './components/dashboard/ProcessingStatusWidget';
import './index.css';

const API_BASE_URL = 'http://localhost:8002';

function App() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [filteredGraphData, setFilteredGraphData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentNoteId, setCurrentNoteId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allNotes, setAllNotes] = useState<any[]>([]);

  const [processingNoteId, setProcessingNoteId] = useState<number | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ noteId: number, title: string, entityCount: number } | null>(null);

  // Background Jobs
  const [activeJobs, setActiveJobs] = useState<string[]>([]);

  // Annotations state
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [newAnnotation, setNewAnnotation] = useState('');
  const [isAddingAnnotation, setIsAddingAnnotation] = useState(false);

  const loadGraphData = useCallback(async (noteId: number) => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}/graph`);

      if (!response.ok) {
        throw new Error(`Failed to load graph: ${response.statusText}`);
      }

      const apiData = await response.json();
      const transformed = transformAPIToGraphData(apiData);
      setGraphData(transformed);
      setCurrentNoteId(noteId);
    } catch (err) {
      console.error('Error loading graph:', err);
      setError(err instanceof Error ? err.message : 'Failed to load graph data');
    }
  }, []);

  const loadFirstNote = useCallback(async (autoLoadGraph = true) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notes/`);
      const data = await response.json();

      setAllNotes(data.notes || []);

      if (autoLoadGraph && data.notes && data.notes.length > 0) {
        const firstNoteWithEntities = data.notes.find((n: any) => n.entity_count > 0);
        if (firstNoteWithEntities) {
          loadGraphData(firstNoteWithEntities.id);
        }
      }
    } catch (err) {
      console.error('Error loading notes:', err);
      setError('Failed to connect to backend. Make sure the server is running on port 8002.');
    }
  }, [loadGraphData]);

  // Initial load
  useEffect(() => {
    loadFirstNote();
  }, [loadFirstNote]);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch(`${API_BASE_URL}/api/notes/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) throw new Error('Upload failed');

      const uploadData = await uploadResponse.json();
      console.log(`File uploaded: Note ID ${uploadData.note_id}`);

      await loadFirstNote(false);
      setError(`✓ Note "${file.name}" uploaded successfully!`);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsProcessing(false);
    }
  }, [loadFirstNote]);

  const handleProcessNote = useCallback(async (noteId: number, _noteTitle: string) => {
    setProcessingNoteId(noteId);
    setError(null);
    setProcessingStatus({ stage: 'extracting', message: 'Initializing...', progress: 0 });

    try {
      const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}/process`, { method: 'POST' });
      if (!response.ok) throw new Error('Processing failed');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
          if (event.startsWith('data: ')) {
            const jsonStr = event.substring(6);
            try {
              const data = JSON.parse(jsonStr);
              setProcessingStatus({ stage: data.stage, message: data.message, progress: data.progress });

              if (data.stage === 'complete') {
                await loadFirstNote(false);
                await loadGraphData(noteId);
                setTimeout(() => {
                  setProcessingNoteId(null);
                  setProcessingStatus(null);
                }, 3000);
              }
              if (data.stage === 'error') throw new Error(data.message);
            } catch (parseErr) {
              console.warn('Failed to parse SSE event:', parseErr);
            }
          }
        }
      }
    } catch (err) {
      console.error('Processing error:', err);
      setError(err instanceof Error ? err.message : 'Processing failed');
      setProcessingNoteId(null);
      setProcessingStatus(null);
    }
  }, [loadFirstNote, loadGraphData]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!showDeleteConfirm) return;
    const noteId = showDeleteConfirm.noteId;
    setDeletingNoteId(noteId);
    setShowDeleteConfirm(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');

      await loadFirstNote(false);
      if (currentNoteId === noteId) {
        setGraphData({ nodes: [], links: [] });
        setCurrentNoteId(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete note');
    } finally {
      setDeletingNoteId(null);
    }
  }, [showDeleteConfirm, currentNoteId, loadFirstNote]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setFilteredGraphData(null);
      setSelectedNode(null);
      return;
    }

    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}&min_similarity=0.0&limit=20`);
      if (!response.ok) throw new Error('Search failed');

      const results = await response.json();
      if (results.results && results.results.length > 0) {
        const matchingIds = new Set(results.results.map((r: any) => r.id));
        if (graphData) {
          const nodes = graphData.nodes.filter(node => matchingIds.has(node.id));
          const nodeIds = new Set(nodes.map(n => n.id));
          const links = graphData.links.filter(link => {
            const s = typeof link.source === 'object' ? link.source.id : link.source;
            const t = typeof link.target === 'object' ? link.target.id : link.target;
            return nodeIds.has(s) && nodeIds.has(t);
          });
          setFilteredGraphData({ nodes, links });
          if (nodes.length > 0) setSelectedNode(nodes[0]);
        }
      } else {
        setFilteredGraphData(null);
        setSelectedNode(null);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Search failed');
    }
  }, [graphData]);

  const handleYouTubeProcess = useCallback(async (url: string) => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/youtube/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (!response.ok) throw new Error('Failed to start YouTube processing');

      const data = await response.json();
      setActiveJobs(prev => [data.job_id, ...prev]);
    } catch (err) {
      console.error('YouTube process error:', err);
      setError('Failed to process YouTube video');
    }
  }, []);

  const handleJobComplete = useCallback((noteId: number) => {
    loadFirstNote(false);
    loadGraphData(noteId);
  }, [loadFirstNote, loadGraphData]);

  const handleJobClose = useCallback((jobId: string) => {
    setActiveJobs(prev => prev.filter(id => id !== jobId));
  }, []);

  const handleFilterChange = useCallback((filters: { entityTypes: string[]; minStrength: number }) => {
    if (!graphData || graphData.nodes.length === 0) return;
    const allTypes = Array.from(new Set(graphData.nodes.map(n => n.type)));
    if (filters.entityTypes.length === allTypes.length && filters.minStrength === 0) {
      setFilteredGraphData(null);
      return;
    }
    const nodes = graphData.nodes.filter(node => filters.entityTypes.includes(node.type));
    const nodeIds = new Set(nodes.map(n => n.id));
    const links = graphData.links.filter(link => {
      const s = typeof link.source === 'object' ? link.source.id : link.source;
      const t = typeof link.target === 'object' ? link.target.id : link.target;
      return nodeIds.has(s) && nodeIds.has(t) && link.strength >= filters.minStrength;
    });
    setFilteredGraphData({ nodes, links });
    if (selectedNode && !nodeIds.has(selectedNode.id)) setSelectedNode(null);
  }, [graphData, selectedNode]);

  const handleNodeClick = useCallback(async (node: GraphNode) => {
    setSelectedNode(node);
    try {
      const response = await fetch(`${API_BASE_URL}/api/annotations/entity/${node.id}`);
      if (response.ok) setAnnotations(await response.json());
    } catch (err) {
      console.error('Failed to load annotations:', err);
    }
  }, []);

  const handleAddAnnotation = useCallback(async () => {
    if (!selectedNode || !newAnnotation.trim()) return;
    try {
      setIsAddingAnnotation(true);
      const response = await fetch(`${API_BASE_URL}/api/annotations/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_id: selectedNode.id, user_note: newAnnotation.trim() })
      });
      if (response.ok) {
        const annotation = await response.json();
        setAnnotations(prev => [annotation, ...prev]);
        setNewAnnotation('');
      }
    } catch (err) {
      console.error('Failed to add annotation:', err);
    } finally {
      setIsAddingAnnotation(false);
    }
  }, [selectedNode, newAnnotation]);

  const handleDeleteAnnotation = useCallback(async (annotationId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/annotations/${annotationId}`, { method: 'DELETE' });
      if (response.ok) setAnnotations(prev => prev.filter(a => a.id !== annotationId));
    } catch (err) {
      console.error('Failed to delete annotation:', err);
    }
  }, []);

  const availableTypes = useMemo(() =>
    Array.from(new Set(graphData.nodes.map(n => n.type))),
    [graphData.nodes]
  );

  return (
    <div className="min-h-screen text-slate-200">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

      <header className="glass border-b border-white/5 sticky top-0 z-50 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-purple-500/5 pointer-events-none" />
        <div className="max-w-[1600px] mx-auto px-6 py-6 relative">
          <div className="flex items-center justify-between">
            <div className="group cursor-default">
              <div className="flex items-center gap-4 mb-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40 group-hover:rotate-[10deg] transition-all duration-500">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
                    Atomic
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Notes</span>
                  </h1>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] leading-none mt-1">AI Knowledge Engine</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <nav className="hidden md:flex items-center gap-6">
                <a href="#" className="text-xs font-bold uppercase tracking-widest text-indigo-400 border-b-2 border-indigo-500 pb-1">Visualizer</a>
                <a href="#" className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors">Graph View</a>
                <a href="#" className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors">Compare</a>
              </nav>

              <div className="h-8 w-px bg-white/10 hidden md:block" />

              <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/80">System Live</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-10">
        {error && (
          <div className="mb-8 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 text-sm font-medium flex items-center gap-3 animate-slideIn">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}

        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Left Panel: Management */}
          <aside className="col-span-12 lg:col-span-3 space-y-6">
            {activeJobs.map(jobId => (
              <JobProgressTracker
                key={jobId}
                jobId={jobId}
                apiBaseUrl={API_BASE_URL}
                onComplete={handleJobComplete}
                onClose={() => handleJobClose(jobId)}
              />
            ))}

            <div className="glass-card rounded-3xl p-1 overflow-hidden">
              <UploadPanel onFileUpload={handleFileUpload} isProcessing={isProcessing} />
            </div>

            <div className="glass-card rounded-3xl p-6">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-6 flex items-center justify-between">
                <span>Knowledge Base</span>
                <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded text-[9px]">{allNotes.length} Notes</span>
              </h2>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {allNotes.map((note) => (
                  <div key={note.id}
                    className={`group relative p-3 rounded-2xl border transition-all duration-300 cursor-pointer ${note.id === currentNoteId ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/5 border-transparent hover:border-white/10 hover:bg-white/10'}`}
                    onClick={() => note.entity_count > 0 && loadGraphData(note.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${note.id === currentNoteId ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${note.id === currentNoteId ? 'text-white' : 'text-slate-300'}`}>{note.title}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{note.entity_count} Entities</p>
                      </div>
                    </div>

                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      {note.entity_count === 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleProcessNote(note.id, note.title); }}
                          disabled={processingNoteId === note.id || deletingNoteId === note.id}
                          className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 rounded-lg transition-all disabled:opacity-50"
                          title="Process with AI"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm({ noteId: note.id, title: note.title, entityCount: note.entity_count }); }}
                        disabled={deletingNoteId === note.id}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all disabled:opacity-50"
                        title="Delete note"
                      >
                        {deletingNoteId === note.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <FilterControls onFilterChange={handleFilterChange} availableTypes={availableTypes} />
          </aside>

          {/* Main Visualizer Area */}
          <div className="col-span-12 lg:col-span-9 space-y-6">
            <div className="grid grid-cols-12 gap-6">
              {/* Search Bento */}
              <div className="col-span-12 glass-card rounded-3xl p-2">
                <SearchBar onSearch={handleSearch} onYouTubeProcess={handleYouTubeProcess} />
              </div>

              {/* Main Graph Bento */}
              <div className="col-span-12 lg:col-span-8 glass-card rounded-[2.5rem] p-2 aspect-[4/3] lg:aspect-auto lg:h-[700px] relative group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
                {graphData.nodes.length > 0 ? (
                  <GraphCanvas data={filteredGraphData || graphData} width={1200} height={700} onNodeClick={handleNodeClick} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 animate-pulse">
                      <svg className="w-10 h-10 text-indigo-400/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <h3 className="text-xl font-black text-white mb-2">Initialize Canvas</h3>
                    <p className="text-sm text-slate-500 max-w-xs text-center font-medium">Connect notes to visualize the hidden patterns in your knowledge base.</p>
                  </div>
                )}

                {/* Graph HUD */}
                <div className="absolute bottom-6 left-6 flex gap-2">
                  <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Nodes</span>
                      <span className="text-sm font-black text-white">{(filteredGraphData || graphData).nodes.length}</span>
                    </div>
                    <div className="w-px h-6 bg-white/10" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Edges</span>
                      <span className="text-sm font-black text-white">{(filteredGraphData || graphData).links.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected Node / Details Bento */}
              <div className="col-span-12 lg:col-span-4 space-y-6">
                {selectedNode ? (
                  <div className="glass-card rounded-[2.5rem] p-8 h-full flex flex-col border-l-4 border-indigo-500 animate-slideIn">
                    <div className="flex items-start justify-between mb-8">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <button onClick={() => setSelectedNode(null)} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-500 hover:text-white">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>

                    <h3 className="text-2xl font-black text-white mb-2 leading-tight">{selectedNode.name}</h3>
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-8 w-fit">
                      {selectedNode.type}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-8">
                      <p className="text-slate-400 text-sm leading-relaxed font-medium">
                        {selectedNode.description || 'No description available for this concept.'}
                      </p>
                    </div>

                    <div className="pt-8 border-t border-white/5 space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Personal Context ({annotations.length})
                      </h4>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newAnnotation}
                          onChange={(e) => setNewAnnotation(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddAnnotation()}
                          placeholder="Add thought..."
                          className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                        />
                        <button
                          onClick={handleAddAnnotation}
                          disabled={!newAnnotation.trim() || isAddingAnnotation}
                          className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white p-2 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {annotations.map((ann) => (
                          <div key={ann.id} className="group bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-all">
                            <div className="flex justify-between items-start gap-4">
                              <p className="text-xs text-slate-300 leading-relaxed font-medium">{ann.user_note}</p>
                              <button onClick={() => handleDeleteAnnotation(ann.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="glass-card rounded-[2.5rem] p-8 h-full flex flex-col items-center justify-center text-center opacity-40">
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center mb-6">
                      <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" /></svg>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Select Node</p>
                    <p className="text-[10px] text-slate-600 mt-2 max-w-[140px] font-medium leading-relaxed">Click any concept on the map to see its full context and add notes.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <DeleteConfirmModal isOpen={showDeleteConfirm !== null} noteTitle={showDeleteConfirm?.title || ''} entityCount={showDeleteConfirm?.entityCount || 0} onConfirm={handleDeleteConfirm} onCancel={() => setShowDeleteConfirm(null)} />
      {processingNoteId !== null && processingStatus && <ProcessingStatusWidget noteTitle={allNotes.find(n => n.id === processingNoteId)?.title || ''} status={processingStatus} />}
    </div>
  );
}

export default App;
