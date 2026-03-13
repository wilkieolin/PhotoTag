import api from './client';
import type { Tag } from '../types/photo';

export async function fetchTags(params?: { source?: string; search?: string }): Promise<Tag[]> {
  const { data } = await api.get('/tags', { params });
  return data;
}

export async function createTag(name: string, color?: string): Promise<Tag> {
  const { data } = await api.post('/tags', { name, color });
  return data;
}

export async function updateTag(id: number, updates: { name?: string; color?: string }): Promise<Tag> {
  const { data } = await api.patch(`/tags/${id}`, updates);
  return data;
}

export async function deleteTag(id: number): Promise<void> {
  await api.delete(`/tags/${id}`);
}

export async function assignTags(photoId: number, tagIds: number[]): Promise<void> {
  await api.post(`/photos/${photoId}/tags`, { tag_ids: tagIds });
}

export async function removeTag(photoId: number, tagId: number): Promise<void> {
  await api.delete(`/photos/${photoId}/tags/${tagId}`);
}
