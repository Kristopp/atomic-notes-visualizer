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
    <div className="glass rounded-2xl p-6 transition-all duration-300">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        Upload Notes
      </h2>

      <div
        className={`
          relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer
          transition-all duration-500 ease-out
          ${isDragging
            ? 'border-indigo-400 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.2)]'
            : 'border-white/5 hover:border-white/20 hover:bg-white/5'}
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

        <div className="space-y-6">
          <div className="relative mx-auto h-20 w-20 flex items-center justify-center">
            <div className={`absolute inset-0 rounded-full transition-all duration-500 ${isDragging ? 'bg-indigo-500/20 blur-xl scale-110' : 'bg-transparent'}`} />
            <svg
              className={`relative h-12 w-12 ${isDragging ? 'text-indigo-400' : 'text-slate-400'} transition-all duration-300 ${isDragging ? 'scale-110' : 'scale-100'}`}
              stroke="currentColor"
              fill="none"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>

          {isProcessing ? (
            <div className="py-2">
              <div className="w-20 h-1 bg-white/5 rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-[loading_1.5s_ease-in-out_infinite]" />
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-indigo-400 animate-pulse">Processing notes...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-base font-semibold text-slate-200">
                {isDragging ? 'Drop to upload' : 'Ready to analyze'}
              </p>
              <p className="text-xs text-slate-500 font-medium max-w-[200px] mx-auto leading-relaxed">
                Drag your markdown or text files here to begin
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-white/5">
        <div className="flex flex-wrap gap-2">
          {['.txt', '.md'].map((ext) => (
            <span key={ext} className="px-2 py-1 rounded-md bg-white/5 border border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {ext}
            </span>
          ))}
          <span className="ml-auto text-[10px] font-bold text-slate-600 uppercase tracking-widest">v1.2.0</span>
        </div>
      </div>
    </div>
  );
}
