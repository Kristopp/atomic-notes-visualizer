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
    <div className="fixed bottom-6 right-6 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 w-80 z-50 animate-slideIn">
      <div className="flex items-start gap-3">
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
          <h4 className="text-sm font-semibold text-gray-900 truncate mb-1">
            {isComplete ? 'Processing Complete!' : 'Processing Note'}
          </h4>
          <p className="text-xs text-gray-600 truncate mb-2">
            {noteTitle}
          </p>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                isComplete ? 'bg-green-500' : 'bg-indigo-600'
              }`}
              style={{ width: `${status.progress}%` }}
            />
          </div>
          
          {/* Status Message */}
          <p className="text-xs text-gray-600">
            {status.message}
          </p>
        </div>
      </div>
    </div>
  );
}
