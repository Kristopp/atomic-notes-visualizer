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
        if (!response.ok) throw new Error('Failed to fetch status');
        
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
          setError(data.message || 'Processing failed');
        }
      } catch (err) {
        if (isMounted) console.error('Status poll error:', err);
      }
    };

    // Initial fetch
    fetchStatus();
    
    // Setup interval
    pollInterval = setInterval(fetchStatus, 3000); // Increased to 3s for stability

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [jobId, apiBaseUrl, onComplete]);

  if (!progressData && !error) return null;

  return (
    <div className="glass rounded-xl p-6 mb-6 relative overflow-hidden group">
      {/* Background Pulse for processing */}
      {progressData?.status === 'processing' && (
        <div className="absolute inset-0 bg-indigo-500/5 animate-pulse pointer-events-none" />
      )}

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
          {progressData?.status === 'completed' ? (
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : progressData?.status === 'failed' ? (
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          )}
          {progressData?.status === 'completed' ? 'Processing Complete' : 'Processing YouTube Video'}
        </h3>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-400 mb-2">{error}</p>
      ) : (
        <>
          <div className="w-full bg-white/5 rounded-full h-2 mb-4 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ease-out ${
                progressData?.status === 'completed' ? 'bg-green-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${progressData?.progress || 0}%` }}
            />
          </div>

          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs font-medium text-slate-300 mb-1">
                {progressData?.message || 'Initializng...'}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                Stage: {progressData?.stage || 'Starting'}
              </p>
            </div>
            <span className="text-lg font-black text-white/50">
              {Math.round(progressData?.progress || 0)}%
            </span>
          </div>

          {progressData?.status === 'completed' && (
            <button
              onClick={() => progressData.note_id && onComplete(progressData.note_id)}
              className="w-full mt-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
            >
              View Knowledge Graph
            </button>
          )}
        </>
      )}
    </div>
  );
}
