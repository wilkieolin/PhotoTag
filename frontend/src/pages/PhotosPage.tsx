import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import { useInfinitePhotos } from '../hooks/usePhotos';
import type { Photo } from '../types/photo';
import type { PhotoListParams } from '../api/photos';
import PhotoGrid from '../components/photos/PhotoGrid';
import PhotoDetail from '../components/photos/PhotoDetail';
import TagSidebar from '../components/tags/TagSidebar';

export default function PhotosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('selected') ? Number(searchParams.get('selected')) : null;
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<PhotoListParams['sort_by']>('date_taken');
  const [sortOrder, setSortOrder] = useState<PhotoListParams['sort_order']>('desc');

  const params: Omit<PhotoListParams, 'page'> = useMemo(
    () => ({
      per_page: 60,
      sort_by: sortBy,
      sort_order: sortOrder,
      tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    }),
    [sortBy, sortOrder, selectedTagIds],
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfinitePhotos(params);

  const photos = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  const total = data?.pages[0]?.total ?? 0;

  const handlePhotoClick = useCallback(
    (photo: Photo) => {
      setSearchParams({ selected: String(photo.id) });
    },
    [setSearchParams],
  );

  const handleClose = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  return (
    <div className="h-full flex">
      {showFilters && (
        <div className="w-56 border-r border-gray-800 p-3 overflow-auto">
          <h3 className="text-sm font-medium mb-3">Filters</h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as PhotoListParams['sort_by'])}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs mt-0.5"
              >
                <option value="date_taken">Date taken</option>
                <option value="filename">Filename</option>
                <option value="created_at">Date added</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as PhotoListParams['sort_order'])}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs mt-0.5"
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Tags</label>
              <TagSidebar
                selectedTagIds={selectedTagIds}
                onTagSelect={setSelectedTagIds}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded ${showFilters ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
            >
              <SlidersHorizontal size={16} />
            </button>
            <span className="text-sm text-gray-400">
              {total.toLocaleString()} photos
            </span>
          </div>
        </div>

        <div className="flex-1">
          <PhotoGrid
            photos={photos}
            hasMore={!!hasNextPage}
            loadMore={() => fetchNextPage()}
            onPhotoClick={handlePhotoClick}
          />
        </div>
      </div>

      {selectedId !== null && (
        <PhotoDetail photoId={selectedId} onClose={handleClose} />
      )}
    </div>
  );
}
