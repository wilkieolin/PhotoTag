import { useSimilarPhotos } from '../../hooks/useSearch';
import { thumbnailUrl } from '../../api/photos';

interface Props {
  photoId: number;
}

export default function SimilarPhotos({ photoId }: Props) {
  const { data: results, isLoading, error } = useSimilarPhotos(photoId);

  if (isLoading) {
    return <div className="text-xs text-gray-500">Finding similar photos...</div>;
  }

  if (error) {
    return (
      <div className="text-xs text-gray-500">
        Similarity search unavailable. Embeddings may not be generated yet.
      </div>
    );
  }

  if (!results || results.length === 0) {
    return <div className="text-xs text-gray-500">No similar photos found.</div>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400">{results.length} similar photos</p>
      <div className="grid grid-cols-3 gap-1.5">
        {results.map(({ photo, similarity }) => (
          <div key={photo.id} className="relative group">
            <img
              src={thumbnailUrl(photo.id)}
              alt={photo.filename}
              className="w-full aspect-square object-cover rounded"
              loading="lazy"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-center py-0.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
              {(similarity * 100).toFixed(0)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
