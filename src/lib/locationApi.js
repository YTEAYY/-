export async function searchCity(query) {
  if (!query || query.trim().length < 1) return [];
  const searchTerm = query.trim();
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchTerm)}&count=8&language=ko&format=json`
  );
  if (!response.ok) throw new Error(`지역 검색 요청 실패 (${response.status})`);
  const data = await response.json();
  if (Array.isArray(data.results) && data.results.length > 0) return data.results;

  if (!/[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/.test(searchTerm)) return [];

  const fallbackUrl = new URL("https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates");
  fallbackUrl.search = new URLSearchParams({
    SingleLine: searchTerm,
    category: "Populated Place",
    outFields: "Country,Region,Subregion,City,PlaceName",
    maxLocations: "8",
    f: "json",
  });
  const fallbackResponse = await fetch(fallbackUrl);
  if (!fallbackResponse.ok) throw new Error(`보조 지역 검색 요청 실패 (${fallbackResponse.status})`);
  const fallbackData = await fallbackResponse.json();
  if (fallbackData.error) throw new Error(fallbackData.error.message || "보조 지역 검색에 실패했어요.");

  const places = new Map();
  for (const candidate of fallbackData.candidates || []) {
    const latitude = candidate.location?.y;
    const longitude = candidate.location?.x;
    const name = candidate.attributes?.PlaceName;
    if (typeof name !== "string" || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    const admin1 = candidate.attributes?.Region || "";
    const key = `${name}:${admin1}`;
    if (places.has(key)) continue;
    places.set(key, {
      name,
      latitude,
      longitude,
      admin1,
      country: candidate.attributes?.Country === "KOR" ? "대한민국" : "",
    });
  }
  return [...places.values()];
}

export async function reverseGeocode(latitude, longitude) {
  try {
    const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=ko`);
    if (!response.ok) return "현재 위치";
    const data = await response.json();
    return (data.city || data.locality || data.principalSubdivision || "현재 위치").toUpperCase();
  } catch (error) {
    return "현재 위치";
  }
}
