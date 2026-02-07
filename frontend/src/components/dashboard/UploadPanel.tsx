/**
 * UploadPanel Component
 * Drag-and-drop file upload for YouTube transcripts and notes
 */
import { useState, useRef } from 'react';

interface UploadPanelProps {
  onFileUpload: (file: File) => void;
  isProcessing?: boolean;
}

export default function UploadPanel({ onFileUpload, isProcessing = false }: UploadPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const textFile = files.find(
      (file) => file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')
    );

    if (textFile) {
      onFileUpload(textFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileUpload(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="glass rounded-2xl p-6 transition-all duration-300 industrial-border">
      <h2 className="text-xs font-black text-slate-400 mb-6 flex items-center gap-2 uppercase tracking-[0.2em] font-mono">
        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        Data Ingestion
      </h2>

      <div
        className={`
          relative border border-white/5 rounded-xl p-8 text-center cursor-pointer overflow-hidden
          transition-all duration-500 ease-out
          ${isDragging
            ? 'border-blue-500/50 bg-blue-500/5 shadow-[0_0_30px_rgba(59,130,246,0.1)]'
            : 'hover:border-white/10 hover:bg-white/5'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isProcessing}
        />

        <div className="space-y-4">
          <div className="relative mx-auto h-12 w-12 flex items-center justify-center">
            <div className={`absolute inset-0 rounded-full transition-all duration-500 ${isDragging ? 'bg-blue-500/20 blur-xl scale-125' : 'bg-transparent'}`} />
            <svg
              className={`relative h-6 w-6 ${isDragging ? 'text-blue-400' : 'text-slate-400'} transition-all duration-300`}
              stroke="currentColor"
              fill="none"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>

          {isProcessing ? (
            <div className="py-2">
              <div className="w-16 h-0.5 bg-white/5 rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-blue-500 animate-[loading_1.5s_ease-in-out_infinite]" />
              </div>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500 animate-pulse font-mono">Analyzing Signal...</p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-200 font-mono">
                {isDragging ? 'Release to Load' : 'Import Document'}
              </p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                Drag & Drop Markdown or Text
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
        <div className="flex gap-1.5">
          {['TXT', 'MD'].map((ext) => (
            <span key={ext} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] font-bold text-slate-400 font-mono">
              {ext}
            </span>
          ))}
        </div>
        <span className="text-[9px] font-bold text-slate-500 font-mono uppercase tracking-widest">Protocol v4.0.1</span>
      </div>
    </div>
  );
}
