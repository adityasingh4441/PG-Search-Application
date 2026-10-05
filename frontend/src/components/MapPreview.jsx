import { APIProvider, AdvancedMarker, Map as GoogleMapCanvas } from '@vis.gl/react-google-maps';
import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function validListings(items) {
  return items.filter((item) => item.location?.coordinates?.length === 2);
}

function GoogleMap({ items, center, onSelect }) {
  return (
    <APIProvider apiKey={googleMapsKey}>
      <GoogleMapCanvas
        className="map-canvas"
        defaultCenter={center}
        defaultZoom={13}
        mapId="DEMO_MAP_ID"
        gestureHandling="cooperative"
        fullscreenControl={false}
        streetViewControl={false}
        mapTypeControl={false}
      >
        {items.map((item) => {
          const [lng, lat] = item.location.coordinates;
          return (
            <AdvancedMarker
              key={item._id}
              position={{ lat, lng }}
              title={`${item.name} · ₹${item.rent}/month`}
              onClick={() => onSelect(item)}
            >
              <span className="map-marker"><span /></span>
            </AdvancedMarker>
          );
        })}
      </GoogleMapCanvas>
    </APIProvider>
  );
}

export default function MapPreview({ items, center, onSelect }) {
  const listings = validListings(items);
  const leafletCenter = [center.lat, center.lng];

  return (
    <div className="map-frame">
      {googleMapsKey ? (
        <GoogleMap items={listings} center={center} onSelect={onSelect} />
      ) : (
        <MapContainer className="map-canvas" center={leafletCenter} zoom={13} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {listings.map((item) => {
            const [lng, lat] = item.location.coordinates;
            return (
              <CircleMarker
                key={item._id}
                center={[lat, lng]}
                radius={9}
                pathOptions={{ color: '#fff', weight: 3, fillColor: '#d96850', fillOpacity: 1 }}
                eventHandlers={{ click: () => onSelect(item) }}
              />
            );
          })}
        </MapContainer>
      )}
      {!listings.length && <div className="map-empty">Listing locations will appear here.</div>}
      <span className="map-credit">{googleMapsKey ? 'Google Maps' : 'OpenStreetMap'}</span>
    </div>
  );
}
