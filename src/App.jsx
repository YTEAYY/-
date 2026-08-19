import { useState, useEffect, useCallback, useRef } from "react";

/* ============================================================
   디자인 토큰 (업로드된 App.jsx / index.css 기준)
   ============================================================ */
const TOKENS = {
  bg: "#0c0c0c",
  bgRaised: "#141311",
  fg: "#f0ede6",
  fgDim: "#6e6b64",
  fgMid: "#a09c94",
  accent: "#d4ff50",
  rule: "rgba(240,237,230,0.12)",
  fontDisplay: "'Barlow Condensed', sans-serif",
  fontBody: "'Instrument Sans', sans-serif",
};

const SEOUL = { lat: 37.5665, lon: 126.978, name: "SEOUL" };
const STORAGE_KEY = "ootd-records-v1";

const WEEK_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// 색 대신 기호로 구분 — 팔레트를 늘리지 않고 편집 디자인의 픽토그램 언어를 그대로 따름
const FEELINGS = {
  hot: { label: "더웠음", symbol: "▲" },
  normal: { label: "적당함", symbol: "—" },
  cold: { label: "추웠음", symbol: "▼" },
};

function pad(n) {
  return String(n).padStart(2, "0");
}
function fmtDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function feelsLike(temp, humidity, wind) {
  let f = temp;
  if (temp >= 24 && humidity >= 65) f += Math.min(3, (humidity - 65) / 10);
  if (temp <= 15 && wind >= 3) f -= Math.min(5, (wind - 3) * 0.6);
  return f;
}

const BAND_META = {
  boiling: { eng: "SCORCHING", headline: "찜통 더위, 최대한 가볍게", desc: "가볍게 입어야 하는 무더운 하루" },
  hot: { eng: "WARM", headline: "여름 옷차림이면 충분해요", desc: "화창하고 더운 하루" },
  warm: { eng: "MILD", headline: "활동하기 좋은 선선한 날씨", desc: "가볍게 걸치기 좋은 하루" },
  mild: { eng: "BRISK", headline: "쌀쌀하니 한 겹 더 챙기세요", desc: "겉옷 하나면 딱 좋은 하루" },
  cool: { eng: "COLD", headline: "쌀쌀해요, 아우터는 필수", desc: "아우터 없이는 쌀쌀한 하루" },
  cold: { eng: "FREEZING", headline: "춥습니다, 든든하게 챙기세요", desc: "든든히 챙겨입어야 하는 추운 하루" },
};

const CATEGORY_LABEL = { top: "상의", bottom: "하의", outer: "아우터", shoes: "신발", acc: "액세서리" };
const CATEGORY_ORDER = ["top", "bottom", "outer", "shoes", "acc"];

const OUTFIT_BASE = {
  boiling: { top: "린넨/메시 반팔티", bottom: "린넨 반바지 또는 얇은 슬랙스", outer: "겉옷 없이", shoes: "통풍 잘 되는 스니커즈 또는 샌들", acc: "선글라스, 미니 크로스백" },
  hot: { top: "반팔 티셔츠", bottom: "면 반바지 또는 얇은 데님", outer: "겉옷 없이 (실내 냉방 대비용 얇은 셔츠 하나)", shoes: "캔버스 스니커즈", acc: "캡모자" },
  warm: { top: "얇은 셔츠 또는 반팔 맨투맨", bottom: "치노팬츠 또는 데님", outer: "가벼운 가디건", shoes: "스니커즈", acc: "선택 사항" },
  mild: { top: "긴팔 티 또는 맨투맨", bottom: "청바지", outer: "후드집업 또는 가벼운 자켓", shoes: "스니커즈 또는 로퍼", acc: "선택 사항" },
  cool: { top: "니트 또는 기모 맨투맨", bottom: "기모 청바지", outer: "코트 또는 무스탕", shoes: "부츠 또는 두꺼운 스니커즈", acc: "얇은 목도리" },
  cold: { top: "히트텍 + 니트", bottom: "기모 팬츠", outer: "롱패딩 또는 두꺼운 코트", shoes: "부츠", acc: "목도리, 장갑, 비니" },
};

