import React, { useState } from "react";
import MapView from "./MapView";
import ReportForm from "./ReportForm";

export default function App() {
  const [currentPosition, setCurrentPosition] = useState([43.4923, -1.4746]);
  const [reports, setReports] = useState([]);

  const handleNewReport = (report) => {
    console.log("Report reçu:", report);
    setReports([...reports, report]);
  };

  return (
    <div className="App" style={{ maxWidth: 600, margin: "auto", padding: 20 }}>
      <h1>Solid Auto</h1>
      <MapView reports={reports} onPositionChange={setCurrentPosition} />
      <ReportForm onSubmit={handleNewReport} position={currentPosition} />
      {/* Tu peux aussi afficher la liste des reports ici si tu veux */}
    </div>
  );
}




