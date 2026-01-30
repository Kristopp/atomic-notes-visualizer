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
  placeholder = 'Search for concepts, technologies, ideas...',
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
        setError('Please enter a valid YouTube URL');
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
    <div className="w-full">
      {/* Mode Toggle */}
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => { setMode('search'); setError(null); }}
          className={`
            text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-all
            ${mode === 'search' 
              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' 
              : 'text-slate-500 hover:text-slate-300'}
          `}
        >
          Search Graph
        </button>
        <button
          onClick={() => { setMode('youtube'); setError(null); }}
          className={`
            text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-all flex items-center gap-2
            ${mode === 'youtube' 
              ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
              : 'text-slate-500 hover:text-slate-300'}
          `}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          YouTube to Atomics
        </button>
      </div>

      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            {mode === 'search' ? (
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 15l5.19-3L10 9v6z" />
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 18V6h16v12H4z" />
              </svg>
            )}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`
              block w-full pl-10 pr-12 py-3.5
              bg-white/5 border rounded-xl
              text-white placeholder-slate-500
              focus:outline-none focus:ring-2 transition-all duration-300
              ${mode === 'youtube' 
                ? 'border-red-500/20 focus:ring-red-500/50 focus:border-red-500/50' 
                : 'border-white/10 focus:ring-indigo-500/50 focus:border-indigo-500/50'}
            `}
            placeholder={mode === 'search' ? placeholder : 'Paste YouTube URL (e.g., https://youtube.com/watch?v=...)'}
          />

          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {error && (
          <p className="mt-2 text-xs text-red-400 font-medium ml-1">{error}</p>
        )}

        {/* Hints */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 flex items-center pr-1">
            {mode === 'search' ? 'Try searching:' : 'Try these links:'}
          </span>
          {(mode === 'search' 
            ? ['React hooks', 'Machine learning', 'Design patterns']
            : ['https://youtu.be/dQw4w9WgXcQ', 'Shorts example']
          ).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setQuery(suggestion);
                if (mode === 'search') onSearch(suggestion);
              }}
              className="
                text-xs px-3 py-1.5 rounded-full
                bg-white/5 text-slate-300 border border-white/5
                hover:bg-indigo-500/10 hover:text-indigo-300 hover:border-indigo-500/30
                transition-all duration-300
              "
            >
              {suggestion}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