function outfitFor(temp, feels, pop, humidity, wind) {
  let band;
  if (feels >= 29) band = "boiling";
  else if (feels >= 24) band = "hot";
  else if (feels >= 18) band = "warm";
  else if (feels >= 12) band = "mild";
  else if (feels >= 5) band = "cool";
  else band = "cold";

  const outfit = { ...OUTFIT_BASE[band] };
  const tips = [];
  const flags = {};

  if (pop >= 50) {
    outfit.shoes = "방수 스니커즈 또는 워커 (가죽 신발 비추천)";
    flags.shoes = "MUST";
    tips.push("비 소식이 있어요. 우산은 필수, 밑단 짧은 하의가 편해요.");
  } else if (pop >= 30) {
    tips.push("비가 살짝 올 수 있어요. 우산을 챙겨두면 안심이에요.");
  }

  if (band === "cool" || band === "cold") flags.outer = "MUST";
  if (band === "boiling" || band === "cold") flags.acc = "MUST";

  if (wind >= 8) {
    if (band === "hot" || band === "warm" || band === "boiling") {
      tips.push("바람이 꽤 강해요. 얇은 바람막이 하나 챙기면 좋아요.");
    } else {
      outfit.outer += " (여밀 수 있는 걸로)";
      flags.outer = "MUST";
      tips.push("바람이 강한 날이에요. 여밀 수 있는 아우터가 체감온도를 확 낮춰줘요.");
    }
  }

  if (humidity >= 75 && (band === "hot" || band === "boiling")) {
    tips.push("습도가 높아 더 후덥지근해요. 통풍 잘 되는 린넨·메시 소재가 훨씬 쾌적해요.");
  } else if (humidity <= 30 && band !== "hot" && band !== "boiling") {
    tips.push("공기가 건조해요. 립밤이나 핸드크림을 챙기면 좋아요.");
  }

  const items = CATEGORY_ORDER.filter((cat) => outfit[cat] && outfit[cat] !== "겉옷 없이").map((cat) => ({
    cat,
    label: CATEGORY_LABEL[cat],
    item: outfit[cat],
    flag: flags[cat],
  }));

  return { band, ...BAND_META[band], outfit, items, tips };
}

const MIN_RECORDS_FOR_ANALYSIS = 3;
const MEMO_KEYWORDS = [
  { word: "에어컨", tip: "실내 에어컨 때문에 춥다고 적으신 적이 있어요. 얇은 가디건을 상시 챙겨보면 좋아요." },
  { word: "히터", tip: "히터 때문에 덥다고 적으신 적이 있어요. 실내에서 바로 벗을 수 있는 레이어드가 편해요." },
  { word: "바람", tip: "바람 때문에 불편했다는 기록이 있어요. 바람막이를 챙기는 습관을 들이면 좋아요." },
  { word: "땀", tip: "땀 관련 기록이 있어요. 통풍 잘 되는 소재를 우선 고려해보세요." },
];

function analyzeRecords(records) {
  const entries = Object.entries(records).filter(([, r]) => r.feeling);
  const count = entries.length;
  if (count < MIN_RECORDS_FOR_ANALYSIS) return { count, ready: false };

  const byFeeling = { hot: [], normal: [], cold: [] };
  const feelingCounts = { hot: 0, normal: 0, cold: 0 };
  entries.forEach(([, r]) => {
    feelingCounts[r.feeling] += 1;
    if (typeof r.temperature === "number") byFeeling[r.feeling]?.push(r.temperature);
  });

  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const avgHot = avg(byFeeling.hot);
  const avgNormal = avg(byFeeling.normal);
  const avgCold = avg(byFeeling.cold);
  const counts = feelingCounts;

  const tips = [];
  let coldThreshold = null;
  let hotThreshold = null;

  if (avgCold != null && avgNormal != null) {
    coldThreshold = (avgCold + avgNormal) / 2;
    if (coldThreshold > 15) {
      tips.push(`${Math.round(coldThreshold)}° 근처에서도 춥다고 느끼신 기록이 있어요. 애매한 날씨엔 겉옷을 한 겹 더 챙기는 게 좋아요.`);
    } else if (coldThreshold < 8) {
      tips.push(`추위를 잘 안 타는 편이에요. ${Math.round(coldThreshold)}° 정도는 돼야 춥다고 느끼셨어요.`);
    }
  }
  if (avgHot != null && avgNormal != null) {
    hotThreshold = (avgHot + avgNormal) / 2;
    if (hotThreshold < 22) {
      tips.push(`${Math.round(hotThreshold)}° 정도만 돼도 덥다고 느끼시는 편이에요. 통풍 잘 되는 소재를 우선하면 좋아요.`);
    }
  }

  const memoText = entries.map(([, r]) => r.user_memo || "").join(" ");
  MEMO_KEYWORDS.forEach(({ word, tip }) => {
    const occurrences = memoText.split(word).length - 1;
    if (occurrences >= 2) tips.push(tip);
  });

  if (tips.length === 0) tips.push("아직 뚜렷한 패턴은 안 보여요. 기록이 더 쌓이면 분석이 정확해져요.");

  return { count, ready: true, avgHot, avgNormal, avgCold, counts, coldThreshold, hotThreshold, tips: tips.slice(0, 3) };
}

function aqiInfo(pm10, pm25) {
  const grade = (val, breaks) => {
    if (val == null || Number.isNaN(val)) return null;
    if (val <= breaks[0]) return 0;
    if (val <= breaks[1]) return 1;
    if (val <= breaks[2]) return 2;
    return 3;
  };
  const g10 = grade(pm10, [30, 80, 150]);
  const g25 = grade(pm25, [15, 35, 75]);
  const candidates = [g10, g25].filter((g) => g !== null);
  if (candidates.length === 0) return null;
  const g = Math.max(...candidates);
  const labels = ["좋음", "보통", "나쁨", "매우나쁨"];
  const colors = [TOKENS.accent, TOKENS.fgMid, "#e2984c", "#e0524c"];
  return { label: labels[g], color: colors[g] };
}

