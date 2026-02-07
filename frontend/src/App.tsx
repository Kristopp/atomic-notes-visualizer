/**
 * Main App Component
 * Atomic Notes Visualizer - AI-powered knowledge graph
 */
import { useState, useEffect, useCallback } from 'react';
import GraphCanvas from './components/graph/GraphCanvas';
import UploadPanel from './components/dashboard/UploadPanel';
import SearchBar from './components/dashboard/SearchBar';
import JobProgressTracker from './components/dashboard/JobProgressTracker';
import type { GraphData, GraphNode } from './types/graph';
import { transformAPIToGraphData } from './utils/graph-transformer';
import DeleteConfirmModal from './components/dashboard/DeleteConfirmModal';
import ProcessingStatusWidget from './components/dashboard/ProcessingStatusWidget';
import type { ProcessingStatus } from './components/dashboard/ProcessingStatusWidget';
import './index.css';

const API_BASE_URL = 'http://localhost:8002';

function formatTimestamp(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function titlify(str: string): string {
  if (!str) return '';
  return str
    .replace(/[_.-]+/g, ' ')
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    .trim();
}

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

  // Filter logic removed per user request
  // const handleFilterChange = useCallback((filters: { entityTypes: string[]; minStrength: number }) => { ... }, []);

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

  // const availableTypes = useMemo(() => ... );

  return (
    <div className="min-h-screen text-slate-400 font-sans selection:bg-blue-500/30">
      {/* Precision Layering */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] blend-overlay" />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[160px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/5 blur-[120px]" />
      </div>

      <div className="scanline" />

      <header className="glass border-b border-white/5 sticky top-0 z-50 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/[0.02] via-transparent to-indigo-500/[0.02] pointer-events-none" />
        <div className="max-w-[1800px] mx-auto px-8 py-4 relative">
          <div className="flex items-center justify-between">
            <div className="group cursor-default">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-10 h-10 rounded bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-500/20 group-hover:bg-blue-500 transition-all duration-500">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,1)]" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tighter text-white font-mono flex items-center gap-3">
                    Atomic Visualizer
                    <span className="text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-emerald-500 font-mono tracking-normal uppercase">System :: Online</span>
                  </h1>
                  <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.4em] leading-none mt-1.5 font-mono">Neural Knowledge Mapping</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-10">
              <nav className="hidden xl:flex items-center gap-8">
                {['Topology'].map((item) => (
                  <a key={item} href="#" className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all text-blue-500`}>
                    {item}
                  </a>
                ))}
              </nav>

              <div className="h-6 w-px bg-white/5 hidden md:block" />

              <div className="flex items-center gap-4 px-4 py-2 rounded border border-white/5 bg-white/[0.02]">
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => <div key={i} className={`w-1 h-3 rounded-full ${i <= 2 ? 'bg-blue-500' : 'bg-white/5'}`} />)}
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 font-mono">System :: Active</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-8 py-8">
        {error && (
          <div className="mb-8 p-4 bg-blue-500/5 border border-blue-500/10 text-blue-400 text-[10px] font-mono uppercase tracking-widest flex items-center gap-4 animate-slideIn">
            <span className="flex-none bg-blue-500/20 px-2 py-0.5 rounded text-blue-300">ALERT</span>
            {error}
          </div>
        )}

        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Left Panel: Management */}
          <aside className="col-span-12 lg:col-span-3 space-y-8">
            {activeJobs.map(jobId => (
              <JobProgressTracker
                key={jobId}
                jobId={jobId}
                apiBaseUrl={API_BASE_URL}
                onComplete={handleJobComplete}
                onClose={() => handleJobClose(jobId)}
              />
            ))}

            <UploadPanel onFileUpload={handleFileUpload} isProcessing={isProcessing} />

            <div className="glass rounded-2xl p-6 industrial-border">
              <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 mb-6 flex items-center justify-between font-mono">
                <span>Data Vault</span>
                <span className="text-blue-500">{allNotes.length} Units</span>
              </h2>
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar font-mono">
                {allNotes.map((note) => (
                  <div key={note.id}
                    className={`group relative p-3 rounded transition-all duration-300 cursor-pointer border ${note.id === currentNoteId ? 'bg-blue-500/10 border-blue-500/20' : 'bg-white/[0.02] border-transparent hover:border-white/5 hover:bg-white/[0.04]'}`}
                    onClick={() => note.entity_count > 0 && loadGraphData(note.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`text-[10px] font-bold ${note.id === currentNoteId ? 'text-blue-500' : 'text-slate-700'}`}>
                        {String(note.id).padStart(3, '0')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold truncate ${note.id === currentNoteId ? 'text-white' : 'text-slate-400'}`}>{titlify(note.title)}</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">{note.entity_count} Entities Detected</p>
                      </div>
                    </div>

                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      {note.entity_count === 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleProcessNote(note.id, note.title); }}
                          disabled={processingNoteId === note.id || deletingNoteId === note.id}
                          className="p-1 px-2 border border-emerald-500/30 text-emerald-500 text-[8px] font-bold uppercase hover:bg-emerald-500/10 transition-all disabled:opacity-50"
                        >
                          PROCESS
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm({ noteId: note.id, title: note.title, entityCount: note.entity_count }); }}
                        disabled={deletingNoteId === note.id}
                        className="p-1 px-2 border border-red-500/30 text-red-500 text-[8px] font-bold uppercase hover:bg-red-500/10 transition-all"
                      >
                        PURGE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* <FilterControls onFilterChange={handleFilterChange} availableTypes={availableTypes} /> - Removed per user request */}
          </aside>

          {/* Main Visualizer Area */}
          <div className="col-span-12 lg:col-span-9 space-y-8">
            <div className="grid grid-cols-12 gap-8">
              {/* Search Bento */}
              <div className="col-span-12">
                <SearchBar onSearch={handleSearch} onYouTubeProcess={handleYouTubeProcess} />
              </div>

              {/* Main Graph Bento */}
              <div className="col-span-12 xl:col-span-8 glass rounded-3xl h-[800px] relative group overflow-hidden border border-white/5 shadow-2xl">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 px-4 py-1.5 border-x border-b border-white/5 bg-white/[0.02] rounded-b-xl z-10">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em] font-mono">Workspace :: Neural Topology</span>
                </div>

                {graphData.nodes.length > 0 ? (
                  <GraphCanvas data={filteredGraphData || graphData} width={1200} height={800} onNodeClick={handleNodeClick} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-700">
                    <div className="w-16 h-16 border-2 border-dashed border-white/10 rounded-full flex items-center justify-center mb-8 animate-spin-slow">
                      <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em] font-mono">Awaiting Signal</h3>
                    <p className="text-[10px] text-slate-500 mt-2 max-w-[200px] text-center font-mono uppercase leading-relaxed">System initialized. Upload data to begin mapping connections.</p>
                  </div>
                )}

                {/* Graph HUD */}
                <div className="absolute bottom-8 left-8 flex gap-3">
                  <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded p-4 flex items-center gap-8 font-mono">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Nodes</span>
                      <span className="text-lg font-bold text-white leading-none">{filteredGraphData ? filteredGraphData.nodes.length : graphData.nodes.length}</span>
                    </div>
                    <div className="w-px h-8 bg-white/5" />
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Edges</span>
                      <span className="text-lg font-bold text-white leading-none">{filteredGraphData ? filteredGraphData.links.length : graphData.links.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected Node / Details Bento */}
              <div className="col-span-12 xl:col-span-4 space-y-8">
                {selectedNode ? (
                  <div className="glass rounded-3xl p-10 h-full flex flex-col border-white/5 industrial-border animate-slideIn">
                    <div className="flex items-start justify-between mb-10">
                      <div className="text-[10px] font-mono text-blue-500 font-bold tracking-widest">UNIT ID :: {String(selectedNode.id).padStart(4, '0')}</div>
                      <button onClick={() => setSelectedNode(null)} className="p-1 hover:text-white transition-colors text-slate-700">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-3 font-mono leading-tight tracking-tighter uppercase">{titlify(selectedNode.name)}</h3>
                    <div className="inline-flex items-center px-2 py-0.5 rounded border border-blue-500/20 bg-blue-500/5 text-[9px] font-bold uppercase tracking-widest text-blue-400 mb-10 font-mono w-fit">
                      {titlify(selectedNode.type)}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 mb-10">
                      <p className="text-slate-400 text-xs leading-relaxed font-medium font-mono uppercase">
                        {selectedNode.description || 'No descriptive data mapped for this unit.'}
                      </p>
                    </div>

                    {selectedNode.timestamp !== null && selectedNode.timestamp !== undefined && (() => {
                      const currentNote = allNotes.find(n => n.id === currentNoteId);
                      const isYouTube = currentNote?.note_metadata?.source === 'youtube';
                      const videoId = currentNote?.note_metadata?.video_id;

                      if (!isYouTube || !videoId) return null;

                      return (
                        <a
                          href={`https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(selectedNode.timestamp)}s`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 px-5 py-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-all mb-10 group"
                        >
                          <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.245 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Video Source</p>
                            <p className="text-xs text-white font-mono">Timestamp :: {formatTimestamp(selectedNode.timestamp)}</p>
                          </div>
                        </a>
                      );
                    })()}

                    <div className="pt-10 border-t border-white/5 space-y-8">
                      <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-3 font-mono">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        Annotations
                      </h4>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newAnnotation}
                          onChange={(e) => setNewAnnotation(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddAnnotation()}
                          placeholder="Assign a note to this unit..."
                          className="flex-1 bg-white/[0.02] border border-white/5 rounded px-4 py-2.5 text-[10px] text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500/30 transition-colors"
                        />
                        <button
                          onClick={handleAddAnnotation}
                          disabled={!newAnnotation.trim() || isAddingAnnotation}
                          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white p-2.5 rounded transition-all font-mono"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                        </button>
                      </div>

                      <div className="space-y-4">
                        {annotations.map((ann) => (
                          <div key={ann.id} className="group border-l-2 border-white/5 pl-4 hover:border-blue-500/30 transition-all">
                            <div className="flex justify-between items-start gap-4">
                              <p className="text-[10px] text-slate-400 leading-relaxed font-mono uppercase">{ann.user_note}</p>
                              <button onClick={() => handleDeleteAnnotation(ann.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 transition-all">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="glass rounded-3xl p-10 h-full flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full border border-white/5 flex items-center justify-center mb-6 opacity-20">
                      <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" /></svg>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 font-mono">Select a concept</p>
                    <p className="text-[9px] text-slate-600 mt-4 max-w-[160px] font-mono leading-relaxed uppercase tracking-tight">Click on a node to access mapped data and insights.</p>
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
