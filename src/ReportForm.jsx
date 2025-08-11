import React, { useState } from "react";

export default function ReportForm({ onSubmit }) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("en-attente");
  const [nature, setNature] = useState("voiture-ne-demarre-pas");
  const [address, setAddress] = useState("");
  const [useGeolocation, setUseGeolocation] = useState(false);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [coords, setCoords] = useState(null); // {latitude, longitude}

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur");
      return;
    }
    setLoadingGeo(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          if (data && data.display_name) {
            setAddress(data.display_name);
            setCoords({ latitude, longitude }); // Stocke la position GPS
            setUseGeolocation(true);
          } else {
            alert("Impossible de récupérer l'adresse à partir de la position");
          }
        } catch (err) {
          alert("Erreur lors de la récupération de l'adresse");
        }
        setLoadingGeo(false);
      },
      () => {
        alert("Impossible d'obtenir votre position");
        setLoadingGeo(false);
      }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!address) {
      alert("Merci de renseigner une adresse ou d'utiliser la géolocalisation");
      return;
    }
    if (!coords) {
      alert("Les coordonnées GPS de la panne sont manquantes. Veuillez utiliser la géolocalisation.");
      return;
    }
    onSubmit({
      message,
      status,
      nature,
      address,
      latitude: coords.latitude,
      longitude: coords.longitude,
    });

    // Reset form après envoi si tu veux
    setMessage("");
    setStatus("en-attente");
    setNature("voiture-ne-demarre-pas");
    setAddress("");
    setUseGeolocation(false);
    setCoords(null);
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: "auto" }}>
      <div>
        <label>Message :</label>
        <br />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Décrivez votre panne"
          required
          rows={3}
          style={{ width: "100%" }}
        />
      </div>

      <div>
        <label>Statut :</label>
        <br />
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "100%" }}>
          <option value="en-attente">En attente</option>
          <option value="en-cours">En cours</option>
          <option value="termine">Terminé</option>
        </select>
      </div>

      <div>
        <label>Nature :</label>
        <br />
        <select value={nature} onChange={(e) => setNature(e.target.value)} style={{ width: "100%" }}>
          <option value="voiture-ne-demarre-pas">Voiture ne démarre pas</option>
          <option value="besoin-pince">Besoin de pinces</option>
          <option value="besoin-assistance">Besoin d'assistance</option>
          <option value="autre">Autre</option>
        </select>
      </div>

      <div>
        <label>Adresse :</label>
        <br />
        <input
          type="text"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            setUseGeolocation(false);
            setCoords(null); // Reset coords si l'adresse change manuellement
          }}
          placeholder="Lieu de la panne"
          required={!useGeolocation}
          disabled={useGeolocation}
          style={{ width: "calc(100% - 120px)", marginRight: 10 }}
        />
        <button type="button" onClick={handleGeolocate} disabled={loadingGeo} style={{ width: 100 }}>
          {loadingGeo ? "Géolocalisation..." : "Utiliser ma position"}
        </button>
        {useGeolocation && <small style={{ display: "block", marginTop: 5 }}>Adresse récupérée automatiquement</small>}
      </div>

      <button type="submit" style={{ marginTop: 20, width: "100%" }}>
        Signaler la panne
      </button>
    </form>
  );
}
