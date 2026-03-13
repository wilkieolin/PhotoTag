import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPhotos, fetchPhoto, deletePhoto, type PhotoListParams } from '../api/photos';

export function usePhotos(params: PhotoListParams = {}) {
  return useQuery({
    queryKey: ['photos', params],
    queryFn: () => fetchPhotos(params),
  });
}

export function useInfinitePhotos(params: Omit<PhotoListParams, 'page'> = {}) {
  return useInfiniteQuery({
    queryKey: ['photos-infinite', params],
    queryFn: ({ pageParam = 1 }) => fetchPhotos({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.pages) return lastPage.page + 1;
      return undefined;
    },
  });
}

export function usePhoto(id: number | null) {
  return useQuery({
    queryKey: ['photo', id],
    queryFn: () => fetchPhoto(id!),
    enabled: id !== null,
  });
}

export function useDeletePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePhoto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      queryClient.invalidateQueries({ queryKey: ['photos-infinite'] });
    },
  });
}
