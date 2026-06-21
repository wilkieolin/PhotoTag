import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTags, createTag, deleteTag, assignTags, removeTag } from '../api/tags';

export function useTags(params?: { source?: string; search?: string }) {
  return useQuery({
    queryKey: ['tags', params],
    queryFn: () => fetchTags(params),
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, color }: { name: string; color?: string }) => createTag(name, color),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['photos'] });
    },
  });
}

function invalidatePhotoQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['photo'] });
  queryClient.invalidateQueries({ queryKey: ['photos'] });
  queryClient.invalidateQueries({ queryKey: ['photos-infinite'] });
  queryClient.invalidateQueries({ queryKey: ['similar'] });
  queryClient.invalidateQueries({ queryKey: ['nearby'] });
}

export function useAssignTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ photoId, tagIds }: { photoId: number; tagIds: number[] }) =>
      assignTags(photoId, tagIds),
    onSuccess: () => invalidatePhotoQueries(queryClient),
  });
}

export function useRemoveTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ photoId, tagId }: { photoId: number; tagId: number }) =>
      removeTag(photoId, tagId),
    onSuccess: () => invalidatePhotoQueries(queryClient),
  });
}
