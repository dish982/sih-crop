'use client';

import { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, Loader2, Image as ImageIcon, ShieldCheck, CloudRain } from 'lucide-react';
import { DISEASE_KNOWLEDGE_BASE } from '@/data/diseaseData';

export default function DiseaseDetect() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [weather, setWeather] = useState(null);
  const [farmer, setFarmer] = useState(null);

  const handleReset = () => {
  setFile(null);
  setPreview(null);
  setResult(null);
  setWeather(null);
  setError(null);
};

  // Fetch farmer info once, on page load — needed to know their location for weather
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(res => res.json())
      .then(data => setFarmer(data.user || data))
      .catch(() => setFarmer(null));
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResult(null);
      setWeather(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      // 1. Get the disease diagnosis
      const response = await fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to process image with ML service");
      const data = await response.json();
      setResult(data);

      // 2. Immediately also fetch weather risk for the same farmer/location

      let weatherUrl = "/api/weather-risk?location=Nashik"; // fallback
      if (farmer?.gpsLat && farmer?.gpsLng) {
        weatherUrl = `/api/weather-risk?lat=${farmer.gpsLat}&lng=${farmer.gpsLng}`;
      } else if (farmer?.district) {
        weatherUrl = `/api/weather-risk?location=${encodeURIComponent(farmer.district)}`;
      }

      const weatherRes = await fetch(weatherUrl);
      const weatherData = await weatherRes.json();
      setWeather(weatherData);

    } catch (err) {
      setError(err.message || "Something went wrong while detecting disease.");
    } finally {
      setLoading(false);
    }
  };

  const detectedClass = result?.prediction || result?.class || "";
  const info = DISEASE_KNOWLEDGE_BASE[detectedClass] || {
    severity: "Unknown",
    symptoms: ["Visual anomaly detected on foliage surface"],
    treatmentCategory: "General Plant Healthcare Advisory",
    purpose: "Monitor crop condition and consult local agricultural officer.",
    precautions: ["Isolate affected crop area", "Avoid excess moisture"]
  };

  const confidence = result?.confidence || 0;
  const isHighConfidence = confidence >= 70;
  const isModerateConfidence = confidence >= 40 && confidence < 70;

  // THE ACTUAL COMBINATION LOGIC — this is what makes it "unified" rather
  // than two separate cards sitting next to each other by coincidence.
  const isWeatherHighRisk = weather?.risk?.level === "high";
  const combinedAlert =
    result && isHighConfidence && isWeatherHighRisk
      ? `${detectedClass.replace(/___/g, ': ').replace(/_/g, ' ')} confirmed AND current weather conditions favor disease spread — treat immediately and monitor neighboring plants closely.`
      : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold text-primary-green">Crop Disease Detection</h1>
        <p className="text-sm text-text-subtle">
          Upload a clear leaf photograph to diagnose conditions and receive actionable treatment guidance,
          combined with current weather risk for your location.
        </p>
      </div>

      {/* Combined high-priority alert — only shows when BOTH signals agree */}
      {combinedAlert && (
        <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-900 text-sm">Combined Risk Alert</p>
            <p className="text-red-800 text-sm mt-1">{combinedAlert}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Card */}
        <div className="bg-surface-card border border-border-light rounded-xl p-6 shadow-soft space-y-4">
          <h2 className="font-semibold text-lg text-text-main flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-primary-green" />
            Upload Leaf Image
          </h2>

          <label className="border-2 border-dashed border-border-light hover:border-primary-green rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all bg-surface-muted/50 min-h-[220px]">
            {preview ? (
              <img src={preview} alt="Leaf preview" className="max-h-52 rounded-lg object-contain" />
            ) : (
              <div className="text-center space-y-2">
                <div className="p-3 bg-surface-card rounded-full inline-block shadow-soft">
                  <ImageIcon className="w-8 h-8 text-primary-green" />
                </div>
                <p className="text-sm font-medium text-text-main">Click to upload or drag & drop</p>
                <p className="text-xs text-text-subtle">PNG, JPG, or JPEG (Max 10MB)</p>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full bg-primary-green hover:bg-opacity-90 text-white font-medium py-2.5 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing Leaf &amp; Checking Weather...
              </>
            ) : (
              "Diagnose Crop"
            )}
          </button>

          {result && (
            <button
              onClick={handleReset}
              className="text-xs text-text-subtle hover:text-primary-green underline"
            >
              ↻ Retake / Diagnose another leaf
            </button>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-accent-cherry border border-red-200 rounded-lg text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Results Card */}
        <div className="bg-surface-card border border-border-light rounded-xl p-6 shadow-soft">
          <h2 className="font-semibold text-lg text-text-main mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary-green" />
            Diagnosis Report
          </h2>

          {result ? (
            <div className="space-y-4">
              <div className="p-4 bg-surface-muted rounded-xl border border-border-light">
                <p className="text-xs text-text-subtle uppercase tracking-wider font-semibold">Detected Condition</p>
                <p className="text-xl font-bold text-primary-green mt-1">
                  {detectedClass.replace(/___/g, ': ').replace(/_/g, ' ') || "No prediction available"}
                </p>
              </div>

              <div className="p-4 bg-surface-muted rounded-xl border border-border-light">
                <p className="text-xs text-text-subtle uppercase tracking-wider font-semibold">Confidence Score</p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex-1 bg-border-light h-3 rounded-full overflow-hidden">
                    <div className="bg-primary-green h-full transition-all duration-500" style={{ width: `${confidence}%` }}></div>
                  </div>
                  <span className="text-sm font-bold text-text-main">{confidence}%</span>
                </div>
              </div>

              {/* Weather context, shown right alongside the diagnosis — the actual "unification" */}
              {weather?.risk && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                  isWeatherHighRisk ? "bg-red-50 border-red-200" : weather.risk.level === "moderate" ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"
                }`}>
                  <CloudRain className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold">Current Weather Risk: {weather.risk.level}</p>
                    <p className="text-xs mt-1">{weather.risk.message}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-48 border border-dashed border-border-light rounded-xl flex items-center justify-center text-center p-4 text-text-subtle text-sm">
              Upload an image and click "Diagnose Crop" to view diagnosis details.
            </div>
          )}
        </div>
      </div>

      {/* Treatment guidance — confidence-gated, explained below */}
      {result && (
        <div className="bg-surface-card border border-border-light rounded-xl p-6 shadow-soft space-y-4">
          <h3 className="font-bold text-lg text-text-main">What should you do?</h3>

          {isHighConfidence ? (
            <div className="space-y-3">
              <div className="p-4 bg-primary-green/10 border border-primary-green/20 rounded-xl">
                <p className="text-xs uppercase text-primary-green font-bold tracking-wider">Treatment Category</p>
                <p className="text-md font-bold text-primary-green mt-0.5">{info.treatmentCategory}</p>
              </div>
              <ul className="space-y-2">
                {info.precautions.map((prec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-text-subtle">
                    <ShieldCheck className="w-4 h-4 text-primary-green flex-shrink-0 mt-0.5" />
                    <span>{prec}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : isModerateConfidence ? (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-1">
              <p className="font-bold">Moderate Confidence ({confidence}%)</p>
              <p>Treatment shown as a possibility, not certainty — consider a second, clearer photo, or confirm with a local extension officer before applying any chemical treatment.</p>
              <p className="mt-2 font-semibold">Possible treatment: {info.treatmentCategory}</p>
            </div>
          ) : (
            <div className="p-4 bg-red-50 border border-red-200 text-red-900 rounded-xl text-xs space-y-2">
              <p className="font-bold">Low Confidence ({confidence}%) — Treatment Suppressed</p>
              <p>We cannot reliably diagnose this image. Applying treatment based on an uncertain result risks wrong or excessive pesticide use.</p>
              <p className="font-semibold pt-1">Recommended next step: retake the photo in better lighting, focusing on a single affected leaf, or contact your local Krishi Vigyan Kendra (KVK) for an in-person assessment.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}