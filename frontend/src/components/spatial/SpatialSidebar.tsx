import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassPanel from './GlassPanel';
import { Upload, FileText, Link } from 'lucide-react';

interface SpatialSidebarProps {
    onUpload: (file: File) => void;
    onYoutubeUpload: (url: string) => void;
    isProcessing: boolean;
}

const SpatialSidebar: React.FC<SpatialSidebarProps> = ({
    onUpload,
    onYoutubeUpload,
    isProcessing
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showYoutubeInput, setShowYoutubeInput] = useState(false);
    const [youtubeUrl, setYoutubeUrl] = useState('');

    const handleYoutubeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (youtubeUrl.trim()) {
            onYoutubeUpload(youtubeUrl);
            setYoutubeUrl('');
            setShowYoutubeInput(false);
        }
    };

    return (
        <div className="fixed top-32 left-8 z-50 flex flex-col items-start gap-4">
            <motion.div
                whileHover={{ width: 100, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="group/sidebar"
            >
                <GlassPanel
                    intensity="thick"
                    className="
                        w-20 h-auto py-8
                        flex flex-col items-center gap-10
                        rounded-[40px] border border-white/40
                        shadow-spatial-lift transition-all duration-500
                        group-hover/sidebar:shadow-[0_20px_60px_rgba(0,0,0,0.1)]
                        group-hover/sidebar:border-white/60
                    "
                >
                    {/* Action Hub Icon */}
                    <div className="w-12 h-12 rounded-2xl bg-black/5 flex items-center justify-center mb-2">
                        <motion.div
                            animate={isProcessing ? { rotate: 360 } : {}}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                            <FileText className="w-6 h-6 text-text-primary opacity-40" />
                        </motion.div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-center gap-6">
                        <motion.button
                            whileHover={{ scale: 1.2, y: -2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessing}
                            className="relative group/btn"
                        >
                            <div className="p-4 rounded-2xl bg-white/40 border border-white/60 shadow-sm group-hover/btn:bg-white group-hover/btn:shadow-lg transition-all">
                                <Upload className="w-5 h-5 text-text-primary" />
                            </div>
                            <span className="absolute left-full ml-4 px-2 py-1 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-opacity">
                                Upload
                            </span>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.2, y: -2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setShowYoutubeInput(!showYoutubeInput)}
                            disabled={isProcessing}
                            className={`relative group/btn ${showYoutubeInput ? 'z-10' : ''}`}
                        >
                            <div className={`p-4 rounded-2xl border transition-all ${showYoutubeInput ? 'bg-black text-white border-black shadow-xl ring-4 ring-black/5' : 'bg-white/40 border-white/60 shadow-sm group-hover/btn:bg-white group-hover/btn:shadow-lg'}`}>
                                <Link className="w-5 h-5" />
                            </div>
                            <span className="absolute left-full ml-4 px-2 py-1 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-opacity">
                                YouTube
                            </span>
                        </motion.button>
                    </div>

                    {/* Hidden File Input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
                        className="hidden"
                        accept=".txt,.md,.pdf,.json"
                    />

                    {/* System Dot */}
                    <div className="mt-8 flex flex-col items-center gap-2">
                        <div className="relative flex h-2 w-2">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isProcessing ? 'bg-blue-400' : 'bg-black/10'} opacity-75`}></span>
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${isProcessing ? 'bg-blue-500' : 'bg-black/20'}`}></span>
                        </div>
                    </div>
                </GlassPanel>
            </motion.div>

            {/* Floating YouTube Popover */}
            <AnimatePresence>
                {showYoutubeInput && (
                    <motion.div
                        initial={{ opacity: 0, x: -20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -20, scale: 0.95 }}
                        className="absolute left-24 top-40 w-80 z-[60]"
                    >
                        <GlassPanel intensity="thick" className="p-4 rounded-3xl shadow-2xl border border-black/5">
                            <form onSubmit={handleYoutubeSubmit} className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-40">YouTube Link</span>
                                    <button
                                        type="button"
                                        onClick={() => setShowYoutubeInput(false)}
                                        className="text-[10px] font-bold text-text-secondary hover:text-black"
                                    >
                                        ESC
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type="url"
                                        value={youtubeUrl}
                                        onChange={(e) => setYoutubeUrl(e.target.value)}
                                        placeholder="Paste URL & press Enter..."
                                        className="w-full bg-white/60 backdrop-blur-md border border-black/5 rounded-2xl py-3.5 px-4 text-xs font-semibold text-text-primary focus:ring-2 focus:ring-black/5 focus:outline-none transition-all shadow-inner"
                                        autoFocus
                                    />
                                </div>
                                <p className="text-[9px] text-text-secondary px-1 italic">We'll transcribe the video and extract atomic notes.</p>
                            </form>
                        </GlassPanel>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SpatialSidebar;
