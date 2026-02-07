/**
 * FilterControls Component
 * Filter knowledge graph by entity types and relationship strength
 */
import { useState, useEffect } from 'react';

interface FilterOptions {
  entityTypes: string[];
  minStrength: number;
}

interface FilterControlsProps {
  onFilterChange: (filters: FilterOptions) => void;
  availableTypes?: string[];
}

const DEFAULT_TYPES = ['concept', 'technology', 'idea', 'person', 'technique', 'architecture'];

const TYPE_COLORS: Record<string, string> = {
  concept: '#3B82F6',
  technology: '#60A5FA',
  idea: '#F97316',
  person: '#A78BFA',
  technique: '#34D399',
  architecture: '#F472B6',
};

export default function FilterControls({
  onFilterChange,
  availableTypes = DEFAULT_TYPES,
}: FilterControlsProps) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>(availableTypes);
  const [minStrength, setMinStrength] = useState(0);

  // Sync selected types when available types change
  useEffect(() => {
    setSelectedTypes(availableTypes);
  }, [availableTypes]);

  const handleTypeToggle = (type: string) => {
    const newTypes = selectedTypes.includes(type)
      ? selectedTypes.filter((t) => t !== type)
      : [...selectedTypes, type];

    setSelectedTypes(newTypes);
    onFilterChange({ entityTypes: newTypes, minStrength });
  };

  const handleStrengthChange = (value: number) => {
    setMinStrength(value);
    onFilterChange({ entityTypes: selectedTypes, minStrength: value });
  };

  const handleReset = () => {
    setSelectedTypes(availableTypes);
    setMinStrength(0);
    onFilterChange({ entityTypes: availableTypes, minStrength: 0 });
  };

  return (
    <div className="glass rounded-2xl p-6 industrial-border">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xs font-black text-slate-500 flex items-center gap-2 uppercase tracking-[0.2em] font-mono">
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Signal Filters
        </h2>
        <button
          onClick={handleReset}
          className="text-[9px] font-bold uppercase tracking-widest text-slate-600 hover:text-blue-500 transition-colors font-mono"
        >
          [ RESET ]
        </button>
      </div>

      {/* Entity Types */}
      <div className="mb-10">
        <h3 className="text-[9px] uppercase tracking-widest font-bold text-slate-600 mb-4 font-mono">CLASSIFICATION</h3>
        <div className="space-y-1.5">
          {availableTypes.map((type) => {
            const isSelected = selectedTypes.includes(type);
            const color = TYPE_COLORS[type] || '#475569';

            return (
              <label
                key={type}
                className="flex items-center cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleTypeToggle(type)}
                  className="sr-only"
                />
                <div
                  className={`
                    w-4 h-4 rounded-sm flex items-center justify-center
                    border transition-all duration-300
                    ${isSelected ? 'border-blue-500/40 bg-blue-500/10' : 'border-white/5 bg-white/5 group-hover:border-white/10'}
                  `}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${isSelected ? 'scale-100 shadow-[0_0_10px_currentColor]' : 'scale-75 opacity-20'}`}
                    style={{ backgroundColor: color, color }}
                  />
                </div>
                <span
                  className={`
                    ml-3 text-[10px] font-bold uppercase tracking-wider font-mono
                    ${isSelected ? 'text-slate-200' : 'text-slate-600'}
                    group-hover:text-slate-300 transition-colors
                  `}
                >
                  {type}
                </span>
                {isSelected && (
                  <div className="ml-auto w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                )}
              </label>
            );
          })}
        </div>
      </div>

      {/* Relationship Strength */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[9px] uppercase tracking-widest font-bold text-slate-600 font-mono">THRESHOLD</h3>
          <span className="text-[10px] font-black text-blue-500 font-mono">
            {(minStrength * 100).toFixed(0)}%
          </span>
        </div>

        <div className="relative pt-1">
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={minStrength * 100}
            onChange={(e) => handleStrengthChange(parseInt(e.target.value) / 100)}
            className="
              w-full h-0.5 rounded-full appearance-none cursor-pointer
              bg-white/5 border-none
              accent-blue-500
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-blue-500
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-all
              [&::-webkit-slider-thumb]:hover:scale-125
              [&::-moz-range-thumb]:w-3
              [&::-moz-range-thumb]:h-3
              [&::-moz-range-thumb]:border-none
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-blue-500
            "
          />
        </div>

        <div className="flex justify-between mt-4 text-[8px] uppercase tracking-widest font-bold text-slate-700 font-mono">
          <span>COARSE</span>
          <span>PRECISE</span>
        </div>
      </div>

      {/* Connectivity Visualization */}
      <div className="mt-8 pt-6 border-t border-white/5">
        <div className="flex gap-1 h-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 rounded-full transition-all duration-500 ${i / 10 < minStrength ? 'bg-blue-500/40' : 'bg-white/5'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
