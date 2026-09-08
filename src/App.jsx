import { useState, useEffect, useRef } from "react";
import { dateInTimezone, fmtDate, fmtTemp, pad, seasonFor } from "./lib/date";
 
import {
  loadFavorites,
  loadProfile,
  loadRecords,
  loadUnit,
  loadWardrobe,
  saveFavorites,
  saveProfile,
  saveRecords,
  saveUnit,
  saveWardrobe,
} from "./lib/storage";
import { useWeather } from "./hooks/useWeather";
import { TOKENS } from "./constants";
import { Eyebrow, FeelingMark, SectionToggle } from "./components/common";
import ProfileSheetComponent from "./components/ProfileSheet";
import { LocationSearchSheet as LocationSearchSheetComponent, RecordSearchSheet as RecordSearchSheetComponent } from "./components/SearchSheets";
import WardrobeSheetComponent from "./components/WardrobeSheet";
import RecordSheetComponent from "./components/RecordSheet";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "./lib/wardrobe";

const SEOUL = { lat: 37.5665, lon: 126.978, name: "SEOUL" };

function bandToWarmth(band) {
  if (band === "boiling" || band === "hot") return "hot";
  if (band === "cool" || band === "cold") return "cold";
  return "mild";
}

const WEEK_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// 대한민국 법정공휴일(대체공휴일 포함) — 우선 2026년 기준으로 반영
const KR_HOLIDAYS = new Set([
  "2026-01-01", // 신정
  "2026-02-16", "2026-02-17", "2026-02-18", // 설날 연휴
  "2026-03-01", "2026-03-02", // 삼일절(일) + 대체공휴일(월)
  "2026-05-05", // 어린이날
  "2026-05-24", "2026-05-25", // 부처님오신날(일) + 대체공휴일(월)
  "2026-06-03", // 전국동시지방선거(임시공휴일)
  "2026-06-06", // 현충일
  "2026-07-17", // 제헌절 (2026년부터 공휴일로 재지정)
  "2026-08-15", "2026-08-17", // 광복절(토) + 대체공휴일(월)
  "2026-09-24", "2026-09-25", "2026-09-26", // 추석 연휴
  "2026-10-03", "2026-10-05", "2026-10-09", // 개천절(토) + 대체공휴일(월), 한글날
  "2026-12-25", // 성탄절
]);
function isHoliday(dateStr, dynamicMap) {
  if (dynamicMap && dateStr in dynamicMap) return true;
  return KR_HOLIDAYS.has(dateStr);
}
function holidayName(dateStr, dynamicMap) {
  return dynamicMap?.[dateStr] || null;
}

const BAND_META = {
  boiling: { eng: "SCORCHING", headline: "찜통 더위, 최대한 가볍게", desc: "가볍게 입어야 하는 무더운 하루" },
  hot: { eng: "WARM", headline: "여름 옷차림이면 충분해요", desc: "화창하고 더운 하루" },
  warm: { eng: "MILD", headline: "활동하기 좋은 선선한 날씨", desc: "가볍게 걸치기 좋은 하루" },
  mild: { eng: "BRISK", headline: "쌀쌀하니 한 겹 더 챙기세요", desc: "겉옷 하나면 딱 좋은 하루" },
  cool: { eng: "COLD", headline: "쌀쌀해요, 아우터는 필수", desc: "아우터 없이는 쌀쌀한 하루" },
  cold: { eng: "FREEZING", headline: "춥습니다, 든든하게 챙기세요", desc: "든든히 챙겨입어야 하는 추운 하루" },
};

const SEASON_META = {
  spring: { label: "봄", message: "봄 옷차림이면 충분해요" },
  summer: { label: "여름", message: "여름 옷차림이면 충분해요" },
  autumn: { label: "가을", message: "가벼운 가을 옷차림을 준비해요" },
  winter: { label: "겨울", message: "따뜻한 겨울 옷차림을 챙겨요" },
};

function seasonalHeadline(band, date = new Date()) {
  const season = seasonFor(date);
  if (band === "hot" || band === "boiling") return SEASON_META[season].message;
  return BAND_META[band].headline;
}

const OUTFIT_BASE = {
  boiling: { top: "린넨/메시 반팔티", bottom: "린넨 반바지 또는 얇은 슬랙스", outer: "겉옷 없이", shoes: "통풍 잘 되는 스니커즈 또는 샌들", acc: "선글라스, 미니 크로스백" },
  hot: { top: "반팔 티셔츠", bottom: "면 반바지 또는 얇은 데님", outer: "겉옷 없이 (실내 냉방 대비용 얇은 셔츠 하나)", shoes: "캔버스 스니커즈", acc: "캡모자" },
  warm: { top: "얇은 셔츠 또는 반팔 맨투맨", bottom: "치노팬츠 또는 데님", outer: "가벼운 가디건", shoes: "스니커즈", acc: "선택 사항" },
  mild: { top: "긴팔 티 또는 맨투맨", bottom: "청바지", outer: "후드집업 또는 가벼운 자켓", shoes: "스니커즈 또는 로퍼", acc: "선택 사항" },
  cool: { top: "니트 또는 기모 맨투맨", bottom: "기모 청바지", outer: "코트 또는 무스탕", shoes: "부츠 또는 두꺼운 스니커즈", acc: "얇은 목도리" },
  cold: { top: "히트텍 + 니트", bottom: "기모 팬츠", outer: "롱패딩 또는 두꺼운 코트", shoes: "부츠", acc: "목도리, 장갑, 비니" },
};

