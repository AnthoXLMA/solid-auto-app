import React from "react";
import { Box, Typography, Button, List, ListItem, ListItemText } from "@mui/material";

export default function NearbyHelpers({ reports = [], solidaires = [] }) {
  // Fonction simple pour calculer la distance approximative en km
  const distanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Pour chaque panne, on récupère les solidaires à moins de 2 km
  const getNearbyHelpers = (report) => {
    return solidaires.filter(
      (s) => distanceKm(report.latitude, report.longitude, s.latitude, s.longitude) <= 2
    );
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6">Automobilistes solidaires proches</Typography>
      {reports.map((report, i) => {
        const nearby = getNearbyHelpers(report);
        return (
          <Box key={i} sx={{ mb: 2, border: "1px solid #ccc", p: 1, borderRadius: 1 }}>
            <Typography variant="subtitle1">
              Panne : {report.message} (Signalée par {report.user})
            </Typography>
            {nearby.length === 0 ? (
              <Typography variant="body2">Aucun solidaire à proximité</Typography>
            ) : (
              <List dense>
                {nearby.map((s, j) => (
                  <ListItem key={j} secondaryAction={
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => alert(`Contact envoyé à ${s.name}`)}
                    >
                      Contacter
                    </Button>
                  }>
                    <ListItemText
                      primary={s.name}
                      secondary={`Matériel disponible: ${s.material}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
