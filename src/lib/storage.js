const STORAGE_KEY = "ootd-records-v1";
const PROFILE_KEY = "ootd-profile-v1";
const FAVORITES_KEY = "ootd-favorites-v1";
const WARDROBE_KEY = "ootd-wardrobe-v1";
const UNIT_KEY = "ootd-unit-v1";

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJson(key, value, label) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`${label} 저장 실패`, error);
  }
}

export const loadRecords = () => readJson(STORAGE_KEY, {});
export const saveRecords = (records) => writeJson(STORAGE_KEY, records, "기록");

export const loadProfile = () => readJson(PROFILE_KEY, { gender: "", age: "", health: [], healthOther: "", birthday: "" });
export const saveProfile = (profile) => writeJson(PROFILE_KEY, profile, "프로필");

export const loadFavorites = () => readJson(FAVORITES_KEY, []);
export const saveFavorites = (favorites) => writeJson(FAVORITES_KEY, favorites, "즐겨찾기");

export const loadWardrobe = () => readJson(WARDROBE_KEY, []);
export const saveWardrobe = (wardrobe) => writeJson(WARDROBE_KEY, wardrobe, "옷장");

export function loadUnit() {
  try {
    return localStorage.getItem(UNIT_KEY) === "F" ? "F" : "C";
  } catch (error) {
    return "C";
  }
}

export function saveUnit(unit) {
  try {
    localStorage.setItem(UNIT_KEY, unit);
  } catch (error) {
    console.error("온도 단위 저장 실패", error);
  }
}
