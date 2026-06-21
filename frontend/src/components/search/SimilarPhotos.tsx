import { useState } from 'react';
import { Check } from 'lucide-react';
import { useSimilarPhotos } from '../../hooks/useSearch';
import { useAssignTags } from '../../hooks/useTags';
import { thumbnailUrl } from '../../api/photos';
import type { Photo } from '../../types/photo';
import TagApplyPanel from './TagApplyPanel';

interface Props {
  photo: Photo;
}

export default function SimilarPhotos({ photo }: Props) {
  const { data: results, isLoading, error } = useSimilarPhotos(photo.id);
  const assignTags = useAssignTags();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApply = async (tagIds: number[]) => {
    await Promise.all(
      Array.from(selectedIds).map((id) => assignTags.mutateAsync({ photoId: id, tagIds })),
    );
    setSelectedIds(new Set());
  };

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
      <TagApplyPanel tags={photo.tags} selectedCount={selectedIds.size} onApply={handleApply} />
      <p className="text-xs text-gray-400">{results.length} similar photos</p>
      <div className="grid grid-cols-3 gap-1.5">
        {results.map(({ photo: p, similarity }) => (
          <div key={p.id} className="relative group">
            <img
              src={thumbnailUrl(p.id)}
              alt={p.filename}
              className={`w-full aspect-square object-cover rounded ${
                selectedIds.has(p.id) ? 'ring-2 ring-blue-500' : ''
              }`}
              loading="lazy"
            />
            <button
              onClick={() => toggleSelect(p.id)}
              className={`absolute top-1 left-1 w-4 h-4 rounded-full flex items-center justify-center border ${
                selectedIds.has(p.id)
                  ? 'bg-blue-600 border-blue-600'
                  : 'bg-black/40 border-white/70 opacity-0 group-hover:opacity-100'
              }`}
            >
              {selectedIds.has(p.id) && <Check size={10} className="text-white" />}
            </button>
            {p.tags.length > 0 && (
              <span
                className="absolute top-1 right-1 bg-blue-600 text-white text-[10px] leading-none px-1 py-0.5 rounded-full"
                title={p.tags.map((t) => t.name).join(', ')}
              >
                {p.tags.length}
              </span>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-center py-0.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
              {(similarity * 100).toFixed(0)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
