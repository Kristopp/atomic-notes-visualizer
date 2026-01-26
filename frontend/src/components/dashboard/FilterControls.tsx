/**
 * FilterControls Component
 * Filter knowledge graph by entity types and relationship strength
 */
import { useState } from 'react';

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
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Filters</h2>
        <button
          onClick={handleReset}
          className="
            text-sm text-gray-600 hover:text-primary-600
            transition-colors duration-200
          "
        >
          Reset
        </button>
      </div>

      {/* Entity Types */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Entity Types</h3>
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
                    w-5 h-5 rounded flex items-center justify-center
                    border-2 transition-all duration-200
                    ${isSelected ? 'border-transparent' : 'border-gray-300'}
                  `}
                  style={{
                    backgroundColor: isSelected ? color : 'transparent',
                  }}
                >
                  {isSelected && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span
                  className={`
                    ml-3 text-sm capitalize
                    ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-600'}
                    group-hover:text-gray-900
                    transition-colors duration-200
                  `}
                >
                  {type}
                </span>
                <span
                  className="ml-auto w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
              </label>
            );
          })}
        </div>
      </div>

      {/* Relationship Strength */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Min Relationship Strength</h3>
          <span className="text-sm font-mono text-primary-600">
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
            w-full h-2 rounded-lg appearance-none cursor-pointer
            bg-gray-200
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-primary-500
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-all
            [&::-webkit-slider-thumb]:duration-200
            [&::-webkit-slider-thumb]:hover:bg-primary-600
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-primary-500
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:cursor-pointer
            [&::-moz-range-thumb]:transition-all
            [&::-moz-range-thumb]:duration-200
            [&::-moz-range-thumb]:hover:bg-primary-600
            [&::-moz-range-thumb]:hover:scale-110
          "
        />

        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Weak (0%)</span>
          <span>Strong (100%)</span>
        </div>
      </div>

      {/* Active Filters Summary */}
      {(selectedTypes.length < availableTypes.length || minStrength > 0) && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Active filters:</p>
          <div className="flex flex-wrap gap-2">
            {selectedTypes.length < availableTypes.length && (
              <span className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded-full">
                {selectedTypes.length} of {availableTypes.length} types
              </span>
            )}
            {minStrength > 0 && (
              <span className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded-full">
                Strength ≥ {(minStrength * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
