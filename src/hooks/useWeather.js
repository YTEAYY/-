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
  const toHour = (time, index) => {
    const temp = data.hourly.temperature_2m[startIndex + index];
    const humidity = data.hourly.relative_humidity_2m[startIndex + index];
    const wind = data.hourly.wind_speed_10m[startIndex + index];
    return {
      hour: Number(time.slice(11, 13)),
      temp,
      pop: data.hourly.precipitation_probability[startIndex + index],
      humidity,
      wind,
      feels: feelsLike(temp, humidity, wind),
      weatherCode: data.hourly.weather_code[startIndex + index],
    };
  };
  const hourly = data.hourly.time.slice(startIndex, nextDayIndex + 1).map(toHour);
  const tomorrowHourly = data.hourly.time.slice(nextDayIndex, nextDayIndex + 24).map((time, index) => {
    const temp = data.hourly.temperature_2m[nextDayIndex + index];
    const humidity = data.hourly.relative_humidity_2m[nextDayIndex + index];
    const wind = data.hourly.wind_speed_10m[nextDayIndex + index];
    return {
      hour: Number(time.slice(11, 13)),
      temp,
      pop: data.hourly.precipitation_probability[nextDayIndex + index],
      humidity,
      wind,
      feels: feelsLike(temp, humidity, wind),
      weatherCode: data.hourly.weather_code[nextDayIndex + index],
    };
  });
  return { hourly, tomorrowHourly };
}

export function useWeather(fallbackLocation) {
  const [weather, setWeather] = useState(INITIAL_WEATHER);
  const [locationNotice, setLocationNotice] = useState("");
  const [hourRange, setHourRange] = useState(8);
  const [selectedHour, setSelectedHour] = useState(0);
  const [showTomorrow, setShowTomorrow] = useState(false);
  const requestRef = useRef(0);

  const fetchAll = useCallback((latitude, longitude, place, isGeo) => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLocationNotice(isGeo ? "현재 위치 날씨를 불러오고 있어요." : "");
    setWeather((current) => ({ ...current, status: "loading" }));

    const weatherPromise = fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&hourly=precipitation_probability,temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min&wind_speed_unit=ms&timezone=auto&forecast_days=2`
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
        const nowDate = current.time.slice(0, 10);
        const nowHour = Number(current.time.slice(11, 13));
        const index = data.hourly.time.findIndex((time) => time.slice(0, 10) === nowDate && Number(time.slice(11, 13)) === nowHour);
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
        if (isGeo) setLocationNotice("");
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
      setLocationNotice("이 브라우저에서는 위치를 사용할 수 없어 서울 날씨를 표시 중이에요. 지역 검색으로 원하는 곳을 선택할 수 있어요.");
      return;
    }
    setLocationNotice("현재 위치를 확인하고 있어요.");
    setWeather({ ...INITIAL_WEATHER, place: "위치 확인 중" });
    navigator.geolocation.getCurrentPosition(
      (position) => fetchAll(position.coords.latitude, position.coords.longitude, "현재 위치", true),
      (error) => {
        fetchAll(fallbackLocation.lat, fallbackLocation.lon, fallbackLocation.name, false);
        const reason = error.code === 1
          ? "위치 권한이 없어"
          : "현재 위치를 확인하지 못해";
        setLocationNotice(`${reason} 서울 날씨를 표시 중이에요. 지역 검색으로 원하는 곳을 선택하거나 브라우저의 위치 권한을 확인해주세요.`);
      },
      { timeout: 15000, maximumAge: 5 * 60 * 1000, enableHighAccuracy: false }
    );
  }, [fallbackLocation, fetchAll]);

  useEffect(() => {
    fetchAll(fallbackLocation.lat, fallbackLocation.lon, fallbackLocation.name, false);
    setLocationNotice("서울 날씨를 표시 중이에요. 현재 위치를 사용하려면 위치 버튼을 눌러주세요.");
  }, [fallbackLocation, fetchAll]);

  return {
    weather,
    locationNotice,
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
