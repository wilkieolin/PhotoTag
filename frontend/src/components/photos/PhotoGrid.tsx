import { useCallback } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import type { Photo } from '../../types/photo';
import PhotoCard from './PhotoCard';

interface Props {
  photos: Photo[];
  hasMore: boolean;
  loadMore: () => void;
  onPhotoClick: (photo: Photo) => void;
}

export default function PhotoGrid({ photos, hasMore, loadMore, onPhotoClick }: Props) {
  const endReached = useCallback(() => {
    if (hasMore) loadMore();
  }, [hasMore, loadMore]);

  if (photos.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No photos found. Scan a directory to get started.
      </div>
    );
  }

  return (
    <VirtuosoGrid
      totalCount={photos.length}
      endReached={endReached}
      overscan={200}
      listClassName="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 p-4"
      itemContent={(index) => (
        <PhotoCard
          key={photos[index].id}
          photo={photos[index]}
          onClick={onPhotoClick}
        />
      )}
    />
  );
}
