import { useState } from 'react';
import { FolderOpen, Play, Loader2 } from 'lucide-react';
import { useScan, useTaskStatus, useDirectories } from '../../hooks/useScanStatus';
import { useQueryClient } from '@tanstack/react-query';

export default function ScanDialog() {
  const [directory, setDirectory] = useState('');
  const [recursive, setRecursive] = useState(true);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeScanId, setActiveScanId] = useState<number | null>(null);
  const scan = useScan();
  const { data: task } = useTaskStatus(activeTaskId);
  const { data: directories = [] } = useDirectories();
  const queryClient = useQueryClient();

  const handleScan = async () => {
    if (!directory.trim()) return;
    try {
      const result = await scan.mutateAsync({ directory: directory.trim(), recursive });
      setActiveTaskId(result.task_id);
      setActiveScanId(result.scan_id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Scan failed';
      alert(msg);
    }
  };

  const isRunning = task && (task.status === 'pending' || task.status === 'running');
  const isComplete = task?.status === 'completed';

  if (isComplete) {
    // Refresh photo list when scan completes
    queryClient.invalidateQueries({ queryKey: ['photos'] });
    queryClient.invalidateQueries({ queryKey: ['photos-infinite'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Directory path</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <FolderOpen size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={directory}
              onChange={(e) => setDirectory(e.target.value)}
              placeholder="/path/to/photos"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              disabled={!!isRunning}
            />
          </div>
          <button
            onClick={handleScan}
            disabled={!directory.trim() || !!isRunning}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1"
          >
            {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Scan
          </button>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={recursive}
          onChange={(e) => setRecursive(e.target.checked)}
          className="rounded border-gray-700"
        />
        <span className="text-gray-400">Scan subdirectories recursively</span>
      </label>

      {task && (
        <div className="bg-gray-800 rounded-lg p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Status</span>
            <span className={
              task.status === 'completed' ? 'text-green-400' :
              task.status === 'failed' ? 'text-red-400' :
              'text-yellow-400'
            }>
              {task.status}
              {task.progress.phase ? ` (${task.progress.phase})` : ''}
            </span>
          </div>

          {task.progress.total != null && task.progress.total > 0 && (
            <>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.round(((task.progress.current || 0) / task.progress.total) * 100)}%`,
                  }}
                />
              </div>
              <div className="text-xs text-gray-500 text-right">
                {task.progress.current || 0} / {task.progress.total}
              </div>
            </>
          )}

          {task.error && (
            <p className="text-xs text-red-400">{task.error}</p>
          )}
        </div>
      )}

      {directories.length > 0 && (
        <div>
          <h3 className="text-sm text-gray-400 mb-2">Watched Directories</h3>
          <div className="space-y-1">
            {directories.map((dir) => (
              <div key={dir.id} className="flex items-center justify-between bg-gray-800 rounded px-3 py-1.5 text-xs">
                <span className="truncate">{dir.directory}</span>
                {dir.last_scanned && (
                  <span className="text-gray-500 ml-2 flex-shrink-0">
                    Scanned {new Date(dir.last_scanned).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
