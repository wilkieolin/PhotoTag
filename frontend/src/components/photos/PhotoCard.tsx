import { useState } from 'react';
import type { Photo } from '../../types/photo';
import { thumbnailUrl } from '../../api/photos';
import { format } from 'date-fns';

interface Props {
  photo: Photo;
  onClick: (photo: Photo) => void;
}

export default function PhotoCard({ photo, onClick }: Props) {
  const [loaded, setLoaded] = useState(false);
  const date = photo.date_taken || photo.date_file;

  return (
    <div
      className="relative group cursor-pointer rounded-lg overflow-hidden bg-gray-800"
      onClick={() => onClick(photo)}
    >
      <div className="aspect-square">
        {!loaded && (
          <div className="absolute inset-0 bg-gray-800 animate-pulse" />
        )}
        <img
          src={thumbnailUrl(photo.id)}
          alt={photo.filename}
          className={`w-full h-full object-cover transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-xs text-white truncate">{photo.filename}</p>
        {date && (
          <p className="text-xs text-gray-300">
            {format(new Date(date), 'MMM d, yyyy')}
          </p>
        )}
      </div>

      {photo.tags.length > 0 && (
        <div className="absolute top-1 right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {photo.tags.length}
        </div>
      )}
    </div>
  );
}
