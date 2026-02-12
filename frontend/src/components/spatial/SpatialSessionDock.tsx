import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassPanel from './GlassPanel';
import { FileText, Trash2, Layers } from 'lucide-react';

interface Session {
    id: number;
    title: string;
    note_count: number;
    created_at: string;
}

interface SpatialSessionDockProps {
    sessions: Session[];
    currentSessionId: number | null;
    onSessionSelect: (id: number) => void;
    onDelete: (id: number, title: string, count: number, e: React.MouseEvent) => void;
}

const SpatialSessionDock: React.FC<SpatialSessionDockProps> = ({
    sessions,
    currentSessionId,
    onSessionSelect,
    onDelete
}) => {
    if (sessions.length === 0) return null;

    return (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-40 w-full max-w-4xl px-8 pointer-events-none">
            <div className="flex flex-col gap-4 pointer-events-auto">
                <div className="flex items-center gap-3 px-6">
                    <Layers className="w-4 h-4 text-text-secondary opacity-30" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary opacity-30">Active Workspace Units</span>
                </div>

                <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-4 px-2">
                    <AnimatePresence mode="popLayout">
                        {sessions.map((session) => (
                            <motion.div
                                key={session.id}
                                layout
                                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                whileHover={{ y: -8, scale: 1.02 }}
                                onClick={() => onSessionSelect(session.id)}
                                className="flex-none cursor-pointer group"
                            >
                                <GlassPanel
                                    intensity={currentSessionId === session.id ? 'thick' : 'regular'}
                                    className={`
                                        w-64 p-5 rounded-[32px] border transition-all duration-500
                                        ${currentSessionId === session.id
                                            ? 'border-black/20 shadow-spatial-lift ring-1 ring-black/5 bg-white/60'
                                            : 'border-white/40 hover:border-black/10 hover:bg-white/40 shadow-sm'}
                                    `}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`
                                            w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500
                                            ${currentSessionId === session.id
                                                ? 'bg-black text-white'
                                                : 'bg-black/5 text-text-secondary opacity-40 group-hover:bg-black/10 group-hover:opacity-100'}
                                        `}>
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(session.id, session.title || 'Untitled', session.note_count, e);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-2 rounded-xl hover:bg-red-50 text-red-400 hover:text-red-500 transition-all duration-300"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-1">
                                        <h3 className={`text-sm font-bold truncate ${currentSessionId === session.id ? 'text-black' : 'text-text-secondary opacity-80'}`}>
                                            {session.title || 'Note Unit'}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black text-blue-500/60 uppercase tracking-widest bg-blue-500/5 px-2 py-0.5 rounded-full">
                                                {session.note_count || 0} Entities
                                            </span>
                                            <span className="text-[10px] font-bold text-text-secondary opacity-20 uppercase tracking-tighter">
                                                {new Date(session.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>

                                    {currentSessionId === session.id && (
                                        <motion.div
                                            layoutId="active-indicator"
                                            className="mt-4 h-0.5 w-full bg-black/10 rounded-full overflow-hidden"
                                        >
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: '100%' }}
                                                className="h-full bg-black"
                                            />
                                        </motion.div>
                                    )}
                                </GlassPanel>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default SpatialSessionDock;
