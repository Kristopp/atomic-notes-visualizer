import React, { type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SpatialLayoutProps {
    children: ReactNode;
}

const SpatialLayout: React.FC<SpatialLayoutProps> = ({ children }) => {
    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-spatial-gradient text-text-primary font-sans selection:bg-black/10">
            {/* Level 0: Soft Ambient Background Layer */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                {/* Primary Ambient Light (Top Left) */}
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.3, 0.4, 0.3]
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-[10%] -left-[5%] w-[60%] h-[60%] rounded-full bg-white blur-[120px] mix-blend-overlay"
                />

                {/* Secondary Accent (Bottom Right) */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.1, 0.2, 0.1]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    className="absolute -bottom-[15%] -right-[10%] w-[70%] h-[70%] rounded-full bg-blue-100/30 blur-[140px] mix-blend-overlay"
                />
            </div>

            {/* Content Context */}
            <AnimatePresence mode="wait">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="relative z-10 h-screen flex flex-col"
                >
                    {children}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default SpatialLayout;
