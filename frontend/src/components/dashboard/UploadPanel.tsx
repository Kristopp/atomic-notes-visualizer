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
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-300 ease-in-out
          ${isDragging
            ? 'border-indigo-400 bg-indigo-500/10 scale-[1.02]'
            : 'border-white/10 hover:border-white/30 hover:bg-white/5'}
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
          <div className="relative mx-auto h-16 w-16">
            <svg
              className={`h-full w-full ${isDragging ? 'text-indigo-400' : 'text-slate-500'} transition-colors duration-300`}
              stroke="currentColor"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            {isDragging && (
              <div className="absolute inset-0 rounded-full border-2 border-indigo-400 animate-ping opacity-20" />
            )}
          </div>

          {isProcessing ? (
            <div className="py-2">
              <div className="w-12 h-1 bg-white/10 rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-indigo-500 animate-[loading_1.5s_ease-in-out_infinite]" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-400">Processing notes...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-300">
                <span className="text-indigo-400 font-bold">Click to select</span>
                <span className="block text-xs text-slate-500 mt-1 font-normal italic">or drag and drop here</span>
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Supported formats</h3>
        <ul className="grid grid-cols-1 gap-2">
          {['YouTube transcripts (.txt)', 'Markdown files (.md)', 'Plain text (.txt)'].map((format, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-slate-400">
              <div className="w-1 h-1 rounded-full bg-indigo-500/50" />
              {format}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
