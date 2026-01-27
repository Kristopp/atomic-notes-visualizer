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
    <div className="fixed bottom-8 right-8 glass border-white/10 rounded-2xl shadow-2xl p-6 w-80 z-50 animate-slideIn">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`flex-shrink-0 ${isComplete ? '' : 'animate-spin'}`}>
          {isComplete ? (
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-lg">✓</span>
            </div>
          ) : (
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-white truncate mb-1">
            {isComplete ? 'Processing Complete!' : 'Processing Note'}
          </h4>
          <p className="text-xs text-slate-400 truncate mb-4">
            {noteTitle}
          </p>

          {/* Progress Bar */}
          <div className="w-full bg-white/5 rounded-full h-1.5 mb-3">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${isComplete ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.4)]'
                }`}
              style={{ width: `${status.progress}%` }}
            />
          </div>

          {/* Status Message */}
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
            {status.message}
          </p>
        </div>
      </div>
    </div>
  );
}
