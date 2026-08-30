"use client";
import { useEffect, useState } from "react";

export default function WeatherRiskBanner({ lat, lng }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!lat || !lng) return;
    fetch(`/api/weather-risk?lat=${lat}&lng=${lng}`)
      .then(r => r.json())
      .then(setData);
  }, [lat, lng]);

  if (!data?.risk) return null;

  const isHigh = data.risk.level === "high";

  return (
    <div className={`card ${isHigh ? "badge-danger" : "badge-warning"}`} style={{ marginBottom: "16px" }}>
      <p style={{ margin: 0, fontWeight: 600 }}>
        {isHigh ? "⚠ High Risk" : "Moderate Risk"}
      </p>
      <p style={{ margin: "4px 0 0", fontSize: "14px" }}>{data.risk.message}</p>
    </div>
  );
}