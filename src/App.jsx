import React, { useState } from "react";
import { Container, Typography, Box, Button, TextField, MenuItem, Paper } from "@mui/material";
import MapView from "./MapView";
import ReportForm from "./ReportForm";
import ReportList from "./ReportList";

export default function App() {
  const [reports, setReports] = useState([]);

  const handleNewReport = (report) => {
    setReports([...reports, report]);
  };

  return (
    <Container maxWidth="md" sx={{ pt: 3 }}>
      <Typography variant="h4" gutterBottom color="primary">
        Solid Auto
      </Typography>
      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <ReportForm onSubmit={handleNewReport} />
      </Paper>

      <Box sx={{ height: 400, mb: 3 }}>
        <MapView reports={reports} />
      </Box>

      <Paper elevation={3} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Pannes signalées
        </Typography>
        <ReportList reports={reports} />
      </Paper>
    </Container>
  );
}
