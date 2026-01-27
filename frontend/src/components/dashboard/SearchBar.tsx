/**
 * SearchBar Component
 * Semantic search for concepts in the knowledge graph
 */
import { useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  onSearch,
  placeholder = 'Search for concepts, technologies, ideas...',
}: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="
            block w-full pl-10 pr-12 py-3.5
            bg-white/5 border border-white/10 rounded-xl
            text-white placeholder-slate-500
            focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50
            transition-all duration-300
          "
          placeholder={placeholder}
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="
              absolute inset-y-0 right-0 flex items-center pr-3
              text-gray-400 hover:text-gray-600
              transition-colors duration-200
            "
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Search suggestions/hints */}
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 flex items-center pr-1">Try:</span>
        {['React hooks', 'Machine learning', 'Design patterns'].map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => {
              setQuery(suggestion);
              onSearch(suggestion);
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
  );
}
