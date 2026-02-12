import { type ElementType, type ReactNode, memo } from 'react';
import { motion } from 'framer-motion';

interface GlassPanelProps {
    children: ReactNode;
    className?: string;
    as?: ElementType;
    intensity?: 'thin' | 'regular' | 'thick';
    hoverEffect?: boolean;
    layout?: boolean;
}

const GlassPanel = memo(({
    children,
    className = '',
    as: Component = 'div',
    intensity = 'regular',
    hoverEffect = false,
    layout = false,
    ...props
}: GlassPanelProps & { [key: string]: any }) => {

    // Map intensity to internal styles if needed, or use the global .spatial-glass
    const intensityMap = {
        thin: 'bg-white/30 backdrop-blur-[20px]',
        regular: 'spatial-glass',
        thick: 'bg-white/60 backdrop-blur-[60px]',
    };

    const MotionComponent = motion(Component as any);

    return (
        <MotionComponent
            layout={layout}
            className={`
                rounded-hyper shadow-spatial-lift transition-all duration-500 ease-out 
                ${intensity === 'regular' ? 'spatial-glass' : intensityMap[intensity]} 
                ${hoverEffect ? 'interactive-glass cursor-pointer' : ''} 
                ${className}
            `}
            whileHover={hoverEffect ? {
                scale: 1.01,
                transition: { duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }
            } : undefined}
            whileTap={hoverEffect ? { scale: 0.98 } : undefined}
            {...props}
        >
            {children}
        </MotionComponent>
    );
});

GlassPanel.displayName = 'GlassPanel';

export default GlassPanel;
