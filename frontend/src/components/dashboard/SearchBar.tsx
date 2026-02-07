/**
 * SearchBar Component
 * Semantic search for concepts in the knowledge graph
 * and YouTube link processing
 */
import { useState } from 'react';
import { isYouTubeUrl } from '../../utils/youtube-validator';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onYouTubeProcess: (url: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  onSearch,
  onYouTubeProcess,
  placeholder = 'Find concepts or technologies...',
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'search' | 'youtube'>('search');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!query.trim()) return;

    if (mode === 'youtube') {
      if (isYouTubeUrl(query)) {
        onYouTubeProcess(query.trim());
        setQuery('');
      } else {
        setError('Invalid Video URL');
      }
    } else {
      onSearch(query.trim());
    }
  };

  const handleClear = () => {
    setQuery('');
    if (mode === 'search') {
      onSearch('');
    }
    setError(null);
  };

  return (
    <div className="w-full glass rounded-3xl p-6 industrial-border">
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setMode('search'); setError(null); }}
          className={`
            text-[9px] font-bold uppercase tracking-[0.2em] px-4 py-2 rounded transition-all font-mono
            ${mode === 'search'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
              : 'text-slate-500 hover:text-slate-300'}
          `}
        >
          Search Graph
        </button>
        <button
          onClick={() => { setMode('youtube'); setError(null); }}
          className={`
            text-[9px] font-bold uppercase tracking-[0.2em] px-4 py-2 rounded transition-all flex items-center gap-2 font-mono
            ${mode === 'youtube'
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'text-slate-500 hover:text-slate-300'}
          `}
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          Stream Ingest
        </button>
      </div>

      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            {mode === 'search' ? (
              <svg className="w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 15l5.19-3L10 9v6z" />
              </svg>
            )}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`
              block w-full pl-12 pr-12 py-4
              bg-black/20 border rounded font-mono text-[11px]
              text-white placeholder-slate-500
              focus:outline-none transition-all duration-300
              ${mode === 'youtube'
                ? 'border-red-500/20 focus:border-red-500/40'
                : 'border-white/5 focus:border-blue-500/30 shadow-inner'}
            `}
            placeholder={mode === 'search' ? placeholder : 'Paste external stream URL...'}
          />

          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-4 flex items-center text-slate-500 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {error && (
          <p className="mt-3 text-[9px] text-red-500 font-bold font-mono tracking-widest ml-1">{`Error :: ${error}`}</p>
        )}

      </form>
    </div>
  );
}
