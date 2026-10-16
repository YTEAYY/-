export const MIN_RECORDS_FOR_ANALYSIS = 1;

const VALID_FEELINGS = new Set(["hot", "normal", "cold"]);
const MEMO_KEYWORDS = [
  { word: "에어컨", tip: "실내 에어컨 때문에 춥다고 적으신 적이 있어요. 얇은 가디건을 상시 챙겨보면 좋아요." },
  { word: "히터", tip: "히터 때문에 덥다고 적으신 적이 있어요. 실내에서 바로 벗을 수 있는 레이어드가 편해요." },
  { word: "바람", tip: "바람 때문에 불편했다는 기록이 있어요. 바람막이를 챙기는 습관을 들이면 좋아요." },
  { word: "땀", tip: "땀 관련 기록이 있어요. 통풍 잘 되는 소재를 우선 고려해보세요." },
];

export function analyzeRecords(records = {}) {
  const entries = Object.entries(records).filter(([, record]) => (
    record && typeof record === "object" && VALID_FEELINGS.has(record.feeling)
  ));
  const count = entries.length;
  if (count < MIN_RECORDS_FOR_ANALYSIS) return { count, ready: false };

  const byFeeling = { hot: [], normal: [], cold: [] };
  const counts = { hot: 0, normal: 0, cold: 0 };
  entries.forEach(([, record]) => {
    counts[record.feeling] += 1;
    if (typeof record.temperature === "number" && Number.isFinite(record.temperature)) {
      byFeeling[record.feeling].push(record.temperature);
    }
  });

  const average = (values) => (
    values.length ? values.reduce((total, value) => total + value, 0) / values.length : null
  );
  const avgHot = average(byFeeling.hot);
  const avgNormal = average(byFeeling.normal);
  const avgCold = average(byFeeling.cold);
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

  const memoText = entries.map(([, record]) => record.user_memo || "").join(" ");
  MEMO_KEYWORDS.forEach(({ word, tip }) => {
    if (memoText.split(word).length - 1 >= 2) tips.push(tip);
  });
  if (!tips.length) tips.push("아직 뚜렷한 패턴은 안 보여요. 기록이 더 쌓이면 분석이 정확해져요.");

  const itemFrequency = new Map();
  entries.forEach(([, record]) => {
    (typeof record.items_worn === "string" ? record.items_worn : "")
      .split(/[,、·\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => itemFrequency.set(item, (itemFrequency.get(item) || 0) + 1));
  });
  const topItems = [...itemFrequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, itemCount]) => ({ name, count: itemCount }));

  const monthMap = new Map();
  entries.forEach(([date, record]) => {
    const yearMonth = date.slice(0, 7);
    const month = monthMap.get(yearMonth) || { hot: 0, normal: 0, cold: 0, total: 0 };
    month[record.feeling] += 1;
    month.total += 1;
    monthMap.set(yearMonth, month);
  });
  const monthly = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([ym, month]) => ({ ym, ...month }));

  return {
    count,
    ready: true,
    avgHot,
    avgNormal,
    avgCold,
    counts,
    coldThreshold,
    hotThreshold,
    tips: tips.slice(0, 3),
    topItems,
    monthly,
  };
}
