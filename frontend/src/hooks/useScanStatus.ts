import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { startScan, getScanStatus, getTaskStatus, getStats, getDirectories } from '../api/scan';

export function useScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ directory, recursive }: { directory: string; recursive?: boolean }) =>
      startScan(directory, recursive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scan-history'] });
    },
  });
}

export function useScanStatus(scanId: number | null) {
  return useQuery({
    queryKey: ['scan-status', scanId],
    queryFn: () => getScanStatus(scanId!),
    enabled: scanId !== null,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.status === 'completed' || data.status === 'failed')) {
        return false;
      }
      return 2000;
    },
  });
}

export function useTaskStatus(taskId: string | null) {
  return useQuery({
    queryKey: ['task-status', taskId],
    queryFn: () => getTaskStatus(taskId!),
    enabled: taskId !== null,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.status === 'completed' || data.status === 'failed')) {
        return false;
      }
      return 2000;
    },
  });
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    refetchInterval: 30000,
  });
}

export function useDirectories() {
  return useQuery({
    queryKey: ['directories'],
    queryFn: getDirectories,
  });
}
