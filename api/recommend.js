// Vercel 서버리스 함수 — 브라우저가 아니라 이 서버에서만 Gemini API 키를 사용한다.
// 배포 시 Vercel 프로젝트 설정 > Environment Variables 에 GEMINI_API_KEY를 등록해야 동작한다.

const CATEGORY_LABEL = { top: "상의", bottom: "하의", outer: "아우터", shoes: "신발", acc: "액세서리" };
const ALLOWED_CATS = ["top", "bottom", "outer", "shoes", "acc"];

function buildPrompt({ temp, feels, pop, humidity, wind, weatherCode, aqiLabel, band, profile, wardrobe }) {
  const profileText = [];
  if (profile?.age) profileText.push(`나이 ${profile.age}세`);
  if (profile?.gender) profileText.push(`성별 ${profile.gender}`);
  if (profile?.health?.length) {
    profileText.push(`건강 참고사항: ${profile.health.join(", ")}${profile.healthOther ? ` (${profile.healthOther})` : ""}`);
  }

  const wardrobeText =
    Array.isArray(wardrobe) && wardrobe.length > 0
      ? wardrobe.map((w) => `${CATEGORY_LABEL[w.category] || w.category}-${w.name}(${w.warmth})`).join(", ")
      : "없음";

  return `당신은 한국의 날씨 기반 옷차림 코디네이터입니다.
아래 오늘의 날씨와 사용자 정보를 분석해서, 실제로 입기 좋은 구체적인 옷차림을 추천해주세요.

[오늘 날씨]
- 기온: ${temp}°C, 체감온도: ${feels}°C
- 강수확률: ${pop}%, 습도: ${humidity}%, 풍속: ${wind}m/s
- 날씨 상태 코드(WMO): ${weatherCode}
- 미세먼지: ${aqiLabel || "정보 없음"}
- 기온 구간: ${band}

[사용자 정보]
${profileText.length > 0 ? profileText.join(" / ") : "특이사항 없음"}

[사용자가 가진 옷 목록]
${wardrobeText}

반드시 아래 JSON 형식으로만 응답하세요. 다른 설명, 마크다운, 코드블록 없이 순수 JSON만 출력하세요.
{
  "items": [
    {"cat": "top", "item": "구체적인 상의 설명"},
    {"cat": "bottom", "item": "구체적인 하의 설명"},
    {"cat": "outer", "item": "구체적인 아우터 설명 또는 null"},
    {"cat": "shoes", "item": "구체적인 신발 설명"},
    {"cat": "acc", "item": "구체적인 액세서리 설명 또는 null"}
  ],
  "tips": ["실용적인 팁 1", "실용적인 팁 2"]
}

규칙:
- 사용자가 가진 옷 목록 중 오늘 날씨에 어울리는 게 있으면 그 이름을 그대로 item에 사용하세요.
- 강수확률이 50 이상이거나 날씨가 천둥번개면 반드시 방수 신발과 우산/우비를 언급하세요.
- tips는 2~4개, 각 20~60자 내외의 실용적인 한국어 문장으로 작성하세요.
- 해당 카테고리가 필요 없으면 item 값을 null로 하세요.`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY가 서버에 설정되지 않았어요." });
    return;
  }

  const body = req.body || {};
  const prompt = buildPrompt(body);

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const detail = await geminiRes.text();
      res.status(502).json({ error: "AI 호출 실패", detail });
      return;
    }

    const data = await geminiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      res.status(502).json({ error: "AI 응답이 비어있어요." });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      res.status(502).json({ error: "AI 응답을 해석하지 못했어요." });
      return;
    }

    // 방어적 검증: AI가 이상한 값을 주더라도 앱이 깨지지 않도록 걸러낸다
    const items = Array.isArray(parsed.items)
      ? parsed.items
          .filter((it) => it && ALLOWED_CATS.includes(it.cat) && it.item)
          .map((it) => ({
            cat: it.cat,
            label: CATEGORY_LABEL[it.cat],
            item: String(it.item).slice(0, 60),
            flag: it.flag === "MUST" ? "MUST" : undefined,
          }))
      : [];
    const tips = Array.isArray(parsed.tips)
      ? parsed.tips.filter((t) => typeof t === "string").slice(0, 4).map((t) => t.slice(0, 120))
      : [];

    if (items.length === 0) {
      res.status(502).json({ error: "AI가 유효한 옷차림을 반환하지 않았어요." });
      return;
    }

    res.status(200).json({ items, tips });
  } catch (error) {
    res.status(500).json({ error: "서버 오류", detail: String(error) });
  }
}
