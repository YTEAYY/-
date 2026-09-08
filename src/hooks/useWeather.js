import { useCallback, useEffect, useRef, useState } from "react";
import { reverseGeocode } from "../lib/locationApi";

const INITIAL_WEATHER = { status: "loading", place: "SEOUL", timezone: "Asia/Seoul" };

function feelsLike(temp, humidity, wind) {
  let value = temp;
  if (temp >= 24 && humidity >= 65) value += Math.min(3, (humidity - 65) / 10);
  if (temp <= 15 && wind >= 3) value -= Math.min(5, (wind - 3) * 0.6);
  return value;
}

function parseHourly(data, startIndex) {
  const tomorrowStartIndex = data.hourly.time.findIndex(
    (time, index) => index > startIndex && time.slice(0, 10) !== data.hourly.time[startIndex].slice(0, 10)
  );
  const nextDayIndex = tomorrowStartIndex >= 0 ? tomorrowStartIndex : data.hourly.time.length;
  const toHour = (time, index) => ({
    hour: Number(time.slice(11, 13)),
    temp: data.hourly.temperature_2m[startIndex + index],
    pop: data.hourly.precipitation_probability[startIndex + index],
  });
  const hourly = data.hourly.time.slice(startIndex, nextDayIndex + 1).map(toHour);
  const tomorrowHourly = data.hourly.time.slice(nextDayIndex, nextDayIndex + 24).map((time, index) => ({
    hour: Number(time.slice(11, 13)),
    temp: data.hourly.temperature_2m[nextDayIndex + index],
    pop: data.hourly.precipitation_probability[nextDayIndex + index],
  }));
  return { hourly, tomorrowHourly };
}

export function useWeather(fallbackLocation) {
  const [weather, setWeather] = useState(INITIAL_WEATHER);
  const [hourRange, setHourRange] = useState(8);
  const [selectedHour, setSelectedHour] = useState(0);
  const [showTomorrow, setShowTomorrow] = useState(false);
  const requestRef = useRef(0);

  const fetchAll = useCallback((latitude, longitude, place, isGeo) => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setWeather((current) => ({ ...current, status: "loading" }));

    const weatherPromise = fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&hourly=precipitation_probability,temperature_2m&daily=temperature_2m_max,temperature_2m_min&wind_speed_unit=ms&timezone=auto&forecast_days=2`
    ).then((response) => {
      if (!response.ok) throw new Error("날씨 API 오류");
      return response.json();
    });
    const airPromise = fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=pm10,pm2_5&timezone=auto&forecast_days=1`
    ).then((response) => (response.ok ? response.json() : null)).catch(() => null);
    const placePromise = isGeo ? reverseGeocode(latitude, longitude) : Promise.resolve(place);

    Promise.all([weatherPromise, airPromise, placePromise])
      .then(([data, air, resolvedPlace]) => {
        if (requestId !== requestRef.current) return;
        const current = data.current;
        const nowHour = Number(current.time.slice(11, 13));
        const index = data.hourly.time.findIndex((time) => Number(time.slice(11, 13)) === nowHour);
        const startIndex = index >= 0 ? index : 0;
        const { hourly, tomorrowHourly } = parseHourly(data, startIndex);
        const temp = current.temperature_2m;
        const humidity = current.relative_humidity_2m;
        const wind = current.wind_speed_10m;

        setWeather({
          status: "ok",
          temp,
          feels: feelsLike(temp, humidity, wind),
          pop: data.hourly.precipitation_probability[startIndex],
          humidity,
          wind,
          weatherCode: current.weather_code,
          pm10: air?.current?.pm10 ?? null,
          pm25: air?.current?.pm2_5 ?? null,
          hourly,
          tomorrowHourly,
          todayMin: data.daily?.temperature_2m_min?.[0] ?? null,
          todayMax: data.daily?.temperature_2m_max?.[0] ?? null,
          tomorrowMin: data.daily?.temperature_2m_min?.[1] ?? null,
          tomorrowMax: data.daily?.temperature_2m_max?.[1] ?? null,
          place: resolvedPlace,
          timezone: data.timezone || "UTC",
          timezoneAbbreviation: data.timezone_abbreviation || "",
        });
        setHourRange(8);
        setSelectedHour(0);
        setShowTomorrow(false);
      })
      .catch(() => {
        if (requestId === requestRef.current) setWeather((current) => ({ ...current, status: "error", place }));
      });
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      fetchAll(fallbackLocation.lat, fallbackLocation.lon, fallbackLocation.name, false);
      return;
    }
    setWeather({ ...INITIAL_WEATHER, place: "위치 확인 중" });
    navigator.geolocation.getCurrentPosition(
      (position) => fetchAll(position.coords.latitude, position.coords.longitude, "현재 위치", true),
      () => fetchAll(fallbackLocation.lat, fallbackLocation.lon, fallbackLocation.name, false),
      { timeout: 15000, maximumAge: 5 * 60 * 1000, enableHighAccuracy: false }
    );
  }, [fallbackLocation, fetchAll]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return {
    weather,
    setWeather,
    fetchAll,
    requestLocation,
    hourRange,
    setHourRange,
    selectedHour,
    setSelectedHour,
    showTomorrow,
    setShowTomorrow,
  };
}
