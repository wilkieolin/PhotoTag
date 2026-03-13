import api from './client';
import type { Photo, SimilarPhotoResult, PaginatedResponse } from '../types/photo';

export async function searchSimilar(
  photoId: number,
  limit = 20,
  threshold = 0.0,
): Promise<SimilarPhotoResult[]> {
  const { data } = await api.get(`/search/similar/${photoId}`, {
    params: { limit, threshold },
  });
  return data;
}

export async function searchByText(
  query: string,
  limit = 20,
): Promise<SimilarPhotoResult[]> {
  const { data } = await api.get('/search/by-text', {
    params: { q: query, limit },
  });
  return data;
}

export async function searchNearby(
  photoId: number,
  timeWindowHours = 24,
  radiusKm = 5,
  limit = 20,
): Promise<Photo[]> {
  const { data } = await api.get(`/search/nearby/${photoId}`, {
    params: { time_window_hours: timeWindowHours, radius_km: radiusKm, limit },
  });
  return data;
}

export async function searchByDate(
  dateFrom: string,
  dateTo: string,
  page = 1,
  perPage = 50,
): Promise<PaginatedResponse<Photo>> {
  const { data } = await api.get('/search/by-date', {
    params: { date_from: dateFrom, date_to: dateTo, page, per_page: perPage },
  });
  return data;
}

export async function searchMapBounds(
  north: number,
  south: number,
  east: number,
  west: number,
  limit = 200,
): Promise<Photo[]> {
  const { data } = await api.get('/search/map-bounds', {
    params: { north, south, east, west, limit },
  });
  return data;
}
