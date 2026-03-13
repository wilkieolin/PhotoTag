import { useState } from 'react';
import { useNearbyPhotos } from '../../hooks/useSearch';
import { thumbnailUrl } from '../../api/photos';
import { format } from 'date-fns';
import type { Photo } from '../../types/photo';

interface Props {
  photo: Photo;
}

export default function NearbyPhotos({ photo }: Props) {
  const [timeWindow, setTimeWindow] = useState(24);
  const [radiusKm, setRadiusKm] = useState(5);
  const { data: results, isLoading } = useNearbyPhotos(photo.id, timeWindow, radiusKm);

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
          <p className="text-xs text-gray-400">{results.length} nearby photos</p>
          <div className="grid grid-cols-3 gap-1.5">
            {results.map((p) => (
              <div key={p.id} className="relative group">
                <img
                  src={thumbnailUrl(p.id)}
                  alt={p.filename}
                  className="w-full aspect-square object-cover rounded"
                  loading="lazy"
                />
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
