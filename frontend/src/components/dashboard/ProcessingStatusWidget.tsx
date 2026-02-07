/**
 * ProcessingStatusWidget Component
 * Sticky widget showing AI processing progress
 */
import React from 'react';

export interface ProcessingStatus {
  stage: 'extracting' | 'embedding' | 'relationships' | 'saving' | 'complete';
  message: string;
  progress: number; // 0-100
}

interface ProcessingStatusWidgetProps {
  noteTitle: string;
  status: ProcessingStatus;
}

export default function ProcessingStatusWidget({
  noteTitle,
  status,
}: ProcessingStatusWidgetProps) {
  const isComplete = status.stage === 'complete';

  return (
    <div className="fixed bottom-10 right-10 glass border-white/5 shadow-2xl p-6 w-96 z-50 animate-slideIn industrial-border overflow-hidden">
      <div className="absolute top-0 right-0 p-1">
        <div className={`w-1 h-1 rounded-full ${isComplete ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}`} />
      </div>

      <div className="flex items-start gap-5">
        {/* Status indicator */}
        <div className="flex-shrink-0 pt-1">
          {!isComplete ? (
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 border border-blue-500/10 rounded-full" />
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
              <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-[10px] font-black text-slate-400 font-mono tracking-[0.2em] mb-1">
            {isComplete ? 'SIGNAL_STABLE' : 'UNIT_PROCESSING'}
          </h4>
          <p className="text-xs font-bold text-white truncate mb-4 font-mono uppercase">
            {noteTitle}
          </p>

          {/* Progress Bar Container */}
          <div className="relative w-full bg-white/5 rounded-full h-1 mb-4 overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ease-out relative ${isComplete ? 'bg-emerald-500' : 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                }`}
              style={{ width: `${status.progress}%` }}
            >
              {!isComplete && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
              )}
            </div>
          </div>

          {/* Status Message HUD */}
          <div className="flex items-center justify-between">
            <p className="text-[9px] uppercase font-bold tracking-widest text-slate-600 font-mono">
              {status.message.toUpperCase()}
            </p>
            <span className="text-[9px] font-black text-slate-700 font-mono">
              {status.progress.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
