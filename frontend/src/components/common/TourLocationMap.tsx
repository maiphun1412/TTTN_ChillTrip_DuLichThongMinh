"use client";

import "leaflet/dist/leaflet.css";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";

type TourLocationMapProps = {
  lat: number;
  lng: number;
  title: string;
};

const markerIcon = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function TourLocationMap({
  lat,
  lng,
  title,
}: TourLocationMapProps) {
  return (
    <div className="h-96 w-full overflow-hidden rounded-[20px] shadow-sm">
      <MapContainer
        center={[lat, lng]}
        zoom={13}
        scrollWheelZoom={false}
        className="z-0 h-full w-full"
      >
     <TileLayer
  attribution='&copy; OpenStreetMap &copy; CARTO'
  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
/>

        <Marker position={[lat, lng]} icon={markerIcon}>
          <Popup>{title}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}