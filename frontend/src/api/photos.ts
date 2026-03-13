import api from './client';
import type { Photo, PaginatedResponse } from '../types/photo';

export interface PhotoListParams {
  page?: number;
  per_page?: number;
  sort_by?: 'date_taken' | 'created_at' | 'filename';
  sort_order?: 'asc' | 'desc';
  tag_ids?: number[];
  date_from?: string;
  date_to?: string;
  has_gps?: boolean;
}

export async function fetchPhotos(params: PhotoListParams = {}): Promise<PaginatedResponse<Photo>> {
  const query: Record<string, string> = {};
  if (params.page) query.page = String(params.page);
  if (params.per_page) query.per_page = String(params.per_page);
  if (params.sort_by) query.sort_by = params.sort_by;
  if (params.sort_order) query.sort_order = params.sort_order;
  if (params.tag_ids?.length) query.tag_ids = params.tag_ids.join(',');
  if (params.date_from) query.date_from = params.date_from;
  if (params.date_to) query.date_to = params.date_to;
  if (params.has_gps) query.has_gps = 'true';

  const { data } = await api.get('/photos', { params: query });
  return data;
}

export async function fetchPhoto(id: number): Promise<Photo> {
  const { data } = await api.get(`/photos/${id}`);
  return data;
}

export async function deletePhoto(id: number): Promise<void> {
  await api.delete(`/photos/${id}`);
}

export async function retagPhoto(id: number): Promise<{ task_id: string }> {
  const { data } = await api.post(`/photos/${id}/retag`);
  return data;
}

export function thumbnailUrl(photoId: number): string {
  return `/api/photos/${photoId}/thumbnail`;
}

export function fullImageUrl(photoId: number): string {
  return `/api/photos/${photoId}/full`;
}
