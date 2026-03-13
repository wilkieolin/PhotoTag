import { useQuery } from '@tanstack/react-query';
import { searchSimilar, searchByText, searchNearby } from '../api/search';

export function useSimilarPhotos(photoId: number | null, limit = 20) {
  return useQuery({
    queryKey: ['similar', photoId, limit],
    queryFn: () => searchSimilar(photoId!, limit),
    enabled: photoId !== null,
  });
}

export function useTextSearch(query: string, limit = 20) {
  return useQuery({
    queryKey: ['text-search', query, limit],
    queryFn: () => searchByText(query, limit),
    enabled: query.length > 0,
  });
}

export function useNearbyPhotos(
  photoId: number | null,
  timeWindowHours = 24,
  radiusKm = 5,
) {
  return useQuery({
    queryKey: ['nearby', photoId, timeWindowHours, radiusKm],
    queryFn: () => searchNearby(photoId!, timeWindowHours, radiusKm),
    enabled: photoId !== null,
  });
}
