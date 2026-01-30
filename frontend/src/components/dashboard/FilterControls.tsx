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
  concept: '#FF70A6',
  technology: '#FF9770',
  idea: '#FFD670',
  person: '#70E0FF',
  technique: '#A770FF',
  architecture: '#70FFB9',
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
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
        </h2>
        <button
          onClick={handleReset}
          className="
            text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-400
            transition-colors duration-300
          "
        >
          Reset
        </button>
      </div>

      {/* Entity Types */}
      <div className="mb-8">
        <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-4">Entity Types</h3>
        <div className="space-y-2">
          {availableTypes.map((type) => {
            const isSelected = selectedTypes.includes(type);
            const color = TYPE_COLORS[type] || '#9CA3AF';

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
                    w-6 h-6 rounded-lg flex items-center justify-center
                    border transition-all duration-300
                    ${isSelected ? 'border-indigo-500/50 bg-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.2)]' : 'border-slate-800 bg-slate-900 group-hover:border-slate-700'}
                  `}
                >
                  <div
                    className={`w-2 h-2 rounded-full transition-transform duration-300 ${isSelected ? 'scale-125 shadow-[0_0_8px_currentColor]' : 'scale-100 opacity-40 group-hover:opacity-60'}`}
                    style={{ backgroundColor: color, color }}
                  />
                </div>
                <span
                  className={`
                    ml-3 text-xs font-bold uppercase tracking-widest
                    ${isSelected ? 'text-slate-200' : 'text-slate-500'}
                    group-hover:text-slate-300
                    transition-colors duration-200
                  `}
                >
                  {type}
                </span>
                {isSelected && (
                  <svg className="ml-auto w-3 h-3 text-indigo-400 animate-in fade-in zoom-in duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </label>
            );
          })}
        </div>
      </div>

      {/* Relationship Strength */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Min Strength</h3>
          <span className="text-xs font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
            {(minStrength * 100).toFixed(0)}%
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={minStrength * 100}
          onChange={(e) => handleStrengthChange(parseInt(e.target.value) / 100)}
          className="
            w-full h-1.5 rounded-lg appearance-none cursor-pointer
            bg-slate-800 border border-white/5
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-indigo-500
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-white/20
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-all
            [&::-webkit-slider-thumb]:duration-200
            [&::-webkit-slider-thumb]:hover:bg-indigo-400
            [&::-webkit-slider-thumb]:hover:scale-125
            [&::-webkit-slider-thumb]:active:scale-110
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-indigo-500
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-white/20
            [&::-moz-range-thumb]:cursor-pointer
            [&::-moz-range-thumb]:transition-all
            [&::-moz-range-thumb]:duration-200
            [&::-moz-range-thumb]:hover:bg-indigo-400
            [&::-moz-range-thumb]:hover:scale-125
          "
        />

        <div className="flex justify-between mt-3 text-[10px] uppercase tracking-tighter font-bold text-slate-600">
          <span>Weak</span>
          <span>Strong</span>
        </div>
      </div>

      {/* Active Filters Summary */}
      {(selectedTypes.length < availableTypes.length || minStrength > 0) && (
        <div className="mt-8 pt-6 border-t border-white/5">
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-3">Active</p>
          <div className="flex flex-wrap gap-2">
            {selectedTypes.length < availableTypes.length && (
              <span className="text-[10px] font-bold px-2 py-1 bg-white/5 text-slate-300 border border-white/10 rounded-lg">
                {selectedTypes.length}/{availableTypes.length} TYPES
              </span>
            )}
            {minStrength > 0 && (
              <span className="text-[10px] font-bold px-2 py-1 bg-white/5 text-slate-300 border border-white/10 rounded-lg">
                STRENGTH ≥ {(minStrength * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
