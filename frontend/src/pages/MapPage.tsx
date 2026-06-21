import { useSearchParams } from 'react-router-dom';
import MapView from '../components/search/MapView';

export default function MapPage() {
  const [searchParams] = useSearchParams();
  const highlightPhotoId = searchParams.get('photo') ? Number(searchParams.get('photo')) : null;

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-3 border-b border-gray-800">
        <h1 className="text-xl font-bold">Map</h1>
        <p className="text-xs text-gray-400">Browse geotagged photos on the map</p>
      </div>
      <div className="flex-1">
        <MapView highlightPhotoId={highlightPhotoId} />
      </div>
    </div>
  );
}
