import { useState } from 'react';
import { Check } from 'lucide-react';
import { useNearbyPhotos } from '../../hooks/useSearch';
import { useAssignTags } from '../../hooks/useTags';
import { thumbnailUrl } from '../../api/photos';
import { format } from 'date-fns';
import type { Photo } from '../../types/photo';
import TagApplyPanel from './TagApplyPanel';

interface Props {
  photo: Photo;
}

export default function NearbyPhotos({ photo }: Props) {
  const [timeWindow, setTimeWindow] = useState(24);
  const [radiusKm, setRadiusKm] = useState(5);
  const { data: results, isLoading } = useNearbyPhotos(photo.id, timeWindow, radiusKm);
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

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-400">Time window (hours)</label>
          <input
            type="number"
            value={timeWindow}
            onChange={(e) => setTimeWindow(Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs mt-0.5"
            min={1}
          />
        </div>
        {photo.latitude != null && (
          <div>
            <label className="text-xs text-gray-400">Radius (km)</label>
            <input
              type="number"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs mt-0.5"
              min={0.1}
              step={0.5}
            />
          </div>
        )}
      </div>

      {isLoading && (
        <div className="text-xs text-gray-500">Searching nearby...</div>
      )}

      {results && results.length === 0 && (
        <div className="text-xs text-gray-500">No nearby photos found.</div>
      )}

      {results && results.length > 0 && (
        <div className="space-y-2">
          <TagApplyPanel tags={photo.tags} selectedCount={selectedIds.size} onApply={handleApply} />
          <p className="text-xs text-gray-400">{results.length} nearby photos</p>
          <div className="grid grid-cols-3 gap-1.5">
            {results.map((p) => (
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
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-center py-0.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  {p.date_taken
                    ? format(new Date(p.date_taken), 'MMM d HH:mm')
                    : p.filename}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
