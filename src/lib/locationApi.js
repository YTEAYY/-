export async function searchCity(query) {
  if (!query || query.trim().length < 1) return [];
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=8&language=ko&format=json`
  );
  if (!response.ok) throw new Error(`지역 검색 요청 실패 (${response.status})`);
  const data = await response.json();
  return Array.isArray(data.results) ? data.results : [];
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
