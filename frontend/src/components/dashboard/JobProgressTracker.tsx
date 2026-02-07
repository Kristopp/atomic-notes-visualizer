/**
 * JobProgressTracker Component
 * Real-time polling for background background tasks (e.g. YouTube processing)
 */
import { useState, useEffect, useRef } from 'react';

interface JobProgress {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  stage: string;
  progress: number;
  message: string;
  note_id?: number;
}

interface JobProgressTrackerProps {
  jobId: string;
  apiBaseUrl: string;
  onComplete: (noteId: number) => void;
  onClose: () => void;
}

export default function JobProgressTracker({
  jobId,
  apiBaseUrl,
  onComplete,
  onClose,
}: JobProgressTrackerProps) {
  const [progressData, setProgressData] = useState<JobProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasCompleted = useRef(false);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    let isMounted = true;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/youtube/status/${jobId}`);
        if (!response.ok) throw new Error('Status Fetch Failure');

        const data = await response.json();
        if (!isMounted) return;

        setProgressData(data);

        if (data.status === 'completed') {
          if (pollInterval) clearInterval(pollInterval);
          if (!hasCompleted.current) {
            hasCompleted.current = true;
            if (data.note_id) onComplete(data.note_id);
          }
        } else if (data.status === 'failed') {
          if (pollInterval) clearInterval(pollInterval);
          setError(data.message || 'Signal Interrupted');
        }
      } catch (err) {
        if (isMounted) console.error('Status poll error:', err);
      }
    };

    fetchStatus();
    pollInterval = setInterval(fetchStatus, 3000);

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [jobId, apiBaseUrl, onComplete]);

  if (!progressData && !error) return null;

  const isProcessing = progressData?.status === 'processing' || progressData?.status === 'queued';
  const isFailed = progressData?.status === 'failed' || error;
  const isComplete = progressData?.status === 'completed';

  return (
    <div className="glass rounded-2xl p-6 mb-6 relative overflow-hidden group industrial-border">
      {/* Background Pulse for processing */}
      {isProcessing && (
        <div className="absolute inset-0 bg-blue-500/[0.03] animate-pulse pointer-events-none" />
      )}

      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3 font-mono">
          {isComplete ? (
            <div className="w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : isFailed ? (
            <div className="w-5 h-5 rounded bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <div className="w-1 h-3 bg-red-500 rounded-full" />
            </div>
          ) : (
            <div className="relative w-5 h-5 flex items-center justify-center">
              <div className="absolute inset-0 border border-blue-500/10 rounded-full" />
              <div className="w-4 h-4 border-t-2 border-blue-500 rounded-full animate-spin" />
            </div>
          )}
          <span>{isComplete ? 'Stream Analysed' : isFailed ? 'Protocol Failure' : 'Stream Ingestion Active'}</span>
        </h3>
        <button
          onClick={onClose}
          className="text-slate-700 hover:text-white transition-colors p-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {isFailed ? (
        <div className="p-3 bg-red-500/5 border border-red-500/10 rounded font-mono">
          <p className="text-[10px] text-red-400 uppercase font-bold tracking-widest">{`Error :: ${error || 'Unknown Exception'}`}</p>
        </div>
      ) : (
        <>
          <div className="relative w-full bg-white/5 rounded-full h-1 mb-6 overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ease-out relative ${isComplete ? 'bg-emerald-500' : 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                }`}
              style={{ width: `${progressData?.progress || 0}%` }}
            >
              {isProcessing && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              )}
            </div>
          </div>

          <div className="flex justify-between items-end gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white mb-2 font-mono truncate uppercase">
                {progressData?.message?.replace(/_/g, ' ') || 'Assigning Neural Links...'}
              </p>
              <div className="flex items-center gap-3">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 font-mono">Stage</span>
                <span className="text-[9px] font-bold text-blue-400 font-mono uppercase tracking-widest px-1.5 py-0.5 bg-blue-500/5 border border-blue-500/10 rounded">
                  {progressData?.stage?.replace(/_/g, ' ') || 'Initializing'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-white/20 font-mono tabular-nums leading-none block mb-1">
                {Math.round(progressData?.progress || 0)}%
              </span>
              <span className="text-[8px] text-slate-700 font-bold uppercase tracking-widest font-mono">Signal</span>
            </div>
          </div>

          {isComplete && (
            <button
              onClick={() => progressData?.note_id && onComplete(progressData.note_id)}
              className="w-full mt-6 py-3 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded font-mono text-[9px] font-black uppercase tracking-[0.3em] transition-all hover:border-emerald-500/40"
            >
              [ Access Neural Topology ]
            </button>
          )}
        </>
      )}
    </div>
  );
}
