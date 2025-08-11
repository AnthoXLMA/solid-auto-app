export default function ReportList({ reports }) {
  if (reports.length === 0) return <p>Aucune panne signalée.</p>;

  return (
    <ul>
      {reports.map((r, i) => (
        <li key={i} style={{ marginBottom: 10 }}>
          <strong>{r.nature}</strong> — {r.message} <br />
          <em>Status: {r.status}</em> <br />
          <small>{r.address}</small>
        </li>
      ))}
    </ul>
  );
}
