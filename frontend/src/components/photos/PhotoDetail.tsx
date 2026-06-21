import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, MapPin, Camera, Sparkles, Search, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { Photo } from '../../types/photo';
import { fullImageUrl } from '../../api/photos';
import { usePhoto } from '../../hooks/usePhotos';
import TagEditor from '../tags/TagEditor';
import SimilarPhotos from '../search/SimilarPhotos';
import NearbyPhotos from '../search/NearbyPhotos';

interface Props {
  photoId: number;
  onClose: () => void;
}

type Tab = 'info' | 'tags' | 'similar' | 'nearby';

export default function PhotoDetail({ photoId, onClose }: Props) {
  const { data: photo, isLoading } = usePhoto(photoId);
  const [activeTab, setActiveTab] = useState<Tab>('info');

  if (isLoading || !photo) {
    return (
      <div className="fixed inset-y-0 right-0 w-[480px] bg-gray-900 border-l border-gray-700 p-4 z-50">
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-gray-800 rounded" />
          <div className="h-4 bg-gray-800 rounded w-3/4" />
          <div className="h-4 bg-gray-800 rounded w-1/2" />
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'info', label: 'Info', icon: <Camera size={14} /> },
    { key: 'tags', label: 'Tags', icon: <Sparkles size={14} /> },
    { key: 'similar', label: 'Similar', icon: <Search size={14} /> },
    { key: 'nearby', label: 'Nearby', icon: <Clock size={14} /> },
  ];

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-gray-900 border-l border-gray-700 z-50 flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <h2 className="text-sm font-medium truncate">{photo.filename}</h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded">
          <X size={18} />
        </button>
      </div>

      <div className="p-3">
        <img
          src={fullImageUrl(photo.id)}
          alt={photo.filename}
          className="w-full rounded-lg object-contain max-h-64 bg-black"
        />
      </div>

      <div className="flex border-b border-gray-700">
        {tabs.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs transition-colors ${
              activeTab === key
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-3">
        {activeTab === 'info' && <InfoTab photo={photo} />}
        {activeTab === 'tags' && <TagEditor photo={photo} />}
        {activeTab === 'similar' && <SimilarPhotos photo={photo} />}
        {activeTab === 'nearby' && <NearbyPhotos photo={photo} />}
      </div>
    </div>
  );
}

function InfoTab({ photo }: { photo: Photo }) {
  const navigate = useNavigate();
  const date = photo.date_taken || photo.date_file;
  const infoRows: [string, string | null][] = [
    ['Filename', photo.filename],
    ['Date', date ? format(new Date(date), 'PPpp') : null],
    ['Dimensions', photo.width && photo.height ? `${photo.width} x ${photo.height}` : null],
    ['File size', `${(photo.file_size / 1048576).toFixed(1)} MB`],
    ['Camera', [photo.camera_make, photo.camera_model].filter(Boolean).join(' ') || null],
    ['Lens', photo.lens_model],
    ['Focal length', photo.focal_length ? `${photo.focal_length}mm` : null],
    ['Aperture', photo.aperture ? `f/${photo.aperture}` : null],
    ['Shutter', photo.shutter_speed],
    ['ISO', photo.iso ? String(photo.iso) : null],
  ];

  return (
    <div className="space-y-3">
      <table className="w-full text-xs">
        <tbody>
          {infoRows
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <tr key={label} className="border-b border-gray-800">
                <td className="py-1.5 text-gray-400 pr-4">{label}</td>
                <td className="py-1.5 text-white">{value}</td>
              </tr>
            ))}
        </tbody>
      </table>

      {photo.latitude != null && photo.longitude != null && (
        <button
          onClick={() => navigate(`/map?photo=${photo.id}`)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-400"
        >
          <MapPin size={12} />
          {photo.latitude.toFixed(6)}, {photo.longitude.toFixed(6)}
          <span className="underline ml-1">View on map</span>
        </button>
      )}

      <div className="flex gap-2 text-xs">
        {photo.has_embedding && (
          <span className="bg-green-900/50 text-green-400 px-2 py-0.5 rounded">
            Embedded
          </span>
        )}
        {photo.has_ai_tags && (
          <span className="bg-purple-900/50 text-purple-400 px-2 py-0.5 rounded">
            AI Tagged
          </span>
        )}
      </div>
    </div>
  );
}
