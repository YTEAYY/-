import { seasonFor } from "./date";
import { TOKENS } from "../constants";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "./wardrobe";

export const SNOW_WEATHER_CODES = new Set([71, 73, 75, 77, 85, 86]);
export const RAIN_WEATHER_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
export const MIN_RECORDS_FOR_ANALYSIS = 1;

const THUNDER_WEATHER_CODES = new Set([95, 96, 99]);

const BAND_META = {
  boiling: { eng: "SCORCHING", headline: "찜통 더위, 최대한 가볍게", desc: "가볍게 입어야 하는 무더운 하루" },
  hot: { eng: "WARM", headline: "여름 옷차림이면 충분해요", desc: "화창하고 더운 하루" },
  warm: { eng: "MILD", headline: "활동하기 좋은 선선한 날씨", desc: "가볍게 걸치기 좋은 하루" },
  mild: { eng: "BRISK", headline: "쌀쌀하니 한 겹 더 챙기세요", desc: "겉옷 하나면 딱 좋은 하루" },
  cool: { eng: "COLD", headline: "쌀쌀해요, 아우터는 필수", desc: "아우터 없이는 쌀쌀한 하루" },
  cold: { eng: "FREEZING", headline: "춥습니다, 든든하게 챙기세요", desc: "든든히 챙겨입어야 하는 추운 하루" },
};

const SEASON_META = {
  spring: { message: "봄 옷차림이면 충분해요" },
  summer: { message: "여름 옷차림이면 충분해요" },
  autumn: { message: "가벼운 가을 옷차림을 준비해요" },
  winter: { message: "따뜻한 겨울 옷차림을 챙겨요" },
};

const OUTFIT_BASE = {
  boiling: { top: "린넨/메시 반팔티", bottom: "린넨 반바지 또는 얇은 슬랙스", outer: "겉옷 없이", shoes: "통풍 잘 되는 스니커즈 또는 샌들", acc: "선글라스, 미니 크로스백" },
  hot: { top: "반팔 티셔츠", bottom: "면 반바지 또는 얇은 데님", outer: "겉옷 없이 (실내 냉방 대비용 얇은 셔츠 하나)", shoes: "캔버스 스니커즈", acc: "캡모자" },
  warm: { top: "얇은 셔츠 또는 반팔 맨투맨", bottom: "치노팬츠 또는 데님", outer: "가벼운 가디건", shoes: "스니커즈", acc: "선택 사항" },
  mild: { top: "긴팔 티 또는 맨투맨", bottom: "청바지", outer: "후드집업 또는 가벼운 자켓", shoes: "스니커즈 또는 로퍼", acc: "선택 사항" },
  cool: { top: "니트 또는 기모 맨투맨", bottom: "기모 청바지", outer: "코트 또는 무스탕", shoes: "부츠 또는 두꺼운 스니커즈", acc: "얇은 목도리" },
  cold: { top: "히트텍 + 니트", bottom: "기모 팬츠", outer: "롱패딩 또는 두꺼운 코트", shoes: "부츠", acc: "목도리, 장갑, 비니" },
};

const MEMO_KEYWORDS = [
  { word: "에어컨", tip: "실내 에어컨 때문에 춥다고 적으신 적이 있어요. 얇은 가디건을 상시 챙겨보면 좋아요." },
  { word: "히터", tip: "히터 때문에 덥다고 적으신 적이 있어요. 실내에서 바로 벗을 수 있는 레이어드가 편해요." },
  { word: "바람", tip: "바람 때문에 불편했다는 기록이 있어요. 바람막이를 챙기는 습관을 들이면 좋아요." },
  { word: "땀", tip: "땀 관련 기록이 있어요. 통풍 잘 되는 소재를 우선 고려해보세요." },
];

export function bandToWarmth(band) {
  if (band === "boiling" || band === "hot") return "hot";
  if (band === "cool" || band === "cold") return "cold";
  return "mild";
}

export function wardrobeOutfitFor(wardrobe, band, rotation = 0, weatherCode = null) {
  const wantedWarmth = bandToWarmth(band);
  const warmthOptions = {
    hot: ["hot", "mild"],
    mild: ["mild", "cold", "hot"],
    cold: ["cold", "mild"],
  }[wantedWarmth] || [wantedWarmth];
  const unsafeShoes = SNOW_WEATHER_CODES.has(weatherCode) || THUNDER_WEATHER_CODES.has(weatherCode);

  let combinationOffset = 1;
  const entries = CATEGORY_ORDER
    .filter((category) => !(category === "shoes" && unsafeShoes))
    .map((category) => {
      const choices = wardrobe.filter((item) => item.category === category && warmthOptions.includes(item.warmth));
      if (!choices.length) return null;
      const choiceIndex = Math.floor(rotation / combinationOffset) % choices.length;
      combinationOffset *= choices.length;
      return { category, item: choices[choiceIndex], choiceCount: choices.length };
    })
    .filter(Boolean);
  const combinationCount = entries.reduce((total, entry) => total * entry.choiceCount, 1);
  return { entries, combinationCount, unsafeShoes };
}

