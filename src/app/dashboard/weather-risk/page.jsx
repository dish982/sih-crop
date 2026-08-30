"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, ShieldCheck, Thermometer, Droplets, MapPin, PhoneCall } from "lucide-react";
import { getKVKByDistrict } from "@/data/kvkData";

export default function WeatherRiskPage() {
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Session fetch to get user's default district
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((userData) => {
        const district = userData?.user?.district || userData?.district || "Nashik";
        loadWeather(district);
      })
      .catch(() => loadWeather("Nashik"));
  }, []);

  const loadWeather = (fallbackDistrict) => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchRisk(`/api/weather-risk?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
        },
        () => {
          fetchRisk(`/api/weather-risk?location=${encodeURIComponent(fallbackDistrict)}`);
        },
        { timeout: 5000 }
      );
    } else {
      fetchRisk(`/api/weather-risk?location=${encodeURIComponent(fallbackDistrict)}`);
    }
  };

  const fetchRisk = (endpoint) => {
    fetch(endpoint)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch weather data from API");
        return res.json();
      })
      .then((data) => {
        if (data.risk) {
          setRisk(data.risk);
        } else {
          setError(data.error || "Invalid response format");
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  if (loading) {
    return (
      <div className="p-6 text-text-subtle animate-pulse space-y-4">
        <div className="h-6 bg-emerald-100 rounded w-1/4"></div>
        <div className="h-32 bg-emerald-50 rounded-2xl"></div>
      </div>
    );
  }

  if (error || !risk) {
    return (
      <div className="p-6 text-red-600 bg-red-50 rounded-xl border border-red-200">
        ⚠️ Unable to load environmental risk data: {error || "Response failed"}
      </div>
    );
  }

  const isHigh = risk.level === "high";
  const isModerate = risk.level === "moderate";

  // Lookup officer by detected location name
  const kvkOfficer = getKVKByDistrict(risk.locationName);


  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold text-text-main">Environmental Risk & Microclimate Advisory</h1>
        <p className="text-sm text-text-subtle mt-1 flex items-center gap-1.5 font-medium">
          <MapPin className="w-4 h-4 text-emerald-700" />
          Real-time weather monitoring for <span className="font-semibold text-text-main">{risk.locationName}</span>
        </p>
      </div>

      {/* Main Risk Alert Card */}
      <div
        className={`p-6 rounded-2xl border shadow-sm transition-all ${
          isHigh
            ? "bg-red-50 border-red-200 text-red-950"
            : isModerate
            ? "bg-amber-50 border-amber-200 text-amber-950"
            : "bg-emerald-50 border-emerald-200 text-emerald-950"
        }`}
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-white/80 shadow-xs mt-0.5">
            {isHigh ? (
              <AlertTriangle className="w-7 h-7 text-red-600" />
            ) : isModerate ? (
              <AlertTriangle className="w-7 h-7 text-amber-600" />
            ) : (
              <ShieldCheck className="w-7 h-7 text-emerald-600" />
            )}
          </div>
          <div className="space-y-2 flex-1">
            <h2 className="text-lg font-bold">
              {isHigh ? "High Disease Incubative Conditions" : isModerate ? "Moderate Microclimate Advisory" : "Safe Agronomic Conditions"}
            </h2>
            <p className="text-sm leading-relaxed">{risk.message}</p>
            
            {/* IPM Action Box */}
            <div className="mt-4 p-3.5 bg-white/90 rounded-xl border border-black/5 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-subtle block">
                Recommended Action (IPM)
              </span>
              <p className="text-text-main text-sm font-medium">{risk.action}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weather Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 bg-white border border-border-light rounded-2xl shadow-soft flex items-center justify-between">
          <div>
            <span className="text-xs text-text-subtle font-semibold uppercase tracking-wider">Relative Humidity</span>
            <p className="text-3xl font-bold mt-1 text-text-main">{risk.humidity}%</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Droplets className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-white border border-border-light rounded-2xl shadow-soft flex items-center justify-between">
          <div>
            <span className="text-xs text-text-subtle font-semibold uppercase tracking-wider">Ambient Temperature</span>
            <p className="text-3xl font-bold mt-1 text-text-main">{risk.temp}°C</p>
          </div>
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
            <Thermometer className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Helpline Support Card */}

      <div className="p-5 bg-surface-card border border-border-light rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-text-main">
            Unsure about crop symptoms in {risk.locationName}?
          </h3>
          <p className="text-xs text-text-subtle mt-0.5">
            Connect with {kvkOfficer.name} (KVK Extension Officer).
          </p>
        </div>
        
        {/* Mobile tel: link trigger */}
        <a
          href={`tel:${kvkOfficer.phone}`}
          className="flex items-center gap-2 py-2.5 px-4 bg-primary-green text-white text-xs font-semibold rounded-xl shadow-xs hover:bg-emerald-800 transition-all cursor-pointer"
        >
          <PhoneCall className="w-4 h-4" />
          Call KVK ({kvkOfficer.phone})
        </a>
      </div>
    </div>
  );
}