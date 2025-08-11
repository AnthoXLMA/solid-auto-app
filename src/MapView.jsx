// MapView.js
import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function MapView({ onPositionChange }) {
  const defaultPosition = [43.4923, -1.4746];
  const [position, setPosition] = useState(defaultPosition);
  const [hasLocation, setHasLocation] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = [pos.coords.latitude, pos.coords.longitude];
        setPosition(newPos);
        setHasLocation(true);
        if (onPositionChange) onPositionChange(newPos);
      },
      () => {
        alert("Impossible d'obtenir votre position, localisation par défaut activée");
        if (onPositionChange) onPositionChange(defaultPosition);
      }
    );
  }, [onPositionChange]);

  return (
    <MapContainer
      center={position}
      zoom={13}
      scrollWheelZoom={true}
      style={{ height: "400px", width: "100%" }}
      className="leaflet-container"
    >
      <TileLayer
        attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position}>
        <Popup>{hasLocation ? "Vous êtes ici" : "Position par défaut : Bayonne"}</Popup>
      </Marker>
    </MapContainer>
  );
}
