"use client";

import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import type { TravelPlace } from "@/lib/travel-places.api";

type Props = {
  mode: "vietnam" | "world";
  places: TravelPlace[];
  avatarUrl?: string;
};

function getMarkerIcon(avatarUrl?: string) {
  const safeAvatarUrl =
    avatarUrl ||
    "https://ui-avatars.com/api/?name=ChillTrip&background=00606c&color=fff";

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:38px;
        height:38px;
        border-radius:999px;
        overflow:hidden;
        border:3px solid white;
        box-shadow:0 8px 20px rgba(0,0,0,.25);
        background:#00606c;
      ">
        <img
          src="${safeAvatarUrl}"
          style="
            width:100%;
            height:100%;
            object-fit:cover;
            display:block;
          "
        />
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

export default function TravelLeafletMap({
  mode,
  places,
  avatarUrl,
}: Props) {
  const center: [number, number] =
    mode === "vietnam" ? [15.8, 108.0] : [20, 20];

  const zoom = mode === "vietnam" ? 5 : 2;

  const validPlaces = places.filter(
    (place) => place.latitude != null && place.longitude != null
  );

  const markerIcon = getMarkerIcon(avatarUrl);

  return (
    <div className="h-[520px] w-full">
      <MapContainer
        key={mode}
        center={center}
        zoom={zoom}
        minZoom={mode === "vietnam" ? 5 : 2}
        maxZoom={12}
        scrollWheelZoom
        zoomControl={false}
        className="h-full w-full"
      >
        <ZoomControl position="bottomright" />

        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {validPlaces.map((place) => (
          <Marker
            key={place.id}
            position={[Number(place.latitude), Number(place.longitude)]}
            icon={markerIcon}
          >
            <Popup>
              <div className="min-w-[160px]">
                <p className="font-bold text-slate-900">
                  {place.destinationName}
                </p>
                <p className="text-sm text-slate-600">
                  {[place.city, place.country].filter(Boolean).join(", ")}
                </p>
                <p className="mt-2 text-xs font-bold text-[#00606c]">
                  Đã hoàn thành
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}