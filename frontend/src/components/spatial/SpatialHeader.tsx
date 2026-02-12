import React from 'react';
import GlassPanel from './GlassPanel';
import { Search } from 'lucide-react';

interface SpatialHeaderProps {
    onSearch: (query: string) => void;
}

const SpatialHeader: React.FC<SpatialHeaderProps> = ({ onSearch }) => {
    return (
        <header className="fixed top-12 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4">
            <GlassPanel
                intensity="thick"
                className="flex items-center justify-between px-8 py-4 rounded-full"
            >
                {/* Search Input */}
                <div className="flex items-center gap-4 flex-1">
                    <Search className="w-5 h-5 text-text-secondary opacity-50" />
                    <input
                        type="text"
                        placeholder="Search workspace..."
                        className="bg-transparent border-none outline-none text-[15px] w-full placeholder:text-black/20 text-text-primary font-semibold tracking-tight"
                        onChange={(e) => onSearch(e.target.value)}
                    />
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-3 pl-8 border-l border-black/[0.05]">
                    <div className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black/5 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-black/80"></span>
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-secondary opacity-40">
                        Live
                    </span>
                </div>
            </GlassPanel>
        </header>
    );
};

export default SpatialHeader;