async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ko`);
    const data = await res.json();
    return (data.city || data.locality || data.principalSubdivision || "현재 위치").toUpperCase();
  } catch (e) {
    return "현재 위치";
  }
}

function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}
function saveRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error("저장 실패", e);
  }
}

// 현재 날씨와 시간에 맞는 회색 픽토그램을 표시한다.
function weatherSymbol(weatherCode, pop, hour) {
  const isSnow = [71, 73, 75, 77, 85, 86].includes(weatherCode);
  const isRain = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(weatherCode);
  const isEvening = hour >= 18 || hour < 6;

  if (isSnow) return "❄";
  if (isRain || pop >= 45) return "☂";
  if (isEvening) return "☾";
  return "◎";
}

function weatherAlerts(weatherCode, temp, feels, humidity, wind, pop) {
  const alerts = [];
  const isHeavyRain = [65, 82].includes(weatherCode);
  const isStorm = [95, 96, 99].includes(weatherCode);

  if (isStorm || wind >= 17.2) alerts.push({ symbol: "⚠", label: "강풍 주의" });
  if (isHeavyRain) alerts.push({ symbol: "╱╱", label: "폭우 주의" });
  if (isStorm) alerts.push({ symbol: "ϟ", label: "폭풍우 주의" });
  if (temp <= -10 || feels <= -15) alerts.push({ symbol: "❄", label: "한파 주의" });
  if (temp >= 33 || feels >= 35) alerts.push({ symbol: "☀", label: "폭염 주의" });
  if (humidity <= 30 && pop < 20) alerts.push({ symbol: "◌", label: "건조 주의" });

  return alerts;
}

/* ============================================================
   작은 컴포넌트
   ============================================================ */
function GlobalStyle() {
  return (
    <style>{`
      *, *::before, *::after { box-sizing: border-box; }
      .ootd-scope { background: ${TOKENS.bg}; }
      .ootd-scope ::-webkit-scrollbar { width: 0; height: 0; }
      .ootd-scope textarea:focus, .ootd-scope button:focus-visible, .ootd-scope input:focus {
        outline: 1px solid ${TOKENS.accent};
        outline-offset: 2px;
      }
      .ootd-scope textarea::placeholder { color: ${TOKENS.fgDim}; }
      @keyframes ootd-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .ootd-spin { display: inline-block; animation: ootd-spin 1s linear infinite; }
      .ootd-day-cell:active { background: rgba(240,237,230,0.06); }
    `}</style>
  );
}

function Eyebrow({ children, style }) {
  return (
    <div
      style={{
        fontFamily: TOKENS.fontDisplay,
        fontSize: 11,
        letterSpacing: "0.14em",
        color: TOKENS.fgDim,
        textTransform: "uppercase",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionToggle({ label, count, open, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "none",
        border: "none",
        borderTop: `1px solid ${TOKENS.rule}`,
        padding: "16px 0",
        cursor: "pointer",
      }}
    >
      <span style={{ fontFamily: TOKENS.fontDisplay, fontSize: 15, fontWeight: 600, letterSpacing: "0.02em", color: TOKENS.fg }}>
        {label}
        {count != null && (
          <span style={{ fontFamily: TOKENS.fontBody, fontSize: 12, color: TOKENS.fgDim, marginLeft: 8 }}>{count}</span>
        )}
      </span>
      <span
        style={{
          fontFamily: TOKENS.fontDisplay,
          fontSize: 16,
          color: TOKENS.fgDim,
          display: "inline-block",
          transform: open ? "rotate(90deg)" : "none",
          transition: "transform 0.15s",
        }}
      >
        ›
      </span>
    </button>
  );
}

function FeelingMark({ feeling, active, size = 14 }) {
  const f = FEELINGS[feeling];
  if (!f) return null;
  return (
    <span
      style={{
        fontFamily: TOKENS.fontDisplay,
        fontSize: size,
        fontWeight: 700,
        color: active ? TOKENS.accent : TOKENS.fgMid,
        lineHeight: 1,
      }}
    >
      {f.symbol}
    </span>
  );
}

/* ============================================================
   메인 App
   ============================================================ */
export default function App() {
  const [records, setRecords] = useState(() => loadRecords());
  const [weather, setWeather] = useState({ status: "loading", place: SEOUL.name });
  const [monthCursor, setMonthCursor] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [sheetDate, setSheetDate] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [hourRange, setHourRange] = useState(8);
  const [selectedHour, setSelectedHour] = useState(0);
  const [showTomorrow, setShowTomorrow] = useState(false);
  const hourlyScrollRef = useRef(null);
  const hourlyDragRef = useRef({ active: false, startX: 0, scrollLeft: 0 });

  const fetchAll = useCallback((lat, lon, place, isGeo) => {
    setWeather((w) => ({ ...w, status: "loading" }));

    const weatherP = fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&hourly=precipitation_probability,temperature_2m&wind_speed_unit=ms&timezone=Asia%2FSeoul&forecast_days=2`
    ).then((r) => r.json());

    const airP = fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5&timezone=Asia%2FSeoul&forecast_days=1`
    ).then((r) => r.json()).catch(() => null);

    const placeP = isGeo ? reverseGeocode(lat, lon) : Promise.resolve(place);

    Promise.all([weatherP, airP, placeP])
      .then(([data, air, resolvedPlace]) => {
        const temp = data.current.temperature_2m;
        const humidity = data.current.relative_humidity_2m;
        const wind = data.current.wind_speed_10m;
        const weatherCode = data.current.weather_code;

        const nowHour = new Date().getHours();
        const idx = data?.hourly?.time?.findIndex((t) => new Date(t).getHours() === nowHour);
        const startIdx = idx >= 0 ? idx : 0;
        const pop = data.hourly.precipitation_probability[startIdx];

        const tomorrowStartIdx = data.hourly.time.findIndex((t, index) => index > startIdx && t.slice(0, 10) !== data.hourly.time[startIdx].slice(0, 10));
        const nextDayIdx = tomorrowStartIdx >= 0 ? tomorrowStartIdx : data.hourly.time.length;
        const hourly = data.hourly.time.slice(startIdx, nextDayIdx + 1).map((t, i) => ({
          hour: new Date(t).getHours(),
          temp: data.hourly.temperature_2m[startIdx + i],
          pop: data.hourly.precipitation_probability[startIdx + i],
        }));
        const tomorrowHourly = data.hourly.time.slice(nextDayIdx, nextDayIdx + 24).map((t, i) => ({
          hour: new Date(t).getHours(),
          temp: data.hourly.temperature_2m[nextDayIdx + i],
          pop: data.hourly.precipitation_probability[nextDayIdx + i],
        }));

        const pm10 = air?.current?.pm10 ?? null;
        const pm25 = air?.current?.pm2_5 ?? null;
        const feels = feelsLike(temp, humidity, wind);

        setWeather({ status: "ok", temp, feels, pop, humidity, wind, weatherCode, pm10, pm25, hourly, tomorrowHourly, place: resolvedPlace });
        setHourRange(8);
        setSelectedHour(0);
        setShowTomorrow(false);
      })
      .catch(() => setWeather((w) => ({ ...w, status: "error", place })));
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      fetchAll(SEOUL.lat, SEOUL.lon, SEOUL.name, false);
      return;
    }
    setWeather({ status: "loading", place: "위치 확인 중" });
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchAll(pos.coords.latitude, pos.coords.longitude, "현재 위치", true),
      () => fetchAll(SEOUL.lat, SEOUL.lon, SEOUL.name, false),
      { timeout: 15000, maximumAge: 5 * 60 * 1000, enableHighAccuracy: false }
    );
  }, [fetchAll]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  function persist(next) {
    setRecords(next);
    saveRecords(next);
  }

  function startHourlyDrag(event) {
    if (!hourlyScrollRef.current) return;
    if (event.button !== undefined && event.button !== 0) return;
    hourlyDragRef.current = {
      active: true,
      startX: event.clientX,
      scrollLeft: hourlyScrollRef.current.scrollLeft,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveHourlyDrag(event) {
    const drag = hourlyDragRef.current;
    if (!drag.active || !hourlyScrollRef.current) return;
    hourlyScrollRef.current.scrollLeft = drag.scrollLeft - (event.clientX - drag.startX);
  }

  function endHourlyDrag() {
    hourlyDragRef.current.active = false;
  }

  const today = new Date();
  const todayStr = fmtDate(today);
  const todayLabel = today.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });

  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const rec = weather.status === "ok" ? outfitFor(weather.temp, weather.feels, weather.pop, weather.humidity, weather.wind) : null;
  const aqi = weather.status === "ok" ? aqiInfo(weather.pm10, weather.pm25) : null;
  const analysis = analyzeRecords(records);
  const displayedHourly = showTomorrow ? weather.tomorrowHourly : weather.hourly;
  const visibleHourRange = showTomorrow ? displayedHourly?.length ?? 0 : hourRange;
  const alerts = weather.status === "ok" ? weatherAlerts(weather.weatherCode, weather.temp, weather.feels, weather.humidity, weather.wind, weather.pop) : [];

  if (rec && analysis.ready) {
    if (analysis.coldThreshold != null && weather.feels <= analysis.coldThreshold + 2) {
      rec.tips.push("지난 기록을 보면 이 기온대에서 추위를 느끼셨어요. 아우터를 하나 더 챙기는 걸 추천해요.");
    } else if (analysis.hotThreshold != null && weather.feels >= analysis.hotThreshold - 2) {
      rec.tips.push("지난 기록을 보면 이 기온대에서 더위를 느끼셨어요. 통풍 잘 되는 소재를 우선해보세요.");
    }
  }

  let rainAlert = null;
  if (weather.status === "ok" && weather.hourly && weather.pop < 40) {
    const upcoming = weather.hourly.find((h, i) => i > 0 && i <= 16 && h.pop >= 50);
    if (upcoming) rainAlert = `${upcoming.hour}시쯤 비 소식`;
  }
  const recordedThisMonth = Object.keys(records).filter((k) => k.startsWith(`${year}-${pad(month + 1)}`)).length;

  return (
    <div className="ootd-scope" style={{ minHeight: "100vh", background: TOKENS.bg, color: TOKENS.fg }}>
      <GlobalStyle />
      <div style={{ maxWidth: 430, margin: "0 auto", padding: "0 20px 64px", fontFamily: TOKENS.fontBody }}>
        {/* ===== Top bar ===== */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            borderBottom: `1px solid ${TOKENS.rule}`,
            padding: "24px 0 14px",
          }}
        >
          <button
            onClick={requestLocation}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontFamily: TOKENS.fontDisplay, fontSize: 13, letterSpacing: "0.12em", color: TOKENS.fgDim }}>
              {weather.place?.toString().toUpperCase()} · KR
            </span>
            <span className={weather.status === "loading" ? "ootd-spin" : ""} style={{ fontSize: 11, color: TOKENS.fgDim }}>
              {weather.status === "loading" ? "◌" : "↻"}
            </span>
          </button>
          <span style={{ fontFamily: TOKENS.fontDisplay, fontSize: 13, letterSpacing: "0.08em", color: TOKENS.fgDim }}>
            {todayLabel}
          </span>
        </div>

        {rainAlert && (
          <div style={{ fontFamily: TOKENS.fontDisplay, fontSize: 11.5, letterSpacing: "0.06em", color: TOKENS.accent, padding: "10px 0 0" }}>
            ☂ {rainAlert}
          </div>
        )}

        {/* ===== Hero ===== */}
        {weather.status === "ok" && (
          <div style={{ paddingTop: rainAlert ? 18 : 32, paddingBottom: 4, position: "relative" }}>
            <div
              style={{
                fontFamily: TOKENS.fontDisplay,
                fontSize: 110,
                lineHeight: 1,
                color: TOKENS.rule,
                position: "absolute",
                right: -6,
                top: 14,
                userSelect: "none",
              }}
            >
              {weatherSymbol(weather.weatherCode, weather.pop, new Date().getHours())}
            </div>
            {alerts.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  right: 8,
                  top: 88,
                  display: "flex",
                  gap: 6,
                  color: TOKENS.fgDim,
                  fontFamily: TOKENS.fontDisplay,
                  fontSize: 19,
                  lineHeight: 1,
                }}
                aria-label={alerts.map((alert) => alert.label).join(", ")}
              >
                {alerts.map((alert) => (
                  <span key={alert.label} title={alert.label} aria-label={alert.label}>
                    {alert.symbol}
                  </span>
                ))}
              </div>
            )}

            <div style={{ position: "relative", zIndex: 1 }}>
              <div
                style={{
                  fontFamily: TOKENS.fontDisplay,
                  fontWeight: 800,
                  fontSize: "clamp(88px, 24vw, 118px)",
                  lineHeight: 0.88,
                  letterSpacing: "-0.02em",
                }}
              >
                {Math.round(weather.temp)}°
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
                <span style={{ fontFamily: TOKENS.fontDisplay, fontWeight: 700, fontSize: 24, letterSpacing: "0.05em", color: TOKENS.accent }}>
                  {rec.eng}
                </span>
                <span style={{ fontFamily: TOKENS.fontDisplay, fontSize: 13.5, color: TOKENS.fgDim, letterSpacing: "0.03em" }}>
                  {rec.desc}
                </span>
              </div>
            </div>
          </div>
        )}
        {weather.status === "loading" && (
          <div style={{ padding: "40px 0", fontFamily: TOKENS.fontDisplay, fontSize: 14, color: TOKENS.fgDim, letterSpacing: "0.04em" }}>
            날씨를 불러오는 중···
          </div>
        )}
        {weather.status === "error" && (
          <div style={{ padding: "28px 0" }}>
            <p style={{ fontSize: 13.5, color: TOKENS.fgMid, lineHeight: 1.7, marginBottom: 14 }}>
              위치나 날씨 정보를 가져오지 못했어요. 브라우저 위치 권한을 확인한 뒤 다시 시도해주세요.
            </p>
            <button
              onClick={requestLocation}
              style={{
                background: "none",
                color: TOKENS.accent,
                border: `1px solid ${TOKENS.accent}`,
                padding: "9px 16px",
                fontFamily: TOKENS.fontDisplay,
                fontSize: 12.5,
                letterSpacing: "0.08em",
                cursor: "pointer",
              }}
            >
              위치 다시 시도
            </button>
          </div>
        )}

        {/* ===== Stats strip ===== */}
        {weather.status === "ok" && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                borderTop: `1px solid ${TOKENS.rule}`,
                borderBottom: `1px solid ${TOKENS.rule}`,
                margin: "18px 0 0",
              }}
            >
              {[
                { label: "체감", val: `${Math.round(weather.feels)}°` },
                { label: "강수", val: `${weather.pop}%` },
                { label: "습도", val: `${weather.humidity}%` },
                { label: "바람", val: `${Math.round(weather.wind)}㎧` },
              ].map((s, i) => (
                <div key={i} style={{ padding: "13px 0", borderRight: i < 3 ? `1px solid ${TOKENS.rule}` : "none", paddingLeft: i === 0 ? 0 : 12 }}>
                  <Eyebrow style={{ marginBottom: 4 }}>{s.label}</Eyebrow>
                  <div style={{ fontFamily: TOKENS.fontDisplay, fontWeight: 700, fontSize: 21, letterSpacing: "-0.01em" }}>{s.val}</div>
                </div>
              ))}
            </div>

            {aqi && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 0 0", fontSize: 12.5, color: TOKENS.fgMid }}>
                <span style={{ width: 6, height: 6, background: aqi.color, display: "inline-block" }} />
                미세먼지 {aqi.label}
              </div>
            )}

            {/* ===== Hourly ===== */}
            {displayedHourly && displayedHourly.length > 0 && (
              <div style={{ marginTop: 18 }}>
                {showTomorrow && <Eyebrow style={{ marginBottom: 8, color: TOKENS.fgMid }}>내일 날씨</Eyebrow>}
                <div
                  ref={hourlyScrollRef}
                  onPointerDown={startHourlyDrag}
                  onPointerMove={moveHourlyDrag}
                  onPointerUp={endHourlyDrag}
                  onPointerCancel={endHourlyDrag}
                  style={{ display: "flex", gap: 2, overflowX: "auto", cursor: "grab", userSelect: "none", touchAction: "none" }}
                >
                  {displayedHourly.slice(0, visibleHourRange).map((h, i) => {
                    const shown = displayedHourly.slice(0, visibleHourRange);
                    const maxT = Math.max(...shown.map((x) => x.temp));
                    const minT = Math.min(...shown.map((x) => x.temp));
                    const range = Math.max(1, maxT - minT);
                    const barH = 4 + ((h.temp - minT) / range) * 24;
                    const isSelected = i === selectedHour;
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedHour(i)}
                        style={{
                          flex: 1,
                          minWidth: 32,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 6,
                          background: "none",
                          border: "none",
                          borderBottom: isSelected ? `1px solid ${TOKENS.accent}` : "1px solid transparent",
                          padding: "6px 0 8px",
                          cursor: "pointer",
                          fontFamily: TOKENS.fontDisplay,
                        }}
                      >
                        <span style={{ fontSize: 11, color: isSelected ? TOKENS.accent : TOKENS.fgMid }}>{Math.round(h.temp)}°</span>
                        <div style={{ height: 28, display: "flex", alignItems: "flex-end" }}>
                          <div style={{ width: 3, height: barH, background: h.pop >= 40 ? TOKENS.accent : TOKENS.fgDim }} />
                        </div>
                        <span style={{ fontSize: 10, color: TOKENS.fgDim }}>{!showTomorrow && i === 0 ? "지금" : `${h.hour}시`}</span>
                      </button>
                    );
                  })}
                  {!showTomorrow && hourRange < weather.hourly.length && (
                    <button
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => {
                        const midnightIndex = weather.hourly.findIndex((hour) => hour.hour === 0);
                        setHourRange(midnightIndex >= 0 ? midnightIndex + 1 : weather.hourly.length);
                      }}
                      style={{
                        flexShrink: 0,
                        width: 52,
                        background: "none",
                        border: "none",
                        color: TOKENS.fgDim,
                        fontFamily: TOKENS.fontDisplay,
                        fontSize: 10.5,
                        cursor: "pointer",
                        letterSpacing: "0.05em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      더보기
                    </button>
                  )}
                </div>
                {!showTomorrow && hourRange >= weather.hourly.length && weather.tomorrowHourly?.length > 0 && (
                  <button
                    onClick={() => {
                      setShowTomorrow(true);
                      setSelectedHour(0);
                      setHourRange(weather.tomorrowHourly.length);
                      hourlyScrollRef.current?.scrollTo({ left: 0 });
                    }}
                    style={{
                      width: "100%",
                      marginTop: 12,
                      padding: "10px 0",
                      background: "none",
                      border: `1px solid ${TOKENS.rule}`,
                      color: TOKENS.fgMid,
                      fontFamily: TOKENS.fontDisplay,
                      fontSize: 12,
                      letterSpacing: "0.06em",
                      cursor: "pointer",
                    }}
                  >
                    내일 날씨 보기
                  </button>
                )}
                {displayedHourly[selectedHour] && (
                  <div style={{ marginTop: 8, fontSize: 12, color: TOKENS.fgDim }}>
                    {!showTomorrow && selectedHour === 0 ? "지금" : `${displayedHourly[selectedHour].hour}시`} · {Math.round(displayedHourly[selectedHour].temp)}° · 강수확률{" "}
                    {displayedHourly[selectedHour].pop}%
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ===== 오늘의 코디 ===== */}
        {rec && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 40, marginBottom: 22 }}>
              <div>
                <div style={{ fontFamily: TOKENS.fontDisplay, fontWeight: 700, fontSize: 28, letterSpacing: "-0.01em", lineHeight: 1.1 }}>
                  {rec.headline}
                </div>
              </div>
              <Eyebrow style={{ whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}>TODAY'S PICK</Eyebrow>
            </div>

            <div>
              {rec.items.map((item, i) => (
                <div
                  key={item.cat}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "26px 1fr",
                    gap: "0 14px",
                    alignItems: "start",
                    borderTop: `1px solid ${TOKENS.rule}`,
                    padding: "16px 0",
                  }}
                >
                  <div style={{ fontFamily: TOKENS.fontDisplay, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: TOKENS.fgDim, paddingTop: 3 }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <Eyebrow style={{ marginBottom: 4 }}>{item.label}</Eyebrow>
                    <div style={{ fontSize: 14.5, fontWeight: 500, lineHeight: 1.4 }}>{item.item}</div>
                    {item.flag && (
                      <div
                        style={{
                          display: "inline-block",
                          marginTop: 6,
                          fontFamily: TOKENS.fontDisplay,
                          fontSize: 10,
                          letterSpacing: "0.12em",
                          fontWeight: 700,
                          color: TOKENS.accent,
                          borderBottom: `1px solid ${TOKENS.accent}`,
                          paddingBottom: 1,
                        }}
                      >
                        {item.flag}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${TOKENS.rule}` }} />
            </div>

            {rec.tips.length > 0 && (
              <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${TOKENS.accent}` }}>
                <Eyebrow style={{ color: TOKENS.accent, letterSpacing: "0.18em", marginBottom: 10 }}>TIP</Eyebrow>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {rec.tips.map((tip, i) => (
                    <p key={i} style={{ fontSize: 13.5, lineHeight: 1.7, color: TOKENS.fgMid, margin: 0 }}>
                      {tip}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== 기록 CTA ===== */}
        <button
          onClick={() => setSheetDate(todayStr)}
          style={{
            width: "100%",
            background: TOKENS.accent,
            color: "#0c0c0c",
            border: "none",
            padding: "16px 0",
            marginTop: 32,
            fontFamily: TOKENS.fontDisplay,
            fontWeight: 700,
            fontSize: 14.5,
            letterSpacing: "0.06em",
            cursor: "pointer",
          }}
        >
          오늘의 착장 기록하기
        </button>

        {/* ===== 이번 달 기록 ===== */}
        <SectionToggle label="이번 달 기록" count={`${recordedThisMonth}일`} open={calendarOpen} onClick={() => setCalendarOpen((v) => !v)} />

        {calendarOpen && (
          <div style={{ padding: "4px 0 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <button
                onClick={() => setMonthCursor(new Date(year, month - 1, 1))}
                style={{ background: "none", border: "none", color: TOKENS.fgDim, fontFamily: TOKENS.fontDisplay, fontSize: 16, cursor: "pointer", padding: 4 }}
                aria-label="이전 달"
              >
                ‹
              </button>
              <span style={{ fontFamily: TOKENS.fontDisplay, fontSize: 13, letterSpacing: "0.06em", color: TOKENS.fgMid }}>
                {year}.{pad(month + 1)}
              </span>
              <button
                onClick={() => setMonthCursor(new Date(year, month + 1, 1))}
                style={{ background: "none", border: "none", color: TOKENS.fgDim, fontFamily: TOKENS.fontDisplay, fontSize: 16, cursor: "pointer", padding: 4 }}
                aria-label="다음 달"
              >
                ›
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", fontSize: 10, color: TOKENS.fgDim, marginBottom: 6, fontFamily: TOKENS.fontDisplay, letterSpacing: "0.06em" }}>
              {WEEK_LABELS.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {cells.map((d, i) => {
                if (d === null) return <div key={i} />;
                const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
                const dayRec = records[dateStr];
                const isToday = dateStr === todayStr;
                return (
                  <button
                    key={i}
                    className="ootd-day-cell"
                    onClick={() => setSheetDate(dateStr)}
                    style={{
                      aspectRatio: "1",
                      border: isToday ? `1px solid ${TOKENS.accent}` : `1px solid ${TOKENS.rule}`,
                      background: "none",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 3,
                      cursor: "pointer",
                      padding: 1,
                    }}
                  >
                    <span style={{ fontFamily: TOKENS.fontDisplay, fontSize: 10.5, fontWeight: isToday ? 700 : 500, color: isToday ? TOKENS.fg : TOKENS.fgMid }}>
                      {d}
                    </span>
                    {dayRec ? <FeelingMark feeling={dayRec.feeling} active size={11} /> : <span style={{ height: 11 }} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== 내 코디 분석 ===== */}
        <SectionToggle
          label="내 코디 분석"
          count={analysis.ready ? `${analysis.count}일 분석` : null}
          open={analysisOpen}
          onClick={() => setAnalysisOpen((v) => !v)}
        />

        {analysisOpen && (
          <div style={{ padding: "18px 0" }}>
            {!analysis.ready ? (
              <p style={{ fontSize: 13, color: TOKENS.fgDim, lineHeight: 1.7, margin: 0 }}>
                기록이 {analysis.count}/{MIN_RECORDS_FOR_ANALYSIS}일 쌓였어요. {MIN_RECORDS_FOR_ANALYSIS}일 이상 기록하면 나만의 체감 패턴을 분석해드려요.
              </p>
            ) : (
              <>
                <div style={{ display: "flex", gap: 22, marginBottom: 18 }}>
                  {["hot", "normal", "cold"].map((key) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <FeelingMark feeling={key} active size={16} />
                      <div>
                        <div style={{ fontFamily: TOKENS.fontDisplay, fontSize: 14, fontWeight: 600 }}>{analysis.counts[key]}회</div>
                        <div style={{ fontSize: 10.5, color: TOKENS.fgDim }}>
                          {analysis[`avg${key[0].toUpperCase()}${key.slice(1)}`] != null
                            ? `평균 ${Math.round(analysis[`avg${key[0].toUpperCase()}${key.slice(1)}`])}°`
                            : "기록 없음"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {analysis.tips.map((tip, i) => (
                    <p key={i} style={{ fontSize: 12.5, color: TOKENS.fgMid, lineHeight: 1.6, margin: 0 }}>
                      · {tip}
                    </p>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {sheetDate && (
        <RecordSheet
          dateStr={sheetDate}
          isToday={sheetDate === todayStr}
          weather={sheetDate === todayStr ? weather : null}
          existing={records[sheetDate]}
          onClose={() => setSheetDate(null)}
          onSave={(entry) => {
            const next = { ...records, [sheetDate]: entry };
            persist(next);
            setSheetDate(null);
          }}
        />
      )}
    </div>
  );
}

function RecordSheet({ dateStr, isToday, weather, existing, onClose, onSave }) {
  const [items, setItems] = useState(existing?.items_worn || "");
  const [feeling, setFeeling] = useState(existing?.feeling || null);
  const [memo, setMemo] = useState(existing?.user_memo || "");
  const [y, m, d] = dateStr.split("-");

  const canSave = items.trim().length > 0 && feeling;

  const inputStyle = {
    width: "100%",
    background: "none",
    border: "none",
    borderBottom: `1px solid ${TOKENS.rule}`,
    borderRadius: 0,
    padding: "8px 0",
    fontSize: 14,
    fontFamily: TOKENS.fontBody,
    color: TOKENS.fg,
    resize: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      className="ootd-scope"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: TOKENS.bgRaised,
          borderTop: `1px solid ${TOKENS.rule}`,
          width: "100%",
          maxWidth: 430,
          padding: "22px 22px 30px",
          maxHeight: "88vh",
          overflowY: "auto",
          fontFamily: TOKENS.fontBody,
          color: TOKENS.fg,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
          <div>
            <Eyebrow>
              {y}.{m}.{d} {isToday ? "· 오늘" : ""}
            </Eyebrow>
            <div style={{ fontFamily: TOKENS.fontDisplay, fontSize: 24, fontWeight: 700, marginTop: 4 }}>
              {weather?.status === "ok" ? `${Math.round(weather.temp)}° 기록` : "오늘의 기록"}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: TOKENS.fgDim, cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 4 }} aria-label="닫기">
            ×
          </button>
        </div>

        <Eyebrow style={{ marginBottom: 8 }}>오늘 뭐 입으셨나요</Eyebrow>
        <textarea
          value={items}
          onChange={(e) => setItems(e.target.value)}
          placeholder="예: 파란 셔츠, 크림진, 뉴발란스 530"
          rows={2}
          style={{ ...inputStyle, marginBottom: 24 }}
        />

        <Eyebrow style={{ marginBottom: 10 }}>오늘 옷차림은 어떠셨나요</Eyebrow>
        <div style={{ display: "flex", gap: 0, marginBottom: 24, borderTop: `1px solid ${TOKENS.rule}`, borderBottom: `1px solid ${TOKENS.rule}` }}>
          {Object.entries(FEELINGS).map(([key, f], i) => (
            <button
              key={key}
              onClick={() => setFeeling(key)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: "14px 4px",
                cursor: "pointer",
                background: "none",
                border: "none",
                borderRight: i < 2 ? `1px solid ${TOKENS.rule}` : "none",
                borderBottom: feeling === key ? `2px solid ${TOKENS.accent}` : "2px solid transparent",
              }}
            >
              <span style={{ fontFamily: TOKENS.fontDisplay, fontSize: 18, fontWeight: 700, color: feeling === key ? TOKENS.accent : TOKENS.fgMid }}>{f.symbol}</span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: feeling === key ? TOKENS.fg : TOKENS.fgDim }}>{f.label}</span>
            </button>
          ))}
        </div>

        <Eyebrow style={{ marginBottom: 8 }}>한 줄 메모</Eyebrow>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="예: 강의실 에어컨 바람 때문에 추웠음. 다음엔 바람막이 필수"
          rows={2}
          style={{ ...inputStyle, marginBottom: 28 }}
        />

        <button
          disabled={!canSave}
          onClick={() =>
            onSave({
              items_worn: items.trim(),
              feeling,
              user_memo: memo.trim(),
              temperature: weather?.status === "ok" ? weather.temp : existing?.temperature ?? null,
              rain_prob: weather?.status === "ok" ? weather.pop : existing?.rain_prob ?? null,
            })
          }
          style={{
            width: "100%",
            background: canSave ? TOKENS.accent : "transparent",
            color: canSave ? "#0c0c0c" : TOKENS.fgDim,
            border: canSave ? "none" : `1px solid ${TOKENS.rule}`,
            padding: "15px 0",
            fontFamily: TOKENS.fontDisplay,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.06em",
            cursor: canSave ? "pointer" : "not-allowed",
          }}
        >
          저장하기
        </button>
      </div>
    </div>
  );
}
