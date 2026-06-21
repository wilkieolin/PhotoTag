import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngBounds } from 'leaflet';
import { searchMapBounds } from '../../api/search';
import { thumbnailUrl } from '../../api/photos';
import { usePhoto } from '../../hooks/usePhotos';
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
  const map = useMapEvents({
    moveend: (e) => onBoundsChange(e.target.getBounds()),
    zoomend: (e) => onBoundsChange(e.target.getBounds()),
  });

  // Fetch markers for the initial view too, not just after the first pan/zoom.
  useEffect(() => {
    onBoundsChange(map.getBounds());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function RecenterOnPhoto({ photo }: { photo: Photo }) {
  const map = useMap();
  useEffect(() => {
    if (photo.latitude != null && photo.longitude != null) {
      map.setView([photo.latitude, photo.longitude], 15);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo.id]);
  return null;
}

interface Props {
  highlightPhotoId?: number | null;
}

export default function MapView({ highlightPhotoId = null }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const navigate = useNavigate();
  const markerRefs = useRef<Record<number, L.Marker>>({});
  const { data: highlightPhoto } = usePhoto(highlightPhotoId);

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

  // Once the highlighted photo's marker is on screen, pop it open automatically.
  useEffect(() => {
    if (highlightPhotoId == null) return;
    if (!photos.some((p) => p.id === highlightPhotoId)) return;
    markerRefs.current[highlightPhotoId]?.openPopup();
  }, [highlightPhotoId, photos]);

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
        {highlightPhoto && <RecenterOnPhoto photo={highlightPhoto} />}
        {photos.map((photo) => (
          photo.latitude != null && photo.longitude != null && (
            <Marker
              key={photo.id}
              position={[photo.latitude, photo.longitude]}
              ref={(ref) => {
                if (ref) markerRefs.current[photo.id] = ref;
                else delete markerRefs.current[photo.id];
              }}
            >
              <Popup>
                <div className="w-32">
                  <img
                    src={thumbnailUrl(photo.id)}
                    alt={photo.filename}
                    className="w-full rounded"
                  />
                  <p className="text-xs mt-1 truncate">{photo.filename}</p>
                  <button
                    onClick={() => navigate(`/photos?selected=${photo.id}`)}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1 underline"
                  >
                    View details
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        ))}
      </MapContainer>
    </div>
  );
}
