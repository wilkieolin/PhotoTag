import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import type { LatLngBounds } from 'leaflet';
import { searchMapBounds } from '../../api/search';
import { thumbnailUrl } from '../../api/photos';
import type { Photo } from '../../types/photo';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue in Leaflet + bundlers
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function MapEvents({ onBoundsChange }: { onBoundsChange: (bounds: LatLngBounds) => void }) {
  useMapEvents({
    moveend: (e) => {
      onBoundsChange(e.target.getBounds());
    },
    zoomend: (e) => {
      onBoundsChange(e.target.getBounds());
    },
  });
  return null;
}

export default function MapView() {
  const [photos, setPhotos] = useState<Photo[]>([]);

  const handleBoundsChange = useCallback(async (bounds: LatLngBounds) => {
    try {
      const results = await searchMapBounds(
        bounds.getNorth(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getWest(),
      );
      setPhotos(results);
    } catch {
      // Map bounds query failed, ignore
    }
  }, []);

  return (
    <div className="h-full w-full">
      <MapContainer
        center={[40, -95]}
        zoom={4}
        worldCopyJump
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onBoundsChange={handleBoundsChange} />
        {photos.map((photo) => (
          photo.latitude != null && photo.longitude != null && (
            <Marker key={photo.id} position={[photo.latitude, photo.longitude]}>
              <Popup>
                <div className="w-32">
                  <img
                    src={thumbnailUrl(photo.id)}
                    alt={photo.filename}
                    className="w-full rounded"
                  />
                  <p className="text-xs mt-1 truncate">{photo.filename}</p>
                </div>
              </Popup>
            </Marker>
          )
        ))}
      </MapContainer>
    </div>
  );
}
