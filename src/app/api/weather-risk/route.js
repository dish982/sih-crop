import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    let latitude = searchParams.get("lat");
    let longitude = searchParams.get("lng") || searchParams.get("lon");
    const location = searchParams.get("location");
    const crop = searchParams.get("crop") || "General";

    let cityName = location || "Your Location";

    // If no GPS coords given, geocode the district/state name (free, no key)
    if ((!latitude || !longitude) && location) {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
      );
      const geoData = await geoRes.json();
      if (geoData.results?.length > 0) {
        latitude = geoData.results[0].latitude;
        longitude = geoData.results[0].longitude;
        cityName = geoData.results[0].name;
      }
    }

    // Add this after you have latitude/longitude, before building the response
if (cityName === "Your Location") {
  try {
    const reverseGeoRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
      { headers: { "User-Agent": "SmartCropAdvisory/1.0" } } // Nominatim requires a User-Agent header
    );
    const reverseGeoData = await reverseGeoRes.json();
    cityName = reverseGeoData.address?.county || reverseGeoData.address?.state_district || reverseGeoData.address?.city || "Your Location";
  } catch {
    // silently keep "Your Location" if reverse geocoding fails — not worth failing the whole request over
  }
}

    // Final fallback so the route never hard-fails with no location at all
    if (!latitude || !longitude) {
      latitude = 19.9975; // Nashik, as a sane default
      longitude = 73.7898;
      cityName = "Nashik (default)";
    }

    // current_weather gives temp; hourly gives humidity + precipitation for the current hour
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current_weather=true&hourly=relativehumidity_2m,precipitation&timezone=auto`
    );
    const weatherData = await weatherRes.json();

    const temp = Math.round(weatherData.current_weather?.temperature ?? 25);
    const currentHourIndex = new Date().getHours();
    const humidity = weatherData.hourly?.relativehumidity_2m?.[currentHourIndex] ?? 50;
    const rain = weatherData.hourly?.precipitation?.[currentHourIndex] ?? 0;

    let riskLevel = "low";
    let riskMessage = `Weather conditions in ${cityName} are currently safe for standard ${crop} growth.`;
    let actionItem = "Maintain standard irrigation schedules and weekly visual inspections.";

    if (humidity >= 80 && temp >= 18 && temp <= 30 && rain > 0) {
      riskLevel = "high";
      riskMessage = `High humidity (${humidity}%), warm temperature (${temp}°C), and active rainfall in ${cityName} — conditions strongly favor fungal spore germination (Late Blight risk) for ${crop}.`;
      actionItem = "IPM Action: Apply bio-fungicides (Trichoderma viride) or copper oxychloride spray. Avoid overhead irrigation. Improve field drainage.";
    } else if (humidity >= 80 && temp >= 18 && temp <= 30) {
      riskLevel = "moderate";
      riskMessage = `High humidity (${humidity}%) and warm temperature (${temp}°C) in ${cityName}, no active rainfall yet — monitor closely, risk would escalate quickly if it rains.`;
      actionItem = "IPM Action: Inspect crops closely over the next 24-48 hours; prepare fungicide application if rain occurs.";
    } else if (humidity >= 65) {
      riskLevel = "moderate";
      riskMessage = `Moderate humidity (${humidity}%) in ${cityName}. Elevated vector risk for sucking pests (Thrips/Aphids) which spread viral diseases.`;
      actionItem = "IPM Action: Install yellow sticky traps and inspect leaf undersides twice weekly.";
    }

    return NextResponse.json({
      risk: {
        level: riskLevel,
        message: riskMessage,
        action: actionItem,
        temp,
        humidity,
        rain,
        locationName: cityName,
      },
    });
  } catch (error) {
    console.error("Weather Risk API Error (Open-Meteo):", error);
    return NextResponse.json(
      { risk: null, error: "Failed to compute weather risk" },
      { status: 500 }
    );
  }
}