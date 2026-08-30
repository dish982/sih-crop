"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

function WeatherRiskBanner({ lat, lng, state, district }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let queryParams = "";
    if (lat && lng) {
      queryParams = `lat=${lat}&lng=${lng}`;
    } else if (district || state) {
      queryParams = `location=${encodeURIComponent(district || state)}`;
    } else {
      setLoading(false);
      return;
    }

    fetch(`/api/weather-risk?${queryParams}`)
      .then((r) => r.json())
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [lat, lng, state, district]);

  if (loading) {
    return (
      <div className="p-4 rounded-xl bg-surface-muted animate-pulse text-sm text-text-subtle mb-4">
        Checking local weather risk advisory...
      </div>
    );
  }

  if (!data?.risk || data.risk.level === "low") return null;

  const isHigh = data.risk.level === "high";

  return (
    <div
      className={`p-4 rounded-xl border mb-6 transition-colors ${
        isHigh
          ? "bg-red-50 border-red-200 text-red-900"
          : "bg-amber-50 border-amber-200 text-amber-900"
      }`}
    >
      <div className="flex items-center gap-2 font-semibold">
        <span>{isHigh ? "⚠️ High Disease Risk Warning" : "⚡ Moderate Risk Advisory"}</span>
      </div>
      <p className="mt-1 text-sm">{data.risk.message}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [farmer, setFarmer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    // Fetch user info from /api/auth/me
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch session");
        const data = await res.json();
        setFarmer(data.user || data);
      })
      .catch((err) => {
        console.error("Session error:", err);
        setFarmer(null);
      })
      .finally(() => setLoading(false));

    // Fetch browser location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn("GPS access denied or unavailable:", error.message);
        },
        { timeout: 8000 }
      );
    }
  }, []);

  if (loading) return <div className="text-text-subtle p-4">Loading dashboard...</div>;
  if (!farmer) return <div className="text-red-500 p-4">Please log in to continue.</div>;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-light pb-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main">
            Welcome back, {farmer.name} 👋
          </h1>
          <p className="text-sm text-text-subtle">
            Here is your daily crop health overview
          </p>
        </div>
        {(farmer.district || farmer.state) && (
          <span className="self-start sm:self-auto text-xs font-medium bg-surface-muted text-text-subtle px-3 py-1.5 rounded-full border border-border-light">
            📍 {farmer.district}{farmer.district && farmer.state ? ", " : ""}{farmer.state}
          </span>
        )}
      </div>

      {/* Weather Risk Banner */}
      <WeatherRiskBanner
        lat={coords?.lat}
        lng={coords?.lng}
        state={farmer.state}
        district={farmer.district}
      />

      {/* Quick Access Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          href="/dashboard/disease-detect"
          className="bg-surface-card p-5 border border-border-light rounded-xl shadow-soft hover:border-primary-green transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl mb-3">
            🔬
          </div>
          <h3 className="font-bold text-lg text-text-main group-hover:text-primary-green">
            Disease Detection
          </h3>
          <p className="text-xs text-text-subtle mt-1">
            Upload leaf photos to get instant AI diagnostic report & treatment steps.
          </p>
        </Link>

        
      </div>
    </div>
  );
}