function wardrobeMatchFor(category, wantedWarmth, wardrobe) {
  const fallbackWarmth = {
    hot: ["hot", "mild"],
    mild: ["mild", "cold", "hot"],
    cold: ["cold", "mild"],
  }[wantedWarmth] || [wantedWarmth];

  for (const warmth of fallbackWarmth) {
    const match = wardrobe
      .filter((item) => item.category === category && item.warmth === warmth)
      .sort((a, b) => a.name.localeCompare(b.name, "ko", { sensitivity: "base" }))[0];
    if (match) return match.name;
  }
  return null;
}

export function seasonalHeadline(band, date = new Date()) {
  if (band === "hot" || band === "boiling") return SEASON_META[seasonFor(date)].message;
  return BAND_META[band].headline;
}

export function outfitFor({ feels, pop, humidity, wind, profile = {}, aqi = null, weatherCode = null, wardrobe = [] }) {
  let band;
  if (feels >= 29) band = "boiling";
  else if (feels >= 24) band = "hot";
  else if (feels >= 18) band = "warm";
  else if (feels >= 12) band = "mild";
  else if (feels >= 5) band = "cool";
  else band = "cold";

  const outfit = { ...OUTFIT_BASE[band] };
  if (Array.isArray(wardrobe)) {
    CATEGORY_ORDER.forEach((category) => {
      const selectedItem = wardrobeMatchFor(category, bandToWarmth(band), wardrobe);
      if (selectedItem) outfit[category] = selectedItem;
    });
  }

  const tips = [];
  const flags = {};
  const profileNotes = [];

  if (THUNDER_WEATHER_CODES.has(weatherCode)) {
    outfit.shoes = "방수 스니커즈 또는 워커 (가죽 신발 비추천)";
    outfit.acc = "우비 (금속 우산은 피하세요)";
    flags.shoes = "MUST";
    flags.acc = "MUST";
    tips.push("천둥번개가 예상돼요. 금속 우산보다 우비가 안전하고, 가능하면 야외 활동은 피하세요.");
  } else if (SNOW_WEATHER_CODES.has(weatherCode)) {
    outfit.shoes = "미끄럼 방지 방한 부츠";
    outfit.acc = "방한 장갑";
    flags.shoes = "MUST";
    flags.acc = "MUST";
    tips.push("눈이 와요. 미끄럼 방지 신발을 신고 빙판길에서는 천천히 걸어주세요.");
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
  const health = Array.isArray(profile.health) ? profile.health : [];
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

  const badAir = aqi && (aqi.label === "나쁨" || aqi.label === "매우나쁨");
  if (health.includes("respiratory") && (band === "cool" || band === "cold" || wind >= 8)) {
    outfit.acc = "마스크 또는 목을 덮는 스카프";
    flags.acc = "MUST";
    tips.push("호흡기가 예민하다면 차갑고 강한 바람을 직접 맞지 않도록 목과 코를 가려주세요.");
    profileNotes.push("호흡기 민감");
  }
  if (health.includes("respiratory") && badAir) {
    outfit.acc = `마스크 (미세먼지 ${aqi.label})`;
    flags.acc = "MUST";
    tips.push(`오늘 미세먼지가 ${aqi.label} 수준이에요. 호흡기가 예민하다면 마스크를 꼭 착용하세요.`);
    if (!profileNotes.includes("호흡기 민감")) profileNotes.push("호흡기 민감");
  }
  if (health.includes("cardiovascular") && (band === "boiling" || band === "hot" || band === "cold")) {
    tips.push("기온 변화에 주의가 필요한 상태라 무리한 야외 활동을 피하고 체온을 천천히 조절하세요.");
    profileNotes.push("심혈관 주의");
  }
  if (health.includes("skin")) {
    if (band === "boiling" || band === "hot") outfit.acc = "자외선 차단제, 통풍 좋은 모자";
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

  const items = CATEGORY_ORDER
    .filter((category) => outfit[category] && outfit[category] !== "겉옷 없이")
    .map((category) => ({
      cat: category,
      label: CATEGORY_LABEL[category],
      item: outfit[category],
      flag: flags[category],
    }));

  return { band, ...BAND_META[band], outfit, items, tips, profileNotes: [...new Set(profileNotes)] };
}

export function aqiInfo(pm10, pm25) {
  const grade = (value, breaks) => {
    if (value == null || Number.isNaN(value)) return null;
    if (value <= breaks[0]) return 0;
    if (value <= breaks[1]) return 1;
    if (value <= breaks[2]) return 2;
    return 3;
  };
  const grades = [grade(pm10, [30, 80, 150]), grade(pm25, [15, 35, 75])].filter((value) => value !== null);
  if (!grades.length) return null;
  const gradeIndex = Math.max(...grades);
  const labels = ["좋음", "보통", "나쁨", "매우나쁨"];
  const colors = [TOKENS.accent, TOKENS.fgMid, "#e2984c", "#e0524c"];
  return { label: labels[gradeIndex], color: colors[gradeIndex] };
}

export function weatherSymbol(weatherCode, pop, hour) {
  const isRain = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode);
  const isEvening = hour >= 19 || hour < 6;
  if (SNOW_WEATHER_CODES.has(weatherCode)) return "❄";
  if (THUNDER_WEATHER_CODES.has(weatherCode)) return "ϟ";
  if (isRain || pop >= 45) return "☂";
  if (isEvening) return "☾";
  return "☀";
}

export function weatherAlerts(weatherCode, temp, feels, humidity, wind, pop) {
  const alerts = [];
  const isHeavyRain = [65, 82].includes(weatherCode);
  const isStorm = THUNDER_WEATHER_CODES.has(weatherCode);

  if (isStorm || wind >= 17.2) alerts.push({ symbol: "⚠", label: "강풍 주의" });
  if (isHeavyRain) alerts.push({ symbol: "╱╱", label: "폭우 주의" });
  if (isStorm) alerts.push({ symbol: "ϟ", label: "폭풍우 주의" });
  if (SNOW_WEATHER_CODES.has(weatherCode)) alerts.push({ symbol: "❄", label: "눈길 미끄럼 주의" });
  if (temp <= -10 || feels <= -15) alerts.push({ symbol: "❄", label: "한파 주의" });
  if (temp >= 33 || feels >= 35) alerts.push({ symbol: "☀", label: "폭염 주의" });
  if (humidity <= 30 && pop < 20) alerts.push({ symbol: "◌", label: "건조 주의" });
  return alerts;
}

export function outingChecklistFor({ weatherCode, temp, feels, pop, wind, aqi, minTemp, maxTemp }) {
  const items = [];
  const temperatureRange = minTemp != null && maxTemp != null ? maxTemp - minTemp : 0;

  items.push({ id: "outfit", symbol: "◌", label: "날씨에 맞는 옷차림 확인", detail: `현재 체감 ${Math.round(feels)}°` });
  if (pop >= 40 || RAIN_WEATHER_CODES.has(weatherCode)) {
    items.push({ id: "umbrella", symbol: "☂", label: "우산 챙기기", detail: `강수 확률 ${pop}%` });
  }
  if (SNOW_WEATHER_CODES.has(weatherCode)) {
    items.push({ id: "snow-shoes", symbol: "❄", label: "미끄럼 방지 신발", detail: "눈길·빙판길에 안전한 신발을 준비하세요." });
  }
  if (feels <= 15 || temperatureRange >= 8) {
    items.push({
      id: "outerwear",
      symbol: "＋",
      label: "가벼운 겉옷",
      detail: temperatureRange >= 8 ? `일교차 ${Math.round(temperatureRange)}° · 벗고 입기 쉬운 겉옷을 챙기세요.` : "쌀쌀한 체감에 대비하세요.",
    });
  }
  if (temp <= 3 || feels <= 0) {
    items.push({ id: "warm-accessories", symbol: "❄", label: "목도리·장갑", detail: "추위에 노출되는 부위를 따뜻하게 보호하세요." });
  }
  if (aqi && (aqi.label === "나쁨" || aqi.label === "매우나쁨")) {
    items.push({ id: "mask", symbol: "▤", label: "마스크 챙기기", detail: `미세먼지 ${aqi.label} · 외출 시 호흡기를 보호하세요.` });
  }
  if (wind >= 10) {
    items.push({ id: "wind", symbol: "↗", label: "바람에 날리는 물건 확인", detail: "강한 바람에 대비해 모자와 우산을 단단히 챙기세요." });
  }
  if (temp >= 28) {
    items.push({ id: "heat", symbol: "☀", label: "물·햇빛 가리개", detail: "더위와 햇빛에 대비해 물을 마시고 그늘을 이용하세요." });
  }
  return items;
}
