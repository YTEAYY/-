export async function searchCity(query) {
  if (!query || query.trim().length < 1) return [];
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=8&language=ko&format=json`
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    return [];
  }
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