function outfitFor(temp, feels, pop, humidity, wind, profile = {}, aqi = null, weatherCode = null) {
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
  const profileNotes = [];
  const isThunder = [95, 96, 99].includes(weatherCode);

  if (isThunder) {
    outfit.shoes = "방수 스니커즈 또는 워커 (가죽 신발 비추천)";
    outfit.acc = "우비 (금속 우산은 피하세요)";
    flags.shoes = "MUST";
    flags.acc = "MUST";
    tips.push("천둥번개가 예상돼요. 금속 우산보다 우비가 안전하고, 가능하면 야외 활동은 피하세요.");
  } else if (pop >= 50) {
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

  const age = Number(profile.age);
  const health = profile.health || [];
  if (age > 0 && (age <= 12 || age >= 65)) {
    if (band === "boiling" || band === "hot") {
      tips.push("기온에 민감할 수 있는 연령대예요. 한낮 야외 활동은 줄이고 물을 자주 마셔요.");
      profileNotes.push("나이");
    }
    if (band === "cool" || band === "cold") {
      outfit.outer = outfit.outer === "겉옷 없이" ? "가벼운 보온 겉옷" : `${outfit.outer} (보온성 우선)`;
      flags.outer = "MUST";
      tips.push("추위에 민감할 수 있는 연령대라 목과 손을 따뜻하게 보호하면 좋아요.");
      profileNotes.push("나이");
    }
  }
  // 호흡기 민감: 춥거나 바람이 강할 때뿐 아니라, 오늘 미세먼지가 나쁜 날에도 반영
  const badAir = aqi && (aqi.label === "나쁨" || aqi.label === "매우나쁨");
  if (health.includes("respiratory") && (band === "cool" || band === "cold" || wind >= 8)) {
    outfit.acc = "마스크 또는 목을 덮는 스카프";
    flags.acc = "MUST";
    tips.push("호흡기가 예민하다면 차갑고 강한 바람을 직접 맞지 않도록 목과 코를 가려주세요.");
    profileNotes.push("호흡기 민감");
  }
  if (health.includes("respiratory") && badAir) {
    outfit.acc = "마스크 (미세먼지 " + aqi.label + ")";
    flags.acc = "MUST";
    tips.push(`오늘 미세먼지가 ${aqi.label} 수준이에요. 호흡기가 예민하다면 마스크를 꼭 착용하세요.`);
    if (!profileNotes.includes("호흡기 민감")) profileNotes.push("호흡기 민감");
  }
  if (health.includes("cardiovascular") && (band === "boiling" || band === "hot" || band === "cold")) {
    tips.push("기온 변화에 주의가 필요한 상태라 무리한 야외 활동을 피하고 체온을 천천히 조절하세요.");
    profileNotes.push("심혈관 주의");
  }
  if (health.includes("skin")) {
    outfit.acc = band === "boiling" || band === "hot" ? "자외선 차단제, 통풍 좋은 모자" : outfit.acc;
    tips.push("피부가 예민하다면 까슬한 소재보다 부드럽고 통풍되는 소재를 골라보세요.");
    profileNotes.push("피부 민감");
  }
  if (health.includes("coldSensitive") && (band === "warm" || band === "mild" || band === "cool" || band === "cold")) {
    if (band !== "warm") {
      outfit.outer = outfit.outer === "겉옷 없이" ? "가벼운 보온 겉옷" : `${outfit.outer} (보온성 우선)`;
      flags.outer = "MUST";
    }
    tips.push("추위를 많이 타는 편이면 체감온도보다 한 겹 더 챙기는 게 좋아요.");
    profileNotes.push("추위 민감");
  }
  if (health.includes("pregnant")) {
    if (band === "boiling" || band === "hot") {
      tips.push("임신 중에는 체온이 더 쉽게 오를 수 있어요. 통풍 잘 되는 넉넉한 옷을 고르고 무리한 야외 활동은 피하세요.");
    }
    if (band === "cool" || band === "cold") {
      outfit.outer = outfit.outer === "겉옷 없이" ? "가벼운 보온 겉옷" : `${outfit.outer} (보온성 우선)`;
      flags.outer = "MUST";
      tips.push("배를 따뜻하게 유지하고, 미끄러운 신발보다 안정감 있는 신발을 고르세요.");
    }
    profileNotes.push("임신 중");
  }
  if (health.includes("other") && profile.healthOther?.trim()) {
    tips.push(`직접 입력하신 건강 상태(${profile.healthOther.trim()})도 함께 고려해서 오늘 옷차림과 활동을 조절해보세요.`);
    profileNotes.push("기타");
  }

  const items = CATEGORY_ORDER.filter((cat) => outfit[cat] && outfit[cat] !== "겉옷 없이").map((cat) => ({
    cat,
    label: CATEGORY_LABEL[cat],
    item: outfit[cat],
    flag: flags[cat],
  }));

  return { band, ...BAND_META[band], outfit, items, tips, profileNotes: [...new Set(profileNotes)] };
}

// 오늘의 코디 카드를 공유 가능한 텍스트로 만든다.
function outfitShareText(rec, weather, place) {
  const lines = [
    `오늘 뭐 입지? · ${place}`,
    `${Math.round(weather.temp)}° (체감 ${Math.round(weather.feels)}°) · ${rec.headline}`,
    "",
    ...rec.items.map((item) => `${item.label}: ${item.item}`),
  ];
  return lines.join("\n");
}

async function shareOutfit(rec, weather, place, onFallback) {
  const text = outfitShareText(rec, weather, place);
  if (navigator.share) {
    try {
      await navigator.share({ title: "오늘 뭐 입지?", text });
      return;
    } catch (e) {
      // 사용자가 공유를 취소한 경우 등은 무시
      return;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    onFallback?.("클립보드에 복사됐어요");
  } catch (e) {
    onFallback?.("공유를 지원하지 않는 브라우저예요");
  }
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

  // 자주 입은 아이템 Top 5 (쉼표로 구분된 텍스트를 단순 집계)
  const itemFreq = {};
  entries.forEach(([, r]) => {
    (r.items_worn || "")
      .split(/[,、·\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((item) => {
        itemFreq[item] = (itemFreq[item] || 0) + 1;
      });
  });
  const topItems = Object.entries(itemFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, n]) => ({ name, count: n }));

  // 월별 기록 수 / 체감 분포 (최근 6개월)
  const monthMap = {};
  entries.forEach(([date, r]) => {
    const ym = date.slice(0, 7);
    if (!monthMap[ym]) monthMap[ym] = { hot: 0, normal: 0, cold: 0, total: 0 };
    monthMap[ym][r.feeling] += 1;
    monthMap[ym].total += 1;
  });
  const monthly = Object.entries(monthMap)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(-6)
    .map(([ym, v]) => ({ ym, ...v }));

  return { count, ready: true, avgHot, avgNormal, avgCold, counts, coldThreshold, hotThreshold, tips: tips.slice(0, 3), topItems, monthly };
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

// 기록 + 프로필 + 즐겨찾기를 하나의 JSON 파일로 내보낸다.
function exportBackup(records, profile, favorites) {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: "ootd-weather-diary",
    version: 1,
    records,
    profile,
    favorites,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `오늘뭐입지-백업-${fmtDate(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 백업 JSON을 읽어서 파싱한다. 형식이 다르면 null을 반환한다.
function parseBackupFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data && typeof data === "object" && data.records) {
          resolve(data);
        } else {
          resolve(null);
        }
      } catch (e) {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}

// 현재 날씨와 시간에 맞는 회색 픽토그램을 표시한다.
function weatherSymbol(weatherCode, pop, hour) {
  const isSnow = [71, 73, 75, 77, 85, 86].includes(weatherCode);
  const isThunder = [95, 96, 99].includes(weatherCode);
  const isRain = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode);
  const isEvening = hour >= 20 || hour < 6;

  if (isSnow) return "❄";
  if (isThunder) return "ϟ";
  if (isRain || pop >= 45) return "☂";
  if (isEvening) return "☾";
  return "☀";
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

function AuthPage({ onComplete }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    if (mode === "signup" && password !== passwordConfirm) {
      window.alert("비밀번호가 일치하지 않습니다.");
      return;
    }
    sessionStorage.setItem("ootd-auth-ui-seen", "true");
    onComplete();
  }

  const inputStyle = {
    width: "100%",
    background: "none",
    border: `1px solid ${TOKENS.rule}`,
    color: TOKENS.fg,
    padding: "13px 14px",
    fontFamily: TOKENS.fontBody,
    fontSize: 14,
  };

  return (
    <div className="ootd-scope" style={{ minHeight: "100vh", background: TOKENS.bg, color: TOKENS.fg }}>
      <GlobalStyle />
      <main style={{ maxWidth: 430, margin: "0 auto", padding: "20vh 20px 48px", fontFamily: TOKENS.fontBody }}>
        <div style={{ marginBottom: 42 }}>
          <Eyebrow style={{ color: TOKENS.accent, marginBottom: 12 }}>OOTD DIARY</Eyebrow>
          <h1 style={{ fontFamily: TOKENS.fontDisplay, fontSize: 48, lineHeight: 0.95, margin: 0, letterSpacing: "-0.02em" }}>
            오늘 뭐 입지?
          </h1>
          <p style={{ color: TOKENS.fgMid, fontSize: 13.5, lineHeight: 1.7, margin: "18px 0 0" }}>
            날씨에 맞는 코디를 추천받고<br />
            매일의 착장을 기록해보세요.
          </p>
        </div>

        <div style={{ display: "flex", borderBottom: `1px solid ${TOKENS.rule}`, marginBottom: 28 }}>
          {[{ key: "login", label: "로그인" }, { key: "signup", label: "회원가입" }].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setMode(tab.key)}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                borderBottom: mode === tab.key ? `2px solid ${TOKENS.accent}` : "2px solid transparent",
                color: mode === tab.key ? TOKENS.accent : TOKENS.fgDim,
                padding: "12px 0",
                fontFamily: TOKENS.fontDisplay,
                fontSize: 14,
                fontWeight: mode === tab.key ? 700 : 500,
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", color: TOKENS.fgDim, fontFamily: TOKENS.fontDisplay, fontSize: 11, letterSpacing: "0.1em", marginBottom: 8 }}>
            EMAIL
          </label>
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="이메일을 입력해주세요" style={{ ...inputStyle, marginBottom: 18 }} />

          <label style={{ display: "block", color: TOKENS.fgDim, fontFamily: TOKENS.fontDisplay, fontSize: 11, letterSpacing: "0.1em", marginBottom: 8 }}>
            PASSWORD
          </label>
          <input type="password" required minLength={4} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="비밀번호를 입력해주세요" style={{ ...inputStyle, marginBottom: mode === "signup" ? 18 : 24 }} />

          {mode === "signup" && (
            <input type="password" required minLength={4} value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} placeholder="비밀번호를 한 번 더 입력해주세요" style={{ ...inputStyle, marginBottom: 24 }} />
          )}

          <button type="submit" style={{ width: "100%", border: "none", background: TOKENS.accent, color: TOKENS.bg, padding: "15px 0", fontFamily: TOKENS.fontDisplay, fontSize: 14, fontWeight: 700, letterSpacing: "0.06em", cursor: "pointer" }}>
            {mode === "login" ? "로그인" : "회원가입"}
          </button>
        </form>
      </main>
    </div>
  );
}

/* ============================================================
   메인 App
   ============================================================ */
export default function App() {
  const [authUiSeen, setAuthUiSeen] = useState(() => sessionStorage.getItem("ootd-auth-ui-seen") === "true");
  const [records, setRecords] = useState(() => loadRecords());
  const [profile, setProfile] = useState(() => loadProfile());
  const [favorites, setFavorites] = useState(() => loadFavorites());
  const [wardrobe, setWardrobe] = useState(() => loadWardrobe());
  const [unit, setUnit] = useState(() => loadUnit());
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [searchSheetOpen, setSearchSheetOpen] = useState(false);
  const {
    weather,
    fetchAll,
    requestLocation,
    hourRange,
    setHourRange,
    selectedHour,
    setSelectedHour,
    showTomorrow,
    setShowTomorrow,
  } = useWeather(SEOUL);
  const [monthCursor, setMonthCursor] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [sheetDate, setSheetDate] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [shareMsg, setShareMsg] = useState("");
  const [holidays, setHolidays] = useState({});
  const [holidayErrors, setHolidayErrors] = useState({});
  const [now, setNow] = useState(() => new Date());
  const importInputRef = useRef(null);
  const hourlyScrollRef = useRef(null);
  const hourlyDragRef = useRef({ active: false, startX: 0, scrollLeft: 0 });
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // 화면에 보이는 달의 연도 공휴일을 무료 공개 API(키 불필요)로 가져와 달력에 빨간날로 표시한다.
  useEffect(() => {
    const year = monthCursor.getFullYear();
    if (holidays[year]) return;
    fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/KR`)
      .then((r) => {
        if (!r.ok) throw new Error("공휴일 API 오류");
        return r.json();
      })
      .then((list) => {
        const map = {};
        (list || []).forEach((h) => {
          map[h.date] = h.localName || h.name;
        });
        setHolidays((prev) => ({ ...prev, [year]: map }));
      })
      .catch(() => {
        setHolidays((prev) => ({ ...prev, [year]: {} }));
        setHolidayErrors((prev) => ({ ...prev, [year]: true }));
      });
  }, [monthCursor, holidays]);

  function persist(next) {
    setRecords(next);
    saveRecords(next);
  }

  function toggleFavorite(place) {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.name === place.name && f.latitude === place.latitude && f.longitude === place.longitude);
      const next = exists
        ? prev.filter((f) => !(f.name === place.name && f.latitude === place.latitude && f.longitude === place.longitude))
        : [...prev, { name: place.name, latitude: place.latitude, longitude: place.longitude, admin1: place.admin1, country: place.country }];
      saveFavorites(next);
      return next;
    });
  }

  function addWardrobeItem(item) {
    setWardrobe((prev) => {
      const next = [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...item }];
      saveWardrobe(next);
      return next;
    });
  }
  function removeWardrobeItem(id) {
    setWardrobe((prev) => {
      const next = prev.filter((w) => w.id !== id);
      saveWardrobe(next);
      return next;
    });
  }
  function toggleUnit() {
    setUnit((prev) => {
      const next = prev === "C" ? "F" : "C";
      saveUnit(next);
      return next;
    });
  }

  function logout() {
    setLogoutOpen(true);
  }

  function confirmLogout() {
    sessionStorage.removeItem("ootd-auth-ui-seen");
    setLogoutOpen(false);
    setAuthUiSeen(false);
  }

  function handleImportFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    parseBackupFile(file).then((data) => {
      if (!data) {
        setImportMsg("파일을 읽을 수 없어요. 이 앱에서 내보낸 백업 파일인지 확인해주세요.");
        return;
      }
      const mergedRecords = { ...records, ...(data.records || {}) };
      persist(mergedRecords);
      if (data.profile) {
        setProfile(data.profile);
        saveProfile(data.profile);
      }
      if (Array.isArray(data.favorites)) {
        setFavorites(data.favorites);
        saveFavorites(data.favorites);
      }
      setImportMsg(`불러오기 완료 (기록 ${Object.keys(data.records || {}).length}일치 반영)`);
    });
  }

  function startHourlyDrag(event) {
    if (!hourlyScrollRef.current) return;
    if (event.button !== undefined && event.button !== 0) return;
    hourlyDragRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      scrollLeft: hourlyScrollRef.current.scrollLeft,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveHourlyDrag(event) {
    const drag = hourlyDragRef.current;
    if (!drag.active || !hourlyScrollRef.current) return;
    const dx = event.clientX - drag.startX;
    if (Math.abs(dx) > 6) drag.moved = true;
    hourlyScrollRef.current.scrollLeft = drag.scrollLeft - dx;
  }

  function endHourlyDrag(event) {
    const drag = hourlyDragRef.current;
    const wasTap = drag.active && !drag.moved;
    drag.active = false;
    event.currentTarget?.releasePointerCapture?.(event.pointerId);
    // 드래그가 아니라 짧은 탭이었으면, 놓은 지점에 있는 시간 버튼을 직접 선택해준다.
    // (포인터 캡처 때문에 브라우저 기본 클릭 이벤트가 씹힐 수 있어 직접 처리)
    if (wasTap && event.clientX != null && event.clientY != null) {
      const el = document.elementFromPoint(event.clientX, event.clientY);
      const target = el?.closest?.("[data-hour-index]");
      if (target) {
        const idx = Number(target.getAttribute("data-hour-index"));
        if (!Number.isNaN(idx)) setSelectedHour(idx);
      }
    }
  }

  const today = now;
  const weatherTimezone = weather.timezone || "Asia/Seoul";
  const todayStr = weather.status === "ok" ? dateInTimezone(today, weatherTimezone) : fmtDate(today);
  const todayLabel = new Intl.DateTimeFormat("ko-KR", { timeZone: weatherTimezone, month: "long", day: "numeric", weekday: "short" }).format(today);
  const localTime = weather.status === "ok"
    ? new Intl.DateTimeFormat("ko-KR", { timeZone: weatherTimezone, hour: "2-digit", minute: "2-digit", hour12: false }).format(today)
    : "--:--";
  const todayMonthDay = todayStr.slice(5);
  const isBirthdayToday = !!profile.birthday && profile.birthday.slice(5) === todayMonthDay;

  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const aqi = weather.status === "ok" ? aqiInfo(weather.pm10, weather.pm25) : null;
  const rec = weather.status === "ok" ? outfitFor(weather.temp, weather.feels, weather.pop, weather.humidity, weather.wind, profile, aqi, weather.weatherCode) : null;
  if (rec) rec.headline = seasonalHeadline(rec.band, todayStr);
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

  if (rec && weather.status === "ok" && weather.todayMin != null && weather.todayMax != null) {
    const spread = weather.todayMax - weather.todayMin;
    if (spread >= 8) {
      rec.tips.push(`오늘 일교차가 커요 (최저 ${Math.round(weather.todayMin)}° · 최고 ${Math.round(weather.todayMax)}°). 아침저녁엔 겉옷을 챙기고 낮엔 벗을 수 있게 준비하세요.`);
    }
  }

  let rainAlert = null;
  if (weather.status === "ok" && weather.hourly && weather.pop < 40) {
    const upcoming = weather.hourly.find((h, i) => i > 0 && i <= 16 && h.pop >= 50);
    if (upcoming) rainAlert = `${upcoming.hour}시쯤 비 소식`;
  }
  const recordedThisMonth = Object.keys(records).filter((k) => k.startsWith(`${year}-${pad(month + 1)}`)).length;

  if (!authUiSeen) {
    return <AuthPage onComplete={() => setAuthUiSeen(true)} />;
  }

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
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
                {weather.place?.toString().toUpperCase()}
              </span>
              <span className={weather.status === "loading" ? "ootd-spin" : ""} style={{ fontSize: 11, color: TOKENS.fgDim }}>
                {weather.status === "loading" ? "◌" : "↻"}
              </span>
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 13, color: TOKENS.fgDim }}
              aria-label="지역 검색"
            >
              ⌕
            </button>
            <button
              onClick={toggleUnit}
              style={{ background: "none", border: `1px solid ${TOKENS.rule}`, cursor: "pointer", padding: "2px 7px", fontFamily: TOKENS.fontDisplay, fontSize: 11, color: TOKENS.fgDim }}
              aria-label="온도 단위 전환"
            >
              °{unit}
            </button>
          </div>
          <span style={{ fontFamily: TOKENS.fontDisplay, fontSize: 13, letterSpacing: "0.08em", color: TOKENS.fgDim }}>
            {todayLabel}
          </span>
        </div>

        {isBirthdayToday && (
          <div style={{ padding: "10px 0 0", fontFamily: TOKENS.fontDisplay, fontSize: 12.5, letterSpacing: "0.04em", color: TOKENS.accent }}>
            🎂 오늘은 생일이에요! 축하해요.
          </div>
        )}

        <button
          onClick={() => setProfileOpen(true)}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "11px 0",
            background: "none",
            border: "none",
            borderBottom: `1px solid ${TOKENS.rule}`,
            color: profile.age || profile.gender || profile.health?.length ? TOKENS.fgMid : TOKENS.accent,
            fontFamily: TOKENS.fontDisplay,
            fontSize: 12,
            letterSpacing: "0.06em",
            cursor: "pointer",
          }}
        >
          <span>추천 기준 설정</span>
          <span>{profile.age || profile.gender || profile.health?.length ? "설정됨 · 수정" : "성별 · 나이 · 건강 상태"} ›</span>
        </button>

        <div style={{ display: "flex", gap: 8, borderBottom: `1px solid ${TOKENS.rule}`, padding: "10px 0" }}>
          <button
            onClick={() => setSearchSheetOpen(true)}
            style={{ flex: 1, background: "none", border: `1px solid ${TOKENS.rule}`, color: TOKENS.fgMid, padding: "8px 0", fontFamily: TOKENS.fontDisplay, fontSize: 11.5, cursor: "pointer" }}
          >
            목록
          </button>
          <button
            onClick={() => setProfileOpen(true)}
            style={{ flex: 1, background: "none", border: `1px solid ${TOKENS.rule}`, color: TOKENS.fgMid, padding: "8px 0", fontFamily: TOKENS.fontDisplay, fontSize: 11.5, cursor: "pointer" }}
          >
            마이페이지
          </button>
          <button
            onClick={logout}
            style={{ flex: 1, background: "none", border: `1px solid ${TOKENS.rule}`, color: TOKENS.fgDim, padding: "8px 0", fontFamily: TOKENS.fontDisplay, fontSize: 11.5, cursor: "pointer" }}
          >
            로그아웃
          </button>
        </div>

        {weather.status === "ok" && (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0 0", color: TOKENS.fgDim, fontFamily: TOKENS.fontDisplay, fontSize: 11.5, letterSpacing: "0.03em" }}>
            <span>현지 시각 {localTime}</span>
            <span>{weather.timezoneAbbreviation || weather.timezone}</span>
          </div>
        )}

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
               color: TOKENS.fg,
               position: "absolute",
               right: -6,
               top: 14,
               userSelect: "none",
               }}
            >
               {weatherSymbol(weather.weatherCode, weather.pop, Number(localTime.slice(0, 2)))}
            </div>
            {alerts.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  right: -6,
                  top: 132,
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                  gap: 6,
                  maxWidth: 140,
                }}
                aria-label={alerts.map((alert) => alert.label).join(", ")}
              >
                {alerts.map((alert) => (
                  <span
                    key={alert.label}
                    title={alert.label}
                    aria-label={alert.label}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      background: TOKENS.bgRaised,
                      border: `1px solid ${TOKENS.rule}`,
                      color: TOKENS.fgMid,
                      fontFamily: TOKENS.fontDisplay,
                      fontSize: 12,
                      letterSpacing: "0.02em",
                      lineHeight: 1,
                      padding: "5px 8px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {alert.symbol} {alert.label}
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
                {fmtTemp(weather.temp, unit)}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 14, flexWrap: "wrap", maxWidth: "calc(100% - 104px)" }}>
                <span style={{ fontFamily: TOKENS.fontDisplay, fontWeight: 700, fontSize: 24, letterSpacing: "0.05em", color: TOKENS.accent }}>
                  {rec.eng}
                </span>
                <span style={{ fontFamily: TOKENS.fontDisplay, fontSize: 13.5, color: TOKENS.fgDim, letterSpacing: "0.03em" }}>
                  {rec.desc}
                </span>
              </div>
              {weather.todayMin != null && weather.todayMax != null && (
                <div style={{ fontFamily: TOKENS.fontDisplay, fontSize: 13, color: TOKENS.fgMid, marginTop: 8, letterSpacing: "0.02em", maxWidth: "calc(100% - 104px)" }}>
                  최저 {fmtTemp(weather.todayMin, unit)} · 최고 {fmtTemp(weather.todayMax, unit)}
                </div>
              )}
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
                { label: "체감", val: fmtTemp(weather.feels, unit) },
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
                {showTomorrow && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <Eyebrow style={{ color: TOKENS.fgMid }}>내일 날씨</Eyebrow>
                    <button
                      onClick={() => {
                        setShowTomorrow(false);
                        setHourRange(8);
                        setSelectedHour(0);
                        hourlyScrollRef.current?.scrollTo({ left: 0 });
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: TOKENS.accent,
                        fontFamily: TOKENS.fontDisplay,
                        fontSize: 11,
                        letterSpacing: "0.04em",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      ‹ 오늘 날씨로
                    </button>
                  </div>
                )}
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
                        data-hour-index={i}
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
                        <span style={{ fontSize: 11, color: isSelected ? TOKENS.accent : TOKENS.fgMid }}>{fmtTemp(h.temp, unit)}</span>
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

            {rec.profileNotes.length > 0 && (
              <div
                style={{
                  fontFamily: TOKENS.fontDisplay,
                  fontSize: 11.5,
                  letterSpacing: "0.04em",
                  color: TOKENS.accent,
                  marginTop: -14,
                  marginBottom: 20,
                }}
              >
                ◆ 오늘 프로필 반영됨: {rec.profileNotes.join(" · ")}
              </div>
            )}

            <div>
              {rec.items.map((item, i) => {
                const bandWarmth = bandToWarmth(rec.band);
                const wardrobeMatches = wardrobe.filter((w) => w.category === item.cat && w.warmth === bandWarmth);
                return (
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
                      {wardrobeMatches.length > 0 && (
                        <div style={{ marginTop: 8, fontSize: 12, color: TOKENS.fgMid }}>
                          내 옷장 중: {wardrobeMatches.map((w) => w.name).join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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

            <button
              onClick={() => {
                setShareMsg("");
                shareOutfit(rec, weather, weather.place, setShareMsg);
              }}
              style={{
                marginTop: 20,
                background: "none",
                border: `1px solid ${TOKENS.rule}`,
                color: TOKENS.fgMid,
                padding: "10px 16px",
                fontFamily: TOKENS.fontDisplay,
                fontSize: 12,
                letterSpacing: "0.06em",
                cursor: "pointer",
              }}
            >
              오늘의 코디 공유하기
            </button>
            {shareMsg && (
              <div style={{ marginTop: 8, fontSize: 11.5, color: TOKENS.accent }}>{shareMsg}</div>
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

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            onClick={() => setWardrobeOpen(true)}
            style={{ flex: 1, background: "none", border: `1px solid ${TOKENS.rule}`, color: TOKENS.fgMid, padding: "11px 0", fontFamily: TOKENS.fontDisplay, fontSize: 12, letterSpacing: "0.04em", cursor: "pointer" }}
          >
            내 옷장 {wardrobe.length > 0 ? `(${wardrobe.length})` : ""}
          </button>
          <button
            onClick={() => setSearchSheetOpen(true)}
            style={{ flex: 1, background: "none", border: `1px solid ${TOKENS.rule}`, color: TOKENS.fgMid, padding: "11px 0", fontFamily: TOKENS.fontDisplay, fontSize: 12, letterSpacing: "0.04em", cursor: "pointer" }}
          >
            기록 검색
          </button>
        </div>

        {/* ===== 이번 달 기록 ===== */}
        <SectionToggle label="이번 달 기록" count={`${recordedThisMonth}일`} open={calendarOpen} onClick={() => setCalendarOpen((v) => !v)} />

        {calendarOpen && (
          <div style={{ padding: "4px 0 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <button
                onClick={() => setMonthCursor(new Date(year, month - 1, 1))}
                style={{ background: "none", border: "none", color: TOKENS.fg, fontFamily: TOKENS.fontDisplay, fontSize: 16, cursor: "pointer", padding: 4 }}
                aria-label="이전 달"
              >
                ‹
              </button>
              <span style={{ fontFamily: TOKENS.fontDisplay, fontSize: 13, letterSpacing: "0.06em", color: TOKENS.fgMid }}>
                {year}.{pad(month + 1)}
              </span>
              <button
                onClick={() => setMonthCursor(new Date(year, month + 1, 1))}
                style={{ background: "none", border: "none", color: TOKENS.fg, fontFamily: TOKENS.fontDisplay, fontSize: 16, cursor: "pointer", padding: 4 }}
                aria-label="다음 달"
              >
                ›
              </button>
            </div>

            {holidayErrors[year] && (
              <p style={{ margin: "0 0 12px", color: TOKENS.fgDim, fontSize: 11.5, lineHeight: 1.5 }}>
                {year}년 공휴일 정보를 불러오지 못했어요. 네트워크 연결을 확인해주세요.
              </p>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", fontSize: 10, marginBottom: 6, fontFamily: TOKENS.fontDisplay, letterSpacing: "0.06em" }}>
              {WEEK_LABELS.map((w, wi) => (
                <div key={w} style={{ color: wi === 0 ? TOKENS.sunday : wi === 6 ? TOKENS.saturday : TOKENS.fgDim }}>
                  {w}
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {cells.map((d, i) => {
                if (d === null) return <div key={i} />;
                const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
                const dayRec = records[dateStr];
                const isToday = dateStr === todayStr;
                const weekday = new Date(year, month, d).getDay();
                const dynamicMap = holidays[year];
                const holiday = isHoliday(dateStr, dynamicMap);
                const hName = holidayName(dateStr, dynamicMap);
                const isSunday = weekday === 0;
                const isSaturday = weekday === 6;
                const isBirthday = !!profile.birthday && profile.birthday.slice(5) === `${pad(month + 1)}-${pad(d)}`;

                let dateColor = TOKENS.fgMid;
                if (holiday || isSunday) dateColor = TOKENS.sunday;
                else if (isSaturday) dateColor = TOKENS.saturday;
                if (isToday) dateColor = TOKENS.fg;

                return (
                  <button
                    key={i}
                    className="ootd-day-cell"
                    onClick={() => setSheetDate(dateStr)}
                    title={hName || undefined}
                    style={{
                      position: "relative",
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
                    {isBirthday && (
                      <span style={{ position: "absolute", top: 2, right: 2, fontSize: 9 }} aria-label="생일" title="생일">🎂</span>
                    )}
                    <span style={{ fontFamily: TOKENS.fontDisplay, fontSize: 10.5, fontWeight: isToday || holiday || isSunday ? 700 : 500, color: dateColor }}>
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
                <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: analysis.topItems?.length ? 20 : 0 }}>
                  {analysis.tips.map((tip, i) => (
                    <p key={i} style={{ fontSize: 12.5, color: TOKENS.fgMid, lineHeight: 1.6, margin: 0 }}>
                      · {tip}
                    </p>
                  ))}
                </div>

                {analysis.topItems?.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <Eyebrow style={{ marginBottom: 8 }}>자주 입은 아이템</Eyebrow>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {analysis.topItems.map((it) => (
                        <div key={it.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                          <span>{it.name}</span>
                          <span style={{ fontFamily: TOKENS.fontDisplay, color: TOKENS.fgDim }}>{it.count}회</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.monthly?.length > 0 && (
                  <div>
                    <Eyebrow style={{ marginBottom: 8 }}>월별 체감 분포</Eyebrow>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {analysis.monthly.map((m) => (
                        <div key={m.ym}>
                          <div style={{ fontFamily: TOKENS.fontDisplay, fontSize: 11, color: TOKENS.fgDim, marginBottom: 3 }}>
                            {m.ym.slice(2).replace("-", ".")} · {m.total}일
                          </div>
                          <div style={{ display: "flex", height: 8, width: "100%", overflow: "hidden" }}>
                            {m.hot > 0 && <div style={{ flex: m.hot, background: TOKENS.sunday }} />}
                            {m.normal > 0 && <div style={{ flex: m.normal, background: TOKENS.accent }} />}
                            {m.cold > 0 && <div style={{ flex: m.cold, background: TOKENS.saturday }} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <SectionToggle label="데이터 백업" open={backupOpen} onClick={() => setBackupOpen((v) => !v)} />
        {backupOpen && (
          <div style={{ padding: "18px 0" }}>
            <p style={{ fontSize: 12.5, color: TOKENS.fgDim, lineHeight: 1.6, marginTop: 0, marginBottom: 16 }}>
              기록은 이 브라우저 안에만 저장돼요. 기기를 바꾸거나 브라우저 데이터를 지우면 사라지니, 가끔 백업해두는 걸 추천해요.
            </p>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button
                onClick={() => exportBackup(records, profile, favorites)}
                style={{
                  flex: 1,
                  background: "none",
                  border: `1px solid ${TOKENS.rule}`,
                  color: TOKENS.fg,
                  padding: "11px 0",
                  fontFamily: TOKENS.fontDisplay,
                  fontSize: 12.5,
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                }}
              >
                내보내기
              </button>
              <button
                onClick={() => importInputRef.current?.click()}
                style={{
                  flex: 1,
                  background: "none",
                  border: `1px solid ${TOKENS.rule}`,
                  color: TOKENS.fg,
                  padding: "11px 0",
                  fontFamily: TOKENS.fontDisplay,
                  fontSize: 12.5,
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                }}
              >
                가져오기
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                onChange={handleImportFile}
                style={{ display: "none" }}
              />
            </div>
            {importMsg && <p style={{ fontSize: 12, color: TOKENS.accent, margin: 0 }}>{importMsg}</p>}
          </div>
        )}
      </div>

      {sheetDate && (
        <RecordSheetComponent
          dateStr={sheetDate}
          isToday={sheetDate === todayStr}
          weather={sheetDate === todayStr ? weather : null}
          existing={records[sheetDate]}
          unit={unit}
          onClose={() => setSheetDate(null)}
          onSave={(entry) => {
            const next = { ...records, [sheetDate]: entry };
            persist(next);
            setSheetDate(null);
          }}
        />
      )}
      {profileOpen && (
        <ProfileSheetComponent
          existing={profile}
          onClose={() => setProfileOpen(false)}
          onSave={(next) => {
            setProfile(next);
            saveProfile(next);
            setProfileOpen(false);
          }}
        />
      )}
      {searchOpen && (
        <LocationSearchSheetComponent
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onClose={() => setSearchOpen(false)}
          onSelect={(place) => {
            fetchAll(place.latitude, place.longitude, (place.name || "").toUpperCase(), false);
            setSearchOpen(false);
          }}
        />
      )}
      {wardrobeOpen && (
        <WardrobeSheetComponent
          wardrobe={wardrobe}
          onAdd={addWardrobeItem}
          onRemove={removeWardrobeItem}
          onClose={() => setWardrobeOpen(false)}
        />
      )}
      {searchSheetOpen && (
        <RecordSearchSheetComponent
          records={records}
          onClose={() => setSearchSheetOpen(false)}
          onSelect={(dateStr) => {
            setSearchSheetOpen(false);
            setSheetDate(dateStr);
          }}
        />
      )}
      {logoutOpen && (
        <div
          className="ootd-scope"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 100 }}
          onClick={() => setLogoutOpen(false)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            style={{ width: "100%", maxWidth: 360, background: TOKENS.bgRaised, border: `1px solid ${TOKENS.rule}`, padding: "26px 22px 22px", fontFamily: TOKENS.fontBody, color: TOKENS.fg }}
          >
            <Eyebrow style={{ color: TOKENS.accent, marginBottom: 10 }}>SIGN OUT</Eyebrow>
            <h2 id="logout-title" style={{ fontFamily: TOKENS.fontDisplay, fontSize: 25, margin: 0, lineHeight: 1.1 }}>정말 로그아웃할까요?</h2>
            <p style={{ color: TOKENS.fgDim, fontSize: 13, lineHeight: 1.6, margin: "12px 0 22px" }}>현재 세션에서 로그아웃합니다. 기록과 프로필 데이터는 이 브라우저에 남아 있어요.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setLogoutOpen(false)} style={{ flex: 1, background: "none", border: `1px solid ${TOKENS.rule}`, color: TOKENS.fgMid, padding: "12px 0", fontFamily: TOKENS.fontDisplay, fontSize: 13, cursor: "pointer" }}>취소</button>
              <button onClick={confirmLogout} style={{ flex: 1, background: TOKENS.accent, border: `1px solid ${TOKENS.accent}`, color: TOKENS.bg, padding: "12px 0", fontFamily: TOKENS.fontDisplay, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>로그아웃</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

