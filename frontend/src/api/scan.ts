import api from './client';
import type { ScanStatus, TaskStatus, WatchedDirectory, Stats } from '../types/photo';

export async function startScan(
  directory: string,
  recursive = true,
): Promise<{ scan_id: number; task_id: string }> {
  const { data } = await api.post('/scan', { directory, recursive });
  return data;
}

export async function getScanStatus(scanId: number): Promise<ScanStatus> {
  const { data } = await api.get(`/scan/${scanId}/status`);
  return data;
}

export async function getScanHistory(): Promise<ScanStatus[]> {
  const { data } = await api.get('/scan/history');
  return data;
}

export async function getTaskStatus(taskId: string): Promise<TaskStatus> {
  const { data } = await api.get(`/tasks/${taskId}`);
  return data;
}

export async function addDirectory(
  directory: string,
  recursive = true,
): Promise<WatchedDirectory> {
  const { data } = await api.post('/directories', { directory, recursive });
  return data;
}

export async function getDirectories(): Promise<WatchedDirectory[]> {
  const { data } = await api.get('/directories');
  return data;
}

export async function removeDirectory(id: number): Promise<void> {
  await api.delete(`/directories/${id}`);
}

export async function getStats(): Promise<Stats> {
  const { data } = await api.get('/stats');
  return data;
}
